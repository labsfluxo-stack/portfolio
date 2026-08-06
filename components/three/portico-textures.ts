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

/**
 * Chapa lateral com o rótulo da camada estampado, do jeito que se marca carga.
 *
 * O texto ocupa 82% da largura útil e no máximo duas linhas — o corte vem de
 * `stencilLines`, não daqui. A tinta é `--color-text` rebaixada: marcação de
 * pátio é gasta, não é letreiro.
 */
export function stencilTexture(lines: string[], plate: string, ink: string, family: string): RedrawableTexture {
  const ctx = surface(LABEL_WIDTH, LABEL_HEIGHT)

  const draw = (): void => {
    ctx.clearRect(0, 0, LABEL_WIDTH, LABEL_HEIGHT)
    ctx.fillStyle = plate
    ctx.fillRect(0, 0, LABEL_WIDTH, LABEL_HEIGHT)

    const budget = LABEL_WIDTH * 0.82
    const maxSize = lines.length > 1 ? 118 : 152
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0.07em'

    let size = maxSize
    const fits = (candidate: number): boolean => {
      ctx.font = `600 ${candidate}px ${family}`
      return lines.every((line) => ctx.measureText(line).width <= budget)
    }
    while (size > 24 && !fits(size)) size -= 2
    ctx.font = `600 ${size}px ${family}`

    const leading = size * 1.16
    const top = LABEL_HEIGHT / 2 - ((lines.length - 1) * leading) / 2
    ctx.fillStyle = ink
    lines.forEach((line, i) => ctx.fillText(line, LABEL_WIDTH / 2, top + i * leading))
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
export function floorTextures(ground: string, paint: string, bays: { x: number; length: number; width: number }[]): {
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
    // O eixo Z da cena cresce na direção contrária ao eixo Y da textura.
    color.strokeRect(size / 2 + toPx(bay.x) - w / 2, size / 2 - h / 2, w, h)
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
