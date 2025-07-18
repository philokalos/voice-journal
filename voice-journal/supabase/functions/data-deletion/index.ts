import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DataDeletionRequest {
  userId: string
  requestType: 'delete_all' | 'export_data'
  userConfirmation: boolean
}

interface DataExportResponse {
  entries: any[]
  integrations: any[]
  audioFiles: string[]
  exportedAt: string
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

    const { userId, requestType, userConfirmation }: DataDeletionRequest = await req.json()

    // Verify user can only request deletion for their own data
    if (user.id !== userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Can only request deletion of own data' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!userConfirmation) {
      return new Response(
        JSON.stringify({ error: 'User confirmation required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (requestType === 'export_data') {
      // Export user data
      console.log(`Starting data export for user ${userId}`)
      
      const exportData = await exportUserData(supabaseClient, userId)
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Data exported successfully',
          data: exportData
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (requestType === 'delete_all') {
      // Create deletion request record
      console.log(`Creating deletion request for user ${userId}`)
      
      const { data: deletionRequest, error: requestError } = await supabaseClient
        .from('data_retention_requests')
        .insert({
          user_id: userId,
          request_type: 'delete_all',
          status: 'pending'
        })
        .select()
        .single()

      if (requestError) {
        console.error('Failed to create deletion request:', requestError)
        throw new Error('Failed to create deletion request')
      }

      // Process deletion immediately (in production, this might be queued)
      console.log(`Processing immediate deletion for user ${userId}`)
      
      try {
        await processUserDataDeletion(supabaseClient, userId)
        
        // Update request status to completed
        await supabaseClient
          .from('data_retention_requests')
          .update({
            status: 'completed',
            processed_at: new Date().toISOString(),
            notes: 'Data deletion completed successfully'
          })
          .eq('id', deletionRequest.id)

        console.log(`Data deletion completed for user ${userId}`)

        return new Response(
          JSON.stringify({
            success: true,
            message: 'All user data has been deleted successfully',
            deletionRequestId: deletionRequest.id,
            processedAt: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      } catch (deletionError) {
        console.error('Data deletion failed:', deletionError)
        
        // Update request status to failed
        await supabaseClient
          .from('data_retention_requests')
          .update({
            status: 'failed',
            processed_at: new Date().toISOString(),
            notes: `Deletion failed: ${deletionError.message}`
          })
          .eq('id', deletionRequest.id)

        throw deletionError
      }
    }

    return new Response(
      JSON.stringify({ error: 'Invalid request type' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Data deletion function error:', error)
    
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

async function exportUserData(supabaseClient: any, userId: string): Promise<DataExportResponse> {
  console.log(`Exporting data for user ${userId}`)

  // Export entries
  const { data: entries, error: entriesError } = await supabaseClient
    .from('entries')
    .select('*')
    .eq('user_id', userId)

  if (entriesError) {
    throw new Error(`Failed to export entries: ${entriesError.message}`)
  }

  // Export integrations
  const { data: integrations, error: integrationsError } = await supabaseClient
    .from('integrations')
    .select('*')
    .eq('user_id', userId)

  if (integrationsError) {
    throw new Error(`Failed to export integrations: ${integrationsError.message}`)
  }

  // List audio files
  const { data: audioFiles, error: audioError } = await supabaseClient
    .storage
    .from('voices')
    .list(`${userId}/`, { limit: 1000 })

  if (audioError) {
    console.warn('Failed to list audio files:', audioError.message)
  }

  const audioFileUrls = audioFiles?.map(file => 
    `${userId}/${file.name}`
  ) || []

  return {
    entries: entries || [],
    integrations: integrations || [],
    audioFiles: audioFileUrls,
    exportedAt: new Date().toISOString()
  }
}

async function processUserDataDeletion(supabaseClient: any, userId: string): Promise<void> {
  console.log(`Starting data deletion for user ${userId}`)

  // Delete all entries (will cascade to related data due to foreign keys)
  const { error: entriesError } = await supabaseClient
    .from('entries')
    .delete()
    .eq('user_id', userId)

  if (entriesError) {
    throw new Error(`Failed to delete entries: ${entriesError.message}`)
  }

  // Delete all integrations
  const { error: integrationsError } = await supabaseClient
    .from('integrations')
    .delete()
    .eq('user_id', userId)

  if (integrationsError) {
    throw new Error(`Failed to delete integrations: ${integrationsError.message}`)
  }

  // Delete all audio files from storage
  try {
    const { data: audioFiles, error: listError } = await supabaseClient
      .storage
      .from('voices')
      .list(`${userId}/`, { limit: 1000 })

    if (listError) {
      console.warn('Failed to list audio files for deletion:', listError.message)
    } else if (audioFiles && audioFiles.length > 0) {
      const filePaths = audioFiles.map(file => `${userId}/${file.name}`)
      
      const { error: deleteError } = await supabaseClient
        .storage
        .from('voices')
        .remove(filePaths)

      if (deleteError) {
        console.warn('Some audio files may not have been deleted:', deleteError.message)
      } else {
        console.log(`Deleted ${filePaths.length} audio files`)
      }
    }
  } catch (storageError) {
    console.warn('Audio file deletion failed:', storageError)
    // Don't throw error for storage issues - data deletion should continue
  }

  // Delete audit logs
  const { error: auditError } = await supabaseClient
    .from('audit_logs')
    .delete()
    .eq('user_id', userId)

  if (auditError) {
    console.warn('Failed to delete audit logs:', auditError.message)
    // Don't throw error - audit logs are less critical
  }

  // Note: We don't delete the auth.users record here
  // That should be handled by Supabase Auth if the user account is deleted
  
  console.log(`Data deletion completed for user ${userId}`)
}