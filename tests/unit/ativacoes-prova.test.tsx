import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProvaEngenharia } from '@/components/ativacoes/ProvaEngenharia'
import { pt } from '@/content/pt'
import { systems } from '@/content/systems'

describe('prova de engenharia', () => {
  // Spec §6.2: nenhum número escrito à mão. O dicionário carrega `{producao}`
  // e o render substitui — do contrário, o dia em que um sistema mudar de
  // status a página passa a mentir e nada quebra.
  it('substitui {producao} pela contagem real de sistemas em produção', () => {
    render(<ProvaEngenharia dict={pt} locale="pt" />)
    const emProducao = systems.filter((s) => s.production).length
    const esperado = pt.ativacoes.prova.lead.replace('{producao}', String(emProducao))
    expect(screen.getByText(esperado)).toBeInTheDocument()
  })

  it('não deixa o marcador cru chegar na tela', () => {
    const { container } = render(<ProvaEngenharia dict={pt} locale="pt" />)
    expect(container.textContent).not.toContain('{producao}')
  })

  // Achado da revisão: a página apagou Header/Footer/SkipLink porque todo
  // item de menu é uma saída — e esta seção tinha reaberto quatro (três
  // cards clicáveis + o link final), o mesmo defeito que
  // `components/landing/Prova.tsx` já corrigiu na página irmã. Este teste
  // guarda a correção (cards inertes, uma saída só), não o defeito.
  it('mantém os cards inertes e apenas uma saída na seção', () => {
    render(<ProvaEngenharia dict={pt} locale="pt" />)

    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAttribute('href', '/pt')

    for (const sistema of systems) {
      // Nome e tagline continuam na tela, como texto simples...
      const nome = screen.getByText(sistema.name)
      expect(nome).toBeInTheDocument()
      expect(screen.getByText(pt.systems.detail[sistema.slug].tagline)).toBeInTheDocument()
      // ...mas nenhum nome de sistema pode estar dentro de um <a>: reintroduzir
      // o link no card é o erro mais fácil de cometer de novo.
      expect(nome.closest('a')).toBeNull()
    }
  })
})
