import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Prova } from '@/components/landing/Prova'
import { pt } from '@/content/pt'
import { SYSTEM_SLUGS } from '@/content/types'

describe('Prova', () => {
  it('lista os três sistemas que já existem, sem duplicar conteúdo', () => {
    render(<Prova dict={pt} locale="pt" />)
    for (const slug of SYSTEM_SLUGS) {
      expect(screen.getByText(pt.systems.detail[slug].name)).toBeInTheDocument()
    }
  })

  it('cada card leva ao case completo, com o basePath do projeto', () => {
    render(<Prova dict={pt} locale="pt" />)
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(SYSTEM_SLUGS.length)
    for (const link of links) {
      expect(link).toHaveAttribute('href', expect.stringContaining('/pt/sistemas/'))
    }
  })

  // Erro clássico de dev vendendo para não-dev, observado na pesquisa: provar
  // competência técnica e esquecer de provar resultado. Uma das páginas
  // analisadas estampa "Lighthouse 95+" para um público que não avalia isso.
  it('mostra o resultado de negócio, não a métrica de ferramenta', () => {
    const { container } = render(<Prova dict={pt} locale="pt" />)
    expect(container.textContent).not.toMatch(/lighthouse/i)
  })
})
