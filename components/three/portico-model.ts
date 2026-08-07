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
 * O modelo não sabe o que a máquina está montando. Ele recebe DOIS conjuntos
 * de lugares — de onde tirar e onde pôr — e devolve o ciclo que leva um ao
 * outro. Quem decide que os lugares de destino formam uma pirâmide de seis
 * patamares é `portico-architecture.ts`; quem decide onde ficam as pilhas de
 * origem é `portico-yard.ts`.
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
 * Altura de trabalho de um movimento, medida contra o que ESTÁ LÁ.
 *
 * `obstacles` é o topo do mais alto contêiner já assentado (ou ainda não
 * retirado) daquele lado do pátio, naquele instante do ciclo. `surface` é a
 * laje onde a carga vai pousar. O fundo do contêiner passa a folga acima do
 * maior dos dois.
 *
 * Medir contra a ocupação real, e não contra uma fração do ciclo nem contra
 * uma tabela de alturas, é o que faz a máquina passar rasteiro quando pode: no
 * começo da montagem a pirâmide tem um patamar e ela voa baixo; no fim, para
 * pôr o contêiner do topo, ela sobe — e nem um metro além. Foi a fração fixa
 * que mandava a carga por dentro do que já estava montado.
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
 * curso de 13 m vira um salto: o mesmo movimento que é manso quando o cabo
 * corre meio metro sai disparado quando corre treze. O trapézio limita o pico
 * a `PEAK_FACTOR` da média em QUALQUER distância, que é exatamente o que um
 * acionamento com limite de velocidade e de aceleração faz na vida real.
 *
 * O ciclo novo é mais rápido que o anterior, e é aqui que se vê por quê: o
 * que dá peso é a curva, não a lentidão. As velocidades subiram; o perfil,
 * não mudou.
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
// à mão. Com ~25 movimentos por metade de ciclo isso importa mais do que
// importava com seis: o translado varia de 6 m (um lugar ao lado do outro na
// pirâmide) a 25 m (a baia mais funda do pátio até a fileira da frente), e
// fases de duração fixa deixariam metade dos movimentos arrastada e a outra
// metade disparada.

/**
 * Velocidade de PICO de cada acionamento, em metros por segundo. O spreader
 * vazio sobe e desce mais rápido que carregado, e a descida com carga é a
 * mais lenta de todas — é ela que termina num encaixe.
 *
 * Nenhuma passa de 10 m/s: acima disso o movimento deixa de parecer uma massa
 * de 24 toneladas pendurada num cabo, por mais correta que seja a curva.
 */
const SPEED = { empty: 9.8, hoist: 9.4, land: 8.4, trolley: 15, bridge: 15 } as const

/** Distância → duração, respeitando o pico do perfil trapezoidal. */
const timeFor = (distance: number, speed: number, floor = MIN_PHASE): number =>
  Math.max(floor, (Math.abs(distance) * PEAK_FACTOR) / speed)

const MIN_PHASE = 0.3
const LOCK = 0.16
const RELEASE = 0.16

/**
 * A sobreposição que dá ritmo a esta cena não é uma fase começando um pouco
 * antes da outra: é o GUINCHO CORRENDO DURANTE O TRANSLADO. A carga sobe (ou
 * desce) enquanto atravessa o pátio, que é o que um operador faz e o que
 * transforma um ciclo de nove segundos num de cinco.
 *
 * Onde essa troca de altura pode acontecer sai da GEOMETRIA, não de uma
 * fração escolhida a olho — ver `ZONE_PAD` e `transitWindow`.
 */

/**
 * Quanto uma zona do pátio se estende além dos centros dos seus lugares.
 *
 * Um contêiner inteiro em cada direção: é exatamente a distância em que a
 * planta da carga içada deixa de cruzar a planta de qualquer contêiner
 * daquela zona. Fora disso, a altura é livre.
 */
const ZONE_PAD = { x: CONTAINER.length, z: CONTAINER.width } as const

type Zone = { x0: number; x1: number; z0: number; z1: number }

function zoneOf(slots: readonly Slot[]): Zone | null {
  if (slots.length === 0) return null
  const xs = slots.map((slot) => slot.x)
  const zs = slots.map((slot) => slot.z)
  return {
    x0: Math.min(...xs) - ZONE_PAD.x,
    x1: Math.max(...xs) + ZONE_PAD.x,
    z0: Math.min(...zs) - ZONE_PAD.z,
    z1: Math.max(...zs) + ZONE_PAD.z,
  }
}

const within = (zone: Zone | null, x: number, z: number): boolean =>
  !!zone && x > zone.x0 && x < zone.x1 && z > zone.z0 && z < zone.z1

/** Fração do TEMPO em que o percurso alcança a fração `p` do caminho. */
function untrapezoid(p: number): number {
  let lo = 0
  let hi = 1
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    if (trapezoid(mid) < p) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

/**
 * Quando a carga pode trocar de altura durante um translado — em fração do
 * tempo do translado.
 *
 * A regra é geométrica e assimétrica, porque o risco é assimétrico:
 *
 * - **Subindo**, a carga tem de estar na altura alta ANTES de entrar na zona
 *   de destino, porque é lá que está o que ela vai sobrevoar. Subir cedo
 *   nunca raspa em nada, então a janela é `[0, entrada]`.
 * - **Descendo**, ela só pode começar DEPOIS de sair da zona de origem, pela
 *   razão espelhada. A janela é `[saída, 1]`.
 *
 * "Entrada" e "saída" saem das caixas envolventes das duas zonas do pátio, e
 * são convertidas de fração de CAMINHO para fração de TEMPO por
 * `untrapezoid` — o perfil de velocidade não é linear, e tratar as duas
 * frações como a mesma coisa erra justamente no meio do percurso, que é onde
 * a carga cruza o corredor.
 */
function transitWindow(from: Slot, to: Slot, rising: boolean, zones: readonly (Zone | null)[]): [number, number] {
  const steps = 64
  const at = (u: number): { x: number; z: number } => ({
    x: from.x + (to.x - from.x) * u,
    z: from.z + (to.z - from.z) * u,
  })
  const origin = zones.find((zone) => within(zone, from.x, from.z)) ?? null
  const destination = zones.find((zone) => within(zone, to.x, to.z)) ?? null

  if (rising) {
    let enter = 1
    for (let i = steps; i >= 0; i--) {
      const u = i / steps
      const point = at(u)
      if (!within(destination, point.x, point.z)) {
        enter = u
        break
      }
    }
    return [0, Math.max(0.12, untrapezoid(enter))]
  }

  let exit = 0
  for (let i = 0; i <= steps; i++) {
    const u = i / steps
    const point = at(u)
    if (!within(origin, point.x, point.z)) {
      exit = u
      break
    }
  }
  return [Math.min(0.88, untrapezoid(exit)), 1]
}

/** Sistema completo, parado — é o instante que a cena existe para mostrar. */
export const HOLD = 14
/** Respiro depois de desmontar, antes de recomeçar. */
export const REST = 2.4

export type Move = {
  /** Contêiner que este movimento carrega (índice na ordem de montagem). */
  cargo: number
  /** Início do movimento dentro da metade do ciclo. */
  start: number
  duration: number
  pick: Slot
  place: Slot
  /** Altura de trabalho sobre a origem e sobre o destino (ver `clearOver`). */
  liftY: number
  dropY: number
  /** Altura de trabalho do PRÓXIMO movimento — onde o spreader vazio estaciona. */
  parkY: number
  /** Janela do translado em que a carga troca de altura, em fração do tempo. */
  climb: [number, number]
  /** A mesma janela na volta com o spreader vazio. */
  descent: [number, number]
  /** Fim da descida do spreader vazio até o topo da carga. */
  downEnd: number
  lockEnd: number
  hoistEnd: number
  travelStart: number
  travelEnd: number
  landStart: number
  landEnd: number
  releaseEnd: number
  /** Fim da subida do spreader vazio até a altura de trabalho do destino. */
  riseEnd: number
  returnStart: number
  returnEnd: number
  /** Para onde o carro volta depois de soltar (a origem do próximo movimento). */
  next: Slot
}

/** Um movimento antes de ganhar tempos: de onde, para onde, e a que altura. */
type LegStep = { cargo: number; pick: Slot; place: Slot; liftY: number; dropY: number }

/**
 * O calendário de uma metade do ciclo.
 *
 * A ordem das fases é o que garante que nada atravesse nada, e ela não tem
 * folga escondida: o carro arranca quando o içamento termina, a carga troca de
 * altura DURANTE o translado (na janela que `transitWindow` provou ser segura)
 * e só desce sobre o próprio lugar. Antecipar o início da descida — que é o
 * erro natural, e o que essa cena já cometeu — leva o contêiner a cruzar o
 * pátio ainda baixo e a atravessar o que já está montado.
 */
function buildLeg(steps: readonly LegStep[], parkAfter: Slot, zones: readonly (Zone | null)[]): Move[] {
  const moves: Move[] = []
  let start = 0

  const horizontal = (from: Slot, to: Slot): number =>
    Math.max(timeFor(to.x - from.x, SPEED.trolley), timeFor(to.z - from.z, SPEED.bridge))

  steps.forEach((step, k) => {
    const { pick, place, liftY, dropY } = step
    // Depois do último assentamento a máquina não fica parada onde estava: ela
    // já se posiciona sobre a primeira pegada da metade seguinte do ciclo. É o
    // que faz a parada (`HOLD`) ser uma pose contínua com o que veio antes e
    // com o que vem depois, em vez de um corte.
    const following = steps[k + 1]
    const next = following?.pick ?? parkAfter
    const parkY = following?.liftY ?? dropY

    const drop = timeFor(liftY - topOf(pick), SPEED.empty)
    const hoist = timeFor(liftY - topOf(pick), SPEED.hoist)
    const land = timeFor(dropY - topOf(place), SPEED.land, MIN_PHASE + 0.12)
    const rise = timeFor(dropY - topOf(place), SPEED.empty)

    // Translado: os dois acionamentos horizontais correm juntos e o mais lento
    // manda, como numa ponte de verdade — o percurso sai diagonal. A troca de
    // altura corre dentro da mesma janela e também pode mandar: só uma parte do
    // percurso é segura para ela, e essa parte é o divisor.
    const climb = transitWindow(pick, place, dropY >= liftY, zones)
    const descent = transitWindow(place, next, parkY >= dropY, zones)
    const travel = Math.max(horizontal(pick, place), timeFor(dropY - liftY, SPEED.hoist) / (climb[1] - climb[0]))
    const back = Math.max(horizontal(place, next), timeFor(parkY - dropY, SPEED.empty) / (descent[1] - descent[0]))

    const downEnd = drop
    const lockEnd = downEnd + LOCK
    const hoistEnd = lockEnd + hoist
    const travelStart = hoistEnd
    const travelEnd = travelStart + travel
    const landStart = travelEnd
    const landEnd = landStart + land
    const releaseEnd = landEnd + RELEASE
    const riseEnd = releaseEnd + rise
    const returnStart = riseEnd
    const returnEnd = returnStart + back

    moves.push({
      cargo: step.cargo,
      start,
      duration: returnEnd,
      pick,
      place,
      liftY,
      dropY,
      parkY,
      climb,
      descent,
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
  })

  return moves
}

export type Plan = {
  count: number
  /** Lugares do pátio de origem, na ordem em que as pilhas são enchidas. */
  source: readonly Slot[]
  /** Lugares da arquitetura, na ordem em que ela é montada (base primeiro). */
  target: readonly Slot[]
  load: Move[]
  unload: Move[]
  loadTime: number
  unloadTime: number
  cycle: number
  /** Ponto mais alto que a carga alcança — quem dimensiona a ponte. */
  peakY: number
}

/**
 * Monta o ciclo completo a partir dos dois conjuntos de lugares.
 *
 * O pátio guarda os contêineres na ordem INVERTIDA da montagem: o primeiro a
 * ser montado (a base da pirâmide) é o último a ser empilhado no pátio, e
 * portanto o que está no topo da pilha de origem. Isso não é arranjo estético
 * — é o que garante que a máquina sempre pegue um contêiner que não tem nada
 * em cima, tanto ao montar quanto ao desmontar, e é o que faz o laço fechar
 * sem corte: no fim do ciclo cada peça está exatamente de onde saiu.
 */
export function createPlan(source: readonly Slot[], target: readonly Slot[]): Plan {
  const count = Math.min(source.length, target.length)
  const src = source.slice(0, count)
  const dst = target.slice(0, count)

  /** Lugar de origem do contêiner `id` — a ordem invertida explicada acima. */
  const sourceOf = (id: number): Slot => src[count - 1 - id] as Slot

  const zones = [zoneOf(src), zoneOf(dst)]
  const ORIGIN: Slot = { x: 0, y: 0, z: 0 }

  /** Topo do mais alto de um conjunto de lugares ocupados. */
  const ceiling = (slots: readonly Slot[]): number =>
    slots.reduce((high, slot) => Math.max(high, topOf(slot)), -Infinity)

  // A altura de trabalho de CADA movimento sai da ocupação naquele instante:
  // do lado de onde se tira, o que ainda não foi tirado; do lado onde se põe, o
  // que já foi posto. É por isso que a máquina voa baixo no começo da montagem
  // e sobe só quando a pirâmide sobe.
  const load = buildLeg(
    Array.from({ length: count }, (_, k) => {
      const pick = sourceOf(k)
      const place = dst[k] as Slot
      return {
        cargo: k,
        pick,
        place,
        liftY: clearOver(topOf(pick) - H, ceiling(src.slice(0, count - 1 - k))),
        dropY: clearOver(place.y - H / 2, ceiling(dst.slice(0, k))),
      }
    }),
    dst[count - 1] ?? ORIGIN,
    zones,
  )

  const unload = buildLeg(
    Array.from({ length: count }, (_, j) => {
      const pick = dst[count - 1 - j] as Slot
      const place = sourceOf(count - 1 - j)
      return {
        cargo: count - 1 - j,
        pick,
        place,
        liftY: clearOver(topOf(pick) - H, ceiling(dst.slice(0, count - 1 - j))),
        dropY: clearOver(place.y - H / 2, ceiling(src.slice(0, j))),
      }
    }),
    src[count - 1] ?? ORIGIN,
    zones,
  )

  const total = (moves: Move[]): number => moves.reduce((sum, move) => sum + move.duration, 0)
  const loadTime = total(load)
  const unloadTime = total(unload)

  return {
    count,
    source: src,
    target: dst,
    load,
    unload,
    loadTime,
    unloadTime,
    cycle: loadTime + HOLD + unloadTime + REST,
    peakY: Math.max(...load.map((move) => Math.max(move.liftY, move.dropY)), 0),
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
  /** Índice do contêiner içado, ou -1 com o spreader vazio. */
  carried: number
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

export function createPose(plan: Plan): Pose {
  return {
    trolleyX: 0,
    bridgeZ: 0,
    spreaderY: 0,
    carried: -1,
    x: new Float64Array(plan.count),
    y: new Float64Array(plan.count),
    z: new Float64Array(plan.count),
    swayGate: 1,
    lamp: LAMP_IDLE,
  }
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

/**
 * Altura durante um translado horizontal.
 *
 * A curva corre dentro da janela que `transitWindow` calculou a partir da
 * geometria das zonas do pátio — subindo, ela termina antes de a carga entrar
 * na zona de destino; descendo, começa depois de ela sair da zona de origem.
 * Fora da janela a altura fica parada, e é isso que mantém o contêiner sempre
 * acima do que ele sobrevoa.
 */
function transitY(from: number, to: number, window: readonly [number, number], u: number): number {
  return mix(from, to, trapezoid(span(u, window[0], window[1])))
}

function idle(plan: Plan, pose: Pose, assembled: boolean): Pose {
  const park = assembled ? plan.unload[0] : plan.load[0]
  for (let id = 0; id < plan.count; id++) {
    place(pose, id, assembled ? (plan.target[id] as Slot) : (plan.source[plan.count - 1 - id] as Slot))
  }
  pose.trolleyX = park?.pick.x ?? 0
  pose.bridgeZ = park?.pick.z ?? 0
  pose.spreaderY = park?.liftY ?? 0
  pose.carried = -1
  pose.swayGate = 1
  pose.lamp = LAMP_IDLE
  return pose
}

/**
 * Preenche `pose` com o estado da máquina no instante `time` (segundos).
 * Reaproveita o objeto de propósito: isto roda a 120 Hz.
 */
export function samplePose(plan: Plan, time: number, pose: Pose): Pose {
  const t = ((time % plan.cycle) + plan.cycle) % plan.cycle

  // ── paradas: o sistema completo montado, e o respiro depois de desmontar
  if (t >= plan.loadTime && t < plan.loadTime + HOLD) return idle(plan, pose, true)
  if (t >= plan.loadTime + HOLD + plan.unloadTime) return idle(plan, pose, false)

  const unloading = t >= plan.loadTime + HOLD
  const elapsed = unloading ? t - plan.loadTime - HOLD : t
  const leg = unloading ? plan.unload : plan.load

  let index = leg.length - 1
  for (let i = 0; i < leg.length; i++) {
    const candidate = leg[i]
    if (candidate && elapsed < candidate.start + candidate.duration) {
      index = i
      break
    }
  }
  const move = leg[index]
  if (!move) return idle(plan, pose, false)
  const local = elapsed - move.start
  const moving = move.cargo

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
      ? mix(move.liftY, topOf(move.pick), trapezoid(span(local, 0, move.downEnd)))
      : local < move.lockEnd
        ? topOf(move.pick)
        : local < move.hoistEnd
          ? mix(topOf(move.pick), move.liftY, trapezoid(span(local, move.lockEnd, move.hoistEnd)))
          : local < move.travelEnd
            ? transitY(move.liftY, move.dropY, move.climb, travel)
            : local < move.landEnd
              ? mix(move.dropY, topOf(move.place), trapezoid(span(local, move.landStart, move.landEnd)))
              : local < move.releaseEnd
                ? topOf(move.place)
                : local < move.riseEnd
                  ? mix(topOf(move.place), move.dropY, trapezoid(span(local, move.releaseEnd, move.riseEnd)))
                  : transitY(move.dropY, move.parkY, move.descent, back)

  // ── contêineres em repouso ──────────────────────────────────────────────
  //
  // A regra é a mesma nas duas metades do ciclo: quem tem índice menor que a
  // carga já está na arquitetura, quem tem índice maior ainda está no pátio.
  // Montando, a carga sai do pátio e entra na arquitetura; desmontando, o
  // contrário — e é só isso que muda.
  for (let id = 0; id < plan.count; id++) {
    if (id === moving) continue
    if (id < moving) place(pose, id, plan.target[id] as Slot)
    else place(pose, id, plan.source[plan.count - 1 - id] as Slot)
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
 * Pêndulo amortecido de comprimento variável, integrado em passo fixo — agora
 * nos DOIS eixos, porque a máquina passou a ter dois: o carro corre sobre a
 * viga (X) e a viga corre sobre os trilhos (Z).
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
 * Variação de valor por patamar sobre a mesma tinta (`--color-surface-2`).
 * Não é cor nova: é o mesmo token multiplicado, como chapa que pegou sol
 * diferente. Serve para o olho ler a pirâmide como camadas — cada patamar
 * tem o seu valor, e é ele que diz onde uma camada acaba e a outra começa.
 */
export const layerShade = (layer: number): number => 0.72 + layer * 0.13
