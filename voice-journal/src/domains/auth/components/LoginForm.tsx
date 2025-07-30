import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'

interface LoginFormProps {
  onSuccess?: () => void
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  const { signIn, signUp, isSigningIn, isSigningUp } = useAuth()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email || !password) {
      setError('모든 필드를 입력해주세요')
      return
    }

    try {
      if (isSignUp) {
        await signUp(email, password)
      } else {
        await signIn(email, password)
      }

      onSuccess?.()
    } catch (err: unknown) {
      console.error('Auth error:', err)
      const firebaseError = err as { code?: string }
      
      if (firebaseError?.code === 'auth/email-already-in-use') {
        setError('이미 등록된 이메일입니다. 로그인을 시도해주세요.')
        setIsSignUp(false)
      } else if (firebaseError?.code === 'auth/user-not-found') {
        setError('등록되지 않은 이메일입니다. 회원가입을 진행해주세요.')
        setIsSignUp(true)
      } else if (firebaseError?.code === 'auth/wrong-password') {
        setError('비밀번호가 올바르지 않습니다.')
      } else if (firebaseError?.code === 'auth/weak-password') {
        setError('비밀번호는 6자 이상이어야 합니다.')
      } else if (firebaseError?.code === 'auth/invalid-email') {
        setError('유효하지 않은 이메일 형식입니다.')
      } else {
        setError('문제가 발생했습니다. 다시 시도해주세요.')
      }
    }
  }

  const isLoading = isSigningIn || isSigningUp

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Animated background shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-32 h-32 bg-white bg-opacity-10 rounded-full animate-float" style={{animationDelay: '0s'}}></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-white bg-opacity-10 rounded-full animate-float" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-32 left-20 w-28 h-28 bg-white bg-opacity-10 rounded-full animate-float" style={{animationDelay: '4s'}}></div>
        <div className="absolute bottom-20 right-10 w-20 h-20 bg-white bg-opacity-10 rounded-full animate-float" style={{animationDelay: '1s'}}></div>
      </div>
      
      <div className={`w-full max-w-sm mx-auto glass-card p-8 animate-slide-up relative z-10 ${
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
      }`}>
        {/* Modern Logo Section */}
        <div className="text-center" style={{marginBottom: 'var(--spacing-4xl)'}}>
          <div className="glass-card-strong mx-auto relative overflow-hidden" style={{
            width: '64px',
            height: '64px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            marginBottom: 'var(--spacing-lg)'
          }}>
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 opacity-90"></div>
            <svg className="text-white relative z-10" style={{width: '28px', height: '28px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h1 className="text-gradient" style={{fontSize: 'var(--text-4xl)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--spacing-sm)'}}>
            Voice Journal
          </h1>
          <p style={{fontSize: 'var(--text-lg)', color: 'var(--color-neutral-600)', fontWeight: 'var(--font-weight-normal)'}}>
            {isSignUp ? '안녕하세요! 시작해볼까요?' : '다시 만나서 반가워요'}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} style={{marginTop: 'var(--spacing-3xl)'}}>
          <div style={{marginBottom: 'var(--spacing-lg)'}}>
            <div style={{marginBottom: 'var(--spacing-xl)'}}>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일 주소"
                className="w-full glass-input outline-none"
                style={{padding: 'var(--spacing-lg)'}}
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호"
                className="w-full glass-input outline-none"
                style={{padding: 'var(--spacing-lg)'}}
                required
                disabled={isLoading}
                minLength={6}
              />
            </div>
          </div>

          {error && (
            <div className="glass-card bg-red-50 border-red-200 animate-slide-up" style={{padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-xl)', background: 'rgba(239, 68, 68, 0.1)'}}>
              <div className="flex items-center" style={{gap: 'var(--spacing-md)'}}>
                <svg className="icon-standard" style={{color: '#ef4444'}} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12V16.5z" />
                </svg>
                <span style={{fontSize: 'var(--text-sm)', color: '#dc2626', fontWeight: 'var(--font-weight-medium)'}}>{error}</span>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full glass-button outline-none"
            style={{padding: 'var(--spacing-lg)'}}
          >
            {isLoading ? (
              <>
                <svg className="icon-standard animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>잠시만요...</span>
              </>
            ) : (
              <>
                <svg className="icon-standard" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
                <span>{isSignUp ? '계정 만들기' : '로그인'}</span>
              </>
            )}
          </button>
        </form>

        <div className="text-center" style={{marginTop: 'var(--spacing-xl)'}}>
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-gray-600 hover:text-gradient transition-all duration-300 hover:transform hover:scale-105"
            style={{
              fontSize: 'var(--text-sm)', 
              padding: 'var(--spacing-md)',
              fontWeight: 'var(--font-weight-medium)'
            }}
            disabled={isLoading}
          >
            {isSignUp 
              ? '이미 계정이 있나요?' 
              : '처음 방문이신가요?'
            }
          </button>
        </div>
      </div>
    </div>
  )
}