/**
 * UrgencyBadge.jsx - Multilingual Soft Pill Urgency Indicator
 * Owner: Shared Component / Dev 2 & Member 4
 */

import React from 'react';
import { getUiText } from '../lib/translations';

export default function UrgencyBadge({ urgency, langCode = 'en' }) {
  const level = urgency || 'Low';
  const levelKey = level.toLowerCase();
  const ui = getUiText(langCode);

  const label =
    levelKey === 'high'
      ? ui.urgencyHigh
      : levelKey === 'medium' || levelKey === 'moderate'
        ? ui.urgencyMedium
        : ui.urgencyLow;

  return (
    <span className={`sev hi ${levelKey}`}>
      <i aria-hidden="true" />
      {label}
    </span>
  );
}
