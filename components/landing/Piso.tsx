import type { Dictionary } from '@/content/types'

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
 * não publicar.
 */
export function Piso({ dict }: { dict: Dictionary }) {
  const { piso } = dict.landing
  if (!piso || piso.valor.trim() === '') return null

  return (
    // `div` e não `section`: não tem título de seção, e não é um bloco
    // isolado do documento — é uma declaração de duas linhas entre a prova e o
    // CTA final. Usar `section` sem heading criaria um buraco no outline da
    // página e é sinalizado por ferramentas de acessibilidade.
    <div className="border-t border-rule">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-2 px-6 py-12">
        <p className="font-sans text-2xl font-bold tracking-tight text-ink">{piso.valor}</p>
        <p className="text-[17px] leading-relaxed text-ink-2">{piso.nota}</p>
      </div>
    </div>
  )
}
