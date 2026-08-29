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
  it('estica numa direcao e encolhe na outra, com area quase constante', () => {
    // Varrer t de 0 a 1 em passos de 0,01 e verificar que sx*sy fica entre 0,95 e 1,05
    for (let t = 0; t <= 1; t += 0.01) {
      const m = squash(t)
      const area = m.sx * m.sy
      // Permite até ±5% de ganho/perda de área, que é visualmente imperceptível
      expect(area).toBeGreaterThanOrEqual(0.95)
      expect(area).toBeLessThanOrEqual(1.05)
    }
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
  it('o decaimento independe do fps', () => {
    // Dois caminhos diferentes devem chegar ao mesmo resultado: a taxa de decaimento é fps-invariante
    const umPasso = tremorEm(10, 0.5)
    let dois = 10
    dois = tremorEm(dois, 0.25)
    dois = tremorEm(dois, 0.25)
    expect(dois).toBeCloseTo(umPasso, 6)
  })

  it('decai a zero quando cai abaixo do piso', () => {
    // Começar com força muito pequena, ou fazer tantos passos que caia abaixo de 0,01
    let forca = 0.05
    forca = tremorEm(forca, 0.1)
    forca = tremorEm(forca, 0.1)
    forca = tremorEm(forca, 0.1)
    // Deve ser exatamente 0, não um número pequeno
    expect(forca).toBe(0)
  })
})
