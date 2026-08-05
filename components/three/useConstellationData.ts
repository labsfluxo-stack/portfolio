import { useMemo } from 'react'
import type { System } from '@/content/systems'

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

function linesOf(system: System): number {
  return system.metrics.find((metric) => metric.key === 'lines')?.value ?? 0
}

/**
 * Função pura — sem hooks, sem DOM — para que `ConstellationFallback`
 * (renderizado no servidor) e o teste de unidade possam chamá-la fora de um
 * componente React. `useConstellationData` abaixo é só a casca que memoiza
 * para o consumidor dentro da árvore React (a cena WebGL).
 */
export function buildConstellationGraph(systems: readonly System[]): ConstellationGraph {
  if (systems.length === 0) return { nodes: [], edges: [] }

  const linesValues = systems.map(linesOf)
  const minLines = Math.min(...linesValues)
  const maxLines = Math.max(...linesValues)
  const spread = maxLines - minLines

  const nodes: ConstellationNode[] = systems.map((system, index) => {
    const normalized = spread === 0 ? 1 : (linesOf(system) - minLines) / spread
    const angle = (index / systems.length) * Math.PI * 2
    return {
      slug: system.slug,
      size: normalized,
      position: { x: Math.cos(angle), y: Math.sin(angle), z: 0 },
    }
  })

  const rawEdges: { source: string; target: string; sharedStack: string[] }[] = []
  for (let i = 0; i < systems.length; i += 1) {
    for (let j = i + 1; j < systems.length; j += 1) {
      const a = systems[i]
      const b = systems[j]
      if (!a || !b) continue
      const sharedStack = a.stack.filter((tech) => b.stack.includes(tech))
      if (sharedStack.length > 0) {
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

export function useConstellationData(systems: readonly System[]): ConstellationGraph {
  return useMemo(() => buildConstellationGraph(systems), [systems])
}
