/**
 * eyeCalibration.ts - Rigid-Canthus Iris Feature Extraction, 9-Point Affine Ridge Regression & One Euro Filter
 */

import type { CalibrationModel, CalibrationSample, EyeFeatures, EyeSettings } from '../types/eyeControl';

export const EYE_CALIBRATION_STORAGE_KEY = 'sanjeevani_eye_calibration_v2';
export const EYE_SETTINGS_STORAGE_KEY = 'sanjeevani_eye_settings_v2';

/** 9-point screen grid coordinates in normalized [0..1] viewport space */
export const CALIBRATION_TARGETS: ReadonlyArray<{ id: string; x: number; y: number; label: string }> = [
  { id: 'tl', x: 0.12, y: 0.14, label: 'Top Left' },
  { id: 'tc', x: 0.50, y: 0.14, label: 'Top Center' },
  { id: 'tr', x: 0.88, y: 0.14, label: 'Top Right' },
  { id: 'ml', x: 0.12, y: 0.50, label: 'Middle Left' },
  { id: 'mc', x: 0.50, y: 0.50, label: 'Center' },
  { id: 'mr', x: 0.88, y: 0.50, label: 'Middle Right' },
  { id: 'bl', x: 0.12, y: 0.84, label: 'Bottom Left' },
  { id: 'bc', x: 0.50, y: 0.84, label: 'Bottom Center' },
  { id: 'br', x: 0.88, y: 0.84, label: 'Bottom Right' },
];

export interface NormalizedLandmark {
  x: number;
  y: number;
  z?: number;
}

/**
 * Extracts normalized iris offsets anchored to rigid eye corner landmarks + head pose proxies.
 * Anchoring Y to fixed canthi (outer/inner corners) instead of upper eyelids prevents eyelid closure from compressing Y!
 */
export function extractEyeFeatures(
  landmarks: NormalizedLandmark[],
  blendshapeMap: Map<string, number>
): EyeFeatures | null {
  if (!landmarks || landmarks.length < 474) {
    return null;
  }

  const leftIris = landmarks[468];
  const rightIris = landmarks[473];

  // Fixed orbital corner bone landmarks (barely deform during vertical eye movement)
  const lOuter = landmarks[33];
  const lInner = landmarks[133];
  const rInner = landmarks[362];
  const rOuter = landmarks[263];

  if (!leftIris || !rightIris || !lOuter || !lInner || !rInner || !rOuter) {
    return null;
  }

  const lWidth = Math.max(Math.hypot(lInner.x - lOuter.x, lInner.y - lOuter.y), 0.008);
  const rWidth = Math.max(Math.hypot(rOuter.x - rInner.x, rOuter.y - rInner.y), 0.008);

  const lCenterX = (lOuter.x + lInner.x) * 0.5;
  const lCenterY = (lOuter.y + lInner.y) * 0.5;
  const rCenterX = (rInner.x + rOuter.x) * 0.5;
  const rCenterY = (rInner.y + rOuter.y) * 0.5;

  // Horizontal iris shift mirrored for natural screen direction: right gaze moves iris image-left (smaller x)
  const lOffsetX = (lCenterX - leftIris.x) / lWidth;
  const rOffsetX = (rCenterX - rightIris.x) / rWidth;

  // Vertical iris shift anchored to rigid corner baseline normalized by eye width
  const lOffsetY = (leftIris.y - lCenterY) / lWidth;
  const rOffsetY = (rightIris.y - rCenterY) / rWidth;

  const gazeX = clamp((lOffsetX + rOffsetX) * 0.5, -0.6, 0.6);
  const gazeY = clamp((lOffsetY + rOffsetY) * 0.5, -0.5, 0.5);

  // Head pose proxies using stable nose bridge + facial boundary landmarks
  const noseTip = landmarks[1];
  const leftCheek = landmarks[234];
  const rightCheek = landmarks[454];
  const forehead = landmarks[10];
  const chin = landmarks[152];

  const faceWidth = Math.max(Math.abs((rightCheek?.x ?? 0.6) - (leftCheek?.x ?? 0.4)), 0.02);
  const faceHeight = Math.max(Math.abs((chin?.y ?? 0.7) - (forehead?.y ?? 0.3)), 0.02);
  const midFaceX = ((leftCheek?.x ?? 0.4) + (rightCheek?.x ?? 0.6)) * 0.5;
  const midFaceY = ((forehead?.y ?? 0.3) + (chin?.y ?? 0.7)) * 0.5;

  const headYaw = clamp(-((noseTip?.x ?? midFaceX) - midFaceX) / faceWidth, -0.8, 0.8);
  const headPitch = clamp(((noseTip?.y ?? midFaceY) - midFaceY) / faceHeight, -0.8, 0.8);

  const blinkLeft = blendshapeMap.get('eyeBlinkLeft') ?? 0;
  const blinkRight = blendshapeMap.get('eyeBlinkRight') ?? 0;

  const faceScale = Math.hypot(rOuter.x - lOuter.x, rOuter.y - lOuter.y);

  return {
    gazeX,
    gazeY,
    headYaw,
    headPitch,
    blinkLeft,
    blinkRight,
    faceScale,
  };
}

/**
 * 5-parameter Affine + Head Pose basis vector:
 * Stably generalized across 9 calibration targets (4 degrees of freedom left to reject jitter)
 */
export function buildFeatureVector(f: EyeFeatures): number[] {
  return [1, f.gazeX, f.gazeY, f.headYaw, f.headPitch];
}

function solveRidgeRegression(X: number[][], y: number[]): number[] {
  const n = X.length;
  const d = X[0].length;

  const A: number[][] = Array.from({ length: d }, () => Array(d).fill(0));
  const b: number[] = Array(d).fill(0);

  for (let i = 0; i < n; i += 1) {
    const row = X[i];
    const target = y[i];
    for (let r = 0; r < d; r += 1) {
      b[r] += row[r] * target;
      for (let c = 0; c < d; c += 1) {
        A[r][c] += row[r] * row[c];
      }
    }
  }

  // Light ridge regularization calibrated for small eye feature variances (0..0.15)
  for (let i = 1; i < d; i += 1) {
    A[i][i] += 0.0004;
  }
  A[0][0] += 1e-6;

  return gaussianElimination(A, b);
}

function gaussianElimination(matrix: number[][], rhs: number[]): number[] {
  const n = rhs.length;
  const M = matrix.map((row, idx) => [...row, rhs[idx]]);

  for (let col = 0; col < n; col += 1) {
    let maxRow = col;
    for (let row = col + 1; row < n; row += 1) {
      if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) {
        maxRow = row;
      }
    }
    const tmp = M[col];
    M[col] = M[maxRow];
    M[maxRow] = tmp;

    const pivot = M[col][col];
    if (Math.abs(pivot) < 1e-10) continue;

    for (let row = col + 1; row < n; row += 1) {
      const factor = M[row][col] / pivot;
      for (let c = col; c <= n; c += 1) {
        M[row][c] -= factor * M[col][c];
      }
    }
  }

  const x = Array(n).fill(0);
  for (let row = n - 1; row >= 0; row -= 1) {
    let sum = M[row][n];
    for (let col = row + 1; col < n; col += 1) {
      sum -= M[row][col] * x[col];
    }
    x[row] = Math.abs(M[row][row]) > 1e-10 ? sum / M[row][row] : 0;
  }
  return x;
}

/**
 * Fits 9-point calibration samples into a predictive model with accuracy score.
 */
export function fitCalibrationModel(samples: CalibrationSample[]): CalibrationModel {
  const X = samples.map((s) => buildFeatureVector(s.features));
  const yX = samples.map((s) => s.targetX);
  const yY = samples.map((s) => s.targetY);

  const weightsX = solveRidgeRegression(X, yX);
  const weightsY = solveRidgeRegression(X, yY);

  let totalErr = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const px = dot(weightsX, X[i]);
    const py = dot(weightsY, X[i]);
    totalErr += Math.hypot(px - yX[i], py - yY[i]);
  }

  const errorNorm = samples.length > 0 ? totalErr / samples.length : 1;
  const quality: CalibrationModel['quality'] =
    errorNorm < 0.09 ? 'good' : errorNorm < 0.16 ? 'fair' : 'poor';

  return {
    weightsX,
    weightsY,
    errorNorm,
    quality,
    calibratedAt: new Date().toISOString(),
  };
}

/**
 * Predicts normalized [0..1] screen coordinates from extracted features.
 */
export function predictGazeNormalized(
  features: EyeFeatures,
  model: CalibrationModel | null
): { x: number; y: number } {
  if (model && model.weightsX.length === 5 && model.weightsY.length === 5) {
    const vec = buildFeatureVector(features);
    const x = clamp(dot(model.weightsX, vec), 0.01, 0.99);
    const y = clamp(dot(model.weightsY, vec), 0.01, 0.99);
    return { x, y };
  }

  // Fallback uncalibrated projection centered around (0, 0) canthus offset
  const rawX = 0.5 + features.gazeX * 3.8 + features.headYaw * 1.6;
  const rawY = 0.5 + features.gazeY * 4.2 + features.headPitch * 1.8;
  return {
    x: clamp(rawX, 0.02, 0.98),
    y: clamp(rawY, 0.02, 0.98),
  };
}

function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i += 1) {
    s += a[i] * b[i];
  }
  return s;
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

class LowPassFilter {
  private y: number | null = null;
  private s: number | null = null;

  public filterWithAlpha(value: number, alpha: number): number {
    if (this.y === null || this.s === null) {
      this.s = value;
      this.y = value;
      return value;
    }
    this.y = value;
    this.s = alpha * value + (1 - alpha) * this.s;
    return this.s;
  }

  public lastRawValue(): number {
    return this.y ?? 0;
  }

  public hasLastValue(): boolean {
    return this.y !== null;
  }

  public reset(): void {
    this.y = null;
    this.s = null;
  }
}

export class OneEuroFilter {
  private xFilter = new LowPassFilter();
  private dxFilter = new LowPassFilter();
  private lastTimeMs: number | null = null;
  private minCutoff = 1.0;
  private beta = 0.015;
  private dCutoff = 1.0;

  public setParams(strength: EyeSettings['smoothingStrength']): void {
    switch (strength) {
      case 'low':
        this.minCutoff = 2.2;
        this.beta = 0.04;
        break;
      case 'balanced':
        this.minCutoff = 1.1;
        this.beta = 0.015;
        break;
      case 'strong':
        this.minCutoff = 0.65;
        this.beta = 0.006;
        break;
      case 'max':
        this.minCutoff = 0.35;
        this.beta = 0.002;
        break;
    }
  }

  private alpha(cutoff: number, dtSeconds: number): number {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / Math.max(dtSeconds, 1e-4));
  }

  public filter(value: number, timestampMs: number): number {
    if (this.lastTimeMs === null) {
      this.lastTimeMs = timestampMs;
      this.dxFilter.filterWithAlpha(0, 1);
      return this.xFilter.filterWithAlpha(value, 1);
    }

    const dt = Math.max((timestampMs - this.lastTimeMs) / 1000, 1e-3);
    this.lastTimeMs = timestampMs;

    const prevX = this.xFilter.hasLastValue() ? this.xFilter.lastRawValue() : value;
    const dx = (value - prevX) / dt;
    const edx = this.dxFilter.filterWithAlpha(dx, this.alpha(this.dCutoff, dt));
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);

    return this.xFilter.filterWithAlpha(value, this.alpha(cutoff, dt));
  }

  public reset(): void {
    this.xFilter.reset();
    this.dxFilter.reset();
    this.lastTimeMs = null;
  }
}

export function loadSavedCalibration(): CalibrationModel | null {
  try {
    const raw = localStorage.getItem(EYE_CALIBRATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CalibrationModel;
    if (Array.isArray(parsed?.weightsX) && parsed.weightsX.length === 5 && Array.isArray(parsed?.weightsY)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveCalibration(model: CalibrationModel): void {
  try {
    localStorage.setItem(EYE_CALIBRATION_STORAGE_KEY, JSON.stringify(model));
  } catch {
    // ignore quota errors
  }
}

export function clearCalibration(): void {
  try {
    localStorage.removeItem(EYE_CALIBRATION_STORAGE_KEY);
  } catch {
    // ignore
  }
}
