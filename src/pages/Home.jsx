/**
 * Home.jsx - Role Picker & Portal Landing
 * Owner: Dev 3 (Role picker)
 * 
 * Modeled after Figma layout:
 * - "A voice for patients who can't speak"
 * - Interactive Role Login Board (Patient, Caregiver, Doctor)
 * - Triage Urgency preview legend
 * - 4 Module Quick Links
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import languages from '../data/languages.json';
import { getPatient } from '../lib/patientService';
import { getUiText } from '../lib/translations';
import RoleLoginBoard from '../components/RoleLoginBoard';

export default function Home() {
  const [langCode, setLangCode] = useState('en');

  useEffect(() => {
    async function init() {
      const p = await getPatient();
      const matched = languages.find(l => l.name.toLowerCase() === (p.language || 'hindi').toLowerCase());
      if (matched) setLangCode(matched.code);
    }
    init();

    const handleLangChange = (e) => {
      if (e.detail?.code) setLangCode(e.detail.code);
    };
    window.addEventListener('sanjeevani_lang_changed', handleLangChange);

    return () => {
      window.removeEventListener('sanjeevani_lang_changed', handleLangChange);
    };
  }, []);

  const ui = getUiText(langCode);

  return (
    <div className="page-container figma-home-page">
      {/* Hero Title Section */}
      <section className="figma-hero-header">
        <h1 className="figma-hero-title">{ui.heroTitle}</h1>
        <p className="figma-hero-subtitle">{ui.heroSub}</p>
      </section>

      {/* Interactive Login & Role Selection Board (Replaces the static 3-card board) */}
      <section className="home-role-login-section">
        <RoleLoginBoard />
      </section>

      {/* Triage Urgency Preview Legend (From Figma layout) */}
      <section className="figma-legend-strip">
        <span className="legend-label">Triage Urgency System:</span>
        <div className="legend-tags-group">
          <span className="figma-legend-tag tag-high">
            <strong>🔴 High</strong> Urgent attention (Chest Pain / Breathing)
          </span>
          <span className="figma-legend-tag tag-medium">
            <strong>🟡 Amber</strong> Moderate (Fever / Headache / Nausea)
          </span>
          <span className="figma-legend-tag tag-low">
            <strong>🟢 Green</strong> Stable (Water / Washroom / Routine)
          </span>
        </div>
      </section>

      {/* Feature Navigation Bar */}
      <section className="figma-modules-strip">
        <Link to="/patient" className="figma-module-chip">
          🗣️ Patient Voiceboard
        </Link>
        <Link to="/caregiver" className="figma-module-chip">
          🩺 Live Caregiver Feed
        </Link>
        <Link to="/doctors" className="figma-module-chip">
          👨‍⚕️ Doctor Consultation
        </Link>
        <Link to="/medicines" className="figma-module-chip">
          💊 Drug Safety Checker
        </Link>
      </section>
    </div>
  );
}
