import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../domains/auth/hooks/useAuth'

export const Dashboard: React.FC = () => {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [text, setText] = useState('')

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const handleSave = () => {
    // MVP: Simple text save to localStorage for demo
    const entries = JSON.parse(localStorage.getItem('journal-entries') || '[]')
    const newEntry = {
      id: Date.now().toString(),
      content: text,
      date: new Date().toISOString(),
      timestamp: new Date().toLocaleString()
    }
    entries.unshift(newEntry)
    localStorage.setItem('journal-entries', JSON.stringify(entries))
    setText('')
    alert('Entry saved!')
  }

  const entries = JSON.parse(localStorage.getItem('journal-entries') || '[]')

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
            <h2 className="text-lg font-medium text-gray-900 mb-4">Write a Journal Entry</h2>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What's on your mind today?"
              className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleSave}
                disabled={!text.trim()}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Entry
              </button>
            </div>
          </div>

          {/* Previous Entries */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Previous Entries ({entries.length})</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {entries.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500">
                  No entries yet. Write your first journal entry above!
                </div>
              ) : (
                entries.map((entry: any) => (
                  <div key={entry.id} className="px-6 py-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-sm font-medium text-gray-900">
                        {entry.timestamp}
                      </h3>
                      <button
                        onClick={() => {
                          const filtered = entries.filter((e: any) => e.id !== entry.id)
                          localStorage.setItem('journal-entries', JSON.stringify(filtered))
                          window.location.reload()
                        }}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{entry.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* MVP Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-blue-900 mb-2">MVP Version</h3>
            <p className="text-blue-800">
              This is a simplified MVP version of Voice Journal. Voice recording, AI analysis, 
              cloud sync, and other advanced features will be added in future updates.
            </p>
            <p className="text-blue-800 mt-2">
              Currently using local storage for demonstration purposes.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}