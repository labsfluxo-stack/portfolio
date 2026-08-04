'use client'
import { useState, type SubmitEvent } from 'react'
import type { Dictionary } from '@/content/types'

const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit'

type Status = 'idle' | 'sending' | 'success' | 'error'

/**
 * Só é montado quando `NEXT_PUBLIC_WEB3FORMS_KEY` existe — a decisão de
 * falha fechada mora em `Contact.tsx`, que decide se este componente sequer
 * é renderizado. Aqui dentro a chave já está garantida.
 *
 * Honeypot: um `<input>` que nenhum humano vê nem alcança por Tab
 * (`tabIndex={-1}`, escondido visualmente, `aria-hidden` no contêiner) mas
 * que um bot simples — que preenche todo `<input>` do formulário sem olhar
 * — preenche. Se vier preenchido, o envio aborta ANTES de qualquer `fetch`,
 * e o estado que segue é `success`, nunca `error`: um bot que recebe erro
 * tenta de novo; um que recebe sucesso vai embora. `honeypotLabel` existe
 * só para o `<label htmlFor>` associado ao campo (acessibilidade de
 * formulário) — nunca é lido por um visitante de verdade.
 */
export function ContactForm({ dict, web3formsKey }: { dict: Dictionary; web3formsKey: string }) {
  const { form } = dict.contact
  const [status, setStatus] = useState<Status>('idle')

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const formEl = event.currentTarget
    const data = new FormData(formEl)

    if (String(data.get('_honeypot') ?? '').length > 0) {
      setStatus('success')
      return
    }
    data.delete('_honeypot')
    data.set('access_key', web3formsKey)

    setStatus('sending')
    try {
      const response = await fetch(WEB3FORMS_ENDPOINT, { method: 'POST', body: data })
      if (!response.ok) throw new Error('web3forms respondeu com erro')
      setStatus('success')
      formEl.reset()
    } catch {
      setStatus('error')
    }
  }

  // `idle` não tem chave de dicionário própria: nada aconteceu ainda, não há
  // o que anunciar. As outras três frases são as únicas visíveis — cada uma
  // vem de `dict.contact.form`, nunca inventada.
  const statusMessage =
    status === 'sending' ? form.sending : status === 'success' ? form.success : status === 'error' ? form.error : ''

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="contact-name" className="font-mono text-[11px] uppercase tracking-widest text-muted">
          {form.name}
        </label>
        <input
          id="contact-name"
          name="name"
          type="text"
          required
          className="border border-border bg-surface px-3 py-2 text-text outline-none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="contact-email" className="font-mono text-[11px] uppercase tracking-widest text-muted">
          {form.email}
        </label>
        <input
          id="contact-email"
          name="email"
          type="email"
          required
          className="border border-border bg-surface px-3 py-2 text-text outline-none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="contact-message" className="font-mono text-[11px] uppercase tracking-widest text-muted">
          {form.message}
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={5}
          className="resize-y border border-border bg-surface px-3 py-2 text-text outline-none"
        />
      </div>

      {/* Honeypot: fora do fluxo visual (posicionado fora da tela, 1x1px,
       * overflow escondido) e fora da árvore de acessibilidade
       * (`aria-hidden` no contêiner). `tabIndex={-1}` no campo garante que
       * nem a navegação por teclado alcança o `<input>`, mesmo que o
       * `aria-hidden` do contêiner já bastasse para leitor de tela. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="contact-honeypot">{form.honeypotLabel}</label>
        <input id="contact-honeypot" name="_honeypot" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <button
        type="submit"
        disabled={status === 'sending'}
        className="border border-border px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-text hover:bg-surface disabled:pointer-events-none disabled:opacity-50"
      >
        {status === 'sending' ? form.sending : form.submit}
      </button>

      <p role="status" aria-live="polite" className="min-h-[1.5em] font-mono text-[12px] text-muted">
        {statusMessage}
      </p>
    </form>
  )
}
