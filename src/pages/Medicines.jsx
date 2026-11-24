/**
 * Medicines.jsx - Duplicate-Free Medicine Schedule with Adherence Progress,
 * Live Pre-Add Interaction Preview, Filters & Safe Removal
 * Owner: Dev 3 & Member 4 (UI)
 */

import React, { useState, useEffect, useMemo } from 'react';
import commonMedicines from '../data/medicines.json';
import {
  subscribeToPatient,
  addMedicine,
  toggleMedicineTaken,
  removeMedicine,
  normalizeMedicineName
} from '../lib/patientService.js';
import { checkInteractions } from '../lib/interactions.js';
import MedicineCard from '../components/MedicineCard.jsx';
import Icon from '../components/Icons.jsx';

export default function Medicines() {
  const [patient, setPatient] = useState(null);
  const [medicineName, setMedicineName] = useState('');
  const [selectedTimes, setSelectedTimes] = useState(['Morning']);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'taken'
  const [timeFilter, setTimeFilter] = useState('All'); // 'All' | 'Morning' | 'Afternoon' | 'Night'
  const [feedback, setFeedback] = useState(null); // { type: 'error' | 'success', text: string }

  useEffect(() => {
    const unsub = subscribeToPatient((data) => {
      setPatient(data);
    });
    return () => {
      if (unsub) unsub();
    };
  }, []);

  const medicines = useMemo(() => patient?.medicines || [], [patient]);
  const warnings = useMemo(() => patient?.warnings || [], [patient]);

  // Live duplicate check while typing
  const duplicateMatch = useMemo(() => {
    const norm = normalizeMedicineName(medicineName);
    if (!norm) return null;
    return medicines.find((m) => normalizeMedicineName(m.name) === norm) || null;
  }, [medicineName, medicines]);

  // Live pre-add drug interaction preview before submitting
  const preAddConflicts = useMemo(() => {
    const trimmed = medicineName.trim();
    if (!trimmed || duplicateMatch) return [];
    const currentSet = new Set(warnings);
    const simulated = checkInteractions([...medicines, { name: trimmed }]);
    return simulated.filter((w) => !currentSet.has(w));
  }, [medicineName, medicines, warnings, duplicateMatch]);

  // Determine which existing medicine names are involved in active warnings
  const conflictingDrugNames = useMemo(() => {
    const lowerWarnings = warnings.map((w) => w.toLowerCase());
    return new Set(
      medicines
        .map((m) => normalizeMedicineName(m.name))
        .filter((norm) => norm && lowerWarnings.some((w) => w.includes(norm)))
    );
  }, [medicines, warnings]);

  const toggleTime = (time) => {
    setSelectedTimes((prev) => {
      const next = prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time];
      return next.length ? next : [time];
    });
  };

  const handleAddMedicine = async (e) => {
    e.preventDefault();
    const cleaned = medicineName.trim();
    if (!cleaned) {
      setFeedback({ type: 'error', text: 'Please enter a medicine name.' });
      return;
    }

    if (duplicateMatch) {
      setFeedback({
        type: 'error',
        text: `“${duplicateMatch.name}” is already in the schedule (${duplicateMatch.time}). Duplicate entries are not allowed.`
      });
      return;
    }

    const result = await addMedicine({
      name: cleaned,
      time: selectedTimes.join(' & ')
    });

    if (result?.duplicate) {
      setFeedback({
        type: 'error',
        text: `“${result.existingMedicine?.name || cleaned}” is already scheduled. Duplicate entries are not allowed.`
      });
      return;
    }

    setMedicineName('');
    setFeedback({
      type: 'success',
      text: `Added ${cleaned} (${selectedTimes.join(' & ')}) to the daily schedule.`
    });
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleToggleTaken = async (index) => {
    await toggleMedicineTaken(index);
  };

  const handleRemove = async (index) => {
    const target = medicines[index];
    await removeMedicine(index);
    if (target) {
      setFeedback({ type: 'success', text: `Removed ${target.name} from the schedule.` });
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  if (!patient) {
    return (
      <div className="page-wrap">
        <div className="loading-state">Loading medicines...</div>
      </div>
    );
  }

  const totalCount = medicines.length;
  const takenCount = medicines.filter((m) => m.taken).length;
  const pendingCount = totalCount - takenCount;
  const adherencePct = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;

  const filteredMedicines = medicines
    .map((med, originalIndex) => ({ med, originalIndex }))
    .filter(({ med }) => {
      if (statusFilter === 'taken' && !med.taken) return false;
      if (statusFilter === 'pending' && med.taken) return false;
      if (timeFilter !== 'All' && !(med.time || '').toLowerCase().includes(timeFilter.toLowerCase())) {
        return false;
      }
      return true;
    });

  return (
    <div className="page-wrap">
      <div className="doc-header-bar">
        <div>
          <h1 className="page-h1">Medicines</h1>
          <p className="sub" style={{ marginBottom: 0 }}>
            Daily medication schedule for {patient.name} with duplicate protection &amp; live interaction safety.
          </p>
        </div>
        <span className={`sev ${warnings.length > 0 ? 'high' : 'low'}`}>
          <i aria-hidden="true" />
          {warnings.length > 0
            ? `${warnings.length} SAFETY ALERT${warnings.length > 1 ? 'S' : ''}`
            : 'NO CONFLICTS'}
        </span>
      </div>

      {/* Adherence Overview Bar */}
      <div className="med-stats-grid">
        <div className="card med-progress-card">
          <div className="sevhead">
            <span className="sevhead-label">TODAY&apos;S ADHERENCE</span>
            <strong style={{ fontSize: '15px', color: 'var(--brand)' }}>
              {takenCount} of {totalCount} taken ({adherencePct}%)
            </strong>
          </div>
          <div className="progress-track" aria-label={`Medication adherence ${adherencePct}%`}>
            <div className="progress-fill" style={{ width: `${adherencePct}%` }} />
          </div>
        </div>

        <div className="card med-stat-mini">
          <span className="sevhead-label">PENDING</span>
          <strong className="stat-num" style={{ color: pendingCount > 0 ? 'var(--amb-ink)' : 'var(--ok)' }}>
            {pendingCount}
          </strong>
        </div>

        <div className="card med-stat-mini">
          <span className="sevhead-label">COMPLETED</span>
          <strong className="stat-num" style={{ color: 'var(--ok)' }}>
            {takenCount}
          </strong>
        </div>
      </div>

      {/* Add Medicine Card with Duplicate Protection & Live Interaction Preview */}
      <div className="card mt">
        <form onSubmit={handleAddMedicine} className="add-row">
          <input
            type="text"
            list="figma-med-list"
            placeholder="Add medicine, e.g. Aspirin, Warfarin, Paracetamol"
            aria-label="Medicine name"
            value={medicineName}
            onChange={(e) => {
              setMedicineName(e.target.value);
              if (feedback) setFeedback(null);
            }}
          />
          <datalist id="figma-med-list">
            {commonMedicines.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>

          <div className="seg" role="group" aria-label="Time of day">
            {['Morning', 'Afternoon', 'Night'].map((time) => (
              <button
                key={time}
                type="button"
                className={selectedTimes.includes(time) ? 'on' : ''}
                aria-pressed={selectedTimes.includes(time)}
                onClick={() => toggleTime(time)}
              >
                {time}
              </button>
            ))}
          </div>

          <button type="submit" className="btn" disabled={Boolean(duplicateMatch)}>
            Add
          </button>
        </form>

        {/* Live Duplicate Warning */}
        {duplicateMatch && (
          <div className="inline-notice warn" role="alert">
            <Icon name="alert" />
            <span>
              <strong>Already scheduled:</strong> {duplicateMatch.name} ({duplicateMatch.time}) is already on the list. Duplicate entries are blocked.
            </span>
          </div>
        )}

        {/* Live Pre-Add Contraindication Warning */}
        {preAddConflicts.length > 0 && (
          <div className="alert-card" role="alert" style={{ marginTop: '12px' }}>
            <span className="badge">
              <Icon name="alert" />
            </span>
            <div>
              <b>Interaction warning before adding “{medicineName.trim()}”</b>
              {preAddConflicts.map((w, idx) => (
                <p key={idx}>{w}</p>
              ))}
            </div>
          </div>
        )}

        {/* Submission Feedback */}
        {feedback && !duplicateMatch && (
          <div className={`inline-notice ${feedback.type === 'error' ? 'warn' : 'ok'}`} role="status">
            <Icon name={feedback.type === 'error' ? 'alert' : 'check'} />
            <span>{feedback.text}</span>
          </div>
        )}
      </div>

      {/* Active Drug Interaction Alert */}
      {warnings.length > 0 && (
        <div className="alert-card" role="alert">
          <span className="badge">
            <Icon name="alert" />
          </span>
          <div>
            <b>Active drug interaction detected</b>
            {warnings.map((w, idx) => (
              <p key={idx}>{w}</p>
            ))}
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="med-filter-bar mt">
        <div className="seg" role="group" aria-label="Filter by status">
          {[
            { id: 'all', label: `All (${totalCount})` },
            { id: 'pending', label: `Pending (${pendingCount})` },
            { id: 'taken', label: `Taken (${takenCount})` }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={statusFilter === tab.id ? 'on' : ''}
              onClick={() => setStatusFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="chips">
          {['All', 'Morning', 'Afternoon', 'Night'].map((slot) => (
            <button
              key={slot}
              type="button"
              className={`chip ${timeFilter === slot ? 'tag-active' : ''}`}
              onClick={() => setTimeFilter(slot)}
            >
              {slot === 'All' ? 'All times' : slot}
            </button>
          ))}
        </div>
      </div>

      {/* Medicines Grid */}
      <div className="meds-grid">
        {filteredMedicines.length > 0 ? (
          filteredMedicines.map(({ med, originalIndex }) => (
            <MedicineCard
              key={`${normalizeMedicineName(med.name)}-${originalIndex}`}
              medicine={med}
              index={originalIndex}
              hasConflict={conflictingDrugNames.has(normalizeMedicineName(med.name))}
              onToggleTaken={handleToggleTaken}
              onRemove={handleRemove}
            />
          ))
        ) : (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
            <p className="empty-subtext" style={{ margin: 0 }}>
              {totalCount === 0
                ? 'No medicines logged yet. Add one above.'
                : 'No medicines match the selected filter.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
