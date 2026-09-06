import type { CaseStudy, Dictionary, Locale, SystemSlug } from '@/content/types'
import { blogTextos } from '@/content/blog-textos'
import { dataVigente, LOCALE_DO_BLOG, type Post } from '@/content/posts'
import { palavrasDoPost } from './leitura'
import { HREFLANG, SITE_URL, routeUrl } from './seo'

/**
 * `Person` do schema.org para a home (spec §7.3). `knowsAbout` reaproveita
 * as camadas de `dict.stack` por inteiro — inclui as marcas de rede (Cisco,
 * MikroTik, Furukawa) porque elas já vivem na camada "Redes &
 * Infraestrutura" do mesmo dicionário, não uma lista separada.
 *
 * NUNCA `alumniOf`: é o "é ex-aluno de" do schema.org — uma afirmação de
 * conclusão — e a graduação da Estácio está pausada. A regra do projeto é
 * que nenhuma superfície, JSON-LD incluído, carrega afirmação de status
 * sobre ela (ver content/pt.ts, about.education.degree). Um crawler de IA
 * lê `alumniOf` de forma mais literal do que lê prosa, então é a última
 * superfície onde essa afirmação poderia vazar por engano — daí o teste
 * dedicado em tests/static-html.test.ts que falha se o campo reaparecer.
 * As certificações da HarvardX são credenciais de fato concluídas, então
 * entram como `hasCredential`/`EducationalOccupationalCredential`, que
 * carrega uma afirmação mais fraca ("tem esta credencial") sem implicar
 * vínculo formal de aluno.
 *
 * `image` fica de fora de propósito: a foto (`public/foto/neto.jpg`) ainda
 * não foi entregue pelo dono (spec §11); apontar para um arquivo inexistente
 * seria pior do que omitir o campo.
 *
 * `sameAs` leva só o GitHub. `dict.contact.linkedin` não existe no
 * `Dictionary` — o dono ainda não forneceu a URL (ver content/types.ts) — e
 * não é inventado aqui nem como chave nem como valor.
 */
export function personJsonLd(locale: Locale, dict: Dictionary) {
  const knowsAbout = dict.stack.layers.flatMap((layer) => layer.items.map((item) => item.name))
  const { institution, items: certifications } = dict.about.education.certifications

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    // `@id` ESTÁVEL, e ele passou a ser referenciado de fora: `postJsonLd` e
    // `blogJsonLd` apontam `author`/`publisher` para cá em vez de repetir nome
    // e URL em cada artigo. Um grafo com duas descrições da mesma pessoa é
    // ambíguo para quem consome, e a segunda cópia é a que envelhece.
    '@id': `${routeUrl(locale, '')}#pessoa`,
    name: dict.hero.name,
    jobTitle: dict.hero.role,
    description: dict.meta.description,
    url: routeUrl(locale, ''),
    inLanguage: HREFLANG[locale],
    knowsAbout,
    hasCredential: certifications.map((name) => ({
      '@type': 'EducationalOccupationalCredential',
      credentialCategory: 'certificate',
      name,
      recognizedBy: { '@type': 'EducationalOrganization', name: institution },
    })),
    sameAs: [dict.contact.github],
  }
}

/**
 * A MARCAÇÃO DA LANDING: `FAQPage` + `ProfessionalService`, num `@graph`.
 *
 * A auditoria ampla de 2026-09-04 encontrou a página de projetos com UM bloco
 * JSON-LD, herdado do layout: `Person`. Numa página de serviço, com FAQ e
 * casos, o resultado é que um buscador conclui que ela é sobre uma PESSOA e
 * não sobre algo comprável.
 *
 * RESSALVA HONESTA, e ela vem do próprio dicionário: `auditoria.resultado.
 * notaMarcacao` afirma que dados estruturados "não movem citação em IA — isso
 * foi medido em 1.885 páginas e mal mudou". Continua verdade, e é por isso que
 * isto NÃO é apresentado como alavanca de IA. `FAQPage` serve a outro canal:
 * resultado rico no Google. Marcar aqui é também o mínimo de coerência de uma
 * página cuja própria ferramenta checa "O conteúdo está marcado" no site do
 * visitante.
 *
 * `FAQPage` É MAPEAMENTO, NÃO INVENÇÃO. As quatro perguntas já existem em
 * `dict.landing.perguntas.itens`, já vêm prontas do servidor dentro de
 * `<details>/<summary>` e já têm pergunta e resposta em campos separados —
 * nada aqui afirma o que a página não diz, que é a única forma de marcação que
 * não vira risco de penalidade.
 *
 * `offers` sai de `dict.landing.piso` e SOME JUNTO COM ELE. Enquanto o dono
 * não tinha decidido o valor o campo era `null`, e um `Offer` com preço
 * inventado seria pior aqui do que na página: em prosa o leitor pondera, em
 * JSON-LD o buscador toma como declaração. O `priceSpecification` recorrente
 * carrega a mensalidade pela mesma razão que a nota visível carrega — piso que
 * esconde o recorrente não é piso.
 *
 * `price` NÃO é extraído da string "A partir de R$ 999" por regex: o número
 * vive em `PRECO`, ao lado do dicionário que o escreve por extenso, porque
 * derivar um dado estruturado de um texto de marketing é criar uma segunda
 * fonte de verdade que quebra calada na primeira reescrita da frase.
 */
const PRECO = { entrada: '999', mensal: '99', moeda: 'BRL' } as const

export function landingJsonLd(locale: Locale, dict: Dictionary) {
  const url = routeUrl(locale, '/projetos')
  const { piso, perguntas, meta } = dict.landing

  const servico: Record<string, unknown> = {
    '@type': 'ProfessionalService',
    '@id': `${url}#servico`,
    name: meta.title,
    description: meta.description,
    url,
    inLanguage: HREFLANG[locale],
    provider: { '@type': 'Person', name: dict.hero.name },
    areaServed: { '@type': 'Country', name: 'Brazil' },
    serviceType: dict.landing.oferta.cartoes.map((cartao) => cartao.nome),
  }

  if (piso) {
    servico.offers = {
      '@type': 'Offer',
      priceCurrency: PRECO.moeda,
      price: PRECO.entrada,
      description: piso.nota,
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        priceCurrency: PRECO.moeda,
        price: PRECO.mensal,
        billingIncrement: 1,
        unitCode: 'MON',
      },
    }
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [
      servico,
      {
        '@type': 'FAQPage',
        '@id': `${url}#faq`,
        inLanguage: HREFLANG[locale],
        mainEntity: perguntas.itens.map((item) => ({
          '@type': 'Question',
          name: item.pergunta,
          acceptedAnswer: { '@type': 'Answer', text: item.resposta },
        })),
      },
    ],
  }
}

/**
 * `BlogPosting` por artigo, e `Blog` no índice.
 *
 * É o tipo que os buscadores usam para tratar a página como artigo datado em
 * vez de página avulsa — o que muda o resultado é `datePublished` e
 * `dateModified`, não a marcação em si.
 *
 * `dateModified` sai de `dataVigente`: a revisão, se houve; a publicação, se
 * não. Declarar `dateModified` igual ao `datePublished` num texto nunca
 * revisado não é erro, é o valor honesto — o que seria erro é carimbar a data
 * do build, que faria todo artigo parecer revisado a cada deploy.
 *
 * `wordCount` e `timeRequired` vêm CONTADOS do arquivo (ver lib/leitura.ts).
 * Nenhum dos dois é escrito no `meta` do artigo, pela mesma razão que nenhum
 * número deste site é escrito à mão: o texto muda e o número fica para trás.
 *
 * `author` e `publisher` apontam para a mesma `Person` que o layout de locale
 * já emite, por `@id`, em vez de repetir nome e URL. Um grafo com duas
 * descrições da mesma pessoa é ambíguo para quem consome.
 */
export function postJsonLd(post: Post, minutos: number) {
  const url = routeUrl(LOCALE_DO_BLOG, `/blog/${post.slug}`)

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': url,
    headline: post.meta.titulo,
    description: post.meta.descricao,
    url,
    inLanguage: HREFLANG[LOCALE_DO_BLOG],
    datePublished: post.meta.publicado,
    dateModified: dataVigente(post.meta),
    keywords: post.meta.tags.join(', '),
    wordCount: palavrasDoPost(post.slug),
    // ISO 8601 de duração — `PT7M`, sete minutos.
    timeRequired: `PT${minutos}M`,
    author: { '@id': `${routeUrl(LOCALE_DO_BLOG, '')}#pessoa` },
    publisher: { '@id': `${routeUrl(LOCALE_DO_BLOG, '')}#pessoa` },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    isPartOf: { '@type': 'Blog', '@id': `${routeUrl(LOCALE_DO_BLOG, '/blog')}#blog` },
  }
}

/** O índice: um `Blog` que aponta para cada `BlogPosting` publicado. */
export function blogJsonLd(posts: Post[]) {
  const url = routeUrl(LOCALE_DO_BLOG, '/blog')

  return {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    '@id': `${url}#blog`,
    name: blogTextos.meta.titulo,
    description: blogTextos.meta.descricao,
    url,
    inLanguage: HREFLANG[LOCALE_DO_BLOG],
    blogPost: posts.map((post) => ({
      '@type': 'BlogPosting',
      '@id': routeUrl(LOCALE_DO_BLOG, `/blog/${post.slug}`),
      headline: post.meta.titulo,
      datePublished: post.meta.publicado,
      dateModified: dataVigente(post.meta),
    })),
  }
}

/** `CreativeWork` do schema.org por case study (spec §7.3). */
export function caseStudyJsonLd(locale: Locale, caseStudy: CaseStudy, slug: SystemSlug) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: caseStudy.name,
    description: caseStudy.tagline,
    url: routeUrl(locale, `/sistemas/${slug}`),
    inLanguage: HREFLANG[locale],
    keywords: caseStudy.stack.join(', '),
    isPartOf: { '@type': 'WebSite', url: SITE_URL },
  }
}
