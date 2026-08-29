# Jogo profissional da dobra — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o jogo da dobra `/ativacoes` de demonstração em amostra que vende — fim de partida legível, cena que reage, alvos com decisão e movimento com peso.

**Architecture:** O motor (`motor-reflexo.ts`) é puro e continua puro: tipo de alvo entra como dado sorteado pelo LCG que já existe. O componente de 1154 linhas é quebrado por extração antes de qualquer feature nova. Todo desenho novo é do tema, nunca do jogo.

**Tech Stack:** Next 16 (`output: 'export'`), React 19, TypeScript, Canvas 2D, Vitest, Playwright.

**Spec:** [`docs/superpowers/specs/2026-08-29-jogo-profissional-design.md`](../specs/2026-08-29-jogo-profissional-design.md)

## Global Constraints

- **Nada de `shadowBlur`. Nada de `filter: blur()` por quadro.** Brilho sai de composição aditiva com sprite pré-assado.
- **Piso de 45 fps mediano sob CPU 4× estrangulada.** Medido por Playwright, fora do CI.
- **Sem áudio.** Todo retorno é visual e precisa se sustentar mudo.
- **`prefers-reduced-motion`:** sem shake, overshoot, antecipação ou reação de cena. Hit-stop e flash permanecem. O jogo segue jogável.
- **Tema é dado.** Tipo de alvo e reação de cena são desenhados pelo tema; o motor nunca sabe como eles parecem.
- **Motor é puro.** Nunca `Math.random`, nunca `Date.now` — semente e relógio entram por parâmetro.
- **Português** em código, comentário, commit e teste.
- Testes unitários em `tests/unit/`, e2e em `tests/e2e/`, alias de import `@/`.

---

### Task 1: Portão de medição de quadros para `/ativacoes`

A spec §9 torna isto pré-requisito: sem linha de base, as Tasks 8 e 9 degradam de forma invisível.

**Files:**
- Create: `tests/e2e/medir-quadros-ativacoes.spec.ts`

**Interfaces:**
- Consumes: nada.
- Produces: comando de medição que as tasks seguintes reexecutam para comparar.

- [ ] **Step 1: Escrever o medidor**

```ts
// tests/e2e/medir-quadros-ativacoes.spec.ts
import { expect, test } from '@playwright/test'

/**
 * PORTÃO DE QUADROS DA DOBRA DE ATIVAÇÕES.
 *
 * Difere de `medir-quadros.spec.ts` (a home) num ponto: aquele MEDE e imprime,
 * este AFIRMA. A spec da dobra temática fixou piso de 45fps mediano sob 4×, e
 * sem afirmação não há portão — só relatório que ninguém lê.
 *
 * O piso é 45 e não 59 de propósito: esta suíte não roda no CI, roda em máquina
 * de gente. Piso apertado reprova por hardware alheio e vira portão desligado.
 *
 *   npx playwright test tests/e2e/medir-quadros-ativacoes.spec.ts --project=chromium
 */
const PISO_FPS = 45

const CONTAR = `
  (duracao) => new Promise((resolve) => {
    const inicio = performance.now()
    const deltas = []
    let anterior = inicio
    const passo = (agora) => {
      deltas.push(agora - anterior)
      anterior = agora
      if (agora - inicio < duracao) requestAnimationFrame(passo)
      else {
        const ordenados = [...deltas].sort((a, b) => a - b)
        resolve({
          quadros: deltas.length,
          fpsMediana: 1000 / (ordenados[ordenados.length >> 1] ?? 16.7),
          piorQuadroMs: ordenados[Math.floor(ordenados.length * 0.95)] ?? 0,
        })
      }
    }
    requestAnimationFrame(passo)
  })
`

for (const estrangulamento of [1, 4]) {
  test(`quadros da dobra de ativações com CPU ${estrangulamento}x`, async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'o estrangulamento de CPU é do CDP')
    test.setTimeout(120_000)

    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: estrangulamento })

    await page.goto('/pt/ativacoes/')
    const canvas = page.locator('canvas[aria-label]')
    await expect(canvas).toBeVisible({ timeout: 30_000 })

    // Começa a partida: o regime que interessa é o de jogo, não o atrativo.
    await canvas.click({ position: { x: 40, y: 40 } })
    await page.waitForTimeout(1200)

    const medida = (await page.evaluate(`(${CONTAR})(6000)`)) as {
      quadros: number
      fpsMediana: number
      piorQuadroMs: number
    }
    console.log(`\n── CPU ${estrangulamento}× ──`, JSON.stringify(medida, null, 2))

    expect(medida.quadros, 'o laço nem rodou — a aba pode estar oculta').toBeGreaterThan(60)
    if (estrangulamento === 4) {
      expect(medida.fpsMediana, `piso de ${PISO_FPS}fps sob 4× (spec §9)`).toBeGreaterThan(PISO_FPS)
    }
  })
}
```

- [ ] **Step 2: Rodar e registrar a linha de base**

Run: `npx playwright test tests/e2e/medir-quadros-ativacoes.spec.ts --project=chromium`
Expected: PASS nos dois. Anote o `fpsMediana` de 4× — é a linha de base contra a qual as Tasks 8 e 9 serão comparadas.

Se falhar por `quadros <= 60`, a janela do Chrome está oculta e a medição é inválida — traga-a para a frente e repita. Não relaxe o piso.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/medir-quadros-ativacoes.spec.ts
git commit -m "test(ativacoes): portao de quadros com piso de 45fps sob CPU 4x"
```

---

### Task 2: Extrair `movimento.ts`

Funções puras de curva e temporização. Nenhuma mudança de comportamento — o arquivo nasce sozinho e ainda não é usado.

**Files:**
- Create: `components/ativacoes/movimento.ts`
- Test: `tests/unit/ativacoes-movimento.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `ease.outQuad/inCubic/outCubic/outBack`, `squash(t)`, `mola(atual, vel, alvo, dt, rigidez?, amort?)`, `tremorEm(forca, dt)`. Tasks 7 e 8 dependem destes nomes.

- [ ] **Step 1: Escrever o teste que falha**

```ts
// tests/unit/ativacoes-movimento.test.ts
import { describe, expect, it } from 'vitest'
import { ease, mola, squash, tremorEm } from '@/components/ativacoes/movimento'

describe('curvas', () => {
  it('ancoram em 0 e 1', () => {
    for (const nome of ['outQuad', 'inCubic', 'outCubic', 'outBack'] as const) {
      expect(ease[nome](0), nome).toBeCloseTo(0, 5)
      expect(ease[nome](1), nome).toBeCloseTo(1, 5)
    }
  })

  it('outBack passa do alvo — é o que dá vida à entrada', () => {
    const maximo = Math.max(...Array.from({ length: 100 }, (_, i) => ease.outBack(i / 99)))
    expect(maximo).toBeGreaterThan(1)
  })

  it('outQuad desacelera: o primeiro terço anda mais que o último', () => {
    expect(ease.outQuad(0.33)).toBeGreaterThan(1 - ease.outQuad(0.67))
  })
})

describe('squash', () => {
  it('preserva volume aparente — o que cresce numa direcao encolhe na outra', () => {
    const m = squash(0.5)
    expect(m.sx).toBeGreaterThan(1)
    expect(m.sy).toBeLessThan(1)
  })

  it('assenta em repouso nas duas pontas', () => {
    for (const t of [0, 1]) {
      expect(squash(t).sx).toBeCloseTo(1, 5)
      expect(squash(t).sy).toBeCloseTo(1, 5)
    }
  })
})

describe('mola', () => {
  it('persegue o alvo e assenta nele', () => {
    let v = 0
    let x = 0
    for (let i = 0; i < 200; i++) {
      const passo = mola(x, v, 100, 1 / 60)
      x = passo.valor
      v = passo.vel
    }
    expect(x).toBeCloseTo(100, 0)
  })
})

describe('tremorEm', () => {
  it('decai a zero e o decaimento independe do fps', () => {
    const umPasso = tremorEm(10, 0.5)
    let dois = 10
    dois = tremorEm(dois, 0.25)
    dois = tremorEm(dois, 0.25)
    expect(dois).toBeCloseTo(umPasso, 6)
  })
})
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npx vitest run tests/unit/ativacoes-movimento.test.ts`
Expected: FAIL — `Cannot find module '@/components/ativacoes/movimento'`

- [ ] **Step 3: Implementar**

```ts
// components/ativacoes/movimento.ts
/**
 * Curvas e temporização do jogo da dobra. Puro: sem DOM, sem canvas, sem
 * relógio — tudo recebe `t` normalizado ou `dt` em SEGUNDOS.
 *
 * `dt` em segundos e não em quadros porque jogo que conta quadro acelera em
 * monitor de 144Hz e derrete no tablet do evento.
 */

export const ease = {
  outQuad: (t: number) => 1 - (1 - t) * (1 - t),
  inCubic: (t: number) => t * t * t,
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  /** Passa do alvo e volta. A entrada padrão de qualquer coisa que aparece. */
  outBack: (t: number, forca = 1.70158) => {
    const c = forca + 1
    return 1 + c * Math.pow(t - 1, 3) + forca * Math.pow(t - 1, 2)
  },
} as const

/** Pico no meio, repouso nas duas pontas. `t` de 0 a 1 ao longo de ~180ms. */
export function squash(t: number): { sx: number; sy: number } {
  const p = Math.sin(t * Math.PI) * (1 - t)
  return { sx: 1 + p * 0.35, sy: 1 - p * 0.25 }
}

/** Persegue um alvo que pode se mover. Ease tem fim; mola persegue. */
export function mola(
  atual: number,
  vel: number,
  alvo: number,
  dt: number,
  rigidez = 180,
  amort = 22,
): { valor: number; vel: number } {
  const forca = (alvo - atual) * rigidez - vel * amort
  const v = vel + forca * dt
  return { valor: atual + v * dt, vel: v }
}

/** Decaimento exponencial do tremor. Independente de fps por construção. */
export function tremorEm(forca: number, dt: number): number {
  const f = forca * Math.pow(0.001, dt)
  return f <= 0.01 ? 0 : f
}
```

- [ ] **Step 4: Rodar para ver passar**

Run: `npx vitest run tests/unit/ativacoes-movimento.test.ts`
Expected: PASS, 7 testes.

- [ ] **Step 5: Commit**

```bash
git add components/ativacoes/movimento.ts tests/unit/ativacoes-movimento.test.ts
git commit -m "feat(ativacoes): curvas, squash, mola e tremor como funcoes puras"
```

---

### Task 3: Extrair `laco.ts` com hit-stop

Extração pura mais uma capacidade nova que ainda ninguém chama.

**Files:**
- Create: `components/ativacoes/laco.ts`
- Test: `tests/unit/ativacoes-laco.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `criarRelogio()` devolvendo `{ passo(agora): number; congelar(ms: number): void }`. Task 8 chama `congelar`.

- [ ] **Step 1: Escrever o teste que falha**

```ts
// tests/unit/ativacoes-laco.test.ts
import { describe, expect, it } from 'vitest'
import { criarRelogio } from '@/components/ativacoes/laco'

describe('relogio do laco', () => {
  it('devolve dt em segundos entre quadros', () => {
    const r = criarRelogio(1000)
    expect(r.passo(1016)).toBeCloseTo(0.016, 4)
  })

  it('limita dt para aba que voltou do fundo nao teleportar a partida', () => {
    const r = criarRelogio(1000)
    expect(r.passo(9000)).toBeLessThanOrEqual(0.1)
  })

  it('congelar zera o dt pela duracao pedida, e so por ela', () => {
    const r = criarRelogio(1000)
    r.passo(1016)
    r.congelar(40)
    expect(r.passo(1032), 'dentro do congelamento').toBe(0)
    expect(r.passo(1080), 'depois dele').toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npx vitest run tests/unit/ativacoes-laco.test.ts`
Expected: FAIL — `Cannot find module '@/components/ativacoes/laco'`

- [ ] **Step 3: Implementar**

```ts
// components/ativacoes/laco.ts
/** Teto de dt: aba que volta do fundo entrega um salto enorme, e sem teto a
 *  partida teleporta. 100ms é ~6 quadros — o bastante para não travar. */
const DT_MAXIMO = 0.1

/**
 * Relógio do laço de quadro. O hit-stop mora aqui e não no desenho: congelar
 * é parar a SIMULAÇÃO, nunca a renderização. Congelar o desenho junto pisca.
 */
export function criarRelogio(agoraInicial: number) {
  let anterior = agoraInicial
  let congeladoAte = 0

  return {
    /** dt em segundos desde o quadro anterior. Zero enquanto congelado. */
    passo(agora: number): number {
      const bruto = (agora - anterior) / 1000
      anterior = agora
      if (agora < congeladoAte) return 0
      return Math.min(bruto, DT_MAXIMO)
    },
    /** Congela a simulação. 40ms no acerto normal, 80ms no premiado. */
    congelar(ms: number) {
      congeladoAte = anterior + ms
    },
  }
}
```

- [ ] **Step 4: Rodar para ver passar**

Run: `npx vitest run tests/unit/ativacoes-laco.test.ts`
Expected: PASS, 3 testes.

- [ ] **Step 5: Commit**

```bash
git add components/ativacoes/laco.ts tests/unit/ativacoes-laco.test.ts
git commit -m "feat(ativacoes): relogio do laco com teto de dt e hit-stop"
```

---

### Task 4: Tipo de alvo no motor

O coração da spec §6. Motor puro, testável sem canvas.

**Files:**
- Modify: `components/ativacoes/motor-reflexo.ts` (tipo `Alvo`, `nascer`, `tocar`)
- Test: `tests/unit/ativacoes-motor.test.ts` (acrescentar, não substituir os 43 existentes)

**Interfaces:**
- Consumes: `proximo(semente)` interno, `Partida`, `Alvo`.
- Produces: `Alvo.tipo: TipoAlvo`, `type TipoAlvo = 'normal' | 'premiado' | 'recusa'`, `PESO_PREMIADO = 3`. Tasks 5 e 8 leem `alvo.tipo`.

- [ ] **Step 1: Escrever os testes que falham**

```ts
// acrescentar em tests/unit/ativacoes-motor.test.ts
import { PESO_PREMIADO, type TipoAlvo } from '@/components/ativacoes/motor-reflexo'

describe('tipos de alvo', () => {
  /** Roda uma partida inteira e devolve todo alvo que nasceu, por tipo. */
  function tiposNascidos(semente: number): TipoAlvo[] {
    let p = reiniciar(criarPartida(semente, 0), 0)
    const vistos = new Map<number, TipoAlvo>()
    for (let i = 1; i * 16 < DURACAO_MS; i++) {
      p = avancar(p, i * 16)
      for (const a of p.alvos) vistos.set(a.id, a.tipo)
    }
    return [...vistos.values()]
  }

  it('a fase de chegada so entrega alvo normal — o jogador precisa entender antes de ser cobrado', () => {
    let p = reiniciar(criarPartida(7, 0), 0)
    for (let i = 1; i * 16 < 3000; i++) {
      p = avancar(p, i * 16)
      for (const a of p.alvos) expect(a.tipo).toBe('normal')
    }
  })

  it('a partida inteira produz os tres tipos', () => {
    const tipos = new Set(tiposNascidos(42))
    expect(tipos.has('normal')).toBe(true)
    expect(tipos.has('premiado')).toBe(true)
    expect(tipos.has('recusa')).toBe(true)
  })

  it('premiado vale 3 e recusa nao tira ponto', () => {
    const base = reiniciar(criarPartida(1, 0), 0)
    const alvo = { id: 1, x: 0.5, y: 0.5, raio: 0.05, nascidoEm: 0, tipo: 'premiado' as const }
    const comPremiado = tocarEm({ ...base, alvos: [alvo] }, alvo, 200)
    expect(comPremiado.acertos).toBe(PESO_PREMIADO)

    const recusa = { ...alvo, tipo: 'recusa' as const }
    const comRecusa = tocarEm({ ...base, alvos: [recusa], sequencia: 5 }, recusa, 200)
    expect(comRecusa.acertos, 'recusa nunca tira ponto').toBe(0)
    expect(comRecusa.sequencia, 'recusa zera a sequencia').toBe(0)
  })

  it('premiado vive menos que normal — e o que cria a decisao', () => {
    const p = reiniciar(criarPartida(3, 0), 0)
    const normal = { id: 1, x: 0.5, y: 0.5, raio: 0.05, nascidoEm: 0, tipo: 'normal' as const }
    const premiado = { ...normal, tipo: 'premiado' as const }
    expect(vidaDoAlvo(p, premiado)).toBeLessThan(vidaDoAlvo(p, normal))
  })

  it('e determinístico: mesma semente, mesmos tipos', () => {
    expect(tiposNascidos(99)).toEqual(tiposNascidos(99))
  })
})
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npx vitest run tests/unit/ativacoes-motor.test.ts`
Expected: FAIL — `PESO_PREMIADO` não exportado e `a.tipo` inexistente.

- [ ] **Step 3: Implementar no motor**

Em `motor-reflexo.ts`, junto de `Alvo` (linha ~84):

```ts
export type TipoAlvo = 'normal' | 'premiado' | 'recusa'

/** Acerto de premiado vale isto em `acertos`. Recusa nunca subtrai — placar
 *  negativo faz o jogador se sentir mal com a marca do cliente na tela. */
export const PESO_PREMIADO = 3

/** Fração da vida normal que o premiado dura. É o que transforma prioridade
 *  em DECISÃO: buscá-lo custa os normais que morrem no desvio. */
export const VIDA_PREMIADO = 0.55

export type Alvo = {
  id: number
  x: number
  y: number
  raio: number
  nascidoEm: number
  tipo: TipoAlvo
}

/**
 * Distribuição por fase. `chegada` é 100% normal de propósito: a spec de
 * ativação exige curva de aprendizado zero, e cobrar discriminação antes de o
 * jogador ter visto um alvo sequer é cobrar regra que ninguém ensinou.
 */
function tipoSorteado(decorridoMs: number, semente: number): { tipo: TipoAlvo; semente: number } {
  const { valor, semente: proxima } = proximo(semente)
  const fase = faseDoRepique(decorridoMs)
  if (fase === REPIQUE_CHEGADA) return { tipo: 'normal', semente: proxima }
  if (valor < 1 / 8) return { tipo: 'recusa', semente: proxima }
  if (valor < 1 / 8 + 1 / 6) return { tipo: 'premiado', semente: proxima }
  return { tipo: 'normal', semente: proxima }
}
```

Em `nascer`, depois de sortear posição e raio, sorteie o tipo com a semente devolvida e inclua `tipo` no objeto do alvo.

Em `vidaDoAlvo`, multiplique o resultado por `VIDA_PREMIADO` quando `alvo.tipo === 'premiado'`.

Em `tocarEm` (linha ~460), ramifique antes de contabilizar:

```ts
if (alvo.tipo === 'recusa') {
  return {
    ...partida,
    alvos: partida.alvos.filter((a) => a.id !== alvo.id),
    sequencia: 0,
  }
}
const peso = alvo.tipo === 'premiado' ? PESO_PREMIADO : 1
```

e use `acertos: partida.acertos + peso` no lugar de `+ 1`.

- [ ] **Step 4: Rodar a suíte inteira do motor**

Run: `npx vitest run tests/unit/ativacoes-motor.test.ts`
Expected: PASS — os 5 novos **e os 43 antigos**. Se algum antigo quebrou, ele construía `Alvo` sem `tipo`; acrescente `tipo: 'normal'` no literal do teste, nunca afrouxe o motor.

- [ ] **Step 5: Commit**

```bash
git add components/ativacoes/motor-reflexo.ts tests/unit/ativacoes-motor.test.ts
git commit -m "feat(ativacoes): alvo ganha tipo — premiado vale 3 e vive menos, recusa zera sequencia"
```

---

### Task 5: O tema desenha os três tipos

**Files:**
- Modify: `components/ativacoes/temas/tipos.ts` (assinatura de desenho de alvo)
- Modify: `components/ativacoes/temas/junino-balao.ts`
- Test: `tests/unit/ativacoes-tema.test.ts`

**Interfaces:**
- Consumes: `TipoAlvo` da Task 4.
- Produces: o tema recebe `tipo` ao desenhar alvo. Task 8 desenha flash sobre a mesma forma.

- [ ] **Step 1: Escrever o teste que falha**

```ts
// acrescentar em tests/unit/ativacoes-tema.test.ts
import { junino } from '@/components/ativacoes/temas/junino'

describe('alvo por tipo', () => {
  /** Contexto 2D falso que registra os caminhos desenhados. */
  function ctxEspiao() {
    const chamadas: string[] = []
    const alvo = new Proxy({} as CanvasRenderingContext2D, {
      get: (_, prop: string) => {
        if (prop === 'canvas') return { width: 800, height: 600 }
        return (...args: unknown[]) => {
          chamadas.push(`${prop}(${args.length})`)
          return undefined
        }
      },
      set: () => true,
    })
    return { ctx: alvo, chamadas }
  }

  it('cada tipo desenha um caminho diferente — a leitura e por FORMA, nao por cor', () => {
    const assinatura = (tipo: 'normal' | 'premiado' | 'recusa') => {
      const { ctx, chamadas } = ctxEspiao()
      junino.desenharAlvo(ctx, { x: 0.5, y: 0.5, raio: 0.06, tipo, fase: 0.5 })
      return chamadas.join('|')
    }
    const n = assinatura('normal')
    const p = assinatura('premiado')
    const r = assinatura('recusa')
    expect(p, 'premiado precisa diferir de normal por forma').not.toBe(n)
    expect(r, 'recusa precisa diferir de normal por forma').not.toBe(n)
    expect(r, 'recusa precisa diferir de premiado por forma').not.toBe(p)
  })

  it('nao usa shadowBlur nem filter — proibidos pelo orcamento de quadro', () => {
    const { ctx, chamadas } = ctxEspiao()
    junino.desenharAlvo(ctx, { x: 0.5, y: 0.5, raio: 0.06, tipo: 'premiado', fase: 0.5 })
    expect(chamadas.join('|')).not.toMatch(/shadowBlur|filter/)
  })
})
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npx vitest run tests/unit/ativacoes-tema.test.ts`
Expected: FAIL — `desenharAlvo` não aceita `tipo`.

- [ ] **Step 3: Implementar**

Em `temas/tipos.ts`, acrescente `tipo: TipoAlvo` ao parâmetro de `desenharAlvo`.

Em `junino-balao.ts`, ramifique por tipo. As três formas, e por que cada uma:

- **normal** — o balão de hoje, sem mudança
- **premiado** — balão com **anel de gomos vazado** e brilho por composição aditiva (`globalCompositeOperation = 'lighter'`), nunca `shadowBlur`
- **recusa** — **losango angular escuro**, silhueta oposta à do balão. Angular contra redondo é a distinção que sobrevive a projetor descalibrado e a daltonismo

- [ ] **Step 4: Rodar para ver passar**

Run: `npx vitest run tests/unit/ativacoes-tema.test.ts`
Expected: PASS.

- [ ] **Step 5: Verificar na tela**

Run: `npm run dev`, abra `/pt/ativacoes/` com o Chrome **visível**, jogue até o `pico`.
Expected: os três tipos aparecem e se distinguem à distância de um braço. Se você precisar aproximar para distinguir, a forma está fraca — volte ao Step 3.

- [ ] **Step 6: Commit**

```bash
git add components/ativacoes/temas/ tests/unit/ativacoes-tema.test.ts
git commit -m "feat(ativacoes): tema desenha os tres tipos de alvo por forma"
```

---

### Task 6: Painel de fim toma conta

Spec §4. A maior perda de dinheiro da página.

**Files:**
- Create: `components/ativacoes/hud.tsx`
- Modify: `components/ativacoes/CapaJogo.tsx` (mover o bloco de fim para `hud.tsx`)
- Test: `tests/e2e/ativacoes-fim-legivel.spec.ts`

**Interfaces:**
- Consumes: `ease.outQuad`, `ease.outBack`, `mola` da Task 2.
- Produces: `<PainelDeFim>` com `data-testid="painel-fim"` e cada linha em `[data-linha-fim]`.

- [ ] **Step 1: Escrever o teste de contraste que falha**

```ts
// tests/e2e/ativacoes-fim-legivel.spec.ts
import { expect, test } from '@playwright/test'

/**
 * O TESTE QUE IMPEDE A REGRESSÃO QUE ORIGINOU A SPEC.
 *
 * Em 2026-08-29 as frases "Sequência fechada — o brinde é seu." e "Essa
 * mecânica, com a marca da sua agência" estavam ILEGÍVEIS sobre a ilustração.
 * Contraste é medido, não olhado.
 */
test('todo texto do painel de fim tem contraste >= 4.5:1', async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('/pt/ativacoes/')
  const canvas = page.locator('canvas[aria-label]')
  await expect(canvas).toBeVisible({ timeout: 30_000 })

  await canvas.click({ position: { x: 40, y: 40 } })
  const painel = page.locator('[data-testid="painel-fim"]')
  await expect(painel).toBeVisible({ timeout: 30_000 })

  const relacoes = await page.evaluate(() => {
    const lum = (c: string) => {
      const [r, g, b] = c.match(/\d+/g)!.slice(0, 3).map(Number).map((v) => {
        const s = v / 255
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
      })
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    return [...document.querySelectorAll('[data-linha-fim]')].map((el) => {
      const e = getComputedStyle(el as HTMLElement)
      const pai = getComputedStyle((el as HTMLElement).closest('[data-testid="painel-fim"]')!)
      const a = lum(e.color)
      const b = lum(pai.backgroundColor)
      const [claro, escuro] = a > b ? [a, b] : [b, a]
      return { texto: (el.textContent ?? '').slice(0, 40), razao: (claro + 0.05) / (escuro + 0.05) }
    })
  })

  expect(relacoes.length, 'o painel precisa marcar suas linhas com data-linha-fim').toBeGreaterThan(3)
  for (const l of relacoes) {
    expect(l.razao, `"${l.texto}" precisa de 4.5:1`).toBeGreaterThanOrEqual(4.5)
  }
})
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npx playwright test tests/e2e/ativacoes-fim-legivel.spec.ts --project=chromium`
Expected: FAIL — não existe `[data-testid="painel-fim"]`.

- [ ] **Step 3: Implementar o véu e o painel**

No canvas, ao entrar em `fase === 'fim'`:

```ts
// O véu. NÃO é blur: filter e shadowBlur estão proibidos pelo orçamento de
// quadro. Um fillRect é mais barato que o estado atual, porque a cena
// CONGELA junto — nada de brasa, bandeirinha ou balão atrás do resultado.
const t = Math.min(1, (agora - fimEm) / 220)
ctx.fillStyle = `rgba(6, 10, 24, ${0.72 * ease.outQuad(t)})`
ctx.fillRect(0, 0, canvas.width, canvas.height)
```

`hud.tsx` renderiza o painel em DOM (não em canvas — texto em DOM é acessível, selecionável e testável por contraste), com fundo sólido, entrando em `ease.outBack` deslocado 12px, nesta ordem:

1. `Acabou o tempo.`
2. o número grande em `--mono`, contando de 0 ao valor em 400ms com `mola`
3. a sequência e o brinde
4. a frase que vende
5. os dois botões, **fundo sólido**, não contorno
6. o QR, **ancorado dentro do painel**

Cada linha leva `data-linha-fim`.

- [ ] **Step 4: Rodar para ver passar**

Run: `npx playwright test tests/e2e/ativacoes-fim-legivel.spec.ts --project=chromium`
Expected: PASS, todas as linhas ≥ 4.5:1.

- [ ] **Step 5: Confirmar que o portão de quadros não regrediu**

Run: `npx playwright test tests/e2e/medir-quadros-ativacoes.spec.ts --project=chromium`
Expected: PASS, e o `fpsMediana` de 4× **igual ou melhor** que a linha de base da Task 1 — a cena congela no fim, então deve melhorar.

- [ ] **Step 6: Commit**

```bash
git add components/ativacoes/hud.tsx components/ativacoes/CapaJogo.tsx tests/e2e/ativacoes-fim-legivel.spec.ts
git commit -m "feat(ativacoes): fim de partida toma conta com veu e painel legivel"
```

---

### Task 7: Aplicar a camada de movimento

Spec §7. Agora que `movimento.ts` e `laco.ts` existem e o painel está legível.

**Files:**
- Modify: `components/ativacoes/CapaJogo.tsx`
- Test: `tests/unit/ativacoes-capa.test.tsx`

**Interfaces:**
- Consumes: `ease`, `squash`, `tremorEm` (Task 2), `criarRelogio` (Task 3), `alvo.tipo` (Task 4).
- Produces: nada que tasks seguintes consumam.

- [ ] **Step 1: Escrever o teste de movimento reduzido**

```ts
// acrescentar em tests/unit/ativacoes-capa.test.tsx
it('sob movimento reduzido nao ha tremor, mas hit-stop e flash permanecem', () => {
  // Hit-stop e flash NÃO são movimento: são temporização e brilho, e são o
  // que mantém o retorno de acerto legível para quem desligou animação.
  // A spec §10 exige exatamente esta distinção.
  window.matchMedia = ((q: string) => ({
    matches: q.includes('prefers-reduced-motion'),
    media: q,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia

  const { container } = render(<CapaJogo dict={dicionarioPt} locale="pt" />)
  const canvas = container.querySelector('canvas')
  expect(canvas).toBeTruthy()
  expect(canvas!.dataset.tremor ?? '0').toBe('0')
})
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npx vitest run tests/unit/ativacoes-capa.test.tsx`
Expected: FAIL — `dataset.tremor` não existe.

- [ ] **Step 3: Implementar, com hierarquia**

No acerto, na ordem que o olho pede:

| Evento | hit-stop | flash | tremor | squash |
|---|---|---|---|---|
| normal | 40 ms | 80 ms | 2 px | sim |
| premiado | 80 ms | 80 ms | 4 px | sim |
| sequência fechada | 80 ms | 80 ms | 6 px | sim |
| recusa tocado | — | — | 1 px | — |

Alvo nasce com `ease.outBack` sobre o raio. Sob `menosMovimento`: sem tremor, sem overshoot, sem antecipação; hit-stop e flash **permanecem**. Escreva `canvas.dataset.tremor` só quando mudar de zero para não-zero, seguindo o padrão de `dataset.alvos` que já existe (não escrever no DOM a 60Hz).

- [ ] **Step 4: Rodar para ver passar**

Run: `npx vitest run tests/unit/ativacoes-capa.test.tsx`
Expected: PASS.

- [ ] **Step 5: Portão de quadros**

Run: `npx playwright test tests/e2e/medir-quadros-ativacoes.spec.ts --project=chromium`
Expected: PASS com piso de 45. Se caiu abaixo, reduza o orçamento de partículas do estouro **antes** de mexer em qualquer outra coisa — é o suspeito nº 1.

- [ ] **Step 6: Commit**

```bash
git add components/ativacoes/CapaJogo.tsx tests/unit/ativacoes-capa.test.tsx
git commit -m "feat(ativacoes): hit-stop, flash, squash e tremor com hierarquia por evento"
```

---

### Task 8: A cena reage

Spec §5. Maior retorno por trabalho: o ativo já existe e está ocioso.

**Files:**
- Modify: `components/ativacoes/temas/tipos.ts` (gancho `reagir`)
- Modify: `components/ativacoes/temas/junino-fogos.ts`, `junino-gente.ts`, `junino-movimento.ts`
- Modify: `components/ativacoes/CapaJogo.tsx`
- Test: `tests/unit/ativacoes-tema.test.ts`

**Interfaces:**
- Consumes: `alvo.tipo` (Task 4).
- Produces: `reagir?(evento: EventoCena, intensidade: number): void` — **opcional**, tema que não implemente continua funcionando.

- [ ] **Step 1: Escrever o teste que falha**

```ts
// acrescentar em tests/unit/ativacoes-tema.test.ts
describe('cena reativa', () => {
  it('reagir e opcional — tema sem ele continua desenhando', () => {
    const semReagir = { ...junino, reagir: undefined }
    const { ctx } = ctxEspiao()
    expect(() => semReagir.desenharFundo(ctx, { t: 0, largura: 800, altura: 600 })).not.toThrow()
  })

  it('sequencia acende a fogueira: mais intensidade, mais tinta', () => {
    const tinta = (intensidade: number) => {
      const { ctx, chamadas } = ctxEspiao()
      const tema = { ...junino }
      tema.reagir?.('sequencia', intensidade)
      tema.desenharFundo(ctx, { t: 1, largura: 800, altura: 600 })
      return chamadas.length
    }
    expect(tinta(1)).toBeGreaterThan(tinta(0))
  })
})
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npx vitest run tests/unit/ativacoes-tema.test.ts`
Expected: FAIL — `reagir` não existe em `tipos.ts`.

- [ ] **Step 3: Implementar**

```ts
// temas/tipos.ts
export type EventoCena = 'acerto' | 'sequencia' | 'fechou' | 'erro'
```

Acrescente `reagir?(evento: EventoCena, intensidade: number): void` ao tipo do tema.

No junino, as quatro reações da spec §5. **Nenhuma cria objeto por quadro** — todas ajustam parâmetro de desenho que já existe:

| Evento | Reação | Onde |
|---|---|---|
| `acerto` | bandeirinhas balançam a partir do ponto, decaindo | `junino-enfeite.ts` |
| `sequencia` | fogueira cresce e clareia a praça | `junino-fogos.ts` |
| `fechou` | dançarinos comemoram por ~1 s | `junino-gente.ts` |
| `erro` | uma bandeirinha apaga e reacende | `junino-enfeite.ts` |

**A comemoração é quase de graça — o commit `588221e` já construiu a base.**
`junino-gente.ts` tem repertório de `POSES`, `misturarPoses(a, b, t)` com curva, e
`PAR_DE_POSE`. Entre as poses já existe **`palma`** ("as duas mãos juntas à frente do
peito"). Comemorar é **enviesar a escolha de pose** para `palma` e `erguido` durante ~1 s,
não desenhar nada novo.

Respeite duas regras que aquele commit estabeleceu, e que valem como restrição desta task:

- **Braço simétrico não dança.** Toda pose tem as mãos em alturas diferentes. Se você criar
  pose nova, ela não pode ter as duas mãos na mesma altura — o olho lê hélice como objeto,
  não como pessoa.
- **Só a camada `'perto'` dança.** A de `'longe'` é assada no sprite do cenário e não pode
  reagir. `desenharGente(pincel, largura, altura, escalaEm, tempo, camada)` — o viés de
  pose só se aplica quando `camada === 'perto'`.

Todas são no-op sob `prefers-reduced-motion`.

- [ ] **Step 4: Rodar para ver passar**

Run: `npx vitest run tests/unit/ativacoes-tema.test.ts`
Expected: PASS.

- [ ] **Step 5: Portão de quadros — o mais arriscado do plano**

Run: `npx playwright test tests/e2e/medir-quadros-ativacoes.spec.ts --project=chromium`
Expected: PASS com piso de 45. Fundo animado é custo de preenchimento de verdade; esta é a task com maior chance de reprovar.

- [ ] **Step 6: Suíte inteira**

Run: `npm run typecheck && npm run lint && npx vitest run`
Expected: tudo verde.

- [ ] **Step 7: Commit**

```bash
git add components/ativacoes/ tests/unit/ativacoes-tema.test.ts
git commit -m "feat(ativacoes): a cena reage ao jogo — fogueira, bandeirinhas e dancarinos"
```

---

### Task 9: Fechar o `CapaJogo.tsx`

Critério de aceitação nº 6: abaixo de 400 linhas.

**Files:**
- Modify: `components/ativacoes/CapaJogo.tsx`

- [ ] **Step 1: Medir**

Run: `wc -l components/ativacoes/CapaJogo.tsx`
Expected: se já estiver < 400 depois das extrações, pule para o Step 3.

- [ ] **Step 2: Extrair o que sobrou**

O que resta de desenho puro sai para `components/ativacoes/desenho.ts`. Extração pura: nenhuma mudança de comportamento, nenhum teste novo, os existentes continuam verdes.

- [ ] **Step 3: Verificação final**

Run: `npm run typecheck && npm run lint && npx vitest run && npx playwright test --project=chromium`
Expected: tudo verde, incluindo os dois portões (quadros e contraste).

- [ ] **Step 4: Commit**

```bash
git add components/ativacoes/
git commit -m "refactor(ativacoes): CapaJogo abaixo de 400 linhas"
```

---

## Verificação contra os critérios de aceitação da spec

| Critério | Task |
|---|---|
| 1. Painel de fim ≥ 4.5:1, medido | 6 |
| 2. Premiado e recusa distinguíveis por forma | 4, 5 |
| 3. Hit-stop, flash e squash; sequência dispara cena | 7, 8 |
| 4. 45 fps sob CPU 4× | 1 (portão), verificado em 6, 7, 8 |
| 5. Movimento reduzido: jogável e legível | 7 |
| 6. `CapaJogo.tsx` < 400 linhas | 9 |
