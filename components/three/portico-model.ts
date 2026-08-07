/**
 * O modelo da ponte rolante — geometria do ciclo, ritmo e balanço do cabo —
 * separado do three.js de propósito.
 *
 * Tudo aqui é função pura de `t`: a cena WebGL (`Portico.tsx`) e a elevação
 * técnica em SVG (`PorticoFallback.tsx`) leem as MESMAS constantes, então o
 * desenho estático é literalmente a planta do que a cena anima, e não dois
 * objetos parecidos mantidos à mão. É também o que torna o ciclo testável
 * sem GPU: `samplePose(t)` responde onde está cada peça em qualquer instante,
 * e o teste confere o laço fechando sozinho em vez de confiar no olho.
 *
 * Nenhum `Math.random()` em lugar nenhum: a cena precisa ser idêntica a cada
 * carregamento.
 *
 * O modelo não sabe o que a máquina está montando. Ele recebe conjuntos de
 * lugares — de onde tirar, onde pôr, e o que mais existe no pátio — e devolve
 * o ciclo que leva um ao outro. Quem decide que os lugares de destino formam
 * a disposição de um sistema é `portico-architecture.ts`; quem decide onde
 * mora cada contêiner no pátio é `portico-yard.ts`; e quem decide QUAL sistema
 * é montado a cada volta é `createShow`, aqui embaixo.
 */

/**
 * Contêiner ISO de 20 pés (ISO 668, 1CC): 6,058 × 2,438 × 2,591 m.
 * A razão é o que separa "contêiner" de "cubo colorido" — um cubo lê como
 * bloco de brinquedo por mais bem iluminado que esteja.
 */
export const CONTAINER = { length: 6.06, width: 2.44, height: 2.59 } as const

const H = CONTAINER.height

/** Folga entre o fundo do contêiner içado e o topo do obstáculo mais alto. */
export const CLEARANCE = 0.55

/** Um lugar no pátio: centro do contêiner que ocupa (ou vai ocupar) a posição. */
export type Slot = { x: number; y: number; z: number }

/** Y do centro do contêiner no nível `level` de uma pilha (0 = no chão). */
export const slotCenterY = (level: number): number => (level + 0.5) * H

/** Altura do topo de uma pilha com `count` contêineres. */
export const stackTop = (count: number): number => count * H

/** Topo de um contêiner assentado num lugar. */
export const topOf = (slot: Slot): number => slot.y + H / 2

/**
 * Altura de trabalho medida contra o que ESTÁ LÁ.
 *
 * `obstacles` é o topo do mais alto contêiner naquele ponto do pátio, naquele
 * instante do ciclo. `surface` é a laje onde a carga vai pousar. O fundo do
 * contêiner passa a folga acima do maior dos dois.
 */
export const clearOver = (surface: number, obstacles: number): number =>
  Math.max(surface, obstacles) + H + CLEARANCE

// ── Curvas ────────────────────────────────────────────────────────────────
const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v)
const mix = (a: number, b: number, k: number): number => a + (b - a) * k
/** Fração percorrida de um trecho [a, b] no instante t, saturada em 0 e 1. */
const span = (t: number, a: number, b: number): number => clamp01((t - a) / (b - a))

const smoothstep = (x: number): number => {
  const k = clamp01(x)
  return k * k * (3 - 2 * k)
}

/** Fração do tempo gasta em cada rampa do perfil trapezoidal. */
const RAMP = 0.35
/**
 * Pico de velocidade em relação à média. Sai da integral do perfil: as duas
 * rampas valem meia unidade de tempo cada, então a velocidade de cruzeiro
 * precisa ser 1/(1−RAMP) da média para o percurso fechar.
 */
const PEAK_FACTOR = 1 / (1 - RAMP)

/**
 * Perfil trapezoidal de velocidade: arranca com rampa suave, cruza a
 * velocidade constante e freia com a mesma rampa.
 *
 * Não é capricho de curva — é a diferença entre uma máquina e uma animação.
 * Um `easeInOut` polinomial tem pico de 3× a 5× a velocidade média, o que num
 * curso de 25 m vira um salto: o mesmo movimento que é manso quando o cabo
 * corre meio metro sai disparado quando corre vinte e cinco. O trapézio limita
 * o pico a `PEAK_FACTOR` da média em QUALQUER distância, que é exatamente o
 * que um acionamento com limite de velocidade e de aceleração faz na vida
 * real.
 */
export function trapezoid(x: number): number {
  const t = clamp01(x)
  if (t > 0.5) return 1 - trapezoid(1 - t)
  if (t < RAMP) {
    const u = t / RAMP
    return (RAMP * (u ** 3 - u ** 4 / 2)) / (1 - RAMP)
  }
  return (t - RAMP / 2) / (1 - RAMP)
}

// ── Ritmo ─────────────────────────────────────────────────────────────────
//
// A duração de cada fase sai da DISTÂNCIA, não de um número redondo escolhido
// à mão. O translado varia de 6 m (um lugar ao lado do outro na montagem) a
// 30 m (a baia mais funda do pátio até a fileira da frente), e fases de
// duração fixa deixariam metade dos movimentos arrastada e a outra metade
// disparada.

/**
 * Velocidade de PICO de cada acionamento, em metros por segundo. O spreader
 * vazio sobe e desce mais rápido que carregado, e a descida com carga é a
 * mais lenta de todas — é ela que termina num encaixe.
 *
 * Nenhuma passa de 15 m/s: acima disso o movimento deixa de parecer uma massa
 * de 24 toneladas pendurada num cabo, por mais correta que seja a curva.
 */
const SPEED = { empty: 9.8, hoist: 9.4, land: 8.4, trolley: 15, bridge: 15 } as const

const MIN_PHASE = 0.3
const LOCK = 0.16
const RELEASE = 0.16

/** Distância → duração, respeitando o pico do perfil trapezoidal. */
const timeFor = (distance: number, speed: number, floor = MIN_PHASE): number =>
  Math.max(floor, (Math.abs(distance) * PEAK_FACTOR) / speed)

const horizontal = (from: Slot, to: Slot): number =>
  Math.max(timeFor(to.x - from.x, SPEED.trolley), timeFor(to.z - from.z, SPEED.bridge))

// ── O perfil de altura do translado ───────────────────────────────────────
//
// Esta é a peça que a rotação de sistemas obrigou a generalizar, e ela
// SUBSTITUI a antiga folga em dois patamares (altura na origem, altura no
// destino, uma troca no meio).
//
// O motivo é geométrico. Antes, o pátio tinha uma baia de trabalho e umas
// pilhas paradas fora do caminho, então bastava medir a ocupação nas duas
// pontas do percurso. Agora TODOS os sistemas moram no pátio ao mesmo tempo,
// em baias próprias — é isso que faz a troca de sistema não ter corte, porque
// nenhum contêiner precisa aparecer ou sumir. Só que a máquina passa por cima
// das baias dos outros sistemas em quase todo movimento, e uma altura medida
// só nas pontas manda a carga por dentro delas.
//
// A saída não é afrouxar a folga nem levantar a máquina a uma altura fixa de
// corredor (que seria a máquina voando alto à toa em todo movimento, inclusive
// nos curtinhos). É medir a ocupação AO LONGO DO PERCURSO e voar rente ao que
// existe: a carga sobe o quanto a baia mais alta que ela cruza exigir, e nem
// um metro além.

/** Amostras do perfil de altura ao longo de um translado. */
const RIDGE = 32

/**
 * Topo do mais alto contêiner cuja planta a carga cruza em (x, z).
 *
 * "Cruza" é sobreposição de planta de verdade: dois contêineres se cruzam
 * quando os centros estão a menos de um comprimento e de uma largura. É o
 * mesmo critério do teste que pega a carga raspando numa pilha, de propósito —
 * o modelo e o teste medem a mesma coisa do mesmo jeito.
 */
function ceilingAt(x: number, z: number, obstacles: readonly Slot[]): number {
  let top = 0
  for (const slot of obstacles) {
    if (Math.abs(slot.x - x) >= CONTAINER.length || Math.abs(slot.z - z) >= CONTAINER.width) continue
    const above = topOf(slot)
    if (above > top) top = above
  }
  return top
}

/**
 * O perfil de altura de um translado: onde o gancho tem de estar em cada
 * fração do percurso.
 *
 * Duas etapas. Primeiro a EXIGÊNCIA: em cada amostra, a folga sobre o que a
 * carga cruza ali. Depois a DILATAÇÃO CÔNICA: cada amostra recebe o máximo
 * entre a própria exigência e a das vizinhas descontada da inclinação máxima
 * que o acionamento aguenta. É o cone que transforma uma exigência em degrau
 * (que nenhum guincho consegue seguir) num perfil que sobe antes e desce
 * depois, exatamente como um operador faria.
 *
 * A inclinação sai dos limites dos dois acionamentos, não de um número
 * escolhido: com o translado durando `travel` e o perfil trapezoidal chegando
 * a `PEAK_FACTOR` da média, a altura pode variar no máximo
 * `hoist × travel / PEAK_FACTOR` ao longo de todo o percurso. Dividido pelas
 * amostras, é o degrau máximo por amostra — e por construção a velocidade
 * vertical NUNCA passa do limite do guincho, em nenhum ponto de nenhum
 * movimento.
 *
 * O que sobra nas pontas é informação, não erro: se o perfil exige que a carga
 * já esteja alta ao arrancar, é porque a baia vizinha é alta — e a máquina
 * então iça mais antes de sair, que é o que ela faria de verdade. Quem paga
 * isso é a fase de içamento, não o translado.
 */
function ridgeFor(from: Slot, to: Slot, obstacles: readonly Slot[], travel: number, speed: number): Float64Array {
  const at = (u: number): number =>
    clearOver(0, ceilingAt(from.x + (to.x - from.x) * u, from.z + (to.z - from.z) * u, obstacles))

  // A exigência de cada amostra é a do PEDAÇO dela, não a do ponto: o meio de
  // cada intervalo entra na conta. Uma pilha cuja planta a carga começa a
  // cruzar logo depois de uma amostra não pode escapar por cair entre duas.
  const need = new Float64Array(RIDGE + 1)
  for (let i = 0; i <= RIDGE; i++) {
    const u = i / RIDGE
    need[i] = Math.max(at(u), at(u - 0.5 / RIDGE), at(u + 0.5 / RIDGE))
  }

  // E cada amostra herda a exigência das vizinhas ANTES da dilatação.
  //
  // Isto não é excesso de zelo, é o que fecha o vão entre duas amostras. O
  // perfil é seguido por interpolação linear, então quem manda num trecho é o
  // MENOR dos dois extremos — e a dilatação cônica permite que dois vizinhos
  // difiram de um passo inteiro. Com passo de 0,69 m e folga de 0,55 m, a
  // carga afundava dentro de uma pilha no meio do trecho: defeito real, pego
  // pela varredura quadro a quadro no dia em que o pátio ficou mais apertado.
  // Herdando a exigência dos vizinhos, os DOIS extremos de todo trecho ficam
  // acima do que existe nele, e a reta entre eles também.
  const guard = new Float64Array(RIDGE + 1)
  for (let i = 0; i <= RIDGE; i++) {
    guard[i] = Math.max(need[Math.max(0, i - 1)] ?? 0, need[i] ?? 0, need[Math.min(RIDGE, i + 1)] ?? 0)
  }

  const step = (speed * travel) / (PEAK_FACTOR * RIDGE)
  const ridge = new Float64Array(RIDGE + 1)
  for (let i = 0; i <= RIDGE; i++) {
    let top = -Infinity
    for (let j = 0; j <= RIDGE; j++) {
      const candidate = (guard[j] ?? 0) - step * Math.abs(i - j)
      if (candidate > top) top = candidate
    }
    ridge[i] = top
  }
  return ridge
}

/** Altura do perfil na fração `u` do percurso, interpolada. */
function ridgeAt(ridge: Float64Array, u: number): number {
  const k = clamp01(u) * RIDGE
  const i = Math.min(RIDGE - 1, Math.floor(k))
  return mix(ridge[i] ?? 0, ridge[i + 1] ?? 0, k - i)
}

// ── Ritmo do ciclo ────────────────────────────────────────────────────────

/** Sistema completo, parado — é o instante que a cena existe para mostrar. */
export const HOLD = 8
/** Respiro entre desmontar um sistema e começar o próximo. */
export const REST = 1.4

export type Move = {
  /** Contêiner que este movimento carrega (índice global de instância). */
  cargo: number
  /** Início do movimento dentro da metade do ciclo. */
  start: number
  duration: number
  pick: Slot
  place: Slot
  /** Altura em que o spreader CHEGA sobre a pegada (o estacionamento anterior). */
  enterY: number
  /** Altura de trabalho ao sair da pegada e ao chegar na largada. */
  liftY: number
  dropY: number
  /** Altura a que o spreader vazio sobe depois de soltar. */
  exitY: number
  /** Altura de trabalho do PRÓXIMO movimento — onde o spreader vazio estaciona. */
  parkY: number
  /** Perfil de altura do translado com carga, e o da volta com o spreader vazio. */
  loaded: Float64Array
  back: Float64Array
  /** Fim da descida do spreader vazio até o topo da carga. */
  downEnd: number
  lockEnd: number
  hoistEnd: number
  travelStart: number
  travelEnd: number
  landStart: number
  landEnd: number
  releaseEnd: number
  /** Fim da subida do spreader vazio até a altura de saída. */
  riseEnd: number
  returnStart: number
  returnEnd: number
  /** Para onde o carro volta depois de soltar (a origem do próximo movimento). */
  next: Slot
}

/**
 * Um movimento antes de ganhar tempos: de onde, para onde, e o que existe no
 * pátio nos dois trechos.
 *
 * `standing` é a ocupação durante o translado COM carga (tudo menos o que está
 * pendurado); `settled` é a ocupação na volta com o spreader vazio, que já
 * inclui o contêiner recém-assentado.
 */
type LegStep = {
  cargo: number
  pick: Slot
  place: Slot
  standing: Slot[]
  settled: Slot[]
}

type Leg = { moves: Move[]; time: number; enterY: number; parkY: number }

/**
 * O calendário de uma metade do ciclo.
 *
 * A ordem das fases é o que garante que nada atravesse nada, e ela não tem
 * folga escondida: o carro arranca quando o içamento termina, a carga segue o
 * perfil do terreno durante o translado, e só desce sobre o próprio lugar.
 * Antecipar o início da descida — que é o erro natural, e o que essa cena já
 * cometeu — leva o contêiner a cruzar o pátio ainda baixo e a atravessar o que
 * já está montado.
 */
function buildLeg(steps: readonly LegStep[], parkAfter: Slot, enterFrom: number | null): Leg {
  const moves: Move[] = []
  let start = 0
  let enterY = enterFrom ?? 0

  steps.forEach((step, k) => {
    const { pick, place } = step
    // Depois do último assentamento a máquina não fica parada onde estava: ela
    // já se posiciona sobre a primeira pegada da metade seguinte do ciclo — e,
    // no último movimento de uma desmontagem, sobre a primeira pegada do
    // SISTEMA SEGUINTE. É o que faz a troca de sistema ser uma pose contínua
    // em vez de um corte.
    const following = steps[k + 1]
    const next = following?.pick ?? parkAfter

    const travel = horizontal(pick, place)
    const loaded = ridgeFor(pick, place, step.standing, travel, SPEED.hoist)
    const liftY = loaded[0] ?? 0
    const dropY = loaded[RIDGE] ?? 0

    const backTravel = horizontal(place, next)
    const back = ridgeFor(place, next, step.settled, backTravel, SPEED.empty)
    const exitY = back[0] ?? 0
    const parkY = back[RIDGE] ?? 0

    if (k === 0 && enterFrom === null) enterY = liftY

    const down = timeFor(enterY - topOf(pick), SPEED.empty)
    const hoist = timeFor(liftY - topOf(pick), SPEED.hoist)
    const land = timeFor(dropY - topOf(place), SPEED.land, MIN_PHASE + 0.12)
    const rise = timeFor(exitY - topOf(place), SPEED.empty)

    const downEnd = down
    const lockEnd = downEnd + LOCK
    const hoistEnd = lockEnd + hoist
    const travelStart = hoistEnd
    const travelEnd = travelStart + travel
    const landStart = travelEnd
    const landEnd = landStart + land
    const releaseEnd = landEnd + RELEASE
    const riseEnd = releaseEnd + rise
    const returnStart = riseEnd
    const returnEnd = returnStart + backTravel

    moves.push({
      cargo: step.cargo,
      start,
      duration: returnEnd,
      pick,
      place,
      enterY,
      liftY,
      dropY,
      exitY,
      parkY,
      loaded,
      back,
      downEnd,
      lockEnd,
      hoistEnd,
      travelStart,
      travelEnd,
      landStart,
      landEnd,
      releaseEnd,
      riseEnd,
      returnStart,
      returnEnd,
      next,
    })
    start += returnEnd
    enterY = parkY
  })

  return {
    moves,
    time: start,
    enterY: moves[0]?.enterY ?? 0,
    parkY: moves[moves.length - 1]?.parkY ?? 0,
  }
}

export type Plan = {
  count: number
  /** Índice da primeira instância deste sistema no conjunto global. */
  offset: number
  /** Lugares do pátio, na ordem em que as pilhas são enchidas. */
  source: readonly Slot[]
  /** Lugares da montagem, na ordem em que ela é feita (base primeiro). */
  target: readonly Slot[]
  load: Move[]
  unload: Move[]
  loadTime: number
  unloadTime: number
  /** Duração da volta inteira deste sistema, paradas incluídas. */
  cycle: number
  /** Ponto mais alto que a carga alcança neste sistema. */
  peakY: number
}

/**
 * Monta o ciclo de UM sistema a partir dos lugares dele e do resto do pátio.
 *
 * O pátio guarda os contêineres na ordem INVERTIDA da montagem: o primeiro a
 * ser montado (a base) é o último a ser empilhado no pátio, e portanto o que
 * está no topo da pilha de origem. Isso não é arranjo estético — é o que
 * garante que a máquina sempre pegue um contêiner que não tem nada em cima,
 * tanto ao montar quanto ao desmontar, e é o que faz o laço fechar sem corte:
 * no fim da volta cada peça está exatamente de onde saiu.
 *
 * `foreign` são os contêineres dos OUTROS sistemas, parados nas baias deles.
 * Eles não se movem nunca, mas entram em toda conta de altura: é por cima
 * deles que a máquina passa.
 */
function createPlan(
  offset: number,
  source: readonly Slot[],
  target: readonly Slot[],
  foreign: readonly Slot[],
  parkAfter: Slot,
  enterLoad: number | null,
): Plan {
  const count = Math.min(source.length, target.length)
  const src = source.slice(0, count)
  const dst = target.slice(0, count)

  /** Lugar de origem do contêiner `id` — a ordem invertida explicada acima. */
  const sourceOf = (id: number): Slot => src[count - 1 - id] as Slot

  // A ocupação em cada instante sai da regra única do ciclo: quem tem índice
  // menor que a carga já está na montagem, quem tem índice maior ainda está no
  // pátio. Montando, a carga sai do pátio; desmontando, volta.
  const standingLoad = (k: number): Slot[] => [...foreign, ...src.slice(0, count - 1 - k), ...dst.slice(0, k)]
  // Desmontando, o movimento `j` tira `dst[count-1-j]` e devolve em `src[j]`:
  // o pátio enche na ordem em que foi esvaziado, nível a nível, de baixo para
  // cima. Por isso o que já voltou é exatamente `src.slice(0, j)`.
  const standingUnload = (j: number): Slot[] => [...foreign, ...dst.slice(0, count - 1 - j), ...src.slice(0, j)]

  const load = buildLeg(
    Array.from({ length: count }, (_, k) => {
      const pick = sourceOf(k)
      const place = dst[k] as Slot
      const standing = standingLoad(k)
      return { cargo: offset + k, pick, place, standing, settled: [...standing, place] }
    }),
    dst[count - 1] ?? { x: 0, y: 0, z: 0 },
    enterLoad,
  )

  const unload = buildLeg(
    Array.from({ length: count }, (_, j) => {
      const pick = dst[count - 1 - j] as Slot
      const place = sourceOf(count - 1 - j)
      const standing = standingUnload(j)
      return { cargo: offset + count - 1 - j, pick, place, standing, settled: [...standing, place] }
    }),
    parkAfter,
    load.parkY,
  )

  return {
    count,
    offset,
    source: src,
    target: dst,
    load: load.moves,
    unload: unload.moves,
    loadTime: load.time,
    unloadTime: unload.time,
    cycle: load.time + HOLD + unload.time + REST,
    peakY: Math.max(
      0,
      ...load.moves.map((move) => Math.max(move.liftY, move.dropY, move.parkY)),
      ...unload.moves.map((move) => Math.max(move.liftY, move.dropY, move.parkY)),
    ),
  }
}

// ── A rotação ─────────────────────────────────────────────────────────────

export type Show = {
  plans: Plan[]
  /** Onde cada contêiner mora quando não está sendo montado. */
  home: readonly Slot[]
  /** Duração da rotação inteira: todos os sistemas, uma vez cada. */
  cycle: number
  /** Instante em que cada sistema começa a ser montado. */
  starts: number[]
  peakY: number
  /** Afastamento máximo em X de qualquer lugar — quem dimensiona a ponte. */
  reach: number
  total: number
}

/**
 * A rotação sem fim: um sistema por vez, e nunca uma pausa longa.
 *
 * O truque que faz a troca de sistema não ter corte é o pátio: **cada
 * contêiner tem uma casa fixa**, na baia do sistema dele. A máquina esvazia a
 * baia de um sistema para montá-lo, devolve tudo para as mesmas pilhas, e
 * segue para a baia seguinte. Nenhum contêiner aparece, some ou troca de
 * marcação no meio do caminho — o que se vê é um terminal em que uma baia
 * trabalha por vez, que é exatamente o que um terminal faz.
 *
 * A alternativa (uma baia só, recarregada a cada sistema) obrigaria os
 * contêineres a trocar de estampa entre uma volta e outra, e isso é um corte
 * por mais bem escondido que esteja.
 */
export function createShow(
  homes: readonly (readonly Slot[])[],
  targets: readonly (readonly Slot[])[],
): Show {
  const counts = homes.map((home, i) => Math.min(home.length, targets[i]?.length ?? 0))
  const offsets: number[] = []
  let running = 0
  for (const count of counts) {
    offsets.push(running)
    running += count
  }

  // A casa do contêiner `id` é `src[count-1-id]`, não `src[id]`: o pátio é
  // enchido de baixo para cima e a montagem é feita de cima para baixo da
  // pilha, para que a máquina só pegue contêiner sem nada em cima. Indexar as
  // casas na ordem crua das pilhas trocaria cada contêiner de lugar na virada
  // de sistema — um pulo de oito metros, que foi exatamente o que apareceu.
  const home = homes.flatMap((slots) => [...slots].reverse())
  const plans: Plan[] = []

  for (let i = 0; i < homes.length; i++) {
    const mine = homes[i] ?? []
    const foreign = homes.filter((_, k) => k !== i).flat()
    const nextHome = homes[(i + 1) % homes.length] ?? []
    // A primeira pegada do sistema seguinte: o topo da pilha dele.
    const parkAfter = nextHome[nextHome.length - 1] ?? { x: 0, y: 0, z: 0 }
    plans.push(createPlan(offsets[i] ?? 0, mine, targets[i] ?? [], foreign, parkAfter, null))
  }

  // Segunda passada: a altura em que o spreader CHEGA para a primeira pegada
  // de cada sistema é a altura em que o sistema anterior o deixou. Sem isso o
  // gancho daria um pulo vertical na virada — o único corte que a rotação
  // ainda poderia ter.
  for (let i = 0; i < plans.length; i++) {
    const previous = plans[(i - 1 + plans.length) % plans.length]
    const arriving = previous?.unload[previous.unload.length - 1]?.parkY
    if (arriving === undefined) continue
    const mine = homes[i] ?? []
    const foreign = homes.filter((_, k) => k !== i).flat()
    const nextHome = homes[(i + 1) % homes.length] ?? []
    plans[i] = createPlan(
      offsets[i] ?? 0,
      mine,
      targets[i] ?? [],
      foreign,
      nextHome[nextHome.length - 1] ?? { x: 0, y: 0, z: 0 },
      arriving,
    )
  }

  const starts: number[] = []
  let clock = 0
  for (const plan of plans) {
    starts.push(clock)
    clock += plan.cycle
  }

  return {
    plans,
    home,
    starts,
    cycle: clock,
    peakY: Math.max(0, ...plans.map((plan) => plan.peakY)),
    reach: [...home, ...targets.flat()].reduce((far, slot) => Math.max(far, Math.abs(slot.x)), 0),
    total: home.length,
  }
}

// ── Pose ──────────────────────────────────────────────────────────────────

export type Pose = {
  /** Posição do carro sobre a viga da ponte. */
  trolleyX: number
  /** Posição da ponte sobre os trilhos — o segundo eixo da máquina. */
  bridgeZ: number
  /** Face inferior do spreader — coincide com o topo do contêiner engatado. */
  spreaderY: number
  /** Índice global do contêiner içado, ou -1 com o spreader vazio. */
  carried: number
  /** Sistema que está sendo montado agora. */
  system: number
  x: Float64Array
  y: Float64Array
  z: Float64Array
  /**
   * 0 = spreader travado numa pilha (não balança), 1 = livre no ar. É o
   * antibalanço: quando o spreader encosta, o balanço tem de estar zerado,
   * senão o contêiner salta de lado no instante em que é solto.
   */
  swayGate: number
  /** 0..1 — lâmpada de estado da máquina. Pisca no engate e na soltura. */
  lamp: number
}

const LAMP_IDLE = 0.22

export function createPose(show: Show): Pose {
  const pose: Pose = {
    trolleyX: 0,
    bridgeZ: 0,
    spreaderY: 0,
    carried: -1,
    system: 0,
    x: new Float64Array(show.total),
    y: new Float64Array(show.total),
    z: new Float64Array(show.total),
    swayGate: 1,
    lamp: LAMP_IDLE,
  }
  show.home.forEach((slot, id) => {
    pose.x[id] = slot.x
    pose.y[id] = slot.y
    pose.z[id] = slot.z
  })
  return pose
}

/**
 * Leitura de um valor por contêiner. Existe só porque
 * `noUncheckedIndexedAccess` não sabe que o índice sempre está dentro do
 * array de tamanho fixo — e silenciar isso com `!` espalhado pela cena seria
 * pior.
 */
export const valueAt = (values: Float64Array, index: number): number => values[index] ?? 0

function place(pose: Pose, id: number, slot: Slot): Slot {
  pose.x[id] = slot.x
  pose.y[id] = slot.y
  pose.z[id] = slot.z
  return slot
}

/** Trava o balanço perto do engate e da soltura, e libera no meio do voo. */
function gateFor(move: Move, local: number): number {
  const settled = smoothstep((move.downEnd - local) / 0.3)
  const airborne = smoothstep((local - move.lockEnd) / 0.35)
  // O operador mata o balanço ANTES de descer para encaixar, nunca durante.
  const approaching = smoothstep((move.landStart - local) / 0.4)
  const free = smoothstep((local - move.releaseEnd) / 0.35)
  return Math.min(Math.max(settled, airborne), Math.max(approaching, free))
}

/** Duas piscadas, começando e terminando no brilho de regime. */
const blink = (u: number): number => LAMP_IDLE + (1 - LAMP_IDLE) * (0.5 - 0.5 * Math.cos(u * Math.PI * 4))

function lampFor(move: Move, local: number): number {
  if (local >= move.downEnd && local <= move.lockEnd) return blink(span(local, move.downEnd, move.lockEnd))
  if (local >= move.landEnd && local <= move.releaseEnd) return blink(span(local, move.landEnd, move.releaseEnd))
  return LAMP_IDLE
}

/** Devolve todo contêiner que não é deste sistema para a casa dele. */
function homeAll(show: Show, pose: Pose, except: Plan): void {
  for (let id = 0; id < show.total; id++) {
    if (id >= except.offset && id < except.offset + except.count) continue
    const slot = show.home[id]
    if (slot) place(pose, id, slot)
  }
}

/**
 * As duas paradas do ciclo. A diferença entre elas não é só o que está
 * montado: é ONDE a máquina espera.
 *
 * Segurando o sistema completo (`assembled`), ela já está sobre a primeira
 * pegada da desmontagem. Terminada a desmontagem, ela já está sobre a primeira
 * pegada do SISTEMA SEGUINTE — e é essa segunda parada que faz a troca de
 * sistema não ter corte: a pose do último quadro de um sistema é a mesma do
 * primeiro quadro do próximo.
 */
function idle(show: Show, plan: Plan, pose: Pose, assembled: boolean): Pose {
  const next = show.plans[(show.plans.indexOf(plan) + 1) % show.plans.length]
  const park = assembled ? plan.unload[0] : next?.load[0]
  homeAll(show, pose, plan)
  for (let id = 0; id < plan.count; id++) {
    place(
      pose,
      plan.offset + id,
      assembled ? (plan.target[id] as Slot) : (plan.source[plan.count - 1 - id] as Slot),
    )
  }
  pose.trolleyX = park?.pick.x ?? 0
  pose.bridgeZ = park?.pick.z ?? 0
  pose.spreaderY = park?.enterY ?? 0
  pose.carried = -1
  pose.swayGate = 1
  pose.lamp = LAMP_IDLE
  return pose
}

/** Qual sistema está em cena no instante `t` da rotação. */
function activeAt(show: Show, t: number): number {
  let index = show.plans.length - 1
  for (let i = 0; i < show.plans.length; i++) {
    const start = show.starts[i] ?? 0
    const plan = show.plans[i]
    if (plan && t < start + plan.cycle) {
      index = i
      break
    }
  }
  return index
}

/**
 * Preenche `pose` com o estado da máquina no instante `time` (segundos).
 * Reaproveita o objeto de propósito: isto roda a 120 Hz.
 */
export function samplePose(show: Show, time: number, pose: Pose): Pose {
  const clock = ((time % show.cycle) + show.cycle) % show.cycle
  const index = activeAt(show, clock)
  const plan = show.plans[index]
  if (!plan) return pose
  pose.system = index
  const t = clock - (show.starts[index] ?? 0)

  // ── paradas: o sistema completo montado, e o respiro antes do próximo
  if (t >= plan.loadTime && t < plan.loadTime + HOLD) return idle(show, plan, pose, true)
  if (t >= plan.loadTime + HOLD + plan.unloadTime) return idle(show, plan, pose, false)

  const unloading = t >= plan.loadTime + HOLD
  const elapsed = unloading ? t - plan.loadTime - HOLD : t
  const leg = unloading ? plan.unload : plan.load

  let cursor = leg.length - 1
  for (let i = 0; i < leg.length; i++) {
    const candidate = leg[i]
    if (candidate && elapsed < candidate.start + candidate.duration) {
      cursor = i
      break
    }
  }
  const move = leg[cursor]
  if (!move) return idle(show, plan, pose, false)
  const local = elapsed - move.start
  const moving = move.cargo

  homeAll(show, pose, plan)

  // ── carro e ponte ───────────────────────────────────────────────────────
  const travel = span(local, move.travelStart, move.travelEnd)
  const back = span(local, move.returnStart, move.returnEnd)
  const u = local < move.travelStart ? 0 : trapezoid(travel)
  const v = local < move.returnStart ? 0 : trapezoid(back)
  const from = local >= move.returnStart ? move.place : move.pick
  const to = local >= move.returnStart ? move.next : move.place
  const k = local >= move.returnStart ? v : u
  pose.trolleyX = mix(from.x, to.x, k)
  pose.bridgeZ = mix(from.z, to.z, k)

  // ── içamento ────────────────────────────────────────────────────────────
  pose.spreaderY =
    local < move.downEnd
      ? mix(move.enterY, topOf(move.pick), trapezoid(span(local, 0, move.downEnd)))
      : local < move.lockEnd
        ? topOf(move.pick)
        : local < move.hoistEnd
          ? mix(topOf(move.pick), move.liftY, trapezoid(span(local, move.lockEnd, move.hoistEnd)))
          : local < move.travelEnd
            ? ridgeAt(move.loaded, u)
            : local < move.landEnd
              ? mix(move.dropY, topOf(move.place), trapezoid(span(local, move.landStart, move.landEnd)))
              : local < move.releaseEnd
                ? topOf(move.place)
                : local < move.riseEnd
                  ? mix(topOf(move.place), move.exitY, trapezoid(span(local, move.releaseEnd, move.riseEnd)))
                  : ridgeAt(move.back, v)

  // ── contêineres em repouso ──────────────────────────────────────────────
  //
  // A regra é a mesma nas duas metades do ciclo: quem tem índice menor que a
  // carga já está na montagem, quem tem índice maior ainda está no pátio.
  const carriedLocal = moving - plan.offset
  for (let id = 0; id < plan.count; id++) {
    if (id === carriedLocal) continue
    if (id < carriedLocal) place(pose, plan.offset + id, plan.target[id] as Slot)
    else place(pose, plan.offset + id, plan.source[plan.count - 1 - id] as Slot)
  }

  const engaged = local >= move.lockEnd && local <= move.releaseEnd
  if (engaged) {
    pose.carried = moving
    pose.x[moving] = pose.trolleyX
    pose.y[moving] = pose.spreaderY - CONTAINER.height / 2
    pose.z[moving] = pose.bridgeZ
  } else {
    pose.carried = -1
    const landed = place(pose, moving, local < move.lockEnd ? move.pick : move.place)
    // Assentamento: a pilha absorve o peso e devolve, amortecido. Sem isso o
    // contêiner "cola" no lugar e a cena inteira perde peso.
    if (local > move.releaseEnd) {
      const tau = local - move.releaseEnd
      pose.y[moving] = landed.y - 0.045 * Math.exp(-9 * tau) * Math.sin(26 * tau)
    }
  }

  pose.swayGate = gateFor(move, local)
  pose.lamp = lampFor(move, local)
  return pose
}

// ── Balanço do cabo ───────────────────────────────────────────────────────

/**
 * Pêndulo amortecido de comprimento variável, integrado em passo fixo — nos
 * DOIS eixos, porque a máquina tem dois: o carro corre sobre a viga (X) e a
 * viga corre sobre os trilhos (Z).
 *
 * Passo fixo (e não o `delta` do quadro) por dois motivos: o resultado não
 * depende da taxa de quadros de quem visita — a cena é a mesma num notebook e
 * num monitor de 144 Hz — e continua determinístico.
 *
 * A aceleração entra por diferença finita da própria posição amostrada, então
 * o balanço NASCE do movimento em vez de ser uma senoide decorativa colada por
 * cima: o contêiner atrasa quando a máquina arranca, ultrapassa quando ela
 * freia, e assenta sozinho. O comprimento do cabo é a variável do pêndulo,
 * então a frequência do balanço muda enquanto o contêiner sobe — que é o
 * detalhe que ninguém consegue falsificar com uma senoide.
 */
export type Sway = {
  /** Ângulo do cabo no plano da viga (balanço em X) e no plano dos trilhos (Z). */
  thetaX: number
  omegaX: number
  thetaZ: number
  omegaZ: number
  x: number
  vx: number
  z: number
  vz: number
}

export const SWAY_STEP = 1 / 120
const GRAVITY = 9.81
/**
 * O ciclo roda mais rápido que uma ponte real (um ciclo honesto levaria
 * horas), então a aceleração da máquina é alta demais para alimentar o
 * pêndulo crua. O ganho traz a amplitude de volta para os 2–3° de uma ponte
 * de verdade; o que importa é a FASE — atraso, ultrapassagem, amortecimento —
 * e essa continua física.
 */
const SWAY_DRIVE = 0.2
const SWAY_LIMIT = 0.055
const SWAY_DAMPING = 0.9
/**
 * A trava do spreader não é "mais amortecimento": empilhar atrito numa massa
 * pendurada deixa o sistema SOBREAMORTECIDO, e sobreamortecido volta a zero
 * devagar — exatamente o contrário do que se quer no encaixe. Um contêiner
 * apoiado numa pilha simplesmente não tem para onde girar, então o ângulo
 * relaxa exponencialmente para zero enquanto o portão fecha.
 */
const SWAY_GRIP = 18

export function createSway(): Sway {
  return { thetaX: 0, omegaX: 0, thetaZ: 0, omegaZ: 0, x: 0, vx: 0, z: 0, vz: 0 }
}

function axis(theta: number, omega: number, drive: number, length: number, gate: number): [number, number] {
  const h = SWAY_STEP
  const l = Math.max(0.9, length)
  const acc = -(GRAVITY / l) * Math.sin(theta) - SWAY_DAMPING * omega - (SWAY_DRIVE * drive * Math.cos(theta)) / l
  let next = omega + acc * h
  let angle = theta + next * h

  if (gate < 1) {
    const grip = Math.exp(-SWAY_GRIP * (1 - gate) * h)
    angle *= grip
    next *= grip
  }
  if (angle > SWAY_LIMIT) {
    angle = SWAY_LIMIT
    next = Math.min(next, 0)
  } else if (angle < -SWAY_LIMIT) {
    angle = -SWAY_LIMIT
    next = Math.max(next, 0)
  }
  return [angle, next]
}

export function stepSway(sway: Sway, trolleyX: number, bridgeZ: number, length: number, gate: number): void {
  const h = SWAY_STEP
  const vx = (trolleyX - sway.x) / h
  const vz = (bridgeZ - sway.z) / h
  const driveX = (vx - sway.vx) / h
  const driveZ = (vz - sway.vz) / h
  sway.x = trolleyX
  sway.vx = vx
  sway.z = bridgeZ
  sway.vz = vz
  ;[sway.thetaX, sway.omegaX] = axis(sway.thetaX, sway.omegaX, driveX, length, gate)
  ;[sway.thetaZ, sway.omegaZ] = axis(sway.thetaZ, sway.omegaZ, driveZ, length, gate)
}

// ── Rótulos ───────────────────────────────────────────────────────────────

/**
 * Quebra o rótulo em no máximo duas linhas, buscando o corte que deixa a linha
 * mais longa menor possível — com penalidade para começar a segunda linha com
 * "&", que é como ninguém estampa uma chapa.
 *
 * Duas linhas não são estética: numa linha só, "Fluxo Eventos" (13 caracteres)
 * teria de caber em 6 metros de chapa e sairia pequeno demais para ler.
 * Quebrado, a maior linha tem 7 caracteres e o caractere quase dobra de
 * tamanho.
 */
export function stencilLines(label: string): string[] {
  const words = label.trim().split(/\s+/).filter(Boolean)
  if (words.length < 2) return [label.trim().toUpperCase()]

  let bestCut = 1
  let bestScore = Infinity
  for (let cut = 1; cut < words.length; cut++) {
    const head = words.slice(0, cut).join(' ')
    const tail = words.slice(cut).join(' ')
    const score = Math.max(head.length, tail.length) + (tail.startsWith('&') ? 3 : 0)
    if (score < bestScore) {
      bestScore = score
      bestCut = cut
    }
  }
  return [words.slice(0, bestCut).join(' ').toUpperCase(), words.slice(bestCut).join(' ').toUpperCase()]
}
