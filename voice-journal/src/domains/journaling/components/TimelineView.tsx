import React, { useEffect, useRef, useCallback } from 'react'
import { useSearch } from '../hooks/useSearch'
import type { Entry } from '../../../shared/types/entry'

interface TimelineViewProps {
  searchText: string
  keywords: string[]
  sentimentMin?: number
  sentimentMax?: number
  startDate?: string
  endDate?: string
  onEntrySelect: (entry: Entry) => void
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  searchText,
  keywords,
  sentimentMin,
  sentimentMax,
  startDate,
  endDate,
  onEntrySelect
}) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const {
    entries,
    isLoading,
    isError,
    error,
    totalCount,
    hasMore,
    loadMore,
    isLoadingMore
  } = useSearch({
    searchText,
    keywords,
    sentimentMin,
    sentimentMax,
    startDate,
    endDate
  })

  // Intersection Observer for infinite scroll
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const target = entries[0]
    if (target.isIntersecting && hasMore && !isLoadingMore) {
      loadMore()
    }
  }, [hasMore, isLoadingMore, loadMore])

  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    observerRef.current = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '20px',
      threshold: 0.1
    })

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [handleObserver])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getSentimentColor = (score: number) => {
    if (score >= 0.6) return 'border-green-500 bg-green-50'
    if (score >= 0.2) return 'border-yellow-500 bg-yellow-50'
    return 'border-red-500 bg-red-50'
  }

  const getSentimentIcon = (score: number) => {
    if (score >= 0.6) return '😊'
    if (score >= 0.2) return '😐'
    return '😟'
  }

  const groupEntriesByDate = (entries: Entry[]) => {
    const grouped: { [key: string]: Entry[] } = {}
    
    entries.forEach(entry => {
      const date = entry.date
      if (!grouped[date]) {
        grouped[date] = []
      }
      grouped[date].push(entry)
    })
    
    return grouped
  }

  const groupedEntries = groupEntriesByDate(entries)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading timeline...</span>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-semibold mb-2">Error loading timeline</h3>
        <p className="text-red-700">{error?.message}</p>
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No entries found</h3>
        <p className="text-gray-500 mb-4">
          {searchText || keywords.length > 0 || sentimentMin !== undefined || sentimentMax !== undefined || startDate || endDate
            ? 'Try adjusting your search filters'
            : 'Start by recording your first journal entry'
          }
        </p>
      </div>
    )
  }

  return (
    <div ref={scrollRef} className="space-y-6">
      {/* Results Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            <span className="text-sm font-medium text-blue-900">
              Found {totalCount} {totalCount === 1 ? 'entry' : 'entries'}
            </span>
          </div>
          <div className="text-sm text-blue-700">
            Showing {entries.length} of {totalCount}
          </div>
        </div>
      </div>

      {/* Timeline Entries */}
      <div className="space-y-8">
        {Object.entries(groupedEntries).map(([date, dateEntries]) => (
          <div key={date} className="relative">
            {/* Date Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 pb-2 mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{formatDate(date)}</h3>
            </div>

            {/* Timeline Line */}
            <div className="absolute left-6 top-16 bottom-0 w-0.5 bg-gray-200"></div>

            {/* Entries for this date */}
            <div className="space-y-4">
              {dateEntries.map((entry) => (
                <div key={entry.id} className="relative flex items-start space-x-4">
                  {/* Timeline Dot */}
                  <div className="relative flex-shrink-0">
                    <div className={`w-3 h-3 rounded-full border-2 ${getSentimentColor(entry.sentiment_score)} border-white`}></div>
                  </div>

                  {/* Entry Card */}
                  <div
                    className={`flex-1 bg-white border-l-4 ${getSentimentColor(entry.sentiment_score)} rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow`}
                    onClick={() => onEntrySelect(entry)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getSentimentIcon(entry.sentiment_score)}</span>
                        <span className="text-sm text-gray-500">
                          {formatTime(entry.created_at)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {Math.round(entry.sentiment_score * 100)}% positive
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-gray-900 line-clamp-3">{entry.transcript}</p>
                    </div>

                    {/* Reflection Tags */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {entry.wins.length > 0 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✓ {entry.wins.length} win{entry.wins.length > 1 ? 's' : ''}
                        </span>
                      )}
                      {entry.regrets.length > 0 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          ✗ {entry.regrets.length} regret{entry.regrets.length > 1 ? 's' : ''}
                        </span>
                      )}
                      {entry.tasks.length > 0 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          ☐ {entry.tasks.length} task{entry.tasks.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {/* Keywords */}
                    {entry.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {entry.keywords.slice(0, 5).map((keyword, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                          >
                            {keyword}
                          </span>
                        ))}
                        {entry.keywords.length > 5 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            +{entry.keywords.length - 5} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Load More Trigger */}
      {hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-4">
          {isLoadingMore ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm text-gray-600">Loading more entries...</span>
            </div>
          ) : (
            <button
              onClick={loadMore}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Load More
            </button>
          )}
        </div>
      )}

      {/* End of Results */}
      {!hasMore && entries.length > 0 && (
        <div className="text-center py-4">
          <div className="inline-flex items-center space-x-2 text-sm text-gray-500">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>You've reached the end of your timeline</span>
          </div>
        </div>
      )}
    </div>
  )
}