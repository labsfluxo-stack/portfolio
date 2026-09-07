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

/**
 * Simula a entrada (ou saída) da viewport em todos os observadores vivos.
 *
 * Aceita um booleano (uso original: só "entrou ou não", sem `target` — é o
 * bastante para um observador que olha um elemento só, como `Counter.tsx`) OU
 * uma lista de entradas já moldadas (uso novo: um observador que olha VÁRIOS
 * elementos, como o indicador de andar, precisa dizer QUAL entrou, e o
 * callback real lê `entry.target`/`entry.boundingClientRect`, que o booleano
 * sozinho não tem como fornecer). A assinatura antiga continua idêntica —
 * nenhum chamador existente muda.
 */
export function triggerIntersection(
  entradas: boolean | IntersectionObserverEntry[] = true,
): void {
  const lista: IntersectionObserverEntry[] =
    typeof entradas === 'boolean' ? [{ isIntersecting: entradas } as IntersectionObserverEntry] : entradas
  for (const io of [...observers]) {
    io.callback(lista, io)
  }
}

export function resetIntersectionObservers(): void {
  observers.clear()
}
