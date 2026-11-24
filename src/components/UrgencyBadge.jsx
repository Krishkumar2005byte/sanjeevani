/**
 * UrgencyBadge.jsx - High Contrast Urgency Indicator
 * Owner: Shared Component / Dev 2 (AI Triage)
 * 
 * Simple explanation:
 * Renders a bold, high-contrast badge indicating clinical urgency:
 * High (Red), Medium (Orange/Yellow), or Low (Green).
 */

import React from 'react';

export default function UrgencyBadge({ urgency }) {
  const level = urgency || 'Low';
  const levelKey = level.toLowerCase();

  const labels = {
    high: '🔴 HIGH URGENCY',
    medium: '🟡 MEDIUM URGENCY',
    low: '🟢 LOW URGENCY'
  };

  return (
    <span className={`urgency-badge urgency-${levelKey}`}>
      {labels[levelKey] || labels.low}
    </span>
  );
}
