// GOLD STANDARD FIREBASE CLIENT CONFIGURATION FOR FRONTEND
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

// --- IMPORTANT ---
// This config must match your Firebase Console project settings for clergy-connect-idx-ver
const firebaseConfig = {
  apiKey: 'AIzaSyAIsZCA26xU2YkEOLSXCzv7r0bH_KKY9H0',
  authDomain: 'clergy-connect-idx-ver.firebaseapp.com',
  projectId: 'clergy-connect-idx-ver',
  storageBucket: 'clergy-connect-idx-ver.appspot.com',
  messagingSenderId: '337093354558',
  appId: '1:337093354558:web:341b98a5eb7dac9c365d6f',
  measurementId: 'G-PC76D5EETH',
};

// Initialize Firebase app (prevent re-init on hot reload)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'us-central1'); // Always use correct region

export default app;

// GOLD STANDARD USAGE:
// import { auth, db, functions } from '@/integrations/firebase/client';
// - Use only these exported instances for all Firebase operations in the frontend.
// - Do NOT use connectFunctionsEmulator unless you are intentionally testing locally.
// - All Magisterium API calls should go through the magisteriumProxy Cloud Function via Firebase Functions.
