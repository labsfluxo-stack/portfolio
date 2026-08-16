import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * A camada premium da landing é CSS puro — revelação na rolagem, fio de
 * progresso, borda viva. Nada disso é observável em jsdom: não existe
 * viewport, não existe rolagem e `animation-timeline` não é implementado.
 *
 * O que dá para travar é a FONTE, e são justamente os dois modos de falha que
 * nenhum outro teste da suíte alcança. Os dois já aconteceram em produção na
 * internet inteira; nenhum dos dois quebra em desenvolvimento, porque a
 * máquina de quem escreve tem suporte e não pede menos movimento.
 */
const css = readFileSync(resolve(__dirname, '../../app/globals.css'), 'utf8')

/** O corpo de uma at-rule, contando chaves — regex não fecha bloco aninhado. */
function corpoDe(abertura: string): string {
  const i = css.indexOf(abertura)
  if (i === -1) throw new Error(`bloco "${abertura}" sumiu de app/globals.css`)
  let nivel = 0
  for (let j = css.indexOf('{', i); j < css.length; j++) {
    if (css[j] === '{') nivel++
    else if (css[j] === '}' && --nivel === 0) return css.slice(i, j + 1)
  }
  throw new Error(`bloco "${abertura}" não fecha`)
}

describe('camada de movimento da landing', () => {
  /**
   * MODO DE FALHA 1: A PÁGINA EM BRANCO PARA QUEM TEM NAVEGADOR VELHO.
   *
   * `animation-timeline: view()` tem ~84% de suporte em meados de 2026. A
   * forma errada de escrever isto é dar ao elemento um estado inicial oculto
   * (`opacity: 0`) e revelá-lo dentro do `@supports`: nos 16% sem suporte a
   * revelação nunca roda e a página inteira fica invisível — texto no HTML,
   * nada na tela. Some justamente o conteúdo, que é o que a página vende.
   *
   * A forma certa é a inversa: fora do `@supports` não existe declaração
   * nenhuma, e o `both` DENTRO dele é quem pinta o estado inicial. Sem
   * suporte, a página é estática e completa.
   *
   * O teste é literal: nenhuma regra `.revelar*` pode existir fora do
   * `@supports`.
   */
  it('sem suporte a scroll timeline, a página aparece inteira — nunca em branco', () => {
    const suporte = corpoDe('@supports (animation-timeline: view())')
    const foraDoSuporte = css.replace(suporte, '')

    expect(
      foraDoSuporte,
      'existe regra .revelar fora do @supports — nos navegadores sem suporte ' +
        'ela vira estado permanente e apaga o conteúdo da página',
    ).not.toMatch(/^\s*\.revelar[\w-]*\s*(,|\{)/m)

    // E o inverso: o estado inicial tem de estar dentro, via `both`.
    expect(suporte, 'a revelação perdeu o `both` que pinta o estado inicial').toMatch(
      /animation:\s*revelar\s+linear\s+both/,
    )
  })

  /**
   * MODO DE FALHA 2: MOVIMENTO QUE IGNORA `prefers-reduced-motion`.
   *
   * O bloco de movimento reduzido zera `animation-duration`, e para animação
   * por tempo isso basta. Para animação por ROLAGEM não: numa scroll timeline
   * a duração é ignorada — quem define o progresso é a barra de rolagem. Sem
   * devolver a animação à timeline do documento, todo o movimento da página
   * continua rodando exatamente para quem pediu que não rodasse.
   *
   * É uma armadilha silenciosa: o `@media` existe, parece certo, e não faz
   * nada. Vestibular, enxaqueca e transtorno de equilíbrio são a razão pela
   * qual isto é acessibilidade e não preferência estética.
   */
  it('movimento reduzido desliga também as animações de rolagem', () => {
    const reduzido = corpoDe('@media (prefers-reduced-motion: reduce)')
    expect(
      reduzido,
      'falta `animation-timeline: auto !important` — sem isso zerar a duração ' +
        'não desliga nada, porque scroll timeline ignora duração',
    ).toMatch(/animation-timeline:\s*auto\s*!important/)
    expect(reduzido, 'o atraso precisa zerar junto, ou o escalonamento vira salto seco').toMatch(
      /animation-delay:\s*0m?s\s*!important/,
    )
  })

  /**
   * O ORÇAMENTO DE MOVIMENTO INFINITO É UM ELEMENTO. `borda-viva` gira para
   * sempre; num só elemento ela diz para onde olhar, espalhada por vários vira
   * ruído — e um catálogo de efeitos é o oposto de uma página cara. Também é
   * bateria: animação perpétua nunca deixa a GPU ociosa.
   */
  it('só uma coisa na página se move para sempre', () => {
    const ocorrencias = css.match(/animation:[^;]*infinite/g) ?? []
    expect(ocorrencias, `${ocorrencias.length} animações infinitas: ${ocorrencias.join(' | ')}`)
      .toHaveLength(1)
  })
})
