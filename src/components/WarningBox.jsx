/**
 * WarningBox.jsx - Soft Amber AI Guidance Notice Strip
 * Owner: Shared Safety / Dev 2 & Member 4
 */

import React from 'react';
import Icon from './Icons';

export default function WarningBox({ message }) {
  return (
    <div className="notice" role="alert">
      <Icon name="alert" />
      <span>
        <strong>AI Guidance Notice:</strong>{' '}
        {message || 'AI guidance only, consult a doctor.'}
      </span>
    </div>
  );
}
