import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PorticoFallback } from '@/components/three/PorticoFallback'
import {
  BAY,
  CONTAINER,
  CYCLE,
  HALF,
  HOLD,
  LAYER_COUNT,
  SWAY_STEP,
  createPose,
  createSway,
  layerAt,
  layerShade,
  samplePose,
  slotCenterY,
  stackTop,
  stencilLines,
  stepSway,
  travelHeight,
} from '@/components/three/portico-model'
import { pt } from '@/content/pt'
import { en } from '@/content/en'

const labels = pt.stack.layers.map((layer) => layer.label)

/** Amostra o ciclo inteiro num passo fino, para as invariantes valerem em todo t. */
function sweep(step = 1 / 60): { t: number; pose: ReturnType<typeof createPose> }[] {
  const frames: { t: number; pose: ReturnType<typeof createPose> }[] = []
  for (let t = 0; t < CYCLE; t += step) {
    frames.push({ t, pose: samplePose(t, createPose()) })
  }
  return frames
}

describe('PorticoFallback', () => {
  it('é decorativo e não anuncia nada ao leitor de tela', () => {
    const { container } = render(<PorticoFallback labels={labels} />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('desenha um contêiner por camada do stack', () => {
    const { container } = render(<PorticoFallback labels={labels} />)
    // Um rótulo estampado por camada — o texto é a prova de que a camada
    // existe no desenho, e não um retângulo qualquer.
    expect(container.querySelectorAll('text')).toHaveLength(LAYER_COUNT + 2)
  })

  it('empilha na ordem do stack: a primeira camada na base, a última no topo', () => {
    const { container } = render(<PorticoFallback labels={labels} />)
    const drawn = [...container.querySelectorAll('text')]
      .filter((node) => labels.some((label) => label.toUpperCase() === node.textContent))
      .map((node) => ({ label: node.textContent, y: Number(node.getAttribute('y')) }))

    // No SVG o eixo Y cresce para baixo: a base da pilha é o maior `y`.
    const bottomUp = [...drawn].sort((a, b) => b.y - a.y).map((item) => item.label)
    expect(bottomUp).toEqual(labels.map((label) => label.toUpperCase()))
  })

  it('as cotas saem das constantes do modelo, não de número escrito à mão', () => {
    const { container } = render(<PorticoFallback labels={labels} />)
    const texts = [...container.querySelectorAll('text')].map((node) => node.textContent)
    expect(texts).toContain(String(Math.round(CONTAINER.length * 1000)))
    expect(texts).toContain(String(Math.round(LAYER_COUNT * CONTAINER.height * 1000)))
  })

  it('não quebra com o dicionário vazio', () => {
    const { container } = render(<PorticoFallback labels={[]} />)
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

describe('ciclo do pórtico', () => {
  it('é determinístico: o mesmo instante devolve sempre a mesma pose', () => {
    for (const t of [0, 3.7, HALF - 0.01, HALF + 2, CYCLE - 0.5]) {
      const a = samplePose(t, createPose())
      const b = samplePose(t, createPose())
      expect([...a.x], `t=${t}`).toEqual([...b.x])
      expect([...a.y], `t=${t}`).toEqual([...b.y])
      expect(a.trolleyX).toBe(b.trolleyX)
      expect(a.spreaderY).toBe(b.spreaderY)
    }
  })

  it('na parada, o sistema está montado na baia de destino, na ordem do stack', () => {
    const pose = samplePose(HALF + HOLD / 2, createPose())
    expect(pose.carried).toBe(-1)
    for (let layer = 0; layer < LAYER_COUNT; layer++) {
      expect(pose.x[layer], `camada ${layer}`).toBe(BAY.target)
      expect(pose.y[layer], `camada ${layer}`).toBeCloseTo(slotCenterY(layer), 6)
    }
  })

  it('no fim do ciclo o pátio volta a ser o do começo — o laço fecha sem corte', () => {
    const start = samplePose(0, createPose())
    const end = samplePose(CYCLE - 1e-6, createPose())
    expect([...end.x]).toEqual([...start.x])
    for (let layer = 0; layer < LAYER_COUNT; layer++) {
      expect(layerAt(end.y, layer), `camada ${layer}`).toBeCloseTo(layerAt(start.y, layer), 6)
    }
    expect(end.trolleyX).toBeCloseTo(start.trolleyX, 6)
    expect(end.spreaderY).toBeCloseTo(start.spreaderY, 6)
  })

  it('a pilha de origem guarda as camadas invertidas — é o que faz o laço fechar', () => {
    const pose = samplePose(CYCLE - 0.5, createPose())
    for (let layer = 0; layer < LAYER_COUNT; layer++) {
      expect(layerAt(pose.x, layer)).toBe(BAY.source)
      expect(layerAt(pose.y, layer), `camada ${layer}`).toBeCloseTo(slotCenterY(LAYER_COUNT - 1 - layer), 6)
    }
  })

  it('nada teleporta: nenhuma peça anda mais que 0,4 m entre dois quadros', () => {
    const frames = sweep()
    for (let i = 1; i < frames.length; i++) {
      const before = frames[i - 1]
      const now = frames[i]
      if (!before || !now) continue
      expect(Math.abs(now.pose.trolleyX - before.pose.trolleyX), `carro em t=${now.t.toFixed(2)}`).toBeLessThan(0.4)
      expect(Math.abs(now.pose.spreaderY - before.pose.spreaderY), `cabo em t=${now.t.toFixed(2)}`).toBeLessThan(0.4)
      for (let layer = 0; layer < LAYER_COUNT; layer++) {
        const jump = Math.hypot(
          layerAt(now.pose.x, layer) - layerAt(before.pose.x, layer),
          layerAt(now.pose.y, layer) - layerAt(before.pose.y, layer),
        )
        expect(jump, `camada ${layer} em t=${now.t.toFixed(2)}`).toBeLessThan(0.4)
      }
    }
  })

  it('duas camadas nunca ocupam o mesmo lugar', () => {
    for (const { t, pose } of sweep(1 / 20)) {
      for (let a = 0; a < LAYER_COUNT; a++) {
        for (let b = a + 1; b < LAYER_COUNT; b++) {
          const apart =
            Math.abs(layerAt(pose.x, a) - layerAt(pose.x, b)) > CONTAINER.length * 0.9 ||
            Math.abs(layerAt(pose.y, a) - layerAt(pose.y, b)) > CONTAINER.height * 0.9
          expect(apart, `camadas ${a} e ${b} em t=${t.toFixed(2)}`).toBe(true)
        }
      }
    }
  })

  it('o contêiner içado nunca raspa numa pilha em repouso', () => {
    for (const { t, pose } of sweep(1 / 40)) {
      if (pose.carried < 0) continue
      const bottom = layerAt(pose.y, pose.carried) - CONTAINER.height / 2
      for (let layer = 0; layer < LAYER_COUNT; layer++) {
        if (layer === pose.carried) continue
        // Sobreposição física de verdade — as duas plantas se cruzam a partir
        // de um comprimento inteiro de distância entre centros.
        const overlaps = Math.abs(layerAt(pose.x, layer) - layerAt(pose.x, pose.carried)) < CONTAINER.length
        if (!overlaps) continue
        const top = layerAt(pose.y, layer) + CONTAINER.height / 2
        // Encostar exatamente no topo é o próprio encaixe; atravessar não.
        expect(bottom, `camada ${layer} em t=${t.toFixed(2)}`).toBeGreaterThan(top - 0.005)
      }
    }
  })

  it('a altura de translado sempre passa por cima do obstáculo mais alto', () => {
    for (let k = 0; k < LAYER_COUNT; k++) {
      const obstacle = Math.max(stackTop(LAYER_COUNT - 1 - k), stackTop(k))
      expect(travelHeight(k) - CONTAINER.height, `movimento ${k}`).toBeGreaterThan(obstacle)
    }
  })

  it('a duração de cada içamento acompanha a distância — nada é disparado de canhão', () => {
    let peak = 0
    const step = 1 / 120
    let previous = samplePose(0, createPose()).spreaderY
    for (let t = step; t < CYCLE; t += step) {
      const now = samplePose(t, createPose()).spreaderY
      peak = Math.max(peak, Math.abs(now - previous) / step)
      previous = now
    }
    // Um pórtico de pátio não sobe carga a mais de ~10 m/s nem no pico da
    // curva; passar disso é o sintoma de fase de duração fixa.
    expect(peak).toBeLessThan(10)
  })
})

describe('balanço do cabo', () => {
  it('com o carro parado, o balanço morre sozinho', () => {
    const sway = createSway()
    sway.theta = 0.05
    for (let i = 0; i < 1200; i++) stepSway(sway, BAY.source, 6, 1)
    expect(Math.abs(sway.theta)).toBeLessThan(0.002)
  })

  it('o carro arrancando joga o contêiner para trás, não para a frente', () => {
    const sway = createSway()
    let x = BAY.source
    // 60 passos acelerando na direção de -x: a carga tem de ficar atrasada.
    for (let i = 0; i < 60; i++) {
      x -= 0.0006 * i
      stepSway(sway, x, 6, 1)
    }
    expect(sway.theta).toBeGreaterThan(0)
  })

  it('o spreader travado numa pilha não balança', () => {
    const sway = createSway()
    sway.theta = 0.05
    sway.omega = 0.4
    for (let i = 0; i < 40; i++) stepSway(sway, BAY.source, 3, 0)
    expect(Math.abs(sway.theta)).toBeLessThan(0.004)
  })

  it('o passo é fixo, então a cena é a mesma em qualquer taxa de quadros', () => {
    expect(SWAY_STEP).toBe(1 / 120)
  })
})

describe('paleta', () => {
  it('a variação de valor por camada é monotônica e discreta', () => {
    const shades = Array.from({ length: LAYER_COUNT }, (_, i) => layerShade(i))
    for (let i = 1; i < shades.length; i++) expect(shades[i] ?? 0).toBeGreaterThan(shades[i - 1] ?? 0)
    // Sem contraste de tinta nova: é a mesma cor, do mesmo token, em valores
    // próximos.
    expect(Math.max(...shades) - Math.min(...shades)).toBeLessThan(0.8)
  })
})
