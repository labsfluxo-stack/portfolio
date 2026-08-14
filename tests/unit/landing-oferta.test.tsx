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
  it('é a faixa escura', () => {
    const { container } = render(<Dupla dict={pt} />)
    expect(container.querySelector('.bg-bg, .bg-ink')).toBeTruthy()
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

  it('exibe o tamanho do time como número, não como desculpa', () => {
    render(<Dupla dict={pt} />)
    expect(screen.getByText('2')).toBeInTheDocument()
    const { container } = render(<Dupla dict={pt} />)
    expect(container.textContent).not.toMatch(/apesar|pequen/i)
  })
})
