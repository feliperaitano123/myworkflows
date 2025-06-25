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
}

interface Response {
  valid: boolean
  message: string
  error?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Parse request body
    const { n8n_url, n8n_api_key }: RequestBody = await req.json()

    // Validate inputs
    if (!n8n_url || !n8n_api_key) {
      return new Response(
        JSON.stringify({
          valid: false,
          message: 'Missing required fields: n8n_url and n8n_api_key',
          error: 'MISSING_FIELDS'
        } as Response),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    // Validate API key format - ensure it's a valid string
    if (typeof n8n_api_key !== 'string' || n8n_api_key.trim().length === 0) {
      return new Response(
        JSON.stringify({
          valid: false,
          message: 'Invalid API key format',
          error: 'INVALID_API_KEY_FORMAT'
        } as Response),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    // Sanitize API key - remove any potential non-ASCII characters
    const sanitizedApiKey = n8n_api_key.trim().replace(/[^\x20-\x7E]/g, '')

    // Validate URL format
    try {
      new URL(n8n_url)
    } catch {
      return new Response(
        JSON.stringify({
          valid: false,
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

    // Call n8n audit endpoint to validate connection
    const auditUrl = `${baseUrl}/api/v1/audit`
    
    try {
      const response = await fetch(auditUrl, {
        method: 'POST',
        headers: {
          'X-N8N-API-KEY': sanitizedApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      })

      if (response.status === 200) {
        return new Response(
          JSON.stringify({
            valid: true,
            message: 'Connection validated successfully'
          } as Response),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
      } else if (response.status === 401) {
        return new Response(
          JSON.stringify({
            valid: false,
            message: 'Invalid API key',
            error: 'INVALID_API_KEY'
          } as Response),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
      } else {
        return new Response(
          JSON.stringify({
            valid: false,
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
          valid: false,
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
        valid: false,
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