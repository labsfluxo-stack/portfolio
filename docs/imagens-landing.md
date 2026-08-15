# Imagens da landing de captação

Instruções de geração e critério de aceite para as imagens de
`/[locale]/projetos`. Nasceu de uma conversa em 2026-08-15 e vale para qualquer
rodada futura de arte nessa página.

## A régua

A pesquisa que sustenta a landing
([research/2026-08-11](superpowers/research/2026-08-11-landing-captacao-pesquisa.md) §3.5)
lista **ausência de ilustração decorativa** como um dos seis marcadores do que lê
como premium técnico em 2026 — e quase tudo que ela classifica como datado é
imagem: ilustração corporativa genérica, mockup em perspectiva, screenshot em
moldura de notebook, foto de banco de imagens.

Some a isso um risco específico desta página: seu argumento inteiro é que as
afirmações dela são conferíveis. **Uma imagem que pareça gerada por IA sinaliza o
oposto de artesania.** O leitor não articula isso, mas registra.

> **Imagem que é demonstração entra. Imagem que é enfeite fica fora.**

## Paleta — não negociável

| Papel | Hex |
|---|---|
| fundo claro | `#F5F3EF` |
| tinta | `#08090C` |
| acento claro | `#0369A1` |
| linha | `#DDD9D2` |
| fundo escuro (só nas duas faixas) | `#08090C` |
| acento escuro (só nas duas faixas) | `#38BDF8` |

O acento troca conforme a polaridade. `#38BDF8` dá 1,93:1 sobre o papel e
reprova AA — ele **só** existe dentro das duas faixas escuras.

## Bloco reutilizável

Cole no fim de todo prompt:

```
Palette strictly limited to: #F5F3EF (warm off-white), #08090C (near-black),
#0369A1 (deep blue accent), #DDD9D2 (light rule). Flat vector, orthographic,
no perspective, no shadows, no gradients, no glow, no texture, no noise.
No text, no letters, no numbers, no people, no icons, no logos.
Swiss technical drawing sensibility: precise, calm, generous empty space.
```

Negativo, se a ferramenta aceitar:

```
photorealistic, 3d render, glossy, neon, purple, gradient mesh, blob,
organic shape, glowing brain, robot, circuit board, network of glowing dots,
wireframe sphere, laptop mockup, phone mockup, framed canvas, picture frame,
gallery wall, paper texture, scan, stock photo, corporate illustration,
flat people, text, watermark
```

## Prompts por posição

### 1 · Abertura — 16:9

> Abstract geometric composition on warm off-white ground. Several rectangular
> frames of different sizes, overlapping and nested inside one another, seen
> perfectly head-on. Outlines are thin 1px near-black strokes; two or three
> frames are filled solid near-black; a single small frame is filled deep blue.
> The composition drifts to the right side, leaving the left two-thirds almost
> empty.

### 2 · Oferta — 3:1, ou três quadrados separados

> Three abstract structures in a row, evenly spaced, equal visual weight. Left:
> a wide shallow rectangle filled with stacked horizontal lines. Centre: a tall
> narrow column of repeating small blocks. Right: a dense lattice of thin lines
> meeting at small square nodes. All in thin near-black outline on warm
> off-white; in each structure exactly one element is filled deep blue.

### 3 · A dupla — **faixa escura**, 16:9

Fundo diferente das outras. É uma das duas faixas escuras da página.

> Abstract composition on a near-black `#08090C` ground. Two identical
> **rectilinear** geometric forms side by side, mirrored, connected by thin cyan
> `#38BDF8` lines crossing symmetrically between them. Faint 1px structural
> lines in `#1F232B` behind. The two forms are interchangeable — neither is
> primary. Straight edges only, no curves, no organic contours. Sparse: fewer
> than thirty lines total.

### 4 · Prova — quadrado, um por sistema (opcional)

> Abstract representation of a layered software system, seen head-on.
> Horizontal bands stacked vertically, each band a different density of thin
> vertical lines — sparse at the top, dense at the bottom. Thin near-black
> strokes on warm off-white. One single band filled deep blue.

Varie a forma por sistema, seguindo o que
[`components/diagrams/SystemDiagram.tsx`](../components/diagrams/SystemDiagram.tsx)
já estabeleceu: **convergência** para o OSCapstack, **pipeline com portões** para
o Saturno, **faixas isoladas** para o Móveis.

## O que NÃO se gera

- **Rosto.** Os dois rostos da dupla precisam ser reais. Rosto sintético numa
  página que vende honestidade técnica é o erro mais caro possível — e a
  pesquisa (§4.4) aponta os rostos reais como o ativo que as agências anônimas
  não têm.
- **A comparação do JavaScript desligado.** Feita em SVG no código, na paleta
  exata. Nenhum gerador acerta geometria e cor de marca com precisão, e essa
  imagem não ilustra o argumento — ela *é* o argumento.
- **Qualquer texto dentro da imagem.** Texto renderizado é o que o crawler lê;
  texto dentro de PNG é invisível para ele. Numa página cujo argumento é
  legibilidade por IA, isso se contradiz sozinho.

## Critério de aceite

Rejeite se tiver:

- qualquer letra ou número
- sombra, brilho ou gradiente
- perspectiva ou 3D
- roxo, ou mais de quatro cores
- forma orgânica, blob, esfera em wireframe
- moldura física, parede, textura de papel, aparência de foto de quadro
- densidade que pareça "visualização de rede" — o clichê visual de IA

Peça **PNG ou SVG com fundo transparente** quando possível: assim a cor da seção
vem do CSS e não depende de o gerador acertar o off-white.

## Rodada 1 — 2026-08-15

Três imagens geradas no Gemini, em `docs/superpowers/`.

| Arquivo | Veredito |
|---|---|
| `…fpvzp1…` | **Aproveitável** com correção de cor. Composição certa, vazio à esquerda como pedido. Fundo mais quente que `#F5F3EF`, azul mais saturado que `#0369A1`, grão de papel visível. |
| `…pnaduo…` | **Composição é a melhor das três**, mas está fotografada como quadro emoldurado numa parede. Inutilizável assim. Regerar sem moldura, sem parede, sem sombra. |
| `…hy9hjt…` | **Regerar.** Conceito certo (dois iguais, conectados, intercambiáveis) mas as formas saíram orgânicas — esferas em wireframe — que estão na lista de rejeição, e a densidade a aproxima do clichê de "visualização de rede". Prompt 3 acima foi endurecido: *rectilinear*, *straight edges only*, *fewer than thirty lines*. |
