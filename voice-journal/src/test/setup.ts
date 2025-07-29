import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'

// Mock Firebase modules
const mockAuthUser = {
  uid: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: null,
}

const mockAuth = {
  currentUser: mockAuthUser,
  signInWithEmailAndPassword: jest.fn().mockResolvedValue({ user: mockAuthUser }),
  createUserWithEmailAndPassword: jest.fn().mockResolvedValue({ user: mockAuthUser }),
  signOut: jest.fn().mockResolvedValue(undefined),
  signInWithPopup: jest.fn().mockResolvedValue({ user: mockAuthUser }),
  onAuthStateChanged: jest.fn((callback) => {
    callback(mockAuthUser)
    return jest.fn() // unsubscribe function
  }),
}

jest.mock('../lib/firebase', () => ({
  getFirebaseAuth: jest.fn(() => mockAuth),
  getFirebaseFirestore: jest.fn(() => ({
    collection: jest.fn(),
    doc: jest.fn(),
    addDoc: jest.fn(),
    getDocs: jest.fn(),
    getDoc: jest.fn(),
    updateDoc: jest.fn(),
    deleteDoc: jest.fn(),
  })),
  getFirebaseFunctions: jest.fn(() => ({
    httpsCallable: jest.fn(),
  })),
}))

// Mock Firebase auth functions
jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn((auth, callback) => {
    callback(mockAuthUser)
    return jest.fn() // unsubscribe function
  }),
  signInWithEmailAndPassword: jest.fn().mockResolvedValue({ user: mockAuthUser }),
  createUserWithEmailAndPassword: jest.fn().mockResolvedValue({ user: mockAuthUser }),
  signOut: jest.fn().mockResolvedValue(undefined),
  signInWithPopup: jest.fn().mockResolvedValue({ user: mockAuthUser }),
  GoogleAuthProvider: jest.fn().mockImplementation(() => ({
    setCustomParameters: jest.fn(),
  })),
}))

// Mock Web Speech API
Object.defineProperty(window, 'SpeechRecognition', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    abort: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    continuous: false,
    interimResults: false,
    lang: 'en-US',
  })),
})

Object.defineProperty(window, 'webkitSpeechRecognition', {
  writable: true,
  value: window.SpeechRecognition,
})

// Mock MediaRecorder
Object.defineProperty(window, 'MediaRecorder', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    state: 'inactive',
  })),
})

// Mock getUserMedia
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: () => [{
        stop: jest.fn(),
      }],
    }),
  },
})

// Global test utilities - polyfill for Node.js
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock IndexedDB for offline storage tests
const mockIndexedDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn(),
  cmp: jest.fn(),
}

Object.defineProperty(global, 'indexedDB', {
  value: mockIndexedDB,
  writable: true,
})

// Mock IDBKeyRange
Object.defineProperty(global, 'IDBKeyRange', {
  value: {
    bound: jest.fn(),
    lowerBound: jest.fn(),
    upperBound: jest.fn(),
    only: jest.fn(),
  },
  writable: true,
})

// Mock offline storage service
jest.mock('../domains/journaling/services/offlineStorageService', () => ({
  OfflineStorageService: {
    storeEntry: jest.fn().mockResolvedValue({
      id: 'test-offline-id',
      transcript: 'test',
      date: '2024-01-15',
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    getEntries: jest.fn().mockResolvedValue([]),
    updateEntry: jest.fn().mockResolvedValue({}),
    deleteEntry: jest.fn().mockResolvedValue({}),
    syncWithFirebase: jest.fn().mockResolvedValue([]),
  },
}))

// Suppress console.warn for tests unless explicitly needed
const originalConsoleWarn = console.warn
beforeEach(() => {
  console.warn = jest.fn()
})

afterEach(() => {
  console.warn = originalConsoleWarn
  jest.clearAllMocks()
})