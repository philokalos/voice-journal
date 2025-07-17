import React, { useState, useEffect } from 'react'
import { SearchBar } from './SearchBar'
import { SearchFilters } from './SearchFilters'
import { TimelineView } from './TimelineView'
import { VirtualizedTimelineView } from './VirtualizedTimelineView'
import { CalendarView } from './CalendarView'
import { EntryReview } from './EntryReview'
import { usePerformanceMode, usePerformanceMonitor } from '../hooks/usePerformanceMode'
import { useEntries } from '../hooks/useEntries'
import type { Entry } from '../../../shared/types/entry'

type ViewMode = 'timeline' | 'calendar'

export const JournalDashboard: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('timeline')
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null)
  
  // Search and filter state
  const [searchText, setSearchText] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])
  const [sentimentMin, setSentimentMin] = useState<number | undefined>()
  const [sentimentMax, setSentimentMax] = useState<number | undefined>()
  const [startDate, setStartDate] = useState<string | undefined>()
  const [endDate, setEndDate] = useState<string | undefined>()

  // Performance monitoring
  const { mode, recommendedMode, setPerformanceMode, updateEntryCount } = usePerformanceMode()
  const { metrics } = usePerformanceMonitor()

  // Get total entry count for performance optimization
  const { data: entriesResult } = useEntries({}, 1, 1)
  
  useEffect(() => {
    if (entriesResult?.total_count) {
      updateEntryCount(entriesResult.total_count)
    }
  }, [entriesResult?.total_count, updateEntryCount])

  const handleSentimentChange = (min?: number, max?: number) => {
    setSentimentMin(min)
    setSentimentMax(max)
  }

  const handleDateRangeChange = (start?: string, end?: string) => {
    setStartDate(start)
    setEndDate(end)
  }

  const handleClearFilters = () => {
    setSearchText('')
    setKeywords([])
    setSentimentMin(undefined)
    setSentimentMax(undefined)
    setStartDate(undefined)
    setEndDate(undefined)
  }

  const handleEntrySelect = (entry: Entry) => {
    setSelectedEntry(entry)
  }

  const handleBackToList = () => {
    setSelectedEntry(null)
  }

  const handleDateSelect = (date: string) => {
    // When a date is selected in calendar view, switch to timeline view with date filter
    setStartDate(date)
    setEndDate(date)
    setViewMode('timeline')
  }

  // Show entry detail view
  if (selectedEntry) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBackToList}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to {viewMode === 'timeline' ? 'Timeline' : 'Calendar'}</span>
          </button>
        </div>
        
        <EntryReview
          entry={selectedEntry}
          onSave={(updatedEntry) => {
            setSelectedEntry(updatedEntry)
          }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <SearchBar
        value={searchText}
        onChange={setSearchText}
        placeholder="Search your journal entries..."
      />

      {/* Filters */}
      <SearchFilters
        keywords={keywords}
        sentimentMin={sentimentMin}
        sentimentMax={sentimentMax}
        startDate={startDate}
        endDate={endDate}
        onKeywordsChange={setKeywords}
        onSentimentChange={handleSentimentChange}
        onDateRangeChange={handleDateRangeChange}
        onClear={handleClearFilters}
      />

      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('timeline')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'timeline'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <span>Timeline</span>
            </div>
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'calendar'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Calendar</span>
            </div>
          </button>
        </div>

        {/* View-specific actions */}
        {viewMode === 'timeline' && (
          <div className="flex items-center space-x-2">
            {/* Performance Mode Toggle */}
            <div className="flex items-center space-x-2">
              <select
                value={mode}
                onChange={(e) => setPerformanceMode(e.target.value as any)}
                className="text-xs border border-gray-300 rounded px-2 py-1"
              >
                <option value="auto">Auto</option>
                <option value="standard">Standard</option>
                <option value="virtualized">Virtualized</option>
              </select>
              {recommendedMode !== mode && mode === 'auto' && (
                <span className="text-xs text-blue-600">
                  Using {recommendedMode}
                </span>
              )}
            </div>
            
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <div className="flex items-center space-x-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                </svg>
                <span>Top</span>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* View Content */}
      <div className="min-h-96">
        {viewMode === 'timeline' ? (
          recommendedMode === 'virtualized' ? (
            <VirtualizedTimelineView
              searchText={searchText}
              keywords={keywords}
              sentimentMin={sentimentMin}
              sentimentMax={sentimentMax}
              startDate={startDate}
              endDate={endDate}
              onEntrySelect={handleEntrySelect}
            />
          ) : (
            <TimelineView
              searchText={searchText}
              keywords={keywords}
              sentimentMin={sentimentMin}
              sentimentMax={sentimentMax}
              startDate={startDate}
              endDate={endDate}
              onEntrySelect={handleEntrySelect}
            />
          )
        ) : (
          <CalendarView
            onDateSelect={handleDateSelect}
            onEntrySelect={handleEntrySelect}
          />
        )}
      </div>

      {/* Performance Information */}
      <div className="text-center text-xs text-gray-500">
        <div className="flex items-center justify-center space-x-4">
          <span>
            Mode: {recommendedMode === 'virtualized' ? '⚡ Virtualized' : '📋 Standard'}
          </span>
          {entriesResult?.total_count && (
            <span>{entriesResult.total_count} total entries</span>
          )}
          {metrics.loadTime > 0 && (
            <span>Load: {Math.round(metrics.loadTime)}ms</span>
          )}
        </div>
      </div>
    </div>
  )
}