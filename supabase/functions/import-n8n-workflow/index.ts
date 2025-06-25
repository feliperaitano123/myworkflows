import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

interface RequestBody {
  n8n_url: string
  n8n_api_key: string
  workflow_id: string
  excludePinnedData?: boolean
}

interface ImportResponse {
  success: boolean
  workflow?: {
    id: string
    name: string
    active: boolean
    nodes: any[]
    connections: any
    settings: any
    staticData: any
    tags: Array<{ id: string; name: string }>
    createdAt: string
    updatedAt: string
  }
  message?: string
  error?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Parse request body
    const { n8n_url, n8n_api_key, workflow_id, excludePinnedData = true }: RequestBody = await req.json()

    // Validate inputs
    if (!n8n_url || !n8n_api_key || !workflow_id) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Missing required fields: n8n_url, n8n_api_key, and workflow_id',
          error: 'MISSING_FIELDS'
        } as ImportResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    // Validate URL format
    try {
      new URL(n8n_url)
    } catch {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Invalid URL format',
          error: 'INVALID_URL'
        } as ImportResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    // Remove trailing slash from URL
    const baseUrl = n8n_url.replace(/\/$/, '')

    // Build query parameters
    const params = new URLSearchParams()
    if (excludePinnedData) params.append('excludePinnedData', 'true')

    // Call n8n workflow endpoint
    const workflowUrl = `${baseUrl}/api/v1/workflows/${workflow_id}?${params.toString()}`
    
    try {
      const response = await fetch(workflowUrl, {
        method: 'GET',
        headers: {
          'X-N8N-API-KEY': n8n_api_key,
          'Content-Type': 'application/json'
        }
      })

      if (response.status === 200) {
        const workflowData = await response.json()
        
        // Structure the workflow data for our database
        const workflow = {
          id: workflowData.id,
          name: workflowData.name,
          active: workflowData.active || false,
          nodes: workflowData.nodes || [],
          connections: workflowData.connections || {},
          settings: workflowData.settings || {},
          staticData: workflowData.staticData || null,
          tags: workflowData.tags || [],
          createdAt: workflowData.createdAt,
          updatedAt: workflowData.updatedAt
        }

        return new Response(
          JSON.stringify({
            success: true,
            workflow,
            message: `Workflow "${workflow.name}" imported successfully`
          } as ImportResponse),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
      } else if (response.status === 401) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Invalid API key',
            error: 'INVALID_API_KEY'
          } as ImportResponse),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
      } else if (response.status === 404) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Workflow not found',
            error: 'WORKFLOW_NOT_FOUND'
          } as ImportResponse),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
      } else {
        const errorText = await response.text()
        return new Response(
          JSON.stringify({
            success: false,
            message: `n8n server returned status ${response.status}`,
            error: 'SERVER_ERROR'
          } as ImportResponse),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
      }
    } catch (fetchError) {
      console.error('Error calling n8n API:', fetchError)
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Unable to connect to n8n server. Please check the URL and ensure the server is running.',
          error: 'CONNECTION_ERROR'
        } as ImportResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }
  } catch (error) {
    console.error('Edge Function error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        message: 'An unexpected error occurred',
        error: 'INTERNAL_ERROR'
      } as ImportResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})