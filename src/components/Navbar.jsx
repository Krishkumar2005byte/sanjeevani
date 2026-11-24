/**
 * Navbar.jsx - Navigation Bar with 28-Language Switcher & Role Authentication
 * Owner: Dev 3
 * 
 * Styled after Figma prototype: Deep Medical Green header with white pill active tabs,
 * language selector for 28 Indic/regional languages, user role profile badge, and reset demo action.
 */

import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import languages from '../data/languages.json';
import { getPatient, setPatientLanguage, resetPatient } from '../lib/patientService';
import { subscribeToAuth, logout } from '../lib/authService';

export default function Navbar() {
  const navigate = useNavigate();
  const [resetting, setResetting] = useState(false);
  const [currentLangCode, setCurrentLangCode] = useState('hi');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Read saved language from patient record or localStorage
    async function initLang() {
      const p = await getPatient();
      const matched = languages.find(l => l.name.toLowerCase() === (p.language || 'hindi').toLowerCase());
      if (matched) {
        setCurrentLangCode(matched.code);
      }
    }
    initLang();

    // Subscribe to auth session changes
    const unsubAuth = subscribeToAuth((user) => {
      setCurrentUser(user);
    });

    return () => {
      unsubAuth();
    };
  }, []);

  const handleLanguageChange = async (e) => {
    const code = e.target.value;
    setCurrentLangCode(code);
    const selected = languages.find(l => l.code === code);
    if (selected) {
      localStorage.setItem('sanjeevani_lang_code', code);
      await setPatientLanguage(selected.name);
      window.dispatchEvent(new CustomEvent('sanjeevani_lang_changed', { detail: selected }));
    }
  };

  const handleReset = async () => {
    if (window.confirm('Reset demo patient record back to initial state?')) {
      setResetting(true);
      await resetPatient();
      setResetting(false);
      window.location.reload();
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <div className="navbar-container">
        {/* Brand */}
        <NavLink to="/" className="navbar-brand">
          <span className="brand-logo-leaf">🌿</span>
          <div className="brand-titles">
            <span className="brand-title">Sanjeevani</span>
            <span className="brand-subtitle">A voice for patients who cannot speak</span>
          </div>
        </NavLink>

        {/* Navigation Tabs (Pill style matching Figma) */}
        <nav className="navbar-nav">
          <NavLink to="/" className={({ isActive }) => `nav-pill ${isActive ? 'active' : ''}`} end>
            Home
          </NavLink>
          <NavLink to="/patient" className={({ isActive }) => `nav-pill ${isActive ? 'active' : ''}`}>
            Patient
          </NavLink>
          <NavLink to="/caregiver" className={({ isActive }) => `nav-pill ${isActive ? 'active' : ''}`}>
            Caregiver
          </NavLink>
          <NavLink to="/doctors" className={({ isActive }) => `nav-pill ${isActive ? 'active' : ''}`}>
            Doctor
          </NavLink>
          <NavLink to="/medicines" className={({ isActive }) => `nav-pill ${isActive ? 'active' : ''}`}>
            Medicines
          </NavLink>
        </nav>

        {/* Actions: Role Profile, 28 Languages Picker & Reset */}
        <div className="navbar-actions">
          {/* User Role Profile Badge or Login Button */}
          {currentUser ? (
            <div className="nav-user-profile-badge">
              <span className="user-avatar-tag">{currentUser.avatar}</span>
              <div className="user-info-tag">
                <span className="user-name-tag">{currentUser.name}</span>
                <span className="user-role-pill">{currentUser.badge || currentUser.role}</span>
              </div>
              <Link to="/login" className="btn-switch-role" title="Switch between Patient, Caregiver, or Doctor">
                Switch Role
              </Link>
              <button onClick={handleLogout} className="btn-logout-small" title="Sign out session">
                ✕
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn-nav-login">
              🔑 Select Role
            </Link>
          )}

          {/* 28-Language Selector */}
          <div className="lang-picker-container" title="Select Patient & UI Language (28 Languages)">
            <span className="lang-globe-icon">🌐</span>
            <select
              id="global-language-select"
              className="navbar-lang-select"
              value={currentLangCode}
              onChange={handleLanguageChange}
              aria-label="Select language (28 languages)"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.nativeName} ({lang.name})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleReset}
            className="btn-reset-demo"
            title="Reset demo data"
            disabled={resetting}
          >
            {resetting ? '...' : '↺ Reset'}
          </button>
        </div>
      </div>
    </header>
  );
}
