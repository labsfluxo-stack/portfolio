import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// Escapa para contexto HTML (atributo e texto). `target` vem de env de
// build, então o risco real é baixo — mas as duas interpolações em HTML
// devem ter o mesmo rigor que a interpolação em JS logo abaixo, que já usa
// `JSON.stringify`. Inconsistência de escape é o tipo de coisa que alguém
// copia sem perceber depois.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '/portfolio'
const target = `${basePath}/pt/`
const targetHtml = escapeHtml(target)
const out = join(process.cwd(), 'out')

mkdirSync(out, { recursive: true })
writeFileSync(
  join(out, 'index.html'),
  `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Neto Alves — Arquiteto de Sistemas</title>
<link rel="canonical" href="${targetHtml}">
<meta http-equiv="refresh" content="0; url=${targetHtml}">
<script>location.replace(${JSON.stringify(target)})</script>
</head>
<body><p>Redirecionando para <a href="${targetHtml}">${targetHtml}</a></p></body>
</html>
`,
  'utf8',
)
console.log(`root redirect -> ${target}`)
