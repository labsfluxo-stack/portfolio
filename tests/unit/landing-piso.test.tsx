import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Piso } from '@/components/landing/Piso'
import { pt } from '@/content/pt'
import type { Dictionary } from '@/content/types'

function comPiso(piso: Dictionary['landing']['piso']): Dictionary {
  return { ...pt, landing: { ...pt.landing, piso } }
}

describe('Piso', () => {
  // É isto que permite publicar a página antes de o valor estar decidido.
  it('não renderiza nada quando o piso é nulo', () => {
    const { container } = render(<Piso dict={comPiso(null)} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('mostra valor e nota quando o piso existe', () => {
    const piso = { valor: 'A partir de R$ 4.000', nota: 'O valor final depende do escopo.' }
    const { container } = render(<Piso dict={comPiso(piso)} />)
    expect(container.textContent).toContain(piso.valor)
    expect(container.textContent).toContain(piso.nota)
  })

  // String em branco é o mesmo que não ter valor. Sem o `trim()` no
  // componente, um espaço acidental no dicionário renderizaria uma seção
  // vazia com padding — pior que a ausência.
  it('não renderiza com valor em branco', () => {
    const { container } = render(<Piso dict={comPiso({ valor: '   ', nota: 'x' })} />)
    expect(container).toBeEmptyDOMElement()
  })
})
