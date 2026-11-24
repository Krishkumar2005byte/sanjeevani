/**
 * Navbar.jsx - Multilingual Editorial Navigation Bar with Featured 6-Language + 28-Language Picker
 * Owner: Dev 3 & Member 4 (UI)
 */

import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import languages from '../data/languages.json';
import { getPatient, setPatientLanguage, resetPatient } from '../lib/patientService';
import { subscribeToAuth, logout } from '../lib/authService';
import { getUiText } from '../lib/translations';
import Icon from './Icons';

const FEATURED_CODES = ['hi', 'en', 'sd', 'pa', 'mr', 'mai'];

export default function Navbar() {
  const navigate = useNavigate();
  const [resetting, setResetting] = useState(false);
  const [currentLangCode, setCurrentLangCode] = useState(() => localStorage.getItem('sanjeevani_lang_code') || 'hi');
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

  const ui = getUiText(currentLangCode);
  const featuredLangs = languages.filter((l) => FEATURED_CODES.includes(l.code));
  const otherLangs = languages.filter((l) => !FEATURED_CODES.includes(l.code));

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
          <small className="sj-tagline hi">{ui.tagline}</small>
        </div>
      </NavLink>

      <nav className="sj-nav" aria-label="Main">
        <NavLink to="/" className={({ isActive }) => `sj-nav-link hi ${isActive ? 'on' : ''}`} end>
          {ui.navHome}
        </NavLink>
        <NavLink to="/patient" className={({ isActive }) => `sj-nav-link hi ${isActive ? 'on' : ''}`}>
          {ui.navPatient}
        </NavLink>
        <NavLink to="/caregiver" className={({ isActive }) => `sj-nav-link hi ${isActive ? 'on' : ''}`}>
          {ui.navCaregiver}
        </NavLink>
        <NavLink to="/doctors" className={({ isActive }) => `sj-nav-link hi ${isActive ? 'on' : ''}`}>
          {ui.navDoctor}
        </NavLink>
        <NavLink to="/medicines" className={({ isActive }) => `sj-nav-link hi ${isActive ? 'on' : ''}`}>
          {ui.navMedicines}
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
                {ui.switchRole}
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
            {ui.selectRoleBtn}
          </Link>
        )}

        <select
          id="global-language-select"
          className="sj-select"
          value={currentLangCode}
          onChange={handleLanguageChange}
          aria-label="Select language (Full text & voice)"
          title="Select Language (Text & Voice)"
        >
          <optgroup label="Full Text & Voice">
            {featuredLangs.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.nativeName} ({lang.name})
              </option>
            ))}
          </optgroup>
          <optgroup label="More Indian Languages">
            {otherLangs.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.nativeName} ({lang.name})
              </option>
            ))}
          </optgroup>
        </select>

        <button
          type="button"
          onClick={handleReset}
          className="btn-reset"
          title="Reset demo data"
          disabled={resetting}
        >
          {resetting ? '...' : ui.reset}
        </button>
      </div>
    </header>
  );
}
