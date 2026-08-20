# Dobra temática — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A dobra da `/[locale]/ativacoes` passa a simular uma ativação temática — balão
junino que estoura, bandeirinhas e brasas ao fundo — sem que o motor puro do jogo seja
tocado.

**Architecture:** O tema é **dado**, não código de jogo. Um módulo por tema exporta paleta e
quatro funções de desenho; `CapaJogo.tsx` chama o tema ativo e deixa de conhecer círculos,
anéis e cores de alvo. O motor `motor-reflexo.ts` continua emitindo alvo abstrato e não é
modificado em nenhuma tarefa deste plano.

**Tech Stack:** Next.js 16 (App Router, `output: 'export'`), React 19, Tailwind CSS 4,
TypeScript, Canvas 2D nativo, Vitest + Testing Library, Playwright. **Nenhuma dependência
nova.**

**Spec:** [`../specs/2026-08-20-dobra-tematica-design.md`](../specs/2026-08-20-dobra-tematica-design.md)

## Global Constraints

Valem para **todas** as tarefas. Cada uma é critério de aceitação do spec.

- **Comentários e nomes de variável em português**; comentário explica *por que*, não *o
  quê*. Mensagem de commit em português sem acento.
- **`components/ativacoes/motor-reflexo.ts` NÃO é modificado por nenhuma tarefa.** Se uma
  tarefa parecer exigir isso, pare e reporte. Os 35 testes dele passam sem edição.
- **Nada de `shadowBlur`, nada de `filter: blur()` por quadro.** Brilho sai de composição
  aditiva (`globalCompositeOperation = 'lighter'`) com sprite pré-assado.
- **Nenhuma dependência nova de runtime.**
- **Nenhum texto de tema fora do dicionário.** O tema carrega chave; o texto mora em
  `content/pt.ts` e `content/en.ts`.
- **O desenho do elemento nunca se afasta do centro do alvo além da tolerância de acerto.**
  O motor testa acerto contra a posição fixa do alvo com tolerância de `1.6 ×` o raio;
  qualquer deriva maior faz o clique errar o que o olho vê.
- **Com `prefers-reduced-motion: reduce`:** fundo parado, sem balanço, sem brasa, sem
  tremulação, estouro instantâneo — e o jogo continua jogável.

## Estrutura de arquivos

**Criar:**

| Arquivo | Responsabilidade |
|---|---|
| `components/ativacoes/temas/tipos.ts` | O tipo `Tema` e nada mais. Sem import de React, sem DOM além do tipo do pincel. |
| `components/ativacoes/temas/junino.ts` | O tema junino: paleta e as quatro funções de desenho. |
| `components/ativacoes/temas/index.ts` | Exporta `TEMA_ATIVO`. Trocar de tema é trocar esta linha. |
| `tests/unit/ativacoes-tema.test.ts` | Forma do tema, ausência de caminho lento, e a trava de deriva do balanço. |
| `tests/e2e/ativacoes-quadros.spec.ts` | O portão de quadros da rota. |

**Modificar:**

| Arquivo | Mudança |
|---|---|
| `content/types.ts` | `ativacoes.capa.convitesTema`. |
| `content/pt.ts`, `content/en.ts` | O texto do convite junino nos dois idiomas. |
| `components/ativacoes/CapaJogo.tsx` | Passa a chamar o tema; perde o desenho de círculo, anel, marca de foco e as constantes de cor do alvo. |
| `tests/content.test.ts` | Paridade e não-vazio de `convitesTema`. |
| `tests/unit/ativacoes-capa.test.tsx` | O convite vem do tema. |

---

## Task 1: O tipo do tema e o texto no dicionário

**Files:**
- Create: `components/ativacoes/temas/tipos.ts`
- Modify: `content/types.ts`, `content/pt.ts`, `content/en.ts`
- Test: `tests/content.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `export type Tema` com os campos abaixo, e a chave de dicionário
  `dict.ativacoes.capa.convitesTema.junino` nos dois idiomas.

- [ ] **Step 1: Escrever o teste que falha**

Em `tests/content.test.ts`, dentro do `describe('ativações')` que já existe, acrescente:

```typescript
    // O tema carrega CHAVE, nunca texto. Sem isto, cada tema novo traria um par
    // de strings soltas fora do dicionário e o teste de paridade PT/EN — que é
    // quem pega chave escrita num idioma e esquecida no outro — deixaria de
    // cobrir justamente a frase mais visível da página.
    it('os convites de tema existem nos dois idiomas, com as mesmas chaves', () => {
      expect(Object.keys(pt.ativacoes.capa.convitesTema).sort()).toEqual(
        Object.keys(en.ativacoes.capa.convitesTema).sort(),
      )
      for (const dict of [pt, en]) {
        for (const [chave, frase] of Object.entries(dict.ativacoes.capa.convitesTema)) {
          expect(frase.trim().length, `convite vazio: ${chave}`).toBeGreaterThan(0)
        }
      }
    })

    it('há um convite para o tema junino', () => {
      expect(pt.ativacoes.capa.convitesTema.junino).toBeTruthy()
      expect(en.ativacoes.capa.convitesTema.junino).toBeTruthy()
    })
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm test -- tests/content.test.ts`
Expected: FAIL — `convitesTema` não existe em `dict.ativacoes.capa`.

- [ ] **Step 3: Declarar o tipo do tema**

Crie `components/ativacoes/temas/tipos.ts`:

```typescript
/**
 * A forma de um tema da dobra.
 *
 * TEMA É DADO, NÃO CÓDIGO DE JOGO. O motor puro (`motor-reflexo.ts`) continua
 * emitindo alvo abstrato — posição normalizada, raio, instante de nascimento — e
 * não sabe o que é balão. Quem decide como aquilo aparece, e o que acontece
 * quando estoura, é o tema.
 *
 * A consequência é o critério que fez esta abordagem ser escolhida: os 35 testes
 * do motor seguem válidos sem uma linha alterada. Um redesenho visual que
 * obrigasse a reescrever a máquina de estado seria um redesenho mal desenhado.
 *
 * Todas as funções recebem o pincel JÁ TRANSLADADO para o centro do elemento
 * (menos `desenharFundo`, que trabalha no quadro inteiro). Desenhar em torno da
 * origem, e não em coordenada absoluta, é o que permite trocar de tema sem que
 * `CapaJogo` saiba onde cada tema resolveu pôr as coisas.
 */
export type Tema = {
  /** Identificador estável. Aparece em teste e dá nome ao arquivo. */
  id: string
  /** Cores do tema, todas usadas DENTRO do canvas. Nenhuma delas vira cor de
   *  texto sobre fundo sem passar por `lib/contraste.ts`. */
  paleta: { elemento: string; destaque: string; fundo: string; brasa: string }
  /**
   * Desenha UM elemento. `vida` vai de 1 (recém-nascido) a 0 (prestes a
   * expirar); `nascimento` vai de 0 a 1 durante a entrada e fica em 1 depois.
   * `parado` é `prefers-reduced-motion`: sem balanço, sem tremulação, sem pop.
   */
  desenharElemento(
    pincel: CanvasRenderingContext2D,
    raio: number,
    vida: number,
    nascimento: number,
    agora: number,
    parado: boolean,
  ): void
  /** Marca o elemento que a barra de espaço vai acertar. Vive no tema porque
   *  um anel que serve a um círculo não serve a um balão. */
  desenharAlvoAtivo(pincel: CanvasRenderingContext2D, raio: number, agora: number): void
  /** UM estouro em andamento, `progresso` de 0 a 1. Puramente visual: não
   *  pontua, não atrasa nada, e a partida segue igual se não for desenhado. */
  desenharEstouro(pincel: CanvasRenderingContext2D, raio: number, progresso: number): void
  /** Camada de fundo, desenhada ANTES dos elementos, no mesmo canvas. */
  desenharFundo(
    pincel: CanvasRenderingContext2D,
    largura: number,
    altura: number,
    agora: number,
    parado: boolean,
  ): void
  /** Chave do convite no dicionário — o texto mora em `content/*.ts`. */
  chaveConvite: string
}
```

- [ ] **Step 4: Acrescentar a chave ao dicionário**

Em `content/types.ts`, dentro de `ativacoes.capa`, ao lado de `convite`:

```typescript
      /** Convite por tema. O tema ativo escolhe a chave; o texto mora aqui,
       *  para a paridade PT/EN continuar cobrindo a frase mais visível da
       *  página. `convite` segue existindo como texto neutro de reserva. */
      convitesTema: Record<string, string>
```

Em `content/pt.ts`, dentro de `capa`:

```typescript
      convitesTema: { junino: 'Estoure os balões.' },
```

Em `content/en.ts`, na mesma posição:

```typescript
      convitesTema: { junino: 'Pop the balloons.' },
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `npm test -- tests/content.test.ts`
Expected: PASS, inclusive o teste antigo de paridade PT/EN.

Run: `npm run typecheck && npm run lint`
Expected: limpos.

- [ ] **Step 6: Commit**

```bash
git add components/ativacoes/temas/tipos.ts content/types.ts content/pt.ts content/en.ts tests/content.test.ts
git commit -m "feat(ativacoes): o tipo do tema e o convite junino no dicionario"
```

---

## Task 2: O tema junino

**Files:**
- Create: `components/ativacoes/temas/junino.ts`
- Create: `components/ativacoes/temas/index.ts`
- Test: `tests/unit/ativacoes-tema.test.ts`

**Interfaces:**
- Consumes: `Tema` de `./tipos` (Task 1).
- Produces: `export const junino: Tema`, `export function deslocamentoBalanco(agora: number, raio: number): { dx: number; dy: number }`, e `export const TEMA_ATIVO: Tema` em `index.ts`.

- [ ] **Step 1: Escrever os testes que falham**

Crie `tests/unit/ativacoes-tema.test.ts`:

```typescript
import { describe, expect, it, vi } from 'vitest'
import { junino, deslocamentoBalanco } from '@/components/ativacoes/temas/junino'
import { TEMA_ATIVO } from '@/components/ativacoes/temas'
import { pt, } from '@/content/pt'
import { en } from '@/content/en'

/**
 * O pincel de mentira grava o que foi pedido a ele. Não é mock de
 * comportamento: as funções de desenho não têm retorno para afirmar, e o que
 * importa é justamente O QUE elas mandam o canvas fazer — em particular o que
 * elas NUNCA podem mandar.
 */
function pincelDeMentira() {
  const chamadas: string[] = []
  const alvo = {
    chamadas,
    // Propriedades que o código escreve; guardadas para inspeção.
    shadowBlur: 0,
    filter: 'none',
    globalCompositeOperation: 'source-over',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D & { chamadas: string[] }

  for (const metodo of [
    'save', 'restore', 'beginPath', 'closePath', 'moveTo', 'lineTo', 'arc',
    'ellipse', 'quadraticCurveTo', 'bezierCurveTo', 'fill', 'stroke', 'fillRect',
    'translate', 'rotate', 'scale', 'setLineDash', 'drawImage', 'createLinearGradient',
    'createRadialGradient', 'clip', 'rect',
  ] as const) {
    // `createLinearGradient`/`createRadialGradient` precisam devolver algo com
    // `addColorStop`, senão o tema quebra ao montar um gradiente.
    const devolve = metodo.startsWith('create') ? { addColorStop: vi.fn() } : undefined
    ;(alvo as unknown as Record<string, unknown>)[metodo] = (...args: unknown[]) => {
      chamadas.push(metodo)
      void args
      return devolve
    }
  }
  return alvo
}

describe('tema junino', () => {
  it('tem a forma completa de um tema', () => {
    expect(junino.id).toBe('junino')
    expect(typeof junino.desenharElemento).toBe('function')
    expect(typeof junino.desenharAlvoAtivo).toBe('function')
    expect(typeof junino.desenharEstouro).toBe('function')
    expect(typeof junino.desenharFundo).toBe('function')
    for (const cor of Object.values(junino.paleta)) {
      expect(cor, `cor inválida: ${cor}`).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })

  it('a chave de convite existe no dicionário, nos dois idiomas', () => {
    expect(pt.ativacoes.capa.convitesTema[junino.chaveConvite]).toBeTruthy()
    expect(en.ativacoes.capa.convitesTema[junino.chaveConvite]).toBeTruthy()
  })

  it('o tema ativo é o junino', () => {
    expect(TEMA_ATIVO.id).toBe(junino.id)
  })

  // A medição anterior desta rota registrou 59,88fps com CPU 4x estrangulada, e
  // esse número é o orçamento que o tema gasta. `shadowBlur` e `filter` são os
  // caminhos lentos documentados do Canvas 2D — usá-los faria a página
  // contradizer, na primeira tela, a promessa que ela vende.
  it('nenhuma função de desenho usa caminho lento de canvas', () => {
    for (const desenhar of [
      () => junino.desenharElemento(p, 24, 0.6, 1, 1000, false),
      () => junino.desenharAlvoAtivo(p, 24, 1000),
      () => junino.desenharEstouro(p, 24, 0.5),
      () => junino.desenharFundo(p, 800, 600, 1000, false),
    ]) {
      var p = pincelDeMentira()
      desenhar()
      expect(p.shadowBlur, 'shadowBlur foi usado').toBe(0)
      expect(p.filter, 'filter foi usado').toBe('none')
    }
  })

  it('desenha alguma coisa em cada função', () => {
    const casos = [
      ['elemento', (p: ReturnType<typeof pincelDeMentira>) => junino.desenharElemento(p, 24, 0.6, 1, 1000, false)],
      ['alvo ativo', (p: ReturnType<typeof pincelDeMentira>) => junino.desenharAlvoAtivo(p, 24, 1000)],
      ['estouro', (p: ReturnType<typeof pincelDeMentira>) => junino.desenharEstouro(p, 24, 0.5)],
      ['fundo', (p: ReturnType<typeof pincelDeMentira>) => junino.desenharFundo(p, 800, 600, 1000, false)],
    ] as const
    for (const [nome, desenhar] of casos) {
      const p = pincelDeMentira()
      desenhar(p)
      expect(p.chamadas.length, `${nome} não desenhou nada`).toBeGreaterThan(0)
    }
  })

  /**
   * A TRAVA MAIS IMPORTANTE DESTE ARQUIVO.
   *
   * O teste de acerto vive no motor puro e usa a posição FIXA do alvo, com
   * tolerância de 1,6 vez o raio. Se o balanço do desenho tirar o balão de
   * dentro desse círculo, o clique erra um balão que o olho vê ali — a mesma
   * classe do defeito mais caro que esta rota já teve, um alvo visível que
   * engole o clique. Margem de segurança: metade da folga.
   */
  it('o balanço nunca tira o elemento de dentro da tolerância de acerto', () => {
    const raio = 24
    const folgaMaxima = raio * (1.6 - 1) * 0.5
    let maior = 0
    for (let t = 0; t < 20_000; t += 17) {
      const { dx, dy } = deslocamentoBalanco(t, raio)
      maior = Math.max(maior, Math.hypot(dx, dy))
    }
    expect(maior, `balanço chegou a ${maior.toFixed(2)}px, folga é ${folgaMaxima.toFixed(2)}px`)
      .toBeLessThanOrEqual(folgaMaxima)
  })

  it('em modo parado o elemento não balança', () => {
    const p = pincelDeMentira()
    junino.desenharElemento(p, 24, 0.6, 1, 1000, true)
    const q = pincelDeMentira()
    junino.desenharElemento(q, 24, 0.6, 1, 9999, true)
    expect(p.chamadas).toEqual(q.chamadas)
  })

  it('em modo parado o fundo não se move', () => {
    const p = pincelDeMentira()
    junino.desenharFundo(p, 800, 600, 1000, true)
    const q = pincelDeMentira()
    junino.desenharFundo(q, 800, 600, 50_000, true)
    expect(p.chamadas).toEqual(q.chamadas)
  })
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm test -- tests/unit/ativacoes-tema.test.ts`
Expected: FAIL — não resolve `@/components/ativacoes/temas/junino`.

- [ ] **Step 3: Implementar o tema junino**

### A régua, e ela é o requisito mais duro desta tarefa

**A arte tem que passar por peça de agência, não por desenho de programador.** O leitor
desta página produz ativação para marca; ele reconhece arte amadora em meio segundo, e uma
dobra que parece protótipo desmente tudo o que a página afirma. Um balão que é um círculo
com listras reprova nesta tarefa mesmo passando em todos os testes automatizados abaixo.

### O objeto é específico, e errar isto é o tell número um

A pesquisa de direção de arte está em
[`arte-junina.md`](../referencias/2026-08-20-arte-junina.md) — **leia antes de
desenhar**. Três achados dela são requisito, não sugestão:

1. **É um balão de São João: lanterna de papel em gomos, afunilada nas DUAS pontas.** Não é
   balão de festa de látex, e não é o balão de cesta ocidental. Confundir a silhueta é a
   coisa mais rápida que um olho de agência brasileira identifica como errada, e o termo
   em inglês ("paper hot-air balloon") aponta justamente para o objeto errado.
2. **O balão aparece parado e decorativo, NUNCA no ar com chama acesa.** Não é escolha
   estética: soltar balão aceso é crime nomeado no Brasil (Lei 9.605/98) e **nenhuma
   campanha real retrata isso**. Agência usa o balão o tempo todo — como enfeite pendurado
   ou pousado, nunca em voo. É assim que o trabalho profissional passa entre as duas
   coisas, e é o que permite este tema existir sem constranger quem vai ler a página.
   Consequência direta: **não desenhe chama viva tremulando**. O calor vem de um brilho
   interno suave, como papel iluminado por dentro.
3. **O estouro é a costura dos gomos se separando**, aproveitando os caminhos de gomo que o
   próprio balão já tem — não uma explosão de partículas genérica.

Concretamente, o que separa arte de agência de desenho de programador:

- **Volume.** O balão é um corpo tridimensional visto de perto: gradiente de luz em um lado,
  sombra própria no outro, e o gomo do meio mais claro que os das bordas porque a superfície
  curva se afasta. Preenchimento chapado por gomo é o erro que mais entrega amadorismo.
- **Fonte de luz única e coerente.** O brilho interno ilumina o balão **de baixo**, e essa
  mesma direção vale para bandeirinha e brasa no fundo. Duas fontes de luz brigando é o
  segundo erro mais comum.
- **Silhueta legível a 24px.** No celular o balão tem o tamanho de uma unha. Se a silhueta
  não se lê nesse tamanho, o detalhe interno é desperdício.
- **Nada de contorno preto uniforme em volta de tudo.** Contorno parece clipart.

### O meio: SVG autorado, rasterizado uma vez

**A arte não é desenhada com chamadas de caminho a cada quadro.** Ela é autorada como
**dados de caminho SVG** — strings `d`, o meio de arte já estabelecido neste repositório,
com disciplina provada em `components/landing/arte.tsx` e `components/art/SystemArt.tsx` —
convertida em `Path2D` uma única vez e rasterizada para um canvas fora de tela na densidade
da tela. O laço desenha com `drawImage`.

**`new Path2D('M …')` aceita a sintaxe de caminho do SVG diretamente**, e é isso que torna
a coisa viável: a arte se autora e se lê como SVG, mas a rasterização é **síncrona**. Nada
de `Image`, nada de blob, nada de `await` dentro de um laço de `requestAnimationFrame` —
que seria a forma errada de fazer isto e a razão pela qual muita gente desiste e volta para
o desenho imperativo. Gradiente e sombreado saem de `createLinearGradient` aplicado sobre o
`Path2D`, uma vez, na rasterização.

Consequência para o tipo `Tema`: **a assinatura das funções de desenho não muda.** O módulo
do tema guarda o próprio cache de sprite, criado na primeira chamada e reaproveitado; se a
densidade da tela mudar, ele re-rasteriza. `CapaJogo` não sabe que existe sprite.

Três razões, e as três importam:

1. **Qualidade.** Gradiente, máscara e sombreado se autoram com precisão em SVG; em
   chamadas de caminho imperativas, viram tentativa e erro.
2. **Desempenho.** Um `drawImage` por elemento no lugar de dezenas de operações de caminho.
   Isso *devolve* orçamento de quadro em vez de gastar — e o fundo animado vai precisar.
3. **Revisabilidade.** O SVG é legível no diff. Uma sequência de `bezierCurveTo` não é.

O balão inteiro vira sprite — **não há chama tremulando para desenhar por cima**, porque
não há chama (ver o requisito 2 acima). O brilho interno é parte do sprite, e o único
movimento do elemento é o balanço, que é translação do sprite, não redesenho. Bandeirinha e
brasa do fundo seguem a mesma regra: autorar, rasterizar, repetir.

Isso é mais barato do que a versão que este plano descrevia antes da pesquisa de arte, e é
um caso raro em que a escolha culturalmente correta é também a mais rápida.

### O ciclo obrigatório de olhar

Isto **não é** tarefa de uma passada. Depois da primeira versão funcionando:

1. Reconstrua, sirva `out/`, fotografe a dobra em 1440×900 e em 390×844 **com balão na
   tela**, e **abra as duas imagens**.
2. Critique a própria arte contra a régua acima, por escrito, item por item.
3. Refine e repita. **No mínimo três ciclos**, e mais enquanto a crítica ainda achar coisa.
4. Guarde as capturas de cada ciclo e ponha no relatório o que mudou entre elas.

Uma captura que ninguém abriu não é verificação, e "está bom" sem crítica escrita não é
crítica.

Requisitos que os testes do Step 1 cobrem e que a implementação precisa respeitar:

- `id` é `'junino'` e `chaveConvite` é `'junino'`.
- `paleta` tem `elemento`, `destaque`, `fundo` e `brasa`, todas em `#RRGGBB`.
- **Nenhuma função toca `shadowBlur` nem `filter`.**
- `deslocamentoBalanco(agora, raio)` é **pura** e devolve `{ dx, dy }` cujo módulo nunca
  passa de `raio * 0.3` — metade da folga de `1.6 ×` que o motor concede. Use senos de
  períodos diferentes em x e y para o movimento não parecer circular.
- Com `parado = true`, `desenharElemento` e `desenharFundo` produzem a mesma sequência de
  chamadas para qualquer `agora`.
- O pincel chega **transladado para o centro do elemento** em `desenharElemento`,
  `desenharAlvoAtivo` e `desenharEstouro`; desenhe em torno da origem.

Crie `components/ativacoes/temas/index.ts`:

```typescript
import type { Tema } from './tipos'
import { junino } from './junino'

/**
 * O tema que a dobra está rodando.
 *
 * "Trocável" nesta rota significa ARQUITETURA, não interface: não há seletor na
 * página, não há troca por calendário, não há painel. Trocar de tema é trocar
 * esta linha, e acrescentar um tema é acrescentar um arquivo. Qualquer coisa
 * além disso é função que ninguém pediu.
 */
export const TEMA_ATIVO: Tema = junino

export type { Tema } from './tipos'
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm test -- tests/unit/ativacoes-tema.test.ts`
Expected: PASS nos 8 testes.

Run: `npm run typecheck && npm run lint`
Expected: limpos.

- [ ] **Step 5: Commit**

```bash
git add components/ativacoes/temas tests/unit/ativacoes-tema.test.ts
git commit -m "feat(ativacoes): o tema junino, com balao que balanca sem sair do alvo"
```

---

## Task 3: `CapaJogo` passa a consumir o tema

**Files:**
- Modify: `components/ativacoes/CapaJogo.tsx`
- Test: `tests/unit/ativacoes-capa.test.tsx`

**Interfaces:**
- Consumes: `TEMA_ATIVO` de `@/components/ativacoes/temas` (Task 2); `dict.ativacoes.capa.convitesTema` (Task 1).
- Produces: nada que tarefas seguintes consumam.

Esta é a tarefa que encolhe o arquivo. `CapaJogo.tsx` tem 834 linhas e desenha círculo,
anel, marca de foco e cores de alvo à mão. Tudo isso sai para o tema; o componente fica com
o que é dele — ciclo de vida do laço, entrada, medição, zonas proibidas e o DOM.

- [ ] **Step 1: Escrever o teste que falha**

Em `tests/unit/ativacoes-capa.test.tsx`, acrescente:

```tsx
import { TEMA_ATIVO } from '@/components/ativacoes/temas'

// O convite deixa de ser string fixa e passa a vir do tema ativo. Sem este
// teste, trocar `TEMA_ATIVO` mudaria o desenho e deixaria a frase falando de
// outra coisa — "Toque nos alvos" sobre uma tela cheia de balão.
it('o convite renderizado vem do tema ativo', () => {
  render(<CapaJogo dict={pt} locale="pt" />)
  const esperado = pt.ativacoes.capa.convitesTema[TEMA_ATIVO.chaveConvite]
  expect(esperado, 'o tema ativo aponta para uma chave que não existe no dicionário').toBeTruthy()
  expect(screen.getByText(esperado!)).toBeInTheDocument()
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm test -- tests/unit/ativacoes-capa.test.tsx`
Expected: FAIL — a capa ainda renderiza `capa.convite`, não o convite do tema.

- [ ] **Step 3: Trocar o desenho pelo tema**

Em `components/ativacoes/CapaJogo.tsx`:

1. Importe `TEMA_ATIVO`.
2. **Fundo:** logo depois do `fillRect` que limpa o quadro, chame
   `TEMA_ATIVO.desenharFundo(pincel, largura, altura, agora, menosMovimento)`.
3. **Elemento:** no laço de alvos, troque o bloco que desenha o brilho, o círculo e o anel
   por `save()` / `translate(cx, cy)` / `TEMA_ATIVO.desenharElemento(pincel, raio, vida, nascimento, agora, menosMovimento)` / `restore()`.
   `nascimento` é o progresso de entrada que a capa já calcula com `easeOutBack`.
4. **Marca de foco:** troque o bloco do anel tracejado por `save()` / `translate` /
   `TEMA_ATIVO.desenharAlvoAtivo(pincel, raioBase, agora)` / `restore()`.
5. **Estouro:** acrescente um pool fixo de estouros no mesmo padrão do pool de partículas
   que já existe (`POOL_ONDAS`/`VIDA_ONDA_MS` são o molde). Ao registrar um acerto, ative
   um estouro na posição do alvo. Desenhe cada um com `save()` / `translate` /
   `TEMA_ATIVO.desenharEstouro(pincel, raio, progresso)` / `restore()`. Em
   `menosMovimento`, o estouro não é desenhado.
6. **Convite:** troque `capa.convite` por
   `capa.convitesTema[TEMA_ATIVO.chaveConvite] ?? capa.convite` — a reserva existe para
   um tema mal configurado degradar em texto neutro em vez de renderizar vazio.
7. **Remova** as constantes que só serviam ao desenho antigo do alvo (`COR_ALVO`,
   `COR_ALVO_RGB`, `COR_TRILHO`, o sprite de brilho e `criarSpriteBrilho`), **desde que
   nada mais as use** — as partículas de acerto usam `COR_ALVO_RGB`; se ainda usarem,
   mantenha a constante e diga isso no relatório em vez de mover a partícula para o tema,
   que é escopo de outra decisão.

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm test -- tests/unit/ativacoes-capa.test.tsx`
Expected: PASS.

Run: `npm test && npm run typecheck && npm run lint`
Expected: limpos, e os testes de motor, catálogo, prova, contraste e conteúdo passam **sem
edição**.

Run: `npm run build && npm run test:e2e -- tests/e2e/ativacoes.spec.ts`
Expected: PASS. Os testes ponta a ponta de clique, teclado, menos-movimento e fim de
partida continuam valendo — o jogo não mudou, só a pele.

- [ ] **Step 5: Olhar o resultado**

Reconstrua, sirva `out/` e fotografe a dobra em 1440×900 e 390×844, jogando. **Abra as
imagens.** Um balão que não parece balão passa em todos os testes deste plano.

- [ ] **Step 6: Commit**

```bash
git add components/ativacoes/CapaJogo.tsx tests/unit/ativacoes-capa.test.tsx
git commit -m "feat(ativacoes): a capa desenha pelo tema, e para de conhecer circulo"
```

---

## Task 4: O portão de quadros

**Files:**
- Create: `tests/e2e/ativacoes-quadros.spec.ts`

**Interfaces:**
- Consumes: a rota montada.
- Produces: nada.

O acabamento anterior entrou sem custar quadro — 59,88fps mediano com CPU 4× estrangulada —
mas isso foi **medição pontual, não teste**, e a própria implementação registrou a lacuna.
Fundo animado é custo de preenchimento de verdade e é a primeira coisa desta rota que pode
degradar de forma invisível.

- [ ] **Step 1: Escrever o portão**

Leia `tests/e2e/medir-quadros.spec.ts` primeiro — ele já mede quadros sob estrangulamento
de CPU para a home, e este arquivo segue o mesmo molde. Crie
`tests/e2e/ativacoes-quadros.spec.ts` medindo a dobra da `/pt/ativacoes/` com
`prefers-reduced-motion` desligado, CPU 4× estrangulada, por uma janela de pelo menos 3
segundos com o canvas visível, e afirmando **mediana ≥ 45fps**.

Comente por que o piso é 45 e não 59: esta suíte **não roda no CI** — o workflow roda lint,
typecheck, vitest, build e test:html, nunca Playwright — então ela roda em máquina de gente,
e um piso apertado demais reprova por hardware alheio e vira portão que alguém desliga.

Imprima a mediana medida no console mesmo quando passar, como
`medir-quadros.spec.ts` faz: um portão que só fala quando reprova não deixa ninguém
perceber a degradação lenta.

- [ ] **Step 2: Rodar**

Run: `npm run build && npm run test:e2e -- tests/e2e/ativacoes-quadros.spec.ts`
Expected: PASS, com a mediana impressa.

Se reprovar, **não afrouxe o piso**: é o portão fazendo o trabalho dele. Reporte o número e
pare.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/ativacoes-quadros.spec.ts
git commit -m "feat(ativacoes): portao de quadros da rota, piso de 45fps a 4x"
```

---

## Verificação final

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] `npm run test:html`
- [ ] `npm run test:e2e`
- [ ] `git diff --stat af9cf96..HEAD -- components/ativacoes/motor-reflexo.ts` **vazio** — o
      motor não foi tocado por nenhuma tarefa deste plano.

## Pendências que não bloqueiam este plano

1. **O modal de brindes 3D** é o subprojeto B e tem spec própria. A pesquisa de licença já
   está feita e restringe a lista de modelos antes de qualquer outra decisão: só CC0 ou
   CC-BY sobrevivem a um export estático, porque a licença padrão do Sketchfab proíbe
   disponibilizar o arquivo de forma que terceiros possam baixá-lo — e um `.glb` público é
   baixável pelo DevTools.
2. **Segundo tema.** A arquitetura aceita; esta entrega não inclui.
3. **A ressalva do balão junino** está registrada no §2.2 da spec com a decisão do dono por
   cima dela. Se um dia ela se mostrar cara, trocar o elemento é trocar um arquivo.
