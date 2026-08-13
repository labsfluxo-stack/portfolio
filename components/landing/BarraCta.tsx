import type { Dictionary } from '@/content/types'
import { urlWhatsapp } from './whatsapp'

/**
 * Barra fixa de rodapé, SÓ NO CELULAR — e deliberadamente não é a bolha verde
 * redonda que quase todo site de PME brasileira usa.
 *
 * A evidência inverte o senso comum aqui. O que defende a bolha vem todo de
 * fornecedor de widget, sem metodologia publicada. O que a condena vem de
 * pesquisa independente: o Baymard documenta que ela é percebida como
 * disruptiva, especialmente no celular, ONDE COBRE O CONTEÚDO que a pessoa
 * está tentando ler; e o NN/g registrou participantes ignorando completamente
 * um botão de chat flutuante que estava em posição inesperada.
 *
 * `pb-[4.5rem]` no conteúdo da página (ver page.tsx, Task 10) existe para a
 * barra não cobrir o último bloco — que é exatamente o defeito documentado.
 *
 * Sem o verde `#25D366`: ele dá 1,79:1 sobre o papel, reprova, e é o marcador
 * visual de widget de construtor de página. Numa página que precisa sustentar
 * um piso de preço, ele trabalha contra.
 *
 * `min-h-12` são os 48px de alvo mínimo, na zona do polegar.
 *
 * TESTAR NO SAFARI DO IPHONE e dentro do navegador embutido do Instagram:
 * `position: fixed` tem histórico de deslocamento no iOS quando a barra de
 * endereço recolhe, e o navegador do Instagram tem viewport menor com barra
 * própria disputando o mesmo espaço.
 */
export function BarraCta({ dict }: { dict: Dictionary }) {
  const { cta } = dict.landing

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-rule bg-paper/95 p-3 backdrop-blur md:hidden">
      <a
        href={urlWhatsapp(dict.contact.whatsapp, cta.mensagem)}
        className="flex min-h-12 w-full items-center justify-center rounded-md bg-ink px-5 text-[17px] font-semibold text-paper"
      >
        {cta.rotulo}
      </a>
    </div>
  )
}
