import { describe, expect, it } from 'vitest'
import { ease, mola, squash, tremorEm } from '@/components/ativacoes/movimento'

describe('curvas', () => {
  it('ancoram em 0 e 1', () => {
    for (const nome of ['outQuad', 'inCubic', 'outCubic', 'outBack'] as const) {
      expect(ease[nome](0), nome).toBeCloseTo(0, 5)
      expect(ease[nome](1), nome).toBeCloseTo(1, 5)
    }
  })

  it('outBack passa do alvo — é o que dá vida à entrada', () => {
    const maximo = Math.max(...Array.from({ length: 100 }, (_, i) => ease.outBack(i / 99)))
    expect(maximo).toBeGreaterThan(1)
  })

  it('outQuad desacelera: o primeiro terço anda mais que o último', () => {
    expect(ease.outQuad(0.33)).toBeGreaterThan(1 - ease.outQuad(0.67))
  })
})

describe('squash', () => {
  it('preserva volume aparente — o que cresce numa direcao encolhe na outra', () => {
    const m = squash(0.5)
    expect(m.sx).toBeGreaterThan(1)
    expect(m.sy).toBeLessThan(1)
  })

  it('assenta em repouso nas duas pontas', () => {
    for (const t of [0, 1]) {
      expect(squash(t).sx).toBeCloseTo(1, 5)
      expect(squash(t).sy).toBeCloseTo(1, 5)
    }
  })
})

describe('mola', () => {
  it('persegue o alvo e assenta nele', () => {
    let v = 0
    let x = 0
    for (let i = 0; i < 200; i++) {
      const passo = mola(x, v, 100, 1 / 60)
      x = passo.valor
      v = passo.vel
    }
    expect(x).toBeCloseTo(100, 0)
  })
})

describe('tremorEm', () => {
  it('decai a zero e o decaimento independe do fps', () => {
    const umPasso = tremorEm(10, 0.5)
    let dois = 10
    dois = tremorEm(dois, 0.25)
    dois = tremorEm(dois, 0.25)
    expect(dois).toBeCloseTo(umPasso, 6)
  })
})
