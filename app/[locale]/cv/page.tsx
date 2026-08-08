import type { Metadata } from 'next'
import { getDictionary, systems, type Locale } from '@/content'
import { formatNumber } from '@/lib/format'

// Layout de impressão (Task 15): esta rota não tem conteúdo próprio — lê os
// mesmos `content/pt.ts`, `content/en.ts` e `content/systems.ts` do site, só
// recombinados numa ordem e densidade de currículo. Mudar um número no
// dicionário muda no site e aqui ao mesmo tempo, sem chance de divergirem
// (ver "Estado real" do brief da Task 14, que criou o esqueleto mínimo).
//
// Fundo branco / texto preto o tempo todo — NUNCA atrás de `@media print`
// só: a rota inteira só existe para virar PDF (`scripts/generate-cv-pdf.mts`),
// então o estilo de impressão é o único estilo, também na tela. Por isso o
// wrapper mais externo já nasce `bg-white text-black` cobrindo `min-h-dvh`
// inteiro, para nenhuma borda do fundo escuro do resto do site (herdado de
// `body` em app/globals.css) aparecer ao redor do conteúdo em nenhuma
// largura de tela. Vive fora do route group `(site)`, sem Header/Footer/
// grid técnico/cena three.js, pelo mesmo motivo de `app/[locale]/og/[slug]`.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
  const { locale } = await params
  const dict = getDictionary(locale)
  return { title: `${dict.nav.cv} — ${dict.hero.name}`, robots: { index: false, follow: false } }
}

const SECTION_TITLE =
  'break-inside-avoid-page border-b border-black pb-1.5 font-mono text-[13px] font-bold uppercase tracking-[0.16em] text-black'
const BODY_TEXT = 'text-[13px] leading-[1.32] text-black'
const SUB_LABEL = 'font-mono text-[11px] font-bold uppercase tracking-widest text-gray-600'

export default async function CvPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  const dict = getDictionary(locale)
  const { hero, about, systems: systemsDict, stack, contact } = dict

  // Mesma construção de `components/sections/Contact.tsx` — nunca duas
  // fontes de verdade para o link do WhatsApp ou para o handle do GitHub.
  const whatsappHref = `${contact.whatsapp}?text=${encodeURIComponent(contact.whatsappMessage)}`
  const emailHref = `mailto:${contact.email}`
  const githubHandle = contact.github.replace(/^https?:\/\/(www\.)?github\.com\//, '')

  return (
    <div className="min-h-dvh w-full bg-white text-black">
      <main className="mx-auto w-full max-w-[210mm] px-12 py-6 font-sans">
        <header className="border-b-2 border-black pb-3">
          <h1 className="text-[34px] font-bold leading-tight text-black">{hero.name}</h1>
          <p className="mt-1 font-mono text-[13px] uppercase tracking-[0.16em] text-gray-700">{hero.role}</p>
          <p className="mt-2 text-[15px] leading-snug text-gray-800">{hero.tagline}</p>
          <p className="mt-1 text-[12px] text-gray-500">{hero.availability}</p>
        </header>

        {/* Posicionamento — reaproveita o mesmo rótulo e a mesma frase de
         * abertura da seção Sobre do site (`about.label`, `about.lead`),
         * nunca um título inventado para o CV. */}
        <section className="mt-4 break-inside-avoid-page">
          <h2 className={SECTION_TITLE}>{about.label}</h2>
          <p className={`mt-2.5 ${BODY_TEXT}`}>{about.lead}</p>
        </section>

        {/* Os 3 sistemas com seus números — nome, tagline e as métricas de
         * `content/systems.ts` (números crus, `formatNumber(valor, locale)`
         * aqui, nunca `String(valor)`, ou o separador de milhar sai errado
         * em `en`). Sem a prosa de problema/arquitetura/decisões/retro do
         * case study completo — "se estourar, corte a prosa, nunca os
         * números" (brief da Task 15), e aqui é a prosa que sobra. */}
        <section className="mt-4 break-inside-avoid-page">
          <h2 className={SECTION_TITLE}>{systemsDict.label}</h2>
          <div className="mt-2 flex flex-col gap-2">
            {systems.map((system) => {
              const detail = systemsDict.detail[system.slug]
              // Mesmos dois eixos independentes de `SystemCard.tsx`: nunca
              // um único campo de status, um sistema pode não ter nenhum,
              // um, ou os dois rótulos.
              const statusParts = [
                system.production ? systemsDict.statusLabels.production : null,
                system.proprietary ? systemsDict.statusLabels.proprietary : null,
              ].filter((part): part is string => part !== null)

              return (
                <div key={system.slug} className="break-inside-avoid-page">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <p className="text-[14.5px] font-bold text-black">{detail.name}</p>
                    {statusParts.length > 0 ? (
                      <p className="font-mono text-[10.5px] uppercase tracking-widest text-gray-500">
                        {statusParts.join(' · ')}
                      </p>
                    ) : null}
                  </div>
                  <p className="text-[13px] leading-snug text-gray-700">{detail.tagline}</p>
                  <p className="mt-1 font-mono text-[12px] text-black">
                    {system.metrics
                      .map((metric) => `${formatNumber(metric.value, locale)} ${systemsDict.metricLabels[metric.key]}`)
                      .join(' · ')}
                  </p>
                </div>
              )
            })}
          </div>
        </section>

        {/* Stack por camada — mesma ordem de `dict.stack.layers` (software
         * primeiro, redes por último), só nomes por camada, sem o detalhe de
         * nível/origem do site: aqui o espaço é escasso e a ordem já carrega
         * a hierarquia (backend → dados → IA → SEO/GEO → front → qualidade →
         * redes). */}
        <section className="mt-4 break-inside-avoid-page">
          <h2 className={SECTION_TITLE}>{stack.label}</h2>
          <div className="mt-2 flex flex-col gap-1">
            {stack.layers.map((layer) => (
              <p key={layer.label} className={BODY_TEXT}>
                <span className="font-bold">{layer.label}:</span>{' '}
                {layer.items.map((item) => item.name).join(', ')}
              </p>
            ))}
          </div>
        </section>

        {/* A base de infraestrutura com os três vendors. Vem DEPOIS dos
         * sistemas e do stack, nunca antes: num currículo de software, o que
         * responde "o que essa pessoa entrega?" são os sistemas construídos,
         * e a década de rede é o que explica por que eles se sustentam. Este
         * bloco já foi a segunda seção do CV, logo abaixo do posicionamento,
         * e nessa posição o documento inteiro se lia como currículo de
         * infraestrutura (ver content/pt.ts, about.experience). */}
        <section className="mt-4 break-inside-avoid-page">
          <h2 className={SECTION_TITLE}>{about.experience.label}</h2>
          <p className="mt-2.5 text-[15px] font-bold text-black">{about.experience.years}</p>
          <p className={`mt-1.5 ${BODY_TEXT}`}>{about.experience.body}</p>
          <ul className="mt-2.5 flex flex-wrap gap-x-6 gap-y-1">
            {about.experience.vendors.map((vendor) => (
              <li key={vendor} className="font-mono text-[12.5px] font-bold uppercase tracking-widest text-black">
                {vendor}
              </li>
            ))}
          </ul>
        </section>

        {/* Formação em três blocos com rótulos não intercambiáveis: os CS50
         * vivem só sob `certifications`, e `degree` não carrega nenhum
         * rótulo nem palavra de status — o curso está pausado e nenhuma
         * afirmação de status pode aparecer em superfície nenhuma (mesma
         * regra de `components/sections/About.tsx` e `lib/jsonld.ts`). */}
        {/* Lista corrida, sem os três sub-rótulos (Técnico / Graduação /
         * Certificações) — mesma decisão de components/sections/About.tsx,
         * onde está o comentário longo: cada item se descreve sozinho e a
         * atribuição da HarvardX nomeia "CS50" para não parecer que cobre o
         * técnico e a graduação também.
         *
         * A diferença para o site é deliberada e é a mesma de sempre entre
         * os dois meios: aqui vai o NOME OFICIAL INTEIRO de cada CS50, não o
         * código curto. No site o nome completo estouraria a etiqueta; num
         * currículo em PDF há espaço e a leitura é atenta, e "Introduction
         * to Artificial Intelligence with Python" é justamente o que prova a
         * formação em IA. */}
        <section className="mt-4 break-inside-avoid-page">
          <h2 className={SECTION_TITLE}>{about.education.label}</h2>
          <ul className="mt-2 flex flex-col gap-0.5">
            {[
              ...about.education.technical.items,
              ...about.education.degree.items,
              ...about.education.certifications.items,
            ].map((item) => (
              <li key={item} className={BODY_TEXT}>
                {item}
              </li>
            ))}
          </ul>
          {/* `SUB_LABEL` puro: um `normal-case` acrescentado aqui não venceria
           * o `uppercase` que ele já traz — mesma especificidade, e quem
           * decide é a ordem no CSS gerado, não a ordem na string. Em caixa
           * alta a linha fica igual aos outros rótulos pequenos do CV, que é
           * o resultado desejado de qualquer forma. */}
          <p className={`mt-1.5 ${SUB_LABEL}`}>CS50 · {about.education.certifications.institution}</p>
        </section>

        {/* Contatos — sem LinkedIn: a chave não existe em `Dictionary` (o
         * dono ainda não forneceu a URL, ver content/types.ts) e não é
         * inventada nem deixada como espaço vazio aqui. "WhatsApp" e
         * "GitHub" são nomes de marca hardcoded, não cópia de UI a
         * localizar — mesma convenção e mesmo comentário de
         * `components/sections/Contact.tsx`. */}
        <section className="mt-4 break-inside-avoid-page">
          <h2 className={SECTION_TITLE}>{contact.label}</h2>
          <p className="mt-2 flex flex-wrap gap-x-6 gap-y-1.5 text-[13px] text-black">
            <a href={emailHref} className="underline">
              {contact.email}
            </a>
            <a href={whatsappHref} target="_blank" rel="noreferrer" className="underline">
              WhatsApp
            </a>
            <a href={contact.github} target="_blank" rel="noreferrer" className="underline">
              GitHub: {githubHandle}
            </a>
          </p>
        </section>
      </main>
    </div>
  )
}
