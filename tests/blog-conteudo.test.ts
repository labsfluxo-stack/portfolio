import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LOCALE_DO_BLOG, POST_SLUGS, todosOsPosts } from '../content/posts'
import {
  idDoTitulo,
  minutosDeLeitura,
  palavrasDe,
  palavrasDoPost,
  titulosDe,
  titulosDoPost,
} from '../lib/leitura'
import { blogJsonLd, postJsonLd } from '../lib/jsonld'
import { SCRIPT_TEMA, TEMAS, ehTema } from '../components/blog/tema'

const PASTA = join(process.cwd(), 'content', 'posts')

function arquivosMdx(): string[] {
  return readdirSync(PASTA)
    .filter((nome) => nome.endsWith('.mdx'))
    .map((nome) => nome.replace(/\.mdx$/, ''))
}

describe('o diretório e o registro são a mesma lista', () => {
  /**
   * A TRAVA MAIS IMPORTANTE DESTE ARQUIVO, e ela protege três consumidores.
   *
   * `content/posts.ts` importa cada `.mdx` explicitamente — precisa, porque o
   * empacotador tem de ver o grafo. `scripts/generate-seo-files.mts` não pode
   * importar aquele módulo (roda em Node puro, que não carrega `.mdx`) e por
   * isso VARRE O DIRETÓRIO para montar sitemap, llms.txt e feed.
   *
   * São duas leituras da mesma verdade — desde que sejam iguais. Sem este
   * teste, um artigo novo esquecido no registro renderiza como 404 mas aparece
   * no sitemap e no feed; e um artigo removido do disco mas mantido no registro
   * quebra o build. Nenhum dos dois avisa.
   */
  it('todo .mdx está no registro e todo registro tem .mdx', () => {
    expect([...POST_SLUGS].sort()).toEqual(arquivosMdx().sort())
  })

  it('há pelo menos um artigo publicado', () => {
    // O blog existe para o site parar de reprovar na própria checagem "o site
    // publica conteúdo" (workers/auditoria, `detectarBlog`). Blog vazio não
    // conserta isso — a rota existiria e o sitemap não teria artigo nenhum.
    expect(POST_SLUGS.length).toBeGreaterThan(0)
  })
})

describe('metadados dos artigos', () => {
  const posts = todosOsPosts()

  it.each(posts.map((p) => [p.slug, p] as const))('%s tem meta completo e datado', (_slug, post) => {
    expect(post.meta.titulo.trim()).not.toBe('')
    expect(post.meta.descricao.trim()).not.toBe('')
    expect(post.meta.tags.length).toBeGreaterThan(0)
    // `YYYY-MM-DD` e uma data que existe de verdade: `2026-02-31` passa numa
    // checagem de formato e vira 3 de março no `Date`, o que faria o sitemap e
    // o feed anunciarem um dia diferente do que está escrito no arquivo.
    for (const data of [post.meta.publicado, post.meta.atualizado].filter(Boolean) as string[]) {
      expect(data).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(new Date(`${data}T00:00:00Z`).toISOString().slice(0, 10)).toBe(data)
    }
  })

  it('a revisão nunca é anterior à publicação', () => {
    for (const post of posts) {
      if (!post.meta.atualizado) continue
      expect(post.meta.atualizado >= post.meta.publicado).toBe(true)
    }
  })

  /**
   * A descrição vira `<meta name="description">`, cartão OG e a linha do índice.
   * Acima de ~160 caracteres o buscador corta no meio da frase; abaixo de ~70
   * ela não diz o suficiente para alguém decidir clicar.
   */
  it('a descrição cabe num resultado de busca', () => {
    for (const post of posts) {
      expect(post.meta.descricao.length).toBeGreaterThan(70)
      expect(post.meta.descricao.length).toBeLessThanOrEqual(200)
    }
  })

  /**
   * O slug é a URL, e a URL é permanente: mudá-la depois de publicada quebra
   * todo link já compartilhado e zera o histórico da página no buscador.
   * Acento e maiúscula sobrevivem mal a ser colados em WhatsApp e e-mail.
   */
  it('o slug é ASCII minúsculo com hífens', () => {
    for (const slug of POST_SLUGS) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })
})

describe('leitura', () => {
  const slug = POST_SLUGS[0]!

  it('conta palavras do texto, não do bloco de metadados', () => {
    const bruto = readFileSync(join(PASTA, `${slug}.mdx`), 'utf8')
    const total = palavrasDoPost(slug)
    expect(total).toBeGreaterThan(300)
    // O `meta` tem título, descrição e tags — se ele estivesse sendo contado, a
    // contagem passaria de perto do total de palavras do arquivo inteiro.
    expect(total).toBeLessThan(bruto.split(/\s+/).filter(Boolean).length)
  })

  it('o tempo de leitura nunca é zero', () => {
    expect(minutosDeLeitura(slug)).toBeGreaterThanOrEqual(1)
  })

  /**
   * `idDoTitulo` é FONTE ÚNICA: `mdx-components.tsx` carimba o id do `<h2>` com
   * ela e `titulosDoPost` monta o índice com ela. Se as duas divergissem, o
   * índice apontaria para âncoras inexistentes — e as duas metades continuariam
   * funcionando sozinhas, então nada quebraria de forma visível.
   */
  it('gera âncora ASCII a partir de título com acento', () => {
    expect(idDoTitulo('O que isso muda na prática')).toBe('o-que-isso-muda-na-pratica')
    expect(idDoTitulo('Três coisas que os dados sustentam')).toBe('tres-coisas-que-os-dados-sustentam')
    expect(idDoTitulo('  Pontuação: dois — traços!  ')).toBe('pontuacao-dois-tracos')
  })

  it('extrai os títulos do artigo com id', () => {
    const titulos = titulosDoPost(slug)
    expect(titulos.length).toBeGreaterThan(2)
    for (const titulo of titulos) {
      expect(titulo.id).toBe(idDoTitulo(titulo.texto))
      expect(titulo.id).not.toBe('')
      expect([2, 3]).toContain(titulo.nivel)
    }
  })

  /**
   * `#` no começo de uma linha de shell é comentário, não título. Sem pular as
   * cercas de código, o índice ganharia entradas que não existem na página — e
   * o artigo que causa isso é justamente o técnico, que é a maioria aqui.
   */
  it('ignora título dentro de cerca de código', () => {
    const titulos = titulosDe(
      ['## Antes', '```bash', '## não sou título', '# nem eu', '```', '### Depois'].join('\n'),
    )
    expect(titulos.map((t) => t.texto)).toEqual(['Antes', 'Depois'])
    expect(titulos.map((t) => t.nivel)).toEqual([2, 3])
  })

  it('não conta o bloco de metadados como prosa', () => {
    const comMeta = ['export const meta = {', "  titulo: 'abacaxi jabuticaba caqui',", '}', '', 'Uma frase.'].join('\n')
    expect(palavrasDe(comMeta)).toBe(2)
  })

  it('conta o texto do link, não a URL', () => {
    expect(palavrasDe('Veja o [relatório da Averi](https://averi.ai/um/caminho/longo).')).toBe(5)
  })
})

describe('tema', () => {
  it('reconhece os dois temas e recusa qualquer outro valor', () => {
    for (const tema of TEMAS) expect(ehTema(tema)).toBe(true)
    for (const lixo of ['dark', 'light', '', null, undefined, 'ESCURO']) {
      expect(ehTema(lixo)).toBe(false)
    }
  })

  /**
   * O script inline é a única coisa entre o leitor e o flash branco. Estas
   * asserções travam as três propriedades que fazem ele funcionar — e as três
   * já foram esquecidas em implementações reais deste recurso.
   */
  it('o script inline carimba o tema antes da pintura', () => {
    // Escreve no `documentElement`, não no `body`: as regras de tema estão em
    // `html[data-tema]`, e o `body` ainda nem foi analisado quando ele roda.
    expect(SCRIPT_TEMA).toContain('documentElement.dataset.tema')
    // Consulta a preferência do sistema, senão quem nunca escolheu recebe
    // sempre o claro.
    expect(SCRIPT_TEMA).toContain('prefers-color-scheme: dark')
    // `localStorage` LANÇA em navegação privativa; sem o catch o script morre
    // e a página fica sem `data-tema` — sem fundo, sem cor e sem anel de foco.
    expect(SCRIPT_TEMA).toContain('catch')
  })

  it('não deixa a página sem tema quando o armazenamento falha', () => {
    // Executa o script de verdade contra um `document` de mentira, com um
    // `localStorage` que lança — o cenário exato da navegação privativa.
    const documentoFalso = { documentElement: { dataset: {} as Record<string, string> } }
    const janelaFalsa = { matchMedia: () => ({ matches: true }) }
    const armazenamentoQueLanca = {
      getItem() {
        throw new Error('acesso negado')
      },
    }
    new Function('document', 'window', 'localStorage', SCRIPT_TEMA)(
      documentoFalso,
      janelaFalsa,
      armazenamentoQueLanca,
    )
    expect(documentoFalso.documentElement.dataset.tema).toBe('claro')
  })

  it('segue o sistema quando não há escolha salva', () => {
    const documentoFalso = { documentElement: { dataset: {} as Record<string, string> } }
    const janelaFalsa = { matchMedia: () => ({ matches: true }) }
    new Function('document', 'window', 'localStorage', SCRIPT_TEMA)(documentoFalso, janelaFalsa, {
      getItem: () => null,
    })
    expect(documentoFalso.documentElement.dataset.tema).toBe('escuro')
  })

  it('a escolha salva vence a preferência do sistema', () => {
    const documentoFalso = { documentElement: { dataset: {} as Record<string, string> } }
    const janelaFalsa = { matchMedia: () => ({ matches: true }) }
    new Function('document', 'window', 'localStorage', SCRIPT_TEMA)(documentoFalso, janelaFalsa, {
      getItem: () => 'claro',
    })
    expect(documentoFalso.documentElement.dataset.tema).toBe('claro')
  })
})

describe('JSON-LD do blog', () => {
  const post = todosOsPosts()[0]!

  it('o artigo sai como BlogPosting datado', () => {
    const ld = postJsonLd(post, 4)
    expect(ld['@type']).toBe('BlogPosting')
    expect(ld.datePublished).toBe(post.meta.publicado)
    expect(ld.dateModified).toBe(post.meta.atualizado ?? post.meta.publicado)
    expect(ld.timeRequired).toBe('PT4M')
    expect(ld.wordCount).toBe(palavrasDoPost(post.slug))
  })

  /**
   * `author` e `publisher` apontam por `@id` para a `Person` que o layout de
   * locale já emite. Repetir nome e URL criaria duas descrições da mesma
   * pessoa no grafo — ambíguo para quem consome, e a cópia é a que envelhece.
   */
  it('aponta autor e publicador para a Person do site, sem copiá-la', () => {
    const ld = postJsonLd(post, 4)
    expect(ld.author['@id']).toMatch(/#pessoa$/)
    expect(ld.author['@id']).toBe(ld.publisher['@id'])
    // Só a referência, nada de nome e URL repetidos: duas descrições da mesma
    // pessoa no grafo é ambiguidade, e a cópia é a metade que envelhece.
    expect(Object.keys(ld.author)).toEqual(['@id'])
  })

  it('o índice lista todos os artigos publicados', () => {
    const ld = blogJsonLd(todosOsPosts())
    expect(ld['@type']).toBe('Blog')
    expect(ld.blogPost).toHaveLength(POST_SLUGS.length)
  })

  it('toda URL do blog fica sob o locale do blog', () => {
    const ld = postJsonLd(post, 4)
    expect(ld.url).toContain(`/${LOCALE_DO_BLOG}/blog/`)
    expect(ld.url).not.toContain('/en/')
  })
})
