import React, { useState } from 'react'

interface SearchFiltersProps {
  keywords: string[]
  sentimentMin?: number
  sentimentMax?: number
  startDate?: string
  endDate?: string
  onKeywordsChange: (keywords: string[]) => void
  onSentimentChange: (min?: number, max?: number) => void
  onDateRangeChange: (start?: string, end?: string) => void
  onClear: () => void
}

export const SearchFilters: React.FC<SearchFiltersProps> = ({
  keywords,
  sentimentMin,
  sentimentMax,
  startDate,
  endDate,
  onKeywordsChange,
  onSentimentChange,
  onDateRangeChange,
  onClear
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [newKeyword, setNewKeyword] = useState('')

  const handleAddKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      onKeywordsChange([...keywords, newKeyword.trim()])
      setNewKeyword('')
    }
  }

  const handleRemoveKeyword = (keyword: string) => {
    onKeywordsChange(keywords.filter(k => k !== keyword))
  }

  const handleKeywordInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddKeyword()
    }
  }

  const handleSentimentMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? parseFloat(e.target.value) : undefined
    onSentimentChange(value, sentimentMax)
  }

  const handleSentimentMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? parseFloat(e.target.value) : undefined
    onSentimentChange(sentimentMin, value)
  }

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value || undefined
    onDateRangeChange(value, endDate)
  }

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value || undefined
    onDateRangeChange(startDate, value)
  }

  const hasActiveFilters = keywords.length > 0 || sentimentMin !== undefined || sentimentMax !== undefined || startDate || endDate

  const getSentimentLabel = (value: number) => {
    if (value >= 0.6) return 'Positive'
    if (value >= 0.2) return 'Neutral'
    return 'Negative'
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <svg 
              className={`h-4 w-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            <span className="text-sm font-medium">Filters</span>
          </button>
          
          {hasActiveFilters && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {[
                keywords.length > 0 && `${keywords.length} keywords`,
                (sentimentMin !== undefined || sentimentMax !== undefined) && 'sentiment',
                (startDate || endDate) && 'date range'
              ].filter(Boolean).join(', ')}
            </span>
          )}
        </div>
        
        {hasActiveFilters && (
          <button
            onClick={onClear}
            className="text-sm text-red-600 hover:text-red-800"
          >
            Clear All
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          {/* Keywords Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Keywords
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                >
                  {keyword}
                  <button
                    onClick={() => handleRemoveKeyword(keyword)}
                    className="ml-1 text-purple-600 hover:text-purple-800"
                  >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={handleKeywordInputKeyDown}
                placeholder="Add keyword..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleAddKeyword}
                disabled={!newKeyword.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
          </div>

          {/* Sentiment Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sentiment Range
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Min</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={sentimentMin ?? 0}
                  onChange={handleSentimentMinChange}
                  className="w-full"
                />
                <div className="text-xs text-gray-600 mt-1">
                  {sentimentMin !== undefined ? `${getSentimentLabel(sentimentMin)} (${Math.round(sentimentMin * 100)}%)` : 'Any'}
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Max</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={sentimentMax ?? 1}
                  onChange={handleSentimentMaxChange}
                  className="w-full"
                />
                <div className="text-xs text-gray-600 mt-1">
                  {sentimentMax !== undefined ? `${getSentimentLabel(sentimentMax)} (${Math.round(sentimentMax * 100)}%)` : 'Any'}
                </div>
              </div>
            </div>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Range
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">From</label>
                <input
                  type="date"
                  value={startDate || ''}
                  onChange={handleStartDateChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">To</label>
                <input
                  type="date"
                  value={endDate || ''}
                  onChange={handleEndDateChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Quick Filters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Filters
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onDateRangeChange(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], new Date().toISOString().split('T')[0])}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Last 7 days
              </button>
              <button
                onClick={() => onDateRangeChange(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], new Date().toISOString().split('T')[0])}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Last 30 days
              </button>
              <button
                onClick={() => onSentimentChange(0.6, 1)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Positive entries
              </button>
              <button
                onClick={() => onSentimentChange(0, 0.4)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Negative entries
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}