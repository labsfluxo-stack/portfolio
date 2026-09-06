import { describe, expect, it } from 'vitest'
import { ANDARES, indiceDe, type ChaveAndar } from '@/components/predio/predio-programa'
import { getDictionary } from '@/content'
import { locales } from '@/content/types'

/**
 * O programa é a FONTE ÚNICA dos andares. Cena, fallback e dicionário leem
 * daqui, então um andar que exista só na cena — ou um objeto clicável sem
 * destino — é um andar invisível para o robô e para o teclado. Estes testes
 * existem para que essa divergência quebre a suíte, e não a página.
 */
describe('programa do prédio', () => {
  it('tem sete paradas, da cobertura ao térreo', () => {
    expect(ANDARES).toHaveLength(7)
    expect(ANDARES[0]!.chave).toBe('cobertura')
    expect(ANDARES[6]!.chave).toBe('recepcao')
  })

  it('desce: cada andar vem abaixo do anterior', () => {
    const numeros = ANDARES.map((a) => a.numero).filter((n): n is number => n !== null)
    expect(numeros).toEqual([...numeros].sort((a, b) => b - a))
  })

  it('cobertura e recepção não têm número; os cinco do meio têm', () => {
    expect(ANDARES[0]!.numero).toBeNull()
    expect(ANDARES[6]!.numero).toBeNull()
    expect(ANDARES.slice(1, 6).every((a) => typeof a.numero === 'number')).toBe(true)
  })

  it('todo objeto clicável tem destino relativo e sem basePath', () => {
    for (const andar of ANDARES) {
      for (const objeto of andar.objetos) {
        expect(objeto.destino.startsWith('/')).toBe(true)
        expect(objeto.destino.startsWith('/portfolio')).toBe(false)
      }
    }
  })

  it('nenhum id de objeto se repete no prédio inteiro', () => {
    const ids = ANDARES.flatMap((a) => a.objetos.map((o) => o.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it.each(locales)('o dicionário %s nomeia todos os andares e objetos', (locale) => {
    const dict = getDictionary(locale)
    for (const andar of ANDARES) {
      expect(dict.predio[andar.chave].titulo).toBeTruthy()
      expect(dict.predio[andar.chave].resumo).toBeTruthy()
      for (const objeto of andar.objetos) {
        expect(dict.predio[andar.chave].objetos[objeto.id]).toBeTruthy()
      }
    }
  })

  it('indiceDe encontra a parada pela chave', () => {
    expect(indiceDe('recepcao')).toBe(6)
    expect(indiceDe('cobertura')).toBe(0)
  })
})
