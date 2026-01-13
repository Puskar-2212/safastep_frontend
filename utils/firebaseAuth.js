// Simple Firebase Auth wrapper
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCW45fKAG4WA5OaBuw-M28VY8mSiUvioMA",
  authDomain: "safastep-85588.firebaseapp.com",
  projectId: "safastep-85588",
  storageBucket: "safastep-85588.firebasestorage.app",
  messagingSenderId: "586260710978",
  appId: "1:586260710978:web:62fafdbb6aad7715b28fdb",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export async function signUpWithEmail(email, password) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Send verification email
    await sendEmailVerification(userCredential.user);
    
    return {
      success: true,
      user: {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        emailVerified: userCredential.user.emailVerified
      },
      message: 'Verification email sent! Please check your inbox.'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function signInWithEmail(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return {
      success: true,
      user: {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}
