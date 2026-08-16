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
  'inline-flex min-h-12 items-center justify-center rounded-md px-6 text-[17px] font-semibold transition-opacity hover:opacity-90'

const VARIANTE = {
  /** Sobre o papel claro. */
  escuro: 'bg-ink text-paper',
  /** Dentro das faixas escuras. */
  claro: 'bg-paper text-ink',
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
