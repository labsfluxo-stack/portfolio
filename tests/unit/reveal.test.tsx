import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Reveal } from '@/components/ui/Reveal'

/**
 * `Reveal` embrulha About, Systems, Stack e Contact — a home inteira abaixo do
 * hero. Ele animava com `motion/react`, na thread principal, exatamente durante
 * a rolagem em que a cena 3D está desenhando.
 */
describe('Reveal', () => {
  it('marca o embrulho com a classe de revelação', () => {
    render(<Reveal>conteúdo</Reveal>)
    expect(screen.getByText('conteúdo')).toHaveClass('revelar')
  })

  /** O escalonamento vira `--i`, que o CSS usa para deslocar a faixa. */
  it('passa a ordem para o CSS como --i', () => {
    render(<Reveal ordem={3}>terceiro</Reveal>)
    expect(screen.getByText('terceiro').getAttribute('style')).toContain('--i: 3')
  })

  /**
   * O EMBRULHO EXISTE SEMPRE, e isto conserta um defeito que já estava no ar.
   *
   * A versão com `motion` devolvia `<>{children}</>` quando o visitante pedia
   * menos movimento — sumindo com a `div` e, junto com ela, o `className="grid"`
   * de que Stack e Systems dependem para os cards manterem altura uniforme na
   * fileira. Quem pedia menos movimento recebia uma grade desalinhada.
   *
   * Em CSS o embrulho é sempre o mesmo elemento; só a animação muda de estado,
   * e quem desliga o movimento é o `@media` global.
   */
  it('mantém o embrulho e o className, sem depender de preferência de movimento', () => {
    render(
      <Reveal ordem={1} className="grid">
        card
      </Reveal>,
    )
    const embrulho = screen.getByText('card')
    expect(embrulho).toHaveClass('grid')
    expect(embrulho).toHaveClass('revelar')
  })
})
