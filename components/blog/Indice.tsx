'use client'

import { useEffect, useState } from 'react'

export type ItemDeIndice = { nivel: 2 | 3; texto: string; id: string }

/**
 * O índice do artigo, com marcação da seção que está sendo lida.
 *
 * É CLIENTE só por causa do destaque. A lista em si sai pronta do servidor —
 * está no HTML, o leitor sem JavaScript navega por ela normalmente, e o crawler
 * a enxerga. O JavaScript só acrescenta saber onde você está.
 *
 * `IntersectionObserver` E NÃO um listener de `scroll`. O listener dispara
 * dezenas de vezes por segundo e obriga a ler `getBoundingClientRect` de todos
 * os títulos a cada disparo — cada leitura força o navegador a recalcular
 * layout, na thread principal, durante a rolagem. É a receita clássica de
 * rolagem travada, e num artigo longo aparece exatamente quando o leitor está
 * mais imerso.
 *
 * `rootMargin: '-88px 0px -70% 0px'` recorta uma faixa fina no ALTO da tela: um
 * título só conta como "atual" quando cruza o topo da leitura, não quando
 * aparece no rodapé da janela. Sem o recorte de baixo, três seções ficam
 * visíveis ao mesmo tempo numa tela grande e o destaque pisca entre elas.
 */
export function Indice({ itens, titulo }: { itens: ItemDeIndice[]; titulo: string }) {
  const [ativo, setAtivo] = useState<string | null>(null)

  useEffect(() => {
    const alvos = itens
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null)
    if (alvos.length === 0) return

    const observador = new IntersectionObserver(
      (entradas) => {
        const visiveis = entradas.filter((e) => e.isIntersecting)
        if (visiveis.length === 0) return
        // O mais alto na página entre os que estão na faixa — a ordem de
        // `entradas` não é garantida pela especificação.
        const topo = visiveis.reduce((a, b) =>
          a.boundingClientRect.top <= b.boundingClientRect.top ? a : b,
        )
        setAtivo(topo.target.id)
      },
      { rootMargin: '-88px 0px -70% 0px', threshold: 0 },
    )

    for (const alvo of alvos) observador.observe(alvo)
    return () => observador.disconnect()
  }, [itens])

  if (itens.length < 3) return null

  return (
    // `sticky` dentro de uma coluna que o pai torna alta o bastante. Some
    // abaixo de `lg`: no celular ele empurraria o começo do artigo para fora
    // da primeira tela, e o leitor de celular rola em vez de saltar.
    <nav
      aria-labelledby="indice-do-artigo"
      className="sticky top-24 hidden max-h-[calc(100dvh-8rem)] overflow-y-auto lg:block"
    >
      <p
        id="indice-do-artigo"
        className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-2"
      >
        {titulo}
      </p>
      <ol className="mt-4 flex flex-col gap-2.5 border-l border-rule">
        {itens.map((item) => (
          <li key={item.id} className={item.nivel === 3 ? 'pl-7' : 'pl-4'}>
            <a
              href={`#${item.id}`}
              // `aria-current` e não só a cor: quem usa leitor de tela precisa
              // do estado, e cor sozinha não é informação acessível (WCAG 1.4.1).
              aria-current={ativo === item.id ? 'true' : undefined}
              className={`-ml-px block border-l-2 py-0.5 text-[14px] leading-snug transition-colors ${
                ativo === item.id
                  ? 'border-accent pl-3 text-ink'
                  : 'border-transparent pl-3 text-ink-2 hover:text-ink'
              }`}
            >
              {item.texto}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
