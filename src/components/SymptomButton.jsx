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

export default function SymptomButton({
  symptom,
  isSelected,
  isHighlighted = false,
  onClick,
  currentLangCode
}) {
  const text = getSymptomText(symptom.id, currentLangCode);
  const primaryLabel = text.label;
  const isEnglish = currentLangCode === 'en';

  return (
    <button
      type="button"
      className={`symptom-card ${isSelected ? 'selected' : ''}`}
      style={
        isHighlighted
          ? {
              outline: '3px solid #f59e0b',
              outlineOffset: '2px',
              boxShadow: '0 0 0 4px rgba(245, 158, 11, 0.2)'
            }
          : undefined
      }
      onClick={() => onClick(symptom)}
      aria-pressed={isSelected}
    >
      {isHighlighted && (
        <span
          style={{
            position: 'absolute',
            top: '8px',
            left: '10px',
            backgroundColor: '#fef3c7',
            color: '#92400e',
            border: '1px solid #f59e0b',
            borderRadius: '9999px',
            padding: '1px 7px',
            fontSize: '0.68rem',
            fontWeight: 800
          }}
        >
          👍 Focus
        </span>
      )}
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
