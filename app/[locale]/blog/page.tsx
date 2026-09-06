import type { Metadata } from 'next'
import Link from 'next/link'
import { blogTextos } from '@/content/blog-textos'
import { LOCALE_DO_BLOG, todosOsPosts } from '@/content/posts'
import { minutosDeLeitura } from '@/lib/leitura'
import { dataLonga } from '@/lib/datas'
import { arquivoPublico, buildMetadata } from '@/lib/seo'
import { blogJsonLd } from '@/lib/jsonld'
import { MarcaIso } from '@/components/blog/MarcaIso'

export const dynamicParams = false

export function generateStaticParams() {
  return [{ locale: LOCALE_DO_BLOG }]
}

export function generateMetadata(): Metadata {
  return buildMetadata(LOCALE_DO_BLOG, {
    title: blogTextos.meta.titulo,
    description: blogTextos.meta.descricao,
    path: '/blog',
    ogImage: `/og/${LOCALE_DO_BLOG}-home.png`,
    imageAlt: blogTextos.meta.descricao,
    // Ver lib/seo.ts: o blog é só em português, e anunciar `hreflang="en"`
    // para uma URL que o build não gera transforma um sinal de SEO em 404.
    monolingue: true,
  })
}

export default function BlogIndex() {
  const posts = todosOsPosts()
  const { indice } = blogTextos

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd(posts)) }}
      />

      {/* `py-12 sm:py-16` E NÃO `py-16 sm:py-24`. O ar do topo foi calibrado
        * quando o índice era só texto, onde espaço generoso é o que dá
        * respiração. Com capa, o mesmo espaço vira desperdício: medido em
        * 1333x669 (a tela do dono), o cabeçalho consumia 438px antes de a
        * imagem começar, e a página mostrava um artigo por vez. */}
      <div className="mx-auto w-full max-w-5xl px-6 py-12 sm:py-16">
        <header className="flex flex-col gap-4">
          {/* A MARCA ISOMÉTRICA, que é o que liga esta página ao resto do site.
            * Fica acima do título e pequena de propósito: é uma citação da arte
            * da landing, não uma segunda ilustração competindo com ela. */}
          <MarcaIso className="h-11 w-11 shrink-0" />
          <h1 className="font-sans text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            {indice.titulo}
          </h1>
          {/* `max-w-2xl` no lead e não no `<h1>`: o título é curto e ganha em
            * ocupar a largura; o parágrafo precisa da medida curta para ser
            * lido. Só o corpo do artigo usa os 66ch exatos — aqui a linha é
            * uma só e a restrição serve para não atravessar a tela larga.
            *
            * A serifa itálica no fim é a assinatura do site (ver o hero da
            * landing). Duas ou três palavras, nunca a frase toda: acima disso
            * ela deixa de ser destaque e vira o tom da página. */}
          <p className="max-w-2xl text-[19px] leading-relaxed text-ink-2">
            {indice.lead}{' '}
            <span className="font-serif text-[21px] italic text-ink">{indice.leadDestaque}</span>
          </p>
        </header>

        {posts.length === 0 ? (
          <p className="mt-16 text-[19px] text-ink-2">{indice.vazio}</p>
        ) : (
          // `<ol>` e não `<ul>`: a ordem é informação — do mais recente para o
          // mais antigo — e não um acaso de layout.
          // O PRIMEIRO ARTIGO TEM PESO PRÓPRIO, e a razão vem da pesquisa de
          // 2026: o traço comum dos sites premiados é hierarquia tipográfica
          // nítida — dá para distinguir título, apoio e corpo num golpe de
          // vista. Cinco artigos com exatamente o mesmo peso não são uma
          // hierarquia, são uma lista de arquivo, e a página lia como índice de
          // pasta em vez de publicação.
          //
          // O destaque é só ESCALA e ar, sem imagem e sem caixa. "Tipografia
          // como imagem-herói" é o outro achado da pesquisa, e é o único
          // recurso disponível enquanto as capas não existem — o que também
          // significa que o destaque não quebra quando elas chegarem.
          <ol className="mt-10 flex flex-col">
            {posts.map((post, i) => (
              <li key={post.slug} className={i === 0 ? '' : 'border-t border-rule'}>
                {/* O CARD INTEIRO É O LINK, e aqui isso é o certo — ao
                  * contrário da seção de prova da landing, onde o achado I6
                  * proibia card clicável. Lá o card carregava três blocos de
                  * conteúdo e o clique competia com eles; aqui o card É a
                  * entrada de um índice, e o alvo grande é o que se espera de
                  * uma lista de artigos.
                  *
                  * `group` liga o hover do título ao card inteiro sem
                  * JavaScript. */}
                <Link
                  prefetch={false}
                  href={`/${LOCALE_DO_BLOG}/blog/${post.slug}`}
                  // O DESTAQUE EMPILHA (capa larga em cima), OS DEMAIS DEITAM
                  // (miniatura ao lado). Duas formas do mesmo card, e a razão é
                  // de ritmo: cinco capas do mesmo tamanho viram catálogo de
                  // produto, e o índice deixa de ter um começo.
                  //
                  // No celular tudo empilha: miniatura ao lado de texto em
                  // 390px de largura não sobra espaço para nenhum dos dois.
                  className={`group flex gap-5 transition-opacity hover:opacity-90 ${
                    i === 0 ? 'flex-col pb-12' : 'flex-col py-8 sm:flex-row sm:gap-7'
                  }`}
                >
                  {post.meta.capa && (
                    // `order-first` no destaque para a capa vir ANTES da linha
                    // de data; nos demais ela é a coluna da esquerda.
                    //
                    // `loading="lazy"` em todas menos a primeira: a capa do
                    // destaque está na dobra e adiá-la só atrasaria o que o
                    // leitor já está vendo.
                    <img
                      src={arquivoPublico(post.meta.capa.src)}
                      alt=""
                      width={post.meta.capa.largura}
                      height={post.meta.capa.altura}
                      loading={i === 0 ? 'eager' : 'lazy'}
                      decoding="async"
                      // `alt=""` de propósito: a imagem está DENTRO do link
                      // que já carrega o título do artigo como texto
                      // acessível. Descrevê-la aqui faria o leitor de tela
                      // anunciar a mesma entrada duas vezes.
                      // `aspect-[2/1]` NO DESTAQUE, e não a proporção nativa da
                      // foto. Em 16:9 a capa ocupava ~550px de altura e, com
                      // título e chamada, o primeiro artigo comia a tela
                      // inteira — os outros quatro nasciam abaixo da dobra num
                      // índice de cinco. O recorte 2:1 é proporção de banner
                      // editorial: continua dominante, devolve ~90px e traz o
                      // segundo artigo para dentro do campo de visão.
                      //
                      // `object-cover` recorta em cima e embaixo mantendo o
                      // centro, que é onde o assunto da foto costuma estar.
                      // `max-h-[40dvh]` JUNTO COM a proporção, e é ele que
                      // conserta o defeito que a proporção sozinha tem:
                      // `aspect-[2/1]` responde à LARGURA e ignora a altura da
                      // janela. Numa tela de 669px de altura a capa ficava com
                      // 488px e enchia quase tudo; numa de 1080px o mesmo
                      // cálculo fica confortável. A proporção manda enquanto
                      // couber, e o teto assume quando a janela é baixa.
                      //
                      // `dvh` e não `vh`: no celular a barra do navegador
                      // aparece e some, e `vh` congela na altura maior — a
                      // imagem estouraria a tela justamente quando a barra
                      // está visível.
                      className={
                        i === 0
                          // `aspect-[3/2]` no celular e `2/1` a partir de `sm`.
                          // Lá a restrição é a LARGURA, não a altura: 2:1 sobre
                          // 342px dá uma faixa de 171px, curta demais para
                          // funcionar como capa. 3:2 devolve 228px sem empurrar
                          // o título para fora da tela.
                          ? 'aspect-[3/2] max-h-[40dvh] w-full rounded-lg border border-rule object-cover sm:aspect-[2/1]'
                          : 'w-full shrink-0 rounded-md border border-rule object-cover sm:h-28 sm:w-48'
                      }
                    />
                  )}
                  <div className="flex min-w-0 flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-[0.15em] text-ink-2">
                    {i === 0 && (
                      <>
                        <span className="text-accent">{indice.destaque}</span>
                        <span aria-hidden="true">·</span>
                      </>
                    )}
                    <time dateTime={post.meta.publicado}>{dataLonga(post.meta.publicado)}</time>
                    <span aria-hidden="true">·</span>
                    <span>
                      {minutosDeLeitura(post.slug)} {blogTextos.post.minutos}
                    </span>
                  </div>
                  <h2
                    className={`max-w-3xl font-sans font-bold leading-[1.08] tracking-tight text-ink underline decoration-transparent decoration-2 underline-offset-4 transition-colors group-hover:decoration-accent ${
                      // O salto de escala é o destaque inteiro. Um degrau só
                      // não separa; dois degraus separam sem virar outra página.
                      i === 0 ? 'text-3xl sm:text-[2.75rem]' : 'text-2xl sm:text-3xl'
                    }`}
                  >
                    {post.meta.titulo}
                  </h2>
                  {/* A CHAMADA DO DESTAQUE VAI EM SERIFA, e é a mesma decisão
                    * editorial do topo dos artigos: em texto longo a serifa
                    * sinaliza matéria, não interface. Só o primeiro — se todos
                    * levassem, a serifa deixaria de marcar coisa alguma. */}
                  <p
                    className={
                      i === 0
                        ? 'max-w-2xl font-serif text-[21px] italic leading-relaxed text-ink-2 sm:text-[23px]'
                        : 'max-w-2xl text-[17px] leading-relaxed text-ink-2'
                    }
                  >
                    {post.meta.descricao}
                  </p>
                  {post.meta.tags.length > 0 && (
                    <ul className="mt-1 flex flex-wrap gap-2">
                      {post.meta.tags.map((tag) => (
                        <li
                          key={tag}
                          className="rounded-full border border-rule px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-2"
                        >
                          {tag}
                        </li>
                      ))}
                    </ul>
                  )}
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>
    </>
  )
}
