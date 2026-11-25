/**
 * Unified Data Layer Interfaces for Sanjeevani Part E
 * Structured cleanly so REST / WebSocket / Firebase / Supabase backends can replace the local mock store.
 */

export type AppMode = 'home' | 'hospital';
export type HomeRole = 'patient' | 'caretaker';
export type HospitalRole = 'patient' | 'doctor' | 'nurse';
export type AppRole = 'patient' | 'caretaker' | 'doctor' | 'nurse';

export type EmergencyContactCategory =
  | 'ambulance'
  | 'national'
  | 'nurse_station'
  | 'doctor'
  | 'family';

export interface EmergencyContact {
  id: string;
  name: string;
  relationOrRole: string;
  phone: string;
  category: EmergencyContactCategory;
  priority: number; // 1 = highest priority
  specialty?: string;
  modeScope: 'all' | 'home' | 'hospital';
  editable: boolean;
}

export interface PatientVitals {
  heartRate: number;
  spo2: number;
  bloodPressure: string;
  temperatureF: string;
  updatedAt: string;
}

export interface PatientProfileSummary {
  id: string;
  name: string;
  age: number;
  gender: string;
  mode: AppMode;
  ward?: string;
  roomBed: string;
  phone: string;
  urgency: 'Low' | 'Medium' | 'High';
  symptoms: string[];
  vitals: PatientVitals;
  doctorNotes: string;
  lastCheckInAt: string | null;
  lastCheckInMessage: string | null;
  mood: 'good' | 'tired' | 'pain' | 'anxious' | null;
}

export type AlertType = 'sos' | 'nurse_call' | 'quick_phrase' | 'check_in' | 'gesture';

export interface AlertRecord {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  mode: AppMode;
  patientId: string;
  patientName: string;
  roomBed: string;
  requestType?: 'water' | 'pain' | 'washroom' | 'help';
  severity: 'high' | 'medium' | 'low';
  timestamp: string;
  handled: boolean;
  handledBy?: string;
}

export interface NurseTask {
  id: string;
  patientId: string;
  patientName: string;
  roomBed: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  dueTime: string;
  completed: boolean;
}

export interface MockAuthSession {
  userId: string;
  name: string;
  mode: AppMode;
  role: AppRole;
  staffId?: string;
  specialty?: string;
  authenticated: boolean;
  signedInAt: string;
}

export interface SanjeevaniStoreState {
  patients: PatientProfileSummary[];
  activePatientId: string;
  alerts: AlertRecord[];
  contacts: EmergencyContact[];
  nurseTasks: NurseTask[];
}
