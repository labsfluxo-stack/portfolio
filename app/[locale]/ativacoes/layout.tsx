// `Locale` fica de fora do import pelo mesmo motivo de
// app/[locale]/projetos/layout.tsx: este layout não lê `params`, e importar o
// tipo sem usá-lo reprova `@typescript-eslint/no-unused-vars` no `npm run lint`.
import { locales } from '@/content'

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

/**
 * Vive FORA do route group `(site)`, junto de `projetos`, `cv` e `og`: sem
 * Header, Footer nem SkipLink. Numa landing todo item de menu é uma saída, e o
 * formato existe justamente para não oferecer nenhuma além do CTA.
 *
 * NÃO HÁ INVERSÃO DE POLARIDADE AQUI, e é a diferença desta rota para a
 * `/projetos`. Lá o layout precisa de um `<style>` reescrevendo `html body` e
 * `:focus-visible`, porque a página é clara sobre um site escuro. Esta é
 * escura como o resto: `globals.css` já pinta `body` com `--color-bg` e já
 * marca `color-scheme: dark`, e o anel de foco global (`--color-text`,
 * `#F5F3EF`) contrasta corretamente com ela. Copiar o bloco de inversão da
 * rota irmã seria introduzir um defeito, não seguir um padrão.
 *
 * `pb-20 md:pb-0` é DESTE `<main>`, não de um `<div>` dentro da página.
 * `BarraCta` é `position: fixed` e não ocupa espaço no fluxo: um padding
 * aplicado a qualquer elemento que SEJA (ou contenha) o último filho de `main`
 * coincide matematicamente com o fim do documento depois de rolar até o fundo,
 * e "some". Só um padding no próprio `main` cria a folga real. A medição
 * completa está no comentário de app/[locale]/projetos/layout.tsx.
 */
export default function AtivacoesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* FIO DE PROGRESSO — dois pixels de tinta e nenhum de JavaScript.
        * `animation-timeline: scroll()` (ver app/globals.css) liga a escala
        * horizontal do fio à barra de rolagem do documento. Sem suporte no
        * navegador ele fica em `scaleX(0)`: invisível, e nada quebra.
        *
        * Numa página longa sem menu, o visitante perde a noção de onde está e
        * de quanto ainda falta. O fio devolve essa noção sem devolver uma saída
        * junto.
        *
        * `aria-hidden` porque é duplicata visual de algo que o leitor de tela
        * já resolve pela navegação por região. */}
      <div
        aria-hidden="true"
        className="fio-progresso fixed inset-x-0 top-0 z-50 h-0.5 bg-data"
      />
      {/* GRÃO E VINHETA. Fundo preto chapado lê como ausência; com grão fino lê
        * como superfície. A classe já existe em `app/globals.css`
        * (`.textura-fundo`, um `feTurbulence` embutido como data URI) e hoje é
        * aplicada só no route group `(site)` — home e case studies, os dois
        * escuros.
        *
        * Ela ficou de fora da `/projetos` e do `/cv` DE PROPÓSITO: aquela tem
        * polaridade de papel e este é feito para impressão, e grão em qualquer
        * um dos dois seria defeito, não estilo. Esta rota é escura, então o
        * motivo da exclusão não se aplica — e é por isso que o teste que hoje
        * trava quatro casos passa a travar cinco (Step 6).
        *
        * `z-index: -10` a deixa atrás de tudo, inclusive do canvas da capa. */}
      <div className="textura-fundo" aria-hidden="true" />
      <main id="conteudo" className="pb-20 md:pb-0">
        {children}
      </main>
    </>
  )
}
