/**
 * WarningBox.jsx - Multilingual Soft Amber AI Guidance Notice Strip
 * Owner: Shared Safety / Dev 2 & Member 4
 */

import React from 'react';
import { getUiText } from '../lib/translations';
import Icon from './Icons';

export default function WarningBox({ message, langCode = 'en' }) {
  const ui = getUiText(langCode);
  return (
    <div className="notice hi" role="alert">
      <Icon name="alert" />
      <span>{message || ui.aiGuidanceNotice}</span>
    </div>
  );
}
