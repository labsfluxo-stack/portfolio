'use client'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { hasWebGL } from './BrindeSlot'

/**
 * Decide se o arraial em 3D entra na dobra — e nunca deixa a dobra vazia.
 *
 * Mesma forma de `BrindeSlot`/`PorticoSlot`: `next/dynamic` com `ssr: false`
 * chamado a partir de um Client Component, que é a única forma permitida pelo
 * Next. O chunk do three.js não entra no HTML inicial; ele é buscado depois de
 * o efeito abaixo decidir que vale a pena.
 *
 * QUEM CAI FORA NÃO PERDE NADA. Sem WebGL este componente devolve `null`, e a
 * dobra continua desenhando o arraial em canvas 2D que já existia antes desta
 * cena (`temas/junino.ts`) — completo, testado e com os mesmos objetos. O 3D é
 * uma camada por cima daquilo, jamais a condição para a página funcionar.
 *
 * DIFERENÇA EM RELAÇÃO AO BRINDE: aquele modal só existe depois de um clique
 * deliberado, então podia carregar sem pressa. Este é cenário da primeira
 * dobra, e por isso espera a OCIOSIDADE do navegador antes de pedir o chunk —
 * a mesma disciplina de `PorticoSlot`. A página tem de terminar de pintar o
 * texto e ficar interativa antes de gastar rede com decoração.
 */
const Arraial = dynamic(() => import('./Arraial').then((mod) => mod.Arraial), { ssr: false })

export function ArraialSlot({ aoDecidir }: { aoDecidir?: (ativo: boolean) => void }) {
  const [mostrar, setMostrar] = useState(false)

  useEffect(() => {
    if (!hasWebGL()) {
      aoDecidir?.(false)
      return
    }
    // `requestIdleCallback` quando existir; `setTimeout` como reserva, porque
    // o Safari só ganhou a API recentemente e não vale um polyfill inteiro.
    const agendar =
      typeof window.requestIdleCallback === 'function'
        ? (fn: () => void) => window.requestIdleCallback(fn, { timeout: 2500 })
        : (fn: () => void) => window.setTimeout(fn, 900)
    const id = agendar(() => {
      setMostrar(true)
      aoDecidir?.(true)
    })
    return () => {
      if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(id as number)
      else window.clearTimeout(id as number)
    }
  }, [aoDecidir])

  if (!mostrar) return null
  return (
    <div aria-hidden="true" className="absolute inset-0 -z-20">
      <Arraial />
    </div>
  )
}
