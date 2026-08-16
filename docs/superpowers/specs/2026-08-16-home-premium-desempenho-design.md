# Home escura — a cena volta a rodar, e a luz entra

**Data:** 2026-08-16 · **Rotas:** `/[locale]` (home) e `/[locale]/sistemas/[slug]` (case
studies) · **Origem:** seis referências trazidas pelo dono — bklit.com, magicui.design,
reactbits.dev, kokonutui.com, animejs.com, rive.app.

Continuação de [`2026-08-11-landing-captacao-design.md`](2026-08-11-landing-captacao-design.md),
com uma inversão. As mesmas seis referências já renderam a camada premium da landing
(`/[locale]/projetos`), e o commit que a entregou descartou metade do catálogo com este
argumento:

> "Cinco das seis são catálogos de efeito para FUNDO ESCURO — Aurora, Meteors, Light Rays,
> Neon Gradient, glass morphism, Beams. Sobre papel `#F5F3EF` um brilho é invisível e um
> *shine* não tem contra o que brilhar."

Correto para a landing. **A home é `#08090C`.** Tudo que foi descartado por não ter contra
o que brilhar funciona nesta página — as referências não eram fracas, estavam apontadas
para a superfície errada.

Só que a home tem um problema antes de ter uma oportunidade: a cena 3D do pórtico roda a
poucos quadros, e o relato do dono é de travamento em três momentos — nos primeiros
segundos, durante a rolagem, e de forma contínua na própria cena.

## 1. Objetivo

Duas metas, e a ordem entre elas não é negociável:

1. **A cena 3D volta a rodar em taxa decente na máquina do visitante**, inclusive na
   fraca. Hoje a proteção que existe para isso está desligada por um defeito.
2. **A home ganha a camada premium que a polaridade escura permite** — e que a landing,
   por ser de papel, não pôde receber.

Empilhar luz sobre uma página que roda a 15 quadros por segundo é decorar um problema. A
meta 2 só começa depois da meta 1 medida.

## 2. O diagnóstico

### 2.1 A escada de qualidade se calibra pela própria lentidão

`Portico.tsx` tem uma escada de degradação (`TIERS` + `useQuality`) que mede os quadros e
rebaixa a cena sozinha quando a máquina não aguenta. Ela não está disparando.

O orçamento de quadro sai do período do vsync, medido durante o aquecimento
(`Portico.tsx:436`):

```js
if (delta > 1 / 240 && delta < own.vsync) own.vsync = Math.min(delta, 1 / 20)
```

A intenção é boa e a maioria dos medidores erra isso: comparar contra 16,7 ms fixos
rebaixaria uma cena perfeita num painel de 30 Hz. Medir o quadro **mais rápido** do
aquecimento descobre a taxa real do monitor, e o mesmo código serve em 30, 60 e 144 Hz.

O defeito é que **durante o aquecimento a cena já está renderizando**:

- Numa máquina com folga, o quadro mais rápido é limitado pelo vsync. A medição acerta.
- Numa máquina sem folga, o quadro mais rápido é limitado pelo **custo da própria cena**.
  O orçamento passa a ser 2,2 × aquilo que a cena já custa — e a cena não estoura um
  orçamento derivado dela mesma.

Com os números, no pior caso. Qualquer máquina abaixo de 20 fps prende `vsync` no teto do
clamp:

```
vsync = min(delta, 1/20)          = 0,050 s
slow  = max(0,050 × 2,2, 1/45)    = 0,110 s  →  9 quadros por segundo
```

**A cena só rebaixa abaixo de 9 fps.** Rodando a 15 fps, os 66 ms cabem folgados nos 110 ms
de orçamento, a escada conclui que está tudo bem e fica parada no degrau inicial para
sempre. A proteção se desliga exatamente nas máquinas para as quais ela existe.

> Este diagnóstico é leitura de código, não medição. A primeira tarefa do plano é um teste
> que reproduz o defeito — alimentar `watch()` com deltas de 15 fps e provar que hoje ela
> não rebaixa. Se o teste não reproduzir, o diagnóstico está errado e o plano volta para a
> mesa.

### 2.2 Três segundos a custo cheio

`WARMUP` é de 3 s, e nenhuma decisão acontece antes disso — mais `SETTLE`, a primeira
correção real sai depois de ~4,5 s. Numa máquina fraca esses são os segundos em que o
visitante está chegando e rolando. É o sintoma "trava nos primeiros segundos".

### 2.3 A rolagem disputa a thread com o WebGL

`components/ui/Reveal.tsx` usa `motion/react` com `whileInView`: animação em JavaScript, na
thread principal, exatamente durante a rolagem em que a cena 3D está desenhando. Ele
embrulha About, Systems, Stack e Contact — a página inteira abaixo do hero.

A landing já resolveu o mesmo efeito sem JavaScript, com `animation-timeline: view()`, no
compositor. Aqui a troca não é só de técnica: é liberar a thread que a cena disputa.

### 2.4 Comentário obsoleto que contradiz o código

O bloco em `Portico.tsx:346` afirma "**Só desce.** Subir de volta exigiria histerese". O
código em `Portico.tsx:469` **sobe** desde um commit posterior, com histerese assimétrica
documentada ali mesmo. Os dois comentários coexistem e se contradizem. Corrigir junto.

## 3. Escopo — duas superfícies

| Superfície | O que recebe |
|---|---|
| `/[locale]` — home escura | Fases 1 a 4: correção da escada, reveals no compositor, luz, matéria |
| `/[locale]/sistemas/[slug]` — case studies | Fase 5: construção na rolagem |

A terceira direção escolhida pelo dono (construção na rolagem) **não tem onde pousar na
home**: as seções da home não contêm um único `<svg>`. `SystemArt` e `SystemDiagram`
renderizam em `components/sections/CaseStudy.tsx`, que é das páginas de sistema — a um
clique da home, e onde o efeito é mais forte do que seria na landing: um diagrama de
arquitetura que se constrói sozinho é o efeito descrevendo o próprio conteúdo.

## 4. Fase 1 — a escada volta a proteger

### 4.1 Medir o vsync antes de a cena existir

O período do monitor é medido **fora do Portico**, em `PorticoSlot`, na janela em que ele
já espera ociosidade. Nessa janela a página está parada: ~12 quadros de
`requestAnimationFrame` fazendo uma subtração devolvem a taxa real, sem contaminação do
custo da cena. O valor entra no `Portico` como propriedade, pronto.

Regras da medição:

- Só entram deltas dentro de faixa plausível — maiores que `1/240` e menores que `1/20`.
  Fora disso é quadro coalescido ou aba que voltou do segundo plano, não taxa de monitor.
- O resultado é o **menor** delta plausível da amostra.
- Se nenhuma amostra for plausível, o padrão é `1/60`. Nunca `Infinity`: um valor ausente
  precisa aterrissar num número defensável, não desligar a proteção — que é o defeito que
  esta fase existe para corrigir.

### 4.2 O clamp vira rede de segurança de verdade

O teto do clamp cai de `1/20` (50 ms) para `1/30` (33,3 ms). **Não existe monitor mais
lento que 30 Hz**, então nenhuma medição honesta produz valor maior. Com ele, mesmo que a
medição prévia saia suja, o pior orçamento possível passa a ser
`max(0,0333 × 2,2, 1/45) = 73 ms` em vez dos 110 ms de hoje.

O multiplicador `2,2` e o piso `1/45` ficam como estão: com um vsync correto de 16,7 ms o
orçamento dá 36,7 ms, que é o "não segurar metade da taxa do monitor" que o comentário já
descreve.

### 4.3 O aquecimento encurta

Com o vsync chegando de fora, `WARMUP` não precisa mais aprender a taxa do monitor — só
cobrir compilação de shader e envio de textura. Passa a ~1,2 s.

**O número sai de medição, não de escolha.** O plano instrumenta os primeiros quadros e
confirma onde a compilação termina; se for depois de 1,2 s, o valor é o medido.

### 4.4 Portão desta fase

Antes de qualquer coisa da fase 3 em diante:

- Teste unitário que reproduz o defeito (deltas de 15 fps não rebaixam hoje) e passa a
  falhar depois da correção.
- Medição antes/depois com a CPU estrangulada em 4× no DevTools, e num aparelho de toque
  real. Número de quadros registrado no commit, não estimado.
- Se a cena não recuperar taxa decente, **a conversa sobre premium muda de assunto** e
  passa a ser sobre reduzir o escopo da cena. Ver §9.

## 5. Fase 2 — os reveals saem da thread principal

### 5.1 A troca

`Reveal.tsx` troca `motion/react` pelas classes `.revelar` / `.revelar-titulo` que já
existem em `app/globals.css` e já foram testadas nos três motores pela landing. O DOM
resultante é o mesmo: uma `div` com `className` opcional, mantendo o truque de "grade de um
item só" que os cards dependem para altura uniforme.

Consequências, e as duas são ganho:

- **O pacote `motion` sai do projeto.** `Reveal.tsx` é o único importador — confirmado por
  varredura. Remover de `package.json`.
- **`Reveal` deixa de ser Client Component.** Ele carrega `'use client'` só por causa do
  `motion` e do `usePrefersReducedMotion`; sem os dois, vira componente de servidor e
  quatro fronteiras de cliente desaparecem da home. O bloco global de
  `prefers-reduced-motion` em `globals.css` já cobre a preferência, com
  `animation-timeline: auto !important` — o guarda que a landing precisou descobrir.
- **Corrige um defeito latente de layout, de brinde.** Hoje, com movimento reduzido,
  `Reveal` devolve `<>{children}</>` e **some com a `div` embrulhadora** — junto com o
  `className="grid"` de que `Stack` e `Systems` dependem para os cards manterem altura
  uniforme na fileira. Quem pede menos movimento recebe hoje uma grade desalinhada. Na
  versão em CSS o embrulho existe sempre e só a animação muda de estado.

`usePrefersReducedMotion` e `lib/motion.ts` **ficam**: `Boot.tsx` e `Counter.tsx` também
os usam.

### 5.2 A armadilha do escalonamento

**`delayMs` não porta, e falha em silêncio.**

Timeline de rolagem **ignora duração e atraso** — quem define o progresso é a posição da
barra de rolagem. É o mesmo mecanismo documentado em `globals.css:356`, que obriga o bloco
de movimento reduzido a devolver a animação para `animation-timeline: auto`.

Portado ingenuamente, `animation-delay` é aceito, não faz nada, e ninguém percebe até
alguém comparar as duas versões lado a lado.

Chamadas afetadas hoje:

| Arquivo | Escalonamento atual |
|---|---|
| `Stack.tsx:102` | `delayMs={100 + i * 80}` |
| `Contact.tsx` | `100` / `200` / `300` / `400` |
| `About.tsx:31` | `150` |
| `Systems.tsx` | escalonado por índice |

A propriedade passa de `delayMs` (milissegundos) para `ordem` (índice inteiro, começando em
zero), e o escalonamento vira deslocamento da faixa, não do relógio:

```css
.revelar { --i: 0; }

@supports (animation-timeline: view()) {
  .revelar {
    animation-range: entry calc(10% + var(--i) * 6%) entry calc(70% + var(--i) * 6%);
  }
}
```

`ordem` chega ao CSS como `style={{ '--i': ordem }}` no próprio embrulho — variável
personalizada em atributo `style`, não classe por índice, porque o valor é numérico e
entra num `calc`. O fallback `var(--i, 0)` cobre quem não passar a propriedade.

Os quatro pontos de chamada são atualizados junto. O raio de alcance é pequeno e conhecido.

### 5.3 Portão desta fase

- Tamanho do bundle da home antes e depois, medido.
- Teste que prova que o escalonamento continua existindo — não basta a revelação
  acontecer, os itens precisam entrar em ordem.
- Bancada nos três motores: com suporte, revela; sem suporte (Firefox), aparece pronto.

## 6. Fase 3 — luz, com orçamento

**A regra é do próprio projeto: uma animação infinita por página.** A borda viva gastou o
orçamento da landing; a home ainda não gastou o dela. Movimento perpétuo espalhado vira
ruído e passa de caro a barato.

### 6.1 Facho atrás do hero — estático

Um `radial-gradient` mascarado atrás da cena, dando de onde vem a luz que o aço reflete.
Não se move. Custo de pintura: uma vez.

### 6.2 Aurora atrás do Boot — a única coisa que se move

Blob desfocado, deriva lenta (~24 s por ciclo), **movido só por `transform`**.

A distinção é o que torna isso barato: uma camada desfocada é rasterizada **uma vez** e
depois só movida pelo compositor. Animar `background-position` ou o ângulo de um cônico
repintaria a área inteira a cada quadro — numa página que já está com dificuldade, é
exatamente o custo que não se pode pagar. É a mesma razão pela qual a landing manteve
`filter: blur()` só nos títulos.

Esta é a **única** animação infinita da home. O teste de orçamento que a landing já tem é
estendido para cobrir esta página.

### 6.3 Brilho de borda nos cards — no hover

Gradiente em 1px revelado por opacidade no `:hover`, seguindo a gramática do bklit: borda,
não sombra. Reaproveita a técnica de máscara de `.borda-viva`, sem a rotação.

### 6.4 Contra o vidro — divergência assumida

O dono marcou "matéria e textura", que inclui painel de vidro. **`backdrop-filter` fica de
fora do hero, e isto é uma divergência deliberada.**

`backdrop-filter` repinta a camada a cada quadro, e o que está atrás dela é um canvas WebGL
sendo redesenhado. É o mesmo custo que `globals.css:141` já rejeitou para `filter: blur()`
em bloco grande, agravado: lá o fundo era estático.

A gramática do bklit — borda de 1px e superfície tingida — entrega a mesma leitura de
painel por custo de composição. Se o dono quiser vidro de verdade depois de ver o
resultado, ele entra em seção sem canvas atrás, nunca no hero.

## 7. Fase 4 — matéria

- **Grão:** `feTurbulence` embutido como `data:` URI, opacidade ~0,03, repetido. Estático,
  sempre. `pointer-events: none`.
- **Vinheta:** `radial-gradient` fechando as bordas.

Os dois vivem no **fundo da página, atrás do canvas**. Como o canvas é criado com
`alpha: true`, a textura lê através das áreas onde a cena não pinta — que é o resultado
desejado — e custa uma composição em vez de uma cadeia de repintura sobre um alvo que muda
todo quadro.

Nada nesta fase se move.

## 8. Fase 5 — construção nos case studies

`SystemArt.tsx` (16 formas) e `components/diagrams/parts.tsx` (rects, lines, paths) recebem
o mecanismo `.arte-viva` / `.traca` / `.preenche` já escrito e testado em `globals.css`.

### 8.1 `pathLength` fecha o argumento do anime.js

O commit anterior admitiu um caso sem fórmula: `<path>` arbitrário, cujo comprimento só a
`svg.createDrawable` do anime.js calcularia em runtime. `parts.tsx` tem três.

**`pathLength="1"` resolve.** O atributo normaliza o comprimento declarado da forma para 1,
então `stroke-dasharray: 1` cobre qualquer geometria sem medir nada — em tempo de build,
sem biblioteca. Fecha o argumento daquele commit também para este caso.

**A verificar empiricamente antes de virar padrão:** `pathLength` em `<path>` é universal;
em `<rect>` e `<line>` é adição do SVG 2, com suporte bom mas não idêntico entre motores.
A bancada testa nos três. Se algum discordar, rects e lines voltam ao perímetro calculado
(`2 × (largura + altura)`), que já é o que a landing faz, e `pathLength` fica só nos paths.

### 8.2 O que não se traça

`parts.tsx` tem elementos `<text>`. Texto não recebe `.traca` — traçar contorno de letra
lê como erro de renderização, não como construção. Texto entra por `.preenche` ou fica
fora do efeito.

### 8.3 Degradação

Igual à da landing, e pelo mesmo motivo: **nenhum estado inicial escondido fora do
`@supports`.** Sem suporte a scroll timeline, a arte aparece pronta — que é o desenho final
de qualquer jeito. O commit anterior descobriu isso da forma cara, com as quatro artes
completamente invisíveis; o erro não se repete.

## 9. Ordem e portões

```
Fase 1 (escada)  →  MEDIR  →  Fase 2 (reveals)  →  MEDIR  →  Fases 3, 4, 5
```

As fases 1 e 2 entram e são medidas **antes de qualquer pixel novo**.

**Plano alternativo, se a fase 1 não recuperar a taxa.** A cena são ~6.450 linhas de
three.js num hero. Se, com a escada consertada, o degrau mais baixo ainda não sustentar
quadros decentes na máquina do dono, o problema não é de afinação — é de escopo, e a
resposta passa a ser reduzir a cena (menos geometria fina, menos luz prática, ou o
fallback em SVG promovido a padrão em mais aparelhos). Essa decisão é do dono e só se
apresenta com números na mão. Não faz parte deste spec.

## 10. Fora de escopo

- **Vidro no hero** (§6.4), com a razão registrada.
- **Qualquer biblioteca de animação nova.** Nem anime.js nem Rive: o primeiro foi medido e
  dispensado no commit anterior, e o §8.1 fecha o último caso que o justificava. Rive
  traria runtime mais asset para fazer o que CSS faz. Numa página cujo argumento é que ela
  carrega rápido, embarcar runtime para *parecer* cara contradiz o que está sendo vendido.
- **Pós-processamento na cena 3D.** Já foi medido e cortado antes.
- **Reduzir o escopo da cena 3D.** Fica em reserva, ver §9.
- **A landing `/[locale]/projetos`.** Já recebeu a camada dela; não se mexe aqui.

## 11. Como se verifica

Além dos portões por fase (§4.4, §5.3):

- Nenhum elemento preso abaixo de opacidade 1 depois de percorrer a home inteira.
- Zero overflow horizontal.
- Orçamento de uma animação infinita, agora medido também na home.
- `prefers-reduced-motion` ligado: tudo visível de imediato, cena 3D não monta, nada se
  move — nos três motores.
- Sem suporte a scroll timeline: home e case studies aparecem completos, nunca em branco.
- `npm run lint`, `npm run typecheck`, `npm test` e a bancada Playwright passando.
