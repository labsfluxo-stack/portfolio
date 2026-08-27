/**
 * O QUE SE MEXE NA PRAÇA.
 *
 * A cena é assada num sprite e não anima — o que anima vive aqui, desenhado por
 * quadro por cima dela. A separação não é organizacional: é o que permite ter a
 * quantidade de objeto que a praça tem sem pagar por ela a 60Hz.
 *
 * TUDO AQUI OBEDECE `parado` (`prefers-reduced-motion: reduce`). E obedecer não
 * é congelar num instante arbitrário: cada efeito trava numa pose escolhida,
 * porque um congelamento no quadro em que a preferência foi lida deixaria a
 * fumaça no meio do ar e o balão a meio caminho.
 *
 * CADA COISA CAI COM O QUADRADO DO TEMPO, sobe com atrito, ou deriva — nunca
 * em velocidade constante. Movimento uniforme é o que denuncia animação
 * programada: no mundo tudo acelera ou desacelera, e é a segunda derivada que o
 * olho lê como física.
 */

/** Determinístico: os efeitos são função do relógio, nunca de `Math.random`.
 *  Assim uma captura de tela feita em `t` descreve o que qualquer visitante vê
 *  em `t`, e um teste pode fixar o relógio. */
function ale(semente: number): number {
  const x = Math.sin(semente * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

// ── Fumaça da fogueira ──────────────────────────────────────────────────

const FUMACA_N = 7
const FUMACA_VIDA_MS = 5200

/**
 * A FUMAÇA que sobe da fogueira.
 *
 * Sobe DESACELERANDO e abrindo: perto do fogo o ar quente empurra forte, e
 * conforme a coluna esfria ela perde impulso e o vento a espalha. Uma fumaça
 * que subisse reta e em velocidade constante leria como fita saindo de um cano.
 *
 * A opacidade cai com o quadrado da idade, não linearmente — fumaça dissipa
 * rápido no começo, quando ainda está concentrada, e some devagar no fim.
 */
export function desenharFumaca(
  pincel: CanvasRenderingContext2D,
  x: number,
  y: number,
  raio: number,
  agora: number,
  parado: boolean,
): void {
  pincel.save()
  for (let i = 0; i < FUMACA_N; i++) {
    // Cada baforada entra desfasada da anterior: emissão em bloco leria como
    // um pulso só, e não como coluna contínua.
    const fase = i / FUMACA_N
    const t = parado
      ? // Sob movimento reduzido a coluna trava ESCALONADA: cada baforada numa
        // altura diferente. Travar todas na mesma idade daria um borrão só.
        fase
      : (((agora / FUMACA_VIDA_MS) + fase) % 1)

    const subida = raio * 7 * (1 - (1 - t) ** 2)
    const deriva = Math.sin(fase * 6.28 + t * 2.2) * raio * (0.5 + t * 2.2)
    const tamanho = raio * (0.5 + t * 2.4)
    const alfa = 0.16 * (1 - t) ** 2

    if (alfa <= 0.004) continue
    const g = pincel.createRadialGradient(x + deriva, y - subida, 0, x + deriva, y - subida, tamanho)
    g.addColorStop(0, `rgba(150,132,120,${alfa.toFixed(4)})`)
    g.addColorStop(1, 'rgba(120,104,96,0)')
    pincel.fillStyle = g
    pincel.beginPath()
    pincel.arc(x + deriva, y - subida, tamanho, 0, Math.PI * 2)
    pincel.fill()
  }
  pincel.restore()
}

// ── Balões subindo ao longe ─────────────────────────────────────────────

const BALOES_N = 5
const BALAO_VIDA_MS = 46_000

/**
 * OS BALÕES QUE SOBEM no céu, ao fundo.
 *
 * É a imagem mais associada a São João depois da fogueira, e ela dá ao céu uma
 * coisa que nenhum objeto parado dá: escala. Um ponto de luz que sobe devagar
 * diz que aquele céu tem profundidade, e diz isso melhor que qualquer estrela.
 *
 * MUITO devagar e MUITO pequenos: eles estão longe. A tentação é anima-los
 * rápido para que se note o movimento — e é justamente isso que quebraria a
 * distância, porque coisa distante se move devagar na tela.
 */
export function desenharBaloesDistantes(
  pincel: CanvasRenderingContext2D,
  largura: number,
  altura: number,
  agora: number,
  parado: boolean,
): void {
  pincel.save()
  for (let i = 0; i < BALOES_N; i++) {
    const fase = ale(i * 13 + 3)
    const t = parado ? fase : (agora / BALAO_VIDA_MS + fase) % 1
    // Sobem desacelerando: ar frio lá em cima, e o balão perde empuxo.
    const y = altura * (0.62 - 0.58 * (1 - (1 - t) ** 1.7))
    const x = largura * (0.1 + ale(i * 17 + 5) * 0.8) + Math.sin(t * 4 + fase * 6.28) * largura * 0.02
    const tamanho = Math.max(1.6, altura * 0.006 * (1 - t * 0.4))
    // Somem perto do topo, como quem entra na noite alta.
    const alfa = Math.min(1, (1 - t) * 2.2) * 0.85

    pincel.save()
    pincel.globalCompositeOperation = 'lighter'
    const g = pincel.createRadialGradient(x, y, 0, x, y, tamanho * 3.4)
    g.addColorStop(0, `rgba(255,186,96,${(alfa * 0.6).toFixed(3)})`)
    g.addColorStop(1, 'rgba(255,150,60,0)')
    pincel.fillStyle = g
    pincel.beginPath()
    pincel.arc(x, y, tamanho * 3.4, 0, Math.PI * 2)
    pincel.fill()
    pincel.restore()

    pincel.fillStyle = `rgba(255,226,168,${alfa.toFixed(3)})`
    pincel.beginPath()
    pincel.ellipse(x, y, tamanho * 0.7, tamanho, 0, 0, Math.PI * 2)
    pincel.fill()
  }
  pincel.restore()
}

// ── Palha soprando no chão ──────────────────────────────────────────────

const PALHA_N = 14
const PALHA_VIDA_MS = 7400

/**
 * A PALHA que o vento arrasta pelo calçamento.
 *
 * O chão da praça é a maior superfície da cena e era a única completamente
 * parada. Uns poucos fiapos atravessando devagar bastam: o olho periférico pega
 * movimento antes de forma, e é esse movimento na borda do campo de visão que
 * faz uma cena parecer estar acontecendo em vez de posada.
 *
 * Cada fiapo GIRA enquanto anda, e o giro acelera quando ele desce — é o que um
 * papel leve faz ao passar por uma rajada.
 */
export function desenharPalhaSoprando(
  pincel: CanvasRenderingContext2D,
  largura: number,
  altura: number,
  yHorizonte: number,
  agora: number,
  parado: boolean,
): void {
  if (parado) return
  pincel.save()
  for (let i = 0; i < PALHA_N; i++) {
    const fase = ale(i * 19 + 7)
    const t = (agora / PALHA_VIDA_MS + fase) % 1
    // Anda com a profundidade: quanto mais perto da câmera, mais rápido cruza a
    // tela. É paralaxe, e é de graça aqui.
    const profundidade = ale(i * 23 + 11)
    const y = yHorizonte + (altura - yHorizonte) * (0.15 + profundidade * 0.8)
    const escala = 0.4 + profundidade * 1.6
    const x = -largura * 0.05 + (t * largura * 1.1) * (0.5 + profundidade)
    if (x > largura * 1.05) continue
    const giro = t * 12 * (0.4 + profundidade)
    const comprimento = (3 + ale(i * 29 + 13) * 4) * escala

    pincel.save()
    pincel.translate(x, y + Math.sin(t * 9 + fase * 6.28) * 3 * escala)
    pincel.rotate(giro)
    pincel.strokeStyle = `rgba(206,176,116,${(0.2 + profundidade * 0.24).toFixed(3)})`
    pincel.lineWidth = Math.max(1, escala * 0.9)
    pincel.beginPath()
    pincel.moveTo(-comprimento / 2, 0)
    pincel.lineTo(comprimento / 2, 0)
    pincel.stroke()
    pincel.restore()
  }
  pincel.restore()
}
