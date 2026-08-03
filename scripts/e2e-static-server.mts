import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize, sep } from 'node:path'

// Servidor estático mínimo só para o Playwright local. Existe porque nenhum
// servidor de terceiros testado (o pacote `serve`) resolveu de forma
// confiável o `basePath` do GitHub Pages: o rewrite de `serve.json`
// (`/portfolio/:path*` -> `/:path*`) usa path-to-regexp por baixo e não
// interpreta o modificador `*` de forma previsível, servindo sempre a
// mesma rota errada independente do caminho pedido. Este servidor faz a
// única coisa que precisa fazer: aceitar o caminho com ou sem o prefixo do
// basePath e servir o arquivo de `out/` correspondente — reproduzindo
// localmente o que o GitHub Pages faz de verdade (a URL pública inclui
// `/portfolio`, mas o artefato publicado não tem essa pasta).
const ROOT = join(process.cwd(), 'out')
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '/portfolio'
const PORT = Number(process.env.PORT ?? 4173)

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
}

function stripBasePath(pathname: string): string {
  if (BASE_PATH && pathname === BASE_PATH) return '/'
  if (BASE_PATH && pathname.startsWith(`${BASE_PATH}/`)) {
    return pathname.slice(BASE_PATH.length) || '/'
  }
  return pathname
}

async function readIfExists(path: string): Promise<Buffer | null> {
  try {
    return await readFile(path)
  } catch {
    return null
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)
  const requestPath = stripBasePath(decodeURIComponent(url.pathname))

  const candidate = normalize(join(ROOT, requestPath))
  if (!candidate.startsWith(normalize(ROOT) + sep) && candidate !== normalize(ROOT)) {
    res.writeHead(400)
    res.end('bad request')
    return
  }

  const attempts = requestPath.endsWith('/')
    ? [join(candidate, 'index.html')]
    : [candidate, join(candidate, 'index.html'), `${candidate}.html`]

  for (const attempt of attempts) {
    const data = await readIfExists(attempt)
    if (data) {
      res.writeHead(200, { 'Content-Type': MIME[extname(attempt)] ?? 'application/octet-stream' })
      res.end(data)
      return
    }
  }

  const notFound = await readIfExists(join(ROOT, '404.html'))
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(notFound ?? 'not found')
})

server.listen(PORT, () => {
  console.log(`e2e static server -> http://localhost:${PORT}${BASE_PATH}/`)
})
