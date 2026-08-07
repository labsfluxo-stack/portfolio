import { describe, expect, it } from 'vitest'
import * as simpleIcons from 'simple-icons'
import { buildYard, iconSlug, markFor } from '@/components/three/portico-yard'
import { buildAssembly, plateShade } from '@/components/three/portico-architecture'
import { sceneRotation } from '@/components/three/portico-systems'
import { CONTAINER, slotCenterY } from '@/components/three/portico-model'
import {
  PANEL_MIN_CONTRAST,
  contrastRatio,
  needsPanel,
  relativeLuminance,
  unitNoise,
} from '@/components/three/portico-textures'
import { systems } from '@/content/systems'

const rotation = sceneRotation(systems)
const assemblies = rotation.map(buildAssembly)
const counts = assemblies.map((build) => build.cargo.length)
const depth = Math.max(...assemblies.map((build) => build.depth))
const yard = buildYard(counts, depth)

/** Toda tecnologia que a cena estampa, em qualquer sistema. */
const stacked = [...new Set(rotation.flatMap((system) => system.stack))]

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
    for (const name of ['Docker', 'TypeScript', 'React', 'PostgreSQL', 'Supabase', 'Next.js', 'Fastify 5']) {
      const mark = markFor(name)
      expect(mark, name).toMatchObject({ kind: 'icon', name })
      if (mark.kind !== 'icon') continue
      expect(mark.hex, name).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })

  it('tecnologia sem marca cai no texto SOZINHA, sem lista de exceções', () => {
    // Nenhuma destas está em `ICONS` — e três delas nem existem no pacote. Não
    // há nada no código dizendo isso: a busca pelo slug simplesmente não
    // encontra, e o estêncil assume.
    for (const name of ['Playwright', 'Groq', 'pgTAP', 'pgvector', 'BullMQ', 'S3']) {
      expect(markFor(name), name).toMatchObject({ kind: 'text', name })
    }
    // O caso que prova a automação: um nome que nunca existiu no conteúdo.
    expect(markFor('Tecnologia Que Não Existe').kind).toBe('text')
  })

  it('nenhuma tecnologia dos sistemas cai em texto tendo marca no pacote', () => {
    // O defeito que este teste existe para pegar já aconteceu: cinco marcas
    // (Node, Tailwind, Supabase, Vercel, Zod) existiam no simple-icons e
    // ficaram de fora do array `ICONS`, então renderizavam como texto sem que
    // nada acusasse. A fonte da verdade aqui é o PACOTE inteiro, não o nosso
    // array `ICONS` — se fosse o array, o teste concordaria com o próprio
    // esquecimento.
    const noPacote = new Set(Object.values(simpleIcons).map((icon) => icon.slug))
    const semIcone = stacked.filter((name) => markFor(name).kind === 'text')
    const perdidas = semIcone.filter((name) => noPacote.has(iconSlug(name)))
    expect(perdidas, `tecnologias com marca disponível caindo em texto: ${perdidas.join(', ')}`).toEqual([])
  })

  it('o estêncil da marca de texto usa o nome do conteúdo, na tipografia dos rótulos', () => {
    expect(markFor('Deploy blue-green')).toEqual({
      name: 'Deploy blue-green',
      kind: 'text',
      lines: ['DEPLOY', 'BLUE-GREEN'],
    })
  })

  it('todo nome de tecnologia dos sistemas resolve para alguma marca', () => {
    for (const name of stacked) {
      const mark = markFor(name)
      expect(mark.name, name).toBe(name)
      if (mark.kind === 'text') expect(mark.lines.join(' ').length, name).toBeGreaterThan(0)
      else expect(mark.path.length, name).toBeGreaterThan(0)
    }
  })

  it('mistura ícone e texto — não é vitrine de logos nem só estêncil', () => {
    const marks = stacked.map((name) => markFor(name))
    const icons = marks.filter((mark) => mark.kind === 'icon').length
    expect(icons, 'ícones').toBeGreaterThanOrEqual(8)
    expect(marks.length - icons, 'estênceis').toBeGreaterThanOrEqual(5)
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
    // Pretas e azul-escuras: Next.js, Fastify, three.js, Prisma.
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

  it('o painel resolve de fato: sobre ele, toda marca dos sistemas passa de 4,5:1', () => {
    // `--color-text` a 0,9 — o painel de aplicação da cena.
    const panel = '#DCDAD7'
    for (const name of stacked) {
      const mark = markFor(name)
      if (mark.kind !== 'icon' || !needsPanel(mark.hex, PLATE)) continue
      expect(contrastRatio(mark.hex, panel), name).toBeGreaterThan(4.5)
    }
  })

  it('nenhuma marca fica ilegível: ou passa na chapa, ou passa no painel', () => {
    for (const name of stacked) {
      const mark = markFor(name)
      if (mark.kind !== 'icon') continue
      const best = Math.max(contrastRatio(mark.hex, PLATE), needsPanel(mark.hex, PLATE) ? 4.5 : 0)
      expect(best, name).toBeGreaterThanOrEqual(PANEL_MIN_CONTRAST)
    }
  })
})

describe('pátio', () => {
  it('tem uma baia por sistema, com um lugar por contêiner da stack dele', () => {
    expect(yard.homes).toHaveLength(rotation.length)
    yard.homes.forEach((home, i) => expect(home, rotation[i]?.name).toHaveLength(counts[i] ?? 0))
  })

  it('as baias dos outros sistemas SÃO o fundo — nada de pilha decorativa', () => {
    // O que antes era enchimento ("spare") agora é carga de verdade: cada
    // contêiner parado no fundo pertence a um sistema que ainda vai ser
    // montado. Esta é a asserção que impede alguém de reintroduzir pilha
    // fantasma para "dar volume".
    const parked = yard.homes.flat().length
    expect(parked).toBe(counts.reduce((sum, count) => sum + count, 0))
    // E enquanto um sistema é montado, o resto continua no chão: o fundo nunca
    // é menos que os sistemas que não são o maior.
    const biggest = Math.max(...counts)
    expect(parked - biggest).toBeGreaterThan(biggest)
  })

  it('todo o material começa atrás do corredor, longe da área de montagem', () => {
    for (const slot of yard.homes.flat()) {
      expect(slot.z + CONTAINER.width / 2, `z=${slot.z}`).toBeLessThan(-depth / 2 - 4)
    }
  })

  it('duas pilhas nunca se atravessam, nem dentro da baia nem entre baias', () => {
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
    for (const home of yard.homes) {
      const taken = new Set(home.map((slot) => `${slot.x}:${slot.z}:${slot.y.toFixed(3)}`))
      for (const slot of home) {
        if (slot.y <= slotCenterY(0)) continue
        const below = (slot.y - CONTAINER.height).toFixed(3)
        expect(taken.has(`${slot.x}:${slot.z}:${below}`), `${slot.x},${slot.z} em y=${slot.y}`).toBe(true)
      }
    }
  })

  it('carrega por nível: o piso de todas as pilhas da baia antes de qualquer segundo andar', () => {
    for (const [i, home] of yard.homes.entries()) {
      const base = home.filter((slot) => slot.y === slotCenterY(0)).length
      for (let k = 0; k < base; k++) {
        expect(home[k]?.y, `baia ${i} lugar ${k}`).toBeCloseTo(slotCenterY(0), 6)
      }
      if (home.length > base) expect(home[base]?.y, `baia ${i}`).toBeCloseTo(slotCenterY(1), 6)
    }
  })

  it('cada pilha tem no máximo três contêineres — é o que mantém a máquina baixa', () => {
    for (const home of yard.homes) {
      const levels = new Map<string, number>()
      for (const slot of home) {
        const key = `${slot.x.toFixed(2)}:${slot.z.toFixed(2)}`
        levels.set(key, (levels.get(key) ?? 0) + 1)
      }
      for (const [key, height] of levels) expect(height, key).toBeLessThanOrEqual(3)
    }
  })

  it('a planta do pátio sai do TAMANHO de cada sistema, não de número escrito à mão', () => {
    // A varredura vai bem além dos sistemas de hoje de propósito: a promessa é
    // que o pátio cresce com a rotação, não que ele cabe nesta rotação. O
    // defeito irmão já aconteceu na versão anterior — uma lista fixa de pilhas
    // deixou seis contêineres sem lugar de onde sair, e a cena os
    // materializaria no ar.
    for (let size = 1; size <= 40; size++) {
      const plan = buildYard([size, 4], 6)
      expect(plan.homes[0], `sistema de ${size}`).toHaveLength(size)
      expect(plan.homes[1]).toHaveLength(4)
      const levels = new Map<string, number[]>()
      for (const slot of plan.homes.flat()) {
        const key = `${slot.x.toFixed(2)}:${slot.z.toFixed(2)}`
        levels.set(key, [...(levels.get(key) ?? []), slot.y])
      }
      for (const [key, ys] of levels) {
        const sorted = [...ys].sort((a, b) => a - b)
        sorted.forEach((y, level) => expect(y, `${key} nível ${level}`).toBeCloseTo(slotCenterY(level), 6))
      }
    }
    expect(buildYard([], 6).homes).toHaveLength(0)
  })

  it('cada pilha leva um número de posição próprio, tirado do índice', () => {
    const codes = yard.footprints.map((spot) => spot.code)
    expect(new Set(codes).size, 'números repetidos no pátio').toBe(codes.length)
    for (const code of codes) expect(code).toMatch(/^[A-Z]\d+$/)
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

  it('o valor da chapa varia por sistema e por camada, sem sair da mesma tinta', () => {
    const values: number[] = []
    for (let system = 0; system < rotation.length; system++) {
      for (let role = 0; role < 5; role++) {
        const value = plateShade(system, role)
        values.push(value)
        expect(value, `sistema ${system} camada ${role}`).toBeGreaterThan(0.5)
        expect(value).toBeLessThan(1.4)
      }
      // Dentro de um sistema, a aplicação é mais clara que a infraestrutura —
      // é o que separa os níveis da montagem sem inventar cor nova.
      expect(plateShade(system, 4)).toBeGreaterThan(plateShade(system, 0))
    }
    // E dois sistemas seguidos não podem ter o mesmo valor de base, senão as
    // baias vizinhas do pátio lêem como uma só.
    for (let system = 1; system < rotation.length; system++) {
      expect(plateShade(system, 0), `sistemas ${system - 1} e ${system}`).not.toBeCloseTo(
        plateShade(system - 1, 0),
        6,
      )
    }
    expect(Math.max(...values) - Math.min(...values)).toBeLessThan(0.8)
  })
})
