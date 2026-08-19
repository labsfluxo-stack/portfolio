import { render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'
import { CapaJogo } from '@/components/ativacoes/CapaJogo'
import { pt } from '@/content/pt'
import { en } from '@/content/en'

/**
 * jsdom não implementa `matchMedia`, `ResizeObserver`, `IntersectionObserver`
 * nem contexto 2D de canvas. Isso NÃO é um obstáculo a contornar — é o cenário
 * real de um navegador sem canvas, e o componente tem que sobreviver a ele. Os
 * dois primeiros ganham stub aqui porque a ausência deles é artefato do jsdom;
 * `getContext` fica sem stub de propósito, para o teste exercer exatamente o
 * caminho "não há canvas" que a página promete suportar.
 */
beforeAll(() => {
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia

  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver

  window.IntersectionObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
    root = null
    rootMargin = ''
    thresholds = []
  } as unknown as typeof IntersectionObserver
})

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

  // Spec §4.4: o jogo é acréscimo. Nada de exclusivo vive dentro do canvas, e
  // por isso ele sai inteiro da árvore de acessibilidade.
  it('o canvas é decoração: aria-hidden e fora da ordem de foco', () => {
    const { container } = render(<CapaJogo dict={pt} locale="pt" />)
    const canvas = container.querySelector('canvas')
    expect(canvas).not.toBeNull()
    expect(canvas!.getAttribute('aria-hidden')).toBe('true')
    expect(canvas!.hasAttribute('tabindex')).toBe(false)
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
})
