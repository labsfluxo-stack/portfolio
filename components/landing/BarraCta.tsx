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
 * `<main>` de CADA layout que monta esta barra — hoje são dois,
 * `app/[locale]/projetos/layout.tsx` (Task 10) e `app/[locale]/ativacoes/layout.tsx`.
 * A barra não carrega esse respiro consigo: `position: fixed` não ocupa espaço
 * no fluxo, então quem monta a barra tem que abrir o espaço. Layout novo que a
 * use e esqueça o padding volta a cobrir o fim do conteúdo, e o teste que mede
 * isso vive por rota (`tests/e2e/landing.spec.ts` e `tests/e2e/ativacoes.spec.ts`).
 *
 * O padding vai no `<main>`, não em `page.tsx` e não com o valor exato desta
 * barra (~73px): padding em qualquer elemento que seja (ou contenha) o último
 * filho de `main` coincide matematicamente com o fim do documento depois de
 * rolar até o fundo, então só um padding no PRÓPRIO `main` cria a folga de
 * verdade. Ver o comentário em `projetos/layout.tsx` para a medição completa. É
 * exatamente o defeito que o Baymard documenta nas bolhas de chat flutuantes:
 * cobrir o conteúdo que a pessoa está tentando ler.
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
 *
 * A BARRA DEIXOU DE LER `dict.landing`. Ela nasceu para a /projetos e passou a
 * servir duas rotas com polaridades opostas; ler uma chave específica do
 * dicionário amarrava um componente de layout a uma página. Agora recebe o que
 * mostra por prop, e a polaridade escolhe os tokens — na rota clara os tokens
 * de papel, na escura os de superfície. Sem isso, a barra apareceria branca
 * sobre a página escura, que é o defeito que ninguém vê em teste de unidade.
 */
const POLARIDADE = {
  clara: { caixa: 'border-rule bg-paper/95', botao: 'escuro' },
  escura: { caixa: 'border-border bg-bg/95', botao: 'claro' },
} as const

export function BarraCta({
  numero,
  rotulo,
  mensagem,
  polaridade = 'clara',
}: {
  numero: string
  rotulo: string
  mensagem: string
  polaridade?: keyof typeof POLARIDADE
}) {
  const tokens = POLARIDADE[polaridade]

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-50 border-t ${tokens.caixa} p-3 backdrop-blur md:hidden`}
    >
      {/* Ver LandingHero.tsx: mesmo `target="_blank" rel="noreferrer"`,
       * mesmo motivo. Esta é a barra que fica no celular -- exatamente onde
       * o navegador embutido do Instagram entra em jogo. */}
      <BotaoWhatsapp
        numero={numero}
        mensagem={mensagem}
        variante={tokens.botao}
        largura="cheia"
      >
        {rotulo}
      </BotaoWhatsapp>
    </div>
  )
}
