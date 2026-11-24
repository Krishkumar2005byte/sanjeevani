/**
 * Medicines.jsx - Medicine Tracker & Drug Interaction Safety (Figma Design)
 * Owner: Dev 3 (Medicines & Interactions)
 * 
 * Modeled after Figma Screen 5:
 * - "Medicines" header
 * - Input row: Text input + dosage time buttons (Morning, Afternoon, Night) + Add button
 * - Medicine cards list with "✓ Taken" or green "Mark as Taken" button
 * - Red Dangerous combination warning box
 */

import React, { useState, useEffect } from 'react';
import commonMedicines from '../data/medicines.json';
import {
  subscribeToPatient,
  addMedicine,
  markMedicineTaken
} from '../lib/patientService.js';
import MedicineCard from '../components/MedicineCard.jsx';

export default function Medicines() {
  const [patient, setPatient] = useState(null);
  const [medicineName, setMedicineName] = useState('');
  const [medicineTime, setMedicineTime] = useState('Morning');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const unsub = subscribeToPatient((data) => {
      setPatient(data);
    });
    return () => {
      if (unsub) unsub();
    };
  }, []);

  const handleAddMedicine = async (e) => {
    e.preventDefault();
    if (!medicineName.trim()) {
      setErrorMsg('Please enter a medicine name.');
      return;
    }

    setErrorMsg('');
    await addMedicine({
      name: medicineName.trim(),
      time: medicineTime
    });

    setMedicineName('');
  };

  const handleMarkTaken = async (index) => {
    await markMedicineTaken(index);
  };

  if (!patient) {
    return <div className="page-container"><div className="loading-state">Loading medicines...</div></div>;
  }

  const medicines = patient.medicines || [];
  const warnings = patient.warnings || [];

  return (
    <div className="page-container figma-medicines-page">
      <div className="figma-page-header">
        <h2 className="figma-section-title">Medicines</h2>
        <p className="figma-page-sub">
          Daily medication schedule and automated contraindication safety engine.
        </p>
      </div>

      {/* Add Medicine Inline Form matching Figma */}
      <div className="figma-add-med-card">
        <form onSubmit={handleAddMedicine} className="figma-med-inline-form">
          <div className="med-input-wrapper">
            <input
              type="text"
              list="figma-med-list"
              className="figma-med-input"
              placeholder="Medicine name (e.g. Aspirin, Warfarin, Metformin)"
              value={medicineName}
              onChange={(e) => setMedicineName(e.target.value)}
            />
            <datalist id="figma-med-list">
              {commonMedicines.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </div>

          {/* Timing Buttons (Morning / Afternoon / Night) matching Figma */}
          <div className="med-time-pills-group">
            {['Morning', 'Afternoon', 'Night'].map((time) => (
              <button
                key={time}
                type="button"
                className={`time-pill-btn ${medicineTime === time ? 'active' : ''}`}
                onClick={() => setMedicineTime(time)}
              >
                {time}
              </button>
            ))}
          </div>

          <button type="submit" className="btn-figma-add-med">
            Add
          </button>
        </form>

        {errorMsg && <p className="figma-form-error">{errorMsg}</p>}
      </div>

      {/* Scheduled Medicines Grid matching Figma */}
      <div className="figma-medicines-list-grid">
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
          <div className="figma-empty-card">
            <p>No medicines logged yet. Add one above.</p>
          </div>
        )}
      </div>

      {/* Red Dangerous Combination Alert Box matching Figma Screen 5 */}
      {warnings.length > 0 && (
        <div className="figma-dangerous-combo-card" role="alert">
          <div className="danger-combo-header">
            <span className="danger-triangle-icon">⚠️</span>
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
              onClick={() => alert('Clinical Advisory: Please consult with your physician before administering these medications concurrently.')}
            >
              Details / Advisory
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
