import type { Metadata } from 'next'
import Link from 'next/link'
import { blogTextos } from '@/content/blog-textos'
import { LOCALE_DO_BLOG, todosOsPosts } from '@/content/posts'
import { minutosDeLeitura } from '@/lib/leitura'
import { dataLonga } from '@/lib/datas'
import { buildMetadata } from '@/lib/seo'
import { blogJsonLd } from '@/lib/jsonld'

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

      <div className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-24">
        <header className="flex flex-col gap-4">
          <h1 className="font-sans text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            {indice.titulo}
          </h1>
          {/* `max-w-2xl` no lead e não no `<h1>`: o título é curto e ganha em
            * ocupar a largura; o parágrafo precisa da medida curta para ser
            * lido. Só o corpo do artigo usa os 66ch exatos — aqui a linha é
            * uma só e a restrição serve para não atravessar a tela larga. */}
          <p className="max-w-2xl text-[19px] leading-relaxed text-ink-2">{indice.lead}</p>
        </header>

        {posts.length === 0 ? (
          <p className="mt-16 text-[19px] text-ink-2">{indice.vazio}</p>
        ) : (
          // `<ol>` e não `<ul>`: a ordem é informação — do mais recente para o
          // mais antigo — e não um acaso de layout.
          <ol className="mt-14 flex flex-col">
            {posts.map((post) => (
              <li key={post.slug} className="border-t border-rule">
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
                  className="group flex flex-col gap-3 py-8 transition-opacity hover:opacity-90"
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-[0.15em] text-ink-2">
                    <time dateTime={post.meta.publicado}>{dataLonga(post.meta.publicado)}</time>
                    <span aria-hidden="true">·</span>
                    <span>
                      {minutosDeLeitura(post.slug)} {blogTextos.post.minutos}
                    </span>
                  </div>
                  <h2 className="max-w-3xl font-sans text-2xl font-bold leading-tight tracking-tight text-ink underline decoration-transparent decoration-2 underline-offset-4 transition-colors group-hover:decoration-accent sm:text-3xl">
                    {post.meta.titulo}
                  </h2>
                  <p className="max-w-2xl text-[17px] leading-relaxed text-ink-2">
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
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>
    </>
  )
}
