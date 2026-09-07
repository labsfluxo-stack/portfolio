import { describe, expect, it } from 'vitest'
import {
  ALTURA_ANDAR,
  LAJE,
  PE_DIREITO,
  PILARES,
  PLANOS,
  SOL,
  alturaTotal,
  centroDoAndar,
  topoDoAndar,
} from '@/components/predio/predio-arquitetura'
import { ANDARES } from '@/components/predio/predio-programa'

describe('arquitetura do prédio', () => {
  it('o andar é o pé-direito mais a laje', () => {
    expect(ALTURA_ANDAR).toBeCloseTo(PE_DIREITO + LAJE, 5)
  })

  it('a altura total cobre os sete andares', () => {
    expect(alturaTotal()).toBeCloseTo(ALTURA_ANDAR * ANDARES.length, 5)
  })

  it('o topo do andar zero é o topo do prédio, e desce dali', () => {
    expect(topoDoAndar(0)).toBeCloseTo(0, 5)
    expect(topoDoAndar(1)).toBeCloseTo(-ALTURA_ANDAR, 5)
    expect(topoDoAndar(6)).toBeCloseTo(-ALTURA_ANDAR * 6, 5)
  })

  it('o centro fica meio pé-direito abaixo do topo do andar', () => {
    expect(centroDoAndar(0)).toBeCloseTo(-PE_DIREITO / 2, 5)
  })

  /**
   * Os três planos são o que faz a profundidade existir sem custo de geometria.
   * O de trás precisa andar MENOS que o da frente — é essa diferença, e só ela,
   * que o cérebro lê como distância. Fatores iguais seriam três cópias do mesmo
   * plano com passos extras de desenho.
   */
  it('os planos vão do fundo para a frente, com parallax crescente', () => {
    expect(PLANOS).toHaveLength(3)
    const fatores = PLANOS.map((p) => p.parallax)
    expect(fatores).toEqual([...fatores].sort((a, b) => a - b))
    expect(PLANOS[2]!.parallax).toBe(1)
    expect(PLANOS[0]!.parallax).toBeGreaterThan(0)
  })

  it('o plano da frente é o z zero — é nele que o objeto clicável mora', () => {
    expect(PLANOS[2]!.z).toBe(0)
    expect(PLANOS[0]!.z).toBeLessThan(PLANOS[1]!.z)
  })

  /**
   * Sol BAIXO. Elevação alta anula a sombra lateral, e sem sombra lateral os
   * três planos colapsam num só: some exatamente a profundidade que eles
   * existem para criar. Ver a spec, "por que a hora dourada".
   */
  it('o sol é rasante', () => {
    expect(SOL.elevacao).toBeGreaterThan(0)
    expect(SOL.elevacao).toBeLessThan(18)
  })

  it('há pilar no centro e um de cada lado', () => {
    expect(PILARES).toContain(0)
    expect(PILARES.some((x) => x < 0)).toBe(true)
    expect(PILARES.some((x) => x > 0)).toBe(true)
  })
})
