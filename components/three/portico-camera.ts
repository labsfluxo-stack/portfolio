/**
 * A câmera: como ela se move, e o enquadramento que tem de sobreviver ao
 * movimento.
 *
 * Os dois assuntos moram no mesmo arquivo porque são o mesmo problema. Um
 * enquadramento resolvido para UMA pose não vale nada assim que a câmera anda:
 * o canto que cabia raspando sai pela borda no primeiro grau de arco. Quem
 * decide a distância precisa conhecer o percurso inteiro, e é por isso que o
 * envelope do movimento (`ENVELOPE`) é exportado ao lado dele — o solucionador
 * consome exatamente o mesmo número que o animador produz.
 *
 * Como o resto dos módulos `portico-*`, aqui não entra three.js: é trigonometria
 * sobre tuplas, testável sem GPU. E nenhum `Math.random()` — o tremor da mão é
 * ruído de valor amostrado de uma função pura do tempo, então a cena é idêntica
 * a cada carregamento, como tudo mais nesta pasta.
 */

import { CONTAINER } from './portico-model'

/** Um canto da caixa envolvente, em metros, no espaço do mundo. */
export type Corner = readonly [number, number, number]

// ── A composição ──────────────────────────────────────────────────────────

/**
 * Teleobjetiva (fov baixo), pouca altura e pouco desvio lateral: o suficiente
 * para o objeto ter três dimensões, longe o bastante para não distorcer.
 * Perspectiva forçada é o vocabulário de quem quer impressionar.
 *
 * A elevação é o que faz a montagem ler como pilha em degraus e não como
 * parede: o degrau só aparece quando a câmera vê a laje do nível de baixo na
 * frente do de cima.
 */
export const VIEW = {
  fov: 29,
  azimuth: 0.38,
  elevation: 0.165,
  /**
   * Sobra em volta da máquina, em fração do enquadramento.
   *
   * Subiu junto com o pátio de sete baias: uma moldura de três por cento não
   * deixa chão nenhum aparecer em volta, e sem chão em volta o olho não tem
   * como ler "pátio" — lê "objeto encostado na lente". A sobra a mais custa o
   * mesmo tanto de tamanho de estêncil, que é o preço mais barato desta cena.
   */
  margin: 1.12,
} as const

/**
 * Caixa envolvente do que precisa caber: a montagem, a ponte por cima dela e a
 * PRIMEIRA fileira de baias. Sai das medidas reais — se um sistema crescer, o
 * enquadramento abre junto.
 *
 * A profundidade é assimétrica, e é isso que conserta a composição. Uma caixa
 * simétrica em Z descrevia só a montagem, e o pátio inteiro ficava fora da
 * conta — só que com a câmera girada o fundo BALANÇA PARA O LADO conforme
 * recua (cada metro de profundidade empurra a projeção uns 37 cm para a
 * direita). O que o enquadramento não conhece ele não emoldura: as baias
 * sangravam pela borda direita enquanto sobrava laje vazia na esquerda.
 *
 * `far` é onde o cenário pode ser cortado sem prejuízo — as baias do fundo
 * saem de quadro de propósito, e um pátio cortado pela borda lê como pátio que
 * continua. O que não pode faltar é o que vem até aqui.
 */
export type Bounds = {
  x: number
  top: number
  near: number
  far: number
  targetY: number
  /**
   * A MASSA — a caixa dos contêineres, sem os trilhos.
   *
   * Existe porque caber e compor são duas perguntas diferentes, e responder as
   * duas com a mesma caixa deixa a cena torta. Quem manda no recuo são os
   * trilhos, que abraçam o pátio inteiro e passam do quadro pelas laterais de
   * propósito; quem manda no CENTRO é a carga, que é o que alguém olha. Com uma
   * caixa só, o canto vazio da laje contava tanto quanto a pilha cheia do outro
   * lado, e o enquadramento centrava no vazio.
   */
  mass: { x: number; top: number; near: number; far: number }
}

/** Os oito cantos de uma meia-caixa. */
export const boxOf = (half: { x: number; top: number; near: number; far: number }): Corner[] =>
  [-1, 1].flatMap((sx) =>
    [0, 1].flatMap((sy) => [half.near, half.far].map((z): Corner => [sx * half.x, sy * half.top, z])),
  )

/**
 * A caixa envolvente, medida a partir da máquina e do pátio de verdade.
 *
 * `top` para no carro, não acima dele. A folga que existia aqui punha a
 * instalação flutuando no meio do quadro com um vão morto em cima, e os
 * tirantes do trilho apareciam inteiros — dezesseis hastes em fila, que lê como
 * CERCA. Cortando a fita no carro, o tirante sai do quadro pelo topo, e é o
 * corte que diz "isto continua preso lá em cima".
 */
export function boundsFor(
  rig: { railX: number; trolleyY: number },
  work: { x: number; z: number },
  footprints: readonly { x: number; z: number }[],
  builds: readonly { height: number }[],
): Bounds {
  const top = rig.trolleyY + 0.35
  // A borda de trás do que precisa caber é a PRIMEIRA fileira de baias, não a
  // montagem: é ela que fecha a composição por cima do corredor vazio. O resto
  // do pátio recua para dentro da névoa e pode ser cortado pela borda.
  const firstBay = footprints.reduce((near, spot) => Math.max(near, spot.z), -work.z)
  const cargoX =
    footprints.reduce((far, spot) => Math.max(far, Math.abs(spot.x)), work.x) + CONTAINER.length / 2
  return {
    x: rig.railX,
    top,
    near: work.z + CONTAINER.width,
    far: firstBay - CONTAINER.width,
    // Só as caixas: é por elas que a composição se centra.
    mass: {
      x: cargoX,
      top: Math.max(...builds.map((build) => build.height), CONTAINER.height),
      near: work.z + CONTAINER.width / 2,
      far: firstBay - CONTAINER.width / 2,
    },
    // A mira fica pouco acima do MEIO da instalação, e a conta é geométrica,
    // não de gosto: `frameFor` resolve a distância projetando os oito cantos da
    // caixa, então uma mira alta obriga a câmera a recuar o quanto for preciso
    // para o canto de BAIXO ainda caber — e a sobra toda vai parar em cima da
    // ponte. Centrada, a mesma caixa cabe uns vinte por cento mais perto; o
    // viés devolve o pouco de sobra para BAIXO, onde há chão e sombra de
    // contato para ela pousar, em vez de céu vazio.
    targetY: top * 0.62,
  }
}

// ── O movimento ───────────────────────────────────────────────────────────

/**
 * A pose da câmera num instante, escrita como DESVIO da pose base.
 *
 * Tudo é relativo de propósito: a pose base continua sendo a composição
 * aprovada, e o movimento é uma perturbação em volta dela. Um movimento
 * absoluto obrigaria a reconferir a composição a cada ajuste de amplitude.
 */
export type Shot = {
  /** Somado ao azimute — o arco em torno da máquina. */
  yaw: number
  /** Somada à elevação. */
  pitch: number
  /** Multiplicador da distância. **Nunca menor que 1** (ver `ENVELOPE`). */
  push: number
  /** Deslocamento do centro do quadro, em fração da meia-tela. */
  panX: number
  panY: number
}

/**
 * As amplitudes, e a razão de cada número.
 *
 * `arc` e `rise` são o movimento de aparelho: um arco lento em torno da
 * máquina, com a lente subindo e descendo pouquíssimo junto. 0,085 rad são 4,9°
 * — a um campo horizontal de ~52°, é quase um décimo do quadro de parallaxe
 * lateral entre um extremo e o outro. É o bastante para o fundo ANDAR em
 * relação à frente, que é o que separa "tem três dimensões" de "é uma foto de
 * um objeto 3D".
 *
 * `dolly` é a respiração: a câmera se aproxima e recua 8,5 % da distância. Só
 * para dentro a partir da pose mais aberta — ver `push`, que nunca desce de 1 —
 * porque é a pose mais aberta que o enquadramento resolve, e assim toda
 * aproximação é de graça em termos de garantia.
 *
 * `hand` é a mão do operador, e a amplitude é deliberadamente pequena demais
 * para alguém apontar: 0,9 % da meia-tela, uns 3 px num painel de 720. O que
 * ela faz não é balançar — é impedir que a imagem fique PERFEITAMENTE parada,
 * que é o único jeito garantido de uma cena 3D anunciar que é uma cena 3D.
 */
export const OPERATOR = {
  arc: 0.085,
  rise: 0.022,
  dolly: 0.085,
  hand: 0.009,
  /** Tremor angular da mão, somado ao arco. Um oitavo do arco. */
  handYaw: 0.011,
} as const

/**
 * Ruído de valor determinístico em [-1, 1], contínuo e com derivada suave.
 *
 * `Math.sin` de um inteiro grande é o gerador de hash mais barato que existe e,
 * ao contrário de `Math.random()`, é uma FUNÇÃO: o mesmo `t` devolve sempre o
 * mesmo valor, em qualquer carregamento e em qualquer taxa de quadros. É o que
 * permite ter tremor de mão sem abrir mão do determinismo que o resto desta
 * pasta paga caro para manter.
 */
function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123
  return s - Math.floor(s)
}

/** Ruído de valor 1D, interpolado com smoothstep — sem quina entre amostras. */
export function drift(t: number, seed: number): number {
  const x = t + seed * 97.13
  const i = Math.floor(x)
  const f = x - i
  const u = f * f * (3 - 2 * f)
  const a = hash(i + seed * 13.7)
  const b = hash(i + 1 + seed * 13.7)
  return (a + (b - a) * u) * 2 - 1
}

/**
 * Duas oitavas: uma lenta que dá a deriva, uma rápida e fraca que dá o
 * micromovimento. Mão de gente tem as duas; uma senoide só tem cara de senoide.
 */
const handNoise = (t: number, seed: number): number => drift(t * 0.21, seed) * 0.78 + drift(t * 0.63, seed + 5) * 0.22

/**
 * Quantas voltas cada eixo do movimento de aparelho dá enquanto a rotação de
 * sistemas dá uma. **Inteiros, e primos entre si.**
 *
 * Inteiros porque é isso que faz o laço da câmera fechar exatamente onde o da
 * máquina fecha: a cena inteira volta ao primeiro quadro de uma vez, em vez de
 * ter duas voltas de durações diferentes se atropelando.
 *
 * Primos entre si porque é isso que impede o traçado de se repetir ANTES do
 * ciclo. Com fatores em comum, a combinação dos três volta ao começo numa
 * fração do ciclo, e é a combinação que o olho reconhece — não cada eixo
 * separado.
 *
 * E os valores saem de uma conta, não de gosto. A rotação leva onze minutos;
 * um arco de uma volta em onze minutos anda meio pixel por segundo, o que é
 * indistinguível de câmera parada — foi medido. Seis voltas põem o período em
 * dois minutos: o arco varre uns três graus em dez segundos, que LÊ como
 * movimento, e mesmo assim é longo demais para alguém pegar o laço num hero
 * que ninguém encara por dois minutos.
 */
const TURNS = { arc: 6, rise: 10, dolly: 5 } as const

/**
 * A pose no instante `t`.
 *
 * A elevação corre mais rápido que o arco de propósito: com os dois na mesma
 * frequência o movimento vira uma reta inclinada de ida e volta, que é o
 * desenho mais reconhecível que existe. Em frequências diferentes o traçado é
 * uma lissajous, e o olho não acha o começo dela.
 */
export function shotAt(t: number, cycle: number): Shot {
  const w = (2 * Math.PI) / Math.max(60, cycle)
  return {
    yaw: Math.sin(t * w * TURNS.arc) * OPERATOR.arc + handNoise(t, 0) * OPERATOR.handYaw,
    pitch: Math.sin(t * w * TURNS.rise + 1.1) * OPERATOR.rise + handNoise(t, 1) * OPERATOR.handYaw * 0.55,
    // `1 +` é o que torna a garantia barata: a pose que o enquadramento resolve
    // é a MAIS ABERTA de todas, então qualquer aproximação cabe por construção.
    push: 1 + OPERATOR.dolly * (0.5 + 0.5 * Math.cos(t * w * TURNS.dolly)),
    panX: handNoise(t, 2) * OPERATOR.hand,
    panY: handNoise(t, 3) * OPERATOR.hand * 0.7,
  }
}

/** O período do eixo mais rápido do aparelho — o laço que alguém poderia pegar. */
export const shortestLoop = (cycle: number): number =>
  Math.max(60, cycle) / Math.max(TURNS.arc, TURNS.rise, TURNS.dolly)

/**
 * O pior caso de `shotAt`, e o contrato entre o animador e o enquadramento.
 *
 * O ruído é limitado por construção (`drift` devolve [-1, 1] e as duas oitavas
 * somam 1), então o envelope é a soma das amplitudes — não uma estimativa. O
 * teste confere varrendo o ciclo inteiro: se alguém subir uma amplitude e
 * esquecer daqui, o enquadramento deixa de garantir e o teste acusa.
 */
export const ENVELOPE = {
  yaw: OPERATOR.arc + OPERATOR.handYaw,
  pitch: OPERATOR.rise + OPERATOR.handYaw * 0.55,
  pan: OPERATOR.hand,
} as const

// ── O enquadramento ───────────────────────────────────────────────────────

type Vec = [number, number, number]

const sub = (a: Corner, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const dot = (a: Vec, b: Vec): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

/** A base da câmera para um azimute e uma elevação. */
function basis(yaw: number, pitch: number): { dir: Vec; right: Vec; up: Vec } {
  const flat = Math.cos(pitch)
  const dir: Vec = [Math.sin(yaw) * flat, Math.sin(pitch), Math.cos(yaw) * flat]
  // cross([0,1,0], dir) normalizado — a elevação some na conta, então o "para a
  // direita" da câmera depende só do azimute.
  const right: Vec = [Math.cos(yaw), 0, -Math.sin(yaw)]
  const up: Vec = [
    dir[1] * right[2] - dir[2] * right[1],
    dir[2] * right[0] - dir[0] * right[2],
    dir[0] * right[1] - dir[1] * right[0],
  ]
  return { dir, right, up }
}

export type FrameRequest = {
  /** Os cantos que precisam CABER — a máquina, a ponte e a primeira fileira. */
  box: readonly Corner[]
  /** Os cantos que decidem o CENTRO — só a carga. Ver `Framing`. */
  mass: readonly Corner[]
  fov: number
  aspect: number
  azimuth: number
  elevation: number
  margin: number
  targetY: number
  /** O envelope do movimento. `null` congela a câmera na pose base. */
  envelope: { yaw: number; pitch: number; pan: number } | null
}

export type Framed = {
  distance: number
  /** A mira, já deslocada lateralmente para centrar a carga. */
  target: Vec
}

/**
 * A distância e a mira que emolduram a caixa **em todo o percurso da câmera**.
 *
 * Duas contas, e uma terceira que o movimento acrescentou.
 *
 * A primeira resolve a DISTÂNCIA: o quanto a câmera precisa recuar para que os
 * oito cantos ainda caibam. A segunda resolve o CENTRO — e sem ela o
 * enquadramento garante que tudo caiba e mesmo assim compõe torto, porque com a
 * câmera girada o canto da frente está mais PERTO que o de trás e projeta mais
 * para fora tendo o mesmo afastamento em metros. A correção é medir os extremos
 * do que aparece na tela e deslocar a MIRA pela metade da diferença; itera
 * porque deslocar a mira muda a projeção de todo canto.
 *
 * A terceira é o percurso. Com a câmera parada bastava resolver a pose base;
 * com ela em arco, o canto que cabia raspando sai pela borda no primeiro grau.
 * A distância passa a ser o MÁXIMO sobre uma grade de poses que cobre o
 * envelope — e como a função é monótona nos extremos do ângulo, a grade de
 * 3×3 já contém o pior caso.
 *
 * O tremor da mão entra como margem: ele desloca o centro do quadro em fração
 * de meia-tela, então come `pan` do espaço útil em tangentes. Inflar a margem
 * é algebricamente idêntico a subtraí-lo do campo, e mantém uma conta só.
 */
export function frameFor(request: FrameRequest): Framed {
  const { box, mass, fov, aspect, azimuth, elevation, margin, targetY, envelope } = request
  const tanV = Math.tan((fov * Math.PI) / 360)
  const tanH = tanV * aspect

  const pan = envelope?.pan ?? 0
  // |h| / (dist - depth) + pan <= tan / margin  ⇔  dist >= depth + |h| / tan * m
  const wide = margin / Math.max(0.1, 1 - pan * margin)

  const yaws = envelope ? [azimuth - envelope.yaw, azimuth, azimuth + envelope.yaw] : [azimuth]
  const pitches = envelope ? [elevation - envelope.pitch, elevation, elevation + envelope.pitch] : [elevation]
  const poses = yaws.flatMap((yaw) => pitches.map((pitch) => basis(yaw, pitch)))
  const home = basis(azimuth, elevation)

  const target: Vec = [0, targetY, 0]
  let distance = 0

  for (let pass = 0; pass < 3; pass++) {
    distance = 0
    for (const pose of poses) {
      for (const point of box) {
        const c = sub(point, target)
        const depth = dot(c, pose.dir)
        distance = Math.max(
          distance,
          depth + (Math.abs(dot(c, pose.right)) / tanH) * wide,
          depth + (Math.abs(dot(c, pose.up)) / tanV) * wide,
        )
      }
    }

    // O centro se resolve na pose BASE: é ela a composição, e o arco é um
    // desvio em torno dela. Centrar pela média do percurso deixaria a pose que
    // alguém vê primeiro fora do lugar para acertar uma que ela talvez nem veja.
    let low = Infinity
    let high = -Infinity
    for (const point of mass) {
      const c = sub(point, target)
      // Coordenada de tela do canto, em tangentes: é a divisão pela
      // profundidade que traz a perspectiva para dentro da conta.
      const screen = dot(c, home.right) / Math.max(1, distance - dot(c, home.dir))
      low = Math.min(low, screen)
      high = Math.max(high, screen)
    }
    const off = ((low + high) / 2) * distance
    if (Math.abs(off) < 0.01) break
    target[0] += home.right[0] * off
    target[1] += home.right[1] * off
    target[2] += home.right[2] * off
  }

  return { distance, target }
}

/**
 * Onde a câmera fica, e para onde ela olha, no instante `t`.
 *
 * O pan é aplicado à MIRA e não à posição: girar a lente é o que uma mão faz;
 * transladar o corpo da câmera seria um travelling minúsculo, que não é a mesma
 * coisa e ainda estragaria o parallaxe do arco. E o deslocamento é proporcional
 * à distância justamente para que o efeito na TELA seja constante — a fração de
 * meia-tela que `OPERATOR.hand` promete.
 */
export function poseAt(
  framed: Framed,
  shot: Shot,
  view: { azimuth: number; elevation: number; fov: number; aspect: number },
): { position: Vec; look: Vec; distance: number } {
  const { dir, right, up } = basis(view.azimuth + shot.yaw, view.elevation + shot.pitch)
  const distance = framed.distance * shot.push
  const tanV = Math.tan((view.fov * Math.PI) / 360)
  const tanH = tanV * view.aspect
  const dx = shot.panX * tanH * distance
  const dy = shot.panY * tanV * distance
  const look: Vec = [
    framed.target[0] + right[0] * dx + up[0] * dy,
    framed.target[1] + right[1] * dx + up[1] * dy,
    framed.target[2] + right[2] * dx + up[2] * dy,
  ]
  return {
    position: [
      framed.target[0] + dir[0] * distance,
      framed.target[1] + dir[1] * distance,
      framed.target[2] + dir[2] * distance,
    ],
    look,
    distance,
  }
}
