/**
 * HospitalNurseDashboard.tsx - Hospital / Nurse Live Station (/hospital/nurse)
 * Features live request & SOS alert queue (showing Room & Bed clearly), ward task list,
 * patient roster, mark alerts handled, and full editable Emergency Contacts.
 */

import React, { useEffect, useState } from 'react';
import {
  ClipboardCheck,
  BellRing,
  CheckCircle2,
  BedDouble,
  Users,
} from 'lucide-react';
import {
  getStoreSnapshot,
  resolveAlert,
  setActivePatientId,
  subscribeToStore,
  toggleNurseTask,
} from '../../lib/data/sanjeevaniStore';
import { EmergencyPanel } from '../emergency/EmergencyPanel';
import type { SanjeevaniStoreState } from '../../lib/data/types';

export const HospitalNurseDashboard: React.FC = () => {
  const [store, setStore] = useState<SanjeevaniStoreState>(getStoreSnapshot);

  useEffect(() => {
    return subscribeToStore(setStore);
  }, []);

  const unhandledAlerts = store.alerts.filter((a) => !a.handled);
  const handledAlerts = store.alerts.filter((a) => a.handled).slice(0, 5);

  return (
    <div className="min-h-dvh w-full bg-[#F3F5F3] py-6 pb-16">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        <header className="rounded-3xl bg-white border-2 border-[#E2E7E3] p-5 sm:p-7 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-extrabold uppercase tracking-wider mb-2">
              <ClipboardCheck className="w-4 h-4" />
              <span>Hospital Mode · Nursing Station Queue</span>
            </span>
            <h1 className="text-[clamp(1.6rem,3.5vw,2.35rem)] font-bold text-[#161B18]">
              Live Bedside Requests &amp; Ward Tasks
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-4 py-2 rounded-2xl bg-red-50 border border-red-200 text-red-800 font-extrabold text-sm">
              {unhandledAlerts.length} Pending Requests / Alerts
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Live Request & Alert Queue (Room & Bed highlighted) */}
          <section className="lg:col-span-7 rounded-3xl bg-white border border-[#E2E7E3] p-5 sm:p-6">
            <h2 className="text-xl font-bold text-[#161B18] flex items-center gap-2 mb-4">
              <BellRing className="w-5 h-5 text-red-600" />
              <span>Live Bedside Request &amp; SOS Queue</span>
            </h2>

            {unhandledAlerts.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#F0FDF4] border border-[#86EFAC] text-center text-[#166534] font-bold">
                All bedside requests and SOS alerts have been handled.
              </div>
            ) : (
              <div className="space-y-3">
                {unhandledAlerts.map((a) => (
                  <div
                    key={a.id}
                    className={`rounded-2xl p-4 border-2 flex flex-wrap items-center justify-between gap-4 ${
                      a.severity === 'high'
                        ? 'bg-red-50 border-red-400'
                        : a.severity === 'medium'
                          ? 'bg-amber-50 border-amber-300'
                          : 'bg-[#F8FAFC] border-[#CBD5E1]'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#161B18] text-white text-xs font-extrabold">
                          <BedDouble className="w-3.5 h-3.5" />
                          {a.roomBed}
                        </span>
                        <span className="text-xs font-bold uppercase text-[#4F5B54]">
                          {a.patientName} · {new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <h3 className="text-lg font-extrabold text-[#161B18]">{a.title}</h3>
                      <p className="text-sm text-[#4F5B54]">{a.message}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => void resolveAlert(a.id, 'On-Duty Nurse')}
                      className="min-h-[56px] px-5 py-3 rounded-xl bg-[#134E32] text-white font-bold inline-flex items-center gap-2 hover:bg-[#0E3D27] cursor-pointer"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Mark Handled</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {handledAlerts.length > 0 && (
              <div className="mt-6 pt-4 border-t border-[#E2E7E3]">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#4F5B54] mb-2">
                  Recently Handled
                </h3>
                <div className="space-y-2">
                  {handledAlerts.map((a) => (
                    <div
                      key={a.id}
                      className="text-xs text-[#4F5B54] flex items-center justify-between bg-[#F8FAFC] px-3 py-2 rounded-lg"
                    >
                      <span>
                        <strong>{a.roomBed}</strong> ({a.patientName}) — {a.title}
                      </span>
                      <span className="text-emerald-700 font-bold">Done</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Ward Task List & Patient Roster */}
          <div className="lg:col-span-5 space-y-6">
            <section className="rounded-3xl bg-white border border-[#E2E7E3] p-5 sm:p-6">
              <h2 className="text-xl font-bold text-[#161B18] flex items-center gap-2 mb-4">
                <ClipboardCheck className="w-5 h-5 text-[#0F766E]" />
                <span>Shift Nursing Tasks</span>
              </h2>
              <div className="space-y-2.5">
                {store.nurseTasks.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleNurseTask(t.id)}
                    className={`w-full text-left p-3.5 rounded-2xl border flex items-start justify-between gap-3 cursor-pointer ${
                      t.completed
                        ? 'bg-[#F0FDF4] border-[#86EFAC] opacity-75'
                        : 'bg-[#F8FAFC] border-[#CBD5E1]'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-extrabold text-[#0F766E]">
                        {t.roomBed} · {t.patientName} ({t.dueTime})
                      </div>
                      <div className={`font-bold text-sm mt-0.5 ${t.completed ? 'line-through text-[#4F5B54]' : 'text-[#161B18]'}`}>
                        {t.title}
                      </div>
                    </div>
                    <CheckCircle2
                      className={`w-6 h-6 shrink-0 ${t.completed ? 'text-emerald-700' : 'text-slate-300'}`}
                    />
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-3xl bg-white border border-[#E2E7E3] p-5 sm:p-6">
              <h2 className="text-xl font-bold text-[#161B18] flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-[#134E32]" />
                <span>Ward Patients</span>
              </h2>
              <div className="space-y-2">
                {store.patients.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setActivePatientId(p.id)}
                    className="p-3 rounded-xl bg-[#F7F9F7] border border-[#E2E7E3] flex items-center justify-between gap-2 cursor-pointer hover:border-[#134E32]"
                  >
                    <div>
                      <strong className="text-sm text-[#161B18]">{p.name}</strong>
                      <div className="text-xs text-[#4F5B54]">{p.roomBed} · SpO2 {p.vitals.spo2}%</div>
                    </div>
                    <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-white border border-black/10">
                      {p.urgency}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* Editable Hospital Emergency & Nurse Station Contacts */}
        <EmergencyPanel mode="hospital" role="nurse" contacts={store.contacts} />
      </div>
    </div>
  );
};
