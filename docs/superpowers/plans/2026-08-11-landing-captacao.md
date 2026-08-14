# Landing de captação — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar `/[locale]/projetos` — uma landing de captação de projeto, em
polaridade clara, com CTA único de WhatsApp, hospedada no mesmo repositório do portfólio.

**Architecture:** Rota fora do route group `(site)` (sem Header/Footer, mesmo padrão de
`cv` e `og`), com layout próprio que inverte a polaridade do documento. Conteúdo no
`Dictionary` tipado, nos dois idiomas. Componentes em `components/landing/`, cada um
consumindo sua fatia do dicionário. Nenhum número escrito à mão: tudo vem de
`content/pt.ts` e `content/systems.ts`, que já carregam campo de proveniência.

**Tech Stack:** Next.js 16 (App Router, `output: 'export'`), React 19, Tailwind CSS 4
(`@theme`), TypeScript, Vitest + Testing Library, Playwright.

**Spec:** [`../specs/2026-08-11-landing-captacao-design.md`](../specs/2026-08-11-landing-captacao-design.md)
**Pesquisa:** [`../research/2026-08-11-landing-captacao-pesquisa.md`](../research/2026-08-11-landing-captacao-pesquisa.md)

## Global Constraints

Valem para **todas** as tarefas. Cada uma é critério de aceitação do spec.

- **Comentários e nomes de variável em português**, seguindo o resto do repositório.
  Comentário explica *por que*, não *o que*.
- **Nenhum número escrito à mão na landing.** Todos vêm do dicionário ou de
  `content/systems.ts`. Regra do spec §4.4.
- **As palavras `GEO`, `llms.txt` e `AI Overviews` não podem aparecer** em nenhum texto
  visível. Spec §10.8.
- **Nenhuma promessa de que o cliente vai aparecer nas respostas de IA.** A promessa é
  que a IA *consegue ler* o site. Spec §2.2.
- **`#38BDF8` (`--color-data`) não pode aparecer fora das duas faixas escuras** — dá
  1,93:1 sobre `#F5F3EF` e reprova AA. Spec §3.2.
- **Exatamente duas faixas escuras:** `Dupla` (§4.4) e `LandingCta` (§4.7).
- **Fonte de corpo mínima 17px** (`text-[17px]` ou maior). Vale para texto corrido; label
  em mono com 1–3 palavras (`text-xs`, `text-[11px]`) segue o padrão do portfólio e está
  fora da regra. Spec §5.6.

### Sobre os testes que asseveram nome de classe CSS

Alguns testes deste plano checam `className` — `md:hidden`, `inset-x-0`, ausência de
`text-data`. Isso normalmente é cheiro de teste acoplado à implementação, e um revisor
tem razão em desconfiar.

Aqui é deliberado, e a razão é que **jsdom não aplica CSS**: não existe forma unitária de
perguntar "isto está escondido no desktop?" ou "esta cor foi usada?", porque nenhuma
regra de folha de estilo é resolvida. As alternativas seriam um e2e em dois viewports
para cada asserção — caro para o que se ganha — ou não testar, e aí as duas regras mais
frágeis da página ficam sem rede: o ciano que reprova em fundo claro e a barra que não
pode aparecer no desktop onde já existe CTA inline.

Cada um desses testes carrega o comentário explicando o porquê. O comportamento de
verdade é coberto por e2e em navegador real na Task 10 e na verificação manual da Task 13.
- **Sem WebGL nesta rota.** Spec §5.6.
- **Um único destino de CTA**, repetido. Nunca um segundo destino. Spec §5.4.
- **O número do WhatsApp vem de `contact.whatsapp`.** Não criar segunda cópia.
- Rodar `npm run typecheck && npm run lint` antes de cada commit.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `app/globals.css` | **modificar** — acrescentar o conjunto de tokens da polaridade clara |
| `lib/contraste.ts` | **criar** — cálculo de contraste WCAG, usado pelo teste |
| `app/[locale]/projetos/layout.tsx` | **criar** — inverte a polaridade do documento |
| `app/[locale]/projetos/page.tsx` | **criar** — monta as seções, define a metadata |
| `content/types.ts` | **modificar** — chave `landing` no `Dictionary` |
| `content/pt.ts` / `content/en.ts` | **modificar** — o conteúdo |
| `components/landing/LandingHero.tsx` | **criar** — §4.1 |
| `components/landing/Criterio.tsx` | **criar** — §4.2 |
| `components/landing/Oferta.tsx` | **criar** — §4.3, três cartões |
| `components/landing/Dupla.tsx` | **criar** — §4.4, faixa escura |
| `components/landing/Prova.tsx` | **criar** — §4.5 |
| `components/landing/Piso.tsx` | **criar** — §4.6, some se vazio |
| `components/landing/LandingCta.tsx` | **criar** — §4.7, faixa escura |
| `components/landing/Perguntas.tsx` | **criar** — §4.8 |
| `components/landing/BarraCta.tsx` | **criar** — barra fixa, só mobile |
| `components/landing/whatsapp.ts` | **criar** — monta a URL com mensagem |
| `scripts/generate-seo-files.mts` | **modificar** — a rota entra no sitemap |
| `scripts/generate-og.mts` | **modificar** — para de repetir a lista de slugs |
| `app/[locale]/og/[slug]/page.tsx` | **modificar** — exporta a lista, cobre a landing |

---

## Task 1: Tokens da polaridade clara, com teste de contraste

O conjunto escuro não sobrevive à inversão: `--color-data` dá 1,93:1 sobre `#F5F3EF` e
`--color-muted` dá 3,05:1 — os dois reprovam. E `--color-faint`, documentado como "só
linha, nunca palavra", vira **AAA** em fundo claro. O mesmo hex troca de função conforme
a polaridade, então é preciso um segundo conjunto, não uma inversão.

O teste vem primeiro porque é ele que impede alguém de trocar um hex meses depois e
quebrar a acessibilidade em silêncio.

**Files:**
- Create: `lib/contraste.ts`
- Create: `tests/unit/contraste.test.ts`
- Modify: `app/globals.css:3-18`

**Interfaces:**
- Consumes: nada.
- Produces: `contraste(a: string, b: string): number` em `lib/contraste.ts`. Tokens CSS
  `--color-paper`, `--color-ink`, `--color-ink-2`, `--color-accent`, `--color-rule`, que
  o Tailwind expõe como `bg-paper`, `text-ink`, `text-ink-2`, `text-accent`,
  `border-rule`.

- [ ] **Step 1: Escrever o teste que falha**

Crie `tests/unit/contraste.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { contraste } from '@/lib/contraste'

/**
 * A landing inverte a polaridade do portfólio, e os tokens do fundo escuro NÃO
 * sobrevivem à inversão: `--color-data` dá 1,93:1 sobre `#F5F3EF`. Este teste
 * existe para que trocar um hex sem conferir o contraste quebre a suíte, em vez
 * de quebrar a leitura de quem abre a página no celular sob sol.
 *
 * Mínimos da WCAG 2.1: 4.5:1 para texto normal (AA), 3:1 para texto grande e
 * para componente de interface não textual.
 */

const PAPEL = '#F5F3EF'
const ESCURO = '#08090C'

describe('contraste', () => {
  // Âncoras conhecidas: preto no branco dá 21:1, e uma cor contra ela mesma dá 1:1.
  // Sem elas, um erro de sinal na fórmula passaria despercebido.
  it('calcula os extremos corretamente', () => {
    expect(contraste('#000000', '#FFFFFF')).toBeCloseTo(21, 1)
    expect(contraste('#123456', '#123456')).toBeCloseTo(1, 5)
  })

  it('a ordem dos argumentos não muda o resultado', () => {
    expect(contraste(PAPEL, ESCURO)).toBeCloseTo(contraste(ESCURO, PAPEL), 5)
  })

  describe('tokens da polaridade clara', () => {
    it.each([
      ['tinta', '#08090C', 4.5],
      ['texto secundário', '#4A505A', 4.5],
      ['acento', '#0369A1', 4.5],
    ])('%s passa AA sobre o papel', (_nome, hex, minimo) => {
      expect(contraste(hex, PAPEL)).toBeGreaterThanOrEqual(minimo)
    })
  })

  describe('tokens da faixa escura', () => {
    it.each([
      ['texto', '#F5F3EF', 4.5],
      ['data (ciano)', '#38BDF8', 4.5],
    ])('%s passa AA sobre a faixa', (_nome, hex, minimo) => {
      expect(contraste(hex, ESCURO)).toBeGreaterThanOrEqual(minimo)
    })
  })

  // Estes três são a razão de o conjunto claro existir. Se algum dia passarem,
  // alguém mexeu num hex e o teste acima deixou de proteger o que protegia.
  describe('o que NÃO pode ser usado em texto sobre o papel', () => {
    it.each([
      ['data (ciano)', '#38BDF8'],
      ['muted do tema escuro', '#878C96'],
      ['verde do WhatsApp', '#25D366'],
    ])('%s reprova AA e por isso não vira token claro', (_nome, hex) => {
      expect(contraste(hex, PAPEL)).toBeLessThan(4.5)
    })
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/contraste.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/contraste"`

- [ ] **Step 3: Implementar o cálculo**

Crie `lib/contraste.ts`:

```ts
/**
 * Contraste entre duas cores pela fórmula de luminância relativa da WCAG 2.1.
 *
 * Existe como módulo, e não inline no teste, porque a regra de contraste é
 * decisão de projeto (globals.css documenta os mínimos) e merece uma
 * implementação única que o teste verifica — em vez de uma cópia por arquivo
 * que sai de sincronia.
 */

/** Canal de 0–255 para luminância linear. O joelho em 0.03928 é da própria
 *  especificação: abaixo dele a curva é linear, acima é potência. */
function linearizar(canal: number): number {
  const c = canal / 255
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

function luminancia(hex: string): number {
  const limpo = hex.replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(limpo)) {
    throw new Error(`cor inválida: ${hex} — esperado #RRGGBB`)
  }
  const n = parseInt(limpo, 16)
  return (
    0.2126 * linearizar((n >> 16) & 255) +
    0.7152 * linearizar((n >> 8) & 255) +
    0.0722 * linearizar(n & 255)
  )
}

/** Razão de contraste, sempre >= 1. A ordem dos argumentos não importa. */
export function contraste(a: string, b: string): number {
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (claro + 0.05) / (escuro + 0.05)
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/unit/contraste.test.ts`
Expected: PASS — 9 testes.

- [ ] **Step 5: Acrescentar os tokens ao tema**

Em `app/globals.css`, dentro do bloco `@theme`, logo depois de `--color-data`:

```css
  /* POLARIDADE CLARA — conjunto próprio, não inversão do de cima.
     A landing (/[locale]/projetos) fala com dono de empresa no celular sob luz
     variável, não com recrutador técnico no desktop: o NN/g mede vantagem da
     polaridade positiva em todas as faixas etárias, e a vantagem CRESCE
     conforme a fonte diminui.

     Não dá para reaproveitar os tokens acima. Medido com lib/contraste.ts,
     sobre --color-paper: --color-data dá 1,93:1 e --color-muted dá 3,05:1, os
     dois reprovam. E --color-faint, que aqui em cima é "só linha, nunca
     palavra", vira 7,33:1 (AAA) em fundo claro — o mesmo hex troca de função
     conforme a polaridade.

     --color-accent (#0369A1, 5,35:1) não é cor nova no projeto: a rota /cv,
     que já era clara, resolveu esse mesmo problema antes. */
  --color-paper: #F5F3EF;   /* mesmo hex de --color-text, papel invertido */
  --color-ink: #08090C;     /* mesmo hex de --color-bg, papel invertido */
  --color-ink-2: #4A505A;   /* 7,33:1 AAA — texto secundário */
  --color-accent: #0369A1;  /* 5,35:1 AA — links e destaque */
  --color-rule: #DDD9D2;    /* borda decorativa; não usar para delimitar controle */
```

- [ ] **Step 6: Verificar que o build aceita os tokens**

Run: `npm run typecheck && npm run lint`
Expected: sem erro.

- [ ] **Step 7: Commit**

```bash
git add lib/contraste.ts tests/unit/contraste.test.ts app/globals.css
git commit -m "feat(landing): tokens da polaridade clara com teste de contraste

Os tokens do tema escuro nao sobrevivem a inversao: --color-data da 1,93:1
sobre o fundo claro e --color-muted da 3,05:1. E --color-faint, documentado
como 'so linha, nunca palavra', vira AAA no claro. O mesmo hex troca de
funcao conforme a polaridade, entao e um conjunto novo e nao uma inversao.

O teste vem junto porque a regra so vale se quebrar a suite quando alguem
trocar um hex sem conferir."
```

---

## Task 2: Rota e layout de polaridade clara

`globals.css` pinta `body` de `#08090C` e marca `html { color-scheme: dark }`. As duas
coisas precisam ser desfeitas nesta rota — e só nela, porque o escuro está certo no resto
do site.

`color-scheme` é o detalhe que passa despercebido: sem trocá-lo, o navegador continua
desenhando barra de rolagem, campo de formulário e menu de contexto em tema escuro sobre
uma página clara.

**Files:**
- Create: `app/[locale]/projetos/layout.tsx`
- Create: `app/[locale]/projetos/page.tsx`
- Create: `tests/e2e/landing.spec.ts`

**Interfaces:**
- Consumes: Task 1 (`bg-paper`, `text-ink`).
- Produces: a rota `/[locale]/projetos/`, com `<main id="conteudo">`.

- [ ] **Step 1: Escrever o teste que falha**

Crie `tests/e2e/landing.spec.ts`:

```ts
import { test, expect } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { locales } from '../../content/types'

const OUT = join(process.cwd(), 'out')

test('a landing existe em out/ nos dois idiomas', () => {
  for (const locale of locales) {
    const arquivo = join(OUT, locale, 'projetos', 'index.html')
    expect(existsSync(arquivo), `rota não gerada: /${locale}/projetos`).toBe(true)
  }
})

// O portfólio inteiro é escuro; esta rota é a exceção. Sem sobrescrever
// `color-scheme`, o navegador desenha barra de rolagem e controles nativos em
// tema escuro sobre uma página clara — defeito que só aparece no navegador de
// verdade, nunca em teste de unidade.
test('a landing não herda o tema escuro do portfólio', async ({ page }) => {
  await page.goto('/pt/projetos/')
  const corDeFundo = await page.evaluate(
    () => getComputedStyle(document.body).backgroundColor,
  )
  expect(corDeFundo).toBe('rgb(245, 243, 239)')

  const esquema = await page.evaluate(
    () => getComputedStyle(document.documentElement).colorScheme,
  )
  expect(esquema).toBe('light')
})

test('a landing não leva o cromo de navegação do portfólio', () => {
  const bruto = readFileSync(join(OUT, 'pt', 'projetos', 'index.html'), 'utf8')
  expect(bruto).not.toContain('<header')
  expect(bruto).not.toContain('<footer')
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm run build && npx playwright test tests/e2e/landing.spec.ts`
Expected: FAIL — `rota não gerada: /pt/projetos`

- [ ] **Step 3: Criar o layout**

Crie `app/[locale]/projetos/layout.tsx`:

```tsx
import { locales, type Locale } from '@/content'

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

/**
 * Vive FORA do route group `(site)`, junto de `cv` e `og`: sem Header, Footer
 * nem SkipLink. Numa landing todo item de menu é uma saída, e o formato existe
 * justamente para não oferecer nenhuma além do CTA.
 *
 * A INVERSÃO DE POLARIDADE ACONTECE AQUI, e são duas coisas, não uma.
 *
 * `globals.css` pinta `body { background: var(--color-bg) }` e marca
 * `html { color-scheme: dark }`. Trocar só o fundo deixa o navegador
 * desenhando barra de rolagem, campo de formulário e menu de contexto em tema
 * escuro sobre uma página clara — defeito que não aparece em teste de unidade,
 * só no navegador.
 *
 * `html body` (especificidade 0,0,2) vence `body` (0,0,1) sem depender da
 * ordem em que o Next insere a regra e sem `!important`. Mesma solução já
 * aplicada em app/[locale]/cv/page.tsx.
 *
 * Fica na rota, e não em globals.css, porque o escuro está certo em todo o
 * resto do site.
 */
export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{'html{color-scheme:light}html body{background:#F5F3EF;color:#08090C}'}</style>
      <main id="conteudo">{children}</main>
    </>
  )
}
```

- [ ] **Step 4: Criar a página mínima**

Crie `app/[locale]/projetos/page.tsx`:

```tsx
import { getDictionary, type Locale } from '@/content'

export const dynamicParams = false

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params
  const dict = getDictionary(locale)
  // As seções entram nas tarefas seguintes; por ora só o suficiente para a
  // rota existir e o teste de polaridade ter o que medir.
  return <h1 className="px-6 py-20 text-4xl font-bold text-ink">{dict.meta.title}</h1>
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npm run build && npx playwright test tests/e2e/landing.spec.ts`
Expected: PASS — 3 testes.

- [ ] **Step 6: Commit**

```bash
git add "app/[locale]/projetos" tests/e2e/landing.spec.ts
git commit -m "feat(landing): rota /projetos com polaridade clara

Fora do route group (site), como cv e og: sem header nem rodape, porque
numa landing todo item de menu e uma saida.

A inversao sao DUAS coisas. Alem do fundo, o color-scheme: sem trocar,
o navegador desenha barra de rolagem e controles nativos escuros sobre
pagina clara -- defeito que so aparece no navegador de verdade, e por isso
o teste e e2e e nao unitario."
```

---

## Task 3: A chave `landing` no dicionário

Todo o texto da página vive aqui, tipado. O `tsc` recusa se `en.ts` ficar para trás.

O campo `piso` é **opcional por decisão de produto**, não por descuido: permite subir a
página antes de o dono decidir o valor.

**Files:**
- Modify: `content/types.ts` (acrescentar `landing` ao `Dictionary`)
- Modify: `content/pt.ts`, `content/en.ts`
- Modify: `tests/content.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `dict.landing`, com a forma abaixo. Todas as tarefas seguintes consomem daqui.

- [ ] **Step 1: Escrever o teste que falha**

Acrescente ao final de `tests/content.test.ts`, dentro do `describe` de topo:

```ts
  describe('landing', () => {
    // O tsc já garante que as duas existem. O que ele NÃO garante é que
    // alguém preencheu com string vazia para calar o compilador.
    it('nenhum texto obrigatório está vazio nos dois idiomas', () => {
      for (const dict of [pt, en]) {
        const { piso, ...obrigatorios } = dict.landing
        const vazios: string[] = []
        const varrer = (valor: unknown, caminho: string) => {
          if (typeof valor === 'string') {
            if (valor.trim() === '') vazios.push(caminho)
          } else if (Array.isArray(valor)) {
            valor.forEach((item, i) => varrer(item, `${caminho}[${i}]`))
          } else if (valor && typeof valor === 'object') {
            for (const [k, v] of Object.entries(valor)) varrer(v, `${caminho}.${k}`)
          }
        }
        varrer(obrigatorios, 'landing')
        expect(vazios, `campos vazios: ${vazios.join(', ')}`).toEqual([])
      }
    })

    // Regra do spec §10.8. Estes três termos foram removidos por pesquisa:
    // "GEO" significa geolocalização no Brasil; llms.txt não é lido por
    // ninguém (97% dos arquivos com zero requisição); "AI Overviews" não é
    // reconhecido pelo público. Se alguém reintroduzir, isto quebra.
    it('não usa o vocabulário que a pesquisa descartou', () => {
      for (const dict of [pt, en]) {
        const texto = JSON.stringify(dict.landing).toLowerCase()
        expect(texto).not.toContain('llms.txt')
        expect(texto).not.toContain('ai overview')
        expect(texto).not.toMatch(/\bgeo\b/)
      }
    })

    it('a oferta tem exatamente três cartões', () => {
      for (const dict of [pt, en]) {
        expect(dict.landing.oferta.cartoes).toHaveLength(3)
      }
    })
  })
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/content.test.ts`
Expected: FAIL — `Property 'landing' does not exist on type 'Dictionary'`

- [ ] **Step 3: Acrescentar o tipo**

Em `content/types.ts`, dentro de `export type Dictionary = {`, logo antes de `footer:`:

```ts
  /**
   * Landing de captação (/[locale]/projetos). Separada de `contact` porque
   * fala com outro leitor: `contact` responde a recrutador que já leu o
   * portfólio; isto aborda dono de empresa que caiu aqui por um link.
   */
  landing: {
    meta: { title: string; description: string }
    hero: {
      titulo: string
      subtitulo: string
      /** Aparece sob o CTA, na dobra. É onde a dupla entra pela primeira vez. */
      assinatura: string
    }
    cta: {
      /** Texto do botão. Primeira pessoa e específico — ver pesquisa §3.4. */
      rotulo: string
      /**
       * Mensagem que já vai escrita no WhatsApp. Diferente de
       * `contact.whatsappMessage`: quem chega aqui não veio pelo portfólio.
       */
      mensagem: string
      /**
       * Microtexto sob o botão. Existe porque o medo de quem clica não é o
       * preço, é ser perseguido por vendedor.
       */
      tranquilizador: string
    }
    criterio: { titulo: string; abertura: string; testes: { titulo: string; corpo: string }[]; fecho: string[] }
    oferta: { titulo: string; cartoes: { nome: string; corpo: string }[] }
    dupla: { titulo: string; corpo: string[]; numeros: { valor: string; rotulo: string }[] }
    prova: { titulo: string; lead: string; verCase: string }
    /**
     * Piso de preço. OPCIONAL POR DECISÃO, não por descuido: string vazia faz
     * a seção não renderizar, o que permite publicar antes de o valor estar
     * decidido. Ver spec §4.6 — é a única decisão da pesquisa com evidência
     * direta de que move resultado, então o vazio é estado temporário.
     */
    piso: { valor: string; nota: string } | null
    fechamento: { titulo: string; corpo: string }
    perguntas: { titulo: string; itens: { pergunta: string; resposta: string }[] }
  }
```

- [ ] **Step 4: Preencher o português**

Em `content/pt.ts`, logo antes de `footer:`:

```ts
  landing: {
    meta: {
      title: 'Sites, blogs e sistemas sob medida — Neto Alves',
      description:
        'Dois desenvolvedores full-stack. Sites, blogs e sistemas construídos para carregar rápido, aparecer no Google e ser lidos pelo ChatGPT.',
    },
    hero: {
      titulo: 'Sites, blogs e sistemas sob medida.',
      subtitulo:
        'Construídos para carregar rápido, aparecer no Google e ser lidos pelo ChatGPT.',
      assinatura:
        'Dois desenvolvedores full-stack. Você fala direto com quem escreve o código.',
    },
    cta: {
      rotulo: 'Quero um orçamento',
      mensagem: 'Olá, Neto! Vi a página de projetos e quero um orçamento.',
      tranquilizador: 'Sem ligação e sem cadastro.',
    },
    criterio: {
      titulo: 'Como saber se o site que te entregarem presta',
      abertura: 'Você vai receber três orçamentos e todos vão parecer iguais. Dois testes separam.',
      testes: [
        {
          titulo: 'Abra num celular, no 4G.',
          corpo: 'Passou de dois segundos, você perde gente antes de ela ver qualquer coisa.',
        },
        {
          titulo: 'Peça para ver o site com o JavaScript desligado.',
          corpo: 'Se a tela ficar em branco, é exatamente isso que o ChatGPT enxerga: nada.',
        },
      ],
      fecho: [
        'O segundo teste quase ninguém faz. Quando perguntam ao ChatGPT qual empresa contratar no seu ramo, ele lê o site direto do servidor — não abre no navegador como você. Site que se monta no navegador chega vazio.',
        'Não é previsão, é como funciona hoje. E também não é a emergência que te vendem: esse tipo de visita ainda é uma fatia pequena do total no Brasil. Só que converte mais que o dobro do que vem do Google.',
      ],
    },
    oferta: {
      titulo: 'O que eu construo',
      cartoes: [
        {
          nome: 'Site',
          corpo:
            'Institucional, de produto ou de captação. Abre instantâneo e o texto já vem pronto do servidor — que é o que o Google e o ChatGPT leem.',
        },
        {
          nome: 'Blog',
          corpo:
            'Onde a autoridade se acumula. Publicou, os buscadores sabem em segundos.',
        },
        {
          nome: 'Sistema sob medida',
          corpo:
            'Quando a operação não cabe em site. CRM, ERP, painel, automação — do banco ao ar.',
        },
      ],
    },
    dupla: {
      titulo: 'Dois desenvolvedores full-stack',
      corpo: [
        'Você fala direto com quem escreve o código. Sem gerente de projeto, sem estagiário, sem terceirização.',
        'E não depende de uma pessoa só: os dois conhecem o código inteiro.',
      ],
      // Os valores NÃO ficam aqui: vêm de `telemetry`, que já carrega o campo
      // `provenance` dizendo como cada um foi medido. Só os rótulos moram
      // neste dicionário. Ver Task 6.
      numeros: [{ valor: '2', rotulo: 'desenvolvedores' }],
    },
    prova: {
      titulo: 'O que já está no ar',
      lead: 'Três sistemas em operação. Cada um com o número que ele moveu e como esse número foi medido.',
      verCase: 'Ver o caso completo',
    },
    // Vazio até o dono decidir o valor. A seção some sozinha — ver Task 8.
    piso: null,
    fechamento: {
      titulo: 'Traz o problema.',
      corpo: 'Me conta o que precisa existir e para quando.',
    },
    perguntas: {
      titulo: 'Perguntas',
      itens: [
        {
          pergunta: 'E se um de vocês ficar indisponível?',
          resposta:
            'Os dois conhecem o código inteiro e o repositório é compartilhado desde o primeiro dia. O projeto não para porque uma pessoa parou.',
        },
        {
          pergunta: 'Isso substitui o trabalho de SEO?',
          resposta:
            'Não. O SEO continua valendo para a busca tradicional, que ainda traz a maior parte das visitas. O que eu garanto é a base técnica: sem ela, nenhum trabalho de conteúdo rende o que deveria.',
        },
        {
          pergunta: 'Quanto tempo leva?',
          resposta:
            'Depende do escopo. Os três sistemas do portfólio levaram de 26 a 45 dias cada, com duas pessoas. Um site institucional é bem mais rápido que isso — mas eu só dou prazo depois de entender o que precisa existir.',
        },
      ],
    },
  },
```

- [ ] **Step 5: Preencher o inglês**

Em `content/en.ts`, na mesma posição, a tradução. Manter `piso: null` e a mesma
quantidade de itens em cada lista — o teste do Step 1 confere os três cartões, e o teste
de paridade que já existe confere as chaves.

```ts
  landing: {
    meta: {
      title: 'Websites, blogs and custom systems — Neto Alves',
      description:
        'Two full-stack developers. Websites, blogs and systems built to load fast, rank on Google and be readable by ChatGPT.',
    },
    hero: {
      titulo: 'Websites, blogs and custom systems.',
      subtitulo: 'Built to load fast, rank on Google and be readable by ChatGPT.',
      assinatura: 'Two full-stack developers. You talk straight to whoever writes the code.',
    },
    cta: {
      rotulo: 'Get a quote',
      mensagem: 'Hi, Neto! I saw your projects page and I would like a quote.',
      tranquilizador: 'No calls, no sign-up.',
    },
    criterio: {
      titulo: 'How to tell whether the site they deliver is any good',
      abertura: 'You will get three quotes and they will all look the same. Two tests tell them apart.',
      testes: [
        {
          titulo: 'Open it on a phone, on mobile data.',
          corpo: 'Over two seconds and you lose people before they see anything at all.',
        },
        {
          titulo: 'Ask to see the site with JavaScript turned off.',
          corpo: 'If the screen goes blank, that is exactly what ChatGPT sees: nothing.',
        },
      ],
      fecho: [
        'Almost nobody runs the second test. When someone asks ChatGPT which company to hire in your field, it reads the site straight from the server — it does not open it in a browser the way you do. A site that assembles itself in the browser arrives empty.',
        'This is not a forecast, it is how it works today. It is also not the emergency you are being sold: that kind of visit is still a small slice of the total in Brazil. It just converts at more than twice the rate of Google traffic.',
      ],
    },
    oferta: {
      titulo: 'What I build',
      cartoes: [
        {
          nome: 'Website',
          corpo:
            'Corporate, product or lead capture. Loads instantly, and the text arrives ready from the server — which is what Google and ChatGPT read.',
        },
        {
          nome: 'Blog',
          corpo: 'Where authority accumulates. Publish it and search engines know within seconds.',
        },
        {
          nome: 'Custom system',
          corpo:
            'When the operation does not fit in a website. CRM, ERP, dashboards, automation — from the database to production.',
        },
      ],
    },
    dupla: {
      titulo: 'Two full-stack developers',
      corpo: [
        'You talk straight to whoever writes the code. No project manager, no intern, no outsourcing.',
        'And it does not hang on one person: both of us know the whole codebase.',
      ],
      numeros: [{ valor: '2', rotulo: 'developers' }],
    },
    prova: {
      titulo: 'What is already running',
      lead: 'Three systems in production. Each with the number it moved, and how that number was measured.',
      verCase: 'Read the full case',
    },
    piso: null,
    fechamento: {
      titulo: 'Bring me the problem.',
      corpo: 'Tell me what needs to exist and by when.',
    },
    perguntas: {
      titulo: 'Questions',
      itens: [
        {
          pergunta: 'What if one of you is unavailable?',
          resposta:
            'Both of us know the whole codebase and the repository is shared from day one. The project does not stop because one person did.',
        },
        {
          pergunta: 'Does this replace SEO work?',
          resposta:
            'No. SEO still matters for traditional search, which brings most of the visits. What I guarantee is the technical foundation: without it, no amount of content work pays off.',
        },
        {
          pergunta: 'How long does it take?',
          resposta:
            'It depends on scope. The three systems in the portfolio took 26 to 45 days each, with two people. A corporate site is much faster — but I only quote a deadline after understanding what needs to exist.',
        },
      ],
    },
  },
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx vitest run tests/content.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add content/types.ts content/pt.ts content/en.ts tests/content.test.ts
git commit -m "feat(landing): chave landing no dicionario, nos dois idiomas

O campo piso e opcional POR DECISAO, nao por descuido: string nula faz a
secao nao renderizar, o que permite publicar antes de o valor estar
decidido.

O teste de vocabulario trava tres termos que a pesquisa descartou: GEO
(significa geolocalizacao no Brasil), llms.txt (97% dos arquivos nunca
receberam uma requisicao) e AI Overviews (o publico nao reconhece)."
```

---

## Task 4: A URL do WhatsApp, com fonte única

O número já existe em `contact.whatsapp` e está público no portfólio no ar. A landing usa
**o mesmo campo** com mensagem própria. Um módulo minúsculo, mas ele impede a duplicação
que faria as duas páginas apontarem para números diferentes.

**Files:**
- Create: `components/landing/whatsapp.ts`
- Create: `tests/unit/whatsapp.test.ts`

**Interfaces:**
- Consumes: `dict.contact.whatsapp`, `dict.landing.cta.mensagem`.
- Produces: `urlWhatsapp(base: string, mensagem: string): string`.

- [ ] **Step 1: Escrever o teste que falha**

Crie `tests/unit/whatsapp.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { urlWhatsapp } from '@/components/landing/whatsapp'
import { pt } from '@/content/pt'

describe('urlWhatsapp', () => {
  it('anexa a mensagem codificada', () => {
    const url = urlWhatsapp('https://wa.me/5511999999999', 'Olá, tudo bem?')
    expect(url).toBe('https://wa.me/5511999999999?text=Ol%C3%A1%2C%20tudo%20bem%3F')
  })

  // A mensagem carrega acento, vírgula e ponto de interrogação. Concatenar
  // sem codificar produz URL que o WhatsApp trunca na primeira vírgula.
  it('codifica caracteres que quebrariam a query', () => {
    const url = urlWhatsapp('https://wa.me/55', 'a&b=c?d')
    expect(url).toContain('text=a%26b%3Dc%3Fd')
  })

  // Fonte única: se alguém escrever outro número na landing, isto pega.
  it('a landing usa o mesmo número do contato do portfólio', () => {
    const url = urlWhatsapp(pt.contact.whatsapp, pt.landing.cta.mensagem)
    expect(url.startsWith(`${pt.contact.whatsapp}?text=`)).toBe(true)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/whatsapp.test.ts`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementar**

Crie `components/landing/whatsapp.ts`:

```ts
/**
 * Monta o link do WhatsApp com a primeira frase já escrita.
 *
 * A mensagem pré-preenchida não é enfeite: ela elimina a fricção de redigir a
 * primeira frase, que é onde parte das pessoas desiste — padrão observado nas
 * páginas brasileiras que convertem (pesquisa §4.6).
 *
 * O NÚMERO NÃO MORA AQUI. Vem de `contact.whatsapp`, que o portfólio já
 * publica. Duplicá-lo criaria duas fontes para o mesmo dado, e no dia em que
 * mudasse uma das páginas ficaria apontando para um número morto.
 */
export function urlWhatsapp(base: string, mensagem: string): string {
  return `${base}?text=${encodeURIComponent(mensagem)}`
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/unit/whatsapp.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/landing/whatsapp.ts tests/unit/whatsapp.test.ts
git commit -m "feat(landing): url do whatsapp com fonte unica de numero

O numero ja existe em contact.whatsapp e esta publico no portfolio. A
landing usa o mesmo campo com mensagem propria -- duplicar criaria duas
fontes para o mesmo dado, e uma delas ficaria morta na primeira mudanca."
```

---

## Task 5: Hero e Critério

As duas seções que ocupam os primeiros 40% da página, onde o eyetracking do NN/g mede
**65% da atenção**. É o orçamento inteiro: o que precisa ser lido por todo mundo cabe
aqui.

**Files:**
- Create: `components/landing/LandingHero.tsx`
- Create: `components/landing/Criterio.tsx`
- Create: `tests/unit/landing-topo.test.tsx`

**Interfaces:**
- Consumes: Task 3 (`dict.landing.hero`, `dict.landing.criterio`, `dict.landing.cta`),
  Task 4 (`urlWhatsapp`).
- Produces: `<LandingHero dict={dict} />`, `<Criterio dict={dict} />`.

- [ ] **Step 1: Escrever o teste que falha**

Crie `tests/unit/landing-topo.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LandingHero } from '@/components/landing/LandingHero'
import { Criterio } from '@/components/landing/Criterio'
import { pt } from '@/content/pt'

describe('LandingHero', () => {
  it('o h1 diz o que é e para quem', () => {
    render(<LandingHero dict={pt} />)
    const titulo = screen.getByRole('heading', { level: 1 })
    expect(titulo).toHaveTextContent(pt.landing.hero.titulo)
  })

  it('o CTA aponta para o whatsapp do contato, com a mensagem da landing', () => {
    render(<LandingHero dict={pt} />)
    const link = screen.getByRole('link', { name: new RegExp(pt.landing.cta.rotulo, 'i') })
    expect(link).toHaveAttribute('href', expect.stringContaining(pt.contact.whatsapp))
    expect(link).toHaveAttribute('href', expect.stringContaining('?text='))
  })

  // Spec §4.1: o piso NÃO aparece na dobra. O padrão brasileiro é publicá-lo
  // depois da prova — antes disso ele filtra sem ter convencido.
  it('não mostra preço na dobra', () => {
    const { container } = render(<LandingHero dict={pt} />)
    expect(container.textContent).not.toMatch(/R\$/)
  })

  it('a dupla aparece já na dobra', () => {
    render(<LandingHero dict={pt} />)
    expect(screen.getByText(pt.landing.hero.assinatura)).toBeInTheDocument()
  })
})

describe('Criterio', () => {
  it('apresenta os dois testes que o cliente pode aplicar sozinho', () => {
    render(<Criterio dict={pt} />)
    for (const teste of pt.landing.criterio.testes) {
      expect(screen.getByText(teste.titulo)).toBeInTheDocument()
    }
    expect(pt.landing.criterio.testes).toHaveLength(2)
  })

  // O ciano reprova em fundo claro (1,93:1). Ele só existe nas duas faixas
  // escuras, e nenhuma delas é esta.
  it('não usa o token de destaque do tema escuro', () => {
    const { container } = render(<Criterio dict={pt} />)
    expect(container.innerHTML).not.toContain('text-data')
    expect(container.innerHTML).not.toContain('bg-data')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/landing-topo.test.tsx`
Expected: FAIL — módulos não encontrados.

- [ ] **Step 3: Implementar o hero**

Crie `components/landing/LandingHero.tsx`:

```tsx
import type { Dictionary } from '@/content/types'
import { urlWhatsapp } from './whatsapp'

/**
 * Primeira dobra. Precisa passar o teste que o NN/g mostrou que a maioria dos
 * sites B2B reprova: *o que essa empresa faz, e isso é para mim?*
 *
 * Sem preço aqui, de propósito (spec §4.1). Das páginas brasileiras que
 * publicam piso, nenhuma o coloca na dobra — o piso qualifica DEPOIS de
 * convencer. Antes disso ele só filtra.
 */
export function LandingHero({ dict }: { dict: Dictionary }) {
  const { hero, cta } = dict.landing

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-20 sm:py-28">
      <div className="flex flex-col gap-5">
        <h1 className="text-balance font-sans text-4xl font-bold leading-[1.1] tracking-tight text-ink sm:text-6xl">
          {hero.titulo}
        </h1>
        <p className="max-w-2xl text-balance text-[19px] leading-relaxed text-ink-2 sm:text-xl">
          {hero.subtitulo}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <a
          href={urlWhatsapp(dict.contact.whatsapp, cta.mensagem)}
          className="inline-flex w-fit items-center gap-2 rounded-md bg-ink px-6 py-3.5 text-[17px] font-semibold text-paper transition-opacity hover:opacity-90"
        >
          {cta.rotulo}
        </a>
        {/* A DUPLA EM CORPO DE TEXTO, e não em label.
         *
         * Esta linha carrega o diferencial mais forte que a pesquisa achou: dois
         * sêniores são a única configuração que neutraliza as duas críticas do
         * mercado ao mesmo tempo — agência cobra estrutura que não escreve o
         * código, freelancer sozinho é ponto único de falha.
         *
         * A primeira versão deste plano a formatava em `font-mono text-xs
         * uppercase tracking-[0.15em]`, e a revisão da Task 5 derrubou: são onze
         * palavras e duas frases, não um label de 1–3 palavras, então caía na
         * regra dos 17px. Pior que a regra: maiúscula com tracking é o pior caso
         * de legibilidade, e 12px no celular sob sol é exatamente o que inverter
         * a polaridade tentou consertar. Mandar a frase mais diferenciadora da
         * página para corpo de rodapé é enterrá-la. */}
        <p className="max-w-xl text-[17px] leading-relaxed text-ink-2">
          {hero.assinatura}
        </p>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Implementar o critério**

Crie `components/landing/Criterio.tsx`:

```tsx
import type { Dictionary } from '@/content/types'

/**
 * A seção que carrega a página, e a que mudou mais depois da pesquisa.
 *
 * O Gartner mediu que o comprador B2B não sofre de falta de informação — 89%
 * achavam a informação boa — e mesmo assim ficava paralisado, porque as
 * informações eram CONTRADITÓRIAS entre fornecedores. O que resolve não é mais
 * argumento, é um CRITÉRIO de julgamento.
 *
 * Então esta seção não ensina o que é otimização para IA. Ela entrega dois
 * testes que o dono aplica sozinho nos três orçamentos que já vai receber. O
 * critério, convenientemente, é aquele em que a gente ganha — e o segundo
 * teste responde de graça o "meu sobrinho faz", que nenhuma página brasileira
 * analisada enfrenta.
 *
 * Isto NÃO é uma seção "apareça na IA" (spec §4.2 e D7). Virar seção própria
 * criaria dois produtos numa página só, e a demanda não formada não converte
 * assim.
 */
export function Criterio({ dict }: { dict: Dictionary }) {
  const { criterio } = dict.landing

  return (
    <section className="border-t border-rule">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-16 sm:py-24">
        <h2 className="text-balance font-sans text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl">
          {criterio.titulo}
        </h2>
        <p className="max-w-2xl text-[19px] leading-relaxed text-ink">{criterio.abertura}</p>

        <ol className="flex flex-col gap-6">
          {criterio.testes.map((teste, i) => (
            <li key={teste.titulo} className="flex gap-4 border-l-2 border-accent pl-5">
              <span aria-hidden="true" className="font-mono text-sm text-accent">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="flex flex-col gap-1.5">
                <p className="text-[17px] font-semibold text-ink">{teste.titulo}</p>
                <p className="text-[17px] leading-relaxed text-ink-2">{teste.corpo}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="flex max-w-2xl flex-col gap-4">
          {criterio.fecho.map((paragrafo) => (
            <p key={paragrafo} className="text-[17px] leading-relaxed text-ink-2">
              {paragrafo}
            </p>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run tests/unit/landing-topo.test.tsx`
Expected: PASS — 6 testes.

- [ ] **Step 6: Commit**

```bash
git add components/landing/LandingHero.tsx components/landing/Criterio.tsx tests/unit/landing-topo.test.tsx
git commit -m "feat(landing): hero e criterio -- os primeiros 40% da pagina

O eyetracking do NN/g mede 65% da atencao nos primeiros 40%. Isso torna a
regra orcamentaria e nao sequencial: o que precisa ser lido por todos cabe
aqui.

O Criterio substituiu a secao que explicava o mercado. O Gartner mediu que
o comprador nao sofre de falta de informacao, sofre de informacao
contraditoria entre fornecedores -- o que resolve e criterio de julgamento,
nao mais argumento."
```

---

## Task 6: Oferta e Dupla

`Dupla` é a **primeira faixa escura** (das duas que a página tem) e é onde os números
aparecem — vindos de `telemetry`, nunca escritos à mão.

**Files:**
- Create: `components/landing/Oferta.tsx`
- Create: `components/landing/Dupla.tsx`
- Create: `tests/unit/landing-oferta.test.tsx`

**Interfaces:**
- Consumes: Task 3 (`dict.landing.oferta`, `dict.landing.dupla`), `dict.telemetry`.
- Produces: `<Oferta dict={dict} />`, `<Dupla dict={dict} />`.

- [ ] **Step 1: Escrever o teste que falha**

Crie `tests/unit/landing-oferta.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Oferta } from '@/components/landing/Oferta'
import { Dupla } from '@/components/landing/Dupla'
import { pt } from '@/content/pt'

describe('Oferta', () => {
  it('mostra os três cartões', () => {
    render(<Oferta dict={pt} />)
    for (const cartao of pt.landing.oferta.cartoes) {
      expect(screen.getByText(cartao.nome)).toBeInTheDocument()
    }
  })
})

describe('Dupla', () => {
  it('é a faixa escura', () => {
    const { container } = render(<Dupla dict={pt} />)
    expect(container.querySelector('.bg-bg, .bg-ink')).toBeTruthy()
  })

  /**
   * A REGRA MAIS IMPORTANTE DESTE ARQUIVO.
   *
   * Os números de anos e de sistemas em produção já existem em
   * `dict.telemetry`, cada um com o campo `provenance` dizendo como foi
   * medido. Se a landing os escrevesse à mão, as duas páginas divergiriam na
   * primeira recontagem — e a página cujo argumento inteiro é honestidade
   * técnica estaria mentindo em silêncio.
   *
   * Durante a redação do spec este erro aconteceu de verdade: foi escrito
   * "3 sistemas no ar", confundindo com os três cases. O valor real é 5.
   */
  it('os números vêm da telemetria, não estão escritos no componente', () => {
    render(<Dupla dict={pt} />)
    const producao = pt.telemetry.metrics.find((m) => m.key === 'production')
    expect(producao, 'a métrica de sistemas em produção sumiu da telemetria').toBeDefined()
    expect(screen.getByText(producao!.value)).toBeInTheDocument()
  })

  it('exibe o tamanho do time como número, não como desculpa', () => {
    render(<Dupla dict={pt} />)
    expect(screen.getByText('2')).toBeInTheDocument()
    const { container } = render(<Dupla dict={pt} />)
    expect(container.textContent).not.toMatch(/apesar|pequen/i)
  })
})
```

As chaves de `telemetry.metrics` foram conferidas em `content/pt.ts` e são exatamente
`lines`, `systems`, `production` e `years`. A Task 6 usa `years` e `production`. O tipo é
`MetricValue = { key, label, value, provenance }` — o `value` é **string** (`'10+'`,
`'250.000+'`), não número, então não formate nem faça conta com ele.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/landing-oferta.test.tsx`
Expected: FAIL — módulos não encontrados.

- [ ] **Step 3: Implementar a oferta**

Crie `components/landing/Oferta.tsx`:

```tsx
import type { Dictionary } from '@/content/types'

/**
 * Três cartões, e o que os costura é o padrão de construção, não o artefato —
 * sem essa costura a página vira "faço de tudo", que é o posicionamento mais
 * fraco possível.
 *
 * Cada cartão traduz a prova técnica em consequência de negócio. O dono lê a
 * consequência; o termo técnico, quando aparece, vem depois e explica. Um dono
 * de empresa não processa "Core Web Vitals" pela rota que avalia argumento —
 * ele degrada a sinal periférico, e desperdiça o único ativo de prova que a
 * página tem.
 *
 * Borda de 1px em vez de sombra: é o que lê como premium técnico em 2026.
 */
export function Oferta({ dict }: { dict: Dictionary }) {
  const { oferta } = dict.landing

  return (
    <section className="border-t border-rule">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-16 sm:py-24">
        <h2 className="font-sans text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          {oferta.titulo}
        </h2>
        <ul className="grid gap-px overflow-hidden rounded-lg border border-rule bg-rule sm:grid-cols-3">
          {oferta.cartoes.map((cartao) => (
            <li key={cartao.nome} className="flex flex-col gap-3 bg-paper p-6">
              <h3 className="font-mono text-xs uppercase tracking-[0.15em] text-accent">
                {cartao.nome}
              </h3>
              <p className="text-[17px] leading-relaxed text-ink-2">{cartao.corpo}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Implementar a dupla**

Crie `components/landing/Dupla.tsx`:

```tsx
import type { Dictionary } from '@/content/types'

/**
 * PRIMEIRA das duas faixas escuras da página (a outra é LandingCta). É aqui
 * que o ciano volta ao ambiente em que passa AA — sobre `#08090C` ele dá
 * 9,29:1; sobre o papel claro daria 1,93:1 e reprovaria.
 *
 * O argumento é o achado da pesquisa que nenhuma página brasileira faz. O
 * mercado dispara duas críticas: agência cobra estrutura que não escreve o
 * código, e freelancer é ponto único de falha. Uma dupla de dois sêniores é a
 * única configuração que neutraliza AS DUAS ao mesmo tempo.
 *
 * A estrutura é de negação ("sem gerente, sem estagiário, sem terceirização")
 * porque dizer o que não se faz é mais crível que adjetivo — tem custo, exclui
 * trabalho.
 *
 * OS NÚMEROS VÊM DA TELEMETRIA, que já carrega `provenance` dizendo como cada
 * um foi medido. Escrevê-los aqui faria as duas páginas divergirem na primeira
 * recontagem.
 */
export function Dupla({ dict }: { dict: Dictionary }) {
  const { dupla } = dict.landing

  // As chaves são as mesmas que a seção Telemetria do portfólio já usa.
  const daTelemetria = ['years', 'production']
    .map((key) => dict.telemetry.metrics.find((m) => m.key === key))
    .filter((m): m is NonNullable<typeof m> => Boolean(m))
    .map((m) => ({ valor: m.value, rotulo: m.label.toLowerCase() }))

  const numeros = [...dupla.numeros, ...daTelemetria]

  return (
    <section className="bg-ink text-paper">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-16 sm:py-24">
        <h2 className="font-sans text-3xl font-bold tracking-tight sm:text-4xl">
          {dupla.titulo}
        </h2>
        <div className="flex max-w-2xl flex-col gap-4">
          {dupla.corpo.map((paragrafo) => (
            <p key={paragrafo} className="text-[17px] leading-relaxed text-muted">
              {paragrafo}
            </p>
          ))}
        </div>
        <dl className="flex flex-wrap gap-x-10 gap-y-5 border-t border-border pt-7">
          {numeros.map((n) => (
            <div key={n.rotulo} className="flex flex-col gap-1">
              <dt className="sr-only">{n.rotulo}</dt>
              <dd className="font-mono text-3xl font-bold text-data">{n.valor}</dd>
              <p aria-hidden="true" className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted">
                {n.rotulo}
              </p>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run tests/unit/landing-oferta.test.tsx`
Expected: PASS — 4 testes.

- [ ] **Step 6: Commit**

```bash
git add components/landing/Oferta.tsx components/landing/Dupla.tsx tests/unit/landing-oferta.test.tsx
git commit -m "feat(landing): oferta e a faixa escura da dupla

A dupla e o argumento que nenhuma pagina brasileira faz: agencia cobra
estrutura que nao escreve o codigo, freelancer e ponto unico de falha, e
dois seniores neutralizam as duas objecoes ao mesmo tempo.

Os numeros vem da telemetria, que ja carrega o campo provenance. Escreve-los
a mao faria as duas paginas divergirem na primeira recontagem -- erro que
aconteceu de verdade na redacao do spec ('3 sistemas no ar' quando sao 5)."
```

---

## Task 7: Prova

Depoimento é **sinal barato** — qualquer um escreve, e o comprador sabe. O que vale é
sinal caro e verificável. Reaproveita os cases que já existem; não duplica nenhum.

**Files:**
- Create: `components/landing/Prova.tsx`
- Create: `tests/unit/landing-prova.test.tsx`

**Interfaces:**
- Consumes: Task 3 (`dict.landing.prova`), `content/systems.ts`, `dict.systems.detail`.
- Produces: `<Prova dict={dict} locale={locale} />`.

- [ ] **Step 1: Escrever o teste que falha**

Crie `tests/unit/landing-prova.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Prova } from '@/components/landing/Prova'
import { pt } from '@/content/pt'
import { SYSTEM_SLUGS } from '@/content/types'

describe('Prova', () => {
  it('lista os três sistemas que já existem, sem duplicar conteúdo', () => {
    render(<Prova dict={pt} locale="pt" />)
    for (const slug of SYSTEM_SLUGS) {
      expect(screen.getByText(pt.systems.detail[slug].name)).toBeInTheDocument()
    }
  })

  it('cada card leva ao case completo, com o basePath do projeto', () => {
    render(<Prova dict={pt} locale="pt" />)
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(SYSTEM_SLUGS.length)
    for (const link of links) {
      expect(link).toHaveAttribute('href', expect.stringContaining('/pt/sistemas/'))
    }
  })

  // Erro clássico de dev vendendo para não-dev, observado na pesquisa: provar
  // competência técnica e esquecer de provar resultado. Uma das páginas
  // analisadas estampa "Lighthouse 95+" para um público que não avalia isso.
  it('mostra o resultado de negócio, não a métrica de ferramenta', () => {
    const { container } = render(<Prova dict={pt} locale="pt" />)
    expect(container.textContent).not.toMatch(/lighthouse/i)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/landing-prova.test.tsx`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementar**

Crie `components/landing/Prova.tsx`:

```tsx
import Link from 'next/link'
import type { Dictionary, Locale } from '@/content/types'
import { SYSTEM_SLUGS } from '@/content/types'

/**
 * Depoimento é SINAL BARATO — qualquer um escreve um, e o comprador sabe
 * disso. Não ter depoimento é menos grave do que parece: o teto de
 * credibilidade dele já é baixo.
 *
 * Software sob medida vendido a dono não técnico é um *credence good*: ele não
 * consegue avaliar a qualidade nem depois de consumir. Sob essa assimetria o
 * que funciona é sinal CARO e verificável — e na lista do que de fato
 * influencia decisão de compra (TrustRadius, 1.862 compradores), demonstração
 * vem ACIMA de avaliação de terceiros.
 *
 * Daí as duas camadas: a própria página como demonstração conferível, e os
 * cases com número E metodologia declarada. Número sem metodologia lê como
 * marketing; número com ressalva lê como engenheiro.
 *
 * Consome os cases que já existem. Não duplica case nenhum — se duplicasse,
 * divergiriam.
 */
export function Prova({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const { prova } = dict.landing

  return (
    <section className="border-t border-rule">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-16 sm:py-24">
        <div className="flex flex-col gap-3">
          <h2 className="font-sans text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {prova.titulo}
          </h2>
          <p className="max-w-2xl text-[17px] leading-relaxed text-ink-2">{prova.lead}</p>
        </div>

        <ul className="flex flex-col gap-px overflow-hidden rounded-lg border border-rule bg-rule">
          {SYSTEM_SLUGS.map((slug) => {
            const caso = dict.systems.detail[slug]
            return (
              <li key={slug} className="bg-paper">
                <Link
                  href={`/${locale}/sistemas/${slug}`}
                  className="flex flex-col gap-2 p-6 transition-colors hover:bg-rule/30"
                >
                  <h3 className="text-[17px] font-semibold text-ink">{caso.name}</h3>
                  <p className="text-[17px] leading-relaxed text-ink-2">{caso.outcome}</p>
                  {/* 17px, não `text-xs`: "Ver o caso completo" tem quatro
                   * palavras e não cabe na exceção de label de 1–3. Mesma
                   * classe de defeito que custou uma rodada de correção na
                   * Task 5 — o padrão de título de cartão do `Oferta` foi
                   * copiado sem recontar as palavras. */}
                  <span className="text-[17px] font-semibold text-accent">
                    {prova.verCase}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/unit/landing-prova.test.tsx`
Expected: PASS — 3 testes.

- [ ] **Step 5: Commit**

```bash
git add components/landing/Prova.tsx tests/unit/landing-prova.test.tsx
git commit -m "feat(landing): prova por demonstracao, nao por depoimento

Depoimento e sinal barato -- qualquer um escreve e o comprador sabe.
Software sob medida vendido a dono nao tecnico e credence good: ele nao
avalia a qualidade nem depois de consumir. Sob essa assimetria vale sinal
caro e verificavel, e demonstracao supera avaliacao de terceiros na lista
do que influencia decisao.

Consome os cases que ja existem, sem duplicar."
```

---

## Task 8: Piso de preço, que some quando vazio

Única decisão da pesquisa com evidência direta de que move resultado: o NN/g **observou
participantes abandonarem o site** por falta de preço, e o TrustRadius aponta preço
transparente como desejo nº 1 por quatro anos.

O campo é nulo até o dono decidir. A seção precisa desaparecer sem deixar buraco.

**Files:**
- Create: `components/landing/Piso.tsx`
- Create: `tests/unit/landing-piso.test.tsx`

**Interfaces:**
- Consumes: Task 3 (`dict.landing.piso`, que é `{ valor, nota } | null`).
- Produces: `<Piso dict={dict} />`, que renderiza `null` quando não há valor.

- [ ] **Step 1: Escrever o teste que falha**

Crie `tests/unit/landing-piso.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Piso } from '@/components/landing/Piso'
import { pt } from '@/content/pt'
import type { Dictionary } from '@/content/types'

function comPiso(piso: Dictionary['landing']['piso']): Dictionary {
  return { ...pt, landing: { ...pt.landing, piso } }
}

describe('Piso', () => {
  // É isto que permite publicar a página antes de o valor estar decidido.
  it('não renderiza nada quando o piso é nulo', () => {
    const { container } = render(<Piso dict={comPiso(null)} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('mostra valor e nota quando o piso existe', () => {
    const piso = { valor: 'A partir de R$ 4.000', nota: 'O valor final depende do escopo.' }
    const { container } = render(<Piso dict={comPiso(piso)} />)
    expect(container.textContent).toContain(piso.valor)
    expect(container.textContent).toContain(piso.nota)
  })

  // String em branco é o mesmo que não ter valor. Sem o `trim()` no
  // componente, um espaço acidental no dicionário renderizaria uma seção
  // vazia com padding — pior que a ausência.
  it('não renderiza com valor em branco', () => {
    const { container } = render(<Piso dict={comPiso({ valor: '   ', nota: 'x' })} />)
    expect(container).toBeEmptyDOMElement()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/landing-piso.test.tsx`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementar**

Crie `components/landing/Piso.tsx`:

```tsx
import type { Dictionary } from '@/content/types'

/**
 * Piso de preço — a ÚNICA decisão desta página com evidência direta de que
 * move resultado.
 *
 * O NN/g descreve a ausência de preço como "o elemento mais hostil ao usuário
 * da maioria dos sites B2B" e OBSERVOU participantes abandonarem o site e ir
 * para o concorrente por causa disso. O TrustRadius aponta preço transparente
 * como desejo número 1 dos compradores por quatro anos seguidos.
 *
 * Contrapeso honesto: nenhuma das páginas brasileiras de referência publica
 * piso de projeto. Mas seguir o mercado aqui é fazer o que as páginas fracas
 * também fazem.
 *
 * POSIÇÃO: depois da prova, antes do CTA final. Das páginas brasileiras que
 * publicam piso, nenhuma o coloca no hero — ele qualifica depois de convencer.
 *
 * NULO ENQUANTO O DONO NÃO DECIDIR O VALOR. Não é descuido: é o que permite a
 * página ir ao ar sem um número inventado. Publicar valor errado é pior que
 * não publicar.
 */
export function Piso({ dict }: { dict: Dictionary }) {
  const { piso } = dict.landing
  if (!piso || piso.valor.trim() === '') return null

  return (
    <section className="border-t border-rule">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-2 px-6 py-12">
        <p className="font-sans text-2xl font-bold tracking-tight text-ink">{piso.valor}</p>
        <p className="text-[17px] leading-relaxed text-ink-2">{piso.nota}</p>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/unit/landing-piso.test.tsx`
Expected: PASS — 3 testes.

- [ ] **Step 5: Commit**

```bash
git add components/landing/Piso.tsx tests/unit/landing-piso.test.tsx
git commit -m "feat(landing): piso de preco que some quando nao ha valor

Unica decisao da pesquisa com evidencia direta de que move resultado: o
NN/g observou participantes abandonarem site por falta de preco, e o
TrustRadius aponta preco transparente como desejo n1 por 4 anos.

Nulo enquanto o dono nao decidir o valor -- publicar numero inventado numa
pagina cujo argumento e honestidade tecnica seria pior que nao publicar."
```

---

## Task 9: Fechamento, perguntas e a barra fixa do celular

A segunda faixa escura, o FAQ que cobre objeções previsíveis, e a barra de CTA do
celular — que **não** é a bolha verde flutuante.

**Files:**
- Create: `components/landing/LandingCta.tsx`
- Create: `components/landing/Perguntas.tsx`
- Create: `components/landing/BarraCta.tsx`
- Create: `tests/unit/landing-fechamento.test.tsx`

**Interfaces:**
- Consumes: Task 3, Task 4 (`urlWhatsapp`).
- Produces: `<LandingCta dict={dict} />`, `<Perguntas dict={dict} />`,
  `<BarraCta dict={dict} />`.

- [ ] **Step 1: Escrever o teste que falha**

Crie `tests/unit/landing-fechamento.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LandingCta } from '@/components/landing/LandingCta'
import { Perguntas } from '@/components/landing/Perguntas'
import { BarraCta } from '@/components/landing/BarraCta'
import { pt } from '@/content/pt'

describe('LandingCta', () => {
  it('é a segunda faixa escura e leva ao mesmo destino', () => {
    const { container } = render(<LandingCta dict={pt} />)
    expect(container.querySelector('.bg-ink')).toBeTruthy()
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', expect.stringContaining(pt.contact.whatsapp))
  })

  // O medo de quem clica não é o preço, é ser perseguido por vendedor.
  it('diz o que acontece do outro lado', () => {
    render(<LandingCta dict={pt} />)
    expect(screen.getByText(pt.landing.cta.tranquilizador)).toBeInTheDocument()
  })
})

describe('Perguntas', () => {
  it('responde a objeção que o visitante não verbalizou', () => {
    render(<Perguntas dict={pt} />)
    for (const item of pt.landing.perguntas.itens) {
      expect(screen.getByText(item.pergunta)).toBeInTheDocument()
    }
  })
})

describe('BarraCta', () => {
  /**
   * NÃO É A BOLHA VERDE FLUTUANTE, e a evidência inverte o senso comum: o que
   * defende a bolha vem de fornecedor de widget, e o que a condena vem de
   * pesquisa independente. O Baymard documenta que ela cobre o conteúdo que a
   * pessoa está tentando ler no celular, e o NN/g registrou participantes
   * IGNORANDO COMPLETAMENTE um botão de chat flutuante em posição inesperada.
   */
  it('é barra de largura total, não bolha redonda', () => {
    const { container } = render(<BarraCta dict={pt} />)
    const barra = container.firstElementChild
    expect(barra?.className).toContain('inset-x-0')
    expect(barra?.className).not.toContain('rounded-full')
  })

  it('some no desktop, onde o CTA inline já existe', () => {
    const { container } = render(<BarraCta dict={pt} />)
    expect(container.firstElementChild?.className).toContain('md:hidden')
  })

  // O verde saturado do WhatsApp dá 1,79:1 sobre o papel — reprova — e é o
  // marcador visual de widget genérico de construtor de página.
  it('não usa o verde do WhatsApp como cor de fundo', () => {
    const { container } = render(<BarraCta dict={pt} />)
    expect(container.innerHTML).not.toContain('#25D366')
    expect(container.innerHTML).not.toContain('25d366')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/landing-fechamento.test.tsx`
Expected: FAIL — módulos não encontrados.

- [ ] **Step 3: Implementar o fechamento**

Crie `components/landing/LandingCta.tsx`:

```tsx
import type { Dictionary } from '@/content/types'
import { urlWhatsapp } from './whatsapp'

/**
 * SEGUNDA e última faixa escura da página.
 *
 * O microtexto sob o botão não é enfeite. O medo de quem clica num CTA de
 * serviço não é o preço — é ser perseguido por vendedor. Dizer o que acontece
 * do outro lado provavelmente faz mais pelo clique do que a palavra escolhida
 * para o botão, sobre a qual, aliás, não existe evidência: a literatura
 * inteira de texto de CTA se apoia num único teste de 2013 jamais replicado.
 */
export function LandingCta({ dict }: { dict: Dictionary }) {
  const { fechamento, cta } = dict.landing

  return (
    <section className="bg-ink text-paper">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-20 sm:py-24">
        <div className="flex flex-col gap-3">
          <h2 className="font-sans text-3xl font-bold tracking-tight sm:text-4xl">
            {fechamento.titulo}
          </h2>
          <p className="max-w-xl text-[19px] leading-relaxed text-muted">{fechamento.corpo}</p>
        </div>
        <div className="flex flex-col gap-3">
          <a
            href={urlWhatsapp(dict.contact.whatsapp, cta.mensagem)}
            className="inline-flex w-fit items-center gap-2 rounded-md bg-paper px-6 py-3.5 text-[17px] font-semibold text-ink transition-opacity hover:opacity-90"
          >
            {cta.rotulo}
          </a>
          {/* Corpo, não label — "Sem ligação e sem cadastro." tem cinco
           * palavras. Terceira vez que este mesmo defeito apareceu no plano
           * (ver Task 5 e Task 7): o padrão de label mono do portfólio foi
           * copiado sem recontar as palavras. E aqui doeria mais: esta linha
           * existe justamente para desarmar o medo de ser perseguido por
           * vendedor, então precisa ser lida, não decorada. */}
          <p className="text-[17px] leading-relaxed text-muted">
            {cta.tranquilizador}
          </p>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Implementar as perguntas**

Crie `components/landing/Perguntas.tsx`:

```tsx
import type { Dictionary } from '@/content/types'

/**
 * Curta, no fim, para o subconjunto que já se engajou — coerente com o
 * orçamento de atenção (65% nos primeiros 40%).
 *
 * Cobre objeções previsíveis, e a primeira é a que mais importa: "e se um de
 * vocês ficar indisponível?". Responder objeção que o visitante ainda não
 * verbalizou é exatamente o que produz sensação de solidez — e é a única
 * fraqueza real do formato de dupla.
 *
 * `<details>` nativo em vez de acordeão em JavaScript: o conteúdo fica no HTML
 * mesmo fechado, que é o que os crawlers de IA leem, e o teclado funciona sem
 * escrever uma linha de comportamento.
 */
export function Perguntas({ dict }: { dict: Dictionary }) {
  const { perguntas } = dict.landing

  return (
    <section className="border-t border-rule">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-16">
        <h2 className="font-sans text-2xl font-bold tracking-tight text-ink">
          {perguntas.titulo}
        </h2>
        <div className="flex flex-col">
          {perguntas.itens.map((item) => (
            <details key={item.pergunta} className="group border-b border-rule py-4">
              <summary className="cursor-pointer list-none text-[17px] font-semibold text-ink marker:content-none">
                {item.pergunta}
              </summary>
              <p className="pt-3 text-[17px] leading-relaxed text-ink-2">{item.resposta}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 5: Implementar a barra fixa**

Crie `components/landing/BarraCta.tsx`:

```tsx
import type { Dictionary } from '@/content/types'
import { urlWhatsapp } from './whatsapp'

/**
 * Barra fixa de rodapé, SÓ NO CELULAR — e deliberadamente não é a bolha verde
 * redonda que quase todo site de PME brasileira usa.
 *
 * A evidência inverte o senso comum aqui. O que defende a bolha vem todo de
 * fornecedor de widget, sem metodologia publicada. O que a condena vem de
 * pesquisa independente: o Baymard documenta que ela é percebida como
 * disruptiva, especialmente no celular, ONDE COBRE O CONTEÚDO que a pessoa
 * está tentando ler; e o NN/g registrou participantes ignorando completamente
 * um botão de chat flutuante que estava em posição inesperada.
 *
 * `pb-[4.5rem]` no conteúdo da página (ver page.tsx) existe para a barra não
 * cobrir o último bloco — que é exatamente o defeito documentado.
 *
 * Sem o verde `#25D366`: ele dá 1,79:1 sobre o papel, reprova, e é o marcador
 * visual de widget de construtor de página. Numa página que precisa sustentar
 * um piso de preço, ele trabalha contra.
 *
 * `min-h-12` são os 48px de alvo mínimo, na zona do polegar.
 *
 * TESTAR NO SAFARI DO IPHONE e dentro do navegador embutido do Instagram:
 * `position: fixed` tem histórico de deslocamento no iOS quando a barra de
 * endereço recolhe, e o navegador do Instagram tem viewport menor com barra
 * própria disputando o mesmo espaço.
 */
export function BarraCta({ dict }: { dict: Dictionary }) {
  const { cta } = dict.landing

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-rule bg-paper/95 p-3 backdrop-blur md:hidden">
      <a
        href={urlWhatsapp(dict.contact.whatsapp, cta.mensagem)}
        className="flex min-h-12 w-full items-center justify-center rounded-md bg-ink px-5 text-[17px] font-semibold text-paper"
      >
        {cta.rotulo}
      </a>
    </div>
  )
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx vitest run tests/unit/landing-fechamento.test.tsx`
Expected: PASS — 6 testes.

- [ ] **Step 7: Commit**

```bash
git add components/landing/LandingCta.tsx components/landing/Perguntas.tsx components/landing/BarraCta.tsx tests/unit/landing-fechamento.test.tsx
git commit -m "feat(landing): fechamento, perguntas e barra fixa do celular

A barra NAO e a bolha verde flutuante, e a evidencia inverte o senso comum:
o que defende a bolha vem de fornecedor de widget, o que a condena vem de
pesquisa independente. O Baymard documenta que ela cobre o conteudo no
celular; o NN/g registrou gente ignorando completamente botao de chat
flutuante em posicao inesperada.

O microtexto sob o CTA existe porque o medo de quem clica nao e o preco,
e ser perseguido por vendedor."
```

---

## Task 10: Montar a página, metadata e sitemap

Junta tudo e coloca a rota no sitemap — sem isso ela nasce invisível para buscador.

**Files:**
- Modify: `app/[locale]/projetos/page.tsx` (substitui o esboço da Task 2)
- Modify: `scripts/generate-seo-files.mts:40`
- Modify: `tests/e2e/landing.spec.ts`

**Interfaces:**
- Consumes: Tasks 5–9.
- Produces: a rota completa, presente no sitemap.

- [ ] **Step 1: Escrever o teste que falha**

Acrescente a `tests/e2e/landing.spec.ts`:

```ts
test('a landing está no sitemap, nos dois idiomas', () => {
  const sitemap = readFileSync(join(OUT, 'sitemap.xml'), 'utf8')
  for (const locale of locales) {
    expect(sitemap).toContain(`/${locale}/projetos/`)
  }
})

test('a barra fixa do celular não cobre o último bloco', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/pt/projetos/')
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))

  const sobreposto = await page.evaluate(() => {
    const barra = document.querySelector('a[href*="wa.me"]')?.closest('div.fixed')
    const ultimo = document.querySelector('main > :last-child')
    if (!barra || !ultimo) return null
    const b = barra.getBoundingClientRect()
    const u = ultimo.getBoundingClientRect()
    return u.bottom > b.top
  })
  expect(sobreposto, 'a barra cobre o fim do conteúdo').toBe(false)
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm run build && npx playwright test tests/e2e/landing.spec.ts`
Expected: FAIL — a rota não está no sitemap.

- [ ] **Step 3: Montar a página**

Substitua `app/[locale]/projetos/page.tsx` inteiro:

```tsx
import type { Metadata } from 'next'
import { getDictionary, locales, type Locale } from '@/content'
import { canonical } from '@/lib/seo'
import { LandingHero } from '@/components/landing/LandingHero'
import { Criterio } from '@/components/landing/Criterio'
import { Oferta } from '@/components/landing/Oferta'
import { Dupla } from '@/components/landing/Dupla'
import { Prova } from '@/components/landing/Prova'
import { Piso } from '@/components/landing/Piso'
import { LandingCta } from '@/components/landing/LandingCta'
import { Perguntas } from '@/components/landing/Perguntas'
import { BarraCta } from '@/components/landing/BarraCta'

export const dynamicParams = false

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
  const { locale } = await params
  const dict = getDictionary(locale)
  return {
    title: dict.landing.meta.title,
    description: dict.landing.meta.description,
    alternates: canonical(locale, '/projetos'),
  }
}

/**
 * ORDEM DAS SEÇÕES. Não existe teste A/B publicado sobre ordem em landing B2B
 * de ticket alto — quem afirmar o contrário está apresentando gosto pessoal.
 * Esta ordem também é escolha, e vem de duas coisas: o orçamento de atenção
 * medido pelo NN/g (65% nos primeiros 40%, o que torna a regra orçamentária e
 * não sequencial) e o padrão observado nas páginas brasileiras que funcionam
 * — problema, método, prova, preço, CTA.
 *
 * O `pb-20 md:pb-0` existe para a barra fixa do celular não cobrir o último
 * bloco. É exatamente o defeito que o Baymard documenta nas bolhas de chat.
 */
export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params
  const dict = getDictionary(locale)

  return (
    <div className="pb-20 md:pb-0">
      <LandingHero dict={dict} />
      <Criterio dict={dict} />
      <Oferta dict={dict} />
      <Dupla dict={dict} />
      <Prova dict={dict} locale={locale} />
      <Piso dict={dict} />
      <LandingCta dict={dict} />
      <Perguntas dict={dict} />
      <BarraCta dict={dict} />
    </div>
  )
}
```

> **Atenção do implementador:** confirme o nome real do helper de canonical em
> `lib/seo.ts` antes de importar. Se a assinatura for outra, use a mesma forma que
> `app/[locale]/(site)/sistemas/[slug]/page.tsx` já usa — não invente uma nova.

- [ ] **Step 4: Colocar no sitemap**

Em `scripts/generate-seo-files.mts`, substitua a linha 40:

```ts
// Rotas públicas: home, os 3 case studies e a landing de captação, nos dois
// idiomas. `/cv` e `/og` são artefato de build (noindex, sem link de
// navegação, spec §5.2) e nunca entram aqui.
const PATHS: string[] = ['', '/projetos', ...SYSTEM_SLUGS.map((slug) => `/sistemas/${slug}`)]
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npm run build && npx playwright test tests/e2e/landing.spec.ts`
Expected: PASS — 5 testes.

- [ ] **Step 6: Commit**

```bash
git add "app/[locale]/projetos/page.tsx" scripts/generate-seo-files.mts tests/e2e/landing.spec.ts
git commit -m "feat(landing): monta a pagina e coloca a rota no sitemap

Sem entrar em PATHS a rota nasce invisivel para buscador e fora do
llms.txt.

Nao existe teste A/B publicado sobre ordem de secoes em landing B2B de
ticket alto. Esta ordem e escolha declarada, vinda do orcamento de atencao
medido pelo NN/g e do padrao das paginas brasileiras que funcionam."
```

---

## Task 11: Portão de GEO para a landing

A página inteira promete que a IA consegue ler o site. Ela precisa ser verificada
exatamente nisso — senão a promessa é uma afirmação sobre si mesma que ninguém conferiu.

**Files:**
- Modify: `tests/static-html.test.ts`

**Interfaces:**
- Consumes: Task 10 (rota construída em `out/`).
- Produces: nada — é portão.

- [ ] **Step 1: Escrever o teste que falha**

Acrescente a `tests/static-html.test.ts`, dentro do laço `for (const locale of locales)`
já existente. Reaproveite os helpers `html()` e `semScripts()` do próprio arquivo — eles
já resolvem a armadilha do payload de hidratação e do escape de HTML do React.

```ts
    describe(`/${locale}/projetos (landing de captação)`, () => {
      const dict = locale === 'pt' ? pt : en

      // A página inteira promete que a IA consegue ler o site. Se o argumento
      // dela só existir depois do JavaScript rodar, a promessa é falsa sobre a
      // própria página — e um crawler de IA leria exatamente nada.
      it('o argumento está no HTML estático, fora de <script>', () => {
        const visivel = semScripts(html(`${locale}/projetos`))
        expect(visivel).toContain(escapar(dict.landing.hero.titulo))
        expect(visivel).toContain(escapar(dict.landing.criterio.titulo))
        for (const teste of dict.landing.criterio.testes) {
          expect(visivel).toContain(escapar(teste.titulo))
        }
      })

      it('o CTA existe no HTML estático e aponta para o WhatsApp', () => {
        const visivel = semScripts(html(`${locale}/projetos`))
        expect(visivel).toContain(escapar(dict.landing.cta.rotulo))
        expect(visivel).toContain(dict.contact.whatsapp)
      })

      // Regra do spec §10.8, verificada no HTML entregue e não só no
      // dicionário: um componente poderia escrever o termo à mão.
      it('não usa o vocabulário descartado pela pesquisa', () => {
        const visivel = semScripts(html(`${locale}/projetos`)).toLowerCase()
        expect(visivel).not.toContain('llms.txt')
        expect(visivel).not.toContain('ai overview')
      })
    })
```

> **Atenção do implementador:** o arquivo já tem uma função de escape para o HTML do
> React (o comentário no topo explica por quê: `"não sei"` sai como `&quot;não sei&quot;`).
> Use a que existe, com o nome que ela tem. `escapar` acima é um apelido — troque pelo
> nome real.

- [ ] **Step 2: Rodar e ver falhar (ou passar por acidente)**

Run: `npm run build && npm run test:html`

> **Não use `npx vitest run tests/static-html.test.ts`.** O `vitest.config.ts`
> exclui este arquivo de propósito — ele precisa de `out/` construído, e roda por
> `vitest.html.config.ts`. O comando direto **não roda teste nenhum e sai com
> sucesso**, que é o pior resultado possível num passo cujo objetivo é justamente
> ver o teste falhar.

Se passar de primeira, **verifique que o teste realmente fecha**: comente o
`<Criterio />` em `page.tsx`, rode de novo e confirme que quebra. Descomente. Um teste que
não falha quando o defeito existe não está protegendo nada — este projeto já teve dois
testes passando por acidente.

- [ ] **Step 3: Commit**

```bash
git add tests/static-html.test.ts
git commit -m "test(landing): portao de GEO na rota de captacao

A pagina promete que a IA consegue ler o site. Verificar isso nela mesma
nao e formalidade: se o argumento so existir depois do JavaScript rodar, a
promessa e falsa sobre a propria pagina.

Confirmado que o teste fecha, removendo a secao e vendo quebrar."
```

---

## Task 12: Fim da deriva na lista de slugs de OG

Achado durante o reconhecimento, e é do mesmo tipo já corrigido duas vezes neste projeto:
teste que passa por acidente. A rota deriva os alvos de `SYSTEM_SLUGS`; o script mantém a
própria lista escrita à mão. Nenhum teste compara as duas.

**Files:**
- Modify: `app/[locale]/og/[slug]/page.tsx` (exportar a lista)
- Modify: `scripts/generate-og.mts:28`
- Create: `tests/unit/og-slugs.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `OG_SLUGS` exportado de `app/[locale]/og/[slug]/page.tsx`.

- [ ] **Step 1: Escrever o teste que falha**

Crie `tests/unit/og-slugs.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { OG_SLUGS } from '@/app/[locale]/og/[slug]/page'

/**
 * A rota de OG deriva os alvos de SYSTEM_SLUGS; o script que fotografa os
 * cards mantinha a própria lista, escrita à mão. As duas coincidiam por sorte.
 *
 * No dia em que divergissem, a rota geraria a página, o script não tiraria a
 * foto, a metadata apontaria para um PNG inexistente — e a suíte ficaria
 * verde, porque ninguém comparava as duas listas.
 */
describe('lista de slugs de OG', () => {
  it('o script não mantém uma segunda cópia da lista', () => {
    const script = readFileSync(join(process.cwd(), 'scripts', 'generate-og.mts'), 'utf8')
    expect(
      script,
      'generate-og.mts voltou a escrever a lista à mão em vez de importá-la',
    ).not.toMatch(/const SLUGS\s*=\s*\[\s*'/)
  })

  it('inclui a home, os sistemas e a landing', () => {
    expect(OG_SLUGS).toContain('home')
    expect(OG_SLUGS).toContain('projetos')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/og-slugs.test.ts`
Expected: FAIL nos dois — `OG_SLUGS` não é exportado, e o script ainda tem a lista.

- [ ] **Step 3: Exportar a lista e incluir a landing**

Em `app/[locale]/og/[slug]/page.tsx`, troque a declaração de `OG_SLUGS`:

```ts
// `home`, os 3 sistemas e a landing de captação. EXPORTADO de propósito:
// scripts/generate-og.mts consome esta lista em vez de manter uma cópia.
// Antes ele repetia os slugs à mão, e nada comparava as duas — quando
// divergissem, a metadata apontaria para um PNG que não existe e a suíte
// continuaria verde. Ver tests/unit/og-slugs.test.ts.
export const OG_SLUGS = ['home', 'projetos', ...SYSTEM_SLUGS] as const
```

- [ ] **Step 4: Fazer o script consumir a lista**

Em `scripts/generate-og.mts`, substitua a linha 28:

```ts
// Importado da rota, NÃO repetido aqui: as duas listas precisam ser a mesma
// coisa, e antes eram duas coisas que coincidiam por sorte.
import { OG_SLUGS } from '../app/[locale]/og/[slug]/page.tsx'

const SLUGS = OG_SLUGS
```

> **Atenção do implementador:** o script roda com `node --experimental-strip-types` e o
> caminho tem colchetes. Se a importação direta falhar, a alternativa é mover a lista
> para `content/og.ts` e importar dos dois lados — o objetivo é **uma fonte só**, não o
> caminho específico. Ajuste o teste do Step 1 junto se mudar de arquivo.

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run tests/unit/og-slugs.test.ts && npm run build && npm run generate:og`
Expected: PASS, e os PNGs da landing aparecem em `public/og/`.

- [ ] **Step 6: Commit**

```bash
git add "app/[locale]/og/[slug]/page.tsx" scripts/generate-og.mts tests/unit/og-slugs.test.ts
git commit -m "fix(og): uma fonte so para a lista de slugs

A rota derivava de SYSTEM_SLUGS e o script mantinha copia escrita a mao.
Coincidiam por sorte. No dia em que divergissem, a rota geraria a pagina, o
script nao tiraria a foto, a metadata apontaria para um PNG inexistente --
e a suite ficaria verde, porque nada comparava as duas listas.

Mesmo tipo de defeito ja corrigido duas vezes neste projeto."
```

---

## Task 13: Verificação final e link a partir do portfólio

Última tarefa: a suíte inteira, a verificação manual que nenhum teste automatizado cobre,
e a única ponte entre as duas páginas.

**Files:**
- Modify: `components/sections/Contact.tsx`
- Modify: `content/types.ts`, `content/pt.ts`, `content/en.ts` (uma chave)

- [ ] **Step 1: Acrescentar a chave do link**

Em `content/types.ts`, dentro de `contact:`:

```ts
    /**
     * Link para a landing de captação. UM lugar só, e não no menu: "Projetos"
     * ao lado de "Sistemas" confunde, e o menu é justamente onde as duas
     * mensagens se atrapalhariam — o portfólio fala com recrutador, a landing
     * com dono de empresa.
     */
    landingLink: string
```

Em `content/pt.ts`, dentro de `contact:`:

```ts
    landingLink: 'Procurando alguém para construir? Veja como eu trabalho com projeto.',
```

Em `content/en.ts`:

```ts
    landingLink: 'Looking for someone to build it? See how I work on projects.',
```

- [ ] **Step 2: Usar no Contato**

Em `components/sections/Contact.tsx`, acrescente ao fim da seção um link discreto para
`/${locale}/projetos`, usando `dict.contact.landingLink` como texto. Siga o padrão de
link que o arquivo já usa — não introduza estilo novo.

- [ ] **Step 3: Rodar a suíte inteira**

```bash
npm run typecheck && npm run lint && npm run test && npm run build && npm run test:html && npx playwright test
```

Expected: tudo verde. Se algo falhar, **conserte antes de seguir** — não registre como
pendência.

- [ ] **Step 4: Verificação manual, que nenhum teste cobre**

Estas três estão no spec §5.4 e não têm como ser automatizadas aqui:

1. **Safari do iPhone** — `position: fixed` tem histórico de deslocamento quando a barra
   de endereço recolhe. Rolar a página inteira e confirmar que a barra não treme nem
   descola.
2. **Navegador embutido do Instagram** — abrir o link de dentro do app. O viewport é
   menor e a barra do Instagram disputa espaço com a nossa.
3. **Celular sob luz forte** — a razão de a polaridade ter sido invertida. Conferir que o
   texto secundário (`#4A505A`) continua legível.

Anote o resultado dos três no commit ou no PR. Se algum falhar, é bug, não observação.

- [ ] **Step 5: Commit**

```bash
git add components/sections/Contact.tsx content/types.ts content/pt.ts content/en.ts
git commit -m "feat(landing): ponte do portfolio para a landing, e verificacao final

Um lugar so, na secao Contato que ja fala de 'vaga ou projeto'. Nada no
menu: 'Projetos' ao lado de 'Sistemas' confunde, e o menu e justamente onde
as duas mensagens se atrapalhariam.

Suite completa verde.

Os tres casos que nenhum teste automatizado alcanca -- Safari do iPhone,
navegador embutido do Instagram, celular sob luz forte -- ficam declarados
aqui como NAO verificados, se for esse o caso. Escreva o que aconteceu de
verdade."
```

> **Não copie um texto de commit que afirma verificação que você não fez.** A
> primeira versão deste plano trazia "Verificado a mao no Safari do iPhone…"
> pronto para colar — e um agente sem iPhone teria gravado essa mentira no
> histórico para sempre. O implementador da Task 13 recusou o template e
> escreveu o que de fato ocorreu. Faça o mesmo: se os três não foram feitos,
> o commit diz que não foram.

---

## Pendências que bloqueiam a publicação, não a implementação

Depois das 13 tarefas a página está pronta e testada. Estes três dados vêm do dono:

- **Piso de preço** — `landing.piso` está `null`. Preencher com
  `{ valor: 'A partir de R$ X', nota: '…' }` faz a seção aparecer, sem tocar em código.
- **Prazo de resposta** — se quiser, acrescentar ao `cta.tranquilizador` ("Resposta em até
  X horas"). Hoje está só "Sem ligação e sem cadastro", que já funciona.
- **Foto** — pendência herdada do portfólio, `public/foto/` ainda não existe.
