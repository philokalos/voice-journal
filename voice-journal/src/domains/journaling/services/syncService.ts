import { getFirebaseAuth, getFirebaseFirestore } from '../../../lib/firebase'
import { collection, addDoc, doc, getDoc, updateDoc, query, where, getDocs } from 'firebase/firestore'
import { OfflineStorageService, OfflineEntry } from './offlineStorageService'
import { EntryService } from './entryService'
import type { Entry } from '../../../shared/types/entry'

export interface SyncProgress {
  total: number
  completed: number
  failed: number
  current?: string
}

export interface SyncResult {
  success: boolean
  synced: number
  failed: number
  conflicts: ConflictEntry[]
  errors: string[]
}

export interface ConflictEntry {
  localEntry: OfflineEntry
  serverEntry: Entry
  conflictType: 'duplicate' | 'modified'
}

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline'

export class SyncService {
  private static isOnline = navigator.onLine
  private static syncInProgress = false
  private static listeners: Set<(status: SyncStatus, progress?: SyncProgress) => void> = new Set()
  private static retryTimeout: NodeJS.Timeout | null = null
  private static maxRetries = 3
  private static retryDelay = 5000 // 5 seconds

  /**
   * Initialize sync service with online/offline event listeners
   */
  static initialize(): void {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this))
    window.addEventListener('offline', this.handleOffline.bind(this))
    
    // Check initial online status
    this.isOnline = navigator.onLine
    this.notifyListeners(this.isOnline ? 'idle' : 'offline')

    // Start periodic sync check when online
    if (this.isOnline) {
      this.schedulePeriodicSync()
    }
  }

  /**
   * Add listener for sync status changes
   */
  static addSyncListener(listener: (status: SyncStatus, progress?: SyncProgress) => void): void {
    this.listeners.add(listener)
  }

  /**
   * Remove sync status listener
   */
  static removeSyncListener(listener: (status: SyncStatus, progress?: SyncProgress) => void): void {
    this.listeners.delete(listener)
  }

  /**
   * Get current sync status
   */
  static getSyncStatus(): SyncStatus {
    if (!this.isOnline) return 'offline'
    if (this.syncInProgress) return 'syncing'
    return 'idle'
  }

  /**
   * Manual sync trigger
   */
  static async sync(): Promise<SyncResult> {
    if (this.syncInProgress) {
      throw new Error('Sync already in progress')
    }

    if (!this.isOnline) {
      throw new Error('Cannot sync while offline')
    }

    return this.performSync()
  }

  /**
   * Handle online event
   */
  private static async handleOnline(): Promise<void> {
    console.log('Device went online')
    this.isOnline = true
    this.notifyListeners('idle')
    
    // Wait a moment for network to stabilize
    setTimeout(() => {
      this.performSync().catch(error => {
        console.error('Auto-sync failed after going online:', error)
      })
    }, 1000)

    // Start periodic sync
    this.schedulePeriodicSync()
  }

  /**
   * Handle offline event
   */
  private static handleOffline(): void {
    console.log('Device went offline')
    this.isOnline = false
    this.syncInProgress = false
    this.notifyListeners('offline')
    
    // Clear retry timeout
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout)
      this.retryTimeout = null
    }
  }

  /**
   * Perform actual sync operation
   */
  private static async performSync(): Promise<SyncResult> {
    if (!this.isOnline || this.syncInProgress) {
      return { success: false, synced: 0, failed: 0, conflicts: [], errors: ['Not online or sync in progress'] }
    }

    this.syncInProgress = true
    this.notifyListeners('syncing')

    try {
      const auth = getFirebaseAuth()
      const user = auth.currentUser
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Get pending sync entries
      const pendingEntries = await OfflineStorageService.getPendingSyncEntries(user.uid)
      
      if (pendingEntries.length === 0) {
        this.syncInProgress = false
        this.notifyListeners('idle')
        return { success: true, synced: 0, failed: 0, conflicts: [], errors: [] }
      }

      console.log(`Starting sync of ${pendingEntries.length} entries`)

      const result: SyncResult = {
        success: true,
        synced: 0,
        failed: 0,
        conflicts: [],
        errors: []
      }

      // Process entries in batches to avoid overwhelming Firestore
      const batchSize = 5
      for (let i = 0; i < pendingEntries.length; i += batchSize) {
        const batch = pendingEntries.slice(i, i + batchSize)
        
        for (const entry of batch) {
          const progress: SyncProgress = {
            total: pendingEntries.length,
            completed: result.synced + result.failed,
            failed: result.failed,
            current: entry.transcript?.substring(0, 50) + '...'
          }
          this.notifyListeners('syncing', progress)

          try {
            await this.syncSingleEntry(entry, result)
          } catch (error) {
            console.error(`Failed to sync entry ${entry.localId}:`, error)
            result.failed++
            result.errors.push(`Entry ${entry.localId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
            
            await OfflineStorageService.markAsSyncFailed(
              entry.localId,
              error instanceof Error ? error.message : 'Unknown error'
            )
          }
        }

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      console.log(`Sync completed. Synced: ${result.synced}, Failed: ${result.failed}, Conflicts: ${result.conflicts.length}`)

      this.syncInProgress = false
      this.notifyListeners(result.failed > 0 ? 'error' : 'idle')

      return result

    } catch (error) {
      console.error('Sync operation failed:', error)
      this.syncInProgress = false
      this.notifyListeners('error')
      
      // Schedule retry
      this.scheduleRetry()

      return {
        success: false,
        synced: 0,
        failed: 0,
        conflicts: [],
        errors: [error instanceof Error ? error.message : 'Unknown sync error']
      }
    }
  }

  /**
   * Sync a single entry to Firestore
   */
  private static async syncSingleEntry(offlineEntry: OfflineEntry, result: SyncResult): Promise<void> {
    const db = getFirebaseFirestore()

    // Check for conflicts (same date entry exists)
    const conflict = await this.detectConflict(offlineEntry)
    if (conflict) {
      result.conflicts.push(conflict)
      console.log(`Conflict detected for entry ${offlineEntry.localId}`)
      return
    }

    // Prepare entry data for Firestore
    const entryData = {
      user_id: offlineEntry.user_id,
      transcript: offlineEntry.transcript,
      date: offlineEntry.date,
      sentiment_score: offlineEntry.sentiment_score || 0,
      keywords: offlineEntry.keywords || [],
      wins: offlineEntry.wins || [],
      regrets: offlineEntry.regrets || [],
      tasks: offlineEntry.tasks || [],
      audio_file_path: offlineEntry.audio_file_path,
      created_at: offlineEntry.created_at,
      updated_at: new Date().toISOString()
    }

    if (offlineEntry.id) {
      // Entry has server ID, update existing
      const docRef = doc(db, 'entries', offlineEntry.id)
      await updateDoc(docRef, entryData)
      await OfflineStorageService.markAsSynced(offlineEntry.localId, offlineEntry.id)
    } else {
      // New entry, create in Firestore
      const entriesRef = collection(db, 'entries')
      const docRef = await addDoc(entriesRef, entryData)
      await OfflineStorageService.markAsSynced(offlineEntry.localId, docRef.id)
    }

    result.synced++
  }

  /**
   * Detect conflicts with existing entries
   */
  private static async detectConflict(offlineEntry: OfflineEntry): Promise<ConflictEntry | null> {
    try {
      const db = getFirebaseFirestore()
      const entriesRef = collection(db, 'entries')
      
      // Check for entry with same date and user
      const q = query(
        entriesRef,
        where('user_id', '==', offlineEntry.user_id),
        where('date', '==', offlineEntry.date)
      )
      
      const querySnapshot = await getDocs(q)
      
      if (querySnapshot.empty) {
        return null
      }

      // Found existing entry, check if it's different
      const serverEntry = {
        id: querySnapshot.docs[0].id,
        ...querySnapshot.docs[0].data()
      } as Entry

      // If offline entry has this server ID, no conflict
      if (offlineEntry.id === serverEntry.id) {
        return null
      }

      // Determine conflict type
      const conflictType = serverEntry.transcript === offlineEntry.transcript ? 'duplicate' : 'modified'

      return {
        localEntry: offlineEntry,
        serverEntry,
        conflictType
      }
    } catch (error) {
      console.error('Error detecting conflict:', error)
      return null
    }
  }

  /**
   * Resolve conflict by merging or replacing
   */
  static async resolveConflict(
    conflict: ConflictEntry,
    resolution: 'useLocal' | 'useServer' | 'merge'
  ): Promise<void> {
    try {
      const db = getFirebaseFirestore()
      const docRef = doc(db, 'entries', conflict.serverEntry.id)

      let resolvedData: Partial<Entry>

      switch (resolution) {
        case 'useLocal':
          // Replace server entry with local data
          resolvedData = {
            transcript: conflict.localEntry.transcript,
            sentiment_score: conflict.localEntry.sentiment_score,
            keywords: conflict.localEntry.keywords,
            wins: conflict.localEntry.wins,
            regrets: conflict.localEntry.regrets,
            tasks: conflict.localEntry.tasks,
            updated_at: new Date().toISOString()
          }
          break

        case 'useServer':
          // Keep server entry, mark local as synced
          await OfflineStorageService.markAsSynced(conflict.localEntry.localId, conflict.serverEntry.id)
          return

        case 'merge':
          // Merge local and server data
          resolvedData = {
            transcript: conflict.localEntry.transcript, // Prefer local transcript
            sentiment_score: Math.max(
              conflict.localEntry.sentiment_score || 0,
              conflict.serverEntry.sentiment_score || 0
            ),
            keywords: Array.from(new Set([
              ...(conflict.serverEntry.keywords || []),
              ...(conflict.localEntry.keywords || [])
            ])),
            wins: Array.from(new Set([
              ...(conflict.serverEntry.wins || []),
              ...(conflict.localEntry.wins || [])
            ])),
            regrets: Array.from(new Set([
              ...(conflict.serverEntry.regrets || []),
              ...(conflict.localEntry.regrets || [])
            ])),
            tasks: Array.from(new Set([
              ...(conflict.serverEntry.tasks || []),
              ...(conflict.localEntry.tasks || [])
            ])),
            updated_at: new Date().toISOString()
          }
          break
      }

      // Update server entry
      await updateDoc(docRef, resolvedData)
      
      // Mark local entry as synced
      await OfflineStorageService.markAsSynced(conflict.localEntry.localId, conflict.serverEntry.id)

      console.log(`Conflict resolved using strategy: ${resolution}`)
    } catch (error) {
      console.error('Failed to resolve conflict:', error)
      throw error
    }
  }

  /**
   * Schedule periodic sync (every 5 minutes when online)
   */
  private static schedulePeriodicSync(): void {
    const syncInterval = 5 * 60 * 1000 // 5 minutes
    
    const periodicSync = () => {
      if (this.isOnline && !this.syncInProgress) {
        this.performSync().catch(error => {
          console.error('Periodic sync failed:', error)
        })
      }
      
      setTimeout(periodicSync, syncInterval)
    }

    setTimeout(periodicSync, syncInterval)
  }

  /**
   * Schedule retry after failed sync
   */
  private static scheduleRetry(): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout)
    }

    this.retryTimeout = setTimeout(() => {
      if (this.isOnline && !this.syncInProgress) {
        console.log('Retrying sync after failure')
        this.performSync().catch(error => {
          console.error('Retry sync failed:', error)
        })
      }
    }, this.retryDelay)
  }

  /**
   * Notify all listeners of status change
   */
  private static notifyListeners(status: SyncStatus, progress?: SyncProgress): void {
    this.listeners.forEach(listener => {
      try {
        listener(status, progress)
      } catch (error) {
        console.error('Error in sync listener:', error)
      }
    })
  }

  /**
   * Get sync statistics
   */
  static async getSyncStats(userId: string): Promise<{
    offline: { total: number; pending: number; synced: number; failed: number }
    lastSync?: string
  }> {
    try {
      const offlineStats = await OfflineStorageService.getSyncStats(userId)
      const metadata = await OfflineStorageService.getSyncMetadata()

      return {
        offline: offlineStats,
        lastSync: metadata?.lastSyncAt
      }
    } catch (error) {
      console.error('Failed to get sync stats:', error)
      return {
        offline: { total: 0, pending: 0, synced: 0, failed: 0 }
      }
    }
  }

  /**
   * Force retry all failed entries
   */
  static async retryFailedEntries(userId: string): Promise<void> {
    try {
      const failedEntries = await OfflineStorageService.getFailedSyncEntries(userId)
      
      for (const entry of failedEntries) {
        await OfflineStorageService.retryFailedEntry(entry.localId)
      }

      // Trigger sync if online
      if (this.isOnline) {
        await this.performSync()
      }
    } catch (error) {
      console.error('Failed to retry failed entries:', error)
      throw error
    }
  }

  /**
   * Clean up synced entries (maintenance)
   */
  static async cleanupSyncedEntries(userId: string, olderThanDays: number = 7): Promise<number> {
    try {
      return await OfflineStorageService.clearSyncedEntries(userId, olderThanDays)
    } catch (error) {
      console.error('Failed to cleanup synced entries:', error)
      return 0
    }
  }

  /**
   * Destroy sync service
   */
  static destroy(): void {
    window.removeEventListener('online', this.handleOnline.bind(this))
    window.removeEventListener('offline', this.handleOffline.bind(this))
    
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout)
      this.retryTimeout = null
    }

    this.listeners.clear()
    this.syncInProgress = false
  }
}