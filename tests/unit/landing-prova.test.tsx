import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Prova } from '@/components/landing/Prova'
import { pt } from '@/content/pt'
import { en } from '@/content/en'
import { systems, SYSTEM_SLUGS } from '@/content/systems'
import { formatNumber } from '@/lib/format'

describe('Prova', () => {
  it('lista os três sistemas que já existem, sem duplicar conteúdo', () => {
    render(<Prova dict={pt} locale="pt" />)
    for (const slug of SYSTEM_SLUGS) {
      expect(screen.getByText(pt.systems.detail[slug].name)).toBeInTheDocument()
    }
  })

  // Achado C-c da revisão final de branch: nenhum teste afirmava que
  // `caso.outcome` (o resultado de negócio) de fato chegava à tela.
  it('mostra o outcome de cada case study, não só o nome', () => {
    render(<Prova dict={pt} locale="pt" />)
    for (const slug of SYSTEM_SLUGS) {
      expect(screen.getByText(pt.systems.detail[slug].outcome!)).toBeInTheDocument()
    }
  })

  // Achado B1/C1 CRÍTICO da revisão final de branch: a seção prometia "o
  // número que ele moveu e como foi medido" e renderizava zero dígitos. A
  // correção substantiva é mostrar as métricas reais de content/systems.ts —
  // este teste garante que elas de fato chegam à tela, não só que existem no
  // dado-fonte.
  it('mostra as métricas reais de cada sistema (content/systems.ts), não números inventados', () => {
    render(<Prova dict={pt} locale="pt" />)
    for (const system of systems) {
      for (const metric of system.metrics) {
        expect(
          screen.getAllByText(formatNumber(metric.value, 'pt')).length,
          `métrica "${metric.key}" (${metric.value}) do sistema "${system.slug}" ausente`,
        ).toBeGreaterThan(0)
      }
      expect(system.metrics.length, `sistema "${system.slug}" sem métrica nenhuma`).toBeGreaterThan(0)
    }
  })

  // A regressão de verdade do achado C1: "três sistemas em operação" era
  // FALSO porque só 2 de 3 sistemas têm `production: true`. Nenhuma contagem
  // de sistema pode voltar a ser escrita à mão em `dict.landing.prova` — o
  // único jeito seguro de mostrar esse número é computado no render.
  it('prova.titulo e prova.lead não hard-codam contagem de sistema', () => {
    const contagem = /\b(\d+|um|uma|dois|duas|tr[êe]s|quatro|cinco|one|two|three|four|five)\b/i
    for (const dict of [pt, en]) {
      expect(dict.landing.prova.titulo, 'título hard-coda uma contagem').not.toMatch(contagem)
      expect(dict.landing.prova.lead, 'lead hard-coda uma contagem').not.toMatch(contagem)
    }
  })

  // Achado I6 (Important) da revisão final de branch: cada card era um
  // <Link> inteiro para o polo escuro do portfólio, sem rota de volta — três
  // saídas grandes numa página que apagou o menu para não ter saída nenhuma.
  // Decisão do dono: os cards deixam de ser clicáveis; existe UM link
  // discreto no fim da seção.
  it('os cards não são mais links -- existe um único link no fim da seção', () => {
    render(<Prova dict={pt} locale="pt" />)
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveTextContent(pt.landing.prova.verCase)
    expect(links[0]).toHaveAttribute('href', expect.stringContaining('/pt'))
  })

  // Erro clássico de dev vendendo para não-dev, observado na pesquisa: provar
  // competência técnica e esquecer de provar resultado. Uma das páginas
  // analisadas estampa "Lighthouse 95+" para um público que não avalia isso.
  it('mostra o resultado de negócio, não a métrica de ferramenta', () => {
    const { container } = render(<Prova dict={pt} locale="pt" />)
    expect(container.textContent).not.toMatch(/lighthouse/i)
  })
})
