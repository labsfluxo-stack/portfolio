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

  // A seção já teve DOIS textos errados no lugar do formulário, e esta trava
  // cobre os dois:
  //
  //   1. um aviso de "formulário indisponível no momento" — desculpa por
  //      algo que o visitante nem sabia que existia;
  //   2. um bloco de "o que ajuda vir junto" que instruía a pessoa sobre o
  //      que enviar e terminava em "respondo dizendo o que dá para fazer e o
  //      que não dá" — um portão, e quem procura vaga não impõe requisito a
  //      quem contrata.
  //
  // Os dois nasceram da mesma causa: uma coluna vazia pedindo texto para
  // tapar. Hoje o layout empilha e não deixa buraco.
  it('sem chave, o lugar do formulário fica vazio — sem desculpa e sem portão', () => {
    vi.stubEnv('NEXT_PUBLIC_WEB3FORMS_KEY', '')
    const { container } = render(<Contact dict={pt} locale="pt" />)
    const texto = container.textContent ?? ''

    for (const desculpa of [/indispon/i, /fora do ar/i, /no momento/i]) {
      expect(texto, `a seção voltou a se desculpar (${desculpa})`).not.toMatch(desculpa)
    }
    for (const portao of [/o que ajuda/i, /o que n[ãa]o d[áa]/i, /precisa existir/i]) {
      expect(texto, `a seção voltou a instruir o visitante (${portao})`).not.toMatch(portao)
    }
  })

  it('sem chave, o link de e-mail usa mailto: com o endereço do dicionário, nunca escrito à mão', () => {
    vi.stubEnv('NEXT_PUBLIC_WEB3FORMS_KEY', '')
    render(<Contact dict={pt} locale="pt" />)
    // Regex, não nome exato: o cartão do canal agora carrega marca, endereço
    // e para que serve, então o nome acessível do link é a soma dos três.
    expect(screen.getByRole('link', { name: new RegExp(pt.contact.email) })).toHaveAttribute(
      'href',
      `mailto:${pt.contact.email}`,
    )
  })

  it('cada canal diz para que serve, senão viram três endereços sem hierarquia', () => {
    vi.stubEnv('NEXT_PUBLIC_WEB3FORMS_KEY', '')
    render(<Contact dict={pt} locale="pt" />)
    for (const hint of Object.values(pt.contact.channels)) {
      expect(screen.getByText(hint)).toBeInTheDocument()
    }
  })

  // O número aparece formatado e é DERIVADO da URL do wa.me. Um segundo campo
  // com o número escrito à parte poderia divergir do link sem nada acusar, e
  // o visitante ligaria para um número e escreveria para outro.
  it('mostra o telefone formatado, derivado da mesma URL do link', () => {
    vi.stubEnv('NEXT_PUBLIC_WEB3FORMS_KEY', '')
    render(<Contact dict={pt} locale="pt" />)
    const exibido = screen.getByText('+55 83 98622-6441')
    expect(exibido).toBeInTheDocument()

    const digitosNaTela = (exibido.textContent ?? '').replace(/\D/g, '')
    const digitosNoLink = pt.contact.whatsapp.replace(/\D/g, '')
    expect(digitosNaTela, 'o número exibido não bate com o do link').toBe(digitosNoLink)
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

  it('com chave, renderiza o formulário', () => {
    vi.stubEnv('NEXT_PUBLIC_WEB3FORMS_KEY', 'chave-de-teste')
    render(<Contact dict={pt} locale="pt" />)
    expect(screen.getByRole('button', { name: pt.contact.form.submit })).toBeInTheDocument()
  })

  // Os canais não dependem do formulário: com ou sem chave, eles continuam
  // sendo o caminho principal declarado no lead.
  it('com chave, os três canais continuam na tela', () => {
    vi.stubEnv('NEXT_PUBLIC_WEB3FORMS_KEY', 'chave-de-teste')
    render(<Contact dict={pt} locale="pt" />)
    expect(screen.getByRole('link', { name: /whatsapp/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: new RegExp(pt.contact.email) })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /netoguild-rgb/i })).toBeInTheDocument()
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
