'use client'

import { useEffect, useRef, useState } from 'react'
import type { Dictionary, Locale } from '@/content/types'
import { BotaoWhatsapp } from '@/components/landing/Botao'
import {
  avancar,
  criarPartida,
  mediaReacao,
  tocarEm,
  VIDA_ALVO_MS,
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
 *
 * O PONTEIRO PRECISA CHEGAR AO CANVAS. O `<div>` de conteúdo cobre a dobra
 * inteira (a 390px cobre 100% dela), e o hit test do navegador segue a ordem de
 * pintura, não o `z-index`: sem `pointer-events-none` nele, TODO evento de
 * ponteiro morre no `<div>` e o `pointerdown` do canvas nunca dispara — a
 * página escreveria "Toque nos alvos." sobre uma superfície inerte. Quem
 * precisa de clique (o CTA) reativa com `pointer-events-auto`.
 */

/** Cor do alvo: `--color-warn` (#FFB020). Não é cor nova — já está no `@theme`
 *  — e dá ~11:1 contra o fundo do canvas, muito acima do mínimo de 3:1 da WCAG
 *  1.4.11 para elemento não textual. A trava está em tests/unit/contraste.test.ts. */
const COR_ALVO = '#FFB020'
const COR_FUNDO = '#08090C'
const COR_TRILHO = '#1F232B'
/** Acima de 2 o ganho é invisível e o custo de preenchimento dobra. */
const DPR_MAX = 2

export function CapaJogo({ dict, locale }: { dict: Dictionary; locale: Locale }) {
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
        // O alvo encolhe conforme o tempo dele acaba: é o que transmite pressa
        // sem escrever "rápido!" na tela.
        //
        // COM MENOS MOVIMENTO O RAIO É CONSTANTE. O encolhimento É a pulsação
        // que a spec §4.4 manda remover — não adianta desligar só o fantasma e
        // deixar cada alvo animando o próprio contorno 60 vezes por segundo. O
        // alvo continua nascendo, expirando e sendo clicável: menos movimento
        // não é um interruptor que esvazia a dobra, e quem pediu menos
        // movimento é justamente quem menos deve ser punido.
        const vida = Math.max(0, 1 - (agora - alvo.nascidoEm) / VIDA_ALVO_MS)
        const escala = menosMovimento ? 1 : 0.55 + 0.45 * vida
        const raio = alvo.raio * Math.min(largura, altura) * escala

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
        *
        * `touch-manipulation`, NÃO `touch-none`. `touch-action: none` entrega
        * ao canvas todo gesto de toque da primeira dobra — inclusive o arrasto
        * de rolagem — e a dobra ocupa a tela inteira do celular: a página
        * pararia de rolar no dedo, e o visitante teria que adivinhar que
        * precisa começar a arrastar mais abaixo. `manipulation` mantém a
        * rolagem e o toque de acerto, e descarta só o zoom por duplo toque, que
        * é o que de fato atrapalha quem está batendo em alvo.
        *
        * O defeito estava latente enquanto o `<div>` de conteúdo comia todos os
        * eventos: `touch-action` num elemento que nunca é alvo de ponteiro não
        * faz nada. Ligar o ponteiro no canvas ligaria este junto. */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 -z-10 h-full w-full touch-manipulation bg-bg"
      />
      {/* `pointer-events-none`: ver o cabeçalho do arquivo. É o que deixa o
        * ponteiro atravessar até o canvas — sem isso não existe superfície
        * jogável nenhuma no celular. */}
      <div className="pointer-events-none mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-24 sm:py-32">
        <h1 className="font-serif text-5xl leading-[1.05] tracking-tight text-text sm:text-7xl">
          {capa.titulo}
          <br />
          <em className="text-data">{capa.tituloDestaque}</em>
        </h1>
        <p className="max-w-xl text-[17px] leading-relaxed text-muted">{capa.subtitulo}</p>
        {/* `pointer-events-auto` devolve o clique ao ÚNICO bloco que precisa
          * dele aqui: o CTA e a linha que o acompanha. O resto da dobra é texto
          * e continua transparente ao ponteiro, que é o que faz o jogo existir.
          * `w-fit` para o bloco não virar uma faixa clicável de ponta a ponta
          * roubando de volta a área de jogo que o `pointer-events-none` acabou
          * de liberar. */}
        <div className="pointer-events-auto flex w-fit flex-col gap-2">
          <BotaoWhatsapp numero={dict.contact.whatsapp} mensagem={cta.mensagem} variante="claro">
            {cta.rotulo}
          </BotaoWhatsapp>
          {/* `cta.tranquilizador` tem CINCO palavras — passa longe do teto de
            * 1–3 que libera rótulo mono abaixo de 17px. É corpo de texto, não
            * etiqueta: mesmo tratamento do resto da seção, sem caixa-alta nem
            * tracking. Ver o mesmo texto em LandingCta.tsx. */}
          <p className="text-[17px] leading-relaxed text-muted">{cta.tranquilizador}</p>
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
          {/* `hidden md:block`: no celular o QR é piada — a pessoa já está no
            * telefone. Serve ao visitante de desktop que quer sentir a mecânica
            * no aparelho em que ela de fato vai rodar no estande.
            *
            * `qr-${locale}.svg`, não `qr-pt.svg` fixo: o QR aponta para
            * `/[locale]/ativacoes`, e um visitante em `/en` que escaneasse o
            * SVG em português cairia na rota errada — o próprio bug que a
            * página existe para não ter em nenhum outro lugar. */}
          <img
            src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? '/portfolio'}/ativacoes/qr-${locale}.svg`}
            alt=""
            aria-hidden="true"
            width={72}
            height={72}
            className="hidden md:block"
          />
        </div>
      </div>
    </section>
  )
}
