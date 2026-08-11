// `Locale` não entra na importação: diferente das rotas irmãs (cv, og), este
// layout não lê `params` — não precisa do locale para nada — e importar o
// tipo sem usá-lo reprova `@typescript-eslint/no-unused-vars` (`npm run lint`).
import { locales } from '@/content'

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

/**
 * Vive FORA do route group `(site)`, junto de `cv` e `og`: sem Header, Footer
 * nem SkipLink. Numa landing todo item de menu é uma saída, e o formato existe
 * justamente para não oferecer nenhuma além do CTA.
 *
 * A INVERSÃO DE POLARIDADE ACONTECE AQUI, e são duas coisas, não uma.
 *
 * `globals.css` pinta `body { background: var(--color-bg) }` e marca
 * `html { color-scheme: dark }`. Trocar só o fundo deixa o navegador
 * desenhando barra de rolagem, campo de formulário e menu de contexto em tema
 * escuro sobre uma página clara — defeito que não aparece em teste de unidade,
 * só no navegador.
 *
 * `html body` (especificidade 0,0,2) vence `body` (0,0,1) sem depender da
 * ordem em que o Next insere a regra e sem `!important`. Mesma solução já
 * aplicada em app/[locale]/cv/page.tsx.
 *
 * Fica na rota, e não em globals.css, porque o escuro está certo em todo o
 * resto do site.
 */
export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{'html{color-scheme:light}html body{background:#F5F3EF;color:#08090C}'}</style>
      <main id="conteudo">{children}</main>
    </>
  )
}
