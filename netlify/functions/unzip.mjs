/**
 * Unzip API 代理：把 API Key 留在 Netlify 環境變數，避免前端裸奔。
 * 前端呼叫：/.netlify/functions/unzip?path=/projects/119/works&limit=100&offset=0
 */
const UPSTREAM = 'https://unzip.clab.org.tw/api/v1'

const ALLOWED_PATHS = [
  /^\/projects\/\d+\/works$/,
  /^\/works\/\d+$/,
  /^\/collectives\/\d+$/,
  /^\/contributors\/\d+$/,
]

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  }
}

function isAllowedPath(path) {
  return ALLOWED_PATHS.some((re) => re.test(path))
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders() }
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  const apiKey = String(process.env.UNZIP_API_KEY || process.env.VITE_UNZIP_API_KEY || '').trim()
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      body: JSON.stringify({
        error: 'Missing UNZIP_API_KEY (or VITE_UNZIP_API_KEY) in Netlify environment variables',
      }),
    }
  }

  const params = event.queryStringParameters || {}
  const path = String(params.path || '').trim()
  if (!path.startsWith('/') || path.includes('..') || !isAllowedPath(path)) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      body: JSON.stringify({ error: 'Invalid path' }),
    }
  }

  const upstreamUrl = new URL(`${UPSTREAM}${path}`)
  for (const [key, value] of Object.entries(params)) {
    if (key === 'path' || value == null) continue
    upstreamUrl.searchParams.set(key, String(value))
  }

  try {
    const res = await fetch(upstreamUrl.toString(), {
      headers: {
        Authorization: `Api-Key ${apiKey}`,
        Accept: 'application/json',
      },
    })
    const body = await res.text()
    return {
      statusCode: res.status,
      headers: {
        'Content-Type': res.headers.get('content-type') || 'application/json',
        ...corsHeaders(),
      },
      body,
    }
  } catch (error) {
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      body: JSON.stringify({
        error: 'Upstream request failed',
        detail: error instanceof Error ? error.message : String(error),
      }),
    }
  }
}
