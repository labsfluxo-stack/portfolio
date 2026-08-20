'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { Dictionary, Locale } from '@/content/types'
import { BotaoWhatsapp } from '@/components/landing/Botao'
import {
  acertarAlvoAtivo,
  alvoAtivo,
  avancar,
  criarPartida,
  mediaReacao,
  reiniciar,
  tocar,
  vidaDoAlvo,
  type Fase,
  type Partida,
  type Zona,
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
 * O ESTADO DA PARTIDA vive num `ref`, não em `useState`: são ~60 transições
 * por segundo, e re-renderizar o React a cada quadro colocaria na thread
 * principal justamente o custo que este componente existe para não ter. Só o
 * placar e a fase atravessam para o React, e só quando mudam de valor — a
 * fase muda poucas vezes na vida da página inteira, então o custo dela é
 * zero.
 *
 * O PONTEIRO PRECISA CHEGAR AO CANVAS. O `<div>` de conteúdo cobre a dobra
 * inteira (a 390px cobre 100% dela), e o hit test do navegador segue a ordem
 * de pintura, não o `z-index`: sem `pointer-events-none` nele, TODO evento de
 * ponteiro morre no `<div>` e o `pointerdown` do canvas nunca dispara. Quem
 * precisa de clique (o CTA, o botão de recomeçar) reativa com
 * `pointer-events-auto` — e é o MESMO bloco que marca `data-zona-jogo`, ver
 * comentário na definição de `medirZonas` abaixo.
 *
 * O CANVAS É FOCÁVEL (redesign 2026-08, job 3): antes era `aria-hidden` sem
 * `tabindex`, e um visitante de teclado tinha o título, o subtítulo, o botão
 * de WhatsApp e nenhuma prova interativa — exatamente o que a dobra existe
 * para mostrar. Espaço e Enter acertam o alvo mais velho vivo
 * (`acertarAlvoAtivo`), e uma marca tracejada no alvo em foco mostra o que a
 * tecla vai acertar — sem ela a tecla faz algo, mas ninguém sabe o quê.
 */

/** Cor do alvo: `--color-warn` (#FFB020). Não é cor nova — já está no `@theme`
 *  — e dá ~11:1 contra o fundo do canvas, muito acima do mínimo de 3:1 da WCAG
 *  1.4.11 para elemento não textual. A trava está em tests/unit/contraste.test.ts. */
const COR_ALVO = '#FFB020'
/** Componentes RGB de `COR_ALVO`, para montar `rgba()` nas partículas e no
 *  sprite de brilho sem depender de conversão em tempo de execução. */
const COR_ALVO_RGB = '255,176,32'
const COR_FUNDO = '#08090C'
const COR_TRILHO = '#1F232B'
/** `--color-data`: já é o azul de destaque do resto da página (placar,
 *  fio de progresso) — reaproveitado aqui para a marca do alvo em foco, em
 *  vez de inventar uma terceira cor no canvas. */
const COR_FOCO = '#38BDF8'
/** `--color-text` em RGB — a onda de erro usa um tom neutro, não o alvo, para
 *  não ler como "quase acertou": é reconhecimento de toque, não pontuação. */
const COR_ONDA_RGB = '245,243,239'
/** Acima de 2 o ganho é invisível e o custo de preenchimento dobra. */
const DPR_MAX = 2

/** Duração do "pop" de nascimento (job 4). Abaixo disso o alvo cresce com
 *  ultrapassagem (`easeOutBack`) em vez de já aparecer no tamanho final. É a
 *  mudança de maior alavancagem do arquivo: não custa nada por quadro — é só
 *  mais um fator na mesma multiplicação de raio que já existia — e é a
 *  diferença entre "o alvo aparece" e "o alvo bate na tela e assenta". O
 *  alvo continua acertável desde o primeiro quadro: o raio de colisão vem do
 *  motor (`alvo.raio` × `TOLERANCIA`), e este fator só afeta o desenho. */
const POP_MS = 180

/** `easeOutBack`, fórmula canônica (Penner / easings.net) — passa de 1 perto
 *  do fim do trajeto e recua até assentar nele: é a ultrapassagem. `c1`/`c3`
 *  são as constantes de sempre da curva, não números ajustados a olho. */
function easeOutBack(t: number): number {
  const c1 = 1.70158
  const c3 = c1 + 1
  const x = t - 1
  return 1 + c3 * x * x * x + c1 * x * x
}

/**
 * Sprite de brilho pré-cozido: UM gradiente radial desenhado uma única vez,
 * fora do laço de quadro, reaproveitado com `drawImage` em todo alvo, todo
 * quadro, com `globalCompositeOperation = 'lighter'` (job 4).
 *
 * `shadowBlur` e `filter: blur()` são os caminhos lentos documentados do
 * Canvas 2D — os dois recalculam um borrão a cada pixel, a cada quadro.
 * `drawImage` de um sprite já pronto é reamostragem de textura, a mesma
 * operação barata que qualquer jogo 2D usa para brilho. `null` quando o
 * navegador não dá contexto 2D para um canvas fora do DOM — mesma defesa do
 * canvas principal, um nível abaixo — e o desenho pula o brilho sem quebrar.
 */
function criarSpriteBrilho(): HTMLCanvasElement | null {
  const tamanho = 128
  const tela = document.createElement('canvas')
  tela.width = tamanho
  tela.height = tamanho
  const pincel = tela.getContext('2d')
  if (!pincel) return null
  const meio = tamanho / 2
  const gradiente = pincel.createRadialGradient(meio, meio, 0, meio, meio, meio)
  gradiente.addColorStop(0, `rgba(${COR_ALVO_RGB},0.55)`)
  gradiente.addColorStop(1, `rgba(${COR_ALVO_RGB},0)`)
  pincel.fillStyle = gradiente
  pincel.fillRect(0, 0, tamanho, tamanho)
  return tela
}

/**
 * Uma partícula da rajada de acerto (job 4) — coordenadas normalizadas 0–1,
 * o mesmo espaço dos alvos do motor: a física não precisa saber o tamanho da
 * tela, só o desenho multiplica por largura/altura na hora de pintar.
 */
type Particula = {
  ativa: boolean
  x: number
  y: number
  angulo: number
  velocidade: number
  nascidoEm: number
}

const PARTICULAS_POR_RAJADA = 8
/** Pool FIXO, pré-alocado uma vez — nunca um `push` por quadro, nunca um
 *  array novo por acerto. "~3 rajadas simultâneas" não é um contador
 *  explícito em lugar nenhum: é o que o TAMANHO do pool já garante sozinho.
 *  Uma quarta rajada, se acontecer, reaproveita os slots da mais velha — que
 *  nesse ponto já murchou quase toda — em vez de crescer o array. */
const POOL_PARTICULAS = PARTICULAS_POR_RAJADA * 3
const VIDA_PARTICULA_MS = 380

/** A onda de "não tinha nada aí" (job 4) — o reconhecimento de erro. Pool bem
 *  menor que o de partículas: só nasce uma por toque, nunca uma rajada. */
type Onda = { ativa: boolean; x: number; y: number; nascidoEm: number }
const POOL_ONDAS = 4
const VIDA_ONDA_MS = 420

export function CapaJogo({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const partidaRef = useRef<Partida | null>(null)
  // O botão de recomeçar vive no JSX, e o laço de rAF vive dentro do `useEffect`
  // com `ligar`/`desligar` fechados sobre o identificador do quadro. O `ref` é a
  // ponte: o efeito publica nele a função que sabe religar o laço, e o botão só
  // a chama. Sem isso, o botão precisaria de um `useState` para o laço inteiro,
  // e cada quadro voltaria a passar pelo React.
  const reiniciarRef = useRef<(() => void) | null>(null)
  const [placar, setPlacar] = useState({ acertos: 0, reacao: 0 })
  const [fase, setFase] = useState<Fase>('atrativo')
  // Id estável para ligar o `aria-describedby` do canvas ao parágrafo de
  // instrução (job 3) — `useId`, não uma string fixa, porque nada impede
  // duas instâncias deste componente na mesma árvore um dia (preview, teste).
  const instrucaoId = useId()

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

    // Nada de brilho, partícula ou onda sob menos movimento — job 4 é
    // explícito: "no pop, no particles, no ripple, constant radius". O sprite
    // nem chega a ser construído quando não vai ser usado.
    const spriteBrilho = menosMovimento ? null : criarSpriteBrilho()

    const particulas: Particula[] = Array.from({ length: POOL_PARTICULAS }, () => ({
      ativa: false,
      x: 0,
      y: 0,
      angulo: 0,
      velocidade: 0,
      nascidoEm: 0,
    }))
    let proximaParticula = 0
    const emitirRajada = (x: number, y: number, agora: number) => {
      for (let i = 0; i < PARTICULAS_POR_RAJADA; i++) {
        const p = particulas[proximaParticula]!
        proximaParticula = (proximaParticula + 1) % POOL_PARTICULAS
        p.ativa = true
        p.x = x
        p.y = y
        p.angulo = (Math.PI * 2 * i) / PARTICULAS_POR_RAJADA + (Math.random() - 0.5) * 0.5
        p.velocidade = 0.16 + Math.random() * 0.14
        p.nascidoEm = agora
      }
    }

    const ondas: Onda[] = Array.from({ length: POOL_ONDAS }, () => ({
      ativa: false,
      x: 0,
      y: 0,
      nascidoEm: 0,
    }))
    let proximaOnda = 0
    const emitirOnda = (x: number, y: number, agora: number) => {
      const o = ondas[proximaOnda]!
      proximaOnda = (proximaOnda + 1) % POOL_ONDAS
      o.ativa = true
      o.x = x
      o.y = y
      o.nascidoEm = agora
    }

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

    /**
     * ZONAS PROIBIDAS (job 2). A auditoria mediu 9,4%–15,6% dos alvos
     * nascendo embaixo de conteúdo real que intercepta o clique — cerca de
     * dois em cinco deles visíveis sobre texto transparente, o pior defeito
     * possível numa demo: parece bug, numa página que vende confiabilidade.
     *
     * MEDE; NÃO INVENTA GEOMETRIA. `secao.querySelectorAll('[data-zona-jogo]')`
     * acha os blocos que de fato interceptam o ponteiro — o CTA
     * (`pointer-events-auto` logo abaixo) e o bloco de fim de partida,
     * quando ele existe — e `getBoundingClientRect()` lê a caixa REAL deles,
     * já considerando fonte, quebra de linha e largura de tela do momento. A
     * faixa do placar ao vivo fica de fora de propósito: não tem
     * `pointer-events-auto`, então não intercepta nada, e marcá-la como
     * proibida sacrificaria área de jogo por um risco que não existe.
     */
    const secao = canvas.closest('section')
    const medirZonas = (): Zona[] => {
      if (!secao) return []
      const caixaCanvas = canvas.getBoundingClientRect()
      if (caixaCanvas.width === 0 || caixaCanvas.height === 0) return []
      const zonas: Zona[] = []
      secao.querySelectorAll<HTMLElement>('[data-zona-jogo]').forEach((bloco) => {
        const r = bloco.getBoundingClientRect()
        if (r.width === 0 || r.height === 0) return
        zonas.push({
          x: (r.left - caixaCanvas.left) / caixaCanvas.width,
          y: (r.top - caixaCanvas.top) / caixaCanvas.height,
          largura: r.width / caixaCanvas.width,
          altura: r.height / caixaCanvas.height,
        })
      })
      return zonas
    }
    const atualizarZonas = () => {
      const estado = partidaRef.current
      if (!estado) return
      partidaRef.current = { ...estado, zonasProibidas: medirZonas() }
    }

    // Semente derivada do relógio de montagem: a partida muda de visita para
    // visita, e mesmo assim o motor segue puro — quem sorteia é aqui, não lá.
    partidaRef.current = criarPartida(Date.now() % 2147483647, performance.now(), medirZonas())

    let visivel = true
    let quadro = 0
    let ultimoPlacar = { acertos: -1, reacao: -1 }
    let ultimaFase: Fase | null = null
    // Só existe para o laço de desenho saber se marca o alvo em foco (job 3)
    // — não controla nada do motor, só o que é pintado.
    let focado = false

    const desenhar = (agora: number) => {
      // Zerado ANTES do corpo: `quadro` guarda "há um quadro agendado", e a
      // partir daqui não há mais — quem agenda o próximo é o fim desta função,
      // e ela pode decidir não agendar nenhum. Sem esta linha, `ligar()` acharia
      // que o laço segue vivo depois do fim da partida e não religaria nunca.
      quadro = 0
      const anterior = partidaRef.current
      if (!anterior) return
      // Menos movimento desliga o jogador automático, e só ele: os alvos
      // continuam nascendo e continuam clicáveis. `animation-duration: 0` não
      // é acessibilidade, e jogo que some também não.
      const estado = avancar(anterior, agora, !menosMovimento)
      partidaRef.current = estado

      pincel.fillStyle = COR_FUNDO
      pincel.fillRect(0, 0, largura, altura)

      const menorLado = Math.min(largura, altura)

      for (const alvo of estado.alvos) {
        // A vida usada aqui é a DO ALVO (job 1) — `vidaDoAlvo(estado, alvo)`,
        // não o antigo `VIDA_ALVO_MS` fixo. O motor agora tem três fases de
        // repique (chegada/pico/pouso), cada uma com sua própria duração de
        // vida, e o encolhimento tinha ficado fora de fase: um alvo do pico
        // (vida 1050ms) encolhia como se tivesse 1400ms pela frente e sumia
        // ainda "gordo"; um alvo do pouso (vida 1300ms) demorava a começar a
        // encolher. `vidaDoAlvo` devolve a vida da fase em que O ALVO nasceu
        // — a mesma conta que decide quando ele expira de verdade.
        const vidaMaxima = vidaDoAlvo(estado, alvo)
        const vida = Math.max(0, 1 - (agora - alvo.nascidoEm) / vidaMaxima)
        // COM MENOS MOVIMENTO O RAIO É CONSTANTE. O encolhimento É a pulsação
        // que a spec manda remover — não adianta desligar só o fantasma e
        // deixar cada alvo animando o próprio contorno 60 vezes por segundo.
        const escalaVida = menosMovimento ? 1 : 0.55 + 0.45 * vida

        // POP DE NASCIMENTO (job 4): ultrapassagem de ~180ms via
        // `easeOutBack`, também desligada sob menos movimento — "constant
        // radius" ali significa isto também, não só o encolhimento.
        const idade = agora - alvo.nascidoEm
        const escalaPop = menosMovimento
          ? 1
          : Math.max(0, easeOutBack(Math.min(1, idade / POP_MS)))

        const raio = alvo.raio * menorLado * escalaVida * escalaPop
        const cx = alvo.x * largura
        const cy = alvo.y * altura

        // BRILHO (job 4): aditivo, sprite pré-cozido, `drawImage` — nunca
        // `shadowBlur`. `globalCompositeOperation` volta a `source-over`
        // logo depois, porque o preenchimento sólido e o anel abaixo não
        // podem herdar composição aditiva.
        if (spriteBrilho && raio > 0) {
          const tamanhoBrilho = raio * 2.6
          pincel.globalCompositeOperation = 'lighter'
          pincel.drawImage(
            spriteBrilho,
            cx - tamanhoBrilho / 2,
            cy - tamanhoBrilho / 2,
            tamanhoBrilho,
            tamanhoBrilho,
          )
          pincel.globalCompositeOperation = 'source-over'
        }

        pincel.beginPath()
        pincel.arc(cx, cy, raio, 0, Math.PI * 2)
        pincel.fillStyle = COR_ALVO
        pincel.fill()

        pincel.beginPath()
        pincel.arc(cx, cy, raio * 1.9, 0, Math.PI * 2)
        pincel.strokeStyle = COR_TRILHO
        pincel.lineWidth = 1
        pincel.stroke()
      }

      // MARCA DE FOCO (job 3) — o que a barra de espaço vai acertar. Sem
      // ela, quem navega por teclado tem uma tecla que faz algo, não um
      // jogo: não dá para mirar no que não se vê. Independe de
      // `menosMovimento` — não é movimento, é a única forma de um jogador de
      // teclado saber onde está, e some sozinha porque só desenha com o
      // canvas focado.
      if (focado) {
        const ativo = alvoAtivo(estado)
        if (ativo) {
          const raioBase = ativo.raio * menorLado
          pincel.beginPath()
          pincel.arc(ativo.x * largura, ativo.y * altura, raioBase * 1.7, 0, Math.PI * 2)
          pincel.strokeStyle = COR_FOCO
          pincel.lineWidth = 2
          pincel.setLineDash([5, 4])
          pincel.stroke()
          pincel.setLineDash([])
        }
      }

      if (!menosMovimento) {
        // RAJADA DE ACERTO (job 4): pool fixo, aditivo, some sozinha quando
        // a idade passa da vida da partícula — sem isso o pool nunca
        // "esvazia" e ficaria testando partículas mortas para sempre (o que
        // não seria caro, mas `ativa=false` deixa a intenção explícita).
        pincel.globalCompositeOperation = 'lighter'
        for (const p of particulas) {
          if (!p.ativa) continue
          const idadeParticula = agora - p.nascidoEm
          if (idadeParticula >= VIDA_PARTICULA_MS) {
            p.ativa = false
            continue
          }
          const progresso = idadeParticula / VIDA_PARTICULA_MS
          const distancia = p.velocidade * (idadeParticula / 1000) * menorLado
          const px = p.x * largura + Math.cos(p.angulo) * distancia
          const py = p.y * altura + Math.sin(p.angulo) * distancia
          const raioParticula = Math.max(0.5, (1 - progresso) * 0.011 * menorLado)
          pincel.beginPath()
          pincel.arc(px, py, raioParticula, 0, Math.PI * 2)
          pincel.fillStyle = `rgba(${COR_ALVO_RGB},${(1 - progresso) * 0.9})`
          pincel.fill()
        }
        pincel.globalCompositeOperation = 'source-over'

        // ONDA DE ERRO (job 4): não é aditiva de propósito — um traço quieto
        // e neutro, não um brilho quente, porque "não tinha nada aí" não é a
        // mesma mensagem que "quase acertou".
        for (const o of ondas) {
          if (!o.ativa) continue
          const idadeOnda = agora - o.nascidoEm
          if (idadeOnda >= VIDA_ONDA_MS) {
            o.ativa = false
            continue
          }
          const progresso = idadeOnda / VIDA_ONDA_MS
          const raioOnda = progresso * 0.05 * menorLado
          pincel.beginPath()
          pincel.arc(o.x * largura, o.y * altura, raioOnda, 0, Math.PI * 2)
          pincel.strokeStyle = `rgba(${COR_ONDA_RGB},${(1 - progresso) * 0.3})`
          pincel.lineWidth = 1.5
          pincel.stroke()
        }
      }

      const atual = { acertos: estado.acertos, reacao: mediaReacao(estado) }
      if (atual.acertos !== ultimoPlacar.acertos || atual.reacao !== ultimoPlacar.reacao) {
        ultimoPlacar = atual
        setPlacar(atual)
      }
      if (estado.fase !== ultimaFase) {
        ultimaFase = estado.fase
        setFase(estado.fase)
      }

      // `fim` é ESTADO TERMINAL: `avancar` devolve a partida inalterada a
      // partir daqui, e o quadro seguinte pintaria exatamente o mesmo retângulo
      // preto. Continuar pedindo quadro seria queimar 60Hz de bateria para não
      // mudar um pixel — o oposto do orçamento da spec §4.5. Quem religa o laço
      // é `reiniciarPartida`, e só ela.
      if (estado.fase === 'fim') return

      quadro = requestAnimationFrame(desenhar)
    }

    const ligar = () => {
      if (quadro) return
      // Não ressuscita partida encerrada: voltar para a aba ou rolar a dobra de
      // volta à tela não pode reabrir o laço num estado que não muda mais.
      if (partidaRef.current?.fase === 'fim') return
      quadro = requestAnimationFrame(desenhar)
    }
    const desligar = () => {
      if (!quadro) return
      cancelAnimationFrame(quadro)
      quadro = 0
    }

    // Recomeçar é uma partida limpa JÁ EM `jogando` (ver `reiniciar` no motor) e
    // o laço de volta. A fase e o placar são empurrados para o React na hora, em
    // vez de esperar o primeiro quadro: o botão some no mesmo evento em que foi
    // apertado, e não um quadro depois.
    const reiniciarPartida = () => {
      const estado = partidaRef.current
      if (!estado) return
      partidaRef.current = reiniciar(estado, performance.now())
      ultimaFase = 'jogando'
      setFase('jogando')
      ultimoPlacar = { acertos: 0, reacao: 0 }
      setPlacar(ultimoPlacar)
      // Não remede a zona aqui: o bloco de fim ainda está no DOM neste
      // instante (o React só troca a árvore depois deste evento), e é o
      // `MutationObserver` abaixo quem pega o momento certo, depois que o
      // bloco de fim sai e o CTA/placar ao vivo voltam.
      ligar()
    }
    reiniciarRef.current = reiniciarPartida

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
      redimensionador = new ResizeObserver(() => {
        medir()
        // O canvas muda de tamanho junto do resto da dobra na mesma
        // passagem de layout — remedir a zona aqui cobre o "recompute on
        // resize" sem precisar de um segundo observador para isto.
        atualizarZonas()
      })
      redimensionador.observe(canvas)
    }

    // Cobre a troca de layout entre "jogando" e "fim" (job 2): o bloco de CTA
    // e o de fim de partida nunca coexistem — é um ternário no JSX — e cada
    // um tem geometria própria. Um `ResizeObserver` no canvas não vê isto: o
    // canvas não muda de tamanho quando o conteúdo por cima dele troca. Quem
    // cobre esta transição é um `MutationObserver` na seção inteira: ele
    // dispara sempre que um nó entra ou sai da árvore, que é exatamente o
    // instante em que o bloco de fim aparece ou some (e o instante em que
    // "Jogar de novo" devolve o placar ao vivo no lugar dele).
    let observadorDom: MutationObserver | null = null
    if (secao && typeof MutationObserver === 'function') {
      observadorDom = new MutationObserver(atualizarZonas)
      observadorDom.observe(secao, { childList: true, subtree: true })
    }

    const aoTocar = (evento: PointerEvent) => {
      const estado = partidaRef.current
      if (!estado) return
      const caixa = canvas.getBoundingClientRect()
      const nx = (evento.clientX - caixa.left) / caixa.width
      const ny = (evento.clientY - caixa.top) / caixa.height
      // `agora` é capturado uma vez e reaproveitado, em vez de duas chamadas
      // a `performance.now()` que poderiam divergir entre o instante que
      // `avancar` usa e o que `tocar` usa.
      const agora = performance.now()
      // Dois passos — `avancar` e depois `tocar` —, e não `tocarEm` direto:
      // precisamos do estado ENTRE o avanço do relógio e o julgamento do
      // toque para saber, por comparação, se foi ESTE toque que removeu um
      // alvo (job 4, rajada de acerto). Sem o passo intermediário, um alvo
      // que expirasse sozinho no mesmo instante do clique seria contado como
      // um acerto visual que ninguém deu. `tocarEm`, no motor, faz a mesma
      // composição por dentro; aqui ela só precisa ficar visível.
      const antesDoToque = avancar(estado, agora, !menosMovimento)
      const depois = tocar(antesDoToque, nx, ny, agora)
      partidaRef.current = depois

      if (!menosMovimento) {
        const atingido = antesDoToque.alvos.find(
          (alvo) => !depois.alvos.some((restante) => restante.id === alvo.id),
        )
        if (atingido) {
          emitirRajada(atingido.x, atingido.y, agora)
        } else if (antesDoToque.fase !== 'atrativo') {
          // Onda de erro só quando o toque de fato tentou acertar algo: o
          // primeiro toque (saindo do modo atrativo) não julga alvo nenhum —
          // `tocar` ignora hit-test nesse caso, ver motor-reflexo.ts — e
          // mostrar "não tinha nada aí" nele seria mentir sobre o que
          // aconteceu.
          emitirOnda(nx, ny, agora)
        }
      }
    }
    canvas.addEventListener('pointerdown', aoTocar)

    // TECLADO (job 3). Sem isto a partida inteira era inalcançável para quem
    // não usa ponteiro: zero forma de jogar. Espaço e Enter são os dois
    // acionadores nativos de controle interativo — mesma convenção de
    // qualquer `<button>` — e por isso os dois acertam, não só um.
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key !== ' ' && evento.key !== 'Enter') return
      // Sem isto a barra de espaço rolaria a página: comportamento padrão do
      // navegador para elemento focado sem papel de formulário.
      evento.preventDefault()
      const estado = partidaRef.current
      if (!estado) return
      const agora = performance.now()
      const antesDoAcionamento = avancar(estado, agora, !menosMovimento)
      // Captura o alvo ANTES de `acertarAlvoAtivo` removê-lo — é dele que a
      // rajada de acerto precisa saber a posição.
      const alvo = alvoAtivo(antesDoAcionamento)
      partidaRef.current = acertarAlvoAtivo(antesDoAcionamento, agora)
      if (!menosMovimento && alvo) emitirRajada(alvo.x, alvo.y, agora)
    }
    const aoFocar = () => {
      focado = true
    }
    const aoDesfocar = () => {
      focado = false
    }
    canvas.addEventListener('keydown', aoTeclar)
    canvas.addEventListener('focus', aoFocar)
    canvas.addEventListener('blur', aoDesfocar)

    return () => {
      desligar()
      reiniciarRef.current = null
      document.removeEventListener('visibilitychange', aoTrocarAba)
      canvas.removeEventListener('pointerdown', aoTocar)
      canvas.removeEventListener('keydown', aoTeclar)
      canvas.removeEventListener('focus', aoFocar)
      canvas.removeEventListener('blur', aoDesfocar)
      observador?.disconnect()
      redimensionador?.disconnect()
      observadorDom?.disconnect()
    }
  }, [])

  const { capa, cta } = dict.ativacoes

  return (
    <section className="relative isolate overflow-hidden border-b border-border">
      {/* O canvas é fundo absoluto; o conteúdo vem por cima em fluxo normal.
        *
        * `touch-manipulation`, NÃO `touch-none`. `touch-action: none` entrega
        * ao canvas todo gesto de toque da primeira dobra — inclusive o arrasto
        * de rolagem — e a dobra ocupa a tela inteira do celular: a página
        * pararia de rolar no dedo, e o visitante teria que adivinhar que
        * precisa começar a arrastar mais abaixo. `manipulation` mantém a
        * rolagem e o toque de acerto, e descarta só o zoom por duplo toque, que
        * é o que de fato atrapalha quem está batendo em alvo.
        *
        * `tabIndex={0}`, `aria-label` e `aria-describedby` (job 3): o canvas
        * deixou de ser decoração pura — é o único lugar da dobra onde a prova
        * interativa acontece, e ficar fora da ordem de foco era deixar quem
        * joga por teclado sem a peça inteira. O nome acessível e a instrução
        * vêm do dicionário, como todo texto desta página; nenhum dos dois é
        * dinâmico (placar e resultado continuam só em DOM, nunca no canvas —
        * a regra da spec §4.2/§4.4 não muda).
        *
        * `.jogo-canvas` (definida em app/globals.css, junto do anel de foco
        * global) SOBRESCREVE só o deslocamento do anel — `outline-offset:
        * -4px` em vez do `3px` padrão. MEDIDO: este canvas cobre a seção de
        * ponta a ponta e a seção é `overflow-hidden` — um anel deslocado
        * para FORA cai inteiro fora da caixa da seção nos quatro lados e é
        * cortado, deixando o foco tecnicamente aplicado e visualmente
        * inexistente contra o fundo escuro. Ver o comentário em
        * globals.css para o motivo de isto ser uma classe CSS e não uma
        * utilidade do Tailwind (camada x regra sem camada). */}
      <canvas
        ref={canvasRef}
        tabIndex={0}
        aria-label={capa.acessibilidade.rotulo}
        aria-describedby={instrucaoId}
        className="jogo-canvas absolute inset-0 -z-10 h-full w-full touch-manipulation bg-bg"
      />
      {/* `sr-only`: instrução curta para quem usa leitor de tela ou navega só
        * por teclado. Visível para tecnologia assistiva, invisível na tela —
        * o convite visual equivalente já existe no placar ao vivo abaixo. */}
      <p id={instrucaoId} className="sr-only">
        {capa.acessibilidade.instrucao}
      </p>
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
          * de liberar.
          *
          * `data-zona-jogo` (job 2): marca este bloco como território onde o
          * motor não pode nascer alvo — é o mesmo atributo que `medirZonas`
          * lê acima. Existe porque este é um dos dois blocos que de fato
          * intercepta o ponteiro (o outro é o de fim de partida, abaixo); a
          * faixa do placar ao vivo NÃO leva o atributo, porque não intercepta
          * nada e marcá-la desperdiçaria área de jogo à toa. */}
        <div
          className="pointer-events-auto flex w-fit flex-col gap-2"
          data-zona-jogo="cta"
        >
          <BotaoWhatsapp numero={dict.contact.whatsapp} mensagem={cta.mensagem} variante="claro">
            {cta.rotulo}
          </BotaoWhatsapp>
          {/* `cta.tranquilizador` tem CINCO palavras — passa longe do teto de
            * 1–3 que libera rótulo mono abaixo de 17px. É corpo de texto, não
            * etiqueta: mesmo tratamento do resto da seção, sem caixa-alta nem
            * tracking. Ver o mesmo texto em LandingCta.tsx. */}
          <p className="text-[17px] leading-relaxed text-muted">{cta.tranquilizador}</p>
        </div>
        {/* A MESMA FAIXA conta duas histórias, e nunca as duas juntas: enquanto
          * a partida roda, o placar ao vivo; quando ela acaba, o resultado.
          *
          * O `aria-hidden` desceu do contêiner para a faixa do placar. Ele
          * precisa continuar existindo lá — placar e convite duplicam o que o
          * canvas mostra, e um leitor de tela anunciando "3 acertos" a cada
          * segundo seria ruído puro — mas não pode cobrir o bloco de fim, que
          * tem um botão focável dentro. Botão focável dentro de subárvore
          * `aria-hidden` é exatamente o defeito que o `jsx-a11y` e o axe
          * chamam de "foco fantasma". */}
        <div className="flex flex-wrap items-center gap-6">
          {fase === 'fim' ? (
            /* FIM DE PARTIDA É DOM, NUNCA CANVAS — spec §4.3, e a mesma regra
             * que rege o resto desta página.
             *
             * `data-zona-jogo` (job 2): este bloco só existe enquanto a
             * partida está parada (`avancar` não nasce alvo nenhum em `fim`),
             * então marcá-lo não evita nascimento nenhum HOJE — mas garante
             * que, assim que "Jogar de novo" reabrir a partida, a zona
             * herdada por `reiniciar` já reflita o bloco certo até o
             * `MutationObserver` remedir para o CTA/placar que voltam no
             * lugar dele.
             *
             * `pointer-events-auto` porque o contêiner de conteúdo é
             * transparente ao ponteiro; sem isto o botão não seria clicável —
             * o mesmo defeito que fecha o C1, um andar abaixo. */
            <div
              className="pointer-events-auto flex max-w-xl flex-col items-start gap-3"
              data-zona-jogo="fim"
            >
              <p className="text-[17px] leading-relaxed text-text">
                <strong className="font-semibold">{capa.fim.titulo}</strong>{' '}
                <span className="text-muted">
                  {/* Os dígitos vêm do motor e são substituídos aqui, no mesmo
                    * padrão de `{producao}` em `ProvaEngenharia.tsx`. O
                    * dicionário não carrega número: número no dicionário é
                    * número que envelhece sozinho e passa a mentir. */}
                  {capa.fim.resultado
                    .replace('{acertos}', String(placar.acertos))
                    .replace('{reacao}', String(placar.reacao))}
                </span>
              </p>
              <p className="text-[17px] leading-relaxed text-muted">{capa.fim.cta}</p>
              {/* `<button type="button">`, e não um `<div onClick>`: focável
                * pelo teclado, acionável por Enter e por espaço, anunciado como
                * botão. `type` explícito porque o padrão de `<button>` solto é
                * `submit`, e um dia esta seção pode ganhar um `<form>` em volta.
                *
                * `min-h-12` são os 48px de alvo mínimo de toque, o mesmo piso do
                * `BotaoWhatsapp` — e aqui vale em dobro, porque quem aperta
                * acabou de passar quinze segundos batendo em alvo no celular. */}
              <button
                type="button"
                onClick={() => reiniciarRef.current?.()}
                className="inline-flex min-h-12 items-center justify-center rounded-md border border-border px-6 text-[17px] font-semibold text-text transition-opacity hover:opacity-80"
              >
                {capa.fim.reiniciar}
              </button>
            </div>
          ) : (
            /* PLACAR AO VIVO — redesenhado (job 5): a versão anterior era
             * três `<span>` soltos num `flex items-baseline` sem quebra
             * própria, mono, caixa-alta, `tracking-[0.15em]`. Comprimidos
             * pelo `flex-shrink` padrão, os três texto quebravam por dentro a
             * 390px — três pilhas de duas linhas cada, e só a partir de
             * ~460px cabiam numa linha só.
             *
             * A troca é de eixo: `flex-col`, não `flex-wrap` numa linha só. O
             * acerto é a FIGURA PRIMÁRIA — maior, `text-data`, semi-negrito —
             * e a reação vem em seguida, secundária por tamanho e cor, não
             * escondida. `tabular-nums` nos dois: o placar sobe a cada
             * acerto, e algarismo de largura variável faria o texto ao lado
             * saltar lateralmente a cada troca de dígito. Duas linhas
             * inteiras no pior caso (390px), nunca seis pedaços picados. */
            <div aria-hidden="true" className="flex flex-col gap-1">
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-mono text-xs text-faint">{capa.convite}</span>
                <span className="text-xl font-semibold tabular-nums text-data">
                  {placar.acertos} {capa.placar.acertos}
                </span>
              </p>
              <span className="text-[17px] tabular-nums text-muted">
                {placar.reacao} {capa.placar.reacao}
              </span>
            </div>
          )}
          {/* O QR fica FORA do ternário: ele não é status de partida, é o
            * convite para abrir a página no celular, e vale igual antes e
            * depois do fim.
            *
            * `hidden md:block`: no celular o QR é piada — a pessoa já está no
            * telefone. Serve ao visitante de desktop que quer sentir a mecânica
            * no aparelho em que ela de fato vai rodar no estande.
            *
            * `qr-${locale}.svg`, não `qr-pt.svg` fixo: o QR aponta para
            * `/[locale]/ativacoes`, e um visitante em `/en` que escaneasse o
            * SVG em português cairia na rota errada — o próprio bug que a
            * página existe para não ter em nenhum outro lugar.
            *
            * `capa.qr` (job 5): o QR não tinha legenda nenhuma — só quem já
            * soubesse que aquilo era um jogo saberia por que apontar o
            * celular para ele. A legenda é DOM visível, não `alt` (o `alt`
            * continua vazio: o SVG em si não carrega informação que a
            * legenda ao lado não repita, e um leitor de tela lendo os dois
            * seria eco). */}
          <div className="hidden flex-col items-center gap-1 md:flex">
            <img
              src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? '/portfolio'}/ativacoes/qr-${locale}.svg`}
              alt=""
              aria-hidden="true"
              width={72}
              height={72}
              className="hidden md:block"
            />
            <span className="font-mono text-xs text-faint">{capa.qr}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
