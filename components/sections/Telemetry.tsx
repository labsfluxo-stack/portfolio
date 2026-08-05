import type { Dictionary, Locale } from '@/content/types'
import { Section } from '@/components/ui/Section'
import { Metric } from '@/components/ui/Metric'

/**
 * Os 4 números primários (com Counter + procedência via Metric) mais a fita
 * de 5 secundários, tratados menores. Todo número aqui carrega procedência
 * — nunca só em `title`, sempre também como texto visível.
 */
export function Telemetry({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const { telemetry } = dict

  return (
    <Section id="telemetria" label={telemetry.label} index="01">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {telemetry.metrics.map((metric) => (
          <Metric
            key={metric.key}
            value={metric.value}
            label={metric.label}
            provenance={metric.provenance}
            locale={locale}
            numeric={metric.numeric}
            suffix={metric.suffix}
          />
        ))}
      </div>

      <div className="mt-16 border-t border-border pt-10">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          {telemetry.secondaryLabel}
        </h3>
        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
          {telemetry.secondary.map((item) => (
            <div key={item.key}>
              <dt className="font-mono text-[11px] uppercase tracking-widest text-muted">{item.label}</dt>
              {/* A procedência vive DENTRO do <dd>, não como <p> irmão: um
               * <div> filho de <dl> só pode conter <dt> e <dd>, e o <p> solto
               * tornava a lista de definição inválida (Lighthouse a11y). Ela
               * também é, semanticamente, parte da descrição do número.
               * 10px, um degrau abaixo do rótulo de 11px — a mesma disciplina
               * de tamanho de Metric.tsx, não de cor (ver app/globals.css). */}
              <dd className="mt-2 font-sans text-2xl font-bold tabular-nums text-text">
                {item.value}
                <span className="mt-2 block font-mono text-[10px] font-normal leading-relaxed text-muted">
                  {item.provenance}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </Section>
  )
}
