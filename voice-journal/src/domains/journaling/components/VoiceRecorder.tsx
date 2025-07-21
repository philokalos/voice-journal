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
      <div className="flex flex-col items-center space-y-4">
        <button
          onClick={state.isRecording ? stopRecording : startRecording}
          disabled={disabled || state.isProcessing || !isWebSpeechAvailable}
          className={`
            w-16 h-16 rounded-full border-4 flex items-center justify-center
            transition-all duration-200
            ${state.isRecording 
              ? 'bg-red-500 border-red-600 animate-pulse' 
              : 'bg-blue-500 border-blue-600 hover:bg-blue-600'
            }
            ${disabled || state.isProcessing || !isWebSpeechAvailable
              ? 'opacity-50 cursor-not-allowed' 
              : 'cursor-pointer'
            }
          `}
        >
          {state.isProcessing ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : state.isRecording ? (
            <div className="w-4 h-4 bg-white rounded-sm" />
          ) : (
            <div className="w-6 h-6 border-l-4 border-l-white border-t-2 border-t-transparent border-b-2 border-b-transparent ml-1" />
          )}
        </button>

        {/* Duration */}
        {state.isRecording && (
          <div className="text-sm font-mono text-gray-600">
            {formatDuration(state.duration)}
          </div>
        )}

        {/* Status */}
        {state.isProcessing && (
          <div className="text-sm text-blue-600">
            Processing transcript...
          </div>
        )}
      </div>

      {/* Results */}
      {state.transcript && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Transcript
            </span>
            {state.confidence && (
              <span className="text-xs text-gray-500">
                Confidence: {Math.round(state.confidence * 100)}%
              </span>
            )}
          </div>
          
          <p className="text-sm text-gray-800">{state.transcript}</p>
        </div>
      )}

      {/* Error Display */}
      {state.error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{state.error}</p>
        </div>
      )}

      {/* Support Info */}
      <div className="mt-4 text-xs text-gray-500">
        {isWebSpeechAvailable 
          ? '🎤 Web Speech API available' 
          : '⚠️ Web Speech API not supported in this browser'
        }
      </div>
    </div>
  )
}