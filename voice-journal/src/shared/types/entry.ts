export interface Entry {
  id: string
  user_id: string
  date: string // ISO date string (YYYY-MM-DD)
  transcript: string
  wins: string[]
  regrets: string[]
  tasks: string[]
  keywords: string[]
  sentiment_score: number
  audio_file_path?: string
  created_at: string // ISO datetime string
  updated_at: string // ISO datetime string
}

export interface CreateEntryRequest {
  date: string
  transcript: string
  wins?: string[]
  regrets?: string[]
  tasks?: string[]
  keywords?: string[]
  sentiment_score?: number
  audio_file_path?: string
}

export interface UpdateEntryRequest {
  transcript?: string
  wins?: string[]
  regrets?: string[]
  tasks?: string[]
  keywords?: string[]
  sentiment_score?: number
  audio_file_path?: string
}

export interface EntryFilters {
  start_date?: string
  end_date?: string
  keywords?: string[]
  sentiment_min?: number
  sentiment_max?: number
  search_text?: string
}

export interface EntriesQueryResult {
  entries: Entry[]
  total_count: number
  page: number
  page_size: number
}

export interface AudioUploadResult {
  file_path: string
  file_url: string
  file_size: number
}