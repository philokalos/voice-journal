import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useHandleOAuthCallback } from '../domains/integrations/hooks/useGoogleSheets'

export const GoogleSheetsCallback: React.FC = () => {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [errorMessage, setErrorMessage] = useState('')
  
  const handleCallbackMutation = useHandleOAuthCallback()

  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      setStatus('error')
      setErrorMessage(error === 'access_denied' ? 'Access denied by user' : `OAuth error: ${error}`)
      return
    }

    if (!code || !state) {
      setStatus('error')
      setErrorMessage('Missing authorization code or state parameter')
      return
    }

    // Handle the OAuth callback
    handleCallbackMutation.mutate(
      { code, state },
      {
        onSuccess: () => {
          setStatus('success')
          // Window will be closed by the mutation
        },
        onError: (error) => {
          setStatus('error')
          setErrorMessage(error.message)
        }
      }
    )
  }, [searchParams, handleCallbackMutation])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-md w-full mx-4">
        <div className="text-center">
          {status === 'processing' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Processing...</h2>
              <p className="text-gray-600">Connecting your Google Sheets account</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Success!</h2>
              <p className="text-gray-600 mb-4">Google Sheets has been connected successfully</p>
              <p className="text-sm text-gray-500">This window will close automatically</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Failed</h2>
              <p className="text-gray-600 mb-4">{errorMessage}</p>
              <button
                onClick={() => window.close()}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Close Window
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}