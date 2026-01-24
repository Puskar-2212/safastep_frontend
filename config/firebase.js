import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// TODO: Replace with your Firebase project configuration
// Get these values from Firebase Console > Project Settings > General
const firebaseConfig = {
  apiKey: "AIzaSyCW45fKAG4WA5OaBuw-M28VY8mSiUvioMA",
  authDomain: "safastep-85588.firebaseapp.com",
  projectId: "safastep-85588",
  storageBucket: "safastep-85588.firebasestorage.app",
  messagingSenderId: "586260710978",
  appId: "1:586260710978:web:62fafdbb6aad7715b28fdb",
  measurementId: "G-TEQ8F5EHYK"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

export default app;
