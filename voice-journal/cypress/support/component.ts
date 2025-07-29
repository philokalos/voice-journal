// Cypress Component Testing support file
import './commands'
import { mount } from 'cypress/react18'

// Augment the Cypress namespace to include type definitions for custom commands
declare global {
  namespace Cypress {
    interface Chainable {
      mount: typeof mount
    }
  }
}

Cypress.Commands.add('mount', mount)

// Global styles for component testing
import '../../src/index.css'