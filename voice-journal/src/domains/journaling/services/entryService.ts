import { supabase } from '../../../lib/supabase'
import type { 
  Entry, 
  CreateEntryRequest, 
  UpdateEntryRequest, 
  EntryFilters, 
  EntriesQueryResult,
  AudioUploadResult 
} from '../../../shared/types/entry'

export class EntryService {
  static async createEntry(data: CreateEntryRequest): Promise<Entry> {
    const { data: entry, error } = await supabase
      .from('entries')
      .insert([data])
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create entry: ${error.message}`)
    }

    return entry
  }

  static async getEntry(id: string): Promise<Entry | null> {
    const { data: entry, error } = await supabase
      .from('entries')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Entry not found
      }
      throw new Error(`Failed to get entry: ${error.message}`)
    }

    return entry
  }

  static async updateEntry(id: string, data: UpdateEntryRequest): Promise<Entry> {
    const { data: entry, error } = await supabase
      .from('entries')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update entry: ${error.message}`)
    }

    return entry
  }

  static async deleteEntry(id: string): Promise<void> {
    const { error } = await supabase
      .from('entries')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete entry: ${error.message}`)
    }
  }

  static async getEntries(
    filters: EntryFilters = {},
    page: number = 1,
    pageSize: number = 20
  ): Promise<EntriesQueryResult> {
    let query = supabase
      .from('entries')
      .select('*', { count: 'exact' })
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters.start_date) {
      query = query.gte('date', filters.start_date)
    }
    if (filters.end_date) {
      query = query.lte('date', filters.end_date)
    }
    if (filters.keywords && filters.keywords.length > 0) {
      query = query.overlaps('keywords', filters.keywords)
    }
    if (filters.sentiment_min !== undefined) {
      query = query.gte('sentiment_score', filters.sentiment_min)
    }
    if (filters.sentiment_max !== undefined) {
      query = query.lte('sentiment_score', filters.sentiment_max)
    }
    if (filters.search_text) {
      query = query.textSearch('transcript', filters.search_text)
    }

    // Apply pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data: entries, error, count } = await query

    if (error) {
      throw new Error(`Failed to get entries: ${error.message}`)
    }

    return {
      entries: entries || [],
      total_count: count || 0,
      page,
      page_size: pageSize
    }
  }

  static async getEntriesByDate(date: string): Promise<Entry[]> {
    const { data: entries, error } = await supabase
      .from('entries')
      .select('*')
      .eq('date', date)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to get entries by date: ${error.message}`)
    }

    return entries || []
  }

  static async uploadAudio(file: File, entryId?: string): Promise<AudioUploadResult> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) {
      throw new Error('User not authenticated')
    }

    const fileName = entryId 
      ? `${entryId}.${file.name.split('.').pop()}`
      : `${Date.now()}.${file.name.split('.').pop()}`
    
    const filePath = `${userId}/${fileName}`

    const { data, error } = await supabase.storage
      .from('audio-recordings')
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type
      })

    if (error) {
      throw new Error(`Failed to upload audio: ${error.message}`)
    }

    const { data: { publicUrl } } = supabase.storage
      .from('audio-recordings')
      .getPublicUrl(filePath)

    return {
      file_path: data.path,
      file_url: publicUrl,
      file_size: file.size
    }
  }

  static async deleteAudio(filePath: string): Promise<void> {
    const { error } = await supabase.storage
      .from('audio-recordings')
      .remove([filePath])

    if (error) {
      throw new Error(`Failed to delete audio: ${error.message}`)
    }
  }

  static async getAudioUrl(filePath: string): Promise<string> {
    const { data } = await supabase.storage
      .from('audio-recordings')
      .createSignedUrl(filePath, 3600) // 1 hour expiry

    if (!data?.signedUrl) {
      throw new Error('Failed to generate audio URL')
    }

    return data.signedUrl
  }
}