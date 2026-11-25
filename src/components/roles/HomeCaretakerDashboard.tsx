/**
 * HomeCaretakerDashboard.tsx - Home / Caretaker (Family) View (/home/caretaker)
 * Features patient status overview, medicine adherence & schedule, live alerts feed (SOS, quick phrases),
 * direct "Call Patient", and full editable Emergency Contacts management.
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PhoneCall,
  HeartPulse,
  BellRing,
  CheckCircle2,
  Pill,
  Activity,
  Bot,
} from 'lucide-react';
import {
  getStoreSnapshot,
  resolveAlert,
  subscribeToStore,
} from '../../lib/data/sanjeevaniStore';
import { subscribeToPatient } from '../../lib/patientService.js';
import { EmergencyPanel } from '../emergency/EmergencyPanel';
import AiHealthChatbot from '../AiHealthChatbot.jsx';
import type { SanjeevaniStoreState } from '../../lib/data/types';

interface LegacyPatientData {
  symptoms?: string[];
  urgency?: string;
  medicines?: Array<{ name: string; dosage?: string; time?: string; taken?: boolean }>;
}

export const HomeCaretakerDashboard: React.FC = () => {
  const [store, setStore] = useState<SanjeevaniStoreState>(getStoreSnapshot);
  const [legacyPatient, setLegacyPatient] = useState<LegacyPatientData | null>(null);
  const [showChatbot, setShowChatbot] = useState(false);

  useEffect(() => {
    const unsubStore = subscribeToStore(setStore);
    const unsubLegacy = subscribeToPatient((data: LegacyPatientData) => setLegacyPatient(data));
    return () => {
      unsubStore();
      if (unsubLegacy) unsubLegacy();
    };
  }, []);

  const pat = store.patients.find((p) => p.id === store.activePatientId) || store.patients[0];
  const medicines = legacyPatient?.medicines || [];
  const takenCount = medicines.filter((m) => m.taken).length;
  const adherencePct = medicines.length > 0 ? Math.round((takenCount / medicines.length) * 100) : 100;

  const homeAlerts = store.alerts.filter((a) => a.mode === 'home' || a.type === 'sos');
  const activeAlerts = homeAlerts.filter((a) => !a.handled);

  return (
    <div className="min-h-dvh w-full bg-[#F3F5F3] py-6 pb-16">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <header className="rounded-3xl bg-white border-2 border-[#E2E7E3] p-5 sm:p-7 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-block px-3 py-1 rounded-full bg-[#FBF0DC] text-[#B45309] text-xs font-extrabold uppercase tracking-wider mb-2">
              Home Mode · Caretaker / Family Dashboard
            </span>
            <h1 className="text-[clamp(1.6rem,3.5vw,2.35rem)] font-bold text-[#161B18]">
              Monitoring: {pat.name}
            </h1>
            <p className="text-sm sm:text-base text-[#4F5B54]">
              Last check-in: <strong>{pat.lastCheckInAt || 'No recent check-in'}</strong>
              {pat.lastCheckInMessage ? ` — "${pat.lastCheckInMessage}"` : ''}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href={`tel:${pat.phone.replace(/\s+/g, '')}`}
              className="min-h-[56px] px-5 py-3 rounded-2xl bg-[#134E32] text-white font-bold inline-flex items-center gap-2 hover:bg-[#0E3D27]"
            >
              <PhoneCall className="w-5 h-5" />
              <span>Call Patient ({pat.phone})</span>
            </a>

            <button
              type="button"
              onClick={() => setShowChatbot((s) => !s)}
              className="min-h-[56px] px-5 py-3 rounded-2xl bg-[#EAF3ED] border-2 border-[#134E32] text-[#134E32] font-bold inline-flex items-center gap-2 cursor-pointer"
            >
              <Bot className="w-5 h-5" />
              <span>{showChatbot ? 'Hide AI Triage' : 'AI Health Assistant'}</span>
            </button>
          </div>
        </header>

        {showChatbot && (
          <AiHealthChatbot
            patientRecord={legacyPatient || pat}
            activeSymptoms={legacyPatient?.symptoms || pat.symptoms}
            userRole="caregiver"
            onClose={() => setShowChatbot(false)}
          />
        )}

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="rounded-3xl bg-white border border-[#E2E7E3] p-5">
            <div className="flex items-center gap-2 text-[#134E32] font-bold mb-2">
              <HeartPulse className="w-5 h-5" />
              <span>Patient Status &amp; Vitals</span>
            </div>
            <div className="text-2xl font-extrabold text-[#161B18]">
              Urgency: {legacyPatient?.urgency || pat.urgency}
            </div>
            <p className="text-sm text-[#4F5B54] mt-1">
              HR: {pat.vitals.heartRate} bpm · SpO2: {pat.vitals.spo2}% · BP: {pat.vitals.bloodPressure}
            </p>
          </div>

          <div className="rounded-3xl bg-white border border-[#E2E7E3] p-5">
            <div className="flex items-center gap-2 text-[#134E32] font-bold mb-2">
              <Pill className="w-5 h-5" />
              <span>Medicine Adherence</span>
            </div>
            <div className="text-2xl font-extrabold text-[#161B18]">{adherencePct}% Today</div>
            <p className="text-sm text-[#4F5B54] mt-1">
              {takenCount} of {medicines.length} doses marked taken
            </p>
            <Link to="/medicines" className="text-sm font-bold text-[#134E32] underline mt-2 inline-block">
              Open Full Schedule →
            </Link>
          </div>

          <div className="rounded-3xl bg-white border border-[#E2E7E3] p-5">
            <div className="flex items-center gap-2 text-[#DC2626] font-bold mb-2">
              <BellRing className="w-5 h-5" />
              <span>Active Unhandled Alerts</span>
            </div>
            <div className="text-2xl font-extrabold text-[#161B18]">{activeAlerts.length} Pending</div>
            <p className="text-sm text-[#4F5B54] mt-1">
              {activeAlerts.length === 0 ? 'All calm. No urgent alerts.' : activeAlerts[0].title}
            </p>
          </div>
        </div>

        {/* Live Alerts Feed & Medicine Schedule */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="rounded-3xl bg-white border border-[#E2E7E3] p-5 sm:p-6">
            <h2 className="text-xl font-bold text-[#161B18] flex items-center gap-2 mb-4">
              <BellRing className="w-5 h-5 text-[#DC2626]" />
              <span>Live Alerts Feed (SOS, Gestures &amp; Check-ins)</span>
            </h2>
            {homeAlerts.length === 0 ? (
              <p className="text-[#4F5B54]">No alerts logged yet.</p>
            ) : (
              <div className="space-y-3">
                {homeAlerts.slice(0, 8).map((a) => (
                  <div
                    key={a.id}
                    className={`rounded-2xl p-4 border flex flex-wrap items-center justify-between gap-3 ${
                      a.handled
                        ? 'bg-[#F8FAFC] border-[#E2E7E3] opacity-70'
                        : a.severity === 'high'
                          ? 'bg-red-50 border-red-300'
                          : 'bg-[#F7F9F7] border-[#CBD5E1]'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-extrabold uppercase text-[#4F5B54]">
                        {a.type.replace('_', ' ')} · {new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <h3 className="text-base font-bold text-[#161B18]">{a.title}</h3>
                      <p className="text-sm text-[#4F5B54]">{a.message}</p>
                    </div>
                    {!a.handled ? (
                      <button
                        type="button"
                        onClick={() => void resolveAlert(a.id, 'Family Caretaker')}
                        className="min-h-[48px] px-4 py-2 rounded-xl bg-[#134E32] text-white font-bold text-sm cursor-pointer"
                      >
                        Mark Handled
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800">
                        <CheckCircle2 className="w-4 h-4" /> Handled
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl bg-white border border-[#E2E7E3] p-5 sm:p-6">
            <h2 className="text-xl font-bold text-[#161B18] flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-[#134E32]" />
              <span>Daily Medicine Schedule</span>
            </h2>
            {medicines.length === 0 ? (
              <p className="text-[#4F5B54]">No medicines prescribed.</p>
            ) : (
              <div className="space-y-3">
                {medicines.map((m, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl p-4 bg-[#F7F9F7] border border-[#E2E7E3] flex items-center justify-between gap-3"
                  >
                    <div>
                      <h3 className="font-bold text-[#161B18]">{m.name}</h3>
                      <p className="text-sm text-[#4F5B54]">
                        {m.dosage || '1 dose'} · {m.time || 'Daily'}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                        m.taken ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEF3C7] text-[#92400E]'
                      }`}
                    >
                      {m.taken ? 'Taken' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Editable Emergency Contacts Section */}
        <EmergencyPanel mode="home" role="caretaker" contacts={store.contacts} />
      </div>
    </div>
  );
};
