import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Metric } from '@/components/ui/Metric'

const PROVENANCE = 'Soma de 9 repositórios, excluindo dependências. Medido em 2026-08-02.'

function setup() {
  return render(
    <Metric value="250.000+" label="linhas de código" provenance={PROVENANCE} locale="pt" />,
  )
}

describe('Metric', () => {
  // Este teste exigia a procedência como TEXTO VISÍVEL, e estava certo
  // enquanto essa era a decisão. Ela mudou: nove justificativas na mesma tela
  // não leem como rigor, leem como quem precisa provar que sabe (ver o
  // comentário em components/ui/Metric.tsx).
  //
  // O que não mudou é o que este teste protege de verdade: a procedência tem
  // de EXISTIR e ser alcançável. Um número sem origem nenhuma é o defeito;
  // um número com a origem a um hover de distância, não.
  it('sempre carrega a procedência, ainda que não como parágrafo', () => {
    const { container } = setup()
    const comTitle = container.querySelector(`[title="${PROVENANCE}"]`)
    expect(comTitle, 'a procedência sumiu do componente inteiro').toBeTruthy()
  })

  it('a procedência fica no mesmo elemento do número, não num vizinho qualquer', () => {
    setup()
    // `getByTitle` acha o elemento pelo title; ele tem de ser o que mostra o
    // número, senão o hover cai no lugar errado e a prova fica inalcançável
    // na prática.
    expect(screen.getByTitle(PROVENANCE)).toHaveTextContent('250.000+')
  })

  it('não imprime a procedência como parágrafo debaixo do número', () => {
    const { container } = setup()
    const paragrafos = Array.from(container.querySelectorAll('p')).map((p) => p.textContent ?? '')
    expect(
      paragrafos.some((texto) => texto.includes('Medido em 2026-08-02')),
      'a justificativa voltou para debaixo do número',
    ).toBe(false)
  })

  it('mostra o número e o rótulo', () => {
    setup()
    expect(screen.getByText('250.000+')).toBeInTheDocument()
    expect(screen.getByText('linhas de código')).toBeInTheDocument()
  })
})
