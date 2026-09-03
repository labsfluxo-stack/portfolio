'use client'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { PorticoFallback } from './PorticoFallback'
import { VSYNC_DEFAULT, measureVsync } from './portico-quality'
import type { SceneSystem } from './portico-systems'
import { gerarMapas, type Mapas } from './portico-pixels'
import type { CargaDeMapas } from './portico-texturas.worker'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

// `ssr: false` só é permitido a partir de um Client Component -- por isso
// este arquivo carrega `'use client'` (mesmo padrão de
// components/sections/Terminal.tsx). O chunk de `Portico.tsx`, e com ele todo
// o three.js/@react-three, nunca entra no HTML inicial: só é buscado se o
// efeito abaixo decidir mostrar a cena.
const Portico = dynamic(() => import('./Portico').then((mod) => mod.Portico), { ssr: false })

/**
 * Os mapas procedurais, de preferência numa thread que não seja esta.
 *
 * O caminho feliz é o worker. O de emergência — navegador sem `Worker`, worker
 * que falhou ao subir, erro em tempo de execução — roda `gerarMapas()` aqui
 * mesmo, que é EXATAMENTE a mesma função com os mesmos números. Degrada em
 * fluidez, nunca em imagem: quem cai no caminho de emergência vê a cena que
 * via antes desta mudança, engasgo incluído. É o pior caso, não um caso pior.
 */
export function pedirMapas(): Promise<Mapas> {
  // A rota tomada é MEDIDA, não suposta.
  //
  // Sem isto, worker e caminho de emergência são indistinguíveis de fora: os
  // dois entregam os mapas prontos, e o cronômetro de `buildAssets` marca ~1 ms
  // nos dois casos, porque ele só mede a embalagem. Um worker que falhasse
  // silenciosamente devolveria a cena ao comportamento antigo — com todos os
  // números parecendo ótimos. `scripts/medir-portico.mts` lê estas marcas.
  const rota = (nome: 'worker' | 'emergencia', inicio: number, mapas: Mapas): Mapas => {
    try {
      performance.measure(`portico:mapas-${nome}`, { start: inicio, end: performance.now() })
    } catch {
      // Medir nunca pode derrubar a cena.
    }
    return mapas
  }
  const inicio = performance.now()

  if (typeof Worker !== 'function') return Promise.resolve(rota('emergencia', inicio, gerarMapas()))

  return new Promise((resolve) => {
    let worker: Worker
    try {
      worker = new Worker(new URL('./portico-texturas.worker.ts', import.meta.url))
    } catch {
      resolve(rota('emergencia', inicio, gerarMapas()))
      return
    }

    // Uma resposta só, e depois o worker morre: ele existe para uma tarefa.
    // Sem isto ele fica vivo segurando ~1,2 MB de buffers já transferidos.
    const encerrar = (mapas: Mapas) => {
      worker.terminate()
      resolve(mapas)
    }

    // Sem conversão: o worker devolve o mesmo formato que `gerarMapas` produz.
    worker.onmessage = (evento: MessageEvent<CargaDeMapas>) => encerrar(rota('worker', inicio, evento.data))
    worker.onerror = () => encerrar(rota('emergencia', inicio, gerarMapas()))

    worker.postMessage('gerar')
  })
}

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
  // ERA UM BOOLEANO, e virou os mapas em si.
  //
  // A cena não sobe mais "quando é hora": sobe quando as texturas EXISTEM. A
  // diferença importa porque o pixel agora nasce noutra thread e chega depois.
  // Montar antes deles e deixá-los entrar quando chegassem daria alguns quadros
  // de chapa sem relevo, sem desgaste e sem ferrugem — um pop na peça que a
  // cena existe para mostrar. Enquanto isso o visitante vê a elevação em SVG,
  // que já é uma composição inteira e não um vazio.
  const [mapas, setMapas] = useState<Mapas | null>(null)
  const [vsync, setVsync] = useState(VSYNC_DEFAULT)

  useEffect(() => {
    if (!hasWebGL()) return
    let vivo = true

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
      // Marco zero da montagem. Precisa nascer AQUI e não no `onCreated` do
      // Canvas: o r3f só chama `onCreated` depois que os filhos renderaram, ou
      // seja, depois de `buildAssets` — ancorar ali mediria a montagem sem a
      // parte mais cara dela. Ver `scripts/medir-portico.mts`.
      const montar = () => {
        performance.mark?.('portico:montagemPedida')
        // O worker começa a trabalhar aqui e a cena sobe quando ele responde.
        // A ociosidade que este agendamento espera continua valendo: não é para
        // disputar com a rolagem nem a partida do worker.
        void pedirMapas().then((prontos) => {
          if (vivo) setMapas(prontos)
        })
      }
      if (typeof window.requestIdleCallback === 'function') {
        idle = window.requestIdleCallback(montar, { timeout: 2000 })
      } else {
        timer = window.setTimeout(montar, 600)
      }
    }

    const evaluate = () => {
      if (motionQuery.matches) {
        setMapas(null)
        return
      }
      if (document.readyState === 'complete') agendar()
      else window.addEventListener('load', agendar, { once: true })
    }
    evaluate()

    motionQuery.addEventListener('change', evaluate)
    return () => {
      vivo = false
      motionQuery.removeEventListener('change', evaluate)
      window.removeEventListener('load', agendar)
      if (idle !== undefined) window.cancelIdleCallback?.(idle)
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [])

  return (
    <div className="h-full w-full">
      {mapas ? (
        <Portico systems={systems} vsync={vsync} mapas={mapas} />
      ) : (
        <PorticoFallback systems={systems} />
      )}
    </div>
  )
}
