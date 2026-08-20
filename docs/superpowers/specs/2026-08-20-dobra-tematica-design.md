# Dobra temática — "a ativação, tematizada"

**Data:** 2026-08-20 · **Rota:** `/[locale]/ativacoes` · **Spec anterior desta rota:**
[`2026-08-18-ativacoes-braco-tecnico-design.md`](./2026-08-18-ativacoes-braco-tecnico-design.md)

Este é o **subprojeto A** de dois. A dobra da landing deixa de ser um jogo de alvos
abstratos e passa a simular uma ativação de verdade, com tema. O **subprojeto B** — o
modal de brindes 3D com a marca do visitante — tem spec própria e vem depois; a única
costura entre os dois é o fim da partida abrir o modal.

A separação não é burocracia. B depende de licença de modelo de terceiro, de three.js sob
demanda e de entrada de marca do visitante; A não depende de nada além do que já existe.
Amarrar os dois numa spec só faria o impacto visual — que 100% dos visitantes veem —
esperar por um subsistema que só quem termina a partida vê.

## 1. Objetivo

Fazer a primeira tela parecer **uma ativação de marca acontecendo**, não uma demonstração
técnica de canvas. Quem chega tem que reconhecer o formato antes de ler qualquer palavra:
isto é o que a agência dele monta em estande, rodando no navegador.

## 2. Posicionamento

### 2.1 Por que tema, e por que trocável

Uma dobra com tema fixo prova que a dupla sabe fazer *aquela* peça. Uma dobra **tematizada**
prova o que a agência de fato compra: que a mesma máquina veste a campanha dela. O tema é
o argumento, não a decoração.

"Trocável" aqui significa **arquitetura, não interface**. Não há seletor de tema na página,
não há troca por calendário, não há painel. Existe um tema ativo, escolhido por constante,
e acrescentar um tema é acrescentar um arquivo. Qualquer coisa além disso é função que
ninguém pediu.

### 2.2 A ressalva do balão junino, registrada

O dono escolheu **balão junino** como elemento do primeiro tema, depois de a ressalva ser
apresentada. Ela fica aqui porque a decisão precisa sobreviver à memória de quem a tomou:

> Soltar balão é crime no Brasil — Lei 9.605/1998, art. 42, detenção de um a três anos.
> Marca brasileira sistematicamente evita balão junino em campanha de festa junina, e usa
> bandeirinha, fogueira e quadrilha no lugar. O risco não é legal para este repositório, é
> **comercial**: o leitor desta página é diretor de agência, exatamente quem conhece a
> regra, e o primeiro pensamento dele pode ser "isso eu não rodo para cliente nenhum" —
> na peça que existe para provar o contrário.

O dono conhece o próprio mercado e decidiu com a ressalva à vista. **A decisão vale.** Se
um dia ela se mostrar errada, o conserto é barato **por construção**: o elemento vive
dentro do tema, e trocar balão por bandeirinha ou fogueira é trocar um arquivo, sem tocar
no motor, no laço de desenho ou nos testes de jogo. É a segunda razão de o tema ser dado.

## 3. Arquitetura — o tema é dado, não código de jogo

### 3.1 A ideia que sustenta tudo

**O motor puro não é tocado.** `components/ativacoes/motor-reflexo.ts` continua emitindo
alvo abstrato: posição normalizada, raio, instante de nascimento, fase da partida. Ele não
sabe o que é balão. Quem decide como aquilo se desenha, e o que acontece quando estoura, é
o tema.

Consequência prática, e é o critério que separa esta abordagem das outras: **os 35 testes
do motor seguem válidos sem uma linha alterada.** Um redesenho visual que obrigasse a
reescrever a máquina de estado seria um redesenho mal desenhado.

### 3.2 A forma do tema

Um módulo por tema em `components/ativacoes/temas/`, exportando:

```ts
export type Tema = {
  /** Identificador estável, usado em teste e em nome de arquivo. */
  id: string
  /** Cores do tema. Entram no canvas; nenhuma delas vira texto sobre fundo sem
   *  passar por lib/contraste.ts. */
  paleta: { elemento: string; destaque: string; fundo: string; brasa: string }
  /** Desenha UM elemento. `vida` vai de 1 (recém-nascido) a 0; `nascimento` vai
   *  de 0 a 1 durante a entrada e fica em 1 depois; `parado` é
   *  `prefers-reduced-motion`. Recebe o pincel JÁ TRANSLADADO para o centro. */
  desenharElemento(
    pincel: CanvasRenderingContext2D,
    raio: number,
    vida: number,
    nascimento: number,
    agora: number,
    parado: boolean,
  ): void
  /** Marca o elemento que a barra de espaço vai acertar. Vive no tema porque um
   *  anel que serve a um círculo não serve a um balão. */
  desenharAlvoAtivo(pincel: CanvasRenderingContext2D, raio: number, agora: number): void
  /** UM estouro em andamento, `progresso` de 0 a 1. */
  desenharEstouro(pincel: CanvasRenderingContext2D, raio: number, progresso: number): void
  /** Camada de fundo, desenhada ANTES dos elementos, no mesmo canvas. */
  desenharFundo(
    pincel: CanvasRenderingContext2D,
    largura: number,
    altura: number,
    agora: number,
    parado: boolean,
  ): void
  /** Chave do convite no dicionário — o texto mora em `content/*.ts`. */
  chaveConvite: string
}
```

`CapaJogo.tsx` importa o tema ativo de `components/ativacoes/temas/index.ts`, que exporta
uma constante `TEMA_ATIVO`. Trocar de tema é trocar essa constante.

### 3.3 Texto de tema e os dois idiomas

O tema **não carrega texto**, carrega **chave de texto**. O dicionário continua sendo a
fonte única das duas línguas, e ganha `ativacoes.capa.convitesTema`, um mapa de chave para
frase nos dois idiomas. O tema junino aponta para a chave `junino`, cujo texto é
"Estoure os balões." em português e "Pop the balloons." em inglês.

Sem isso, cada tema novo viraria um par de strings soltas fora do dicionário, e o teste de
paridade PT/EN — que hoje pega qualquer chave escrita num idioma e esquecida no outro —
deixaria de cobrir o texto mais visível da página.

## 4. O tema junino

**Elemento:** **balão de São João** — lanterna de papel em gomos, afunilada nas duas pontas.
Não é balão de festa de látex e não é o balão de cesta ocidental; confundir a silhueta é o
erro que um olho de agência brasileira identifica mais rápido.

**Ele aparece parado e decorativo, nunca no ar com chama acesa.** Isso não é recato: é como
agência brasileira de fato desenha o objeto, porque nenhuma campanha real retrata o que a
lei nomeia. O calor vem de um brilho interno suave, como papel iluminado por dentro — não
há chama viva tremulando. A ressalva do §2.2 e a régua de arte convergem aqui, e a
convergência é o que permite o tema existir sem constranger quem vai ler a página.

A arte é autorada como **dados de caminho SVG**, convertida em `Path2D` e rasterizada uma
vez para sprite, na densidade da tela. `new Path2D()` aceita a sintaxe de caminho do SVG e
a rasterização é síncrona — nada de `Image`, nada de blob, nada de `await` dentro do laço
de quadro. Gradiente e sombreado saem de `createLinearGradient` aplicado sobre o caminho,
uma vez, na rasterização.

O balão **balança de leve no lugar**. O encolhimento que hoje marca o fim da vida do alvo
continua, agora como o balão murchando e perdendo opacidade — a mesma informação, na
linguagem do tema.

**O balão NÃO sobe, e isto é restrição, não escolha de gosto.** O teste de acerto vive no
motor puro e usa a posição fixa do alvo; qualquer deriva do desenho em relação a essa
posição faz o clique errar um balão que o olho vê ali. É a mesma classe de defeito que
custou um Critical nesta rota — alvo visível que engole o clique — e ela não pode voltar
por decoração. O balanço fica com amplitude bem dentro da tolerância de acerto (o motor
aceita 1,6× o raio), e há critério de aceitação cobrindo isso.

**Fundo:** bandeirinhas em varal, balançando por seno com fase deslocada por bandeira, e
brasas subindo devagar do rodapé. Duas camadas, ambas no mesmo canvas, desenhadas antes
dos alvos.

**Paleta:** o preto da casa (`#08090C`) permanece como fundo. Sobre ele, os quentes de
festa. Nenhuma cor nova vira cor de texto sem passar por `lib/contraste.ts`.

## 5. O estouro

O motor já remove o alvo no acerto e não guarda nada sobre isso — correto, é regra de
partida, não de desenho. O **componente** ganha uma lista curta de estouros em andamento
(posição, instante, raio), em pool pré-alocado com teto, no mesmo padrão das partículas de
acerto que já existem.

Cada estouro dura ~420ms e é desenhado pelo tema. No junino, o papel se abre pela COSTURA DOS GOMOS — aproveitando os caminhos que o próprio balão já tem — em pedaços que
se afastam pela costura, e nada de confete genérico — confete é o que todo gerador de
efeito faz, e é exatamente o que faria a peça parecer template.

O estouro é **puramente visual**. Ele não pontua, não atrasa nada, e a partida segue igual
se ele não for desenhado — o que é o que acontece em movimento reduzido.

## 6. Orçamento de quadro, e o portão que hoje não existe

O acabamento anterior entrou sem custar quadro: **59,88fps mediano com CPU 4× estrangulada,
idêntico à linha de base**. Mas isso foi **medição pontual, não teste** — a própria
implementação registrou essa lacuna como preocupação.

Fundo animado é custo de preenchimento de verdade, e é a primeira coisa desta rota que pode
degradar de forma invisível. Entra um portão permanente: um spec de medição de quadros
para `/ativacoes`, no molde do `tests/e2e/medir-quadros.spec.ts` que o projeto já tem para
a home, com **piso de 45fps mediano sob estrangulamento de 4× de CPU**.

O piso é 45 e não 59 de propósito: esta suíte **não roda no CI** (o workflow roda lint,
typecheck, vitest, build e test:html, nunca Playwright), então ela roda em máquina de
gente, e um piso apertado demais reprova por hardware alheio e vira portão que alguém
desliga. 45 é folgado o bastante para não mentir e apertado o bastante para pegar uma
camada de fundo mal escrita.

Regras de desenho que valem para todo tema, herdadas da medição anterior: **nada de
`shadowBlur`, nada de `filter: blur()` por quadro**. Brilho sai de composição aditiva com
sprite pré-assado.

## 7. Movimento reduzido e acessibilidade

Com `prefers-reduced-motion: reduce`: fundo parado (bandeirinha sem balanço, sem brasa),
balão sem balanço, estouro instantâneo em vez de animado. **O jogo
continua jogável** — alvo nasce, é clicável, pontua. Isto não é interruptor que esvazia a
dobra, e há teste ponta a ponta guardando isso desde a leva anterior.

O que já está de pé e não pode regredir: o canvas é focável, tem nome acessível, e espaço
ou enter acerta o alvo ativo pelo motor. O marcador do alvo ativo passa a ser desenhado
**pelo tema**, para que a marcação faça sentido sobre um balão e não sobre um círculo.

## 8. O que NÃO entra aqui

- **O modal de brindes 3D.** Subprojeto B, spec própria.
- **Seletor de tema na interface, troca por calendário, painel de tema.** Ver §2.1.
- **Segundo tema.** Junino é o primeiro e o único desta entrega. A arquitetura aceita o
  segundo; a entrega não o inclui, porque um tema que ninguém pediu é arte que ninguém vai
  revisar.
- **Som.** Nem foi pedido, e áudio sem controle de volume numa página de vendas é o tipo
  de coisa que faz fechar a aba.

## 9. Testes

- `tests/unit/ativacoes-tema.test.ts` — a forma do tema ativo: todas as funções presentes,
  paleta completa, chave de texto existente no dicionário nos dois idiomas.
- `tests/content.test.ts` — estendido: `convitesTema` existe nos dois idiomas com as mesmas
  chaves, e nenhuma vazia.
- `tests/unit/ativacoes-capa.test.tsx` — o convite renderizado vem do tema ativo, não de
  string fixa.
- `tests/e2e/ativacoes-quadros.spec.ts` — **novo**, o portão de §6.
- Os testes existentes de motor, capa, catálogo, prova, contraste, HTML estático e ponta a
  ponta seguem passando **sem edição**. Se algum precisar mudar, é sinal de que o tema
  vazou para onde não devia.

## 10. Riscos assumidos

1. **A ressalva do balão** (§2.2). Mitigada por construção: o elemento vive no tema.
2. **Fundo animado degradando em aparelho fraco.** Mitigado pelo portão de §6 e pela regra
   de não usar os caminhos lentos do canvas.
3. **O portão de quadros não roda no CI.** É gate local, e portanto depende de alguém
   rodar. Fica registrado como limitação, não como se fosse proteção automática.
4. **Tema como dado pode virar abstração cara** se um tema futuro precisar de algo que a
   forma de §3.2 não prevê. Aceito: o segundo tema é quem descobre isso, e o custo de
   ajustar a forma com dois temas na mão é menor que o de adivinhar agora.

## 11. Critérios de aceitação

1. O motor puro está **byte a byte inalterado**, e seus 35 testes passam sem edição.
2. Trocar `TEMA_ATIVO` troca elemento, estouro, fundo e convite, sem tocar em `CapaJogo`.
3. Nenhum texto de tema vive fora do dicionário; a paridade PT/EN cobre `convitesTema`.
4. O balão é desenhado em caminhos de canvas, sem sprite de imagem e sem `shadowBlur`.
5. Com `prefers-reduced-motion: reduce` o fundo está parado e o jogo continua jogável.
6. O portão de quadros existe, roda, e reprova se o mediano cair abaixo de 45fps a 4×.
7. O canvas segue focável, com nome acessível, e o alvo ativo segue marcado — agora pelo
   tema.
8. **O desenho do balão nunca se afasta do centro do alvo além da tolerância de acerto.**
   Há teste medindo o deslocamento máximo do balanço contra o raio e a tolerância que o
   motor usa, porque um clique que erra o que o olho vê é o defeito mais caro que esta
   rota já teve.
9. `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:html` e
   `npm run test:e2e` passam.
