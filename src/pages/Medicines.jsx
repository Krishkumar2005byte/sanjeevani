/**
 * Medicines.jsx - Editorial Medicine Schedule & Drug Interaction Safety
 * Owner: Dev 3 & Member 4 (UI)
 */

import React, { useState, useEffect } from 'react';
import commonMedicines from '../data/medicines.json';
import {
  subscribeToPatient,
  addMedicine,
  markMedicineTaken
} from '../lib/patientService.js';
import MedicineCard from '../components/MedicineCard.jsx';
import Icon from '../components/Icons.jsx';

export default function Medicines() {
  const [patient, setPatient] = useState(null);
  const [medicineName, setMedicineName] = useState('');
  const [selectedTimes, setSelectedTimes] = useState(['Morning']);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const unsub = subscribeToPatient((data) => {
      setPatient(data);
    });
    return () => {
      if (unsub) unsub();
    };
  }, []);

  const toggleTime = (time) => {
    setSelectedTimes((prev) => {
      const next = prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time];
      return next.length ? next : [time];
    });
  };

  const handleAddMedicine = async (e) => {
    e.preventDefault();
    if (!medicineName.trim()) {
      setErrorMsg('Please enter a medicine name.');
      return;
    }

    setErrorMsg('');
    await addMedicine({
      name: medicineName.trim(),
      time: selectedTimes.join(' & ')
    });

    setMedicineName('');
  };

  const handleMarkTaken = async (index) => {
    await markMedicineTaken(index);
  };

  if (!patient) {
    return (
      <div className="page-wrap">
        <div className="loading-state">Loading medicines...</div>
      </div>
    );
  }

  const medicines = patient.medicines || [];
  const warnings = patient.warnings || [];

  return (
    <div className="page-wrap">
      <h1 className="page-h1">Medicines</h1>
      <p className="sub">Daily schedule with automatic safety checks.</p>

      <div className="card">
        <form onSubmit={handleAddMedicine} className="add-row">
          <input
            type="text"
            list="figma-med-list"
            placeholder="Medicine name, e.g. Aspirin, Warfarin"
            aria-label="Medicine name"
            value={medicineName}
            onChange={(e) => setMedicineName(e.target.value)}
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

          <button type="submit" className="btn">
            Add
          </button>
        </form>

        {errorMsg && (
          <p style={{ margin: '10px 0 0', fontSize: '13px', color: 'var(--red-pill-ink)' }}>
            {errorMsg}
          </p>
        )}
      </div>

      {warnings.length > 0 && (
        <div className="alert-card" role="alert">
          <span className="badge">
            <Icon name="alert" />
          </span>
          <div>
            <b>Possible drug interaction</b>
            {warnings.map((w, idx) => (
              <p key={idx}>{w}</p>
            ))}
          </div>
        </div>
      )}

      <div className="meds-grid">
        {medicines.length > 0 ? (
          medicines.map((med, index) => (
            <MedicineCard
              key={index}
              medicine={med}
              index={index}
              onMarkTaken={handleMarkTaken}
            />
          ))
        ) : (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
            <p className="empty-subtext" style={{ margin: 0 }}>
              No medicines logged yet. Add one above.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
