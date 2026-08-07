import { describe, expect, it } from 'vitest'
import * as simpleIcons from 'simple-icons'
import { buildYard, iconSlug, markFor, yardShade } from '@/components/three/portico-yard'
import { buildArchitecture, isArchitecture } from '@/components/three/portico-architecture'
import { CONTAINER, slotCenterY } from '@/components/three/portico-model'
import {
  PANEL_MIN_CONTRAST,
  contrastRatio,
  needsPanel,
  relativeLuminance,
  unitNoise,
} from '@/components/three/portico-textures'
import { pt } from '@/content/pt'
import { en } from '@/content/en'

const items = (dict: typeof pt) => dict.stack.layers.flatMap((layer) => layer.items)
const architecture = buildArchitecture(pt.stack.layers)
const yard = buildYard(architecture.slots.length, architecture.spare.length)

/** A chapa mais escura da cena — é contra ela que o contraste tem de fechar. */
const PLATE = '#101216'

describe('resolução de ícone', () => {
  it('segue a regra de slug do simple-icons, incluindo as substituições de caractere', () => {
    expect(iconSlug('Next.js')).toBe('nextdotjs')
    expect(iconSlug('three.js')).toBe('threedotjs')
    expect(iconSlug('GitHub Actions')).toBe('githubactions')
    expect(iconSlug('C++')).toBe('cplusplus')
    expect(iconSlug('Qualidade & Entrega')).toBe('qualidadeandentrega')
    expect(iconSlug('Ícone com acento')).toBe('iconecomacento')
  })

  it('tecnologia com marca no pacote vira ícone, com a cor oficial junto', () => {
    for (const name of ['JavaScript', 'Docker', 'TypeScript', 'React', 'PostgreSQL', 'Supabase/RLS', 'Next.js']) {
      const mark = markFor(name)
      expect(mark, name).toMatchObject({ kind: 'icon', name })
      if (mark.kind !== 'icon') continue
      expect(mark.hex, name).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })

  it('tecnologia sem marca cai no texto SOZINHA, sem lista de exceções', () => {
    // Nenhuma destas está em `ICONS`. Não há nada no código dizendo isso: a
    // busca pelo slug simplesmente não encontra, e o estêncil assume.
    for (const name of ['VPS', 'DNS', 'SQL puro', 'Heartbeat/uptime', 'Playwright', 'Groq']) {
      expect(markFor(name), name).toMatchObject({ kind: 'text', name })
    }
    // O caso que prova a automação: um nome que nunca existiu no dicionário.
    expect(markFor('Tecnologia Que Não Existe').kind).toBe('text')
  })

  it('nenhuma tecnologia do dicionário cai em texto tendo marca no pacote', () => {
    // O defeito que este teste existe para pegar já aconteceu: cinco marcas
    // (Node, Tailwind, Supabase, Vercel, Zod) existiam no simple-icons e
    // ficaram de fora do array `ICONS`, então renderizavam como texto sem que
    // nada acusasse. Aqui a fonte da verdade é o pacote, não uma lista nossa.
    // A fonte da verdade aqui é o PACOTE inteiro, não o nosso array `ICONS` —
    // se fosse o array, o teste concordaria com o próprio esquecimento.
    const noPacote = new Set(Object.values(simpleIcons).map((icon) => icon.slug))
    // Só o que a cena de fato monta: o hardware de rede (Cisco, MikroTik,
    // Furukawa, Switching) é excluído de propósito por `isArchitecture`, então
    // não ter ícone deles não é esquecimento.
    const doDicionario = pt.stack.layers.flatMap((layer) =>
      layer.items.filter(isArchitecture).map((item) => item.name),
    )
    const semIcone = doDicionario.filter((name) => markFor(name).kind === 'text')
    const perdidas = semIcone.filter((name) => noPacote.has(iconSlug(name)))
    expect(perdidas, `tecnologias com marca disponível caindo em texto: ${perdidas.join(', ')}`).toEqual([])
  })

  it('o estêncil da marca de texto usa o nome do dicionário, na tipografia dos rótulos', () => {
    expect(markFor('Deploy blue-green')).toEqual({
      name: 'Deploy blue-green',
      kind: 'text',
      lines: ['DEPLOY', 'BLUE-GREEN'],
    })
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

  it('mistura ícone e texto — não é vitrine de logos nem só estêncil', () => {
    for (const dict of [pt, en]) {
      const marks = items(dict).map((item) => markFor(item.name))
      const icons = marks.filter((mark) => mark.kind === 'icon').length
      expect(icons, 'ícones').toBeGreaterThanOrEqual(8)
      expect(marks.length - icons, 'estênceis').toBeGreaterThanOrEqual(8)
    }
  })
})

describe('cor de marca', () => {
  it('a luminância relativa segue a fórmula do WCAG 2', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 6)
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 6)
    // Verde puro pesa muito mais que azul puro — é o ponto da fórmula.
    expect(relativeLuminance('#00FF00')).toBeGreaterThan(relativeLuminance('#0000FF'))
  })

  it('a razão de contraste é simétrica e bate com os extremos conhecidos', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 4)
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 4)
    expect(contrastRatio('#161A20', '#161A20')).toBeCloseTo(1, 6)
  })

  it('marca escura ganha painel; marca clara vai direto na chapa', () => {
    // Pretas e azul-escuras: Next.js, Fastify, three.js, Anthropic, Prisma.
    for (const brand of ['#000000', '#191919', '#2D3748', '#293239']) {
      expect(needsPanel(brand, PLATE), brand).toBe(true)
    }
    // Claras o bastante para se separar da chapa sozinhas.
    for (const brand of ['#61DAFB', '#2496ED', '#00FF74', '#F69220', '#4169E1']) {
      expect(needsPanel(brand, PLATE), brand).toBe(false)
    }
  })

  it('a decisão é MEDIDA, não listada: o limiar é o do WCAG para elemento gráfico', () => {
    expect(PANEL_MIN_CONTRAST).toBe(3)
    for (const brand of ['#000000', '#61DAFB', '#2D3748', '#F69220']) {
      expect(needsPanel(brand, PLATE)).toBe(contrastRatio(brand, PLATE) < PANEL_MIN_CONTRAST)
    }
  })

  it('o painel resolve de fato: sobre ele, toda marca do dicionário passa de 4,5:1', () => {
    // `--color-text` a 0,9 — o painel de aplicação da cena.
    const panel = '#DCDAD7'
    for (const dict of [pt, en]) {
      for (const item of items(dict)) {
        const mark = markFor(item.name)
        if (mark.kind !== 'icon' || !needsPanel(mark.hex, PLATE)) continue
        expect(contrastRatio(mark.hex, panel), item.name).toBeGreaterThan(4.5)
      }
    }
  })

  it('nenhuma marca fica ilegível: ou passa na chapa, ou passa no painel', () => {
    for (const item of items(pt)) {
      const mark = markFor(item.name)
      if (mark.kind !== 'icon') continue
      const best = Math.max(contrastRatio(mark.hex, PLATE), needsPanel(mark.hex, PLATE) ? 4.5 : 0)
      expect(best, item.name).toBeGreaterThanOrEqual(PANEL_MIN_CONTRAST)
    }
  })
})

describe('pátio', () => {
  it('tem exatamente um lugar de origem por contêiner da arquitetura', () => {
    expect(yard.source).toHaveLength(architecture.slots.length)
    expect(yard.spare).toHaveLength(architecture.spare.length)
  })

  it('todo o material começa atrás do corredor, longe da arquitetura', () => {
    for (const slot of [...yard.source, ...yard.spare]) {
      expect(slot.z + CONTAINER.width / 2, `z=${slot.z}`).toBeLessThan(-architecture.depth / 2 - 4)
    }
  })

  it('as pilhas paradas ficam ainda mais fundas que o pátio de trabalho', () => {
    const workFar = Math.min(...yard.source.map((slot) => slot.z))
    for (const slot of yard.spare) expect(slot.z, `z=${slot.z}`).toBeLessThan(workFar)
  })

  it('duas pilhas nunca se atravessam', () => {
    const spots = yard.footprints
    for (let a = 0; a < spots.length; a++) {
      for (let b = a + 1; b < spots.length; b++) {
        const one = spots[a]
        const other = spots[b]
        if (!one || !other) continue
        const apart =
          Math.abs(one.x - other.x) >= CONTAINER.length || Math.abs(one.z - other.z) >= CONTAINER.width
        expect(apart, `pilhas ${a} e ${b}`).toBe(true)
      }
    }
  })

  it('nenhum contêiner flutua: todo lugar acima do piso tem um embaixo', () => {
    for (const stacks of [yard.source, yard.spare]) {
      const taken = new Set(stacks.map((slot) => `${slot.x}:${slot.z}:${slot.y.toFixed(3)}`))
      for (const slot of stacks) {
        if (slot.y <= slotCenterY(0)) continue
        const below = (slot.y - CONTAINER.height).toFixed(3)
        expect(taken.has(`${slot.x}:${slot.z}:${below}`), `${slot.x},${slot.z} em y=${slot.y}`).toBe(true)
      }
    }
  })

  it('carrega por nível: o piso de todas as pilhas antes de qualquer segundo andar', () => {
    const base = new Set(yard.source.filter((slot) => slot.y === slotCenterY(0)).map((slot) => `${slot.x}:${slot.z}`))
    for (let i = 0; i < base.size; i++) expect(yard.source[i]?.y, `lugar ${i}`).toBeCloseTo(slotCenterY(0), 6)
    expect(yard.source[base.size]?.y).toBeCloseTo(slotCenterY(1), 6)
  })

  it('a planta do pátio sai do tamanho da arquitetura, não de número escrito à mão', () => {
    const small = buildYard(4, 0)
    expect(small.source).toHaveLength(4)
    // Quatro contêineres cabem em duas pilhas de três; nunca em nove.
    expect(new Set(small.source.map((slot) => `${slot.x}:${slot.z}`)).size).toBe(2)
    expect(buildYard(0, 0).source).toHaveLength(0)
  })

  it('as pilhas paradas crescem com o excedente — nenhuma carga fica sem lugar', () => {
    // O defeito que este teste existe para pegar: as pilhas paradas eram seis
    // posições escritas à mão, dezoito lugares ao todo. No dia em que a
    // pirâmide passou a sobrar vinte e quatro tecnologias, seis contêineres
    // ficaram sem lugar de onde sair e a cena os materializaria no ar. A
    // varredura vai bem além do dicionário de hoje de propósito: a promessa é
    // que o pátio cresce com a arquitetura, não que ele cabe neste dicionário.
    for (let excedente = 0; excedente <= 60; excedente++) {
      const plan = buildYard(12, excedente)
      expect(plan.spare, `excedente ${excedente}`).toHaveLength(excedente)
      // E cada pilha continua apoiada no chão, sem buraco no meio.
      const levels = new Map<string, number[]>()
      for (const slot of plan.spare) {
        const key = `${slot.x}:${slot.z}`
        levels.set(key, [...(levels.get(key) ?? []), slot.y])
      }
      for (const [key, ys] of levels) {
        const sorted = [...ys].sort((a, b) => a - b)
        sorted.forEach((y, level) => expect(y, `${key} nível ${level}`).toBeCloseTo(slotCenterY(level), 6))
      }
    }
  })

  it('a variação por unidade sai do índice: determinística, espalhada e sem canais gêmeos', () => {
    const units = 48
    const channels = [0, 1, 2, 3, 4]

    for (const channel of channels) {
      const values = Array.from({ length: units }, (_, i) => unitNoise(i, channel))
      // Determinismo: a mesma cena volta idêntica a cada carregamento. É a
      // regra que proíbe `Math.random()`, e ela vale aqui mais do que em
      // qualquer outro lugar — é isto que difere um contêiner do vizinho.
      for (let i = 0; i < units; i++) expect(unitNoise(i, channel), `${i}@${channel}`).toBe(values[i])
      for (const value of values) {
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(1)
      }
      // Espalhado de verdade: um hash que devolvesse quase o mesmo número para
      // todo índice passaria no determinismo e não variaria nada na tela.
      expect(new Set(values.map((v) => Math.floor(v * 8))).size, `canal ${channel}`).toBeGreaterThanOrEqual(6)
    }

    // E os canais não podem andar juntos: mancha, giro e empurrão da mesma
    // unidade têm de ser independentes, senão o desalinhamento vira padrão.
    for (const a of channels) {
      for (const b of channels) {
        if (a >= b) continue
        const equal = Array.from({ length: units }, (_, i) => unitNoise(i, a) === unitNoise(i, b)).filter(Boolean)
        expect(equal, `canais ${a} e ${b}`).toHaveLength(0)
      }
    }
  })

  it('a variação de valor da chapa de fundo fica abaixo da pirâmide', () => {
    for (let i = 0; i < yard.spare.length; i++) {
      expect(yardShade(i)).toBeGreaterThan(0.5)
      // `layerShade(0)` = 0,72 é a chapa mais escura da pirâmide.
      expect(yardShade(i)).toBeLessThan(0.72)
    }
  })
})
