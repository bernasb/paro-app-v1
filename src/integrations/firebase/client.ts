// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAIsZCA26xU2YkEOLSXCzv7r0bH_KKY9H0",
  authDomain: "clergy-connect-idx-ver.firebaseapp.com",
  projectId: "clergy-connect-idx-ver",
  storageBucket: "clergy-connect-idx-ver.appspot.com",
  messagingSenderId: "337093354558",
  appId: "1:337093354558:web:341b98a5eb7dac9c365d6f",
  measurementId: "G-PC76D5EETH"
};

// Initialize Firebase
// Check if Firebase App is already initialized to prevent errors during hot-reloads
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize and export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'us-central1'); // Initialize Functions with region

export default app;

// Usage:
// import { auth, db } from '@/integrations/firebase/client';
