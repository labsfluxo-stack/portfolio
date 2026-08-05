import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Hero } from '@/components/sections/Hero'
import { pt } from '@/content/pt'

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

  it('expõe exatamente um h1 e preenche o slot da constelação com o fallback decorativo', () => {
    const { container } = render(<Hero dict={pt} locale="pt" />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    const slot = container.querySelector('[data-constellation-slot]')
    expect(slot).toBeInTheDocument()
    expect(slot).toHaveAttribute('aria-hidden', 'true')
    // jsdom não implementa WebGL, então o estado de repouso -- o mesmo que
    // um crawler sem JavaScript vê -- é sempre o fallback SVG estático,
    // nunca o <canvas> da cena three.js.
    expect(slot?.querySelector('svg')).toBeInTheDocument()
    expect(slot?.querySelector('canvas')).not.toBeInTheDocument()
  })
})
