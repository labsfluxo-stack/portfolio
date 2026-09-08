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

  it('com movimento reduzido, o fallback permanece', async () => {
    // `comWebGL(true)` é o que faz este teste testar movimento reduzido de
    // verdade (achado de revisão, fix round 1): sem WebGL, `hasWebGL()` já
    // devolve falso e o efeito retorna ANTES de sequer ler `matchMedia` — o
    // teste passava idêntico se a checagem de movimento reduzido fosse
    // apagada do componente. Com WebGL disponível, o efeito só pode parar no
    // fallback POR CAUSA da checagem de movimento reduzido.
    comWebGL(true)
    comMovimentoReduzido(true)
    render(<PredioSlot dict={dict} locale="pt" />)
    // A ASSERÇÃO PRECISA ESPERAR (achado do próprio fix round, ao verificar a
    // correção anterior): se a checagem de movimento reduzido fosse removida,
    // a montagem ainda assim seria ASSÍNCRONA (`setTimeout(montar, 600)` ou
    // `requestIdleCallback`) — uma asserção só logo após `render()`, sem
    // esperar, passaria em AMBOS os casos (com e sem a checagem), porque o
    // tempo insuficiente já bastaria para "provar" ausência mesmo com o
    // defeito presente. 800 ms excede a reserva de 600 ms.
    await new Promise((resolve) => setTimeout(resolve, 800))
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
   * fallback fica (sete `region`s continuam presentes).
   */
  describe('com WebGL e sem movimento reduzido, a cena sobe', () => {
    it('a cena substitui o fallback visualmente, mas o fallback continua no DOM', async () => {
      comWebGL(true)
      comMovimentoReduzido(false)
      render(<PredioSlot dict={dict} locale="pt" />)
      await waitFor(() => expect(screen.getByTestId('predio-canvas')).toBeInTheDocument(), {
        timeout: ESPERA,
      })
      // As sete seções do fallback continuam na árvore.
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

    /**
     * CRÍTICO (fix round 1): a versão anterior escondia o fallback inteiro
     * atrás de um `<div className="sr-only">`. `sr-only` é
     * `position: absolute; overflow: hidden; clip: rect(0,0,0,0)` — um
     * ancestral posicionado e permanentemente recortado. O `focus:not-sr-only`
     * de `PredioIndicador` só reseta a CAIXA DO PRÓPRIO LINK; não alcança o
     * recorte do ancestral. Resultado: tabular até um link enquanto a cena
     * está montada aterrissava foco num elemento estruturalmente incapaz de
     * aparecer — o mesmo problema do WCAG 2.4.7 que este projeto já corrigiu
     * uma vez, reintroduzido por outra porta.
     *
     * Este teste NÃO tenta verificar pintura de verdade (jsdom roda com
     * `css: false` — não há layout nem CSS aplicado). O que ele afirma é a
     * AUSÊNCIA da técnica de recorte no invólucro: nenhuma classe de
     * `sr-only`/`hidden`/`invisible` pode voltar a ficar no elemento que
     * envolve o fallback enquanto a cena está montada. Se alguém
     * reintroduzir `sr-only` aqui, este teste quebra imediatamente — é o
     * "algo que falha se a regressão voltar" que o round pediu.
     */
    it('o invólucro do fallback não usa uma técnica de recorte que prenderia o focus-reveal', async () => {
      comWebGL(true)
      comMovimentoReduzido(false)
      render(<PredioSlot dict={dict} locale="pt" />)
      await waitFor(() => expect(screen.getByTestId('predio-canvas')).toBeInTheDocument(), {
        timeout: ESPERA,
      })
      const camada = screen.getByTestId('predio-fallback-camada')
      expect(camada.className).not.toMatch(/\b(sr-only|hidden|invisible)\b/)
      // Nenhum ANCESTRAL do link pode carregar essas classes — a regressão
      // original estava exatamente um nível acima do link, que é onde um
      // teste "só olha o próprio elemento focável" não chegaria a olhar. O
      // link em si é OUTRA história: `PredioIndicador` já gerencia seu
      // próprio `sr-only focus:not-sr-only` de propósito (ver
      // PredioIndicador.tsx), e isso é legítimo — o defeito nunca esteve no
      // link, esteve no invólucro em volta dele.
      const link = screen.getByRole('navigation', { name: dict.a11y.predioNav }).querySelector('a')!
      let ancestral: HTMLElement | null = link.parentElement
      while (ancestral) {
        expect(ancestral.className).not.toMatch(/\b(sr-only|hidden|invisible)\b/)
        ancestral = ancestral.parentElement
      }
    })

    /**
     * O mecanismo escolhido para "o que aparece na tela é a cena" (constraint
     * 3 do ruling) é empilhamento por `z-index`, não recorte: o invólucro do
     * fallback fica ATRÁS da cena por padrão (`-z-10`) e passa À FRENTE
     * (`z-50`, mesma linguagem visual de `focus:z-50` que `PredioIndicador`/
     * `SkipLink` já usam) assim que algo dentro dele tem foco
     * (`focus-within`). Isso não recorta nem tira do fluxo: um link focado
     * continua uma caixa normal, só numa camada de pilha diferente — por
     * isso consegue pintar. Este teste afirma a RECEITA de classes, não o
     * resultado visual (que jsdom não computa).
     */
    it('a camada do fallback usa empilhamento (z-index), não recorte, para ficar atrás da cena', async () => {
      comWebGL(true)
      comMovimentoReduzido(false)
      render(<PredioSlot dict={dict} locale="pt" />)
      await waitFor(() => expect(screen.getByTestId('predio-canvas')).toBeInTheDocument(), {
        timeout: ESPERA,
      })
      const camada = screen.getByTestId('predio-fallback-camada')
      expect(camada.className).toMatch(/-z-10\b/)
      expect(camada.className).toMatch(/focus-within:z-50\b/)
    })
  })

  /**
   * IMPORTANTE (fix round 1): nenhum teste anterior de fato exercitava a
   * espera por `load`. `document.readyState` já é `'complete'` quando jsdom
   * renderiza, então `agendar()` sempre corria no mesmo tick — uma versão que
   * pulasse a espera por `load` (montando na primeira ociosidade disponível,
   * a exata lição medida que `PorticoSlot.tsx` documenta) passaria pela suíte
   * inteira sem ser pega.
   */
  describe('a montagem espera "load" antes de agendar ociosidade', () => {
    it('sem "load", nenhuma montagem é agendada — nem depois de tempo suficiente para o timeout de reserva', async () => {
      comWebGL(true)
      comMovimentoReduzido(false)
      const originalReadyState = document.readyState
      Object.defineProperty(document, 'readyState', { value: 'loading', configurable: true })
      try {
        render(<PredioSlot dict={dict} locale="pt" />)
        // 800 ms é mais que o `setTimeout(montar, 600)` de reserva. Se `load`
        // nunca disparar e a montagem ainda assim acontecer, é porque a
        // espera por `load` foi pulada — o defeito que este teste existe
        // para pegar.
        await new Promise((resolve) => setTimeout(resolve, 800))
        expect(screen.queryByTestId('predio-canvas')).not.toBeInTheDocument()

        Object.defineProperty(document, 'readyState', { value: 'complete', configurable: true })
        window.dispatchEvent(new Event('load'))

        await waitFor(() => expect(screen.getByTestId('predio-canvas')).toBeInTheDocument(), {
          timeout: ESPERA,
        })
      } finally {
        Object.defineProperty(document, 'readyState', { value: originalReadyState, configurable: true })
      }
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
