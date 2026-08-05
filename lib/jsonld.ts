import type { CaseStudy, Dictionary, Locale, SystemSlug } from '@/content/types'
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
