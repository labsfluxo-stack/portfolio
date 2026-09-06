import * as perplexityCita46x from './posts/perplexity-cita-46x-mais-que-o-chatgpt-2026.mdx'
import * as comoTestar from './posts/como-testar-se-a-ia-le-seu-site-2026.mdx'
import * as wordpress from './posts/meu-site-e-wordpress-isso-e-problema-2026.mdx'
import * as seoEGeo from './posts/seo-e-geo-nao-sao-a-mesma-coisa-2026.mdx'
import * as codigoESeu from './posts/o-codigo-e-seu-se-o-desenvolvedor-sumir-2026.mdx'

/**
 * O BLOG É SÓ EM PORTUGUÊS, e isso é decisão do dono, não limitação técnica.
 *
 * O resto do site é bilíngue e o `hreflang` é recíproco em toda rota. O blog
 * quebra essa simetria de propósito: cada artigo escrito uma vez custa metade,
 * e o cliente que a landing persegue é brasileiro. A consequência precisa ser
 * respeitada em três lugares — `generateStaticParams` das rotas do blog só
 * emite `pt`, o sitemap não gera par alternativo para elas, e o `llms.txt` as
 * lista apenas na seção `pt-BR`.
 *
 * Ver `LOCALE_DO_BLOG` abaixo: a constante existe para que essa decisão tenha
 * UM nome no código, em vez de um literal `'pt'` repetido em quatro arquivos.
 */
export const LOCALE_DO_BLOG = 'pt' as const

/**
 * Os metadados de um artigo. Vivem no PRÓPRIO `.mdx`, como `export const meta`
 * — não em frontmatter, não num registro paralelo.
 *
 * A razão é a mesma que `scripts/generate-seo-files.mts` documenta no comentário
 * do `PATHS`: duas listas que deviam ser uma acabam divergindo, e a divergência
 * é sempre silenciosa. Metadado no arquivo do texto não tem como discordar do
 * texto.
 */
export type MetaPost = {
  titulo: string
  /** Uma frase. Vira `<meta name="description">`, cartão OG e linha do índice. */
  descricao: string
  /** `YYYY-MM-DD`. Vira `<lastmod>` no sitemap e `datePublished` no JSON-LD. */
  publicado: string
  /**
   * `YYYY-MM-DD` da última revisão de conteúdo. Opcional: artigo que nunca foi
   * revisado não deve fingir que foi.
   *
   * Quando existe, é ELE que vai para o `<lastmod>` — é a data que responde à
   * pergunta "isto ainda vale?", que é a que o buscador e a IA fazem. O
   * `auditoria.resultado.parado` do próprio site diz isso em voz alta:
   * "conteúdo parado raramente é citado em resposta sobre o que está
   * acontecendo agora".
   */
  atualizado?: string
  tags: readonly string[]
  /**
   * A imagem de abertura, que o ÍNDICE usa como capa.
   *
   * Vive no `meta` e não só no corpo do artigo porque o índice não consegue
   * ler o que está dentro do MDX — o corpo é um componente compilado, não
   * texto que dê para inspecionar. Sem isto, o índice seria para sempre uma
   * lista sem imagem enquanto os artigos têm foto, que foi exatamente o que o
   * dono viu e reclamou.
   *
   * ELA APARECE DUAS VEZES: aqui e como `<Figura>` no corpo. É a duplicidade
   * que este repositório normalmente recusa, e a alternativa foi considerada —
   * a página do artigo renderizar a capa sozinha, a partir do `meta`. Foi
   * descartada por causa da POSIÇÃO: no corpo a abertura entra depois do
   * primeiro parágrafo, para a resposta do artigo continuar no topo (a
   * pesquisa citada neste blog mede que 44,2% das citações de LLM saem dos
   * primeiros 30% do texto). Renderizada pela página, ela iria antes de tudo e
   * empurraria a resposta para baixo.
   *
   * A trava é `tests/blog-conteudo.test.ts`, que exige que o arquivo exista em
   * `public/` e que o `alt` daqui seja igual ao do `<Figura>` correspondente.
   */
  capa?: { src: string; alt: string; largura: number; altura: number }
}

type ModuloPost = {
  default: (props: Record<string, unknown>) => React.JSX.Element
  meta: MetaPost
}

/**
 * IMPORTAÇÃO ESTÁTICA, e não varredura de diretório.
 *
 * `output: 'export'` gera tudo em build, então ler a pasta com `fs` até
 * funcionaria — mas o bundler perde o rastro do que precisa entrar no pacote, e
 * o erro aparece como página em branco em produção, não como falha de build.
 * Import estático faz o `tsc` e o empacotador verem o grafo inteiro.
 *
 * O custo é uma linha por artigo publicado, aqui em cima. O teste
 * `tests/blog-conteudo.test.ts` varre `content/posts/` de verdade e falha se
 * existir um `.mdx` que ninguém importou — que é o único jeito de esse custo
 * ser esquecido.
 */
const REGISTRO: Record<string, ModuloPost> = {
  // O SLUG NÃO REPETE O TÍTULO, e isso é decisão, não descuido. O artigo
  // nasceu comparando só ChatGPT e Perplexity e cresceu para os quatro
  // mecanismos; o título acompanhou, o endereço não.
  //
  // URL publicada é permanente: trocá-la quebra todo link já compartilhado e
  // zera o histórico da página no buscador — é a regra que
  // `tests/blog-conteudo.test.ts` registra ao travar o formato do slug. O
  // endereço também não ficou errado: a diferença de 46 vezes continua sendo a
  // abertura do texto e o número mais forte dele.
  'perplexity-cita-46x-mais-que-o-chatgpt-2026': perplexityCita46x as unknown as ModuloPost,
  'como-testar-se-a-ia-le-seu-site-2026': comoTestar as unknown as ModuloPost,
  'meu-site-e-wordpress-isso-e-problema-2026': wordpress as unknown as ModuloPost,
  'seo-e-geo-nao-sao-a-mesma-coisa-2026': seoEGeo as unknown as ModuloPost,
  'o-codigo-e-seu-se-o-desenvolvedor-sumir-2026': codigoESeu as unknown as ModuloPost,
}

export type Post = { slug: string; meta: MetaPost; Corpo: ModuloPost['default'] }

/** A data que representa o artigo hoje: a revisão, se houve; a publicação, se não. */
export function dataVigente(meta: MetaPost): string {
  return meta.atualizado ?? meta.publicado
}

/**
 * Todos os artigos, do mais recente para o mais antigo.
 *
 * Ordena por `publicado` e NÃO por `dataVigente`: revisar um texto de dois anos
 * atrás não deve jogá-lo para o topo do índice como se fosse novidade. A data
 * de revisão serve ao `lastmod` e ao leitor; a ordem do índice é cronológica de
 * publicação.
 */
export function todosOsPosts(): Post[] {
  return Object.entries(REGISTRO)
    .map(([slug, modulo], ordem) => ({ slug, ordem, meta: modulo.meta, Corpo: modulo.default }))
    // DESEMPATE PELA ORDEM DO REGISTRO, e ele é necessário desde o primeiro
    // dia: o blog nasceu com cinco artigos publicados na MESMA data. Com
    // `publicado` igual, a comparação devolve 0 e a ordem final passa a
    // depender de detalhe de implementação do `sort` — muda entre versões de
    // motor e entre plataformas, e o índice sairia numa ordem no meu build e
    // noutra no do CI.
    //
    // Adiantar ou atrasar a data de um artigo para forçar a ordem resolveria
    // também, e seria mentira num site cujo argumento é que suas afirmações se
    // conferem. A ordem do `REGISTRO` acima É a ordem de leitura pretendida.
    .sort((a, b) => b.meta.publicado.localeCompare(a.meta.publicado) || a.ordem - b.ordem)
    .map(({ slug, meta, Corpo }) => ({ slug, meta, Corpo }))
}

export function postPorSlug(slug: string): Post | undefined {
  return todosOsPosts().find((p) => p.slug === slug)
}

export const POST_SLUGS = Object.keys(REGISTRO)
