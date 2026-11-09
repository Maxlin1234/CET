import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'

const PROXY_PATH = '/event/skyward/unzip.php'
const UNZIP_ORIGIN = 'https://unzip.clab.org.tw/api/v1'

function pathAllowed(path: string): boolean {
  if (path.includes('..') || path.includes('://')) return false
  return (
    path === '/projects/119/works' ||
    /^\/works\/\d+$/.test(path) ||
    /^\/collectives\/\d+$/.test(path) ||
    /^\/contributors\/\d+$/.test(path)
  )
}

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(payload))
}

async function handleUnzipProxy(
  req: IncomingMessage,
  res: ServerResponse,
  apiKey: string,
): Promise<void> {
  if ((req.method ?? 'GET') !== 'GET') {
    sendJson(res, 405, { success: false, error: 'Method not allowed' })
    return
  }

  if (!apiKey) {
    sendJson(res, 500, { success: false, error: 'Proxy is not configured' })
    return
  }

  const url = new URL(req.url ?? '/', 'http://127.0.0.1')
  const path = `/${(url.searchParams.get('path') ?? '').replace(/^\/+/, '')}`
  if (!pathAllowed(path)) {
    sendJson(res, 403, { success: false, error: 'Path is not allowed' })
    return
  }

  const upstream = new URL(`${UNZIP_ORIGIN}${path}`)
  for (const key of ['limit', 'offset'] as const) {
    const value = url.searchParams.get(key)
    if (value == null) continue
    if (!/^\d+$/.test(value)) {
      sendJson(res, 400, { success: false, error: 'Invalid query' })
      return
    }
    upstream.searchParams.set(key, value)
  }

  try {
    const response = await fetch(upstream, {
      headers: {
        Authorization: `Api-Key ${apiKey}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    })
    const body = await response.text()
    res.statusCode = response.status
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.end(body)
  } catch {
    sendJson(res, 502, { success: false, error: 'Proxy request failed' })
  }
}

export function unzipPhpProxyPlugin(apiKey: string): Plugin {
  const key = apiKey.trim()
  const middleware = (
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void,
  ) => {
    const path = req.url?.split('?')[0] ?? ''
    if (path !== PROXY_PATH) {
      next()
      return
    }
    void handleUnzipProxy(req, res, key)
  }

  return {
    name: 'unzip-php-proxy',
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}
