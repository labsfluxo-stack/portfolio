import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LocaleSwitch } from '@/components/layout/LocaleSwitch'

describe('LocaleSwitch', () => {
  it('aponta para o mesmo caminho no outro idioma', () => {
    render(<LocaleSwitch locale="pt" pathname="/pt/sistemas/oscapstack" label="Trocar idioma" />)
    expect(screen.getByRole('link', { name: /en/i })).toHaveAttribute('href', '/en/sistemas/oscapstack')
  })

  it('marca o idioma atual para leitor de tela', () => {
    render(<LocaleSwitch locale="pt" pathname="/pt" label="Trocar idioma" />)
    expect(screen.getByText('PT')).toHaveAttribute('aria-current', 'true')
  })
})
