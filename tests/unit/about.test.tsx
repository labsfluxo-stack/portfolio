import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { About } from '@/components/sections/About'
import { pt } from '@/content/pt'

describe('About', () => {
  // Estes três testes travavam a formação em três blocos rotulados
  // (Técnico / Graduação / Certificações) e estavam certos em existir. O
  // dono pediu uma fileira única de etiquetas, no tratamento das marcas de
  // rede — mudou a ESTRUTURA. A regra que os testes protegem não mudou, e
  // é ela que continua travada aqui: um CS50 nunca pode ser lido como
  // diploma, e a HarvardX tem de aparecer atribuída a eles.
  it('a formação é uma fileira única de etiquetas, sem os rótulos de grupo', () => {
    render(<About dict={pt} locale="pt" />)
    for (const label of [
      pt.about.education.technical.label,
      pt.about.education.degree.label,
      pt.about.education.certifications.label,
    ]) {
      expect(screen.queryByText(label), `o rótulo de grupo "${label}" voltou para a tela`).not.toBeInTheDocument()
    }

    // Sem rótulo de grupo, cada etiqueta precisa se explicar sozinha: uma
    // que diga só "Telecomunicações" não informa que é curso técnico.
    for (const item of pt.about.education.technical.items) {
      expect(item.toLowerCase(), `"${item}" não se descreve sem o rótulo "Técnico"`).toContain('técnico')
      expect(screen.getByText(item)).toBeInTheDocument()
    }
    for (const item of pt.about.education.degree.items) {
      expect(screen.getByText(item)).toBeInTheDocument()
    }
  })

  it('cada CS50 aparece como etiqueta pelo código, e nenhum encosta na graduação', () => {
    render(<About dict={pt} locale="pt" />)
    const codes = pt.about.education.certifications.items.map((item) => item.split(' — ')[0] ?? item)
    expect(codes, 'a lista de certificações mudou de formato').toContain('CS50x')
    for (const code of codes) {
      expect(screen.getByText(code)).toBeInTheDocument()
    }
    // Escopado à etiqueta da graduação, nunca ao texto da seção — ali
    // "CS50" existe de propósito, em outra etiqueta.
    for (const item of pt.about.education.degree.items) {
      expect(screen.getByText(item).textContent ?? '').not.toMatch(/CS50/)
    }
  })

  it('a atribuição da HarvardX aparece e nomeia os CS50', () => {
    const { container } = render(<About dict={pt} locale="pt" />)
    const institution = pt.about.education.certifications.institution
    const line = Array.from(container.querySelectorAll('p')).find((p) =>
      (p.textContent ?? '').includes(institution),
    )
    expect(line, `"${institution}" sumiu da seção`).toBeDefined()
    // Sem citar "CS50" na mesma linha, a atribuição fica solta embaixo da
    // fileira inteira e passa a parecer que cobre também o curso técnico e
    // a graduação — que não são da Harvard.
    expect(line?.textContent ?? '', 'a atribuição não diz a que cursos se refere').toMatch(/CS50/)
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
