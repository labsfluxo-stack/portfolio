/**
 * Revelação na entrada, no compositor.
 *
 * Era `motion/react` com `whileInView`: animação em JavaScript, na thread
 * principal, exatamente durante a rolagem em que a cena 3D do hero está
 * desenhando. A landing já tinha provado o caminho — `animation-timeline:
 * view()` faz o mesmo efeito sem JavaScript nenhum — e aqui a troca não é só de
 * técnica: é liberar a thread que a cena disputa.
 *
 * Com o `motion` fora, some também o `'use client'`: este é um Server Component
 * e quatro fronteiras de cliente desaparecem da home. Quem cobre
 * `prefers-reduced-motion` é o bloco global de `app/globals.css`, com o
 * `animation-timeline: auto !important` que scroll timeline exige.
 *
 * `ordem` é o índice do item na lista, e vira `--i` para o CSS deslocar a faixa
 * de revelação. NÃO é atraso em milissegundos: numa timeline de rolagem o
 * atraso é ignorado, e um nome como `delayMs` prometeria um escalonamento que
 * o navegador aceita e não executa.
 */
export function Reveal({
  children,
  ordem = 0,
  className,
}: {
  children: React.ReactNode
  ordem?: number
  /** Repassado ao embrulho. Necessário sempre que o filho direto é um item de
   * grid que hoje conta com `align-items`/`justify-items: stretch` (o padrão do
   * CSS Grid) para virar um card de largura e altura uniformes na fileira
   * (SystemCard, LayerCard, Metric): `className="grid"` faz este embrulho — que
   * passa a ser o item real da grade externa, já esticado por ela — esticar por
   * sua vez o único filho nos dois eixos. Sem isso o card perde a altura
   * uniforme e a fileira fica desalinhada assim que o conteúdo varia de tamanho
   * entre os itens. */
  className?: string
}) {
  return (
    <div
      className={className ? `revelar ${className}` : 'revelar'}
      style={{ '--i': ordem } as React.CSSProperties}
    >
      {children}
    </div>
  )
}
