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

/**
 * O REPERTÓRIO — e a regra que ele quase quebrou.
 *
 * BRAÇO SIMÉTRICO NÃO DANÇA. `roda` tinha as duas mãos em [±0,33, 0,42]:
 * mesma altura, mesma distância, lados opostos. Isso desenha uma HÉLICE, e
 * o olho lê hélice como objeto, não como pessoa. `erguido` tinha o mesmo
 * problema com os dois braços no alto.
 *
 * Um corpo em movimento é assimétrico o tempo todo — um braço vai enquanto
 * o outro volta —, e é a DIFERENÇA entre os dois lados que conta a fase do
 * passo. Toda pose daqui tem as duas mãos em alturas diferentes; a única
 * exceção é `palma`, e ali a simetria É o gesto.
 *
 * As alturas são fração da figura a partir do chão, e o ombro fica em
 * 0,74: acima disso a mão está levantada, abaixo dela está caída.
 */
const POSES: Record<string, Pose> = {
  // Mão dada com o par lá em cima; a de trás caída, quase solta.
  dada: { frente: [0.34, 0.68], tras: [-0.26, 0.42], inclina: 0.07, passo: 1, rodado: 1 },
  // O arco por onde o outro par passa: o braço da frente no alto, o de trás
  // ainda subindo atrás dele.
  erguido: { frente: [0.2, 1.02], tras: [-0.3, 0.82], inclina: 0.01, passo: 0.7, rodado: 1.12 },
  // O giro: uma mão no ar, a outra segurando a saia. É a pose de quadrilha
  // mais reconhecível que existe, e ela é assimétrica por definição.
  roda: { frente: [0.3, 0.88], tras: [-0.16, 0.48], inclina: 0.04, passo: 0.45, rodado: 1.3 },
  // Só olhando: uma mão na cintura, a outra pendendo. Saia em repouso — é o
  // contraste com esta pose que faz as outras lerem como MOVIMENTO.
  parado: { frente: [0.17, 0.5], tras: [-0.13, 0.42], inclina: 0, passo: 0.2, rodado: 0.74 },
  // Palma, as duas mãos juntas à frente do peito.
  palma: { frente: [0.16, 0.7], tras: [0.09, 0.68], inclina: 0.03, passo: 0.25, rodado: 0.8 },
}

/**
 * A POSE NUM INSTANTE: interpolação entre duas poses do repertório.
 *
 * É o que faz a quadrilha DANÇAR em vez de posar. As figuras eram assadas
 * no sprite da cena e por isso ficavam paradas para sempre — uma praça cheia
 * de gente congelada no meio de um passo, que é justamente o pior estado em
 * que se pode congelar alguém.
 *
 * A CURVA IMPORTA MAIS QUE AS POSES. Interpolar linearmente daria um vaivém
 * mecânico de metrônomo. Um passo de dança acelera saindo, desacelera
 * chegando e PAUSA um instante no extremo — é a pausa que dá musicalidade, e
 * é ela que o `sin` elevado a uma potência produz de graça.
 */
function misturarPoses(a: Pose, b: Pose, t: number): Pose {
  const m = (x: number, y: number) => x + (y - x) * t
  return {
    frente: [m(a.frente[0], b.frente[0]), m(a.frente[1], b.frente[1])],
    tras: [m(a.tras[0], b.tras[0]), m(a.tras[1], b.tras[1])],
    inclina: m(a.inclina, b.inclina),
    passo: m(a.passo, b.passo),
    rodado: m(a.rodado, b.rodado),
  }
}

/** O compasso da figura `i` no instante `tempo`, em 0..1 com pausa nos
 *  extremos. Cada figura tem período e fase próprios: uma quadrilha em que
 *  todo mundo pisa junto lê como fileira de autômatos, e não como festa. */
function compasso(tempo: number, semente: number): number {
  const periodo = 1500 + ale(semente * 3 + 1) * 900
  const fase = ale(semente * 5 + 2) * TAU
  const bruto = Math.sin((tempo / periodo) * TAU + fase)
  // `sign(x)·|x|^0.6` estica o meio e achata os extremos: a figura passa
  // rápido pelo centro do movimento e demora nas pontas, que é como um
  // corpo com inércia se move.
  const curva = Math.sign(bruto) * Math.abs(bruto) ** 0.6
  return (curva + 1) / 2
}

/**
 * O SALTO DO CORPO — o peso subindo e descendo dentro do passo.
 *
 * Sem isto a figura vira os braços e nada mais: um busto girando sobre um
 * pedestal. Numa quadrilha o corpo INTEIRO sobe e desce, e é esse
 * deslocamento vertical, não o braço, que se lê de longe como dança —
 * numa multidão pequena o olho pega a altura das cabeças antes de
 * distinguir qualquer membro.
 *
 * DUAS VEZES a frequência dos braços: cada balanço de braço leva dois
 * passos, e é o descompasso entre os dois períodos que impede a figura de
 * parecer um só pêndulo.
 *
 * `|sin|` em vez de `sin`: o corpo sobe e volta ao chão, nunca afunda
 * abaixo dele. Elevado a 0.7, a subida fica rápida e a descida demora —
 * que é a queda amortecida pelo joelho, e é o que separa um salto de uma
 * senoide.
 */
function saltoDe(tempo: number, semente: number, altura: number): number {
  const periodo = (1500 + ale(semente * 3 + 1) * 900) / 2
  const fase = ale(semente * 5 + 2) * TAU
  return Math.abs(Math.sin((tempo / periodo) * Math.PI + fase)) ** 0.7 * altura * 0.022
}

/** A pose companheira de cada pose: para onde a figura vai e de onde volta. */
const PAR_DE_POSE: Record<string, string> = {
  dada: 'erguido',
  erguido: 'dada',
  roda: 'palma',
  palma: 'roda',
  parado: 'palma',
}

// ── Peças de desenho ────────────────────────────────────────────────────

/**
 * O ROSTO.
 *
 * As figuras não tinham feição nenhuma: a cabeça era um círculo de pele. A
 * esta distância isso quase passa — quase. O que falta quando falta feição
 * não é o detalhe, é a DIREÇÃO: sem olho, a cabeça não olha para lado
 * nenhum, e uma pessoa que não olha para nada lê como manequim.
 *
 * O QUE CABE NESTE TAMANHO. A cabeça mede 6 a 14px. Ali um olho é UM PIXEL,
 * e é só isso que se desenha: dois pontos escuros no lado para onde a figura
 * está virada, e uma boca de um traço. Acima de um tamanho entram a
 * sobrancelha e o rubor da bochecha — e, nos cavalheiros, o bigode pintado
 * que a quadrilha usa, que é maquiagem de festa e não pelo.
 *
 * Some abaixo do limiar em vez de encolher: feição de meio pixel vira
 * sujeira na cara, e cara suja é pior que cara lisa.
 */
function desenharRosto(
  p: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  virado: number,
  luz: Luz,
  bigode: boolean,
  semente: number,
): void {
  if (r < 3.4) return
  const olhoY = cy - r * 0.1
  const dx = r * 0.34
  // Os dois olhos ficam deslocados na direção do olhar: a cabeça é redonda,
  // e é a POSIÇÃO dos olhos nela que diz para onde a pessoa está virada.
  const centro = cx + virado * r * 0.16
  const rOlho = Math.max(0.8, r * 0.135)

  p.fillStyle = acender('#1A1014', luz)
  for (const lado of [-1, 1]) {
    p.beginPath()
    p.arc(centro + lado * dx * 0.62, olhoY, rOlho, 0, TAU)
    p.fill()
  }

  if (r >= 4.2) {
    // A SOBRANCELHA, e ela vem antes da boca na ordem de importância.
    //
    // Num rosto pequeno o olho não lê olhos — lê a MANCHA ESCURA na altura
    // dos olhos. Dois pontos sozinhos dão uma mancha fraca demais e a cara
    // fica vazia; a sobrancelha grossa por cima é o que dá massa àquela
    // faixa, e é por isso que todo desenho pequeno de gente tem
    // sobrancelha marcada mesmo quando não tem nariz.
    p.strokeStyle = acender('#241318', luz)
    p.lineWidth = Math.max(0.7, r * 0.13)
    p.lineCap = 'round'
    for (const lado of [-1, 1]) {
      p.beginPath()
      p.moveTo(centro + lado * dx * 0.28, olhoY - r * 0.34)
      p.lineTo(centro + lado * dx * 0.95, olhoY - r * 0.28)
      p.stroke()
    }
  }

  if (r >= 5) {
    // A boca: um traço curto e curvo. Sorriso, porque a figura está numa
    // festa — e boca reta a este tamanho lê como traço de lápis esquecido.
    p.strokeStyle = acender('#5A2A28', luz)
    p.lineWidth = Math.max(0.6, r * 0.09)
    p.beginPath()
    p.arc(centro, cy + r * 0.18, r * 0.3, Math.PI * 0.18, Math.PI * 0.82)
    p.stroke()

    // O rubor da bochecha, que é o que uma quadrilha pinta de verdade.
    p.fillStyle = acender('#C4564C', luz, 0.4)
    for (const lado of [-1, 1]) {
      p.beginPath()
      p.ellipse(centro + lado * dx, cy + r * 0.16, r * 0.2, r * 0.13, 0, 0, TAU)
      p.fill()
    }
  }

  if (r >= 6 && bigode && ale(semente * 7 + 3) > 0.45) {
    // O bigode PINTADO da quadrilha: dois traços finos, exagerados, que é
    // como a maquiagem de festa junina o desenha.
    p.strokeStyle = acender('#1A1014', luz)
    p.lineWidth = Math.max(0.6, r * 0.1)
    p.lineCap = 'round'
    for (const lado of [-1, 1]) {
      p.beginPath()
      p.moveTo(centro, cy + r * 0.04)
      p.quadraticCurveTo(centro + lado * r * 0.3, cy + r * 0.02, centro + lado * r * 0.42, cy - r * 0.1)
      p.stroke()
    }
  }
}

/**
 * O TRONCO, moldado.
 *
 * Era um trapézio de quatro retas: ombro reto, lateral reta, cintura reta.
 * Um trapézio não é um corpo — é uma placa, e o olho reconhece placa na
 * hora, mesmo com 40px de altura. O que falta a um trapézio é o que todo
 * torso humano tem:
 *
 * 1. OMBRO CAÍDO. A linha do ombro não é horizontal: ela desce do pescoço
 *    para fora, e é a primeira coisa que separa uma pessoa de um boneco de
 *    papel. Ombro reto lê como cabide.
 * 2. CINTURA CÔNCAVA. A lateral afunila para dentro com CURVA, não com
 *    reta: entra na cintura e volta a abrir embaixo. Uma reta ligando
 *    ombro a cintura dá um cone, e cone não tem cintura.
 * 3. PESCOÇO. A cabeça pousava direto no ombro. Um dedo de pescoço muda a
 *    leitura inteira da figura — sem ele a pessoa parece encolhida de
 *    frio, e todas ao mesmo tempo.
 *
 * `cinturaEm` é o quanto a lateral aperta, em fração da meia-largura do
 * ombro: mais baixo na dama (corpete) que no cavalheiro (camisa solta).
 */
function desenharTronco(
  p: CanvasRenderingContext2D,
  xOmbro: number,
  yOmbro: number,
  xCintura: number,
  yCintura: number,
  meioOmbro: number,
  meiaCintura: number,
  cinturaEm: number,
): void {
  const h = yCintura - yOmbro
  const caida = h * 0.07
  p.beginPath()
  p.moveTo(xOmbro - meioOmbro * 0.34, yOmbro - caida)
  p.lineTo(xOmbro - meioOmbro, yOmbro + caida * 0.6)
  p.quadraticCurveTo(xOmbro - meioOmbro * cinturaEm, yOmbro + h * 0.62, xCintura - meiaCintura, yCintura)
  p.lineTo(xCintura + meiaCintura, yCintura)
  p.quadraticCurveTo(xOmbro + meioOmbro * cinturaEm, yOmbro + h * 0.62, xOmbro + meioOmbro, yOmbro + caida * 0.6)
  p.lineTo(xOmbro + meioOmbro * 0.34, yOmbro - caida)
  p.closePath()
  p.fill()
}

/** O PESCOÇO: um toco de pele entre o ombro e o queixo, com a sombra do
 *  queixo por cima. Sem ele a cabeça pousa no tronco. */
function desenharPescoco(
  p: CanvasRenderingContext2D,
  x: number,
  yOmbro: number,
  alto: number,
  largo: number,
  corPele: string,
): void {
  p.fillStyle = corPele
  p.fillRect(x - largo / 2, yOmbro - alto, largo, alto * 1.4)
}

/** A sombra de contato. Sem ela toda figura FLUTUA — é o erro mais barato de
 *  cometer e o mais visível numa cena com chão texturado. */
/**
 * A sombra é ASSADA UMA VEZ num sprite e depois só escalada.
 *
 * Ela era um `createRadialGradient` por figura. Isso passava despercebido
 * enquanto a praça inteira era assada uma vez — mas a quadrilha saiu do
 * sprite para poder dançar, e o que era um custo único virou 28 gradientes
 * POR QUADRO. Construir gradiente é das operações mais caras do canvas 2D,
 * e é a que mais silenciosamente derruba um quadro.
 *
 * Um sprite pequeno esticado dá o mesmo borrão: uma sombra de contato é
 * justamente a coisa mais macia da cena, e macio não mostra escala.
 */
let spriteSombra: HTMLCanvasElement | null = null

function garantirSpriteSombra(): HTMLCanvasElement | null {
  if (spriteSombra) return spriteSombra
  if (typeof document === 'undefined') return null
  const lona = document.createElement('canvas')
  const lado = 64
  lona.width = lado
  lona.height = lado
  const q = lona.getContext('2d')
  if (!q) return null
  const g = q.createRadialGradient(lado / 2, lado / 2, 0, lado / 2, lado / 2, lado / 2)
  g.addColorStop(0, 'rgba(10,8,12,0.46)')
  g.addColorStop(0.6, 'rgba(10,8,12,0.2)')
  g.addColorStop(1, 'rgba(10,8,12,0)')
  q.fillStyle = g
  q.fillRect(0, 0, lado, lado)
  spriteSombra = lona
  return lona
}

/**
 * A sombra APERTA quando o corpo sobe.
 *
 * `alto` é o quanto a figura está no ar, em fração da própria altura. Uma
 * sombra de tamanho fixo sob um corpo que pula é o erro que mais rápido
 * denuncia um sprite deslocado: o olho não sabe dizer o que está errado,
 * mas para de acreditar que a pessoa tocou o chão.
 */
function sombraDeContato(
  p: CanvasRenderingContext2D,
  cx: number,
  yBase: number,
  raio: number,
  alto = 0,
): void {
  const sprite = garantirSpriteSombra()
  if (!sprite) return
  // Encolhe e clareia junto: sombra longe do chão é menor E mais fraca.
  const aperto = 1 - Math.min(0.45, alto * 9)
  const r = raio * aperto
  p.save()
  p.globalAlpha = aperto
  p.drawImage(sprite, cx - r, yBase - r * 0.3, r * 2, r * 0.6)
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
  lado: number,
  alcance: number,
): void {
  // O COTOVELO por dois ossos, não por uma curva decorativa.
  //
  // O braço era UMA curva quadrática com o controle deslocado de um valor
  // fixo. Isso desenha uma mangueira: o arco tem sempre a mesma barriga,
  // por mais perto ou longe que a mão esteja do ombro. Um braço de gente
  // faz o contrário — ele DOBRA quando a mão chega perto do corpo e
  // ESTICA quando ela se afasta, e é essa correlação, não a curvatura em
  // si, que o olho lê como articulação.
  //
  // A conta é o triângulo isósceles de dois ossos iguais: com a mão a uma
  // distância `d`, o cotovelo fica na perpendicular ao meio, a uma altura
  // `sqrt(osso² − (d/2)²)`. Mão junto ao ombro, cotovelo lá fora; braço
  // esticado, altura zero e os dois ossos em linha.
  const dx = mx - ox
  const dy = my - oy
  const comp = Math.hypot(dx, dy) || 1
  const dist = Math.min(comp, alcance * 0.99)
  const ux = dx / comp
  const uy = dy / comp
  const osso = alcance / 2
  const fora = Math.sqrt(Math.max(0, osso * osso - (dist / 2) ** 2))
  const cotoveloX = ox + ux * (dist / 2) - uy * lado * fora
  const cotoveloY = oy + uy * (dist / 2) + ux * lado * fora

  p.lineCap = 'round'
  p.lineJoin = 'round'

  // Antebraço primeiro, mais fino que o braço: um membro de espessura
  // constante lê como cano, e a conicidade é de graça aqui.
  p.strokeStyle = corPele
  p.lineWidth = grossura * 0.82
  p.beginPath()
  p.moveTo(cotoveloX, cotoveloY)
  p.lineTo(mx, my)
  p.stroke()

  p.lineWidth = grossura
  p.beginPath()
  p.moveTo(ox, oy)
  p.lineTo(cotoveloX, cotoveloY)
  p.stroke()

  // A MÃO: um ponto um pouco mais grosso que o antebraço. Braço que acaba
  // em ponta lê como espeto — e é justamente na ponta do braço que o olho
  // procura, porque é ali que a dança acontece.
  p.fillStyle = corPele
  p.beginPath()
  p.arc(mx, my, grossura * 0.75, 0, TAU)
  p.fill()

  // A manga curta e bufante, sobre o osso de cima só — ela nunca passa do
  // cotovelo, e é essa parada que marca onde a articulação está.
  p.strokeStyle = corManga
  p.lineWidth = grossura * 1.9
  p.beginPath()
  p.moveTo(ox, oy)
  p.lineTo(ox + (cotoveloX - ox) * 0.46, oy + (cotoveloY - oy) * 0.46)
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
/**
 * A ESTAMPA DE CHITA, salpicada dentro do que já estiver recortado.
 *
 * Na foto de referência não existe uma roupa lisa: saia e camisa são de
 * chita florida, e é a estampa — antes da cor, antes do corte — que diz
 * "roupa de festa junina". Cor chapada lê como fantasia de teatro escolar.
 *
 * NESTE TAMANHO A FLOR NÃO É UMA FLOR. Uma saia mede 20 a 40px de largura;
 * cinco pétalas ali seriam um borrão de três pixels. O que o olho lê é o
 * SALPICO — pontinhos claros de duas cores, densos e irregulares — e é isso
 * que se desenha. Desenhar a flor inteira custaria dez vezes mais e daria o
 * mesmo pixel.
 *
 * Some abaixo de um tamanho, pelo mesmo motivo do xadrez da camisa: um
 * salpico de meio pixel vira sujeira, e sujeira é pior que liso.
 *
 * A DENSIDADE É O PREÇO, e ela muda entre as duas camadas de gente.
 *
 * Enquanto a praça inteira era um sprite assado uma vez, ninguém pagava
 * por esta função. Quando a quadrilha da frente saiu do sprite para poder
 * dançar, os arcos dela viraram custo por quadro — e a medição foi
 * categórica: com a chita desligada o quadro voltava de 15 para 20fps sob
 * CPU 4×, e só com ela desligada. Era o gasto inteiro, numa função só.
 *
 * TENTEI UM `CanvasPattern` NO LUGAR: um preenchimento em vez de noventa,
 * o que parece obviamente melhor e não é. Mediu 12fps contra os 15 dos
 * arcos — preencher com padrão transformado dentro de um recorte cai num
 * caminho lento, e o "óbvio" custou mais que o ingênuo. Fica registrado
 * para ninguém refazer a tentativa achando que descobriu algo.
 *
 * O que funcionou foi trivial: MENOS PONTOS em quem dança. `maximo` é o
 * teto de salpicos — generoso na camada assada, onde eles são de graça, e
 * apertado na camada viva. Num corpo que se mexe metade dos pontos lê
 * igual, porque o olho não acompanha salpico em movimento.
 */
function salpicarChita(
  p: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  largura: number,
  altura: number,
  tamanho: number,
  cores: readonly string[],
  semente: number,
  maximo: number,
): void {
  if (tamanho < 1) return
  const n = Math.round((largura * altura) / (tamanho * tamanho * 14))
  for (let i = 0; i < Math.min(n, maximo); i++) {
    const px = x0 + ale(semente * 7 + i * 3) * largura
    const py = y0 + ale(semente * 11 + i * 5) * altura
    p.fillStyle = cores[i % cores.length]!
    p.beginPath()
    p.arc(px, py, tamanho * (0.5 + ale(semente * 13 + i) * 0.5), 0, TAU)
    p.fill()
  }
}

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
  maximoDeChita: number,
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

  // A ESTAMPA na camada de baixo, que é a mais larga e a que mais aparece.
  // Recortada nela: sem o recorte o salpico vazaria para fora do pano e a
  // saia ficaria com poeira em volta.
  p.save()
  p.beginPath()
  p.moveTo(cx, yCintura)
  for (let i = 0; i <= passos; i++) {
    const t = i / passos
    const ang = angA + (angB - angA) * t
    const fa = onda(t)
    p.lineTo(cx + Math.sin(ang) * raioH * fa, yCintura + Math.cos(ang) * raioV * fa)
  }
  p.closePath()
  p.clip()
  salpicarChita(
    p,
    cx - raioH,
    yCintura,
    raioH * 2,
    raioV * 1.1,
    Math.max(0, raioV * 0.055),
    [acender(saia.vivo, luz, 0.9), acender(saia.babado, luz, 0.75)],
    semente * 3 + 1,
    maximoDeChita,
  )
  p.restore()

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
  /** Quanto o corpo está no ar neste instante, em px. Ver `saltoDe`. */
  balanco: number
  /** `true` na camada que dança, e por isso paga por quadro. Só governa o
 *  quanto de estampa cabe — ver `salpicarChita`. */
  vivo: boolean
}

/** Onde o braço da figura nasce, e até onde ele chega. As duas contas
 *  ficam aqui porque a pose PRECISA delas: uma mão escrita fora do alcance
 *  não é uma pose, é um braço deslocado. */
function ombroDe(f: Ficha): { x: number; y: number; alcance: number } {
  const dama = f.tipo === 'dama'
  const y0 = f.y - f.balanco
  return {
    x: f.x + f.virado * f.pose.inclina * f.a + f.virado * f.a * (dama ? 0.09 : 0.1),
    y: y0 - f.a * (dama ? 0.735 : 0.75),
    alcance: f.a * (dama ? 0.34 : 0.36),
  }
}

/**
 * Resolve a posição absoluta de uma mão a partir da pose, SEM DEIXAR O
 * BRAÇO ESTICAR ALÉM DO QUE UM BRAÇO ESTICA.
 *
 * Era só uma conversão de coordenadas, e várias poses pediam a mão a 0,41
 * da altura do corpo de distância do ombro — mais longe do que o braço
 * alcança. O desenho obedecia: saía uma reta rígida do ombro até lá, sem
 * cotovelo nenhum, e o resultado era a figura empunhando uma barra.
 *
 * Puxar a mão para dentro do alcance conserta as duas coisas de uma vez: o
 * braço encurta para um tamanho de braço, e o cotovelo passa a ter para
 * onde dobrar. O 0,92 deixa a folga que vira essa dobra — no limite exato
 * o braço fica reto de novo.
 *
 * Vale também para a MÃO DADA do par: ela é a média de duas mãos já
 * puxadas para dentro, e por isso continua ao alcance dos dois.
 */
function ondeAMao(f: Ficha, mao: readonly [number, number]): { x: number; y: number } {
  const alvoX = f.x + f.virado * mao[0] * f.a
  const alvoY = f.y - f.balanco - mao[1] * f.a
  const o = ombroDe(f)
  const dx = alvoX - o.x
  const dy = alvoY - o.y
  const d = Math.hypot(dx, dy) || 1
  const teto = o.alcance * 0.92
  if (d <= teto) return { x: alvoX, y: alvoY }
  return { x: o.x + (dx / d) * teto, y: o.y + (dy / d) * teto }
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
  const { x, a, virado, luz } = f
  // O CORPO sobe com o salto; a SOMBRA fica no chão, onde o chão está. É a
  // sombra parada sob o corpo que sobe que diz "pulou" — as duas coisas
  // subindo juntas leriam como a câmera tremendo.
  const y = f.y - f.balanco
  const saia = escolher(SAIAS, f.semente * 3 + 1)
  const pele = acender(escolher(PELES, f.semente * 5 + 2), luz)
  const cabelo = acender(escolher(CABELOS, f.semente * 7 + 3), luz)
  const flor = acender(escolher(FLORES, f.semente * 11 + 4), luz)

  sombraDeContato(p, x, f.y, a * 0.4, f.balanco / a)

  const yCintura = y - a * 0.52
  const yOmbro = y - a * 0.755
  // A CABEÇA SUBIU (era 0,865). Naquela altura a base do crânio ficava a um
  // fio do ombro e engolia o pescoço inteiro: o pescoço estava desenhado
  // e simplesmente não aparecia. Dois pixels de folga bastam — é a menor
  // mudança deste arquivo e a que mais muda a figura, porque cabeça
  // encaixada no ombro lê como pessoa encolhida, e todas ao mesmo tempo.
  const yCabeca = y - a * 0.888
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
    f.vivo ? 22 : 90,
  )

  // O PESCOÇO, antes do corpete para o corpete cobrir a base dele.
  desenharPescoco(p, xTronco, yOmbro, a * 0.055, a * 0.045, pele)

  // O CORPETE, com ombro caído e cintura côncava — ver `desenharTronco`.
  // A dama aperta MAIS que o cavalheiro: é corpete, não camisa solta.
  p.fillStyle = acender(saia.corpo, luz)
  desenharTronco(p, xTronco, yOmbro, x, yCintura + a * 0.02, a * 0.105, a * 0.085, 0.6)
  if (a > 22) {
    // Decote claro e faixa de cintura contrastante: estão em quase toda dama
    // da foto, e as duas são linhas horizontais que quebram o bloco do tronco.
    p.fillStyle = acender(RENDA, luz, 0.85)
    p.fillRect(xTronco - a * 0.07, yOmbro - a * 0.008, a * 0.14, Math.max(0.8, a * 0.022))
    p.fillStyle = acender(saia.vivo, luz)
    p.fillRect(x - a * 0.09, yCintura - a * 0.04, a * 0.18, Math.max(0.9, a * 0.03))
  }

  // Os braços, até o ponto de mão dada quando ele existe.
  const grossura = Math.max(1, a * 0.036)
  const maoF = f.maoDada ?? ondeAMao(f, f.pose.frente)
  const maoT = ondeAMao(f, f.pose.tras)
  const ombro = ombroDe(f)
  // O BRAÇO DE TRÁS entra mais escuro: ele está do outro lado do corpo, e
  // dois braços da mesma cor achatam a figura num decalque. Um terço de
  // luz a menos é o bastante para o olho pôr um na frente do outro.
  const sombraDoCorpo: Luz = { ...luz, ganho: luz.ganho * 0.66 }
  desenharBraco(
    p,
    xTronco - virado * a * 0.09,
    yOmbro + a * 0.02,
    maoT.x,
    maoT.y,
    acender(saia.corpo, sombraDoCorpo),
    acender(escolher(PELES, f.semente * 5 + 2), sombraDoCorpo),
    grossura,
    -virado,
    ombro.alcance,
  )
  desenharBraco(
    p,
    ombro.x,
    ombro.y,
    maoF.x,
    maoF.y,
    acender(saia.corpo, luz),
    pele,
    grossura,
    virado,
    ombro.alcance,
  )

  // A cabeça. O cabelo é uma massa deslocada para trás, maior que o crânio —
  // de longe é ele que dá o formato, não o rosto.
  p.fillStyle = cabelo
  p.beginPath()
  // O cabelo recuou (era 1,06 × 1,24 deslocado 0,34). Aquela massa cobria
  // tanto do crânio que a cara virava uma nesga, e num rosto de 6px a
  // nesga não tem onde pôr olho nenhum. Continua MAIOR que o crânio, como
  // na foto — só que agora atrás dele, não por cima.
  p.ellipse(xTronco - virado * rCabeca * 0.46, yCabeca + rCabeca * 0.14, rCabeca * 1, rCabeca * 1.16, virado * 0.22, 0, TAU)
  p.fill()
  if (!f.deCostas) {
    p.fillStyle = pele
    p.beginPath()
    p.ellipse(xTronco + virado * rCabeca * 0.18, yCabeca, rCabeca * 0.88, rCabeca * 1, 0, 0, TAU)
    p.fill()
    p.fillStyle = cabelo
    p.beginPath()
    p.ellipse(xTronco - virado * rCabeca * 0.06, yCabeca - rCabeca * 0.58, rCabeca * 0.9, rCabeca * 0.5, 0, 0, TAU)
    p.fill()
  }

  // A FLOR, sempre — ver o comentário em FLORES.
  // O ROSTO, e só de quem está virado para a frente: quem dança de costas
  // não mostra cara, e desenhar olho nas costas de alguém é o tipo de erro
  // que ninguém nomeia mas todo mundo sente.
  if (!f.deCostas) {
    desenharRosto(p, xTronco + virado * rCabeca * 0.1, yCabeca, rCabeca, virado, luz, false, f.semente)
  }

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
  const { x, a, virado, luz } = f
  // Ver o comentário em `desenharDama`: corpo no ar, sombra no chão.
  const y = f.y - f.balanco
  const camisa = escolher(CAMISAS, f.semente * 3 + 5)
  const calca = escolher(CALCAS, f.semente * 5 + 6)
  const pele = acender(escolher(PELES, f.semente * 7 + 7), luz)
  const cabelo = acender(escolher(CABELOS, f.semente * 11 + 8), luz)
  const lenco = escolher(LENCOS, f.semente * 13 + 9)

  sombraDeContato(p, x, f.y, a * 0.24, f.balanco / a)

  const yQuadril = y - a * 0.46
  const yOmbro = y - a * 0.78
  // Ver o comentário da altura da cabeça em `desenharDama`.
  const yCabeca = y - a * 0.894
  const rCabeca = a * 0.075
  const xTronco = x + virado * f.pose.inclina * a
  const passo = f.pose.passo

  // As pernas, em passo de dança: uma atrás esticada, uma à frente flexionada.
  p.strokeStyle = acender(calca, luz)
  p.lineWidth = Math.max(1.4, a * 0.085)
  p.lineCap = 'round'
  // O JOELHO. O controle da curva ficava exatamente no meio entre quadril
  // e pé, o que dá uma perna igualmente arqueada nos dois lados — de novo a
  // mangueira. Num passo de dança as duas pernas fazem coisas OPOSTAS: a da
  // frente dobra e recebe o peso, a de trás estica e empurra. `dobra` é o
  // quanto o joelho avança do eixo da perna.
  const perna = (dxTopo: number, dxPe: number, dobra: number): void => {
    p.beginPath()
    p.moveTo(x + dxTopo, yQuadril)
    p.quadraticCurveTo(
      x + (dxTopo + dxPe) * 0.5 + virado * a * dobra,
      y - a * 0.24,
      x + dxPe,
      y - a * 0.02,
    )
    p.stroke()
  }
  const peTras = -virado * a * 0.17 * passo
  const peFrente = virado * a * 0.12 * passo
  perna(-virado * a * 0.05, peTras, -0.015 * passo)
  perna(virado * a * 0.05, peFrente, 0.055 * passo)
  p.fillStyle = acender(SAPATO, luz)
  for (const dx of [peTras, peFrente]) {
    p.beginPath()
    p.ellipse(x + dx + virado * a * 0.02, y - a * 0.012, a * 0.05, a * 0.024, 0, 0, TAU)
    p.fill()
  }

  // O PESCOÇO, antes da camisa e do lenço, que cobrem a base dele.
  desenharPescoco(p, xTronco, yOmbro, a * 0.05, a * 0.05, pele)

  // A CAMISA, com ombro caído e lateral curva — ver `desenharTronco`. Ela
  // aperta MENOS que o corpete da dama: camisa de homem é solta no tronco.
  p.save()
  p.fillStyle = acender(camisa, luz)
  desenharTronco(p, xTronco, yOmbro - a * 0.01, x, yQuadril + a * 0.02, a * 0.115, a * 0.085, 0.82)
  // O XADREZ, recortado na própria camisa. Some abaixo de um tamanho porque
  // a essa altura ele viraria uma trama de moiré, que é pior do que nada.
  // METADE DOS CAVALHEIROS USA CHITA, não xadrez. Na foto a camisa florida
  // aparece tanto quanto a xadrez, e uma rua inteira de xadrez lê como
  // uniforme — numa quadrilha cada um veste o que tem.
  if (a > 26 && ale(f.semente * 17 + 2) > 0.5) {
    p.clip()
    salpicarChita(
      p,
      xTronco - a * 0.15,
      yOmbro - a * 0.03,
      a * 0.3,
      yQuadril - yOmbro + a * 0.06,
      Math.max(0, a * 0.014),
      ['rgba(255,240,210,0.75)', 'rgba(255,206,110,0.6)'],
      f.semente * 19 + 4,
      f.vivo ? 18 : 90,
    )
  } else if (a > 30) {
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

  const grossura = Math.max(1, a * 0.04)
  const maoF = f.maoDada ?? ondeAMao(f, f.pose.frente)
  const maoT = ondeAMao(f, f.pose.tras)
  const ombro = ombroDe(f)
  // Ver o comentário do braço de trás em `desenharDama`.
  const sombraDoCorpo: Luz = { ...luz, ganho: luz.ganho * 0.66 }
  desenharBraco(
    p,
    xTronco - virado * a * 0.1,
    yOmbro + a * 0.03,
    maoT.x,
    maoT.y,
    acender(camisa, sombraDoCorpo),
    acender(escolher(PELES, f.semente * 7 + 7), sombraDoCorpo),
    grossura,
    -virado,
    ombro.alcance,
  )
  desenharBraco(
    p,
    ombro.x,
    ombro.y,
    maoF.x,
    maoF.y,
    acender(camisa, luz),
    pele,
    grossura,
    virado,
    ombro.alcance,
  )

  // Cabeça e cabelo.
  p.fillStyle = cabelo
  p.beginPath()
  p.ellipse(xTronco, yCabeca, rCabeca * 1.02, rCabeca * 1.06, 0, 0, TAU)
  p.fill()

  // O ROSTO. O cavalheiro leva o bigode pintado da quadrilha em parte dos
  // casos — é maquiagem de festa, não pelo, e por isso ele é exagerado.
  if (!f.deCostas) {
    desenharRosto(p, xTronco, yCabeca, rCabeca, virado, luz, true, f.semente)
  }
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
/**
 * QUEM DANÇA E QUEM FICA NO SPRITE — a linha está aqui, em pixels.
 *
 * Tirar a quadrilha inteira do sprite assado para ela poder dançar custou
 * um terço do quadro: 20fps caíram para 15 sob CPU 4×. Vinte e oito
 * figuras com saia em camadas, estampa de chita e rosto, todas
 * redesenhadas 60 vezes por segundo, é caro — e a maior parte desse gasto
 * vai para gente de 20px no fundo da praça, cujo movimento NINGUÉM VÊ.
 *
 * Então a praça tem duas quadrilhas. As figuras grandes, da frente, são
 * desenhadas por quadro e dançam. As pequenas, do fundo, voltam para o
 * sprite, cada uma travada numa fase própria do passo — paradas, mas
 * paradas em poses DIFERENTES, que é o que salva uma multidão congelada
 * de parecer congelada.
 *
 * 36px deixa DEZOITO figuras dançando — a frente inteira da praça. O número
 * subiu depois que a estampa de chita virou padrão assado (ver
 * `ladrilhoDeChita`): com ela custando um preenchimento em vez de noventa,
 * o teto de quantas figuras cabem por quadro subiu junto.
 *
 * Abaixo de 36px a figura tem uns 6px de tronco, e o deslocamento de um
 * passo inteiro não chega a dois pixels — movimento que ninguém veria, pago
 * sessenta vezes por segundo.
 */
const LIMIAR_DANCA_PX = 58

export type CamadaDeGente = 'longe' | 'perto'

export function desenharGente(
  pincel: CanvasRenderingContext2D,
  largura: number,
  altura: number,
  escalaEm: (y: number) => number,
  tempo: number,
  camada: CamadaDeGente,
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
    // A POSE DO INSTANTE: a escrita no elenco misturada com a companheira
    // dela, no compasso próprio desta figura. É isto que dança.
    const poseBase = POSES[g.pose]!
    const poseAlvo = POSES[PAR_DE_POSE[g.pose] ?? 'palma']!
    const pose = misturarPoses(poseBase, poseAlvo, compasso(tempo, semente) * 0.55)
    // Estatura variada por figura: gente de festa não tem todo mundo do mesmo
    // tamanho, e altura repetida é metade do que faz uma multidão parecer
    // clonada.
    const base = ALTURA_ADULTO * escala * (g.tam ?? 1) * (0.9 + ale(semente * 5) * 0.2)

    // O par inteiro cai do mesmo lado da linha: separar dama de cavalheiro
    // entre as duas camadas romperia a mão dada — um dos dois congelaria
    // no sprite enquanto o outro continuasse dançando com o braço preso.
    const dancante = base >= LIMIAR_DANCA_PX
    if (dancante !== (camada === 'perto')) continue

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
        balanco: saltoDe(tempo, semente, base),
        vivo: camada === 'perto',
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
      balanco: saltoDe(tempo, semente * 2 + 1, base),
      vivo: camada === 'perto',
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
      // O par salta JUNTO: quem dança de mãos dadas divide o compasso, e
      // dois saltos independentes esticariam o braço entre eles.
      balanco: saltoDe(tempo, semente * 2 + 1, base),
      vivo: camada === 'perto',
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
