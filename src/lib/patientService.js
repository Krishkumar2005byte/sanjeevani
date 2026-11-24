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
  const symptoms = [...(current.symptoms || [])];

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
 * Toggles a symptom (selects if inactive, unselects if already active).
 * Returns the updated record plus { selected: boolean }.
 */
export async function toggleSymptom(symptom) {
  const current = await getPatient();
  const existing = current.symptoms || [];
  const isCurrentlySelected = existing.includes(symptom);

  const symptoms = isCurrentlySelected
    ? existing.filter((s) => s !== symptom)
    : [...existing, symptom];

  const updates = {
    symptoms,
    ...(symptoms.length === 0 ? { emergency: false } : {}),
    updatedAt: new Date().toISOString()
  };

  if (!db) {
    const saved = saveLocalPatient({ ...current, ...updates });
    return { ...saved, selected: !isCurrentlySelected };
  }

  try {
    const docRef = doc(db, COLLECTION_NAME, DOC_ID);
    await updateDoc(docRef, updates);
    return { ...current, ...updates, selected: !isCurrentlySelected };
  } catch (e) {
    console.warn('[patientService] Firestore toggleSymptom error, saving locally:', e);
    const saved = saveLocalPatient({ ...current, ...updates });
    return { ...saved, selected: !isCurrentlySelected };
  }
}

/**
 * Clears all active symptoms and resets urgency/emergency to calm baseline.
 */
export async function clearSymptoms() {
  const current = await getPatient();
  const updates = {
    symptoms: [],
    urgency: 'Low',
    emergency: false,
    aiSummary: 'Patient is resting comfortably. No symptoms reported.',
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
    console.warn('[patientService] Firestore clearSymptoms error, saving locally:', e);
    return saveLocalPatient({ ...current, ...updates });
  }
}

/**
 * Clears an active emergency flag without wiping symptoms.
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
 * Normalizes a medicine name for duplicate detection (case-insensitive, ignores parenthetical notes).
 */
export function normalizeMedicineName(name = '') {
  return name.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * Adds a new medicine (preventing duplicates), runs drug interaction checks, and updates active warnings.
 */
export async function addMedicine({ name, time }) {
  if (!name || !name.trim()) return { skipped: true };
  const current = await getPatient();
  const medicines = [...(current.medicines || [])];
  const normalizedNew = normalizeMedicineName(name);

  const existing = medicines.find((m) => normalizeMedicineName(m.name) === normalizedNew);
  if (existing) {
    return { ...current, duplicate: true, existingMedicine: existing };
  }

  medicines.push({
    name: name.trim(),
    time: time || 'Morning',
    taken: false
  });

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
 * Marks a specific medicine as taken.
 */
export async function markMedicineTaken(index) {
  const current = await getPatient();
  const medicines = [...(current.medicines || [])];

  if (medicines[index]) {
    medicines[index] = { ...medicines[index], taken: true };
  }

  const updates = { medicines, updatedAt: new Date().toISOString() };

  if (!db) {
    return saveLocalPatient({ ...current, ...updates });
  }

  try {
    const docRef = doc(db, COLLECTION_NAME, DOC_ID);
    await updateDoc(docRef, updates);
    return { ...current, ...updates };
  } catch (e) {
    console.warn('[patientService] Firestore markMedicineTaken error, saving locally:', e);
    return saveLocalPatient({ ...current, ...updates });
  }
}

/**
 * Toggles a specific medicine's taken status (taken <-> pending).
 */
export async function toggleMedicineTaken(index) {
  const current = await getPatient();
  const medicines = [...(current.medicines || [])];

  if (medicines[index]) {
    medicines[index] = { ...medicines[index], taken: !medicines[index].taken };
  }

  const updates = { medicines, updatedAt: new Date().toISOString() };

  if (!db) {
    return saveLocalPatient({ ...current, ...updates });
  }

  try {
    const docRef = doc(db, COLLECTION_NAME, DOC_ID);
    await updateDoc(docRef, updates);
    return { ...current, ...updates };
  } catch (e) {
    console.warn('[patientService] Firestore toggleMedicineTaken error, saving locally:', e);
    return saveLocalPatient({ ...current, ...updates });
  }
}

/**
 * Removes a medicine by index and re-evaluates drug interaction warnings.
 */
export async function removeMedicine(index) {
  const current = await getPatient();
  const medicines = [...(current.medicines || [])];
  if (index < 0 || index >= medicines.length) return current;

  medicines.splice(index, 1);
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
