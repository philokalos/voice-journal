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
  sync_status?: SyncStatusInfo
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

export type SyncService = 'googleSheets' | 'notion'
export type SyncStatus = 'synced' | 'failed' | 'pending' | 'never_synced'

export interface ServiceSyncStatus {
  status: SyncStatus
  last_sync_at?: string // ISO datetime string
  last_error?: string
  retry_count?: number
  next_retry_at?: string // ISO datetime string for failed syncs
}

export interface SyncStatusInfo {
  googleSheets?: ServiceSyncStatus
  notion?: ServiceSyncStatus
  last_updated: string // ISO datetime string
}