import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Oferta } from '@/components/landing/Oferta'
import { Dupla } from '@/components/landing/Dupla'
import { pt } from '@/content/pt'

describe('Oferta', () => {
  it('mostra os três cartões', () => {
    render(<Oferta dict={pt} />)
    for (const cartao of pt.landing.oferta.cartoes) {
      expect(screen.getByText(cartao.nome)).toBeInTheDocument()
    }
  })
})

describe('Dupla', () => {
  /**
   * ERA A FAIXA ESCURA, E DEIXOU DE SER.
   *
   * O hero virou escuro por decisão do dono, e a `Dupla` vem imediatamente
   * abaixo dele: duas bandas escuras coladas viravam um bloco só de ~1400px
   * com a fronteira dissolvida logo na abertura. A alternância claro/escuro da
   * página é o que dá ritmo à rolagem, então a `Dupla` inverteu junto.
   *
   * O QUE ESTE TESTE PASSA A GUARDAR é a consequência que morde: sobre o papel
   * claro, `--color-data` (#38BDF8) cai para 1,93:1 e reprova AA. Enquanto a
   * seção era escura, o ciano era legítimo aqui — e era a única arte da página
   * autorizada a usá-lo. Invertida a polaridade, todo ciano desta seção teve
   * de virar `--color-accent` (#0369A1, 5,35:1), tanto nos números quanto na
   * arte. É o mesmo guarda que `landing-topo.test.tsx` já faz no `Criterio`.
   */
  it('não usa o token do tema escuro depois de virar seção clara', () => {
    const { container } = render(<Dupla dict={pt} />)
    expect(container.querySelector('.bg-bg, .bg-ink'), 'a Dupla voltou a ser faixa escura sem revisar o ciano').toBeNull()
    expect(container.innerHTML).not.toContain('text-data')
    expect(container.innerHTML).not.toContain('stroke-data')
    expect(container.innerHTML).not.toContain('fill-data')
  })

  /**
   * A REGRA MAIS IMPORTANTE DESTE ARQUIVO.
   *
   * Os números de anos e de sistemas em produção já existem em
   * `dict.telemetry`, cada um com o campo `provenance` dizendo como foi
   * medido. Se a landing os escrevesse à mão, as duas páginas divergiriam na
   * primeira recontagem — e a página cujo argumento inteiro é honestidade
   * técnica estaria mentindo em silêncio.
   *
   * Durante a redação do spec este erro aconteceu de verdade: foi escrito
   * "3 sistemas no ar", confundindo com os três cases. O valor real é 5.
   */
  it('os números vêm da telemetria, não estão escritos no componente', () => {
    render(<Dupla dict={pt} />)
    const producao = pt.telemetry.metrics.find((m) => m.key === 'production')
    expect(producao, 'a métrica de sistemas em produção sumiu da telemetria').toBeDefined()
    expect(screen.getByText(producao!.value)).toBeInTheDocument()
  })

  // Achado C-a da revisão final de branch: o teste acima só pega um valor
  // ERRADO hard-coded -- se alguém escrevesse '5' (o valor certo de hoje) à
  // mão no componente, em vez de lê-lo de `dict.telemetry`, este teste
  // passaria em silêncio. Sentinela: troca o valor real por um que não
  // poderia existir por acaso, e confere que ELE aparece -- só passa se
  // `Dupla` de fato ler o dado do `dict` recebido, nunca de uma cópia local.
  it('lê o valor de produção do dict recebido, não de uma cópia hard-coded', () => {
    const dictFake = {
      ...pt,
      telemetry: {
        ...pt.telemetry,
        metrics: pt.telemetry.metrics.map((m) =>
          m.key === 'production' ? { ...m, value: 'SENTINELA-42' } : m,
        ),
      },
    }
    render(<Dupla dict={dictFake} />)
    expect(screen.getByText('SENTINELA-42')).toBeInTheDocument()
  })

  /**
   * ERA "exibe o tamanho do time como número", e travava o `2`.
   *
   * A entrega passou a ser de uma pessoa só, e a seção deixou de CONTAR
   * PESSOAS: ela fala de acesso direto e de propriedade do código. O guarda que
   * sobrevive à mudança — e que continua valendo — é o outro: a seção nunca
   * pode pedir desculpa pelo tamanho.
   *
   * O teste ganhou o par disso. "Sozinho", "apenas eu" e afins são exatamente o
   * enquadramento que a reescrita existe para evitar: o cliente compra falar
   * com quem escreve o código, não o número de pessoas que escrevem.
   */
  it('não conta pessoas nem pede desculpa pelo tamanho', () => {
    const { container } = render(<Dupla dict={pt} />)
    expect(container.textContent).not.toMatch(/apesar|pequen/i)
    expect(container.textContent).not.toMatch(/sozinh|apenas eu|somente eu|uma pessoa só/i)
    expect(container.textContent).not.toMatch(/\bdois desenvolvedores\b|\bdupla\b/i)
  })

  /**
   * A PROMESSA QUE SUBSTITUIU A DUPLA, travada por teste porque é ela que
   * responde à objeção de ponto único de falha. Se alguém apagar essa frase, a
   * seção volta a não ter resposta para a pergunta mais cara da página.
   */
  it('responde ao ponto único de falha com o código, não com gente', () => {
    const { container } = render(<Dupla dict={pt} />)
    expect(container.textContent).toMatch(/reposit[óo]rio/i)
    expect(container.textContent).toMatch(/teste/i)
  })
})
