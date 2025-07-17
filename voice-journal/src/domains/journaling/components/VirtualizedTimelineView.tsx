import React, { useMemo, useCallback, useRef } from 'react'
import { FixedSizeList as List } from 'react-window'
import InfiniteLoader from 'react-window-infinite-loader'
import { useSearch } from '../hooks/useSearch'
import type { Entry } from '../../../shared/types/entry'

interface VirtualizedTimelineViewProps {
  searchText: string
  keywords: string[]
  sentimentMin?: number
  sentimentMax?: number
  startDate?: string
  endDate?: string
  onEntrySelect: (entry: Entry) => void
}

interface TimelineItem {
  type: 'date-header' | 'entry'
  date?: string
  entry?: Entry
  isFirstInGroup?: boolean
}

const ITEM_HEIGHT = 120

export const VirtualizedTimelineView: React.FC<VirtualizedTimelineViewProps> = ({
  searchText,
  keywords,
  sentimentMin,
  sentimentMax,
  startDate,
  endDate,
  onEntrySelect
}) => {
  const listRef = useRef<List>(null)
  const infiniteLoaderRef = useRef<InfiniteLoader>(null)

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

  // Convert entries to timeline items with date headers
  const timelineItems = useMemo(() => {
    const items: TimelineItem[] = []
    let currentDate = ''

    entries.forEach((entry) => {
      if (entry.date !== currentDate) {
        // Add date header
        items.push({
          type: 'date-header',
          date: entry.date
        })
        currentDate = entry.date
      }

      // Add entry
      items.push({
        type: 'entry',
        entry: entry,
        isFirstInGroup: entry.date !== currentDate
      })
    })

    return items
  }, [entries])

  // Check if item is loaded
  const isItemLoaded = useCallback((index: number) => {
    return index < timelineItems.length
  }, [timelineItems])

  // Load more items
  const loadMoreItems = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      return loadMore()
    }
    return Promise.resolve()
  }, [hasMore, isLoadingMore, loadMore])


  // Render timeline item
  const TimelineItem: React.FC<{ index: number; style: React.CSSProperties }> = ({ index, style }) => {
    const item = timelineItems[index]

    if (!item) {
      return (
        <div style={style} className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      )
    }

    if (item.type === 'date-header') {
      return (
        <div style={style} className="sticky top-0 z-10 bg-white border-b border-gray-200">
          <div className="px-4 py-3">
            <h3 className="text-lg font-semibold text-gray-900">
              {formatDate(item.date!)}
            </h3>
          </div>
        </div>
      )
    }

    const entry = item.entry!
    
    return (
      <div style={style} className="px-4 py-2">
        <div className="flex items-start space-x-4">
          {/* Timeline Dot */}
          <div className="relative flex-shrink-0 mt-4">
            <div className={`w-3 h-3 rounded-full border-2 ${getSentimentColor(entry.sentiment_score)} border-white`}></div>
            {/* Timeline Line */}
            <div className="absolute left-1/2 top-6 w-0.5 h-16 bg-gray-200 transform -translate-x-1/2"></div>
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

            <div className="mb-3">
              <p className="text-gray-900 text-sm line-clamp-2">{entry.transcript}</p>
            </div>

            {/* Reflection Tags */}
            <div className="flex flex-wrap gap-1">
              {entry.wins.length > 0 && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  ✓ {entry.wins.length}
                </span>
              )}
              {entry.regrets.length > 0 && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  ✗ {entry.regrets.length}
                </span>
              )}
              {entry.tasks.length > 0 && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  ☐ {entry.tasks.length}
                </span>
              )}
              {entry.keywords.slice(0, 3).map((keyword, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

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

  if (timelineItems.length === 0) {
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
    <div className="space-y-4">
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

      {/* Virtualized Timeline */}
      <div className="bg-white rounded-lg border border-gray-200" style={{ height: '600px' }}>
        <InfiniteLoader
          ref={infiniteLoaderRef}
          isItemLoaded={isItemLoaded}
          itemCount={hasMore ? timelineItems.length + 1 : timelineItems.length}
          loadMoreItems={loadMoreItems}
        >
          {({ onItemsRendered, ref }) => (
            <List
              ref={(list) => {
                listRef.current = list
                ref(list)
              }}
              height={600}
              width="100%"
              itemCount={timelineItems.length}
              itemSize={ITEM_HEIGHT}
              onItemsRendered={onItemsRendered}
              overscanCount={5}
            >
              {TimelineItem}
            </List>
          )}
        </InfiniteLoader>
      </div>

      {/* Performance Info */}
      <div className="text-center text-xs text-gray-500">
        <p>
          ⚡ Virtualized scrolling for optimal performance with large datasets
        </p>
      </div>
    </div>
  )
}