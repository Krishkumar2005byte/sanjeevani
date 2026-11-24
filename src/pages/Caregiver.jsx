/**
 * Caregiver.jsx - Editorial Live Caregiver View with Inline Doctor Booking
 * Owner: Dev 3 & Member 4 (UI)
 */

import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  subscribeToPatient,
  clearQuickAlert,
  clearEmergency,
  bookAppointment
} from '../lib/patientService.js';
import doctorsData from '../data/doctors.json';
import languages from '../data/languages.json';
import { getUiText, getLangCodeByName } from '../lib/translations.js';
import UrgencyBadge from '../components/UrgencyBadge.jsx';
import WarningBox from '../components/WarningBox.jsx';
import DoctorCard from '../components/DoctorCard.jsx';
import Icon from '../components/Icons.jsx';

const SPECIALTIES = [
  'All',
  'Cardiologist',
  'General Physician',
  'Neurologist',
  'Pulmonologist',
  'Gastroenterologist',
  'Emergency Medicine'
];

export default function Caregiver() {
  const [patient, setPatient] = useState(null);
  const [showDoctorPicker, setShowDoctorPicker] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('All');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [langCode, setLangCode] = useState(() => localStorage.getItem('sanjeevani_lang_code') || 'hi');
  const doctorSectionRef = useRef(null);

  useEffect(() => {
    const unsub = subscribeToPatient((data) => {
      setPatient(data);
      if (data?.language) {
        setLangCode(getLangCodeByName(data.language));
      }
    });
    const handleLang = (e) => {
      if (e.detail?.code) setLangCode(e.detail.code);
    };
    window.addEventListener('sanjeevani_lang_changed', handleLang);
    return () => {
      if (unsub) unsub();
      window.removeEventListener('sanjeevani_lang_changed', handleLang);
    };
  }, []);

  const ui = getUiText(langCode);

  const openDoctorPicker = () => {
    if (patient?.language && selectedLanguage === 'All') {
      setSelectedLanguage(patient.language);
    }
    setShowDoctorPicker(true);
    setTimeout(() => {
      doctorSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const handleBookDoctor = async (doctor) => {
    setBookingLoading(true);
    await bookAppointment(doctor);
    setBookingLoading(false);
  };

  const handleCopyVideoLink = (link) => {
    if (navigator.clipboard && link) {
      navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  if (!patient) {
    return (
      <div className="page-wrap">
        <div className="loading-state">Connecting to live patient stream...</div>
      </div>
    );
  }

  const symptoms = patient.symptoms || [];
  const medicines = patient.medicines || [];
  const warnings = patient.warnings || [];
  const appointment = patient.appointment;
  const isEmergency = Boolean(patient.emergency);

  const filteredDoctors = doctorsData.filter((doc) => {
    const matchesLang =
      selectedLanguage === 'All' ||
      doc.languages.some((l) => l.toLowerCase() === selectedLanguage.toLowerCase());
    const matchesSpec =
      selectedSpecialty === 'All' ||
      doc.specialty.toLowerCase() === selectedSpecialty.toLowerCase();
    return matchesLang && matchesSpec;
  });

  const urgencyKey = (patient.urgency || 'Low').toLowerCase();
  const isRedAlert = isEmergency || urgencyKey === 'high';
  const isOrangeAlert = !isRedAlert && urgencyKey === 'medium';

  return (
    <div className="page-wrap">
      <h1 className="page-h1 hi">{ui.caregiverLiveTitle}</h1>
      <p className="sub">
        {patient.name}, {patient.age} yrs ({patient.gender || 'Male'}) · {patient.roomNo || 'Ward 4B - Bed 12'}
      </p>

      {patient.quickAlert && (
        <div className="alert-banner calm" role="status">
          <div className="alert-banner-left">
            <Icon name="info" />
            <span>
              <strong>Patient request:</strong> {patient.name} requested <strong>{patient.quickAlert}</strong>
            </span>
          </div>
          <button
            type="button"
            className="btn subtle sm"
            onClick={() => clearQuickAlert()}
          >
            <Icon name="check" />
            Acknowledge
          </button>
        </div>
      )}

      {/* RED CRITICAL ALERT (Emergency Help or High Urgency symptoms only) */}
      {isRedAlert && (
        <div className="alert-banner emergency" role="alert">
          <div className="alert-banner-left">
            <Icon name="siren" />
            <span>
              <strong>RED ALERT (CRITICAL):</strong> {patient.name} needs immediate attention{' '}
              {isEmergency ? '(Emergency Help triggered)' : '(Critical symptom reported)'}
            </span>
          </div>
          <div className="profile-actions">
            <button
              type="button"
              className="btn subtle sm"
              onClick={openDoctorPicker}
            >
              <Icon name="steth" />
              Consult a doctor
            </button>
            {isEmergency && (
              <button
                type="button"
                className="btn subtle sm"
                onClick={() => clearEmergency()}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* ORANGE MODERATE ALERT (Medium Urgency symptoms like High Fever, Headache, Nausea, Dizziness, Body Pain) */}
      {isOrangeAlert && (
        <div className="alert-banner orange" role="alert">
          <div className="alert-banner-left">
            <Icon name="alert" />
            <span>
              <strong>ORANGE ALERT (MODERATE):</strong> {patient.name} reported moderate symptoms — check in and consult a doctor if persistent.
            </span>
          </div>
          <button
            type="button"
            className="btn subtle sm"
            onClick={openDoctorPicker}
          >
            <Icon name="steth" />
            Consult a doctor
          </button>
        </div>
      )}

      {/* Confirmed Appointment Banner on Caregiver Dashboard */}
      {appointment && (
        <div className="appt-banner" role="status">
          <div className="appt-banner-info">
            <span className="badge b-sage">
              <Icon name="steth" />
            </span>
            <div>
              <span className="sevhead-label" style={{ color: 'var(--ok)' }}>
                APPOINTMENT CONFIRMED
              </span>
              <h3 style={{ margin: '2px 0 0', fontSize: '16px' }}>
                {appointment.doctorName} · {appointment.specialty}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--mute)' }}>
                Slot: <strong>{appointment.time}</strong> · Room: {appointment.videoLink}
              </p>
            </div>
          </div>
          <div className="profile-actions">
            <button
              type="button"
              className="btn sm"
              onClick={() => handleCopyVideoLink(appointment.videoLink)}
            >
              <Icon name={copiedLink ? 'check' : 'cam'} />
              {copiedLink ? 'Video link copied' : 'Copy video link'}
            </button>
            <button
              type="button"
              className="btn subtle sm"
              onClick={openDoctorPicker}
            >
              Change doctor
            </button>
          </div>
        </div>
      )}

      <div className="pgrid">
        {/* Left Column: Patient Profile, AI Urgency & Clinical Notes */}
        <section>
          <div className="card">
            <div className="sevhead" style={{ marginBottom: '12px' }}>
              <span className="sevhead-label">PATIENT PROFILE</span>
              <Link to="/patient" className="link" style={{ fontSize: '13px' }}>
                <Icon name="edit" />
                Edit
              </Link>
            </div>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <span className="badge b-sky">
                <Icon name="user" />
              </span>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px' }}>
                  {patient.name}, {patient.age} yrs
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: '13.5px', color: 'var(--mute)' }}>
                  Language: <strong>{patient.language}</strong> · {patient.roomNo || 'Ward 4B - Bed 12'}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--mute)' }}>
                  Emergency: {patient.emergencyContact || '+91 98765 43210'}
                </p>
              </div>
            </div>
            {patient.livingNote && (
              <p className="note-row" style={{ marginBottom: 0 }}>
                <Icon name="info" />
                <span>{patient.livingNote}</span>
              </p>
            )}
          </div>

          <div className="card flush mt">
            <div className="pad">
              <div className="sevhead">
                <span className="sevhead-label hi">{ui.aiUrgencyStatus}</span>
                <UrgencyBadge urgency={patient.urgency} langCode={langCode} />
              </div>
              <p style={{ margin: '10px 0 0', fontSize: '14.5px', color: 'var(--ink)' }}>
                {patient.aiSummary || 'Patient is stable. No critical symptoms reported.'}
              </p>
            </div>
            <WarningBox langCode={langCode} />
          </div>

          {patient.doctorNotes && (
            <div className="card mt">
              <span className="sevhead-label">DOCTOR CLINICAL NOTES</span>
              <p style={{ margin: '8px 0 0', fontSize: '14.5px', color: 'var(--ink)' }}>
                “{patient.doctorNotes}”
              </p>
            </div>
          )}
        </section>

        {/* Right Column: Reported Symptoms, Medicines & Doctor Booking CTA */}
        <section>
          <div className="card">
            <h2 className="sec hi" style={{ marginBottom: '10px' }}>{ui.reportedSymptoms}</h2>
            <div className="chips">
              {symptoms.length > 0 ? (
                symptoms.map((s, idx) => (
                  <span key={idx} className="chip tag-active">
                    {s}
                  </span>
                ))
              ) : (
                <span className="empty-subtext">No symptoms reported yet. Tapped tiles appear here live.</span>
              )}
            </div>
          </div>

          <div className="card mt">
            <div className="sevhead" style={{ marginBottom: '8px' }}>
              <h2 className="sec hi" style={{ margin: 0 }}>{ui.currentMedicines}</h2>
              <Link to="/medicines" className="link" style={{ fontSize: '13px' }}>
                + Manage medicines
              </Link>
            </div>

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
              <p className="empty-subtext" style={{ margin: '8px 0 0' }}>
                No medicines currently scheduled.
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

          <div className="mt">
            <button
              type="button"
              className="btn"
              style={{ width: '100%' }}
              onClick={showDoctorPicker ? () => setShowDoctorPicker(false) : openDoctorPicker}
            >
              <Icon name="steth" />
              {showDoctorPicker
                ? 'Hide available doctors'
                : `Book a ${patient.language}-speaking doctor`}
            </button>
          </div>
        </section>
      </div>

      {/* Inline Doctor Directory & Booking Panel (stays inside Caregiver view) */}
      {showDoctorPicker && (
        <section ref={doctorSectionRef} className="caregiver-doc-panel">
          <div className="sevhead" style={{ marginBottom: '12px' }}>
            <div>
              <h2 className="sec" style={{ marginBottom: '2px' }}>
                Available doctors ({patient.language}-matched &amp; all specialists)
              </h2>
              <p className="empty-subtext" style={{ margin: 0 }}>
                Book a teleconsultation directly from the Caregiver dashboard.
              </p>
            </div>
            <button
              type="button"
              className="btn subtle xs"
              onClick={() => setShowDoctorPicker(false)}
              aria-label="Close doctor list"
            >
              <Icon name="x" />
              Close
            </button>
          </div>

          <div className="filter-bar">
            <div className="filter-item">
              <label htmlFor="cg-filter-lang">Language:</label>
              <select
                id="cg-filter-lang"
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
              <label htmlFor="cg-filter-spec">Specialty:</label>
              <select
                id="cg-filter-spec"
                className="sj-select"
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
              >
                {SPECIALTIES.map((s) => (
                  <option key={s} value={s}>
                    {s === 'All' ? 'All Specialties' : s}
                  </option>
                ))}
              </select>
            </div>

            <span className="empty-subtext" style={{ marginLeft: 'auto' }}>
              Showing {filteredDoctors.length} doctor{filteredDoctors.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="doctors-grid">
            {filteredDoctors.length > 0 ? (
              filteredDoctors.map((doc) => (
                <DoctorCard
                  key={doc.id}
                  doctor={doc}
                  isBooked={appointment?.doctorId === doc.id}
                  onBook={handleBookDoctor}
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
        </section>
      )}
    </div>
  );
}
