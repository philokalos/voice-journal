import { getFirebaseAuth, getFirebaseFirestore } from '../../../lib/firebase'
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore'
import type { Entry } from '../../../shared/types/entry'

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
  // Create a new entry
  static async createEntry(request: CreateEntryRequest): Promise<Entry> {
    try {
      const auth = getFirebaseAuth()
      const user = auth.currentUser
      if (!user) {
        throw new Error('User not authenticated')
      }

      // MVP: Create entry with basic fields only
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

      const firestore = getFirebaseFirestore()
      const entriesRef = collection(firestore, 'entries')
      const docRef = await addDoc(entriesRef, entryData)
      
      return {
        id: docRef.id,
        ...entryData
      } as Entry
    } catch (error) {
      console.error('Failed to create entry:', error)
      
      // MVP: No offline storage for now, just throw error
      // try {
      //   // Store offline if online operation fails
      //   const offlineEntry = await OfflineStorageService.storeEntry({
      //     id: request.id || crypto.randomUUID(),
      //     user_id: request.user_id || 'offline',
      //     ...request,
      //     // MVP: No audio support in offline mode
      //   })
      //   return offlineEntry as Entry
      // } catch (offlineError) {
      //   console.error('Failed to store entry offline:', offlineError)
      //   throw error
      // }
      
      throw error
    }
  }

  // Get all entries for the current user
  static async getEntries(): Promise<Entry[]> {
    try {
      const auth = getFirebaseAuth()
      const user = auth.currentUser
      if (!user) {
        throw new Error('User not authenticated')
      }

      const firestore = getFirebaseFirestore()
      const entriesRef = collection(firestore, 'entries')
      const q = query(
        entriesRef,
        where('user_id', '==', user.uid),
        orderBy('date', 'desc')
      )
      
      const querySnapshot = await getDocs(q)
      const entries: Entry[] = []
      
      querySnapshot.forEach((doc) => {
        entries.push({
          id: doc.id,
          ...doc.data()
        } as Entry)
      })

      return entries
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

  // Update an existing entry
  static async updateEntry(request: UpdateEntryRequest): Promise<Entry> {
    try {
      const auth = getFirebaseAuth()
      const user = auth.currentUser
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { id, ...updateData } = request
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

      // Update the entry
      const updatedData = {
        ...updateData,
        updated_at: new Date().toISOString()
      }
      
      await updateDoc(entryRef, updatedData)
      
      // Return the updated entry
      return {
        id,
        ...existingData,
        ...updatedData
      } as Entry
    } catch (error) {
      console.error('Failed to update entry:', error)
      throw error
    }
  }

  // Delete an entry
  static async deleteEntry(id: string): Promise<void> {
    try {
      const auth = getFirebaseAuth()
      const user = auth.currentUser
      if (!user) {
        throw new Error('User not authenticated')
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

  // Search entries by content
  static async searchEntries(query: string): Promise<Entry[]> {
    try {
      const auth = getFirebaseAuth()
      const user = auth.currentUser
      if (!user) {
        throw new Error('User not authenticated')
      }

      // For now, get all entries and filter client-side
      // TODO: Implement full-text search with Firebase extensions or Algolia
      const entries = await this.getEntries()
      
      const searchQuery = query.toLowerCase()
      return entries.filter(entry => 
        entry.transcript.toLowerCase().includes(searchQuery) ||
        entry.keywords?.some(keyword => keyword.toLowerCase().includes(searchQuery)) ||
        entry.wins?.some(win => win.toLowerCase().includes(searchQuery)) ||
        entry.regrets?.some(regret => regret.toLowerCase().includes(searchQuery)) ||
        entry.tasks?.some(task => task.toLowerCase().includes(searchQuery))
      )
    } catch (error) {
      console.error('Failed to search entries:', error)
      throw error
    }
  }
}