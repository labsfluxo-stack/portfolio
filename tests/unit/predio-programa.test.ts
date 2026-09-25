import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ANDARES, indiceDe } from '@/components/predio/predio-programa'
import { getDictionary } from '@/content'
import { locales } from '@/content/types'

/**
 * O programa é a FONTE ÚNICA dos andares. Cena, fallback e dicionário leem
 * daqui, então um andar que exista só na cena — ou um objeto clicável sem
 * destino — é um andar invisível para o robô e para o teclado. Estes testes
 * existem para que essa divergência quebre a suíte, e não a página.
 */

/**
 * IDs de âncora que existem de verdade: todo `<Section id="...">` declarado
 * em components/sections/*.tsx. Lido do disco, não escrito à mão — uma seção
 * renomeada ou removida derruba este teste em vez de deixar um
 * `/#andar-fantasma` sobreviver sem que ninguém note (achado do round de
 * revisão: `/sistemas` não é rota, quem aponta para a seção usa `#sistemas`).
 */
function idsDeSecao(): Set<string> {
  const dir = join(process.cwd(), 'components', 'sections')
  const ids = new Set<string>()
  for (const arquivo of readdirSync(dir)) {
    if (!arquivo.endsWith('.tsx')) continue
    const conteudo = readFileSync(join(dir, arquivo), 'utf8')
    for (const match of conteudo.matchAll(/\bid=["']([a-z0-9-]+)["']/g)) ids.add(match[1]!)
  }
  return ids
}

/**
 * Rotas reais sob `app/[locale]/`: todo diretório com `page.tsx` própria.
 * Segmento dinâmico (`[slug]`) nunca vira rota sozinho — precisa de um slug —
 * e grupo de rota (`(site)`) não aparece na URL, exatamente como o Next
 * resolve os dois. Foi a falta desta distinção que deixou `/sistemas` (que
 * só existe como `/sistemas/[slug]`) passar como destino válido.
 */
function rotasReais(): Set<string> {
  const raiz = join(process.cwd(), 'app', '[locale]')
  const rotas = new Set<string>()
  function visitar(caminho: string, prefixo: string) {
    for (const entrada of readdirSync(caminho, { withFileTypes: true })) {
      if (!entrada.isDirectory() || entrada.name.startsWith('[')) continue
      const proximoPrefixo = entrada.name.startsWith('(') ? prefixo : `${prefixo}/${entrada.name}`
      const subcaminho = join(caminho, entrada.name)
      if (existsSync(join(subcaminho, 'page.tsx'))) rotas.add(proximoPrefixo)
      visitar(subcaminho, proximoPrefixo)
    }
  }
  visitar(raiz, '')
  return rotas
}

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

  it('todo destino resolve de verdade: âncora de seção real, ou rota real em app/[locale]', () => {
    const ancoras = idsDeSecao()
    const rotas = rotasReais()
    for (const andar of ANDARES) {
      for (const objeto of andar.objetos) {
        const { destino } = objeto
        const alvo = `${destino} (andar ${andar.chave}, objeto ${objeto.id})`
        if (destino.startsWith('/#')) {
          expect(ancoras.has(destino.slice(2)), `${alvo} não é a âncora de nenhuma <Section>`).toBe(true)
        } else {
          expect(rotas.has(destino), `${alvo} não é uma rota real em app/[locale]`).toBe(true)
        }
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
