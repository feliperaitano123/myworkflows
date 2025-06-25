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
  limit?: number
  active?: boolean
  tags?: string
}

interface N8nWorkflow {
  id: string
  name: string
  active: boolean
  createdAt: string
  updatedAt: string
  tags?: Array<{ id: string; name: string }>
}

interface Response {
  success: boolean
  workflows: N8nWorkflow[]
  nextCursor?: string
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
    const { n8n_url, n8n_api_key, limit = 100, active, tags }: RequestBody = await req.json()

    // Validate inputs
    if (!n8n_url || !n8n_api_key) {
      return new Response(
        JSON.stringify({
          success: false,
          workflows: [],
          message: 'Missing required fields: n8n_url and n8n_api_key',
          error: 'MISSING_FIELDS'
        } as Response),
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
          workflows: [],
          message: 'Invalid URL format',
          error: 'INVALID_URL'
        } as Response),
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
    if (limit) params.append('limit', limit.toString())
    if (active !== undefined) params.append('active', active.toString())
    if (tags) params.append('tags', tags)
    params.append('excludePinnedData', 'true') // Exclude pinned data for performance

    // Call n8n workflows endpoint
    const workflowsUrl = `${baseUrl}/api/v1/workflows?${params.toString()}`
    
    try {
      const response = await fetch(workflowsUrl, {
        method: 'GET',
        headers: {
          'X-N8N-API-KEY': n8n_api_key,
          'Content-Type': 'application/json'
        }
      })

      if (response.status === 200) {
        const data = await response.json()
        
        // Extract workflows from n8n response
        const workflows: N8nWorkflow[] = data.data?.map((workflow: any) => ({
          id: workflow.id,
          name: workflow.name,
          active: workflow.active || false,
          createdAt: workflow.createdAt,
          updatedAt: workflow.updatedAt,
          tags: workflow.tags || []
        })) || []

        return new Response(
          JSON.stringify({
            success: true,
            workflows,
            nextCursor: data.nextCursor || undefined,
            message: `Found ${workflows.length} workflows`
          } as Response),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
      } else if (response.status === 401) {
        return new Response(
          JSON.stringify({
            success: false,
            workflows: [],
            message: 'Invalid API key',
            error: 'INVALID_API_KEY'
          } as Response),
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
            workflows: [],
            message: `n8n server returned status ${response.status}`,
            error: 'SERVER_ERROR'
          } as Response),
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
          workflows: [],
          message: 'Unable to connect to n8n server. Please check the URL and ensure the server is running.',
          error: 'CONNECTION_ERROR'
        } as Response),
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
        workflows: [],
        message: 'An unexpected error occurred',
        error: 'INTERNAL_ERROR'
      } as Response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})