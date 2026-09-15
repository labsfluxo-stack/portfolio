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
 * UM RECORTE É UMA SUPERFÍCIE COM SILHUETA — é o que folha e fronde precisam.
 *
 * A diferença para `Superficie` é o canal alfa: a peça não ocupa o retângulo
 * inteiro do plano, e o que sobra tem de sumir. E a diferença para o que havia
 * aqui antes são os dois últimos campos.
 *
 * FOLHA SEM RELEVO E SEM BRILHO É PAPEL RECORTADO. Era literalmente o que a cena
 * tinha: o `map` sozinho: uma cor chapada com duas riscas de nervura. Com isso,
 * toda folha virada para o mesmo lado recebe exatamente a mesma luz, e uma copa
 * de mil folhas vira uma mancha de um verde só — foi o que o dono viu no zoom e
 * chamou de "cor chapada".
 *
 * As duas coisas que faltavam:
 *
 * 1. NORMAL. A folha não é plana: ela tem quilha — sobe da margem até a nervura
 *    central e desce de novo. É essa curvatura que faz uma metade da folha pegar
 *    sol enquanto a outra fica na sombra, e é ela que quebra a mancha uniforme
 *    em mil valores diferentes sem custar um triângulo a mais.
 *
 * 2. RUGOSIDADE. Folha tem CUTÍCULA — a camada cerosa que faz a folha nova
 *    brilhar e a velha não. O reflexo especular correndo pelo limbo é metade do
 *    que diz ao olho que aquilo está vivo e úmido; sem ele a folhagem lê como
 *    feltro. E a rugosidade não é uniforme: a nervura é fosca e o limbo é
 *    lustroso, então o brilho anda em FAIXAS ao longo da folha.
 */
export type Recorte = {
  mapa: THREE.Texture
  alfa: THREE.Texture
  normal: THREE.Texture
  rugosidade: THREE.Texture
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
export function folha(tipo: 'lanceolada' | 'ovalada' = 'lanceolada'): Recorte {
  // 128 e nao 64: a folha tem 12 px na tela a 16 m, mas o dono inspeciona a copa
  // de perto e a 64 a nervura ja era um degrau. Uma textura so, compartilhada por
  // alguns milhares de instancias — dobrar a resolucao custa um canvas.
  const n = 128
  const [cor, c] = tela(n)
  const [alf, a] = tela(n)
  const [alt, h] = tela(n)
  const [rug, r] = tela(n)

  a.fillStyle = '#000000'
  a.fillRect(0, 0, n, n)
  /**
   * O FUNDO DA ALTURA É CINZA, NÃO PRETO — e isto é a armadilha do par
   * alfa + normal.
   *
   * Fora da silhueta o pixel não é desenhado (alfa zero), então a cor dele
   * parece não importar. Mas o Sobel não conhece o alfa: ele lê o campo de
   * altura inteiro, e um fundo preto encostado num limbo claro é um PENHASCO.
   * A normal resultante aponta para o lado exatamente na borda — bem onde a
   * folha é recortada — e a orla de cada folha acenderia como um fio de arame.
   *
   * Cinza no nível médio do limbo faz a borda virar uma descida suave, que é o
   * que a margem de uma folha é de verdade.
   */
  h.fillStyle = '#808080'
  h.fillRect(0, 0, n, n)
  r.fillStyle = '#b4b4b4'
  r.fillRect(0, 0, n, n)

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
  /**
   * DUAS FOLHAS, E NÃO UMA ESTICADA — este era o defeito que sobrou no zoom.
   *
   * A cena tem dois formatos de plano de folha: a lanceolada da oliveira (0,30 ×
   * 0,115, quase 3:1) e a folha larga tropical das jardineiras (0,26 × 0,20,
   * 1,3:1). As duas usavam o MESMO recorte. Uma silhueta 3:1 esmagada num plano
   * 1,3:1 não vira uma folha larga: vira uma PÁ — a ponta afilada engorda e o
   * contorno perde a curva, que é exatamente o que se via nas jardineiras.
   *
   * E a nervura errada é metade do problema. Folha estreita tem nervação PINADA
   * (uma central com laterais saindo em espinha); folha larga tem PALMADA
   * (várias nervuras de mesmo calibre abrindo em leque da base). São dois
   * desenhos diferentes, e é por eles que se reconhece cada uma a distância.
   *
   * Tudo o mais — degradê, mancha, quilha, cutícula — é compartilhado, porque
   * isso é física de folha e não anatomia de espécie.
   *
   * Escrito em fração de `n` para a forma não mudar quando a resolução muda: os
   * números fixos de antes eram do canvas de 64 e afinariam a folha em 128.
   */
  const larga = tipo === 'ovalada'
  const contorno = (ctx: CanvasRenderingContext2D) => {
    ctx.beginPath()
    if (larga) {
      // Ovalada: base ROLIÇA (é por ela que a folha se prende ao pecíolo, e é
      // larga), barriga máxima no primeiro terço, ponta curta e voltada.
      ctx.moveTo(n * 0.04, n / 2)
      ctx.bezierCurveTo(n * 0.06, n * 0.1, n * 0.52, n * 0.02, n * 0.94, n * 0.42)
      ctx.bezierCurveTo(n * 0.99, n * 0.47, n * 0.99, n * 0.53, n * 0.94, n * 0.58)
      ctx.bezierCurveTo(n * 0.52, n * 0.98, n * 0.06, n * 0.9, n * 0.04, n / 2)
    } else {
      ctx.moveTo(n * 0.031, n / 2)
      ctx.bezierCurveTo(n * 0.12, n * 0.062, n * 0.62, n * 0.094, n * 0.969, n / 2)
      ctx.bezierCurveTo(n * 0.62, n * 0.906, n * 0.12, n * 0.938, n * 0.031, n / 2)
    }
    ctx.closePath()
  }
  // As nervuras são as mesmas nos três mapas: cor, relevo e brilho têm de
  // concordar, senão o olho vê uma nervura pintada onde não há relevo e o
  // material denuncia que é desenho.
  const nervuras = (ctx: CanvasRenderingContext2D, larguraCentral: number, larguraLateral: number) => {
    ctx.lineCap = 'round'
    ctx.lineWidth = larguraCentral
    ctx.beginPath()
    ctx.moveTo(n * 0.05, n / 2)
    ctx.lineTo(larga ? n * 0.9 : n * 0.95, n / 2)
    ctx.stroke()
    ctx.lineWidth = larguraLateral
    if (larga) {
      // PALMADA: quatro nervuras de cada lado saindo da MESMA base, abrindo em
      // leque e curvando para acompanhar a margem. Calibre igual ao da central —
      // é isso que diferencia palmada de pinada, não o número de nervuras.
      for (let i = 1; i <= 4; i++) {
        const abre = (i / 5) * 0.72
        for (const s of [-1, 1]) {
          ctx.beginPath()
          ctx.moveTo(n * 0.06, n / 2)
          ctx.quadraticCurveTo(
            n * 0.4,
            n / 2 + s * n * abre * 0.44,
            n * (0.5 + (1 - abre) * 0.4),
            n / 2 + s * n * abre * 0.5,
          )
          ctx.stroke()
        }
      }
      return
    }
    for (let i = 1; i < 7; i++) {
      const x = n * 0.09 + (i * n * 0.78) / 7
      // A lateral sai em diagonal para a PONTA e encurta conforme se aproxima
      // dela, porque o limbo afina — lateral de comprimento fixo desenha um
      // retângulo de espinhas dentro de uma folha lanceolada.
      const alcance = n * 0.13 * (1 - (x / n) * 0.55)
      for (const s of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(x, n / 2)
        ctx.quadraticCurveTo(x + alcance * 0.5, n / 2 + s * alcance * 0.5, x + alcance, n / 2 + s * alcance * 1.1)
        ctx.stroke()
      }
    }
  }

  a.fillStyle = '#ffffff'
  contorno(a)
  a.fill()

  /**
   * A COR DO LIMBO É UM DEGRADÊ, e não um preenchimento — em duas direções.
   *
   * Ao longo (base → ponta): a folha nova na ponta do ramo é mais clara e mais
   * amarelada que a velha junto ao lenho. Numa copa inteira isso é o que impede
   * as mil folhas de terem o mesmo valor.
   *
   * Através (margem → nervura): a quilha. A parte junto à nervura está virada
   * para cima e pega mais céu; a margem tomba e escurece. O mesmo degradê aparece
   * no campo de altura logo abaixo, e é a concordância dos dois que convence.
   *
   * A base continua sendo verde NEUTRO: a cor vem da instância. Mesma regra da
   * madeira — textura é padrão, cor é tinta.
   */
  const aoLongo = c.createLinearGradient(0, 0, n, 0)
  aoLongo.addColorStop(0, '#93a189')
  aoLongo.addColorStop(0.45, '#b9c2ae')
  aoLongo.addColorStop(1, '#ced4be')
  c.fillStyle = aoLongo
  contorno(c)
  c.fill()

  c.save()
  contorno(c)
  c.clip()
  const quilha = c.createLinearGradient(0, 0, 0, n)
  quilha.addColorStop(0, 'rgba(52,68,40,0.40)')
  quilha.addColorStop(0.4, 'rgba(52,68,40,0)')
  quilha.addColorStop(0.5, 'rgba(255,255,255,0.20)')
  quilha.addColorStop(0.6, 'rgba(52,68,40,0)')
  quilha.addColorStop(1, 'rgba(52,68,40,0.40)')
  c.fillStyle = quilha
  c.fillRect(0, 0, n, n)
  // Manchas: folha de verdade tem o tom irregular, por idade e por poeira. São
  // largas e de contraste baixíssimo de propósito — mancha visível vira doença.
  for (let i = 0; i < 40; i++) {
    const x = ruido(i, 71) * n
    const y = n * 0.2 + ruido(i, 72) * n * 0.6
    const raio = n * (0.05 + ruido(i, 73) * 0.1)
    const claro = ruido(i, 74) > 0.5
    const m = c.createRadialGradient(x, y, 0, x, y, raio)
    m.addColorStop(0, claro ? 'rgba(236,240,222,0.22)' : 'rgba(72,90,56,0.20)')
    m.addColorStop(1, 'rgba(0,0,0,0)')
    c.fillStyle = m
    c.fillRect(x - raio, y - raio, raio * 2, raio * 2)
  }
  c.strokeStyle = 'rgba(234,240,224,0.7)'
  const branda = 'rgba(226,234,214,0.34)'
  c.lineWidth = n * 0.014
  c.beginPath()
  c.moveTo(n * 0.05, n / 2)
  c.lineTo(n * 0.95, n / 2)
  c.stroke()
  c.strokeStyle = branda
  nervuras(c, n * 0.014, n * 0.008)
  c.restore()

  /**
   * O CAMPO DE ALTURA. A quilha vira relevo de verdade aqui: claro no eixo,
   * escuro nas duas margens. O Sobel transforma essa rampa numa normal que
   * inclina a metade de cima da folha para um lado e a de baixo para o outro —
   * que é exatamente o que uma folha dobrada faz com a luz.
   */
  h.save()
  contorno(h)
  h.clip()
  const relevo = h.createLinearGradient(0, 0, 0, n)
  relevo.addColorStop(0, '#4c4c4c')
  relevo.addColorStop(0.5, '#d2d2d2')
  relevo.addColorStop(1, '#4c4c4c')
  h.fillStyle = relevo
  h.fillRect(0, 0, n, n)
  h.strokeStyle = '#ffffff'
  h.shadowBlur = n * 0.02
  h.shadowColor = '#ffffff'
  nervuras(h, n * 0.022, n * 0.012)
  h.restore()

  /**
   * A RUGOSIDADE. Escuro = liso. O limbo é lustroso (cutícula cerosa) e a
   * nervura é fosca, então o brilho corre em faixas entre as nervuras em vez de
   * cobrir a folha inteira. A margem também é fosca: é onde a folha resseca.
   */
  r.save()
  contorno(r)
  r.clip()
  r.fillStyle = '#5e5e5e'
  r.fillRect(0, 0, n, n)
  const foscoNaMargem = r.createLinearGradient(0, 0, 0, n)
  foscoNaMargem.addColorStop(0, 'rgba(214,214,214,0.9)')
  foscoNaMargem.addColorStop(0.5, 'rgba(214,214,214,0)')
  foscoNaMargem.addColorStop(1, 'rgba(214,214,214,0.9)')
  r.fillStyle = foscoNaMargem
  r.fillRect(0, 0, n, n)
  r.strokeStyle = 'rgba(206,206,206,0.85)'
  nervuras(r, n * 0.02, n * 0.011)
  r.restore()

  const mapa = new THREE.CanvasTexture(cor)
  mapa.colorSpace = THREE.SRGBColorSpace
  mapa.anisotropy = ANISOTROPIA
  const alfa = new THREE.CanvasTexture(alf)
  alfa.anisotropy = ANISOTROPIA
  // Força 1,2: a folha é fina e a quilha é rasa. Acima disso ela estufa e passa
  // a ler como pétala de plástico soprado.
  return { mapa, alfa, normal: normalDaAltura(alt, 1.2, 1, 1), rugosidade: acaba(rug, 1, 1, false) }
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
export function fronde(): Recorte {
  // 256: a fronde agora é partida em dois planos e cada metade estica 64 texels
  // sobre ~100 px de tela. A 128 o folíolo tinha 4 texels e o afilamento dele
  // sumia na amostragem — voltava a ser o fio de espessura fixa de antes.
  const n = 256
  const [cor, c] = tela(n)
  const [alf, a] = tela(n)
  const [alt, h] = tela(n)
  const [rug, r] = tela(n)
  a.fillStyle = '#000000'
  a.fillRect(0, 0, n, n)
  c.fillStyle = '#000000'
  c.fillRect(0, 0, n, n)
  // Cinza neutro no relevo e no brilho, pela mesma razão da folha: preto contra
  // folíolo claro seria um penhasco para o Sobel na borda recortada.
  h.fillStyle = '#808080'
  h.fillRect(0, 0, n, n)
  r.fillStyle = '#9b9b9b'
  r.fillRect(0, 0, n, n)

  const meio = n / 2
  /**
   * VINTE E DOIS FOLIOLOS, E NAO QUARENTA E SEIS — e a conta e de pixel, nao de
   * botanica.
   *
   * Uma fronde de verdade tem mais de cem foliolos. Mas na tela ela ocupa cerca
   * de cem pixels de comprimento, e 46 foliolos ali dao dois pixels cada: o vao
   * entre eles fecha na amostragem e a fronde volta a ser uma LAMINA MACICA —
   * exatamente o que o recorte por alfa existia para evitar.
   *
   * Com 22, cada foliolo tem quatro ou cinco pixels e o vao sobrevive. E o vao E
   * a leitura: e por ele que o ceu aparece, e e isso que da a palmeira a
   * silhueta serrilhada que nenhuma outra planta tem. Fidelidade que nao chega
   * ao pixel nao e fidelidade, e desperdicio.
   */
  /**
   * TRINTA E DOIS, E NÃO VINTE E DOIS — porque o folíolo deixou de ser um traço.
   *
   * A conta de 22 estava certa para o que existia: um `stroke` de espessura
   * CONSTANTE. Traço de espessura constante ou fecha o vão (muitos) ou vira fio
   * de arame (poucos), e 22 era o meio-termo menos ruim entre dois defeitos.
   *
   * Folíolo de verdade é uma LÂMINA: larga onde se prende ao ráquis, afinando
   * até a ponta. Desenhado assim, ele resolve os dois de uma vez — as bases se
   * encostam e formam a linha contínua que corre junto ao ráquis, e as pontas se
   * afastam sozinhas e abrem o vão em leque. É por isso que a silhueta de uma
   * palmeira é um pente que se abre, e não uma fileira de cerdas paralelas.
   *
   * Com a lâmina no lugar do traço, mais folíolos deixam de fechar a fronde: 32
   * dão base encostada e ponta separada, que é a fronde real.
   */
  const folioloS = 32

  /**
   * O folíolo, ponto a ponto: percorre a curva central e desloca para os dois
   * lados por uma largura que decai — ida por uma margem, volta pela outra.
   *
   * `quadraticCurveTo` não serviria: ele desenha UMA curva, e o que se quer aqui
   * é a região ENTRE duas curvas que convergem. Caminhar a curva à mão é o preço
   * de trocar cerda por lâmina.
   */
  const lamina = (
    ctx: CanvasRenderingContext2D,
    x: number,
    s: number,
    comp: number,
    inclina: number,
    larguraBase: number,
  ) => {
    const p0 = [x, meio] as const
    const p1 = [x + comp * 0.35 * inclina, meio + s * comp * 0.45] as const
    const p2 = [x + comp * 0.78 * inclina, meio + s * comp] as const
    const PASSOS = 7
    const eixo = (t: number) => {
      const u = 1 - t
      return [
        u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
        u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
      ] as const
    }
    const largura = (t: number) => larguraBase * (1 - t) ** 0.55
    const margem = (t: number, lado: number) => {
      const [px, py] = eixo(t)
      const u = 1 - t
      // Derivada da quadrática: dá a tangente, e a perpendicular dela é a
      // direção em que a lâmina tem largura.
      const dx = 2 * u * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0])
      const dy = 2 * u * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1])
      const m = Math.hypot(dx, dy) || 1
      const w = largura(t) * 0.5 * lado
      return [px - (dy / m) * w, py + (dx / m) * w] as const
    }
    ctx.beginPath()
    for (let i = 0; i <= PASSOS; i++) {
      const [mx, my] = margem(i / PASSOS, 1)
      if (i === 0) ctx.moveTo(mx, my)
      else ctx.lineTo(mx, my)
    }
    for (let i = PASSOS; i >= 0; i--) {
      const [mx, my] = margem(i / PASSOS, -1)
      ctx.lineTo(mx, my)
    }
    ctx.closePath()
    ctx.fill()
  }

  const desenha = (
    ctx: CanvasRenderingContext2D,
    corpo: (t: number, s: number) => string,
    raquis: string,
    larguraBase: number,
    grossuraRaquis: number,
  ) => {
    for (let i = 0; i < folioloS; i++) {
      const t = i / (folioloS - 1)
      // x corre ao longo do ráquis; a base é à esquerda e a ponta à direita.
      const x = n * 0.03 + t * n * 0.92
      // Comprimento: cresce até o terço inicial e decai até a ponta. É o perfil
      // de uma fronde de verdade, mais larga perto da base.
      // A variação de 8% por folíolo é o que impede a orla de virar um arco
      // desenhado a compasso. É a ÚNICA desordem que uma palmeira tem, e ela
      // mora aqui, na orla — nunca no arranjo, que é o que o dono corrigiu.
      const comp =
        Math.sin(Math.min(1, t * 1.25) * Math.PI) ** 0.7 * (n * 0.33) * (0.92 + ruido(i, 88) * 0.16) +
        n * 0.015
      // Os folíolos inclinam para a PONTA, nunca perpendiculares ao ráquis.
      const inclina = 0.55 + t * 0.5
      for (const s of [-1, 1]) {
        ctx.fillStyle = corpo(t, s)
        lamina(ctx, x, s, comp, inclina, larguraBase)
      }
    }
    // O ráquis, mais grosso na base.
    ctx.strokeStyle = raquis
    ctx.lineCap = 'round'
    ctx.lineWidth = grossuraRaquis
    ctx.beginPath()
    ctx.moveTo(n * 0.02, meio)
    ctx.lineTo(n * 0.97, meio)
    ctx.stroke()
  }

  const LARG = n * 0.032
  desenha(a, () => '#ffffff', '#ffffff', LARG, n * 0.017)
  /**
   * A COR DA FRONDE VARIA POR FOLÍOLO, e é o que faltava para ela deixar de ser
   * uma chapa verde.
   *
   * Duas coisas acontecem numa fronde real ao mesmo tempo: ela AMARELA da base
   * para a ponta (o tecido novo é mais claro), e cada folíolo pega a luz num
   * ângulo próprio — eles não são coplanares, torcem ao longo do ráquis. O
   * segundo efeito é o mais forte visualmente, e é ele que faz a fronde
   * cintilar em vez de ficar parada.
   *
   * Aqui isso vira um valor por folíolo, e não um degradê liso: o degradê
   * sozinho continuaria sendo uma chapa, só que em dois tons.
   */
  desenha(
    c,
    (t, s) => {
      const base = 158 + t * 26
      const torce = (ruido(Math.round(t * (folioloS - 1)), s > 0 ? 91 : 92) - 0.5) * 34
      const v = Math.max(96, Math.min(238, base + torce))
      return `rgb(${Math.round(v * 0.84)},${Math.round(v)},${Math.round(v * 0.68)})`
    },
    '#d6ddc4',
    LARG,
    n * 0.017,
  )
  // No relevo o ráquis é a única coisa que sobressai de verdade: ele é uma haste
  // roliça e os folíolos são lâminas de papel penduradas nele. Exagerar o
  // folíolo aqui daria um acolchoado, que é o defeito de quem confunde mapa de
  // normal com mapa de altura de verdade.
  desenha(h, (t) => `rgb(${Math.round(150 + t * 30)},${Math.round(150 + t * 30)},${Math.round(150 + t * 30)})`, '#ffffff', LARG, n * 0.022)
  // Brilho: o ráquis é liso e lustroso, o folíolo é fosco. Escuro = liso.
  desenha(r, () => '#a6a6a6', '#4e4e4e', LARG, n * 0.02)

  const mapa = new THREE.CanvasTexture(cor)
  mapa.colorSpace = THREE.SRGBColorSpace
  mapa.anisotropy = ANISOTROPIA
  const alfa = new THREE.CanvasTexture(alf)
  alfa.anisotropy = ANISOTROPIA
  return { mapa, alfa, normal: normalDaAltura(alt, 0.9, 1, 1), rugosidade: acaba(rug, 1, 1, false) }
}

/**
 * CASCA — e ela existe porque tronco e galho estavam vestidos com o mapa da
 * RÉGUA DE DECK.
 *
 * Era reaproveitamento com uma desculpa plausível ("grão correndo no
 * comprimento é o que casca tem"), e é falso onde importa. Régua de deck é
 * madeira SERRADA: o grão é liso, paralelo e contínuo, porque a serra atravessou
 * os anéis. Casca é o lado de fora da árvore e faz o oposto — ela RACHA, porque
 * o tronco engrossa por dentro e a camada externa, que já é tecido morto, não
 * acompanha. O que se vê é fissura, não veio.
 *
 * Duas cascas, porque as duas árvores da cobertura não têm nada em comum:
 *
 * - `oliveira`: fissura funda e TORCIDA. Oliveira velha é retorcida de verdade,
 *   e o sulco acompanha a torção do lenho em espiral. Cinza-prateada, quase sem
 *   marrom.
 *
 * - `palmeira`: palmeira não tem casca — não tem câmbio, não engrossa, não
 *   racha. O que ela tem são as CICATRIZES DAS FRONDES CAÍDAS: anéis
 *   horizontais regulares, um por folha que morreu, subindo o estipe inteiro
 *   como uma escada. É a marca mais reconhecível do tronco dela, e a cena não
 *   tinha nenhuma.
 */
export function casca(tipo: 'oliveira' | 'palmeira'): Superficie {
  const n = 256
  const [cor, c] = tela(n)
  const [altura, h] = tela(n)
  const [rugo, r] = tela(n)

  c.fillStyle = tipo === 'oliveira' ? '#9a958a' : '#a09884'
  c.fillRect(0, 0, n, n)
  h.fillStyle = '#9a9a9a'
  h.fillRect(0, 0, n, n)
  r.fillStyle = '#e6e6e6'
  r.fillRect(0, 0, n, n)

  if (tipo === 'oliveira') {
    // A fissura desce em espiral: a mesma senoide desloca o x ao longo do y, e é
    // por isso que ela nunca fecha um retângulo com a vizinha.
    for (let i = 0; i < 34; i++) {
      const x0 = ruido(i, 12) * n
      const torce = (ruido(i, 13) - 0.5) * n * 0.22
      const larg = n * (0.006 + ruido(i, 14) * 0.016)
      const fundo = 0.35 + ruido(i, 15) * 0.5
      const traca = (ctx: CanvasRenderingContext2D, estilo: string, l: number) => {
        ctx.strokeStyle = estilo
        ctx.lineWidth = l
        ctx.lineCap = 'round'
        ctx.beginPath()
        for (let y = 0; y <= n; y += n / 16) {
          const x = x0 + Math.sin((y / n) * Math.PI * 2 + i) * torce
          if (y === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
      traca(c, `rgba(58,54,47,${fundo * 0.75})`, larg)
      traca(h, `rgba(0,0,0,${fundo})`, larg)
      // Fissura é fundo de sulco: cheia de pó e sem cera nenhuma, então mais
      // fosca que a crista. A crista é o que o tempo lustra.
      traca(r, 'rgba(255,255,255,0.7)', larg * 1.5)
    }
    // Placas: entre as fissuras a casca se solta em escamas largas e claras.
    for (let i = 0; i < 60; i++) {
      const x = ruido(i, 16) * n
      const y = ruido(i, 17) * n
      const raio = n * (0.02 + ruido(i, 18) * 0.05)
      const g = c.createRadialGradient(x, y, 0, x, y, raio)
      g.addColorStop(0, ruido(i, 19) > 0.5 ? 'rgba(206,201,188,0.30)' : 'rgba(96,90,79,0.24)')
      g.addColorStop(1, 'rgba(0,0,0,0)')
      c.fillStyle = g
      c.fillRect(x - raio, y - raio, raio * 2, raio * 2)
    }
  } else {
    // ANÉIS. Dez por repetição vertical: com o estipe repetindo 6 vezes ao longo
    // de 4,2 m, isso dá um anel a cada 7 cm, que é o passo real de uma palmeira
    // adulta. Anel espaçado demais vira bambu; junto demais vira rosca.
    const ANEIS = 10
    for (let i = 0; i < ANEIS; i++) {
      const y = (i / ANEIS) * n
      const alturaDoAnel = n * 0.026
      // A cicatriz é um degrau: sombra embaixo, aresta acesa em cima. Desenhar as
      // duas metades é o que a faz ler como relevo e não como listra pintada.
      c.fillStyle = 'rgba(74,68,56,0.42)'
      c.fillRect(0, y, n, alturaDoAnel)
      c.fillStyle = 'rgba(214,206,186,0.34)'
      c.fillRect(0, y + alturaDoAnel, n, alturaDoAnel * 0.6)
      h.fillStyle = 'rgba(0,0,0,0.55)'
      h.fillRect(0, y, n, alturaDoAnel)
      h.fillStyle = 'rgba(255,255,255,0.5)'
      h.fillRect(0, y + alturaDoAnel, n, alturaDoAnel * 0.6)
      r.fillStyle = 'rgba(255,255,255,0.5)'
      r.fillRect(0, y, n, alturaDoAnel)
    }
    // Fibra vertical fina por cima: o estipe é um feixe de fibras, e é isso que
    // ele mostra entre um anel e outro.
    for (let i = 0; i < 90; i++) {
      const x = ruido(i, 22) * n
      const op = 0.06 + ruido(i, 23) * 0.12
      c.strokeStyle = `rgba(66,60,49,${op})`
      h.strokeStyle = `rgba(0,0,0,${op * 0.8})`
      for (const ctx of [c, h]) {
        ctx.lineWidth = n * 0.004
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x + (ruido(i, 24) - 0.5) * n * 0.03, n)
        ctx.stroke()
      }
    }
  }

  return {
    map: acaba(cor, 1, 1, true),
    // Força alta: sulco de casca é FUNDO, e é o único lugar desta cena onde o
    // relevo exagerado ajuda — tronco liso é o que denuncia árvore de videogame.
    normalMap: normalDaAltura(altura, tipo === 'oliveira' ? 3.2 : 2.2, 1, 1),
    roughnessMap: acaba(rugo, 1, 1, false),
  }
}

/**
 * LÂMINA DE GRAMÍNEA — a última planta da cobertura sem textura nenhuma.
 *
 * A gramínea era um material branco liso com a cor na instância: sem mapa, sem
 * relevo, sem brilho. O resultado é o que se vê no recorte da jardineira — as
 * touceiras leem como PALHA, feixes de varetas de um bege só, porque a lâmina
 * inteira recebe um valor único e nada acontece ao longo dela.
 *
 * Três coisas fazem uma folha de gramínea ser reconhecível, e nenhuma delas
 * estava aqui:
 *
 * 1. A DOBRA. A lâmina é dobrada em V ao longo do comprimento — é assim que uma
 *    fita de 3 mm de espessura fica de pé sem tombar. A dobra corre um lado ao
 *    sol e o outro na sombra, e é a coisa que mais denuncia gramínea.
 *
 * 2. O DEGRADÊ DA BASE PARA A PONTA. A base fica na sombra da touceira e é
 *    escura; a ponta é a que seca primeiro e é clara. Valor constante é o que
 *    faz o feixe parecer uma vassoura.
 *
 * 3. AS ESTRIAS. A folha é fibrosa no comprimento, com nervuras paralelas finas.
 *
 * Tudo em VALOR, quase sem matiz: a cor continua vindo da instância. Mesma regra
 * de sempre — textura é padrão, cor é tinta.
 */
export function graminea(): Superficie {
  const n = 64
  const [cor, c] = tela(n)
  const [altura, h] = tela(n)
  const [rugo, r] = tela(n)

  // v corre ao longo da lâmina (base embaixo no canvas, ponta em cima), porque é
  // assim que a face grande de uma `BoxGeometry` mapeia.
  const aoLongo = c.createLinearGradient(0, n, 0, 0)
  aoLongo.addColorStop(0, '#78806c')
  aoLongo.addColorStop(0.55, '#b9bfa8')
  aoLongo.addColorStop(1, '#d8dbc2')
  c.fillStyle = aoLongo
  c.fillRect(0, 0, n, n)

  // A dobra: clara na crista, escura nas duas abas. No mapa de cor ela é sutil —
  // o trabalho pesado é do relevo, logo abaixo.
  const dobra = (ctx: CanvasRenderingContext2D, aba: string, crista: string) => {
    const g = ctx.createLinearGradient(0, 0, n, 0)
    g.addColorStop(0, aba)
    g.addColorStop(0.5, crista)
    g.addColorStop(1, aba)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, n, n)
  }
  dobra(c, 'rgba(40,48,32,0.32)', 'rgba(255,255,255,0.18)')

  h.fillStyle = '#808080'
  h.fillRect(0, 0, n, n)
  dobra(h, 'rgba(0,0,0,0.75)', 'rgba(255,255,255,0.85)')

  // Estrias: finas, paralelas e de contraste baixo. Aparecem nos três mapas
  // porque fibra é relevo, cor e brilho ao mesmo tempo.
  r.fillStyle = '#8a8a8a'
  r.fillRect(0, 0, n, n)
  dobra(r, 'rgba(224,224,224,0.6)', 'rgba(56,56,56,0.7)')
  for (let i = 0; i < 9; i++) {
    const x = n * 0.1 + (i / 8) * n * 0.8
    const op = 0.1 + ruido(i, 33) * 0.14
    c.strokeStyle = `rgba(52,60,42,${op})`
    h.strokeStyle = `rgba(0,0,0,${op * 1.4})`
    r.strokeStyle = `rgba(230,230,230,${op})`
    for (const ctx of [c, h, r]) {
      ctx.lineWidth = n * 0.012
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, n)
      ctx.stroke()
    }
  }

  return {
    map: acaba(cor, 1, 1, true),
    // Força alta porque a dobra é o gesto inteiro da peça: a lâmina tem 3 cm de
    // largura e 1 px na tela, e o que precisa sobreviver a essa redução é a
    // diferença de luz entre as duas abas, não a estria.
    normalMap: normalDaAltura(altura, 2.6, 1, 1),
    roughnessMap: acaba(rugo, 1, 1, false),
  }
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
