import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Page from '@/app/page'

describe('página raiz', () => {
  it('renderiza a marca', () => {
    render(<Page />)
    expect(screen.getByRole('heading', { name: /neto alves/i })).toBeInTheDocument()
  })
})
