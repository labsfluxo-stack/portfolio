import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { globSync } from 'node:fs'

/**
 * Todo arquivo .svg AUTÔNOMO do projeto — os que o navegador busca como
 * documento próprio, não os que vivem embutidos em JSX — precisa ser XML
 * válido.
 *
 * Esta trava existe porque a classe de bug que ela cobre falha em absoluto
 * silêncio. Um SVG malformado não quebra o `next build`, não quebra o
 * typecheck, não quebra o portão de HTML e não aparece no console: o
 * navegador simplesmente descarta o arquivo e mantém o ícone antigo, ou
 * nenhum. Foi exatamente o que aconteceu com `app/icon.svg` — os
 * comentários citavam tokens CSS pelo nome completo, e o prefixo de duas
 * hifens é proibido dentro de comentário XML. O favicon novo esteve dois
 * commits inteiros no repositório sem nunca ter renderizado.
 *
 * E não adianta conferir embutindo o desenho num HTML para olhar: o parser
 * de HTML é tolerante e engole o erro. Só o parser XML pega, que é o que o
 * `DOMParser` com `image/svg+xml` usa aqui — o mesmo caminho do navegador
 * ao buscar o favicon.
 */
const SVGS = globSync('{app,public}/**/*.svg', { cwd: process.cwd() })

describe('assets .svg autônomos', () => {
  it('existe pelo menos um para validar (o glob não pode silenciosamente não achar nada)', () => {
    expect(SVGS.length, 'nenhum .svg encontrado — o glob quebrou e o teste virou decoração').toBeGreaterThan(0)
    expect(SVGS).toContain(join('app', 'icon.svg'))
  })

  for (const relative of SVGS) {
    it(`${relative} é XML válido e tem <svg> na raiz`, () => {
      const source = readFileSync(join(process.cwd(), relative), 'utf8')
      const doc = new DOMParser().parseFromString(source, 'image/svg+xml')

      const error = doc.querySelector('parsererror')
      expect(error, `XML inválido em ${relative}: ${error?.textContent ?? ''}`).toBeNull()
      expect(doc.documentElement.tagName.toLowerCase()).toBe('svg')
    })

    // Redundante com o parse acima para o caso das duas hifens, mas dá a
    // mensagem que resolve o problema em vez de um erro de parser genérico
    // apontando linha e coluna.
    it(`${relative} não tem duas hifens seguidas dentro de comentário`, () => {
      const source = readFileSync(join(process.cwd(), relative), 'utf8')
      for (const comment of source.match(/<!--[\s\S]*?-->/g) ?? []) {
        const body = comment.slice(4, -3)
        expect(
          body.includes('--'),
          `comentário em ${relative} contém "--", proibido em XML — o navegador descarta o arquivo inteiro. ` +
            `Cite tokens CSS sem o prefixo (ex.: "color-muted", não o nome completo).`,
        ).toBe(false)
      }
    })
  }
})
