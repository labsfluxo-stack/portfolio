import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Systems } from '@/components/sections/Systems'
import { pt } from '@/content/pt'
import { en } from '@/content/en'
import { systems } from '@/content/systems'

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

function cardFor(name: string) {
  const heading = screen.getByRole('heading', { level: 3, name })
  const card = heading.closest('article')
  if (!card) throw new Error(`card não encontrado para ${name}`)
  return within(card)
}

/** `metricLabels` é `Record<string, string>`; com `noUncheckedIndexedAccess`
 * qualquer acesso por chave devolve `string | undefined`. Este helper só
 * estreita o tipo de volta para `string` depois de confirmar que a chave
 * existe — não contorna a checagem, só a resolve num só lugar. */
function metricLabel(key: string): string {
  const value = pt.systems.metricLabels[key]
  if (!value) throw new Error(`metricLabels.${key} ausente`)
  return value
}

describe('Systems', () => {
  it('os três nomes de sistema aparecem', () => {
    setReducedMotion(true)
    render(<Systems dict={pt} locale="pt" />)
    for (const system of systems) {
      expect(screen.getByText(system.name)).toBeInTheDocument()
    }
  })

  it('OSCapstack mostra os dois badges; Saturno Labs mostra só o de proprietário', () => {
    setReducedMotion(true)
    render(<Systems dict={pt} locale="pt" />)

    const oscapstack = cardFor('OSCapstack CRM')
    expect(oscapstack.getByText(pt.systems.statusLabels.production)).toBeInTheDocument()
    expect(oscapstack.getByText(pt.systems.statusLabels.proprietary)).toBeInTheDocument()

    const saturno = cardFor('Saturno Labs')
    expect(saturno.queryByText(pt.systems.statusLabels.production)).not.toBeInTheDocument()
    expect(saturno.getByText(pt.systems.statusLabels.proprietary)).toBeInTheDocument()

    const moveisPro = cardFor('Moveis.pro')
    expect(moveisPro.getByText(pt.systems.statusLabels.production)).toBeInTheDocument()
    expect(moveisPro.queryByText(pt.systems.statusLabels.proprietary)).not.toBeInTheDocument()
  })

  it('a nota de proprietário aparece no lugar do link nos dois sistemas fechados', () => {
    setReducedMotion(true)
    render(<Systems dict={pt} locale="pt" />)

    for (const name of ['OSCapstack CRM', 'Saturno Labs']) {
      const card = cardFor(name)
      expect(card.getByText(pt.systems.proprietaryNote)).toBeInTheDocument()
      expect(card.queryByRole('link', { name: /github/i })).not.toBeInTheDocument()
    }

    // Moveis.pro não é proprietário e tem repoUrl: mostra o link, não a nota.
    // O texto do link é o rótulo do dicionário, nunca a URL crua (ruído
    // visual e péssimo para leitor de tela).
    const moveisPro = cardFor('Moveis.pro')
    expect(moveisPro.queryByText(pt.systems.proprietaryNote)).not.toBeInTheDocument()
    const repoLink = moveisPro.getByText(pt.systems.viewRepo)
    expect(repoLink.closest('a')).toHaveAttribute('href', 'https://github.com/netoguild-rgb/Moveis.pro')
  })

  it('com locale en, os números dos cards saem com vírgula como separador de milhar', () => {
    setReducedMotion(true)
    render(<Systems dict={en} locale="en" />)
    expect(screen.getByText('78,900')).toBeInTheDocument()
    expect(screen.queryByText('78.900')).not.toBeInTheDocument()
  })

  it('o rótulo de cada métrica vem do dicionário, nunca da chave crua', () => {
    setReducedMotion(true)
    render(<Systems dict={pt} locale="pt" />)
    const oscapstack = cardFor('OSCapstack CRM')
    expect(oscapstack.getByText(metricLabel('tables'))).toBeInTheDocument()
    expect(oscapstack.queryByText('tables')).not.toBeInTheDocument()
  })
})
