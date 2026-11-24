/**
 * Patient.jsx - Two-Column Editorial Patient Voiceboard & Sticky Emergency Strip
 * Owner: Dev 1 & Member 4 (UI)
 */

import React, { useState, useEffect, useRef } from 'react';
import symptomsData from '../data/symptoms.json';
import languages from '../data/languages.json';
import { speak } from '../lib/speech.js';
import {
  getPatient,
  addSymptom,
  setTriageResult,
  triggerEmergency,
  updatePatientProfile,
  setQuickAlert
} from '../lib/patientService.js';
import { triageSymptoms } from '../lib/triage.js';
import { getSymptomText, getQuickPhrases } from '../lib/translations.js';
import SymptomButton from '../components/SymptomButton.jsx';
import UrgencyBadge from '../components/UrgencyBadge.jsx';
import WarningBox from '../components/WarningBox.jsx';
import WebcamGesture from '../components/WebcamGesture.jsx';
import Icon from '../components/Icons.jsx';

export default function Patient() {
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

  const currentLangObj = languages.find((l) => l.code === langCode) || languages[0];
  const quickPhrases = getQuickPhrases(langCode);

  const triggerSpeech = (spokenPhrase, locale, displayLabel, options) => {
    setSpeakingText(displayLabel);
    setLastSpoken({ phrase: spokenPhrase, locale, displayLabel });
    setIsSpeaking(true);
    speak(spokenPhrase, locale, options);

    if (speakTimerRef.current) clearTimeout(speakTimerRef.current);
    speakTimerRef.current = setTimeout(() => {
      setIsSpeaking(false);
    }, 3800);
  };

  const handleReplaySpeech = () => {
    if (!lastSpoken) return;
    triggerSpeech(lastSpoken.phrase, lastSpoken.locale, lastSpoken.displayLabel);
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

  const handleSymptomClick = async (symptom) => {
    const clickedIdx = symptomsData.findIndex((s) => s.id === symptom.id);
    if (clickedIdx !== -1) {
      setHighlightedIndex(clickedIdx);
    }

    const textInfo = getSymptomText(symptom.id, langCode);
    const speechLocale = currentLangObj.speechLocale || 'hi-IN';

    triggerSpeech(
      textInfo.spoken,
      speechLocale,
      `Speaking: “${symptom.name}” (${textInfo.label})`
    );

    const updatedRecord = await addSymptom(symptom.name);
    setActiveSymptoms(updatedRecord.symptoms || []);

    const triageResult = await triageSymptoms(updatedRecord.symptoms);
    await setTriageResult(triageResult);
    setUrgency(triageResult.urgency);
    setAiSummary(triageResult.aiSummary);
  };

  const handlePhraseClick = async (phrase) => {
    const speechLocale = currentLangObj.speechLocale || 'hi-IN';
    triggerSpeech(phrase.spoken, speechLocale, `Speaking: “${phrase.label}”`);

    if (phrase.id === 'washroom') {
      await setQuickAlert('Washroom Urgency (Just now)');
      setAlertNotification('Washroom assistance requested. Alert sent to caregiver.');
    } else if (phrase.id === 'water') {
      await setQuickAlert('Drinking Water Requested (Just now)');
      setAlertNotification('Drinking water requested. Alert sent to caregiver.');
    } else if (phrase.id === 'sit_up') {
      await setQuickAlert('Mobility Support: Help Sit Up');
      setAlertNotification('Bed support requested. Alert sent to caregiver.');
    } else if (phrase.id === 'cold') {
      await setQuickAlert('Patient Feeling Cold (Blanket needed)');
      setAlertNotification('Warm blanket requested. Alert sent to caregiver.');
    } else if (phrase.id === 'food') {
      await setQuickAlert('Patient Hungry (Meal assistance)');
      setAlertNotification('Meal assistance requested. Alert sent to caregiver.');
    }
  };

  const handleEmergencyClick = async () => {
    setEmergencyActive(true);
    const emergencySpeech =
      langCode === 'hi'
        ? 'आपातकालीन सहायता की आवश्यकता है! तुरंत मदद करें!'
        : 'Emergency help requested! Please assist immediately!';
    triggerSpeech(
      emergencySpeech,
      currentLangObj.speechLocale || 'hi-IN',
      'Speaking: “Emergency, I need help now” (आपातकालीन सहायता)'
    );

    await triggerEmergency();
    setUrgency('High');
    setAiSummary('EMERGENCY ALERT: Immediate caregiver and doctor assistance requested.');
  };

  // Real-time MediaPipe hand gesture actions (Dev 1)
  const handleGestureDetected = async (gesture) => {
    const speechLocale = currentLangObj.speechLocale || 'hi-IN';
    const currentSymptom = symptomsData[highlightedIndex] || symptomsData[0];

    if (gesture.action === 'hand_detected') {
      const targetText = getSymptomText(currentSymptom.id, langCode);
      setSpeakingText(
        `Hand detected · Highlighted: “${targetText.label}” (Thumbs Up to confirm, Point/Down for next)`
      );
      setAlertNotification(
        `Hand detected! Show Thumbs Up to select “${currentSymptom.name}”, or Point/Thumbs Down for next.`
      );
      return;
    }

    if (gesture.action === 'confirm_symptom') {
      await handleSymptomClick(currentSymptom);
      setAlertNotification(`Confirmed symptom via gesture: ${currentSymptom.name}`);
      return;
    }

    if (gesture.action === 'next_symptom') {
      const nextIndex = (highlightedIndex + 1) % symptomsData.length;
      const nextSymptom = symptomsData[nextIndex];
      const nextText = getSymptomText(nextSymptom.id, langCode);
      setHighlightedIndex(nextIndex);
      triggerSpeech(
        nextText.label,
        speechLocale,
        `Highlighted next symptom: “${nextText.label}” (${nextSymptom.name})`,
        { playChime: false }
      );
      setAlertNotification(
        `${gesture.name}: Moved focus to “${nextSymptom.name}”. Show Thumbs Up to select.`
      );
      return;
    }

    if (gesture.action === 'emergency') {
      await handleEmergencyClick();
      return;
    }

    if (gesture.action === 'doctor') {
      triggerSpeech(gesture.spoken, speechLocale, `Gesture (${gesture.name}): “${gesture.spoken}”`);
      await setQuickAlert('Hand Gesture: Patient requested Doctor');
      setAlertNotification('Hand gesture detected: Doctor consultation requested.');
    }
  };

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
              className="link"
              onClick={handleOpenEditModal}
              title="Customize patient name, age, and info"
            >
              Edit Profile
            </button>
          </span>

          <button type="button" className="sos" onClick={handleEmergencyClick}>
            <Icon name="siren" />
            Emergency Help <span className="hi">(आपातकालीन सहायता)</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Patient Workspace */}
      <div className="page-wrap wide">
        {emergencyActive && (
          <div className="alert-banner emergency" role="alert">
            <div className="alert-banner-left">
              <Icon name="siren" />
              <span>
                <strong>EMERGENCY BROADCAST ACTIVE:</strong> Caregiver and medical team alerted.
              </span>
            </div>
            <button
              type="button"
              className="btn subtle sm"
              onClick={() => setEmergencyActive(false)}
            >
              Dismiss
            </button>
          </div>
        )}

        {alertNotification && (
          <div className="alert-banner assist" role="alert">
            <div className="alert-banner-left">
              <Icon name="alert" />
              <strong>{alertNotification}</strong>
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
          {/* Left Column: 2x4 Symptom Grid */}
          <section>
            <h2 className="sec">
              Tap what you feel / <span className="hi">जो महसूस हो उसे छुएं</span>
            </h2>
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
          </section>

          {/* Right Column: Phrases, Speech Feedback, AI Urgency, Camera */}
          <section>
            <h2 className="sec">Quick Patient Phrases</h2>
            <div className="chips">
              {quickPhrases.map((phrase) => (
                <button
                  key={phrase.id}
                  type="button"
                  className="chip"
                  onClick={() => handlePhraseClick(phrase)}
                >
                  <span>{phrase.label}</span>
                </button>
              ))}
            </div>

            <h2 className="sec mt">Speech Feedback</h2>
            <div className={`voice ${isSpeaking ? 'live' : ''}`} role="status" aria-live="polite">
              <span className="vgrp">
                <Icon name="speak" />
                <span className="txt">
                  {speakingText || 'Ready. Tap a symptom or phrase to speak.'}
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

            <h2 className="sec mt">AI Urgency &amp; Assistant</h2>
            <div className="card flush">
              <div className="pad">
                <div className="sevhead">
                  <span className="sevhead-label">AI URGENCY STATUS</span>
                  <UrgencyBadge urgency={urgency} />
                </div>

                {activeSymptoms.length > 0 && (
                  <div className="chips" style={{ marginTop: '10px' }}>
                    {activeSymptoms.map((s) => (
                      <span key={s} className="chip tag-active">
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                <p style={{ margin: '10px 0 0', fontSize: '14px', color: 'var(--ink)' }}>
                  {aiSummary || 'Patient is resting. No critical symptoms reported.'}
                </p>
              </div>
              <WarningBox message="AI guidance only, consult a doctor." />
            </div>

            <h2 className="sec mt">Camera Integration</h2>
            <WebcamGesture
              onGestureDetected={handleGestureDetected}
              highlightedSymptomName={symptomsData[highlightedIndex]?.name}
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
