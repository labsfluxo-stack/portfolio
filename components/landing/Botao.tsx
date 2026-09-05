import { urlWhatsapp } from './whatsapp'

/**
 * O botão da landing, em duas variantes: escuro sobre o papel e claro sobre a
 * faixa escura.
 *
 * Existe porque havia SEIS variações onde deviam existir duas. Diferiam em
 * `py-3.5` contra `py-3` contra `min-h-12` sem padding vertical, em `gap-2`
 * presente numas e ausente noutras, e a barra do celular era a única sem
 * transição de hover.
 *
 * Nada disso se percebe conscientemente — percebe-se como "algo aqui é meio
 * amador". A pesquisa sobre o que faz uma marca parecer cara é direta no
 * ponto: inconsistência de botão, de raio de canto e de sombra sinaliza menos
 * polimento, e é dos poucos itens da lista que o visitante sente sem
 * conseguir nomear.
 *
 * `min-h-12` são os 48px de alvo mínimo de toque, e valem no desktop também —
 * botão pequeno não fica elegante, fica difícil de acertar.
 */
const BASE =
  'inline-flex min-h-12 items-center justify-center text-[17px] font-semibold transition-opacity hover:opacity-90'

/** O que faz um botão parecer botão, e que a variante `texto` justamente não quer. */
const CAIXA = 'rounded-md px-6'

const VARIANTE = {
  /** Sobre o papel claro. */
  escuro: `${CAIXA} bg-ink text-paper`,
  /** Dentro das faixas escuras. */
  claro: `${CAIXA} bg-paper text-ink`,
  /**
   * SEM CAIXA — link de texto no acento, para as saídas de meio de página.
   *
   * Não é um botão mais fraco por economia de esforço: é hierarquia. A barra
   * fixa já ocupa o papel de botão permanente no celular, e a pesquisa mede
   * que ela sozinha rende +11% enquanto ela somada a um CTA acima da dobra
   * rende +12% — o fixo absorve quase todo o ganho. Empilhar mais caixas
   * escuras não soma conversão, só ruído; o que faltava era existir uma saída
   * onde não havia nenhuma por 2.313px.
   *
   * `min-h-12` do `BASE` continua valendo: o alvo de toque é o mesmo, mesmo
   * sem a caixa desenhada em volta dele.
   */
  texto: 'text-accent underline decoration-2 underline-offset-4',
} as const

export function BotaoWhatsapp({
  numero,
  mensagem,
  children,
  variante = 'escuro',
  largura = 'auto',
  className = '',
}: {
  numero: string
  mensagem: string
  children: React.ReactNode
  variante?: keyof typeof VARIANTE
  /** `cheia` só para a barra fixa do celular, que ocupa a largura da tela. */
  largura?: 'auto' | 'cheia'
  className?: string
}) {
  return (
    <a
      href={urlWhatsapp(numero, mensagem)}
      // `target="_blank" rel="noreferrer"`, igual a components/sections/Contact.tsx
      // para a MESMA URL de wa.me: sem isso o clique leva a aba inteira para
      // fora e a landing desaparece — e no navegador embutido do Instagram,
      // sem stack de "voltar" confiável, pode encerrar a sessão de vez.
      target="_blank"
      rel="noreferrer"
      className={`${BASE} ${VARIANTE[variante]} ${largura === 'cheia' ? 'w-full' : 'w-fit'} ${className}`}
    >
      {children}
    </a>
  )
}
