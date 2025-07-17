import React, { useState, useEffect, useRef } from 'react'
import { useUpdateEntry } from '../hooks/useEntries'
import { useAnalyzeEntry } from '../hooks/useAnalysis'
import type { Entry } from '../../../shared/types/entry'

interface EntryReviewProps {
  entry: Entry
  onSave?: (updatedEntry: Entry) => void
  onCancel?: () => void
  isEditing?: boolean
  className?: string
}

export const EntryReview: React.FC<EntryReviewProps> = ({
  entry,
  onSave,
  onCancel,
  isEditing = false,
  className = ''
}) => {
  const [editMode, setEditMode] = useState(isEditing)
  const [editedEntry, setEditedEntry] = useState<Entry>(entry)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  
  const transcriptRef = useRef<HTMLTextAreaElement>(null)
  const updateEntryMutation = useUpdateEntry()
  const analyzeEntryMutation = useAnalyzeEntry()

  // Update local state when entry prop changes
  useEffect(() => {
    setEditedEntry(entry)
  }, [entry])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle keyboard shortcuts when in edit mode
      if (!editMode) return
      
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault()
            handleSave()
            break
          case 'Escape':
            e.preventDefault()
            handleCancel()
            break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [editMode])

  // Focus transcript when entering edit mode
  useEffect(() => {
    if (editMode && transcriptRef.current) {
      transcriptRef.current.focus()
    }
  }, [editMode])

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 4000)
  }

  const handleInputChange = (field: keyof Entry, value: string | string[]) => {
    setEditedEntry(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleArrayFieldChange = (field: 'wins' | 'regrets' | 'tasks' | 'keywords', index: number, value: string) => {
    setEditedEntry(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }))
  }

  const handleAddArrayItem = (field: 'wins' | 'regrets' | 'tasks' | 'keywords') => {
    setEditedEntry(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }))
  }

  const handleRemoveArrayItem = (field: 'wins' | 'regrets' | 'tasks' | 'keywords', index: number) => {
    setEditedEntry(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }))
  }

  const handleSave = async () => {
    try {
      // Filter out empty strings from arrays
      const cleanedEntry = {
        ...editedEntry,
        wins: editedEntry.wins.filter(win => win.trim() !== ''),
        regrets: editedEntry.regrets.filter(regret => regret.trim() !== ''),
        tasks: editedEntry.tasks.filter(task => task.trim() !== ''),
        keywords: editedEntry.keywords.filter(keyword => keyword.trim() !== '')
      }

      await updateEntryMutation.mutateAsync(cleanedEntry)
      setEditMode(false)
      onSave?.(cleanedEntry)
      showNotification('success', 'Entry updated successfully!')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update entry'
      showNotification('error', errorMessage)
    }
  }

  const handleCancel = () => {
    setEditedEntry(entry)
    setEditMode(false)
    onCancel?.()
  }

  const handleReanalyze = async () => {
    setIsAnalyzing(true)
    try {
      await analyzeEntryMutation.mutateAsync({
        entryId: entry.id,
        transcript: editedEntry.transcript
      })
      showNotification('success', 'Entry re-analyzed successfully!')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to re-analyze entry'
      showNotification('error', errorMessage)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getSentimentColor = (score: number) => {
    if (score >= 0.6) return 'text-green-600'
    if (score >= 0.2) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getSentimentLabel = (score: number) => {
    if (score >= 0.6) return 'Positive'
    if (score >= 0.2) return 'Neutral'
    return 'Negative'
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      {/* Notification */}
      {notification && (
        <div className={`mb-4 p-3 rounded-md text-sm ${
          notification.type === 'success' ? 'bg-green-50 text-green-800' :
          notification.type === 'error' ? 'bg-red-50 text-red-800' :
          'bg-blue-50 text-blue-800'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {new Date(entry.date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </h3>
          <p className="text-sm text-gray-500">
            Created: {new Date(entry.created_at).toLocaleString()}
          </p>
        </div>
        
        <div className="flex space-x-2">
          {!editMode && (
            <>
              <button
                onClick={() => setEditMode(true)}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={handleReanalyze}
                disabled={isAnalyzing}
                className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors disabled:opacity-50"
              >
                {isAnalyzing ? 'Analyzing...' : 'Re-analyze'}
              </button>
            </>
          )}
          
          {editMode && (
            <>
              <button
                onClick={handleSave}
                disabled={updateEntryMutation.isPending}
                className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors disabled:opacity-50"
                title="Save changes (Ctrl+S)"
              >
                {updateEntryMutation.isPending ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleCancel}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                title="Cancel editing (Escape)"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Transcript */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Transcript
        </label>
        {editMode ? (
          <textarea
            ref={transcriptRef}
            value={editedEntry.transcript}
            onChange={(e) => handleInputChange('transcript', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Your journal entry..."
            aria-label="Journal entry transcript"
          />
        ) : (
          <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-gray-900 whitespace-pre-wrap">{entry.transcript}</p>
          </div>
        )}
      </div>

      {/* Sentiment Score */}
      <div className="mb-6">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Sentiment:</span>
          <span className={`text-sm font-medium ${getSentimentColor(entry.sentiment_score)}`}>
            {getSentimentLabel(entry.sentiment_score)} ({Math.round(entry.sentiment_score * 100)}%)
          </span>
        </div>
      </div>

      {/* Reflections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Wins */}
        <ReflectionSection
          title="Things I did well"
          items={editMode ? editedEntry.wins : entry.wins}
          editMode={editMode}
          color="green"
          onItemChange={(index, value) => handleArrayFieldChange('wins', index, value)}
          onAddItem={() => handleAddArrayItem('wins')}
          onRemoveItem={(index) => handleRemoveArrayItem('wins', index)}
        />

        {/* Regrets */}
        <ReflectionSection
          title="Things I regret"
          items={editMode ? editedEntry.regrets : entry.regrets}
          editMode={editMode}
          color="red"
          onItemChange={(index, value) => handleArrayFieldChange('regrets', index, value)}
          onAddItem={() => handleAddArrayItem('regrets')}
          onRemoveItem={(index) => handleRemoveArrayItem('regrets', index)}
        />

        {/* Tasks */}
        <ReflectionSection
          title="Tasks for tomorrow"
          items={editMode ? editedEntry.tasks : entry.tasks}
          editMode={editMode}
          color="blue"
          onItemChange={(index, value) => handleArrayFieldChange('tasks', index, value)}
          onAddItem={() => handleAddArrayItem('tasks')}
          onRemoveItem={(index) => handleRemoveArrayItem('tasks', index)}
        />

        {/* Keywords */}
        <ReflectionSection
          title="Key themes"
          items={editMode ? editedEntry.keywords : entry.keywords}
          editMode={editMode}
          color="purple"
          onItemChange={(index, value) => handleArrayFieldChange('keywords', index, value)}
          onAddItem={() => handleAddArrayItem('keywords')}
          onRemoveItem={(index) => handleRemoveArrayItem('keywords', index)}
        />
      </div>
    </div>
  )
}

interface ReflectionSectionProps {
  title: string
  items: string[]
  editMode: boolean
  color: 'green' | 'red' | 'blue' | 'purple'
  onItemChange: (index: number, value: string) => void
  onAddItem: () => void
  onRemoveItem: (index: number) => void
}

const ReflectionSection: React.FC<ReflectionSectionProps> = ({
  title,
  items,
  editMode,
  color,
  onItemChange,
  onAddItem,
  onRemoveItem
}) => {
  const colorClasses = {
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      button: 'bg-green-100 hover:bg-green-200 text-green-700'
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      button: 'bg-red-100 hover:bg-red-200 text-red-700'
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      button: 'bg-blue-100 hover:bg-blue-200 text-blue-700'
    },
    purple: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-800',
      button: 'bg-purple-100 hover:bg-purple-200 text-purple-700'
    }
  }

  const classes = colorClasses[color]

  return (
    <div className={`${classes.bg} ${classes.border} border rounded-lg p-4`}>
      <div className="flex justify-between items-center mb-3">
        <h4 className={`font-medium ${classes.text}`}>{title}</h4>
        {editMode && (
          <button
            onClick={onAddItem}
            className={`px-2 py-1 text-xs rounded-md ${classes.button} transition-colors`}
          >
            Add
          </button>
        )}
      </div>

      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-gray-500 text-sm italic">No items yet</p>
        ) : (
          items.map((item, index) => (
            <div key={index} className="flex items-center space-x-2">
              {editMode ? (
                <>
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => onItemChange(index, e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Enter item..."
                    aria-label={`${title} item ${index + 1}`}
                  />
                  <button
                    onClick={() => onRemoveItem(index)}
                    className="p-1 text-red-500 hover:text-red-700"
                    title="Remove item"
                    aria-label={`Remove ${title} item ${index + 1}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </>
              ) : (
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-current opacity-50"></span>
                  <span className="text-sm">{item}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Keyboard shortcuts help */}
      {editMode && (
        <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Keyboard Shortcuts</h4>
          <div className="text-xs text-blue-800 space-y-1">
            <div><kbd className="px-1 py-0.5 bg-blue-100 rounded text-xs">Ctrl+S</kbd> or <kbd className="px-1 py-0.5 bg-blue-100 rounded text-xs">⌘+S</kbd> - Save changes</div>
            <div><kbd className="px-1 py-0.5 bg-blue-100 rounded text-xs">Escape</kbd> - Cancel editing</div>
          </div>
        </div>
      )}
    </div>
  )
}