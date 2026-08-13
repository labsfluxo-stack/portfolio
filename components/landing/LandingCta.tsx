import type { Dictionary } from '@/content/types'
import { urlWhatsapp } from './whatsapp'

/**
 * SEGUNDA e última faixa escura da página (a primeira é Dupla).
 *
 * O microtexto sob o botão não é enfeite. O medo de quem clica num CTA de
 * serviço não é o preço — é ser perseguido por vendedor. Dizer o que acontece
 * do outro lado provavelmente faz mais pelo clique do que a palavra escolhida
 * para o botão, sobre a qual, aliás, não existe evidência: a literatura
 * inteira de texto de CTA se apoia num único teste de 2013 jamais replicado.
 *
 * `cta.tranquilizador` tem CINCO palavras ("Sem ligação e sem cadastro.") —
 * passa longe do teto de 1–3 palavras que libera rótulo mono abaixo de 17px.
 * É corpo de texto, não etiqueta: mesmo tratamento de `dupla.corpo` em
 * Dupla.tsx (`text-[17px] leading-relaxed text-muted`), sem caixa-alta nem
 * tracking — essa combinação é o pior caso de legibilidade que existe.
 */
export function LandingCta({ dict }: { dict: Dictionary }) {
  const { fechamento, cta } = dict.landing

  return (
    <section className="bg-ink text-paper">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-20 sm:py-24">
        <div className="flex flex-col gap-3">
          <h2 className="font-sans text-3xl font-bold tracking-tight sm:text-4xl">
            {fechamento.titulo}
          </h2>
          <p className="max-w-xl text-[19px] leading-relaxed text-muted">{fechamento.corpo}</p>
        </div>
        <div className="flex flex-col gap-3">
          <a
            href={urlWhatsapp(dict.contact.whatsapp, cta.mensagem)}
            className="inline-flex w-fit items-center gap-2 rounded-md bg-paper px-6 py-3.5 text-[17px] font-semibold text-ink transition-opacity hover:opacity-90"
          >
            {cta.rotulo}
          </a>
          <p className="text-[17px] leading-relaxed text-muted">{cta.tranquilizador}</p>
        </div>
      </div>
    </section>
  )
}
