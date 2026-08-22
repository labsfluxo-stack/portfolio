'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import { COR_SARJA, criarTexturaBone } from './bone-textura'

/**
 * O boné do brinde: uma esfera parcial (a copa) e uma aba extrudada (a
 * pala) — o terceiro par de primitivas do conjunto, na mesma linha da
 * caneca (cilindro+toro) e da ecobag (caixa arredondada+tubo). Nada
 * baixado, mesma razão de licença registrada no cabeçalho de `Caneca.tsx`
 * e `Ecobag.tsx`.
 *
 * POR QUE UMA ESFERA E NÃO SEIS PAINÉIS DE VERDADE. Um boné real é
 * costurado em seis gomos triangulares, não é uma calota lisa — mas seis
 * gomos como GEOMETRIA (seis planos levemente curvos, com costura entre
 * eles) multiplicam vértice e complexidade por um ganho visual que o
 * OLHO não paga de volta a esta distância de câmera (a mesma que a
 * caneca usa, `position: [0, 0.18, 2.6]`). A esfera dá o volume certo de
 * graça; a costura — o detalhe que realmente separa "boné" de "capacete
 * liso", e a defesa direta contra o "a cap that renders as a grey dome"
 * que o brief avisa — está na TEXTURA (`desenharCosturas` em
 * `bone-textura.ts`), não na malha. Ver o comentário lá.
 */

/** Copa em unidades arbitrárias, mesma ordem de grandeza da caneca (RAIO
 *  0,42) e da ecobag (LARGURA 0,74) — "roughly the same bounding volume"
 *  do brief. */
const RAIO = 0.4
const SEGMENTOS_LARGURA = 48
const SEGMENTOS_ALTURA = 24

/**
 * Quanto da esfera vira copa, medido do polo (topo) para baixo. `Math.PI`
 * inteiro seria a esfera completa; um boné cobre até mais ou menos o
 * "equador" da cabeça.
 *
 * ONDE A BORDA PARA DECIDE A SILHUETA. Em 0,58π (≈104°) a calota passava do
 * equador e voltava a fechar para dentro antes de terminar: o ponto mais
 * largo ficava ACIMA da borda, e um corpo que é mais largo em cima do que
 * embaixo lê como cogumelo, não como copa apoiada numa cabeça. Foi o que as
 * capturas mostraram — a peça parecia um domo, não um boné.
 *
 * 0,52π (≈94°) põe a borda praticamente no equador: a largura cresce
 * monotonicamente de cima para baixo, que é a silhueta de qualquer coisa
 * que se enfia na cabeça. Os poucos graus além de 90° dão à borda uma
 * dobrinha para dentro em vez de um corte a prumo.
 */
const THETA_COPA = 0.52 * Math.PI

/**
 * A copa não é uma esfera perfeita — um `scale` não-uniforme no MESH (não
 * no grupo que oscila; ver `Corpo` para o porquê da distinção) achata um
 * pouco a altura e alonga um pouco a profundidade. Sem isso a copa lê como
 * "metade de uma bola de basquete", que é exatamente o defeito que o brief
 * avisa ("a cap that renders as a grey dome"). Uma cabeça é oval, mais
 * comprida de frente para trás do que de lado a lado — `z` maior que `x`
 * reproduz isso sem inventar geometria nova.
 */
// `y` SUBIU de 0,94 para 1,08 junto com a mudança de `THETA_COPA`: uma
// calota que para no equador é naturalmente mais rasa que uma que passa
// dele, e sem compensar a altura o boné ficaria achatado como um disco.
const ESCALA_COPA = { x: 1, y: 1.08, z: 1.08 }

/** O botão do topo — o detalhe de boné mais barato de fazer e mais caro de
 *  esquecer: sem ele, o ápice da copa é um ponto liso demais, e o olho
 *  sente falta antes de conseguir dizer o quê. */
const BOTAO_RAIO = 0.032

/**
 * A pala (o bico do boné): uma `THREE.Shape` 2D extrudada, não curvada por
 * vértice — a mesma decisão que a ecobag tomou pelo brim rígido em vez de
 * dobrado: um boné de aba RETA (o corte "snapback") é tão real quanto um de
 * aba curva, e uma peça rígida inclinada é muito mais barata que uma
 * malha com curvatura própria para um ganho que some a esta distância de
 * câmera.
 *
 * A forma nasce em ESPAÇO PRÓPRIO — X é "quanto projeta para a frente" (0
 * na borda que encosta na copa, positivo saindo), Y é "largura" (simétrica
 * em torno de 0) — porque é mais fácil desenhar um contorno pensando assim
 * do que já pensando nos eixos do mundo. `construirGeometriaPala` faz UM
 * `rotateX(-90°)` depois de extrudar para levar essa forma ao eixo certo
 * (ver o comentário lá); a extrusão em Z (a espessura) vira a espessura de
 * verdade (eixo Y do resultado) só depois dessa rotação.
 */
const PALA = {
  /** Quanto a base da pala entra por baixo da borda da copa — o mesmo
   *  papel do `enterrado` da alça da caneca e da ecobag: o suficiente para
   *  não sobrar uma emenda visível entre copa e pala. */
  embutido: 0.025,
  /** Quanto a pala projeta para a frente, a partir da borda da copa.
   *
   *  GRANDE. A pala é a única peça do boné que nenhum outro objeto tem —
   *  copa redonda existe em gorro, em capacete, em domo. Nas primeiras
   *  capturas ela media 0,3 contra um raio de copa de 0,42 e sumia atrás da
   *  própria silhueta: sem ela em evidência, o olho não tinha como decidir
   *  que aquilo era um boné. */
  projecao: 0.46,
  /** Largura da pala na base (onde encosta na copa). */
  larguraBase: 0.62,
  espessura: 0.036,
  /** Inclinação para baixo, em radianos — sem ela a pala fica na horizontal,
   *  que lê como pá de ventilador, não como bico de boné. */
  inclinacao: 0.34,
}

/**
 * Ângulo de repouso — em duas partes, porque resolvem dois problemas
 * diferentes, a mesma separação que `ANGULO_REPOUSO` de `Caneca.tsx` faz
 * entre "olhar para a câmera" e "pose de três quartos".
 *
 * PARTE 1 — POR QUE `-π/2`, a conta que substitui o `Math.PI` da caneca.
 * `SphereGeometry` (ver `node_modules/three/src/geometries/SphereGeometry.js`,
 * linhas 98–108) mapeia `u = ix/widthSegments` para `phi = phiStart + u·
 * phiLength` e o vértice para `x = -ringRadius·cos(phi)`, `z = ringRadius·
 * sin(phi)`. Em `u=0` (`phi=0`): `x=-ringRadius`, `z=0` — perfil, de lado.
 * Em `u=0,5` (`phi=π`): `x=+ringRadius`, `z=0` — ainda de lado, só que o
 * OUTRO lado. É em `u=0,25` (`phi=π/2`) que `x=0, z=+ringRadius` — de
 * frente para a câmera padrão (`+Z`), sem rotação nenhuma.
 *
 * A faixa da marca (`bone-textura.ts`) fica centrada em `u=0,5` — a mesma
 * convenção da caneca, por consistência entre os três brindes — que
 * corresponde ao ponto `(+ringRadius, y, 0)`. Rotacionar o grupo em Y por
 * um ângulo `θ` leva `(x,z)` a `(x·cosθ + z·sinθ, −x·sinθ + z·cosθ)`
 * (`Object3D.rotateY`, regra da mão direita). Substituindo `(x,z) =
 * (ringRadius, 0)` e resolvendo para `x'=0, z'=+ringRadius` (de frente):
 * `cosθ=0` e `−sinθ=1`, ou seja `θ=−π/2`. Verificado nas capturas do
 * inspetor (`.superpowers/brindes/`), não só na conta — ver o relatório.
 *
 * PARTE 2 — O DESVIO DE TRÊS QUARTOS, E POR QUE O NÚMERO ABAIXO NÃO É SÓ A
 * CONTA DE ±90° DA CANECA. A mesma lógica de `ANGULO_REPOUSO` em
 * `Caneca.tsx` (de uma superfície convexa só se vê o arco de ±90° em torno
 * do ponto de frente) prevê, para `FAIXA_LARGURA=0,30` (bone-textura.ts,
 * meia-faixa 54°), um teto de `90°−54°=36°` (0,628 rad). NA PRÁTICA esse
 * teto se mostrou otimista: capturado no inspetor com `desvio=0,32 rad`
 * (bem dentro do teto teórico), "Sua Marca" já saía com o "a" cortado na
 * silhueta e a pala virava de perfil. A câmera aqui é em PERSPECTIVA (não
 * ortográfica) a distância finita (`position: [0,0.18,2.6]`), e perto do
 * limbo de uma esfera o texto encolhe por escorço bem antes da borda
 * geométrica exata — a conta de ±90° ignora esse escorço. Testado então
 * por CAPTURA, não só por fórmula (a mesma disciplina que o brief pede):
 * 0,16 rad ficou ótimo, 0,22 rad ainda ficou bom com margem visível, 0,24
 * rad já tocava a borda, 0,32 rad cortava. O par abaixo soma no máximo
 * 0,22 rad — dentro da faixa confirmada boa, com folga do que a captura
 * mostrou começar a apertar.
 */
const ANGULO_REPOUSO_BASE = -Math.PI / 2
/**
 * POSE DE TRÊS QUARTOS, e agora dá para pagar por ela.
 *
 * De frente, a pala projeta na direção da câmera e encurta até virar uma aba
 * caída — lê como bico apontado para o chão, não como pala. Boné se
 * reconhece de perfil: é ali que a pala mostra o comprimento que nenhum
 * outro objeto redondo tem.
 *
 * O orçamento existe porque a faixa da marca mudou de latitude. Perto do
 * polo o arco legível era estreito e cada grau de desvio custava caro; no
 * painel frontal (equador) a faixa de 0,24 da circunferência ocupa 86° e a
 * meia-faixa mede 43°.
 *
 * A CONTA GEOMÉTRICA DÁ FOLGA DEMAIS, E ELA MENTE. O limite de |desvio| =
 * 90° − 43° = 47° supõe câmera ortográfica; com uma perspectiva a distância
 * finita, o arco de fato visível de um corpo redondo é MENOR que ±90°, e a
 * borda chega antes. Verificado em captura: a 0,5 rad o nome já encostava
 * na silhueta, com a fórmula prometendo folga de sobra.
 *
 * 0,36 é medido, não derivado — gira o bastante para a pala mostrar
 * comprimento (que é o que faz o olho dizer "boné") e deixa o nome inteiro
 * na face visível. A mesma armadilha já tinha sido registrada quando esta
 * cena foi escrita; a fórmula da caneca, que é um cilindro, não transfere
 * para uma calota.
 */
const ANGULO_REPOUSO_DESVIO = 0.36
const OSCILACAO = { amplitude: 0.1, periodoS: 7 }

/** Mesmo hook de `Caneca.tsx`/`Ecobag.tsx`, duplicado pelo mesmo motivo. */
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

/**
 * A geometria da pala, pronta para ser posicionada. Ver o comentário de
 * `PALA` para o porquê do espaço próprio (X=projeção, Y=largura) e por que
 * um `rotateX(-90°)` sozinho resolve o realinhamento: a rotação leva
 * `(x,y,z) → (x, z, −y)` (`Object3D.rotateX`), então a espessura da
 * extrusão (que nasce no eixo Z) vira o novo eixo Y — espessura de
 * verdade, para cima e para baixo — e a largura (que nasce em Y) vira Z
 * com o sinal invertido. O sinal invertido não importa: a pala é simétrica
 * em torno do centro, espelhar a largura produz o mesmo contorno.
 *
 * `translate` depois de `rotate`: a extrusão nasce com a espessura entre
 * `z=0` e `z=espessura` (nunca negativa — é assim que `ExtrudeGeometry`
 * sempre constrói), então, já como novo eixo Y, ela vai de `0` a
 * `espessura`. Centralizar em `y=0` é o que permite tratar a espessura
 * como simétrica ao redor do plano em que a pala se apoia, em vez de a
 * pala inteira flutuar meio passo acima de onde deveria.
 */
function construirGeometriaPala(): THREE.ExtrudeGeometry {
  const meioLargura = PALA.larguraBase / 2
  const forma = new THREE.Shape()
  forma.moveTo(-PALA.embutido, -meioLargura)
  forma.lineTo(-PALA.embutido, meioLargura)
  forma.quadraticCurveTo(PALA.projecao * 0.58, meioLargura * 0.9, PALA.projecao, 0)
  forma.quadraticCurveTo(PALA.projecao * 0.58, -meioLargura * 0.9, -PALA.embutido, -meioLargura)

  const geometria = new THREE.ExtrudeGeometry(forma, {
    depth: PALA.espessura,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.006,
    bevelSegments: 2,
    curveSegments: 16,
  })
  geometria.rotateX(-Math.PI / 2)
  geometria.translate(0, -PALA.espessura / 2, 0)
  return geometria
}

function Corpo({ corMarca, nomeMarca }: { corMarca: string; nomeMarca: string }) {
  const grupoRef = useRef<THREE.Group>(null)
  const reduzido = useReduzido()

  const textura = useMemo(() => criarTexturaBone({ corMarca, nomeMarca }), [corMarca, nomeMarca])
  useEffect(() => () => textura.dispose(), [textura])

  const geometriaPala = useMemo(() => construirGeometriaPala(), [])
  useEffect(() => () => geometriaPala.dispose(), [geometriaPala])

  // Ponto de encaixe da pala: a borda de baixo da copa, exatamente no
  // meridiano de frente (`u=0,5`, ver `ANGULO_REPOUSO_BASE`) — o mesmo
  // ponto para onde aquele ângulo já aponta a câmera, então a pala nasce
  // "olhando para fora" sem precisar de nenhuma rotação própria além da
  // inclinação para baixo. `Math.sin`/`Math.cos` aqui são os mesmos
  // `ringRadius`/`y` de `SphereGeometry`, na MESMA escala não-uniforme
  // que o mesh da copa usa (`ESCALA_COPA`) — sem aplicar a escala aqui, a
  // pala encaixaria no raio de uma esfera PERFEITA, não na copa achatada
  // que está de fato desenhada, e sobraria (ou faltaria) uma fresta.
  const raioNaBorda = RAIO * Math.sin(THETA_COPA)
  const yNaBorda = RAIO * Math.cos(THETA_COPA)
  const encaixePala: [number, number, number] = [raioNaBorda * ESCALA_COPA.x, yNaBorda * ESCALA_COPA.y, 0]

  useFrame((estado) => {
    if (reduzido) return
    const grupo = grupoRef.current
    if (!grupo) return
    const fase = (estado.clock.elapsedTime / OSCILACAO.periodoS) * Math.PI * 2
    grupo.rotation.y = ANGULO_REPOUSO_BASE + ANGULO_REPOUSO_DESVIO + Math.sin(fase) * OSCILACAO.amplitude
  })

  return (
    <group ref={grupoRef} rotation={[0, ANGULO_REPOUSO_BASE + ANGULO_REPOUSO_DESVIO, 0]}>
      {/* A copa. `scale` não-uniforme NO MESH, não no grupo — ver o
          comentário de `ESCALA_COPA`. Se estivesse no grupo, escalaria a
          pala junto (que já tem sua própria forma correta e não deveria
          ser esticada), e a rotação de oscilação, que também vive no
          grupo, ficaria compondo com uma escala não-uniforme a cada
          quadro — inofensivo aqui, mas motivo a menos para arriscar. */}
      <mesh castShadow receiveShadow scale={[ESCALA_COPA.x, ESCALA_COPA.y, ESCALA_COPA.z]}>
        <sphereGeometry args={[RAIO, SEGMENTOS_LARGURA, SEGMENTOS_ALTURA, 0, Math.PI * 2, 0, THETA_COPA]} />
        <meshStandardMaterial map={textura} roughness={0.78} metalness={0} />
      </mesh>

      {/* O botão do topo. Levemente enterrado no ápice (`* 0,7`, não `*
          1`) para não sobrar uma esfera pousada em cima de outra — o
          mesmo cuidado do `enterrado` da alça da caneca, adaptado. */}
      <mesh castShadow position={[0, RAIO * ESCALA_COPA.y + BOTAO_RAIO * 0.7, 0]}>
        <sphereGeometry args={[BOTAO_RAIO, 12, 10]} />
        <meshStandardMaterial color={COR_SARJA} roughness={0.5} metalness={0} />
      </mesh>

      {/* A pala. A inclinação (`rotation.z`) gira em torno do PRÓPRIO
          ponto de encaixe (a origem deste grupo), então a dobra acontece
          onde a pala de verdade se dobra — na costura com a copa — e não
          na ponta. Sinal negativo: `rotation.z` positivo levantaria a
          ponta (ver a derivação em `ANGULO_REPOUSO_BASE`, mesma regra da
          mão direita, agora em torno de Z); negativo abaixa. */}
      <group position={encaixePala} rotation={[0, 0, -PALA.inclinacao]}>
        {/* A PALA SAI NA COR DA MARCA, não na sarja crua. Boné promocional
            de verdade quase sempre traz a cor em contraste na pala, e aqui
            ela resolve um problema concreto: a marca impressa é pequena e
            só se lê de perto, então até conseguir ler o nome a peça não
            parecia marcada. Um bloco grande de cor dá a leitura "isto é da
            minha marca" na primeira olhada, que é o que o modal existe para
            entregar. */}
        <mesh castShadow geometry={geometriaPala}>
          <meshStandardMaterial color={corMarca} roughness={0.82} metalness={0} />
        </mesh>
      </group>
    </group>
  )
}

export function Bone({ corMarca, nomeMarca }: { corMarca: string; nomeMarca: string }) {
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
      {/* Mesmo estúdio de `Caneca.tsx`/`Ecobag.tsx` — ver o comentário
          completo em `Caneca.tsx`. As três peças fotografadas no mesmo
          set é o que faz o conjunto ler como conjunto. */}
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
