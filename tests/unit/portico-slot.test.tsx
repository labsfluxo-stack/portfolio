import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PorticoSlot } from '@/components/three/PorticoSlot'
import { systems } from '@/content/systems'

/**
 * O `PorticoSlot` NÃO TINHA TESTE NENHUM até aqui, e isso apareceu de um jeito
 * desconfortável: a regra "só mostra a cena a partir de 768px" era decisão de
 * spec, foi removida, e a suíte inteira continuou verde. Uma decisão que
 * ninguém consegue quebrar sem perceber não estava sendo protegida — estava
 * só escrita.
 *
 * O que estes testes travam é o que de fato importa e não deve mudar por
 * descuido: o fallback é o estado de repouso (é ele que o crawler sem
 * JavaScript lê), WebGL ausente mantém o fallback, e `prefers-reduced-motion`
 * mantém o fallback. A largura saiu de propósito — ver o comentário no
 * componente.
 */

// `Portico` puxa three.js/@react-three, que não roda em jsdom. O que se quer
// verificar aqui é a DECISÃO, não o desenho: o dublê torna a escolha
// observável sem arrastar a cena inteira para dentro do teste.
vi.mock('@/components/three/Portico', () => ({
  Portico: () => <div data-testid="cena-3d" />,
}))

// `System` já satisfaz `SceneSystem` estruturalmente (nome + stack), que é
// como o Hero passa os dados de verdade.
const cenario = systems

/**
 * A cena não sobe mais assim que decide subir: ela espera as texturas.
 *
 * Em jsdom não existe `Worker`, então `pedirMapas` cai no caminho de
 * emergência e gera os cinco mapas AQUI MESMO — ~700 ms de laço por pixel, o
 * custo real que o worker existe para tirar da thread do visitante. O padrão de
 * um segundo do `waitFor` não cobre isso, e o teste reprovava por tempo, não
 * por defeito.
 *
 * Aumentar a espera é o certo em vez de dublar `gerarMapas`: o que estes casos
 * verificam é a DECISÃO de mostrar a cena, e essa decisão agora inclui esperar
 * o pixel ficar pronto. Com um dublê, o caminho de emergência deixaria de ser
 * exercitado justamente onde ele é o único caminho.
 */
const ESPERA = 15_000

function matchMedia(reduced: boolean) {
  vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
    matches: reduced && query.includes('reduce'),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }) as unknown as MediaQueryList)
}

function webgl(disponivel: boolean) {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () => (disponivel ? ({} as RenderingContext) : null),
  )
}

describe('PorticoSlot', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  // O primeiro render nunca pode depender de `matchMedia` nem de WebGL: no
  // servidor nenhum dos dois existe, e é esse HTML que GPTBot e ClaudeBot
  // leem. Mesma classe de bug já corrigida em Counter.tsx.
  it('o fallback é o estado de repouso, antes de qualquer efeito', () => {
    webgl(false)
    matchMedia(false)
    const { container } = render(<PorticoSlot systems={cenario} />)
    expect(container.querySelector('svg'), 'o fallback em SVG não renderizou').toBeTruthy()
  })

  it('com WebGL e sem movimento reduzido, a cena substitui o fallback', async () => {
    webgl(true)
    matchMedia(false)
    render(<PorticoSlot systems={cenario} />)
    await waitFor(() => expect(screen.getByTestId('cena-3d')).toBeInTheDocument(), { timeout: ESPERA })
  })

  // Estas duas são as condições que SOBRARAM depois que a largura saiu. Se
  // alguma delas cair, aparelho sem suporte trava e quem pediu menos
  // movimento recebe uma cena animada.
  it('sem WebGL, o fallback permanece', async () => {
    webgl(false)
    matchMedia(false)
    const { container } = render(<PorticoSlot systems={cenario} />)
    await waitFor(() => expect(container.querySelector('svg')).toBeTruthy())
    expect(screen.queryByTestId('cena-3d')).not.toBeInTheDocument()
  })

  it('com prefers-reduced-motion, o fallback permanece mesmo havendo WebGL', async () => {
    webgl(true)
    matchMedia(true)
    const { container } = render(<PorticoSlot systems={cenario} />)
    await waitFor(() => expect(container.querySelector('svg')).toBeTruthy())
    expect(screen.queryByTestId('cena-3d')).not.toBeInTheDocument()
  })

  // A largura DEIXOU de decidir: o celular recebia a elevação plana enquanto o
  // desktop recebia a cena com profundidade, luz e ícones em cor de marca — e
  // não era o mesmo site. Se alguém reintroduzir um corte por largura, este
  // teste cai.
  it('a largura da tela não decide mais nada', async () => {
    webgl(true)
    vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
      // Uma tela estreita: qualquer `min-width` falha.
      matches: query.includes('min-width') ? false : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }) as unknown as MediaQueryList)

    render(<PorticoSlot systems={cenario} />)
    await waitFor(
      () =>
        expect(
          screen.getByTestId('cena-3d'),
          'voltou um corte por largura — o celular perdeu a cena 3D',
        ).toBeInTheDocument(),
      { timeout: ESPERA },
    )
  })
})
