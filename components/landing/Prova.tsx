import Link from 'next/link'
import type { Dictionary, Locale } from '@/content/types'
import { SYSTEM_SLUGS } from '@/content/types'
import { TOKENS_ESCUROS } from './polaridade'

/**
 * Depoimento é SINAL BARATO — qualquer um escreve um, e o comprador sabe
 * disso. Não ter depoimento é menos grave do que parece: o teto de
 * credibilidade dele já é baixo.
 *
 * Software sob medida vendido a dono não técnico é um *credence good*: ele não
 * consegue avaliar a qualidade nem depois de consumir. Sob essa assimetria o
 * que funciona é sinal CARO e verificável — e na lista do que de fato
 * influencia decisão de compra (TrustRadius, 1.862 compradores), demonstração
 * vem ACIMA de avaliação de terceiros.
 *
 * Daí as duas camadas: a própria página como demonstração conferível, e os
 * cases mostrando o que mudou na operação de quem usa.
 *
 * Consome o que já existe no dicionário. Não duplica nada — se duplicasse,
 * divergiria.
 *
 * TRÊS CORREÇÕES ACUMULADAS, e a última desfez parte da primeira:
 *
 * C1 CRÍTICO (revisão de branch) — o `lead` afirmava "três sistemas em
 * operação", FALSO: só 2 dos 3 têm `production: true`. Nenhuma contagem de
 * sistema pode ser escrita à mão em `dict.landing.prova`; se um dia a copy
 * precisar de uma, tem de vir computada (`systems.filter((s) =>
 * s.production).length`). Foi esse hard-code que causou o defeito.
 *
 * I6 IMPORTANTE — cada card era um `<Link>` inteiro para o case study, no polo
 * escuro e sem rota de volta: a landing apagou Header e Footer (todo item de
 * menu é uma saída) e sobraram os três cards como as maiores saídas não-CTA da
 * página. Decisão do dono: os cards deixaram de ser clicáveis e existe UM link
 * discreto no fim da seção.
 *
 * PÚBLICO ERRADO (achado do dono) — a correção do C1 fez a seção exibir
 * `system.metrics` em corpo 5xl, e aí estava o erro seguinte: 146 RLS policies
 * e 13 jobs cron são números honestos e ilegíveis para dono de empresa. Ver o
 * comentário no `<li>` abaixo. Os números técnicos continuam no case study.
 */
export function Prova({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const { prova } = dict.landing

  return (
    // ESCURECIDA POR REDEFINIÇÃO DE TOKEN, como o `Criterio` e a arte da
    // abertura. A paleta e o porquê de cada valor estão em `./polaridade`.
    <section className="border-t border-rule bg-paper" style={TOKENS_ESCUROS}>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-20 sm:py-28">
        <div className="flex flex-col gap-3">
          <h2 className="revelar-titulo font-sans text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            {prova.titulo}
          </h2>
          <p className="max-w-2xl text-[17px] leading-relaxed text-ink-2">{prova.lead}</p>
        </div>

        <ul className="revelar flex flex-col gap-px overflow-hidden rounded-lg border border-rule bg-rule">
          {SYSTEM_SLUGS.map((slug) => {
            const caso = dict.systems.detail[slug]
            return (
              <li key={slug} className="flex flex-col gap-4 bg-paper p-6 sm:p-8">
                {/* O QUE MUDOU, NÃO O QUE FOI CONSTRUÍDO.
                 *
                 * Esta seção já exibiu `system.metrics` em corpo 5xl: 146 RLS
                 * policies, 42 telas, 14 packages, 13 jobs cron. Números
                 * verdadeiros, medidos — e ilegíveis para quem lê esta página.
                 * "RLS policy" e "job cron" não significam nada para um dono de
                 * empresa, e eram os MAIORES elementos da seção mais importante:
                 * o que mais chamava o olho era o que menos dizia ao público.
                 *
                 * É o erro que a própria pesquisa nomeia — o dev prova
                 * competência técnica e esquece de provar resultado; uma das
                 * páginas analisadas estampa "Lighthouse 95+" para quem não
                 * avalia isso. Ele sobreviveu aqui porque a métrica era honesta,
                 * e honesta não é o mesmo que relevante.
                 *
                 * `improvements` já existia, já escrito para este leitor: três
                 * frases curtas, cada uma uma MUDANÇA na operação de quem usa.
                 * Os números técnicos seguem vivos no case study, onde um leitor
                 * técnico vai atrás deles.
                 *
                 * O PRAZO É O NÚMERO QUE FICA, porque é o único que um dono lê
                 * sem tradução. Vem de `duration`, com a precisão que a fonte
                 * tem — "26 dias" onde o histórico do repositório dá o exato,
                 * "menos de 45 dias" onde só existe o limite. Exibir "45" para
                 * os dois seria inventar precisão que ninguém mediu. */}
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                  {/* O NOME DO CASO VIROU LINK, e é o conserto de duas contas
                    * que a auditoria de 2026-09-04 mediu na página no ar.
                    *
                    * SEO: a página inteira tinha CINCO links, quatro deles
                    * saindo para fora (WhatsApp, e-mail, GitHub). Sobrava um
                    * interno. As três páginas de caso estão no sitemap e não
                    * recebiam link da página de maior autoridade do site —
                    * desperdício caro numa arquitetura de dez URLs, e
                    * justamente o tipo de fundamento técnico que esta página
                    * se vende como sabendo fazer.
                    *
                    * CONVERSÃO: quem a seção acabou de convencer tem uma
                    * pergunta óbvia ("como foi esse projeto?") e a página só
                    * lhe oferecia o WhatsApp. Para quem não está pronto para
                    * falar, a alternativa a ler mais um caso não é mandar
                    * mensagem — é fechar a aba.
                    *
                    * O link é o TÍTULO, não um "saiba mais" solto: alvo maior,
                    * texto que descreve o destino (leitor de tela lê "Móveis
                    * Pro", não "saiba mais"), e nenhuma linha nova de layout.
                    *
                    * `prefetch={false}` pela mesma razão do link do fim da
                    * seção: sem isso o Next pré-carrega o payload RSC das três
                    * rotas assim que os cards entram em viewport. */}
                  <h3 className="text-[19px] font-semibold text-ink">
                    <Link
                      prefetch={false}
                      href={`/${locale}/sistemas/${slug}`}
                      className="underline decoration-rule decoration-2 underline-offset-4 transition-colors hover:decoration-accent"
                    >
                      {caso.name}
                    </Link>
                  </h3>
                  <p className="font-mono text-[11px] uppercase tracking-widest text-ink-2">
                    {caso.duration} · {caso.team}
                  </p>
                </div>

                <ul className="flex flex-col gap-2.5">
                  {caso.improvements.map((melhoria) => (
                    <li key={melhoria} className="flex gap-3 text-[17px] leading-relaxed text-ink">
                      <span aria-hidden="true" className="select-none text-accent">
                        →
                      </span>
                      {melhoria}
                    </li>
                  ))}
                </ul>
              </li>
            )
          })}
        </ul>

        {/* JÁ NÃO É O ÚNICO LINK DA SEÇÃO: os três nomes de caso acima também
         * levam para as rotas de detalhe (ver o comentário lá). O achado I6
         * que criou esta regra reclamava de TRÊS SAÍDAS GRANDES — três links
         * em tratamento de botão, no polo escuro do portfólio e sem rota de
         * volta. Título sublinhado não é saída grande: é a affordance mínima
         * de "isto continua", e a auditoria de 2026-09-04 mediu o custo do
         * extremo oposto — uma landing com um único link interno em cinco.
         *
         * Este continua sendo o link de tratamento forte, e continua
         * apontando para o portfólio inteiro (daí o plural em `verCase`), não
         * para um caso específico.
         *
         * Comentário original, ainda válido para este link:
         * antes eram três, um por card, no
         * polo escuro do portfólio e sem rota de volta. `prefetch={false}`
         * pela mesma razão de Contact.tsx e SystemCard.tsx: sem isso o Next
         * pré-carrega o payload RSC da rota assim que o link entra em
         * viewport, e ninguém pediu.
         *
         * Estilo do próprio dono (ver .superpowers/sdd/.../progress.md, Task
         * 7/8): corpo legível, não rótulo mono em caixa alta — a Task 7 tinha
         * aumentado só o tamanho e mantido mono/caixa-alta/tracking, e essa
         * era a mesma classe de defeito que a Task 5 já tinha corrigido
         * removendo o tratamento inteiro, não só o tamanho. */}
        <Link prefetch={false} href={`/${locale}`} className="w-fit text-[17px] font-semibold text-accent">
          {prova.verCase}
        </Link>
      </div>
    </section>
  )
}
