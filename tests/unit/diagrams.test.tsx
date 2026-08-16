import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SystemDiagram } from '@/components/diagrams/SystemDiagram'
import { pt } from '@/content/pt'
import { en } from '@/content/en'
import { systems } from '@/content/systems'
import type { Dictionary } from '@/content/types'

const dicts: [string, Dictionary][] = [
  ['pt', pt],
  ['en', en],
]

/** Todo texto que o desenho põe na tela, em ordem de documento. */
function textsOf(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('text')).map((node) => node.textContent ?? '')
}

describe('SystemDiagram', () => {
  for (const system of systems) {
    describe(system.slug, () => {
      it('renderiza um SVG, sem legenda explicando a própria convenção', () => {
        const { container } = render(<SystemDiagram system={system} dict={pt} />)
        expect(container.querySelector('svg')).toBeTruthy()
        // Havia uma legenda — "Em destaque, a decisão que sustenta o resto" —
        // e ela ensinava o leitor a ler uma imagem que ele já sabe ler. Quem
        // repara no ciano repara sozinho.
        expect(container.querySelector('figcaption'), 'a legenda voltou').toBeNull()
      })

      // AS DUAS TRAVAS QUE MAIS IMPORTAM. Um diagrama é a superfície mais
      // fácil de "arredondar" um número para o desenho ficar bonito, e
      // ninguém notaria: a prosa fica logo abaixo dizendo outra coisa.
      //
      // A primeira versão desta trava exigia que TODO número saísse de
      // `system.metrics`, e estava estreita demais — reprovou o "2" de
      // "Sonda 2 min", que é honesto (o case diz "um cron de 2 em 2
      // minutos") e vem do dicionário. A regra certa não é a origem única, é
      // que nenhum número seja LITERAL SOLTO no componente: tudo que o
      // desenho afirma tem de ser rastreável a conteúdo revisado.
      it('todo número desenhado é rastreável a conteúdo revisado', () => {
        const caso = pt.systems.detail[system.slug]
        const revisado = [
          ...system.metrics.map((m) => String(m.value)),
          ...Object.values(pt.systems.diagram),
          caso.problem,
          caso.architecture,
          ...caso.decisions.flatMap((d) => [d.title, d.body]),
        ].join(' ')

        const { container } = render(<SystemDiagram system={system} dict={pt} />)
        const numeros = textsOf(container).flatMap((text) => text.match(/\d[\d.,]*/g) ?? [])

        expect(numeros.length, 'o diagrama não mostra número nenhum — a trava virou decoração').toBeGreaterThan(0)
        for (const numero of numeros) {
          // Fronteira de dígito para "1" não casar dentro de "146": a trava
          // só vale se exigir o número inteiro, não um pedaço dele.
          const inteiro = new RegExp(`(^|[^\\d.,])${numero.replace(/[.]/g, '\\.')}([^\\d.,]|$)`)
          expect(
            inteiro.test(revisado),
            `o diagrama de ${system.slug} mostra "${numero}", que não aparece nem nas métricas, ` +
              `nem nos rótulos do dicionário, nem no texto do case — é literal solto no componente`,
          ).toBe(true)
        }
      })

      // O outro lado da mesma moeda: o desenho tem de MOSTRAR os números do
      // card, senão as duas superfícies contam histórias diferentes do mesmo
      // sistema.
      it('mostra os mesmos números do card da home', () => {
        const { container } = render(<SystemDiagram system={system} dict={pt} />)
        const texto = textsOf(container).join(' | ')
        for (const { key, value } of system.metrics) {
          expect(texto, `a métrica "${key}" (${value}) não aparece no diagrama`).toContain(String(value))
        }
      })

      for (const [locale, dict] of dicts) {
        it(`os rótulos vêm do dicionário (${locale}), nunca escritos no componente`, () => {
          const { container } = render(<SystemDiagram system={system} dict={dict} />)
          const texto = textsOf(container).join(' | ')

          // Cada desenho usa um subconjunto do bag; basta que TODO rótulo
          // exibido que seja prosa exista no dicionário daquele idioma.
          const prosa = Object.values(dict.systems.diagram)
          const usados = prosa.filter((label) => texto.includes(label))
          expect(usados.length, `nenhum rótulo de ${locale} apareceu em ${system.slug}`).toBeGreaterThan(3)
        })
      }

      // A identidade do site é monocromática com um único dado colorido. Dois
      // destaques num desenho de oito caixas não destacam mais nada — e o
      // destaque aqui carrega significado: é a decisão que sustenta o
      // sistema.
      it('tem exatamente uma caixa em destaque', () => {
        const { container } = render(<SystemDiagram system={system} dict={pt} />)
        const destacadas = container.querySelectorAll('rect.stroke-data')
        expect(destacadas.length).toBe(1)
      })
    })
  }

  // Os ids de marcador são globais no documento. Com dois diagramas na mesma
  // página, ids iguais fariam um roubar a definição do outro — e a seta do
  // segundo sumiria ou trocaria de cor sem erro nenhum.
  it('cada diagrama usa ids de marcador próprios, sem colidir com os outros', () => {
    const ids = systems.map((system) => {
      const { container } = render(<SystemDiagram system={system} dict={pt} />)
      return Array.from(container.querySelectorAll('marker, pattern')).map((node) => node.id)
    })

    const todos = ids.flat()
    expect(todos.length, 'nenhum marcador encontrado — o teste não está vendo os defs').toBeGreaterThan(0)
    expect(new Set(todos).size, `ids repetidos entre diagramas: ${todos.join(', ')}`).toBe(todos.length)
  })

  // O parágrafo da arquitetura, logo abaixo, é a descrição textual completa
  // do desenho. Anunciar os dois faria um leitor de tela ouvir a mesma
  // arquitetura duas vezes, a segunda em pedaços soltos e fora de ordem.
  it('o SVG é aria-hidden, porque a prosa da arquitetura já o descreve', () => {
    for (const system of systems) {
      const { container } = render(<SystemDiagram system={system} dict={pt} />)
      expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    }
  })

  /**
   * A ARQUITETURA SE DESENHA. É o mesmo mecanismo da landing (`.arte-viva` /
   * `.traca` / `.preenche`), e aqui ele é mais forte do que lá: um diagrama de
   * arquitetura que se constrói sozinho é o efeito descrevendo o próprio
   * conteúdo.
   *
   * TEXTO NÃO SE TRAÇA. Contorno de letra sendo desenhado lê como erro de
   * renderização, não como construção — os rótulos entram preenchendo.
   */
  it('o diagrama declara a timeline e nenhum texto é traçado', () => {
    for (const system of systems) {
      const { container } = render(<SystemDiagram system={system} dict={pt} />)

      expect(
        container.querySelector('svg'),
        'o <svg> precisa declarar a timeline: forma dentro dele não tem caixa CSS, ' +
          'então uma timeline anônima não teria de onde medir',
      ).toHaveClass('arte-viva')

      for (const texto of container.querySelectorAll('text')) {
        expect(
          texto,
          `texto com .traca vira contorno de letra sendo desenhado: "${texto.textContent}"`,
        ).not.toHaveClass('traca')
      }

      expect(
        container.querySelectorAll('.traca').length,
        `nenhuma forma de ${system.slug} recebeu traçado`,
      ).toBeGreaterThan(0)
    }
  })

  /**
   * `pathLength="1"` é o que substitui o `svg.createDrawable` do anime.js: ele
   * normaliza o comprimento declarado da forma para 1, então `stroke-dasharray:
   * 1` a cobre inteira sem medir geometria nenhuma.
   *
   * Verificado nos três motores antes de virar padrão (`tests/e2e/pathlength.
   * spec.ts`): chromium, firefox e webkit honram o atributo em rect, line e
   * path. Sem ele numa forma traçada, o dasharray de 1 unidade vira um
   * tracejado finíssimo e a forma aparece rabiscada em vez de se desenhar.
   */
  it('toda forma traçada declara pathLength', () => {
    for (const system of systems) {
      const { container } = render(<SystemDiagram system={system} dict={pt} />)
      for (const forma of container.querySelectorAll('.traca')) {
        expect(
          forma.getAttribute('pathLength'),
          `<${forma.tagName}> traçado sem pathLength — vira tracejado, não desenho`,
        ).toBe('1')
      }
    }
  })
})
