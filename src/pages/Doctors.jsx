/**
 * Doctors.jsx - Doctor Clinical Consultation Portal & Directory
 * Owner: Dev 2 (Doctor Clinical Workspace & Telemedicine)
 * 
 * Features:
 * 1. Doctor Clinical Workspace:
 *    - Active patient review (Ramesh, 62, symptoms, urgency, emergency state)
 *    - Live Teleconsultation Video Room & Call Controls
 *    - Digital Prescription Pad (Rx) with auto contraindication checking from 88+ drugs
 *    - Clinical Notes & Diagnostic Impressions editor (saved to patient record)
 *    - Patient medication adherence history
 * 2. Doctor Directory & 28-Language Roster tab
 */

import React, { useState, useEffect, useMemo } from 'react';
import doctorsData from '../data/doctors.json';
import languages from '../data/languages.json';
import commonMedicines from '../data/medicines.json';
import {
  subscribeToPatient,
  addMedicine,
  saveDoctorNotes,
  bookAppointment
} from '../lib/patientService.js';
import { checkInteractions } from '../lib/interactions.js';
import DoctorCard from '../components/DoctorCard.jsx';
import UrgencyBadge from '../components/UrgencyBadge.jsx';

export default function Doctors() {
  const [activeTab, setActiveTab] = useState('workspace'); // 'workspace' | 'directory'
  const [patient, setPatient] = useState(null);

  // Directory filters
  const [selectedLanguage, setSelectedLanguage] = useState('All');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [bookingLoading, setBookingLoading] = useState(false);

  // Doctor Clinical Workspace Form States
  const [newMedName, setNewMedName] = useState('');
  const [newMedTime, setNewMedTime] = useState('Morning');
  const [newMedInstructions, setNewMedInstructions] = useState('');
  const [rxSuccessMsg, setRxSuccessMsg] = useState('');

  // Doctor Clinical Notes State
  const [doctorNotesInput, setDoctorNotesInput] = useState('');
  const [notesSavedMsg, setNotesSavedMsg] = useState('');

  // Teleconsultation Call Simulator State
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  useEffect(() => {
    let initialized = false;
    const unsub = subscribeToPatient((data) => {
      setPatient(data);
      if (!initialized && data?.doctorNotes) {
        setDoctorNotesInput(data.doctorNotes);
        initialized = true;
      }
    });

    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Live drug contraindication check derived dynamically as doctor types
  const rxWarning = useMemo(() => {
    if (!newMedName.trim() || !patient?.medicines) {
      return '';
    }
    const testList = [...(patient.medicines || []), { name: newMedName.trim() }];
    const warnings = checkInteractions(testList);
    return warnings.length > 0 ? warnings[0] : '';
  }, [newMedName, patient]);

  // Handle Prescribing Medicine
  const handlePrescribeMedicine = async (e) => {
    e.preventDefault();
    if (!newMedName.trim()) return;

    await addMedicine({
      name: `${newMedName.trim()}${newMedInstructions ? ` (${newMedInstructions})` : ''}`,
      time: newMedTime
    });

    setRxSuccessMsg(`✓ Successfully prescribed ${newMedName.trim()} to ${patient?.name || 'patient'}'s active regimen.`);
    setNewMedName('');
    setNewMedInstructions('');
    setTimeout(() => setRxSuccessMsg(''), 4000);
  };

  // Handle Saving Doctor Notes
  const handleSaveNotes = async () => {
    await saveDoctorNotes(doctorNotesInput);
    setNotesSavedMsg('✓ Clinical diagnosis and notes saved to patient record.');
    setTimeout(() => setNotesSavedMsg(''), 3500);
  };

  // Handle Directory Doctor Booking
  const handleBook = async (doctor) => {
    setBookingLoading(true);
    await bookAppointment(doctor);
    setBookingLoading(false);
  };

  if (!patient) {
    return (
      <div className="page-container">
        <div className="loading-state">Connecting to clinical data stream...</div>
      </div>
    );
  }

  const symptoms = patient.symptoms || [];
  const medicines = patient.medicines || [];
  const warnings = patient.warnings || [];
  const appointment = patient.appointment;
  const isEmergency = Boolean(patient.emergency);

  const specialties = [
    'All',
    'Cardiologist',
    'General Physician',
    'Neurologist',
    'Pulmonologist',
    'Gastroenterologist',
    'Emergency Medicine'
  ];

  const filteredDoctors = doctorsData.filter((doc) => {
    const matchesLang =
      selectedLanguage === 'All' ||
      doc.languages.some((l) => l.toLowerCase() === selectedLanguage.toLowerCase());
    const matchesSpec =
      selectedSpecialty === 'All' ||
      doc.specialty.toLowerCase() === selectedSpecialty.toLowerCase();
    return matchesLang && matchesSpec;
  });

  return (
    <div className="page-container figma-doctors-page">
      {/* Top Clinical Portal Header */}
      <div className="doc-portal-header">
        <div className="doc-portal-badge-row">
          <div className="doc-doctor-badge">
            <span className="doc-avatar-icon">👨‍⚕️</span>
            <div>
              <h2 className="doc-doctor-title">Doctor Consultation Portal</h2>
              <span className="doc-doctor-meta">
                Dr. Anjali Sharma, MD (Cardiologist) · Reg #MED-784920 · Sanjeevani Tele-Clinic
              </span>
            </div>
          </div>
          <div className="doc-status-pill">
            <span className="status-indicator-dot">●</span> Online & Ready for Triage
          </div>
        </div>

        {/* Portal Mode Tabs: Clinical Workspace vs Directory */}
        <div className="doc-tabs-bar">
          <button
            type="button"
            className={`doc-tab-btn ${activeTab === 'workspace' ? 'active' : ''}`}
            onClick={() => setActiveTab('workspace')}
          >
            🩺 Clinical Workspace (Active Patient: {patient.name})
          </button>
          <button
            type="button"
            className={`doc-tab-btn ${activeTab === 'directory' ? 'active' : ''}`}
            onClick={() => setActiveTab('directory')}
          >
            📋 Doctor Directory & 28-Language Roster
          </button>
        </div>
      </div>

      {/* ====================================================================
          TAB 1: DOCTOR CLINICAL WORKSPACE
          ==================================================================== */}
      {activeTab === 'workspace' && (
        <div className="doc-workspace-container">
          {/* Emergency Alert Banner if Emergency triggered */}
          {isEmergency && (
            <div className="figma-caregiver-alert-bar emergency-flashing" role="alert">
              <div className="alert-bar-left">
                <span className="alert-siren">🚨</span>
                <span className="alert-text">
                  <strong>CRITICAL EMERGENCY:</strong> Patient {patient.name} pressed Emergency Help! Immediate clinical intervention required.
                </span>
              </div>
              <button
                type="button"
                className="btn-respond-now"
                onClick={() => setIsCallActive(true)}
              >
                Join Emergency Call Now →
              </button>
            </div>
          )}

          {/* Patient Overview & Teleconsultation Call Card */}
          <div className="doc-patient-summary-card">
            <div className="doc-summary-header">
              <div>
                <span className="card-tiny-title">ACTIVE CONSULTATION CASE</span>
                <h3 className="doc-patient-name">
                  {patient.name}, {patient.age} yrs · Male
                </h3>
                <p className="doc-patient-lang">
                  Primary Language: <strong>{patient.language}</strong> · Location: Home Care (ICU Step-down)
                </p>
              </div>
              <div className="doc-urgency-box">
                <span className="urgency-label-caption">Current Triage Urgency:</span>
                <UrgencyBadge urgency={patient.urgency} />
              </div>
            </div>

            {/* Reported Symptoms */}
            <div className="doc-symptoms-review">
              <strong className="review-label">Reported Symptoms:</strong>
              <div className="symptoms-chips-row">
                {symptoms.length > 0 ? (
                  symptoms.map((s, idx) => (
                    <span key={idx} className="figma-pill-chip">
                      ● {s}
                    </span>
                  ))
                ) : (
                  <span className="empty-subtext">No symptoms currently reported</span>
                )}
              </div>
            </div>

            {/* AI Triage Summary */}
            <div className="doc-ai-assessment-box">
              <strong>AI Triage Assessment:</strong> "{patient.aiSummary || 'Patient resting. Vital stability maintained.'}"
            </div>

            {/* Teleconsultation Video Console */}
            <div className="doc-video-console-card">
              <div className="video-console-top">
                <div className="video-status-text">
                  <span className="video-camera-icon">📹</span>
                  <div>
                    <strong>Encrypted Teleconsultation Room</strong>
                    <p className="room-link-text">
                      Room URL: {appointment?.videoLink || `https://meet.sanjeevani.demo/consult-${(patient?.name || 'patient').toLowerCase().replace(/\s+/g, '-')}`}
                    </p>
                  </div>
                </div>
                {!isCallActive ? (
                  <button
                    type="button"
                    className="btn-start-video-call"
                    onClick={() => setIsCallActive(true)}
                  >
                    🎥 Start Video Consultation with {patient.name}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-end-video-call"
                    onClick={() => setIsCallActive(false)}
                  >
                    ⏹ End Consultation
                  </button>
                )}
              </div>

              {/* In-Call Video Meeting Simulation Screen */}
              {isCallActive && (
                <div className="video-call-screen-sim">
                  <div className="video-feed-box patient-feed">
                    <span className="feed-avatar">👴</span>
                    <span className="feed-name-tag">Patient: {patient.name} ({patient.language})</span>
                    <span className="feed-live-pill">● LIVE</span>
                  </div>
                  <div className="video-feed-box doctor-feed">
                    <span className="feed-avatar">👩‍⚕️</span>
                    <span className="feed-name-tag">Dr. Anjali Sharma (You)</span>
                    {isMuted && <span className="feed-mute-pill">🔇 Muted</span>}
                  </div>

                  {/* Call Controls Bar */}
                  <div className="video-controls-bar">
                    <button
                      type="button"
                      className={`control-btn ${isMuted ? 'active-red' : ''}`}
                      onClick={() => setIsMuted(!isMuted)}
                    >
                      {isMuted ? '🔇 Unmute' : '🎙️ Mute'}
                    </button>
                    <button
                      type="button"
                      className={`control-btn ${isCameraOff ? 'active-red' : ''}`}
                      onClick={() => setIsCameraOff(!isCameraOff)}
                    >
                      {isCameraOff ? '📷 Enable Camera' : '🚫 Disable Camera'}
                    </button>
                    <button
                      type="button"
                      className="control-btn hangup-btn"
                      onClick={() => setIsCallActive(false)}
                    >
                      📞 Leave Meeting
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Two-Column Clinical Tools: Rx Pad on Left, Notes & History on Right */}
          <div className="doc-tools-grid">
            {/* Column 1: Doctor's Digital Prescription Pad (Rx) */}
            <div className="doc-rx-pad-card">
              <div className="rx-card-header">
                <span className="rx-icon">℞</span>
                <div>
                  <h4>Doctor's Digital Prescription Pad</h4>
                  <p className="rx-sub">Prescribe medications with automated contraindication safety.</p>
                </div>
              </div>

              {rxSuccessMsg && <div className="rx-success-alert">{rxSuccessMsg}</div>}

              {/* Real-time Contraindication Warning */}
              {rxWarning && (
                <div className="rx-contraindication-alert" role="alert">
                  <span className="contra-icon">🛑</span>
                  <div>
                    <strong>CONTRAINDICATION DETECTED:</strong>
                    <p>{rxWarning}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handlePrescribeMedicine} className="doc-rx-form">
                <div className="doc-form-group">
                  <label htmlFor="rx-med-name">Medicine Name (select from 88+ drugs):</label>
                  <input
                    id="rx-med-name"
                    type="text"
                    list="doc-rx-med-list"
                    className="doc-input-text"
                    placeholder="e.g. Aspirin, Warfarin, Metoprolol, Pantoprazole..."
                    value={newMedName}
                    onChange={(e) => setNewMedName(e.target.value)}
                    required
                  />
                  <datalist id="doc-rx-med-list">
                    {commonMedicines.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>

                <div className="doc-form-row">
                  <div className="doc-form-group flex-1">
                    <label htmlFor="rx-med-time">Timing:</label>
                    <select
                      id="rx-med-time"
                      className="doc-select"
                      value={newMedTime}
                      onChange={(e) => setNewMedTime(e.target.value)}
                    >
                      <option value="Morning">🌅 Morning (सुबह)</option>
                      <option value="Afternoon">☀️ Afternoon (दोपहर)</option>
                      <option value="Night">🌙 Night (रात)</option>
                      <option value="Morning & Night">🌅+🌙 Twice Daily (1-0-1)</option>
                    </select>
                  </div>

                  <div className="doc-form-group flex-2">
                    <label htmlFor="rx-instructions">Clinical Instructions:</label>
                    <input
                      id="rx-instructions"
                      type="text"
                      className="doc-input-text"
                      placeholder="e.g. 1 tablet after meals, 5 days"
                      value={newMedInstructions}
                      onChange={(e) => setNewMedInstructions(e.target.value)}
                    />
                  </div>
                </div>

                <button type="submit" className="btn-sign-prescription">
                  ✓ Sign & Send Prescription to Caregiver
                </button>
              </form>

              {/* Active Warnings Notice */}
              {warnings.length > 0 && (
                <div className="active-patient-warnings-box">
                  <strong className="warn-title">⚠️ Patient's Current Regimen Conflicts:</strong>
                  <ul className="conflict-list">
                    {warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Column 2: Clinical Diagnosis Notes & Regimen Review */}
            <div className="doc-notes-history-col">
              {/* Doctor Notes Box */}
              <div className="doc-clinical-notes-card">
                <div className="notes-card-header">
                  <h4>Clinical Diagnosis & Doctor's Notes</h4>
                  {notesSavedMsg && <span className="notes-saved-pill">{notesSavedMsg}</span>}
                </div>
                <textarea
                  className="doc-notes-textarea"
                  rows={5}
                  placeholder="Record diagnostic impressions, vitals observations, care advice, or referral notes for caregiver and patient..."
                  value={doctorNotesInput}
                  onChange={(e) => setDoctorNotesInput(e.target.value)}
                />
                <div className="notes-action-row">
                  <button
                    type="button"
                    className="btn-save-notes"
                    onClick={handleSaveNotes}
                  >
                    💾 Save Clinical Observations
                  </button>
                </div>
              </div>

              {/* Patient's Existing Medication Schedule */}
              <div className="doc-patient-meds-card">
                <div className="patient-meds-header">
                  <h4>Current Patient Medications ({medicines.length})</h4>
                  <span className="adherence-label">Adherence Review</span>
                </div>
                <div className="doc-meds-list">
                  {medicines.length > 0 ? (
                    medicines.map((m, i) => (
                      <div key={i} className="doc-med-item">
                        <div className="med-info">
                          <span className="med-dot">💊</span>
                          <strong>{m.name}</strong>
                          <span className="med-time-tag">({m.time})</span>
                        </div>
                        {m.taken ? (
                          <span className="figma-status-taken">✓ Taken</span>
                        ) : (
                          <span className="figma-status-pending">Pending</span>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="empty-subtext">No medications currently scheduled.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 2: DOCTOR DIRECTORY & 28-LANGUAGE ROSTER
          ==================================================================== */}
      {activeTab === 'directory' && (
        <div className="doc-directory-container">
          <div className="figma-page-header">
            <h3 className="figma-section-title">28-Language Doctor Directory</h3>
            <p className="figma-page-sub">
              Browse language-matched physicians and schedule consultations.
            </p>
          </div>

          {/* Filter Dropdowns Bar matching Figma */}
          <div className="figma-filters-bar">
            <div className="figma-filter-item">
              <label htmlFor="doc-filter-lang">Language:</label>
              <select
                id="doc-filter-lang"
                className="figma-select"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
              >
                <option value="All">🌐 All Languages (28)</option>
                {languages.map((l) => (
                  <option key={l.code} value={l.name}>
                    {l.nativeName} ({l.name})
                  </option>
                ))}
              </select>
            </div>

            <div className="figma-filter-item">
              <label htmlFor="doc-filter-spec">Specialty:</label>
              <select
                id="doc-filter-spec"
                className="figma-select"
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
              >
                {specialties.map((s) => (
                  <option key={s} value={s}>
                    {s === 'All' ? '🩺 All Specialties' : s}
                  </option>
                ))}
              </select>
            </div>

            <span className="figma-filter-count">
              Showing {filteredDoctors.length} doctors
            </span>
          </div>

          {/* Doctor Cards Grid matching Figma */}
          <div className="figma-doctors-grid">
            {filteredDoctors.length > 0 ? (
              filteredDoctors.map((doc) => (
                <DoctorCard
                  key={doc.id}
                  doctor={doc}
                  isBooked={appointment?.doctorId === doc.id}
                  onBook={handleBook}
                  bookingLoading={bookingLoading}
                />
              ))
            ) : (
              <div className="figma-empty-card">
                <p>No doctors found matching "{selectedLanguage}" in "{selectedSpecialty}".</p>
                <button
                  className="btn-doc-book"
                  onClick={() => {
                    setSelectedLanguage('All');
                    setSelectedSpecialty('All');
                  }}
                >
                  Show all doctors
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
