import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PorticoFallback } from '@/components/three/PorticoFallback'
import {
  CONTAINER,
  HOLD,
  type Pose,
  type Show,
  createPose,
  createShow,
  createSway,
  samplePose,
  slotCenterY,
  stackTop,
  stencilLines,
  stepSway,
  valueAt,
} from '@/components/three/portico-model'
import { buildAssembly } from '@/components/three/portico-architecture'
import { sceneRotation } from '@/components/three/portico-systems'
import { buildYard, manifestFor, stow } from '@/components/three/portico-yard'
import { systems } from '@/content/systems'

const rotation = sceneRotation(systems)
const assemblies = rotation.map(buildAssembly)
const depth = Math.max(...assemblies.map((build) => build.depth))
const manifest = manifestFor(assemblies.map((build) => build.cargo))
const yard = buildYard(manifest.bays, depth)
const home = stow(manifest, yard.homes)
const show: Show = createShow(home, manifest.crews, assemblies.map((build) => build.slots))

/**
 * Percorre a rotação inteira num passo fino chamando `visit` a cada quadro.
 *
 * Reaproveita a pose de propósito: com o pátio inteiro e uma rotação de
 * minutos, guardar todos os quadros numa lista estoura a memória do runner
 * antes de provar qualquer coisa.
 */
function sweep(step: number, visit: (t: number, pose: Pose) => void): void {
  const pose = createPose(show)
  for (let t = 0; t < show.cycle; t += step) visit(t, samplePose(show, t, pose))
}

/** Onde o contêiner `id` mora quando não está sendo montado. */
const homeOf = (id: number) => show.home[id]

describe('PorticoFallback', () => {
  it('é decorativo e não anuncia nada ao leitor de tela', () => {
    const { container } = render(<PorticoFallback systems={systems} />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('desenha a elevação do primeiro sistema da rotação, com o nome dele carimbado', () => {
    const { container } = render(<PorticoFallback systems={systems} />)
    const texts = [...container.querySelectorAll('text')].map((node) => node.textContent)
    expect(texts).toContain((rotation[0]?.name ?? '').toUpperCase())
  })

  it('cada caixa desenhada leva a tecnologia que a cena estampa nela', () => {
    const { container } = render(<PorticoFallback systems={systems} />)
    const texts = [...container.querySelectorAll('text')].map((node) => node.textContent)
    const build = assemblies[0]
    // A elevação mostra a fileira da frente de cada nível — e toda tecnologia
    // que ela mostra tem de ser uma tecnologia real da stack, nunca inventada.
    const stack = new Set((build?.system.stack ?? []).map((name) => name.toUpperCase()))
    const named = texts.filter((text) => text && stack.has(text))
    expect(named.length, `textos: ${texts.join(' | ')}`).toBeGreaterThanOrEqual(build?.levels.length ?? 0)
    expect(new Set(named).size).toBe(named.length)
  })

  it('a elevação é a mesma montagem da cena: nível de cima nunca mais largo que o de baixo', () => {
    const { container } = render(<PorticoFallback systems={systems} />)
    const boxes = [...container.querySelectorAll('rect')]
      .filter((node) => node.getAttribute('stroke-width') === '1.2')
      .map((node) => ({ y: Number(node.getAttribute('y')), x: Number(node.getAttribute('x')) }))

    const byLevel = new Map<number, number[]>()
    for (const box of boxes) byLevel.set(box.y, [...(byLevel.get(box.y) ?? []), box.x])
    const levels = [...byLevel.entries()].sort((a, b) => b[0] - a[0])
    expect(levels).toHaveLength(assemblies[0]?.levels.length ?? 0)
    for (let i = 1; i < levels.length; i++) {
      const above = levels[i]?.[1] ?? []
      const below = levels[i - 1]?.[1] ?? []
      expect(above.length, `nível ${i}`).toBeLessThanOrEqual(below.length)
    }
  })

  it('as cotas saem das constantes do modelo, não de número escrito à mão', () => {
    const { container } = render(<PorticoFallback systems={systems} />)
    const texts = [...container.querySelectorAll('text')].map((node) => node.textContent)
    expect(texts).toContain(String(Math.round((assemblies[0]?.width ?? 0) * 1000)))
    expect(texts).toContain(String(Math.round((assemblies[0]?.height ?? 0) * 1000)))
  })

  it('não quebra sem sistema nenhum no conteúdo', () => {
    const { container } = render(<PorticoFallback systems={[]} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})

describe('stencilLines', () => {
  it('quebra em duas linhas sem deixar nenhuma passar de 14 caracteres', () => {
    for (const system of rotation) {
      const lines = stencilLines(system.name)
      expect(lines.length, system.name).toBeLessThanOrEqual(2)
      for (const line of lines) expect(line.length, `${system.name} -> ${line}`).toBeLessThanOrEqual(14)
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

describe('a rotação sem fim', () => {
  it('é determinística: o mesmo instante devolve sempre a mesma pose', () => {
    const first = show.plans[0]
    for (const t of [0, 37, (first?.loadTime ?? 0) - 0.01, (first?.loadTime ?? 0) + 2, show.cycle - 0.5]) {
      const a = samplePose(show, t, createPose(show))
      const b = samplePose(show, t, createPose(show))
      expect([...a.x], `t=${t}`).toEqual([...b.x])
      expect([...a.y], `t=${t}`).toEqual([...b.y])
      expect([...a.z], `t=${t}`).toEqual([...b.z])
      expect(a.trolleyX).toBe(b.trolleyX)
      expect(a.bridgeZ).toBe(b.bridgeZ)
      expect(a.spreaderY).toBe(b.spreaderY)
    }
  })

  it('monta um sistema por vez, e todos eles — nenhum fica de fora do ciclo', () => {
    expect(show.plans).toHaveLength(rotation.length)
    const seen = new Set<number>()
    const pose = createPose(show)
    for (let t = 0; t < show.cycle; t += 1) seen.add(samplePose(show, t, pose).system)
    expect(seen.size).toBe(rotation.length)
  })

  it('nunca para: em nenhum instante a rotação fica sem sistema em cena', () => {
    const total = show.plans.reduce((sum, plan) => sum + plan.cycle, 0)
    expect(show.cycle).toBeCloseTo(total, 6)
    // E a parada mais longa é a que mostra o sistema completo — nada de vazio
    // no meio.
    for (const plan of show.plans) expect(plan.cycle).toBeGreaterThan(HOLD)
  })

  it('a cena começa com a frente VAZIA: no instante zero nada está montado', () => {
    const pose = samplePose(show, 0, createPose(show))
    for (let id = 0; id < show.total; id++) {
      const home = homeOf(id)
      expect(valueAt(pose.x, id), `contêiner ${id}`).toBeCloseTo(home?.x ?? 0, 6)
      expect(valueAt(pose.z, id), `contêiner ${id}`).toBeCloseTo(home?.z ?? 0, 6)
      // Nenhum contêiner na frente: todos estão atrás do corredor.
      expect(valueAt(pose.z, id), `contêiner ${id}`).toBeLessThan(-depth)
    }
  })

  it('na parada, o sistema da vez está montado inteiro e o resto continua na baia', () => {
    show.plans.forEach((plan, index) => {
      const t = (show.starts[index] ?? 0) + plan.loadTime + HOLD / 2
      const pose = samplePose(show, t, createPose(show))
      expect(pose.carried).toBe(-1)
      expect(pose.system).toBe(index)
      for (let id = 0; id < plan.count; id++) {
        const slot = plan.target[id]
        const box = plan.ids[id] ?? 0
        expect(valueAt(pose.x, box), `${index}:${id}`).toBeCloseTo(slot?.x ?? 0, 6)
        expect(valueAt(pose.y, box), `${index}:${id}`).toBeCloseTo(slot?.y ?? 0, 6)
        expect(valueAt(pose.z, box), `${index}:${id}`).toBeCloseTo(slot?.z ?? 0, 6)
      }
      for (let id = 0; id < show.total; id++) {
        if (plan.members.has(id)) continue
        const home = homeOf(id)
        expect(valueAt(pose.y, id), `parado ${id}`).toBeCloseTo(home?.y ?? 0, 6)
      }
    })
  })

  it('no fim da rotação o pátio volta a ser o do começo — o laço fecha sem corte', () => {
    const start = samplePose(show, 0, createPose(show))
    const end = samplePose(show, show.cycle - 1e-6, createPose(show))
    for (let id = 0; id < show.total; id++) {
      expect(valueAt(end.x, id), `contêiner ${id}`).toBeCloseTo(valueAt(start.x, id), 6)
      expect(valueAt(end.y, id), `contêiner ${id}`).toBeCloseTo(valueAt(start.y, id), 6)
      expect(valueAt(end.z, id), `contêiner ${id}`).toBeCloseTo(valueAt(start.z, id), 6)
    }
    expect(end.trolleyX).toBeCloseTo(start.trolleyX, 6)
    expect(end.bridgeZ).toBeCloseTo(start.bridgeZ, 6)
    expect(end.spreaderY).toBeCloseTo(start.spreaderY, 6)
  })

  it('cada contêiner tem casa fixa: é isso que faz a troca de sistema não ter corte', () => {
    // A alternativa (uma baia só, recarregada a cada sistema) obrigaria os
    // contêineres a trocar de estampa entre uma volta e outra. Aqui, no fim de
    // cada volta, TODO contêiner está exatamente de onde saiu.
    show.plans.forEach((plan, index) => {
      const t = (show.starts[index] ?? 0) + plan.cycle - 0.05
      const pose = samplePose(show, t, createPose(show))
      for (let id = 0; id < show.total; id++) {
        const home = homeOf(id)
        expect(valueAt(pose.x, id), `volta ${index}, contêiner ${id}`).toBeCloseTo(home?.x ?? 0, 6)
        expect(valueAt(pose.y, id), `volta ${index}, contêiner ${id}`).toBeCloseTo(home?.y ?? 0, 6)
        expect(valueAt(pose.z, id), `volta ${index}, contêiner ${id}`).toBeCloseTo(home?.z ?? 0, 6)
      }
    })
  })

  it('nada teleporta: nenhuma peça anda mais que 0,4 m entre dois quadros', () => {
    const previous = { x: new Float64Array(show.total), y: new Float64Array(show.total), z: new Float64Array(show.total) }
    let machine = { x: 0, y: 0, z: 0 }
    let first = true
    const jumps: string[] = []

    sweep(1 / 60, (t, pose) => {
      if (!first) {
        const at = `t=${t.toFixed(2)}`
        if (Math.abs(pose.trolleyX - machine.x) >= 0.4) jumps.push(`carro em ${at}`)
        if (Math.abs(pose.bridgeZ - machine.z) >= 0.4) jumps.push(`ponte em ${at}`)
        if (Math.abs(pose.spreaderY - machine.y) >= 0.4) jumps.push(`cabo em ${at}`)
        for (let id = 0; id < show.total; id++) {
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
  }, 60_000)

  it('dois contêineres nunca ocupam o mesmo lugar', () => {
    const clashes: string[] = []
    sweep(1 / 10, (t, pose) => {
      for (let a = 0; a < show.total; a++) {
        for (let b = a + 1; b < show.total; b++) {
          const apart =
            Math.abs(valueAt(pose.x, a) - valueAt(pose.x, b)) > CONTAINER.length * 0.9 ||
            Math.abs(valueAt(pose.y, a) - valueAt(pose.y, b)) > CONTAINER.height * 0.9 ||
            Math.abs(valueAt(pose.z, a) - valueAt(pose.z, b)) > CONTAINER.width * 0.9
          if (!apart) clashes.push(`contêineres ${a} e ${b} em t=${t.toFixed(2)}`)
        }
      }
    })
    expect(clashes.slice(0, 5)).toEqual([])
  }, 120_000)

  it('o contêiner içado nunca raspa em nada — nem na montagem, nem nas baias dos outros', () => {
    // Este é o invariante que a rotação obrigou a generalizar. Antes bastava
    // medir a folga nas duas pontas do percurso, porque o pátio parado ficava
    // fora do caminho. Agora TODOS os sistemas moram no chão ao mesmo tempo e a
    // máquina cruza as baias dos outros em quase todo movimento — a altura do
    // translado passou a sair do perfil do terreno inteiro (ver `ridgeFor`), e
    // é este teste que prova que o perfil está certo.
    const scrapes: string[] = []
    sweep(1 / 30, (t, pose) => {
      if (pose.carried < 0) return
      const bottom = valueAt(pose.y, pose.carried) - CONTAINER.height / 2
      const cx = valueAt(pose.x, pose.carried)
      const cz = valueAt(pose.z, pose.carried)
      for (let id = 0; id < show.total; id++) {
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
  }, 60_000)

  it('a máquina nunca escava: o contêiner que ela pega nunca tem outro em cima', () => {
    for (const plan of show.plans) {
      const check = (moves: typeof plan.load, before: (k: number) => readonly { x: number; y: number; z: number }[]) => {
        moves.forEach((move, k) => {
          for (const slot of before(k)) {
            const above =
              Math.abs(slot.x - move.pick.x) < CONTAINER.length &&
              Math.abs(slot.z - move.pick.z) < CONTAINER.width &&
              slot.y > move.pick.y + 0.01
            expect(above, `movimento ${k} em ${move.pick.x},${move.pick.y},${move.pick.z}`).toBe(false)
          }
        })
      }
      // Montando, o que ainda está na baia são os lugares que sobraram;
      // desmontando, o que ainda está na montagem.
      check(plan.load, (k) => plan.source.slice(0, plan.count - k - 1))
      check(plan.unload, (k) => plan.target.slice(0, plan.count - k - 1))
    }
  })

  it('a altura de trabalho de cada movimento passa por cima do que ela CRUZA', () => {
    // O invariante mudou de escopo junto com o pátio, e é aqui que se vê por
    // quê. Antes bastava exigir que a carga passasse acima do teto da baia
    // inteira, porque ela nunca cruzava outra coisa. Agora sete baias dividem
    // o chão, e exigir o teto do pátio todo em todo movimento seria a máquina
    // voando alto à toa — justamente o defeito que este teste nasceu para
    // pegar, invertido.
    //
    // A exigência certa é local e é esta: nas duas pontas, a carga passa a
    // folga acima da pilha em que ela encosta. O que acontece NO MEIO do
    // percurso é medido por `o contêiner içado nunca raspa em nada`, que
    // varre a rotação inteira quadro a quadro e é mais forte do que qualquer
    // asserção sobre a altura declarada.
    const overlapping = (slots: readonly { x: number; y: number; z: number }[], at: { x: number; z: number }) =>
      slots
        .filter(
          (slot) =>
            Math.abs(slot.x - at.x) < CONTAINER.length && Math.abs(slot.z - at.z) < CONTAINER.width,
        )
        .reduce((high, slot) => Math.max(high, slot.y + CONTAINER.height / 2), -Infinity)

    for (const plan of show.plans) {
      plan.load.forEach((move, k) => {
        const under = overlapping(plan.source.slice(0, plan.count - 1 - k), move.pick)
        const support = overlapping(plan.target.slice(0, k), move.place)
        if (Number.isFinite(under)) {
          expect(move.liftY - CONTAINER.height, `pegada ${k}`).toBeGreaterThan(under)
        }
        if (Number.isFinite(support)) {
          expect(move.dropY - CONTAINER.height, `largada ${k}`).toBeGreaterThan(support)
        }
      })
    }
  })

  it('a altura de trabalho ACOMPANHA a ocupação — não é um corredor fixo', () => {
    // É o que sobrou, e o que importa, da regra "medir contra o que está lá".
    // A tentação, com sete baias no chão, seria levantar a máquina a uma
    // altura de corredor e deixá-la lá: passaria em todos os testes de
    // colisão e mataria a leitura de esforço da cena. O perfil de altura
    // (`ridgeFor`) mede o terreno movimento a movimento, então a baia
    // esvaziando faz a pegada baixar um andar por vez.
    //
    // A asserção é sobre a FAIXA, não sobre a monotonia: a baia mais funda da
    // rotação obriga a máquina a subir mais para atravessar as outras, e essa
    // altura de travessia entra na conta da largada. Monotonia seria uma
    // promessa que a geometria não faz; variação, sim.
    // Medido na rotação inteira, e não sistema a sistema, por uma razão que é
    // geometria e não conveniência: um sistema de quatro contêineres numa baia
    // rasa cruza baias mais altas do que a carga dele em TODO movimento, então
    // ele voa na altura de travessia o tempo todo — e isso também é medir
    // contra o que está lá. Quem varia é a rotação.
    const lifts = show.plans.flatMap((plan) => plan.load.map((move) => move.liftY))
    const spread = Math.max(...lifts) - Math.min(...lifts)
    expect(spread, 'a máquina voa sempre na mesma altura').toBeGreaterThan(CONTAINER.height * 2)

    // E a pegada mais baixa fica bem abaixo da altura de travessia — a que
    // seria preciso para sobrevoar uma pilha cheia. É a prova de que a máquina
    // passa rasteiro quando o caminho permite, em vez de subir ao teto por
    // precaução.
    const crossing = Math.max(...show.home.map((slot) => slot.y + CONTAINER.height / 2)) + CONTAINER.height
    expect(Math.min(...lifts)).toBeLessThan(crossing)
  })

  it('a máquina não voa mais alto do que o PÁTIO exige', () => {
    // O teto mudou de dono: antes era a altura da pirâmide, agora é a pilha
    // mais alta que a carga cruza — porque é ela que a máquina tem de
    // sobrevoar. Continua sendo um teto medido, não um número escolhido.
    const tallest = Math.max(...show.home.map((slot) => slot.y + CONTAINER.height / 2))
    expect(show.peakY).toBeGreaterThan(tallest)
    expect(show.peakY).toBeLessThan(tallest + CONTAINER.height * 2)
  })

  it('a duração de cada içamento acompanha a distância — nada é disparado de canhão', () => {
    let peak = 0
    const step = 1 / 120
    const pose = createPose(show)
    let previous = samplePose(show, 0, pose).spreaderY
    for (let t = step; t < show.cycle; t += step) {
      const now = samplePose(show, t, pose).spreaderY
      peak = Math.max(peak, Math.abs(now - previous) / step)
      previous = now
    }
    // Uma ponte rolante não sobe carga a mais de ~10 m/s nem no pico da curva;
    // passar disso é o sintoma de fase de duração fixa.
    expect(peak).toBeLessThan(10)
  }, 120_000)

  it('o translado horizontal também respeita o limite do acionamento', () => {
    let peak = 0
    const step = 1 / 120
    const pose = createPose(show)
    let before = samplePose(show, 0, pose)
    let previous = { x: before.trolleyX, z: before.bridgeZ }
    for (let t = step; t < show.cycle; t += step) {
      before = samplePose(show, t, pose)
      peak = Math.max(peak, Math.hypot(before.trolleyX - previous.x, before.bridgeZ - previous.z) / step)
      previous = { x: before.trolleyX, z: before.bridgeZ }
    }
    expect(peak).toBeLessThan(30)
  }, 120_000)

  it('a montagem é de baixo para cima: nenhum nível começa antes do de baixo fechar', () => {
    for (const plan of show.plans) {
      let previousY = -Infinity
      for (const move of plan.load) {
        expect(move.place.y, 'ordem de montagem').toBeGreaterThanOrEqual(previousY - 1e-9)
        previousY = move.place.y
      }
    }
  })

  it('as constantes de pilha continuam coerentes', () => {
    expect(slotCenterY(0)).toBeCloseTo(CONTAINER.height / 2, 6)
    expect(stackTop(3)).toBeCloseTo(3 * CONTAINER.height, 6)
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
