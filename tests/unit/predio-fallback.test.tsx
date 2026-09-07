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
      // O título é buscado DENTRO da própria seção (`within`), não no
      // documento inteiro: o indicador de andar (PredioIndicador.tsx) repete
      // o mesmo texto do título em cada um dos seus sete links de teclado —
      // de propósito, é o nome acessível real da parada —, então um
      // `getByText` sobre `document` bateria duas vezes (o `<h2>` visível e
      // o link invisível-até-foco) e quebraria por ambiguidade que não é
      // defeito nenhum.
      const secao = screen.getByRole('region', { name: dict.predio[andar.chave].titulo })
      expect(within(secao).getByText(dict.predio[andar.chave].titulo)).toBeInTheDocument()
      expect(within(secao).getByText(dict.predio[andar.chave].resumo)).toBeInTheDocument()
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

  /**
   * Decisão do dono (2026-09-07, spec "Um andar por tela, sem barra de
   * rolagem"): a barra lateral some, mas SUMIR COM A BARRA NÃO PODE SUMIR
   * COM A ROLAGEM — esconder é só pintura (`scrollbar-width`,
   * `::-webkit-scrollbar`), nunca `overflow: hidden`, que travaria roda,
   * toque e teclado (Page Down, Home, End, setas). Este teste é o piso
   * mínimo que a spec pede: o elemento que rola continua com `overflow`
   * rolável, nunca escondido.
   */
  it('a barra de rolagem some, mas a rolagem em si continua ligada', () => {
    render(<PredioFallback dict={dict} locale="pt" />)
    const rolador = screen.getAllByRole('region')[0]!.parentElement!
    expect(rolador.className).not.toMatch(/\boverflow-hidden\b/)
    expect(rolador.className).toMatch(/\boverflow-y-auto\b/)
  })

  /**
   * A barra de rolagem não era enfeite: dizia que a página continua e onde
   * se está dentro dela. Removê-la sem substituto apaga essa informação —
   * decisão do dono (2026-09-08), com o custo escrito na spec de propósito,
   * não escondido. O que fica é só a navegação por teclado: uma landmark de
   * verdade com um link por parada, invisível até receber foco (ver
   * components/predio/PredioIndicador.tsx) — sumir da TELA é decisão de
   * arte, sumir do TECLADO seria defeito, e é só essa segunda garantia que
   * este teste confere.
   */
  it('o indicador de andar é uma landmark de navegação com um link por parada', () => {
    render(<PredioFallback dict={dict} locale="pt" />)
    const nav = screen.getByRole('navigation', { name: dict.a11y.predioNav })
    const links = within(nav).getAllByRole('link')
    expect(links).toHaveLength(ANDARES.length)
    ANDARES.forEach((andar, i) => {
      expect(links[i]).toHaveAccessibleName(dict.predio[andar.chave].titulo)
      expect(links[i]).toHaveAttribute('href', `#predio-${andar.chave}`)
    })
  })
})
