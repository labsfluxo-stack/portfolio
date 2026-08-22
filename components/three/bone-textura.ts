import * as THREE from 'three'

/**
 * A "etiqueta" do boné do brinde: textura gerada em canvas, mesma técnica de
 * `caneca-textura.ts` e `ecobag-textura.ts` (zero bitmap baixado — regra
 * dura do projeto, ver o cabeçalho de `portico-textures.ts`).
 *
 * `ajustarFonteAoEspaco` e `resolveSansFamily` estão duplicadas aqui pelo
 * mesmo motivo já registrado em `ecobag-textura.ts`: cada brinde precisa
 * poder carregar sozinho quando um seletor futuro escolher só um, e um
 * import cruzado entre os três juntaria os chunks.
 */

/** Textura QUADRADA, ao contrário da 2:1 da caneca e da ecobag. A copa do
 *  boné é amostrada por uma esfera parcial (ver `Bone.tsx`): o eixo U dá a
 *  volta inteira (360°) e o eixo V cobre só a fração de baixo para cima que
 *  a copa ocupa (`THETA_COPA` lá) — as duas dimensões do painel frontal
 *  saem parecidas em proporção, e um quadrado evita esticar a serigrafia
 *  num sentido só. */
export const TEXTURA = { largura: 1024, altura: 1024 } as const

/** Sarja de algodão neutra — mais fria e mais clara que `COR_LONA` da
 *  ecobag (`#E7DFC9`) de propósito: são dois tecidos DIFERENTES (sarja de
 *  boné vs. lona de ecobag) e ficar tudo no mesmo tom apagaria essa
 *  diferença quando as peças aparecerem lado a lado no seletor futuro. */
export const COR_SARJA = '#ECE7DC'

/** Tom da costura entre os gomos — mais escuro que `COR_SARJA`, nunca
 *  `corMarca`: um boné de seis gomos de verdade tem a costura na cor da
 *  LINHA, que quase nunca é a cor do bordado. Ver `desenharCosturas`. */
const COR_COSTURA = '#C9C2B3'

/**
 * Número de gomos do desenho da costura — seis é a construção mais comum
 * de boné (a "six-panel cap"). A GEOMETRIA em `Bone.tsx` é uma esfera lisa,
 * não seis painéis de verdade (ver o comentário lá sobre o porquê); é esta
 * textura que devolve a leitura de "boné costurado" em vez de "capacete
 * liso" — a defesa direta contra o "a cap that renders as a grey dome" que
 * o brief avisa.
 */
const GOMOS = 6

/** Onde a faixa da marca vive, em fração da ALTURA da textura (V=0 topo da
 *  copa/botão, V=1 aba/base — ver a derivação completa em `Bone.tsx`,
 *  comentário de `ANGULO_REPOUSO_BASE`). Nem perto do botão (gomos convergem
 *  ali, ficaria espremido) nem perto da aba (onde a copa já começa a curvar
 *  para longe da câmera) — a mesma lógica do "meio do corpo" que rege
 *  `FAIXA_Y0`/`FAIXA_Y1` da caneca, adaptada à proporção de um boné real,
 *  cujo bordado fica no painel frontal, não na copa inteira. */
const FAIXA_Y0 = 0.32
const FAIXA_Y1 = 0.5

/** Largura da faixa impressa, em fração da CIRCUNFERÊNCIA (equivalente a
 *  `FAIXA_LARGURA` da caneca) — ver `Bone.tsx` para o cálculo do arco
 *  legível que este número tem de respeitar. */
export const FAIXA_LARGURA = 0.3

export type Medidor = (fonte: string, texto: string) => number

export type ParametrosAjuste = {
  texto: string
  larguraDisponivel: number
  tamanhoMax: number
  tamanhoMin: number
  familia: string
  medir: Medidor
}

/** Idêntica a `ajustarFonteAoEspaco` de `caneca-textura.ts`/`ecobag-textura.ts`
 *  — ver o cabeçalho deste arquivo para o porquê da duplicata. */
export function ajustarFonteAoEspaco(params: ParametrosAjuste): number {
  const { texto, larguraDisponivel, tamanhoMax, tamanhoMin, familia, medir } = params
  let tamanho = tamanhoMax
  while (tamanho > tamanhoMin && medir(`700 ${tamanho}px ${familia}`, texto) > larguraDisponivel) {
    tamanho -= 2
  }
  return tamanho
}

export function resolveSansFamily(): string {
  const probe = document.createElement('span')
  probe.className = 'font-sans'
  probe.style.position = 'absolute'
  probe.style.visibility = 'hidden'
  document.body.appendChild(probe)
  const family = getComputedStyle(probe).fontFamily
  probe.remove()
  return family || 'system-ui, sans-serif'
}

const NOME_RESERVA = 'MARCA'

export function resolverNomeMarca(nomeMarca: string): string {
  return nomeMarca.trim() || NOME_RESERVA
}

/**
 * As costuras dos gomos: `GOMOS` linhas retas no espaço da TEXTURA
 * (verticais, de V=0 a V=1, espaçadas em U), que a esfera transforma em
 * arcos de meridiano convergindo para o polo — exatamente o efeito de
 * costura de um boné de seis gomos visto de perto, sem gastar um vértice
 * a mais na geometria (a esfera continua lisa; a "costura" é só pixel).
 *
 * Um traço, não um preenchimento: a costura de boné real é um relevo fino,
 * não uma faixa larga. `lineWidth` em fração da largura da textura mantém
 * a costura fina em qualquer resolução de `TEXTURA`.
 */
function desenharCosturas(ctx: CanvasRenderingContext2D, largura: number, altura: number): void {
  ctx.strokeStyle = COR_COSTURA
  ctx.lineWidth = Math.max(1, largura * 0.004)
  for (let i = 0; i < GOMOS; i++) {
    const x = (largura * i) / GOMOS
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, altura)
    ctx.stroke()
  }
}

export type EntradaTexturaBone = {
  corMarca: string
  nomeMarca: string
}

/**
 * Gera a textura completa da copa: sarja base, costuras dos seis gomos, e o
 * nome bordado no painel frontal — tinta chapada, sem contorno, mesma
 * decisão e mesmo motivo de `criarTexturaCaneca` (bordado real é UMA cor de
 * linha só; o contorno de duas cores é vocabulário de adesivo, não de
 * bordado).
 */
export function criarTexturaBone({ corMarca, nomeMarca }: EntradaTexturaBone): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = TEXTURA.largura
  canvas.height = TEXTURA.altura
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d indisponível')

  const largura = canvas.width
  const altura = canvas.height

  ctx.fillStyle = COR_SARJA
  ctx.fillRect(0, 0, largura, altura)

  desenharCosturas(ctx, largura, altura)

  const nome = resolverNomeMarca(nomeMarca)
  const faixaLargura = largura * FAIXA_LARGURA
  const espacoTexto = faixaLargura * 0.84
  const familia = resolveSansFamily()
  const medir: Medidor = (fonte, texto) => {
    ctx.font = fonte
    return ctx.measureText(texto).width
  }
  const tamanho = ajustarFonteAoEspaco({
    texto: nome,
    larguraDisponivel: espacoTexto,
    tamanhoMax: altura * 0.075,
    tamanhoMin: altura * 0.03,
    familia,
    medir,
  })

  ctx.font = `700 ${tamanho}px ${familia}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const cx = largura / 2
  const cy = altura * ((FAIXA_Y0 + FAIXA_Y1) / 2)

  // SEM CONTORNO — ver o cabeçalho da função.
  ctx.fillStyle = corMarca
  ctx.fillText(nome, cx, cy)

  const textura = new THREE.CanvasTexture(canvas)
  textura.colorSpace = THREE.SRGBColorSpace
  return textura
}
