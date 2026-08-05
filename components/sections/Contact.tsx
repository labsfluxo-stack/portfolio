import type { Dictionary, Locale } from '@/content/types'
import { Section } from '@/components/ui/Section'
import { Reveal } from '@/components/ui/Reveal'
import { ContactForm } from './ContactForm'

const LINK_STYLE = 'text-text underline decoration-border underline-offset-4 hover:decoration-text'

/**
 * Falha fechada, sempre: sem `NEXT_PUBLIC_WEB3FORMS_KEY` (o estado de hoje
 * — o dono ainda não gerou a chave), `ContactForm` NUNCA é montado. Um
 * formulário que aceita a mensagem do visitante e não a envia a lugar
 * nenhum é pior do que não ter formulário: a pessoa acredita que a
 * mensagem chegou e fica esperando uma resposta que nunca vem. No lugar
 * dele, sempre os canais diretos (WhatsApp, e-mail, GitHub) e uma nota
 * explicando (`dict.contact.disabledNote`).
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

  return (
    <Section id="contato" label={contact.label} index="06">
      <Reveal>
        <p className="max-w-2xl text-muted">{contact.lead}</p>
      </Reveal>

      <div className="mt-10 grid gap-12 lg:grid-cols-2">
        <Reveal delayMs={100}>
          <div>
            {accessKey ? (
              <ContactForm dict={dict} web3formsKey={accessKey} />
            ) : (
              <p className="max-w-md text-sm text-muted">{contact.disabledNote}</p>
            )}
          </div>
        </Reveal>

        <Reveal delayMs={200}>
          <ul className="flex flex-col gap-5 font-mono text-sm">
            <li>
              {/* "WhatsApp" é um nome de marca, grafado de forma idêntica nos
               * dois idiomas em todo o resto do dicionário (contact.lead,
               * contact.form.error, contact.disabledNote) — não existe uma
               * chave dedicada para um rótulo curto de link, e inventar uma só
               * para isto violaria a regra de não inventar texto de interface.
               * Tratado aqui como identificador de marca, não como cópia de
               * UI a localizar. */}
              <a href={whatsappHref} target="_blank" rel="noreferrer" className={LINK_STYLE}>
                WhatsApp
              </a>
            </li>
            <li>
              <a href={emailHref} className={LINK_STYLE}>
                {contact.email}
              </a>
            </li>
            <li>
              <a href={contact.github} target="_blank" rel="noreferrer" className={LINK_STYLE}>
                {githubHandle}
              </a>
            </li>
            <li className="pt-2">
              <a
                href={cvHref}
                className="inline-block border border-border px-4 py-2 uppercase tracking-widest text-text hover:bg-surface"
              >
                {contact.cvDownload}
              </a>
            </li>
          </ul>
        </Reveal>
      </div>
    </Section>
  )
}
