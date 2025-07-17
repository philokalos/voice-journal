import React, { useState } from 'react'
import {
  useGoogleSheetsIntegration,
  useConnectGoogleSheets,
  useDisconnectGoogleSheets,
  useSyncAllEntries,
  useRetryFailedSyncs,
  useSyncLogs
} from '../hooks/useGoogleSheets'
import { SheetsService } from '../services/sheetsService'

export const GoogleSheetsSettings: React.FC = () => {
  const [showLogs, setShowLogs] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  const { data: integration, isLoading, error } = useGoogleSheetsIntegration()
  const { data: logs, isLoading: logsLoading } = useSyncLogs(20)
  
  const connectMutation = useConnectGoogleSheets()
  const disconnectMutation = useDisconnectGoogleSheets()
  const syncAllMutation = useSyncAllEntries()
  const retryFailedMutation = useRetryFailedSyncs()

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 5000)
  }

  const handleConnect = async () => {
    try {
      await connectMutation.mutateAsync()
      showNotification('success', 'Google Sheets connected successfully!')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to Google Sheets'
      showNotification('error', errorMessage)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Google Sheets? This will stop automatic syncing.')) {
      return
    }

    try {
      await disconnectMutation.mutateAsync()
      showNotification('success', 'Google Sheets disconnected successfully')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to disconnect Google Sheets'
      showNotification('error', errorMessage)
    }
  }

  const handleSyncAll = async () => {
    try {
      const results = await syncAllMutation.mutateAsync()
      const successCount = results.filter(r => r.success).length
      const failedCount = results.length - successCount
      
      if (failedCount === 0) {
        showNotification('success', `Successfully synced ${successCount} entries to Google Sheets`)
      } else {
        showNotification('info', `Synced ${successCount} entries, ${failedCount} failed`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sync entries'
      showNotification('error', errorMessage)
    }
  }

  const handleRetryFailed = async () => {
    try {
      const results = await retryFailedMutation.mutateAsync()
      const successCount = results.filter(r => r.success).length
      
      if (successCount === 0) {
        showNotification('info', 'No failed syncs to retry')
      } else {
        showNotification('success', `Successfully retried ${successCount} failed syncs`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to retry syncs'
      showNotification('error', errorMessage)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600'
      case 'expired': return 'text-yellow-600'
      case 'error': return 'text-red-600'
      case 'revoked': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return '✅'
      case 'expired': return '⚠️'
      case 'error': return '❌'
      case 'revoked': return '❌'
      default: return '⚪'
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Loading Google Sheets settings...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-red-600">
          <h3 className="font-semibold mb-2">Error loading Google Sheets settings</h3>
          <p className="text-sm">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19.5 3H4.5A1.5 1.5 0 0 0 3 4.5v15A1.5 1.5 0 0 0 4.5 21h15a1.5 1.5 0 0 0 1.5-1.5v-15A1.5 1.5 0 0 0 19.5 3zm-3.75 7.5h-7.5a.75.75 0 0 0 0 1.5h7.5a.75.75 0 0 0 0-1.5zm0 3h-7.5a.75.75 0 0 0 0 1.5h7.5a.75.75 0 0 0 0-1.5zm0-6h-7.5a.75.75 0 0 0 0 1.5h7.5a.75.75 0 0 0 0-1.5z"/>
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Google Sheets</h3>
            <p className="text-sm text-gray-600">Export and sync your entries to Google Sheets</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm">{getStatusIcon(integration?.status || 'disconnected')}</span>
          <span className={`text-sm font-medium ${getStatusColor(integration?.status || 'disconnected')}`}>
            {integration?.connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Connection Status */}
      {integration?.connected && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Status:</span>
              <span className={`ml-2 ${getStatusColor(integration.status)}`}>
                {integration.status.charAt(0).toUpperCase() + integration.status.slice(1)}
              </span>
            </div>
            
            {integration.lastSync && (
              <div>
                <span className="font-medium text-gray-700">Last Sync:</span>
                <span className="ml-2 text-gray-600">
                  {new Date(integration.lastSync).toLocaleString()}
                </span>
              </div>
            )}
            
            {integration.spreadsheetId && (
              <div className="md:col-span-2">
                <span className="font-medium text-gray-700">Spreadsheet:</span>
                <a
                  href={SheetsService.getSpreadsheetUrl(integration.spreadsheetId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-blue-600 hover:text-blue-800 underline"
                >
                  Open in Google Sheets
                </a>
              </div>
            )}
            
            {integration.errorMessage && (
              <div className="md:col-span-2">
                <span className="font-medium text-red-700">Error:</span>
                <span className="ml-2 text-red-600">{integration.errorMessage}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        {!integration?.connected ? (
          <button
            onClick={handleConnect}
            disabled={connectMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {connectMutation.isPending ? 'Connecting...' : 'Connect Google Sheets'}
          </button>
        ) : (
          <>
            <button
              onClick={handleDisconnect}
              disabled={disconnectMutation.isPending}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {disconnectMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
            </button>
            
            <button
              onClick={handleSyncAll}
              disabled={syncAllMutation.isPending}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {syncAllMutation.isPending ? 'Syncing...' : 'Sync All Entries'}
            </button>
            
            <button
              onClick={handleRetryFailed}
              disabled={retryFailedMutation.isPending}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {retryFailedMutation.isPending ? 'Retrying...' : 'Retry Failed'}
            </button>
          </>
        )}
      </div>

      {/* Sync Logs */}
      {integration?.connected && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold text-gray-900">Sync History</h4>
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showLogs ? 'Hide' : 'Show'} Logs
            </button>
          </div>

          {showLogs && (
            <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
              {logsLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto"></div>
                  <span className="text-sm text-gray-600 mt-2">Loading logs...</span>
                </div>
              ) : logs && logs.length > 0 ? (
                <div className="space-y-2">
                  {logs.map((log, index) => (
                    <div key={index} className="text-sm border-l-4 border-gray-300 pl-3 py-1">
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${
                          log.status === 'success' ? 'text-green-600' :
                          log.status === 'failed' ? 'text-red-600' :
                          'text-yellow-600'
                        }`}>
                          {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                        </span>
                        <span className="text-gray-500">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      
                      {log.entry && (
                        <div className="text-gray-600 mt-1">
                          {log.entry.date} - {log.entry.transcript.substring(0, 50)}...
                        </div>
                      )}
                      
                      {log.error_message && (
                        <div className="text-red-600 mt-1 text-xs">
                          {log.error_message}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No sync logs available
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Help Text */}
      <div className="mt-6 text-sm text-gray-600">
        <p>
          <strong>How it works:</strong> Once connected, your journal entries will be automatically 
          synced to a Google Sheets spreadsheet. Each entry becomes a row with columns for date, 
          transcript, wins, regrets, tasks, keywords, and sentiment score.
        </p>
      </div>
    </div>
  )
}