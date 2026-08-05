import './globals.css'

/**
 * `app/layout.tsx` devolve `children` puro -- o `<html>`/`<body>` de
 * verdade vivem em `app/[locale]/layout.tsx`, porque o atributo `lang`
 * precisa variar por idioma. O not-found global do Next renderiza FORA do
 * segmento `[locale]` (não há como saber que idioma o visitante queria, nem
 * dado pra chamar `getDictionary`), então cai direto no root layout -- que
 * não fornece invólucro nenhum. Sem este arquivo, `out/404.html` nascia sem
 * `<!DOCTYPE>`/`<html>`/`<head>`/`<body>` de abertura, só o texto padrão do
 * Next em inglês: no GitHub Pages, é a página que qualquer URL errada sob
 * `/portfolio/` resolve, e para um portfólio pode ser a única página que um
 * visitante vê.
 *
 * Por viver fora de `[locale]`, este é o único lugar do projeto onde texto
 * de interface hardcoded é inevitável -- mantido mínimo e bilíngue numa
 * frase só, sem inventar uma terceira fonte de verdade para o dicionário.
 *
 * Sem `export const metadata` de propósito: o Next já injeta
 * `<meta name="robots" content="noindex">` sozinho para o boundary especial
 * `_not-found` (verificado no `out/404.html` gerado, antes mesmo deste
 * arquivo existir) -- declarar de novo só duplicaria a tag.
 */
export default function NotFound() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '/portfolio'

  return (
    <html lang="pt-BR">
      <body className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg px-6 text-center text-text">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">404</p>
        <p className="text-lg">Página não encontrada / Page not found.</p>
        <a
          href={`${basePath}/pt/`}
          className="border border-border px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-text hover:bg-surface"
        >
          Voltar para o início / Back to home
        </a>
      </body>
    </html>
  )
}
