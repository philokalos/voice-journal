import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../domains/auth/hooks/useAuth'
import { DataPrivacyService } from '../domains/auth/services/dataPrivacyService'
import { GoogleSheetsService, GoogleSheetsStatus } from '../domains/integrations/services/googleSheetsService'
import { NotionService, NotionStatus } from '../domains/integrations/services/notionService'
// import { SyncStatusManager } from '../domains/integrations/utils/syncStatusManager' // TODO: Implement sync status

export const Settings: React.FC = () => {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [isDeletingData, setIsDeletingData] = useState(false)
  const [googleSheetsStatus, setGoogleSheetsStatus] = useState<GoogleSheetsStatus | null>(null)
  const [notionStatus, setNotionStatus] = useState<NotionStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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

  const loadIntegrationStatus = async () => {
    try {
      setIsLoading(true)
      const [googleStatus, notionStatusData] = await Promise.all([
        GoogleSheetsService.getStatus().catch(() => ({ connected: false })),
        NotionService.getStatus().catch(() => ({ connected: false }))
      ])
      
      setGoogleSheetsStatus(googleStatus)
      setNotionStatus(notionStatusData)
    } catch (error) {
      console.error('Failed to load integration status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSheetsConnect = async () => {
    try {
      await GoogleSheetsService.startOAuthFlow()
      // Status will be updated when user returns from OAuth
      setTimeout(() => loadIntegrationStatus(), 2000)
    } catch (error) {
      console.error('Failed to start Google Sheets OAuth:', error)
      
      // Check for configuration error
      if (error instanceof Error && error.message.includes('not configured')) {
        alert('Google Sheets 연동이 설정되지 않았습니다. 관리자에게 문의하세요.')
      } else if (error instanceof Error && error.message.includes('popup')) {
        alert('팝업이 차단되었습니다. 팝업을 허용하고 다시 시도해주세요.')
      } else {
        alert('Google Sheets 연동에 실패했습니다. 다시 시도해주세요.')
      }
    }
  }

  const handleGoogleSheetsDisconnect = async () => {
    try {
      await GoogleSheetsService.disconnect()
      await loadIntegrationStatus()
    } catch (error) {
      console.error('Failed to disconnect Google Sheets:', error)
    }
  }

  // TODO: Re-enable when Notion integration is ready
  // const handleNotionConnect = async () => {
  //   try {
  //     await NotionService.startOAuthFlow()
  //     // Status will be updated when user returns from OAuth
  //     setTimeout(() => loadIntegrationStatus(), 2000)
  //   } catch (error) {
  //     console.error('Failed to start Notion OAuth:', error)
  //     
  //     // Check for configuration error
  //     if (error instanceof Error && error.message.includes('not configured')) {
  //       alert('Notion 연동이 설정되지 않았습니다. 관리자에게 문의하세요.')
  //     } else if (error instanceof Error && error.message.includes('popup')) {
  //       alert('팝업이 차단되었습니다. 팝업을 허용하고 다시 시도해주세요.')
  //     } else {
  //       alert('Notion 연동에 실패했습니다. 다시 시도해주세요.')
  //     }
  //   }
  // }

  const handleNotionDisconnect = async () => {
    try {
      await NotionService.disconnect()
      await loadIntegrationStatus()
    } catch (error) {
      console.error('Failed to disconnect Notion:', error)
    }
  }

  useEffect(() => {
    loadIntegrationStatus()
  }, [])

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

          {/* Integrations Section */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Integrations</h2>
              <p className="text-sm text-gray-600 mt-1">
                Connect your journal to external services to automatically sync your entries.
              </p>
            </div>
            <div className="px-6 py-4">
              {isLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="text-sm text-gray-600 mt-2">Loading integration status...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Google Sheets Integration */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19.5 3H4.5A1.5 1.5 0 003 4.5v15A1.5 1.5 0 004.5 21h15a1.5 1.5 0 001.5-1.5v-15A1.5 1.5 0 0019.5 3zM12 7.5v9l-3-3 3-3z"/>
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Google Sheets</h3>
                          <p className="text-xs text-gray-600">Sync journal entries to a Google Sheets spreadsheet</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {googleSheetsStatus?.connected ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Connected
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Not Connected
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {googleSheetsStatus?.connected && (
                      <div className="mb-3 p-3 bg-gray-50 rounded-lg text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Spreadsheet:</span>
                          <span className="font-medium text-gray-900">
                            {googleSheetsStatus.spreadsheet_name || 'Voice Journal Entries'}
                          </span>
                        </div>
                        {googleSheetsStatus.last_sync_at && (
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-gray-600">Last sync:</span>
                            <span className="text-gray-900">
                              {new Date(googleSheetsStatus.last_sync_at).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-2">
                      {googleSheetsStatus?.connected ? (
                        <>
                          <button
                            onClick={handleGoogleSheetsDisconnect}
                            className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors"
                          >
                            Disconnect
                          </button>
                          {googleSheetsStatus.spreadsheet_id && (
                            <a
                              href={`https://docs.google.com/spreadsheets/d/${googleSheetsStatus.spreadsheet_id}/edit`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                            >
                              View Spreadsheet →
                            </a>
                          )}
                        </>
                      ) : (
                        <button
                          onClick={handleGoogleSheetsConnect}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
                        >
                          Connect Google Sheets
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Notion Integration - 임시 비활성화 */}
                  <div className="border border-gray-200 rounded-lg p-4 opacity-50 relative">
                    <div className="absolute top-2 right-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                      준비 중
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.047-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466l1.823 1.447zm.793 3.08v13.904c0 .747.373 1.027 1.214 .98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.934zm14.337.748c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933l3.269-.186z"/>
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Notion</h3>
                          <p className="text-xs text-gray-600">Sync journal entries to a Notion database</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {notionStatus?.connected ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Connected
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Not Connected
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {notionStatus?.connected && (
                      <div className="mb-3 p-3 bg-gray-50 rounded-lg text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Database:</span>
                          <span className="font-medium text-gray-900">
                            {notionStatus.database_name || 'Journal Entries'}
                          </span>
                        </div>
                        {notionStatus.last_sync_at && (
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-gray-600">Last sync:</span>
                            <span className="text-gray-900">
                              {new Date(notionStatus.last_sync_at).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-2">
                      {notionStatus?.connected ? (
                        <>
                          <button
                            onClick={handleNotionDisconnect}
                            className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors"
                          >
                            Disconnect
                          </button>
                          {notionStatus.database_id && (
                            <a
                              href={`https://www.notion.so/${notionStatus.database_id.replace(/-/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                            >
                              View Database →
                            </a>
                          )}
                        </>
                      ) : (
                        <button
                          disabled={true}
                          className="bg-gray-400 text-white px-4 py-2 rounded-lg cursor-not-allowed text-sm font-medium"
                        >
                          준비 중 (Coming Soon)
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Coming Soon Features */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Coming Soon</h2>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Advanced Privacy Settings</span>
                  <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">Coming Soon</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Offline Sync</span>
                  <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">Coming Soon</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Weekly Summary Reports</span>
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