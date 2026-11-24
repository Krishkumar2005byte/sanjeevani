/**
 * MedicineCard.jsx - Enhanced Editorial Medicine Card with Toggle, Conflict Badge & Remove
 * Owner: Dev 3 & Member 4 (UI)
 */

import React from 'react';
import { getUiText } from '../lib/translations';
import Icon from './Icons';

export default function MedicineCard({
  medicine,
  index,
  hasConflict = false,
  langCode = 'en',
  onToggleTaken,
  onRemove
}) {
  const ui = getUiText(langCode);
  const times = (medicine.time || 'Morning')
    .split(/&|,/)
    .map((t) => t.trim())
    .filter(Boolean);

  return (
    <div className={`card med-card-enhanced ${hasConflict ? 'has-conflict' : ''}`}>
      <div className="med-card-top">
        <span className={`badge ${hasConflict ? 'b-crit' : 'b-amb'}`}>
          <Icon name={hasConflict ? 'alert' : 'pill'} />
        </span>

        <div className="med-text">
          <div className="med-title-row">
            <b>{medicine.name}</b>
            {hasConflict && <span className="med-conflict-pill">Interaction</span>}
          </div>
          <div className="med-time-tags">
            {times.map((t) => (
              <span key={t} className="med-time-tag">
                {t}
              </span>
            ))}
          </div>
        </div>

        {onRemove && (
          <button
            type="button"
            className="med-remove-btn"
            onClick={() => onRemove(index)}
            title={`Remove ${medicine.name}`}
            aria-label={`Remove ${medicine.name}`}
          >
            <Icon name="x" />
          </button>
        )}
      </div>

      <div className="med-card-foot">
        <span className="med-status-text">
          {medicine.taken ? 'Dose completed today' : 'Scheduled · Due today'}
        </span>
        <button
          type="button"
          className={`taken hi ${medicine.taken ? 'on clickable' : ''}`}
          aria-pressed={medicine.taken}
          onClick={() => onToggleTaken(index)}
          title={medicine.taken ? 'Click to mark as pending' : 'Mark dose as taken'}
        >
          {medicine.taken ? (
            <>
              <Icon name="check" />
              {ui.taken}
            </>
          ) : (
            ui.markAsTaken
          )}
        </button>
      </div>
    </div>
  );
}
