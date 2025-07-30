import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { hasCompletedOnboarding, markOnboardingCompleted } from '../utils/onboarding'

interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: string
  content: React.ReactNode
}

export const OnboardingTutorial: React.FC = () => {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: '음성 저널에 오신 것을 환영합니다',
      description: '하루 1분, 말로 기록하는 새로운 저널링 경험을 시작해보세요.',
      icon: '🎉',
      content: (
        <div className="text-center space-y-6">
          <div className="text-6xl mb-4">🎙️</div>
          <h2 className="text-2xl font-bold text-gray-900">음성으로 기록하는 저널</h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            타이핑은 번거롭고 시간이 오래 걸립니다.<br />
            이제 말로 간단하게 하루를 기록해보세요.
          </p>
        </div>
      )
    },
    {
      id: 'voice-capture',
      title: '원탭 음성 캡처',
      description: '마이크 버튼 하나로 간편하게 음성을 녹음할 수 있습니다.',
      icon: '🎤',
      content: (
        <div className="text-center space-y-6">
          <div className="relative mx-auto w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
              <div className="w-8 h-8 bg-red-500 rounded-full animate-pulse"></div>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">간단한 원탭 녹음</h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            큰 마이크 버튼을 한 번 누르면 녹음이 시작됩니다.<br />
            다시 누르면 자동으로 텍스트로 변환됩니다.
          </p>
        </div>
      )
    },
    {
      id: 'ai-analysis',
      title: 'AI 분석과 인사이트',
      description: '음성이 텍스트로 변환되고 AI가 자동으로 핵심 내용을 추출합니다.',
      icon: '🧠',
      content: (
        <div className="text-center space-y-6">
          <div className="text-6xl mb-4">🤖</div>
          <h2 className="text-2xl font-bold text-gray-900">스마트한 AI 분석</h2>
          <div className="space-y-4 text-left bg-gray-50 p-6 rounded-lg">
            <div className="flex items-center space-x-3">
              <span className="text-green-500">✅</span>
              <span className="text-gray-700">오늘 잘한 일들</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-orange-500">💭</span>
              <span className="text-gray-700">아쉬웠던 점들</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-blue-500">📋</span>
              <span className="text-gray-700">내일 할 일들</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-purple-500">🏷️</span>
              <span className="text-gray-700">핵심 키워드</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'sync-export',
      title: '데이터 동기화 및 내보내기',
      description: 'Google Sheets나 Notion과 연동하여 데이터를 안전하게 보관하세요.',
      icon: '☁️',
      content: (
        <div className="text-center space-y-6">
          <div className="flex justify-center space-x-4 mb-4">
            <div className="w-16 h-16 bg-green-500 rounded-lg flex items-center justify-center text-white text-2xl">📊</div>
            <div className="w-16 h-16 bg-black rounded-lg flex items-center justify-center text-white text-2xl">📝</div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">클라우드 동기화</h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            Google Sheets나 Notion과 연동하여<br />
            언제 어디서나 데이터에 접근할 수 있습니다.
          </p>
        </div>
      )
    },
    {
      id: 'sample-entry',
      title: '샘플 저널 체험',
      description: '실제 저널 작성 과정을 체험해보세요.',
      icon: '📝',
      content: (
        <div className="text-center space-y-6">
          <div className="text-6xl mb-4">📱</div>
          <h2 className="text-2xl font-bold text-gray-900">지금 바로 시작해보세요!</h2>
          <div className="bg-blue-50 p-6 rounded-lg text-left">
            <h3 className="font-semibold text-blue-900 mb-3">샘플 저널 엔트리:</h3>
            <p className="text-blue-800 italic leading-relaxed">
              "오늘은 새로운 프로젝트를 시작했어요. 처음에는 걱정이 많았지만, 
              팀원들과 함께 계획을 세우니까 자신감이 생겼습니다. 
              내일은 첫 번째 프로토타입을 만들어보려고 해요."
            </p>
            <div className="mt-4 space-y-2 text-sm">
              <div><span className="font-medium text-green-600">잘한 일:</span> 새 프로젝트 시작, 팀워크</div>
              <div><span className="font-medium text-orange-600">아쉬운 점:</span> 초기 걱정</div>
              <div><span className="font-medium text-blue-600">할 일:</span> 프로토타입 제작</div>
            </div>
          </div>
        </div>
      )
    }
  ]

  // Check if user has completed onboarding
  useEffect(() => {
    if (hasCompletedOnboarding()) {
      setIsVisible(false)
    }
  }, [])

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      completeOnboarding()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    completeOnboarding()
  }

  const completeOnboarding = () => {
    markOnboardingCompleted()
    setIsVisible(false)
    navigate('/dashboard')
  }

  if (!isVisible) {
    return null
  }

  const currentStepData = steps[currentStep]

  return (
    <div className="fixed inset-0 z-50 bg-white">
      {/* Progress Bar */}
      <div className="h-1 bg-gray-200">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300"
          style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
        />
      </div>

      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-100">
        <div className="text-sm text-gray-500">
          {currentStep + 1} / {steps.length}
        </div>
        <button
          onClick={handleSkip}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          건너뛰기
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center px-6 py-8 min-h-0">
        <div className="max-w-md mx-auto w-full">
          {currentStepData.content}
        </div>
      </div>

      {/* Navigation */}
      <div className="p-6 border-t border-gray-100">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className={`px-4 py-2 rounded-lg transition-colors ${
              currentStep === 0
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            이전
          </button>

          {/* Step Indicators */}
          <div className="flex space-x-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep
                    ? 'bg-blue-500'
                    : index < currentStep
                    ? 'bg-blue-300'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-medium"
          >
            {currentStep === steps.length - 1 ? '시작하기' : '다음'}
          </button>
        </div>
      </div>
    </div>
  )
}