import { describe, expect, it } from 'vitest'
import {
  YARD_CAPACITY,
  YARD_FOOTPRINTS,
  YARD_SLOTS,
  iconSlug,
  markFor,
  yardCargo,
  yardShade,
} from '@/components/three/portico-yard'
import { BAY, CONTAINER, slotCenterY } from '@/components/three/portico-model'
import { pt } from '@/content/pt'
import { en } from '@/content/en'
import type { StackItem } from '@/content/types'

const items = (dict: typeof pt): StackItem[] => dict.stack.layers.flatMap((layer) => layer.items)

describe('resolução de ícone', () => {
  it('segue a regra de slug do simple-icons, incluindo as substituições de caractere', () => {
    expect(iconSlug('Next.js')).toBe('nextdotjs')
    expect(iconSlug('three.js')).toBe('threedotjs')
    expect(iconSlug('GitHub Actions')).toBe('githubactions')
    expect(iconSlug('C++')).toBe('cplusplus')
    expect(iconSlug('Qualidade & Entrega')).toBe('qualidadeandentrega')
    expect(iconSlug('Ícone com acento')).toBe('iconecomacento')
  })

  it('tecnologia com marca no pacote vira ícone', () => {
    for (const name of ['Cisco', 'Docker', 'TypeScript', 'React', 'PostgreSQL', 'MikroTik']) {
      expect(markFor(name), name).toMatchObject({ kind: 'icon', name })
    }
  })

  it('tecnologia sem marca cai no texto SOZINHA, sem lista de exceções', () => {
    // Nenhuma destas está em `ICONS`. Não há nada no código dizendo isso: a
    // busca pelo slug simplesmente não encontra, e o estêncil assume.
    for (const name of ['Switching', 'VPS', 'DNS', 'SQL puro', 'Supabase/RLS', 'Heartbeat/uptime']) {
      expect(markFor(name), name).toMatchObject({ kind: 'text', name })
    }
    // O caso que prova a automação: um nome que nunca existiu no dicionário.
    const invented = markFor('Tecnologia Que Não Existe')
    expect(invented.kind).toBe('text')
  })

  it('o estêncil da marca de texto usa o nome do dicionário, na tipografia dos rótulos', () => {
    const mark = markFor('Deploy blue-green')
    expect(mark).toEqual({ name: 'Deploy blue-green', kind: 'text', lines: ['DEPLOY', 'BLUE-GREEN'] })
  })

  it('todo nome de tecnologia do dicionário resolve para alguma marca, nos dois idiomas', () => {
    for (const dict of [pt, en]) {
      for (const item of items(dict)) {
        const mark = markFor(item.name)
        expect(mark.name, item.name).toBe(item.name)
        if (mark.kind === 'text') expect(mark.lines.join(' ').length, item.name).toBeGreaterThan(0)
        else expect(mark.path.length, item.name).toBeGreaterThan(0)
      }
    }
  })
})

describe('carga do pátio', () => {
  it('prioriza o que o dono declara dominar', () => {
    const cargo = yardCargo(items(pt))
    const dominados = new Set(
      items(pt)
        .filter((item) => item.level === 'dominio')
        .map((item) => item.name),
    )
    for (const mark of cargo) expect(dominados.has(mark.name), mark.name).toBe(true)
  })

  it('a ordem é estável: a mesma chamada devolve sempre a mesma carga', () => {
    expect(yardCargo(items(pt)).map((mark) => mark.name)).toEqual(yardCargo(items(pt)).map((mark) => mark.name))
  })

  it('mistura ícone e texto — não é vitrine de logos nem só estêncil', () => {
    for (const dict of [pt, en]) {
      const cargo = yardCargo(items(dict))
      const icons = cargo.filter((mark) => mark.kind === 'icon').length
      expect(icons, 'ícones').toBeGreaterThanOrEqual(4)
      expect(cargo.length - icons, 'estênceis').toBeGreaterThanOrEqual(4)
    }
  })

  it('nunca passa da capacidade das baias, e com poucos itens não inventa carga', () => {
    expect(yardCargo(items(pt)).length).toBe(YARD_CAPACITY)
    const poucos: StackItem[] = [
      { name: 'Docker', level: 'dominio' },
      { name: 'VPS', level: 'contato' },
    ]
    expect(yardCargo(poucos).map((mark) => mark.name)).toEqual(['Docker', 'VPS'])
    expect(yardCargo(items(pt), 3)).toHaveLength(3)
    expect(yardCargo([], 5)).toHaveLength(0)
  })

  it('nível mais alto primeiro, e a ordem do dicionário desempata', () => {
    const mixed: StackItem[] = [
      { name: 'Groq', level: 'contato' },
      { name: 'Redis', level: 'producao' },
      { name: 'Docker', level: 'dominio' },
      { name: 'Nginx', level: 'dominio' },
    ]
    expect(yardCargo(mixed).map((mark) => mark.name)).toEqual(['Docker', 'Nginx', 'Redis', 'Groq'])
  })
})

describe('baias de fundo', () => {
  it('todas ficam atrás do corredor, longe do truque das pernas do pórtico', () => {
    // A perna do pórtico e seu truque terminam em z ≈ −5,1. Nada de fundo
    // pode invadir a pista por onde a máquina transita.
    for (const slot of YARD_SLOTS) expect(slot.z + CONTAINER.width / 2, `z=${slot.z}`).toBeLessThan(-9)
  })

  it('nenhuma pilha de fundo ocupa o lugar das duas baias operacionais', () => {
    for (const spot of YARD_FOOTPRINTS) {
      for (const bay of [BAY.source, BAY.target]) {
        const apart = Math.abs(spot.x - bay) > CONTAINER.length || Math.abs(spot.z) > CONTAINER.width
        expect(apart, `pilha em ${spot.x},${spot.z}`).toBe(true)
      }
    }
  })

  it('duas pilhas nunca se atravessam', () => {
    for (let a = 0; a < YARD_FOOTPRINTS.length; a++) {
      for (let b = a + 1; b < YARD_FOOTPRINTS.length; b++) {
        const one = YARD_FOOTPRINTS[a]
        const other = YARD_FOOTPRINTS[b]
        if (!one || !other) continue
        const apart =
          Math.abs(one.x - other.x) >= CONTAINER.length || Math.abs(one.z - other.z) >= CONTAINER.width
        expect(apart, `pilhas ${a} e ${b}`).toBe(true)
      }
    }
  })

  it('as alturas são irregulares e ficam entre 2 e 5 contêineres', () => {
    const heights = new Map<string, number>()
    for (const slot of YARD_SLOTS) {
      const key = `${slot.x}:${slot.z}`
      heights.set(key, (heights.get(key) ?? 0) + 1)
    }
    const values = [...heights.values()]
    for (const height of values) {
      expect(height).toBeGreaterThanOrEqual(2)
      expect(height).toBeLessThanOrEqual(5)
    }
    // Pátio nivelado parece prateleira: tem de haver mais de uma altura.
    expect(new Set(values).size).toBeGreaterThan(1)
    expect(heights.size).toBe(YARD_FOOTPRINTS.length)
  })

  it('nenhum contêiner flutua: todo lugar acima do piso tem um embaixo', () => {
    const taken = new Set(YARD_SLOTS.map((slot) => `${slot.x}:${slot.z}:${slot.y.toFixed(3)}`))
    for (const slot of YARD_SLOTS) {
      if (slot.y <= slotCenterY(0)) continue
      const below = (slot.y - CONTAINER.height).toFixed(3)
      expect(taken.has(`${slot.x}:${slot.z}:${below}`), `${slot.x},${slot.z} em y=${slot.y}`).toBe(true)
    }
  })

  it('carrega por nível: o piso de todas as pilhas antes de qualquer segundo andar', () => {
    const base = YARD_FOOTPRINTS.length
    for (let i = 0; i < base; i++) expect(YARD_SLOTS[i]?.y, `lugar ${i}`).toBeCloseTo(slotCenterY(0), 6)
    expect(YARD_SLOTS[base]?.y).toBeCloseTo(slotCenterY(1), 6)
  })

  it('a planta tem uma pilha por posição e o total fica na ordem de grandeza pedida', () => {
    // 16 a 24 contêineres ao todo, contando os 6 da fileira operacional.
    expect(YARD_CAPACITY + 6).toBeGreaterThanOrEqual(16)
    expect(YARD_CAPACITY + 6).toBeLessThanOrEqual(24)
  })

  it('a variação de valor da chapa de fundo fica abaixo da fileira da frente', () => {
    for (let i = 0; i < YARD_CAPACITY; i++) {
      expect(yardShade(i)).toBeGreaterThan(0.5)
      // `layerShade(0)` = 0,72 é a chapa mais escura da frente.
      expect(yardShade(i)).toBeLessThan(0.72)
    }
  })
})
