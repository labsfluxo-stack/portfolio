/**
 * O CASARIO COLONIAL da praça — desenhado A PARTIR DA FOTO.
 *
 * A referência é o arraial nordestino em `public/`, e o que ela ensina sobre as
 * casas não é acabamento, é FORMA. A versão anterior deste casario desenhava
 * caixa + triângulo de telhado + retângulos acesos, que é a casa que qualquer um
 * desenha de memória. Nenhuma casa da foto tem esse formato.
 *
 * O QUE A FOTO TEM E A MEMÓRIA NÃO TEM:
 *
 * 1. PLATIBANDA, não telhado à vista. A casa colonial de rua brasileira esconde
 *    o telhado atrás de uma parede que sobe além dele. Quem desenha o triângulo
 *    vermelho na frente está desenhando chalé, não sobrado. O telhado aparece
 *    só como uma lasca por trás da platibanda — e em várias casas nem isso.
 *
 * 2. FRONTÃO DECORADO. É o coroamento da platibanda, e é o que dá PERSONALIDADE
 *    a cada casa: um é triângulo com medalhão redondo no tímpano, outro é curva
 *    de sino com ombros, outro é escalonado. Vizinhos com frontões diferentes
 *    leem como rua; vizinhos iguais leem como conjunto habitacional.
 *
 * 3. VÃO ALTO COM MOLDURA BRANCA. As aberturas da foto são portas altíssimas que
 *    quase encostam no chão, algumas em arco pleno, todas emolduradas por uma
 *    verga larga de cal que SOBRESSAI do reboco. É a moldura, e não o vidro, que
 *    faz a janela existir a 90 pixels de distância.
 *
 * 4. PILASTRA ENTRE VIZINHOS. As casas são geminadas e a divisa é uma faixa
 *    clara vertical. É isso que costura a fileira numa rua contínua em vez de
 *    blocos soltos — e é de graça, porque cada casa pinta a própria borda.
 *
 * 5. UM PRÉDIO MAIOR ANCORA A PRAÇA. Na foto é um sobrado de dois pavimentos com
 *    sacadas de balaustrada, cornija de dentículos e balaustrada no coroamento.
 *    Sem ele a fileira não tem hierarquia, e uma fileira sem hierarquia é friso.
 *
 * 6. COR DIFERENTE EM CADA VIZINHO. Rosa ao lado de azul ao lado de ocre. A foto
 *    não tem duas casas seguidas da mesma cor em lugar nenhum.
 *
 * REGRA DA PÁGINA: nada de texto desenhado em canvas. Faixa e bandeirinha aqui
 * são forma pintada, nunca letra — texto em canvas não existe para leitor de
 * tela, e nesta página informação mora no DOM.
 *
 * TUDO É DETERMINÍSTICO. O sprite é assado uma vez e duas assadas têm que dar
 * exatamente os mesmos pixels; por isso `ale()` no lugar de `Math.random`.
 */

// ── A paleta de noite ────────────────────────────────────────────────────

/**
 * A ARMADILHA que este projeto já pisou: pegar um pastel de dia e multiplicar
 * para baixo para "escurecer". Isso derruba o brilho e o croma juntos, e TODA
 * cor cai no mesmo tom de barro — rosa, verde e azul saem marrons.
 *
 * Aqui a cor já NASCE noturna: valor médio, croma preservado, matiz intacto.
 * A noite entra depois em duas camadas separadas, que é como ela acontece de
 * verdade numa rua de lampião — véu frio por cima (`véuDeNoite`) e âmbar rente
 * ao chão (`luzDoArraial`). Cor escurecida vira marrom; cor velada continua cor.
 */
/** A cor de uma fachada. `string` e não um literal: a lista abaixo é uma
 *  AMOSTRA da paleta, e as casas especiais (o sobradão e a igreja) trazem
 *  cor própria fora dela. Congelar a lista em literais fazia o compilador
 *  tratar a amostra como se fosse a paleta inteira. */
type CorFachada = { parede: string; azulejo: boolean }
const FACHADAS: readonly CorFachada[] = [
  { parede: '#A9646F', azulejo: false }, // rosa velho
  { parede: '#4A7C8C', azulejo: true }, // azul de azulejo
  { parede: '#B08F4A', azulejo: false }, // ocre
  { parede: '#6B8A63', azulejo: false }, // verde folha
  { parede: '#AE6A52', azulejo: false }, // terracota
  { parede: '#6B76A0', azulejo: true }, // anil
  { parede: '#B0A078', azulejo: false }, // areia
  { parede: '#8E4B5D', azulejo: false } as const, // vinho
] as const

type Fachada = (typeof FACHADAS)[number]

/** A cal das molduras. Nunca branco puro: a esta hora nada na praça é #FFF, e
 *  branco puro numa fachada de noite lê como recorte de papel colado. Baixou de
 *  #CDC0AB depois de ver a fileira ampliada — a cal clara demais dava um ar de
 *  bolo de casamento e roubava contraste do texto branco da dobra. */
const CAL = '#BFB299'
/** A mesma cal onde a luz da festa bate — rente ao chão e nas sacadas. */
const CAL_QUENTE = '#E2CDA4'
/** Telha à noite. Aparece pouco, só a lasca que passa da platibanda. */
const TELHA = '#7A3628'
/** Madeira das folhas de porta. */
const MADEIRA = '#3A2418'
/** Vão apagado: quase preto, mas com um resto de azul do céu refletido. */
const VAO_APAGADO = '#151824'

/** Cores de bandeirinha, para os varais curtos pendurados nas sacadas. */
const CORES_BANDEIRINHA = ['#E0563F', '#E8B93C', '#3E8FC4', '#48A05E', '#D4477F'] as const

/**
 * Determinístico. O casario é assado num sprite e não pode mudar entre visitas
 * nem entre duas assadas do mesmo tamanho — daí a série pseudoaleatória por
 * semente em vez de `Math.random`/`Date.now`.
 */
function ale(semente: number): number {
  const x = Math.sin(semente * 78.233 + 11.17) * 24634.6345
  return x - Math.floor(x)
}

// ── Peças de arquitetura ─────────────────────────────────────────────────

/**
 * Uma faixa de cal SALIENTE (cornija, friso, verga).
 *
 * Sai sempre com uma sombra fina embaixo. É essa sombra de um pixel que separa
 * "moldura que se projeta da parede" de "listra pintada na parede" — e a
 * diferença entre as duas coisas é visível mesmo no tamanho de herói, porque o
 * olho lê relevo antes de ler forma.
 */
function faixaDeCal(
  p: CanvasRenderingContext2D,
  x: number,
  y: number,
  largura: number,
  altura: number,
  cor: string = CAL,
): void {
  p.fillStyle = cor
  p.fillRect(x, y, largura, altura)
  p.fillStyle = 'rgba(18,14,20,0.34)'
  p.fillRect(x, y + altura, largura, Math.max(0.7, altura * 0.28))
}

/**
 * BALAUSTRADA — a fileira de balaústres torneados do coroamento e das sacadas.
 *
 * De perto são colunas barrigudas; a 6 pixels de altura são pontos claros com
 * vão escuro entre eles, e é exatamente assim que o olho reconhece a peça. Por
 * isso o desenho é feito para o tamanho pequeno e não para o grande: fundo
 * escuro semitransparente (o vão, que deixa o céu passar um pouco) e os
 * balaústres por cima, com os dois trilhos fechando em cima e embaixo.
 */
function balaustrada(
  p: CanvasRenderingContext2D,
  x: number,
  y: number,
  largura: number,
  altura: number,
  cor: string = CAL,
): void {
  if (largura <= 1 || altura <= 1) return
  // O vão entre os balaústres: escuro, mas translúcido, para o céu e o morro
  // atrás aparecerem um pouco. Balaustrada opaca vira murinho.
  p.fillStyle = 'rgba(14,16,26,0.6)'
  p.fillRect(x, y, largura, altura)
  const passo = Math.max(2.4, altura * 0.62)
  const grossura = Math.max(1, passo * 0.42)
  p.fillStyle = cor
  for (let bx = x + passo * 0.28; bx < x + largura - grossura * 0.5; bx += passo) {
    p.fillRect(bx, y + altura * 0.18, grossura, altura * 0.64)
  }
  // Os trilhos. O de cima é mais fino que o de baixo, como na peça de verdade.
  p.fillRect(x, y, largura, Math.max(0.9, altura * 0.2))
  p.fillRect(x, y + altura - Math.max(1, altura * 0.24), largura, Math.max(1, altura * 0.24))
}

/**
 * PINÁCULO — o coto de cal em pé nos cantos da platibanda.
 *
 * Custa três retângulos e é o detalhe que mais barato quebra a linha reta do
 * coroamento. Na foto todo canto de platibanda tem um; sem eles a silhueta da
 * rua é uma serra de topos chapados.
 */
function pinaculo(p: CanvasRenderingContext2D, cx: number, yBase: number, altura: number): void {
  const largura = Math.max(1.4, altura * 0.42)
  p.fillStyle = CAL
  p.fillRect(cx - largura / 2, yBase - altura, largura, altura)
  // Base e capitel alargados: é o que faz o coto ler como peça torneada.
  p.fillRect(cx - largura * 0.85, yBase - altura * 0.22, largura * 1.7, altura * 0.22)
  p.fillRect(cx - largura * 0.8, yBase - altura, largura * 1.6, altura * 0.2)
  p.beginPath()
  p.arc(cx, yBase - altura - largura * 0.35, largura * 0.45, 0, Math.PI * 2)
  p.fill()
}

/** O medalhão redondo do tímpano: anel de cal com o miolo na cor da parede.
 *  Na foto é um brasão em relevo; a esta distância é um alvo claro, e é o alvo
 *  que o olho lê como "esta casa tem ornato". */
function medalhao(p: CanvasRenderingContext2D, cx: number, cy: number, raio: number, miolo: string): void {
  if (raio < 0.8) return
  p.fillStyle = CAL
  p.beginPath()
  p.arc(cx, cy, raio, 0, Math.PI * 2)
  p.fill()
  p.fillStyle = miolo
  p.beginPath()
  p.arc(cx, cy, raio * 0.55, 0, Math.PI * 2)
  p.fill()
}

/**
 * O contorno de um vão: retângulo, ou retângulo com ARCO PLENO em cima.
 *
 * O arco é a metade do repertório colonial da foto e vale o custo de traçá-lo:
 * uma fileira só de vãos retos lê como galpão, e basta um terço deles em arco
 * para a rua virar centro histórico.
 */
function caminhoDoVao(
  p: CanvasRenderingContext2D,
  x: number,
  y: number,
  largura: number,
  altura: number,
  arco: boolean,
): void {
  p.beginPath()
  if (arco && largura > 2) {
    const r = largura / 2
    p.moveTo(x, y + altura)
    p.lineTo(x, y + r)
    p.arc(x + r, y + r, r, Math.PI, 0)
    p.lineTo(x + largura, y + altura)
  } else {
    p.rect(x, y, largura, altura)
  }
  p.closePath()
}

/**
 * UM VÃO ALTO com moldura de cal — a peça que mais aparece na rua inteira.
 *
 * Ordem: moldura primeiro (maior, em cal), vão dentro dela, e a folha de
 * madeira ou a luz acesa por último. Vão aceso ganha um degradê quente do topo
 * para baixo, porque a lâmpada de dentro fica no teto e o batente sombreia o
 * pé — luz chapada lê como adesivo amarelo.
 */
function vaoAlto(
  p: CanvasRenderingContext2D,
  x: number,
  y: number,
  largura: number,
  altura: number,
  opcoes: { arco: boolean; aceso: boolean; porta: boolean; semente: number },
): void {
  const esp = Math.max(1.1, largura * 0.19)
  caminhoDoVao(p, x - esp, y - esp, largura + esp * 2, altura + esp, opcoes.arco)
  p.fillStyle = CAL
  p.fill()
  // A sombra que a verga projeta dentro do próprio vão, no alto.
  caminhoDoVao(p, x, y, largura, altura, opcoes.arco)
  p.fillStyle = VAO_APAGADO
  p.fill()

  if (opcoes.aceso) {
    p.save()
    caminhoDoVao(p, x, y, largura, altura, opcoes.arco)
    p.clip()
    const g = p.createLinearGradient(0, y, 0, y + altura)
    g.addColorStop(0, '#FFD08A')
    g.addColorStop(0.55, '#F2A24E')
    g.addColorStop(1, '#8A4A22')
    p.fillStyle = g
    p.fillRect(x, y, largura, altura)
    // A cruzeta da caixilharia, recortada contra a luz. É ela que diz JANELA;
    // sem ela um vão aceso é só um retângulo cor de manteiga.
    p.fillStyle = 'rgba(30,18,12,0.55)'
    p.fillRect(x + largura * 0.46, y, Math.max(0.8, largura * 0.1), altura)
    p.fillRect(x, y + altura * 0.44, largura, Math.max(0.8, altura * 0.05))
    p.restore()
  } else if (opcoes.porta) {
    // Porta fechada: as duas folhas de madeira e o rasgo entre elas.
    p.save()
    caminhoDoVao(p, x, y, largura, altura, opcoes.arco)
    p.clip()
    p.fillStyle = MADEIRA
    p.fillRect(x, y + (opcoes.arco ? largura * 0.34 : 0), largura, altura)
    p.fillStyle = 'rgba(10,6,4,0.7)'
    p.fillRect(x + largura * 0.47, y, Math.max(0.7, largura * 0.07), altura)
    // As almofadas da folha, em contraluz fraquíssimo.
    p.fillStyle = 'rgba(196,150,96,0.14)'
    for (let i = 0; i < 3; i++) {
      p.fillRect(x + largura * 0.1, y + altura * (0.24 + i * 0.24), largura * 0.3, altura * 0.14)
      p.fillRect(x + largura * 0.6, y + altura * (0.24 + i * 0.24), largura * 0.3, altura * 0.14)
    }
    p.restore()
  } else {
    // Veneziana encostada de um lado só. As duas fechadas tapariam o vão, e
    // casa toda fechada não lê como casa habitada.
    p.fillStyle = ale(opcoes.semente * 7) > 0.5 ? '#2E4A44' : '#3B3350'
    p.fillRect(x, y + (opcoes.arco ? largura * 0.4 : altura * 0.06), largura * 0.36, altura * 0.9)
  }
}

/**
 * Um FRONTÃO por cima da platibanda, em três feitios diferentes.
 *
 * Este é o parágrafo que separa "casario" de "fileira de caixas". Cada feitio é
 * traçado com moldura de cal por fora e o tímpano na cor da parede por dentro —
 * o mesmo desenho duas vezes, com um afastamento — porque é o contorno claro,
 * não o miolo, que sobrevive no tamanho de herói.
 */
function frontao(
  p: CanvasRenderingContext2D,
  cx: number,
  yBase: number,
  largura: number,
  altura: number,
  feitio: 'triangular' | 'curvo' | 'escalonado',
  parede: string,
  semente: number,
): void {
  const meia = largura / 2
  const tracar = (encolhe: number): void => {
    const m = meia * (1 - encolhe)
    const a = altura * (1 - encolhe * 1.5)
    const x0 = cx - m
    const x1 = cx + m
    p.beginPath()
    if (feitio === 'triangular') {
      p.moveTo(x0, yBase)
      p.lineTo(cx, yBase - a)
      p.lineTo(x1, yBase)
    } else if (feitio === 'curvo') {
      // Curva de sino com ombros — o frontão mais comum da foto, e o mais
      // reconhecível de longe justamente porque não é reto em canto nenhum.
      p.moveTo(x0, yBase)
      p.quadraticCurveTo(x0 + m * 0.2, yBase - a * 0.12, x0 + m * 0.34, yBase - a * 0.4)
      p.quadraticCurveTo(cx - m * 0.24, yBase - a, cx, yBase - a)
      p.quadraticCurveTo(cx + m * 0.24, yBase - a, x1 - m * 0.34, yBase - a * 0.4)
      p.quadraticCurveTo(x1 - m * 0.2, yBase - a * 0.12, x1, yBase)
    } else {
      // Escalonado: três degraus subindo para o meio.
      p.moveTo(x0, yBase)
      p.lineTo(x0, yBase - a * 0.34)
      p.lineTo(cx - m * 0.5, yBase - a * 0.34)
      p.lineTo(cx - m * 0.5, yBase - a * 0.72)
      p.lineTo(cx - m * 0.2, yBase - a * 0.72)
      p.lineTo(cx - m * 0.2, yBase - a)
      p.lineTo(cx + m * 0.2, yBase - a)
      p.lineTo(cx + m * 0.2, yBase - a * 0.72)
      p.lineTo(cx + m * 0.5, yBase - a * 0.72)
      p.lineTo(cx + m * 0.5, yBase - a * 0.34)
      p.lineTo(x1, yBase - a * 0.34)
      p.lineTo(x1, yBase)
    }
    p.closePath()
  }
  tracar(0)
  p.fillStyle = CAL
  p.fill()
  tracar(0.14)
  p.fillStyle = parede
  p.fill()

  // O ornato do tímpano: medalhão redondo, ou um óculo quadrado escuro. É o
  // que faz duas casas de frontão igual não parecerem a mesma casa.
  const yOrnato = yBase - altura * (feitio === 'triangular' ? 0.4 : 0.5)
  if (ale(semente * 5 + 2) > 0.42) {
    medalhao(p, cx, yOrnato, Math.max(1, altura * 0.2), parede)
  } else {
    const lado = Math.max(1.6, altura * 0.3)
    p.fillStyle = CAL
    p.fillRect(cx - lado / 2, yOrnato - lado / 2, lado, lado)
    p.fillStyle = VAO_APAGADO
    p.fillRect(cx - lado * 0.28, yOrnato - lado * 0.28, lado * 0.56, lado * 0.56)
  }
}

/**
 * O TOLDO de lona listrada sobre uma porta de comércio.
 *
 * A rua da foto tem comércio térreo, e toldo é o objeto que diz isso numa
 * pincelada. Vale por três coisas ao mesmo tempo: quebra a verticalidade dos
 * vãos, joga uma sombra que dá relevo à fachada, e é a única forma DIAGONAL
 * numa parede que só tem retângulos.
 */
function toldo(
  p: CanvasRenderingContext2D,
  cx: number,
  y: number,
  largura: number,
  altura: number,
  corListra: string,
): void {
  const meia = largura / 2
  p.beginPath()
  p.moveTo(cx - meia * 0.78, y)
  p.lineTo(cx + meia * 0.78, y)
  p.lineTo(cx + meia, y + altura)
  p.lineTo(cx - meia, y + altura)
  p.closePath()
  p.save()
  p.clip()
  p.fillStyle = '#E4D7BE'
  p.fillRect(cx - meia, y, largura, altura)
  p.fillStyle = corListra
  const passo = Math.max(2, largura * 0.17)
  for (let lx = cx - meia; lx < cx + meia; lx += passo * 2) {
    p.fillRect(lx, y, passo, altura)
  }
  p.restore()
  // A barra ondulada da ponta, que é o que faz lona parecer lona.
  const dentes = Math.max(3, Math.round(largura / Math.max(2.4, largura * 0.16)))
  const raio = largura / (dentes * 2)
  p.fillStyle = '#E4D7BE'
  for (let i = 0; i < dentes; i++) {
    p.beginPath()
    p.arc(cx - meia + raio + i * raio * 2, y + altura, raio, 0, Math.PI)
    p.fill()
  }
  // A sombra do toldo na parede, logo abaixo dele.
  p.fillStyle = 'rgba(12,10,18,0.3)'
  p.fillRect(cx - meia, y + altura, largura, altura * 0.5)
}

/**
 * BANDEIRINHAS penduradas num trecho de parapeito.
 *
 * Formas, nunca letras: cada uma é um losango de cor cheia com uma pontinha
 * mais escura. São o único ponto de cor SATURADA da fileira e é por isso que
 * elas amarram o casario ao resto do arraial — sem elas as casas são bonitas e
 * não têm nada a ver com a festa que acontece na frente delas.
 */
function bandeirinhas(
  p: CanvasRenderingContext2D,
  x0: number,
  x1: number,
  y: number,
  altura: number,
  semente: number,
): void {
  const passo = Math.max(2.2, altura * 0.95)
  let i = 0
  for (let x = x0; x < x1 - passo * 0.5; x += passo) {
    const cor = CORES_BANDEIRINHA[(i + Math.floor(ale(semente * 3 + i) * 5)) % CORES_BANDEIRINHA.length]!
    p.fillStyle = cor
    p.beginPath()
    p.moveTo(x, y)
    p.lineTo(x + passo * 0.82, y)
    p.lineTo(x + passo * 0.41, y + altura)
    p.closePath()
    p.fill()
    i++
  }
}

// ── A textura da parede ──────────────────────────────────────────────────

/**
 * Reboco e azulejo.
 *
 * Parede de cor plana lê como papelão em qualquer tamanho. Duas camadas
 * resolvem: manchas grandes de chuva em contraste baixíssimo (que o olho lê
 * como superfície) e, nas casas de azulejo, uma malha de pontos claros — várias
 * casas da foto são revestidas de azulejo português, e a malha é o que se vê
 * dele à distância.
 */
function texturaDeParede(
  p: CanvasRenderingContext2D,
  x: number,
  y: number,
  largura: number,
  altura: number,
  fachada: Fachada,
  semente: number,
): void {
  p.save()
  p.beginPath()
  p.rect(x, y, largura, altura)
  p.clip()

  if (fachada.azulejo) {
    const passo = Math.max(2.6, largura * 0.045)
    p.fillStyle = 'rgba(238,244,255,0.09)'
    for (let ty = y + passo / 2; ty < y + altura; ty += passo) {
      const desloca = Math.round((ty - y) / passo) % 2 === 0 ? 0 : passo / 2
      for (let tx = x + desloca; tx < x + largura; tx += passo) {
        p.fillRect(tx, ty, Math.max(0.8, passo * 0.3), Math.max(0.8, passo * 0.3))
      }
    }
  }

  // Manchas de chuva. PEQUENAS e muitas, não poucas e grandes: ampliada 3x, a
  // versão anterior (raio até 17% da fachada) lia como borrão de lente, um
  // defeito de foto e não uma sujeira de parede. Sujeira de parede é miúda.
  for (let i = 0; i < 22; i++) {
    p.fillStyle = i % 2 === 0 ? 'rgba(255,246,226,0.045)' : 'rgba(16,10,20,0.06)'
    p.beginPath()
    p.arc(
      x + ale(semente * 13 + i) * largura,
      y + ale(semente * 17 + i * 3) * altura,
      largura * (0.02 + ale(semente * 19 + i) * 0.055),
      0,
      Math.PI * 2,
    )
    p.fill()
  }

  // A LUZ DO ARRAIAL: âmbar rente ao chão, subindo até sumir. É ela que impede
  // a fachada de cair no marrom — em vez de escurecer a cor, ilumina o pé dela.
  // CURTA (um quinto da fachada). Quando subia até um quarto e vinha com o véu
  // do pé da rua por cima, a metade de baixo da fileira inteira virava neblina
  // e as portas perdiam o pé — o casario parecia derretendo no chão.
  const luz = p.createLinearGradient(0, y + altura, 0, y + altura * 0.62)
  luz.addColorStop(0, 'rgba(255,168,74,0.17)')
  luz.addColorStop(1, 'rgba(255,168,74,0)')
  p.fillStyle = luz
  p.fillRect(x, y, largura, altura)

  // O VÉU DE NOITE: azul frio no alto, onde nenhuma lâmpada da praça alcança.
  const veu = p.createLinearGradient(0, y, 0, y + altura * 0.85)
  veu.addColorStop(0, 'rgba(38,54,100,0.36)')
  veu.addColorStop(1, 'rgba(38,54,100,0)')
  p.fillStyle = veu
  p.fillRect(x, y, largura, altura)
  p.restore()
}

// ── A casa térrea ────────────────────────────────────────────────────────

/**
 * A CASA TÉRREA de rua: embasamento, vãos altos emoldurados, friso, platibanda
 * e frontão. Nesta ordem, de baixo para cima, que é a ordem em que ela foi
 * construída de verdade.
 *
 * Repare no que NÃO tem: telhado à vista. A lasca de telha entra atrás da
 * platibanda, e só. Foi trocar o triângulo vermelho por essa lasca o que fez a
 * fileira parar de parecer um condomínio de chalés.
 */
function desenharCasaTerrea(
  p: CanvasRenderingContext2D,
  x: number,
  yBase: number,
  largura: number,
  alturaCasa: number,
  fachada: Fachada,
  semente: number,
): void {
  const yTopo = yBase - alturaCasa
  // A platibanda ocupa o terço de cima; os vãos vivem embaixo dela.
  const alturaPlatibanda = alturaCasa * 0.26
  const yFriso = yTopo + alturaPlatibanda
  const alturaFrontao = alturaCasa * (0.13 + ale(semente * 23) * 0.08)

  // A lasca de telhado que passa por trás da platibanda. Vem antes de tudo,
  // porque está atrás de tudo.
  p.fillStyle = TELHA
  p.beginPath()
  p.moveTo(x + largura * 0.06, yTopo + alturaCasa * 0.03)
  p.lineTo(x + largura * 0.5, yTopo - alturaCasa * 0.05)
  p.lineTo(x + largura * 0.94, yTopo + alturaCasa * 0.03)
  p.closePath()
  p.fill()

  p.fillStyle = fachada.parede
  p.fillRect(x, yTopo, largura, alturaCasa)
  texturaDeParede(p, x, yTopo, largura, alturaCasa, fachada, semente)

  // OS VÃOS. Casa estreita leva dois, larga leva quatro — e é essa variação de
  // ritmo, mais que a de cor, que faz duas casas vizinhas não serem a mesma.
  const vaos = largura > alturaCasa * 1.25 ? 4 : largura > alturaCasa * 0.85 ? 3 : 2
  const arco = ale(semente * 29 + 3) > 0.55
  const larguraVao = largura / (vaos * 2.15)
  const yVao = yFriso + alturaCasa * 0.1
  const alturaVao = yBase - yVao - alturaCasa * 0.07
  for (let c = 0; c < vaos; c++) {
    const xv = x + (largura / (vaos + 1)) * (c + 1) - larguraVao / 2
    const sorte = ale(semente * 31 + c * 9)
    // Porta no térreo é a regra da foto; janela acesa é a exceção que dá o
    // brilho. Uma casa inteira acesa ofuscaria o resto da fileira.
    const aceso = sorte > 0.72
    vaoAlto(p, xv, yVao, larguraVao, alturaVao, { arco, aceso, porta: !aceso && sorte > 0.3, semente: semente + c })
  }

  // TOLDO em algumas casas, sobre o vão do meio.
  if (ale(semente * 37 + 5) > 0.66 && vaos >= 3) {
    const cxToldo = x + largura / 2
    toldo(
      p,
      cxToldo,
      yVao - alturaCasa * 0.02,
      largura * 0.3,
      alturaCasa * 0.09,
      ale(semente * 41) > 0.5 ? '#C0453C' : '#2F7A55',
    )
  }

  // O FRISO que separa os vãos da platibanda, e as PILASTRAS das divisas. As
  // pilastras são o que costura a fileira: a de uma casa encosta na da vizinha
  // e as duas leem como uma divisa só, que é como rua geminada se parece.
  const largPilastra = Math.max(1.4, largura * 0.035)
  p.fillStyle = CAL
  p.fillRect(x, yTopo, largPilastra, alturaCasa)
  p.fillRect(x + largura - largPilastra, yTopo, largPilastra, alturaCasa)
  faixaDeCal(p, x, yFriso, largura, Math.max(1.2, alturaCasa * 0.035))

  // O CORAMENTO da platibanda, um degrauzinho mais largo que a parede.
  const alturaCornija = Math.max(1.4, alturaCasa * 0.045)
  faixaDeCal(p, x - largura * 0.012, yTopo, largura * 1.024, alturaCornija)

  // Em algumas casas a platibanda é vazada em balaustrada em vez de cheia — é
  // a variação que a foto tem entre vizinhos e que impede a linha do topo de
  // virar um friso reto de ponta a ponta.
  if (ale(semente * 43 + 7) > 0.62) {
    balaustrada(p, x + largPilastra, yTopo + alturaCornija, largura - largPilastra * 2, alturaPlatibanda * 0.45)
  }

  frontao(
    p,
    x + largura / 2,
    yTopo + alturaCornija * 0.4,
    largura * (0.46 + ale(semente * 47) * 0.16),
    alturaFrontao,
    (['triangular', 'curvo', 'escalonado'] as const)[Math.floor(ale(semente * 53 + 1) * 3) % 3]!,
    fachada.parede,
    semente,
  )

  // Os pináculos dos cantos, por último, para ficarem por cima de tudo.
  const altPinaculo = alturaCasa * 0.07
  pinaculo(p, x + largPilastra * 0.5, yTopo, altPinaculo)
  pinaculo(p, x + largura - largPilastra * 0.5, yTopo, altPinaculo)

  // O embasamento: a faixa que a chuva suja. Sem ela a parede brota do chão.
  p.fillStyle = 'rgba(22,14,16,0.5)'
  p.fillRect(x, yBase - alturaCasa * 0.055, largura, alturaCasa * 0.055)
}

// ── O sobrado que ancora a praça ─────────────────────────────────────────

/**
 * O SOBRADO — dois pavimentos, sacadas de balaustrada, cornija de dentículos e
 * coroamento vazado com frontão de brasão.
 *
 * É o prédio grande da foto, e ele existe por hierarquia: numa fileira em que
 * tudo tem o mesmo porte o olho não tem onde pousar e a rua vira padrão de
 * papel de parede. Aqui ele é o mais alto, o mais largo, o mais aceso e o único
 * com sacada — quatro razões para o olho ir nele primeiro.
 */
function desenharSobrado(
  p: CanvasRenderingContext2D,
  x: number,
  yBase: number,
  largura: number,
  alturaCasa: number,
  semente: number,
): void {
  const yTopo = yBase - alturaCasa
  // Ocre carregado, como o casarão da foto: é a cor mais quente da fileira e
  // puxa o olho para o centro da praça sem precisar de mais brilho.
  const parede = '#B8934A'
  const alturaCoroamento = alturaCasa * 0.14
  const yPisoSuperior = yTopo + alturaCoroamento + alturaCasa * 0.44
  const bandas = 5

  // A telha atrás do coroamento.
  p.fillStyle = TELHA
  p.beginPath()
  p.moveTo(x + largura * 0.1, yTopo + alturaCasa * 0.02)
  p.lineTo(x + largura * 0.5, yTopo - alturaCasa * 0.055)
  p.lineTo(x + largura * 0.9, yTopo + alturaCasa * 0.02)
  p.closePath()
  p.fill()

  p.fillStyle = parede
  p.fillRect(x, yTopo, largura, alturaCasa)
  texturaDeParede(p, x, yTopo, largura, alturaCasa, { parede, azulejo: false }, semente)

  // PAVIMENTO SUPERIOR: janelões com frontãozinho próprio e sacada embaixo.
  // O frontãozinho é o que diferencia janela nobre de buraco na parede, e a
  // sacada é o que diferencia sobrado de casa alta.
  const largJanela = largura / (bandas * 2.5)
  const alturaJanela = alturaCasa * 0.3
  const yJanela = yPisoSuperior - alturaJanela
  for (let c = 0; c < bandas; c++) {
    const xj = x + (largura / (bandas + 1)) * (c + 1) - largJanela / 2
    // A maioria acesa: é o sobrado que ilumina a praça na foto, e vão aceso é a
    // única fonte de cintilação que a fileira tem à noite.
    const aceso = ale(semente * 11 + c * 5) > 0.24
    vaoAlto(p, xj, yJanela, largJanela, alturaJanela, { arco: false, aceso, porta: false, semente: semente + c })
    // O frontãozinho sobre a verga, apoiado em duas mísulas.
    const larguraOrnato = largJanela * 1.75
    p.fillStyle = CAL
    p.beginPath()
    p.moveTo(xj + largJanela / 2 - larguraOrnato / 2, yJanela - alturaJanela * 0.2)
    p.lineTo(xj + largJanela / 2, yJanela - alturaJanela * 0.36)
    p.lineTo(xj + largJanela / 2 + larguraOrnato / 2, yJanela - alturaJanela * 0.2)
    p.closePath()
    p.fill()
    // A SACADA: o parapeito vazado projetando além da janela.
    const largSacada = largJanela * 2
    balaustrada(
      p,
      xj + largJanela / 2 - largSacada / 2,
      yPisoSuperior - alturaCasa * 0.075,
      largSacada,
      alturaCasa * 0.075,
      CAL_QUENTE,
    )
    // O piso da sacada, saliente, com sombra por baixo.
    faixaDeCal(
      p,
      xj + largJanela / 2 - largSacada / 2 - 1,
      yPisoSuperior,
      largSacada + 2,
      Math.max(1.2, alturaCasa * 0.022),
      CAL_QUENTE,
    )
    // Bandeirinhas na sacada, como na foto.
    bandeirinhas(
      p,
      xj + largJanela / 2 - largSacada / 2,
      xj + largJanela / 2 + largSacada / 2,
      yPisoSuperior + alturaCasa * 0.022,
      alturaCasa * 0.035,
      semente + c,
    )
  }

  // A CORNIJA ENTRE OS PAVIMENTOS, com fileira de dentículos por baixo. A
  // 100 pixels os dentículos leem como linha tracejada — e linha tracejada é
  // exatamente a assinatura de cornija clássica que o olho reconhece.
  faixaDeCal(p, x - largura * 0.008, yPisoSuperior + alturaCasa * 0.03, largura * 1.016, Math.max(1.4, alturaCasa * 0.028))
  const passoDent = Math.max(2.2, largura * 0.022)
  p.fillStyle = CAL
  for (let dx = x; dx < x + largura; dx += passoDent) {
    p.fillRect(dx, yPisoSuperior + alturaCasa * 0.062, passoDent * 0.5, Math.max(0.9, alturaCasa * 0.016))
  }

  // PAVIMENTO TÉRREO: portas em arco pleno, altas, quase até o chão.
  const yPorta = yPisoSuperior + alturaCasa * 0.11
  const alturaPorta = yBase - yPorta - alturaCasa * 0.04
  const largPorta = largura / (bandas * 2.3)
  for (let c = 0; c < bandas; c++) {
    const xp = x + (largura / (bandas + 1)) * (c + 1) - largPorta / 2
    const sorte = ale(semente * 19 + c * 7)
    vaoAlto(p, xp, yPorta, largPorta, alturaPorta, {
      arco: true,
      aceso: sorte > 0.68,
      porta: true,
      semente: semente + c * 3,
    })
  }

  // As pilastras dos cantos, mais largas que as das casas térreas — é a
  // largura da pilastra que dá peso ao prédio.
  const largPilastra = Math.max(2, largura * 0.022)
  p.fillStyle = CAL
  p.fillRect(x, yTopo, largPilastra, alturaCasa)
  p.fillRect(x + largura - largPilastra, yTopo, largPilastra, alturaCasa)

  // O COROAMENTO vazado em balaustrada, de ponta a ponta.
  faixaDeCal(p, x - largura * 0.012, yTopo, largura * 1.024, Math.max(1.4, alturaCasa * 0.03))
  balaustrada(
    p,
    x + largPilastra,
    yTopo + alturaCasa * 0.038,
    largura - largPilastra * 2,
    alturaCoroamento * 0.55,
  )
  faixaDeCal(p, x, yTopo + alturaCoroamento * 0.62, largura, Math.max(1, alturaCasa * 0.02))

  // O FRONTÃO CENTRAL com o brasão, subindo além do coroamento. É o ponto mais
  // alto de toda a fileira, e é ele que faz o prédio ancorar a praça.
  const largFrontao = largura * 0.34
  frontao(p, x + largura / 2, yTopo + alturaCasa * 0.02, largFrontao, alturaCasa * 0.15, 'triangular', parede, semente * 3)

  // Pináculos: nos cantos e nos ombros do frontão.
  const altPinaculo = alturaCasa * 0.06
  pinaculo(p, x + largPilastra, yTopo, altPinaculo)
  pinaculo(p, x + largura - largPilastra, yTopo, altPinaculo)
  pinaculo(p, x + largura / 2 - largFrontao / 2, yTopo + alturaCasa * 0.02, altPinaculo * 0.8)
  pinaculo(p, x + largura / 2 + largFrontao / 2, yTopo + alturaCasa * 0.02, altPinaculo * 0.8)

  // O embasamento em cantaria, mais alto que o das casas térreas.
  p.fillStyle = 'rgba(20,12,14,0.45)'
  p.fillRect(x, yBase - alturaCasa * 0.045, largura, alturaCasa * 0.045)
}

// ── A capela ─────────────────────────────────────────────────────────────

/**
 * A CAPELA — vão central em arco pleno, alto, ladeado por dois menores.
 *
 * Toda praça de interior tem uma, e o desenho dela é a mesma casa térrea com o
 * ritmo trocado: em vez de três vãos iguais, um grande no meio. Basta essa
 * troca de ritmo para o prédio deixar de ser residência.
 */
function desenharCapela(
  p: CanvasRenderingContext2D,
  x: number,
  yBase: number,
  largura: number,
  alturaCasa: number,
  semente: number,
): void {
  const yTopo = yBase - alturaCasa
  const parede = '#9A5A62'
  p.fillStyle = TELHA
  p.beginPath()
  p.moveTo(x + largura * 0.08, yTopo + alturaCasa * 0.04)
  p.lineTo(x + largura * 0.5, yTopo - alturaCasa * 0.06)
  p.lineTo(x + largura * 0.92, yTopo + alturaCasa * 0.04)
  p.closePath()
  p.fill()

  p.fillStyle = parede
  p.fillRect(x, yTopo, largura, alturaCasa)
  texturaDeParede(p, x, yTopo, largura, alturaCasa, { parede, azulejo: true }, semente)

  // O portal central e as duas frestas laterais.
  const largPortal = largura * 0.26
  const yPortal = yTopo + alturaCasa * 0.36
  vaoAlto(p, x + largura / 2 - largPortal / 2, yPortal, largPortal, yBase - yPortal - alturaCasa * 0.06, {
    arco: true,
    aceso: false,
    porta: true,
    semente,
  })
  const largLado = largura * 0.13
  for (const lado of [-1, 1]) {
    const yLado = yTopo + alturaCasa * 0.46
    vaoAlto(p, x + largura / 2 + lado * largura * 0.29 - largLado / 2, yLado, largLado, yBase - yLado - alturaCasa * 0.1, {
      arco: true,
      aceso: lado > 0,
      porta: false,
      semente: semente + lado,
    })
  }

  const largPilastra = Math.max(1.6, largura * 0.03)
  p.fillStyle = CAL
  p.fillRect(x, yTopo, largPilastra, alturaCasa)
  p.fillRect(x + largura - largPilastra, yTopo, largPilastra, alturaCasa)
  faixaDeCal(p, x - largura * 0.012, yTopo, largura * 1.024, Math.max(1.4, alturaCasa * 0.04))
  frontao(p, x + largura / 2, yTopo + alturaCasa * 0.02, largura * 0.68, alturaCasa * 0.19, 'triangular', parede, semente + 4)
  pinaculo(p, x + largPilastra * 0.6, yTopo, alturaCasa * 0.08)
  pinaculo(p, x + largura - largPilastra * 0.6, yTopo, alturaCasa * 0.08)
  p.fillStyle = 'rgba(22,14,16,0.5)'
  p.fillRect(x, yBase - alturaCasa * 0.05, largura, alturaCasa * 0.05)
}

// ── O fundo da rua ───────────────────────────────────────────────────────

/**
 * A SEGUNDA FILEIRA, atrás da primeira.
 *
 * Sem ela a rua é um recorte de papel de uma camada só: o topo das casas encosta
 * direto no céu de ponta a ponta e a cidade acaba ali. Um punhado de empenas
 * mais altas e mais escuras espiando por cima, mais duas massas de árvore, e o
 * casario passa a ter uma quadra atrás dele. Custa quase nada porque nada disso
 * precisa de detalhe — é tudo silhueta, e silhueta é o que se vê do que está
 * longe à noite.
 */
function desenharFundoDaRua(
  p: CanvasRenderingContext2D,
  largura: number,
  yBase: number,
  alturaTipo: number,
  semente: number,
): void {
  for (let n = 0; n < 9; n++) {
    const x = largura * (0.02 + n * 0.115 + ale(semente + n * 7) * 0.04)
    const w = largura * (0.05 + ale(semente + n * 11) * 0.05)
    const h = alturaTipo * (1.15 + ale(semente + n * 13) * 0.55)
    p.fillStyle = n % 2 === 0 ? '#2B3140' : '#333748'
    p.fillRect(x, yBase - h, w, h)
    // Um friso claro no topo: mesmo em silhueta, a platibanda tem que aparecer,
    // senão o volume lê como prédio moderno de laje.
    p.fillStyle = 'rgba(180,172,158,0.35)'
    p.fillRect(x - w * 0.02, yBase - h, w * 1.04, Math.max(1, h * 0.035))
    // Uma janela acesa aqui e ali, bem fraca — é o que diz que tem cidade atrás.
    if (ale(semente + n * 17) > 0.5) {
      p.fillStyle = 'rgba(255,190,110,0.4)'
      p.fillRect(x + w * 0.4, yBase - h * 0.7, Math.max(1, w * 0.1), Math.max(1, h * 0.11))
    }
  }

  // As massas de árvore entre as empenas, como as da foto.
  for (const [fx, escala] of [
    [0.09, 1],
    [0.47, 0.78],
    [0.79, 1.1],
  ] as const) {
    const cx = largura * fx
    const r = alturaTipo * 0.42 * escala
    p.fillStyle = '#1E2A26'
    for (let i = 0; i < 6; i++) {
      p.beginPath()
      p.arc(
        cx + (ale(semente + i * 3 + fx * 100) - 0.5) * r * 2.6,
        yBase - alturaTipo * 0.95 - ale(semente + i * 5 + fx * 100) * r * 0.9,
        r * (0.5 + ale(semente + i * 7 + fx * 100) * 0.5),
        0,
        Math.PI * 2,
      )
      p.fill()
    }
  }
}

// ── A fileira ────────────────────────────────────────────────────────────

/**
 * A RUA INTEIRA, de borda a borda.
 *
 * Duas decisões carregam o resultado:
 *
 * — As casas ENCOSTAM (o passo é a largura da casa, sem folga). Rua colonial é
 *   geminada; qualquer vão entre vizinhos e a fileira vira brinquedo de montar.
 *   Nas pontas ela sai da tela, porque rua que termina dentro do quadro lê como
 *   maquete.
 *
 * — Os dois prédios especiais têm ENDEREÇO FIXO (sobrado à esquerda do centro,
 *   capela à direita), e não são sorteados. Hierarquia não pode depender de
 *   sorte: se o sorteio empilhasse os dois no mesmo canto, metade da praça
 *   ficaria sem nada para o olho pousar.
 */
export function desenharCasario(
  pincel: CanvasRenderingContext2D,
  largura: number,
  altura: number,
  yBase: number,
): void {
  if (largura <= 0 || altura <= 0) return

  // A casa térrea média mede pouco mais de 10% da altura do quadro; o sobrado,
  // com o frontão, chega perto de 22%. É a faixa em que a fileira ainda deixa
  // céu suficiente para o título da dobra respirar.
  const alturaTipo = altura * 0.105

  pincel.save()
  desenharFundoDaRua(pincel, largura, yBase, alturaTipo, 91)

  const xSobrado = largura * 0.3
  const xCapela = largura * 0.72
  let sobradoFeito = false
  let capelaFeita = false
  let x = -largura * 0.04
  let n = 0

  while (x < largura * 1.04 && n < 40) {
    let larguraCasa: number

    if (!sobradoFeito && x + largura * 0.07 >= xSobrado) {
      larguraCasa = largura * 0.185
      desenharSobrado(pincel, x, yBase, larguraCasa, alturaTipo * 1.72, n * 3 + 5)
      sobradoFeito = true
    } else if (!capelaFeita && x + largura * 0.07 >= xCapela) {
      larguraCasa = largura * 0.1
      desenharCapela(pincel, x, yBase, larguraCasa, alturaTipo * 1.32, n * 3 + 11)
      capelaFeita = true
    } else {
      larguraCasa = largura * (0.055 + ale(n * 13 + 7) * 0.032)
      // Altura variada de vizinho para vizinho: é a linha de topo irregular que
      // faz a fileira ler como rua que foi crescendo, e não como empreendimento.
      const alturaCasa = alturaTipo * (0.84 + ale(n * 17 + 11) * 0.42)
      desenharCasaTerrea(
        pincel,
        x,
        yBase,
        larguraCasa,
        alturaCasa,
        // Passo 3 na lista de cores: garante que dois vizinhos nunca caiam na
        // mesma fachada nem em duas parecidas, que é o que a foto mostra.
        FACHADAS[(n * 3) % FACHADAS.length]!,
        n * 7 + 3,
      )
    }

    x += larguraCasa
    n++
  }

  // A BRUMA das pontas. A rua não acaba na borda do quadro; ela some. Um véu
  // que engrossa para os dois lados dá esse fim sem cortar nada, e de quebra
  // tira das bordas o contraste que competiria com o texto da dobra.
  const bruma = pincel.createLinearGradient(0, 0, largura, 0)
  bruma.addColorStop(0, 'rgba(22,26,44,0.6)')
  bruma.addColorStop(0.2, 'rgba(22,26,44,0)')
  bruma.addColorStop(0.8, 'rgba(22,26,44,0)')
  bruma.addColorStop(1, 'rgba(22,26,44,0.6)')
  pincel.fillStyle = bruma
  pincel.fillRect(0, yBase - alturaTipo * 2.4, largura, alturaTipo * 2.4)

  // O PÉ DA RUA: a sombra rente ao chão e, logo acima dela, o âmbar da festa
  // batendo nas fachadas. É o par que assenta o casario no calçamento — sem a
  // sombra as casas flutuam, sem o âmbar elas não pertencem à mesma noite que
  // as fogueiras e as barracas na frente.
  const pe = pincel.createLinearGradient(0, yBase - alturaTipo * 0.34, 0, yBase)
  pe.addColorStop(0, 'rgba(255,158,68,0.09)')
  pe.addColorStop(1, 'rgba(14,10,14,0.5)')
  pincel.fillStyle = pe
  pincel.fillRect(0, yBase - alturaTipo * 0.34, largura, alturaTipo * 0.34)

  // O HALO das janelas acesas, aditivo e assado junto. É a única cintilação da
  // fileira e o motivo de ela não sumir contra o céu: a esta distância o olho
  // não vê a janela, vê o borrão de luz em volta dela.
  pincel.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 22; i++) {
    const hx = largura * (0.02 + ale(i * 29 + 3) * 0.96)
    const hy = yBase - alturaTipo * (0.35 + ale(i * 31 + 5) * 0.95)
    const raio = alturaTipo * (0.16 + ale(i * 37 + 7) * 0.2)
    const halo = pincel.createRadialGradient(hx, hy, 0, hx, hy, raio)
    halo.addColorStop(0, 'rgba(255,190,110,0.14)')
    halo.addColorStop(1, 'rgba(255,160,70,0)')
    pincel.fillStyle = halo
    pincel.beginPath()
    pincel.arc(hx, hy, raio, 0, Math.PI * 2)
    pincel.fill()
  }
  pincel.restore()
}
