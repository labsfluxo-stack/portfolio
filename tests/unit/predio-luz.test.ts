import { describe, expect, it } from 'vitest'
import { AR, MINIMO_AA, corDoAndar, corDoRotulo } from '@/components/predio/predio-luz'
import { ANDARES } from '@/components/predio/predio-programa'
import { contraste } from '@/lib/contraste'

/**
 * Quanto o canal azul supera o vermelho no hex — a mesma leitura que a revisão
 * usou para confirmar a olho que `automacao` (kelvin mais alto) é a cor mais
 * fria do arco. Vive no teste, não no módulo: é instrumento de medição, não
 * parte do contrato público de `predio-luz.ts`.
 */
function frieza(hex: string): number {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = (n >> 16) & 255
  const b = n & 255
  return b - r
}

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

  // A guarda vivia como `throw` em tempo de módulo dentro de predio-luz.ts —
  // mas isso derruba a página em produção no dia em que um oitavo andar entrar
  // em ANDARES sem cor correspondente, em vez de derrubar só a suíte. Aqui o
  // mesmo descompasso custa um teste vermelho, não uma tela branca.
  it('há uma cor de ar para cada andar do programa', () => {
    expect(AR.length).toBe(ANDARES.length)
  })

  /**
   * O teste de kelvin acima guarda o DADO de entrada (`predio-programa.ts`);
   * este guarda a SAÍDA deste módulo — as cores que `corDoAndar` de fato
   * produz. Sem ele, `AR` poderia ser embaralhado, invertido ou monocromático
   * que a suíte inteira continuaria verde, porque nada mais chama `corDoAndar`
   * e olha para a cor. Provado: com `AR` invertido este teste falha (pico de
   * frieza cai em `design`, índice 2, não em `automacao`, índice 4); com `AR`
   * como está, passa.
   */
  it('a cor mais fria do arco cai no mesmo andar que o kelvin mais frio', () => {
    const kelvins = ANDARES.map((a) => a.kelvin)
    const picoKelvin = kelvins.indexOf(Math.max(...kelvins))
    const friezas = ANDARES.map((_, i) => frieza(corDoAndar(i)))
    const picoFrieza = friezas.indexOf(Math.max(...friezas))

    expect(picoFrieza).toBe(picoKelvin)
    expect(friezas[0]).toBeLessThan(friezas[picoFrieza]!)
    expect(friezas[friezas.length - 1]).toBeLessThan(friezas[picoFrieza]!)
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
