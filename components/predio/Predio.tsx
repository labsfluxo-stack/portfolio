'use client'
import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import type { Dictionary, Locale } from '@/content/types'

/**
 * STUB MÍNIMO — a cena de verdade é a Task 8, não esta tarefa.
 *
 * Existe só para que `PredioSlot.tsx` (Task 7) tenha um `./Predio` de
 * verdade para importar via `dynamic()`: sem este arquivo, `npm run
 * typecheck` falharia no commit da Task 7, mesmo a decisão entre cena e
 * fallback estando correta. Mesmo ruling do pré-voo do plano que criou este
 * arquivo (achado #7 — ver `.superpowers/sdd/2026-09-06-predio-home/
 * progress.md`).
 *
 * A Task 8 substitui o CORPO deste componente inteiro — câmera em trilho
 * por rolagem, sol rasante, planos de parallax, escada de qualidade e
 * âncoras de DOM sobre os objetos clicáveis. As props abaixo já são as que
 * a Task 8 vai consumir (mesma assinatura que `PredioSlot` já passa), só
 * que hoje nenhuma delas é lida: o `<Canvas>` está vazio de propósito.
 *
 * SEM `z-index` PRÓPRIO neste contêiner (achado de revisão da Task 7,
 * "settle the stacking deliberately"): a versão anterior levava `-z-10`
 * aqui, o que contradizia o comentário de `PredioSlot.tsx` dizendo que a
 * cena cobre o fallback — só era inofensivo por acidente, porque o fallback
 * daquela versão estava preso em `sr-only` (defeito Crítico do fix round 1
 * de `PredioSlot.tsx`, já corrigido) e ficava apagado de qualquer jeito,
 * então nenhuma ordem de pilha chegava a importar. A comparação entre a
 * CAMADA DA CENA e a CAMADA DO FALLBACK agora é resolvida inteira em
 * `PredioSlot.tsx` (o invólucro que envolve `<Predio>` por fora leva
 * `z-0` de propósito) — este `<div>` só precisa de posição (`fixed inset-0`)
 * para o canvas ficar parado atrás da rolagem, como o brief da Task 8 pede.
 * Se a Task 8 precisar de um `z-index` aqui, é para ordenar coisas DENTRO
 * desta própria cena (canvas vs. as âncoras de objeto abaixo) — uma decisão
 * local dela, independente da pilha entre cena e fallback.
 */
export function Predio(props: { dict: Dictionary; locale: Locale; vsync: number }) {
  // Nenhuma prop é lida ainda — o `void` só evita "variável não usada" até a
  // Task 8 de fato consumi-las.
  void props
  return (
    <div data-testid="predio-canvas" className="fixed inset-0">
      <Canvas />
    </div>
  )
}

/**
 * Âncora de objeto clicável sobre o canvas — a Task 8 usa ESTE componente
 * para cada objeto (rack, backup, prancheta...), em vez de um `<a>` cru.
 *
 * `tabIndex={-1}` NÃO É OPCIONAL, e por isso vem embutido aqui em vez de
 * documentado só em prosa: o invólucro que `PredioSlot.tsx` põe ao redor de
 * `<Predio>` leva `aria-hidden="true"` enquanto a cena está montada (ver a
 * questão arquitetural documentada lá) — e a regra WAI-ARIA é que NENHUM
 * elemento focável pode viver dentro de um `aria-hidden`. `aria-hidden`
 * sozinho tira a árvore de acessibilidade, mas NÃO tira o foco de teclado; só
 * `tabIndex={-1}` faz isso (sem desligar o clique do mouse, que é o que essas
 * âncoras existem para receber — diferente de `inert`, que desligaria os
 * dois).
 *
 * A invariante morava só num comentário em `PredioSlot.tsx` (arquivo que a
 * Task 8 CONSOME, não edita) e nada quebrava se ela fosse ignorada, porque os
 * testes de `PredioSlot` dublam `Predio` inteiro. Vive aqui agora — no
 * arquivo que a Task 8 de fato edita — como um componente pronto, não só um
 * lembrete: usar `<a>` cru em vez deste componente é a única forma de violar
 * a invariante, e passa a ser a exceção visível, não a norma silenciosa.
 * `tests/unit/predio-scene.test.tsx` prova que o próprio componente não pode
 * ser usado para produzir um `tabIndex` diferente de -1.
 */
export function AncoraDeObjeto({
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode }) {
  // `children` desestruturado e escrito explícito no JSX (em vez de deixar
  // dentro do `...props` espalhado) só para o `jsx-a11y/anchor-has-content`
  // conseguir ver, estaticamente, que a âncora nunca fica sem conteúdo
  // acessível — o lint não sabe olhar dentro de um spread.
  return (
    <a {...props} tabIndex={-1}>
      {children}
    </a>
  )
}
