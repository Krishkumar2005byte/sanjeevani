/**
 * GazeCursor.tsx - Translucent gaze cursor, magnetic highlight outline & Double-Blink feedback badge
 */

import React from 'react';
import { DwellRing } from './DwellRing';

export interface GazeCursorProps {
  visible: boolean;
  x: number;
  y: number;
  sizePx: number;
  dwellProgress: number;
  blinkStage: 0 | 1;
  doubleBlinkMode: boolean;
  isSnapped: boolean;
  snappedRect: DOMRect | null;
  paused: boolean;
  isEmergencyTarget?: boolean;
}

export const GazeCursor: React.FC<GazeCursorProps> = ({
  visible,
  x,
  y,
  sizePx,
  dwellProgress,
  blinkStage,
  doubleBlinkMode,
  isSnapped,
  snappedRect,
  paused,
  isEmergencyTarget = false,
}) => {
  if (!visible) return null;

  const ringColor = paused
    ? '#F59E0B'
    : blinkStage === 1
      ? '#2563EB'
      : isEmergencyTarget
        ? '#DC2626'
        : '#134E32';

  const ringProgress = blinkStage === 1 ? 0.5 : dwellProgress;

  return (
    <>
      {/* Magnetic Snap Focus Outline around nearest interactive element */}
      {isSnapped && snappedRect && !paused && (
        <div
          className={`eye-snap-highlight ${isEmergencyTarget ? 'is-emergency' : ''} ${
            blinkStage === 1 ? 'is-blink-primed' : ''
          }`}
          style={{
            left: `${Math.max(2, snappedRect.left - 5)}px`,
            top: `${Math.max(2, snappedRect.top - 5)}px`,
            width: `${snappedRect.width + 10}px`,
            height: `${snappedRect.height + 10}px`,
          }}
          aria-hidden="true"
        >
          {doubleBlinkMode && (
            <span className="eye-snap-hint">
              {blinkStage === 1 ? 'Blink once more (1/2)' : 'Blink twice to click'}
            </span>
          )}
        </div>
      )}

      {/* Translucent Gaze Cursor + Progress/Blink Ring */}
      <div
        className={`eye-gaze-cursor ${paused ? 'is-paused' : ''} ${isSnapped ? 'is-snapped' : ''} ${
          blinkStage === 1 ? 'is-blink-1' : ''
        }`}
        style={{
          left: `${x}px`,
          top: `${y}px`,
          width: `${sizePx}px`,
          height: `${sizePx}px`,
        }}
        aria-hidden="true"
      >
        <div className="eye-gaze-core" />
        {(ringProgress > 0.02 || isSnapped) && !paused && (
          <DwellRing
            progress={ringProgress}
            size={sizePx + 14}
            strokeWidth={5}
            color={ringColor}
            trackColor="rgba(19, 78, 50, 0.22)"
          />
        )}
      </div>
    </>
  );
};
