import { describe, expect, it } from 'vitest'
import { MINIMO_AA, corDoAndar, corDoRotulo } from '@/components/predio/predio-luz'
import { ANDARES } from '@/components/predio/predio-programa'
import { contraste } from '@/lib/contraste'

/**
 * A direção de arte é hora dourada, e ela existe em parte PARA ser legível ao
 * ar livre — tela âmbar de luminância média se lê sob sol, tela quase preta
 * não. Esse argumento só vale se alguém medir. Este arquivo mede.
 */
describe('luz do prédio', () => {
  it.each(ANDARES.map((a, i) => [a.chave, i] as const))(
    'o rótulo do andar %s passa AA sobre a cor dele',
    (_chave, i) => {
      expect(contraste(corDoRotulo(i), corDoAndar(i))).toBeGreaterThanOrEqual(MINIMO_AA)
    },
  )

  it('toda cor é hex de seis dígitos', () => {
    for (let i = 0; i < ANDARES.length; i++) {
      expect(corDoAndar(i)).toMatch(/^#[0-9a-f]{6}$/i)
      expect(corDoRotulo(i)).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  /**
   * O arco de temperatura é o que faz a luz contar a mesma história que a ordem
   * dos andares: máquina em cima, gente embaixo. Quente na cobertura, frio no
   * miolo, quente de novo na recepção — onde a luz já é artificial.
   */
  it('a temperatura desce e volta a subir na recepção', () => {
    const k = ANDARES.map((a) => a.kelvin)
    const meio = k.indexOf(Math.max(...k))
    expect(meio).toBeGreaterThan(0)
    expect(meio).toBeLessThan(k.length - 1)
    expect(k[k.length - 1]).toBeLessThan(k[meio]!)
    expect(k[0]).toBeLessThan(k[meio]!)
  })
})
