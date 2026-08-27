/**
 * OS FOGOS DE ARTIFÍCIO sobre a praça.
 *
 * É a única coisa que um céu de São João tem e que esta cena não tinha. Sem
 * eles o céu é fundo; com eles o céu é o lugar onde alguma coisa acontece — e
 * a diferença não está no brilho, está na SEQUÊNCIA.
 *
 * UM FOGO É UMA SEQUÊNCIA, NÃO UM BRILHO. Três fases, e cada uma tem física
 * própria:
 *
 *   1. SUBIDA — um ponto que sobe DESACELERANDO. Vale mais que a explosão:
 *      é o momento em que ele perde velocidade que avisa o olho que vai
 *      estourar. Sem subida, a explosão aparece do nada e lê como cintilha.
 *   2. EXPLOSÃO — as estrelas saem rápido e freiam contra o ar. A velocidade
 *      radial DECAI (arrasto), nunca se mantém. Partícula em velocidade
 *      constante desenha um círculo crescendo, que é anel, não flor.
 *   3. QUEDA — gasto o empurrão, sobra gravidade, e os rastros VIRAM PARA
 *      BAIXO. Um estouro cujas partículas saem retas e apagam lê como
 *      dente-de-leão; é a curva final que faz virar fogo de artifício.
 *
 * E O RASTRO é a maior parte do que se vê: a estrela em si é um pixel, o que
 * o olho lê como fogo é a esteira que ela deixa. Por isso cada partícula é
 * desenhada como uma sucessão de elos amostrados no PASSADO da mesma função
 * de posição — o rastro entorta junto com a trajetória porque É a trajetória.
 *
 * DETERMINÍSTICO. Nada de `Math.random`, nada de `Date.now`: tudo é função de
 * `agora` e de uma semente, então uma captura feita em `t` descreve o que
 * qualquer visitante vê em `t` — e um teste pode fixar o relógio.
 *
 * ESPARSOS, E É REGRA, NÃO ESTILO. Um ou dois no ar por vez, com silêncio
 * entre eles. Céu continuamente cheio de fogo vira protetor de tela, e este
 * céu fica atrás do título de uma dobra: quem está lendo não pode ter luz
 * piscando no canto do olho. Pelo mesmo motivo eles moram todos à DIREITA e
 * no ALTO — a coluna de texto ocupa os 45% da esquerda nos 60% de cima.
 *
 * BARATO. Isto desenha a 60Hz numa página que já tem orçamento de quadro
 * apertado. As duas economias que sustentam o arquivo:
 *   • NENHUM GRADIENTE POR PARTÍCULA. O único gradiente é o clarão — um por
 *     estouro, e só durante os ~340ms em que ele existe. Esse erro já foi
 *     cometido neste repositório e custou um terço da taxa de quadros.
 *   • RASTROS EM LOTE. Sob arrasto linear a constante de tempo é a MESMA para
 *     todas as estrelas (τ = m/b, não depende da velocidade inicial), então o
 *     fator de expansão e a queda são calculados 4 vezes por estouro — não 4
 *     vezes por partícula — e todos os elos de mesma idade e mesma cor entram
 *     num `Path2D` implícito só, com um `stroke()` no fim.
 */

/** Determinístico: os fogos são função do relógio, nunca de `Math.random`.
 *  Mesma receita do resto da praça, para que uma semente signifique a mesma
 *  coisa em todos os arquivos do tema. */
function ale(semente: number): number {
  const x = Math.sin(semente * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

// ── Cadência ────────────────────────────────────────────────────────────

/** Intervalo base entre lançamentos. Com a vida média de um fogo em ~3,4s e
 *  uma pausa sorteada a cada três, isso dá ~1 no ar por vez e silêncios de
 *  vários segundos — a densidade de uma queima de verdade, não a de um GIF. */
const INTERVALO_MS = 2400
/** Fração dos lançamentos que simplesmente não acontece. É o que cria o
 *  SILÊNCIO: sem ela a cadência fica métrica, e cadência métrica é a coisa
 *  que mais denuncia fogo gerado por programa. */
const CHANCE_PAUSA = 0.34
/** Teto folgado da vida de um fogo (subida + explosão + atraso da salva).
 *  Serve só para saber quantos lançamentos passados ainda podem estar no ar. */
const VIDA_MAX_MS = 7000

const SUBIDA_MIN_MS = 820
const SUBIDA_VAR_MS = 640
const EXPLOSAO_MIN_MS = 1700
const EXPLOSAO_VAR_MS = 1500

// ── Física ──────────────────────────────────────────────────────────────

/**
 * Constante de tempo do arrasto, em ms.
 *
 * A estrela sai a `v0` e o ar a freia: `v(t) = v0·e^(−t/τ)`, o que integrado
 * dá `r(t) = v0·τ·(1 − e^(−t/τ))`. Ou seja: o empurrão se GASTA, e o raio
 * satura. Em ~430ms a flor já abriu 60% do que vai abrir, em 1,2s está toda
 * aberta — daí para frente só a gravidade trabalha, e é aí que ela vira
 * chuva. Esse é o desenho inteiro do estouro em uma constante.
 */
const TAU_MS = 430

/** Quantas amostras no tempo formam uma partícula: a cabeça e três elos de
 *  rastro atrás dela. */
const ELOS = 4
/** Distância no TEMPO entre um elo e o próximo. Ser no tempo (e não no
 *  espaço) é o que faz o rastro encurtar sozinho conforme a estrela freia —
 *  exatamente o que uma esteira real faz. */
const RASTRO_PASSO_MS = 78

/** Duração do clarão do estouro. Curto de propósito: é o rompimento da
 *  carcaça, não uma lâmpada. */
const CLARAO_MS = 340

// ── Onde eles cabem ─────────────────────────────────────────────────────

/**
 * A faixa em que um estouro pode nascer, em fração da tela.
 *
 * Toda à direita e toda no alto, e isso é restrição do produto, não gosto: o
 * título da dobra vive nos 45% da esquerda / 60% de cima, e luz pulsando atrás
 * de texto é a diferença entre um fundo e um estorvo. O limite esquerdo já
 * considera o raio máximo do estouro — a borda da flor mais larga ainda para
 * a meia tela.
 */
const X_MIN = 0.6
const X_MAX = 0.93
const Y_MIN = 0.1
const Y_MAX = 0.4

/** De onde o foguete parte: abaixo do horizonte (0,63), ou seja, de dentro da
 *  cidade. Nunca aparece ali — serve só para o arco ter a altura certa. */
const Y_LANCAMENTO = 0.66
/**
 * Acima desta linha o foguete passa a ser desenhado.
 *
 * Como esta camada é pintada POR CIMA do sprite da praça, um foguete
 * desenhado na altura do casario passaria na frente das casas. Cortar a
 * subida aqui resolve o empilhamento e, de brinde, dá a leitura certa: ele
 * SURGE de trás dos morros, como quem foi solto de um quintal do outro lado.
 */
const Y_EMERGE = 0.54

/**
 * As cores, em pares: o corpo do estouro e a ponta.
 *
 * São as cores que metal queimado dá de verdade — estrôncio vermelho, bário
 * verde, cobre azul, sódio dourado —, que por sorte são também as da bandeirola
 * da foto de referência. Guardadas como `"r,g,b"` para montar `rgba(...)` sem
 * alocar objeto de cor nem gradiente.
 */
const CORES = [
  ['255,198,86', '255,96,72'], // ouro de sódio com ponta vermelha
  ['124,232,176', '255,240,190'], // verde de bário faiscando branco
  ['128,184,255', '236,214,255'], // azul de cobre com ponta lilás
  ['255,123,200', '255,214,120'], // magenta com miolo dourado
  ['255,150,60', '255,244,214'], // laranja brasa, a cor da fogueira lá embaixo
  ['214,236,255', '255,255,255'], // crisântemo de prata
] as const

/** Teto de partículas por estouro — o tamanho dos rascunhos reaproveitados. */
const MAX_PARTICULAS = 60

/**
 * Rascunhos de módulo, preenchidos uma vez por estouro por quadro.
 *
 * Cosseno, seno e velocidade de cada estrela não mudam ao longo do rastro, e
 * recalculá-los dentro dos seis laços de traçado sairia a ~600 chamadas de
 * trigonometria por estouro por quadro. Aqui saem 60. Viver no módulo (e não
 * na função) é o que evita alocar arranjo novo a cada quadro.
 */
const P_COS = new Float64Array(MAX_PARTICULAS)
const P_SEN = new Float64Array(MAX_PARTICULAS)
const P_VEL = new Float64Array(MAX_PARTICULAS)
/** Fator de expansão e queda por elo — 4 números que valem para TODAS as
 *  partículas, porque sob arrasto linear τ é o mesmo para todo mundo. */
const ELO_EXPANSAO = new Float64Array(ELOS)
const ELO_QUEDA = new Float64Array(ELOS)

type Fogo = {
  /** Instante do lançamento, no mesmo relógio de `agora`. */
  nascimento: number
  /** Quanto dura a subida. */
  subida: number
  /** Quanto dura a explosão, do estouro até a última brasa apagar. */
  vida: number
  /** Onde ele estoura — e, portanto, o ápice do arco de subida. */
  cx: number
  cy: number
  /** De onde saiu do chão. Diferente de `cx` porque foguete nenhum sobe reto. */
  x0: number
  yLancamento: number
  raio: number
  particulas: number
  cor: readonly [string, string]
  /** Velocidade terminal das brasas, px/ms. É o que faz a flor virar chuva. */
  terminal: number
  semente: number
}

/**
 * Sorteia um fogo a partir de uma semente.
 *
 * Tudo varia: altura, cor, tamanho, número de estrelas, quanto pesa a brasa.
 * Dois estouros iguais são o que faz uma queima parecer gerada — e no céu de
 * verdade nem dois tiros da mesma bateria abrem igual.
 */
function montarFogo(
  semente: number,
  nascimento: number,
  largura: number,
  altura: number,
): Fogo {
  const menorLado = Math.min(largura, altura)
  const cx = largura * (X_MIN + ale(semente * 3.1 + 4.2) * (X_MAX - X_MIN))
  const cy = altura * (Y_MIN + ale(semente * 5.3 + 8.7) * (Y_MAX - Y_MIN))
  return {
    nascimento,
    subida: SUBIDA_MIN_MS + ale(semente * 7.7 + 12.1) * SUBIDA_VAR_MS,
    vida: EXPLOSAO_MIN_MS + ale(semente * 9.1 + 16.4) * EXPLOSAO_VAR_MS,
    cx,
    cy,
    // A deriva da subida: o tubo nunca está a prumo, e um foguete que sobe
    // numa vertical perfeita lê como elevador.
    x0: cx + (ale(semente * 11.3 + 20.8) - 0.5) * largura * 0.055,
    yLancamento: altura * Y_LANCAMENTO,
    raio: menorLado * (0.062 + ale(semente * 13.7 + 25.3) * 0.072),
    particulas: 24 + Math.floor(ale(semente * 15.9 + 29.6) * (MAX_PARTICULAS - 24)),
    cor: CORES[Math.floor(ale(semente * 17.3 + 33.9) * CORES.length)]!,
    // Brasa mais pesada cai mais rápido; a variação é o que impede que todos
    // os estouros desabem no mesmo ritmo.
    terminal: menorLado * (0.000075 + ale(semente * 19.7 + 38.2) * 0.00007),
    semente,
  }
}

// ── A subida ────────────────────────────────────────────────────────────

/** Rascunhos da subida: as posições dos elos, sem alocar por quadro. */
const SUB_X = new Float64Array(ELOS)
const SUB_Y = new Float64Array(ELOS)

/**
 * O FOGUETE SUBINDO — e desacelerando.
 *
 * `1 − (1 − k)²` não é uma curva de suavização escolhida por gosto: é
 * literalmente `v₀t − gt²/2` reescrito para chegar ao ápice com velocidade
 * ZERO em k = 1. Por isso ele vai morrendo perto do topo, e é essa morrida que
 * o olho lê como "vai estourar agora" — a única antecipação que existe na
 * peça. Na horizontal o movimento é uniforme, porque de fato não há força
 * horizontal nenhuma agindo nele.
 *
 * O rastro encurta sozinho: os elos são amostrados a intervalos de TEMPO
 * fixos, então quanto mais devagar ele anda, mais juntos eles ficam.
 */
function desenharSubida(
  pincel: CanvasRenderingContext2D,
  fogo: Fogo,
  t: number,
  altura: number,
  menorLado: number,
): void {
  const yEmerge = altura * Y_EMERGE
  const alcance = fogo.yLancamento - fogo.cy
  const passo = RASTRO_PASSO_MS / fogo.subida

  for (let j = 0; j < ELOS; j++) {
    const k = Math.max(0, t / fogo.subida - j * passo)
    SUB_X[j] = fogo.x0 + (fogo.cx - fogo.x0) * k
    SUB_Y[j] = fogo.yLancamento - alcance * (1 - (1 - k) ** 2)
  }

  // Só existe acima da linha do casario: abaixo dela ele está atrás da cidade.
  if (SUB_Y[0]! > yEmerge) return

  // A vela crepita: a luz de um propelente queimando não é constante. Como é
  // função de `t`, continua determinístico.
  const tremor = 0.74 + 0.26 * Math.sin(t * 0.047 + fogo.semente * 6.283)
  const grossura = Math.max(1, menorLado * 0.0034)

  pincel.lineWidth = grossura
  for (let j = ELOS - 1; j >= 1; j--) {
    const yA = SUB_Y[j]!
    const yB = SUB_Y[j - 1]!
    // Elo que ainda está atrás dos morros não entra.
    if (yA > yEmerge || yB > yEmerge) continue
    const alfa = tremor * 0.5 * (1 - (j - 1) / ELOS) ** 1.6
    pincel.strokeStyle = `rgba(255,206,140,${alfa.toFixed(3)})`
    pincel.beginPath()
    pincel.moveTo(SUB_X[j]!, yA)
    pincel.lineTo(SUB_X[j - 1]!, yB)
    pincel.stroke()
  }

  // As FAÍSCAS que se desprendem da esteira e ficam para trás. Custam um
  // caminho e um preenchimento, e são metade do que faz a subida parecer
  // combustão em vez de um ponto animado.
  pincel.fillStyle = `rgba(255,176,96,${(tremor * 0.42).toFixed(3)})`
  pincel.beginPath()
  for (let s = 0; s < 4; s++) {
    const desvio = ale(fogo.semente * 23.1 + s * 4.7 + Math.floor(t / 90))
    const ao_longo = 0.35 + s * 0.22
    const x = SUB_X[0]! + (SUB_X[ELOS - 1]! - SUB_X[0]!) * ao_longo + (desvio - 0.5) * grossura * 5
    const y = SUB_Y[0]! + (SUB_Y[ELOS - 1]! - SUB_Y[0]!) * ao_longo + (desvio - 0.5) * grossura * 3
    if (y > yEmerge) continue
    pincel.rect(x, y, grossura * 0.8, grossura * 0.8)
  }
  pincel.fill()

  // A cabeça: um miolo quase branco com um halo morno em volta. Dois
  // preenchimentos chapados, nunca um gradiente — a 60Hz o gradiente aqui
  // seria pago por todo foguete de toda subida.
  const raioCabeca = grossura * 1.5
  pincel.fillStyle = `rgba(255,150,80,${(tremor * 0.3).toFixed(3)})`
  pincel.beginPath()
  pincel.arc(SUB_X[0]!, SUB_Y[0]!, raioCabeca * 2.6, 0, Math.PI * 2)
  pincel.fill()
  pincel.fillStyle = `rgba(255,242,214,${tremor.toFixed(3)})`
  pincel.beginPath()
  pincel.arc(SUB_X[0]!, SUB_Y[0]!, raioCabeca, 0, Math.PI * 2)
  pincel.fill()
}

// ── A explosão ──────────────────────────────────────────────────────────

/**
 * O ESTOURO: expansão com arrasto, depois queda.
 *
 * Posição de uma estrela no instante `t` do estouro:
 *
 *     r(t) = R · (1 − e^(−t/τ))            ← o empurrão gastando-se no ar
 *     y(t) = … + vT · (t − τ·(1 − e^(−t/τ)))  ← gravidade com arrasto
 *
 * A segunda começa quadrática (queda livre, enquanto o ar ainda não importa) e
 * termina linear (velocidade terminal). É por isso que o rastro entorta: ele
 * é a MESMA função amostrada em quatro instantes, e uma trajetória que muda de
 * direção arrasta a esteira junto.
 *
 * O clarão vem primeiro e some rápido — o céu ao redor acende por um terço de
 * segundo, e é o único gradiente do arquivo.
 */
function desenharExplosao(
  pincel: CanvasRenderingContext2D,
  fogo: Fogo,
  t: number,
  menorLado: number,
): void {
  const idade = t / fogo.vida
  if (idade >= 1) return

  const [corA, corB] = fogo.cor

  // O CLARÃO. Acende de estalo e apaga com o quadrado do tempo, como a bola de
  // fogo esfriando. Um gradiente por estouro, só nos primeiros 340ms de uma
  // vida de ~3s: na esmagadora maioria dos quadros este bloco nem roda.
  if (t < CLARAO_MS) {
    const u = t / CLARAO_MS
    const alfa = 0.4 * (1 - u) ** 2
    const raioClarao = fogo.raio * (1.05 + u * 1.3)
    const g = pincel.createRadialGradient(fogo.cx, fogo.cy, 0, fogo.cx, fogo.cy, raioClarao)
    g.addColorStop(0, `rgba(255,250,236,${alfa.toFixed(4)})`)
    g.addColorStop(0.28, `rgba(${corA},${(alfa * 0.55).toFixed(4)})`)
    g.addColorStop(1, `rgba(${corA},0)`)
    pincel.fillStyle = g
    pincel.beginPath()
    pincel.arc(fogo.cx, fogo.cy, raioClarao, 0, Math.PI * 2)
    pincel.fill()

    // O miolo branco do rompimento da carcaça: some antes do clarão, porque
    // ele é o instante em que a carga pega, não a bola de fogo.
    if (u < 0.42) {
      pincel.fillStyle = `rgba(255,252,244,${(0.85 * (1 - u / 0.42) ** 1.5).toFixed(3)})`
      pincel.beginPath()
      pincel.arc(fogo.cx, fogo.cy, fogo.raio * 0.3 * (1 - u / 0.42), 0, Math.PI * 2)
      pincel.fill()
    }
  }

  // Queima forte e apaga no último terço — brasa não desbota linearmente, ela
  // se mantém e acaba.
  const alfaBase = Math.min(1, 2.4 * (1 - idade) ** 1.3)
  if (alfaBase <= 0.01) return

  // Os quatro instantes do rastro, calculados UMA vez para o estouro inteiro.
  for (let j = 0; j < ELOS; j++) {
    const tj = Math.max(0, t - j * RASTRO_PASSO_MS)
    const expansao = 1 - Math.exp(-tj / TAU_MS)
    ELO_EXPANSAO[j] = expansao
    ELO_QUEDA[j] = fogo.terminal * (tj - TAU_MS * expansao)
  }

  // Ângulo e velocidade de cada estrela: fixos ao longo de toda a vida dela.
  const n = fogo.particulas
  const fatia = (Math.PI * 2) / n
  for (let i = 0; i < n; i++) {
    // Passo angular regular MAIS um empurrão sorteado: espaçamento perfeito
    // desenha uma roda de bicicleta, e roda de bicicleta é o que uma flor de
    // fogo justamente não é.
    const ang = i * fatia + (ale(fogo.semente * 21.7 + i * 1.31) - 0.5) * fatia * 1.7
    P_COS[i] = Math.cos(ang)
    P_SEN[i] = Math.sin(ang)
    // Enviesado para o alto: a casca da bomba concentra estrelas na borda, e
    // as poucas lentas viram o miolo.
    P_VEL[i] = fogo.raio * (0.34 + 0.7 * ale(fogo.semente * 27.3 + i * 2.17) ** 0.55)
  }

  const grossura = Math.max(1, menorLado * 0.0032)

  // OS RASTROS, do elo mais velho para o mais novo, e agrupados por cor: todos
  // os elos de mesma idade e mesma cor cabem num caminho só, com um `stroke()`
  // no fim. Seis traçados por estouro, não seis por partícula.
  for (let j = ELOS - 1; j >= 1; j--) {
    const desbota = (1 - (j - 1) / ELOS) ** 1.7
    for (let grupo = 0; grupo < 2; grupo++) {
      pincel.lineWidth = grossura * (grupo === 0 ? 1 : 0.75)
      pincel.strokeStyle = `rgba(${grupo === 0 ? corA : corB},${(alfaBase * 0.62 * desbota).toFixed(3)})`
      pincel.beginPath()
      for (let i = 0; i < n; i++) {
        // Uma em cada três estrelas leva a cor da ponta. É o que dá ao estouro
        // duas temperaturas em vez de uma chapada.
        if ((i % 3 === 0 ? 1 : 0) !== grupo) continue
        const v = P_VEL[i]!
        const c = P_COS[i]!
        const s = P_SEN[i]!
        pincel.moveTo(fogo.cx + c * v * ELO_EXPANSAO[j]!, fogo.cy + s * v * ELO_EXPANSAO[j]! + ELO_QUEDA[j]!)
        pincel.lineTo(
          fogo.cx + c * v * ELO_EXPANSAO[j - 1]!,
          fogo.cy + s * v * ELO_EXPANSAO[j - 1]! + ELO_QUEDA[j - 1]!,
        )
      }
      pincel.stroke()
    }
  }

  // AS CABEÇAS. Quadradinhos, não círculos: com 1 a 2 pixels de lado ninguém
  // distingue, e `rect` num caminho só custa uma fração de um `arc` por
  // estrela. Um preenchimento por grupo de cor.
  for (let grupo = 0; grupo < 2; grupo++) {
    const lado = grossura * (grupo === 0 ? 1.5 : 1.1)
    pincel.fillStyle = `rgba(${grupo === 0 ? corA : corB},${alfaBase.toFixed(3)})`
    pincel.beginPath()
    for (let i = 0; i < n; i++) {
      if ((i % 3 === 0 ? 1 : 0) !== grupo) continue
      const v = P_VEL[i]!
      pincel.rect(
        fogo.cx + P_COS[i]! * v * ELO_EXPANSAO[0]! - lado / 2,
        fogo.cy + P_SEN[i]! * v * ELO_EXPANSAO[0]! + ELO_QUEDA[0]! - lado / 2,
        lado,
        lado,
      )
    }
    pincel.fill()
  }

  // A CREPITAÇÃO do fim: quando a estrela está acabando ela pisca, e um punhado
  // delas pisca fora de fase. Dois grupos de fase — o suficiente para não
  // parecer que o estouro inteiro pulsa junto, e barato o bastante para caber.
  if (idade > 0.34) {
    const forca = Math.min(1, (idade - 0.34) * 3) * alfaBase
    for (let fase = 0; fase < 2; fase++) {
      const pisca = 0.5 + 0.5 * Math.sin(t * 0.031 + fase * 2.1 + fogo.semente)
      pincel.fillStyle = `rgba(255,246,226,${(forca * pisca * 0.8).toFixed(3)})`
      pincel.beginPath()
      for (let i = fase; i < n; i += 7) {
        const v = P_VEL[i]!
        pincel.rect(
          fogo.cx + P_COS[i]! * v * ELO_EXPANSAO[0]! - grossura,
          fogo.cy + P_SEN[i]! * v * ELO_EXPANSAO[0]! + ELO_QUEDA[0]! - grossura,
          grossura * 2,
          grossura * 2,
        )
      }
      pincel.fill()
    }
  }
}

/** Despacha um fogo para a fase em que ele está. */
function desenharFogo(
  pincel: CanvasRenderingContext2D,
  fogo: Fogo,
  agora: number,
  altura: number,
  menorLado: number,
): void {
  const t = agora - fogo.nascimento
  if (t < 0) return
  if (t < fogo.subida) {
    desenharSubida(pincel, fogo, t, altura, menorLado)
    return
  }
  desenharExplosao(pincel, fogo, t - fogo.subida, menorLado)
}

// ── A pose de movimento reduzido ────────────────────────────────────────

/**
 * O que se vê com `prefers-reduced-motion: reduce`.
 *
 * Obedecer não é congelar no quadro em que a preferência foi lida: isso
 * deixaria, com sorte, um ponto sem sentido subindo no meio do céu — e um
 * foguete parado no meio da subida não é uma fotografia de nada.
 *
 * A pose é ESCOLHIDA: duas flores abertas, e nenhum foguete no ar. Uma jovem
 * (~420ms), redonda, com as pontas começando a vergar; outra velha (~1250ms),
 * já desabando em chuva e apagando. Juntas elas contam as três fases sem que
 * nada precise se mexer — é a fotografia que um jornal publicaria da queima,
 * e é exatamente por isso que ela funciona parada.
 */
function desenharPose(
  pincel: CanvasRenderingContext2D,
  largura: number,
  altura: number,
  menorLado: number,
): void {
  const jovem = montarFogo(3, 0, largura, altura)
  jovem.cx = largura * 0.72
  jovem.cy = altura * 0.19
  jovem.raio = menorLado * 0.125
  jovem.particulas = 48
  desenharExplosao(pincel, jovem, 420, menorLado)

  const velha = montarFogo(11, 0, largura, altura)
  velha.cx = largura * 0.605
  velha.cy = altura * 0.34
  velha.raio = menorLado * 0.085
  velha.particulas = 34
  velha.vida = 2600
  desenharExplosao(pincel, velha, 1250, menorLado)
}

// ── A camada ────────────────────────────────────────────────────────────

/**
 * OS FOGOS, desenhados por cima da praça.
 *
 * `agora` vem de relógio monotônico em milissegundos; `parado` é
 * `prefers-reduced-motion: reduce`.
 *
 * Composição ADITIVA (`lighter`) do começo ao fim: luz sobre céu escuro soma,
 * e é a soma que faz o miolo de um estouro estourar de branco onde os rastros
 * se cruzam. Com `source-over` o mesmo desenho fica com cara de adesivo.
 */
export function desenharFogos(
  pincel: CanvasRenderingContext2D,
  largura: number,
  altura: number,
  agora: number,
  parado: boolean,
): void {
  if (largura <= 0 || altura <= 0) return
  const menorLado = Math.min(largura, altura)

  pincel.save()
  pincel.globalCompositeOperation = 'lighter'
  pincel.lineCap = 'round'
  pincel.lineJoin = 'round'

  if (parado) {
    desenharPose(pincel, largura, altura, menorLado)
    pincel.restore()
    return
  }

  // Só os lançamentos que ainda podem estar no ar — tipicamente três
  // candidatos, dos quais um ou dois desenham alguma coisa.
  const primeiro = Math.floor((agora - VIDA_MAX_MS) / INTERVALO_MS)
  const ultimo = Math.floor(agora / INTERVALO_MS)
  for (let n = primeiro; n <= ultimo; n++) {
    if (ale(n * 2.71 + 21.4) < CHANCE_PAUSA) continue
    // O lançamento não cai no metrônomo: sai adiantado ou atrasado dentro da
    // sua janela.
    const nascimento = n * INTERVALO_MS + ale(n * 1.37 + 2.9) * INTERVALO_MS * 0.5
    desenharFogo(pincel, montarFogo(n, nascimento, largura, altura), agora, altura, menorLado)

    // A SALVA: de vez em quando saem dois quase juntos, como numa bateria.
    // É a variação de ritmo que impede que o céu tenha um pulso só.
    if (ale(n * 4.93 + 33.7) > 0.8) {
      const atraso = 240 + ale(n * 6.11 + 41.3) * 320
      desenharFogo(
        pincel,
        montarFogo(n + 0.41, nascimento + atraso, largura, altura),
        agora,
        altura,
        menorLado,
      )
    }
  }

  pincel.restore()
}
