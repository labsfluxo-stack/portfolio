import { render, screen, within } from '@testing-library/react'
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

  // Eram cinco seções. A quinta era "O que eu faria diferente", e saiu: num
  // portfólio, a última coisa antes de o leitor deixar a página passava a
  // ser o erro do autor.
  it('as quatro seções internas viram h2 com os rótulos de caseLabels', () => {
    setReducedMotion(true)
    render(<CaseStudy system={systemFor('oscapstack')} dict={pt} locale="pt" />)
    const { caseLabels } = pt.systems
    for (const label of [caseLabels.problem, caseLabels.architecture, caseLabels.decisions, caseLabels.stack]) {
      const heading = screen.getAllByRole('heading', { level: 2 }).find((h) => h.textContent?.includes(label))
      expect(heading, `h2 com "${label}" não encontrado`).toBeDefined()
    }
  })

  // A página termina nas decisões e no stack, não numa retrospectiva. Sem
  // esta trava, a seção volta na primeira vez que alguém achar que "mostra
  // maturidade" — mostra, mas no lugar errado.
  it('não existe seção de retrospectiva no fim da página', () => {
    setReducedMotion(true)
    const { container } = render(<CaseStudy system={systemFor('oscapstack')} dict={pt} locale="pt" />)
    expect(container.querySelector('#retro'), 'a seção de retrospectiva voltou').toBeNull()
    const texto = container.textContent ?? ''
    expect(texto).not.toMatch(/faria diferente/i)
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

  // Exigia uma nota ("Código proprietário — sem repositório público.") que
  // repetia o selo PROPRIETÁRIO do cabeçalho desta mesma página. A nota saiu;
  // o invariante fica: sistema fechado nunca ganha link morto.
  it('sistema proprietário não mostra link de repositório, e o selo continua informando', () => {
    setReducedMotion(true)
    render(<CaseStudy system={systemFor('saturno-labs')} dict={pt} locale="pt" />)
    expect(screen.queryByRole('link', { name: pt.systems.viewRepo })).not.toBeInTheDocument()
    expect(screen.getByText(pt.systems.statusLabels.proprietary)).toBeInTheDocument()
  })

  it('sistema não proprietário com repoUrl mostra o link com o rótulo do dicionário, nunca a URL crua como texto', () => {
    setReducedMotion(true)
    render(<CaseStudy system={systemFor('moveis-pro')} dict={pt} locale="pt" />)
    const link = screen.getByRole('link', { name: pt.systems.viewRepo })
    expect(link).toHaveAttribute('href', 'https://github.com/netoguild-rgb/Moveis.pro')
    expect(screen.queryByText('https://github.com/netoguild-rgb/Moveis.pro')).not.toBeInTheDocument()
  })

  it('renderiza problem e architecture do dicionário', () => {
    setReducedMotion(true)
    render(<CaseStudy system={systemFor('oscapstack')} dict={pt} locale="pt" />)
    const detail = pt.systems.detail.oscapstack
    expect(screen.getByText(detail.problem)).toBeInTheDocument()
    expect(screen.getByText(detail.architecture)).toBeInTheDocument()
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

  // Escopado à seção Stack, não à página inteira: o diagrama da Arquitetura
  // (components/diagrams/) também escreve "Fastify 5", "PostgreSQL" e
  // "React" dentro do SVG, e um `getByText` de documento inteiro passou a
  // achar dois elementos e quebrar. A ambiguidade era do teste, não do
  // componente — o que ele quer provar é que a seção Stack lista tudo.
  it('a seção Stack lista cada tecnologia do case study', () => {
    setReducedMotion(true)
    const { container } = render(<CaseStudy system={systemFor('oscapstack')} dict={pt} locale="pt" />)
    const stack = container.querySelector('#stack')
    expect(stack, 'seção #stack não encontrada').toBeTruthy()
    for (const tech of pt.systems.detail.oscapstack.stack) {
      expect(within(stack as HTMLElement).getByText(tech)).toBeInTheDocument()
    }
  })

  it('o rótulo de cada métrica do topo vem do dicionário, nunca da chave crua', () => {
    setReducedMotion(true)
    render(<CaseStudy system={systemFor('oscapstack')} dict={pt} locale="pt" />)
    expect(screen.getByText(metricLabel('policies'))).toBeInTheDocument()
    expect(screen.queryByText('policies')).not.toBeInTheDocument()
  })

  // Fixava '78,900' — a contagem de linhas do OSCapstack — e quebrou quando
  // os cards deixaram de repetir as categorias da Telemetria (ver
  // content/systems.ts). Nenhuma métrica real chega a mil hoje, então o
  // separador de milhar não é observável nos dados: um `String(valor)` no
  // lugar de `formatNumber(valor, locale)` passaria despercebido para
  // sempre. Um sistema sintético prova o comportamento do componente sem
  // depender do conteúdo — mesma correção de tests/unit/systems.test.tsx.
  //
  // O sistema sintético mantém TODAS as chaves de métrica do original e só
  // infla um valor: o diagrama da Arquitetura lê `screens` por chave e lança
  // de propósito se ela faltar (ver components/diagrams/SystemDiagram.tsx),
  // então trocar o array inteiro por uma métrica só derrubava a página.
  // E a asserção é escopada ao <header>, porque o número inflado também
  // aparece dentro do SVG do diagrama.
  it('formata número pelo locale, não com String()', () => {
    setReducedMotion(true)
    const original = systemFor('oscapstack')
    const grande = {
      ...original,
      metrics: original.metrics.map((m) => (m.key === 'policies' ? { ...m, value: 78900 } : m)),
    }

    const { container, rerender } = render(<CaseStudy system={grande} dict={en} locale="en" />)
    const header = () => within(container.querySelector('header') as HTMLElement)
    expect(header().getByText('78,900')).toBeInTheDocument()
    expect(header().queryByText('78.900')).not.toBeInTheDocument()

    rerender(<CaseStudy system={grande} dict={pt} locale="pt" />)
    expect(header().getByText('78.900')).toBeInTheDocument()
    expect(header().queryByText('78,900')).not.toBeInTheDocument()
  })

  it('tem um único link de volta para a home, com o rótulo do dicionário', () => {
    setReducedMotion(true)
    render(<CaseStudy system={systemFor('oscapstack')} dict={pt} locale="pt" />)
    const back = screen.getByRole('link', { name: pt.systems.caseLabels.backToHome })
    expect(back).toHaveAttribute('href', '/pt')
  })
})
