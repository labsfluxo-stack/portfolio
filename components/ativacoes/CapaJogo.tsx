'use client'

import { useEffect, useRef, useState } from 'react'
import type { Dictionary } from '@/content/types'
import { BotaoWhatsapp } from '@/components/landing/Botao'
import {
  avancar,
  criarPartida,
  mediaReacao,
  tocarEm,
  type Partida,
} from './motor-reflexo'

/**
 * A dobra é uma partida rodando de verdade. O visitante brinca antes de ler
 * que a dupla faz jogos, e a mesma peça prova três promessas de uma vez: roda
 * no navegador, sem app, e liso no celular fraco.
 *
 * O TEXTO NÃO É DESENHADO NO CANVAS. `<h1>`, subtítulo e CTA são DOM real
 * posicionado por cima — ver spec §4.2. Canvas é invisível para os crawlers
 * que não executam JavaScript, e a landing irmã deste repositório vende
 * exatamente esse argumento.
 *
 * O estado da partida vive num `ref`, não em `useState`: são ~60 transições por
 * segundo, e re-renderizar o React a cada quadro colocaria na thread principal
 * justamente o custo que este componente existe para não ter. Só o placar
 * atravessa para o React, e só quando muda de valor.
 */

/** Cor do alvo: `--color-warn` (#FFB020). Não é cor nova — já está no `@theme`
 *  — e dá ~11:1 contra o fundo do canvas, muito acima do mínimo de 3:1 da WCAG
 *  1.4.11 para elemento não textual. A trava está em tests/unit/contraste.test.ts. */
const COR_ALVO = '#FFB020'
const COR_FUNDO = '#08090C'
const COR_TRILHO = '#1F232B'
/** Acima de 2 o ganho é invisível e o custo de preenchimento dobra. */
const DPR_MAX = 2

export function CapaJogo({ dict }: { dict: Dictionary }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const partidaRef = useRef<Partida | null>(null)
  const [placar, setPlacar] = useState({ acertos: 0, reacao: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // `getContext` pode devolver null (jsdom, canvas desligado por política de
    // empresa) e, em ambientes antigos, lançar. Os dois casos caem no mesmo
    // lugar: sem contexto, a capa fica com o fundo estático do CSS e o texto
    // continua todo lá. Não é degradação, é o comportamento correto.
    let ctx: CanvasRenderingContext2D | null = null
    try {
      ctx = canvas.getContext('2d')
    } catch {
      ctx = null
    }
    if (!ctx) return
    const pincel = ctx

    const semSuporte = typeof window.matchMedia !== 'function'
    const menosMovimento =
      !semSuporte && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Semente derivada do relógio de montagem: a partida muda de visita para
    // visita, e mesmo assim o motor segue puro — quem sorteia é aqui, não lá.
    partidaRef.current = criarPartida(Date.now() % 2147483647, performance.now())

    let largura = 0
    let altura = 0
    const medir = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, DPR_MAX)
      const caixa = canvas.getBoundingClientRect()
      largura = caixa.width
      altura = caixa.height
      canvas.width = Math.round(largura * dpr)
      canvas.height = Math.round(altura * dpr)
      pincel.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    medir()

    let visivel = true
    let quadro = 0
    let ultimoPlacar = { acertos: -1, reacao: -1 }

    const desenhar = (agora: number) => {
      const anterior = partidaRef.current
      if (!anterior) return
      // Menos movimento desliga o jogador automático, e só ele: os alvos
      // continuam nascendo e continuam clicáveis. `animation-duration: 0` não
      // é acessibilidade, e jogo que some também não.
      const estado = avancar(anterior, agora, !menosMovimento)
      partidaRef.current = estado

      pincel.fillStyle = COR_FUNDO
      pincel.fillRect(0, 0, largura, altura)

      for (const alvo of estado.alvos) {
        const idade = agora - alvo.nascidoEm
        // O alvo encolhe conforme o tempo dele acaba: é o que transmite pressa
        // sem escrever "rápido!" na tela.
        const vida = Math.max(0, 1 - idade / 1200)
        const raio = alvo.raio * Math.min(largura, altura) * (0.55 + 0.45 * vida)

        pincel.beginPath()
        pincel.arc(alvo.x * largura, alvo.y * altura, raio, 0, Math.PI * 2)
        pincel.fillStyle = COR_ALVO
        pincel.fill()

        pincel.beginPath()
        pincel.arc(alvo.x * largura, alvo.y * altura, raio * 1.9, 0, Math.PI * 2)
        pincel.strokeStyle = COR_TRILHO
        pincel.lineWidth = 1
        pincel.stroke()
      }

      const atual = { acertos: estado.acertos, reacao: mediaReacao(estado) }
      if (atual.acertos !== ultimoPlacar.acertos || atual.reacao !== ultimoPlacar.reacao) {
        ultimoPlacar = atual
        setPlacar(atual)
      }

      quadro = requestAnimationFrame(desenhar)
    }

    const ligar = () => {
      if (quadro) return
      quadro = requestAnimationFrame(desenhar)
    }
    const desligar = () => {
      if (!quadro) return
      cancelAnimationFrame(quadro)
      quadro = 0
    }

    // Nada de rAF girando fora da tela nem em aba de fundo: é o orçamento de
    // quadro da spec §4.5, e é o que separa "canvas leve" de "canvas que
    // esquenta o celular de quem já rolou a página".
    const aoTrocarAba = () => (document.hidden || !visivel ? desligar() : ligar())
    document.addEventListener('visibilitychange', aoTrocarAba)

    let observador: IntersectionObserver | null = null
    if (typeof IntersectionObserver === 'function') {
      observador = new IntersectionObserver((entradas) => {
        visivel = entradas.some((e) => e.isIntersecting)
        aoTrocarAba()
      })
      observador.observe(canvas)
    } else {
      ligar()
    }

    let redimensionador: ResizeObserver | null = null
    if (typeof ResizeObserver === 'function') {
      redimensionador = new ResizeObserver(medir)
      redimensionador.observe(canvas)
    }

    const aoTocar = (evento: PointerEvent) => {
      const estado = partidaRef.current
      if (!estado) return
      const caixa = canvas.getBoundingClientRect()
      // `tocarEm`, não `tocar`: o laço de rAF fica pausado fora da tela e em
      // aba oculta, e um toque que chegue nesse intervalo precisa reavaliar
      // a duração da partida antes de ser julgado — ver comentário em
      // `motor-reflexo.ts`. `agora` é capturado uma vez e reaproveitado, em
      // vez de duas chamadas a `performance.now()` que poderiam divergir
      // entre o instante que `avancar` usa e o que `tocar` usa.
      const agora = performance.now()
      partidaRef.current = tocarEm(
        estado,
        (evento.clientX - caixa.left) / caixa.width,
        (evento.clientY - caixa.top) / caixa.height,
        agora,
        !menosMovimento,
      )
    }
    canvas.addEventListener('pointerdown', aoTocar)

    return () => {
      desligar()
      document.removeEventListener('visibilitychange', aoTrocarAba)
      canvas.removeEventListener('pointerdown', aoTocar)
      observador?.disconnect()
      redimensionador?.disconnect()
    }
  }, [])

  const { capa, cta } = dict.ativacoes

  return (
    <section className="relative isolate overflow-hidden border-b border-border">
      {/* O canvas é fundo absoluto; o conteúdo vem por cima em fluxo normal.
        * `aria-hidden` e sem `tabindex`: nenhuma informação vive só aqui.
        * `touch-none` impede o navegador de interpretar o toque no alvo como
        * início de rolagem — sem isso, no celular, metade dos acertos vira
        * scroll. */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 -z-10 h-full w-full touch-none bg-bg"
      />
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-24 sm:py-32">
        <h1 className="font-serif text-5xl leading-[1.05] tracking-tight text-text sm:text-7xl">
          {capa.titulo}
          <br />
          <em className="text-data">{capa.tituloDestaque}</em>
        </h1>
        <p className="max-w-xl text-[17px] leading-relaxed text-muted">{capa.subtitulo}</p>
        <div className="flex flex-col gap-2">
          <BotaoWhatsapp numero={dict.contact.whatsapp} mensagem={cta.mensagem} variante="claro">
            {cta.rotulo}
          </BotaoWhatsapp>
          <span className="font-mono text-xs uppercase tracking-[0.15em] text-faint">
            {cta.tranquilizador}
          </span>
        </div>
        {/* Placar e convite são `aria-hidden`: duplicam o que o canvas mostra,
          * e um leitor de tela anunciando "3 acertos" a cada segundo seria
          * ruído puro. */}
        <div
          aria-hidden="true"
          className="flex items-baseline gap-4 font-mono text-xs uppercase tracking-[0.15em] text-faint"
        >
          <span>{capa.convite}</span>
          <span className="text-data">
            {placar.acertos} {capa.placar.acertos}
          </span>
          <span>
            {placar.reacao} {capa.placar.reacao}
          </span>
        </div>
      </div>
    </section>
  )
}
