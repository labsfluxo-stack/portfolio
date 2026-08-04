import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Boot } from '@/components/sections/Boot'
import { pt } from '@/content/pt'

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

describe('Boot', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    window.sessionStorage.clear()
  })

  it('não renderiza nada com reduced-motion ativo', () => {
    setReducedMotion(true)
    const { container } = render(<Boot dict={pt} locale="pt" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('não repete quando sessionStorage já marca visto', () => {
    setReducedMotion(false)
    window.sessionStorage.setItem('sala-de-controle:boot', '1')
    const { container } = render(<Boot dict={pt} locale="pt" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('roda na primeira visita e marca a sessão como vista', () => {
    setReducedMotion(false)
    const { container } = render(<Boot dict={pt} locale="pt" />)
    expect(container).not.toBeEmptyDOMElement()
    expect(window.sessionStorage.getItem('sala-de-controle:boot')).toBe('1')
  })

  it('é decorativo e não bloqueia interação', () => {
    setReducedMotion(false)
    const { container } = render(<Boot dict={pt} locale="pt" />)
    const overlay = container.firstElementChild
    expect(overlay).toHaveAttribute('aria-hidden', 'true')
    expect(overlay).toHaveClass('pointer-events-none')
  })
})
