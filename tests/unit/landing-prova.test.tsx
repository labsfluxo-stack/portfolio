import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Prova } from '@/components/landing/Prova'
import { pt } from '@/content/pt'
import { en } from '@/content/en'
import { systems, SYSTEM_SLUGS } from '@/content/systems'

describe('Prova', () => {
  it('lista os três sistemas que já existem, sem duplicar conteúdo', () => {
    render(<Prova dict={pt} locale="pt" />)
    for (const slug of SYSTEM_SLUGS) {
      expect(screen.getByText(pt.systems.detail[slug].name)).toBeInTheDocument()
    }
  })

  // Era `caso.outcome`, um parágrafo por sistema. Virou `improvements`: três
  // frases curtas, cada uma uma MUDANÇA na operação de quem usa, já escritas
  // para dono de empresa. O parágrafo continua vivo no case study.
  it('mostra o que mudou na operação, em frases curtas', () => {
    render(<Prova dict={pt} locale="pt" />)
    for (const slug of SYSTEM_SLUGS) {
      const melhorias = pt.systems.detail[slug].improvements
      expect(melhorias.length, `sistema "${slug}" sem melhoria nenhuma`).toBeGreaterThan(0)
      for (const m of melhorias) expect(screen.getByText(m)).toBeInTheDocument()
    }
  })

  // O PRAZO É O ÚNICO NÚMERO QUE SOBROU, e de propósito: é o que um dono de
  // empresa lê sem tradução. Sai de `duration`, com a precisão que a fonte tem
  // — "26 dias" onde o histórico do repositório dá o exato, "menos de 45 dias"
  // onde só existe o limite. Exibir "45" nos dois seria inventar precisão.
  it('mostra o prazo de cada sistema, com a precisão da fonte', () => {
    render(<Prova dict={pt} locale="pt" />)
    for (const slug of SYSTEM_SLUGS) {
      const prazo = pt.systems.detail[slug].duration
      expect(screen.getAllByText(new RegExp(prazo)).length, `prazo de "${slug}" ausente`).toBeGreaterThan(0)
    }
  })

  /**
   * O ERRO QUE O DONO PEGOU, travado para não voltar.
   *
   * A correção do achado C1 pôs `system.metrics` em corpo 5xl — 146 RLS
   * policies, 42 telas, 13 jobs cron. Números honestos, medidos, e ilegíveis
   * para o público desta página: eram os MAIORES elementos da seção mais
   * importante e não diziam nada a quem a lê.
   *
   * É o erro que a pesquisa nomeia — o dev prova competência técnica e esquece
   * de provar resultado — e ele sobreviveu justamente porque a métrica era
   * verdadeira. Honesta não é o mesmo que relevante.
   */
  it('não exibe métrica técnica: RLS policy e job cron não dizem nada a dono de empresa', () => {
    const { container } = render(<Prova dict={pt} locale="pt" />)
    const texto = container.textContent ?? ''
    for (const system of systems) {
      for (const metric of system.metrics) {
        expect(texto, `voltou a métrica técnica "${metric.key}" (${metric.value})`).not.toMatch(
          new RegExp(`\\b${metric.value}\\b`),
        )
      }
    }
    expect(texto, 'voltou vocabulário de desenvolvedor').not.toMatch(/RLS|cron|package/i)
  })

  // A regressão de verdade do achado C1: "três sistemas em operação" era FALSO
  // porque só 2 de 3 sistemas têm `production: true`. Nenhuma contagem de
  // sistema pode voltar a ser escrita à mão em `dict.landing.prova` — o único
  // jeito seguro de mostrar esse número é computado no render.
  it('prova.titulo e prova.lead não hard-codam contagem de sistema', () => {
    const contagem = /\b(\d+|um|uma|dois|duas|tr[êe]s|quatro|cinco|one|two|three|four|five)\b/i
    for (const dict of [pt, en]) {
      expect(dict.landing.prova.titulo, 'título hard-coda uma contagem').not.toMatch(contagem)
      expect(dict.landing.prova.lead, 'lead hard-coda uma contagem').not.toMatch(contagem)
    }
  })

  // Achado I6 (Important) da revisão final de branch: cada card era um <Link>
  // inteiro para o polo escuro do portfólio, sem rota de volta — três saídas
  // grandes numa página que apagou o menu para não ter saída nenhuma. Decisão
  // do dono: os cards deixam de ser clicáveis; existe UM link no fim da seção.
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
