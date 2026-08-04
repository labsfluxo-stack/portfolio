import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CaseStudy } from '@/components/sections/CaseStudy'
import { pt } from '@/content/pt'
import { en } from '@/content/en'
import { systems } from '@/content/systems'
import type { SystemSlug } from '@/content/types'

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

function systemFor(slug: SystemSlug) {
  const system = systems.find((s) => s.slug === slug)
  if (!system) throw new Error(`sistema não encontrado: ${slug}`)
  return system
}

/** `metricLabels` é `Record<string, string>`; com `noUncheckedIndexedAccess`
 * qualquer acesso por chave devolve `string | undefined` (mesmo helper de
 * `tests/unit/systems.test.tsx`). */
function metricLabel(key: string): string {
  const value = pt.systems.metricLabels[key]
  if (!value) throw new Error(`metricLabels.${key} ausente`)
  return value
}

describe('CaseStudy', () => {
  it('expõe exatamente um h1 com o nome do sistema', () => {
    setReducedMotion(true)
    render(<CaseStudy system={systemFor('oscapstack')} dict={pt} locale="pt" />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'OSCapstack CRM' })).toBeInTheDocument()
  })

  it('as cinco seções internas viram h2 com os rótulos de caseLabels', () => {
    setReducedMotion(true)
    render(<CaseStudy system={systemFor('oscapstack')} dict={pt} locale="pt" />)
    const { caseLabels } = pt.systems
    for (const label of [
      caseLabels.problem,
      caseLabels.architecture,
      caseLabels.decisions,
      caseLabels.stack,
      caseLabels.retro,
    ]) {
      const heading = screen.getAllByRole('heading', { level: 2 }).find((h) => h.textContent?.includes(label))
      expect(heading, `h2 com "${label}" não encontrado`).toBeDefined()
    }
  })

  it('OSCapstack mostra os dois badges de status', () => {
    setReducedMotion(true)
    render(<CaseStudy system={systemFor('oscapstack')} dict={pt} locale="pt" />)
    expect(screen.getByText(pt.systems.statusLabels.production)).toBeInTheDocument()
    expect(screen.getByText(pt.systems.statusLabels.proprietary)).toBeInTheDocument()
  })

  it('Moveis.pro mostra só o badge de operacional, nunca o de proprietário', () => {
    setReducedMotion(true)
    render(<CaseStudy system={systemFor('moveis-pro')} dict={pt} locale="pt" />)
    expect(screen.getByText(pt.systems.statusLabels.production)).toBeInTheDocument()
    expect(screen.queryByText(pt.systems.statusLabels.proprietary)).not.toBeInTheDocument()
  })

  it('sistema proprietário mostra a nota, nunca um link de repositório', () => {
    setReducedMotion(true)
    render(<CaseStudy system={systemFor('saturno-labs')} dict={pt} locale="pt" />)
    expect(screen.getByText(pt.systems.proprietaryNote)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: pt.systems.viewRepo })).not.toBeInTheDocument()
  })

  it('sistema não proprietário com repoUrl mostra o link com o rótulo do dicionário, nunca a URL crua como texto', () => {
    setReducedMotion(true)
    render(<CaseStudy system={systemFor('moveis-pro')} dict={pt} locale="pt" />)
    const link = screen.getByRole('link', { name: pt.systems.viewRepo })
    expect(link).toHaveAttribute('href', 'https://github.com/netoguild-rgb/Moveis.pro')
    expect(screen.queryByText(pt.systems.proprietaryNote)).not.toBeInTheDocument()
    expect(screen.queryByText('https://github.com/netoguild-rgb/Moveis.pro')).not.toBeInTheDocument()
  })

  it('renderiza problem, architecture e retro do dicionário', () => {
    setReducedMotion(true)
    render(<CaseStudy system={systemFor('oscapstack')} dict={pt} locale="pt" />)
    const detail = pt.systems.detail.oscapstack
    expect(screen.getByText(detail.problem)).toBeInTheDocument()
    expect(screen.getByText(detail.architecture)).toBeInTheDocument()
    expect(screen.getByText(detail.retro)).toBeInTheDocument()
  })

  it('renderiza as 4 decisões como blocos autônomos, cada um com título (h3) e corpo', () => {
    setReducedMotion(true)
    render(<CaseStudy system={systemFor('oscapstack')} dict={pt} locale="pt" />)
    const detail = pt.systems.detail.oscapstack
    expect(detail.decisions).toHaveLength(4)
    for (const decision of detail.decisions) {
      expect(screen.getByRole('heading', { level: 3, name: decision.title })).toBeInTheDocument()
      expect(screen.getByText(decision.body)).toBeInTheDocument()
    }
  })

  it('lista cada tecnologia da stack do case study', () => {
    setReducedMotion(true)
    render(<CaseStudy system={systemFor('oscapstack')} dict={pt} locale="pt" />)
    for (const tech of pt.systems.detail.oscapstack.stack) {
      expect(screen.getByText(tech)).toBeInTheDocument()
    }
  })

  it('o rótulo de cada métrica do topo vem do dicionário, nunca da chave crua', () => {
    setReducedMotion(true)
    render(<CaseStudy system={systemFor('oscapstack')} dict={pt} locale="pt" />)
    expect(screen.getByText(metricLabel('policies'))).toBeInTheDocument()
    expect(screen.queryByText('policies')).not.toBeInTheDocument()
  })

  it('com locale en, os números do topo saem com vírgula como separador de milhar', () => {
    setReducedMotion(true)
    render(<CaseStudy system={systemFor('oscapstack')} dict={en} locale="en" />)
    expect(screen.getByText('78,900')).toBeInTheDocument()
    expect(screen.queryByText('78.900')).not.toBeInTheDocument()
  })

  it('tem um único link de volta para a home, com o rótulo do dicionário', () => {
    setReducedMotion(true)
    render(<CaseStudy system={systemFor('oscapstack')} dict={pt} locale="pt" />)
    const back = screen.getByRole('link', { name: pt.systems.caseLabels.backToHome })
    expect(back).toHaveAttribute('href', '/pt')
  })
})
