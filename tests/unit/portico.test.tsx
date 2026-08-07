import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PorticoFallback } from '@/components/three/PorticoFallback'
import {
  CONTAINER,
  HOLD,
  type Plan,
  type Pose,
  createPlan,
  createPose,
  createSway,
  layerShade,
  samplePose,
  slotCenterY,
  stackTop,
  stencilLines,
  stepSway,
  valueAt,
} from '@/components/three/portico-model'
import { buildArchitecture } from '@/components/three/portico-architecture'
import { buildYard } from '@/components/three/portico-yard'
import { pt } from '@/content/pt'
import { en } from '@/content/en'

const layers = pt.stack.layers
const architecture = buildArchitecture(layers)
const yard = buildYard(architecture.slots.length, architecture.spare.length)
const plan = createPlan(yard.source, architecture.slots)

/**
 * Percorre o ciclo inteiro num passo fino chamando `visit` a cada quadro.
 *
 * Reaproveita a pose de propósito: com ~25 contêineres e um ciclo de minutos,
 * guardar todos os quadros numa lista estoura a memória do runner antes de
 * provar qualquer coisa.
 */
function sweep(step: number, visit: (t: number, pose: Pose) => void): void {
  const pose = createPose(plan)
  for (let t = 0; t < plan.cycle; t += step) visit(t, samplePose(plan, t, pose))
}

const HALF_L = CONTAINER.length / 2
const HALF_W = CONTAINER.width / 2

describe('PorticoFallback', () => {
  it('é decorativo e não anuncia nada ao leitor de tela', () => {
    const { container } = render(<PorticoFallback layers={layers} />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('desenha um patamar por camada do stack', () => {
    const { container } = render(<PorticoFallback layers={layers} />)
    // Um rótulo estampado por patamar — o texto é a prova de que a camada
    // existe no desenho, e não um retângulo qualquer.
    expect(container.querySelectorAll('text')).toHaveLength(layers.length + 2)
  })

  it('empilha na ordem do stack: a primeira camada na base, a última no topo', () => {
    const { container } = render(<PorticoFallback layers={layers} />)
    const drawn = [...container.querySelectorAll('text')]
      .filter((node) => layers.some((layer) => layer.label.toUpperCase() === node.textContent))
      .map((node) => ({ label: node.textContent, y: Number(node.getAttribute('y')) }))

    // No SVG o eixo Y cresce para baixo: a base da pirâmide é o maior `y`.
    const bottomUp = [...drawn].sort((a, b) => b.y - a.y).map((item) => item.label)
    expect(bottomUp).toEqual(layers.map((layer) => layer.label.toUpperCase()))
  })

  it('a elevação é a mesma pirâmide da cena: patamar de cima nunca mais largo que o de baixo', () => {
    const { container } = render(<PorticoFallback layers={layers} />)
    const boxes = [...container.querySelectorAll('rect')]
      .filter((node) => node.getAttribute('stroke-width') === '1.2')
      .map((node) => ({ y: Number(node.getAttribute('y')), width: Number(node.getAttribute('width')) }))
      .sort((a, b) => b.y - a.y)

    expect(boxes).toHaveLength(architecture.tiers.length)
    for (let i = 1; i < boxes.length; i++) {
      expect(boxes[i]?.width ?? 0, `patamar ${i}`).toBeLessThanOrEqual(boxes[i - 1]?.width ?? 0)
    }
    expect(boxes[boxes.length - 1]?.width ?? 0).toBeLessThan(boxes[0]?.width ?? 0)
  })

  it('as cotas saem das constantes do modelo, não de número escrito à mão', () => {
    const { container } = render(<PorticoFallback layers={layers} />)
    const texts = [...container.querySelectorAll('text')].map((node) => node.textContent)
    expect(texts).toContain(String(Math.round(architecture.width * 1000)))
    expect(texts).toContain(String(Math.round(architecture.height * 1000)))
  })

  it('não quebra com o dicionário vazio', () => {
    const { container } = render(<PorticoFallback layers={[]} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})

describe('stencilLines', () => {
  it('quebra em duas linhas sem deixar nenhuma passar de 14 caracteres, nos dois idiomas', () => {
    for (const dict of [pt, en]) {
      for (const layer of dict.stack.layers) {
        const lines = stencilLines(layer.label)
        expect(lines.length, layer.label).toBeLessThanOrEqual(2)
        for (const line of lines) expect(line.length, `${layer.label} -> ${line}`).toBeLessThanOrEqual(14)
      }
    }
  })

  it('nunca começa a segunda linha com "&"', () => {
    expect(stencilLines('Qualidade & Entrega')).toEqual(['QUALIDADE &', 'ENTREGA'])
    expect(stencilLines('Redes & Infraestrutura')).toEqual(['REDES &', 'INFRAESTRUTURA'])
  })

  it('rótulo de uma palavra fica numa linha só', () => {
    expect(stencilLines('Backend')).toEqual(['BACKEND'])
    expect(stencilLines('Front-end')).toEqual(['FRONT-END'])
  })

  it('não quebra com string vazia', () => {
    expect(stencilLines('')).toEqual([''])
  })
})

describe('ciclo da ponte rolante', () => {
  it('é determinístico: o mesmo instante devolve sempre a mesma pose', () => {
    for (const t of [0, 37, plan.loadTime - 0.01, plan.loadTime + 2, plan.cycle - 0.5]) {
      const a = samplePose(plan, t, createPose(plan))
      const b = samplePose(plan, t, createPose(plan))
      expect([...a.x], `t=${t}`).toEqual([...b.x])
      expect([...a.y], `t=${t}`).toEqual([...b.y])
      expect([...a.z], `t=${t}`).toEqual([...b.z])
      expect(a.trolleyX).toBe(b.trolleyX)
      expect(a.bridgeZ).toBe(b.bridgeZ)
      expect(a.spreaderY).toBe(b.spreaderY)
    }
  })

  it('a cena começa com a frente VAZIA: no instante zero nada está na arquitetura', () => {
    const pose = samplePose(plan, 0, createPose(plan))
    for (let id = 0; id < plan.count; id++) {
      const home = plan.source[plan.count - 1 - id]
      expect(valueAt(pose.x, id), `contêiner ${id}`).toBeCloseTo(home?.x ?? 0, 6)
      expect(valueAt(pose.z, id), `contêiner ${id}`).toBeCloseTo(home?.z ?? 0, 6)
      // Nenhum contêiner na frente: todos estão atrás do corredor.
      expect(valueAt(pose.z, id), `contêiner ${id}`).toBeLessThan(-architecture.depth)
    }
  })

  it('na parada, a arquitetura está montada inteira, na ordem do stack', () => {
    const pose = samplePose(plan, plan.loadTime + HOLD / 2, createPose(plan))
    expect(pose.carried).toBe(-1)
    for (let id = 0; id < plan.count; id++) {
      const slot = architecture.slots[id]
      expect(valueAt(pose.x, id), `contêiner ${id}`).toBeCloseTo(slot?.x ?? 0, 6)
      expect(valueAt(pose.y, id), `contêiner ${id}`).toBeCloseTo(slot?.y ?? 0, 6)
      expect(valueAt(pose.z, id), `contêiner ${id}`).toBeCloseTo(slot?.z ?? 0, 6)
    }
  })

  it('no fim do ciclo o pátio volta a ser o do começo — o laço fecha sem corte', () => {
    const start = samplePose(plan, 0, createPose(plan))
    const end = samplePose(plan, plan.cycle - 1e-6, createPose(plan))
    for (let id = 0; id < plan.count; id++) {
      expect(valueAt(end.x, id), `contêiner ${id}`).toBeCloseTo(valueAt(start.x, id), 6)
      expect(valueAt(end.y, id), `contêiner ${id}`).toBeCloseTo(valueAt(start.y, id), 6)
      expect(valueAt(end.z, id), `contêiner ${id}`).toBeCloseTo(valueAt(start.z, id), 6)
    }
    expect(end.trolleyX).toBeCloseTo(start.trolleyX, 6)
    expect(end.bridgeZ).toBeCloseTo(start.bridgeZ, 6)
    expect(end.spreaderY).toBeCloseTo(start.spreaderY, 6)
  })

  it('o pátio guarda os contêineres na ordem invertida — é o que faz o laço fechar', () => {
    const pose = samplePose(plan, plan.cycle - 0.5, createPose(plan))
    for (let id = 0; id < plan.count; id++) {
      const home = plan.source[plan.count - 1 - id]
      expect(valueAt(pose.y, id), `contêiner ${id}`).toBeCloseTo(home?.y ?? 0, 6)
    }
  })

  it('nada teleporta: nenhuma peça anda mais que 0,4 m entre dois quadros', () => {
    const previous = { x: new Float64Array(plan.count), y: new Float64Array(plan.count), z: new Float64Array(plan.count) }
    let machine = { x: 0, y: 0, z: 0 }
    let first = true
    const jumps: string[] = []

    sweep(1 / 60, (t, pose) => {
      if (!first) {
        const at = `t=${t.toFixed(2)}`
        if (Math.abs(pose.trolleyX - machine.x) >= 0.4) jumps.push(`carro em ${at}`)
        if (Math.abs(pose.bridgeZ - machine.z) >= 0.4) jumps.push(`ponte em ${at}`)
        if (Math.abs(pose.spreaderY - machine.y) >= 0.4) jumps.push(`cabo em ${at}`)
        for (let id = 0; id < plan.count; id++) {
          const jump = Math.hypot(
            valueAt(pose.x, id) - (previous.x[id] ?? 0),
            valueAt(pose.y, id) - (previous.y[id] ?? 0),
            valueAt(pose.z, id) - (previous.z[id] ?? 0),
          )
          if (jump >= 0.4) jumps.push(`contêiner ${id} em ${at}: ${jump.toFixed(3)} m`)
        }
      }
      first = false
      previous.x.set(pose.x)
      previous.y.set(pose.y)
      previous.z.set(pose.z)
      machine = { x: pose.trolleyX, y: pose.spreaderY, z: pose.bridgeZ }
    })

    expect(jumps.slice(0, 5)).toEqual([])
  }, 30_000)

  it('dois contêineres nunca ocupam o mesmo lugar', () => {
    const clashes: string[] = []
    sweep(1 / 15, (t, pose) => {
      for (let a = 0; a < plan.count; a++) {
        for (let b = a + 1; b < plan.count; b++) {
          const apart =
            Math.abs(valueAt(pose.x, a) - valueAt(pose.x, b)) > CONTAINER.length * 0.9 ||
            Math.abs(valueAt(pose.y, a) - valueAt(pose.y, b)) > CONTAINER.height * 0.9 ||
            Math.abs(valueAt(pose.z, a) - valueAt(pose.z, b)) > CONTAINER.width * 0.9
          if (!apart) clashes.push(`contêineres ${a} e ${b} em t=${t.toFixed(2)}`)
        }
      }
    })
    expect(clashes.slice(0, 5)).toEqual([])
  }, 30_000)

  it('o contêiner içado nunca raspa numa pilha em repouso', () => {
    const scrapes: string[] = []
    sweep(1 / 30, (t, pose) => {
      if (pose.carried < 0) return
      const bottom = valueAt(pose.y, pose.carried) - CONTAINER.height / 2
      const cx = valueAt(pose.x, pose.carried)
      const cz = valueAt(pose.z, pose.carried)
      for (let id = 0; id < plan.count; id++) {
        if (id === pose.carried) continue
        // Sobreposição física de verdade: as duas plantas se cruzam quando os
        // centros estão a menos de um comprimento e de uma largura.
        const overlaps =
          Math.abs(valueAt(pose.x, id) - cx) < CONTAINER.length && Math.abs(valueAt(pose.z, id) - cz) < CONTAINER.width
        if (!overlaps) continue
        const top = valueAt(pose.y, id) + CONTAINER.height / 2
        // Encostar exatamente no topo é o próprio encaixe; atravessar não.
        if (bottom <= top - 0.005) {
          scrapes.push(`contêiner ${id} em t=${t.toFixed(2)}: fundo ${bottom.toFixed(3)} < topo ${top.toFixed(3)}`)
        }
      }
    })
    expect(scrapes.slice(0, 5)).toEqual([])
  }, 30_000)

  it('a carga também nunca raspa nas pilhas paradas do fundo', () => {
    const scrapes: string[] = []
    sweep(1 / 20, (t, pose) => {
      if (pose.carried < 0) return
      const bottom = valueAt(pose.y, pose.carried) - CONTAINER.height / 2
      const cx = valueAt(pose.x, pose.carried)
      const cz = valueAt(pose.z, pose.carried)
      for (const slot of yard.spare) {
        const overlaps = Math.abs(slot.x - cx) < CONTAINER.length && Math.abs(slot.z - cz) < CONTAINER.width
        if (overlaps && bottom <= slot.y + CONTAINER.height / 2 - 0.005) {
          scrapes.push(`pilha parada em ${slot.x},${slot.z} em t=${t.toFixed(2)}`)
        }
      }
    })
    expect(scrapes.slice(0, 5)).toEqual([])
  }, 30_000)

  it('a máquina nunca escava: o contêiner que ela pega nunca tem outro em cima', () => {
    const check = (moves: Plan['load'], slotsBefore: (k: number) => { x: number; y: number; z: number }[]) => {
      moves.forEach((move, k) => {
        for (const slot of slotsBefore(k)) {
          const above =
            Math.abs(slot.x - move.pick.x) < CONTAINER.length &&
            Math.abs(slot.z - move.pick.z) < CONTAINER.width &&
            slot.y > move.pick.y + 0.01
          expect(above, `movimento ${k} em ${move.pick.x},${move.pick.y},${move.pick.z}`).toBe(false)
        }
      })
    }
    // Montando, o que ainda está no pátio são os lugares de origem que
    // sobraram; desmontando, o que ainda está na pirâmide.
    check(plan.load, (k) => plan.source.slice(0, plan.count - k - 1) as { x: number; y: number; z: number }[])
    check(plan.unload, (k) => plan.target.slice(0, plan.count - k - 1) as { x: number; y: number; z: number }[])
  })

  it('a altura de trabalho de cada movimento passa por cima do que já está assentado', () => {
    const ceiling = (slots: readonly { y: number }[]): number =>
      slots.reduce((high, slot) => Math.max(high, slot.y + CONTAINER.height / 2), -Infinity)

    plan.load.forEach((move, k) => {
      // Do lado de onde se tira: o que ainda não foi tirado. Do lado onde se
      // põe: o que já foi posto. O fundo da carga passa acima dos dois.
      const remaining = ceiling(plan.source.slice(0, plan.count - 1 - k))
      const placed = ceiling(plan.target.slice(0, k))
      if (Number.isFinite(remaining)) {
        expect(move.liftY - CONTAINER.height, `pegada ${k}`).toBeGreaterThan(remaining)
      }
      if (Number.isFinite(placed)) {
        expect(move.dropY - CONTAINER.height, `largada ${k}`).toBeGreaterThan(placed)
      }
      // E nem um metro além do necessário: a máquina não voa alto à toa.
      expect(move.dropY - CONTAINER.height, `largada ${k}`).toBeLessThan(
        Math.max(placed, move.place.y - CONTAINER.height / 2) + CONTAINER.height,
      )
    })
  })

  it('a máquina não voa mais alto do que a arquitetura exige', () => {
    const top = architecture.height + CONTAINER.height + 1
    expect(plan.peakY).toBeGreaterThan(architecture.height)
    expect(plan.peakY).toBeLessThan(top)
  })

  it('a duração de cada içamento acompanha a distância — nada é disparado de canhão', () => {
    let peak = 0
    const step = 1 / 120
    const pose = createPose(plan)
    let previous = samplePose(plan, 0, pose).spreaderY
    for (let t = step; t < plan.cycle; t += step) {
      const now = samplePose(plan, t, pose).spreaderY
      peak = Math.max(peak, Math.abs(now - previous) / step)
      previous = now
    }
    // Uma ponte rolante não sobe carga a mais de ~10 m/s nem no pico da curva;
    // passar disso é o sintoma de fase de duração fixa.
    expect(peak).toBeLessThan(10)
  })

  it('o translado horizontal também respeita o limite do acionamento', () => {
    let peak = 0
    const step = 1 / 120
    const pose = createPose(plan)
    let before = samplePose(plan, 0, pose)
    let previous = { x: before.trolleyX, z: before.bridgeZ }
    for (let t = step; t < plan.cycle; t += step) {
      before = samplePose(plan, t, pose)
      peak = Math.max(peak, Math.hypot(before.trolleyX - previous.x, before.bridgeZ - previous.z) / step)
      previous = { x: before.trolleyX, z: before.bridgeZ }
    }
    expect(peak).toBeLessThan(30)
  })

  it('a montagem é de baixo para cima: nenhum patamar começa antes do de baixo fechar', () => {
    let previousY = -Infinity
    for (const move of plan.load) {
      expect(move.place.y, 'ordem de montagem').toBeGreaterThanOrEqual(previousY - 1e-9)
      previousY = move.place.y
    }
  })

  it('as constantes de pilha continuam coerentes', () => {
    expect(slotCenterY(0)).toBeCloseTo(CONTAINER.height / 2, 6)
    expect(stackTop(3)).toBeCloseTo(3 * CONTAINER.height, 6)
    expect(HALF_L + HALF_W).toBeGreaterThan(0)
  })
})

describe('balanço do cabo', () => {
  it('com a máquina parada, o balanço morre sozinho', () => {
    const sway = createSway()
    sway.thetaX = 0.05
    sway.thetaZ = 0.05
    for (let i = 0; i < 1200; i++) stepSway(sway, 0, 0, 6, 1)
    expect(Math.abs(sway.thetaX)).toBeLessThan(0.002)
    expect(Math.abs(sway.thetaZ)).toBeLessThan(0.002)
  })

  it('o carro arrancando joga o contêiner para trás, não para a frente', () => {
    const sway = createSway()
    let x = 0
    // 60 passos acelerando na direção de -x: a carga tem de ficar atrasada.
    for (let i = 0; i < 60; i++) {
      x -= 0.0006 * i
      stepSway(sway, x, 0, 6, 1)
    }
    expect(sway.thetaX).toBeGreaterThan(0)
  })

  it('a ponte arrancando balança no OUTRO eixo, e só nele', () => {
    const sway = createSway()
    let z = 0
    for (let i = 0; i < 60; i++) {
      z -= 0.0006 * i
      stepSway(sway, 0, z, 6, 1)
    }
    expect(sway.thetaZ).toBeGreaterThan(0)
    expect(sway.thetaX).toBe(0)
  })

  it('o spreader travado numa pilha não balança', () => {
    const sway = createSway()
    sway.thetaX = 0.05
    sway.thetaZ = 0.05
    sway.omegaX = 0.4
    for (let i = 0; i < 40; i++) stepSway(sway, 0, 0, 3, 0)
    expect(Math.abs(sway.thetaX)).toBeLessThan(0.004)
    expect(Math.abs(sway.thetaZ)).toBeLessThan(0.004)
  })

  it('o passo é fixo, então a cena é a mesma em qualquer taxa de quadros', async () => {
    const { SWAY_STEP } = await import('@/components/three/portico-model')
    expect(SWAY_STEP).toBe(1 / 120)
  })
})

describe('paleta', () => {
  it('a variação de valor por patamar é monotônica e discreta', () => {
    const shades = Array.from({ length: layers.length }, (_, i) => layerShade(i))
    for (let i = 1; i < shades.length; i++) expect(shades[i] ?? 0).toBeGreaterThan(shades[i - 1] ?? 0)
    // Sem contraste de tinta nova: é a mesma cor, do mesmo token, em valores
    // próximos.
    expect(Math.max(...shades) - Math.min(...shades)).toBeLessThan(0.8)
  })
})
