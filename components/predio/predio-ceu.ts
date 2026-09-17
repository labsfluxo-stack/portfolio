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
/**
 * ONZE PARADAS E NÃO SETE, e as quatro que entraram não são enfeite.
 *
 * Céu de pôr do sol não é uma transição de quente para frio: é uma SEQUÊNCIA de
 * faixas com nomes próprios, e pular qualquer uma delas faz o degradê parecer
 * um filtro em vez de um céu.
 *
 * De baixo para cima:
 *  0,00  o branco-dourado do próprio horizonte, onde o sol ainda está
 *  0,03  o âmbar da poeira baixa
 *  0,08  o laranja da camada densa
 *  0,15  o CORAL, que é a faixa que faltava — é aqui que o laranja entrega para
 *        o rosa, e sem ela o salto de um para o outro lê como banda
 *  0,23  o rosa-terroso
 *  0,32  o MALVA, a segunda que faltava: o ponto neutro da curva, onde o quente
 *        e o frio se cruzam. Sem ele o céu tem dois blocos de cor em vez de uma
 *        transição
 *  0,42  o violeta-acinzentado
 *  0,55  o azul-ardósia
 *  0,72  o azul do meio da abóbada
 *  1,00  o zênite, o mais escuro e o mais saturado
 *
 * Os degraus são mais APERTADOS embaixo, e isso é físico: perto do horizonte a
 * linha de visão atravessa muito mais atmosfera por grau de elevação, então a
 * cor muda depressa. Degraus uniformes dariam um céu que muda de cor no mesmo
 * ritmo de baixo a cima, que é o que nenhum céu faz.
 */
const RAMPA: readonly (readonly [number, string])[] = [
  [0.0, '#ffe8c4'],
  [0.03, '#ffd6a0'],
  [0.08, '#f7b785'],
  [0.15, '#e79c86'],
  [0.23, '#cf8f92'],
  [0.32, '#b0849c'],
  [0.42, '#9179a2'],
  [0.55, '#75749e'],
  [0.72, '#5d6a97'],
  [1.0, '#41528a'],
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
 * NUVEM NÃO TEM BORDA — e era exatamente isso que estava errado.
 *
 * A versão anterior desenhava cada nuvem com `ellipse` + `fill`. Isso produz uma
 * silhueta de borda DURA: a transição de nuvem para céu acontece em um pixel. O
 * resultado foram as lozangos cinzentas achatadas que se viam no render, com
 * cara de adesivo recortado e colado no degradê.
 *
 * Nuvem é uma nuvem de gotículas. A densidade cai gradualmente até zero nas
 * bordas, e é essa dissolução — não a forma — que o olho usa para reconhecê-la.
 * Uma elipse de borda macia lê como nuvem; um contorno perfeito de qualquer
 * forma lê como papel.
 *
 * Então cada bolha passa a ser um degradê radial que vai da cor cheia no miolo a
 * alfa zero na borda, e a nuvem é um AGLOMERADO de seis a dez bolhas de tamanhos
 * diferentes. É mais caro — dez degradês por nuvem contra um preenchimento —,
 * mas isto roda uma vez na montagem da textura e nunca mais.
 *
 * AS TRÊS COISAS QUE FAZEM A NUVEM SER DAQUELE FIM DE TARDE:
 *
 * 1. A DISTÂNCIA AO SOL manda na cor. Nuvem perto do sol é dourada e clara;
 *    longe dele é malva e escura. Antes todas tinham a mesma cor de corpo com um
 *    arco quente colado embaixo, e o arco apontava sempre para o mesmo lado
 *    independentemente de onde a nuvem estivesse.
 *
 * 2. A BASE É MAIS CLARA QUE O TOPO. Ao pôr do sol a luz vem de BAIXO — ela
 *    passa rasante sob a camada e acende a barriga da nuvem enquanto o topo
 *    fica na sombra. É o inverso do meio-dia, e é o sinal mais específico do
 *    horário. As bolhas inferiores recebem a mistura quente; as de cima, não.
 *
 * 3. O ACHATAMENTO CRESCE PERTO DO HORIZONTE. Vê-se a camada de lado e não de
 *    baixo, então ela estica. Nuvem redonda no horizonte é o erro mais comum de
 *    céu desenhado.
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
  /** Uma bolha macia: cor cheia no centro, alfa zero na borda. */
  const bolha = (x: number, y: number, rx: number, ry: number, cor: string, alfa: number) => {
    ctx.save()
    ctx.globalAlpha = alfa
    ctx.translate(x, y)
    ctx.scale(1, ry / rx)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx)
    g.addColorStop(0, cor)
    // A parada em 0,55 mantém o miolo cheio: sem ela o degradê começa a cair do
    // centro e a nuvem inteira vira uma mancha difusa sem corpo.
    g.addColorStop(0.55, cor)
    g.addColorStop(1, cor.replace(/[\d.]+\)$/, '0)'))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(0, 0, rx, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  for (let i = 0; i < quantidade; i++) {
    const u = ruido(i, 1)
    const t = ruido(i, 2)
    const v = vDe + (vAte - vDe) * t
    const proximidade = 1 - t
    const larg = largura * (0.05 + ruido(i, 3) * 0.1) * (1 + proximidade * 1.2)
    const alt = altura * (0.008 + ruido(i, 4) * 0.02) * (1 - proximidade * 0.4)
    const x = u * largura
    const y = v * altura
    /**
     * A PROXIMIDADE DO SOL, medida no eixo U com a volta pelo outro lado.
     *
     * O mapa é equirretangular: `u` = 0 e `u` = 1 são o mesmo meridiano. Uma
     * nuvem em 0,02 está perto de um sol em 0,98, e a subtração direta diria que
     * está do outro lado do céu. `min(d, 1 − d)` resolve, e sem isso a faixa de
     * nuvens douradas teria um corte seco na emenda da textura.
     */
    const dU = Math.abs(u - U_DO_SOL)
    const pertoDoSol = 1 - Math.min(dU, 1 - dU) / 0.5
    const calor = pertoDoSol ** 2.2
    const opacidade = (0.2 + ruido(i, 5) * 0.34) * (0.7 + calor * 0.5)

    // Corpo: malva frio longe do sol, malva quente perto. Nunca cinza puro —
    // nuvem de fim de tarde não tem cinza em lugar nenhum.
    const rTopo = Math.round(108 + calor * 96)
    const gTopo = Math.round(98 + calor * 66)
    const bTopo = Math.round(126 + calor * 20)
    const corTopo = `rgba(${rTopo},${gTopo},${bTopo},${opacidade.toFixed(3)})`
    // Barriga: a luz rasante que passa sob a camada. Ela é sempre mais quente e
    // mais clara que o topo, e a diferença cresce perto do sol.
    const corBase = `rgba(${Math.round(210 + calor * 45)},${Math.round(168 + calor * 60)},${Math.round(136 + calor * 40)},${(opacidade * 1.15).toFixed(3)})`

    // O aglomerado. As bolhas de cima levam a cor do topo; as de baixo, a da
    // barriga — e elas ficam mais para o lado do sol, porque é de lá que a luz
    // rasante entra na camada.
    const bolhas = 6 + Math.floor(ruido(i, 8) * 5)
    for (let b = 0; b < bolhas; b++) {
      const f = b / (bolhas - 1)
      const emBaixo = ruido(i * 13 + b, 9) > 0.55
      const bx = x + (f - 0.5) * larg * 1.7 + (ruido(i * 13 + b, 6) - 0.5) * larg * 0.3
      const by = y + (emBaixo ? alt * 0.55 : -alt * 0.35) + (ruido(i * 13 + b, 10) - 0.5) * alt
      // As pontas do aglomerado são menores: é o que dá à nuvem uma silhueta que
      // afina nas bordas em vez de terminar em parede.
      const escala = 0.45 + Math.sin(f * Math.PI) * 0.8
      const rx = larg * 0.42 * escala * (0.7 + ruido(i * 13 + b, 7) * 0.7)
      bolha(
        bx + (emBaixo ? ladoDoSol * larg * 0.08 : 0),
        by,
        rx,
        rx * (alt / larg) * (emBaixo ? 2.1 : 2.8),
        emBaixo ? corBase : corTopo,
        1,
      )
    }
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
  /**
   * OITO PARADAS E NÃO QUATRO, e a diferença é onde a curva cai.
   *
   * Com quatro paradas a queda era quase linear, e brilho de sol não é linear —
   * ele despenca perto da fonte e depois se arrasta por dezenas de graus. Uma
   * rampa linear devolve um DISCO de luz com borda perceptível, que é o halo
   * redondo de adesivo que se via; a curva real devolve um brilho que não se
   * sabe onde termina.
   *
   * As paradas apertadas no começo (0,06 / 0,13 / 0,22) fazem a queda íngreme;
   * as espaçadas no fim (0,55 / 0,78 / 1,0) fazem o arrasto. E a cor caminha de
   * creme quase branco para laranja e daí para um rosa que já é a cor do céu —
   * é essa última transição que costura o brilho ao fundo em vez de deixá-lo
   * flutuando por cima.
   */
  const g = ctx.createRadialGradient(u * largura, v * altura, 0, u * largura, v * altura, raio)
  g.addColorStop(0, 'rgba(255,246,222,0.95)')
  g.addColorStop(0.06, 'rgba(255,236,196,0.8)')
  g.addColorStop(0.13, 'rgba(255,221,166,0.58)')
  g.addColorStop(0.22, 'rgba(255,203,142,0.4)')
  g.addColorStop(0.36, 'rgba(252,182,130,0.25)')
  g.addColorStop(0.55, 'rgba(240,160,126,0.13)')
  g.addColorStop(0.78, 'rgba(219,146,133,0.05)')
  g.addColorStop(1, 'rgba(205,140,140,0)')
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
  const halo = ctx.createRadialGradient(x, y, raio * 0.5, x, y, raio * 9)
  halo.addColorStop(0, 'rgba(255,250,232,0.9)')
  halo.addColorStop(0.16, 'rgba(255,240,204,0.55)')
  halo.addColorStop(0.42, 'rgba(255,224,172,0.2)')
  halo.addColorStop(0.72, 'rgba(255,206,150,0.06)')
  halo.addColorStop(1, 'rgba(255,196,142,0)')
  ctx.fillStyle = halo
  ctx.beginPath()
  ctx.arc(x, y, raio * 9, 0, Math.PI * 2)
  ctx.fill()

  /**
   * O NÚCLEO GANHOU UMA ORLA DE MEIO PIXEL, e ela resolve o único artefato que
   * sobrava no sol.
   *
   * O disco era um `arc` preenchido de branco puro: borda serrilhada de
   * circunferência rasterizada, visível porque o contraste contra o halo é
   * altíssimo. Um degradê que fica branco até 88% do raio e cai a zero no último
   * oitavo dá a mesma leitura de borda dura — o olho continua achando o limite —
   * sem a escada de pixel.
   *
   * É o mesmo raciocínio das nuvens invertido: lá a borda macia era o assunto,
   * aqui ela é só o antisserrilhado de um limite que DEVE parecer duro.
   */
  const nucleo = ctx.createRadialGradient(x, y, 0, x, y, raio)
  nucleo.addColorStop(0, 'rgba(255,253,246,1)')
  nucleo.addColorStop(0.88, 'rgba(255,251,238,1)')
  nucleo.addColorStop(1, 'rgba(255,246,222,0)')
  ctx.fillStyle = nucleo
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
