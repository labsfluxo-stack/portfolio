import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'
import { installIntersectionObserverMock } from './mocks/intersection-observer'

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

installIntersectionObserverMock()

// jsdom não implementa `getContext` — sem este stub, o `hasWebGL()` de
// ConstellationSlot.tsx dispara o aviso "Not implemented" da virtual
// console do jsdom em todo teste que monta o Hero, escondendo um aviso
// real no meio do ruído. `null` é também o resultado correto por padrão:
// jsdom não tem WebGL de verdade, então o fallback SVG é sempre o que os
// testes devem ver, sem depender de como o jsdom evolui essa lacuna.
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  writable: true,
  value: vi.fn(() => null),
})
