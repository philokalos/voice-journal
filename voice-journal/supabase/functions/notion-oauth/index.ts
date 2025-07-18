import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotionOAuthRequest {
  code?: string;
  state?: string;
  action: 'authorize' | 'callback' | 'disconnect';
}

interface NotionTokens {
  access_token: string;
  token_type: string;
  bot_id: string;
  workspace_name: string;
  workspace_icon: string;
  workspace_id: string;
  owner: {
    type: string;
    user?: {
      id: string;
      name: string;
      avatar_url: string;
      type: string;
      person: {
        email: string;
      };
    };
  };
  duplicated_template_id?: string;
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

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user authentication
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { action, code, state }: NotionOAuthRequest = await req.json()

    const notionClientId = Deno.env.get('NOTION_CLIENT_ID')
    const notionClientSecret = Deno.env.get('NOTION_CLIENT_SECRET')
    const redirectUri = Deno.env.get('NOTION_REDIRECT_URI') || 'https://voice-journal.vercel.app/notion/callback'

    if (!notionClientId || !notionClientSecret) {
      throw new Error('Notion credentials not configured')
    }

    switch (action) {
      case 'authorize':
        // Generate authorization URL
        const authUrl = new URL('https://api.notion.com/v1/oauth/authorize')
        authUrl.searchParams.set('client_id', notionClientId)
        authUrl.searchParams.set('response_type', 'code')
        authUrl.searchParams.set('owner', 'user')
        authUrl.searchParams.set('redirect_uri', redirectUri)
        authUrl.searchParams.set('state', user.id) // Use user ID as state

        return new Response(
          JSON.stringify({
            success: true,
            authUrl: authUrl.toString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'callback':
        if (!code) {
          throw new Error('Authorization code is required')
        }

        if (state !== user.id) {
          throw new Error('Invalid state parameter')
        }

        // Exchange code for access token
        console.log('Exchanging code for access token')
        const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`${notionClientId}:${notionClientSecret}`)}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
          }),
        })

        if (!tokenResponse.ok) {
          const error = await tokenResponse.text()
          throw new Error(`Notion OAuth failed: ${error}`)
        }

        const tokens: NotionTokens = await tokenResponse.json()
        console.log('Received tokens from Notion')

        // Store tokens in database
        const { error: upsertError } = await supabaseClient
          .from('integrations')
          .upsert({
            user_id: user.id,
            service: 'notion',
            access_token: tokens.access_token,
            token_type: tokens.token_type,
            bot_id: tokens.bot_id,
            workspace_name: tokens.workspace_name,
            workspace_icon: tokens.workspace_icon,
            workspace_id: tokens.workspace_id,
            owner_info: tokens.owner,
            status: 'connected',
            connected_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,service'
          })

        if (upsertError) {
          console.error('Failed to store tokens:', upsertError)
          throw new Error('Failed to store integration tokens')
        }

        console.log(`Notion integration connected for user ${user.id}`)

        return new Response(
          JSON.stringify({
            success: true,
            workspace: {
              name: tokens.workspace_name,
              icon: tokens.workspace_icon,
              id: tokens.workspace_id
            },
            owner: tokens.owner
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'disconnect':
        // Remove integration
        const { error: deleteError } = await supabaseClient
          .from('integrations')
          .delete()
          .eq('user_id', user.id)
          .eq('service', 'notion')

        if (deleteError) {
          console.error('Failed to disconnect Notion:', deleteError)
          throw new Error('Failed to disconnect Notion integration')
        }

        console.log(`Notion integration disconnected for user ${user.id}`)

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Notion integration disconnected successfully'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      default:
        throw new Error('Invalid action')
    }

  } catch (error) {
    console.error('Notion OAuth error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        success: false
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})