import { act, render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Counter } from '@/components/ui/Counter'
import {
  resetIntersectionObservers,
  triggerIntersection,
} from '../mocks/intersection-observer'

function setReducedMotion(reduced: boolean) {
  vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
    matches: reduced && query.includes('reduce'),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }) as unknown as MediaQueryList)
}

describe('Counter', () => {
  afterEach(() => {
    // Os espiões de requestAnimationFrame vazariam para os testes seguintes.
    vi.restoreAllMocks()
    resetIntersectionObservers()
  })

  it('regressão: o HTML estático (sem JS) carrega o valor final, nunca 0', () => {
    // renderToStaticMarkup nunca roda efeitos — é exatamente o que o Next
    // produz no build estático, o HTML que GPTBot/ClaudeBot/PerplexityBot
    // realmente leem. Se isto voltar a depender de `reduced` no estado
    // inicial, este teste falha antes de chegar a qualquer navegador.
    const html = renderToStaticMarkup(<Counter to={250000} locale="pt" suffix="+" />)
    expect(html).toContain('250.000+')
    expect(html).not.toContain('>0<')
  })

  it('com reduced-motion, mostra o valor final imediatamente', () => {
    setReducedMotion(true)
    render(<Counter to={1675} locale="pt" />)
    expect(screen.getByText('1.675')).toBeInTheDocument()
  })

  it('formata em pt-BR e aplica o sufixo', () => {
    setReducedMotion(true)
    render(<Counter to={250000} locale="pt" suffix="+" />)
    expect(screen.getByText('250.000+')).toBeInTheDocument()
  })

  it('formata pelo locale ativo, não sempre em pt-BR', () => {
    setReducedMotion(true)
    const { rerender } = render(<Counter to={250000} locale="en" />)
    expect(screen.getByText('250,000')).toBeInTheDocument()

    rerender(<Counter to={250000} locale="pt" />)
    expect(screen.getByText('250.000')).toBeInTheDocument()
  })

  it('anima até o valor final ao entrar em viewport', () => {
    setReducedMotion(false)
    const frames: FrameRequestCallback[] = []
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      frames.push(cb)
      return frames.length
    })

    render(<Counter to={100} locale="pt" durationMs={1000} />)
    act(() => triggerIntersection(true))

    // Um instante muito além da duração força t = 1, ou seja, o valor final.
    act(() => frames.at(-1)?.(performance.now() + 5000))
    expect(screen.getByText('100')).toBeInTheDocument()
  })

  it('cancela o quadro pendente ao desmontar, sem deixar o laço órfão', () => {
    setReducedMotion(false)
    vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(42)
    const cancel = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => undefined)

    const { unmount } = render(<Counter to={100} locale="pt" />)
    act(() => triggerIntersection(true))
    unmount()

    expect(cancel).toHaveBeenCalledWith(42)
  })
})
