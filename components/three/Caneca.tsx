'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import { COR_CERAMICA, criarTexturaCaneca } from './caneca-textura'

/**
 * A caneca do brinde: um cilindro (o corpo) e um toro parcial (a alça),
 * nada baixado — a mesma decisão de licença que rege `Portico.tsx` (ver
 * `docs/superpowers/plans/2026-08-20-dobra-tematica.md`, pendência 1): um
 * `.glb` de marketplace, mesmo "Standard"/"Royalty Free", proíbe exatamente
 * o que um export estático faz (o arquivo fica baixável pela aba de rede), e
 * o único modelo CC0 encontrado mora atrás de um login que este ambiente não
 * alcança. Construir de primitivas não é o plano B: o UV de um cilindro é
 * PREVISÍVEL — U dá a volta, V sobe —, e é exatamente essa previsibilidade
 * que permite posicionar a marca com precisão em `caneca-textura.ts`.
 *
 * Só é montado depois que `CanecaSlot.tsx` confirma WebGL E depois que o
 * modal foi aberto (`BrindeModal.tsx` só renderiza `<CanecaSlot>` com
 * `aberto === true`) — visitante que nunca clica no botão do fim de partida
 * nunca busca o chunk de three.js que este arquivo carrega.
 */

/** Proporções da caneca, em unidades arbitrárias — só a razão entre elas
 *  importa, a câmera define a distância. */
const RAIO = 0.42
const ALTURA = 0.92
const SEGMENTOS = 56

/** A alça: raio maior do laço, raio do tubo, e o arco em radianos — menor
 *  que 2π de propósito, para sobrar a abertura que embutimos no corpo. */
const ALCA = { raioMaior: 0.32, raioTubo: 0.068, arco: Math.PI * 1.62 }

/** rad/s do giro automático — uma volta a cada ~16s. Devagar o bastante para
 *  ler como vitrine girando sozinha, rápido o bastante para não parecer
 *  parado num modal que só fica aberto por alguns segundos. */
const VELOCIDADE = (Math.PI * 2) / 16

/**
 * Ângulo de repouso: o instante inicial, e o único ângulo sob
 * `prefers-reduced-motion: reduce` (job 2 do brief — quem pediu menos
 * movimento continua vendo a marca, só não vê o giro).
 *
 * O PONTO DE PARTIDA É `Math.PI`, NÃO ZERO. `CylinderGeometry` (ver o
 * código-fonte em `node_modules/three/src/geometries/CylinderGeometry.js`)
 * mapeia `u=0` para `theta=0`, e `theta=0` dá o vértice `(sin 0, y, cos 0) =
 * (0, y, +raio)` — o ponto que já olha de frente para a câmera padrão
 * (posicionada em `+Z`, olhando para `-Z`) sem rotação nenhuma no grupo. A
 * faixa da marca (`caneca-textura.ts`) fica centrada em `u=0,5`, que cai em
 * `theta=π` — o ponto `(0, y, -raio)`, o FUNDO da caneca. Sem `Math.PI`
 * aqui, a marca nasceria olhando para o lado errado.
 *
 * Por cima disso, um desvio menor que a metade da própria largura da faixa
 * (`FAIXA_LARGURA` em `caneca-textura.ts`, 0,32 da volta ⇒ meia-largura
 * ≈ 1,0 rad) gira a caneca para uma pose de três quartos — a marca ainda
 * inteira no quadro, a alça entrando de lado — em vez de um plano frontal
 * chapado.
 */
const ANGULO_REPOUSO = Math.PI - 0.5

/**
 * `prefers-reduced-motion`, lido dentro da própria cena — mesmo motivo do
 * `useStill()` de `Portico.tsx`: quem garante que o giro não acontece é o
 * giro, não quem montou o componente por fora. Ao contrário do Pórtico,
 * aqui a cena INTEIRA continua montada sob movimento reduzido — só o giro
 * para —, porque este componente só existe depois de um clique deliberado
 * (o botão do fim de partida), não como decoração de carregamento de
 * página.
 */
function useReduzido(): boolean {
  const [reduzido, setReduzido] = useState(false)
  useEffect(() => {
    const consulta = window.matchMedia('(prefers-reduced-motion: reduce)')
    const ler = () => setReduzido(consulta.matches)
    ler()
    consulta.addEventListener('change', ler)
    return () => consulta.removeEventListener('change', ler)
  }, [])
  return reduzido
}

function Corpo({ corMarca, nomeMarca }: { corMarca: string; nomeMarca: string }) {
  const grupoRef = useRef<THREE.Group>(null)
  const reduzido = useReduzido()

  // Regerada a cada troca de cor ou nome — os dois campos do modal mudam a
  // cada tecla/seleção, e a textura é pequena (1024×512): o custo de
  // redesenhar é imperceptível perto do custo de manter um segundo caminho
  // de atualização parcial só para isto.
  const textura = useMemo(() => criarTexturaCaneca({ corMarca, nomeMarca }), [corMarca, nomeMarca])
  useEffect(() => () => textura.dispose(), [textura])

  useFrame((_, delta) => {
    if (reduzido) return
    const grupo = grupoRef.current
    if (grupo) grupo.rotation.y += delta * VELOCIDADE
  })

  return (
    <group ref={grupoRef} rotation={[0, ANGULO_REPOUSO, 0]}>
      {/* O corpo. `openEnded` fica em falso (padrão): as tampas fecham o
          cilindro, então a boca e o fundo da caneca também recebem o
          material cerâmico em vez de ficarem ocos — visível no ângulo de
          repouso, que olha ligeiramente de cima. */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[RAIO, RAIO, ALTURA, SEGMENTOS]} />
        <meshPhysicalMaterial
          map={textura}
          // Louça vidrada: dielétrica (sem metalicidade nenhuma), rugosidade
          // baixa e um clearcoat forte — é o par (especular estreito,
          // reflexo do ambiente) que separa "cerâmica vidrada" de
          // "plástico fosco", que teria rugosidade alta e clearcoat zero.
          roughness={0.24}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.12}
          envMapIntensity={1.5}
        />
      </mesh>

      {/* A alça: um toro parcial (arco < 2π) alinhado para que o EIXO DO
          FURO aponte na direção radial (X) — é a orientação em que, olhando
          da lateral da caneca, o laço aparece de perfil, exatamente como
          uma alça de verdade. Partindo do toro padrão do three.js (furo no
          eixo Z, laço no plano XY), a rotação em Y de 90° troca o eixo do
          furo de Z para X. */}
      <mesh
        castShadow
        position={[RAIO + ALCA.raioTubo * 0.35, 0, 0]}
        rotation={[Math.PI / 2, Math.PI / 2, 0]}
      >
        <torusGeometry args={[ALCA.raioMaior, ALCA.raioTubo, 14, 48, ALCA.arco]} />
        <meshPhysicalMaterial
          color={COR_CERAMICA}
          roughness={0.24}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.12}
          envMapIntensity={1.5}
        />
      </mesh>
    </group>
  )
}

export function Caneca({ corMarca, nomeMarca }: { corMarca: string; nomeMarca: string }) {
  return (
    <Canvas
      aria-hidden="true"
      shadows="percentage"
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ fov: 34, near: 0.1, far: 20, position: [0, 0.18, 2.6] }}
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 1.15
      }}
    >
      {/*
        Mesma técnica de `Portico.tsx`: um estúdio de planos emissivos
        capturado num cube map, zero HDRI baixado — regra dura do projeto
        (ver o cabeçalho de `portico-textures.ts`). `frames={1}` porque nada
        aqui se move: o mapa de ambiente é calculado uma vez.
      */}
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" color="#F5F3EF" intensity={3.2} scale={[6, 4]} position={[-1.4, 3, 2]} />
        <Lightformer form="rect" color="#F5F3EF" intensity={2.2} scale={[3, 5]} position={[2.6, 1, 1.6]} />
        <Lightformer form="rect" color="#38BDF8" intensity={0.9} scale={[4, 4]} position={[-2.6, -1, -2]} />
      </Environment>
      <directionalLight castShadow position={[2.4, 3.2, 2.8]} intensity={1.8} />
      <ambientLight intensity={0.22} />
      <Corpo corMarca={corMarca} nomeMarca={nomeMarca} />
    </Canvas>
  )
}
