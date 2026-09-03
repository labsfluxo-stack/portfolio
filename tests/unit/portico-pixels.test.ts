import { describe, expect, it } from 'vitest'
import { MAPAS, gerarMapas, type NomeDeMapa } from '../../components/three/portico-pixels'

/**
 * A trava do pixel.
 *
 * Os cinco mapas saíram de `portico-textures.ts` para cá justamente porque
 * precisavam rodar num Worker (ver `portico-texturas.worker.ts`). Mudança de
 * arquivo não pode virar mudança de imagem, e "a cena continua parecida" não é
 * verificação — a chapa do contêiner tem relevo, desgaste e ferrugem que
 * ninguém consegue conferir a olho num diff.
 *
 * As somas abaixo foram tiradas do código ANTES da mudança de arquivo, com as
 * texturas assadas em PNG e comparadas byte a byte (`scripts/assar-texturas.mts`).
 * Elas passaram idênticas. Se alguma quebrar aqui, o pixel mudou — e ou a
 * mudança é intencional (então o número novo entra junto com o motivo) ou é o
 * defeito que este teste existe para pegar.
 */
const SOMAS: Record<NomeDeMapa, number> = {
  corrugationNormal: 1278996011,
  skinWear: 910490938,
  grime: 1257221274,
  steelWear: 906111807,
  rustStreak: 3673207356,
}

/** FNV-1a sobre os bytes. Barato, e sensível a um texel só. */
function soma(dados: Uint8ClampedArray): number {
  let h = 2166136261
  for (let i = 0; i < dados.length; i++) {
    h ^= dados[i] as number
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

describe('portico-pixels', () => {
  const mapas = gerarMapas()

  it('gera os cinco mapas que o worker promete', () => {
    expect(Object.keys(mapas).sort()).toEqual([...MAPAS].sort())
  })

  it.each(MAPAS)('mantém o pixel de %s', (nome) => {
    expect(soma(mapas[nome].data)).toBe(SOMAS[nome])
  })

  /**
   * O worker e a thread principal chamam a MESMA função, e o caminho de
   * emergência de `pedirMapas` depende disso: sem determinismo, quem cai no
   * fallback veria uma cena diferente da de quem tem Worker.
   */
  it('é determinístico entre chamadas', () => {
    const outra = gerarMapas()
    for (const nome of MAPAS) {
      expect(soma(outra[nome].data)).toBe(soma(mapas[nome].data))
    }
  })
})
