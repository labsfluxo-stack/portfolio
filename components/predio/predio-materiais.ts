import * as THREE from 'three'

/**
 * AS SUPERFÍCIES DA COBERTURA — desenhadas, com relevo.
 *
 * O QUE FALTAVA, e é o mesmo diagnóstico para todos os objetos: cor chapada. Uma
 * caixa marrom é uma caixa marrom, não uma tábua; um bloco cinza é um bloco
 * cinza, não concreto. O olho reconhece material por três coisas, e a cena não
 * tinha nenhuma das três:
 *
 * 1. VARIAÇÃO DE COR em escala pequena. Nenhuma superfície real é de um tom só.
 * 2. RELEVO. Grão de madeira, poro de concreto e trama de tecido são
 *    micro-geometria. Sem mapa de normal a luz varre a superfície sem encontrar
 *    nada, e o resultado é a leitura de plástico — plástico é justamente o
 *    material que não tem relevo.
 * 3. RUGOSIDADE DESIGUAL. O reflexo especular quebrando em manchas é o que
 *    separa "superfície" de "cor". Rugosidade constante dá brilho uniforme, que
 *    só existe em coisa moldada.
 *
 * Tudo aqui é CANVAS, nada baixado. O motivo é o mesmo de `predio-ceu.ts`: este
 * site é exportação estática com orçamento de Lighthouse, e um conjunto de mapas
 * PBR fotográficos custa megabytes. Textura desenhada custa alguns
 * quilobytes de código e nasce coerente com a direção de arte.
 *
 * O MAPA DE NORMAL SAI DA ALTURA, por Sobel. Desenha-se um campo de altura em
 * cinza, mede-se a inclinação em x e y a cada pixel e escreve-se a inclinação
 * como cor. É a forma clássica, e a vantagem sobre desenhar a normal à mão é que
 * o relevo fica automaticamente coerente com o que se vê no mapa de cor: os dois
 * saem do mesmo desenho.
 */

function tela(n: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const cv = document.createElement('canvas')
  cv.width = cv.height = n
  return [cv, cv.getContext('2d')!]
}

/** Ruído determinístico — a cena tem de nascer igual a cada carregamento. */
function ruido(i: number, k: number): number {
  const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453
  return s - Math.floor(s)
}

/**
 * FILTRAGEM ANISOTRÓPICA — e esta é a maior perda de qualidade da cena.
 *
 * O deck é visto quase de raspão: a câmera está 1,6 m acima dele e olha na
 * horizontal, então o ângulo de incidência na régua é de poucos graus. Nessa
 * situação, um texel cobre MUITOS pixels na direção da fuga e quase nenhum na
 * transversal — e o mipmap, que é isotrópico, só sabe escolher um nível para as
 * duas direções. Ele escolhe o borrado, porque é o que evita cintilação. O
 * resultado é grão de madeira virando papa cinzenta a três metros de distância.
 *
 * A filtragem anisotrópica amostra ao longo da direção esticada em vez de
 * escolher um nível só. É a única técnica que recupera detalhe em superfície
 * rasante, e é praticamente de graça em hardware moderno.
 *
 * 8 e não 16: o ganho de 8 para 16 é quase imperceptível e o custo de banda
 * dobra. O three limita ao máximo do aparelho sozinho, então este número é um
 * TETO pedido, nunca uma exigência — em celular que só faz 2, ele faz 2.
 */
const ANISOTROPIA = 8

function acaba(cv: HTMLCanvasElement, repeteU: number, repeteV: number, srgb: boolean) {
  const t = new THREE.CanvasTexture(cv)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(repeteU, repeteV)
  t.anisotropy = ANISOTROPIA
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  return t
}

/**
 * Campo de altura → mapa de normal, por Sobel.
 *
 * `forca` multiplica a inclinação. Valor alto exagera o relevo e a superfície
 * fica com cara de plástico injetado — o erro oposto ao de não ter relevo
 * nenhum. Grão de madeira vive perto de 1,5; poro de concreto, de 2,5.
 */
function normalDaAltura(fonte: HTMLCanvasElement, forca: number, repeteU: number, repeteV: number) {
  const n = fonte.width
  const src = fonte.getContext('2d')!.getImageData(0, 0, n, n).data
  const [cv, ctx] = tela(n)
  const saida = ctx.createImageData(n, n)
  const h = (x: number, y: number) => src[(((y + n) % n) * n + ((x + n) % n)) * 4]! / 255
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      // Sobel: a diferença entre os vizinhos dá a inclinação local.
      const dx =
        h(x - 1, y - 1) + 2 * h(x - 1, y) + h(x - 1, y + 1) -
        (h(x + 1, y - 1) + 2 * h(x + 1, y) + h(x + 1, y + 1))
      const dy =
        h(x - 1, y - 1) + 2 * h(x, y - 1) + h(x + 1, y - 1) -
        (h(x - 1, y + 1) + 2 * h(x, y + 1) + h(x + 1, y + 1))
      const vx = dx * forca
      const vy = dy * forca
      const inv = 1 / Math.sqrt(vx * vx + vy * vy + 1)
      const i = (y * n + x) * 4
      saida.data[i] = (vx * inv * 0.5 + 0.5) * 255
      saida.data[i + 1] = (vy * inv * 0.5 + 0.5) * 255
      saida.data[i + 2] = (inv * 0.5 + 0.5) * 255
      saida.data[i + 3] = 255
    }
  }
  ctx.putImageData(saida, 0, 0)
  // Mapa de normal NUNCA em sRGB: os canais são um vetor, não uma cor. Marcar
  // como sRGB aplica a curva de gama a uma direção e torce o relevo inteiro.
  return acaba(cv, repeteU, repeteV, false)
}

export type Superficie = {
  map: THREE.Texture
  normalMap: THREE.Texture
  roughnessMap: THREE.Texture
}

/**
 * Uma superfície com OUTRA repetição, sem redesenhar o canvas.
 *
 * Existe porque o mesmo concreto veste peças de tamanhos muito diferentes — a
 * borda da laje tem 35 cm de altura e a parede do fundo tem 3,2 m. Com a mesma
 * repetição, o poro fica do tamanho de um punho numa e de um grão de areia na
 * outra, e nada denuncia textura repetida mais rápido que escala errada.
 *
 * `clone()` compartilha a IMAGEM e só duplica os parâmetros de amostragem, então
 * cinco variações custam cinco descritores e um canvas.
 */
export function comRepeticao(s: Superficie, u: number, v: number): Superficie {
  const ajusta = (t: THREE.Texture) => {
    const c = t.clone()
    c.repeat.set(u, v)
    c.needsUpdate = true
    return c
  }
  return { map: ajusta(s.map), normalMap: ajusta(s.normalMap), roughnessMap: ajusta(s.roughnessMap) }
}

/**
 * O concreto é COMPARTILHADO no módulo, e não gerado por componente.
 *
 * Desenhar a textura custa um canvas de 256² mais uma passada de Sobel por
 * pixel. Barato uma vez, caro a cada montagem de andar — e a janela de três
 * andares remonta componentes a cada troca de andar, sete vezes na descida. O
 * cache aqui é o que impede a descida de pagar isso de novo a cada parada.
 */
let concretoEmCache: Superficie | null = null
export function concretoCompartilhado(): Superficie {
  if (!concretoEmCache) concretoEmCache = concreto()
  return concretoEmCache
}

/**
 * MADEIRA DE DECK — e o que a pesquisa de deck de verdade corrigiu aqui.
 *
 * Régua de deck não é uma tábua lisa: é madeira serrada, exposta ao tempo, com
 * o grão CORRENDO NO COMPRIMENTO e com o topo levemente lixado pelo uso. O que
 * a distingue de "marrom" são as linhas longas e paralelas de tonalidade
 * ligeiramente diferente, os raros nós, e o fato de a rugosidade variar ao longo
 * do grão — a fibra do verão é mais densa e reflete diferente da fibra do
 * inverno. É por isso que madeira brilha em FAIXAS e não por igual.
 *
 * O grão corre em V para acompanhar o comprimento da régua, que é o eixo z da
 * geometria.
 */
export function madeiraDeDeck(): Superficie {
  const n = 256
  const [cor, c] = tela(n)
  /**
   * BASE QUASE NEUTRA, e isto é a correção de um erro que o render mostrou.
   *
   * A primeira versão pintou a base de `#a97a4e`, a cor da madeira. Só que em
   * three.js `map`, `color` e `instanceColor` MULTIPLICAM os três — e a cor da
   * instância já era marrom. Marrom vezes marrom deu um deck quase preto, com o
   * grão virando listra vermelha dura.
   *
   * A regra que sai daí: TEXTURA É PADRÃO, COR É TINTA. O mapa carrega só a
   * variação em torno de 1,0 — grão, nó, mancha — e quem decide o tom é a
   * instância. Assim a mesma textura serve para ipê, cumaru ou deck lavado,
   * trocando só a cor da cópia.
   */
  c.fillStyle = '#e6ddd0'
  c.fillRect(0, 0, n, n)
  const [alt, a] = tela(n)
  a.fillStyle = '#808080'
  a.fillRect(0, 0, n, n)

  // Linhas de grão, longas e quase paralelas, com leve ondulação.
  for (let i = 0; i < 74; i++) {
    const x = ruido(i, 1) * n
    const larg = 0.6 + ruido(i, 2) * 2.6
    const escuro = ruido(i, 3)
    c.strokeStyle = `rgba(${escuro > 0.5 ? '150,132,110' : '252,246,236'},${0.16 + ruido(i, 4) * 0.34})`
    a.strokeStyle = `rgba(${escuro > 0.5 ? '40,40,40' : '190,190,190'},${0.25 + ruido(i, 5) * 0.4})`
    c.lineWidth = larg
    a.lineWidth = larg
    for (const ctx of [c, a]) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      // Ondulação suave: grão perfeitamente reto lê como listra impressa.
      for (let y = 0; y <= n; y += 16)
        ctx.lineTo(x + Math.sin(y * 0.02 + i) * (1.5 + ruido(i, 6) * 3), y)
      ctx.stroke()
    }
  }
  // Nós: dois por textura, e não mais — deck de qualidade é selecionado.
  for (let k = 0; k < 2; k++) {
    const nx = 40 + ruido(k, 7) * (n - 80)
    const ny = ruido(k, 8) * n
    for (let r = 9; r > 0; r--) {
      c.strokeStyle = `rgba(158,138,112,${0.05 + (9 - r) * 0.03})`
      a.strokeStyle = `rgba(60,60,60,${0.05 + (9 - r) * 0.03})`
      for (const ctx of [c, a]) {
        ctx.lineWidth = 1.4
        ctx.beginPath()
        ctx.ellipse(nx, ny, r * 1.7, r * 4.5, 0, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
  }

  // Rugosidade ALTA e pouco variada: deck de exterior é fosco. A primeira versão
  // deixou o mapa claro demais e as réguas ficaram envernizadas — madeira
  // brilhante ao ar livre lê como piso de salão, não como terraço.
  const [rug, r] = tela(n)
  r.fillStyle = '#d8d8d8'
  r.fillRect(0, 0, n, n)
  r.globalAlpha = 0.28
  r.drawImage(alt, 0, 0)

  return {
    map: acaba(cor, 1, 12, true),
    normalMap: normalDaAltura(alt, 1.6, 1, 12),
    roughnessMap: acaba(rug, 1, 12, false),
  }
}

/**
 * CONCRETO APARENTE — parapeito, laje e parede da cobertura.
 *
 * Concreto de obra tem quatro marcas que ninguém desenha e todo mundo
 * reconhece: o MOSQUEADO de tonalidade (a cura nunca é uniforme), o POROS da
 * superfície (bolhas de ar presas contra a fôrma), as MANCHAS DE ESCORRIMENTO
 * (água correndo na vertical, mais escuras embaixo) e as JUNTAS entre placas de
 * fôrma. Sem elas, concreto lê como cartolina cinza.
 *
 * As manchas correm todas no mesmo sentido de propósito: água escorre para
 * baixo, e mancha em direções aleatórias é o erro que denuncia textura gerada.
 */
export function concreto(): Superficie {
  const n = 256
  const [cor, c] = tela(n)
  c.fillStyle = '#c7b9a2'
  c.fillRect(0, 0, n, n)
  const [alt, a] = tela(n)
  a.fillStyle = '#8c8c8c'
  a.fillRect(0, 0, n, n)

  // Mosqueado: manchas largas e suaves de cura desigual.
  for (let i = 0; i < 46; i++) {
    const x = ruido(i, 11) * n
    const y = ruido(i, 12) * n
    const raio = 26 + ruido(i, 13) * 84
    const claro = ruido(i, 14) > 0.5
    const g = c.createRadialGradient(x, y, 0, x, y, raio)
    g.addColorStop(0, claro ? 'rgba(232,224,210,0.15)' : 'rgba(132,122,106,0.13)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    c.fillStyle = g
    c.fillRect(x - raio, y - raio, raio * 2, raio * 2)
  }
  // Escorrimento vertical.
  for (let i = 0; i < 9; i++) {
    const x = ruido(i, 15) * n
    const larg = 2 + ruido(i, 16) * 9
    const g = c.createLinearGradient(0, ruido(i, 17) * n * 0.5, 0, n)
    g.addColorStop(0, 'rgba(96,86,70,0)')
    g.addColorStop(0.5, 'rgba(96,86,70,0.09)')
    g.addColorStop(1, 'rgba(96,86,70,0.03)')
    c.fillStyle = g
    c.fillRect(x, 0, larg, n)
  }
  // Poros: pontos escuros minúsculos, no mapa de cor E no de altura.
  for (let i = 0; i < 900; i++) {
    const x = ruido(i, 21) * n
    const y = ruido(i, 22) * n
    const raio = 0.35 + ruido(i, 23) * 1.1
    c.fillStyle = `rgba(104,95,82,${0.08 + ruido(i, 24) * 0.18})`
    a.fillStyle = `rgba(40,40,40,${0.16 + ruido(i, 25) * 0.3})`
    for (const ctx of [c, a]) {
      ctx.beginPath()
      ctx.arc(x, y, raio, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  // Junta de fôrma: uma linha reta horizontal, com sombra embaixo.
  for (const y of [n * 0.5]) {
    c.fillStyle = 'rgba(88,79,65,0.5)'
    c.fillRect(0, y, n, 1.6)
    a.fillStyle = 'rgba(20,20,20,0.85)'
    a.fillRect(0, y, n, 1.6)
  }

  const [rug, r] = tela(n)
  r.fillStyle = '#b4b4b4'
  r.fillRect(0, 0, n, n)
  r.globalAlpha = 0.5
  r.drawImage(alt, 0, 0)

  return {
    map: acaba(cor, 4, 2, true),
    normalMap: normalDaAltura(alt, 1.0, 4, 2),
    roughnessMap: acaba(rug, 4, 2, false),
  }
}

/**
 * TECIDO DE ESTOFADO E LONA — espreguiçadeira e guarda-sol.
 *
 * Lona de exterior é trama grossa: dá para ver o fio. O que ela faz com a luz é
 * o oposto do plástico branco que estava ali — a trama espalha o reflexo em
 * micro-sombras, então a superfície tem uma textura visível mesmo quando a cor é
 * uniforme. Sem isso, almofada branca vira sabonete.
 */
export function tecido(): Superficie {
  const n = 128
  const [cor, c] = tela(n)
  c.fillStyle = '#efe6d8'
  c.fillRect(0, 0, n, n)
  const [alt, a] = tela(n)
  a.fillStyle = '#808080'
  a.fillRect(0, 0, n, n)

  // Trama: fios cruzados, um passo a cada 4 px.
  for (let i = 0; i < n; i += 4) {
    for (const [ctx, claro, escuro] of [
      [c, 'rgba(255,252,246,0.5)', 'rgba(196,184,166,0.42)'],
      [a, 'rgba(225,225,225,0.6)', 'rgba(58,58,58,0.6)'],
    ] as const) {
      ctx.fillStyle = claro
      ctx.fillRect(i, 0, 2, n)
      ctx.fillStyle = escuro
      ctx.fillRect(i + 2, 0, 2, n)
      ctx.fillStyle = claro
      ctx.fillRect(0, i, n, 2)
      ctx.fillStyle = escuro
      ctx.fillRect(0, i + 2, n, 2)
    }
  }
  // Sujeira leve: tecido de exterior não é alvo de fábrica.
  for (let i = 0; i < 20; i++) {
    const x = ruido(i, 31) * n
    const y = ruido(i, 32) * n
    const raio = 8 + ruido(i, 33) * 26
    const g = c.createRadialGradient(x, y, 0, x, y, raio)
    g.addColorStop(0, 'rgba(198,186,168,0.2)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    c.fillStyle = g
    c.fillRect(x - raio, y - raio, raio * 2, raio * 2)
  }

  const [rug, r] = tela(n)
  r.fillStyle = '#d2d2d2'
  r.fillRect(0, 0, n, n)
  r.globalAlpha = 0.35
  r.drawImage(alt, 0, 0)

  return {
    map: acaba(cor, 3, 3, true),
    normalMap: normalDaAltura(alt, 1.1, 3, 3),
    roughnessMap: acaba(rug, 3, 3, false),
  }
}

/**
 * A FOLHA, RECORTADA POR ALFA — e esta é a técnica que separa folhagem de
 * tempo real de folhagem de papel picado.
 *
 * O problema: a folha é um retângulo. Dois triângulos, e o contorno de um
 * retângulo é um retângulo. Contra o céu, na periferia da copa — que é
 * justamente onde o olho examina a silhueta de uma árvore — o que aparece é um
 * enxame de quadradinhos.
 *
 * A saída NÃO é modelar a forma da folha em geometria. Uma folha lanceolada em
 * malha custaria de cinco a dez triângulos, e são milhares de folhas. A saída é
 * a que a indústria usa desde sempre: manter os dois triângulos e RECORTAR o
 * contorno com um mapa de alfa. O contorno sai de graça, no estágio de
 * fragmento, e a silhueta fica tão boa quanto a de uma malha.
 *
 * `alphaTest` e não `transparent`, e a distinção importa muito aqui:
 *
 * - `transparent` obriga a ordenar os objetos por profundidade a cada quadro e
 *   desliga a escrita de profundidade. Com milhares de folhas entrelaçadas, a
 *   ordenação é impossível de acertar e o resultado pisca conforme a câmera
 *   anda.
 * - `alphaTest` simplesmente DESCARTA o fragmento abaixo do limiar. A folha
 *   continua opaca, entra no buffer de profundidade normalmente, não precisa de
 *   ordem nenhuma — e, de brinde, projeta sombra com o CONTORNO CERTO em vez de
 *   sombra retangular.
 *
 * O mapa de cor leva a nervura central: uma linha mais clara no meio da folha.
 * É o único detalhe interno que sobrevive à distância, e é ele que diz "folha"
 * em vez de "mancha verde".
 */
export function folha(): { mapa: THREE.Texture; alfa: THREE.Texture } {
  const n = 64
  const [cor, c] = tela(n)
  const [alf, a] = tela(n)

  a.fillStyle = '#000000'
  a.fillRect(0, 0, n, n)

  // A lanceolada: duas curvas espelhadas que se encontram em ponta nas duas
  // extremidades. É o contorno da folha de oliveira, de louro, de salgueiro —
  // a forma mais comum que existe, e a que menos parece um retângulo.
  /**
   * A CURVA VIROU CUBICA, e o motivo aparece no zoom. Com uma quadratica de um
   * ponto de controle so, o contorno sai PONTUDO nas duas extremidades e a folha
   * le como estrela de quatro pontas — vista de perto, uma copa inteira dessas
   * vira um amontoado de espinhos.
   *
   * Folha lanceolada e cheia no meio e afina SO na ponta: a base e arredondada,
   * onde ela se prende ao peciolo. Dois pontos de controle dao exatamente isso —
   * o primeiro abre a barriga logo depois da base, o segundo a fecha devagar ate
   * a ponta.
   */
  const contorno = (ctx: CanvasRenderingContext2D) => {
    ctx.beginPath()
    ctx.moveTo(2, n / 2)
    ctx.bezierCurveTo(n * 0.12, 4, n * 0.62, 6, n - 2, n / 2)
    ctx.bezierCurveTo(n * 0.62, n - 6, n * 0.12, n - 4, 2, n / 2)
    ctx.closePath()
  }

  a.fillStyle = '#ffffff'
  contorno(a)
  a.fill()

  // Base da folha em verde neutro: a COR vem da instância, então aqui mora só o
  // padrão. Mesma regra da madeira — textura é padrão, cor é tinta.
  c.fillStyle = '#b9c2ae'
  contorno(c)
  c.fill()
  // Nervura central, um pouco mais clara que o limbo.
  c.strokeStyle = 'rgba(232,238,222,0.75)'
  c.lineWidth = 1.6
  c.beginPath()
  c.moveTo(3, n / 2)
  c.lineTo(n - 3, n / 2)
  c.stroke()
  // Nervuras laterais, saindo da central em diagonal para a ponta.
  c.strokeStyle = 'rgba(224,232,212,0.4)'
  c.lineWidth = 1
  for (let i = 1; i < 6; i++) {
    const x = 6 + i * (n - 14) / 6
    for (const s of [-1, 1]) {
      c.beginPath()
      c.moveTo(x, n / 2)
      c.lineTo(x + 7, n / 2 + s * 8)
      c.stroke()
    }
  }

  const mapa = new THREE.CanvasTexture(cor)
  mapa.colorSpace = THREE.SRGBColorSpace
  mapa.anisotropy = ANISOTROPIA
  const alfa = new THREE.CanvasTexture(alf)
  alfa.anisotropy = ANISOTROPIA
  return { mapa, alfa }
}

/**
 * A FRONDE DE PALMEIRA — e ela precisa de recorte próprio, não de uma folha
 * esticada.
 *
 * Fronde pinada não é uma folha grande: é um RÁQUIS (a haste central) com
 * dezenas de folíolos presos ao longo dele, como um pente de dois lados. O
 * espaço ENTRE os folíolos é metade do que se vê — é por ele que o céu aparece,
 * e é isso que dá à palmeira a silhueta leve e serrilhada que nenhuma outra
 * planta tem.
 *
 * Uma folha lanceolada esticada daria uma lâmina maciça. O recorte por alfa
 * resolve: os vãos entre folíolos são simplesmente alfa zero, e a fronde inteira
 * continua custando dois triângulos.
 *
 * Os folíolos são mais curtos nas pontas e mais longos no meio, que é a
 * proporção real — fronde de folíolo uniforme lê como escova de garrafa.
 */
export function fronde(): { mapa: THREE.Texture; alfa: THREE.Texture } {
  const n = 128
  const [cor, c] = tela(n)
  const [alf, a] = tela(n)
  a.fillStyle = '#000000'
  a.fillRect(0, 0, n, n)
  c.fillStyle = '#000000'
  c.fillRect(0, 0, n, n)

  const meio = n / 2
  const folioloS = 46

  const desenha = (ctx: CanvasRenderingContext2D, corpo: string, raquis: string) => {
    ctx.strokeStyle = corpo
    ctx.lineCap = 'round'
    for (let i = 0; i < folioloS; i++) {
      const t = i / (folioloS - 1)
      // x corre ao longo do ráquis; a base é à esquerda e a ponta à direita.
      const x = 4 + t * (n - 10)
      // Comprimento: cresce até o terço inicial e decai até a ponta. É o perfil
      // de uma fronde de verdade, mais larga perto da base.
      const comp = Math.sin(Math.min(1, t * 1.25) * Math.PI) ** 0.7 * (n * 0.33) + 2
      // Os folíolos inclinam para a PONTA, nunca perpendiculares ao ráquis.
      const inclina = 0.55 + t * 0.5
      ctx.lineWidth = 2.1
      for (const s of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(x, meio)
        ctx.quadraticCurveTo(
          x + comp * 0.35 * inclina,
          meio + s * comp * 0.45,
          x + comp * 0.75 * inclina,
          meio + s * comp,
        )
        ctx.stroke()
      }
    }
    // O ráquis, mais grosso na base.
    ctx.strokeStyle = raquis
    ctx.lineWidth = 3.4
    ctx.beginPath()
    ctx.moveTo(3, meio)
    ctx.lineTo(n - 5, meio)
    ctx.stroke()
  }

  desenha(a, '#ffffff', '#ffffff')
  desenha(c, '#b6c4a6', '#cdd6bb')

  const mapa = new THREE.CanvasTexture(cor)
  mapa.colorSpace = THREE.SRGBColorSpace
  mapa.anisotropy = ANISOTROPIA
  const alfa = new THREE.CanvasTexture(alf)
  alfa.anisotropy = ANISOTROPIA
  return { mapa, alfa }
}

/**
 * ONDULAÇÃO DA ÁGUA — só o mapa de normal.
 *
 * A água não precisa de mapa de cor (a cor é uniforme e mora no material) nem de
 * rugosidade: precisa de RELEVO. O que torna uma lâmina reconhecível como água é
 * o reflexo QUEBRANDO — a mesma imagem do céu, picotada pela ondulação. Com a
 * superfície perfeitamente lisa, o reflexo é um espelho limpo e a lâmina lê como
 * vidro ou como chapa.
 *
 * A soma de seis ondas de frequências incomensuráveis evita o padrão de grade
 * que duas ondas perpendiculares produzem — grade lê como toalha de plástico.
 */
export function normalDeAgua(): THREE.Texture {
  const n = 256
  const [alt, a] = tela(n)
  const img = a.createImageData(n, n)
  const ondas = [
    [0.09, 0.03, 1.0],
    [0.04, 0.11, 0.8],
    [0.15, -0.07, 0.5],
    [-0.06, 0.17, 0.4],
    [0.23, 0.19, 0.22],
    [0.31, -0.27, 0.14],
  ] as const
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      let h = 0
      let soma = 0
      for (const [fx, fy, amp] of ondas) {
        h += Math.sin(x * fx + y * fy) * amp
        soma += amp
      }
      const v = (h / soma) * 0.5 + 0.5
      const i = (y * n + x) * 4
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v * 255
      img.data[i + 3] = 255
    }
  }
  a.putImageData(img, 0, 0)
  return normalDaAltura(alt, 0.9, 3, 1)
}
