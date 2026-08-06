/**
 * O modelo do pórtico — geometria, ciclo e balanço do cabo — separado do
 * three.js de propósito.
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
 */

/**
 * Contêiner ISO de 20 pés (ISO 668, 1CC): 6,058 × 2,438 × 2,591 m.
 * A razão é o que separa "contêiner" de "cubo colorido" — um cubo lê como
 * bloco de brinquedo por mais bem iluminado que esteja.
 */
export const CONTAINER = { length: 6.06, width: 2.44, height: 2.59 } as const

/** Seis camadas, na ordem da seção Stack: redes na base, entrega no topo. */
export const LAYER_COUNT = 6

/** Centro em X das duas baias do pátio. O pórtico opera de uma para a outra. */
export const BAY = { source: 4.5, target: -4.5 } as const

/** Folga entre o fundo do contêiner içado e o topo do obstáculo mais alto. */
const CLEARANCE = 0.55

const H = CONTAINER.height

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
 * curso de 13 m vira um salto: o mesmo movimento que é manso quando o cabo
 * corre meio metro sai disparado quando corre treze. O trapézio limita o pico
 * a `PEAK_FACTOR` da média em QUALQUER distância, que é exatamente o que um
 * acionamento com limite de velocidade e de aceleração faz na vida real.
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

// ── Geometria do pátio ────────────────────────────────────────────────────

/** Altura do topo de uma pilha com `count` contêineres. */
export const stackTop = (count: number): number => count * H

/** Y do centro do contêiner na posição `slot` (0 = base) de uma pilha. */
export const slotCenterY = (slot: number): number => (slot + 0.5) * H

/**
 * Altura de translado do movimento `k`, igual nos dois lados do ciclo.
 *
 * O obstáculo mais alto durante o movimento k tem `max(LAYER_COUNT-1-k, k)`
 * contêineres — a pilha de origem depois de tirar um, ou a de destino antes
 * de receber. Sai daí um perfil verdadeiro: o pórtico iça alto no começo e no
 * fim de cada metade do ciclo e passa rasteiro no meio, como um operador
 * faria por não gastar curso de cabo à toa.
 */
export const travelHeight = (k: number): number => Math.max(LAYER_COUNT - 1 - k, k) * H + H + CLEARANCE

// ── Ritmo ─────────────────────────────────────────────────────────────────
//
// A duração de cada fase sai da DISTÂNCIA, não de um número redondo escolhido
// à mão. Isso importa: o curso do cabo varia de 0,55 m (tirar o contêiner do
// topo de uma pilha cheia) a 13,5 m (tirar o último da baia vazia). Com fases
// de duração fixa, o mesmo movimento que é manso numa ponta vira um tiro na
// outra — e a cena perde exatamente o peso que ela existe para ter.

/**
 * Velocidade de PICO de cada acionamento, em metros por segundo. O spreader
 * vazio sobe e desce mais rápido que carregado, e a descida com carga é a
 * mais lenta de todas — é ela que termina num encaixe.
 */
const SPEED = { empty: 9.2, hoist: 7.2, land: 5.4, trolley: 12 } as const
/** Distância → duração, respeitando o pico do perfil trapezoidal. */
const timeFor = (distance: number, speed: number, floor: number): number =>
  Math.max(floor, (distance * PEAK_FACTOR) / speed)

const MIN_PHASE = 0.42
const LOCK = 0.26
const RELEASE = 0.26
const TRAVEL_SPAN = Math.abs(BAY.source - BAY.target)
const TRAVEL_TIME = timeFor(TRAVEL_SPAN, SPEED.trolley, MIN_PHASE)
/**
 * Sobreposição entre içar e transladar.
 *
 * Uma máquina competente não espera uma fase acabar para começar a próxima —
 * mas a folga tem limite físico: o contêiner só pode entrar no espaço aéreo
 * da outra baia depois de estar acima dela. O carro leva ~0,45 s para
 * percorrer os 3 m que o colocam sobre a pilha vizinha, então 0,3 s de
 * antecipação sobrepõem as fases sem nunca raspar em nada.
 */
const LEAD = 0.3

/** Sistema completo, parado — é o instante que a cena existe para mostrar. */
export const HOLD = 4
/** Respiro depois de desmontar, antes de recomeçar. */
export const REST = 1.6

type Move = {
  /** Início do movimento dentro da metade do ciclo. */
  start: number
  duration: number
  /** Fim da descida do spreader vazio até o topo da carga. */
  downEnd: number
  lockEnd: number
  hoistEnd: number
  travelStart: number
  travelEnd: number
  landStart: number
  landEnd: number
  releaseEnd: number
  /** Fim da subida do spreader vazio até a altura do próximo movimento. */
  riseEnd: number
  returnStart: number
  returnEnd: number
  /** Topo do contêiner a pegar. */
  pickY: number
  /** Topo do contêiner depois de assentado. */
  placeY: number
  /** Altura de translado deste movimento, e a do próximo (onde o carro fica). */
  flyY: number
  parkY: number
  /** O carro precisa voltar para a outra baia antes do próximo movimento? */
  returns: boolean
}

/**
 * O calendário dos seis movimentos. Vale para as duas metades do ciclo: as
 * distâncias de montar e de desmontar são as mesmas, só trocam de sentido.
 *
 * A ordem das fases é o que garante que nada atravesse nada: o carro só
 * arranca quando o içamento está terminando (`hoistEnd - LEAD`), e a volta do
 * spreader vazio só começa quando a subida está terminando (`riseEnd - LEAD`).
 * Antecipar pelo INÍCIO da subida — que é o erro natural — leva o contêiner a
 * cruzar o pátio ainda baixo e a raspar na outra pilha.
 */
function buildSchedule(): Move[] {
  const moves: Move[] = []
  let start = 0

  for (let k = 0; k < LAYER_COUNT; k++) {
    const pickY = stackTop(LAYER_COUNT - k)
    const placeY = stackTop(k + 1)
    const flyY = travelHeight(k)
    const last = k === LAYER_COUNT - 1
    const parkY = travelHeight(last ? 0 : k + 1)

    const drop = timeFor(flyY - pickY, SPEED.empty, MIN_PHASE)
    const hoist = timeFor(flyY - pickY, SPEED.hoist, MIN_PHASE)
    const land = timeFor(flyY - placeY, SPEED.land, MIN_PHASE + 0.13)
    const rise = timeFor(parkY - placeY, SPEED.empty, MIN_PHASE)

    const downEnd = drop
    const lockEnd = downEnd + LOCK
    const hoistEnd = lockEnd + hoist
    const travelStart = Math.max(lockEnd, hoistEnd - LEAD)
    const travelEnd = travelStart + TRAVEL_TIME
    const landStart = Math.max(hoistEnd, travelEnd - LEAD)
    const landEnd = landStart + land
    const releaseEnd = landEnd + RELEASE
    const riseEnd = releaseEnd + rise
    // O carro estaciona já sobre a baia do próximo movimento — no último de
    // cada metade isso o leva para o outro lado do pátio, e é lá que ele
    // espera durante a parada.
    const returns = !last
    const returnStart = returns ? Math.max(releaseEnd, riseEnd - LEAD) : Infinity
    const returnEnd = returns ? returnStart + TRAVEL_TIME : Infinity
    const duration = returns ? Math.max(riseEnd, returnEnd) : riseEnd + 0.35

    moves.push({
      start,
      duration,
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
      pickY,
      placeY,
      flyY,
      parkY,
      returns,
    })
    start += duration
  }

  return moves
}

const SCHEDULE = buildSchedule()
/** Duração de montar (ou de desmontar) a pilha inteira. */
export const HALF = SCHEDULE.reduce((total, move) => total + move.duration, 0)
export const CYCLE = HALF * 2 + HOLD + REST

// ── Pose ──────────────────────────────────────────────────────────────────

export type Pose = {
  /** Posição do carro do pórtico no eixo do estradeiro. */
  trolleyX: number
  /** Face inferior do spreader — coincide com o topo do contêiner engatado. */
  spreaderY: number
  /** Índice da camada içada, ou -1 com o spreader vazio. */
  carried: number
  /** X de repouso de cada camada. */
  x: Float64Array
  /** Y do centro de cada camada. */
  y: Float64Array
  /**
   * 0 = spreader travado numa pilha (não balança), 1 = livre no ar. É o
   * antibalanço: quando o spreader encosta, o balanço tem de estar zerado,
   * senão o contêiner salta de lado no instante em que é solto.
   */
  swayGate: number
  /** 0..1 — lâmpada de estado do pórtico. Pisca no engate e na soltura. */
  lamp: number
}

export function createPose(): Pose {
  return {
    trolleyX: BAY.source,
    spreaderY: travelHeight(0),
    carried: -1,
    x: new Float64Array(LAYER_COUNT).fill(BAY.source),
    y: new Float64Array(LAYER_COUNT),
    swayGate: 1,
    lamp: LAMP_IDLE,
  }
}

/**
 * Onde cada camada descansa fora do ar.
 *
 * A baia de origem guarda as camadas em ordem invertida (entrega embaixo,
 * redes no topo). É o que faz o pórtico montar o destino de baixo para cima
 * pegando sempre a de cima da origem, e é o que faz o laço fechar sem corte:
 * ao desmontar, cada peça volta exatamente para a posição de onde saiu, e o
 * pátio no fim do ciclo é idêntico ao do começo.
 */
function rest(pose: Pose, layer: number, inTarget: boolean): number {
  const y = slotCenterY(inTarget ? layer : LAYER_COUNT - 1 - layer)
  pose.x[layer] = inTarget ? BAY.target : BAY.source
  pose.y[layer] = y
  return y
}

/**
 * Leitura de uma camada da pose. Existe só porque `noUncheckedIndexedAccess`
 * não sabe que o índice sempre está dentro do array de tamanho fixo — e
 * silenciar isso com `!` espalhado pela cena seria pior.
 */
export const layerAt = (values: Float64Array, layer: number): number => values[layer] ?? 0

/** Trava o balanço perto do engate e da soltura, e libera no meio do voo. */
function gateFor(move: Move, local: number): number {
  const settled = smoothstep((move.downEnd - local) / 0.3)
  const airborne = smoothstep((local - move.lockEnd) / 0.35)
  // O operador mata o balanço ANTES de descer para encaixar, nunca durante.
  const approaching = smoothstep((move.landEnd - 0.3 - local) / 0.4)
  const free = smoothstep((local - move.releaseEnd) / 0.35)
  return Math.min(Math.max(settled, airborne), Math.max(approaching, free))
}

const LAMP_IDLE = 0.22
/** Duas piscadas, começando e terminando no brilho de regime. */
const blink = (u: number): number => LAMP_IDLE + (1 - LAMP_IDLE) * (0.5 - 0.5 * Math.cos(u * Math.PI * 4))

/** Lâmpada de estado: brilho baixo em regime, pulso nos dois instantes que importam. */
function lampFor(move: Move, local: number): number {
  if (local >= move.downEnd && local <= move.lockEnd) return blink(span(local, move.downEnd, move.lockEnd))
  if (local >= move.landEnd && local <= move.releaseEnd) return blink(span(local, move.landEnd, move.releaseEnd))
  return LAMP_IDLE
}

function idle(pose: Pose, inTarget: boolean): Pose {
  for (let layer = 0; layer < LAYER_COUNT; layer++) rest(pose, layer, inTarget)
  pose.trolleyX = inTarget ? BAY.target : BAY.source
  pose.spreaderY = travelHeight(0)
  pose.carried = -1
  pose.swayGate = 1
  pose.lamp = LAMP_IDLE
  return pose
}

/**
 * Preenche `pose` com o estado do pórtico no instante `time` (segundos).
 * Reaproveita o objeto de propósito: isto roda a 120 Hz.
 */
export function samplePose(time: number, pose: Pose): Pose {
  const t = ((time % CYCLE) + CYCLE) % CYCLE

  // ── paradas: o sistema completo no destino, e o respiro depois de desmontar
  if (t >= HALF && t < HALF + HOLD) return idle(pose, true)
  if (t >= HALF * 2 + HOLD) return idle(pose, false)

  const unloading = t >= HALF + HOLD
  const elapsed = unloading ? t - HALF - HOLD : t

  let k = LAYER_COUNT - 1
  for (let i = 0; i < LAYER_COUNT; i++) {
    const move = SCHEDULE[i]
    if (move && elapsed < move.start + move.duration) {
      k = i
      break
    }
  }
  const move = SCHEDULE[k] ?? SCHEDULE[LAYER_COUNT - 1]
  if (!move) return idle(pose, false)
  const local = elapsed - move.start

  // Camada em trânsito: montando é a k-ésima de baixo para cima; desmontando é
  // sempre a que está no topo do destino.
  const moving = unloading ? LAYER_COUNT - 1 - k : k
  const from = unloading ? BAY.target : BAY.source
  const to = unloading ? BAY.source : BAY.target
  const nextFrom = move.returns ? from : to

  // ── carro ───────────────────────────────────────────────────────────────
  pose.trolleyX =
    local < move.travelStart
      ? from
      : local < move.travelEnd
        ? mix(from, to, trapezoid(span(local, move.travelStart, move.travelEnd)))
        : local < move.returnStart
          ? to
          : local < move.returnEnd
            ? mix(to, nextFrom, trapezoid(span(local, move.returnStart, move.returnEnd)))
            : nextFrom

  // ── içamento ────────────────────────────────────────────────────────────
  pose.spreaderY =
    local < move.downEnd
      ? mix(move.flyY, move.pickY, trapezoid(span(local, 0, move.downEnd)))
      : local < move.lockEnd
        ? move.pickY
        : local < move.hoistEnd
          ? mix(move.pickY, move.flyY, trapezoid(span(local, move.lockEnd, move.hoistEnd)))
          : local < move.landStart
            ? move.flyY
            : local < move.landEnd
              ? mix(move.flyY, move.placeY, trapezoid(span(local, move.landStart, move.landEnd)))
              : local < move.releaseEnd
                ? move.placeY
                : local < move.riseEnd
                  ? mix(move.placeY, move.parkY, trapezoid(span(local, move.releaseEnd, move.riseEnd)))
                  : move.parkY

  // ── camadas ─────────────────────────────────────────────────────────────
  for (let layer = 0; layer < LAYER_COUNT; layer++) {
    if (layer === moving) continue
    const done = unloading ? layer > moving : layer < moving
    rest(pose, layer, unloading ? !done : done)
  }

  const engaged = local >= move.lockEnd && local <= move.releaseEnd
  if (engaged) {
    pose.carried = moving
    pose.x[moving] = pose.trolleyX
    pose.y[moving] = pose.spreaderY - H / 2
  } else {
    pose.carried = -1
    // Antes do engate a camada ainda descansa na baia de origem; depois da
    // soltura, na de destino. Montando o destino é a pilha do sistema;
    // desmontando é a de origem — daí a inversão.
    const landed = rest(pose, moving, unloading ? local < move.lockEnd : local > move.releaseEnd)
    // Assentamento: a pilha absorve o peso e devolve, amortecido. Sem isso o
    // contêiner "cola" no lugar e a cena inteira perde peso.
    if (local > move.releaseEnd) {
      const tau = local - move.releaseEnd
      pose.y[moving] = landed - 0.045 * Math.exp(-9 * tau) * Math.sin(26 * tau)
    }
  }

  pose.swayGate = gateFor(move, local)
  pose.lamp = lampFor(move, local)
  return pose
}

// ── Balanço do cabo ───────────────────────────────────────────────────────

/**
 * Pêndulo amortecido de comprimento variável, integrado em passo fixo.
 *
 * Passo fixo (e não o `delta` do quadro) por dois motivos: o resultado não
 * depende da taxa de quadros de quem visita — a cena é a mesma num notebook e
 * num monitor de 144 Hz — e continua determinístico.
 *
 * A aceleração do carro entra por diferença finita da própria posição
 * amostrada, então o balanço NASCE do movimento em vez de ser uma senoide
 * decorativa colada por cima: o contêiner atrasa quando o carro arranca,
 * ultrapassa quando ele freia, e assenta sozinho. O comprimento do cabo é a
 * variável do pêndulo, então a frequência do balanço muda enquanto o
 * contêiner sobe — que é o detalhe que ninguém consegue falsificar com uma
 * senoide.
 */
export type Sway = { theta: number; omega: number; x: number; v: number }

export const SWAY_STEP = 1 / 120
const GRAVITY = 9.81
/**
 * O ciclo roda mais rápido que um pórtico real (um ciclo honesto levaria
 * minutos), então a aceleração do carro é alta demais para alimentar o
 * pêndulo crua. O ganho traz a amplitude de volta para os 2–3° de um pórtico
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
  return { theta: 0, omega: 0, x: BAY.source, v: 0 }
}

export function stepSway(sway: Sway, trolleyX: number, length: number, gate: number): void {
  const h = SWAY_STEP
  const v = (trolleyX - sway.x) / h
  const drive = (v - sway.v) / h
  sway.x = trolleyX
  sway.v = v

  const l = Math.max(0.9, length)
  const acc =
    -(GRAVITY / l) * Math.sin(sway.theta) - SWAY_DAMPING * sway.omega - (SWAY_DRIVE * drive * Math.cos(sway.theta)) / l
  sway.omega += acc * h
  sway.theta += sway.omega * h

  if (gate < 1) {
    const grip = Math.exp(-SWAY_GRIP * (1 - gate) * h)
    sway.theta *= grip
    sway.omega *= grip
  }
  if (sway.theta > SWAY_LIMIT) {
    sway.theta = SWAY_LIMIT
    sway.omega = Math.min(sway.omega, 0)
  } else if (sway.theta < -SWAY_LIMIT) {
    sway.theta = -SWAY_LIMIT
    sway.omega = Math.max(sway.omega, 0)
  }
}

// ── Rótulos ───────────────────────────────────────────────────────────────

/**
 * Quebra o rótulo da camada em no máximo duas linhas, buscando o corte que
 * deixa a linha mais longa menor possível — com penalidade para começar a
 * segunda linha com "&", que é como ninguém estampa uma chapa.
 *
 * Duas linhas não são estética: numa linha só, "Redes & Infraestrutura" (22
 * caracteres) teria de caber em 6 metros de chapa e sairia pequeno demais
 * para ler. Quebrado, a maior linha tem 14 caracteres e o caractere quase
 * dobra de tamanho.
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

/**
 * Variação de valor por camada sobre a mesma tinta (`--color-surface-2`).
 * Não é cor nova: é o mesmo token multiplicado, como chapa que pegou sol
 * diferente. Serve para o olho seguir um contêiner específico enquanto ele
 * atravessa o pátio.
 */
export const layerShade = (layer: number): number => 0.72 + layer * 0.13
