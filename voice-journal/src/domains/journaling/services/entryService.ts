import { getFirebaseAuth, getFirebaseFirestore } from '../../../lib/firebase'
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore'
import type { Entry } from '../../../shared/types/entry'
import { SentimentService } from './sentimentService'
import { GoogleSheetsService } from '../../integrations/services/googleSheetsService'
import { NotionService } from '../../integrations/services/notionService'
import { SyncStatusManager } from '../../integrations/utils/syncStatusManager'
import { OfflineStorageService, OfflineEntry } from './offlineStorageService'
// import { SyncService } from './syncService' // TODO: Re-enable when sync service is fully implemented

export interface CreateEntryRequest {
  transcript: string
  date: string
  sentiment_score?: number
  keywords?: string[]
  wins?: string[]
  regrets?: string[]
  tasks?: string[]
  audio_file_path?: string
}

export interface UpdateEntryRequest {
  id: string
  transcript?: string
  sentiment_score?: number
  keywords?: string[]
  wins?: string[]
  regrets?: string[]
  tasks?: string[]
  audio_file_path?: string
}

export class EntryService {
  // Create a new entry (with offline support)
  static async createEntry(request: CreateEntryRequest): Promise<Entry | OfflineEntry> {
    console.log('🔥 EntryService.createEntry called with:', request)
    
    try {
      const auth = getFirebaseAuth()
      console.log('🔐 Firebase auth retrieved')
      
      const user = auth.currentUser
      console.log('👤 Current user:', user ? { uid: user.uid, email: user.email } : 'null')
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Prepare entry data
      const entryData = {
        user_id: user.uid,
        transcript: request.transcript,
        date: request.date,
        sentiment_score: request.sentiment_score || 0,
        keywords: request.keywords || [],
        wins: request.wins || [],
        regrets: request.regrets || [],
        tasks: request.tasks || [],
        audio_file_path: request.audio_file_path,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Try online creation first
      if (navigator.onLine) {
        try {
          const firestore = getFirebaseFirestore()
          const entriesRef = collection(firestore, 'entries')
          const docRef = await addDoc(entriesRef, entryData)
          
          const entry = {
            id: docRef.id,
            ...entryData
          } as Entry

          // Store in offline cache as synced
          const offlineEntry = await OfflineStorageService.storeEntry(entryData)
          await OfflineStorageService.markAsSynced(offlineEntry.localId, docRef.id)

          // Perform sentiment analysis asynchronously with user-friendly error handling
          this.performSentimentAnalysisWithFallback(docRef.id, request.transcript)
            .catch(error => {
              console.warn('Sentiment analysis failed for entry', docRef.id, ':', error)
              // Note: Error is already handled in performSentimentAnalysisWithFallback
            })

          // Initialize sync status tracking
          await SyncStatusManager.initializeSyncStatus(docRef.id)
            .catch(error => {
              console.warn('Failed to initialize sync status for entry', docRef.id, ':', error)
            })

          // Auto-sync to integrations if available (asynchronously)
          this.performAutoSync(entry)
            .catch(error => {
              console.warn('Auto-sync failed for entry', docRef.id, ':', error)
            })
          
          return entry
        } catch (onlineError) {
          console.warn('Online entry creation failed, falling back to offline:', onlineError)
          // Fall through to offline storage
        }
      }

      // Store offline (either because we're offline or online creation failed)
      console.log('Storing entry offline')
      const offlineEntry = await OfflineStorageService.storeEntry(entryData)
      
      // Try to analyze sentiment offline (basic analysis)
      // This will be re-analyzed when synced online
      if (request.transcript) {
        this.performOfflineSentimentAnalysis(offlineEntry.localId, request.transcript)
          .catch(error => {
            console.warn('Offline sentiment analysis failed:', error)
          })
      }

      return offlineEntry
    } catch (error) {
      console.error('Failed to create entry:', error)
      throw error
    }
  }

  // Get all entries (online + offline)
  static async getEntries(): Promise<(Entry | OfflineEntry)[]> {
    try {
      const auth = getFirebaseAuth()
      const user = auth.currentUser
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Always get offline entries first (includes cached online entries)
      const offlineEntries = await OfflineStorageService.getEntries(user.uid)
      
      // If online, try to get latest from Firestore and merge
      if (navigator.onLine) {
        try {
          const firestore = getFirebaseFirestore()
          const entriesRef = collection(firestore, 'entries')
          const q = query(
            entriesRef,
            where('user_id', '==', user.uid),
            orderBy('date', 'desc')
          )
          
          const querySnapshot = await getDocs(q)
          const onlineEntries: Entry[] = []
          
          querySnapshot.forEach((doc) => {
            onlineEntries.push({
              id: doc.id,
              ...doc.data()
            } as Entry)
          })

          // Merge online and offline entries, preferring synced offline entries
          const mergedEntries: (Entry | OfflineEntry)[] = [...offlineEntries]
          
          // Add online entries that aren't already in offline cache
          for (const onlineEntry of onlineEntries) {
            const existsOffline = offlineEntries.some(offlineEntry => 
              offlineEntry.id === onlineEntry.id
            )
            
            if (!existsOffline) {
              mergedEntries.push(onlineEntry)
            }
          }

          // Sort by date (newest first)
          mergedEntries.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )

          return mergedEntries
        } catch (error) {
          console.warn('Failed to fetch online entries, using offline cache:', error)
        }
      }

      // Return offline entries if online fetch failed or we're offline
      return offlineEntries.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    } catch (error) {
      console.error('Failed to fetch entries:', error)
      throw error
    }
  }

  // Get a single entry by ID
  static async getEntry(id: string): Promise<Entry> {
    try {
      const auth = getFirebaseAuth()
      const user = auth.currentUser
      if (!user) {
        throw new Error('User not authenticated')
      }

      const firestore = getFirebaseFirestore()
      const entryRef = doc(firestore, 'entries', id)
      const entrySnap = await getDoc(entryRef)

      if (!entrySnap.exists()) {
        throw new Error('Entry not found')
      }

      const entryData = entrySnap.data()
      if (entryData.user_id !== user.uid) {
        throw new Error('Unauthorized access to entry')
      }

      return {
        id: entrySnap.id,
        ...entryData
      } as Entry
    } catch (error) {
      console.error('Failed to fetch entry:', error)
      throw error
    }
  }

  // Update an existing entry (with offline support)
  static async updateEntry(request: UpdateEntryRequest): Promise<Entry | OfflineEntry> {
    try {
      const auth = getFirebaseAuth()
      const user = auth.currentUser
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { id, ...updateData } = request
      
      // Check offline storage first
      const offlineEntry = await OfflineStorageService.getEntry(id)
      
      if (offlineEntry) {
        // Update in offline storage
        const updatedData = {
          ...updateData,
          syncStatus: 'pending' as const,
          updated_at: new Date().toISOString()
        }
        
        await OfflineStorageService.updateEntry(offlineEntry.localId, updatedData)
        
        // Try online update if connected
        if (navigator.onLine && offlineEntry.id) {
          try {
            const firestore = getFirebaseFirestore()
            const entryRef = doc(firestore, 'entries', offlineEntry.id)
            await updateDoc(entryRef, {
              ...updateData,
              updated_at: new Date().toISOString()
            })
            
            // Mark as synced if online update succeeded
            await OfflineStorageService.markAsSynced(offlineEntry.localId, offlineEntry.id)
          } catch (onlineError) {
            console.warn('Online update failed, entry marked for sync:', onlineError)
          }
        }
        
        return {
          ...offlineEntry,
          ...updatedData
        }
      }
      
      // Entry not in offline storage, try online update
      if (!navigator.onLine) {
        throw new Error('Entry not found offline and device is offline')
      }
      
      const firestore = getFirebaseFirestore()
      const entryRef = doc(firestore, 'entries', id)
      
      // First verify the entry exists and belongs to the user
      const entrySnap = await getDoc(entryRef)
      if (!entrySnap.exists()) {
        throw new Error('Entry not found')
      }
      
      const existingData = entrySnap.data()
      if (existingData.user_id !== user.uid) {
        throw new Error('Unauthorized access to entry')
      }

      // Update the entry online
      const updatedData = {
        ...updateData,
        updated_at: new Date().toISOString()
      }
      
      await updateDoc(entryRef, updatedData)
      
      const updatedEntry = {
        id,
        ...existingData,
        ...updatedData
      } as Entry
      
      // Cache in offline storage
      await OfflineStorageService.storeEntry(updatedEntry)
      await OfflineStorageService.markAsSynced(`local_${id}`, id)
      
      return updatedEntry
    } catch (error) {
      console.error('Failed to update entry:', error)
      throw error
    }
  }

  // Delete an entry (with offline support)
  static async deleteEntry(id: string): Promise<void> {
    try {
      const auth = getFirebaseAuth()
      const user = auth.currentUser
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Check offline storage first
      const offlineEntry = await OfflineStorageService.getEntry(id)
      
      if (offlineEntry) {
        // Delete from offline storage
        await OfflineStorageService.deleteEntry(offlineEntry.localId)
        
        // Try online deletion if connected and entry is synced
        if (navigator.onLine && offlineEntry.id) {
          try {
            const firestore = getFirebaseFirestore()
            const entryRef = doc(firestore, 'entries', offlineEntry.id)
            
            // Verify entry exists and belongs to user
            const entrySnap = await getDoc(entryRef)
            if (entrySnap.exists()) {
              const entryData = entrySnap.data()
              if (entryData.user_id === user.uid) {
                await deleteDoc(entryRef)
              }
            }
          } catch (onlineError) {
            console.warn('Online deletion failed, but offline deletion completed:', onlineError)
          }
        }
        
        return
      }
      
      // Entry not in offline storage, try online deletion
      if (!navigator.onLine) {
        throw new Error('Entry not found offline and device is offline')
      }
      
      const firestore = getFirebaseFirestore()
      const entryRef = doc(firestore, 'entries', id)
      
      // Verify the entry exists and belongs to the user
      const entrySnap = await getDoc(entryRef)
      if (!entrySnap.exists()) {
        throw new Error('Entry not found')
      }
      
      const entryData = entrySnap.data()
      if (entryData.user_id !== user.uid) {
        throw new Error('Unauthorized access to entry')
      }

      await deleteDoc(entryRef)
    } catch (error) {
      console.error('Failed to delete entry:', error)
      throw error
    }
  }

  // Search entries by content (with offline support)
  static async searchEntries(query: string): Promise<(Entry | OfflineEntry)[]> {
    try {
      const auth = getFirebaseAuth()
      const user = auth.currentUser
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Always search offline first (includes cached online entries)
      const offlineResults = await OfflineStorageService.searchEntries(user.uid, query)
      
      // If online, also search online entries and merge results
      if (navigator.onLine) {
        try {
          // Get all entries and filter client-side
          // TODO: Implement full-text search with Firebase extensions or Algolia
          const allEntries = await this.getEntries()
          
          const searchQuery = query.toLowerCase()
          const onlineResults = allEntries.filter(entry => 
            entry.transcript.toLowerCase().includes(searchQuery) ||
            entry.keywords?.some(keyword => keyword.toLowerCase().includes(searchQuery)) ||
            entry.wins?.some(win => win.toLowerCase().includes(searchQuery)) ||
            entry.regrets?.some(regret => regret.toLowerCase().includes(searchQuery)) ||
            entry.tasks?.some(task => task.toLowerCase().includes(searchQuery))
          )
          
          // Merge results, avoiding duplicates
          const mergedResults: (Entry | OfflineEntry)[] = [...offlineResults]
          
          for (const onlineEntry of onlineResults) {
            const existsOffline = offlineResults.some(offlineEntry => 
              offlineEntry.id === onlineEntry.id
            )
            
            if (!existsOffline) {
              mergedResults.push(onlineEntry)
            }
          }
          
          // Sort by date (newest first)
          return mergedResults.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
        } catch (error) {
          console.warn('Online search failed, using offline results only:', error)
        }
      }
      
      // Return offline results if online search failed or offline
      return offlineResults.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    } catch (error) {
      console.error('Failed to search entries:', error)
      throw error
    }
  }

  /**
   * Perform auto-sync to all available and connected integrations
   * This respects disconnect state and only syncs to active integrations
   */
  private static async performAutoSync(entry: Entry): Promise<void> {
    try {
      // Check Google Sheets integration status
      const googleSheetsAvailable = await GoogleSheetsService.isAvailable()
      if (googleSheetsAvailable) {
        GoogleSheetsService.autoSync(entry)
          .catch(error => {
            console.warn('Google Sheets auto-sync failed for entry', entry.id, ':', error)
            // Continue with other integrations even if one fails
          })
      } else {
        console.log('Google Sheets integration not available, skipping auto-sync for entry', entry.id)
      }

      // Check Notion integration status
      const notionAvailable = await NotionService.isAvailable()
      if (notionAvailable) {
        NotionService.autoSync(entry)
          .catch(error => {
            console.warn('Notion auto-sync failed for entry', entry.id, ':', error)
            // Continue even if Notion sync fails
          })
      } else {
        console.log('Notion integration not available, skipping auto-sync for entry', entry.id)
      }
    } catch (error) {
      console.error('Failed to perform auto-sync for entry', entry.id, ':', error)
      // Don't throw - auto-sync failures shouldn't break entry creation
    }
  }

  /**
   * Manually retry sync for failed entries
   */
  static async retrySyncForEntry(entryId: string): Promise<void> {
    try {
      const entry = await this.getEntry(entryId)
      await this.performAutoSync(entry)
    } catch (error) {
      console.error('Failed to retry sync for entry', entryId, ':', error)
      throw error
    }
  }

  /**
   * Perform sentiment analysis with user-friendly error handling and retry logic
   * @param entryId - The entry ID to analyze
   * @param transcript - The transcript text to analyze
   */
  private static async performSentimentAnalysisWithFallback(entryId: string, transcript: string): Promise<void> {
    try {
      const analysis = await SentimentService.analyzeSentiment(entryId, transcript)
      
      // Update the entry with the analysis results
      const firestore = getFirebaseFirestore()
      const entryRef = doc(firestore, 'entries', entryId)
      
      await updateDoc(entryRef, {
        sentiment_score: analysis.sentiment_score,
        wins: analysis.wins,
        regrets: analysis.regrets,
        tasks: analysis.tasks,
        keywords: analysis.keywords,
        updated_at: new Date().toISOString()
      })
      
      console.log(`Sentiment analysis completed for entry ${entryId}`)
      
    } catch (error) {
      console.error(`Sentiment analysis failed for entry ${entryId}:`, error)
      
      // The SentimentService has already handled retries and provided fallback data
      // No additional user action needed as the analysis will contain fallback values
    }
  }

  /**
   * Basic offline sentiment analysis
   * This is a simplified version that will be replaced when synced online
   */
  private static async performOfflineSentimentAnalysis(localId: string, transcript: string): Promise<void> {
    try {
      // Simple keyword-based sentiment analysis
      const positiveWords = ['good', 'great', 'happy', 'wonderful', 'amazing', 'excellent', 'fantastic', 'love', 'enjoy', 'success', 'win', 'achievement']
      const negativeWords = ['bad', 'terrible', 'sad', 'awful', 'hate', 'frustrated', 'disappointed', 'fail', 'mistake', 'regret', 'problem', 'difficult']
      
      const words = transcript.toLowerCase().split(/\s+/)
      let score = 0
      
      words.forEach(word => {
        if (positiveWords.includes(word)) score += 1
        if (negativeWords.includes(word)) score -= 1
      })
      
      // Normalize to -1 to 1 scale
      const normalizedScore = Math.max(-1, Math.min(1, score / Math.max(words.length / 10, 1)))
      
      await OfflineStorageService.updateEntry(localId, {
        sentiment_score: normalizedScore
      })
    } catch (error) {
      console.error('Offline sentiment analysis failed:', error)
    }
  }
}