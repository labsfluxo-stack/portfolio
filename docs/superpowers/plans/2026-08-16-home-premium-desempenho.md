# Home escura — desempenho e camada premium · Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Devolver a cena 3D da home a uma taxa de quadros decente consertando a escada de qualidade adaptativa, e então aplicar a camada premium que a polaridade escura permite.

**Architecture:** A lógica de orçamento de quadro sai de dentro do componente React para um módulo puro e testável (`portico-quality.ts`). O período do monitor passa a ser medido **antes** da cena existir, em `PorticoSlot`, e entra no `Portico` como propriedade. A camada visual é CSS puro, reaproveitando as classes já testadas pela landing — nenhuma biblioteca de animação entra no projeto, e uma sai.

**Tech Stack:** Next.js 16 (App Router, export estático), React 19, TypeScript, Tailwind v4, three.js 0.185 + @react-three/fiber 9, Vitest + Testing Library (jsdom), Playwright (chromium/firefox/webkit).

**Spec:** [`docs/superpowers/specs/2026-08-16-home-premium-desempenho-design.md`](../specs/2026-08-16-home-premium-desempenho-design.md)

## Global Constraints

- **Português em todo comentário, mensagem de commit e nome de identificador de domínio.** É a língua do repositório inteiro.
- **Nenhuma biblioteca de animação nova.** Nem anime.js, nem Rive, nem substituto para o `motion` que sai na Tarefa 5.
- **Uma animação infinita por página.** A landing já gastou a dela (`.borda-viva`); a home ganha exatamente uma. Um teste trava esse orçamento.
- **Nenhum estado inicial escondido fora de `@supports (animation-timeline: view())`.** Sem suporte, a página aparece completa. Esta regra já custou caro uma vez (as quatro artes da landing renderizaram invisíveis) e há teste guardando-a.
- **`prefers-reduced-motion` desliga movimento de rolagem também**, via `animation-timeline: auto !important` — zerar duração não basta em scroll timeline.
- **Commits com `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`** na última linha.
- **Branch:** `feat/landing-captacao` (a atual). Não abrir branch nova.
- **Portão entre a Tarefa 6 e a Tarefa 7:** as fases de desempenho são medidas antes de qualquer pixel novo. Ver Tarefa 6.

## Estrutura de arquivos

**Criar:**

| Arquivo | Responsabilidade |
|---|---|
| `components/three/portico-quality.ts` | Degraus de qualidade, orçamento de quadro e medição do vsync. Lógica pura, sem React, sem three.js. |
| `tests/unit/portico-quality.test.ts` | Prova que a escada rebaixa quando deve — inclusive o defeito de hoje. |
| `tests/unit/reveal.test.tsx` | Prova que o escalonamento sobrevive à troca de motion para CSS. |
| `tests/unit/home-movimento.test.ts` | Guardas da camada premium escura, no molde de `landing-movimento.test.ts`. |

**Modificar:**

| Arquivo | Mudança |
|---|---|
| `components/three/Portico.tsx` | Consome `portico-quality`; recebe `vsync` por propriedade; comentário obsoleto da linha ~346 corrigido. |
| `components/three/PorticoSlot.tsx` | Mede o vsync na janela de ociosidade e repassa. |
| `components/ui/Reveal.tsx` | Sai `motion/react`, entra CSS; vira Server Component; `delayMs` → `ordem`. |
| `components/sections/About.tsx`, `Systems.tsx`, `Stack.tsx`, `Contact.tsx` | Chamadas de `Reveal` atualizadas; `Contact` ganha a aurora. |
| `components/sections/Hero.tsx` | Facho estático atrás da cena. |
| `components/sections/SystemCard.tsx` | Brilho de borda no hover. |
| `app/[locale]/(site)/layout.tsx` | Grão e vinheta — escopo escuro (home + case studies), fora da landing. |
| `app/globals.css` | Escalonamento por `--i`, facho, aurora, brilho, grão, vinheta. |
| `components/art/SystemArt.tsx`, `components/diagrams/parts.tsx` | Classes de traçado e `pathLength`. |
| `package.json` | `motion` removido. |
| `tests/unit/landing-movimento.test.ts` | Orçamento de infinitas passa a ser por página. |

## Desvio do spec, decidido durante o levantamento

O spec §6.2 coloca a aurora atrás de `Boot`. **`Boot` é um overlay fixo (`fixed inset-0 z-50`) que roda uma vez por sessão e desmonta** (`Boot.tsx:68`, `if (!visible) return null`). A única animação perpétua da página ficaria visível por ~2 s, uma vez por visitante.

A aurora vai para a seção `Contact`, atrás da chamada final. Além de ser onde ela é vista, é a mesma gramática que a landing já estabeleceu: lá a `.borda-viva` — o único movimento infinito daquela página — também está no CTA final. Movimento perpétuo apontando para a conversão é sistema; espalhado é ruído.

---

### Task 1: Extrair a lógica de qualidade para um módulo puro

Refatoração sem mudança de comportamento. Ela existe para que o defeito possa ser reproduzido por teste na Tarefa 2 — hoje `useQuality` é privada de um arquivo de 1397 linhas que importa three.js e não sobe em jsdom.

**Files:**
- Create: `components/three/portico-quality.ts`
- Modify: `components/three/Portico.tsx:283-476`

**Interfaces:**
- Consumes: nada.
- Produces: `TIERS`, `Tier`, `WINDOW`, `WARMUP`, `SETTLE`, `startingStep(): number`, `createMeter(): Meter`, `Meter`, `Verdict`, `judge(meter: Meter, delta: number, step: number, steps: number): Verdict`.

- [ ] **Step 1: Criar o módulo com a lógica de hoje, copiada fielmente**

Criar `components/three/portico-quality.ts`. Os comentários longos de `Portico.tsx:262-372` vão junto — eles explicam a ordem dos degraus e a janela de avaliação, e perdem o dono se ficarem para trás. **Não corrigir nada nesta tarefa**, nem o comentário obsoleto: o objetivo é que o comportamento continue idêntico.

```ts
/**
 * Degraus de qualidade da cena e o medidor que decide entre eles.
 *
 * Vive fora de `Portico.tsx` porque é lógica pura e precisa ser testável: o
 * componente importa three.js e não sobe em jsdom, então enquanto a decisão
 * morava lá dentro nenhum teste alcançava a regra que protege a máquina fraca.
 */

/**
 * Os degraus de qualidade, do cheio ao mínimo.
 *
 * A ordem não é de gosto: é de ganho por unidade de estrago.
 *
 * 1. `dpr` primeiro, porque o custo de pixel é QUADRÁTICO e nenhum outro corte
 *    chega perto. De 1,25 para 1,0 são 36 % menos fragmentos.
 * 2. Sombra depois: o mapa do sol cai pela metade e as luminárias do pórtico
 *    param de projetar, o que apaga um passe de sombra inteiro. O sol continua
 *    projetando, porque é ele que separa os degraus da montagem.
 * 3. `dpr` de novo, por último — o mesmo corte que já é o mais eficaz.
 *
 * Cada degrau mexe em UM eixo. Descer dois de uma vez esconde qual deles pagou.
 */
export const TIERS = [
  // O degrau de estúdio, e a cena começa nele em máquina de ponteiro fino.
  // Esta cena é o pior caso possível para resolução baixa, porque é feita de
  // geometria FINA: cabo de 9 cm, montante de guarda-corpo, degrau de escada,
  // trama da grade. Nenhuma cobre um pixel inteiro a 1,25, e aresta que não
  // cobre um pixel serrilha por definição — MSAA ajuda, não salva.
  { dpr: 2, shadow: 4096, practicals: true },
  { dpr: 1.25, shadow: 2048, practicals: true },
  { dpr: 1.0, shadow: 2048, practicals: true },
  { dpr: 1.0, shadow: 1024, practicals: false },
  { dpr: 0.8, shadow: 1024, practicals: false },
] as const

export type Tier = (typeof TIERS)[number]

/**
 * A janela de avaliação, medida nos DOIS eixos.
 *
 * Só em quadros, falha onde não pode: numa máquina a dois quadros por segundo,
 * quarenta e oito quadros são vinte e quatro segundos, e quem a proteção existe
 * para socorrer já foi embora. Só em tempo, o problema se inverte: meio segundo
 * a 144 Hz são setenta quadros de mediana desnecessária, e a 2 Hz é UM quadro.
 */
export const WINDOW = { min: 10, span: 0.5, cap: 90 } as const
/** Segundos ignorados no começo: compilação de shader, cube map e envio de textura. */
export const WARMUP = 3
/** Segundos de espera depois de cada degrau, para o novo regime assentar. */
export const SETTLE = 1.5

export type Meter = {
  age: number
  since: number
  at: number
  span: number
  vsync: number
  gaps: Float64Array
}

export function createMeter(): Meter {
  return { age: 0, since: 0, at: 0, span: 0, vsync: Infinity, gaps: new Float64Array(WINDOW.cap) }
}

/**
 * Em que degrau a escada COMEÇA, decidido antes do primeiro quadro.
 *
 * O sinal é `pointer: coarse` — dedo, não mouse. Não é user-agent (mentira
 * fácil) nem largura de janela (uma janela estreita num desktop não é um
 * telefone). `hardwareConcurrency` baixo entra pelo mesmo motivo: dois núcleos
 * não sustentam a geração de textura competindo com a rolagem.
 */
export function startingStep(): number {
  if (typeof window === 'undefined') return 1
  const toque = window.matchMedia?.('(pointer: coarse)').matches ?? false
  const poucosNucleos = (navigator.hardwareConcurrency ?? 8) <= 4
  return toque || poucosNucleos ? 3 : 1
}

export type Verdict = 'hold' | 'down' | 'up'

/**
 * Consome um quadro e diz o que fazer com o degrau atual.
 *
 * **Só desce até a Tarefa 2 provar o contrário** — ver o teste que acompanha
 * este módulo. O orçamento sai do próprio monitor, não de um número redondo:
 * comparar `delta` contra 16,7 ms rebaixaria uma cena perfeita num painel de
 * 30 Hz. O que se mede durante o aquecimento é o quadro MAIS RÁPIDO que o
 * navegador entregou.
 */
export function judge(meter: Meter, delta: number, step: number, steps: number): Verdict {
  meter.age += delta
  if (meter.age < WARMUP) {
    // O piso do aquecimento é o período do vsync. Preso entre 240 e 20 Hz
    // porque dois rAF que se juntam devolvem um delta absurdamente curto.
    if (delta > 1 / 240 && delta < meter.vsync) meter.vsync = Math.min(delta, 1 / 20)
    return 'hold'
  }
  if (meter.age - meter.since < SETTLE) return 'hold'

  meter.gaps[meter.at++] = delta
  meter.span += delta
  if (meter.at < WINDOW.min || (meter.span < WINDOW.span && meter.at < WINDOW.cap)) return 'hold'

  const sorted = [...meter.gaps.subarray(0, meter.at)].sort((a, b) => a - b)
  const median = sorted[meter.at >> 1] ?? 0
  meter.at = 0
  meter.span = 0

  // Metade da taxa do monitor, e nunca mais folgado que 45 quadros por segundo.
  const slow = Math.max(meter.vsync * 2.2, 1 / 45)
  if (median > slow && step < steps - 1) {
    meter.since = meter.age
    return 'down'
  }

  // A subida, com limiar bem mais apertado que o da descida. Subir dobra o
  // custo de fragmento, então só vale quando sobra folga de verdade. Com os
  // dois limiares iguais a cena ficaria pingando entre dois degraus.
  if (median < meter.vsync * 1.25 && step > 0) {
    meter.since = meter.age
    return 'up'
  }
  return 'hold'
}
```

- [ ] **Step 2: Trocar o miolo de `Portico.tsx` pelo módulo**

Em `components/three/Portico.tsx`, apagar o bloco `// ── Qualidade adaptativa ──` inteiro (as definições de `TIERS`, `Tier`, `WINDOW`, `WARMUP`, `SETTLE`, `startingStep` e o corpo de `watch`, linhas ~260 a ~476) e deixar apenas o hook, agora consumindo o módulo:

```tsx
import {
  TIERS,
  createMeter,
  judge,
  startingStep,
  type Tier,
} from './portico-quality'

function useQuality(): { tier: Tier; watch: (delta: number) => void } {
  const setDpr = useThree((state) => state.setDpr)
  const [step, setStep] = useState(startingStep)
  const meter = useRef(createMeter())

  const tier = TIERS[Math.min(step, TIERS.length - 1)] ?? TIERS[0]

  useEffect(() => {
    // O valor do degrau, DIRETO — sem teto no `devicePixelRatio`. 1 é o máximo
    // que a tela EXIBE, não o máximo que vale renderizar: desenhar acima e
    // deixar o navegador reduzir é SUPERSAMPLING, a técnica mais eficaz contra
    // serrilhado em aresta fina, que é do que esta cena é feita.
    setDpr(tier.dpr)
  }, [tier, setDpr])

  const watch = (delta: number): void => {
    const verdict = judge(meter.current, delta, step, TIERS.length)
    if (verdict === 'down') setStep((current) => current + 1)
    else if (verdict === 'up') setStep((current) => current - 1)
  }

  return { tier, watch }
}
```

Manter o comentário longo que explica o `setDpr` sem teto — ele registra um erro já cometido.

- [ ] **Step 3: Verificar que nada quebrou**

```bash
cd /g/documentos/portfolio && npm run typecheck && npm run lint && npm test
```

Esperado: tudo passa, mesma contagem de testes de antes. Esta tarefa não adiciona teste — ela existe para tornar a próxima possível.

- [ ] **Step 4: Commit**

```bash
git add components/three/portico-quality.ts components/three/Portico.tsx
git commit -F - <<'EOF'
refactor(portico): a escada de qualidade sai para um modulo testavel

Sem mudanca de comportamento. A decisao de rebaixar a cena morava dentro de um
arquivo de 1397 linhas que importa three.js e nao sobe em jsdom -- entao nenhum
teste alcancava justamente a regra que protege a maquina fraca.

Movido tal e qual, comentarios inclusive. A correcao vem no proximo commit, com
o teste que reproduz o defeito primeiro.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 2: Reproduzir o defeito e consertar o orçamento

**Files:**
- Create: `tests/unit/portico-quality.test.ts`
- Modify: `components/three/portico-quality.ts`

**Interfaces:**
- Consumes: `judge`, `createMeter`, `TIERS`, `WARMUP` da Tarefa 1.
- Produces: `judge(meter, delta, vsync, step, steps)` — **assinatura muda**, `vsync` passa a ser parâmetro. `plausibleVsync(deltas: readonly number[]): number`, `VSYNC_CEILING`, `VSYNC_DEFAULT`.

- [ ] **Step 1: Escrever o teste que reproduz o defeito**

Criar `tests/unit/portico-quality.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { TIERS, WARMUP, createMeter, judge } from '@/components/three/portico-quality'

/**
 * A cena 3D da home roda a poucos quadros em máquina fraca e a escada de
 * qualidade adaptativa não rebaixa. Este arquivo existe para provar por quê,
 * antes de consertar.
 *
 * O orçamento de quadro sai do quadro MAIS RÁPIDO do aquecimento, para
 * descobrir o período do vsync do monitor. A intenção é certa — comparar
 * contra 16,7 ms fixos rebaixaria uma cena perfeita num painel de 30 Hz.
 *
 * O defeito é que durante o aquecimento A CENA JÁ ESTÁ RENDERIZANDO. Em
 * máquina com folga o quadro mais rápido é limitado pelo vsync e a medição
 * acerta. Em máquina sem folga ele é limitado pelo custo da própria cena, e o
 * orçamento vira 2,2 × aquilo que ela já custa — que ela nunca estoura.
 */

/** Roda `segundos` de quadros a uma taxa fixa e devolve o último veredito. */
function rodar(
  meter: ReturnType<typeof createMeter>,
  fps: number,
  segundos: number,
  vsync: number,
  step = 1,
): string {
  const delta = 1 / fps
  let ultimo = 'hold'
  for (let t = 0; t < segundos; t += delta) {
    const verdict = judge(meter, delta, vsync, step, TIERS.length)
    if (verdict !== 'hold') ultimo = verdict
  }
  return ultimo
}

describe('escada de qualidade da cena', () => {
  /**
   * O CASO QUE ESTAVA QUEBRADO. Um monitor de 60 Hz e uma máquina entregando
   * 15 quadros por segundo: 66 ms por quadro contra um vsync de 16,7 ms. É
   * quatro vezes o período do monitor — exatamente o que a escada existe para
   * socorrer.
   */
  it('rebaixa a cena a 15 fps num monitor de 60 Hz', () => {
    const veredito = rodar(createMeter(), 15, WARMUP + 6, 1 / 60)
    expect(veredito, 'a escada não rebaixou uma cena rodando a 15 fps').toBe('down')
  })

  /**
   * O PIOR CASO DO DEFEITO ANTIGO, e o que o clamp de `1/30` fecha. Uma
   * máquina a 12 fps: com o teto antigo de `1/20`, o vsync aprendido virava
   * 50 ms e o limiar de rebaixamento ia para 110 ms — a cena só degradaria
   * abaixo de 9 quadros por segundo.
   */
  it('rebaixa mesmo quando a medição do monitor sai suja', () => {
    const veredito = rodar(createMeter(), 12, WARMUP + 6, 1 / 30)
    expect(veredito, 'com vsync no teto do clamp a escada ainda precisa rebaixar').toBe('down')
  })

  /** E a proteção não pode disparar em quem está bem: 58 fps num painel de 60 Hz. */
  it('não rebaixa uma cena que está sustentando o monitor', () => {
    const veredito = rodar(createMeter(), 58, WARMUP + 6, 1 / 60)
    expect(veredito, 'rebaixou uma cena saudável').not.toBe('down')
  })

  /** Num painel de 30 Hz, 29 fps é o teto do que o navegador pode entregar. */
  it('não rebaixa num painel de 30 Hz que está no teto', () => {
    const veredito = rodar(createMeter(), 29, WARMUP + 6, 1 / 30)
    expect(veredito, 'painel de 30 Hz não é máquina lenta').not.toBe('down')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd /g/documentos/portfolio && npx vitest run tests/unit/portico-quality.test.ts
```

Esperado: **falha na compilação**, porque `judge` ainda tem quatro parâmetros e o teste passa cinco.

Ajustar a chamada do teste temporariamente para quatro argumentos (`judge(meter, delta, step, TIERS.length)`) e rodar de novo, só para confirmar o defeito no comportamento atual. Esperado agora: **os dois primeiros testes falham** com `'hold'` em vez de `'down'` — que é o defeito reproduzido. Se eles passarem, o diagnóstico do spec está errado: **parar e reportar ao dono** antes de mudar qualquer coisa. Depois de confirmar, desfazer o ajuste temporário e voltar para cinco argumentos.

- [ ] **Step 3: Consertar o orçamento**

Em `components/three/portico-quality.ts`:

```ts
/** Quadro mais curto que isto é rAF coalescido, não taxa de monitor. */
export const VSYNC_FLOOR = 1 / 240
/** Quadro mais longo que isto não é taxa de monitor: nenhum painel é mais lento que 30 Hz. */
export const VSYNC_CEILING = 1 / 30
/** Quando a medição não devolve nada plausível. Nunca `Infinity`: valor ausente
 *  precisa aterrissar num número defensável, não desligar a proteção. */
export const VSYNC_DEFAULT = 1 / 60

/**
 * O período do monitor, a partir de deltas medidos com a página parada.
 *
 * Descarta o implausível dos dois lados — abaixo de `VSYNC_FLOOR` é rAF
 * coalescido, acima de 1/20 é aba que voltou do segundo plano — e trava o
 * resultado em `VSYNC_CEILING`. Esse teto é a rede de segurança que faltava:
 * mesmo com a amostra suja, o pior orçamento possível passa a ser 73 ms em vez
 * dos 110 ms que deixavam a cena degradar só abaixo de 9 fps.
 */
export function plausibleVsync(deltas: readonly number[]): number {
  let melhor = Infinity
  for (const delta of deltas) {
    if (delta > VSYNC_FLOOR && delta < 1 / 20 && delta < melhor) melhor = delta
  }
  return Number.isFinite(melhor) ? Math.min(melhor, VSYNC_CEILING) : VSYNC_DEFAULT
}
```

Remover `vsync` de `Meter` e de `createMeter` — ele não é mais aprendido lá dentro. Trocar a assinatura e o miolo de `judge`:

```ts
/**
 * Consome um quadro e diz o que fazer com o degrau atual.
 *
 * `vsync` CHEGA DE FORA, e é a correção que este módulo existe para carregar.
 * Antes ele era aprendido durante o aquecimento, como o quadro mais rápido
 * entregue — só que durante o aquecimento a cena já está renderizando. Em
 * máquina com folga o piso é o vsync e a medição acerta; em máquina sem folga
 * o piso é o custo da própria cena, e o orçamento vira 2,2 × aquilo que ela já
 * custa. A proteção se desligava exatamente nas máquinas para as quais existe.
 *
 * Quem mede agora é `plausibleVsync`, com a página parada, antes da cena subir.
 *
 * DESCE E SOBE. A assimetria dos limiares é de propósito: subir dobra o custo
 * de fragmento, então só vale com folga de verdade. Com os dois iguais a cena
 * ficaria pingando entre dois degraus, e trocar de resolução a cada dois
 * segundos incomoda mais que a resolução menor. `SETTLE` impede a oscilação
 * rápida; a margem impede a lenta.
 */
export function judge(
  meter: Meter,
  delta: number,
  vsync: number,
  step: number,
  steps: number,
): Verdict {
  meter.age += delta
  if (meter.age < WARMUP) return 'hold'
  if (meter.age - meter.since < SETTLE) return 'hold'

  meter.gaps[meter.at++] = delta
  meter.span += delta
  if (meter.at < WINDOW.min || (meter.span < WINDOW.span && meter.at < WINDOW.cap)) return 'hold'

  const sorted = [...meter.gaps.subarray(0, meter.at)].sort((a, b) => a - b)
  const median = sorted[meter.at >> 1] ?? 0
  meter.at = 0
  meter.span = 0

  const slow = Math.max(vsync * 2.2, 1 / 45)
  if (median > slow && step < steps - 1) {
    meter.since = meter.age
    return 'down'
  }
  if (median < vsync * 1.25 && step > 0) {
    meter.since = meter.age
    return 'up'
  }
  return 'hold'
}
```

**Apagar o comentário obsoleto.** O bloco que afirma "**Só desce.** Subir de volta exigiria histerese" contradiz o código, que sobe desde um commit posterior. A explicação correta da subida já está na docstring acima.

- [ ] **Step 4: Rodar e ver passar**

```bash
cd /g/documentos/portfolio && npx vitest run tests/unit/portico-quality.test.ts
```

Esperado: quatro testes passando.

- [ ] **Step 5: Commit**

```bash
git add tests/unit/portico-quality.test.ts components/three/portico-quality.ts
git commit -F - <<'EOF'
fix(portico): o orcamento de quadro parava de proteger quem precisava

A escada de qualidade nao rebaixava a cena em maquina fraca, e a causa e que o
orcamento se calibrava pela propria lentidao.

O vsync era aprendido como o quadro MAIS RAPIDO do aquecimento -- so que durante
o aquecimento a cena ja renderiza. Com folga, o piso e o vsync e a medicao
acerta; sem folga, o piso e o custo da cena, e o limiar vira 2,2x aquilo que ela
ja custa. Abaixo de 20 fps o clamp prendia o vsync em 1/20 e o limiar ia para
110 ms: a cena so degradava abaixo de 9 quadros por segundo. A 15 fps a escada
concluia que estava tudo bem e ficava parada no degrau inicial para sempre.

REPRODUZIDO ANTES DE CONSERTAR: os dois primeiros testes falharam com 'hold'
onde precisavam de 'down'. O diagnostico era leitura de codigo e agora e medida.

O vsync passa a chegar de fora, e o teto do clamp cai de 1/20 para 1/30 -- nao
existe monitor mais lento que 30 Hz, entao nenhuma medicao honesta produz valor
maior. Com ele o pior orcamento possivel vai de 110 ms para 73 ms.

Tambem apaga o comentario que ainda dizia "so desce": o codigo sobe desde um
commit posterior, e os dois textos coexistiam se contradizendo.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 3: Medir o monitor antes da cena existir

**Files:**
- Modify: `components/three/portico-quality.ts` (adicionar `measureVsync`)
- Modify: `components/three/PorticoSlot.tsx`
- Modify: `components/three/Portico.tsx`
- Modify: `tests/unit/portico-quality.test.ts`

**Interfaces:**
- Consumes: `plausibleVsync`, `VSYNC_DEFAULT` da Tarefa 2.
- Produces: `measureVsync(amostras?: number): Promise<number>`; `Portico` passa a aceitar `vsync: number`.

- [ ] **Step 1: Teste da coleta de amostras**

Acrescentar a `tests/unit/portico-quality.test.ts`:

```ts
import { VSYNC_CEILING, VSYNC_DEFAULT, plausibleVsync } from '@/components/three/portico-quality'

describe('medição do período do monitor', () => {
  it('devolve o menor delta plausível da amostra', () => {
    expect(plausibleVsync([0.02, 1 / 60, 0.03])).toBeCloseTo(1 / 60, 5)
  })

  /** rAF coalescido devolve delta absurdamente curto; ele não é taxa de monitor. */
  it('descarta quadro curto demais para ser vsync', () => {
    expect(plausibleVsync([0.001, 1 / 60])).toBeCloseTo(1 / 60, 5)
  })

  /** Aba que voltou do segundo plano entrega um salto; também não é vsync. */
  it('descarta quadro longo demais para ser vsync', () => {
    expect(plausibleVsync([2.5, 1 / 60])).toBeCloseTo(1 / 60, 5)
  })

  /**
   * O TETO É A REDE DE SEGURANÇA. Mesmo que toda a amostra saia suja, o
   * orçamento não pode degenerar de novo para os 9 fps de antes.
   */
  it('trava no teto de 30 Hz mesmo com amostra inteira ruim', () => {
    expect(plausibleVsync([0.048, 0.049, 0.047])).toBeCloseTo(VSYNC_CEILING, 5)
  })

  /** Sem nada plausível, um número defensável — nunca `Infinity`, que era o
   *  valor que desligava a proteção. */
  it('cai num padrão de 60 Hz quando nada é plausível', () => {
    expect(plausibleVsync([])).toBeCloseTo(VSYNC_DEFAULT, 5)
    expect(plausibleVsync([0.0001, 5])).toBeCloseTo(VSYNC_DEFAULT, 5)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd /g/documentos/portfolio && npx vitest run tests/unit/portico-quality.test.ts
```

Esperado: cinco testes novos falhando — `plausibleVsync` existe desde a Tarefa 2, então se algum falhar por comportamento (e não por importação), corrigir a função antes de seguir.

- [ ] **Step 3: A coleta por rAF**

Acrescentar a `components/three/portico-quality.ts`:

```ts
/**
 * O período do monitor, medido com a página PARADA.
 *
 * É a metade que faltava: `plausibleVsync` sabe limpar a amostra, mas a
 * amostra precisa vir de um momento em que a cena ainda não existe. `PorticoSlot`
 * já espera `load` e depois ociosidade antes de montar — essa janela é o único
 * lugar da vida da página em que a taxa medida é a do monitor e não a do
 * trabalho que está rolando.
 *
 * Doze quadros a 60 Hz são ~200 ms de callbacks fazendo uma subtração. O custo
 * é irrelevante e a medição, ao contrário da anterior, é honesta.
 */
export function measureVsync(amostras = 12): Promise<number> {
  if (typeof requestAnimationFrame !== 'function') return Promise.resolve(VSYNC_DEFAULT)
  return new Promise((resolve) => {
    const deltas: number[] = []
    let anterior = 0
    const passo = (agora: number): void => {
      if (anterior !== 0) deltas.push((agora - anterior) / 1000)
      anterior = agora
      if (deltas.length >= amostras) resolve(plausibleVsync(deltas))
      else requestAnimationFrame(passo)
    }
    requestAnimationFrame(passo)
  })
}
```

- [ ] **Step 4: Encurtar o aquecimento**

Em `components/three/portico-quality.ts`, com o vsync não mais aprendido lá dentro, `WARMUP` só precisa cobrir compilação de shader e envio de textura:

```ts
/**
 * Segundos ignorados no começo: compilação de shader e envio de textura.
 *
 * Eram 3, e a maior parte disso existia para aprender o período do monitor.
 * Com o vsync chegando pronto de `measureVsync`, sobra só o custo de partida
 * do renderer — e três segundos a custo cheio numa máquina fraca são
 * exatamente os segundos em que o visitante está chegando e rolando.
 */
export const WARMUP = 1.2
```

**O número é para conferir, não para acreditar.** No Step 7 há uma medição que confirma onde a compilação realmente termina; se for depois de 1,2 s, o valor passa a ser o medido e este comentário é atualizado.

- [ ] **Step 5: Ligar as pontas**

Em `components/three/PorticoSlot.tsx`, medir dentro do agendamento e guardar antes de montar:

```tsx
import { VSYNC_DEFAULT, measureVsync } from './portico-quality'

// dentro do componente, junto de `showScene`:
const [vsync, setVsync] = useState(VSYNC_DEFAULT)
```

Trocar o corpo de `agendar` para medir antes de montar:

```tsx
const agendar = () => {
  // A MEDIÇÃO VEM ANTES DA MONTAGEM, e é a única janela em que ela é honesta:
  // a página já terminou de carregar e a cena ainda não existe, então o que o
  // rAF entrega é a taxa do monitor e não o custo do que está rodando.
  const montar = () => {
    void measureVsync().then((medido) => {
      setVsync(medido)
      setShowScene(true)
    })
  }
  if (typeof window.requestIdleCallback === 'function') {
    idle = window.requestIdleCallback(montar, { timeout: 2000 })
  } else {
    timer = window.setTimeout(montar, 600)
  }
}
```

E repassar:

```tsx
{showScene ? <Portico systems={systems} vsync={vsync} /> : <PorticoFallback systems={systems} />}
```

Em `components/three/Portico.tsx`, o valor desce até o hook:

```tsx
export function Portico({ systems, vsync }: { systems: readonly SceneSystem[]; vsync: number }) {
```

Passar `vsync` para `<Yard systems={systems} vsync={vsync} />`, e de `Yard` para `useQuality(vsync)`. O hook fica:

```tsx
function useQuality(vsync: number): { tier: Tier; watch: (delta: number) => void } {
  const setDpr = useThree((state) => state.setDpr)
  const [step, setStep] = useState(startingStep)
  const meter = useRef(createMeter())

  const tier = TIERS[Math.min(step, TIERS.length - 1)] ?? TIERS[0]

  useEffect(() => {
    setDpr(tier.dpr)
  }, [tier, setDpr])

  const watch = (delta: number): void => {
    const verdict = judge(meter.current, delta, vsync, step, TIERS.length)
    if (verdict === 'down') setStep((current) => current + 1)
    else if (verdict === 'up') setStep((current) => current - 1)
  }

  return { tier, watch }
}
```

- [ ] **Step 6: Suíte verde**

```bash
cd /g/documentos/portfolio && npm run typecheck && npm run lint && npm test
```

Esperado: tudo passa.

- [ ] **Step 7: Medir de verdade — este é o portão da fase**

```bash
cd /g/documentos/portfolio && npm run build && npx serve out
```

No Chrome, com a home aberta em `/pt/`:

1. DevTools → Performance → CPU: **4× slowdown**. Gravar 15 s rolando a página.
2. Anotar a taxa de quadros média e se a escada rebaixou (o `dpr` do canvas muda, visível em `Rendering → Frame Rendering Stats`).
3. Repetir sem estrangulamento.
4. Anotar onde a compilação de shader termina, para confirmar `WARMUP = 1.2`.

**Registrar os números na mensagem de commit.** Se a cena não recuperar taxa decente nem no degrau mais baixo, **parar e reportar ao dono**: o spec §9 prevê que isso vira decisão de escopo da cena, não de afinação, e é decisão dele.

- [ ] **Step 8: Commit**

```bash
git add components/three/portico-quality.ts components/three/PorticoSlot.tsx components/three/Portico.tsx tests/unit/portico-quality.test.ts
git commit -F - <<'EOF'
feat(portico): o monitor e medido antes de a cena existir

Segunda metade do conserto. O commit anterior tirou o vsync de dentro do
medidor; este diz de onde ele passa a vir.

PorticoSlot ja esperava `load` e depois ociosidade antes de montar a cena --
essa janela e o unico momento da vida da pagina em que a taxa medida e a do
monitor, e nao a do trabalho que esta rolando. Doze quadros de rAF fazendo uma
subtracao, ~200 ms, e o valor desce pronto ate o hook.

WARMUP cai de 3 s para 1,2 s: a maior parte dele existia para aprender o
periodo do monitor, e agora so precisa cobrir compilacao de shader e envio de
textura. Tres segundos a custo cheio numa maquina fraca sao exatamente os
segundos em que o visitante esta chegando e rolando.

MEDIDO, nao estimado (Chrome, CPU 4x estrangulada, /pt/):
- antes: <PREENCHER fps, escada nao rebaixava>
- depois: <PREENCHER fps, escada rebaixou para o degrau N em M segundos>
- sem estrangulamento: <PREENCHER>
- compilacao de shader termina em <PREENCHER> s, o que confirma WARMUP=1,2

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

> Os `<PREENCHER>` são para substituir pelos números reais medidos no Step 7. **Commit com eles ainda no texto é falha da tarefa.**

---

### Task 4: Escalonamento por faixa no CSS

Prepara o terreno da Tarefa 5. Ela é separada porque o escalonamento é a única parte da troca que pode falhar em silêncio, e merece portão próprio.

**Files:**
- Modify: `app/globals.css:151-160`
- Modify: `tests/unit/landing-movimento.test.ts`

**Interfaces:**
- Consumes: as classes `.revelar` / `.revelar-titulo` existentes.
- Produces: `--i` como índice de escalonamento em `.revelar`.

- [ ] **Step 1: Teste de que o escalonamento existe na fonte**

Acrescentar a `tests/unit/landing-movimento.test.ts`, dentro do `describe` existente:

```ts
/**
 * ESCALONAMENTO EM SCROLL TIMELINE NÃO É `animation-delay`.
 *
 * Numa timeline de rolagem a duração e o ATRASO são ignorados — quem define o
 * progresso é a posição da barra. É o mesmo mecanismo que obriga o bloco de
 * movimento reduzido a devolver `animation-timeline: auto`.
 *
 * Escrito com `animation-delay`, o escalonamento é aceito pelo navegador, não
 * faz nada, e ninguém percebe até comparar as duas versões lado a lado. O que
 * escalona de verdade é deslocar a FAIXA de cada item.
 */
it('o escalonamento desloca a faixa, não o relógio', () => {
  const dentro = corposDe(SUPORTE).join('')
  expect(dentro, 'a faixa da revelação parou de escalonar por --i').toMatch(
    /animation-range:[^;]*var\(--i/,
  )

  for (const regra of css.match(/\.revelar[\w-]*[^{]*\{[^}]*\}/g) ?? []) {
    expect(
      regra,
      `\`animation-delay\` numa animação de rolagem é ignorado — este ` +
        `escalonamento não existe na tela:\n${regra}`,
    ).not.toMatch(/animation-delay/)
  }
})
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd /g/documentos/portfolio && npx vitest run tests/unit/landing-movimento.test.ts
```

Esperado: falha em `animation-range` sem `var(--i)`.

- [ ] **Step 3: Escalonar a faixa**

Em `app/globals.css`, substituir o bloco `@supports` da revelação:

```css
@supports (animation-timeline: view()) {
  .revelar,
  .revelar-titulo {
    animation: revelar linear both;
    animation-timeline: view();
    /* A FAIXA ESCALONA, NÃO O RELÓGIO. Numa scroll timeline `animation-delay` é
       ignorado — quem define o progresso é a barra de rolagem — então o
       escalonamento de uma lista precisa vir de onde cada item COMEÇA a
       revelar, não de quando o relógio dele dispara. Seis por cento por item
       dá o mesmo ritmo que os ~80 ms que a versão em JavaScript usava, e o
       fallback `0` mantém quem não passa `--i` na primeira posição. */
    animation-range: entry calc(10% + var(--i, 0) * 6%) entry calc(70% + var(--i, 0) * 6%);
  }

  .revelar-titulo { animation-name: revelar-titulo; }
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
cd /g/documentos/portfolio && npx vitest run tests/unit/landing-movimento.test.ts
```

Esperado: todos passam.

- [ ] **Step 5: Confirmar que a landing não regrediu**

```bash
cd /g/documentos/portfolio && npm run build && npx playwright test tests/e2e/landing.spec.ts
```

Esperado: passa nos três motores. A landing não passa `--i`, então cai no fallback `0` e revela exatamente como antes.

- [ ] **Step 6: Commit**

```bash
git add app/globals.css tests/unit/landing-movimento.test.ts
git commit -F - <<'EOF'
feat(css): a revelacao escalona pela faixa, nao pelo relogio

Preparo para a home trocar o motion/react por CSS.

Numa scroll timeline `animation-delay` e IGNORADO -- quem define o progresso e a
posicao da barra de rolagem. Escrito com atraso, o escalonamento de uma lista e
aceito pelo navegador, nao faz nada, e ninguem percebe ate comparar as duas
versoes lado a lado. E a mesma armadilha que obriga o bloco de movimento
reduzido a devolver `animation-timeline: auto`.

O que escalona e onde cada item COMECA a revelar. Seis por cento por item da o
mesmo ritmo dos ~80 ms da versao em JavaScript.

O fallback `var(--i, 0)` mantem a landing intacta: ela nao passa indice nenhum e
continua revelando como antes -- confirmado na bancada nos tres motores.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 5: `Reveal` sai da thread principal

**Files:**
- Modify: `components/ui/Reveal.tsx`
- Modify: `components/sections/About.tsx:27,31`, `Systems.tsx:16,25`, `Stack.tsx:87,102`, `Contact.tsx:59,71,78,117,127`
- Modify: `package.json`
- Create: `tests/unit/reveal.test.tsx`

**Interfaces:**
- Consumes: `.revelar` com `--i` da Tarefa 4.
- Produces: `Reveal({ children, ordem?: number, className?: string })` — Server Component. `delayMs` deixa de existir.

- [ ] **Step 1: Escrever o teste**

Criar `tests/unit/reveal.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Reveal } from '@/components/ui/Reveal'

/**
 * `Reveal` embrulha About, Systems, Stack e Contact — a home inteira abaixo do
 * hero. Ele animava com `motion/react`, na thread principal, exatamente durante
 * a rolagem em que a cena 3D está desenhando.
 */
describe('Reveal', () => {
  it('marca o embrulho com a classe de revelação', () => {
    render(<Reveal>conteúdo</Reveal>)
    expect(screen.getByText('conteúdo').parentElement).toHaveClass('revelar')
  })

  /** O escalonamento vira `--i`, que o CSS usa para deslocar a faixa. */
  it('passa a ordem para o CSS como --i', () => {
    render(<Reveal ordem={3}>terceiro</Reveal>)
    expect(screen.getByText('terceiro').parentElement).toHaveStyle({ '--i': '3' })
  })

  /**
   * O EMBRULHO EXISTE SEMPRE, e isto conserta um defeito que já estava no ar.
   *
   * A versão com `motion` devolvia `<>{children}</>` quando o visitante pedia
   * menos movimento — sumindo com a `div` e, junto com ela, o `className="grid"`
   * de que Stack e Systems dependem para os cards manterem altura uniforme na
   * fileira. Quem pedia menos movimento recebia uma grade desalinhada.
   *
   * Em CSS o embrulho é sempre o mesmo elemento; só a animação muda de estado,
   * e quem desliga o movimento é o `@media` global.
   */
  it('mantém o embrulho e o className, sem depender de preferência de movimento', () => {
    render(
      <Reveal ordem={1} className="grid">
        card
      </Reveal>,
    )
    const embrulho = screen.getByText('card').parentElement
    expect(embrulho).toHaveClass('grid')
    expect(embrulho).toHaveClass('revelar')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd /g/documentos/portfolio && npx vitest run tests/unit/reveal.test.tsx
```

Esperado: falha — `Reveal` ainda renderiza `motion.div` sem a classe `revelar`, e não aceita `ordem`.

- [ ] **Step 3: Reescrever `Reveal`**

Substituir `components/ui/Reveal.tsx` inteiro:

```tsx
/**
 * Revelação na entrada, no compositor.
 *
 * Era `motion/react` com `whileInView`: animação em JavaScript, na thread
 * principal, exatamente durante a rolagem em que a cena 3D do hero está
 * desenhando. A landing já tinha provado o caminho — `animation-timeline:
 * view()` faz o mesmo efeito sem JavaScript nenhum — e aqui a troca não é só de
 * técnica: é liberar a thread que a cena disputa.
 *
 * Com o `motion` fora, some também o `'use client'`: este é um Server Component
 * e quatro fronteiras de cliente desaparecem da home. Quem cobre
 * `prefers-reduced-motion` é o bloco global de `globals.css`, com o
 * `animation-timeline: auto !important` que scroll timeline exige.
 *
 * `ordem` é o índice do item na lista, e vira `--i` para o CSS deslocar a faixa
 * de revelação. NÃO é atraso em milissegundos: numa timeline de rolagem o
 * atraso é ignorado, e o escalonamento sumiria em silêncio.
 */
export function Reveal({
  children,
  ordem = 0,
  className,
}: {
  children: React.ReactNode
  ordem?: number
  /** Repassado ao embrulho. Necessário sempre que o filho direto é um item de
   * grid que conta com `stretch` para virar um card de altura uniforme na
   * fileira (SystemCard, LayerCard): `className="grid"` faz este embrulho — já
   * esticado pela grade externa — esticar por sua vez o único filho. */
  className?: string
}) {
  return (
    <div
      className={className ? `revelar ${className}` : 'revelar'}
      style={{ '--i': ordem } as React.CSSProperties}
    >
      {children}
    </div>
  )
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
cd /g/documentos/portfolio && npx vitest run tests/unit/reveal.test.tsx
```

Esperado: três testes passando.

- [ ] **Step 5: Atualizar as chamadas**

`delayMs` em milissegundos vira `ordem` em índice. As conversões, uma a uma:

| Arquivo:linha | Antes | Depois |
|---|---|---|
| `About.tsx:27` | `<Reveal>` | `<Reveal>` |
| `About.tsx:31` | `<Reveal delayMs={150}>` | `<Reveal ordem={1}>` |
| `Systems.tsx:16` | `<Reveal>` | `<Reveal>` |
| `Systems.tsx:25` | `<Reveal key={system.slug} delayMs={i * 100} className="grid">` | `<Reveal key={system.slug} ordem={i} className="grid">` |
| `Stack.tsx:87` | `<Reveal>` | `<Reveal>` |
| `Stack.tsx:102` | `<Reveal key={layer.label} delayMs={100 + i * 80} className="grid">` | `<Reveal key={layer.label} ordem={i + 1} className="grid">` |
| `Contact.tsx:59` | `<Reveal>` | `<Reveal>` |
| `Contact.tsx:71` | `<Reveal delayMs={100}>` | `<Reveal ordem={1}>` |
| `Contact.tsx:78` | `<Reveal delayMs={accessKey ? 200 : 100}>` | `<Reveal ordem={accessKey ? 2 : 1}>` |
| `Contact.tsx:117` | `<Reveal delayMs={accessKey ? 300 : 200}>` | `<Reveal ordem={accessKey ? 3 : 2}>` |
| `Contact.tsx:127` | `<Reveal delayMs={accessKey ? 400 : 300}>` | `<Reveal ordem={accessKey ? 4 : 3}>` |

- [ ] **Step 6: Tirar o `motion` do projeto**

```bash
cd /g/documentos/portfolio && grep -rn "from 'motion" --include=*.tsx --include=*.ts components app lib
```

Esperado: **nenhum resultado.** `Reveal.tsx` era o único importador. Se aparecer algo, tratar antes de remover o pacote.

```bash
cd /g/documentos/portfolio && npm uninstall motion
```

`lib/motion.ts` e `usePrefersReducedMotion` **ficam** — `Boot.tsx` e `Counter.tsx` também usam, e são animações por tempo, onde a preferência precisa mesmo ser lida em JavaScript.

- [ ] **Step 7: Medir o bundle e a suíte**

```bash
cd /g/documentos/portfolio && npm run typecheck && npm run lint && npm test && npm run build
```

Esperado: tudo passa. Anotar o tamanho do First Load JS da rota `/[locale]` que o `next build` imprime, antes e depois, para a mensagem de commit.

- [ ] **Step 8: Bancada nos três motores**

```bash
cd /g/documentos/portfolio && npx playwright test
```

Esperado: passa. Confirmar visualmente em `/pt/` que os cards de Systems e Stack entram escalonados, e que com `prefers-reduced-motion` ligado eles aparecem prontos **e alinhados** — que é o defeito latente descrito no Step 1.

- [ ] **Step 9: Commit**

```bash
git add components/ui/Reveal.tsx components/sections/About.tsx components/sections/Systems.tsx components/sections/Stack.tsx components/sections/Contact.tsx tests/unit/reveal.test.tsx package.json package-lock.json
git commit -F - <<'EOF'
perf(home): a revelacao sai da thread principal e o motion sai do projeto

Reveal embrulha About, Systems, Stack e Contact -- a home inteira abaixo do
hero -- e animava com motion/react, em JavaScript, na thread principal, durante
exatamente a rolagem em que a cena 3D do hero esta desenhando.

A landing ja tinha provado o caminho: animation-timeline: view() faz o mesmo
efeito no compositor, sem biblioteca. Aqui a troca nao e so de tecnica -- e
liberar a thread que a cena disputa.

O pacote `motion` sai inteiro; Reveal.tsx era o unico importador. lib/motion.ts
fica, porque Boot e Counter animam por TEMPO e ali a preferencia precisa mesmo
ser lida em JavaScript.

Reveal deixa de ser Client Component: quatro fronteiras de cliente desaparecem
da home.

CONSERTA UM DEFEITO LATENTE, de brinde. A versao com motion devolvia
<>{children}</> quando o visitante pedia menos movimento -- sumindo com a div e,
junto, com o className="grid" de que Stack e Systems dependem para os cards
manterem altura uniforme. Quem pedia menos movimento recebia uma grade
desalinhada. Em CSS o embrulho existe sempre.

delayMs vira `ordem`, e a mudanca de nome e o ponto: em scroll timeline o atraso
e ignorado, entao uma propriedade chamada "delay" prometeria o que nao entrega.

First Load JS da home: <PREENCHER antes> -> <PREENCHER depois>

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 6: Portão de medição

Nenhum código. É o portão que o spec §9 exige entre desempenho e pixel novo.

- [ ] **Step 1: Medir a home inteira, depois das quatro tarefas**

```bash
cd /g/documentos/portfolio && npm run build && npx serve out
```

Com CPU estrangulada em 4× no Chrome, em `/pt/`:

1. Taxa de quadros da cena, parada e rolando.
2. Se a escada rebaixou, e para qual degrau.
3. Tempo de tarefa longa mais alto durante a rolagem.
4. Lighthouse mobile, pontuação e LCP.

- [ ] **Step 2: Decidir com o dono**

Reportar os números. **Se a cena não sustentar taxa decente nem no degrau mais baixo**, parar aqui: o spec §9 diz que isso deixa de ser afinação e vira decisão de escopo da cena — menos geometria fina, menos luz prática, ou o fallback em SVG promovido a padrão em mais aparelhos. **É decisão do dono, e não faz parte deste plano.**

Se os números forem bons, seguir para a Tarefa 7.

---

### Task 7: Luz

**Files:**
- Modify: `app/globals.css`
- Modify: `components/sections/Hero.tsx:77-85`
- Modify: `components/sections/Contact.tsx`
- Modify: `components/sections/SystemCard.tsx:28`
- Create: `tests/unit/home-movimento.test.ts`
- Modify: `tests/unit/landing-movimento.test.ts`

**Interfaces:**
- Consumes: tokens `--color-data`, `--color-border`, `--color-faint` de `@theme`.
- Produces: classes `.facho`, `.aurora`, `.brilho-borda`.

- [ ] **Step 1: Teste do orçamento por página**

O teste atual conta animações infinitas no arquivo inteiro e exige exatamente uma. Com a aurora passam a ser duas — uma por página, que é a regra real. Substituir o teste `'só uma coisa na página se move para sempre'` em `tests/unit/landing-movimento.test.ts`:

```ts
/**
 * O ORÇAMENTO DE MOVIMENTO INFINITO É UM ELEMENTO POR PÁGINA. Num só, ele diz
 * para onde olhar; espalhado por vários vira ruído — e um catálogo de efeitos é
 * o oposto de uma página cara. Também é bateria: animação perpétua nunca deixa
 * a GPU ociosa.
 *
 * São duas no arquivo porque são duas páginas, e as duas apontam para a mesma
 * coisa: a chamada final. `.borda-viva` na landing, `.aurora` na home. Uma
 * terceira reprova, e é isso que este teste existe para impedir.
 */
it('cada página tem no máximo uma coisa que se move para sempre', () => {
  const ocorrencias = css.match(/[^}]*animation:[^;]*infinite/g) ?? []
  expect(
    ocorrencias.length,
    `${ocorrencias.length} animações infinitas: ${ocorrencias.join(' | ')}`,
  ).toBe(2)

  const donas = ocorrencias.join(' ')
  expect(donas, 'a borda viva da landing sumiu ou trocou de dono').toMatch(/borda-viva/)
  expect(donas, 'a aurora da home sumiu ou trocou de dono').toMatch(/aurora/)
})
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd /g/documentos/portfolio && npx vitest run tests/unit/landing-movimento.test.ts
```

Esperado: falha com 1 animação infinita, faltando a aurora.

- [ ] **Step 3: O CSS da luz**

Acrescentar ao fim de `app/globals.css`, **antes** do bloco `@media (prefers-reduced-motion: reduce)** (ele precisa continuar sendo o último, para o `!important` dele alcançar tudo):

```css
/* ══════════════════════════════════════════════════════════════════════════
   CAMADA PREMIUM DA HOME ESCURA

   As mesmas seis referências da landing, agora sobre a superfície para a qual
   elas foram feitas. Aquele commit descartou metade do catálogo — Aurora,
   Beams, Light Rays, Neon Gradient — porque sobre papel #F5F3EF um brilho é
   invisível e um "shine" não tem contra o que brilhar. Verdade lá. A home é
   #08090C: aqui é onde esses efeitos nasceram para funcionar.

   O ORÇAMENTO É UMA ANIMAÇÃO INFINITA, e ela é a aurora. Tudo o mais desta
   camada é pintado uma vez e não se mexe.
   ══════════════════════════════════════════════════════════════════════════ */

/* FACHO ATRÁS DA CENA. Dá de onde vem a luz que o aço da cena 3D reflete: sem
   ele o pórtico é iluminado por um estúdio que a página não mostra. Estático —
   um gradiente pintado uma vez, custo zero depois disso. */
.facho {
  background-image: radial-gradient(
    ellipse 80% 55% at 70% 15%,
    color-mix(in srgb, var(--color-data) 12%, transparent),
    transparent 70%
  );
}

/* AURORA ATRÁS DA CHAMADA FINAL — a única coisa da home que se move para
   sempre, e ela está onde o olho deve ir. É a mesma gramática da landing, onde
   a `.borda-viva` também mora no CTA final.

   MOVIDA SÓ POR `transform`, E ISSO É A DIFERENÇA ENTRE BARATO E CARO. Uma
   camada desfocada é rasterizada UMA VEZ e depois só transportada pelo
   compositor. Animar `background-position` ou o ângulo de um cônico repintaria
   a área inteira a cada quadro — e desfoque grande repintado por quadro é
   exatamente o custo que esta página não pode pagar (a landing já tinha
   restringido `filter: blur()` aos títulos pelo mesmo motivo). */
@keyframes derivar {
  from { transform: translate3d(-8%, 0, 0) scale(1.15); }
  to   { transform: translate3d(8%, 0, 0) scale(1.15); }
}

.aurora {
  position: absolute;
  inset: -30% -10% auto;
  height: 60%;
  z-index: -1;
  pointer-events: none;
  filter: blur(70px);
  opacity: 0.5;
  background-image:
    radial-gradient(ellipse 40% 60% at 30% 50%, color-mix(in srgb, var(--color-data) 40%, transparent), transparent 70%),
    radial-gradient(ellipse 35% 50% at 70% 40%, color-mix(in srgb, var(--color-ok) 22%, transparent), transparent 70%);
  animation: derivar 24s ease-in-out infinite alternate;
}

/* BRILHO DE BORDA NOS CARDS. A gramática do bklit: 1px de borda, nunca sombra.
   O gradiente vive num pseudo-elemento recortado por máscara — a mesma técnica
   da `.borda-viva`, sem a rotação — e só a opacidade transita no hover, que é
   propriedade de compositor. */
.brilho-borda { position: relative; }

.brilho-borda::before {
  content: '';
  position: absolute;
  inset: 0;
  padding: 1px;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--color-data) 55%, transparent),
    transparent 45%
  );
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0;
  transition: opacity 300ms ease-out;
  pointer-events: none;
}

.brilho-borda:hover::before { opacity: 1; }
```

- [ ] **Step 4: Pendurar nos componentes**

Em `components/sections/Hero.tsx:80`, acrescentar `facho` à lista de classes do `<div data-portico-slot>`:

```tsx
className="facho relative -mx-6 aspect-[300/230] border-y border-border bg-bg px-5 py-6
  md:pointer-events-none md:absolute md:inset-y-0 md:left-1/2 md:right-0 md:-z-10 md:m-0 md:aspect-auto md:w-1/2 md:border-0 md:p-0
  md:[-webkit-mask-image:linear-gradient(to_right,transparent_0%,black_7%)] md:[mask-image:linear-gradient(to_right,transparent_0%,black_7%)]"
```

Em `components/sections/Contact.tsx`, dar posicionamento à `<section>` (acrescentar `relative isolate` às classes dela) e inserir a aurora como primeiro filho:

```tsx
<div className="aurora" aria-hidden="true" />
```

`isolate` é necessário: sem contexto de empilhamento próprio, o `z-index: -1` da aurora a manda para trás do fundo da página e ela some.

Em `components/sections/SystemCard.tsx:28`, acrescentar `brilho-borda` às classes do `<article>`.

- [ ] **Step 5: Rodar e ver passar**

```bash
cd /g/documentos/portfolio && npx vitest run tests/unit/landing-movimento.test.ts && npm run typecheck && npm run lint && npm test
```

Esperado: tudo passa, com as duas animações infinitas nomeadas.

- [ ] **Step 6: Conferir na tela**

```bash
cd /g/documentos/portfolio && npm run build && npx serve out
```

Em `/pt/`: o facho existe e não estoura o contraste do texto ao lado; a aurora se move devagar atrás da chamada final; o brilho aparece no hover dos cards de sistema. Com `prefers-reduced-motion` ligado, a aurora **para** (o `@media` global zera a duração e a trava numa iteração).

- [ ] **Step 7: Commit**

```bash
git add app/globals.css components/sections/Hero.tsx components/sections/Contact.tsx components/sections/SystemCard.tsx tests/unit/landing-movimento.test.ts
git commit -F - <<'EOF'
feat(home): a luz que a landing nao pode ter

As mesmas seis referencias, agora sobre a superficie para a qual foram feitas.
O commit da landing descartou metade do catalogo -- Aurora, Beams, Light Rays,
Neon Gradient -- porque "sobre papel #F5F3EF um brilho e invisivel". Verdade la.
A home e #08090C.

Tres adicoes, uma so se movendo:

- Facho atras da cena 3D, estatico. Da de onde vem a luz que o aco reflete; sem
  ele o portico e iluminado por um estudio que a pagina nao mostra.
- Aurora atras da chamada final -- a UNICA animacao infinita da home, e na mesma
  posicao em que a landing pos a dela. Movida so por `transform`: camada
  desfocada e rasterizada uma vez e depois transportada pelo compositor. Animar
  `background-position` repintaria a area inteira por quadro, que e o custo que
  esta pagina justamente nao pode pagar.
- Brilho de borda no hover dos cards, gramatica do bklit: 1px de borda, nunca
  sombra. So a opacidade transita.

O SPEC DIZIA "atras do Boot" E ISSO ESTAVA ERRADO. Boot e um overlay fixo que
roda uma vez por sessao e desmonta -- a unica animacao perpetua da pagina seria
vista por ~2 s, uma vez por visitante. Movida para o CTA final, onde e vista e
onde aponta para a conversao.

O teste de orcamento passa a contar POR PAGINA e a nomear as donas: uma terceira
animacao infinita reprova, seja de quem for.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 8: Matéria

**Files:**
- Modify: `app/globals.css`
- Modify: `app/[locale]/(site)/layout.tsx`

**Interfaces:**
- Consumes: nada.
- Produces: classe `.textura-fundo`.

- [ ] **Step 1: O CSS**

Acrescentar a `app/globals.css`, ainda antes do bloco de movimento reduzido:

```css
/* GRÃO E VINHETA. Fundo preto chapado lê como ausência; com grão fino lê como
   superfície. É o "Noise" daquele catálogo de referências, que é dos poucos
   efeitos que custa zero: um `feTurbulence` embutido como data URI, pintado uma
   vez e nunca mais tocado.

   FICA ATRÁS DO CANVAS, e por escolha. O canvas da cena é criado com
   `alpha: true`, então a textura lê através das áreas em que a cena não pinta —
   que é o resultado desejado — e custa uma composição, não uma cadeia de
   repintura sobre um alvo que muda todo quadro.

   NADA AQUI SE MOVE. Grão animado é ruído de televisão, e o orçamento de
   movimento infinito da página já foi gasto na aurora. */
.textura-fundo {
  position: fixed;
  inset: 0;
  z-index: -10;
  pointer-events: none;
  background-color: var(--color-bg);
  background-image:
    radial-gradient(ellipse 100% 100% at 50% 50%, transparent 55%, rgb(0 0 0 / 0.55) 100%),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23g)' opacity='0.035'/%3E%3C/svg%3E");
}
```

- [ ] **Step 2: Pendurar no layout escuro**

Em `app/[locale]/(site)/layout.tsx`, primeiro filho do fragmento:

```tsx
return (
  <>
    {/* Grão e vinheta. Mora AQUI, no grupo `(site)`, e não em
        `app/[locale]/layout.tsx`: o escopo certo é home e case studies, que são
        escuros. A landing tem polaridade de papel e a rota `/cv` é feita para
        impressão — textura de fundo nas duas seria erro, não estilo. */}
    <div className="textura-fundo" aria-hidden="true" />
    <SkipLink label={dict.a11y.skipToContent} />
    <Header locale={locale} dict={dict} />
    <main id="conteudo">{children}</main>
    <Footer locale={locale} dict={dict} />
  </>
)
```

- [ ] **Step 3: Verificar**

```bash
cd /g/documentos/portfolio && npm run typecheck && npm run lint && npm test && npm run build && npx serve out
```

Conferir, nesta ordem:

1. `/pt/` — o grão é perceptível de perto e invisível de longe; a vinheta fecha os cantos sem escurecer o texto.
2. `/pt/sistemas/<algum-slug>` — mesma textura, é o mesmo layout.
3. `/pt/projetos` — **nenhuma textura**, a landing continua de papel.
4. `/pt/cv` — **nenhuma textura**.
5. A cena 3D continua visível: se a `.textura-fundo` cobrisse o canvas, o `z-index: -10` está errado.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css "app/[locale]/(site)/layout.tsx"
git commit -F - <<'EOF'
feat(home): grao e vinheta dao superficie ao preto

Fundo preto chapado le como ausencia; com grao fino le como superficie. E o
"Noise" do catalogo de referencias, que e dos poucos efeitos de custo zero: um
feTurbulence embutido como data URI, pintado uma vez e nunca mais tocado.

ATRAS DO CANVAS, por escolha. A cena e criada com alpha: true, entao a textura
le atraves das areas em que ela nao pinta -- que e o resultado desejado -- e
custa uma composicao em vez de uma cadeia de repintura sobre um alvo que muda
todo quadro.

No grupo (site) e nao no layout raiz: o escopo certo e home e case studies, que
sao escuros. A landing tem polaridade de papel e /cv e feita para impressao.

Nada aqui se move: o orcamento de animacao infinita da pagina ja foi gasto na
aurora, e grao animado e ruido de televisao.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 9: A arquitetura se desenha nos case studies

**Files:**
- Modify: `components/art/SystemArt.tsx`
- Modify: `components/diagrams/parts.tsx`
- Modify: `components/diagrams/SystemDiagram.tsx`
- Modify: `tests/unit/diagrams.test.tsx`

**Interfaces:**
- Consumes: `.arte-viva`, `.traca`, `.preenche` de `app/globals.css` (já existentes e testadas).
- Produces: nada para tarefas seguintes.

- [ ] **Step 1: Verificar `pathLength` nos três motores antes de adotar**

Esta é a única incerteza técnica do plano e o spec §8.1 manda checar. `pathLength` em `<path>` é universal; em `<rect>` e `<line>` é adição do SVG 2, com suporte bom mas não idêntico.

Criar um arquivo descartável `scratch-pathlength.html` fora do repositório (usar o diretório de rascunho da sessão), com um `<rect>`, um `<line>` e um `<path>`, todos com `pathLength="1"`, `stroke-dasharray: 1` e `stroke-dashoffset: 1`, e conferir nos três motores do Playwright que os três somem por completo. Se algum motor discordar, **`pathLength` fica só nos `<path>`** e rects e lines usam o perímetro calculado, `2 × (largura + altura)`, que é o que `components/landing/arte.tsx` já faz — copiar o padrão dali.

Registrar o resultado na mensagem de commit: qual caminho foi tomado e por quê.

- [ ] **Step 2: Teste do traçado**

Acrescentar a `tests/unit/diagrams.test.tsx`:

```tsx
/**
 * A ARQUITETURA SE DESENHA. É o mesmo mecanismo da landing (`.arte-viva` /
 * `.traca` / `.preenche`), e aqui ele é mais forte do que lá: um diagrama de
 * arquitetura que se constrói sozinho é o efeito descrevendo o próprio
 * conteúdo.
 *
 * TEXTO NÃO SE TRAÇA. Contorno de letra sendo desenhado lê como erro de
 * renderização, não como construção — os rótulos entram preenchendo.
 */
it('o diagrama declara a timeline e nenhum texto é traçado', () => {
  const { container } = render(<SystemDiagram system={sistemaDeTeste} dict={dicionario} />)

  const svg = container.querySelector('svg')
  expect(svg, 'o <svg> precisa declarar a timeline: forma dentro dele não tem caixa CSS').toHaveClass(
    'arte-viva',
  )

  for (const texto of container.querySelectorAll('text')) {
    expect(texto, 'texto com .traca vira contorno de letra sendo desenhado').not.toHaveClass('traca')
  }

  expect(container.querySelectorAll('.traca').length, 'nenhuma forma recebeu traçado').toBeGreaterThan(0)
})
```

Reaproveitar os objetos de sistema e dicionário que `tests/unit/diagrams.test.tsx` já monta para os testes existentes; se ele usar outros nomes, usar os dele.

- [ ] **Step 3: Rodar e ver falhar**

```bash
cd /g/documentos/portfolio && npx vitest run tests/unit/diagrams.test.tsx
```

Esperado: falha — o `<svg>` não tem `arte-viva` e nada tem `traca`.

- [ ] **Step 4: Aplicar as classes**

Em `components/diagrams/SystemDiagram.tsx`, acrescentar `className="arte-viva"` ao `<svg>` raiz (é ele que declara `view-timeline-name`; forma dentro de SVG não tem caixa CSS e não teria de onde medir).

Em `components/diagrams/parts.tsx`:
- Cada `<rect>`, `<line>` e `<path>` de contorno recebe `className="traca"` e `pathLength={1}`, com `style={{ '--traco': 1 }}`.
- Os `<text>` e qualquer forma preenchida recebem `className="preenche"`.
- Se o Step 1 reprovou `pathLength` em rect/line naquele motor, essas duas formas usam `--traco` com o perímetro calculado e **sem** `pathLength`.

Mesmo tratamento em `components/art/SystemArt.tsx`: `arte-viva` no `<svg>`, `traca` nos contornos, `preenche` nos sólidos.

**Nenhum estado inicial fora do `@supports`.** As classes já carregam isso — `stroke-dasharray` e `opacity: 0` moram dentro do bloco em `globals.css` e o teste `'a arte nunca nasce escondida fora do @supports'` guarda a regra. Não acrescentar estilo escondido nos componentes.

- [ ] **Step 5: Rodar e ver passar**

```bash
cd /g/documentos/portfolio && npx vitest run tests/unit/diagrams.test.tsx && npm test
```

Esperado: tudo passa.

- [ ] **Step 6: Bancada nos três motores**

```bash
cd /g/documentos/portfolio && npm run build && npx playwright test tests/e2e/case-study.spec.ts
```

Conferir manualmente em `/pt/sistemas/<slug>`, nos três motores:

1. Chromium e WebKit: o contorno traça e os sólidos preenchem depois; ao fim, zero traço aberto e zero sólido apagado.
2. Firefox: não implementa `animation-timeline`, pula o `@supports` e mostra a arte **pronta** — que é o desenho final de qualquer jeito.
3. Com `prefers-reduced-motion`: tudo visível de imediato nos três.

- [ ] **Step 7: Commit**

```bash
git add components/art/SystemArt.tsx components/diagrams/parts.tsx components/diagrams/SystemDiagram.tsx tests/unit/diagrams.test.tsx
git commit -F - <<'EOF'
feat(case-study): a arquitetura se desenha

Mesmo mecanismo da landing -- .arte-viva / .traca / .preenche -- e aqui ele e
mais forte do que la: um diagrama de arquitetura que se constroi sozinho e o
efeito descrevendo o proprio conteudo.

Era a terceira direcao que o dono escolheu para a home, e a home NAO TEM UM
UNICO <svg> nas suas secoes. SystemArt e SystemDiagram vivem nos case studies, a
um clique dali.

pathLength FECHA O ARGUMENTO DO ANIME.JS TAMBEM PARA <path>. O commit da landing
admitiu um caso sem formula: path arbitrario, cujo comprimento so a
svg.createDrawable calcularia em runtime. pathLength="1" normaliza o comprimento
declarado para 1, entao stroke-dasharray: 1 cobre qualquer geometria sem medir
nada -- em tempo de escrita, sem biblioteca.

VERIFICADO NOS TRES MOTORES ANTES DE ADOTAR, porque em <rect> e <line> isso e
adicao do SVG 2 e o suporte nao e identico: <PREENCHER o que cada motor fez e
qual caminho foi tomado>.

Texto nao se traca: contorno de letra sendo desenhado le como erro de
renderizacao, nao como construcao. Os rotulos entram preenchendo.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 10: Fechamento

- [ ] **Step 1: Suíte inteira**

```bash
cd /g/documentos/portfolio && npm run typecheck && npm run lint && npm test && npm run build && npx playwright test
```

Esperado: tudo verde.

- [ ] **Step 2: Percorrer a lista do spec §11**

- [ ] Nenhum elemento preso abaixo de opacidade 1 depois de percorrer `/pt/` inteira.
- [ ] Zero overflow horizontal em `/pt/` e `/pt/sistemas/<slug>`.
- [ ] Exatamente duas animações infinitas no CSS, uma por página, com as donas nomeadas.
- [ ] `prefers-reduced-motion` ligado: tudo visível de imediato, cena 3D não monta, aurora parada — nos três motores.
- [ ] Sem suporte a scroll timeline (Firefox): home e case studies aparecem completos, nunca em branco.
- [ ] `/pt/projetos` e `/pt/cv` intactas — sem textura, sem regressão na revelação.

- [ ] **Step 3: Push**

```bash
cd /g/documentos/portfolio && git push origin feat/landing-captacao
```

---

## Auto-revisão

**Cobertura do spec.** §2.1 e §4.1–4.2 → Tarefas 1–3. §2.2 (`WARMUP`) → Tarefa 3 Step 4. §2.3 → Tarefa 5. §2.4 (comentário obsoleto) → Tarefa 2 Step 3. §4.4 (portão) → Tarefa 3 Step 7 e Tarefa 6. §5.1–5.2 → Tarefas 4 e 5. §5.3 → Tarefa 5 Steps 7–8. §6.1–6.3 → Tarefa 7. §6.4 (contra o vidro) → nenhuma tarefa o introduz, que é o cumprimento correto. §7 → Tarefa 8. §8.1–8.3 → Tarefa 9. §9 → Tarefa 6 Step 2. §10 (fora de escopo) → nenhuma tarefa o viola; `npm uninstall motion` na Tarefa 5 é a única mudança de dependência, e é remoção. §11 → Tarefa 10.

**Consistência de tipos.** `judge` nasce com quatro parâmetros na Tarefa 1 e passa a cinco na Tarefa 2 — a mudança é declarada no bloco *Interfaces* da Tarefa 2 e o teste da Tarefa 2 já usa a forma nova, com o Step 2 explicando o ajuste temporário para reproduzir o defeito na forma antiga. `Meter` perde o campo `vsync` na Tarefa 2, e nada fora de `portico-quality.ts` o lê. `Reveal` troca `delayMs` por `ordem` na Tarefa 5, com os onze pontos de chamada tabelados no Step 5. `vsync` desce por `Portico` → `Yard` → `useQuality` na Tarefa 3 Step 5, com as três assinaturas escritas.

**Ponto que exige julgamento na execução.** Tarefa 9 Step 1 é uma verificação empírica cujo resultado escolhe entre dois caminhos de implementação. Está assim de propósito: o suporte a `pathLength` fora de `<path>` não é fato estabelecido, e o spec §8.1 manda medir em vez de supor. Os dois caminhos estão descritos, e o de trás já existe em `components/landing/arte.tsx`.
