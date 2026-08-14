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
 *
 * A MESMA REGRA SE APLICA AO ANEL DE FOCO. `app/globals.css` define
 * `:focus-visible { outline: 2px solid var(--color-text) }`, e `--color-text`
 * (`#F5F3EF`) é exatamente o FUNDO desta rota — contraste 1:1, foco de
 * teclado invisível na página inteira (achado I2 Important da revisão final
 * de branch: esta é a primeira página clara e interativa do site, e o
 * defeito só existe aqui). `html body :focus-visible` (especificidade 0,0,3)
 * vence a regra global sem `!important` e sem depender da ordem de inserção
 * das folhas de estilo, pelo mesmo motivo que `html body` já vence `body`
 * duas linhas abaixo.
 *

 * `pb-20 md:pb-0` (Task 10) É DESTE `<main>`, não de um `<div>` dentro da
 * página — de propósito. `BarraCta` é `position: fixed`, então não ocupa
 * espaço no fluxo do documento: um padding aplicado a qualquer elemento QUE
 * SEJA o último filho de `main` (ou que o contenha) sempre termina coincidindo
 * com o fim real do documento, e depois de `scrollTo(0, document.body.
 * scrollHeight)` o fim do documento sempre cai exatamente na borda inferior
 * da viewport — ou seja, o padding "some" matematicamente, não importa o
 * quanto se aumente. Só um padding no PRÓPRIO `main` (fora do que seus
 * filhos medem) cria a folga real entre o fim do conteúdo e o fim do
 * documento. Confirmado isolando o problema com um script à parte antes de
 * mover o padding para cá — ver tests/e2e/landing.spec.ts.
 */
export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>
        {'html{color-scheme:light}html body{background:#F5F3EF;color:#08090C}html body :focus-visible{outline-color:#08090C}'}
      </style>
      <main id="conteudo" className="pb-20 md:pb-0">
        {children}
      </main>
    </>
  )
}
