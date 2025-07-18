import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotionSyncRequest {
  entryId: string;
  action: 'create' | 'update' | 'delete';
  databaseId?: string;
}

interface NotionPageProperty {
  [key: string]: any;
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

    const { entryId, action, databaseId }: NotionSyncRequest = await req.json()

    if (!entryId) {
      throw new Error('Entry ID is required')
    }

    // Get user's Notion integration
    const { data: integration, error: integrationError } = await supabaseClient
      .from('integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('service', 'notion')
      .eq('status', 'connected')
      .single()

    if (integrationError || !integration) {
      throw new Error('Notion integration not found or not connected')
    }

    // Get entry data
    const { data: entry, error: entryError } = await supabaseClient
      .from('entries')
      .select('*')
      .eq('id', entryId)
      .eq('user_id', user.id)
      .single()

    if (entryError || !entry) {
      throw new Error('Entry not found')
    }

    const accessToken = integration.access_token
    const notionApiUrl = 'https://api.notion.com/v1'
    
    // Use provided database ID or get default from integration
    const targetDatabaseId = databaseId || integration.database_id

    if (!targetDatabaseId && action !== 'delete') {
      throw new Error('Database ID is required for create/update operations')
    }

    console.log(`Notion sync: ${action} entry ${entryId}`)

    switch (action) {
      case 'create':
      case 'update':
        // Prepare page properties
        const properties: NotionPageProperty = {
          'Date': {
            date: {
              start: entry.date
            }
          },
          'Title': {
            title: [
              {
                text: {
                  content: `Journal Entry - ${entry.date}`
                }
              }
            ]
          },
          'Sentiment': {
            number: entry.sentiment_score || 0
          }
        }

        // Add wins as multi-select if available
        if (entry.wins && entry.wins.length > 0) {
          properties['Wins'] = {
            multi_select: entry.wins.map((win: string) => ({ name: win.substring(0, 100) }))
          }
        }

        // Add regrets as multi-select if available
        if (entry.regrets && entry.regrets.length > 0) {
          properties['Regrets'] = {
            multi_select: entry.regrets.map((regret: string) => ({ name: regret.substring(0, 100) }))
          }
        }

        // Add tasks as multi-select if available
        if (entry.tasks && entry.tasks.length > 0) {
          properties['Tasks'] = {
            multi_select: entry.tasks.map((task: string) => ({ name: task.substring(0, 100) }))
          }
        }

        // Add keywords as multi-select if available
        if (entry.keywords && entry.keywords.length > 0) {
          properties['Keywords'] = {
            multi_select: entry.keywords.map((keyword: string) => ({ name: keyword.substring(0, 100) }))
          }
        }

        // Prepare page content
        const children = [
          {
            object: 'block',
            type: 'heading_2',
            heading_2: {
              rich_text: [
                {
                  type: 'text',
                  text: { content: 'Transcript' }
                }
              ]
            }
          },
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: { content: entry.transcript || 'No transcript available' }
                }
              ]
            }
          }
        ]

        // Add sections for categorized content
        if (entry.wins && entry.wins.length > 0) {
          children.push(
            {
              object: 'block',
              type: 'heading_3',
              heading_3: {
                rich_text: [{ type: 'text', text: { content: 'Things I Did Well' } }]
              }
            },
            {
              object: 'block',
              type: 'bulleted_list_item',
              bulleted_list_item: {
                rich_text: entry.wins.map((win: string) => ({
                  type: 'text',
                  text: { content: `• ${win}\n` }
                }))
              }
            }
          )
        }

        if (entry.regrets && entry.regrets.length > 0) {
          children.push(
            {
              object: 'block',
              type: 'heading_3',
              heading_3: {
                rich_text: [{ type: 'text', text: { content: 'Regrets' } }]
              }
            },
            {
              object: 'block',
              type: 'bulleted_list_item',
              bulleted_list_item: {
                rich_text: entry.regrets.map((regret: string) => ({
                  type: 'text',
                  text: { content: `• ${regret}\n` }
                }))
              }
            }
          )
        }

        if (entry.tasks && entry.tasks.length > 0) {
          children.push(
            {
              object: 'block',
              type: 'heading_3',
              heading_3: {
                rich_text: [{ type: 'text', text: { content: 'Tasks for Tomorrow' } }]
              }
            },
            {
              object: 'block',
              type: 'to_do',
              to_do: {
                rich_text: entry.tasks.map((task: string) => ({
                  type: 'text',
                  text: { content: task }
                })),
                checked: false
              }
            }
          )
        }

        let notionResponse;
        
        if (action === 'create') {
          // Create new page
          notionResponse = await fetch(`${notionApiUrl}/pages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'Notion-Version': '2022-06-28'
            },
            body: JSON.stringify({
              parent: { database_id: targetDatabaseId },
              properties,
              children
            })
          })
        } else {
          // Update existing page
          const notionPageId = integration.notion_page_mapping?.[entryId]
          if (!notionPageId) {
            throw new Error('Notion page ID not found for update operation')
          }

          notionResponse = await fetch(`${notionApiUrl}/pages/${notionPageId}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'Notion-Version': '2022-06-28'
            },
            body: JSON.stringify({ properties })
          })
        }

        if (!notionResponse.ok) {
          const error = await notionResponse.text()
          throw new Error(`Notion API error: ${error}`)
        }

        const notionPage = await notionResponse.json()
        
        // Store page mapping for future updates
        if (action === 'create') {
          const pageMapping = integration.notion_page_mapping || {}
          pageMapping[entryId] = notionPage.id

          await supabaseClient
            .from('integrations')
            .update({
              notion_page_mapping: pageMapping,
              last_sync_at: new Date().toISOString()
            })
            .eq('user_id', user.id)
            .eq('service', 'notion')
        }

        console.log(`Successfully ${action}d Notion page: ${notionPage.id}`)

        return new Response(
          JSON.stringify({
            success: true,
            action,
            notionPageId: notionPage.id,
            notionPageUrl: notionPage.url
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'delete':
        // Archive the page in Notion
        const notionPageId = integration.notion_page_mapping?.[entryId]
        if (!notionPageId) {
          throw new Error('Notion page ID not found for delete operation')
        }

        const deleteResponse = await fetch(`${notionApiUrl}/pages/${notionPageId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Notion-Version': '2022-06-28'
          },
          body: JSON.stringify({ archived: true })
        })

        if (!deleteResponse.ok) {
          const error = await deleteResponse.text()
          throw new Error(`Notion API error: ${error}`)
        }

        // Remove from page mapping
        const pageMapping = integration.notion_page_mapping || {}
        delete pageMapping[entryId]

        await supabaseClient
          .from('integrations')
          .update({
            notion_page_mapping: pageMapping,
            last_sync_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('service', 'notion')

        console.log(`Successfully archived Notion page: ${notionPageId}`)

        return new Response(
          JSON.stringify({
            success: true,
            action: 'delete',
            notionPageId
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      default:
        throw new Error('Invalid action')
    }

  } catch (error) {
    console.error('Notion sync error:', error)
    
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