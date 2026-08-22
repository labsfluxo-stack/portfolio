/**
 * O BALÃO JUNINO DECORATIVO — geometria e desenho.
 *
 * Não é o balão que voa. Existem dois objetos com o mesmo nome, e o primeiro
 * desenho errou de objeto: foi atrás do balão de São João de verdade (papel de
 * seda sobre armação, boca de arame com mecha acesa, arredondado, sobe no ar)
 * quando o que uma festa junina de fato tem pendurado é a LANTERNA de papel —
 * facetada, angular, com armação escura dividindo painéis estampados, alça de
 * arame em cima e franja de tiras coloridas embaixo. Referência: a imagem em
 * `public/`, escolhida pelo dono do site.
 *
 * A troca é boa para o tamanho em que este desenho de fato aparece (~30px de
 * largura em jogo). Linha escura sobre cor chapada sobrevive a qualquer
 * redução; degradê e volume aerografado, que era o que o desenho anterior
 * fazia, viram borrão. O contraste da armação é o que faz a peça continuar
 * legível quando ela é do tamanho de uma unha.
 *
 * O sistema de desenho: origem no TOPO do corpo (0,0), y crescendo para
 * baixo, e tudo em fração de `LARGURA_CORPO` — nunca pixel de tela. O sprite é
 * rasterizado uma vez nestas unidades e só depois escalado.
 */

/** Unidade do desenho. */
export const LARGURA_CORPO = 100
/** Altura só do corpo facetado, sem alça nem franja. */
export const ALTURA_CORPO = 132
/** A alça de arame, acima do corpo. */
export const ALTURA_ALCA = 11
/** A franja de tiras penduradas, abaixo do corpo. */
export const ALTURA_FRANJA = 38
export const ALTURA_TOTAL = ALTURA_ALCA + ALTURA_CORPO + ALTURA_FRANJA

/** Onde fica o centro vertical do sprite, contado a partir do topo do CORPO —
 *  quem rasteriza translada por isto para o `drawImage` centralizar no alvo.
 *  A alça fica em y negativo, a franja em y > ALTURA_CORPO. */
export const CENTRO_Y = (ALTURA_CORPO + ALTURA_FRANJA - ALTURA_ALCA) / 2

const meia = LARGURA_CORPO / 2

/**
 * O perfil do corpo: as alturas onde a silhueta muda de direção, com a
 * meia-largura em cada uma.
 *
 * É um hexágono alongado — topo truncado, alargando até um EQUADOR EM PONTA
 * (o vértice mais largo, e a razão de a peça não ler como bolha), depois
 * afunilando para uma base truncada. Os vértices são cantos vivos de
 * propósito: a lanterna é feita de painéis planos colados numa armação, e
 * suavizar as quinas é o que faria ela voltar a parecer um balão inflado.
 */
const PERFIL: readonly { y: number; meia: number }[] = [
  { y: 0, meia: 0.13 },
  { y: 0.14, meia: 0.5 },
  { y: 0.45, meia: 1 },
  { y: 0.79, meia: 0.47 },
  { y: 0.9, meia: 0.31 },
]

/** As colunas da armação, em fração da meia-largura de cada altura. Quatro
 *  montantes, três painéis visíveis por faixa — mais que isso vira ruído no
 *  tamanho de jogo, menos não lê como armação. */
const COLUNAS = [-1, -1 / 3, 1 / 3, 1] as const

/** A armação. Azul-noite bem escuro, nunca preto puro: preto sobre o fundo
 *  `#08090C` da dobra faria a armação DESAPARECER, e é justamente ela que dá
 *  a leitura da peça. */
const COR_ARMACAO = '#141C2B'
const LARGURA_ARMACAO = 3.4

/**
 * As cores dos painéis, na ordem em que são distribuídas.
 *
 * Paleta culturalmente codificada de festa junina — vermelho, amarelo, azul,
 * verde, laranja e branco. Nunca roxo, rosa ou neon.
 */
const CORES_PAINEL = [
  '#E23B2E',
  '#FFC93C',
  '#2E86C1',
  '#F5F1E6',
  '#1E8F5F',
  '#F07C24',
] as const

/** As estampas possíveis dentro de um painel. Motivos de papel recortado:
 *  estrela, losango e listras — os três que a lanterna de referência usa e os
 *  três que ainda dizem alguma coisa quando o painel tem 6px de largura. */
type Estampa = 'estrela' | 'losango' | 'listras' | 'liso'
const ESTAMPAS: readonly Estampa[] = ['estrela', 'listras', 'losango', 'liso', 'losango', 'estrela']

/** Meia-largura do corpo numa altura `y` (em unidades, não fração). */
export function meiaLarguraEm(y: number): number {
  const t = Math.min(1, Math.max(0, y / ALTURA_CORPO))
  for (let i = 0; i < PERFIL.length - 1; i++) {
    const a = PERFIL[i]!
    const b = PERFIL[i + 1]!
    if (t >= a.y && t <= b.y) {
      const k = b.y === a.y ? 0 : (t - a.y) / (b.y - a.y)
      return meia * (a.meia + (b.meia - a.meia) * k)
    }
  }
  return meia * PERFIL[PERFIL.length - 1]!.meia
}

/** O contorno do corpo — polígono, sem uma curva sequer. */
export function caminhoCorpo(): string {
  const esquerda = PERFIL.map((p) => `L ${-meia * p.meia} ${p.y * ALTURA_CORPO}`)
  const direita = [...PERFIL].reverse().map((p) => `L ${meia * p.meia} ${p.y * ALTURA_CORPO}`)
  return `M 0 0 ${esquerda.join(' ')} L 0 ${ALTURA_CORPO} ${direita.join(' ')} Z`
}

/** Cor de um painel, para o teste de contraste ler o que é de fato pintado. */
export const CORES_PAINEL_PUBLICAS = CORES_PAINEL

function pontoDaGrade(linha: number, coluna: number): { x: number; y: number } {
  const p = PERFIL[linha]!
  return { x: meia * p.meia * COLUNAS[coluna]!, y: p.y * ALTURA_CORPO }
}

/** Desenha a estampa de um painel, recortada nele. */
function desenharEstampa(
  pincel: CanvasRenderingContext2D,
  estampa: Estampa,
  cx: number,
  cy: number,
  largura: number,
  altura: number,
  cor: string,
): void {
  if (estampa === 'liso') return
  pincel.fillStyle = cor
  const r = Math.min(largura, altura) * 0.34
  if (estampa === 'estrela') {
    // Estrela de seis pontas: dois triângulos sobrepostos. Barata de desenhar
    // e é a estampa mais presente na lanterna de referência.
    for (const giro of [0, Math.PI]) {
      pincel.beginPath()
      for (let i = 0; i < 3; i++) {
        const a = giro + (i * 2 * Math.PI) / 3 - Math.PI / 2
        const px = cx + Math.cos(a) * r
        const py = cy + Math.sin(a) * r
        if (i === 0) pincel.moveTo(px, py)
        else pincel.lineTo(px, py)
      }
      pincel.closePath()
      pincel.fill()
    }
    return
  }
  if (estampa === 'losango') {
    pincel.beginPath()
    pincel.moveTo(cx, cy - r)
    pincel.lineTo(cx + r * 0.72, cy)
    pincel.lineTo(cx, cy + r)
    pincel.lineTo(cx - r * 0.72, cy)
    pincel.closePath()
    pincel.fill()
    return
  }
  // listras
  const passo = altura / 5
  for (let i = 0; i < 5; i += 2) {
    pincel.fillRect(cx - largura / 2, cy - altura / 2 + i * passo, largura, passo)
  }
}

/**
 * Desenha a lanterna inteira com a origem no TOPO do corpo (0,0).
 * Precisa de `Path2D` — quem chama garante.
 */
export function desenharCorpoBalao(pincel: CanvasRenderingContext2D): void {
  const corpo = new Path2D(caminhoCorpo())

  // 1) OS PAINÉIS. Cada célula da grade (faixa × coluna) vira um quadrilátero
  //    preenchido, com estampa por cima. Recortado na silhueta para as células
  //    de borda terminarem exatamente na quina do polígono.
  pincel.save()
  pincel.clip(corpo)
  let n = 0
  for (let linha = 0; linha < PERFIL.length - 1; linha++) {
    for (let coluna = 0; coluna < COLUNAS.length - 1; coluna++) {
      const a = pontoDaGrade(linha, coluna)
      const b = pontoDaGrade(linha, coluna + 1)
      const c = pontoDaGrade(linha + 1, coluna + 1)
      const d = pontoDaGrade(linha + 1, coluna)
      pincel.fillStyle = CORES_PAINEL[n % CORES_PAINEL.length]!
      pincel.beginPath()
      pincel.moveTo(a.x, a.y)
      pincel.lineTo(b.x, b.y)
      pincel.lineTo(c.x, c.y)
      pincel.lineTo(d.x, d.y)
      pincel.closePath()
      pincel.fill()

      // A estampa sai numa cor VIZINHA da paleta, nunca numa cor nova: é
      // assim que papel recortado se comporta (as sobras de uma cor viram o
      // recorte da outra), e evita inventar matiz fora da paleta junina.
      const contraste = CORES_PAINEL[(n + 3) % CORES_PAINEL.length]!
      const cx = (a.x + b.x + c.x + d.x) / 4
      const cy = (a.y + b.y + c.y + d.y) / 4
      const larguraCelula = Math.abs(b.x - a.x) * 0.9 + Math.abs(c.x - d.x) * 0.1
      const alturaCelula = Math.abs(d.y - a.y)
      desenharEstampa(
        pincel,
        ESTAMPAS[n % ESTAMPAS.length]!,
        cx,
        cy,
        Math.max(1, larguraCelula),
        Math.max(1, alturaCelula),
        contraste,
      )
      n++
    }
  }
  pincel.restore()

  // 2) A ARMAÇÃO por cima: os anéis horizontais e os montantes. É a única
  //    coisa aqui que precisa ler a 30px, e por isso vem depois de tudo.
  pincel.save()
  pincel.strokeStyle = COR_ARMACAO
  pincel.lineWidth = LARGURA_ARMACAO
  pincel.lineJoin = 'round'
  pincel.stroke(corpo)
  for (let linha = 1; linha < PERFIL.length - 1; linha++) {
    const p = PERFIL[linha]!
    pincel.beginPath()
    pincel.moveTo(-meia * p.meia, p.y * ALTURA_CORPO)
    pincel.lineTo(meia * p.meia, p.y * ALTURA_CORPO)
    pincel.stroke()
  }
  for (let coluna = 1; coluna < COLUNAS.length - 1; coluna++) {
    pincel.beginPath()
    pincel.moveTo(0, 0)
    for (let linha = 0; linha < PERFIL.length; linha++) {
      const g = pontoDaGrade(linha, coluna)
      pincel.lineTo(g.x, g.y)
    }
    pincel.lineTo(0, ALTURA_CORPO)
    pincel.stroke()
  }
  pincel.restore()

  // 3) A ALÇA de arame. Pequena, escura, e é ela que diz "isto está
  //    PENDURADO" — sem ela a peça flutua sem explicação.
  pincel.save()
  pincel.strokeStyle = COR_ARMACAO
  pincel.lineWidth = LARGURA_ARMACAO * 0.8
  pincel.beginPath()
  pincel.arc(0, -ALTURA_ALCA * 0.35, ALTURA_ALCA * 0.42, Math.PI * 0.15, Math.PI * 0.85, true)
  pincel.stroke()
  pincel.restore()

  // 4) A FRANJA de tiras de papel. Comprimentos desiguais de propósito:
  //    franja pareja lê como pente, não como papel cortado à mão.
  const baseFranja = ALTURA_CORPO
  const meiaBase = meiaLarguraEm(ALTURA_CORPO * 0.999)
  const nTiras = 9
  pincel.save()
  for (let i = 0; i < nTiras; i++) {
    const t = (i + 0.5) / nTiras
    const x = -meiaBase + meiaBase * 2 * t
    // Pseudoaleatório determinístico: o sprite é assado uma vez, então não
    // pode depender de `Math.random` — duas rasterizações têm de dar o mesmo
    // desenho.
    const comprimento = ALTURA_FRANJA * (0.55 + 0.45 * Math.abs(Math.sin(i * 2.399)))
    pincel.fillStyle = CORES_PAINEL[(i * 2) % CORES_PAINEL.length]!
    pincel.fillRect(x - meiaBase * 0.07, baseFranja, meiaBase * 0.14, comprimento)
  }
  pincel.restore()
}

/**
 * Traçado de reserva, sem `Path2D` — nunca um espaço mudo onde deveria haver
 * balão. Silhueta facetada e armação, que são as duas coisas sem as quais a
 * peça deixa de ser reconhecível.
 */
export function desenharBalaoDeReserva(
  pincel: CanvasRenderingContext2D,
  largura: number,
  altura: number,
): void {
  const w = largura / 2
  const h = altura / 2
  pincel.save()
  pincel.beginPath()
  pincel.moveTo(0, -h)
  pincel.lineTo(w, -h * 0.1)
  pincel.lineTo(0, h)
  pincel.lineTo(-w, -h * 0.1)
  pincel.closePath()
  pincel.fillStyle = CORES_PAINEL[0]!
  pincel.fill()
  pincel.strokeStyle = COR_ARMACAO
  pincel.lineWidth = Math.max(1, largura * 0.05)
  pincel.stroke()
  pincel.restore()
}

/**
 * Os cacos do estouro: os PAINÉIS da lanterna se soltando da armação.
 *
 * Uma lanterna de papel colado numa armação não se rasga em faixas — ela se
 * desmonta em painéis. É isso que amarra o estouro ao objeto, em vez de ser
 * uma explosão genérica desenhada por cima de qualquer coisa.
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
  let n = 0
  for (let linha = 0; linha < PERFIL.length - 1; linha++) {
    for (let coluna = 0; coluna < COLUNAS.length - 1; coluna++) {
      const a = pontoDaGrade(linha, coluna)
      const b = pontoDaGrade(linha, coluna + 1)
      const c = pontoDaGrade(linha + 1, coluna + 1)
      const d = pontoDaGrade(linha + 1, coluna)
      const cx = (a.x + b.x + c.x + d.x) / 4
      const cy = (a.y + b.y + c.y + d.y) / 4
      // Cada painel voa na direção em que ele já estava — o de fora vai mais
      // longe que o de dentro — e cai com o QUADRADO do progresso: começa
      // quase parado e acelera, em vez de nascer voando.
      const dx = cx * 1.6 * progresso
      const dy = ALTURA_CORPO * 0.45 * progresso * progresso
      const giro = (cx >= 0 ? 1 : -1) * 1.2 * progresso * progresso
      pincel.save()
      pincel.translate(dx, dy)
      pincel.translate(cx, cy)
      pincel.rotate(giro)
      pincel.translate(-cx, -cy)
      pincel.fillStyle = CORES_PAINEL[n % CORES_PAINEL.length]!
      pincel.beginPath()
      pincel.moveTo(a.x, a.y)
      pincel.lineTo(b.x, b.y)
      pincel.lineTo(c.x, c.y)
      pincel.lineTo(d.x, d.y)
      pincel.closePath()
      pincel.fill()
      pincel.restore()
      n++
    }
  }
  pincel.restore()
}
