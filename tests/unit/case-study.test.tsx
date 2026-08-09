import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CaseStudy } from '@/components/sections/CaseStudy'
import { pt } from '@/content/pt'
import { en } from '@/content/en'
import { systems } from '@/content/systems'
import { SYSTEM_SLUGS, type SystemSlug } from '@/content/types'

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

  // A página não termina em retrospectiva. Sem esta trava, a seção volta na
  // primeira vez que alguém achar que "mostra maturidade" — mostra, mas no
  // lugar errado: era a última coisa antes de o leitor sair.
  it('não existe seção de retrospectiva no fim da página', () => {
    setReducedMotion(true)
    const { container } = render(<CaseStudy system={systemFor('oscapstack')} dict={pt} locale="pt" />)
    expect(container.querySelector('#retro'), 'a seção de retrospectiva voltou').toBeNull()
    expect(container.textContent ?? '').not.toMatch(/faria diferente/i)
  })

  // Guiado pelos dados, não por slug fixo: o dono está preenchendo os
  // outcomes um a um conforme lembra o estado ANTES de cada cliente, e um
  // teste que fixasse "saturno não tem" quebraria no dia em que ele tiver —
  // sem nada de errado ter acontecido. Já quebrou uma vez assim.
  it('o case com outcome fecha em "O que mudou"; o sem outcome termina no stack', () => {
    setReducedMotion(true)
    const com = SYSTEM_SLUGS.filter((slug) => pt.systems.detail[slug].outcome)
    const sem = SYSTEM_SLUGS.filter((slug) => !pt.systems.detail[slug].outcome)
    expect(com.length, 'nenhum case tem outcome — a seção virou código morto').toBeGreaterThan(0)

    for (const slug of com) {
      const view = render(<CaseStudy system={systemFor(slug)} dict={pt} locale="pt" />)
      expect(view.container.querySelector('#mudou'), `${slug} tem outcome e não renderizou a seção`).toBeTruthy()
      expect(view.container.textContent ?? '').toContain(pt.systems.detail[slug].outcome as string)
      view.unmount()
    }

    // Sem o dado do cliente, a seção some inteira — nunca um bloco vazio nem
    // um texto de preenchimento.
    for (const slug of sem) {
      const view = render(<CaseStudy system={systemFor(slug)} dict={pt} locale="pt" />)
      expect(view.container.querySelector('#mudou'), `${slug} não tem outcome e renderizou a seção`).toBeNull()
      view.unmount()
    }
  })

  // Era a informação mais ausente da página. Sem ela o leitor resolve a
  // ambiguidade sozinho, e resolve pelo lado pessimista — "sei lá quantos
  // eram". Declarar o time de dois fortalece os números em vez de
  // diminui-los.
  it('o cabeçalho declara time e prazo em todos os cases', () => {
    setReducedMotion(true)
    for (const slug of SYSTEM_SLUGS) {
      const view = render(<CaseStudy system={systemFor(slug)} dict={pt} locale="pt" />)
      const { team, duration } = pt.systems.detail[slug]
      expect(team.length, `case "${slug}" sem time declarado`).toBeGreaterThan(5)
      expect(duration.length, `case "${slug}" sem prazo declarado`).toBeGreaterThan(5)

      const cabecalho = view.container.querySelector('header')?.textContent ?? ''
      expect(cabecalho, `time de "${slug}" ausente do cabeçalho`).toContain(team)
      expect(cabecalho, `prazo de "${slug}" ausente do cabeçalho`).toContain(duration)
      view.unmount()
    }
  })

  // O prazo só é honesto ACOMPANHADO do time — sozinho, ele afirma velocidade
  // sem dar o denominador para julgá-la. Se um dia o time sair da tela, o
  // prazo tem de sair junto.
  it('o prazo nunca aparece sem o time ao lado', () => {
    setReducedMotion(true)
    for (const slug of SYSTEM_SLUGS) {
      const view = render(<CaseStudy system={systemFor(slug)} dict={pt} locale="pt" />)
      const { team, duration } = pt.systems.detail[slug]
      const linha = Array.from(view.container.querySelectorAll('p')).find((p) =>
        (p.textContent ?? '').includes(duration),
      )
      expect(linha, `prazo de "${slug}" não renderizou`).toBeDefined()
      expect(linha?.textContent ?? '', `prazo de "${slug}" está sozinho, sem o time`).toContain(team)
      view.unmount()
    }
  })

  // Nada em nenhum idioma pode sugerir trabalho solo: os três foram feitos a
  // dois. Uma frase errada aqui não é exagero de marketing, é afirmação falsa
  // sobre a história profissional do dono.
  //
  // A primeira versão desta trava usava /sozinh/i e reprovou "a mensageria
  // responde SOZINHA o que é repetitivo" — que descreve o sistema, não o
  // autor. O feminino em português descreve a coisa ("a operação roda
  // sozinha"); o masculino é como o dono se referiria a si mesmo. Uma trava
  // ampla demais que acusa texto correto é pior que trava nenhuma: ensina a
  // ignorar o vermelho.
  const SUGERE_SOLO: Record<'pt' | 'en', RegExp[]> = {
    pt: [/\bsozinho\b/i, /por conta pr[óo]pria/i, /eu mesmo constru/i],
    en: [/\bsolo\b/i, /single-handed/i, /on my own\b/i, /by myself\b/i],
  }

  it('nenhum texto de case sugere trabalho solo', () => {
    for (const [locale, dict] of [['pt', pt], ['en', en]] as const) {
      for (const slug of SYSTEM_SLUGS) {
        const caso = dict.systems.detail[slug]
        const texto = [caso.tagline, caso.problem, caso.architecture, caso.outcome ?? ''].join(' ')
        for (const solo of SUGERE_SOLO[locale]) {
          expect(texto, `case "${slug}" (${locale}) sugere trabalho solo`).not.toMatch(solo)
        }
      }
    }
  })

  // A TRAVA QUE MAIS IMPORTA NESTA SEÇÃO. "O que mudou" é a superfície onde
  // mais dá vontade de escrever um resultado redondo — "reduziu 40% do
  // tempo", "triplicou a conversão" — e nenhum desses números foi medido. O
  // site inteiro foi construído sobre afirmação conferível; um percentual
  // inventado aqui derrubaria a credibilidade das outras quatro seções
  // junto.
  it('nenhum outcome afirma resultado percentual ou multiplicador não medido', () => {
    for (const dict of [pt, en]) {
      for (const slug of SYSTEM_SLUGS) {
        const outcome = dict.systems.detail[slug].outcome
        if (!outcome) continue
        for (const inventado of [/\d\s*%/, /\bx\s*\d/i, /\d+\s*vezes/i, /\d+\s*times\b/i, /dobr|tripl|double|tripl/i]) {
          expect(
            outcome,
            `outcome de "${slug}" afirma um resultado que ninguém mediu (${inventado})`,
          ).not.toMatch(inventado)
        }
      }
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
