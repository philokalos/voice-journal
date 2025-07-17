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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { entryId } = await req.json()
    
    if (!entryId) {
      return new Response(
        JSON.stringify({ error: 'Entry ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the entry data
    const { data: entry, error: entryError } = await supabase
      .from('entries')
      .select('*')
      .eq('id', entryId)
      .single()

    if (entryError || !entry) {
      return new Response(
        JSON.stringify({ error: 'Entry not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user's Google Sheets integration
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('*')
      .eq('user_id', entry.user_id)
      .eq('provider', 'google_sheets')
      .eq('status', 'active')
      .single()

    if (integrationError || !integration) {
      console.log('No active Google Sheets integration found for user:', entry.user_id)
      return new Response(
        JSON.stringify({ message: 'No active Google Sheets integration' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if token needs refresh
    const now = new Date()
    const expiresAt = new Date(integration.expires_at)
    
    let accessToken = integration.access_token
    
    if (now >= expiresAt) {
      // Refresh token
      const newTokens = await refreshAccessToken(integration.refresh_token)
      accessToken = newTokens.access_token
      
      // Update integration with new tokens
      await supabase
        .from('integrations')
        .update({
          access_token: newTokens.access_token,
          expires_at: new Date(Date.now() + (newTokens.expires_in * 1000)).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', integration.id)
    }

    // Sync entry to Google Sheets
    const result = await syncEntryToSheets(entry, integration, accessToken)
    
    // Log the sync attempt
    await logSyncAttempt(supabase, integration.id, entryId, result)
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in sheets-sync function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function refreshAccessToken(refreshToken: string): Promise<any> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured')
  }

  const tokenUrl = 'https://oauth2.googleapis.com/token'
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
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
    throw new Error(`Token refresh failed: ${errorText}`)
  }

  return await response.json()
}

async function syncEntryToSheets(entry: any, integration: any, accessToken: string): Promise<any> {
  try {
    // Get or create spreadsheet
    const spreadsheetId = integration.spreadsheet_id || await createSpreadsheet(accessToken, 'Voice Journal')
    
    // Update integration with spreadsheet ID if it was just created
    if (!integration.spreadsheet_id) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      )
      
      await supabase
        .from('integrations')
        .update({ spreadsheet_id: spreadsheetId })
        .eq('id', integration.id)
    }

    // Ensure headers exist
    await ensureSheetHeaders(spreadsheetId, integration.sheet_name, accessToken)
    
    // Prepare row data
    const rowData = [
      entry.date,
      entry.transcript,
      entry.wins.join('; '),
      entry.regrets.join('; '),
      entry.tasks.join('; '),
      entry.keywords.join('; '),
      entry.sentiment_score.toString(),
      new Date(entry.created_at).toISOString()
    ]

    // Check if entry already exists
    const existingRow = await findExistingRow(spreadsheetId, integration.sheet_name, entry.id, accessToken)
    
    if (existingRow) {
      // Update existing row
      await updateSheetRow(spreadsheetId, integration.sheet_name, existingRow.rowIndex, rowData, accessToken)
    } else {
      // Append new row
      await appendToSheet(spreadsheetId, integration.sheet_name, rowData, accessToken)
    }

    return {
      success: true,
      message: 'Entry synced to Google Sheets successfully',
      spreadsheetId: spreadsheetId
    }

  } catch (error) {
    console.error('Error syncing to Google Sheets:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

async function createSpreadsheet(accessToken: string, title: string): Promise<string> {
  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: title
      }
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to create spreadsheet: ${errorText}`)
  }

  const data = await response.json()
  return data.spreadsheetId
}

async function ensureSheetHeaders(spreadsheetId: string, sheetName: string, accessToken: string): Promise<void> {
  const headers = [
    'Date',
    'Transcript',
    'Wins',
    'Regrets',
    'Tasks',
    'Keywords',
    'Sentiment Score',
    'Created At'
  ]

  // Check if headers already exist
  const range = `${sheetName}!A1:H1`
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  )

  if (response.ok) {
    const data = await response.json()
    if (data.values && data.values.length > 0) {
      // Headers already exist
      return
    }
  }

  // Add headers
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [headers]
      })
    }
  )
}

async function findExistingRow(spreadsheetId: string, sheetName: string, entryId: string, accessToken: string): Promise<any> {
  // For now, we'll identify rows by date + transcript hash
  // In a real implementation, you might want to store the entry ID in a hidden column
  return null
}

async function appendToSheet(spreadsheetId: string, sheetName: string, rowData: string[], accessToken: string): Promise<void> {
  const range = `${sheetName}!A:H`
  
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=RAW`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [rowData]
      })
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to append to sheet: ${errorText}`)
  }
}

async function updateSheetRow(spreadsheetId: string, sheetName: string, rowIndex: number, rowData: string[], accessToken: string): Promise<void> {
  const range = `${sheetName}!A${rowIndex}:H${rowIndex}`
  
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [rowData]
      })
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to update sheet row: ${errorText}`)
  }
}

async function logSyncAttempt(supabase: any, integrationId: string, entryId: string, result: any): Promise<void> {
  await supabase
    .from('sync_logs')
    .upsert({
      integration_id: integrationId,
      entry_id: entryId,
      sync_type: 'create',
      status: result.success ? 'success' : 'failed',
      error_message: result.success ? null : result.error,
      created_at: new Date().toISOString()
    })
}