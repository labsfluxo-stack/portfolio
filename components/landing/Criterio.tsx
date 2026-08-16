import type { Dictionary } from '@/content/types'
import { ArteSemJavaScript } from './arte'
import { Auditoria } from './Auditoria'

/**
 * A seção que carrega a página, e a que mudou mais depois da pesquisa.
 *
 * O Gartner mediu que o comprador B2B não sofre de falta de informação — 89%
 * achavam a informação boa — e mesmo assim ficava paralisado, porque as
 * informações eram CONTRADITÓRIAS entre fornecedores. O que resolve não é mais
 * argumento, é um CRITÉRIO de julgamento.
 *
 * Então esta seção não ensina o que é otimização para IA. Ela entrega dois
 * testes que o dono aplica sozinho nos três orçamentos que já vai receber. O
 * critério, convenientemente, é aquele em que a gente ganha — e o segundo
 * teste responde de graça o "meu sobrinho faz", que nenhuma página brasileira
 * analisada enfrenta.
 *
 * Isto NÃO é uma seção "apareça na IA" (spec §4.2 e D7). Virar seção própria
 * criaria dois produtos numa página só, e a demanda não formada não converte
 * assim.
 */
export function Criterio({ dict }: { dict: Dictionary }) {
  const { criterio } = dict.landing

  return (
    <section className="border-t border-rule">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-16 sm:py-24">
        <h2 className="text-balance font-sans text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl">
          {criterio.titulo}
        </h2>
        <p className="max-w-2xl text-[19px] leading-relaxed text-ink">{criterio.abertura}</p>

        <ol className="flex flex-col gap-6">
          {criterio.testes.map((teste, i) => (
            <li key={teste.titulo} className="flex gap-4 border-l-2 border-accent pl-5">
              <span aria-hidden="true" className="font-mono text-sm text-accent">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="flex flex-col gap-1.5">
                <p className="text-[17px] font-semibold text-ink">{teste.titulo}</p>
                <p className="text-[17px] leading-relaxed text-ink-2">{teste.corpo}</p>
              </div>
            </li>
          ))}
        </ol>

        {/* A ÚNICA ARTE DA PÁGINA QUE NÃO É DECORAÇÃO.
         *
         * O segundo teste acima diz "peça para ver o site com o JavaScript
         * desligado; se a tela ficar em branco, é isso que o ChatGPT enxerga".
         * Isso é abstrato em palavra e instantâneo em desenho: a mesma tela,
         * cheia e vazia, com uma seta entre as duas.
         *
         * Fica ENTRE os testes e o fecho de propósito. O parágrafo seguinte
         * explica o mecanismo, e chega depois de a imagem já ter feito o ponto.
         *
         * `max-w-lg` porque em largura total a comparação se dispersa: os dois
         * painéis precisam caber no mesmo golpe de vista, senão viram dois
         * desenhos em vez de um antes-e-depois. */}
        <div className="max-w-lg py-2">
          <ArteSemJavaScript />
        </div>

        <div className="flex max-w-2xl flex-col gap-4">
          {criterio.fecho.map((paragrafo) => (
            <p key={paragrafo} className="text-[17px] leading-relaxed text-ink-2">
              {paragrafo}
            </p>
          ))}
        </div>

        {/* A auditoria fecha a seção fazendo o segundo teste pelo visitante,
         *  no site dele. Vem DEPOIS do fecho: a pessoa precisa entender o que
         *  está sendo medido antes de ver o resultado, senão o número chega
         *  sem significado.
         *
         *  Some inteira sem `NEXT_PUBLIC_AUDITORIA_URL` — e a seção continua
         *  completa, porque o argumento nunca dependeu dela. */}
        <Auditoria dict={dict} />
      </div>
    </section>
  )
}
