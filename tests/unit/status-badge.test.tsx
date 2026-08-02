import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusBadge } from '@/components/ui/StatusBadge'

describe('StatusBadge', () => {
  it('expõe o rótulo como texto, não apenas cor', () => {
    render(<StatusBadge status="ok" label="OPERACIONAL" />)
    expect(screen.getByText('OPERACIONAL')).toBeInTheDocument()
  })

  it('marca o ponto colorido como decorativo', () => {
    const { container } = render(<StatusBadge status="warn" label="PROPRIETÁRIO" />)
    const dot = container.querySelector('[data-dot]')
    expect(dot).toHaveAttribute('aria-hidden', 'true')
  })
})
