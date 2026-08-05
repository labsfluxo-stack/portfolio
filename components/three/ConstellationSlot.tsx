'use client'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import type { System } from '@/content/systems'
import { ConstellationFallback } from './ConstellationFallback'

const MIN_WIDTH_QUERY = '(min-width: 768px)'
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

// `ssr: false` só é permitido a partir de um Client Component -- por isso
// este arquivo carrega `'use client'` (mesmo padrão de
// components/sections/Terminal.tsx). O chunk de `Constellation.tsx`, e com
// ele todo o three.js/@react-three, nunca entra no HTML inicial: só é
// buscado se o efeito abaixo decidir mostrar a cena.
const Constellation = dynamic(() => import('./Constellation').then((mod) => mod.Constellation), { ssr: false })

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
 * Decide entre a cena WebGL (`Constellation.tsx`) e o fallback SVG estático
 * (`ConstellationFallback.tsx`) -- nunca os dois ao mesmo tempo.
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
 * as três condições do spec ao mesmo tempo: WebGL disponível,
 * `prefers-reduced-motion` desligado, e largura >= 768px. Falhando
 * qualquer uma, o fallback permanece -- "sem exceção", como pede o brief.
 */
export function ConstellationSlot({ systems }: { systems: readonly System[] }) {
  const [showScene, setShowScene] = useState(false)

  useEffect(() => {
    if (!hasWebGL()) return

    const motionQuery = window.matchMedia(REDUCED_MOTION_QUERY)
    const widthQuery = window.matchMedia(MIN_WIDTH_QUERY)

    const evaluate = () => setShowScene(!motionQuery.matches && widthQuery.matches)
    evaluate()

    motionQuery.addEventListener('change', evaluate)
    widthQuery.addEventListener('change', evaluate)
    return () => {
      motionQuery.removeEventListener('change', evaluate)
      widthQuery.removeEventListener('change', evaluate)
    }
  }, [])

  return <div className="h-full w-full">{showScene ? <Constellation systems={systems} /> : <ConstellationFallback systems={systems} />}</div>
}
