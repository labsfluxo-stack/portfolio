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
    render(<Criterio dict={pt} locale="pt" />)
    for (const teste of pt.landing.criterio.testes) {
      expect(screen.getByText(teste.titulo)).toBeInTheDocument()
    }
    expect(pt.landing.criterio.testes).toHaveLength(2)
  })

  /**
   * ESTA SEÇÃO ESCURECEU, e o guarda mudou de assunto junto.
   *
   * Ele travava "não usa `text-data`", porque o ciano reprova em fundo claro
   * (1,93:1) e o `Criterio` era uma das seções claras. Agora ele é escuro, e o
   * ciano não só é permitido como é necessário: `--color-accent` (#0369A1) sobre
   * preto fica quase invisível na barra dos dois testes.
   *
   * A inversão é feita por REDEFINIÇÃO DE TOKEN no elemento, não por troca de
   * classe — é o que faz o formulário da auditoria, com suas ~30 classes de
   * polaridade clara, virar junto sem ser tocado. O que precisa ser travado,
   * então, é a existência dessa redefinição: sem ela a seção volta a renderizar
   * texto claro sobre fundo claro, e nenhum outro teste pega isso.
   */
  it('declara a inversão de polaridade que a auditoria inteira herda', () => {
    const { container } = render(<Criterio dict={pt} locale="pt" />)
    const secao = container.querySelector('section')
    const estilo = secao?.getAttribute('style') ?? ''
    expect(estilo, 'sem a redefinição de --color-paper a seção não escurece').toContain('--color-paper')
    expect(estilo, 'sem --color-ink o texto fica escuro sobre escuro').toContain('--color-ink')
    expect(estilo, 'o acento precisa virar ciano: #0369A1 some sobre preto').toContain('#38BDF8')
  })
})
