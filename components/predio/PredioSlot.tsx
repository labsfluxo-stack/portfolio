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
 * Enquanto a cena existe, ela e o fallback moram no DOM ao mesmo tempo: a cena
 * por cima visualmente, o fallback por baixo como `sr-only`. Um link dentro de
 * `sr-only` continua focável — então, sem mais nada, um usuário de teclado
 * tabularia por CADA destino duas vezes: uma na camada da cena (a Task 8 põe
 * uma âncora de DOM sobre cada objeto clicável do canvas), outra no fallback
 * invisível. Ninguém pediu isso, e ninguém notaria sem tabular.
 *
 * A decisão: o FALLBACK é a camada acessível enquanto a cena estiver montada.
 * A camada da cena (o `<div>` abaixo que envolve `<Predio>`) leva
 * `aria-hidden="true"` e sai da árvore de acessibilidade.
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
 * O que falta, e cabe à Task 8: `aria-hidden="true"` sozinho NÃO retira foco de
 * teclado de um descendente focável (é a regra WAI-ARIA que esta cena teria que
 * respeitar: nenhum elemento focável pode viver dentro de um `aria-hidden`).
 * Hoje isso não importa — o stub de `Predio.tsx` não contém nada focável. Mas
 * quando a Task 8 acrescentar as âncoras sobre o canvas, CADA UMA delas precisa
 * de `tabIndex={-1}` (tira da ordem de tabulação, não do clique) para que a
 * garantia valha de verdade. Fica registrado aqui porque é este componente que
 * decide a camada, e a decisão só se sustenta se a Task 8 conhecer a condição.
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

  // SEM `relative` no invólucro (critério de aceite herdado da revisão do
  // Indicador, item 2): `PredioIndicador` e `SkipLink` usam `focus:absolute`
  // contando com a AUSÊNCIA de ancestral posicionado — a revelação por foco
  // ancora no bloco de contenção inicial, não num contêiner deste componente.
  // Um `position: relative` aqui criaria esse ancestral e mudaria onde o link
  // aparece ao receber foco. `w-full` sozinho não estabelece novo bloco de
  // contenção, então a geometria de antes deste componente existir continua
  // igual.
  return (
    <div className="w-full">
      {cena && (
        <div aria-hidden="true">
          <Predio dict={dict} locale={locale} vsync={vsync} />
        </div>
      )}
      {/* O fallback continua no DOM sob a cena: ele é o conteúdo indexável e,
       * enquanto a cena estiver montada, o ÚNICO destino de teclado (ver o
       * comentário acima) — a cena o cobre visualmente, não o substitui. */}
      <div className={cena ? 'sr-only' : undefined}>
        <PredioFallback dict={dict} locale={locale} />
      </div>
    </div>
  )
}
