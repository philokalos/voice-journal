import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getFunctions, Functions } from 'firebase/functions';
import { config } from './config';

// Firebase is the primary backend - initialize with required configuration
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let functions: Functions | null = null;

try {
  app = initializeApp(config.firebase);
  auth = getAuth(app);
  firestore = getFirestore(app);
  storage = getStorage(app);
  functions = getFunctions(app);
  console.log('🔥 Firebase initialized successfully');
  console.log(`📊 Project: ${config.firebase.projectId}`);
  console.log(`🌐 Auth Domain: ${config.firebase.authDomain}`);
  console.log(`🏠 Current Origin: ${window.location.origin}`);
  
  // Test Google Auth availability
  setTimeout(() => {
    try {
      if (auth) {
        console.log('✅ Firebase Auth instance available');
        console.log('🔧 Firebase Config:', {
          apiKey: config.firebase.apiKey ? '✅ Present' : '❌ Missing',
          authDomain: config.firebase.authDomain,
          projectId: config.firebase.projectId
        });
      }
    } catch (testError) {
      console.error('❌ Firebase Auth test failed:', testError);
    }
  }, 1000);
  
  // Check if current domain matches auth domain pattern
  if (window.location.hostname !== 'localhost' && 
      !window.location.hostname.includes('vercel.app') &&
      !window.location.hostname.includes(config.firebase.authDomain.replace('.firebaseapp.com', ''))) {
    console.warn('⚠️ Current domain may not be authorized for Firebase Auth');
    console.warn('Make sure to add this domain to Firebase Console > Authentication > Settings > Authorized domains');
  }
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
  console.error('Environment check:', {
    hasApiKey: !!import.meta.env.VITE_FIREBASE_API_KEY,
    hasProjectId: !!import.meta.env.VITE_FIREBASE_PROJECT_ID,
    isDev: import.meta.env.DEV,
    isProd: import.meta.env.PROD,
    currentOrigin: window.location.origin
  });
  // Don't throw error in production to allow graceful fallback
  if (import.meta.env.DEV) {
    throw new Error('Firebase is required for Voice Journal to function properly');
  }
}

export { 
  app as firebaseApp, 
  auth as firebaseAuth,
  firestore as firebaseFirestore,
  storage as firebaseStorage,
  functions as firebaseFunctions
};


// Get Firebase services with error handling
export const getFirebaseAuth = (): Auth => {
  if (!auth) {
    throw new Error('Firebase Auth not initialized');
  }
  return auth;
};

export const getFirebaseFirestore = (): Firestore => {
  if (!firestore) {
    throw new Error('Firebase Firestore not initialized');
  }
  return firestore;
};

export const getFirebaseStorage = (): FirebaseStorage => {
  if (!storage) {
    throw new Error('Firebase Storage not initialized');
  }
  return storage;
};

export const getFirebaseFunctions = (): Functions => {
  if (!functions) {
    throw new Error('Firebase Functions not initialized');
  }
  return functions;
};