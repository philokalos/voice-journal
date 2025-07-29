describe('Dashboard', () => {
  beforeEach(() => {
    cy.mockAuth()
    cy.visit('/dashboard')
  })

  it('should display dashboard layout', () => {
    cy.get('[data-testid=dashboard-header]').should('be.visible')
    cy.get('[data-testid=dashboard-nav]').should('be.visible')
    cy.get('[data-testid=dashboard-content]').should('be.visible')
  })

  it('should show welcome message for new users', () => {
    // Mock empty entries
    cy.intercept('GET', '**/entries', { body: [] })
    
    cy.visit('/dashboard')
    cy.get('[data-testid=empty-state]').should('be.visible')
    cy.get('[data-testid=empty-state]').should('contain', 'Start your first journal entry')
  })

  it('should display entries list', () => {
    // Mock entries data
    const mockEntries = [
      {
        id: 'entry-1',
        date: '2024-01-15',
        transcript: 'Today was a great day',
        sentiment_score: 0.8,
        wins: ['Completed project'],
        regrets: [],
        tasks: ['Plan tomorrow'],
        keywords: ['great', 'project'],
        created_at: '2024-01-15T10:00:00Z'
      },
      {
        id: 'entry-2',
        date: '2024-01-14',
        transcript: 'Yesterday was challenging',
        sentiment_score: 0.3,
        wins: [],
        regrets: ['Late to meeting'],
        tasks: ['Follow up with team'],
        keywords: ['challenging', 'meeting'],
        created_at: '2024-01-14T18:00:00Z'
      }
    ]
    
    cy.intercept('GET', '**/entries', { body: mockEntries })
    
    cy.visit('/dashboard')
    
    // Should show entries
    cy.get('[data-testid=entry-item]').should('have.length', 2)
    cy.get('[data-testid=entry-item]').first().should('contain', 'great day')
    cy.get('[data-testid=entry-item]').last().should('contain', 'challenging')
  })

  it('should show entry details when clicked', () => {
    const mockEntries = [{
      id: 'entry-1',
      date: '2024-01-15',
      transcript: 'Today was a productive day at work',
      sentiment_score: 0.7,
      wins: ['Finished presentation', 'Got positive feedback'],
      regrets: ['Forgot to call mom'],
      tasks: ['Prepare for tomorrow meeting', 'Buy groceries'],
      keywords: ['work', 'presentation', 'feedback'],
      created_at: '2024-01-15T10:00:00Z'
    }]
    
    cy.intercept('GET', '**/entries', { body: mockEntries })
    
    cy.visit('/dashboard')
    cy.get('[data-testid=entry-item]').first().click()
    
    // Should show entry detail modal/page
    cy.get('[data-testid=entry-detail]').should('be.visible')
    cy.get('[data-testid=entry-detail]').should('contain', 'productive day')
    
    // Should show all categories
    cy.get('[data-testid=entry-wins]').should('contain', 'Finished presentation')
    cy.get('[data-testid=entry-regrets]').should('contain', 'Forgot to call mom')
    cy.get('[data-testid=entry-tasks]').should('contain', 'meeting')
    cy.get('[data-testid=entry-keywords]').should('contain', 'work')
  })

  it('should allow searching entries', () => {
    const mockEntries = [
      {
        id: 'entry-1',
        transcript: 'Today I worked on the React project',
        keywords: ['react', 'project', 'work']
      },
      {
        id: 'entry-2', 
        transcript: 'Yesterday I met with the team about Vue',
        keywords: ['vue', 'team', 'meeting']
      }
    ]
    
    cy.intercept('GET', '**/entries', { body: mockEntries })
    cy.intercept('GET', '**/entries/search?q=react', { body: [mockEntries[0]] })
    
    cy.visit('/dashboard')
    
    // Search for React
    cy.get('[data-testid=search-input]').type('react')
    cy.get('[data-testid=search-button]').click()
    
    // Should show filtered results
    cy.get('[data-testid=entry-item]').should('have.length', 1)
    cy.get('[data-testid=entry-item]').should('contain', 'React project')
  })

  it('should display calendar view', () => {
    cy.get('[data-testid=view-toggle]').click()
    cy.get('[data-testid=calendar-view]').click()
    
    cy.get('[data-testid=calendar-container]').should('be.visible')
    cy.get('[data-testid=calendar-month]').should('be.visible')
    cy.get('[data-testid=calendar-days]').should('be.visible')
  })

  it('should show entry dates in calendar', () => {
    const mockEntries = [{
      id: 'entry-1',
      date: '2024-01-15',
      transcript: 'Test entry'
    }]
    
    cy.intercept('GET', '**/entries', { body: mockEntries })
    
    // Switch to calendar view
    cy.get('[data-testid=view-toggle]').click()
    cy.get('[data-testid=calendar-view]').click()
    
    // Should highlight dates with entries
    cy.get('[data-testid=calendar-day-15]').should('have.class', 'has-entry')
  })

  it('should show sentiment trends', () => {
    const mockEntries = [
      { id: '1', date: '2024-01-15', sentiment_score: 0.8 },
      { id: '2', date: '2024-01-14', sentiment_score: 0.6 },
      { id: '3', date: '2024-01-13', sentiment_score: 0.4 }
    ]
    
    cy.intercept('GET', '**/entries', { body: mockEntries })
    
    cy.visit('/dashboard')
    
    // Should show sentiment chart
    cy.get('[data-testid=sentiment-chart]').should('be.visible')
    cy.get('[data-testid=sentiment-trend]').should('be.visible')
  })

  it('should handle loading states', () => {
    // Mock slow API response
    cy.intercept('GET', '**/entries', { delay: 2000, body: [] })
    
    cy.visit('/dashboard')
    
    // Should show loading spinner
    cy.get('[data-testid=loading-spinner]').should('be.visible')
    cy.get('[data-testid=loading-text]').should('contain', 'Loading entries')
  })

  it('should handle API errors gracefully', () => {
    // Mock API error
    cy.intercept('GET', '**/entries', { statusCode: 500, body: { error: 'Server error' } })
    
    cy.visit('/dashboard')
    
    // Should show error message
    cy.get('[data-testid=error-message]').should('be.visible')
    cy.get('[data-testid=error-message]').should('contain', 'Failed to load entries')
    
    // Should have retry button
    cy.get('[data-testid=retry-button]').should('be.visible')
  })

  it('should allow entry editing', () => {
    const mockEntry = {
      id: 'entry-1',
      transcript: 'Original transcript',
      wins: ['Original win'],
      regrets: [],
      tasks: [],
      keywords: []
    }
    
    cy.intercept('GET', '**/entries', { body: [mockEntry] })
    cy.intercept('PUT', '**/entries/entry-1', { body: { success: true } })
    
    cy.visit('/dashboard')
    
    // Click edit button
    cy.get('[data-testid=entry-item]').first().within(() => {
      cy.get('[data-testid=edit-button]').click()
    })
    
    // Should show edit form
    cy.get('[data-testid=edit-form]').should('be.visible')
    cy.get('[data-testid=transcript-input]').should('have.value', 'Original transcript')
    
    // Edit content
    cy.get('[data-testid=transcript-input]').clear()
    cy.get('[data-testid=transcript-input]').type('Updated transcript')
    
    // Save changes
    cy.get('[data-testid=save-button]').click()
    
    // Should show success message
    cy.get('[data-testid=save-success]').should('be.visible')
  })

  it('should allow entry deletion', () => {
    const mockEntry = {
      id: 'entry-1',
      transcript: 'Entry to delete'
    }
    
    cy.intercept('GET', '**/entries', { body: [mockEntry] })
    cy.intercept('DELETE', '**/entries/entry-1', { body: { success: true } })
    
    cy.visit('/dashboard')
    
    // Click delete button
    cy.get('[data-testid=entry-item]').first().within(() => {
      cy.get('[data-testid=delete-button]').click()
    })
    
    // Should show confirmation dialog
    cy.get('[data-testid=delete-confirmation]').should('be.visible')
    cy.get('[data-testid=confirm-delete]').click()
    
    // Should remove entry from list
    cy.get('[data-testid=entry-item]').should('not.exist')
    cy.get('[data-testid=delete-success]').should('be.visible')
  })
})