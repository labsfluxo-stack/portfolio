/**
 * O BALÃO JUNINO — geometria e desenho.
 *
 * Mora em arquivo próprio porque `junino.ts` já carrega o tema inteiro (fundo,
 * bandeirinha, fogueira, chapéu, brasas) e o balão sozinho respondia por
 * metade do arquivo. O tema continua sendo a única porta de saída: quem
 * consome é `junino.ts`, ninguém importa daqui direto.
 *
 * DESENHADO A PARTIR DA FORMA REAL, não da versão anterior. O que a pesquisa
 * corrigiu, e que muda o objeto:
 *
 * 1. Um balão de São João tem uma BOCA ABERTA embaixo — um aro de arame
 *    forrado de alumínio segurando uma mecha de algodão com parafina acesa. A
 *    versão anterior terminava num bico decorativo FECHADO, o que apagava
 *    justamente a peça que distingue um balão junino de um balão de ar quente
 *    qualquer. É a boca acesa que faz a leitura.
 *
 * 2. O padrão clássico é em FAIXAS horizontais, muitas vezes com friso de
 *    losangos na faixa mais larga — não gomos verticais. Faixa horizontal
 *    também é a escolha certa para o tamanho em que este desenho de fato
 *    aparece: em jogo o balão mede ~30px de largura, onde gomo vertical vira
 *    listra de um pixel e some, e faixa horizontal sobrevive.
 *
 * 3. O papel é de seda, esticado sobre uma armação de varetas. As varetas
 *    aparecendo por dentro são o que diz "papel sobre estrutura" em vez de
 *    "adesivo colorido".
 *
 * Fontes da forma: artesanatopassoapassoja.com.br/balao-de-sao-joao (montagem
 * da boca com arame e mecha), pt.wikipedia.org/wiki/Balão_de_papel.
 */

/** Unidade do desenho. Tudo aqui é fração desta largura, nunca pixel de tela:
 *  o sprite é rasterizado uma vez nestas unidades e só depois escalado. */
export const LARGURA_CORPO = 100
/** Balão junino é mais alto que largo — a barriga fica no terço de cima e o
 *  corpo afunila até a boca. */
export const ALTURA_CORPO = 118
/** O aro da boca e a mecha pendurada nele. */
export const ALTURA_BOCA = 16
export const ALTURA_TOTAL = ALTURA_CORPO + ALTURA_BOCA

/** Onde fica o centro vertical do sprite, contado a partir do topo do corpo —
 *  quem desenha translada por isto para o `drawImage` centralizar no alvo. */
export const CENTRO_Y = ALTURA_TOTAL / 2

const meia = LARGURA_CORPO / 2
/** Fração da largura ocupada pela boca. */
const BOCA_FRAC = 0.34

/**
 * O contorno do corpo, com a origem no ÁPICE (0,0).
 *
 * A base é um segmento reto, não um bico: a boca é aberta. Ombro arredondado
 * em cima, barriga em ~30% da altura, afunilando daí para baixo.
 */
export function caminhoCorpo(): string {
  const boca = LARGURA_CORPO * BOCA_FRAC
  return (
    `M ${-boca / 2} ${ALTURA_CORPO} ` +
    `C ${-meia * 0.92} ${ALTURA_CORPO * 0.74} ${-meia} ${ALTURA_CORPO * 0.44} ${-meia * 0.86} ${ALTURA_CORPO * 0.3} ` +
    `C ${-meia * 0.78} ${ALTURA_CORPO * 0.09} ${-meia * 0.46} ${-ALTURA_CORPO * 0.005} 0 0 ` +
    `C ${meia * 0.46} ${-ALTURA_CORPO * 0.005} ${meia * 0.78} ${ALTURA_CORPO * 0.09} ${meia * 0.86} ${ALTURA_CORPO * 0.3} ` +
    `C ${meia} ${ALTURA_CORPO * 0.44} ${meia * 0.92} ${ALTURA_CORPO * 0.74} ${boca / 2} ${ALTURA_CORPO} ` +
    `Z`
  )
}

/**
 * Meia-largura do corpo numa altura `y`.
 *
 * Aproximação do contorno acima por um perfil analítico, e não a resolução da
 * própria Bézier: erra alguns décimos de unidade num desenho que nunca é visto
 * acima de ~50px, e evita um solver inteiro só para posicionar vareta e aro.
 */
export function meiaLarguraEm(y: number): number {
  const t = Math.min(1, Math.max(0, y / ALTURA_CORPO))
  const perfil =
    t < 0.3 ? Math.sin((t / 0.3) * (Math.PI / 2)) : 1 - 0.66 * ((t - 0.3) / 0.7) ** 1.35
  return meia * 0.94 * perfil
}

export type Faixa = { de: number; ate: number; cor: string; losango?: string }

/**
 * As faixas, de cima para baixo, em fração da altura do corpo.
 *
 * Vermelho, creme, verde, azul — a paleta culturalmente codificada de festa
 * junina, nunca roxo, rosa ou neon. O creme entre as cores fortes é o que dá
 * respiro: papel de seda junino quase sempre alterna cor e claro, e sem esse
 * intervalo as faixas brigam entre si no tamanho pequeno.
 */
export const FAIXAS: readonly Faixa[] = [
  { de: 0, ate: 0.14, cor: '#E23B2E' },
  { de: 0.14, ate: 0.3, cor: '#F5F1E6' },
  { de: 0.3, ate: 0.52, cor: '#1E8F5F', losango: '#FFC93C' },
  { de: 0.52, ate: 0.66, cor: '#F5F1E6' },
  { de: 0.66, ate: 0.84, cor: '#2E86C1' },
  { de: 0.84, ate: 1, cor: '#E23B2E' },
]

/** Quantos losangos cabem no friso da faixa larga. */
const N_LOSANGOS = 7
/** As varetas da armação que aparecem por dentro do papel. */
const VARETAS = [-0.66, -0.33, 0.33, 0.66] as const

/**
 * Desenha o balão inteiro com a origem no ÁPICE do corpo (0,0).
 *
 * Precisa de `Path2D` — quem chama garante (o tema cai num traçado de reserva
 * quando não há, ver `junino.ts`).
 */
export function desenharCorpoBalao(pincel: CanvasRenderingContext2D): void {
  const corpo = new Path2D(caminhoCorpo())

  // 1) AS FAIXAS, recortadas na silhueta. Recorte em vez de um caminho por
  //    faixa: assim a borda de cada faixa É a borda do corpo, sem costura de
  //    um pixel entre elas nem erro de acumulação de curva.
  pincel.save()
  pincel.clip(corpo)
  for (const faixa of FAIXAS) {
    const y0 = faixa.de * ALTURA_CORPO
    const y1 = faixa.ate * ALTURA_CORPO
    pincel.fillStyle = faixa.cor
    pincel.fillRect(-LARGURA_CORPO, y0, LARGURA_CORPO * 2, y1 - y0)
    if (!faixa.losango) continue
    const cy = (y0 + y1) / 2
    const alt = (y1 - y0) * 0.62
    const larg = (LARGURA_CORPO * 0.94) / N_LOSANGOS
    pincel.fillStyle = faixa.losango
    for (let i = 0; i < N_LOSANGOS; i++) {
      const cx = -LARGURA_CORPO * 0.47 + larg * (i + 0.5)
      pincel.beginPath()
      pincel.moveTo(cx, cy - alt / 2)
      pincel.lineTo(cx + larg * 0.38, cy)
      pincel.lineTo(cx, cy + alt / 2)
      pincel.lineTo(cx - larg * 0.38, cy)
      pincel.closePath()
      pincel.fill()
    }
  }

  // 2) VOLUME. Papel de seda sobre armação curva, e a luz vem de DENTRO e de
  //    BAIXO (a mecha). Duas camadas: um gradiente horizontal faz o cilindro
  //    (lados escurecem, barriga acende), um radial baixo faz a mecha
  //    atravessando o papel. Nunca uma fonte de luz de cima — duas fontes
  //    brigando é o erro mais comum neste tipo de desenho.
  const lados = pincel.createLinearGradient(-meia, 0, meia, 0)
  lados.addColorStop(0, 'rgba(20,10,6,0.5)')
  lados.addColorStop(0.32, 'rgba(20,10,6,0.06)')
  lados.addColorStop(0.62, 'rgba(255,240,210,0.1)')
  lados.addColorStop(1, 'rgba(20,10,6,0.44)')
  pincel.fillStyle = lados
  pincel.fillRect(-LARGURA_CORPO, 0, LARGURA_CORPO * 2, ALTURA_CORPO)

  const dentro = pincel.createRadialGradient(
    0, ALTURA_CORPO * 0.82, 0,
    0, ALTURA_CORPO * 0.82, ALTURA_CORPO * 0.62,
  )
  dentro.addColorStop(0, 'rgba(255,196,110,0.62)')
  dentro.addColorStop(0.4, 'rgba(255,150,70,0.24)')
  dentro.addColorStop(1, 'rgba(255,140,60,0)')
  pincel.globalCompositeOperation = 'lighter'
  pincel.fillStyle = dentro
  pincel.fillRect(-LARGURA_CORPO, 0, LARGURA_CORPO * 2, ALTURA_CORPO)
  pincel.globalCompositeOperation = 'source-over'
  pincel.restore()

  // 3) AS VARETAS da armação, por cima das faixas e dentro da silhueta.
  //    Começam abaixo do ápice de propósito: convergindo todas no mesmo ponto
  //    viravam um rabisco no topo.
  pincel.save()
  pincel.clip(corpo)
  pincel.strokeStyle = 'rgba(40,22,14,0.2)'
  pincel.lineWidth = 1
  for (const frac of VARETAS) {
    pincel.beginPath()
    for (let y = ALTURA_CORPO * 0.12; y <= ALTURA_CORPO; y += 6) {
      const x = meiaLarguraEm(y) * frac
      if (y < ALTURA_CORPO * 0.13) pincel.moveTo(x, y)
      else pincel.lineTo(x, y)
    }
    pincel.stroke()
  }
  pincel.restore()

  // 4) A BOCA. Aro escuro, o vão preto por dentro dele, e a mecha acesa — a
  //    única coisa realmente brilhante da peça, e a que faz o objeto ser
  //    reconhecível mesmo com 20px de largura.
  const rBoca = meiaLarguraEm(ALTURA_CORPO)
  pincel.save()
  pincel.fillStyle = '#2A1A12'
  pincel.beginPath()
  pincel.ellipse(0, ALTURA_CORPO, rBoca, rBoca * 0.3, 0, 0, Math.PI * 2)
  pincel.fill()
  pincel.fillStyle = '#100A07'
  pincel.beginPath()
  pincel.ellipse(0, ALTURA_CORPO, rBoca * 0.74, rBoca * 0.2, 0, 0, Math.PI * 2)
  pincel.fill()

  pincel.globalCompositeOperation = 'lighter'
  const yMecha = ALTURA_CORPO + ALTURA_BOCA * 0.12
  const mecha = pincel.createRadialGradient(0, yMecha, 0, 0, yMecha, rBoca * 0.78)
  mecha.addColorStop(0, 'rgba(255,240,205,1)')
  mecha.addColorStop(0.35, 'rgba(255,176,72,0.72)')
  mecha.addColorStop(1, 'rgba(255,120,40,0)')
  pincel.fillStyle = mecha
  pincel.beginPath()
  pincel.arc(0, yMecha, rBoca * 0.78, 0, Math.PI * 2)
  pincel.fill()
  pincel.restore()
}

/**
 * Traçado de reserva, sem `Path2D` — nunca um espaço mudo onde deveria haver
 * balão. Mesma disciplina do resto do tema: silhueta e boca acesa, que são as
 * duas coisas sem as quais a peça deixa de ser reconhecível.
 */
export function desenharBalaoDeReserva(
  pincel: CanvasRenderingContext2D,
  largura: number,
  altura: number,
): void {
  const escala = largura / LARGURA_CORPO
  pincel.save()
  pincel.translate(0, -altura / 2)
  pincel.scale(escala, escala)
  pincel.fillStyle = FAIXAS[2]!.cor
  pincel.beginPath()
  pincel.ellipse(0, ALTURA_CORPO * 0.42, meia * 0.9, ALTURA_CORPO * 0.46, 0, 0, Math.PI * 2)
  pincel.fill()
  pincel.fillStyle = '#FFC93C'
  pincel.beginPath()
  pincel.arc(0, ALTURA_CORPO, meia * 0.16, 0, Math.PI * 2)
  pincel.fill()
  pincel.restore()
}

/**
 * Os cacos do estouro: as próprias FAIXAS do balão se separando.
 *
 * A versão anterior estourava em gomos verticais, que era a forma que o balão
 * antigo tinha. Um balão de faixas se rasga em faixas — e é isso que amarra o
 * estouro ao objeto em vez de ser um efeito genérico por cima dele.
 */
export function desenharCacosDeFaixa(
  pincel: CanvasRenderingContext2D,
  raio: number,
  progresso: number,
  alpha: number,
): void {
  const escala = (raio * 2) / LARGURA_CORPO
  pincel.save()
  pincel.globalAlpha = alpha
  pincel.scale(escala, escala)
  pincel.translate(0, -CENTRO_Y)
  const p = progresso
  FAIXAS.forEach((faixa, i) => {
    const y0 = faixa.de * ALTURA_CORPO
    const y1 = faixa.ate * ALTURA_CORPO
    const meiaFaixa = meiaLarguraEm((y0 + y1) / 2)
    // Cada faixa sai para um lado e cai com o QUADRADO do progresso: começa
    // quase parada e acelera, em vez de nascer voando.
    const lado = i % 2 === 0 ? -1 : 1
    const dx = lado * meiaFaixa * 1.5 * p
    const dy = ALTURA_CORPO * 0.5 * p * p
    const giro = lado * 1.1 * p * p
    pincel.save()
    pincel.translate(dx, dy)
    pincel.rotate(giro)
    pincel.fillStyle = faixa.cor
    pincel.beginPath()
    pincel.ellipse(0, (y0 + y1) / 2, meiaFaixa, (y1 - y0) / 2, 0, 0, Math.PI * 2)
    pincel.fill()
    pincel.restore()
  })
  pincel.restore()
}
