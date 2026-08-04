import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PhotoFrame } from '@/components/ui/PhotoFrame'

describe('PhotoFrame', () => {
  it('mostra o texto de pendência quando não recebe src', () => {
    render(<PhotoFrame alt="Retrato de Neto Alves" pendingLabel="Foto a ser adicionada" />)
    expect(screen.getByText('Foto a ser adicionada')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('renderiza a imagem com o alt correto quando recebe src', () => {
    render(
      <PhotoFrame alt="Retrato de Neto Alves" pendingLabel="Foto a ser adicionada" src="/foto/neto.jpg" />,
    )
    const img = screen.getByAltText('Retrato de Neto Alves')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', '/foto/neto.jpg')
    expect(screen.queryByText('Foto a ser adicionada')).not.toBeInTheDocument()
  })
})
