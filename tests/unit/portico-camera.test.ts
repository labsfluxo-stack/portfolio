import { describe, expect, it } from 'vitest'
import {
  ENVELOPE,
  OPERATOR,
  VIEW,
  boundsFor,
  boxOf,
  drift,
  frameFor,
  poseAt,
  shortestLoop,
  shotAt,
} from '@/components/three/portico-camera'
import { buildAssembly } from '@/components/three/portico-architecture'
import { rigFor } from '@/components/three/portico-geometry'
import { createShow } from '@/components/three/portico-model'
import { sceneRotation } from '@/components/three/portico-systems'
import { buildYard, manifestFor, stow } from '@/components/three/portico-yard'
import { systems } from '@/content/systems'

// A cena de verdade, montada dos mesmos dados que o navegador usa. Testar o
// enquadramento contra uma caixa inventada provaria a aritmética e não a cena:
// o que pega defeito é a máquina real, com a ponte real e o pátio real.
const rotation = sceneRotation(systems)
const assemblies = rotation.map(buildAssembly)
const manifest = manifestFor(assemblies.map((build) => build.cargo))
const yard = buildYard(manifest.bays, Math.max(...assemblies.map((build) => build.depth)))
const show = createShow(stow(manifest, yard.homes), manifest.crews, assemblies.map((build) => build.slots))
const rig = rigFor(show.peakY, show.reach)
const work = {
  x: Math.max(...assemblies.map((build) => build.width), 1) / 2,
  z: Math.max(...assemblies.map((build) => build.depth), 1) / 2,
}
const bounds = boundsFor(rig, work, yard.footprints, assemblies)

/** Os formatos que a cena de fato assume: faixa larga (1440) e painel (1024). */
const ASPECTS = [720 / 607, 512 / 607, 1.9, 0.85]

const solve = (aspect: number, moving = true) =>
  frameFor({
    box: boxOf(bounds),
    mass: boxOf(bounds.mass),
    fov: VIEW.fov,
    aspect,
    azimuth: VIEW.azimuth,
    elevation: VIEW.elevation,
    margin: VIEW.margin,
    targetY: bounds.targetY,
    envelope: moving ? ENVELOPE : null,
  })

type Vec = [number, number, number]
const minus = (a: readonly number[], b: readonly number[]): Vec => [
  (a[0] ?? 0) - (b[0] ?? 0),
  (a[1] ?? 0) - (b[1] ?? 0),
  (a[2] ?? 0) - (b[2] ?? 0),
]
const dot = (a: Vec, b: Vec): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec, b: Vec): Vec => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
const unit = (v: Vec): Vec => {
  const n = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / n, v[1] / n, v[2] / n]
}

/**
 * Onde um ponto do mundo cai na tela, em coordenada normalizada — 1 é a borda.
 *
 * Reproduz `lookAt` do three (z para trás, x = up × z, y = z × x) de propósito:
 * é a projeção de VERDADE que o teste precisa medir, não uma aproximação de
 * "altura aparente". Foi justamente estimar a olho que, antes, deixava a
 * máquina sair pelo chão do quadro.
 */
function project(
  camera: { position: Vec; look: Vec },
  point: readonly number[],
  aspect: number,
): { x: number; y: number; depth: number } {
  const zAxis = unit(minus(camera.position, camera.look))
  const xAxis = unit(cross([0, 1, 0], zAxis))
  const yAxis = cross(zAxis, xAxis)
  const v = minus(point, camera.position)
  const depth = -dot(v, zAxis)
  const tanV = Math.tan((VIEW.fov * Math.PI) / 360)
  return { x: dot(v, xAxis) / (depth * tanV * aspect), y: dot(v, yAxis) / (depth * tanV), depth }
}

describe('o movimento da câmera', () => {
  it('é determinístico: o mesmo instante devolve sempre a mesma pose', () => {
    for (const t of [0, 3.7, 91, 512.25, 4_000]) {
      expect(shotAt(t, show.cycle)).toEqual(shotAt(t, show.cycle))
    }
  })

  it('o ruído da mão é uma função do tempo, não um sorteio', () => {
    expect(drift(12.5, 2)).toBe(drift(12.5, 2))
    for (let t = 0; t < 200; t += 0.37) {
      expect(Math.abs(drift(t, 1)), `t=${t}`).toBeLessThanOrEqual(1)
    }
  })

  it('nunca sai do ENVELOPE — é ele que o enquadramento consome como pior caso', () => {
    // Varre a rotação inteira num passo fino. Se alguém subir uma amplitude em
    // OPERATOR e esquecer de ENVELOPE, o enquadramento deixa de garantir que a
    // máquina cabe e este teste é o que acusa.
    for (let t = 0; t < show.cycle; t += 0.25) {
      const shot = shotAt(t, show.cycle)
      expect(Math.abs(shot.yaw), `giro em t=${t}`).toBeLessThanOrEqual(ENVELOPE.yaw + 1e-9)
      expect(Math.abs(shot.pitch), `altura em t=${t}`).toBeLessThanOrEqual(ENVELOPE.pitch + 1e-9)
      expect(Math.abs(shot.panX), `pan em t=${t}`).toBeLessThanOrEqual(ENVELOPE.pan + 1e-9)
      expect(Math.abs(shot.panY), `pan em t=${t}`).toBeLessThanOrEqual(ENVELOPE.pan + 1e-9)
      // A aproximação é a única coisa que o enquadramento não precisa prever,
      // e só porque ela NUNCA afasta: a pose resolvida é a mais aberta.
      expect(shot.push, `aproximação em t=${t}`).toBeGreaterThanOrEqual(1)
      expect(shot.push).toBeLessThanOrEqual(1 + OPERATOR.dolly + 1e-9)
    }
  })

  it('o laço fecha no ciclo da cena — a câmera e a máquina terminam a volta juntas', () => {
    const start = shotAt(0, show.cycle)
    const end = shotAt(show.cycle, show.cycle)
    // O movimento de APARELHO (arco, altura, aproximação) é periódico no ciclo,
    // e a aproximação é a prova limpa disso: ela não leva ruído nenhum somado.
    expect(end.push).toBeCloseTo(start.push, 9)
    // O arco fecha igual; o que sobra entre os dois instantes é só o tremor da
    // mão, que não é periódico e não precisa ser — ruído não tem forma para o
    // olho reconhecer, que é justamente por que ele é ruído e não senoide.
    expect(Math.abs(end.yaw - start.yaw)).toBeLessThanOrEqual(2 * OPERATOR.handYaw)
    expect(Math.abs(end.pitch - start.pitch)).toBeLessThanOrEqual(2 * OPERATOR.handYaw)
  })

  it('o laço mais curto é longo demais para alguém pegar, e mesmo assim se vê andar', () => {
    // As duas metades da mesma decisão, e elas puxam para lados opostos.
    //
    // Longo o bastante: o que denuncia câmera automática é o espectador PEGAR
    // o laço. Um minuto e meio é mais do que qualquer um encara um hero.
    const loop = shortestLoop(show.cycle)
    expect(loop, 'o laço ficou curto de pegar').toBeGreaterThan(60)

    // E ainda assim visível: em dez segundos a câmera tem de andar o bastante
    // para o fundo ANDAR em relação à frente. Meio pixel por segundo é
    // indistinguível de câmera parada — foi o primeiro valor tentado, e por
    // isso este limite inferior existe.
    let swing = 0
    for (let t = 0; t < show.cycle; t += 1) {
      swing = Math.max(swing, Math.abs(shotAt(t + 10, show.cycle).yaw - shotAt(t, show.cycle).yaw))
    }
    expect(swing, 'a câmera está parada demais para ler como tomada').toBeGreaterThan(0.03)
  })
})

describe('o enquadramento', () => {
  it('a máquina cabe em TODO o percurso da câmera, não só na pose inicial', () => {
    // O invariante que o movimento obrigou a criar. Com a câmera parada bastava
    // resolver uma pose; com ela em arco, o canto que cabia raspando sai pela
    // borda no primeiro grau. Varre o ciclo inteiro e projeta os oito cantos.
    const fails: string[] = []
    for (const aspect of ASPECTS) {
      const framed = solve(aspect)
      for (let t = 0; t < show.cycle; t += 1.7) {
        const camera = poseAt(framed, shotAt(t, show.cycle), { ...VIEW, aspect })
        for (const corner of boxOf(bounds)) {
          const at = project(camera, corner, aspect)
          if (at.depth <= 0 || Math.abs(at.x) > 1 || Math.abs(at.y) > 1) {
            fails.push(`aspecto ${aspect.toFixed(2)}, t=${t.toFixed(1)}: (${at.x.toFixed(3)}, ${at.y.toFixed(3)})`)
          }
        }
      }
    }
    expect(fails.slice(0, 5)).toEqual([])
  }, 60_000)

  it('e não cabe com folga desperdiçada: em algum instante encosta na moldura', () => {
    // O outro lado do mesmo invariante. Recuar até tudo caber é fácil; recuar
    // demais deixa a máquina nadando no vazio, que é o defeito que a margem
    // existe para calibrar. A moldura pedida é 1/1,12 = 0,893 do quadro.
    for (const aspect of ASPECTS) {
      const framed = solve(aspect)
      let closest = 0
      for (let t = 0; t < show.cycle; t += 1.7) {
        const camera = poseAt(framed, shotAt(t, show.cycle), { ...VIEW, aspect })
        for (const corner of boxOf(bounds)) {
          const at = project(camera, corner, aspect)
          closest = Math.max(closest, Math.abs(at.x), Math.abs(at.y))
        }
      }
      expect(closest, `aspecto ${aspect.toFixed(2)}`).toBeGreaterThan(0.8)
    }
  }, 60_000)

  it('parada, a câmera recebe o enquadramento apertado — a sobra do arco é do arco', () => {
    // Quem tem `prefers-reduced-motion` não vê a câmera andar, então não pode
    // pagar a moldura extra que o percurso pede.
    for (const aspect of ASPECTS) {
      expect(solve(aspect, false).distance, `aspecto ${aspect}`).toBeLessThan(solve(aspect).distance)
    }
  })

  it('a mira se desloca para centrar a CARGA, não a caixa que precisa caber', () => {
    // Os trilhos abraçam o pátio inteiro e saem do quadro pelas laterais de
    // propósito. Centrar por eles é centrar pelo vazio — foi o defeito que
    // deixou contêineres cortados à direita e laje sobrando à esquerda.
    const aspect = 720 / 607
    const framed = solve(aspect)
    const camera = poseAt(framed, { yaw: 0, pitch: 0, push: 1, panX: 0, panY: 0 }, { ...VIEW, aspect })
    let low = Infinity
    let high = -Infinity
    for (const corner of boxOf(bounds.mass)) {
      const at = project(camera, corner, aspect)
      low = Math.min(low, at.x)
      high = Math.max(high, at.x)
    }
    expect(Math.abs(low + high), 'carga descentrada em X').toBeLessThan(0.02)
  })

  it('quanto mais estreito o painel, mais longe a câmera — nada é fixado em metros', () => {
    const wide = solve(1.9).distance
    const narrow = solve(0.85).distance
    expect(narrow).toBeGreaterThan(wide)
  })
})
