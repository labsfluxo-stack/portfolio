'use client'
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
 */
export function Predio(props: { dict: Dictionary; locale: Locale; vsync: number }) {
  // Nenhuma prop é lida ainda — o `void` só evita "variável não usada" até a
  // Task 8 de fato consumi-las.
  void props
  return (
    <div data-testid="predio-canvas" className="fixed inset-0 -z-10">
      <Canvas />
    </div>
  )
}
