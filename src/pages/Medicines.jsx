/**
 * Medicines.jsx - Medicine Tracker, Daily Adherence & History (Phase 2)
 * Owner: Dev 3 (Medicines & Daily Tracking)
 *
 * Phase 2 features:
 * - Extended medicine form: name, dosage, frequency, scheduled times, optional instructions
 * - Date-based daily tracking (YYYY-MM-DD local date) with per-dose Mark Taken & Undo
 * - Stable medicine IDs (no index-based tracking or deletion)
 * - Daily adherence overview (scheduled, taken, remaining, percentage)
 * - Expandable medicine dose history separate from today's active tracking
 * - Inline notifications (no blocking alert/confirm dialogs)
 */

import React, { useState, useEffect } from 'react';
import commonMedicines from '../data/medicines.json';
import {
  subscribeToPatient,
  addMedicine,
  recordDoseTaken,
  undoDose,
  removeMedicine
} from '../lib/patientService.js';
import {
  SCHEDULE_TIME_OPTIONS,
  FREQUENCY_OPTIONS,
  getLocalDateString,
  getMedicineId,
  calculateDailyAdherence,
  getHistoricalDoseLogs
} from '../lib/medicineUtils.js';
import MedicineCard from '../components/MedicineCard.jsx';

const FREQUENCY_DEFAULT_TIMES = {
  'Once daily': ['Morning'],
  'Twice daily': ['Morning', 'Night'],
  'Three times daily': ['Morning', 'Afternoon', 'Night']
};

export default function Medicines() {
  const [patient, setPatient] = useState(null);

  // Add-medicine form state
  const [medicineName, setMedicineName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('Once daily');
  const [selectedTimes, setSelectedTimes] = useState(['Morning']);
  const [instructions, setInstructions] = useState('');

  // UI feedback & async guard state
  const [errorMsg, setErrorMsg] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [showAdvisory, setShowAdvisory] = useState(false);

  // History view state
  const [showHistory, setShowHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('past'); // 'past' | 'all'

  useEffect(() => {
    const unsub = subscribeToPatient((data) => {
      setPatient(data);
    });
    return () => {
      if (unsub) unsub();
    };
  }, []);

  const handleFrequencyChange = (nextFreq) => {
    setFrequency(nextFreq);
    if (FREQUENCY_DEFAULT_TIMES[nextFreq]) {
      setSelectedTimes(FREQUENCY_DEFAULT_TIMES[nextFreq]);
    }
  };

  const toggleScheduledTime = (time) => {
    setSelectedTimes((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
    );
  };

  const handleAddMedicine = async (e) => {
    e.preventDefault();
    const trimmedName = medicineName.trim();
    const trimmedDosage = dosage.trim();

    if (!trimmedName) {
      setErrorMsg('Please enter a medicine name.');
      setStatusMsg('');
      return;
    }

    if (!trimmedDosage) {
      setErrorMsg('Please enter a dosage (e.g., 1 tablet, 500 mg, 5 ml).');
      setStatusMsg('');
      return;
    }

    if (selectedTimes.length === 0) {
      setErrorMsg('Please select at least one scheduled time.');
      setStatusMsg('');
      return;
    }

    const existing = (patient?.medicines || []).map((m) => m.name.trim().toLowerCase());
    if (existing.includes(trimmedName.toLowerCase())) {
      setErrorMsg(`"${trimmedName}" is already in the schedule.`);
      setStatusMsg('');
      return;
    }

    // Preserve canonical Morning -> Afternoon -> Night ordering
    const orderedTimes = SCHEDULE_TIME_OPTIONS.filter((t) => selectedTimes.includes(t));

    setErrorMsg('');
    setIsBusy(true);
    try {
      await addMedicine({
        name: trimmedName,
        dosage: trimmedDosage,
        frequency,
        times: orderedTimes,
        instructions: instructions.trim()
      });
      setMedicineName('');
      setDosage('');
      setFrequency('Once daily');
      setSelectedTimes(['Morning']);
      setInstructions('');
      setStatusMsg(`Added "${trimmedName}" to daily schedule.`);
    } finally {
      setIsBusy(false);
    }
  };

  const todayDate = getLocalDateString();

  const handleMarkDoseTaken = async (medicineId, scheduledTime) => {
    setIsBusy(true);
    setErrorMsg('');
    try {
      await recordDoseTaken({ medicineId, scheduledTime, date: todayDate });
      setStatusMsg(`Recorded ${scheduledTime} dose as taken for ${todayDate}.`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleUndoDose = async (medicineId, scheduledTime) => {
    setIsBusy(true);
    setErrorMsg('');
    try {
      await undoDose({ medicineId, scheduledTime, date: todayDate });
      setStatusMsg(`Undid ${scheduledTime} dose for ${todayDate}. History preserved.`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleRemove = async (medicineId) => {
    setIsBusy(true);
    setErrorMsg('');
    try {
      await removeMedicine(medicineId);
      setStatusMsg('Medicine removed from active schedule. Past dose history preserved.');
    } finally {
      setIsBusy(false);
    }
  };

  if (!patient) {
    return (
      <div className="page-container">
        <div className="loading-state">Loading medicines...</div>
      </div>
    );
  }

  const medicines = patient.medicines || [];
  const doseLogs = patient.doseLogs || [];
  const warnings = patient.warnings || [];

  const adherence = calculateDailyAdherence(medicines, doseLogs, todayDate);
  const historyRecords = getHistoricalDoseLogs(doseLogs, todayDate, historyFilter === 'all');

  return (
    <div className="page-container figma-medicines-page">
      <div className="figma-page-header">
        <h2 className="figma-section-title">Medicines</h2>
        <p className="figma-page-sub">
          Daily medication schedule, dose tracking for <strong>{todayDate}</strong>, and drug interaction checks.
        </p>
      </div>

      {/* Daily Adherence Overview */}
      <div className="phase2-adherence-card" aria-label="Daily medicine adherence summary">
        <div className="phase2-adherence-top">
          <div>
            <span className="card-tiny-title">TODAY&apos;S ADHERENCE ({todayDate})</span>
            <p className="phase2-adherence-sub">
              Based on scheduled doses recorded today. Untaken doses are shown as pending.
            </p>
          </div>
          <div className="phase2-adherence-percent" aria-label={`Daily adherence ${adherence.percentage} percent`}>
            {adherence.percentage}%
          </div>
        </div>

        <div className="phase2-progress-track" role="progressbar" aria-valuenow={adherence.percentage} aria-valuemin={0} aria-valuemax={100}>
          <div className="phase2-progress-fill" style={{ width: `${adherence.percentage}%` }} />
        </div>

        <div className="phase2-adherence-stats">
          <div className="adherence-stat-box">
            <span className="stat-value">{adherence.totalScheduled}</span>
            <span className="stat-label">Scheduled</span>
          </div>
          <div className="adherence-stat-box">
            <span className="stat-value stat-green">{adherence.dosesTaken}</span>
            <span className="stat-label">Taken</span>
          </div>
          <div className="adherence-stat-box">
            <span className="stat-value">{adherence.dosesRemaining}</span>
            <span className="stat-label">Remaining</span>
          </div>
        </div>
      </div>

      {/* Add Medicine Form */}
      <div className="figma-add-med-card">
        <form onSubmit={handleAddMedicine} className="phase2-med-form">
          <div className="phase2-form-grid">
            <div className="phase2-field">
              <label htmlFor="med-name-input" className="phase2-label">
                Medicine Name <span aria-hidden="true">*</span>
              </label>
              <input
                id="med-name-input"
                type="text"
                list="figma-med-list"
                className="figma-med-input"
                placeholder="e.g. Aspirin, Warfarin, Metformin"
                value={medicineName}
                onChange={(e) => setMedicineName(e.target.value)}
                disabled={isBusy}
              />
              <datalist id="figma-med-list">
                {commonMedicines.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>

            <div className="phase2-field">
              <label htmlFor="med-dosage-input" className="phase2-label">
                Dosage <span aria-hidden="true">*</span>
              </label>
              <input
                id="med-dosage-input"
                type="text"
                className="figma-med-input"
                placeholder="e.g. 1 tablet, 500 mg, 5 ml"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                disabled={isBusy}
              />
            </div>

            <div className="phase2-field">
              <label htmlFor="med-frequency-select" className="phase2-label">
                Frequency
              </label>
              <select
                id="med-frequency-select"
                className="figma-med-input"
                value={frequency}
                onChange={(e) => handleFrequencyChange(e.target.value)}
                disabled={isBusy}
              >
                {FREQUENCY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="phase2-field">
              <label htmlFor="med-instructions-input" className="phase2-label">
                Instructions (optional)
              </label>
              <input
                id="med-instructions-input"
                type="text"
                className="figma-med-input"
                placeholder="e.g. After meals, with water"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                disabled={isBusy}
              />
            </div>
          </div>

          <div className="phase2-form-footer">
            <div className="phase2-times-selector">
              <span className="phase2-label">Scheduled Times <span aria-hidden="true">*</span>:</span>
              <div className="med-time-pills-group" role="group" aria-label="Select scheduled times">
                {SCHEDULE_TIME_OPTIONS.map((time) => {
                  const active = selectedTimes.includes(time);
                  return (
                    <button
                      key={time}
                      type="button"
                      className={`time-pill-btn ${active ? 'active' : ''}`}
                      onClick={() => toggleScheduledTime(time)}
                      aria-pressed={active}
                      aria-label={`Schedule ${time}`}
                      disabled={isBusy}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="btn-figma-add-med"
              disabled={isBusy}
              aria-busy={isBusy}
            >
              {isBusy ? 'Saving…' : 'Add Medicine'}
            </button>
          </div>
        </form>

        {errorMsg && <p className="figma-form-error" role="alert">{errorMsg}</p>}
        {statusMsg && !errorMsg && (
          <p className="phase2-form-status" role="status">{statusMsg}</p>
        )}
      </div>

      {/* Scheduled Medicines Grid */}
      <div className="figma-medicines-list-grid">
        {medicines.length > 0 ? (
          medicines.map((med) => {
            const medId = getMedicineId(med);
            return (
              <MedicineCard
                key={medId}
                medicine={med}
                doseLogs={doseLogs}
                todayDate={todayDate}
                onMarkDoseTaken={handleMarkDoseTaken}
                onUndoDose={handleUndoDose}
                onRemove={handleRemove}
                isBusy={isBusy}
              />
            );
          })
        ) : (
          <div className="figma-empty-card">
            <p>No medicines logged yet. Add one above.</p>
          </div>
        )}
      </div>

      {/* Red Dangerous Combination Alert Box */}
      {warnings.length > 0 && (
        <div className="figma-dangerous-combo-card" role="alert">
          <div className="danger-combo-header">
            <span className="danger-triangle-icon" aria-hidden="true">⚠️</span>
            <h3>Dangerous combination</h3>
          </div>
          <div className="danger-combo-body">
            {warnings.map((w, idx) => (
              <p key={idx} className="danger-combo-text">
                {w}
              </p>
            ))}
          </div>
          <div className="danger-combo-action">
            <button
              type="button"
              className="btn-danger-details"
              onClick={() => setShowAdvisory((prev) => !prev)}
              aria-expanded={showAdvisory}
            >
              {showAdvisory ? 'Hide Advisory ▲' : 'Details / Advisory ▼'}
            </button>
            {showAdvisory && (
              <div className="advisory-panel" role="note">
                <p>
                  <strong>Clinical Advisory:</strong> One or more medicines in this schedule
                  have a known dangerous interaction. Please consult with your physician or
                  pharmacist before administering these medications concurrently. Do not stop
                  or change medicines without professional guidance.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Expandable Dose History Section */}
      <div className="phase2-history-section">
        <div className="phase2-history-header">
          <div>
            <h3 className="phase2-history-title">Medicine Dose History</h3>
            <p className="phase2-history-sub">
              Previous days and corrected dose records (kept separate from today&apos;s active schedule).
            </p>
          </div>
          <button
            type="button"
            className="btn-toggle-history"
            onClick={() => setShowHistory((prev) => !prev)}
            aria-expanded={showHistory}
          >
            {showHistory ? 'Hide History ▲' : `Show History (${doseLogs.length}) ▼`}
          </button>
        </div>

        {showHistory && (
          <div className="phase2-history-body">
            <div className="phase2-history-filters" role="group" aria-label="Filter dose history">
              <button
                type="button"
                className={`time-pill-btn ${historyFilter === 'past' ? 'active' : ''}`}
                onClick={() => setHistoryFilter('past')}
              >
                Previous Days &amp; Undone
              </button>
              <button
                type="button"
                className={`time-pill-btn ${historyFilter === 'all' ? 'active' : ''}`}
                onClick={() => setHistoryFilter('all')}
              >
                All Recorded Doses ({doseLogs.length})
              </button>
            </div>

            {historyRecords.length > 0 ? (
              <div className="phase2-history-list">
                {historyRecords.map((log) => (
                  <div key={log.id} className="phase2-history-row">
                    <div className="history-row-main">
                      <strong>{log.medicineName}</strong>
                      {log.dosage && <span className="med-meta-badge">{log.dosage}</span>}
                      <span className="history-time-pill">{log.scheduledTime}</span>
                    </div>
                    <div className="history-row-meta">
                      <span className="history-date">{log.date}</span>
                      <span className={`history-status-pill ${log.status === 'taken' ? 'taken' : 'undone'}`}>
                        {log.status === 'taken' ? '✓ Taken' : '↩ Undone'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-subtext">
                {historyFilter === 'past'
                  ? 'No previous-day or undone dose records yet.'
                  : 'No dose records logged yet.'}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
