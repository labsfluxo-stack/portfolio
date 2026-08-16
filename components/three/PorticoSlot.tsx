'use client'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { PorticoFallback } from './PorticoFallback'
import { VSYNC_DEFAULT, measureVsync } from './portico-quality'
import type { SceneSystem } from './portico-systems'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

// `ssr: false` só é permitido a partir de um Client Component -- por isso
// este arquivo carrega `'use client'` (mesmo padrão de
// components/sections/Terminal.tsx). O chunk de `Portico.tsx`, e com ele todo
// o three.js/@react-three, nunca entra no HTML inicial: só é buscado se o
// efeito abaixo decidir mostrar a cena.
const Portico = dynamic(() => import('./Portico').then((mod) => mod.Portico), { ssr: false })

/** Não confiar em user-agent: a única forma correta de saber se WebGL
 * funciona é pedir o contexto e ver o que volta. */
export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

/**
 * Decide entre a cena WebGL (`Portico.tsx`) e a elevação técnica em SVG
 * (`PorticoFallback.tsx`) -- nunca as duas ao mesmo tempo.
 *
 * O estado de repouso, antes de qualquer efeito rodar, é sempre o fallback.
 * Isso não é só cautela: é o que faz o HTML estático (o que
 * GPTBot/ClaudeBot/PerplexityBot realmente leem, e o que qualquer visitante
 * vê antes do JS hidratar) nunca ficar vazio, e o que evita o `matchMedia`
 * no estado inicial -- API que não existe no servidor e que, se decidisse o
 * primeiro render, sempre resolveria para o valor errado (mesma classe de
 * bug já corrigida em components/ui/Counter.tsx: nunca inicializar estado
 * visível a partir de uma API só-de-navegador).
 *
 * A cena só substitui o fallback depois que um efeito no cliente confirma
 * duas condições: WebGL disponível e `prefers-reduced-motion` desligado.
 * Falhando qualquer uma, o fallback permanece.
 *
 * ERA TRÊS CONDIÇÕES, e a terceira -- largura >= 768px -- foi removida. Ela
 * entregava ao celular uma experiência de qualidade visivelmente inferior: a
 * elevação em SVG é plana, sem profundidade, sem luz e sem os ícones em cor
 * de marca, e como desenho técnico ainda carrega um vão vertical enorme
 * entre o trilho e a pilha. Ao lado da cena do desktop, não é o mesmo site.
 *
 * O que tornava a regra defensável era o custo, e ele caiu: a cena é
 * carregada por `dynamic` e não entra no HTML inicial, o degrau de qualidade
 * começa no nível SEGURO e só sobe quando o quadro prova folga (ver TIERS em
 * Portico.tsx), e no celular ela ocupa um bloco 4:3 contido em vez de meia
 * tela. `hasWebGL()` continua barrando aparelho sem suporte, e o teste de
 * movimento reduzido continua respeitado.
 *
 * O efeito no Lighthouse mobile foi medido antes e depois, não estimado.
 */
export function PorticoSlot({ systems }: { systems: readonly SceneSystem[] }) {
  const [showScene, setShowScene] = useState(false)
  const [vsync, setVsync] = useState(VSYNC_DEFAULT)

  useEffect(() => {
    if (!hasWebGL()) return

    const motionQuery = window.matchMedia(REDUCED_MOTION_QUERY)
    let idle: number | undefined
    let timer: number | undefined

    // A MONTAGEM ESPERA O NAVEGADOR FICAR OCIOSO, e não é preciosismo.
    //
    // Subir a cena custa uma tarefa longa e síncrona na thread principal:
    // gerar as texturas procedurais em canvas 2D e compilar os shaders no
    // primeiro quadro. Medido com PerformanceObserver, essa tarefa apareceu
    // no perfil como um bloco único de vários segundos — inflado pelo
    // rasterizador de software, mas real em qualquer máquina.
    //
    // Disparada junto com o carregamento, ela cai exatamente sobre o momento
    // em que a página está pintando e o visitante tentando rolar. Foi o
    // engasgo que o dono relatou. Adiada para a ociosidade, o custo é o mesmo
    // e o momento é outro: quem chega vê o fallback em SVG na hora — que já
    // tem moldura e composição próprias — e a cena entra quando não atrapalha.
    //
    // O `timeout` do `requestIdleCallback` é a garantia de que ela entra mesmo
    // numa página que nunca fica ociosa. Safari não implementa a API até hoje,
    // daí o `setTimeout` como caminho alternativo.
    // A ordem é `load` PRIMEIRO, ociosidade DEPOIS — e a segunda metade
    // sozinha não bastava.
    //
    // Com apenas `requestIdleCallback`, medi o canvas já presente aos 400 ms
    // no site publicado: o navegador encontra folga entre um recurso e outro
    // e monta a cena no meio do carregamento, que é justamente o momento que
    // se quer evitar. Ociosidade não quer dizer "a página terminou", quer
    // dizer "sobrou um pedaço deste quadro".
    //
    // Esperando `load`, a tarefa longa cai depois de fonte, CSS e imagem
    // resolvidos. A ociosidade continua sendo exigida em seguida, para a cena
    // não subir em cima de uma rolagem já em curso.
    const agendar = () => {
      // A MEDIÇÃO DO MONITOR COMEÇA AQUI, e esta é a única janela em que ela é
      // honesta: a página já terminou de carregar e a cena ainda não existe,
      // então o que o rAF entrega é a taxa do monitor e não o custo do que está
      // rodando. Medir depois — que era o que a escada fazia — deixava o
      // orçamento se calibrar pela lentidão que ele deveria detectar.
      //
      // EM PARALELO COM A ESPERA POR OCIOSIDADE, não em série antes dela: doze
      // quadros são ~200 ms, e em série eles atrasariam a cena sem necessidade.
      // Se a ociosidade chegar primeiro, a cena sobe com o padrão de 60 Hz e o
      // valor medido a alcança muito antes de `WARMUP` terminar — nenhuma
      // decisão é tomada nesse intervalo.
      //
      // A sobreposição também não estraga a medida: `plausibleVsync` fica com o
      // MENOR delta da amostra, então quadro contaminado pela partida da cena é
      // sempre mais lento e sempre descartado.
      void measureVsync().then(setVsync)
      const montar = () => setShowScene(true)
      if (typeof window.requestIdleCallback === 'function') {
        idle = window.requestIdleCallback(montar, { timeout: 2000 })
      } else {
        timer = window.setTimeout(montar, 600)
      }
    }

    const evaluate = () => {
      if (motionQuery.matches) {
        setShowScene(false)
        return
      }
      if (document.readyState === 'complete') agendar()
      else window.addEventListener('load', agendar, { once: true })
    }
    evaluate()

    motionQuery.addEventListener('change', evaluate)
    return () => {
      motionQuery.removeEventListener('change', evaluate)
      window.removeEventListener('load', agendar)
      if (idle !== undefined) window.cancelIdleCallback?.(idle)
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [])

  return (
    <div className="h-full w-full">
      {showScene ? (
        <Portico systems={systems} vsync={vsync} />
      ) : (
        <PorticoFallback systems={systems} />
      )}
    </div>
  )
}
