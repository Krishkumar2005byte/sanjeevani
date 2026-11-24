/**
 * Home.jsx - Editorial Role Picker & Portal Landing
 * Owner: Dev 3 & Member 4 (UI)
 */

import React from 'react';
import { Link } from 'react-router-dom';
import RoleLoginBoard from '../components/RoleLoginBoard';
import Icon from '../components/Icons';

export default function Home() {
  return (
    <div className="page-wrap">
      <RoleLoginBoard />

      <div className="portal-footer-strip">
        <div className="legend-bar">
          <span className="legend-title">Triage Urgency:</span>
          <span className="sev high">
            <i aria-hidden="true" />
            High — Urgent (Chest Pain / Breathing)
          </span>
          <span className="sev medium">
            <i aria-hidden="true" />
            Moderate (Fever / Headache / Nausea)
          </span>
          <span className="sev low">
            <i aria-hidden="true" />
            Low — Stable (Water / Routine)
          </span>
        </div>

        <div className="quick-links-row">
          <Link to="/patient" className="quick-link-chip">
            <Icon name="speak" />
            Patient Voiceboard
          </Link>
          <Link to="/caregiver" className="quick-link-chip">
            <Icon name="users" />
            Live Caregiver Feed
          </Link>
          <Link to="/doctors" className="quick-link-chip">
            <Icon name="steth" />
            Doctor Consultation
          </Link>
          <Link to="/medicines" className="quick-link-chip">
            <Icon name="pill" />
            Drug Safety Checker
          </Link>
        </div>
      </div>
    </div>
  );
}
