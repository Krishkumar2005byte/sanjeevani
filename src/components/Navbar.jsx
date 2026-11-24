/**
 * Navbar.jsx - Light Editorial Navigation Bar with 28-Language Switcher & Role Session
 * Owner: Dev 3 & Member 4 (UI)
 */

import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import languages from '../data/languages.json';
import { getPatient, setPatientLanguage, resetPatient } from '../lib/patientService';
import { subscribeToAuth, logout } from '../lib/authService';
import Icon from './Icons';

export default function Navbar() {
  const navigate = useNavigate();
  const [resetting, setResetting] = useState(false);
  const [currentLangCode, setCurrentLangCode] = useState('hi');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    async function initLang() {
      const p = await getPatient();
      const matched = languages.find(
        (l) => l.name.toLowerCase() === (p.language || 'hindi').toLowerCase()
      );
      if (matched) {
        setCurrentLangCode(matched.code);
      }
    }
    initLang();

    const handleGlobalLang = (e) => {
      if (e.detail?.code) setCurrentLangCode(e.detail.code);
    };
    window.addEventListener('sanjeevani_lang_changed', handleGlobalLang);

    const unsubAuth = subscribeToAuth((user) => {
      setCurrentUser(user);
    });

    return () => {
      window.removeEventListener('sanjeevani_lang_changed', handleGlobalLang);
      unsubAuth();
    };
  }, []);

  const handleLanguageChange = async (e) => {
    const code = e.target.value;
    setCurrentLangCode(code);
    const selected = languages.find((l) => l.code === code);
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
    <header className="sj-header">
      <NavLink to="/" className="sj-brand">
        <div className="sj-brand-text">
          <span className="sj-wordmark">
            Sanjeevani
            <span className="sj-leaf">
              <Icon name="leaf" />
            </span>
          </span>
          <small className="sj-tagline">A voice for patients who cannot speak</small>
        </div>
      </NavLink>

      <nav className="sj-nav" aria-label="Main">
        <NavLink to="/" className={({ isActive }) => `sj-nav-link ${isActive ? 'on' : ''}`} end>
          Home
        </NavLink>
        <NavLink to="/patient" className={({ isActive }) => `sj-nav-link ${isActive ? 'on' : ''}`}>
          Patient
        </NavLink>
        <NavLink to="/caregiver" className={({ isActive }) => `sj-nav-link ${isActive ? 'on' : ''}`}>
          Caregiver
        </NavLink>
        <NavLink to="/doctors" className={({ isActive }) => `sj-nav-link ${isActive ? 'on' : ''}`}>
          Doctor
        </NavLink>
        <NavLink to="/medicines" className={({ isActive }) => `sj-nav-link ${isActive ? 'on' : ''}`}>
          Medicines
        </NavLink>
      </nav>

      <div className="sj-header-right">
        {currentUser ? (
          <div className="sj-who">
            <span className="sj-who-name">
              {currentUser.name} <small>({currentUser.badge || currentUser.role})</small>
              <Icon name="chev" />
            </span>
            <div className="sj-who-actions">
              <Link
                to="/login"
                className="btn subtle xs"
                title="Switch between Patient, Caregiver, or Doctor"
              >
                Switch Role
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="btn subtle xs"
                title="Sign out session"
                aria-label="Sign out"
              >
                <Icon name="x" />
              </button>
            </div>
          </div>
        ) : (
          <Link to="/login" className="btn subtle xs">
            Select Role
          </Link>
        )}

        <select
          id="global-language-select"
          className="sj-select"
          value={currentLangCode}
          onChange={handleLanguageChange}
          aria-label="Select language (28 languages)"
          title="Select Patient & UI Language (28 Languages)"
        >
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.nativeName} ({lang.code.toUpperCase()})
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleReset}
          className="btn-reset"
          title="Reset demo data"
          disabled={resetting}
        >
          {resetting ? '...' : 'Reset'}
        </button>
      </div>
    </header>
  );
}
