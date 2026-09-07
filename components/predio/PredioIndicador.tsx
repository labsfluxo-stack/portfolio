'use client'

import { useEffect, useState } from 'react'
import { corDoRotulo } from './predio-luz'

export type ItemDoIndicador = { id: string; rotulo: string }

/**
 * O indicador de andar — o substituto da barra de rolagem que a spec manda
 * esconder (docs/superpowers/specs/2026-09-06-predio-home-design.md, "Um
 * andar por tela, sem barra de rolagem"). Sem ele, sumir com a barra some
 * também com a única pista de que existem mais andares abaixo — a barra não
 * era enfeite, dizia que a página continua e onde se está dentro dela.
 *
 * MESMO PADRÃO de components/blog/Indice.tsx: é CLIENTE só por causa do
 * destaque do andar atual. A pilha de links sai pronta do servidor — está no
 * HTML, funciona por teclado e mouse sem JavaScript nenhum (são `<a href="#…">`
 * de verdade, a mesma âncora de navegação que o resto do fallback usa), e é
 * o que o leitor de tela e o crawler enxergam. O JavaScript só acrescenta
 * saber onde você está.
 *
 * `threshold: 0.5`, sem o `rootMargin` recortado que o índice do blog usa:
 * lá o alvo era um TÍTULO cruzando o topo de um artigo contínuo; aqui cada
 * andar já ocupa a tela inteira (`.tela-cheia` em PredioFallback.tsx), então
 * "mais da metade visível" já identifica o andar atual sem precisar de faixa.
 */
export function PredioIndicador({ itens, rotuloNav }: { itens: ItemDoIndicador[]; rotuloNav: string }) {
  const [atual, setAtual] = useState<string | null>(null)

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
  }, [itens])

  // Mesma cor para os sete andares (predio-luz.ts): o indicador fica fixo na
  // tela enquanto o fundo por baixo dele muda de andar para andar, e não dá
  // para escolher uma cor só que passe AA contra um fundo só — `corDoRotulo`
  // já é a que passa contra todos.
  const cor = corDoRotulo(0)

  return (
    <nav aria-label={rotuloNav} className="fixed right-3 top-1/2 z-10 -translate-y-1/2 sm:right-5">
      <ol className="flex flex-col gap-2.5">
        {itens.map((item) => {
          const ativo = atual === item.id
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                // O rótulo do andar É o nome acessível do link — não tem
                // texto visível (só o traço abaixo, decorativo), então sem
                // `aria-label` o link ficaria sem nome nenhum para quem usa
                // leitor de tela ou navega por teclado.
                aria-label={item.rotulo}
                aria-current={ativo ? 'true' : undefined}
                // 44px de alvo de toque no link inteiro; só o traço visível
                // (o `span` abaixo) é pequeno — o alvo clicável não precisa
                // parecer do tamanho do dedo para ter o tamanho do dedo.
                className="flex min-h-11 min-w-11 items-center justify-center"
                style={{ color: cor }}
              >
                <span
                  aria-hidden="true"
                  className={`block rounded-full transition-all ${ativo ? 'h-2.5 w-2.5' : 'h-1.5 w-1.5 opacity-50'}`}
                  style={{ backgroundColor: cor }}
                />
              </a>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
