'use client'

import { useEffect, useState } from 'react'

export type ItemDoIndicador = { id: string; rotulo: string }

/**
 * A navegação entre andares — não mais um indicador visível.
 *
 * Decisão do dono, 2026-09-08, revisando a decisão de 2026-09-07 que
 * introduziu este componente como indicador FIXO na lateral: ele foi visto
 * no navegador e a ordem foi "some tudo — nada visível". A tela mostra o
 * andar e mais nada — ver docs/superpowers/specs/2026-09-06-predio-home-
 * design.md, "Um andar por tela, sem barra de rolagem", parte 3. Nenhuma
 * pista visível substituta foi inventada aqui: nem seta, nem borda cortada,
 * nem gradiente. Esse custo — nada avisa que existem mais seis andares — é
 * deliberado e está escrito na spec, não um esquecimento deste arquivo.
 *
 * O QUE NÃO SAI: sumir da TELA não pode significar sumir do TECLADO (WCAG
 * 2.4.7, foco visível) — um link permanentemente invisível é, ele mesmo,
 * uma armadilha para quem navega por Tab. A forma que resolve as duas coisas
 * ao mesmo tempo é a mesma que components/layout/SkipLink.tsx já usa neste
 * projeto: `sr-only focus:not-sr-only` — invisível por padrão (mas presente
 * na árvore de acessibilidade, então leitor de tela e crawler continuam
 * enxergando), revelado só enquanto o PRÓPRIO link está com foco de
 * teclado, escondido de novo assim que o foco anda para o próximo. Nenhuma
 * classe nova inventada — mesma receita já provada no projeto.
 *
 * `aria-current` continua calculado (IntersectionObserver, mesmo padrão de
 * components/blog/Indice.tsx): é informação NÃO VISUAL — um leitor de tela
 * anuncia "andar atual" independente de pintura na tela — então não é a
 * pista visível que o dono pediu para tirar.
 */
export function PredioIndicador({ itens, rotuloNav }: { itens: ItemDoIndicador[]; rotuloNav: string }) {
  const [atual, setAtual] = useState<string | null>(null)

  // Chave estável: `itens` chega como um array literal novo a cada render do
  // componente pai (PredioFallback.tsx recria `itensDoIndicador` toda vez),
  // então usar `itens` direto como dependência do efeito abaixo derrubava e
  // recriava o `IntersectionObserver` em TODO re-render, não só quando o
  // programa do prédio de fato muda (achado da revisão). Uma string
  // primitiva compara por valor — igual em dois renders quaisquer com os
  // mesmos sete andares — e é isso que estabiliza o efeito.
  const chaveDosItens = itens.map((item) => item.id).join('|')

  useEffect(() => {
    const alvos = itens
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null)
    if (alvos.length === 0) return

    const observador = new IntersectionObserver(
      (entradas) => {
        const visiveis = entradas.filter((e) => e.isIntersecting)
        if (visiveis.length === 0) return
        // O mais alto na página entre os que estão acima do limiar — a
        // ordem de `entradas` não é garantida pela especificação.
        const topo = visiveis.reduce((a, b) =>
          a.boundingClientRect.top <= b.boundingClientRect.top ? a : b,
        )
        setAtual(topo.target.id)
      },
      { threshold: 0.5 },
    )

    for (const alvo of alvos) observador.observe(alvo)
    return () => observador.disconnect()
    // Dependência é `chaveDosItens`, não `itens`: ver o comentário na
    // declaração dela acima. Sem plugin de lint de hooks configurado neste
    // projeto (eslint.config.mjs), não há regra de "dependência exaustiva"
    // para satisfazer ou suprimir aqui.
  }, [chaveDosItens])

  return (
    <nav aria-label={rotuloNav}>
      <ol>
        {itens.map((item) => {
          const ativo = atual === item.id
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={ativo ? 'true' : undefined}
                // Mesmas classes de components/layout/SkipLink.tsx: invisível
                // por padrão, aparece só com foco de teclado.
                className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:border focus:border-border focus:bg-surface focus:px-4 focus:py-2 focus:font-mono focus:text-sm"
              >
                {item.rotulo}
              </a>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
