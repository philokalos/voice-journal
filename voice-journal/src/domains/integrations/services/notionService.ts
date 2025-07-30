import { getFirebaseFunctions } from '../../../lib/firebase'
import { httpsCallable } from 'firebase/functions'
import type { Entry } from '../../../shared/types/entry'
import { RetryUtil } from '../utils/retryUtil'
import { SyncStatusManager } from '../utils/syncStatusManager'

export interface NotionStatus {
  connected: boolean
  database_id?: string
  database_name?: string
  last_sync_at?: string
}

export interface NotionAuthResult {
  success: boolean
  message: string
  authUrl?: string
  databaseId?: string
}

export interface SyncResult {
  success: boolean
  error?: string
  retryCount?: number
  totalDelay?: number
}

export class NotionService {
  /**
   * Get Notion OAuth authorization URL
   */
  static async getAuthUrl(): Promise<string> {
    const result = await RetryUtil.withRetry(async () => {
      const functions = getFirebaseFunctions()
      const notionOAuth = httpsCallable<
        { action: string },
        { authUrl: string }
      >(functions, 'notionOAuth')

      const response = await notionOAuth({ action: 'get_auth_url' })
      return response.data.authUrl
    }, {
      maxRetries: 3,
      initialDelay: 1000
    })

    if (result.success) {
      return result.data!
    } else {
      console.error('Failed to get Notion auth URL:', result.error)
      throw new Error('Failed to get authorization URL')
    }
  }

  /**
   * Exchange authorization code for tokens
   */
  static async exchangeCode(code: string, state: string): Promise<NotionAuthResult> {
    const result = await RetryUtil.withRetry(async () => {
      const functions = getFirebaseFunctions()
      const notionOAuth = httpsCallable<
        { action: string; code: string; state: string },
        NotionAuthResult
      >(functions, 'notionOAuth')

      const response = await notionOAuth({
        action: 'exchange_code',
        code,
        state
      })

      return response.data
    }, {
      maxRetries: 3,
      initialDelay: 1000,
      retryCondition: (error) => {
        // Don't retry authentication errors
        if (error.code === 'functions/invalid-argument' ||
            error.message?.includes('invalid_code') ||
            error.message?.includes('invalid_state')) {
          return false
        }
        return RetryUtil.isRetryableError(error)
      }
    })

    if (result.success) {
      return result.data!
    } else {
      console.error('Failed to exchange authorization code:', result.error)
      throw new Error('Failed to complete Notion authorization')
    }
  }

  /**
   * Get Notion integration status
   */
  static async getStatus(): Promise<NotionStatus> {
    const result = await RetryUtil.withRetry(async () => {
      const functions = getFirebaseFunctions()
      const notionOAuth = httpsCallable<
        { action: string },
        NotionStatus
      >(functions, 'notionOAuth')

      const response = await notionOAuth({ action: 'get_status' })
      return response.data
    }, {
      maxRetries: 3,
      initialDelay: 500
    })

    if (result.success) {
      return result.data!
    } else {
      console.error('Failed to get Notion status:', result.error)
      return { connected: false }
    }
  }

  /**
   * Disconnect Notion integration
   */
  static async disconnect(): Promise<NotionAuthResult> {
    const result = await RetryUtil.withRetry(async () => {
      const functions = getFirebaseFunctions()
      const notionOAuth = httpsCallable<
        { action: string },
        NotionAuthResult
      >(functions, 'notionOAuth')

      const response = await notionOAuth({ action: 'disconnect' })
      return response.data
    }, {
      maxRetries: 3,
      initialDelay: 1000
    })

    if (result.success) {
      // Note: Individual entry sync status cleanup is handled by the cloud function
      // when it clears all user's Notion sync statuses
      
      return result.data!
    } else {
      console.error('Failed to disconnect Notion:', result.error)
      throw new Error('Failed to disconnect Notion')
    }
  }

  /**
   * Sync a journal entry to Notion with retry logic
   */
  static async syncEntry(entry: Entry): Promise<SyncResult> {
    // Mark as pending before starting sync
    await SyncStatusManager.markSyncPending(entry.id, 'notion')

    const result = await RetryUtil.withRetry(async () => {
      const functions = getFirebaseFunctions()
      const syncToNotion = httpsCallable<
        { entryId: string; entryData: any },
        NotionAuthResult
      >(functions, 'syncToNotion')

      const response = await syncToNotion({
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
            error.message?.includes('unauthorized') ||
            error.code === 'rate_limited') {
          return error.code === 'rate_limited' // Only retry rate limits
        }
        return RetryUtil.isRetryableError(error)
      }
    })

    if (result.success) {
      console.log(`Entry ${entry.id} synced to Notion successfully after ${result.attemptCount} attempts`)
      
      // Update sync status to success
      await SyncStatusManager.markSyncSuccess(entry.id, 'notion')
      
      return {
        success: true,
        retryCount: result.attemptCount,
        totalDelay: result.totalDelay
      }
    } else {
      console.error(`Failed to sync entry ${entry.id} to Notion after ${result.attemptCount} attempts:`, result.error)
      
      // Update sync status to failed
      await SyncStatusManager.markSyncFailure(
        entry.id, 
        'notion', 
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
  ): Promise<NotionAuthResult> {
    if (!code) {
      throw new Error('No authorization code received')
    }

    if (!state) {
      throw new Error('No state parameter received')
    }

    return this.exchangeCode(code, state)
  }

  /**
   * Check if Notion sync is available
   */
  static async isAvailable(): Promise<boolean> {
    try {
      const status = await this.getStatus()
      return status.connected
    } catch {
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
        'notion-auth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      )

      if (!authWindow) {
        throw new Error('Failed to open authorization window. Please allow popups.')
      }

      // Monitor the auth window
      const checkClosed = setInterval(() => {
        if (authWindow.closed) {
          clearInterval(checkClosed)
          console.log('Notion auth window closed')
        }
      }, 1000)

    } catch (error) {
      console.error('Failed to start Notion OAuth flow:', error)
      throw error
    }
  }

  /**
   * Auto-sync entry to Notion if integration is active
   * This can be called after creating a new entry
   */
  static async autoSync(entry: Entry): Promise<SyncResult> {
    try {
      const isAvailable = await this.isAvailable()
      if (!isAvailable) {
        console.log('Notion integration not available, skipping auto-sync')
        return { success: false, error: 'Integration not available' }
      }

      const syncResult = await this.syncEntry(entry)
      
      if (syncResult.success) {
        console.log(`Entry ${entry.id} auto-synced to Notion`)
      } else {
        console.warn(`Auto-sync to Notion failed for entry ${entry.id}:`, syncResult.error)
      }
      
      return syncResult
    } catch (error) {
      console.warn('Auto-sync to Notion failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get database URL if connected
   */
  static async getDatabaseUrl(): Promise<string | null> {
    try {
      const status = await this.getStatus()
      if (status.connected && status.database_id) {
        return `https://www.notion.so/${status.database_id.replace(/-/g, '')}`
      }
      return null
    } catch (error) {
      console.error('Failed to get database URL:', error)
      return null
    }
  }

  /**
   * Batch sync multiple entries to Notion
   */
  static async batchSync(entries: Entry[]): Promise<SyncResult[]> {
    const results = await RetryUtil.batchWithRetry(
      entries,
      (entry) => this.syncEntry(entry),
      {
        maxRetries: 3,
        initialDelay: 1000,
        concurrency: 2 // Limit concurrent requests to avoid rate limits
      }
    )

    return results.map(result => ({
      success: result.success,
      error: result.error?.message,
      retryCount: result.attemptCount,
      totalDelay: result.totalDelay
    }))
  }
}