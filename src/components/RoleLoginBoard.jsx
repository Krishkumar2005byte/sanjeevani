/**
 * RoleLoginBoard.jsx - Editorial Role Selection & Login Card
 * Owner: Shared Architecture & Member 4 (UI)
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, getCurrentUser, subscribeToAuth, DEMO_PROFILES } from '../lib/authService';
import { updatePatientProfile } from '../lib/patientService';
import languages from '../data/languages.json';
import Icon from './Icons';

const ROLE_CARDS = [
  {
    key: 'patient',
    icon: 'user',
    badgeClass: 'b-sky',
    title: 'Patient',
    hindi: 'मरीज़',
    desc: 'Tap large symptom tiles with voice announcements and instant emergency alerts.'
  },
  {
    key: 'caregiver',
    icon: 'users',
    badgeClass: 'b-rose',
    title: 'Caregiver',
    hindi: 'देखभालकर्ता',
    desc: 'Live monitoring of patient symptoms, AI urgency status, and medication safety.'
  },
  {
    key: 'doctor',
    icon: 'steth',
    badgeClass: 'b-sage',
    title: 'Doctor',
    hindi: 'चिकित्सक',
    desc: 'Teleconsultation, digital prescriptions and clinical diagnosis notes.'
  }
];

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
  const activeRoleMeta = ROLE_CARDS.find((r) => r.key === selectedRole) || ROLE_CARDS[0];

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
    <div className="portal">
      <div className="card">
        {currentUser && (
          <div className="status-pill">
            <i aria-hidden="true" />
            Signed in as {currentUser.name}
          </div>
        )}

        <h1 className="page-h1">Select your role</h1>
        <p className="sub">Choose a role to enter your care portal.</p>

        <div className="roles-grid" role="radiogroup" aria-label="Select portal role">
          {ROLE_CARDS.map((r) => {
            const isSelected = selectedRole === r.key;
            return (
              <button
                key={r.key}
                type="button"
                role="radio"
                aria-checked={isSelected}
                className={`role-tile ${isSelected ? 'on' : ''}`}
                onClick={() => setSelectedRole(r.key)}
              >
                <span className={`badge ${r.badgeClass}`}>
                  <Icon name={r.icon} />
                </span>
                <div>
                  <b>{r.title}</b>
                  <span className="role-sub hi">{r.hindi}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="profile-row">
          <span className={`badge ${activeRoleMeta.badgeClass}`}>
            <Icon name={activeRoleMeta.icon} />
          </span>
          <div className="profile-text">
            <h2>{activeDemo.name}</h2>
            <p>{activeDemo.subtitle}</p>
            <p>{activeRoleMeta.desc}</p>
          </div>
          {!isCustomMode && (
            <div className="profile-actions">
              <button
                type="button"
                className="btn"
                onClick={() => handleQuickLogin(selectedRole)}
              >
                Enter Portal
              </button>
              <button
                type="button"
                className="link"
                onClick={() => setIsCustomMode(true)}
              >
                Sign in with another account
              </button>
            </div>
          )}
        </div>

        {isCustomMode && (
          <form onSubmit={handleCustomLogin} className="custom-login-form">
            <div className="form-grid-3">
              <div className="field-group">
                <label htmlFor="custom-login-name">
                  {selectedRole === 'patient' ? 'Patient Full Name' : 'Your Name'}
                </label>
                <input
                  id="custom-login-name"
                  type="text"
                  className="sj-input"
                  placeholder={selectedRole === 'patient' ? 'e.g. Ramesh Kumar' : 'e.g. Rahul Verma'}
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  required
                />
              </div>

              {selectedRole === 'patient' && (
                <div className="field-group">
                  <label htmlFor="custom-login-age">Age</label>
                  <input
                    id="custom-login-age"
                    type="number"
                    min="1"
                    max="120"
                    className="sj-input"
                    value={customAge}
                    onChange={(e) => setCustomAge(e.target.value)}
                  />
                </div>
              )}

              <div className="field-group">
                <label htmlFor="custom-login-lang">Language (28 available)</label>
                <select
                  id="custom-login-lang"
                  className="sj-field-select"
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

            <div className="profile-actions">
              <button type="submit" className="btn">
                Start Session as {activeRoleMeta.title}
              </button>
              <button
                type="button"
                className="btn subtle"
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
