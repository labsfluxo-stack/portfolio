# Prédio — a home como descida · Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir a home como um prédio em corte que ocupa a tela inteira, pelo qual o visitante desce da cobertura até a recepção, com objetos clicáveis em cada andar.

**Architecture:** Um único arquivo importa three.js (`Predio.tsx`); todo o resto é lógica pura sobre números, testável em jsdom sem GPU. O estado de repouso é sempre o fallback em HTML semântico — a cena 3D apenas o substitui depois que um efeito no cliente confirma WebGL e movimento não reduzido. É o padrão já provado por `components/three/` (o Pórtico), aplicado a outro objeto.

**Tech Stack:** Next 16 (SSG, `output: 'export'`), React 19, three 0.185 + @react-three/fiber 9 + @react-three/drei 10 (já instalados), Tailwind 4, Vitest 4 + Testing Library, Playwright.

**Spec:** [docs/superpowers/specs/2026-09-06-predio-home-design.md](../specs/2026-09-06-predio-home-design.md)

## Global Constraints

- **Nenhuma dependência nova.** `three`, `@react-three/fiber` e `@react-three/drei` já estão no `package.json`. Instalar qualquer coisa aciona a armadilha do `package-lock.json` que só compila se gerado no Linux — ver `tests/lockfile.test.ts`.
- **Nenhum módulo `predio-*` importa three.js.** São números e funções puras. O componente da cena não sobe em jsdom; se a lógica morar nele, nenhum teste a alcança.
- **Zero `Math.random()`.** Qualquer ruído é função pura do tempo. A cena é idêntica a cada carregamento.
- **O estado de repouso é o fallback.** Nenhum estado visível inicial pode nascer de API só-de-navegador (`matchMedia`, `WebGLRenderingContext`). Mesma classe de bug já corrigida em `components/ui/Counter.tsx`.
- **Celular é requisito, não desejo.** O orçamento de quadro é o do aparelho mediano; o desktop fica com a folga que sobrar.
- **A perspectiva real é promoção, nunca estado inicial.** Cobertura e recepção nascem em parallax.
- **Bilíngue por construção.** Todo texto entra em `content/pt.ts` **e** `content/en.ts`. Módulos carregam chaves, nunca frases.
- **Todo texto sobre cor tem contraste medido.** Reusar `contraste()` de `lib/contraste.ts`. Mínimo AA: 4.5:1 texto normal, 3:1 texto grande.
- **Commits:** convencionais, em português, sem acento no assunto — `feat(predio): ...`. Ao final de cada mensagem: `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

---

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `components/predio/predio-programa.ts` | Os sete andares como dado: número, chave de texto, temperatura de luz, objetos e destinos. Fonte única. |
| `components/predio/predio-arquitetura.ts` | Números do prédio: pé-direito, laje, pilares, os três planos de profundidade e seus fatores de parallax. |
| `components/predio/predio-descida.ts` | Progresso de rolagem → pose de câmera, andar ativo, deslocamento dos planos. O coração. |
| `components/predio/predio-luz.ts` | O gradiente de temperatura descendo o prédio e as cores de rótulo que sobrevivem a ele. |
| `components/predio/predio-qualidade.ts` | Capacidades promovidas sob medição. Reusa `TIERS`/`judge` do Pórtico. |
| `components/predio/PredioFallback.tsx` | O prédio inteiro em HTML semântico. O que o robô lê. |
| `components/predio/PredioSlot.tsx` | Decide entre cena e fallback. Nunca as duas. |
| `components/predio/Predio.tsx` | A cena R3F. **Único arquivo com three.js.** |

**Divergência declarada com a spec:** ela lista um `predio-selecao.ts` para o mapa objeto→destino. Ele não existe neste plano: o destino é campo de `ObjetoDoAndar`, no próprio programa. Um módulo separado seria uma indireção sobre um dado que já tem dono, e um segundo lugar para o par sair de sincronia. Se a seleção ganhar regra de verdade — permissão, estado, condição — aí ele nasce.

---

### Task 1: O programa do prédio

**Files:**
- Create: `components/predio/predio-programa.ts`
- Test: `tests/unit/predio-programa.test.ts`
- Modify: `content/pt.ts`, `content/en.ts`, `content/types.ts`

**Interfaces:**
- Consumes: `Locale` e `Dictionary` de `content/types.ts`.
- Produces: `ChaveAndar`, `ObjetoDoAndar`, `Andar`, `ANDARES` (7 itens, do topo para o térreo), `indiceDe(chave)`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/predio-programa.test.ts
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
    expect(ANDARES[0].chave).toBe('cobertura')
    expect(ANDARES[6].chave).toBe('recepcao')
  })

  it('desce: cada andar vem abaixo do anterior', () => {
    const numeros = ANDARES.map((a) => a.numero).filter((n): n is number => n !== null)
    expect(numeros).toEqual([...numeros].sort((a, b) => b - a))
  })

  it('cobertura e recepção não têm número; os cinco do meio têm', () => {
    expect(ANDARES[0].numero).toBeNull()
    expect(ANDARES[6].numero).toBeNull()
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/predio-programa.test.ts`
Expected: FAIL — `Failed to resolve import "@/components/predio/predio-programa"`

- [ ] **Step 3: Write minimal implementation**

```ts
// components/predio/predio-programa.ts
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
```

- [ ] **Step 4: Estender o dicionário**

Em `content/types.ts`, adicione ao tipo `Dictionary`:

```ts
/**
 * Os textos do prédio, indexados pela mesma chave que `ANDARES` usa. O tipo é
 * `Record<ChaveAndar, ...>` de propósito: esquecer um andar aqui vira erro de
 * tipo no `tsc`, não uma seção sem título no site publicado.
 */
export type TextoDeAndar = {
  titulo: string
  resumo: string
  /** Rótulo acessível de cada objeto clicável, por `id`. */
  objetos: Record<string, string>
}
```

E no tipo `Dictionary`, o campo: `predio: Record<import('@/components/predio/predio-programa').ChaveAndar, TextoDeAndar>`.

Preencha `content/pt.ts` e `content/en.ts` com os sete andares. Exemplo de uma entrada em `pt.ts`:

```ts
predio: {
  cobertura: {
    titulo: 'Cobertura',
    resumo: 'De onde se vê o todo. Sistemas em produção, rodando sem drama.',
    objetos: {},
  },
  servidores: {
    titulo: 'Servidores',
    resumo: 'Hospedagem, backup e o uptime que sustenta o resto do prédio.',
    objetos: { rack: 'Ver os sistemas em produção', backup: 'Como o backup funciona' },
  },
  // ... design, geo, automacao, acolhimento, recepcao
},
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- tests/unit/predio-programa.test.ts` e `npm run typecheck`
Expected: PASS nos dois.

- [ ] **Step 6: Commit**

```bash
git add components/predio/predio-programa.ts tests/unit/predio-programa.test.ts content/
git commit -m "$(cat <<'EOF'
feat(predio): os sete andares como fonte unica de dado

Cena, fallback e dicionario passam a ler do mesmo lugar. O tipo do
dicionario e Record<ChaveAndar>, entao esquecer um andar vira erro de
tsc em vez de secao sem titulo no site publicado.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: A arquitetura em números

**Files:**
- Create: `components/predio/predio-arquitetura.ts`
- Test: `tests/unit/predio-arquitetura.test.ts`

**Interfaces:**
- Consumes: `ANDARES` de `predio-programa.ts`.
- Produces: `PE_DIREITO`, `LAJE`, `ALTURA_ANDAR`, `PILARES`, `PLANOS`, `SOL`, `alturaTotal()`, `topoDoAndar(indice)`, `centroDoAndar(indice)`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/predio-arquitetura.test.ts
import { describe, expect, it } from 'vitest'
import {
  ALTURA_ANDAR,
  LAJE,
  PE_DIREITO,
  PILARES,
  PLANOS,
  SOL,
  alturaTotal,
  centroDoAndar,
  topoDoAndar,
} from '@/components/predio/predio-arquitetura'
import { ANDARES } from '@/components/predio/predio-programa'

describe('arquitetura do prédio', () => {
  it('o andar é o pé-direito mais a laje', () => {
    expect(ALTURA_ANDAR).toBeCloseTo(PE_DIREITO + LAJE, 5)
  })

  it('a altura total cobre os sete andares', () => {
    expect(alturaTotal()).toBeCloseTo(ALTURA_ANDAR * ANDARES.length, 5)
  })

  it('o topo do andar zero é o topo do prédio, e desce dali', () => {
    expect(topoDoAndar(0)).toBeCloseTo(0, 5)
    expect(topoDoAndar(1)).toBeCloseTo(-ALTURA_ANDAR, 5)
    expect(topoDoAndar(6)).toBeCloseTo(-ALTURA_ANDAR * 6, 5)
  })

  it('o centro fica meio pé-direito abaixo do topo do andar', () => {
    expect(centroDoAndar(0)).toBeCloseTo(-PE_DIREITO / 2, 5)
  })

  /**
   * Os três planos são o que faz a profundidade existir sem custo de geometria.
   * O de trás precisa andar MENOS que o da frente — é essa diferença, e só ela,
   * que o cérebro lê como distância. Fatores iguais seriam três cópias do mesmo
   * plano com passos extras de desenho.
   */
  it('os planos vão do fundo para a frente, com parallax crescente', () => {
    expect(PLANOS).toHaveLength(3)
    const fatores = PLANOS.map((p) => p.parallax)
    expect(fatores).toEqual([...fatores].sort((a, b) => a - b))
    expect(PLANOS[2].parallax).toBe(1)
    expect(PLANOS[0].parallax).toBeGreaterThan(0)
  })

  it('o plano da frente é o z zero — é nele que o objeto clicável mora', () => {
    expect(PLANOS[2].z).toBe(0)
    expect(PLANOS[0].z).toBeLessThan(PLANOS[1].z)
  })

  /**
   * Sol BAIXO. Elevação alta anula a sombra lateral, e sem sombra lateral os
   * três planos colapsam num só: some exatamente a profundidade que eles
   * existem para criar. Ver a spec, "por que a hora dourada".
   */
  it('o sol é rasante', () => {
    expect(SOL.elevacao).toBeGreaterThan(0)
    expect(SOL.elevacao).toBeLessThan(18)
  })

  it('há pilar no centro e um de cada lado', () => {
    expect(PILARES).toContain(0)
    expect(PILARES.some((x) => x < 0)).toBe(true)
    expect(PILARES.some((x) => x > 0)).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/predio-arquitetura.test.ts`
Expected: FAIL — módulo não resolvido.

- [ ] **Step 3: Write minimal implementation**

```ts
// components/predio/predio-arquitetura.ts
/**
 * O prédio em números, sem three.js.
 *
 * Tudo aqui é metro e grau — nada de unidade de tela. A cena converte na hora
 * de desenhar; o fallback ignora. Assim a mesma medida serve para os dois e
 * não existe um segundo prédio, com outras proporções, escondido no CSS.
 */
import { ANDARES } from './predio-programa'

/** Metros. Pé-direito generoso: o andar precisa caber objeto e sombra longa. */
export const PE_DIREITO = 3.2
/** Espessura da laje. É ela que recebe o facho e ganha volume. */
export const LAJE = 0.35
export const ALTURA_ANDAR = PE_DIREITO + LAJE

/**
 * Os pilares atravessam a descida inteira, e não são estrutura decorativa: sem
 * um elemento contínuo, cada andar entra e sai como um slide e a queda deixa de
 * ser uma queda. São eles que costuram as sete paradas numa coisa só.
 */
export const PILARES = [-6.4, 0, 6.4] as const

/**
 * Os três planos de profundidade, do fundo para a frente.
 *
 * `parallax` é a fração da rolagem que o plano acompanha. O fundo anda pouco, a
 * frente acompanha inteiro, e a diferença entre eles É a profundidade. O da
 * frente é obrigatoriamente 1 e z = 0: ele é o plano de referência, e é onde os
 * objetos clicáveis moram — âncora de DOM sobre plano que se desloca em outra
 * velocidade erraria o alvo.
 */
export const PLANOS = [
  { nome: 'fundo', z: -4.2, parallax: 0.35 },
  { nome: 'meio', z: -2.0, parallax: 0.65 },
  { nome: 'frente', z: 0, parallax: 1 },
] as const

/**
 * Hora dourada: sol rasante entrando pela direita.
 *
 * `elevacao` em graus acima do horizonte. Baixo de propósito — é a inclinação
 * que joga a sombra longa e horizontal que separa os três planos. Subir este
 * número achata a cena inteira, e nenhum outro ajuste compensa.
 */
export const SOL = { azimute: 104, elevacao: 8.5 } as const

export function alturaTotal(): number {
  return ALTURA_ANDAR * ANDARES.length
}

/** Y do topo do andar. Zero é o topo do prédio; desce para negativo. */
export function topoDoAndar(indice: number): number {
  return -ALTURA_ANDAR * indice
}

/** Y do meio do pé-direito — a altura em que a câmera olha o andar. */
export function centroDoAndar(indice: number): number {
  return topoDoAndar(indice) - PE_DIREITO / 2
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/predio-arquitetura.test.ts`
Expected: PASS (9 testes).

- [ ] **Step 5: Commit**

```bash
git add components/predio/predio-arquitetura.ts tests/unit/predio-arquitetura.test.ts
git commit -m "$(cat <<'EOF'
feat(predio): o predio em metros e graus, fora do three.js

Pe-direito, laje, pilares continuos, os tres planos de parallax e o sol
rasante. Teste trava a elevacao do sol abaixo de 18 graus: sol alto anula
a sombra lateral e os tres planos colapsam num so.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: A descida

Esta é a tarefa que decide se o site parece fluido. É toda função pura.

**Files:**
- Create: `components/predio/predio-descida.ts`
- Test: `tests/unit/predio-descida.test.ts`

**Interfaces:**
- Consumes: `ALTURA_ANDAR`, `PLANOS`, `centroDoAndar` de `predio-arquitetura.ts`; `ANDARES` de `predio-programa.ts`.
- Produces: `type Pose = { y: number; z: number }`, `type Quadro = { pose: Pose; andar: number; estacao: number; planos: readonly number[] }`, `quadroDe(progresso: number): Quadro`, `amortecer(atual: number, alvo: number, delta: number): number`, `TAXA_DE_AMORTECIMENTO`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/predio-descida.test.ts
import { describe, expect, it } from 'vitest'
import { TAXA_DE_AMORTECIMENTO, amortecer, quadroDe } from '@/components/predio/predio-descida'
import { ANDARES } from '@/components/predio/predio-programa'
import { PLANOS, centroDoAndar } from '@/components/predio/predio-arquitetura'

describe('descida', () => {
  it('progresso 0 põe a câmera na cobertura', () => {
    const q = quadroDe(0)
    expect(q.andar).toBe(0)
    expect(q.pose.y).toBeCloseTo(centroDoAndar(0), 3)
  })

  it('progresso 1 põe a câmera na recepção', () => {
    const q = quadroDe(1)
    expect(q.andar).toBe(ANDARES.length - 1)
    expect(q.pose.y).toBeCloseTo(centroDoAndar(ANDARES.length - 1), 3)
  })

  it('a câmera só desce, nunca sobe', () => {
    let anterior = Infinity
    for (let p = 0; p <= 1; p += 0.01) {
      const y = quadroDe(p).pose.y
      expect(y).toBeLessThanOrEqual(anterior + 1e-9)
      anterior = y
    }
  })

  /**
   * O andar ativo não pode piscar. Enquanto a estação era escolhida por
   * arredondamento simples, o índice oscilava entre dois valores na fronteira e
   * o rótulo tremia — defeito visível justamente na parada, que é onde o
   * visitante está lendo.
   */
  it('o andar ativo nunca anda para trás', () => {
    let anterior = -1
    for (let p = 0; p <= 1; p += 0.005) {
      const atual = quadroDe(p).andar
      expect(atual).toBeGreaterThanOrEqual(anterior)
      anterior = atual
    }
  })

  it('todos os sete andares são visitados ao longo da descida', () => {
    const vistos = new Set<number>()
    for (let p = 0; p <= 1; p += 0.002) vistos.add(quadroDe(p).andar)
    expect(vistos.size).toBe(ANDARES.length)
  })

  it('a estação vai de 0 a 1 dentro do andar', () => {
    for (let p = 0; p <= 1; p += 0.01) {
      const { estacao } = quadroDe(p)
      expect(estacao).toBeGreaterThanOrEqual(0)
      expect(estacao).toBeLessThanOrEqual(1)
    }
  })

  it('há um plano por camada de profundidade', () => {
    expect(quadroDe(0.5).planos).toHaveLength(PLANOS.length)
  })

  /**
   * O fundo tem que ficar PARA TRÁS da frente conforme se desce. Se os
   * deslocamentos empatam, os três planos viraram um só e o parallax não existe.
   */
  it('o plano do fundo desloca menos que o da frente', () => {
    const { planos } = quadroDe(0.5)
    expect(Math.abs(planos[0])).toBeLessThan(Math.abs(planos[2]))
  })

  it('fora da faixa, o progresso é aparado em vez de estourar', () => {
    expect(quadroDe(-3).andar).toBe(0)
    expect(quadroDe(9).andar).toBe(ANDARES.length - 1)
  })
})

describe('amortecimento', () => {
  it('aproxima do alvo sem ultrapassar', () => {
    const y = amortecer(0, 10, 1 / 60)
    expect(y).toBeGreaterThan(0)
    expect(y).toBeLessThan(10)
  })

  it('já no alvo, fica no alvo', () => {
    expect(amortecer(5, 5, 1 / 60)).toBeCloseTo(5, 9)
  })

  /**
   * INDEPENDENTE DA TAXA DE QUADROS, e isto não é preciosismo: com o clássico
   * `atual += (alvo - atual) * 0.1`, a mesma rolagem chega mais devagar num
   * monitor de 60 Hz do que num de 144 Hz. O site fica com "peso" diferente por
   * máquina — que é a definição de movimento não confiável.
   */
  it('o mesmo tempo total dá o mesmo resultado, em qualquer taxa de quadros', () => {
    let a60 = 0
    for (let i = 0; i < 60; i++) a60 = amortecer(a60, 10, 1 / 60)
    let a144 = 0
    for (let i = 0; i < 144; i++) a144 = amortecer(a144, 10, 1 / 144)
    expect(a60).toBeCloseTo(a144, 4)
  })

  it('a taxa é positiva', () => {
    expect(TAXA_DE_AMORTECIMENTO).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/predio-descida.test.ts`
Expected: FAIL — módulo não resolvido.

- [ ] **Step 3: Write minimal implementation**

```ts
// components/predio/predio-descida.ts
/**
 * O trecho de rolagem vira pose de câmera. É o coração da sensação, e é por
 * isso que ele mora fora da cena: função pura sobre números se testa em jsdom,
 * e a fluidez passa a ter suíte em vez de opinião.
 */
import { ANDARES } from './predio-programa'
import { PLANOS, centroDoAndar } from './predio-arquitetura'

export type Pose = { y: number; z: number }

export type Quadro = {
  pose: Pose
  /** Índice do andar ativo em `ANDARES`. */
  andar: number
  /** 0..1 dentro do andar ativo. 0 = acabou de entrar; 1 = saindo. */
  estacao: number
  /** Deslocamento vertical de cada plano, na ordem de `PLANOS`. */
  planos: readonly number[]
}

/**
 * Quanto da rolagem de um andar é gasto PARANDO nele.
 *
 * Sem parada, a câmera atravessa os sete andares em velocidade constante e
 * ninguém lê nada: é um elevador em queda, não uma visita. Com parada, cada
 * andar tem um trecho em que a câmera quase não anda — e é nele que o rótulo,
 * o resumo e os objetos ficam legíveis.
 */
const PARADA = 0.45

/** Distância da câmera ao plano da frente, em metros. */
const RECUO = 11.5

export const TAXA_DE_AMORTECIMENTO = 9

const aparar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/**
 * Curva de estação: acelera entre andares, quase para dentro do andar.
 *
 * É um `smoothstep` invertido no miolo. A alternativa óbvia — velocidade
 * constante com um `scroll-snap` por cima — foi descartada porque o snap
 * SEQUESTRA a rolagem do visitante: no celular ele briga com o dedo e produz
 * exatamente o engasgo que este projeto existe para não ter.
 */
function comParada(t: number): number {
  const s = t * t * (3 - 2 * t)
  return t + (s - t) * PARADA
}

export function quadroDe(progresso: number): Quadro {
  const p = aparar(progresso, 0, 1)
  const ultimo = ANDARES.length - 1

  // Posição contínua na pilha, em "andares".
  const bruto = p * ultimo
  const indice = Math.min(ultimo, Math.floor(bruto))
  const dentro = ultimo === 0 ? 0 : bruto - indice
  const suave = indice + comParada(dentro)

  const alvo = centroDoAndar(0)
  const chao = centroDoAndar(ultimo)
  const y = alvo + ((chao - alvo) * suave) / ultimo

  return {
    pose: { y, z: RECUO },
    andar: indice,
    estacao: comParada(dentro),
    // O plano acompanha a descida na fração do seu parallax. O da frente
    // (fator 1) acompanha inteiro e serve de referência para os outros dois.
    planos: PLANOS.map((plano) => y * plano.parallax),
  }
}

/**
 * Amortecimento exponencial, independente da taxa de quadros.
 *
 * `1 - e^(-k·dt)` em vez de um fator fixo por quadro. Ver o teste: com fator
 * fixo, o mesmo movimento tem peso diferente em 60 Hz e em 144 Hz.
 */
export function amortecer(atual: number, alvo: number, delta: number): number {
  return atual + (alvo - atual) * (1 - Math.exp(-TAXA_DE_AMORTECIMENTO * delta))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/predio-descida.test.ts`
Expected: PASS (13 testes).

- [ ] **Step 5: Commit**

```bash
git add components/predio/predio-descida.ts tests/unit/predio-descida.test.ts
git commit -m "$(cat <<'EOF'
feat(predio): a descida como funcao pura, com suite

Progresso de rolagem vira pose de camera, andar ativo e deslocamento dos
tres planos. Fora da cena de proposito: fluidez passa a ter teste em vez
de opiniao. Amortecimento e exponencial, entao 60 Hz e 144 Hz tem o mesmo
peso -- travado por teste.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: A luz e a legibilidade

**Files:**
- Create: `components/predio/predio-luz.ts`
- Test: `tests/unit/predio-luz.test.ts`

**Interfaces:**
- Consumes: `ANDARES` de `predio-programa.ts`; `contraste` de `lib/contraste.ts`.
- Produces: `corDoAndar(indice): string` (hex), `corDoRotulo(indice): string` (hex), `MINIMO_AA`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/predio-luz.test.ts
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
    expect(k[k.length - 1]).toBeLessThan(k[meio])
    expect(k[0]).toBeLessThan(k[meio])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/predio-luz.test.ts`
Expected: FAIL — módulo não resolvido.

- [ ] **Step 3: Write minimal implementation**

```ts
// components/predio/predio-luz.ts
/**
 * A cor de cada andar, derivada da temperatura declarada no programa, e o
 * rótulo que sobrevive a ela.
 *
 * O par cor-de-fundo/cor-de-texto NÃO é escolhido por gosto: é escolhido e
 * depois MEDIDO em `tests/unit/predio-luz.test.ts`. Trocar um hex sem conferir
 * o contraste quebra a suíte, que é como este projeto já protege a landing
 * (`tests/unit/contraste.test.ts`).
 */
import { ANDARES } from './predio-programa'

/** WCAG 2.1 AA para texto normal. */
export const MINIMO_AA = 4.5

/**
 * Cor do ar de cada andar, do topo para o térreo.
 *
 * Escrita à mão, e não calculada a partir do kelvin, de propósito: a conversão
 * kelvin→sRGB dá cores fisicamente corretas e visualmente sujas nas pontas do
 * arco. O kelvin do programa diz a INTENÇÃO; estes hex são a intenção afinada
 * a olho e depois medida.
 */
const AR = [
  '#3a2b22', // cobertura — âmbar profundo, o sol batendo raso
  '#3d2f26', // servidores
  '#3b3130', // design
  '#33313d', // geo — o miolo é o ponto mais frio
  '#2f3242', // automação
  '#382f36', // acolhimento — começa a esquentar de volta
  '#43301f', // recepção — luz artificial, quente
] as const

/** Âmbar claro o bastante para passar AA sobre todos os ares acima. */
const ROTULO = '#f6e2c4'

export function corDoAndar(indice: number): string {
  return AR[Math.min(AR.length - 1, Math.max(0, indice))]
}

export function corDoRotulo(_indice: number): string {
  // Um rótulo só para o prédio inteiro. Variar por andar traria sete pares para
  // medir e sete chances de um passar despercebido — e a descida ficaria com o
  // texto mudando de cor no meio, que lê como erro, não como intenção.
  return ROTULO
}

// Guarda de desenvolvimento: o número de ares tem de acompanhar o de andares.
if (AR.length !== ANDARES.length) {
  throw new Error(`predio-luz: ${AR.length} ares para ${ANDARES.length} andares`)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/predio-luz.test.ts`
Expected: PASS. Se algum andar falhar o AA, clareie `ROTULO` ou escureça o `AR` daquele andar — **não** baixe o mínimo.

- [ ] **Step 5: Commit**

```bash
git add components/predio/predio-luz.ts tests/unit/predio-luz.test.ts
git commit -m "$(cat <<'EOF'
feat(predio): a cor de cada andar, com contraste medido

O arco de temperatura (quente no topo, frio no miolo, quente na recepcao)
vira hex afinado a olho e depois medido contra AA. Trocar uma cor sem
conferir quebra a suite, como ja acontece na landing.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: A perspectiva como promoção

**Files:**
- Create: `components/predio/predio-qualidade.ts`
- Test: `tests/unit/predio-qualidade.test.ts`

**Interfaces:**
- Consumes: `TIERS` de `components/three/portico-quality.ts`.
- Produces: `type Capacidades = { perspectiva: boolean }`, `CAPACIDADES_INICIAIS`, `DEGRAU_DA_PERSPECTIVA`, `capacidadesDo(degrau: number): Capacidades`, `temPerspectiva(indice: number, cap: Capacidades): boolean`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/predio-qualidade.test.ts
import { describe, expect, it } from 'vitest'
import {
  CAPACIDADES_INICIAIS,
  DEGRAU_DA_PERSPECTIVA,
  capacidadesDo,
  temPerspectiva,
} from '@/components/predio/predio-qualidade'
import { TIERS } from '@/components/three/portico-quality'
import { ANDARES } from '@/components/predio/predio-programa'

/**
 * "Celular é requisito, não desejo" (spec). A tradução disso em código é uma
 * só: a perspectiva real NUNCA é o estado inicial. Ela sobe quando o quadro
 * prova folga, e num aparelho que não sustenta ninguém vê tela quebrada — vê
 * parallax, que já é bonito sozinho.
 */
describe('qualidade do prédio', () => {
  it('a perspectiva não existe no estado inicial', () => {
    expect(CAPACIDADES_INICIAIS.perspectiva).toBe(false)
  })

  it('a perspectiva só aparece no degrau mais alto', () => {
    expect(DEGRAU_DA_PERSPECTIVA).toBe(0)
    expect(capacidadesDo(0).perspectiva).toBe(true)
    for (let d = 1; d < TIERS.length; d++) {
      expect(capacidadesDo(d).perspectiva).toBe(false)
    }
  })

  it('degrau fora da escada não liga nada', () => {
    expect(capacidadesDo(-1).perspectiva).toBe(false)
    expect(capacidadesDo(TIERS.length + 5).perspectiva).toBe(false)
  })

  it('só as duas pontas ganham perspectiva, e só com folga', () => {
    const cheio = { perspectiva: true }
    expect(temPerspectiva(0, cheio)).toBe(true)
    expect(temPerspectiva(ANDARES.length - 1, cheio)).toBe(true)
    for (let i = 1; i < ANDARES.length - 1; i++) {
      expect(temPerspectiva(i, cheio)).toBe(false)
    }
  })

  it('sem folga, nem as pontas ganham', () => {
    expect(temPerspectiva(0, CAPACIDADES_INICIAIS)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/predio-qualidade.test.ts`
Expected: FAIL — módulo não resolvido.

- [ ] **Step 3: Write minimal implementation**

```ts
// components/predio/predio-qualidade.ts
/**
 * O que a cena pode se dar ao luxo de fazer, dado o degrau em que a escada de
 * qualidade parou.
 *
 * A escada em si NÃO é reimplementada: `TIERS`, `judge` e `measureVsync` vivem
 * em `components/three/portico-quality.ts` e já são medidos e testados. Este
 * módulo só traduz "em que degrau estou" para "o que eu ligo".
 */
import { TIERS } from '../three/portico-quality'
import { ANDARES } from './predio-programa'

export type Capacidades = {
  /** Andar como sala de verdade, com fundo e parede oposta visíveis. */
  perspectiva: boolean
}

/**
 * O repouso é sempre o mais barato.
 *
 * Nascer com a perspectiva ligada e desligá-la ao detectar lentidão inverte o
 * ônus: quem tem aparelho fraco pagaria os primeiros segundos — justamente os
 * segundos em que está chegando e rolando — para só depois ser socorrido. O
 * Pórtico já aprendeu isso; ver o comentário de `TIERS`.
 */
export const CAPACIDADES_INICIAIS: Capacidades = { perspectiva: false }

/** Só o degrau de estúdio paga perspectiva. */
export const DEGRAU_DA_PERSPECTIVA = 0

export function capacidadesDo(degrau: number): Capacidades {
  const dentroDaEscada = degrau >= 0 && degrau < TIERS.length
  return { perspectiva: dentroDaEscada && degrau <= DEGRAU_DA_PERSPECTIVA }
}

/**
 * Perspectiva só na primeira e na última impressão — compra-se o impacto onde
 * ele decide e paga-se parallax nos cinco do meio.
 */
export function temPerspectiva(indice: number, cap: Capacidades): boolean {
  if (!cap.perspectiva) return false
  return indice === 0 || indice === ANDARES.length - 1
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/predio-qualidade.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add components/predio/predio-qualidade.ts tests/unit/predio-qualidade.test.ts
git commit -m "$(cat <<'EOF'
feat(predio): perspectiva vira promocao, nunca estado inicial

Celular e requisito: a cena nasce em parallax e so promove perspectiva no
degrau de estudio, e so nas duas pontas. Reusa TIERS do portico em vez de
reimplementar a escada.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: O fallback — o prédio que o robô lê

**Files:**
- Create: `components/predio/PredioFallback.tsx`
- Test: `tests/unit/predio-fallback.test.tsx`

**Interfaces:**
- Consumes: `ANDARES` (Task 1), `corDoAndar`/`corDoRotulo` (Task 4), `getDictionary` de `@/content`.
- Produces: `<PredioFallback dict={Dictionary} locale={Locale} />`.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/predio-fallback.test.tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
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
      expect(screen.getByText(dict.predio[andar.chave].titulo)).toBeInTheDocument()
      expect(screen.getByText(dict.predio[andar.chave].resumo)).toBeInTheDocument()
    }
  })

  /**
   * O objeto clicável da cena e o link do fallback são O MESMO destino. Se
   * divergirem, existe conteúdo alcançável por mouse em 3D e inalcançável por
   * teclado — que é o defeito que este componente existe para impedir.
   */
  it('todo objeto clicável vira um link real, com texto acessível', () => {
    render(<PredioFallback dict={dict} locale="pt" />)
    for (const andar of ANDARES) {
      for (const objeto of andar.objetos) {
        const link = screen.getByRole('link', {
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
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/predio-fallback.test.tsx`
Expected: FAIL — módulo não resolvido.

- [ ] **Step 3: Write minimal implementation**

```tsx
// components/predio/PredioFallback.tsx
import Link from 'next/link'
import type { Dictionary, Locale } from '@/content/types'
import { ANDARES } from './predio-programa'
import { corDoAndar, corDoRotulo } from './predio-luz'

/**
 * O prédio inteiro em HTML semântico — e não um aviso de navegador sem suporte.
 *
 * É o que o GPTBot/ClaudeBot lê, o que aparece antes do JS hidratar, o que roda
 * em aparelho sem WebGL e o que fica no lugar da cena quando o visitante pediu
 * movimento reduzido. Por isso carrega o texto de verdade e os links de verdade:
 * quem cai aqui recebe o site, não uma desculpa.
 *
 * A cor vem de `predio-luz.ts`, a mesma que a cena usa, então o fallback é a
 * versão chapada do mesmo prédio — não um segundo desenho que envelhece sozinho.
 */
export function PredioFallback({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  return (
    <div className="w-full">
      {ANDARES.map((andar, i) => {
        const texto = dict.predio[andar.chave]
        return (
          <section
            key={andar.chave}
            aria-labelledby={`predio-${andar.chave}`}
            style={{ backgroundColor: corDoAndar(i), color: corDoRotulo(i) }}
            className="px-6 py-14 sm:px-10"
          >
            <div className="mx-auto flex max-w-5xl flex-col gap-3">
              {andar.numero !== null && (
                <span className="font-mono text-xs opacity-70">
                  {String(andar.numero).padStart(2, '0')}
                </span>
              )}
              <h2 id={`predio-${andar.chave}`} className="text-2xl font-semibold">
                {texto.titulo}
              </h2>
              <p className="max-w-2xl opacity-90">{texto.resumo}</p>
              {andar.objetos.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-4">
                  {andar.objetos.map((objeto) => (
                    <li key={objeto.id}>
                      <Link
                        href={`/${locale}${objeto.destino}`}
                        // 44px de alvo de toque. Abaixo disso o dedo erra, e
                        // celular é requisito nesta home.
                        className="inline-flex min-h-11 items-center underline underline-offset-4"
                      >
                        {texto.objetos[objeto.id]}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/predio-fallback.test.tsx`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add components/predio/PredioFallback.tsx tests/unit/predio-fallback.test.tsx
git commit -m "$(cat <<'EOF'
feat(predio): o predio inteiro em HTML semantico

Nao e aviso de navegador sem suporte: sao as sete paradas com texto e
links de verdade, na ordem da descida. E o que o robo le, o que aparece
antes de hidratar e o que fica com movimento reduzido ligado.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: O slot — quem decide entre cena e fallback

**Files:**
- Create: `components/predio/PredioSlot.tsx`
- Test: `tests/unit/predio-slot.test.tsx`

**Interfaces:**
- Consumes: `PredioFallback` (Task 6); `hasWebGL` de `components/three/PorticoSlot.tsx`; `measureVsync`/`VSYNC_DEFAULT` de `components/three/portico-quality.ts`.
- Produces: `<PredioSlot dict locale />`.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/predio-slot.test.tsx
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PredioSlot } from '@/components/predio/PredioSlot'
import { getDictionary } from '@/content'

const dict = getDictionary('pt')

/**
 * jsdom não tem WebGL, então este arquivo NÃO testa a cena — testa a decisão.
 * E a decisão é a parte que erra em silêncio: um slot que monte a cena cedo
 * demais, ou que ignore movimento reduzido, produz um site que parece bom no
 * desktop de quem o escreveu e falha em todo o resto.
 */
function comMovimentoReduzido(reduzido: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: reduzido && query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
}

beforeEach(() => {
  vi.unstubAllGlobals()
})

describe('slot do prédio', () => {
  it('o primeiro render é o fallback, sempre', () => {
    comMovimentoReduzido(false)
    render(<PredioSlot dict={dict} locale="pt" />)
    expect(screen.getAllByRole('region').length).toBeGreaterThan(0)
  })

  it('sem WebGL, o fallback permanece', () => {
    comMovimentoReduzido(false)
    render(<PredioSlot dict={dict} locale="pt" />)
    // jsdom não dá contexto WebGL: `hasWebGL()` é falso e a cena nunca sobe.
    expect(screen.queryByTestId('predio-canvas')).not.toBeInTheDocument()
  })

  it('com movimento reduzido, o fallback permanece', () => {
    comMovimentoReduzido(true)
    render(<PredioSlot dict={dict} locale="pt" />)
    expect(screen.queryByTestId('predio-canvas')).not.toBeInTheDocument()
    expect(screen.getAllByRole('region').length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/predio-slot.test.tsx`
Expected: FAIL — módulo não resolvido.

- [ ] **Step 3: Write minimal implementation**

```tsx
// components/predio/PredioSlot.tsx
'use client'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import type { Dictionary, Locale } from '@/content/types'
import { PredioFallback } from './PredioFallback'
import { hasWebGL } from '../three/PorticoSlot'
import { VSYNC_DEFAULT, measureVsync } from '../three/portico-quality'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

// `ssr: false` exige Client Component — daí o 'use client' acima. O chunk de
// `Predio.tsx`, e com ele todo o three.js, nunca entra no HTML inicial.
const Predio = dynamic(() => import('./Predio').then((m) => m.Predio), { ssr: false })

/**
 * Decide entre a cena e o fallback — nunca as duas ao mesmo tempo.
 *
 * O repouso é o fallback, antes de qualquer efeito. Isso não é cautela: é o que
 * faz o HTML estático nunca nascer vazio, e o que evita inicializar estado
 * visível a partir de `matchMedia` — API que não existe no servidor e que, se
 * decidisse o primeiro render, resolveria sempre para o valor errado.
 *
 * A montagem espera `load` E DEPOIS ociosidade. Só ociosidade não basta: no
 * Pórtico, mediu-se o canvas já presente aos 400 ms no site publicado, porque o
 * navegador acha folga entre um recurso e outro e monta a cena no meio do
 * carregamento — exatamente o momento a evitar.
 */
export function PredioSlot({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const [cena, setCena] = useState(false)
  const [vsync, setVsync] = useState(VSYNC_DEFAULT)

  useEffect(() => {
    if (!hasWebGL()) return
    let vivo = true
    const motionQuery = window.matchMedia(REDUCED_MOTION_QUERY)
    let idle: number | undefined
    let timer: number | undefined

    const agendar = () => {
      // A medida do monitor é honesta só nesta janela: a página terminou de
      // carregar e a cena ainda não existe, então o rAF entrega a taxa do
      // monitor e não o custo do que está rodando.
      void measureVsync().then((v) => vivo && setVsync(v))
      const montar = () => {
        performance.mark?.('predio:montagemPedida')
        if (vivo) setCena(true)
      }
      if (typeof window.requestIdleCallback === 'function') {
        idle = window.requestIdleCallback(montar, { timeout: 2000 })
      } else {
        // Safari não implementa requestIdleCallback até hoje.
        timer = window.setTimeout(montar, 600)
      }
    }

    const avaliar = () => {
      if (motionQuery.matches) {
        setCena(false)
        return
      }
      if (document.readyState === 'complete') agendar()
      else window.addEventListener('load', agendar, { once: true })
    }
    avaliar()

    motionQuery.addEventListener('change', avaliar)
    return () => {
      vivo = false
      motionQuery.removeEventListener('change', avaliar)
      window.removeEventListener('load', agendar)
      if (idle !== undefined) window.cancelIdleCallback?.(idle)
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [])

  // O fallback continua no DOM sob a cena: ele é o conteúdo indexável e o
  // destino do teclado. A cena o cobre visualmente, não o substitui.
  return (
    <div className="relative w-full">
      {cena && <Predio dict={dict} locale={locale} vsync={vsync} />}
      <div className={cena ? 'sr-only' : undefined}>
        <PredioFallback dict={dict} locale={locale} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/predio-slot.test.tsx` e `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/predio/PredioSlot.tsx tests/unit/predio-slot.test.tsx
git commit -m "$(cat <<'EOF'
feat(predio): o slot decide entre cena e fallback

Repouso e sempre o fallback; a cena so sobe apos load E ociosidade, com
WebGL confirmado e movimento reduzido desligado. Mesmo padrao do
PorticoSlot, inclusive o motivo medido de nao bastar requestIdleCallback.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: A cena

Único arquivo com three.js. Não tem teste de unidade — three.js não sobe em jsdom; a verificação é a Task 9 e o navegador.

**Files:**
- Create: `components/predio/Predio.tsx`

**Interfaces:**
- Consumes: tudo das Tasks 1–5.
- Produces: `<Predio dict locale vsync />`, com `data-testid="predio-canvas"` no container.

- [ ] **Step 1: Escrever a cena**

Estrutura obrigatória, na ordem:

1. `'use client'` e um `<div data-testid="predio-canvas" className="fixed inset-0 -z-10">` envolvendo o `<Canvas>`. A página rola; o canvas fica parado atrás dela.
2. O progresso vem de `window.scrollY / (document.body.scrollHeight - innerHeight)`, lido num listener `{ passive: true }` que **só guarda o número num ref** — nenhum `setState` por evento de rolagem, ou o React re-renderiza a cada pixel.
3. Dentro de `useFrame((_, delta) => …)`: `alvo = quadroDe(progressoRef.current)`, depois `camera.position.y = amortecer(camera.position.y, alvo.pose.y, delta)`. **Todo o movimento acontece aqui**, nunca em `useEffect`.
4. Um `<directionalLight castShadow />` posicionado a partir de `SOL` — é ele que faz a sombra longa. Só ele projeta.
5. Um grupo por plano de `PLANOS`, deslocado por `quadro.planos[i]`.
6. Só três andares vivos: `andar - 1`, `andar`, `andar + 1`. Os demais não entram na árvore.
7. A escada de qualidade: `judge()` de `portico-quality`, e `capacidadesDo(degrau)` da Task 5 decidindo perspectiva.
8. Os objetos clicáveis **não** usam raycast para clicar. Cada um recebe um `<a>` absoluto por cima, posicionado em CSS a partir de `objeto.x`. O raycast só liga o brilho do hover.

O núcleo — rolagem até câmera — é a parte que erra em silêncio, então vai escrita aqui em vez de descrita:

```tsx
/**
 * A rolagem entra por um REF, nunca por estado.
 *
 * `setState` a cada evento de rolagem re-renderiza a árvore inteira a cada
 * pixel e transforma uma descida suave numa apresentação de slides. O React
 * não participa do movimento: ele monta a cena, e o `useFrame` a anima.
 *
 * `{ passive: true }` promete ao navegador que não haverá `preventDefault`, o
 * que mantém a rolagem na thread de composição. É também por isso que não
 * entra biblioteca de scroll suave aqui: interceptar wheel/touch para
 * interpolar é exatamente o que piora o INP.
 */
function useProgressoDeRolagem() {
  const progresso = useRef(0)
  useEffect(() => {
    const ler = () => {
      const curso = document.body.scrollHeight - window.innerHeight
      progresso.current = curso > 0 ? window.scrollY / curso : 0
    }
    ler()
    window.addEventListener('scroll', ler, { passive: true })
    window.addEventListener('resize', ler, { passive: true })
    return () => {
      window.removeEventListener('scroll', ler)
      window.removeEventListener('resize', ler)
    }
  }, [])
  return progresso
}

/** Todo o movimento acontece aqui dentro. Em nenhum `useEffect`. */
function Camera({ progresso }: { progresso: React.RefObject<number> }) {
  const grupos = useRef<THREE.Group[]>([])
  useFrame(({ camera }, delta) => {
    const quadro = quadroDe(progresso.current)
    camera.position.y = amortecer(camera.position.y, quadro.pose.y, delta)
    camera.position.z = quadro.pose.z
    grupos.current.forEach((grupo, i) => {
      if (grupo) grupo.position.y = amortecer(grupo.position.y, quadro.planos[i], delta)
    })
  })
  return null
}
```

- [ ] **Step 2: Verificar no navegador**

Run: `npm run dev` e abrir `http://localhost:3000/pt/`
Verificar: a descida percorre os sete andares; a sombra é longa e horizontal; os pilares atravessam a queda; nenhum erro no console.

- [ ] **Step 3: Commit**

```bash
git add components/predio/Predio.tsx
git commit -m "$(cat <<'EOF'
feat(predio): a cena, unico arquivo com three.js

Camera em trilho vertical dirigida por rolagem nativa, sol rasante que
projeta a sombra longa, tres planos de parallax e so tres andares vivos
por vez. Clique e ancora de DOM; raycast so acende o hover.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: A prova no navegador de verdade

**Files:**
- Create: `tests/e2e/predio.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/e2e/predio.spec.ts
import { test, expect, devices } from '@playwright/test'

/**
 * jsdom roda com css desligado e sem WebGL: nenhum teste de unidade enxerga a
 * descida. O que pode ser provado aqui é o que importa mais — que o conteúdo é
 * alcançável e que ninguém fica preso no prédio.
 */
test('a descida percorre os sete andares sem erro de console', async ({ page }) => {
  const erros: string[] = []
  page.on('pageerror', (e) => erros.push(e.message))
  page.on('console', (m) => m.type() === 'error' && erros.push(m.text()))

  await page.goto('/pt/')
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(1200)

  expect(erros).toEqual([])
})

test('a recepção é alcançável pelo teclado, sem rolar', async ({ page }) => {
  await page.goto('/pt/')
  const link = page.getByRole('link', { name: /recep|contato/i }).first()
  await link.focus()
  await expect(link).toBeFocused()
})

test('com movimento reduzido, o prédio vira as sete seções em HTML', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await page.goto('/pt/')
  await expect(page.getByRole('region')).toHaveCount(7)
  await ctx.close()
})

test.describe('celular', () => {
  test.use({ ...devices['iPhone 13'] })

  test('a descida chega ao fim em viewport de celular', async ({ page }) => {
    await page.goto('/pt/')
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(1200)
    // NÃO usar `toBeVisible()` no fallback: quando a cena sobe, ele fica com
    // `sr-only` — 1px recortado, que o Playwright ainda considera visível. O
    // teste passaria pelo motivo errado e continuaria passando se a descida
    // quebrasse. O que se afirma aqui é que a rolagem chegou mesmo ao fim.
    const fim = await page.evaluate(
      () => window.scrollY + window.innerHeight >= document.body.scrollHeight - 2,
    )
    expect(fim).toBe(true)
    await expect(page.getByRole('link', { name: /recep|contato/i }).first()).toHaveCount(1)
  })

  test('nenhum alvo de toque abaixo de 44px', async ({ page }) => {
    await page.goto('/pt/')
    for (const link of await page.getByRole('link').all()) {
      const caixa = await link.boundingBox()
      if (caixa) expect(caixa.height).toBeGreaterThanOrEqual(44)
    }
  })
})
```

- [ ] **Step 2: Run test**

Run: `npm run test:e2e -- tests/e2e/predio.spec.ts`
Expected: FAIL antes da home usar o `PredioSlot`; PASS depois.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/predio.spec.ts
git commit -m "$(cat <<'EOF'
test(predio): a descida provada no navegador, inclusive em celular

Sete andares sem erro de console, recepcao alcancavel por teclado,
movimento reduzido virando sete secoes e nenhum alvo de toque abaixo de
44px em iPhone 13.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Os três testes físicos

Não são automatizáveis e são obrigatórios pela spec. Fazer **depois da Task 8 e antes de considerar a home pronta**:

- [ ] **Safari em iPhone real** — não simulador, não DevTools.
- [ ] **Navegador embutido do Instagram** — é onde cai quem vem de link em rede social, e é ambiente hostil a WebGL.
- [ ] **Celular sob sol forte** — confirmação da legibilidade dos rótulos nos andares mais escuros do fundo da descida.

## Antes e depois

- [ ] Rodar Lighthouse **mobile** em `/pt/` antes da Task 8 e depois dela. Registrar os dois números. A spec exige medido, não estimado.

---

## Fica fora deste plano, de propósito

- **Onde a home mora** e o que acontece com a página longa atual (`app/[locale]/(site)/page.tsx`). O dono adiou; nenhuma task acima toca no roteamento.
- **A copy final de cada andar.** As Tasks 1 e 6 exigem que o texto exista nos dois idiomas, não que ele seja o definitivo.
- **A fusão do blog com o portfólio.** O andar 05 já aponta para `/blog`; unificar a navegação é trabalho seguinte.
