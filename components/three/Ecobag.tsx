'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { COR_LONA, criarTexturaEcobag } from './ecobag-textura'

/**
 * A ecobag do brinde: um paralelepípedo de cantos arredondados (o corpo) e
 * duas alças em tubo (o mesmo par cilindro+toro da caneca, adaptado — ver
 * `Caneca.tsx` para a decisão de licença que rege as duas peças: nada
 * baixado, tudo construído de primitivas, porque um `.glb` de marketplace
 * proíbe exatamente o que um export estático faz.
 *
 * POR QUE `RoundedBoxGeometry` (de `three/examples/jsm`) E NÃO
 * `BoxGeometry` PURO. Já existe precedente no projeto para importar de
 * `three/examples/jsm` sem virar dependência nova — `portico-geometry.ts`
 * já faz `import { mergeGeometries } from 'three/examples/jsm/utils/...'`
 * — então isto continua dentro do pacote `three` já instalado, não é um
 * pacote novo. E a razão de precisar dela: um `BoxGeometry` cru tem quinas
 * de 90° exatas, que é o jeito mais rápido de uma caixa 3D ler como
 * "primitiva de tutorial" em vez de "objeto de pano" — o mesmo defeito que
 * o brief avisa ("a tote that renders as a flat card"). `RoundedBoxGeometry`
 * arredonda as arestas mantendo os MESMOS seis grupos de material e o MESMO
 * mapeamento de UV por face que `BoxGeometry` já usa (ver o código-fonte em
 * `node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js`: a
 * classe estende `BoxGeometry` e só desloca vértices) — é o que permite
 * continuar tratando cada face como uma superfície previsível para
 * estampar a marca, do mesmo jeito que o UV do cilindro é prev
 * previsível em `caneca-textura.ts`.
 */

/** Corpo em unidades arbitrárias, na mesma ordem de grandeza da caneca
 *  (RAIO 0,42, ALTURA 0,92 em `Caneca.tsx`) — "roughly the same bounding
 *  volume" do brief, para as duas peças lerem como o mesmo conjunto na
 *  mesma distância de câmera. PROFUNDIDADE não é um detalhe pequeno: uma
 *  ecobag rasa demais (< 20% da largura) lê como cartão; uma bolsa de pano
 *  real tem um fole visível quando olhada de três quartos, e é esse fole
 *  — não o print — que primeiro avisa o olho "isto tem volume". */
const LARGURA = 0.74
const ALTURA = 0.78
const PROFUNDIDADE = 0.24
const RAIO_CANTO = 0.05
const SEGMENTOS_CANTO = 3

/** Perfil do material: sem `clearcoat`, `roughness` alta — o oposto
 *  deliberado da louça vidrada da caneca (`meshPhysicalMaterial` com
 *  `clearcoat=1`, `roughness=0,24` em `Caneca.tsx`). Algodão cru não tem
 *  brilho de verniz nenhum; um especular estreito aqui leria como plástico
 *  laminado, não como lona. */
const TECIDO = { roughness: 0.86, metalness: 0 }

/**
 * As alças: cada uma é um `TubeGeometry` seguindo uma `CatmullRomCurve3` de
 * cinco pontos — não um toro, ao contrário da caneca. O toro da caneca
 * funciona porque a alça é uma peça de cerâmica RÍGIDA e FECHADA (um laço
 * inteiro, ver o comentário em `Caneca.tsx` sobre por que virou "toro
 * inteiro, não mais um arco"); a alça de uma ecobag é o OPOSTO — uma fita
 * costurada na boca do saco em DOIS pontos, sem nada ligando esses pontos
 * por dentro do tecido. Um arco aberto entre dois pontos de costura é,
 * aqui, o formato correto, não uma versão incompleta do formato certo.
 *
 * Os dois pontos de ancoragem de cada alça ficam em Z OPOSTOS (uma perto da
 * NO PLANO DO PAINEL, NÃO ATRAVESSANDO A PROFUNDIDADE.
 *
 * A primeira versão ancorava cada alça com um pé na frente e o outro nas
 * costas, cruzando por cima da abertura. A intenção era mostrar
 * profundidade, mas um arco que anda em Z projeta como uma LINHA quando
 * visto de frente: numa captura do modal as duas alças apareciam como dois
 * toquinhos verticais, e a peça lia como uma caixa branca com antenas.
 *
 * Ecobag de verdade tem DUAS alças, uma costurada no painel da frente e
 * outra no de trás, e cada uma arca na LARGURA — os dois pés na mesma face,
 * separados em X. É esse arco, e o vão de luz debaixo dele, que diz "isto
 * se pendura no ombro".
 */
const ALCA = {
  /** Metade da distância entre os dois pés de uma alça, em X. */
  vao: 0.3,
  /** Quanto o pé afunda abaixo da borda de cima — o suficiente para a alça
   *  parecer costurada, não pousada em cima. */
  enterrado: 0.015,
  /** Altura do topo do arco acima da borda de cima do corpo. */
  altura: 0.2,
  raioTubo: 0.019,
}

/**
 * Ângulo de repouso — e por que a conta AQUI é diferente da conta de
 * `ANGULO_REPOUSO` em `Caneca.tsx`, embora o objetivo pareça o mesmo.
 *
 * A caneca gira porque sua face impressa é uma FAIXA CURVA: uma parte da
 * marca sai de quadro (ocultada pela própria silhueta do cilindro) se o
 * ângulo passar de um teto exato, e por isso aquele arquivo deriva um
 * limite rígido em radianos a partir da largura da faixa.
 *
 * O painel frontal da ecobag é uma face PLANA (`RoundedBoxGeometry`, grupo
 * de material 4 — ver `criarTexturaEcobag`). Uma face plana não tem
 * silhueta escondendo pedaço nenhum dela conforme gira: o texto nunca é
 * "cortado por trás de si mesmo" como no cilindro, só sofre escorço em
 * perspectiva. Então o problema aqui não é "quanto cabe" — é só esse: um
 * ângulo pequeno demais deixa a peça de frente demais, chapada, lendo como
 * cartão; um ângulo grande demais escorça o nome até ficar difícil de ler.
 * O valor abaixo é o meio-termo observado nas capturas do inspetor (ver
 * `.superpowers/brindes/`), não uma fórmula geométrica como a da caneca —
 * registrando a diferença aqui para não parecer que a conta foi esquecida.
 */
const ANGULO_REPOUSO = 0.44
const OSCILACAO = { amplitude: 0.12, periodoS: 7 }

/** Mesmo hook de `Caneca.tsx`, duplicado pelo mesmo motivo que
 *  `resolveSansFamily` está duplicada em `ecobag-textura.ts`: cada peça
 *  precisa poder carregar sem arrastar as outras. */
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

  const textura = useMemo(() => criarTexturaEcobag({ corMarca, nomeMarca }), [corMarca, nomeMarca])
  useEffect(() => () => textura.dispose(), [textura])

  // `RoundedBoxGeometry` não está no catálogo padrão do react-three-fiber
  // (só as classes de `three/src` entram sozinhas como tag JSX); construída
  // uma vez, fora de qualquer dependência que mude por interação — as
  // dimensões do corpo são constantes do módulo, não estado do React.
  const geometriaCorpo = useMemo(
    () => new RoundedBoxGeometry(LARGURA, ALTURA, PROFUNDIDADE, SEGMENTOS_CANTO, RAIO_CANTO),
    [],
  )
  useEffect(() => () => geometriaCorpo.dispose(), [geometriaCorpo])

  // As curvas das duas alças. `useMemo` com `[]`: os pontos de controle são
  // constantes (`ALCA`), então a curva não precisa ser recalculada a cada
  // troca de cor ou nome — só a textura do painel frontal muda com isso.
  const curvaAlcaFrente = useMemo(() => construirCurvaAlca(PROFUNDIDADE * 0.34), [])
  const curvaAlcaCostas = useMemo(() => construirCurvaAlca(-PROFUNDIDADE * 0.34), [])

  // Ângulo ABSOLUTO a cada quadro, nunca `+=` — mesma razão de `Caneca.tsx`:
  // o acumulado dependeria de todo `delta` anterior, e uma aba em segundo
  // plano deixaria a ecobag numa pose diferente da de outra sessão.
  useFrame((estado) => {
    if (reduzido) return
    const grupo = grupoRef.current
    if (!grupo) return
    const fase = (estado.clock.elapsedTime / OSCILACAO.periodoS) * Math.PI * 2
    grupo.rotation.y = ANGULO_REPOUSO + Math.sin(fase) * OSCILACAO.amplitude
  })

  return (
    <group ref={grupoRef} rotation={[0, ANGULO_REPOUSO, 0]}>
      {/* O corpo. Seis grupos de material, na mesma ordem que
          `RoundedBoxGeometry`/`BoxGeometry` sempre usa: direita, esquerda,
          topo, base, FRENTE, costas (ver o código-fonte citado no
          cabeçalho do arquivo). Só a frente (`material-4`) recebe a
          textura com a marca — as outras cinco são lona lisa, a mesma cor
          de fundo da textura (`COR_LONA`), para as bordas arredondadas
          nunca revelarem uma emenda de cor entre uma face e a vizinha. */}
      <mesh castShadow receiveShadow geometry={geometriaCorpo}>
        <meshStandardMaterial attach="material-0" color={COR_LONA} {...TECIDO} />
        <meshStandardMaterial attach="material-1" color={COR_LONA} {...TECIDO} />
        <meshStandardMaterial attach="material-2" color={COR_LONA} {...TECIDO} />
        <meshStandardMaterial attach="material-3" color={COR_LONA} {...TECIDO} />
        <meshStandardMaterial attach="material-4" map={textura} {...TECIDO} />
        <meshStandardMaterial attach="material-5" color={COR_LONA} {...TECIDO} />
      </mesh>

      {/* As duas alças, NA COR DA MARCA e não na lona crua. Mesma razão da
          pala do boné: o nome impresso é pequeno e só se lê de perto, então
          até conseguir ler a peça não parecia marcada. Um elemento grande na
          cor entrega "isto é da minha marca" na primeira olhada — e alça em
          contraste é o acabamento mais comum numa ecobag promocional de
          verdade, então a escolha não custa verossimilhança. */}
      <mesh castShadow>
        <tubeGeometry args={[curvaAlcaFrente, 48, ALCA.raioTubo, 10, false]} />
        <meshStandardMaterial color={corMarca} {...TECIDO} />
      </mesh>
      <mesh castShadow>
        <tubeGeometry args={[curvaAlcaCostas, 48, ALCA.raioTubo, 10, false]} />
        <meshStandardMaterial color={corMarca} {...TECIDO} />
      </mesh>
    </group>
  )
}

/**
 * Os cinco pontos de controle de UMA alça, na face `z`. O arco anda em X e
 * Y e mantém Z constante — ver o comentário de `ALCA` para por que a versão
 * anterior, que andava em Z, virava uma linha vista de frente.
 */
function construirCurvaAlca(z: number): THREE.CatmullRomCurve3 {
  const topoY = ALTURA / 2
  const vaoX = ALCA.vao / 2
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(-vaoX, topoY - ALCA.enterrado, z),
    new THREE.Vector3(-vaoX * 0.82, topoY + ALCA.altura * 0.66, z),
    new THREE.Vector3(0, topoY + ALCA.altura, z),
    new THREE.Vector3(vaoX * 0.82, topoY + ALCA.altura * 0.66, z),
    new THREE.Vector3(vaoX, topoY - ALCA.enterrado, z),
  ])
}

export function Ecobag({ corMarca, nomeMarca }: { corMarca: string; nomeMarca: string }) {
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
      {/* Mesmo estúdio de `Caneca.tsx` — mesmas posições e intensidades de
          `Lightformer`, de propósito: é o que faz as duas peças lerem como
          fotografadas no mesmo estúdio, não em cenas diferentes. Ver o
          comentário completo em `Caneca.tsx` para o porquê da luz de
          contorno fria estar numa intensidade baixa (0,32). */}
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" color="#F5F3EF" intensity={3.2} scale={[6, 4]} position={[-1.4, 3, 2]} />
        <Lightformer form="rect" color="#F5F3EF" intensity={2.2} scale={[3, 5]} position={[2.6, 1, 1.6]} />
        <Lightformer form="rect" color="#38BDF8" intensity={0.32} scale={[5, 5]} position={[-3.1, -1, -2.4]} />
      </Environment>
      <directionalLight castShadow position={[2.4, 3.2, 2.8]} intensity={1.8} />
      <ambientLight intensity={0.22} />
      <Corpo corMarca={corMarca} nomeMarca={nomeMarca} />
    </Canvas>
  )
}
