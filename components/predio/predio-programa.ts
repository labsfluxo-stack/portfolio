/**
 * Os sete andares como DADO, e não como marcação espalhada pela cena.
 *
 * A cena 3D, o fallback em HTML e o dicionário leem todos daqui. Enquanto o
 * programa morava dentro do componente, um andar novo exigia três edições em
 * três arquivos e a terceira era sempre esquecida — que é como nasce um andar
 * visível no canvas e invisível para o leitor de tela.
 *
 * `kelvin` não é decoração: alimenta `predio-luz.ts`, que deriva dele a cor do
 * andar e a cor do rótulo que sobrevive a ela. Ver a spec, seção "gradiente de
 * temperatura descendo o prédio".
 */

export type ChaveAndar =
  | 'cobertura'
  | 'servidores'
  | 'design'
  | 'geo'
  | 'automacao'
  | 'acolhimento'
  | 'recepcao'

export type ObjetoDoAndar = {
  /** Único no prédio inteiro — vira `key` de lista e âncora de teste. */
  id: string
  /**
   * Destino RELATIVO e sem `basePath`. O `basePath` é `/portfolio` em produção
   * e vazio em teste; quem resolve é o componente, via `next/link`. Destino já
   * prefixado aqui vira `/portfolio/portfolio/...` no site publicado.
   */
  destino: string
  /** Posição no plano da frente, em fração da largura do andar. 0 = esquerda. */
  x: number
}

export type Andar = {
  chave: ChaveAndar
  /** Número exibido. `null` na cobertura e na recepção, que não são numeradas. */
  numero: number | null
  /** Temperatura da luz em kelvin. Quente no topo, fria no meio, quente no fim. */
  kelvin: number
  objetos: readonly ObjetoDoAndar[]
}

/** Do topo para o térreo. A ordem do array É a ordem da descida. */
export const ANDARES: readonly Andar[] = [
  { chave: 'cobertura', numero: null, kelvin: 2400, objetos: [] },
  {
    chave: 'servidores',
    numero: 7,
    kelvin: 2900,
    objetos: [
      { id: 'rack', destino: '/sistemas', x: 0.12 },
      { id: 'backup', destino: '/sistemas', x: 0.82 },
    ],
  },
  {
    chave: 'design',
    numero: 6,
    kelvin: 3600,
    objetos: [
      { id: 'computador', destino: '/sistemas', x: 0.38 },
      { id: 'prancheta', destino: '/projetos', x: 0.72 },
    ],
  },
  {
    chave: 'geo',
    numero: 5,
    kelvin: 4600,
    objetos: [
      { id: 'painel', destino: '/blog', x: 0.2 },
      { id: 'artigos', destino: '/blog', x: 0.68 },
    ],
  },
  {
    chave: 'automacao',
    numero: 4,
    kelvin: 5200,
    objetos: [
      { id: 'esteira', destino: '/projetos', x: 0.3 },
      { id: 'prateleira', destino: '/projetos', x: 0.75 },
    ],
  },
  {
    chave: 'acolhimento',
    numero: 3,
    kelvin: 4200,
    objetos: [{ id: 'balcao', destino: '/projetos', x: 0.25 }],
  },
  {
    chave: 'recepcao',
    numero: null,
    kelvin: 2600,
    objetos: [{ id: 'formulario', destino: '/#contato', x: 0.5 }],
  },
]

export function indiceDe(chave: ChaveAndar): number {
  const i = ANDARES.findIndex((a) => a.chave === chave)
  if (i < 0) throw new Error(`andar desconhecido: ${chave}`)
  return i
}
