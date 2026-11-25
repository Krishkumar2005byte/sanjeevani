/**
 * Navbar.jsx - Multilingual Navigation Bar with Persistent "Switch Mode / Role" Control & Mobile Drawer
 */

import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { Menu, X, RefreshCw } from 'lucide-react';
import languages from '../data/languages.json';
import { getPatient, setPatientLanguage, resetPatient } from '../lib/patientService';
import { subscribeToAuth } from '../lib/authService';
import { getUiText } from '../lib/translations';
import { useMode } from './modes/modeContext';
import Icon from './Icons';

const FEATURED_CODES = ['hi', 'en', 'sd', 'pa', 'mr', 'mai'];

export default function Navbar() {
  const navigate = useNavigate();
  const { mode, role, switchModeOrRole } = useMode();
  const [resetting, setResetting] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  const handleSwitchMode = () => {
    setMobileMenuOpen(false);
    switchModeOrRole();
    navigate('/');
  };

  const ui = getUiText(currentLangCode);
  const featuredLangs = languages.filter((l) => FEATURED_CODES.includes(l.code));
  const otherLangs = languages.filter((l) => !FEATURED_CODES.includes(l.code));

  const dashboardHref =
    mode && role ? `/${mode}/${role}` : '/';

  return (
    <header className="sj-header">
      <NavLink to="/" className="sj-brand" onClick={() => setMobileMenuOpen(false)}>
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

      {/* Desktop Links */}
      <nav className="sj-nav hidden md:flex" aria-label="Main">
        <NavLink to={dashboardHref} className={({ isActive }) => `sj-nav-link hi ${isActive ? 'on' : ''}`} end>
          {mode && role ? 'My Dashboard' : ui.navHome}
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
        {/* Persistent Mode / Role Switcher */}
        <button
          type="button"
          onClick={handleSwitchMode}
          className="btn subtle xs min-h-[44px] inline-flex items-center gap-1.5 font-bold"
          aria-label="Switch care mode or user role"
          title="Switch Home / Hospital Mode or Role"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>
            {mode && role
              ? `${mode === 'home' ? 'Home' : 'Hospital'} · ${role.charAt(0).toUpperCase() + role.slice(1)}`
              : 'Switch Mode / Role'}
          </span>
        </button>

        {currentUser && (
          <div className="sj-who hidden sm:flex">
            <span className="sj-who-name">
              {currentUser.name}
            </span>
          </div>
        )}

        <select
          id="global-language-select"
          className="sj-select min-h-[44px]"
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
          className="btn-reset hidden sm:inline-flex min-h-[44px] items-center"
          title="Reset demo data"
          disabled={resetting}
        >
          {resetting ? '...' : ui.reset}
        </button>

        {/* Responsive Hamburger Toggle for Small Viewports & High Zoom */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          className="md:hidden inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl border border-[#E2E7E3] bg-white text-[#134E32]"
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden w-full basis-full pt-3 pb-2 border-t border-[#E2E7E3] flex flex-col gap-2">
          <nav className="flex flex-col gap-1.5" aria-label="Mobile Navigation">
            <Link to={dashboardHref} onClick={() => setMobileMenuOpen(false)} className="sj-nav-link min-h-[44px] flex items-center px-3">
              {mode && role ? 'My Dashboard' : 'Mode Entry'}
            </Link>
            <Link to="/patient" onClick={() => setMobileMenuOpen(false)} className="sj-nav-link min-h-[44px] flex items-center px-3">
              {ui.navPatient}
            </Link>
            <Link to="/caregiver" onClick={() => setMobileMenuOpen(false)} className="sj-nav-link min-h-[44px] flex items-center px-3">
              {ui.navCaregiver}
            </Link>
            <Link to="/doctors" onClick={() => setMobileMenuOpen(false)} className="sj-nav-link min-h-[44px] flex items-center px-3">
              {ui.navDoctor}
            </Link>
            <Link to="/medicines" onClick={() => setMobileMenuOpen(false)} className="sj-nav-link min-h-[44px] flex items-center px-3">
              {ui.navMedicines}
            </Link>
          </nav>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-[#E2E7E3]">
            <button type="button" onClick={handleSwitchMode} className="btn subtle xs min-h-[44px] flex-1">
              Switch Mode / Role
            </button>
            <button type="button" onClick={handleReset} className="btn-reset min-h-[44px]" disabled={resetting}>
              {resetting ? '...' : ui.reset}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
