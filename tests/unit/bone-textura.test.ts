import { describe, expect, it } from 'vitest'
import { ajustarFonteAoEspaco, resolverNomeMarca, type Medidor } from '@/components/three/bone-textura'

/**
 * Mesmo par de funções puras testado em `caneca-textura.test.ts` e
 * `ecobag-textura.test.ts` — ver o cabeçalho de `bone-textura.ts` para o
 * porquê da cópia (chunks independentes) e de cada cópia ganhar sua própria
 * suíte (testar só o original não pegaria uma quebra nesta cópia).
 */
const medidorSimples: Medidor = (fonte, texto) => {
  const tamanho = Number(fonte.match(/(\d+)px/)?.[1] ?? 0)
  return tamanho * texto.length * 0.6
}

describe('ajustarFonteAoEspaco (bone)', () => {
  it('devolve o tamanho máximo quando o texto já cabe nele', () => {
    const tamanho = ajustarFonteAoEspaco({
      texto: 'Oi',
      larguraDisponivel: 1000,
      tamanhoMax: 80,
      tamanhoMin: 20,
      familia: 'sans-serif',
      medir: medidorSimples,
    })
    expect(tamanho).toBe(80)
  })

  it('encolhe até caber quando o nome é comprido', () => {
    const tamanho = ajustarFonteAoEspaco({
      texto: 'Uma Marca Bem Comprida',
      larguraDisponivel: 300,
      tamanhoMax: 80,
      tamanhoMin: 20,
      familia: 'sans-serif',
      medir: medidorSimples,
    })
    expect(tamanho).toBeLessThan(80)
    expect(medidorSimples(`700 ${tamanho}px sans-serif`, 'Uma Marca Bem Comprida')).toBeLessThanOrEqual(300)
  })

  it('nunca encolhe abaixo do piso, mesmo que o texto não caiba de jeito nenhum', () => {
    const tamanho = ajustarFonteAoEspaco({
      texto: 'Um Nome de Marca Extremamente Longo Para Qualquer Faixa',
      larguraDisponivel: 50,
      tamanhoMax: 80,
      tamanhoMin: 20,
      familia: 'sans-serif',
      medir: medidorSimples,
    })
    expect(tamanho).toBe(20)
  })

  it('o passo é de 2px', () => {
    const medir: Medidor = (fonte) => {
      const tamanho = Number(fonte.match(/(\d+)px/)?.[1] ?? 0)
      return tamanho > 42 ? 1000 : 10
    }
    const tamanho = ajustarFonteAoEspaco({
      texto: 'Marca',
      larguraDisponivel: 500,
      tamanhoMax: 80,
      tamanhoMin: 20,
      familia: 'sans-serif',
      medir,
    })
    expect(tamanho).toBe(42)
    expect((80 - tamanho) % 2).toBe(0)
  })
})

describe('resolverNomeMarca', () => {
  it('devolve o nome recortado quando ele existe', () => {
    expect(resolverNomeMarca('  Aurora Eventos  ')).toBe('Aurora Eventos')
  })

  it('cai no valor de reserva quando o nome é vazio', () => {
    expect(resolverNomeMarca('')).toBe('MARCA')
  })

  it('cai no valor de reserva quando o nome é só espaço', () => {
    expect(resolverNomeMarca('   ')).toBe('MARCA')
  })
})
