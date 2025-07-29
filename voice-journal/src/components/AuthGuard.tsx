import React from 'react'
import { useAuth } from '../domains/auth/hooks/useAuth'
import { LoginForm } from '../domains/auth/components/LoginForm'
import { OAuthButton } from '../domains/auth/components/OAuthButton'

interface AuthGuardProps {
  children: React.ReactNode
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        {/* Animated background shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-32 h-32 bg-white bg-opacity-10 rounded-full animate-float" style={{animationDelay: '0s'}}></div>
          <div className="absolute top-40 right-20 w-24 h-24 bg-white bg-opacity-10 rounded-full animate-float" style={{animationDelay: '2s'}}></div>
          <div className="absolute bottom-32 left-20 w-28 h-28 bg-white bg-opacity-10 rounded-full animate-float" style={{animationDelay: '4s'}}></div>
        </div>
        
        <div className="glass-card text-center animate-slide-up relative z-10" style={{padding: 'var(--spacing-3xl)'}}>
          <div className="glass-card mx-auto relative overflow-hidden animate-pulse-glow" style={{width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--spacing-lg)'}}>
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-blue-600 opacity-90"></div>
            <div className="animate-spin rounded-full border-3 border-white border-t-transparent relative z-10" style={{height: '40px', width: '40px'}}></div>
          </div>
          <h2 className="font-bold text-gradient" style={{fontSize: 'var(--text-2xl)', marginBottom: 'var(--spacing-sm)'}}>Voice Journal</h2>
          <p className="text-gray-700 font-medium" style={{fontSize: 'var(--text-base)'}}>로딩 중...</p>
          <p className="text-gray-500" style={{fontSize: 'var(--text-sm)', marginTop: 'var(--spacing-sm)'}}>잠시만 기다려주세요</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div>
        <LoginForm />
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 w-full max-w-sm px-4">
          <OAuthButton />
        </div>
      </div>
    )
  }

  return <>{children}</>
}