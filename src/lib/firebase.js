/**
 * firebase.js - Firebase Initialization & Configuration
 * Owner: Shared Infrastructure (All Devs)
 * 
 * Simple explanation:
 * Connects the app to Google Cloud Firebase Firestore if environment keys exist.
 * If keys are missing (zero-config mode), it gracefully exports null so
 * patientService.js seamlessly uses localStorage instead.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env?.VITE_FIREBASE_APP_ID,
};

let db = null;

// Only initialize if a valid project ID is provided
if (firebaseConfig.projectId && firebaseConfig.projectId !== 'your_project_id') {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log('[Firebase] Connected to Firestore database.');
  } catch (error) {
    console.warn('[Firebase] Initialization error, falling back to localStorage:', error.message);
    db = null;
  }
} else {
  console.info('[Firebase] No Firebase credentials detected. Running in Zero-Config (localStorage) mode.');
}

export { db };
