import React from 'react'
import { useRecorder } from '../hooks/useRecorder'

interface RecorderButtonProps {
  onRecordingComplete: (audioBlob: Blob) => void
  onError?: (error: string) => void
  disabled?: boolean
}

export const RecorderButton: React.FC<RecorderButtonProps> = ({
  onRecordingComplete,
  onError,
  disabled = false,
}) => {
  const {
    isRecording,
    isPaused,
    duration,
    audioBlob,
    error,
    isSupported,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecorder,
  } = useRecorder()

  // Handle recording completion
  React.useEffect(() => {
    if (audioBlob) {
      onRecordingComplete(audioBlob)
    }
  }, [audioBlob, onRecordingComplete])

  // Handle errors
  React.useEffect(() => {
    if (error) {
      onError?.(error)
    }
  }, [error, onError])

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleMainButtonClick = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const handlePauseResumeClick = () => {
    if (isPaused) {
      resumeRecording()
    } else {
      pauseRecording()
    }
  }

  if (!isSupported) {
    return (
      <div className="text-center p-6">
        <div className="text-red-600 mb-4">
          <svg className="w-12 h-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-gray-600">Voice recording is not supported in this browser</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Duration Display */}
      <div className="text-2xl font-mono text-gray-700">
        {formatDuration(duration)}
      </div>

      {/* Main Recording Button */}
      <button
        onClick={handleMainButtonClick}
        disabled={disabled || !isSupported}
        className={`
          relative w-24 h-24 rounded-full border-4 transition-all duration-200 ease-in-out
          ${isRecording 
            ? 'bg-red-500 border-red-600 hover:bg-red-600' 
            : 'bg-blue-500 border-blue-600 hover:bg-blue-600'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${isRecording ? 'animate-pulse' : ''}
        `}
      >
        {isRecording ? (
          // Stop icon
          <div className="w-6 h-6 bg-white rounded-sm mx-auto" />
        ) : (
          // Microphone icon
          <svg className="w-8 h-8 text-white mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
      </button>

      {/* Status Text */}
      <p className="text-sm text-gray-600 text-center">
        {isRecording 
          ? isPaused 
            ? 'Recording paused - Tap to resume' 
            : 'Recording... Tap to stop'
          : 'Tap to start recording'
        }
      </p>

      {/* Control Buttons */}
      {isRecording && (
        <div className="flex space-x-4">
          <button
            onClick={handlePauseResumeClick}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          
          <button
            onClick={resetRecorder}
            className="px-4 py-2 bg-gray-400 text-white rounded-md hover:bg-gray-500 transition-colors"
          >
            Reset
          </button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="text-red-600 text-sm text-center max-w-md">
          {error}
        </div>
      )}

      {/* Recording Indicator */}
      {isRecording && (
        <div className="flex items-center space-x-2 text-red-600">
          <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium">REC</span>
        </div>
      )}
    </div>
  )
}