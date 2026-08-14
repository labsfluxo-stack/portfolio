import Link from 'next/link'
import type { Dictionary, Locale } from '@/content/types'
import { Section } from '@/components/ui/Section'
import { Reveal } from '@/components/ui/Reveal'
import { ContactForm } from './ContactForm'

/**
 * `https://wa.me/5583986226441` → `+55 83 98622-6441`.
 *
 * Os quatro últimos dígitos são sempre o sufixo; o que sobra entre o DDD e
 * eles é o prefixo, e isso serve tanto para celular de 9 dígitos quanto para
 * fixo de 8. Devolve os dígitos crus se a URL não tiver o formato esperado —
 * mostrar algo estranho é melhor que quebrar a seção de contato inteira.
 */
function formatBrazilianMobile(waUrl: string): string {
  const digits = waUrl.replace(/\D/g, '')
  if (digits.length < 12) return digits
  const country = digits.slice(0, 2)
  const area = digits.slice(2, 4)
  const rest = digits.slice(4)
  return `+${country} ${area} ${rest.slice(0, -4)}-${rest.slice(-4)}`
}

/**
 * Falha fechada, sempre: sem `NEXT_PUBLIC_WEB3FORMS_KEY` (o estado de hoje
 * — o dono ainda não gerou a chave), `ContactForm` NUNCA é montado. Um
 * formulário que aceita a mensagem do visitante e não a envia a lugar
 * nenhum é pior do que não ter formulário: a pessoa acredita que a
 * mensagem chegou e fica esperando uma resposta que nunca vem. No lugar
 * dele ficam os três canais diretos — nunca um aviso de que o formulário
 * está fora do ar, e nunca um bloco de instruções para tapar o espaço que
 * ele deixou (ver o comentário em content/pt.ts, acima de
 * `contact.channels`).
 *
 * LinkedIn não existe em `dict.contact` de propósito (ver comentário em
 * content/types.ts) — o dono ainda não forneceu a URL. Não é inventado
 * aqui, nem substituído por um espaço vazio.
 */
export function Contact({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const { contact } = dict
  const accessKey = process.env.NEXT_PUBLIC_WEB3FORMS_KEY
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '/portfolio'

  const whatsappHref = `${contact.whatsapp}?text=${encodeURIComponent(contact.whatsappMessage)}`
  const emailHref = `mailto:${contact.email}`
  // O arquivo nasce na Task 15 — o link é scaffolding esperado (spec §5.4).
  const cvHref = `${basePath}/cv/neto-alves-${locale}.pdf`
  // O handle já está inteiro em `contact.github` (URL completa); extraído
  // só para exibição — nunca reescrito à mão, o valor em si vem do dicionário.
  const githubHandle = contact.github.replace(/^https?:\/\/(www\.)?github\.com\//, '')
  // Mesmo princípio para o telefone: derivado da URL do wa.me, nunca digitado
  // à parte. Um segundo campo com o número formatado poderia divergir do link
  // sem nada acusar, e o visitante ligaria para um número e escreveria para
  // outro. Formato brasileiro de celular, que é o único caso que existe aqui.
  const whatsappNumber = formatBrazilianMobile(contact.whatsapp)

  return (
    <Section id="contato" label={contact.label} index="05">
      <Reveal>
        <p className="max-w-2xl text-muted">{contact.lead}</p>
      </Reveal>

      {/* O formulário, quando existe, empilha ACIMA dos canais em vez de
       * dividir a seção em duas colunas. O layout de duas colunas exigia
       * conteúdo para a coluna da esquerda quando não há formulário — e foi
       * essa exigência que produziu, uma vez, um bloco de "o que mandar
       * junto" que instruía o visitante e pré-anunciava recusa (ver o
       * comentário em content/pt.ts). Empilhado, o estado sem formulário não
       * deixa buraco nenhum e não pede texto para tapar. */}
      {accessKey ? (
        <Reveal delayMs={100}>
          <div className="mt-10 max-w-xl">
            <ContactForm dict={dict} web3formsKey={accessKey} />
          </div>
        </Reveal>
      ) : null}

      <Reveal delayMs={accessKey ? 200 : 100}>
        {/* Cada canal num cartão que diz PARA QUE ELE SERVE. Antes eram três
         * links soltos numa lista, e "netoguild-rgb" sozinho não dizia
         * sequer que era GitHub. O cartão inteiro é a área de clique, não só
         * o texto — alvo generoso no celular.
         *
         * "WhatsApp" e "GitHub" são nomes de marca, grafados igual nos dois
         * idiomas em todo o dicionário: ficam no componente, como
         * identificador, nunca como cópia de interface a traduzir. O que é
         * prosa (para que serve cada um) vem de `contact.channels`. */}
        <ul className="mt-10 grid gap-4 sm:grid-cols-3">
          {(
            [
              { key: 'whatsapp', brand: 'WhatsApp', value: whatsappNumber, href: whatsappHref, external: true },
              { key: 'email', brand: 'E-mail', value: contact.email, href: emailHref, external: false },
              { key: 'github', brand: 'GitHub', value: githubHandle, href: contact.github, external: true },
            ] as const
          ).map((channel) => (
            <li key={channel.key} className="grid">
              <a
                href={channel.href}
                {...(channel.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                className="group flex flex-col gap-1 border border-border bg-surface px-5 py-5 transition-colors duration-300 hover:border-faint hover:bg-surface-2"
              >
                <span className="font-mono text-[11px] uppercase tracking-widest text-muted">
                  {channel.brand}
                </span>
                <span className="break-all font-mono text-sm text-text underline decoration-border underline-offset-4 group-hover:decoration-text">
                  {channel.value}
                </span>
                <span className="mt-auto pt-2 font-mono text-[10px] leading-relaxed text-muted">
                  {contact.channels[channel.key]}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </Reveal>

      <Reveal delayMs={accessKey ? 300 : 200}>
        <a
          href={cvHref}
          download
          className="mt-8 inline-block border border-border px-5 py-3 font-mono text-sm uppercase tracking-widest text-text transition-colors duration-300 hover:bg-surface"
        >
          {contact.cvDownload}
        </a>
      </Reveal>

      <Reveal delayMs={accessKey ? 400 : 300}>
        {/* Única ponte do portfólio para a landing de captação
         * (/${locale}/projetos) — de propósito fora do menu (ver o
         * comentário em `contact.landingLink`, content/types.ts): o menu é
         * onde as duas audiências se cruzariam, recrutador e dono de
         * empresa. `Link` do Next, não `<a>` com `basePath` escrito à mão —
         * `Link` já prefixa `basePath` sozinho, um prefixo manual aqui
         * dobraria o caminho. Mesma decoração de sublinhado que o resto do
         * site usa para link discreto (ver Footer.tsx e o "voltar" em
         * CaseStudy.tsx), não o cartão nem o botão que já existem acima. */}
        <Link
          prefetch={false}
          href={`/${locale}/projetos`}
          className="mt-8 inline-block max-w-xl text-sm text-muted underline decoration-border underline-offset-4 hover:text-text hover:decoration-text"
        >
          {contact.landingLink}
        </Link>
      </Reveal>
    </Section>
  )
}
