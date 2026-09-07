import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { PredioFallback } from '@/components/predio/PredioFallback'
import { ANDARES } from '@/components/predio/predio-programa'
import { getDictionary } from '@/content'

/**
 * Este componente é o site para quem importa mais do que parece: o robô que
 * indexa, o leitor de tela, o aparelho sem WebGL e quem liga movimento
 * reduzido. Ele não é um aviso de "seu navegador não suporta" — é o prédio
 * inteiro, em HTML.
 */
const dict = getDictionary('pt')

describe('fallback do prédio', () => {
  it('renderiza as sete paradas como seções', () => {
    render(<PredioFallback dict={dict} locale="pt" />)
    expect(screen.getAllByRole('region')).toHaveLength(ANDARES.length)
  })

  it('cada andar tem título e resumo de verdade', () => {
    render(<PredioFallback dict={dict} locale="pt" />)
    for (const andar of ANDARES) {
      expect(screen.getByText(dict.predio[andar.chave].titulo)).toBeInTheDocument()
      expect(screen.getByText(dict.predio[andar.chave].resumo)).toBeInTheDocument()
    }
  })

  /**
   * O objeto clicável da cena e o link do fallback são O MESMO destino. Se
   * divergirem, existe conteúdo alcançável por mouse em 3D e inalcançável por
   * teclado — que é o defeito que este componente existe para impedir.
   *
   * A busca é ESCOPADA À SEÇÃO do andar (`within`), e não ao documento
   * inteiro: o dicionário repete rótulo de propósito quando dois objetos de
   * andares diferentes levam ao mesmo destino ("rack" e "computador" levam
   * a `/#sistemas` e os dois dizem "Ver os sistemas em produção"; mesma
   * coisa com "prancheta"/"prateleira" e `/projetos`). Um `getByRole` sobre
   * `document` acha os dois e quebra por ambiguidade — ambiguidade que não
   * existe de verdade, porque nenhum leitor de tela lê o prédio inteiro
   * como uma lista só; ele lê andar por andar. Dentro de um ÚNICO andar o
   * rótulo é sempre único, e é isso que a asserção verifica.
   */
  it('todo objeto clicável vira um link real, com texto acessível', () => {
    render(<PredioFallback dict={dict} locale="pt" />)
    for (const andar of ANDARES) {
      const secao = screen.getByRole('region', { name: dict.predio[andar.chave].titulo })
      for (const objeto of andar.objetos) {
        const link = within(secao).getByRole('link', {
          name: dict.predio[andar.chave].objetos[objeto.id],
        })
        expect(link).toHaveAttribute('href', expect.stringContaining(objeto.destino))
      }
    }
  })

  it('a ordem no DOM é a ordem da descida', () => {
    render(<PredioFallback dict={dict} locale="pt" />)
    const titulos = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(titulos).toEqual(ANDARES.map((a) => dict.predio[a.chave].titulo))
  })
})
