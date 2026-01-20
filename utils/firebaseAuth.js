// Simple Firebase Auth wrapper
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

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
    
    // Reload user to get the latest emailVerified status
    await userCredential.user.reload();
    const refreshedUser = auth.currentUser;
    
    return {
      success: true,
      user: {
        uid: refreshedUser.uid,
        email: refreshedUser.email,
        emailVerified: refreshedUser.emailVerified,
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    return {
      success: true,
      message: 'Password reset email sent! Check your inbox.'
    };
  } catch (error) {
    let errorMessage = 'Failed to send password reset email';
    
    if (error.code === 'auth/user-not-found') {
      errorMessage = 'No account found with this email';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Too many requests. Please try again later';
    }
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function changePassword(currentPassword, newPassword) {
  try {
    const user = auth.currentUser;
    
    if (!user || !user.email) {
      return {
        success: false,
        error: 'No user logged in or user is not using email authentication'
      };
    }

    // Re-authenticate user with current password (required for security)
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // Update password
    await updatePassword(user, newPassword);

    return {
      success: true,
      message: 'Password changed successfully!'
    };
  } catch (error) {
    let errorMessage = 'Failed to change password';
    
    if (error.code === 'auth/wrong-password') {
      errorMessage = 'Current password is incorrect';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'New password is too weak';
    } else if (error.code === 'auth/requires-recent-login') {
      errorMessage = 'Please log out and log in again before changing password';
    }
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}
