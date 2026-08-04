import type { Dictionary, Locale } from '@/content/types'
import { Section } from '@/components/ui/Section'
import { PhotoFrame } from '@/components/ui/PhotoFrame'

/**
 * Experiência acima da formação — é o ativo mais forte (dez anos de rede
 * antes do código). Os três blocos de formação (técnico, graduação,
 * certificações) usam rótulos distintos e não intercambiáveis: os CS50
 * vivem só sob certificações, e a graduação não carrega rótulo de status.
 */
export function About({ dict }: { dict: Dictionary; locale: Locale }) {
  const { about } = dict

  return (
    <Section id="sobre" label={about.label} index="02">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,280px)_1fr] lg:gap-16">
        <PhotoFrame alt={about.photoAlt} pendingLabel={about.photoPending} />

        <div className="flex flex-col gap-10">
          <div>
            <p className="text-2xl font-semibold leading-snug text-text sm:text-3xl">{about.lead}</p>
            <div className="mt-6 flex flex-col gap-4 text-muted">
              {about.body.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </div>

          <div className="border-t border-border pt-8">
            <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
              {about.experience.label}
            </h3>
            <p className="mt-3 text-xl font-bold text-text sm:text-2xl">{about.experience.years}</p>
            <p className="mt-2 max-w-2xl text-muted">{about.experience.body}</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {about.experience.vendors.map((vendor) => (
                <li
                  key={vendor}
                  className="border border-border bg-surface px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-text"
                >
                  {vendor}
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-border pt-8">
            <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
              {about.education.label}
            </h3>
            <div className="mt-4 grid gap-6 sm:grid-cols-3">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
                  {about.education.technical.label}
                </p>
                <ul className="mt-2 flex flex-col gap-1 text-sm text-muted">
                  {about.education.technical.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
                  {about.education.degree.label}
                </p>
                <ul className="mt-2 flex flex-col gap-1 text-sm text-muted">
                  {about.education.degree.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
                  {about.education.certifications.label}
                  <span className="text-muted"> · {about.education.certifications.institution}</span>
                </p>
                <ul className="mt-2 flex flex-col gap-1 text-sm text-muted">
                  {about.education.certifications.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  )
}
