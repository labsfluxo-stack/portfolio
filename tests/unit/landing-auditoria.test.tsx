import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Auditoria } from '@/components/landing/Auditoria'
import { pt } from '@/content/pt'

/**
 * A auditoria é o único trecho da página que faz uma AFIRMAÇÃO SOBRE O SITE DE
 * OUTRA PESSOA. Errar aqui não é bug de interface: é a página que argumenta
 * que suas afirmações se conferem dizendo algo falso sobre o negócio de quem
 * está lendo.
 *
 * Os testes abaixo travam as quatro decisões de produto que sustentam essa
 * honestidade — não o layout.
 */

const ENDPOINT = 'https://auditoria.exemplo.workers.dev'

function responderCom(corpo: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(corpo), { status: 200 })),
  )
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_AUDITORIA_URL', ENDPOINT)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('Auditoria', () => {
  // Mesmo padrão do piso de preço: sem a variável, a seção some inteira e a
  // página fica exatamente como estava, sem buraco. É o que permite publicar
  // antes de o Worker existir.
  it('não renderiza nada sem o endereço do Worker configurado', () => {
    vi.stubEnv('NEXT_PUBLIC_AUDITORIA_URL', '')
    const { container } = render(<Auditoria dict={pt} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('o aviso de escopo aparece antes de qualquer leitura', () => {
    render(<Auditoria dict={pt} />)
    expect(screen.getByText(pt.landing.auditoria.escopo)).toBeInTheDocument()
  })

  /**
   * A DECISÃO MAIS IMPORTANTE DO COMPONENTE.
   *
   * Quando o site passa nos dois testes, a resposta é "está certo" e ponto.
   * Sem "mas", sem pivô para outro problema, sem CTA. Uma ferramenta capaz de
   * dizer que você NÃO precisa do serviço é incomparavelmente mais crível que
   * uma que sempre acha algo — e sinal crível é o que custa caro para forjar.
   *
   * Se este teste cair, a ferramenta virou funil.
   */
  it('site que passa nos dois testes não recebe convite para conversar', async () => {
    responderCom({ estado: 'ok', palavras: 3400, amostra: 'Loja de móveis', barrados: [], plataforma: 'WordPress' })
    render(<Auditoria dict={pt} />)

    await userEvent.type(screen.getByLabelText(pt.landing.auditoria.rotuloCampo), 'exemplo.com.br')
    await userEvent.click(screen.getByRole('button', { name: pt.landing.auditoria.botao }))

    await waitFor(() => expect(screen.getByText(/3\.400/)).toBeInTheDocument())
    expect(screen.getByText(pt.landing.auditoria.resultado.permitido)).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: pt.landing.auditoria.cta }),
      'a ferramenta ofereceu ajuda para um site que ela mesma disse estar certo',
    ).not.toBeInTheDocument()
  })

  it('site legível mas barrado no robots.txt nomeia os robôs e abre a conversa', async () => {
    responderCom({
      estado: 'ok',
      palavras: 3400,
      amostra: 'Loja de móveis',
      barrados: ['GPTBot', 'ClaudeBot'],
      plataforma: 'WordPress',
    })
    render(<Auditoria dict={pt} />)

    await userEvent.type(screen.getByLabelText(pt.landing.auditoria.rotuloCampo), 'exemplo.com.br')
    await userEvent.click(screen.getByRole('button', { name: pt.landing.auditoria.botao }))

    await waitFor(() => expect(screen.getByText('GPTBot, ClaudeBot')).toBeInTheDocument())
    // Legível E barrado ao mesmo tempo: sem a camada de robots.txt, este site
    // receberia um "está tudo certo" que estaria errado.
    expect(screen.getByText(pt.landing.auditoria.resultado.legivel)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: pt.landing.auditoria.cta })).toBeInTheDocument()
  })

  it('casca de SPA é reportada como página em branco', async () => {
    responderCom({ estado: 'ok', palavras: 11, amostra: '', barrados: [], plataforma: 'Next.js' })
    render(<Auditoria dict={pt} />)

    await userEvent.type(screen.getByLabelText(pt.landing.auditoria.rotuloCampo), 'exemplo.com.br')
    await userEvent.click(screen.getByRole('button', { name: pt.landing.auditoria.botao }))

    await waitFor(() => expect(screen.getByText(pt.landing.auditoria.resultado.vazio)).toBeInTheDocument())
    expect(screen.getByRole('link', { name: pt.landing.auditoria.cta })).toBeInTheDocument()
  })

  /**
   * Site que nos barrou NÃO é site vazio.
   *
   * Reportar 403 como "o ChatGPT não vê nada" seria afirmação falsa sobre o
   * site de outra pessoa. E não pode puxar CTA: vender a partir de uma medição
   * que não aconteceu é inventar problema.
   */
  it('leitura bloqueada não vira veredito nem convite', async () => {
    responderCom({ estado: 'bloqueado' })
    render(<Auditoria dict={pt} />)

    await userEvent.type(screen.getByLabelText(pt.landing.auditoria.rotuloCampo), 'exemplo.com.br')
    await userEvent.click(screen.getByRole('button', { name: pt.landing.auditoria.botao }))

    await waitFor(() => expect(screen.getByText(pt.landing.auditoria.resultado.bloqueado)).toBeInTheDocument())
    expect(screen.queryByText(pt.landing.auditoria.resultado.vazio)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: pt.landing.auditoria.cta })).not.toBeInTheDocument()
  })

  // A plataforma é contexto, nunca causa. Aparece separada das duas medições.
  it('nomeia a plataforma como prova de que leu o site', async () => {
    responderCom({ estado: 'ok', palavras: 3400, amostra: 'x', barrados: [], plataforma: 'WordPress com Elementor' })
    render(<Auditoria dict={pt} />)

    await userEvent.type(screen.getByLabelText(pt.landing.auditoria.rotuloCampo), 'exemplo.com.br')
    await userEvent.click(screen.getByRole('button', { name: pt.landing.auditoria.botao }))

    await waitFor(() => expect(screen.getByText(/WordPress com Elementor/)).toBeInTheDocument())
  })
})
