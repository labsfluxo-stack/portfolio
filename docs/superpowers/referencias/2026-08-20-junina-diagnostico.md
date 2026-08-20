# Diagnóstico: aesthetic gap na dobra junina de /ativacoes

Medido contra `components/ativacoes/temas/junino.ts` e o briefing
`docs/superpowers/referencias/2026-08-20-arte-junina.md`, rodando
`http://localhost:4319/portfolio/pt/ativacoes/` via Playwright (Chromium
headless), 1440×900 e 390×844, servidor de produção intocado.

**Screenshots nesta pasta** (abra estes quatro primeiro):
- `hero-desktop-1440x900.png` / `hero-mobile-390x844.png` — o que um visitante vê (DOM + canvas compostos), em pleno jogo (fase `jogando`, ~t=5.5s de uma partida real).
- `canvas-only-desktop-t5.5.png` / `canvas-only-mobile-t5.5.png` — **só o bitmap do canvas** (`toDataURL`), sem o texto/CTA por cima. É a camada do tema isolada — a mesma imagem que toda a análise de pixel abaixo mediu.
- `canvas-only-desktop-t0.5.png` / `canvas-only-mobile-t0.5.png` — um segundo instante, com o anel de foco de teclado visível em volta do balão ativo (ver nota metodológica).

---

## Nota metodológica (duas armadilhas que a medição caiu e saiu)

1. **`elementHandle.screenshot()` no canvas captura pixels COMPOSTOS da tela, não o bitmap do canvas.** Como o canvas é `position:absolute -z-10` atrás do texto DOM, um screenshot "do elemento canvas" na verdade fotografa o que está por cima dele também — título, CTA, QR. Uma primeira rodada de medição achou "260 blobs coloridos" na área de jogo; eram, na maioria, glifos de letra. Corrigido lendo `canvas.toDataURL('image/png')` de dentro da página — o bitmap real, nada mais.
2. **O loop de desenho para de vez quando a partida acaba** (`CapaJogo.tsx`: `if (estado.fase === 'fim') return`, sem reagendar `requestAnimationFrame`). Uma primeira sonda de "quanto muda entre dois quadros" flagrou 0,000% de mudança — porque, por acidente de timing, caiu depois do fim da partida de 15s, com o canvas congelado. Refeito medindo em `t=3–4s`, dentro da janela confirmada `jogando`.

Toda medição abaixo já reflete essas duas correções. Amostragem: 14 capturas por segundo ao longo de uma partida real de 15s (não o modo "atrativo" de fundo, que trava o teto de alvos em 2), por viewport.

---

## 1. Quanto da dobra é realmente tematizado

**Medido** — fração de pixels do canvas (bitmap real) que se afasta do fundo `#08090C` (limiar euclidiano RGB > 14, para ignorar ruído de anti-aliasing):

| | Desktop 1440×710 (canvas) | Mobile 390×589 (canvas) |
|---|---|---|
| **Total tematizado** (média/faixa em 14 amostras) | **3,30%** (3,19–3,43%) | **3,07%** (2,88–3,25%) |
| … dos quais, faixa de bandeirinhas (topo, estática) | 2,89% | 2,13% |
| … dos quais, área de jogo (balões + brasas, dinâmica) | 0,41% (0,30–0,53%) | 0,94% (0,71–1,12%) |
| Preto quase puro (fundo) | 96,70% | 96,93% |

O canvas cobre a dobra inteira (`className="jogo-canvas absolute inset-0 h-full w-full"`) — não há diferença entre "% do canvas" e "% da dobra visível".

**Comparação com o próprio teto que o briefing definiu:** a régua (§3) diz "bandeirinhas + brasas juntas, bem abaixo de ~8% dos pixels a qualquer instante" — e chama isso explicitamente de escolha deliberadamente esparsa, não um mínimo a bater. Medido: bandeirinhas + brasas somam **2,96% no desktop e 2,46% no mobile** — a peça está rodando a **menos de 40% do teto que a própria régua já considerava "o lado esparso de propósito"**. Não é que a régua pedia pouco e a implementação também ficou pouca — a implementação ficou visivelmente abaixo até desse próprio piso conservador.

**Julgamento:** 3,0–3,3% de pixels não-fundo, distribuído como uma faixa fina e estática no topo mais alguns pontos e um blob escuro pequeno soltos no resto da tela, é uma densidade que não sustenta "ambientação de festa" — sustenta "uma faixa decorativa e um jogo qualquer atrás dela". A régua pediu esparso; o que rodou é mais esparso ainda que o pedido esparso.

---

## 2. Bandeirinhas: onde, quanto, quantas

**Medido**, cruzado por três métodos independentes (fórmula do código, varredura de linha por absolute-threshold, contagem de segmentos de cor numa linha fixa) — os três batem:

| | Desktop | Mobile |
|---|---|---|
| Nº de bandeirinhas visíveis | **37** | **17–18** |
| Largura de cada bandeirinha | 34px (bateu o teto do `clamp`) | 20px (bateu o piso do `clamp`) |
| … como % da largura do viewport | 2,36% | 5,13% |
| Altura de cada bandeirinha | 44px | 26px |
| Fio (corda) começa a | 3,5% da altura do canvas | 3,6% da altura do canvas |
| Bandeirinha termina (ponta) a | **9,8%** da altura do canvas | **7,7%** da altura do canvas |
| Faixa ocupada pela faixa inteira | linhas 25–68 de 710 (6,2% de altura) | linhas 21–44 de 589 (4,1% de altura) |

**Contra o briefing (§3):** "strung along the top 10–14% of viewport height, hanging into frame ~1,4× flag height." O fio nasce a 3,5–3,6% — bem ACIMA da janela de 10–14% que a régua props para o próprio fio, e a peça inteira (fio + pano) termina a 9,8% (desktop) / 7,7% (mobile) — ou seja, encerra bem antes de sequer entrar na faixa 10–14% que o briefing definiu como onde o fio deveria estar. **Não é "mais fina do que devia" no sentido de largura de bandeirinha (a largura bate exatamente os clamps do brief) — é a faixa inteira comprimida verticalmente para bem mais perto do topo do que a régua desenhou**, sobrando ~90% da altura do herói completamente livre de qualquer bandeirinha.

Cor, contagem de gomos, sag do fio (14% do vão, dentro da faixa 12–16% do brief), gap entre bandeirinhas (18% da largura, bate a régua): tudo isso **bateu exatamente** a especificação. A única divergência real de bandeirinha é a posição vertical comprimida.

**Julgamento:** a faixa de bandeirinhas, isolada, é o único elemento do tema que de fato "lê" como festa junina num relance — cor certa, silhueta certa, quantidade generosa. O problema não é a qualidade dela; é que ela é uma faixa fininha (6,2%/4,1% de altura) presa ao topo absoluto, seguida por 90%+ de tela vazia. Uma pessoa vê a faixa, olha para baixo, e não vê mais nada até o rodapé da dobra.

---

## 3. As brasas

**Medido:**

| | Desktop | Mobile |
|---|---|---|
| Brasas vivas simultaneamente (média / máx / mín, 14 amostras) | 9,93 / 26* / 7 | 9,64 / 22* / 5 |
| Tamanho (maior dimensão do blob núcleo+auréola) | 9,8px (3–14px) | 10,0px (3–14px) |
| Área combinada, como % do canvas | 0,074% | 0,329% |

\* Os máximos de 22–26 provavelmente capturam um instante de estouro (fragmentos do balão têm tamanho parecido com brasa e não foram sempre filtrados) — a contagem estável de brasas de verdade é a média, ~10, que bate exatamente as 10 sementes fixas em `SEMENTES_BRASA`.

O código está fiel ao que planejou: 10 partículas (dentro da faixa 8–14 do briefing), núcleo sólido + auréola `lighter` sem `shadowBlur`, deriva lenta enviesada para as margens externas e o terço inferior — exatamente a receita da régua.

**Estão fazendo algo perceptível?** Contra um fundo `#08090C` quase preto, um disco de 1–3px de núcleo (mais halo transparente até ~9-14px total) é **tecnicamente visível em zoom, mas no tamanho renderizado real (1440×710 numa tela de verdade) é da ordem de um pixel de poeira**. A prova está na própria imagem `canvas-only-desktop-t5.5.png`: são pontinhos que only se leem como "brasa" se alguém já souber que devem estar ali. Área combinada de 0,07–0,33% do quadro é, na prática, abaixo do limiar de "elemento de cena" — é textura de fundo que a maioria dos visitantes nunca vai registrar conscientemente.

**Julgamento:** as brasas cumprem a letra do briefing (contagem, física, ausência de `shadowBlur`) mas não cumprem a função que o briefing atribuiu a elas — "ambiência da fogueira, perceptível". Existir tecnicamente e ser perceptível são coisas diferentes; aqui só a primeira aconteceu.

---

## 4. A história de cor

**Medido** — distribuição de matiz dos pixels não-fundo (agregado nas 14 amostras), agrupados por bucket de matiz HSL:

| Bucket | Desktop (% dos pixels temáticos) | Mobile |
|---|---|---|
| dourado/laranja (gold+brasa, h<45°) | 36,3% | 36,6% |
| vermelho | 22,5% | 28,2% |
| azul | 18,5% | 14,6% |
| verde | 18,2% | 14,6% |
| creme/neutro | 4,3% | 5,7% |

Como fração do QUADRO INTEIRO (não só dos pixels temáticos): nada disso passa de ~1,2% (dourado), ~0,87% (vermelho) etc. — a "história de cor" inteira do herói cabe em menos de 3,3% do quadro; o resto é preto quase puro.

**A cor do balão especificamente — comparada contra a paleta declarada em `junino.ts`:**

| | Desktop | Mobile |
|---|---|---|
| Luminância mediana dos pixels do balão | 68/255 | 69/255 |
| % dos pixels do balão "escuros" (luminância <60) | 36,4% | 36,2% |
| % "claros" (luminância ≥130) | 2,3% | 2,4% |
| Distância média até o stop declarado mais próximo | 35,5 | 35,6 |
| Stop declarado mais próximo, por classe | sombra: **73,2%** / base: 26,1% / destaque: **0,7%** | sombra: **72,2%** / base: 27,3% / destaque: 0,6% |

O balão está sendo desenhado, na prática, **quase inteiramente em tons de sombra** — quase três quartos de seus pixels caem mais perto do stop `sombra` de cada família de cor (vermelho `#5C1A12`, verde `#0E4A30`, dourado `#7A4A08`, azul `#155F80`) do que do stop `base` (`#D93A2B`, `#1E8F5F`, `#FFB020`, `#38BDF8` — as cores que a régua listou como "vermelho, dourado, verde, azul" no §2). O stop `destaque` (o mais claro de cada gradiente) aparece em menos de 1% dos pixels.

O próprio código documenta a razão: `NEUTRO_ESCURO_BORDA` + `EXPOENTE_FRONTALIDADE = 5` (curva côncava, calibrada nas rodadas de revisão anteriores especificamente para escurecer as bordas dos gomos e evitar que o dourado "vazasse claro demais"). Essa correção resolveu um bug real (dourado mais claro que os gomos centrais), mas o efeito colateral medido aqui é que ela empurrou o balão inteiro para o registro de sombra — o oposto do "registro comercial vivo e contrastante" que o briefing (§1) escolheu deliberadamente ("brands selling 'party'… vivid and contrasting… the correct default").

**Julgamento:** a paleta declarada no arquivo é a certa (cores culturalmente codificadas, sem roxo/rosa/neon). O que chega à tela não é essa paleta — é a metade escura dela. O escurecimento de borda, pensado para 4-6 gomos por balão, some com a diferença entre "vivid junina" e "objeto escuro genérico" no único elemento do tema que representa um balão de verdade.

---

## 5. O que um brasileiro reconheceria — e o que não

A partir só das imagens capturadas (`hero-*-composited-*.png`, o que um visitante vê de fato):

**Reconheceria:**
- A faixa de bandeirinhas no topo — silhueta, cor, quantidade, corda caída. Sem ambiguidade, lê como festa junina em menos de um segundo.
- A silhueta do balão, SE olhada de perto — afunilado nas duas pontas, gomos visíveis, nó no topo, bico embaixo. Evita corretamente as duas armadilhas que o briefing citou (balão holandês de cesta, balão de látex com nó).

**Não reconheceria, ou reconheceria tarde/mal:**
- O balão como objeto principal da cena — pequeno demais (66,8px / 4,6% da largura no desktop; ainda mais crítico, escuro demais: luminância mediana 68/255, quase 3/4 dos pixels no tom de sombra) para ler como "lanterna de festa" num relance. Num olhar rápido, é uma mancha escura arredondada.
- Volume de balões — no máximo 1–2 por vez no desktop nas 14 amostras (o teto de código é 3, raramente atingido); isso não lê como "ativação com balões", lê como "um enfeite solto".
- As brasas — invisíveis na prática (0,07–0,33% da tela, 3–14px). Ninguém vai olhar para a dobra e pensar "ah, tem uma fogueira ali".
- Os 90%+ da tela abaixo da faixa de bandeirinhas, sem nada acontecendo — o maior "não reconheceria" de todos: a leitura de "festa" que a faixa do topo estabelece não é sustentada pelo resto do quadro. O olho sobe para a faixa, desce, e encontra um retângulo preto com um ponto escuro dentro.
- Contra a própria régua do briefing ("has to read as work an agency produced for a brand's live activation, in under a second, to someone who does that work professionally"): a faixa sozinha talvez passasse nesse teste; o quadro inteiro, não — 96,7–96,9% preto quase puro não é o que uma agência entrega como key visual de ativação.

---

## 6. Onde há espaço — e o que cada região comporta (estático e/ou movimento)

Atualização do responsável, no meio do diagnóstico: **movimento passou a ser permitido** — a quase-imobilidade medida no item abaixo era uma restrição que eu havia presumido, não uma exigência do dono, e ele a liberou. As medições continuam valendo; o que muda é a recomendação de espaço: cada região abaixo diz também que tipo de movimento cabe nela, não só que densidade estática cabe.

### Quanto do quadro muda de fato entre dois quadros (medido)

Rajada de 10 capturas a ~100ms de intervalo, confirmadamente dentro da fase `jogando` (não o estado congelado de fim de partida):

| | Desktop | Mobile |
|---|---|---|
| Fração média de pixels que muda entre quadros consecutivos | **0,449%** | **0,955%** |

**Isto é um achado por si só, distinto da esparsidade:** a peça tem movimento real — o balanço do balão (`deslocamentoBalanco`, amplitude ~24%/14,4% do raio) e a deriva das brasas (8–14px/s) não são zero. Mas como o balão é ~66px num quadro de 1440px, e as brasas se movem poucos pixels a cada 100ms, e a faixa de bandeirinhas é estática por design (o próprio código comenta: "real bunting doesn't flap on a page"), a pegada de pixels que efetivamente muda quadro a quadro é minúscula. **Julgamento:** um fundo "descrito como animado" que muda menos de 1% dos seus pixels por quadro é, para a maioria dos visitantes, percebido como estático — a diferença entre "a peça anima" (verdadeiro, medido) e "dá pra perceber que ela anima" (falso, na prática) é exatamente o ponto: aqui o défice não é só de densidade, é de amplitude/escala do que já se move.

### Regiões livres, com coordenadas, e o que cada uma comporta

Coordenadas em pixels do canvas (não do viewport CSS — mas como `dpr` ficou 1 no ambiente de teste, os dois coincidem aqui).

**Desktop (canvas 1440×710). Coluna de texto ocupa x:272–1168 (largura máxima 896px, `max-w-4xl` centralizado).**

| Região | Coordenadas aprox. | Hoje | Estático | Movimento |
|---|---|---|---|---|
| Atrás do título/subtítulo | x:272–1168, y:128–350 | Zona proibida para alvos do jogo (`zonasProibidas`) — **sempre vazia**, nenhum balão nasce aqui por desenho | **Só baixo contraste.** Uma forma clara/brilhante aqui briga com a legibilidade do H1 branco/azul sobre fundo escuro | Deriva lenta e discreta apenas — uma brasa passando devagar atrás das letras, alpha baixo. Nada que pisque ou acelere perto do texto |
| Faixa entre bandeirinha e título | x:0–1440, y:69–128 (59px) | Sempre vazia — nem bandeirinha nem alvo de jogo chegam até aqui | Fina demais para forma estática grande; aceita um acento discreto | Transição suave é o máximo — não é onde colocar a peça mais viva |
| Margem esquerda, altura toda | x:0–272, y:0–710 | Já recebe balões esporadicamente (não é zona proibida), mas a densidade geral é tão baixa que na prática fica vazia na maioria dos quadros | Cabe densidade estática adicional (ex.: uma segunda guirlanda vertical mais fina, ecoando a faixa do topo) | Cabe movimento mais vivo — sem texto para proteger, balões extras podem nascer/balançar/estourar aqui com mais liberdade |
| Margem direita, altura toda | x:1168–1440, y:0–710 | Idem à esquerda | Idem | Idem — e é onde, nas amostras, o balão sozinho mais apareceu; reforçar aqui tem menos risco de tampar algo |
| Faixa inferior, abaixo do placar/QR | x:0–1440, y:570–710 (140px), evitando x:548–660 perto do QR | Já é o viés de nascimento das brasas ("terço inferior, margens externas") — mas na densidade atual (10 sementes fixas) ainda lê como quase vazio | Maior densidade cabe sem risco — nada de texto para proteger, só o próprio QR precisa de uma zona de silêncio ao redor | **A região que mais aceita "vivo"**: mais brasas, brasas maiores, talvez um segundo balão pousado/estático maior como âncora visual, tudo sem ameaçar leitura |

**Mobile (canvas 390×589). Aqui a coluna de texto ocupa a largura inteira (x:0–390) — não existem margens laterais como no desktop.** O espaço livre é só vertical:

| Região | Coordenadas aprox. | Estático | Movimento |
|---|---|---|---|
| Atrás do título/subtítulo | x:24–366, y:96–297 | Só baixo contraste | Só deriva lenta, igual ao desktop |
| Faixa entre bandeirinha e título | x:0–390, y:44–96 (52px) | Fina, acento discreto | Transição suave |
| Faixa inferior, abaixo do placar | x:0–390, y:~480–589 (~109px) | Cabe mais densidade (já é onde as brasas vivem hoje) | A região mais livre para algo mais vivo no mobile |

**Assimetria a registrar:** o desktop tem ~19% da largura livre dos dois lados (margens) além da faixa inferior — quatro regiões distintas para trabalhar. O mobile só tem duas faixas horizontais finas (topo e rodapé) porque a coluna de texto toma a largura inteira. **Qualquer solução que dependa das margens laterais (a maior reserva de espaço do desktop) não se transfere para o mobile** — o mobile precisa de uma resposta própria, provavelmente concentrada na faixa inferior (~109px, já o lar natural das brasas) e/ou em aumentar a presença do balão em si, já que não há "para os lados" para onde crescer.

---

## Resumo dos números centrais

- **Tematizado, quadro inteiro:** 3,30% (desktop) / 3,07% (mobile) dos pixels do canvas — canvas = dobra inteira.
- **Bandeirinhas + brasas combinadas:** 2,96% / 2,46% — menos de 40% do próprio teto de "bem abaixo de ~8%" que o briefing definiu como o lado já-esparso da faixa.
- **Balão:** 1–2 visíveis por vez (raramente os 3 possíveis), ~67px/4,6% da largura (desktop), mediana de luminância 68/255, quase 3/4 dos seus pixels mais perto do stop de SOMBRA do que do stop BASE da paleta declarada.
- **Brasas:** ~10 vivas simultaneamente (bate o código), 3–14px, 0,07–0,33% da tela — tecnicamente presentes, praticamente invisíveis.
- **Movimento real, quadro a quadro:** 0,45% (desktop) / 0,96% (mobile) dos pixels mudam a cada ~100ms — a animação existe mas sua pegada visual é mínima.
