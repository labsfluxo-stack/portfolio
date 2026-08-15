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
  async fetch(request) {
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
        return json({ estado: 'bloqueado', status: resposta.status })
      }

      const tipo = resposta.headers.get('content-type') ?? ''
      if (!tipo.includes('html')) return json({ estado: 'nao-html' })

      // Leitura em pedaços, para respeitar o teto sem baixar o arquivo todo.
      const leitor = resposta.body?.getReader()
      if (!leitor) return json({ estado: 'bloqueado', status: resposta.status })

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
      const barrados = await buscarRobots(alvo, abortar.signal)

      return json({
        estado: 'ok',
        palavras,
        // Um recorte curto para a página poder mostrar o que de fato sobrou.
        // Ver é diferente de ler um número, e a ferramenta existe justamente
        // para tornar visível uma coisa que era abstrata.
        amostra: texto.slice(0, 220),
        truncado: lidos >= MAX_BYTES,
        barrados,
        plataforma: detectarPlataforma(html, resposta.headers),
      })
    } catch (e) {
      // Tempo esgotado, DNS que não resolve, TLS quebrado. Nada disso é
      // veredito sobre o conteúdo do site.
      const motivo = e instanceof Error && e.name === 'AbortError' ? 'tempo' : 'inalcancavel'
      return json({ estado: 'bloqueado', motivo })
    } finally {
      clearTimeout(relogio)
    }
  },
}
