/**
 * WarningBox.jsx - AI Guidance & Medical Advisory Box
 * Owner: Shared Safety / Dev 2 (AI Triage)
 * 
 * Simple explanation:
 * Prominent yellow advisory reminder ensuring caregivers and patients remember
 * that AI outputs are supportive guidance and not a replacement for a doctor.
 */

import React from 'react';

export default function WarningBox({ message }) {
  return (
    <div className="warning-box" role="alert">
      <span className="warning-box-icon">⚠️</span>
      <div className="warning-box-content">
        <strong>AI Guidance Notice:</strong>{' '}
        {message || 'Sanjeevani triage is for preliminary support only. It does not replace professional medical evaluation. In an emergency, contact emergency medical services immediately.'}
      </div>
    </div>
  );
}
