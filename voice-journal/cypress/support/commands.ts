/// <reference types="cypress" />

// Custom commands for Voice Journal E2E tests

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Mock Firebase authentication
       */
      mockAuth(user?: { uid: string; email: string }): Chainable<void>
      
      /**
       * Mock voice recording functionality
       */
      mockVoiceRecording(): Chainable<void>
      
      /**
       * Login with test credentials
       */
      loginAsTestUser(): Chainable<void>
      
      /**
       * Wait for Firebase to initialize
       */
      waitForFirebase(): Chainable<void>
    }
  }
}

Cypress.Commands.add('mockAuth', (user = { uid: 'test-user', email: 'test@example.com' }) => {
  cy.window().then((win) => {
    // Mock Firebase auth state
    win.localStorage.setItem('firebase:auth:user', JSON.stringify(user))
  })
})

Cypress.Commands.add('mockVoiceRecording', () => {
  cy.window().then((win) => {
    // Mock successful voice recording
    const mockRecognition = {
      start: cy.stub(),
      stop: cy.stub(),
      abort: cy.stub(),
      addEventListener: cy.stub().callsFake((event, callback) => {
        if (event === 'result') {
          setTimeout(() => {
            callback({
              results: [{
                0: { transcript: 'This is a test journal entry about my day' },
                isFinal: true
              }]
            })
          }, 1000)
        }
      }),
      removeEventListener: cy.stub(),
    }
    
    win.SpeechRecognition = cy.stub().returns(mockRecognition)
    win.webkitSpeechRecognition = win.SpeechRecognition
  })
})

Cypress.Commands.add('loginAsTestUser', () => {
  cy.visit('/login')
  cy.get('[data-testid=email-input]').type('test@example.com')
  cy.get('[data-testid=password-input]').type('testpassword')
  cy.get('[data-testid=login-button]').click()
  cy.url().should('include', '/dashboard')
})

Cypress.Commands.add('waitForFirebase', () => {
  cy.window().its('firebase').should('exist')
})