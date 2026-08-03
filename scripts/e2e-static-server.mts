import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize, sep } from 'node:path'

// Servidor estático mínimo só para o Playwright local. Existe porque nenhum
// servidor de terceiros testado (o pacote `serve`) resolveu de forma
// confiável o `basePath` do GitHub Pages: o rewrite de `serve.json`
// (`/portfolio/:path*` -> `/:path*`) usa path-to-regexp por baixo e não
// interpreta o modificador `*` de forma previsível, servindo sempre a
// mesma rota errada independente do caminho pedido. Este servidor resolve
// só isso — aceitar o caminho com ou sem o prefixo do basePath — e nada
// além disso: uma rota sem a barra final (o que `trailingSlash: true`
// existe para nunca acontecer) devolve 404, do mesmo jeito que o GitHub
// Pages devolveria, em vez de cair de volta para `index.html`. Um servidor
// mais tolerante que o Pages real esconderia um link quebrado atrás de um
// E2E verde.
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

  // Só a barra final vira índice de diretório — igual ao GitHub Pages, que
  // não corrige uma rota sem a barra que `trailingSlash: true` deveria ter
  // garantido. Um caminho sem barra é tratado só como arquivo exato: sem
  // fallback para `index.html`, sem fallback para `.html`. Servir mais do
  // que isso esconderia, atrás de um E2E verde, um link publicado sem a
  // barra final.
  const attempt = requestPath.endsWith('/') ? join(candidate, 'index.html') : candidate

  const data = await readIfExists(attempt)
  if (data) {
    res.writeHead(200, { 'Content-Type': MIME[extname(attempt)] ?? 'application/octet-stream' })
    res.end(data)
    return
  }

  const notFound = await readIfExists(join(ROOT, '404.html'))
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(notFound ?? 'not found')
})

server.listen(PORT, () => {
  console.log(`e2e static server -> http://localhost:${PORT}${BASE_PATH}/`)
})
