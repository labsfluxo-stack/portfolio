import { CONTAINER, LAYER_COUNT } from './portico-model'

/**
 * A mesma pilha da cena WebGL, desenhada como elevação técnica.
 *
 * Sem `'use client'`, sem `useState`, sem efeito: renderiza no servidor
 * porque é exatamente o que precisa chegar pronto no HTML. Quem não executa
 * JavaScript, quem pediu `prefers-reduced-motion: reduce` e quem está abaixo
 * de 768px (ver `PorticoSlot`) nunca depende de script nenhum para ver isto.
 *
 * É um desenho de engenharia de propósito, não uma versão pobre da cena:
 * mesma máquina, outro dialeto. As cotas e a geometria saem das MESMAS
 * constantes que a cena 3D usa (`portico-model.ts`), então o desenho não pode
 * divergir do objeto animado sem alguém mexer nos dois.
 *
 * Puramente decorativo — `aria-hidden` no próprio `<svg>` — porque o que ele
 * representa já existe em texto de verdade na seção Stack.
 */

/** Unidades de desenho por metro. */
const SCALE = 10
const VIEW_W = 300
const VIEW_H = 230
/** Linha do terreno. */
const GROUND = 205
/** Aresta esquerda da pilha. */
const LEFT = 60

const BOX_W = CONTAINER.length * SCALE
const BOX_H = CONTAINER.height * SCALE
const RIGHT = LEFT + BOX_W
const TOP = GROUND - LAYER_COUNT * BOX_H

/** Milímetros — a unidade padrão de uma planta, por isso sem sufixo. */
const mm = (metres: number): string => String(Math.round(metres * 1000))

const LEADER_X = RIGHT + 16
const LABEL_X = LEADER_X + 6
/** Linha de cota da altura total. */
const DIM_X = LEFT - 24
/** Linha de cota do comprimento. */
const DIM_Y = GROUND + 16

export function PorticoFallback({ labels }: { labels: readonly string[] }) {
  const layers = Array.from({ length: LAYER_COUNT }, (_, i) => ({ index: i, label: labels[i] ?? '' }))

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      fill="none"
    >
      <defs>
        {/* Corrugação da chapa como hachura, não como noventa linhas no HTML. */}
        <pattern id="portico-chapa" width="4" height="4" patternUnits="userSpaceOnUse">
          <line x1="0.5" y1="0" x2="0.5" y2="4" className="stroke-faint" strokeWidth="0.7" />
        </pattern>
        {/* Terreno, na hachura a 45° de sempre. */}
        <pattern id="portico-terreno" width="6" height="6" patternUnits="userSpaceOnUse">
          <line x1="0" y1="6" x2="6" y2="0" className="stroke-faint" strokeWidth="0.7" />
        </pattern>
        <marker id="portico-seta" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0.6 L5.4,3 L0,5.4 Z" className="fill-faint" />
        </marker>
      </defs>

      {/* ── içamento: o cabo e o spreader entrando pelo alto do desenho ── */}
      <g className="stroke-border" strokeWidth="1">
        <line x1={LEFT + BOX_W * 0.28} y1="8" x2={LEFT + BOX_W * 0.28} y2={TOP - 14} />
        <line x1={LEFT + BOX_W * 0.72} y1="8" x2={LEFT + BOX_W * 0.72} y2={TOP - 14} />
        <rect x={LEFT + 2} y={TOP - 14} width={BOX_W - 4} height="6" />
      </g>
      {/* Lâmpada de estado — o mesmo ponto único de `--color-data` da cena. */}
      <circle cx={LEFT + BOX_W - 8} cy={TOP - 11} r="2" className="fill-data" />

      {/* ── a pilha ── */}
      {layers.map(({ index, label }) => {
        const y = GROUND - (index + 1) * BOX_H
        const middle = y + BOX_H / 2
        return (
          <g key={`${index}:${label}`}>
            <rect x={LEFT + 3} y={y + 3} width={BOX_W - 6} height={BOX_H - 6} fill="url(#portico-chapa)" />
            <rect x={LEFT} y={y} width={BOX_W} height={BOX_H} className="stroke-border" strokeWidth="1.2" />
            {/* cantoneiras */}
            {[
              [LEFT, y],
              [RIGHT - 5, y],
              [LEFT, y + BOX_H - 4],
              [RIGHT - 5, y + BOX_H - 4],
            ].map(([cx, cy]) => (
              <rect key={`${cx},${cy}`} x={cx} y={cy} width="5" height="4" className="fill-border" />
            ))}
            <line x1={RIGHT} y1={middle} x2={LEADER_X} y2={middle} className="stroke-faint" strokeWidth="0.7" />
            <text
              x={LABEL_X}
              y={middle}
              dominantBaseline="middle"
              fontSize="7"
              letterSpacing="0.08em"
              className="fill-muted font-mono"
            >
              {label.toUpperCase()}
            </text>
          </g>
        )
      })}

      {/* ── terreno ── */}
      <line x1="20" y1={GROUND} x2={VIEW_W - 10} y2={GROUND} className="stroke-border" strokeWidth="1.2" />
      <rect x="20" y={GROUND} width={VIEW_W - 30} height="6" fill="url(#portico-terreno)" />

      {/* ── cotas ── */}
      <g className="stroke-faint" strokeWidth="0.7">
        <line x1={DIM_X - 6} y1={TOP} x2={LEFT - 2} y2={TOP} />
        <line x1={DIM_X - 6} y1={GROUND} x2={LEFT - 2} y2={GROUND} />
        <line x1={DIM_X} y1={TOP} x2={DIM_X} y2={GROUND} markerStart="url(#portico-seta)" markerEnd="url(#portico-seta)" />
        <line x1={LEFT} y1={GROUND + 4} x2={LEFT} y2={DIM_Y + 6} />
        <line x1={RIGHT} y1={GROUND + 4} x2={RIGHT} y2={DIM_Y + 6} />
        <line x1={LEFT} y1={DIM_Y} x2={RIGHT} y2={DIM_Y} markerStart="url(#portico-seta)" markerEnd="url(#portico-seta)" />
      </g>
      <text
        x={DIM_X - 4}
        y={(TOP + GROUND) / 2}
        fontSize="6.5"
        textAnchor="middle"
        letterSpacing="0.08em"
        transform={`rotate(-90 ${DIM_X - 4} ${(TOP + GROUND) / 2})`}
        className="fill-muted font-mono"
      >
        {mm(LAYER_COUNT * CONTAINER.height)}
      </text>
      <text
        x={(LEFT + RIGHT) / 2}
        y={DIM_Y - 3}
        fontSize="6.5"
        textAnchor="middle"
        letterSpacing="0.08em"
        className="fill-muted font-mono"
      >
        {mm(CONTAINER.length)}
      </text>
    </svg>
  )
}
