import { describe, expect, it } from 'vitest'
import { ALTURA_DE_LINHA_PADRAO, pixelsDaRoda } from '@/components/predio/predio-rolagem'

/**
 * A roda do mouse não fala em pixels em todo navegador — e ignorar isso é o
 * mesmo erro de medida que já custou duas rodadas nesta tarefa, só que vestido
 * de outro jeito.
 *
 * `WheelEvent.deltaMode` diz em que UNIDADE `deltaY` está:
 *   0 = pixel  (Chrome, Safari: uma catraca ≈ 100)
 *   1 = linha  (Firefox: uma catraca ≈ 3)
 *   2 = página (raro, mas existe: uma catraca = 1 tela)
 *
 * O repasse de rolagem sobre as âncoras entregava `deltaY` cru para o
 * `scrollBy`. No Firefox isso rola TRÊS PIXELS onde deveria rolar ~100 — a
 * descida congela com o cursor sobre uma âncora, que é exatamente o caso que o
 * repasse existe para resolver. O defeito é invisível no Chromium, que é onde
 * toda a suíte de navegador roda.
 */
describe('pixels de um evento de roda', () => {
  const caixa = { alturaDaLinha: 33, alturaDaPagina: 800 }

  it('modo pixel passa direto, inclusive para cima', () => {
    expect(pixelsDaRoda({ deltaY: 100, deltaMode: 0 }, caixa)).toBe(100)
    expect(pixelsDaRoda({ deltaY: -100, deltaMode: 0 }, caixa)).toBe(-100)
    expect(pixelsDaRoda({ deltaY: 0, deltaMode: 0 }, caixa)).toBe(0)
  })

  /** A catraca do Firefox: `deltaY` 3 em modo linha tem de virar ~100 px, não 3. */
  it('modo linha vira pixel pela altura da linha', () => {
    expect(pixelsDaRoda({ deltaY: 3, deltaMode: 1 }, caixa)).toBe(99)
    expect(pixelsDaRoda({ deltaY: -3, deltaMode: 1 }, caixa)).toBe(-99)
  })

  it('modo página vira uma tela inteira', () => {
    expect(pixelsDaRoda({ deltaY: 1, deltaMode: 2 }, caixa)).toBe(800)
    expect(pixelsDaRoda({ deltaY: -2, deltaMode: 2 }, caixa)).toBe(-1600)
  })

  /**
   * `line-height: normal` faz `parseFloat` devolver `NaN`, e um `NaN` chegando
   * no `scrollBy` não rola nada — o mesmo congelamento, por outra porta. O
   * padrão precisa ser um número defensável, nunca ausência.
   */
  it('altura de linha ausente cai num padrão, nunca em NaN', () => {
    const semLinha = { alturaDaLinha: Number.NaN, alturaDaPagina: 800 }
    const r = pixelsDaRoda({ deltaY: 3, deltaMode: 1 }, semLinha)
    expect(Number.isFinite(r)).toBe(true)
    expect(r).toBe(3 * ALTURA_DE_LINHA_PADRAO)
    expect(ALTURA_DE_LINHA_PADRAO).toBeGreaterThan(0)
  })

  it('altura de página ausente também', () => {
    const semPagina = { alturaDaLinha: 33, alturaDaPagina: 0 }
    expect(Number.isFinite(pixelsDaRoda({ deltaY: 1, deltaMode: 2 }, semPagina))).toBe(true)
  })

  /** Modo desconhecido não pode derrubar a rolagem: trata como pixel. */
  it('modo desconhecido degrada para pixel em vez de quebrar', () => {
    expect(pixelsDaRoda({ deltaY: 42, deltaMode: 9 }, caixa)).toBe(42)
  })

  /**
   * A prova que amarra tudo: uma catraca de verdade, em qualquer um dos três
   * modos, tem de resultar em movimento de ordem comparável — nunca em três
   * pixels. É esta a afirmação que o defeito violava.
   */
  it('uma catraca é uma catraca, em qualquer modo', () => {
    const catracaPixel = pixelsDaRoda({ deltaY: 100, deltaMode: 0 }, caixa)
    const catracaLinha = pixelsDaRoda({ deltaY: 3, deltaMode: 1 }, caixa)
    expect(catracaLinha).toBeGreaterThan(catracaPixel * 0.5)
    expect(catracaLinha).toBeLessThan(catracaPixel * 2)
  })
})
