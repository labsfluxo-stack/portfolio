import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '/portfolio'
const target = `${basePath}/pt/`
const out = join(process.cwd(), 'out')

mkdirSync(out, { recursive: true })
writeFileSync(
  join(out, 'index.html'),
  `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Neto Alves — Arquiteto de Sistemas</title>
<link rel="canonical" href="${target}">
<meta http-equiv="refresh" content="0; url=${target}">
<script>location.replace(${JSON.stringify(target)})</script>
</head>
<body><p>Redirecionando para <a href="${target}">${target}</a></p></body>
</html>
`,
  'utf8',
)
console.log(`root redirect -> ${target}`)
