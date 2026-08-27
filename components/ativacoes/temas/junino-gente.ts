/**
 * A GENTE DO ARRAIAL — a quadrilha e quem assiste, em Canvas 2D.
 *
 * DESENHADO A PARTIR DA FOTO, e não de memória. A referência é o arraial
 * nordestino em `public/`, e ela ensina três coisas que a versão anterior
 * desta praça (três pares idênticos, em `junino-cenario.ts`) não tinha:
 *
 * 1. A SAIA É O PERSONAGEM. Na foto a saia da dama é mais LARGA que alta: um
 *    leque que sai da cintura e varre o chão, dividido em faixas de cores
 *    DIFERENTES com um vivo dourado entre elas e renda clara no barrado. É
 *    essa alternância de faixa que sobrevive a 40px de altura — não o rosto,
 *    não a mão, não o sapato. Um triângulo liso, que era o que havia antes,
 *    lê como cone, não como vestido.
 *
 * 2. O QUE FAZ UM PAR É A MÃO DADA. Duas pessoas lado a lado são duas
 *    pessoas; duas pessoas cujos braços terminam NO MESMO PONTO são um casal
 *    dançando. Por isso o ponto de encontro é calculado antes e imposto aos
 *    dois braços — nunca "mais ou menos ali".
 *
 * 3. A MULTIDÃO SE SOBREPÕE. Na foto as figuras se cobrem, estão em três ou
 *    quatro tamanhos ao mesmo tempo, e boa parte delas só assiste. Fileira de
 *    bonecos igualmente espaçados, todos do mesmo tamanho, todos dançando, é
 *    exatamente a leitura de "gerado" que se quer evitar.
 *
 * É NOITE, com luz de fogueira e de lâmpada de barraca. As roupas são a coisa
 * mais colorida que essa gente veste no ano, mas estão sob luz baixa e quente:
 * cada cor passa por `acender()`, que a modula pela DISTÂNCIA até a fogueira.
 * Quem dança perto do fogo fica quente e claro; quem assiste no fundo esfria e
 * escurece para o azul do ar da noite. É essa variação que impede a multidão
 * de ler como decalque colado por cima do cenário.
 *
 * TUDO É DETERMINÍSTICO. Nada de `Math.random` nem de `Date.now`: a cena é
 * assada uma vez num sprite e duas assadas têm de dar os mesmos pixels.
 */

const TAU = Math.PI * 2

/** Ruído determinístico, na mesma família do resto do cenário mas com outro
 *  deslocamento — assim a gente não cai exatamente onde caiu a palha. */
function ale(semente: number): number {
  const x = Math.sin(semente * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

/** Escolhe um item de uma lista por semente. Determinístico por construção. */
function escolher<T>(lista: readonly T[], semente: number): T {
  // O índice já é seguro por construção (resto do comprimento), mas o
  // compilador não sabe disso sob `noUncheckedIndexedAccess`. O `!` aqui
  // afirma o que o `%` garante — afrouxar a regra do projeto para calar um
  // aviso seria pagar caro por um atalho.
  return lista[Math.floor(ale(semente) * lista.length) % lista.length]!
}

// ── A luz da praça ──────────────────────────────────────────────────────

/** A cor da chama que ilumina a praça. As roupas caminham para cá conforme se
 *  aproximam da fogueira. */
const LUZ_DA_FOGUEIRA = [255, 178, 98] as const

/** O azul do ar da noite. Longe do fogo a cor não só escurece: ela ESFRIA.
 *  Só multiplicar por um ganho dá cinza, e cinza lê como desbotado — não como
 *  penumbra. */
const AR_DA_NOITE = [44, 52, 80] as const

function ler(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** A luz que bate numa figura, pela posição dela na praça. */
type Luz = { ganho: number; quente: number; frio: number }

/**
 * Aplica a luz da noite a uma cor de roupa: ganho (quanto de luz chega),
 * mistura com a chama (quanto essa luz é quente) e mistura com o ar (quanto a
 * distância come a cor).
 */
function acender(hex: string, luz: Luz, alfa = 1): string {
  const [r0, g0, b0] = ler(hex)
  let r = r0 * luz.ganho
  let g = g0 * luz.ganho
  let b = b0 * luz.ganho
  r += (LUZ_DA_FOGUEIRA[0] - r) * luz.quente
  g += (LUZ_DA_FOGUEIRA[1] - g) * luz.quente
  b += (LUZ_DA_FOGUEIRA[2] - b) * luz.quente
  r += (AR_DA_NOITE[0] - r) * luz.frio
  g += (AR_DA_NOITE[1] - g) * luz.frio
  b += (AR_DA_NOITE[2] - b) * luz.frio
  const t = (v: number): number => Math.max(0, Math.min(255, Math.round(v)))
  return `rgba(${t(r)},${t(g)},${t(b)},${alfa})`
}

/**
 * O campo de luz da praça.
 *
 * A fogueira é a chave: `junino.ts` a põe em 0,42 × 0,88 do quadro, e é em
 * volta dela que a quadrilha dança. As barracas laterais (0,16 e 0,86) têm
 * lâmpada sob o telhado e servem de luz de apoio. O resto é noite.
 */
function luzEm(x: number, y: number, largura: number, altura: number): Luz {
  const dxFogo = (x - largura * 0.42) / largura
  const dyFogo = (y - altura * 0.88) / altura
  const fogo = Math.exp(-(dxFogo * dxFogo * 6 + dyFogo * dyFogo * 11))

  const dxLampada = Math.min(Math.abs(x - largura * 0.16), Math.abs(x - largura * 0.86)) / largura
  const dyLampada = (y - altura * 0.72) / altura
  const lampada = Math.exp(-(dxLampada * dxLampada * 26 + dyLampada * dyLampada * 34))

  return {
    ganho: 0.5 + fogo * 0.66 + lampada * 0.24,
    quente: 0.09 + fogo * 0.34 + lampada * 0.14,
    frio: 0.34 * (1 - fogo) * (1 - lampada * 0.7),
  }
}

// ── O guarda-roupa ──────────────────────────────────────────────────────

/**
 * As saias, em três cores cada: o corpo, o babado (a faixa do meio) e o vivo
 * que separa as duas. As combinações vêm da foto — turquesa com vermelho,
 * carmim com dourado, laranja com verde — que é o que uma chita de festa de
 * fato tem, e não gradiente de uma cor só.
 */
const SAIAS = [
  { corpo: '#1E7E8C', babado: '#C6392F', vivo: '#E8B84B' },
  { corpo: '#B32636', babado: '#D9762A', vivo: '#F0C763' },
  { corpo: '#D9822B', babado: '#2E7D4F', vivo: '#F2DC9A' },
  { corpo: '#2C5E9E', babado: '#C6392F', vivo: '#EBD9A8' },
  { corpo: '#7E3A8C', babado: '#E0A828', vivo: '#F2E2C4' },
  { corpo: '#C43C6B', babado: '#2E7D4F', vivo: '#F0C763' },
  { corpo: '#E0A828', babado: '#C6392F', vivo: '#F2E2C4' },
  { corpo: '#2E7D4F', babado: '#E0A828', vivo: '#F4EAD0' },
] as const

/** As camisas dos cavalheiros: cor cheia com xadrez por cima, como na foto. */
const CAMISAS = ['#C6392F', '#2E7D4F', '#1E7E8C', '#D9822B', '#D9B84A', '#2C5E9E', '#A8452C'] as const
/** Calças de brim. Escuras, para o quadril não competir com a saia ao lado. */
const CALCAS = ['#2A3E63', '#243447', '#3B4A5E', '#4A3B2E'] as const
const PELES = ['#8C5A3C', '#A87048', '#6E432C', '#B57F55'] as const
const CABELOS = ['#191013', '#2A1A14', '#3A2418'] as const
/** A flor no cabelo. Um ponto só de cor saturada na têmpora — o sinal mais
 *  barato de "dama de quadrilha" que existe, e o único detalhe de cabeça que
 *  ainda lê a 20px de altura. Por isso nunca é cortado por tamanho. */
const FLORES = ['#E84B4B', '#F0C020', '#F27FA8', '#FFF0C8'] as const
const LENCOS = ['#C6392F', '#E0A828', '#F2E2C4', '#1E7E8C'] as const

const PALHA = '#C9A661'
const PALHA_SOMBRA = '#8E7038'
const PALHA_LUZ = '#E4CE93'
const RENDA = '#F4E8D2'
const SAPATO = '#241812'

// ── Poses ───────────────────────────────────────────────────────────────

/**
 * Onde as mãos vão parar, em frações da altura da figura, medidas a partir do
 * chão sob ela: [afastamento lateral, altura].
 *
 * A pose é o segundo sinal mais forte depois da saia. Braço erguido, braço
 * aberto e braço caído fazem três silhuetas distintas mesmo quando o corpo
 * inteiro tem doze pixels de largura.
 */
type Pose = {
  /** Mão do lado para onde a figura olha — a que dá a mão ao par. */
  frente: readonly [number, number]
  /** Mão do lado de trás: segura a saia, fica na cintura ou sobe. */
  tras: readonly [number, number]
  /** Quanto o tronco se inclina na direção do par. */
  inclina: number
  /** Abertura do passo das pernas. */
  passo: number
  /** Quanto a saia abre além do repouso. */
  rodado: number
}

const POSES: Record<string, Pose> = {
  // Mão dada, os dois inclinados um para o outro — o par da frente da foto.
  dada: { frente: [0.34, 0.66], tras: [-0.3, 0.46], inclina: 0.07, passo: 1, rodado: 1 },
  // Os dois braços erguidos, formando o arco por onde o outro par passa.
  erguido: { frente: [0.26, 1], tras: [-0.24, 0.98], inclina: 0.01, passo: 0.7, rodado: 1.12 },
  // Rodando sozinha, as duas mãos segurando a saia: abertura máxima.
  roda: { frente: [0.33, 0.42], tras: [-0.33, 0.42], inclina: 0.02, passo: 0.45, rodado: 1.3 },
  // Só olhando. Braços quase colados, saia em repouso — é o contraste com
  // esta pose que faz as outras lerem como MOVIMENTO.
  parado: { frente: [0.16, 0.44], tras: [-0.15, 0.45], inclina: 0, passo: 0.2, rodado: 0.74 },
  // Palma, as duas mãos juntas à frente do peito.
  palma: { frente: [0.2, 0.64], tras: [0.13, 0.62], inclina: 0.03, passo: 0.25, rodado: 0.8 },
}

// ── Peças de desenho ────────────────────────────────────────────────────

/** A sombra de contato. Sem ela toda figura FLUTUA — é o erro mais barato de
 *  cometer e o mais visível numa cena com chão texturado. */
function sombraDeContato(p: CanvasRenderingContext2D, cx: number, yBase: number, raio: number): void {
  const g = p.createRadialGradient(0, 0, 0, 0, 0, raio)
  g.addColorStop(0, 'rgba(10,8,12,0.46)')
  g.addColorStop(0.6, 'rgba(10,8,12,0.2)')
  g.addColorStop(1, 'rgba(10,8,12,0)')
  p.save()
  p.translate(cx, yBase)
  p.scale(1, 0.3)
  p.fillStyle = g
  p.beginPath()
  p.arc(0, 0, raio, 0, TAU)
  p.fill()
  p.restore()
}

/**
 * Um braço, do ombro até a mão, com cotovelo.
 *
 * Curvo e não reto de propósito: braço reto lê como palito espetado, e a três
 * pixels de espessura a curva é a única diferença entre "braço" e "palito".
 * A manga entra por cima do primeiro terço, que é o que dá volume ao ombro.
 */
function desenharBraco(
  p: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  mx: number,
  my: number,
  corManga: string,
  corPele: string,
  grossura: number,
  curva: number,
): void {
  const dx = mx - ox
  const dy = my - oy
  const comp = Math.hypot(dx, dy) || 1
  const cotoveloX = (ox + mx) / 2 + (-dy / comp) * comp * curva
  const cotoveloY = (oy + my) / 2 + (dx / comp) * comp * curva

  p.lineCap = 'round'
  p.lineJoin = 'round'
  p.strokeStyle = corPele
  p.lineWidth = grossura
  p.beginPath()
  p.moveTo(ox, oy)
  p.quadraticCurveTo(cotoveloX, cotoveloY, mx, my)
  p.stroke()

  // A manga curta e bufante, sobre o começo do braço.
  p.strokeStyle = corManga
  p.lineWidth = grossura * 1.9
  p.beginPath()
  p.moveTo(ox, oy)
  p.lineTo(ox + (cotoveloX - ox) * 0.42, oy + (cotoveloY - oy) * 0.42)
  p.stroke()
}

/**
 * A SAIA RODADA — a peça mais importante deste arquivo.
 *
 * É um leque com vértice na cintura, e NÃO um triângulo: o barrado é um arco
 * cujo ponto mais baixo é a frente, subindo para os lados. Três faixas de
 * cores alternadas, vivo dourado nas divisas, renda clara na borda. As faixas
 * são o que dá leitura de VESTIDO a 30px de altura; prega e florzinha só
 * aparecem quando há pixel sobrando para elas.
 */
function desenharSaia(
  p: CanvasRenderingContext2D,
  cx: number,
  yCintura: number,
  raioH: number,
  raioV: number,
  angA: number,
  angB: number,
  saia: (typeof SAIAS)[number],
  luz: Luz,
  semente: number,
): void {
  const passos = 20
  // O barrado ondula: babado de verdade não termina em arco liso. Só vale
  // acima de um tamanho — abaixo dele a onda vira ruído de um pixel.
  const ondular = raioV > 13
  const onda = (t: number): number => (ondular ? 1 + Math.sin(t * Math.PI * 7) * 0.035 : 1)

  const leque = (fator: number): void => {
    p.beginPath()
    p.moveTo(cx, yCintura)
    for (let i = 0; i <= passos; i++) {
      const t = i / passos
      const ang = angA + (angB - angA) * t
      const f = fator * onda(t)
      p.lineTo(cx + Math.sin(ang) * raioH * f, yCintura + Math.cos(ang) * raioV * f)
    }
    p.closePath()
    p.fill()
  }

  p.fillStyle = acender(saia.corpo, luz)
  leque(1)
  p.fillStyle = acender(saia.babado, luz)
  leque(0.79)
  p.fillStyle = acender(saia.corpo, luz)
  leque(0.53)

  // As pregas: raios da cintura ao barrado, num tom mais fundo. Elas fazem a
  // saia ter PANO em vez de ser um recorte chapado de papel.
  if (raioV > 11) {
    p.strokeStyle = 'rgba(0,0,0,0.16)'
    p.lineWidth = Math.max(0.6, raioV * 0.035)
    for (let i = 1; i < 9; i++) {
      const ang = angA + (angB - angA) * (i / 9)
      p.beginPath()
      p.moveTo(cx + Math.sin(ang) * raioH * 0.2, yCintura + Math.cos(ang) * raioV * 0.2)
      p.lineTo(cx + Math.sin(ang) * raioH * 0.97, yCintura + Math.cos(ang) * raioV * 0.97)
      p.stroke()
    }
  }

  // Os vivos dourados nas divisas das faixas, e a renda no barrado.
  const arco = (fator: number, cor: string, grossura: number): void => {
    p.strokeStyle = cor
    p.lineWidth = grossura
    p.beginPath()
    for (let i = 0; i <= passos; i++) {
      const t = i / passos
      const ang = angA + (angB - angA) * t
      const f = fator * onda(t)
      const px = cx + Math.sin(ang) * raioH * f
      const py = yCintura + Math.cos(ang) * raioV * f
      if (i === 0) p.moveTo(px, py)
      else p.lineTo(px, py)
    }
    p.stroke()
  }
  const vivo = acender(saia.vivo, luz)
  arco(0.79, vivo, Math.max(0.7, raioV * 0.055))
  arco(0.53, vivo, Math.max(0.6, raioV * 0.045))
  arco(0.99, acender(RENDA, luz, 0.9), Math.max(0.7, raioV * 0.05))

  // As florzinhas da chita, na faixa do meio. Luxo de tamanho grande só.
  if (raioV > 19) {
    p.fillStyle = acender(saia.vivo, luz, 0.75)
    for (let i = 0; i < 14; i++) {
      const ang = angA + (angB - angA) * ale(semente * 7 + i * 3)
      const r = 0.58 + ale(semente * 11 + i * 5) * 0.18
      p.beginPath()
      p.arc(cx + Math.sin(ang) * raioH * r, yCintura + Math.cos(ang) * raioV * r, raioV * 0.035, 0, TAU)
      p.fill()
    }
  }
}

// ── As figuras ──────────────────────────────────────────────────────────

/** O que toda figura tem, dançando ou não. */
type Ficha = {
  tipo: 'dama' | 'cavalheiro'
  /** Pé no chão, em pixels do canvas. */
  x: number
  y: number
  /** Altura total da figura, do chão ao topo da cabeça (ou do chapéu). */
  a: number
  /** +1 olha para a direita, -1 para a esquerda. */
  virado: number
  deCostas: boolean
  pose: Pose
  luz: Luz
  semente: number
  /** Onde a mão da frente encontra a do par. `null` para quem dança sozinho. */
  maoDada: { x: number; y: number } | null
}

/** Resolve a posição absoluta de uma mão a partir da pose. */
function ondeAMao(f: Ficha, mao: readonly [number, number]): { x: number; y: number } {
  return { x: f.x + f.virado * mao[0] * f.a, y: f.y - mao[1] * f.a }
}

/**
 * A DAMA.
 *
 * Proporções tiradas da foto: a saia começa pouco acima da metade da figura e
 * o barrado quase toca o chão, deixando só o sapato espiar. O tronco é curto,
 * o cabelo é uma massa MAIOR que o crânio (na foto ele voa com o giro) e a
 * flor fica na têmpora do lado para onde ela olha.
 */
function desenharDama(p: CanvasRenderingContext2D, f: Ficha): void {
  const { x, y, a, virado, luz } = f
  const saia = escolher(SAIAS, f.semente * 3 + 1)
  const pele = acender(escolher(PELES, f.semente * 5 + 2), luz)
  const cabelo = acender(escolher(CABELOS, f.semente * 7 + 3), luz)
  const flor = acender(escolher(FLORES, f.semente * 11 + 4), luz)

  sombraDeContato(p, x, y, a * 0.4)

  const yCintura = y - a * 0.52
  const yOmbro = y - a * 0.755
  const yCabeca = y - a * 0.865
  const rCabeca = a * 0.082
  // A inclinação joga o tronco para o lado do par: é ela que faz a figura
  // parecer DANÇANDO com alguém em vez de posando de frente.
  const xTronco = x + virado * f.pose.inclina * a

  // Os sapatos primeiro: eles ficam sob o barrado e só espiam.
  p.fillStyle = acender(SAPATO, luz)
  for (const lado of [-1, 1]) {
    p.beginPath()
    p.ellipse(x + lado * a * 0.055, y - a * 0.012, a * 0.045, a * 0.022, 0, 0, TAU)
    p.fill()
  }

  // A SAIA. O rodado da pose abre o leque; o giro o joga para o lado de trás
  // do movimento, que é o que dá a sensação de rodopio em vez de saia parada.
  const abertura = 0.98 * f.pose.rodado
  const giro = -virado * 0.16 * f.pose.rodado
  desenharSaia(
    p,
    x,
    yCintura,
    a * 0.46 * f.pose.rodado,
    a * 0.46,
    giro - abertura,
    giro + abertura,
    saia,
    luz,
    f.semente,
  )

  // O corpete, afunilado na cintura.
  p.fillStyle = acender(saia.corpo, luz)
  p.beginPath()
  p.moveTo(xTronco - a * 0.105, yOmbro)
  p.lineTo(xTronco + a * 0.105, yOmbro)
  p.lineTo(x + a * 0.085, yCintura + a * 0.02)
  p.lineTo(x - a * 0.085, yCintura + a * 0.02)
  p.closePath()
  p.fill()
  if (a > 22) {
    // Decote claro e faixa de cintura contrastante: estão em quase toda dama
    // da foto, e as duas são linhas horizontais que quebram o bloco do tronco.
    p.fillStyle = acender(RENDA, luz, 0.85)
    p.fillRect(xTronco - a * 0.07, yOmbro - a * 0.008, a * 0.14, Math.max(0.8, a * 0.022))
    p.fillStyle = acender(saia.vivo, luz)
    p.fillRect(x - a * 0.09, yCintura - a * 0.04, a * 0.18, Math.max(0.9, a * 0.03))
  }

  // Os braços, até o ponto de mão dada quando ele existe.
  const grossura = Math.max(1, a * 0.042)
  const manga = acender(saia.corpo, luz)
  const maoF = f.maoDada ?? ondeAMao(f, f.pose.frente)
  const maoT = ondeAMao(f, f.pose.tras)
  desenharBraco(p, xTronco - virado * a * 0.09, yOmbro + a * 0.02, maoT.x, maoT.y, manga, pele, grossura, virado * 0.14)
  desenharBraco(p, xTronco + virado * a * 0.09, yOmbro + a * 0.02, maoF.x, maoF.y, manga, pele, grossura, virado * 0.12)

  // A cabeça. O cabelo é uma massa deslocada para trás, maior que o crânio —
  // de longe é ele que dá o formato, não o rosto.
  p.fillStyle = cabelo
  p.beginPath()
  p.ellipse(xTronco - virado * rCabeca * 0.34, yCabeca + rCabeca * 0.16, rCabeca * 1.06, rCabeca * 1.24, virado * 0.22, 0, TAU)
  p.fill()
  if (!f.deCostas) {
    p.fillStyle = pele
    p.beginPath()
    p.ellipse(xTronco + virado * rCabeca * 0.12, yCabeca, rCabeca * 0.82, rCabeca * 0.98, 0, 0, TAU)
    p.fill()
    p.fillStyle = cabelo
    p.beginPath()
    p.ellipse(xTronco, yCabeca - rCabeca * 0.52, rCabeca * 0.92, rCabeca * 0.56, 0, 0, TAU)
    p.fill()
  }

  // A FLOR, sempre — ver o comentário em FLORES.
  const xFlor = xTronco + (f.deCostas ? -virado : virado) * rCabeca * 0.72
  p.fillStyle = flor
  p.beginPath()
  p.arc(xFlor, yCabeca - rCabeca * 0.5, Math.max(0.9, rCabeca * 0.46), 0, TAU)
  p.fill()
  if (rCabeca > 3.4) {
    p.fillStyle = acender('#FFF2C8', luz)
    p.beginPath()
    p.arc(xFlor, yCabeca - rCabeca * 0.5, rCabeca * 0.17, 0, TAU)
    p.fill()
  }
}

/**
 * O CAVALHEIRO.
 *
 * O chapéu de palha é o que o identifica de longe: na foto a aba é mais larga
 * que os ombros dele, e é essa desproporção que faz a silhueta ler como
 * "chapéu" e não como "cabeça grande". Camisa de cor cheia com xadrez, lenço
 * no pescoço, calça de brim escura e passo aberto — na foto nenhum
 * cavalheiro está com os dois pés juntos.
 */
function desenharCavalheiro(p: CanvasRenderingContext2D, f: Ficha): void {
  const { x, y, a, virado, luz } = f
  const camisa = escolher(CAMISAS, f.semente * 3 + 5)
  const calca = escolher(CALCAS, f.semente * 5 + 6)
  const pele = acender(escolher(PELES, f.semente * 7 + 7), luz)
  const cabelo = acender(escolher(CABELOS, f.semente * 11 + 8), luz)
  const lenco = escolher(LENCOS, f.semente * 13 + 9)

  sombraDeContato(p, x, y, a * 0.24)

  const yQuadril = y - a * 0.46
  const yOmbro = y - a * 0.78
  const yCabeca = y - a * 0.865
  const rCabeca = a * 0.075
  const xTronco = x + virado * f.pose.inclina * a
  const passo = f.pose.passo

  // As pernas, em passo de dança: uma atrás esticada, uma à frente flexionada.
  p.strokeStyle = acender(calca, luz)
  p.lineWidth = Math.max(1.4, a * 0.085)
  p.lineCap = 'round'
  const perna = (dxTopo: number, dxPe: number): void => {
    p.beginPath()
    p.moveTo(x + dxTopo, yQuadril)
    p.quadraticCurveTo(x + (dxTopo + dxPe) * 0.5, y - a * 0.22, x + dxPe, y - a * 0.02)
    p.stroke()
  }
  const peTras = -virado * a * 0.17 * passo
  const peFrente = virado * a * 0.12 * passo
  perna(-virado * a * 0.05, peTras)
  perna(virado * a * 0.05, peFrente)
  p.fillStyle = acender(SAPATO, luz)
  for (const dx of [peTras, peFrente]) {
    p.beginPath()
    p.ellipse(x + dx + virado * a * 0.02, y - a * 0.012, a * 0.05, a * 0.024, 0, 0, TAU)
    p.fill()
  }

  // A camisa, afunilada do ombro para a cintura.
  p.save()
  p.beginPath()
  p.moveTo(xTronco - a * 0.115, yOmbro - a * 0.01)
  p.lineTo(xTronco + a * 0.115, yOmbro - a * 0.01)
  p.lineTo(x + a * 0.085, yQuadril + a * 0.02)
  p.lineTo(x - a * 0.085, yQuadril + a * 0.02)
  p.closePath()
  p.fillStyle = acender(camisa, luz)
  p.fill()
  // O XADREZ, recortado na própria camisa. Some abaixo de um tamanho porque
  // a essa altura ele viraria uma trama de moiré, que é pior do que nada.
  if (a > 30) {
    p.clip()
    p.strokeStyle = 'rgba(255,255,255,0.16)'
    p.lineWidth = Math.max(0.7, a * 0.016)
    const grade = a * 0.062
    for (let i = -2; i <= 2; i++) {
      p.beginPath()
      p.moveTo(xTronco + i * grade, yOmbro - a * 0.02)
      p.lineTo(x + i * grade, yQuadril + a * 0.03)
      p.stroke()
    }
    for (let yy = yOmbro; yy < yQuadril; yy += grade) {
      p.beginPath()
      p.moveTo(xTronco - a * 0.13, yy)
      p.lineTo(xTronco + a * 0.13, yy)
      p.stroke()
    }
  }
  p.restore()

  // O cinto: separa camisa de calça e ancora a cintura.
  p.fillStyle = acender('#3A2617', luz)
  p.fillRect(x - a * 0.088, yQuadril - a * 0.01, a * 0.176, Math.max(0.9, a * 0.026))

  const grossura = Math.max(1, a * 0.044)
  const manga = acender(camisa, luz)
  const maoF = f.maoDada ?? ondeAMao(f, f.pose.frente)
  const maoT = ondeAMao(f, f.pose.tras)
  desenharBraco(p, xTronco - virado * a * 0.1, yOmbro + a * 0.03, maoT.x, maoT.y, manga, pele, grossura, virado * 0.16)
  desenharBraco(p, xTronco + virado * a * 0.1, yOmbro + a * 0.03, maoF.x, maoF.y, manga, pele, grossura, virado * 0.1)

  // Cabeça e cabelo.
  p.fillStyle = cabelo
  p.beginPath()
  p.ellipse(xTronco, yCabeca, rCabeca * 1.02, rCabeca * 1.06, 0, 0, TAU)
  p.fill()
  if (!f.deCostas) {
    p.fillStyle = pele
    p.beginPath()
    p.ellipse(xTronco + virado * rCabeca * 0.16, yCabeca + rCabeca * 0.12, rCabeca * 0.8, rCabeca * 0.9, 0, 0, TAU)
    p.fill()
  }

  // O LENÇO no pescoço: um triângulo pequeno de cor forte sob o queixo.
  p.fillStyle = acender(lenco, luz)
  p.beginPath()
  p.moveTo(xTronco - a * 0.06, yOmbro - a * 0.005)
  p.lineTo(xTronco + a * 0.06, yOmbro - a * 0.005)
  p.lineTo(xTronco + virado * a * 0.01, yOmbro + a * 0.06)
  p.closePath()
  p.fill()

  // O CHAPÉU DE PALHA. Aba larga, copa baixa, fita escura na base da copa e um
  // brilho quente na borda de cima da aba — é esse brilho que faz a palha ter
  // espessura em vez de ser um disco recortado.
  const yAba = yCabeca - rCabeca * 0.52
  const tombo = virado * 0.1
  p.fillStyle = acender(PALHA_SOMBRA, luz)
  p.beginPath()
  p.ellipse(xTronco, yAba + a * 0.012, a * 0.178, a * 0.05, tombo, 0, TAU)
  p.fill()
  p.fillStyle = acender(PALHA, luz)
  p.beginPath()
  p.ellipse(xTronco, yAba, a * 0.178, a * 0.048, tombo, 0, TAU)
  p.fill()
  p.beginPath()
  p.ellipse(xTronco, yAba - a * 0.055, a * 0.085, a * 0.058, tombo, 0, TAU)
  p.fill()
  p.fillRect(xTronco - a * 0.085, yAba - a * 0.058, a * 0.17, a * 0.06)
  p.fillStyle = acender(PALHA_SOMBRA, luz)
  p.fillRect(xTronco - a * 0.086, yAba - a * 0.026, a * 0.172, Math.max(0.9, a * 0.02))
  if (a > 24) {
    p.strokeStyle = acender(PALHA_LUZ, luz, 0.8)
    p.lineWidth = Math.max(0.7, a * 0.014)
    p.beginPath()
    p.ellipse(xTronco, yAba - a * 0.004, a * 0.176, a * 0.046, tombo, Math.PI * 1.05, Math.PI * 1.95)
    p.stroke()
  }
}

// ── O elenco ────────────────────────────────────────────────────────────

/**
 * Onde cada figura fica, em frações do quadro.
 *
 * ESCRITO À MÃO, e não gerado por laço, porque grade regular é o que mais
 * denuncia multidão sintética. As posições são irregulares de propósito:
 * grupo apertado aqui, vão vazio ali, gente sozinha entre pares.
 *
 * Restrições da praça que estas posições respeitam:
 * — a fogueira mora em 0,42 × 0,88, e ninguém pisa dentro dela;
 * — as barracas do fundo estão em 0,16 e 0,86, então a fileira do fundo se
 *   afasta das bordas;
 * — as barracas da FRENTE são desenhadas depois desta camada e cortam as
 *   bordas de baixo, então o plano da frente se mantém entre 0,19 e 0,84.
 */
type Grupo = {
  x: number
  y: number
  /** `par` desenha dama e cavalheiro de mãos dadas. */
  tipo: 'par' | 'dama' | 'cavalheiro'
  pose: keyof typeof POSES
  /** -1 espelha o grupo inteiro. */
  virado?: number
  /** Multiplicador da altura: gente alta, gente baixa, criança. */
  tam?: number
  deCostas?: boolean
}

const ELENCO: readonly Grupo[] = [
  // FUNDO — pequenos, e a maioria só assistindo (o palco fica em 0,84).
  { x: 0.775, y: 0.7, tipo: 'cavalheiro', pose: 'parado', virado: -1, tam: 0.95 },
  { x: 0.806, y: 0.694, tipo: 'dama', pose: 'parado', virado: -1 },
  { x: 0.845, y: 0.707, tipo: 'par', pose: 'dada', virado: -1, tam: 0.92 },
  { x: 0.735, y: 0.676, tipo: 'dama', pose: 'parado', virado: 1, tam: 0.9 },
  { x: 0.668, y: 0.688, tipo: 'par', pose: 'erguido', virado: 1, tam: 0.96 },
  { x: 0.556, y: 0.681, tipo: 'cavalheiro', pose: 'palma', virado: -1 },
  { x: 0.487, y: 0.697, tipo: 'par', pose: 'dada', virado: 1 },
  { x: 0.402, y: 0.674, tipo: 'dama', pose: 'roda', virado: -1, tam: 0.88 },
  { x: 0.328, y: 0.691, tipo: 'par', pose: 'erguido', virado: -1, tam: 1.04 },
  { x: 0.268, y: 0.679, tipo: 'cavalheiro', pose: 'parado', virado: 1, tam: 0.93 },

  // MEIO — a quadrilha propriamente dita, em volta da fogueira.
  { x: 0.208, y: 0.772, tipo: 'dama', pose: 'roda', virado: 1, tam: 1.05 },
  { x: 0.272, y: 0.744, tipo: 'par', pose: 'dada', virado: 1 },
  { x: 0.334, y: 0.796, tipo: 'par', pose: 'erguido', virado: -1, tam: 1.06 },
  { x: 0.472, y: 0.758, tipo: 'cavalheiro', pose: 'palma', virado: -1, tam: 0.97 },
  { x: 0.548, y: 0.733, tipo: 'par', pose: 'dada', virado: -1 },
  { x: 0.612, y: 0.799, tipo: 'par', pose: 'dada', virado: 1, tam: 1.03 },
  { x: 0.723, y: 0.756, tipo: 'par', pose: 'erguido', virado: 1, tam: 0.98 },
  { x: 0.802, y: 0.788, tipo: 'dama', pose: 'roda', virado: -1, tam: 1.02 },
  { x: 0.858, y: 0.742, tipo: 'cavalheiro', pose: 'parado', virado: -1 },
  { x: 0.146, y: 0.742, tipo: 'dama', pose: 'parado', virado: 1, tam: 0.94 },

  // FRENTE — grandes, e é o tamanho deles que dá profundidade a todo o resto.
  { x: 0.243, y: 0.898, tipo: 'par', pose: 'dada', virado: 1, tam: 1.02 },
  { x: 0.318, y: 0.853, tipo: 'dama', pose: 'roda', virado: -1 },
  { x: 0.552, y: 0.918, tipo: 'cavalheiro', pose: 'palma', virado: 1, tam: 1.06, deCostas: true },
  { x: 0.668, y: 0.884, tipo: 'par', pose: 'dada', virado: -1, tam: 1.04 },
  { x: 0.788, y: 0.853, tipo: 'par', pose: 'erguido', virado: 1 },
  { x: 0.462, y: 0.86, tipo: 'dama', pose: 'parado', virado: 1, tam: 0.96, deCostas: true },
] as const

/** Altura de referência de um adulto na escala 1. Calibrada para dar 30–60px
 *  na faixa da praça de um quadro 1200×620 — o tamanho em que esta cena de
 *  fato é vista. */
const ALTURA_ADULTO = 40

// ── A camada ────────────────────────────────────────────────────────────

/**
 * Desenha toda a gente da praça sobre o contexto dado.
 *
 * `escalaEm(y)` vem de fora e diz de que tamanho uma figura em pé na altura
 * `y` deve ser desenhada. TODA figura passa por ela: é a única coisa que
 * mantém esta camada na mesma perspectiva do chão, das barracas e do casario.
 * Uma figura no tamanho errado para a profundidade dela é o jeito mais rápido
 * de quebrar uma cena 2D.
 *
 * As figuras são ordenadas por `y` antes de desenhar: quem está mais perto
 * cobre quem está mais longe. Sem essa ordem a multidão vira uma colagem de
 * recortes flutuando, porque a sobreposição é justamente o que informa qual
 * corpo está na frente de qual.
 */
export function desenharGente(
  pincel: CanvasRenderingContext2D,
  largura: number,
  altura: number,
  escalaEm: (y: number) => number,
): void {
  const fichas: Ficha[] = []

  for (let i = 0; i < ELENCO.length; i++) {
    const g = ELENCO[i]!
    const semente = i * 17 + 3
    // Um empurrãozinho determinístico por cima da posição escrita à mão: tira
    // o resto de alinhamento sem desmontar a composição.
    const x = largura * g.x + (ale(semente) - 0.5) * largura * 0.012
    const y = altura * g.y + (ale(semente * 3) - 0.5) * altura * 0.008
    const escala = escalaEm(y)
    const virado = g.virado ?? 1
    // `POSES[g.pose]` e seguro: `g.pose` e uma chave do proprio mapa. O `!`
    // afirma o que o tipo do elenco ja garante.
    const pose = POSES[g.pose]!
    // Estatura variada por figura: gente de festa não tem todo mundo do mesmo
    // tamanho, e altura repetida é metade do que faz uma multidão parecer
    // clonada.
    const base = ALTURA_ADULTO * escala * (g.tam ?? 1) * (0.9 + ale(semente * 5) * 0.2)

    if (g.tipo !== 'par') {
      fichas.push({
        tipo: g.tipo,
        x,
        y,
        a: base * (g.tipo === 'dama' ? 0.96 : 1.06),
        virado,
        deCostas: g.deCostas ?? false,
        pose,
        luz: luzEm(x, y, largura, altura),
        semente,
        maoDada: null,
      })
      continue
    }

    // O par se olha: a dama de um lado, o cavalheiro do outro, virados um para
    // o outro. O vão entre eles acompanha o tamanho deles.
    const vao = base * 0.62
    const xDama = x + virado * vao * 0.5
    const xCav = x - virado * vao * 0.5
    const yDama = y + base * 0.02
    const yCav = y - base * 0.01

    const fDama: Ficha = {
      tipo: 'dama',
      x: xDama,
      y: yDama,
      a: base * 0.96,
      virado: -virado,
      deCostas: g.deCostas ?? false,
      pose,
      luz: luzEm(xDama, yDama, largura, altura),
      semente: semente * 2 + 1,
      maoDada: null,
    }
    const fCav: Ficha = {
      tipo: 'cavalheiro',
      x: xCav,
      y: yCav,
      a: base * 1.06,
      virado,
      deCostas: false,
      pose,
      luz: luzEm(xCav, yCav, largura, altura),
      semente: semente * 2 + 2,
      maoDada: null,
    }
    // O PONTO DE MÃO DADA, calculado antes e imposto aos dois braços. Deixar
    // cada braço parar onde a pose sozinha mandaria daria duas mãos PERTO uma
    // da outra, e "perto" lê como duas pessoas, nunca como um casal.
    const daMao = ondeAMao(fDama, pose.frente)
    const caMao = ondeAMao(fCav, pose.frente)
    const encontro = { x: (daMao.x + caMao.x) / 2, y: (daMao.y + caMao.y) / 2 }
    fDama.maoDada = encontro
    fCav.maoDada = encontro
    fichas.push(fDama, fCav)
  }

  // Fundo primeiro, frente por último. O desempate pelo índice mantém a ordem
  // estável — dois `y` iguais não podem trocar de lugar entre assadas.
  const ordem = fichas.map((f, i) => ({ f, i })).sort((p, q) => p.f.y - q.f.y || p.i - q.i)

  pincel.save()
  for (const { f } of ordem) {
    if (f.tipo === 'dama') desenharDama(pincel, f)
    else desenharCavalheiro(pincel, f)
  }
  pincel.restore()
}
