import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../domains/auth/hooks/useAuth'
import { DataPrivacyService } from '../domains/auth/services/dataPrivacyService'
// MVP: Disabled advanced integrations
// import { GoogleSheetsSettings } from '../domains/integrations/components/GoogleSheetsSettings'
// import { NotionSettings } from '../domains/integrations/components/NotionSettings'

export const Settings: React.FC = () => {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [isDeletingData, setIsDeletingData] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/')
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const handleDeleteAllData = async () => {
    try {
      setIsDeletingData(true)
      
      const result = await DataPrivacyService.handleDataDeletionRequest()
      
      if (result) {
        // Data was successfully deleted, user will be signed out automatically
        // since their account was deleted
        navigate('/')
      }
    } catch (error) {
      console.error('Data deletion error:', error)
    } finally {
      setIsDeletingData(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                ← Back
              </button>
              <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {user?.email}
              </span>
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

      {/* Settings Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Account Section */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Account</h2>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{user?.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">User ID</label>
                  <p className="mt-1 text-sm text-gray-500 font-mono">{user?.uid}</p>
                </div>
              </div>
            </div>
          </div>

          {/* MVP Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-blue-900 mb-2">MVP Version</h3>
            <p className="text-blue-800">
              This is the MVP version of Voice Journal. Advanced features like Google Sheets integration, 
              Notion sync, and privacy settings will be available in future updates.
            </p>
          </div>

          {/* Coming Soon Section */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Coming Soon</h2>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Google Sheets Integration</span>
                  <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">Coming Soon</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Notion Integration</span>
                  <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">Coming Soon</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Privacy Settings</span>
                  <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">Coming Soon</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Offline Sync</span>
                  <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">Coming Soon</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Real-time Collaboration</span>
                  <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">Coming Soon</span>
                </div>
              </div>
            </div>
          </div>

          {/* Privacy & Data Section */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Privacy & Data</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Data Rights (GDPR/CCPA)</h3>
                <p className="text-sm text-gray-600 mb-4">
                  You have the right to request deletion of all your personal data. This includes all journal entries, 
                  voice recordings, and account information. This action cannot be undone.
                </p>
                <button
                  onClick={handleDeleteAllData}
                  disabled={isDeletingData}
                  data-delete-account
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isDeletingData ? 'Deleting data...' : 'Delete All My Data'}
                </button>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-red-900">Account Actions</h2>
            </div>
            <div className="px-6 py-4">
              <button
                onClick={handleSignOut}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}