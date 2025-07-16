import { supabase } from '../../../lib/supabase'

export interface AnalysisResult {
  wins: string[]
  regrets: string[]
  tasks: string[]
  keywords: string[]
  sentiment_score: number
}

export interface AnalysisRequest {
  entryId: string
  transcript: string
}

export class AnalysisService {
  static async analyzeEntry(entryId: string, transcript: string): Promise<AnalysisResult> {
    // Get the current session for authorization
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      throw new Error('Authentication required')
    }

    // Get the Supabase URL from environment
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    if (!supabaseUrl) {
      throw new Error('Supabase URL not configured')
    }

    // Call the Edge Function
    const response = await fetch(`${supabaseUrl}/functions/v1/analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        entryId,
        transcript
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Analysis failed with status ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'Analysis failed')
    }

    return data.analysis
  }

  static async retryAnalysis(entryId: string, transcript: string, maxRetries: number = 3): Promise<AnalysisResult> {
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.analyzeEntry(entryId, transcript)
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        if (attempt === maxRetries) {
          break
        }
        
        // Wait with exponential backoff
        const delay = Math.pow(2, attempt) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    throw lastError || new Error('Analysis failed after retries')
  }

  // Helper method to validate analysis results
  static validateAnalysis(analysis: any): analysis is AnalysisResult {
    return (
      analysis &&
      typeof analysis === 'object' &&
      Array.isArray(analysis.wins) &&
      Array.isArray(analysis.regrets) &&
      Array.isArray(analysis.tasks) &&
      Array.isArray(analysis.keywords) &&
      typeof analysis.sentiment_score === 'number' &&
      analysis.sentiment_score >= -1 &&
      analysis.sentiment_score <= 1
    )
  }

  // Mock analysis for development/testing
  static async mockAnalysis(transcript: string): Promise<AnalysisResult> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Simple keyword extraction
    const words = transcript.toLowerCase().split(/\s+/)
    const keywords = words.filter(word => word.length > 4).slice(0, 5)
    
    return {
      wins: ['Completed a challenging task', 'Had a productive meeting'],
      regrets: ['Missed a deadline', 'Could have communicated better'],
      tasks: ['Follow up on project', 'Schedule team meeting'],
      keywords,
      sentiment_score: 0.2
    }
  }
}