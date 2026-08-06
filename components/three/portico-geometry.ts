import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { CONTAINER } from './portico-model'

/**
 * A carpintaria da cena: as peças do contêiner e do pórtico, fundidas em
 * poucas geometrias.
 *
 * Um contêiner de verdade tem moldura aparente e chapa recuada — a caixa lisa
 * é o que faz uma cena 3D parecer Minecraft. Isso custa umas vinte peças por
 * contêiner; `mergeGeometries` funde cada conjunto numa geometria só, e as
 * seis camadas passam a custar três draw calls cada em vez de vinte.
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

/** Barra inclinada no plano YZ (contraventamento das pernas do pórtico). */
function braceYZ(thickness: number, from: THREE.Vector3, to: THREE.Vector3): THREE.BufferGeometry {
  const span = from.distanceTo(to)
  const geometry = new THREE.BoxGeometry(thickness, span, thickness)
  geometry.rotateX(Math.atan2(to.z - from.z, to.y - from.y))
  geometry.translate((from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2)
  return geometry
}

/** Barra inclinada no plano XZ (contraventamento entre os estradeiros). */
function braceXZ(thickness: number, from: THREE.Vector3, to: THREE.Vector3): THREE.BufferGeometry {
  const span = from.distanceTo(to)
  const geometry = new THREE.BoxGeometry(span, thickness, thickness)
  geometry.rotateY(Math.atan2(from.z - to.z, to.x - from.x))
  geometry.translate((from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2)
  return geometry
}

const merge = (parts: THREE.BufferGeometry[]): THREE.BufferGeometry => {
  const merged = mergeGeometries(parts, false)
  for (const part of parts) part.dispose()
  if (!merged) throw new Error('não deu para fundir a geometria do pórtico')
  return merged
}

/**
 * A chapa: uma caixa recuada da moldura, com um material por face para que a
 * lateral (que leva o estêncil e a corrugação em pé) não seja a mesma coisa
 * que o teto (corrugação atravessada) ou o fundo (liso).
 *
 * Ordem dos grupos de `BoxGeometry`: +X, −X, +Y, −Y, +Z, −Z — ou seja,
 * testeira da porta, testeira cega, teto, fundo e as duas laterais.
 */
export const plateGeometry = (): THREE.BoxGeometry => new THREE.BoxGeometry(L - 2 * INSET, H - 2 * INSET, W - 2 * INSET)

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

// ── Pórtico ───────────────────────────────────────────────────────────────

export const RIG = {
  /** Distância do eixo das pernas ao centro do pátio. */
  legX: 8.8,
  legZ: 4.2,
  /** Altura do eixo dos estradeiros. */
  girderY: 17.55,
  /** Onde os cabos saem do carro — é o pivô do pêndulo. */
  pivotY: 18.5,
  trolleyY: 18.83,
} as const

const GIRDER_SPAN = RIG.legX * 2 + 1

export function gantryGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = []
  const { legX, legZ, girderY } = RIG

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      // perna e o truque que a apoia no piso
      parts.push(box(0.62, girderY, 0.62, sx * legX, girderY / 2, sz * legZ))
      parts.push(box(1.35, 0.6, 1.8, sx * legX, 0.3, sz * legZ))
    }
    // travessa inferior e cabeceira do pórtico, unindo as duas pernas do lado
    parts.push(box(0.46, 0.46, legZ * 2 + 0.62, sx * legX, 1.55, 0))
    parts.push(box(0.72, 0.78, legZ * 2 + 0.62, sx * legX, girderY, 0))

    // contraventamento em X no plano da perna — o que faz a estrutura parecer
    // calculada em vez de desenhada
    parts.push(braceYZ(0.3, new THREE.Vector3(sx * legX, 2.0, -legZ), new THREE.Vector3(sx * legX, girderY - 1.1, legZ)))
    parts.push(braceYZ(0.3, new THREE.Vector3(sx * legX, 2.0, legZ), new THREE.Vector3(sx * legX, girderY - 1.1, -legZ)))

    for (const sz of [-1, 1]) {
      // cartela no encontro da perna com o estradeiro
      const gusset = new THREE.BoxGeometry(1.9, 0.34, 0.5)
      gusset.rotateZ((sx * Math.PI) / 4)
      gusset.translate(sx * (legX - 0.72), girderY - 0.95, sz * legZ)
      parts.push(gusset)
    }
  }

  for (const sz of [-1, 1]) {
    // estradeiro e o trilho por onde o carro corre
    parts.push(box(GIRDER_SPAN, 0.9, 0.6, 0, girderY, sz * legZ))
    parts.push(box(GIRDER_SPAN, 0.14, 0.26, 0, girderY + 0.52, sz * legZ))

    // Passadiço e guarda-corpo por fora do estradeiro. Sem isto o estradeiro é
    // uma barra chapada atravessando o alto do quadro — o elemento mais largo
    // da cena e o único sem estrutura. Um corrimão é o detalhe que diz "gente
    // sobe aqui para fazer manutenção", e é o que separa máquina de bloco.
    const walk = sz * (legZ + 0.62)
    parts.push(box(GIRDER_SPAN, 0.08, 0.62, 0, girderY - 0.4, walk))
    for (const height of [0.62, 1.02]) {
      parts.push(box(GIRDER_SPAN, 0.07, 0.07, 0, girderY - 0.4 + height, walk + sz * 0.28))
    }
    for (let i = 0; i <= 12; i++) {
      const x = -GIRDER_SPAN / 2 + (GIRDER_SPAN * i) / 12
      parts.push(box(0.07, 1.06, 0.07, x, girderY + 0.15, walk + sz * 0.28))
    }
  }

  // Escada de marinheiro numa das pernas — mesma ideia: dá escala humana à
  // estrutura e diz de que tamanho a máquina é.
  const ladderX = legX - 0.38
  for (const sx of [-1, 1]) {
    parts.push(box(0.07, girderY - 2.2, 0.07, ladderX, girderY / 2 + 0.9, legZ + sx * 0.26))
  }
  for (let i = 0; i < 26; i++) {
    parts.push(box(0.06, 0.06, 0.52, ladderX, 1.6 + i * 0.58, legZ))
  }

  // contraventamento horizontal entre os dois estradeiros
  const half = GIRDER_SPAN / 2
  parts.push(
    braceXZ(0.28, new THREE.Vector3(-half, girderY - 0.52, -legZ), new THREE.Vector3(half, girderY - 0.52, legZ)),
  )
  parts.push(
    braceXZ(0.28, new THREE.Vector3(-half, girderY - 0.52, legZ), new THREE.Vector3(half, girderY - 0.52, -legZ)),
  )

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

/** O carro: rodas sobre o trilho, corpo e a casa de máquinas. Y já embutido. */
export function trolleyGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [
    box(2.7, 0.66, RIG.legZ * 2 + 1, 0, RIG.trolleyY, 0),
    box(1.7, 0.55, 3.2, 0, RIG.trolleyY + 0.61, 0),
  ]
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) parts.push(box(0.42, 0.36, 0.32, sx * 0.98, RIG.girderY + 0.77, sz * RIG.legZ))
    for (const sz of [-1, 1]) parts.push(box(0.16, 0.5, 0.16, sx * 1.55, RIG.pivotY + 0.1, sz * 1.35))
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
