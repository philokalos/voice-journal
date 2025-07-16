import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AnalysisRequest {
  entryId: string
  transcript: string
}

interface AnalysisResponse {
  wins: string[]
  regrets: string[]
  tasks: string[]
  keywords: string[]
  sentiment_score: number
}

// OpenAI API prompt for reflection extraction
const ANALYSIS_PROMPT = `
You are a skilled life coach and journal analyst. Your task is to analyze a personal journal entry and extract structured insights.

Please analyze the following journal entry and extract:
1. **Wins**: Things the person did well, achievements, positive experiences, or moments of growth
2. **Regrets**: Things they wish they had done differently, missed opportunities, or areas for improvement
3. **Tasks**: Action items, things to do tomorrow, or future commitments mentioned
4. **Keywords**: Important themes, emotions, people, places, or concepts (3-8 words)
5. **Sentiment Score**: Overall emotional tone from -1.0 (very negative) to +1.0 (very positive)

Return your analysis in the following JSON format:
{
  "wins": ["specific win 1", "specific win 2"],
  "regrets": ["specific regret 1", "specific regret 2"],
  "tasks": ["specific task 1", "specific task 2"],
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "sentiment_score": 0.3
}

Guidelines:
- Extract only what is explicitly mentioned or clearly implied
- Keep items concise but descriptive (5-15 words each)
- If a category has no relevant content, return an empty array
- Keywords should be single words or short phrases
- Sentiment score should reflect the overall emotional tone

Journal Entry:
`

async function analyzeWithOpenAI(transcript: string): Promise<AnalysisResponse> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured')
  }

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
          role: 'system',
          content: ANALYSIS_PROMPT
        },
        {
          role: 'user',
          content: transcript
        }
      ],
      max_tokens: 800,
      temperature: 0.3,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('OpenAI API error:', error)
    throw new Error(`OpenAI API failed: ${response.status}`)
  }

  const data = await response.json()
  const content = data.choices[0]?.message?.content

  if (!content) {
    throw new Error('No content received from OpenAI')
  }

  // Parse JSON response
  try {
    const parsed = JSON.parse(content)
    
    // Validate response structure
    if (!Array.isArray(parsed.wins) || !Array.isArray(parsed.regrets) || 
        !Array.isArray(parsed.tasks) || !Array.isArray(parsed.keywords) ||
        typeof parsed.sentiment_score !== 'number') {
      throw new Error('Invalid response structure from OpenAI')
    }

    // Ensure sentiment score is within valid range
    const sentimentScore = Math.max(-1, Math.min(1, parsed.sentiment_score))

    return {
      wins: parsed.wins.slice(0, 10), // Limit to 10 items
      regrets: parsed.regrets.slice(0, 10),
      tasks: parsed.tasks.slice(0, 10),
      keywords: parsed.keywords.slice(0, 15),
      sentiment_score: sentimentScore
    }
  } catch (parseError) {
    console.error('Failed to parse OpenAI response:', content)
    throw new Error('Failed to parse AI analysis response')
  }
}

async function updateEntryWithAnalysis(
  supabase: any,
  entryId: string,
  analysis: AnalysisResponse
): Promise<void> {
  const { error } = await supabase
    .from('entries')
    .update({
      wins: analysis.wins,
      regrets: analysis.regrets,
      tasks: analysis.tasks,
      keywords: analysis.keywords,
      sentiment_score: analysis.sentiment_score,
      updated_at: new Date().toISOString()
    })
    .eq('id', entryId)

  if (error) {
    console.error('Database update error:', error)
    throw new Error(`Failed to update entry: ${error.message}`)
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request body
    const { entryId, transcript }: AnalysisRequest = await req.json()

    if (!entryId || !transcript) {
      return new Response(
        JSON.stringify({ error: 'Missing entryId or transcript' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify entry belongs to authenticated user
    const { data: entry, error: entryError } = await supabaseClient
      .from('entries')
      .select('id, user_id')
      .eq('id', entryId)
      .single()

    if (entryError || !entry || entry.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Entry not found or unauthorized' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Analyze transcript with OpenAI
    const analysis = await analyzeWithOpenAI(transcript)

    // Update entry with analysis results
    await updateEntryWithAnalysis(supabaseClient, entryId, analysis)

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Analysis function error:', error)
    
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