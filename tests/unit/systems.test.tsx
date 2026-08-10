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

  // O CARD NÃO MOSTRA MAIS MÉTRICA TÉCNICA. Dois testes viviam aqui — o de
  // separador de milhar por locale e o de rótulo vindo do dicionário — e os
  // dois saíram porque o card deixou de exibir número.
  //
  // A COBERTURA NÃO SUMIU, MUDOU DE ARQUIVO: os dois invariantes continuam
  // valendo no cabeçalho do case study, que é onde as métricas passaram a
  // viver, e estão travados em tests/unit/case-study.test.tsx ("formata
  // número pelo locale, não com String()" e "o rótulo de cada métrica do
  // topo vem do dicionário"). Apagar teste sem conferir para onde foi a
  // cobertura é como a regressão volta.
  it('o card não exibe métrica técnica — esse conteúdo é do case study', () => {
    setReducedMotion(true)
    render(<Systems dict={pt} locale="pt" />)

    for (const system of systems) {
      const card = cardFor(system.name)
      for (const metric of system.metrics) {
        expect(
          card.queryByText(metricLabel(metric.key)),
          `o rótulo "${metricLabel(metric.key)}" voltou para o card de ${system.name}`,
        ).not.toBeInTheDocument()
      }
    }
  })

  // O QUE O CARD MOSTRA AGORA: o que o sistema mudou para a empresa. A home
  // é onde um dono de negócio decide se continua lendo, e contagem de tabela
  // não responde a pergunta dele.
  it('cada card mostra três melhorias que o sistema trouxe', () => {
    setReducedMotion(true)
    render(<Systems dict={pt} locale="pt" />)

    for (const system of systems) {
      const card = cardFor(system.name)
      const melhorias = pt.systems.detail[system.slug].improvements
      // Três, sempre: os cards ficam lado a lado e uma lista mais longa que a
      // vizinha desalinha a fileira.
      expect(melhorias, `${system.slug} não tem exatamente três melhorias`).toHaveLength(3)
      for (const m of melhorias) {
        expect(m.length, `melhoria vazia em ${system.slug}`).toBeGreaterThan(10)
        expect(card.getByText(m)).toBeInTheDocument()
      }
    }
  })

  // Mesma regra do `outcome`: a melhoria descreve uma mudança, nunca um
  // resultado medido que ninguém mediu.
  it('nenhuma melhoria afirma resultado percentual ou multiplicador', () => {
    for (const dict of [pt, en]) {
      for (const system of systems) {
        for (const m of dict.systems.detail[system.slug].improvements) {
          for (const inventado of [/\d\s*%/, /\d+\s*vezes/i, /\d+\s*times\b/i, /dobr|tripl|double/i]) {
            expect(m, `melhoria de "${system.slug}" afirma resultado não medido`).not.toMatch(inventado)
          }
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
