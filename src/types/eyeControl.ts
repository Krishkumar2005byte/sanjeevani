/**
 * Shared TypeScript types for Eye Control Accessibility Mode
 */

export type SelectionMethod = 'dwell' | 'blink' | 'scan';

export type EyeHealthCondition =
  | 'ok'
  | 'loading'
  | 'no_face'
  | 'too_dark'
  | 'move_closer'
  | 'camera_blocked'
  | 'no_camera'
  | 'paused'
  | 'tab_hidden';

export interface EyeFeatures {
  /** Normalized horizontal iris position [0..1] averaged across both eyes (mirrored for front camera) */
  gazeX: number;
  /** Normalized vertical iris position [0..1] averaged across both eyes */
  gazeY: number;
  /** Head yaw proxy [-1..1] */
  headYaw: number;
  /** Head pitch proxy [-1..1] */
  headPitch: number;
  /** Eye openness / blink blendshapes [0..1] */
  blinkLeft: number;
  blinkRight: number;
  /** Estimated inter-ocular distance ratio relative to frame width */
  faceScale: number;
}

export interface CalibrationSample {
  targetX: number; // Normalized [0..1] viewport X
  targetY: number; // Normalized [0..1] viewport Y
  features: EyeFeatures;
}

export interface CalibrationModel {
  /** Polynomial feature weights mapping [1, gx, gy, yaw, pitch, gx^2, gy^2, gx*gy] -> screen X (0..1) */
  weightsX: number[];
  /** Polynomial feature weights mapping [1, gx, gy, yaw, pitch, gx^2, gy^2, gx*gy] -> screen Y (0..1) */
  weightsY: number[];
  /** Mean error in normalized screen units across calibration points */
  errorNorm: number;
  calibratedAt: string;
}

export interface EyeSettings {
  dwellTimeMs: number;      // 600 - 3000 ms (default 1200)
  blinkMinMs: number;       // 500 - 800 ms (default 550)
  doubleBlinkWindowMs: number; // 400 - 800 ms (default 600)
  dwellEnabled: boolean;    // default true
  blinkEnabled: boolean;    // default false
  doubleBlinkEnabled: boolean; // default true when blink is enabled
  scanningEnabled: boolean; // default false
  scanSpeedMs: number;      // 1000 - 3500 ms (default 1800)
  cursorSizePx: number;     // 28 - 72 px (default 44)
  smoothingStrength: 'low' | 'balanced' | 'strong' | 'max';
  edgeScrollEnabled: boolean; // default true
  voiceFeedback: boolean;   // default true
}

export const DEFAULT_EYE_SETTINGS: EyeSettings = {
  dwellTimeMs: 1200,
  blinkMinMs: 550,
  doubleBlinkWindowMs: 600,
  dwellEnabled: true,
  blinkEnabled: false,
  doubleBlinkEnabled: true,
  scanningEnabled: false,
  scanSpeedMs: 1800,
  cursorSizePx: 44,
  smoothingStrength: 'balanced',
  edgeScrollEnabled: true,
  voiceFeedback: true,
};
