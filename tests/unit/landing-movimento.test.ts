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

/**
 * TODOS os corpos de uma at-rule, contando chaves — regex não fecha bloco
 * aninhado, e `@supports` aqui contém regras com chaves próprias.
 *
 * O plural é a correção de um defeito deste próprio arquivo: a primeira versão
 * pegava só a PRIMEIRA ocorrência, e existem dois `@supports (animation-
 * timeline: view())` no globals.css — um para a revelação, outro para a arte.
 * O segundo sobrava no texto "fora do @supports" e o teste acusava um defeito
 * que não existia. Um guarda que dá alarme falso é abandonado em uma semana.
 */
function corposDe(abertura: string): string[] {
  const blocos: string[] = []
  for (let i = css.indexOf(abertura); i !== -1; i = css.indexOf(abertura, i + 1)) {
    let nivel = 0
    for (let j = css.indexOf('{', i); j < css.length; j++) {
      if (css[j] === '{') nivel++
      else if (css[j] === '}' && --nivel === 0) {
        blocos.push(css.slice(i, j + 1))
        break
      }
    }
  }
  if (blocos.length === 0) throw new Error(`bloco "${abertura}" sumiu de app/globals.css`)
  return blocos
}

/** O CSS com todos os blocos daquela at-rule removidos — ou seja, exatamente o
 *  que um navegador SEM o recurso enxerga. */
function semOsBlocos(abertura: string): string {
  return corposDe(abertura).reduce((texto, bloco) => texto.replace(bloco, ''), css)
}

const SUPORTE = '@supports (animation-timeline: view())'

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
    expect(
      semOsBlocos(SUPORTE),
      'existe regra .revelar fora do @supports — nos navegadores sem suporte ' +
        'ela vira estado permanente e apaga o conteúdo da página',
    ).not.toMatch(/^\s*\.revelar[\w-]*\s*(,|\{)/m)

    // E o inverso: o estado inicial tem de estar dentro, via `both`.
    expect(
      corposDe(SUPORTE).join(''),
      'a revelação perdeu o `both` que pinta o estado inicial',
    ).toMatch(/animation:\s*revelar\s+linear\s+both/)
  })

  /**
   * A MESMA ARMADILHA, NA ARTE — e esta não é hipótese: apareceu num teste de
   * bancada antes de virar código. Com `stroke-dasharray` e `opacity: 0` na
   * regra base, o navegador sem suporte a scroll timeline renderizou as quatro
   * ilustrações COMPLETAMENTE INVISÍVEIS. Nada de arte pela metade: nada.
   *
   * Medido depois nos três motores — o Firefox do Playwright não implementa
   * `animation-timeline`, pula o `@supports` inteiro e mostra a arte pronta,
   * que é o desenho final de qualquer jeito. Só funciona porque o estado
   * escondido mora inteiro dentro do bloco.
   *
   * `.arte-entra` é a exceção legítima e fica de fora deste teste: ela anima
   * por TEMPO, não por rolagem, então roda em qualquer navegador e não depende
   * de suporte nenhum para chegar ao fim.
   */
  it('a arte nunca nasce escondida fora do @supports', () => {
    const fora = semOsBlocos(SUPORTE)

    for (const regra of fora.match(/\.arte-viva[^{]*\{[^}]*\}/g) ?? []) {
      expect(
        regra,
        `esta regra esconde a arte fora do @supports, e sem suporte ela nunca ` +
          `reaparece:\n${regra}`,
      ).not.toMatch(/stroke-dasharray|opacity\s*:\s*0/)
    }

    // E o estado escondido tem mesmo de existir lá dentro — sem ele não há
    // desenho nenhum, só arte estática em toda parte.
    expect(corposDe(SUPORTE).join(''), 'o traçado sumiu do @supports').toMatch(
      /stroke-dasharray:\s*var\(--traco/,
    )
  })

  /**
   * `--traco` é o comprimento exato de cada forma, e é ele que substitui o
   * `svg.createDrawable` do anime.js. O fallback `0` não é decoração: sem ele,
   * uma forma nova sem comprimento tornaria a declaração inválida e o
   * resultado imprevisível. Com ele, `stroke-dasharray: 0` é linha contínua —
   * a forma não anima, mas aparece inteira.
   */
  it('o traçado tem fallback: forma sem comprimento aparece, não some', () => {
    for (const uso of css.match(/var\(--traco[^)]*\)/g) ?? []) {
      expect(uso, `\`${uso}\` sem fallback — forma sem --traco vira indefinida`).toMatch(
        /var\(--traco,\s*0\)/,
      )
    }
  })

  /**
   * ESCALONAMENTO EM SCROLL TIMELINE NÃO É `animation-delay`.
   *
   * Numa timeline de rolagem a duração e o ATRASO são ignorados — quem define o
   * progresso é a posição da barra. É o mesmo mecanismo que obriga o bloco de
   * movimento reduzido a devolver `animation-timeline: auto`.
   *
   * Escrito com `animation-delay`, o escalonamento é aceito pelo navegador, não
   * faz nada, e ninguém percebe até comparar as duas versões lado a lado. O que
   * escalona de verdade é deslocar a FAIXA de cada item.
   */
  it('o escalonamento desloca a faixa, não o relógio', () => {
    const dentro = corposDe(SUPORTE).join('')
    expect(dentro, 'a faixa da revelação parou de escalonar por --i').toMatch(
      /animation-range:[^;]*var\(--i/,
    )

    // Exige os dois-pontos: é a DECLARAÇÃO que reprova, não a palavra. Sem
    // isso o guarda casa com o próprio comentário que explica a armadilha, e
    // dá alarme falso — que é como um teste é abandonado em uma semana.
    for (const regra of css.match(/\.revelar[\w-]*[^{]*\{[^}]*\}/g) ?? []) {
      expect(
        regra,
        `\`animation-delay\` numa animação de rolagem é ignorado — este ` +
          `escalonamento não existe na tela:\n${regra}`,
      ).not.toMatch(/animation-delay\s*:/)
    }
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
    const [reduzido] = corposDe('@media (prefers-reduced-motion: reduce)')
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
   * O ORÇAMENTO DE MOVIMENTO INFINITO É UM ELEMENTO POR PÁGINA. Num só, ele diz
   * para onde olhar; espalhado por vários vira ruído — e um catálogo de efeitos
   * é o oposto de uma página cara. Também é bateria: animação perpétua nunca
   * deixa a GPU ociosa.
   *
   * São duas no arquivo porque são duas páginas, e as duas apontam para a mesma
   * coisa: a chamada final. `.borda-viva` na landing, `.aurora` na home. Uma
   * terceira reprova, e é isso que este teste existe para impedir.
   */
  it('cada página tem no máximo uma coisa que se move para sempre', () => {
    // SEM OS COMENTÁRIOS, e a lição é de hoje: o guarda do escalonamento casou
    // com o texto que EXPLICA a armadilha em vez da declaração que a comete.
    const semComentarios = css.replace(/\/\*[\s\S]*?\*\//g, '')
    const regras = semComentarios.match(/[^{}]+\{[^}]*animation:[^;]*infinite[^}]*\}/g) ?? []
    const donas = regras.map((regra) => regra.split('{')[0]?.trim() ?? '')

    expect(
      donas.length,
      `${donas.length} animações infinitas: ${donas.join(' | ')}`,
    ).toBe(2)

    expect(donas.join(' '), 'a borda viva da landing sumiu ou trocou de dono').toMatch(
      /borda-viva/,
    )
    expect(donas.join(' '), 'a aurora da home sumiu ou trocou de dono').toMatch(/aurora/)
  })
})
