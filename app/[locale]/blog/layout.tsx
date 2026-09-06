import Link from 'next/link'
import { blogTextos } from '@/content/blog-textos'
import { LOCALE_DO_BLOG } from '@/content/posts'
import { AlternadorTema } from '@/components/blog/AlternadorTema'
import { SCRIPT_TEMA } from '@/components/blog/tema'
import { arquivoPublico } from '@/lib/seo'

/**
 * SÓ `pt`. O blog não sai em inglês (ver content/posts.ts), e é aqui que essa
 * decisão vira rota: com `dynamicParams = false` herdado do layout de locale,
 * emitir só `pt` faz `/en/blog/` simplesmente não existir no build — em vez de
 * existir vazio, que é o resultado de esquecer isto.
 */
export const dynamicParams = false

export function generateStaticParams() {
  return [{ locale: LOCALE_DO_BLOG }]
}

/**
 * O blog vive FORA do route group `(site)`, ao lado de `projetos`, `cv` e `og`.
 *
 * O `(site)` traz Header, Footer e a textura de fundo — cromo desenhado para o
 * polo escuro do portfólio. O blog tem polaridade própria e trocável pelo
 * leitor, então herdar aquele cromo significaria brigar com ele em toda troca
 * de tema. Aqui o cromo é mínimo e usa os mesmos tokens que o tema inverte.
 *
 * LANDMARKS COMPLETOS, e desta vez de verdade. Na auditoria da landing eu
 * recomendei `header`+`nav`+`footer` e descartei dois dos três: aquela página
 * não tem topo nem navegação, e landmark vazio promete uma região e entrega
 * nada. Um blog tem os três de fato — há para onde navegar, e o rodapé carrega
 * links próprios.
 */
export default function BlogLayout({ children }: { children: React.ReactNode }) {
  const { chrome } = blogTextos
  const base = `/${LOCALE_DO_BLOG}`

  return (
    <>
      {/* PRIMEIRA COISA DENTRO DO BODY, e a posição é o recurso.
        *
        * Este script roda de forma síncrona enquanto o HTML ainda é lido, antes
        * de qualquer conteúdo do blog ser analisado — então `data-tema` já está
        * no `<html>` quando o navegador pinta o primeiro pixel. Movido para
        * depois do conteúdo, ou para dentro de um efeito do React, a página
        * abriria no tema padrão e trocaria depois: o flash branco que o leitor
        * de tema escuro leva na cara a cada navegação.
        *
        * Ver components/blog/tema.ts para a precedência e para o porquê do
        * try/catch. */}
      <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />

      {/* O fio de progresso da rolagem — o mesmo `.fio-progresso` da landing
        * (app/globals.css), que é puro CSS com `animation-timeline: scroll()`.
        * Num artigo longo ele responde "quanto ainda falta", que é a pergunta
        * que faz o leitor desistir quando não tem resposta. Sem suporte no
        * navegador ele fica em `scaleX(0)`: invisível, e nada quebra. */}
      <div aria-hidden="true" className="fio-progresso fixed inset-x-0 top-0 z-50 h-0.5 bg-accent" />

      <div className="flex min-h-dvh flex-col bg-paper text-ink">
        <header className="border-b border-rule">
          <nav
            aria-label={chrome.navTopo}
            className="mx-auto flex w-full max-w-5xl items-center gap-6 px-6 py-4"
          >
            <Link
              prefetch={false}
              href={base}
              className="font-sans text-[15px] font-semibold tracking-tight text-ink"
            >
              {chrome.paraHome}
            </Link>
            <Link
              prefetch={false}
              href={`${base}/blog`}
              className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-2 transition-colors hover:text-ink"
            >
              {chrome.paraBlog}
            </Link>
            {/* `ml-auto` empurra o alternador para a borda: ele é ferramenta de
              * leitura, não item de navegação, e não deve competir com os
              * links pelo mesmo agrupamento visual. */}
            <div className="ml-auto">
              <AlternadorTema />
            </div>
          </nav>
        </header>

        <main id="conteudo" className="flex-1">
          {children}
        </main>

        <footer className="mt-24 border-t border-rule">
          <nav
            aria-label={chrome.navRodape}
            className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-8 text-[15px]"
          >
            <Link prefetch={false} href={base} className="text-ink-2 transition-colors hover:text-ink">
              {chrome.paraHome}
            </Link>
            <Link
              prefetch={false}
              href={`${base}/projetos`}
              className="text-ink-2 transition-colors hover:text-ink"
            >
              {chrome.paraProjetos}
            </Link>
            {/* O feed é o sinal de "isto publica de verdade" para leitor de RSS
              * e para agregador — e é `<a>`, não `<Link>`, porque o destino é
              * um arquivo estático gerado fora do roteador do Next. */}
            <a
              href={arquivoPublico('/feed.xml')}
              className="ml-auto font-mono text-[11px] uppercase tracking-[0.15em] text-ink-2 transition-colors hover:text-ink"
            >
              RSS
            </a>
          </nav>
        </footer>
      </div>
    </>
  )
}
