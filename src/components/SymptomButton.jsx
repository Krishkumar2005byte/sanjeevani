/**
 * SymptomButton.jsx - Accessible Horizontal Symptom Tile with Pastel Circular Icon Badge
 * Owner: Dev 1 & Member 4 (UI)
 */

import React from 'react';
import { getSymptomText } from '../lib/translations.js';
import Icon from './Icons.jsx';

const SYMPTOM_VISUALS = {
  'chest-pain': { icon: 'hpulse', color: '#E8C6C5' },
  'high-fever': { icon: 'therm', color: '#C6D8C2' },
  'breathing-trouble': { icon: 'lungs', color: '#E0C0BA' },
  'need-water': { icon: 'drop', color: '#C5D9E4' },
  'headache': { icon: 'head', color: '#F7D0A8' },
  'nausea': { icon: 'stomach', color: '#C3D2AF' },
  'dizziness': { icon: 'swirl', color: '#CAC4DF' },
  'body-pain': { icon: 'bone', color: '#C2D6D1' }
};

export default function SymptomButton({
  symptom,
  isSelected,
  isHighlighted = false,
  onClick,
  currentLangCode
}) {
  const text = getSymptomText(symptom.id, currentLangCode);
  const visual = SYMPTOM_VISUALS[symptom.id] || { icon: 'heart', color: '#EAF3ED' };
  const isEnglish = currentLangCode === 'en';
  const primaryLabel = symptom.name;
  const secondaryLabel = isEnglish ? getSymptomText(symptom.id, 'hi').label : text.label;

  return (
    <button
      type="button"
      className={`tile ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''}`}
      style={{ '--k': visual.color }}
      onClick={() => onClick(symptom)}
      aria-pressed={isSelected}
    >
      {isHighlighted && <span className="tile-focus-pill">Focus</span>}
      <span className="badge">
        <Icon name={visual.icon} />
      </span>
      <span className="tile-labels">
        <b>{primaryLabel}</b>
        {secondaryLabel && secondaryLabel !== primaryLabel && (
          <small className="hi">{secondaryLabel}</small>
        )}
      </span>
      {isSelected && (
        <span className="tile-check" aria-hidden="true">
          <Icon name="check" />
        </span>
      )}
    </button>
  );
}
