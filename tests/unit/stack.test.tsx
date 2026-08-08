import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Stack } from '@/components/sections/Stack'
import { pt } from '@/content/pt'

describe('Stack', () => {
  // Este teste já travou o OPOSTO ("a camada de redes vem primeiro") e
  // estava certo em existir: a ordem das camadas é uma decisão de
  // posicionamento, não estética, e merece uma trava. O que mudou foi a
  // decisão — o dono constrói software, e a década de infraestrutura é a
  // base que explica a confiabilidade disso, não a oferta. Com redes
  // abrindo a lista (e sendo a camada com mais itens em nível de domínio),
  // ela respondia sozinha "o que essa pessoa faz?" pela área errada.
  it('a camada de redes vem por último, e o software abre a lista', () => {
    const { container } = render(<Stack dict={pt} locale="pt" />)
    const text = container.textContent ?? ''
    expect(pt.stack.layers[0]?.label).toBe('Backend')
    expect(pt.stack.layers.at(-1)?.label).toBe('Redes & Infraestrutura')
    // Ordem do DOCUMENTO, não só a do array de dados: um item exclusivo do
    // Backend (TypeScript) precisa aparecer antes de um exclusivo de redes
    // (Cisco). Sem isto, um `reverse()` no componente passaria batido.
    expect(text.indexOf('TypeScript')).toBeGreaterThanOrEqual(0)
    expect(text.indexOf('TypeScript')).toBeLessThan(text.indexOf('Cisco'))
  })

  // A competência que fala com os dois públicos ao mesmo tempo — recrutador
  // técnico e empresário — e a única camada cuja prova é a própria página.
  it('a camada de SEO/GEO existe e vem antes de redes', () => {
    const { container } = render(<Stack dict={pt} locale="pt" />)
    const text = container.textContent ?? ''
    const geo = pt.stack.layers.find((layer) => layer.label === 'SEO, GEO & Medição')
    expect(geo, 'a camada "SEO, GEO & Medição" sumiu do dicionário').toBeDefined()
    expect(text.indexOf('GEO (respostas de IA)')).toBeGreaterThanOrEqual(0)
    expect(text.indexOf('GEO (respostas de IA)')).toBeLessThan(text.indexOf('Cisco'))
  })

  it('as três marcas de rede aparecem', () => {
    render(<Stack dict={pt} locale="pt" />)
    for (const vendor of ['Cisco', 'MikroTik', 'Furukawa']) {
      expect(screen.getByText(vendor)).toBeInTheDocument()
    }
  })

  it('a nota de experiência aparece na camada de redes, e a de repo nas demais', () => {
    const { container } = render(<Stack dict={pt} locale="pt" />)
    const headings = screen.getAllByRole('heading', { level: 3 })
    const networkingHeading = headings.find((h) => h.textContent === 'Redes & Infraestrutura')
    expect(networkingHeading).toBeDefined()
    const networkingCard = networkingHeading?.closest('div')
    expect(networkingCard?.textContent ?? '').toContain(pt.stack.sourceNote.experience)
    expect(networkingCard?.textContent ?? '').not.toContain(pt.stack.sourceNote.repo)

    // Toda camada que não é a de redes usa a nota de `repo`.
    const repoLayers = pt.stack.layers.filter((layer) => layer.source === 'repo')
    expect(repoLayers.length).toBeGreaterThan(0)
    const repoNoteCount = (container.textContent ?? '').split(pt.stack.sourceNote.repo).length - 1
    expect(repoNoteCount).toBe(repoLayers.length)
  })

  it('os três níveis renderizam com seus rótulos', () => {
    render(<Stack dict={pt} locale="pt" />)
    for (const level of ['dominio', 'producao', 'contato'] as const) {
      expect(screen.getAllByText(pt.stack.levels[level]).length).toBeGreaterThan(0)
    }
  })
})
