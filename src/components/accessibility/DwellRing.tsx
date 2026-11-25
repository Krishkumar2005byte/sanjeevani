/**
 * DwellRing.tsx - Accessible circular SVG progress ring for dwell & pause gestures
 */

import React from 'react';

export interface DwellRingProps {
  /** Progress from 0 to 1 */
  progress: number;
  /** Outer diameter in pixels */
  size?: number;
  /** Stroke thickness */
  strokeWidth?: number;
  /** Ring color */
  color?: string;
  /** Track color */
  trackColor?: string;
  className?: string;
}

export const DwellRing: React.FC<DwellRingProps> = ({
  progress,
  size = 56,
  strokeWidth = 5,
  color = '#134E32',
  trackColor = 'rgba(255, 255, 255, 0.55)',
  className = '',
}) => {
  const clamped = Math.max(0, Math.min(1, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`eye-dwell-ring ${className}`}
      aria-hidden="true"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={trackColor}
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
};
