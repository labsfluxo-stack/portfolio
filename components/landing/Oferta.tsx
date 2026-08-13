import type { Dictionary } from '@/content/types'

/**
 * Três cartões, e o que os costura é o padrão de construção, não o artefato —
 * sem essa costura a página vira "faço de tudo", que é o posicionamento mais
 * fraco possível.
 *
 * Cada cartão traduz a prova técnica em consequência de negócio. O dono lê a
 * consequência; o termo técnico, quando aparece, vem depois e explica. Um dono
 * de empresa não processa "Core Web Vitals" pela rota que avalia argumento —
 * ele degrada a sinal periférico, e desperdiça o único ativo de prova que a
 * página tem.
 *
 * Borda de 1px em vez de sombra: é o que lê como premium técnico em 2026.
 */
export function Oferta({ dict }: { dict: Dictionary }) {
  const { oferta } = dict.landing

  return (
    <section className="border-t border-rule">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-16 sm:py-24">
        <h2 className="font-sans text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          {oferta.titulo}
        </h2>
        <ul className="grid gap-px overflow-hidden rounded-lg border border-rule bg-rule sm:grid-cols-3">
          {oferta.cartoes.map((cartao) => (
            <li key={cartao.nome} className="flex flex-col gap-3 bg-paper p-6">
              <h3 className="font-mono text-xs uppercase tracking-[0.15em] text-accent">
                {cartao.nome}
              </h3>
              <p className="text-[17px] leading-relaxed text-ink-2">{cartao.corpo}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
