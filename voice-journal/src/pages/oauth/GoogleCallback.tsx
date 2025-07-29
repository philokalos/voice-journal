import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { GoogleSheetsService } from '../../domains/integrations/services/googleSheetsService'

export const GoogleCallback: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code')
        const state = searchParams.get('state')
        const error = searchParams.get('error')

        if (error) {
          throw new Error(`OAuth error: ${error}`)
        }

        if (!code || !state) {
          throw new Error('Missing authorization code or state parameter')
        }

        // Exchange authorization code for tokens
        const result = await GoogleSheetsService.exchangeCode(code, state)
        
        if (result.success) {
          setStatus('success')
          setMessage('Google Sheets 연동이 성공적으로 완료되었습니다!')
          
          // Close popup window if opened in popup
          if (window.opener) {
            window.opener.postMessage({ 
              type: 'GOOGLE_OAUTH_SUCCESS', 
              data: result 
            }, window.location.origin)
            window.close()
          } else {
            // Redirect to settings after 2 seconds
            setTimeout(() => navigate('/settings'), 2000)
          }
        } else {
          throw new Error(result.message || 'Authorization failed')
        }
      } catch (error) {
        console.error('Google OAuth callback error:', error)
        setStatus('error')
        setMessage(error instanceof Error ? error.message : 'Google Sheets 연동에 실패했습니다.')
        
        if (window.opener) {
          window.opener.postMessage({ 
            type: 'GOOGLE_OAUTH_ERROR', 
            error: error instanceof Error ? error.message : 'Unknown error'
          }, window.location.origin)
          window.close()
        } else {
          setTimeout(() => navigate('/settings'), 3000)
        }
      }
    }

    handleCallback()
  }, [searchParams, navigate])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          {status === 'processing' && (
            <>
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Google Sheets 연동 처리 중...
              </h2>
              <p className="text-gray-600">잠시만 기다려주세요.</p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-green-900 mb-2">연동 성공!</h2>
              <p className="text-green-700 mb-4">{message}</p>
              {!window.opener && (
                <p className="text-sm text-gray-600">
                  설정 페이지로 자동 이동합니다...
                </p>
              )}
            </>
          )}
          
          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-red-900 mb-2">연동 실패</h2>
              <p className="text-red-700 mb-4">{message}</p>
              {!window.opener && (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    설정 페이지로 자동 이동합니다...
                  </p>
                  <button
                    onClick={() => navigate('/settings')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    설정으로 돌아가기
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}