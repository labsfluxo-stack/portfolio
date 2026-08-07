'use client'
import { useEffect, useMemo, useRef, useState, useLayoutEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import {
  CONTAINER,
  SWAY_STEP,
  createPose,
  createShow,
  createSway,
  samplePose,
  stepSway,
  valueAt,
} from './portico-model'
import { buildAssembly, plateShade } from './portico-architecture'
import { type SceneSystem, sceneRotation } from './portico-systems'
import {
  REEVING,
  type Rig,
  SPREADER_EAR_Y,
  WALKWAY,
  bridgeGeometry,
  containerCastingsGeometry,
  containerFrameGeometry,
  containerPlateGeometry,
  gratingGeometry,
  rigFor,
  runwayGeometry,
  spreaderGeometry,
  trolleyGeometry,
} from './portico-geometry'
import {
  GRATING_TILE,
  SIDE_RIBS,
  cargoAtlas,
  containerSkinShader,
  corrugationNormalMap,
  floorTextures,
  gratingTextures,
  grimeMap,
  resolveMonoFamily,
  skinWearMap,
  steelWearMap,
  unitNoise,
  type CargoAtlas,
  type CargoCell,
  type FloorBay,
} from './portico-textures'
import { buildYard, markFor } from './portico-yard'

/**
 * Uma ponte rolante montando os sistemas que o dono construiu — um por vez,
 * em rotação sem fim.
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
 * vem de trás**. O sistema da vez é montado na frente e é o que precisa ser
 * lido; as baias dos outros sistemas ficam atrás do corredor, recuando na
 * névoa — e elas não são enchimento, são os próximos sistemas esperando a
 * vez, com as tecnologias verdadeiras deles estampadas na chapa.
 *
 * Tudo é `aria-hidden`: é decoração. A informação que ela ilustra vive em
 * texto de verdade nas seções Sistemas e Stack.
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
 * A elevação é o que faz a montagem ler como pilha em degraus e não como
 * parede: o degrau só aparece quando a câmera vê a laje do nível de baixo na
 * frente do de cima.
 */
const VIEW = {
  fov: 29,
  azimuth: 0.38,
  elevation: 0.165,
  /**
   * Sobra em volta da máquina, em fração do enquadramento.
   *
   * Subiu junto com o pátio de sete baias: uma moldura de três por cento não
   * deixa chão nenhum aparecer em volta, e sem chão em volta o olho não tem
   * como ler "pátio" — lê "objeto encostado na lente". A sobra a mais custa o
   * mesmo tanto de tamanho de estêncil, que é o preço mais barato desta cena.
   */
  margin: 1.12,
} as const

/**
 * Caixa envolvente do que precisa caber: a montagem, a ponte por cima dela e a
 * PRIMEIRA fileira de baias. Sai das medidas reais — se um sistema crescer, o
 * enquadramento abre junto.
 *
 * A profundidade é assimétrica, e é isso que conserta a composição. Uma caixa
 * simétrica em Z descrevia só a montagem, e o pátio inteiro ficava fora da
 * conta — só que com a câmera girada o fundo BALANÇA PARA O LADO conforme
 * recua (cada metro de profundidade empurra a projeção uns 37 cm para a
 * direita). O que o enquadramento não conhece ele não emoldura: as baias
 * sangravam pela borda direita enquanto sobrava laje vazia na esquerda.
 *
 * `far` é onde o cenário pode ser cortado sem prejuízo — as baias do fundo
 * saem de quadro de propósito, e um pátio cortado pela borda lê como pátio que
 * continua. O que não pode faltar é o que vem até aqui.
 */
type Bounds = {
  x: number
  top: number
  near: number
  far: number
  targetY: number
  /**
   * A MASSA — a caixa dos contêineres, sem os trilhos.
   *
   * Existe porque caber e compor são duas perguntas diferentes, e responder as
   * duas com a mesma caixa deixa a cena torta. Quem manda no recuo são os
   * trilhos, que abraçam o pátio inteiro e passam do quadro pelas laterais de
   * propósito; quem manda no CENTRO é a carga, que é o que alguém olha. Com uma
   * caixa só, o canto vazio da laje contava tanto quanto a pilha cheia do outro
   * lado, e o enquadramento centrava no vazio.
   */
  mass: { x: number; top: number; near: number; far: number }
}

/**
 * A névoa, medida A PARTIR DA CÂMERA — nunca em coordenada de mundo.
 *
 * A distância da câmera é resolvida pelo formato do contêiner na página, então
 * um alcance fixo em metros deixaria o recuo diferente em 1440 e em 1024: numa
 * largura o fundo sumiria, na outra chegaria na frente. Amarrado à distância,
 * a profundidade lê igual em qualquer viewport.
 *
 * `start` é a folga depois do alvo: a montagem inteira sai da névoa intocada,
 * e o que a névoa pega são as baias atrás do corredor — inclusive a máquina
 * quando ela vai lá buscar, que é justamente o efeito.
 */
const FOG = { start: 3, span: 27 } as const

const boxOf = (half: { x: number; top: number; near: number; far: number }): [number, number, number][] =>
  [-1, 1].flatMap((sx) =>
    [0, 1].flatMap((sy) =>
      [half.near, half.far].map((z): [number, number, number] => [sx * half.x, sy * half.top, z]),
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
    const box = boxOf(bounds)
    const mass = boxOf(bounds.mass)

    // Duas contas, e a segunda é a que faltava.
    //
    // A primeira resolve a DISTÂNCIA: o quanto a câmera precisa recuar para
    // que os oito cantos ainda caibam. A segunda resolve o CENTRO — e sem ela
    // o enquadramento garante que tudo caiba e mesmo assim compõe torto.
    //
    // O motivo é perspectiva pura: com a câmera girada, o canto da frente está
    // mais PERTO que o de trás, então ele projeta mais para fora mesmo tendo o
    // mesmo afastamento em metros. A conta da distância toma o pior dos dois e
    // recua até ele caber; o resultado é a carga colada numa borda e uma faixa
    // de chão vazio na outra. Foi exatamente o que apareceu quando o pátio
    // cresceu: contêineres cortados à direita, laje sobrando à esquerda.
    //
    // A correção é medir os extremos do que aparece na tela e deslocar a MIRA
    // pela metade da diferença. Itera porque deslocar a mira muda a projeção
    // de todo canto — três passadas fecham em fração de pixel.
    //
    // E os extremos que valem são os da CARGA, não os da caixa que precisa
    // caber: os trilhos abraçam o pátio inteiro e saem do quadro pelas
    // laterais de propósito, então centrar por eles é centrar pelo vazio.
    let distance = 0
    for (let pass = 0; pass < 3; pass++) {
      distance = 0
      for (const [x, y, z] of box) {
        corner.set(x, y, z).sub(target)
        const depth = corner.dot(dir)
        distance = Math.max(
          distance,
          depth + (Math.abs(corner.dot(right)) / tanH) * VIEW.margin,
          depth + (Math.abs(corner.dot(up)) / tanV) * VIEW.margin,
        )
      }

      let low = Infinity
      let high = -Infinity
      for (const [x, y, z] of mass) {
        corner.set(x, y, z).sub(target)
        // Coordenada de tela do canto, em tangentes: é a divisão pela
        // profundidade que traz a perspectiva para dentro da conta.
        const screen = corner.dot(right) / Math.max(1, distance - corner.dot(dir))
        low = Math.min(low, screen)
        high = Math.max(high, screen)
      }
      const off = ((low + high) / 2) * distance
      if (Math.abs(off) < 0.01) break
      target.addScaledVector(right, off)
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
  grating: THREE.BufferGeometry
  trolley: THREE.BufferGeometry
  spreader: THREE.BufferGeometry
  cable: THREE.BufferGeometry
  rope: THREE.MeshPhysicalMaterial
  skin: THREE.MeshPhysicalMaterial
  steel: THREE.MeshPhysicalMaterial
  mesh: THREE.MeshPhysicalMaterial
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
  bays: FloorBay[],
  work: { x: number; z: number },
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

  const floor = floorTextures(palette.bg, palette.border, { bays, half: floorHalf, work }, family)
  tune(floor.map)
  keep(floor.alpha)
  tune(floor.rough)

  const grate = gratingTextures()
  const gratingSpan = rig.railX * 2
  for (const texture of [grate.alpha, grate.orm, grate.normal]) {
    texture.repeat.set(gratingSpan / GRATING_TILE, WALKWAY.width / GRATING_TILE)
    tune(texture)
  }

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
    grating: keep(gratingGeometry(rig)),
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
    // O piso de grade da passarela. Material PRÓPRIO, e não o aço da estrutura,
    // porque grade não é chapa: a trama tem relevo nos dois sentidos e vão
    // aberto entre as barras. `alphaTest` em vez de transparência — assim o vão
    // é vão de verdade, inclusive na sombra, sem custo de ordenação.
    //
    // Um degrau abaixo do aço no valor, de propósito: a passarela é o elemento
    // mais alto e mais largo da cena, e se ela acender mais que os contêineres
    // o assunto vira o cenário.
    mesh: keep(
      new THREE.MeshPhysicalMaterial({
        color: shade(palette.muted, 0.6),
        alphaMap: grate.alpha,
        alphaTest: 0.42,
        normalMap: grate.normal,
        normalScale: new THREE.Vector2(0.85, 0.85),
        aoMap: grate.orm,
        roughnessMap: grate.orm,
        metalnessMap: grate.orm,
        metalness: 1,
        roughness: 1,
        side: THREE.DoubleSide,
        envMapIntensity: 3.4,
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
        // A rugosidade do concreto varia, e é ela que faz o piso existir: a
        // poça de óleo devolve o estúdio inteiro, o concreto seco não devolve
        // nada. O escalar vale 1 porque o mapa é quem manda na faixa.
        roughnessMap: floor.rough,
        roughness: 1,
        transparent: true,
        depthWrite: false,
        metalness: 0.16,
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
    total: cells.length,
    dispose: () => {
      for (const item of disposables) item.dispose()
    },
  }
}

// ── Cena ──────────────────────────────────────────────────────────────────

const UP = new THREE.Vector3(0, 1, 0)

function Yard({ systems }: { systems: readonly SceneSystem[] }) {
  const gl = useThree((state) => state.gl)
  const anisotropy = useMemo(() => Math.min(8, gl.capabilities.getMaxAnisotropy()), [gl])
  const palette = useMemo(readPalette, [])

  // A rotação sai do conteúdo, a disposição de cada sistema sai do tamanho da
  // stack dele, o pátio sai da rotação inteira, e o ciclo sai dos três.
  // Nenhum dos quatro sabe de three.js.
  const rotation = useMemo(() => sceneRotation(systems), [systems])
  const assemblies = useMemo(() => rotation.map(buildAssembly), [rotation])
  const yard = useMemo(
    () => buildYard(assemblies.map((build) => build.cargo.length), Math.max(...assemblies.map((b) => b.depth), 0)),
    [assemblies],
  )
  const show = useMemo(
    () => createShow(yard.homes, assemblies.map((build) => build.slots)),
    [yard, assemblies],
  )

  // A máquina é dimensionada pelo TRABALHO da rotação inteira, não pelo sistema
  // da vez: se a ponte encolhesse junto com o sistema pequeno, a câmera se
  // mexeria a cada troca e a cena inteira pularia.
  const rig = useMemo(() => rigFor(show.peakY, show.reach), [show])

  /** Onde a lâmpada de estado mora, na testeira da casa de máquinas do carro. */
  const lampAt = useMemo((): [number, number, number] => [0, rig.trolleyY + 0.75, 1.6], [rig])

  /** A área que a máquina de fato trabalha — a maior montagem da rotação. */
  const work = useMemo(
    () => ({
      x: Math.max(...assemblies.map((build) => build.width), 1) / 2,
      z: Math.max(...assemblies.map((build) => build.depth), 1) / 2,
    }),
    [assemblies],
  )

  // O enquadramento fecha na montagem, na ponte por cima dela e na primeira
  // fileira de baias. O resto do pátio fica de fora de propósito, dissolvido
  // na névoa, porque ele é escala e não assunto.
  //
  // `top` para no carro, não acima dele. A folga que existia aqui punha a
  // instalação flutuando no meio do quadro com um vão morto em cima, e os
  // tirantes do trilho apareciam inteiros — dezesseis hastes em fila, que lê
  // como CERCA. Cortando a fita no carro, o tirante sai do quadro pelo topo, e
  // é o corte que diz "isto continua preso lá em cima".
  const bounds = useMemo(() => {
    const top = rig.trolleyY + 0.35
    // A borda de trás do que precisa caber é a PRIMEIRA fileira de baias, não
    // a montagem: é ela que fecha a composição por cima do corredor vazio. O
    // resto do pátio recua para dentro da névoa e pode ser cortado pela borda.
    const firstBay = yard.footprints.reduce((near, spot) => Math.max(near, spot.z), -work.z)
    const cargoX =
      yard.footprints.reduce((far, spot) => Math.max(far, Math.abs(spot.x)), work.x) + CONTAINER.length / 2
    return {
      x: rig.railX,
      top,
      near: work.z + CONTAINER.width,
      far: firstBay - CONTAINER.width,
      // Só as caixas: é por elas que a composição se centra.
      mass: {
        x: cargoX,
        top: Math.max(...assemblies.map((build) => build.height), CONTAINER.height),
        near: work.z + CONTAINER.width / 2,
        far: firstBay - CONTAINER.width / 2,
      },
      // A mira fica pouco acima do MEIO da instalação, e a conta é geométrica,
      // não de gosto: `Framing` resolve a distância projetando os oito cantos
      // da caixa, então uma mira alta obriga a câmera a recuar o quanto for
      // preciso para o canto de BAIXO ainda caber — e a sobra toda vai parar
      // em cima da ponte. Centrada, a mesma caixa cabe uns vinte por cento
      // mais perto; o viés devolve o pouco de sobra para BAIXO, onde há chão e
      // sombra de contato para ela pousar, em vez de céu vazio.
      targetY: top * 0.62,
    }
  }, [rig, work, yard, assemblies])

  /**
   * O chão cobre o pátio inteiro, com folga de uma baia. Sai das plantas reais
   * — se um sistema crescer e as baias recuarem, o chão recua junto em vez de
   * deixar os contêineres do fundo pairando sobre o nada.
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
    // A ordem das células é a das instâncias: sistema por sistema, na ordem da
    // rotação, e dentro de cada um na ordem de montagem.
    const cells: CargoCell[] = assemblies.flatMap((build, system) =>
      build.cargo.map((freight) => ({
        mark: markFor(freight.name),
        plate: shade(palette.surface2, plateShade(system, freight.role)),
        // O nome do sistema estampado pequeno, como o código de um contêiner
        // real. É o que dá contexto à montagem sem precisar de legenda — e ele
        // vem de `content/systems.ts` (ou do arquivo de dados da cena, para os
        // menores), nunca escrito aqui.
        code: freight.system,
      })),
    )
    const bays: FloorBay[] = [
      ...yard.footprints.map((spot) => ({
        x: spot.x,
        z: spot.z,
        length: CONTAINER.length,
        width: CONTAINER.width,
        code: spot.code,
      })),
      // A baia de montagem: uma marcação maior no chão, onde a máquina trabalha.
      { x: 0, z: 0, length: work.x * 2 + 1.6, width: work.z * 2 + 1.6, code: '' },
    ]
    return buildAssets(cells, bays, work, rig, palette, resolveMonoFamily(), anisotropy, floorHalf)
  }, [assemblies, yard, work, rig, palette, anisotropy, floorHalf])

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

  /**
   * Onde a cena ABRE — e isto é decisão de apresentação, por isso mora aqui e
   * não no modelo: `samplePose` continua sem saber onde alguém olha.
   *
   * O dono reclamou de encontrar vários contêineres já posicionados ao
   * atualizar a página, e a queixa é justa: a cena antiga abria a dezesseis
   * segundos do fim da montagem, então a primeira impressão era de cenário
   * pronto, não de máquina trabalhando.
   *
   * As duas saídas honestas são o zero absoluto e o começo. O zero deixa o
   * hero com o pátio cheio e a frente vazia por vários segundos — verdadeiro,
   * mas é uma máquina que ainda não fez nada. Aqui a cena abre no MEIO DO
   * SEGUNDO TRANSLADO do primeiro sistema: um contêiner assentado no chão, o
   * segundo pendurado atravessando o pátio, e a baia ainda cheia atrás. É o
   * primeiro quadro em que a cena mostra o que ela é — uma máquina montando —
   * e ainda assim quem fica vê a montagem inteira acontecer.
   *
   * É deslocamento de FASE, não corte: a rotação continua a mesma, contínua e
   * determinística, e no instante zero do modelo a frente segue vazia.
   */
  const opening = useMemo(() => {
    const second = show.plans[0]?.load[1]
    if (!second) return 0
    return second.start + (second.travelStart + second.travelEnd) / 2
  }, [show])

  const motion = useRef({ clock: 0, spare: 0, pose: createPose(show), sway: createSway() })
  useLayoutEffect(() => {
    motion.current = { clock: opening, spare: 0, pose: createPose(show), sway: createSway() }
  }, [show, opening])

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
      samplePose(show, own.clock, pose)
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

    for (let i = 0; i < assets.total; i++) {
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
        A névoa. É ela que faz o pátio recuar: as baias de trás perdem
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
        mapa de ambiente e não projetam sombra nenhuma. É esta que faz o nível
        de cima escurecer o de baixo — a leitura de profundidade mais forte da
        cena inteira, e o que separa os degraus da montagem.
      */}
      <directionalLight
        castShadow
        position={[15, 27, 16]}
        intensity={2.6}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={26}
        shadow-camera-bottom={-26}
        shadow-camera-near={8}
        shadow-camera-far={82}
        shadow-bias={-0.0006}
        shadow-normalBias={0.035}
      />

      {/* Piso: concreto de pátio com a marcação pintada e gasta, dissolvido no
          fundo da página. */}
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
        TODOS os contêineres da cena — o sistema da vez e os que esperam nas
        baias — em três malhas instanciadas: chapa, moldura e cantoneiras.
        Uma malha por contêiner seriam quase cento e cinquenta chamadas de
        desenho para uma decoração; assim são três.

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
        {/* A grade não projeta sombra: quinze metros acima do pátio, a trama
            viraria chuvisco no chão e roubaria a leitura da montagem. */}
        <mesh geometry={assets.grating} material={assets.mesh} />
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
export function Portico({ systems }: { systems: readonly SceneSystem[] }) {
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
        <Yard systems={systems} />
      </Canvas>
    </div>
  )
}
