import Link from 'next/link'
import type { Dictionary, Locale } from '@/content'
import { blogTextos } from '@/content/blog-textos'
import { LOCALE_DO_BLOG } from '@/content/posts'

/**
 * `locale` DEIXOU DE SER DECORATIVO. O comentário que estava aqui dizia que ele
 * entrava só para manter a assinatura simétrica com a do `Header`, sem uso — o
 * link do blog é o primeiro conteúdo deste rodapé que varia por idioma de fato.
 *
 * O BLOG PRECISA DE UM LINK VINDO DO SITE, e não é detalhe de navegação: sem
 * ele o blog nasce órfão. Nenhuma página apontaria para lá, o rastreador só
 * chegaria pelo sitemap, e as URLs novas não receberiam nada da autoridade que
 * a home e os cases já acumularam. É exatamente o defeito que a auditoria de
 * 2026-09-04 mediu na landing — cinco links, quatro deles saindo do site — e
 * seria esquisito repetir o erro na semana seguinte.
 *
 * Rodapé e não menu do topo: o blog é destino de quem já está lendo, não a
 * primeira decisão de quem chega. E SÓ no português, porque é só nele que a
 * rota existe — item de menu apontando para 404 é pior que menu sem o item.
 */
export function Footer({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-3 px-6 py-10 font-mono text-[11px] text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>{dict.footer.rights}</p>
        {locale === LOCALE_DO_BLOG && (
          <Link
            prefetch={false}
            href={`/${LOCALE_DO_BLOG}/blog`}
            className="underline decoration-border underline-offset-4 hover:text-text"
          >
            {blogTextos.chrome.paraBlog}
          </Link>
        )}
        <p>{dict.footer.builtWith}</p>
        <a
          href={dict.footer.sourceCodeUrl}
          target="_blank"
          rel="noreferrer"
          className="underline decoration-border underline-offset-4 hover:text-text"
        >
          {dict.footer.sourceCode}
        </a>
      </div>
    </footer>
  )
}
