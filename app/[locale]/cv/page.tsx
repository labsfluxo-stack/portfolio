import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { Metadata } from 'next'
import { getDictionary, systems, type Locale } from '@/content'
import { formatNumber } from '@/lib/format'

// Layout de impressão: esta rota não tem conteúdo próprio — lê os mesmos
// `content/pt.ts`, `content/en.ts` e `content/systems.ts` do site, só
// recombinados numa ordem e densidade de currículo. Mudar um número no
// dicionário muda no site e aqui ao mesmo tempo, sem chance de divergirem.
//
// FUNDO CLARO, MAS A MESMA LINGUAGEM DO SITE. O dono disse que o CV "não
// parece o design do site", e estava certo: era preto sobre branco sem
// nenhum traço do sistema visual. O que ele NÃO pode virar é um PDF de fundo
// escuro — o arquivo existe para ser impresso e encaminhado, e recrutador
// que imprime um PDF preto gasta cartucho e recebe uma folha suja.
//
// A saída é trazer o SISTEMA, não a cor: numeração de seção (01, 02...) como
// no site, o mesmo par tipográfico (mono para rótulo, sans para conteúdo), a
// mesma disciplina de hierarquia por tamanho e não por cor, e o azul de dado
// num tom que sobrevive à impressão. Fundo branco o tempo todo, nunca atrás
// de `@media print`: o estilo de impressão é o único estilo, também na tela.
//
// Vive fora do route group `(site)`, sem Header/Footer/grid/cena, pelo mesmo
// motivo de `app/[locale]/og/[slug]`.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
  const { locale } = await params
  const dict = getDictionary(locale)
  return { title: `${dict.nav.cv} — ${dict.hero.name}`, robots: { index: false, follow: false } }
}

/** O azul de dado do site (`--color-data`, #38BDF8) tem contraste baixo
 *  demais sobre branco — em papel ele quase some. Este é o mesmo matiz,
 *  escurecido até passar em texto pequeno impresso. */
const ACCENT = '#0369A1'

const RULE = 'border-b border-black/85'
const LABEL = 'font-mono text-[10px] font-bold uppercase tracking-[0.18em]'
const BODY = 'text-[12.5px] leading-[1.45] text-neutral-800'
const MICRO = 'font-mono text-[9.5px] uppercase tracking-[0.14em] text-neutral-500'

/** Cabeçalho de seção com o numeral do site. O numeral é decorativo e
 *  `aria-hidden`, igual ao primitivo `Section` — nunca vira texto lido. */
function SectionTitle({ index, children }: { index: string; children: string }) {
  return (
    <h2 className={`break-inside-avoid-page ${RULE} flex items-baseline gap-2.5 pb-1 ${LABEL} text-black`}>
      <span aria-hidden="true" style={{ color: ACCENT }}>
        {index}
      </span>
      {children}
    </h2>
  )
}

export default async function CvPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  const dict = getDictionary(locale)
  const { hero, about, telemetry, systems: systemsDict, stack, contact } = dict

  // Mesma construção de `components/sections/Contact.tsx` — nunca duas fontes
  // de verdade para o link do WhatsApp ou para o handle do GitHub.
  const whatsappHref = `${contact.whatsapp}?text=${encodeURIComponent(contact.whatsappMessage)}`
  const githubHandle = contact.github.replace(/^https?:\/\/(www\.)?github\.com\//, '')
  const phone = contact.whatsapp.replace(/\D/g, '').replace(/^(\d{2})(\d{2})(\d+)(\d{4})$/, '+$1 $2 $3-$4')

  // A FOTO ENTRA SOZINHA QUANDO O ARQUIVO EXISTIR. Rota estática, então esta
  // checagem roda no build: basta o dono largar `public/foto/neto.jpg` e o
  // próximo `npm run generate:cv` sai com retrato, sem tocar em código.
  //
  // E ela é condicional de propósito: o site pode exibir "foto a ser
  // adicionada" porque é uma página viva e o aviso é honesto ali. Num PDF
  // enviado para recrutador, um placeholder dizendo que falta algo é pior do
  // que retrato nenhum — parece descuido, não obra em andamento.
  const photo = ['neto.jpg', 'neto.jpeg', 'neto.png', 'neto.webp']
    .map((file) => ({ file, path: join(process.cwd(), 'public', 'foto', file) }))
    .find(({ path }) => existsSync(path))
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '/portfolio'

  return (
    <div className="min-h-dvh w-full bg-white text-black">
      {/* O BRANCO PRECISA ALCANÇAR O `body`, e não só esta `div`.
       *
       * `body` carrega `background: var(--color-bg)` de app/globals.css — quase
       * preto — e `page.pdf()` roda com `printBackground: true`. O conteúdo do
       * currículo dá ~1575px, duas folhas A4 dão ~2246px, e os ~670px de papel
       * que sobram na última página não são cobertos por esta `div`: eles
       * mostravam o fundo escuro do site. O PDF saía com uma tarja preta
       * enorme no fim, e foi assim que o dono a viu.
       *
       * `html body` em vez de só `body` para vencer por especificidade
       * (0,0,2 contra 0,0,1), sem depender da ordem em que o Next resolve
       * inserir esta regra nem de `!important`. */}
      <style>{'html body{background:#ffffff}'}</style>
      <main className="mx-auto w-full max-w-[210mm] px-11 py-8 font-sans">
        {/* CONTATO NO TOPO, junto do nome. Estava no rodapé, e num currículo
         * isso é atrito: quem decide chamar já leu o suficiente no primeiro
         * terço e não deveria caçar o e-mail no fim da segunda página. */}
        <header className={`${RULE} flex items-start justify-between gap-8 pb-4`}>
          <div className="min-w-0">
            <h1 className="text-[36px] font-bold leading-[1.05] tracking-tight text-black">{hero.name}</h1>
            <p className="mt-1.5 font-mono text-[12px] uppercase tracking-[0.18em]" style={{ color: ACCENT }}>
              {hero.role}
            </p>
            <p className="mt-3 max-w-[125mm] text-[14px] leading-snug text-neutral-800">{hero.tagline}</p>

            <p className="mt-3.5 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-neutral-700">
              <a href={`mailto:${contact.email}`}>{contact.email}</a>
              <a href={whatsappHref}>{phone}</a>
              <a href={contact.github}>github.com/{githubHandle}</a>
            </p>
            <p className={`mt-2 ${MICRO}`}>{hero.availability}</p>
          </div>

          {photo ? (
            <img
              src={`${basePath}/foto/${photo.file}`}
              alt={about.photoAlt}
              className="h-[34mm] w-[27mm] shrink-0 border border-black/20 object-cover"
            />
          ) : null}
        </header>

        {/* SOBRE — antes trazia SÓ o `lead`, uma frase, e era a maior causa do
         * "mal fala sobre" que o dono apontou. Os três parágrafos do site
         * entram inteiros: é neles que estão o alcance full-stack, a origem em
         * infraestrutura e a camada de medição. */}
        <section className="mt-5 break-inside-avoid-page">
          <SectionTitle index="01">{about.label}</SectionTitle>
          <p className="mt-2.5 text-[14px] font-semibold leading-snug text-black">{about.lead}</p>
          <div className="mt-2 flex flex-col gap-1.5">
            {about.body.map((paragraph, i) => (
              <p key={i} className={BODY}>
                {paragraph}
              </p>
            ))}
          </div>
        </section>

        {/* NÚMEROS — a Telemetria inteira NÃO EXISTIA no currículo. Um CV de
         * arquiteto sem os números somados perde justamente o que separa a
         * afirmação da prova, e é a seção mais rápida de ler que existe. */}
        <section className="mt-5 break-inside-avoid-page">
          <SectionTitle index="02">{telemetry.label}</SectionTitle>
          <div className="mt-2.5 grid grid-cols-4 gap-x-5">
            {telemetry.metrics.map((metric) => (
              <div key={metric.key}>
                <p className="font-sans text-[21px] font-bold leading-none tabular-nums text-black">{metric.value}</p>
                <p className={`mt-1 ${MICRO}`}>{metric.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 font-mono text-[10.5px] text-neutral-700">
            {telemetry.secondary.map((item) => `${item.value} ${item.label.toLowerCase()}`).join('  ·  ')}
          </p>
          <p className={`mt-1.5 ${MICRO}`}>{telemetry.provenanceNote}</p>
        </section>

        {/* SISTEMAS — ganhou o que o site ganhou e o CV não tinha: time,
         * prazo e as três melhorias que cada um trouxe. Números crus passam
         * por `formatNumber(valor, locale)`, nunca `String(valor)`, ou o
         * separador de milhar sai errado em `en`. */}
        <section className="mt-5">
          <SectionTitle index="03">{systemsDict.label}</SectionTitle>
          <div className="mt-2.5 flex flex-col gap-3.5">
            {systems.map((system) => {
              const detail = systemsDict.detail[system.slug]
              // Mesmos dois eixos independentes de `SystemCard.tsx`: nunca um
              // único campo de status, um sistema pode não ter nenhum, um, ou
              // os dois rótulos.
              const status = [
                system.production ? systemsDict.statusLabels.production : null,
                system.proprietary ? systemsDict.statusLabels.proprietary : null,
              ].filter((part): part is string => part !== null)

              const facts = [
                detail.team,
                detail.duration,
                ...system.metrics.map(
                  (m) => `${formatNumber(m.value, locale)} ${systemsDict.metricLabels[m.key] ?? m.key}`,
                ),
              ]

              return (
                <div key={system.slug} className="break-inside-avoid-page">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <p className="text-[14px] font-bold text-black">{detail.name}</p>
                    {status.length > 0 ? <p className={MICRO}>{status.join(' · ')}</p> : null}
                  </div>
                  <p className="mt-0.5 text-[12.5px] leading-snug text-neutral-700">{detail.tagline}</p>
                  <p className="mt-1 font-mono text-[10px] text-neutral-600">{facts.join('  ·  ')}</p>
                  <ul className="mt-1.5 flex flex-col gap-0.5">
                    {detail.improvements.map((item) => (
                      <li key={item} className="flex gap-2 text-[12px] leading-snug text-neutral-800">
                        <span aria-hidden="true" className="mt-[0.42rem] size-[3px] shrink-0" style={{ background: ACCENT }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </section>

        {/* STACK por camada — mesma ordem de `dict.stack.layers` (software
         * primeiro, redes por último), só nomes, sem o detalhe de nível do
         * site: aqui o espaço é escasso e a ordem já carrega a hierarquia. */}
        <section className="mt-5 break-inside-avoid-page">
          <SectionTitle index="04">{stack.label}</SectionTitle>
          <div className="mt-2 flex flex-col gap-1">
            {stack.layers.map((layer) => (
              <p key={layer.label} className="text-[12px] leading-snug text-neutral-800">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-black">
                  {layer.label}
                </span>{' '}
                {layer.items.map((item) => item.name).join(' · ')}
              </p>
            ))}
          </div>
        </section>

        {/* A base de infraestrutura com os três vendors. Vem DEPOIS dos
         * sistemas e do stack, nunca antes: num currículo de software, o que
         * responde "o que essa pessoa entrega?" são os sistemas construídos, e
         * a década de rede é o que explica por que eles se sustentam. */}
        <section className="mt-5 break-inside-avoid-page">
          <SectionTitle index="05">{about.experience.label}</SectionTitle>
          <p className="mt-2 text-[13px] font-bold text-black">{about.experience.years}</p>
          <p className={`mt-1 ${BODY}`}>{about.experience.body}</p>
          <p className="mt-1.5 font-mono text-[10.5px] font-bold uppercase tracking-widest text-black">
            {about.experience.vendors.join('  ·  ')}
          </p>
        </section>

        {/* Lista corrida, sem os sub-rótulos (Técnico / Graduação /
         * Certificações) — mesma decisão de components/sections/About.tsx.
         * Aqui vai o NOME OFICIAL INTEIRO de cada CS50: no site ele estouraria
         * a etiqueta, e num PDF há espaço e a leitura é atenta. */}
        <section className="mt-5 break-inside-avoid-page">
          <SectionTitle index="06">{about.education.label}</SectionTitle>
          <ul className="mt-2 flex flex-col gap-0.5">
            {[
              ...about.education.technical.items,
              ...about.education.degree.items,
              ...about.education.certifications.items,
            ].map((item) => (
              <li key={item} className="text-[12px] leading-snug text-neutral-800">
                {item}
              </li>
            ))}
          </ul>
          <p className={`mt-1.5 ${MICRO}`}>CS50 · {about.education.certifications.institution}</p>
        </section>
      </main>
    </div>
  )
}
