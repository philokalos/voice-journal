import React, { useState, useRef, useCallback } from 'react'

interface VoiceRecorderProps {
  onTranscriptReady: (transcript: string, confidence?: number) => void
  onError: (error: string) => void
  disabled?: boolean
  language?: 'en' | 'ko'
  className?: string
}

interface RecordingState {
  isRecording: boolean
  isProcessing: boolean
  duration: number
  error: string | null
  transcript: string | null
  confidence?: number
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onTranscriptReady,
  onError,
  disabled = false,
  language = 'en',
  className = ''
}) => {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isProcessing: false,
    duration: 0,
    error: null,
    transcript: null,
    confidence: undefined
  })

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize Web Speech API if available
  const initializeSpeechRecognition = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      return null
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = language === 'ko' ? 'ko-KR' : 'en-US'
    
    return recognition
  }, [language])

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null, transcript: null }))

      // Request microphone access for permission check
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => track.stop()) // Stop the stream immediately

      // Initialize speech recognition
      const recognition = initializeSpeechRecognition()
      if (!recognition) {
        throw new Error('Speech recognition not supported in this browser')
      }

      recognitionRef.current = recognition
      
      let finalTranscript = ''
      let interimTranscript = ''
      
      recognition.onresult = (event) => {
        finalTranscript = ''
        interimTranscript = ''
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          const confidence = event.results[i][0].confidence || 0.5
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript
            setState(prev => ({ 
              ...prev, 
              transcript: finalTranscript, 
              confidence
            }))
          } else {
            interimTranscript += transcript
          }
        }
      }

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error)
        setState(prev => ({ 
          ...prev, 
          error: `Speech recognition error: ${event.error}`,
          isRecording: false,
          isProcessing: false
        }))
        onError(`Speech recognition failed: ${event.error}`)
      }

      recognition.onend = () => {
        setState(prev => ({ ...prev, isRecording: false, isProcessing: false }))
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current)
          durationIntervalRef.current = null
        }
      }

      recognition.start()
      
      setState(prev => ({ ...prev, isRecording: true, duration: 0 }))
      
      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        setState(prev => ({ ...prev, duration: prev.duration + 1 }))
      }, 1000)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start recording'
      setState(prev => ({ ...prev, error: errorMessage }))
      onError(errorMessage)
    }
  }, [language, onError, initializeSpeechRecognition])

  // Stop recording
  const stopRecording = useCallback(() => {
    try {
      setState(prev => ({ ...prev, isRecording: false, isProcessing: true }))

      // Stop duration counter
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
        durationIntervalRef.current = null
      }

      // Stop speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.stop()
        recognitionRef.current = null
      }

      // Wait a moment for final results, then process
      setTimeout(() => {
        setState(prev => {
          if (prev.transcript && prev.transcript.trim()) {
            onTranscriptReady(prev.transcript.trim(), prev.confidence)
          } else {
            onError('No transcript was generated')
          }
          return { ...prev, isProcessing: false }
        })
      }, 500)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to stop recording'
      setState(prev => ({ ...prev, error: errorMessage, isProcessing: false }))
      onError(errorMessage)
    }
  }, [onTranscriptReady, onError])

  // Format duration
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Check if Web Speech API is available
  const isWebSpeechAvailable = ('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window)

  return (
    <div className={`voice-recorder ${className}`}>
      {/* Recording Button */}
      <div className="flex flex-col items-center" style={{gap: 'var(--spacing-lg)'}}>
        <div className="relative">
          {/* Pulse rings for recording */}
          {state.isRecording && (
            <>
              <div className="absolute inset-0 bg-red-400 rounded-full animate-ping opacity-30" style={{width: '80px', height: '80px'}}></div>
              <div className="absolute bg-red-400 rounded-full animate-ping opacity-50" style={{width: '64px', height: '64px', top: '8px', left: '8px', animationDelay: '0.5s'}}></div>
            </>
          )}
          
          <button
            onClick={state.isRecording ? stopRecording : startRecording}
            disabled={disabled || state.isProcessing || !isWebSpeechAvailable}
            className={`
              relative glass-card flex items-center justify-center transition-all duration-300 transform hover:scale-105
              ${state.isRecording 
                ? 'bg-gradient-to-br from-red-500 to-red-600 animate-pulse-glow' 
                : 'bg-gradient-to-br from-purple-600 to-blue-600'
              }
              ${disabled || state.isProcessing || !isWebSpeechAvailable
                ? 'opacity-50 cursor-not-allowed transform-none' 
                : 'cursor-pointer'
              }
            `}
            style={{width: '80px', height: '80px'}}
          >
            {state.isProcessing ? (
              <div className="border-3 border-white border-t-transparent rounded-full animate-spin" style={{width: '32px', height: '32px'}} />
            ) : state.isRecording ? (
              <div className="bg-white rounded-lg shadow-lg" style={{width: 'var(--spacing-lg)', height: 'var(--spacing-lg)'}} />
            ) : (
              <svg className="text-white" style={{width: '32px', height: '32px', marginLeft: '2px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
              </svg>
            )}
          </button>
        </div>

        {/* Status */}
        <div className="text-center" style={{display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)'}}>
          {state.isRecording && (
            <div className="glass-card bg-red-50 bg-opacity-80 animate-slide-up" style={{padding: 'var(--spacing-md) var(--spacing-lg)'}}>
              <div className="flex items-center justify-center" style={{gap: 'var(--spacing-md)'}}>
                <div className="bg-red-500 rounded-full animate-pulse" style={{width: '12px', height: '12px'}}></div>
                <span className="font-bold font-mono text-red-700" style={{fontSize: 'var(--text-sm)'}}>
                  {formatDuration(state.duration)}
                </span>
                <div className="text-red-600" style={{fontSize: 'var(--text-xs)'}}>녹음 중</div>
              </div>
            </div>
          )}
          
          {state.isProcessing && (
            <div className="glass-card bg-blue-50 bg-opacity-80 animate-slide-up" style={{padding: 'var(--spacing-md) var(--spacing-lg)'}}>
              <div className="flex items-center justify-center" style={{gap: 'var(--spacing-md)'}}>
                <div className="bg-blue-500 rounded-full animate-pulse" style={{width: '12px', height: '12px'}}></div>
                <span className="font-semibold text-blue-700" style={{fontSize: 'var(--text-sm)'}}>
                  처리 중...
                </span>
              </div>
            </div>
          )}
          
          {!state.isRecording && !state.isProcessing && (
            <div className="glass-card bg-gray-50 bg-opacity-80" style={{padding: 'var(--spacing-lg) var(--spacing-xl)'}}>
              <span style={{
                fontSize: 'var(--text-sm)', 
                color: 'var(--color-neutral-600)',
                fontWeight: 'var(--font-weight-normal)'
              }}>
                {isWebSpeechAvailable ? '탭하여 녹음 시작' : '음성 인식 비지원'}
              </span>
            </div>
          )}
        </div>

      </div>

      {/* Live Transcript Preview */}
      {state.transcript && (
        <div className="mt-6 glass-card bg-gradient-to-br from-green-50 to-blue-50 bg-opacity-50 p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-bold text-gray-700">
                실시간 전사 결과
              </span>
            </div>
            {state.confidence && (
              <div className="glass-card bg-white bg-opacity-60 px-3 py-1">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    state.confidence > 0.8 ? 'bg-green-500' : 
                    state.confidence > 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                  <span className="text-xs font-medium text-gray-600">
                    정확도: {Math.round(state.confidence * 100)}%
                  </span>
                </div>
              </div>
            )}
          </div>
          <p className="text-gray-800 leading-relaxed font-medium">{state.transcript}</p>
        </div>
      )}

      {/* Error Display */}
      {state.error && (
        <div className="mt-6 glass-card bg-red-50 bg-opacity-80 p-6 animate-slide-up">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 glass-card bg-red-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-red-800 mb-1">오류 발생</h4>
              <p className="text-sm text-red-700">{state.error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Support Info */}
      {!isWebSpeechAvailable && (
        <div className="mt-6 text-center">
          <div className="glass-card bg-yellow-50 bg-opacity-80 px-6 py-4">
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-sm font-medium text-yellow-800">
                이 브라우저에서는 음성 인식이 지원되지 않습니다
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}