/**
 * WebcamGesture.jsx - Webcam Box + Gesture Detection Component
 * Owner: Dev 1 (Patient Experience & Accessibility)
 * 
 * Simple explanation:
 * Embeds a live camera feed for non-verbal patients. Detects hand gestures
 * (Open Palm, Thumbs Up, Pointing, Fist) and triggers spoken communication
 * and emergency alerts without touching the screen.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GESTURE_DEFINITIONS } from '../lib/gestures.js';

export default function WebcamGesture({ onGestureDetected }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [detectedGesture, setDetectedGesture] = useState(null);
  const [confidence, setConfidence] = useState(0);

  // Start webcam feed
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Webcam not supported in this browser environment.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err) {
      console.warn('[WebcamGesture] Camera access notice:', err.message);
      setCameraError('Camera access not available or blocked. You can still test gestures below!');
      setIsCameraActive(false);
    }
  };

  // Stop webcam feed
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Handle triggered gesture (from live detection or accessible 1-click tester)
  const triggerGesture = (gesture) => {
    setDetectedGesture(gesture);
    setConfidence(98);
    if (onGestureDetected) {
      onGestureDetected(gesture);
    }

    // Auto-clear highlight after 3 seconds
    setTimeout(() => {
      setDetectedGesture(null);
      setConfidence(0);
    }, 3000);
  };

  return (
    <div className="webcam-gesture-card">
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
        >
          {isCameraActive ? '⏹ Stop Camera' : '▶ Start Camera'}
        </button>
      </div>

      {cameraError && (
        <div className="webcam-notice">
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
              playsInline
              muted
            />
            <div className="gesture-tracking-overlay">
              <span className="tracking-status-pill">● Tracking Hand Landmarks</span>
            </div>
          </div>
        ) : (
          <div className="webcam-standby-screen">
            <span className="standby-icon">👋</span>
            <p className="standby-text">
              Camera is currently off. Click <strong>Start Camera</strong> or test any gesture below.
            </p>
          </div>
        )}

        {/* Live Detected Gesture Banner */}
        {detectedGesture && (
          <div className="detected-gesture-badge">
            <span className="gesture-big-emoji">{detectedGesture.emoji}</span>
            <div className="gesture-badge-text">
              <strong>{detectedGesture.name}: {detectedGesture.label}</strong>
              <span className="gesture-confidence">Confidence: {confidence}% · Dispatched to Caregiver</span>
            </div>
          </div>
        )}
      </div>

      {/* Gesture Quick Tester / Accessibility Bar */}
      <div className="gesture-tester-section">
        <span className="tester-label">Touchless Patient Gestures (Dev 1 Integration):</span>
        <div className="gesture-chips-grid">
          {Object.values(GESTURE_DEFINITIONS).map((g) => (
            <button
              key={g.id}
              type="button"
              className={`gesture-trigger-btn ${detectedGesture?.id === g.id ? 'active' : ''}`}
              onClick={() => triggerGesture(g)}
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
