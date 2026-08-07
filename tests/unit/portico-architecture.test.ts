import { describe, expect, it } from 'vitest'
import { PITCH, buildAssembly, byFoundation, choosePile } from '@/components/three/portico-architecture'
import { ROLE_COUNT, roleOf, sceneRotation } from '@/components/three/portico-systems'
import { CONTAINER, slotCenterY } from '@/components/three/portico-model'
import { systems } from '@/content/systems'

const rotation = sceneRotation(systems)
const assemblies = rotation.map(buildAssembly)

describe('a rotação de sistemas', () => {
  it('monta os três da vitrine DERIVADOS de content/systems.ts, nunca copiados', () => {
    for (const system of systems) {
      const built = assemblies.find((build) => build.system.name === system.name)
      expect(built, system.name).toBeDefined()
      // A stack da cena é exatamente a do conteúdo, na mesma quantidade: se
      // alguém acrescentar uma tecnologia lá, a cena monta um contêiner a mais
      // aqui sem ninguém tocar na cena.
      expect(new Set(built?.cargo.map((freight) => freight.name)), system.name).toEqual(new Set(system.stack))
      expect(built?.cargo).toHaveLength(system.stack.length)
    }
  })

  it('acrescenta os sistemas menores, e é deles que vem o contraste de porte', () => {
    const sizes = assemblies.map((build) => build.cargo.length)
    expect(assemblies.length).toBeGreaterThan(systems.length)
    expect(Math.min(...sizes)).toBeLessThanOrEqual(4)
    expect(Math.max(...sizes)).toBeGreaterThanOrEqual(9)
  })

  it('alterna porte: complexo, simples, complexo, simples', () => {
    const sizes = assemblies.map((build) => build.cargo.length)
    const median = [...sizes].sort((a, b) => a - b)[Math.floor(sizes.length / 2)] ?? 0
    // Nenhum par vizinho pode estar do mesmo lado da mediana duas vezes
    // seguidas na primeira metade da rotação — é o que faz o ritmo mudar para
    // quem fica olhando, em vez de a cena descer uma rampa de tamanhos.
    let sameSide = 0
    for (let i = 1; i < sizes.length; i++) {
      const before = (sizes[i - 1] ?? 0) >= median
      const now = (sizes[i] ?? 0) >= median
      if (before === now) sameSide += 1
    }
    expect(sameSide, `tamanhos: ${sizes.join(', ')}`).toBeLessThanOrEqual(1)
  })

  it('a ordem é determinística: a mesma entrada devolve sempre a mesma rotação', () => {
    expect(sceneRotation(systems).map((s) => s.name)).toEqual(rotation.map((s) => s.name))
  })

  it('não quebra sem sistema nenhum', () => {
    expect(sceneRotation([])).toHaveLength(4)
  })
})

describe('a disposição', () => {
  it('infraestrutura embaixo, aplicação em cima — a lógica visível da montagem', () => {
    for (const build of assemblies) {
      let floor = -Infinity
      for (const level of build.levels) {
        const roles = level.items.map((item) => item.role)
        if (roles.length === 0) continue
        // Nenhum nível pode ter uma peça mais fundamental do que a peça mais
        // superficial do nível de baixo: o banco não roda sobre o React.
        expect(Math.min(...roles), `${build.system.name} em y=${level.y}`).toBeGreaterThanOrEqual(floor)
        floor = Math.max(...roles)
      }
    }
  })

  it('nunca termina num contêiner solto no topo — a agulha que o dono viu', () => {
    for (const build of assemblies) {
      const top = build.levels[build.levels.length - 1]
      expect(top?.items.length ?? 0, build.system.name).toBeGreaterThan(1)
    }
  })

  it('nunca é um nível só: montagem tem altura', () => {
    for (const build of assemblies) {
      expect(build.levels.length, build.system.name).toBeGreaterThanOrEqual(2)
    }
  })

  it('nenhum nível é mais largo nem mais fundo que o de baixo', () => {
    for (const build of assemblies) {
      for (let i = 1; i < build.levels.length; i++) {
        const above = build.levels[i]
        const below = build.levels[i - 1]
        if (!above || !below) continue
        expect(above.cols, `${build.system.name} nível ${i}`).toBeLessThanOrEqual(below.cols)
        expect(above.rows, `${build.system.name} nível ${i}`).toBeLessThanOrEqual(below.rows)
      }
    }
  })

  it('a silhueta CRESCE com o tamanho da stack — é assim que o porte lê', () => {
    // O defeito que este teste existe para pegar: com a forma escolhida só por
    // proporção, um sistema de oito tecnologias saía num bloco mais estreito
    // que um de cinco. A maior lia como menor, e o contraste que o dono pediu
    // virava ruído.
    //
    // A medida é o VOLUME da caixa envolvente, não a largura: a pilha ganha
    // massa em três eixos e um sistema de seis pode ser mais estreito que um
    // de cinco desde que seja duas fileiras mais fundo. O que não pode é
    // encolher.
    const bulk = (n: number): number => {
      const levels = choosePile(n)
      const base = levels[0] ?? { cols: 1, rows: 1, count: 0 }
      const width = (base.cols - 1) * PITCH.x + CONTAINER.length
      const depth = (base.rows - 1) * PITCH.z + CONTAINER.width
      return width * depth * levels.length * CONTAINER.height
    }
    for (let n = 4; n < 10; n++) expect(bulk(n + 1), `${n} → ${n + 1}`).toBeGreaterThanOrEqual(bulk(n))
    expect(bulk(10)).toBeGreaterThan(bulk(4) * 2.5)
  })

  it('a forma sai do NÚMERO de contêineres, não de tabela fixa', () => {
    for (let n = 2; n <= 14; n++) {
      const levels = choosePile(n)
      expect(levels.reduce((sum, level) => sum + level.count, 0), `n=${n}`).toBe(n)
      for (const level of levels) expect(level.count).toBeLessThanOrEqual(level.cols * level.rows)
    }
    expect(choosePile(0)).toEqual([])
  })

  it('nenhum contêiner flutua: todo lugar acima da base tem apoio embaixo', () => {
    for (const build of assemblies) {
      const taken = new Set(
        build.slots.map((slot) => `${slot.x.toFixed(3)}:${slot.z.toFixed(3)}:${slot.y.toFixed(3)}`),
      )
      for (const slot of build.slots) {
        if (slot.y <= slotCenterY(0)) continue
        const below = `${slot.x.toFixed(3)}:${slot.z.toFixed(3)}:${(slot.y - CONTAINER.height).toFixed(3)}`
        expect(taken.has(below), `${build.system.name} em ${slot.x},${slot.z},${slot.y}`).toBe(true)
      }
    }
  })

  it('dois lugares nunca coincidem, e nenhum par se atravessa', () => {
    for (const build of assemblies) {
      for (let a = 0; a < build.slots.length; a++) {
        for (let b = a + 1; b < build.slots.length; b++) {
          const one = build.slots[a]
          const other = build.slots[b]
          if (!one || !other) continue
          const apart =
            Math.abs(one.x - other.x) > CONTAINER.length * 0.9 ||
            Math.abs(one.y - other.y) > CONTAINER.height * 0.9 ||
            Math.abs(one.z - other.z) > CONTAINER.width * 0.9
          expect(apart, `${build.system.name}: lugares ${a} e ${b}`).toBe(true)
        }
      }
    }
  })

  it('a folga entre contêineres cabe o spreader e não some', () => {
    expect(PITCH.x).toBeGreaterThan(CONTAINER.length)
    expect(PITCH.z).toBeGreaterThan(CONTAINER.width)
    expect(PITCH.x - CONTAINER.length).toBeLessThan(1)
  })

  it('a montagem é de baixo para cima e, dentro do nível, do fundo para a frente', () => {
    for (const build of assemblies) {
      let previous = build.slots[0]
      for (const slot of build.slots.slice(1)) {
        if (!previous) break
        const rising = slot.y > previous.y + 1e-9
        const sameLevel = Math.abs(slot.y - previous.y) < 1e-9
        expect(rising || sameLevel, `${build.system.name}: y=${slot.y} depois de ${previous.y}`).toBe(true)
        if (sameLevel) expect(slot.z, 'ordem em profundidade').toBeGreaterThanOrEqual(previous.z - 1e-9)
        previous = slot
      }
    }
  })

  it('um contêiner por tecnologia, sem repetir e sem inventar', () => {
    for (const build of assemblies) {
      expect(build.cargo).toHaveLength(build.slots.length)
      const names = build.cargo.map((freight) => freight.name)
      expect(new Set(names).size, build.system.name).toBe(names.length)
      for (const name of names) expect(build.system.stack, name).toContain(name)
    }
  })

  it('todo contêiner leva o nome do sistema — o contexto da montagem', () => {
    for (const build of assemblies) {
      for (const freight of build.cargo) expect(freight.system).toBe(build.system.name)
    }
  })

  it('a camada de sustentação de toda tecnologia está dentro da tabela', () => {
    for (const build of assemblies) {
      for (const freight of build.cargo) {
        expect(freight.role, freight.name).toBeGreaterThanOrEqual(0)
        expect(freight.role, freight.name).toBeLessThan(ROLE_COUNT)
      }
    }
  })

  it('a camada casa pelo primeiro segmento — "Fastify 5" cai junto com "Fastify"', () => {
    expect(roleOf('Fastify 5')).toBe(roleOf('Fastify'))
    expect(roleOf('Docker')).toBeLessThan(roleOf('React'))
    expect(roleOf('PostgreSQL')).toBeLessThan(roleOf('Next.js'))
    // Tecnologia desconhecida não derruba a montagem: cai na camada de serviço.
    expect(roleOf('Tecnologia Que Não Existe')).toBe(roleOf('TypeScript'))
  })

  it('a ordem por camada é estável — a mesma stack dá sempre a mesma montagem', () => {
    const once = byFoundation(['React', 'Docker', 'TypeScript'], 'X').map((f) => f.name)
    expect(once).toEqual(byFoundation(['React', 'Docker', 'TypeScript'], 'X').map((f) => f.name))
    expect(once).toEqual(['Docker', 'TypeScript', 'React'])
  })

  it('a fileira que a câmera lê é a que sustenta o sistema', () => {
    for (const build of assemblies) {
      for (const level of build.levels) {
        if (level.rows < 2) continue
        const inLevel = build.slots
          .map((slot, i) => ({ slot, freight: build.cargo[i] }))
          .filter(({ slot }) => Math.abs(slot.y - level.y) < 1e-9)
        const front = Math.max(...inLevel.map(({ slot }) => slot.z))
        const back = Math.min(...inLevel.map(({ slot }) => slot.z))
        const rankAt = (z: number): number =>
          Math.min(...inLevel.filter(({ slot }) => slot.z === z).map(({ freight }) => freight?.role ?? ROLE_COUNT))
        expect(rankAt(front), build.system.name).toBeLessThanOrEqual(rankAt(back))
      }
    }
  })

  it('não quebra com stack vazia', () => {
    const empty = buildAssembly({ name: 'X', stack: [] })
    expect(empty.levels).toHaveLength(0)
    expect(empty.slots).toHaveLength(0)
  })
})
