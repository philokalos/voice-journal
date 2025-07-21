import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../domains/auth/hooks/useAuth'
import { VoiceRecorder } from '../domains/journaling/components/VoiceRecorder'
import { EntryService } from '../domains/journaling/services/entryService'
import type { Entry } from '../shared/types/entry'

export const Dashboard: React.FC = () => {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  // Load entries on mount
  useEffect(() => {
    const loadEntries = async () => {
      if (!user) return
      
      try {
        setIsLoading(true)
        const userEntries = await EntryService.getEntries()
        setEntries(userEntries)
      } catch (error) {
        console.error('Failed to load entries:', error)
        setVoiceError('Failed to load entries. Please refresh the page.')
      } finally {
        setIsLoading(false)
      }
    }

    loadEntries()
  }, [user])

  const handleSave = async () => {
    if (!text.trim() || !user) return
    
    try {
      setIsSaving(true)
      setVoiceError(null)

      const newEntry = await EntryService.createEntry({
        transcript: text,
        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
        // TODO: Add AI analysis for wins, regrets, tasks, keywords
        keywords: [],
        wins: [],
        regrets: [],
        tasks: []
      })

      // Add to local state
      setEntries(prev => [newEntry, ...prev])
      setText('')
      setIsVoiceMode(false)
      
      console.log('Entry saved successfully:', newEntry.id)
    } catch (error) {
      console.error('Failed to save entry:', error)
      setVoiceError('Failed to save entry. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleVoiceTranscript = (transcript: string, confidence?: number) => {
    setText(transcript)
    setVoiceError(null)
    console.log(`Voice transcript received (confidence: ${confidence}): ${transcript}`)
  }

  const handleVoiceError = (error: string) => {
    setVoiceError(error)
    console.error('Voice recording error:', error)
  }

  const handleDeleteEntry = async (entryId: string) => {
    try {
      await EntryService.deleteEntry(entryId)
      setEntries(prev => prev.filter(entry => entry.id !== entryId))
      console.log('Entry deleted successfully:', entryId)
    } catch (error) {
      console.error('Failed to delete entry:', error)
      setVoiceError('Failed to delete entry. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">Voice Journal MVP</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {user?.email}
              </span>
              <button
                onClick={() => navigate('/settings')}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                Settings
              </button>
              <button
                onClick={handleSignOut}
                className="text-red-600 hover:text-red-800 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Write Entry */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Write a Journal Entry</h2>
              
              {/* Input Mode Toggle */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsVoiceMode(false)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    !isVoiceMode 
                      ? 'bg-indigo-100 text-indigo-700' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  📝 Text
                </button>
                <button
                  onClick={() => setIsVoiceMode(true)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    isVoiceMode 
                      ? 'bg-indigo-100 text-indigo-700' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  🎤 Voice
                </button>
              </div>
            </div>

            {/* Input Area */}
            {isVoiceMode ? (
              <div className="space-y-4">
                {/* Voice Error Display */}
                {voiceError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{voiceError}</p>
                  </div>
                )}
                
                {/* Voice Recorder */}
                <VoiceRecorder
                  onTranscriptReady={handleVoiceTranscript}
                  onError={handleVoiceError}
                  language="en"
                  className="flex flex-col items-center py-8"
                />
                
                {/* Transcript Display/Edit */}
                {text && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Transcript (you can edit this):
                    </label>
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Your transcribed voice entry will appear here..."
                      className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                )}
              </div>
            ) : (
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="What's on your mind today?"
                className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            )}
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleSave}
                disabled={!text.trim() || isSaving}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isSaving && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                <span>{isSaving ? 'Saving...' : 'Save Entry'}</span>
              </button>
            </div>
          </div>

          {/* Previous Entries */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Previous Entries ({entries.length})</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {isLoading ? (
                <div className="px-6 py-8 text-center text-gray-500">
                  <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading entries...
                </div>
              ) : entries.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500">
                  No entries yet. Write your first journal entry above!
                </div>
              ) : (
                entries.map((entry) => (
                  <div key={entry.id} className="px-6 py-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-medium text-gray-900">
                          {new Date(entry.created_at).toLocaleString()}
                        </h3>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          🎤 Voice Entry
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteEntry(entry.id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{entry.transcript}</p>
                    
                    {/* Display extracted data if available */}
                    {(entry.wins?.length || entry.regrets?.length || entry.tasks?.length || entry.keywords?.length) && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          {entry.wins && entry.wins.length > 0 && (
                            <div>
                              <span className="font-medium text-green-700">✅ Wins:</span>
                              <ul className="list-disc list-inside text-green-600 ml-2">
                                {entry.wins.map((win, i) => <li key={i}>{win}</li>)}
                              </ul>
                            </div>
                          )}
                          {entry.regrets && entry.regrets.length > 0 && (
                            <div>
                              <span className="font-medium text-orange-700">🔄 Regrets:</span>
                              <ul className="list-disc list-inside text-orange-600 ml-2">
                                {entry.regrets.map((regret, i) => <li key={i}>{regret}</li>)}
                              </ul>
                            </div>
                          )}
                          {entry.tasks && entry.tasks.length > 0 && (
                            <div>
                              <span className="font-medium text-blue-700">📝 Tasks:</span>
                              <ul className="list-disc list-inside text-blue-600 ml-2">
                                {entry.tasks.map((task, i) => <li key={i}>{task}</li>)}
                              </ul>
                            </div>
                          )}
                          {entry.keywords && entry.keywords.length > 0 && (
                            <div>
                              <span className="font-medium text-purple-700">🏷️ Keywords:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {entry.keywords.map((keyword, i) => (
                                  <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                    {keyword}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Firebase Notice */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-green-900 mb-2">Firebase Integration Status</h3>
            <div className="space-y-2 text-green-800">
              <p>✅ <strong>Authentication:</strong> Firebase Auth with email/password and Google OAuth</p>
              <p>✅ <strong>Voice Recording:</strong> Record audio with one-tap interface</p>
              <p>✅ <strong>Web Speech API:</strong> Real-time transcription in browser</p>
              <p>✅ <strong>Data Storage:</strong> Firestore database with user isolation</p>
              <p>✅ <strong>Audit Logging:</strong> Cloud Functions track all data changes</p>
              <p>⏳ <strong>AI Analysis:</strong> Reflection extraction (TODO: Add OpenAI integration)</p>
              <p>⏳ <strong>Integrations:</strong> Google Sheets and Notion sync (TODO)</p>
            </div>
            <p className="text-green-700 mt-3 text-sm">
              <strong>Setup Required:</strong> Add your Firebase configuration to .env.local to enable cloud features.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}