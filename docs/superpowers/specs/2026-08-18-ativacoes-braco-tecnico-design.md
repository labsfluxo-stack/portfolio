# Ativações — "O braço técnico da agência"

**Data:** 2026-08-18 · **Rota:** `/[locale]/ativacoes` · **Landing irmã:**
[`2026-08-11-landing-captacao-design.md`](./2026-08-11-landing-captacao-design.md)

Terceira página do repositório com público próprio. O portfólio fala com recrutador; a
`/projetos` fala com dono de empresa; esta fala com **agência de live marketing** — quem
vende a ativação para a marca e precisa de alguém que construa e garanta que roda no dia
do evento.

Referência de mercado apontada pelo dono: **Dilis Studio** (Campina Grande/PB, 2017,
advergames, gamificação, AR/VR, produtos "Reflex Rush", "GIF Interativo", "Quiz
Interativo"). Também mapeados: Casa Mais, Antídoto, Phygital Solutions, Promove, Drimify
e as locadoras de totem. **Todos vendem para a marca.** É a lacuna que esta página ocupa:
nenhum deles se posiciona como fornecedor da agência.

## 1. Objetivo

Fazer um atendimento ou diretor de operações de agência sair da página com uma mensagem
no WhatsApp — ou com a certeza de que existe um fornecedor técnico que não vai competir
com ele pelo cliente.

Uma página, um destino.

## 2. Posicionamento

### 2.1 A tese

A agência tem a ideia, o cliente e a verba. O que ela não tem é quem escreva o código e
responda no dia do evento. **A ativação é da agência; o código é nosso.**

Isso não é modéstia comercial, é o que torna a página vendável: o concorrente direto
(Dilis e similares) vende para a marca, e portanto **compete com a agência pelo mesmo
cliente**. Vocês não competem. É o argumento inteiro.

### 2.2 O que se promete, e o que não

**Não existe case de ativação no portfólio.** Nenhuma frase pode sugerir o contrário —
nem "já rodamos em dezenas de eventos", nem número de público impactado, nem logo de
marca. A página que mente sobre isso morre na primeira reunião.

O que se promete é o que se controla e se verifica:

- o software roda no navegador, sem app para baixar
- roda com a internet do estande caindo
- a base de leads sai em formato que a agência entrega ao cliente
- a data do evento não se move, e o cronograma é feito para ela

**Escopo negativo, dito na página:** não há hardware, locação de totem, montagem de
estande, produção física nem promotor. Entregamos o **software** que roda no totem que a
agência já aluga. Sem essa linha a página vira "alugamos totem", que é um negócio de
logística que vocês não têm.

### 2.3 Vocabulário

Entram, porque são as palavras que o mercado usa: **ativação**, **advergame**,
**gamificação**, **totem**, **roleta**, **telão**, **hotsite**, **quiosque**.

Ficam de fora: "phygital", "solução disruptiva", "experiência imersiva" solto,
"engajamento" como substantivo sem objeto, "inovação". São as palavras que todo
concorrente já usa — dizê-las é desaparecer no meio deles.

### 2.4 Tom

A mesma regra de voz do resto do site, que o dono aplicou três vezes: **afirmar, não
justificar**. A página não explica o próprio critério, não convida auditoria, não escreve
"medido em", não diz "o que ajuda vir junto".

## 3. Conceito visual

### 3.1 Polaridade — escura, o padrão do site

Diferente da `/projetos`, esta rota **não inverte polaridade**. Fundo `--color-bg`
(`#08090C`), texto `--color-text` (`#F5F3EF`). Consequência prática: o layout desta rota
não precisa do bloco `html body{background:…}` nem da correção de `:focus-visible` que
`app/[locale]/projetos/layout.tsx` carrega — o anel de foco global já está correto sobre
fundo escuro.

### 3.2 O gesto premium é a tipografia

O que separa esta página das outras não é efeito, é **escala e família**:
`--font-serif` (Instrument, já no projeto e quase não usada) no display da capa e nos
títulos de seção. A `/projetos` usa sans bold; o portfólio usa sans e mono. A serifa é
território livre, e é o registro que agência de criação lê como caro.

Corpo continua em `--font-sans`, rótulo em `--font-mono` — sem terceira família nova.

### 3.3 Cor

`--color-data` (`#38BDF8`) segue como acento de texto e interface, como no resto do
escuro.

**Dentro do canvas** o jogo usa um segundo tom quente, que existe para o alvo ser
distinguível instantaneamente do fundo e do acento. Não há texto no canvas, então o
requisito não é AA de texto: é **WCAG 1.4.11 (contraste de elemento não-textual), mínimo
3:1 contra o fundo do canvas**, medido por `lib/contraste.ts` como todo o resto.

Nenhuma cor nova entra em `@theme` para uso em texto sem passar por `lib/contraste.ts`.

### 3.4 Forma

Borda de 1px no lugar de sombra, como na `/projetos`. Grão e vinheta sobre o preto — a
superfície que a home já ganhou (`c124887`). Nada de carrossel, nada de acordeão.

### 3.5 Movimento

CSS puro, `animation-timeline: view()` e `scroll()`. **Nenhuma biblioteca de animação** —
`motion` foi removida do projeto de propósito.

Duas armadilhas já conhecidas e travadas por teste em
`tests/unit/landing-movimento.test.ts`, que valem igual aqui:

1. estado inicial escondido **fora** do `@supports (animation-timeline: view())` apaga a
   página inteira nos ~16% de navegadores sem scroll timeline;
2. `animation-duration: 0` **não** desliga animação de rolagem — o bloco de
   `prefers-reduced-motion` precisa de `animation-timeline: auto`.

## 4. A capa jogável

A dobra é uma partida de reflexo rodando de verdade. O visitante brinca antes de ler que
vocês fazem jogos, e a mesma peça prova três promessas de uma vez: roda no navegador, sem
app, e liso no celular fraco.

### 4.1 A divisão que torna isso testável

- **`motor-reflexo.ts`** — lógica pura, zero DOM: estado da partida, nascimento de alvos,
  acerto, tempo de reação, fim. Recebe semente e relógio por parâmetro, para o teste ser
  determinístico. Mesma disciplina de `portico-quality.ts` e `portico-yard.ts`.
- **`CapaJogo.tsx`** — client component que só desenha o estado no `<canvas>` e escuta
  ponteiro.

### 4.2 O texto NÃO é desenhado no canvas

`<h1>`, subtítulo e CTA são DOM real posicionado sobre o canvas.

Canvas é invisível para o Google e para os crawlers de IA. A landing irmã de vocês vende
exatamente esse argumento (§2.2 do spec da `/projetos`) — desenhar o título no canvas
seria a contradição mais cara que este repositório poderia publicar. O teste de
`tests/static-html.test.ts` trava isso no HTML exportado.

### 4.3 Regras da partida

- 15 segundos. Alvos nascem em posição pseudo-aleatória com semente.
- Placar: acertos e tempo médio de reação em milissegundos.
- **Modo atrativo:** a partida joga sozinha, com precisão imperfeita, até o primeiro
  evento de ponteiro. Ninguém precisa entender nada para ver movimento.
- Fim de partida mostra o resultado e o CTA "essa mecânica no seu evento".

### 4.4 Acessibilidade

O canvas é `aria-hidden="true"` e não recebe foco, e **nenhuma informação existe apenas
dentro dele**: título, subtítulo, catálogo e CTA vivem em DOM. O jogo é acréscimo; a
página inteira funciona sem ele.

`prefers-reduced-motion: reduce`: sem modo atrativo, alvos parados, sem pulsação — e
**ainda jogável** por toque e clique.

### 4.5 Orçamento de quadro

- `requestAnimationFrame` só com a capa visível (`IntersectionObserver`) e pausado em
  `document.hidden`. Nada de rAF girando fora da tela.
- `devicePixelRatio` limitado a 2.
- Sem `shadowBlur` no canvas — é o custo de desenho mais caro que existe em 2D.
- Sem canvas, a capa cai num fundo estático com grão e gradiente. Nada quebra.

### 4.6 O QR "abra no celular" — opcional, e por quê

SVG gerado no build a partir da URL canônica, por `scripts/generate-qr.mts`, exibido
**só em `md:` para cima** (no celular ele é piada).

Custa uma devDependency (`qrcode`), e dependência nova neste repositório significa
**regerar `package-lock.json` no Linux** ou o deploy quebra em `npm ci` — o npm do Windows
poda `@emnapi/runtime`. Por isso o QR é a **última tarefa do plano**: se a regeneração do
lockfile der trabalho, ele cai sem afetar nada acima dele.

## 5. Seções

| # | Seção | Papel |
|---|-------|-------|
| 1 | Capa jogável | "A ativação é sua. O código é nosso." |
| 2 | Catálogo | Quatro blocos, §5.1 |
| 3 | O que a agência compra | As cinco dores, §5.2 |
| 4 | White-label | Sai com a marca da agência |
| 5 | Prova | Os três sistemas como prova de engenharia |
| 6 | Perguntas | As objeções reais de agência, §5.3 |
| 7 | Chamada final + barra fixa | WhatsApp |

Preço fica `null`, como `landing.piso` na `/projetos`: a seção some sozinha até o dono
decidir o piso.

### 5.1 Catálogo — quatro blocos

- **Jogos e mecânicas** — advergame de marca, quiz, **roleta** (gire-e-ganhe), jogo da
  memória, caça-palavras, desafio de reflexo. No navegador do público via QR ou no totem
  touch.
- **Captura e conteúdo** — GIF e foto com moldura da marca, entrega por QR, WhatsApp ou
  e-mail, boomerang, realidade aumentada no navegador (sem app).
- **Operação** — hotsite promocional com cadastro, regulamento e sorteio; **totem** em
  modo quiosque que funciona sem internet; **telão** ao vivo com ranking, chamada do
  vencedor e mural de fotos.
- **Dados** — lead direto no CRM da marca, base exportável em conformidade com a LGPD,
  API para a agência consultar.

Uma arte SVG por bloco, na disciplina de `components/landing/arte.tsx`: desenho que
argumenta, pequeno, pontuação e não ilustração. A lista de artes é `as const` e indexada
na ordem do dicionário — se alguém acrescentar um quinto bloco, o `tsc` reclama em vez de
a página renderizar um buraco (mesmo padrão de `Oferta.tsx`).

### 5.2 O que a agência compra

Cinco itens, e cada um é um medo real de quem produz evento:

1. **Funciona sem internet no estande.** É a falha número um de ativação digital.
2. **Aguenta fila.** Trinta pessoas em sequência, celular ruim, 4G saturado.
3. **Sem app para baixar.** Ninguém instala nada num estande.
4. **A base sai limpa.** Exportável, com consentimento registrado.
5. **A data do evento não se move.** O cronograma é feito para ela, e alguém responde no
   dia.

### 5.3 Perguntas

Objeções de agência, não de marca:

- E se cair a internet no estande?
- Vocês assinam o projeto? (**Não.** Sai com a marca da agência.)
- Com quanto tempo de antecedência?
- Roda no totem que a gente já aluga?
- Quem fica de plantão no dia do evento?
- Como fica a LGPD do cadastro?

## 6. Arquitetura técnica

### 6.1 Rota

`app/[locale]/ativacoes/page.tsx` + `layout.tsx` próprio, **fora do route group
`(site)`** — sem Header, Footer nem SkipLink, mesma razão da `/projetos`: numa landing
todo item de menu é uma saída.

Fio de progresso no topo, igual. `pb-20 md:pb-0` no **próprio `<main>`**, não em filho —
`BarraCta` é `position: fixed` e padding em qualquer filho de `main` "some"
matematicamente depois do scroll ao fundo. O layout da `/projetos` documenta o porquê.

`generateStaticParams` para os dois locales; `dynamicParams = false`.

### 6.2 Conteúdo

`dict.ativacoes` novo em `content/types.ts`, `content/pt.ts` e `content/en.ts`. Paridade
entre idiomas travada por `tests/content.test.ts`, que já existe.

**Nenhum número escrito à mão.** A contagem de sistemas da seção de prova é computada no
render (`systems.filter((s) => s.production).length`), como em `Prova.tsx` — nunca dígito
no dicionário.

### 6.3 Componentes

Novos em `components/ativacoes/`:

- `CapaJogo.tsx` (client) e `motor-reflexo.ts` (puro)
- `Catalogo.tsx`
- `Compra.tsx` — as cinco dores
- `WhiteLabel.tsx`
- `ProvaEngenharia.tsx`
- `PerguntasAtivacoes.tsx`
- `ChamadaFinal.tsx` — a seção 7 da tabela de §5
- `arte-ativacoes.tsx` — os quatro SVGs

`Fecho` e `LandingCta` **não** são reaproveitados: os dois leem `dict.landing` direto e
carregam a faixa escura que só faz sentido numa página de polaridade clara. Numa rota que
já é escura inteira, a faixa não distingue nada. Daí `ChamadaFinal.tsx` próprio.

Reaproveitados sem alteração: `urlWhatsapp`, `Botao`, `Reveal`, `Section`.

**`BarraCta` precisa ser generalizada:** hoje lê `dict.landing` direto. Passa a receber
rótulo, mensagem e tranquilizador por prop, e a `/projetos` passa a alimentá-la com os
mesmos valores que já usa. É mudança de assinatura sem mudança de comportamento, e o
teste existente da `/projetos` cobre a regressão.

### 6.4 CTA

WhatsApp, via `urlWhatsapp(base, mensagem)`. **O número não mora aqui** — vem de
`contact.whatsapp`, fonte única já publicada pelo portfólio.

A mensagem pré-preenchida cita a página de origem, para o dono saber de onde veio o
contato sem perguntar.

### 6.5 SEO e OG

`buildMetadata` com `path: '/ativacoes'` e `ogImage: /og/${locale}-ativacoes.png`.

Isso **exige estender a lista de slugs de OG** (`content/og.ts`, `app/[locale]/og/[slug]`,
`scripts/generate-og.mts`) e o `tests/unit/og-slugs.test.ts` que a guarda. A landing
anterior teve exatamente essa deriva e ela virou seção própria no spec dela; aqui já
entra como tarefa, não como surpresa.

A rota também entra no sitemap gerado por `scripts/generate-seo-files.mts`.

### 6.6 Desempenho

O site é `output: 'export'` em GitHub Pages, e a régua do repositório é Lighthouse
95/100/100/100. O canvas é o único JavaScript novo de peso, e §4.5 é o orçamento dele.

## 7. Testes

- `tests/unit/ativacoes-motor.test.ts` — motor puro com semente: pontuação, tempo de
  reação, fim de partida, modo atrativo determinístico.
- `tests/unit/ativacoes-capa.test.tsx` — `h1`, subtítulo e CTA existem em DOM; canvas é
  `aria-hidden`; a capa renderiza sem canvas.
- `tests/unit/ativacoes-catalogo.test.tsx` — quatro blocos, e divergência entre dicionário
  e lista de artes reprova no `tsc`.
- `tests/unit/contraste.test.ts` — estendido com as cores da rota, inclusive o 3:1 do alvo
  do jogo.
- `tests/content.test.ts` — paridade pt/en de `dict.ativacoes`.
- `tests/static-html.test.ts` — o HTML exportado contém o título e o catálogo em texto.
- `tests/e2e/ativacoes.spec.ts` — clique marca ponto; CTA aponta para o WhatsApp; a barra
  fixa não cobre o último bloco.

## 8. Pendências de dados

Herdadas da `/projetos` e ainda abertas: **piso de preço** e **tempo de resposta**. As
seções correspondentes somem sozinhas enquanto o dicionário trouxer `null`.

Novo desta página: **prazo mínimo de antecedência do evento** — a resposta da pergunta
"com quanto tempo?" não pode ser inventada.

## 9. Riscos assumidos

1. **Vender ativação sem case de ativação.** Mitigado pelo enquadramento de braço técnico
   (a prova pedida é de engenharia, não de evento) e pela capa jogável, que é a
   demonstração. Se o dono quiser mais que isso, o caminho é uma ativação real, não uma
   frase melhor.
2. **Terceira mensagem no mesmo domínio.** Mitigado por isolamento: rota fora do `(site)`,
   sem entrada no menu, link direto. O portfólio não muda.
3. **Dependência nova para o QR.** Ver §4.6 — é a última tarefa, e cai sem estrago.
4. **`npm run dev` daqui ocupa a porta 3000**, a mesma do webhook do Evolution no Saturno
   Labs. Derrubar antes de testar integração lá.

## 10. Critérios de aceitação

1. `/pt/ativacoes` e `/en/ativacoes` existem no `out/` e trazem título, catálogo e CTA em
   HTML, sem JavaScript.
2. Nenhuma frase da página afirma experiência prévia em ativação, evento ou marca.
3. A página diz explicitamente que não há hardware, locação nem produção física.
4. Nenhum dos termos proibidos de §2.3 aparece em texto visível.
5. Nenhum número escrito à mão no dicionário; contagem de sistemas computada no render.
6. Canvas `aria-hidden`, sem informação exclusiva, e a capa renderiza sem ele.
7. Com `prefers-reduced-motion: reduce` não há modo atrativo e o jogo continua jogável.
8. Estado inicial de revelação vive dentro do `@supports`; `prefers-reduced-motion` usa
   `animation-timeline: auto`.
9. Cores novas medidas por `lib/contraste.ts`: texto AA 4.5:1, alvo do jogo 3:1.
10. `npm run lint`, `npm run typecheck`, `npm test` e `npm run test:e2e` passam.
