/**
 * SymptomButton.jsx - Symptom Tap Target (Figma Design)
 * Owner: Dev 1 (Patient Experience)
 * 
 * Styled after the Figma layout:
 * - High-contrast card with prominent emoji
 * - Primary native language label + secondary English label
 * - Clean teal/forest green selection state matching Figma sketch
 */

import React from 'react';
import { getSymptomText } from '../lib/translations.js';

export default function SymptomButton({ symptom, isSelected, onClick, currentLangCode }) {
  const text = getSymptomText(symptom.id, currentLangCode);
  const primaryLabel = text.label;
  const isEnglish = currentLangCode === 'en';

  return (
    <button
      type="button"
      className={`symptom-card ${isSelected ? 'selected' : ''}`}
      onClick={() => onClick(symptom)}
      aria-pressed={isSelected}
    >
      <span className="symptom-card-icon" role="img" aria-label={symptom.name}>
        {symptom.icon}
      </span>
      <div className="symptom-card-labels">
        <span className="symptom-card-primary">{primaryLabel}</span>
        {!isEnglish && <span className="symptom-card-secondary">{symptom.name}</span>}
      </div>
      {isSelected && <span className="symptom-selected-check">✓</span>}
    </button>
  );
}
