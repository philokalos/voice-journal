import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VoiceProcessingRequest {
  entryId: string
  audioUrl: string
  userId: string
}

interface TranscriptionResponse {
  text: string
  confidence?: number
}

interface AnalysisResponse {
  wins: string[]
  regrets: string[]
  tasks: string[]
  keywords: string[]
  sentiment_score: number
}

async function transcribeAudio(audioUrl: string): Promise<TranscriptionResponse> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured')
  }

  try {
    // Fetch audio file
    const audioResponse = await fetch(audioUrl)
    if (!audioResponse.ok) {
      throw new Error('Failed to fetch audio file')
    }

    const audioBuffer = await audioResponse.arrayBuffer()
    const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' })

    // Create FormData for OpenAI Whisper API
    const formData = new FormData()
    formData.append('file', audioBlob, 'audio.webm')
    formData.append('model', 'whisper-1')
    formData.append('language', 'ko') // Korean, change as needed

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${error}`)
    }

    const result = await response.json()
    return {
      text: result.text,
      confidence: 0.9 // Whisper doesn't provide confidence, using default
    }
  } catch (error) {
    console.error('Transcription error:', error)
    throw error
  }
}

async function analyzeText(text: string): Promise<AnalysisResponse> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured')
  }

  const prompt = `
다음 일기 텍스트를 분석해서 JSON 형태로 분류해주세요:

텍스트: "${text}"

다음 4개 카테고리로 분류해주세요:
- wins: 오늘 잘한 일들 (배열)
- regrets: 후회하는 일들 (배열)  
- tasks: 내일 해야 할 일들 (배열)
- keywords: 주요 키워드들 (배열)
- sentiment_score: 전체적인 감정 점수 (-1.0 ~ 1.0, -1이 매우 부정적, 1이 매우 긍정적)

JSON 형태로만 응답해주세요. 다른 설명은 필요없습니다.
`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${error}`)
    }

    const result = await response.json()
    const analysisText = result.choices[0].message.content

    // Parse JSON response
    try {
      const analysis = JSON.parse(analysisText)
      return {
        wins: analysis.wins || [],
        regrets: analysis.regrets || [],
        tasks: analysis.tasks || [],
        keywords: analysis.keywords || [],
        sentiment_score: analysis.sentiment_score || 0
      }
    } catch (parseError) {
      console.error('Failed to parse analysis JSON:', analysisText)
      // Fallback: return empty analysis
      return {
        wins: [],
        regrets: [],
        tasks: [],
        keywords: [],
        sentiment_score: 0
      }
    }
  } catch (error) {
    console.error('Analysis error:', error)
    throw error
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { entryId, audioUrl, userId }: VoiceProcessingRequest = await req.json()

    if (!entryId || !audioUrl || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Processing voice for entry ${entryId}`)

    // Step 1: Transcribe audio
    console.log('Starting transcription...')
    const transcription = await transcribeAudio(audioUrl)
    console.log('Transcription completed:', transcription.text.substring(0, 100))

    // Step 2: Analyze text
    console.log('Starting analysis...')
    const analysis = await analyzeText(transcription.text)
    console.log('Analysis completed:', analysis)

    // Step 3: Update entry in database
    console.log('Updating database...')
    const { error: updateError } = await supabaseClient
      .from('entries')
      .update({
        transcript: transcription.text,
        wins: analysis.wins,
        regrets: analysis.regrets,
        tasks: analysis.tasks,
        keywords: analysis.keywords,
        sentiment_score: analysis.sentiment_score,
        updated_at: new Date().toISOString()
      })
      .eq('id', entryId)
      .eq('user_id', userId)

    if (updateError) {
      console.error('Database update error:', updateError)
      throw new Error('Failed to update entry in database')
    }

    console.log(`Successfully processed entry ${entryId}`)

    return new Response(
      JSON.stringify({ 
        success: true,
        transcription: transcription.text,
        analysis: analysis
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Voice processing error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})