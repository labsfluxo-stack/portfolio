import type { Dictionary } from '@/content/types'
import { TOKENS_CLAROS } from './polaridade'

/**
 * Piso de preço — a ÚNICA decisão desta página com evidência direta de que
 * move resultado.
 *
 * O NN/g descreve a ausência de preço como "o elemento mais hostil ao usuário
 * da maioria dos sites B2B" e OBSERVOU participantes abandonarem o site e ir
 * para o concorrente por causa disso. O TrustRadius aponta preço transparente
 * como desejo número 1 dos compradores por quatro anos seguidos.
 *
 * Contrapeso honesto: nenhuma das páginas brasileiras de referência publica
 * piso de projeto. Mas seguir o mercado aqui é fazer o que as páginas fracas
 * também fazem.
 *
 * POSIÇÃO: depois da prova, antes do CTA final. Das páginas brasileiras que
 * publicam piso, nenhuma o coloca no hero — ele qualifica depois de convencer.
 *
 * NULO ENQUANTO O DONO NÃO DECIDIR O VALOR. Não é descuido: é o que permite a
 * página ir ao ar sem um número inventado. Publicar valor errado é pior que
 * não publicar. (Decidido em 2026-09-04 — ver content/pt.ts.)
 *
 * É A ÚNICA FAIXA CLARA DA PÁGINA, e isso deixou de ser acidente.
 *
 * Quando a auditoria ampla mediu a página no ar, todas as seções estavam
 * escuras e o `Piso` era o único bloco sem inversão — claro por omissão,
 * porque a rota força o documento para claro e cada seção se escurece sozinha.
 * A pesquisa de interface escura diz que polaridade única serve mal a página
 * longa e densa em texto, e que layout misto produz melhor fluxo de rolagem;
 * esta página tem 5.788px no desktop e 6.525px no celular.
 *
 * O respiro poderia ter ido para o FAQ — foi a primeira proposta. Foi
 * descartado depois de medir as alturas: o FAQ tem ~419px entre `LandingCta` e
 * `Fecho`, dois blocos escuros, e faixa clara curta espremida entre escuros lê
 * como piscada. O `Piso` cai na fronteira entre a prova e o CTA final, que é
 * onde a troca tem para onde ir — e, por sorte que vale registrar, é também o
 * momento exato em que a página pede que o leitor PARE e se qualifique. A
 * interrupção de polaridade faz o trabalho retórico junto com o visual.
 *
 * Por isso os tokens claros são DECLARADOS e não herdados: o bloco depende de
 * ser claro agora, e herança silenciosa é o que faria ele escurecer calado no
 * dia em que a inversão subisse um nível.
 */
export function Piso({ dict }: { dict: Dictionary }) {
  const { piso } = dict.landing
  if (!piso || piso.valor.trim() === '') return null

  return (
    // `div` e não `section`: não tem título de seção, e não é um bloco
    // isolado do documento — é uma declaração de duas linhas entre a prova e o
    // CTA final. Usar `section` sem heading criaria um buraco no outline da
    // página e é sinalizado por ferramentas de acessibilidade.
    <div className="border-t border-rule bg-paper" style={TOKENS_CLAROS}>
      {/* `py-16` e não `py-12`: a faixa é o único claro numa rolagem de quase
        * 6.000px e precisa de ar suficiente para ler como pausa deliberada em
        * vez de emenda entre duas seções escuras. Continua sendo o bloco mais
        * curto da página — a pausa é o ponto, e um piso que ocupa uma tela
        * inteira vira tabela de preços, que é outra peça. */}
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-2 px-6 py-16">
        <p className="revelar-titulo font-sans text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          {piso.valor}
        </p>
        <p className="max-w-2xl text-[17px] leading-relaxed text-ink-2">{piso.nota}</p>
      </div>
    </div>
  )
}
