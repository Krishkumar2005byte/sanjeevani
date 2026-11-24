/**
 * WebcamGesture.jsx - Real-Time MediaPipe Hand Tracking & Gesture Recognition
 * Owner: Dev 1 (Patient Experience & Accessibility)
 *
 * Simple explanation:
 * Connects the laptop webcam to MediaPipe HandLandmarker in real time,
 * detects 21 hand landmarks, draws live hand skeleton feedback, and
 * converts stable hand gestures into symptom selection or emergency actions.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { GESTURE_DEFINITIONS, classifyHandLandmarks } from '../lib/gestures.js';

const LOCAL_WASM_PATH = '/mediapipe/wasm';
const LOCAL_MODEL_PATH = '/mediapipe/hand_landmarker.task';
const CDN_WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm';
const CDN_MODEL_PATH =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const COOLDOWN_MS = 2500;
const NORMAL_HOLD_FRAMES = 6;
const EMERGENCY_HOLD_FRAMES = 12;

export default function WebcamGesture({ onGestureDetected, highlightedSymptomName }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const handLandmarkerRef = useRef(null);
  const rafIdRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);
  const lastDetectTsRef = useRef(0);
  const pendingGestureRef = useRef({ id: null, count: 0 });
  const lastTriggeredAtRef = useRef(0);
  const gestureBannerTimerRef = useRef(null);
  const cooldownTimerRef = useRef(null);
  const onGestureDetectedRef = useRef(onGestureDetected);
  const isMountedRef = useRef(true);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [modelStatus, setModelStatus] = useState('idle'); // 'idle' | 'loading' | 'ready' | 'error'
  const [cameraError, setCameraError] = useState(null);
  const [handDetected, setHandDetected] = useState(false);
  const [liveGesture, setLiveGesture] = useState(null);
  const [detectedGesture, setDetectedGesture] = useState(null);
  const [confidence, setConfidence] = useState(0);
  const [inCooldown, setInCooldown] = useState(false);

  useEffect(() => {
    onGestureDetectedRef.current = onGestureDetected;
  }, [onGestureDetected]);

  // Clear drawn landmarks on canvas
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  // Draw 21 hand landmarks & skeleton connections onto the overlay canvas
  const drawHandLandmarks = useCallback((landmarks, videoEl, isEmergencyHold) => {
    const canvas = canvasRef.current;
    if (!canvas || !videoEl) return;

    const width = videoEl.videoWidth || 640;
    const height = videoEl.videoHeight || 480;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    const strokeColor = isEmergencyHold ? '#ef4444' : '#10b981';
    const pointColor = isEmergencyHold ? '#fca5a5' : '#ffffff';

    const connections = HandLandmarker.HAND_CONNECTIONS || [];
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    for (const conn of connections) {
      const start = landmarks[conn.start];
      const end = landmarks[conn.end];
      if (!start || !end) continue;
      ctx.beginPath();
      ctx.moveTo(start.x * width, start.y * height);
      ctx.lineTo(end.x * width, end.y * height);
      ctx.stroke();
    }

    for (let i = 0; i < landmarks.length; i += 1) {
      const pt = landmarks[i];
      ctx.beginPath();
      ctx.arc(pt.x * width, pt.y * height, i === 0 ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle = pointColor;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = strokeColor;
      ctx.stroke();
    }
  }, []);

  // Initialize MediaPipe HandLandmarker (prefers local assets + GPU, falls back to CPU / CDN)
  const ensureHandLandmarker = useCallback(async () => {
    if (handLandmarkerRef.current) {
      setModelStatus('ready');
      return handLandmarkerRef.current;
    }

    if (typeof WebAssembly === 'undefined') {
      throw new Error('WebAssembly is not supported in this browser.');
    }

    setModelStatus('loading');

    const createWithConfig = async (wasmPath, modelPath, delegate) => {
      const vision = await FilesetResolver.forVisionTasks(wasmPath);
      return HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: modelPath,
          delegate
        },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.55,
        minHandPresenceConfidence: 0.55,
        minTrackingConfidence: 0.55
      });
    };

    const attempts = [
      [LOCAL_WASM_PATH, LOCAL_MODEL_PATH, 'GPU'],
      [LOCAL_WASM_PATH, LOCAL_MODEL_PATH, 'CPU'],
      [CDN_WASM_PATH, CDN_MODEL_PATH, 'CPU']
    ];

    let lastError = null;
    for (const [wasmPath, modelPath, delegate] of attempts) {
      try {
        const landmarker = await createWithConfig(wasmPath, modelPath, delegate);
        if (!isMountedRef.current) {
          landmarker.close();
          return null;
        }
        handLandmarkerRef.current = landmarker;
        setModelStatus('ready');
        return landmarker;
      } catch (err) {
        lastError = err;
        console.warn(`[WebcamGesture] Model init attempt failed (${delegate}, ${modelPath}):`, err?.message || err);
      }
    }

    setModelStatus('error');
    throw lastError || new Error('Failed to load MediaPipe hand tracking model.');
  }, []);

  // Trigger a gesture action (from live MediaPipe recognition or manual quick button)
  const triggerGesture = useCallback((gesture, score = 96) => {
    if (!gesture) return;

    if (gestureBannerTimerRef.current) {
      clearTimeout(gestureBannerTimerRef.current);
    }

    setDetectedGesture(gesture);
    setConfidence(score);

    if (onGestureDetectedRef.current) {
      onGestureDetectedRef.current(gesture);
    }

    gestureBannerTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setDetectedGesture(null);
        setConfidence(0);
      }
    }, 3000);
  }, []);

  // Stop webcam feed, animation loop, and release camera tracks
  const stopCamera = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    clearCanvas();
    lastVideoTimeRef.current = -1;
    pendingGestureRef.current = { id: null, count: 0 };
    setHandDetected(false);
    setLiveGesture(null);
    setIsCameraActive(false);
    setIsCameraLoading(false);
  }, [clearCanvas]);

  // Start webcam feed (preferring laptop front-facing camera) + load MediaPipe model
  const startCamera = async () => {
    if (isCameraLoading) return;

    setCameraError(null);
    setIsCameraLoading(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Webcam is not supported in this browser.');
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: { ideal: 'user' }
          },
          audio: false
        });
      } catch (constraintErr) {
        if (constraintErr.name === 'OverconstrainedError' || constraintErr.name === 'NotFoundError') {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
        } else {
          throw constraintErr;
        }
      }

      if (!isMountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      setIsCameraActive(true);

      // Load MediaPipe HandLandmarker model (camera preview continues even if model takes a moment)
      try {
        await ensureHandLandmarker();
      } catch (modelErr) {
        console.warn('[WebcamGesture] Hand tracking model error:', modelErr?.message || modelErr);
        if (isMountedRef.current) {
          setCameraError(
            'Webcam is live, but the hand-tracking model failed to load in this browser. You can still tap gestures or symptoms below.'
          );
        }
      }
    } catch (err) {
      console.warn('[WebcamGesture] Camera access notice:', err.message);
      if (isMountedRef.current) {
        let message = 'Camera access not available or blocked. You can still test gestures below!';
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          message = 'Camera permission was denied. Please allow camera access in Chrome and try again.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          message = 'No webcam was detected on this device. You can still test gestures below!';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          message = 'Your webcam is currently in use by another app or tab. Close it and try again.';
        } else if (err.message?.includes('not supported')) {
          message = 'Your browser does not support webcam access. Try using Chrome or Edge.';
        }
        setCameraError(message);
        setIsCameraActive(false);
      }
    } finally {
      if (isMountedRef.current) {
        setIsCameraLoading(false);
      }
    }
  };

  // Attach the stream and start video playback AFTER <video> mounts
  useEffect(() => {
    const videoEl = videoRef.current;
    const stream = streamRef.current;

    if (!isCameraActive || !videoEl || !stream) {
      return;
    }

    if (videoEl.srcObject !== stream) {
      videoEl.srcObject = stream;
    }

    const startPlayback = async () => {
      try {
        await videoEl.play();
      } catch (playErr) {
        if (playErr.name !== 'AbortError') {
          console.warn('[WebcamGesture] Video play notice:', playErr.message);
          setCameraError('Camera connected, but video preview could not auto-play.');
        }
      }
    };

    startPlayback();
  }, [isCameraActive]);

  // Continuous real-time MediaPipe detection loop while camera & model are active
  useEffect(() => {
    if (!isCameraActive || modelStatus !== 'ready' || !handLandmarkerRef.current) {
      return undefined;
    }

    let cancelled = false;

    const processFrame = () => {
      if (cancelled || !isMountedRef.current) return;

      const videoEl = videoRef.current;
      const landmarker = handLandmarkerRef.current;

      if (
        videoEl &&
        landmarker &&
        videoEl.readyState >= 2 &&
        videoEl.videoWidth > 0 &&
        videoEl.videoHeight > 0 &&
        videoEl.currentTime !== lastVideoTimeRef.current
      ) {
        lastVideoTimeRef.current = videoEl.currentTime;
        const rawNow = performance.now();
        const timestamp = rawNow > lastDetectTsRef.current ? rawNow : lastDetectTsRef.current + 1;
        lastDetectTsRef.current = timestamp;

        try {
          const result = landmarker.detectForVideo(videoEl, timestamp);
          const firstHand = result?.landmarks?.[0];

          if (firstHand && firstHand.length >= 21) {
            setHandDetected((prev) => (prev ? prev : true));

            const recognized = classifyHandLandmarks(firstHand);
            setLiveGesture((prev) => (prev?.id === recognized?.id ? prev : recognized));

            const isEmergencyCandidate = recognized?.id === 'fist';
            drawHandLandmarks(firstHand, videoEl, isEmergencyCandidate);

            if (recognized) {
              // Stability check: require consecutive frames before triggering
              if (pendingGestureRef.current.id === recognized.id) {
                pendingGestureRef.current.count += 1;
              } else {
                pendingGestureRef.current = { id: recognized.id, count: 1 };
              }

              const requiredFrames =
                recognized.id === 'fist' ? EMERGENCY_HOLD_FRAMES : NORMAL_HOLD_FRAMES;

              if (pendingGestureRef.current.count >= requiredFrames) {
                const nowMs = Date.now();
                if (nowMs - lastTriggeredAtRef.current >= COOLDOWN_MS) {
                  lastTriggeredAtRef.current = nowMs;
                  pendingGestureRef.current = { id: recognized.id, count: 0 };

                  const handScore = Math.round((result?.handedness?.[0]?.[0]?.score || 0.94) * 100);
                  triggerGesture(recognized, handScore);

                  setInCooldown(true);
                  if (cooldownTimerRef.current) {
                    clearTimeout(cooldownTimerRef.current);
                  }
                  cooldownTimerRef.current = setTimeout(() => {
                    if (isMountedRef.current) {
                      setInCooldown(false);
                    }
                  }, COOLDOWN_MS);
                }
              }
            } else {
              pendingGestureRef.current = { id: null, count: 0 };
            }
          } else {
            setHandDetected((prev) => (prev ? false : prev));
            setLiveGesture((prev) => (prev ? null : prev));
            pendingGestureRef.current = { id: null, count: 0 };
            clearCanvas();
          }
        } catch (detectErr) {
          console.warn('[WebcamGesture] Frame detection warning:', detectErr?.message || detectErr);
        }
      }

      rafIdRef.current = requestAnimationFrame(processFrame);
    };

    rafIdRef.current = requestAnimationFrame(processFrame);

    return () => {
      cancelled = true;
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      clearCanvas();
    };
  }, [isCameraActive, modelStatus, drawHandLandmarks, clearCanvas, triggerGesture]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (gestureBannerTimerRef.current) clearTimeout(gestureBannerTimerRef.current);
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
      stopCamera();
      if (handLandmarkerRef.current) {
        try {
          handLandmarkerRef.current.close();
        } catch {
          // Ignore close errors on unmount
        }
        handLandmarkerRef.current = null;
      }
    };
  }, [stopCamera]);

  // Compute human-readable live status badge text and color
  const getLiveStatus = () => {
    if (!isCameraActive) {
      return { text: '○ Camera inactive', bg: 'rgba(100, 116, 139, 0.9)' };
    }
    if (modelStatus === 'loading') {
      return { text: '⏳ Camera active · Loading hand model...', bg: 'rgba(217, 119, 6, 0.92)' };
    }
    if (modelStatus === 'error') {
      return { text: '⚠️ Camera active · Model unavailable', bg: 'rgba(220, 38, 38, 0.9)' };
    }
    if (!handDetected) {
      return { text: '● Camera active · No hand detected', bg: 'rgba(30, 41, 59, 0.88)' };
    }
    if (liveGesture) {
      return {
        text: `${liveGesture.emoji} Hand detected · Gesture recognized: ${liveGesture.name}${inCooldown ? ' (Cooldown)' : ''}`,
        bg: liveGesture.id === 'fist' ? 'rgba(220, 38, 38, 0.95)' : 'rgba(16, 185, 129, 0.95)'
      };
    }
    return { text: '🖐️ Camera active · Hand detected', bg: 'rgba(16, 185, 129, 0.9)' };
  };

  const liveStatus = getLiveStatus();

  return (
    <div
      className="webcam-gesture-card"
      style={
        handDetected
          ? { borderColor: '#10b981', boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.18)' }
          : undefined
      }
    >
      <div className="webcam-header">
        <div className="webcam-header-title">
          <span className="webcam-icon">📹</span>
          <div>
            <h4>MediaPipe Hand Gesture Camera</h4>
            <p className="webcam-subtitle">Non-verbal patient communication via hand movements</p>
          </div>
        </div>

        <button
          type="button"
          className={`btn-webcam-toggle ${isCameraActive ? 'active' : ''}`}
          onClick={isCameraActive ? stopCamera : startCamera}
          disabled={isCameraLoading}
        >
          {isCameraLoading
            ? '⏳ Starting...'
            : isCameraActive
              ? '⏹ Stop Camera'
              : '▶ Start Camera'}
        </button>
      </div>

      {/* Visible Live Status Strip */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          padding: '8px 12px',
          borderRadius: '8px',
          backgroundColor: handDetected ? '#ecfdf5' : '#f8fafc',
          border: `1px solid ${handDetected ? '#6ee7b7' : '#e2e8f0'}`,
          fontSize: '0.84rem',
          fontWeight: 700,
          color: handDetected ? '#065f46' : '#334155'
        }}
        role="status"
        aria-live="polite"
      >
        <span>
          {isCameraActive
            ? handDetected
              ? liveGesture
                ? `${liveGesture.emoji} Hand Detected · Gesture: ${liveGesture.name}`
                : '🖐️ Hand Detected · Ready'
              : modelStatus === 'loading'
                ? '⏳ Loading MediaPipe Hand Model...'
                : '👀 Camera Active · No Hand Detected'
            : '📷 Camera Inactive'}
        </span>
        {highlightedSymptomName && (
          <span style={{ color: '#0a4f3d' }}>
            Target: <strong>{highlightedSymptomName}</strong>
          </span>
        )}
      </div>

      {cameraError && (
        <div className="webcam-notice" role="alert">
          ℹ️ {cameraError}
        </div>
      )}

      {/* Video Viewport */}
      <div className="webcam-viewport-container">
        {isCameraActive ? (
          <div className="video-wrapper">
            <video
              ref={videoRef}
              className="webcam-video-feed"
              style={{
                display: 'block',
                width: '100%',
                minHeight: '220px',
                maxHeight: '260px',
                objectFit: 'cover'
              }}
              autoPlay
              playsInline
              muted
            />
            <canvas
              ref={canvasRef}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(-1)',
                pointerEvents: 'none'
              }}
            />
            <div className="gesture-tracking-overlay">
              <span
                className="tracking-status-pill"
                style={{ backgroundColor: liveStatus.bg }}
              >
                {liveStatus.text}
              </span>
            </div>
          </div>
        ) : (
          <div className="webcam-standby-screen">
            <span className="standby-icon">{isCameraLoading ? '⏳' : '👋'}</span>
            <p className="standby-text">
              {isCameraLoading ? (
                'Starting laptop webcam... Please allow camera permission if prompted.'
              ) : (
                <>
                  Camera is currently off. Click <strong>Start Camera</strong> to enable live hand tracking.
                </>
              )}
            </p>
          </div>
        )}

        {/* Live Detected Gesture Banner */}
        {detectedGesture && (
          <div className="detected-gesture-badge">
            <span className="gesture-big-emoji">{detectedGesture.emoji}</span>
            <div className="gesture-badge-text">
              <strong>{detectedGesture.name}: {detectedGesture.label}</strong>
              <span className="gesture-confidence">
                Confidence: {confidence}%{inCooldown ? ' · Cooldown active' : ''}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Gesture Guide & Accessibility Buttons */}
      <div className="gesture-tester-section">
        <span className="tester-label">Supported Hand Gestures (Live Camera or Quick Tap):</span>
        <div className="gesture-chips-grid">
          {Object.values(GESTURE_DEFINITIONS).map((g) => (
            <button
              key={g.id}
              type="button"
              className={`gesture-trigger-btn ${detectedGesture?.id === g.id ? 'active' : ''}`}
              onClick={() => triggerGesture(g, 100)}
              title={g.label}
            >
              <span className="chip-emoji">{g.emoji}</span>
              <span className="chip-name">{g.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
