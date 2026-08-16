import type { Dictionary, Locale } from '@/content/types'
import { Section } from '@/components/ui/Section'
import { PhotoFrame } from '@/components/ui/PhotoFrame'
import { Reveal } from '@/components/ui/Reveal'

/**
 * A prosa primeiro (`lead` + `body`), depois a base técnica, depois a
 * formação. A ordem importa e não é estética: a base é a experiência de
 * infraestrutura, e ela vem DEPOIS do texto que diz o que o dono constrói
 * hoje — o bloco já se chamou "Experiência" e abria a seção, e com isso a
 * página inteira se apresentava como currículo de rede em vez de currículo
 * de software (ver o comentário em content/pt.ts, about.experience).
 *
 * A formação é uma fileira única de etiquetas, sem rótulo de grupo — já
 * foram três colunas rotuladas (Técnico / Graduação / Certificações). A
 * regra que os rótulos garantiam continua valendo e passou a ser garantida
 * de outro jeito: cada etiqueta se descreve sozinha e a atribuição da
 * HarvardX nomeia os CS50, para que nenhum deles possa ser lido como
 * diploma e para que a graduação não carregue rótulo de status.
 */
export function About({ dict }: { dict: Dictionary; locale: Locale }) {
  const { about } = dict

  return (
    <Section id="sobre" label={about.label} index="01">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,280px)_1fr] lg:gap-16">
        <Reveal>
          <PhotoFrame alt={about.photoAlt} pendingLabel={about.photoPending} />
        </Reveal>

        <Reveal ordem={1}>
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
              {/* Uma fileira só de etiquetas, no mesmo tratamento das marcas
               * de rede logo acima — sem as três colunas rotuladas
               * (Técnico / Graduação / Certificações) que existiam aqui.
               *
               * Cada item se descreve sozinho, e isso é requisito, não
               * estilo: sem o rótulo do grupo, uma etiqueta solta escrita
               * "Telecomunicações" não diz que é curso técnico, e um "CS50x"
               * ao lado de uma graduação poderia ser lido como diploma. Daí
               * `technical.items` já vir como "Técnico em Telecomunicações"
               * (content/pt.ts) e a atribuição da HarvardX aparecer logo
               * abaixo, presa aos CS50 pelo nome. */}
              <ul className="mt-4 flex flex-wrap gap-2">
                {[
                  ...about.education.technical.items,
                  ...about.education.degree.items,
                  // Só o código do curso na etiqueta. O nome oficial inteiro
                  // ("CS50 AI — Introduction to Artificial Intelligence with
                  // Python") passa de 50 caracteres e, em caixa alta, cada
                  // etiqueta ocuparia quase a largura da coluna — deixaria de
                  // parecer com as marcas de rede, que é justamente o que se
                  // pede aqui. O nome completo continua inteiro no dicionário,
                  // e é ele que sai no CV e no JSON-LD (`hasCredential`), onde
                  // há espaço e é onde a leitura é atenta.
                  ...about.education.certifications.items.map((item) => item.split(' — ')[0] ?? item),
                ].map((item) => (
                  <li
                    key={item}
                    className="border border-border bg-surface px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-text"
                  >
                    {item}
                  </li>
                ))}
              </ul>
              {/* Atribuição da HarvardX. Nomeia "CS50" de propósito: sem isso
               * a linha ficaria solta embaixo da fileira inteira e pareceria
               * atribuir também o técnico e a graduação, que não são da
               * Harvard. 10px, um degrau abaixo do rótulo da seção — mesma
               * disciplina de tamanho, nunca de cor, do resto do site. */}
              <p className="mt-3 font-mono text-[10px] leading-relaxed text-muted">
                CS50 · {about.education.certifications.institution}
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  )
}
