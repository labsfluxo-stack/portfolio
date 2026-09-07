import { act } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { PredioIndicador } from '@/components/predio/PredioIndicador'
import { resetIntersectionObservers, triggerIntersection } from '../mocks/intersection-observer'

const itens = [
  { id: 'andar-a', rotulo: 'Andar A' },
  { id: 'andar-b', rotulo: 'Andar B' },
]

/**
 * MESMO PADRÃO de components/blog/Indice.tsx e do teste que o acompanharia:
 * a pilha de links sai pronta do servidor (funciona sem JavaScript, é o que
 * o leitor de tela e o crawler enxergam) — só o destaque do andar atual
 * depende de JS. Por isso os dois primeiros testes não tocam em
 * `IntersectionObserver` nenhum: verificam o que já está no HTML.
 */
describe('PredioIndicador', () => {
  afterEach(() => {
    resetIntersectionObservers()
  })

  it('lista cada andar como link real, com rótulo acessível e destino em âncora', () => {
    document.body.innerHTML = '<div id="andar-a"></div><div id="andar-b"></div>'
    render(<PredioIndicador itens={itens} rotuloNav="Andares do prédio" />)
    const nav = screen.getByRole('navigation', { name: 'Andares do prédio' })
    for (const item of itens) {
      const link = within(nav).getByRole('link', { name: item.rotulo })
      expect(link).toHaveAttribute('href', `#${item.id}`)
    }
  })

  it('sem nenhum andar cruzando a metade da tela, nenhum link é marcado atual', () => {
    document.body.innerHTML = '<div id="andar-a"></div><div id="andar-b"></div>'
    render(<PredioIndicador itens={itens} rotuloNav="Andares do prédio" />)
    for (const item of itens) {
      expect(screen.getByRole('link', { name: item.rotulo })).not.toHaveAttribute('aria-current')
    }
  })

  it('marca como atual o andar que a interseção reporta, e só ele', () => {
    document.body.innerHTML = '<div id="andar-a"></div><div id="andar-b"></div>'
    render(<PredioIndicador itens={itens} rotuloNav="Andares do prédio" />)
    const elB = document.getElementById('andar-b')!

    act(() => {
      triggerIntersection([
        { isIntersecting: true, target: elB, boundingClientRect: { top: 0 } } as unknown as IntersectionObserverEntry,
      ])
    })

    expect(screen.getByRole('link', { name: 'Andar B' })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('link', { name: 'Andar A' })).not.toHaveAttribute('aria-current')
  })
})
