/**
 * translations.js - Unified Multilingual Text & Voice Localization Engine
 * Complete support for Hindi, English, Sindhi, Punjabi, Marathi, Maithili + all 28 languages.
 */

import allLanguagesDataset from '../data/allLanguagesDataset.json';
import languagesList from '../data/languages.json';

const DEFAULT_UI_EN = {
  tagline: 'A voice for patients who cannot speak',
  navHome: 'Home',
  navPatient: 'Patient',
  navCaregiver: 'Caregiver',
  navDoctor: 'Doctor',
  navMedicines: 'Medicines',
  switchRole: 'Switch Role',
  selectRoleBtn: 'Select Role',
  reset: 'Reset',
  editProfile: 'Edit Profile',
  selectRoleTitle: 'Select your role',
  selectRoleSub: 'Choose a role to enter your care portal.',
  patientLabel: 'Patient',
  caregiverLabel: 'Caregiver',
  doctorLabel: 'Doctor',
  enterPortal: 'Enter Portal',
  signInAnother: 'Sign in with another account',
  tapWhatYouFeel: 'Tap what you feel',
  clearAll: 'Clear all',
  quickPhrases: 'Quick Patient Phrases',
  speechFeedback: 'Speech Feedback',
  speechReady: 'Ready. Tap a symptom or phrase to speak.',
  speakingLabel: 'Speaking:',
  emergencyHelp: 'Emergency Help',
  emergencySpoken: 'Emergency help requested! Please assist immediately!',
  aiUrgency: 'AI Urgency & Assistant',
  aiUrgencyStatus: 'AI URGENCY STATUS',
  aiGuidanceNotice: 'AI guidance only, consult a doctor.',
  cameraIntegration: 'Camera Integration (8 Hand Gestures)',
  gestureCardTitle: 'MediaPipe Hand Gesture Camera',
  gestureGuideTitle: 'Gesture-to-Problem Guide (Set of 8 · Show on Camera or Tap to Toggle)',
  startCamera: 'Start Camera',
  stopCamera: 'Stop Camera',
  urgencyLow: 'LOW URGENCY',
  urgencyMedium: 'MODERATE URGENCY',
  urgencyHigh: 'HIGH URGENCY',
  caregiverLiveTitle: 'Caregiver live view',
  reportedSymptoms: 'Reported symptoms',
  currentMedicines: 'Current medicines',
  bookDoctorMatch: 'Book a language-matched doctor',
  medicinesTitle: 'Medicines',
  medicinesSub: 'Daily medication schedule with duplicate protection & live interaction safety.',
  addMedicine: 'Add',
  markAsTaken: 'Mark as taken',
  taken: 'Taken',
  pending: 'Pending',
  doctorRoomTitle: 'Consultation room'
};

/**
 * Returns the entire dataset for a given language code (defaults to Hindi/English).
 */
export function getLanguageDataset(langCode = 'hi') {
  const code = (langCode || 'hi').toLowerCase();
  return allLanguagesDataset[code] || allLanguagesDataset['hi'] || allLanguagesDataset['en'];
}

/**
 * Resolves a language code from a language name (e.g. "Punjabi" -> "pa").
 */
export function getLangCodeByName(languageName = 'Hindi') {
  const matched = languagesList.find(
    (l) => l.name.toLowerCase() === (languageName || '').toLowerCase()
  );
  return matched ? matched.code : 'hi';
}

/**
 * Returns language metadata including speechLocale.
 */
export function getLanguageMeta(langCode = 'hi') {
  const code = (langCode || 'hi').toLowerCase();
  return (
    languagesList.find((l) => l.code === code) ||
    languagesList[0]
  );
}

/**
 * Returns localized symptom data (native label, spoken text, phonetic fallback, urgency).
 */
export function getSymptomText(symptomId, langCode = 'hi') {
  const dataset = getLanguageDataset(langCode);
  const matched = dataset.symptoms.find((s) => s.id === symptomId);

  if (matched) {
    return {
      label: matched.label,
      spoken: matched.spoken,
      spokenFallback: matched.spokenFallback || '',
      icon: matched.icon,
      name: matched.name,
      urgency: matched.urgency
    };
  }

  return {
    label: symptomId,
    spoken: symptomId,
    spokenFallback: '',
    icon: '',
    name: symptomId,
    urgency: 'Medium'
  };
}

/**
 * Returns complete localized UI dictionary with safe English fallbacks for every key.
 */
export function getUiText(langCode = 'en') {
  const dataset = getLanguageDataset(langCode);
  return {
    ...DEFAULT_UI_EN,
    ...(dataset.ui || {})
  };
}

/**
 * Returns localized patient quick communication phrases.
 */
export function getQuickPhrases(langCode = 'hi') {
  const dataset = getLanguageDataset(langCode);
  return dataset.phrases || [];
}

/**
 * Returns list of all supported language metadata objects.
 */
export function getAllLanguages() {
  return languagesList;
}
