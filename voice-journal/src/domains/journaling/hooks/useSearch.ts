import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { EntryService } from '../services/entryService'
import type { EntryFilters } from '../../../shared/types/entry'

interface UseSearchParams {
  searchText: string
  keywords: string[]
  sentimentMin?: number
  sentimentMax?: number
  startDate?: string
  endDate?: string
  debounceMs?: number
}

interface UseSearchResult {
  entries: any[]
  isLoading: boolean
  isError: boolean
  error: Error | null
  totalCount: number
  hasMore: boolean
  loadMore: () => void
  isLoadingMore: boolean
}

export const useSearch = ({
  searchText,
  keywords,
  sentimentMin,
  sentimentMax,
  startDate,
  endDate,
  debounceMs = 300
}: UseSearchParams): UseSearchResult => {
  const [debouncedSearchText, setDebouncedSearchText] = useState(searchText)
  const [page, setPage] = useState(1)
  const [allEntries, setAllEntries] = useState<any[]>([])
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // Debounce search text
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText)
      setPage(1) // Reset page when search changes
      setAllEntries([]) // Clear previous results
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [searchText, debounceMs])

  // Create filters object
  const filters: EntryFilters = useMemo(() => {
    const result: EntryFilters = {}
    
    if (debouncedSearchText.trim()) {
      result.search_text = debouncedSearchText.trim()
    }
    
    if (keywords.length > 0) {
      result.keywords = keywords
    }
    
    if (sentimentMin !== undefined) {
      result.sentiment_min = sentimentMin
    }
    
    if (sentimentMax !== undefined) {
      result.sentiment_max = sentimentMax
    }
    
    if (startDate) {
      result.start_date = startDate
    }
    
    if (endDate) {
      result.end_date = endDate
    }
    
    return result
  }, [debouncedSearchText, keywords, sentimentMin, sentimentMax, startDate, endDate])

  // Query with current filters and page
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['entries-search', filters, page],
    queryFn: () => EntryService.getEntries(filters, page, 20),
    enabled: true,
    staleTime: 30 * 1000, // 30 seconds
    placeholderData: (previousData) => previousData,
  })

  // Update accumulated entries when new data arrives
  useEffect(() => {
    if (data && 'entries' in data && Array.isArray(data.entries)) {
      if (page === 1) {
        setAllEntries(data.entries)
      } else {
        setAllEntries(prev => [...prev, ...data.entries])
      }
      setIsLoadingMore(false)
    }
  }, [data, page])

  // Reset when filters change
  useEffect(() => {
    setPage(1)
    setAllEntries([])
  }, [filters])

  const loadMore = () => {
    if (data && 'total_count' in data && allEntries.length < (data.total_count as number) && !isLoadingMore) {
      setIsLoadingMore(true)
      setPage(prev => prev + 1)
    }
  }

  const hasMore = data && 'total_count' in data ? allEntries.length < (data.total_count as number) : false

  return {
    entries: allEntries,
    isLoading: isLoading && page === 1,
    isError,
    error,
    totalCount: (data && 'total_count' in data ? data.total_count as number : 0),
    hasMore,
    loadMore,
    isLoadingMore
  }
}

export const useSearchSuggestions = (query: string) => {
  return useQuery({
    queryKey: ['search-suggestions', query],
    queryFn: async () => {
      if (!query.trim()) return []
      
      // Get recent entries to extract keywords for suggestions
      const result = await EntryService.getEntries({}, 1, 100)
      
      // Extract unique keywords that match the query
      const keywords = new Set<string>()
      if (result && 'entries' in result && Array.isArray(result.entries)) {
        result.entries.forEach(entry => {
          if (entry.keywords && Array.isArray(entry.keywords)) {
            entry.keywords.forEach((keyword: string) => {
              if (keyword.toLowerCase().includes(query.toLowerCase())) {
                keywords.add(keyword)
              }
            })
          }
        })
      }
      
      return Array.from(keywords).slice(0, 10)
    },
    enabled: query.trim().length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useRecentSearches = () => {
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  useEffect(() => {
    const stored = localStorage.getItem('voice-journal-recent-searches')
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored))
      } catch {
        setRecentSearches([])
      }
    }
  }, [])

  const addRecentSearch = (search: string) => {
    if (!search.trim()) return
    
    const updated = [search, ...recentSearches.filter(s => s !== search)].slice(0, 10)
    setRecentSearches(updated)
    localStorage.setItem('voice-journal-recent-searches', JSON.stringify(updated))
  }

  const clearRecentSearches = () => {
    setRecentSearches([])
    localStorage.removeItem('voice-journal-recent-searches')
  }

  return {
    recentSearches,
    addRecentSearch,
    clearRecentSearches
  }
}