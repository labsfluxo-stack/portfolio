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
- **o designer da agência entrega o `.riv` e a gente faz rodar** — no totem, offline,
  aguentando fila

O último item é diferente dos outros: não é garantia técnica, é onde a agência se
enxerga dentro do trabalho. Rive é a ferramenta que o designer dela já usa, e a frase
encaixa esse designer no fluxo em vez de substituí-lo. Nenhum dos concorrentes mapeados
diz isso — todos chegam com a criação pronta, que é justamente o que ameaça a agência.

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
poda `@emnapi/runtime`.

Esse custo, porém, **já foi pago pela decisão de §4.7**: `@rive-app/canvas-lite` obriga a
mesma regeneração. Com o lockfile tendo que ser refeito de qualquer jeito, o `qrcode`
pega carona e o QR deixa de ser tarefa de risco. Continua sendo a última do plano, agora
só por ordem de importância.

### 4.7 A peça de Rive

Uma peça de Rive entra na página, **abaixo da dobra**, na seção de telão/totem: uma
ilustração que reage ao ponteiro e à rolagem. É o único lugar onde o peso se paga.

#### 4.7.1 Por que não na dobra

Tabela oficial de tamanho dos runtimes web:

| Runtime | Sem compressão | Brotli |
|---------|--------------|--------|
| `canvas-lite` | 707KB | **222KB** |
| `canvas` | 1728KB | 567KB |
| `webgl2` | 2179KB | 648KB |

O motor de reflexo em canvas 2D puro é da ordem de 3KB. Colocar 222KB na primeira tela
para fazer o que 3KB já fazem contradiz, no primeiro scroll, a promessa que a página
inteira sustenta — que o software roda liso no celular fraco da fila do estande. **A capa
jogável de §4 não usa Rive.**

#### 4.7.2 Runtime e carregamento

- **`@rive-app/canvas-lite`.** Ele remove texto, layout, áudio e scripting. Se a peça
  escolhida precisar de qualquer um deles, a decisão volta para a mesa — trocar pelo
  `canvas` cheio é passar de 222KB para 567KB, e aí a peça não vale mais o que custa.
- **`rive.wasm` auto-hospedado em `public/`**, apontado por
  `RuntimeLoader.setWasmUrl()`. Por padrão o runtime busca o wasm num CDN, e requisição
  externa numa página que promete funcionar sem internet é contradição visível. A versão
  do arquivo tem que bater **exatamente** com a do pacote, servido como
  `application/wasm`.
- **Carga preguiçosa.** O runtime só é importado quando a seção chega a cerca de uma
  viewport de distância (`IntersectionObserver`). Antes disso, e enquanto carrega, fica um
  pôster estático. O peso nunca toca o LCP.
- **`prefers-reduced-motion: reduce` não carrega o runtime.** Fica o pôster, e é o
  comportamento correto — não é degradação.

#### 4.7.3 Licença e atribuição

Os arquivos da Rive Community/Marketplace são **CC BY 4.0**: uso comercial permitido,
**atribuição obrigatória**.

A página apagou Header e Footer de propósito, então o crédito não tem onde se esconder.
Fica uma linha discreta junto da chamada final, com nome do autor original e link para a
licença. Não é opcional e não é negociável.

**A peça é remixada, não usada crua.** A atribuição continua devida nos dois casos — o que
muda é que o arquivo original fica público e pesquisável no rive.app, e o diretor de
criação que estiver avaliando a proposta acha ele numa busca. Numa página que vende
experiência interativa sob medida, peça de prateleira reconhecível é o golpe de
credibilidade que custa o contrato. O remix também casa a paleta com `#08090C` e
`#38BDF8`; arte de estoque com cor estrangeira lê como colada.

#### 4.7.4 O que procurar na comunidade

Critérios, para a escolha não virar gosto:

1. **Reage a ponteiro** (Rive Listeners) — peça que só toca uma animação em laço não
   justifica o runtime; um GIF faria o mesmo por menos.
2. **Sem texto, layout, áudio ou scripting**, para caber no `canvas-lite` (§4.7.2).
3. **Vetor simples**, poucas formas — o custo de desenho por quadro cresce com a
   contagem de caminhos, e a régua é celular fraco.
4. **Assunto que sirva a telão/totem** — tela, cartão, painel, grade, partícula
   controlada. Nada de mascote nem personagem: personagem alheio numa página white-label
   é a pior combinação possível.

## 5. Seções

| # | Seção | Papel |
|---|-------|-------|
| 1 | Capa jogável | "A ativação é sua. O código é nosso." |
| 2 | Catálogo | Quatro blocos, §5.1 |
| 3 | Telão ao vivo | Faixa larga, a peça de Rive de §4.7 |
| 4 | O que a agência compra | As cinco dores, §5.2 |
| 5 | White-label | Sai com a marca da agência |
| 6 | Prova | Os três sistemas como prova de engenharia |
| 7 | Perguntas | As objeções reais de agência, §5.3 |
| 8 | Chamada final + barra fixa | WhatsApp, e o crédito CC BY de §4.7.3 |

A seção 3 existe por duas razões que se somam: o telão é o item do catálogo que mais
precisa ser visto para ser entendido (ninguém compra "painel ao vivo" lendo a palavra), e
é o único lugar da página onde uma peça animada pesada se paga. Ela **não** vive dentro
do grid do catálogo — quatro cartões com um deles animado quebra a simetria que faz o
grid funcionar.

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
- `TelaoRive.tsx` (client) — a faixa de §4.7, com pôster estático e importação
  preguiçosa do runtime
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
- `tests/unit/ativacoes-telao.test.tsx` — a faixa renderiza o pôster sem o runtime; o
  runtime **não** é importado no módulo (só dentro do efeito), o que o teste confere
  inspecionando as importações estáticas; e **existindo arquivo `.riv`, a linha de
  crédito CC BY existe** — atribuição que depende de alguém lembrar não é atribuição.
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

**O arquivo `.riv` também é pendência de dado, e é do dono.** Arquivo de comunidade se
abre e se remixa dentro do editor do Rive, que é interface gráfica atrás de login — não
há download por URL. O dono escolhe pelos critérios de §4.7.4, remixa na conta dele,
exporta e coloca em `public/ativacoes/`, junto do nome do autor original para o crédito.

Enquanto o arquivo não existir, `TelaoRive` renderiza só o pôster e a seção continua de
pé — mesmo padrão de `landing.piso: null`, que some sozinho. **A página não depende do
Rive para ir ao ar.**

## 9. Riscos assumidos

1. **Vender ativação sem case de ativação.** Mitigado pelo enquadramento de braço técnico
   (a prova pedida é de engenharia, não de evento) e pela capa jogável, que é a
   demonstração. Se o dono quiser mais que isso, o caminho é uma ativação real, não uma
   frase melhor.
2. **Terceira mensagem no mesmo domínio.** Mitigado por isolamento: rota fora do `(site)`,
   sem entrada no menu, link direto. O portfólio não muda.
3. **Arte de comunidade numa página que vende arte sob medida.** A atribuição CC BY diz
   ao leitor, em texto, que a peça não é sua — e o leitor é diretor de criação. Mitigado
   pelo remix (§4.7.3) e pelo lugar: a peça ilustra o **telão**, que é produto de
   operação, enquanto a prova de que vocês constroem interação é a capa jogável, que é
   100% código de vocês. Se a página um dia parecer montada com peça alheia, a correção é
   encomendar um `.riv` próprio, não escrever uma frase melhor.
4. **Dependência nova: `@rive-app/canvas-lite` + `qrcode`.** Obriga regerar o lockfile no
   Linux (`docker run --rm -v "$PWD:/w" -w /w node:24 …`). Se isso travar, as duas caem
   juntas e a página vai ao ar sem elas.
5. **`npm run dev` daqui ocupa a porta 3000**, a mesma do webhook do Evolution no Saturno
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
10. O runtime do Rive não aparece no JavaScript da primeira tela, e o `rive.wasm` é
    servido do próprio domínio — nenhuma requisição a CDN externo em toda a rota.
11. Havendo `.riv` publicado, a linha de crédito CC BY com o nome do autor original está
    visível na página. Não havendo, a faixa do telão renderiza o pôster e nada quebra.
12. `npm run lint`, `npm run typecheck`, `npm test` e `npm run test:e2e` passam.
