import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BrindeSlot } from '@/components/three/BrindeSlot'

/**
 * Mesmo raciocínio de `portico-slot.test.tsx`: o que se quer travar aqui é a
 * DECISÃO (WebGL disponível → cena; ausente → plano em DOM), não o desenho —
 * `Caneca.tsx` puxa three.js/@react-three, que não roda em jsdom. O dublê
 * torna a escolha observável sem arrastar a cena inteira para o teste.
 *
 * Ao contrário do `PorticoSlot`, este componente NÃO decide por
 * `prefers-reduced-motion` — ver o comentário em `BrindeSlot.tsx` para o
 * porquê — então não há caso de teste para essa condição aqui.
 */
vi.mock('@/components/three/Caneca', () => ({
  Caneca: () => <div data-testid="cena-caneca-3d" />,
}))

function webgl(disponivel: boolean) {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () => (disponivel ? ({} as RenderingContext) : null),
  )
}

describe('BrindeSlot', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('não desenha nada antes do efeito confirmar suporte a WebGL', () => {
    webgl(true)
    const { container } = render(<BrindeSlot peca="caneca" corMarca="#2563EB" nomeMarca="Marca" />)
    expect(container.firstChild).toBeNull()
  })

  it('com WebGL, a cena 3D substitui o plano em DOM', async () => {
    webgl(true)
    render(<BrindeSlot peca="caneca" corMarca="#2563EB" nomeMarca="Marca" />)
    await waitFor(() => expect(screen.getByTestId('cena-caneca-3d')).toBeInTheDocument())
  })

  it('sem WebGL, mostra o plano em DOM com a marca — nunca um modal vazio', async () => {
    webgl(false)
    render(<BrindeSlot peca="caneca" corMarca="#2563EB" nomeMarca="Marca Teste" />)
    await waitFor(() => expect(screen.getByText('Marca Teste')).toBeInTheDocument())
    expect(screen.queryByTestId('cena-caneca-3d')).not.toBeInTheDocument()
  })
})
