/**
 * A BARRACA DE ARRAIAL — desenhada a partir da foto, não de memória.
 *
 * A referência é `public/Gemini_Generated_Image_uj3ylfuj3ylfuj3y.jpg`, e a
 * lição que este projeto inteiro já pagou caro é que arte tirada da memória
 * erra a FORMA, não o acabamento. Então vale registrar o que a foto tem e o
 * que a memória inventaria no lugar:
 *
 * - O telhado é uma ÁGUA DUPLA com BEIRAL FUNDO — o beiral avança tanto que a
 *   sombra dele é metade da leitura do objeto. A memória desenha o telhado
 *   rente aos esteios e a barraca vira caixa com tampa.
 * - A cobertura é CHITA ESTAMPADA em quase todas as barracas, e PALHA em
 *   algumas. Não é telha, não é lona lisa. Aqui as duas existem, sorteadas
 *   pela semente, porque a praça da foto tem as duas.
 * - Sob o beiral corre uma fieira de BANDEIRINHAS presa na própria barraca —
 *   e bandeirinha de São João não é triângulo, é retângulo com um V recortado
 *   embaixo. Esse recorte é o que o olho reconhece.
 * - O balcão é uma CAIXA com tampo visível, não uma linha. E logo abaixo do
 *   tampo pende uma FRANJA DE PALHA, a saia dourada que aparece em todas as
 *   barracas da foto sem exceção. É o detalhe mais característico e o que
 *   estava faltando.
 * - Abaixo da franja, a frente é CHITA — e chita não é uma cor, é um campo
 *   denso de flores grandes. Flor pequena e espaçada lê como bolinha.
 * - O tampo está CARREGADO: milho na palha, pamonha amarrada, pão em cesto,
 *   potes, canecas de quentão. Barraca vazia lê como feira depois que fechou.
 * - Pendurada na frente do telhado, uma PLACA pintada. Aqui ela nunca tem
 *   letra: texto em canvas é invisível para leitor de tela, e a regra desta
 *   página é que informação mora no DOM. A placa é um quadro pintado.
 * - Na base, FARDO DE PALHA e palha solta, que é o que apoia a barraca no chão
 *   em vez de deixá-la flutuando sobre a linha do piso.
 *
 * E É NOITE. A foto é de dia; esta cena não. Então toda a paleta aqui já está
 * escrita em tom noturno, e quem devolve cor é a LÂMPADA da própria barraca:
 * um halo aditivo grande que reacende o que está perto dele e deixa esfriar o
 * que está longe. É a lâmpada que faz a barraca existir na cena — sem ela
 * sobra uma silhueta escura.
 *
 * TUDO ESCALA. A mesma função desenha a barraca do fundo (escala ~0,6) e a da
 * frente cortada pela borda (escala ~1,2+). Por isso as CONTAGENS são fixas e
 * o que varia é o espaçamento: é o mesmo objeto, maior ou menor, não um objeto
 * mais detalhado. Os detalhes que viram poeira abaixo de um pixel ficam atrás
 * de um portão de escala em vez de sujar o desenho.
 *
 * DETERMINÍSTICO. Nada de `Math.random` nem `Date.now`: a cena é assada uma vez
 * e duas assadas precisam dar exatamente os mesmos pixels.
 */

// ── Paleta noturna ──────────────────────────────────────────────────────

/** Chita é um campo de flores grandes sobre fundo saturado. Estes tons já
 *  nascem escurecidos e levemente puxados para o azul — é assim que a cor se
 *  comporta longe de uma fonte quente. A lâmpada devolve o calor depois. */
type PaletaChita = {
  readonly fundo: string
  readonly flores: readonly string[]
  readonly folha: string
  readonly miolo: string
}

const CHITAS: readonly PaletaChita[] = [
  { fundo: '#7A2823', flores: ['#D8B052', '#DCD2B8', '#4A7E9E'], folha: '#3A6642', miolo: '#F0DCA8' },
  { fundo: '#25507A', flores: ['#C8534C', '#DCD2B8', '#D2A444'], folha: '#3A6642', miolo: '#F0DCA8' },
  { fundo: '#2C5A3C', flores: ['#D2963A', '#C8534C', '#DCD2B8'], folha: '#6E6030', miolo: '#F0DCA8' },
  { fundo: '#7E6220', flores: ['#B8433F', '#DCD2B8', '#3A6642'], folha: '#46622F', miolo: '#F0DCA8' },
]

const MADEIRA = '#3A2A1C'
const MADEIRA_LUZ = '#6A4C30'
const MADEIRA_SOMBRA = '#241810'
const PALHA_BASE = '#63512D'
const PALHA_LUZ = '#A0854A'
const PALHA_ESCURA = '#463820'

/** As cores das bandeirinhas, na ordem em que a foto as pendura. */
const CORES_BANDEIROLA = ['#C8534C', '#D2A444', '#3A7E52', '#4A7E9E', '#B8663A'] as const

// ── Aleatoriedade determinística ────────────────────────────────────────

/**
 * Ruído determinístico em [0,1).
 *
 * O multiplicador alto é de propósito: com um fator pequeno, sementes vizinhas
 * (1, 2, 3, 4 — que é exatamente como a cena numera as barracas) caem perto uma
 * da outra no seno e as barracas saem irmãs gêmeas. Espalhar antes de dobrar é
 * o que faz a variação por semente valer alguma coisa.
 */
function ale(semente: number): number {
  const x = Math.sin(semente * 127.1 + 311.7) * 43758.5453123
  return x - Math.floor(x)
}

/** Um valor por índice dentro de uma mesma barraca, sem colidir entre famílias
 *  de detalhe (palha, flor, bandeirinha) graças ao deslocamento `familia`. */
function aleN(semente: number, familia: number, i: number): number {
  return ale(semente * 7.31 + familia * 91.7 + i * 1.13)
}

// ── Tecido de chita ─────────────────────────────────────────────────────

/**
 * Um retalho de chita: fundo saturado e flores grandes em malha ALTERNADA.
 *
 * A malha alternada (linha ímpar deslocada meio passo) é o que impede o padrão
 * de ler como grade. E o tamanho da flor acompanha a escala, não o retalho:
 * a estampa é a mesma em qualquer barraca, o que muda é quantas flores cabem.
 */
function desenharChita(
  p: CanvasRenderingContext2D,
  x: number,
  y: number,
  larg: number,
  alt: number,
  paleta: PaletaChita,
  escala: number,
  semente: number,
): void {
  if (larg <= 0 || alt <= 0) return
  p.save()
  p.beginPath()
  p.rect(x, y, larg, alt)
  p.clip()
  p.fillStyle = paleta.fundo
  p.fillRect(x, y, larg, alt)

  const passo = 22 * escala
  const fino = escala > 0.8 // folhas e pontinhos só existem acima de ~1px
  let n = 0
  let linha = 0
  for (let fy = y - passo * 0.35; fy < y + alt + passo; fy += passo * 0.92, linha++) {
    const recuo = linha % 2 === 1 ? passo * 0.5 : 0
    for (let fx = x - passo * 0.5 + recuo; fx < x + larg + passo; fx += passo, n++) {
      const raio = (5.0 + aleN(semente, 1, n) * 2.4) * escala
      const giro = aleN(semente, 2, n) * Math.PI

      if (fino) {
        // Duas folhas saindo por baixo da flor. Chita sem verde vira bolinha
        // colorida; é a folha que faz o padrão ler como floral.
        p.fillStyle = paleta.folha
        for (const s of [-1, 1]) {
          p.beginPath()
          p.ellipse(fx + s * raio * 1.05, fy + raio * 0.5, raio * 0.62, raio * 0.3, s * 0.6, 0, Math.PI * 2)
          p.fill()
        }
      }

      // Seis pétalas em roda. Elipse girada para o próprio ângulo, senão as
      // pétalas apontam todas para o mesmo lado e a flor vira uma margarida
      // torta.
      p.fillStyle = paleta.flores[n % paleta.flores.length]!
      for (let q = 0; q < 6; q++) {
        const ang = giro + (q * Math.PI * 2) / 6
        p.beginPath()
        p.ellipse(
          fx + Math.cos(ang) * raio * 0.6,
          fy + Math.sin(ang) * raio * 0.6,
          raio * 0.5,
          raio * 0.36,
          ang,
          0,
          Math.PI * 2,
        )
        p.fill()
      }
      p.fillStyle = paleta.miolo
      p.beginPath()
      p.arc(fx, fy, raio * 0.32, 0, Math.PI * 2)
      p.fill()

      if (fino) {
        // Os pontinhos de preenchimento entre as flores. É esse ruído miúdo
        // que dá à chita a densidade de tecido em vez de papel de parede.
        p.fillStyle = paleta.miolo
        p.globalAlpha = 0.5
        p.beginPath()
        p.arc(fx + passo * 0.5, fy + passo * 0.44, raio * 0.13, 0, Math.PI * 2)
        p.fill()
        p.globalAlpha = 1
      }
    }
  }
  p.restore()
}

// ── Palha ───────────────────────────────────────────────────────────────

/**
 * A franja de palha que pende sob o tampo do balcão — a saia dourada.
 *
 * Fios de comprimentos desiguais: cortados na mesma altura viram uma listra, e
 * é justamente a barra irregular que o olho lê como palha.
 */
function desenharFranjaPalha(
  p: CanvasRenderingContext2D,
  x: number,
  y: number,
  larg: number,
  altura: number,
  escala: number,
  semente: number,
  familia: number,
): void {
  if (larg <= 0) return
  // A cinta de cima, onde a palha está amarrada: sem ela os fios nascem no ar.
  p.fillStyle = PALHA_ESCURA
  p.fillRect(x, y, larg, altura * 0.3)

  const passo = Math.max(1.1, 2.1 * escala)
  const largFio = Math.max(0.9, passo * 0.86)
  let i = 0
  for (let sx = x; sx < x + larg; sx += passo, i++) {
    const t = aleN(semente, familia, i)
    const h = altura * (0.5 + t * 0.5)
    const claro = (i + Math.floor(t * 3)) % 3
    p.fillStyle = claro === 0 ? PALHA_LUZ : claro === 1 ? PALHA_BASE : PALHA_ESCURA
    p.fillRect(sx, y, largFio, h)
    // A ponta seca, mais escura que o fio: dá volume à barra da franja.
    p.fillStyle = 'rgba(30,22,12,0.45)'
    p.fillRect(sx, y + h * 0.74, largFio, h * 0.26)
  }
}

/** Um fardo de palha, dos que ficam encostados na base da barraca. Retângulo
 *  de cantos moles, amarrado por dois barbantes, com os fios prensados
 *  aparecendo — é o fio à vista que diz que é palha e não caixote. */
function desenharFardoPalha(
  p: CanvasRenderingContext2D,
  x: number,
  yBase: number,
  larg: number,
  alt: number,
  escala: number,
  semente: number,
): void {
  const r = Math.min(alt * 0.28, larg * 0.14)
  p.fillStyle = PALHA_BASE
  p.beginPath()
  p.roundRect(x, yBase - alt, larg, alt, r)
  p.fill()

  // Os fios prensados, quase horizontais.
  p.save()
  p.beginPath()
  p.roundRect(x, yBase - alt, larg, alt, r)
  p.clip()
  p.strokeStyle = 'rgba(196,166,102,0.4)'
  p.lineWidth = Math.max(0.7, 0.9 * escala)
  for (let i = 0; i < 14; i++) {
    const t = aleN(semente, 5, i)
    const fy = yBase - alt + alt * t
    p.beginPath()
    p.moveTo(x - larg * 0.05, fy)
    p.lineTo(x + larg * 1.05, fy + (aleN(semente, 6, i) - 0.5) * alt * 0.18)
    p.stroke()
  }
  p.restore()

  // Os dois barbantes da amarração.
  p.strokeStyle = 'rgba(24,18,10,0.55)'
  p.lineWidth = Math.max(0.8, 1.1 * escala)
  for (const f of [0.3, 0.7]) {
    p.beginPath()
    p.moveTo(x + larg * f, yBase - alt)
    p.lineTo(x + larg * f, yBase)
    p.stroke()
  }
  // A sombra de contato: sem ela o fardo paira.
  p.fillStyle = 'rgba(10,8,6,0.4)'
  p.beginPath()
  p.ellipse(x + larg * 0.5, yBase, larg * 0.56, alt * 0.16, 0, 0, Math.PI * 2)
  p.fill()
}

// ── Estrutura de madeira ────────────────────────────────────────────────

/**
 * Um esteio: madeira roliça com aresta iluminada de um lado e sombra do outro.
 *
 * O `lado` é para onde está a lâmpada. Um retângulo de cor chapada lê como
 * barra de metal; são as duas arestas que fazem o pau ficar redondo.
 */
function desenharEsteio(
  p: CanvasRenderingContext2D,
  x: number,
  yTopo: number,
  yPe: number,
  larg: number,
  lado: number,
): void {
  p.fillStyle = MADEIRA
  p.fillRect(x - larg / 2, yTopo, larg, yPe - yTopo)
  p.fillStyle = MADEIRA_LUZ
  p.fillRect(x + (lado > 0 ? larg * 0.12 : -larg / 2), yTopo, larg * 0.38, yPe - yTopo)
  p.fillStyle = MADEIRA_SOMBRA
  p.fillRect(x + (lado > 0 ? -larg / 2 : larg * 0.24), yTopo, larg * 0.26, yPe - yTopo)
}

/** A mão-francesa: o pedaço de madeira em diagonal que trava o esteio no
 *  beiral. É a marcenaria aparente — barraca de arraial é pregada à vista, e
 *  esse triângulo é o que separa "estrutura montada" de "poste enfiado". */
function desenharMaoFrancesa(
  p: CanvasRenderingContext2D,
  x: number,
  yBeiral: number,
  escala: number,
  lado: number,
): void {
  const braco = 13 * escala
  p.fillStyle = MADEIRA_SOMBRA
  p.beginPath()
  p.moveTo(x, yBeiral)
  p.lineTo(x + lado * braco, yBeiral)
  p.lineTo(x, yBeiral + braco)
  p.closePath()
  p.fill()
  p.strokeStyle = MADEIRA_LUZ
  p.lineWidth = Math.max(0.7, 1 * escala)
  p.beginPath()
  p.moveTo(x + lado * braco, yBeiral)
  p.lineTo(x, yBeiral + braco)
  p.stroke()
}

// ── Telhado ─────────────────────────────────────────────────────────────

/**
 * A cobertura de PALHA: fieiras sobrepostas, barra rasgada e fios curtos.
 *
 * O que faz palha ler como palha é a BARRA DE BAIXO de cada fieira ser
 * irregular — o colmo é amarrado em feixes e cada feixe termina onde termina.
 * Barra reta vira telha de fibrocimento.
 */
function cobrirComPalha(
  p: CanvasRenderingContext2D,
  cx: number,
  meiaCume: number,
  meiaBeiral: number,
  yCume: number,
  yBeiral: number,
  escala: number,
  semente: number,
): void {
  p.save()
  p.beginPath()
  p.moveTo(cx - meiaCume, yCume)
  p.lineTo(cx + meiaCume, yCume)
  p.lineTo(cx + meiaBeiral, yBeiral)
  p.lineTo(cx - meiaBeiral, yBeiral)
  p.closePath()
  p.clip()

  p.fillStyle = PALHA_BASE
  p.fillRect(cx - meiaBeiral, yCume, meiaBeiral * 2, yBeiral - yCume)

  // Cinco fieiras, do cume para o beiral. Contagem fixa: é o mesmo telhado.
  const fieiras = 5
  const alturaTotal = yBeiral - yCume
  for (let f = 0; f < fieiras; f++) {
    const t = (f + 1) / fieiras
    const yFieira = yCume + alturaTotal * t
    const meiaAqui = meiaCume + (meiaBeiral - meiaCume) * t
    p.fillStyle = f % 2 === 0 ? 'rgba(150,124,70,0.34)' : 'rgba(58,46,26,0.34)'
    p.beginPath()
    p.moveTo(cx - meiaAqui * 1.1, yCume)
    // A barra rasgada: dentes de tamanhos diferentes ao longo da fieira.
    const dentes = 26
    for (let d = 0; d <= dentes; d++) {
      const dx = cx - meiaAqui * 1.1 + meiaAqui * 2.2 * (d / dentes)
      const dy = yFieira + (aleN(semente, 10 + f, d) - 0.4) * alturaTotal * 0.09
      p.lineTo(dx, dy)
    }
    p.lineTo(cx + meiaAqui * 1.1, yCume)
    p.closePath()
    p.fill()
  }

  // Os fios soltos, na direção da água. Sem eles a fieira vira faixa lisa.
  if (escala > 0.55) {
    p.strokeStyle = 'rgba(214,184,116,0.3)'
    p.lineWidth = Math.max(0.7, 0.9 * escala)
    for (let i = 0; i < 110; i++) {
      const tx = aleN(semente, 16, i)
      const ty = aleN(semente, 17, i)
      const px = cx - meiaBeiral + meiaBeiral * 2 * tx
      const py = yCume + alturaTotal * ty
      p.beginPath()
      p.moveTo(px, py)
      p.lineTo(px + (tx - 0.5) * 5 * escala, py + (3 + ty * 5) * escala)
      p.stroke()
    }
  }
  p.restore()
}

/**
 * O telhado inteiro: água de trás espiando por cima do cume, água da frente
 * (chita ou palha), cumeeira, e a barra do beiral.
 *
 * O BEIRAL FUNDO é o ponto. A largura do beiral é 1,3× a meia-largura do
 * balcão: o telhado avança muito além dos esteios, e essa saliência é o que
 * transforma quatro paus e um pano numa barraca.
 */
function desenharTelhado(
  p: CanvasRenderingContext2D,
  cx: number,
  yBeiral: number,
  meia: number,
  alturaTelhado: number,
  escala: number,
  semente: number,
  desvio: number,
  recuo: number,
  paleta: PaletaChita,
  dePalha: boolean,
): void {
  const meiaBeiral = meia * 1.3
  const meiaCume = meia * 0.9
  const yCume = yBeiral - alturaTelhado

  // A água DE TRÁS, deslocada e mais alta: um filete acima do cume. É pouco
  // pixel e é o que impede o telhado de ler como um pano chapado colado no ar.
  p.beginPath()
  p.moveTo(cx - meiaCume, yCume)
  p.lineTo(cx + meiaCume, yCume)
  p.lineTo(cx + meiaBeiral + desvio, yCume - recuo)
  p.lineTo(cx - meiaBeiral + desvio, yCume - recuo)
  p.closePath()
  p.fillStyle = dePalha ? PALHA_ESCURA : paleta.fundo
  p.fill()
  p.fillStyle = 'rgba(10,12,22,0.55)'
  p.fill()

  // A água da frente.
  if (dePalha) {
    cobrirComPalha(p, cx, meiaCume, meiaBeiral, yCume, yBeiral, escala, semente)
  } else {
    p.save()
    p.beginPath()
    p.moveTo(cx - meiaCume, yCume)
    p.lineTo(cx + meiaCume, yCume)
    p.lineTo(cx + meiaBeiral, yBeiral)
    p.lineTo(cx - meiaBeiral, yBeiral)
    p.closePath()
    p.clip()
    desenharChita(p, cx - meiaBeiral, yCume, meiaBeiral * 2, yBeiral - yCume, paleta, escala, semente + 3)
    p.restore()
  }

  // É NOITE E A LUZ VEM DE BAIXO. A face superior do telhado só pega céu, então
  // ela escurece do cume para o beiral — e a lâmpada, mais adiante, devolve
  // calor só na borda de baixo. Sem esta camada a barraca lê como cena diurna
  // com um halo colado por cima.
  p.save()
  p.beginPath()
  p.moveTo(cx - meiaCume, yCume)
  p.lineTo(cx + meiaCume, yCume)
  p.lineTo(cx + meiaBeiral, yBeiral)
  p.lineTo(cx - meiaBeiral, yBeiral)
  p.closePath()
  const sombra = p.createLinearGradient(0, yCume, 0, yBeiral)
  sombra.addColorStop(0, 'rgba(12,16,30,0.66)')
  sombra.addColorStop(1, 'rgba(12,16,30,0.3)')
  p.fillStyle = sombra
  p.fill()
  p.restore()

  // A cumeeira: a dobra do pano (ou o feixe amarrado, na palha) sobre o topo.
  p.fillStyle = dePalha ? 'rgba(120,98,54,0.8)' : 'rgba(240,220,180,0.22)'
  p.fillRect(cx - meiaCume, yCume - 1.6 * escala, meiaCume * 2, Math.max(1, 3 * escala))

  // A BARRA DO BEIRAL. Na chita é um debrum claro com a onda do pano solto; na
  // palha é a franja rasgada. Nos dois casos é a borda que pende, e é ela que
  // dá peso ao beiral.
  if (dePalha) {
    desenharFranjaPalha(p, cx - meiaBeiral, yBeiral, meiaBeiral * 2, 9 * escala, escala, semente, 20)
  } else {
    p.fillStyle = 'rgba(236,220,180,0.5)'
    p.beginPath()
    p.moveTo(cx - meiaBeiral, yBeiral)
    const ondas = 18
    for (let i = 0; i <= ondas; i++) {
      const t = i / ondas
      const ox = cx - meiaBeiral + meiaBeiral * 2 * t
      p.lineTo(ox, yBeiral + (2.4 + Math.sin(t * Math.PI * ondas * 0.5) * 1.6 + aleN(semente, 21, i) * 1.4) * escala)
    }
    p.lineTo(cx + meiaBeiral, yBeiral)
    p.closePath()
    p.fill()
  }

  // O VÃO SOB O BEIRAL: a face de baixo do telhado, virada para a lâmpada.
  // Escura agora, quente depois do banho aditivo — é a superfície que mais
  // denuncia que existe uma luz acesa dentro da barraca.
  p.fillStyle = 'rgba(16,12,10,0.6)'
  p.fillRect(cx - meiaBeiral, yBeiral + 3 * escala, meiaBeiral * 2, 4 * escala)
}

// ── Bandeirinhas e placa ────────────────────────────────────────────────

/**
 * A fieira de bandeirinhas presa na própria barraca, pendurada do beiral.
 *
 * Bandeirinha de São João é RETÂNGULO COM V RECORTADO na barra — o recorte é a
 * forma que se reconhece. Triângulo é bandeirola de festa genérica, e foi o
 * erro das versões anteriores desta cena.
 */
function desenharBandeirinhas(
  p: CanvasRenderingContext2D,
  cx: number,
  yBeiral: number,
  meia: number,
  escala: number,
  semente: number,
): void {
  const x0 = cx - meia * 0.98
  const x1 = cx + meia * 0.98
  const quantas = 9
  const barriga = 5 * escala // a corda cede no meio
  const largB = ((x1 - x0) / quantas) * 0.78
  const altB = 12 * escala
  const yCorda = yBeiral + 5 * escala

  // A corda.
  p.strokeStyle = 'rgba(40,30,20,0.8)'
  p.lineWidth = Math.max(0.7, 1 * escala)
  p.beginPath()
  p.moveTo(x0, yCorda)
  p.quadraticCurveTo(cx, yCorda + barriga * 2, x1, yCorda)
  p.stroke()

  const giro = Math.floor(ale(semente) * 5)
  for (let i = 0; i < quantas; i++) {
    const t = (i + 0.5) / quantas
    const bx = x0 + (x1 - x0) * t
    const by = yCorda + Math.sin(t * Math.PI) * barriga
    p.fillStyle = CORES_BANDEIROLA[(i + giro) % CORES_BANDEIROLA.length]!
    p.beginPath()
    p.moveTo(bx - largB / 2, by)
    p.lineTo(bx + largB / 2, by)
    p.lineTo(bx + largB / 2, by + altB * 0.62)
    p.lineTo(bx, by + altB * 0.32) // o V recortado
    p.lineTo(bx - largB / 2, by + altB * 0.62)
    p.closePath()
    p.fill()
    // Sombra na metade de baixo: pano pendurado não é cor chapada.
    p.fillStyle = 'rgba(12,10,16,0.28)'
    p.beginPath()
    p.moveTo(bx - largB / 2, by + altB * 0.3)
    p.lineTo(bx + largB / 2, by + altB * 0.3)
    p.lineTo(bx + largB / 2, by + altB * 0.62)
    p.lineTo(bx, by + altB * 0.32)
    p.lineTo(bx - largB / 2, by + altB * 0.62)
    p.closePath()
    p.fill()
  }
}

/**
 * A PLACA pendurada na frente do telhado, presa por dois cordões.
 *
 * NUNCA TEM LETRA. Texto desenhado em canvas é invisível para leitor de tela e
 * a regra desta página é que informação mora no DOM — então a placa é o que
 * uma placa de arraial de fato é antes de ser escrita: uma tábua pintada, com
 * moldura e um brasão. O brasão sorteado pela semente (espiga, flor, panela)
 * é o que diferencia uma barraca da vizinha à distância.
 */
function desenharPlaca(
  p: CanvasRenderingContext2D,
  cx: number,
  yBeiral: number,
  meia: number,
  escala: number,
  semente: number,
): void {
  const larg = meia * 0.86
  const alt = 24 * escala
  // A placa PENDE À FRENTE do beiral, montada a cavalo sobre ele: metade sobre
  // o telhado, metade no vão. É assim que a foto pendura, e é o que dá à placa
  // a profundidade de estar na frente em vez de pintada no pano.
  const y = yBeiral - 15 * escala
  const x = cx - larg / 2

  // Os cordões, saindo de dentro do telhado.
  p.strokeStyle = 'rgba(40,30,20,0.85)'
  p.lineWidth = Math.max(0.7, 1 * escala)
  for (const f of [0.22, 0.78]) {
    p.beginPath()
    p.moveTo(x + larg * f, y - 8 * escala)
    p.lineTo(x + larg * f, y)
    p.stroke()
  }

  // A moldura de madeira e o campo pintado.
  p.fillStyle = '#4E3620'
  p.fillRect(x, y, larg, alt)
  p.fillStyle = '#C8B489'
  p.fillRect(x + 2.4 * escala, y + 2.4 * escala, larg - 4.8 * escala, alt - 4.8 * escala)
  // A tábua vista de baixo pega menos luz na metade inferior.
  p.fillStyle = 'rgba(30,20,12,0.2)'
  p.fillRect(x + 2.4 * escala, y + alt * 0.55, larg - 4.8 * escala, alt * 0.45 - 2.4 * escala)

  if (escala < 0.5) return // abaixo disso o brasão vira sujeira: fica só a tábua

  const bx = cx
  const by = y + alt * 0.5
  const r = alt * 0.28
  const brasao = Math.floor(ale(semente * 3.9) * 3)
  if (brasao === 0) {
    // Espiga de milho.
    p.fillStyle = '#C8963A'
    p.beginPath()
    p.ellipse(bx, by, r * 0.45, r, 0.25, 0, Math.PI * 2)
    p.fill()
    p.fillStyle = '#4A6B34'
    for (const s of [-1, 1]) {
      p.beginPath()
      p.ellipse(bx + s * r * 0.55, by + r * 0.15, r * 0.24, r * 0.8, s * 0.5, 0, Math.PI * 2)
      p.fill()
    }
  } else if (brasao === 1) {
    // Flor de chita, o mesmo motivo do pano.
    p.fillStyle = '#B8433F'
    for (let q = 0; q < 6; q++) {
      const ang = (q * Math.PI * 2) / 6
      p.beginPath()
      p.ellipse(bx + Math.cos(ang) * r * 0.55, by + Math.sin(ang) * r * 0.55, r * 0.45, r * 0.32, ang, 0, Math.PI * 2)
      p.fill()
    }
    p.fillStyle = '#D2A444'
    p.beginPath()
    p.arc(bx, by, r * 0.3, 0, Math.PI * 2)
    p.fill()
  } else {
    // Panela de quentão, com a asa e a tampa.
    p.fillStyle = '#7A3A2E'
    p.beginPath()
    p.ellipse(bx, by + r * 0.2, r * 0.8, r * 0.62, 0, 0, Math.PI)
    p.fill()
    p.fillRect(bx - r * 0.8, by - r * 0.2, r * 1.6, r * 0.42)
    p.fillStyle = '#4E3620'
    p.fillRect(bx - r * 0.5, by - r * 0.5, r, r * 0.28)
    p.strokeStyle = '#7A3A2E'
    p.lineWidth = Math.max(0.7, 1.2 * escala)
    p.beginPath()
    p.arc(bx, by - r * 0.2, r * 0.98, Math.PI, Math.PI * 2)
    p.stroke()
  }
}

// ── A mercadoria ────────────────────────────────────────────────────────

/**
 * O cardápio do balcão. Cada item é um objeto RECONHECÍVEL PELA SILHUETA — a
 * escala 0,6 nenhum deles tem textura, só contorno, e é o contorno que precisa
 * dizer "milho" ou "pamonha". Todos se apoiam em `yApoio`, que é o meio do
 * tampo, e nenhum passa de ~24·escala de altura para não bater na placa.
 */

/** Espigas na palha, deitadas e sobrepostas — como a foto empilha na tábua. */
function porMilho(p: CanvasRenderingContext2D, x: number, y: number, escala: number, semente: number): void {
  for (let i = 0; i < 6; i++) {
    const t = aleN(semente, 30, i)
    const ex = x + (i % 3) * 9 * escala - 9 * escala + (t - 0.5) * 3 * escala
    const ey = y - Math.floor(i / 3) * 7 * escala - 4 * escala
    const giro = -0.3 + t * 0.5
    // A palha aberta na base, verde-acinzentada de noite.
    p.fillStyle = '#4E6438'
    p.beginPath()
    p.ellipse(ex - 7 * escala * Math.cos(giro), ey + 7 * escala * Math.sin(giro), 6 * escala, 3.4 * escala, giro, 0, Math.PI * 2)
    p.fill()
    // O sabugo.
    p.fillStyle = '#C8A03C'
    p.beginPath()
    p.ellipse(ex, ey, 8.4 * escala, 3.6 * escala, giro, 0, Math.PI * 2)
    p.fill()
    // A aresta de cima, virada para a lâmpada.
    p.fillStyle = '#E8C468'
    p.beginPath()
    p.ellipse(ex, ey - 1 * escala, 7.4 * escala, 1.9 * escala, giro, 0, Math.PI * 2)
    p.fill()
    if (escala > 0.85) {
      // Os grãos: fileiras curtas atravessando a espiga.
      p.strokeStyle = 'rgba(90,64,20,0.5)'
      p.lineWidth = Math.max(0.6, 0.7 * escala)
      const cosG = Math.cos(giro)
      const senG = Math.sin(giro)
      for (let g = -3; g <= 3; g++) {
        const mx = ex + g * 2.2 * escala * cosG
        const my = ey + g * 2.2 * escala * senG
        p.beginPath()
        p.moveTo(mx + 2.4 * escala * senG, my - 2.4 * escala * cosG)
        p.lineTo(mx - 2.4 * escala * senG, my + 2.4 * escala * cosG)
        p.stroke()
      }
    }
  }
}

/** Pamonhas na tábua: trouxinhas amarradas em cruz. É o barbante cruzado que
 *  distingue pamonha de um tijolo amarelo. */
function porPamonha(p: CanvasRenderingContext2D, x: number, y: number, escala: number, semente: number): void {
  p.fillStyle = '#4A3520'
  p.fillRect(x - 17 * escala, y - 2 * escala, 34 * escala, 3 * escala)
  for (let i = 0; i < 4; i++) {
    const col = i % 2
    const lin = Math.floor(i / 2)
    const px = x - 8 * escala + col * 16 * escala + aleN(semente, 31, i) * 2 * escala
    const py = y - 3 * escala - lin * 7 * escala
    p.fillStyle = '#C4BC5C'
    p.beginPath()
    p.roundRect(px - 8 * escala, py - 7 * escala, 16 * escala, 8 * escala, 2.4 * escala)
    p.fill()
    p.fillStyle = '#DCD474'
    p.beginPath()
    p.roundRect(px - 7.4 * escala, py - 7 * escala, 14.8 * escala, 3 * escala, 2 * escala)
    p.fill()
    if (escala > 0.6) {
      p.strokeStyle = 'rgba(70,60,26,0.7)'
      p.lineWidth = Math.max(0.6, 0.8 * escala)
      p.beginPath()
      p.moveTo(px - 3 * escala, py - 7 * escala)
      p.lineTo(px - 3 * escala, py + 1 * escala)
      p.moveTo(px + 3 * escala, py - 7 * escala)
      p.lineTo(px + 3 * escala, py + 1 * escala)
      p.moveTo(px - 8 * escala, py - 3.4 * escala)
      p.lineTo(px + 8 * escala, py - 3.4 * escala)
      p.stroke()
    }
  }
}

/** Pães e bolinhos amontoados num cesto raso de palha trançada. */
function porPaes(p: CanvasRenderingContext2D, x: number, y: number, escala: number, semente: number): void {
  // O cesto: elipse de palha com aro escuro.
  p.fillStyle = PALHA_BASE
  p.beginPath()
  p.ellipse(x, y - 2 * escala, 17 * escala, 5.4 * escala, 0, 0, Math.PI * 2)
  p.fill()
  p.strokeStyle = PALHA_ESCURA
  p.lineWidth = Math.max(0.7, 1.2 * escala)
  p.beginPath()
  p.ellipse(x, y - 2 * escala, 17 * escala, 5.4 * escala, 0, 0, Math.PI * 2)
  p.stroke()
  // O monte. A ordem do laço já empilha os de trás primeiro, senão fica plano.
  for (let i = 0; i < 9; i++) {
    const t = aleN(semente, 32, i)
    const u = aleN(semente, 33, i)
    const px = x + (t - 0.5) * 28 * escala
    const py = y - 4 * escala - u * 8 * escala - Math.max(0, 1 - Math.abs(t - 0.5) * 3) * 2 * escala
    p.fillStyle = '#A8702E'
    p.beginPath()
    p.ellipse(px, py, 5 * escala, 3.6 * escala, (t - 0.5) * 0.8, 0, Math.PI * 2)
    p.fill()
    p.fillStyle = '#D89A46'
    p.beginPath()
    p.ellipse(px, py - 1 * escala, 4 * escala, 2.2 * escala, (t - 0.5) * 0.8, 0, Math.PI * 2)
    p.fill()
  }
}

/** A pilha de potes: a panela larga com tampa e a moringa de barro em cima. */
function porPotes(p: CanvasRenderingContext2D, x: number, y: number, escala: number): void {
  // Panela de esmalte.
  p.fillStyle = '#7A2E28'
  p.beginPath()
  p.roundRect(x - 12 * escala, y - 10 * escala, 24 * escala, 10 * escala, 2.6 * escala)
  p.fill()
  p.fillStyle = '#A8443A'
  p.fillRect(x - 12 * escala, y - 10 * escala, 24 * escala, 2.4 * escala)
  p.fillStyle = '#3A2A20'
  p.fillRect(x - 13.4 * escala, y - 12.4 * escala, 26.8 * escala, 2.6 * escala)
  // Moringa de barro em cima, com gargalo e tampa.
  p.fillStyle = '#B8A688'
  p.beginPath()
  p.ellipse(x, y - 17 * escala, 7 * escala, 5.4 * escala, 0, 0, Math.PI * 2)
  p.fill()
  p.fillRect(x - 2.6 * escala, y - 23 * escala, 5.2 * escala, 6 * escala)
  p.fillStyle = '#8A7A5E'
  p.beginPath()
  p.ellipse(x, y - 23 * escala, 4 * escala, 1.8 * escala, 0, 0, Math.PI * 2)
  p.fill()
  // O brilho da luz na barriga da moringa.
  p.fillStyle = 'rgba(255,224,170,0.35)'
  p.beginPath()
  p.ellipse(x - 2 * escala, y - 18.6 * escala, 2.4 * escala, 2 * escala, 0, 0, Math.PI * 2)
  p.fill()
}

/** As canecas de quentão: vidro com líquido âmbar e a asa de fora. O líquido é
 *  desenhado mais claro que o vidro porque é ele que ATRAVESSA a luz da
 *  lâmpada — é o objeto mais brilhante do balcão. */
function porCanecas(p: CanvasRenderingContext2D, x: number, y: number, escala: number, semente: number): void {
  const licores = ['#D2761E', '#C89426', '#A83A2E']
  for (let i = 0; i < 3; i++) {
    const cxi = x + (i - 1) * 11 * escala
    const h = (13 + aleN(semente, 34, i) * 2) * escala
    p.strokeStyle = 'rgba(226,214,194,0.55)'
    p.lineWidth = Math.max(0.7, 1.1 * escala)
    p.beginPath()
    p.arc(cxi + 6 * escala, y - h * 0.5, h * 0.3, -1.2, 1.2)
    p.stroke()
    p.fillStyle = 'rgba(214,206,190,0.28)'
    p.fillRect(cxi - 4.4 * escala, y - h, 8.8 * escala, h)
    p.fillStyle = licores[i % licores.length]!
    p.fillRect(cxi - 3.6 * escala, y - h * 0.82, 7.2 * escala, h * 0.82)
    p.fillStyle = 'rgba(255,230,180,0.4)'
    p.fillRect(cxi - 3.6 * escala, y - h * 0.82, 1.6 * escala, h * 0.82)
  }
}

type Mercadoria = (
  p: CanvasRenderingContext2D,
  x: number,
  y: number,
  escala: number,
  semente: number,
) => void

const CARDAPIO: readonly Mercadoria[] = [porMilho, porPamonha, porPaes, porPotes, porCanecas]

// ── A barraca ───────────────────────────────────────────────────────────

/**
 * Desenha uma barraca de arraial inteira, apoiada em `yBase` e centrada em
 * `cx`, com `escala` multiplicando TODA dimensão e `semente` decidindo a
 * variação (estampa, cobertura, mercadoria, lado da perspectiva).
 *
 * A ordem é a da profundidade: primeiro a luz que a barraca joga no chão,
 * depois o que está atrás, por último o que está na frente e a luz que a
 * lâmpada devolve por cima de tudo.
 */
export function desenharBarraca(
  pincel: CanvasRenderingContext2D,
  cx: number,
  yBase: number,
  escala: number,
  semente: number,
): void {
  if (escala <= 0) return
  const p = pincel

  const larguraB = 190 * escala
  const meia = larguraB / 2
  const alturaBalcao = 62 * escala
  const alturaEsteio = 58 * escala
  const alturaTelhado = 44 * escala
  const yTampo = yBase - alturaBalcao
  const yBeiral = yTampo - alturaEsteio

  // A barraca é vista de LEVE VIÉS, e o lado para onde ela vira sai da
  // semente — barracas vizinhas viradas para o mesmo lado leem como cópias.
  const lado = ale(semente * 2.31) < 0.5 ? -1 : 1
  const desvio = lado * meia * 0.16
  const recuo = 9 * escala

  const paleta = CHITAS[Math.floor(ale(semente * 5.77) * CHITAS.length) % CHITAS.length]!
  const paletaTelhado = CHITAS[Math.floor(ale(semente * 8.13) * CHITAS.length) % CHITAS.length]!
  // Palha ou chita na cobertura: a praça da foto tem as duas, e alternar é o
  // que impede uma fileira de barracas de virar um padrão repetido.
  const telhadoDePalha = ale(semente * 4.19) < 0.42

  // A lâmpada pende no vão, deslocada do centro para não brigar com a placa.
  const lx = cx - lado * meia * 0.4
  const ly = yBeiral + 20 * escala

  // ── A luz no chão, antes de tudo ──────────────────────────────────────
  // A poça quente aos pés da barraca é boa parte da iluminação da praça. Ela
  // vem PRIMEIRO porque é luz batendo no piso, não névoa por cima da barraca.
  p.save()
  p.globalCompositeOperation = 'lighter'
  const poca = p.createRadialGradient(cx, yBase, 0, cx, yBase, meia * 2.1)
  poca.addColorStop(0, 'rgba(255,182,96,0.28)')
  poca.addColorStop(0.5, 'rgba(240,150,64,0.12)')
  poca.addColorStop(1, 'rgba(220,120,40,0)')
  p.fillStyle = poca
  p.beginPath()
  p.ellipse(cx, yBase + 4 * escala, meia * 2.1, meia * 0.62, 0, 0, Math.PI * 2)
  p.fill()
  p.restore()

  // A sombra de contato: é ela que assenta a barraca no chão.
  p.fillStyle = 'rgba(8,7,6,0.5)'
  p.beginPath()
  p.ellipse(cx + desvio * 0.4, yBase + 2 * escala, meia * 1.12, 7 * escala, 0, 0, Math.PI * 2)
  p.fill()

  // ── Estrutura de trás ─────────────────────────────────────────────────
  const largEsteio = Math.max(1.4, 8 * escala)
  for (const s of [-1, 1]) {
    desenharEsteio(p, cx + s * meia * 0.8 + desvio, yBeiral - recuo, yTampo - recuo, largEsteio * 0.85, lado)
  }

  // Um fardo encostado atrás, do lado para onde a barraca vira.
  desenharFardoPalha(p, cx + lado * meia * 1.02, yBase - 1 * escala, 30 * escala, 20 * escala, escala, semente + 7)

  // ── O balcão ──────────────────────────────────────────────────────────
  // A face lateral, mais escura: é a que está de costas para a lâmpada.
  p.fillStyle = MADEIRA_SOMBRA
  p.beginPath()
  p.moveTo(cx + lado * meia, yTampo)
  p.lineTo(cx + lado * meia + desvio, yTampo - recuo)
  p.lineTo(cx + lado * meia + desvio, yBase - recuo * 0.4)
  p.lineTo(cx + lado * meia, yBase)
  p.closePath()
  p.fill()

  // A frente de chita, do tampo até o chão.
  desenharChita(p, cx - meia, yTampo, larguraB, alturaBalcao, paleta, escala, semente)
  // A luz não chega aqui direto: o tampo faz sombra em cima, e o que ilumina a
  // barra de baixo é o rebote da poça no chão. Esse degradê é o que faz o pano
  // ler como pano numa noite, e não como estampa recortada e colada.
  const luzFrente = p.createLinearGradient(0, yTampo, 0, yBase)
  luzFrente.addColorStop(0, 'rgba(10,10,18,0.6)')
  luzFrente.addColorStop(0.45, 'rgba(10,10,18,0.42)')
  luzFrente.addColorStop(1, 'rgba(60,30,10,0.22)')
  p.fillStyle = luzFrente
  p.fillRect(cx - meia, yTampo, larguraB, alturaBalcao)

  // Os pés da armação, espiando por baixo do pano.
  p.fillStyle = MADEIRA_SOMBRA
  for (const s of [-1, 1]) {
    p.fillRect(cx + s * meia * 0.9 - largEsteio * 0.4, yBase - 6 * escala, largEsteio * 0.8, 6 * escala)
  }

  // A FRANJA DE PALHA sob o tampo — a saia dourada que toda barraca da foto
  // tem, e o detalhe que mais faz falta quando não está lá.
  desenharFranjaPalha(p, cx - meia, yTampo + 5 * escala, larguraB, 16 * escala, escala, semente, 40)

  // O tampo: a face de cima em perspectiva, e o lábio da tábua na frente.
  p.fillStyle = '#4E3A26'
  p.beginPath()
  p.moveTo(cx - meia, yTampo)
  p.lineTo(cx + meia, yTampo)
  p.lineTo(cx + meia + desvio, yTampo - recuo)
  p.lineTo(cx - meia + desvio, yTampo - recuo)
  p.closePath()
  p.fill()
  if (escala > 0.7) {
    // As juntas das tábuas do tampo. Marcenaria à vista, como na foto.
    p.strokeStyle = 'rgba(24,16,10,0.5)'
    p.lineWidth = Math.max(0.6, 0.8 * escala)
    for (let i = 1; i < 5; i++) {
      const t = i / 5
      p.beginPath()
      p.moveTo(cx - meia + larguraB * t, yTampo)
      p.lineTo(cx - meia + larguraB * t + desvio, yTampo - recuo)
      p.stroke()
    }
  }
  p.fillStyle = '#6E5232'
  p.fillRect(cx - meia * 1.04, yTampo, larguraB * 1.04, 5 * escala)
  p.fillStyle = 'rgba(226,186,124,0.4)'
  p.fillRect(cx - meia * 1.04, yTampo, larguraB * 1.04, Math.max(0.8, 1.4 * escala))

  // ── A mercadoria ──────────────────────────────────────────────────────
  // O tampo está iluminado pela lâmpada logo acima: uma poça quente na tábua
  // faz a mercadoria ficar DENTRO da luz em vez de ao lado dela.
  p.save()
  p.beginPath()
  p.moveTo(cx - meia, yTampo)
  p.lineTo(cx + meia, yTampo)
  p.lineTo(cx + meia + desvio, yTampo - recuo)
  p.lineTo(cx - meia + desvio, yTampo - recuo)
  p.closePath()
  p.clip()
  p.globalCompositeOperation = 'lighter'
  const naTabua = p.createRadialGradient(lx, yTampo, 0, lx, yTampo, meia * 1.2)
  naTabua.addColorStop(0, 'rgba(255,190,110,0.4)')
  naTabua.addColorStop(1, 'rgba(255,150,60,0)')
  p.fillStyle = naTabua
  p.fillRect(cx - meia * 1.2, yTampo - recuo, larguraB * 1.2, recuo + 6 * escala)
  p.restore()

  const yApoio = yTampo - recuo * 0.5
  for (let i = 0; i < 3; i++) {
    const item = CARDAPIO[Math.floor(ale(semente * 13.7 + i * 41.3) * CARDAPIO.length) % CARDAPIO.length]!
    item(p, cx - meia * 0.58 + meia * 0.58 * i + desvio * 0.5, yApoio, escala, semente + i)
  }

  // ── Os esteios da frente, à frente da mercadoria ──────────────────────
  for (const s of [-1, 1]) {
    desenharEsteio(p, cx + s * meia * 0.82, yBeiral, yTampo, largEsteio, lado)
    desenharMaoFrancesa(p, cx + s * meia * 0.82, yBeiral + 3 * escala, escala, -s)
  }
  // O frechal: a viga horizontal que amarra os dois esteios sob o beiral.
  p.fillStyle = MADEIRA
  p.fillRect(cx - meia * 0.86, yBeiral, meia * 1.72, Math.max(1.2, 4 * escala))

  // ── Telhado, bandeirinhas, placa ──────────────────────────────────────
  desenharTelhado(p, cx, yBeiral, meia, alturaTelhado, escala, semente, desvio, recuo, paletaTelhado, telhadoDePalha)
  desenharBandeirinhas(p, cx, yBeiral, meia, escala, semente)
  desenharPlaca(p, cx, yBeiral, meia, escala, semente)

  // ── A lâmpada ─────────────────────────────────────────────────────────
  // O fio, saindo de dentro do telhado.
  p.strokeStyle = 'rgba(30,24,18,0.9)'
  p.lineWidth = Math.max(0.7, 1.1 * escala)
  p.beginPath()
  p.moveTo(lx, yBeiral - 4 * escala)
  p.lineTo(lx, ly - 4 * escala)
  p.stroke()
  // O bocal.
  p.fillStyle = '#2E2620'
  p.fillRect(lx - 2.2 * escala, ly - 6 * escala, 4.4 * escala, 3.4 * escala)

  // O HALO. Aditivo e grande: é ele que reacende a chita, a palha e a
  // mercadoria que estão perto, e deixa esfriar o que está longe. Vem depois
  // de tudo justamente para poder passar por cima do que ilumina.
  p.save()
  p.globalCompositeOperation = 'lighter'
  const raioHalo = meia * 1.7
  const halo = p.createRadialGradient(lx, ly, 0, lx, ly, raioHalo)
  halo.addColorStop(0, 'rgba(255,214,150,0.5)')
  halo.addColorStop(0.16, 'rgba(255,186,110,0.3)')
  halo.addColorStop(0.5, 'rgba(248,150,66,0.12)')
  halo.addColorStop(1, 'rgba(230,120,40,0)')
  p.fillStyle = halo
  p.beginPath()
  p.arc(lx, ly, raioHalo, 0, Math.PI * 2)
  p.fill()
  p.restore()

  // O filamento, por último, para ser o ponto mais claro do desenho inteiro.
  p.fillStyle = '#FFF0CE'
  p.beginPath()
  p.arc(lx, ly, Math.max(1, 3.2 * escala), 0, Math.PI * 2)
  p.fill()

  // ── A palha solta no chão ─────────────────────────────────────────────
  // Os fios espalhados aos pés, que na foto cobrem o calçamento inteiro em
  // volta das barracas. Aqui é só o bastante para a base não terminar num
  // corte reto contra o piso.
  p.strokeStyle = 'rgba(176,144,84,0.5)'
  p.lineWidth = Math.max(0.6, 0.9 * escala)
  for (let i = 0; i < 26; i++) {
    const t = aleN(semente, 50, i)
    const u = aleN(semente, 51, i)
    const px = cx + (t - 0.5) * meia * 2.6
    const py = yBase + (u - 0.25) * 10 * escala
    p.beginPath()
    p.moveTo(px, py)
    p.lineTo(px + (5 + u * 6) * escala * (t > 0.5 ? 1 : -1), py + (u - 0.5) * 3 * escala)
    p.stroke()
  }
}
