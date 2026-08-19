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

  it('lista os sistemas e liga cada um ao case study do idioma certo', () => {
    render(<ProvaEngenharia dict={pt} locale="pt" />)
    for (const sistema of systems) {
      const link = screen.getByRole('link', { name: new RegExp(sistema.name) })
      expect(link.getAttribute('href')).toBe(`/pt/sistemas/${sistema.slug}`)
    }
  })
})
