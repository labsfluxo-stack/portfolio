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
import {
  type Bounds,
  ENVELOPE,
  type Framed,
  type Shot,
  VIEW,
  boundsFor,
  boxOf,
  frameFor,
  poseAt,
  shotAt,
} from './portico-camera'
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
  floodsFor,
  gratingGeometry,
  rigFor,
  runwayGeometry,
  runwayLensGeometry,
  spreaderGeometry,
  trolleyGeometry,
  trolleyLensGeometry,
} from './portico-geometry'
import {
  GRATING_TILE,
  ROPE_LAY,
  SIDE_RIBS,
  cargoAtlas,
  containerSkinShader,
  corrugationNormalMap,
  floorTextures,
  gratingTextures,
  grimeMap,
  resolveMonoFamily,
  ropeTextures,
  rustStreakMap,
  skinWearMap,
  steelSkinShader,
  steelWearMap,
  unitNoise,
  type CargoAtlas,
  type CargoCell,
  type FloorBay,
} from './portico-textures'
import { buildYard, manifestFor, markFor, stow } from './portico-yard'

/**
 * Uma ponte rolante montando os sistemas que o dono construiu — um por vez,
 * em rotação sem fim.
 *
 * Nunca é montada direto: `PorticoSlot.tsx` a carrega por `next/dynamic` com
 * `ssr: false`, e só depois de confirmar que o navegador aguenta. O chunk do
 * three.js, com isso, nunca é referenciado pelo HTML inicial — o orçamento de
 * JS da página não paga por uma decoração.
 *
 * Quatro decisões governam o acabamento:
 *
 * 1. **Luz de ambiente, não lâmpada.** O que faz metal parecer metal é
 *    refletir um entorno. `<Environment>` com `<Lightformer>` monta um
 *    estúdio de planos emissivos e o captura num cube map — reflexo de
 *    qualidade fotográfica sem baixar HDRI nenhum, o que é obrigatório num
 *    site que é export estático.
 * 2. **Luz prática, motivada pelo objeto.** Máquina de trabalho tem lâmpada, e
 *    é dela que vem a atmosfera: os refletores do trilho abrem poça no
 *    concreto, o do carro viaja com a máquina e joga a sombra da carga dentro
 *    da própria poça. Ver `PRACTICAL` e `floodsFor`. Não é efeito colado por
 *    cima; é o que este objeto faria.
 * 3. **A câmera se move.** Um arco lento, uma aproximação e o tremor de quem
 *    segura o aparelho — tudo derivado do relógio do ciclo, nada de
 *    `Math.random()`. Plano parado lê como render; plano em movimento lê como
 *    tomada, e a matriz da câmera é a única coisa que muda. Ver
 *    `portico-camera.ts`.
 * 4. **Nenhum pós-processamento, e agora por medição.** Sem bloom, sem grão,
 *    sem aberração cromática — isso já era regra. O que a tarefa 23
 *    acrescentou foi a conta do resto: SMAA não paga porque o canvas já tem
 *    MSAA por hardware; ACES já está aplicado pelo renderer; a vinheta medida
 *    mexeu 0,7 na média de luminância, ou seja, nada; e a profundidade de campo
 *    comeu o cabo do guincho, transformando-o num cordão de contas — o mesmo
 *    defeito que esta cena já corrigiu duas vezes. Custo do conjunto: +57 % de
 *    tempo de quadro e 105 KB comprimidos. Cortado.
 *
 * E um princípio governa o desenho: **o significado fica na frente, a escala
 * vem de trás**. O sistema da vez é montado na frente com a stack COMPLETA e
 * real dele, e é o que precisa ser lido; as baias dos outros ficam atrás do
 * corredor, recuando na névoa, e mostram só a ASSINATURA técnica de cada um —
 * as tecnologias que os outros sistemas não usam. Ver `manifestFor`, em
 * `portico-yard.ts`: uma marca repetida no fundo inteiro não informa nada, e o
 * que ela ocupa é lugar do que informa.
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

/**
 * A potência das luminárias, em candelas — a unidade que o three usa de fato
 * desde a r155.
 *
 * Parece absurdo ao lado do `intensity` 2,6 do sol, e não é: uma luz pontual
 * com `decay` 2 cai com o quadrado da distância, e daqui até o concreto vão
 * quinze metros. O que chega ao chão é `intensity / d²` — dividido por
 * duzentos e poucos. Escrever 3 aqui não daria uma poça fraca, não daria poça
 * nenhuma.
 *
 * Os valores caíram para MENOS DA METADE do primeiro palpite depois de olhar a
 * captura: a 2600 e 1500 a poça existia e o resto se perdia junto — o concreto
 * ficava lavado, a chapa dos contêineres virava prata e a cena inteira deixava
 * de ser um terminal à noite. Luz prática é para dar estrutura ao escuro, não
 * para acabar com ele.
 */
const PRACTICAL = { trolley: 1150, runway: 880 } as const

/** A pose base, para quando a câmera não pode se mexer. */
const STILL: Shot = { yaw: 0, pitch: 0, push: 1, panX: 0, panY: 0 }

/** A lente resolvida para o formato atual do painel. */
type Lens = { framed: Framed; aspect: number }

/**
 * Põe a câmera na pose `shot` e arrasta a névoa junto.
 *
 * A névoa acompanha a distância REAL, não a resolvida: a aproximação move a
 * câmera 8 % e, com um alcance fixo, o fundo clarearia e escureceria junto com
 * ela — um efeito de "respiração" na atmosfera que ninguém pediu e que denuncia
 * o movimento. Amarrada à distância, a profundidade lê igual em todo o percurso,
 * pelo mesmo motivo que ela já era medida a partir da câmera e não em metros de
 * mundo.
 */
function aim(camera: THREE.PerspectiveCamera, scene: THREE.Scene, lens: Lens, shot: Shot): void {
  const { position, look, distance } = poseAt(lens.framed, shot, {
    azimuth: VIEW.azimuth,
    elevation: VIEW.elevation,
    fov: VIEW.fov,
    aspect: lens.aspect,
  })
  camera.position.set(position[0], position[1], position[2])
  camera.lookAt(look[0], look[1], look[2])
  if (scene.fog instanceof THREE.Fog) {
    scene.fog.near = distance + FOG.start
    scene.fog.far = distance + FOG.start + FOG.span
  }
}

/**
 * A distância da câmera é resolvida a partir do formato real do contêiner na
 * página, não fixada num número: o mesmo enquadramento fecha numa faixa larga
 * (1440) e num painel quase quadrado (1024) sem cortar a máquina nem
 * deixá-la nadando no vazio.
 *
 * A conta mora em `portico-camera.ts` (`frameFor`), sem three.js, porque o que
 * ela promete é testável sem GPU e precisa ser testado: a promessa não é mais
 * "a máquina cabe", é **"a máquina cabe em todo o percurso da câmera"**, e a
 * diferença entre as duas é um canto raspando a borda no primeiro grau de arco.
 * É `ENVELOPE` que liga uma coisa à outra — o mesmo número que limita o
 * animador entra como pior caso no solucionador.
 */
function Framing({ bounds, lens, still }: { bounds: Bounds; lens: React.RefObject<Lens | null>; still: boolean }) {
  const camera = useThree((state) => state.camera)
  const scene = useThree((state) => state.scene)
  const width = useThree((state) => state.size.width)
  const height = useThree((state) => state.size.height)

  useLayoutEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return
    const aspect = width / Math.max(1, height)
    const solved: Lens = {
      aspect,
      framed: frameFor({
        box: boxOf(bounds),
        // Os extremos que centram são os da CARGA, não os da caixa que precisa
        // caber: os trilhos abraçam o pátio inteiro e saem do quadro pelas
        // laterais de propósito, então centrar por eles é centrar pelo vazio.
        mass: boxOf(bounds.mass),
        fov: VIEW.fov,
        aspect,
        azimuth: VIEW.azimuth,
        elevation: VIEW.elevation,
        margin: VIEW.margin,
        targetY: bounds.targetY,
        // Sem movimento, sem envelope: quem não pode ver a câmera andar recebe
        // o enquadramento apertado de sempre, e não a sobra que o arco pede.
        envelope: still ? null : ENVELOPE,
      }),
    }
    lens.current = solved
    camera.fov = VIEW.fov
    aim(camera, scene, solved, STILL)
    camera.updateProjectionMatrix()
  }, [camera, scene, width, height, bounds, lens, still])

  return null
}

// ── Qualidade adaptativa ──────────────────────────────────────────────────

/**
 * Os degraus de qualidade, do cheio ao mínimo.
 *
 * A ordem não é de gosto: é de ganho por unidade de estrago.
 *
 * 1. **`dpr` primeiro**, porque o custo de pixel é QUADRÁTICO e nenhum outro
 *    corte chega perto. De 1,25 para 1,0 são 36 % menos fragmentos por um
 *    contorno pouco mais duro, que numa cena escura quase não se vê.
 * 2. **Sombra depois**: o mapa do sol cai pela metade e as luminárias do
 *    pórtico param de projetar — o que apaga um passe de sombra inteiro. O sol
 *    continua projetando, porque é ele que separa os degraus da montagem: a
 *    leitura de profundidade mais forte da cena.
 * 3. **`dpr` de novo, por último.** O terceiro degrau seria o pós-processamento
 *    se ele existisse; ele foi medido e cortado (ver o relatório da tarefa), e
 *    o que sobrou como último recurso é o mesmo corte que já é o mais eficaz.
 *    Abaixo de 1 a imagem amacia de verdade, mas quem chegou aqui está a menos
 *    da metade da taxa do próprio monitor.
 *
 * Cada degrau mexe em UM eixo. Descer dois de uma vez esconde qual deles pagou,
 * e a cena passa a degradar mais do que precisava.
 */
const TIERS = [
  // O degrau de estúdio, e a cena COMEÇA nele.
  //
  // Antes o topo era 1,25, e isso estava errado: o teto de proteção virou teto
  // de todo mundo, então nem uma GPU boa recebia qualidade. O dono viu o
  // resultado antes de eu ver — "está ficando muito serrilhado" — e a causa era
  // exatamente essa.
  //
  // Esta cena é o pior caso possível para resolução baixa, porque é feita de
  // geometria FINA: cabo de 9 cm, montante de guarda-corpo, degrau de escada,
  // trama da grade, mesa da viga. Nenhuma delas cobre um pixel inteiro a 1,25,
  // e aresta que não cobre um pixel serrilha por definição — MSAA ajuda, não
  // salva.
  //
  // A lógica certa é qualidade por padrão e degradação como SEGURO: quem tem
  // máquina forte recebe o melhor, e a escada abaixo continua inteira para
  // socorrer quem não tem. O teto em 2 não é gosto — acima disso o ganho não se
  // vê e o custo, sendo quadrático, dobra.
  { dpr: 2, shadow: 4096, practicals: true },
  { dpr: 1.25, shadow: 2048, practicals: true },
  { dpr: 1.0, shadow: 2048, practicals: true },
  { dpr: 1.0, shadow: 1024, practicals: false },
  { dpr: 0.8, shadow: 1024, practicals: false },
] as const

type Tier = (typeof TIERS)[number]

/**
 * A janela de avaliação, medida nos DOIS eixos — e é o segundo que importa.
 *
 * Uma janela contada só em quadros parece razoável e falha exatamente onde não
 * pode falhar: numa máquina a dois quadros por segundo, quarenta e oito quadros
 * são vinte e quatro segundos, e o visitante que a qualidade adaptativa existe
 * para socorrer já foi embora antes da primeira decisão. Foi medido, com esses
 * números: no rasterizador de software a cena nunca chegou a rebaixar.
 *
 * Contada só em tempo, o problema se inverte: meio segundo a 144 Hz são setenta
 * quadros de mediana desnecessária, e a 2 Hz é UM quadro — mediana de amostra
 * única, que é o mesmo que reagir a um soluço.
 *
 * Os dois juntos: pelo menos `min` amostras para a mediana significar alguma
 * coisa, pelo menos `span` segundos para ela não ser um pico, e um teto de
 * amostras para a máquina rápida não passar a vida acumulando.
 */
const WINDOW = { min: 10, span: 0.5, cap: 90 } as const
/** Segundos ignorados no começo: compilação de shader, cube map e envio de textura. */
const WARMUP = 3
/** Segundos de espera depois de cada degrau, para o novo regime assentar. */
const SETTLE = 1.5

/**
 * Mede os quadros e rebaixa a cena sozinha quando a máquina não aguenta.
 *
 * **O orçamento sai do próprio monitor, não de um número redondo.** É a parte
 * que quase todo medidor de quadros erra: comparar `delta` contra 16,7 ms
 * rebaixa uma cena perfeita num painel de 30 Hz, onde o navegador nunca vai
 * entregar melhor que 33 ms por mais folga que a GPU tenha. O que se mede aqui,
 * durante o aquecimento, é o quadro MAIS RÁPIDO que o navegador entregou — que
 * é o período do vsync — e o orçamento passa a ser "não segurar metade da taxa
 * do monitor". Serve igual em 30, 60 e 144 Hz.
 *
 * **Só desce.** Subir de volta exigiria histerese, e histerese mal calibrada
 * faz a cena oscilar entre dois acabamentos a cada poucos segundos — o que é
 * pior de assistir do que ficar no degrau de baixo. Uma decisão que se toma uma
 * vez por carregamento e não se desfaz é a que menos chama atenção para si.
 */
function useQuality(): { tier: Tier; watch: (delta: number) => void } {
  const setDpr = useThree((state) => state.setDpr)
  // Começa no degrau SEGURO, não no de estúdio — e sobe se a máquina provar
  // que aguenta.
  //
  // A versão anterior começava no topo e caía. A ordem parece equivalente e não
  // é: numa máquina fraca, os primeiros segundos rodam a resolução dobrada
  // inteira antes de a escada perceber e descer, e quem a proteção existe para
  // socorrer paga o custo máximo justamente no pior momento — o carregamento.
  // Medido: o Lighthouse caiu de 78 para 76 e o LCP subiu de 5,6 s para 6,4 s
  // só por causa dessa janela.
  //
  // Provar antes de gastar custa um segundo de imagem mais macia em quem tem
  // GPU, e poupa o engasgo inteiro em quem não tem. É a troca certa.
  const [step, setStep] = useState(1)
  const meter = useRef({
    age: 0,
    since: 0,
    at: 0,
    span: 0,
    vsync: Infinity,
    gaps: new Float64Array(WINDOW.cap),
  })

  const tier = TIERS[Math.min(step, TIERS.length - 1)] ?? TIERS[0]

  useEffect(() => {
    // O valor do degrau, DIRETO — sem teto no `devicePixelRatio`.
    //
    // A versão anterior fazia `Math.min(window.devicePixelRatio, tier.dpr)` com
    // o raciocínio de que "num painel comum o devicePixelRatio é 1 e isso já é
    // o máximo que a tela sabe mostrar". O raciocínio é falso, e o dono viu o
    // resultado antes de mim: subi o degrau de estúdio para 2, ele recarregou,
    // e nada mudou — porque no monitor dele o `Math.min` devolvia 1.
    //
    // 1 é o máximo que a tela EXIBE, não o máximo que vale renderizar. Desenhar
    // acima e deixar o navegador reduzir é SUPERSAMPLING: cada pixel da tela
    // passa a ser a média de quatro amostras, e é a técnica mais eficaz que
    // existe contra serrilhado — a única que trata aresta fina, textura e
    // especular ao mesmo tempo, coisa que o MSAA não faz (ele só suaviza
    // silhueta de geometria).
    //
    // Esta cena é feita de aresta fina: cabo de 9 cm, montante de guarda-corpo,
    // degrau de escada, trama de grade. Sem supersampling nenhuma delas fecha
    // um pixel, e é por isso que cintilam quando a câmera se move.
    //
    // O custo é quadrático e assumido: quem não sustentar cai pelos degraus
    // abaixo, que continuam intactos.
    setDpr(tier.dpr)
  }, [tier, setDpr])

  const watch = (delta: number): void => {
    const own = meter.current
    own.age += delta
    if (own.age < WARMUP) {
      // O piso do aquecimento é o período do vsync. Preso entre 240 e 20 Hz
      // porque dois rAF que se juntam devolvem um delta absurdamente curto, e
      // uma leitura dessas fixaria um orçamento que nenhuma máquina cumpre.
      if (delta > 1 / 240 && delta < own.vsync) own.vsync = Math.min(delta, 1 / 20)
      return
    }
    if (own.age - own.since < SETTLE) return

    own.gaps[own.at++] = delta
    own.span += delta
    if (own.at < WINDOW.min || (own.span < WINDOW.span && own.at < WINDOW.cap)) return

    const sorted = [...own.gaps.subarray(0, own.at)].sort((a, b) => a - b)
    const median = sorted[own.at >> 1] ?? 0
    own.at = 0
    own.span = 0

    // Metade da taxa do monitor, e nunca mais folgado que 45 quadros por
    // segundo: num painel de 144 Hz, "metade" ainda seria rápido demais para
    // valer um rebaixamento.
    const slow = Math.max(own.vsync * 2.2, 1 / 45)
    if (median > slow && step < TIERS.length - 1) {
      own.since = own.age
      setStep((current) => current + 1)
      return
    }

    // A SUBIDA, e o limiar dela é bem mais apertado que o da descida.
    //
    // A assimetria é de propósito: subir dobra o custo de fragmento, então só
    // vale quando sobra folga de verdade — não quando o quadro está apenas
    // dentro do orçamento. Com os dois limiares iguais, a cena ficaria pingando
    // entre dois degraus, e trocar de resolução a cada dois segundos incomoda
    // mais que a resolução menor.
    //
    // `SETTLE` já impede a oscilação rápida; a margem impede a lenta.
    if (median < own.vsync * 1.25 && step > 0) {
      own.since = own.age
      setStep((current) => current - 1)
    }
  }

  return { tier, watch }
}

/**
 * `prefers-reduced-motion`, medido aqui dentro.
 *
 * `PorticoSlot` já não monta a cena quando a preferência está ligada, então
 * esta leitura é redundante **do ponto de vista da página** — e deliberada do
 * ponto de vista do componente: quem garante que a câmera não se mexe é a
 * câmera, não quem a montou. Sem isso, a promessa depende de um invólucro em
 * outro arquivo continuar fazendo a coisa certa para sempre.
 */
function useStill(): boolean {
  const [still, setStill] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const read = () => setStill(query.matches)
    read()
    query.addEventListener('change', read)
    return () => query.removeEventListener('change', read)
  }, [])
  return still
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
  runwayLens: THREE.BufferGeometry
  trolleyLens: THREE.BufferGeometry
  rope: THREE.MeshPhysicalMaterial
  /** A laçada do cabo. O `repeat` em V acompanha o comprimento, quadro a quadro. */
  ropeLay: THREE.Texture[]
  skin: THREE.MeshPhysicalMaterial
  steel: THREE.MeshPhysicalMaterial
  mesh: THREE.MeshPhysicalMaterial
  casting: THREE.MeshPhysicalMaterial
  lamp: THREE.MeshStandardMaterial
  flood: THREE.MeshStandardMaterial
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
  // A IDADE da máquina: escorrido de ferrugem, sujeira que assenta e o grão que
  // quebra a quina. `steelWearMap` continua dizendo de que aço a peça é feita;
  // este diz há quanto tempo ela está lá. Ver `steelSkinShader`.
  const age = tune(rustStreakMap())
  const rope = ropeTextures()
  const ropeLay = [tune(rope.normal), tune(rope.orm)]

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

  // Aço aparente: metalness alto e rugosidade baixa. Num metal a COR BASE é a
  // própria refletância, e é por isso que a primeira versão usava
  // `--color-border` e a máquina inteira sumia: um difuso quase preto continua
  // quase preto por mais luz que se jogue nele. O clearcoat sozinho só acendia
  // as arestas — o corpo seguia invisível.
  //
  // `--color-muted` é o token certo aqui e continua dentro da paleta: é um
  // cinza médio, exatamente a cor de aço industrial pintado.
  //
  // O mapa de desgaste entra como MULTIPLICADOR: o escalar marca o regime
  // (rugosidade baixa, aço aparente) e o mapa quebra o valor em volta dele.
  // Sem essa quebra a viga inteira devolve o mesmo especular de ponta a ponta e
  // vira plástico cromado — o outro jeito de uma cena 3D parecer desenho.
  const steel = keep(
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
  )
  const casting = keep(
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
  )
  // A idade entra nos dois, e é a mesma injeção nos dois — então eles PODEM
  // dividir o programa compilado, que é o motivo de a chave de cache ser uma
  // constante e não sair do material.
  steelSkinShader(steel, age)
  steelSkinShader(casting, age)

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
    // Doze lados, não oito. A silhueta de um octógono de 18 cm já se via nesta
    // distância, e com a laçada por cima ela se veria mais: o normal map
    // desenha o cordão dando a volta e a facetagem entrega que a volta é reta.
    // Quatro cabos — a conta inteira são algumas centenas de triângulos.
    cable: keep(new THREE.CylinderGeometry(0.09, 0.09, 1, 12)),
    runwayLens: keep(runwayLensGeometry(rig)),
    trolleyLens: keep(trolleyLensGeometry(rig)),
    // Cabo de aço trançado, não chapa pintada: reflete muito mais e quase não
    // tem cor própria. Clarear aqui não é licença de paleta, é o material.
    //
    // E ele é TRANÇADO, o que até aqui era só uma afirmação do comentário: um
    // cilindro liso devolve o especular numa faixa contínua e lê como tubo de
    // plástico. A laçada helicoidal (ver `ropeTextures`) é o que o olho
    // reconhece como cabo de aço.
    rope: keep(
      new THREE.MeshPhysicalMaterial({
        color: palette.muted,
        normalMap: rope.normal,
        normalScale: new THREE.Vector2(1.1, 1.1),
        aoMap: rope.orm,
        roughnessMap: rope.orm,
        metalnessMap: rope.orm,
        metalness: 1,
        roughness: 1,
        envMapIntensity: 5.4,
      }),
    ),
    ropeLay,
    skin,
    steel,
    casting,
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
    // O único uso de `--color-data` na cena: a lâmpada de estado da máquina.
    // Uma lâmpada que não emite não é lâmpada, é adesivo azul — e cor, aqui, é
    // informação.
    lamp: keep(new THREE.MeshStandardMaterial({ color: palette.data, emissive: palette.data, roughness: 0.35 })),
    // O vidro das luminárias de trabalho. Emite pelo mesmo motivo que a lâmpada
    // de estado emite — um refletor apagado que ilumina o chão é uma
    // contradição que o olho pega na hora — e a cor é `--color-text`, que já é
    // o branco quente da paleta e é exatamente a cor de um refletor de pátio.
    flood: keep(
      new THREE.MeshStandardMaterial({
        color: palette.text,
        emissive: palette.text,
        emissiveIntensity: 2.4,
        roughness: 0.4,
      }),
    ),
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
  const camera = useThree((state) => state.camera)
  const scene = useThree((state) => state.scene)
  const anisotropy = useMemo(() => Math.min(8, gl.capabilities.getMaxAnisotropy()), [gl])
  const palette = useMemo(readPalette, [])
  const still = useStill()
  const lens = useRef<Lens | null>(null)
  const { tier, watch } = useQuality()

  // A rotação sai do conteúdo, a disposição de cada sistema sai do tamanho da
  // stack dele, o inventário do pátio sai da frequência das marcas na rotação
  // inteira, e o ciclo sai dos três. Nenhum dos quatro sabe de three.js.
  const rotation = useMemo(() => sceneRotation(systems), [systems])
  const assemblies = useMemo(() => rotation.map(buildAssembly), [rotation])
  const manifest = useMemo(() => manifestFor(assemblies.map((build) => build.cargo)), [assemblies])
  const yard = useMemo(
    () => buildYard(manifest.bays, Math.max(...assemblies.map((b) => b.depth), 0)),
    [manifest, assemblies],
  )
  const home = useMemo(() => stow(manifest, yard.homes), [manifest, yard])
  const show = useMemo(
    () => createShow(home, manifest.crews, assemblies.map((build) => build.slots)),
    [home, manifest, assemblies],
  )

  // A máquina é dimensionada pelo TRABALHO da rotação inteira, não pelo sistema
  // da vez: se a ponte encolhesse junto com o sistema pequeno, a câmera se
  // mexeria a cada troca e a cena inteira pularia.
  const rig = useMemo(() => rigFor(show.peakY, show.reach), [show])

  /** Onde a lâmpada de estado mora, na testeira da casa de máquinas do carro. */
  const lampAt = useMemo((): [number, number, number] => [0, rig.trolleyY + 0.75, 1.6], [rig])

  /** As luminárias de trabalho — a fonte da poça de luz no concreto. */
  const floods = useMemo(() => floodsFor(rig), [rig])

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
  // na névoa, porque ele é escala e não assunto. A conta mora em
  // `portico-camera.ts`, sem three.js, porque é lá que ela é testada contra o
  // percurso inteiro da câmera.
  const bounds = useMemo(
    () => boundsFor(rig, work, yard.footprints, assemblies),
    [rig, work, yard, assemblies],
  )

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
    // A ordem das células é a das instâncias: o estoque comum primeiro, depois
    // as peças de assinatura de cada sistema na ordem da rotação.
    const cells: CargoCell[] = manifest.units.map((unit) => ({
      mark: markFor(unit.name),
      // O estoque tem valor de chapa próprio — a baia dele é uma baia como
      // outra qualquer, e é o que faz a fileira rasa da frente ler como um
      // conjunto em vez de peças soltas.
      plate: shade(palette.surface2, plateShade(unit.system < 0 ? rotation.length : unit.system, unit.role)),
      // O nome do sistema estampado pequeno, como o código de um contêiner
      // real. É o que dá contexto à montagem sem precisar de legenda — e ele
      // vem de `content/systems.ts` (ou do arquivo de dados da cena, para os
      // menores), nunca escrito aqui. Peça de estoque não leva código: ela não
      // é de sistema nenhum, e é justamente por isso que ela é uma só.
      code: unit.system < 0 ? '' : rotation[unit.system]?.name ?? '',
    }))
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
  }, [manifest, rotation, yard, work, rig, palette, anisotropy, floorHalf])

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
  const sunRef = useRef<THREE.DirectionalLight>(null)

  // Trocar `shadow.mapSize` sozinho não faz nada: o alvo de render já existe no
  // tamanho antigo e o three só o recria quando encontra `map` nulo. Descartar
  // e zerar é o que efetivamente devolve a memória e refaz o mapa no tamanho
  // novo — sem isto, o degrau de sombra da qualidade adaptativa não cortaria
  // custo nenhum e ainda pareceria ter funcionado.
  useEffect(() => {
    const sun = sunRef.current
    if (!sun) return
    sun.shadow.mapSize.set(tier.shadow, tier.shadow)
    sun.shadow.map?.dispose()
    sun.shadow.map = null
  }, [tier.shadow])

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

    // Antes de qualquer coisa, e inclusive nos quadros em que o passo fixo não
    // avança: quem está medindo os quadros não pode perder justamente os
    // quadros ruins.
    watch(delta)

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

    // A câmera anda no MESMO relógio do ciclo, e é isso que faz o movimento
    // fechar onde a rotação fecha em vez de bater contra ela. `own.clock` é
    // acumulado em passo fixo, então a pose da câmera é função pura do tempo:
    // determinística, igual em 30 Hz e em 144 Hz, como o resto da cena.
    if (!still && lens.current && camera instanceof THREE.PerspectiveCamera) {
      aim(camera, scene, lens.current, shotAt(own.clock, show.cycle))
    }

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
      // A laçada do cabo é uma medida em METROS, e o cabo estica: a malha é um
      // cilindro de altura 1 escalado pelo vão, então o UV em V vale o cabo
      // inteiro, seja ele de três metros ou de doze. Sem reescalar o `repeat`,
      // o passo da trança esticaria junto e o cabo de aço viraria elástico.
      // Os quatro cabos têm o mesmo vão a menos de um por cento, então um
      // número serve para os dois mapas.
      if (i === 0) {
        const lay = span / ROPE_LAY
        for (const texture of assets.ropeLay) texture.repeat.set(1, lay)
      }
    })
  })

  return (
    <>
      <Framing bounds={bounds} lens={lens} still={still} />

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
        ref={sunRef}
        castShadow
        position={[15, 27, 16]}
        intensity={2.6}
        shadow-mapSize={[tier.shadow, tier.shadow]}
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
        TODOS os contêineres da cena — o sistema da vez, os que esperam nas
        baias e o estoque comum — em três malhas instanciadas: chapa, moldura
        e cantoneiras. Uma malha por contêiner seriam quase noventa chamadas
        de desenho para uma decoração; assim são três.

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
      <mesh geometry={assets.runwayLens} material={assets.flood} />
      {/*
        Os refletores de pátio: fixos no trilho, rasantes, e SEM sombra de
        propósito.

        Fixos é o que eles trazem. A primeira tentativa pendurou as duas
        luminárias na VIGA, e elas viajavam junto com a ponte: metade do ciclo
        a máquina estava lá no fundo e o primeiro plano voltava a ser um piso
        de cinza uniforme, que é exatamente o defeito que a luz prática existe
        para corrigir. Presas ao trilho, o pátio tem estrutura de luz o tempo
        todo e é a MÁQUINA que passa por ela.

        Sombra daqui não acrescentaria nada e custaria dois passos: o que estes
        fachos alcançam é chão e a lateral das pilhas, e a leitura de volume já
        vem do sol.
      */}
      {tier.practicals &&
        floods.runway.map((flood) => (
          <spotLight
            key={flood.at[2]}
            position={flood.at}
            target-position={flood.aim}
            color={palette.text}
            intensity={PRACTICAL.runway}
            angle={0.42}
            penumbra={0.72}
            distance={rig.railY + 14}
            decay={2}
          />
        ))}

      <group ref={bridgeRef}>
        <mesh castShadow geometry={assets.bridge} material={assets.steel} />
        {/* A grade não projeta sombra: quinze metros acima do pátio, a trama
            viraria chuvisco no chão e roubaria a leitura da montagem. */}
        <mesh geometry={assets.grating} material={assets.mesh} />
      </group>

      <group ref={trolleyRef}>
        <mesh castShadow geometry={assets.trolley} material={assets.steel} />
        <mesh geometry={assets.trolleyLens} material={assets.flood} />
        <mesh position={lampAt} material={assets.lamp}>
          <sphereGeometry args={[0.11, 12, 10]} />
        </mesh>
        <pointLight ref={lampRef} position={lampAt} color={palette.data} distance={6} decay={2} />
        {/*
          O refletor de trabalho — a única luz da cena, além do sol, que projeta
          sombra, e a que paga o próprio custo.

          Ela viaja com o carro, então a carga suspensa está SEMPRE dentro do
          facho e a sombra dela cai sempre dentro da própria poça. É a leitura
          que o piso não tinha: a carga deixa de pairar sobre um cinza uniforme
          e passa a ter um lugar no chão, que se aproxima dela conforme desce.

          O mapa é pequeno porque o facho é pequeno: 1024 sobre um cone de 0,55
          rad dá mais resolução angular do que os 2048 do sol espalhados por
          cinquenta metros de pátio.
        */}
        {tier.practicals && (
          <spotLight
            position={floods.trolley.at}
            target-position={floods.trolley.aim}
            color={palette.text}
            intensity={PRACTICAL.trolley}
            angle={0.55}
            penumbra={0.72}
            distance={rig.trolleyY + 10}
            decay={2}
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-camera-near={2}
            shadow-camera-far={rig.trolleyY + 10}
            shadow-bias={-0.0012}
            shadow-normalBias={0.05}
          />
        )}
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
        // O teto abre até 2 e quem manda nele é `useQuality`, que começa no
        // degrau de estúdio e desce se o quadro não sustentar.
        //
        // A versão anterior fixava 1,25 aqui, e o valor virava teto de todo
        // mundo: nem uma GPU com folga recebia qualidade, e a cena serrilhava
        // na geometria fina — cabo, guarda-corpo, degrau de escada, trama da
        // grade. Proteger o caso ruim punindo o caso bom é o erro; o seguro
        // certo é a escada de degradação, que continua inteira logo abaixo.
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        // A paleta é escura de ponta a ponta e o tone mapping ACES (padrão do
        // r3f) fecha ainda mais a sombra. Um pouco de exposição extra é o que
        // devolve a leitura do material sem clarear tinta nenhuma.
        //
        // Fica no renderer, e não num passe de compositor, porque a cena
        // continua sendo desenhada direto na tela: ver o relatório da tarefa 23,
        // onde o pós-processamento foi medido e cortado. É o mesmo motivo pelo
        // qual `antialias: true` continua sendo o antisserrilhado desta cena.
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
