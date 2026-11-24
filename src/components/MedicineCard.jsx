/**
 * MedicineCard.jsx - Clean Editorial Medicine Card with Pastel Pill Badge
 * Owner: Dev 3 & Member 4 (UI)
 */

import React from 'react';
import Icon from './Icons';

export default function MedicineCard({ medicine, index, onMarkTaken }) {
  return (
    <div className="card med-card">
      <span className="badge b-amb">
        <Icon name="pill" />
      </span>
      <div className="med-text">
        <b>{medicine.name}</b>
        <small>{medicine.time}</small>
      </div>
      {medicine.taken ? (
        <span className="taken on" aria-pressed="true">
          <Icon name="check" />
          Taken
        </span>
      ) : (
        <button
          type="button"
          className="taken"
          aria-pressed="false"
          onClick={() => onMarkTaken(index)}
        >
          Mark as taken
        </button>
      )}
    </div>
  );
}
