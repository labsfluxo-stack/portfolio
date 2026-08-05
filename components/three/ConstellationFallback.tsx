import type { System } from '@/content/systems'
import { buildConstellationGraph } from './useConstellationData'

const VIEW_SIZE = 200
const CENTER = VIEW_SIZE / 2
const LAYOUT_RADIUS = 76
const MIN_NODE_RADIUS = 8
const MAX_NODE_RADIUS = 28
const MIN_STROKE_WIDTH = 1
const MAX_STROKE_WIDTH = 4

/**
 * O mesmo grafo da cena WebGL (`Constellation.tsx`), desenhado como SVG
 * estático — sem `useState`, sem efeito, sem `'use client'`. Renderiza no
 * servidor porque é exatamente o que precisa chegar pronto no HTML: quem
 * não tem JavaScript, quem pediu `prefers-reduced-motion: reduce`, e quem
 * está abaixo de 768px (ver `ConstellationSlot`) nunca depende de nenhum
 * script rodar para ver este grafo.
 *
 * Puramente decorativo — `aria-hidden` no próprio `<svg>` — porque a
 * informação que ele representa (sistemas, linhas de código, stack
 * compartilhada) já existe em texto real nas seções de Telemetria e
 * Sistemas. Um leitor de tela não perde nada ao pular isto.
 */
export function ConstellationFallback({ systems }: { systems: readonly System[] }) {
  const { nodes, edges } = buildConstellationGraph(systems)

  const point = (position: { x: number; y: number }) => ({
    x: CENTER + position.x * LAYOUT_RADIUS,
    y: CENTER - position.y * LAYOUT_RADIUS,
  })

  return (
    <svg aria-hidden="true" viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      {edges.map((edge) => {
        const from = nodes.find((node) => node.slug === edge.source)
        const to = nodes.find((node) => node.slug === edge.target)
        if (!from || !to) return null
        const a = point(from.position)
        const b = point(to.position)
        return (
          <line
            key={`${edge.source}-${edge.target}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            className="stroke-data"
            strokeWidth={MIN_STROKE_WIDTH + edge.weight * (MAX_STROKE_WIDTH - MIN_STROKE_WIDTH)}
            strokeOpacity={0.5}
          />
        )
      })}
      {nodes.map((node) => {
        const { x, y } = point(node.position)
        return (
          <circle
            key={node.slug}
            data-node
            cx={x}
            cy={y}
            r={MIN_NODE_RADIUS + node.size * (MAX_NODE_RADIUS - MIN_NODE_RADIUS)}
            className="fill-text"
          />
        )
      })}
    </svg>
  )
}
