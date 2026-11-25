/**
 * CalibrationScreen.tsx - 9-Point Gaze Calibration Wizard
 * Guides the user's gaze through 9 screen targets to map iris + head pose -> screen coordinates.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Crosshair, X, RotateCcw } from 'lucide-react';
import { CALIBRATION_TARGETS, fitCalibrationModel } from '../../lib/eyeCalibration';
import { DwellRing } from './DwellRing';
import type { CalibrationModel, CalibrationSample, EyeFeatures } from '../../types/eyeControl';

export interface CalibrationScreenProps {
  features: EyeFeatures | null;
  onComplete: (model: CalibrationModel) => void;
  onCancel: () => void;
}

const SETTLE_MS = 650;
const CAPTURE_MS = 950;
const SAMPLES_PER_TARGET = 14;

export const CalibrationScreen: React.FC<CalibrationScreenProps> = ({
  features,
  onComplete,
  onCancel,
}) => {
  const [pointIndex, setPointIndex] = useState(0);
  const [phase, setPhase] = useState<'settle' | 'collect' | 'done'>('settle');
  const [progress, setProgress] = useState(0);

  const featuresRef = useRef<EyeFeatures | null>(features);

  useEffect(() => {
    featuresRef.current = features;
  }, [features]);

  const collectedAllRef = useRef<CalibrationSample[]>([]);
  const collectedCurrentRef = useRef<EyeFeatures[]>([]);

  const currentTarget = CALIBRATION_TARGETS[pointIndex];

  useEffect(() => {
    if (pointIndex >= CALIBRATION_TARGETS.length) {
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

      // Only advance when a face/eyes are actively tracked
      if (latest) {
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
            // Take trimmed median-averaged sample slice for robustness against outliers
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
              setPhase('done');
              const model = fitCalibrationModel(collectedAllRef.current);
              onComplete(model);
            }
            return;
          }
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [pointIndex, onComplete]);

  const handleRestart = () => {
    collectedAllRef.current = [];
    setPointIndex(0);
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
            <h2>9-Point Eye Calibration</h2>
            <p>
              Look comfortably at the green target dot until the ring fills. Point {Math.min(pointIndex + 1, 9)} of 9 (
              {currentTarget?.label || 'Done'}).
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

      {!features && (
        <div className="eye-calibration-status-pill" role="status" aria-live="polite">
          Waiting for face &amp; eyes in camera frame… Please look toward the screen.
        </div>
      )}

      {currentTarget && phase !== 'done' && (
        <div
          className="eye-calibration-target"
          style={{
            left: `${currentTarget.x * 100}%`,
            top: `${currentTarget.y * 100}%`,
          }}
        >
          <DwellRing
            progress={phase === 'collect' ? progress : 0}
            size={84}
            strokeWidth={7}
            color="#22C55E"
            trackColor="rgba(255, 255, 255, 0.25)"
          />
          <span className={`eye-calibration-dot ${phase === 'collect' ? 'is-collecting' : ''}`} />
          <span className="eye-calibration-count">{pointIndex + 1}</span>
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
