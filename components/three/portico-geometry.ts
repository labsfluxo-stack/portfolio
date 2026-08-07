import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { CONTAINER } from './portico-model'
import { CARGO_FLAT_UV } from './portico-textures'

/**
 * A carpintaria da cena: as peças do contêiner e da ponte rolante, fundidas em
 * poucas geometrias.
 *
 * Um contêiner de verdade tem moldura aparente e chapa recuada — a caixa lisa
 * é o que faz uma cena 3D parecer Minecraft. Isso custa umas vinte peças por
 * contêiner; `mergeGeometries` funde cada conjunto numa geometria só, e os
 * quarenta e poucos contêineres passam a custar TRÊS chamadas de desenho ao
 * todo, porque as três geometrias são instanciadas.
 *
 * A máquina perdeu as pernas: virou ponte rolante suspensa. Ver `runway` e
 * `bridge` no fim do arquivo.
 */

const { length: L, width: W, height: H } = CONTAINER

/** Seção dos perfis da moldura do contêiner. */
const FRAME = 0.16
/** Quanto a chapa recua da moldura — é o que faz o perfil ficar aparente. */
const INSET = FRAME / 2

const box = (w: number, h: number, d: number, x = 0, y = 0, z = 0): THREE.BufferGeometry =>
  new THREE.BoxGeometry(w, h, d).translate(x, y, z)

const rod = (radius: number, height: number, x: number, y: number, z: number): THREE.BufferGeometry =>
  new THREE.CylinderGeometry(radius, radius, height, 10).translate(x, y, z)

/**
 * Cilindro DEITADO no eixo X, girado antes de ser posicionado.
 *
 * Existe por causa de um defeito real: `rod(...).rotateZ(Math.PI / 2)` gira a
 * geometria JÁ TRANSLADADA em torno da origem, então o tambor do guincho, que
 * devia ficar sob o carro, ia parar em `x = −pivotY` — um cilindro solto
 * flutuando à esquerda, acompanhando a ponte, porque a peça continuava filha
 * do grupo do carro. Girar primeiro e transladar depois é a única ordem que
 * põe a peça onde o nome dela diz.
 */
const rodX = (radius: number, length: number, x: number, y: number, z: number): THREE.BufferGeometry =>
  new THREE.CylinderGeometry(radius, radius, length, 10).rotateZ(Math.PI / 2).translate(x, y, z)

/** Barra inclinada no plano XY (contraventamento da viga). */
function braceXY(thickness: number, from: THREE.Vector3, to: THREE.Vector3): THREE.BufferGeometry {
  const span = from.distanceTo(to)
  const geometry = new THREE.BoxGeometry(thickness, span, thickness)
  geometry.rotateZ(Math.atan2(from.x - to.x, to.y - from.y))
  geometry.translate((from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2)
  return geometry
}

const merge = (parts: THREE.BufferGeometry[]): THREE.BufferGeometry => {
  const merged = mergeGeometries(parts, false)
  for (const part of parts) part.dispose()
  if (!merged) throw new Error('não deu para fundir a geometria da ponte')
  return merged
}

/**
 * A chapa do contêiner, preparada para ser instanciada.
 *
 * Duas particularidades, as duas exigidas pela instanciação — que exige
 * material ÚNICO, e portanto textura única:
 *
 * 1. Sem grupos. As seis faces compartilham um material só.
 * 2. Um segundo canal de UV (`uv1`). O canal 0 continua 0..1 por face e é o
 *    que a corrugação usa, então toda chapa ondula igual. O canal 1 é o da
 *    marcação de carga: as duas faces longas recebem a célula inteira do
 *    atlas, e as outras quatro colapsam num ponto da margem — do contrário o
 *    ícone sairia esticado na testeira e no teto.
 *
 * Ordem dos vértices de `BoxGeometry`: +X, −X, +Y, −Y, +Z, −Z, quatro por
 * face. As faces longas são as duas últimas.
 */
export function containerPlateGeometry(): THREE.BoxGeometry {
  const geometry = new THREE.BoxGeometry(L - 2 * INSET, H - 2 * INSET, W - 2 * INSET)
  geometry.clearGroups()

  const uv = geometry.getAttribute('uv')
  const cargo = new Float32Array(uv.count * 2)
  const LONG_FACES_START = 16
  for (let i = 0; i < uv.count; i++) {
    const long = i >= LONG_FACES_START
    cargo[i * 2] = long ? uv.getX(i) : CARGO_FLAT_UV[0]
    cargo[i * 2 + 1] = long ? uv.getY(i) : CARGO_FLAT_UV[1]
  }
  geometry.setAttribute('uv1', new THREE.BufferAttribute(cargo, 2))
  return geometry
}

/** Moldura, longarinas, barras da porta — tudo em aço aparente. */
export function containerFrameGeometry(): THREE.BufferGeometry {
  const x = L / 2 - FRAME / 2
  const y = H / 2 - FRAME / 2
  const z = W / 2 - FRAME / 2
  const parts: THREE.BufferGeometry[] = []

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) parts.push(box(FRAME, H - 2 * FRAME, FRAME, sx * x, 0, sz * z))
  }
  for (const sy of [-1, 1]) {
    for (const sz of [-1, 1]) parts.push(box(L - 2 * FRAME, FRAME, FRAME, 0, sy * y, sz * z))
    for (const sx of [-1, 1]) parts.push(box(FRAME, FRAME, W - 2 * FRAME, sx * x, sy * y, 0))
  }

  // Testeira das portas (+X): quatro barras de travamento, os manípulos e a
  // junta entre as duas folhas. É o detalhe que dá frente e verso ao objeto.
  const face = L / 2 + 0.03
  for (const sz of [-0.86, -0.3, 0.3, 0.86]) {
    parts.push(rod(0.036, H - 0.62, face, 0, sz))
    parts.push(box(0.12, 0.2, 0.1, face + 0.04, 0.02, sz))
  }
  parts.push(box(0.05, H - 0.5, 0.07, face - 0.01, 0, 0))

  return merge(parts)
}

/** As oito cantoneiras — os blocos por onde o spreader pega o contêiner. */
export function containerCastingsGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = []
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        parts.push(box(0.3, 0.24, 0.3, sx * (L / 2 - 0.14), sy * (H / 2 - 0.11), sz * (W / 2 - 0.14)))
      }
    }
  }
  return merge(parts)
}

// ── Ponte rolante ─────────────────────────────────────────────────────────

/**
 * A máquina não tem pernas.
 *
 * O dono autorizou tirá-las, e o ganho é concreto: o chão fica livre — antes
 * uma perna cruzava na frente da pilha e poluía a leitura — e a máquina pode
 * crescer sem brigar por espaço com o que ela monta. O que sobra é uma ponte
 * rolante de verdade: dois trilhos altos correndo em Z, um par de vigas
 * atravessando em X sobre eles, o carro correndo sobre as vigas e o spreader
 * pendurado no cabo.
 *
 * São DOIS eixos de translado, e é por isso que a arquitetura pode ter
 * fileiras em profundidade: a ponte anda sobre os trilhos, o carro anda sobre
 * a ponte.
 */
export type Rig = {
  /** Distância dos trilhos ao eixo do pátio. */
  railX: number
  railY: number
  /** Altura do eixo das vigas da ponte. */
  girderY: number
  /** Afastamento das duas vigas: os cabos descem no vão entre elas. */
  girderZ: number
  /** Onde os cabos saem do carro — é o pivô do pêndulo. */
  pivotY: number
  trolleyY: number
  /** Onde os trilhos entram e saem do enquadramento. */
  runway: { near: number; far: number }
}

/**
 * A ponte é dimensionada pelo TRABALHO, não por números escolhidos à mão.
 *
 * `peak` é o ponto mais alto que a carga alcança no ciclo (`plan.peakY`, que
 * por sua vez sai da altura real da pirâmide) e `reach` é o afastamento máximo
 * em X de qualquer lugar do pátio. A viga fica um cabo acima da carga mais
 * alta e os trilhos abraçam o alcance.
 *
 * É isto que evita o defeito mais fácil de cometer aqui: uma ponte pairando lá
 * em cima com um vão morto entre ela e o que ela monta. Se a arquitetura
 * crescer, a máquina sobe junto; se encolher, desce.
 */
export function rigFor(peak: number, reach: number): Rig {
  // Cabo mínimo à vista com a carga no ponto mais alto: menos que isto e o
  // spreader encosta no carro, muito mais e volta o vão morto.
  const pivotY = peak + 1.55
  return {
    railX: reach + 2.4,
    railY: pivotY - 0.5,
    girderY: pivotY - 0.5,
    girderZ: 1.9,
    pivotY,
    trolleyY: pivotY + 0.45,
    runway: { near: 10, far: -36 },
  }
}

/**
 * Comprimento do tirante que pendura o trilho. Ver o comentário no laço de
 * `runwayGeometry`: é a medida que separa "instalação presa ao teto" de
 * "cerca".
 *
 * O que decide não é o comprimento em si, é onde o QUADRO corta — e por isso o
 * número é generoso em vez de ajustado. Um tirante que termina DENTRO do
 * enquadramento vira mourão: a fileira inteira lê como cerca, e nenhuma das
 * hastes parece sustentar coisa nenhuma. Cortado pelo topo, o mesmo desenho
 * vira suspensão. Como a folga vertical do quadro cresce quando o painel
 * estreita (ver `Framing`), o tirante tem de passar do topo no formato mais
 * alto que a cena aceita, não no mais largo — daí sobrar em vez de encostar.
 */
const RAIL_HANGER = 16

/**
 * Os trilhos e o que os segura.
 *
 * Eles ATRAVESSAM o enquadramento em vez de caber nele: entram por cima,
 * saem pelas laterais e se dissolvem na névoa ao fundo. Uma instalação que
 * continua além do quadro é mais imponente que uma máquina inteira e
 * pequena — e é também o que explica, sem dizer, por que a ponte não precisa
 * de pernas: ela está pendurada em algo que não cabe na foto.
 */
export function runwayGeometry(rig: Rig): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = []
  const { railX, railY, runway } = rig
  const span = runway.near - runway.far
  const middle = (runway.near + runway.far) / 2

  for (const sx of [-1, 1]) {
    // viga de rolamento e o boleto do trilho por cima
    parts.push(box(1.05, 1.15, span, sx * railX, railY - 0.7, middle))
    parts.push(box(0.34, 0.2, span, sx * railX, railY - 0.03, middle))
    // mísula sob a viga, a cada nove metros: dá ritmo e escala ao alto do
    // quadro. A cada seis, os apoios ficavam próximos demais e a fileira
    // fechava numa paliçada — é a densidade, tanto quanto a altura, que faz
    // uma fila de hastes verticais ler como cerca.
    for (let z = runway.near; z > runway.far; z -= 9) {
      parts.push(box(0.9, 0.42, 0.5, sx * railX, railY - 1.4, z))
      // Tirante subindo para FORA do enquadramento. A fileira só vira cerca
      // quando a ponta de cima aparece: dezesseis hastes com começo e fim
      // dentro do quadro lêem como mourão, e nenhuma delas sustenta nada aos
      // olhos de quem vê. Cortado no topo, o mesmo desenho vira suspensão.
      parts.push(box(0.26, RAIL_HANGER, 0.26, sx * railX, railY + RAIL_HANGER / 2 - 0.2, z))
      parts.push(box(0.22, 0.22, 2.6, sx * railX, railY + 0.9, z))
    }
  }

  return merge(parts)
}

/**
 * A ponte: duas vigas atravessando em X e os carros de translação nas pontas.
 * Corre sobre os trilhos em Z; o Y já vem embutido.
 */
export function bridgeGeometry(rig: Rig): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = []
  const { railX, railY, girderY, girderZ } = rig
  const span = railX * 2

  for (const sz of [-1, 1]) {
    // viga caixão e o trilho do carro por cima dela
    parts.push(box(span, 1.05, 0.72, 0, girderY, sz * girderZ))
    parts.push(box(span, 0.16, 0.3, 0, girderY + 0.61, sz * girderZ))
    // passadiço e guarda-corpo por fora da viga: sem isto a viga é uma barra
    // chapada atravessando o alto do quadro — o elemento mais largo da cena e
    // o único sem estrutura. Um corrimão diz "gente sobe aqui".
    const walk = sz * (girderZ + 0.66)
    parts.push(box(span, 0.08, 0.6, 0, girderY - 0.45, walk))
    for (const height of [0.6, 1]) {
      parts.push(box(span, 0.07, 0.07, 0, girderY - 0.45 + height, walk + sz * 0.27))
    }
    for (let i = 0; i <= 14; i++) {
      parts.push(box(0.07, 1.04, 0.07, -span / 2 + (span * i) / 14, girderY + 0.09, walk + sz * 0.27))
    }
  }

  // contraventamento em X entre as duas vigas, visto de cima
  for (const sx of [-1, 1]) {
    parts.push(box(0.5, 0.34, girderZ * 2, sx * railX * 0.55, girderY - 0.62, 0))
  }

  for (const sx of [-1, 1]) {
    // carro de translação: a caixa que abraça o trilho, com as rodas
    parts.push(box(1.5, 0.95, girderZ * 2 + 1.5, sx * railX, railY - 0.2, 0))
    parts.push(box(1.1, 0.5, 0.9, sx * railX, railY - 0.95, 0))
    for (const sz of [-1, 1]) {
      parts.push(rod(0.42, 0.34, sx * railX, railY - 0.62, sz * (girderZ + 0.5)))
    }
    // cartela entre o carro de translação e a viga
    parts.push(
      braceXY(
        0.3,
        new THREE.Vector3(sx * railX, railY - 1.1, 0),
        new THREE.Vector3(sx * (railX - 2.6), girderY + 0.4, 0),
      ),
    )
  }

  return merge(parts)
}

/** Onde os quatro cabos nascem no carro, e onde encostam no spreader. */
export const REEVING = [
  { top: [-1.55, -1.35], bottom: [-1.15, -0.85] },
  { top: [-1.55, 1.35], bottom: [-1.15, 0.85] },
  { top: [1.55, -1.35], bottom: [1.15, -0.85] },
  { top: [1.55, 1.35], bottom: [1.15, 0.85] },
] as const

/** Altura do ponto de amarração no spreader, acima da face que encosta na carga. */
export const SPREADER_EAR_Y = 0.46

/** O carro: rodas sobre o trilho da viga, corpo e a casa de máquinas. Y embutido. */
export function trolleyGeometry(rig: Rig): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [
    box(3.1, 0.7, rig.girderZ * 2 + 1.1, 0, rig.trolleyY, 0),
    box(1.9, 0.62, 3, 0, rig.trolleyY + 0.66, 0),
    // tambor do guincho, atravessado sob o carro
    rodX(0.34, 2.4, 0, rig.pivotY + 0.02, 0),
  ]
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) parts.push(box(0.46, 0.4, 0.34, sx * 1.1, rig.girderY + 0.85, sz * rig.girderZ))
    for (const sz of [-1, 1]) parts.push(box(0.16, 0.5, 0.16, sx * 1.55, rig.pivotY + 0.12, sz * 1.35))
  }
  return merge(parts)
}

/**
 * O spreader. A origem fica na face que encosta no contêiner, para que
 * `position.y = spreaderY` do modelo já o coloque no lugar certo.
 */
export function spreaderGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [box(1.6, 0.28, 0.55, 0, 0.6, 0)]
  for (const sz of [-1, 1]) parts.push(box(L + 0.1, 0.3, 0.24, 0, 0.19, sz * 1.16))
  for (const sx of [-1, 1]) parts.push(box(0.28, 0.28, 2.55, sx * 2.88, 0.19, 0))
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) parts.push(rod(0.075, 0.18, sx * 2.9, -0.05, sz * 1.16))
  }
  for (const cable of REEVING) {
    parts.push(box(0.16, 0.3, 0.16, cable.bottom[0], SPREADER_EAR_Y - 0.1, cable.bottom[1]))
  }
  return merge(parts)
}
