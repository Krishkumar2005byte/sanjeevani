/**
 * Caregiver.jsx - Live Real-Time Dashboard (Figma Design)
 * Owner: Dev 3 (Caregiver Dashboard)
 * 
 * Modeled after Figma Screen 3:
 * - Red top alert bar if emergency active: "🚨 ALERT: Ramesh needs help (just now) [ Respond now ]"
 * - Patient profile card + AI Urgency card side-by-side
 * - Reported symptoms chips
 * - Current medicines list with "✓ Taken" or "Pending"
 * - Red drug interaction alert box
 * - "Book a language-matched doctor →" action button
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { subscribeToPatient, clearQuickAlert } from '../lib/patientService.js';
import languages from '../data/languages.json';
import { getUiText } from '../lib/translations.js';
import UrgencyBadge from '../components/UrgencyBadge.jsx';

export default function Caregiver() {
  const [patient, setPatient] = useState(null);
  const [langCode, setLangCode] = useState('hi');

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
      {(isEmergency || symptoms.length > 0) && (
        <div
          className={`figma-caregiver-alert-bar ${isEmergency ? 'emergency-flashing' : 'active'}`}
          role="alert"
        >
          <div className="alert-bar-left">
            <span className="alert-siren">🚨</span>
            <span className="alert-text">
              <strong>ALERT:</strong> {patient.name} needs help {isEmergency ? '(URGENT - JUST NOW)' : '(symptoms updated)'}
            </span>
          </div>
          <Link to="/doctors" className="btn-respond-now">
            Respond now →
          </Link>
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
            Language: <strong>{patient.language}</strong> · 🏥 {patient.roomNo || 'Ward 4B - Bed 12'}
          </p>
          <p className="patient-emergency-contact">
            📞 Emergency: <strong>{patient.emergencyContact || '+91 98765 43210'}</strong>
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
