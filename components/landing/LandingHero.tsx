import type { Dictionary } from '@/content/types'
import { urlWhatsapp } from './whatsapp'

/**
 * Primeira dobra. Precisa passar o teste que o NN/g mostrou que a maioria dos
 * sites B2B reprova: *o que essa empresa faz, e isso é para mim?*
 *
 * Sem preço aqui, de propósito (spec §4.1). Das páginas brasileiras que
 * publicam piso, nenhuma o coloca na dobra — o piso qualifica DEPOIS de
 * convencer. Antes disso ele só filtra.
 */
export function LandingHero({ dict }: { dict: Dictionary }) {
  const { hero, cta } = dict.landing

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-20 sm:py-28">
      <div className="flex flex-col gap-5">
        <h1 className="text-balance font-sans text-4xl font-bold leading-[1.1] tracking-tight text-ink sm:text-6xl">
          {hero.titulo}
        </h1>
        <p className="max-w-2xl text-balance text-[19px] leading-relaxed text-ink-2 sm:text-xl">
          {hero.subtitulo}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <a
          href={urlWhatsapp(dict.contact.whatsapp, cta.mensagem)}
          className="inline-flex w-fit items-center gap-2 rounded-md bg-ink px-6 py-3.5 text-[17px] font-semibold text-paper transition-opacity hover:opacity-90"
        >
          {cta.rotulo}
        </a>
        <p className="font-mono text-xs uppercase tracking-[0.15em] text-ink-2">
          {hero.assinatura}
        </p>
      </div>
    </section>
  )
}
