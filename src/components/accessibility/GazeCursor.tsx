/**
 * GazeCursor.tsx - Translucent gaze cursor & magnetic target highlight overlay
 * Always renders pointer-events: none above the UI
 */

import React from 'react';
import { DwellRing } from './DwellRing';

export interface GazeCursorProps {
  visible: boolean;
  x: number;
  y: number;
  sizePx: number;
  dwellProgress: number;
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
  isSnapped,
  snappedRect,
  paused,
  isEmergencyTarget = false,
}) => {
  if (!visible) return null;

  const ringColor = paused
    ? '#F59E0B'
    : isEmergencyTarget
      ? '#DC2626'
      : '#134E32';

  return (
    <>
      {/* Magnetic Snap Focus Outline around nearest interactive element */}
      {isSnapped && snappedRect && !paused && (
        <div
          className={`eye-snap-highlight ${isEmergencyTarget ? 'is-emergency' : ''}`}
          style={{
            left: `${Math.max(2, snappedRect.left - 5)}px`,
            top: `${Math.max(2, snappedRect.top - 5)}px`,
            width: `${snappedRect.width + 10}px`,
            height: `${snappedRect.height + 10}px`,
          }}
          aria-hidden="true"
        />
      )}

      {/* Translucent Gaze Cursor + Dwell Progress Ring */}
      <div
        className={`eye-gaze-cursor ${paused ? 'is-paused' : ''} ${isSnapped ? 'is-snapped' : ''}`}
        style={{
          left: `${x}px`,
          top: `${y}px`,
          width: `${sizePx}px`,
          height: `${sizePx}px`,
        }}
        aria-hidden="true"
      >
        <div className="eye-gaze-core" />
        {(dwellProgress > 0.02 || isSnapped) && !paused && (
          <DwellRing
            progress={dwellProgress}
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
