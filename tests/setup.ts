import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// jsdom não implementa IntersectionObserver (requer layout real).
// Stub no-op só para satisfazer o construtor usado por componentes como
// Counter — os testes que dependem de reduced-motion nunca chegam a
// disparar a callback de interseção.
class IntersectionObserverMock implements IntersectionObserver {
  readonly root: Element | Document | null = null
  readonly rootMargin: string = ''
  readonly thresholds: ReadonlyArray<number> = []
  disconnect = vi.fn()
  observe = vi.fn()
  takeRecords = vi.fn(() => [] as IntersectionObserverEntry[])
  unobserve = vi.fn()
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: IntersectionObserverMock,
})
