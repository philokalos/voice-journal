describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('should display login page for unauthenticated users', () => {
    cy.url().should('include', '/login')
    cy.contains('Sign In').should('be.visible')
    cy.get('[data-testid=email-input]').should('be.visible')
    cy.get('[data-testid=password-input]').should('be.visible')
  })

  it('should show validation errors for invalid inputs', () => {
    cy.visit('/login')
    
    // Try to submit empty form
    cy.get('[data-testid=login-button]').click()
    
    // Should show validation messages (exact text depends on implementation)
    cy.get('input:invalid').should('have.length.at.least', 1)
  })

  it('should allow switching between login and signup', () => {
    cy.visit('/login')
    
    // Should have link to signup
    cy.contains('Sign Up').click()
    cy.url().should('include', '/signup')
    
    // Should have link back to login
    cy.contains('Sign In').click()
    cy.url().should('include', '/login')
  })

  it('should show Google OAuth option', () => {
    cy.visit('/login')
    cy.get('[data-testid=google-oauth-button]').should('be.visible')
  })

  context('With mocked authentication', () => {
    beforeEach(() => {
      cy.mockAuth()
    })

    it('should redirect to dashboard when authenticated', () => {
      cy.visit('/login')
      cy.url().should('include', '/dashboard')
    })

    it('should show user email in navigation', () => {
      cy.visit('/dashboard')
      cy.contains('test@example.com').should('be.visible')
    })

    it('should allow user to sign out', () => {
      cy.visit('/dashboard')
      cy.get('[data-testid=sign-out-button]').click()
      cy.url().should('include', '/login')
    })
  })
})