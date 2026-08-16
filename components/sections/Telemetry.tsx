import type { Dictionary, Locale } from '@/content/types'
import { Section } from '@/components/ui/Section'
import { Metric } from '@/components/ui/Metric'
import { Reveal } from '@/components/ui/Reveal'

/**
 * Os 4 números primários (com Counter + procedência via Metric) mais a fita
 * de 5 secundários, tratados menores. Todo número aqui carrega procedência
 * — nunca só em `title`, sempre também como texto visível.
 */
export function Telemetry({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const { telemetry } = dict

  return (
    <Section id="telemetria" label={telemetry.label} index="03">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {telemetry.metrics.map((metric, i) => (
          <Reveal key={metric.key} ordem={i} className="grid">
            <Metric
              value={metric.value}
              label={metric.label}
              provenance={metric.provenance}
              locale={locale}
              numeric={metric.numeric}
              suffix={metric.suffix}
            />
          </Reveal>
        ))}
      </div>

      <Reveal ordem={telemetry.metrics.length + 1}>
        <div className="mt-16 border-t border-border pt-10">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
            {telemetry.secondaryLabel}
          </h3>
          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
            {telemetry.secondary.map((item) => (
              <div key={item.key}>
                <dt className="font-mono text-[11px] uppercase tracking-widest text-muted">{item.label}</dt>
                {/* A procedência saiu daqui pelo mesmo motivo que saiu de
                 * Metric.tsx — ver o comentário longo lá. Continua no
                 * `title`, disponível para quem quiser conferir, sem cobrar
                 * a leitura de todo mundo. */}
                <dd className="mt-2 font-sans text-2xl font-bold tabular-nums text-text" title={item.provenance}>
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>

          {/* UMA linha para os nove números da seção, no rodapé dela. Diz de
           * onde vieram sem transformar cada card num laudo. */}
          <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            {telemetry.provenanceNote}
          </p>
        </div>
      </Reveal>
    </Section>
  )
}
