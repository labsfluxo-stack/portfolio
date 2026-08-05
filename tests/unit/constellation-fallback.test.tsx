import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ConstellationFallback } from '@/components/three/ConstellationFallback'
import { buildConstellationGraph } from '@/components/three/useConstellationData'
import { constellationSystems } from '@/components/three/constellation-data'
import type { ConstellationSystem } from '@/components/three/constellation-data'
import { systems } from '@/content/systems'

describe('ConstellationFallback', () => {
  it('o fallback é decorativo e não anuncia nada ao leitor de tela', () => {
    const { container } = render(<ConstellationFallback systems={constellationSystems} />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('desenha um nó por sistema', () => {
    const { container } = render(<ConstellationFallback systems={constellationSystems} />)
    expect(container.querySelectorAll('[data-node]')).toHaveLength(constellationSystems.length)
  })

  it('a cena mostra os 9 sistemas que a telemetria anuncia, não só os 3 da vitrine', () => {
    // Uma constelação com o número de nós diferente do número que a seção de
    // Telemetria afirma contradiz o próprio site na cara do visitante.
    expect(constellationSystems).toHaveLength(9)
    expect(constellationSystems.length).toBeGreaterThan(systems.length)
  })

  it('os 3 da vitrine derivam de content/systems.ts, sem repetir os números', () => {
    for (const system of systems) {
      const node = constellationSystems.find((candidate) => candidate.slug === system.slug)
      const lines = system.metrics.find((metric) => metric.key === 'lines')?.value
      expect(node?.lines).toBe(lines)
    }
  })

  it('não quebra com zero sistemas', () => {
    const { container } = render(<ConstellationFallback systems={[]} />)
    expect(container.querySelectorAll('[data-node]')).toHaveLength(0)
    expect(container.querySelectorAll('line')).toHaveLength(0)
  })
})

describe('buildConstellationGraph', () => {
  const node = (slug: string, lines: number, stack: string[]): ConstellationSystem => ({
    slug,
    lines,
    stack,
  })

  it('dois sistemas com duas ou mais tecnologias em comum produzem aresta', () => {
    const { edges } = buildConstellationGraph([
      node('moveis-pro', 1000, ['TypeScript', 'PostgreSQL', 'React']),
      node('oscapstack', 2000, ['TypeScript', 'PostgreSQL', 'Astro']),
    ])
    expect(edges).toHaveLength(1)
    expect(edges[0]?.source).toBe('moveis-pro')
    expect(edges[0]?.target).toBe('oscapstack')
    expect(edges[0]?.sharedStack).toEqual(['TypeScript', 'PostgreSQL'])
  })

  it('uma única tecnologia em comum NÃO basta para virar aresta', () => {
    // Todos os nove sistemas usam TypeScript. Com o limiar em 1, o grafo
    // ficaria quase completo e a cena viraria uma teia sem informação —
    // uma aresta que liga tudo a tudo não diz nada.
    const { edges } = buildConstellationGraph([
      node('moveis-pro', 1000, ['TypeScript', 'PostgreSQL']),
      node('oscapstack', 2000, ['TypeScript', 'React']),
    ])
    expect(edges).toHaveLength(0)
  })

  it('dois sistemas sem nada em comum não produzem aresta', () => {
    const { edges } = buildConstellationGraph([
      node('moveis-pro', 1000, ['TypeScript']),
      node('oscapstack', 2000, ['Python']),
    ])
    expect(edges).toHaveLength(0)
  })

  it('o raio do nó é normalizado 0..1 entre o menor e o maior sistema', () => {
    const { nodes } = buildConstellationGraph([
      node('moveis-pro', 1000, []),
      node('oscapstack', 9000, []),
    ])
    expect(nodes.find((n) => n.slug === 'moveis-pro')?.size).toBe(0)
    expect(nodes.find((n) => n.slug === 'oscapstack')?.size).toBe(1)
  })

  it('a escala é logarítmica, não linear — senão o menor sistema some', () => {
    // 620 e 78.900 linhas diferem por 127x. Em escala linear o sistema do
    // meio (12.900) ficaria em 0,157 — praticamente colado no menor. Em log
    // ele fica bem acima do meio, que é o que mantém os nove nós legíveis.
    const { nodes } = buildConstellationGraph([
      node('menor', 620, []),
      node('meio', 12900, []),
      node('maior', 78900, []),
    ])
    const meio = nodes.find((n) => n.slug === 'meio')?.size ?? 0
    expect(meio).toBeGreaterThan(0.5)
    expect(meio).toBeLessThan(1)
  })

  it('nenhum nó nasce na mesma posição de outro', () => {
    const { nodes } = buildConstellationGraph(constellationSystems)
    const posicoes = new Set(nodes.map((n) => `${n.position.x.toFixed(4)},${n.position.y.toFixed(4)},${n.position.z.toFixed(4)}`))
    expect(posicoes.size).toBe(nodes.length)
  })

  it('a espessura da aresta cresce com o número de tecnologias em comum', () => {
    const { edges } = buildConstellationGraph([
      node('moveis-pro', 1000, ['TypeScript', 'PostgreSQL', 'Docker']),
      node('oscapstack', 2000, ['TypeScript', 'PostgreSQL', 'Docker']),
      node('saturno-labs', 3000, ['TypeScript', 'PostgreSQL']),
    ])
    const forte = edges.find((e) => e.source === 'moveis-pro' && e.target === 'oscapstack')
    const fraca = edges.find((e) => e.source === 'moveis-pro' && e.target === 'saturno-labs')

    expect(forte?.weight).toBe(1)
    expect(fraca?.weight).toBeLessThan(1)
  })

  it('não quebra com um sistema só (sem par para formar aresta)', () => {
    const { nodes, edges } = buildConstellationGraph([node('moveis-pro', 1000, ['TypeScript'])])
    expect(nodes).toHaveLength(1)
    expect(edges).toHaveLength(0)
  })
})
