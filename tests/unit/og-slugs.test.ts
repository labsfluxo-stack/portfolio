import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { OG_SLUGS } from '@/content/og'
import { SYSTEM_SLUGS } from '@/content/types'

/**
 * A rota de OG e o script que fotografa os cards importavam do MESMO
 * conceito por caminhos diferentes: a rota derivava de SYSTEM_SLUGS, o
 * script mantinha a própria lista escrita à mão. Coincidiam por sorte.
 *
 * A lista mora em content/og.ts, não em app/[locale]/og/[slug]/page.tsx: o
 * script roda com `node --experimental-strip-types`, que não sabe carregar
 * `.tsx` (ERR_UNKNOWN_FILE_EXTENSION), então um import direto da rota nunca
 * funcionaria. Um módulo `.ts` neutro é o que permite aos dois lados
 * importarem a MESMA lista.
 *
 * No dia em que divergissem, a rota geraria a página, o script não tiraria a
 * foto, a metadata apontaria para um PNG inexistente — e a suíte ficaria
 * verde, porque ninguém comparava as duas listas.
 */
describe('lista de slugs de OG', () => {
  it('o script não mantém uma segunda cópia da lista', () => {
    const script = readFileSync(join(process.cwd(), 'scripts', 'generate-og.mts'), 'utf8')
    expect(
      script,
      'generate-og.mts voltou a escrever a lista à mão em vez de importá-la',
    ).not.toMatch(/const SLUGS\s*=\s*\[\s*'/)
  })

  it('inclui a home, os sistemas e as duas landings', () => {
    expect(OG_SLUGS).toContain('home')
    expect(OG_SLUGS).toContain('projetos')
    expect(OG_SLUGS).toContain('ativacoes')
  })

  // Achado C-e da revisão final de branch: nenhum teste afirmava que
  // `OG_SLUGS` continua ESPALHANDO `...SYSTEM_SLUGS`, em vez de repetir os
  // três nomes à mão -- achatar a lista reintroduziria a mesma deriva que
  // este arquivo existe para matar, sem quebrar nada aqui.
  it('espalha SYSTEM_SLUGS em vez de repetir os slugs à mão', () => {
    expect(OG_SLUGS).toEqual(['home', 'projetos', 'ativacoes', ...SYSTEM_SLUGS])
  })
})
