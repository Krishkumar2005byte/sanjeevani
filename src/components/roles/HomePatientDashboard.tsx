/**
 * HomePatientDashboard.tsx - Home / Patient (Elder) Accessible View (/home/patient)
 * Simple large-button (>=64px) UI with Eye + Hand Gesture Control, Check-in, Quick Phrases,
 * AI Health Agent, Medicine Reminders, and Read-Only Emergency Section + SOS Countdown.
 */

import React, { useEffect, useState } from 'react';
import {
  Bot,
  CheckCircle2,
  Volume2,
  Pill,
  Heart,
  Droplets,
  Phone,
  AlertCircle,
  Smile,
  Meh,
  Frown,
} from 'lucide-react';
import { EyeControlProvider } from '../accessibility/EyeControlProvider';
import { useEyeControl } from '../accessibility/eyeControlContext';
import { PatientAccessibilityBanner } from './PatientAccessibilityBanner';
import { EmergencyPanel } from '../emergency/EmergencyPanel';
import AiHealthChatbot from '../AiHealthChatbot.jsx';
import {
  getStoreSnapshot,
  pushAlert,
  sendCheckInOk,
  subscribeToStore,
} from '../../lib/data/sanjeevaniStore';
import { markMedicineTaken, subscribeToPatient } from '../../lib/patientService.js';
import { speak } from '../../lib/speech.js';
import type { PatientProfileSummary, SanjeevaniStoreState } from '../../lib/data/types';

interface LegacyMed {
  name: string;
  dosage?: string;
  time?: string;
  taken?: boolean;
}

interface LegacyPatientData {
  name?: string;
  symptoms?: string[];
  medicines?: LegacyMed[];
}

const HOME_PHRASES = [
  { id: 'water', text: 'I need water', icon: <Droplets className="w-6 h-6" /> },
  { id: 'call_family', text: 'Please call family', icon: <Phone className="w-6 h-6" /> },
  { id: 'pain', text: "I'm in pain", icon: <AlertCircle className="w-6 h-6" /> },
  { id: 'blanket', text: 'I feel cold, need blanket', icon: <Heart className="w-6 h-6" /> },
];

export const HomePatientDashboard: React.FC = () => {
  return (
    <EyeControlProvider mode="home">
      <HomePatientWorkspace />
    </EyeControlProvider>
  );
};

const HomePatientWorkspace: React.FC = () => {
  const { openAgent, triggerSosCountdown } = useEyeControl();
  const [store, setStore] = useState<SanjeevaniStoreState>(getStoreSnapshot);
  const [legacyPatient, setLegacyPatient] = useState<LegacyPatientData | null>(null);
  const [showChatbot, setShowChatbot] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsubStore = subscribeToStore(setStore);
    const unsubLegacy = subscribeToPatient((data: LegacyPatientData) => setLegacyPatient(data));
    return () => {
      unsubStore();
      if (unsubLegacy) unsubLegacy();
    };
  }, []);

  const activePatient =
    store.patients.find((p) => p.id === store.activePatientId) || store.patients[0];
  const medicines = legacyPatient?.medicines || [];

  const handleMoodCheckIn = async (
    mood: PatientProfileSummary['mood'],
    label: string
  ) => {
    await sendCheckInOk('home', mood, label);
    setFeedbackMsg(`Sent "${label}" check-in to Caretaker`);
    try {
      speak(`Sent ${label} check-in to caretaker.`, 'en-IN');
    } catch {
      // ignore
    }
    window.setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleQuickPhrase = (phrase: string) => {
    pushAlert({
      type: 'quick_phrase',
      title: `Patient Request: ${phrase}`,
      message: `${activePatient.name} selected spoken phrase: "${phrase}"`,
      mode: 'home',
      patientId: activePatient.id,
      patientName: activePatient.name,
      roomBed: 'Home Residence',
      severity: phrase.includes('pain') ? 'high' : 'low',
    });
    setFeedbackMsg(`Spoke & alerted Caretaker: "${phrase}"`);
    try {
      speak(phrase, 'en-IN');
    } catch {
      // ignore
    }
    window.setTimeout(() => setFeedbackMsg(null), 4000);
  };

  return (
    <div className="min-h-dvh w-full bg-[#F3F5F3] py-6 pb-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <header className="rounded-3xl bg-white border-2 border-[#E2E7E3] p-5 sm:p-7 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-block px-3 py-1 rounded-full bg-[#EAF3ED] text-[#134E32] text-xs font-extrabold uppercase tracking-wider mb-2">
              Home Mode · Patient / Elder View
            </span>
            <h1 className="text-[clamp(1.6rem,3.5vw,2.4rem)] font-bold text-[#161B18]">
              Hello, {activePatient.name}
            </h1>
            <p className="text-[clamp(0.95rem,1.4vw,1.1rem)] text-[#4F5B54]">
              Tap, blink twice, or pinch to send messages, check medicines, or request help.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowChatbot((s) => !s)}
            className="min-h-[64px] px-6 py-3 rounded-2xl bg-[#134E32] text-white font-bold text-base inline-flex items-center gap-2 hover:bg-[#0E3D27] cursor-pointer"
          >
            <Bot className="w-6 h-6" />
            <span>{showChatbot ? 'Hide AI Health Agent' : 'Talk to AI Agent'}</span>
          </button>
        </header>

        {/* Prominent Eye + Hand Control Banner & Prompt */}
        <PatientAccessibilityBanner />

        {feedbackMsg && (
          <div
            className="rounded-2xl bg-[#DCF0E3] border-2 border-[#1E6B3A] text-[#064E3B] px-5 py-4 font-bold text-lg flex items-center gap-3"
            role="status"
            aria-live="polite"
          >
            <CheckCircle2 className="w-6 h-6 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Inline AI Agent Section */}
        {showChatbot && (
          <div className="rounded-3xl overflow-hidden shadow-md">
            <AiHealthChatbot
              patientRecord={legacyPatient || activePatient}
              activeSymptoms={legacyPatient?.symptoms || activePatient.symptoms}
              userRole="patient"
              onClose={() => setShowChatbot(false)}
            />
          </div>
        )}

        {/* Primary Action Grid (Fluid 3 -> 2 -> 1) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mood & "I'm Okay" Check-in Card */}
          <section className="rounded-3xl bg-white border-2 border-[#E2E7E3] p-5 sm:p-6">
            <h2 className="text-[clamp(1.2rem,2vw,1.5rem)] font-bold text-[#161B18] mb-3">
              Daily Check-In &amp; Mood
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => void handleMoodCheckIn('good', "I'm okay")}
                className="min-h-[72px] p-4 rounded-2xl bg-[#134E32] text-white font-extrabold text-lg inline-flex items-center justify-center gap-3 hover:bg-[#0E3D27] cursor-pointer"
              >
                <Smile className="w-7 h-7" />
                <span>I&rsquo;m Okay</span>
              </button>
              <button
                type="button"
                onClick={() => void handleMoodCheckIn('tired', 'Feeling Tired')}
                className="min-h-[72px] p-4 rounded-2xl bg-[#FBF0DC] border-2 border-[#F2E0BE] text-[#6E4E1B] font-bold text-lg inline-flex items-center justify-center gap-3 cursor-pointer"
              >
                <Meh className="w-7 h-7" />
                <span>Feeling Tired</span>
              </button>
              <button
                type="button"
                onClick={() => void handleMoodCheckIn('pain', 'Having Discomfort')}
                className="min-h-[72px] p-4 rounded-2xl bg-[#FDE4E1] border-2 border-[#FCA5A5] text-[#B42318] font-bold text-lg inline-flex items-center justify-center gap-3 cursor-pointer"
              >
                <Frown className="w-7 h-7" />
                <span>Unwell / Pain</span>
              </button>
              <button
                type="button"
                onClick={openAgent}
                className="min-h-[72px] p-4 rounded-2xl bg-[#EFF8FF] border-2 border-[#BAE6FD] text-[#0369A1] font-bold text-lg inline-flex items-center justify-center gap-3 cursor-pointer"
              >
                <Bot className="w-7 h-7" />
                <span>Voice AI Agent</span>
              </button>
            </div>
          </section>

          {/* Quick Spoken Phrases */}
          <section className="rounded-3xl bg-white border-2 border-[#E2E7E3] p-5 sm:p-6">
            <h2 className="text-[clamp(1.2rem,2vw,1.5rem)] font-bold text-[#161B18] mb-3">
              Quick Spoken Phrases
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {HOME_PHRASES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleQuickPhrase(p.text)}
                  className="min-h-[72px] p-4 rounded-2xl bg-[#EAF3ED] border-2 border-[#134E32]/25 text-[#134E32] font-bold text-base inline-flex items-center justify-between gap-2 hover:border-[#134E32] cursor-pointer"
                >
                  <span className="inline-flex items-center gap-2.5 text-left">
                    {p.icon}
                    <span>{p.text}</span>
                  </span>
                  <Volume2 className="w-5 h-5 shrink-0" />
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Medicine Reminders Section */}
        <section className="rounded-3xl bg-white border-2 border-[#E2E7E3] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-[clamp(1.2rem,2vw,1.5rem)] font-bold text-[#161B18] inline-flex items-center gap-2">
              <Pill className="w-6 h-6 text-[#134E32]" />
              <span>Today&rsquo;s Medicine Reminders</span>
            </h2>
          </div>
          {medicines.length === 0 ? (
            <p className="text-[#4F5B54]">No scheduled medicines recorded right now.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {medicines.map((m, idx) => (
                <div
                  key={`${m.name}-${idx}`}
                  className={`rounded-2xl p-4 border-2 flex flex-col justify-between gap-3 ${
                    m.taken ? 'bg-[#F0FDF4] border-[#86EFAC]' : 'bg-[#F8FAFC] border-[#CBD5E1]'
                  }`}
                >
                  <div>
                    <h3 className="text-lg font-bold text-[#161B18]">{m.name}</h3>
                    <p className="text-sm text-[#4F5B54]">
                      {m.dosage || '1 tablet'} · {m.time || 'Daily'}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={Boolean(m.taken)}
                    onClick={() => void markMedicineTaken(idx)}
                    className={`min-h-[64px] px-4 py-2 rounded-xl font-bold text-base cursor-pointer ${
                      m.taken
                        ? 'bg-[#DCFCE7] text-[#166534]'
                        : 'bg-[#134E32] text-white hover:bg-[#0E3D27]'
                    }`}
                  >
                    {m.taken ? 'Taken ✓' : 'Mark Dose Taken'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Read-Only Emergency Contacts & SOS Panel */}
        <EmergencyPanel
          mode="home"
          role="patient"
          contacts={store.contacts}
          onTriggerSos={() => triggerSosCountdown('Emergency Panel Button')}
        />
      </div>
    </div>
  );
};
