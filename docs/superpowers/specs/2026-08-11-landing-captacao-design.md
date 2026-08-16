# Landing de captação — "O critério"

**Data:** 2026-08-11 · **Rota:** `/[locale]/projetos` · **Pesquisa que a sustenta:**
[`research/2026-08-11-landing-captacao-pesquisa.md`](../research/2026-08-11-landing-captacao-pesquisa.md)

Página de captação de projeto, separada do portfólio e hospedada com ele. O portfólio
fala com recrutador; esta fala com dono de empresa. Mesma pessoa, dois leitores, duas
páginas — e é a separação que impede as duas mensagens de se atrapalharem.

Cada decisão aqui tem um número `D1`–`D13` no documento de pesquisa. Onde este spec
contraria intuição de mercado, é porque a evidência contraria — e a referência está
citada para quem for revisar daqui a seis meses.

## 1. Objetivo

Fazer um dono de empresa brasileiro sair da página com uma mensagem no WhatsApp, ou com
um critério na cabeça que faz ele voltar depois de comparar orçamentos.

Não é catálogo de serviço, não é portfólio, não é currículo. É uma página só, com um
destino só.

## 2. Posicionamento

### 2.1 A tese

O que une site, blog e sistema **não é o artefato, é o padrão de construção.** Sem essa
costura a página vira "faço de tudo", que é o posicionamento mais fraco possível.

### 2.2 O que se promete, e o que não

A oferta de "aparecer nas respostas de IA" é, em grande parte, coisa que um desenvolvedor
não controla: estima-se que ~85% das menções de marca em resposta de IA venham de páginas
de terceiros — Reddit, Wikipedia, YouTube, Reclame Aqui. Reputação distribuída pela web
não sai de código.

O que se controla, é verificável e a maioria dos sites falha:

> **Nenhum crawler de IA relevante executa JavaScript.** GPTBot, ClaudeBot,
> PerplexityBot e Meta baixam o `.js` e leem como texto, sem rodar. Site montado no
> navegador chega vazio para eles — mesmo ranqueando bem no Google. (Exceção: o Gemini,
> que usa a infraestrutura do Googlebot.)

Daí a promessa da página: **"a IA consegue ler seu site"**, nunca *"seu site vai aparecer
no ChatGPT"* (`D3`).

### 2.3 Vocabulário

**"GEO" não entra, em lugar nenhum** (`D1`). No Brasil a sigla significa geolocalização —
busca por "o que é GEO" em contexto de marketing retorna geomarketing na primeira página
inteira. Ordem de reconhecimento do dono de empresa: **"aparecer no ChatGPT"** → "SEO
para IA" → GEO.

A pesquisa registra que GEO pode somar autoridade *depois de explicado*. Esta página não
tem esse espaço — explicar a sigla custaria um parágrafo que compete com o critério de
§4.2, que é o que de fato converte. Fica de fora inteira, e o critério de aceitação §10.8
trava isso.

Também fora: "AI Overviews" (ele reconhece *"aquele resumo que aparece em cima no
Google"*), "AEO", "entidades", "engenharia de relevância".

### 2.4 Tom

Sem urgência (`D5`). Os dados brasileiros não a sustentam: tráfego de IA é **0,10%** do
total (Leadster, 2.425 sites, 173 milhões de acessos), ainda que converta **7,80%** contra
3,4% do Google. A frase honesta é *"é pouca gente ainda, mas é a que compra"*.

E **nada de previsão vencida**: a estimativa do Gartner de queda de 25% nas buscas até
2026 é citada em metade das páginas de GEO do Brasil, venceu neste ano e não se cumpriu.
Usá-la entrega ao cliente uma forma fácil de desmentir a página.

### 2.5 A dupla como argumento (`D12`)

O mercado dispara duas críticas: agência cobra **estrutura que não escreve o código**;
freelancer é **ponto único de falha**.

> Dois full-stack sêniores é a única configuração que neutraliza as duas ao mesmo tempo —
> acesso direto a quem escreve o código **e** redundância. Nenhuma página brasileira
> analisada articula isso.

O "2" é **número exibido**, em formato de métrica ao lado de anos e projetos. Nunca em
tom de desculpa ("apesar de sermos pequenos").

## 3. Conceito visual

### 3.1 Polaridade — claro com faixas escuras (`D9`)

Rompe com o fundo escuro do portfólio, e a razão é o leitor ser outro:

| | Portfólio | Landing |
|---|---|---|
| Quem | Recrutador técnico | Dono de empresa |
| Idade | 25–40 | 35–60 |
| Tela | Desktop | Celular |
| Luz | Escritório | Sol, loja, obra |
| Motivo | Interesse | A contragosto |

NN/g: polaridade positiva vence em acuidade visual **em todas as faixas etárias**, e a
vantagem do claro **cresce conforme a fonte diminui** — o que importa muito no celular.
Estudo de polaridade por idade: fundo escuro eleva carga cognitiva medida em leitor mais
velho sob luz ambiente.

A identidade não mora no fundo preto. Mora no **mono dos labels, na borda de 1px, no
espaço vazio e na cor de destaque única** — tudo isso sobrevive à inversão.

**Faixas escuras `#08090C`, full-bleed:** a seção da dupla (§4.4) e o CTA final (§4.7).

> **Emenda de 2026-08-16 — passaram a ser três.** A terceira é o fecho, depois do FAQ.
> A página *terminava em acordeão fechado*: a última coisa que o visitante via eram
> barras cinzas sem conteúdo aberto, e ela parava em vez de fechar. Sem a faixa, o
> encerramento acontece no mesmo tom claro em que a página passou 80% do tempo, e
> nada avisa ao olho que chegou ao fim. Duas pontuavam o meio; esta encerra. São os dois momentos em que o ciano volta ao ambiente nativo e o ar de
terminal aparece inteiro, sem impor polaridade negativa a nenhum bloco de leitura
contínua.

### 3.2 Tokens da polaridade clara (`D10`)

Conjunto **novo**, não inversão do existente. Contrastes medidos com a fórmula de
luminância relativa da WCAG 2.1:

| Papel | Hex | Sobre `#F5F3EF` |
|---|---|---|
| fundo | `#F5F3EF` | — |
| tinta | `#08090C` | 17,97:1 AAA |
| texto secundário | `#4A505A` | 7,33:1 AAA |
| acento | `#0369A1` | 5,35:1 AA |
| borda | `#DDD9D2` | decorativa |

Dois pontos que a implementação não pode errar:

- **`--color-faint` (`#4A505A`) inverte de função.** No escuro é "só linha, nunca
  palavra"; no claro é **AAA para texto**. Prova de que o conjunto precisa ser separado.
- **`#38BDF8` (ciano) dá 1,93:1 no claro — reprova.** Só existe dentro das faixas
  escuras, onde dá 9,29:1. O acento do corpo claro é `#0369A1`, que **o CV já usa**.

### 3.3 Regras de forma

O que lê como premium técnico em 2026 não é a cor de fundo: é **uma** cor de destaque,
espaço vazio generoso, tipografia grande com hierarquia agressiva, ausência de ilustração
decorativa, **borda de 1px em vez de sombra**, e o resultado mostrado reto e cheio.

Proibido, por já ler como datado ou por sinalizar fraqueza: gradiente roxo-azul com blob;
mockup em perspectiva 3/4; ilustração *Corporate Memphis*; screenshot em moldura de
notebook; faixa de logos de cliente em cinza a 40%; ícone em círculo colorido no topo de
três cards iguais; contador animado (animar "12" chama atenção para o 12).

### 3.4 Movimento

Sem pesquisa por trás — é decisão de projeto, não achado.

Animar **estado**, não decoração: hover de botão, foco de campo, a barra de CTA surgindo
na primeira rolagem. Revelação por scroll com deslocamento curto (8–12px, 150–200ms);
o que denuncia template é o **padrão uniforme**, não o movimento. Zero parallax, zero
scroll-jacking. Se houver um momento autoral, que seja a transição para a faixa escura.
`prefers-reduced-motion` respeitado.

## 4. Seções

Ordem derivada de duas evidências. Primeira: NN/g eyetracking — **65% da atenção fica nos
primeiros 40% da página**, o que torna a regra orçamentária, não sequencial. Segunda: o
padrão das páginas brasileiras que funcionam — problema → método → prova → preço → CTA.

Não existe teste A/B publicado sobre ordem de seções em landing B2B de ticket alto.
Quem afirmar o contrário está apresentando gosto pessoal; esta ordem também é uma
escolha, só que declarada.

### 4.1 Abertura

Passa o teste que o NN/g mostrou que a maioria dos sites B2B reprova: *o que essa empresa
faz e isso é para mim?*

> # Sites, blogs e sistemas sob medida.
>
> Construídos para carregar rápido, aparecer no Google e **ser lidos pelo ChatGPT**.
>
> `[ QUERO UM ORÇAMENTO ]`
>
> <sub>Dois desenvolvedores full-stack. Você fala direto com quem escreve o código.</sub>

**Sem preço aqui** (`D11`) — ver §4.6.

### 4.2 O critério

A seção mais importante, e a que substituiu a versão anterior ("o que mudou").

Gartner, mais de 1.000 compradores B2B: 89% acharam a informação de boa qualidade e
mesmo assim se sentiam paralisados, porque as informações eram **contraditórias entre
fornecedores**. O problema não é falta de informação — é impossibilidade de julgar. Quem
adotou *sense-making* (dar critério em vez de despejar argumento) fechou negócio de alta
qualidade em 80% dos casos.

Então a página não ensina o que é GEO. **Dá um critério para ele julgar os três
orçamentos que já vai receber** — e o critério, convenientemente, é aquele em que a gente
ganha.

> ## Como saber se o site que te entregarem presta
>
> Você vai receber três orçamentos e todos vão parecer iguais. Dois testes separam.
>
> **Abra num celular, no 4G.** Passou de dois segundos, você perde gente antes de ela ver
> qualquer coisa.
>
> **Peça para ver o site com o JavaScript desligado.** Se a tela ficar em branco, é
> exatamente isso que o ChatGPT enxerga: nada.
>
> O segundo teste quase ninguém faz. Quando perguntam ao ChatGPT qual empresa contratar
> no seu ramo, ele lê o site direto do servidor — não abre no navegador como você. Site
> que se monta no navegador chega vazio.
>
> Não é previsão, é como funciona hoje. E também não é a emergência que te vendem: esse
> tipo de visita ainda é 0,1% do total no Brasil. Só que converte mais que o dobro do que
> vem do Google.

Isso responde de graça a objeção **"meu sobrinho faz"**, que nenhuma página brasileira
analisada enfrenta — construtor de página e SPA sem renderização no servidor é
exatamente o que sai de quem não sabe, e é demonstrável ao vivo.

`D7`: isto **não** é uma seção "apareça na IA". Virar seção própria criaria dois produtos
numa página só.

### 4.3 O que eu construo

Três cartões. Cada prova técnica traduzida em consequência, com o termo ao lado — o dono
lê a consequência, o técnico reconhece o termo, ninguém precisa dos dois (`D8`).

| | |
|---|---|
| **Site** | Institucional, de produto ou de captação. Abre instantâneo e o texto já vem pronto do servidor — que é o que o Google e o ChatGPT leem. |
| **Blog** | Onde a autoridade se acumula. Publicou, os buscadores sabem em segundos. |
| **Sistema sob medida** | Quando a operação não cabe em site. CRM, ERP, painel, automação — do banco ao ar. |

**Fora:** `llms.txt` (`D2` — 97% dos arquivos nunca receberam uma requisição, e o Google
afirma que não afeta visibilidade), e dados estruturados como promessa de citação (`D4` —
teste antes/depois em 1.885 páginas mostrou que as citações mal se moveram). Os dois
continuam sendo entregues. Nenhum dos dois é argumento de venda.

### 4.4 Como trabalhamos — **faixa escura**

Estrutura de negação, que é o que o mercado usa e funciona: dizer o que **não** se faz é
mais crível que adjetivo, porque tem custo — exclui trabalho.

> ## Dois desenvolvedores full-stack
>
> Você fala direto com quem escreve o código. Sem gerente de projeto, sem estagiário, sem
> terceirização.
>
> E não depende de uma pessoa só: os dois conhecem o código inteiro.
>
> **2** desenvolvedores · **10+** anos em produção · **5** sistemas no ar

O último parágrafo é o argumento que ninguém faz (§2.5). O "2" aparece no mesmo formato
visual dos outros números.

**Os números vêm do dicionário, não são escritos aqui de novo.** O portfólio já mantém
`sistemas construídos: 9`, `em produção: 5` e `anos: 10+`, cada um com o campo
`provenance` declarando como foi medido (2026-08-02). A landing consome os mesmos
valores — se ela repetisse os números à mão, as duas páginas divergiriam na primeira
recontagem e a página que vende honestidade estaria mentindo em silêncio.

Isso também atende o achado da pesquisa de que **número sem metodologia lê como
marketing, e número com ressalva lê como engenheiro**: a proveniência já existe e é
reaproveitada.

### 4.5 A prova

Depoimento é **sinal barato** — qualquer um escreve, e o comprador sabe. Software sob
medida vendido a dono não técnico é *credence good*: ele não consegue avaliar a qualidade
nem depois de consumir. A saída não é substituir depoimento por algo parecido, é trocar
sinal barato por **sinal caro e verificável**.

E na lista do que de fato influencia decisão (TrustRadius, 1.862 compradores),
**demonstração vem acima de avaliação de terceiros**.

Duas camadas:

1. **Esta página como demonstração** — afirmações falsificáveis, conferíveis em trinta
   segundos, não adjetivos. Número verificável é caro de forjar; adjetivo é grátis.
2. **Os três cases**, com número **e metodologia declarada**. Número sem metodologia lê
   como marketing; número com ressalva lê como engenheiro. Admitir limite é custoso —
   quem infla não faz.

Erro explicitamente proibido aqui: provar competência técnica e esquecer de provar
satisfação. Uma das páginas analisadas estampa "Lighthouse 95+" para um público que não
avalia isso.

### 4.6 Preço (`D6`, `D11`)

**Única variável de toda a pesquisa com evidência direta de que move resultado.** NN/g
descreve a ausência de preço como *"o elemento mais hostil ao usuário da maioria dos
sites B2B"* e **observou participantes abandonarem o site e irem para o concorrente** por
isso. TrustRadius: preço transparente é o desejo nº 1 por quatro anos seguidos.

Contrapeso: nenhuma das páginas brasileiras de referência publica piso de projeto.
Seguir o mercado, porém, é fazer o que as páginas fracas fazem.

Execução, seguindo o padrão local de quem publica:

- **"A partir de R$ X"**, uma linha. Nunca faixa fechada, nunca tabela para escopo sob
  medida.
- **Depois da prova, antes do CTA final.** O piso qualifica *depois* de convencer.
- Uma frase curta sobre o que muda o valor — dar critério reduz a paralisia mais que o
  número em si.
- Âncora de mercado: sênior brasileiro cobra R$ 90–220/hora. Piso que implique valor-hora
  muito abaixo disso trabalha contra o posicionamento.

Modelado como **string opcional**: vazia, a seção não renderiza. Permite subir a página
antes de o número estar decidido.

### 4.7 Chamada final — **faixa escura**

> ## Traz o problema.
> Me conta o que precisa existir e para quando.
>
> `[ QUERO UM ORÇAMENTO ]`
>
> <sub>Resposta em até X horas. Sem ligação, sem cadastro.</sub>

O microtexto existe porque o medo de quem clica não é o preço, é **ser perseguido por
vendedor**. Dizer o que acontece do outro lado provavelmente faz mais pelo clique que a
palavra do botão.

### 4.8 Perguntas

Curta, no fim, para o subconjunto que já se engajou. Cobre objeções que a pesquisa
mostrou serem previsíveis:

- **"E se um de vocês ficar indisponível?"** — responder objeção não verbalizada é o que
  produz sensação de solidez.
- **"Isso substitui o SEO?"** — não; o SEO continua valendo para a busca tradicional.
  Aparece em quase toda página do setor.
- **"Quanto tempo leva?"** — faixa honesta, nunca promessa única.

## 5. Arquitetura técnica

### 5.1 Rota

`app/[locale]/projetos/page.tsx`, **fora do route group `(site)`** — mesmo padrão que
`cv` e `og` já usam. Sem Header, Footer nem SkipLink: numa landing, todo item de menu é
uma saída.

Layout próprio mínimo em `app/[locale]/projetos/layout.tsx`, porque a polaridade clara
precisa sobrescrever o `body` escuro de `globals.css`. Usar `html body` (especificidade
0,0,2) em vez de `body` (0,0,1) — mesma solução já aplicada na rota do CV, e que não
depende de ordem de inserção nem de `!important`.

### 5.2 Conteúdo

Chave `landing` no `Dictionary` (`content/types.ts`), preenchida em `pt.ts` e `en.ts`. O
type-checker garante que nenhuma das duas fique pela metade.

PT é a versão que importa — o público é brasileiro e o CTA é WhatsApp. EN sai junto
porque abrir exceção para uma rota custa mais que traduzir.

### 5.3 Componentes

`components/landing/`, pasta nova. Cada um recebe seu pedaço do dicionário e não conhece
o resto:

| Componente | Papel |
|---|---|
| `LandingHero` | §4.1 |
| `Criterio` | §4.2 |
| `Oferta` | §4.3 — três cartões |
| `Dupla` | §4.4 — faixa escura |
| `Prova` | §4.5 — reaproveita `SystemCard` e `content/systems.ts` |
| `Piso` | §4.6 — não renderiza se a string for vazia |
| `LandingCta` | §4.7 — faixa escura |
| `Perguntas` | §4.8 |
| `BarraCta` | Barra fixa de rodapé, só mobile |

`Prova` **não duplica case nenhum** — consome os dados que já existem.

### 5.4 CTA de WhatsApp (`D13`)

**O número já existe no projeto e não precisa de variável de ambiente.**
`content/pt.ts` mantém `contact.whatsapp` (`https://wa.me/55…`) e
`contact.whatsappMessage`, já usados pela seção Contato e já públicos no portfólio no ar.

A landing consome **o mesmo campo**, com mensagem própria — quem chega por aqui não veio
pelo portfólio, e a primeira frase deve dizer isso. Uma chave nova
`landing.whatsappMessage` no dicionário; o número continua tendo uma fonte só, para não
divergir no dia em que mudar.

Descartada a ideia inicial de `NEXT_PUBLIC_WHATSAPP`: criaria um segundo lugar para o
mesmo dado, com risco de as duas páginas apontarem para números diferentes.

- **Mobile: barra fixa no rodapé, largura total**, altura mínima 48px, na zona do polegar.
  **Não bolha redonda:** o Baymard documenta que bolha fixa cobre o conteúdo que a pessoa
  está tentando ler, e o NN/g registrou participantes **ignorando completamente** botão de
  chat flutuante em posição inesperada.
- `padding-bottom` no corpo do tamanho da barra — é exatamente o defeito documentado.
- **Desktop: sem bolha.** CTA inline repetido no hero, depois da prova e na faixa final.
  Mesmo destino sempre; **nunca um segundo destino**.
- **Cor:** botão na cor do sistema com o **ícone oficial monocromático**. Não usar
  `#25D366` — dá **1,79:1** sobre o fundo claro, reprova, e o verde saturado é o marcador
  visual de widget genérico.
- **Testar `position: fixed` no Safari do iPhone**, não só no Chrome do Android: há
  histórico de deslocamento quando a barra de endereço recolhe.
- **Testar dentro do navegador embutido do Instagram**, que é por onde boa parte do
  tráfego vai chegar — viewport menor, e a barra do app disputa espaço com a nossa.

### 5.5 SEO e GEO

- Entrar em `PATHS` no `scripts/generate-seo-files.mts`, senão a rota nasce fora do
  sitemap e do `llms.txt`.
- `metadata` própria, `hreflang` entre pt e en.
- Imagem OG própria — ver §6.

### 5.6 Performance

Fonte de corpo **mínima 17–18px**: a vantagem do fundo claro cresce conforme a fonte
encolhe, então fonte pequena seria desperdiçar o ganho da polaridade.

Sem WebGL nesta rota. O pórtico do portfólio é decoração cara que aqui só atrasaria o
primeiro parágrafo — e o histórico recente mostrou que ele custa uma tarefa longa na
thread principal.

## 6. Correção colateral — deriva na lista de OG

Achado durante o reconhecimento, e é do mesmo tipo já corrigido duas vezes neste projeto:
teste que passa por acidente.

A rota deriva os alvos do código:

```ts
// app/[locale]/og/[slug]/page.tsx
const OG_SLUGS = ['home', ...SYSTEM_SLUGS] as const
```

O script que fotografa os cards mantém a própria lista, escrita à mão:

```ts
// scripts/generate-og.mts:28
const SLUGS = ['home', 'oscapstack', 'saturno-labs', 'moveis-pro'] as const
```

As duas não se falam e **nenhum teste compara uma com a outra** — varredura em `tests/`
confirma que tudo deriva de `SYSTEM_SLUGS` e ninguém olha o literal do script. Hoje
coincidem por sorte; no dia em que divergirem, a metadata aponta para um PNG que não
existe e a suíte fica verde.

A landing encosta nisso porque quer card próprio. **Correção:** o script importa a lista
em vez de repeti-la, com teste travando a igualdade.

## 7. Testes

- **Unitários por componente**, em `tests/unit/`.
- **`Piso` não renderiza com string vazia** — é o que permite subir antes do número
  existir.
- **CTA cai para e-mail sem `NEXT_PUBLIC_WHATSAPP`** — a página nunca fica sem saída.
- **Portão GEO** (`tests/static-html.test.ts`): o argumento e o CTA presentes no HTML
  estático. Uma página que promete ser legível por IA precisa ser verificada exatamente
  nisso.
- **Contraste**: teste que trava os pares da polaridade clara acima dos mínimos AA. Os
  valores de §3.2 foram medidos; o teste impede que uma troca de token os quebre em
  silêncio.
- **Igualdade das listas de OG** (§6).
- **E2E**: a rota existe em `out/` nos dois idiomas, e a barra fixa não cobre conteúdo.

## 8. Pendências de dados

Bloqueiam a publicação, não a implementação.

- **Piso de preço** — §4.6. String opcional: vazia, a seção não renderiza.
- **Prazo de resposta** — o "X horas" do microtexto de §4.7.
- **Foto** — pendência herdada; `public/foto/` ainda não existe.

~~Número do WhatsApp~~ — **já existe** em `content/pt.ts` (`contact.whatsapp`), público
no portfólio desde o lançamento. Ver §5.4.

## 9. Riscos assumidos

- **Polaridade clara rompe com a identidade do portfólio.** Assumido: o leitor é outro
  (§3.1), e a identidade sobrevive no mono, na borda fina e no vazio.
- **Publicar piso contraria 100% das páginas brasileiras de referência.** Assumido: é a
  única decisão com evidência direta de que move resultado.
- **CTA de WhatsApp direto é mais agressivo que a norma local** ("diagnóstico gratuito").
  Aceito: reduz uma etapa, e o microtexto de §4.7 desarma o medo do vendedor.
- **Um só exemplo real de blog com o padrão que se vende.** Mitigado pela demonstração
  auditável (§4.5), que é sinal mais caro que depoimento.
- **Sem domínio próprio**, a URL é subpasta de repositório do GitHub — fraco para
  credibilidade comercial. Decisão adiada pelo dono; `SITE_URL` e `basePath` já vêm de
  variável de ambiente, então migrar é configuração, não refatoração.

## 10. Critérios de aceitação

1. A rota existe nos dois idiomas, sem Header nem Footer, e aparece no sitemap.
2. O corpo é claro; as faixas escuras pontuam e não dominam — duas no meio (dupla e
   CTA) e uma de fecho, depois do FAQ. Ver a emenda em §3.1.
3. Nenhum par de cor usado em texto reprova AA, com teste travando isso.
4. `#38BDF8` não aparece fora das faixas escuras.
5. O CTA tem um único destino, repetido, e o número vem de `contact.whatsapp` — não há
   segunda cópia do número no repositório.
6. No mobile a barra fixa não cobre conteúdo, e foi testada no Safari do iPhone e dentro
   do Instagram.
7. A linha de piso some quando a string está vazia.
8. As palavras "GEO", "llms.txt" e "AI Overviews" não aparecem na página.
9. Nenhuma promessa de que o cliente **vai aparecer** nas respostas de IA.
10. O argumento e o CTA estão presentes no HTML estático, verificados pelo portão GEO.
11. As duas listas de slug de OG são a mesma, com teste travando.
12. `prefers-reduced-motion` respeitado.
13. Nenhum número é escrito à mão na landing — todos vêm do dicionário, com a
    `provenance` que já existe (§4.4).
