/**
 * Patient.jsx - Two-Column Editorial Patient Voiceboard with Select/Unselect Symptoms,
 * 3-Tier Urgency Alerts (Green / Orange / Red), and Full 8-Gesture Camera Control
 * Owner: Dev 1 & Member 4 (UI)
 */

import React, { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import symptomsData from '../data/symptoms.json';
import languages from '../data/languages.json';
import { speak } from '../lib/speech.js';
import {
  getPatient,
  toggleSymptom,
  clearSymptoms,
  setTriageResult,
  triggerEmergency,
  clearEmergency,
  updatePatientProfile,
  setQuickAlert
} from '../lib/patientService.js';
import { triageSymptoms } from '../lib/triage.js';
import { getSymptomText, getQuickPhrases, getUiText, getLanguageMeta } from '../lib/translations.js';
import SymptomButton from '../components/SymptomButton.jsx';
import UrgencyBadge from '../components/UrgencyBadge.jsx';
import WarningBox from '../components/WarningBox.jsx';
import WebcamGesture from '../components/WebcamGesture.jsx';
import Icon from '../components/Icons.jsx';
import AiHealthChatbot from '../components/AiHealthChatbot.jsx';
import { EyeControlProvider } from '../components/accessibility/EyeControlProvider.tsx';
import { useEyeControl } from '../components/accessibility/eyeControlContext.ts';

function PatientEyeModeToggle() {
  const { enabled, requestEnable, disable } = useEyeControl();
  return (
    <button
      type="button"
      onClick={() => (enabled ? disable() : requestEnable())}
      className={`btn-eye-toggle ${enabled ? 'is-active' : ''}`}
      aria-pressed={enabled}
      aria-label={enabled ? 'Turn off Patient Eye Control Mode' : 'Turn on Patient Eye Control Mode (look & blink twice to select)'}
      title="Hands-free Eye-Gesture Control (Blink twice to select)"
    >
      {enabled ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      <span>{enabled ? 'Eye Control ON' : 'Eye Control'}</span>
    </button>
  );
}

export default function Patient() {
  return (
    <EyeControlProvider>
      <PatientWorkspace />
    </EyeControlProvider>
  );
}

function PatientWorkspace() {
  const [langCode, setLangCode] = useState('hi');
  const [patientRecord, setPatientRecord] = useState(null);
  const [activeSymptoms, setActiveSymptoms] = useState([]);
  const [urgency, setUrgency] = useState('Low');
  const [aiSummary, setAiSummary] = useState('');
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [speakingText, setSpeakingText] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastSpoken, setLastSpoken] = useState(null);
  const [alertNotification, setAlertNotification] = useState(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const speakTimerRef = useRef(null);

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

      const matched = languages.find(
        (l) => l.name.toLowerCase() === (patient.language || 'hindi').toLowerCase()
      );
      if (matched) {
        setLangCode(matched.code);
      }
    }
    loadData();

    const handleGlobalLangChange = (e) => {
      if (e.detail?.code) {
        setLangCode(e.detail.code);
      }
    };
    window.addEventListener('sanjeevani_lang_changed', handleGlobalLangChange);
    return () => {
      window.removeEventListener('sanjeevani_lang_changed', handleGlobalLangChange);
      if (speakTimerRef.current) clearTimeout(speakTimerRef.current);
    };
  }, []);

  const currentLangObj = getLanguageMeta(langCode);
  const quickPhrases = getQuickPhrases(langCode);
  const ui = getUiText(langCode);

  const triggerSpeech = (spokenPhrase, locale, displayLabel, options = {}) => {
    setSpeakingText(displayLabel);
    setLastSpoken({ phrase: spokenPhrase, locale, displayLabel, options });
    setIsSpeaking(true);
    speak(spokenPhrase, locale, options);

    if (speakTimerRef.current) clearTimeout(speakTimerRef.current);
    speakTimerRef.current = setTimeout(() => {
      setIsSpeaking(false);
    }, 3800);
  };

  const handleReplaySpeech = () => {
    if (!lastSpoken) return;
    triggerSpeech(lastSpoken.phrase, lastSpoken.locale, lastSpoken.displayLabel, lastSpoken.options);
  };

  const handleStopSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (speakTimerRef.current) clearTimeout(speakTimerRef.current);
    setIsSpeaking(false);
  };

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

    const matchedLang = languages.find(
      (l) => l.name.toLowerCase() === (updated.language || '').toLowerCase()
    );
    if (matchedLang) {
      setLangCode(matchedLang.code);
      window.dispatchEvent(new CustomEvent('sanjeevani_lang_changed', { detail: matchedLang }));
    }
  };

  // Toggle symptom selection (tap to select, tap again to unselect) & recalculate 3-tier urgency
  const handleSymptomClick = async (symptom) => {
    const clickedIdx = symptomsData.findIndex((s) => s.id === symptom.id);
    if (clickedIdx !== -1) {
      setHighlightedIndex(clickedIdx);
    }

    const textInfo = getSymptomText(symptom.id, langCode);
    const speechLocale = currentLangObj.speechLocale || 'hi-IN';

    const updatedRecord = await toggleSymptom(symptom.name);
    const nextSymptoms = updatedRecord.symptoms || [];
    setActiveSymptoms(nextSymptoms);

    if (updatedRecord.selected) {
      triggerSpeech(
        textInfo.spoken,
        speechLocale,
        `${ui.speakingLabel} “${textInfo.label}”${langCode !== 'en' ? ` (${symptom.name})` : ''}`,
        { fallbackText: textInfo.spokenFallback }
      );
    } else {
      setSpeakingText(`Unselected: ${textInfo.label}`);
      setIsSpeaking(false);
    }

    const triageResult = await triageSymptoms(nextSymptoms);
    // If no critical symptoms remain and emergency wasn't manually locked, sync down cleanly
    if (nextSymptoms.length === 0 && emergencyActive) {
      await clearEmergency();
      setEmergencyActive(false);
    }
    await setTriageResult(triageResult);
    setUrgency(triageResult.urgency);
    setAiSummary(triageResult.aiSummary);
  };

  const handleClearAllSymptoms = async () => {
    await clearSymptoms();
    setActiveSymptoms([]);
    setUrgency('Low');
    setEmergencyActive(false);
    setAiSummary('Patient is resting comfortably. No symptoms reported.');
    setSpeakingText('Cleared all selected symptoms.');
    setIsSpeaking(false);
  };

  const handleDismissEmergency = async () => {
    await clearEmergency();
    setEmergencyActive(false);
    const triageResult = await triageSymptoms(activeSymptoms);
    await setTriageResult(triageResult);
    setUrgency(triageResult.urgency);
    setAiSummary(triageResult.aiSummary);
  };

  const handlePhraseClick = async (phrase) => {
    const speechLocale = currentLangObj.speechLocale || 'hi-IN';
    triggerSpeech(
      phrase.spoken,
      speechLocale,
      `${ui.speakingLabel} “${phrase.label}”`,
      { fallbackText: phrase.spokenFallback }
    );

    if (phrase.id === 'washroom') {
      await setQuickAlert('Washroom Urgency (Just now)');
      setAlertNotification({ tier: 'calm', text: 'Washroom assistance requested. Caregiver notified.' });
    } else if (phrase.id === 'water') {
      await setQuickAlert('Drinking Water Requested (Just now)');
      setAlertNotification({ tier: 'calm', text: 'Drinking water requested. Caregiver notified.' });
    } else if (phrase.id === 'sit_up') {
      await setQuickAlert('Mobility Support: Help Sit Up');
      setAlertNotification({ tier: 'calm', text: 'Bed support requested. Caregiver notified.' });
    } else if (phrase.id === 'cold') {
      await setQuickAlert('Patient Feeling Cold (Blanket needed)');
      setAlertNotification({ tier: 'calm', text: 'Warm blanket requested. Caregiver notified.' });
    } else if (phrase.id === 'food') {
      await setQuickAlert('Patient Hungry (Meal assistance)');
      setAlertNotification({ tier: 'calm', text: 'Meal assistance requested. Caregiver notified.' });
    }
  };

  const handleEmergencyClick = async () => {
    setEmergencyActive(true);
    const emergencySpeech = ui.emergencySpoken || 'Emergency help requested! Please assist immediately!';
    triggerSpeech(
      emergencySpeech,
      currentLangObj.speechLocale || 'hi-IN',
      `${ui.speakingLabel} “${ui.emergencyHelp}”`,
      { fallbackText: ui.emergencySpokenFallback }
    );

    await triggerEmergency();
    setUrgency('High');
    setAiSummary('EMERGENCY ALERT: Immediate caregiver and doctor assistance requested.');
  };

  // 1-to-1 Gesture -> Specific Problem Handler (all 8 gestures)
  const handleGestureDetected = async (gesture) => {
    if (!gesture?.symptomId) return;
    const matchedSymptom = symptomsData.find((s) => s.id === gesture.symptomId);
    if (!matchedSymptom) return;

    const wasSelected = activeSymptoms.includes(matchedSymptom.name);
    await handleSymptomClick(matchedSymptom);

    const tier = (gesture.urgency || 'Low').toLowerCase();
    setAlertNotification({
      tier: tier === 'medium' ? 'orange' : 'calm',
      text: wasSelected
        ? `${gesture.number}. ${gesture.name}: Unselected “${matchedSymptom.name}”.`
        : `${gesture.number}. ${gesture.name}: Selected “${matchedSymptom.name}” (${
            tier === 'high' ? 'Red Alert' : tier === 'medium' ? 'Orange Alert' : 'Green Routine'
          }).`
    });
  };

  const urgencyKey = (urgency || 'Low').toLowerCase();

  return (
    <>
      {/* Sticky Sub-Header Strip (#strip) */}
      <div className="sj-strip">
        <div className="sin">
          <span className="sin-who">
            <Icon name="user" />
            <b>
              {patientRecord?.name || 'Ramesh Kumar'}, {patientRecord?.age || 62} yrs ({patientRecord?.gender || 'Male'})
            </b>
            <span className="sep">•</span>
            <Icon name="bed" />
            <span>{patientRecord?.roomNo || 'Ward 4B - Bed 12'}</span>
            <button
              type="button"
              className="link hi"
              onClick={handleOpenEditModal}
              title="Customize patient name, age, and info"
            >
              {ui.editProfile}
            </button>
          </span>

          <button
            type="button"
            className={`btn-ai-assistant-toggle ${showChatbot ? 'active' : ''}`}
            onClick={() => setShowChatbot((prev) => !prev)}
            title="Open AI Symptom & Disease Chatbot"
          >
            <span>🤖</span>
            <span>{showChatbot ? 'Hide AI Chatbot' : 'AI Health Assistant'}</span>
          </button>

          <PatientEyeModeToggle />

          <button type="button" className="sos" onClick={handleEmergencyClick}>
            <Icon name="siren" />
            <span>Emergency Help</span>
            {langCode !== 'en' && <span className="hi">({ui.emergencyHelp})</span>}
          </button>
        </div>
      </div>

      {/* Main Two-Column Patient Workspace */}
      <div className="page-wrap wide">
        {/* AI Health Diagnosis Chatbot (Patient View) */}
        {showChatbot && (
          <div style={{ marginBottom: '24px' }}>
            <AiHealthChatbot
              patientRecord={patientRecord}
              activeSymptoms={activeSymptoms}
              userRole="patient"
              onClose={() => setShowChatbot(false)}
            />
          </div>
        )}

        {/* RED CRITICAL ALERT BANNER (Emergency or High Urgency symptoms only) */}
        {(emergencyActive || urgencyKey === 'high') && (
          <div className="alert-banner emergency" role="alert">
            <div className="alert-banner-left">
              <Icon name="siren" />
              <span>
                <strong>RED ALERT (CRITICAL):</strong>{' '}
                {emergencyActive
                  ? 'Emergency broadcast active — caregiver and medical team alerted.'
                  : 'High-priority symptom reported — immediate medical attention recommended.'}
              </span>
            </div>
            {emergencyActive && (
              <button
                type="button"
                className="btn subtle sm"
                onClick={handleDismissEmergency}
              >
                Dismiss
              </button>
            )}
          </div>
        )}

        {/* ORANGE MODERATE ALERT BANNER (Medium Urgency symptoms — never for Need Water) */}
        {!emergencyActive && urgencyKey === 'medium' && (
          <div className="alert-banner orange" role="alert">
            <div className="alert-banner-left">
              <Icon name="alert" />
              <span>
                <strong>ORANGE ALERT (MODERATE):</strong> Moderate symptoms reported — caregiver notified to check in soon.
              </span>
            </div>
          </div>
        )}

        {/* Subtle Feedback Banner for Gestures / Routine Requests */}
        {alertNotification && (
          <div
            className={`alert-banner ${
              alertNotification.tier === 'orange' ? 'orange' : 'calm'
            }`}
            role="status"
          >
            <div className="alert-banner-left">
              <Icon name={alertNotification.tier === 'orange' ? 'alert' : 'check'} />
              <span>{alertNotification.text}</span>
            </div>
            <button
              type="button"
              className="btn subtle xs"
              onClick={() => setAlertNotification(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="pgrid">
          {/* Left Column: 2x4 Select/Unselect Symptom Grid */}
          <section>
            <div className="sevhead" style={{ marginBottom: '12px' }}>
              <h2 className="sec hi" style={{ margin: 0 }}>
                Tap what you feel
                {langCode !== 'en' ? ` / ${ui.tapWhatYouFeel}` : ''}
              </h2>
              {activeSymptoms.length > 0 && (
                <button
                  type="button"
                  className="btn subtle xs hi"
                  onClick={handleClearAllSymptoms}
                >
                  <Icon name="x" />
                  {ui.clearAll} ({activeSymptoms.length})
                </button>
              )}
            </div>
            <div className="sym">
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
            <p className="empty-subtext" style={{ margin: '10px 0 0', fontSize: '12.5px' }}>
              Tap any card to select it, or tap again to unselect.{' '}
              <strong>Green</strong> = routine comfort · <strong>Orange</strong> = moderate alert · <strong>Red</strong> = urgent alert.
            </p>
          </section>

          {/* Right Column: Phrases, Speech Feedback, AI Urgency, 8-Gesture Camera */}
          <section>
            <h2 className="sec hi">{ui.quickPhrases}</h2>
            <div className="chips">
              {quickPhrases.map((phrase) => (
                <button
                  key={phrase.id}
                  type="button"
                  className="chip hi"
                  onClick={() => handlePhraseClick(phrase)}
                >
                  <span>{phrase.label}</span>
                </button>
              ))}
            </div>

            <h2 className="sec mt hi">{ui.speechFeedback}</h2>
            <div className={`voice ${isSpeaking ? 'live' : ''}`} role="status" aria-live="polite">
              <span className="vgrp">
                <Icon name="speak" />
                <span className="txt hi">
                  {speakingText || ui.speechReady}
                </span>
              </span>
              <span className="vgrp">
                <span className="wave" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                <button
                  type="button"
                  className="vb"
                  onClick={handleReplaySpeech}
                  aria-label="Replay"
                  title="Replay last spoken phrase"
                >
                  <Icon name="replay" />
                </button>
                <button
                  type="button"
                  className="vb"
                  onClick={handleStopSpeech}
                  aria-label="Stop"
                  title="Stop speech"
                >
                  <Icon name="stop" />
                </button>
              </span>
            </div>

            <h2 className="sec mt hi">{ui.aiUrgency}</h2>
            <div className="card flush">
              <div className="pad">
                <div className="sevhead">
                  <span className="sevhead-label hi">{ui.aiUrgencyStatus}</span>
                  <UrgencyBadge urgency={urgency} langCode={langCode} />
                </div>

                {activeSymptoms.length > 0 && (
                  <div className="chips" style={{ marginTop: '10px' }}>
                    {activeSymptoms.map((s) => {
                      const symObj = symptomsData.find((item) => item.name === s);
                      const label = symObj ? getSymptomText(symObj.id, langCode).label : s;
                      return (
                        <button
                          key={s}
                          type="button"
                          className="chip tag-active hi"
                          style={{ cursor: 'pointer' }}
                          onClick={() => {
                            if (symObj) handleSymptomClick(symObj);
                          }}
                          title={`Click to unselect ${s}`}
                        >
                          {langCode === 'en' ? s : label} ×
                        </button>
                      );
                    })}
                  </div>
                )}

                <p style={{ margin: '10px 0 0', fontSize: '14px', color: 'var(--ink)' }}>
                  {aiSummary || 'Patient is resting comfortably. No symptoms reported.'}
                </p>
              </div>
              <WarningBox langCode={langCode} />
            </div>

            <h2 className="sec mt hi">{ui.cameraIntegration}</h2>
            <WebcamGesture
              onGestureDetected={handleGestureDetected}
              highlightedSymptomName={symptomsData[highlightedIndex]?.name}
              activeSymptoms={activeSymptoms}
              langCode={langCode}
            />
          </section>
        </div>
      </div>

      {/* Edit Patient Profile Modal */}
      {isEditProfileOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Edit Patient Profile">
          <div className="modal-card">
            <div className="modal-head">
              <h3>Edit Patient Profile</h3>
              <button
                type="button"
                className="btn subtle xs"
                onClick={() => setIsEditProfileOpen(false)}
                aria-label="Close modal"
              >
                <Icon name="x" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile}>
              <div className="modal-grid">
                <div className="field-group">
                  <label htmlFor="modal-name">Patient Full Name</label>
                  <input
                    id="modal-name"
                    type="text"
                    className="sj-input"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    placeholder="e.g. Ramesh Kumar"
                    required
                  />
                </div>

                <div className="field-group">
                  <label htmlFor="modal-age">Age (Years)</label>
                  <input
                    id="modal-age"
                    type="number"
                    min="1"
                    max="125"
                    className="sj-input"
                    value={profileForm.age}
                    onChange={(e) => setProfileForm({ ...profileForm, age: e.target.value })}
                    required
                  />
                </div>

                <div className="field-group">
                  <label htmlFor="modal-gender">Gender</label>
                  <select
                    id="modal-gender"
                    className="sj-field-select"
                    value={profileForm.gender}
                    onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>

                <div className="field-group">
                  <label htmlFor="modal-room">Ward / Bed No</label>
                  <input
                    id="modal-room"
                    type="text"
                    className="sj-input"
                    value={profileForm.roomNo}
                    onChange={(e) => setProfileForm({ ...profileForm, roomNo: e.target.value })}
                    placeholder="e.g. Ward 4B - Bed 12"
                  />
                </div>

                <div className="field-group">
                  <label htmlFor="modal-lang">Primary Language</label>
                  <select
                    id="modal-lang"
                    className="sj-field-select"
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
                  <label htmlFor="modal-contact">Emergency Contact</label>
                  <input
                    id="modal-contact"
                    type="tel"
                    className="sj-input"
                    value={profileForm.emergencyContact}
                    onChange={(e) => setProfileForm({ ...profileForm, emergencyContact: e.target.value })}
                    placeholder="e.g. +91 98765 43210"
                  />
                </div>
              </div>

              <div className="field-group" style={{ marginTop: '12px' }}>
                <label htmlFor="modal-living">Clinical / Living Notes</label>
                <textarea
                  id="modal-living"
                  rows="2"
                  className="sj-textarea"
                  style={{ minHeight: '72px' }}
                  value={profileForm.livingNote}
                  onChange={(e) => setProfileForm({ ...profileForm, livingNote: e.target.value })}
                  placeholder="e.g. At home with family. Non-verbal communication."
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn subtle sm"
                  onClick={() => setIsEditProfileOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn sm">
                  <Icon name="check" />
                  Save Patient Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
