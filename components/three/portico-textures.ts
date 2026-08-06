import * as THREE from 'three'

/**
 * Todas as texturas da cena, geradas em canvas no próprio navegador.
 *
 * Regra dura do projeto: zero requisição externa. O site é export estático
 * publicado no GitHub Pages e não pode buscar HDRI de CDN, `.glb` nem
 * bitmap nenhum — então a corrugação da chapa, o estêncil do rótulo e a
 * mancha do piso nascem aqui, em código, e são idênticos a cada carregamento
 * (nenhuma delas usa `Math.random()`).
 *
 * A corrugação é NORMAL MAP, não geometria: é o que faz a chapa lateral
 * pegar luz como aço ondulado sem multiplicar vértice nenhum. Um contêiner
 * de parede lisa é uma caixa, e caixa lê como bloco de brinquedo.
 */

function surface(width: number, height: number): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d indisponível')
  return ctx
}

/** Suaviza a derivada do perfil para o normal map não serrilhar em ângulo raso. */
function blur(values: Float32Array, passes: number): void {
  const n = values.length
  const copy = new Float32Array(n)
  for (let pass = 0; pass < passes; pass++) {
    copy.set(values)
    for (let i = 0; i < n; i++) {
      const a = copy[(i - 1 + n) % n] ?? 0
      const b = copy[i] ?? 0
      const c = copy[(i + 1) % n] ?? 0
      values[i] = (a + 2 * b + c) / 4
    }
  }
}

/**
 * Perfil trapezoidal de chapa corrugada — seno saturado, que é exatamente a
 * seção de uma chapa dobrada: dois planos e duas abas inclinadas. Devolve a
 * derivada normalizada em -1..1, que é o que vira a componente do normal.
 */
function corrugationSlope(samples: number, ribs: number): Float32Array {
  const slope = new Float32Array(samples)
  const clip = 1.7
  let peak = 0
  for (let i = 0; i < samples; i++) {
    const u = (i + 0.5) / samples
    const phase = 2 * Math.PI * ribs * u
    // Nos platôs (onde o seno satura) a chapa é plana: derivada zero.
    const value = Math.abs(clip * Math.sin(phase)) < 1 ? clip * Math.cos(phase) : 0
    slope[i] = value
    peak = Math.max(peak, Math.abs(value))
  }
  if (peak > 0) for (let i = 0; i < samples; i++) slope[i] = (slope[i] ?? 0) / peak
  blur(slope, 2)
  return slope
}

type CorrugationOptions = {
  /** Número de ondas ao longo do eixo U da face. */
  ribs: number
  /** Profundidade aparente da dobra. */
  depth: number
  /** Fração da face que fica lisa nas duas pontas (o friso soldado à moldura). */
  band: number
}

/**
 * As ondas sempre correm no eixo U da face. Nas laterais e nas testeiras isso
 * dá a corrugação em pé do contêiner; no teto, onde o U da `BoxGeometry`
 * segue o comprimento, dá a corrugação atravessada — que é como um teto de
 * contêiner é de fato.
 */
export function corrugationNormalMap({ ribs, depth, band }: CorrugationOptions): THREE.CanvasTexture {
  const width = 512
  const height = 128

  const slope = corrugationSlope(width, ribs)
  const ctx = surface(width, height)
  const image = ctx.createImageData(width, height)
  const data = image.data

  for (let y = 0; y < height; y++) {
    const edge = (y + 0.5) / height
    const flat = edge < band || edge > 1 - band
    for (let x = 0; x < width; x++) {
      const nx = flat ? 0 : -(slope[x] ?? 0) * depth
      const inv = 1 / Math.hypot(nx, 1)
      const i = (y * width + x) * 4
      data[i] = Math.round((nx * inv * 0.5 + 0.5) * 255)
      data[i + 1] = 128
      data[i + 2] = Math.round((inv * 0.5 + 0.5) * 255)
      data[i + 3] = 255
    }
  }
  ctx.putImageData(image, 0, 0)

  const texture = new THREE.CanvasTexture(ctx.canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  return texture
}

/**
 * Descobre a família mono resolvida do design system.
 *
 * `--font-mono` é declarada como `var(--font-geist-mono), ui-monospace,…` e
 * `getPropertyValue` devolveria o `var()` cru, que o canvas não entende. Ler
 * o `font-family` COMPUTADO de um elemento com a classe do Tailwind é o único
 * jeito de chegar no nome real da fonte que o resto da página está usando —
 * o estêncil da chapa tem de ser a mesma fonte dos rótulos em HTML.
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

const LABEL_WIDTH = 1024
const LABEL_HEIGHT = 440

type Rect = { x: number; y: number; width: number; height: number }
/** Tamanho máximo do caractere por número de linhas do estêncil. */
type Sizing = { single: number; double: number; min: number }

/**
 * Estampa as linhas centradas no retângulo, encolhendo o corpo até caberem.
 *
 * O tamanho máximo é parâmetro em vez de fração da altura porque a chapa da
 * camada e a chapa de carga têm proporções diferentes, e derivar um do outro
 * mudaria a fileira da frente — que está aprovada e não se mexe.
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

/**
 * Chapa lateral com o rótulo da camada estampado, do jeito que se marca carga.
 *
 * O texto ocupa 82% da largura útil e no máximo duas linhas — o corte vem de
 * `stencilLines`, não daqui. A tinta é `--color-text` rebaixada: marcação de
 * pátio é gasta, não é letreiro.
 */
export function stencilTexture(lines: string[], plate: string, ink: string, family: string): RedrawableTexture {
  const ctx = surface(LABEL_WIDTH, LABEL_HEIGHT)
  const box: Rect = { x: 0, y: 0, width: LABEL_WIDTH, height: LABEL_HEIGHT }

  const draw = (): void => {
    ctx.clearRect(0, 0, LABEL_WIDTH, LABEL_HEIGHT)
    ctx.fillStyle = plate
    ctx.fillRect(0, 0, LABEL_WIDTH, LABEL_HEIGHT)
    drawStencil(ctx, lines, box, ink, family, { single: 152, double: 118, min: 24 })
  }

  draw()
  const texture = new THREE.CanvasTexture(ctx.canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return {
    texture,
    redraw: () => {
      draw()
      texture.needsUpdate = true
    },
  }
}

// ── Atlas de carga ────────────────────────────────────────────────────────

/**
 * As chapas de carga das baias de fundo, TODAS num canvas só.
 *
 * Elas existem para serem instanciadas: dezoito contêineres que compartilham
 * geometria e material e diferem só em transformação e marcação. Um material
 * carrega uma textura, então a marcação de cada um vira uma CÉLULA de um
 * atlas, e cada instância recebe o deslocamento da sua célula por atributo
 * (`aCargo`, ver `cargoAtlasShader`). É o que mantém o pátio inteiro em duas
 * chamadas de desenho em vez de trinta e seis.
 */

/** Proporção da célula ≈ a da face longa da chapa (5,90 × 2,43 m). */
const CARGO_CELL = { width: 512, height: 212 } as const
const CARGO_COLS = 3
/**
 * Recuo do retângulo amostrado dentro da célula. Sem ele, o filtro trilinear
 * puxa o vizinho no mip mais grosseiro e a marcação de um contêiner vaza para
 * o outro.
 */
const CARGO_INSET = 0.015

/**
 * Onde as faces SEM marcação (testeiras, teto e fundo) amostram a célula.
 *
 * Um ponto só, dentro da margem que o desenho nunca invade: a face inteira
 * sai na cor da chapa, sem esticar o ícone do vizinho por cima dela. Ver
 * `yardPlateGeometry`.
 */
export const CARGO_FLAT_UV: readonly [number, number] = [0.04, 0.1]

/** O que vai estampado: o ícone da marca, ou o nome em estêncil quando ela não existe. */
export type CargoMark = { kind: 'icon'; path: string } | { kind: 'text'; lines: string[] }

export type CargoAtlas = RedrawableTexture & {
  /** Deslocamento da célula de cada instância, pronto para virar atributo. */
  offsets: Float32Array
  /** Tamanho da célula em UV, o mesmo para todas. */
  scale: THREE.Vector2
}

export function cargoAtlas(
  marks: readonly CargoMark[],
  plateOf: (index: number) => string,
  ink: string,
  family: string,
): CargoAtlas {
  const cols = CARGO_COLS
  const rows = Math.max(1, Math.ceil(marks.length / cols))
  const ctx = surface(cols * CARGO_CELL.width, rows * CARGO_CELL.height)

  const draw = (): void => {
    marks.forEach((mark, i) => {
      const box: Rect = {
        x: (i % cols) * CARGO_CELL.width,
        y: Math.floor(i / cols) * CARGO_CELL.height,
        width: CARGO_CELL.width,
        height: CARGO_CELL.height,
      }
      ctx.fillStyle = plateOf(i)
      ctx.fillRect(box.x, box.y, box.width, box.height)
      if (mark.kind === 'text') {
        drawStencil(ctx, mark.lines, box, ink, family, { single: 96, double: 62, min: 18 })
        return
      }
      // O `path` do simple-icons é desenhado numa caixa 24×24 — a mesma do
      // viewBox — então basta escalar. Uma marca de carga é grande: 58% da
      // altura da chapa, que é a proporção de um logotipo pintado em
      // contêiner de verdade.
      const size = box.height * 0.58
      ctx.save()
      ctx.fillStyle = ink
      ctx.translate(box.x + (box.width - size) / 2, box.y + (box.height - size) / 2)
      ctx.scale(size / 24, size / 24)
      ctx.fill(new Path2D(mark.path))
      ctx.restore()
    })
  }

  draw()
  const texture = new THREE.CanvasTexture(ctx.canvas)
  texture.colorSpace = THREE.SRGBColorSpace

  const offsets = new Float32Array(marks.length * 2)
  for (let i = 0; i < marks.length; i++) {
    // O eixo V da textura cresce ao contrário do eixo Y do canvas.
    const bottom = rows - 1 - Math.floor(i / cols)
    offsets[i * 2] = ((i % cols) + CARGO_INSET) / cols
    offsets[i * 2 + 1] = (bottom + CARGO_INSET) / rows
  }

  return {
    texture,
    offsets,
    scale: new THREE.Vector2((1 - 2 * CARGO_INSET) / cols, (1 - 2 * CARGO_INSET) / rows),
    redraw: () => {
      draw()
      texture.needsUpdate = true
    },
  }
}

/**
 * Liga o atlas ao material: cada instância passa a amostrar a sua célula.
 *
 * A alternativa seria um material por contêiner, que é justamente o que a
 * instanciação existe para evitar. Só o UV do `map` é deslocado — o do normal
 * map continua 0..1 por face, então a corrugação segue repetindo na chapa
 * como nos contêineres da frente.
 */
export function cargoAtlasShader(material: THREE.Material, scale: THREE.Vector2): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uCargoScale = { value: scale }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 aCargo;\nuniform vec2 uCargoScale;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\n\tvMapUv = vMapUv * uCargoScale + aCargo;')
  }
  // Sem isto o three reaproveita o programa de outro material com as mesmas
  // opções e a cena inteira sai amostrando a mesma célula.
  material.customProgramCacheKey = () => 'portico-cargo-atlas'
}

/** Chapa sem marcação — testeiras, teto e fundo. */
export function plateTexture(plate: string): THREE.CanvasTexture {
  const ctx = surface(8, 8)
  ctx.fillStyle = plate
  ctx.fillRect(0, 0, 8, 8)
  const texture = new THREE.CanvasTexture(ctx.canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/**
 * Piso do pátio: as duas baias pintadas, e uma máscara radial que dissolve o
 * chão no fundo da página.
 *
 * A máscara existe porque a cena é servida com fundo transparente por cima do
 * `--color-bg` do site. Um plano de chão com borda dura desenharia uma linha
 * de horizonte atravessando o hero e denunciaria "render 3D colado na
 * página"; dissolvido, o chão existe só onde é preciso — embaixo da máquina,
 * onde a sombra de contato precisa de superfície para pousar.
 */
export function floorTextures(
  ground: string,
  paint: string,
  bays: { x: number; z?: number; length: number; width: number }[],
): {
  map: THREE.CanvasTexture
  alpha: THREE.CanvasTexture
  /** Metade da aresta do plano de chão, em unidades de cena. */
  half: number
} {
  const size = 1024
  // Metade da aresta do plano. Precisa ser MENOR que o campo visível, senão a
  // máscara ainda tem opacidade quando chega na borda do canvas e o chão sai
  // cortado numa linha reta — o defeito que denuncia "render colado na
  // página" mais rápido que qualquer outro.
  const half = 15

  const color = surface(size, size)
  color.fillStyle = ground
  color.fillRect(0, 0, size, size)

  const toPx = (v: number): number => (v / (half * 2)) * size
  color.strokeStyle = paint
  color.lineWidth = Math.max(2, toPx(0.13))
  color.globalAlpha = 0.75
  for (const bay of bays) {
    const w = toPx(bay.length + 1.1)
    const h = toPx(bay.width + 1.1)
    // O plano do chão é girado −90° em X, então o topo do canvas cai no Z mais
    // negativo da cena: canvas e cena crescem no mesmo sentido nos dois eixos.
    color.strokeRect(size / 2 + toPx(bay.x) - w / 2, size / 2 + toPx(bay.z ?? 0) - h / 2, w, h)
  }
  color.globalAlpha = 1

  const mask = surface(size, size)
  const gradient = mask.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, '#ffffff')
  gradient.addColorStop(0.3, '#ffffff')
  gradient.addColorStop(0.58, '#9a9a9a')
  gradient.addColorStop(0.82, '#1e1e1e')
  gradient.addColorStop(0.94, '#000000')
  mask.fillStyle = gradient
  mask.fillRect(0, 0, size, size)

  const map = new THREE.CanvasTexture(color.canvas)
  map.colorSpace = THREE.SRGBColorSpace
  const alpha = new THREE.CanvasTexture(mask.canvas)
  return { map, alpha, half }
}
