import React, { useState } from 'react'
import { useEntries } from '../hooks/useEntries'
import { EntryReview } from './EntryReview'
import type { Entry } from '../../../shared/types/entry'

export const EntryList: React.FC = () => {
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list')
  
  const { data: entriesResult, isLoading, error } = useEntries()

  const handleEntryClick = (entry: Entry) => {
    setSelectedEntryId(entry.id)
    setViewMode('detail')
  }

  const handleBackToList = () => {
    setSelectedEntryId(null)
    setViewMode('list')
  }

  const selectedEntry = entriesResult?.entries.find(entry => entry.id === selectedEntryId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading entries...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-semibold mb-2">Error loading entries</h3>
        <p className="text-red-700">{error.message}</p>
      </div>
    )
  }

  if (!entriesResult || entriesResult.entries.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No entries yet</h3>
        <p className="text-gray-500 mb-4">Start by recording your first journal entry</p>
        <button
          onClick={() => window.location.hash = '#record'}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Record Entry
        </button>
      </div>
    )
  }

  // Detail view
  if (viewMode === 'detail' && selectedEntry) {
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
            <span>Back to entries</span>
          </button>
        </div>
        
        <EntryReview
          entry={selectedEntry}
          onSave={(updatedEntry) => {
            // Entry will be updated via React Query cache
            console.log('Entry updated:', updatedEntry)
          }}
        />
      </div>
    )
  }

  // List view
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Your Journal Entries</h2>
        <div className="text-sm text-gray-500">
          {entriesResult.total_count} {entriesResult.total_count === 1 ? 'entry' : 'entries'}
        </div>
      </div>

      <div className="space-y-4">
        {entriesResult.entries.map((entry) => (
          <EntryCard
            key={entry.id}
            entry={entry}
            onClick={() => handleEntryClick(entry)}
          />
        ))}
      </div>
    </div>
  )
}

interface EntryCardProps {
  entry: Entry
  onClick: () => void
}

const EntryCard: React.FC<EntryCardProps> = ({ entry, onClick }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getSentimentColor = (score: number) => {
    if (score >= 0.6) return 'text-green-600'
    if (score >= 0.2) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getSentimentIcon = (score: number) => {
    if (score >= 0.6) return '😊'
    if (score >= 0.2) return '😐'
    return '😟'
  }

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{formatDate(entry.date)}</h3>
          <p className="text-sm text-gray-500">
            {new Date(entry.created_at).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xl">{getSentimentIcon(entry.sentiment_score)}</span>
          <span className={`text-sm font-medium ${getSentimentColor(entry.sentiment_score)}`}>
            {Math.round(entry.sentiment_score * 100)}%
          </span>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-gray-700 line-clamp-3">{entry.transcript}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {entry.wins.length > 0 && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            {entry.wins.length} win{entry.wins.length > 1 ? 's' : ''}
          </span>
        )}
        {entry.regrets.length > 0 && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            {entry.regrets.length} regret{entry.regrets.length > 1 ? 's' : ''}
          </span>
        )}
        {entry.tasks.length > 0 && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {entry.tasks.length} task{entry.tasks.length > 1 ? 's' : ''}
          </span>
        )}
        {entry.keywords.length > 0 && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            {entry.keywords.length} keyword{entry.keywords.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span>Click to view details</span>
        </div>
        <div className="text-sm text-gray-500">
          {entry.transcript.length} characters
        </div>
      </div>
    </div>
  )
}