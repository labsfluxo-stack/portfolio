import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SystemArt } from '@/components/art/SystemArt'
import { systems } from '@/content/systems'

describe('SystemArt', () => {
  for (const system of systems) {
    describe(system.slug, () => {
      it('renderiza um SVG decorativo', () => {
        const { container } = render(<SystemArt slug={system.slug} />)
        const svg = container.querySelector('svg')
        expect(svg).toBeTruthy()
        // Decoração pura: não carrega informação que a página não diga em
        // texto, e anunciar "gráfico" sem ter o que descrever só atrapalha.
        expect(svg).toHaveAttribute('aria-hidden', 'true')
      })

      // A arte ocupa o lugar onde normalmente entraria um print do produto, e
      // dois dos três sistemas são proprietários. Se ela contivesse texto,
      // começaria a parecer uma captura de interface — que seria fabricar
      // prova de um produto que ninguém pode conferir. Geometria, nunca
      // rótulo.
      it('não contém texto nenhum, para não passar por captura de tela', () => {
        const { container } = render(<SystemArt slug={system.slug} />)
        expect(container.querySelectorAll('text').length).toBe(0)
        expect(container.textContent?.trim()).toBe('')
      })

      // Mesma disciplina dos diagramas: paleta monocromática com um único
      // dado colorido, e o destaque é o ponto de foco da composição.
      //
      // O limite é DOIS nós, não um, e o motivo é o Saturno: lá o destaque é
      // uma órbita, e uma órbita destacada sem o corpo que a percorre fica
      // pela metade. O anel leva o traço e o corpo leva o preenchimento —
      // são dois nós de SVG, mas um gesto visual só. O que a trava impede é
      // o ciano virar cor de uso geral.
      it('o destaque é um foco só, nunca cor de uso geral', () => {
        const { container } = render(<SystemArt slug={system.slug} />)
        const destaque = container.querySelectorAll('.stroke-data, .fill-data')
        const formas = container.querySelectorAll('rect, circle, ellipse, polygon, line, path')

        expect(destaque.length, 'nenhuma forma em destaque — a arte perdeu o ponto de foco').toBeGreaterThan(0)
        expect(destaque.length, 'destaque demais: o ciano virou cor de uso geral').toBeLessThanOrEqual(2)
        expect(formas.length, 'a arte tem forma de menos para o destaque significar algo').toBeGreaterThan(8)
      })

      // Arte que muda a cada build não é identidade visual, é ruído — e
      // quebraria qualquer comparação de captura entre dois builds.
      it('é determinística: dois renders produzem o mesmo desenho', () => {
        const a = render(<SystemArt slug={system.slug} />).container.innerHTML
        const b = render(<SystemArt slug={system.slug} />).container.innerHTML
        expect(a).toBe(b)
      })
    })
  }

  it('cada sistema tem uma arte visualmente diferente das outras', () => {
    const desenhos = systems.map((system) => render(<SystemArt slug={system.slug} />).container.innerHTML)
    expect(new Set(desenhos).size, 'dois sistemas estão com a mesma arte').toBe(systems.length)
  })
})
