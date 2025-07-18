import { supabase } from '../../../lib/supabase'
// MVP: Disabled offline features
// import { OfflineStorageService } from '../../../lib/offlineDB'
import type { Entry } from '../../../shared/types/entry'

export interface CreateEntryRequest {
  content: string
  date: string
  sentiment?: string
  keywords?: string[]
  wins?: string[]
  regrets?: string[]
  todos?: string[]
  // MVP: Simplified without audio features for now
  // id?: string
  // user_id?: string
  // has_audio?: boolean
  // audio_url?: string
  // audio_path?: string
  // audio_size?: number
}

export interface UpdateEntryRequest {
  id: string
  content?: string
  sentiment?: string
  keywords?: string[]
  wins?: string[]
  regrets?: string[]
  todos?: string[]
}

export class EntryService {
  // Create a new entry
  static async createEntry(request: CreateEntryRequest): Promise<Entry> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      // MVP: Create entry with basic fields only
      const entryData = {
        user_id: user.id,
        content: request.content,
        date: request.date,
        sentiment: request.sentiment || null,
        keywords: request.keywords || [],
        wins: request.wins || [],
        regrets: request.regrets || [],
        todos: request.todos || []
      }

      const { data, error } = await supabase
        .from('entries')
        .insert(entryData)
        .select()
        .single()

      if (error) {
        throw error
      }

      return data as Entry
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })

      if (error) {
        throw error
      }

      return data as Entry[]
    } catch (error) {
      console.error('Failed to fetch entries:', error)
      throw error
    }
  }

  // Get a single entry by ID
  static async getEntry(id: string): Promise<Entry> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (error) {
        throw error
      }

      return data as Entry
    } catch (error) {
      console.error('Failed to fetch entry:', error)
      throw error
    }
  }

  // Update an existing entry
  static async updateEntry(request: UpdateEntryRequest): Promise<Entry> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { id, ...updateData } = request

      const { data, error } = await supabase
        .from('entries')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        throw error
      }

      return data as Entry
    } catch (error) {
      console.error('Failed to update entry:', error)
      throw error
    }
  }

  // Delete an entry
  static async deleteEntry(id: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { error } = await supabase
        .from('entries')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Failed to delete entry:', error)
      throw error
    }
  }

  // Search entries by content
  static async searchEntries(query: string): Promise<Entry[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .eq('user_id', user.id)
        .textSearch('content', query)
        .order('date', { ascending: false })

      if (error) {
        throw error
      }

      return data as Entry[]
    } catch (error) {
      console.error('Failed to search entries:', error)
      throw error
    }
  }
}