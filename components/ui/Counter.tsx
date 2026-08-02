'use client'
import { useEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from '@/lib/motion'
import { formatNumber } from '@/lib/format'
import type { Locale } from '@/content/types'

export function Counter({
  to,
  locale,
  suffix = '',
  durationMs = 1200,
}: {
  to: number
  locale: Locale
  suffix?: string
  durationMs?: number
}) {
  const reduced = usePrefersReducedMotion()
  const [value, setValue] = useState(reduced ? to : 0)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (reduced) {
      setValue(to)
      return
    }
    const el = ref.current
    if (!el) return

    // O tick reatribui a cada quadro; o cleanup cancela sempre o mais recente.
    let frame = 0

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        io.disconnect()
        const start = performance.now()
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / durationMs)
          // easeOutCubic — desacelera no fim, que é onde o olho pousa
          setValue(Math.round(to * (1 - Math.pow(1 - t, 3))))
          if (t < 1) frame = requestAnimationFrame(tick)
        }
        frame = requestAnimationFrame(tick)
      },
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      // Sem cancelar, o laço sobrevive ao unmount por até durationMs, e uma
      // troca de `to` deixa o tick antigo correndo em paralelo com o novo —
      // dois laços disputando o mesmo setValue.
      if (frame) cancelAnimationFrame(frame)
    }
  }, [to, durationMs, reduced])

  return (
    <span ref={ref}>
      {formatNumber(value, locale)}
      {suffix}
    </span>
  )
}
