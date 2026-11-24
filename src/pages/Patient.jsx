/**
 * Patient.jsx - Patient Voiceboard & Emergency Alert (Figma Design)
 * Owner: Dev 1 (Patient Experience)
 * 
 * Features:
 * - Default Delhi Metro Announcer Voice with signature pre-chime
 * - 28 Language Switcher & Quick Patient Phrases
 * - 4x2 Symptom Grid with large touch targets
 * - Speaking bubble & Full-width Red Emergency Help button
 * - Clean layout strictly matching user Figma design
 */

import React, { useState, useEffect } from 'react';
import symptomsData from '../data/symptoms.json';
import languages from '../data/languages.json';
import { speak } from '../lib/speech.js';
import {
  getPatient,
  addSymptom,
  setTriageResult,
  triggerEmergency,
  setPatientLanguage,
  updatePatientProfile,
  setQuickAlert
} from '../lib/patientService.js';
import { triageSymptoms } from '../lib/triage.js';
import { getSymptomText, getUiText, getQuickPhrases } from '../lib/translations.js';
import SymptomButton from '../components/SymptomButton.jsx';
import UrgencyBadge from '../components/UrgencyBadge.jsx';
import WarningBox from '../components/WarningBox.jsx';
import WebcamGesture from '../components/WebcamGesture.jsx';

export default function Patient() {
  const [langCode, setLangCode] = useState('hi');
  const [patientRecord, setPatientRecord] = useState(null);
  const [activeSymptoms, setActiveSymptoms] = useState([]);
  const [urgency, setUrgency] = useState('Low');
  const [aiSummary, setAiSummary] = useState('');
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [speakingText, setSpeakingText] = useState(null);
  const [alertNotification, setAlertNotification] = useState(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: 'Ramesh Kumar',
    age: 62,
    gender: 'Male',
    roomNo: 'Ward 4B - Bed 12',
    language: 'Hindi',
    emergencyContact: '+91 98765 43210',
    livingNote: 'At home with family. Speaks quietly.'
  });

  useEffect(() => {
    async function loadData() {
      const patient = await getPatient();
      setPatientRecord(patient);
      setActiveSymptoms(patient.symptoms || []);
      setUrgency(patient.urgency || 'Low');
      setAiSummary(patient.aiSummary || '');
      setEmergencyActive(Boolean(patient.emergency));
      setProfileForm({
        name: patient.name || 'Ramesh Kumar',
        age: patient.age || 62,
        gender: patient.gender || 'Male',
        roomNo: patient.roomNo || 'Ward 4B - Bed 12',
        language: patient.language || 'Hindi',
        emergencyContact: patient.emergencyContact || '+91 98765 43210',
        livingNote: patient.livingNote || 'At home with family. Speaks quietly.'
      });

      // Match patient language to one of the 28 languages
      const matched = languages.find(
        (l) => l.name.toLowerCase() === (patient.language || 'hindi').toLowerCase()
      );
      if (matched) {
        setLangCode(matched.code);
      }
    }
    loadData();

    // Listen for language changes from Navbar
    const handleGlobalLangChange = (e) => {
      if (e.detail?.code) {
        setLangCode(e.detail.code);
      }
    };
    window.addEventListener('sanjeevani_lang_changed', handleGlobalLangChange);
    return () => window.removeEventListener('sanjeevani_lang_changed', handleGlobalLangChange);
  }, []);

  const currentLangObj = languages.find((l) => l.code === langCode) || languages[0];
  const ui = getUiText(langCode);
  const quickPhrases = getQuickPhrases(langCode);

  const handleLanguageSelect = async (e) => {
    const newCode = e.target.value;
    setLangCode(newCode);
    const sel = languages.find((l) => l.code === newCode);
    if (sel) {
      await setPatientLanguage(sel.name);
      setPatientRecord((prev) => (prev ? { ...prev, language: sel.name } : prev));
      window.dispatchEvent(new CustomEvent('sanjeevani_lang_changed', { detail: sel }));
    }
  };

  // Open modal and load current patient details
  const handleOpenEditModal = () => {
    if (patientRecord) {
      setProfileForm({
        name: patientRecord.name || '',
        age: patientRecord.age || 62,
        gender: patientRecord.gender || 'Male',
        roomNo: patientRecord.roomNo || '',
        language: patientRecord.language || 'Hindi',
        emergencyContact: patientRecord.emergencyContact || '',
        livingNote: patientRecord.livingNote || ''
      });
    }
    setIsEditProfileOpen(true);
  };

  // Save customized patient profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const updated = await updatePatientProfile({
      name: profileForm.name.trim() || 'Patient',
      age: Number(profileForm.age) || 62,
      gender: profileForm.gender,
      roomNo: profileForm.roomNo.trim(),
      language: profileForm.language,
      emergencyContact: profileForm.emergencyContact.trim(),
      livingNote: profileForm.livingNote.trim()
    });

    setPatientRecord(updated);
    setIsEditProfileOpen(false);

    // If language was changed in profile, update UI language as well
    const matchedLang = languages.find(
      (l) => l.name.toLowerCase() === (updated.language || '').toLowerCase()
    );
    if (matchedLang) {
      setLangCode(matchedLang.code);
      window.dispatchEvent(new CustomEvent('sanjeevani_lang_changed', { detail: matchedLang }));
    }
  };

  // Handle symptom tap (speaks with default Delhi Metro announcer voice)
  const handleSymptomClick = async (symptom) => {
    const clickedIdx = symptomsData.findIndex((s) => s.id === symptom.id);
    if (clickedIdx !== -1) {
      setHighlightedIndex(clickedIdx);
    }

    const textInfo = getSymptomText(symptom.id, langCode);
    const speechLocale = currentLangObj.speechLocale || 'hi-IN';

    // 1. Spoken vocalization
    speak(textInfo.spoken, speechLocale);
    setSpeakingText(`"${textInfo.spoken}" · ${symptom.name}`);

    // 2. Add symptom to shared patient record
    const updatedRecord = await addSymptom(symptom.name);
    setActiveSymptoms(updatedRecord.symptoms || []);

    // 3. Run AI triage
    const triageResult = await triageSymptoms(updatedRecord.symptoms);

    // 4. Update triage result in shared patient record
    await setTriageResult(triageResult);
    setUrgency(triageResult.urgency);
    setAiSummary(triageResult.aiSummary);
  };

  // Handle quick communication phrase tap
  const handlePhraseClick = async (phrase) => {
    const speechLocale = currentLangObj.speechLocale || 'hi-IN';
    speak(phrase.spoken, speechLocale);
    setSpeakingText(`"${phrase.spoken}" (${phrase.label})`);

    // Handle high priority assistance phrases
    if (phrase.id === 'washroom') {
      await setQuickAlert('🚻 Washroom Urgency (Just now)');
      setAlertNotification('🚻 Washroom assistance requested! Alert sent to caregiver.');
    } else if (phrase.id === 'water') {
      await setQuickAlert('💧 Drinking Water Requested (Just now)');
      setAlertNotification('💧 Drinking water requested! Alert sent to caregiver.');
    } else if (phrase.id === 'sit_up') {
      await setQuickAlert('🛏️ Mobility Support: Help Sit Up');
      setAlertNotification('🛏️ Bed support requested! Alert sent to caregiver.');
    } else if (phrase.id === 'cold') {
      await setQuickAlert('🥶 Patient Feeling Cold (Blanket needed)');
      setAlertNotification('🥶 Warm blanket requested! Alert sent to caregiver.');
    } else if (phrase.id === 'food') {
      await setQuickAlert('🍲 Patient Hungry (Meal assistance)');
      setAlertNotification('🍲 Meal assistance requested! Alert sent to caregiver.');
    }
  };

  // Handle emergency button click
  const handleEmergencyClick = async () => {
    setEmergencyActive(true);
    const emergencySpeech =
      langCode === 'hi'
        ? 'आपातकालीन सहायता की आवश्यकता है! तुरंत मदद करें!'
        : 'Emergency help requested! Please assist immediately!';
    speak(emergencySpeech, currentLangObj.speechLocale || 'hi-IN');

    await triggerEmergency();
    setUrgency('High');
    setAiSummary('EMERGENCY ALERT: Immediate caregiver and doctor assistance requested.');
    setSpeakingText('🚨 EMERGENCY BROADCAST DISPATCHED TO CAREGIVER');
  };

  // Handle hand gesture recognized by MediaPipe webcam (Dev 1)
  const handleGestureDetected = async (gesture) => {
    const speechLocale = currentLangObj.speechLocale || 'hi-IN';
    const currentSymptom = symptomsData[highlightedIndex] || symptomsData[0];

    if (gesture.action === 'hand_detected') {
      const targetText = getSymptomText(currentSymptom.id, langCode);
      setSpeakingText(
        `🖐️ Hand detected · Highlighted: "${targetText.label}" (Show 👍 to confirm, ☝️/👎 for next)`
      );
      setAlertNotification(
        `🖐️ Hand detected! Show 👍 Thumbs Up to select "${currentSymptom.name}", or ☝️/👎 for next.`
      );
      return;
    }

    if (gesture.action === 'confirm_symptom') {
      await handleSymptomClick(currentSymptom);
      setAlertNotification(`👍 Confirmed symptom via gesture: ${currentSymptom.name}`);
      return;
    }

    if (gesture.action === 'next_symptom') {
      const nextIndex = (highlightedIndex + 1) % symptomsData.length;
      const nextSymptom = symptomsData[nextIndex];
      const nextText = getSymptomText(nextSymptom.id, langCode);
      setHighlightedIndex(nextIndex);
      speak(nextText.label, speechLocale, { playChime: false });
      setSpeakingText(`${gesture.emoji} Highlighted next symptom: "${nextText.label}" (${nextSymptom.name})`);
      setAlertNotification(
        `${gesture.emoji} ${gesture.name}: Moved highlight to "${nextSymptom.name}". Show 👍 to select.`
      );
      return;
    }

    if (gesture.action === 'emergency') {
      await handleEmergencyClick();
      return;
    }

    if (gesture.action === 'doctor') {
      speak(gesture.spoken, speechLocale);
      setSpeakingText(`${gesture.emoji} [Gesture: ${gesture.name}] "${gesture.spoken}"`);
      await setQuickAlert('✌️ Hand Gesture: Patient requested Doctor');
      setAlertNotification('✌️ Hand gesture detected: Doctor consultation requested!');
    }
  };

  return (
    <div className="page-container figma-patient-page">
      {/* Emergency Active Banner */}
      {emergencyActive && (
        <div className="figma-caregiver-alert-bar emergency-flashing" role="alert">
          <div className="alert-bar-left">
            <span className="alert-siren">🚨</span>
            <span className="alert-text">
              <strong>EMERGENCY HELP BROADCAST ACTIVE:</strong> Caregiver and medical team alerted!
            </span>
          </div>
          <button
            type="button"
            className="btn-respond-now"
            onClick={() => setEmergencyActive(false)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Quick Assistance Alert Banner (e.g. Washroom Urgency / Water) */}
      {alertNotification && (
        <div className="figma-caregiver-alert-bar active washroom-notification-bar" role="alert">
          <div className="alert-bar-left">
            <span className="alert-siren">🚻</span>
            <span className="alert-text">
              <strong>{alertNotification}</strong>
            </span>
          </div>
          <button
            type="button"
            className="btn-respond-now"
            onClick={() => setAlertNotification(null)}
          >
            Dismiss ✕
          </button>
        </div>
      )}

      {/* Top Header: "Tap what you feel", Customizable Patient Details, Language Switcher */}
      <div className="figma-patient-header">
        <div className="patient-meta-container">
          <h2 className="figma-section-title">{ui.tapWhatYouFeel}</h2>
          <div className="figma-patient-meta-row">
            <span className="patient-pill-badge">
              👤 <strong>{patientRecord?.name || 'Patient'}, {patientRecord?.age || 62} yrs</strong> ({patientRecord?.gender || 'Male'})
            </span>
            <span className="patient-pill-room">
              🏥 {patientRecord?.roomNo || 'Ward 4B · Bed 12'}
            </span>
            <button
              type="button"
              className="btn-edit-patient-profile"
              onClick={handleOpenEditModal}
              title="Customize patient name, age, and info"
            >
              ✏️ Edit Profile
            </button>
          </div>
        </div>

        {/* 28-Language Switcher Dropdown */}
        <div className="patient-lang-switcher">
          <span className="lang-switcher-icon">🌐</span>
          <select
            className="patient-lang-select"
            value={langCode}
            onChange={handleLanguageSelect}
            aria-label="Change language (28 languages)"
          >
            {languages.map((l) => (
              <option key={l.code} value={l.code}>
                {l.nativeName} ({l.name})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4x2 Symptom Grid matching Figma */}
      <div className="figma-symptoms-grid">
        {symptomsData.map((symptom, index) => (
          <SymptomButton
            key={symptom.id}
            symptom={symptom}
            isSelected={activeSymptoms.includes(symptom.name)}
            isHighlighted={index === highlightedIndex}
            onClick={handleSymptomClick}
            currentLangCode={langCode}
          />
        ))}
      </div>

      {/* Quick Patient Phrases Bar */}
      <div className="figma-quick-phrases-card">
        <span className="phrases-header-label">{ui.quickPhrases}:</span>
        <div className="phrases-chips-list">
          {quickPhrases.map((phrase) => (
            <button
              key={phrase.id}
              type="button"
              className="phrase-chip-btn"
              onClick={() => handlePhraseClick(phrase)}
            >
              {phrase.label}
            </button>
          ))}
        </div>
      </div>

      {/* Speaking Bar matching Figma (Soft green banner) */}
      <div className="figma-speaking-bar">
        <span className="speaking-icon">🔊</span>
        <span className="speaking-label">{ui.speakingLabel}</span>
        <span className="speaking-quote">
          {speakingText || (langCode === 'hi' ? '"सीने में दर्द" / "Chest pain"' : '"Chest pain"')}
        </span>
      </div>

      {/* Full-Width Red EMERGENCY HELP Button matching Figma */}
      <div className="figma-emergency-row">
        <button
          type="button"
          className="btn-figma-emergency"
          onClick={handleEmergencyClick}
        >
          <span className="emergency-icon-glow">🚨</span>
          <span>{ui.emergencyHelp}</span>
        </button>
      </div>

      {/* Bottom Split Layout matching Figma */}
      <div className="figma-bottom-grid">
        {/* Left: Triage Status Card */}
        <div className="figma-triage-card">
          <div className="figma-triage-header">
            <span className="triage-title-small">{ui.aiUrgency}</span>
            <UrgencyBadge urgency={urgency} />
          </div>

          <div className="figma-active-symptoms-chips">
            {activeSymptoms.length > 0 ? (
              activeSymptoms.map((s) => (
                <span key={s} className="figma-symptom-tag">
                  ● {s}
                </span>
              ))
            ) : (
              <span className="empty-subtext">No symptoms tapped yet</span>
            )}
          </div>

          <p className="figma-triage-advice">
            {aiSummary || 'Tap any symptom above to evaluate urgency and notify caregiver.'}
          </p>

          <WarningBox message="AI guidance only, consult a doctor." />
        </div>

        {/* Right: MediaPipe Gesture Camera Component (Dev 1) */}
        <WebcamGesture
          onGestureDetected={handleGestureDetected}
          highlightedSymptomName={symptomsData[highlightedIndex]?.name}
        />
      </div>

      {/* Edit Patient Profile Modal */}
      {isEditProfileOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-dialog profile-modal-dialog">
            <div className="modal-header">
              <h3>✏️ Edit Patient Profile (रोगी विवरण संपादित करें)</h3>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setIsEditProfileOpen(false)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="profile-modal-form">
              <div className="modal-form-grid">
                <div className="field-group">
                  <label htmlFor="modal-name">Patient Full Name:</label>
                  <input
                    id="modal-name"
                    type="text"
                    className="board-input"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    placeholder="e.g. Ramesh Kumar"
                    required
                  />
                </div>

                <div className="field-group">
                  <label htmlFor="modal-age">Age (Years):</label>
                  <input
                    id="modal-age"
                    type="number"
                    min="1"
                    max="125"
                    className="board-input"
                    value={profileForm.age}
                    onChange={(e) => setProfileForm({ ...profileForm, age: e.target.value })}
                    required
                  />
                </div>

                <div className="field-group">
                  <label htmlFor="modal-gender">Gender:</label>
                  <select
                    id="modal-gender"
                    className="board-select"
                    value={profileForm.gender}
                    onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                  >
                    <option value="Male">Male (पुरुष)</option>
                    <option value="Female">Female (महिला)</option>
                    <option value="Other">Other (अन्य)</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>

                <div className="field-group">
                  <label htmlFor="modal-room">Room / Bed No:</label>
                  <input
                    id="modal-room"
                    type="text"
                    className="board-input"
                    value={profileForm.roomNo}
                    onChange={(e) => setProfileForm({ ...profileForm, roomNo: e.target.value })}
                    placeholder="e.g. Ward 4B - Bed 12"
                  />
                </div>

                <div className="field-group">
                  <label htmlFor="modal-lang">Primary Language:</label>
                  <select
                    id="modal-lang"
                    className="board-select"
                    value={profileForm.language}
                    onChange={(e) => setProfileForm({ ...profileForm, language: e.target.value })}
                  >
                    {languages.map((l) => (
                      <option key={l.code} value={l.name}>
                        {l.nativeName} ({l.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field-group">
                  <label htmlFor="modal-contact">Emergency Contact Phone:</label>
                  <input
                    id="modal-contact"
                    type="tel"
                    className="board-input"
                    value={profileForm.emergencyContact}
                    onChange={(e) => setProfileForm({ ...profileForm, emergencyContact: e.target.value })}
                    placeholder="e.g. +91 98765 43210"
                  />
                </div>
              </div>

              <div className="field-group" style={{ marginTop: '0.75rem' }}>
                <label htmlFor="modal-living">Clinical / Living Condition Notes:</label>
                <textarea
                  id="modal-living"
                  rows="2"
                  className="board-input"
                  style={{ resize: 'vertical' }}
                  value={profileForm.livingNote}
                  onChange={(e) => setProfileForm({ ...profileForm, livingNote: e.target.value })}
                  placeholder="e.g. At home with family. Non-verbal, uses high-contrast buttons."
                />
              </div>

              <div className="modal-actions-row">
                <button type="submit" className="btn-modal-save">
                  ✓ Save Patient Record
                </button>
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setIsEditProfileOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
