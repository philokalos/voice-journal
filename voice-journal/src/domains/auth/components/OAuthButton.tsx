import React from 'react'
import { useAuth } from '../hooks/useAuth'

interface OAuthButtonProps {
  onSuccess?: () => void
  onError?: (error: string) => void
}

export const OAuthButton: React.FC<OAuthButtonProps> = ({ onSuccess, onError }) => {
  const { signInWithGoogle, signInWithApple, isSigningIn } = useAuth()

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithGoogle()
      onSuccess?.()
    } catch (err) {
      onError?.('Google 로그인에 실패했습니다')
    }
  }

  const handleAppleSignIn = async () => {
    try {
      const result = await signInWithApple()
      onSuccess?.()
    } catch (err) {
      onError?.('Apple 로그인에 실패했습니다')
    }
  }

  return (
    <div style={{marginTop: 'var(--spacing-xl)'}}>
      <div className="relative" style={{marginBottom: 'var(--spacing-xl)'}}>
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white border-opacity-20" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white bg-opacity-90 text-gray-500" style={{
            padding: '0 var(--spacing-lg)', 
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-weight-normal)'
          }}>
            또는
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
        <button
          onClick={handleGoogleSignIn}
          disabled={isSigningIn}
          className="w-full glass-card focus:outline-none transition-all duration-400 hover:transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            height: 'var(--button-height)', 
            padding: 'var(--spacing-lg)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: 'var(--spacing-md)', 
            fontSize: 'var(--text-base)',
            fontWeight: 'var(--font-weight-medium)',
            color: 'var(--color-neutral-700)'
          }}
        >
          {isSigningIn ? (
            <>
              <svg className="icon-standard animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>로그인 중...</span>
            </>
          ) : (
            <>
              <svg className="icon-standard" viewBox="0 0 24 24">
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
              <span>Google 계정 사용</span>
            </>
          )}
        </button>

        <button
          onClick={handleAppleSignIn}
          disabled={isSigningIn}
          className="w-full glass-card focus:outline-none transition-all duration-400 hover:transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            height: 'var(--button-height)', 
            padding: 'var(--spacing-lg)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: 'var(--spacing-md)', 
            fontSize: 'var(--text-base)',
            fontWeight: 'var(--font-weight-medium)',
            color: 'var(--color-neutral-700)',
            backgroundColor: 'rgba(0, 0, 0, 0.8)'
          }}
        >
          {isSigningIn ? (
            <>
              <svg className="icon-standard animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span style={{ color: 'white' }}>로그인 중...</span>
            </>
          ) : (
            <>
              <svg className="icon-standard" viewBox="0 0 24 24" fill="white">
                <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
              </svg>
              <span style={{ color: 'white' }}>Apple로 계속하기</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}