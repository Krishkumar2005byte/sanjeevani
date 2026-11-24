/**
 * Doctors.jsx - Editorial Consultation Room & 28-Language Doctor Directory
 * Owner: Dev 2 & Member 4 (UI)
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
import Icon from '../components/Icons.jsx';

export default function Doctors() {
  const [activeTab, setActiveTab] = useState('workspace');
  const [patient, setPatient] = useState(null);

  const [selectedLanguage, setSelectedLanguage] = useState('All');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [bookingLoading, setBookingLoading] = useState(false);

  const [newMedName, setNewMedName] = useState('');
  const [newMedTime, setNewMedTime] = useState('Morning');
  const [newMedInstructions, setNewMedInstructions] = useState('');
  const [rxSuccessMsg, setRxSuccessMsg] = useState('');

  const [doctorNotesInput, setDoctorNotesInput] = useState('');
  const [notesSavedMsg, setNotesSavedMsg] = useState('');

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

  const rxWarning = useMemo(() => {
    if (!newMedName.trim() || !patient?.medicines) return '';
    const testList = [...(patient.medicines || []), { name: newMedName.trim() }];
    const warnings = checkInteractions(testList);
    return warnings.length > 0 ? warnings[0] : '';
  }, [newMedName, patient]);

  const handlePrescribeMedicine = async (e) => {
    e.preventDefault();
    if (!newMedName.trim()) return;

    await addMedicine({
      name: `${newMedName.trim()}${newMedInstructions ? ` (${newMedInstructions})` : ''}`,
      time: newMedTime
    });

    setRxSuccessMsg(`Prescribed ${newMedName.trim()} to ${patient?.name || 'patient'}.`);
    setNewMedName('');
    setNewMedInstructions('');
    setTimeout(() => setRxSuccessMsg(''), 4000);
  };

  const handleSaveNotes = async () => {
    await saveDoctorNotes(doctorNotesInput);
    setNotesSavedMsg('Saved');
    setTimeout(() => setNotesSavedMsg(''), 3000);
  };

  const handleBook = async (doctor) => {
    setBookingLoading(true);
    await bookAppointment(doctor);
    setBookingLoading(false);
  };

  if (!patient) {
    return (
      <div className="page-wrap">
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
    <div className="page-wrap">
      <div className="doc-header-bar">
        <div>
          <h1 className="page-h1">Consultation room</h1>
          <p className="sub" style={{ marginBottom: 0 }}>
            {patient.name}, {patient.age} yrs · {patient.roomNo || 'Ward 4B - Bed 12'} · Dr. Anjali Sharma, MD
          </p>
        </div>

        <div className="seg" role="tablist" aria-label="Doctor portal view">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'workspace'}
            className={activeTab === 'workspace' ? 'on' : ''}
            onClick={() => setActiveTab('workspace')}
          >
            Clinical Workspace
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'directory'}
            className={activeTab === 'directory' ? 'on' : ''}
            onClick={() => setActiveTab('directory')}
          >
            Doctor Directory
          </button>
        </div>
      </div>

      {activeTab === 'workspace' && (
        <>
          {isEmergency && (
            <div className="alert-banner emergency" role="alert">
              <div className="alert-banner-left">
                <Icon name="siren" />
                <span>
                  <strong>CRITICAL EMERGENCY:</strong> {patient.name} pressed Emergency Help.
                </span>
              </div>
              <button
                type="button"
                className="btn subtle sm"
                onClick={() => setIsCallActive(true)}
              >
                Join Emergency Call
              </button>
            </div>
          )}

          <div className="pgrid">
            {/* Left Column: Video Consultation + Diagnosis Notes */}
            <section>
              <div className="card">
                <div className="sevhead">
                  <h2 className="sec" style={{ margin: 0 }}>Video consultation</h2>
                  <UrgencyBadge urgency={patient.urgency} />
                </div>

                {!isCallActive ? (
                  <div className="cam-box">
                    <Icon name="steth" />
                  </div>
                ) : (
                  <div className="cam-box live">
                    <div className="video-feeds-pair">
                      <div className="video-tile">
                        <span className="badge b-sky">
                          <Icon name="user" />
                        </span>
                        <strong>{patient.name}</strong>
                        <small>{patient.language} · Live</small>
                      </div>
                      <div className="video-tile">
                        <span className="badge b-sage">
                          <Icon name="steth" />
                        </span>
                        <strong>Dr. Anjali Sharma</strong>
                        <small>{isMuted ? 'Muted' : isCameraOff ? 'Camera off' : 'Connected'}</small>
                      </div>
                    </div>
                  </div>
                )}

                <div className="chips">
                  {!isCallActive ? (
                    <button type="button" className="btn sm" onClick={() => setIsCallActive(true)}>
                      <Icon name="cam" />
                      Start call
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="btn ghost sm"
                        onClick={() => setIsMuted(!isMuted)}
                      >
                        <Icon name="mic" />
                        {isMuted ? 'Unmute' : 'Mute'}
                      </button>
                      <button
                        type="button"
                        className="btn ghost sm"
                        onClick={() => setIsCameraOff(!isCameraOff)}
                      >
                        <Icon name="cam" />
                        {isCameraOff ? 'Enable Camera' : 'Camera Off'}
                      </button>
                      <button
                        type="button"
                        className="btn danger sm"
                        onClick={() => setIsCallActive(false)}
                      >
                        End call
                      </button>
                    </>
                  )}
                </div>

                {symptoms.length > 0 && (
                  <div className="chips" style={{ marginTop: '14px' }}>
                    {symptoms.map((s, idx) => (
                      <span key={idx} className="chip tag-active">
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                <p className="note-row" style={{ marginBottom: 0 }}>
                  <Icon name="info" />
                  <span>
                    AI Triage: {patient.aiSummary || 'Patient resting. No critical symptoms reported.'}
                  </span>
                </p>
              </div>

              <div className="card mt">
                <h2 className="sec">Diagnosis notes</h2>
                <textarea
                  className="sj-textarea"
                  rows={5}
                  aria-label="Diagnosis notes"
                  placeholder="Findings, impression, care plan..."
                  value={doctorNotesInput}
                  onChange={(e) => setDoctorNotesInput(e.target.value)}
                />
                <div style={{ marginTop: '12px' }}>
                  <button type="button" className="btn sm" onClick={handleSaveNotes}>
                    <Icon name="check" />
                    {notesSavedMsg || 'Save notes'}
                  </button>
                </div>
              </div>
            </section>

            {/* Right Column: Prescription Pad & Current Medications */}
            <section>
              <div className="card">
                <h2 className="sec">Prescription pad</h2>

                {rxSuccessMsg && <div className="rx-success">{rxSuccessMsg}</div>}

                <form onSubmit={handlePrescribeMedicine}>
                  <div className="add-row">
                    <input
                      type="text"
                      list="doc-rx-med-list"
                      placeholder="Drug name (e.g. Aspirin, Warfarin, Metoprolol)"
                      aria-label="Drug name"
                      value={newMedName}
                      onChange={(e) => setNewMedName(e.target.value)}
                      required
                    />
                    <datalist id="doc-rx-med-list">
                      {commonMedicines.map((m) => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                    <button type="submit" className="btn sm">
                      Add
                    </button>
                  </div>

                  <div className="modal-grid" style={{ marginTop: '10px' }}>
                    <select
                      className="sj-field-select"
                      value={newMedTime}
                      onChange={(e) => setNewMedTime(e.target.value)}
                      aria-label="Dosage timing"
                    >
                      <option value="Morning">Morning</option>
                      <option value="Afternoon">Afternoon</option>
                      <option value="Night">Night</option>
                      <option value="Morning & Night">Morning &amp; Night</option>
                    </select>
                    <input
                      type="text"
                      className="sj-input"
                      placeholder="Instructions (e.g. after meals)"
                      value={newMedInstructions}
                      onChange={(e) => setNewMedInstructions(e.target.value)}
                    />
                  </div>
                </form>

                {rxWarning && (
                  <div className="alert-card" role="alert">
                    <span className="badge">
                      <Icon name="alert" />
                    </span>
                    <div>
                      <b>Possible interaction</b>
                      <p>{rxWarning} Review before prescribing.</p>
                    </div>
                  </div>
                )}

                {warnings.length > 0 && !rxWarning && (
                  <div className="alert-card" role="alert">
                    <span className="badge">
                      <Icon name="alert" />
                    </span>
                    <div>
                      <b>Active regimen conflict</b>
                      {warnings.map((w, idx) => (
                        <p key={idx}>{w}</p>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: '16px' }}>
                  {medicines.length > 0 ? (
                    medicines.map((m, i) => (
                      <div key={i} className="logrow">
                        <span className="badge b-amb">
                          <Icon name="pill" />
                        </span>
                        <div className="log-main">
                          <b>{m.name}</b>
                          <small>{m.time}</small>
                        </div>
                        {m.taken ? (
                          <span className="taken on">
                            <Icon name="check" />
                            Taken
                          </span>
                        ) : (
                          <span className="taken pending">Pending</span>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="empty-subtext">No drugs added yet.</p>
                  )}
                </div>

                <div className="note-row">
                  <Icon name="info" />
                  <span>Each drug is checked automatically against the patient’s current medicines.</span>
                </div>
              </div>
            </section>
          </div>
        </>
      )}

      {activeTab === 'directory' && (
        <div>
          <div className="filter-bar">
            <div className="filter-item">
              <label htmlFor="doc-filter-lang">Language:</label>
              <select
                id="doc-filter-lang"
                className="sj-select"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
              >
                <option value="All">All Languages (28)</option>
                {languages.map((l) => (
                  <option key={l.code} value={l.name}>
                    {l.nativeName} ({l.name})
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-item">
              <label htmlFor="doc-filter-spec">Specialty:</label>
              <select
                id="doc-filter-spec"
                className="sj-select"
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
              >
                {specialties.map((s) => (
                  <option key={s} value={s}>
                    {s === 'All' ? 'All Specialties' : s}
                  </option>
                ))}
              </select>
            </div>

            <span className="empty-subtext" style={{ marginLeft: 'auto' }}>
              Showing {filteredDoctors.length} doctors
            </span>
          </div>

          <div className="doctors-grid">
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
              <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
                <p className="sub" style={{ marginBottom: '12px' }}>
                  No doctors found matching “{selectedLanguage}” in “{selectedSpecialty}”.
                </p>
                <button
                  type="button"
                  className="btn sm"
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
