import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CapaJogo } from '@/components/ativacoes/CapaJogo'
import { pt } from '@/content/pt'
import { en } from '@/content/en'

/**
 * O QUE ESTE ARQUIVO PROVA — E O QUE ELE NÃO TEM COMO ALCANÇAR.
 *
 * `tests/setup.ts` já instala `matchMedia` e `IntersectionObserver` para a
 * suíte inteira, e força `HTMLCanvasElement.prototype.getContext` a devolver
 * `null` GLOBALMENTE. Havia aqui um `beforeAll` reinstalando os dois primeiros
 * com `??=` — que nunca disparava, porque já estavam definidos — e um `ResizeObserver`
 * que o efeito nunca chega a consultar. O comentário que os acompanhava
 * afirmava que `getContext` ficava sem stub de propósito, ou seja, o contrário
 * do que o setup faz. Bloco removido: stub morto que descreve errado o ambiente
 * atrapalha mais do que stub nenhum.
 *
 * A consequência real é que O LAÇO DE rAF NUNCA RODA AQUI. Sem contexto 2D o
 * `useEffect` sai na primeira guarda, e é isto que os casos abaixo exercem: o
 * cenário do navegador sem canvas que a página promete suportar (spec §4.2 e
 * §4.4) — título, subtítulo, CTA e QR em DOM real, sem depender de pixel.
 *
 * Nada que dependa do laço é observável daqui: o ponteiro chegando ao canvas, o
 * alvo encolhendo ou não sob `prefers-reduced-motion`, o fim de partida. Esses
 * vivem em `tests/e2e/ativacoes.spec.ts`, no navegador de verdade, e é por isso
 * que aquele arquivo é o único portão que enxerga os defeitos C1 e C2.
 */
describe('capa jogável', () => {
  // Spec §4.2, a regra mais cara desta seção: canvas é invisível para GPTBot,
  // ClaudeBot e PerplexityBot. A landing irmã vende exatamente o argumento de
  // que a IA consegue ler o site — desenhar o título no canvas seria a
  // contradição mais cara que este repositório poderia publicar.
  it('o título e o subtítulo são DOM real, não pixel no canvas', () => {
    render(<CapaJogo dict={pt} locale="pt" />)
    const titulo = screen.getByRole('heading', { level: 1 })
    expect(titulo.textContent).toContain(pt.ativacoes.capa.titulo)
    expect(titulo.textContent).toContain(pt.ativacoes.capa.tituloDestaque)
    expect(screen.getByText(pt.ativacoes.capa.subtitulo)).toBeInTheDocument()
  })

  it('o CTA aponta para o WhatsApp com a mensagem já escrita', () => {
    render(<CapaJogo dict={pt} locale="pt" />)
    const cta = screen.getByRole('link', { name: pt.ativacoes.cta.rotulo })
    expect(cta.getAttribute('href')).toContain('wa.me')
    expect(cta.getAttribute('href')).toContain(encodeURIComponent(pt.ativacoes.cta.mensagem))
  })

  // Job 3 do redesign (2026-08): o canvas ERA `aria-hidden` sem `tabindex` —
  // um visitante de teclado tinha o título, o subtítulo, o botão de
  // WhatsApp, e nenhuma prova interativa, que é o motivo da dobra existir.
  // Continua verdade que nada de EXCLUSIVO vive só no canvas (placar e fim de
  // partida seguem em DOM, testados abaixo e no arquivo de fim); o que mudou
  // é que o canvas agora é o próprio controle interativo, e precisa estar na
  // árvore de acessibilidade para isso.
  it('o canvas é focável, entra na ordem de foco e carrega nome e instrução', () => {
    const { container } = render(<CapaJogo dict={pt} locale="pt" />)
    const canvas = container.querySelector('canvas')
    expect(canvas).not.toBeNull()
    expect(canvas!.getAttribute('aria-hidden')).not.toBe('true')
    expect(canvas!.getAttribute('tabindex')).toBe('0')
    expect(canvas!.getAttribute('aria-label')).toBe(pt.ativacoes.capa.acessibilidade.rotulo)

    // A instrução curta vive num parágrafo `sr-only` ligado por
    // `aria-describedby` — nome e instrução são propriedades de
    // acessibilidade distintas, e não a mesma string fazendo dois papéis.
    const idInstrucao = canvas!.getAttribute('aria-describedby')
    expect(idInstrucao).toBeTruthy()
    const instrucao = container.querySelector(`#${idInstrucao}`)
    expect(instrucao?.textContent).toBe(pt.ativacoes.capa.acessibilidade.instrucao)
  })

  // Sem contexto 2D (jsdom, navegador antigo, canvas desligado por política),
  // a montagem não pode explodir e o conteúdo tem que continuar lá.
  it('renderiza inteiro mesmo sem contexto de canvas', () => {
    expect(() => render(<CapaJogo dict={pt} locale="pt" />)).not.toThrow()
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  // O QR aponta para `/[locale]/ativacoes`, então o SVG servido precisa mudar
  // com o locale — um `qr-pt.svg` fixo mandaria um visitante em `/en` para a
  // rota errada. O teste cobre os dois locales para travar o desvio, não só
  // um deles por sorte.
  it('o QR aponta para o SVG do locale certo, e some no celular', () => {
    const { container: capaPt } = render(<CapaJogo dict={pt} locale="pt" />)
    const qrPt = capaPt.querySelector('img')
    expect(qrPt).not.toBeNull()
    expect(qrPt!.getAttribute('src')).toContain('/ativacoes/qr-pt.svg')
    expect(qrPt!.getAttribute('alt')).toBe('')
    expect(qrPt!.getAttribute('aria-hidden')).toBe('true')
    expect(qrPt!.className).toContain('md:block')

    const { container: capaEn } = render(<CapaJogo dict={en} locale="en" />)
    const qrEn = capaEn.querySelector('img')
    expect(qrEn!.getAttribute('src')).toContain('/ativacoes/qr-en.svg')
  })

  // Job 5: o QR não tinha legenda — só quem já soubesse que era um jogo
  // saberia por que apontar o celular para ele.
  it('o QR carrega uma legenda visível dizendo o que ele é', () => {
    render(<CapaJogo dict={pt} locale="pt" />)
    expect(screen.getByText(pt.ativacoes.capa.qr)).toBeInTheDocument()
  })

  // Job 2: os dois blocos que de fato interceptam o ponteiro por cima do
  // canvas (CTA sempre, fim de partida só depois de 15s) precisam estar
  // marcados para o motor saber onde não nascer alvo. A ausência do
  // atributo é o próprio bug que a auditoria mediu — por isso o teste trava
  // a marcação, não o resultado do cálculo (que só o navegador de verdade
  // consegue medir, em tests/e2e/ativacoes.spec.ts).
  it('o bloco de CTA está marcado como zona proibida ao motor', () => {
    const { container } = render(<CapaJogo dict={pt} locale="pt" />)
    expect(container.querySelector('[data-zona-jogo="cta"]')).not.toBeNull()
  })
})
