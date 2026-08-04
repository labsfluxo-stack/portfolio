import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Contact } from '@/components/sections/Contact'
import { ContactForm } from '@/components/sections/ContactForm'
import { pt } from '@/content/pt'
import { en } from '@/content/en'

describe('Contact — degradação sem chave (falha fechada)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('sem chave configurada, não renderiza formulário e oferece os canais diretos', () => {
    vi.stubEnv('NEXT_PUBLIC_WEB3FORMS_KEY', '')
    render(<Contact dict={pt} locale="pt" />)
    expect(screen.queryByRole('button', { name: pt.contact.form.submit })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /whatsapp/i })).toHaveAttribute(
      'href',
      expect.stringContaining('wa.me/5583986226441'),
    )
  })

  it('sem chave, mostra a nota explicando por que o formulário está indisponível', () => {
    vi.stubEnv('NEXT_PUBLIC_WEB3FORMS_KEY', '')
    render(<Contact dict={pt} locale="pt" />)
    expect(screen.getByText(pt.contact.disabledNote)).toBeInTheDocument()
  })

  it('sem chave, o link de e-mail usa mailto: com o endereço do dicionário, nunca escrito à mão', () => {
    vi.stubEnv('NEXT_PUBLIC_WEB3FORMS_KEY', '')
    render(<Contact dict={pt} locale="pt" />)
    expect(screen.getByRole('link', { name: pt.contact.email })).toHaveAttribute(
      'href',
      `mailto:${pt.contact.email}`,
    )
  })

  it('sem chave, o link do GitHub aponta para dict.contact.github', () => {
    vi.stubEnv('NEXT_PUBLIC_WEB3FORMS_KEY', '')
    render(<Contact dict={pt} locale="pt" />)
    const link = screen.getByRole('link', { name: /netoguild-rgb/i })
    expect(link).toHaveAttribute('href', pt.contact.github)
  })
})

describe('Contact — com chave configurada', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('com chave, renderiza o formulário e não mostra a nota de indisponibilidade', () => {
    vi.stubEnv('NEXT_PUBLIC_WEB3FORMS_KEY', 'chave-de-teste')
    render(<Contact dict={pt} locale="pt" />)
    expect(screen.getByRole('button', { name: pt.contact.form.submit })).toBeInTheDocument()
    expect(screen.queryByText(pt.contact.disabledNote)).not.toBeInTheDocument()
  })
})

describe('Contact — link do CV', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('aponta para ${basePath}/cv/neto-alves-${locale}.pdf, por locale', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '/portfolio')
    const { rerender } = render(<Contact dict={pt} locale="pt" />)
    expect(screen.getByRole('link', { name: pt.contact.cvDownload })).toHaveAttribute(
      'href',
      '/portfolio/cv/neto-alves-pt.pdf',
    )

    rerender(<Contact dict={en} locale="en" />)
    expect(screen.getByRole('link', { name: en.contact.cvDownload })).toHaveAttribute(
      'href',
      '/portfolio/cv/neto-alves-en.pdf',
    )
  })
})

describe('ContactForm', () => {
  const accessKey = 'chave-de-teste'

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  function fillRequiredFields() {
    fireEvent.change(screen.getByLabelText(pt.contact.form.name), { target: { value: 'Visitante' } })
    fireEvent.change(screen.getByLabelText(pt.contact.form.email), {
      target: { value: 'visitante@example.com' },
    })
    fireEvent.change(screen.getByLabelText(pt.contact.form.message), {
      target: { value: 'Olá, quero conversar.' },
    })
  }

  it('honeypot escondido tem tabIndex={-1} e vive num contêiner aria-hidden', () => {
    render(<ContactForm dict={pt} web3formsKey={accessKey} />)
    const honeypot = screen.getByLabelText(pt.contact.form.honeypotLabel, { selector: 'input' })
    expect(honeypot).toHaveAttribute('tabindex', '-1')
    expect(honeypot.closest('[aria-hidden="true"]')).toBeTruthy()
  })

  it('honeypot preenchido aborta o envio silenciosamente: fetch nunca é chamado, e o estado é success, nunca error', async () => {
    render(<ContactForm dict={pt} web3formsKey={accessKey} />)
    fillRequiredFields()
    fireEvent.change(screen.getByLabelText(pt.contact.form.honeypotLabel, { selector: 'input' }), {
      target: { value: 'sou um robô' },
    })

    fireEvent.click(screen.getByRole('button', { name: pt.contact.form.submit }))

    await waitFor(() => {
      expect(within(screen.getByRole('status')).getByText(pt.contact.form.success)).toBeInTheDocument()
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('envio de verdade faz POST para o Web3Forms com o access_key do env, nunca escrito no código', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 200 }))
    render(<ContactForm dict={pt} web3formsKey={accessKey} />)
    fillRequiredFields()

    fireEvent.click(screen.getByRole('button', { name: pt.contact.form.submit }))

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    const call = vi.mocked(fetch).mock.calls[0]
    if (!call) throw new Error('fetch não foi chamado')
    const [url, init] = call
    expect(url).toBe('https://api.web3forms.com/submit')
    expect(init?.method).toBe('POST')
    const body = init?.body as FormData
    expect(body.get('access_key')).toBe(accessKey)
    expect(body.get('name')).toBe('Visitante')
    // O honeypot vazio não viaja no payload de um envio legítimo.
    expect(body.has('_honeypot')).toBe(false)
  })

  it('estado sending mostra a mensagem de dict.contact.form.sending e desabilita o botão enquanto pendente', async () => {
    let resolveFetch!: (value: Response) => void
    vi.mocked(fetch).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFetch = resolve
      }),
    )
    render(<ContactForm dict={pt} web3formsKey={accessKey} />)
    fillRequiredFields()

    fireEvent.click(screen.getByRole('button', { name: pt.contact.form.submit }))

    await waitFor(() => {
      expect(within(screen.getByRole('status')).getByText(pt.contact.form.sending)).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: pt.contact.form.sending })).toBeDisabled()

    resolveFetch(new Response(null, { status: 200 }))
    await waitFor(() => {
      expect(within(screen.getByRole('status')).getByText(pt.contact.form.success)).toBeInTheDocument()
    })
  })

  it('erro de rede leva ao estado error com mensagem legível, nunca a uma promessa pendente para sempre', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('falha de rede'))
    render(<ContactForm dict={pt} web3formsKey={accessKey} />)
    fillRequiredFields()

    fireEvent.click(screen.getByRole('button', { name: pt.contact.form.submit }))

    await waitFor(() => {
      expect(within(screen.getByRole('status')).getByText(pt.contact.form.error)).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: pt.contact.form.submit })).not.toBeDisabled()
  })

  it('resposta HTTP não-OK também leva ao estado error, não a success', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 500 }))
    render(<ContactForm dict={pt} web3formsKey={accessKey} />)
    fillRequiredFields()

    fireEvent.click(screen.getByRole('button', { name: pt.contact.form.submit }))

    await waitFor(() => {
      expect(within(screen.getByRole('status')).getByText(pt.contact.form.error)).toBeInTheDocument()
    })
  })

  it('região de status é aria-live polite', () => {
    render(<ContactForm dict={pt} web3formsKey={accessKey} />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
  })
})

describe('LinkedIn — ausência proposital', () => {
  it('não existe chave linkedin em dict.contact, nos dois idiomas', () => {
    expect('linkedin' in pt.contact).toBe(false)
    expect('linkedin' in en.contact).toBe(false)
  })
})
