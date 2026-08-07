'use client'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import {
  CONTAINER,
  SWAY_STEP,
  createPlan,
  createPose,
  createSway,
  layerShade,
  samplePose,
  stepSway,
  valueAt,
} from './portico-model'
import { buildArchitecture } from './portico-architecture'
import {
  REEVING,
  type Rig,
  SPREADER_EAR_Y,
  bridgeGeometry,
  containerCastingsGeometry,
  containerFrameGeometry,
  containerPlateGeometry,
  rigFor,
  runwayGeometry,
  spreaderGeometry,
  trolleyGeometry,
} from './portico-geometry'
import {
  SIDE_RIBS,
  cargoAtlas,
  containerSkinShader,
  corrugationNormalMap,
  floorTextures,
  grimeMap,
  resolveMonoFamily,
  skinWearMap,
  steelWearMap,
  unitNoise,
  type CargoAtlas,
  type CargoCell,
} from './portico-textures'
import { buildYard, markFor, yardShade } from './portico-yard'
import type { StackLayer } from '@/content/types'

/**
 * Uma ponte rolante montando uma arquitetura de software.
 *
 * Nunca é montada direto: `PorticoSlot.tsx` a carrega por `next/dynamic` com
 * `ssr: false`, e só depois de confirmar que o navegador aguenta. O chunk do
 * three.js, com isso, nunca é referenciado pelo HTML inicial — o orçamento de
 * JS da página não paga por uma decoração.
 *
 * Duas decisões governam o acabamento:
 *
 * 1. **Luz de ambiente, não lâmpada.** O que faz metal parecer metal é
 *    refletir um entorno. `<Environment>` com `<Lightformer>` monta um
 *    estúdio de planos emissivos e o captura num cube map — reflexo de
 *    qualidade fotográfica sem baixar HDRI nenhum, o que é obrigatório num
 *    site que é export estático.
 * 2. **Nenhum pós-processamento.** Sem bloom, sem grão, sem aberração
 *    cromática. Empilhar efeito é justamente o que envelhece uma cena; o
 *    ganho aqui vem de luz, material e movimento.
 *
 * E um princípio governa o desenho: **o significado fica na frente, a escala
 * vem de trás**. A pirâmide é a arquitetura e é o que precisa ser lido; o
 * pátio de origem e as pilhas paradas entram atrás do corredor, recuando na
 * névoa, para dar porte de terminal em operação sem disputar a leitura.
 *
 * Tudo é `aria-hidden`: é decoração. A informação que ela ilustra vive em
 * texto de verdade na seção Stack.
 */

// ── Paleta ────────────────────────────────────────────────────────────────

type Palette = Record<'bg' | 'surface2' | 'border' | 'text' | 'muted' | 'faint' | 'data', string>

/**
 * Lê a cor real dos custom properties do design system (`app/globals.css`)
 * em vez de repetir hex aqui. Só roda no cliente — este arquivo inteiro é
 * carregado com `ssr: false` — mas o fallback ainda protege contra a
 * propriedade vir vazia (renomeada, folha ainda não aplicada).
 */
function readPalette(): Palette {
  const style = getComputedStyle(document.documentElement)
  const read = (name: string, fallback: string): string => style.getPropertyValue(name).trim() || fallback
  return {
    bg: read('--color-bg', '#08090C'),
    surface2: read('--color-surface-2', '#161A20'),
    border: read('--color-border', '#1F232B'),
    text: read('--color-text', '#F5F3EF'),
    muted: read('--color-muted', '#878C96'),
    faint: read('--color-faint', '#4A505A'),
    data: read('--color-data', '#38BDF8'),
  }
}

/** Mesma tinta, outro valor — nunca uma cor nova. */
const shade = (hex: string, factor: number): string => new THREE.Color(hex).multiplyScalar(factor).getStyle()

// ── Enquadramento ─────────────────────────────────────────────────────────

/**
 * Teleobjetiva (fov baixo), pouca altura e pouco desvio lateral: o suficiente
 * para o objeto ter três dimensões, longe o bastante para não distorcer.
 * Perspectiva forçada é o vocabulário de quem quer impressionar.
 *
 * A elevação subiu em relação à cena anterior por um motivo geométrico: o que
 * faz a pirâmide ler como zigurate é o DEGRAU entre patamares, e o degrau só
 * aparece quando a câmera vê a laje do patamar de baixo na frente do de cima.
 * Rasteiro demais, os seis patamares colapsam numa parede.
 */
const VIEW = {
  fov: 29,
  azimuth: 0.38,
  elevation: 0.165,
  /** Sobra em volta da máquina, em fração do enquadramento. */
  margin: 1.03,
} as const

/**
 * Caixa envolvente do que precisa caber: a arquitetura montada e a ponte por
 * cima dela. Sai das medidas reais — se o dicionário crescer, o enquadramento
 * abre junto.
 */
type Bounds = { x: number; top: number; z: number; targetY: number }

/**
 * A névoa, medida A PARTIR DA CÂMERA — nunca em coordenada de mundo.
 *
 * A distância da câmera é resolvida pelo formato do contêiner na página, então
 * um alcance fixo em metros deixaria o recuo diferente em 1440 e em 1024: numa
 * largura o fundo sumiria, na outra chegaria na frente. Amarrado à distância,
 * a profundidade lê igual em qualquer viewport.
 *
 * `start` é a folga depois do alvo: a pirâmide inteira sai da névoa intocada,
 * e o que a névoa pega é o pátio atrás do corredor — inclusive a máquina
 * quando ela vai lá buscar, que é justamente o efeito.
 */
const FOG = { start: 5.5, span: 34 } as const

/**
 * Quanto antes da parada a cena abre, em segundos.
 *
 * Decisão de apresentação, e por isso mora aqui e não no modelo: `samplePose`
 * continua sem saber onde alguém olha. O suficiente para dois ou três
 * movimentos — quem chega vê a máquina fechar a pirâmide, e não uma pose já
 * pronta que pareceria um cenário estático.
 */
const OPENING_LEAD = 16

const cornersOf = (bounds: Bounds): [number, number, number][] =>
  [-1, 1].flatMap((sx) =>
    [0, 1].flatMap((sy) =>
      [-1, 1].map((sz): [number, number, number] => [sx * bounds.x, sy * bounds.top, sz * bounds.z]),
    ),
  )

/**
 * A distância da câmera é resolvida a partir do formato real do contêiner na
 * página, não fixada num número: o mesmo enquadramento fecha numa faixa larga
 * (1440) e num painel quase quadrado (1024) sem cortar a máquina nem
 * deixá-la nadando no vazio.
 *
 * Projetar os oito cantos da caixa envolvente e resolver para cada um a
 * distância em que ele ainda cabe no frustum é o único jeito de acertar isso
 * com a câmera inclinada: estimar "altura aparente" a olho erra justamente na
 * ponta de baixo, e a máquina sai da tela pelo chão — que é a única parte que
 * não pode faltar, porque é onde a sombra de contato a ancora.
 */
function Framing({ bounds }: { bounds: Bounds }) {
  const camera = useThree((state) => state.camera)
  const scene = useThree((state) => state.scene)
  const width = useThree((state) => state.size.width)
  const height = useThree((state) => state.size.height)

  useLayoutEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return
    const aspect = width / Math.max(1, height)
    const tanV = Math.tan((VIEW.fov * Math.PI) / 360)
    const tanH = tanV * aspect

    const flat = Math.cos(VIEW.elevation)
    const dir = new THREE.Vector3(
      Math.sin(VIEW.azimuth) * flat,
      Math.sin(VIEW.elevation),
      Math.cos(VIEW.azimuth) * flat,
    )
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), dir).normalize()
    const up = new THREE.Vector3().crossVectors(dir, right).normalize()
    const target = new THREE.Vector3(0, bounds.targetY, 0)
    const corner = new THREE.Vector3()

    let distance = 0
    for (const [x, y, z] of cornersOf(bounds)) {
      corner.set(x, y, z).sub(target)
      const depth = corner.dot(dir)
      distance = Math.max(
        distance,
        depth + (Math.abs(corner.dot(right)) / tanH) * VIEW.margin,
        depth + (Math.abs(corner.dot(up)) / tanV) * VIEW.margin,
      )
    }

    camera.fov = VIEW.fov
    camera.position.copy(dir).multiplyScalar(distance).add(target)
    camera.lookAt(target)
    camera.updateProjectionMatrix()

    if (scene.fog instanceof THREE.Fog) {
      scene.fog.near = distance + FOG.start
      scene.fog.far = distance + FOG.start + FOG.span
    }
  }, [camera, scene, width, height, bounds])

  return null
}

// ── Recursos ──────────────────────────────────────────────────────────────

type Assets = {
  plate: THREE.BufferGeometry
  frame: THREE.BufferGeometry
  castings: THREE.BufferGeometry
  runway: THREE.BufferGeometry
  bridge: THREE.BufferGeometry
  trolley: THREE.BufferGeometry
  spreader: THREE.BufferGeometry
  cable: THREE.BufferGeometry
  rope: THREE.MeshPhysicalMaterial
  skin: THREE.MeshPhysicalMaterial
  steel: THREE.MeshPhysicalMaterial
  casting: THREE.MeshPhysicalMaterial
  lamp: THREE.MeshStandardMaterial
  floor: THREE.MeshStandardMaterial
  floorSide: number
  atlas: CargoAtlas
  /**
   * Três números por unidade — giro, e empurrão em X e em Z. Ver `unitNoise`:
   * saem do índice, nunca de sorteio.
   */
  jitter: Float32Array
  /** Contêineres que a máquina move (a arquitetura) e os que ficam parados. */
  moving: number
  total: number
  dispose: () => void
}

/**
 * Quanto uma unidade sai do lugar exato. Fração de grau e poucos centímetros:
 * abaixo do que alguém consegue apontar, acima do que o olho aceita como
 * grade. É o desalinhamento que faz um pátio parecer operado por gente.
 */
const UNIT_YAW = 0.012
const UNIT_NUDGE = 0.07

/** Três por instância: giro em torno de Y, empurrão em X e em Z. */
function unitJitter(count: number): Float32Array {
  const jitter = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    jitter[i * 3] = (unitNoise(i, 2) - 0.5) * UNIT_YAW
    jitter[i * 3 + 1] = (unitNoise(i, 3) - 0.5) * UNIT_NUDGE
    jitter[i * 3 + 2] = (unitNoise(i, 4) - 0.5) * UNIT_NUDGE
  }
  return jitter
}

function buildAssets(
  cells: CargoCell[],
  footprints: readonly { x: number; z: number }[],
  moving: number,
  rig: Rig,
  palette: Palette,
  family: string,
  anisotropy: number,
  floorHalf: number,
): Assets {
  const disposables: { dispose: () => void }[] = []
  const keep = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item)
    return item
  }
  const tune = <T extends THREE.Texture>(texture: T): T => {
    texture.anisotropy = anisotropy
    return keep(texture)
  }

  // Passo da onda calibrado por face: ~0,23 m, que é o de uma chapa real.
  //
  // `wear` acrescenta amassado raso e risco por cima da onda. É o que impede a
  // luz de ESCORREGAR pela chapa: numa superfície perfeitamente lisa o
  // especular desliza sem quebrar em lugar nenhum, e é justamente isso que faz
  // um render parecer desenho animado. Chapa de contêiner nunca é lisa.
  const sideNormal = tune(corrugationNormalMap({ ribs: SIDE_RIBS, depth: 1.05, band: 0.085, wear: 0.55 }))
  // Um pouco acima de 1: com a oclusão dos vales entrando junto, o relevo
  // aguenta mais inclinação sem virar ruído — e é o par (normal forte, vale
  // escuro) que faz a onda ler como CHAPA DOBRADA em vez de listra impressa.
  const normalScale = new THREE.Vector2(1.05, 1.05)

  // Oclusão, rugosidade e metalicidade da chapa num mapa só — travado na face,
  // porque é ele que carrega o VALE da corrugação e a fresta da cantoneira. É a
  // oclusão que separa relevo de adesivo: sem sombra nenhuma no fundo da onda,
  // o normal map só inclina a luz e o olho lê decalque impresso.
  const skinWear = tune(skinWearMap(SIDE_RIBS))
  // E a história de cada unidade, amostrada com deslocamento por instância.
  const grime = tune(grimeMap())
  const steelWear = tune(steelWearMap())

  // Todas as chapas da cena num atlas só. É o que permite instanciar: um
  // material carrega uma textura, então a marcação de cada contêiner vira uma
  // célula e cada instância recebe o deslocamento da sua.
  const atlas = cargoAtlas(
    cells,
    {
      stencil: shade(palette.text, 0.62),
      code: shade(palette.text, 0.34),
      // O painel de aplicação continua dentro da paleta: é `--color-text` num
      // valor mais baixo, a mesma tinta dos estênceis. O que sai fora dela é
      // só a marca impressa por cima — a exceção autorizada.
      panel: shade(palette.text, 0.9),
    },
    family,
  )
  tune(atlas.texture)
  atlas.texture.channel = 1

  const plate = keep(containerPlateGeometry())
  plate.setAttribute('aCargo', new THREE.InstancedBufferAttribute(atlas.offsets, 2))

  // Onde cada unidade amostra o mapa de história. Dois canais da mesma semente
  // que gira e empurra a caixa, para que mancha, giro e empurrão de um mesmo
  // contêiner andem juntos em vez de se contradizerem.
  const drift = new Float32Array(cells.length * 2)
  for (let i = 0; i < cells.length; i++) {
    drift[i * 2] = unitNoise(i, 0)
    drift[i * 2 + 1] = unitNoise(i, 1)
  }
  plate.setAttribute('aWear', new THREE.InstancedBufferAttribute(drift, 2))

  const floor = floorTextures(
    palette.bg,
    palette.border,
    footprints.map((spot) => ({ ...spot, length: CONTAINER.length, width: CONTAINER.width })),
    floorHalf,
  )
  keep(floor.map)
  keep(floor.alpha)

  const skin = keep(
    new THREE.MeshPhysicalMaterial({
      map: atlas.texture,
      normalMap: sideNormal,
      normalScale,
      // As três informações de superfície saem do MESMO mapa e da mesma
      // amostragem — oclusão no vermelho, rugosidade no verde, metalicidade no
      // azul, que é a embalagem que o three lê por padrão.
      aoMap: skinWear,
      aoMapIntensity: 1,
      roughnessMap: skinWear,
      metalnessMap: skinWear,
      // Chapa pintada é dielétrica com verniz por cima: pouco metalness,
      // rugosidade média-alta e um clearcoat que devolve o especular sem
      // clarear a tinta. O clearcoat é o que salva uma paleta escura: o
      // brilho de uma camada dielétrica é BRANCO, independente da cor
      // debaixo, então a chapa continua quase preta e mesmo assim acende
      // onde o estúdio a atinge.
      //
      // Os dois fatores valem 1 de propósito: com mapa, o three MULTIPLICA o
      // escalar pelo texel, então qualquer valor menor que 1 aqui achataria a
      // variação que o mapa existe para trazer. Quem manda na faixa é o mapa.
      metalness: 1,
      roughness: 1,
      clearcoat: 0.72,
      clearcoatRoughness: 0.28,
      envMapIntensity: 2.7,
    }),
  )
  containerSkinShader(skin, atlas.scale, grime)

  return {
    plate,
    frame: keep(containerFrameGeometry()),
    castings: keep(containerCastingsGeometry()),
    runway: keep(runwayGeometry(rig)),
    bridge: keep(bridgeGeometry(rig)),
    trolley: keep(trolleyGeometry(rig)),
    spreader: keep(spreaderGeometry()),
    // 9 cm, não 5. A 5 cm o cabo não fecha um pixel nesta distância de câmera,
    // e o spreader passava a ler como peça solta flutuando — foi exatamente o
    // que o dono reportou, duas vezes. O cabo é o que prende a garra à máquina:
    // se ele some, a física da cena some junto.
    cable: keep(new THREE.CylinderGeometry(0.09, 0.09, 1, 8)),
    // Cabo de aço trançado, não chapa pintada: reflete muito mais e quase não
    // tem cor própria. Clarear aqui não é licença de paleta, é o material.
    rope: keep(
      new THREE.MeshPhysicalMaterial({
        color: palette.muted,
        metalness: 1,
        roughness: 0.28,
        envMapIntensity: 5.4,
      }),
    ),
    skin,
    // Aço aparente: metalness alto e rugosidade baixa. Num metal a COR BASE é
    // a própria refletância, e é por isso que a primeira versão usava
    // `--color-border` e a máquina inteira sumia: um difuso quase preto
    // continua quase preto por mais luz que se jogue nele. O clearcoat sozinho
    // só acendia as arestas — o corpo seguia invisível.
    //
    // `--color-muted` é o token certo aqui e continua dentro da paleta: é um
    // cinza médio, exatamente a cor de aço industrial pintado.
    //
    // O mapa de desgaste entra aqui como MULTIPLICADOR: o escalar continua
    // marcando o regime (rugosidade baixa, aço aparente) e o mapa quebra o
    // valor em volta dele. Sem essa quebra a viga inteira devolve o mesmo
    // especular de ponta a ponta e vira plástico cromado — o outro jeito de
    // uma cena 3D parecer desenho.
    steel: keep(
      new THREE.MeshPhysicalMaterial({
        color: shade(palette.muted, 0.78),
        aoMap: steelWear,
        roughnessMap: steelWear,
        metalnessMap: steelWear,
        metalness: 0.98,
        roughness: 0.36,
        clearcoat: 1,
        clearcoatRoughness: 0.16,
        envMapIntensity: 4.6,
      }),
    ),
    casting: keep(
      new THREE.MeshPhysicalMaterial({
        color: shade(palette.muted, 0.55),
        aoMap: steelWear,
        roughnessMap: steelWear,
        metalnessMap: steelWear,
        metalness: 1,
        roughness: 0.5,
        clearcoat: 0.85,
        clearcoatRoughness: 0.26,
        envMapIntensity: 3.4,
      }),
    ),
    // A única coisa da cena com `emissive`, e o único uso de `--color-data`:
    // a lâmpada de estado da máquina. Uma lâmpada que não emite não é lâmpada,
    // é adesivo azul — e cor, aqui, é informação.
    lamp: keep(new THREE.MeshStandardMaterial({ color: palette.data, emissive: palette.data, roughness: 0.35 })),
    floor: keep(
      new THREE.MeshStandardMaterial({
        map: floor.map,
        alphaMap: floor.alpha,
        transparent: true,
        depthWrite: false,
        roughness: 0.62,
        metalness: 0.18,
        // O piso é `--color-bg`, a MESMA tinta do fundo da página. Ele só
        // existe visualmente porque recebe luz: é essa diferença que vira a
        // mancha embaixo da máquina, e é sobre ela que a sombra de contato
        // tem onde pousar.
        envMapIntensity: 3.2,
      }),
    ),
    floorSide: floorHalf * 2,
    atlas,
    jitter: unitJitter(cells.length),
    moving,
    total: cells.length,
    dispose: () => {
      for (const item of disposables) item.dispose()
    },
  }
}

// ── Cena ──────────────────────────────────────────────────────────────────

const UP = new THREE.Vector3(0, 1, 0)

function Yard({ layers }: { layers: readonly StackLayer[] }) {
  const gl = useThree((state) => state.gl)
  const anisotropy = useMemo(() => Math.min(8, gl.capabilities.getMaxAnisotropy()), [gl])
  const palette = useMemo(readPalette, [])

  // A arquitetura sai do dicionário, o pátio sai do tamanho da arquitetura, e
  // o ciclo sai dos dois. Nenhum dos três sabe de three.js.
  const architecture = useMemo(() => buildArchitecture(layers), [layers])
  const yard = useMemo(
    () => buildYard(architecture.slots.length, architecture.spare.length),
    [architecture],
  )
  const plan = useMemo(() => createPlan(yard.source, architecture.slots), [yard, architecture])

  // A máquina é dimensionada pelo trabalho: sobe até onde a carga sobe e
  // abraça o alcance dos lugares, sem vão morto entre a viga e a pirâmide.
  const rig = useMemo(() => {
    const reach = [...plan.source, ...plan.target].reduce((far, slot) => Math.max(far, Math.abs(slot.x)), 0)
    return rigFor(plan.peakY, reach)
  }, [plan])

  /** Onde a lâmpada de estado mora, na testeira da casa de máquinas do carro. */
  const lampAt = useMemo((): [number, number, number] => [0, rig.trolleyY + 0.75, 1.6], [rig])

  // O enquadramento fecha na arquitetura montada mais a ponte por cima dela.
  // A profundidade cobre só a pirâmide: o pátio de origem fica de fora de
  // propósito, dissolvido na névoa, porque ele é escala e não assunto.
  //
  // `top` para no carro, não acima dele. A folga que existia aqui punha a
  // instalação flutuando no meio do quadro com um vão morto em cima, e os
  // tirantes do trilho apareciam inteiros — dezesseis hastes em fila, que lê
  // como CERCA. Cortando a fita no carro, o tirante sai do quadro pelo topo, e
  // é o corte que diz "isto continua preso lá em cima".
  const bounds = useMemo(() => {
    const top = rig.trolleyY + 0.35
    return {
      x: rig.railX,
      top,
      z: architecture.depth / 2 + CONTAINER.width,
      // A mira fica pouco acima do MEIO da instalação, e a conta é geométrica,
      // não de gosto: `Framing` resolve a distância projetando os oito cantos
      // da caixa, então uma mira alta obriga a câmera a recuar o quanto for
      // preciso para o canto de BAIXO ainda caber — e a sobra toda vai parar
      // em cima da ponte. Era daí que vinham as duas queixas de uma vez: a
      // máquina pequena no quadro e o vão morto acima dela. Centrada, a mesma
      // caixa cabe uns vinte por cento mais perto; o viés de 0,12 devolve o
      // pouco de sobra para BAIXO, onde há chão e sombra de contato para ela
      // pousar, em vez de céu vazio.
      targetY: top * 0.62,
    }
  }, [rig, architecture])

  /**
   * O chão cobre o pátio inteiro, com folga de uma baia. Sai das plantas reais
   * — se o dicionário crescer e as pilhas paradas recuarem, o chão recua junto
   * em vez de deixar os contêineres do fundo pairando sobre o nada.
   */
  const floorHalf = useMemo(
    () =>
      yard.footprints.reduce(
        (far, spot) => Math.max(far, Math.abs(spot.x) + CONTAINER.length, Math.abs(spot.z) + CONTAINER.length),
        12,
      ),
    [yard],
  )

  const assets = useMemo(() => {
    // A ordem das células é a das instâncias: primeiro os contêineres que a
    // máquina move, depois os que ficam parados no fundo.
    const cells: CargoCell[] = [
      ...architecture.cargo.map((freight) => ({
        mark: markFor(freight.item.name),
        plate: shade(palette.surface2, layerShade(freight.tier)),
        code: freight.label,
      })),
      ...architecture.spare.map((freight, i) => ({
        mark: markFor(freight.item.name),
        plate: shade(palette.surface2, yardShade(i)),
        code: freight.label,
      })),
    ]
    return buildAssets(
      cells,
      yard.footprints,
      architecture.slots.length,
      rig,
      palette,
      resolveMonoFamily(),
      anisotropy,
      floorHalf,
    )
  }, [architecture, yard, rig, palette, anisotropy, floorHalf])

  useEffect(() => assets.dispose, [assets])

  // A fonte mono do site pode não estar pronta quando o estêncil é desenhado.
  // Redesenhar depois de `fonts.ready` custa um repaint de canvas e evita o
  // rótulo sair na fonte de fallback do sistema.
  useEffect(() => {
    let alive = true
    void document.fonts.ready.then(() => {
      if (alive) assets.atlas.redraw()
    })
    return () => {
      alive = false
    }
  }, [assets])

  const plateRef = useRef<THREE.InstancedMesh>(null)
  const frameRef = useRef<THREE.InstancedMesh>(null)
  const castingsRef = useRef<THREE.InstancedMesh>(null)
  const bridgeRef = useRef<THREE.Group>(null)
  const trolleyRef = useRef<THREE.Group>(null)
  const spreaderRef = useRef<THREE.Group>(null)
  const lampRef = useRef<THREE.PointLight>(null)
  const cableRefs = useRef<(THREE.Mesh | null)[]>([])

  /** As três malhas instanciadas andam juntas: mesma matriz, materiais diferentes. */
  const containers = (): (THREE.InstancedMesh | null)[] => [plateRef.current, frameRef.current, castingsRef.current]

  // As pilhas paradas do fundo não se mexem: a matriz de cada uma é escrita
  // uma vez e nunca mais tocada. É o que separa "pátio" de "animação de
  // pátio" — e o que deixa o laço do quadro cuidando só do que trabalha.
  useLayoutEffect(() => {
    const at = new THREE.Matrix4()
    const position = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    const euler = new THREE.Euler()
    const one = new THREE.Vector3(1, 1, 1)
    yard.spare.forEach((slot, i) => {
      const unit = assets.moving + i
      const yaw = assets.jitter[unit * 3] ?? 0
      position.set(slot.x + (assets.jitter[unit * 3 + 1] ?? 0), slot.y, slot.z + (assets.jitter[unit * 3 + 2] ?? 0))
      quaternion.setFromEuler(euler.set(0, yaw, 0))
      at.compose(position, quaternion, one)
      for (const mesh of containers()) mesh?.setMatrixAt(unit, at)
    })
    for (const mesh of containers()) {
      if (mesh) mesh.instanceMatrix.needsUpdate = true
    }
  }, [assets, yard])

  // A cena ABRE perto do fim da montagem, não no zero.
  //
  // Um ciclo honesto — vinte e um contêineres, ida e volta, na curva de um
  // acionamento de verdade — leva minutos, e a parada com a arquitetura
  // completa é o que essa cena existe para mostrar. Começando no zero, quem
  // chega vê a máquina buscando a terceira caixa e vai embora antes da
  // pirâmide fechar. Começando aqui, vê os últimos movimentos, a arquitetura
  // inteira montada e só então a desmontagem — o arco na ordem que importa.
  //
  // É deslocamento de FASE, não corte: o ciclo continua o mesmo, contínuo e
  // determinístico, e no instante zero do modelo a frente segue vazia.
  const motion = useRef({
    clock: Math.max(0, plan.loadTime - OPENING_LEAD),
    spare: 0,
    pose: createPose(plan),
    sway: createSway(),
  })
  const scratch = useMemo(
    () => ({
      a: new THREE.Vector3(),
      b: new THREE.Vector3(),
      d: new THREE.Vector3(),
      at: new THREE.Matrix4(),
      position: new THREE.Vector3(),
      quaternion: new THREE.Quaternion(),
      euler: new THREE.Euler(),
      one: new THREE.Vector3(1, 1, 1),
    }),
    [],
  )

  useFrame((_, delta) => {
    const own = motion.current
    const { pose, sway } = own

    // Passo fixo: a cena é a mesma num notebook de 30 Hz e num monitor de
    // 144 Hz, e o pêndulo do cabo continua determinístico. `delta` é limitado
    // para que voltar de uma aba em segundo plano não teleporte o ciclo.
    own.spare += Math.min(delta, 0.12)
    let steps = 0
    while (own.spare >= SWAY_STEP && steps < 16) {
      own.clock += SWAY_STEP
      samplePose(plan, own.clock, pose)
      stepSway(sway, pose.trolleyX, pose.bridgeZ, rig.pivotY - pose.spreaderY, pose.swayGate)
      own.spare -= SWAY_STEP
      steps += 1
    }
    if (steps === 0) return
    if (steps === 16) own.spare = 0

    const sinX = Math.sin(sway.thetaX)
    const sinZ = Math.sin(sway.thetaZ)
    const drop = Math.cos(sway.thetaX) * Math.cos(sway.thetaZ)

    if (bridgeRef.current) bridgeRef.current.position.z = pose.bridgeZ
    if (trolleyRef.current) trolleyRef.current.position.set(pose.trolleyX, 0, pose.bridgeZ)
    if (lampRef.current) lampRef.current.intensity = pose.lamp * 3.2
    assets.lamp.emissiveIntensity = pose.lamp * 2.6

    // Corpo rígido pendurado no carro: tudo que está no cabo gira em torno do
    // mesmo pivô, cada peça pelo seu próprio braço, agora nos dois planos.
    const armSpreader = rig.pivotY - pose.spreaderY
    if (spreaderRef.current) {
      spreaderRef.current.position.set(
        pose.trolleyX + armSpreader * sinX,
        rig.pivotY - armSpreader * drop,
        pose.bridgeZ + armSpreader * sinZ,
      )
      spreaderRef.current.rotation.set(-sway.thetaZ, 0, sway.thetaX)
    }

    for (let i = 0; i < assets.moving; i++) {
      // O desalinhamento de fábrica de cada unidade acompanha a caixa o ciclo
      // inteiro, inclusive pendurada: um contêiner não fica reto no spreader
      // só porque foi içado, e alinhar tudo na hora do engate devolveria a
      // grade perfeita justamente no movimento que a câmera segue.
      const yaw = assets.jitter[i * 3] ?? 0
      const dx = assets.jitter[i * 3 + 1] ?? 0
      const dz = assets.jitter[i * 3 + 2] ?? 0
      if (i === pose.carried) {
        const arm = rig.pivotY - valueAt(pose.y, i)
        scratch.position.set(
          pose.trolleyX + arm * sinX + dx,
          rig.pivotY - arm * drop,
          pose.bridgeZ + arm * sinZ + dz,
        )
        scratch.euler.set(-sway.thetaZ, yaw, sway.thetaX)
      } else {
        scratch.position.set(valueAt(pose.x, i) + dx, valueAt(pose.y, i), valueAt(pose.z, i) + dz)
        scratch.euler.set(0, yaw, 0)
      }
      scratch.quaternion.setFromEuler(scratch.euler)
      scratch.at.compose(scratch.position, scratch.quaternion, scratch.one)
      for (const mesh of containers()) mesh?.setMatrixAt(i, scratch.at)
    }
    for (const mesh of containers()) {
      if (mesh) mesh.instanceMatrix.needsUpdate = true
    }

    REEVING.forEach((cable, i) => {
      const node = cableRefs.current[i]
      if (!node) return
      scratch.a.set(pose.trolleyX + cable.top[0], rig.pivotY, pose.bridgeZ + cable.top[1])
      const rise = SPREADER_EAR_Y - armSpreader
      scratch.b.set(
        pose.trolleyX + cable.bottom[0] * Math.cos(sway.thetaX) - rise * sinX,
        rig.pivotY + cable.bottom[0] * sinX + rise * drop,
        pose.bridgeZ + cable.bottom[1] * Math.cos(sway.thetaZ) - rise * sinZ,
      )
      scratch.d.subVectors(scratch.b, scratch.a)
      const span = scratch.d.length() || 1
      node.position.copy(scratch.a).addScaledVector(scratch.d, 0.5)
      node.quaternion.setFromUnitVectors(UP, scratch.d.divideScalar(span))
      node.scale.set(1, span, 1)
    })
  })

  return (
    <>
      <Framing bounds={bounds} />

      {/*
        A névoa. É ela que faz o pátio recuar: as pilhas de trás perdem
        contraste com a distância, como perderiam num terminal de verdade, em
        vez de serem apagadas com opacidade — que é o truque que denuncia
        "camada de fundo" em vez de profundidade. A cor é `--color-bg`, a
        mesma do fundo da página, então o que recua não desbota: dissolve.
        `Framing` reescreve o alcance conforme a distância real da câmera.
      */}
      <fog attach="fog" args={[palette.bg, 50, 96]} />

      {/*
        O estúdio. Planos emissivos capturados num cube map: chave larga e
        quente em cima, recorte estreito e forte na direita (é ele que desenha
        a aresta do aço), preenchimento frio e amplo na esquerda, e um retorno
        fraco por baixo para o metal não morrer na sombra. `frames={1}` porque
        nada aqui se mexe: o mapa é calculado uma vez e nunca mais.
      */}
      <Environment resolution={256} frames={1}>
        {/* chave: larga, alta e quente — dá a forma geral */}
        <Lightformer form="rect" color={palette.text} intensity={2.6} scale={[18, 12]} position={[-1, 15, 2]} />
        {/* recorte principal: estreito e forte na direita, o que desenha a aresta */}
        <Lightformer form="rect" color={palette.text} intensity={8} scale={[0.9, 18]} position={[9, 6, 3]} />
        {/* contra-recorte atrás e à esquerda: sem ele, a lateral daquele lado
            vira um bloco preto sem contorno contra um fundo preto */}
        <Lightformer form="rect" color={palette.text} intensity={5} scale={[0.8, 16]} position={[-8, 8, -6]} />
        {/* preenchimento frio e amplo */}
        <Lightformer form="rect" color={palette.muted} intensity={1.9} scale={[10, 14]} position={[-10, 7, 5]} />
        {/* retorno fraco por baixo, para o metal não morrer na sombra */}
        <Lightformer form="rect" color={palette.faint} intensity={1.1} scale={[18, 8]} position={[0, -4, 10]} />
      </Environment>

      {/*
        Uma luz direcional só, alinhada com o recorte: os lightformers moram no
        mapa de ambiente e não projetam sombra nenhuma. É esta que faz o
        patamar de cima escurecer o de baixo — a leitura de profundidade mais
        forte da cena inteira, e o que separa os seis degraus da pirâmide.
      */}
      <directionalLight
        castShadow
        position={[15, 27, 16]}
        intensity={2.6}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
        shadow-camera-near={8}
        shadow-camera-far={78}
        shadow-bias={-0.0006}
        shadow-normalBias={0.035}
      />

      {/* Piso: as baias pintadas, dissolvidas no fundo da página. */}
      <mesh receiveShadow renderOrder={1} rotation-x={-Math.PI / 2} material={assets.floor}>
        <planeGeometry args={[assets.floorSide, assets.floorSide]} />
      </mesh>

      {/* A sombra de contato é o que ancora a máquina no chão. Sem ela tudo flutua. */}
      <ContactShadows
        renderOrder={2}
        position={[0, 0.015, -3]}
        scale={[34, 26]}
        far={7}
        blur={2.4}
        opacity={0.72}
        resolution={512}
        color={palette.bg}
      />

      {/*
        TODOS os contêineres da cena — os que a máquina move e os que ficam
        parados — em três malhas instanciadas: chapa, moldura e cantoneiras.
        Uma malha por contêiner seriam mais de cento e trinta chamadas de
        desenho para uma decoração; assim são três, e o custo de mover a
        arquitetura inteira vira reescrever quarenta e poucas matrizes por
        quadro.

        `frustumCulled={false}` porque a caixa envolvente de uma malha
        instanciada não acompanha as matrizes: com culling ligado, a cena
        inteira pisca quando o primeiro contêiner sai de quadro.
      */}
      <instancedMesh
        ref={plateRef}
        castShadow
        receiveShadow
        args={[assets.plate, assets.skin, assets.total]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={frameRef}
        castShadow
        args={[assets.frame, assets.steel, assets.total]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={castingsRef}
        castShadow
        args={[assets.castings, assets.casting, assets.total]}
        frustumCulled={false}
      />

      {/* Os trilhos: entram por cima, saem pelas laterais, dissolvem na névoa. */}
      <mesh castShadow geometry={assets.runway} material={assets.steel} />

      <group ref={bridgeRef}>
        <mesh castShadow geometry={assets.bridge} material={assets.steel} />
      </group>

      <group ref={trolleyRef}>
        <mesh castShadow geometry={assets.trolley} material={assets.steel} />
        <mesh position={lampAt} material={assets.lamp}>
          <sphereGeometry args={[0.11, 12, 10]} />
        </mesh>
        <pointLight ref={lampRef} position={lampAt} color={palette.data} distance={6} decay={2} />
      </group>

      {/* Material próprio, mais claro que a estrutura, e não o `steel`.
       *
       * Existe por causa de um defeito que o dono viu e reportou duas vezes: o
       * spreader parecia uma peça solta flutuando junto com a máquina. A peça
       * estava certa — quem sumia era o CABO. A 5 cm de raio em aço escuro
       * sobre fundo escuro, o cabo não alcança um pixel nesta distância de
       * câmera, e sem ele a garra perde o que a prende.
       *
       * Cabo de aço reflete muito mais que chapa pintada, então clarear não é
       * licença: é o que ele faz na vida real. */}
      {REEVING.map((cable, i) => (
        <mesh
          key={`${cable.top[0]}:${cable.top[1]}`}
          ref={(node) => {
            cableRefs.current[i] = node
          }}
          geometry={assets.cable}
          material={assets.rope}
        />
      ))}

      <group ref={spreaderRef}>
        <mesh castShadow geometry={assets.spreader} material={assets.steel} />
      </group>
    </>
  )
}

/**
 * Envelope da cena. O `frameloop` alterna entre `always` e `demand` conforme
 * o hero entra e sai da viewport: nada de queimar GPU e bateria animando uma
 * máquina que já rolou para fora da tela.
 */
export function Portico({ layers }: { layers: readonly StackLayer[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(true)

  useEffect(() => {
    const node = containerRef.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => setInView(entry?.isIntersecting ?? true), { threshold: 0 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={containerRef} className="h-full w-full">
      <Canvas
        aria-hidden="true"
        // `percentage` = PCFShadowMap. O padrão (`true`) escolhe PCFSoft, que
        // o three 0.185 depreciou e resolve para PCF de qualquer forma — só
        // que gritando no console de quem abre o site.
        shadows="percentage"
        frameloop={inView ? 'always' : 'demand'}
        dpr={[1, 1.6]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        // A paleta é escura de ponta a ponta e o tone mapping ACES (padrão do
        // r3f) fecha ainda mais a sombra. Um pouco de exposição extra é o que
        // devolve a leitura do material sem clarear tinta nenhuma.
        onCreated={({ gl }) => {
          gl.toneMappingExposure = 1.72
        }}
        camera={{ fov: VIEW.fov, near: 6, far: 190, position: [18, 16, 46] }}
      >
        <Yard layers={layers} />
      </Canvas>
    </div>
  )
}
