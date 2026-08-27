/**
 * O ARRAIAL EM CANVAS 2D — a praça inteira, assada num sprite.
 *
 * DESENHADO A PARTIR DA FOTO. A referência é o arraial nordestino em `public/`,
 * escolhida pelo dono do site, e essa é a diferença que mais importa neste
 * arquivo: as versões anteriores deste cenário foram desenhadas de memória, e
 * TODAS erravam a forma dos objetos — o balão era um balão de ar quente, a
 * bandeirinha era um triângulo, a fogueira era fogueira de acampamento. Forma
 * errada não se conserta com acabamento.
 *
 * O QUE A FOTO ENSINA, e que nenhuma dessas versões tinha:
 *
 * 1. PROFUNDIDADE POR TAMANHO. A foto tem barraca grande cortada pela borda, no
 *    primeiro plano, e casario pequeno no horizonte. O olho mede profundidade
 *    comparando tamanhos; sem nada perto, não há com o que comparar, e a cena
 *    inteira parece um painel plano por mais correto que esteja o desenho.
 *
 * 2. DENSIDADE. O céu da foto é riscado de varais, com bandeirinha quase
 *    encostando uma na outra. Três fios magros num céu grande leem como
 *    decoração de orçamento apertado.
 *
 * 3. O CHÃO É PROTAGONISTA. Paralelepípedo com tapete pintado e palha ocupa
 *    quase metade do quadro. Sem ele o casario flutua.
 *
 * TUDO AQUI É ASSADO UMA VEZ. Nada nesta cena anima: o que anima (bandeirinha
 * balançando, fogo, brasas) continua sendo desenhado por quadro em `junino.ts`.
 * Assar a parte parada num sprite é o que permite ter esta quantidade de objeto
 * sem pagar por ela a 60Hz.
 */

/** A linha do horizonte, em fração da altura. Alta como na foto: o chão da
 *  praça é o maior objeto da cena. */
// MENOS CHAO. Em 0,52 a praca ocupava quase metade do quadro e a pedra,
// escalada pela perspectiva, ficava enorme na borda de baixo — o calcamento
// lia como MURO DE TIJOLO em pe, nao como chao deitado. Horizonte mais baixo
// da menos chao e pedra menor, que e o que faz o piso deitar.
const HORIZONTE = 0.63

/** As fachadas do casario, em tom de crepúsculo. Pastel de verdade, nunca
 *  pastel escurecido — escurecer pastel dá marrom, e foi por isso que as
 *  versões anteriores nunca tiveram a cor da referência. */
const FACHADAS = [
  { parede: '#8E7A5E', telha: '#7E3A28' },
  { parede: '#8A6468', telha: '#7E3A28' },
  { parede: '#5A7086', telha: '#743420' },
  { parede: '#5E7E6C', telha: '#7E3A28' },
  { parede: '#907C5C', telha: '#743420' },
] as const

const COR_PALHA_TELHADO = '#7A5F34'
const COR_MADEIRA = '#3E2C1E'
const COR_CHITA_FUNDO = '#8E2622'

/** Determinístico: a cena é assada uma vez e não pode mudar entre visitas. */
function ale(semente: number): number {
  const x = Math.sin(semente * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

/**
 * Escala de um objeto pela altura em que ele está no chão.
 *
 * É o truque que dá perspectiva a uma cena 2D: no horizonte tudo é pequeno, na
 * borda de baixo tudo é grande, e a transição entre os dois é o que o olho lê
 * como distância. Sem isso, uma barraca no fundo e uma na frente teriam o mesmo
 * tamanho e a praça viraria um friso.
 */
function escalaEm(y: number, altura: number): number {
  const t = Math.max(0, Math.min(1, (y - altura * HORIZONTE) / (altura * (1 - HORIZONTE))))
  return 0.32 + t * 1.5
}

// ── O céu ───────────────────────────────────────────────────────────────

function desenharCeu(p: CanvasRenderingContext2D, largura: number, altura: number): void {
  const yHorizonte = altura * HORIZONTE
  const g = p.createLinearGradient(0, 0, 0, yHorizonte)
  // Escuro no alto, onde o título branco da dobra vive, e quente no horizonte,
  // onde o sol acabou de descer. Um céu com HORA DO DIA consegue as duas coisas
  // ao mesmo tempo justamente porque não é uma cor só.
  g.addColorStop(0, '#080C18')
  g.addColorStop(0.5, '#1C2234')
  g.addColorStop(0.84, '#4E3830')
  g.addColorStop(1, '#8A5A3A')
  p.fillStyle = g
  p.fillRect(0, 0, largura, yHorizonte)

  // Estrelas só no terço de cima: perto do horizonte a luz do arraial as
  // apagaria, e desenhá-las ali contradiria o próprio gradiente.
  for (let i = 0; i < 110; i++) {
    const x = ale(i * 3 + 1) * largura
    const y = ale(i * 5 + 2) * yHorizonte * 0.5
    const desbota = 1 - y / (yHorizonte * 0.5)
    p.fillStyle = `rgba(226,232,244,${(0.14 + ale(i * 7 + 3) * 0.4) * desbota})`
    p.beginPath()
    p.arc(x, y, 0.6 + ale(i * 11 + 5) * 0.7, 0, Math.PI * 2)
    p.fill()
  }
}

/**
 * OS MORROS atrás do casario.
 *
 * A foto tem serra verde no horizonte, à direita, e é ela que diz INTERIOR —
 * uma cidade sem nada atrás lê como cenário recortado. Ficam muito escuros e
 * pouco saturados: é noite, e morro distante à noite é quase silhueta.
 */
function desenharMorros(p: CanvasRenderingContext2D, largura: number, altura: number): void {
  const yBase = altura * (HORIZONTE + 0.02)
  for (const camada of [
    { altura: 0.1, cor: '#16202A', desloca: 0 },
    { altura: 0.07, cor: '#1C2A2E', desloca: 0.3 },
  ]) {
    p.fillStyle = camada.cor
    p.beginPath()
    p.moveTo(-largura * 0.05, yBase)
    // Uma linha de cumes irregular, feita de arcos de larguras diferentes —
    // cume parelho lê como onda desenhada, não como serra.
    let x = -largura * 0.05
    let n = 0
    while (x < largura * 1.05) {
      const w = largura * (0.16 + ale(n * 13 + camada.desloca * 100) * 0.2)
      const h = altura * camada.altura * (0.5 + ale(n * 17 + camada.desloca * 50) * 0.9)
      p.quadraticCurveTo(x + w / 2, yBase - h, x + w, yBase - h * 0.25)
      x += w
      n++
    }
    p.lineTo(largura * 1.05, yBase)
    p.closePath()
    p.fill()
  }
}

// ── O chão ──────────────────────────────────────────────────────────────

/**
 * O calçamento, em PERSPECTIVA.
 *
 * As fiadas de pedra ficam mais altas e mais largas conforme descem, e as
 * juntas verticais se afastam junto. É essa convergência que faz o chão deitar
 * em vez de ficar em pé como um muro — e chão em pé foi exatamente o que a
 * versão anterior deste cenário desenhou, com fiadas de altura constante.
 */
function desenharChao(p: CanvasRenderingContext2D, largura: number, altura: number): void {
  const yHorizonte = altura * HORIZONTE
  const g = p.createLinearGradient(0, yHorizonte, 0, altura)
  // MAIS CLARO e mais quente que antes (#2A2422 → #463A34). O calçamento
  // ficava tão escuro entre os objetos que lia como parede de fundo, e a
  // praça perdia o chão. Chão de arraial à noite não é preto: ele devolve a
  // luz das barracas e da fogueira, e é essa devolução que faz a praça
  // parecer um lugar em vez de um recorte.
  g.addColorStop(0, '#3E3430')
  g.addColorStop(0.45, '#54453C')
  g.addColorStop(1, '#6E5A4C')
  p.fillStyle = g
  p.fillRect(0, yHorizonte, largura, altura - yHorizonte)

  let y = yHorizonte
  let fila = 0
  while (y < altura) {
    const escala = escalaEm(y, altura)
        // Pedra MENOR. A anterior media 1,6% da altura na escala 1 e chegava a
    // dobrar disso na borda de baixo. Pedra grande demais e o que fez o chao
    // parecer parede: calcamento de verdade tem pedra pequena em relacao a
    // praca, e e a QUANTIDADE de pedra que da escala ao resto.
    const alturaFiada = Math.max(2, altura * 0.0075 * escala)
    const larguraPedra = alturaFiada * 2.1
    p.fillStyle = 'rgba(20,16,15,0.5)'
    p.fillRect(0, y + alturaFiada - 1, largura, 1)
    const desloca = fila % 2 === 0 ? 0 : larguraPedra / 2
    for (let x = -larguraPedra + desloca; x < largura; x += larguraPedra) {
      const tom = 0.05 + ale(fila * 29 + Math.round(x)) * 0.07
      p.fillStyle = `rgba(214,198,178,${(tom * 0.5).toFixed(3)})`
      p.fillRect(x + 1, y + 1, larguraPedra - 2, alturaFiada - 2)
    }
    y += alturaFiada
    fila++
  }
}

/**
 * AS POÇAS DE LUZ no calçamento.
 *
 * Cada barraca e a fogueira jogam luz no chão à volta. Sem isso a pedra fica
 * com brilho uniforme e o olho lê "textura aplicada", não "chão iluminado por
 * fontes" — e são as fontes que dizem onde as coisas estão, mesmo quando o
 * objeto em si é pequeno na tela.
 *
 * ELÍPTICAS E ACHATADAS. Luz que cai num plano visto de cima em ângulo raso
 * espalha muito mais na horizontal do que na vertical; um círculo aqui leria
 * como bola de luz flutuando, não como poça no chão.
 */
function desenharPocasDeLuz(p: CanvasRenderingContext2D, largura: number, altura: number): void {
  const pocas = [
    { x: 0.16, y: 0.7, r: 0.16, cor: '255,206,132', alfa: 0.3 },
    { x: 0.86, y: 0.72, r: 0.16, cor: '255,206,132', alfa: 0.3 },
    { x: -0.04, y: 1.02, r: 0.24, cor: '255,206,132', alfa: 0.34 },
    { x: 1.05, y: 1.04, r: 0.24, cor: '255,206,132', alfa: 0.34 },
    // A da fogueira é maior e mais quente: é a fonte mais forte da praça.
    { x: 0.56, y: 0.88, r: 0.3, cor: '255,150,70', alfa: 0.42 },
  ]
  p.save()
  p.globalCompositeOperation = 'lighter'
  for (const poca of pocas) {
    const cx = largura * poca.x
    const cy = altura * poca.y
    const rx = largura * poca.r
    const g = p.createRadialGradient(cx, cy, 0, cx, cy, rx)
    g.addColorStop(0, `rgba(${poca.cor},${poca.alfa})`)
    g.addColorStop(1, `rgba(${poca.cor},0)`)
    p.save()
    p.translate(cx, cy)
    p.scale(1, 0.34)
    p.translate(-cx, -cy)
    p.fillStyle = g
    p.beginPath()
    p.arc(cx, cy, rx, 0, Math.PI * 2)
    p.fill()
    p.restore()
  }
  p.restore()
}
/**
 * OS TAPETES PINTADOS no calçamento.
 *
 * Na foto eles são padrões geométricos FORTES — losangos e quadros em cores
 * cheias — cobrindo boa parte da praça onde a quadrilha dança. Os meus eram
 * três trapézios lisos em alfa baixo, que leem como mancha de luz, não como
 * chão pintado.
 *
 * Trapézio, e nunca retângulo: em perspectiva a borda de trás é mais estreita
 * que a da frente, e um retângulo aqui leria como adesivo colado na tela.
 */
function desenharTapetes(p: CanvasRenderingContext2D, largura: number, altura: number): void {
  const tapetes = [
    { cx: 0.44, y: 0.7, largura: 0.26, cor: '#A82A24', motivo: '#E8C05A' },
    { cx: 0.68, y: 0.8, largura: 0.24, cor: '#1E6F4F', motivo: '#F2E2C4' },
    { cx: 0.36, y: 0.9, largura: 0.3, cor: '#B07818', motivo: '#A82A24' },
  ]
  for (const t of tapetes) {
    const y0 = altura * t.y
    const escala0 = escalaEm(y0, altura)
    const alturaTapete = altura * 0.085 * escala0
    const y1 = y0 + alturaTapete
    const meia0 = ((largura * t.largura) / 2) * (escala0 / 1.1)
    const meia1 = ((largura * t.largura) / 2) * (escalaEm(y1, altura) / 1.1)
    const cx = largura * t.cx

    p.save()
    p.beginPath()
    p.moveTo(cx - meia0, y0)
    p.lineTo(cx + meia0, y0)
    p.lineTo(cx + meia1, y1)
    p.lineTo(cx - meia1, y1)
    p.closePath()
    p.fillStyle = t.cor
    p.globalAlpha = 0.82
    p.fill()
    // O MOTIVO, recortado no próprio tapete: losangos em fileira, que é o
    // padrão mais presente no chão pintado da referência.
    p.clip()
    p.fillStyle = t.motivo
    const passo = alturaTapete * 0.44
    for (let fy = y0; fy < y1; fy += passo) {
      const desloca = Math.round((fy - y0) / passo) % 2 === 0 ? 0 : passo
      for (let fx = cx - meia0; fx < cx + meia0; fx += passo * 2) {
        p.beginPath()
        p.moveTo(fx + desloca, fy + passo * 0.1)
        p.lineTo(fx + desloca + passo * 0.42, fy + passo * 0.5)
        p.lineTo(fx + desloca, fy + passo * 0.9)
        p.lineTo(fx + desloca - passo * 0.42, fy + passo * 0.5)
        p.closePath()
        p.fill()
      }
    }
    p.restore()
  }
}
/** Palha espalhada. É o que uma festa junina joga no chão, e é o detalhe que
 *  impede o calçamento de ler como piso de shopping. */
function desenharPalha(p: CanvasRenderingContext2D, largura: number, altura: number): void {
  const yHorizonte = altura * HORIZONTE
  for (let i = 0; i < 170; i++) {
    const y = yHorizonte + ale(i * 41 + 5) * (altura - yHorizonte)
    const x = ale(i * 37 + 3) * largura
    const escala = escalaEm(y, altura)
    const comprimento = (2 + ale(i * 43 + 7) * 5) * escala
    const ang = ale(i * 47 + 11) * Math.PI
    p.strokeStyle = `rgba(200,168,110,${(0.1 + ale(i * 53 + 13) * 0.2).toFixed(3)})`
    p.lineWidth = Math.max(1, escala * 0.9)
    p.beginPath()
    p.moveTo(x, y)
    p.lineTo(x + Math.cos(ang) * comprimento, y + Math.sin(ang) * comprimento)
    p.stroke()
  }
}

// ── O casario ───────────────────────────────────────────────────────────

/**
 * Uma casa colonial: embasamento, cornija, janelas de moldura branca com
 * veneziana, porta, e telhado de TELHA com beiral.
 *
 * Cada peça é barata sozinha; é a soma delas que separa "casario" de "blocos".
 * A versão anterior era um retângulo com um triângulo em cima e retângulos
 * acesos colados na frente — que lê como prédio genérico, não como cidade do
 * interior.
 */
function desenharCasa(
  p: CanvasRenderingContext2D,
  x: number,
  yBase: number,
  largura: number,
  alturaCasa: number,
  fachada: (typeof FACHADAS)[number],
  semente: number,
): void {
  const yTopo = yBase - alturaCasa

  p.fillStyle = fachada.parede
  p.fillRect(x, yTopo, largura, alturaCasa)

  // Mancha de reboco: parede de cor plana lê como papelão. Até fachada
  // recém-pintada tem sujeira de chuva, e é a irregularidade em baixíssimo
  // contraste que o olho lê como superfície de verdade.
  for (let i = 0; i < 18; i++) {
    p.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'
    p.beginPath()
    p.arc(
      x + ale(semente * 13 + i) * largura,
      yTopo + ale(semente * 17 + i * 3) * alturaCasa,
      largura * (0.04 + ale(semente * 19 + i) * 0.09),
      0,
      Math.PI * 2,
    )
    p.fill()
  }

  // Embasamento: a faixa que a chuva suja. Sem ela a parede brota do chão.
  p.fillStyle = 'rgba(20,14,10,0.55)'
  p.fillRect(x, yBase - alturaCasa * 0.1, largura, alturaCasa * 0.1)

  // Janelas: moldura clara SALIENTE e o vão dentro dela. Numa casa colonial a
  // verruma é pintada de cal e sobressai do reboco — é ela, e não o vidro, que
  // faz a janela existir de longe.
  const colunas = largura > alturaCasa * 0.9 ? 3 : 2
  const larguraJanela = largura / (colunas * 2.6)
  const alturaJanela = alturaCasa * 0.24
  for (let c = 0; c < colunas; c++) {
    const xj = x + (largura / (colunas + 1)) * (c + 1) - larguraJanela / 2
    const yj = yTopo + alturaCasa * 0.22
    p.fillStyle = '#D8CDBA'
    p.fillRect(xj - larguraJanela * 0.16, yj - alturaJanela * 0.1, larguraJanela * 1.32, alturaJanela * 1.2)
    const acesa = ale(semente * 31 + c * 3) > 0.42
    p.fillStyle = acesa ? '#FFC46E' : '#12141C'
    p.fillRect(xj, yj, larguraJanela, alturaJanela)
    // Veneziana encostada de um lado, meia folha só: as duas fechadas tapariam
    // o vão, e casa toda fechada não lê como casa habitada.
    p.fillStyle = '#2E4A44'
    p.fillRect(xj, yj, larguraJanela * 0.34, alturaJanela)
  }

  // A porta.
  p.fillStyle = '#4A2E1C'
  p.fillRect(x + largura * 0.42, yBase - alturaCasa * 0.34, largura * 0.16, alturaCasa * 0.24)

  // Cornija: a moldura saliente sob o telhado. É o detalhe que mais rápido diz
  // "colonial" e custa um retângulo.
  p.fillStyle = '#D8CDBA'
  p.fillRect(x - largura * 0.02, yTopo - alturaCasa * 0.04, largura * 1.04, alturaCasa * 0.05)

  // O TELHADO: duas águas rasas com beiral passando dos dois lados. Telhado
  // pontudo lê como cabana alpina; colonial é de pouca inclinação.
  const alturaTelhado = alturaCasa * 0.2
  const beiral = largura * 0.09
  p.fillStyle = fachada.telha
  p.beginPath()
  p.moveTo(x - beiral, yTopo - alturaCasa * 0.03)
  p.lineTo(x + largura / 2, yTopo - alturaCasa * 0.03 - alturaTelhado)
  p.lineTo(x + largura + beiral, yTopo - alturaCasa * 0.03)
  p.closePath()
  p.fill()
  // As canaletas da telha: sem elas o telhado é uma tampa vermelha.
  p.strokeStyle = 'rgba(0,0,0,0.28)'
  p.lineWidth = 1
  const passo = Math.max(3, largura * 0.055)
  for (let xt = x - beiral; xt < x + largura + beiral; xt += passo) {
    const t = Math.abs(xt - (x + largura / 2)) / (largura / 2 + beiral)
    p.beginPath()
    p.moveTo(xt, yTopo - alturaCasa * 0.03)
    p.lineTo(x + largura / 2 + (xt - (x + largura / 2)) * 0.1, yTopo - alturaCasa * 0.03 - alturaTelhado * (1 - t))
    p.stroke()
  }
}

function desenharCasario(p: CanvasRenderingContext2D, largura: number, altura: number): void {
  const yBase = altura * (HORIZONTE + 0.035)
  let x = -largura * 0.05
  let n = 0
  while (x < largura * 1.05) {
    // Um SOBRADO grande no centro, como o que domina a praça na foto. Fileira
    // toda do mesmo porte lê como conjunto habitacional, não centro histórico.
    const central = Math.abs(x / largura - 0.55) < 0.08
    const larguraCasa = largura * (central ? 0.19 : 0.075 + ale(n * 13 + 7) * 0.05)
    const alturaCasa = altura * (central ? 0.2 : 0.1 + ale(n * 17 + 11) * 0.06)
    desenharCasa(p, x, yBase, larguraCasa, alturaCasa, FACHADAS[n % FACHADAS.length]!, n)
    x += larguraCasa * 1.02
    n++
  }
}

/**
 * O MASTRO CENTRAL com a faixa.
 *
 * É o ponto focal da praça na foto: um poste alto no meio, com a faixa do
 * São João pendurada, e é DELE que os varais saem em leque. Sem o mastro os
 * varais não têm de onde sair, e é por isso que os meus vinham lendo como
 * fileiras paralelas penduradas no nada.
 *
 * A faixa não leva texto: texto desenhado em canvas não é lido por leitor de
 * tela, e a regra desta página é que informação mora em DOM. Aqui ela é a
 * tábua pintada, que é o que se vê de longe.
 */
/** O mastro fica a DIREITA do centro: em 0,5 a faixa dele batia em cima do
 *  titulo da dobra, e nesta pagina o texto vem antes do cenario. */
export const MASTRO = { x: 0.63, yTopo: 0.055 } as const

function desenharMastro(p: CanvasRenderingContext2D, largura: number, altura: number): void {
  const x = largura * MASTRO.x
  const yTopo = altura * MASTRO.yTopo
  const yBase = altura * (HORIZONTE + 0.16)
  const escala = escalaEm(yBase, altura)
  const largPoste = Math.max(3, altura * 0.008 * escala)

  p.fillStyle = COR_MADEIRA
  p.fillRect(x - largPoste / 2, yTopo, largPoste, yBase - yTopo)
  // As braçadeiras onde as cordas amarram.
  p.fillStyle = '#5A4028'
  for (const fr of [0.06, 0.14]) {
    p.fillRect(x - largPoste, yTopo + (yBase - yTopo) * fr, largPoste * 2, largPoste * 0.7)
  }

  // A FAIXA, pendurada logo abaixo das braçadeiras.
  const largFaixa = largura * 0.13
  const altFaixa = altura * 0.055
  const yFaixa = yTopo + (yBase - yTopo) * 0.22
  p.fillStyle = '#1E5F44'
  p.fillRect(x - largFaixa / 2, yFaixa, largFaixa, altFaixa)
  p.fillStyle = '#E8D9B8'
  p.fillRect(x - largFaixa / 2 + 3, yFaixa + 3, largFaixa - 6, altFaixa - 6)
  p.fillStyle = '#1E5F44'
  // Duas tarjas dentro, no lugar do texto — de longe é isso que uma faixa é.
  p.fillRect(x - largFaixa * 0.36, yFaixa + altFaixa * 0.3, largFaixa * 0.72, altFaixa * 0.13)
  p.fillRect(x - largFaixa * 0.26, yFaixa + altFaixa * 0.56, largFaixa * 0.52, altFaixa * 0.1)
}

/**
 * O PALCO, à direita como na foto.
 *
 * Estrutura de treliça com cobertura escura, boca iluminada e caixas de som
 * nas laterais. É o objeto que diz que a festa tem PROGRAMAÇÃO — praça com
 * barraca e fogueira é feira; com palco é arraial.
 */
function desenharPalco(p: CanvasRenderingContext2D, largura: number, altura: number): void {
  const cx = largura * 0.84
  const yBase = altura * (HORIZONTE + 0.07)
  const larg = largura * 0.19
  const alt = altura * 0.115
  const meia = larg / 2

  // A boca do palco, acesa por trás: é a luz que faz o palco existir à noite.
  p.fillStyle = '#3A2418'
  p.fillRect(cx - meia, yBase - alt, larg, alt)
  const g = p.createLinearGradient(cx, yBase - alt, cx, yBase)
  g.addColorStop(0, 'rgba(255,196,110,0.5)')
  g.addColorStop(1, 'rgba(255,140,60,0.1)')
  p.fillStyle = g
  p.fillRect(cx - meia * 0.86, yBase - alt * 0.86, larg * 0.86, alt * 0.7)

  // A cobertura e os montantes de treliça.
  p.fillStyle = '#16191F'
  p.fillRect(cx - meia * 1.1, yBase - alt * 1.18, larg * 1.1, alt * 0.16)
  for (const lado of [-1, 1]) {
    p.fillRect(cx + lado * meia * 1.02, yBase - alt * 1.18, Math.max(3, largura * 0.006), alt * 1.18)
  }
  // As caixas de som.
  p.fillStyle = '#101318'
  for (const lado of [-1, 1]) {
    p.fillRect(cx + lado * meia * 0.96, yBase - alt * 0.72, largura * 0.016, alt * 0.72)
  }
}

// ── As barracas ─────────────────────────────────────────────────────────

/**
 * Uma barraca: telhado de palha em duas águas, esteios, balcão e frente de
 * chita ESTAMPADA com mercadoria em cima.
 *
 * Chita não é uma cor, é um padrão — e é ele que o olho reconhece antes de
 * qualquer outro detalhe. E é a mercadoria que diz que a barraca está
 * funcionando: barraca vazia num arraial cheio lê como feira depois que fechou.
 */
function desenharBarraca(
  p: CanvasRenderingContext2D,
  cx: number,
  yBase: number,
  escala: number,
  semente: number,
): void {
  const larguraB = 190 * escala
  const alturaCorpo = 78 * escala
  const alturaTelhado = 62 * escala
  const meia = larguraB / 2
  const yBalcao = yBase - alturaCorpo

  // Esteios.
  p.fillStyle = COR_MADEIRA
  for (const lado of [-1, 1]) {
    p.fillRect(cx + lado * meia * 0.92 - 4 * escala, yBalcao - alturaTelhado * 0.5, 8 * escala, alturaCorpo + alturaTelhado * 0.5)
  }

  // A frente de chita.
  p.fillStyle = COR_CHITA_FUNDO
  p.fillRect(cx - meia, yBalcao, larguraB, alturaCorpo)
  const flores = ['#F2C43C', '#F5F1E6', '#2E86C1', '#1E8F5F']
  const passoFlor = 26 * escala
  let k = 0
  for (let fx = cx - meia + passoFlor / 2; fx < cx + meia; fx += passoFlor) {
    for (let fy = yBalcao + passoFlor / 2; fy < yBalcao + alturaCorpo; fy += passoFlor) {
      p.fillStyle = flores[k % flores.length]!
      for (let q = 0; q < 5; q++) {
        const ang = (q * Math.PI * 2) / 5
        p.beginPath()
        p.arc(fx + Math.cos(ang) * 4 * escala, fy + Math.sin(ang) * 4 * escala, 2.6 * escala, 0, Math.PI * 2)
        p.fill()
      }
      p.fillStyle = '#3A1A16'
      p.beginPath()
      p.arc(fx, fy, 2 * escala, 0, Math.PI * 2)
      p.fill()
      k++
    }
  }

  // O balcão, com o tampo saliente.
  p.fillStyle = '#5A3E28'
  p.fillRect(cx - meia * 1.06, yBalcao - 7 * escala, larguraB * 1.06, 8 * escala)

  // A MERCADORIA: milho em pé, potes e bolo — as três coisas que toda barraca
  // de São João tem no balcão.
  const itens = 6
  for (let i = 0; i < itens; i++) {
    const ix = cx - meia * 0.82 + (larguraB * 0.82 * i) / (itens - 1)
    const tipo = (i + semente) % 3
    if (tipo === 0) {
      p.fillStyle = '#E0B23C'
      p.fillRect(ix - 3 * escala, yBalcao - 24 * escala, 6 * escala, 18 * escala)
    } else if (tipo === 1) {
      p.fillStyle = '#8A5A32'
      p.beginPath()
      p.ellipse(ix, yBalcao - 12 * escala, 7 * escala, 6 * escala, 0, 0, Math.PI * 2)
      p.fill()
    } else {
      p.fillStyle = '#C88A4A'
      p.fillRect(ix - 8 * escala, yBalcao - 15 * escala, 16 * escala, 9 * escala)
    }
  }

  // O TELHADO DE PALHA, duas águas, beiral bem saliente.
  const beiral = meia * 0.28
  p.fillStyle = COR_PALHA_TELHADO
  p.beginPath()
  p.moveTo(cx - meia - beiral, yBalcao - 6 * escala)
  p.lineTo(cx, yBalcao - 6 * escala - alturaTelhado)
  p.lineTo(cx + meia + beiral, yBalcao - 6 * escala)
  p.closePath()
  p.fill()
  // Os fios da palha: desiguais de propósito, senão vira listra.
  p.strokeStyle = 'rgba(226,196,132,0.3)'
  p.lineWidth = Math.max(1, escala)
  for (let i = 0; i < 40; i++) {
    const t = ale(semente * 19 + i)
    const px = cx - meia - beiral + (meia + beiral) * 2 * t
    const alturaAqui = alturaTelhado * (1 - Math.abs(px - cx) / (meia + beiral))
    const py = yBalcao - 6 * escala - ale(semente * 23 + i) * alturaAqui
    p.beginPath()
    p.moveTo(px, py)
    p.lineTo(px + 1.5 * escala, py + (4 + ale(semente * 29 + i) * 5) * escala)
    p.stroke()
  }

  // A lâmpada sob o telhado, com halo aditivo — é ela que acende a barraca.
  const yLampada = yBalcao - 6 * escala - alturaTelhado * 0.3
  p.save()
  p.globalCompositeOperation = 'lighter'
  const halo = p.createRadialGradient(cx, yLampada, 0, cx, yLampada, 46 * escala)
  halo.addColorStop(0, 'rgba(255,206,132,0.5)')
  halo.addColorStop(1, 'rgba(255,176,80,0)')
  p.fillStyle = halo
  p.beginPath()
  p.arc(cx, yLampada, 46 * escala, 0, Math.PI * 2)
  p.fill()
  p.restore()
  p.fillStyle = '#FFE6B4'
  p.beginPath()
  p.arc(cx, yLampada, 3.4 * escala, 0, Math.PI * 2)
  p.fill()
}

// ── A quadrilha ─────────────────────────────────────────────────────────

/** Um par dançando. Simples de propósito: a esta distância o que se reconhece
 *  é a SILHUETA — o vestido rodado da dama e o chapéu de palha do cavalheiro. */
function desenharPar(
  p: CanvasRenderingContext2D,
  cx: number,
  yBase: number,
  escala: number,
  corVestido: string,
  corCamisa: string,
): void {
  const h = 54 * escala
  // Dama.
  p.fillStyle = corVestido
  p.beginPath()
  p.moveTo(cx - 9 * escala, yBase)
  p.lineTo(cx - 3 * escala, yBase - h * 0.55)
  p.lineTo(cx + 3 * escala, yBase - h * 0.55)
  p.lineTo(cx + 9 * escala, yBase)
  p.closePath()
  p.fill()
  p.fillRect(cx - 3 * escala, yBase - h * 0.82, 6 * escala, h * 0.28)
  p.fillStyle = '#6A4632'
  p.beginPath()
  p.arc(cx, yBase - h * 0.9, 4 * escala, 0, Math.PI * 2)
  p.fill()
  // Cavalheiro, ao lado.
  const gx = cx + 15 * escala
  p.fillStyle = '#2E3A52'
  p.fillRect(gx - 4 * escala, yBase - h * 0.5, 8 * escala, h * 0.5)
  p.fillStyle = corCamisa
  p.fillRect(gx - 4.5 * escala, yBase - h * 0.82, 9 * escala, h * 0.34)
  p.fillStyle = '#7A5238'
  p.beginPath()
  p.arc(gx, yBase - h * 0.9, 4 * escala, 0, Math.PI * 2)
  p.fill()
  // O chapéu de palha, que é o que o identifica de longe.
  p.fillStyle = '#C4A05C'
  p.beginPath()
  p.ellipse(gx, yBase - h * 0.96, 8 * escala, 2.4 * escala, 0, 0, Math.PI * 2)
  p.fill()
  p.fillRect(gx - 3.4 * escala, yBase - h * 1.05, 6.8 * escala, 5 * escala)
}

// ── A cena assada ───────────────────────────────────────────────────────

/**
 * Assa a praça inteira num sprite: céu, casario, chão, tapetes, palha,
 * barracas (em dois planos de profundidade) e a quadrilha.
 *
 * A ordem é a da profundidade — o que está longe primeiro, o que está perto por
 * último. É essa ordem, mais a escala por altura, que faz a cena ter fundo,
 * meio e frente em vez de tudo no mesmo plano.
 */
export function rasterizarCenario(
  largura: number,
  altura: number,
  dpr: number,
): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null
  if (largura <= 0 || altura <= 0) return null
  const tela = document.createElement('canvas')
  tela.width = Math.max(1, Math.ceil(largura * dpr))
  tela.height = Math.max(1, Math.ceil(altura * dpr))
  const p = tela.getContext('2d')
  if (!p) return null
  p.scale(dpr, dpr)

  desenharCeu(p, largura, altura)
  desenharMorros(p, largura, altura)
  desenharCasario(p, largura, altura)
  desenharPalco(p, largura, altura)
  desenharChao(p, largura, altura)
  desenharTapetes(p, largura, altura)
  // As poças DEPOIS dos tapetes: a luz cai sobre o que está pintado no chão,
  // nunca por baixo dele.
  desenharPocasDeLuz(p, largura, altura)
  desenharPalha(p, largura, altura)

  // BARRACAS EM DOIS PLANOS. As de trás emolduram a praça; as da frente são
  // grandes e CORTADAS pela borda do quadro. É o corte que faz a praça
  // continuar para fora da tela em vez de terminar nela, e é o contraste de
  // tamanho entre os dois planos que cria a profundidade.
  // O mastro fica atrás das barracas e à frente do casario: é o que dá a ele
  // a profundidade de "no meio da praça" em vez de "colado no fundo".
  desenharMastro(p, largura, altura)
  desenharBarraca(p, largura * 0.16, altura * 0.7, (altura / 620) * 0.6, 1)
  desenharBarraca(p, largura * 0.86, altura * 0.72, (altura / 620) * 0.64, 2)

  // A quadrilha, entre os dois planos de barraca.
  desenharPar(p, largura * 0.42, altura * 0.72, escalaEm(altura * 0.72, altura) * 0.8, '#D8434A', '#F2E2C4')
  desenharPar(p, largura * 0.63, altura * 0.7, escalaEm(altura * 0.7, altura) * 0.75, '#2E86C1', '#E8C05A')
  desenharPar(p, largura * 0.52, altura * 0.78, escalaEm(altura * 0.78, altura) * 0.85, '#E8A030', '#F2E2C4')

  // As barracas da FRENTE, cortadas pelas bordas.
  desenharBarraca(p, -largura * 0.04, altura * 1.02, (altura / 620) * 1.15, 3)
  desenharBarraca(p, largura * 1.05, altura * 1.04, (altura / 620) * 1.2, 4)

  // A VINHETA entra AQUI, assada junto, e não como um terceiro
  // preenchimento de tela cheia por quadro. Ela é estática como todo o
  // resto desta cena; deixá-la no laço de animação era pagar 60 vezes por
  // segundo por um desenho que nunca muda.
  const meio = Math.max(largura, altura) * 0.72
  const v = p.createRadialGradient(largura * 0.5, altura * 0.46, meio * 0.32, largura * 0.5, altura * 0.46, meio)
  v.addColorStop(0, 'rgba(8,9,12,0)')
  v.addColorStop(1, 'rgba(8,9,12,0.62)')
  p.fillStyle = v
  p.fillRect(0, 0, largura, altura)

  return tela
}
