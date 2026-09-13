'use client'
import { useEffect } from 'react'
import type { RefObject } from 'react'

/**
 * A rolagem da descida, SEM three.js — e o "sem three.js" é a razão de este
 * arquivo existir em vez de o código continuar dentro de `Predio.tsx`.
 *
 * O atalho de teclado precisa valer TAMBÉM quando a cena não sobe: movimento
 * reduzido ligado, aparelho sem WebGL, navegador embutido do Instagram. Quem
 * está sempre montado nesses casos é `PredioSlot`, e `PredioSlot` não pode
 * importar `Predio.tsx` — ele o carrega por `next/dynamic` com `ssr: false`
 * justamente para que o chunk do three.js nunca seja referenciado pelo HTML
 * inicial. Importar o hook de lá arrastaria a biblioteca inteira para o
 * orçamento de JS da página, que é o oposto do que o Pórtico e o Prédio
 * passaram o projeto inteiro protegendo.
 *
 * Então o hook mora aqui, no mesmo espírito da lei 3 da spec ("nenhum módulo
 * `predio-*` importa three.js"): lógica sobre números e DOM, testável sem GPU.
 */

/**
 * Progresso 0..1 dentro de uma caixa que rola — ou `null` quando a caixa não é
 * a descida.
 *
 * O guarda-corpo é o CURSO MÍNIMO: só vale como fonte da descida um elemento
 * com pelo menos uma altura de janela de curso. Uma lista pequena com
 * `overflow` em algum canto da página não sequestra a câmera; a descida do
 * prédio tem seis alturas de janela e passa com folga. Rolagem horizontal
 * (bloco de código, tabela) nem chega a ser considerada: nela `scrollHeight ===
 * clientHeight` e o curso é zero.
 */
export function progressoDoCurso(
  caixa: { scrollTop: number; scrollHeight: number; clientHeight: number },
  cursoMinimo: number,
): number | null {
  const curso = caixa.scrollHeight - caixa.clientHeight
  if (curso < Math.max(1, cursoMinimo)) return null
  return Math.min(1, Math.max(0, caixa.scrollTop / curso))
}

/**
 * Quanto vale uma linha quando o navegador não diz. `line-height: normal` faz
 * `parseFloat` devolver `NaN`, e um `NaN` chegando ao `scrollBy` não rola nada
 * — o mesmo congelamento que este módulo existe para tirar, por outra porta.
 */
export const ALTURA_DE_LINHA_PADRAO = 33

/**
 * `deltaY` em PIXELS, seja qual for a unidade que o navegador usou.
 *
 * `WheelEvent.deltaMode` diz a unidade: 0 pixel, 1 linha, 2 página. Chrome e
 * Safari mandam pixel (uma catraca ≈ 100). **O Firefox manda LINHA**, e uma
 * catraca chega como `deltaY = 3`. Repassar esse 3 direto para `scrollBy` rola
 * três pixels onde deveria rolar uma catraca inteira — a descida congela com o
 * cursor sobre uma âncora, que é exatamente o caso que o repasse existe para
 * resolver. E o defeito é invisível na suíte, que roda em Chromium.
 *
 * É o mesmo erro que já custou duas rodadas nesta tarefa, vestido de outro
 * jeito: tratar a unidade do gesto como se fosse sempre a que eu vejo na minha
 * máquina.
 */
export function pixelsDaRoda(
  evento: { deltaY: number; deltaMode: number },
  caixa: { alturaDaLinha: number; alturaDaPagina: number },
): number {
  if (evento.deltaMode === 1) {
    const linha = Number.isFinite(caixa.alturaDaLinha) && caixa.alturaDaLinha > 0
      ? caixa.alturaDaLinha
      : ALTURA_DE_LINHA_PADRAO
    return evento.deltaY * linha
  }
  if (evento.deltaMode === 2) {
    const pagina = Number.isFinite(caixa.alturaDaPagina) && caixa.alturaDaPagina > 0
      ? caixa.alturaDaPagina
      : ALTURA_DE_LINHA_PADRAO
    return evento.deltaY * pagina
  }
  // Modo 0 e qualquer valor futuro/desconhecido: trata como pixel. Degradar
  // para o modo mais comum é sempre melhor que devolver NaN ou zero.
  return evento.deltaY
}

let roladorLembrado: HTMLElement | null = null

function serveComoDescida(el: HTMLElement): boolean {
  return el.isConnected && el.scrollHeight - el.clientHeight >= window.innerHeight
}

/**
 * O elemento que de fato rola nesta página, procurado pelo que ele FAZ e não
 * pelo que ele é: curso vertical de pelo menos uma altura de janela. Mesmo
 * critério de `progressoDoCurso`, e pela mesma razão — não amarrar nada à
 * classe nem ao `data-testid` de um componente vizinho, que muda sem aviso.
 *
 * Lembrado entre chamadas porque o repasse de roda chama isto a CADA evento:
 * varrer todos os `<div>` da página sessenta vezes por segundo seria pagar em
 * varredura de DOM justamente durante a rolagem. A memória é revalidada a cada
 * uso, então um `<div>` que saiu do documento ou deixou de ter curso é
 * descartado em vez de virar um alvo morto.
 */
export function acharRolador(): HTMLElement | null {
  if (roladorLembrado && serveComoDescida(roladorLembrado)) return roladorLembrado
  roladorLembrado = null
  for (const el of Array.from(document.querySelectorAll<HTMLElement>('div'))) {
    if (serveComoDescida(el)) {
      roladorLembrado = el
      return el
    }
  }
  return null
}

/**
 * As teclas de rolagem movem a descida — e a razão de isto existir é um defeito
 * que o dono encontrou: "não consigo rolar para baixo e para cima".
 *
 * O elemento que rola não é focável, `document.activeElement` é `<body>`, e as
 * teclas de rolagem vão para o DOCUMENTO — que nesta rota tem `scrollHeight ===
 * innerHeight` e não rola. O visitante apertava Page Down e nada acontecia.
 *
 * CHAMADO DE `PredioSlot`, NÃO DE `Predio` — e a diferença é uma correção de
 * revisão, não estilo. Enquanto a chamada morava na cena, o atalho só existia
 * quando a cena existia: quem liga movimento reduzido, quem está sem WebGL e
 * quem abre pelo navegador do Instagram ficava exatamente com o defeito
 * original, na camada que é justamente a acessível. Um defeito consertado numa
 * porta e deixado na outra.
 *
 * POR QUE NÃO A FORMA PADRÃO (contêiner de rolagem focável, com nome
 * acessível): foi testada no navegador antes de ser descartada, e o resultado
 * está medido — com `tabindex="0"` no contêiner que rola, UM CLIQUE DE MOUSE em
 * qualquer lugar passa a focá-lo, `focus-within:z-50` dispara em
 * `PredioSlot.tsx`, e a camada do fallback sobe para `z-index: 50` na FRENTE da
 * cena. Um clique no prédio trocaria o prédio por sete telas de HTML.
 *
 * O QUE ISTO FAZ, e o que deliberadamente NÃO faz. Só age quando NINGUÉM está
 * focado — ou seja, exatamente na janela em que o navegador mandaria as teclas
 * para um documento que não rola. No instante em que o visitante tabula para
 * dentro do fallback, `activeElement` deixa de ser `<body>`, este atalho se cala
 * e o tratamento NATIVO assume. Não há captura de foco, não há tecla roubada de
 * campo de texto, e o movimento continua sendo `scrollTo` do navegador. Nada
 * aqui interpola posição: essa é a linha que separa isto de uma biblioteca de
 * scroll suave, que a spec proíbe por custo de INP.
 *
 * Um degrau de tecla é UMA TELA, não os ~40 px nativos da seta — uma tecla, um
 * andar, que é a própria unidade desta página.
 */
export function useTeclasDeDescida(): void {
  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.defaultPrevented || evento.altKey || evento.ctrlKey || evento.metaKey) return
      const ativo = document.activeElement
      if (ativo && ativo !== document.body && ativo !== document.documentElement) return

      const rolador = acharRolador()
      if (!rolador) return
      const tela = rolador.clientHeight
      const fim = rolador.scrollHeight - tela

      let destino: number | null = null
      switch (evento.key) {
        case 'PageDown':
        case 'ArrowDown':
          destino = Math.min(fim, rolador.scrollTop + tela)
          break
        case 'PageUp':
        case 'ArrowUp':
          destino = Math.max(0, rolador.scrollTop - tela)
          break
        case ' ':
          destino = evento.shiftKey
            ? Math.max(0, rolador.scrollTop - tela)
            : Math.min(fim, rolador.scrollTop + tela)
          break
        case 'Home':
          destino = 0
          break
        case 'End':
          destino = fim
          break
        default:
          return
      }

      evento.preventDefault()
      rolador.scrollTo({ top: destino })
    }

    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [])
}

/**
 * A rolagem SOBRE UMA ÂNCORA da cena — o buraco mais traiçoeiro da correção da
 * rolagem travada, porque só aparece com o cursor num lugar certo.
 *
 * As âncoras precisam de `pointer-events: auto` (é o clique inteiro do
 * recurso), e com isso voltam a ser alvo de evento. Só que elas são filhas da
 * camada da cena, que é `position: fixed` e não rola: o encadeamento de rolagem
 * a partir delas sobe para `body`/`html`, que nesta rota não rolam. Medido: com
 * o cursor parado sobre "Ver os sistemas em produção", cinco eventos de roda
 * deixavam `scrollTop` em 0 — a descida travava num retângulo de 189 × 44 px.
 *
 * DUAS SAÍDAS FORAM MEDIDAS E DESCARTADAS ANTES DESTA: mover a sobreposição
 * para dentro do elemento que rola (um `position: fixed` é retirado do conteúdo
 * rolável do ancestral, então o encadeamento continua indo para a janela —
 * testado movendo o nó à mão, `scrollTop` seguiu em 0); e deixar a sobreposição
 * rolar junto compensando `scrollTop` a cada quadro (funciona, mas a
 * compensação chega um quadro atrasada e a âncora treme).
 *
 * O que sobrou é REPASSAR. Repasse não é biblioteca de scroll suave: não há
 * interpolação, curva nem relógio próprio — o delta convertido para pixel vai
 * direto para `scrollBy`, e quem faz inércia e limite continua sendo o
 * navegador. O custo de INP fica onde não importa, porque este listener só é
 * alcançado por eventos que começam EM CIMA de uma âncora: todo o resto da
 * camada é `pointer-events: none`, e a rolagem comum nunca passa por aqui.
 */
export function useRepasseDeRolagem(alvo: RefObject<HTMLDivElement | null>): void {
  useEffect(() => {
    const no = alvo.current
    if (!no) return

    // Passivo de propósito: sem `preventDefault`. O navegador ainda tenta rolar
    // a cadeia da âncora, que não rola nada, então não há rolagem dupla — e a
    // promessa de passividade mantém o evento fora do caminho crítico.
    const aoGirar = (evento: WheelEvent) => {
      const rolador = acharRolador()
      if (!rolador) return
      // A unidade do `deltaY` depende do navegador — ver `pixelsDaRoda`. No
      // Firefox uma catraca chega como 3 (linhas), e repassar o 3 cru rolaria
      // três pixels.
      const linha = parseFloat(getComputedStyle(rolador).lineHeight)
      rolador.scrollBy({
        top: pixelsDaRoda(evento, { alturaDaLinha: linha, alturaDaPagina: rolador.clientHeight }),
      })
    }

    // O toque é o oposto: aqui `preventDefault` é obrigatório, senão o gesto
    // não vira rolagem nenhuma. Por isso `{ passive: false }` — e por isso ele
    // fica preso a ESTE nó, nunca ao documento.
    let ultimoY: number | null = null
    const aoTocar = (evento: TouchEvent) => {
      ultimoY = evento.touches[0]?.clientY ?? null
    }
    const aoArrastar = (evento: TouchEvent) => {
      const y = evento.touches[0]?.clientY
      if (y === undefined || ultimoY === null) return
      const rolador = acharRolador()
      if (!rolador) return
      evento.preventDefault()
      rolador.scrollBy({ top: ultimoY - y })
      ultimoY = y
    }
    const aoSoltar = () => {
      ultimoY = null
    }

    no.addEventListener('wheel', aoGirar, { passive: true })
    no.addEventListener('touchstart', aoTocar, { passive: true })
    no.addEventListener('touchmove', aoArrastar, { passive: false })
    no.addEventListener('touchend', aoSoltar, { passive: true })
    no.addEventListener('touchcancel', aoSoltar, { passive: true })
    return () => {
      no.removeEventListener('wheel', aoGirar)
      no.removeEventListener('touchstart', aoTocar)
      no.removeEventListener('touchmove', aoArrastar)
      no.removeEventListener('touchend', aoSoltar)
      no.removeEventListener('touchcancel', aoSoltar)
    }
  }, [alvo])
}
