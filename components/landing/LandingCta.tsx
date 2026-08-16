import type { Dictionary } from '@/content/types'
import { BotaoWhatsapp } from './Botao'

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
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-20 sm:py-28">
        <div className="flex flex-col gap-3">
          <h2 className="revelar-titulo font-sans text-4xl font-bold tracking-tight sm:text-5xl">
            {fechamento.titulo}
          </h2>
          <p className="max-w-xl text-[19px] leading-relaxed text-muted">{fechamento.corpo}</p>
        </div>
        <div className="flex flex-col gap-3">
          {/* Ver LandingHero.tsx: mesmo `target="_blank" rel="noreferrer"`,
           * mesmo motivo — sem isto o clique leva a aba inteira embora. */}
          {/* BORDA VIVA (ver app/globals.css) — o "Border Beam" do Magic UI
            * reescrito em CSS puro: um cônico girando atrás de uma moldura de
            * 1px, recortado por `mask` para que só a moldura apareça.
            *
            * É O ÚNICO ELEMENTO DA PÁGINA COM MOVIMENTO INFINITO, e o limite é
            * o ponto. Espalhado por vários elementos, movimento perpétuo vira
            * ruído e passa de caro a barato — é o que separa uma página cara de
            * um catálogo de efeitos. Num só, ele diz para onde olhar, e aqui é
            * para onde o olho deve ir mesmo.
            *
            * Só nesta faixa escura: o feixe usa `--color-data`, que sobre
            * `#08090C` é o acento da casa e sobre o papel claro daria 1,93:1. */}
          <BotaoWhatsapp
            numero={dict.contact.whatsapp}
            mensagem={cta.mensagem}
            variante="claro"
            className="borda-viva"
          >
            {cta.rotulo}
          </BotaoWhatsapp>
          <p className="text-[17px] leading-relaxed text-muted">{cta.tranquilizador}</p>
        </div>
      </div>
    </section>
  )
}
