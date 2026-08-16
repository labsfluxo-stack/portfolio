import type { Dictionary } from '@/content/types'
import { BotaoWhatsapp } from './Botao'

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
 * O respiro que evita a barra cobrir o último bloco é `pb-20 md:pb-0` no
 * `<main>` de `app/[locale]/projetos/layout.tsx` (Task 10) — não em `page.tsx`,
 * e não com o valor exato desta barra (~73px): padding em qualquer elemento
 * que seja (ou contenha) o último filho de `main` coincide matematicamente
 * com o fim do documento depois de rolar até o fundo, então só um padding no
 * PRÓPRIO `main` cria a folga de verdade. Ver o comentário lá para a medição
 * completa. É exatamente o defeito que o Baymard documenta nas bolhas de
 * chat flutuantes: cobrir o conteúdo que a pessoa está tentando ler.
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
      {/* Ver LandingHero.tsx: mesmo `target="_blank" rel="noreferrer"`,
       * mesmo motivo. Esta é a barra que fica no celular -- exatamente onde
       * o navegador embutido do Instagram entra em jogo. */}
      <BotaoWhatsapp numero={dict.contact.whatsapp} mensagem={cta.mensagem} largura="cheia">
        {cta.rotulo}
      </BotaoWhatsapp>
    </div>
  )
}
