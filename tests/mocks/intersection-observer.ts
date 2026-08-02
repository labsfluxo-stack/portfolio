import { vi } from 'vitest'

// jsdom não implementa IntersectionObserver (depende de layout real).
// O stub guarda a callback de cada observador para que um teste possa
// simular a entrada em viewport. Por padrão nada dispara, então os testes
// que não chamam `triggerIntersection` seguem com o comportamento antigo.

const observers = new Set<IntersectionObserverMock>()

class IntersectionObserverMock implements IntersectionObserver {
  readonly root: Element | Document | null = null
  readonly rootMargin: string = ''
  readonly thresholds: ReadonlyArray<number> = []
  readonly callback: IntersectionObserverCallback

  observe = vi.fn()
  unobserve = vi.fn()
  takeRecords = vi.fn(() => [] as IntersectionObserverEntry[])
  disconnect = vi.fn(() => {
    observers.delete(this)
  })

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
    observers.add(this)
  }
}

export function installIntersectionObserverMock(): void {
  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    value: IntersectionObserverMock,
  })
}

/** Simula a entrada (ou saída) da viewport em todos os observadores vivos. */
export function triggerIntersection(isIntersecting = true): void {
  for (const io of [...observers]) {
    io.callback([{ isIntersecting } as IntersectionObserverEntry], io)
  }
}

export function resetIntersectionObservers(): void {
  observers.clear()
}
