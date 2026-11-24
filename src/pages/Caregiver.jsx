/**
 * Caregiver.jsx - Editorial Live Caregiver View
 * Owner: Dev 3 & Member 4 (UI)
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { subscribeToPatient, clearQuickAlert } from '../lib/patientService.js';
import UrgencyBadge from '../components/UrgencyBadge.jsx';
import WarningBox from '../components/WarningBox.jsx';
import Icon from '../components/Icons.jsx';

export default function Caregiver() {
  const [patient, setPatient] = useState(null);

  useEffect(() => {
    const unsub = subscribeToPatient((data) => {
      setPatient(data);
    });
    return () => {
      if (unsub) unsub();
    };
  }, []);

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
  const isEmergency = Boolean(patient.emergency);

  return (
    <div className="page-wrap">
      <h1 className="page-h1">Caregiver live view</h1>
      <p className="sub">
        {patient.name}, {patient.age} yrs ({patient.gender || 'Male'}) · {patient.roomNo || 'Ward 4B - Bed 12'}
      </p>

      {patient.quickAlert && (
        <div className="alert-banner assist" role="alert">
          <div className="alert-banner-left">
            <Icon name="alert" />
            <span>
              <strong>Live patient request:</strong> {patient.name} requested <strong>{patient.quickAlert}</strong>
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

      {(isEmergency || symptoms.length > 0) && (
        <div className={`alert-banner ${isEmergency ? 'emergency' : 'assist'}`} role="alert">
          <div className="alert-banner-left">
            <Icon name="siren" />
            <span>
              <strong>ALERT:</strong> {patient.name} needs attention {isEmergency ? '(URGENT)' : '(symptoms updated)'}
            </span>
          </div>
          <Link to="/doctors" className="btn subtle sm">
            Respond now
          </Link>
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
                <span className="sevhead-label">AI URGENCY STATUS</span>
                <UrgencyBadge urgency={patient.urgency} />
              </div>
              <p style={{ margin: '10px 0 0', fontSize: '14.5px', color: 'var(--ink)' }}>
                {patient.aiSummary || 'Patient is stable. No critical symptoms reported.'}
              </p>
            </div>
            <WarningBox message="AI guidance only, consult a doctor." />
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

        {/* Right Column: Reported Symptoms, Medicines & Warnings */}
        <section>
          <div className="card">
            <h2 className="sec" style={{ marginBottom: '10px' }}>Reported symptoms</h2>
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
              <h2 className="sec" style={{ margin: 0 }}>Current medicines</h2>
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
            <Link to="/doctors" className="btn" style={{ width: '100%' }}>
              <Icon name="steth" />
              Book a {patient.language}-speaking doctor
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
