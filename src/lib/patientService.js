/**
 * patientService.js - Single Source of Truth for Patient Record
 * Owner: Shared Service / Dev 3 (Caregiver & Patient Store)
 * 
 * Simple explanation:
 * Manages the single shared patient record ("demo-patient").
 * If Firebase is configured, it syncs with Firestore in real-time.
 * If Firebase is unconfigured or offline, it automatically falls back
 * to browser localStorage with identical real-time event updates.
 * Zero-config guaranteed!
 */

import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase.js';
import { checkInteractions } from './interactions.js';
import {
  generateStableId,
  getLocalDateString,
  getMedicineId,
  getMedicineTimes,
  findActiveDoseLog
} from './medicineUtils.js';

const STORAGE_KEY = 'sanjeevani_patient_record';
const EVENT_NAME = 'sanjeevani_record_updated';
const COLLECTION_NAME = 'patients';
const DOC_ID = 'demo-patient';

// Default initial demo state (fully customizable by user/caregiver/doctor)
export const DEFAULT_PATIENT = {
  name: 'Ramesh Kumar',
  age: 62,
  gender: 'Male',
  language: 'Hindi',
  roomNo: 'Ward 4B - Bed 12',
  emergencyContact: '+91 98765 43210',
  livingNote: 'At home with family. Speaks quietly.',
  quickAlert: null,      // e.g. "🚻 Washroom Urgency (Just now)"
  symptoms: [],          // array of strings, written by Patient page
  urgency: 'Low',        // "Low" | "Medium" | "High", written by triage
  aiSummary: 'Patient is resting. No critical symptoms reported yet.',
  emergency: false,      // true when Emergency Help is pressed
  medicines: [
    { name: 'Metformin', time: 'Morning', taken: true },
    { name: 'Amlodipine', time: 'Night', taken: false }
  ],
  doseLogs: [],          // Phase 2: date-based daily dose tracking & history
  warnings: [],          // array of warning strings from interactions.js
  appointment: null,     // { doctorId, doctorName, time, videoLink }
  doctorNotes: 'Patient has history of hypertension and Type-2 Diabetes. Monitor vitals and adherence.',
  updatedAt: new Date().toISOString()
};

// ---------------------------------------------------------------------------
// LocalStorage Helper Functions (Fallback Engine)
// ---------------------------------------------------------------------------
function getLocalPatient() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PATIENT));
      return { ...DEFAULT_PATIENT };
    }
    return JSON.parse(raw);
  } catch (e) {
    console.warn('[patientService] LocalStorage read error:', e);
    return { ...DEFAULT_PATIENT };
  }
}

function saveLocalPatient(patientData) {
  const updated = {
    ...patientData,
    updatedAt: new Date().toISOString()
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: updated }));
  } catch (e) {
    console.error('[patientService] LocalStorage write error:', e);
  }
  return updated;
}

// ---------------------------------------------------------------------------
// Public Exported Service API
// ---------------------------------------------------------------------------

/**
 * Reads the latest patient record.
 */
export async function getPatient() {
  if (!db) {
    return getLocalPatient();
  }

  try {
    const docRef = doc(db, COLLECTION_NAME, DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    } else {
      // Seed initial record if missing
      await setDoc(docRef, DEFAULT_PATIENT);
      return { ...DEFAULT_PATIENT };
    }
  } catch (error) {
    console.warn('[patientService] Firestore getPatient error, falling back to local:', error);
    return getLocalPatient();
  }
}

/**
 * Subscribes to live updates. Returns an unsubscribe function.
 * Caregiver dashboard uses this to stay in sync in real time.
 */
export function subscribeToPatient(callback) {
  // If Firestore is not initialized, use localStorage event listener
  if (!db) {
    const initial = getLocalPatient();
    callback(initial);

    const handleCustomEvent = (e) => callback(e.detail || getLocalPatient());
    const handleStorageEvent = (e) => {
      if (e.key === STORAGE_KEY) callback(getLocalPatient());
    };

    window.addEventListener(EVENT_NAME, handleCustomEvent);
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      window.removeEventListener(EVENT_NAME, handleCustomEvent);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }

  // Firestore live subscription
  const docRef = doc(db, COLLECTION_NAME, DOC_ID);
  let unsubFirestore = null;

  try {
    unsubFirestore = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          callback(snapshot.data());
        } else {
          // Auto-seed demo patient if document does not exist yet
          setDoc(docRef, DEFAULT_PATIENT).then(() => callback(DEFAULT_PATIENT));
        }
      },
      (error) => {
        console.warn('[patientService] Firestore snapshot error, falling back to localStorage:', error);
        // Fallback to local
        callback(getLocalPatient());
        const handleCustomEvent = (e) => callback(e.detail || getLocalPatient());
        window.addEventListener(EVENT_NAME, handleCustomEvent);
      }
    );
  } catch (err) {
    console.warn('[patientService] Firestore subscription failed:', err);
    callback(getLocalPatient());
  }

  return () => {
    if (unsubFirestore) unsubFirestore();
  };
}

/**
 * Adds a symptom string to the patient's record.
 */
export async function addSymptom(symptom) {
  const current = await getPatient();
  const symptoms = current.symptoms || [];

  if (!symptoms.includes(symptom)) {
    symptoms.push(symptom);
  }

  const updates = { symptoms, updatedAt: new Date().toISOString() };

  if (!db) {
    return saveLocalPatient({ ...current, ...updates });
  }

  try {
    const docRef = doc(db, COLLECTION_NAME, DOC_ID);
    await updateDoc(docRef, updates);
    return { ...current, ...updates };
  } catch (e) {
    console.warn('[patientService] Firestore addSymptom error, saving locally:', e);
    return saveLocalPatient({ ...current, ...updates });
  }
}

/**
 * Updates the urgency and AI summary from triage.js.
 */
export async function setTriageResult({ urgency, aiSummary }) {
  const current = await getPatient();
  const updates = {
    urgency: urgency || 'Low',
    aiSummary: aiSummary || '',
    updatedAt: new Date().toISOString()
  };

  if (!db) {
    return saveLocalPatient({ ...current, ...updates });
  }

  try {
    const docRef = doc(db, COLLECTION_NAME, DOC_ID);
    await updateDoc(docRef, updates);
    return { ...current, ...updates };
  } catch (e) {
    console.warn('[patientService] Firestore setTriageResult error, saving locally:', e);
    return saveLocalPatient({ ...current, ...updates });
  }
}

/**
 * Triggers the emergency state and sets urgency to High.
 */
export async function triggerEmergency() {
  const current = await getPatient();
  const updates = {
    emergency: true,
    urgency: 'High',
    aiSummary: 'EMERGENCY ALERT: Immediate caregiver and medical intervention required.',
    updatedAt: new Date().toISOString()
  };

  if (!db) {
    return saveLocalPatient({ ...current, ...updates });
  }

  try {
    const docRef = doc(db, COLLECTION_NAME, DOC_ID);
    await updateDoc(docRef, updates);
    return { ...current, ...updates };
  } catch (e) {
    console.warn('[patientService] Firestore triggerEmergency error, saving locally:', e);
    return saveLocalPatient({ ...current, ...updates });
  }
}

/**
 * Non-destructive migration helper: ensures every medicine has a stable `id`
 * without altering or overwriting existing fields.
 */
function ensureMedicineIds(medicines = []) {
  return medicines.map((m) => (m.id ? m : { ...m, id: getMedicineId(m) }));
}

/**
 * Computes whether all scheduled doses for a given medicine are taken on `dateStr`
 * so legacy `med.taken` stays synced for Caregiver.jsx / Doctors.jsx.
 */
function isMedicineFullyTakenForDate(med, doseLogs, dateStr) {
  const medId = getMedicineId(med);
  const times = getMedicineTimes(med);
  return times.length > 0 && times.every((t) => Boolean(findActiveDoseLog(doseLogs, medId, t, dateStr)));
}

/**
 * Adds a new medicine, runs drug interaction checks, and updates active warnings.
 * Compatible with both legacy `{ name, time }` (Doctors.jsx) and Phase 2
 * `{ name, dosage, frequency, times, instructions }` payloads.
 */
export async function addMedicine({ name, time, dosage, frequency, times, instructions } = {}) {
  if (!name || !name.trim()) return;
  const current = await getPatient();
  const medicines = ensureMedicineIds([...(current.medicines || [])]);

  const resolvedTimes =
    Array.isArray(times) && times.length > 0
      ? times.map((t) => String(t).trim()).filter(Boolean)
      : [time || 'Morning'];

  const newEntry = {
    id: generateStableId('med'),
    name: name.trim(),
    dosage: typeof dosage === 'string' ? dosage.trim() : '',
    frequency: typeof frequency === 'string' ? frequency.trim() : '',
    times: resolvedTimes,
    time: resolvedTimes.join(', '),
    instructions: typeof instructions === 'string' ? instructions.trim() : '',
    taken: false,
    createdAt: new Date().toISOString()
  };

  medicines.push(newEntry);

  // Re-run drug interaction safety checks
  const warnings = checkInteractions(medicines);

  const updates = {
    medicines,
    warnings,
    updatedAt: new Date().toISOString()
  };

  if (!db) {
    return saveLocalPatient({ ...current, ...updates });
  }

  try {
    const docRef = doc(db, COLLECTION_NAME, DOC_ID);
    await updateDoc(docRef, updates);
    return { ...current, ...updates };
  } catch (e) {
    console.warn('[patientService] Firestore addMedicine error, saving locally:', e);
    return saveLocalPatient({ ...current, ...updates });
  }
}

/**
 * Records a specific scheduled dose as taken for a given date (defaults to today).
 * Prevents duplicate active 'taken' records for the same (medicineId, scheduledTime, date).
 */
export async function recordDoseTaken({ medicineId, scheduledTime, date } = {}) {
  if (!medicineId || !scheduledTime) return;
  const dateStr = date || getLocalDateString();
  const current = await getPatient();
  const medicines = ensureMedicineIds([...(current.medicines || [])]);
  const doseLogs = [...(current.doseLogs || [])];

  const medIndex = medicines.findIndex((m) => getMedicineId(m) === medicineId);
  if (medIndex === -1) return;

  // Prevent duplicate recording of the same scheduled dose on the same date
  if (findActiveDoseLog(doseLogs, medicineId, scheduledTime, dateStr)) {
    return current;
  }

  const targetMed = medicines[medIndex];
  doseLogs.push({
    id: generateStableId('dose'),
    medicineId,
    medicineName: targetMed.name,
    dosage: targetMed.dosage || '',
    scheduledTime,
    date: dateStr,
    status: 'taken',
    recordedAt: new Date().toISOString(),
    undoneAt: null
  });

  medicines[medIndex] = {
    ...targetMed,
    taken: isMedicineFullyTakenForDate(targetMed, doseLogs, dateStr)
  };

  const updates = {
    medicines,
    doseLogs,
    updatedAt: new Date().toISOString()
  };

  if (!db) {
    return saveLocalPatient({ ...current, ...updates });
  }

  try {
    const docRef = doc(db, COLLECTION_NAME, DOC_ID);
    await updateDoc(docRef, updates);
    return { ...current, ...updates };
  } catch (e) {
    console.warn('[patientService] Firestore recordDoseTaken error, saving locally:', e);
    return saveLocalPatient({ ...current, ...updates });
  }
}

/**
 * Reverses (undoes) an accidentally marked dose for a given date while preserving dose history.
 */
export async function undoDose({ medicineId, scheduledTime, date } = {}) {
  if (!medicineId || !scheduledTime) return;
  const dateStr = date || getLocalDateString();
  const current = await getPatient();
  const medicines = ensureMedicineIds([...(current.medicines || [])]);
  const doseLogs = [...(current.doseLogs || [])];

  let changed = false;
  const updatedLogs = doseLogs.map((log) => {
    if (
      log.medicineId === medicineId &&
      log.scheduledTime === scheduledTime &&
      log.date === dateStr &&
      log.status === 'taken'
    ) {
      changed = true;
      return {
        ...log,
        status: 'undone',
        undoneAt: new Date().toISOString()
      };
    }
    return log;
  });

  if (!changed) return current;

  const medIndex = medicines.findIndex((m) => getMedicineId(m) === medicineId);
  if (medIndex !== -1) {
    medicines[medIndex] = {
      ...medicines[medIndex],
      taken: isMedicineFullyTakenForDate(medicines[medIndex], updatedLogs, dateStr)
    };
  }

  const updates = {
    medicines,
    doseLogs: updatedLogs,
    updatedAt: new Date().toISOString()
  };

  if (!db) {
    return saveLocalPatient({ ...current, ...updates });
  }

  try {
    const docRef = doc(db, COLLECTION_NAME, DOC_ID);
    await updateDoc(docRef, updates);
    return { ...current, ...updates };
  } catch (e) {
    console.warn('[patientService] Firestore undoDose error, saving locally:', e);
    return saveLocalPatient({ ...current, ...updates });
  }
}

/**
 * Legacy-compatible wrapper: marks the first pending scheduled dose (or all doses) at `index` as taken.
 */
export async function markMedicineTaken(index) {
  const current = await getPatient();
  const medicines = ensureMedicineIds([...(current.medicines || [])]);
  const target = medicines[index];
  if (!target) return;

  const times = getMedicineTimes(target);
  const dateStr = getLocalDateString();
  const doseLogs = current.doseLogs || [];
  const nextPending = times.find((t) => !findActiveDoseLog(doseLogs, target.id, t, dateStr)) || times[0];

  return recordDoseTaken({
    medicineId: target.id,
    scheduledTime: nextPending,
    date: dateStr
  });
}

/**
 * Books an appointment with a doctor and generates a mock video consultation link.
 */
export async function bookAppointment(doctor) {
  const current = await getPatient();
  const randomRoom = Math.random().toString(36).substring(2, 8);
  const videoLink = `https://meet.sanjeevani.demo/${randomRoom}`;

  const appointment = {
    doctorId: doctor.id,
    doctorName: doctor.name,
    time: doctor.availableTime,
    specialty: doctor.specialty,
    videoLink
  };

  const updates = { appointment, updatedAt: new Date().toISOString() };

  if (!db) {
    return saveLocalPatient({ ...current, ...updates });
  }

  try {
    const docRef = doc(db, COLLECTION_NAME, DOC_ID);
    await updateDoc(docRef, updates);
    return { ...current, ...updates };
  } catch (e) {
    console.warn('[patientService] Firestore bookAppointment error, saving locally:', e);
    return saveLocalPatient({ ...current, ...updates });
  }
}

/**
 * Saves clinical diagnosis notes written by the doctor.
 */
export async function saveDoctorNotes(notes) {
  const current = await getPatient();
  const updates = { doctorNotes: notes, updatedAt: new Date().toISOString() };

  if (!db) {
    return saveLocalPatient({ ...current, ...updates });
  }

  try {
    const docRef = doc(db, COLLECTION_NAME, DOC_ID);
    await updateDoc(docRef, updates);
    return { ...current, ...updates };
  } catch (e) {
    console.warn('[patientService] Firestore saveDoctorNotes error, saving locally:', e);
    return saveLocalPatient({ ...current, ...updates });
  }
}

/**
 * Updates the patient's preferred language across all records and subscribers.
 */
export async function setPatientLanguage(languageName) {
  const current = await getPatient();
  const updates = { language: languageName, updatedAt: new Date().toISOString() };

  if (!db) {
    return saveLocalPatient({ ...current, ...updates });
  }

  try {
    const docRef = doc(db, COLLECTION_NAME, DOC_ID);
    await updateDoc(docRef, updates);
    return { ...current, ...updates };
  } catch (e) {
    console.warn('[patientService] Firestore setPatientLanguage error, saving locally:', e);
    return saveLocalPatient({ ...current, ...updates });
  }
}

/**
 * Updates any patient profile demographic fields:
 * { name, age, gender, language, roomNo, emergencyContact, livingNote }
 */
export async function updatePatientProfile(profileData) {
  const current = await getPatient();
  const updates = {
    ...profileData,
    updatedAt: new Date().toISOString()
  };

  if (!db) {
    return saveLocalPatient({ ...current, ...updates });
  }

  try {
    const docRef = doc(db, COLLECTION_NAME, DOC_ID);
    await updateDoc(docRef, updates);
    return { ...current, ...updates };
  } catch (e) {
    console.warn('[patientService] Firestore updatePatientProfile error, saving locally:', e);
    return saveLocalPatient({ ...current, ...updates });
  }
}

/**
 * Sets an instant assistance alert (e.g. Washroom Urgency, Need Water)
 * for the live caregiver dashboard feed.
 */
export async function setQuickAlert(alertText) {
  const current = await getPatient();
  const updates = {
    quickAlert: alertText,
    updatedAt: new Date().toISOString()
  };

  if (!db) {
    return saveLocalPatient({ ...current, ...updates });
  }

  try {
    const docRef = doc(db, COLLECTION_NAME, DOC_ID);
    await updateDoc(docRef, updates);
    return { ...current, ...updates };
  } catch (e) {
    console.warn('[patientService] Firestore setQuickAlert error, saving locally:', e);
    return saveLocalPatient({ ...current, ...updates });
  }
}

/**
 * Clears the instant assistance alert.
 */
export async function clearQuickAlert() {
  return setQuickAlert(null);
}

/**
 * Removes a medicine by stable `id` (or numeric index for legacy callers),
 * then re-runs drug interaction checks. Preserves historical doseLogs.
 */
export async function removeMedicine(idOrIndex) {
  const current = await getPatient();
  const medicines = ensureMedicineIds([...(current.medicines || [])]);

  let targetIdx = -1;
  if (typeof idOrIndex === 'string') {
    targetIdx = medicines.findIndex((m) => getMedicineId(m) === idOrIndex);
  } else if (typeof idOrIndex === 'number') {
    targetIdx = idOrIndex;
  }

  if (targetIdx < 0 || targetIdx >= medicines.length) return;
  medicines.splice(targetIdx, 1);

  // Re-evaluate interactions with the updated list
  const warnings = checkInteractions(medicines);

  const updates = {
    medicines,
    warnings,
    updatedAt: new Date().toISOString()
  };

  if (!db) {
    return saveLocalPatient({ ...current, ...updates });
  }

  try {
    const docRef = doc(db, COLLECTION_NAME, DOC_ID);
    await updateDoc(docRef, updates);
    return { ...current, ...updates };
  } catch (e) {
    console.warn('[patientService] Firestore removeMedicine error, saving locally:', e);
    return saveLocalPatient({ ...current, ...updates });
  }
}

/**
 * Clears the emergency flag without touching urgency or symptoms.
 * Called by the caregiver "Mark Resolved" action.
 */
export async function clearEmergency() {
  const current = await getPatient();
  const updates = {
    emergency: false,
    updatedAt: new Date().toISOString()
  };

  if (!db) {
    return saveLocalPatient({ ...current, ...updates });
  }

  try {
    const docRef = doc(db, COLLECTION_NAME, DOC_ID);
    await updateDoc(docRef, updates);
    return { ...current, ...updates };
  } catch (e) {
    console.warn('[patientService] Firestore clearEmergency error, saving locally:', e);
    return saveLocalPatient({ ...current, ...updates });
  }
}

/**
 * Resets the demo state back to default.
 */
export async function resetPatient() {
  const fresh = {
    ...DEFAULT_PATIENT,
    updatedAt: new Date().toISOString()
  };

  if (!db) {
    return saveLocalPatient(fresh);
  }

  try {
    const docRef = doc(db, COLLECTION_NAME, DOC_ID);
    await setDoc(docRef, fresh);
    return fresh;
  } catch (e) {
    console.warn('[patientService] Firestore resetPatient error, saving locally:', e);
    return saveLocalPatient(fresh);
  }
}
