/**
 * useEyeTracking.ts - Lazy on-device MediaPipe FaceLandmarker iris + head-pose + blink engine
 * - Loads @mediapipe/tasks-vision lazily only when Eye Control Mode is enabled
 * - Runs 100% locally in the browser; never uploads or stores video frames
 * - Throttled ~30fps RAF loop with visibility pause, lighting/distance checks, One Euro Filter,
 *   deliberate/double blink detector, and 2-second eyes-closed pause toggle
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  OneEuroFilter,
  extractEyeFeatures,
  predictGazeNormalized,
} from '../lib/eyeCalibration';
import type {
  CalibrationModel,
  EyeFeatures,
  EyeHealthCondition,
  EyeSettings,
} from '../types/eyeControl';

const LOCAL_WASM_PATH = '/mediapipe/wasm';
const LOCAL_FACE_MODEL_PATH = '/mediapipe/face_landmarker.task';
const CDN_WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm';
const CDN_FACE_MODEL_PATH =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

const TARGET_FRAME_INTERVAL_MS = 33; // ~30fps cap to prevent main UI lag
const BLINK_THRESHOLD = 0.5;
const PAUSE_HOLD_MS = 2000;
const BLINK_COOLDOWN_MS = 900;
const MIN_BLINK_SAMPLE_MS = 90;

export interface UseEyeTrackingOptions {
  enabled: boolean;
  consentGranted: boolean;
  paused: boolean;
  calibration: CalibrationModel | null;
  settings: EyeSettings;
  onPauseToggle: () => void;
  onBlinkAction: () => void;
}

export interface UseEyeTrackingResult {
  gazePoint: { x: number; y: number } | null;
  features: EyeFeatures | null;
  condition: EyeHealthCondition;
  modelReady: boolean;
  cameraActive: boolean;
  pauseHoldProgress: number; // 0..1 while both eyes are held closed toward 2s pause toggle
  errorMessage: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

interface FaceLandmarkerInstance {
  detectForVideo: (
    video: HTMLVideoElement,
    timestampMs: number
  ) => {
    faceLandmarks?: Array<Array<{ x: number; y: number; z?: number }>>;
    faceBlendshapes?: Array<{
      categories?: Array<{ categoryName: string; score: number }>;
    }>;
  };
  close: () => void;
}

export function useEyeTracking({
  enabled,
  consentGranted,
  paused,
  calibration,
  settings,
  onPauseToggle,
  onBlinkAction,
}: UseEyeTrackingOptions): UseEyeTrackingResult {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<FaceLandmarkerInstance | null>(null);
  const rafRef = useRef<number | null>(null);
  const lumaCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const euroXRef = useRef(new OneEuroFilter());
  const euroYRef = useRef(new OneEuroFilter());

  const calibrationRef = useRef(calibration);
  const settingsRef = useRef(settings);
  const pausedRef = useRef(paused);
  const onPauseToggleRef = useRef(onPauseToggle);
  const onBlinkActionRef = useRef(onBlinkAction);

  useEffect(() => {
    calibrationRef.current = calibration;
    settingsRef.current = settings;
    pausedRef.current = paused;
    onPauseToggleRef.current = onPauseToggle;
    onBlinkActionRef.current = onBlinkAction;
  }, [calibration, settings, paused, onPauseToggle, onBlinkAction]);

  // Update One Euro filter tuning whenever smoothing strength changes
  useEffect(() => {
    euroXRef.current.setParams(settings.smoothingStrength);
    euroYRef.current.setParams(settings.smoothingStrength);
  }, [settings.smoothingStrength]);

  const [gazePoint, setGazePoint] = useState<{ x: number; y: number } | null>(null);
  const [features, setFeatures] = useState<EyeFeatures | null>(null);
  const [condition, setCondition] = useState<EyeHealthCondition>('loading');
  const [modelReady, setModelReady] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [pauseHoldProgress, setPauseHoldProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Refs for frame loop timers & blink state
  const lastFrameTsRef = useRef(0);
  const lastVideoTimeRef = useRef(-1);
  const lastFaceSeenAtRef = useRef(0);
  const lastLumaCheckAtRef = useRef(0);
  const isTooDarkRef = useRef(false);

  // Blink state tracking
  const eyesClosedStartRef = useRef<number | null>(null);
  const pauseTriggeredDuringHoldRef = useRef(false);
  const lastBlinkEndAtRef = useRef<number>(0);
  const lastBlinkClickAtRef = useRef<number>(0);

  const stopResources = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (landmarkerRef.current) {
      try {
        landmarkerRef.current.close();
      } catch {
        // ignore
      }
      landmarkerRef.current = null;
    }

    euroXRef.current.reset();
    euroYRef.current.reset();
    eyesClosedStartRef.current = null;
    pauseTriggeredDuringHoldRef.current = false;
    setCameraActive(false);
    setModelReady(false);
    setGazePoint(null);
    setFeatures(null);
    setPauseHoldProgress(0);
  }, []);

  /** Samples luminance from a tiny 16x16 canvas every 500ms */
  const checkAmbientLuminance = useCallback((video: HTMLVideoElement, now: number): boolean => {
    if (now - lastLumaCheckAtRef.current < 500) {
      return isTooDarkRef.current;
    }
    lastLumaCheckAtRef.current = now;

    try {
      if (!lumaCanvasRef.current) {
        lumaCanvasRef.current = document.createElement('canvas');
        lumaCanvasRef.current.width = 16;
        lumaCanvasRef.current.height = 16;
      }
      const ctx = lumaCanvasRef.current.getContext('2d', { willReadFrequently: true });
      if (!ctx) return false;
      ctx.drawImage(video, 0, 0, 16, 16);
      const data = ctx.getImageData(0, 0, 16, 16).data;
      let sum = 0;
      const pixels = 256;
      for (let i = 0; i < data.length; i += 4) {
        sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      }
      const avgLuma = sum / pixels;
      isTooDarkRef.current = avgLuma < 28;
    } catch {
      isTooDarkRef.current = false;
    }
    return isTooDarkRef.current;
  }, []);

  useEffect(() => {
    if (!enabled || !consentGranted) {
      return;
    }

    let cancelled = false;

    async function initEyeControl() {
      lastFaceSeenAtRef.current = Date.now();
      setCondition('loading');
      setErrorMessage(null);

      // 1. Check webcam availability
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCondition('no_camera');
        setErrorMessage('Camera API is unavailable in this browser. Using standard input.');
        return;
      }

      // 2. Request local camera stream
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });
      } catch (err) {
        if (cancelled) return;
        const name = err instanceof Error ? err.name : '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setCondition('camera_blocked');
          setErrorMessage('Camera permission was blocked. Enable webcam permission or use standard controls.');
        } else {
          setCondition('no_camera');
          setErrorMessage('No working webcam detected. Continuing with normal touch/mouse input.');
        }
        return;
      }

      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      setCameraActive(true);

      // Attach stream to hidden offscreen video element
      let videoEl = videoRef.current;
      if (!videoEl) {
        videoEl = document.createElement('video');
        videoEl.playsInline = true;
        videoEl.muted = true;
        videoEl.autoplay = true;
        (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = videoEl;
      }
      videoEl.srcObject = stream;

      try {
        await videoEl.play();
      } catch {
        // Ignore autoplay promise rejection if muted plays inline
      }

      // 3. Lazy-load MediaPipe Tasks Vision + FaceLandmarker ONLY when enabled
      try {
        const vision = await import('@mediapipe/tasks-vision');
        const { FilesetResolver, FaceLandmarker } = vision;

        let filesetResolver;
        try {
          filesetResolver = await FilesetResolver.forVisionTasks(LOCAL_WASM_PATH);
        } catch {
          filesetResolver = await FilesetResolver.forVisionTasks(CDN_WASM_PATH);
        }

        const createLandmarker = async (modelPath: string, delegate: 'GPU' | 'CPU') =>
          FaceLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
              modelAssetPath: modelPath,
              delegate,
            },
            outputFaceBlendshapes: true,
            outputFacialTransformationMatrixes: false,
            runningMode: 'VIDEO',
            numFaces: 1,
          });

        let instance: FaceLandmarkerInstance | null = null;
        const modelCandidates: Array<[string, 'GPU' | 'CPU']> = [
          [LOCAL_FACE_MODEL_PATH, 'GPU'],
          [LOCAL_FACE_MODEL_PATH, 'CPU'],
          [CDN_FACE_MODEL_PATH, 'GPU'],
          [CDN_FACE_MODEL_PATH, 'CPU'],
        ];

        for (const [modelPath, delegate] of modelCandidates) {
          if (cancelled) return;
          try {
            instance = (await createLandmarker(modelPath, delegate)) as unknown as FaceLandmarkerInstance;
            break;
          } catch {
            // Try next fallback
          }
        }

        if (!instance) {
          throw new Error('Could not initialize MediaPipe FaceLandmarker model.');
        }

        if (cancelled) {
          instance.close();
          return;
        }

        landmarkerRef.current = instance;
        setModelReady(true);
        setCondition(pausedRef.current ? 'paused' : 'ok');
      } catch (err) {
        if (cancelled) return;
        console.error('[useEyeTracking] Model init error:', err);
        setCondition('camera_blocked');
        setErrorMessage('Could not load Face Landmarker AI model. Please check connectivity once to cache model.');
        return;
      }

      // 4. Start ~30fps detection loop
      const processFrame = () => {
        if (cancelled) return;
        rafRef.current = requestAnimationFrame(processFrame);

        if (document.hidden) {
          setCondition('tab_hidden');
          return;
        }

        const now = performance.now();
        if (now - lastFrameTsRef.current < TARGET_FRAME_INTERVAL_MS) {
          return;
        }
        lastFrameTsRef.current = now;

        const video = videoRef.current;
        const landmarker = landmarkerRef.current;
        if (!video || !landmarker || video.readyState < 2) {
          return;
        }

        if (video.currentTime === lastVideoTimeRef.current) {
          return;
        }
        lastVideoTimeRef.current = video.currentTime;

        const dark = checkAmbientLuminance(video, now);

        let result;
        try {
          result = landmarker.detectForVideo(video, now);
        } catch {
          return;
        }

        const landmarks = result?.faceLandmarks?.[0];
        if (!landmarks || landmarks.length === 0) {
          if (Date.now() - lastFaceSeenAtRef.current > 600) {
            setCondition(dark ? 'too_dark' : 'no_face');
          }
          setPauseHoldProgress(0);
          return;
        }

        lastFaceSeenAtRef.current = Date.now();

        const blendshapeMap = new Map<string, number>();
        const cats = result?.faceBlendshapes?.[0]?.categories;
        if (Array.isArray(cats)) {
          for (const cat of cats) {
            blendshapeMap.set(cat.categoryName, cat.score);
          }
        }

        const extracted = extractEyeFeatures(landmarks, blendshapeMap);
        if (!extracted) return;
        setFeatures(extracted);

        // Process bilateral eye closure for 2s Pause/Resume + deliberate blink clicks
        const bothClosed =
          extracted.blinkLeft >= BLINK_THRESHOLD && extracted.blinkRight >= BLINK_THRESHOLD;

        if (bothClosed) {
          if (eyesClosedStartRef.current === null) {
            eyesClosedStartRef.current = now;
            pauseTriggeredDuringHoldRef.current = false;
          }
          const closedElapsed = now - eyesClosedStartRef.current;
          setPauseHoldProgress(Math.min(1, closedElapsed / PAUSE_HOLD_MS));

          if (closedElapsed >= PAUSE_HOLD_MS && !pauseTriggeredDuringHoldRef.current) {
            pauseTriggeredDuringHoldRef.current = true;
            setPauseHoldProgress(0);
            onPauseToggleRef.current();
          }
        } else {
          if (eyesClosedStartRef.current !== null) {
            const blinkDuration = now - eyesClosedStartRef.current;
            eyesClosedStartRef.current = null;
            setPauseHoldProgress(0);

            // Only evaluate selection blinks when NOT paused and NOT just coming out of a 2s pause hold
            if (!pausedRef.current && !pauseTriggeredDuringHoldRef.current) {
              const s = settingsRef.current;
              const inCooldown = now - lastBlinkClickAtRef.current < BLINK_COOLDOWN_MS;

              if (!inCooldown && (s.blinkEnabled || s.scanningEnabled)) {
                // Deliberate long blink: ignore natural blinks under 300ms; accept configured blinkMinMs (500-800ms)
                const effectiveLongMs = Math.max(300, s.blinkMinMs);
                const isDeliberateLongBlink =
                  blinkDuration >= effectiveLongMs && blinkDuration < PAUSE_HOLD_MS;

                // Double blink: two consecutive distinct blinks (>= 90ms each) completing within window (600ms)
                const timeSincePrevBlink = now - lastBlinkEndAtRef.current;
                const isSecondOfDoubleBlink =
                  s.doubleBlinkEnabled &&
                  blinkDuration >= MIN_BLINK_SAMPLE_MS &&
                  blinkDuration < PAUSE_HOLD_MS &&
                  lastBlinkEndAtRef.current > 0 &&
                  timeSincePrevBlink <= s.doubleBlinkWindowMs;

                // Single blink selects when scanning mode is active if deliberate (>= 300ms)
                const isScanSelectBlink =
                  s.scanningEnabled &&
                  !s.blinkEnabled &&
                  blinkDuration >= 300 &&
                  blinkDuration < PAUSE_HOLD_MS;

                if (isDeliberateLongBlink || isSecondOfDoubleBlink || isScanSelectBlink) {
                  lastBlinkClickAtRef.current = now;
                  lastBlinkEndAtRef.current = 0;
                  onBlinkActionRef.current();
                } else if (blinkDuration >= MIN_BLINK_SAMPLE_MS && blinkDuration < 500) {
                  lastBlinkEndAtRef.current = now;
                }
              }
            }
          }
          pauseTriggeredDuringHoldRef.current = false;
        }

        if (pausedRef.current) {
          setCondition('paused');
          return;
        }

        // Check environmental / distance conditions
        if (dark) {
          setCondition('too_dark');
        } else if (extracted.faceScale < 0.085) {
          setCondition('move_closer');
        } else {
          setCondition('ok');
        }

        // Don't jump cursor coordinates while eyes are shut mid-blink
        if (!bothClosed) {
          const norm = predictGazeNormalized(extracted, calibrationRef.current);
          const vw = window.innerWidth || 1280;
          const vh = window.innerHeight || 720;

          const smoothX = euroXRef.current.filter(norm.x * vw, now);
          const smoothY = euroYRef.current.filter(norm.y * vh, now);

          setGazePoint({
            x: Math.max(4, Math.min(vw - 4, smoothX)),
            y: Math.max(4, Math.min(vh - 4, smoothY)),
          });
        }
      };

      rafRef.current = requestAnimationFrame(processFrame);
    }

    initEyeControl();

    const handleVisibility = () => {
      if (document.hidden) {
        setCondition('tab_hidden');
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      stopResources();
    };
  }, [enabled, consentGranted, checkAmbientLuminance, stopResources]);

  const isTracking = enabled && consentGranted;

  return {
    gazePoint: isTracking ? gazePoint : null,
    features: isTracking ? features : null,
    condition: !isTracking ? 'paused' : paused && condition === 'ok' ? 'paused' : condition,
    modelReady: isTracking ? modelReady : false,
    cameraActive: isTracking ? cameraActive : false,
    pauseHoldProgress: isTracking ? pauseHoldProgress : 0,
    errorMessage: isTracking ? errorMessage : null,
    videoRef,
  };
}
