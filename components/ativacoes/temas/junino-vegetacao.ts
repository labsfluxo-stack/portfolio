/**
 * A VEGETAÇÃO da praça.
 *
 * Na foto do arraial que serve de referência (`public/`) há árvore de verdade
 * entre e atrás do casario: copa cheia com reentrâncias e vãos de céu por
 * dentro, tronco e galho aparecendo por baixo, e coqueiro no meio das copas
 * redondas, que é o que diz Nordeste.
 *
 * O QUE O DESENHO ANTERIOR FAZIA DE ERRADO: manchas escuras. Folhagem à noite
 * NÃO é preta — ela guarda um verde dessaturado na massa e pega luz quente na
 * borda voltada para a praça, porque é de lá que vem a luz. Silhueta preta
 * atrás de um casario colorido lê como buraco recortado no céu.
 *
 * O QUE O OLHO LÊ NESTE TAMANHO: a copa mede uns 10% da altura do quadro, e aí
 * folha nenhuma é visível. O que se reconhece é a SILHUETA da copa e os vãos de
 * céu entre os lóbulos — copa lisa lê como brócolis, e é o recorte irregular da
 * borda que diz árvore.
 */

/** Determinístico: a cena é assada uma vez e duas assadas têm de dar os mesmos
 *  pixels. `Math.random` daria um arraial diferente a cada visita, e a captura
 *  de tela de ontem deixaria de descrever a de hoje. */
function ale(semente: number): number {
  const x = Math.sin(semente * 12.9898 + 4.1414) * 43758.5453
  return x - Math.floor(x)
}

/**
 * Os tons da folhagem noturna.
 *
 * Três camadas: a massa (a maior parte), a sombra (os vãos internos) e a luz
 * (a borda voltada para a praça). Sem a terceira a copa fica chapada; com ela,
 * a árvore ganha volume por um custo de um preenchimento a mais.
 */
const FOLHAGEM = [
  { massa: '#28402E', sombra: '#16241A', luz: '#5E7A4A' },
  { massa: '#2E4632', sombra: '#1A2A1E', luz: '#6A8452' },
  { massa: '#22382A', sombra: '#131F17', luz: '#527040' },
] as const

const COR_TRONCO = '#241811'

/**
 * Uma copa redonda: lóbulos sobrepostos, com vão de céu entre eles.
 *
 * Os lóbulos são desenhados do maior para o menor e do fundo para a frente. Um
 * círculo só, por mais bem sombreado que esteja, nunca lê como copa: é a borda
 * RECORTADA — entrando e saindo — que o olho reconhece como folhagem.
 */
function desenharCopa(
  p: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  raio: number,
  semente: number,
): void {
  const tons = FOLHAGEM[Math.floor(ale(semente) * FOLHAGEM.length)]!
  const nLobulos = 7 + Math.floor(ale(semente * 3) * 4)

  // A massa, em lóbulos espalhados numa elipse achatada — copa de árvore é
  // mais larga que alta, porque ela cresce buscando luz de lado.
  p.fillStyle = tons.massa
  for (let i = 0; i < nLobulos; i++) {
    const ang = (i / nLobulos) * Math.PI * 2 + ale(semente * 5 + i) * 0.8
    const dist = raio * (0.2 + ale(semente * 7 + i) * 0.62)
    const r = raio * (0.4 + ale(semente * 11 + i) * 0.34)
    p.beginPath()
    p.arc(cx + Math.cos(ang) * dist, cy + Math.sin(ang) * dist * 0.72, r, 0, Math.PI * 2)
    p.fill()
  }

  // A sombra por dentro, embaixo: é o vão onde a luz não chega, e é ele que
  // separa uma copa de um disco verde.
  p.fillStyle = tons.sombra
  for (let i = 0; i < 4; i++) {
    const ang = Math.PI * (0.25 + ale(semente * 13 + i) * 0.5)
    const dist = raio * (0.18 + ale(semente * 17 + i) * 0.4)
    p.beginPath()
    p.arc(cx + Math.cos(ang) * dist, cy + Math.sin(ang) * dist * 0.7, raio * 0.3, 0, Math.PI * 2)
    p.fill()
  }

  // A LUZ na borda de baixo, virada para a praça — é de lá que vem a
  // iluminação (barracas, fogueira, poste), e uma copa iluminada por cima
  // contradiria todas as outras sombras da cena.
  p.fillStyle = tons.luz
  p.globalAlpha = 0.5
  for (let i = 0; i < 5; i++) {
    const ang = Math.PI * (0.15 + (i / 5) * 0.7)
    const dist = raio * 0.72
    p.beginPath()
    p.arc(
      cx + Math.cos(ang) * dist,
      cy + Math.sin(ang) * dist * 0.72,
      raio * (0.16 + ale(semente * 19 + i) * 0.1),
      0,
      Math.PI * 2,
    )
    p.fill()
  }
  p.globalAlpha = 1
}

/** O tronco e um par de galhos, aparecendo sob a copa. Curto e grosso: a maior
 *  parte dele fica escondida atrás do casario, e o que sobra é só o pedaço que
 *  liga a copa ao chão — sem ele a copa flutua. */
function desenharTronco(
  p: CanvasRenderingContext2D,
  cx: number,
  yCopa: number,
  yBase: number,
  largura: number,
): void {
  p.strokeStyle = COR_TRONCO
  p.lineCap = 'round'
  p.lineWidth = largura
  p.beginPath()
  p.moveTo(cx, yBase)
  p.lineTo(cx + largura * 0.3, yCopa)
  p.stroke()
  p.lineWidth = largura * 0.5
  for (const lado of [-1, 1]) {
    p.beginPath()
    p.moveTo(cx + largura * 0.2, yCopa + (yBase - yCopa) * 0.35)
    p.lineTo(cx + lado * largura * 1.6, yCopa + (yBase - yCopa) * 0.05)
    p.stroke()
  }
}

/**
 * Um coqueiro: tronco curvo e folhas em leque caindo.
 *
 * Basta um ou dois no meio das copas redondas. É a silhueta mais reconhecível
 * do Nordeste e a que mais rápido diz onde a cena se passa — mas um coqueiral
 * inteiro leria como praia, e isto aqui é praça de cidade.
 */
function desenharCoqueiro(
  p: CanvasRenderingContext2D,
  cx: number,
  yBase: number,
  altura: number,
  semente: number,
): void {
  const inclina = (ale(semente) - 0.5) * altura * 0.24
  const yTopo = yBase - altura

  p.strokeStyle = COR_TRONCO
  p.lineCap = 'round'
  p.lineWidth = Math.max(2, altura * 0.045)
  p.beginPath()
  p.moveTo(cx, yBase)
  // Quadrática, não reta: tronco de coqueiro é curvo, e reto lê como poste.
  p.quadraticCurveTo(cx + inclina * 0.6, yBase - altura * 0.55, cx + inclina, yTopo)
  p.stroke()

  const tons = FOLHAGEM[Math.floor(ale(semente * 3) * FOLHAGEM.length)]!
  const nFolhas = 7
  for (let i = 0; i < nFolhas; i++) {
    // As folhas abrem em leque e CAEM nas pontas — folha reta lê como estrela.
    const ang = Math.PI * (0.08 + (i / (nFolhas - 1)) * 0.84)
    const comprimento = altura * (0.3 + ale(semente * 7 + i) * 0.16)
    const px = cx + inclina
    const fimX = px - Math.cos(ang) * comprimento
    const fimY = yTopo - Math.sin(ang) * comprimento * 0.7 + comprimento * 0.34
    p.strokeStyle = i % 2 === 0 ? tons.massa : tons.sombra
    p.lineWidth = Math.max(1.5, altura * 0.035)
    p.beginPath()
    p.moveTo(px, yTopo)
    p.quadraticCurveTo(
      px - Math.cos(ang) * comprimento * 0.6,
      yTopo - Math.sin(ang) * comprimento * 0.62,
      fimX,
      fimY,
    )
    p.stroke()
  }
}

/**
 * A vegetação inteira: copas subindo atrás da linha do telhado, uma ou duas
 * árvores nos vãos entre casas, e coqueiros pontuando.
 *
 * As árvores ficam ATRÁS do casario (são desenhadas antes dele pela cena), e é
 * por isso que só a copa aparece na maioria delas — exatamente como na foto,
 * onde a rua esconde os troncos.
 */
export function desenharVegetacao(
  pincel: CanvasRenderingContext2D,
  largura: number,
  altura: number,
  yBase: number,
  escalaEm: (y: number) => number,
): void {
  pincel.save()

  // A massa distante: copas baixas e escuras, quase encostadas, formando o
  // colchão de verde que separa o casario dos morros.
  for (let i = 0; i < 14; i++) {
    const x = largura * (-0.04 + (i / 13) * 1.08 + (ale(i * 23) - 0.5) * 0.05)
    const y = yBase - altura * (0.005 + ale(i * 29) * 0.012)
    const raio = altura * (0.028 + ale(i * 31) * 0.022) * escalaEm(y)
    pincel.globalAlpha = 0.85
    desenharCopa(pincel, x, y - raio * 0.5, raio, i * 7 + 1)
  }
  pincel.globalAlpha = 1

  // As árvores que se destacam, mais altas que o telhado.
  const destaques = [0.07, 0.29, 0.52, 0.79, 0.95]
  destaques.forEach((fx, i) => {
    const x = largura * fx
    const y = yBase - altura * 0.01
    const raio = altura * (0.045 + ale(i * 37) * 0.022) * escalaEm(y)
    const yCopa = y - altura * (0.05 + ale(i * 41) * 0.03)
    desenharTronco(pincel, x, yCopa, y, Math.max(2, raio * 0.16))
    desenharCopa(pincel, x, yCopa, raio, i * 13 + 5)
  })

  // Dois coqueiros, e só dois: um coqueiral leria como praia, e isto é praça
  // de cidade do interior.
  desenharCoqueiro(pincel, largura * 0.4, yBase, altura * 0.15, 3)
  desenharCoqueiro(pincel, largura * 0.9, yBase, altura * 0.13, 9)

  pincel.restore()
}
