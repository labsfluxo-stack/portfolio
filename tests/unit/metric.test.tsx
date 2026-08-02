import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Metric } from '@/components/ui/Metric'

describe('Metric', () => {
  it('sempre expõe a procedência do número', () => {
    render(
      <Metric
        value="250.000+"
        label="linhas de código"
        provenance="Soma de 9 repositórios, excluindo dependências. Medido em 2026-08-02."
      />,
    )
    expect(screen.getByText(/Medido em 2026-08-02/)).toBeInTheDocument()
  })
})
