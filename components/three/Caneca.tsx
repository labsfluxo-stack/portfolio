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

/**
 * A alça: raio do laço, raio do tubo, quanto o laço é esticado na vertical,
 * e quanto dele fica ENTERRADO na parede do corpo.
 *
 * TORO INTEIRO, não mais um arco de 1,62π. O arco parcial existia para
 * "sobrar a abertura que embutimos no corpo", mas isso deixava duas pontas
 * cortadas que apareciam sempre que a abertura não caísse exatamente contra
 * a parede. Um laço fechado, com um pedaço dentro do cilindro opaco, resolve
 * a mesma coisa sem ponta nenhuma para orientar errado.
 *
 * O laço também era grande demais e mal posicionado: raio 0,32 centrado em
 * x≈0,444 punha o anel entre x=0,056 e x=0,832 contra uma parede em
 * `RAIO`=0,42 — quase metade do laço enterrada, e o que sobrava de fora lia
 * como um coto grudado, não como alça.
 *
 * `esticoY` existe porque um toro tem o laço CIRCULAR: alto e fundo na mesma
 * medida. Alça de caneca de verdade é mais alta do que é funda, então o laço
 * é esticado na vertical — sem isso, ou a alça fica baixa demais para o dedo,
 * ou funda demais para a caneca.
 */
const ALCA = { raioMaior: 0.17, raioTubo: 0.055, esticoY: 1.5, enterrado: 0.05 }

/**
 * A caneca OSCILA, não dá a volta.
 *
 * O giro contínuo anterior (uma volta a cada 16s) brigava com a única coisa
 * que este modal existe para mostrar. A marca é impressa numa faixa de 32%
 * da circunferência (`FAIXA_LARGURA` em `caneca-textura.ts`), impressa UMA
 * vez: de um cilindro só se lê bem o arco central de frente, então a cada
 * volta de 16s o nome ficava inteiro e legível por volta de 5 — nos outros
 * ~11 estava de perfil, cortado na silhueta ou escondido atrás. Verificado
 * em captura: "Aurora Eventos" saía cortado no "s" em 1440×900 e em 390×844.
 *
 * Repetir a faixa em volta resolveria o corte e criaria outro problema — dar
 * a volta com a marca é adesivo de caneca de brinde barato, exatamente o que
 * a peça não pode parecer. Então o movimento é que cede: um balanço curto em
 * torno do repouso mantém o volume e o brilho especular vivos (é o que diz
 * "isto é 3D, não uma figura") sem nunca tirar o nome do campo de leitura.
 */
const OSCILACAO = { amplitude: 0.22, periodoS: 7 }

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
 * Por cima disso, um desvio pequeno gira a caneca para uma pose de três
 * quartos — a alça entrando de lado — em vez de um plano frontal chapado.
 *
 * QUANTO ESSE DESVIO PODE SER, e por que ele era grande demais. A versão
 * anterior o limitava à metade da largura da faixa (`FAIXA_LARGURA` = 0,32
 * da volta ⇒ meia-faixa ≈ 1,0 rad) e usava 0,5. Essa é a conta errada: ela
 * pergunta se o desvio cabe DENTRO da faixa, quando o que decide é se a
 * faixa cabe dentro do que o olho ALCANÇA. De um cilindro só se vê o arco de
 * ±90° em torno da frente, então a borda da faixa fica visível enquanto
 * `|desvio| + meia-faixa ≤ 90°`, ou seja `|desvio| ≤ 90° − 57,6° = 32,4°`
 * (0,566 rad). Somando o repouso antigo (28,6°) à oscilação, o total passava
 * de 48° — e o nome saía cortado na silhueta, como as capturas em 1440×900 e
 * 390×844 mostraram.
 *
 * Aqui o repouso gasta 17°, a oscilação gasta no máximo 12,6°, e a soma
 * (29,6°) fica abaixo do teto de 32,4° com folga — a pose continua de três
 * quartos e o nome nunca encosta na borda.
 */
const ANGULO_REPOUSO = Math.PI - 0.3

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

  // Ângulo ABSOLUTO a cada quadro, nunca `+=`: o acumulado dependia da soma
  // de todos os `delta` anteriores, então uma aba em segundo plano (que
  // segura os quadros) ou um quadro longo deixava a caneca numa pose
  // diferente da de outra sessão. Aqui a pose é função do relógio, então
  // qualquer instante do balanço é reprodutível e o repouso é sempre o mesmo.
  useFrame((estado) => {
    if (reduzido) return
    const grupo = grupoRef.current
    if (!grupo) return
    const fase = (estado.clock.elapsedTime / OSCILACAO.periodoS) * Math.PI * 2
    grupo.rotation.y = ANGULO_REPOUSO + Math.sin(fase) * OSCILACAO.amplitude
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

      {/* A alça. O toro padrão do three.js já nasce com o laço no plano XY e
          o furo no eixo Z — que é exatamente a orientação de uma alça, já que
          o corpo é um cilindro de eixo Y. A versão anterior girava a malha em
          X e em Y (90° cada), o que tirava o laço do plano que contém o eixo
          da caneca: a alça deixava de ser vista de perfil e virava uma foice
          atravessada. Aqui não há rotação nenhuma, de propósito.

          O X posiciona o laço de forma que só `ALCA.enterrado` entre na
          parede; o resto fica de fora, que é o que faz o dedo caber. */}
      <mesh
        castShadow
        position={[RAIO - ALCA.enterrado + ALCA.raioMaior + ALCA.raioTubo, 0, 0]}
        scale={[1, ALCA.esticoY, 1]}
      >
        <torusGeometry args={[ALCA.raioMaior, ALCA.raioTubo, 16, 64]} />
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
        {/* A luz de contorno fria, que separa a cerâmica clara do painel escuro.
            INTENSIDADE BAIXA DE PROPÓSITO: a 0,9 ela não lia como luz, lia
            como um caco azul de borda dura atrás da alça — visível nas duas
            capturas. A causa é a soma de três coisas, e nenhuma delas é um
            defeito sozinho: o mapa de ambiente tem 128px, a cerâmica é lisa
            (`roughness` 0,24 com `clearcoat` 1) e um plano emissivo pequeno
            e saturado. Superfície lisa + mapa de baixa resolução devolve o
            retângulo do `Lightformer` quase espelhado, em vez de um borrão.
            Baixar a intensidade é o que conserta sem endurecer o brilho da
            cerâmica, que é justamente o que faz a peça parecer esmaltada. */}
        <Lightformer form="rect" color="#38BDF8" intensity={0.32} scale={[5, 5]} position={[-3.1, -1, -2.4]} />
      </Environment>
      <directionalLight castShadow position={[2.4, 3.2, 2.8]} intensity={1.8} />
      <ambientLight intensity={0.22} />
      <Corpo corMarca={corMarca} nomeMarca={nomeMarca} />
    </Canvas>
  )
}
