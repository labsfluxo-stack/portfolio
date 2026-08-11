# Pesquisa — Landing de captação de projeto

**Data:** 2026-08-11 · **Status:** 4 de 4 frentes concluídas · **Destino:** alimenta o spec da landing

Documento de pesquisa, não de decisão de produto. O que aqui vira regra está marcado
como tal em [Decisões forçadas](#decisões-forçadas-pela-pesquisa); o resto é material
de consulta para quando alguém perguntar "por que a página diz isso e não aquilo".

Existe porque a landing vende uma promessa técnica sobre um mercado em movimento, e
promessa técnica errada numa página pública é dano de reputação difícil de desfazer.
A regra de trabalho foi pedir aos pesquisadores que **contradissessem as premissas**
em vez de confirmá-las — e três das premissas caíram.

## Escala de confiabilidade

Usada em todos os achados abaixo. Ela é o ponto do documento: sem separar o que foi
medido do que foi repetido, "pesquisa" vira coleção de citações de blog.

| Grau | Significado |
|---|---|
| **[SÓLIDO]** | Fonte primária, metodologia pública, ou experimento controlado |
| **[MODERADO]** | Survey grande de fornecedor, ou teoria acadêmica estabelecida sem teste no contexto |
| **[CORRELAÇÃO]** | Dado real e amostra grande, sem causalidade demonstrada |
| **[FRACO]** | Alegação de vendedor, sem primária localizável |
| **[FOLCLORE]** | Sem teste, ou teste único jamais replicado, repetido como consenso |
| **[NÃO USAR]** | Falso, vencido, ou circular |

## Frentes

| # | Frente | Status |
|---|---|---|
| 1 | GEO como serviço no mercado brasileiro | concluída |
| 2 | Estrutura de conversão e copywriting | concluída |
| 3 | Design de landing 2026 | concluída |
| 4 | Concorrentes brasileiros | concluída |

---

## Decisões forçadas pela pesquisa

Cada linha aqui mudou o desenho que já estava proposto. A coluna da direita é o que
entra no spec.

| # | O que estava proposto | O que a pesquisa mostrou | Decisão |
|---|---|---|---|
| D1 | "GEO" como termo da página | No Brasil a sigla significa **geolocalização** | Termo é **"aparecer no ChatGPT"**. GEO só como nota técnica, nunca em H1 |
| D2 | `llms.txt` como bullet de diferencial | **97% dos arquivos nunca receberam uma requisição** | Sai da página. Continua sendo entregue, sem alarde |
| D3 | Prometer aparecer nas respostas de IA | ~85% das citações vêm de **páginas de terceiros** | Promessa vira **"a IA consegue ler seu site"** |
| D4 | Dados estruturados como fator de citação | Teste antes/depois em 1.885 páginas: citações **mal se moveram** | Fica como boa prática. Não é promessa de citação |
| D5 | Tom de urgência | Tráfego de IA no Brasil = **0,10%** do total | Tom é "pouco volume, alta qualidade, chegue antes" |
| D6 | Página sem preço nenhum | Única variável da pesquisa com **evidência direta contra** | Entra **piso** ("a partir de R$ X"), sem tabela |
| D7 | Seção separada de "apareça na IA" | Criaria dois produtos numa página só | Vira **critério de julgamento** do site, não seção própria |
| D8 | Bullets técnicos (Core Web Vitals, WCAG) | Público não técnico processa isso como ruído | Cada prova técnica **traduzida em consequência**, com o número verificável ao lado |
| D9 | Fundo escuro, como no portfólio | Vantagem do claro **cresce conforme a fonte diminui**; polaridade negativa eleva carga cognitiva medida em leitor mais velho sob luz ambiente | **Corpo claro**, 1 ou 2 faixas escuras como pontuação |
| D10 | Reaproveitar os tokens do portfólio | `#38BDF8` sobre `#F5F3EF` ≈ 1,9:1 e `#878C96` ≈ 3,0:1 — os dois reprovam AA | **Segundo conjunto de tokens** para polaridade clara, não inversão dos mesmos |
| D11 | Piso de preço no hero | Padrão unânime do mercado BR: piso aparece **do meio para o fim**, depois da prova | Piso desce para logo antes do CTA final |
| D12 | Time de 2 talvez fique de fora | Dupla é a única configuração que neutraliza as duas objeções do mercado ao mesmo tempo | Entra **na dobra**, e o "2" vira número exibido |
| D13 | Bolha verde flutuante de WhatsApp | Baymard: bolha fixa cobre conteúdo no mobile; NN/g: posição inesperada é ignorada | **Barra fixa no rodapé** no mobile; CTA inline no desktop; ícone oficial sem o verde saturado |

## Entradas que faltam do dono

Bloqueiam a implementação, não o spec.

- **Número do WhatsApp** — formato internacional (`55` + DDD + número). Vai para
  `NEXT_PUBLIC_WHATSAPP`; ausente, o CTA cai para o e-mail que já existe.
- **Piso de preço** — o valor a partir do qual vale a pena pegar um projeto (D6).
  Modelado como string opcional no dicionário: vazia, a linha não renderiza.
- **Foto** — pendência herdada do portfólio, `public/foto/` ainda não existe.

---

## Frente 1 — GEO como serviço no mercado brasileiro

### 1.1 O termo "GEO" está ocupado no Brasil

Busca por "o que é GEO" em contexto de marketing brasileiro retorna, na primeira
página inteira, **geolocalização e geomarketing** — Cortex, Meio&Mensagem, WEBi,
Quality. Nenhum resultado de *Generative Engine Optimization*. **[SÓLIDO** como
observação de SERP; o comparativo de volume no Google Trends não foi obtido, a
ferramenta respondeu HTTP 429.**]**

Ordem de reconhecimento pelo dono de empresa brasileiro:

1. **"aparecer no ChatGPT"** — literal, zero jargão. É como o próprio mercado escreve
   quando quer ser entendido. Melhor aposta para H1.
2. **"SEO para IA"** — ponte: "SEO" ele já conhece, "para IA" atualiza. É o termo que
   as agências usam no meio da página, depois de fisgar.
3. **"GEO" / "AEO"** — só depois de explicado. Serve para autoridade, custa clareza.

"AI Overviews" também não é reconhecido. O que ele reconhece é *"aquele resumo que
aparece em cima no Google"*.

### 1.2 O que o mercado brasileiro faz hoje

Headlines literais coletadas:

- *"Agência de GEO: como fazer sua marca ser citada pelas IAs"* — [PWR](https://www.pwrmarketingdigital.com.br/agencia-de-geo).
  CTA "Faça um diagnóstico de GEO gratuito", sem preço, sem estatística.
- *"Agência SEO para dominar a SERP e AI Search"* — [ARD](https://ardmarketing.com.br/agencia-seo/).
  Sub-headline com "AEO", "GEO", "engenharia de relevância", "LLMs" — ilegível para
  não técnico. 22 perguntas de FAQ.
- *"Como fazer seu site aparecer no ChatGPT, Gemini e Google"* — [Weber](https://agenciaweber.com.br/site-aparecer-chatgpt-gemini/).

Padrões: **ninguém publica preço**; o CTA universal é "diagnóstico gratuito" — o que
torna o CTA de WhatsApp direto mais agressivo que a norma do mercado; a estrutura
padrão é "SEO x GEO: qual a diferença" seguida de "por que já importa em 2026".

Frase de posicionamento mais afiada encontrada, literal da PWR:

> SEO disputa posição numa lista de links e o usuário clica e escolhe. O GEO disputa
> a citação dentro de uma resposta pronta, em que a IA já escolheu por ele.

O ponto emocional é **"a IA já escolheu por ele"** — tira o cliente da posição de quem
compete e coloca na de quem foi excluído sem saber.

### 1.3 Números defensáveis

**Leadster — Panorama de Geração de Leads no Brasil 2026.** Base: 2.425 sites, 173
milhões de acessos, 3,4 milhões de leads. Tráfego de ChatGPT/Perplexity/Gemini =
**170,5 mil acessos, 0,10% do total**. Conversão desse tráfego = **7,80%**, contra
**3,4%** do Google. [Fonte](https://leadster.com.br/blog/panorama-geracao-de-leads-2026/) · **[SÓLIDO]**

> É o dado brasileiro mais importante do documento, e o mais desconfortável.
> Volume minúsculo, qualidade altíssima. Vender "todo mundo migrou para a IA" é
> mentira verificável. Vender "é pouca gente, mas é a que compra" é verdade e vende
> melhor.

**Conversion — concentração de plataforma.** 6,77 milhões de sessões, 166
propriedades, nov/2024 a mai/2026: **ChatGPT = 92,4%** de todo o tráfego de referência
de IA. Gemini ~3,2%; Perplexity, Copilot e Claude abaixo de 1% cada.
[Fonte](https://www.conversion.com.br/blog/chatgpt-trafego-indicacao-ia/) · **[SÓLIDO]**
→ Listar "ChatGPT, Gemini, Perplexity e AI Overviews" é correto e dilui. Na prática é
ChatGPT e o resto.

**Pew Research — CTR com resumo de IA.** Com resumo presente, o usuário clica em
resultado tradicional em **8%** das visitas, contra **15%** sem. Clique em link dentro
do resumo: **1%**. Base: 900 adultos, 68.879 buscas reais, mar/2025.
[Fonte](https://www.pewresearch.org/short-reads/2025/07/22/google-users-are-less-likely-to-click-on-links-when-an-ai-summary-appears-in-the-results/) · **[SÓLIDO]** · ressalva: EUA.

**SparkToro/Datos — zero-click.** 68,01% das buscas no Google terminaram sem clique
(EUA, jan–abr/2026), contra 60,45% em 2024.
[Fonte](https://sparktoro.com/blog/in-2026-less-than-one-third-of-google-searches-still-send-a-click/) · **[SÓLIDO]**

**Ahrefs — CTR da posição 1.** Caiu de 7,6% para 1,6% em keywords informacionais com
AI Overview, dez/2023 a dez/2025. **[MODERADO]** — o número é real, mas mede *só a
posição 1 em keywords informacionais*. Virou "sites perderam 58% do tráfego" no boca a
boca, o que não foi o que se mediu.

### 1.4 Números a descartar

- **[NÃO USAR] Gartner: "busca cai 25% até 2026".** O
  [press release existe](https://www.gartner.com/en/newsroom/press-releases/2024-02-19-gartner-predicts-search-engine-volume-will-drop-25-percent-by-2026-due-to-ai-chatbots-and-other-virtual-agents)
  (fev/2024) e é citado em metade das páginas de GEO do Brasil. **Estamos em agosto de
  2026 e não aconteceu** — o volume cresceu. Usar previsão vencida, no ano em que
  venceu, entrega ao cliente uma forma fácil de desmentir a página.
- **[NÃO USAR]** "1,2% das empresas brasileiras têm otimização para IA vs 23% nos EUA"
  — sem primária localizável.
- **[NÃO USAR]** "Tráfego de IA converte 14,2% vs 2,8%" — conflita com o dado sério do
  Leadster. Use o Leadster.
- **[NÃO USAR]** "56% dos líderes investiram em GEO", "43% já implementam" — pesquisas
  de autoexclusão promovidas por fornecedor. Medem entusiasmo, não resultado.
- **[FRACO]** "46,5% dos brasileiros usam IA para pesquisar/comprar" (Optimiza,
  n=1.000). Autodeclarado e patrocinado por quem vende o serviço. Contrasta com os
  0,10% de tráfego medido por log — a diferença é *"eu uso IA para pesquisar"*
  (declarado) contra *"eu cliquei e cheguei"* (medido). Se usar, use como intenção.

### 1.5 Verdade técnica — o diferencial que sustenta a página

**Nenhum crawler de IA relevante executa JavaScript.** Vercel + MERJ analisaram mais
de 500 milhões de fetches do GPTBot. Vale para GPTBot, OAI-SearchBot, ChatGPT-User,
ClaudeBot, PerplexityBot, Meta-ExternalAgent, Bytespider. Eles baixam arquivos `.js`
(ChatGPT 11,50% dos requests, Claude 23,84%) mas **leem como texto, sem executar**.
[Fonte](https://vercel.com/blog/the-rise-of-the-ai-crawler) · dez/2024, confirmado
válido em 2026 por fontes independentes · **[SÓLIDO]**

Exceção: **Gemini** usa a infraestrutura de renderização do Googlebot e executa JS.

Precisão que a página precisa ter: não é "HTML estático". É **conteúdo presente no
HTML da primeira resposta do servidor** — SSR, SSG ou site tradicional, tanto faz. Um
SPA React sem SSR fica **invisível** para o ChatGPT mesmo ranqueando bem no Google.

> Isto é verdadeiro, verificável em trinta segundos no site do próprio cliente, e é
> exatamente o que um dev entrega e uma agência de marketing não. Sustenta a página
> inteira — e responde de quebra a objeção "meu sobrinho faz", que **nenhuma página
> brasileira analisada enfrenta**.

Do mesmo estudo: ChatGPT gasta **34,82%** dos fetches em páginas 404 e mais 14,36%
seguindo redirects; Claude, 34,16% em 404. Higiene técnica tem efeito desproporcional.

### 1.6 `llms.txt` é hype — sai da página

Originality.ai monitorou mais de 3 milhões de sites por 12 meses (jun/2025–mai/2026):
adoção cresceu 8,8x. E o dado que mata: análise de logs da Ahrefs em **137 mil
domínios** (mai/2026) mostra que **97% dos arquivos `llms.txt` receberam zero
requisições**. Dos poucos acessos, 21,7% são ferramenta de auditoria SEO; bots de
retrieval de IA são **1,1%**.
[Fonte](https://ppc.land/llms-txt-adoption-rises-8-8x-but-97-of-files-get-zero-ai-requests/) · **[SÓLIDO]** — log de servidor, não declaração.

Posições oficiais: o Google afirma que o arquivo *"won't negatively or positively
impact your visibility"*. OpenAI e Anthropic apontam donos de site para o
**robots.txt**; `llms.txt` aparece só em documentação de *dev tools*, que é outra coisa
— é para agente de código consumir doc, não para o ChatGPT achar o site do cliente.

Custa dez minutos gerar, então entrega de brinde. Não pode ser bullet.

### 1.7 Dados estruturados — não prometa citação

- **A favor:** SE Ranking indica que ~71% das páginas citadas pelo ChatGPT têm
  structured data. **[FRACO como causalidade]** — correlação de sobrevivência.
- **Contra, e é o teste mais limpo:** Ahrefs rastreou **1.885 páginas que adicionaram
  JSON-LD** entre ago/2025 e mar/2026, medindo citações 30 dias antes e depois em AI
  Overviews, AI Mode e ChatGPT. Título do estudo: *"We Tracked 1,885 Pages Adding
  Schema. AI Citations Barely Moved."* **[MODERADO-SÓLIDO]** — teste antes/depois.
  Ressalva dos autores: a amostra era de páginas já muito citadas.

Schema é boa prática — ajuda o Google a entender, gera rich results, é barato. **Não
prometa que faz a IA citar.** É a alegação mais comum do mercado e a de evidência mais
fraca.

### 1.8 Outras precisões técnicas

- **Google-Extended** controla elegibilidade para treino do Gemini e grounding em
  Gemini Apps/Vertex. **Não controla AI Overviews nem AI Mode** — esses rodam sobre o
  Googlebot. Não é user-agent: não faz requisição e nunca aparece em log. **[SÓLIDO]**
- **PerplexityBot** foi documentado pela Cloudflare (ago/2025) trocando user-agent e
  rotacionando ASNs para contornar bloqueios, usando string genérica de Chrome 124. A
  Cloudflare o removeu da lista de bots verificados.
  [Fonte](https://blog.cloudflare.com/perplexity-is-using-stealth-undeclared-crawlers-to-evade-website-no-crawl-directives/) ·
  **[SÓLIDO]**, contestado pela Perplexity. Relevância prática baixa no Brasil (<1% do
  tráfego de IA), mas evita afirmar "controlamos quem acessa".

### 1.9 O limite honesto da oferta

Os sinais mais correlacionados com visibilidade em IA são **off-site**: menções à
marca na web (~0,664), anchor text de marca (~0,527), volume de busca pelo nome
(~0,334–0,392), menções no YouTube (~0,737). Backlinks ficam em ~0,218. Estima-se que
**~85% das menções de marca em respostas de IA venham de páginas de terceiros** —
Reddit, Wikipedia, YouTube, e no Brasil o **Reclame Aqui**.

**[MODERADO]** — correlações publicadas majoritariamente por fornecedores de
ferramenta de GEO. Direção confiável, decimais são marketing.

> Isto contraria a premissa original da oferta. Construir o site tecnicamente perfeito
> é **condição necessária e insuficiente**. Um dev garante que a IA *consiga ler e
> entender*. Não garante que ela *escolha citar* — isso depende de reputação
> distribuída pela web que nenhum código produz.

Daí D3: a promessa é **"seu site legível para a IA"**, não *"seu site vai aparecer no
ChatGPT"*.

### 1.10 Objeções do empresário brasileiro

Fonte brasileira e específica:
[PHN Digital — "Investi em SEO e não voltou nada"](https://phndigital.com.br/investi-seo-nao-voltou-nada-onde-fui-enganado/).
Sete sinais de que o dono foi enganado, resumidos: relatório que abre com Domain
Authority (*"DA é métrica do Moz, não do Google"*); dono sem acesso ao Search Console
e ao Analytics; conteúdo genérico sem autor identificado; 50 a 200 backlinks no
primeiro mês vindos de sites desconhecidos; DA subindo sem tráfego subir; troca de
responsável a cada 3–6 meses; reuniões só sobre *"o que vamos fazer"*, nunca *"o que
aconteceu"*.

O mesmo texto define o provedor honesto: auditoria técnica documentada nos primeiros
30 dias, acesso conjunto ao GSC e GA4 desde o início, autor identificado, movimento de
posição mensurável em até 6 meses. E crava que promessa de *"primeira página em 60 ou
90 dias"* é sinal de manipulação.

Outras objeções e como o mercado responde:

- **"GEO substitui SEO?"** — resposta padrão, literal da PWR: *"Não. O SEO continua
  essencial para a busca tradicional. O GEO soma a frente das respostas geradas por
  IA."* Aparece em quase toda página; vale antecipar.
- **Preço** — ninguém publica. O ancoramento que circula é R$ 3.000–8.000/mês para PME
  com agência **[FRACO]**, não verificado, mas é o número que o dono pode ter visto.
- **"Meu sobrinho faz"** — **nenhuma página brasileira enfrenta.** Lacuna de mercado.
  O ângulo sustentado é §1.5: site em construtor ou SPA sem SSR é literalmente
  ilegível para o GPTBot, e é o que sai de quem não sabe. Demonstrável ao vivo.

---

## Frente 2 — Estrutura de conversão e copywriting

Veredito geral da frente, e ele importa mais que qualquer achado isolado:

> A maior parte do que se publica sobre "estrutura de landing page" **não tem teste por
> trás**. Existe evidência real em quatro áreas — atenção por profundidade de rolagem,
> preço, o que compradores B2B consomem, e qualidade de escrita. Nas outras três —
> ordem das seções, repetição de CTA, texto de botão — **a literatura séria não
> existe**, e o que circula são um ou dois testes antigos de caso único, repetidos há
> uma década como se fossem lei.

### 2.1 Preço — a evidência mais forte da pesquisa inteira, e ela contraria a decisão

**NN/g**, estudos de usabilidade com tarefas reais: a falta de informação de preço é
*"o elemento mais hostil ao usuário da maioria dos sites B2B — a única coisa que os
clientes mais dizem querer e menos recebem"*. Pesquisadores **observaram participantes
se frustrarem, abandonarem o site e irem para o concorrente** por isso. Sites B2B têm
**58%** de sucesso em tarefas, contra 66% de e-commerce de consumo.
[Fonte](https://www.nngroup.com/reports/b2b-websites-usability/) ·
[Fonte](https://www.nngroup.com/articles/show-price/) · **[SÓLIDO]**

**TrustRadius**, 1.862 compradores e 444 fornecedores, publicado em 15/jul/2026: preço
transparente é o item nº 1 da lista de desejos **por quatro anos consecutivos** (45%
em 2026).
[Fonte](https://www.prnewswire.com/news-releases/trustradius-2026-b2b-buying-disconnect-report-reveals-ai-has-changed-how-buyers-research-but-not-what-they-trust-302825792.html) · **[SÓLIDO]**

Contrapeso real: **100% das páginas brasileiras analisadas na frente 1 não publicam
preço**. O dado de usabilidade é majoritariamente americano e B2B de tecnologia; o
comportamento local vai no sentido oposto. Seguir o mercado, porém, significa fazer o
que as páginas fracas também fazem.

O NN/g **não** recomenda tabela — recomenda **preço para cenário comum**, âncora
suficiente para a pessoa se autoqualificar. Daí D6: uma linha de piso.

### 2.2 Schwartz é folclore; ELM é o substituto sólido

**Cinco níveis de consciência (Eugene Schwartz, 1966) — [FOLCLORE].** Não existe
nenhum teste controlado. É observação de praticante, jamais operacionalizada em
experimento publicado; a cadeia de citação termina no próprio livro. Útil como
ferramenta mental — força a pergunta "com o que essa pessoa já se importa?" — e
**inválida como justificativa de estrutura**.

**Elaboration Likelihood Model (Petty & Cacioppo) — [SÓLIDO].** O modelo de persuasão
mais testado da psicologia social. Quando a pessoa está **motivada e capaz de pensar**
— compra cara, decisão de dono de empresa — o que move a atitude é a **qualidade do
argumento**, não sinais periféricos como design bonito ou número de logos.
[Meta-análise, 2022](https://onlinelibrary.wiley.com/doi/10.1111/ijcs.12814)

> Ticket alto e escopo sob medida = alta motivação de processamento. O ELM prevê que
> **argumento substantivo e verificável supera prova social e estética** exatamente
> neste cenário — o oposto do que a maioria das landings de estúdio faz.

### 2.3 A página é a venda, não o convite

**6sense**, compradores B2B: **81%** já têm fornecedor preferido no primeiro contato, e
compram desse favorito **77%** das vezes. **94%** dos grupos de compra já ranqueiam
fornecedores antes de falar com alguém.
[Fonte](https://6sense.com/science-of-b2b/buyer-experience-report-2025/) ·
**[MODERADO]** — survey de fornecedor de martech com viés de interesse, mas amostra
grande, metodologia declarada e achado repetido desde 2019.

Implicação: o WhatsApp não é onde ele convence. É onde o cliente **confirma uma
decisão já tomada na rolagem**. A página precisa ser autossuficiente.

### 2.4 Sense-making: dar critério, não mais informação

**Gartner**, mais de 1.000 compradores B2B: **89%** disseram que a informação
encontrada era de alta qualidade — e ainda assim se sentiam paralisados, porque as
informações eram **contraditórias entre fornecedores**. O problema não é falta de
informação, é impossibilidade de julgar. Quem adotou a abordagem de *sense-making*
(ajudar a avaliar e priorizar, em vez de despejar argumentos) fechou negócios de alta
qualidade e baixo arrependimento em **80%** dos casos.
[Fonte](https://www.gartner.com/en/newsroom/press-releases/2019-07-29-gartner-reveals-new-b2b-sales-approach-to-win-in-toda) · **[MODERADO]**

> Esta é a chave da demanda não formada, e é contraintuitiva: o dono **não precisa
> aprender o que é GEO**. Ele precisa de um **critério** para julgar as propostas de
> site que já vai receber de três agências. Ensinar o critério é o movimento — e o
> critério, convenientemente, é aquele em que ele ganha.

Daí D7: a parte de IA não pode ser seção com título próprio, senão viram dois produtos
numa página só. Ela é a resposta à pergunta *"por que este site é melhor que o do
concorrente?"*.

### 2.5 Orçamento de atenção — a única evidência sobre estrutura

**NN/g**, mais de 130.000 fixações oculares de 120 participantes:

| Região | % do tempo de visualização |
|---|---|
| Topo 20% da página | **42%** |
| Topo 40% da página | **65%** |
| Acima da dobra | **57%** (era 80% em 2010) |
| Primeiras duas telas (até 2160px) | **74%** |

[Fonte](https://www.nngroup.com/articles/scrolling-and-attention/) · **[SÓLIDO]**

Não há evidência sobre *qual* seção vem antes. Há evidência forte de que os primeiros
40% recebem dois terços da atenção. A regra derivável é **orçamentária, não
sequencial**: o que precisa ser lido por todos cabe nos primeiros 40%.

### 2.6 Onde não existe evidência nenhuma

Registrado para ninguém perder tempo otimizando o que não se sabe medir.

- **Ordem das seções** — nenhum teste A/B publicado, estudo ou meta-análise para
  landing B2B de ticket alto. CXL, Instapage, Landingi e Directive publicam
  "estruturas comprovadas" sem dado. Quem apresentar "a ordem ideal" está apresentando
  gosto pessoal.
- **CTA único** — existe **um** teste interno da Unbounce (+40%). E a literatura repete
  que taxas "despencam até 266%", número **aritmeticamente impossível** — nada cai mais
  de 100%. Um impossível circulando sem correção há anos é o melhor indicador de que
  ninguém checa essa literatura. Além disso, a base psicológica costumeiramente citada
  (o estudo das geleias) **não replicou**: meta-análise de 63 condições, 50
  experimentos, N=5.036, efeito médio praticamente zero.
  [Fonte](https://academic.oup.com/jcr/article-abstract/37/3/409/1827647)
- **Repetir o mesmo CTA** — sem teste. Baixo risco, apoio indireto do NN/g (se a
  atenção decai, exigir rolagem de volta ao topo é custo). Faça; não chame de
  comprovado. **Repita o mesmo destino, nunca introduza um segundo.**
- **Texto do botão** — a literatura inteira se apoia num teste de 2013 (ContentVerve,
  "your" → "my", +90%). Uma página, um contexto, treze anos, **zero replicações**.
  Ninguém sabe qual texto converte melhor para ticket alto.

O que se pode dizer com base defensável, vindo de §2.3 e §2.4 e não de teste de botão:
para ticket alto o botão **nomeia o próximo passo e seu custo**. "Entre em contato"
falha porque não diz o que acontece depois do clique — a pessoa precisa inferir se vai
cair numa ligação de vendas.

### 2.7 Prova sem depoimento — a teoria tem nome

**Credence good** (Nelson 1970; Darby & Karni 1973): bem cuja qualidade o comprador
**não consegue avaliar nem depois de consumir**, por falta de expertise. Software sob
medida vendido a dono não técnico é caso quase puro — ele não tem como julgar se o
código é bom, se o SEO técnico está certo, se a acessibilidade foi feita. Advogados,
cirurgiões e mecânicos são os exemplos canônicos.

**Signaling theory** (Spence 1973): sob informação assimétrica o comprador se apoia em
**sinais**, e um sinal só é crível quando é **diferencialmente custoso** — mais caro de
produzir para quem não tem a qualidade do que para quem tem.
[Estado da teoria, 2025](https://journals.sagepub.com/doi/10.1177/01492063241268459) · **[SÓLIDO]**

> Isto resolve a ausência de depoimentos. Depoimento é um sinal **barato** — qualquer
> um escreve, e o comprador sabe. O teto de credibilidade dele é baixo desde o início.
> Não se trata de substituir depoimento por algo parecido, e sim de trocar sinal
> barato por **sinal caro e verificável**.

**TrustRadius 2026**, recursos mais influentes na decisão, em ordem: **demonstração de
produto**, trial gratuito, experiência prévia, reviews de usuários (74% usam),
relatórios de analistas (apenas 13%, queda de 63% desde 2022). **[MODERADO]**

Demo e trial acima de review. O formato mais influente é justamente o que **não
depende de terceiros** — e é o que ele tem.

Formas de prova aplicáveis, por custo do sinal (ordenação é inferência; a teoria é
sólida):

1. **O próprio site como artefato auditável** — não "nosso site é rápido", mas
   afirmações **falsificáveis por terceiros**, conferíveis em trinta segundos. Número
   verificável é caro de forjar; adjetivo é grátis.
2. **Cases próprios com número e método** — sem logo conhecido, o valor está em
   antes/depois com metodologia declarada e **limitações admitidas**. Admitir limitação
   é custoso; quem infla não faz.
3. **Auditoria ao vivo do site do próprio prospect** — a prova mais forte possível,
   porque é específica dele e não pode ser pré-fabricada. Casa com o CTA único: a
   auditoria vira a razão de mandar mensagem.
4. **Transparência de processo** — reduz a assimetria que a literatura de credence
   goods aponta como o problema central.
5. **Critérios de recusa** — dizer para quem não serve. Recusar público é caro para
   quem está desesperado por trabalho.
6. **Garantia ou compromisso contratual** — o exemplo canônico de sinal custoso.

### 2.8 O dado que une as duas demandas

Ainda do TrustRadius 2026: **63% dos compradores usaram IA durante a jornada**, e
**94% dos que usaram verificam as respostas** pelo menos parte do tempo.

> Como quase todo mundo confere, **aparecer na resposta da IA e ter um site que
> sustenta a checagem são a mesma venda.** Isso conecta a demanda não formada
> (visibilidade em IA) à formada (o site) num único argumento, em vez de dois. É o
> eixo estrutural mais forte disponível para a página.

Ressalva: compradores de tecnologia, majoritariamente EUA. Direcionalmente válido,
numericamente não transferível — não publicar como se descrevesse o mercado dele.

### 2.9 Tamanho e nível de leitura

**Unbounce**, serviços profissionais, mais de 57 milhões de conversões: ponto ótimo
~500 palavras (275–745) → mediana de 6,1%. **[CORRELAÇÃO]** — e com três ressalvas que
anulam o uso ingênuo: o próprio relatório admite correlação; a base são páginas de
tráfego pago com formulário, população errada para venda consultiva; e "conversão" ali
é preenchimento de formulário, não negócio fechado.

**O achado que transfere bem é o nível de leitura:** 5ª–7ª série → **12,9%**; 8ª–9ª
série → **6,6%**. Queda de 49%. O público é explicitamente não técnico.

Testes A/B de comprimento se contradizem entre si ("+220% para longa" vs "+102,5% para
curta"), todos citações de segunda mão. **[FOLCLORE]** enquanto regra. A pergunta certa
não é "longa ou curta": é **suficiência informacional** — página dimensionada pela
quantidade de dúvida real a resolver, com §2.5 impondo o orçamento dos primeiros 40%.

### 2.10 O erro mais comum

**NN/g**, tarefas reais em sites B2B, 58% de sucesso: descrições incompletas que
**geram ceticismo**; conteúdo excessivo; navegação que esgota a paciência; **táticas de
marketing agressivas que causam irritação e desconfiança**; ausência de preço;
formulário obrigatório antes da informação (*"um matador de leads clássico"*).
Diagnóstico: *"empresas ainda projetam para si mesmas em vez de para seus clientes"*.
**[SÓLIDO]**

**Nielsen, Morkes & Schemenaur (1997)**, 81 usuários, experimento controlado: escrita
concisa, escaneável e objetiva **combinadas = +124% de usabilidade** contra "marketese"
promocional. **79% sempre escaneiam**; apenas **16%** leem palavra por palavra.
[Fonte](https://www.nngroup.com/articles/how-users-read-on-the-web/) · **[SÓLIDO]**,
com a ressalva de que é de 1997 e mede usabilidade, não conversão.

**O erro previsto para o caso específico:** vender o método para quem compra o
resultado. Um dev tem prova técnica real, e é por isso mesmo que a tentação é organizar
a página em torno de stack, Core Web Vitals e WCAG. Para um dono não técnico isso viola
os três achados de uma vez — falha o teste de compreensão, sobe o nível de leitura para
a faixa de 6,6%, e pelo ELM apresenta argumentos que o receptor **não tem capacidade de
processar pela rota central**, degradando-os a sinais periféricos.

A correção não é abandonar o rigor: é **traduzir cada prova técnica em consequência de
negócio, mantendo o número verificável ao lado**. O número preserva o sinal custoso; a
tradução preserva a compreensão. Descartar um dos dois destrói metade do valor. Daí D8.

---

## Frente 3 — Design de landing 2026

O relatório desta frente é o mais explícito sobre os próprios limites, e vale respeitar
essa marcação: ele aponta um item em que apostaria dinheiro (a polaridade) e vários em
que declara opinião pura. O que está marcado como opinião abaixo **é** opinião.

### 3.1 Escuro vs claro — o item decisivo

**Evidência contra escuro como padrão. [SÓLIDO]**

- **NN/g:** *light mode* leva a melhor desempenho na maior parte do tempo para quem tem
  visão normal. Polaridade positiva venceu em acuidade visual e em revisão de texto **em
  todas as faixas etárias**. E a vantagem do claro **cresce conforme a fonte diminui**.
  Recomendação deles: escuro como opção, não como padrão.
  [Fonte](https://www.nngroup.com/articles/dark-mode/)
- **Estudo de polaridade por faixa etária:** adultos mais velhos preferem polaridade
  positiva para reduzir fadiga, e a polaridade negativa **aumenta carga cognitiva
  medida** — tempo de busca e diâmetro pupilar maiores — em ambiente claro.
  [Fonte](https://arxiv.org/html/2409.10841v1)

> O segundo achado é o decisivo, e o motivo é a diferença de leitor. O portfólio escuro
> foi feito para recrutador técnico: 25–40 anos, desktop, luz de escritório controlada,
> lendo por interesse. A landing é o inverso em **todos** os eixos: 35–60 anos, celular
> na mão, luz imprevisível (sol, loja, obra), lendo a contragosto. Mais velho + ambiente
> claro + polaridade negativa = mais carga cognitiva. Somado ao achado de nível de
> leitura (§2.9), o objetivo é **baixar** carga — e escuro no celular sob sol a sobe.

**A evidência a favor de escuro, e por que é fraca. [FRACO]**

Existe um teste A/B publicado onde a página escura venceu, em SaaS B2B de manutenção de
frotas — público de donos de oficina, não distante do alvo.
[Fonte](https://searchengineland.com/landing-page-best-practices-wrong-465988)

| Métrica | Escura | Clara |
|---|---|---|
| Cliques | 466 | 301 |
| CTR | 4,55% | **5,30%** |
| Conversões | **19** | 11 |
| Taxa de conversão | **4,08%** | 3,65% |
| Custo por conversão | US$ 274,67 | US$ 271,56 |

19 contra 11 conversões não é significância, é ruído; as impressões eram muito desiguais
(10.250 vs 5.677), o que sugere split sujo; e o custo por conversão empata em 1,1% de
diferença. O que sobrevive não é o número, é o argumento: escuro comunica peso e
seriedade **quando combina com a convenção da categoria** — argumento de adequação, não
de polaridade.

E um detalhe que o próprio artigo não comenta: **na versão escura os campos de
formulário eram brancos.** A parte que exigia leitura e ação estava em polaridade
positiva.

**Público brasileiro: não verificado.** Não há estudo de tema escuro versus claro em
conversão com amostra brasileira. É ausência de dado, não achado de divergência — não
inventar essa diferença no argumento.

O que existe de BR é sobre desconfiança, que é o assunto adjacente: 48% dos consumidores
abandonam por falta de confiança no site. **[FRACO]** — blog de fornecedor, sem
metodologia.

**Opinião marcada, sem fonte, do pesquisador:** no Brasil o tema escuro em página de
serviço carrega um risco de leitura que não aparece na literatura estrangeira — é o
visual padrão de infoproduto, cripto e mentoria de tráfego pago. Preto com detalhe neon
é a fachada que o dono de empresa brasileiro já aprendeu a desconfiar. Se for verdade,
o escuro não custa só legibilidade: custa credibilidade.

### 3.2 A recomendação de polaridade

**Corpo claro com faixas escuras como pontuação.**

- Fundo `#F5F3EF` — o token de texto do portfólio vira fundo. É um off-white quente, foge
  do branco de template e mantém a paleta.
- Tinta `#08090C`. Contraste na casa de 18:1.
- **1 ou 2 faixas escuras (`#08090C`)**, no máximo: a de "como trabalhamos" e a do CTA
  final. É onde o ciano funciona no ambiente nativo dele e onde a estética de terminal
  aparece inteira — sem impor polaridade negativa aos blocos de leitura contínua.
- Mono nos labels, sans no corpo. O mono carrega 1–3 palavras e não custa legibilidade.

> O achado que fecha a questão: **o que lê como "premium técnico" em 2026 não é a cor de
> fundo.** É uma cor de destaque só, espaço vazio generoso, tipografia grande com
> hierarquia agressiva, ausência de ilustração decorativa, bordas de 1px em vez de
> sombras, e o resultado mostrado reto e cheio. A paleta atual já obedece cinco desses
> seis. **O problema nunca foi a linguagem do portfólio — foi só a polaridade.**

### 3.3 Contraste — os tokens atuais não sobrevivem à inversão

O pesquisador estimou de cabeça e avisou que os decimais não eram auditados. **Medidos
com a fórmula de luminância relativa da WCAG 2.1** — as estimativas dele estavam certas,
e apareceu uma inversão que ele não viu.

| Token | Sobre claro `#F5F3EF` | Sobre escuro `#08090C` |
|---|---|---|
| tinta / texto | **17,97:1** AAA | **17,97:1** AAA |
| `data` `#38BDF8` | **1,93:1** reprova | **9,29:1** AAA |
| `muted` `#878C96` | **3,05:1** só texto grande / UI | **5,90:1** AA |
| `faint` `#4A505A` | **7,33:1** AAA | reprova |
| `ok` `#4ADE80` | **1,57:1** reprova | **11,43:1** AAA |
| verde WhatsApp `#25D366` | **1,79:1** reprova | — |

> **A inversão:** `--color-faint` é documentado no projeto como *"para linhas, nunca para
> palavras"*, porque reprova em fundo escuro. **Em fundo claro ele vira AAA.** O mesmo
> hex troca de função conforme a polaridade — prova concreta de que inverter os tokens
> não funciona; é preciso um segundo conjunto.

O verde do WhatsApp reprovando em **1,79:1** confirma por outro caminho a recomendação de
§3.4 de não usá-lo como cor de botão com texto.

**O acento da polaridade clara já existe no projeto:** o CV usa `#0369A1`, que dá
**5,35:1** sobre `#F5F3EF` — passa AA. A rota que já era clara resolveu esse problema
antes.

Candidatos medidos para o conjunto claro:

| Papel | Hex | Contraste | Veredito |
|---|---|---|---|
| texto secundário | `#565C66` | 6,08:1 | AA |
| texto secundário (alt) | `#4A505A` | 7,33:1 | AAA |
| acento | `#0369A1` | 5,35:1 | AA — já usado no CV |
| acento escuro | `#075985` | 6,82:1 | AA |

Bordas em fundo claro ficam abaixo de 3:1 por natureza (`#DDD9D2` dá 1,27:1). Isso é
aceitável para borda decorativa, mas **qualquer borda que delimite componente de
interface precisa dos 3:1** exigidos para elemento não textual.

### 3.4 Botão de WhatsApp — a evidência inverte o senso comum

**A favor da bolha flutuante — toda de fornecedor de widget. [FRACO]**
Canto inferior direito gera "15% mais cliques"; CTR de 2 a 8%; "formulário converte 3-5%,
WhatsApp 8-15%". Nenhum com metodologia publicada, todos de quem vende o botão.

**Um dado que se leva a sério. [SÓLIDO]** NuvemCommerce 2026: quase **73% dos lojistas da
Nuvemshop usam WhatsApp como canal de venda**. Dado primário de plataforma, amostra
grande, interesse comercial baixo nesse número específico. Não prova que o botão
converte — prova que **o canal é a norma absoluta no Brasil**, e portanto que o custo de
pedir e-mail é real.

**Contra a bolha flutuante — pesquisa independente. [MODERADO-SÓLIDO]**

- **Baymard:** bolhas de chat fixas são percebidas como disruptivas, **especialmente no
  mobile, onde o elemento cobre o conteúdo que a pessoa está tentando ler**. Reação
  literal de participante em teste: *"Oh, god, I hate these, go away."*
- **NN/g:** participantes no site mobile da Dell **ignoraram completamente** um botão de
  chat flutuante à esquerda e foram procurar a página de Contato — a convenção de posição
  é forte, e sair dela mata o elemento.
- **Bug real:** `position: fixed` no iOS Safari tem histórico de tremor durante scroll e
  deslocamento quando a barra de endereço recolhe. Testar no Safari do iPhone, não só no
  Chrome do Android.

**Recomendação:**

- **Mobile — barra fixa no rodapé, largura total**, altura mínima 48px, na zona do
  polegar. Não bolha redonda. Com `padding-bottom` no corpo do tamanho da barra, para
  nada ficar coberto — que é exatamente o defeito documentado pelo Baymard.
- **Desktop — sem bolha.** CTA inline repetido: hero, depois da prova, faixa escura final.
- **Cor:** não usar o verde WhatsApp (`#25D366`) como cor de botão. Botão na cor do
  sistema, **ícone oficial monocromático** dentro. Quer-se o reconhecimento do canal (que
  vem do glifo) sem a associação de widget genérico (que vem do verde saturado).
  **[Opinião marcada]** — não há pesquisa sobre percepção de ticket em função do verde.
- **Texto do botão: não verificado.** Não existe teste A/B público em português. O
  raciocínio proposto: primeira pessoa e específico; microtexto abaixo dizendo o que
  acontece do outro lado ("resposta em até X horas, sem ligação, sem cadastro"), porque o
  medo real de quem clica não é o preço, é ser perseguido; e "orçamento" tem vantagem
  sobre "conversar" porque sinaliza que existe número no fim.

Números de lift de barra fixa (+31%, +20,4%) foram lidos em fontes secundárias, com os
relatórios originais não abertos. **[FRACO]** — direcionais.

### 3.5 O que está datado — e a correção

**Esta é a seção mais fraca do relatório, por admissão do próprio pesquisador.** A busca
retornou blog de tendência, cujo incentivo é declarar tudo "em alta". O que segue é
majoritariamente **opinião informada**.

**Correção a uma premissa:** glassmorphism **não** está datado — voltou repaginado como
"Liquid Glass", empurrado pela direção da Apple, e gradientes voltaram em versão suave.
De todo modo, glass exige orbes coloridos borrados atrás para funcionar, o que leva
direto ao visual a evitar. **Descartar por incompatibilidade, não por estar datado.**

Classificado como datado **[opinião]**: o **combo completo** de SaaS 2021 — e é o combo
que datou, não cada peça isolada: gradiente roxo-azul no herói + blob orgânico + mockup
em perspectiva 3/4 com sombra longa + ilustração *Corporate Memphis* (a peça mais
queimada, virou meme de startup genérica). Também: screenshot em moldura de MacBook
inclinada; faixa de logos de clientes em cinza a 40% rotulada "confiado por" — que numa
dupla com poucos clientes grita fraqueza; ícone em círculo colorido no topo de três cards
iguais; herói com "nós transformamos sua presença digital"; e contador animado quando o
número é pequeno — animar "12" chama atenção para o 12.

### 3.6 Exemplos — a seção que o pesquisador declara ter falhado

A busca por exemplos retornou agregadores (Awwwards, Muzli) e portfólio de estúdio
experimental, que são o oposto do necessário. **Site premiado no Awwwards é feito para
impressionar designer, não para converter dono de transportadora no celular. Não validar
a landing contra Awwwards.**

As referências abaixo **não foram abertas**; são descrições de memória, a conferir:
Linear (escuro que funciona, mas público 100% técnico), Stripe (claro e denso, com preço
mostrado sem medo — o modelo mais próximo do caso), Basecamp/37signals (referência de
*tom de voz*, quase brutalista, opinião forte, preço na cara), Obys (alto risco — bonito
para designer, lento no 4G).

### 3.7 Mobile

Tráfego vindo de WhatsApp e Instagram muda duas coisas:

- **In-app browser, não Chrome/Safari.** O navegador embutido tem viewport menor, às
  vezes atrapalha fonte customizada e não compartilha sessão. A barra fixa de CTA disputa
  espaço com a barra do app. **Testar abrindo o link dentro do Instagram, de verdade.**
- **A pessoa chegou de um toque, não de uma busca** — intenção mais baixa, paciência
  menor. No celular, os "primeiros 40%" de §2.5 são aproximadamente **as duas primeiras
  rolagens**.

Fonte de corpo mínima 17–18px — lembrando que a vantagem do fundo claro **cresce conforme
a fonte encolhe**, então fonte pequena com fundo escuro no celular é o pior par possível.

### 3.8 Motion — sem pesquisa

O pesquisador declara ter gasto o orçamento nos itens priorizados e **não fez busca sobre
motion**. Tudo abaixo é raciocínio, não fonte.

O que denuncia template é o **padrão uniforme**, não o movimento: toda seção entrando com
o mesmo fade-up de 600ms e o mesmo delay escalonado — o olho percebe a repetição e
classifica como plugin. Deslocamento curto (8–12px, 150–200ms) parece responsividade;
40px e 600ms parece exibicionismo. Animar estado (hover, foco, a barra fixa aparecendo),
não decoração. Zero parallax, zero scroll-jacking, zero número que sobe sozinho. Se
houver um momento autoral, que seja a transição para a faixa escura. E respeitar
`prefers-reduced-motion` — numa página que vende competência técnica, é o detalhe que
cliente nunca nota e par sempre nota.

---

## Frente 4 — Concorrentes brasileiros

Duas ressalvas de escopo, declaradas pelo pesquisador: encontrou **um único** estúdio
brasileiro genuinamente de duas pessoas que assume isso na página; e **não existe
pesquisa quantitativa** sobre empresário brasileiro preferir agência grande ou acesso
direto ao dev. O item 4.4 se apoia em convergência de argumento e um precedente forte,
não em amostra.

### 4.1 Páginas analisadas

**MXC Digital** — [mxcdigital.com.br](https://mxcdigital.com.br/) — estúdio de duas
pessoas, espelho quase exato do caso. Subheadline literal: *"Da conversa inicial ao
lançamento em 14 dias. Design exclusivo, copy estratégico e SEO desde o primeiro dia. Sem
template, sem terceirização, sem enrolação."* Ordem: hero → *"Seu site atual está
custando clientes?"* → serviços → incluso em todos os projetos → portfólio → sobre →
depoimentos → manutenção → FAQ → próximo passo. Piso só de manutenção (R$ 499/mês), na
seção de manutenção; projeto fica sob orçamento. Prova: dois depoimentos nomeados com
foto e empresa, e métrica com metodologia declarada — *"3x aumento médio de conversão"*
seguido de *"média apurada nos projetos com analytics configurado nos primeiros 90 dias
após o lançamento"*. Garantias literais de prazo (14 dias) e de devolução (30 dias).

**Fabio Raminhuk** — [fabra.dev](https://fabra.dev/) — solo, mesma tese de acesso direto:
*"Não tem intermediário. Do orçamento à entrega, é sempre eu do outro lado respondendo."*
Sem preço em ponto algum. WhatsApp direto com formulário como alternativa. Prova só
técnica ("Lighthouse 95+", "100+ projetos") e **zero depoimento** — é o furo da página.

**Artneo** — [artneo.com.br](https://artneo.com.br/) — piso explícito: *"A partir de R$
900"*, no terço final. Seção inteira chamada *"Suporte DIRETO com o desenvolvedor"*. 5
depoimentos nomeados, 4 links de portfólio reais. Fraqueza: ordem confusa, com o piso
enterrado dentro de um bloco de hospedagem.

**Agência MACAN** — [agenciamacan.com.br](https://www.agenciamacan.com.br/desenvolvimento-de-sites)
— o contraste institucional. Piso de R$ 2.500. **Não menciona tamanho de time nem nomes
em lugar nenhum, e não tem um único depoimento na página inteira.** Genéricos literais:
*"muito além de linhas de código, o desenvolvimento envolve estratégia de mercado"*. Útil
como âncora de preço de agência e como demonstração do custo de ser anônimo.

**Carolini Santos** — [carolinisantos.com.br](https://carolinisantos.com.br/criacao-de-landing-page)
— WhatsApp com **mensagem pré-preenchida**: *"Olá, gostaria de orçamento para uma Landing
Page"*. 6 depoimentos nomeados.

> Contraste que vale registrar: o depoimento da Carolini elogia **atitude**
> (*"atencioso, profissionalismo, preço justo"*); o da MXC relata **resultado comercial**
> (*"os clientes estão vindo com muito mais disposição para fechar"*). Mesma quantidade
> de estrelas, valor de venda completamente diferente.

**Bradata** — [artigo de mercado](https://www.bradata.com.br/blog/fabrica-de-software-vs-freelancer-vs-agencia)
· **[FRACO]**, viés declarado: é publicado por uma software house e fecha com CTA
próprio. Ainda assim os dois argumentos abaixo pesam porque vêm de um concorrente
estrutural que os admite. Contra agência: *"o preço numa agência costuma ser alto para o
que entrega — a estrutura dela é otimizada para outra coisa. Você paga time de criação e
atendimento que não agrega."* Contra freelancer solo: *"O freelancer é um único ponto de
falha. Se ele adoece, muda de foco, seu projeto para."* Âncora de valor-hora citada:
sênior a **R$ 90–220/hora**.

### 4.2 O que se repete nas boas

- **Especificidade numérica com metodologia.** O maior separador entre "cara" e "barata"
  não é visual, é grau de precisão. E o gesto que mais gera confiança é a **nota de
  rodapé do número**: declarar *como* o 3x foi medido. Número sem metodologia lê como
  marketing; número com ressalva lê como engenheiro. **Ressalva é sinal de honestidade,
  não de fraqueza.**
- **Negação como credibilidade.** *"Sem template, sem terceirização, sem enrolação"*;
  *"sem gerente de contas, sem junior tocando suas peças nas horas vagas"*; *"não tem
  intermediário"*. Mais crível que adjetivo positivo porque **tem custo** — exclui
  trabalho.
- **Depoimento que narra resultado comercial**, com nome e empresa.
- **Estrutura problema → método → prova → preço → CTA.** A MXC abre com o problema do
  cliente, não com quem ela é.
- **Garantia com condição escrita**, específica e verificável.

### 4.3 O que se repete nas ruins

Anonimato total (a MACAN não tem uma pessoa nem um cliente falando na página inteira);
abstração no lugar de mecanismo; ausência de prova social mesmo em quem tem cliente;
preço enterrado na seção errada; depoimento genérico sobre simpatia; e o erro clássico de
dev vendendo para não-dev — **provar capacidade técnica e esquecer de provar satisfação**
(o "Lighthouse 95+" do fabra.dev, para um público que não avalia isso).

### 4.4 Time de dois — força, e no topo

O argumento vai além do precedente. Juntando as duas críticas que o mercado dispara:
agência cobra **estrutura que não escreve o código**; freelancer é **ponto único de
falha**.

> Uma dupla de dois full-stack sêniores é a única configuração que **neutraliza as duas
> objeções ao mesmo tempo** — acesso direto a quem escreve o código *e* redundância.
> Nenhuma das páginas analisadas articula isso, inclusive a MXC, que só ataca o lado da
> agência.

Aplicação: o "2" vira **número exibido** em formato de métrica, junto de anos e projetos
— tratar tamanho como dado, nunca como desculpa ("apesar de sermos pequenos"). Frase de
posicionamento na dobra, em estrutura de negação. Objeção de redundância coberta
explicitamente, provavelmente no FAQ — responder objeção não verbalizada é o que produz
sensação de solidez. Os dois nomes e os dois rostos reais: é o ativo que a MACAN não tem
e não custa nada; foto de banco de imagens destruiria justamente essa vantagem.

### 4.5 Preço — como o mercado local faz

Metade publica piso: R$ 900 (Artneo), R$ 2.500 (MACAN, agência), R$ 499/mês (MXC, só
manutenção). Duas não publicam nada.

Padrões de execução, quando publicam: sempre **"a partir de R$ X"**, nunca faixa fechada
nem tabela para escopo sob medida; **nunca no hero** — aparece do meio para o fim, depois
de portfólio e prova, porque o piso qualifica *depois* de convencer; e piso de projeto
separado de piso de manutenção mensal.

Um piso que implique valor-hora muito abaixo de R$ 90–220 trabalha contra o
posicionamento.

### 4.6 WhatsApp

Canal primário nas cinco páginas; nenhuma usa formulário como principal. **Convive com
formulário, nunca o substitui** — sempre como opção secundária e subordinada
(*"ou preencha o formulário de contato se preferir"*). Mensagem pré-preenchida é usada, e
elimina a fricção de redigir a primeira frase, que é onde muita gente desiste. Os melhores
textos de botão são de **ação em primeira pessoa e específicos** — *"Iniciar meu
projeto"*, *"Quero um site focado em vendas"* — em vez de "Fale conosco".

---

## O que não se conseguiu verificar

Registrado para não virar certeza por esquecimento.

- **Google Trends comparativo** ("GEO" vs "SEO para IA" vs "aparecer no ChatGPT" no
  Brasil) — bloqueado com HTTP 429. O veredito de D1 vem de análise de SERP, não de
  volume medido.
- **Origem primária** de "1,2% das empresas brasileiras", "15,5% das buscas no BR com
  AI Overviews" e "54% da população usou IA generativa". Todos param em blog de
  agência.
- **Ticket médio real de GEO no Brasil** — só número de conteúdo de agência.
- **Estudo da Ahrefs sobre schema (§1.7)** — metodologia lida em fonte secundária,
  original não aberto. Consistente entre relatos; confirmar antes de usar como
  argumento central.
- **Ordem de seções, contagem de CTA e texto de botão** — não é que faltou procurar; é
  que a evidência não existe (§2.6).
- **Tema escuro vs claro com amostra brasileira** — não existe dado público. Ausência de
  evidência, não evidência de ausência de diferença (§3.1).
- **Texto de CTA de WhatsApp em português** — nenhum teste A/B público. Tudo em §3.4 é
  raciocínio.
- **Verde WhatsApp e percepção de ticket** — nenhuma pesquisa. Opinião pura.
- ~~Valores de contraste de §3.3~~ — **resolvido**: medidos com a fórmula da WCAG 2.1,
  tabela em §3.3 atualizada com os números reais.
- **Exemplos visuais de §3.6** — nenhuma URL aberta. Descrições de memória.
- **Números de lift de barra fixa (+31%, +20,4%)** — lidos em fonte secundária.
- **Motion (§3.8)** — zero busca feita.
- **Preferência de contratante brasileiro entre agência e dev direto** — não existe
  pesquisa formal. §4.4 se apoia em argumento e um precedente.
- **Headline completa da MXC Digital** — animada por JS, não capturada.

## Pendências

- [x] Frente 3 — design de landing 2026
- [x] Frente 4 — concorrentes brasileiros
- [x] Auditar os contrastes da polaridade clara (D10 / §3.3)
- [ ] Consolidar no spec da landing
