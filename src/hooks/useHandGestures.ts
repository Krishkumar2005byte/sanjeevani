/**
 * useHandGestures.ts - On-device MediaPipe HandLandmarker Gesture Navigation & Selection Engine
 * Shares the same camera video stream when Eye Control is active (zero double camera open).
 * Supports:
 * - Index finger pointing -> cursor movement (with One Euro Filter tremor smoothing)
 * - Pinch (thumb + index) -> click/select with debounce
 * - Open palm held 1s -> pause/resume tracking
 * - Thumbs up held -> sends "I'm okay" check-in to Caretaker/Nurse
 * - Closed fist held 2s -> triggers Emergency SOS countdown
 */

import { useEffect, useRef, useState } from 'react';
import { OneEuroFilter } from '../lib/eyeCalibration';

const LOCAL_WASM_PATH = '/mediapipe/wasm';
const LOCAL_HAND_MODEL_PATH = '/mediapipe/hand_landmarker.task';
const CDN_WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm';
const CDN_HAND_MODEL_PATH =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const FRAME_INTERVAL_MS = 33;
const PALM_PAUSE_HOLD_MS = 1000;
const FIST_SOS_HOLD_MS = 2000;
const THUMBS_UP_HOLD_MS = 450;
const PINCH_DEBOUNCE_MS = 850;
const THUMBS_COOLDOWN_MS = 2800;

export type HandCondition =
  | 'ok'
  | 'loading'
  | 'hand_not_detected'
  | 'too_dark'
  | 'camera_blocked'
  | 'paused';

export type HandGestureId = 'point' | 'pinch' | 'open_palm' | 'thumbs_up' | 'fist' | 'none';

export interface HandSettings {
  pinchThreshold: number; // normalized ratio (default 0.28 relative to palm width)
  smoothingStrength: 'low' | 'balanced' | 'strong' | 'max';
}

export interface UseHandGesturesOptions {
  enabled: boolean;
  consentGranted: boolean;
  paused: boolean;
  videoEl: HTMLVideoElement | null;
  cameraReady: boolean;
  settings: HandSettings;
  onSelect: () => void;
  onPauseToggle: () => void;
  onThumbsUpOk: () => void;
  onFistSos: () => void;
}

export interface UseHandGesturesResult {
  handPoint: { x: number; y: number } | null;
  activeGesture: HandGestureId;
  handCondition: HandCondition;
  palmPauseProgress: number; // 0..1 while holding open palm toward 1s
  fistSosProgress: number;   // 0..1 while holding fist toward 2s
  modelReady: boolean;
}

interface Landmark {
  x: number;
  y: number;
  z?: number;
}

interface HandLandmarkerInstance {
  detectForVideo: (
    video: HTMLVideoElement,
    timestampMs: number
  ) => { landmarks?: Landmark[][] };
  close: () => void;
}

function dist2D(a: Landmark, b: Landmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function classifyPartEHand(landmarks: Landmark[], pinchRatioThresh: number): HandGestureId {
  if (!landmarks || landmarks.length < 21) return 'none';

  const wrist = landmarks[0];
  const thumbTip = landmarks[4];
  const thumbIp = landmarks[3];
  const indexMcp = landmarks[5];
  const indexPip = landmarks[6];
  const indexTip = landmarks[8];
  const middlePip = landmarks[10];
  const middleTip = landmarks[12];
  const ringPip = landmarks[14];
  const ringTip = landmarks[16];
  const pinkyMcp = landmarks[17];
  const pinkyPip = landmarks[18];
  const pinkyTip = landmarks[20];

  const palmSize = Math.max(dist2D(wrist, indexMcp), dist2D(indexMcp, pinkyMcp), 0.04);
  const pinchDist = dist2D(thumbTip, indexTip) / palmSize;

  const indexOpen = indexTip.y < indexPip.y - 0.02 || dist2D(wrist, indexTip) > dist2D(wrist, indexPip) * 1.15;
  const middleOpen = dist2D(wrist, middleTip) > dist2D(wrist, middlePip) * 1.14;
  const ringOpen = dist2D(wrist, ringTip) > dist2D(wrist, ringPip) * 1.12;
  const pinkyOpen = dist2D(wrist, pinkyTip) > dist2D(wrist, pinkyPip) * 1.12;

  const indexCurled = !indexOpen;
  const othersCurled = !middleOpen && !ringOpen && !pinkyOpen;

  // 1. Pinch (thumb + index touching) takes priority during cursor pointing
  if (pinchDist < pinchRatioThresh && (middleOpen || othersCurled)) {
    return 'pinch';
  }

  // 2. Open palm (all 4 fingers extended cleanly)
  if (indexOpen && middleOpen && ringOpen && pinkyOpen) {
    return 'open_palm';
  }

  // 3. Thumbs Up (all 4 fingers curled, thumb tip pointed vertically well above thumb IP & index MCP)
  const thumbExtendedUp =
    thumbTip.y < thumbIp.y - 0.03 &&
    thumbTip.y < indexMcp.y - 0.025 &&
    dist2D(thumbTip, indexMcp) > palmSize * 0.45;
  if (thumbExtendedUp && indexCurled && othersCurled) {
    return 'thumbs_up';
  }

  // 4. Closed Fist (all fingers curled and thumb tucked inward)
  if (indexCurled && othersCurled && !thumbExtendedUp) {
    return 'fist';
  }

  // 5. Index finger pointing (cursor navigation)
  if (indexOpen && !middleOpen && !ringOpen && !pinkyOpen) {
    return 'point';
  }

  return 'point';
}

export function useHandGestures({
  enabled,
  consentGranted,
  paused,
  videoEl,
  cameraReady,
  settings,
  onSelect,
  onPauseToggle,
  onThumbsUpOk,
  onFistSos,
}: UseHandGesturesOptions): UseHandGesturesResult {
  const [handPoint, setHandPoint] = useState<{ x: number; y: number } | null>(null);
  const [activeGesture, setActiveGesture] = useState<HandGestureId>('none');
  const [handCondition, setHandCondition] = useState<HandCondition>('loading');
  const [palmPauseProgress, setPalmPauseProgress] = useState(0);
  const [fistSosProgress, setFistSosProgress] = useState(0);
  const [modelReady, setModelReady] = useState(false);

  const euroXRef = useRef(new OneEuroFilter());
  const euroYRef = useRef(new OneEuroFilter());
  const landmarkerRef = useRef<HandLandmarkerInstance | null>(null);

  const callbacksRef = useRef({ onSelect, onPauseToggle, onThumbsUpOk, onFistSos, paused, settings });
  useEffect(() => {
    callbacksRef.current = { onSelect, onPauseToggle, onThumbsUpOk, onFistSos, paused, settings };
  }, [onSelect, onPauseToggle, onThumbsUpOk, onFistSos, paused, settings]);

  useEffect(() => {
    euroXRef.current.setParams(settings.smoothingStrength);
    euroYRef.current.setParams(settings.smoothingStrength);
  }, [settings.smoothingStrength]);

  const lastTsRef = useRef(0);
  const lastVideoTimeRef = useRef(-1);
  const lastHandSeenRef = useRef(0);
  const palmStartRef = useRef<number | null>(null);
  const palmTriggeredRef = useRef(false);
  const fistStartRef = useRef<number | null>(null);
  const fistTriggeredRef = useRef(false);
  const thumbsStartRef = useRef<number | null>(null);
  const lastThumbsFiredRef = useRef(0);
  const pinchActiveRef = useRef(false);
  const lastPinchFiredRef = useRef(0);

  useEffect(() => {
    if (!enabled || !consentGranted || !videoEl || !cameraReady) {
      return;
    }

    const euroX = euroXRef.current;
    const euroY = euroYRef.current;
    let cancelled = false;
    let rafId = 0;

    async function initHandTracker() {
      lastHandSeenRef.current = Date.now();
      setHandCondition('loading');

      try {
        const vision = await import('@mediapipe/tasks-vision');
        const { FilesetResolver, HandLandmarker } = vision;

        let filesetResolver;
        try {
          filesetResolver = await FilesetResolver.forVisionTasks(LOCAL_WASM_PATH);
        } catch {
          filesetResolver = await FilesetResolver.forVisionTasks(CDN_WASM_PATH);
        }

        const attempts: Array<[string, 'GPU' | 'CPU']> = [
          [LOCAL_HAND_MODEL_PATH, 'GPU'],
          [LOCAL_HAND_MODEL_PATH, 'CPU'],
          [CDN_HAND_MODEL_PATH, 'CPU'],
        ];

        let instance: HandLandmarkerInstance | null = null;
        for (const [modelPath, delegate] of attempts) {
          if (cancelled) return;
          try {
            instance = (await HandLandmarker.createFromOptions(filesetResolver, {
              baseOptions: { modelAssetPath: modelPath, delegate },
              runningMode: 'VIDEO',
              numHands: 1,
              minHandDetectionConfidence: 0.55,
              minHandPresenceConfidence: 0.55,
              minTrackingConfidence: 0.55,
            })) as unknown as HandLandmarkerInstance;
            break;
          } catch {
            // try next candidate
          }
        }

        if (!instance || cancelled) {
          if (instance) instance.close();
          return;
        }

        landmarkerRef.current = instance;
        setModelReady(true);
        setHandCondition(callbacksRef.current.paused ? 'paused' : 'ok');
      } catch (err) {
        console.warn('[useHandGestures] Init error:', err);
        if (!cancelled) setHandCondition('camera_blocked');
        return;
      }

      const loop = () => {
        if (cancelled) return;
        rafId = requestAnimationFrame(loop);

        if (document.hidden) return;
        const now = performance.now();
        if (now - lastTsRef.current < FRAME_INTERVAL_MS) return;
        lastTsRef.current = now;

        const lm = landmarkerRef.current;
        if (!lm || !videoEl || videoEl.readyState < 2) return;
        if (videoEl.currentTime === lastVideoTimeRef.current) return;
        lastVideoTimeRef.current = videoEl.currentTime;

        let res;
        try {
          res = lm.detectForVideo(videoEl, now);
        } catch {
          return;
        }

        const hand = res?.landmarks?.[0];
        if (!hand || hand.length < 21) {
          if (Date.now() - lastHandSeenRef.current > 650) {
            setHandCondition(callbacksRef.current.paused ? 'paused' : 'hand_not_detected');
            setActiveGesture('none');
          }
          palmStartRef.current = null;
          fistStartRef.current = null;
          thumbsStartRef.current = null;
          pinchActiveRef.current = false;
          setPalmPauseProgress(0);
          setFistSosProgress(0);
          return;
        }

        lastHandSeenRef.current = Date.now();
        const cb = callbacksRef.current;
        const gesture = classifyPartEHand(hand, cb.settings.pinchThreshold);
        setActiveGesture(gesture);

        // Open palm held 1s toggles Pause/Resume
        if (gesture === 'open_palm') {
          if (palmStartRef.current === null) {
            palmStartRef.current = now;
            palmTriggeredRef.current = false;
          }
          const elapsed = now - palmStartRef.current;
          setPalmPauseProgress(Math.min(1, elapsed / PALM_PAUSE_HOLD_MS));
          if (elapsed >= PALM_PAUSE_HOLD_MS && !palmTriggeredRef.current) {
            palmTriggeredRef.current = true;
            setPalmPauseProgress(0);
            cb.onPauseToggle();
          }
        } else {
          palmStartRef.current = null;
          palmTriggeredRef.current = false;
          setPalmPauseProgress(0);
        }

        if (cb.paused) {
          setHandCondition('paused');
          fistStartRef.current = null;
          setFistSosProgress(0);
          return;
        }

        setHandCondition('ok');

        // Closed fist held 2s triggers SOS countdown
        if (gesture === 'fist') {
          if (fistStartRef.current === null) {
            fistStartRef.current = now;
            fistTriggeredRef.current = false;
          }
          const elapsed = now - fistStartRef.current;
          setFistSosProgress(Math.min(1, elapsed / FIST_SOS_HOLD_MS));
          if (elapsed >= FIST_SOS_HOLD_MS && !fistTriggeredRef.current) {
            fistTriggeredRef.current = true;
            setFistSosProgress(0);
            cb.onFistSos();
          }
        } else {
          fistStartRef.current = null;
          fistTriggeredRef.current = false;
          setFistSosProgress(0);
        }

        // Thumbs up sends "I'm okay"
        if (gesture === 'thumbs_up') {
          if (thumbsStartRef.current === null) thumbsStartRef.current = now;
          if (
            now - thumbsStartRef.current >= THUMBS_UP_HOLD_MS &&
            now - lastThumbsFiredRef.current > THUMBS_COOLDOWN_MS
          ) {
            lastThumbsFiredRef.current = now;
            thumbsStartRef.current = now + 999999; // require release before firing again
            cb.onThumbsUpOk();
          }
        } else {
          thumbsStartRef.current = null;
        }

        // Pinch triggers click with debounce (freeze cursor slightly during pinch)
        if (gesture === 'pinch') {
          if (!pinchActiveRef.current && now - lastPinchFiredRef.current >= PINCH_DEBOUNCE_MS) {
            pinchActiveRef.current = true;
            lastPinchFiredRef.current = now;
            cb.onSelect();
          }
          return;
        } else {
          pinchActiveRef.current = false;
        }

        // Index finger pointing moves cursor smoothly (mirrored horizontally, slight padding margin)
        if (gesture === 'point') {
          const tip = hand[8];
          const vw = window.innerWidth || 1280;
          const vh = window.innerHeight || 720;
          // Active camera comfort box [0.15..0.85] stretched smoothly to [0..1] screen
          const normX = Math.max(0.01, Math.min(0.99, (1 - tip.x - 0.14) / 0.72));
          const normY = Math.max(0.01, Math.min(0.99, (tip.y - 0.14) / 0.72));

          const sx = euroXRef.current.filter(normX * vw, now);
          const sy = euroYRef.current.filter(normY * vh, now);
          setHandPoint({ x: sx, y: sy });
        }
      };

      rafId = requestAnimationFrame(loop);
    }

    initHandTracker();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      if (landmarkerRef.current) {
        try {
          landmarkerRef.current.close();
        } catch {
          // ignore
        }
        landmarkerRef.current = null;
      }
      euroX.reset();
      euroY.reset();
      setHandPoint(null);
      setActiveGesture('none');
      setModelReady(false);
    };
  }, [enabled, consentGranted, videoEl, cameraReady]);

  const active = enabled && consentGranted;

  return {
    handPoint: active ? handPoint : null,
    activeGesture: active ? activeGesture : 'none',
    handCondition: !active ? 'paused' : handCondition,
    palmPauseProgress: active ? palmPauseProgress : 0,
    fistSosProgress: active ? fistSosProgress : 0,
    modelReady: active ? modelReady : false,
  };
}
