import { supabase } from '../../../lib/supabase'

export interface GoogleSheetsIntegration {
  id: string
  connected: boolean
  status: 'active' | 'expired' | 'revoked' | 'error' | 'disconnected'
  lastSync?: string
  errorMessage?: string
  spreadsheetId?: string
  sheetName?: string
}

export interface SyncResult {
  success: boolean
  message?: string
  error?: string
  spreadsheetId?: string
}

export class SheetsService {
  private static readonly FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

  /**
   * Get the current Google Sheets integration status
   */
  static async getIntegrationStatus(): Promise<GoogleSheetsIntegration> {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      throw new Error('Not authenticated')
    }

    const response = await fetch(`${this.FUNCTION_URL}/sheets-oauth?action=status`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to get integration status')
    }

    const data = await response.json()
    return {
      id: data.id || '',
      connected: data.connected,
      status: data.status,
      lastSync: data.lastSync,
      errorMessage: data.errorMessage,
      spreadsheetId: data.spreadsheetId,
      sheetName: data.sheetName || 'Voice Journal'
    }
  }

  /**
   * Get the Google OAuth authorization URL
   */
  static async getAuthorizationUrl(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      throw new Error('Not authenticated')
    }

    const response = await fetch(`${this.FUNCTION_URL}/sheets-oauth?action=auth-url`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to get authorization URL')
    }

    const data = await response.json()
    return data.authUrl
  }

  /**
   * Handle OAuth callback (typically called after redirect)
   */
  static async handleOAuthCallback(code: string, state: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      throw new Error('Not authenticated')
    }

    const response = await fetch(`${this.FUNCTION_URL}/sheets-oauth?action=callback&code=${code}&state=${state}`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to handle OAuth callback')
    }
  }

  /**
   * Disconnect Google Sheets integration
   */
  static async disconnect(): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      throw new Error('Not authenticated')
    }

    const response = await fetch(`${this.FUNCTION_URL}/sheets-oauth?action=disconnect`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to disconnect integration')
    }
  }

  /**
   * Manually sync an entry to Google Sheets
   */
  static async syncEntry(entryId: string): Promise<SyncResult> {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      throw new Error('Not authenticated')
    }

    const response = await fetch(`${this.FUNCTION_URL}/sheets-sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ entryId }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to sync entry')
    }

    return await response.json()
  }

  /**
   * Sync all entries to Google Sheets
   */
  static async syncAllEntries(): Promise<SyncResult[]> {
    // Get all user entries
    const { data: entries, error } = await supabase
      .from('entries')
      .select('id')
      .order('date', { ascending: false })

    if (error) {
      throw new Error(`Failed to get entries: ${error.message}`)
    }

    if (!entries || entries.length === 0) {
      return []
    }

    // Sync each entry with exponential backoff
    const results: SyncResult[] = []
    
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      
      try {
        const result = await this.syncEntry(entry.id)
        results.push(result)
        
        // Add delay between requests to avoid rate limiting
        if (i < entries.length - 1) {
          await this.delay(1000 + (i * 100)) // Progressive delay
        }
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return results
  }

  /**
   * Get Google Sheets URL for the connected spreadsheet
   */
  static getSpreadsheetUrl(spreadsheetId: string): string {
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
  }

  /**
   * Utility function to add delay
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get sync logs for debugging
   */
  static async getSyncLogs(limit: number = 50): Promise<any[]> {
    const { data, error } = await supabase
      .from('sync_logs')
      .select(`
        *,
        integration:integrations(provider, status),
        entry:entries(date, transcript)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to get sync logs: ${error.message}`)
    }

    return data || []
  }

  /**
   * Retry failed syncs
   */
  static async retryFailedSyncs(): Promise<SyncResult[]> {
    // Get failed sync logs
    const { data: failedLogs, error } = await supabase
      .from('sync_logs')
      .select('entry_id')
      .eq('status', 'failed')
      .eq('integration.provider', 'google_sheets')

    if (error) {
      throw new Error(`Failed to get failed syncs: ${error.message}`)
    }

    if (!failedLogs || failedLogs.length === 0) {
      return []
    }

    // Retry each failed sync
    const results: SyncResult[] = []
    
    for (const log of failedLogs) {
      try {
        const result = await this.syncEntry(log.entry_id)
        results.push(result)
        
        // Add delay between retries
        await this.delay(2000)
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return results
  }
}