// Firebase integration - from firebase_barebones_javascript blueprint
import { initializeApp } from "firebase/app";
import { getAuth, signInWithRedirect, GoogleAuthProvider, getRedirectResult, User as FirebaseUser } from "firebase/auth";

// Check if Firebase environment variables are configured
const isFirebaseConfigured = !!
  (import.meta.env.VITE_FIREBASE_API_KEY &&
   import.meta.env.VITE_FIREBASE_PROJECT_ID &&
   import.meta.env.VITE_FIREBASE_APP_ID);

let auth: any = null;
let googleProvider: any = null;

// Only initialize Firebase if configured
if (isFirebaseConfigured) {
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
}

export { auth, googleProvider };
export { isFirebaseConfigured };

// Google Sign In function
export function signInWithGoogle() {
  if (!isFirebaseConfigured || !auth || !googleProvider) {
    throw new Error('Firebase is not configured. Please set up Firebase environment variables.');
  }
  signInWithRedirect(auth, googleProvider);
}

// Handle redirect result after Google sign-in
export async function handleGoogleRedirect() {
  if (!isFirebaseConfigured || !auth) {
    return null; // Firebase not configured, skip Google auth handling
  }
  
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      // This gives you a Google Access Token. You can use it to access Google APIs.
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;

      // The signed-in user info.
      const user = result.user;
      return { user, token };
    }
    return null;
  } catch (error: any) {
    console.error('Google Sign-In error:', error);
    return null; // Return null instead of throwing to prevent blocking local auth
  }
}

// Convert Firebase user to application user format
export function convertFirebaseUser(firebaseUser: FirebaseUser) {
  return {
    id: firebaseUser.uid,
    username: firebaseUser.email || '',
    fullName: firebaseUser.displayName || firebaseUser.email || '',
    email: firebaseUser.email || '',
    photoURL: firebaseUser.photoURL || null,
    role: 'cashier' as const, // Default role for Google sign-in users
    isGoogleAuth: true,
  };
}