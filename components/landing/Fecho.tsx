import type { Dictionary } from '@/content/types'
import { urlWhatsapp } from './whatsapp'

/**
 * O fecho da página, depois do FAQ.
 *
 * Existe porque a página TERMINAVA EM ACORDEÃO FECHADO: depois da faixa de CTA
 * vinha o bloco de perguntas, e acabava. A última coisa que o visitante via
 * eram três barras cinzas sem conteúdo aberto — a página parava em vez de
 * fechar.
 *
 * É curto de propósito. Quem chegou até aqui já leu tudo: repetir argumento
 * seria insistência, e o que falta é só a porta. Uma linha e o botão.
 *
 * TERCEIRA FAIXA ESCURA, e é a exceção deliberada à regra de duas. As duas
 * originais (`Dupla` e `LandingCta`) pontuavam o meio; esta encerra. Sem ela a
 * página termina no mesmo tom claro em que passou 80% do tempo, e nada avisa
 * ao olho que chegou ao fim.
 */
export function Fecho({ dict }: { dict: Dictionary }) {
  const { fecho, cta } = dict.landing

  return (
    <section className="bg-ink text-paper">
      <div className="mx-auto flex w-full max-w-4xl flex-col items-start gap-5 px-6 py-14">
        <p className="max-w-xl text-balance font-sans text-2xl font-bold tracking-tight sm:text-3xl">
          {fecho}
        </p>
        <a
          href={urlWhatsapp(dict.contact.whatsapp, cta.mensagem)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-12 w-fit items-center rounded-md bg-paper px-6 text-[17px] font-semibold text-ink transition-opacity hover:opacity-90"
        >
          {cta.rotulo}
        </a>
      </div>
    </section>
  )
}
