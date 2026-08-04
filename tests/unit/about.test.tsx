import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { About } from '@/components/sections/About'
import { pt } from '@/content/pt'

describe('About', () => {
  it('renderiza os três blocos de formação com rótulos distintos', () => {
    render(<About dict={pt} locale="pt" />)
    expect(screen.getByText(pt.about.education.technical.label)).toBeInTheDocument()
    expect(screen.getByText(pt.about.education.degree.label)).toBeInTheDocument()
    expect(screen.getByText(pt.about.education.certifications.label, { exact: false })).toBeInTheDocument()
  })

  it('os CS50 aparecem no bloco de certificações, nunca no de graduação', () => {
    render(<About dict={pt} locale="pt" />)
    for (const item of pt.about.education.certifications.items) {
      expect(screen.getByText(item)).toBeInTheDocument()
    }
    // Escopa a checagem ao próprio bloco de graduação — não ao texto inteiro
    // da seção, onde "CS50" apareceria de qualquer forma (em outro bloco).
    const degreeBlock = screen.getByText(pt.about.education.degree.label).closest('div')
    expect(degreeBlock?.textContent ?? '').not.toMatch(/CS50/)
  })

  it('mostra a instituição das certificações', () => {
    render(<About dict={pt} locale="pt" />)
    const certLabel = screen.getByText(pt.about.education.certifications.label, { exact: false })
    expect(certLabel.textContent).toContain(pt.about.education.certifications.institution)
  })

  it('mostra os três vendors de rede no bloco de experiência', () => {
    render(<About dict={pt} locale="pt" />)
    for (const vendor of pt.about.experience.vendors) {
      expect(screen.getByText(vendor)).toBeInTheDocument()
    }
  })

  it('não injeta nenhum rótulo de status perto da graduação', () => {
    const { container } = render(<About dict={pt} locale="pt" />)
    const status = [/conclu[íi]d/i, /em andamento/i, /cursando/i]
    for (const s of status) expect(container.textContent ?? '').not.toMatch(s)
  })

  it('mostra o placeholder da foto enquanto não há src', () => {
    render(<About dict={pt} locale="pt" />)
    expect(screen.getByText(pt.about.photoPending)).toBeInTheDocument()
  })
})
