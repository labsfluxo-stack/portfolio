import type { Dictionary, Locale } from '@/content/types'
import { systems } from '@/content/systems'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { PorticoSlot } from '@/components/three/PorticoSlot'

/**
 * O <h1> da página — único, per contrato do spec (§5.2). O `page.tsx`
 * anterior tinha um <h1> provisório; este componente o substitui.
 *
 * `data-portico-slot` é o contêiner atrás do texto, sem capturar clique
 * (`pointer-events-none`), com o pórtico que monta os sistemas do dono, um
 * por vez, em rotação: a cena WebGL quando o navegador aguenta, ou a elevação
 * técnica em SVG quando não (`PorticoSlot` decide).
 *
 * A cena recebe `content/systems.ts` DIRETO, e não o dicionário: as
 * tecnologias estampadas nos contêineres são as mesmas `system.stack[]` da
 * seção Sistemas, e não são conteúdo traduzível — "PostgreSQL" é PostgreSQL
 * nos dois idiomas. A cena não inventa texto nenhum, e nada aqui é escrito à
 * mão. O `<h1>` e o resto continuam vivendo em HTML puro, sem depender da
 * cena para nada: ela é decoração, `aria-hidden` de ponta a ponta.
 */
export function Hero({ dict }: { dict: Dictionary; locale: Locale }) {
  const { hero } = dict

  return (
    <section
      id="hero"
      aria-labelledby="hero-heading"
      // Mesmo tratamento de Section.tsx (scroll-mt-24): o Hero não usa o
      // primitivo, mas fica sob o mesmo <header> sticky e precisa da mesma
      // margem de rolagem para qualquer link de âncora que aponte para cá.
      className="relative scroll-mt-24 overflow-hidden"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-20 sm:py-28 md:py-32">
        <StatusBadge status="ok" label={hero.availability} />
        <div className="flex flex-col gap-4">
          <h1
            id="hero-heading"
            className="font-sans text-6xl font-bold leading-[1.05] tracking-tight text-text sm:text-7xl"
          >
            {hero.name}
          </h1>
          <p className="font-mono text-sm uppercase tracking-[0.2em] text-muted sm:text-base">{hero.role}</p>
        </div>
        {/* `text-balance` porque a tagline passou a ocupar mais de uma
         * linha: sem ele o navegador enche a primeira linha até o limite e
         * joga o resto para a segunda, o que deixava "em produção contínua"
         * sozinho no desktop e a palavra "contínua" órfã no celular.
         * `text-wrap: balance` distribui as linhas em comprimentos
         * parecidos, que é o tratamento certo para título curto — e o
         * navegador que não suporta simplesmente quebra como antes. */}
        <p className="max-w-2xl text-balance text-lg leading-relaxed text-muted sm:text-xl">{hero.tagline}</p>

        {/* A CENA MUDA DE PAPEL NO BREAKPOINT, e é isso que conserta o
         * celular.
         *
         * A partir de `md` ela é FUNDO: absoluta, na metade direita, atrás
         * do texto. Ocupando a largura inteira, a máquina cruzava o badge e
         * o nome e lia como acidente em vez de composição.
         *
         * Abaixo de `md` ela é BLOCO, em fluxo, depois do texto e com
         * moldura própria. Era fundo também ali, a 40% de opacidade e atrás
         * das palavras — e um desenho técnico detalhado nessa condição não é
         * arte legível nem textura discreta: é ruído. Sem largura para os
         * dois lado a lado, a saída não é sobrepor com menos opacidade, é
         * empilhar e dar espaço próprio a cada um.
         *
         * Por isso ela vem DEPOIS do texto no DOM: no celular a ordem visual
         * é a ordem do documento, e a partir de `md` o `absolute` a tira do
         * fluxo e a posição no HTML deixa de importar.
         *
         * A máscara também é só de `md` para cima, como variante e não como
         * `style` embutido: ela existe para apagar o brilho rasante do
         * refletor onde a cena encosta na coluna de texto, e num bloco com
         * moldura ela só comeria a borda esquerda. Sete por cento são ~50px
         * num painel de 720, curto demais para alcançar a viga. */}
        <div
          data-portico-slot
          aria-hidden="true"
          className="relative -mx-6 aspect-[300/230] border-y border-border bg-bg px-5 py-6
            md:pointer-events-none md:absolute md:inset-y-0 md:left-1/2 md:right-0 md:-z-10 md:m-0 md:aspect-auto md:w-1/2 md:border-0 md:p-0
            md:[-webkit-mask-image:linear-gradient(to_right,transparent_0%,black_7%)] md:[mask-image:linear-gradient(to_right,transparent_0%,black_7%)]"
        >
          <PorticoSlot systems={systems} />
        </div>

        <p aria-hidden="true" className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted md:mt-16">
          {hero.scrollHint}
        </p>
      </div>
    </section>
  )
}
