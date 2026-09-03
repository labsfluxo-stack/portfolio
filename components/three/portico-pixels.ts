/**
 * O PIXEL das texturas procedurais, sem three.js e sem DOM.
 *
 * POR QUE ESTE ARQUIVO EXISTE. `medir-portico.mts` mostrou que subir a cena
 * custa ~1,3 s de thread principal e que 721 ms disso são `buildAssets` —
 * quase tudo em laços por pixel. Esses laços não precisam da thread que pinta
 * a página: são aritmética pura, sem canvas, sem GPU, sem DOM. Separados aqui,
 * um Worker pode rodá-los enquanto a página continua rolando (ver
 * `portico-texturas.worker.ts`).
 *
 * A REGRA DESTE MÓDULO, e ela é o que o torna portável: **nada além de `Math` e
 * de tipos que existem em toda parte**. Sem `three`, sem `document`, sem
 * `window`, sem `ImageData` — nem essa, que é API de navegador e obrigaria o
 * Node a fingir ser um para o teste rodar. Um `import` de three aqui dobraria
 * o download, porque o worker é um bundle à parte e não compartilha chunk com
 * a página. Se algo aqui precisar de `THREE.*` ou do DOM, o lugar certo é
 * `portico-textures.ts`, do outro lado da fronteira.
 *
 * A embalagem (`CanvasTexture`, wrapping, flipY) continua inteira em
 * `portico-textures.ts`. Aqui só nasce o buffer de bytes.
 *
 * Nada usa `Math.random()`. A cena é a mesma a cada carregamento, e é isso que
 * permite tanto o worker quanto a thread principal produzirem o MESMO pixel —
 * o que `portico-pixels.test.ts` verifica.
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

export const fade = (t: number): number => t * t * (3 - 2 * t)

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
export function valueNoise(u: number, v: number, cellsX: number, cellsY: number, seed: number): number {
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
export function fbm(u: number, v: number, cellsX: number, cellsY: number, octaves: number, seed: number): number {
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
 * O mapa cru: largura, altura e os bytes. Nada mais.
 *
 * Era `document.createElement('canvas')` + `getContext('2d')` +
 * `createImageData`, e depois chegou a ser `ImageData`. Nem uma coisa nem
 * outra: `ImageData` é API de navegador, e exigi-la aqui obrigaria o Node (no
 * teste e em `scripts/assar-texturas.mts`) a fingir que é um. Este objeto de
 * três campos é tudo que os laços usam e roda em qualquer lugar — que é o que
 * faz deste módulo o único do projeto sem nenhuma dependência de ambiente.
 *
 * É também o formato que atravessa a fronteira do worker: `Uint8ClampedArray`
 * é transferível, então os ~1,2 MB mudam de dono em vez de serem copiados. O
 * `ImageData` de verdade só nasce do outro lado, em `comoTextura`.
 */
// `Uint8ClampedArray<ArrayBuffer>` e não o genérico solto: o buffer precisa ser
// um `ArrayBuffer` de verdade para ser transferível ao worker e para voltar a
// virar `ImageData` do outro lado. O tipo largo aceitaria `SharedArrayBuffer`,
// que não serve para nenhuma das duas coisas.
export type MapaCru = { width: number; height: number; data: Uint8ClampedArray<ArrayBuffer> }

const campo = (width: number, height: number): MapaCru => ({
  width,
  height,
  data: new Uint8ClampedArray(width * height * 4),
})

/** Saturação do seno que define o platô da chapa dobrada. */
export const RIB_CLIP = 1.7

/** Ondas na face longa — o mesmo número que o normal map da lateral usa. */
export const SIDE_RIBS = 26

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

export type CorrugationOptions = {
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
export function corrugationNormalPixels({ ribs, depth, band, wear }: CorrugationOptions): MapaCru {
  const size = 512

  const slope = corrugationSlope(size, ribs)
  const image = campo(size, size)
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
  return image
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
export function skinWearPixels(ribs: number): MapaCru {
  const size = 512
  const image = campo(size, size)
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
  return image
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
export function grimePixels(): MapaCru {
  const size = 256
  const image = campo(size, size)
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
  return image
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
export function steelWearPixels(): MapaCru {
  const size = 256
  const image = campo(size, size)
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
  return image
}

// ── A história do aço: gravidade, escorrido e quina ───────────────────────

/**
 * O mapa da IDADE da máquina, em três canais — e é ele, mais do que qualquer
 * outra coisa desta rodada, que separa "aço que trabalha há anos" de "aço
 * recém-saído do render".
 *
 * O que faltava não era geometria. Ampliada, a máquina já tinha perfil de I com
 * mesa, passarela com grade, casa de máquinas, escada com degraus e chapa
 * aparafusada nas juntas. O que faltava era **superfície com direção**: a tinta
 * era uniforme de ponta a ponta, e tinta uniforme é a assinatura mais rápida de
 * modelo novo. Aço exposto não envelhece por igual — envelhece PARA BAIXO.
 *
 * - **Vermelho — o escorrido.** Ferrugem nasce num ponto (o parafuso, o cordão
 *   de solda, a quina onde a água empoça) e desce. Cada coluna do mapa tem até
 *   dois nascedouros, sorteados do hash (nunca de `Math.random()`), e de cada um
 *   sai um rastro que decai exponencialmente PARA BAIXO. É esse rastro vertical
 *   que o cérebro lê como tempo: ele só existe se houver gravidade, e gravidade
 *   só existe se o objeto for real.
 * - **Verde — a sujeira que assenta.** Mancha larga, sem direção. Quem decide
 *   onde ela aparece é o shader, não o mapa: superfície horizontal acumula,
 *   vertical fica relativamente limpa, porque é a chuva que lava.
 * - **Azul — o grão.** Ruído de escala média que quebra o desgaste de aresta.
 *   Uma quina perfeitamente descascada de ponta a ponta é tão falsa quanto uma
 *   intocada; a tinta larga em pedaços.
 *
 * **A ferrugem aqui não tem matiz, e isso é decisão de paleta, não limitação.**
 * Os onze tokens continuam valendo, e óxido laranja seria a décima segunda cor
 * da cena. O que a ferrugem faz de fato ao aço é físico e sobrevive inteiro em
 * valor: ela MATA a metalicidade (óxido é dielétrico, não metal), sobe a
 * rugosidade e escurece. Numa cena monocromática é exatamente esse contraste —
 * fosco e morto contra polido e vivo — que lê como ferrugem. Ver
 * `steelSkinShader`.
 *
 * Ladrilha nos dois eixos: a distância à origem do escorrido é tomada em
 * fração, e a distância lateral pelo menor caminho no toro. Sem isso apareceria
 * uma emenda reta atravessando a viga.
 */
export function rustStreakPixels(): MapaCru {
  const size = 256
  /** Colunas de escorrido por ladrilho. Ver `AGE` — dá ~15 cm por coluna. */
  const columns = 42
  const image = campo(size, size)
  const data = image.data

  for (let y = 0; y < size; y++) {
    // O eixo V do mapa é o Y do mundo, e cresce PARA CIMA (`flipY` do
    // CanvasTexture). O topo do canvas é o alto da peça.
    const v = 1 - (y + 0.5) / size
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size

      let drip = 0
      const cf = u * columns
      const at = Math.floor(cf)
      // As colunas vizinhas entram na conta porque um escorrido é mais largo
      // que a célula que o gerou — sem isso ele ficaria preso à grade.
      for (let k = -1; k <= 1; k++) {
        const column = ((at + k) % columns + columns) % columns
        for (let s = 0; s < 2; s++) {
          if (hash(column, s, 3121) < 0.42) continue
          const centre = (column + 0.2 + 0.6 * hash(column, s + 7, 5077)) / columns
          const width = (0.28 + 0.72 * hash(column, s + 11, 911)) / columns
          let across = u - centre
          across -= Math.round(across)
          const lateral = Math.max(0, 1 - Math.abs(across) / width)
          if (lateral <= 0) continue
          // Onde ele nasce, e o quanto desce antes de acabar.
          const source = hash(column, s + 3, 7331)
          const below = source - v - Math.floor(source - v)
          const run = Math.exp(-below * (3 + 5 * hash(column, s + 5, 401)))
          drip = Math.max(drip, lateral * lateral * run)
        }
      }
      // Nem toda a peça enferruja igual, e nenhum escorrido é uma faixa lisa.
      drip *= Math.min(1, 0.3 + 1.15 * fbm(u, v, 3, 2, 2, 6779))
      drip *= 0.55 + 0.45 * valueNoise(u, v, 120, 26, 9199)

      const grime = fbm(u, v, 4, 4, 3, 2609)
      // Duas escalas, e as duas precisam existir: a larga decide QUE TRECHO da
      // quina descascou (meio metro de cada vez), a fina decide a borda do
      // pedaço (uns cinco centímetros). Só a larga daria manchas moles; só a
      // fina daria um pontilhado uniforme, que é o mesmo que nenhuma.
      const grain = Math.min(1, fbm(u, v, 10, 10, 2, 8191) * 0.62 + valueNoise(u, v, 46, 46, 3541) * 0.66)

      const i = (y * size + x) * 4
      data[i] = Math.round(255 * Math.max(0, Math.min(1, drip)))
      data[i + 1] = Math.round(255 * Math.max(0, Math.min(1, grime)))
      data[i + 2] = Math.round(255 * Math.max(0, Math.min(1, grain)))
      data[i + 3] = 255
    }
  }
  return image
}

// ── O contrato com o worker ───────────────────────────────────────────────

/** Os mapas que valem a viagem até o worker, pelo nome com que trafegam. */
export const MAPAS = ['corrugationNormal', 'skinWear', 'grime', 'steelWear', 'rustStreak'] as const
export type NomeDeMapa = (typeof MAPAS)[number]
export type Mapas = Record<NomeDeMapa, MapaCru>

/**
 * As opções da corrugação são as MESMAS dos dois lados da fronteira.
 *
 * Ficam aqui, e não em `buildAssets`, porque o worker precisa delas e não pode
 * importar nada que arraste three. Um segundo lugar com os mesmos quatro
 * números seria a forma mais fácil de a cena do worker divergir da cena da
 * thread principal sem ninguém notar.
 */
export const CORRUGACAO: CorrugationOptions = { ribs: SIDE_RIBS, depth: 1.05, band: 0.085, wear: 0.55 }

/**
 * Gera os cinco mapas. É esta função que roda no worker — e é a MESMA que roda
 * na thread principal quando não há worker, o que garante que o caminho de
 * emergência produz pixel idêntico em vez de uma cena parecida.
 */
export function gerarMapas(): Mapas {
  return {
    corrugationNormal: corrugationNormalPixels(CORRUGACAO),
    skinWear: skinWearPixels(CORRUGACAO.ribs),
    grime: grimePixels(),
    steelWear: steelWearPixels(),
    rustStreak: rustStreakPixels(),
  }
}
