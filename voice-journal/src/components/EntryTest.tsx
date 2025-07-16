import React, { useState } from 'react'
import { useEntries, useCreateEntry } from '../domains/journaling/hooks/useEntries'
import type { CreateEntryRequest } from '../shared/types/entry'

export const EntryTest: React.FC = () => {
  const [transcript, setTranscript] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  
  const { data: entriesResult, isLoading, error } = useEntries()
  const createEntryMutation = useCreateEntry()

  const handleCreateEntry = async () => {
    if (!transcript.trim()) return

    const newEntry: CreateEntryRequest = {
      date,
      transcript: transcript.trim(),
      wins: ['Test win'],
      regrets: ['Test regret'],
      tasks: ['Test task'],
      keywords: ['test', 'demo'],
      sentiment_score: 0.5
    }

    try {
      await createEntryMutation.mutateAsync(newEntry)
      setTranscript('')
      alert('Entry created successfully!')
    } catch (error) {
      console.error('Error creating entry:', error)
      alert('Failed to create entry')
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Database Test</h2>
      
      {/* Create Entry Form */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Create Test Entry</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transcript
            </label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your journal entry..."
            />
          </div>
          
          <button
            onClick={handleCreateEntry}
            disabled={!transcript.trim() || createEntryMutation.isPending}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createEntryMutation.isPending ? 'Creating...' : 'Create Entry'}
          </button>
        </div>
      </div>

      {/* Entries List */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Your Entries</h3>
        
        {isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading entries...</p>
          </div>
        )}
        
        {error && (
          <div className="text-red-600 bg-red-50 p-4 rounded-md">
            Error loading entries: {error.message}
          </div>
        )}
        
        {entriesResult && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Total entries: {entriesResult.total_count}
            </p>
            
            {entriesResult.entries.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No entries yet. Create your first entry above!
              </p>
            ) : (
              <div className="space-y-3">
                {entriesResult.entries.map((entry) => (
                  <div key={entry.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-gray-600">
                        {entry.date}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(entry.created_at).toLocaleString()}
                      </span>
                    </div>
                    
                    <p className="text-gray-900 mb-2">{entry.transcript}</p>
                    
                    <div className="flex flex-wrap gap-2 text-xs">
                      {entry.wins.length > 0 && (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                          Wins: {entry.wins.join(', ')}
                        </span>
                      )}
                      {entry.regrets.length > 0 && (
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded">
                          Regrets: {entry.regrets.join(', ')}
                        </span>
                      )}
                      {entry.tasks.length > 0 && (
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Tasks: {entry.tasks.join(', ')}
                        </span>
                      )}
                      {entry.keywords.length > 0 && (
                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
                          Keywords: {entry.keywords.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}