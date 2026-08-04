import type { CaseStudy, Dictionary, Locale, SystemSlug } from '@/content/types'
import { HREFLANG, SITE_URL, routeUrl } from './seo'

/**
 * `about.education.degree.items[0]` é sempre `"<curso> — <instituição>"`
 * (content/pt.ts e content/en.ts, ex.: `"Análise de Dados — Estácio"`).
 * Extrai só o nome da instituição para o `alumniOf` — nunca o hardcode
 * "Estácio": o curso está pausado e nenhuma afirmação de status pode
 * aparecer em superfície nenhuma, então o valor sai só do dicionário.
 */
function institutionFromDegreeItem(item: string | undefined): string {
  if (!item) throw new Error('lib/jsonld: dict.about.education.degree.items está vazio')
  const parts = item.split('—')
  return (parts.at(-1) ?? item).trim()
}

/**
 * `Person` do schema.org para a home (spec §7.3). `knowsAbout` reaproveita
 * as camadas de `dict.stack` por inteiro — inclui as marcas de rede (Cisco,
 * MikroTik, Furukawa) porque elas já vivem na camada "Redes &
 * Infraestrutura" do mesmo dicionário, não uma lista separada.
 *
 * `alumniOf` cobre HarvardX e Estácio sem nenhum campo de status: o curso
 * da Estácio está pausado, e schema.org não tem uma propriedade de
 * "andamento" em `EducationalOrganization` para começo de conversa — a
 * omissão é o comportamento certo, não um descuido.
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

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: dict.hero.name,
    jobTitle: dict.hero.role,
    description: dict.meta.description,
    url: routeUrl(locale, ''),
    inLanguage: HREFLANG[locale],
    knowsAbout,
    alumniOf: [
      { '@type': 'EducationalOrganization', name: dict.about.education.certifications.institution },
      { '@type': 'EducationalOrganization', name: institutionFromDegreeItem(dict.about.education.degree.items[0]) },
    ],
    sameAs: [dict.contact.github],
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
