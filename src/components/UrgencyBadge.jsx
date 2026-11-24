/**
 * UrgencyBadge.jsx - Soft Pill Urgency Indicator with Status Dot
 * Owner: Shared Component / Dev 2 & Member 4
 */

import React from 'react';

export default function UrgencyBadge({ urgency }) {
  const level = urgency || 'Low';
  const levelKey = level.toLowerCase();

  const label =
    levelKey === 'high'
      ? 'HIGH URGENCY'
      : levelKey === 'medium' || levelKey === 'moderate'
        ? 'MODERATE URGENCY'
        : 'LOW URGENCY';

  return (
    <span className={`sev ${levelKey}`}>
      <i aria-hidden="true" />
      {label}
    </span>
  );
}
