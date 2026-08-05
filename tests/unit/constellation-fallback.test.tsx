import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ConstellationFallback } from '@/components/three/ConstellationFallback'
import { buildConstellationGraph } from '@/components/three/useConstellationData'
import { systems } from '@/content/systems'
import type { System } from '@/content/systems'

describe('ConstellationFallback', () => {
  it('o fallback é decorativo e não anuncia nada ao leitor de tela', () => {
    const { container } = render(<ConstellationFallback systems={systems} />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('desenha um nó por sistema', () => {
    const { container } = render(<ConstellationFallback systems={systems} />)
    expect(container.querySelectorAll('[data-node]')).toHaveLength(systems.length)
  })

  it('desenha uma aresta por par de sistemas com tecnologia em comum', () => {
    const { container } = render(<ConstellationFallback systems={systems} />)
    // Os três sistemas de content/systems.ts compartilham TypeScript e
    // PostgreSQL entre si -- é um triângulo completo, 3 arestas para 3 nós.
    expect(container.querySelectorAll('line')).toHaveLength(3)
  })

  it('não quebra com zero sistemas', () => {
    const { container } = render(<ConstellationFallback systems={[]} />)
    expect(container.querySelectorAll('[data-node]')).toHaveLength(0)
    expect(container.querySelectorAll('line')).toHaveLength(0)
  })
})

describe('buildConstellationGraph', () => {
  const base: Omit<System, 'slug' | 'stack' | 'metrics'> = {
    name: 'Sistema',
    production: true,
    proprietary: false,
  }

  it('dois sistemas com stack em comum produzem aresta', () => {
    const a: System = { ...base, slug: 'moveis-pro', metrics: [{ key: 'lines', value: 1000 }], stack: ['TypeScript', 'PostgreSQL'] }
    const b: System = { ...base, slug: 'oscapstack', metrics: [{ key: 'lines', value: 2000 }], stack: ['TypeScript', 'React'] }

    const { edges } = buildConstellationGraph([a, b])
    expect(edges).toHaveLength(1)
    expect(edges[0]?.source).toBe('moveis-pro')
    expect(edges[0]?.target).toBe('oscapstack')
    expect(edges[0]?.sharedStack).toEqual(['TypeScript'])
  })

  it('dois sistemas sem nada em comum não produzem aresta', () => {
    const a: System = { ...base, slug: 'moveis-pro', metrics: [{ key: 'lines', value: 1000 }], stack: ['TypeScript'] }
    const b: System = { ...base, slug: 'oscapstack', metrics: [{ key: 'lines', value: 2000 }], stack: ['Python'] }

    const { edges } = buildConstellationGraph([a, b])
    expect(edges).toHaveLength(0)
  })

  it('o raio do nó é proporcional às linhas de código, normalizado 0..1', () => {
    const small: System = { ...base, slug: 'moveis-pro', metrics: [{ key: 'lines', value: 1000 }], stack: [] }
    const big: System = { ...base, slug: 'oscapstack', metrics: [{ key: 'lines', value: 9000 }], stack: [] }

    const { nodes } = buildConstellationGraph([small, big])
    const smallNode = nodes.find((node) => node.slug === 'moveis-pro')
    const bigNode = nodes.find((node) => node.slug === 'oscapstack')

    expect(smallNode?.size).toBe(0)
    expect(bigNode?.size).toBe(1)
  })

  it('a espessura da aresta cresce com o número de tecnologias em comum', () => {
    const a: System = {
      ...base,
      slug: 'moveis-pro',
      metrics: [{ key: 'lines', value: 1000 }],
      stack: ['TypeScript', 'PostgreSQL', 'Docker'],
    }
    const b: System = {
      ...base,
      slug: 'oscapstack',
      metrics: [{ key: 'lines', value: 2000 }],
      stack: ['TypeScript', 'PostgreSQL', 'Docker'],
    }
    const c: System = {
      ...base,
      slug: 'saturno-labs',
      metrics: [{ key: 'lines', value: 3000 }],
      stack: ['TypeScript'],
    }

    const { edges } = buildConstellationGraph([a, b, c])
    const strongEdge = edges.find((edge) => edge.source === 'moveis-pro' && edge.target === 'oscapstack')
    const weakEdge = edges.find((edge) => edge.source === 'moveis-pro' && edge.target === 'saturno-labs')

    expect(strongEdge?.weight).toBe(1)
    expect(weakEdge?.weight).toBeLessThan(1)
  })

  it('não quebra com um sistema só (sem par para formar aresta)', () => {
    const only: System = { ...base, slug: 'moveis-pro', metrics: [{ key: 'lines', value: 1000 }], stack: ['TypeScript'] }
    const { nodes, edges } = buildConstellationGraph([only])
    expect(nodes).toHaveLength(1)
    expect(edges).toHaveLength(0)
  })
})
