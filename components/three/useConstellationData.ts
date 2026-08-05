import { useMemo } from 'react'
import type { ConstellationSystem } from './constellation-data'

/**
 * Um sistema, virado nó de grafo. `size` é 0..1, normalizado a partir da
 * métrica `lines` (linhas de código) do conjunto inteiro — 0 é o sistema com
 * menos linhas, 1 o que tem mais. Sem essa normalização, o sistema menor
 * (hoje, Saturno Labs) e o maior (OSCapstack) ficariam do mesmo tamanho na
 * cena, escondendo a única informação que o raio existe para carregar. O
 * piso visual (todo nó precisa ser visível, nunca um ponto) é decisão de
 * cada renderizador — `ConstellationFallback` e `Constellation` mapeiam este
 * 0..1 para o próprio intervalo de raio, em unidades diferentes (px vs.
 * unidades de mundo three.js). `position` é determinística (layout circular
 * pelo índice), nunca aleatória: a mesma entrada de `systems` sempre produz
 * o mesmo grafo, no servidor (fallback SVG) e no cliente (cena WebGL).
 */
export type ConstellationNode = {
  slug: string
  size: number
  position: { x: number; y: number; z: number }
}

/**
 * Uma aresta entre dois sistemas que compartilham ao menos uma tecnologia
 * (`System.stack`). `weight` é 0..1, normalizado pelo maior número de
 * tecnologias em comum encontrado no conjunto — controla a espessura do
 * traço, não sua existência: a aresta só existe quando `sharedStack` não é
 * vazio.
 */
export type ConstellationEdge = {
  source: string
  target: string
  weight: number
  sharedStack: string[]
}

export type ConstellationGraph = {
  nodes: ConstellationNode[]
  edges: ConstellationEdge[]
}

/**
 * Ângulo áureo. Distribuir os nós por múltiplos dele (esfera de Fibonacci)
 * dá um espalhamento que parece orgânico e nunca repete padrão, ao contrário
 * do círculo de ângulos iguais que a primeira versão usava — com nove nós,
 * aquilo lia como mostrador de relógio.
 */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

/**
 * Quantas tecnologias dois sistemas precisam ter em comum para virarem
 * aresta.
 *
 * Com o limiar em 1, o grafo ficava quase completo e a cena virava uma teia
 * ilegível — porque **todos** os nove sistemas usam TypeScript. Uma aresta
 * que liga tudo a tudo não carrega informação nenhuma. Exigindo duas
 * tecnologias em comum, a aresta volta a significar "estes dois sistemas
 * são de fato parentes", que é o que ela existe para dizer.
 */
const MIN_SHARED_FOR_EDGE = 2

/**
 * Função pura — sem hooks, sem DOM — para que `ConstellationFallback`
 * (renderizado no servidor) e o teste de unidade possam chamá-la fora de um
 * componente React. `useConstellationData` abaixo é só a casca que memoiza
 * para o consumidor dentro da árvore React (a cena WebGL).
 */
export function buildConstellationGraph(
  systems: readonly ConstellationSystem[],
): ConstellationGraph {
  if (systems.length === 0) return { nodes: [], edges: [] }

  // Escala logarítmica, não linear. Os sistemas vão de 620 a 78.900 linhas —
  // uma razão de 127×. Em escala linear o menor vira um ponto invisível e o
  // maior domina a cena inteira; o log comprime a diferença sem apagá-la,
  // que é o que faz os nove nós coexistirem legíveis.
  const logOf = (system: ConstellationSystem) => Math.log10(Math.max(1, system.lines))
  const logs = systems.map(logOf)
  const minLog = Math.min(...logs)
  const maxLog = Math.max(...logs)
  const spread = maxLog - minLog

  const total = systems.length

  const nodes: ConstellationNode[] = systems.map((system, index) => {
    const normalized = spread === 0 ? 1 : (logOf(system) - minLog) / spread

    // Esfera de Fibonacci: y desce linearmente de 1 a -1 e o ângulo avança
    // pelo ângulo áureo, o que espalha os pontos sem aglomerar nos polos.
    const y = total === 1 ? 0 : 1 - (index / (total - 1)) * 2
    const ringRadius = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = GOLDEN_ANGLE * index

    return {
      slug: system.slug,
      size: normalized,
      position: {
        x: Math.cos(theta) * ringRadius,
        y,
        z: Math.sin(theta) * ringRadius,
      },
    }
  })

  const rawEdges: { source: string; target: string; sharedStack: string[] }[] = []
  for (let i = 0; i < systems.length; i += 1) {
    for (let j = i + 1; j < systems.length; j += 1) {
      const a = systems[i]
      const b = systems[j]
      if (!a || !b) continue
      const sharedStack = a.stack.filter((tech) => b.stack.includes(tech))
      if (sharedStack.length >= MIN_SHARED_FOR_EDGE) {
        rawEdges.push({ source: a.slug, target: b.slug, sharedStack })
      }
    }
  }

  const maxShared = Math.max(1, ...rawEdges.map((edge) => edge.sharedStack.length))
  const edges: ConstellationEdge[] = rawEdges.map((edge) => ({
    ...edge,
    weight: edge.sharedStack.length / maxShared,
  }))

  return { nodes, edges }
}

export function useConstellationData(
  systems: readonly ConstellationSystem[],
): ConstellationGraph {
  return useMemo(() => buildConstellationGraph(systems), [systems])
}
