'use client'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import {
  BAY,
  CONTAINER,
  LAYER_COUNT,
  SWAY_STEP,
  createPose,
  createSway,
  layerAt,
  layerShade,
  samplePose,
  stencilLines,
  stepSway,
} from './portico-model'
import {
  REEVING,
  RIG,
  SPREADER_EAR_Y,
  containerCastingsGeometry,
  containerFrameGeometry,
  gantryGeometry,
  plateGeometry,
  spreaderGeometry,
  trolleyGeometry,
  yardPlateGeometry,
} from './portico-geometry'
import {
  cargoAtlas,
  cargoAtlasShader,
  corrugationNormalMap,
  floorTextures,
  plateTexture,
  resolveMonoFamily,
  stencilTexture,
  type CargoAtlas,
  type RedrawableTexture,
} from './portico-textures'
import { YARD_FOOTPRINTS, YARD_SLOTS, yardCargo, yardShade } from './portico-yard'
import type { StackItem } from '@/content/types'

/**
 * Um pórtico de pátio empilhando as camadas do sistema.
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
 * E um princípio governa tudo que foi acrescentado depois: **o significado
 * fica na frente, a escala vem de trás**. A fileira das seis camadas
 * rotuladas é o que precisa ser lido e não muda; as baias de fundo
 * (`portico-yard.ts`) entram atrás do corredor, recuando na névoa, para dar
 * porte de terminal em operação sem disputar a leitura.
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
 */
const VIEW = {
  fov: 29,
  azimuth: 0.38,
  elevation: 0.105,
  targetY: 9.6,
  /** Sobra em volta da máquina, em fração do enquadramento. */
  margin: 1.04,
} as const

/** Caixa envolvente da máquina inteira, do truque das pernas ao topo da casa de máquinas. */
const BOUNDS = { x: 9.9, top: 19.8, z: 4.9 } as const

/**
 * A névoa, medida A PARTIR DA CÂMERA — nunca em coordenada de mundo.
 *
 * A distância da câmera é resolvida pelo formato do contêiner na página, então
 * um alcance fixo em metros deixaria o recuo diferente em 1440 e em 1024: numa
 * largura o fundo sumiria, na outra chegaria na frente. Amarrado à distância,
 * a profundidade lê igual em qualquer viewport.
 *
 * `start` é a folga depois do alvo: o ponto mais fundo da máquina fica ~2,5 m
 * atrás dele, então a fileira operacional inteira sai da névoa intocada. O que
 * a névoa pega é o que está atrás do corredor.
 */
const FOG = { start: 3.4, span: 38 } as const

const CORNERS: [number, number, number][] = [-1, 1].flatMap((sx) =>
  [0, 1].flatMap((sy) =>
    [-1, 1].map((sz): [number, number, number] => [sx * BOUNDS.x, sy * BOUNDS.top, sz * BOUNDS.z]),
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
function Framing() {
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
    const target = new THREE.Vector3(0, VIEW.targetY, 0)
    const corner = new THREE.Vector3()

    let distance = 0
    for (const [x, y, z] of CORNERS) {
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
  }, [camera, scene, width, height])

  return null
}

// ── Recursos ──────────────────────────────────────────────────────────────

type LayerAssets = { label: string; materials: THREE.Material[]; stencil: RedrawableTexture }

/** As baias de fundo: uma geometria, um material, N transformações. */
type YardAssets = {
  plate: THREE.BufferGeometry
  skin: THREE.MeshStandardMaterial
  steel: THREE.MeshStandardMaterial
  atlas: CargoAtlas
  count: number
}

type Assets = {
  plate: THREE.BufferGeometry
  frame: THREE.BufferGeometry
  castings: THREE.BufferGeometry
  gantry: THREE.BufferGeometry
  trolley: THREE.BufferGeometry
  spreader: THREE.BufferGeometry
  cable: THREE.BufferGeometry
  steel: THREE.MeshPhysicalMaterial
  casting: THREE.MeshPhysicalMaterial
  lamp: THREE.MeshStandardMaterial
  floor: THREE.MeshStandardMaterial
  floorSide: number
  layers: LayerAssets[]
  yard: YardAssets
  dispose: () => void
}

function buildAssets(
  labels: readonly string[],
  cargo: readonly StackItem[],
  palette: Palette,
  family: string,
  anisotropy: number,
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
  const sideNormal = tune(corrugationNormalMap({ ribs: 26, depth: 1.05, band: 0.085 }))
  const endNormal = tune(corrugationNormalMap({ ribs: 11, depth: 1.05, band: 0.09 }))
  const roofNormal = tune(corrugationNormalMap({ ribs: 24, depth: 0.5, band: 0.05 }))
  const normalScale = new THREE.Vector2(0.85, 0.85)

  const layers: LayerAssets[] = []
  for (let i = 0; i < LAYER_COUNT; i++) {
    const label = labels[i] ?? ''
    const plateColor = shade(palette.surface2, layerShade(i))
    const stencil = stencilTexture(stencilLines(label), plateColor, palette.text, family)
    tune(stencil.texture)
    const flat = tune(plateTexture(plateColor))

    const painted = (map: THREE.Texture, normalMap: THREE.Texture | null, roughness: number): THREE.Material =>
      keep(
        new THREE.MeshPhysicalMaterial({
          map,
          normalMap,
          normalScale,
          // Chapa pintada é dielétrica com verniz por cima: pouco metalness,
          // rugosidade média-alta e um clearcoat que devolve o especular sem
          // clarear a tinta. O clearcoat é o que salva uma paleta escura: o
          // brilho de uma camada dielétrica é BRANCO, independente da cor
          // debaixo, então a chapa continua quase preta e mesmo assim acende
          // onde o estúdio a atinge.
          metalness: 0.22,
          roughness,
          clearcoat: 0.8,
          clearcoatRoughness: 0.26,
          envMapIntensity: 3,
        }),
      )

    const side = painted(stencil.texture, sideNormal, 0.55)
    const end = painted(flat, endNormal, 0.56)
    const roof = painted(flat, roofNormal, 0.66)
    const underside = painted(flat, null, 0.78)

    // Ordem dos grupos de BoxGeometry: +X, −X, +Y, −Y, +Z, −Z.
    layers.push({ label, materials: [end, end, roof, underside, side, side], stencil })
  }

  const floor = floorTextures(palette.bg, palette.border, [
    { x: BAY.source, length: CONTAINER.length, width: CONTAINER.width },
    { x: BAY.target, length: CONTAINER.length, width: CONTAINER.width },
    ...YARD_FOOTPRINTS.map((spot) => ({ ...spot, length: CONTAINER.length, width: CONTAINER.width })),
  ])
  keep(floor.map)
  keep(floor.alpha)

  // ── baias de fundo ──────────────────────────────────────────────────────
  //
  // Um contêiner por tecnologia, com o ícone da marca quando ele existe e o
  // nome em estêncil quando não. As dezoito chapas moram num atlas só, e cada
  // instância recebe o deslocamento da sua célula: o pátio inteiro sai em
  // duas chamadas de desenho.
  const marks = yardCargo(cargo)
  // Tinta rebaixada: é `--color-text`, o mesmo token dos estênceis da frente,
  // num valor mais baixo. A névoa sozinha não bastava — ela empurra a chapa
  // para o fundo mas a marcação continuava tão branca quanto os rótulos que
  // precisam ser lidos, e o fundo roubava a frente.
  const atlas = cargoAtlas(marks, (i) => shade(palette.surface2, yardShade(i)), shade(palette.text, 0.26), family)
  tune(atlas.texture)
  atlas.texture.channel = 1

  const yardPlate = keep(yardPlateGeometry())
  yardPlate.setAttribute('aCargo', new THREE.InstancedBufferAttribute(atlas.offsets, 2))

  // Padrão, não físico: sem clearcoat e com pouco reflexo de ambiente. O
  // brilho especular é o que puxa o olho, e o fundo existe para NÃO puxar —
  // é o mesmo recuo da névoa, feito pelo material.
  const yardSkin = keep(
    new THREE.MeshStandardMaterial({
      map: atlas.texture,
      normalMap: sideNormal,
      normalScale,
      metalness: 0.16,
      roughness: 0.74,
      envMapIntensity: 1.7,
    }),
  )
  cargoAtlasShader(yardSkin, atlas.scale)

  return {
    plate: keep(plateGeometry()),
    frame: keep(containerFrameGeometry()),
    castings: keep(containerCastingsGeometry()),
    gantry: keep(gantryGeometry()),
    trolley: keep(trolleyGeometry()),
    spreader: keep(spreaderGeometry()),
    cable: keep(new THREE.CylinderGeometry(0.05, 0.05, 1, 6)),
    // Aço aparente: metalness alto e rugosidade baixa. Num metal a COR BASE é
    // a própria refletância, e é por isso que a primeira versão usava
    // `--color-border` e o pórtico inteiro sumia: um difuso quase preto
    // continua quase preto por mais luz que se jogue nele. O clearcoat sozinho
    // só acendia as arestas — o corpo seguia invisível.
    //
    // `--color-muted` é o token certo aqui e continua dentro da paleta: é um
    // cinza médio, exatamente a cor de aço industrial pintado. O perfil segue
    // sendo tinta do design system; a diferença é que agora tem refletância
    // suficiente para o lightformer ter o que desenhar.
    steel: keep(
      new THREE.MeshPhysicalMaterial({
        color: shade(palette.muted, 0.78),
        metalness: 0.82,
        roughness: 0.26,
        clearcoat: 1,
        clearcoatRoughness: 0.16,
        envMapIntensity: 4.6,
      }),
    ),
    casting: keep(
      new THREE.MeshPhysicalMaterial({
        color: shade(palette.muted, 0.55),
        metalness: 0.9,
        roughness: 0.38,
        clearcoat: 0.85,
        clearcoatRoughness: 0.26,
        envMapIntensity: 3.4,
      }),
    ),
    // A única coisa da cena com `emissive`, e o único uso de `--color-data`:
    // a lâmpada de estado do pórtico. Uma lâmpada que não emite não é lâmpada,
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
    floorSide: floor.half * 2,
    layers,
    yard: {
      plate: yardPlate,
      skin: yardSkin,
      // Aço mais fosco e mais escuro que o da máquina, pela mesma razão da
      // chapa: um perfil que brilha lá atrás vira ruído na frente.
      steel: keep(
        new THREE.MeshStandardMaterial({
          color: shade(palette.muted, 0.5),
          metalness: 0.7,
          roughness: 0.55,
          envMapIntensity: 2.2,
        }),
      ),
      atlas,
      count: marks.length,
    },
    dispose: () => {
      for (const item of disposables) item.dispose()
    },
  }
}

// ── Cena ──────────────────────────────────────────────────────────────────

const UP = new THREE.Vector3(0, 1, 0)
/** Onde a lâmpada de estado mora, na testeira da casa de máquinas do carro. */
const LAMP_AT: [number, number, number] = [0, RIG.trolleyY + 0.7, 1.68]

function Yard({ labels, cargo }: { labels: readonly string[]; cargo: readonly StackItem[] }) {
  const gl = useThree((state) => state.gl)
  const anisotropy = useMemo(() => Math.min(8, gl.capabilities.getMaxAnisotropy()), [gl])
  const palette = useMemo(readPalette, [])
  const assets = useMemo(
    () => buildAssets(labels, cargo, palette, resolveMonoFamily(), anisotropy),
    [labels, cargo, palette, anisotropy],
  )
  useEffect(() => assets.dispose, [assets])

  // A fonte mono do site pode não estar pronta quando o estêncil é desenhado.
  // Redesenhar depois de `fonts.ready` custa um repaint de canvas e evita o
  // rótulo sair na fonte de fallback do sistema.
  useEffect(() => {
    let alive = true
    void document.fonts.ready.then(() => {
      if (!alive) return
      for (const layer of assets.layers) layer.stencil.redraw()
      assets.yard.atlas.redraw()
    })
    return () => {
      alive = false
    }
  }, [assets])

  // As baias de fundo não se mexem: a matriz de cada instância é escrita uma
  // vez e nunca mais tocada. É o que separa "pátio" de "animação de pátio".
  const yardPlateRef = useRef<THREE.InstancedMesh>(null)
  const yardFrameRef = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const at = new THREE.Matrix4()
    for (let i = 0; i < assets.yard.count; i++) {
      const slot = YARD_SLOTS[i]
      if (!slot) continue
      at.makeTranslation(slot.x, slot.y, slot.z)
      yardPlateRef.current?.setMatrixAt(i, at)
      yardFrameRef.current?.setMatrixAt(i, at)
    }
    for (const node of [yardPlateRef.current, yardFrameRef.current]) {
      if (node) node.instanceMatrix.needsUpdate = true
    }
  }, [assets])

  const trolleyRef = useRef<THREE.Group>(null)
  const spreaderRef = useRef<THREE.Group>(null)
  const lampRef = useRef<THREE.PointLight>(null)
  const cableRefs = useRef<(THREE.Mesh | null)[]>([])
  const layerRefs = useRef<(THREE.Group | null)[]>([])

  const motion = useRef({ clock: 0, spare: 0, pose: createPose(), sway: createSway() })
  const scratch = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), d: new THREE.Vector3() }), [])

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
      samplePose(own.clock, pose)
      stepSway(sway, pose.trolleyX, RIG.pivotY - pose.spreaderY, pose.swayGate)
      own.spare -= SWAY_STEP
      steps += 1
    }
    if (steps === 0) return
    if (steps === 16) own.spare = 0

    const sin = Math.sin(sway.theta)
    const cos = Math.cos(sway.theta)

    if (trolleyRef.current) trolleyRef.current.position.x = pose.trolleyX
    if (lampRef.current) lampRef.current.intensity = pose.lamp * 3.2
    assets.lamp.emissiveIntensity = pose.lamp * 2.6

    // Corpo rígido pendurado no carro: tudo que está no cabo gira em torno do
    // mesmo pivô, cada peça pelo seu próprio braço.
    const armSpreader = RIG.pivotY - pose.spreaderY
    if (spreaderRef.current) {
      spreaderRef.current.position.set(pose.trolleyX + armSpreader * sin, RIG.pivotY - armSpreader * cos, 0)
      spreaderRef.current.rotation.z = sway.theta
    }

    for (let i = 0; i < LAYER_COUNT; i++) {
      const node = layerRefs.current[i]
      if (!node) continue
      if (i === pose.carried) {
        const arm = RIG.pivotY - layerAt(pose.y, i)
        node.position.set(pose.trolleyX + arm * sin, RIG.pivotY - arm * cos, 0)
        node.rotation.z = sway.theta
      } else {
        node.position.set(layerAt(pose.x, i), layerAt(pose.y, i), 0)
        node.rotation.z = 0
      }
    }

    REEVING.forEach((cable, i) => {
      const node = cableRefs.current[i]
      if (!node) return
      scratch.a.set(pose.trolleyX + cable.top[0], RIG.pivotY, cable.top[1])
      const rise = SPREADER_EAR_Y - armSpreader
      scratch.b.set(
        pose.trolleyX + cable.bottom[0] * cos - rise * sin,
        RIG.pivotY + cable.bottom[0] * sin + rise * cos,
        cable.bottom[1],
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
      <Framing />

      {/*
        A névoa. É ela que faz o pátio recuar: as baias de trás perdem
        contraste com a distância, como perderiam num terminal de verdade, em
        vez de serem apagadas com opacidade — que é o truque que denuncia
        "camada de fundo" em vez de profundidade. A cor é `--color-bg`, a
        mesma do fundo da página, então o que recua não desbota: dissolve.
        `Framing` reescreve o alcance conforme a distância real da câmera.
      */}
      <fog attach="fog" args={[palette.bg, 50, 84]} />

      {/*
        O estúdio. Planos emissivos capturados num cube map: chave larga e
        quente em cima, recorte estreito e forte na direita (é ele que desenha
        a aresta do aço), preenchimento frio e amplo na esquerda, e um retorno
        fraco por baixo para o metal não morrer na sombra. `frames={1}` porque
        nada aqui se mexe: o mapa é calculado uma vez e nunca mais.
      */}
      <Environment resolution={256} frames={1}>
        {/* chave: larga, alta e quente — dá a forma geral */}
        <Lightformer form="rect" color={palette.text} intensity={2.6} scale={[15, 10]} position={[-1, 12, 1.5]} />
        {/* recorte principal: estreito e forte na direita, o que desenha a aresta */}
        <Lightformer form="rect" color={palette.text} intensity={8} scale={[0.85, 15]} position={[8, 5, 3]} />
        {/* contra-recorte atrás e à esquerda: sem ele, a perna daquele lado
            vira um bloco preto sem contorno contra um fundo preto */}
        <Lightformer form="rect" color={palette.text} intensity={5} scale={[0.7, 14]} position={[-7, 7, -5]} />
        {/* preenchimento frio e amplo */}
        <Lightformer form="rect" color={palette.muted} intensity={1.9} scale={[9, 12]} position={[-9, 6, 4]} />
        {/* retorno fraco por baixo, para o metal não morrer na sombra */}
        <Lightformer form="rect" color={palette.faint} intensity={1.1} scale={[16, 7]} position={[0, -4, 9]} />
      </Environment>

      {/*
        Uma luz direcional só, alinhada com o recorte: os lightformers moram no
        mapa de ambiente e não projetam sombra nenhuma. É esta que faz o
        contêiner de cima escurecer o de baixo — a leitura de profundidade mais
        forte da cena inteira.
      */}
      <directionalLight
        castShadow
        position={[13, 24, 14]}
        intensity={2.6}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-camera-near={8}
        shadow-camera-far={62}
        shadow-bias={-0.0006}
        shadow-normalBias={0.035}
      />

      {/* Piso: as duas baias pintadas, dissolvidas no fundo da página. */}
      <mesh receiveShadow renderOrder={1} rotation-x={-Math.PI / 2} material={assets.floor}>
        <planeGeometry args={[assets.floorSide, assets.floorSide]} />
      </mesh>

      {/* A sombra de contato é o que ancora a máquina no chão. Sem ela tudo flutua. */}
      <ContactShadows
        renderOrder={2}
        position={[0, 0.015, 0]}
        scale={[26, 14]}
        far={6}
        blur={2.4}
        opacity={0.72}
        resolution={512}
        color={palette.bg}
      />

      {/*
        As baias de fundo. Duas malhas instanciadas — chapa e perfil — dão
        conta de dezoito contêineres: mesma geometria, muda a transformação e
        a célula do atlas. Uma malha por contêiner seriam trinta e seis
        chamadas de desenho para uma coisa que não se mexe.

        Não projetam nem recebem sombra de propósito: estão fora do tronco de
        sombra da direcional, e o mapa de sombra é orçamento — vale gastá-lo
        inteiro na fileira que precisa ser lida.
      */}
      <instancedMesh
        ref={yardPlateRef}
        args={[assets.yard.plate, assets.yard.skin, assets.yard.count]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={yardFrameRef}
        args={[assets.frame, assets.yard.steel, assets.yard.count]}
        frustumCulled={false}
      />

      <mesh castShadow receiveShadow geometry={assets.gantry} material={assets.steel} />

      <group ref={trolleyRef}>
        <mesh castShadow geometry={assets.trolley} material={assets.steel} />
        <mesh position={LAMP_AT} material={assets.lamp}>
          <sphereGeometry args={[0.11, 12, 10]} />
        </mesh>
        <pointLight ref={lampRef} position={LAMP_AT} color={palette.data} distance={5} decay={2} />
      </group>

      {REEVING.map((cable, i) => (
        <mesh
          key={`${cable.top[0]}:${cable.top[1]}`}
          ref={(node) => {
            cableRefs.current[i] = node
          }}
          geometry={assets.cable}
          material={assets.steel}
        />
      ))}

      <group ref={spreaderRef}>
        <mesh castShadow geometry={assets.spreader} material={assets.steel} />
      </group>

      {assets.layers.map((layer, i) => (
        <group
          key={`${i}:${layer.label}`}
          ref={(node) => {
            layerRefs.current[i] = node
          }}
        >
          <mesh castShadow receiveShadow geometry={assets.plate} material={layer.materials} />
          <mesh castShadow receiveShadow geometry={assets.frame} material={assets.steel} />
          <mesh castShadow receiveShadow geometry={assets.castings} material={assets.casting} />
        </group>
      ))}
    </>
  )
}

/**
 * Envelope da cena. O `frameloop` alterna entre `always` e `demand` conforme
 * o hero entra e sai da viewport: nada de queimar GPU e bateria animando um
 * pórtico que já rolou para fora da tela.
 */
export function Portico({ labels, cargo }: { labels: readonly string[]; cargo: readonly StackItem[] }) {
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
        camera={{ fov: VIEW.fov, near: 6, far: 140, position: [16, 15, 40] }}
      >
        <Yard labels={labels} cargo={cargo} />
      </Canvas>
    </div>
  )
}
