/**
 * RoleLoginBoard.jsx - Interactive Role Selection & Login Board
 * Owner: Shared Architecture (All Devs)
 * 
 * Replaces the static 3-card board with an active login system:
 * - Direct 1-click login for Patient (Ramesh), Caregiver (Aarav), or Doctor (Dr. Anjali)
 * - Optional custom name & 28-language selection
 * - Persistent session tracking via authService
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, getCurrentUser, subscribeToAuth, DEMO_PROFILES } from '../lib/authService';
import { updatePatientProfile } from '../lib/patientService';
import languages from '../data/languages.json';

export default function RoleLoginBoard() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState('patient');
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [customName, setCustomName] = useState('');
  const [customAge, setCustomAge] = useState('62');
  const [customLanguage, setCustomLanguage] = useState('Hindi');
  const [isCustomMode, setIsCustomMode] = useState(false);

  useEffect(() => {
    const unsub = subscribeToAuth((user) => {
      setCurrentUser(user);
      if (user?.role) {
        setSelectedRole(user.role);
      }
    });
    return () => unsub();
  }, []);

  const activeDemo = DEMO_PROFILES[selectedRole] || DEMO_PROFILES.patient;

  const handleQuickLogin = (roleKey) => {
    const profile = DEMO_PROFILES[roleKey];
    if (profile) {
      login(profile);
      navigate(profile.redirectPath);
    }
  };

  const handleCustomLogin = async (e) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const baseProfile = DEMO_PROFILES[selectedRole];
    const userProfile = {
      ...baseProfile,
      id: `user-${Date.now()}`,
      name: customName.trim(),
      language: customLanguage,
      subtitle: `${customLanguage} · Custom Session`
    };

    if (selectedRole === 'patient') {
      await updatePatientProfile({
        name: customName.trim(),
        age: Number(customAge) || 62,
        language: customLanguage
      });
    }

    login(userProfile);
    navigate(baseProfile.redirectPath);
  };

  return (
    <div className="role-login-board-card">
      <div className="board-top-header">
        <div>
          <span className="board-tagline">PORTAL ACCESS · पोर्टल लॉगिन</span>
          <h2 className="board-main-title">Select Your Role & Login</h2>
          <p className="board-sub-desc">
            Choose your role to enter your dedicated healthcare portal.
          </p>
        </div>

        {/* Active Session Pill if already signed in */}
        {currentUser && (
          <div className="board-active-session-pill">
            <span className="active-dot">●</span>
            <span>Logged in as <strong>{currentUser.name}</strong> ({currentUser.badge || currentUser.role})</span>
            <button
              type="button"
              className="btn-portal-direct"
              onClick={() => navigate(currentUser.redirectPath || '/patient')}
            >
              Enter Portal →
            </button>
          </div>
        )}
      </div>

      {/* 3 Role Selection Tab Buttons */}
      <div className="board-role-tabs">
        <button
          type="button"
          className={`board-role-tab ${selectedRole === 'patient' ? 'active-patient' : ''}`}
          onClick={() => setSelectedRole('patient')}
        >
          <span className="tab-avatar">👴</span>
          <div className="tab-text">
            <strong className="tab-role-name">I'm the Patient</strong>
            <span className="tab-role-hindi">मरीज़ (Non-verbal Voiceboard)</span>
          </div>
        </button>

        <button
          type="button"
          className={`board-role-tab ${selectedRole === 'caregiver' ? 'active-caregiver' : ''}`}
          onClick={() => setSelectedRole('caregiver')}
        >
          <span className="tab-avatar">💛</span>
          <div className="tab-text">
            <strong className="tab-role-name">I'm the Caregiver</strong>
            <span className="tab-role-hindi">देखभालकर्ता (Live Stream)</span>
          </div>
        </button>

        <button
          type="button"
          className={`board-role-tab ${selectedRole === 'doctor' ? 'active-doctor' : ''}`}
          onClick={() => setSelectedRole('doctor')}
        >
          <span className="tab-avatar">👨‍⚕️</span>
          <div className="tab-text">
            <strong className="tab-role-name">I'm the Doctor</strong>
            <span className="tab-role-hindi">चिकित्सक (Consultation & Rx)</span>
          </div>
        </button>
      </div>

      {/* Role Details & Login Action Box */}
      <div className="board-role-detail-box">
        <div className="role-detail-main">
          <div className="detail-avatar-large">{activeDemo.avatar}</div>
          <div className="detail-info-block">
            <div className="detail-title-row">
              <h3>{activeDemo.name}</h3>
              <span className={`detail-role-badge badge-${selectedRole}`}>
                {activeDemo.badge}
              </span>
            </div>
            <p className="detail-subtitle">{activeDemo.subtitle}</p>
            <p className="detail-description">
              {selectedRole === 'patient' &&
                'Designed for non-verbal patients. Tap large symptom cards with Delhi Metro announcer voice output and dispatch emergency alerts.'}
              {selectedRole === 'caregiver' &&
                'Real-time live monitoring feed of patient symptoms, AI clinical urgency rating, emergency alarms, and medication interaction warnings.'}
              {selectedRole === 'doctor' &&
                'Physician clinical consultation room. Includes teleconsultation video console, digital prescription pad (88+ drugs), and clinical diagnosis notes.'}
            </p>
          </div>
        </div>

        {/* 1-Click Fast Login Action */}
        {!isCustomMode ? (
          <div className="board-actions-row">
            <button
              type="button"
              className={`btn-board-login btn-login-${selectedRole}`}
              onClick={() => handleQuickLogin(selectedRole)}
            >
              ✓ Login as {activeDemo.name} ({activeDemo.badge}) →
            </button>
            <button
              type="button"
              className="btn-board-custom-toggle"
              onClick={() => setIsCustomMode(true)}
            >
              Sign in with custom name or language
            </button>
          </div>
        ) : (
          /* Custom Name & Language Form */
          <form onSubmit={handleCustomLogin} className="board-custom-form">
            <div className="custom-fields-row">
              <div className="field-group">
                <label htmlFor="custom-login-name">{selectedRole === 'patient' ? 'Patient Full Name:' : 'Your Name:'}</label>
                <input
                  id="custom-login-name"
                  type="text"
                  className="board-input"
                  placeholder={selectedRole === 'patient' ? 'e.g. Ramesh Kumar' : 'e.g. Rahul Verma'}
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  required
                />
              </div>

              {selectedRole === 'patient' && (
                <div className="field-group" style={{ maxWidth: '120px' }}>
                  <label htmlFor="custom-login-age">Age (Years):</label>
                  <input
                    id="custom-login-age"
                    type="number"
                    min="1"
                    max="120"
                    className="board-input"
                    value={customAge}
                    onChange={(e) => setCustomAge(e.target.value)}
                  />
                </div>
              )}

              <div className="field-group">
                <label htmlFor="custom-login-lang">Preferred Language (28 available):</label>
                <select
                  id="custom-login-lang"
                  className="board-select"
                  value={customLanguage}
                  onChange={(e) => setCustomLanguage(e.target.value)}
                >
                  {languages.map((l) => (
                    <option key={l.code} value={l.name}>
                      {l.nativeName} ({l.name})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="custom-buttons-row">
              <button
                type="submit"
                className={`btn-board-login btn-login-${selectedRole}`}
              >
                Start Session as {selectedRole.toUpperCase()} →
              </button>
              <button
                type="button"
                className="btn-cancel-custom"
                onClick={() => setIsCustomMode(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
