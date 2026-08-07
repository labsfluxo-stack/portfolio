import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Hero } from '@/components/sections/Hero'
import { sceneRotation } from '@/components/three/portico-systems'
import { pt } from '@/content/pt'
import { systems } from '@/content/systems'

describe('Hero', () => {
  it('renderiza nome, cargo e tagline', () => {
    render(<Hero dict={pt} locale="pt" />)
    expect(screen.getByRole('heading', { level: 1, name: pt.hero.name })).toBeInTheDocument()
    expect(screen.getByText(pt.hero.role)).toBeInTheDocument()
    expect(screen.getByText(pt.hero.tagline)).toBeInTheDocument()
  })

  it('expõe o badge de disponibilidade e a dica de rolagem como decoração', () => {
    render(<Hero dict={pt} locale="pt" />)
    expect(screen.getByText(pt.hero.availability)).toBeInTheDocument()
    const hint = screen.getByText(pt.hero.scrollHint)
    expect(hint).toHaveAttribute('aria-hidden', 'true')
  })

  it('expõe exatamente um h1 e preenche o slot do pórtico com o fallback decorativo', () => {
    const { container } = render(<Hero dict={pt} locale="pt" />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    const slot = container.querySelector('[data-portico-slot]')
    expect(slot).toBeInTheDocument()
    expect(slot).toHaveAttribute('aria-hidden', 'true')
    // jsdom não implementa WebGL, então o estado de repouso -- o mesmo que
    // um crawler sem JavaScript vê -- é sempre o fallback SVG estático,
    // nunca o <canvas> da cena three.js.
    expect(slot?.querySelector('svg')).toBeInTheDocument()
    expect(slot?.querySelector('canvas')).not.toBeInTheDocument()
  })

  it('os rótulos dos contêineres vêm de content/systems.ts, não de string no código', () => {
    const { container } = render(<Hero dict={pt} locale="pt" />)
    const slot = container.querySelector('[data-portico-slot]')
    const stencils = [...(slot?.querySelectorAll('text') ?? [])].map((node) => node.textContent)

    // A cena monta os sistemas do dono, um por vez; o desenho estático mostra
    // o primeiro da rotação. O nome dele e as tecnologias da stack dele saem
    // do conteúdo, e nenhum dos dois é escrito no código da cena.
    const first = sceneRotation(systems)[0]
    expect(first, 'rotação vazia').toBeDefined()
    expect(stencils, 'nome do sistema ausente na cena').toContain((first?.name ?? '').toUpperCase())

    const stack = new Set((first?.stack ?? []).map((name) => name.toUpperCase()))
    const named = stencils.filter((text) => text && stack.has(text))
    expect(named.length, `nenhuma tecnologia estampada: ${stencils.join(' | ')}`).toBeGreaterThan(2)
  })
})
