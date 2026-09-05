import type { Dictionary } from '@/content/types'
import { ArteOferta } from './arte'
import { BotaoWhatsapp } from './Botao'
import { TOKENS_ESCUROS } from './polaridade'

/** Uma arte por cartão, na ordem do dicionário. Fora do `map` para o tipo ser
 *  verificado: se alguém acrescentar um quarto cartão, o `tsc` reclama aqui em
 *  vez de a página renderizar um buraco. */
const ARTES = ['site', 'blog', 'sistema'] as const

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
    // ESCURECIDA POR REDEFINIÇÃO DE TOKEN, como o `Criterio` e a arte da
    // abertura. A paleta e o porquê de cada valor estão em `./polaridade`.
    <section className="border-t border-rule bg-paper" style={TOKENS_ESCUROS}>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-20 sm:py-28">
        <h2 className="revelar-titulo font-sans text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          {oferta.titulo}
        </h2>
        <ul className="revelar grid gap-px overflow-hidden rounded-lg border border-rule bg-rule sm:grid-cols-3">
          {oferta.cartoes.map((cartao, i) => (
            <li key={cartao.nome} className="flex flex-col gap-3 bg-paper p-6">
              {/* A arte vem antes do rótulo: no celular os cartões empilham, e
               *  três blocos de texto seguidos sem nenhuma pausa visual são
               *  exatamente a parede que a página precisa quebrar. `w-24` a
               *  mantém pequena — é pontuação, não ilustração. */}
              {/* `w-36` E NÃO `w-24`, e a razão é a peça ter mudado de natureza.
                *  O comentário acima continua valendo — isto é pontuação, não
                *  ilustração — mas a arte deixou de ser linha chapada e virou
                *  isométrica, com faces, hachura e blocos empilhados. Detalhe
                *  interno precisa de área para existir: a 96px o desenho novo
                *  vira mancha, e mancha não pontua nada.
                *
                *  E subiu de novo, de 36 para 44, quando a peça ganhou halo,
                *  ondas e flutuação: efeito de luz precisa de area em volta do
                *  objeto para se dissolver. A 144px o halo encostava na borda
                *  do SVG e virava mancha retangular — o mesmo corte que ja
                *  tinha aparecido na arte da abertura. */}
              <div className="w-44">
                <ArteOferta variante={ARTES[i] ?? 'site'} />
              </div>
              <h3 className="font-mono text-xs uppercase tracking-[0.15em] text-accent">
                {cartao.nome}
              </h3>
              <p className="text-[17px] leading-relaxed text-ink-2">{cartao.corpo}</p>
            </li>
          ))}
        </ul>

        {/* A SAÍDA DO MEIO DA PÁGINA. Ver `content/types.ts` (`oferta.cta`)
          * para a medição que a colocou aqui: entre o botão da auditoria
          * (y=2568) e o do fechamento (y=4881) havia 2.313px cobrindo a oferta
          * inteira e a prova inteira sem nenhum ponto de conversão — e são os
          * dois blocos que mais constroem desejo.
          *
          * Tratamento de LINK e não de botão, de propósito: a barra fixa já é
          * o botão permanente no celular, e um segundo botão grande a meia
          * página compete com ela em vez de somar. Pesquisa: CTA fixo sozinho
          * rende +11%, acima da dobra sozinho +6%, os dois juntos apenas +12%
          * — o fixo absorve quase todo o ganho, então empilhar botão é
          * trabalho com retorno próximo de zero.
          *
          * `BotaoWhatsapp variante="texto"` carrega o `target="_blank"
          * rel="noreferrer"` e a montagem da mensagem, então este link não
          * reimplementa nada disso à mão. */}
        <BotaoWhatsapp
          numero={dict.contact.whatsapp}
          mensagem={dict.landing.cta.mensagem}
          variante="texto"
        >
          {oferta.cta}
        </BotaoWhatsapp>
      </div>
    </section>
  )
}
