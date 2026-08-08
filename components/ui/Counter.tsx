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
  // O estado de repouso é o valor final, não 0. No servidor não existe
  // `matchMedia` (usePrefersReducedMotion() sempre devolve `false` lá), então
  // se o valor inicial dependesse de `reduced` o HTML estático sempre
  // serializaria 0 — exatamente o número que os crawlers de IA (que não
  // executam JS) acabariam lendo. A contagem de 0 até `to` é decoração que só
  // o efeito abaixo acrescenta, e só quando de fato vai rodar no cliente.
  const [value, setValue] = useState(to)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (reduced) {
      // `reduced` chega atrasado — usePrefersReducedMotion() sempre reporta
      // `false` no primeiro render deste componente, corrigindo só depois
      // via efeito próprio. Por isso esta correção é incondicional a cada
      // execução (nunca um `return` mudo): desfaz um zeramento que a
      // passagem anterior, com o valor ainda desatualizado, possa ter feito.
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
        // A animação é o enfeite: zera aqui dentro, só quando a interseção
        // de fato dispara — nunca incondicionalmente no mount. Zerar no
        // mount fazia o valor certo (o `to` inicial, seguro para SSR)
        // piscar para 0 e subir de novo assim que o efeito rodava, e um
        // card que nunca entra em viewport (ferramenta de screenshot,
        // snapshot headless sem rolar, auditoria de acessibilidade) ficava
        // em 0 permanentemente no DOM vivo — o mesmo defeito que esta
        // classe de correção existe para matar, só que para outro
        // consumidor. Os crawlers sem JavaScript nunca viam isso, porque
        // eles leem o HTML antes de qualquer efeito rodar.
        setValue(0)
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

  // Uma única expressão interpolada, não `{formatNumber(...)}{suffix}`
  // lado a lado: dois nós de texto irmãos fazem o React inserir um
  // comentário de hidratação (`<!-- -->`) entre eles no HTML de verdade do
  // Next (esse comentário não existe em `renderToStaticMarkup`, só no SSR
  // com hidratação — por isso o teste unitário de Counter nunca pegou
  // isto). "250.000+" acabava sem ser uma string contígua no HTML
  // publicado, só no snapshot do teste. O texto visível e o `textContent`
  // do DOM sempre foram corretos; o problema era só a busca literal de
  // substring no HTML bruto — mas era exatamente essa busca que dava à
  // única fonte informativa deste número em prosa contínua fora de JS.
  return <span ref={ref}>{`${formatNumber(value, locale)}${suffix}`}</span>
}
