/**
 * HospitalPatientDashboard.tsx - Hospital / Patient Bed-Side View (/hospital/patient)
 * Features large (>=64px) nurse call buttons (water, pain, washroom, help), quick spoken phrases,
 * Eye + Hand Gesture Control, Talk to AI Agent, and Hospital Emergency Section + SOS.
 */

import React, { useEffect, useState } from 'react';
import {
  Bot,
  Droplets,
  AlertCircle,
  Bath,
  HelpCircle,
  Volume2,
  CheckCircle2,
  BedDouble,
} from 'lucide-react';
import { EyeControlProvider } from '../accessibility/EyeControlProvider';
import { useEyeControl } from '../accessibility/eyeControlContext';
import { PatientAccessibilityBanner } from './PatientAccessibilityBanner';
import { EmergencyPanel } from '../emergency/EmergencyPanel';
import AiHealthChatbot from '../AiHealthChatbot.jsx';
import {
  getStoreSnapshot,
  pushAlert,
  sendNurseCallRequest,
  subscribeToStore,
} from '../../lib/data/sanjeevaniStore';
import { subscribeToPatient } from '../../lib/patientService.js';
import { speak } from '../../lib/speech.js';
import type { SanjeevaniStoreState } from '../../lib/data/types';

const BEDSIDE_PHRASES = [
  'Please adjust my pillow or bed height',
  'Please check my IV drip',
  'I feel dizzy or lightheaded',
  'Please call my family',
];

export const HospitalPatientDashboard: React.FC = () => {
  return (
    <EyeControlProvider mode="hospital">
      <HospitalPatientWorkspace />
    </EyeControlProvider>
  );
};

const HospitalPatientWorkspace: React.FC = () => {
  const { openAgent, triggerSosCountdown } = useEyeControl();
  const [store, setStore] = useState<SanjeevaniStoreState>(getStoreSnapshot);
  const [legacyPatient, setLegacyPatient] = useState<{ symptoms?: string[] } | null>(null);
  const [showChatbot, setShowChatbot] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  useEffect(() => {
    const unsubStore = subscribeToStore(setStore);
    const unsubLegacy = subscribeToPatient((d: { symptoms?: string[] }) => setLegacyPatient(d));
    return () => {
      unsubStore();
      if (unsubLegacy) unsubLegacy();
    };
  }, []);

  const pat = store.patients.find((p) => p.id === store.activePatientId) || store.patients[0];

  const handleNurseCall = async (reqType: 'water' | 'pain' | 'washroom' | 'help', label: string) => {
    await sendNurseCallRequest(reqType, 'hospital');
    setStatusBanner(`Nurse Station notified (${pat.roomBed}): ${label}`);
    try {
      speak(`Nurse called for ${label}. Assistance is on the way to ${pat.roomBed}.`, 'en-IN');
    } catch {
      // ignore
    }
    window.setTimeout(() => setStatusBanner(null), 5000);
  };

  const handlePhrase = (text: string) => {
    pushAlert({
      type: 'quick_phrase',
      title: 'Bedside Spoken Request',
      message: `${pat.name} (${pat.roomBed}): "${text}"`,
      mode: 'hospital',
      patientId: pat.id,
      patientName: pat.name,
      roomBed: pat.roomBed,
      severity: text.includes('dizzy') ? 'high' : 'low',
    });
    setStatusBanner(`Spoke & sent to Nurse Station: "${text}"`);
    try {
      speak(text, 'en-IN');
    } catch {
      // ignore
    }
    window.setTimeout(() => setStatusBanner(null), 5000);
  };

  return (
    <div className="min-h-dvh w-full bg-[#F3F5F3] py-6 pb-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Bed-Side Header */}
        <header className="rounded-3xl bg-gradient-to-r from-[#0B2E3C] to-[#134E32] text-white p-5 sm:p-7 flex flex-wrap items-center justify-between gap-4 shadow-md">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-extrabold uppercase tracking-wider mb-2">
              <BedDouble className="w-4 h-4" />
              <span>Hospital Mode · {pat.roomBed}</span>
            </span>
            <h1 className="text-[clamp(1.6rem,3.5vw,2.4rem)] font-bold">
              Bedside Care — {pat.name}
            </h1>
            <p className="text-sm sm:text-base text-white/85">
              {pat.ward || 'General Ward'} · Tap, blink twice, or use hand gestures to call your nurse anytime.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={openAgent}
              className="min-h-[64px] px-5 py-3 rounded-2xl bg-white/15 border-2 border-white/30 text-white font-bold inline-flex items-center gap-2 cursor-pointer"
            >
              <Bot className="w-6 h-6" />
              <span>Voice AI Agent</span>
            </button>
            <button
              type="button"
              onClick={() => setShowChatbot((s) => !s)}
              className="min-h-[64px] px-5 py-3 rounded-2xl bg-white text-[#134E32] font-extrabold inline-flex items-center gap-2 cursor-pointer"
            >
              <Bot className="w-6 h-6" />
              <span>{showChatbot ? 'Hide AI Chat' : 'Talk to AI Agent'}</span>
            </button>
          </div>
        </header>

        {/* Prominent Eye + Hand Control Toggle & Prompt */}
        <PatientAccessibilityBanner />

        {statusBanner && (
          <div
            className="rounded-2xl bg-[#DCF0E3] border-2 border-[#1E6B3A] text-[#064E3B] px-5 py-4 font-bold text-lg flex items-center gap-3"
            role="status"
            aria-live="polite"
          >
            <CheckCircle2 className="w-6 h-6 shrink-0" />
            <span>{statusBanner}</span>
          </div>
        )}

        {showChatbot && (
          <div className="rounded-3xl overflow-hidden shadow-md">
            <AiHealthChatbot
              patientRecord={legacyPatient || pat}
              activeSymptoms={legacyPatient?.symptoms || pat.symptoms}
              userRole="patient"
              onClose={() => setShowChatbot(false)}
            />
          </div>
        )}

        {/* Primary Bedside Nurse Call Grid */}
        <section className="rounded-3xl bg-white border-2 border-[#E2E7E3] p-5 sm:p-7">
          <h2 className="text-[clamp(1.25rem,2.2vw,1.6rem)] font-bold text-[#161B18] mb-4">
            Call Nurse — Select Request Type
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              type="button"
              onClick={() => void handleNurseCall('water', 'Drinking Water')}
              className="min-h-[96px] p-5 rounded-2xl bg-[#EFF8FF] border-2 border-[#7DD3FC] text-[#0369A1] font-extrabold text-xl flex flex-col items-center justify-center gap-2 hover:bg-[#E0F2FE] cursor-pointer"
            >
              <Droplets className="w-8 h-8" />
              <span>Water</span>
            </button>

            <button
              type="button"
              onClick={() => void handleNurseCall('pain', 'Pain Assistance')}
              className="min-h-[96px] p-5 rounded-2xl bg-[#FEF2F2] border-2 border-[#FCA5A5] text-[#DC2626] font-extrabold text-xl flex flex-col items-center justify-center gap-2 hover:bg-[#FEE2E2] cursor-pointer"
            >
              <AlertCircle className="w-8 h-8" />
              <span>Pain</span>
            </button>

            <button
              type="button"
              onClick={() => void handleNurseCall('washroom', 'Washroom Help')}
              className="min-h-[96px] p-5 rounded-2xl bg-[#FBF0DC] border-2 border-[#FCD34D] text-[#B45309] font-extrabold text-xl flex flex-col items-center justify-center gap-2 hover:bg-[#FEF3C7] cursor-pointer"
            >
              <Bath className="w-8 h-8" />
              <span>Washroom</span>
            </button>

            <button
              type="button"
              onClick={() => void handleNurseCall('help', 'General Nurse Help')}
              className="min-h-[96px] p-5 rounded-2xl bg-[#EAF3ED] border-2 border-[#86EFAC] text-[#134E32] font-extrabold text-xl flex flex-col items-center justify-center gap-2 hover:bg-[#DCF0E3] cursor-pointer"
            >
              <HelpCircle className="w-8 h-8" />
              <span>Help</span>
            </button>
          </div>
        </section>

        {/* Bedside Quick Spoken Phrases */}
        <section className="rounded-3xl bg-white border-2 border-[#E2E7E3] p-5 sm:p-7">
          <h2 className="text-[clamp(1.2rem,2vw,1.5rem)] font-bold text-[#161B18] mb-3">
            Bedside Spoken Phrases
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {BEDSIDE_PHRASES.map((phrase) => (
              <button
                key={phrase}
                type="button"
                onClick={() => handlePhrase(phrase)}
                className="min-h-[72px] p-4 rounded-2xl bg-[#F7F9F7] border-2 border-[#CBD5E1] text-[#161B18] font-bold text-base inline-flex items-center justify-between gap-3 hover:border-[#134E32] cursor-pointer"
              >
                <span className="text-left">{phrase}</span>
                <Volume2 className="w-5 h-5 text-[#134E32] shrink-0" />
              </button>
            ))}
          </div>
        </section>

        {/* Read-Only Hospital Emergency Contacts (Ambulance + Nurse Station + Doctors + Family) */}
        <EmergencyPanel
          mode="hospital"
          role="patient"
          contacts={store.contacts}
          onTriggerSos={() => triggerSosCountdown('Hospital Emergency Panel Button')}
        />
      </div>
    </div>
  );
};
