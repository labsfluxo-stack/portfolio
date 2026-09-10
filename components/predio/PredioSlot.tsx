'use client'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import type { Dictionary, Locale } from '@/content/types'
import { PredioFallback } from './PredioFallback'
import { hasWebGL } from '../three/PorticoSlot'
import { VSYNC_DEFAULT, measureVsync } from '../three/portico-quality'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

// `ssr: false` exige Client Component — daí o 'use client' acima. O chunk de
// `Predio.tsx`, e com ele todo o three.js, nunca entra no HTML inicial.
const Predio = dynamic(() => import('./Predio').then((m) => m.Predio), { ssr: false })

/**
 * Decide entre a cena e o fallback — nunca as duas ao mesmo tempo.
 *
 * O repouso é o fallback, antes de qualquer efeito. Isso não é cautela: é o que
 * faz o HTML estático nunca nascer vazio, e o que evita inicializar estado
 * visível a partir de `matchMedia` — API que não existe no servidor e que, se
 * decidisse o primeiro render, resolveria sempre para o valor errado (mesma
 * classe de bug já corrigida em components/ui/Counter.tsx).
 *
 * A montagem espera `load` E DEPOIS ociosidade. Só ociosidade não basta: no
 * Pórtico, mediu-se o canvas já presente aos 400 ms no site publicado, porque o
 * navegador acha folga entre um recurso e outro e monta a cena no meio do
 * carregamento — exatamente o momento a evitar. `PorticoSlot.tsx` documenta a
 * medição; este componente reaproveita o mesmo padrão, não uma cópia divergente.
 *
 * ---
 *
 * QUESTÃO ARQUITETURAL — qual camada fica acessível quando a cena está no ar.
 *
 * Enquanto a cena existe, ela e o fallback moram no DOM ao mesmo tempo. A
 * decisão: o FALLBACK é a camada acessível (árvore de acessibilidade + ordem
 * de tabulação) enquanto a cena estiver montada. A camada da cena (o `<div>`
 * abaixo que envolve `<Predio>`) leva `aria-hidden="true"` e sai da árvore de
 * acessibilidade.
 *
 * Por que o fallback, e não a cena — o argumento não é gosto, é completude:
 *   - O fallback SEMPRE tem os sete andares no DOM, mais o atalho de teclado
 *     de `PredioIndicador` (sete links, pula direto para qualquer andar sem
 *     rolar). É a estrutura que sobreviveu a cinco rounds de revisão.
 *   - A camada da cena (Task 8, "Só três andares vivos: andar - 1, andar,
 *     andar + 1. Os demais não entram na árvore.") NUNCA tem mais que três
 *     andares de âncoras presentes ao mesmo tempo. Mesmo sem o problema de
 *     duplicação, ela jamais seria uma camada de teclado completa — não tem
 *     como ser o destino de teclado e alcançar os sete andares.
 * Portanto a troca não tem simetria: manter a cena acessível e apagar o
 * fallback pioraria a experiência de teclado (perderia quatro andares e o
 * atalho); manter o fallback acessível e apagar a cena não perde nada, porque
 * a cena nunca tinha mais informação do que o fallback já tem.
 *
 * Por que `aria-hidden`, e não `inert` — `inert` foi cogitado e descartado.
 * `inert` resolveria a árvore de acessibilidade E o foco num atributo só, mas
 * também desliga eventos de ponteiro no que estiver dentro — e os objetos
 * clicáveis que a Task 8 vai desenhar sobre o canvas são âncoras de verdade,
 * clicáveis PELO MOUSE (o brief da Task 8 é explícito: "raycast só liga o
 * brilho do hover", o clique em si é a âncora). `inert` quebraria esse clique
 * em silêncio. `aria-hidden="true"` tira a camada da árvore de acessibilidade
 * sem tocar em ponteiro — é o mesmo padrão que `Portico.tsx` já usa no
 * `<Canvas>` dele.
 *
 * `aria-hidden="true"` sozinho NÃO retira foco de teclado de um descendente
 * focável — é a regra WAI-ARIA que a cena precisa respeitar (nenhum elemento
 * focável pode viver dentro de um `aria-hidden`). Isso não fica só documentado
 * aqui: `components/predio/Predio.tsx` exporta `AncoraDeObjeto`, o componente
 * que a Task 8 usa para cada objeto clicável, e ele mesmo força
 * `tabIndex={-1}` — não é possível usá-lo e produzir uma âncora focável por
 * engano (ver o teste `tests/unit/predio-scene.test.tsx`).
 *
 * ---
 *
 * MECANISMO DE OCLUSÃO VISUAL — como o fallback fica "atrás" sem deixar de
 * poder aparecer (fix round 1, achado Crítico).
 *
 * A primeira versão escondia o fallback inteiro atrás de um
 * `<div className="sr-only">`. `sr-only` é `position: absolute; overflow:
 * hidden; clip: rect(0,0,0,0)` — um ancestral POSICIONADO e PERMANENTEMENTE
 * RECORTADO. O `focus:not-sr-only` que `PredioIndicador` já usa em cada um
 * dos seus próprios links só reseta a caixa DO PRÓPRIO LINK; não alcança o
 * recorte de um ancestral. Resultado: tabular até um link, com a cena
 * montada, aterrissava foco num elemento estruturalmente incapaz de aparecer
 * — o mesmo problema de WCAG 2.4.7 que este projeto já corrigiu uma vez,
 * reintroduzido por uma porta diferente (a árvore de acessibilidade estava
 * certa; o RECORTE visual é que sabotava a técnica de revelar-ao-focar).
 *
 * A correção troca RECORTE por EMPILHAMENTO. O invólucro do fallback nunca é
 * `sr-only`/`hidden`/`invisible` — continua sendo uma caixa normal, do
 * tamanho normal, só numa camada de pilha (`z-index`) mais baixa que a da
 * cena por padrão (`-z-10`) e mais alta assim que QUALQUER coisa lá dentro
 * tem foco (`focus-within:z-50` — mesma linguagem visual de `focus:z-50` que
 * `PredioIndicador`/`SkipLink` já usam). Como não há recorte, um link
 * focado É uma caixa pintável o tempo todo; só muda em qual camada ele pinta.
 *
 * `z-index` só tem efeito em elemento POSICIONADO (`position` != `static`) —
 * e dar `position: relative` a este invólucro reintroduziria exatamente o
 * problema do critério de aceite herdado (ver abaixo): um ancestral
 * posicionado novo, na cadeia que leva até `PredioIndicador`. A saída é a
 * exceção do próprio CSS Flexbox: um FILHO DIRETO de um contêiner `flex`
 * respeita `z-index` para fins de empilhamento MESMO com `position: static`
 * — sem se tornar, ele mesmo, um bloco de contenção para descendentes
 * `position: absolute` (isso exige `position` de verdade, que este invólucro
 * nunca ganha). Por isso o invólucro externo agora é `flex flex-col`: dá
 * significado ao `z-index` do invólucro do fallback sem tocar em `position`
 * em lugar nenhum da cadeia.
 *
 * A camada da cena (o `<div aria-hidden>` que envolve `<Predio>`) É
 * `position: fixed` de propósito — "a página rola; o canvas fica parado atrás
 * dela" (brief da Task 8) — e leva `z-0` explícito, deliberado, para não
 * depender de sorte na comparação com o `-z-10`/`focus-within:z-50` do
 * fallback (achado Menor do mesmo round: a versão anterior tinha `-z-10` no
 * PRÓPRIO contêiner do canvas, dentro de `Predio.tsx`, contradizendo este
 * comentário — só inofensivo por acidente, porque o fallback preso em
 * `sr-only` já estava apagado de qualquer jeito, então nenhuma ordem de
 * pilha chegava a importar). Ver o comentário em `Predio.tsx` para a outra
 * metade dessa decisão.
 */
export function PredioSlot({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const [cena, setCena] = useState(false)
  const [vsync, setVsync] = useState(VSYNC_DEFAULT)

  useEffect(() => {
    if (!hasWebGL()) return
    let vivo = true
    const motionQuery = window.matchMedia(REDUCED_MOTION_QUERY)
    let idle: number | undefined
    let timer: number | undefined

    const agendar = () => {
      // A medida do monitor é honesta só nesta janela: a página terminou de
      // carregar e a cena ainda não existe, então o rAF entrega a taxa do
      // monitor e não o custo do que está rodando.
      void measureVsync().then((v) => vivo && setVsync(v))
      const montar = () => {
        performance.mark?.('predio:montagemPedida')
        if (vivo) setCena(true)
      }
      if (typeof window.requestIdleCallback === 'function') {
        idle = window.requestIdleCallback(montar, { timeout: 2000 })
      } else {
        // Safari não implementa requestIdleCallback até hoje.
        timer = window.setTimeout(montar, 600)
      }
    }

    const avaliar = () => {
      if (motionQuery.matches) {
        setCena(false)
        return
      }
      if (document.readyState === 'complete') agendar()
      else window.addEventListener('load', agendar, { once: true })
    }
    avaliar()

    motionQuery.addEventListener('change', avaliar)
    return () => {
      vivo = false
      motionQuery.removeEventListener('change', avaliar)
      window.removeEventListener('load', agendar)
      if (idle !== undefined) window.cancelIdleCallback?.(idle)
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [])

  // `flex flex-col`, NÃO `relative` (critério de aceite herdado da revisão
  // do Indicador, item 2, reconfirmado no fix round 1): `PredioIndicador` e
  // `SkipLink` usam `focus:absolute` contando com a AUSÊNCIA de ancestral
  // posicionado — a revelação por foco ancora no bloco de contenção inicial,
  // não num contêiner deste componente. `display: flex` não cria bloco de
  // contenção para `position: absolute` (só `position` de verdade faz isso);
  // é usado aqui só para dar significado ao `z-index` do invólucro do
  // fallback abaixo, pela exceção do Flexbox (ver o comentário grande acima).
  // `pointer-events-none` NO INVÓLUCRO EXTERNO enquanto a cena está no ar, e
  // este é o passo que faltava para a roda do mouse chegar em quem rola.
  //
  // Medido: com a camada da cena já transparente ao ponteiro, o
  // `elementFromPoint` no centro da tela passou a devolver ESTE `<div>` — não o
  // fallback. A razão é o `-z-10` do fallback: `z-index` negativo pinta ANTES
  // do conteúdo em fluxo do contexto de empilhamento, então a camada do
  // fallback fica embaixo do PRÓPRIO PAI para efeito de teste de acerto. O pai
  // ganhava o evento, e o encadeamento de rolagem a partir dele sobe — nunca
  // desce até o filho que rola.
  //
  // Com o pai transparente, o acerto atravessa e aterrissa dentro do fallback,
  // que é o elemento que rola: aí o navegador tem o que rolar. Só vale
  // enquanto a cena existe; sem cena, o fallback É a página e precisa do
  // ponteiro inteiro.
  return (
    <div className="flex flex-col w-full">
      {/* `pointer-events-none` NESTE invólucro, além do que `Predio.tsx` já põe
       * no contêiner dele: os dois são `fixed inset-0`, e QUALQUER UM dos dois
       * com `pointer-events: auto` basta para engolir a roda do mouse e o
       * toque. O elemento que de fato rola (o `<div>` do fallback, abaixo) é
       * IRMÃO desta camada, não ancestral dela — então o encadeamento de
       * rolagem do navegador sobe por `body`/`html`, que não rolam nesta rota,
       * e nunca chega nele. Foi assim que a descida ficou travada na cobertura:
       * defeito relatado pelo dono e reproduzido com medição.
       *
       * Isto NÃO é o `inert` que o comentário grande acima descartou, e a
       * diferença é justamente a que importa ali: `inert` desliga o ponteiro de
       * um jeito que nenhum descendente consegue reverter, enquanto
       * `pointer-events: none` é revertido por qualquer filho que declare
       * `auto` — que é exatamente o que as âncoras de objeto fazem. O clique
       * nelas continua funcionando. */}
      {cena && (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-10">
          <Predio dict={dict} locale={locale} vsync={vsync} />
        </div>
      )}
      {/* O fallback continua no DOM sob a cena: ele é o conteúdo indexável e,
       * enquanto a cena estiver montada, o ÚNICO destino de teclado (ver o
       * comentário acima). `-z-10 focus-within:z-50` é EMPILHAMENTO, não
       * recorte — nunca `sr-only`/`hidden`/`invisible` aqui: ver a seção
       * "mecanismo de oclusão visual" acima.
       *
       * `[&_a]:pointer-events-none` é a outra metade da correção da rolagem, e
       * sem ela o conserto trocaria um defeito por outro pior. Com a camada da
       * cena transparente ao ponteiro, um clique no meio do prédio atravessa e
       * aterrissa no fallback — que está logo atrás, alinhado, e INVISÍVEL sob
       * o canvas opaco. Clicar no vazio da cena navegaria para um link que
       * ninguém consegue ver. Só os `<a>` perdem o ponteiro: o contêiner que
       * rola continua `auto`, que é o que a roda do mouse precisa acertar para
       * que o navegador saiba o que rolar.
       *
       * `[&_a:focus]:pointer-events-auto` devolve o clique ao link FOCADO —
       * aquele que `focus-within:z-50` acabou de trazer para a frente e tornar
       * visível. Enquanto está visível, é clicável; enquanto está escondido,
       * não é. */}
      <div
        data-testid="predio-fallback-camada"
        className={
          cena
            ? 'focus-within:z-50 [&_a]:pointer-events-none [&_a:focus]:pointer-events-auto'
            : undefined
        }
      >
        <PredioFallback dict={dict} locale={locale} />
      </div>
    </div>
  )
}
