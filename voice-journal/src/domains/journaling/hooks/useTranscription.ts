import { useState, useCallback, useRef } from 'react'

export interface TranscriptionState {
  transcript: string
  isTranscribing: boolean
  error: string | null
  confidence: number
  isWebSpeechSupported: boolean
}

export interface TranscriptionControls {
  transcribeWithWebSpeech: (audioBlob: Blob) => Promise<string>
  transcribeWithCloudAPI: (audioBlob: Blob) => Promise<string>
  resetTranscription: () => void
}

export const useTranscription = (): TranscriptionState & TranscriptionControls => {
  const [transcript, setTranscript] = useState('')
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confidence, setConfidence] = useState(0)
  const [isWebSpeechSupported] = useState(() => {
    return !!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  })

  const recognitionRef = useRef<any>(null)

  const transcribeWithWebSpeech = useCallback(async (audioBlob: Blob): Promise<string> => {
    if (!isWebSpeechSupported) {
      throw new Error('Web Speech API is not supported in this browser')
    }

    return new Promise((resolve, reject) => {
      setIsTranscribing(true)
      setError(null)
      setTranscript('')

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      const recognition = new SpeechRecognition()

      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US' // You can make this configurable

      let finalTranscript = ''
      let timeoutId: NodeJS.Timeout

      recognition.onresult = (event: any) => {
        let interimTranscript = ''
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          if (result.isFinal) {
            finalTranscript += result[0].transcript
            setConfidence(result[0].confidence)
          } else {
            interimTranscript += result[0].transcript
          }
        }

        const fullTranscript = finalTranscript + interimTranscript
        setTranscript(fullTranscript)

        // Clear timeout when we get results
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        
        // Set timeout for auto-stop
        timeoutId = setTimeout(() => {
          recognition.stop()
        }, 2000)
      }

      recognition.onend = () => {
        setIsTranscribing(false)
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        resolve(finalTranscript || transcript)
      }

      recognition.onerror = (event: any) => {
        setIsTranscribing(false)
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        const errorMsg = `Speech recognition error: ${event.error}`
        setError(errorMsg)
        reject(new Error(errorMsg))
      }

      // Convert blob to audio and play it for recognition
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)
      
      audio.onloadeddata = () => {
        recognition.start()
        audio.play()
      }

      audio.onerror = () => {
        setIsTranscribing(false)
        const errorMsg = 'Failed to play audio for transcription'
        setError(errorMsg)
        reject(new Error(errorMsg))
      }

      recognitionRef.current = recognition
    })
  }, [isWebSpeechSupported, transcript])

  const transcribeWithCloudAPI = useCallback(async (audioBlob: Blob): Promise<string> => {
    setIsTranscribing(true)
    setError(null)
    setTranscript('')

    try {
      // For now, we'll simulate a cloud API call
      // In a real implementation, you would send the audio to your backend
      // which would then call a service like OpenAI Whisper, Google Speech-to-Text, etc.
      
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      formData.append('language', 'en-US')

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000))

      // For demonstration, we'll return a placeholder
      // In production, replace this with actual API call
      const simulatedTranscript = 'This is a simulated transcription from cloud API. Replace this with actual implementation.'
      
      setTranscript(simulatedTranscript)
      setConfidence(0.95)
      
      return simulatedTranscript

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Cloud transcription failed'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsTranscribing(false)
    }
  }, [])

  const resetTranscription = useCallback(() => {
    setTranscript('')
    setError(null)
    setConfidence(0)
    setIsTranscribing(false)
    
    if (recognitionRef.current) {
      recognitionRef.current.abort()
      recognitionRef.current = null
    }
  }, [])

  return {
    transcript,
    isTranscribing,
    error,
    confidence,
    isWebSpeechSupported,
    transcribeWithWebSpeech,
    transcribeWithCloudAPI,
    resetTranscription,
  }
}

