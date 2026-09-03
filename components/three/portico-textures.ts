import * as THREE from 'three'

/**
 * Todas as texturas da cena, geradas em canvas no próprio navegador.
 *
 * Regra dura do projeto: zero requisição externa. O site é export estático
 * publicado no GitHub Pages e não pode buscar HDRI de CDN, `.glb` nem
 * bitmap nenhum — então a corrugação da chapa, a marcação da carga e a
 * mancha do piso nascem aqui, em código, e são idênticas a cada carregamento
 * (nenhuma delas usa `Math.random()`).
 *
 * A corrugação é NORMAL MAP, não geometria: é o que faz a chapa lateral
 * pegar luz como aço ondulado sem multiplicar vértice nenhum. Um contêiner
 * de parede lisa é uma caixa, e caixa lê como bloco de brinquedo.
 *
 * ONDE ESTE ARQUIVO COMEÇA E TERMINA. O laço por pixel dos cinco mapas puros
 * mudou-se para `portico-pixels.ts`, que não importa three nem toca no DOM —
 * é o que permite rodá-los num Worker, fora da thread que pinta a página (ver
 * `portico-texturas.worker.ts` e a medição em `scripts/medir-portico.mts`).
 * Aqui fica a EMBALAGEM: canvas, `CanvasTexture`, wrapping, flipY. E fica o
 * que não pode atravessar a fronteira — `cargoAtlas` e `floorTextures`, que
 * dependem da paleta, da fonte resolvida e do conteúdo.
 */

import {
  corrugationNormalPixels,
  grimePixels,
  rustStreakPixels,
  skinWearPixels,
  steelWearPixels,
  type CorrugationOptions,
  type MapaCru,
} from './portico-pixels'
import { RIB_CLIP, SIDE_RIBS, fade, fbm, ribSlope, unitNoise, valueNoise } from './portico-pixels'

// Reexportados para que nada mais no projeto precise saber que a fronteira
// existe: `Portico.tsx` e o resto continuam importando daqui.
export {
  CORRUGACAO,
  MAPAS,
  RIB_CLIP,
  SIDE_RIBS,
  gerarMapas,
  ribSlope,
  unitNoise,
  type MapaCru,
  type Mapas,
  type NomeDeMapa,
} from './portico-pixels'

function surface(width: number, height: number): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d indisponível')
  return ctx
}

/**
 * Bytes viram textura.
 *
 * O caminho é deliberadamente o MESMO de antes — `putImageData` num canvas e
 * `CanvasTexture` por cima — e não `DataTexture`, que pareceria mais direto.
 * O motivo é `flipY`: `CanvasTexture` o traz ligado, e `rustStreakPixels`
 * depende disso (o topo do canvas é o alto da peça; ver o comentário lá). Com
 * `DataTexture` o mapa de ferrugem escorreria PARA CIMA.
 *
 * O custo aqui é de ~1 ms por mapa: `putImageData` é cópia de memória. O que
 * era caro — gerar o pixel — é o que saiu para o worker.
 */
export function comoTextura(mapa: MapaCru): THREE.CanvasTexture {
  const ctx = surface(mapa.width, mapa.height)
  ctx.putImageData(new ImageData(mapa.data, mapa.width, mapa.height), 0, 0)
  const texture = new THREE.CanvasTexture(ctx.canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  return texture
}

// Os cinco invólucros. Existem para o caminho de emergência (sem worker) e
// para os testes: a assinatura é a de sempre, e quem chama não muda.
export const corrugationNormalMap = (options: CorrugationOptions): THREE.CanvasTexture =>
  comoTextura(corrugationNormalPixels(options))
export const skinWearMap = (ribs: number): THREE.CanvasTexture => comoTextura(skinWearPixels(ribs))
export const grimeMap = (): THREE.CanvasTexture => comoTextura(grimePixels())
export const steelWearMap = (): THREE.CanvasTexture => comoTextura(steelWearPixels())
export const rustStreakMap = (): THREE.CanvasTexture => comoTextura(rustStreakPixels())


/**
 * A escala do mapa de idade no mundo, em ladrilhos por metro.
 *
 * `along` dá ~6,3 m de volta lateral — com 42 colunas, um escorrido a cada 15
 * cm, que é a largura de uma mancha de ferrugem de verdade. `rise` dá ~11 m de
 * ladrilho vertical, e o decaimento do rastro come entre um oitavo e um terço
 * dele: escorridos de 1,4 a 3,7 m, que é o que se vê numa viga de pátio.
 */
const AGE = { along: 0.16, rise: 0.09 } as const

/**
 * Faixa da quina, em METROS, onde a tinta já não existe.
 *
 * Três centímetros não é palpite: é a ordem de grandeza do raio de dobra de uma
 * chapa e da mordida que a lixadeira dá antes de repintar. O número só significa
 * alguma coisa porque a face declara o próprio tamanho (ver `NO_EDGE` e
 * `faceSpans`, em `portico-geometry.ts`) — em fração de UV ele valeria metros
 * numa peça e milímetros na outra.
 */
const EDGE_BITE = { start: 0.004, end: 0.03 } as const

/**
 * Liga o mapa de idade ao aço da máquina: gravidade, escorrido e desgaste de
 * quina, tudo em espaço de OBJETO.
 *
 * **Espaço de objeto, e não de mundo, e a escolha não é detalhe.** A ponte anda
 * em Z, o carro anda em X e Z, o spreader gira com o balanço. Amostrado em
 * coordenada de mundo, o mapa ficaria PARADO e a máquina passaria por baixo
 * dele: a ferrugem escorreria pela viga como água num vidro, que é o defeito
 * mais delator que existe numa textura procedural. Em espaço de objeto a
 * sujeira está pintada na peça e viaja com ela — que é o que sujeira faz. E
 * como nenhum grupo desta cena gira em torno de X ou Z além de poucos graus, o
 * "para cima" do objeto continua sendo o para cima do mundo, que é o que a
 * gravidade exige.
 *
 * As três leituras, e o que cada uma faz com o material:
 *
 * - **`lie`** — o quanto a face está deitada. Topo de viga e piso de passarela
 *   acumulam; parede fica limpa, porque a chuva lava. É a assimetria que dá
 *   volume à sujeira em vez de espalhá-la por igual.
 * - **`drip`** — o escorrido, e ele só existe em superfície DE PÉ (`wall`).
 *   Escorrido no teto de uma caixa seria água correndo para o lado.
 * - **`edge`** — a quina descascada, em metros de verdade.
 *
 * O que o desgaste faz com o material é o oposto do que faz a ferrugem, e é por
 * isso que os dois se distinguem numa cena sem cor: **quina descascada é METAL**
 * (metalicidade sobe, rugosidade cai, clareia, porque aço nu reflete o
 * estúdio); **ferrugem é o contrário de metal** (metalicidade desce a quase
 * zero, rugosidade sobe, escurece). Um mesmo cinza médio lido de dois jeitos
 * opostos pela luz.
 *
 * E o verniz morre junto: onde a ferrugem venceu não há mais tinta, então não
 * há mais camada transparente por cima dela. Sem isso o escorrido sairia
 * envernizado — ferrugem com brilho de carro novo.
 */
export function steelSkinShader(material: THREE.Material, age: THREE.Texture): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uAge = { value: age }
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        [
          '#include <common>',
          // `uv1` carrega o TAMANHO da face, não uma coordenada. O three só o
          // declara sozinho quando alguma textura usa o canal 1, e aqui
          // nenhuma usa — se um dia usar, esta linha vira declaração dupla.
          'attribute vec2 uv1;',
          'varying vec3 vAgePos;',
          'varying vec3 vAgeNormal;',
          'varying vec4 vAgeFace;',
        ].join('\n'),
      )
      .replace(
        '#include <begin_vertex>',
        [
          '#include <begin_vertex>',
          // `objectNormal` já existe: `beginnormal_vertex` vem antes deste.
          'vAgePos = transformed;',
          'vAgeNormal = objectNormal;',
          'vAgeFace = vec4( uv, uv1 );',
        ].join('\n\t'),
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        [
          '#include <common>',
          'uniform sampler2D uAge;',
          'varying vec3 vAgePos;',
          'varying vec3 vAgeNormal;',
          'varying vec4 vAgeFace;',
        ].join('\n'),
      )
      .replace(
        '#include <metalnessmap_fragment>',
        [
          '#include <metalnessmap_fragment>',
          'vec3 ageN = normalize( vAgeNormal );',
          'float lie = smoothstep( 0.22, 0.82, ageN.y );',
          'float wall = 1.0 - abs( ageN.y );',
          // A coordenada que corre ao longo da face: numa face virada para X
          // quem anda é Z, e vice-versa. Sem isso o mapa esticaria nas laterais.
          'float along = mix( vAgePos.x, vAgePos.z, step( abs( ageN.z ), abs( ageN.x ) ) );',
          `vec3 age = texture2D( uAge, vec2( along * ${AGE.along}, vAgePos.y * ${AGE.rise} ) ).rgb;`,
          'float drip = age.r * wall;',
          'float dirt = age.g * mix( 0.18, 1.0, lie );',
          'vec2 inset = ( 0.5 - abs( vAgeFace.xy - 0.5 ) ) * vAgeFace.zw;',
          `float edge = 1.0 - smoothstep( ${EDGE_BITE.start}, ${EDGE_BITE.end}, min( inset.x, inset.y ) );`,
          // A tinta larga a quina EM PEDAÇOS. Sem esta mordida o desgaste sai
          // como um fio contínuo em volta de cada peça, e uma peça contornada
          // de ponta a ponta lê como arame de wireframe, não como aço gasto —
          // foi o que a primeira captura mostrou.
          'edge *= 0.14 + 0.86 * age.b;',
          // Superfície deitada acumula e fica FOSCA: é a rugosidade, e não o
          // valor, que faz a sujeira horizontal ler. Escurecer o topo brigaria
          // com o sol, que é justamente quem mais bate nele.
          'roughnessFactor = clamp( roughnessFactor * ( 1.0 + 0.72 * drip + 0.8 * dirt ) - 0.2 * edge, 0.05, 1.0 );',
          'metalnessFactor = clamp( metalnessFactor * ( 1.0 - 0.82 * drip - 0.4 * dirt ) + 0.45 * edge, 0.0, 1.0 );',
          'diffuseColor.rgb *= 1.0 - 0.46 * drip - 0.26 * dirt + 0.19 * edge;',
        ].join('\n\t'),
      )
      .replace(
        '#include <lights_physical_fragment>',
        [
          '#include <lights_physical_fragment>',
          'material.clearcoat = clamp( material.clearcoat * ( 1.0 - 0.85 * drip - 0.45 * dirt ), 0.0, 1.0 );',
          'material.clearcoatRoughness = clamp( material.clearcoatRoughness + 0.32 * drip + 0.2 * dirt, 0.0, 1.0 );',
        ].join('\n\t'),
      )
  }
  // Sem isto o three reaproveita o programa de um material com as mesmas
  // opções e a máquina sai sem história nenhuma.
  material.customProgramCacheKey = () => 'portico-steel-age'
}

// ── Cabo de aço ───────────────────────────────────────────────────────────

/**
 * O passo da laçada, em metros — o comprimento em que um cordão dá uma volta
 * inteira em torno do cabo.
 *
 * Sete diâmetros é o passo de um cabo de aço real, e o cabo desta máquina tem
 * 18 cm. Quem multiplica é `Portico.tsx`, a cada quadro: o cabo ESTICA conforme
 * a garra desce, e um `repeat` fixo faria a laçada esticar junto — o cabo
 * viraria elástico. Amarrado ao comprimento, o passo é sempre o mesmo em metros
 * e o que muda é quantas voltas cabem.
 */
export const ROPE_LAY = 1.26

/**
 * A torção do cabo, em normal e ORM.
 *
 * Ampliados, os cabos liam como tubo de plástico — um cilindro liso com um
 * especular escorrendo por ele de ponta a ponta. Cabo de aço não é liso: são
 * seis cordões laçados em hélice, e é a laçada que o olho reconhece.
 *
 * A hélice sai de graça da geometria do UV do cilindro. `u` dá a volta na
 * circunferência e `v` corre no comprimento, então um cordão que avança uma
 * volta por passo é a reta `u − v = constante` — e `fract((u − v) * 6)` são os
 * seis cordões. Fecha nos dois eixos porque seis é inteiro: atravessar o mapa
 * em `u` ou em `v` avança seis cordões exatos, e não há emenda.
 *
 * O ângulo aparente da hélice não é escolhido: ele CAI do mapeamento. Uma volta
 * de `u` vale a circunferência (56 cm) e uma de `v` vale o passo (1,26 m), então
 * a diagonal a 45° no mapa sai a 24° no cabo — que é o ângulo de um cabo de
 * verdade, sem ninguém ter digitado 24.
 *
 * Por cima vem a contra-hélice dos ARAMES dentro de cada cordão, no sentido
 * oposto (`u + v`) e cinco vezes mais fina. É ela que impede o cordão de
 * parecer uma rosca de parafuso.
 */
export function ropeTextures(): { normal: THREE.CanvasTexture; orm: THREE.CanvasTexture } {
  const size = 128
  /** Cordões no cabo. Seis em volta de uma alma é a construção mais comum. */
  const strands = 6
  const normalCtx = surface(size, size)
  const ormCtx = surface(size, size)
  const normalImage = normalCtx.createImageData(size, size)
  const ormImage = ormCtx.createImageData(size, size)
  const nrm = normalImage.data
  const orm = ormImage.data

  for (let y = 0; y < size; y++) {
    const v = 1 - (y + 0.5) / size
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size
      const i = (y * size + x) * 4

      // Onde o pixel está DENTRO do cordão, em -0,5..0,5.
      const lay = (u - v) * strands
      const across = lay - Math.floor(lay) - 0.5
      // Perfil redondo do cordão: a derivada é o que vira normal.
      const slope = -Math.sin(2 * Math.PI * across)
      const round = Math.cos(Math.PI * across)

      // Os arames dentro do cordão, no sentido contrário.
      const wire = (u + v) * strands * 5
      const wireAcross = wire - Math.floor(wire) - 0.5
      const wireSlope = -Math.sin(2 * Math.PI * wireAcross) * 0.22

      // O gradiente do sulco corre na diagonal do mapa, e é ele que dá a
      // hélice: a laçada empurra U num sentido e V no outro.
      const nx = (slope + wireSlope) * 1.35
      const ny = -(slope - wireSlope) * 1.35
      const inv = 1 / Math.hypot(nx, ny, 1)
      nrm[i] = Math.round((nx * inv * 0.5 + 0.5) * 255)
      nrm[i + 1] = Math.round((ny * inv * 0.5 + 0.5) * 255)
      nrm[i + 2] = Math.round((inv * 0.5 + 0.5) * 255)
      nrm[i + 3] = 255

      // Fundo do sulco escuro e áspero — é onde mora a graxa. Topo do cordão
      // lustrado, porque é ele que corre na polia.
      const crown = Math.max(0, round)
      const occlusion = 0.42 + 0.58 * crown
      const roughness = 0.5 - 0.28 * crown + 0.1 * (valueNoise(u, v, 40, 40, 5387) - 0.5)
      orm[i] = Math.round(255 * Math.max(0, Math.min(1, occlusion)))
      orm[i + 1] = Math.round(255 * Math.max(0.08, Math.min(1, roughness)))
      orm[i + 2] = 255
      orm[i + 3] = 255
    }
  }
  normalCtx.putImageData(normalImage, 0, 0)
  ormCtx.putImageData(ormImage, 0, 0)

  const wrap = (ctx: CanvasRenderingContext2D): THREE.CanvasTexture => {
    const texture = new THREE.CanvasTexture(ctx.canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    return texture
  }
  return { normal: wrap(normalCtx), orm: wrap(ormCtx) }
}

/**
 * Descobre a família mono resolvida do design system.
 *
 * `--font-mono` é declarada como `var(--font-geist-mono), ui-monospace,…` e
 * `getPropertyValue` devolveria o `var()` cru, que o canvas não entende. Ler
 * o `font-family` COMPUTADO de um elemento com a classe do Tailwind é o único
 * jeito de chegar no nome real da fonte que o resto da página está usando —
 * a marcação da chapa tem de ser a mesma fonte dos rótulos em HTML.
 */
export function resolveMonoFamily(): string {
  const probe = document.createElement('span')
  probe.className = 'font-mono'
  probe.style.position = 'absolute'
  probe.style.visibility = 'hidden'
  document.body.appendChild(probe)
  const family = getComputedStyle(probe).fontFamily
  probe.remove()
  return family || 'ui-monospace, monospace'
}

export type RedrawableTexture = { texture: THREE.CanvasTexture; redraw: () => void }

type Rect = { x: number; y: number; width: number; height: number }
/** Tamanho máximo do caractere por número de linhas do estêncil. */
type Sizing = { single: number; double: number; min: number }

/**
 * Estampa as linhas centradas no retângulo, encolhendo o corpo até caberem.
 */
function drawStencil(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  box: Rect,
  ink: string,
  family: string,
  sizing: Sizing,
): void {
  const budget = box.width * 0.82
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0.07em'

  let size = lines.length > 1 ? sizing.double : sizing.single
  const fits = (candidate: number): boolean => {
    ctx.font = `600 ${candidate}px ${family}`
    return lines.every((line) => ctx.measureText(line).width <= budget)
  }
  while (size > sizing.min && !fits(size)) size -= 2
  ctx.font = `600 ${size}px ${family}`

  const leading = size * 1.16
  const top = box.y + box.height / 2 - ((lines.length - 1) * leading) / 2
  ctx.fillStyle = ink
  lines.forEach((line, i) => ctx.fillText(line, box.x + box.width / 2, top + i * leading))
}

// ── Cor de marca ──────────────────────────────────────────────────────────

/**
 * **A única exceção autorizada à paleta do projeto, por decisão explícita do
 * dono.** Os onze tokens de `app/globals.css` continuam valendo para tudo o
 * mais — chapa, estrutura, chão, estêncil. Os ícones de tecnologia saem na
 * cor OFICIAL da marca, declarada pelo próprio `simple-icons`.
 *
 * O motivo: as marcas são DADO, não decoração. Num pátio monocromático elas
 * viram a única cor da cena, que é exatamente o efeito desejado — e um
 * PostgreSQL cinza seria uma informação errada, não uma escolha de estilo.
 *
 * Não "corrija" isto para um token da paleta.
 */

/** Componente linearizada, como manda a fórmula de luminância relativa do WCAG 2. */
function channel(value: number): number {
  const v = value / 255
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}

function parseHex(hex: string): [number, number, number] {
  const raw = hex.replace('#', '')
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw
  return [
    Number.parseInt(full.slice(0, 2), 16) || 0,
    Number.parseInt(full.slice(2, 4), 16) || 0,
    Number.parseInt(full.slice(4, 6), 16) || 0,
  ]
}

/** Luminância relativa (WCAG 2), 0 = preto, 1 = branco. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** Razão de contraste do WCAG 2 entre duas cores, 1:1 a 21:1. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/**
 * Abaixo disto a marca não se separa da chapa e ganha painel de aplicação.
 *
 * 3:1 é o mínimo do WCAG 2 para elemento gráfico não textual — que é
 * exatamente o que um logotipo é.
 */
export const PANEL_MIN_CONTRAST = 3

/**
 * A marca escura NÃO é clareada. Clarear falseia a identidade: um leitor
 * técnico reconhece um Next.js cinza como errado.
 *
 * O que uma gráfica faz ao imprimir logo escuro em fundo escuro é aplicar um
 * DECALQUE claro e imprimir a marca por cima, na cor verdadeira. É isso aqui.
 * E a decisão é medida, nunca listada: quem passa de `PANEL_MIN_CONTRAST`
 * contra a chapa daquele contêiner vai direto na chapa corrugada, quem não
 * passa ganha o painel. Lista manual sairia de sincronia na primeira mudança
 * do dicionário; a medição, não.
 */
export function needsPanel(brand: string, plate: string): boolean {
  return contrastRatio(brand, plate) < PANEL_MIN_CONTRAST
}

// ── Atlas de carga ────────────────────────────────────────────────────────

/**
 * As chapas de TODOS os contêineres da cena, num canvas só.
 *
 * Eles existem para serem instanciados: quarenta e poucos contêineres que
 * compartilham geometria e material e diferem só em transformação e
 * marcação. Um material carrega uma textura, então a marcação de cada um vira
 * uma CÉLULA de um atlas, e cada instância recebe o deslocamento da sua
 * célula por atributo (`aCargo`, ver `cargoAtlasShader`). É o que mantém a
 * cena inteira em três chamadas de desenho em vez de cento e trinta.
 */

/** Proporção da célula ≈ a da face longa da chapa (5,90 × 2,43 m). */
const CARGO_CELL = { width: 384, height: 164 } as const
/**
 * Recuo do retângulo amostrado dentro da célula. Sem ele, o filtro trilinear
 * puxa o vizinho no mip mais grosseiro e a marcação de um contêiner vaza para
 * o outro.
 */
const CARGO_INSET = 0.015

/**
 * Onde as faces SEM marcação (testeiras, teto e fundo) amostram a célula.
 *
 * Um ponto só, no alto da célula, dentro da margem que o desenho nunca
 * invade: a face inteira sai na cor da chapa, sem esticar o ícone do vizinho
 * por cima dela. Ver `yardPlateGeometry`.
 */
export const CARGO_FLAT_UV: readonly [number, number] = [0.03, 0.93]

// `SIDE_RIBS` mudou-se para `portico-pixels.ts` — o worker precisa dela e não
// pode importar deste arquivo. Continua reexportada acima.

/** O que vai estampado: o ícone da marca, ou o nome em estêncil quando ela não existe. */
export type CargoMark = { kind: 'icon'; path: string; hex: string } | { kind: 'text'; lines: string[] }

export type CargoCell = {
  mark: CargoMark
  /** Cor da chapa deste contêiner — é contra ela que o contraste é medido. */
  plate: string
  /** Rótulo da camada, estampado pequeno como o código de um contêiner real. */
  code: string
}

export type CargoInks = {
  /** Tinta do estêncil de nome. */
  stencil: string
  /** Tinta do código da camada, mais apagada — é marcação de serviço. */
  code: string
  /** Chapa clara do painel de aplicação das marcas escuras. */
  panel: string
}

export type CargoAtlas = RedrawableTexture & {
  /** Deslocamento da célula de cada instância, pronto para virar atributo. */
  offsets: Float32Array
  /** Tamanho da célula em UV, o mesmo para todas. */
  scale: THREE.Vector2
  /** Quantas marcas ganharam painel de aplicação — medido, não estimado. */
  panels: number
}

/**
 * Tamanho do ícone em fração da altura da célula.
 *
 * Menor do que parece que deveria ser, de propósito: com quarenta marcas
 * coloridas na mesma cena, ícone grande vira confete. A cor faz o trabalho de
 * identificar; o tamanho só precisa ser suficiente para a forma ler.
 */
const ICON_SCALE = 0.44
/** O decalque em volta da marca escura — margem de aplicação, como um adesivo real. */
const PANEL_PAD = 1.42

export function cargoAtlas(cells: readonly CargoCell[], inks: CargoInks, family: string): CargoAtlas {
  const count = Math.max(1, cells.length)
  // Colunas escolhidas para o canvas sair o mais quadrado possível: um atlas
  // comprido demais estoura o limite de textura antes de estourar a memória.
  const cols = Math.max(1, Math.round(Math.sqrt((count * CARGO_CELL.height) / CARGO_CELL.width)))
  const rows = Math.max(1, Math.ceil(count / cols))
  const ctx = surface(cols * CARGO_CELL.width, rows * CARGO_CELL.height)

  let panels = 0

  const draw = (): void => {
    panels = 0
    cells.forEach((cell, i) => {
      const box: Rect = {
        x: (i % cols) * CARGO_CELL.width,
        y: Math.floor(i / cols) * CARGO_CELL.height,
        width: CARGO_CELL.width,
        height: CARGO_CELL.height,
      }
      ctx.fillStyle = cell.plate
      ctx.fillRect(box.x, box.y, box.width, box.height)

      if (cell.mark.kind === 'text') {
        drawStencil(ctx, cell.mark.lines, box, inks.stencil, family, { single: 74, double: 48, min: 14 })
      } else {
        const size = box.height * ICON_SCALE
        if (needsPanel(cell.mark.hex, cell.plate)) {
          panels += 1
          drawPanel(ctx, box, size * PANEL_PAD, inks.panel, cell.plate)
        }
        // O `path` do simple-icons é desenhado numa caixa 24×24 — a mesma do
        // viewBox — então basta escalar.
        ctx.save()
        ctx.fillStyle = cell.mark.hex
        ctx.translate(box.x + (box.width - size) / 2, box.y + (box.height - size) / 2)
        ctx.scale(size / 24, size / 24)
        ctx.fill(new Path2D(cell.mark.path))
        ctx.restore()
      }

      drawCode(ctx, box, cell.code, inks.code, family)
    })
  }

  draw()
  const texture = new THREE.CanvasTexture(ctx.canvas)
  texture.colorSpace = THREE.SRGBColorSpace

  const offsets = new Float32Array(count * 2)
  for (let i = 0; i < count; i++) {
    // O eixo V da textura cresce ao contrário do eixo Y do canvas.
    const bottom = rows - 1 - Math.floor(i / cols)
    offsets[i * 2] = ((i % cols) + CARGO_INSET) / cols
    offsets[i * 2 + 1] = (bottom + CARGO_INSET) / rows
  }

  return {
    texture,
    offsets,
    scale: new THREE.Vector2((1 - 2 * CARGO_INSET) / cols, (1 - 2 * CARGO_INSET) / rows),
    get panels() {
      return panels
    },
    redraw: () => {
      draw()
      texture.needsUpdate = true
    },
  }
}

/**
 * O painel de aplicação: a chapa clara sobre a qual a marca escura é impressa.
 *
 * Ele precisa parecer APLICADO, não flutuando. Duas coisas fazem isso:
 *
 * 1. **A onda por baixo.** O adesivo acompanha a corrugação da chapa, então o
 *    painel recebe as mesmas faixas de sombra — calculadas com `ribSlope`, a
 *    MESMA função que gera o normal map, na mesma frequência (`SIDE_RIBS`) e
 *    na mesma fase. Um retângulo perfeitamente liso sobre chapa ondulada
 *    denuncia que é textura.
 * 2. **A borda.** Um fio da própria cor da chapa em volta, que é a sombra da
 *    espessura do decalque.
 */
function drawPanel(ctx: CanvasRenderingContext2D, box: Rect, size: number, panel: string, plate: string): void {
  const width = size * 1.16
  const height = size
  const x = box.x + (box.width - width) / 2
  const y = box.y + (box.height - height) / 2

  ctx.save()
  ctx.fillStyle = panel
  ctx.fillRect(x, y, width, height)

  // A onda da chapa por baixo do adesivo: mesma frequência, mesma fase.
  ctx.fillStyle = plate
  const step = 2
  for (let px = 0; px < width; px += step) {
    const u = (x - box.x + px) / box.width
    const shade = Math.max(0, -ribSlope(u, SIDE_RIBS) / RIB_CLIP)
    if (shade <= 0.01) continue
    ctx.globalAlpha = 0.22 * shade
    ctx.fillRect(x + px, y, step, height)
  }

  ctx.globalAlpha = 0.55
  ctx.strokeStyle = plate
  ctx.lineWidth = Math.max(1, size * 0.035)
  ctx.strokeRect(x, y, width, height)
  ctx.restore()
}

/**
 * O código de camada, no canto de baixo.
 *
 * Um contêiner real leva o logotipo grande e um bloco de códigos pequeno; é
 * essa hierarquia que faz a chapa parecer marcada em vez de decorada. Aqui o
 * código é o rótulo da camada do dicionário: cada contêiner diz de que
 * patamar da arquitetura ele é.
 */
function drawCode(ctx: CanvasRenderingContext2D, box: Rect, code: string, ink: string, family: string): void {
  if (!code) return
  const size = box.height * 0.082
  ctx.save()
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0.14em'
  ctx.font = `500 ${size}px ${family}`
  ctx.fillStyle = ink
  ctx.fillText(code.toUpperCase(), box.x + box.width * 0.055, box.y + box.height * 0.9)
  ctx.restore()
}

/**
 * Que FRAÇÃO do mapa de história cada face amostra.
 *
 * O número decide se a variação por unidade existe ou não, e a primeira versão
 * errou nele: com a face inteira cobrindo o mapa inteiro, deslocar o UV só
 * escolhia qual pedaço ficava no meio — toda chapa continuava exibindo a mesma
 * mancha, o mesmo escorrido e a mesma média, e as quarenta caixas saíam
 * estatisticamente idênticas. Amostrando um TERÇO, cada unidade cai numa
 * região com caráter próprio: uma pega a mancha grande, a vizinha pega a parte
 * limpa. E como o mapa ladrilha sem costura, o deslocamento pode ser qualquer
 * número em 0..1 sem emenda aparecer.
 */
const WEAR_PATCH = 0.34

/**
 * Liga o atlas E a história de cada unidade ao material da chapa.
 *
 * Dois atributos por instância, e eles resolvem problemas diferentes:
 *
 * - `aCargo` desloca o UV do `map` para a célula do atlas daquele contêiner. A
 *   alternativa seria um material por contêiner, que é justamente o que a
 *   instanciação existe para evitar.
 * - `aWear` desloca o UV do mapa de história (`grimeMap`). É o que faz duas
 *   caixas com a mesma chapa, a mesma corrugação e o mesmo material saírem
 *   DIFERENTES: uma pegou o escorrido, a outra a mancha de sal. Sem isso a
 *   pirâmide vira uma fileira de clones, que o olho detecta de longe mesmo sem
 *   saber o que está vendo.
 *
 * O UV do normal map e do mapa ORM continua 0..1 por face, intocado: a
 * corrugação sai da mesma prensa em todo contêiner do mundo e a oclusão dos
 * vales tem de ficar TRAVADA nela. Oclusão é estrutura, sujeira é história —
 * misturar as duas descola a sombra do vale que a produz.
 *
 * A sujeira mexe em rugosidade e em VALOR da chapa, nunca em matiz: é a mesma
 * tinta multiplicada, como em `shade()`. E o clareamento da quina é comandado
 * pela metalicidade do mapa ORM, que é onde a tinta gastou — o brilho vem de o
 * aço refletir o estúdio, não de tinta nova.
 */
export function containerSkinShader(material: THREE.Material, scale: THREE.Vector2, grime: THREE.Texture): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uCargoScale = { value: scale }
    shader.uniforms.uGrime = { value: grime }
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nattribute vec2 aCargo;\nattribute vec2 aWear;\nuniform vec2 uCargoScale;\nvarying vec2 vWearUv;',
      )
      .replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>
	vMapUv = vMapUv * uCargoScale + aCargo;
	vWearUv = uv * ${WEAR_PATCH.toFixed(2)} + aWear;`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D uGrime;\nvarying vec2 vWearUv;')
      .replace(
        '#include <metalnessmap_fragment>',
        [
          '#include <metalnessmap_fragment>',
          'float unitGrime = texture2D( uGrime, vWearUv ).r;',
          'roughnessFactor = clamp( roughnessFactor * mix( 0.82, 1.16, unitGrime ), 0.12, 1.0 );',
          'diffuseColor.rgb *= mix( 1.14, 0.8, unitGrime ) * ( 1.0 + metalnessFactor * 0.34 );',
        ].join('\n\t'),
      )
  }
  // Sem isto o three reaproveita o programa de outro material com as mesmas
  // opções e a cena inteira sai amostrando a mesma célula.
  material.customProgramCacheKey = () => 'portico-container-skin'
}

// ── Piso do pátio ─────────────────────────────────────────────────────────

/**
 * Uma baia pintada no chão: onde ela está e que número leva.
 */
export type FloorBay = { x: number; z: number; length: number; width: number; code: string }

export type FloorPlan = {
  bays: readonly FloorBay[]
  /** Meia-largura do plano de chão, em metros. */
  half: number
  /** Meia-extensão da área onde a máquina monta — é lá que o piso é mais gasto. */
  work: { x: number; z: number }
}

/** Resolução do concreto. Metade da do desenho: mancha não precisa de aresta. */
const CONCRETE = 512
/** Resolução do desenho por cima. Tinta precisa de aresta. */
const YARD_MAP = 1024
/** Resolução do recorte da laje. É borrão puro: não precisa de mais que isto. */
const SLAB_MAP = 256

/**
 * **Onde a laje ACABA** — e é isto, não uma máscara de tela, que dissolve a
 * borda do canvas.
 *
 * O defeito que este bloco existe para corrigir: o canvas é um retângulo e o
 * concreto é mais claro que a página (medido — 45 de luminância contra 9 do
 * `--color-bg`), então dava para ver exatamente onde a cena começava e
 * terminava. A primeira correção foi uma máscara de gradiente em CSS, e ela
 * estava errada pelo motivo mais simples: máscara de tela apaga a IMAGEM
 * inteira, uniformemente, inclusive a geometria. A viga da ponte dissolvia no
 * meio do vão, e o hero lia como "a imagem está sendo apagada" em vez de "o
 * espaço continua no escuro".
 *
 * O que acaba num pátio é o CHÃO. Uma laje de concreto é lançada sobre a área
 * de operação e sobre as baias, e além dela não há nada iluminado — então a
 * forma certa é a da própria laje, e não um círculo centrado na origem (que era
 * o que estava aqui: um gradiente radial que só chegava a zero em 32 m, bem
 * depois da borda do quadro).
 *
 * As três rampas são separáveis porque as três restrições são independentes, e
 * cada número saiu de uma medida no enquadramento resolvido (`portico-camera`),
 * não de gosto:
 *
 * - **`x`** — a borda ESQUERDA do quadro cruza o chão a uns 14 m do eixo, a
 *   quatro metros da marcação da baia de montagem. É a restrição mais apertada
 *   da cena e é ela que decide `xGone`.
 * - **`near`** — a borda de BAIXO cruza o chão a partir de z ≈ +10 (em 1440) e
 *   z ≈ +23 (em 1024). É o pior caso medido, e o mais visível: era ali que o
 *   concreto encostava no corte reto com a seção seguinte.
 * - **`far`** — do lado do pátio a laje vai até depois da última fileira, que
 *   àquela distância já está 90 % comida pela névoa. Aqui a laje e a névoa
 *   fazem o mesmo trabalho, e é de propósito: nenhuma das duas precisa fechar
 *   a conta sozinha.
 *
 * A borda é RASGADA por ruído, e não é enfeite: uma curva matematicamente lisa
 * lê como gradiente, que é exatamente o que se quer parar de parecer. Laje de
 * verdade acaba torta.
 */
const SLAB = {
  xFull: 12.5,
  xGone: 18.5,
  nearFull: 4.5,
  nearGone: 10.5,
  farFull: 25,
  farGone: 33,
  /** Amplitude do rasgo da borda, em metros. */
  ragged: 1.4,
} as const

/** Rampa suave de 1 a 0 entre `full` e `gone`. */
function ramp(value: number, full: number, gone: number): number {
  const t = Math.max(0, Math.min(1, (value - full) / (gone - full)))
  return 1 - fade(t)
}

/**
 * O concreto, pixel a pixel: cor e rugosidade saem da MESMA passada.
 *
 * Três escalas de mancha, e as três existem num pátio de verdade:
 *
 * - **cura irregular** — a placa não seca por igual, e a diferença fica.
 * - **óleo** — mancha escura e LISA. É o detalhe que mais paga: uma superfície
 *   uniformemente fosca não devolve reflexo nenhum, e é o contraste entre o
 *   fosco do concreto e o espelhado da poça de óleo que faz o chão existir.
 * - **água e poeira** — clareia, e é mais rugosa, não menos.
 *
 * Sai em meia resolução de propósito. Mancha de concreto não tem aresta: o que
 * precisa de aresta é a tinta, que é desenhada depois, em cima, no dobro do
 * tamanho. Gerar as duas na mesma resolução custaria quatro vezes mais tempo de
 * carregamento para desenhar borrão com precisão de faca.
 */
function concreteBase(ground: string, work: { x: number; z: number }, half: number): {
  color: CanvasRenderingContext2D
  rough: CanvasRenderingContext2D
} {
  const color = surface(CONCRETE, CONCRETE)
  const rough = surface(CONCRETE, CONCRETE)
  const image = color.createImageData(CONCRETE, CONCRETE)
  const wear = rough.createImageData(CONCRETE, CONCRETE)
  const base = parseHex(ground)

  for (let y = 0; y < CONCRETE; y++) {
    const v = (y + 0.5) / CONCRETE
    for (let x = 0; x < CONCRETE; x++) {
      const u = (x + 0.5) / CONCRETE

      const cure = fbm(u, v, 6, 6, 3, 2179) - 0.5
      const grit = (valueNoise(u, v, 180, 180, 5051) - 0.5) * 0.35
      // A mancha de óleo saiu a pedido do dono.
      //
      // A ideia era plausível — pátio real tem óleo — mas na cena ela não lia
      // como óleo: lia como borrão escuro flutuando sobre a laje. O motivo é o
      // enquadramento. As poças caíam em escala grande o bastante para a
      // câmera pegar duas ou três inteiras, e mancha grande sem contorno nem
      // reflexo vira sujeira de render, não sujeira de piso.
      //
      // O que o concreto guarda é o resto: cura irregular, granulado, umidade e
      // o desgaste onde a máquina trabalha. Isso basta para o piso não ser um
      // plano liso, e é o que ele já fazia bem.
      const damp = Math.max(0, fbm(u, v, 4, 9, 2, 3499) - 0.52) * 1.6

      // Onde a máquina trabalha, o piso apanha mais: a área da montagem e o
      // corredor de manobra na frente das baias.
      const mx = ((x / CONCRETE - 0.5) * half * 2) / Math.max(1, work.x)
      const mz = ((y / CONCRETE - 0.5) * half * 2) / Math.max(1, work.z)
      const traffic = Math.max(0, 1 - Math.hypot(mx, mz) / 1.9)

      const value = 1 + cure * 0.5 + grit + damp * 0.42 - traffic * 0.22
      const i = (y * CONCRETE + x) * 4
      image.data[i] = Math.round(Math.max(0, Math.min(255, (base[0] || 0) * value + 10 * value)))
      image.data[i + 1] = Math.round(Math.max(0, Math.min(255, (base[1] || 0) * value + 11 * value)))
      image.data[i + 2] = Math.round(Math.max(0, Math.min(255, (base[2] || 0) * value + 12 * value)))
      image.data[i + 3] = 255

      const roughness = 0.94 - traffic * 0.18 + cure * 0.12 + damp * 0.06
      const grey = Math.round(255 * Math.max(0.12, Math.min(1, roughness)))
      wear.data[i] = grey
      wear.data[i + 1] = grey
      wear.data[i + 2] = grey
      wear.data[i + 3] = 255
    }
  }
  color.putImageData(image, 0, 0)
  rough.putImageData(wear, 0, 0)
  return { color, rough }
}

/**
 * Piso do pátio: concreto, marcação pintada e gasta, e o recorte da LAJE, que
 * é onde o chão acaba.
 *
 * O recorte existe porque a cena é servida com fundo transparente por cima do
 * `--color-bg` do site. Um plano de chão com borda dura desenharia uma linha
 * de horizonte atravessando o hero e denunciaria "render 3D colado na
 * página"; recortado, o chão existe só onde é preciso — embaixo da máquina,
 * onde a sombra de contato precisa de superfície para pousar, e sobre as
 * baias. Ver `SLAB`: é ele, e não uma máscara de tela, que faz o retângulo do
 * canvas sumir.
 *
 * A marcação é o vocabulário de um terminal em operação: junta de dilatação
 * em grade, faixa de baia, número de posição e hachura de área de segurança.
 * E ela é TINTA GASTA, não adesivo novo — cada segmento tem a própria opacidade,
 * tirada do índice (nunca de sorteio), e a faixa some de vez onde a máquina
 * mais passa. Marcação impecável num pátio de trabalho é a assinatura mais
 * rápida de cenário.
 *
 * O piso é cenário, não assunto: tudo aqui fica abaixo do valor da chapa dos
 * contêineres de propósito. Se competir com eles, o erro é meu.
 */
export function floorTextures(
  ground: string,
  paint: string,
  plan: FloorPlan,
  family: string,
): {
  map: THREE.CanvasTexture
  alpha: THREE.CanvasTexture
  rough: THREE.CanvasTexture
} {
  const { bays, half, work } = plan
  const size = YARD_MAP
  const concrete = concreteBase(ground, work, half)

  const color = surface(size, size)
  color.imageSmoothingEnabled = true
  color.drawImage(concrete.color.canvas, 0, 0, size, size)
  const rough = surface(size, size)
  rough.imageSmoothingEnabled = true
  rough.drawImage(concrete.rough.canvas, 0, 0, size, size)

  // O plano do chão é girado −90° em X, então o topo do canvas cai no Z mais
  // negativo da cena: canvas e cena crescem no mesmo sentido nos dois eixos.
  const toPx = (v: number): number => (v / (half * 2)) * size
  const at = (v: number): number => size / 2 + toPx(v)

  // ── junta de dilatação: a grade que divide as placas de concreto ────────
  // Serrada, não pintada: é um sulco, então escurece a cor E lisa a superfície
  // (a borda da serra é polida). Cinco metros e meio é o pano padrão.
  const JOINT = 5.5
  const joints = Math.ceil((half * 2) / JOINT)
  color.lineWidth = Math.max(1, toPx(0.05))
  rough.lineWidth = color.lineWidth
  for (let i = -joints; i <= joints; i++) {
    const p = at(i * JOINT)
    for (const ctx of [color, rough]) {
      ctx.strokeStyle = ctx === color ? '#000000' : '#5a5a5a'
      ctx.globalAlpha = ctx === color ? 0.42 : 0.8
      ctx.beginPath()
      ctx.moveTo(p, 0)
      ctx.lineTo(p, size)
      ctx.moveTo(0, p)
      ctx.lineTo(size, p)
      ctx.stroke()
    }
  }
  color.globalAlpha = 1
  rough.globalAlpha = 1

  // ── faixa de baia e número de posição ───────────────────────────────────
  const stroke = Math.max(2, toPx(0.16))
  bays.forEach((bay, index) => {
    const w = toPx(bay.length + 0.9)
    const h = toPx(bay.width + 0.9)
    const x = at(bay.x) - w / 2
    const y = at(bay.z) - h / 2

    // Cada lado da baia tem o próprio desgaste, e o lado que dá para o
    // corredor apaga primeiro — é por ali que o caminhão encosta.
    const sides: [number, number, number, number][] = [
      [x, y, x + w, y],
      [x + w, y, x + w, y + h],
      [x + w, y + h, x, y + h],
      [x, y + h, x, y],
    ]
    sides.forEach((side, k) => {
      color.strokeStyle = paint
      color.lineWidth = stroke
      color.globalAlpha = 0.2 + 0.34 * unitNoise(index * 4 + k, 11)
      color.beginPath()
      color.moveTo(side[0], side[1])
      color.lineTo(side[2], side[3])
      color.stroke()
    })
    // Tinta é mais lisa que concreto, e continua sendo mesmo gasta.
    rough.strokeStyle = '#8e8e8e'
    rough.globalAlpha = 0.5
    rough.lineWidth = stroke
    rough.strokeRect(x, y, w, h)

    // Número da posição, estampado no canto da baia como num pátio de
    // verdade. Sai do índice da baia — nenhum texto escrito no código.
    color.save()
    color.globalAlpha = 0.16 + 0.2 * unitNoise(index, 12)
    color.fillStyle = paint
    color.textAlign = 'left'
    color.textBaseline = 'top'
    if ('letterSpacing' in color) color.letterSpacing = '0.12em'
    color.font = `600 ${Math.round(toPx(1.15))}px ${family}`
    color.fillText(bay.code, x + stroke * 1.6, y + stroke * 1.4)
    color.restore()
  })
  color.globalAlpha = 1
  rough.globalAlpha = 1

  // ── hachura de área de segurança, no corredor entre o pátio e a montagem ─
  // A faixa a 45° é o que diz "aqui não se estaciona", e é a marcação que mais
  // lê de longe porque tem direção própria — todo o resto do desenho do chão é
  // ortogonal.
  const laneZ = at(-work.z - 2.6)
  const laneH = toPx(1.5)
  const laneX0 = at(-work.x - 3)
  const laneX1 = at(work.x + 3)
  color.save()
  color.beginPath()
  color.rect(laneX0, laneZ, laneX1 - laneX0, laneH)
  color.clip()
  color.strokeStyle = paint
  color.lineWidth = Math.max(2, toPx(0.22))
  for (let x = laneX0 - laneH; x < laneX1 + laneH; x += toPx(0.75)) {
    color.globalAlpha = 0.1 + 0.16 * unitNoise(Math.round(x), 13)
    color.beginPath()
    color.moveTo(x, laneZ + laneH)
    color.lineTo(x + laneH, laneZ)
    color.stroke()
  }
  color.restore()

  const map = new THREE.CanvasTexture(color.canvas)
  map.colorSpace = THREE.SRGBColorSpace
  return {
    map,
    alpha: new THREE.CanvasTexture(slabCutout(half).canvas),
    rough: new THREE.CanvasTexture(rough.canvas),
  }
}

/**
 * O recorte da laje: onde há concreto, e onde o escuro já tomou conta.
 *
 * Sai em 256 porque é borrão de ponta a ponta — a única aresta que existe aqui
 * é a que o ruído rasga, e ela é grande. Gerar isto no tamanho do desenho
 * custaria dezesseis vezes mais tempo de carregamento para dizer a mesma coisa.
 *
 * O mapeamento é o mesmo do resto do piso: o topo do canvas cai no Z mais
 * negativo da cena (ver o comentário de `floorTextures`), então canvas e mundo
 * crescem no mesmo sentido nos dois eixos.
 */
function slabCutout(half: number): CanvasRenderingContext2D {
  const ctx = surface(SLAB_MAP, SLAB_MAP)
  const image = ctx.createImageData(SLAB_MAP, SLAB_MAP)
  const data = image.data
  // A laje nunca pode passar do próprio plano do chão: se o pátio encolher, o
  // limite de trás encolhe junto em vez de prometer concreto onde não há malha.
  const farGone = Math.min(SLAB.farGone, half - 1)

  for (let y = 0; y < SLAB_MAP; y++) {
    const v = (y + 0.5) / SLAB_MAP
    const z = (v - 0.5) * half * 2
    for (let x = 0; x < SLAB_MAP; x++) {
      const u = (x + 0.5) / SLAB_MAP
      const wx = (u - 0.5) * half * 2

      // O rasgo: dois ruídos independentes, um por eixo, para a borda não
      // ondular em fase nos quatro lados como um selo recortado.
      const tornX = (fbm(u, v, 5, 5, 2, 6151) - 0.5) * 2 * SLAB.ragged
      const tornZ = (fbm(u, v, 4, 6, 2, 8837) - 0.5) * 2 * SLAB.ragged

      const cover =
        ramp(Math.abs(wx) + tornX, SLAB.xFull, SLAB.xGone) *
        ramp(z + tornZ, SLAB.nearFull, SLAB.nearGone) *
        ramp(-z + tornZ, SLAB.farFull, farGone)

      const i = (y * SLAB_MAP + x) * 4
      data[i] = Math.round(255 * Math.max(0, Math.min(1, cover)))
      data[i + 1] = data[i] as number
      data[i + 2] = data[i] as number
      data[i + 3] = 255
    }
  }
  ctx.putImageData(image, 0, 0)
  return ctx
}

// ── Piso de grade da passarela ────────────────────────────────────────────

/**
 * A trama de um piso de grade industrial, em três mapas.
 *
 * Uma passarela de chapa lisa devolve o especular numa faixa contínua e lê
 * como fita adesiva atravessando o alto do quadro. Grade não: a barra
 * portante corre num sentido, a barra travessa no outro, e o vão entre elas
 * deixa passar luz. São três informações diferentes e cada uma precisa do
 * próprio mapa — o relevo (normal) quebra o brilho, a oclusão escurece o
 * fundo do vão, e o recorte (alpha) abre o vão de verdade.
 *
 * O recorte usa `alphaTest`, não transparência: transparência exigiria
 * ordenação e mataria a sombra. E a cobertura é generosa de propósito —
 * quando a passarela ficar pequena demais na tela, o mip devolve a média, e
 * uma média acima do limiar degrada para chapa cheia em vez de sumir.
 */
export function gratingTextures(): {
  alpha: THREE.CanvasTexture
  orm: THREE.CanvasTexture
  normal: THREE.CanvasTexture
} {
  const size = 128
  /** Barras portantes por ladrilho, e travessas — a proporção real ~3:1. */
  const bearers = 9
  const cross = 3

  const alphaCtx = surface(size, size)
  const ormCtx = surface(size, size)
  const normalCtx = surface(size, size)
  const cutImage = alphaCtx.createImageData(size, size)
  const ormImage = ormCtx.createImageData(size, size)
  const normalImage = normalCtx.createImageData(size, size)
  const cut = cutImage.data
  const orm = ormImage.data
  const nrm = normalImage.data

  const bar = (t: number, count: number, width: number): number => {
    const phase = ((t * count) % 1 + 1) % 1
    const edge = Math.min(phase, 1 - phase) * 2
    return edge < width ? 1 : 0
  }
  /** Distância à aresta da barra, para o relevo inclinar nas bordas. */
  const slope = (t: number, count: number, width: number): number => {
    const phase = ((t * count) % 1 + 1) % 1
    const centred = phase < 0.5 ? phase : phase - 1
    const k = (centred * 2) / width
    return Math.abs(k) < 1 ? Math.sin(k * Math.PI) : 0
  }

  for (let y = 0; y < size; y++) {
    const v = (y + 0.5) / size
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size
      const solid = Math.max(bar(v, bearers, 0.52), bar(u, cross, 0.34))
      const i = (y * size + x) * 4

      cut[i] = solid ? 255 : 0
      cut[i + 1] = cut[i] as number
      cut[i + 2] = cut[i] as number
      cut[i + 3] = 255

      // Oclusão no fundo do vão, rugosidade baixa no topo da barra (é onde a
      // bota lustra o aço), metalicidade alta: grade é aço galvanizado nu.
      const occlusion = solid ? 1 : 0.42
      const roughness = solid ? 0.34 : 0.72
      orm[i] = Math.round(255 * occlusion)
      orm[i + 1] = Math.round(255 * roughness)
      orm[i + 2] = Math.round(255 * (solid ? 0.95 : 0.5))
      orm[i + 3] = 255

      const nx = -slope(u, cross, 0.34) * 0.9
      const ny = -slope(v, bearers, 0.52) * 1.2
      const inv = 1 / Math.hypot(nx, ny, 1)
      nrm[i] = Math.round((nx * inv * 0.5 + 0.5) * 255)
      nrm[i + 1] = Math.round((ny * inv * 0.5 + 0.5) * 255)
      nrm[i + 2] = Math.round((inv * 0.5 + 0.5) * 255)
      nrm[i + 3] = 255
    }
  }

  alphaCtx.putImageData(cutImage, 0, 0)
  ormCtx.putImageData(ormImage, 0, 0)
  normalCtx.putImageData(normalImage, 0, 0)

  const wrap = (ctx: CanvasRenderingContext2D, repeatX: number, repeatY: number): THREE.CanvasTexture => {
    const texture = new THREE.CanvasTexture(ctx.canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(repeatX, repeatY)
    return texture
  }
  // O ladrilho vale 0,30 m no mundo; quem multiplica pelo vão da passarela é
  // `Portico.tsx`, que é quem conhece a medida da ponte.
  return { alpha: wrap(alphaCtx, 1, 1), orm: wrap(ormCtx, 1, 1), normal: wrap(normalCtx, 1, 1) }
}

/** Lado do ladrilho da grade, em metros — o passo real de um piso de grade. */
export const GRATING_TILE = 0.3
