import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Stack } from '@/components/sections/Stack'
import { pt } from '@/content/pt'

describe('Stack', () => {
  it('a camada de redes vem primeiro', () => {
    const { container } = render(<Stack dict={pt} locale="pt" />)
    const text = container.textContent ?? ''
    const networking = pt.stack.layers[0]
    expect(networking?.label).toBe('Redes & Infraestrutura')
    // Um item da primeira camada (Cisco) precisa aparecer antes de um item
    // de qualquer outra camada (TypeScript, presente em Backend) na ordem
    // do documento — não só na ordem do array de dados.
    expect(text.indexOf('Cisco')).toBeGreaterThanOrEqual(0)
    expect(text.indexOf('Cisco')).toBeLessThan(text.indexOf('TypeScript'))
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
