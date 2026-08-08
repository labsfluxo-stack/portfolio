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
 */

// ── Ruído ─────────────────────────────────────────────────────────────────
//
// Nada aqui usa `Math.random()`. O que faz uma chapa parecer chapa é a luz
// QUEBRAR na superfície em vez de escorregar, e o que quebra a luz é a
// rugosidade variar — mas variar de forma reproduzível, senão a cena muda a
// cada carregamento e deixa de ser a mesma peça.

/**
 * Hash inteiro determinístico (avalanche de xor-multiply), em 0..1.
 *
 * É o substituto de `Math.random()` que o projeto exige: mesma entrada, mesma
 * saída, para sempre, sem estado global e sem semente escondida.
 */
function hash(x: number, y: number, seed: number): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 2246822519)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}

/**
 * A semente de UMA unidade, em 0..1 — a fonte de tudo que difere um contêiner
 * do vizinho.
 *
 * `channel` separa os usos: 0 e 1 deslocam o mapa de história (ver
 * `containerSkinShader`), 2 gira a caixa uma fração de grau, 3 e 4 a empurram
 * poucos centímetros. Todos saem do ÍNDICE da instância, então a mesma cena
 * volta idêntica a cada carregamento — que é a regra dura do projeto, e o
 * motivo de não existir `Math.random()` em lugar nenhum daqui.
 *
 * Por que isso importa mais do que parece: um pátio em que todas as caixas
 * estão perfeitamente alinhadas e igualmente sujas não lê como pátio. O
 * alinhamento exato é a assinatura mais reconhecível de render amador, e
 * quebrá-lo custa cinco centímetros.
 */
export const unitNoise = (index: number, channel: number): number => hash(index, channel, 20261)

const fade = (t: number): number => t * t * (3 - 2 * t)

/**
 * Ruído de valor que FECHA NO CONTORNO.
 *
 * A malha é tomada módulo o número de células, então a textura ladrilha sem
 * costura — obrigatório aqui, porque cada contêiner amostra o mapa com um
 * deslocamento próprio (ver `aWear` em `cargoAtlasShader`) e uma emenda
 * visível apareceria como uma linha reta atravessando a chapa de metade das
 * unidades.
 *
 * Células em X e Y são independentes: é o que permite um ruído esticado, que
 * é a forma do arranhão e do escorrido de chuva.
 */
function valueNoise(u: number, v: number, cellsX: number, cellsY: number, seed: number): number {
  const x = u * cellsX
  const y = v * cellsY
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = fade(x - x0)
  const fy = fade(y - y0)
  const wx = (n: number): number => ((n % cellsX) + cellsX) % cellsX
  const wy = (n: number): number => ((n % cellsY) + cellsY) % cellsY
  const x1 = wx(x0 + 1)
  const y1 = wy(y0 + 1)
  const cx = wx(x0)
  const cy = wy(y0)
  const a = hash(cx, cy, seed)
  const b = hash(x1, cy, seed)
  const c = hash(cx, y1, seed)
  const d = hash(x1, y1, seed)
  return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy
}

/** Somatório de oitavas: a mancha grande carrega a pequena, como sujeira real. */
function fbm(u: number, v: number, cellsX: number, cellsY: number, octaves: number, seed: number): number {
  let sum = 0
  let amplitude = 1
  let total = 0
  for (let o = 0; o < octaves; o++) {
    const k = 2 ** o
    sum += amplitude * valueNoise(u, v, cellsX * k, cellsY * k, seed + o * 97)
    total += amplitude
    amplitude *= 0.5
  }
  return sum / total
}

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

/** Saturação do seno que define o platô da chapa dobrada. */
const RIB_CLIP = 1.7

/**
 * Perfil trapezoidal de chapa corrugada — seno saturado, que é exatamente a
 * seção de uma chapa dobrada: dois planos e duas abas inclinadas. Devolve a
 * derivada em -1..1 (antes da normalização), que é o que vira a componente do
 * normal — e, no adesivo do painel, a faixa de sombra que faz o decalque
 * acompanhar a onda.
 */
export function ribSlope(u: number, ribs: number): number {
  const phase = 2 * Math.PI * ribs * u
  // Nos platôs (onde o seno satura) a chapa é plana: derivada zero.
  return Math.abs(RIB_CLIP * Math.sin(phase)) < 1 ? RIB_CLIP * Math.cos(phase) : 0
}

function corrugationSlope(samples: number, ribs: number): Float32Array {
  const slope = new Float32Array(samples)
  let peak = 0
  for (let i = 0; i < samples; i++) {
    const value = ribSlope((i + 0.5) / samples, ribs)
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
  /** Relevo do que a chapa sofreu: amassado raso e risco. 0 desliga. */
  wear: number
}

/**
 * O relevo do uso, em unidades de altura arbitrárias.
 *
 * Três escalas, e as três precisam existir juntas:
 *
 * - **amassado** — mancha larga e rasa, a batida de spreader que a chapa
 *   guardou. É o que tira o "perfeitamente plano" que denuncia render.
 * - **ondulação de solda** — a chapa empena entre um cordão e outro; escala
 *   média, esticada na vertical.
 * - **risco** — sulco fino e comprido, quase só em uma direção.
 */
function wearRelief(u: number, v: number): number {
  const dent = fbm(u, v, 5, 5, 3, 5501) - 0.5
  const buckle = (fbm(u, v, 3, 11, 2, 907) - 0.5) * 0.55
  const scratch = (valueNoise(u, v, 130, 7, 1721) - 0.5) * 0.3
  return dent + buckle + scratch
}

/**
 * As ondas sempre correm no eixo U da face. Nas laterais e nas testeiras isso
 * dá a corrugação em pé do contêiner; no teto, onde o U da `BoxGeometry`
 * segue o comprimento, dá a corrugação atravessada — que é como um teto de
 * contêiner é de fato.
 *
 * Sobre a onda vem o RELEVO DO USO. Sem ele a chapa é uma superfície
 * matematicamente perfeita, e o especular escorrega por ela numa faixa
 * contínua — o efeito exato de "animação de desenho". O amassado quebra a
 * faixa em pedaços, que é o que o olho lê como metal.
 */
export function corrugationNormalMap({ ribs, depth, band, wear }: CorrugationOptions): THREE.CanvasTexture {
  const size = 512

  const slope = corrugationSlope(size, ribs)
  const ctx = surface(size, size)
  const image = ctx.createImageData(size, size)
  const data = image.data

  // Relevo do uso, tabelado antes de virar normal — a derivada precisa de
  // vizinho, e recalcular três oitavas de ruído por vizinho custaria nove
  // avaliações por pixel.
  const height = new Float32Array(size * size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) height[y * size + x] = wearRelief((x + 0.5) / size, (y + 0.5) / size)
  }

  const at = (x: number, y: number): number => height[(((y % size) + size) % size) * size + (((x % size) + size) % size)] ?? 0
  const dx = new Float32Array(size * size)
  const dy = new Float32Array(size * size)
  let energy = 0
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x
      const gx = (at(x + 1, y) - at(x - 1, y)) / 2
      const gy = (at(x, y + 1) - at(x, y - 1)) / 2
      dx[i] = gx
      dy[i] = gy
      energy += gx * gx + gy * gy
    }
  }

  // A INCLINAÇÃO do relevo é normalizada pela própria energia, e não é
  // detalhe: a derivada em grade de canvas vem em "por pixel", uma escala que
  // não tem relação nenhuma com `depth`. Dividida pelo passo, como estava, um
  // risco de quatro pixels produzia inclinação vinte vezes maior que a da
  // onda — o normal map saturava, a corrugação sumia debaixo do ruído e a
  // chapa saía CHIANDO como televisão fora do ar. Normalizada, `wear` volta a
  // significar o que o nome diz: a fração da onda que o uso vale. Três desvios
  // saturam, que é onde mora a batida funda; o resto fica proporcional.
  const spread = Math.sqrt(energy / (size * size * 2)) * 3
  const gain = spread > 0 ? (wear * depth) / spread : 0
  const bite = wear * depth
  const cap = (value: number): number => Math.max(-bite, Math.min(bite, value * gain))

  for (let y = 0; y < size; y++) {
    const edge = (y + 0.5) / size
    const flat = edge < band || edge > 1 - band
    for (let x = 0; x < size; x++) {
      const i = y * size + x
      const rib = flat ? 0 : -(slope[x] ?? 0) * depth
      const nx = rib - cap(dx[i] ?? 0)
      const ny = -cap(dy[i] ?? 0)
      const inv = 1 / Math.hypot(nx, ny, 1)
      const p = i * 4
      data[p] = Math.round((nx * inv * 0.5 + 0.5) * 255)
      data[p + 1] = Math.round((ny * inv * 0.5 + 0.5) * 255)
      data[p + 2] = Math.round((inv * 0.5 + 0.5) * 255)
      data[p + 3] = 255
    }
  }
  ctx.putImageData(image, 0, 0)

  const texture = new THREE.CanvasTexture(ctx.canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  return texture
}

// ── Superfície: oclusão, rugosidade e desgaste ────────────────────────────

/**
 * O mapa ORM da chapa: **O**clusão no vermelho, **R**ugosidade no verde,
 * **M**etalicidade no azul.
 *
 * A embalagem não é invenção — é o que o three.js lê por padrão
 * (`aoMap` usa `.r`, `roughnessMap` usa `.g`, `metalnessMap` usa `.b`), então
 * as três informações saem de UMA textura e de UMA amostragem. Três canvases
 * separados custariam três buscas por pixel para dizer a mesma coisa.
 *
 * O que cada canal carrega, e por quê:
 *
 * - **Oclusão.** Escurece o vale da corrugação e a fresta onde a chapa encosta
 *   na moldura. Sem isso a corrugação parece ADESIVO: o normal map inclina a
 *   luz mas nada fica sombreado, e o olho lê desenho impresso, não relevo.
 * - **Rugosidade.** A variação é o maior ganho isolado desta cena. Chapa
 *   pintada de contêiner não tem um valor de rugosidade — tem mancha de sal,
 *   escorrido de chuva e platô lustrado por atrito, e é a diferença entre eles
 *   que faz a luz QUEBRAR em vez de escorregar.
 * - **Metalicidade.** Só a aresta. É onde a tinta gastou e apareceu aço, e é
 *   por isso que quina de contêiner brilha diferente do meio da chapa.
 *
 * Continua dentro da paleta: nada aqui é cor. Metal reflete o AMBIENTE, e o
 * ambiente desta cena é montado com os mesmos onze tokens.
 */
export function skinWearMap(ribs: number): THREE.CanvasTexture {
  const size = 512
  const ctx = surface(size, size)
  const image = ctx.createImageData(size, size)
  const data = image.data

  for (let y = 0; y < size; y++) {
    const v = (y + 0.5) / size
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size

      // Onde a chapa está na onda: +1 no platô saliente, −1 no vale.
      const wave = Math.max(-1, Math.min(1, RIB_CLIP * Math.sin(2 * Math.PI * ribs * u)))
      const valley = 0.5 - 0.5 * wave
      const crest = 0.5 + 0.5 * wave

      // Distância à borda da face — é ali que mora a moldura.
      const border = Math.min(u, 1 - u, v, 1 - v)
      const seam = 1 - Math.min(1, border / 0.055)

      // Sujeira: mancha larga com escorrido vertical por cima. O escorrido é
      // o detalhe que ninguém desenha e todo contêiner tem.
      const blotch = fbm(u, v, 4, 4, 4, 3313)
      const run = valueNoise(u, v, 90, 3, 4409) * Math.min(1, v * 2.2)
      const grime = Math.min(1, blotch * 0.72 + run * 0.42)

      // Desgaste: a aresta some primeiro, e não some por igual — o ruído
      // decide onde. Alinhamento perfeito é assinatura de render amador.
      //
      // A quina é o único lugar onde a metalicidade sobe de verdade, e isso é
      // decisão, não economia: aço aparente reflete o estúdio inteiro, então
      // espalhá-lo pelo platô da onda — como a primeira versão fazia, com um
      // ganho de 2,2 que cobria metade da chapa — acende a face toda e a caixa
      // vira lata cromada. No platô a tinta só ficou LUSTRADA de atrito: isso
      // é rugosidade menor, não metal.
      const bite = 0.55 + 0.9 * fbm(u, v, 9, 9, 2, 8191)
      const wornEdge = Math.max(0, Math.min(1, (seam * bite - 0.18) * 1.6))
      const wornCrest = crest * crest * Math.max(0, fbm(u, v, 16, 6, 2, 6607) - 0.52) * 1.4

      const occlusion = 1 - 0.42 * valley - 0.5 * seam * seam - 0.16 * grime
      const roughness = 0.72 + 0.26 * grime - 0.2 * wornCrest - 0.18 * wornEdge
      const metalness = 0.1 + 0.62 * wornEdge + 0.14 * wornCrest

      const i = (y * size + x) * 4
      data[i] = Math.round(255 * Math.max(0, Math.min(1, occlusion)))
      data[i + 1] = Math.round(255 * Math.max(0.24, Math.min(1, roughness)))
      data[i + 2] = Math.round(255 * Math.max(0, Math.min(1, metalness)))
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
 * A história de CADA unidade, num mapa ladrilhável que cada contêiner amostra
 * com um deslocamento próprio.
 *
 * A divisão de trabalho com `skinWearMap` é a chave desta cena e vale
 * enunciar: **oclusão é estrutura, rugosidade é história**. A corrugação é
 * idêntica em todo contêiner do mundo, porque sai da mesma prensa — então a
 * oclusão fica travada na face. O que nunca é igual entre dois contêineres é o
 * que aconteceu com eles, e é isso que este mapa carrega, deslocado por
 * instância.
 *
 * Um mapa só, deslocado, em vez de um mapa por unidade: quarenta e três
 * texturas custariam quarenta e três chamadas de desenho, que é exatamente o
 * que a instanciação existe para evitar.
 */
export function grimeMap(): THREE.CanvasTexture {
  const size = 256
  const ctx = surface(size, size)
  const image = ctx.createImageData(size, size)
  const data = image.data

  for (let y = 0; y < size; y++) {
    const v = (y + 0.5) / size
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size
      const patch = fbm(u, v, 3, 3, 4, 1013)
      const streak = valueNoise(u, v, 40, 2, 2027)
      const value = Math.max(0, Math.min(1, patch * 0.68 + streak * 0.32))
      const i = (y * size + x) * 4
      data[i] = Math.round(255 * value)
      data[i + 1] = data[i] as number
      data[i + 2] = data[i] as number
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
 * O mesmo tratamento para o aço da máquina: rugosidade que varia e nada de
 * metalicidade uniforme.
 *
 * Uma viga de ponte rolante é chapa soldada, pintada e repintada; lisa por
 * inteiro ela vira plástico cromado — que é o outro jeito de uma cena 3D
 * parecer desenho. Aqui não há corrugação nem aresta de face para respeitar,
 * então o mapa é só ruído em três escalas.
 */
export function steelWearMap(): THREE.CanvasTexture {
  const size = 256
  const ctx = surface(size, size)
  const image = ctx.createImageData(size, size)
  const data = image.data

  for (let y = 0; y < size; y++) {
    const v = (y + 0.5) / size
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size
      const coat = fbm(u, v, 4, 4, 3, 4127)
      const mill = valueNoise(u, v, 64, 5, 7717)
      const occlusion = 1 - 0.2 * coat
      const roughness = 0.6 + 0.38 * coat + 0.12 * (mill - 0.5)
      const metalness = 0.72 + 0.28 * (1 - coat)
      const i = (y * size + x) * 4
      data[i] = Math.round(255 * Math.max(0, Math.min(1, occlusion)))
      data[i + 1] = Math.round(255 * Math.max(0.2, Math.min(1, roughness)))
      data[i + 2] = Math.round(255 * Math.max(0, Math.min(1, metalness)))
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

/** Ondas na face longa — o mesmo número que o normal map da lateral usa. */
export const SIDE_RIBS = 26

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
 * Piso do pátio: concreto, marcação pintada e gasta, e uma máscara radial que
 * dissolve o chão no fundo da página.
 *
 * A máscara existe porque a cena é servida com fundo transparente por cima do
 * `--color-bg` do site. Um plano de chão com borda dura desenharia uma linha
 * de horizonte atravessando o hero e denunciaria "render 3D colado na
 * página"; dissolvido, o chão existe só onde é preciso — embaixo da máquina,
 * onde a sombra de contato precisa de superfície para pousar.
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
  return {
    map,
    alpha: new THREE.CanvasTexture(mask.canvas),
    rough: new THREE.CanvasTexture(rough.canvas),
  }
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
