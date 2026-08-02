# Portfólio Neto Alves — "Sala de Controle"

**Data:** 2026-08-02
**Autor:** Neto Alves (netoguild-rgb)
**Status:** design aprovado, aguardando revisão do spec

---

## 1. Objetivo

Um portfólio de desenvolvedor que sirva a três leitores diferentes, nesta ordem de prioridade:

1. **Recrutador técnico / CTO** que abre o link por 90 segundos e precisa concluir "esse cara constrói sistemas de verdade".
2. **Cliente potencial** avaliando se contrata um projeto.
3. **Motor de IA** (ChatGPT, Claude, Perplexity) respondendo "quem é Neto Alves e o que ele construiu".

O terceiro leitor é um requisito de primeira classe, não um extra — ver §7.

**Não-objetivos:** blog, área logada, CMS, tráfego orgânico por palavra-chave genérica, tema claro.

## 2. Posicionamento

**Arquiteto de sistemas com especialidade em IA aplicada.** Híbrido, mas com hierarquia clara: a espinha é a capacidade de projetar e entregar sistemas de produção completos; a IA aplicada é a especialidade que diferencia, não o guarda-chuva.

Título no hero (proposto, sujeito a ajuste do dono):

> **Arquiteto de sistemas**
> IA aplicada em produção

O texto deve fugir de dois clichês: "apaixonado por tecnologia" e "transformo café em código". O tom é o de alguém que já operou o que construiu — sóbrio, específico, com números.

## 3. Conceito visual

O site **é** o painel de operação dos sistemas que o Neto construiu. A metáfora é literal, não decorativa: cada projeto é um nó com telemetria real, extraída por medição do código-fonte. O visitante monitora os sistemas em vez de ler sobre eles.

Isso é o que torna o terminal interativo (§6.7) parte da ideia em vez de truque colado, e é o que os números do §4 justificam.

**Antídotos contra o clichê "filme hacker"**, que são regras de implementação:

- Zero verde-matrix. Zero chuva de caracteres. Zero fonte "cyber".
- Tipografia sóbria e hierarquia clássica fazem o trabalho pesado; o efeito é o tempero.
- Todo número exibido tem procedência declarada (§4.3).

### 3.1 Paleta — "Mono + dado colorido"

A cor da marca é neutra. **Cor é informação, nunca decoração.** Isso mantém verde/âmbar/vermelho livres para significarem o que significam numa sala de controle, e é o que dá o acabamento caro.

| Token | Hex | Uso |
|---|---|---|
| `--bg` | `#08090C` | fundo da página (preto azulado, não `#000`) |
| `--surface` | `#101317` | cards, painéis |
| `--surface-2` | `#161A20` | elevação, hover |
| `--border` | `#1F232B` | bordas de 1px |
| `--text` | `#F5F3EF` | texto principal (osso) — também o acento da marca |
| `--muted` | `#878C96` | texto secundário, labels mono |
| `--faint` | `#4A505A` | grid técnico, divisórias |

Cores **semânticas**, permitidas só quando carregam significado:

| Token | Hex | Significado |
|---|---|---|
| `--ok` | `#4ADE80` | `● OPERACIONAL` — sistema no ar |
| `--warn` | `#FFB020` | `● PROPRIETÁRIO` — código fechado |
| `--off` | `#6B7280` | `● ARQUIVADO` |
| `--data` | `#38BDF8` | arestas do grafo WebGL, séries de dados |

**Regra de acessibilidade:** status nunca é comunicado só por cor. Sempre ponto + rótulo escrito.

### 3.2 Tipografia

| Papel | Fonte | Notas |
|---|---|---|
| Display / headline | **Geist** | grotesca moderna, licença livre, self-hosted |
| Mono / telemetria | **Geist Mono** | labels, terminal, números pequenos, status |
| Corpo | **Geist** regular | 16px base, medida de 65–75 caracteres |

Fontes **self-hosted** em `woff2` com `font-display: swap` e `preload` da variante de display. Nada de Google Fonts por CDN — é uma requisição de terceiro no caminho crítico e um vazamento de IP do visitante.

### 3.3 Textura

Grid técnico de 1px em `--faint` com opacidade muito baixa, e uma camada de ruído sutil por SVG inline. Ambos puramente decorativos, ambos `aria-hidden`.

## 4. Telemetria — os números

### 4.1 Contadores do hero

| Número | Valor | Composição |
|---|---|---|
| Linhas de código | **250.000+** | soma medida, ver §4.2 |
| Commits | **1.675** | soma dos repositórios com git local |
| Sistemas | **9** | projetos de software distintos |
| Em produção | **5** | com evidência de deploy no repositório |

### 4.2 Composição auditável

Medição feita por varredura de arquivos de código (`.ts .tsx .js .jsx .astro .sql .prisma .css`), excluindo `node_modules`, `dist`, `.next`, `.git` e relatórios de cobertura.

| Sistema | Linhas | Commits | Produção |
|---|---:|---:|---|
| OSCapstack CRM | 78.900 | 444 | sim — VPS, blue-green, E2E noturno contra prod |
| Moveis.pro | 56.500 | 231 | sim — `docker-compose.prod` + runbook de VPS |
| Saturno Labs | 37.672 | 798 | não — deploy gated, sem ambiente provisionado |
| Academia SaaS | 35.400 | n/d | sim — `deploy.sh` + PM2 + Nginx |
| Fluxo Eventos | 25.900 | 88 | não — sem remote |
| PRISM 3D | 12.900 | 17 | sim — GitHub Pages via Actions |
| Moveis.pro site | 11.700 | 69 | sim — Netlify |
| FluxoPost | 5.970 | 28 | não |
| Otoni Robô | 620 | n/d | não |
| **Total** | **265.562** | **1.675** | **5** |

O headline usa **250.000+** e não 265.562: arredondar para baixo é mais defensável do que precisão falsa sobre uma soma de medições aproximadas. Os commits do Academia SaaS não entram porque o repositório não está nesta máquina.

Telemetria secundária, para os cards e case studies:

- **214** tabelas de banco modeladas (60 + 56 + 40 + 27 + 23 + 8)
- **459** endpoints HTTP (240 + 219, nos dois sistemas com contagem verificada)
- **130** migrations SQL versionadas (57 + 73)
- **1.270** casos de teste automatizados (1.102 + 168)

### 4.3 Regra de honestidade

Todo número no site tem um `<abbr>`/tooltip declarando **como foi medido**. Exemplo: *"265.562 linhas — soma de arquivos de código em 9 repositórios, excluindo dependências e artefatos de build. Medido em 2026-08-02."*

Isso não é escrúpulo decorativo: é o diferencial. Qualquer portfólio afirma "+200k linhas"; declarar o método é o que separa engenheiro de vendedor — e é coerente com o que os sistemas do Neto fazem (§6.5, Saturno Labs).

## 5. Arquitetura técnica

### 5.1 Stack

| Camada | Escolha | Motivo |
|---|---|---|
| Framework | **Next.js 16**, App Router, `output: 'export'` | HTML estático completo por rota — requisito de GEO (§7) |
| Linguagem | TypeScript, `strict` | |
| Estilo | Tailwind CSS v4 + tokens CSS custom properties | tokens em `@theme` para casar com a §3.1 |
| Animação | **Motion** (`motion/react`) | scroll-reveal, contadores, transições |
| 3D | **three.js** via `@react-three/fiber` + `drei` | cena do hero (§6.2) |
| Testes | **Vitest** + Testing Library; **Playwright** para E2E | |
| Lint | ESLint 9 flat config + `eslint-plugin-jsx-a11y` | |
| CI/CD | GitHub Actions → GitHub Pages | |
| Formulário | **Web3Forms** | não há servidor; ver §5.4 |

### 5.2 Rotas

```
/[locale]                      home (âncoras: #sobre #sistemas #stack #terminal #contato)
/[locale]/sistemas/[slug]      case study
/[locale]/cv                   fonte do PDF (§9) — não indexada
```

`locale ∈ { pt, en }`, `slug ∈ { oscapstack, saturno-labs, moveis-pro }` → **8 páginas públicas** (2 homes + 6 case studies) mais **2 rotas de impressão** (`/pt/cv`, `/en/cv`).

As rotas `/cv` existem só como alvo do gerador de PDF: ficam fora do `sitemap.xml`, levam `<meta name="robots" content="noindex">` e não recebem link de navegação. Quando o spec fala em "8 rotas", são as públicas.

`/` faz redirect para `/pt` por `<meta http-equiv="refresh">` na `app/page.tsx` exportada (não há servidor para 302). `generateStaticParams` cobre todas as combinações.

### 5.3 i18n

O `i18n` nativo do Next **não funciona** com `output: 'export'`. A implementação é manual e deliberada:

- Dicionários em `content/pt.ts` e `content/en.ts`, tipados por um mesmo `type Dictionary` — assim uma chave faltando em EN quebra o `tsc`, não o site em produção.
- Todo conteúdo (inclusive os case studies) vive nesses dicionários. Nada de string solta em componente.
- Seletor PT/EN troca o prefixo da rota preservando a âncora atual.
- `<html lang>` correto por rota e `<link rel="alternate" hreflang>` recíproco entre pares.

### 5.4 Formulário de contato

Sem servidor, então: **Web3Forms** por `POST` direto do navegador. Chave pública em `NEXT_PUBLIC_WEB3FORMS_KEY`.

- Honeypot oculto contra bot.
- Estados explícitos: idle / enviando / sucesso / erro, com mensagem legível em cada um.
- **Degradação obrigatória:** sem a chave configurada, o formulário não aparece quebrado — ele é substituído por WhatsApp + e-mail com um aviso discreto. Falha fechada, nunca um botão que engole a mensagem do visitante.

### 5.5 Deploy

GitHub Actions em push na `main`: `install → lint → typecheck → test → build → deploy`. Publica em GitHub Pages.

`basePath` e `assetPrefix` lidos de `process.env.NEXT_PUBLIC_BASE_PATH`, default `/portfolio`. Trocar para domínio próprio depois é uma variável, não uma refatoração.

`.nojekyll` na raiz do artefato — sem ele o Pages ignora `_next/`.

## 6. Seções

### 6.1 Boot

Sequência de inicialização de ~400ms na primeira visita da sessão (marcada em `sessionStorage`, não repete a cada navegação). Linhas mono aparecendo em sequência, encerrando no hero.

Com `prefers-reduced-motion: reduce`, é pulada inteiramente — o hero aparece direto.

### 6.2 Hero

Nome, título (§2), badge de disponibilidade, e a **constelação WebGL**: cada nó é um sistema, o raio é proporcional às linhas de código, e as arestas ligam sistemas que compartilham tecnologia. Rotação lenta contínua, com parallax suave seguindo o mouse.

Regras não negociáveis:

- Carregada por `next/dynamic` com `ssr: false`, **depois** do LCP. Nunca entra no HTML inicial.
- **Fallback SVG estático** — mesmo grafo, desenhado — quando: WebGL indisponível, `prefers-reduced-motion`, ou largura < 768px.
- `frameloop="demand"` quando fora da viewport; a cena não gasta GPU rolando a página.

### 6.3 Telemetria

Os 4 contadores do §4.1 animando de 0 ao valor na entrada em viewport, com tooltip de procedência (§4.3). Com reduced-motion, aparecem já no valor final.

### 6.4 Sobre

**Espaço da foto reservado e demarcado**: moldura no lugar certo, com proporção e tratamento já definidos (retrato 4:5, `object-cover`, borda de 1px em `--border`, dessaturação leve revertida no hover). Enquanto não há foto, mostra um placeholder explícito. Substituir é trocar um arquivo em `public/` — nenhuma mudança de layout.

Texto de posicionamento + **formação**:

> **HarvardX · Harvard University**
> CS50x — Introduction to Computer Science
> CS50 AI — Introduction to Artificial Intelligence with Python
> CS50B — Computer Science for Business Professionals
> CS50L — CS50 for Lawyers

Rotulado como **certificações**, jamais como graduação. A combinação (CS + IA + negócios + direito) é apresentada como o que explica a atuação em produtos regulados — crédito imobiliário, LGPD, compliance publicitário.

### 6.5 Sistemas

Três cards grandes, cada um com badge de status, telemetria própria e link para o case study.

| Sistema | Status | Telemetria do card |
|---|---|---|
| **OSCapstack CRM** | `● OPERACIONAL` `● PROPRIETÁRIO` | 78.900 linhas · 56 tabelas · 146 RLS policies · 219 endpoints |
| **Saturno Labs** | `● PROPRIETÁRIO` | 37.672 linhas · 14 packages · 60 tabelas · 240 endpoints · 1.102 testes |
| **Moveis.pro** | `● OPERACIONAL` | 56.500 linhas · 40 models · 231 commits · multi-tenant |

### 6.6 Stack

Não é nuvem de ícones. Grade por camada, com nível declarado honestamente em três graus: **domínio** (usado em produção, sei depurar), **produção** (já entreguei com), **contato** (usei, não reivindico profundidade).

Camadas: Linguagens · Backend · Dados · Infra & Deploy · IA aplicada · Front-end.

Só entra tecnologia comprovada em código nos repositórios auditados. Nada aspiracional.

### 6.7 Terminal

Seção full-bleed com um terminal funcional de verdade.

**Comandos:** `help` · `whoami` · `stats` · `projects [--stack <tech>]` · `stack` · `contact` · `cv` · `lang <pt|en>` · `clear` · `theme` (responde que só existe o escuro, e por quê) · 2 easter eggs (`sudo`, `matrix`).

**Requisitos:**

- `<input>` real, não `contenteditable` — teclado, IME, colar e leitor de tela funcionam de graça.
- Histórico com setas ↑/↓; `Tab` completa comando.
- Saída em região `aria-live="polite"`.
- Não sequestra o scroll da página nem captura teclas fora de foco.
- É **enriquecimento, não requisito**: tudo que o terminal informa também está em HTML na página. Um visitante que ignora o terminal não perde nada — e o crawler idem.

### 6.8 Contato

Formulário (§5.4) + WhatsApp com mensagem pré-preenchida + download do CV + GitHub + LinkedIn.

## 7. SEO e GEO

O requisito que motivou a escolha de Next.js SSG: **GPTBot, ClaudeBot e PerplexityBot não executam JavaScript.** Leem o HTML bruto da resposta e vão embora, sem fila de renderização e sem segunda tentativa. O mesmo vale para os crawlers de preview de link do LinkedIn, WhatsApp e Slack — o dano mais imediato num portfólio, porque é assim que o link chega ao recrutador.

Requisitos verificáveis:

1. **Todo conteúdo textual no HTML inicial** de cada uma das 8 rotas. Verificação: `curl` na rota e conferir presença do texto — vira teste no CI.
2. **Open Graph e Twitter Card completos** por rota, com imagem OG de 1200×630 gerada por rota.
3. **JSON-LD** `Person` na home (nome, cargo, `sameAs`, `knowsAbout`) e `CreativeWork` em cada case study.
4. **`llms.txt`** na raiz — mapa do site em texto para agentes de IA.
5. `sitemap.xml` e `robots.txt` gerados no build, com `hreflang` recíproco.
6. Título da home otimizado para busca pelo nome: `Neto Alves — Arquiteto de Sistemas`.

## 8. Acessibilidade e performance

**Orçamento:** Lighthouse ≥ 95 em Performance, Acessibilidade, Best Practices e SEO, medido no build de produção. LCP < 2,0s em 4G simulado. JS inicial < 120 KB comprimido, **sem contar** a cena WebGL (que é sob demanda e nunca no caminho crítico).

- `prefers-reduced-motion: reduce` desliga boot, contadores, scroll-reveal, parallax e a cena 3D (que cai no fallback SVG).
- Navegação completa por teclado, com foco visível em `--text` e skip-link.
- Contraste AA mínimo em todo texto; AAA no corpo.
- Marcos semânticos (`header`/`nav`/`main`/`footer`), um `h1` por página, hierarquia sem pulos.
- Toda decoração é `aria-hidden`.

## 9. CV em PDF

Gerado neste projeto, em PT e EN, a partir dos mesmos dicionários de conteúdo do §5.3 — **fonte única de verdade**: mudar o número no site muda no CV, sem divergência.

Rota `/[locale]/cv` estilizada para impressão via `@media print` (fundo branco, tipografia preta, sem decoração), exportada para `public/cv/neto-alves-{pt,en}.pdf` por um script de build com Playwright. Conteúdo: identificação, posicionamento, os 3 sistemas com números, stack por camada, certificações HarvardX, contatos.

## 10. Estrutura de pastas

```
portfolio/
├─ .github/workflows/deploy.yml
├─ app/
│  ├─ layout.tsx
│  ├─ page.tsx                        redirect → /pt
│  └─ [locale]/
│     ├─ layout.tsx                   <html lang>, metadata, JSON-LD
│     ├─ page.tsx                     home
│     ├─ cv/page.tsx                  layout de impressão
│     └─ sistemas/[slug]/page.tsx     case study
├─ components/
│  ├─ layout/                         Header, Footer, LocaleSwitch, SkipLink
│  ├─ sections/                       Boot, Hero, Telemetry, About, Systems, Stack, Terminal, Contact
│  ├─ three/                          ConstellationCanvas, ConstellationFallback
│  ├─ terminal/                       Terminal, useTerminal, commands/
│  └─ ui/                             StatusBadge, Counter, Metric, Reveal, Section
├─ content/
│  ├─ types.ts                        type Dictionary — o contrato
│  ├─ pt.ts  en.ts
│  └─ systems.ts                      dados medidos, neutros de idioma
├─ lib/                               seo.ts, jsonld.ts, measure.ts
├─ public/                            fonts/, cv/, og/, foto (a receber), llms.txt
├─ scripts/                           generate-og.ts, generate-cv-pdf.ts
├─ tests/                             unitários + e2e (inclui o teste de HTML estático do §7.1)
└─ docs/superpowers/specs/            este arquivo
```

## 11. Pendências de dados

Nenhuma bloqueia a implementação. Cada uma tem comportamento definido enquanto não chega:

| Item | Comportamento até chegar |
|---|---|
| **Foto** | placeholder demarcado na moldura final (§6.4) |
| **LinkedIn** | link omitido do rodapé e do CV; sem espaço vazio |
| **DDD do WhatsApp** | `90` não é DDD válido no Brasil. O botão fica **desabilitado** com aviso no build até correção — melhor que um link quebrado em produção |
| **Chave Web3Forms** | formulário substituído por WhatsApp + e-mail (§5.4) |
| **Graduação além dos CS50** | seção lista só as certificações HarvardX |
| **Título do hero** | usa o proposto no §2 |

## 12. Riscos assumidos

| Risco | Mitigação |
|---|---|
| Um único repositório clicável (Moveis.pro); os outros dois cases são fechados | Case studies densos em decisão técnica compensam. Faixa "outros sistemas" com PRISM 3D e Otoni Robô fica como opção barata se o dono quiser depois. |
| Cena WebGL pesa em máquina fraca | Sob demanda, fora do caminho crítico, com fallback SVG em três condições (§6.2) |
| Terminal ser lido como truque | Comandos devolvem conteúdo real e útil; tudo redundante em HTML (§6.7) |
| Paleta monocromática ficar sem graça | O acabamento vem de espaçamento, tipografia e ritmo. É o ponto de maior atenção na implementação. |
| URL com nome da org (`labsfluxo-stack.github.io/portfolio`) | `basePath` por variável de ambiente; migrar para domínio próprio é trocar um valor (§5.5) |
| Números do site divergirem da realidade com o tempo | Procedência e data de medição declaradas em cada número (§4.3) |

## 13. Critérios de aceitação

1. As 8 rotas retornam HTML com todo o conteúdo textual — verificado por teste automatizado, não por inspeção manual.
2. Lighthouse ≥ 95 nas quatro categorias, no build de produção.
3. Navegação e terminal 100% operáveis por teclado.
4. Com `prefers-reduced-motion`, nada anima e a página continua completa.
5. Sem WebGL, o hero mostra o fallback SVG sem erro no console.
6. PT e EN completos; chave faltando em qualquer idioma quebra o `tsc`.
7. Preview de link renderiza corretamente no LinkedIn e no WhatsApp.
8. CV em PDF gerado nos dois idiomas, com os mesmos números do site.
9. `lint`, `typecheck`, `test` e `build` verdes no CI.
10. Publicado e acessível no GitHub Pages.
