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
/**
 * Altura só do corpo facetado.
 *
 * A lanterna de referência tem o corpo com proporção ~2:1; a primeira versão
 * saiu em 1,3:1 e ficou atarracada. O aperto é que a extensão DESENHADA tem
 * de caber na tolerância de acerto do motor, e alongar estoura esse teto.
 *
 * A saída: a caixa do sprite continua com `LARGURA_CORPO` de largura, mas a
 * lanterna é PINTADA com 90% disso (`LARGURA_PINTADA`). A proporção que o
 * olho vê passa a ser ~2,1:1 enquanto a caixa, que é o que o teste mede,
 * fica em 1,9:1. A sobra dos lados é pixel transparente e não custa nada.
 */
export const ALTURA_CORPO = 141
/** A alça de arame, acima do corpo. */
export const ALTURA_ALCA = 12
/** A franja de tiras penduradas, abaixo do corpo. */
export const ALTURA_FRANJA = 37
export const ALTURA_TOTAL = ALTURA_ALCA + ALTURA_CORPO + ALTURA_FRANJA

/** Onde fica o centro vertical do sprite, contado a partir do topo do CORPO —
 *  quem rasteriza translada por isto para o `drawImage` centralizar no alvo.
 *  A alça fica em y negativo, a franja em y > ALTURA_CORPO. */
export const CENTRO_Y = (ALTURA_CORPO + ALTURA_FRANJA - ALTURA_ALCA) / 2

/** Quanto da caixa a lanterna de fato ocupa — ver `ALTURA_CORPO`. */
const LARGURA_PINTADA = LARGURA_CORPO * 0.9
const meia = LARGURA_PINTADA / 2

/**
 * O perfil do corpo: as alturas onde a silhueta muda de direção, com a
 * meia-largura em cada uma.
 *
 * Topo truncado, alargando até o equador, um trecho RETO no equador, e daí
 * afunilando para uma base truncada. Os vértices são cantos vivos de
 * propósito: a lanterna é feita de painéis planos colados numa armação, e
 * suavizar as quinas a faria voltar a parecer um balão inflado.
 *
 * A FAIXA RETA NO EQUADOR é o que separa lanterna de losango. A primeira
 * versão levava o corpo a um único vértice mais largo e o resultado lia como
 * pipa: dois cones encostados pela ponta. Na lanterna de referência o ponto
 * mais largo é um trecho vertical curto — uma faixa inteira de painéis — e é
 * ela que dá o "corpo" ao objeto.
 *
 * O cone de cima é mais alto que o de baixo, também como na referência.
 */
const PERFIL: readonly { y: number; meia: number }[] = [
  { y: 0, meia: 0.11 },
  { y: 0.14, meia: 0.44 },
  { y: 0.44, meia: 1 },
  { y: 0.60, meia: 1 },
  { y: 0.87, meia: 0.42 },
  { y: 0.96, meia: 0.24 },
]

/**
 * Os montantes da armação, em fração da meia-largura de cada altura.
 *
 * ESPAÇADOS POR SENO, não em partes iguais. A lanterna é um corpo redondo:
 * as faces laterais estão quase de perfil para quem olha e ocupam pouca
 * largura na tela, enquanto as centrais aparecem inteiras. Dividir a largura
 * em partes iguais — que era o que a primeira versão fazia — achata a peça,
 * porque nenhuma superfície redonda se projeta assim. `sin` de ângulos
 * igualmente espaçados é exatamente a projeção de um cilindro facetado.
 */
// Meio-caminho entre espaçamento igual e projeção pura de cilindro: `sin`
// puro (±0,707) deixava os painéis das pontas 2,4× mais estreitos que os
// centrais e, somado ao véu de sombra, eles sumiam. 0,62 preserva a leitura
// de corpo redondo sem esconder um terço da estampa.
const COLUNAS = [-1, -0.62, 0, 0.62, 1] as const

/** A armação. Azul-noite bem escuro, nunca preto puro: preto sobre o fundo
 *  `#08090C` da dobra faria a armação DESAPARECER, e é justamente ela que dá
 *  a leitura da peça. */
const COR_ARMACAO = '#141C2B'
/** Espessura da armação. Era 3,4 e ficava pesada demais no tamanho grande:
 *  a referência tem o arame fino em relação ao painel. Não pode ficar muito
 *  abaixo disto, porém — o sprite é reduzido a ~30px em jogo, e é a armação
 *  que carrega a leitura da peça ali. */
const LARGURA_ARMACAO = 2.6

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
type Estampa = 'estrela' | 'losango' | 'listras' | 'zigue' | 'xadrez' | 'pontos' | 'liso'
/** A ordem em que as estampas caem nos painéis. Comprimento PRIMO em relação
 *  ao número de cores (7 contra 6): assim a combinação cor+estampa só se
 *  repete a cada 42 painéis, e a lanterna nunca mostra dois painéis idênticos
 *  lado a lado — que é o que faz uma colcha de retalhos parecer costurada à
 *  mão em vez de gerada. */
const ESTAMPAS: readonly Estampa[] = ['estrela', 'zigue', 'losango', 'xadrez', 'listras', 'pontos', 'estrela']

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

/**
 * Desenha a estampa DENTRO de um painel.
 *
 * PREENCHENDO o painel, não pousando um motivo no meio dele. A primeira
 * versão punha uma estrelinha centrada em cada painel e o resultado lia como
 * adesivo colado num plano liso; a lanterna de referência é uma colcha de
 * retalhos, onde a estampa vai até a costura. Repetir o motivo até a borda é
 * a diferença entre as duas leituras.
 */
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
  pincel.save()
  pincel.fillStyle = cor
  const x0 = cx - largura / 2
  const y0 = cy - altura / 2

  if (estampa === 'estrela') {
    // Estrela de seis pontas — a mais presente na referência. Uma só, mas
    // GRANDE: ocupa quase o painel inteiro, em vez de flutuar no centro.
    const r = Math.min(largura, altura) * 0.46
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
    pincel.restore()
    return
  }

  if (estampa === 'losango') {
    // Grade de losangos, não um só.
    const passoX = largura / 2
    const passoY = altura / 3
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 3; j++) {
        const px = x0 + passoX * (i + 0.5)
        const py = y0 + passoY * (j + 0.5)
        const r = Math.min(passoX, passoY) * 0.42
        pincel.beginPath()
        pincel.moveTo(px, py - r)
        pincel.lineTo(px + r * 0.7, py)
        pincel.lineTo(px, py + r)
        pincel.lineTo(px - r * 0.7, py)
        pincel.closePath()
        pincel.fill()
      }
    }
    pincel.restore()
    return
  }

  if (estampa === 'xadrez') {
    const passoX = largura / 4
    const passoY = altura / 5
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 5; j++) {
        if ((i + j) % 2) continue
        pincel.fillRect(x0 + i * passoX, y0 + j * passoY, passoX, passoY)
      }
    }
    pincel.restore()
    return
  }

  if (estampa === 'pontos') {
    const passoX = largura / 3
    const passoY = altura / 4
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 4; j++) {
        pincel.beginPath()
        pincel.arc(
          x0 + passoX * (i + 0.5),
          y0 + passoY * (j + 0.5),
          Math.min(passoX, passoY) * 0.3,
          0,
          Math.PI * 2,
        )
        pincel.fill()
      }
    }
    pincel.restore()
    return
  }

  if (estampa === 'zigue') {
    // Zigue-zague em faixa, o motivo de fita mais comum no papel junino.
    const linhas = 4
    const passoY = altura / linhas
    pincel.strokeStyle = cor
    pincel.lineWidth = Math.max(0.8, passoY * 0.28)
    for (let j = 0; j < linhas; j++) {
      const y = y0 + passoY * (j + 0.5)
      pincel.beginPath()
      for (let i = 0; i <= 4; i++) {
        const px = x0 + (largura / 4) * i
        const py = y + (i % 2 === 0 ? -passoY * 0.22 : passoY * 0.22)
        if (i === 0) pincel.moveTo(px, py)
        else pincel.lineTo(px, py)
      }
      pincel.stroke()
    }
    pincel.restore()
    return
  }

  // listras
  const passo = altura / 5
  for (let i = 0; i < 5; i += 2) {
    pincel.fillRect(x0, y0 + i * passo, largura, passo)
  }
  pincel.restore()
}

/** Os anéis horizontais e os montantes da armação, traçados sem decidir cor
 *  nem espessura — quem chama define. Existe porque três passadas diferentes
 *  (sombra de contato, armação, brilho do arame) precisam do MESMO caminho, e
 *  duplicá-lo era garantir que uma delas saísse de sincronia. */
function desenharLinhasDaArmacao(pincel: CanvasRenderingContext2D): void {
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
      const larguraCelula = Math.min(Math.abs(b.x - a.x), Math.abs(c.x - d.x)) * 0.86
      const alturaCelula = Math.abs(d.y - a.y) * 0.86
      // As faixas EXTREMAS (a de cima e a de baixo) ficam lisas: são estreitas,
      // e estampa em faixa estreita vira sujeira no tamanho de jogo. É também
      // o que a lanterna de referência faz — o miolo é que carrega o padrão.
      const extrema = linha === 0 || linha === PERFIL.length - 2
      if (!extrema) {
        desenharEstampa(
          pincel,
          ESTAMPAS[n % ESTAMPAS.length]!,
          cx,
          cy,
          Math.max(1, larguraCelula),
          Math.max(1, alturaCelula),
          contraste,
        )
      }

      // VOLUME por coluna. A face lateral de um corpo redondo recebe menos luz
      // que a frontal; sem isso a lanterna fica com aparência de recorte
      // chapado por mais que os montantes já estejam encurtados. Um véu escuro
      // por cima da própria célula, nunca uma cor nova.
      const meioColuna = (COLUNAS[coluna]! + COLUNAS[coluna + 1]!) / 2
          // 0,24 e não 0,42: a 0,42 os painéis das pontas ficavam quase pretos e
      // perdiam a cor, que é justamente o que a peça tem de mais junino. O
      // volume tem de se sentir sem apagar o painel.
      const sombra = Math.abs(meioColuna) ** 1.4 * 0.24
      if (sombra > 0.01) {
        pincel.fillStyle = `rgba(10,14,22,${sombra.toFixed(3)})`
        pincel.beginPath()
        pincel.moveTo(a.x, a.y)
        pincel.lineTo(b.x, b.y)
        pincel.lineTo(c.x, c.y)
        pincel.lineTo(d.x, d.y)
        pincel.closePath()
        pincel.fill()
      }
      n++
    }
  }
  pincel.restore()

  // 2) A LUZ DE DENTRO. Uma lanterna junina é ACESA — tem lâmpada ou vela
  //    dentro, e o papel é fino o bastante para acender por trás. Sem isso a
  //    peça lê como recorte de papel colorido colado numa parede, que é
  //    exatamente o que a versão chapada parecia. A luz nasce um pouco acima
  //    do meio (onde a chama fica) e cai para as bordas.
  pincel.save()
  pincel.clip(corpo)
  pincel.globalCompositeOperation = 'lighter'
  const luz = pincel.createRadialGradient(
    -meia * 0.12, ALTURA_CORPO * 0.46, 0,
    -meia * 0.12, ALTURA_CORPO * 0.46, meia * 1.5,
  )
  luz.addColorStop(0, 'rgba(255,236,190,0.34)')
  luz.addColorStop(0.45, 'rgba(255,206,130,0.14)')
  luz.addColorStop(1, 'rgba(255,180,90,0)')
  pincel.fillStyle = luz
  pincel.fillRect(-LARGURA_CORPO, 0, LARGURA_CORPO * 2, ALTURA_CORPO)
  pincel.restore()

  // 3) SOMBRA DE CONTATO nas costuras. Papel colado numa vareta não encosta
  //    nela num corte seco: a poucos milímetros da costura o papel já está na
  //    sombra do próprio vinco. Um traço largo e translúcido por baixo da
  //    armação faz esse degradê sem custar um gradiente por painel.
  pincel.save()
  pincel.clip(corpo)
  pincel.strokeStyle = 'rgba(12,16,26,0.3)'
  pincel.lineWidth = LARGURA_ARMACAO * 3.2
  pincel.lineJoin = 'round'
  desenharLinhasDaArmacao(pincel)
  pincel.stroke(corpo)
  pincel.restore()

  // 4) A ARMAÇÃO por cima: os anéis horizontais e os montantes. É a única
  //    coisa aqui que precisa ler a 30px, e por isso vem depois de tudo.
  pincel.save()
  pincel.strokeStyle = COR_ARMACAO
  pincel.lineWidth = LARGURA_ARMACAO
  pincel.lineJoin = 'round'
  pincel.stroke(corpo)
  desenharLinhasDaArmacao(pincel)

  // 5) O BRILHO DO ARAME. Uma linha clara e fina, deslocada para cima e para
  //    a esquerda, por cima da armação escura: é o reflexo na quina do arame,
  //    e é ele que faz a armação ter espessura em vez de ser um traço
  //    desenhado. Some sozinho no tamanho pequeno, o que é correto — a essa
  //    distância ninguém veria reflexo em arame de 1mm.
  pincel.strokeStyle = 'rgba(206,220,240,0.2)'
  pincel.lineWidth = LARGURA_ARMACAO * 0.34
  pincel.translate(-LARGURA_ARMACAO * 0.22, -LARGURA_ARMACAO * 0.22)
  pincel.stroke(corpo)
  desenharLinhasDaArmacao(pincel)
  pincel.restore()

  // 3) A ALÇA de arame. Pequena, escura, e é ela que diz "isto está
  //    PENDURADO" — sem ela a peça flutua sem explicação.
  pincel.save()
  pincel.strokeStyle = COR_ARMACAO
  pincel.lineWidth = LARGURA_ARMACAO
  pincel.lineCap = 'round'
  // Um GANCHO, não um semicírculo: haste subindo do topo e a volta abrindo
  // para um lado, como o arame de uma lanterna de verdade. O semicírculo
  // simétrico anterior lia como alça de bolsa.
  const rGancho = ALTURA_ALCA * 0.38
  pincel.beginPath()
  pincel.moveTo(0, 0)
  pincel.lineTo(0, -ALTURA_ALCA * 0.42)
  pincel.stroke()
  pincel.beginPath()
  pincel.arc(0, -ALTURA_ALCA * 0.42 - rGancho, rGancho, Math.PI * 0.55, Math.PI * 2.1)
  pincel.stroke()
  // O colar escuro onde o arame encontra o papel — some a emenda.
  pincel.fillStyle = COR_ARMACAO
  pincel.beginPath()
  pincel.ellipse(0, 0, meia * 0.16, ALTURA_ALCA * 0.12, 0, 0, Math.PI * 2)
  pincel.fill()
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
    const cor = CORES_PAINEL[(i * 2) % CORES_PAINEL.length]!
    pincel.fillStyle = cor
    pincel.fillRect(x - meiaBase * 0.07, baseFranja, meiaBase * 0.14, comprimento)
    // Estrelinhas de papel penduradas entre as tiras — a referência tem
    // várias, e são elas que impedem a franja de ler como código de barras.
    // Uma a cada três tiras: em todas viraria uma segunda fileira sólida.
    if (i % 3 === 1) {
      const r = meiaBase * 0.17
      const py = baseFranja + comprimento
      pincel.beginPath()
      for (let k = 0; k < 10; k++) {
        const ang = (k * Math.PI) / 5 - Math.PI / 2
        const rr = k % 2 === 0 ? r : r * 0.44
        const px = x + Math.cos(ang) * rr
        const qy = py + Math.sin(ang) * rr
        if (k === 0) pincel.moveTo(px, qy)
        else pincel.lineTo(px, qy)
      }
      pincel.closePath()
      pincel.fill()
    }
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

// ── Task 5: as outras duas formas do alvo ────────────────────────────────
//
// O motor (`motor-reflexo.ts`) sorteia três tipos de alvo — normal,
// premiado, recusa — e pontua cada um diferente, mas não desenha nada: quem
// decide a FORMA é o tema (ver `tipos.ts`). As duas funções abaixo são essa
// decisão, e a regra que as guiou é comercial, não estética — 8% dos homens
// são daltônicos, projetor de evento desloca matiz, e a paleta de um
// cliente de marca fria pode não sobrar contraste de COR nenhum pro tema
// gastar. Por isso a distinção mora na SILHUETA: premiado continua redondo
// (a mesma lanterna, só com um anel de luz a mais) e recusa é o oposto
// angular dela — nunca uma variação de tonalidade do balão comum.

/** O brilho do anel do premiado sai do próprio amarelo da lanterna — reusa
 *  paleta em vez de inventar um tom novo só pra este anel. */
const COR_ANEL_PREMIADO = CORES_PAINEL[1]!

/**
 * O ANEL VAZADO DO PRÊMIO: o mesmo contorno facetado do corpo
 * (`caminhoCorpo`), maior e tracejado — "vazado" no sentido de treliça
 * brasileira (cobogó, tijolo vazado): um contorno com vãos, não uma faixa
 * sólida. NENHUMA GEOMETRIA NOVA — é o próprio caminho dos gomos que
 * `desenharCorpoBalao` já desenha e que `desenharCacosDeFaixa` (o estouro)
 * já reaproveita; se o perfil da lanterna mudar um dia, o anel do prêmio
 * muda junto sem ninguém precisar lembrar de sincronizar dois desenhos.
 *
 * BRILHO POR COMPOSIÇÃO ADITIVA (`globalCompositeOperation = 'lighter'`),
 * NUNCA `shadowBlur`/`filter` — os dois caminhos lentos que este tema inteiro
 * evita. O traço tracejado por cima do próprio aditivo é o que lê como
 * "vazado" (tem vão) em vez de "assado" (sólido).
 *
 * CHAMADA SÓ NA RASTERIZAÇÃO (ver `garantirSpritePremiado` em `junino.ts`),
 * NUNCA POR QUADRO: um `stroke` de `Path2D` grande com traço tracejado é a
 * mesma classe de custo dos painéis do corpo, e só cabe no orçamento de
 * quadro porque — como o corpo — é assado uma vez só.
 *
 * `escala` amplia o contorno em torno do próprio meio vertical do CORPO
 * (sem a alça nem a franja) — um anel que cresce em volta do centro do
 * balão, não um eco deslocado pra um lado.
 */
export function desenharAneloPremiado(pincel: CanvasRenderingContext2D, escala: number): void {
  if (typeof Path2D === 'undefined') return
  const corpo = new Path2D(caminhoCorpo())
  const meioY = ALTURA_CORPO / 2
  pincel.save()
  pincel.translate(0, meioY)
  pincel.scale(escala, escala)
  pincel.translate(0, -meioY)
  pincel.globalCompositeOperation = 'lighter'
  pincel.strokeStyle = COR_ANEL_PREMIADO
  // Compensa a escala local: a espessura e o tracejado precisam medir o
  // mesmo tanto de papel em qualquer `escala`, não crescer junto com o anel.
  pincel.lineWidth = (LARGURA_ARMACAO * 1.3) / escala
  pincel.setLineDash([(LARGURA_CORPO * 0.05) / escala, (LARGURA_CORPO * 0.045) / escala])
  pincel.stroke(corpo)
  pincel.restore()
}

/**
 * Traçado de reserva do anel do prêmio, sem `Path2D` — usa só `arc`, que
 * existe em qualquer canvas. É o que roda em Node/jsdom (ver cabeçalho do
 * arquivo: `Path2D` não existe nesse ambiente) e no navegador raríssimo sem
 * `Path2D`. Mesma disciplina de `desenharBalaoDeReserva`: nunca um alvo
 * mudo, mesmo degradado.
 */
export function desenharPremiadoDeReserva(
  pincel: CanvasRenderingContext2D,
  largura: number,
  altura: number,
): void {
  desenharBalaoDeReserva(pincel, largura, altura)
  const raioAnel = Math.max(largura, altura) * 0.62
  pincel.save()
  pincel.globalCompositeOperation = 'lighter'
  pincel.strokeStyle = COR_ANEL_PREMIADO
  pincel.lineWidth = Math.max(1, largura * 0.05)
  pincel.setLineDash([raioAnel * 0.35, raioAnel * 0.3])
  pincel.beginPath()
  pincel.arc(0, 0, raioAnel, 0, Math.PI * 2)
  pincel.stroke()
  pincel.restore()
}

/** Preenchimento do losango de recusa — o próprio tom da armação: a peça é
 *  "feita só de arame", sem painel nenhum aceso por dentro. Nunca preto
 *  puro pelo mesmo motivo de `COR_ARMACAO`: precisa se separar do fundo
 *  `#08090C` da dobra. */
const COR_RECUSA = COR_ARMACAO
/** Rebordo do losango — um tom só, mais claro que o preenchimento, o
 *  bastante pra separar a silhueta do fundo escuro sem depender de matiz
 *  nenhum: a mesma disciplina de "leitura por forma" vale pra própria
 *  borda. */
const COR_BORDA_RECUSA = '#3A3348'

/**
 * O LOSANGO DE RECUSA: silhueta OPOSTA à da lanterna redonda — quatro
 * cantos vivos, nenhuma curva, escuro em vez de aceso. Esta é a distinção
 * que sobrevive a daltonismo e a projetor descalibrado (Task 5): angular
 * contra redondo continua legível quando toda cor falha.
 *
 * SEM `Path2D`, SEM SPRITE: quatro pontos e dois traçados não custam mais
 * que o traçado de reserva do balão (`desenharBalaoDeReserva`), então
 * desenhar direto por quadro — em vez de rasterizar como o corpo do balão —
 * não fura orçamento nenhum. Reaproveita a mesma ideia de losango que já
 * existe no traçado de reserva, só que como forma PRINCIPAL (recusa é
 * sempre losango, em qualquer ambiente) em vez de fallback.
 */
export function desenharLosangoRecusa(
  pincel: CanvasRenderingContext2D,
  largura: number,
  altura: number,
): void {
  const w = largura / 2
  const h = altura / 2
  pincel.save()
  pincel.beginPath()
  pincel.moveTo(0, -h)
  pincel.lineTo(w, 0)
  pincel.lineTo(0, h)
  pincel.lineTo(-w, 0)
  pincel.closePath()
  pincel.fillStyle = COR_RECUSA
  pincel.fill()
  pincel.strokeStyle = COR_BORDA_RECUSA
  pincel.lineWidth = Math.max(1, largura * 0.045)
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
