import { describe, expect, it } from 'vitest'
import { PITCH, buildArchitecture, byMastery, isArchitecture } from '@/components/three/portico-architecture'
import { CONTAINER, slotCenterY } from '@/components/three/portico-model'
import { pt } from '@/content/pt'
import { en } from '@/content/en'
import type { StackLayer } from '@/content/types'

const built = (dict: typeof pt) => buildArchitecture(dict.stack.layers)

describe('a pirâmide', () => {
  it('tem um patamar por camada do stack, na ordem do dicionário', () => {
    for (const dict of [pt, en]) {
      const arch = built(dict)
      expect(arch.tiers.map((tier) => tier.label)).toEqual(dict.stack.layers.map((layer) => layer.label))
    }
  })

  it('infra larga na base, qualidade estreita no topo — e nunca alarga subindo', () => {
    for (const dict of [pt, en]) {
      const arch = built(dict)
      for (let i = 1; i < arch.tiers.length; i++) {
        const above = arch.tiers[i]
        const below = arch.tiers[i - 1]
        if (!above || !below) continue
        expect(above.cols, `${above.label} vs ${below.label}`).toBeLessThanOrEqual(below.cols)
        expect(above.rows, `${above.label} vs ${below.label}`).toBeLessThanOrEqual(below.rows)
      }
      const base = arch.tiers[0]
      const top = arch.tiers[arch.tiers.length - 1]
      expect(top?.items.length ?? 0).toBeLessThan(base?.items.length ?? 0)
      expect(top?.width ?? 0).toBeLessThan(base?.width ?? 0)
      expect(top?.depth ?? 0).toBeLessThan(base?.depth ?? 0)
    }
  })

  it('cada patamar recua em ALGUMA dimensão — zigurate, não parede', () => {
    const arch = built(pt)
    let steps = 0
    for (let i = 1; i < arch.tiers.length; i++) {
      const above = arch.tiers[i]
      const below = arch.tiers[i - 1]
      if (!above || !below) continue
      if (above.cols < below.cols || above.rows < below.rows) steps += 1
    }
    // Um degrau por junta, menos a última (o topo já é um contêiner só e não
    // tem para onde encolher).
    expect(steps).toBeGreaterThanOrEqual(arch.tiers.length - 2)
  })

  it('a largura sai do NÚMERO de tecnologias, não de tabela fixa', () => {
    // Uma camada de base com muito mais itens tem de produzir uma base maior.
    const item = { name: 'X', level: 'dominio' } as const
    const layer = (n: number): StackLayer => ({
      label: 'L',
      source: 'repo',
      items: Array.from({ length: n }, () => ({ ...item })),
    })
    const small = buildArchitecture([layer(4), layer(2)])
    const big = buildArchitecture([layer(24), layer(12)])
    expect(big.tiers[0]?.cols ?? 0).toBeGreaterThan(small.tiers[0]?.cols ?? 0)
    expect(big.width).toBeGreaterThan(small.width)
    expect(big.slots.length).toBeGreaterThan(small.slots.length)
  })

  it('nenhum contêiner flutua: todo lugar acima da base tem apoio embaixo', () => {
    for (const dict of [pt, en]) {
      const arch = built(dict)
      const taken = new Set(arch.slots.map((slot) => `${slot.x.toFixed(3)}:${slot.z.toFixed(3)}:${slot.y.toFixed(3)}`))
      for (const slot of arch.slots) {
        if (slot.y <= slotCenterY(0)) continue
        const below = `${slot.x.toFixed(3)}:${slot.z.toFixed(3)}:${(slot.y - CONTAINER.height).toFixed(3)}`
        expect(taken.has(below), `${slot.x},${slot.z} em y=${slot.y}`).toBe(true)
      }
    }
  })

  it('dois lugares nunca coincidem, e nenhum par se atravessa', () => {
    const arch = built(pt)
    for (let a = 0; a < arch.slots.length; a++) {
      for (let b = a + 1; b < arch.slots.length; b++) {
        const one = arch.slots[a]
        const other = arch.slots[b]
        if (!one || !other) continue
        const apart =
          Math.abs(one.x - other.x) > CONTAINER.length * 0.9 ||
          Math.abs(one.y - other.y) > CONTAINER.height * 0.9 ||
          Math.abs(one.z - other.z) > CONTAINER.width * 0.9
        expect(apart, `lugares ${a} e ${b}`).toBe(true)
      }
    }
  })

  it('a folga entre contêineres cabe o spreader e não some', () => {
    expect(PITCH.x).toBeGreaterThan(CONTAINER.length)
    expect(PITCH.z).toBeGreaterThan(CONTAINER.width)
    expect(PITCH.x - CONTAINER.length).toBeLessThan(1)
  })

  it('a montagem é de baixo para cima e, dentro do patamar, do fundo para a frente', () => {
    const arch = built(pt)
    let previous = arch.slots[0]
    for (const slot of arch.slots.slice(1)) {
      if (!previous) break
      const rising = slot.y > previous.y + 1e-9
      const sameTier = Math.abs(slot.y - previous.y) < 1e-9
      expect(rising || sameTier, `y=${slot.y} depois de ${previous.y}`).toBe(true)
      if (sameTier) expect(slot.z, 'ordem em profundidade').toBeGreaterThanOrEqual(previous.z - 1e-9)
      previous = slot
    }
  })

  it('um contêiner por tecnologia, sem repetir e sem inventar', () => {
    for (const dict of [pt, en]) {
      const arch = built(dict)
      expect(arch.cargo).toHaveLength(arch.slots.length)
      const names = arch.cargo.map((freight) => freight.item.name)
      expect(new Set(names).size).toBe(names.length)
      const dictionary = new Set(dict.stack.layers.flatMap((layer) => layer.items.map((i) => i.name)))
      for (const name of names) expect(dictionary.has(name), name).toBe(true)
    }
  })

  it('nada se perde: o que não cabe na arquitetura vai para as pilhas paradas', () => {
    for (const dict of [pt, en]) {
      const arch = built(dict)
      // Só o que a cena monta. O hardware de rede é excluído de propósito por
      // `isArchitecture` — contar o dicionário inteiro faria o teste acusar a
      // exclusão como perda.
      const total = dict.stack.layers.reduce(
        (sum, layer) => sum + layer.items.filter(isArchitecture).length,
        0,
      )
      expect(arch.cargo.length + arch.spare.length).toBe(total)
    }
  })

  it('quando um patamar não cabe inteiro, quem fica de fora é o de menor domínio', () => {
    const arch = built(pt)
    for (const tier of arch.tiers) {
      const source = pt.stack.layers.find((layer) => layer.label === tier.label)
      if (!source) continue
      const elegiveis = source.items.filter(isArchitecture)
      if (elegiveis.length === tier.items.length) continue
      const chosen = new Set(tier.items.map((item) => item.name))
      const dropped = elegiveis.filter((item) => !chosen.has(item.name))
      const worst = Math.max(...tier.items.map((item) => rank(item.level)))
      for (const item of dropped) expect(rank(item.level), item.name).toBeGreaterThanOrEqual(worst)
    }
  })

  it('a ordem por domínio é estável — o mesmo dicionário dá sempre a mesma carga', () => {
    const once = byMastery(pt.stack.layers[0]?.items ?? []).map((item) => item.name)
    const twice = byMastery(pt.stack.layers[0]?.items ?? []).map((item) => item.name)
    expect(once).toEqual(twice)
    expect(byMastery([{ name: 'a', level: 'contato' }, { name: 'b', level: 'dominio' }]).map((i) => i.name)).toEqual([
      'b',
      'a',
    ])
  })

  it('as tecnologias mais dominadas caem na fileira que a câmera lê', () => {
    const arch = built(pt)
    for (const tier of arch.tiers) {
      if (tier.rows < 2) continue
      const inTier = arch.slots
        .map((slot, i) => ({ slot, freight: arch.cargo[i] }))
        .filter(({ slot }) => Math.abs(slot.y - tier.y) < 1e-9)
      const front = Math.max(...inTier.map(({ slot }) => slot.z))
      const back = Math.min(...inTier.map(({ slot }) => slot.z))
      const rankAt = (z: number) =>
        Math.min(...inTier.filter(({ slot }) => slot.z === z).map(({ freight }) => rank(freight?.item.level)))
      expect(rankAt(front), tier.label).toBeLessThanOrEqual(rankAt(back))
    }
  })

  it('não quebra sem camada nenhuma', () => {
    const empty = buildArchitecture([])
    expect(empty.tiers).toHaveLength(0)
    expect(empty.slots).toHaveLength(0)
  })
})

const rank = (level: string | undefined): number =>
  level === 'dominio' ? 0 : level === 'producao' ? 1 : level === 'contato' ? 2 : 3
