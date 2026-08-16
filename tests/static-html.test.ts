import { existsSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { pt } from '../content/pt'
import { en } from '../content/en'
import { SYSTEM_SLUGS, locales } from '../content/types'

// Portão de GEO (Task 14, spec §7): GPTBot, ClaudeBot e PerplexityBot não
// executam JavaScript — pedem a URL, leem o HTML bruto da resposta e vão
// embora, sem fila de renderização e sem segunda tentativa. Os crawlers de
// preview de link do LinkedIn, WhatsApp e Slack idem. Este teste roda sobre
// `out/`, depois do build, e falha se qualquer rota deixar de trazer o
// conteúdo real fora de `<script>`.

const OUT = join(process.cwd(), 'out')

function html(route: string): string {
  const file = join(OUT, route, 'index.html')
  if (!existsSync(file)) throw new Error(`rota não gerada: ${route} (${file})`)
  return readFileSync(file, 'utf8')
}

// ARMADILHA CONHECIDA (ver brief da Task 14): um grep ingênuo dá falso
// positivo em tudo, porque o payload de hidratação do React —
// `<script>self.__next_f.push(...)</script>` — serializa o dicionário
// inteiro, visível ou não. E `sed 's/<script[^>]*>.*<\/script>//g'` está
// errado na direção oposta: o Next gera o HTML numa linha só, e o `.*`
// guloso apaga tudo entre o PRIMEIRO e o ÚLTIMO `<script>` do documento —
// sumindo com a página inteira e reduzindo o teste a comparar strings
// vazias. `[\s\S]*?` não guloso é o que evita as duas armadilhas.
function semScripts(source: string): string {
  return source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
}

// React escapa nó de texto em HTML (& < > " ') mesmo quando o caractere não
// precisaria estritamente de escape fora de atributo — verificado contra a
// saída real deste projeto: 'KPIs que preferem dizer "não sei"' sai como
// `KPIs que preferem dizer &quot;não sei&quot;`, e `<tecnologia>` sai como
// `&lt;tecnologia&gt;`. Comparar a string crua do dicionário contra o HTML
// falha nesses casos mesmo com o conteúdo perfeitamente presente — por isso
// toda comparação de texto visível passa por aqui antes do `toContain`.
function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

beforeAll(() => {
  if (!existsSync(OUT)) throw new Error('rode `npm run build` antes de `npm run test:html`')
})

const dicts = { pt, en } as const

describe('portão de GEO — sanidade da limpeza de <script>', () => {
  it('o HTML despido de <script> ainda contém "Neto Alves"', () => {
    // Esta é a asserção que impede o resto do arquivo de virar comparação de
    // strings vazias: se `semScripts` comer a página inteira (a armadilha do
    // `sed` guloso), esta linha acusa antes de qualquer outra.
    const clean = semScripts(html('pt'))
    expect(clean).toContain(pt.hero.name)
  })

  it('mas o HTML BRUTO contém muito mais "Neto Alves" do que o despido (prova que havia <script> para remover)', () => {
    const raw = html('pt')
    const clean = semScripts(raw)
    const count = (s: string) => s.split(pt.hero.name).length - 1
    expect(count(raw)).toBeGreaterThan(count(clean))
  })
})

describe('portão de GEO — HTML bruto contém o conteúdo', () => {
  for (const locale of locales) {
    const d = dicts[locale]

    it(`/${locale} traz nome, cargo e tagline fora de <script>`, () => {
      const clean = semScripts(html(locale))
      expect(clean).toContain(escapeHtmlText(d.hero.name))
      expect(clean).toContain(escapeHtmlText(d.hero.role))
      expect(clean).toContain(escapeHtmlText(d.hero.tagline))
    })

    it(`/${locale} traz os 4 números canônicos de telemetria com o separador certo`, () => {
      const clean = semScripts(html(locale))
      for (const metric of d.telemetry.metrics) {
        // O valor sozinho ('10+', '9', '5'...) por si só não provaria que
        // <Telemetry> renderizou ('9'/'5' são dígitos soltos que casam
        // dezenas de vezes no resto da página). A procedência
        // (`metric.provenance`) é uma frase longa exclusiva de Metric.tsx: só
        // sobrevive se a seção de verdade renderizou.
        expect(clean, `procedência da métrica "${metric.key}" ausente`).toContain(escapeHtmlText(metric.provenance))
        expect(clean, `métrica "${metric.key}" (${metric.value}) ausente`).toContain(escapeHtmlText(metric.value))
      }
    })

    it(`/${locale} traz a experiência de infraestrutura e os três vendors`, () => {
      const clean = semScripts(html(locale))
      expect(clean).toContain(escapeHtmlText(d.about.experience.years))
      for (const vendor of d.about.experience.vendors) {
        expect(clean, `vendor "${vendor}" ausente`).toContain(escapeHtmlText(vendor))
      }
      expect(d.about.experience.vendors).toEqual(['Cisco', 'MikroTik', 'Furukawa'])
    })

    it(`/${locale} traz as certificações HarvardX rotuladas como tal`, () => {
      const clean = semScripts(html(locale))
      expect(clean).toContain(escapeHtmlText(d.about.education.certifications.institution))
      expect(clean).toContain('CS50x')
    })

    it(`/${locale} traz os três nomes de sistema com link pro case study`, () => {
      const clean = semScripts(html(locale))
      for (const slug of SYSTEM_SLUGS) {
        // O `href` de "Ver case study" só existe em SystemCard.tsx — prova
        // que <Systems> renderizou de verdade, não só que o nome aparece em
        // algum outro lugar da página.
        expect(clean, `sistema "${slug}" ausente`).toContain(escapeHtmlText(d.systems.detail[slug].name))
        expect(clean, `link do case study de "${slug}" ausente`).toContain(`sistemas/${slug}/`)
      }
    })

    it(`/${locale} traz as camadas do stack com todas as tecnologias declaradas`, () => {
      const clean = semScripts(html(locale))
      for (const layer of d.stack.layers) {
        expect(clean, `camada "${layer.label}" ausente`).toContain(escapeHtmlText(layer.label))
        for (const item of layer.items) {
          expect(clean, `tecnologia "${item.name}" (camada "${layer.label}") ausente`).toContain(
            escapeHtmlText(item.name),
          )
        }
      }
    })

    it(`/${locale} traz os três canais de contato e o link do PDF do currículo`, () => {
      const clean = semScripts(html(locale))
      expect(clean, 'link do WhatsApp ausente').toContain(d.contact.whatsapp)
      expect(clean, 'link de e-mail (mailto:) ausente').toContain(`mailto:${d.contact.email}`)
      expect(clean, 'link do GitHub ausente').toContain(d.contact.github)
      expect(clean, `link do PDF do currículo (${locale}) ausente`).toContain(`cv/neto-alves-${locale}.pdf`)
    })

    it(`/${locale} tem Open Graph e Twitter Card completos`, () => {
      const raw = html(locale)
      expect(raw).toMatch(/<meta property="og:title"/)
      expect(raw).toMatch(/<meta property="og:description"/)
      expect(raw).toMatch(/<meta property="og:image"/)
      expect(raw).toMatch(/<meta property="og:url"/)
      expect(raw).toMatch(/<meta property="og:type"/)
      expect(raw).toMatch(/<meta name="twitter:card" content="summary_large_image"/)
    })

    it(`/${locale} tem JSON-LD Person com a formação e os vendors de rede`, () => {
      const raw = html(locale)
      const scriptMatch = raw.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
      expect(scriptMatch, 'script JSON-LD ausente').not.toBeNull()
      const person = JSON.parse(scriptMatch?.[1] ?? '{}') as {
        '@type': string
        knowsAbout: string[]
        alumniOf?: unknown
        hasCredential: { name: string; recognizedBy?: { name: string } }[]
      }

      expect(person['@type']).toBe('Person')
      expect(person.knowsAbout).toContain('Cisco')
      expect(person.hasCredential.some((c) => c.recognizedBy?.name.includes('HarvardX'))).toBe(true)
      expect(person.hasCredential.some((c) => c.name.includes('CS50x'))).toBe(true)

      // `alumniOf` é o "é ex-aluno de" do schema.org — uma afirmação de
      // conclusão que a graduação, pausada, nunca pode carregar em
      // superfície nenhuma, JSON-LD incluído (ver lib/jsonld.ts, A044). O
      // campo não deve existir nem apontar para uma instituição por nenhum
      // outro caminho.
      expect(
        person.alumniOf,
        'alumniOf não deveria existir: nenhuma instituição aqui tem status de conclusão verificado',
      ).toBeUndefined()

      // A graduação deixou de nomear instituição (ver content/pt.ts), e
      // isso muda o que dá para travar aqui. Esta trava EXTRAÍA a
      // instituição do próprio item, partindo no travessão — sem
      // travessão ela passaria a extrair "Análise de Dados" e a asserção
      // seguinte viraria verde por acidente, comparando o JSON-LD contra o
      // nome do curso em vez do nome da instituição. Trocada por duas que
      // continuam tendo o que provar: que a graduação não volte a nomear
      // instituição, e que nenhuma vaze para o JSON-LD por caminho lateral.
      for (const item of d.about.education.degree.items) {
        expect(item, `a graduação voltou a nomear instituição em "${item}"`).not.toContain('—')
      }
      expect(JSON.stringify(person), 'instituição de graduação vazou para o JSON-LD').not.toMatch(/Est[áa]cio/i)

      // Nenhuma afirmação de status do curso da Estácio (pausado) dentro do
      // próprio JSON-LD — escopado só a este objeto, nunca à página inteira:
      // a prosa de um case study fala em "run... concluído" (status de uma
      // execução de pipeline), o que faria um regex de página inteira
      // acusar um falso positivo sem relação nenhuma com a formação.
      const personJson = JSON.stringify(person)
      for (const status of [/conclu[íi]d/i, /em andamento/i, /cursando/i, /completed/i, /in progress/i]) {
        expect(personJson).not.toMatch(status)
      }
    })

    it(`/${locale} declara hreflang recíproco entre pt-BR e en`, () => {
      const raw = html(locale)
      // O Next renderiza o atributo como `hrefLang` (case do DOM property),
      // não `hreflang` (case do atributo HTML) — verificado contra a saída
      // real. Case-insensitive para não depender de qual dos dois o Next
      // decide usar numa versão futura.
      expect(raw).toMatch(/hreflang="pt-BR"/i)
      expect(raw).toMatch(/hreflang="en"/i)
    })

    it(`/${locale}/og/home é noindex e não vaza cromo de navegação`, () => {
      const raw = html(`${locale}/og/home`)
      expect(raw).toMatch(/name="robots"[^>]*noindex/)
    })

    for (const slug of SYSTEM_SLUGS) {
      it(`/${locale}/sistemas/${slug} traz o case completo (nome, problema, decisões, JSON-LD)`, () => {
        const raw = html(`${locale}/sistemas/${slug}`)
        const clean = semScripts(raw)
        const cs = d.systems.detail[slug]

        expect(clean).toContain(escapeHtmlText(cs.name))
        expect(clean).toContain(escapeHtmlText(cs.problem.slice(0, 40)))
        for (const decision of cs.decisions) {
          expect(clean, `decisão "${decision.title}" ausente`).toContain(escapeHtmlText(decision.title))
        }

        expect(raw).toMatch(/"@type":\s*"CreativeWork"/)
      })

      it(`/${locale}/og/${slug} é noindex`, () => {
        const raw = html(`${locale}/og/${slug}`)
        expect(raw).toMatch(/name="robots"[^>]*noindex/)
      })
    }

    describe(`/${locale}/projetos (landing de captação)`, () => {
      // A página inteira promete que a IA consegue ler o site. Se o
      // argumento dela só existir depois do JavaScript rodar, a promessa é
      // falsa sobre a própria página — e um crawler de IA leria exatamente
      // nada.
      it('o argumento está no HTML estático, fora de <script>', () => {
        const visivel = semScripts(html(`${locale}/projetos`))
        expect(visivel).toContain(escapeHtmlText(d.landing.hero.titulo))
        // As palavras em serifa itálica viraram `<span>` próprio e saíram para
        // chaves separadas do dicionário — o que as deixaria FORA deste portão
        // se não fossem asseguradas aqui. Uma delas é "ser lidos pelo ChatGPT":
        // a promessa central da página, e a última que poderia sumir do HTML
        // sem ninguém notar.
        expect(visivel).toContain(escapeHtmlText(d.landing.hero.tituloDestaque))
        expect(visivel).toContain(escapeHtmlText(d.landing.hero.subtituloDestaque))
        expect(visivel).toContain(escapeHtmlText(d.landing.criterio.titulo))
        for (const teste of d.landing.criterio.testes) {
          expect(visivel, `critério "${teste.titulo}" ausente`).toContain(escapeHtmlText(teste.titulo))
        }
      })

      it('o CTA existe no HTML estático e aponta para o WhatsApp', () => {
        const visivel = semScripts(html(`${locale}/projetos`))
        expect(visivel).toContain(escapeHtmlText(d.landing.cta.rotulo))
        expect(visivel).toContain(d.contact.whatsapp)
      })

      // Regra do spec §10.8, verificada no HTML entregue e não só no
      // dicionário: um componente poderia escrever o termo à mão.
      it('não usa o vocabulário descartado pela pesquisa', () => {
        const visivel = semScripts(html(`${locale}/projetos`)).toLowerCase()
        expect(visivel).not.toContain('llms.txt')
        expect(visivel).not.toContain('ai overview')
        // "GEO" só como palavra isolada — "geografia"/"geometria" etc. não
        // devem disparar o portão.
        expect(visivel).not.toMatch(/\bgeo\b/)
      })
    })
  }

  it('as rotas de CV são noindex nos dois idiomas', () => {
    for (const locale of locales) {
      expect(html(`${locale}/cv`)).toMatch(/name="robots"[^>]*noindex/)
    }
  })

  it('out/index.html (redirect da raiz) existe e aponta para /pt/', () => {
    // scripts/write-root-redirect.mts roda depois do `next build` e escreve
    // este arquivo à mão — sem asserção nenhuma aqui, um erro silencioso
    // nesse script (ou o arquivo nunca sendo gerado) deixa o portão verde
    // enquanto a URL que as pessoas colam (a raiz do site publicado) 404a.
    const file = join(OUT, 'index.html')
    expect(existsSync(file), 'out/index.html não existe — scripts/write-root-redirect.mts falhou em silêncio').toBe(
      true,
    )
    const raw = readFileSync(file, 'utf8')
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '/portfolio'
    expect(raw, `out/index.html não contém "${basePath}/pt/"`).toContain(`${basePath}/pt/`)
  })

  it('sitemap.xml, robots.txt e llms.txt existem em out/', () => {
    for (const file of ['sitemap.xml', 'robots.txt', 'llms.txt']) {
      expect(existsSync(join(OUT, file)), file).toBe(true)
    }
  })

  it('o sitemap não lista as rotas de CV nem de OG', () => {
    const sitemap = readFileSync(join(OUT, 'sitemap.xml'), 'utf8')
    expect(sitemap).not.toContain('/cv')
    expect(sitemap).not.toContain('/og/')
  })

  it('toda rota pública do sitemap também aparece no llms.txt, nos dois idiomas', () => {
    // Achado de revisão da Task 10: `buildLlmsTxt` (scripts/generate-seo-files.mts)
    // mantinha o próprio laço sobre `SYSTEM_SLUGS` + home, sem passar pela
    // mesma `PATHS` que `buildSitemap` usa — `/projetos` entrava no sitemap e
    // ficava fora do llms.txt, e nada acusava, porque o único teste existente
    // ("sitemap.xml, robots.txt e llms.txt existem em out/") checa presença
    // do arquivo, não o conteúdo dele. A lista abaixo espelha `PATHS` do
    // script (home, a landing de captação, os case studies) contra o ARQUIVO
    // REAL gerado — não importa o script (scripts/*.mts roda fora do grafo de
    // módulos do Next, ver o próprio comentário do arquivo), então isto é a
    // forma de testar a saída sem duplicar a lista dentro do módulo do script.
    const llms = readFileSync(join(OUT, 'llms.txt'), 'utf8')
    const paths = ['', '/projetos', ...SYSTEM_SLUGS.map((slug) => `/sistemas/${slug}`)]
    for (const locale of locales) {
      for (const path of paths) {
        expect(llms, `llms.txt não lista /${locale}${path}/`).toContain(`/${locale}${path}/`)
      }
    }
  })

  it('o robots.txt aponta para o sitemap', () => {
    const robots = readFileSync(join(OUT, 'robots.txt'), 'utf8')
    expect(robots).toMatch(/Sitemap:\s*https?:\/\//)
  })

  // Achado C-h da revisão final de branch: a guarda cobria só a home. A
  // landing (/[locale]/projetos) tem seu próprio og:image
  // (public/og/{locale}-projetos.png, ver app/[locale]/projetos/page.tsx) e
  // não era conferida por nada aqui.
  it('cada og:image apontado na home e na landing resolve para um arquivo de verdade em out/', () => {
    for (const locale of locales) {
      for (const route of [locale, `${locale}/projetos`]) {
        const raw = html(route)
        const match = raw.match(/<meta property="og:image" content="([^"]+)"/)
        const imageUrl = match?.[1]
        expect(imageUrl, `og:image ausente em /${route}`).toBeDefined()
        const url = new URL(imageUrl ?? '')
        // O primeiro segmento do path é o basePath (ex.: /portfolio); o resto
        // é o caminho do arquivo dentro de out/.
        const relative = url.pathname.split('/').slice(2).join('/')
        const file = join(OUT, relative)
        expect(existsSync(file), `${url.pathname} -> ${file} não existe`).toBe(true)
      }
    }
  })

  // Achado I1/B2 da revisão final de branch: o card OG da landing caía no
  // branch de OgHome (`projetos` não é slug de sistema) e saía BYTE-IDÊNTICO
  // ao card da home -- confirmado por md5. O teste de existência acima (e o
  // da Task 12) não pegava isso: os dois arquivos EXISTIAM, só que eram a
  // mesma foto. Só um hash prova que não é duplicata.
  it('o card OG da landing não é o mesmo arquivo que o da home (md5)', () => {
    const md5 = (path: string) => createHash('md5').update(readFileSync(path)).digest('hex')
    for (const locale of locales) {
      const home = join(OUT, 'og', `${locale}-home.png`)
      const landing = join(OUT, 'og', `${locale}-projetos.png`)
      expect(existsSync(home), home).toBe(true)
      expect(existsSync(landing), landing).toBe(true)
      expect(md5(landing), `${locale}-projetos.png e ${locale}-home.png são o mesmo arquivo`).not.toBe(md5(home))
    }
  })
})
