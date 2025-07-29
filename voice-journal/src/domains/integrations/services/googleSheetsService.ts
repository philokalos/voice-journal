import { getFirebaseFunctions } from '../../../lib/firebase'
import { httpsCallable } from 'firebase/functions'
import type { Entry } from '../../../shared/types/entry'
import { RetryUtil } from '../utils/retryUtil'
import { SyncStatusManager } from '../utils/syncStatusManager'

export interface GoogleSheetsStatus {
  connected: boolean
  spreadsheet_id?: string
  spreadsheet_name?: string
  last_sync_at?: string
}

export interface GoogleSheetsAuthResult {
  success: boolean
  message: string
  authUrl?: string
  spreadsheetId?: string
}

export interface SyncResult {
  success: boolean
  error?: string
  retryCount?: number
  totalDelay?: number
}

export class GoogleSheetsService {
  /**
   * Get Google Sheets OAuth authorization URL
   */
  static async getAuthUrl(): Promise<string> {
    const result = await RetryUtil.withRetry(async () => {
      const functions = getFirebaseFunctions()
      const googleSheetsOAuth = httpsCallable<
        { action: string },
        { authUrl: string }
      >(functions, 'googleSheetsOAuth')

      const response = await googleSheetsOAuth({ action: 'get_auth_url' })
      return response.data.authUrl
    }, {
      maxRetries: 3,
      initialDelay: 1000
    })

    if (result.success) {
      return result.data!
    } else {
      console.error('Failed to get Google Sheets auth URL:', result.error)
      throw new Error('Failed to get authorization URL')
    }
  }

  /**
   * Exchange authorization code for tokens
   */
  static async exchangeCode(code: string, state: string): Promise<GoogleSheetsAuthResult> {
    try {
      const functions = getFirebaseFunctions()
      const googleSheetsOAuth = httpsCallable<
        { action: string; code: string; state: string },
        GoogleSheetsAuthResult
      >(functions, 'googleSheetsOAuth')

      const result = await googleSheetsOAuth({
        action: 'exchange_code',
        code,
        state
      })

      return result.data
    } catch (error) {
      console.error('Failed to exchange authorization code:', error)
      throw new Error('Failed to complete Google Sheets authorization')
    }
  }

  /**
   * Get Google Sheets integration status
   */
  static async getStatus(): Promise<GoogleSheetsStatus> {
    try {
      const functions = getFirebaseFunctions()
      const googleSheetsOAuth = httpsCallable<
        { action: string },
        GoogleSheetsStatus
      >(functions, 'googleSheetsOAuth')

      const result = await googleSheetsOAuth({ action: 'get_status' })
      return result.data
    } catch (error) {
      console.error('Failed to get Google Sheets status:', error)
      return { connected: false }
    }
  }

  /**
   * Disconnect Google Sheets integration
   */
  static async disconnect(): Promise<GoogleSheetsAuthResult> {
    try {
      const functions = getFirebaseFunctions()
      const googleSheetsOAuth = httpsCallable<
        { action: string },
        GoogleSheetsAuthResult
      >(functions, 'googleSheetsOAuth')

      const result = await googleSheetsOAuth({ action: 'disconnect' })
      
      // Note: Individual entry sync status cleanup is handled by the cloud function
      // when it clears all user's Google Sheets sync statuses
      
      return result.data
    } catch (error) {
      console.error('Failed to disconnect Google Sheets:', error)
      throw new Error('Failed to disconnect Google Sheets')
    }
  }

  /**
   * Sync a journal entry to Google Sheets with retry logic
   */
  static async syncEntry(entry: Entry): Promise<SyncResult> {
    // Mark as pending before starting sync
    await SyncStatusManager.markSyncPending(entry.id, 'googleSheets')

    const result = await RetryUtil.withRetry(async () => {
      const functions = getFirebaseFunctions()
      const syncToGoogleSheets = httpsCallable<
        { entryId: string; entryData: any },
        GoogleSheetsAuthResult
      >(functions, 'syncToGoogleSheets')

      const response = await syncToGoogleSheets({
        entryId: entry.id,
        entryData: {
          date: entry.date,
          transcript: entry.transcript,
          wins: entry.wins,
          regrets: entry.regrets,
          tasks: entry.tasks,
          keywords: entry.keywords,
          sentiment_score: entry.sentiment_score,
          created_at: entry.created_at
        }
      })

      return response.data
    }, {
      maxRetries: 5,
      initialDelay: 1000,
      maxDelay: 30000,
      retryCondition: (error) => {
        // Don't retry authentication errors - user needs to reconnect
        if (error.code === 'functions/unauthenticated' || 
            error.message?.includes('token_expired') ||
            error.message?.includes('invalid_grant')) {
          return false
        }
        return RetryUtil.isRetryableError(error)
      }
    })

    if (result.success) {
      console.log(`Entry ${entry.id} synced to Google Sheets successfully after ${result.attemptCount} attempts`)
      
      // Update sync status to success
      await SyncStatusManager.markSyncSuccess(entry.id, 'googleSheets')
      
      return {
        success: true,
        retryCount: result.attemptCount,
        totalDelay: result.totalDelay
      }
    } else {
      console.error(`Failed to sync entry ${entry.id} to Google Sheets after ${result.attemptCount} attempts:`, result.error)
      
      // Update sync status to failed
      await SyncStatusManager.markSyncFailure(
        entry.id, 
        'googleSheets', 
        result.error?.message || 'Unknown error',
        result.attemptCount - 1
      )
      
      return {
        success: false,
        error: result.error?.message,
        retryCount: result.attemptCount,
        totalDelay: result.totalDelay
      }
    }
  }

  /**
   * Handle OAuth callback (used in frontend routing)
   */
  static async handleOAuthCallback(
    code: string,
    state: string
  ): Promise<GoogleSheetsAuthResult> {
    if (!code) {
      throw new Error('No authorization code received')
    }

    if (!state) {
      throw new Error('No state parameter received')
    }

    return this.exchangeCode(code, state)
  }

  /**
   * Check if Google Sheets sync is available
   */
  static async isAvailable(): Promise<boolean> {
    try {
      const status = await this.getStatus()
      return status.connected
    } catch (error) {
      return false
    }
  }

  /**
   * Start the OAuth flow (opens auth URL in new window)
   */
  static async startOAuthFlow(): Promise<void> {
    try {
      const authUrl = await this.getAuthUrl()
      
      // Open OAuth URL in a new window/tab
      const authWindow = window.open(
        authUrl,
        'google-sheets-auth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      )

      if (!authWindow) {
        throw new Error('Failed to open authorization window. Please allow popups.')
      }

      // Monitor the auth window (optional - could be handled by callback URL)
      const checkClosed = setInterval(() => {
        if (authWindow.closed) {
          clearInterval(checkClosed)
          // Optionally refresh status or trigger a callback
          console.log('Auth window closed')
        }
      }, 1000)

    } catch (error) {
      console.error('Failed to start OAuth flow:', error)
      throw error
    }
  }

  /**
   * Auto-sync entry to Google Sheets if integration is active
   * This can be called after creating a new entry
   */
  static async autoSync(entry: Entry): Promise<SyncResult> {
    try {
      const isAvailable = await this.isAvailable()
      if (!isAvailable) {
        console.log('Google Sheets integration not available, skipping auto-sync')
        return { success: false, error: 'Integration not available' }
      }

      const syncResult = await this.syncEntry(entry)
      
      if (syncResult.success) {
        console.log(`Entry ${entry.id} auto-synced to Google Sheets`)
      } else {
        console.warn(`Auto-sync to Google Sheets failed for entry ${entry.id}:`, syncResult.error)
      }
      
      return syncResult
    } catch (error) {
      console.warn('Auto-sync to Google Sheets failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get spreadsheet URL if connected
   */
  static async getSpreadsheetUrl(): Promise<string | null> {
    try {
      const status = await this.getStatus()
      if (status.connected && status.spreadsheet_id) {
        return `https://docs.google.com/spreadsheets/d/${status.spreadsheet_id}/edit`
      }
      return null
    } catch (error) {
      console.error('Failed to get spreadsheet URL:', error)
      return null
    }
  }
}