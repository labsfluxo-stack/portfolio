/**
 * O ENFEITE QUE FICA NOS PRÉDIOS E NAS BARRACAS.
 *
 * Não é o varal do céu — esse já existe, pendurado entre o mastro e as bordas.
 * É o que está preso à ARQUITETURA: bandeirinha correndo pelo beiral, cordão de
 * lâmpadas atravessando a fachada, faixa de pano na sacada, lanterna pendurada
 * na quina da barraca.
 *
 * POR QUE ISSO FALTAVA. Com decoração só no céu, o casario e as barracas leem
 * como prédios que estão ATRÁS de uma festa. Numa praça de São João a cidade
 * inteira está enfeitada: o prédio não assiste a festa, ele participa dela. É a
 * diferença entre um cenário com bandeirinha pendurada na frente e uma cidade
 * em festa.
 *
 * A REGRA QUE MAIS IMPORTA AQUI: o enfeite segue as linhas do prédio. Ele
 * pendura do beiral, da sacada, do topo da janela — de coisas que existem. Um
 * cordão colocado sem olhar onde o prédio está lê como adesivo colado por cima,
 * e esse é o modo de falhar desta camada.
 *
 * NESTE TAMANHO o que se lê é a FORMA: o cordão de lâmpadas é uma linha
 * pontilhada que cede no meio, a bandeirinha é uma borda serrilhada, a faixa é
 * um retângulo de pano. Detalhe menor que isso desaparece e não vale o custo.
 */

/** Determinístico: a cena é assada uma vez e duas assadas têm de dar os mesmos
 *  pixels. */
function ale(semente: number): number {
  const x = Math.sin(semente * 12.9898 + 19.19) * 43758.5453
  return x - Math.floor(x)
}

/** A paleta do enfeite. É a mesma da bandeirinha do céu de propósito: numa
 *  praça o enfeite todo vem do mesmo fornecedor, e paletas diferentes entre o
 *  varal e a fachada leriam como duas festas sobrepostas. */
const CORES = ['#E23B2E', '#FFC93C', '#2E86C1', '#F5F1E6', '#1E8F5F', '#F07C24'] as const

const COR_CORDA = '#A9855A'
const COR_BULBO = '#FFE6B4'

/**
 * Um cordão de LÂMPADAS entre dois pontos, cedendo no meio.
 *
 * A corda cede numa quadrática — reto é "gerado", pendurado é o que a gravidade
 * faz de graça, e a ausência dela é o que mais denuncia. Cada bulbo ganha um
 * halo aditivo pequeno: bulbo que não brilha lê como ponto amarelo pintado na
 * parede, e a esta altura da cena é a luz que diz que ele está aceso.
 *
 * O halo é assado UMA vez num sprite e reaproveitado. Construir um gradiente
 * por bulbo foi um erro que este projeto já cometeu, no varal do céu, e que
 * custou um terço da taxa de quadros.
 */
function desenharCordao(
  p: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  barriga: number,
  nBulbos: number,
  halo: HTMLCanvasElement | null,
): void {
  const meioX = (x0 + x1) / 2
  const meioY = (y0 + y1) / 2 + barriga

  p.strokeStyle = COR_CORDA
  p.lineWidth = 1
  p.beginPath()
  p.moveTo(x0, y0)
  p.quadraticCurveTo(meioX, meioY, x1, y1)
  p.stroke()

  for (let i = 1; i < nBulbos; i++) {
    const t = i / nBulbos
    // Ponto da quadrática em `t` — o bulbo pendura NA corda, não numa reta
    // entre as pontas, senão ele flutua acima do fio no meio do vão.
    const u = 1 - t
    const bx = u * u * x0 + 2 * u * t * meioX + t * t * x1
    const by = u * u * y0 + 2 * u * t * meioY + t * t * y1
    if (halo) {
      p.save()
      p.globalCompositeOperation = 'lighter'
      const lado = halo.width
      p.drawImage(halo, bx - lado / 2, by - lado / 2)
      p.restore()
    }
    p.fillStyle = COR_BULBO
    p.beginPath()
    p.arc(bx, by, 1.3, 0, Math.PI * 2)
    p.fill()
  }
}

/** O sprite do halo da lâmpada, assado uma vez. */
function assarHalo(raio: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null
  const lado = Math.max(4, Math.ceil(raio * 2))
  const tela = document.createElement('canvas')
  tela.width = lado
  tela.height = lado
  const p = tela.getContext('2d')
  if (!p) return null
  const meio = lado / 2
  const g = p.createRadialGradient(meio, meio, 0, meio, meio, meio)
  g.addColorStop(0, 'rgba(255,206,132,0.42)')
  g.addColorStop(1, 'rgba(255,176,80,0)')
  p.fillStyle = g
  p.fillRect(0, 0, lado, lado)
  return tela
}

/**
 * Uma fileira de bandeirinhas presa a uma linha do prédio.
 *
 * Bem menores que as do céu: estas estão pregadas na fachada, mais longe do
 * observador que o varal da frente, e bandeirinha de fachada do tamanho da do
 * céu achataria a profundidade que o resto da cena construiu.
 */
function desenharFileira(
  p: CanvasRenderingContext2D,
  x0: number,
  y: number,
  largura: number,
  tamanho: number,
  semente: number,
): void {
  const passo = tamanho * 1.35
  const n = Math.max(1, Math.floor(largura / passo))
  p.strokeStyle = COR_CORDA
  p.lineWidth = 1
  p.beginPath()
  p.moveTo(x0, y)
  p.lineTo(x0 + largura, y)
  p.stroke()

  for (let i = 0; i < n; i++) {
    const x = x0 + passo * (i + 0.5)
    p.fillStyle = CORES[(i + Math.floor(ale(semente) * 6)) % CORES.length]!
    // Retângulo com o "V" recortado na base — a mesma silhueta da bandeirinha
    // do céu, que é a forma que o olho reconhece de longe.
    p.beginPath()
    p.moveTo(x - tamanho / 2, y)
    p.lineTo(x + tamanho / 2, y)
    p.lineTo(x + tamanho / 2, y + tamanho)
    p.lineTo(x, y + tamanho * 0.66)
    p.lineTo(x - tamanho / 2, y + tamanho)
    p.closePath()
    p.fill()
  }
}

/** Uma faixa de pano pendurada, com barra clara. Sem letra: texto em canvas não
 *  é lido por leitor de tela, e a regra desta página é que informação mora em
 *  DOM. De longe uma faixa é o pano e a barra, e é isso que está aqui. */
function desenharFaixa(
  p: CanvasRenderingContext2D,
  x: number,
  y: number,
  largura: number,
  altura: number,
  cor: string,
): void {
  p.fillStyle = cor
  p.fillRect(x, y, largura, altura)
  p.fillStyle = 'rgba(242,226,196,0.85)'
  p.fillRect(x + largura * 0.08, y + altura * 0.3, largura * 0.84, altura * 0.16)
  p.fillRect(x + largura * 0.2, y + altura * 0.6, largura * 0.6, altura * 0.12)
}

/**
 * O enfeite todo, distribuído pelas fachadas.
 *
 * As posições saem das mesmas frações que o casario usa, então o enfeite cai
 * sobre prédio e não sobre céu. É a única maneira honesta de fazer isso sem o
 * casario devolver as caixas que desenhou: fixar as duas na mesma convenção.
 */
export function desenharEnfeite(
  pincel: CanvasRenderingContext2D,
  largura: number,
  altura: number,
  yBase: number,
  escalaEm: (y: number) => number,
): void {
  const halo = assarHalo(altura * 0.018)
  const escala = escalaEm(yBase)

  pincel.save()

  // CORDÕES DE LÂMPADA atravessando a fileira de fachadas, presos logo abaixo
  // da linha do beiral. Três alturas diferentes: um cordão só, na horizontal
  // perfeita, leria como régua.
  const alturasCordao = [0.1, 0.135, 0.115]
  for (let k = 0; k < 3; k++) {
    const y = yBase - altura * alturasCordao[k]!
    const x0 = largura * (-0.02 + k * 0.33)
    const x1 = Math.min(largura * 1.02, x0 + largura * 0.42)
    desenharCordao(pincel, x0, y, x1, y + altura * (ale(k * 7) - 0.5) * 0.02, altura * 0.018, 16, halo)
  }

  // FILEIRAS DE BANDEIRINHA presas ao beiral de algumas casas — não de todas:
  // casa toda enfeitada igual lê como padrão repetido, e numa rua real cada
  // morador enfeitou o quanto quis.
  const fileiras = [
    { x: 0.02, largura: 0.12, altura: 0.085 },
    { x: 0.26, largura: 0.1, altura: 0.075 },
    { x: 0.44, largura: 0.16, altura: 0.115 },
    { x: 0.74, largura: 0.11, altura: 0.08 },
    { x: 0.9, largura: 0.1, altura: 0.078 },
  ]
  fileiras.forEach((fi, i) => {
    desenharFileira(
      pincel,
      largura * fi.x,
      yBase - altura * fi.altura,
      largura * fi.largura,
      Math.max(3, altura * 0.017 * escala),
      i * 11 + 3,
    )
  })

  // FAIXAS DE PANO na sacada do sobradão e em duas janelas altas.
  desenharFaixa(
    pincel,
    largura * 0.47,
    yBase - altura * 0.105,
    largura * 0.1,
    altura * 0.028,
    '#1E6F4F',
  )
  desenharFaixa(
    pincel,
    largura * 0.16,
    yBase - altura * 0.072,
    largura * 0.055,
    altura * 0.02,
    '#A82A24',
  )

  // LANTERNAS penduradas na quina de algumas casas: o mesmo objeto que o
  // jogador estoura, e tê-lo também no cenário é o que amarra o jogo à praça em
  // vez de deixar os alvos parecendo colados por fora.
  const lanternas = [0.12, 0.35, 0.6, 0.82]
  lanternas.forEach((fx, i) => {
    const x = largura * fx
    const y = yBase - altura * (0.055 + ale(i * 13) * 0.02)
    const r = Math.max(2.5, altura * 0.011 * escala)
    pincel.strokeStyle = COR_CORDA
    pincel.lineWidth = 1
    pincel.beginPath()
    pincel.moveTo(x, y - r * 2.2)
    pincel.lineTo(x, y - r * 1.1)
    pincel.stroke()
    // Corpo facetado: dois troncos de cone encostados pela base larga, que é a
    // silhueta da lanterna com o equador em ponta.
    pincel.fillStyle = CORES[i % CORES.length]!
    pincel.beginPath()
    pincel.moveTo(x, y - r * 1.3)
    pincel.lineTo(x + r, y)
    pincel.lineTo(x, y + r * 1.5)
    pincel.lineTo(x - r, y)
    pincel.closePath()
    pincel.fill()
    if (halo) {
      pincel.save()
      pincel.globalCompositeOperation = 'lighter'
      pincel.drawImage(halo, x - halo.width / 2, y - halo.height / 2)
      pincel.restore()
    }
  })

  pincel.restore()
}
