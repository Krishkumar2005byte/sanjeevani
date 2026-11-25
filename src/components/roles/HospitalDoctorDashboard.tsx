/**
 * HospitalDoctorDashboard.tsx - Hospital / Doctor Clinical Workspace (/hospital/doctor)
 * Includes multi-patient roster, patient detail (vitals, symptoms, notes, medicines),
 * live clinical alerts, "Call Nurse", and direct link to full telemedicine directory.
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Stethoscope,
  Users,
  HeartPulse,
  PhoneCall,
  BellRing,
  FileText,
  Pill,
  CheckCircle2,
} from 'lucide-react';
import {
  getStoreSnapshot,
  pushAlert,
  resolveAlert,
  setActivePatientId,
  subscribeToStore,
  updatePatientClinicalNotes,
} from '../../lib/data/sanjeevaniStore';
import { addMedicine, subscribeToPatient } from '../../lib/patientService.js';
import type { SanjeevaniStoreState } from '../../lib/data/types';

export const HospitalDoctorDashboard: React.FC = () => {
  const [store, setStore] = useState<SanjeevaniStoreState>(getStoreSnapshot);
  const [selectedId, setSelectedId] = useState<string>(store.activePatientId);
  const selectedPatient =
    store.patients.find((p) => p.id === selectedId) || store.patients[0];

  const [notesDraft, setNotesDraft] = useState(() => selectedPatient?.doctorNotes || '');
  const [notesSaved, setNotesSaved] = useState(false);
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('1 tablet · Morning & Night');
  const [legacyMeds, setLegacyMeds] = useState<Array<{ name: string; dosage?: string; time?: string }>>([]);
  const [nursePagedToast, setNursePagedToast] = useState(false);

  useEffect(() => {
    const unsubStore = subscribeToStore(setStore);
    const unsubLegacy = subscribeToPatient((d: { medicines?: Array<{ name: string; dosage?: string; time?: string }> }) => {
      setLegacyMeds(d?.medicines || []);
    });
    return () => {
      unsubStore();
      if (unsubLegacy) unsubLegacy();
    };
  }, []);

  const nurseContact = store.contacts.find((c) => c.category === 'nurse_station');
  const activeAlerts = store.alerts.filter((a) => !a.handled);

  const handleSaveNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    await updatePatientClinicalNotes(selectedPatient.id, notesDraft);
    setNotesSaved(true);
    window.setTimeout(() => setNotesSaved(false), 2500);
  };

  const handleQuickPrescribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medName.trim()) return;
    await addMedicine({ name: medName.trim(), dosage: medDosage, time: 'Evening' });
    setMedName('');
  };

  const handleCallNurse = () => {
    pushAlert({
      type: 'nurse_call',
      title: `Doctor Request for ${selectedPatient.roomBed}`,
      message: `Attending Doctor requested nursing support for ${selectedPatient.name} (${selectedPatient.roomBed}).`,
      mode: 'hospital',
      patientId: selectedPatient.id,
      patientName: selectedPatient.name,
      roomBed: selectedPatient.roomBed,
      severity: 'medium',
    });
    setNursePagedToast(true);
    window.setTimeout(() => setNursePagedToast(false), 4000);
  };

  return (
    <div className="min-h-dvh w-full bg-[#F3F5F3] py-6 pb-16">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        <header className="rounded-3xl bg-white border-2 border-[#E2E7E3] p-5 sm:p-7 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFF8FF] text-[#0369A1] text-xs font-extrabold uppercase tracking-wider mb-2">
              <Stethoscope className="w-4 h-4" />
              <span>Hospital Mode · Doctor Clinical Portal</span>
            </span>
            <h1 className="text-[clamp(1.6rem,3.5vw,2.35rem)] font-bold text-[#161B18]">
              Inpatient Rounds &amp; Alerts
            </h1>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleCallNurse}
              className="min-h-[56px] px-5 py-3 rounded-2xl bg-[#0369A1] text-white font-bold inline-flex items-center gap-2 cursor-pointer"
            >
              <BellRing className="w-5 h-5" />
              <span>Page Nurse Station</span>
            </button>

            {nurseContact && (
              <a
                href={`tel:${nurseContact.phone.replace(/\s+/g, '')}`}
                className="min-h-[56px] px-5 py-3 rounded-2xl bg-[#134E32] text-white font-bold inline-flex items-center gap-2"
              >
                <PhoneCall className="w-5 h-5" />
                <span>Call Nurse ({nurseContact.phone})</span>
              </a>
            )}

            <Link
              to="/doctors"
              className="min-h-[56px] px-5 py-3 rounded-2xl bg-white border-2 border-[#CBD5E1] text-[#161B18] font-bold inline-flex items-center"
            >
              Full Doctor Directory →
            </Link>
          </div>
        </header>

        {nursePagedToast && (
          <div className="rounded-2xl bg-[#EFF8FF] border-2 border-[#0369A1] text-[#0369A1] p-4 font-bold">
            Nurse Station alerted for {selectedPatient.name} ({selectedPatient.roomBed}).
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Patient Roster Column */}
          <aside className="lg:col-span-4 space-y-4">
            <div className="rounded-3xl bg-white border border-[#E2E7E3] p-5">
              <h2 className="text-lg font-bold text-[#161B18] flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-[#0369A1]" />
                <span>Admitted Patients ({store.patients.length})</span>
              </h2>
              <div className="space-y-3">
                {store.patients.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(p.id);
                      setNotesDraft(p.doctorNotes || '');
                      setActivePatientId(p.id);
                    }}
                    className={`w-full text-left p-4 rounded-2xl border-2 transition cursor-pointer ${
                      p.id === selectedPatient.id
                        ? 'bg-[#EFF8FF] border-[#0369A1]'
                        : 'bg-[#F8FAFC] border-[#E2E7E3] hover:border-[#94A3B8]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-base text-[#161B18]">{p.name}</strong>
                      <span
                        className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                          p.urgency === 'High'
                            ? 'bg-red-100 text-red-700'
                            : p.urgency === 'Medium'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {p.urgency}
                      </span>
                    </div>
                    <p className="text-xs text-[#4F5B54] mt-1">
                      Age {p.age} · {p.roomBed}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Active Hospital Alerts */}
            <div className="rounded-3xl bg-white border border-[#E2E7E3] p-5">
              <h2 className="text-lg font-bold text-[#161B18] flex items-center gap-2 mb-3">
                <BellRing className="w-5 h-5 text-red-600" />
                <span>Priority Alerts ({activeAlerts.length})</span>
              </h2>
              {activeAlerts.length === 0 ? (
                <p className="text-sm text-[#4F5B54]">No unhandled ward alerts.</p>
              ) : (
                <div className="space-y-2.5">
                  {activeAlerts.slice(0, 5).map((a) => (
                    <div key={a.id} className="p-3 rounded-xl bg-red-50/70 border border-red-200">
                      <div className="font-bold text-sm text-[#161B18]">{a.title}</div>
                      <div className="text-xs text-[#4F5B54]">{a.roomBed} · {a.patientName}</div>
                      <button
                        type="button"
                        onClick={() => void resolveAlert(a.id, 'Doctor')}
                        className="mt-2 px-3 py-1 rounded-lg bg-[#134E32] text-white text-xs font-bold"
                      >
                        Acknowledge
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* Selected Patient Detail & Prescriptions */}
          <div className="lg:col-span-8 space-y-6">
            <section className="rounded-3xl bg-white border border-[#E2E7E3] p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-[#161B18]">
                    {selectedPatient.name} ({selectedPatient.age}y, {selectedPatient.gender})
                  </h2>
                  <p className="text-sm text-[#4F5B54]">{selectedPatient.ward} · {selectedPatient.roomBed}</p>
                </div>
                <span className="text-xs font-semibold text-[#4F5B54]">
                  Vitals updated: {selectedPatient.vitals.updatedAt}
                </span>
              </div>

              {/* Vitals Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E7E3]">
                  <span className="text-xs text-[#4F5B54] font-semibold block">Heart Rate</span>
                  <strong className="text-xl text-[#161B18] flex items-center gap-1.5">
                    <HeartPulse className="w-5 h-5 text-red-600" />
                    {selectedPatient.vitals.heartRate} bpm
                  </strong>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E7E3]">
                  <span className="text-xs text-[#4F5B54] font-semibold block">SpO2</span>
                  <strong className="text-xl text-[#161B18]">{selectedPatient.vitals.spo2}%</strong>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E7E3]">
                  <span className="text-xs text-[#4F5B54] font-semibold block">Blood Pressure</span>
                  <strong className="text-xl text-[#161B18]">{selectedPatient.vitals.bloodPressure}</strong>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E7E3]">
                  <span className="text-xs text-[#4F5B54] font-semibold block">Temperature</span>
                  <strong className="text-xl text-[#161B18]">{selectedPatient.vitals.temperatureF}</strong>
                </div>
              </div>

              {/* Clinical Notes Form */}
              <form onSubmit={handleSaveNotes} className="space-y-3">
                <label className="text-sm font-bold text-[#161B18] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#0369A1]" />
                  <span>Doctor Clinical Notes</span>
                </label>
                <textarea
                  rows={3}
                  className="w-full p-3 rounded-xl border border-[#CBD5E1] text-base"
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                />
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    className="min-h-[48px] px-5 py-2.5 rounded-xl bg-[#134E32] text-white font-bold cursor-pointer"
                  >
                    Save Notes
                  </button>
                  {notesSaved && (
                    <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700">
                      <CheckCircle2 className="w-4 h-4" /> Notes synced
                    </span>
                  )}
                </div>
              </form>
            </section>

            {/* Medicines & Prescribe */}
            <section className="rounded-3xl bg-white border border-[#E2E7E3] p-5 sm:p-6">
              <h3 className="text-lg font-bold text-[#161B18] flex items-center gap-2 mb-3">
                <Pill className="w-5 h-5 text-[#134E32]" />
                <span>Active Medicines &amp; Quick Prescribe</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {legacyMeds.map((m, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-[#F7F9F7] border border-[#E2E7E3]">
                    <div className="font-bold text-[#161B18]">{m.name}</div>
                    <div className="text-xs text-[#4F5B54]">{m.dosage || 'Standard'} · {m.time || 'Daily'}</div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleQuickPrescribe} className="flex flex-wrap gap-2">
                <input
                  type="text"
                  className="flex-1 min-w-[180px] min-h-[48px] px-3 rounded-xl border border-[#CBD5E1]"
                  placeholder="Medicine name (e.g. Paracetamol 650mg)"
                  value={medName}
                  onChange={(e) => setMedName(e.target.value)}
                />
                <input
                  type="text"
                  className="flex-1 min-w-[160px] min-h-[48px] px-3 rounded-xl border border-[#CBD5E1]"
                  value={medDosage}
                  onChange={(e) => setMedDosage(e.target.value)}
                />
                <button
                  type="submit"
                  className="min-h-[48px] px-5 py-2.5 rounded-xl bg-[#0369A1] text-white font-bold cursor-pointer"
                >
                  Prescribe
                </button>
              </form>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
