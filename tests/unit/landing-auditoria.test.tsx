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
    expect(screen.getByText(pt.landing.auditoria.resultado.detalhes.nenhumBloqueado)).toBeInTheDocument()
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

  /**
   * O CASO QUE DE FATO EXPLICA A AUSÊNCIA DO PÚBLICO DESTA PÁGINA.
   *
   * Os dois primeiros testes quase nunca disparam: WordPress, Wix e Shopify
   * entregam HTML pronto e raramente barram robô. O site institucional some
   * das respostas de IA porque está parado, não porque é ilegível — e é isso
   * que o sitemap revela.
   */
  it('site legível mas parado há anos abre a conversa', async () => {
    responderCom({
      estado: 'ok',
      palavras: 340,
      amostra: 'Bem-vindo à nossa empresa',
      barrados: [],
      plataforma: 'WordPress',
      sitemap: { paginas: 7, maisRecente: '2022-03-14T10:00:00Z' },
    })
    render(<Auditoria dict={pt} />)

    await userEvent.type(screen.getByLabelText(pt.landing.auditoria.rotuloCampo), 'exemplo.com.br')
    await userEvent.click(screen.getByRole('button', { name: pt.landing.auditoria.botao }))

    await waitFor(() => expect(screen.getByText(/7 páginas/)).toBeInTheDocument())
    expect(screen.getByText(pt.landing.auditoria.resultado.parado)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: pt.landing.auditoria.cta })).toBeInTheDocument()
  })

  // A fronteira importa: um ano sem publicar é discutível, e a ferramenta não
  // deve acender alerta em caso discutível. Só a partir de 18 meses.
  it('site atualizado recentemente não vira alerta nem convite', async () => {
    const tresMesesAtras = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    responderCom({
      estado: 'ok',
      palavras: 3400,
      amostra: 'x',
      barrados: [],
      plataforma: 'WordPress',
      sitemap: { paginas: 42, maisRecente: tresMesesAtras },
    })
    render(<Auditoria dict={pt} />)

    await userEvent.type(screen.getByLabelText(pt.landing.auditoria.rotuloCampo), 'exemplo.com.br')
    await userEvent.click(screen.getByRole('button', { name: pt.landing.auditoria.botao }))

    await waitFor(() => expect(screen.getByText(/42 páginas/)).toBeInTheDocument())
    expect(screen.queryByText(pt.landing.auditoria.resultado.parado)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: pt.landing.auditoria.cta })).not.toBeInTheDocument()
  })

  /**
   * Cinco páginas bem escritas valem mais que cinquenta vazias, e não existe
   * número defensável a partir do qual um site é "pequeno demais". Escolher um
   * seria inventar o critério para poder reprovar — o mesmo mecanismo da
   * métrica de vaidade que a pesquisa lista entre os sinais de quem foi
   * enganado.
   */
  it('site pequeno mas recente é informação, não reprovação', async () => {
    const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    responderCom({
      estado: 'ok',
      palavras: 900,
      amostra: 'x',
      barrados: [],
      plataforma: null,
      sitemap: { paginas: 4, maisRecente: ontem },
    })
    render(<Auditoria dict={pt} />)

    await userEvent.type(screen.getByLabelText(pt.landing.auditoria.rotuloCampo), 'exemplo.com.br')
    await userEvent.click(screen.getByRole('button', { name: pt.landing.auditoria.botao }))

    await waitFor(() => expect(screen.getByText(/4 páginas/)).toBeInTheDocument())
    expect(
      screen.queryByRole('link', { name: pt.landing.auditoria.cta }),
      'quatro páginas viraram motivo para vender',
    ).not.toBeInTheDocument()
  })

  it('sitemap ausente não quebra nem vira alarme', async () => {
    responderCom({ estado: 'ok', palavras: 3400, amostra: 'x', barrados: [], plataforma: null, sitemap: null })
    render(<Auditoria dict={pt} />)

    await userEvent.type(screen.getByLabelText(pt.landing.auditoria.rotuloCampo), 'exemplo.com.br')
    await userEvent.click(screen.getByRole('button', { name: pt.landing.auditoria.botao }))

    await waitFor(() => expect(screen.getByText(pt.landing.auditoria.resultado.legivel)).toBeInTheDocument())
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
