describe('Voice Recording Flow', () => {
  beforeEach(() => {
    cy.mockAuth()
    cy.mockVoiceRecording()
    cy.visit('/dashboard')
  })

  it('should display voice recorder interface', () => {
    cy.get('[data-testid=voice-recorder]').should('be.visible')
    cy.get('[data-testid=record-button]').should('be.visible')
    cy.get('[data-testid=record-button]').should('contain', 'Start Recording')
  })

  it('should start and stop recording', () => {
    // Start recording
    cy.get('[data-testid=record-button]').click()
    cy.get('[data-testid=record-button]').should('contain', 'Stop Recording')
    cy.get('[data-testid=recording-indicator]').should('be.visible')
    
    // Stop recording
    cy.get('[data-testid=record-button]').click()
    cy.get('[data-testid=record-button]').should('contain', 'Start Recording')
    cy.get('[data-testid=recording-indicator]').should('not.exist')
  })

  it('should display recording timer', () => {
    cy.get('[data-testid=record-button]').click()
    cy.get('[data-testid=recording-timer]').should('be.visible')
    cy.get('[data-testid=recording-timer]').should('contain', '00:0')
  })

  it('should show transcription after recording', () => {
    // Start and stop recording
    cy.get('[data-testid=record-button]').click()
    cy.wait(1000) // Wait for mock recording
    cy.get('[data-testid=record-button]').click()
    
    // Should show transcription
    cy.get('[data-testid=transcription-text]').should('be.visible')
    cy.get('[data-testid=transcription-text]').should('contain', 'This is a test journal entry')
  })

  it('should allow editing transcription', () => {
    // Complete a recording
    cy.get('[data-testid=record-button]').click()
    cy.wait(1000)
    cy.get('[data-testid=record-button]').click()
    
    // Edit transcription
    cy.get('[data-testid=transcription-text]').clear()
    cy.get('[data-testid=transcription-text]').type('This is my edited journal entry for today')
    
    // Verify content
    cy.get('[data-testid=transcription-text]').should('contain', 'edited journal entry')
  })

  it('should process and categorize entry', () => {
    // Complete a recording
    cy.get('[data-testid=record-button]').click()
    cy.wait(1000)
    cy.get('[data-testid=record-button]').click()
    
    // Should show analysis results
    cy.get('[data-testid=analysis-results]').should('be.visible')
    
    // Should have category sections
    cy.get('[data-testid=wins-section]').should('be.visible')
    cy.get('[data-testid=regrets-section]').should('be.visible')
    cy.get('[data-testid=tasks-section]').should('be.visible')
    cy.get('[data-testid=keywords-section]').should('be.visible')
  })

  it('should allow saving entry', () => {
    // Complete recording and analysis
    cy.get('[data-testid=record-button]').click()
    cy.wait(1000)
    cy.get('[data-testid=record-button]').click()
    
    // Save entry
    cy.get('[data-testid=save-entry-button]').click()
    
    // Should show success message
    cy.get('[data-testid=save-success-message]').should('be.visible')
    
    // Should clear the form
    cy.get('[data-testid=transcription-text]').should('be.empty')
  })

  it('should handle recording errors gracefully', () => {
    // Mock permission denied
    cy.window().then((win) => {
      win.navigator.mediaDevices.getUserMedia = cy.stub().rejects(new Error('Permission denied'))
    })
    
    cy.get('[data-testid=record-button]').click()
    
    // Should show error message
    cy.get('[data-testid=error-message]').should('be.visible')
    cy.get('[data-testid=error-message]').should('contain', 'microphone access')
  })

  it('should show loading state during processing', () => {
    // Mock slow processing
    cy.intercept('POST', '**/analyzeSentiment', { delay: 2000, body: { success: true } })
    
    cy.get('[data-testid=record-button]').click()
    cy.wait(1000)
    cy.get('[data-testid=record-button]').click()
    
    // Should show loading indicator
    cy.get('[data-testid=processing-indicator]').should('be.visible')
    cy.get('[data-testid=processing-indicator]').should('contain', 'Analyzing')
  })
})