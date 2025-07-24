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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-600 to-purple-700">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white bg-opacity-20 rounded-2xl mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
          </div>
          <p className="text-white text-lg font-medium">Voice Journal 로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div>
        <LoginForm />
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 w-full max-w-md px-4">
          <OAuthButton />
        </div>
      </div>
    )
  }

  return <>{children}</>
}