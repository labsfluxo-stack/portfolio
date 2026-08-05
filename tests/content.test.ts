import { describe, expect, it } from 'vitest'
import { pt } from '@/content/pt'
import { en } from '@/content/en'
import { systems, SYSTEM_SLUGS } from '@/content/systems'
import { locales } from '@/content/types'
import { formatNumber } from '@/lib/format'

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

  it('números canônicos aparecem com o separador certo em cada idioma', () => {
    const CANONICOS = [
      { pt: '10+', en: '10+' },
      { pt: '250.000+', en: '250,000+' },
      { pt: '265.562', en: '265,562' },
      { pt: '1.675', en: '1,675' },
      { pt: '214', en: '214' },
      { pt: '459', en: '459' },
      { pt: '130', en: '130' },
      { pt: '1.270', en: '1,270' },
      { pt: '2026-08-02', en: '2026-08-02' },
    ] as const

    const textoPt = leaves(pt).map(([, v]) => String(v)).join(' ')
    const textoEn = leaves(en).map(([, v]) => String(v)).join(' ')

    for (const { pt: valorPt, en: valorEn } of CANONICOS) {
      expect(textoPt, `"${valorPt}" ausente do dicionário PT`).toContain(valorPt)
      expect(textoEn, `"${valorEn}" ausente do dicionário EN`).toContain(valorEn)
    }

    // O bug de verdade: a forma PT (separador de milhar com ponto) vazando
    // para o dicionário EN, ou a forma EN (com vírgula) vazando para o PT.
    for (const formaPt of ['250.000+', '265.562', '1.675', '1.270']) {
      expect(textoEn, `forma PT "${formaPt}" vazou para o dicionário EN`).not.toContain(formaPt)
    }
    for (const formaEn of ['250,000+', '265,562', '1,675', '1,270']) {
      expect(textoPt, `forma EN "${formaEn}" vazou para o dicionário PT`).not.toContain(formaEn)
    }
  })

  // O teste acima só prova que cada número canônico aparece EM ALGUM LUGAR
  // do dicionário — a própria `terminal.responses.stats` já satisfaz isso
  // sozinha, então nada aqui acusava se ela divergisse de
  // `telemetry.metrics`/`telemetry.secondary`. Trocar um valor de um lado e
  // deixar o outro parado ficava verde: a página mostraria dois totais
  // diferentes a uma tela de distância sem o build reclamar. Este teste
  // fecha essa classe de bug: toda restatação em prosa precisa citar os
  // mesmos números que a fonte de verdade estruturada.
  it('a resposta "stats" do terminal cita todos os números canônicos da telemetria', () => {
    for (const dict of [pt, en]) {
      const statsText = (dict.terminal.responses.stats ?? []).join(' ')
      for (const metric of dict.telemetry.metrics) {
        expect(statsText, `métrica "${metric.key}" (${metric.value}) ausente de terminal.responses.stats`).toContain(
          metric.value,
        )
      }
      for (const metric of dict.telemetry.secondary) {
        expect(
          statsText,
          `métrica secundária "${metric.key}" (${metric.value}) ausente de terminal.responses.stats`,
        ).toContain(metric.value)
      }
    }
  })

  it('a arquitetura de cada case study cita os números de content/systems.ts', () => {
    for (const locale of locales) {
      const dict = locale === 'pt' ? pt : en
      for (const system of systems) {
        const architecture = dict.systems.detail[system.slug].architecture
        for (const metric of system.metrics) {
          const formatted = formatNumber(metric.value, locale)
          expect(
            architecture,
            `"systems.detail.${system.slug}.architecture" (${locale}) não cita a métrica "${metric.key}" (${formatted})`,
          ).toContain(formatted)
        }
      }
    }
  })
})
