import * as THREE from 'three'
import { SOL } from './predio-arquitetura'

/**
 * O CÉU DE HORA DOURADA, PINTADO — e o mapa de ambiente que sai da mesma tinta.
 *
 * O QUE ESTAVA AQUI ANTES: um degradê de três paradas da mesma cor âmbar, num
 * canvas de 4 × 256. Funciona como "fundo claro" e não como céu, por três
 * motivos que só aparecem quando se olha para um céu de verdade:
 *
 * 1. CÉU NÃO É MONOCROMÁTICO. Em hora dourada o horizonte é creme-alaranjado e
 *    o zênite é AZUL-VIOLETA — a luz que sobra lá em cima já é a do lado da
 *    noite. Um degradê de um matiz só lê como papel colorido.
 * 2. O SOL TEM LUGAR. Existe um lado do céu que é mais claro, e é ele que diz de
 *    onde vem a luz rasante que bate na cena. Sem isso a iluminação da cena e o
 *    fundo contam histórias diferentes.
 * 3. NUVEM RETROILUMINADA é a assinatura do horário. Com o sol atrás delas, o
 *    corpo fica escuro e a BORDA acende. É o detalhe que faz uma foto de fim de
 *    tarde parecer fim de tarde.
 *
 * O MESMO ARQUIVO GERA O MAPA DE AMBIENTE, e isso não é economia: é coerência.
 * O `criaAmbiente` antigo desenhava o seu próprio degradê, então a piscina e o
 * metal refletiam um céu que não era o céu que estava na tela. Agora o reflexo e
 * o fundo saem da mesma paleta e do mesmo azimute de sol — muda um, muda o
 * outro.
 *
 * Duas projeções porque são dois usos diferentes: o fundo é um PLANO (o céu
 * mapeado em retângulo) e o ambiente é EQUIRRETANGULAR (a esfera inteira, com o
 * horizonte na linha do meio). A paleta e o sol são compartilhados; só a
 * geometria da projeção muda.
 */

/**
 * A rampa do céu, do horizonte (t = 0) ao zênite (t = 1).
 *
 * Escrita à mão e não derivada de temperatura de cor, pelo mesmo motivo que
 * `predio-luz.ts` escreve a cor de cada andar à mão: a conversão física dá cores
 * corretas e sujas nas pontas, e o que se quer aqui é a leitura, não a medição.
 */
const RAMPA: readonly (readonly [number, string])[] = [
  [0.0, '#ffdeae'],
  [0.05, '#fbcb93'],
  [0.12, '#eeac83'],
  [0.22, '#cd918d'],
  [0.34, '#9d86a4'],
  [0.5, '#71789f'],
  [1.0, '#495b8d'],
]

/** Onde o sol está, em fração da largura de um mapa equirretangular. */
const U_DO_SOL = 0.5 + SOL.azimute / 360

function aplicaRampa(g: CanvasGradient, de: number, ate: number) {
  for (const [t, cor] of RAMPA) {
    const p = de + (ate - de) * t
    if (p >= 0 && p <= 1) g.addColorStop(p, cor)
  }
}

/**
 * Ruído determinístico. Zero `Math.random()` — a cena tem de nascer idêntica a
 * cada carregamento, senão nenhuma captura de tela é comparável com a próxima, e
 * foi comparando capturas que quase todos os defeitos desta feature apareceram.
 */
function ruido(i: number, k: number): number {
  const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453
  return s - Math.floor(s)
}

/**
 * Nuvens em faixa, retroiluminadas.
 *
 * `achatamento` alto de propósito: nuvem vista de perto do horizonte é ESTICADA,
 * porque se olha a camada de lado e não de baixo. Nuvem redonda no horizonte é o
 * erro mais comum de céu desenhado — lê como algodão colado no papel.
 *
 * Cada nuvem é desenhada duas vezes: o corpo em malva acinzentado e, deslocada
 * para o lado do sol, a mesma forma em creme quente. A sobreposição das duas
 * deixa um arco aceso na borda voltada para o sol, que é o que a retroiluminação
 * faz de verdade.
 */
function pintaNuvens(
  ctx: CanvasRenderingContext2D,
  largura: number,
  altura: number,
  vDe: number,
  vAte: number,
  quantidade: number,
  ladoDoSol: number,
) {
  for (let i = 0; i < quantidade; i++) {
    const u = ruido(i, 1)
    const t = ruido(i, 2)
    const v = vDe + (vAte - vDe) * t
    // Perto do horizonte a faixa é mais fina e mais comprida.
    const proximidade = 1 - t
    const larg = largura * (0.07 + ruido(i, 3) * 0.13) * (1 + proximidade * 1.1)
    const alt = altura * (0.006 + ruido(i, 4) * 0.016) * (1 - proximidade * 0.45)
    const x = u * largura
    const y = v * altura
    const opacidade = 0.16 + ruido(i, 5) * 0.3

    ctx.save()
    ctx.globalAlpha = opacidade
    // corpo
    ctx.fillStyle = '#6f6480'
    ctx.beginPath()
    ctx.ellipse(x, y, larg, alt, 0, 0, Math.PI * 2)
    ctx.fill()
    // bolhas do topo, para a silhueta não ser uma pílula
    for (let b = 0; b < 3; b++) {
      const bx = x + (ruido(i * 7 + b, 6) - 0.5) * larg * 1.3
      const br = alt * (1.1 + ruido(i * 7 + b, 7) * 1.5)
      ctx.beginPath()
      ctx.ellipse(bx, y - br * 0.5, br * 2.2, br, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    // borda acesa, deslocada para o lado do sol
    ctx.globalAlpha = opacidade * 1.5
    ctx.fillStyle = '#ffd9a2'
    ctx.beginPath()
    ctx.ellipse(x + ladoDoSol * larg * 0.1, y + alt * 0.42, larg * 0.94, alt * 0.66, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

/** O brilho do sol: uma mancha quente larga, no azimute certo. */
function pintaBrilho(
  ctx: CanvasRenderingContext2D,
  largura: number,
  altura: number,
  u: number,
  v: number,
  raio: number,
) {
  const g = ctx.createRadialGradient(u * largura, v * altura, 0, u * largura, v * altura, raio)
  g.addColorStop(0, 'rgba(255,241,206,0.92)')
  g.addColorStop(0.28, 'rgba(255,214,150,0.46)')
  g.addColorStop(0.62, 'rgba(255,186,132,0.16)')
  g.addColorStop(1, 'rgba(255,170,120,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, largura, altura)
}

/**
 * O DISCO DO SOL.
 *
 * Desenhado maior que o real de propósito, e a licença está declarada: o sol tem
 * meio grau de diâmetro, o que nesta textura daria dois pixels. Dois pixels não
 * leem como sol — leem como poeira no sensor. O que o olho reconhece como sol é
 * o conjunto NÚCLEO ESTOURADO + HALO APERTADO + brilho largo em volta, que é o
 * que uma lente faz com uma fonte muito mais brilhante que o resto da cena.
 *
 * Três camadas, de fora para dentro, porque uma só vira adesivo: o brilho largo
 * (já pintado antes), um halo apertado, e o núcleo branco de borda dura. É a
 * borda dura do núcleo, contra o halo macio, que dá a impressão de intensidade.
 */
function pintaDisco(
  ctx: CanvasRenderingContext2D,
  largura: number,
  altura: number,
  u: number,
  v: number,
  raio: number,
) {
  const x = u * largura
  const y = v * altura
  const halo = ctx.createRadialGradient(x, y, raio * 0.6, x, y, raio * 7)
  halo.addColorStop(0, 'rgba(255,248,225,0.85)')
  halo.addColorStop(0.35, 'rgba(255,229,178,0.34)')
  halo.addColorStop(1, 'rgba(255,214,150,0)')
  ctx.fillStyle = halo
  ctx.beginPath()
  ctx.arc(x, y, raio * 7, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = 'rgba(255,252,240,1)'
  ctx.beginPath()
  ctx.arc(x, y, raio, 0, Math.PI * 2)
  ctx.fill()
}


/**
 * GRÃO — e ele existe para matar o BANDEAMENTO, não para dar textura.
 *
 * Um degradê suave num canal de 8 bits só tem 256 degraus. Quando ele se espalha
 * por 400 pixels de tela, cada degrau ocupa uma FAIXA de vários pixels, e o olho
 * é muito bom em achar essas faixas — é o listrado que aparece em céu de
 * screenshot e em fundo de apresentação. Céu é o pior caso possível: é grande,
 * é liso e a variação é mínima.
 *
 * A solução é a mesma da indústria de áudio e de impressão: DITHER. Somando um
 * ruído de ±1,5 níveis antes de quantizar, a borda entre dois degraus deixa de
 * ser uma linha reta e vira uma transição irregular. O olho integra a
 * irregularidade e enxerga um degradê contínuo — troca-se banda por grão, e grão
 * a essa amplitude é invisível.
 *
 * De quebra, é o que uma foto tem: sensor de câmera sempre deixa ruído no céu, e
 * a ausência TOTAL de ruído é um dos sinais de imagem sintética.
 */
function granula(ctx: CanvasRenderingContext2D, largura: number, altura: number) {
  const img = ctx.getImageData(0, 0, largura, altura)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    // Hash barato sobre o índice do pixel: determinístico e sem padrão visível.
    const n = ((Math.sin(i * 0.0001) * 43758.5453) % 1) * 3 - 1.5
    d[i] = Math.max(0, Math.min(255, d[i]! + n))
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1]! + n))
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2]! + n))
  }
  ctx.putImageData(img, 0, 0)
}

/**
 * O céu do PLANO DE FUNDO.
 *
 * `fracaoVisivel` é a parte de baixo do plano que a câmera de fato enquadra: o
 * plano tem 46 m de altura e a lente só alcança cerca de um terço dele. Toda a
 * rampa do horizonte ao zênite é comprimida nessa fração — senão o visitante vê
 * só os dois primeiros centímetros do degradê e o céu volta a ser monocromático,
 * que era o defeito de origem.
 */
export function texturaDeCeu(
  solU: number,
  solV: number,
  fracaoVisivel = 0.46,
): THREE.CanvasTexture {
  // 2048 x 1024, e o numero sai de uma conta de amostragem: a faixa visivel do
  // plano tem ~54 m de largura e ocupa 1280 px de tela. Com 1024 de textura
  // espalhados nos 140 m do plano, sobravam 19 texels por metro para 24 pixels
  // por metro — o ceu chegava a tela JA interpolado, e o disco do sol e a borda
  // das nuvens perdiam a definicao justamente onde o olho olha.
  const largura = 2048
  const altura = 1024
  const cv = document.createElement('canvas')
  cv.width = largura
  cv.height = altura
  const ctx = cv.getContext('2d')!

  // v = 0 no TOPO do canvas e a rampa vai do horizonte para cima, então o
  // gradiente é desenhado de baixo para cima.
  const g = ctx.createLinearGradient(0, altura, 0, altura * (1 - fracaoVisivel))
  aplicaRampa(g, 0, 1)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, largura, altura)

  /**
   * A POSIÇÃO DO SOL VEM DE FORA, e isso é o ponto.
   *
   * A versão anterior cravava o brilho em (0,93, 0,995) — o canto direito de
   * baixo — porque com o sol a 8,5° de elevação e 104° de azimute ele caía fora
   * do recorte visível e só a cauda entrava. Número escolhido a olho para
   * combinar com uma direção de luz que morava em outro arquivo: exatamente a
   * armadilha de constante emprestada que `predio-luz.ts` já documenta três
   * vezes.
   *
   * Agora quem chama projeta `SOL` na geometria do plano e passa o resultado.
   * Mudar a elevação ou o azimute move o disco junto, sem ninguém lembrar de
   * vir aqui.
   */
  pintaBrilho(ctx, largura, altura, solU, solV, largura * 0.46)
  pintaNuvens(ctx, largura, altura, 1 - fracaoVisivel * 0.82, 0.995, 26, 1)
  // O disco vem DEPOIS das nuvens: sol atrás de nuvem fica encoberto, e aqui ele
  // está acima da camada. Antes delas, o halo ficaria lavado por cima.
  pintaDisco(ctx, largura, altura, solU, solV, 18)

  granula(ctx, largura, altura)

  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

/**
 * O MAPA DE AMBIENTE, equirretangular, com o mesmo céu.
 *
 * O `PMREMGenerator` no fim não é opcional: mapa cru só serve para espelho
 * perfeito. É ele que pré-filtra nos vários níveis de rugosidade, para metal
 * escovado ficar embaçado e metal polido ficar nítido.
 *
 * `ar` e `chao` continuam entrando: abaixo do horizonte o que existe em volta do
 * andar não é céu, é o ar daquele andar e a laje. Um andar interno refletindo
 * céu aberto seria tão errado quanto metal refletindo nada — e é por isso que
 * esta função continua recebendo a cor do andar ativo em vez de ser constante.
 */
export function criaAmbiente(
  renderer: THREE.WebGLRenderer,
  ar: string,
  chao: string,
  ceuAberto: boolean,
): THREE.Texture {
  const largura = 512
  const altura = 256
  const cv = document.createElement('canvas')
  cv.width = largura
  cv.height = altura
  const ctx = cv.getContext('2d')!

  // Metade de cima: céu. O horizonte fica em 0,5 porque em equirretangular a
  // linha do meio da imagem É o horizonte da esfera.
  const g = ctx.createLinearGradient(0, altura * 0.5, 0, 0)
  aplicaRampa(g, 0, 1)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, largura, altura * 0.5)

  // Metade de baixo: o ar do andar dissolvendo na laje.
  const gb = ctx.createLinearGradient(0, altura * 0.5, 0, altura)
  gb.addColorStop(0, ar)
  gb.addColorStop(1, chao)
  ctx.fillStyle = gb
  ctx.fillRect(0, altura * 0.5 - 1, largura, altura * 0.5 + 1)

  // O sol entra no ambiente SÓ onde há céu aberto. Num andar interno o que
  // ilumina é a luminária do andar, e um sol refletido no metal do datacenter
  // seria a mesma incoerência que o HDRI de interior seria na cobertura.
  if (ceuAberto) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, largura, altura * 0.5)
    ctx.clip()
    pintaBrilho(ctx, largura, altura, U_DO_SOL, 0.47, largura * 0.3)
    pintaNuvens(ctx, largura, altura, 0.2, 0.49, 22, 1)
    ctx.restore()
  }

  const tex = new THREE.CanvasTexture(cv)
  tex.mapping = THREE.EquirectangularReflectionMapping
  tex.colorSpace = THREE.SRGBColorSpace

  const pmrem = new THREE.PMREMGenerator(renderer)
  pmrem.compileEquirectangularShader()
  const alvo = pmrem.fromEquirectangular(tex)
  tex.dispose()
  pmrem.dispose()
  return alvo.texture
}
