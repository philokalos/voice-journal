describe('Settings Page', () => {
  beforeEach(() => {
    cy.mockAuth()
    cy.visit('/settings')
  })

  it('should display settings page layout', () => {
    cy.get('[data-testid=settings-header]').should('be.visible')
    cy.get('[data-testid=settings-header]').should('contain', 'Settings')
    
    cy.get('[data-testid=back-button]').should('be.visible')
    cy.get('[data-testid=user-email]').should('contain', 'test@example.com')
  })

  it('should show account information', () => {
    cy.get('[data-testid=account-section]').should('be.visible')
    cy.get('[data-testid=account-email]').should('contain', 'test@example.com')
    cy.get('[data-testid=account-uid]').should('be.visible')
  })

  it('should display integrations section', () => {
    cy.get('[data-testid=integrations-section]').should('be.visible')
    cy.get('[data-testid=google-sheets-integration]').should('be.visible')
    cy.get('[data-testid=notion-integration]').should('be.visible')
  })

  context('Google Sheets Integration', () => {
    it('should show not connected state initially', () => {
      cy.intercept('GET', '**/google-sheets/status', { body: { connected: false } })
      
      cy.visit('/settings')
      
      cy.get('[data-testid=google-sheets-status]').should('contain', 'Not Connected')
      cy.get('[data-testid=google-sheets-connect]').should('be.visible')
      cy.get('[data-testid=google-sheets-connect]').should('contain', 'Connect Google Sheets')
    })

    it('should show connected state when integrated', () => {
      cy.intercept('GET', '**/google-sheets/status', {
        body: {
          connected: true,
          spreadsheet_name: 'Voice Journal Entries',
          spreadsheet_id: 'test-spreadsheet-id',
          last_sync_at: '2024-01-15T10:00:00Z'
        }
      })
      
      cy.visit('/settings')
      
      cy.get('[data-testid=google-sheets-status]').should('contain', 'Connected')
      cy.get('[data-testid=google-sheets-name]').should('contain', 'Voice Journal Entries')
      cy.get('[data-testid=google-sheets-last-sync]').should('contain', '1/15/2024')
      cy.get('[data-testid=google-sheets-disconnect]').should('be.visible')
      cy.get('[data-testid=google-sheets-view]').should('be.visible')
    })

    it('should allow connecting Google Sheets', () => {
      cy.intercept('GET', '**/google-sheets/status', { body: { connected: false } })
      cy.intercept('POST', '**/google-sheets/auth', { body: { authUrl: 'https://accounts.google.com/oauth/authorize?...' } })
      
      cy.visit('/settings')
      
      // Mock window.open to prevent actual OAuth flow
      cy.window().then((win) => {
        cy.stub(win, 'open').as('windowOpen')
      })
      
      cy.get('[data-testid=google-sheets-connect]').click()
      cy.get('@windowOpen').should('have.been.called')
    })

    it('should allow disconnecting Google Sheets', () => {
      cy.intercept('GET', '**/google-sheets/status', { body: { connected: true } })
      cy.intercept('POST', '**/google-sheets/disconnect', { body: { success: true } })
      
      cy.visit('/settings')
      
      cy.get('[data-testid=google-sheets-disconnect]').click()
      
      // Should show success message
      cy.get('[data-testid=disconnect-success]').should('be.visible')
    })

    it('should allow viewing spreadsheet', () => {
      cy.intercept('GET', '**/google-sheets/status', {
        body: {
          connected: true,
          spreadsheet_id: 'test-spreadsheet-id'
        }
      })
      
      cy.visit('/settings')
      
      cy.get('[data-testid=google-sheets-view]').should('have.attr', 'href')
        .and('include', 'docs.google.com/spreadsheets/d/test-spreadsheet-id')
      cy.get('[data-testid=google-sheets-view]').should('have.attr', 'target', '_blank')
    })
  })

  context('Notion Integration', () => {
    it('should show not connected state initially', () => {
      cy.intercept('GET', '**/notion/status', { body: { connected: false } })
      
      cy.visit('/settings')
      
      cy.get('[data-testid=notion-status]').should('contain', 'Not Connected')
      cy.get('[data-testid=notion-connect]').should('be.visible')
      cy.get('[data-testid=notion-connect]').should('contain', 'Connect Notion')
    })

    it('should show connected state when integrated', () => {
      cy.intercept('GET', '**/notion/status', {
        body: {
          connected: true,
          database_name: 'Journal Entries',
          database_id: 'test-database-id',
          last_sync_at: '2024-01-15T15:30:00Z'
        }
      })
      
      cy.visit('/settings')
      
      cy.get('[data-testid=notion-status]').should('contain', 'Connected')
      cy.get('[data-testid=notion-name]').should('contain', 'Journal Entries')
      cy.get('[data-testid=notion-last-sync]').should('contain', '1/15/2024')
      cy.get('[data-testid=notion-disconnect]').should('be.visible')
      cy.get('[data-testid=notion-view]').should('be.visible')
    })

    it('should allow connecting Notion', () => {
      cy.intercept('GET', '**/notion/status', { body: { connected: false } })
      cy.intercept('POST', '**/notion/auth', { body: { authUrl: 'https://api.notion.com/v1/oauth/authorize?...' } })
      
      cy.visit('/settings')
      
      cy.window().then((win) => {
        cy.stub(win, 'open').as('windowOpen')
      })
      
      cy.get('[data-testid=notion-connect]').click()
      cy.get('@windowOpen').should('have.been.called')
    })

    it('should allow disconnecting Notion', () => {
      cy.intercept('GET', '**/notion/status', { body: { connected: true } })
      cy.intercept('POST', '**/notion/disconnect', { body: { success: true } })
      
      cy.visit('/settings')
      
      cy.get('[data-testid=notion-disconnect]').click()
      cy.get('[data-testid=disconnect-success]').should('be.visible')
    })
  })

  it('should show loading state while fetching integration status', () => {
    cy.intercept('GET', '**/google-sheets/status', { delay: 2000, body: { connected: false } })
    cy.intercept('GET', '**/notion/status', { delay: 2000, body: { connected: false } })
    
    cy.visit('/settings')
    
    cy.get('[data-testid=integrations-loading]').should('be.visible')
    cy.get('[data-testid=integrations-loading]').should('contain', 'Loading integration status')
  })

  it('should display privacy and data section', () => {
    cy.get('[data-testid=privacy-section]').should('be.visible')
    cy.get('[data-testid=data-deletion-info]').should('be.visible')
    cy.get('[data-testid=delete-data-button]').should('be.visible')
  })

  it('should handle data deletion request', () => {
    cy.intercept('POST', '**/deleteUserData', { body: { success: true } })
    
    cy.get('[data-testid=delete-data-button]').click()
    
    // Should show confirmation dialog
    cy.get('[data-testid=delete-confirmation]').should('be.visible')
    cy.get('[data-testid=delete-confirmation]').should('contain', 'This action cannot be undone')
    
    // Confirm deletion
    cy.get('[data-testid=confirm-delete]').click()
    
    // Should show loading state
    cy.get('[data-testid=delete-data-button]').should('contain', 'Deleting')
    cy.get('[data-testid=delete-data-button]').should('be.disabled')
  })

  it('should show sign out button', () => {
    cy.get('[data-testid=sign-out-button]').should('be.visible')
    cy.get('[data-testid=sign-out-button]').should('contain', 'Sign Out')
  })

  it('should allow signing out', () => {
    cy.get('[data-testid=sign-out-button]').click()
    cy.url().should('include', '/login')
  })

  it('should navigate back to dashboard', () => {
    cy.get('[data-testid=back-button]').click()
    cy.url().should('include', '/dashboard')
  })

  it('should show coming soon features', () => {
    cy.get('[data-testid=coming-soon-section]').should('be.visible')
    cy.get('[data-testid=coming-soon-section]').should('contain', 'Coming Soon')
    
    // Should list upcoming features
    cy.get('[data-testid=coming-soon-section]').should('contain', 'Advanced Privacy Settings')
    cy.get('[data-testid=coming-soon-section]').should('contain', 'Offline Sync')
    cy.get('[data-testid=coming-soon-section]').should('contain', 'Weekly Summary Reports')
  })
})