/**
 * Caregiver.jsx - Live Real-Time Dashboard (Figma Design)
 * Owner: Dev 3 (Caregiver Dashboard)
 *
 * Phase 1 changes:
 * - Fixed alert bar: amber bar now only shows for Medium/High urgency symptoms,
 *   not every symptom reported — eliminates caregiver alert fatigue.
 * - Removed hardcoded fake emergency contact and room number fallbacks;
 *   replaced with neutral "Not set" / "Not assigned" placeholders.
 * - Added booked appointment display (doctor, specialty, time, video link).
 * - Added "Mark Resolved" inline confirm UI to clear the emergency flag.
 *
 * Modeled after Figma Screen 3:
 * - Red top alert bar if emergency active
 * - Patient profile card + AI Urgency card side-by-side
 * - Reported symptoms chips
 * - Current medicines list with "✓ Taken" or "Pending"
 * - Red drug interaction alert box
 * - "Book a language-matched doctor →" action button
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { subscribeToPatient, clearQuickAlert, clearEmergency } from '../lib/patientService.js';
import languages from '../data/languages.json';
import { getUiText } from '../lib/translations.js';
import UrgencyBadge from '../components/UrgencyBadge.jsx';

function isValidUrl(url) {
  if (typeof url !== 'string' || !url.trim()) return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function Caregiver() {
  const [patient, setPatient] = useState(null);
  const [langCode, setLangCode] = useState('hi');
  // Phase 1: inline confirmation state for the "Mark Resolved" emergency clear action
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    const unsub = subscribeToPatient((data) => {
      setPatient(data);
      if (data?.language) {
        const matched = languages.find(
          (l) => l.name.toLowerCase() === data.language.toLowerCase()
        );
        if (matched) setLangCode(matched.code);
      }
    });

    const handleLangChange = (e) => {
      if (e.detail?.code) setLangCode(e.detail.code);
    };
    window.addEventListener('sanjeevani_lang_changed', handleLangChange);

    return () => {
      if (unsub) unsub();
      window.removeEventListener('sanjeevani_lang_changed', handleLangChange);
    };
  }, []);

  if (!patient) {
    return (
      <div className="page-container">
        <div className="loading-state">Connecting to live patient stream...</div>
      </div>
    );
  }

  const symptoms = patient.symptoms || [];
  const medicines = patient.medicines || [];
  const warnings = patient.warnings || [];
  const isEmergency = Boolean(patient.emergency);
  const ui = getUiText(langCode);

  // Phase 1: only show the alert bar for genuine urgency — Medium or High —
  // not for every routine symptom. This prevents caregiver alert fatigue.
  const urgency = patient.urgency || 'Low';
  const showUrgencyAlert = isEmergency || (symptoms.length > 0 && (urgency === 'Medium' || urgency === 'High'));

  // Phase 1: handler for the inline clear-emergency confirmation
  const handleClearEmergency = async () => {
    await clearEmergency();
    setConfirmClear(false);
  };

  return (
    <div className="page-container figma-caregiver-page">
      {/* Quick Patient Assistance Alert (e.g. Washroom Urgency / Water) */}
      {patient.quickAlert && (
        <div className="figma-caregiver-alert-bar active washroom-notification-bar" role="alert">
          <div className="alert-bar-left">
            <span className="alert-siren">🚻</span>
            <span className="alert-text">
              <strong>LIVE PATIENT ALERT:</strong> {patient.name} requested <strong>{patient.quickAlert}</strong>
            </span>
          </div>
          <button
            type="button"
            className="btn-respond-now"
            onClick={() => clearQuickAlert()}
          >
            Acknowledge ✓
          </button>
        </div>
      )}

      {/* Red Alert Bar matching Figma (Visible when patient needs help or emergency) */}
      {showUrgencyAlert && (
        <div
          className={`figma-caregiver-alert-bar ${isEmergency ? 'emergency-flashing' : 'active'}`}
          role="alert"
        >
          <div className="alert-bar-left">
            <span className="alert-siren">🚨</span>
            <span className="alert-text">
              <strong>ALERT:</strong> {patient.name} needs help {isEmergency ? '(URGENT - JUST NOW)' : `(${urgency} urgency)`}
            </span>
          </div>

          <div className="alert-bar-actions">
            <Link to="/doctors" className="btn-respond-now">
              Respond now →
            </Link>

            {/* Phase 1: inline confirm UI for clearing the emergency flag */}
            {isEmergency && !confirmClear && (
              <button
                type="button"
                className="btn-resolve-emergency"
                onClick={() => setConfirmClear(true)}
              >
                ✓ Mark Resolved
              </button>
            )}
            {isEmergency && confirmClear && (
              <span className="confirm-clear-row">
                <span className="confirm-clear-label">Confirm resolution?</span>
                <button
                  type="button"
                  className="btn-confirm-yes"
                  onClick={handleClearEmergency}
                >
                  Yes, Clear
                </button>
                <button
                  type="button"
                  className="btn-confirm-cancel"
                  onClick={() => setConfirmClear(false)}
                >
                  Cancel
                </button>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Two Top Cards matching Figma: Patient Profile & AI Urgency */}
      <div className="figma-two-cards-row">
        {/* Card 1: Patient Profile */}
        <div className="figma-white-card patient-info-card">
          <div className="patient-card-top-row">
            <span className="card-tiny-title">PATIENT PROFILE</span>
            <Link to="/patient" className="edit-profile-mini-link">
              ✏️ Edit
            </Link>
          </div>
          <h3 className="patient-display-name">
            {patient.name}, {patient.age} yrs <span className="gender-subtext">({patient.gender || 'Male'})</span>
          </h3>
          <p className="patient-language-line">
            Language: <strong>{patient.language}</strong> · 🏥 {patient.roomNo || 'Not assigned'}
          </p>
          <p className="patient-emergency-contact">
            📞 Emergency: <strong>{patient.emergencyContact || 'Not set'}</strong>
          </p>
          <p className="patient-living-note">
            📝 {patient.livingNote || 'At home with family. Non-verbal communication.'}
          </p>
        </div>

        {/* Card 2: AI Urgency */}
        <div className="figma-white-card urgency-info-card">
          <div className="urgency-card-header">
            <span className="card-tiny-title">{ui.aiUrgency}</span>
            <UrgencyBadge urgency={patient.urgency} />
          </div>
          <p className="urgency-summary-quote">
            "{patient.aiSummary || 'Patient is stable. No critical symptoms reported.'}"
          </p>
          <span className="guidance-micro-notice">⚠️ AI guidance only. Consult a doctor.</span>
        </div>
      </div>

      {/* Reported Symptoms Section matching Figma */}
      <div className="figma-content-section">
        <h4 className="section-small-title">{ui.reportedSymptoms}</h4>
        <div className="symptoms-chips-row">
          {symptoms.length > 0 ? (
            symptoms.map((s, idx) => (
              <span key={idx} className="figma-pill-chip">
                ● {s}
              </span>
            ))
          ) : (
            <span className="empty-subtext">No symptoms reported yet</span>
          )}
        </div>
      </div>

      {/* Current Medicines Section matching Figma */}
      <div className="figma-content-section">
        <div className="section-title-row">
          <h4 className="section-small-title">{ui.currentMedicines}</h4>
          <Link to="/medicines" className="manage-meds-link">
            + {ui.addMedicine}
          </Link>
        </div>

        <div className="figma-meds-list">
          {medicines.length > 0 ? (
            medicines.map((m, i) => (
              <div key={i} className="figma-med-row">
                <div className="med-row-info">
                  <span className="med-row-dot">💊</span>
                  <strong className="med-row-name">{m.name}</strong>
                  <span className="med-row-time">({m.time})</span>
                </div>
                {m.taken ? (
                  <span className="figma-status-taken">✓ {ui.taken}</span>
                ) : (
                  <span className="figma-status-pending">{ui.pending}</span>
                )}
              </div>
            ))
          ) : (
            <p className="empty-subtext">No medicines currently scheduled.</p>
          )}
        </div>
      </div>

      {/* Booked Appointment Section — Phase 1: displays patient.appointment written by Doctors.jsx */}
      {patient.appointment && (
        <div className="figma-content-section" style={{ borderLeft: '4px solid var(--figma-green)' }}>
          <h4 className="section-small-title">📅 Booked Appointment</h4>
          <div className="appointment-details-grid">
            <p className="appointment-row">
              <span className="appt-label">Doctor: </span>
              <strong>{patient.appointment.doctorName}</strong>
            </p>
            {patient.appointment.specialty && (
              <p className="appointment-row">
                <span className="appt-label">Specialty: </span>
                <span>{patient.appointment.specialty}</span>
              </p>
            )}
            <p className="appointment-row">
              <span className="appt-label">Time: </span>
              <span>{patient.appointment.time}</span>
            </p>
            {isValidUrl(patient.appointment.videoLink) && (
              <p className="appointment-row">
                <span className="appt-label">Video Call: </span>
                <a
                  href={patient.appointment.videoLink.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="appointment-video-link"
                  aria-label={`Join video consultation with ${patient.appointment.doctorName || 'doctor'}`}
                >
                  🎥 Join Consultation →
                </a>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Doctor's Clinical Notes Section */}
      {patient.doctorNotes && (
        <div className="figma-content-section" style={{ borderLeft: '4px solid var(--figma-green)' }}>
          <h4 className="section-small-title">👨‍⚕️ Doctor's Clinical Diagnosis & Advice</h4>
          <p style={{ fontStyle: 'italic', color: '#1e293b', fontSize: '1rem', lineHeight: '1.6' }}>
            "{patient.doctorNotes}"
          </p>
        </div>
      )}

      {/* Red Drug Interaction Warning Box matching Figma */}
      {warnings.length > 0 && (
        <div className="figma-warning-box-danger" role="alert">
          <span className="danger-box-icon">⚠️</span>
          <div className="danger-box-content">
            <h5 className="danger-box-title">{ui.dangerousCombination}:</h5>
            {warnings.map((w, idx) => (
              <p key={idx} className="danger-box-text">
                {w}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Book Doctor Call-to-Action matching Figma */}
      <div className="figma-cta-row">
        <Link to="/doctors" className="btn-figma-green-block">
          {ui.bookDoctorMatch || `Book a ${patient.language}-speaking doctor →`}
        </Link>
      </div>
    </div>
  );
}
