import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Telemetry } from '@/components/sections/Telemetry'
import { pt } from '@/content/pt'
import { en } from '@/content/en'

function setReducedMotion(reduced: boolean) {
  vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
    matches: reduced && query.includes('reduce'),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }) as unknown as MediaQueryList)
}

describe('Telemetry', () => {
  it('os quatro números primários aparecem, cada um com procedência em texto', () => {
    setReducedMotion(true)
    render(<Telemetry dict={pt} locale="pt" />)
    for (const metric of pt.telemetry.metrics) {
      expect(screen.getByText(metric.label)).toBeInTheDocument()
      expect(screen.getByText(metric.value)).toBeInTheDocument()
      // Texto visível como <p>, não só o atributo `title` do número.
      expect(screen.getByText(metric.provenance).tagName).toBe('P')
    }
  })

  it('com locale en, os números primários saem com vírgula como separador', () => {
    setReducedMotion(true)
    render(<Telemetry dict={en} locale="en" />)
    expect(screen.getByText('250,000+')).toBeInTheDocument()
    expect(screen.queryByText('250.000+')).not.toBeInTheDocument()
  })

  it('exibe a fita de detalhamento sob o rótulo, com procedência visível', () => {
    render(<Telemetry dict={pt} locale="pt" />)
    expect(screen.getByText(pt.telemetry.secondaryLabel)).toBeInTheDocument()
    for (const item of pt.telemetry.secondary) {
      expect(screen.getByText(item.label)).toBeInTheDocument()
      expect(screen.getByText(item.value)).toBeInTheDocument()
      expect(screen.getByText(item.provenance)).toBeInTheDocument()
    }
  })
})
