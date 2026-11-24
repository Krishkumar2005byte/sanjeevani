/**
 * translations.js - Unified 28-Language Translation & Localization Engine
 * Owner: Dev 1 & Shared Core
 * 
 * Backed by src/data/allLanguagesDataset.json. Provides full localized UI strings,
 * 8-symptom native vocabulary, patient quick phrases, and speech synthesizer helpers
 * across all 28 regional and official languages of India.
 */

import allLanguagesDataset from '../data/allLanguagesDataset.json';

/**
 * Returns the entire dataset for a given language code (or defaults to Hindi/English).
 */
export function getLanguageDataset(langCode = 'hi') {
  const code = (langCode || 'hi').toLowerCase();
  return allLanguagesDataset[code] || allLanguagesDataset['hi'] || allLanguagesDataset['en'];
}

/**
 * Returns localized symptom data (label in native script, spoken sentence, icon, name).
 */
export function getSymptomText(symptomId, langCode = 'hi') {
  const dataset = getLanguageDataset(langCode);
  const matched = dataset.symptoms.find((s) => s.id === symptomId);

  if (matched) {
    return {
      label: matched.label,
      spoken: matched.spoken,
      icon: matched.icon,
      name: matched.name,
      urgency: matched.urgency
    };
  }

  return {
    label: symptomId,
    spoken: symptomId,
    icon: '🩺',
    name: symptomId,
    urgency: 'Medium'
  };
}

/**
 * Returns localized UI text object for all screens and components.
 */
export function getUiText(langCode = 'en') {
  const dataset = getLanguageDataset(langCode);
  return dataset.ui;
}

/**
 * Returns localized patient quick communication phrases.
 */
export function getQuickPhrases(langCode = 'hi') {
  const dataset = getLanguageDataset(langCode);
  return dataset.phrases || [];
}

/**
 * Returns list of all 28 supported language metadata objects.
 */
export function getAllLanguages() {
  return Object.values(allLanguagesDataset).map((d) => d.meta);
}
