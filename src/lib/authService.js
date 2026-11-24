/**
 * authService.js - Simple Role-Based Authentication & Session Management
 * Owner: Shared Architecture (All Devs)
 * 
 * Simple explanation:
 * Manages the logged-in user profile and role (Patient, Caregiver, Doctor).
 * Uses browser localStorage with custom DOM events for instant real-time synchronization
 * across all pages and tabs without requiring external auth setup.
 */

const AUTH_STORAGE_KEY = 'sanjeevani_auth_session';
const AUTH_EVENT_NAME = 'sanjeevani_auth_changed';

// Preset Demo Profiles for instant 1-click access
export const DEMO_PROFILES = {
  patient: {
    id: 'user-patient',
    role: 'patient',
    name: 'Ramesh',
    subtitle: 'Age 62 · Non-verbal communication',
    language: 'Hindi',
    avatar: '👴',
    badge: 'Patient',
    redirectPath: '/patient'
  },
  caregiver: {
    id: 'user-caregiver',
    role: 'caregiver',
    name: 'Aarav Sharma',
    subtitle: 'Family Caregiver & ICU Nurse',
    language: 'Hindi',
    avatar: '💛',
    badge: 'Caregiver',
    redirectPath: '/caregiver'
  },
  doctor: {
    id: 'user-doctor',
    role: 'doctor',
    name: 'Dr. Anjali Sharma, MD',
    subtitle: 'Cardiologist · Reg #MED-784920',
    specialty: 'Cardiologist',
    language: 'Hindi',
    avatar: '👨‍⚕️',
    badge: 'Doctor',
    redirectPath: '/doctors'
  }
};

/**
 * Gets the currently active logged-in user session, or null if logged out.
 */
export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[authService] Error reading auth session:', err);
    return null;
  }
}

/**
 * Logs in a user with a specific role and profile details.
 */
export function login(userProfile) {
  const session = {
    ...userProfile,
    loggedInAt: new Date().toISOString()
  };

  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    window.dispatchEvent(new CustomEvent(AUTH_EVENT_NAME, { detail: session }));
  } catch (err) {
    console.error('[authService] Error saving auth session:', err);
  }

  return session;
}

/**
 * Logs out the current session and dispatches event.
 */
export function logout() {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(AUTH_EVENT_NAME, { detail: null }));
  } catch (err) {
    console.error('[authService] Error clearing auth session:', err);
  }
}

/**
 * Subscribes to authentication state changes. Returns an unsubscribe cleanup function.
 */
export function subscribeToAuth(callback) {
  // Notify immediately with current state
  callback(getCurrentUser());

  const handleCustomEvent = (e) => {
    callback(e.detail !== undefined ? e.detail : getCurrentUser());
  };

  const handleStorageEvent = (e) => {
    if (e.key === AUTH_STORAGE_KEY) {
      callback(getCurrentUser());
    }
  };

  window.addEventListener(AUTH_EVENT_NAME, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener(AUTH_EVENT_NAME, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}
