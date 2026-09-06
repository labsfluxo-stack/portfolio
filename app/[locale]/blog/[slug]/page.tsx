import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { blogTextos } from '@/content/blog-textos'
import { LOCALE_DO_BLOG, POST_SLUGS, postPorSlug, todosOsPosts } from '@/content/posts'
import { BotaoWhatsapp } from '@/components/landing/Botao'
import { Indice } from '@/components/blog/Indice'
import { pt } from '@/content/pt'
import { dataLonga } from '@/lib/datas'
import { minutosDeLeitura, titulosDoPost } from '@/lib/leitura'
import { buildMetadata } from '@/lib/seo'
import { postJsonLd } from '@/lib/jsonld'

export const dynamicParams = false

export function generateStaticParams() {
  return POST_SLUGS.map((slug) => ({ locale: LOCALE_DO_BLOG, slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = postPorSlug(slug)
  if (!post) return {}

  return buildMetadata(LOCALE_DO_BLOG, {
    title: post.meta.titulo,
    description: post.meta.descricao,
    path: `/blog/${slug}`,
    // Cai na OG da home enquanto não houver uma por artigo. É honesto: o cartão
    // mostra a marca em vez de mentir sobre o conteúdo, e nunca aponta para um
    // arquivo que não existe — que era o defeito a evitar.
    ogImage: `/og/${LOCALE_DO_BLOG}-home.png`,
    imageAlt: post.meta.titulo,
    monolingue: true,
  })
}

export default async function PaginaDoPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = postPorSlug(slug)
  // `dynamicParams = false` já impede uma rota fora de `POST_SLUGS` de existir
  // no build. Isto é a rede de baixo, e principalmente é o que estreita o tipo
  // de `post` para o resto da função.
  if (!post) notFound()

  const { Corpo, meta } = post
  const textos = blogTextos.post
  const titulos = titulosDoPost(slug)
  const minutos = minutosDeLeitura(slug)

  const ordem = todosOsPosts()
  const indiceAtual = ordem.findIndex((p) => p.slug === slug)
  // A lista vem do mais NOVO para o mais velho, então "próximo" (mais recente)
  // é o índice anterior. Trocar os dois é o erro clássico aqui, e ele passa
  // despercebido enquanto houver só dois artigos.
  const maisNovo = ordem[indiceAtual - 1]
  const maisVelho = ordem[indiceAtual + 1]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(postJsonLd(post, minutos)) }}
      />

      <div className="mx-auto w-full max-w-5xl px-6 py-14 sm:py-20">
        {/* DUAS COLUNAS a partir de `lg`, e a do artigo NÃO é fluida: ela tem
          * medida fixa. O alvo é 66 caracteres por linha — o ponto ótimo da
          * pesquisa de legibilidade, dentro da faixa de 50 a 75 —, e é a única
          * medida desta página que não se negocia por estética: linha longa
          * demais faz o olho perder o começo da seguinte, que é o que cansa em
          * texto longo.
          *
          * `60ch` E NÃO `66ch`, e a diferença foi MEDIDA no navegador, não
          * deduzida. A unidade `ch` vale a largura do glifo "0", que é mais
          * largo que a média das minúsculas — então `66ch` renderizou 72
          * caracteres por linha de fato, no topo da faixa em vez do centro
          * dela. `60ch` cai em ~66 reais. A recomendação é sobre caracteres na
          * linha, não sobre o número que se escreve na unidade.
          *
          * A coluna do índice é fixa em `14rem` e some abaixo de `lg`. */}
        <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:gap-16">
          <article className="min-w-0 flex-1">
            <header className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-[0.15em] text-ink-2">
                <time dateTime={meta.publicado}>{dataLonga(meta.publicado)}</time>
                <span aria-hidden="true">·</span>
                <span>
                  {minutos} {textos.minutos}
                </span>
              </div>
              <h1 className="max-w-[20ch] text-balance font-sans text-4xl font-bold leading-[1.1] tracking-tight text-ink sm:text-5xl">
                {meta.titulo}
              </h1>
              <p className="max-w-[60ch] text-[21px] leading-relaxed text-ink-2">
                {meta.descricao}
              </p>
              {meta.atualizado && meta.atualizado !== meta.publicado && (
                // Só aparece quando houve revisão de fato. Um "atualizado em"
                // que repete a data de publicação é ruído que finge frescor.
                <p className="text-[14px] text-ink-2">
                  {textos.atualizadoEm}{' '}
                  <time dateTime={meta.atualizado}>{dataLonga(meta.atualizado)}</time>
                </p>
              )}
            </header>

            <div className="mt-12 max-w-[60ch]">
              <Corpo />
            </div>

            {/* A saída comercial do artigo. Vem depois do texto inteiro, nunca
              * no meio: quem chegou até aqui leu o argumento, e interromper a
              * leitura para vender é o que faz blog de empresa não ser lido. */}
            <aside className="mt-20 max-w-[60ch] rounded-lg border border-rule p-7">
              <p className="font-sans text-xl font-bold tracking-tight text-ink">
                {blogTextos.cta.titulo}
              </p>
              <p className="mt-2 text-[17px] leading-relaxed text-ink-2">{blogTextos.cta.corpo}</p>
              <div className="mt-5">
                <BotaoWhatsapp
                  numero={pt.contact.whatsapp}
                  mensagem={blogTextos.cta.mensagem}
                  variante="texto"
                >
                  {blogTextos.cta.botao}
                </BotaoWhatsapp>
              </div>
            </aside>

            <nav
              aria-label={textos.voltar}
              className="mt-14 flex flex-col gap-6 border-t border-rule pt-8 sm:flex-row sm:justify-between"
            >
              {maisVelho ? (
                <Link
                  prefetch={false}
                  href={`/${LOCALE_DO_BLOG}/blog/${maisVelho.slug}`}
                  className="group flex max-w-xs flex-col gap-1"
                >
                  <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-2">
                    {textos.anterior}
                  </span>
                  <span className="text-[17px] font-semibold text-ink group-hover:text-accent">
                    {maisVelho.meta.titulo}
                  </span>
                </Link>
              ) : (
                <span />
              )}
              {maisNovo && (
                <Link
                  prefetch={false}
                  href={`/${LOCALE_DO_BLOG}/blog/${maisNovo.slug}`}
                  className="group flex max-w-xs flex-col gap-1 sm:text-right"
                >
                  <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-2">
                    {textos.proximo}
                  </span>
                  <span className="text-[17px] font-semibold text-ink group-hover:text-accent">
                    {maisNovo.meta.titulo}
                  </span>
                </Link>
              )}
            </nav>

            <Link
              prefetch={false}
              href={`/${LOCALE_DO_BLOG}/blog`}
              className="mt-10 inline-block text-[15px] font-semibold text-accent"
            >
              {textos.voltar}
            </Link>
          </article>

          {/* `order-first lg:order-none` não entra aqui de propósito: no
            * celular o índice não é renderizado (ver Indice.tsx), então não há
            * ordem para inverter. */}
          <div className="lg:w-56 lg:shrink-0">
            <Indice itens={titulos} titulo={textos.indiceTitulo} />
          </div>
        </div>
      </div>
    </>
  )
}
