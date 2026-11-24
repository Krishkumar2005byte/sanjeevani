/**
 * MedicineCard.jsx - Patient Medicine Item Card (Phase 2)
 * Owner: Dev 3 (Medicines & Daily Tracking)
 *
 * Supports:
 * - Stable medicine ID identification (fallback via getMedicineId for legacy items)
 * - Dosage, frequency, and optional instructions (all optional for legacy compatibility)
 * - Multiple scheduled doses per day with per-dose "Mark Taken" and "Undo" actions
 * - Inline confirmation for Undo and Remove actions (no blocking window.confirm/alert)
 * - Accessible aria-labels on all interactive controls
 */

import React, { useState } from 'react';
import {
  getMedicineId,
  getMedicineTimes,
  findActiveDoseLog,
  getLocalDateString
} from '../lib/medicineUtils.js';

export default function MedicineCard({
  medicine,
  doseLogs = [],
  todayDate = getLocalDateString(),
  onMarkDoseTaken,
  onUndoDose,
  onRemove,
  isBusy = false
}) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [confirmUndoTime, setConfirmUndoTime] = useState(null);

  if (!medicine) return null;

  const medId = getMedicineId(medicine);
  const scheduledTimes = getMedicineTimes(medicine);
  const takenCount = scheduledTimes.filter((t) =>
    Boolean(findActiveDoseLog(doseLogs, medId, t, todayDate))
  ).length;
  const allTaken = scheduledTimes.length > 0 && takenCount === scheduledTimes.length;

  const handleConfirmUndo = async (scheduledTime) => {
    if (onUndoDose) {
      await onUndoDose(medId, scheduledTime);
    }
    setConfirmUndoTime(null);
  };

  const handleConfirmRemove = async () => {
    if (onRemove) {
      await onRemove(medId);
    }
    setConfirmRemove(false);
  };

  return (
    <div className={`figma-medicine-card phase2-med-card ${allTaken ? 'taken' : 'pending'}`}>
      <div className="phase2-med-header">
        <div className="med-card-info">
          <span className="med-card-icon" aria-hidden="true">💊</span>
          <div className="med-card-labels">
            <span className="med-card-title">{medicine.name}</span>
            <div className="phase2-med-meta">
              {medicine.dosage && <span className="med-meta-badge">{medicine.dosage}</span>}
              {medicine.frequency && <span className="med-meta-text">{medicine.frequency}</span>}
              {!medicine.dosage && !medicine.frequency && (
                <span className="med-card-timing">{medicine.time || scheduledTimes.join(', ')}</span>
              )}
            </div>
            {medicine.instructions && (
              <p className="phase2-med-instructions">Note: {medicine.instructions}</p>
            )}
          </div>
        </div>

        <div className="phase2-header-actions">
          <span className="phase2-dose-counter" aria-label={`${takenCount} of ${scheduledTimes.length} doses taken today`}>
            {takenCount}/{scheduledTimes.length} today
          </span>

          {onRemove && !confirmRemove && (
            <button
              type="button"
              className="btn-remove-medicine"
              aria-label={`Remove ${medicine.name} from schedule`}
              onClick={() => setConfirmRemove(true)}
              disabled={isBusy}
              title="Remove medicine"
            >
              🗑
            </button>
          )}

          {onRemove && confirmRemove && (
            <div className="inline-confirm-group" role="group" aria-label={`Confirm removing ${medicine.name}`}>
              <button
                type="button"
                className="btn-inline-danger"
                onClick={handleConfirmRemove}
                disabled={isBusy}
                aria-label={`Confirm delete ${medicine.name}`}
              >
                Delete
              </button>
              <button
                type="button"
                className="btn-inline-cancel"
                onClick={() => setConfirmRemove(false)}
                disabled={isBusy}
                aria-label={`Cancel removing ${medicine.name}`}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Per-dose daily tracking rows */}
      <div className="phase2-doses-list">
        {scheduledTimes.map((scheduledTime) => {
          const activeLog = findActiveDoseLog(doseLogs, medId, scheduledTime, todayDate);
          const isTakenToday = Boolean(activeLog);
          const isConfirmingUndo = confirmUndoTime === scheduledTime;

          return (
            <div key={`${medId}_${scheduledTime}`} className="phase2-dose-row">
              <div className="phase2-dose-time">
                <span className="dose-time-label">{scheduledTime}</span>
                {isTakenToday ? (
                  <span className="status-taken-pill">✓ Taken</span>
                ) : (
                  <span className="phase2-status-pending">Pending</span>
                )}
              </div>

              <div className="phase2-dose-controls">
                {!isTakenToday && onMarkDoseTaken && (
                  <button
                    type="button"
                    className="btn-mark-taken-green"
                    aria-label={`Mark ${medicine.name} ${scheduledTime} dose as taken`}
                    onClick={() => onMarkDoseTaken(medId, scheduledTime)}
                    disabled={isBusy}
                  >
                    Mark Taken
                  </button>
                )}

                {isTakenToday && onUndoDose && !isConfirmingUndo && (
                  <button
                    type="button"
                    className="btn-undo-dose"
                    aria-label={`Undo ${medicine.name} ${scheduledTime} dose`}
                    onClick={() => setConfirmUndoTime(scheduledTime)}
                    disabled={isBusy}
                  >
                    Undo
                  </button>
                )}

                {isTakenToday && onUndoDose && isConfirmingUndo && (
                  <div className="inline-confirm-group" role="group" aria-label={`Confirm undo for ${medicine.name} ${scheduledTime}`}>
                    <button
                      type="button"
                      className="btn-inline-warning"
                      onClick={() => handleConfirmUndo(scheduledTime)}
                      disabled={isBusy}
                      aria-label={`Confirm undo ${medicine.name} ${scheduledTime}`}
                    >
                      Confirm Undo
                    </button>
                    <button
                      type="button"
                      className="btn-inline-cancel"
                      onClick={() => setConfirmUndoTime(null)}
                      disabled={isBusy}
                      aria-label={`Cancel undo ${medicine.name} ${scheduledTime}`}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
