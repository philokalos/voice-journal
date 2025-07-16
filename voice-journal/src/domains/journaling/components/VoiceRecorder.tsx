import React, { useState, useCallback } from 'react'
import { RecorderButton } from './RecorderButton'
import { useTranscription } from '../hooks/useTranscription'
import { useCreateEntry } from '../hooks/useEntries'
import { useAnalyzeEntry } from '../hooks/useAnalysis'
import type { CreateEntryRequest } from '../../../shared/types/entry'

export const VoiceRecorder: React.FC = () => {
  const [step, setStep] = useState<'recording' | 'transcribing' | 'editing' | 'analyzing' | 'saving'>('recording')
  const [, setAudioBlob] = useState<Blob | null>(null)
  const [editableTranscript, setEditableTranscript] = useState('')
  const [, setCurrentEntryId] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const {
    error: transcriptionError,
    confidence,
    isWebSpeechSupported,
    transcribeWithWebSpeech,
    transcribeWithCloudAPI,
    resetTranscription,
  } = useTranscription()

  const createEntryMutation = useCreateEntry()
  const analyzeEntryMutation = useAnalyzeEntry()

  const showNotification = useCallback((type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 5000)
  }, [])

  const handleRecordingComplete = useCallback(async (blob: Blob) => {
    setAudioBlob(blob)
    setStep('transcribing')

    try {
      let transcribedText = ''
      
      // Try Web Speech API first if supported
      if (isWebSpeechSupported) {
        try {
          transcribedText = await transcribeWithWebSpeech(blob)
          
          // If confidence is low, try cloud API as fallback
          if (confidence < 0.6) {
            showNotification('error', 'Low confidence in transcription. Trying cloud service...')
            transcribedText = await transcribeWithCloudAPI(blob)
          }
        } catch (webSpeechError) {
          showNotification('error', 'Web Speech API failed. Trying cloud service...')
          transcribedText = await transcribeWithCloudAPI(blob)
        }
      } else {
        // Fallback to cloud API
        transcribedText = await transcribeWithCloudAPI(blob)
      }

      setEditableTranscript(transcribedText)
      setStep('editing')
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Transcription failed'
      showNotification('error', errorMessage)
      setStep('recording')
    }
  }, [isWebSpeechSupported, transcribeWithWebSpeech, transcribeWithCloudAPI, confidence, showNotification])

  const handleSaveEntry = useCallback(async () => {
    if (!editableTranscript.trim()) {
      showNotification('error', 'Please enter some text before saving')
      return
    }

    setStep('saving')

    try {
      // First, create the entry
      const entry: CreateEntryRequest = {
        date: new Date().toISOString().split('T')[0],
        transcript: editableTranscript.trim(),
        wins: [],
        regrets: [],
        tasks: [],
        keywords: [],
        sentiment_score: 0,
      }

      const createdEntry = await createEntryMutation.mutateAsync(entry)
      setCurrentEntryId(createdEntry.id)
      
      // Then analyze the entry
      setStep('analyzing')
      
      try {
        await analyzeEntryMutation.mutateAsync({
          entryId: createdEntry.id,
          transcript: editableTranscript.trim()
        })
        
        showNotification('success', 'Entry saved and analyzed successfully!')
      } catch (analysisError) {
        console.error('Analysis failed:', analysisError)
        showNotification('success', 'Entry saved! Analysis will be retried later.')
      }
      
      // Reset for next recording
      setStep('recording')
      setAudioBlob(null)
      setEditableTranscript('')
      setCurrentEntryId(null)
      resetTranscription()
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save entry'
      showNotification('error', errorMessage)
      setStep('editing')
    }
  }, [editableTranscript, createEntryMutation, analyzeEntryMutation, showNotification, resetTranscription])

  const handleStartOver = useCallback(() => {
    setStep('recording')
    setAudioBlob(null)
    setEditableTranscript('')
    setCurrentEntryId(null)
    resetTranscription()
  }, [resetTranscription])

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Voice Journal</h1>
        <p className="text-gray-600">Record your thoughts and reflections</p>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`mb-6 p-4 rounded-md ${
          notification.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Recording Step */}
      {step === 'recording' && (
        <div className="text-center">
          <RecorderButton
            onRecordingComplete={handleRecordingComplete}
            onError={(error) => showNotification('error', error)}
          />
        </div>
      )}

      {/* Transcribing Step */}
      {step === 'transcribing' && (
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Transcribing...</h2>
          <p className="text-gray-600">Converting your voice to text</p>
          
          {transcriptionError && (
            <div className="mt-4 text-red-600 text-sm">
              {transcriptionError}
            </div>
          )}
        </div>
      )}

      {/* Editing Step */}
      {step === 'editing' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Review & Edit</h2>
            
            {confidence > 0 && (
              <div className="mb-4">
                <span className="text-sm text-gray-600">
                  Confidence: {Math.round(confidence * 100)}%
                </span>
              </div>
            )}

            <textarea
              value={editableTranscript}
              onChange={(e) => setEditableTranscript(e.target.value)}
              rows={8}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Your transcribed text will appear here..."
            />
          </div>

          <div className="flex space-x-4">
            <button
              onClick={handleSaveEntry}
              disabled={!editableTranscript.trim()}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Save Entry
            </button>
            
            <button
              onClick={handleStartOver}
              className="flex-1 bg-gray-500 text-white py-3 px-6 rounded-md hover:bg-gray-600 transition-colors"
            >
              Start Over
            </button>
          </div>
        </div>
      )}

      {/* Saving Step */}
      {step === 'saving' && (
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Saving...</h2>
          <p className="text-gray-600">Saving your journal entry</p>
        </div>
      )}

      {/* Analyzing Step */}
      {step === 'analyzing' && (
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Analyzing...</h2>
          <p className="text-gray-600">AI is extracting insights from your entry</p>
          <div className="mt-4 text-sm text-gray-500">
            <p>✓ Entry saved</p>
            <p>🤖 Extracting wins, regrets, tasks, and keywords...</p>
          </div>
        </div>
      )}

      {/* Instructions */}
      {step === 'recording' && (
        <div className="mt-12 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">How to use</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>1. Tap the microphone button to start recording</p>
            <p>2. Speak naturally about your day</p>
            <p>3. Tap the stop button when finished</p>
            <p>4. Review and edit the transcription</p>
            <p>5. Save your entry - AI will analyze it automatically</p>
            <p>6. Get insights on wins, regrets, tasks, and keywords</p>
          </div>
        </div>
      )}
    </div>
  )
}