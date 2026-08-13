import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LandingCta } from '@/components/landing/LandingCta'
import { Perguntas } from '@/components/landing/Perguntas'
import { BarraCta } from '@/components/landing/BarraCta'
import { pt } from '@/content/pt'

describe('LandingCta', () => {
  it('é a segunda faixa escura e leva ao mesmo destino', () => {
    const { container } = render(<LandingCta dict={pt} />)
    expect(container.querySelector('.bg-ink')).toBeTruthy()
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', expect.stringContaining(pt.contact.whatsapp))
  })

  // O medo de quem clica não é o preço, é ser perseguido por vendedor.
  it('diz o que acontece do outro lado', () => {
    render(<LandingCta dict={pt} />)
    expect(screen.getByText(pt.landing.cta.tranquilizador)).toBeInTheDocument()
  })
})

describe('Perguntas', () => {
  it('responde a objeção que o visitante não verbalizou', () => {
    render(<Perguntas dict={pt} />)
    for (const item of pt.landing.perguntas.itens) {
      expect(screen.getByText(item.pergunta)).toBeInTheDocument()
    }
  })
})

describe('BarraCta', () => {
  /**
   * NÃO É A BOLHA VERDE FLUTUANTE, e a evidência inverte o senso comum: o que
   * defende a bolha vem de fornecedor de widget, e o que a condena vem de
   * pesquisa independente. O Baymard documenta que ela cobre o conteúdo que a
   * pessoa está tentando ler no celular, e o NN/g registrou participantes
   * IGNORANDO COMPLETAMENTE um botão de chat flutuante em posição inesperada.
   */
  it('é barra de largura total, não bolha redonda', () => {
    const { container } = render(<BarraCta dict={pt} />)
    const barra = container.firstElementChild
    expect(barra?.className).toContain('inset-x-0')
    expect(barra?.className).not.toContain('rounded-full')
  })

  it('some no desktop, onde o CTA inline já existe', () => {
    const { container } = render(<BarraCta dict={pt} />)
    expect(container.firstElementChild?.className).toContain('md:hidden')
  })

  // O verde saturado do WhatsApp dá 1,79:1 sobre o papel — reprova — e é o
  // marcador visual de widget genérico de construtor de página.
  it('não usa o verde do WhatsApp como cor de fundo', () => {
    const { container } = render(<BarraCta dict={pt} />)
    expect(container.innerHTML).not.toContain('#25D366')
    expect(container.innerHTML).not.toContain('25d366')
  })
})
