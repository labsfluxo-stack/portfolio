import type { Dictionary } from '@/content/types'
import { BotaoWhatsapp } from '@/components/landing/Botao'

/**
 * Último bloco do documento, e o único lugar da página com o CTA em tamanho
 * grande além da dobra.
 *
 * Não reaproveita `components/landing/Fecho.tsx` nem `LandingCta.tsx`: os dois
 * leem `dict.landing` direto e carregam a faixa escura que só existe para
 * quebrar uma página de polaridade CLARA. Numa rota escura inteira, a faixa
 * não distingue nada — seria decoração herdada de um problema que aqui não
 * existe.
 */
export function ChamadaFinal({ dict }: { dict: Dictionary }) {
  const { fechamento, cta } = dict.ativacoes

  return (
    <section className="border-t border-border bg-surface">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-20 sm:py-28">
        <h2 className="revelar-titulo font-serif text-4xl tracking-tight text-text sm:text-5xl">
          {fechamento.titulo}
        </h2>
        <p className="max-w-xl text-[17px] leading-relaxed text-muted">{fechamento.corpo}</p>
        <div className="flex flex-col gap-2">
          <BotaoWhatsapp numero={dict.contact.whatsapp} mensagem={cta.mensagem} variante="claro">
            {cta.rotulo}
          </BotaoWhatsapp>
          {/* `cta.tranquilizador` tem CINCO palavras — passa longe do teto de
            * 1–3 que libera rótulo mono abaixo de 17px. É corpo de texto, não
            * etiqueta: mesmo tratamento do resto da seção, sem caixa-alta nem
            * tracking. Ver o mesmo texto em LandingCta.tsx. */}
          <p className="text-[17px] leading-relaxed text-muted">{cta.tranquilizador}</p>
        </div>
      </div>
    </section>
  )
}
