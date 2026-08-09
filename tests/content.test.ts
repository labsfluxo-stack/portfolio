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

  // A graduação não nomeia instituição (decisão do dono, ver content/pt.ts),
  // e sem instituição declarada não existe vínculo a afirmar — some a
  // classe inteira de risco que o teste acima cobre por outro ângulo. Esta
  // trava existe para que ela não volte por descuido, junto com o problema.
  it('a graduação não nomeia instituição em nenhum idioma', () => {
    for (const dict of [pt, en]) {
      for (const item of dict.about.education.degree.items) {
        expect(item, `"${item}" voltou a nomear instituição`).not.toContain('—')
      }
    }
    const texto = [pt, en].flatMap((dict) => leaves(dict)).map(([, v]) => String(v)).join(' ')
    expect(texto, 'a instituição da graduação voltou ao dicionário').not.toMatch(/Est[áa]cio/i)
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

  // O card de um sistema e a Telemetria falavam das MESMAS categorias:
  // linhas, tabelas, endpoints, commits e testes apareciam nos dois, e o
  // case study repetia tudo uma terceira vez na prosa da arquitetura.
  // "Linhas de código" era dita três vezes no mesmo caminho de leitura.
  //
  // A divisão é de responsabilidade: a Telemetria conta o volume somado da
  // carreira, o card conta o que é específico daquele sistema. Esta trava
  // quebra se as duas listas voltarem a se cruzar.
  it('nenhuma métrica de sistema repete uma categoria da telemetria', () => {
    const telemetria = new Set(
      [...pt.telemetry.metrics, ...pt.telemetry.secondary].map((metric) => metric.key),
    )
    // Sanidade: sem isto, um `telemetry` vazio (ou uma troca de nome de
    // campo) deixaria a interseção vazia e o teste verde sem checar nada.
    expect(telemetria.size, 'a telemetria não tem chave nenhuma — o teste virou decoração').toBeGreaterThan(5)

    const cruzadas = systems
      .flatMap((system) => system.metrics.map((metric) => metric.key))
      .filter((key) => telemetria.has(key))
    expect(
      [...new Set(cruzadas)],
      'estas categorias aparecem no card E na telemetria — escolha uma das duas superfícies',
    ).toEqual([])
  })

  // Rótulo sem métrica que o use é convite para alguém recolocar a métrica
  // e reabrir a repetição acima; métrica sem rótulo renderiza `undefined`
  // na tela. Os dois lados têm de bater exatamente.
  it('metricLabels cobre exatamente as chaves usadas pelos sistemas, sem sobra', () => {
    const usadas = [...new Set(systems.flatMap((system) => system.metrics.map((metric) => metric.key)))].sort()
    for (const dict of [pt, en]) {
      expect(Object.keys(dict.systems.metricLabels).sort()).toEqual(usadas)
    }
  })

  // `toContain` era fraco demais para número de um dígito: a métrica `apps`
  // (3) do Moveis.pro passava casando o "3" do meio de "231 commits",
  // enquanto a prosa escrevia "Três aplicações" por extenso. Verde sem
  // corroborar nada. A fronteira de dígito exige o número INTEIRO — foi ela
  // que obrigou a prosa a passar a escrever "3 aplicações".
  it('a arquitetura de cada case study cita os números de content/systems.ts', () => {
    for (const locale of locales) {
      const dict = locale === 'pt' ? pt : en
      for (const system of systems) {
        const architecture = dict.systems.detail[system.slug].architecture
        for (const metric of system.metrics) {
          const formatted = formatNumber(metric.value, locale)
          const inteiro = new RegExp(`(^|[^\\d.,])${formatted.replace(/[.]/g, '\\.')}([^\\d.,]|$)`)
          expect(
            inteiro.test(architecture),
            `"systems.detail.${system.slug}.architecture" (${locale}) não cita a métrica "${metric.key}" (${formatted}) como número inteiro`,
          ).toBe(true)
        }
      }
    }
  })
})
