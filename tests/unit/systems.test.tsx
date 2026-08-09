import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Systems } from '@/components/sections/Systems'
import { SystemCard } from '@/components/sections/SystemCard'
import { pt } from '@/content/pt'
import { en } from '@/content/en'
import { systems, type System } from '@/content/systems'

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

  // O teste exigia uma nota ("Código proprietário — sem repositório
  // público.") no lugar do link. Ela saiu: repetia o selo PROPRIETÁRIO que o
  // mesmo card exibe no topo, e a segunda vez soava como justificativa. O
  // invariante que importa não mudou — sistema fechado não pode ganhar link
  // morto nem botão desabilitado.
  it('sistema fechado não mostra link de repositório; o aberto mostra', () => {
    setReducedMotion(true)
    render(<Systems dict={pt} locale="pt" />)

    for (const name of ['OSCapstack CRM', 'Saturno Labs']) {
      const card = cardFor(name)
      expect(card.queryByRole('link', { name: /github/i })).not.toBeInTheDocument()
      expect(card.queryByText(pt.systems.viewRepo)).not.toBeInTheDocument()
      // O selo continua sendo quem informa que o código é fechado.
      expect(card.getByText(pt.systems.statusLabels.proprietary)).toBeInTheDocument()
    }

    // Moveis.pro não é proprietário e tem repoUrl: mostra o link. O texto é o
    // rótulo do dicionário, nunca a URL crua (ruído visual e péssimo para
    // leitor de tela).
    const repoLink = cardFor('Moveis.pro').getByText(pt.systems.viewRepo)
    expect(repoLink.closest('a')).toHaveAttribute('href', 'https://github.com/netoguild-rgb/Moveis.pro')
  })

  // Este teste fixava '78,900' — a contagem de linhas do OSCapstack — e
  // quebrou quando os cards deixaram de repetir as categorias da Telemetria
  // (ver content/systems.ts). O defeito não era o valor estar desatualizado,
  // era depender de um dado que pode legitimamente mudar.
  //
  // E hoje NENHUMA métrica de card chega a mil, então o separador de milhar
  // não é observável nos dados reais: um `String(valor)` no lugar de
  // `formatNumber(valor, locale)` passaria despercebido para sempre. Por
  // isso o teste passou a montar um sistema sintético com um número grande
  // — prova o comportamento do componente sem depender do conteúdo.
  it('o card formata número pelo locale, não com String()', () => {
    setReducedMotion(true)
    const grande = {
      ...(systems[0] as System),
      name: 'Sistema de Teste',
      metrics: [{ key: 'policies', value: 78900 }],
    }

    const { rerender } = render(<SystemCard system={grande} dict={en} locale="en" />)
    expect(screen.getByText('78,900')).toBeInTheDocument()
    expect(screen.queryByText('78.900')).not.toBeInTheDocument()

    rerender(<SystemCard system={grande} dict={pt} locale="pt" />)
    expect(screen.getByText('78.900')).toBeInTheDocument()
    expect(screen.queryByText('78,900')).not.toBeInTheDocument()
  })

  // Idem: era só o OSCapstack e só a chave `tables`, que nem existe mais.
  // Agora percorre tudo — qualquer métrica nova de qualquer sistema entra
  // nesta verificação sozinha, sem ninguém lembrar de atualizar o teste.
  it('o rótulo de cada métrica vem do dicionário, nunca da chave crua', () => {
    setReducedMotion(true)
    render(<Systems dict={pt} locale="pt" />)

    for (const system of systems) {
      const card = cardFor(system.name)
      for (const metric of system.metrics) {
        expect(card.getByText(metricLabel(metric.key))).toBeInTheDocument()
        // Só acusa se o rótulo do dicionário FOR diferente da chave; em
        // `packages` e `models` os dois coincidem de propósito, e ali não há
        // o que distinguir.
        if (metricLabel(metric.key) !== metric.key) {
          expect(card.queryByText(metric.key)).not.toBeInTheDocument()
        }
      }
    }
  })

  // A descrição de cada sistema no card. Sem ela, o card mostra nome, selos
  // e números — e quem não conhece "OSCapstack CRM" sai sem saber do que se
  // trata. É a única linha do card que fala com quem lê para contratar.
  it('cada card diz o que o sistema é', () => {
    setReducedMotion(true)
    render(<Systems dict={pt} locale="pt" />)

    for (const system of systems) {
      const card = cardFor(system.name)
      const tagline = pt.systems.detail[system.slug].tagline
      expect(tagline.length, `tagline vazia para ${system.slug}`).toBeGreaterThan(20)
      expect(card.getByText(tagline)).toBeInTheDocument()
    }
  })
})
