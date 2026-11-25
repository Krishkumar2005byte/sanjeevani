/**
 * useInputManager.ts - Unified Multi-Modal Input Orchestrator
 * Merges Eye Gaze + Hand Gestures + Mouse/Touch/Keyboard into unified move/select/scroll/SOS actions.
 * Opens ONLY ONE shared webcam stream when Eye, Hand, or Both modes are active simultaneously!
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useEyeTracking } from './useEyeTracking';
import { useHandGestures } from './useHandGestures';
import type { CalibrationModel, EyeFeatures, EyeHealthCondition, EyeSettings } from '../types/eyeControl';
import type { HandCondition, HandGestureId } from './useHandGestures';

export type ActiveInputSource = 'eye' | 'hand' | 'pointer';

export interface UseInputManagerOptions {
  eyeEnabled: boolean;
  handEnabled: boolean;
  consentGranted: boolean;
  paused: boolean;
  calibration: CalibrationModel | null;
  eyeSettings: EyeSettings;
  tremorTolerance: 'standard' | 'high' | 'max';
  snappedTargetRef: React.RefObject<HTMLElement | null>;
  onPauseToggle: () => void;
  onSelectTarget: (target: HTMLElement | null) => void;
  onThumbsUpOk: () => void;
  onTriggerSos: (source: string) => void;
}

export interface UseInputManagerResult {
  activeSource: ActiveInputSource;
  cursorPoint: { x: number; y: number } | null;
  cameraActive: boolean;
  cameraError: string | null;
  tooDark: boolean;
  eyeFeatures: EyeFeatures | null;
  eyeCondition: EyeHealthCondition;
  eyeModelReady: boolean;
  blinkStage: 0 | 1;
  pauseHoldProgress: number;
  handCondition: HandCondition;
  handModelReady: boolean;
  activeHandGesture: HandGestureId;
  palmPauseProgress: number;
  fistSosProgress: number;
}

const PINCH_THRESH_MAP: Record<UseInputManagerOptions['tremorTolerance'], number> = {
  standard: 0.27,
  high: 0.34,
  max: 0.42,
};

export function useInputManager({
  eyeEnabled,
  handEnabled,
  consentGranted,
  paused,
  calibration,
  eyeSettings,
  tremorTolerance,
  snappedTargetRef,
  onPauseToggle,
  onSelectTarget,
  onThumbsUpOk,
  onTriggerSos,
}: UseInputManagerOptions): UseInputManagerResult {
  const anyCamMode = (eyeEnabled || handEnabled) && consentGranted;

  const sharedVideoRef = useRef<HTMLVideoElement | null>(null);
  const sharedStreamRef = useRef<MediaStream | null>(null);
  const [sharedVideoEl, setSharedVideoEl] = useState<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [tooDark, setTooDark] = useState(false);

  // Single shared webcam lifecycle for Eye + Hand tracking combined
  useEffect(() => {
    if (!anyCamMode) {
      if (sharedStreamRef.current) {
        sharedStreamRef.current.getTracks().forEach((t) => t.stop());
        sharedStreamRef.current = null;
      }
      if (sharedVideoRef.current) {
        sharedVideoRef.current.srcObject = null;
      }
      return;
    }

    let cancelled = false;
    let lumaTimer: number | null = null;

    async function startSharedCamera() {
      setCameraError(null);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Webcam API not supported. Falling back to mouse/touch/keyboard.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        sharedStreamRef.current = stream;
        let video = sharedVideoRef.current;
        if (!video) {
          video = document.createElement('video');
          video.playsInline = true;
          video.muted = true;
          video.autoplay = true;
          sharedVideoRef.current = video;
        }
        video.srcObject = stream;
        try {
          await video.play();
        } catch {
          // ignore
        }

        setSharedVideoEl(video);
        setCameraActive(true);

        // Shared luminance sampler (avoids running twice)
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        lumaTimer = window.setInterval(() => {
          if (!ctx || !sharedVideoRef.current || sharedVideoRef.current.readyState < 2 || document.hidden) {
            return;
          }
          try {
            ctx.drawImage(sharedVideoRef.current, 0, 0, 16, 16);
            const data = ctx.getImageData(0, 0, 16, 16).data;
            let sum = 0;
            for (let i = 0; i < data.length; i += 4) {
              sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            }
            setTooDark(sum / 256 < 28);
          } catch {
            // ignore
          }
        }, 700);
      } catch (err) {
        if (cancelled) return;
        const name = err instanceof Error ? err.name : '';
        setCameraError(
          name === 'NotAllowedError' || name === 'PermissionDeniedError'
            ? 'Camera blocked — mouse, touch, and keyboard remain active.'
            : 'No camera detected — using normal pointer & touch controls.'
        );
      }
    }

    void startSharedCamera();

    return () => {
      cancelled = true;
      if (lumaTimer !== null) clearInterval(lumaTimer);
      if (sharedStreamRef.current) {
        sharedStreamRef.current.getTracks().forEach((t) => t.stop());
        sharedStreamRef.current = null;
      }
      if (sharedVideoRef.current) {
        sharedVideoRef.current.srcObject = null;
      }
      setSharedVideoEl(null);
      setCameraActive(false);
    };
  }, [anyCamMode]);

  const selectCurrent = useCallback(() => {
    onSelectTarget(snappedTargetRef.current);
  }, [onSelectTarget, snappedTargetRef]);

  const effectiveVideoEl = anyCamMode ? sharedVideoEl : null;
  const effectiveCamActive = anyCamMode && cameraActive;
  const effectiveCamError = anyCamMode ? cameraError : null;
  const effectiveTooDark = anyCamMode && tooDark;

  const eyeResult = useEyeTracking({
    enabled: eyeEnabled,
    consentGranted,
    paused,
    calibration,
    settings: eyeSettings,
    externalVideoEl: effectiveVideoEl,
    externalCameraReady: effectiveCamActive,
    onPauseToggle,
    onBlinkAction: selectCurrent,
  });

  const handResult = useHandGestures({
    enabled: handEnabled,
    consentGranted,
    paused,
    videoEl: effectiveVideoEl,
    cameraReady: effectiveCamActive,
    settings: {
      pinchThreshold: PINCH_THRESH_MAP[tremorTolerance],
      smoothingStrength:
        tremorTolerance === 'max' ? 'max' : tremorTolerance === 'high' ? 'strong' : eyeSettings.smoothingStrength,
    },
    onSelect: selectCurrent,
    onPauseToggle,
    onThumbsUpOk,
    onFistSos: () => onTriggerSos('2s Closed-Fist Hand Gesture'),
  });

  // Derive active biometric pointer source directly without effect cascading
  const activeSource: ActiveInputSource =
    handEnabled && handResult.handPoint && handResult.handCondition === 'ok'
      ? 'hand'
      : eyeEnabled && eyeResult.gazePoint && eyeResult.condition === 'ok'
        ? 'eye'
        : 'pointer';

  // Unified cursor coordinate: prioritize active pointing hand if clearly tracked, else eye gaze
  const cursorPoint =
    handEnabled && handResult.handPoint && handResult.handCondition === 'ok'
      ? handResult.handPoint
      : eyeEnabled && eyeResult.gazePoint
        ? eyeResult.gazePoint
        : null;

  return {
    activeSource,
    cursorPoint,
    cameraActive: effectiveCamActive,
    cameraError: effectiveCamError,
    tooDark: effectiveTooDark,
    eyeFeatures: eyeResult.features,
    eyeCondition: effectiveCamError ? 'camera_blocked' : effectiveTooDark ? 'too_dark' : eyeResult.condition,
    eyeModelReady: eyeResult.modelReady,
    blinkStage: eyeResult.blinkStage,
    pauseHoldProgress: Math.max(eyeResult.pauseHoldProgress, handResult.palmPauseProgress),
    handCondition: effectiveCamError ? 'camera_blocked' : effectiveTooDark ? 'too_dark' : handResult.handCondition,
    handModelReady: handResult.modelReady,
    activeHandGesture: handResult.activeGesture,
    palmPauseProgress: handResult.palmPauseProgress,
    fistSosProgress: handResult.fistSosProgress,
  };
}
