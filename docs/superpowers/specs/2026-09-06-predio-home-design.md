# Prédio — a home como descida

**Data:** 2026-09-06
**Estado:** desenho aprovado, implementação não iniciada

## O que é

A home passa a ser um prédio visto em corte, ocupando a tela inteira. O
visitante entra pela cobertura e **desce**, andar por andar, até a recepção no
térreo — onde deixa o contato. Cada andar é um setor da empresa, e dentro dele
há objetos clicáveis que levam ao conteúdo daquele setor (um computador que
abre a página de design, uma prateleira que abre a de automação).

A régua de qualidade é o padrão de estúdio premiado. **Régua, não molde**: nada
de copiar design, código ou asset de terceiros. O vocabulário é o que este site
já tem — `Boot`, terminal, Pórtico — levado a sério.

## Os sete andares

A ordem é a que o dono propôs, e ela se sustenta por dois motivos que valem
ficar escritos: prédio de verdade **tem casa de máquinas no topo**, então
servidor logo abaixo da cobertura é fisicamente crível; e o calor humano
**cresce** conforme se desce, terminando em gente.

| Parada | Andar | Conteúdo |
|--------|-------|----------|
| — | **Cobertura** | Céu, calma, vista. Diz "os negócios vão bem" sem escrever isso. |
| 07 | **Servidores** | Hospedagem, backup, uptime. |
| 06 | **Design** | O que o cliente vê. |
| 05 | **GEO / SEO / Blog** | Como as pessoas encontram. Absorve o blog. |
| 04 | **Automação** | O estoque que se move sozinho — rotina automatizada. |
| 03 | **Acolhimento** | CRM, lead, omnichannel. |
| — | **Térreo · Recepção** | O formulário. |

Infraestrutura aparece como **fundamento, nunca como oferta** — a regra de
posicionamento que este site já pagou para aprender.

## Direção de arte

**Hora dourada, de ponta a ponta.** Sem cidade ao fundo, sem silhueta, sem
margem lateral: o prédio ocupa a largura inteira e o visitante está encostado
nele, não olhando de fora. O céu aparece só numa faixa fina no topo e some.

A escolha da hora foi comparada contra meio-dia e noite, e ela ganha nos dois
critérios ao mesmo tempo — o que é raro, porque beleza e fluidez costumam puxar
para lados opostos. Aqui apontam para a mesma luz, pelo mesmo motivo físico.

Três elementos carregam a sensação de queda, e nenhum é decoração:

- **Sol baixo entrando de lado**, atravessando o corte inteiro. Cada objeto e
  cada laje joga uma sombra longa e horizontal — e é a sombra longa que faz três
  planos parecerem três profundidades. Ao meio-dia não há sombra lateral e os
  planos colapsam num só: o parallax deixa de ser lido como profundidade. À
  noite os andares são emissivos, ou seja, brilham mas não têm forma.
- **Pilares atravessando todos os andares**, de cima a baixo. Sem eles as faixas
  viram slides soltos e a descida deixa de ser uma descida.
- **Gradiente de temperatura descendo o prédio.** Quente e dourado na cobertura,
  esfriando conforme desce — andar baixo pega menos luz do dia, é assim num
  prédio de verdade — e voltando ao quente na recepção, onde a luz já é
  artificial. A luz passa a contar a mesma história que a ordem dos andares já
  contava: máquina em cima, gente embaixo. À noite esse arco não existe, porque
  todo andar é igual: escuro fora, aceso dentro.

### Por que a hora dourada é também a mais barata

A noite só fica boa com *bloom* — passe de pós-processamento em tela cheia, e
causa número um de página WebGL morrer no celular. A hora dourada precisa de uma
coisa só: um sol direcional com um mapa de sombra.

E a escada de qualidade deste projeto **já escolheu esse lado**. De
`portico-quality.ts`, sobre o degrau que corta sombra: o mapa do sol cai pela
metade e as luminárias param de projetar, mas *"o sol continua projetando,
porque é ele que separa os degraus da montagem"*.

Ou seja: quando o aparelho aperta, a primeira coisa que a escada descarta são as
luminárias — de que a noite depende — e a última de que ela abre mão é o sol —
de que a hora dourada depende. A direção de arte escolhida é a única das três
que está do lado certo da escada que já existe.

### Profundidade

- **Cinco andares do meio:** parallax de três planos (fundo, meio, frente) em
  velocidades diferentes. O cérebro lê como profundidade real, mas continua
  2,5D — barato e previsível. O objeto clicável mora no plano da frente.
- **Cobertura e recepção:** perspectiva real. Compra-se o impacto exatamente na
  primeira e na última impressão, e paga-se barato no meio. **É uma promoção,
  não um dado** — ver "Celular é requisito".

## Herança do Pórtico

O prédio **não inventa arquitetura**. `components/three/` já resolveu, com
cicatriz, quase todo problema que ele terá, e o desenho abaixo é aquele padrão
aplicado a outro objeto. As leis herdadas:

1. **O estado de repouso é o fallback.** O HTML estático nunca nasce vazio — é o
   que os robôs de IA leem e o que o visitante vê antes de hidratar. A cena só
   *substitui* o fallback depois que um efeito no cliente confirma WebGL e
   `prefers-reduced-motion` desligado.
2. **Montar espera `load` e depois ociosidade.** Só ociosidade não basta: já foi
   medido no site publicado que o navegador acha folga aos 400 ms e monta a cena
   no meio do carregamento — justamente o que se quer evitar.
3. **Nenhum módulo `predio-*` importa three.js.** Lógica pura sobre números,
   testável sem GPU, porque o componente da cena não sobe em jsdom.
4. **Zero `Math.random()`.** Ruído é função pura do tempo; a cena é idêntica a
   cada carregamento.
5. **A escada de qualidade mexe em um eixo por degrau**, `dpr` primeiro, porque
   custo de pixel é quadrático.

## Módulos

Um único arquivo com three.js. Todo o resto é lógica pura.

- **`predio-programa.ts`** — os sete andares como dado: número, chave de texto
  pt/en, cor de luz, e os objetos com seu destino. Fonte única.
- **`predio-arquitetura.ts`** — pé-direito, espessura de laje, posição dos
  pilares, e os três planos de profundidade com seus fatores de parallax.
- **`predio-descida.ts`** — **o coração.** Converte progresso de rolagem (0..1)
  em pose de câmera, andar ativo e deslocamento de cada plano. Função pura.
- **`predio-selecao.ts`** — objeto → destino.
- **`predio-qualidade.ts`** — **reusa** `TIERS`, `judge` e `measureVsync` de
  `portico-quality.ts`. A escada não é duplicada.
- **`Predio.tsx`** — a cena R3F. Único arquivo com three.js.
- **`PredioSlot.tsx`** — decide entre cena e fallback, no padrão do
  `PorticoSlot`.
- **`PredioFallback.tsx`** — o prédio inteiro em HTML semântico.

## Um andar por tela, sem barra de rolagem

Decisão do dono em 2026-09-07. Cada andar ocupa **uma tela inteira** — uma parada
é um andar, e nunca meio andar com o próximo espiando por baixo — e **a barra de
rolagem lateral não aparece.**

Três consequências que não são opcionais:

**1. Altura é `dvh`, não `vh`.** No celular, `100vh` mede a tela *sem* a barra de
endereço do navegador, então o andar fica alto demais e vaza — o defeito clássico
que só aparece em aparelho de verdade. `100dvh` com `100vh` de reserva para quem
não suporta. Como celular é requisito nesta home, isto é obrigatório, não polimento.

**2. Sumir com a barra não pode sumir com a rolagem.** Esconder é só pintura —
`scrollbar-width: none`, `::-webkit-scrollbar { display: none }`,
`-ms-overflow-style: none`. A rolagem em si, o teclado (Page Down, Home, End,
setas), a roda e o toque continuam funcionando exatamente como antes. Barra
escondida é diferente de rolagem travada, e travar rolagem é armadilha de
acessibilidade.

**3. Nada visível na tela além do andar.** Decisão do dono em 2026-09-07, revisando
uma versão anterior desta mesma seção: entrou um indicador de andar fixo na lateral,
ele foi visto no navegador, e a decisão foi **tirar também**. A tela mostra o andar e
mais nada.

O que isso custa, dito com todas as letras: a barra de rolagem informava que a página
continua e onde se está nela. Sem ela e sem substituto visível, **nada avisa que
existem mais seis andares embaixo** — a descoberta passa a depender do visitante
rolar por conta própria. É uma troca deliberada de orientação por limpeza.

**Tensão em aberto, a resolver olhando e não discutindo.** "Um andar por tela" e
"algo cortado pela borda pedindo rolagem" se contradizem: se o andar cabe inteiro e
limpo, ele lê como página completa. As duas saídas — deixar sangrar alguma coisa na
borda de baixo, ou aceitar que quem não rola vê só a cobertura — são decisões de
arte, não de código, e nenhuma delas é tomada aqui por antecipação. A remoção é feita
como pedida, sem pista substituta inventada por conta própria, e a primeira tela vai
ao navegador para o dono julgar com a coisa na frente.

O que **não** sai: a navegação entre andares continua existindo na árvore de
acessibilidade — as sete paradas seguem alcançáveis por teclado e anunciáveis por
leitor de tela, apenas sem pintura. Sumir da tela é decisão de arte; sumir do teclado
seria defeito. As duas coisas são separáveis e ficam separadas.

## A descida

**Rolagem nativa, sem biblioteca de scroll suave.**

Isto contraria a recomendação inicial da pesquisa, e a inversão é deliberada:
uma biblioteca de scroll suave intercepta `wheel`/`touch` para interpolar a
posição, e isso **piora o INP** — o Core Web Vital que sustenta os 95/100/100/100
que este site já tem. O projeto já expulsou `motion` e faz movimento em CSS puro
por razão da mesma família. O amortecimento acontece dentro do `useFrame` que já
existe: sem dependência nova, sem custo de INP.

A página tem sete alturas de viewport. Cada andar possui uma **estação** — o
trecho em que a câmera desacelera e o andar fica legível. Só três andares ficam
vivos por vez: anterior, atual e próximo.

## Objetos clicáveis

Cada objeto é um mesh no plano da frente **mais um `<a>` real no DOM**
posicionado por cima dele.

O clique nunca depende de raycast; o raycast serve só ao brilho do hover. Assim
o teclado funciona, o leitor de tela funciona, o alvo de toque tem 44 px e
clique-do-meio abre em nova aba — tudo de graça, e no mesmo espírito do fallback
que o projeto já pratica.

## Fallback

`PredioFallback.tsx` é o prédio inteiro em HTML semântico: sete seções reais,
textos reais, links reais. É o que o buscador lê, o que aparece com
`prefers-reduced-motion` ligado, e o que roda em aparelho sem WebGL.

## Bilíngue

Todo texto novo entra em `content/pt.ts` **e** `content/en.ts`.
`predio-programa.ts` carrega apenas chaves, nunca frases.

## Custo externo: zero

`three`, `@react-three/fiber` e `@react-three/drei` já são dependências.
Nenhuma dependência nova ⇒ **`package-lock.json` não é tocado** ⇒ a armadilha de
precisar gerar o lockfile no Linux não é acionada. Nenhum asset baixado, nenhuma
licença de terceiro, nenhum artista contratado: a geometria é procedural, que já
é a técnica da casa.

## Testes, nesta ordem

1. `predio-descida.test.ts` — progresso → estação, câmera e planos. Primeiro,
   porque é onde mora a fluidez.
2. `predio-programa.test.ts` — sete andares; todo objeto com destino válido;
   pt e en completos.
3. Fallback em jsdom — sete seções com links reais.
4. Playwright — a descida inteira sem erro, o formulário alcançável, e
   `prefers-reduced-motion` mostrando o fallback. Em viewport de celular
   também, não só de desktop.
5. `predio-qualidade.test.ts` — a perspectiva só é promovida com folga de
   quadro comprovada, e nunca é o estado inicial.

## Celular é requisito, não desejo

Decisão do dono em 2026-09-06, revertendo uma aceitação de risco anterior na
mesma conversa: **tem que rodar bem no celular.** Isso deixa de ser uma
esperança e vira critério de aceite. Três consequências de projeto:

**1. A perspectiva real é uma capacidade, não um dado.** Cobertura e recepção
nascem em parallax como todo o resto, e a perspectiva **sobe** apenas quando o
quadro prova folga — exatamente a filosofia que a escada do Pórtico já pratica:
começar no degrau seguro e promover sob medição, nunca o contrário. Num aparelho
que não sustenta, ninguém vê tela quebrada; vê parallax, que é bonito por si.

**2. O celular é o alvo de projeto, não a versão reduzida.** O orçamento de
quadro é definido pelo aparelho mediano, e o desktop é o que sobra de folga.
Decidir na ordem inversa é como se produz um site que só funciona na máquina de
quem o fez.

**3. Três testes físicos que ninguém fez ainda neste projeto e que aqui são
obrigatórios:**

- **Safari em iPhone real.** Não simulador, não DevTools.
- **Navegador embutido do Instagram.** É onde cai quem vem de link em rede
  social, e é um ambiente notoriamente hostil a WebGL.
- **Celular sob sol forte.** Continua na lista, mas **deixou de ser um risco de
  projeto** quando a direção de arte mudou de noturno para hora dourada: tela
  âmbar de luminância média é legível ao ar livre, tela quase preta não é. O
  teste vira confirmação, não aposta. O que ainda se verifica ali é o contraste
  dos rótulos sobre os andares mais escuros do fundo da descida.

O Lighthouse **mobile** é medido antes e depois, não estimado — como já foi
feito no Pórtico.

## Em aberto, de propósito

- **Onde a home mora** e o que acontece com a página longa atual.
- **A copy de cada andar** e quais objetos exatamente cada um contém.

O dono pediu para decidir isso depois; o desenho acima é agnóstico às duas
respostas.
