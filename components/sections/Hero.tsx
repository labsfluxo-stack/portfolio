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
      {/* Confinada à metade direita a partir de `md`. Ocupando a largura
          inteira, a máquina cruzava o badge de disponibilidade e o bloco do
          nome — lia como acidente, não como composição. Abaixo de `md` a cena
          vira a elevação em SVG e fica bem apagada, para não competir com o
          texto na largura onde não há espaço para os dois.

          A borda do canvas NÃO é resolvida aqui. Ela foi, e estava errada: uma
          máscara de gradiente de 26 % à esquerda e 14 % embaixo apagava o
          retângulo e, junto com ele, a geometria — a viga da ponte dissolvia no
          meio do vão, e o hero lia como "a imagem está sendo apagada" em vez de
          "o espaço continua no escuro". Quem acaba num pátio é o CHÃO, e é o
          chão que passou a acabar: ver `SLAB`, em `portico-textures.ts`, o
          recorte da laje de concreto.

          O que sobrou de máscara é um véu de 7 % só na esquerda, e ele existe
          por um motivo medido: é ali que a cena encosta na coluna do texto, e
          mesmo com a laje recortada sobra o brilho rasante do refletor no
          concreto junto à borda. Sete por cento são 50 px num painel de 720 —
          curto demais para alcançar a viga, que hoje chega inteira até o corte.
          Embaixo não há mais máscara nenhuma. */}
      <div
        data-portico-slot
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 -z-10 w-full opacity-40 md:left-1/2 md:w-1/2 md:opacity-100"
        style={{
          maskImage: 'linear-gradient(to right, transparent 0%, black 7%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 7%)',
        }}
      >
        <PorticoSlot systems={systems} />
      </div>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-24 sm:py-32">
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
        <p aria-hidden="true" className="mt-16 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          {hero.scrollHint}
        </p>
      </div>
    </section>
  )
}
