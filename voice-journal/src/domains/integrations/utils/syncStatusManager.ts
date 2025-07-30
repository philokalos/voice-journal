import { doc, updateDoc } from 'firebase/firestore'
import { getFirebaseFirestore } from '../../../lib/firebase'
import type { 
  SyncService, 
  SyncStatus, 
  ServiceSyncStatus, 
  SyncStatusInfo 
} from '../../../shared/types/entry'

/**
 * Manages sync status tracking in Firestore for entries
 */
export class SyncStatusManager {
  private static readonly RETRY_DELAYS = [
    5 * 60 * 1000,    // 5 minutes
    15 * 60 * 1000,   // 15 minutes  
    60 * 60 * 1000,   // 1 hour
    4 * 60 * 60 * 1000, // 4 hours
    24 * 60 * 60 * 1000 // 24 hours
  ]

  /**
   * Update the sync status for a specific service
   */
  static async updateSyncStatus(
    entryId: string,
    service: SyncService,
    status: SyncStatus,
    error?: string,
    retryCount?: number
  ): Promise<void> {
    try {
      const db = getFirebaseFirestore()
      const entryRef = doc(db, 'entries', entryId)
      
      const now = new Date().toISOString()
      const serviceStatus: ServiceSyncStatus = {
        status,
        last_sync_at: status === 'synced' ? now : undefined,
        last_error: error,
        retry_count: retryCount,
        next_retry_at: status === 'failed' && retryCount !== undefined ? 
          this.calculateNextRetry(retryCount) : undefined
      }

      // Remove undefined fields for cleaner Firestore data
      Object.keys(serviceStatus).forEach(key => {
        if (serviceStatus[key as keyof ServiceSyncStatus] === undefined) {
          delete serviceStatus[key as keyof ServiceSyncStatus]
        }
      })

      await updateDoc(entryRef, {
        [`sync_status.${service}`]: serviceStatus,
        'sync_status.last_updated': now
      })

      console.log(`Updated ${service} sync status for entry ${entryId}: ${status}`)
    } catch (error) {
      console.error(`Failed to update sync status for entry ${entryId}:`, error)
      // Don't throw - sync status updates are not critical to the main flow
    }
  }

  /**
   * Mark sync as successful
   */
  static async markSyncSuccess(
    entryId: string,
    service: SyncService
  ): Promise<void> {
    await this.updateSyncStatus(entryId, service, 'synced')
  }

  /**
   * Mark sync as failed with error details
   */
  static async markSyncFailure(
    entryId: string,
    service: SyncService,
    error: string,
    retryCount: number = 0
  ): Promise<void> {
    await this.updateSyncStatus(entryId, service, 'failed', error, retryCount)
  }

  /**
   * Mark sync as pending (before attempt)
   */
  static async markSyncPending(
    entryId: string,
    service: SyncService
  ): Promise<void> {
    await this.updateSyncStatus(entryId, service, 'pending')
  }

  /**
   * Initialize sync status for new entries
   */
  static async initializeSyncStatus(entryId: string): Promise<void> {
    try {
      const db = getFirebaseFirestore()
      const entryRef = doc(db, 'entries', entryId)
      
      const initialStatus: SyncStatusInfo = {
        googleSheets: { status: 'never_synced' },
        notion: { status: 'never_synced' },
        last_updated: new Date().toISOString()
      }

      await updateDoc(entryRef, {
        sync_status: initialStatus
      })

      console.log(`Initialized sync status for entry ${entryId}`)
    } catch (error) {
      console.error(`Failed to initialize sync status for entry ${entryId}:`, error)
    }
  }

  /**
   * Calculate next retry time based on retry count
   */
  private static calculateNextRetry(retryCount: number): string {
    const delayIndex = Math.min(retryCount, this.RETRY_DELAYS.length - 1)
    const delay = this.RETRY_DELAYS[delayIndex]
    const nextRetry = new Date(Date.now() + delay)
    return nextRetry.toISOString()
  }

  /**
   * Check if entry is ready for retry
   */
  static isReadyForRetry(serviceStatus: ServiceSyncStatus): boolean {
    if (serviceStatus.status !== 'failed' || !serviceStatus.next_retry_at) {
      return false
    }

    const nextRetryTime = new Date(serviceStatus.next_retry_at).getTime()
    const now = Date.now()
    
    return now >= nextRetryTime
  }

  /**
   * Get sync status summary for an entry
   */
  static getSyncStatusSummary(syncStatus?: SyncStatusInfo): {
    googleSheets: SyncStatus,
    notion: SyncStatus,
    hasFailures: boolean,
    lastUpdated?: string
  } {
    return {
      googleSheets: syncStatus?.googleSheets?.status || 'never_synced',
      notion: syncStatus?.notion?.status || 'never_synced',
      hasFailures: (syncStatus?.googleSheets?.status === 'failed') || 
                   (syncStatus?.notion?.status === 'failed'),
      lastUpdated: syncStatus?.last_updated
    }
  }

  /**
   * Get entries that need retry (failed syncs with retry time passed)
   */
  static getRetryableStatuses(syncStatus?: SyncStatusInfo): {
    googleSheets: boolean,
    notion: boolean
  } {
    return {
      googleSheets: syncStatus?.googleSheets ? 
        this.isReadyForRetry(syncStatus.googleSheets) : false,
      notion: syncStatus?.notion ? 
        this.isReadyForRetry(syncStatus.notion) : false
    }
  }

  /**
   * Clear all sync statuses (useful for disconnect)
   */
  static async clearSyncStatus(
    entryId: string,
    service?: SyncService
  ): Promise<void> {
    try {
      const db = getFirebaseFirestore()
      const entryRef = doc(db, 'entries', entryId)
      
      if (service) {
        // Clear specific service
        await updateDoc(entryRef, {
          [`sync_status.${service}`]: {
            status: 'never_synced'
          },
          'sync_status.last_updated': new Date().toISOString()
        })
      } else {
        // Clear all sync statuses
        await updateDoc(entryRef, {
          sync_status: {
            googleSheets: { status: 'never_synced' },
            notion: { status: 'never_synced' },
            last_updated: new Date().toISOString()
          }
        })
      }

      console.log(`Cleared sync status for entry ${entryId}${service ? ` (${service})` : ''}`)
    } catch (error) {
      console.error(`Failed to clear sync status for entry ${entryId}:`, error)
    }
  }
}