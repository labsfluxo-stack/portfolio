'use client'
import { useEffect, useState } from 'react'
import { usePrefersReducedMotion } from '@/lib/motion'
import type { Dictionary, Locale } from '@/content/types'

const STORAGE_KEY = 'sala-de-controle:boot'
const TOTAL_MS = 400

function hasBooted(): boolean {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    // sessionStorage pode lançar em modo privado ou com a quota excedida.
    // Sem como lembrar entre navegações, mas travar a experiência atrás de
    // uma API que pode falhar é pior — tratamos como já visto e pulamos.
    return true
  }
}

function markBooted(): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // Mesma tolerância de hasBooted(): sem persistência não repete dentro
    // desta mesma renderização, e a próxima navegação tenta de novo — não é
    // pior do que não ter sessionStorage nenhum.
  }
}

/**
 * Sequência de boot decorativa (~400ms), uma vez por sessão. Não é a fonte
 * do conteúdo — o Hero já está no HTML por baixo dela o tempo todo; o boot
 * só cobre a tela por um instante e some, nunca prende o foco nem bloqueia
 * clique (pointer-events-none).
 */
export function Boot({ dict }: { dict: Dictionary; locale: Locale }) {
  const reduced = usePrefersReducedMotion()
  const [visible, setVisible] = useState(false)
  const [linesShown, setLinesShown] = useState(0)

  useEffect(() => {
    // `reduced` some da fonte de verdade do matchMedia via um efeito à
    // parte (lib/motion.ts), então o primeiro render deste componente
    // sempre enxerga `reduced=false`, mesmo com a preferência do SO já
    // ligada. Por isso a correção é incondicional a cada render em vez de
    // um simples `if (reduced) return`: sem isso, a primeira passagem
    // (com o valor ainda desatualizado) chega a marcar `visible=true`
    // antes da passagem seguinte corrigir — e um `return` bruto nunca
    // desfaria esse `true` já setado. Mesmo padrão do Counter (Task 2).
    if (reduced) {
      setVisible(false)
      return
    }
    if (hasBooted()) return
    markBooted()
    setVisible(true)
  }, [reduced])

  useEffect(() => {
    if (!visible) return
    const lines = dict.boot.lines
    const stepMs = TOTAL_MS / lines.length
    const timers = lines.map((_, i) => setTimeout(() => setLinesShown(i + 1), stepMs * i))
    timers.push(setTimeout(() => setVisible(false), TOTAL_MS))
    return () => timers.forEach(clearTimeout)
  }, [visible, dict.boot.lines])

  if (!visible) return null

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-bg font-mono text-xs text-muted"
    >
      <div className="flex flex-col gap-1">
        {dict.boot.lines.slice(0, linesShown).map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
    </div>
  )
}
