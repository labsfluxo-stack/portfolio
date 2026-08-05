'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import type { Group } from 'three'
import type { System } from '@/content/systems'
import { useConstellationData, type ConstellationGraph } from './useConstellationData'

const LAYOUT_RADIUS = 2.4
const MIN_NODE_RADIUS = 0.16
const MAX_NODE_RADIUS = 0.5
const MIN_LINE_WIDTH = 0.6
const MAX_LINE_WIDTH = 2.2
const ROTATION_SPEED = 0.05
// Quão rápido a órbita segue o mouse -- baixo de propósito, "parallax
// suave" pede um lerp lento, não a câmera grudando no ponteiro.
const PARALLAX_EASE = 0.04
const PARALLAX_STRENGTH = 0.18

/**
 * Lê a cor real de um custom property do design system (`app/globals.css`)
 * em vez de repetir o hex aqui -- regra do brief. Só roda no cliente: este
 * arquivo inteiro é carregado por `next/dynamic` com `ssr: false`
 * (`ConstellationSlot.tsx`), então `window` sempre existe quando isto
 * executa, mas o fallback ainda protege contra o valor vir vazio (custom
 * property renomeada, folha de estilo ainda não aplicada).
 */
function readCssColor(variable: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim()
  return value || fallback
}

type ThemeColors = { text: string; data: string }

function toVector3(position: { x: number; y: number; z: number }): [number, number, number] {
  return [position.x * LAYOUT_RADIUS, position.y * LAYOUT_RADIUS, position.z * LAYOUT_RADIUS]
}

function Graph({ graph, colors }: { graph: ConstellationGraph; colors: ThemeColors }) {
  const group = useRef<Group>(null)
  const parallax = useRef({ x: 0, y: 0 })

  useFrame((state, delta) => {
    const node = group.current
    if (!node) return
    node.rotation.y += delta * ROTATION_SPEED

    // Parallax suave: a órbita segue o ponteiro com um lerp lento, nunca
    // gruda nele -- `state.pointer` já vem normalizado (-1..1) pelo r3f.
    parallax.current.x += (state.pointer.y * PARALLAX_STRENGTH - parallax.current.x) * PARALLAX_EASE
    parallax.current.y += (state.pointer.x * PARALLAX_STRENGTH - parallax.current.y) * PARALLAX_EASE
    node.rotation.x = parallax.current.x
    node.rotation.z = parallax.current.y
  })

  return (
    <group ref={group}>
      {graph.edges.map((edge) => {
        const from = graph.nodes.find((node) => node.slug === edge.source)
        const to = graph.nodes.find((node) => node.slug === edge.target)
        if (!from || !to) return null
        return (
          <Line
            key={`${edge.source}-${edge.target}`}
            points={[toVector3(from.position), toVector3(to.position)]}
            color={colors.data}
            lineWidth={MIN_LINE_WIDTH + edge.weight * (MAX_LINE_WIDTH - MIN_LINE_WIDTH)}
            transparent
            opacity={0.55}
          />
        )
      })}
      {graph.nodes.map((node) => (
        <mesh key={node.slug} position={toVector3(node.position)}>
          <sphereGeometry args={[MIN_NODE_RADIUS + node.size * (MAX_NODE_RADIUS - MIN_NODE_RADIUS), 24, 24]} />
          <meshBasicMaterial color={colors.text} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * A cena de verdade -- grafo dos sistemas do dono em three.js, via
 * react-three-fiber. Nunca é chamada diretamente: `ConstellationSlot.tsx` a
 * carrega por `next/dynamic` com `ssr: false`, depois de decidir (WebGL
 * disponível, sem `prefers-reduced-motion`, largura >= 768px) que ela deve
 * substituir o fallback SVG.
 *
 * Sem bloom, sem pós-processamento, sem partícula extra -- só os nós e as
 * arestas do grafo, nas cores do design system. `frameloop` alterna entre
 * "always" (rotação contínua) e "demand" (parado) conforme a cena entra ou
 * sai da viewport, para não gastar GPU enquanto o visitante lê o resto da
 * página.
 */
export function Constellation({ systems }: { systems: readonly System[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(true)
  const graph = useConstellationData(systems)
  const colors = useMemo<ThemeColors>(
    () => ({
      text: readCssColor('--color-text', '#F5F3EF'),
      data: readCssColor('--color-data', '#38BDF8'),
    }),
    [],
  )

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => setInView(entry?.isIntersecting ?? true), {
      threshold: 0,
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={containerRef} className="h-full w-full">
      <Canvas
        aria-hidden="true"
        frameloop={inView ? 'always' : 'demand'}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [0, 0, 6], fov: 45 }}
      >
        <Graph graph={graph} colors={colors} />
      </Canvas>
    </div>
  )
}
