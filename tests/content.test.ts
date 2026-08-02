import { describe, expect, it } from 'vitest'
import { pt } from '@/content/pt'
import { en } from '@/content/en'
import { systems, SYSTEM_SLUGS } from '@/content/systems'

function flatten(obj: unknown, prefix = ''): string[] {
  if (obj === null || typeof obj !== 'object') return [prefix]
  if (Array.isArray(obj)) return obj.flatMap((v, i) => flatten(v, `${prefix}[${i}]`))
  return Object.entries(obj).flatMap(([k, v]) => flatten(v, prefix ? `${prefix}.${k}` : k))
}

function leaves(obj: unknown, prefix = ''): [string, unknown][] {
  if (obj === null || typeof obj !== 'object') return [[prefix, obj]]
  if (Array.isArray(obj)) return obj.flatMap((v, i) => leaves(v, `${prefix}[${i}]`))
  return Object.entries(obj).flatMap(([k, v]) => leaves(v, prefix ? `${prefix}.${k}` : k))
}

describe('dicionários', () => {
  it('PT e EN têm exatamente as mesmas chaves', () => {
    expect(flatten(en).sort()).toEqual(flatten(pt).sort())
  })

  it('nenhum valor de texto está vazio', () => {
    for (const dict of [pt, en]) {
      for (const [path, value] of leaves(dict)) {
        expect(typeof value === 'string' ? value.trim().length : 1, `vazio em ${path}`).toBeGreaterThan(0)
      }
    }
  })

  it('não contém os clichês proibidos pelo spec', () => {
    const proibidos = [/apaixonado por tecnologia/i, /caf[ée] em c[óo]digo/i, /passionate about tech/i]
    for (const dict of [pt, en]) {
      const texto = leaves(dict).map(([, v]) => String(v)).join(' ')
      for (const p of proibidos) expect(texto).not.toMatch(p)
    }
  })

  it('rotula os CS50 como certificação, nunca como graduação', () => {
    for (const dict of [pt, en]) {
      const cert = dict.about.education.certifications
      expect(cert.items.join(' ')).toMatch(/CS50/)
      expect(cert.label.toLowerCase()).not.toMatch(/gradua|degree|bachelor/)
      expect(dict.about.education.degree.items.join(' ')).not.toMatch(/CS50/)
    }
  })

  it('não afirma status da graduação em nenhum idioma', () => {
    const status = [/conclu[íi]d/i, /em andamento/i, /cursando/i, /completed/i, /in progress/i]
    for (const dict of [pt, en]) {
      const texto = dict.about.education.degree.items.join(' ')
      for (const s of status) expect(texto).not.toMatch(s)
    }
  })

  it('cobre exatamente os 3 sistemas do spec', () => {
    expect(systems.map((s) => s.slug)).toEqual([...SYSTEM_SLUGS])
    for (const dict of [pt, en]) {
      expect(Object.keys(dict.systems.detail).sort()).toEqual([...SYSTEM_SLUGS].sort())
    }
  })
})
