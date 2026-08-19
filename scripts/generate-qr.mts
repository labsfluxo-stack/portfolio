import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import QRCode from 'qrcode'
import { locales } from '../content/types.ts'

/**
 * O QR da capa, como SVG estático gerado no build.
 *
 * Gerado e não escrito à mão porque o conteúdo é a URL canônica da própria
 * rota, e ela depende de `NEXT_PUBLIC_BASE_PATH` — um SVG commitado ficaria
 * apontando para o endereço antigo no dia em que o site sair do GitHub Pages
 * para domínio próprio, e ninguém perceberia: QR quebrado não dá erro, dá
 * página em branco no celular de outra pessoa.
 *
 * Roda no build, não no cliente: zero JavaScript de QR chega ao navegador.
 */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '/portfolio'
const SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://labsfluxo-stack.github.io'
const DESTINO = join(process.cwd(), 'public', 'ativacoes')

mkdirSync(DESTINO, { recursive: true })

for (const locale of locales) {
  const url = `${SITE_ORIGIN}${BASE_PATH}/${locale}/ativacoes/`
  const svg = await QRCode.toString(url, {
    type: 'svg',
    margin: 0,
    // Sobre o preto da rota: módulos claros, fundo transparente.
    color: { dark: '#F5F3EF', light: '#0000' },
  })
  writeFileSync(join(DESTINO, `qr-${locale}.svg`), svg, 'utf8')
  console.log(`qr: ${locale} -> ${url}`)
}
