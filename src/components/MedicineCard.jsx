/**
 * MedicineCard.jsx - Patient Medicine Item Card (Figma Design)
 * Owner: Dev 3 (Medicines & Interactions)
 * 
 * Matches Figma layout:
 * - Medicine name with dosage time
 * - Pill icon and status pill
 * - Green "Mark as Taken" button
 */

import React from 'react';

export default function MedicineCard({ medicine, index, onMarkTaken }) {
  return (
    <div className={`figma-medicine-card ${medicine.taken ? 'taken' : 'pending'}`}>
      <div className="med-card-info">
        <span className="med-card-icon">💊</span>
        <div className="med-card-labels">
          <span className="med-card-title">{medicine.name}</span>
          <span className="med-card-timing">{medicine.time}</span>
        </div>
      </div>

      <div className="med-card-actions">
        {medicine.taken ? (
          <span className="status-taken-pill">✓ Taken</span>
        ) : (
          <button
            type="button"
            className="btn-mark-taken-green"
            onClick={() => onMarkTaken(index)}
          >
            Mark as Taken
          </button>
        )}
      </div>
    </div>
  );
}
