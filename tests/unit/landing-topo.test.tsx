import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LandingHero } from '@/components/landing/LandingHero'
import { Criterio } from '@/components/landing/Criterio'
import { pt } from '@/content/pt'

describe('LandingHero', () => {
  it('o h1 diz o que é e para quem', () => {
    render(<LandingHero dict={pt} />)
    const titulo = screen.getByRole('heading', { level: 1 })
    expect(titulo).toHaveTextContent(pt.landing.hero.titulo)
  })

  it('o CTA aponta para o whatsapp do contato, com a mensagem da landing', () => {
    render(<LandingHero dict={pt} />)
    const link = screen.getByRole('link', { name: new RegExp(pt.landing.cta.rotulo, 'i') })
    expect(link).toHaveAttribute('href', expect.stringContaining(pt.contact.whatsapp))
    expect(link).toHaveAttribute('href', expect.stringContaining('?text='))
  })

  // Achado I3 (Important) da revisão final de branch: sem isto, no desktop o
  // clique navega a aba inteira para fora e a landing some; no navegador do
  // Instagram, sem stack de "voltar" confiável, a troca pode encerrar a
  // sessão. Mesmo tratamento que components/sections/Contact.tsx já dá à
  // MESMA URL de wa.me.
  it('o CTA abre em aba nova', () => {
    render(<LandingHero dict={pt} />)
    const link = screen.getByRole('link', { name: new RegExp(pt.landing.cta.rotulo, 'i') })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noreferrer')
  })

  // Spec §4.1: o piso NÃO aparece na dobra. O padrão brasileiro é publicá-lo
  // depois da prova — antes disso ele filtra sem ter convencido.
  it('não mostra preço na dobra', () => {
    const { container } = render(<LandingHero dict={pt} />)
    expect(container.textContent).not.toMatch(/R\$/)
  })

  it('a dupla aparece já na dobra', () => {
    render(<LandingHero dict={pt} />)
    expect(screen.getByText(pt.landing.hero.assinatura)).toBeInTheDocument()
  })
})

describe('Criterio', () => {
  it('apresenta os dois testes que o cliente pode aplicar sozinho', () => {
    render(<Criterio dict={pt} />)
    for (const teste of pt.landing.criterio.testes) {
      expect(screen.getByText(teste.titulo)).toBeInTheDocument()
    }
    expect(pt.landing.criterio.testes).toHaveLength(2)
  })

  // O ciano reprova em fundo claro (1,93:1). Ele só existe nas duas faixas
  // escuras, e nenhuma delas é esta.
  it('não usa o token de destaque do tema escuro', () => {
    const { container } = render(<Criterio dict={pt} />)
    expect(container.innerHTML).not.toContain('text-data')
    expect(container.innerHTML).not.toContain('bg-data')
  })
})
