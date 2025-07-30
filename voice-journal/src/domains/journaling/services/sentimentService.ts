import { getFirebaseAuth, getFirebaseFunctions } from '../../../lib/firebase'
import { httpsCallable } from 'firebase/functions'
import { retryWithBackoff, isRetryableError } from '../../../utils/retry'

export interface SentimentAnalysisResult {
  sentiment_score: number
  sentiment_magnitude: number
  wins: string[]
  regrets: string[]
  tasks: string[]
  keywords: string[]
}

export interface SentimentAnalysisResponse {
  success: boolean
  analysis: SentimentAnalysisResult
}

export class SentimentService {
  /**
   * Analyze sentiment of a journal entry with retry logic
   * @param entryId - The ID of the entry to analyze
   * @param transcript - The transcript text to analyze
   * @returns Promise with sentiment analysis results
   */
  static async analyzeSentiment(entryId: string, transcript: string): Promise<SentimentAnalysisResult> {
    const auth = getFirebaseAuth()
    const user = auth.currentUser
    if (!user) {
      throw new Error('User not authenticated')
    }

    if (!transcript.trim()) {
      throw new Error('Transcript is required for sentiment analysis')
    }

    const functions = getFirebaseFunctions()
    const analyzeSentimentFn = httpsCallable<
      { entryId: string; transcript: string },
      SentimentAnalysisResponse
    >(functions, 'analyzeSentiment')

    // Retry wrapper function
    const performAnalysis = async (): Promise<SentimentAnalysisResult> => {
      const result = await analyzeSentimentFn({
        entryId,
        transcript: transcript.trim()
      })

      if (!result.data.success) {
        throw new Error('Sentiment analysis failed')
      }

      return result.data.analysis
    }

    try {
      const retryResult = await retryWithBackoff(performAnalysis, {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 5000,
        backoffMultiplier: 2,
        onRetry: (error, attempt) => {
          console.warn(`Sentiment analysis retry ${attempt}/3:`, error.message)
          
          // Log retry attempts for monitoring
          this.logRetryAttempt(entryId, error, attempt)
        }
      })

      if (retryResult.success && retryResult.data) {
        // Log successful analysis after retries
        if (retryResult.attempts > 1) {
          console.info(`Sentiment analysis succeeded after ${retryResult.attempts} attempts for entry ${entryId}`)
        }
        
        return retryResult.data
      }

      // If retry failed, throw the last error to be caught below
      throw retryResult.error || new Error('Sentiment analysis failed after retries')

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Sentiment analysis error after retries:', errorMessage)
      
      // Log final failure for monitoring
      this.logAnalysisFailure(entryId, error as Error)

      // Return default analysis as fallback to ensure app continues working
      return this.createFallbackAnalysis(transcript, errorMessage)
    }
  }

  /**
   * Extract basic keywords as a fallback when AI analysis fails
   * @param transcript - The transcript text
   * @returns Array of basic keywords
   */
  private static extractBasicKeywords(transcript: string): string[] {
    if (!transcript.trim()) return []

    // Simple keyword extraction for fallback
    const words = transcript
      .toLowerCase()
      .replace(/[^\w\s가-힣]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 5)

    return [...new Set(words)] // Remove duplicates
  }

  /**
   * Validate sentiment analysis result
   * @param analysis - The analysis result to validate
   * @returns Boolean indicating if the result is valid
   */
  static validateAnalysisResult(analysis: SentimentAnalysisResult): boolean {
    return (
      typeof analysis.sentiment_score === 'number' &&
      analysis.sentiment_score >= 0 &&
      analysis.sentiment_score <= 1 &&
      Array.isArray(analysis.wins) &&
      Array.isArray(analysis.regrets) &&
      Array.isArray(analysis.tasks) &&
      Array.isArray(analysis.keywords)
    )
  }

  /**
   * Get sentiment description based on score
   * @param score - Sentiment score (0-1)
   * @returns Korean description of the sentiment
   */
  static getSentimentDescription(score: number): string {
    if (score >= 0.7) return '긍정적'
    if (score >= 0.6) return '약간 긍정적'
    if (score >= 0.4) return '중립적'
    if (score >= 0.3) return '약간 부정적'
    return '부정적'
  }

  /**
   * Get sentiment color for UI display
   * @param score - Sentiment score (0-1)
   * @returns CSS color class or value
   */
  static getSentimentColor(score: number): string {
    if (score >= 0.7) return '#10b981' // green-500
    if (score >= 0.6) return '#84cc16' // lime-500
    if (score >= 0.4) return '#f59e0b' // amber-500
    if (score >= 0.3) return '#f97316' // orange-500
    return '#ef4444' // red-500
  }

  /**
   * Format analysis results for display
   * @param analysis - The sentiment analysis result
   * @returns Formatted object for UI display
   */
  static formatForDisplay(analysis: SentimentAnalysisResult) {
    return {
      sentiment: {
        score: analysis.sentiment_score,
        description: this.getSentimentDescription(analysis.sentiment_score),
        color: this.getSentimentColor(analysis.sentiment_score)
      },
      insights: {
        wins: analysis.wins.length > 0 ? analysis.wins : ['분석된 성과가 없습니다'],
        regrets: analysis.regrets.length > 0 ? analysis.regrets : ['분석된 아쉬운 점이 없습니다'],
        tasks: analysis.tasks.length > 0 ? analysis.tasks : ['분석된 할 일이 없습니다'],
        keywords: analysis.keywords.length > 0 ? analysis.keywords : ['키워드 없음']
      }
    }
  }

  /**
   * Create fallback analysis when AI analysis fails
   * @param transcript - The original transcript
   * @param errorMessage - The error message for context
   * @returns Fallback analysis result
   */
  private static createFallbackAnalysis(transcript: string, _errorMessage: string): SentimentAnalysisResult {
    return {
      sentiment_score: 0.5, // Neutral sentiment
      sentiment_magnitude: 0,
      wins: [],
      regrets: [],
      tasks: [],
      keywords: this.extractBasicKeywords(transcript)
    }
  }

  /**
   * Log retry attempts for monitoring
   * @param entryId - Entry ID being analyzed
   * @param error - The error that triggered retry
   * @param attempt - Current attempt number
   */
  private static logRetryAttempt(entryId: string, error: Error, attempt: number): void {
    // In a production app, this would send to analytics/monitoring service
    const logData = {
      event: 'sentiment_analysis_retry',
      entryId,
      attempt,
      error: error.message,
      timestamp: new Date().toISOString(),
      retryable: isRetryableError(error)
    }
    
    // For now, log to console. In production, send to monitoring service
    console.warn('AI Analysis Retry:', logData)
  }

  /**
   * Log final analysis failure for monitoring
   * @param entryId - Entry ID that failed analysis
   * @param error - Final error after all retries
   */
  private static logAnalysisFailure(entryId: string, error: Error): void {
    // In a production app, this would send to analytics/monitoring service
    const logData = {
      event: 'sentiment_analysis_failed',
      entryId,
      error: error.message,
      timestamp: new Date().toISOString(),
      fallback_used: true
    }
    
    // For now, log to console. In production, send to monitoring service
    console.error('AI Analysis Failed:', logData)
  }
}