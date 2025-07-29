import Dexie, { Table } from 'dexie'
import type { Entry } from '../../../shared/types/entry'

export interface OfflineEntry extends Omit<Entry, 'id'> {
  id?: string
  localId: string
  syncStatus: 'pending' | 'synced' | 'failed'
  createdOffline: boolean
  lastAttemptAt?: string
  attemptCount: number
  error?: string
}

export interface SyncMetadata {
  id?: number
  lastSyncAt: string
  totalPendingEntries: number
  lastFailedSync?: string
  isOnline: boolean
}

export class OfflineDatabase extends Dexie {
  entries!: Table<OfflineEntry>
  syncMetadata!: Table<SyncMetadata>

  constructor() {
    super('VoiceJournalOffline')
    
    this.version(1).stores({
      entries: '++localId, id, user_id, date, syncStatus, createdOffline, created_at',
      syncMetadata: '++id, lastSyncAt, isOnline'
    })

    // Add hooks for automatic metadata updates
    this.entries.hook('creating', (primKey, obj, trans) => {
      obj.localId = this.generateLocalId()
      obj.createdOffline = !navigator.onLine
      obj.syncStatus = navigator.onLine ? 'pending' : 'pending'
      obj.attemptCount = 0
      obj.created_at = obj.created_at || new Date().toISOString()
      obj.updated_at = new Date().toISOString()
    })

    this.entries.hook('updating', (modifications, primKey, obj, trans) => {
      ;(modifications as any).updated_at = new Date().toISOString()
    })
  }

  private generateLocalId(): string {
    return `local_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }
}

export class OfflineStorageService {
  private static db = new OfflineDatabase()

  /**
   * Store entry locally (works offline)
   */
  static async storeEntry(entry: Omit<Entry, 'id'>): Promise<OfflineEntry> {
    try {
      const offlineEntry: Omit<OfflineEntry, 'localId'> = {
        ...entry,
        syncStatus: 'pending',
        createdOffline: !navigator.onLine,
        attemptCount: 0
      }

      const localId = await this.db.entries.add(offlineEntry as OfflineEntry)
      const storedEntry = await this.db.entries.get(localId)
      
      if (!storedEntry) {
        throw new Error('Failed to retrieve stored entry')
      }

      await this.updateSyncMetadata()
      return storedEntry
    } catch (error) {
      console.error('Failed to store entry offline:', error)
      throw new Error('오프라인 저장에 실패했습니다.')
    }
  }

  /**
   * Get all entries (from IndexedDB)
   */
  static async getEntries(userId: string): Promise<OfflineEntry[]> {
    try {
      const entries = await this.db.entries
        .where('user_id')
        .equals(userId)
        .toArray()
      
      // Sort by created_at descending (newest first)
      return entries.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    } catch (error) {
      console.error('Failed to get offline entries:', error)
      return []
    }
  }

  /**
   * Get entry by local ID or server ID
   */
  static async getEntry(id: string): Promise<OfflineEntry | null> {
    try {
      // Try local ID first
      const entryByLocalId = await this.db.entries.get(id)
      if (entryByLocalId) return entryByLocalId

      // Try server ID
      const entryByServerId = await this.db.entries
        .where('id')
        .equals(id)
        .first()
      
      return entryByServerId || null
    } catch (error) {
      console.error('Failed to get entry:', error)
      return null
    }
  }

  /**
   * Update entry locally
   */
  static async updateEntry(localId: string, updates: Partial<OfflineEntry>): Promise<void> {
    try {
      await this.db.entries.update(localId, {
        ...updates,
        updated_at: new Date().toISOString()
      })
      
      await this.updateSyncMetadata()
    } catch (error) {
      console.error('Failed to update entry offline:', error)
      throw new Error('오프라인 업데이트에 실패했습니다.')
    }
  }

  /**
   * Delete entry locally
   */
  static async deleteEntry(localId: string): Promise<void> {
    try {
      await this.db.entries.delete(localId)
      await this.updateSyncMetadata()
    } catch (error) {
      console.error('Failed to delete entry offline:', error)
      throw new Error('오프라인 삭제에 실패했습니다.')
    }
  }

  /**
   * Get all entries pending sync
   */
  static async getPendingSyncEntries(userId: string): Promise<OfflineEntry[]> {
    try {
      const entries = await this.db.entries
        .where(['user_id', 'syncStatus'])
        .equals([userId, 'pending'])
        .toArray()
      
      return entries
    } catch (error) {
      console.error('Failed to get pending sync entries:', error)
      return []
    }
  }

  /**
   * Mark entry as synced and update with server ID
   */
  static async markAsSynced(localId: string, serverId: string): Promise<void> {
    try {
      await this.db.entries.update(localId, {
        id: serverId,
        syncStatus: 'synced',
        lastAttemptAt: new Date().toISOString(),
        error: undefined
      })
      
      await this.updateSyncMetadata()
    } catch (error) {
      console.error('Failed to mark entry as synced:', error)
      throw error
    }
  }

  /**
   * Mark entry as sync failed
   */
  static async markAsSyncFailed(localId: string, error: string): Promise<void> {
    try {
      const entry = await this.db.entries.get(localId)
      if (!entry) return

      await this.db.entries.update(localId, {
        syncStatus: 'failed',
        lastAttemptAt: new Date().toISOString(),
        attemptCount: (entry.attemptCount || 0) + 1,
        error
      })
      
      await this.updateSyncMetadata()
    } catch (err) {
      console.error('Failed to mark entry as sync failed:', err)
    }
  }

  /**
   * Get entries that failed sync
   */
  static async getFailedSyncEntries(userId: string): Promise<OfflineEntry[]> {
    try {
      const entries = await this.db.entries
        .where(['user_id', 'syncStatus'])
        .equals([userId, 'failed'])
        .toArray()
      
      return entries
    } catch (error) {
      console.error('Failed to get failed sync entries:', error)
      return []
    }
  }

  /**
   * Reset failed entry for retry
   */
  static async retryFailedEntry(localId: string): Promise<void> {
    try {
      await this.db.entries.update(localId, {
        syncStatus: 'pending',
        error: undefined
      })
      
      await this.updateSyncMetadata()
    } catch (error) {
      console.error('Failed to retry failed entry:', error)
      throw error
    }
  }

  /**
   * Clear all synced entries (cleanup)
   */
  static async clearSyncedEntries(userId: string, olderThanDays: number = 7): Promise<number> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)
      const cutoffISO = cutoffDate.toISOString()

      const entriesToDelete = await this.db.entries
        .where(['user_id', 'syncStatus'])
        .equals([userId, 'synced'])
        .and(entry => entry.updated_at < cutoffISO)
        .toArray()

      const deletedCount = entriesToDelete.length
      
      await this.db.entries.bulkDelete(
        entriesToDelete.map(entry => entry.localId)
      )
      
      await this.updateSyncMetadata()
      return deletedCount
    } catch (error) {
      console.error('Failed to clear synced entries:', error)
      return 0
    }
  }

  /**
   * Get sync statistics
   */
  static async getSyncStats(userId: string): Promise<{
    total: number
    pending: number
    synced: number
    failed: number
  }> {
    try {
      const allEntries = await this.db.entries.where('user_id').equals(userId).toArray()
      
      return {
        total: allEntries.length,
        pending: allEntries.filter(e => e.syncStatus === 'pending').length,
        synced: allEntries.filter(e => e.syncStatus === 'synced').length,
        failed: allEntries.filter(e => e.syncStatus === 'failed').length
      }
    } catch (error) {
      console.error('Failed to get sync stats:', error)
      return { total: 0, pending: 0, synced: 0, failed: 0 }
    }
  }

  /**
   * Update sync metadata
   */
  private static async updateSyncMetadata(): Promise<void> {
    try {
      const allEntries = await this.db.entries.toArray()
      const pendingCount = allEntries.filter(e => e.syncStatus === 'pending').length
      
      const metadata: SyncMetadata = {
        lastSyncAt: new Date().toISOString(),
        totalPendingEntries: pendingCount,
        isOnline: navigator.onLine
      }

      // Update or create metadata record
      const existingMetadata = await this.db.syncMetadata.orderBy('id').last()
      if (existingMetadata) {
        await this.db.syncMetadata.update(existingMetadata.id!, metadata)
      } else {
        await this.db.syncMetadata.add(metadata)
      }
    } catch (error) {
      console.error('Failed to update sync metadata:', error)
    }
  }

  /**
   * Get sync metadata
   */
  static async getSyncMetadata(): Promise<SyncMetadata | null> {
    try {
      return await this.db.syncMetadata.orderBy('id').last() || null
    } catch (error) {
      console.error('Failed to get sync metadata:', error)
      return null
    }
  }

  /**
   * Search entries locally
   */
  static async searchEntries(userId: string, query: string): Promise<OfflineEntry[]> {
    try {
      const searchQuery = query.toLowerCase()
      const entries = await this.db.entries
        .where('user_id')
        .equals(userId)
        .filter(entry => 
          entry.transcript?.toLowerCase().includes(searchQuery) ||
          entry.keywords?.some(keyword => keyword.toLowerCase().includes(searchQuery)) ||
          entry.wins?.some(win => win.toLowerCase().includes(searchQuery)) ||
          entry.regrets?.some(regret => regret.toLowerCase().includes(searchQuery)) ||
          entry.tasks?.some(task => task.toLowerCase().includes(searchQuery))
        )
        .toArray()
      
      return entries
    } catch (error) {
      console.error('Failed to search entries offline:', error)
      return []
    }
  }

  /**
   * Check if entry exists by date (for conflict detection)
   */
  static async getEntryByDate(userId: string, date: string): Promise<OfflineEntry | null> {
    try {
      const entry = await this.db.entries
        .where(['user_id', 'date'])
        .equals([userId, date])
        .first()
      
      return entry || null
    } catch (error) {
      console.error('Failed to get entry by date:', error)
      return null
    }
  }

  /**
   * Close database connection
   */
  static async close(): Promise<void> {
    await this.db.close()
  }

  /**
   * Clear all data (for testing or reset)
   */
  static async clearAll(): Promise<void> {
    try {
      await this.db.entries.clear()
      await this.db.syncMetadata.clear()
    } catch (error) {
      console.error('Failed to clear all data:', error)
    }
  }
}