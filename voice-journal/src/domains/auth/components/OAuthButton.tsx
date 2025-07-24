import React from 'react'
import { useAuth } from '../hooks/useAuth'

interface OAuthButtonProps {
  onSuccess?: () => void
  onError?: (error: string) => void
}

export const OAuthButton: React.FC<OAuthButtonProps> = ({ onSuccess, onError }) => {
  const { signInWithGoogle } = useAuth()

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithGoogle()
      onSuccess?.()
    } catch (err) {
      onError?.('Google 로그인에 실패했습니다')
    }
  }

  return (
    <div className="mt-6">
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white bg-opacity-95 text-gray-500">또는</span>
        </div>
      </div>

      <button
        onClick={handleGoogleSignIn}
        className="w-full inline-flex items-center justify-center py-3 px-4 border-2 border-gray-200 rounded-xl bg-white text-gray-700 font-medium hover:border-gray-300 hover:bg-gray-50 hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-gray-100 transition-all duration-300"
      >
        <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Google로 계속하기
      </button>
    </div>
  )
}