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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h1 className="text-center text-3xl font-bold text-gray-900 mb-8">
            Voice Journal
          </h1>
          <LoginForm />
          <OAuthButton />
        </div>
      </div>
    )
  }

  return <>{children}</>
}