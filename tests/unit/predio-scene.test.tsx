import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AncoraDeObjeto } from '@/components/predio/Predio'

/**
 * `Predio.tsx` é o arquivo que a Task 8 vai EDITAR (diferente de
 * `PredioSlot.tsx`, que ela só consome). A invariante "toda âncora sobre o
 * canvas sai da ordem de tabulação" precisa estar aqui, de um jeito que
 * quebre se for violada — não só documentada em prosa num arquivo vizinho.
 *
 * Não renderiza `<Predio>` (a cena): isso arrastaria `<Canvas>` do
 * `@react-three/fiber`, que não sobe em jsdom (mesmo motivo de
 * `Portico.tsx`/`PorticoSlot.tsx`). `AncoraDeObjeto` é só um `<a>`, testável
 * sem nenhum three.js envolvido.
 */
describe('AncoraDeObjeto', () => {
  it('sempre sai da ordem de tabulação (tabIndex -1), mesmo sem o chamador pedir', () => {
    render(<AncoraDeObjeto href="/x">objeto</AncoraDeObjeto>)
    expect(screen.getByRole('link', { name: 'objeto' })).toHaveAttribute('tabindex', '-1')
  })

  /**
   * A garantia não pode depender de o chamador "lembrar" de não passar
   * `tabIndex` — porque é exatamente esse tipo de lembrete que a Task 1
   * (`PredioSlot.tsx`) documentou e ninguém tinha como fazer cumprir. Um
   * chamador que tentasse `tabIndex={0}` continua saindo da ordem de
   * tabulação: o componente é quem decide por último.
   */
  it('não pode ser sobrescrita por um tabIndex explícito do chamador', () => {
    render(
      <AncoraDeObjeto href="/x" tabIndex={0}>
        objeto
      </AncoraDeObjeto>,
    )
    expect(screen.getByRole('link', { name: 'objeto' })).toHaveAttribute('tabindex', '-1')
  })

  it('continua clicável e com href real — só o foco de teclado sai, não o mouse', () => {
    render(<AncoraDeObjeto href="/#sistemas">rack</AncoraDeObjeto>)
    expect(screen.getByRole('link', { name: 'rack' })).toHaveAttribute('href', '/#sistemas')
  })
})
