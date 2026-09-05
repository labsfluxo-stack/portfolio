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

  // A REGRA MUDOU DE "UM LINK" PARA "NENHUM CARD-INTEIRO CLICÁVEL", e vale
  // registrar por que, porque a versão anterior deste teste travava um número.
  //
  // O achado I6 reclamava de TRÊS SAÍDAS GRANDES: cada card era um <Link>
  // inteiro para o polo escuro do portfólio, sem rota de volta, numa página que
  // apagou o menu justamente para não oferecer saída. A correção da época
  // ("existe UM link no fim da seção") resolveu o problema e criou outro, que a
  // auditoria ampla de 2026-09-04 mediu na página no ar: cinco links em toda a
  // landing, QUATRO deles saindo para fora (WhatsApp, e-mail, GitHub), sobrando
  // um interno — e as três rotas de caso, que estão no sitemap, sem nenhum link
  // vindo da página de maior autoridade do site.
  //
  // O que o I6 proibia era a saída GRANDE, não a existência de link. O título
  // do card sublinhado é a affordance mínima de "isto continua"; o link de
  // tratamento forte continua sendo um só, no fim, e continua apontando para o
  // portfólio inteiro em vez de para um caso.
  it('cada caso linka para a própria rota, sem o card inteiro virar clicável', () => {
    const { container } = render(<Prova dict={pt} locale="pt" />)

    for (const slug of SYSTEM_SLUGS) {
      const link = screen.getByRole('link', { name: pt.systems.detail[slug].name })
      expect(link).toHaveAttribute('href', `/pt/sistemas/${slug}`)
      // O ALVO É O TÍTULO, NÃO O CARD. É esta asserção que preserva o I6: se
      // alguém voltar a envolver o `<li>` inteiro no <Link>, o texto acessível
      // do link passa a incluir as melhorias e o teste cai.
      expect(link.textContent).toBe(pt.systems.detail[slug].name)
    }

    // Nenhum <li> é, ele próprio, um link nem contém um link que o cubra.
    for (const item of container.querySelectorAll('li')) {
      expect(item.tagName).toBe('LI')
      expect(item.closest('a'), 'o card inteiro voltou a ser clicável').toBeNull()
    }
  })

  it('mantém um único link de tratamento forte, para o portfólio inteiro', () => {
    render(<Prova dict={pt} locale="pt" />)
    const link = screen.getByRole('link', { name: pt.landing.prova.verCase })
    expect(link).toHaveAttribute('href', '/pt')
  })

  // Erro clássico de dev vendendo para não-dev, observado na pesquisa: provar
  // competência técnica e esquecer de provar resultado. Uma das páginas
  // analisadas estampa "Lighthouse 95+" para um público que não avalia isso.
  it('mostra o resultado de negócio, não a métrica de ferramenta', () => {
    const { container } = render(<Prova dict={pt} locale="pt" />)
    expect(container.textContent).not.toMatch(/lighthouse/i)
  })
})
