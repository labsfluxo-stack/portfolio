import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Counter } from '@/components/ui/Counter'

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

describe('Counter', () => {
  it('com reduced-motion, mostra o valor final imediatamente', () => {
    setReducedMotion(true)
    render(<Counter to={1675} />)
    expect(screen.getByText('1.675')).toBeInTheDocument()
  })

  it('formata em pt-BR e aplica o sufixo', () => {
    setReducedMotion(true)
    render(<Counter to={250000} suffix="+" />)
    expect(screen.getByText('250.000+')).toBeInTheDocument()
  })
})
