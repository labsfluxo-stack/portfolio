import { describe, expect, it } from 'vitest'
import {
  CAPACIDADES_INICIAIS,
  DEGRAU_DA_PERSPECTIVA,
  capacidadesDo,
  temPerspectiva,
} from '@/components/predio/predio-qualidade'
import { TIERS } from '@/components/three/portico-quality'
import { ANDARES } from '@/components/predio/predio-programa'

/**
 * "Celular é requisito, não desejo" (spec). A tradução disso em código é uma
 * só: a perspectiva real NUNCA é o estado inicial. Ela sobe quando o quadro
 * prova folga, e num aparelho que não sustenta ninguém vê tela quebrada — vê
 * parallax, que já é bonito sozinho.
 */
describe('qualidade do prédio', () => {
  it('a perspectiva não existe no estado inicial', () => {
    expect(CAPACIDADES_INICIAIS.perspectiva).toBe(false)
  })

  it('a perspectiva só aparece no degrau mais alto', () => {
    expect(DEGRAU_DA_PERSPECTIVA).toBe(0)
    expect(capacidadesDo(0).perspectiva).toBe(true)
    for (let d = 1; d < TIERS.length; d++) {
      expect(capacidadesDo(d).perspectiva).toBe(false)
    }
  })

  it('degrau fora da escada não liga nada', () => {
    expect(capacidadesDo(-1).perspectiva).toBe(false)
    expect(capacidadesDo(TIERS.length + 5).perspectiva).toBe(false)
  })

  it('só as duas pontas ganham perspectiva, e só com folga', () => {
    const cheio = { perspectiva: true }
    expect(temPerspectiva(0, cheio)).toBe(true)
    expect(temPerspectiva(ANDARES.length - 1, cheio)).toBe(true)
    for (let i = 1; i < ANDARES.length - 1; i++) {
      expect(temPerspectiva(i, cheio)).toBe(false)
    }
  })

  it('sem folga, nem as pontas ganham', () => {
    expect(temPerspectiva(0, CAPACIDADES_INICIAIS)).toBe(false)
  })
})
