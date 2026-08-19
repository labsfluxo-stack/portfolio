import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Catalogo } from '@/components/ativacoes/Catalogo'
import { pt } from '@/content/pt'

describe('catálogo de ativações', () => {
  it('renderiza os quatro blocos do dicionário', () => {
    render(<Catalogo dict={pt} />)
    for (const bloco of pt.ativacoes.catalogo.blocos) {
      expect(screen.getByText(bloco.nome)).toBeInTheDocument()
      expect(screen.getByText(bloco.corpo)).toBeInTheDocument()
    }
    expect(screen.getAllByRole('listitem')).toHaveLength(4)
  })

  // Spec §2.2: sem esta linha a página vira "alugamos totem", que é um negócio
  // de logística que a dupla não tem. Ela é posicionamento, não rodapé — e por
  // isso tem teste.
  it('mostra o escopo negativo na própria seção', () => {
    render(<Catalogo dict={pt} />)
    expect(screen.getByText(pt.ativacoes.catalogo.escopo)).toBeInTheDocument()
  })

  // A arte é decoração e o argumento vive no texto ao lado — que é o que o
  // crawler lê. Mesmo padrão de components/landing/arte.tsx.
  it('toda arte é decorativa', () => {
    const { container } = render(<Catalogo dict={pt} />)
    const svgs = container.querySelectorAll('svg')
    expect(svgs.length).toBe(4)
    for (const svg of svgs) expect(svg.getAttribute('aria-hidden')).toBe('true')
  })
})
