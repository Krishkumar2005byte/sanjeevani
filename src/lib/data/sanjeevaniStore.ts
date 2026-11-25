/**
 * sanjeevaniStore.ts - Single Reactive Data Layer (mock + localStorage + CustomEvent sync)
 * Synchronizes seamlessly with legacy patientService.js for zero breakage across routes.
 */

import {
  clearEmergency as clearLegacyEmergency,
  saveDoctorNotes as saveLegacyDoctorNotes,
  setQuickAlert as setLegacyQuickAlert,
  triggerEmergency as triggerLegacyEmergency,
} from '../patientService.js';
import type {
  AlertRecord,
  AppMode,
  EmergencyContact,
  PatientProfileSummary,
  SanjeevaniStoreState,
} from './types';

const STORE_KEY = 'sanjeevani_part_e_store_v1';
const STORE_EVENT = 'sanjeevani_part_e_store_changed';

const DEFAULT_STORE: SanjeevaniStoreState = {
  activePatientId: 'pat-1',
  patients: [
    {
      id: 'pat-1',
      name: 'Ramesh Kumar',
      age: 62,
      gender: 'Male',
      mode: 'home',
      ward: 'Ward 4B',
      roomBed: 'Room 402 · Bed B12',
      phone: '+91 98765 43210',
      urgency: 'Low',
      symptoms: [],
      vitals: {
        heartRate: 78,
        spo2: 98,
        bloodPressure: '124/82 mmHg',
        temperatureF: '98.4°F',
        updatedAt: 'Just now',
      },
      doctorNotes: 'Monitor hydration, maintain evening antihypertensive dose on schedule.',
      lastCheckInAt: null,
      lastCheckInMessage: null,
      mood: 'good',
    },
    {
      id: 'pat-2',
      name: 'Meera Devi',
      age: 71,
      gender: 'Female',
      mode: 'hospital',
      ward: 'Cardiology ICU',
      roomBed: 'ICU-2 · Bed 04',
      phone: '+91 98111 22334',
      urgency: 'Medium',
      symptoms: ['Chest Tightness', 'Dizziness'],
      vitals: {
        heartRate: 94,
        spo2: 95,
        bloodPressure: '146/90 mmHg',
        temperatureF: '99.1°F',
        updatedAt: '5 mins ago',
      },
      doctorNotes: 'Post-angioplasty observation. Avoid exertion; assist washroom mobility.',
      lastCheckInAt: '12 mins ago',
      lastCheckInMessage: 'Resting comfortably after morning dose',
      mood: 'tired',
    },
    {
      id: 'pat-3',
      name: 'Harpreet Singh',
      age: 58,
      gender: 'Male',
      mode: 'hospital',
      ward: 'General Ward 1',
      roomBed: 'Room 108 · Bed A2',
      phone: '+91 99100 55443',
      urgency: 'Low',
      symptoms: ['High Fever'],
      vitals: {
        heartRate: 86,
        spo2: 97,
        bloodPressure: '120/78 mmHg',
        temperatureF: '100.8°F',
        updatedAt: '8 mins ago',
      },
      doctorNotes: 'Encourage oral fluids & Paracetamol 650mg PRN >100.4°F.',
      lastCheckInAt: null,
      lastCheckInMessage: null,
      mood: 'good',
    },
  ],
  contacts: [
    {
      id: 'em-108',
      name: 'Emergency Ambulance (ALS)',
      relationOrRole: 'Ambulance Dispatch',
      phone: '108',
      category: 'ambulance',
      priority: 1,
      modeScope: 'all',
      editable: false,
    },
    {
      id: 'em-102',
      name: 'Maternity & Medical Ambulance',
      relationOrRole: 'Ambulance Transport',
      phone: '102',
      category: 'ambulance',
      priority: 2,
      modeScope: 'all',
      editable: false,
    },
    {
      id: 'em-112',
      name: 'National Emergency Response',
      relationOrRole: 'Unified Helpline',
      phone: '112',
      category: 'national',
      priority: 3,
      modeScope: 'all',
      editable: false,
    },
    {
      id: 'em-nurse',
      name: 'Ward 4B Nursing Desk',
      relationOrRole: 'On-Duty Nurse Station',
      phone: '+91 11 2658 8500',
      category: 'nurse_station',
      priority: 4,
      modeScope: 'hospital',
      editable: true,
    },
    {
      id: 'em-doc-1',
      name: 'Dr. Anjali Sharma',
      relationOrRole: 'Attending Cardiologist',
      specialty: 'Cardiologist',
      phone: '+91 98104 77889',
      category: 'doctor',
      priority: 5,
      modeScope: 'all',
      editable: true,
    },
    {
      id: 'em-fam-1',
      name: 'Aarav Kumar',
      relationOrRole: 'Son (Primary Caretaker)',
      phone: '+91 98765 43210',
      category: 'family',
      priority: 6,
      modeScope: 'all',
      editable: true,
    },
    {
      id: 'em-fam-2',
      name: 'Priya Verma',
      relationOrRole: 'Daughter',
      phone: '+91 98220 11445',
      category: 'family',
      priority: 7,
      modeScope: 'all',
      editable: true,
    },
  ],
  alerts: [
    {
      id: 'al-init-1',
      type: 'check_in',
      title: 'Morning Check-in Completed',
      message: 'Ramesh Kumar checked in: Feeling stable after breakfast dose.',
      mode: 'home',
      patientId: 'pat-1',
      patientName: 'Ramesh Kumar',
      roomBed: 'Home Residence',
      severity: 'low',
      timestamp: new Date(Date.now() - 18 * 60000).toISOString(),
      handled: false,
    },
  ],
  nurseTasks: [
    {
      id: 'tsk-1',
      patientId: 'pat-2',
      patientName: 'Meera Devi',
      roomBed: 'ICU-2 · Bed 04',
      title: 'Check SpO2 & administer afternoon Amlodipine 5mg',
      priority: 'high',
      dueTime: 'In 10 mins',
      completed: false,
    },
    {
      id: 'tsk-2',
      patientId: 'pat-3',
      patientName: 'Harpreet Singh',
      roomBed: 'Room 108 · Bed A2',
      title: 'Record temperature & assist warm sponging if >100.4°F',
      priority: 'medium',
      dueTime: 'In 25 mins',
      completed: false,
    },
    {
      id: 'tsk-3',
      patientId: 'pat-1',
      patientName: 'Ramesh Kumar',
      roomBed: 'Room 402 · Bed B12',
      title: 'Evening Metformin 500mg verification',
      priority: 'low',
      dueTime: '06:30 PM',
      completed: true,
    },
  ],
};

function readStore(): SanjeevaniStoreState {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return structuredClone(DEFAULT_STORE);
    const parsed = JSON.parse(raw) as Partial<SanjeevaniStoreState>;
    return {
      activePatientId: parsed.activePatientId || DEFAULT_STORE.activePatientId,
      patients: Array.isArray(parsed.patients) && parsed.patients.length ? parsed.patients : DEFAULT_STORE.patients,
      contacts: Array.isArray(parsed.contacts) ? parsed.contacts : DEFAULT_STORE.contacts,
      alerts: Array.isArray(parsed.alerts) ? parsed.alerts : DEFAULT_STORE.alerts,
      nurseTasks: Array.isArray(parsed.nurseTasks) ? parsed.nurseTasks : DEFAULT_STORE.nurseTasks,
    };
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
}

function writeStore(next: SanjeevaniStoreState): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(STORE_EVENT, { detail: next }));
  } catch (err) {
    console.warn('[sanjeevaniStore] Persist error:', err);
  }
}

export function getStoreSnapshot(): SanjeevaniStoreState {
  return readStore();
}

export function subscribeToStore(callback: (state: SanjeevaniStoreState) => void): () => void {
  callback(readStore());
  const onCustom = (e: Event) => {
    const ce = e as CustomEvent<SanjeevaniStoreState>;
    callback(ce.detail || readStore());
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORE_KEY) callback(readStore());
  };
  window.addEventListener(STORE_EVENT, onCustom);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(STORE_EVENT, onCustom);
    window.removeEventListener('storage', onStorage);
  };
}

export function setActivePatientId(patientId: string): void {
  const s = readStore();
  s.activePatientId = patientId;
  writeStore(s);
}

export function pushAlert(alertInput: Omit<AlertRecord, 'id' | 'timestamp' | 'handled'>): AlertRecord {
  const s = readStore();
  const record: AlertRecord = {
    ...alertInput,
    id: `al-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    handled: false,
  };
  s.alerts = [record, ...s.alerts].slice(0, 40);
  writeStore(s);
  return record;
}

export async function triggerSosAlert(mode: AppMode, sourceNote = 'Patient SOS Triggered'): Promise<AlertRecord> {
  const s = readStore();
  const pat = s.patients.find((p) => p.id === s.activePatientId) || s.patients[0];
  pat.urgency = 'High';
  const alert = pushAlert({
    type: 'sos',
    title: mode === 'hospital' ? 'CRITICAL BEDSIDE SOS' : 'CRITICAL HOME SOS ALERT',
    message: `${pat.name} triggered Emergency SOS (${sourceNote}). Immediate intervention needed.`,
    mode,
    patientId: pat.id,
    patientName: pat.name,
    roomBed: mode === 'hospital' ? pat.roomBed : 'Home Care',
    severity: 'high',
  });
  try {
    await triggerLegacyEmergency();
    await setLegacyQuickAlert(`SOS ALERT: ${pat.name} (${sourceNote})`);
  } catch {
    // offline safe
  }
  return alert;
}

export async function resolveAlert(alertId: string, handledBy = 'Staff'): Promise<void> {
  const s = readStore();
  const target = s.alerts.find((a) => a.id === alertId);
  if (target) {
    target.handled = true;
    target.handledBy = handledBy;
    if (target.type === 'sos') {
      const pat = s.patients.find((p) => p.id === target.patientId);
      if (pat) pat.urgency = 'Low';
      try {
        await clearLegacyEmergency();
      } catch {
        // ignore
      }
    }
  }
  writeStore(s);
}

export async function sendCheckInOk(
  mode: AppMode,
  mood: PatientProfileSummary['mood'] = 'good',
  customText = "I'm okay"
): Promise<void> {
  const s = readStore();
  const pat = s.patients.find((p) => p.id === s.activePatientId) || s.patients[0];
  pat.mood = mood;
  pat.lastCheckInAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  pat.lastCheckInMessage = customText;
  if (mood === 'good') {
    pat.urgency = 'Low';
  }
  writeStore(s);
  pushAlert({
    type: 'check_in',
    title: `Patient Check-in: ${customText}`,
    message: `${pat.name} sent check-in (${mood || 'good'}).`,
    mode,
    patientId: pat.id,
    patientName: pat.name,
    roomBed: mode === 'hospital' ? pat.roomBed : 'Home Care',
    severity: mood === 'pain' ? 'medium' : 'low',
  });
  try {
    await setLegacyQuickAlert(`Check-in from ${pat.name}: ${customText}`);
  } catch {
    // ignore
  }
}

export async function sendNurseCallRequest(
  requestType: 'water' | 'pain' | 'washroom' | 'help',
  mode: AppMode = 'hospital'
): Promise<void> {
  const s = readStore();
  const pat = s.patients.find((p) => p.id === s.activePatientId) || s.patients[0];
  const labels: Record<typeof requestType, string> = {
    water: 'Drinking Water Needed',
    pain: 'Pain Relief Assistance',
    washroom: 'Washroom Mobility Help',
    help: 'General Bedside Help',
  };
  const severity = requestType === 'pain' ? 'high' : requestType === 'washroom' ? 'medium' : 'low';
  pushAlert({
    type: 'nurse_call',
    title: labels[requestType],
    message: `${pat.name} (${pat.roomBed}) requested ${labels[requestType].toLowerCase()}.`,
    mode,
    patientId: pat.id,
    patientName: pat.name,
    roomBed: mode === 'hospital' ? pat.roomBed : 'Home Care',
    requestType,
    severity,
  });
  try {
    await setLegacyQuickAlert(`${pat.roomBed}: ${labels[requestType]}`);
  } catch {
    // ignore
  }
}

export async function updatePatientClinicalNotes(patientId: string, notes: string): Promise<void> {
  const s = readStore();
  const pat = s.patients.find((p) => p.id === patientId);
  if (pat) {
    pat.doctorNotes = notes;
    writeStore(s);
  }
  if (patientId === s.activePatientId) {
    try {
      await saveLegacyDoctorNotes(notes);
    } catch {
      // ignore
    }
  }
}

export function upsertEmergencyContact(contact: Omit<EmergencyContact, 'id'> & { id?: string }): void {
  const s = readStore();
  const idx = contact.id ? s.contacts.findIndex((c) => c.id === contact.id) : -1;
  if (idx >= 0) {
    s.contacts[idx] = { ...s.contacts[idx], ...contact, id: contact.id! };
  } else {
    s.contacts.push({
      ...contact,
      id: `em-${Date.now()}`,
    });
  }
  s.contacts.sort((a, b) => a.priority - b.priority);
  writeStore(s);
}

export function deleteEmergencyContact(contactId: string): void {
  const s = readStore();
  s.contacts = s.contacts.filter((c) => c.id !== contactId || !c.editable);
  writeStore(s);
}

export function toggleNurseTask(taskId: string): void {
  const s = readStore();
  const t = s.nurseTasks.find((item) => item.id === taskId);
  if (t) {
    t.completed = !t.completed;
    writeStore(s);
  }
}

export function getContactsForMode(contacts: EmergencyContact[], mode: AppMode): EmergencyContact[] {
  return contacts
    .filter((c) => c.modeScope === 'all' || c.modeScope === mode)
    .sort((a, b) => a.priority - b.priority);
}
