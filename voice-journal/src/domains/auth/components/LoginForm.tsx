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
      const result = isSignUp 
        ? await signUp(email, password)
        : await signIn(email, password)

      onSuccess?.()
    } catch (err) {
      setError('문제가 발생했습니다. 다시 시도해주세요.')
    }
  }

  const isLoading = isSigningIn || isSigningUp

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-600 to-purple-700">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-20 h-20 bg-white bg-opacity-10 rounded-full animate-bounce" style={{top: '20%', left: '10%', animationDelay: '0s', animationDuration: '6s'}}></div>
          <div className="absolute w-16 h-16 bg-white bg-opacity-10 rounded-full animate-bounce" style={{top: '60%', right: '20%', animationDelay: '2s', animationDuration: '6s'}}></div>
          <div className="absolute w-24 h-24 bg-white bg-opacity-10 rounded-full animate-bounce" style={{bottom: '20%', left: '20%', animationDelay: '4s', animationDuration: '6s'}}></div>
        </div>
      </div>

      <div className={`relative z-10 w-full max-w-md mx-4 bg-white bg-opacity-95 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-white border-opacity-20 transition-all duration-700 ${
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
      }`}>
        {/* Logo section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-4 shadow-lg transform transition-transform hover:-translate-y-1">
            <span className="text-3xl font-bold text-white">V</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Voice Journal</h1>
          <p className="text-gray-600">당신의 이야기를 들려주세요</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="group">
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                이메일
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white bg-opacity-80 transition-all duration-300 focus:border-indigo-500 focus:bg-white focus:shadow-md focus:outline-none group-hover:border-gray-300"
                required
                disabled={isLoading}
              />
            </div>

            <div className="group">
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                비밀번호
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white bg-opacity-80 transition-all duration-300 focus:border-indigo-500 focus:bg-white focus:shadow-md focus:outline-none group-hover:border-gray-300"
                required
                disabled={isLoading}
                minLength={6}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden"
          >
            <span className="relative z-10">
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  처리 중...
                </div>
              ) : (
                isSignUp ? '회원가입' : '로그인'
              )}
            </span>
            {!isLoading && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white via-white to-transparent opacity-0 hover:opacity-20 translate-x-[-100%] hover:translate-x-[100%] transition-all duration-500"></div>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-indigo-600 hover:text-purple-600 font-medium transition-colors duration-300"
            disabled={isLoading}
          >
            {isSignUp 
              ? '이미 계정이 있으신가요? 로그인' 
              : '계정이 없으신가요? 회원가입'
            }
          </button>
        </div>
      </div>
    </div>
  )
}