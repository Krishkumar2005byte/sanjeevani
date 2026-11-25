/**
 * CalibrationScreen.tsx - 9-Point Gaze Calibration Wizard with accuracy check & readiness wait
 */

import React, { useEffect, useRef, useState } from 'react';
import { Crosshair, X, RotateCcw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { CALIBRATION_TARGETS, fitCalibrationModel } from '../../lib/eyeCalibration';
import { DwellRing } from './DwellRing';
import type { CalibrationModel, CalibrationSample, EyeFeatures } from '../../types/eyeControl';

export interface CalibrationScreenProps {
  features: EyeFeatures | null;
  modelReady: boolean;
  onComplete: (model: CalibrationModel) => void;
  onCancel: () => void;
}

const SETTLE_MS = 850;
const CAPTURE_MS = 1000;
const SAMPLES_PER_TARGET = 18;

export const CalibrationScreen: React.FC<CalibrationScreenProps> = ({
  features,
  modelReady,
  onComplete,
  onCancel,
}) => {
  const [pointIndex, setPointIndex] = useState(0);
  const [phase, setPhase] = useState<'settle' | 'collect' | 'review'>('settle');
  const [progress, setProgress] = useState(0);
  const [fittedModel, setFittedModel] = useState<CalibrationModel | null>(null);

  const featuresRef = useRef<EyeFeatures | null>(features);
  const modelReadyRef = useRef<boolean>(modelReady);

  useEffect(() => {
    featuresRef.current = features;
    modelReadyRef.current = modelReady;
  }, [features, modelReady]);

  const collectedAllRef = useRef<CalibrationSample[]>([]);
  const collectedCurrentRef = useRef<EyeFeatures[]>([]);

  const currentTarget = CALIBRATION_TARGETS[pointIndex];

  useEffect(() => {
    if (pointIndex >= CALIBRATION_TARGETS.length || phase === 'review') {
      return;
    }

    collectedCurrentRef.current = [];
    let settleElapsed = 0;
    let collectElapsed = 0;
    let lastTs = performance.now();
    let rafId = 0;
    let activePhase: 'settle' | 'collect' = 'settle';

    const tick = (now: number) => {
      const dt = now - lastTs;
      lastTs = now;
      const latest = featuresRef.current;

      if (activePhase === 'settle' && collectElapsed === 0) {
        setPhase((prev) => (prev === 'settle' ? prev : 'settle'));
        setProgress(0);
      }

      // Only advance countdown when MediaPipe model is ready and eyes are openly detected (not mid-blink)
      const eyesOpen = latest && latest.blinkLeft < 0.4 && latest.blinkRight < 0.4;
      if (modelReadyRef.current && eyesOpen && latest) {
        if (activePhase === 'settle') {
          settleElapsed += dt;
          if (settleElapsed >= SETTLE_MS) {
            activePhase = 'collect';
            setPhase('collect');
          }
        } else {
          collectElapsed += dt;
          collectedCurrentRef.current.push(latest);
          setProgress(Math.min(1, collectElapsed / CAPTURE_MS));

          if (collectElapsed >= CAPTURE_MS && collectedCurrentRef.current.length >= 6) {
            const rawList = collectedCurrentRef.current.slice(-SAMPLES_PER_TARGET);
            const avg: EyeFeatures = {
              gazeX: median(rawList.map((f) => f.gazeX)),
              gazeY: median(rawList.map((f) => f.gazeY)),
              headYaw: median(rawList.map((f) => f.headYaw)),
              headPitch: median(rawList.map((f) => f.headPitch)),
              blinkLeft: median(rawList.map((f) => f.blinkLeft)),
              blinkRight: median(rawList.map((f) => f.blinkRight)),
              faceScale: median(rawList.map((f) => f.faceScale)),
            };

            const tgt = CALIBRATION_TARGETS[pointIndex];
            collectedAllRef.current.push({
              targetX: tgt.x,
              targetY: tgt.y,
              features: avg,
            });

            if (pointIndex + 1 < CALIBRATION_TARGETS.length) {
              setPointIndex((p) => p + 1);
            } else {
              const model = fitCalibrationModel(collectedAllRef.current);
              setFittedModel(model);
              setPhase('review');
              // Automatically commit when fit quality is good or fair
              if (model.quality !== 'poor') {
                onComplete(model);
              }
            }
            return;
          }
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [pointIndex, phase, onComplete]);

  const handleRestart = () => {
    collectedAllRef.current = [];
    setFittedModel(null);
    setPointIndex(0);
    setPhase('settle');
    setProgress(0);
  };

  return (
    <div
      className="eye-calibration-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Eye Tracking 9-Point Calibration"
    >
      <div className="eye-calibration-header">
        <div className="eye-calibration-title">
          <Crosshair className="w-6 h-6" />
          <div>
            <h2>9-Point Eye &amp; Head Calibration</h2>
            <p>
              Look directly at each glowing target dot ({Math.min(pointIndex + 1, 9)}/9 ·{' '}
              {currentTarget?.label || 'Review'}). Keep your eyes on the dot until the ring fills.
            </p>
          </div>
        </div>

        <div className="eye-calibration-actions">
          <button
            type="button"
            className="eye-ctrl-btn"
            onClick={handleRestart}
            aria-label="Restart calibration"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Restart</span>
          </button>
          <button
            type="button"
            className="eye-ctrl-btn danger"
            onClick={onCancel}
            aria-label="Cancel calibration"
          >
            <X className="w-5 h-5" />
            <span>Cancel</span>
          </button>
        </div>
      </div>

      {(!modelReady || !features) && phase !== 'review' && (
        <div className="eye-calibration-status-pill" role="status" aria-live="polite">
          {!modelReady
            ? 'Loading on-device Face Landmarker AI… Please wait a moment.'
            : 'Face not detected — center your face in front of the webcam to begin.'}
        </div>
      )}

      {currentTarget && phase !== 'review' && (
        <div
          className="eye-calibration-target"
          style={{
            left: `${currentTarget.x * 100}%`,
            top: `${currentTarget.y * 100}%`,
          }}
        >
          <DwellRing
            progress={phase === 'collect' ? progress : 0}
            size={88}
            strokeWidth={7}
            color="#22C55E"
            trackColor="rgba(255, 255, 255, 0.25)"
          />
          <span className={`eye-calibration-dot ${phase === 'collect' ? 'is-collecting' : ''}`} />
          <span className="eye-calibration-count">
            {phase === 'settle' ? 'Look Here' : `Recording ${pointIndex + 1}/9`}
          </span>
        </div>
      )}

      {phase === 'review' && fittedModel && (
        <div className="eye-calibration-review-card">
          {fittedModel.quality === 'poor' ? (
            <AlertTriangle className="w-10 h-10 text-amber-400" />
          ) : (
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          )}
          <h3>
            {fittedModel.quality === 'poor'
              ? 'Low Calibration Accuracy Detected'
              : 'Calibration Complete'}
          </h3>
          <p>
            Average screen fit error: <strong>{(fittedModel.errorNorm * 100).toFixed(1)}%</strong>.{' '}
            {fittedModel.quality === 'poor'
              ? 'Ensure bright front lighting, face the webcam directly, and follow each dot with both eyes and a slight head turn.'
              : 'Eye tracking is calibrated. Look at any target and blink twice to select!'}
          </p>
          <div className="eye-calibration-actions">
            <button type="button" className="eye-ctrl-btn" onClick={handleRestart}>
              <RotateCcw className="w-5 h-5" />
              <span>Recalibrate</span>
            </button>
            <button
              type="button"
              className="eye-ctrl-btn primary"
              onClick={() => onComplete(fittedModel)}
            >
              <span>Use This Calibration</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) * 0.5
    : sorted[mid];
}
