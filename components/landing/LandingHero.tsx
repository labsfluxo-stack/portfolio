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
        {/* `target="_blank" rel="noreferrer"`, igual a Contact.tsx para a
         * MESMA URL de wa.me — sem isso, no desktop o clique navega a aba
         * inteira para fora e a landing desaparece; no navegador embutido do
         * Instagram (fonte de tráfego que o spec cita), sem stack de "voltar"
         * confiável, a troca de aba pode encerrar a sessão de vez (achado I3
         * Important da revisão final de branch). */}
        <a
          href={urlWhatsapp(dict.contact.whatsapp, cta.mensagem)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-fit items-center gap-2 rounded-md bg-ink px-6 py-3.5 text-[17px] font-semibold text-paper transition-opacity hover:opacity-90"
        >
          {cta.rotulo}
        </a>
        {/* Corpo, não rótulo: onze palavras em duas frases, não 1–3 palavras
         * de etiqueta — a regra global de 17px mínimo vale aqui (o brief
         * original botou isto em mono/caixa-alta/12px e passou por cima da
         * própria regra; decisão do dono: 17px vence).
         *
         * A frase carrega o diferencial mais forte que a pesquisa achou: a
         * dupla é a única configuração que neutraliza as duas objeções do
         * mercado — agência cobra estrutura que não escreve seu código,
         * freelancer sozinho é ponto único de falha. A pesquisa mandou pôr
         * isso na dobra; formatado pequeno e em caixa alta, ficava
         * enterrado. Caixa alta com tracking é o pior caso de legibilidade,
         * e 12px no celular sob sol é exatamente o que inverter a polaridade
         * do tema queria consertar. */}
        <p className="text-[17px] leading-relaxed text-ink-2">{hero.assinatura}</p>
      </div>
    </section>
  )
}
