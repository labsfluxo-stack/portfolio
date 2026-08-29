# Jogo da dobra — de demonstração a amostra profissional

**Data:** 2026-08-29 · **Rota:** `/[locale]/ativacoes` · **Spec anterior desta rota:**
[`2026-08-20-dobra-tematica-design.md`](./2026-08-20-dobra-tematica-design.md)

A dobra temática entregou a cena. Esta spec ataca o que sobrou depois dela: o jogo **não
pede decisão**, o movimento **não tem peso**, e o fim da partida — o momento que vende —
está **ilegível sobre a própria ilustração**.

Nada aqui reabre decisão da spec anterior. O tema continua sendo dado, o estouro continua
puramente visual, o áudio continua fora.

## 1. Objetivo

Que um diretor de agência jogue 30 segundos e pense *"quero isto na minha campanha"* — não
*"legal"*. Três lacunas medidas separam um do outro, e esta spec fecha as três.

## 2. Evidência

Levantada em 2026-08-29 sobre o build de produção em `:4173`, com captura de tela e leitura
de código:

| Achado | Como foi medido |
|---|---|
| `Alvo = { id, x, y, raio, nascidoEm }` — **sem tipo** | leitura de `motor-reflexo.ts:84` |
| `ease` 2 · `lerp` 0 · `spring` 0 · shake 0 · flash 0 · rotação 0 | contagem em 1628 linhas de `CapaJogo.tsx` + `motor-reflexo.ts` |
| `CapaJogo.tsx` com **1154 linhas / 58 KB** | `wc -l` |
| "Sequência fechada — o brinde é seu." e "Essa mecânica, com a marca da sua agência" **ilegíveis** | captura em 1358×682, partida real (17 acertos, 738 ms) |

A ilustração **não é o problema** — ela é boa. O problema é que a zona ocupada da cena
(casario aceso, barracas, gente) fica embaixo, e o texto mais importante da página também.
A hierarquia visual da arte está invertida em relação à hierarquia de informação.

## 3. Restrições herdadas — não negociáveis

Da spec anterior, §6 e §7. Elas restringem o desenho desta:

- **Nada de `shadowBlur`. Nada de `filter: blur()` por quadro.** Brilho sai de composição
  aditiva com sprite pré-assado. *Isto elimina a solução óbvia para o §4 — desfocar a cena
  no fim da partida. Ver §4.2.*
- **Piso de 45 fps mediano sob CPU 4× estrangulada**, medido por spec Playwright fora do CI.
- **`prefers-reduced-motion`:** fundo parado, estouro não desenhado, **jogo segue jogável**.
- **Sem áudio.** Todo retorno desta spec é visual e precisa se sustentar mudo — o que
  coincide com a regra de ativação: telão de evento está sempre sem som.
- **Tema é dado.** Tipo de alvo e reação de cena são desenhados **pelo tema**, nunca por
  código de jogo. Um segundo tema não pode exigir tocar no motor.

## 4. Fim de partida toma conta

**Prioridade 1.** É onde a página perde dinheiro hoje.

### 4.1 O princípio

Acabou a partida, acabou a função do cenário. Ele recua e o resultado vem à frente. Hoje os
dois disputam o mesmo plano e ambos perdem.

### 4.2 Como recuar sem blur

`filter: blur()` está proibido, e com razão — é custo de preenchimento por quadro. A cena
recua por **véu**, não por desfoque:

- um retângulo de cor da noite sobre a cena inteira, subindo de `alpha 0` a `~0.72` em
  **220 ms** com `easeOutQuad`
- a cena **para de animar** no mesmo instante — nada de brasa, bandeirinha ou balão
  atrás do resultado; um quadro parado sob véu custa zero e lê melhor que um animado
- o painel do resultado entra por cima com `easeOutBack`, deslocado ~12 px para cima

Custo: um `fillRect` por quadro durante 220 ms, e **menos** custo depois, porque a cena
congela. O véu é mais barato que o estado atual.

### 4.3 O que entra no painel, e em que ordem

A ordem é do mais emocional ao mais comercial, porque é a ordem em que a pessoa se importa:

1. **"Acabou o tempo."** — fecha o ciclo
2. **O número**, grande, em `--mono`, contando de 0 até o valor em 400 ms com mola
3. **A sequência e o brinde** — "Sequência fechada — o brinde é seu." É a recompensa, e
   hoje é a linha mais ilegível da página
4. **A frase que vende** — "Essa mecânica, com a marca da sua agência, no seu evento."
5. **Os dois botões**, com fundo sólido, não contorno sobre cena

O QR ganha âncora dentro do painel. Hoje ele flutua sobre os dançarinos.

### 4.4 O que isto não é

Não é modal. Não bloqueia rolagem, não captura foco à força, não escurece a página inteira
— só a área do canvas. O visitante que quiser rolar para o catálogo continua rolando.

## 5. A cena reage

**Prioridade 2.** O maior retorno por trabalho, porque o ativo já está pronto e ocioso.

Hoje a ilustração é papel de parede: linda e passiva. `temas/junino-fogos.ts`,
`junino-gente.ts` e `junino-movimento.ts` já existem e já sabem desenhar — não estão
ligados ao que acontece na partida.

O tema ganha um gancho opcional: `reagir(evento, intensidade)`. O motor não sabe que ele
existe; quem chama é o componente, e um tema que não o implemente continua funcionando.

| Evento | Reação no junino | Custo |
|---|---|---|
| acerto | bandeirinhas balançam a partir do ponto do acerto, decaindo | reaproveita o balanço que já existe |
| sequência ≥ 3 | fogueira cresce e clareia a praça | parâmetro no desenho que já existe |
| sequência fechada | dançarinos comemoram por ~1 s | quadro alternativo do sprite |
| erro de mira | uma bandeirinha apaga e reacende | inversão local de brilho |

Nenhuma reação cria objeto novo por quadro, e todas são no-op sob movimento reduzido.

## 6. Tipos de alvo

**Prioridade 3.** É o que mata "gameplay básica".

### 6.1 O diagnóstico

Todo alvo é idêntico, então em 30 segundos não há **nenhuma decisão** — só reação mais ou
menos rápida. Reação não é decisão, e é a decisão que faz aquilo parecer jogo. A escalada
de fases muda o ritmo, nunca a escolha.

### 6.2 Os três tipos

| Tipo | Leitura | Comportamento | Distribuição |
|---|---|---|---|
| **normal** | o balão de hoje | inalterado | ~70% |
| **premiado** | forma distinta + brilho aditivo | vale **3×**, vive **~55%** do tempo, raio menor | ~1 em 6, concentrado no `pico` |
| **recusa** | forma angular, escura | **não tocar** — toque zera a sequência | ~1 em 8, cresce no `pico` |

`Alvo` ganha `tipo: 'normal' | 'premiado' | 'recusa'`. Nada mais no tipo muda.

### 6.3 Por que a decisão nasce

**Premiado sozinho não cria decisão** — vira "toque no melhor primeiro", que ainda é reação
com prioridade. A decisão nasce porque ele **expira antes**: buscá-lo custa os normais que
morrem no desvio. Ganância contra banco.

**Recusa cria a segunda decisão, que é de identificação.** Exige reconhecer antes de agir —
é o que separa reflexo de perícia, e é o que faz querer jogar de novo, porque o erro é
claramente seu.

### 6.4 Forma antes de cor

O tipo se lê pelo **formato**, nunca só pela cor. Três razões comerciais:

- **daltonismo** — 8% dos homens; num evento, é gente que não joga
- **telão desloca cor** — projetor de evento não é monitor calibrado
- **troca de marca** — se "premiado" depender de dourado, a mecânica quebra no cliente de
  paleta fria, e a spec anterior fez tema ser dado justamente para isso não acontecer

### 6.5 Recusa não tira ponto

Só zera a sequência — exatamente a penalidade que `errosDeMira` já aplica, então não há
regra nova a aprender. Placar negativo numa ativação faz o jogador se sentir mal com a
marca do cliente na tela. Tensão sim, punição não.

### 6.6 Onde encosta

- `Alvo` ganha `tipo`; `tocar()` ramifica em três casos
- cada `FaseRepique` ganha sua distribuição — `chegada` quase só normal, para o jogador
  entender antes de ser cobrado
- `acertos` soma peso, não unidade
- o tema desenha os três; o motor nunca sabe como eles parecem

Ganho de graça: o brinde, que já exige fechar sequência, passa a ter aposta real — dá para
perder por ganância ou por desatenção, não só por clique no vazio.

## 7. Camada de movimento

**Prioridade 4.** Mata "sem peso". Tudo aqui é visual — não há áudio nesta rota.

| Técnica | Aplicação | Custo por quadro |
|---|---|---|
| **hit-stop** | 40 ms no acerto normal, 80 ms no premiado | zero — só zera o `dt` |
| **flash** | 80 ms de branco aditivo sobre o alvo acertado | um traço a mais |
| **overshoot na entrada** | alvo nasce em `easeOutBack` | substitui curva linear |
| **antecipação** | encolhe 3% por 60 ms antes de estourar | idem |
| **squash** | ao ser tocado, 180 ms | transformação, sem alocação |
| **shake com decay** | 2 px no acerto, 6 px na sequência fechada, decaindo a zero | `translate` + `rotate` |
| **mola no placar** | número sobe perseguindo, nunca salta | aritmética |

Curva por intenção, não por gosto: entra com `easeOutBack`, sai com `easeInCubic`, impacto
sem curva e a curva na recuperação, perseguição com mola. Janela de duração: **100–250 ms**
— abaixo não registra, acima lê como lentidão.

**Hierarquia.** Se todo evento recebe a mesma resposta, nada é importante. Acerto normal:
flash + squash. Premiado: flash + squash + shake + estouro maior. Sequência fechada:
tudo + reação de cena. Erro: só um tremor sutil.

## 8. Quebra do `CapaJogo.tsx`

1154 linhas num componente é o que torna as seções 4 a 7 caras de fazer e arriscadas de
revisar. A quebra não é refatoração oportunista — é pré-requisito, e sai **por extração,
sem mudar comportamento**, antes das demais:

| Arquivo | Responsabilidade |
|---|---|
| `CapaJogo.tsx` | o componente React: estado, efeitos, ligação com o DOM |
| `laco.ts` | o laço de quadro, `dt`, hit-stop, visibilidade |
| `movimento.ts` | curvas, shake, molas, squash — as receitas do §7 |
| `hud.tsx` | placar e painel de fim — o §4 |

`motor-reflexo.ts` e `temas/` não mudam de forma.

## 9. Orçamento de quadro

O piso de 45 fps sob 4× continua valendo, e esta spec **adiciona carga**. Duas defesas:

- o véu do §4.2 **reduz** custo — a cena congela quando o painel sobe
- tipos de alvo não somam objetos: o teto de alvos vivos por fase é o mesmo

O spec Playwright de medição previsto na §6 anterior passa a ser **pré-requisito desta
entrega**, não item paralelo: sem ele, as seções 5 e 7 degradam de forma invisível.

## 10. Acessibilidade

Herdado e não regride: canvas focável, com nome acessível, espaço/enter acerta o alvo
ativo. **Acréscimo:** o alvo `recusa` precisa ser distinguível pelo caminho de teclado —
o marcador do alvo ativo, desenhado pelo tema, indica o tipo por forma.

Sob `prefers-reduced-motion`: sem shake, sem overshoot, sem antecipação, sem reação de
cena. Hit-stop e flash **permanecem** — não são movimento, são temporização e brilho, e
são o que mantém o retorno de acerto legível para quem desligou animação.

## 11. O que NÃO entra

- **Trocar a mecânica.** Tocar em alvos fica. Trocar ameaça a curva de aprendizado zero,
  que é a regra sagrada de ativação.
- **Segundo tema.** A arquitetura aceita; a entrega não inclui.
- **Áudio.** Continua fora, pelas razões da spec anterior.
- **Modal de brindes 3D.** Subprojeto B, spec própria.
- **Quarto tipo de alvo.** Três é o teto do que se lê sem explicação.

## 12. Testes

- **motor:** distribuição de tipos por fase; `recusa` zera sequência e não altera pontos;
  `premiado` soma peso 3 e expira antes — tudo em `motor-reflexo`, sem canvas
- **movimento:** curvas e mola são funções puras, testadas por valor
- **e2e:** medição de quadros com piso de 45 fps sob 4×; jogo permanece jogável sob
  movimento reduzido; painel de fim é legível — contraste medido, não olhado
- **legibilidade:** teste que falha se qualquer texto do painel de fim ficar abaixo de
  4.5:1 contra o que estiver atrás dele

O último é o que impede a regressão que originou esta spec.

## 13. Riscos assumidos

- **Recusa pode frustrar.** Mitigado por não tirar ponto e por só aparecer depois da fase
  `chegada`. Se a taxa de abandono subir, é o primeiro item a reverter.
- **O véu esconde a ilustração** que custou caro. É deliberado: ela já cumpriu o papel
  durante a partida, e o fim pertence ao resultado.
- **A quebra do componente pode introduzir regressão visual.** Por isso sai primeiro, por
  extração pura, com a suíte existente verde antes de qualquer seção nova.

## 14. Critérios de aceitação

1. Toda linha do painel de fim tem contraste ≥ 4.5:1, medido em teste
2. Uma partida contém alvo premiado e alvo recusa, e ambos se distinguem por forma
3. Acerto produz hit-stop, flash e squash; sequência fechada produz reação de cena
4. 45 fps medianos sob CPU 4× estrangulada
5. Sob movimento reduzido o jogo segue jogável e o painel de fim segue legível
6. `CapaJogo.tsx` abaixo de 400 linhas
