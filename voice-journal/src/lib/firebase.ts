import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { config } from './config';

// Firebase is the primary backend - initialize with required configuration
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;
let storage: FirebaseStorage | null = null;

try {
  app = initializeApp(config.firebase);
  auth = getAuth(app);
  firestore = getFirestore(app);
  storage = getStorage(app);
  console.log('🔥 Firebase initialized successfully');
  console.log(`📊 Project: ${config.firebase.projectId}`);
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
  throw new Error('Firebase is required for Voice Journal to function properly');
}

export { 
  app as firebaseApp, 
  auth as firebaseAuth,
  firestore as firebaseFirestore,
  storage as firebaseStorage 
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