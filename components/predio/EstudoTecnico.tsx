'use client'
import { Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { PE_DIREITO, LAJE, PILARES } from './predio-arquitetura'

/**
 * ESTUDO DESCARTAVEL de direcao de arte — o andar 07 (Servidores) levado ao
 * fim na linguagem de CORTE TECNICO, para o dono comparar com o marrom atual.
 * Nao e rota publica, nao entra no sitemap, e sai quando a direcao for decidida.
 *
 * A REGRA QUE MANDA AQUI: linha em WebGL NAO tem espessura. `linewidth` e
 * ignorado em praticamente todo navegador (limitacao do ANGLE/OpenGL ES), entao
 * "peso de linha" — que e o que separa desenho tecnico de wireframe de jogo —
 * precisa ser feito por BRILHO e nao por grossura. Estrutura clara, mobiliario
 * apagado. Foi medido: tentar `linewidth: 2` nao muda um pixel.
 */

const CEU = '#070d16'
const ESTRUTURA = '#5eb0ff'
const MOBILIARIO = '#2f6796'
const ACENTO = '#ffb454'
const PREENCHIMENTO = '#0a1320'

const PROPS = [
  'bookcaseClosed',
  'bookcaseClosedWide',
  'bookcaseOpen',
  'computerScreen',
  'computerKeyboard',
  'desk',
  'chairDesk',
  'cardboardBoxClosed',
  'trashcan',
  'plantSmall1',
] as const

const caminho = (nome: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? '/portfolio'}/predio/${nome}.glb`

/**
 * Uma peca: preenchimento escuro que OCLUI o que esta atras, mais as arestas.
 * Sem o preenchimento o desenho vira raio-x e perde profundidade — todas as
 * linhas do fundo aparecem por cima das da frente e o olho nao separa nada.
 */
function Peca({
  geometria,
  cor,
  ...props
}: { geometria: THREE.BufferGeometry; cor: string } & Record<string, unknown>) {
  const arestas = useMemo(() => new THREE.EdgesGeometry(geometria, 18), [geometria])
  return (
    <group {...props}>
      <mesh geometry={geometria}>
        <meshBasicMaterial color={PREENCHIMENTO} polygonOffset polygonOffsetFactor={1} />
      </mesh>
      <lineSegments geometry={arestas}>
        <lineBasicMaterial color={cor} />
      </lineSegments>
    </group>
  )
}

function Prop({
  nome,
  cor = MOBILIARIO,
  ...props
}: { nome: string; cor?: string } & Record<string, unknown>) {
  const { scene } = useGLTF(caminho(nome))
  const geos = useMemo(() => {
    const saida: THREE.BufferGeometry[] = []
    scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) {
        const g = m.geometry.clone()
        g.applyMatrix4(m.matrixWorld)
        saida.push(g)
      }
    })
    return saida
  }, [scene])
  return (
    <group {...props}>
      {geos.map((g, i) => (
        <Peca key={i} geometria={g} cor={cor} />
      ))}
    </group>
  )
}

/** Hachura da laje em corte — a convencao real de arquitetura para "cortado". */
function Hachura({ y, largura = 26 }: { y: number; largura?: number }) {
  const geo = useMemo(() => {
    const pontos: number[] = []
    for (let x = -largura / 2; x < largura / 2; x += 0.22) {
      pontos.push(x, y, 0.02, x + LAJE, y - LAJE, 0.02)
    }
    return new THREE.BufferGeometry().setAttribute(
      'position',
      new THREE.Float32BufferAttribute(pontos, 3),
    )
  }, [y, largura])
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color={ESTRUTURA} transparent opacity={0.42} />
    </lineSegments>
  )
}

/** Cota vertical: a marca que diz "isto e um desenho, nao uma foto". */
function Cota({ x, de, ate }: { x: number; de: number; ate: number }) {
  const geo = useMemo(() => {
    const p = [x, de, 0, x, ate, 0, x - 0.3, de, 0, x + 0.3, de, 0, x - 0.3, ate, 0, x + 0.3, ate, 0]
    return new THREE.BufferGeometry().setAttribute(
      'position',
      new THREE.Float32BufferAttribute(p, 3),
    )
  }, [x, de, ate])
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color={ACENTO} transparent opacity={0.85} />
    </lineSegments>
  )
}

function Estrutura() {
  const laje = useMemo(() => new THREE.BoxGeometry(26, LAJE, 7), [])
  const pilar = useMemo(() => new THREE.BoxGeometry(0.62, PE_DIREITO, 0.62), [])
  return (
    <>
      <Peca geometria={laje} cor={ESTRUTURA} position={[0, -PE_DIREITO / 2 - LAJE / 2, 0]} />
      <Peca geometria={laje} cor={ESTRUTURA} position={[0, PE_DIREITO / 2 + LAJE / 2, 0]} />
      <Hachura y={-PE_DIREITO / 2} />
      <Hachura y={PE_DIREITO / 2 + LAJE} />
      {PILARES.map((x) => (
        <Peca key={x} geometria={pilar} cor={ESTRUTURA} position={[x, 0, -1.2]} />
      ))}
      <Cota x={-12.4} de={-PE_DIREITO / 2} ate={PE_DIREITO / 2} />
    </>
  )
}

/** O andar 07: fileira de racks ao fundo, estacao de monitoramento na frente. */
function Andar() {
  const chao = -PE_DIREITO / 2
  return (
    <>
      <Estrutura />
      {/* fileira de racks — bookcase em linha le como rack de servidor */}
      {[-9.2, -7.6, -6.0, -4.4].map((x, i) => (
        <Prop
          key={x}
          nome={i % 2 ? 'bookcaseClosed' : 'bookcaseOpen'}
          cor={i === 1 ? ACENTO : MOBILIARIO}
          position={[x, chao, -2.1]}
          scale={1.35}
        />
      ))}
      {[4.6, 6.2, 7.8].map((x) => (
        <Prop key={x} nome="bookcaseClosedWide" position={[x, chao, -2.1]} scale={1.35} />
      ))}
      {/* estacao de monitoramento */}
      <Prop nome="desk" position={[0.4, chao, 0.9]} scale={1.25} />
      <Prop nome="computerScreen" position={[0.1, chao + 0.92, 0.6]} scale={1.1} />
      <Prop nome="computerKeyboard" position={[0.5, chao + 0.9, 1.25]} scale={1.1} />
      <Prop nome="chairDesk" position={[0.6, chao, 2.1]} scale={1.2} rotation={[0, Math.PI, 0]} />
      {/* detalhe humano: e o que separa "sala" de "cenario" */}
      <Prop nome="cardboardBoxClosed" position={[-2.4, chao, 1.4]} scale={1.3} />
      <Prop nome="cardboardBoxClosed" position={[-2.0, chao + 0.42, 1.5]} scale={1.05} />
      <Prop nome="trashcan" position={[2.9, chao, 1.5]} scale={1.2} />
      <Prop nome="plantSmall1" position={[-11.0, chao, 0.6]} scale={1.5} />
    </>
  )
}

export function EstudoTecnico() {
  return (
    <div className="fixed inset-0" style={{ background: CEU }}>
      <Canvas
        camera={{ fov: 44, near: 0.5, far: 90, position: [0, 0, 12.5] }}
        gl={{ alpha: false, antialias: true }}
        onCreated={({ gl, scene }) => {
          gl.toneMapping = THREE.NoToneMapping
          scene.background = new THREE.Color(CEU)
        }}
      >
        <Suspense fallback={null}>
          <Andar />
        </Suspense>
      </Canvas>
    </div>
  )
}

PROPS.forEach((n) => useGLTF.preload(caminho(n)))
