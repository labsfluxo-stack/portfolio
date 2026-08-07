import { CONTAINER } from './portico-model'
import { buildArchitecture } from './portico-architecture'
import type { StackLayer } from '@/content/types'

/**
 * A mesma arquitetura da cena WebGL, desenhada como elevação técnica.
 *
 * Sem `'use client'`, sem `useState`, sem efeito: renderiza no servidor
 * porque é exatamente o que precisa chegar pronto no HTML. Quem não executa
 * JavaScript, quem pediu `prefers-reduced-motion: reduce` e quem está abaixo
 * de 768px (ver `PorticoSlot`) nunca depende de script nenhum para ver isto.
 *
 * É um desenho de engenharia de propósito, não uma versão pobre da cena:
 * mesma máquina, outro dialeto. A largura de cada patamar e as cotas saem da
 * MESMA função que a cena 3D usa (`buildArchitecture`), então o desenho não
 * pode divergir do objeto animado sem alguém mexer nos dois — se o dicionário
 * mudar, os dois mudam juntos.
 *
 * Puramente decorativo — `aria-hidden` no próprio `<svg>` — porque o que ele
 * representa já existe em texto de verdade na seção Stack.
 */

/** Unidades de desenho por metro. */
const SCALE = 7
const VIEW_W = 300
const VIEW_H = 230
/** Linha do terreno. */
const GROUND = 196
/** Eixo vertical da pirâmide. */
const AXIS = 88

const BOX_H = CONTAINER.height * SCALE

/** Milímetros — a unidade padrão de uma planta, por isso sem sufixo. */
const mm = (metres: number): string => String(Math.round(metres * 1000))

export function PorticoFallback({ layers }: { layers: readonly StackLayer[] }) {
  const { tiers, width, height } = buildArchitecture(layers)
  const half = (width * SCALE) / 2
  const top = GROUND - tiers.length * BOX_H
  const leaderX = AXIS + half + 12
  const labelX = leaderX + 6
  /** Linha de cota da altura total. */
  const dimX = AXIS - half - 22
  /** Linha de cota da largura da base. */
  const dimY = GROUND + 16

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

      {/* ── a ponte rolante: trilho, viga e o cabo descendo ── */}
      <g className="stroke-border" strokeWidth="1">
        <line x1="8" y1="16" x2={VIEW_W - 8} y2="16" />
        <rect x={AXIS - 26} y="18" width="52" height="7" />
        <line x1={AXIS - 9} y1="25" x2={AXIS - 9} y2={top - 12} />
        <line x1={AXIS + 9} y1="25" x2={AXIS + 9} y2={top - 12} />
        <rect x={AXIS - 22} y={top - 12} width="44" height="6" />
      </g>
      {/* tirantes: a instalação continua acima do quadro */}
      <g className="stroke-faint" strokeWidth="0.7">
        {[-3, -1.6, -0.2, 1.2, 2.6].map((k) => (
          <line key={k} x1={VIEW_W / 2 + k * 46} y1="0" x2={VIEW_W / 2 + k * 46} y2="16" />
        ))}
      </g>
      {/* Lâmpada de estado — o mesmo ponto único de `--color-data` da cena. */}
      <circle cx={AXIS + 20} cy="21.5" r="2" className="fill-data" />

      {/* ── a pirâmide ── */}
      {tiers.map((tier, index) => {
        const y = GROUND - (index + 1) * BOX_H
        const w = tier.width * SCALE
        const x = AXIS - w / 2
        const middle = y + BOX_H / 2
        return (
          <g key={`${index}:${tier.label}`}>
            <rect x={x + 3} y={y + 3} width={Math.max(1, w - 6)} height={BOX_H - 6} fill="url(#portico-chapa)" />
            <rect x={x} y={y} width={w} height={BOX_H} className="stroke-border" strokeWidth="1.2" />
            {/* cantoneiras */}
            {[
              [x, y],
              [x + w - 5, y],
              [x, y + BOX_H - 4],
              [x + w - 5, y + BOX_H - 4],
            ].map(([cx, cy]) => (
              <rect key={`${cx},${cy}`} x={cx} y={cy} width="5" height="4" className="fill-border" />
            ))}
            <line x1={x + w} y1={middle} x2={leaderX} y2={middle} className="stroke-faint" strokeWidth="0.7" />
            <text
              x={labelX}
              y={middle}
              dominantBaseline="middle"
              fontSize="7"
              letterSpacing="0.08em"
              className="fill-muted font-mono"
            >
              {tier.label.toUpperCase()}
            </text>
          </g>
        )
      })}

      {/* ── terreno ── */}
      <line x1="14" y1={GROUND} x2={VIEW_W - 10} y2={GROUND} className="stroke-border" strokeWidth="1.2" />
      <rect x="14" y={GROUND} width={VIEW_W - 24} height="6" fill="url(#portico-terreno)" />

      {/* ── cotas ── */}
      <g className="stroke-faint" strokeWidth="0.7">
        <line x1={dimX - 6} y1={top} x2={AXIS - half - 2} y2={top} />
        <line x1={dimX - 6} y1={GROUND} x2={AXIS - half - 2} y2={GROUND} />
        <line x1={dimX} y1={top} x2={dimX} y2={GROUND} markerStart="url(#portico-seta)" markerEnd="url(#portico-seta)" />
        <line x1={AXIS - half} y1={GROUND + 4} x2={AXIS - half} y2={dimY + 6} />
        <line x1={AXIS + half} y1={GROUND + 4} x2={AXIS + half} y2={dimY + 6} />
        <line
          x1={AXIS - half}
          y1={dimY}
          x2={AXIS + half}
          y2={dimY}
          markerStart="url(#portico-seta)"
          markerEnd="url(#portico-seta)"
        />
      </g>
      <text
        x={dimX - 4}
        y={(top + GROUND) / 2}
        fontSize="6.5"
        textAnchor="middle"
        letterSpacing="0.08em"
        transform={`rotate(-90 ${dimX - 4} ${(top + GROUND) / 2})`}
        className="fill-muted font-mono"
      >
        {mm(height)}
      </text>
      <text x={AXIS} y={dimY - 3} fontSize="6.5" textAnchor="middle" letterSpacing="0.08em" className="fill-muted font-mono">
        {mm(width)}
      </text>
    </svg>
  )
}
