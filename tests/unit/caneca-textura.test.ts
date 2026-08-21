import { describe, expect, it } from 'vitest'
import { ajustarFonteAoEspaco, type Medidor } from '@/components/three/caneca-textura'

/**
 * `ajustarFonteAoEspaco` é a única conta genuinamente pura da caneca do
 * brinde — o resto do arquivo (`criarTexturaCaneca`) desenha em canvas, e
 * `tests/setup.ts` trava `getContext` em `null` para a suíte inteira, então
 * nada que dependa de canvas de verdade é observável aqui (mesma lacuna que
 * `ativacoes-capa.test.tsx` já documenta para o jogo).
 *
 * O medidor é uma FUNÇÃO INJETADA, não `ctx.measureText`: é o que torna esta
 * fronteira testável sem canvas nenhum. Um medidor simples e determinístico
 * (largura = tamanho da fonte × número de caracteres × um fator fixo) é
 * suficiente para exercitar o laço de encolhimento — o teste não precisa de
 * medição tipográfica real, só de uma função monótona em `tamanho`.
 */
const medidorSimples: Medidor = (fonte, texto) => {
  const tamanho = Number(fonte.match(/(\d+)px/)?.[1] ?? 0)
  return tamanho * texto.length * 0.6
}

describe('ajustarFonteAoEspaco', () => {
  it('devolve o tamanho máximo quando o texto já cabe nele', () => {
    const tamanho = ajustarFonteAoEspaco({
      texto: 'Oi',
      larguraDisponivel: 1000,
      tamanhoMax: 80,
      tamanhoMin: 20,
      familia: 'sans-serif',
      medir: medidorSimples,
    })
    expect(tamanho).toBe(80)
  })

  it('encolhe até caber quando o nome é comprido', () => {
    const tamanho = ajustarFonteAoEspaco({
      texto: 'Uma Marca Bem Comprida',
      larguraDisponivel: 300,
      tamanhoMax: 80,
      tamanhoMin: 20,
      familia: 'sans-serif',
      medir: medidorSimples,
    })
    expect(tamanho).toBeLessThan(80)
    // A largura no tamanho devolvido precisa caber (ou o laço não parou no
    // lugar certo); um passo a mais (2px) já não deveria caber mais.
    expect(medidorSimples(`700 ${tamanho}px sans-serif`, 'Uma Marca Bem Comprida')).toBeLessThanOrEqual(300)
  })

  it('nunca encolhe abaixo do piso, mesmo que o texto não caiba de jeito nenhum', () => {
    const tamanho = ajustarFonteAoEspaco({
      texto: 'Um Nome de Marca Extremamente Longo Para Qualquer Faixa',
      larguraDisponivel: 50,
      tamanhoMax: 80,
      tamanhoMin: 20,
      familia: 'sans-serif',
      medir: medidorSimples,
    })
    expect(tamanho).toBe(20)
  })

  it('o passo é de 2px, o mesmo de drawStencil em portico-textures.ts', () => {
    // Um texto que cabe em 42 mas não em 44: o resultado tem que cair
    // exatamente em 42, não arredondar para outro múltiplo de passo.
    const medir: Medidor = (fonte) => {
      const tamanho = Number(fonte.match(/(\d+)px/)?.[1] ?? 0)
      return tamanho > 42 ? 1000 : 10
    }
    const tamanho = ajustarFonteAoEspaco({
      texto: 'Marca',
      larguraDisponivel: 500,
      tamanhoMax: 80,
      tamanhoMin: 20,
      familia: 'sans-serif',
      medir,
    })
    expect(tamanho).toBe(42)
    expect((80 - tamanho) % 2).toBe(0)
  })
})
