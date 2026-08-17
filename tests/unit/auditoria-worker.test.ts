import { describe, expect, it } from 'vitest'
// O Worker é JS puro: roda na Cloudflare, não no build do Next. O TS o infere
// sem tipos declarados, o que basta para o que se testa aqui.
import {
  enderecoProibido,
  textoVisivel,
  robosBarrados,
  detectarPlataforma,
  classificarStatus,
} from '../../workers/auditoria/index.js'

/**
 * O Worker da auditoria não passa pelo build do Next e não seria coberto por
 * nada. Mas ele é o único código do projeto que busca URL arbitrária vinda de
 * estranho na internet, e o único cujo erro produz uma AFIRMAÇÃO FALSA SOBRE O
 * SITE DE OUTRA PESSOA — na página cujo argumento inteiro é que suas
 * afirmações se conferem.
 *
 * As quatro funções puras são testadas aqui. O `fetch` em si não: testar rede
 * de verdade dá teste instável, e o que pode dar errado de forma silenciosa é
 * a lógica, não a chamada.
 */

describe('enderecoProibido — barreira de SSRF', () => {
  // Sem isto, este endereço público vira um proxy para rede interna. O
  // 169.254.169.254 é o caminho clássico para vazar credencial de nuvem.
  it.each([
    'localhost',
    'app.localhost',
    'servico.internal',
    'impressora.local',
    '127.0.0.1',
    '10.0.0.5',
    '172.16.3.9',
    '172.31.255.1',
    '192.168.1.1',
    '169.254.169.254',
    '0.0.0.0',
    '::1',
  ])('barra %s', (host) => {
    expect(enderecoProibido(host)).toBe(true)
  })

  // Falso positivo aqui é pior que parece: recusaria o site legítimo do
  // visitante. 172.32 e 172.15 ficam FORA da faixa privada 172.16–172.31.
  it.each(['exemplo.com.br', 'www.loja.com', '8.8.8.8', '172.32.0.1', '172.15.0.1', '193.168.1.1'])(
    'deixa passar %s',
    (host) => {
      expect(enderecoProibido(host)).toBe(false)
    },
  )
})

describe('textoVisivel — o que sobra sem JavaScript', () => {
  it('conta o texto servido pelo servidor', () => {
    const html = '<html><body><h1>Loja do João</h1><p>Móveis sob medida</p></body></html>'
    expect(textoVisivel(html)).toBe('Loja do João Móveis sob medida')
  })

  // O caso que a ferramenta existe para detectar: casca de SPA.
  it('uma casca de SPA sobra vazia', () => {
    const html = '<html><body><div id="root"></div><script src="/app.js"></script></body></html>'
    expect(textoVisivel(html)).toBe('')
  })

  /**
   * A ARMADILHA QUE INVALIDARIA A FERRAMENTA INTEIRA.
   *
   * HTML minificado vem numa linha só. Com `.*` guloso, o replace apagaria
   * tudo entre o PRIMEIRO e o ÚLTIMO `<script>` do documento — ou seja, o
   * conteúdo no meio — e QUALQUER site pareceria vazio. A ferramenta daria
   * diagnóstico catastrófico e errado para todo mundo.
   */
  it('dois scripts não apagam o conteúdo entre eles', () => {
    const html = '<script>a=1</script><p>Conteúdo real</p><script>b=2</script>'
    expect(textoVisivel(html)).toBe('Conteúdo real')
  })

  // "Ative o JavaScript para ver este site" não é conteúdo — é pedido de
  // desculpas. Contá-lo faria a ferramenta dizer que há texto justamente
  // quando não há nada.
  it('o aviso de <noscript> não conta como conteúdo', () => {
    const html = '<div id="app"></div><noscript>Ative o JavaScript para usar este site.</noscript>'
    expect(textoVisivel(html)).toBe('')
  })

  it('ignora CSS e comentário', () => {
    const html = '<style>.a{color:red}</style><!-- rascunho --><p>Oi</p>'
    expect(textoVisivel(html)).toBe('Oi')
  })
})

describe('robosBarrados — a segunda forma de ser invisível', () => {
  it('sem robots.txt, nada está proibido — é o padrão da web', () => {
    expect(robosBarrados('')).toEqual([])
    expect(robosBarrados(null)).toEqual([])
  })

  it('robots.txt permissivo não barra ninguém', () => {
    expect(robosBarrados('User-agent: *\nDisallow: /admin/')).toEqual([])
  })

  it('curinga bloqueando a raiz barra todos', () => {
    expect(robosBarrados('User-agent: *\nDisallow: /')).toHaveLength(6)
  })

  it('bloqueio nominal atinge só o robô nomeado', () => {
    const barrados = robosBarrados('User-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nAllow: /')
    expect(barrados).toEqual(['GPTBot'])
  })

  /**
   * A REGRA DE PRECEDÊNCIA QUE MUDA O VEREDITO.
   *
   * Um site que barra tudo no curinga mas abre um grupo próprio para o GPTBot
   * está LIBERADO para o GPTBot. Errar isso faria a ferramenta acusar o site
   * de bloquear justamente o robô que ele deixou passar de propósito — uma
   * afirmação falsa sobre o site de outra pessoa.
   */
  it('grupo com nome exato vence o curinga, inclusive para liberar', () => {
    const txt = 'User-agent: *\nDisallow: /\n\nUser-agent: GPTBot\nAllow: /'
    const barrados = robosBarrados(txt)
    expect(barrados).not.toContain('GPTBot')
    expect(barrados).toContain('ClaudeBot')
  })

  it('vários User-agent seguidos compartilham as mesmas regras', () => {
    const txt = 'User-agent: GPTBot\nUser-agent: ClaudeBot\nDisallow: /'
    const barrados = robosBarrados(txt)
    expect(barrados).toContain('GPTBot')
    expect(barrados).toContain('ClaudeBot')
    expect(barrados).not.toContain('PerplexityBot')
  })

  it('não se confunde com comentário nem com maiúscula', () => {
    const txt = '# bloqueia tudo\nUSER-AGENT: gptbot\nDISALLOW: /   # inclusive a raiz'
    expect(robosBarrados(txt)).toEqual(['GPTBot'])
  })
})

describe('detectarPlataforma — prova de que lemos, não veredito', () => {
  const semCabecalho = new Headers()

  it.each([
    ['<link href="/wp-content/themes/x/style.css">', 'WordPress'],
    ['<link href="/wp-content/plugins/elementor/assets/a.css">', 'WordPress com Elementor'],
    ['<script src="https://cdn.shopify.com/s/files/x.js">', 'Shopify'],
    ['<img src="https://static.parastorage.com/y.png">', 'Wix'],
    ['<link href="https://static1.squarespace.com/z.css">', 'Squarespace'],
    ['<script src="https://cdn.prod.website-files.com/a.js">', 'Webflow'],
    ['<img src="https://framerusercontent.com/b.png">', 'Framer'],
    ['<script src="/_next/static/chunks/main.js">', 'Next.js'],
  ])('reconhece %s', (html, esperado) => {
    expect(detectarPlataforma(html, semCabecalho)).toBe(esperado)
  })

  it('usa o cabeçalho quando o HTML não denuncia', () => {
    expect(detectarPlataforma('<p>oi</p>', new Headers({ 'x-shopid': '123' }))).toBe('Shopify')
  })

  // Conservador de propósito: errar a plataforma na cara do dono destrói a
  // credibilidade de todo o resto do diagnóstico, e é o único erro ali que ele
  // percebe na hora.
  it('cala quando não tem sinal forte', () => {
    expect(detectarPlataforma('<html><body><p>Site feito à mão</p></body></html>', semCabecalho)).toBe(null)
  })

  it('aceita a página se declarando via meta generator', () => {
    const html = '<meta name="generator" content="Drupal 10">'
    expect(detectarPlataforma(html, semCabecalho)).toBe('Drupal 10')
  })
})

/**
 * O DEFEITO QUE SÓ APARECEU COM O WORKER NO AR.
 *
 * A primeira versão tratava todo `!resposta.ok` como recusa. Um domínio que
 * não existe volta 530 da borda da Cloudflare, então a ferramenta dizia ao
 * visitante "seu site recusou nossa leitura — há uma proteção no caminho"
 * sobre um endereço que ele havia digitado errado. Duas afirmações falsas,
 * ditas com confiança, na ferramenta cujo argumento é que ela só afirma o que
 * mediu — e é a mesma classe de erro que já tinha custado a remoção da caça a
 * erro de digitação.
 *
 * Passou porque a regra vivia numa condição embutida na chamada de rede, que é
 * a única parte que os testes deste arquivo não olham. Virou função pura por
 * isso.
 */
describe('classificarStatus — recusa não é o mesmo que inalcançável', () => {
  // O site RESPONDEU e negou. Só aqui cabe dizer que há proteção no caminho.
  it.each([401, 403, 406, 429, 451])('%i é recusa do próprio site', (status) => {
    expect(classificarStatus(status)).toBe('bloqueado')
  })

  // Nenhum destes autoriza acusar o site de barrar robô.
  it.each([
    [404, 'não existe página nesse endereço'],
    [410, 'a página foi removida'],
    [500, 'o site está quebrado agora'],
    [502, 'gateway da origem'],
    [503, 'origem indisponível'],
    [522, 'Cloudflare não conectou na origem'],
    [523, 'Cloudflare não achou a origem'],
    [530, 'DNS da origem não resolve — o caso do endereço digitado errado'],
  ])('%i é inalcançável (%s)', (status) => {
    expect(classificarStatus(status)).toBe('inalcancavel')
  })

  // O caso concreto que o dono veria: digitar um domínio que não existe.
  it('domínio inexistente não pode ser reportado como bloqueio', () => {
    expect(
      classificarStatus(530),
      'voltou a acusar o site do visitante de barrar robôs quando o endereço só não existe',
    ).not.toBe('bloqueado')
  })
})
