import type { Dictionary } from '@/content/types'
import { BotaoWhatsapp } from './Botao'

/**
 * O fecho da página, depois do FAQ.
 *
 * Existe porque a página TERMINAVA EM ACORDEÃO FECHADO: depois da faixa de CTA
 * vinha o bloco de perguntas, e acabava. A última coisa que o visitante via
 * eram três barras cinzas sem conteúdo aberto — a página parava em vez de
 * fechar.
 *
 * É curto de propósito. Quem chegou até aqui já leu tudo: repetir argumento
 * seria insistência, e o que falta é só a porta. Uma linha e o botão.
 *
 * TERCEIRA FAIXA ESCURA, e é a exceção deliberada à regra de duas. As duas
 * originais (`Dupla` e `LandingCta`) pontuavam o meio; esta encerra. Sem ela a
 * página termina no mesmo tom claro em que passou 80% do tempo, e nada avisa
 * ao olho que chegou ao fim.
 */
export function Fecho({ dict }: { dict: Dictionary }) {
  const { fecho, cta } = dict.landing

  return (
    // `footer` E NÃO `section`, e é o único conserto de acessibilidade que a
    // auditoria de 2026-09-04 encontrou de fato: a página tinha UM landmark,
    // `MAIN`, e mais nenhum. Para leitor de tela isso significa que a
    // navegação por região não oferece nada — a pessoa só pode navegar por
    // título.
    //
    // A recomendação original era `header` + `footer` + `nav`. As outras duas
    // foram descartadas ao olhar a página: ela não tem topo (nenhum logo,
    // nenhum menu — a landing apaga Header e Footer de propósito, ver
    // app/[locale]/projetos/layout.tsx) e não tem navegação. Landmark vazio é
    // pior que landmark ausente: promete uma região e entrega nada.
    //
    // Este bloco, sim, é rodapé de verdade — última faixa, fecho do argumento
    // e a porta de saída. Nomear o que existe, não inventar o que falta.
    <footer className="bg-ink text-paper">
      <div className="mx-auto flex w-full max-w-4xl flex-col items-start gap-5 px-6 py-14">
        <p className="revelar-titulo max-w-xl text-balance font-sans text-2xl font-bold tracking-tight sm:text-3xl">
          {fecho}
        </p>
        <BotaoWhatsapp numero={dict.contact.whatsapp} mensagem={cta.mensagem} variante="claro">
          {cta.rotulo}
        </BotaoWhatsapp>
      </div>
    </footer>
  )
}
