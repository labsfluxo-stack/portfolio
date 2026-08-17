/**
 * Auditoria de legibilidade — o backend do único trecho interativo da landing.
 *
 * O QUE ELE FAZ, EM UMA FRASE: busca o endereço que o visitante colou, joga
 * fora tudo que só existe depois do JavaScript rodar, e conta quanto texto
 * sobrou. É exatamente o que o GPTBot faz — pede a URL, lê o HTML da resposta
 * e vai embora, sem fila de renderização e sem segunda tentativa.
 *
 * POR QUE PRECISA EXISTIR UM SERVIDOR: a landing é export estático no GitHub
 * Pages, que não executa código, e o navegador bloqueia buscar site de
 * terceiro por CORS. Sem esta função, a página só consegue mandar o visitante
 * fazer o teste sozinho — que é o que ela fazia antes.
 *
 * ELE NÃO DÁ VEREDITO. Devolve fato bruto: quantas palavras sobraram, o status
 * da resposta, e se a leitura foi bloqueada. Quem interpreta é a página, com
 * texto que mora no dicionário e passa por revisão como qualquer outra copy.
 * Um worker que devolvesse "seu site está ruim" enterraria uma decisão de
 * produto dentro de infraestrutura.
 *
 * Deploy:  npx wrangler deploy
 * Local:   npx wrangler dev
 */

/** Teto de leitura. Página que passa disso já respondeu a pergunta — e sem o
 *  teto um único endereço mal-intencionado consumiria a franquia do dia. */
const MAX_BYTES = 2_000_000

/** Acima disso o visitante já desistiu, e o Worker tem limite de CPU. */
const TIMEOUT_MS = 8_000

/**
 * Identificação honesta, e não é preciosismo.
 *
 * Esta ferramenta argumenta sobre robôs que se anunciam. Sair por aí fingindo
 * ser Chrome para furar bloqueio contradiria a própria página — e é exatamente
 * o comportamento que a Cloudflare documentou na Perplexity em agosto de 2025,
 * e que custou a ela o lugar na lista de bots verificados.
 *
 * Consequência assumida: sites com proteção agressiva vão nos barrar. Melhor
 * ser barrado e dizer "fomos barrados" do que passar mentindo.
 */
const UA = 'AuditoriaDeLegibilidade/1.0 (+https://labsfluxo-stack.github.io/portfolio/pt/projetos/)'

/**
 * OS ÚNICOS CÓDIGOS QUE SIGNIFICAM "O SITE RESPONDEU E RECUSOU".
 *
 * Existe porque a primeira versão tratava todo `!resposta.ok` como recusa, e
 * isso só apareceu com o Worker no ar: um domínio inexistente volta 530 da
 * borda da Cloudflare, e o visitante lia "seu site está barrando robôs" sobre
 * um endereço que ele havia digitado errado. Acusação falsa, dita com
 * confiança, justamente na ferramenta cujo argumento é que ela só afirma o
 * que mediu.
 *
 *   401/403  o servidor entendeu e negou
 *   406      recusou o que pedimos (acontece com filtro por User-Agent)
 *   429      recusou por excesso — recusa com hora marcada, mas recusa
 *   451      recusou por ordem legal
 *
 * Tudo o que NÃO está aqui vira `inalcancavel`: 404 (não há site nesse
 * endereço), 5xx da origem (o site está fora do ar agora) e a família 52x/530
 * da Cloudflare (não deu para chegar lá). Nenhum desses é culpa do dono do
 * site nem afirma nada sobre o conteúdo dele.
 */
const RECUSA = new Set([401, 403, 406, 429, 451])

/**
 * O MODELO FICA NUMA CONSTANTE E VIAJA NA RESPOSTA, e isso corrige um defeito
 * real — não é arrumação.
 *
 * A tela trazia "Lido pelo Llama 3.3 via Groq" escrito à mão no dicionário.
 * Quando a Groq aposentou o Llama e este arquivo passou a chamar outro modelo,
 * a frase continuou lá: a página seguiu declarando, com todas as letras, um
 * modelo que não roda. Numa linha cuja função é ser transparência, é o pior
 * lugar possível para uma afirmação falsa.
 *
 * Agora existe uma fonte só. O Worker diz qual modelo usou e a tela repete —
 * trocar o valor aqui atualiza a frase sozinho.
 */
const MODELO = 'openai/gpt-oss-120b'

/** Como o nome aparece para gente, não para máquina. */
const MODELO_ROTULO = 'GPT-OSS 120B'

/**
 * Função própria, e exportada, para o teste alcançar. A regra vivia numa
 * condição embutida no `fetch` — que é rede, e rede não se testa sem deixar a
 * suíte instável. Era exatamente por isso que o defeito passou: a única parte
 * errada era a única parte que nenhum teste conseguia olhar.
 */
export function classificarStatus(status) {
  return RECUSA.has(status) ? 'bloqueado' : 'inalcancavel'
}

/**
 * Bloqueio de SSRF. Sem isto, qualquer pessoa poderia usar este endereço
 * público para fazer o Worker bater em rede interna — inclusive nos endpoints
 * de metadados que provedores de nuvem expõem em `169.254.169.254`, que é o
 * caminho clássico para vazar credencial de infraestrutura.
 *
 * A Cloudflare já não roteia para rede privada a partir do Worker, mas isso é
 * garantia da plataforma, não do código: se um dia esta função for para outro
 * lugar, a checagem vai junto com ela.
 */
export function enderecoProibido(hostname) {
  const h = hostname.toLowerCase()
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.internal') || h.endsWith('.local')) return true
  // IPv6 de loopback e link-local
  if (h === '::1' || h.startsWith('fe80:') || h.startsWith('fc') || h.startsWith('fd')) return true
  // IPv4 privado, loopback, link-local e o intervalo de metadados
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h)
  if (!ipv4) return false
  const [a, b] = [Number(ipv4[1]), Number(ipv4[2])]
  if (a === 10 || a === 127 || a === 0) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  return false
}

/**
 * O que sobra de uma página quando ninguém executa JavaScript.
 *
 * `<script>` sai por razão óbvia. `<style>` sai porque CSS não é conteúdo.
 *
 * `<noscript>` sai por uma razão menos óbvia e que vale escrever: o crawler
 * DE FATO lê o que está lá. Mas o que quase sempre está lá é "ative o
 * JavaScript para usar este site" — e contar esse pedido de desculpas como
 * conteúdo faria a ferramenta dizer que a página tem texto justamente quando
 * ela não tem nada.
 *
 * A regex não gulosa (`[\s\S]*?`) é obrigatória: HTML minificado vem numa
 * linha só, e `.*` guloso apagaria tudo entre o PRIMEIRO e o ÚLTIMO `<script>`
 * do documento — ou seja, a página inteira, fazendo qualquer site parecer
 * vazio. Mesma armadilha já documentada em tests/static-html.test.ts.
 */
export function textoVisivel(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&[a-z]+;|&#\d+;/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Os robôs que importam para esta pergunta.
 *
 * `Google-Extended` entra com uma ressalva que a página não deve esquecer: ele
 * controla treino do Gemini e grounding no Gemini Apps, e NÃO controla o AI
 * Overviews nem o AI Mode — esses rodam sobre o Googlebot e não têm token
 * próprio. Bloqueá-lo não tira ninguém do resumo do Google.
 */
const ROBOS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'PerplexityBot', 'Google-Extended']

/**
 * Leitura de robots.txt suficiente para a pergunta que a ferramenta faz:
 * "este robô está barrado da raiz?".
 *
 * Não é um parser completo da especificação — não trata `Allow` mais
 * específico, curinga no meio do caminho nem `Crawl-delay`. Trata o caso que
 * responde por quase todo bloqueio real: um grupo com `Disallow: /`.
 *
 * A regra de precedência que ele respeita é a que muda o resultado: grupo com
 * o nome exato do robô vence o grupo `*`. Um site que barra tudo em `*` mas
 * abre para o GPTBot num grupo próprio está liberado para o GPTBot, e dizer o
 * contrário seria acusar o site de algo que ele não faz.
 */
export function robosBarrados(robotsTxt) {
  if (!robotsTxt) return []

  /** @type {Map<string, string[]>} */
  const grupos = new Map()
  let atuais = []
  let lendoRegras = false

  for (const linhaBruta of robotsTxt.split('\n')) {
    const linha = linhaBruta.split('#')[0].trim()
    if (!linha) continue
    const [campoBruto, ...resto] = linha.split(':')
    const campo = campoBruto.trim().toLowerCase()
    const valor = resto.join(':').trim()

    if (campo === 'user-agent') {
      // Vários `User-agent` seguidos compartilham o mesmo bloco de regras.
      if (lendoRegras) {
        atuais = []
        lendoRegras = false
      }
      atuais.push(valor.toLowerCase())
      if (!grupos.has(valor.toLowerCase())) grupos.set(valor.toLowerCase(), [])
    } else if (campo === 'disallow' || campo === 'allow') {
      lendoRegras = true
      for (const ua of atuais) grupos.get(ua)?.push(`${campo} ${valor}`)
    }
  }

  const barraTudo = (regras) => {
    if (!regras) return false
    // `Allow: /` explícito no mesmo grupo desfaz o bloqueio da raiz.
    if (regras.some((r) => r === 'allow /')) return false
    return regras.some((r) => r === 'disallow /')
  }

  return ROBOS.filter((robo) => {
    const proprio = grupos.get(robo.toLowerCase())
    // Grupo com nome exato vence o curinga — inclusive para LIBERAR.
    if (proprio) return barraTudo(proprio)
    return barraTudo(grupos.get('*'))
  })
}

/**
 * Os fundamentos que ficam no cabeçalho da página.
 *
 * Todos saem do HTML que já foi buscado — nenhuma requisição a mais. E todos
 * falham com frequência em site de construtor, onde o dono nunca teve onde
 * preencher.
 *
 * `h1` conta em vez de devolver booleano porque ZERO e CINCO são problemas
 * diferentes: zero é a página não declarar do que trata; cinco é declarar
 * cinco assuntos, o que dá no mesmo. A página decide o que fazer com o número.
 */
export function analisarCabecalho(html) {
  const cabeca = html.slice(0, 200_000)

  const titulo = /<title[^>]*>([\s\S]{0,300}?)<\/title>/i.exec(cabeca)?.[1]?.trim() ?? null

  // Duas regex porque a ordem dos atributos numa tag é livre, e construtor de
  // página gera nas duas ordens.
  const descricao =
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']{0,400})["']/i.exec(cabeca)?.[1]?.trim() ??
    /<meta[^>]+content=["']([^"']{0,400})["'][^>]+name=["']description["']/i.exec(cabeca)?.[1]?.trim() ??
    null

  const h1 = (cabeca.match(/<h1[\s>]/gi) ?? []).length

  // JSON-LD é o formato que Google e as ferramentas de fato consomem.
  // Microdata (`itemtype`) ainda existe e conta.
  const dadosEstruturados =
    /<script[^>]+type=["']application\/ld\+json["']/i.test(cabeca) || /itemtype=["']https?:\/\/schema\.org/i.test(cabeca)

  /**
   * O idioma declarado.
   *
   * Construtor gera `lang="en"` em site brasileiro com frequência, ou não gera
   * nada. É a linha que diz à IA em que idioma o conteúdo está — e um site em
   * português declarado como inglês é lido com a premissa errada.
   *
   * Só a raiz do código interessa: `pt-BR` e `pt-PT` são ambos português para
   * esta pergunta.
   */
  const idioma = /<html[^>]+lang=["']([a-zA-Z-]{2,10})["']/i.exec(cabeca)?.[1]?.toLowerCase() ?? null

  /**
   * Se o link vira cartão quando alguém compartilha.
   *
   * É a medição desta lista mais próxima do dia a dia de quem lê: dono de
   * empresa manda o próprio site no WhatsApp toda semana. Sem estas tags o
   * link chega pelado — só o endereço. Ele já viu isso acontecer e nunca soube
   * o nome.
   *
   * Exige título E imagem: só o título produz um cartão magro que quase não se
   * distingue de link cru, e é a imagem que faz alguém parar de rolar.
   */
  const ogTitulo = /<meta[^>]+property=["']og:title["']/i.test(cabeca) || /<meta[^>]+name=["']og:title["']/i.test(cabeca)
  const ogImagem = /<meta[^>]+property=["']og:image["']/i.test(cabeca) || /<meta[^>]+name=["']og:image["']/i.test(cabeca)

  return {
    titulo: titulo || null,
    descricao: descricao || null,
    h1,
    dadosEstruturados,
    idioma,
    cartao: ogTitulo && ogImagem,
  }
}

/**
 * Se o site publica conteúdo, inferido dos caminhos do sitemap.
 *
 * É literalmente o que a página vende. Um institucional sem nenhuma página de
 * artigo não tem de onde a IA tirar resposta sobre o setor dele — e isso
 * explica a ausência muito melhor que qualquer detalhe técnico.
 *
 * Inferência por caminho, e por isso conservadora: devolve `null` quando não
 * há sitemap legível, em vez de `false`. Não achar não é o mesmo que não ter,
 * e afirmar que um site não publica quando ele publica em outra estrutura
 * seria errar na cara do dono.
 */
export function detectarBlog(locs) {
  if (!locs?.length) return null
  const marcas = /\/(blog|noticias?|artigos?|news|posts?|insights|conteudo|materias?)(\/|$)/i
  return locs.some((u) => marcas.test(u))
}

/**
 * Em que a coisa foi construída.
 *
 * Serve como PROVA DE QUE LEMOS O SITE, não como veredito. Nenhuma destas
 * plataformas impede ser lida por IA — todas entregam HTML pronto por padrão,
 * e dizer o contrário seria a mentira que as agências vendem.
 *
 * Deliberadamente conservador: só aponta com sinal forte, e cala quando não
 * tem certeza. Errar a plataforma na cara do dono destrói a credibilidade de
 * todo o resto do diagnóstico na mesma tela — e é um erro que ele percebe na
 * hora, diferente de qualquer outro número ali.
 */
export function detectarPlataforma(html, headers) {
  const h = html.slice(0, 400_000)
  const temCabecalho = (nome) => headers.get(nome) !== null

  if (temCabecalho('x-shopid') || /cdn\.shopify\.com/i.test(h)) return 'Shopify'
  if (temCabecalho('x-wix-request-id') || /static\.parastorage\.com/i.test(h)) return 'Wix'
  if (/\/wp-content\/|\/wp-includes\//i.test(h)) {
    // Elementor é o dado mais útil de um WordPress: é o construtor que mais
    // pesa, e o dono costuma saber que usa.
    return /\/wp-content\/plugins\/elementor\//i.test(h) ? 'WordPress com Elementor' : 'WordPress'
  }
  if (/static1\.squarespace\.com|squarespace\.com\/universal/i.test(h)) return 'Squarespace'
  if (/website-files\.com/i.test(h)) return 'Webflow'
  if (/framerusercontent\.com/i.test(h)) return 'Framer'
  if (/\/_next\/static\//i.test(h)) return 'Next.js'

  // Última tentativa: a própria página se declarando.
  const gerador = /<meta[^>]+name=["']generator["'][^>]+content=["']([^"']{2,60})["']/i.exec(h)
  return gerador ? gerador[1].trim() : null
}

/**
 * Tamanho e idade do site, lidos do sitemap.
 *
 * POR QUE ISTO IMPORTA MAIS QUE O TESTE DE LEGIBILIDADE, para o público desta
 * página: quase todo site de pequena empresa está em WordPress, Wix ou
 * Shopify, que entregam HTML pronto. Eles PASSAM na legibilidade. O que
 * explica a ausência deles nas respostas de IA não é "não dá para ler" — é
 * "não há o que citar". Um institucional de cinco páginas parado desde 2022
 * é tecnicamente impecável e invisível.
 *
 * `<lastmod>` é declarado pelo próprio site e nem sempre é honesto — CMS que
 * carimba a data de hoje em página que ninguém toca existe. Por isso a data
 * vai para a tela como fato declarado, não como acusação.
 *
 * Índice de sitemaps (`<sitemapindex>`) não é destrinchado: seria uma
 * requisição por sitemap filho, e o teto de tempo não comporta. Nesse caso a
 * contagem de páginas volta `null` — desconhecida é a resposta honesta — mas
 * a data mais recente ainda sai, porque as entradas do índice a carregam.
 */
export async function lerSitemap(alvo, signal) {
  try {
    const r = await fetch(new URL('/sitemap.xml', alvo.origin).toString(), {
      signal,
      redirect: 'follow',
      headers: { 'User-Agent': UA },
    })
    if (!r.ok) return null
    const xml = (await r.text()).slice(0, 1_500_000)

    const datas = [...xml.matchAll(/<lastmod>\s*([^<\s]+)/gi)].map((m) => m[1])
    const maisRecente = datas.length ? datas.sort().at(-1) : null

    const ehIndice = /<sitemapindex/i.test(xml)
    const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)/gi)].map((m) => m[1])
    const paginas = ehIndice ? null : locs.length

    // Num índice, os `<loc>` apontam para outros sitemaps — e os nomes deles
    // costumam denunciar a estrutura ("post-sitemap.xml", "blog-sitemap.xml"),
    // então a inferência ainda vale.
    return { paginas, maisRecente: maisRecente ?? null, temBlog: detectarBlog(locs) }
  } catch {
    return null
  }
}

/**
 * Busca e lê o robots.txt do domínio. Falha em silêncio de propósito: arquivo
 * ausente, 404 ou erro de rede significam "nada proibido", que é o padrão da
 * web. Transformar ausência em alarme seria inventar problema.
 */
async function buscarRobots(alvo, signal) {
  try {
    const r = await fetch(new URL('/robots.txt', alvo.origin).toString(), {
      signal,
      redirect: 'follow',
      headers: { 'User-Agent': UA },
    })
    if (!r.ok) return []
    const corpo = (await r.text()).slice(0, 100_000)
    return robosBarrados(corpo)
  } catch {
    return []
  }
}

/**
 * O que uma IA entende do site, lendo só o que o servidor entregou.
 *
 * É a peça mais próxima de DEMONSTRAÇÃO que esta ferramenta tem — e
 * demonstração é o que a pesquisa apontou como o sinal mais influente na
 * decisão de compra, acima de avaliação de terceiro. Não é uma métrica sobre o
 * site: é a IA lendo o site na frente do dono.
 *
 * Fecha também a lacuna que o próprio aviso de escopo admite: a lista de
 * verificação diz se dá para ler, e nada dizia se o que existe ali serve para
 * alguma coisa.
 *
 * DUAS HONESTIDADES OBRIGATÓRIAS, e a página precisa carregar as duas:
 *
 * 1. NÃO É O CHATGPT. Roda Llama pelo Groq. A resposta demonstra o que um
 *    modelo extrai daquele texto — não prevê o que o ChatGPT responderia sobre
 *    a empresa. Confundir os dois seria medir uma coisa e vender outra, que é
 *    o mecanismo da métrica de vaidade.
 * 2. NÃO É MEDIÇÃO. Rodar duas vezes dá respostas diferentes. Por isso vive
 *    separada da lista de verificação, que é medida e estável.
 *
 * Sem `GROQ_API_KEY` devolve `null` e a página não mostra nada — mesmo padrão
 * do resto: a ausência some, não vira buraco.
 */
async function lerComIA(texto, env, signal, idioma) {
  if (!env?.GROQ_API_KEY || !texto || texto.length < 40) return null

  /**
   * A PERGUNTA É O QUE DECIDE, e não o tom pedido.
   *
   * A primeira versão perguntava "o que esta empresa faz?" — tarefa de
   * DESCRIÇÃO. O modelo resumia com boa vontade, porque é o que descrição
   * pede, e o resultado saía morno mesmo diante de um site vazio.
   *
   * Mandar o modelo "ser crítico" resolveria pelo lado errado: ele obedeceria
   * e acharia defeito em qualquer site, inclusive num bom. Isso é fabricar
   * achado — crítica inventada sobre o negócio real de outra pessoa, na tela
   * dela. É o mesmo mecanismo da métrica de vaidade, com o sinal trocado.
   *
   * O que muda tudo é fazer a PERGUNTA REAL: alguém pediu à IA uma empresa
   * deste setor — o que este texto permite dizer que faça escolherem esta?
   * Para a maioria dos sites a resposta honesta é "nada", e isso é mais
   * afiado que qualquer crítica pedida.
   *
   * A citação literal do que estraga é a outra metade. Erro de digitação no
   * menu e texto de formulário misturado ao conteúdo não precisam ser
   * inventados — precisam ser mostrados entre aspas, porque é o que a IA leu.
   */
  const instrucao =
    idioma === 'en'
      ? [
          'You are given the raw text a crawler extracted from a company website. This is exactly what an AI has to work with.',
          'Do two things, in short plain prose, no headings and no lists.',
          'First: in quotation marks, write the answer an AI would give to someone asking it to recommend a company in this sector and region, using ONLY this text. If the text does not support a recommendation, write the vague answer it would actually give — do not improve it.',
          'Then write one sentence listing 3 to 5 concrete questions a prospective customer would STILL have to ask, because this text does not answer them. Use the questions that actually matter before hiring in THIS sector — price, coverage, deadlines, how it works, whether they serve the customer\'s area. Phrase them as the customer would ask.',
          'Separate the two parts with a blank line. Never invent information that is not in the text. Do not praise and do not editorialise.',
        ].join(' ')
      : [
          'Você recebe o texto bruto que um rastreador extraiu do site de uma empresa. É exatamente o que uma IA tem para trabalhar.',
          'Faça duas coisas, em prosa curta, sem título e sem lista.',
          'Primeiro: escreva entre aspas a resposta que uma IA daria a alguém que pedisse recomendação de empresa desse setor e dessa região, usando SÓ este texto. Se o texto não sustentar uma recomendação, escreva a resposta vaga que ela daria de verdade — não melhore.',
          // A parte que faltava, e é ela que faz o dono entender o custo.
          // "Faltou detalhe sobre os produtos" é abstrato e ele ignora. As
          // perguntas concretas do cliente ele reconhece na hora, porque são
          // as mesmas que ele responde à mão no WhatsApp todo dia.
          'Depois escreva UMA frase listando de 3 a 5 perguntas concretas que um cliente em potencial AINDA precisaria fazer, porque este texto não responde. Use as perguntas que de fato importam antes de contratar NESTE setor — preço, cobertura, prazo, como funciona, se atende a região dele. Escreva do jeito que o cliente perguntaria.',
          'Separe as duas partes com uma linha em branco. Nunca invente informação que não esteja no texto. Não elogie e não opine.',
        ].join(' ')

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      signal,
      headers: {
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // ESCOLHIDO COMPARANDO SAÍDA REAL, não pela ficha técnica.
        //
        // `llama-3.3-70b-versatile` estava aqui e foi aposentado pela Groq —
        // toda chamada voltava 404. Dos quatro modelos de texto que restaram
        // na conta, dois foram testados com ESTE prompt, em português, sobre o
        // site magro de uma marmoraria:
        //
        //   openai/gpt-oss-120b  devolveu exatamente o formato pedido — a
        //                        resposta vaga entre aspas, linha em branco, e
        //                        a frase com as perguntas do cliente.
        //   qwen/qwen3.6-27b     vazou o raciocínio `<think>` no corpo da
        //                        resposta e estourou `max_tokens` antes de
        //                        chegar na segunda parte. Inutilizável sem
        //                        pós-processamento.
        //
        // `groq/compound` foi descartado sem teste: é sistema agêntico com
        // busca na web embutida, e a instrução mais importante deste prompt é
        // "nunca invente informação que não esteja no texto". Dar ferramenta
        // de busca a ele é convidar exatamente o que o prompt proíbe.
        model: MODELO,
        // Temperatura baixa não torna a resposta determinística, mas reduz a
        // variação entre execuções — e aqui variação é custo, porque o dono
        // pode rodar duas vezes e comparar.
        temperature: 0.2,
        // Subiu de 220 para caber de 3 a 5 frases com citação literal. Cortar
        // a resposta no meio de uma aspa seria pior que não ter a citação.
        max_tokens: 400,
        messages: [
          { role: 'system', content: instrucao },
          { role: 'user', content: texto.slice(0, 6000) },
        ],
      }),
    })
    if (!r.ok) {
      // O SILÊNCIO AQUI QUASE CUSTOU A FUNCIONALIDADE INTEIRA.
      //
      // Devolver `null` sem dizer nada é a decisão certa para a TELA — o
      // visitante não tem o que fazer com um erro nosso. Mas era também a
      // única pista que existia, e sem ela o Worker subiu em produção com a
      // leitura por IA desligada e ninguém teria percebido: a página some a
      // seção e continua parecendo correta.
      //
      // Foi assim que o modelo aposentado passou. `llama-3.3-70b-versatile`
      // saiu do catálogo da Groq e toda chamada voltava 404 `model_not_found`;
      // a resposta continuava chegando bonita, só que sem a parte que é o
      // diferencial da ferramenta. Descoberto testando a API na mão, não pela
      // aplicação.
      //
      // `console.error` num Worker vai para `wrangler tail` e para o painel de
      // observabilidade (já ligado no wrangler.toml). Não muda o que o
      // visitante vê; muda que a falha deixa rastro.
      console.error('groq', r.status, (await r.text().catch(() => '')).slice(0, 300))
      return null
    }
    const dados = await r.json()
    return dados?.choices?.[0]?.message?.content?.trim() || null
  } catch (e) {
    // Chave inválida, cota estourada, tempo esgotado. Nada disso é problema do
    // site auditado, e nada disso pode virar veredito sobre ele — mas também
    // não pode sumir sem deixar rastro. Ver o comentário acima.
    console.error('groq', e instanceof Error ? e.name : 'erro', e instanceof Error ? e.message : '')
    return null
  }
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

function json(corpo, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  })
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS })
    if (request.method !== 'GET') return json({ erro: 'metodo' }, 405)

    const bruto = new URL(request.url).searchParams.get('url')?.trim()
    if (!bruto) return json({ erro: 'sem-url' }, 400)

    // Quem digita "suaempresa.com.br" não está errado — está digitando como se
    // fala. O protocolo é problema nosso, não dele.
    const comProtocolo = /^https?:\/\//i.test(bruto) ? bruto : `https://${bruto}`

    let alvo
    try {
      alvo = new URL(comProtocolo)
    } catch {
      return json({ erro: 'url-invalida' }, 400)
    }

    if (alvo.protocol !== 'http:' && alvo.protocol !== 'https:') {
      return json({ erro: 'url-invalida' }, 400)
    }
    if (enderecoProibido(alvo.hostname)) {
      return json({ erro: 'url-invalida' }, 400)
    }

    const abortar = new AbortController()
    const relogio = setTimeout(() => abortar.abort(), TIMEOUT_MS)

    try {
      const resposta = await fetch(alvo.toString(), {
        signal: abortar.signal,
        redirect: 'follow',
        headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
      })

      if (!resposta.ok) {
        // Distinção que a página INTEIRA depende de manter: um site que nos
        // barrou não é um site vazio. Reportar 403 como "o ChatGPT não vê
        // nada" seria uma afirmação falsa sobre o site de outra pessoa, numa
        // página cujo argumento é que suas afirmações se conferem.
        //
        // E A MESMA REGRA VALE UM NÍVEL ABAIXO, que é o defeito que só
        // apareceu com o Worker no ar: "não respondeu ok" não é sinônimo de
        // "recusou". Um domínio que não existe volta 530 da própria borda da
        // Cloudflare, e a tela dizia ao visitante que o SITE DELE estava
        // barrando robôs — sobre um endereço que ele só digitou errado.
        // Afirmação falsa, dita com confiança, na ferramenta cujo argumento é
        // que ela só afirma o que mediu.
        //
        // `bloqueado` fica reservado para quem RESPONDEU recusando. Todo o
        // resto é "não cheguei lá", que é honesto e não acusa ninguém.
        return json({ estado: classificarStatus(resposta.status), status: resposta.status })
      }

      const tipo = resposta.headers.get('content-type') ?? ''
      if (!tipo.includes('html')) return json({ estado: 'nao-html' })

      // Leitura em pedaços, para respeitar o teto sem baixar o arquivo todo.
      const leitor = resposta.body?.getReader()
      // Respondeu 200 e veio sem corpo: ninguém recusou nada, só não há o que
      // ler. Mesma correção do bloco acima — não acusar o site de barrar.
      if (!leitor) return json({ estado: 'inalcancavel', status: resposta.status })

      const decodificador = new TextDecoder('utf-8')
      let html = ''
      let lidos = 0
      for (;;) {
        const { done, value } = await leitor.read()
        if (done) break
        lidos += value.byteLength
        html += decodificador.decode(value, { stream: true })
        if (lidos >= MAX_BYTES) {
          await leitor.cancel()
          break
        }
      }

      const texto = textoVisivel(html)
      const palavras = texto ? texto.split(' ').filter(Boolean).length : 0

      // O robots.txt é a SEGUNDA forma de um site ser invisível, e a mais
      // comum das duas: configuração padrão de CDN e plugin de segurança
      // barram crawler de IA achando que é raspagem. Um site pode entregar
      // HTML impecável e mesmo assim não ter permissão — reportar só a
      // legibilidade daria um "está tudo certo" que estaria errado.
      //
      // Buscado com tolerância a falha de propósito: robots.txt ausente
      // significa "nada proibido", que é o padrão da web. Não achar o arquivo
      // não é problema e não deve virar alarme.
      // As duas buscas extras em paralelo: uma requisição a mais no relógio,
      // não duas.
      // As três em paralelo: uma ida ao relógio, não três. A leitura por IA é
      // a mais lenta das três, então serializá-la dobraria a espera.
      const idioma = new URL(request.url).searchParams.get('lang') === 'en' ? 'en' : 'pt'
      const [barrados, sitemap, entendimento] = await Promise.all([
        buscarRobots(alvo, abortar.signal),
        lerSitemap(alvo, abortar.signal),
        lerComIA(texto, env, abortar.signal, idioma),
      ])

      return json({
        estado: 'ok',
        palavras,
        sitemap,
        // Um recorte curto para a página poder mostrar o que de fato sobrou.
        // Ver é diferente de ler um número, e a ferramenta existe justamente
        // para tornar visível uma coisa que era abstrata.
        amostra: texto.slice(0, 220),
        truncado: lidos >= MAX_BYTES,
        barrados,
        plataforma: detectarPlataforma(html, resposta.headers),
        cabecalho: analisarCabecalho(html),
        entendimento,
        // `null` quando não houve leitura por IA — aí a tela não tem modelo
        // nenhum a creditar, e a frase de transparência não aparece junto com
        // uma seção que não existe. Ver o comentário em `MODELO`.
        modelo: entendimento ? MODELO_ROTULO : null,
      })
    } catch (e) {
      // Tempo esgotado, DNS que não resolve, TLS quebrado. Nada disso é
      // veredito sobre o conteúdo do site.
      //
      // O COMENTÁRIO ACIMA JÁ ESTAVA CERTO E O CÓDIGO NÃO SEGUIA. Ele calculava
      // o `motivo` corretamente e mesmo assim devolvia `estado: 'bloqueado'` —
      // e a tela lê o estado, não o motivo, então um DNS que não resolve
      // chegava ao visitante como "seu site recusou nossa leitura". O motivo
      // certo estava calculado e sendo jogado fora.
      return json({ estado: e instanceof Error && e.name === 'AbortError' ? 'tempo' : 'inalcancavel' })
    } finally {
      clearTimeout(relogio)
    }
  },
}
