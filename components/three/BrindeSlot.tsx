'use client'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { CanecaFallback } from './CanecaFallback'

/**
 * Decide entre a cena WebGL (`Caneca.tsx`) e a versão plana em DOM
 * (`CanecaFallback.tsx`) — nunca as duas ao mesmo tempo. Mesma forma de
 * `PorticoSlot.tsx`: `next/dynamic` com `ssr: false`, chamado aqui (um
 * Client Component) porque a regra do Next só permite isso a partir de um.
 *
 * DIFERENÇA DELIBERADA em relação ao Pórtico: lá o slot também decide por
 * `prefers-reduced-motion` (a cena INTEIRA vira fallback sob movimento
 * reduzido), porque aquela cena é decoração de página que ninguém pediu.
 * Esta aqui só existe depois de um clique — `BrindeModal.tsx` só renderiza
 * `<CanecaSlot>` com o modal aberto —, e o brief pede explicitamente que
 * quem pediu menos movimento continue vendo a caneca, só sem o giro (ver
 * `useReduzido` em `Caneca.tsx`). Este componente decide SÓ por WebGL.
 *
 * Também sem o agendamento por ociosidade que `PorticoSlot` usa: aquele
 * existe para não competir com o carregamento inicial da página. Esta cena
 * nasce de uma ação deliberada da pessoa (abrir o modal), não do
 * carregamento — não há "carregamento" com que competir.
 */
const Caneca = dynamic(() => import('./Caneca').then((mod) => mod.Caneca), { ssr: false })
const Ecobag = dynamic(() => import('./Ecobag').then((mod) => mod.Ecobag), { ssr: false })
const Bone = dynamic(() => import('./Bone').then((mod) => mod.Bone), { ssr: false })

/** As peças do brinde. O valor é a chave no dicionário e o identificador
 *  no seletor do modal — um só nome para as duas coisas, para não existir
 *  tradução de identificador em lugar nenhum. */
export const PECAS = ['caneca', 'ecobag', 'bone'] as const
export type Peca = (typeof PECAS)[number]

const CENAS: Record<Peca, typeof Caneca> = { caneca: Caneca, ecobag: Ecobag, bone: Bone }

/** Não confiar em user-agent: pede o contexto e vê o que volta — a mesma
 *  técnica de `hasWebGL()` em `PorticoSlot.tsx`, reescrita aqui (e não
 *  importada de lá) para este arquivo não arrastar `PorticoSlot.tsx` e sua
 *  árvore de import para dentro do chunk do modal de brinde. */
export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

export function BrindeSlot({
  peca,
  corMarca,
  nomeMarca,
}: {
  peca: Peca
  corMarca: string
  nomeMarca: string
}) {
  // `null` inicial, não `false`: o estado de repouso antes do efeito rodar
  // não pode depender de uma API só-de-navegador (mesma regra que rege
  // `PorticoSlot` e, antes dele, `Counter.tsx`) — mas como este componente
  // só é montado depois de um clique, já inteiramente no cliente, o efeito
  // roda no mesmo quadro em que aparece, sem SSR nem hidratação para
  // divergir. `null` só evita desenhar QUALQUER versão por um instante,
  // preferível a supor WebGL disponível e ter que trocar de volta.
  const [suportado, setSuportado] = useState<boolean | null>(null)

  useEffect(() => {
    setSuportado(hasWebGL())
  }, [])

  if (suportado === null) return null
  if (!suportado) {
    // SEM WEBGL, UMA PEÇA SÓ, e é a caneca. O plano em DOM existe para o
    // modal nunca ficar vazio; desenhar três versões planas seria triplicar
    // um caminho de exceção que quase ninguém percorre. Quem cai aqui não vê
    // o seletor (`BrindeModal.tsx` o esconde), então não há promessa de
    // escolha sendo quebrada — o que apareceria seria uma caneca rotulada
    // como boné, que é pior do que não escolher.
    return <CanecaFallback corMarca={corMarca} nomeMarca={nomeMarca} />
  }
  const Cena = CENAS[peca]
  return <Cena corMarca={corMarca} nomeMarca={nomeMarca} />
}
