import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: req.headers.get('Authorization')! } },
      }
    )

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    if (action === 'auth-url') {
      // Generate OAuth2 authorization URL
      const authUrl = await generateAuthUrl(user.id)
      return new Response(
        JSON.stringify({ authUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'callback') {
      // Handle OAuth2 callback
      const code = url.searchParams.get('code')
      const state = url.searchParams.get('state')
      
      if (!code || !state) {
        return new Response(
          JSON.stringify({ error: 'Missing authorization code or state' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verify state parameter contains user ID
      const expectedState = await generateState(user.id)
      if (state !== expectedState) {
        return new Response(
          JSON.stringify({ error: 'Invalid state parameter' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Exchange code for tokens
      const tokens = await exchangeCodeForTokens(code)
      
      // Store tokens in database
      await storeTokens(supabase, user.id, tokens)

      return new Response(
        JSON.stringify({ success: true, message: 'Google Sheets connected successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'disconnect') {
      // Disconnect Google Sheets integration
      await disconnectIntegration(supabase, user.id)
      
      return new Response(
        JSON.stringify({ success: true, message: 'Google Sheets disconnected successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'status') {
      // Get integration status
      const status = await getIntegrationStatus(supabase, user.id)
      
      return new Response(
        JSON.stringify(status),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action parameter' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in sheets-oauth function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function generateAuthUrl(userId: string): Promise<string> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
  const redirectUri = Deno.env.get('GOOGLE_REDIRECT_URI')
  
  if (!clientId || !redirectUri) {
    throw new Error('Google OAuth credentials not configured')
  }

  const state = await generateState(userId)
  const scope = 'https://www.googleapis.com/auth/spreadsheets'

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scope,
    state: state,
    access_type: 'offline',
    prompt: 'consent'
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

async function generateState(userId: string): Promise<string> {
  const secret = Deno.env.get('OAUTH_STATE_SECRET') || 'default-secret'
  
  // Create a simple hash-based state
  const encoder = new TextEncoder()
  const data = encoder.encode(userId + secret)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  
  return hashHex.substring(0, 32) // Use first 32 characters
}

async function exchangeCodeForTokens(code: string): Promise<any> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')
  const redirectUri = Deno.env.get('GOOGLE_REDIRECT_URI')

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google OAuth credentials not configured')
  }

  const tokenUrl = 'https://oauth2.googleapis.com/token'
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code: code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri
  })

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Token exchange failed: ${errorText}`)
  }

  return await response.json()
}

async function storeTokens(supabase: any, userId: string, tokens: any): Promise<void> {
  const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000))

  const { error } = await supabase
    .from('integrations')
    .upsert({
      user_id: userId,
      provider: 'google_sheets',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt.toISOString(),
      status: 'active',
      updated_at: new Date().toISOString()
    })

  if (error) {
    throw new Error(`Failed to store tokens: ${error.message}`)
  }
}

async function disconnectIntegration(supabase: any, userId: string): Promise<void> {
  const { error } = await supabase
    .from('integrations')
    .delete()
    .eq('user_id', userId)
    .eq('provider', 'google_sheets')

  if (error) {
    throw new Error(`Failed to disconnect integration: ${error.message}`)
  }
}

async function getIntegrationStatus(supabase: any, userId: string): Promise<any> {
  const { data, error } = await supabase
    .from('integrations')
    .select('status, last_sync_at, error_message, spreadsheet_id, sheet_name')
    .eq('user_id', userId)
    .eq('provider', 'google_sheets')
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
    throw new Error(`Failed to get integration status: ${error.message}`)
  }

  return {
    connected: !!data,
    status: data?.status || 'disconnected',
    lastSync: data?.last_sync_at,
    errorMessage: data?.error_message,
    spreadsheetId: data?.spreadsheet_id,
    sheetName: data?.sheet_name
  }
}