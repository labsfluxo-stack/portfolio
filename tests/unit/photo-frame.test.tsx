import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PhotoFrame } from '@/components/ui/PhotoFrame'

describe('PhotoFrame', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

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
    expect(screen.queryByText('Foto a ser adicionada')).not.toBeInTheDocument()
  })

  it('prefixa o src com o basePath padrão do projeto quando a variável não está definida', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', undefined)
    render(
      <PhotoFrame alt="Retrato de Neto Alves" pendingLabel="Foto a ser adicionada" src="/foto/neto.jpg" />,
    )
    expect(screen.getByAltText('Retrato de Neto Alves')).toHaveAttribute('src', '/portfolio/foto/neto.jpg')
  })

  it('prefixa o src com NEXT_PUBLIC_BASE_PATH quando definido — prova que lê a variável, não um valor fixo', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '/minha-base')
    render(
      <PhotoFrame alt="Retrato de Neto Alves" pendingLabel="Foto a ser adicionada" src="/foto/neto.jpg" />,
    )
    expect(screen.getByAltText('Retrato de Neto Alves')).toHaveAttribute('src', '/minha-base/foto/neto.jpg')
  })
})
