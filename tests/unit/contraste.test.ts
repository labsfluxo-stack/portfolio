import { describe, expect, it } from 'vitest'
import { contraste } from '@/lib/contraste'

/**
 * A landing inverte a polaridade do portfólio, e os tokens do fundo escuro NÃO
 * sobrevivem à inversão: `--color-data` dá 1,93:1 sobre `#F5F3EF`. Este teste
 * existe para que trocar um hex sem conferir o contraste quebre a suíte, em vez
 * de quebrar a leitura de quem abre a página no celular sob sol.
 *
 * Mínimos da WCAG 2.1: 4.5:1 para texto normal (AA), 3:1 para texto grande e
 * para componente de interface não textual.
 */

const PAPEL = '#F5F3EF'
const ESCURO = '#08090C'

describe('contraste', () => {
  // Âncoras conhecidas: preto no branco dá 21:1, e uma cor contra ela mesma dá 1:1.
  // Sem elas, um erro de sinal na fórmula passaria despercebido.
  it('calcula os extremos corretamente', () => {
    expect(contraste('#000000', '#FFFFFF')).toBeCloseTo(21, 1)
    expect(contraste('#123456', '#123456')).toBeCloseTo(1, 5)
  })

  it('a ordem dos argumentos não muda o resultado', () => {
    expect(contraste(PAPEL, ESCURO)).toBeCloseTo(contraste(ESCURO, PAPEL), 5)
  })

  describe('tokens da polaridade clara', () => {
    it.each([
      ['tinta', '#08090C', 4.5],
      ['texto secundário', '#4A505A', 4.5],
      ['acento', '#0369A1', 4.5],
    ])('%s passa AA sobre o papel', (_nome, hex, minimo) => {
      expect(contraste(hex, PAPEL)).toBeGreaterThanOrEqual(minimo)
    })
  })

  describe('tokens da faixa escura', () => {
    it.each([
      ['texto', '#F5F3EF', 4.5],
      ['data (ciano)', '#38BDF8', 4.5],
    ])('%s passa AA sobre a faixa', (_nome, hex, minimo) => {
      expect(contraste(hex, ESCURO)).toBeGreaterThanOrEqual(minimo)
    })
  })

  // Estes três são a razão de o conjunto claro existir. Se algum dia passarem,
  // alguém mexeu num hex e o teste acima deixou de proteger o que protegia.
  describe('o que NÃO pode ser usado em texto sobre o papel', () => {
    it.each([
      ['data (ciano)', '#38BDF8'],
      ['muted do tema escuro', '#878C96'],
      ['verde do WhatsApp', '#25D366'],
    ])('%s reprova AA e por isso não vira token claro', (_nome, hex) => {
      expect(contraste(hex, PAPEL)).toBeLessThan(4.5)
    })
  })
})
