// Global type definitions for Voice Journal

// Web Speech API types
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }

  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    grammars: SpeechGrammarList;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    serviceURI: string;
    
    // Event handlers
    onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
    onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
    onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    
    // Methods
    abort(): void;
    start(): void;
    stop(): void;
  }

  var SpeechRecognition: {
    prototype: SpeechRecognition;
    new(): SpeechRecognition;
  };

  interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
  }

  interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
  }

  interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
  }

  interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
  }

  interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
    readonly message: string;
  }

  interface SpeechGrammarList {
    readonly length: number;
    addFromString(string: string, weight?: number): void;
    addFromURI(src: string, weight?: number): void;
    item(index: number): SpeechGrammar;
    [index: number]: SpeechGrammar;
  }

  interface SpeechGrammar {
    src: string;
    weight: number;
  }
}

// MediaRecorder types for better browser support
declare global {
  interface MediaRecorderOptions {
    mimeType?: string;
    audioBitsPerSecond?: number;
    videoBitsPerSecond?: number;
    bitsPerSecond?: number;
  }
}

// Journal Entry types
export interface JournalEntry {
  id: string;
  content: string;
  date: string;
  timestamp: string;
  source: 'text' | 'voice';
  transcript_confidence?: number;
  transcript_source?: 'web_speech' | 'google_cloud' | 'openai_whisper';
  fallback_attempted?: boolean;
}

// Voice Recording types
export interface VoiceRecordingState {
  isRecording: boolean;
  isProcessing: boolean;
  duration: number;
  error: string | null;
  transcript: string | null;
  confidence?: number;
  fallbackAttempted: boolean;
  source: string;
}

// Transcription types
export interface TranscriptionQuality {
  needsFallback: boolean;
  reason?: 'no_transcript' | 'transcript_too_short' | 'low_confidence' | 'gibberish_detected';
  confidence?: number;
}

export interface FallbackTranscriptionOptions {
  entryId: string;
  audioUrl: string;
  userId: string;
  language?: 'en' | 'ko';
  confidenceThreshold?: number;
}

export interface FallbackTranscriptionResult {
  success: boolean;
  transcript?: string;
  confidence?: number;
  language?: string;
  duration?: number;
  processingTime?: number;
  source?: string;
  error?: string;
}

// Supabase Database types
export interface Database {
  public: {
    Tables: {
      entries: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          transcript: string | null;
          transcript_fallback: string | null;
          transcript_confidence: number | null;
          transcript_language: string;
          transcript_duration: number | null;
          fallback_processing_time: number | null;
          transcript_source: string;
          wins: string[];
          regrets: string[];
          tasks: string[];
          keywords: string[];
          sentiment_score: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          transcript?: string | null;
          transcript_fallback?: string | null;
          transcript_confidence?: number | null;
          transcript_language?: string;
          transcript_duration?: number | null;
          fallback_processing_time?: number | null;
          transcript_source?: string;
          wins?: string[];
          regrets?: string[];
          tasks?: string[];
          keywords?: string[];
          sentiment_score?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          transcript?: string | null;
          transcript_fallback?: string | null;
          transcript_confidence?: number | null;
          transcript_language?: string;
          transcript_duration?: number | null;
          fallback_processing_time?: number | null;
          transcript_source?: string;
          wins?: string[];
          regrets?: string[];
          tasks?: string[];
          keywords?: string[];
          sentiment_score?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      transcription_logs: {
        Row: {
          id: string;
          entry_id: string;
          user_id: string;
          transcription_type: string;
          success: boolean;
          error_message: string | null;
          processing_time_ms: number | null;
          confidence_score: number | null;
          language_detected: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          entry_id: string;
          user_id: string;
          transcription_type: string;
          success: boolean;
          error_message?: string | null;
          processing_time_ms?: number | null;
          confidence_score?: number | null;
          language_detected?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          entry_id?: string;
          user_id?: string;
          transcription_type?: string;
          success?: boolean;
          error_message?: string | null;
          processing_time_ms?: number | null;
          confidence_score?: number | null;
          language_detected?: string | null;
          created_at?: string;
        };
      };
    };
  };
}

export {};