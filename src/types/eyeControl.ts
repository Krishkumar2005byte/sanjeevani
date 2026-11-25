/**
 * Shared TypeScript types for Patient Eye-Gesture Accessibility Mode
 */

export type SelectionMethod = 'double_blink' | 'dwell' | 'scan';

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
  /** Iris horizontal offset relative to fixed eye corners (mirrored for screen X) */
  gazeX: number;
  /** Iris vertical offset relative to fixed eye corner baseline */
  gazeY: number;
  /** Head yaw proxy */
  headYaw: number;
  /** Head pitch proxy */
  headPitch: number;
  /** Eye blink blendshape scores [0..1] */
  blinkLeft: number;
  blinkRight: number;
  /** Inter-ocular distance ratio relative to frame width */
  faceScale: number;
}

export interface CalibrationSample {
  targetX: number; // Normalized [0..1] viewport X
  targetY: number; // Normalized [0..1] viewport Y
  features: EyeFeatures;
}

export interface CalibrationModel {
  /** Affine + Head Pose feature weights [1, gazeX, gazeY, headYaw, headPitch] -> screen X (0..1) */
  weightsX: number[];
  /** Affine + Head Pose feature weights [1, gazeX, gazeY, headYaw, headPitch] -> screen Y (0..1) */
  weightsY: number[];
  /** Mean residual error in normalized viewport units */
  errorNorm: number;
  /** Calibration quality indicator */
  quality: 'good' | 'fair' | 'poor';
  calibratedAt: string;
}

export interface EyeSettings {
  dwellTimeMs: number;        // 600 - 3000 ms (optional fallback)
  blinkMinMs: number;         // 90 - 400 ms per deliberate blink inside double-blink
  doubleBlinkWindowMs: number; // 500 - 1400 ms max gap between 1st and 2nd blink (default 900)
  dwellEnabled: boolean;      // default false (user must blink twice to select)
  blinkEnabled: boolean;      // default true (Double-Blink primary selection)
  doubleBlinkEnabled: boolean; // default true (requires 2 blinks to select)
  scanningEnabled: boolean;   // default false
  scanSpeedMs: number;        // 1000 - 3500 ms (default 1800)
  cursorSizePx: number;       // 28 - 72 px (default 46)
  smoothingStrength: 'low' | 'balanced' | 'strong' | 'max';
  edgeScrollEnabled: boolean; // default true
  voiceFeedback: boolean;     // default true
}

export const DEFAULT_EYE_SETTINGS: EyeSettings = {
  dwellTimeMs: 1400,
  blinkMinMs: 90,
  doubleBlinkWindowMs: 900,
  dwellEnabled: false,
  blinkEnabled: true,
  doubleBlinkEnabled: true,
  scanningEnabled: false,
  scanSpeedMs: 1800,
  cursorSizePx: 46,
  smoothingStrength: 'balanced',
  edgeScrollEnabled: true,
  voiceFeedback: true,
};
