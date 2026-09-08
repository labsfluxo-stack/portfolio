import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { PredioSlot } from '@/components/predio/PredioSlot'
import { getDictionary } from '@/content'

const dict = getDictionary('pt')

/**
 * jsdom não tem WebGL, então este arquivo NÃO testa a cena — testa a decisão.
 * E a decisão é a parte que erra em silêncio: um slot que monte a cena cedo
 * demais, ou que ignore movimento reduzido, produz um site que parece bom no
 * desktop de quem o escreveu e falha em todo o resto.
 */
function comMovimentoReduzido(reduzido: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: reduzido && query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
}

// `Predio` real usa `@react-three/fiber`, que não sobe em jsdom (mesmo motivo
// que `tests/unit/portico-slot.test.tsx` dubla `Portico`). O dublê torna a
// DECISÃO de montar observável sem arrastar o three.js para dentro do teste.
vi.mock('@/components/predio/Predio', () => ({
  Predio: () => <div data-testid="predio-canvas" />,
}))

function comWebGL(disponivel: boolean) {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () => (disponivel ? ({} as RenderingContext) : null),
  )
}

const ESPERA = 5_000

beforeEach(() => {
  vi.unstubAllGlobals()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('slot do prédio', () => {
  it('o primeiro render é o fallback, sempre', () => {
    comMovimentoReduzido(false)
    render(<PredioSlot dict={dict} locale="pt" />)
    expect(screen.getAllByRole('region').length).toBeGreaterThan(0)
  })

  it('sem WebGL, o fallback permanece', () => {
    comMovimentoReduzido(false)
    render(<PredioSlot dict={dict} locale="pt" />)
    // jsdom não dá contexto WebGL: `hasWebGL()` é falso e a cena nunca sobe.
    expect(screen.queryByTestId('predio-canvas')).not.toBeInTheDocument()
  })

  it('com movimento reduzido, o fallback permanece', () => {
    comMovimentoReduzido(true)
    render(<PredioSlot dict={dict} locale="pt" />)
    expect(screen.queryByTestId('predio-canvas')).not.toBeInTheDocument()
    expect(screen.getAllByRole('region').length).toBeGreaterThan(0)
  })

  /**
   * A QUESTÃO ARQUITETURAL (ver comentário em PredioSlot.tsx): quando a cena
   * sobe, ela e o fallback existem no DOM ao mesmo tempo. Sem isolar uma das
   * duas camadas da árvore de acessibilidade, um usuário de teclado tabularia
   * por cada destino DUAS vezes — uma na cena (âncoras que a Task 8 vai pôr
   * sobre o canvas), outra no fallback. Este bloco prova que só UMA camada
   * fica alcançável quando as duas coexistem: a cena sai (`aria-hidden`), o
   * fallback fica (sete `region`s continuam presentes, só visualmente
   * escondidas por `sr-only`).
   */
  describe('com WebGL e sem movimento reduzido, a cena sobe', () => {
    it('a cena substitui o fallback visualmente, mas o fallback continua no DOM', async () => {
      comWebGL(true)
      comMovimentoReduzido(false)
      render(<PredioSlot dict={dict} locale="pt" />)
      await waitFor(() => expect(screen.getByTestId('predio-canvas')).toBeInTheDocument(), {
        timeout: ESPERA,
      })
      // As sete seções do fallback continuam na árvore — só sob `sr-only`.
      expect(screen.getAllByRole('region')).toHaveLength(7)
    })

    it('a camada da cena sai da árvore de acessibilidade (aria-hidden)', async () => {
      comWebGL(true)
      comMovimentoReduzido(false)
      render(<PredioSlot dict={dict} locale="pt" />)
      const canvas = await waitFor(() => screen.getByTestId('predio-canvas'), { timeout: ESPERA })
      // A decisão: enquanto a cena estiver montada, ELA é a camada que sai do
      // teclado e do leitor de tela — não o fallback. O fallback é quem tem a
      // estrutura completa (sete andares sempre presentes + o atalho de
      // teclado de PredioIndicador); a cena, quando a Task 8 a completar, só
      // mantém vivos os três andares vizinhos do atual, então nunca seria uma
      // camada de teclado completa.
      expect(canvas.closest('[aria-hidden="true"]')).toBeTruthy()
    })

    it('o fallback, e não a cena, continua sendo o destino do teclado', async () => {
      comWebGL(true)
      comMovimentoReduzido(false)
      render(<PredioSlot dict={dict} locale="pt" />)
      await waitFor(() => expect(screen.getByTestId('predio-canvas')).toBeInTheDocument(), {
        timeout: ESPERA,
      })
      // O indicador de andar (sete links reais) é a prova viva: continua
      // alcançável por nome acessível mesmo com a cena montada.
      const nav = screen.getByRole('navigation', { name: dict.a11y.predioNav })
      expect(nav.querySelectorAll('a')).toHaveLength(7)
      // E ele não está por baixo de `aria-hidden`: só a camada da cena está.
      expect(nav.closest('[aria-hidden="true"]')).toBeNull()
    })
  })

  /**
   * Critério de aceite herdado (achado da revisão do Indicador, item 2): o
   * `focus:absolute` de `PredioIndicador`/`SkipLink` só revela no canto certo
   * porque NENHUM ancestral tem `position` definida — a revelação ancora no
   * bloco de contenção inicial. Um `position: relative` no invólucro do slot
   * criaria um ancestral posicionado novo e mudaria essa geometria. Este
   * teste é o piso que impede essa regressão específica.
   */
  it('o invólucro do slot não introduz ancestral posicionado (mantém a geometria do focus-reveal)', () => {
    comMovimentoReduzido(false)
    const { container } = render(<PredioSlot dict={dict} locale="pt" />)
    const involucro = container.firstElementChild as HTMLElement
    expect(involucro.className).not.toMatch(/\b(relative|absolute|fixed|sticky)\b/)
  })
})
