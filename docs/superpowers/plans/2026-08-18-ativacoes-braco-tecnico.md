# Landing de ativações — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar `/[locale]/ativacoes` — uma landing que fala com agência de live
marketing, com a dobra ocupada por uma partida de reflexo jogável de verdade.

**Architecture:** Rota fora do route group `(site)` (sem Header/Footer, mesmo padrão de
`projetos`, `cv` e `og`), em polaridade escura — que é o padrão do site, então sem o hack
de inversão que a `/projetos` carrega. Conteúdo no `Dictionary` tipado, nos dois idiomas.
Componentes em `components/ativacoes/`. O jogo é dividido em módulo puro (`motor-reflexo.ts`,
zero DOM, semente e relógio por parâmetro) e componente de cliente que só desenha
(`CapaJogo.tsx`).

**Tech Stack:** Next.js 16 (App Router, `output: 'export'`), React 19, Tailwind CSS 4
(`@theme`), TypeScript, Vitest + Testing Library, Playwright. Canvas 2D nativo — **nenhuma
biblioteca de animação, nenhuma dependência de runtime nova.**

**Spec:** [`../specs/2026-08-18-ativacoes-braco-tecnico-design.md`](../specs/2026-08-18-ativacoes-braco-tecnico-design.md)

## Global Constraints

Valem para **todas** as tarefas. Cada uma é critério de aceitação do spec.

- **Comentários e nomes de variável em português**, seguindo o resto do repositório.
  Comentário explica *por que*, não *o que*.
- **Nenhuma frase afirma experiência prévia em ativação, evento ou marca.** Não existe
  case desses no portfólio. Spec §2.2.
- **A página diz que não há hardware, locação, montagem nem produção física.** Spec §2.2.
- **Vocabulário proibido, em texto visível:** `phygital`, `disruptiv`, `imersiv`,
  `inovação`/`innovation`. Spec §2.3. Trava em `tests/content.test.ts`.
- **Nenhum número escrito à mão no dicionário.** A contagem de sistemas em produção é
  computada no render. Spec §6.2.
- **Nenhuma dependência de runtime nova.** A única dependência que este plano acrescenta
  é `qrcode`, em `devDependencies`, e só na Task 13.
- **O texto da capa nunca é desenhado no canvas.** `<h1>`, subtítulo e CTA são DOM real.
  Spec §4.2.
- **Fonte de corpo mínima 17px** (`text-[17px]` ou maior) para texto corrido. Rótulo em
  mono com 1–3 palavras (`text-xs`, `text-[11px]`) segue o padrão do portfólio e está fora
  da regra.
- **Estado inicial de revelação vive DENTRO do `@supports (animation-timeline: view())`.**
  Fora dele, apaga a página nos ~16% de navegadores sem scroll timeline. Já é assim em
  `app/globals.css`; nenhuma tarefa aqui pode introduzir estado inicial novo fora do bloco.

### Desvio consciente da spec: `piso`

A spec §5 manda o preço seguir o padrão de `landing.piso` — chave `null` e seção que some
sozinha. **Este plano não cria a chave.** A `/projetos` tem `piso` porque lá existe um
componente `Piso.tsx` já escrito esperando o valor; aqui a chave nasceria sem componente
que a leia, e um campo que nenhum código consome é código morto que o `tsc` não pega.
Quando o dono decidir o piso, ele entra como tarefa própria — tipo, texto, componente e
teste juntos. Registrado em "Pendências", no fim deste arquivo.

## Estrutura de arquivos

**Criar:**

| Arquivo | Responsabilidade |
|---|---|
| `components/ativacoes/motor-reflexo.ts` | Lógica pura da partida. Zero DOM, zero `Math.random`, zero `Date.now`. |
| `components/ativacoes/CapaJogo.tsx` | Client component: desenha o estado no canvas, escuta ponteiro. |
| `components/ativacoes/arte-ativacoes.tsx` | Os quatro SVG do catálogo. |
| `components/ativacoes/Catalogo.tsx` | Os quatro blocos + a linha de escopo negativo. |
| `components/ativacoes/Compra.tsx` | As cinco dores da agência. |
| `components/ativacoes/WhiteLabel.tsx` | A faixa de "sai com a sua marca". |
| `components/ativacoes/ProvaEngenharia.tsx` | Os sistemas como prova de engenharia. |
| `components/ativacoes/PerguntasAtivacoes.tsx` | FAQ de objeções de agência. |
| `components/ativacoes/ChamadaFinal.tsx` | Fechamento + CTA. |
| `app/[locale]/ativacoes/layout.tsx` | Sem Header/Footer, fio de progresso, `pb-20 md:pb-0`. |
| `app/[locale]/ativacoes/page.tsx` | Metadata e montagem das seções. |
| `scripts/generate-qr.mts` | QR estático, Task 13. |
| `tests/unit/ativacoes-motor.test.ts` | |
| `tests/unit/ativacoes-capa.test.tsx` | |
| `tests/unit/ativacoes-catalogo.test.tsx` | |
| `tests/unit/ativacoes-prova.test.tsx` | |
| `tests/e2e/ativacoes.spec.ts` | |

**Modificar:**

| Arquivo | Mudança |
|---|---|
| `content/types.ts` | Chave `ativacoes` no `Dictionary`. |
| `content/pt.ts`, `content/en.ts` | O texto, nos dois idiomas. |
| `content/og.ts` | `'ativacoes'` em `OG_SLUGS`. |
| `components/landing/BarraCta.tsx` | Deixa de ler `dict.landing`; recebe props e polaridade. |
| `app/[locale]/projetos/page.tsx` | Passa as props novas para `BarraCta`. |
| `scripts/generate-seo-files.mts` | `'/ativacoes'` em `PATHS`. |
| `tests/content.test.ts` | Bloco `describe('ativações')`. |
| `tests/unit/og-slugs.test.ts` | Passa a esperar `'ativacoes'`. |
| `tests/unit/contraste.test.ts` | O alvo do jogo contra o fundo do canvas. |
| `tests/static-html.test.ts` | A rota nova no portão de GEO. |

---

## Task 1: A chave `ativacoes` no dicionário

**Files:**
- Modify: `content/types.ts`
- Modify: `content/pt.ts`
- Modify: `content/en.ts`
- Test: `tests/content.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `Dictionary['ativacoes']` com a forma exata declarada no Step 3. Todas as
  tarefas seguintes leem daqui.

- [ ] **Step 1: Escrever o teste que falha**

Acrescente ao fim de `tests/content.test.ts`, **dentro** do `describe('dicionários')` que
já existe, logo depois do bloco `describe('landing', ...)`:

```typescript
  describe('ativações', () => {
    it('nenhum texto está vazio nos dois idiomas', () => {
      for (const dict of [pt, en]) {
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
        varrer(dict.ativacoes, 'ativacoes')
        expect(vazios, `campos vazios: ${vazios.join(', ')}`).toEqual([])
      }
    })

    // Spec §2.3. São as palavras que todo concorrente do ramo já usa —
    // dizê-las é desaparecer no meio deles.
    it('não usa o vocabulário de folheto do setor', () => {
      for (const dict of [pt, en]) {
        const texto = JSON.stringify(dict.ativacoes).toLowerCase()
        for (const proibido of ['phygital', 'disruptiv', 'imersiv', 'inovação', 'innovation']) {
          expect(texto, `"${proibido}" voltou ao dicionário`).not.toContain(proibido)
        }
      }
    })

    // Spec §2.2, a regra mais cara da página: não existe case de ativação no
    // portfólio, e nenhuma frase pode sugerir que existe.
    it('não afirma experiência prévia em ativação ou evento', () => {
      const afirmacoes = [
        /j[áa] (rodamos|fizemos|entregamos)/i,
        /(dezenas|centenas|milhares) de (eventos|ativa)/i,
        /nossos clientes/i,
        /we('ve| have) (run|delivered|built) (dozens|hundreds)/i,
        /our clients/i,
      ]
      for (const dict of [pt, en]) {
        const texto = JSON.stringify(dict.ativacoes)
        for (const a of afirmacoes) {
          expect(texto, `afirmação de experiência que não existe: ${a}`).not.toMatch(a)
        }
      }
    })

    // Spec §2.2. Sem esta linha a página vira "alugamos totem", que é um
    // negócio de logística que a dupla não tem.
    it('declara o escopo negativo', () => {
      expect(pt.ativacoes.catalogo.escopo).toMatch(/hardware/i)
      expect(en.ativacoes.catalogo.escopo).toMatch(/hardware/i)
    })

    it('o catálogo tem exatamente quatro blocos e a compra exatamente cinco itens', () => {
      for (const dict of [pt, en]) {
        expect(dict.ativacoes.catalogo.blocos).toHaveLength(4)
        expect(dict.ativacoes.compra.itens).toHaveLength(5)
      }
    })

    // Spec §6.2: nenhum número escrito à mão. A contagem de sistemas em
    // produção é computada no render, e o dicionário só carrega o lugar dela.
    it('o lead da prova traz o marcador {producao} e nenhum dígito', () => {
      for (const dict of [pt, en]) {
        expect(dict.ativacoes.prova.lead).toContain('{producao}')
        expect(dict.ativacoes.prova.lead).not.toMatch(/\d/)
      }
    })
  })
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm test -- tests/content.test.ts`
Expected: FAIL — `Property 'ativacoes' does not exist on type 'Dictionary'` (o Vitest
falha na transformação do TypeScript antes de executar).

- [ ] **Step 3: Declarar o tipo**

Em `content/types.ts`, dentro do `type Dictionary`, logo **depois** do bloco `landing:`,
acrescente:

```typescript
  /**
   * Landing de ativações (/[locale]/ativacoes). É a terceira página do
   * repositório com público próprio, e o leitor é o mais específico dos três:
   * atendimento ou diretor de operações de AGÊNCIA de live marketing.
   *
   * A diferença que justifica um dicionário separado de `landing`: aquela fala
   * com quem compra o site para a própria empresa, esta fala com quem revende
   * o trabalho para um cliente dele. Prometer "seu site vai carregar rápido"
   * para um diretor de agência é falar da coisa errada — ele quer saber se a
   * ativação vai funcionar no dia, com a fila andando e a internet do estande
   * caindo.
   */
  ativacoes: {
    meta: { title: string; description: string }
    capa: {
      titulo: string
      /** Segunda linha, em serifa. Mesma mecânica de `landing.hero.tituloDestaque`:
       *  chave separada e não marcador dentro da string, porque o portão de HTML
       *  estático compara dicionário com HTML entregue. */
      tituloDestaque: string
      subtitulo: string
      /** Microtexto sobre o canvas, ex.: "Toque nos alvos". */
      convite: string
      /** Rótulos do placar. Nunca os valores — esses vêm do motor. */
      placar: { acertos: string; reacao: string }
    }
    cta: { rotulo: string; mensagem: string; tranquilizador: string }
    catalogo: {
      titulo: string
      blocos: { nome: string; corpo: string }[]
      /** Escopo negativo. Spec §2.2 — não é rodapé, é posicionamento. */
      escopo: string
    }
    compra: { titulo: string; itens: { titulo: string; corpo: string }[] }
    whiteLabel: { titulo: string; corpo: string[] }
    /** `lead` traz o marcador `{producao}`, substituído no render pela contagem
     *  de sistemas em produção. O dicionário nunca carrega o dígito. */
    prova: { titulo: string; lead: string; verCase: string }
    perguntas: { titulo: string; itens: { pergunta: string; resposta: string }[] }
    fechamento: { titulo: string; corpo: string }
  }
```

- [ ] **Step 4: Escrever o texto em português**

Em `content/pt.ts`, depois do bloco `landing: { … },`:

```typescript
  ativacoes: {
    meta: {
      title: 'Ativações digitais para agências — Neto Alves',
      description:
        'Dois desenvolvedores full-stack constroem o software da sua ativação: advergame, quiz, roleta, totem e telão. Sai com a marca da agência.',
    },
    capa: {
      titulo: 'A ativação é sua.',
      tituloDestaque: 'O código é nosso.',
      subtitulo:
        'Dois desenvolvedores full-stack constroem o software da ativação que a sua agência vendeu.',
      convite: 'Toque nos alvos.',
      placar: { acertos: 'acertos', reacao: 'ms de reação' },
    },
    cta: {
      rotulo: 'Falar sobre um projeto',
      mensagem: 'Olá, Neto! Vi a página de ativações e quero falar sobre um projeto.',
      tranquilizador: 'Sem ligação e sem cadastro.',
    },
    catalogo: {
      titulo: 'O que construímos',
      blocos: [
        {
          nome: 'Jogos e mecânicas',
          corpo:
            'Advergame de marca, quiz, roleta, jogo da memória, caça-palavras, desafio de reflexo. Roda no navegador do público por QR ou no totem touch.',
        },
        {
          nome: 'Captura e conteúdo',
          corpo:
            'GIF e foto com a moldura da marca, entregues por QR, WhatsApp ou e-mail. Realidade aumentada no próprio navegador, sem app.',
        },
        {
          nome: 'Operação',
          corpo:
            'Hotsite com cadastro, regulamento e sorteio. Totem em modo quiosque que funciona sem internet. Telão ao vivo com ranking, chamada do vencedor e mural de fotos.',
        },
        {
          nome: 'Dados',
          corpo:
            'Lead direto no CRM da marca, base exportável em conformidade com a LGPD, e API para a agência consultar quando quiser.',
        },
      ],
      escopo:
        'Não fazemos hardware, locação de totem, montagem de estande nem produção física. Construímos o software que roda no totem que você já aluga.',
    },
    compra: {
      titulo: 'O que você compra da gente',
      itens: [
        {
          titulo: 'Funciona sem internet.',
          corpo:
            'A rede do estande cai, a fila não para. O software roda local e sobe os dados quando a conexão volta.',
        },
        {
          titulo: 'Aguenta fila.',
          corpo:
            'Trinta pessoas em sequência, celular ruim, 4G saturado. É para esse cenário que se otimiza, não para o laboratório.',
        },
        {
          titulo: 'Sem app para baixar.',
          corpo: 'Abre no navegador do público por QR. Ninguém instala nada num estande.',
        },
        {
          titulo: 'A base sai limpa.',
          corpo:
            'Exportável, com o consentimento registrado junto de cada cadastro, no formato que você entrega ao cliente.',
        },
        {
          titulo: 'A data não se move.',
          corpo:
            'O cronograma é feito para o dia do evento, e alguém responde nesse dia.',
        },
      ],
    },
    whiteLabel: {
      titulo: 'Sai com a sua marca',
      corpo: [
        'A ativação é sua e o cliente é seu. Não aparecemos para ele e não falamos com ele.',
        'Entramos onde a agência precisa de código, e saímos quando o evento acaba.',
      ],
    },
    prova: {
      titulo: 'De onde vem a confiança',
      lead: 'A engenharia é a mesma que sustenta sistemas em operação todo dia — {producao} deles em produção agora.',
      verCase: 'Ver os casos completos',
    },
    perguntas: {
      titulo: 'Perguntas',
      itens: [
        {
          pergunta: 'E se cair a internet no estande?',
          resposta:
            'O software roda local, no totem ou no próprio celular do público. A fila continua andando e os dados sobem quando a rede volta.',
        },
        {
          pergunta: 'Vocês assinam o projeto?',
          resposta:
            'Não. A peça sai com a marca da agência, e não aparecemos para o cliente final.',
        },
        {
          pergunta: 'Roda no totem que a gente já aluga?',
          resposta:
            'Roda, desde que ele abra um navegador. Conferimos o modelo antes e travamos a tela em modo quiosque.',
        },
        {
          pergunta: 'Quem responde no dia do evento?',
          resposta:
            'Um de nós dois. Os dois conhecem o código inteiro, e o plantão entra no combinado por escrito.',
        },
        {
          pergunta: 'Como fica a LGPD do cadastro?',
          resposta:
            'O consentimento é registrado junto com o lead, e a base sai com a origem de cada dado — do jeito que você entrega ao cliente.',
        },
      ],
    },
    fechamento: {
      titulo: 'Traz o briefing.',
      corpo: 'Conta o que a ativação precisa fazer, e para quando.',
    },
  },
```

- [ ] **Step 5: Escrever o texto em inglês**

Em `content/en.ts`, na **mesma posição** (depois do bloco `landing`):

```typescript
  ativacoes: {
    meta: {
      title: 'Digital brand activations for agencies — Neto Alves',
      description:
        'Two full-stack developers build the software behind your activation: advergame, quiz, prize wheel, kiosk and live screen. It ships under the agency brand.',
    },
    capa: {
      titulo: 'The activation is yours.',
      tituloDestaque: 'The code is ours.',
      subtitulo:
        'Two full-stack developers build the software for the activation your agency sold.',
      convite: 'Tap the targets.',
      placar: { acertos: 'hits', reacao: 'ms reaction' },
    },
    cta: {
      rotulo: 'Talk about a project',
      mensagem: 'Hi, Neto! I saw the activations page and want to talk about a project.',
      tranquilizador: 'No calls, no sign-up.',
    },
    catalogo: {
      titulo: 'What we build',
      blocos: [
        {
          nome: 'Games and mechanics',
          corpo:
            'Branded advergame, quiz, prize wheel, memory game, word search, reflex challenge. Runs in the visitor browser via QR, or on the touch kiosk.',
        },
        {
          nome: 'Capture and content',
          corpo:
            'GIF and photo inside the brand frame, delivered by QR, WhatsApp or email. Augmented reality in the browser itself, no app.',
        },
        {
          nome: 'Operations',
          corpo:
            'Promo site with sign-up, rules and prize draw. Kiosk mode that works with no internet. Live screen with ranking, winner call-out and a rolling photo wall.',
        },
        {
          nome: 'Data',
          corpo:
            'Leads straight into the brand CRM, an export that meets Brazilian data law, and an API the agency can query whenever it wants.',
        },
      ],
      escopo:
        'We do not do hardware, kiosk rental, booth build or physical production. We build the software that runs on the kiosk you already rent.',
    },
    compra: {
      titulo: 'What you buy from us',
      itens: [
        {
          titulo: 'Works with no internet.',
          corpo:
            'The booth network drops, the queue keeps moving. The software runs locally and syncs when the connection is back.',
        },
        {
          titulo: 'Holds a queue.',
          corpo:
            'Thirty people back to back, weak phones, saturated 4G. That is the case we optimise for, not the lab.',
        },
        {
          titulo: 'No app to install.',
          corpo: 'It opens in the visitor browser via QR. Nobody installs anything at a booth.',
        },
        {
          titulo: 'The database comes out clean.',
          corpo:
            'Exportable, with consent recorded next to every sign-up, in the format you hand to the client.',
        },
        {
          titulo: 'The date does not move.',
          corpo: 'The schedule is built around event day, and someone answers on that day.',
        },
      ],
    },
    whiteLabel: {
      titulo: 'It ships under your brand',
      corpo: [
        'The activation is yours and so is the client. We never show up in front of them and we never talk to them.',
        'We step in where the agency needs code, and step out when the event ends.',
      ],
    },
    prova: {
      titulo: 'Where the confidence comes from',
      lead: 'The engineering is the same one holding up systems that run every day — {producao} of them in production right now.',
      verCase: 'See the full case studies',
    },
    perguntas: {
      titulo: 'Questions',
      itens: [
        {
          pergunta: 'What if the booth internet goes down?',
          resposta:
            'The software runs locally, on the kiosk or on the visitor own phone. The queue keeps moving and the data uploads once the network is back.',
        },
        {
          pergunta: 'Do you sign the work?',
          resposta:
            'No. The piece ships under the agency brand, and we never appear in front of the end client.',
        },
        {
          pergunta: 'Does it run on the kiosk we already rent?',
          resposta:
            'It does, as long as it opens a browser. We check the model beforehand and lock the screen into kiosk mode.',
        },
        {
          pergunta: 'Who answers on event day?',
          resposta:
            'One of the two of us. Both know the whole codebase, and the on-call arrangement goes in writing.',
        },
        {
          pergunta: 'What about consent and data law?',
          resposta:
            'Consent is recorded next to the lead, and the export carries the origin of every field — the way you hand it to the client.',
        },
      ],
    },
    fechamento: {
      titulo: 'Bring the brief.',
      corpo: 'Tell us what the activation has to do, and by when.',
    },
  },
```

- [ ] **Step 6: Rodar os testes e confirmar que passam**

Run: `npm test -- tests/content.test.ts`
Expected: PASS, inclusive o teste antigo `'PT e EN têm exatamente as mesmas chaves'` — é
ele que pega qualquer chave que você tenha escrito num idioma e esquecido no outro.

Run: `npm run typecheck`
Expected: sem erros.

- [ ] **Step 7: Commit**

```bash
git add content/types.ts content/pt.ts content/en.ts tests/content.test.ts
git commit -m "content(ativacoes): o dicionario da landing que fala com agencia"
```

---

## Task 2: Rota e layout escuro

**Files:**
- Create: `app/[locale]/ativacoes/layout.tsx`
- Create: `app/[locale]/ativacoes/page.tsx`
- Test: `tests/e2e/ativacoes.spec.ts`

**Interfaces:**
- Consumes: `dict.ativacoes.meta`, `dict.ativacoes.capa` da Task 1; `buildMetadata` e
  `routeUrl` de `lib/seo.ts`; `getDictionary`, `locales`, `Locale` de `@/content`.
- Produces: as rotas `/pt/ativacoes/` e `/en/ativacoes/` em `out/`. As Tasks 5–10 montam
  seções dentro do `page.tsx` criado aqui.

- [ ] **Step 1: Escrever o teste que falha**

Crie `tests/e2e/ativacoes.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { locales } from '../../content/types'

const OUT = join(process.cwd(), 'out')

test('a landing de ativações existe em out/ nos dois idiomas', () => {
  for (const locale of locales) {
    const arquivo = join(OUT, locale, 'ativacoes', 'index.html')
    expect(existsSync(arquivo), `rota não gerada: /${locale}/ativacoes`).toBe(true)
  }
})

// Esta rota NÃO inverte polaridade, ao contrário da /projetos: o escuro é o
// padrão do site. O teste existe para que uma cópia distraída do layout da
// /projetos (que carrega o bloco de inversão) seja pega — inverter aqui
// deixaria a página clara com tokens escuros e ninguém veria em teste unitário.
test('a landing de ativações segue escura, como o resto do site', async ({ page }) => {
  await page.goto('/pt/ativacoes/')
  const corDeFundo = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  expect(corDeFundo).toBe('rgb(8, 9, 12)')

  const esquema = await page.evaluate(
    () => getComputedStyle(document.documentElement).colorScheme,
  )
  expect(esquema).toBe('dark')
})

test('a landing de ativações não leva o cromo de navegação do portfólio', () => {
  const bruto = readFileSync(join(OUT, 'pt', 'ativacoes', 'index.html'), 'utf8')
  expect(bruto).not.toContain('<header')
  expect(bruto).not.toContain('<footer')
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm run build && npm run test:e2e -- tests/e2e/ativacoes.spec.ts`
Expected: FAIL — `rota não gerada: /pt/ativacoes`.

- [ ] **Step 3: Criar o layout**

Crie `app/[locale]/ativacoes/layout.tsx`:

```tsx
// `Locale` fica de fora do import pelo mesmo motivo de
// app/[locale]/projetos/layout.tsx: este layout não lê `params`, e importar o
// tipo sem usá-lo reprova `@typescript-eslint/no-unused-vars` no `npm run lint`.
import { locales } from '@/content'

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

/**
 * Vive FORA do route group `(site)`, junto de `projetos`, `cv` e `og`: sem
 * Header, Footer nem SkipLink. Numa landing todo item de menu é uma saída, e o
 * formato existe justamente para não oferecer nenhuma além do CTA.
 *
 * NÃO HÁ INVERSÃO DE POLARIDADE AQUI, e é a diferença desta rota para a
 * `/projetos`. Lá o layout precisa de um `<style>` reescrevendo `html body` e
 * `:focus-visible`, porque a página é clara sobre um site escuro. Esta é
 * escura como o resto: `globals.css` já pinta `body` com `--color-bg` e já
 * marca `color-scheme: dark`, e o anel de foco global (`--color-text`,
 * `#F5F3EF`) contrasta corretamente com ela. Copiar o bloco de inversão da
 * rota irmã seria introduzir um defeito, não seguir um padrão.
 *
 * `pb-20 md:pb-0` é DESTE `<main>`, não de um `<div>` dentro da página.
 * `BarraCta` é `position: fixed` e não ocupa espaço no fluxo: um padding
 * aplicado a qualquer elemento que SEJA (ou contenha) o último filho de `main`
 * coincide matematicamente com o fim do documento depois de rolar até o fundo,
 * e "some". Só um padding no próprio `main` cria a folga real. A medição
 * completa está no comentário de app/[locale]/projetos/layout.tsx.
 */
export default function AtivacoesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* FIO DE PROGRESSO — dois pixels de tinta e nenhum de JavaScript.
        * `animation-timeline: scroll()` (ver app/globals.css) liga a escala
        * horizontal do fio à barra de rolagem do documento. Sem suporte no
        * navegador ele fica em `scaleX(0)`: invisível, e nada quebra.
        *
        * Numa página longa sem menu, o visitante perde a noção de onde está e
        * de quanto ainda falta. O fio devolve essa noção sem devolver uma saída
        * junto.
        *
        * `aria-hidden` porque é duplicata visual de algo que o leitor de tela
        * já resolve pela navegação por região. */}
      <div
        aria-hidden="true"
        className="fio-progresso fixed inset-x-0 top-0 z-50 h-0.5 bg-data"
      />
      {/* GRÃO E VINHETA. Fundo preto chapado lê como ausência; com grão fino lê
        * como superfície. A classe já existe em `app/globals.css`
        * (`.textura-fundo`, um `feTurbulence` embutido como data URI) e hoje é
        * aplicada só no route group `(site)` — home e case studies, os dois
        * escuros.
        *
        * Ela ficou de fora da `/projetos` e do `/cv` DE PROPÓSITO: aquela tem
        * polaridade de papel e este é feito para impressão, e grão em qualquer
        * um dos dois seria defeito, não estilo. Esta rota é escura, então o
        * motivo da exclusão não se aplica — e é por isso que o teste que hoje
        * trava quatro casos passa a travar cinco (Step 6).
        *
        * `z-index: -10` a deixa atrás de tudo, inclusive do canvas da capa. */}
      <div className="textura-fundo" aria-hidden="true" />
      <main id="conteudo" className="pb-20 md:pb-0">
        {children}
      </main>
    </>
  )
}
```

- [ ] **Step 4: Criar a página, ainda sem as seções**

Crie `app/[locale]/ativacoes/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { getDictionary, locales, type Locale } from '@/content'
import { buildMetadata } from '@/lib/seo'

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
  return buildMetadata(locale, {
    title: dict.ativacoes.meta.title,
    description: dict.ativacoes.meta.description,
    path: '/ativacoes',
    // O arquivo passa a existir na Task 11, que estende OG_SLUGS. A
    // referência já sai correta agora.
    ogImage: `/og/${locale}-ativacoes.png`,
    imageAlt: dict.ativacoes.meta.description,
  })
}

export default async function AtivacoesPage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params
  const dict = getDictionary(locale)

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-20">
      <h1 className="font-serif text-5xl tracking-tight text-text sm:text-7xl">
        {dict.ativacoes.capa.titulo}{' '}
        <em className="text-data">{dict.ativacoes.capa.tituloDestaque}</em>
      </h1>
      <p className="max-w-2xl text-[17px] leading-relaxed text-muted">
        {dict.ativacoes.capa.subtitulo}
      </p>
    </section>
  )
}
```

- [ ] **Step 5: Travar o grão no teste que já cuida dele**

`tests/e2e/home-textura.spec.ts` é a bancada que afirma onde a textura aparece e onde
não: hoje são quatro casos — home e case study com `toHaveCount(1)`, `/projetos` e `/cv`
com `toHaveCount(0)`. Acrescente o quinto, junto dos que esperam 1:

```typescript
test('a landing de ativações tem a textura: é escura como a home', async ({ page }) => {
  await page.goto('/pt/ativacoes/')
  await expect(page.locator('.textura-fundo')).toHaveCount(1)
})
```

Sem isto, quem amanhã ler "a textura fica só no `(site)`" remove a linha do layout achando
que está corrigindo uma inconsistência.

- [ ] **Step 6: Rodar os testes e confirmar que passam**

Run: `npm run build && npm run test:e2e -- tests/e2e/ativacoes.spec.ts tests/e2e/home-textura.spec.ts`
Expected: PASS nos três testes da rota nova e nos cinco da textura.

- [ ] **Step 7: Commit**

```bash
git add app/[locale]/ativacoes tests/e2e/ativacoes.spec.ts tests/e2e/home-textura.spec.ts
git commit -m "feat(ativacoes): a rota nasce escura, sem cromo e sem inversao"
```

---

## Task 3: O motor da partida, puro e determinístico

**Files:**
- Create: `components/ativacoes/motor-reflexo.ts`
- Test: `tests/unit/ativacoes-motor.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `type Alvo = { id: number; x: number; y: number; raio: number; nascidoEm: number }`
  - `type Fase = 'atrativo' | 'jogando' | 'fim'`
  - `type Partida = { fase: Fase; alvos: Alvo[]; acertos: number; somaReacao: number; comecouEm: number; proximoId: number; semente: number; ultimoNascimento: number }`
  - `const DURACAO_MS = 15000`
  - `criarPartida(semente: number, agora: number): Partida`
  - `avancar(partida: Partida, agora: number, fantasma?: boolean): Partida` — `fantasma`
    tem default `true`; passar `false` mantém a fase `atrativo` (que nunca termina) mas
    desliga o jogador automático. É o que `prefers-reduced-motion` usa.
  - `tocar(partida: Partida, x: number, y: number, agora: number): Partida`
  - `mediaReacao(partida: Partida): number`

  Coordenadas e raio são **normalizados de 0 a 1**. O motor não sabe o tamanho do canvas,
  e é isso que o mantém puro e testável.

- [ ] **Step 1: Escrever os testes que falham**

Crie `tests/unit/ativacoes-motor.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import {
  avancar,
  criarPartida,
  DURACAO_MS,
  mediaReacao,
  tocar,
  type Partida,
} from '@/components/ativacoes/motor-reflexo'

/**
 * O motor é puro de propósito: recebe semente e relógio por parâmetro, nunca
 * chama `Math.random` nem `Date.now`. É o que permite testar a partida inteira
 * sem canvas, sem DOM e sem espera real — e é a mesma disciplina de
 * `portico-quality.ts` e `portico-yard.ts`, que já existem no projeto.
 */

/** Roda `passos` quadros de 16ms a partir de `t0`, como o rAF faria. */
function simular(partida: Partida, t0: number, passos: number): Partida {
  let estado = partida
  for (let i = 1; i <= passos; i++) estado = avancar(estado, t0 + i * 16)
  return estado
}

describe('motor de reflexo', () => {
  it('nasce em modo atrativo, sem alvo e sem placar', () => {
    const p = criarPartida(1, 0)
    expect(p.fase).toBe('atrativo')
    expect(p.alvos).toEqual([])
    expect(p.acertos).toBe(0)
  })

  it('a mesma semente produz exatamente a mesma partida', () => {
    const a = simular(criarPartida(42, 0), 0, 200)
    const b = simular(criarPartida(42, 0), 0, 200)
    expect(a.alvos.map((alvo) => [alvo.x, alvo.y])).toEqual(
      b.alvos.map((alvo) => [alvo.x, alvo.y]),
    )
    expect(a.acertos).toBe(b.acertos)
  })

  it('sementes diferentes produzem partidas diferentes', () => {
    const a = simular(criarPartida(1, 0), 0, 200)
    const b = simular(criarPartida(2, 0), 0, 200)
    expect(a.alvos.map((alvo) => alvo.x)).not.toEqual(b.alvos.map((alvo) => alvo.x))
  })

  it('todo alvo nasce dentro do quadro normalizado', () => {
    const p = simular(criarPartida(7, 0), 0, 400)
    for (const alvo of p.alvos) {
      expect(alvo.x).toBeGreaterThanOrEqual(alvo.raio)
      expect(alvo.x).toBeLessThanOrEqual(1 - alvo.raio)
      expect(alvo.y).toBeGreaterThanOrEqual(alvo.raio)
      expect(alvo.y).toBeLessThanOrEqual(1 - alvo.raio)
    }
  })

  // O modo atrativo é o que faz a dobra ter movimento antes de qualquer
  // interação: ninguém precisa entender nada para ver a partida acontecendo.
  it('em modo atrativo a partida joga sozinha e marca ponto', () => {
    const p = simular(criarPartida(3, 0), 0, 400)
    expect(p.fase).toBe('atrativo')
    expect(p.acertos).toBeGreaterThan(0)
  })

  it('o primeiro toque zera o placar e começa a partida de verdade', () => {
    const atrativo = simular(criarPartida(3, 0), 0, 400)
    expect(atrativo.acertos).toBeGreaterThan(0)

    const jogando = tocar(atrativo, 0.5, 0.5, 7000)
    expect(jogando.fase).toBe('jogando')
    expect(jogando.acertos).toBe(0)
    expect(jogando.somaReacao).toBe(0)
    expect(jogando.comecouEm).toBe(7000)
  })

  it('tocar num alvo marca ponto e o remove; tocar no vazio não', () => {
    const inicial = tocar(criarPartida(5, 0), 0.5, 0.5, 0)
    const comAlvo = simular(inicial, 0, 60)
    expect(comAlvo.alvos.length).toBeGreaterThan(0)

    const alvo = comAlvo.alvos[0]!
    const errou = tocar(comAlvo, alvo.x + alvo.raio * 4, alvo.y, 1000)
    expect(errou.acertos).toBe(comAlvo.acertos)
    expect(errou.alvos).toHaveLength(comAlvo.alvos.length)

    const acertou = tocar(comAlvo, alvo.x, alvo.y, 1000)
    expect(acertou.acertos).toBe(comAlvo.acertos + 1)
    expect(acertou.alvos.some((a) => a.id === alvo.id)).toBe(false)
  })

  it('o tempo de reação é medido do nascimento do alvo até o toque', () => {
    const inicial = tocar(criarPartida(5, 0), 0.5, 0.5, 0)
    const comAlvo = simular(inicial, 0, 60)
    const alvo = comAlvo.alvos[0]!
    const acertou = tocar(comAlvo, alvo.x, alvo.y, alvo.nascidoEm + 250)
    expect(mediaReacao(acertou)).toBe(250)
  })

  it('mediaReacao devolve 0 sem nenhum acerto, em vez de NaN', () => {
    expect(mediaReacao(criarPartida(1, 0))).toBe(0)
  })

  it('a partida termina depois da duração e para de nascer alvo', () => {
    const jogando = tocar(criarPartida(9, 0), 0.5, 0.5, 0)
    const fim = avancar(jogando, DURACAO_MS + 1)
    expect(fim.fase).toBe('fim')
    expect(fim.alvos).toEqual([])
  })

  // O modo atrativo NÃO tem fim: a dobra fica viva enquanto ninguém tocar.
  // Sem esta trava, a capa congelaria depois de 15 segundos para quem só
  // está lendo a página.
  it('o modo atrativo nunca termina sozinho', () => {
    const p = avancar(criarPartida(9, 0), DURACAO_MS * 3)
    expect(p.fase).toBe('atrativo')
  })

  // `prefers-reduced-motion` desliga o jogador automático — mas NÃO desliga o
  // jogo. Alvo continua nascendo e continua clicável, e a fase segue
  // `atrativo`, que é a única que não expira. Sem este parâmetro, a única
  // forma de calar o fantasma seria forçar a fase para `jogando`, e aí a
  // partida terminaria sozinha em 15 segundos e deixaria a dobra vazia para
  // quem pediu menos movimento — exatamente quem menos deve ser punido.
  it('sem fantasma o modo atrativo não marca ponto sozinho e nunca termina', () => {
    let estado = criarPartida(3, 0)
    for (let i = 1; i <= 2000; i++) estado = avancar(estado, i * 16, false)
    expect(estado.fase).toBe('atrativo')
    expect(estado.acertos).toBe(0)
    expect(estado.alvos.length).toBeGreaterThan(0)
  })

  it('tocar depois do fim não marca ponto', () => {
    const jogando = tocar(criarPartida(9, 0), 0.5, 0.5, 0)
    const comAlvo = simular(jogando, 0, 60)
    const fim = avancar(comAlvo, DURACAO_MS + 1)
    const depois = tocar(fim, 0.5, 0.5, DURACAO_MS + 500)
    expect(depois.acertos).toBe(fim.acertos)
  })
})
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npm test -- tests/unit/ativacoes-motor.test.ts`
Expected: FAIL — não resolve `@/components/ativacoes/motor-reflexo`.

- [ ] **Step 3: Implementar o motor**

Crie `components/ativacoes/motor-reflexo.ts`:

```typescript
/**
 * A partida de reflexo da dobra, como estado puro.
 *
 * Zero DOM, zero `Math.random`, zero `Date.now`: semente e relógio entram por
 * parâmetro. É o que torna a partida inteira testável sem canvas e sem espera
 * real — mesma disciplina de `components/three/portico-quality.ts`.
 *
 * COORDENADAS SÃO NORMALIZADAS de 0 a 1, e o raio junto. O motor não sabe o
 * tamanho do canvas nem a densidade da tela; quem multiplica por largura e
 * altura é `CapaJogo.tsx`. Sem isso, o teste precisaria inventar um tamanho de
 * tela, e o motor mudaria de comportamento entre celular e desktop.
 */

/** Duração de uma partida de verdade. O modo atrativo ignora este limite. */
export const DURACAO_MS = 15_000
/** Depois disso o alvo some sozinho — é o que cria a pressa. */
const VIDA_ALVO_MS = 1_200
/** Intervalo entre nascimentos. */
const INTERVALO_MS = 620
/** Mais que isso vira ruído visual, e no celular vira alvo pequeno demais. */
const MAX_ALVOS = 3
/** Fração do quadro. 0.055 dá ~24px num canvas de 430px de largura, acima do
 *  mínimo de toque quando somado à tolerância de acerto abaixo. */
const RAIO = 0.055
/** O toque acerta um pouco além da borda desenhada. Dedo não é mouse. */
const TOLERANCIA = 1.6
/** Em modo atrativo o "jogador fantasma" acerta com este atraso, e erra de vez
 *  em quando — acerto perfeito a cada alvo lê como animação em laço, não como
 *  partida. */
const REACAO_FANTASMA_MS = 430

export type Alvo = { id: number; x: number; y: number; raio: number; nascidoEm: number }

export type Fase = 'atrativo' | 'jogando' | 'fim'

export type Partida = {
  fase: Fase
  alvos: Alvo[]
  acertos: number
  /** Soma dos tempos de reação, em ms. `mediaReacao` divide por `acertos`. */
  somaReacao: number
  comecouEm: number
  proximoId: number
  semente: number
  ultimoNascimento: number
}

/**
 * Congruente linear, a mesma dos parâmetros de Numerical Recipes. Devolve o
 * valor E a semente seguinte, porque o motor é puro e não guarda estado
 * escondido em módulo — dois motores rodando na mesma página (não acontece
 * hoje, mas nada impede) não podem compartilhar contador.
 */
function proximo(semente: number): { valor: number; semente: number } {
  const s = (1664525 * semente + 1013904223) >>> 0
  return { valor: s / 4294967296, semente: s }
}

export function criarPartida(semente: number, agora: number): Partida {
  return {
    fase: 'atrativo',
    alvos: [],
    acertos: 0,
    somaReacao: 0,
    comecouEm: agora,
    proximoId: 1,
    // `>>> 0` para semente negativa não envenenar a sequência inteira.
    semente: semente >>> 0,
    ultimoNascimento: agora,
  }
}

function nascer(partida: Partida, agora: number): Partida {
  const px = proximo(partida.semente)
  const py = proximo(px.semente)
  // Mantém o alvo inteiro dentro do quadro: o centro anda só na faixa que
  // sobra depois de descontar o raio nas duas bordas.
  const faixa = 1 - 2 * RAIO
  const alvo: Alvo = {
    id: partida.proximoId,
    x: RAIO + px.valor * faixa,
    y: RAIO + py.valor * faixa,
    raio: RAIO,
    nascidoEm: agora,
  }
  return {
    ...partida,
    alvos: [...partida.alvos, alvo],
    proximoId: partida.proximoId + 1,
    semente: py.semente,
    ultimoNascimento: agora,
  }
}

/**
 * Um quadro. `fantasma = false` desliga o jogador automático sem mexer na
 * fase — é o que `prefers-reduced-motion` usa, e a distinção importa: forçar
 * a fase para `jogando` só para calar o fantasma faria a partida expirar em
 * 15 segundos e deixaria a dobra vazia justamente para quem pediu menos
 * movimento.
 */
export function avancar(partida: Partida, agora: number, fantasma = true): Partida {
  if (partida.fase === 'fim') return partida

  // A partida de verdade tem fim; o modo atrativo não. Sem esta distinção a
  // dobra congelaria depois de 15 segundos para quem só está lendo a página.
  if (partida.fase === 'jogando' && agora - partida.comecouEm >= DURACAO_MS) {
    return { ...partida, fase: 'fim', alvos: [] }
  }

  let estado: Partida = {
    ...partida,
    alvos: partida.alvos.filter((alvo) => agora - alvo.nascidoEm < VIDA_ALVO_MS),
  }

  if (estado.fase === 'atrativo' && fantasma) {
    // O fantasma acerta o alvo mais velho que já passou do tempo de reação, e
    // pula um a cada quatro para a partida não parecer perfeita.
    const maduro = estado.alvos.find(
      (alvo) => agora - alvo.nascidoEm >= REACAO_FANTASMA_MS && alvo.id % 4 !== 0,
    )
    if (maduro) {
      estado = {
        ...estado,
        alvos: estado.alvos.filter((alvo) => alvo.id !== maduro.id),
        acertos: estado.acertos + 1,
        somaReacao: estado.somaReacao + (agora - maduro.nascidoEm),
      }
    }
  }

  if (estado.alvos.length < MAX_ALVOS && agora - estado.ultimoNascimento >= INTERVALO_MS) {
    estado = nascer(estado, agora)
  }

  return estado
}

export function tocar(partida: Partida, x: number, y: number, agora: number): Partida {
  if (partida.fase === 'fim') return partida

  // O primeiro toque encerra o modo atrativo e começa uma partida limpa: o
  // placar do fantasma não pode virar placar de ninguém.
  if (partida.fase === 'atrativo') {
    return {
      ...partida,
      fase: 'jogando',
      acertos: 0,
      somaReacao: 0,
      comecouEm: agora,
      // Os alvos em tela FICAM: apagá-los aqui daria um quadro vazio bem no
      // instante em que a pessoa acabou de decidir participar.
    }
  }

  const atingido = partida.alvos.find((alvo) => {
    const dx = alvo.x - x
    const dy = alvo.y - y
    return Math.hypot(dx, dy) <= alvo.raio * TOLERANCIA
  })
  if (!atingido) return partida

  return {
    ...partida,
    alvos: partida.alvos.filter((alvo) => alvo.id !== atingido.id),
    acertos: partida.acertos + 1,
    somaReacao: partida.somaReacao + (agora - atingido.nascidoEm),
  }
}

/** Média em ms, arredondada. Zero sem acerto — nunca `NaN` na tela. */
export function mediaReacao(partida: Partida): number {
  if (partida.acertos === 0) return 0
  return Math.round(partida.somaReacao / partida.acertos)
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npm test -- tests/unit/ativacoes-motor.test.ts`
Expected: PASS nos 12 testes.

- [ ] **Step 5: Commit**

```bash
git add components/ativacoes/motor-reflexo.ts tests/unit/ativacoes-motor.test.ts
git commit -m "feat(ativacoes): o motor da partida, puro e com semente"
```

---

## Task 4: A capa jogável

**Files:**
- Create: `components/ativacoes/CapaJogo.tsx`
- Test: `tests/unit/ativacoes-capa.test.tsx`

**Interfaces:**
- Consumes: `criarPartida`, `avancar`, `tocar`, `mediaReacao`, `type Partida`
  de `@/components/ativacoes/motor-reflexo` (Task 3); `dict.ativacoes.capa`,
  `dict.ativacoes.cta` e `dict.contact.whatsapp` (Task 1); `BotaoWhatsapp` de
  `@/components/landing/Botao`.
- Produces: `<CapaJogo dict={dict} />`, usado pela Task 10.

- [ ] **Step 1: Escrever os testes que falham**

Crie `tests/unit/ativacoes-capa.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'
import { CapaJogo } from '@/components/ativacoes/CapaJogo'
import { pt } from '@/content/pt'

/**
 * jsdom não implementa `matchMedia`, `ResizeObserver`, `IntersectionObserver`
 * nem contexto 2D de canvas. Isso NÃO é um obstáculo a contornar — é o cenário
 * real de um navegador sem canvas, e o componente tem que sobreviver a ele. Os
 * dois primeiros ganham stub aqui porque a ausência deles é artefato do jsdom;
 * `getContext` fica sem stub de propósito, para o teste exercer exatamente o
 * caminho "não há canvas" que a página promete suportar.
 */
beforeAll(() => {
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia

  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver

  window.IntersectionObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
    root = null
    rootMargin = ''
    thresholds = []
  } as unknown as typeof IntersectionObserver
})

describe('capa jogável', () => {
  // Spec §4.2, a regra mais cara desta seção: canvas é invisível para GPTBot,
  // ClaudeBot e PerplexityBot. A landing irmã vende exatamente o argumento de
  // que a IA consegue ler o site — desenhar o título no canvas seria a
  // contradição mais cara que este repositório poderia publicar.
  it('o título e o subtítulo são DOM real, não pixel no canvas', () => {
    render(<CapaJogo dict={pt} />)
    const titulo = screen.getByRole('heading', { level: 1 })
    expect(titulo.textContent).toContain(pt.ativacoes.capa.titulo)
    expect(titulo.textContent).toContain(pt.ativacoes.capa.tituloDestaque)
    expect(screen.getByText(pt.ativacoes.capa.subtitulo)).toBeInTheDocument()
  })

  it('o CTA aponta para o WhatsApp com a mensagem já escrita', () => {
    render(<CapaJogo dict={pt} />)
    const cta = screen.getByRole('link', { name: pt.ativacoes.cta.rotulo })
    expect(cta.getAttribute('href')).toContain('wa.me')
    expect(cta.getAttribute('href')).toContain(encodeURIComponent(pt.ativacoes.cta.mensagem))
  })

  // Spec §4.4: o jogo é acréscimo. Nada de exclusivo vive dentro do canvas, e
  // por isso ele sai inteiro da árvore de acessibilidade.
  it('o canvas é decoração: aria-hidden e fora da ordem de foco', () => {
    const { container } = render(<CapaJogo dict={pt} />)
    const canvas = container.querySelector('canvas')
    expect(canvas).not.toBeNull()
    expect(canvas!.getAttribute('aria-hidden')).toBe('true')
    expect(canvas!.hasAttribute('tabindex')).toBe(false)
  })

  // Sem contexto 2D (jsdom, navegador antigo, canvas desligado por política),
  // a montagem não pode explodir e o conteúdo tem que continuar lá.
  it('renderiza inteiro mesmo sem contexto de canvas', () => {
    expect(() => render(<CapaJogo dict={pt} />)).not.toThrow()
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npm test -- tests/unit/ativacoes-capa.test.tsx`
Expected: FAIL — não resolve `@/components/ativacoes/CapaJogo`.

- [ ] **Step 3: Implementar a capa**

Crie `components/ativacoes/CapaJogo.tsx`:

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import type { Dictionary } from '@/content/types'
import { BotaoWhatsapp } from '@/components/landing/Botao'
import {
  avancar,
  criarPartida,
  mediaReacao,
  tocar,
  type Partida,
} from './motor-reflexo'

/**
 * A dobra é uma partida rodando de verdade. O visitante brinca antes de ler
 * que a dupla faz jogos, e a mesma peça prova três promessas de uma vez: roda
 * no navegador, sem app, e liso no celular fraco.
 *
 * O TEXTO NÃO É DESENHADO NO CANVAS. `<h1>`, subtítulo e CTA são DOM real
 * posicionado por cima — ver spec §4.2. Canvas é invisível para os crawlers
 * que não executam JavaScript, e a landing irmã deste repositório vende
 * exatamente esse argumento.
 *
 * O estado da partida vive num `ref`, não em `useState`: são ~60 transições por
 * segundo, e re-renderizar o React a cada quadro colocaria na thread principal
 * justamente o custo que este componente existe para não ter. Só o placar
 * atravessa para o React, e só quando muda de valor.
 */

/** Cor do alvo: `--color-warn` (#FFB020). Não é cor nova — já está no `@theme`
 *  — e dá ~11:1 contra o fundo do canvas, muito acima do mínimo de 3:1 da WCAG
 *  1.4.11 para elemento não textual. A trava está em tests/unit/contraste.test.ts. */
const COR_ALVO = '#FFB020'
const COR_FUNDO = '#08090C'
const COR_TRILHO = '#1F232B'
/** Acima de 2 o ganho é invisível e o custo de preenchimento dobra. */
const DPR_MAX = 2

export function CapaJogo({ dict }: { dict: Dictionary }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const partidaRef = useRef<Partida | null>(null)
  const [placar, setPlacar] = useState({ acertos: 0, reacao: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // `getContext` pode devolver null (jsdom, canvas desligado por política de
    // empresa) e, em ambientes antigos, lançar. Os dois casos caem no mesmo
    // lugar: sem contexto, a capa fica com o fundo estático do CSS e o texto
    // continua todo lá. Não é degradação, é o comportamento correto.
    let ctx: CanvasRenderingContext2D | null = null
    try {
      ctx = canvas.getContext('2d')
    } catch {
      ctx = null
    }
    if (!ctx) return
    const pincel = ctx

    const semSuporte = typeof window.matchMedia !== 'function'
    const menosMovimento =
      !semSuporte && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Semente derivada do relógio de montagem: a partida muda de visita para
    // visita, e mesmo assim o motor segue puro — quem sorteia é aqui, não lá.
    partidaRef.current = criarPartida(Date.now() % 2147483647, performance.now())

    let largura = 0
    let altura = 0
    const medir = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, DPR_MAX)
      const caixa = canvas.getBoundingClientRect()
      largura = caixa.width
      altura = caixa.height
      canvas.width = Math.round(largura * dpr)
      canvas.height = Math.round(altura * dpr)
      pincel.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    medir()

    let visivel = true
    let quadro = 0
    let ultimoPlacar = { acertos: -1, reacao: -1 }

    const desenhar = (agora: number) => {
      const anterior = partidaRef.current
      if (!anterior) return
      // Menos movimento desliga o jogador automático, e só ele: os alvos
      // continuam nascendo e continuam clicáveis. `animation-duration: 0` não
      // é acessibilidade, e jogo que some também não.
      const estado = avancar(anterior, agora, !menosMovimento)
      partidaRef.current = estado

      pincel.fillStyle = COR_FUNDO
      pincel.fillRect(0, 0, largura, altura)

      for (const alvo of estado.alvos) {
        const idade = agora - alvo.nascidoEm
        // O alvo encolhe conforme o tempo dele acaba: é o que transmite pressa
        // sem escrever "rápido!" na tela.
        const vida = Math.max(0, 1 - idade / 1200)
        const raio = alvo.raio * Math.min(largura, altura) * (0.55 + 0.45 * vida)

        pincel.beginPath()
        pincel.arc(alvo.x * largura, alvo.y * altura, raio, 0, Math.PI * 2)
        pincel.fillStyle = COR_ALVO
        pincel.fill()

        pincel.beginPath()
        pincel.arc(alvo.x * largura, alvo.y * altura, raio * 1.9, 0, Math.PI * 2)
        pincel.strokeStyle = COR_TRILHO
        pincel.lineWidth = 1
        pincel.stroke()
      }

      const atual = { acertos: estado.acertos, reacao: mediaReacao(estado) }
      if (atual.acertos !== ultimoPlacar.acertos || atual.reacao !== ultimoPlacar.reacao) {
        ultimoPlacar = atual
        setPlacar(atual)
      }

      quadro = requestAnimationFrame(desenhar)
    }

    const ligar = () => {
      if (quadro) return
      quadro = requestAnimationFrame(desenhar)
    }
    const desligar = () => {
      if (!quadro) return
      cancelAnimationFrame(quadro)
      quadro = 0
    }

    // Nada de rAF girando fora da tela nem em aba de fundo: é o orçamento de
    // quadro da spec §4.5, e é o que separa "canvas leve" de "canvas que
    // esquenta o celular de quem já rolou a página".
    const aoTrocarAba = () => (document.hidden || !visivel ? desligar() : ligar())
    document.addEventListener('visibilitychange', aoTrocarAba)

    let observador: IntersectionObserver | null = null
    if (typeof IntersectionObserver === 'function') {
      observador = new IntersectionObserver((entradas) => {
        visivel = entradas.some((e) => e.isIntersecting)
        aoTrocarAba()
      })
      observador.observe(canvas)
    } else {
      ligar()
    }

    let redimensionador: ResizeObserver | null = null
    if (typeof ResizeObserver === 'function') {
      redimensionador = new ResizeObserver(medir)
      redimensionador.observe(canvas)
    }

    const aoTocar = (evento: PointerEvent) => {
      const estado = partidaRef.current
      if (!estado) return
      const caixa = canvas.getBoundingClientRect()
      partidaRef.current = tocar(
        estado,
        (evento.clientX - caixa.left) / caixa.width,
        (evento.clientY - caixa.top) / caixa.height,
        performance.now(),
      )
    }
    canvas.addEventListener('pointerdown', aoTocar)

    return () => {
      desligar()
      document.removeEventListener('visibilitychange', aoTrocarAba)
      canvas.removeEventListener('pointerdown', aoTocar)
      observador?.disconnect()
      redimensionador?.disconnect()
    }
  }, [])

  const { capa, cta } = dict.ativacoes

  return (
    <section className="relative isolate overflow-hidden border-b border-border">
      {/* O canvas é fundo absoluto; o conteúdo vem por cima em fluxo normal.
        * `aria-hidden` e sem `tabindex`: nenhuma informação vive só aqui.
        * `touch-none` impede o navegador de interpretar o toque no alvo como
        * início de rolagem — sem isso, no celular, metade dos acertos vira
        * scroll. */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 -z-10 h-full w-full touch-none bg-bg"
      />
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-24 sm:py-32">
        <h1 className="font-serif text-5xl leading-[1.05] tracking-tight text-text sm:text-7xl">
          {capa.titulo}
          <br />
          <em className="text-data">{capa.tituloDestaque}</em>
        </h1>
        <p className="max-w-xl text-[17px] leading-relaxed text-muted">{capa.subtitulo}</p>
        <div className="flex flex-col gap-2">
          <BotaoWhatsapp numero={dict.contact.whatsapp} mensagem={cta.mensagem} variante="claro">
            {cta.rotulo}
          </BotaoWhatsapp>
          <span className="font-mono text-xs uppercase tracking-[0.15em] text-faint">
            {cta.tranquilizador}
          </span>
        </div>
        {/* Placar e convite são `aria-hidden`: duplicam o que o canvas mostra,
          * e um leitor de tela anunciando "3 acertos" a cada segundo seria
          * ruído puro. */}
        <div
          aria-hidden="true"
          className="flex items-baseline gap-4 font-mono text-xs uppercase tracking-[0.15em] text-faint"
        >
          <span>{capa.convite}</span>
          <span className="text-data">
            {placar.acertos} {capa.placar.acertos}
          </span>
          <span>
            {placar.reacao} {capa.placar.reacao}
          </span>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npm test -- tests/unit/ativacoes-capa.test.tsx`
Expected: PASS nos 4 testes.

Run: `npm run lint && npm run typecheck`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add components/ativacoes/CapaJogo.tsx tests/unit/ativacoes-capa.test.tsx
git commit -m "feat(ativacoes): a dobra vira partida, e o texto segue em HTML"
```

---

## Task 5: Arte e catálogo

**Files:**
- Create: `components/ativacoes/arte-ativacoes.tsx`
- Create: `components/ativacoes/Catalogo.tsx`
- Test: `tests/unit/ativacoes-catalogo.test.tsx`

**Interfaces:**
- Consumes: `dict.ativacoes.catalogo` (Task 1).
- Produces: `<Catalogo dict={dict} />` e
  `<ArteAtivacao variante="jogos" | "captura" | "operacao" | "dados" />`.

- [ ] **Step 1: Escrever os testes que falham**

Crie `tests/unit/ativacoes-catalogo.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Catalogo } from '@/components/ativacoes/Catalogo'
import { pt } from '@/content/pt'

describe('catálogo de ativações', () => {
  it('renderiza os quatro blocos do dicionário', () => {
    render(<Catalogo dict={pt} />)
    for (const bloco of pt.ativacoes.catalogo.blocos) {
      expect(screen.getByText(bloco.nome)).toBeInTheDocument()
      expect(screen.getByText(bloco.corpo)).toBeInTheDocument()
    }
    expect(screen.getAllByRole('listitem')).toHaveLength(4)
  })

  // Spec §2.2: sem esta linha a página vira "alugamos totem", que é um negócio
  // de logística que a dupla não tem. Ela é posicionamento, não rodapé — e por
  // isso tem teste.
  it('mostra o escopo negativo na própria seção', () => {
    render(<Catalogo dict={pt} />)
    expect(screen.getByText(pt.ativacoes.catalogo.escopo)).toBeInTheDocument()
  })

  // A arte é decoração e o argumento vive no texto ao lado — que é o que o
  // crawler lê. Mesmo padrão de components/landing/arte.tsx.
  it('toda arte é decorativa', () => {
    const { container } = render(<Catalogo dict={pt} />)
    const svgs = container.querySelectorAll('svg')
    expect(svgs.length).toBe(4)
    for (const svg of svgs) expect(svg.getAttribute('aria-hidden')).toBe('true')
  })
})
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npm test -- tests/unit/ativacoes-catalogo.test.tsx`
Expected: FAIL — não resolve `@/components/ativacoes/Catalogo`.

- [ ] **Step 3: Desenhar a arte**

Crie `components/ativacoes/arte-ativacoes.tsx`:

```tsx
/**
 * Arte do catálogo, em SVG e não em imagem gerada — pelas mesmas quatro razões
 * documentadas em `components/landing/arte.tsx`: traço de 1px, cor de token
 * exata, nitidez em qualquer densidade, e poucos KB.
 *
 * Cada peça é geometria fechada e abertamente abstrata, com UM destaque em
 * cor. `currentColor` no traço deixa a cor vir da classe do pai, e o destaque
 * usa `--color-data`, o mesmo acento do resto da rota.
 *
 * Tudo aqui leva `aria-hidden`: o argumento vive no texto ao lado, que é o que
 * o crawler lê.
 */

const TRACO = 'stroke-current fill-none [stroke-width:1]'
const DESTAQUE = 'fill-data stroke-none'

export type VarianteArte = 'jogos' | 'captura' | 'operacao' | 'dados'

/** Uma grade de alvos, com um deles aceso — a mecânica da própria dobra. */
function Jogos() {
  return (
    <>
      {[12, 36, 60].map((x) =>
        [12, 36].map((y) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="7" className={TRACO} />
        )),
      )}
      <circle cx="36" cy="36" r="4" className={DESTAQUE} />
    </>
  )
}

/** Moldura de foto com o obturador aceso. */
function Captura() {
  return (
    <>
      <rect x="6" y="10" width="60" height="38" rx="3" className={TRACO} />
      <circle cx="36" cy="29" r="11" className={TRACO} />
      <circle cx="36" cy="29" r="4" className={DESTAQUE} />
      <rect x="50" y="16" width="8" height="4" className={DESTAQUE} />
    </>
  )
}

/** Totem de pé ao lado do telão — os dois itens do bloco, na mesma peça. */
function Operacao() {
  return (
    <>
      <rect x="6" y="8" width="18" height="42" rx="2" className={TRACO} />
      <rect x="10" y="13" width="10" height="14" className={DESTAQUE} />
      <rect x="32" y="12" width="34" height="24" rx="2" className={TRACO} />
      <path d="M49 36v8M41 50h16" className={TRACO} />
    </>
  )
}

/** Registros saindo de uma base para um destino único. */
function Dados() {
  return (
    <>
      {[14, 24, 34].map((y) => (
        <rect key={y} x="6" y={y} width="26" height="6" className={TRACO} />
      ))}
      <path d="M34 27h18" className={TRACO} />
      <circle cx="58" cy="27" r="7" className={TRACO} />
      <circle cx="58" cy="27" r="3" className={DESTAQUE} />
    </>
  )
}

const PECAS: Record<VarianteArte, () => React.JSX.Element> = {
  jogos: Jogos,
  captura: Captura,
  operacao: Operacao,
  dados: Dados,
}

export function ArteAtivacao({ variante }: { variante: VarianteArte }) {
  const Peca = PECAS[variante]
  return (
    <svg viewBox="0 0 72 58" aria-hidden="true" className="w-full text-faint">
      <Peca />
    </svg>
  )
}
```

- [ ] **Step 4: Montar o catálogo**

Crie `components/ativacoes/Catalogo.tsx`:

```tsx
import type { Dictionary } from '@/content/types'
import { ArteAtivacao, type VarianteArte } from './arte-ativacoes'

/**
 * Uma arte por bloco, na ordem do dicionário. A lista fica FORA do `map` e é
 * `as const` para o tipo ser verificado: se alguém acrescentar um quinto bloco
 * ao dicionário, o `tsc` reclama aqui em vez de a página renderizar um buraco.
 * Mesmo padrão de `components/landing/Oferta.tsx`.
 */
const ARTES = ['jogos', 'captura', 'operacao', 'dados'] as const satisfies readonly VarianteArte[]

/**
 * O que costura os quatro blocos não é a lista de artefatos, é quem compra:
 * uma agência montando uma ativação precisa dos quatro ao mesmo tempo, e é
 * raro achar quem entregue mais de dois.
 *
 * A LINHA DE ESCOPO NEGATIVO FECHA A SEÇÃO, e não é rodapé. Sem ela um
 * diretor de operações lê "totem" e "telão" e assume locação de equipamento —
 * que é o negócio ao lado, de logística, e que a dupla não tem. Dizer o que
 * não se faz aqui custa uma frase; descobrir na reunião custa a reunião.
 */
export function Catalogo({ dict }: { dict: Dictionary }) {
  const { catalogo } = dict.ativacoes

  return (
    <section className="border-t border-border">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-20 sm:py-28">
        <h2 className="revelar-titulo font-serif text-4xl tracking-tight text-text sm:text-5xl">
          {catalogo.titulo}
        </h2>
        <ul className="revelar grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
          {catalogo.blocos.map((bloco, i) => (
            <li key={bloco.nome} className="flex flex-col gap-3 bg-surface p-6">
              {/* A arte vem antes do rótulo: no celular os blocos empilham, e
                * quatro parágrafos seguidos sem pausa visual são exatamente a
                * parede que a seção precisa quebrar. `w-20` a mantém pequena —
                * é pontuação, não ilustração. */}
              <div className="w-20">
                <ArteAtivacao variante={ARTES[i] ?? 'jogos'} />
              </div>
              <h3 className="font-mono text-xs uppercase tracking-[0.15em] text-data">
                {bloco.nome}
              </h3>
              <p className="text-[17px] leading-relaxed text-muted">{bloco.corpo}</p>
            </li>
          ))}
        </ul>
        <p className="max-w-2xl border-l-2 border-border pl-4 text-[17px] leading-relaxed text-faint">
          {catalogo.escopo}
        </p>
      </div>
    </section>
  )
}
```

- [ ] **Step 5: Rodar os testes e confirmar que passam**

Run: `npm test -- tests/unit/ativacoes-catalogo.test.tsx`
Expected: PASS nos 3 testes.

- [ ] **Step 6: Commit**

```bash
git add components/ativacoes/arte-ativacoes.tsx components/ativacoes/Catalogo.tsx tests/unit/ativacoes-catalogo.test.tsx
git commit -m "feat(ativacoes): o catalogo, com o escopo negativo dentro da secao"
```

---

## Task 6: O que a agência compra, e o white-label

**Files:**
- Create: `components/ativacoes/Compra.tsx`
- Create: `components/ativacoes/WhiteLabel.tsx`

**Interfaces:**
- Consumes: `dict.ativacoes.compra` e `dict.ativacoes.whiteLabel` (Task 1).
- Produces: `<Compra dict={dict} />` e `<WhiteLabel dict={dict} />`.

Não há teste unitário próprio: as duas seções são texto do dicionário sem lógica, e a
contagem já é travada pelo teste de conteúdo da Task 1 (`compra.itens` tem exatamente
cinco). O que precisa ser verificado é que o texto chega ao HTML entregue, e isso é o
portão de HTML estático da Task 12.

- [ ] **Step 1: Escrever `Compra.tsx`**

```tsx
import type { Dictionary } from '@/content/types'

/**
 * Cinco itens, e cada um é um medo concreto de quem produz evento — não uma
 * lista de recursos. A ordem importa: a internet caindo é a falha número um de
 * ativação digital, e a data que não se move é a que fecha, porque é a única
 * que não tem conserto técnico.
 *
 * Lista NUMERADA, e é decisão de conteúdo: numeração transmite "isto é uma
 * checklist que você pode conferir", que é a leitura certa para um diretor de
 * operações. Marcador redondo transmite "isto é um folheto".
 */
export function Compra({ dict }: { dict: Dictionary }) {
  const { compra } = dict.ativacoes

  return (
    <section className="border-t border-border">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-20 sm:py-28">
        <h2 className="revelar-titulo font-serif text-4xl tracking-tight text-text sm:text-5xl">
          {compra.titulo}
        </h2>
        <ol className="flex flex-col">
          {compra.itens.map((item, i) => (
            <li
              key={item.titulo}
              className="revelar flex gap-5 border-t border-border py-6 first:border-t-0"
              style={{ '--i': i } as React.CSSProperties}
            >
              <span
                aria-hidden="true"
                className="pt-1 font-mono text-xs tabular-nums text-faint"
              >
                {/* Escrito no render a partir do índice, nunca no dicionário:
                  * um número à mão numa lista é a forma mais fácil de a
                  * numeração sair de sincronia com a ordem real. */}
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="flex flex-col gap-2">
                <h3 className="text-[17px] font-semibold text-text">{item.titulo}</h3>
                <p className="text-[17px] leading-relaxed text-muted">{item.corpo}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Escrever `WhiteLabel.tsx`**

```tsx
import type { Dictionary } from '@/content/types'

/**
 * A faixa mais curta da página, e a que decide a venda.
 *
 * O concorrente direto no ramo — estúdio de ativação que vende direto para a
 * marca — COMPETE com a agência pelo mesmo cliente. Esta seção existe para
 * dizer, em duas frases, que aqui isso não acontece. Curta de propósito:
 * argumento de confiança perde força a cada linha a mais, porque quem promete
 * demais soa como quem está se defendendo de alguma coisa.
 *
 * Fundo `--color-surface` em vez de `--color-bg`: numa página escura inteira,
 * a única forma de destacar uma faixa sem inventar cor é subir um degrau de
 * superfície.
 */
export function WhiteLabel({ dict }: { dict: Dictionary }) {
  const { whiteLabel } = dict.ativacoes

  return (
    <section className="border-t border-border bg-surface">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-20 sm:py-28">
        <h2 className="revelar-titulo font-serif text-4xl tracking-tight text-text sm:text-5xl">
          {whiteLabel.titulo}
        </h2>
        <div className="flex flex-col gap-4">
          {whiteLabel.corpo.map((paragrafo, i) => (
            <p
              key={paragrafo}
              className="revelar max-w-2xl text-[17px] leading-relaxed text-muted"
              style={{ '--i': i } as React.CSSProperties}
            >
              {paragrafo}
            </p>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Verificar tipo e estilo**

Run: `npm run lint && npm run typecheck`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add components/ativacoes/Compra.tsx components/ativacoes/WhiteLabel.tsx
git commit -m "feat(ativacoes): as cinco dores da agencia e a faixa de white-label"
```

---

## Task 7: A prova, com a contagem computada

**Files:**
- Create: `components/ativacoes/ProvaEngenharia.tsx`
- Test: `tests/unit/ativacoes-prova.test.tsx`

**Interfaces:**
- Consumes: `dict.ativacoes.prova` (Task 1); `systems` de `@/content/systems`;
  `dict.systems.detail[slug].tagline`.
- Produces: `<ProvaEngenharia dict={dict} locale={locale} />`.

- [ ] **Step 1: Escrever o teste que falha**

Crie `tests/unit/ativacoes-prova.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProvaEngenharia } from '@/components/ativacoes/ProvaEngenharia'
import { pt } from '@/content/pt'
import { systems } from '@/content/systems'

describe('prova de engenharia', () => {
  // Spec §6.2: nenhum número escrito à mão. O dicionário carrega `{producao}`
  // e o render substitui — do contrário, o dia em que um sistema mudar de
  // status a página passa a mentir e nada quebra.
  it('substitui {producao} pela contagem real de sistemas em produção', () => {
    render(<ProvaEngenharia dict={pt} locale="pt" />)
    const emProducao = systems.filter((s) => s.production).length
    const esperado = pt.ativacoes.prova.lead.replace('{producao}', String(emProducao))
    expect(screen.getByText(esperado)).toBeInTheDocument()
  })

  it('não deixa o marcador cru chegar na tela', () => {
    const { container } = render(<ProvaEngenharia dict={pt} locale="pt" />)
    expect(container.textContent).not.toContain('{producao}')
  })

  it('lista os sistemas e liga cada um ao case study do idioma certo', () => {
    render(<ProvaEngenharia dict={pt} locale="pt" />)
    for (const sistema of systems) {
      const link = screen.getByRole('link', { name: new RegExp(sistema.name) })
      expect(link.getAttribute('href')).toBe(`/pt/sistemas/${sistema.slug}`)
    }
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm test -- tests/unit/ativacoes-prova.test.tsx`
Expected: FAIL — não resolve `@/components/ativacoes/ProvaEngenharia`.

- [ ] **Step 3: Implementar**

Crie `components/ativacoes/ProvaEngenharia.tsx`:

```tsx
import Link from 'next/link'
import type { Dictionary, Locale } from '@/content/types'
import { systems } from '@/content/systems'

/**
 * A seção mais delicada da página: ela precisa dar confiança SEM afirmar
 * experiência que não existe. Não há case de ativação no portfólio, e nenhuma
 * frase aqui pode sugerir que há.
 *
 * A saída é de enquadramento, não de redação: o que se prova não é "já fizemos
 * ativação", é "o software que a gente escreve fica de pé". Os três sistemas
 * sustentam exatamente essa afirmação, e são verificáveis.
 *
 * A CONTAGEM NÃO É ESCRITA À MÃO. `{producao}` vem do dicionário e é
 * substituído aqui a partir de `content/systems.ts` — a mesma decisão de
 * `components/landing/Prova.tsx`. No dia em que um sistema mudar de status, a
 * frase acompanha; escrita à mão, ela passaria a mentir em silêncio.
 */
export function ProvaEngenharia({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const { prova } = dict.ativacoes
  const emProducao = systems.filter((sistema) => sistema.production).length

  return (
    <section className="border-t border-border">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-20 sm:py-28">
        <h2 className="revelar-titulo font-serif text-4xl tracking-tight text-text sm:text-5xl">
          {prova.titulo}
        </h2>
        <p className="revelar max-w-2xl text-[17px] leading-relaxed text-muted">
          {prova.lead.replace('{producao}', String(emProducao))}
        </p>
        <ul className="revelar grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
          {systems.map((sistema) => (
            <li key={sistema.slug} className="bg-surface">
              <Link
                href={`/${locale}/sistemas/${sistema.slug}`}
                className="flex h-full flex-col gap-2 p-6 transition-opacity hover:opacity-80"
              >
                <h3 className="text-[17px] font-semibold text-text">{sistema.name}</h3>
                <p className="text-[17px] leading-relaxed text-muted">
                  {dict.systems.detail[sistema.slug].tagline}
                </p>
              </Link>
            </li>
          ))}
        </ul>
        {/* UM link ao fim da seção, e não um por card além dos próprios cards:
          * numa página que apagou o menu para não ter saída nenhuma, três
          * saídas grandes desfazem a decisão. */}
        <Link href={`/${locale}`} className="w-fit text-[17px] text-data hover:opacity-80">
          {prova.verCase}
        </Link>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- tests/unit/ativacoes-prova.test.tsx`
Expected: PASS nos 3 testes.

- [ ] **Step 5: Commit**

```bash
git add components/ativacoes/ProvaEngenharia.tsx tests/unit/ativacoes-prova.test.tsx
git commit -m "feat(ativacoes): prova de engenharia, com a contagem vinda do codigo"
```

---

## Task 8: Perguntas e chamada final

**Files:**
- Create: `components/ativacoes/PerguntasAtivacoes.tsx`
- Create: `components/ativacoes/ChamadaFinal.tsx`

**Interfaces:**
- Consumes: `dict.ativacoes.perguntas`, `dict.ativacoes.fechamento`, `dict.ativacoes.cta`,
  `dict.contact.whatsapp`; `BotaoWhatsapp` de `@/components/landing/Botao`.
- Produces: `<PerguntasAtivacoes dict={dict} />` e `<ChamadaFinal dict={dict} />`.

- [ ] **Step 1: Escrever `PerguntasAtivacoes.tsx`**

```tsx
import type { Dictionary } from '@/content/types'

/**
 * As objeções são de AGÊNCIA, não de marca: internet do estande, assinatura da
 * peça, compatibilidade com o totem alugado, plantão no dia, consentimento do
 * cadastro. Um FAQ com "o que é uma ativação?" estaria falando com o público
 * errado e diria, sem querer, que a página não sabe com quem fala.
 *
 * `<dl>` e não acordeão: são cinco respostas curtas, e esconder texto atrás de
 * clique numa página sem menu troca uma rolagem por cinco interações. Acordeão
 * também sonega o texto ao crawler que não executa JavaScript — o mesmo
 * argumento que a landing irmã deste repositório vende.
 */
export function PerguntasAtivacoes({ dict }: { dict: Dictionary }) {
  const { perguntas } = dict.ativacoes

  return (
    <section className="border-t border-border">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-20 sm:py-28">
        <h2 className="revelar-titulo font-serif text-4xl tracking-tight text-text sm:text-5xl">
          {perguntas.titulo}
        </h2>
        <dl className="flex flex-col">
          {perguntas.itens.map((item, i) => (
            <div
              key={item.pergunta}
              className="revelar flex flex-col gap-2 border-t border-border py-6 first:border-t-0"
              style={{ '--i': i } as React.CSSProperties}
            >
              <dt className="text-[17px] font-semibold text-text">{item.pergunta}</dt>
              <dd className="text-[17px] leading-relaxed text-muted">{item.resposta}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Escrever `ChamadaFinal.tsx`**

```tsx
import type { Dictionary } from '@/content/types'
import { BotaoWhatsapp } from '@/components/landing/Botao'

/**
 * Último bloco do documento, e o único lugar da página com o CTA em tamanho
 * grande além da dobra.
 *
 * Não reaproveita `components/landing/Fecho.tsx` nem `LandingCta.tsx`: os dois
 * leem `dict.landing` direto e carregam a faixa escura que só existe para
 * quebrar uma página de polaridade CLARA. Numa rota escura inteira, a faixa
 * não distingue nada — seria decoração herdada de um problema que aqui não
 * existe.
 */
export function ChamadaFinal({ dict }: { dict: Dictionary }) {
  const { fechamento, cta } = dict.ativacoes

  return (
    <section className="border-t border-border bg-surface">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-20 sm:py-28">
        <h2 className="revelar-titulo font-serif text-4xl tracking-tight text-text sm:text-5xl">
          {fechamento.titulo}
        </h2>
        <p className="max-w-xl text-[17px] leading-relaxed text-muted">{fechamento.corpo}</p>
        <div className="flex flex-col gap-2">
          <BotaoWhatsapp numero={dict.contact.whatsapp} mensagem={cta.mensagem} variante="claro">
            {cta.rotulo}
          </BotaoWhatsapp>
          <span className="font-mono text-xs uppercase tracking-[0.15em] text-faint">
            {cta.tranquilizador}
          </span>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Verificar**

Run: `npm run lint && npm run typecheck`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add components/ativacoes/PerguntasAtivacoes.tsx components/ativacoes/ChamadaFinal.tsx
git commit -m "feat(ativacoes): perguntas de agencia e a chamada final"
```

---

## Task 9: `BarraCta` deixa de ser da `/projetos`

**Files:**
- Modify: `components/landing/BarraCta.tsx`
- Modify: `app/[locale]/projetos/page.tsx`

**Interfaces:**
- Produces: `<BarraCta numero={string} rotulo={string} mensagem={string} polaridade?: 'clara' | 'escura' />`.
  A Task 10 usa a variante escura.

Esta é mudança de assinatura **sem** mudança de comportamento na página existente. Os
testes atuais da `/projetos` (`tests/unit/landing-fechamento.test.tsx` e
`tests/e2e/landing.spec.ts`) são a rede: se algum quebrar, a migração não foi neutra.

- [ ] **Step 1: Rodar os testes existentes e anotar que passam ANTES da mudança**

Run: `npm test -- tests/unit/landing-fechamento.test.tsx`
Expected: PASS. Anote o número de testes — é a linha de base.

- [ ] **Step 2: Reescrever `BarraCta.tsx`**

Substitua a assinatura e o corpo do componente (o bloco de comentário grande no topo do
arquivo **permanece**, é onde vive a pesquisa sobre a bolha verde). Acrescente ao fim
daquele comentário:

```
 * A BARRA DEIXOU DE LER `dict.landing`. Ela nasceu para a /projetos e passou a
 * servir duas rotas com polaridades opostas; ler uma chave específica do
 * dicionário amarrava um componente de layout a uma página. Agora recebe o que
 * mostra por prop, e a polaridade escolhe os tokens — na rota clara os tokens
 * de papel, na escura os de superfície. Sem isso, a barra apareceria branca
 * sobre a página escura, que é o defeito que ninguém vê em teste de unidade.
```

E o componente:

```tsx
const POLARIDADE = {
  clara: { caixa: 'border-rule bg-paper/95', botao: 'escuro' },
  escura: { caixa: 'border-border bg-bg/95', botao: 'claro' },
} as const

export function BarraCta({
  numero,
  rotulo,
  mensagem,
  polaridade = 'clara',
}: {
  numero: string
  rotulo: string
  mensagem: string
  polaridade?: keyof typeof POLARIDADE
}) {
  const tokens = POLARIDADE[polaridade]

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-50 border-t ${tokens.caixa} p-3 backdrop-blur md:hidden`}
    >
      <BotaoWhatsapp
        numero={numero}
        mensagem={mensagem}
        variante={tokens.botao}
        largura="cheia"
      >
        {rotulo}
      </BotaoWhatsapp>
    </div>
  )
}
```

Remova o import agora não usado de `Dictionary` no topo do arquivo (`npm run lint`
reprova sem isso).

- [ ] **Step 3: Atualizar a chamada na `/projetos`**

Em `app/[locale]/projetos/page.tsx`, troque `<BarraCta dict={dict} />` por:

```tsx
        <BarraCta
          numero={dict.contact.whatsapp}
          rotulo={dict.landing.cta.rotulo}
          mensagem={dict.landing.cta.mensagem}
        />
```

O `<div>` que envolve a barra **fica como está** — ele existe para `main > :last-child`
não apontar para a própria barra no teste de sobreposição, e o comentário lá explica.

- [ ] **Step 4: Rodar os testes e confirmar que continuam passando**

Run: `npm test -- tests/unit/landing-fechamento.test.tsx`
Expected: PASS, com o MESMO número de testes do Step 1.

Run: `npm run build && npm run test:e2e -- tests/e2e/landing.spec.ts`
Expected: PASS — a `/projetos` não mudou de comportamento.

- [ ] **Step 5: Commit**

```bash
git add components/landing/BarraCta.tsx "app/[locale]/projetos/page.tsx"
git commit -m "refactor(landing): a barra fixa passa a receber props e polaridade"
```

---

## Task 10: Montar a página e entrar no sitemap

**Files:**
- Modify: `app/[locale]/ativacoes/page.tsx`
- Modify: `scripts/generate-seo-files.mts`
- Modify: `tests/e2e/ativacoes.spec.ts`

**Interfaces:**
- Consumes: todos os componentes das Tasks 4–9.

- [ ] **Step 1: Acrescentar os testes que falham**

Em `tests/e2e/ativacoes.spec.ts`, acrescente ao fim:

```typescript
test('a landing de ativações está no sitemap, nos dois idiomas', () => {
  const sitemap = readFileSync(join(OUT, 'sitemap.xml'), 'utf8')
  for (const locale of locales) {
    expect(sitemap).toContain(`/${locale}/ativacoes/`)
  }
})

// Mesma medição que a /projetos precisou: `BarraCta` é `position: fixed` e não
// ocupa espaço no fluxo, então sem o `pb-20` no PRÓPRIO `<main>` ela cobre o
// último bloco depois de rolar até o fundo. É defeito de celular, e só aparece
// no navegador de verdade.
test('a barra fixa não cobre o último bloco no celular', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/pt/ativacoes/')
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))

  const sobreposto = await page.evaluate(() => {
    // O SELETOR É ESCOPADO A `div.fixed` DE PROPÓSITO, e é a mesma armadilha
    // que a /projetos já pagou: existem TRÊS links de wa.me na página (capa,
    // chamada final e a barra fixa, os três reusando `urlWhatsapp`). Sem o
    // escopo, `querySelector` devolve o primeiro em ordem de documento — o da
    // capa, que não está dentro de nenhum `div.fixed` — e `?.closest(...)`
    // resulta em `undefined`, fazendo o teste "passar" por não achar nada em
    // vez de medir a sobreposição de verdade.
    const barra = document.querySelector('div.fixed a[href*="wa.me"]')?.closest('div.fixed')
    const ultimo = document.querySelector('main > :last-child')
    if (!barra || !ultimo) return null
    const b = barra.getBoundingClientRect()
    const u = ultimo.getBoundingClientRect()
    return u.bottom > b.top
  })
  expect(sobreposto, 'não achou a barra ou o último bloco — o seletor mudou').not.toBeNull()
  expect(sobreposto, 'a barra cobre o fim do conteúdo').toBe(false)
})

// A partida precisa estar rodando antes de qualquer toque: é o modo atrativo,
// e é o que dá movimento à dobra para quem só está lendo.
test('a dobra joga sozinha e o placar sobe sem ninguém tocar', async ({ page }) => {
  await page.goto('/pt/ativacoes/')
  const placar = page.locator('text=/\\d+ acertos/')
  await expect(placar).toBeVisible()
  await expect(placar).not.toHaveText('0 acertos', { timeout: 8000 })
})
```

- [ ] **Step 2: Rodar e confirmar que falham**

Run: `npm run build && npm run test:e2e -- tests/e2e/ativacoes.spec.ts`
Expected: FAIL nos três novos.

- [ ] **Step 3: Montar as seções na página**

Em `app/[locale]/ativacoes/page.tsx`, troque o `<section>` provisório da Task 2 pelo
corpo real, e acrescente os imports:

```tsx
import { CapaJogo } from '@/components/ativacoes/CapaJogo'
import { Catalogo } from '@/components/ativacoes/Catalogo'
import { Compra } from '@/components/ativacoes/Compra'
import { WhiteLabel } from '@/components/ativacoes/WhiteLabel'
import { ProvaEngenharia } from '@/components/ativacoes/ProvaEngenharia'
import { PerguntasAtivacoes } from '@/components/ativacoes/PerguntasAtivacoes'
import { ChamadaFinal } from '@/components/ativacoes/ChamadaFinal'
import { BarraCta } from '@/components/landing/BarraCta'
```

```tsx
/**
 * ORDEM DAS SEÇÕES. O leitor é diretor de operações ou atendimento de agência,
 * e o que ele precisa saber, nesta ordem: que existe alguém que constrói (a
 * capa, provando na prática), o que exatamente (catálogo), por que confiar no
 * dia do evento (as cinco dores), que não vai perder o cliente (white-label) e
 * de onde vem a engenharia (prova).
 *
 * O white-label vem DEPOIS das dores e não antes, e é a única ordem que
 * funciona: white-label responde um medo que a pessoa só sente depois de
 * acreditar que a coisa funciona. Antes disso ela ainda está avaliando se vale
 * a conversa, não se vai perder o cliente.
 *
 * `BarraCta` vai dentro de um `<div>` só dela, e não solta como os demais: sem
 * isso ela seria o próprio último filho de `main`, e o teste que mede a
 * sobreposição (`main > :last-child`) acabaria comparando a barra com ela
 * mesma. O `div` não fixo colapsa para altura zero — o único filho dele é
 * `position: fixed`, fora do fluxo.
 */
export default async function AtivacoesPage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params
  const dict = getDictionary(locale)

  return (
    <>
      <CapaJogo dict={dict} />
      <Catalogo dict={dict} />
      <Compra dict={dict} />
      <WhiteLabel dict={dict} />
      <ProvaEngenharia dict={dict} locale={locale} />
      <PerguntasAtivacoes dict={dict} />
      <ChamadaFinal dict={dict} />
      <div>
        <BarraCta
          numero={dict.contact.whatsapp}
          rotulo={dict.ativacoes.cta.rotulo}
          mensagem={dict.ativacoes.cta.mensagem}
          polaridade="escura"
        />
      </div>
    </>
  )
}
```

- [ ] **Step 4: Entrar no sitemap e no llms.txt**

Em `scripts/generate-seo-files.mts`, na constante `PATHS` (linha ~47):

```typescript
const PATHS: string[] = [
  '',
  '/projetos',
  '/ativacoes',
  ...SYSTEM_SLUGS.map((slug) => `/sistemas/${slug}`),
]
```

E na função `entryFor` (linha ~82), acrescente **antes** da linha de `/sistemas/`:

```typescript
  if (path === '/ativacoes') {
    return { label: d.ativacoes.meta.title, description: d.ativacoes.meta.description }
  }
```

`PATHS` é fonte única para sitemap **e** llms.txt — foi exatamente aqui que a `/projetos`
entrou no sitemap e ficou de fora do llms.txt na vez passada. O comentário no arquivo
registra o achado.

- [ ] **Step 5: Rodar tudo e confirmar que passa**

Run: `npm run build && npm run test:e2e -- tests/e2e/ativacoes.spec.ts`
Expected: PASS nos seis testes do arquivo.

- [ ] **Step 6: Commit**

```bash
git add "app/[locale]/ativacoes/page.tsx" scripts/generate-seo-files.mts tests/e2e/ativacoes.spec.ts
git commit -m "feat(ativacoes): a pagina inteira de pe, e dentro do sitemap"
```

---

## Task 11: Fim da deriva na lista de slugs de OG

**Files:**
- Modify: `content/og.ts`
- Modify: `tests/unit/og-slugs.test.ts`

**Interfaces:**
- Produces: `'ativacoes'` em `OG_SLUGS`, o que faz `app/[locale]/og/[slug]/page.tsx`
  gerar a página e `scripts/generate-og.mts` fotografar o card.

A `page.tsx` da Task 2 já aponta `ogImage: /og/${locale}-ativacoes.png`. Sem esta tarefa
a metadata referencia um PNG que não existe — e nada quebra, que é exatamente o defeito
que `tests/unit/og-slugs.test.ts` existe para pegar.

- [ ] **Step 1: Ajustar o teste que trava a lista**

Em `tests/unit/og-slugs.test.ts`, nos dois testes que citam a lista:

```typescript
  it('inclui a home, os sistemas e as duas landings', () => {
    expect(OG_SLUGS).toContain('home')
    expect(OG_SLUGS).toContain('projetos')
    expect(OG_SLUGS).toContain('ativacoes')
  })

  it('espalha SYSTEM_SLUGS em vez de repetir os slugs à mão', () => {
    expect(OG_SLUGS).toEqual(['home', 'projetos', 'ativacoes', ...SYSTEM_SLUGS])
  })
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm test -- tests/unit/og-slugs.test.ts`
Expected: FAIL — `'ativacoes'` não está em `OG_SLUGS`.

- [ ] **Step 3: Acrescentar o slug**

Em `content/og.ts`:

```typescript
export const OG_SLUGS = ['home', 'projetos', 'ativacoes', ...SYSTEM_SLUGS] as const
```

- [ ] **Step 4: Dar um card próprio à rota nova**

`app/[locale]/og/[slug]/page.tsx` **não deriva o card sozinho**: ele testa os slugs em
cascata e cai em `OgHome` para tudo que não reconhece. Foi exatamente esse buraco que fez
`pt-projetos.png` e `pt-home.png` saírem como o MESMO arquivo — confirmado por md5 na
revisão passada, e o preview do WhatsApp mostrava o card do recrutador antes de uma página
que fala outra coisa. Sem este passo, `ativacoes` repete o defeito.

Logo **acima** da linha `if (slug === 'projetos') return <OgLanding dict={dict} />`:

```tsx
  if (slug === 'ativacoes') return <OgAtivacoes dict={dict} />
```

E acrescente o componente ao lado de `OgLanding`, no mesmo arquivo:

```tsx
/**
 * Card ESCURO, ao contrário do `OgLanding`: esta rota não inverte polaridade, e
 * o preview precisa parecer a página que a pessoa vai abrir. A serifa do título
 * é o que diferencia os dois cards escuros — o da home usa sans.
 */
function OgAtivacoes({ dict }: { dict: Dictionary }) {
  const { hero, ativacoes } = dict

  return (
    <div className="relative flex h-[630px] w-[1200px] flex-col justify-between overflow-hidden bg-bg p-16">
      <div className="flex flex-col gap-6">
        <p className="font-mono text-lg uppercase tracking-[0.3em] text-muted">{hero.name}</p>
        <h1 className="max-w-4xl font-serif text-7xl leading-[1.05] tracking-tight text-text">
          {ativacoes.capa.titulo} <em className="text-data">{ativacoes.capa.tituloDestaque}</em>
        </h1>
      </div>
      <p className="max-w-3xl text-2xl leading-snug text-muted">{ativacoes.capa.subtitulo}</p>
    </div>
  )
}
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `npm test -- tests/unit/og-slugs.test.ts`
Expected: PASS.

Run: `npm run build && npm run generate:og`
Expected: aparecem `public/og/pt-ativacoes.png` e `public/og/en-ativacoes.png`.

Abra os dois PNG e confirme que **não** são cópia de `pt-home.png`. Comparar md5 basta:

```bash
md5sum public/og/pt-home.png public/og/pt-projetos.png public/og/pt-ativacoes.png
```

Expected: três somas diferentes.

- [ ] **Step 6: Commit**

```bash
git add content/og.ts tests/unit/og-slugs.test.ts "app/[locale]/og" public/og
git commit -m "feat(og): o card de compartilhamento da landing de ativacoes"
```

---

## Task 12: Contraste e portão de HTML estático

**Files:**
- Modify: `tests/unit/contraste.test.ts`
- Modify: `tests/static-html.test.ts`

**Interfaces:**
- Consumes: `COR_ALVO` (`#FFB020`) e `COR_FUNDO` (`#08090C`) da Task 4.

- [ ] **Step 1: Escrever a asserção de contraste**

Em `tests/unit/contraste.test.ts`, acrescente um `describe` novo dentro do
`describe('contraste')`:

```typescript
  /**
   * O alvo do jogo não é texto, então o mínimo não é o 4.5:1 de AA — é o 3:1 da
   * WCAG 1.4.11 para componente de interface não textual. `#FFB020` é
   * `--color-warn`, cor que já existe no `@theme`: a rota não inventa cor
   * nenhuma, e essa foi a decisão que dispensou medir um tom quente novo.
   */
  describe('a partida da dobra', () => {
    it('o alvo se distingue do fundo do canvas com folga sobre o mínimo de 3:1', () => {
      expect(contraste('#FFB020', ESCURO)).toBeGreaterThanOrEqual(3)
    })

    it('o anel do alvo não é usado para transmitir informação sozinho', () => {
      // `--color-border` (#1F232B) reprova 3:1 de propósito: ele é decoração
      // em volta do alvo, e o alvo já se distingue sozinho pela cor e pelo
      // tamanho. Esta asserção existe para que ninguém promova o anel a
      // portador de significado sem antes trocar a cor dele.
      expect(contraste('#1F232B', ESCURO)).toBeLessThan(3)
    })
  })
```

- [ ] **Step 2: Rodar e confirmar**

Run: `npm test -- tests/unit/contraste.test.ts`
Expected: PASS. Se o primeiro falhar, a cor do alvo foi trocada em `CapaJogo.tsx` sem
medir — corrija lá, não aqui.

- [ ] **Step 3: Estender o portão de HTML estático**

Em `tests/static-html.test.ts`, acrescente um `describe` que exerça a rota nova. Use os
helpers `html`, `semScripts` e `escapeHtmlText` que já existem no arquivo:

```typescript
describe('portão de GEO — landing de ativações', () => {
  for (const locale of locales) {
    const dict = dicts[locale]

    it(`/${locale}/ativacoes traz o título fora de <script>`, () => {
      const limpo = semScripts(html(`${locale}/ativacoes`))
      expect(limpo).toContain(escapeHtmlText(dict.ativacoes.capa.titulo))
      expect(limpo).toContain(escapeHtmlText(dict.ativacoes.capa.tituloDestaque))
    })

    // Spec §4.2: o texto da dobra é DOM, não pixel. Se alguém um dia desenhar
    // o título no canvas, este é o teste que acusa.
    it(`/${locale}/ativacoes traz o catálogo inteiro em texto`, () => {
      const limpo = semScripts(html(`${locale}/ativacoes`))
      for (const bloco of dict.ativacoes.catalogo.blocos) {
        expect(limpo, `bloco ausente do HTML: ${bloco.nome}`).toContain(
          escapeHtmlText(bloco.nome),
        )
      }
      expect(limpo).toContain(escapeHtmlText(dict.ativacoes.catalogo.escopo))
    })
  }
})
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm run build && npm run test:html`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/unit/contraste.test.ts tests/static-html.test.ts
git commit -m "test(ativacoes): contraste do alvo e o portao de GEO da rota nova"
```

---

## Task 13: O QR "abra no celular" — última, e descartável

**Files:**
- Create: `scripts/generate-qr.mts`
- Modify: `package.json`
- Modify: `components/ativacoes/CapaJogo.tsx`

**Esta tarefa pode ser cortada inteira sem afetar nada acima dela.** Ela custa uma
devDependency, e dependência nova neste repositório significa **regerar
`package-lock.json` no Linux** — o npm do Windows poda `@emnapi/runtime` e o deploy quebra
em `npm ci`. Se a regeneração der trabalho, feche a branch sem esta tarefa.

- [ ] **Step 1: Instalar a dependência e regerar o lockfile no Linux**

```bash
npm install --save-dev qrcode @types/qrcode
docker run --rm -v "$PWD:/w" -w /w node:24 sh -c "rm -f package-lock.json && npm install --package-lock-only"
```

Confirme que `@emnapi/runtime` continua no lockfile:

```bash
grep -c "@emnapi/runtime" package-lock.json
```

Expected: pelo menos 1. Zero significa que o lockfile foi gerado no Windows — refaça pelo
Docker.

- [ ] **Step 2: Escrever o script**

Crie `scripts/generate-qr.mts`:

```typescript
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import QRCode from 'qrcode'
import { locales } from '../content/types.ts'

/**
 * O QR da capa, como SVG estático gerado no build.
 *
 * Gerado e não escrito à mão porque o conteúdo é a URL canônica da própria
 * rota, e ela depende de `NEXT_PUBLIC_BASE_PATH` — um SVG commitado ficaria
 * apontando para o endereço antigo no dia em que o site sair do GitHub Pages
 * para domínio próprio, e ninguém perceberia: QR quebrado não dá erro, dá
 * página em branco no celular de outra pessoa.
 *
 * Roda no build, não no cliente: zero JavaScript de QR chega ao navegador.
 */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '/portfolio'
const SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://labsfluxo-stack.github.io'
const DESTINO = join(process.cwd(), 'public', 'ativacoes')

mkdirSync(DESTINO, { recursive: true })

for (const locale of locales) {
  const url = `${SITE_ORIGIN}${BASE_PATH}/${locale}/ativacoes/`
  const svg = await QRCode.toString(url, {
    type: 'svg',
    margin: 0,
    // Sobre o preto da rota: módulos claros, fundo transparente.
    color: { dark: '#F5F3EF', light: '#0000' },
  })
  writeFileSync(join(DESTINO, `qr-${locale}.svg`), svg, 'utf8')
  console.log(`qr: ${locale} -> ${url}`)
}
```

- [ ] **Step 3: Ligar ao build**

Em `package.json`, no script `build`, acrescente o passo **antes** de `next build` (o SVG
precisa existir em `public/` na hora em que o Next copia os estáticos):

```json
"build": "node --experimental-strip-types scripts/generate-qr.mts && next build && node --experimental-strip-types scripts/write-root-redirect.mts && node --experimental-strip-types scripts/generate-seo-files.mts",
```

- [ ] **Step 4: Mostrar o QR só no desktop**

Em `components/ativacoes/CapaJogo.tsx`, dentro do `<div>` do placar, acrescente ao lado:

```tsx
        {/* `hidden md:block`: no celular o QR é piada — a pessoa já está no
          * telefone. Serve ao visitante de desktop que quer sentir a mecânica
          * no aparelho em que ela de fato vai rodar no estande. */}
        <img
          src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? '/portfolio'}/ativacoes/qr-pt.svg`}
          alt=""
          aria-hidden="true"
          width={72}
          height={72}
          className="hidden md:block"
        />
```

Nota: `alt=""` **e** `aria-hidden`, porque o QR não carrega informação que já não esteja
na URL da barra de endereço — quem está no desktop já está na página.

- [ ] **Step 5: Verificar**

Run: `npm run build && npm run lint && npm run typecheck`
Expected: sem erros, e `public/ativacoes/qr-pt.svg` existe.

- [ ] **Step 6: Commit**

```bash
git add scripts/generate-qr.mts package.json package-lock.json components/ativacoes/CapaJogo.tsx public/ativacoes
git commit -m "feat(ativacoes): o QR da capa, gerado no build a partir da URL real"
```

---

## Verificação final

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] `npm run test:html`
- [ ] `npm run test:e2e`

Todos verdes antes de abrir a integração. Nenhuma alegação de "está funcionando" antes de
colar a saída desses seis comandos.

## Pendências que bloqueiam a publicação, não a implementação

Estas não travam nenhuma tarefa acima. Travam o go-live, e são do dono:

1. **Prazo mínimo de antecedência do evento.** A pergunta "com quanto tempo?" foi
   deliberadamente **deixada de fora** do FAQ da Task 1 — inventar um prazo numa página
   cujo argumento é que a data não se move seria a contradição mais barata possível.
   Decidido o prazo, ele entra como sexto item de `perguntas.itens` nos dois idiomas.
2. **Piso de preço.** Ver "Desvio consciente da spec" no topo deste arquivo: quando o
   valor existir, entra como tarefa própria — tipo, texto, componente e teste juntos.
3. **Link de entrada.** Como na `/projetos`, esta rota não entra no menu. Decidir de onde
   ela é linkada (assinatura de e-mail, perfil, proposta em PDF) é decisão comercial, não
   de código.
4. **Três testes físicos que ninguém fez.** Valem para esta rota tanto quanto para a
   irmã, e a capa jogável aumenta a aposta nos três: Safari em iPhone real (`position:
   fixed` desloca quando a barra de endereço recolhe), navegador embutido do Instagram
   (viewport menor, barra própria disputando espaço), e celular sob sol forte — onde o
   `#FFB020` do alvo contra o preto é justamente o par que precisa ser conferido no
   vidro, não na calculadora de contraste.
