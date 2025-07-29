// Cypress E2E support file
import './commands'

// Hide fetch/XHR requests in command log (can be turned on for debugging)
Cypress.on('window:before:load', (win) => {
  // Mock Firebase Auth for E2E tests
  win.firebase = {
    auth: () => ({
      currentUser: null,
      signInWithEmailAndPassword: () => Promise.resolve(),
      createUserWithEmailAndPassword: () => Promise.resolve(),
      signOut: () => Promise.resolve(),
    }),
  }
})

// Mock Web Speech API for E2E tests
Cypress.on('window:before:load', (win) => {
  win.SpeechRecognition = class MockSpeechRecognition {
    start() {}
    stop() {}
    abort() {}
    addEventListener() {}
    removeEventListener() {}
  }
  
  win.webkitSpeechRecognition = win.SpeechRecognition
  
  win.MediaRecorder = class MockMediaRecorder {
    start() {}
    stop() {}
    pause() {}
    resume() {}
    addEventListener() {}
    removeEventListener() {}
    state = 'inactive'
  }
  
  win.navigator.mediaDevices = {
    getUserMedia: () => Promise.resolve({
      getTracks: () => [{ stop: () => {} }]
    })
  } as any
})