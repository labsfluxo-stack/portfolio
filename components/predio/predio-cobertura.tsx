'use client'
import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Coletor } from './predio-instancias'
import {
  casca,
  comRepeticao,
  concreto,
  folha,
  fronde,
  graminea,
  madeiraDeDeck,
  normalDeAgua,
  veuDagua,
} from './predio-materiais'

/**
 * A COBERTURA — o primeiro quadro do site.
 *
 * A spec pede que este andar diga "os negócios vão bem e tranquilos" SEM
 * escrever isso, e que IMPACTE.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * O QUE ESTAVA FALTANDO PARA SER REALISTA, e o diagnóstico vale para a cena
 * inteira. Havia geometria certa e material errado, mas o problema maior era
 * mais básico: TUDO ERA PRIMITIVA DE ARESTA VIVA.
 *
 * 1. ARESTA VIVA NÃO EXISTE. Nenhum objeto fabricado tem aresta de raio zero —
 *    madeira é lixada, metal é dobrado, estofado é costurado. E o que o olho usa
 *    para julgar isso não é a forma: é o FIO DE LUZ que corre pela quina. Uma
 *    aresta com 2 mm de raio pega o sol e desenha uma linha clara; uma aresta
 *    matemática não pega nada e a peça lê como bloco de renderização. É o tell
 *    mais forte de todos e o mais barato de resolver — `RoundedBoxGeometry`.
 *
 * 2. SUPERFÍCIE SEM RELEVO É PLÁSTICO, porque plástico é justamente o material
 *    que não tem relevo. Grão de madeira, poro de concreto e trama de lona são
 *    micro-geometria, e sem mapa de normal a luz varre a superfície sem
 *    encontrar nada. Ver `predio-materiais.ts`.
 *
 * 3. SILHUETA ERRADA. Espreguiçadeira não é duas caixas: é estrutura tubular com
 *    encosto RECLINADO e estofado por cima, e o que se reconhece a quarenta
 *    metros é esse perfil em L quebrado. Árvore não é três esferas num palito:
 *    é tronco CÔNICO com galhos e uma copa feita de muitos tufos de tamanhos
 *    diferentes — esfera lisa lê como pirulito. Vaso não é um cubo: é um tronco
 *    de cone com BORDA, e é a borda que diz "vaso".
 * ────────────────────────────────────────────────────────────────────────────
 *
 * DUAS LIÇÕES DE ENQUADRAMENTO que continuam valendo e estão medidas:
 *
 * - O PARAPEITO ERA UMA VENDA. Com 0,88 m ele ocupava a faixa y 455..580 de uma
 *   tela de 720 e sobravam 17 pixels de deck. Está em 0,34 m, em `Predio.tsx`.
 * - A JANELA É MAIS ESTREITA QUE O PRÉDIO. A escala na tela é 599/(5,9 − z)
 *   px/m, e a meia-largura visível é 1,068·(5,9 − z) — 10,2 m na faixa das
 *   espreguiçadeiras, não 15. Em retrato o aspecto cai para 0,462 e sobra uma
 *   COLUNA DE ±2,8 m. Daí a regra: todo andar precisa de composição completa
 *   dentro de |x| < 3; o resto é bônus de tela grande.
 */

/**
 * A mancha de sombra de contato, desenhada em canvas.
 *
 * Degradê radial usado como MAPA DE ALFA. Não é a sombra do sol — essa existe e
 * é projetada, mas com o sol a 8,5° de elevação ela sai 6,7 vezes a altura do
 * objeto e cai fora do quadro. A de contato é a outra, a que fica embaixo da
 * peça, e é ela que ancora. Sem ela o móvel flutua.
 */
function manchaDeSombra(): THREE.CanvasTexture {
  const n = 128
  const cv = document.createElement('canvas')
  cv.width = cv.height = n
  const ctx = cv.getContext('2d')!
  const g = ctx.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.42, 'rgba(255,255,255,0.62)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, n, n)
  return new THREE.CanvasTexture(cv)
}

/** Ruído determinístico — zero `Math.random()`, a cena nasce igual sempre. */
function ruido(i: number, k: number): number {
  const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453
  return s - Math.floor(s)
}

/**
 * A curva de um fio pendurado — catenária, `y = a·cosh(x/a)`, não parábola.
 *
 * Fio solto pelo próprio peso tem componente horizontal de tensão constante e
 * vertical crescendo ao longo do arco. Parece parábola e não é; a diferença
 * aparece justamente perto dos apoios, que é onde o olho repara. A mesma conta
 * já governa o cabeamento do datacenter, e pelo mesmo motivo: fio reto é o erro
 * que denuncia cena montada.
 *
 * Parametrizada pela FLECHA — o quanto afunda no meio — porque é a barriga que
 * se ajusta a olho, não a densidade linear.
 */
function catenaria(
  de: THREE.Vector3,
  ate: THREE.Vector3,
  flecha: number,
  n: number,
): THREE.Vector3[] {
  const c = 2.2
  const base = Math.cosh(c) - 1
  const pontos: THREE.Vector3[] = []
  for (let i = 0; i <= n; i++) {
    const u = i / n
    const t = u * 2 - 1
    const p = new THREE.Vector3().lerpVectors(de, ate, u)
    p.y -= flecha * ((Math.cosh(c) - Math.cosh(c * t)) / base)
    pontos.push(p)
  }
  return pontos
}

/**
 * AS MEDIDAS DO ESCRITÓRIO VIVEM NO MÓDULO, e não dentro do `useMemo`.
 *
 * Duas coisas dele não podem ser instanciadas — o pano de vidro (é transparente,
 * precisa ser ordenado contra o interior) e a luz (não é geometria). Elas moram
 * no bloco JSX, que está fora do `useMemo` e não enxerga nada do que é declarado
 * lá dentro. A primeira versão resolveu isso repetindo os números nos dois
 * lugares, e repetir coordenada é combinar um erro para depois: bastava mover o
 * volume 35 cm e o vidro ficaria para trás, flutuando sozinho.
 *
 * E O FUNDO DO ESCRITÓRIO É A PAREDE DO TERRAÇO — ele não tem uma própria.
 *
 * Eu desenhei uma, e ela não aparecia: o render mostrava poro de concreto dentro
 * do escritório, onde deveria haver reboco liso. A sonda que resolveu isso foi
 * pintar o material de magenta e renderizar uma vez — só as DUAS LATERAIS
 * ficaram magenta. Com isso o diagnóstico virou aritmética em vez de palpite: a
 * parede do andar está em `zCentro − prof/2` com 30 cm de espessura, ou seja
 * face em −11,25, e eu tinha posto o fundo da caixa em −11,29. Quatro
 * centímetros ATRÁS. A caixa inteira estava ali; faltava ela terminar do lado
 * certo de um plano que eu nunca tinha medido.
 *
 * Empurrar tudo para a frente resolveria, e seria a solução errada. Pavilhão de
 * cobertura se encosta no núcleo do prédio — é por ali que sobem prumada e
 * escada. Então o `z` passa a ser DERIVADO da parede em vez de escolhido a olho,
 * e a chance de os dois se cruzarem de novo quando um deles mudar desaparece.
 */
/**
 * A PISCINA, DEFINIDA POR BORDAS — e não por centro mais fator, como era.
 *
 * Ela vive nos dois lados do arquivo: o tanque, a lâmina, o fundo e as pedras
 * estão no bloco JSX (a lâmina é transparente e precisa ser ordenada), e a
 * escada e o degrau submerso estão no coletor. As duas metades derivavam a
 * posição de `zCentro − prof × 0,03` cada uma por conta própria, e as dimensões
 * eram cinco fatores independentes (0,26 para a lâmina, 0,145 para a distância
 * das pedras, 0,29 para as pedras laterais, 0,27 para o tanque). Mexer na
 * profundidade da água exigia acertar os cinco à mão e torcer.
 *
 * Agora há uma fonte só, e ela diz o que a piscina É: onde começa e onde acaba.
 * Tudo o mais — centro, profundidade, borda — sai daí por conta.
 *
 * A LÂMINA AVANÇOU 2,28 m PARA A FRENTE — a borda foi de −3,60 para −1,33, e o
 * tanque passou de 3,38 m para 5,66 m de profundidade, 67% a mais. Pedido do
 * dono, e ela só pôde ir tão longe porque as espreguiçadeiras saíram na mesma
 * leva e liberaram a faixa de deck inteira.
 *
 * A razão de crescer para a FRENTE e não para trás é de ângulo, e é o que faz o
 * ganho ser maior do que os números sugerem. A câmera olha a lâmina quase de
 * raspão: água acrescentada no fundo chega comprimida em quase nada na tela,
 * enquanto a mesma água acrescentada perto abre.
 *
 * O limite não é estético, é de colisão. A pedra da borda ocupa −1,34 a −0,92, e
 * depois dela ainda precisam caber o ralo do deck e o vidro do guarda-corpo
 * (zCentro + prof × 0,40 = 0,30). O ralo estava em × 0,30 = −1,00, ou seja
 * DENTRO da pedra — andou para × 0,345, e agora sobram 50 cm de deck entre os
 * dois. É essa folga que impede a próxima mudança de empurrar a piscina contra
 * o parapeito.
 */
const PISCINA = { fundo: 0.16, frente: 0.275 }
const piscinaZ = (zCentro: number, prof: number) => {
  const fundo = zCentro - prof * PISCINA.fundo
  const frente = zCentro + prof * PISCINA.frente
  return { fundo, frente, centro: (fundo + frente) / 2, profundidade: frente - fundo }
}

/**
 * A CASCATA CORRE A PAREDE INTEIRA — menos onde o escritório encosta nela.
 *
 * O fundo do escritório É a parede do andar (ver `zDaParedeDoAndar`), então um
 * véu d'água colado nela apareceria DENTRO da sala, atrás da estante. A parede
 * se parte em dois trechos, e a folga de 5 cm de cada lado do volume evita que o
 * véu raspe no caixilho.
 *
 * Devolve pares [de, até] em x, já descartando trecho degenerado — se um dia o
 * escritório crescer até a borda da laje, o trecho daquele lado simplesmente
 * não existe em vez de virar uma peça de largura negativa.
 */
const TRECHOS_DA_CASCATA = (
  xEsc: number,
  largura: number,
  meiaLargura: number,
): [number, number][] =>
  (
    [
      [-meiaLargura, xEsc - largura / 2 - 0.05],
      [xEsc + largura / 2 + 0.05, meiaLargura],
    ] as [number, number][]
  ).filter(([de, ate]) => ate - de > 0.5)

const ESCRITORIO = { x: -7.8, largura: 5.8, altura: 2.92, profundidade: 2.0 }
/** Face interna da parede do andar — é ela que fecha o escritório por trás. */
const zDaParedeDoAndar = (zCentro: number, prof: number) => zCentro - prof / 2 + 0.15
const zDoEscritorio = (zCentro: number, prof: number) =>
  zDaParedeDoAndar(zCentro, prof) + ESCRITORIO.profundidade / 2

export function Cobertura({
  piso,
  zCentro,
  prof,
  meiaLargura,
}: {
  piso: number
  zCentro: number
  prof: number
  meiaLargura: number
}) {
  const { scene } = useThree()
  const ondaDagua = useMemo(() => normalDeAgua(), [])

  const malhas = useMemo(() => {
    const col = new Coletor()
    const madeira = madeiraDeDeck()
    const pedra = concreto()
    // `tecido()` saiu com o guarda-sol e as espreguiçadeiras: era a trama de lona
    // do estofado e da cúpula, e não sobrou nenhuma peça de pano na cobertura.
    const recorteDeFolha = folha()
    const recorteDeFolhaLarga = folha('ovalada')
    const recorteDeFronde = fronde()

    // ── geometrias ────────────────────────────────────────────────────────
    // Raio de 5 mm na régua: é o chanfro que uma régua de deck de verdade tem,
    // e é ele que produz a linha de luz no topo de cada tábua.
    const gRipa = new RoundedBoxGeometry(0.16, 0.022, prof * 0.92, 1, 0.005)

    // ESPREGUIÇADEIRA. Estrutura tubular + estofado, não duas caixas.
    // GOMOS, nao uma almofada inteira: e a costura que faz o estofado ler como
    // macio. Ver o comentario no ponto de uso.
    // Doze lados e nao oito: com a camera assentando a 5,9 m, um tubo de oito
    // lados mostra a faceta e o reflexo anda em degraus ao longo dele.
    // A almofada nao fica solta em cima do tubo: ela assenta DENTRO de um
    // caixilho. E a longarina do caixilho, aparecendo rente ao estofado, que diz
    // que a peca tem estrutura por baixo em vez de ser um colchao no chao.

    // PERGOLADO. Viga com chanfro e chapa de aço no encontro com o poste — é a
    // ferragem que diz "construído" em vez de "empilhado".
    // PERGOLADO MAIS ALTO (2,6 -> 2,9). Em janela baixa e larga a faixa vertical
    // visivel encolhe, e pergolado, topo de plantio e palmeira caiam todos na
    // mesma altura de tela, um cortando o outro. Subir 30 cm abre o vao entre o
    // forro do pergolado e a copa do jardim, e os dois voltam a se ler separados.
    // POSTE FINO E EM MENOR NUMERO. Pergolado vence 5 m de vao com folga em
    // madeira lamelada, entao quatro postes num pano de 11 m era estrutura
    // sobrando — e cada poste e uma barra vertical atravessando a vista de cima a
    // baixo. Tres postes com dois vaos de 5,2 m fazem o mesmo trabalho e devolvem
    // uma barra inteira de ceu.
    const gPoste = new RoundedBoxGeometry(0.095, 2.9, 0.095, 1, 0.008)
    const gRipaPergola = new RoundedBoxGeometry(0.07, 0.09, 4.6, 1, 0.006)
    const gVigaPergola = new RoundedBoxGeometry(12.2, 0.14, 0.13, 1, 0.008)
    const gChapa = new THREE.BoxGeometry(0.19, 0.22, 0.012)
    const gParafuso = new THREE.CylinderGeometry(0.012, 0.012, 0.03, 6)
    const gSoquete = new THREE.CylinderGeometry(0.016, 0.02, 0.055, 6)
    const gLampada = new THREE.SphereGeometry(0.038, 8, 6)
    // MAO-FRANCESA: a diagonal entre poste e viga. Portico so com pecas
    // ortogonais e instavel de verdade, e o olho conhece isso — pergolado sem
    // contraventamento le como montagem provisoria.
    const gMaoFrancesa = new RoundedBoxGeometry(0.075, 0.075, 0.62, 1, 0.006)
    // Folha de trepadeira: a planta que sobe pelo pergolado. Achatada e miuda.
    /**
     * A FOLHA E UM PLANO, e esta troca e a mais importante da vegetacao inteira.
     *
     * Era um icosaedro — solido fechado, vinte triangulos. Solido e o OPOSTO de
     * folha por tres razoes, e todas as tres pesam mais nesta cena do que
     * pesariam em outra:
     *
     * 1. FOLHA E FINA. O que o olho reconhece como folhagem e um enxame de
     *    superficies PLANAS em angulos diferentes: umas de frente para o sol,
     *    brancas de estouro, outras de perfil, quase invisiveis. Um solido tem
     *    todas as normais ao mesmo tempo e o sombreamento MEDIA tudo — sai um
     *    tom uniforme, que e exatamente o que folhagem nao tem.
     *
     * 2. ESTA CENA E CONTRALUZ. Com o sol atras, folha de verdade fica entre a
     *    brasa e a silhueta: a que o sol atravessa ACENDE em verde-limao, a que
     *    esta de costas vira recorte preto. E a maior amplitude de valor da cena
     *    inteira, e o icosaedro nao conseguia entregar nada disso.
     *
     * 3. E MAIS BARATO. O plano tem DOIS triangulos contra vinte. Pelo mesmo
     *    orcamento cabem dez vezes mais folhas — e densidade e justamente o que
     *    faltava para a copa ler como massa em vez de punhado.
     *
     * O material tem de ser DE DUAS FACES: folha orientada ao acaso mostra o
     * verso metade do tempo, e face unica faria metade da copa sumir.
     */
    // O raminho que carrega o ramalhete de folhas. Escalado em Y por ramo.
    const gRaminho = new THREE.CylinderGeometry(0.0035, 0.008, 0.3, 4)

    // PALMEIRA. O estipe e aneladissimo — cada anel e a cicatriz de uma fronde
    // que caiu — mas a essa distancia o anel nao resolve; o que resolve e o
    // estipe ser FINO e a copa ser larga, que e a proporcao que nenhuma outra
    // planta tem.
    // ESTIPE ALTO de proposito: palmeira so le como palmeira se a copa SUBIR acima
    // do resto do plantio. Na altura da graminea ela vira mais um tufo, e o gesto
    // — estipe fino, copa em arco la em cima — e justamente o que a identifica.
    const gEstipe = new THREE.CylinderGeometry(0.052, 0.1, 4.2, 8)
    /**
     * A FRONDE VIRA UM ARCO DE DOIS SEGMENTOS, E NAO MAIS UMA LANCA RETA.
     *
     * Era isto o que sobrava de desordem, e a causa nao era mais o sorteio: era
     * a FORMA. Uma fronde reta saindo do apice num angulo fixo desenha um RAIO,
     * e cinco, sete, nove raios saindo do mesmo ponto formam uma estrela — ou um
     * guarda-sol. Palmeira nao tem raio. A fronde sai ERGUIDA, vira no meio e
     * desce pela ponta, e e esse arco, repetido igual pela coroa inteira, que
     * faz o chafariz que se reconhece de longe.
     *
     * Dois planos por fronde compram o arco por uma instancia a mais, e o preco
     * e baixo porque fronde e recorte por alfa: sem ordenacao por profundidade,
     * sem passe extra de cena.
     *
     * O QUE NAO PODE ACONTECER e cada segmento carregar a fronde inteira na
     * textura — dois desenhos completos em fila leem como duas frondes coladas
     * pela ponta. Entao cada segmento leva METADE do U: a base fica com 0–0,52
     * (foliolo curto, crescendo) e a ponta com 0,48–1 (foliolo longo, afinando
     * ate o apice). Os 4% de sobreposicao escondem a emenda.
     *
     * A proporcao 5:1 do raquis se mantem somando os dois: 2,40 de comprimento
     * por 0,46 de largura. Fronde pinada e LONGA E ESTREITA — com 2:1 ela le
     * como folha de bananeira, que e outra planta.
     */
    const metadeDoU = (g: THREE.PlaneGeometry, de: number, ate: number) => {
      const uv = g.getAttribute('uv') as THREE.BufferAttribute
      for (let i = 0; i < uv.count; i++) uv.setX(i, de + uv.getX(i) * (ate - de))
      uv.needsUpdate = true
      return g
    }
    const COMP_BASE = 1.24
    const COMP_PONTA = 1.16
    const gFrondeBase = metadeDoU(new THREE.PlaneGeometry(COMP_BASE, 0.46), 0, 0.52)
    // Mesma largura da base, e nao menor: o afinamento da fronde ja esta na
    // textura (o foliolo encurta ate sumir no ultimo quinto). Estreitar tambem a
    // geometria colocava um degrau de 13% bem na emenda dos dois segmentos.
    const gFrondePonta = metadeDoU(new THREE.PlaneGeometry(COMP_PONTA, 0.45), 0.48, 1)
    // CAPITEL: a bainha lisa e verde no topo do estipe, de onde as frondes saem.
    // E ela que fecha o ponto de convergencia — sem ela os planos se cruzam no ar
    // e o olho ve a costura em vez da coroa.
    const gCapitel = new THREE.CylinderGeometry(0.062, 0.115, 0.66, 8)
    // FLOR. Um tufo minusculo: a essa distancia flor nao tem petala, tem MANCHA.
    // FLOR PEQUENA. A 0,08 com escala 1,3 ela virava uma bola de 10 cm — a essa
    // distancia isso e uma BOLHA, nao uma flor. Florada de verdade se le como
    // pontilhado fino de cor, nunca como esfera identificavel.
    const gFlor = new THREE.IcosahedronGeometry(0.042, 0)
    // Folha larga tropical: a mesma lanceolada, mas esticada na largura. E o
    // contraste de forma contra a graminea fina.
    const gFolhaLarga = new THREE.PlaneGeometry(0.26, 0.2)
    // Haste pendente, para a planta derramar sobre a borda da jardineira.
    const gPendente = new THREE.CylinderGeometry(0.008, 0.013, 0.42, 4)

    /**
     * O ESCRITÓRIO ENVIDRAÇADO — e ele SUBSTITUI a caixa de escada.
     *
     * A caixa era um prisma de concreto fechado, e o argumento para ela existir
     * era bom: sem uma porta, a cobertura vira cenário de teatro, porque a parte
     * que a câmera não vê não existe. Só que ela resolvia a lógica e custava a
     * composição — 3,2 × 2,5 m de concreto cego, sem uma única informação, bem
     * no terço esquerdo, que é onde a referência põe a coisa mais rica do quadro.
     *
     * O escritório faz as duas coisas ao mesmo tempo: continua sendo o volume por
     * onde se chega (a porta agora é de vidro, na própria fachada) e passa a ser
     * uma JANELA ACESA. Interior iluminado visto através de vidro é o gesto mais
     * forte que uma fachada tem ao entardecer, e a razão é de contraste: o quadro
     * inteiro está em meia-luz, e uma caixa quente e detalhada dentro dele vira o
     * ponto para onde o olho vai primeiro.
     *
     * TUDO POR ESCALA sobre uma caixa unitária. O coletor guarda a geometria da
     * PRIMEIRA chamada de cada chave e descarta as seguintes em silêncio — foi o
     * que produziu 23 prédios do tamanho do primeiro em `predio-cidade.tsx`. Um
     * volume que varia de tamanho é escala na matriz, nunca uma geometria nova.
     */
    const gCaixa = new THREE.BoxGeometry(1, 1, 1)
    const gPlanoEsc = new THREE.PlaneGeometry(1, 1)
    // MOBILIÁRIO. Peças pequenas e reconhecíveis: é o inventário que diz
    // "escritório" e não "sala iluminada".
    const gLivro = new THREE.BoxGeometry(0.036, 1, 0.15)
    const gMonitor = new THREE.BoxGeometry(0.58, 0.35, 0.018)
    const gPeMonitor = new THREE.BoxGeometry(0.06, 0.13, 0.05)
    const gBaseMonitor = new THREE.BoxGeometry(0.24, 0.014, 0.16)
    const gAssentoCad = new THREE.BoxGeometry(0.46, 0.08, 0.44)
    const gEncostoCad = new THREE.BoxGeometry(0.44, 0.54, 0.055)
    const gColunaCad = new THREE.CylinderGeometry(0.028, 0.028, 0.26, 8)
    const gEstrelaCad = new THREE.CylinderGeometry(0.25, 0.25, 0.026, 5)
    const gLuminaria = new THREE.CylinderGeometry(0.055, 0.085, 0.1, 10)
    const gFioLum = new THREE.CylinderGeometry(0.0025, 0.0025, 1, 4)
    const gArandela = new THREE.BoxGeometry(0.26, 0.09, 0.11)
    // Junta de dilatacao: o sulco vertical que corta toda parede longa de
    // concreto. Parede de 30 m sem junta nao existe — ela racharia sozinha.
    const gJuntaParede = new THREE.BoxGeometry(0.035, 3.2, 0.04)
    // Chapim do parapeito: a pedra de arremate que corre no topo dele, sempre um
    // pouco mais larga, para a agua pingar longe da fachada.
    const gChapim = new THREE.BoxGeometry(1, 0.045, 0.33)
    const gTorneiraJardim = new THREE.CylinderGeometry(0.016, 0.016, 0.16, 6)

    // LUZ PRATICA: as pecas que ACENDEM. Ver o bloco de uso.
    const gBalizador = new THREE.CylinderGeometry(0.045, 0.045, 0.012, 10)
    const gFacho = new THREE.PlaneGeometry(0.5, 1.5)
    const gFitaLed = new THREE.BoxGeometry(1, 0.03, 0.03)
    // Folha de oliveira e LANCEOLADA: estreita e comprida, quase uma lamina.
    // O quad e mais LARGO que a folha: o recorte por alfa come as pontas, entao a
    // folha util fica com cerca de 55% da area. A geometria compensa a diferenca.
    // FOLHA MAIOR QUE O RAMINHO QUE A SUSTENTA. A 0,21 x 0,075 ela era um ponto
    // ao longo de um galho de meio metro, e o que se via de perto era GALHO com
    // uns pontinhos verdes — copa de arvore seca. Numa oliveira de verdade a
    // folhagem esconde o ramo quase inteiro; o ramo so aparece nos vaos.
    const gFolhaOliva = new THREE.PlaneGeometry(0.3, 0.115)

    // O GUARDA-SOL SAIU INTEIRO — lona em `Lathe` com caimento, mastro, varetas,
    // cubo, ponteira, babado e base de concreto. Ver o bloco de uso para o
    // porquê. As sete geometrias e o material dele saem junto: geometria que
    // ninguém instancia não economiza nada e cobra atenção de quem vier depois.

    // VASO. Tronco de cone com BORDA — é a borda que o olho lê como vaso.
    const perfilVaso = [
      new THREE.Vector2(0.3, 0.0),
      new THREE.Vector2(0.31, 0.03),
      new THREE.Vector2(0.37, 0.34),
      new THREE.Vector2(0.42, 0.62),
      new THREE.Vector2(0.46, 0.66),
      new THREE.Vector2(0.46, 0.72),
      new THREE.Vector2(0.42, 0.72),
      new THREE.Vector2(0.4, 0.68),
      new THREE.Vector2(0.38, 0.66),
    ]
    const gVasoAlto = new THREE.LatheGeometry(perfilVaso, 18)
    const gTerra = new THREE.CircleGeometry(0.38, 16)

    // ÁRVORE. Tronco CÔNICO, galhos e copa de muitos tufos facetados. O
    // icosaedro sem subdivisão é melhor que esfera aqui: a faceta lê como massa
    // de folhagem, a esfera lisa lê como bola.
    // OLIVEIRA. Tronco curto e grosso em relacao a copa — oliveira nao e alta,
    // e ampla. Tres deles saem da mesma base.
    // TRONCO DE ARVORE ADULTA. Oliveira de terraco chega facil a 4 m, e a
    // cobertura e CEU ABERTO — nada impede a copa de passar da linha do predio.
    // Arvore que termina abaixo do parapeito le como arbusto em vaso grande.
    const gTroncoOliva = new THREE.CylinderGeometry(0.07, 0.13, 2.4, 7)
    const gGalhoOliva = new THREE.CylinderGeometry(0.022, 0.05, 0.8, 5)
    // Tufo PEQUENO: a copa aberta precisa de muitos pequenos, nao poucos grandes.
    const gTufoOliva = new THREE.IcosahedronGeometry(0.27, 0)
    // BUXO: subdividido uma vez. Arbusto APARADO e liso — a faceta grossa que
    // serve para folhagem solta aqui contaria a historia errada.
    // GRAMINEA: lamina de 3 cm, escalada em Y por muda. Caixa e nao folha
    // modelada porque a 37 px/m ela ocupa pouco mais de um pixel.
    const gLamina = new THREE.BoxGeometry(0.03, 1, 0.007)
    // AGAVE: cone de 4 lados = folha rigida que afina ate a ponta.
    // JARDINEIRA LINEAR de corten — calha corrida, nao vaso pontual.
    const gJardineira = new RoundedBoxGeometry(3.4, 0.54, 0.8, 1, 0.018)

    // BAR. Tampo em BALANÇO sobre o balcão (a sombra fina embaixo do tampo é o
    // que dá espessura ao móvel) e apoio de pé em tubo.
    const gBalcao = new RoundedBoxGeometry(4.6, 1.0, 0.7, 1, 0.02)
    const gTampo = new RoundedBoxGeometry(5.0, 0.09, 0.96, 1, 0.014)
    const gPrateleira = new THREE.BoxGeometry(4.3, 0.045, 0.26)
    const gGarrafa = new THREE.CylinderGeometry(0.037, 0.043, 0.3, 8)
    const gApoioPe = new THREE.CylinderGeometry(0.026, 0.026, 4.4, 8)
    const gAssentoBanqueta = new THREE.CylinderGeometry(0.21, 0.2, 0.09, 14)
    const gPernaBanqueta = new THREE.CylinderGeometry(0.026, 0.034, 0.72, 8)

    // GUARDA-CORPO. Montante achatado (perfil de chapa, não pau quadrado) e
    // os ESPAÇADORES que prendem o vidro — é a ferragem que dá escala.
    const gMontanteVidro = new THREE.BoxGeometry(0.026, 0.9, 0.045)
    const gEspacador = new THREE.CylinderGeometry(0.019, 0.019, 0.05, 10)
    // Chapa de base do montante, parafusada no deck. Nenhum guarda-corpo brota
    // do piso: ele e aparafusado, e a chapa e a prova disso.
    const gChapaBase = new THREE.BoxGeometry(0.12, 0.014, 0.12)
    // Rodape de borda do deck: a tabua de acabamento que fecha a topeira das
    // reguas. Sem ela o deck termina mostrando o corte da madeira.
    const gRodapeDeck = new THREE.BoxGeometry(0.03, 0.055, 1)
    // Ralo do deck, em grelha.
    const gRalo = new THREE.BoxGeometry(0.26, 0.012, 0.26)
    const gBarraRalo = new THREE.BoxGeometry(0.018, 0.016, 0.24)
    // PISCINA: corrimao de escada em U invertido, e a faixa de pastilha da linha
    // d'agua — as duas coisas que nenhuma piscina deixa de ter.
    const gCorrimaoEscada = new THREE.TorusGeometry(0.18, 0.019, 6, 12, Math.PI)
    const gHasteEscada = new THREE.CylinderGeometry(0.019, 0.019, 0.52, 8)
    const gDegrauSubmerso = new THREE.BoxGeometry(1.5, 0.06, 0.34)
    // Copo de bar, e um copo virado de boca para baixo no balcao e o sinal
    // universal de bar aberto e limpo.
    const gCopo = new THREE.CylinderGeometry(0.031, 0.026, 0.11, 8)
    const gTorneira = new THREE.CylinderGeometry(0.022, 0.022, 0.26, 8)
    const gSombra = new THREE.PlaneGeometry(1, 1)

    // ── materiais ─────────────────────────────────────────────────────────
    // Cor BRANCA no material sempre que houver `instanceColor`: a cor da cópia
    // multiplica a do material, então branco faz da cópia a cor final.
    const mDeck = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.86,
      ...madeira,
    })
    const mMadeiraEscura = new THREE.MeshStandardMaterial({
      color: '#6b4a2e',
      roughness: 0.82,
      map: madeira.map,
      normalMap: madeira.normalMap,
      roughnessMap: madeira.roughnessMap,
    })
    // Alumínio ESCOVADO, não polido: rugosidade 0,34 quebra o reflexo em vez de
    // devolver o céu inteiro. Metal polido numa cena com uma luz só vira mancha.
    const mMetal = new THREE.MeshStandardMaterial({
      color: '#c9c6bf',
      metalness: 0.88,
      roughness: 0.34,
    })
    // Lampada: emissivo moderado + `toneMapped: false` para o vidro nao ser
    // comido pela curva de exposicao do fim de tarde.
    const mLampada = new THREE.MeshStandardMaterial({
      color: '#ffd9a0',
      emissive: new THREE.Color('#ffcf8a'),
      emissiveIntensity: 2.6,
      roughness: 0.25,
      toneMapped: false,
    })
    const mFio = new THREE.MeshStandardMaterial({ color: '#26221e', roughness: 0.9 })
    const mAco = new THREE.MeshStandardMaterial({ color: '#8f8b84', metalness: 0.9, roughness: 0.42 })
    const mVaso = new THREE.MeshStandardMaterial({
      color: '#a89c86',
      roughness: 0.94,
      side: THREE.DoubleSide,
      map: pedra.map,
      normalMap: pedra.normalMap,
      roughnessMap: pedra.roughnessMap,
    })
    const mTerra = new THREE.MeshStandardMaterial({ color: '#3f3227', roughness: 0.99 })
    /**
     * FOLHAGEM DE DUAS FACES. Folha orientada ao acaso mostra o verso metade do
     * tempo; com face unica, metade da copa sumiria.
     *
     * Sem `flatShading`, ao contrario do resto: um plano tem uma normal so, e
     * achatar o sombreamento dele nao muda nada. Quem faz a variacao aqui e a
     * ORIENTACAO de cada folha, nao a faceta da malha.
     */
    const mFolha = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.84,
      side: THREE.DoubleSide,
      map: recorteDeFolha.mapa,
      alphaMap: recorteDeFolha.alfa,
      /**
       * A QUILHA E A CUTÍCULA. Até aqui a folha era papel recortado: sem relevo,
       * toda folha virada para o mesmo lado recebia a mesma luz, e a copa inteira
       * vinha num verde só. O mapa de normal dobra a folha ao longo da nervura e
       * o de rugosidade faz o brilho correr em faixas entre as nervuras — é o
       * reflexo que diz ao olho que a folha está viva e úmida.
       *
       * `normalScale` baixo porque a peça é PEQUENA na tela: relevo forte numa
       * folha de doze pixels vira ruído cintilante, não volume.
       */
      normalMap: recorteDeFolha.normal,
      normalScale: new THREE.Vector2(0.6, 0.6),
      roughnessMap: recorteDeFolha.rugosidade,
      // 0,45 e nao 0,5: com anisotropia e mipmap, a borda da folha desbota nos
      // niveis distantes e um limiar alto COME a folha inteira ao longe — a copa
      // rareia sozinha conforme a camera se afasta, que e um defeito sutil e
      // dificil de diagnosticar depois.
      alphaTest: 0.45,
      /**
       * EMISSIVO BAIXO = TRANSLUCIDEZ FINGIDA.
       *
       * Folha e fina e deixa luz PASSAR: em contraluz, a que esta entre o sol e
       * o olho acende por tras, e esse verde iluminado por transmissao e a
       * assinatura de folhagem ao fim da tarde. O three nao faz transmissao em
       * material padrao, e ligar transmissao de verdade custaria um passe de
       * cena inteiro — o mesmo que ja cortei duas vezes nesta feature.
       *
       * Um emissivo fraco na cor da folha faz o suficiente: as faces em sombra
       * param de cair para o preto e ficam num verde luminoso. Nao e fisica, e
       * a leitura certa pelo preco de zero passes.
       */
      emissive: new THREE.Color('#4a6b32'),
      emissiveIntensity: 0.22,
    })
    /**
     * A FOLHA LARGA GANHA MATERIAL PRÓPRIO, com o recorte ovalado e a nervação
     * palmada. Antes ela era a lanceolada esmagada num plano 1,3:1 — o que dava
     * uma pá, não uma folha.
     *
     * Emissivo um pouco mais alto que o da lanceolada de propósito: folha larga
     * de planta tropical é mais FINA e translúcida que folha de oliveira, que é
     * dura e cerosa. Em contraluz ela acende mais.
     */
    const mFolhaLarga = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.78,
      side: THREE.DoubleSide,
      map: recorteDeFolhaLarga.mapa,
      alphaMap: recorteDeFolhaLarga.alfa,
      normalMap: recorteDeFolhaLarga.normal,
      normalScale: new THREE.Vector2(0.6, 0.6),
      roughnessMap: recorteDeFolhaLarga.rugosidade,
      alphaTest: 0.45,
      emissive: new THREE.Color('#4a6b32'),
      emissiveIntensity: 0.28,
    })
    // Madeira de oliveira e CLARA e acinzentada, nao marrom escura.
    // Nucleo da copa: solido e fosco, so para dar massa escura atras das folhas.
    // FRONDE: mesmo recorte por alfa da folha, com a silhueta pinada propria.
    const mFronde = new THREE.MeshStandardMaterial({
      // Verde de verdade e nao branco: o mapa ja e claro, e multiplicado por
      // branco a fronde saia lavada — palmeira ao contraluz e ESCURA com a borda
      // acesa, nunca uma pena palida.
      color: '#7d9163',
      roughness: 0.86,
      side: THREE.DoubleSide,
      map: recorteDeFronde.mapa,
      alphaMap: recorteDeFronde.alfa,
      // O ráquis é roliço e os folíolos são lâminas penduradas nele: o relevo
      // existe quase só na haste central, e é ela que passa a pegar o sol de
      // raspão e separar a fronde da que está atrás.
      normalMap: recorteDeFronde.normal,
      normalScale: new THREE.Vector2(0.7, 0.7),
      roughnessMap: recorteDeFronde.rugosidade,
      alphaTest: 0.4,
      emissive: new THREE.Color('#42632c'),
      emissiveIntensity: 0.16,
    })
    // A água PARADA da calha da cascata: quase lisa e com reflexo do ambiente
    // alto, porque a única coisa que a faz ler como água a essa distância é
    // devolver o céu. Escura porque a calha é funda e está na sombra da parede.
    const mAguaParada = new THREE.MeshStandardMaterial({
      color: '#2b6b7a',
      roughness: 0.1,
      metalness: 0.1,
      envMapIntensity: 1.4,
    })
    // Capitel: solido, sem recorte. Verde mais frio que a fronde porque e bainha
    // lisa e cerosa, nao lamina — ela reflete o ceu em vez de acender por tras.
    const mCapitel = new THREE.MeshStandardMaterial({ color: '#6d8152', roughness: 0.72 })
    // FLOR. Quase sem rugosidade e com emissivo proprio: petala e fina e
    // translucida, e numa cena em contraluz ela e a coisa que mais acende.
    const mFlor = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.68,
      flatShading: true,
      emissiveIntensity: 0.3,
      emissive: new THREE.Color('#5a2038'),
    })
    const mFolhaSolida = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.95,
      flatShading: true,
    })
    /**
     * Era o material da caixa de escada. Sobreviveu a ela porque a LAJE do
     * escritório pede exatamente isto: concreto aparente com poro e mancha. Uma
     * laje em balanço é a peça mais bruta do conjunto — ela contrasta com o vidro
     * e com o caixilho pintado, e é desse contraste que a caixa de vidro tira a
     * aparência de construção em vez de maquete.
     */
    const mParedeConcreto = new THREE.MeshStandardMaterial({
      color: '#bcae97',
      roughness: 0.95,
      map: pedra.map,
      normalMap: pedra.normalMap,
      roughnessMap: pedra.roughnessMap,
    })
    const mJunta = new THREE.MeshStandardMaterial({ color: '#7d715f', roughness: 0.98 })
    /**
     * CASCA DE VERDADE, E NÃO MAIS O GRÃO DA RÉGUA DE DECK.
     *
     * O comentário que estava aqui defendia o reaproveitamento assim: "grão
     * correndo no comprimento e nós esparsos é exatamente o que casca tem". É
     * falso, e é o tipo de justificativa que se escreve quando já se decidiu
     * economizar. Régua de deck é madeira SERRADA — a serra atravessou os anéis
     * e deixou veio liso, paralelo e contínuo. Casca é o lado de fora da árvore
     * e faz o oposto: RACHA, porque o tronco engrossa por dentro e a camada
     * externa já é tecido morto. Veio contínuo contra fissura interrompida é a
     * diferença entre um poste torneado e uma árvore.
     *
     * Agora são duas cascas, porque as duas árvores não têm nada em comum — a
     * oliveira racha em espiral, e a palmeira não racha: ela guarda as cicatrizes
     * anelares das frondes que caíram. Ver `casca()` em `predio-materiais.ts`.
     *
     * A repetição é apertada em V (o tronco é alto e fino) e quase solta em U (a
     * circunferência é meio metro), que é o que mantém a fissura na escala de um
     * tronco em vez de na de uma tábua.
     */
    const cascaOliva = casca('oliveira')
    const troncoOliva = comRepeticao(cascaOliva, 1.2, 4)
    const galhoOliva = comRepeticao(cascaOliva, 0.55, 1.6)
    const mCascaOliva = new THREE.MeshStandardMaterial({
      color: '#8d8578',
      roughness: 0.97,
      map: troncoOliva.map,
      normalMap: troncoOliva.normalMap,
      roughnessMap: troncoOliva.roughnessMap,
    })
    const mGalhoOliva = new THREE.MeshStandardMaterial({
      color: '#83796c',
      roughness: 0.97,
      map: galhoOliva.map,
      normalMap: galhoOliva.normalMap,
      roughnessMap: galhoOliva.roughnessMap,
    })
    // ESTIPE: repetição 6 em V sobre 4,2 m de altura, com 10 anéis por ladrilho —
    // dá um anel a cada 7 cm, que é o passo real de uma palmeira adulta. Anel
    // espaçado demais lê como bambu; junto demais, como rosca de parafuso.
    const cascaPalmeira = comRepeticao(casca('palmeira'), 1, 6)
    const mEstipe = new THREE.MeshStandardMaterial({
      color: '#978d78',
      roughness: 0.93,
      map: cascaPalmeira.map,
      normalMap: cascaPalmeira.normalMap,
      roughnessMap: cascaPalmeira.roughnessMap,
    })
    // Buxo: verde profundo e FOSCO, sem faceta. Contraponto da gramineea.
    // Agave: verde-azulado com cera — a folha tem brilho, ao contrario das outras.
    // Graminea: branca no material, cor na instancia, e DUPLA FACE porque a
    // lamina e fina o bastante para a camera ver o verso dela o tempo todo.
    // A DOBRA EM V vem do mapa de normal, e é ela que separa gramínea de palha:
    // sem relevo, a lâmina recebe um valor único do topo à base e a touceira lê
    // como feixe de varetas. Ver `graminea()` em `predio-materiais.ts`.
    const laminaViva = graminea()
    const mGramineaMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.82,
      side: THREE.DoubleSide,
      map: laminaViva.map,
      normalMap: laminaViva.normalMap,
      roughnessMap: laminaViva.roughnessMap,
    })
    // CORTEN: aco que enferruja de proposito e para. Ferrugem tem textura, entao
    // reaproveita o relevo do concreto — poro e mancha servem aos dois.
    const mCorten = new THREE.MeshStandardMaterial({
      color: '#7d4a30',
      roughness: 0.88,
      metalness: 0.22,
      map: pedra.map,
      normalMap: pedra.normalMap,
      roughnessMap: pedra.roughnessMap,
    })
    const mPedra = new THREE.MeshStandardMaterial({
      color: '#cfc4ad',
      roughness: 0.8,
      map: pedra.map,
      normalMap: pedra.normalMap,
      roughnessMap: pedra.roughnessMap,
    })
    const mVidroGarrafa = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.16,
      metalness: 0.1,
      transparent: true,
      opacity: 0.82,
    })
    // Toalha: listrada nao da para desenhar sem outra textura, mas a COR fria
    // no meio de um deck ambar ja faz o trabalho — e pano de praia raramente e
    // da cor da mobilia.
    /**
     * ═══ A LUZ PRATICA ═══
     *
     * E o que separa esta cena da referencia, e nao e detalhe: e TOM.
     *
     * A cobertura estava toda no mesmo valor — parede, deck, parapeito, vaso e
     * pergolado todos no mesmo bege-marrom, todos iluminados pela mesma luz
     * difusa. Superficie sem diferenca de valor nao tem profundidade, e nenhuma
     * quantidade de geometria conserta isso: o olho separa planos por CONTRASTE
     * antes de separar por forma.
     *
     * Luz pratica resolve porque ela cria valor LOCAL. Um balizador acende meio
     * metro de deck e deixa o resto na penumbra; uma fita sob o balcao desenha a
     * linha do movel; um facho na parede faz um leque claro num plano que era
     * chapado. Cada ponto desses e uma ancora de brilho, e e entre as ancoras que
     * a escuridao vira profundidade em vez de falta de informacao.
     *
     * Fora da curva de tom em tudo que acende: a exposicao ACES existe
     * para domar o alto da cena, e fonte de luz e justamente o que nao deve ser
     * domado — senao o balizador vira um cinza claro e perde a razao de existir.
     */
    const mBalizador = new THREE.MeshBasicMaterial({ color: '#ffd9a0', toneMapped: false })
    // O FACHO e um plano com degrade de alfa, nao um cone de volume: volumetrico
    // de verdade custa um passe, e a essa distancia o leque de luz na parede le
    // igual por um quad com mapa de alfa.
    const mFacho = new THREE.MeshBasicMaterial({
      color: '#ffc98a',
      transparent: true,
      // 0,75 e nao 0,3: mistura ADITIVA soma ao que ja esta la, e a parede de
      // concreto nao e escura. Com 0,3 a soma cabia dentro do ruido da textura e
      // o facho simplesmente nao aparecia.
      opacity: 0.75,
      alphaMap: manchaDeSombra(),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
    const mFitaLed = new THREE.MeshBasicMaterial({ color: '#ffdca8', toneMapped: false })
    // A fita da cascata é FRIA, e a do bar é quente. São as duas únicas linhas
    // acesas do terraço, e se tivessem a mesma cor o olho leria as duas como a
    // mesma instalação. Luz de água puxa o turquesa; luz de balcão, o âmbar.
    const mFitaAgua = new THREE.MeshBasicMaterial({ color: '#7fe3f2', toneMapped: false })
    /**
     * OS MATERIAIS DO ESCRITÓRIO, e o que decide todos eles é uma restrição:
     * o sol está ATRÁS do prédio (azimute 152°), então nenhuma luz direta entra
     * ali. O interior seria preto se dependesse da cena.
     *
     * Quem acende é `mEscLuz` — emissivo, não uma luz. O three não emite luz de
     * material emissivo, e é bom que não emita: uma parede inteira virando fonte
     * custaria caro e daria uma lavagem chapada. O que o emissivo faz é APARECER
     * aceso, e é disso que a leitura precisa. A iluminação de verdade das peças
     * vem de uma `pointLight` só, no bloco JSX, que é o que dá volume ao móvel e
     * derrama na madeira do deck lá fora.
     *
     * `toneMapped: false` nas peças que ACENDEM (tela, luminária, fita): elas
     * têm de furar o ACES e chegar ao branco. Passadas pelo tone mapping, o
     * ponto mais quente da cena vira o mesmo bege de tudo.
     */
    const mEscParede = new THREE.MeshStandardMaterial({ color: '#cbbda6', roughness: 0.94 })
    // O nicho do bar é ÂMBAR BAIXO, e não a luz de trabalho do escritório. São
    // dois lugares acesos no mesmo quadro, e se tivessem a mesma temperatura eles
    // leriam como a mesma coisa repetida — a diferença de cor é o que diz que um
    // é uma sala e o outro é um balcão.
    const mBarNicho = new THREE.MeshStandardMaterial({
      color: '#a8712f',
      roughness: 1,
      emissive: new THREE.Color('#ff9a3c'),
      emissiveIntensity: 1.5,
    })
    const mEscLuz = new THREE.MeshStandardMaterial({
      color: '#e8c79a',
      roughness: 1,
      emissive: new THREE.Color('#ffb968'),
      // 1,1 e não 3: este painel tem 5 m² e fica atrás de tudo. Alto demais ele
      // estoura e o mobiliário na frente vira silhueta preta recortada — que é o
      // erro clássico de quem ilumina interior por trás.
      emissiveIntensity: 1.1,
    })
    const mEscPiso = new THREE.MeshStandardMaterial({ color: '#8a6a45', roughness: 0.6 })
    const mEscTapete = new THREE.MeshStandardMaterial({ color: '#6d6152', roughness: 0.98 })
    const mCaixilho = new THREE.MeshStandardMaterial({
      color: '#2a2724',
      roughness: 0.42,
      metalness: 0.55,
    })
    const mEstofado = new THREE.MeshStandardMaterial({ color: '#3b3a38', roughness: 0.9 })
    const mTela = new THREE.MeshBasicMaterial({ color: '#cfe0ee', toneMapped: false })
    const mLuminaria = new THREE.MeshBasicMaterial({ color: '#ffd9a4', toneMapped: false })
    // A lombada do livro é o único lugar da cena onde cor saturada em quantidade
    // é bem-vinda: estante monocromática lê como cenografia de loja.
    const TONS_DE_LIVRO = [
      '#8a3b2e', '#2f4a63', '#6b6a3a', '#7d4f2a', '#3f5a48',
      '#a8794a', '#4a3b5c', '#93392f', '#5c6b7a', '#7a6340',
    ].map((c) => new THREE.Color(c))
    const mSombra = new THREE.MeshBasicMaterial({
      color: '#4a3524',
      transparent: true,
      opacity: 0.36,
      alphaMap: manchaDeSombra(),
      depthWrite: false,
    })

    const TONS_DE_DECK = ['#b0804f', '#a2753f', '#b98a5b', '#9a6d3c', '#ab7c4a', '#c0915f'].map(
      (c) => new THREE.Color(c),
    )
    // Folhagem com cinco verdes. Copa de UM verde só é o segundo tell mais forte
    // de árvore renderizada — folha real varia com idade, sol e sombra própria.
    // OLIVEIRA: cinza-esverdeado PRATEADO, nao verde folha. E a cor que a
    // identifica a distancia — a face de baixo da folha e quase branca, e e ela
    // que o vento vira para cima. Verde-escuro aqui seria outra arvore.
    // Trepadeira: verde ESCURO e saturado. A oliveira e prateada; se as duas
    // tivessem o mesmo verde, o pergolado e a copa virariam uma mancha so.
    /**
     * A FAIXA CLARA E SALVIA ILUMINADA, NAO NEVE. A primeira paleta bimodal poe
     * duas entradas quase brancas e a copa saiu parecendo florada — o contraste
     * estava certo, o VALOR nao. Folha de oliveira em contraluz chega a um verde
     * palido acinzentado, nunca ao branco: o que e branco numa foto de arvore e
     * o ceu aparecendo pelos vaos, e disso a copa aberta ja cuida sozinha.
     *
     * Quatro escuras contra duas claras, e nao tres a tres — a copa tem de ter
     * PESO, e peso vem do lado escuro.
     */
    const TONS_DE_OLIVA = ['#5f7361', '#6e8168', '#aab89b', '#7d8e74', '#c0cbae', '#8d9c85'].map(
      (c) => new THREE.Color(c),
    )
    // GRAMINEA em contraluz: palha dourada, nao verde. A lamina seca da ponta e
    // a que pega o sol de fim de tarde, e e por isso que graminea e a unica
    // vegetacao que ACENDE quando o sol esta atras dela.
    // Metade PALHA, metade VERDE. So palha lia como mato seco; graminea viva tem
    // a base verde e a ponta dourada, e e a mistura das duas que da o efeito de
    // contraluz em vez de campo queimado.
    /**
     * AS FLORES SAO A UNICA COR NAO-VERDE DO JARDIM, e por isso elas pesam muito
     * mais do que o numero delas sugere.
     *
     * Um jardim so de verde le como massa, por mais especies que tenha — o olho
     * agrupa tudo no mesmo balde. Basta um punhado de magenta e branco para cada
     * moita virar uma moita DISTINTA, porque a cor e o que separa. E magenta e
     * branco nao sao escolha arbitraria: sao as duas cores de florada que mais
     * aparecem em cobertura (buganvile e jasmim), justamente por aguentarem sol
     * direto e vento.
     */
    const TONS_DE_FLOR = ['#c4477e', '#d9639b', '#f2e6ea', '#a8386a', '#ffffff', '#e08ab4'].map(
      (c) => new THREE.Color(c),
    )
    const TONS_DE_GRAMINEA = ['#c2ab72', '#7f8b52', '#d4c088', '#6d7c46', '#b9a86a', '#8c9558'].map(
      (c) => new THREE.Color(c),
    )
    const TONS_DE_GARRAFA = ['#3f5f3a', '#6b4326', '#2f4a5e', '#7a6a3a', '#53304a'].map(
      (c) => new THREE.Color(c),
    )

    const fiosDoVaral: THREE.BufferGeometry[] = []

    const sombra = (x: number, z: number, larg: number, profund: number) =>
      col.poe(
        'sombra',
        gSombra,
        mSombra,
        [x, piso + 0.024, z],
        [-Math.PI / 2, 0, 0],
        [larg, profund, 1],
      )

    // ── profundidades ─────────────────────────────────────────────────────
    /**
     * AS ESPREGUIÇADEIRAS ESTAVAM DENTRO DA PISCINA — literalmente, e ninguém viu
     * enquanto a fila era larga.
     *
     * Com `prof × 0,1` elas ficavam em z = −3,60 e, tendo 1,98 m de comprimento,
     * ocupavam de −4,59 a −2,61. A borda da piscina começa em −3,20. Ou seja: o
     * terço de trás de cada peça ficava submerso. Enquanto a fila ia de −8,4 a
     * 8,4, só as duas do meio caíam sobre a lâmina e o defeito passava por
     * sobreposição de perspectiva; quando a fila encolheu para o vão da piscina,
     * as QUATRO passaram a pisar na água e a lâmina sumiu atrás delas.
     *
     * `prof × 0,235` põe o eixo em −1,84, e o pior caso do sorteio de z (−0,275)
     * deixa a borda de trás em −3,11: nove centímetros à frente da pedra. Elas
     * passam a ocupar a faixa de deck ENTRE a piscina e o guarda-corpo, que é o
     * lugar onde espreguiçadeira fica numa cobertura de verdade — e a lâmina
     * volta a aparecer inteira por cima delas, que é o que o dono pediu.
     */
    const zPergolaFrente = zCentro - prof * 0.02
    const zPergolaFundo = zCentro - prof * 0.26
    const zBar = zCentro - prof * 0.208
    const zArvores = zCentro - prof * 0.277
    const zCanteiro = zCentro - prof * 0.4
    const zGuarda = zCentro + prof * 0.4
    const piscina = piscinaZ(zCentro, prof)
    // Face interna da parede do andar: é nela que a cascata corre, e é ela que
    // fecha o escritório por trás. Um número só para as duas coisas.
    const zParedeFundo = zDaParedeDoAndar(zCentro, prof)
    /**
     * A ESCADA FOI PARAR NO MEIO DA ÁGUA, e fui eu que a levei para lá.
     *
     * Ela estava em `zEspelhoLocal + 0,5`, e `zEspelhoLocal` era um número fixo
     * (`zCentro − prof × 0,03`) que por acaso caía perto da borda. Quando a
     * piscina passou a ser derivada de `piscinaZ()` e cresceu 2,28 m para a
     * frente, o CENTRO dela andou junto — e a escada, amarrada ao centro, foi
     * junto para o miolo do tanque. Dois corrimãos em U brotando do meio da
     * lâmina, sem borda por perto.
     *
     * Escada de piscina não tem relação nenhuma com o centro: ela é um objeto de
     * BORDA. Amarrada a `piscina.frente`, ela fica onde estiver a borda, hoje e
     * quando a piscina mudar de novo.
     */
    const zDaEscada = piscina.frente - 0.35

    // ── deck ──────────────────────────────────────────────────────────────
    const ripas = Math.floor((meiaLargura * 2) / 0.24)
    for (let i = 0; i < ripas; i++)
      col.poe(
        'ripa',
        gRipa,
        mDeck,
        [-meiaLargura + 0.12 + i * 0.24, piso + 0.014, zCentro],
        [0, 0, 0],
        [1, 1, 1],
        // Sequência irregular: `i % 6` daria um padrão que o olho pega em dois
        // segundos e lê como ladrilho, não como madeira.
        TONS_DE_DECK[(i * 5 + ((i * i) % 7)) % TONS_DE_DECK.length]!,
      )

    // ACABAMENTO DO DECK: rodape na topeira e ralo. A regua termina mostrando o
    // corte da madeira, e madeira de topo nao se deixa exposta ao tempo — e por
    // onde a agua entra. A tabua de acabamento e obrigatoria na obra e e ela que
    // fecha a linha do deck contra o parapeito.
    col.poe(
      'rodapeDeck',
      gRodapeDeck,
      mDeck,
      [0, piso + 0.03, zCentro + prof * 0.46],
      [0, Math.PI / 2, 0],
      [1, 1, meiaLargura * 2],
      TONS_DE_DECK[2]!,
    )
    // RALO. Laje de cobertura escoa agua, e o ralo e o unico objeto do piso que
    // prova isso. Fica no ponto baixo, perto da borda.
    for (const xr of [-6.2, 4.8]) {
      col.poe('ralo', gRalo, mAco, [xr, piso + 0.026, zCentro + prof * 0.345])
      for (let b = 0; b < 5; b++)
        col.poe('barraRalo', gBarraRalo, mAco, [xr - 0.1 + b * 0.05, piso + 0.032, zCentro + prof * 0.345])
    }

    // ── pergolado ─────────────────────────────────────────────────────────
    const xPostes = [-8.4, -3.2, 2.0]
    for (const x of xPostes)
      for (const z of [zPergolaFrente, zPergolaFundo]) {
        sombra(x, z, 0.95, 0.95)
        col.poe('poste', gPoste, mMadeiraEscura, [x, piso + 1.45, z])
        // Chapa de aço parafusada no topo do poste, dos dois lados.
        for (const dz of [-0.09, 0.09]) {
          col.poe('chapa', gChapa, mAco, [x, piso + 2.74, z + dz])
          for (const dy of [-0.07, 0.07])
            col.poe('parafuso', gParafuso, mAco, [x, piso + 2.74 + dy, z + dz], [Math.PI / 2, 0, 0])
        }
        // MAO-FRANCESA: as duas diagonais que travam o no. Portico so com pecas
        // ortogonais e instavel de verdade, e o olho conhece isso sem saber que
        // conhece — pergolado sem contraventamento le como montagem provisoria.
        for (const lado of [-1, 1])
          col.poe(
            'maoFrancesa',
            gMaoFrancesa,
            mMadeiraEscura,
            [x + lado * 0.22, piso + 2.22, z],
            [0, lado * Math.PI / 2, lado * 0.785],
          )
      }
    for (const z of [zPergolaFrente, zPergolaFundo])
      col.poe('viga', gVigaPergola, mMadeiraEscura, [-3.2, piso + 2.8, z])
    for (let i = 0; i < 27; i++)
      col.poe('ripaPergola', gRipaPergola, mMadeiraEscura, [
        -8.3 + i * 0.46,
        piso + 2.93,
        (zPergolaFrente + zPergolaFundo) / 2,
      ])

    /**
     * VARAL DE LUZES sobre o pergolado — o detalhe que mais diz "cobertura de
     * empresa" com menos geometria.
     *
     * Resolve duas coisas de uma vez. A primeira é semântica: pergolado com
     * varal de lâmpada é o vocabulário de terraço que RECEBE gente, e a spec
     * pede que este andar diga "os negócios vão bem" sem escrever. A segunda é
     * de composição: são três linhas CURVAS atravessando uma região que só tinha
     * retas paralelas, e é a curva contra a reta que impede o pergolado de ler
     * como grade.
     *
     * As lâmpadas ficam com emissivo MODERADO de propósito. O sol ainda está
     * acima do horizonte, e varal estourado às cinco da tarde é erro de
     * continuidade — a essa hora ele mal se distingue, e é justamente esse
     * "acabaram de acender" que situa o horário.
     */
    const zsVaral = [zPergolaFrente, (zPergolaFrente + zPergolaFundo) / 2, zPergolaFundo]
    for (const [v, zv] of zsVaral.entries()) {
      const a = new THREE.Vector3(-8.4, piso + 2.86, zv)
      const b = new THREE.Vector3(2.0, piso + 2.86, zv)
      const flecha = 0.32 + v * 0.07
      const curva = new THREE.CatmullRomCurve3(catenaria(a, b, flecha, 16))
      fiosDoVaral.push(new THREE.TubeGeometry(curva, 34, 0.0085, 4, false))
      // As lâmpadas seguem a posição EXATA da curva. Interpoladas em linha reta
      // elas flutuariam acima da barriga do fio no meio do vão — que é o erro
      // clássico de varal desenhado.
      for (const [i, pt] of catenaria(a, b, flecha, 21).entries()) {
        if (i === 0 || i === 21) continue
        col.poe('soquete', gSoquete, mAco, [pt.x, pt.y - 0.042, pt.z])
        col.poe('lampada', gLampada, mLampada, [pt.x, pt.y - 0.1, pt.z])
      }
    }

    /**
     * -- espreguicadeiras: NENHUMA ------------------------------------------
     *
     * Eram seis, viraram quatro e agora saem inteiras, a pedido do dono, junto
     * com a estrutura tubular, os gomos de assento e encosto, o travesseiro e as
     * toalhas. Registro por que, porque a peca acabara de ser consertada e
     * alguem pode querer traze-la de volta.
     *
     * O terraco tem pouco mais de tres metros de deck entre a piscina e o
     * guarda-corpo, e uma espreguicadeira tem 1,98 m mais o sorteio de posicao.
     * Ela CABE, e nunca coube confortavelmente: foi o que empurrou a fila para
     * dentro da agua na primeira arrumacao, e o que obrigou a encolher o
     * deslocamento da "fora da fila" de 0,5 para 0,28 na segunda. Com a lamina
     * avancando a pedido do dono, a faixa apertou de vez.
     *
     * A troca e boa. A piscina passa a ocupar a faixa inteira e o que se ve no
     * primeiro plano e agua, que e o que foi pedido. E as pecas que dizem
     * "alguem usa isto" continuam na cena: o varal aceso, o escritorio com a
     * cadeira torta e as tacas penduradas no bar.
     */

    /**
     * ── guarda-sóis: NENHUM ────────────────────────────────────────────────
     *
     * Eram dois, em 5,0 e 7,8. O de 7,8 saiu porque tapava o bar; o de 5,0 foi
     * para 2,0 e agora sai também, a pedido do dono.
     *
     * A peça em si estava certa — mastro, cubo, oito varetas, babado, base de
     * concreto. O problema é o que ela É: um disco OPACO de 3 m de diâmetro a
     * 2,3 m de altura, pendurado exatamente na faixa vertical onde vivem a
     * piscina, o pergolado e o miolo do jardim. Não existe posição boa para ele
     * neste quadro; existe só a posição que esconde menos.
     *
     * E o que se ganha não é só o vão: guarda-sol ABERTO ao entardecer é errado
     * de qualquer forma. Ninguém deixa a lona aberta depois do pôr do sol — e a
     * cena inteira está construída em cima dessa hora.
     *
     * Ficam sem uso `gMastro`, `gVareta`, `gPonteira`, `gCubo8`, `gBabado`,
     * `gBaseSol`, `gLona` e `mLonaSol`. Removidos junto: geometria que ninguém
     * instancia é peso de leitura para quem vier depois, não economia.
     */

    /**
     * ═══ O BAR, REFEITO COMO NICHO RETROILUMINADO ═══
     *
     * Ele existia inteiro — balcão, tampo, estante, 33 garrafas, copos, torneira,
     * banquetas, fita de LED — e no render lia como CERCA: uma sequência de
     * verticais coloridas finas sobre madeira escura, com gramínea aparecendo
     * entre elas. Nada errado no inventário; errado no que estava ATRÁS.
     *
     * Bar de verdade ao entardecer se lê por uma coisa só: a parede de garrafas
     * ACESA POR TRÁS. É a retroiluminação que transforma trinta cilindros em
     * trinta joias — o vidro colorido para de ser silhueta escura e vira filtro,
     * e cada garrafa passa a ter a cor dela em vez de marrom. Sem isso, garrafa
     * escura contra madeira escura é exatamente a cerca que apareceu.
     *
     * Então entram quatro peças, e as quatro servem à mesma leitura:
     *
     * 1. O FUNDO DO NICHO, emissivo, atrás de tudo.
     * 2. OS MONTANTES que dividem o nicho em baias — sem eles a chapa acesa é um
     *    retângulo laranja, e com eles vira marcenaria.
     * 3. A BANDEIRA sobre o balcão, com a face de baixo acesa: é ela que fecha o
     *    nicho por cima e dá ao bar um TETO próprio, que é o que o separa do
     *    terraço em vez de ele ser um móvel solto no meio dele.
     * 4. AS TAÇAS PENDURADAS de boca para baixo no trilho sob a bandeira.
     */
    const xBar = 9.0
    const LARG_BAR = 4.9
    sombra(xBar, zBar, 5.6, 2.0)
    // O nicho aceso, 6 cm atrás das prateleiras. A cor é mais quente e mais
    // escura que a do escritório de propósito: luz de bar é âmbar baixa, não a
    // luz de trabalho de uma sala.
    /**
     * A ESTANTE MACIÇA SAIU, e é isso que faz a retroiluminação existir.
     *
     * Havia uma `gEstante` de 4,6 × 1,9 × 0,32 em madeira escura logo atrás das
     * prateleiras. Eu pus o painel aceso ATRÁS dela, e o primeiro render mostrou
     * o resultado óbvio em retrospecto: um filete de luz escapando por cima e
     * trinta garrafas escuras contra madeira escura — a mesma cerca de antes,
     * agora com uma tarja laranja no topo.
     *
     * Nicho retroiluminado não tem marcenaria atrás das garrafas: o fundo É a
     * fonte. A estante era a peça que definia o volume, e quem assume esse papel
     * agora são os montantes e a bandeira, que ficam à FRENTE da luz e por isso
     * recortam contra ela em vez de tapá-la.
     *
     * A ordem em z passa a ser a regra inteira, e ela é curta: painel (−1,63),
     * montantes (−1,50), prateleiras e garrafas (−1,46). Errar essa pilha por
     * dois centímetros apaga o bar — é o mesmo tipo de erro que já engoliu a
     * lâmina da piscina duas vezes por y.
     */
    col.poe(
      'barNicho',
      gCaixa,
      mBarNicho,
      [xBar, piso + 1.18, zBar - 1.63],
      [0, 0, 0],
      [LARG_BAR, 1.98, 0.05],
    )
    // Montantes: cinco divisórias verticais recortando o nicho em quatro baias.
    // Sem eles a chapa acesa é um retângulo laranja; com eles, é marcenaria.
    for (let d = 0; d <= 4; d++)
      col.poe(
        'barMontante',
        gCaixa,
        mMadeiraEscura,
        [xBar - LARG_BAR / 2 + (d * LARG_BAR) / 4, piso + 1.18, zBar - 1.5],
        [0, 0, 0],
        [0.07, 1.98, 0.24],
      )
    col.poe('balcao', gBalcao, mMadeiraEscura, [xBar, piso + 0.5, zBar])
    col.poe('tampo', gTampo, mPedra, [xBar, piso + 1.05, zBar])
    /**
     * A BANDEIRA. Uma viga chata a 2,3 m, avançando sobre o balcão, com uma fita
     * de LED escondida na face de baixo. Duas coisas: ela dá ao bar um limite
     * superior próprio (móvel sem teto flutua no terraço) e a luz dela é a que
     * cai no tampo de pedra e no ombro de quem estaria sentado ali.
     */
    col.poe('barBandeira', gCaixa, mMadeiraEscura, [xBar, piso + 2.3, zBar - 0.45], [0, 0, 0], [LARG_BAR + 0.5, 0.26, 1.5])
    for (const s of [-1, 1])
      col.poe('barPilarBandeira', gCaixa, mMadeiraEscura, [xBar + s * (LARG_BAR / 2 + 0.2), piso + 1.15, zBar - 1.1], [0, 0, 0], [0.12, 2.3, 0.12])
    // Trilho de taças sob a bandeira, e as taças de boca para baixo nele. É o
    // objeto que ninguém sabe nomear e todo mundo reconhece como bar.
    col.poe('barTrilho', gCaixa, mMetal, [xBar, piso + 2.12, zBar - 0.25], [0, 0, 0], [LARG_BAR - 0.6, 0.03, 0.26])
    for (let t = 0; t < 12; t++)
      col.poe(
        'copo',
        gCopo,
        mVidroGarrafa,
        [xBar - LARG_BAR / 2 + 0.5 + t * 0.35, piso + 2.0, zBar - 0.25],
        [Math.PI, 0, 0],
        [1.15, 1.4, 1.15],
      )
    // Apoio de pé: o tubo baixo na frente do balcão. Ninguém sabe nomear, todo
    // mundo reconhece — é o que transforma "caixa" em "balcão de bar".
    col.poe('apoioPe', gApoioPe, mAco, [xBar, piso + 0.19, zBar + 0.42], [0, 0, Math.PI / 2])
    for (const y of [0.62, 1.12, 1.6]) {
      col.poe('prateleira', gPrateleira, mPedra, [xBar, piso + y, zBar - 1.46])
      for (let g = 0; g < 11; g++)
        col.poe(
          'garrafa',
          gGarrafa,
          mVidroGarrafa,
          [xBar - 1.9 + g * 0.38 + ruido(g, 41) * 0.1, piso + y + 0.17, zBar - 1.46],
          [0, 0, 0],
          [1, 0.8 + ruido(g, 42) * 0.55, 1],
          TONS_DE_GARRAFA[(g * 3 + Math.floor(y * 10)) % TONS_DE_GARRAFA.length]!,
        )
    }
    // COPARIA. Copo virado de boca para baixo no balcao e o sinal universal de
    // bar aberto e limpo — e sao tres objetos de oito lados cada um.
    for (let c = 0; c < 7; c++)
      col.poe('copo', gCopo, mVidroGarrafa, [xBar - 1.7 + c * 0.3, piso + 1.15, zBar - 0.18])
    col.poe('torneira', gTorneira, mMetal, [xBar + 1.8, piso + 1.22, zBar - 0.2])
    for (const x of [7.4, 8.4, 9.4, 10.4]) {
      col.poe('banqueta', gAssentoBanqueta, mMadeiraEscura, [x, piso + 0.76, zBar + 0.85])
      col.poe('pernaBanqueta', gPernaBanqueta, mMetal, [x, piso + 0.38, zBar + 0.85])
    }

    /**
     * ═══ A VEGETAÇÃO, REFEITA COM O VOCABULÁRIO DE COBERTURA CONTEMPORÂNEA ═══
     *
     * O que estava aqui era "planta genérica": tronco reto, copa de esferas verde
     * floresta, vasinhos redondos em fila. Isso não é paisagismo de cobertura —
     * é o verde que se desenha quando não se olhou nenhuma. Cobertura moderna
     * tem uma gramática bem definida, e ela é feita de quatro coisas:
     *
     * 1. OLIVEIRA MULTITRONCO. É A árvore de terraço contemporâneo, e por razões
     *    práticas antes de estéticas: aguenta vento, sol direto, raiz rasa e
     *    pouca água — exatamente as condições de uma laje. Visualmente ela é o
     *    oposto da árvore genérica: troncos MÚLTIPLOS saindo tortos da mesma
     *    base, copa ABERTA (vê-se céu através dela) e folha PRATEADA, cinza-esverdeada.
     *    Copa fechada verde-escura é árvore de parque, não de cobertura.
     *
     * 2. GRAMÍNEA ORNAMENTAL EM MASSA. É a assinatura do paisagismo moderno, e o
     *    ponto não é a planta, é a REPETIÇÃO: uma espécie só, muitas mudas,
     *    plantadas em faixa contínua. Mistura de espécies lê como jardim de
     *    casa; massa de uma só lê como projeto. E em contraluz de fim de tarde a
     *    lâmina fina ACENDE — é a única vegetação que fica dourada em vez de
     *    escura quando o sol está atrás, e esta cena é toda em contraluz.
     *
     * 3. JARDINEIRA LINEAR, não vaso redondo. Vaso pontual é decoração; calha
     *    corrida é ARQUITETURA — ela desenha uma linha reta no piso e é essa
     *    linha que amarra o terraço. Corten (aço que enferruja de propósito e
     *    para de enferrujar) é o material canônico desde os anos 2000.
     *
     * 4. BUXO APARADO EM FILEIRA. Geometria repetida — esferas idênticas,
     *    espaçamento igual. É o contraponto formal da gramínea solta, e é a
     *    única coisa do jardim onde a REGULARIDADE é o efeito desejado.
     */

    // ── oliveiras multitronco ─────────────────────────────────────────────
    /**
     * UMA OLIVEIRA, E FORA DO VAO DO PERGOLADO.
     *
     * Eram tres, e duas caiam dentro do pergolado. Eu baixei a copa para ela
     * passar sob a viga e troquei um encontrao por outro: na altura nova ela foi
     * parar no mesmo nivel do arbusto do canteiro e SUMIU dentro dele. A faixa
     * livre entre o topo do arbusto (2,4) e a face da viga (2,73) tem 33 cm — nao
     * cabe arvore nenhuma ali, por mais que eu ajustasse.
     *
     * A conclusao nao e de altura, e de LUGAR: arvore-exemplar precisa de vazio
     * em volta para ser lida como exemplar. Espremida entre pergolado, plantio e
     * guarda-sol ela vira mais uma mancha verde, e tres delas espremidas viram
     * tres manchas.
     *
     * Entao fica UMA, plantada a esquerda do pergolado (que comeca em -8,4), com
     * ceu atras e altura cheia de volta. As palmeiras do canteiro continuam
     * fazendo o trabalho de verticalidade no resto da largura — e elas ja estao
     * acima da viga, entao nunca disputaram.
     */
    // x = -10,6 e 3,6, e o segundo numero e o que importa: 3,6 e o unico VAO
    // LIVRE da metade direita. A viga do pergolado termina em 2,9, os guarda-sois
    // estao em 5,0 e 7,8 mas numa profundidade a frente, e o bar comeca em 6,7.
    // Sobra a faixa de 2,9 a 6,7, e a arvore fica no meio dela — visivel de
    // corpo inteiro, sem nada na frente e sem nada atras para se fundir.
    //
    // As posicoes anteriores (-11,4 / 12,6 e depois -10,6 / 12,2) Em zArvores (14,4 m da camera) a
    // escala e 41,6 px/m, entao -11,4 e 12,6 caiam em 166 e 1164 de uma tela de
    // 1280 — ou seja, colados nas bordas e metade fora. A esquerda desloca para
    // dentro; a direita passa do bar (que termina em 11,3) para o tronco nao
    // nascer atras dele e a copa nao ficar boiando.
    /**
     * A OLIVEIRA DA ESQUERDA FOI DE −10,6 PARA −12,9, e foi o escritório que a
     * empurrou. Em −10,6 a copa dela (raio ~1,5 m) cobria o terço esquerdo do
     * pano de vidro — que é exatamente onde mora a estante, a peça mais detalhada
     * do interior. Pôr uma copa opaca na frente do que se acabou de construir é
     * desperdício dos dois lados.
     *
     * A restrição antiga continua valendo: em −11,4 a árvore caía colada na borda
     * do quadro numa tela de 1280. Mas o enquadramento largo do dono abre bem mais
     * que isso, e a −12,9 ela ainda entra inteira — e agora ENQUADRA o escritório
     * pela esquerda em vez de tapá-lo.
     */
    for (const [k, x] of [-12.9, 3.6].entries()) {
      sombra(x, zArvores, 2.4, 2.4)
      col.poe('vasoAlto', gVasoAlto, mVaso, [x, piso, zArvores])
      col.poe('terra', gTerra, mTerra, [x, piso + 0.66, zArvores], [-Math.PI / 2, 0, 0])
      // Três troncos saindo tortos da mesma base. É a base MÚLTIPLA que
      // identifica a oliveira à distância — um tronco só já seria outra árvore.
      const troncos = [
        { a: 0.3 + k, incl: 0.16 },
        { a: 2.4 + k, incl: 0.23 },
        { a: 4.3 + k, incl: 0.11 },
      ]
      for (const [t, tr] of troncos.entries()) {
        const dx = Math.sin(tr.a) * 0.13
        const dz = Math.cos(tr.a) * 0.13
        col.poe(
          'troncoOliva',
          gTroncoOliva,
          mCascaOliva,
          [x + dx, piso + 1.75 + t * 0.08, zArvores + dz],
          [Math.cos(tr.a) * tr.incl, 0, -Math.sin(tr.a) * tr.incl],
        )
        col.poe(
          'galhoOliva',
          gGalhoOliva,
          mGalhoOliva,
          [x + dx * 2.6, piso + 3.0 + t * 0.16, zArvores + dz * 2.6],
          [Math.cos(tr.a) * 0.65, 0, -Math.sin(tr.a) * 0.65],
        )
      }
      /**
       * COPA ABERTA, e a abertura é o ponto. Trinta tufos PEQUENOS espalhados
       * num volume largo, em vez de poucos tufos grandes — assim sobra céu entre
       * eles e a árvore respira. Copa maciça é o erro que faz qualquer árvore
       * modelada parecer brócolis: na natureza a folha se organiza em camadas
       * finas na periferia, porque é lá que está a luz, e o miolo é vazio.
       */
      // NUCLEO: oito tufos solidos no miolo, so para a copa ter massa escura por
      // tras das folhas. Sem eles ve-se o ceu atraves da arvore inteira e ela
      // perde peso; com eles, as folhas chatas ficam recortadas contra algo.
      for (let t = 0; t < 40; t++) {
        const a = ruido(t, 55 + k) * Math.PI * 2
        const r = ruido(t, 56 + k) * 0.78
        col.poe(
          'nucleoOliva',
          gTufoOliva,
          mFolhaSolida,
          [x + Math.sin(a) * r, piso + 3.1 + ruido(t, 57 + k) * 1.1, zArvores + Math.cos(a) * r],
          [ruido(t, 58 + k) * 3, ruido(t, 59 + k) * 3, 0],
          [1.7, 1.25, 1.7],
          TONS_DE_OLIVA[0]!,
        )
      }
      /**
       * A FOLHA NASCE EM RAMALHETE, e este era o erro que ainda restava.
       *
       * A versão anterior espalhou 330 folhas soltas dentro do volume da copa,
       * cada uma girada ao acaso nos três eixos. Aquilo resolveu o problema do
       * sólido — passou a cintilar —, mas trouxe outro: CONFETE. Folha não
       * flutua distribuída num volume. Ela nasce em sequência ao longo de um
       * raminho, o raminho nasce num galho, e por isso a copa de qualquer árvore
       * é feita de GRUMOS e não de uma nuvem uniforme.
       *
       * O grumo produz as três coisas que faltavam:
       *
       * - AUTO-SOMBRA. Um grumo denso tem lado claro e lado escuro. Folha
       *   dispersa recebe luz de todos os lados e achata.
       * - SILHUETA RECORTADA. O contorno de uma copa real é serrilhado pelos
       *   ramalhetes da periferia; não é um círculo difuso.
       * - DIREÇÃO. As folhas de um mesmo raminho apontam quase todas para o
       *   mesmo lado, e é essa concordância LOCAL que o olho lê como crescimento
       *   em vez de espalhamento.
       *
       * E a orientação deixa de ser aleatória: ela segue o eixo do raminho, com
       * dispersão em volta. O giro livre nos três eixos foi exatamente o que fez
       * a versão anterior parecer papel picado suspenso.
       */
      // Mais ramalhetes e mais folha por ramalhete: o recorte por alfa tirou
      // quase metade da area de cada quad, e sem repor a copa RAREIA.
      const ramalhetes = 118
      for (let b = 0; b < ramalhetes; b++) {
        // O pé do raminho fica na casca da copa. A raiz quadrada empurra para
        // FORA, porque o miolo é oco — é na periferia que está a luz.
        const az = ruido(b, 50 + k) * Math.PI * 2
        // Copa REDONDA, nao disco. Com raio ate 1,04 e altura de 1,15 ela era duas
        // vezes mais larga que alta, e de perto isso le como tapete de folha
        // pousado no galho. Oliveira adulta tem copa quase tao alta quanto larga.
        const rBase = 0.18 + Math.sqrt(ruido(b, 60 + k)) * 0.76
        // ALTURA CHEIA DE VOLTA: fora do vao do pergolado ela nao disputa com
        // nada, e pode ter a copa alta que uma oliveira adulta tem. A copa comeca
        // acima do topo do arbusto do canteiro (2,4), entao ela se destaca contra
        // o ceu em vez de se fundir com o verde de tras.
        const yBase = piso + 2.85 + ruido(b, 70 + k) * 1.55
        const bx = x + Math.sin(az) * rBase
        const bz = zArvores + Math.cos(az) * rBase * 0.78
        // A maioria PENDE: galho carregado de folha não fica na horizontal, e o
        // −0,62 no deslocamento é o que inclina a distribuição para baixo.
        const inclina = (ruido(b, 75 + k) - 0.62) * 1.1
        const comp = 0.2 + ruido(b, 76 + k) * 0.22

        // O raminho em si. Sem ele o grumo flutua desligado da árvore.
        col.poe(
          'raminho',
          gRaminho,
          mGalhoOliva,
          [
            bx + Math.sin(az) * comp * 0.4,
            yBase + inclina * comp * 0.4,
            bz + Math.cos(az) * comp * 0.4,
          ],
          [Math.cos(az) * -inclina, az, Math.sin(az) * inclina],
          [1, comp / 0.3, 1],
        )

        for (let f = 0; f < 19; f++) {
          // Ao LONGO do raminho, e não em volta dele.
          const u = 0.12 + (f / 19) * 0.98
          const g = b * 17 + f
          col.poe(
            'folhaOliva',
            gFolhaOliva,
            mFolha,
            [
              bx + Math.sin(az) * comp * u + (ruido(g, 80 + k) - 0.5) * 0.075,
              yBase + inclina * comp * u + (ruido(g, 85 + k) - 0.5) * 0.07,
              bz + Math.cos(az) * comp * u + (ruido(g, 90 + k) - 0.5) * 0.075,
            ],
            // Segue o eixo do raminho, com dispersão. O terceiro ângulo é o
            // ROLAMENTO da folha em torno do próprio pecíolo, e é ele que faz
            // uma pegar sol enquanto a vizinha fica de perfil.
            [
              Math.cos(az) * -inclina + (ruido(g, 95 + k) - 0.5) * 0.9,
              az + (ruido(g, 100 + k) - 0.5) * 1.1,
              ruido(g, 105 + k) * 6.3,
            ],
            (() => {
              const e = 0.78 + ruido(g, 110 + k) * 0.5
              return [e, e, e] as [number, number, number]
            })(),
            TONS_DE_OLIVA[(g * 3 + k) % TONS_DE_OLIVA.length]!,
          )
        }
      }
    }

    /**
     * A CAIXA DE ESCADA — e ela fecha um BURACO DE LOGICA, nao um vazio visual.
     *
     * Esta cobertura nao tinha por onde se chegar. Ninguem formula isso
     * conscientemente ao olhar, mas o cerebro cobra: um terraco mobiliado, com
     * bar e piscina, e sem uma porta e um cenario de teatro — a parte que a
     * camera nao ve simplesmente nao existe. O volume da escada e a peca que
     * torna o lugar ALCANCAVEL, e isso muda o que a cena afirma.
     *
     * Alem disso ela resolve dois problemas de composicao que sobraram: a parede
     * do fundo era a maior area chapada do quadro, e a metade esquerda nao tinha
     * nenhuma massa construida entre o pergolado e o ceu.
     *
     * A MARQUISE sobre a porta nao e enfeite: porta de saida para laje SEMPRE
     * tem cobertura, senao chove dentro da escada. E a arandela acima dela e o
     * que diz que este lugar tambem funciona de noite.
     */
    const { x: xEsc, largura: LARG_ESC, altura: ALT_ESC, profundidade: PROF_ESC } = ESCRITORIO
    const zEsc = zDoEscritorio(zCentro, prof)
    const zFrenteEsc = zEsc + PROF_ESC / 2
    const zFundoEsc = zEsc - PROF_ESC / 2
    const yTetoEsc = piso + ALT_ESC
    /** Volume do escritório: uma caixa unitária colocada por centro e tamanho. */
    const bloco = (
      chave: string,
      material: THREE.Material,
      centro: [number, number, number],
      tamanho: [number, number, number],
    ) => col.poe(chave, gCaixa, material, centro, [0, 0, 0], tamanho)

    sombra(xEsc, zEsc, LARG_ESC + 0.8, PROF_ESC + 1.2)
    // A casca: duas laterais, piso e laje. A face da FRENTE fica vazia — ela é o
    // pano de vidro. E o FUNDO também: quem fecha ali é a parede do andar, que já
    // está no lugar exato (ver `zDaParedeDoAndar`).
    for (const s of [-1, 1])
      bloco('escCasca', mEscParede, [xEsc + s * (LARG_ESC / 2 - 0.06), piso + ALT_ESC / 2, zEsc], [0.12, ALT_ESC, PROF_ESC])
    // CHAVES SEPARADAS PARA PISO E LAJE, e isto é a armadilha do coletor de novo:
    // ele guarda geometria E MATERIAL da primeira chamada de cada chave. Com as
    // três peças sob `escCasca`, o piso de madeira e a laje de concreto saíam
    // ambos com o reboco da parede, em silêncio.
    bloco('escPiso', mEscPiso, [xEsc, piso + 0.03, zEsc], [LARG_ESC, 0.06, PROF_ESC])
    /**
     * A LAJE AVANÇA 22 cm ALÉM DO VIDRO nos quatro lados, e essa sobra é o gesto
     * contemporâneo inteiro. Laje rente ao caixilho lê como caixa de vidro de
     * maquete; laje em balanço lê como arquitetura, porque é ela que protege o
     * vidro do sol e da chuva — e a sombra fina que ela projeta sobre o pano é o
     * que separa os dois planos.
     */
    bloco('escLaje', mParedeConcreto, [xEsc, yTetoEsc + 0.09, zEsc + 0.11], [LARG_ESC + 0.44, 0.18, PROF_ESC + 0.44])
    // O forro por dentro, um palmo abaixo da laje: é onde os trilhos de luz se
    // prendem, e é ele que devolve o quente para o teto.
    bloco('escForro', mEscLuz, [xEsc, yTetoEsc - 0.05, zEsc], [LARG_ESC - 0.2, 0.05, PROF_ESC - 0.2])

    /**
     * O PAINEL ACESO DO FUNDO. É a maior superfície do escritório e a única cuja
     * função é luz, não objeto: ele é o que se vê primeiro do outro lado do
     * quadro, e é contra ele que a estante e a cadeira viram silhueta legível.
     *
     * Fica 8 cm à frente da parede para o móvel não brigar com ele no z-fighting,
     * e não chega ao teto nem ao piso — uma faixa escura em cima e outra embaixo
     * são o que impedem o painel de ler como adesivo colado na parede.
     */
    // Ele cobre só a METADE DIREITA, atrás da mesa. Na esquerda quem está contra
    // a parede é a estante, e um painel aceso por trás dela só acenderia madeira
    // maciça — o mesmo erro que o nicho do bar teve na primeira tentativa.
    bloco('escPainel', mEscLuz, [xEsc + 1.35, piso + 1.62, zFundoEsc + 0.06], [3.0, 2.2, 0.04])

    /**
     * A ESTANTE, e ela ocupa a METADE ESQUERDA porque é o que a referência faz:
     * massa densa e colorida de um lado, mesa e vazio do outro. Estante centrada
     * dividiria o escritório em dois iguais, e dois iguais não têm hierarquia.
     */
    const xEstante = xEsc - 1.55
    const LARG_ESTANTE = 2.4
    /**
     * A CARCAÇA É FUNDO E LATERAIS, e não uma caixa cheia — e este é o mesmo erro
     * que o nicho do bar acabou de me custar um render, nesta mesma entrega.
     *
     * A primeira versão era um bloco de 2,40 × 2,06 × 0,34 em madeira escura, com
     * as prateleiras 2 cm ATRÁS da face dele. Resultado: a caixa maciça cobriu as
     * quatro prateleiras e as 52 lombadas, e o que apareceu no render foi um
     * painel de madeira liso onde deveria estar a coisa mais rica do interior.
     *
     * A regra que sai daqui vale para os três móveis desta cena: peça que CONTÉM
     * outra nunca é um sólido. Ela é a casca — fundo e laterais — e tudo que ela
     * mostra vive À FRENTE dessa casca, nunca dentro do volume dela.
     */
    bloco('escEstanteFundo', mMadeiraEscura, [xEstante, piso + 1.05, zFundoEsc + 0.04], [LARG_ESTANTE, 2.06, 0.05])
    for (const s of [-1, 1])
      bloco('escEstanteFundo', mMadeiraEscura, [xEstante + s * (LARG_ESTANTE / 2 - 0.03), piso + 1.05, zFundoEsc + 0.21], [0.06, 2.06, 0.38])
    for (const [p, y] of [0.52, 0.94, 1.36, 1.78].entries()) {
      bloco('escPrateleira', mMadeiraEscura, [xEstante, piso + y, zFundoEsc + 0.22], [LARG_ESTANTE - 0.08, 0.035, 0.34])
      /**
       * OS LIVROS SÃO A RIQUEZA, e são baratos: uma caixa por lombada, todas com
       * a mesma geometria, variando só em escala e cor pela matriz e pelo
       * `instanceColor`. Trinta e duas lombadas custam trinta e duas matrizes.
       *
       * A altura varia, e um em cada sete fica DEITADO sobre a pilha. É o detalhe
       * que separa estante de gente de estante de vitrine: ninguém mantém uma
       * prateleira perfeitamente alinhada, e o olho reconhece a diferença sem
       * conseguir nomeá-la.
       */
      for (let l = 0; l < 13; l++) {
        const x = xEstante - LARG_ESTANTE / 2 + 0.12 + l * 0.175
        const alto = 0.2 + ruido(l, 610 + p) * 0.1
        const deitado = ruido(l, 620 + p) > 0.86
        col.poe(
          'escLivro',
          gLivro,
          mEscParede,
          [x, piso + y + (deitado ? 0.045 : alto / 2 + 0.018), zFundoEsc + 0.24],
          deitado ? [0, 0, Math.PI / 2] : [0, 0, 0],
          deitado ? [1, 2.6, 1] : [0.8 + ruido(l, 630 + p) * 0.9, alto, 1],
          TONS_DE_LIVRO[(l * 3 + p * 5) % TONS_DE_LIVRO.length]!,
        )
      }
    }

    /**
     * A MESA fica à FRENTE, quase encostada no vidro, e não contra a parede.
     * Mesa no fundo desapareceria atrás do painel aceso; na frente ela recorta
     * contra o painel, e é esse recorte que faz o interior ter PROFUNDIDADE em
     * vez de ser uma parede iluminada com coisas pintadas.
     */
    const xMesa = xEsc + 1.35
    const zMesa = zEsc + 0.34
    bloco('escMesa', mMadeiraEscura, [xMesa, piso + 0.73, zMesa], [1.96, 0.055, 0.78])
    // Duas laterais cheias em vez de quatro pernas finas: é o desenho de mesa de
    // arquiteto, e quatro cilindros de 3 cm a 18 m não sobrevivem a um pixel.
    for (const s of [-1, 1])
      bloco('escMesa', mMadeiraEscura, [xMesa + s * 0.88, piso + 0.36, zMesa], [0.08, 0.72, 0.7])
    col.poe('escMonitorBase', gBaseMonitor, mCaixilho, [xMesa - 0.15, piso + 0.765, zMesa - 0.18])
    col.poe('escMonitorPe', gPeMonitor, mCaixilho, [xMesa - 0.15, piso + 0.83, zMesa - 0.18])
    col.poe('escMonitor', gMonitor, mCaixilho, [xMesa - 0.15, piso + 1.07, zMesa - 0.18])
    // A TELA acesa, 1 cm à frente da carcaça e virada para a câmera. É o objeto
    // mais quente do interior e o que diz que alguém trabalha ali agora.
    col.poe('escTela', gPlanoEsc, mTela, [xMesa - 0.15, piso + 1.07, zMesa - 0.169], [0, 0, 0], [0.54, 0.31, 1])
    // Papel e caneca sobre o tampo: duas caixas minúsculas que custam nada e são
    // a diferença entre mesa MOBILIADA e mesa de catálogo.
    bloco('escPapel', mEscParede, [xMesa + 0.52, piso + 0.762, zMesa + 0.1], [0.26, 0.008, 0.2])
    bloco('escPapel', mEscParede, [xMesa + 0.66, piso + 0.8, zMesa - 0.06], [0.08, 0.1, 0.08])

    /**
     * A CADEIRA fica À FRENTE da mesa e girada, não empurrada para dentro dela.
     * Cadeira encostada lê como ninguém estar ali; cadeira afastada e torta lê
     * como alguém que acabou de se levantar — a mesma regra da toalha caída na
     * espreguiçadeira e do carrinho de serviço no datacenter.
     */
    const xCad = xEsc + 0.62
    const zCad = zEsc + 0.72
    const giroCad = 0.55
    col.poe('escEstrela', gEstrelaCad, mCaixilho, [xCad, piso + 0.08, zCad], [0, giroCad, 0])
    col.poe('escColuna', gColunaCad, mCaixilho, [xCad, piso + 0.26, zCad])
    col.poe('escAssento', gAssentoCad, mEstofado, [xCad, piso + 0.43, zCad], [0, giroCad, 0])
    col.poe(
      'escEncosto',
      gEncostoCad,
      mEstofado,
      [xCad - Math.cos(giroCad) * 0.2, piso + 0.73, zCad + Math.sin(giroCad) * 0.2],
      [0.1, giroCad, 0],
    )

    // Tapete: a mancha escura no chão que ancora o móvel. Sem ele a mesa e a
    // cadeira flutuam sobre uma tábua corrida uniforme.
    col.poe('escTapete', gPlanoEsc, mEscTapete, [xEsc + 0.9, piso + 0.065, zEsc + 0.2], [-Math.PI / 2, 0, 0], [3.0, 1.5, 1])

    /**
     * TRÊS PENDENTES sobre a mesa, e eles são o motivo de o teto existir aqui.
     * Interior aceso só pelo fundo lê como caixa de luz; interior com PONTOS de
     * luz identificáveis lê como um lugar projetado. Cada um é um cone minúsculo
     * de material básico (fura o tone mapping) pendurado por um fio de 4 lados.
     */
    for (const dx of [-0.7, 0, 0.7]) {
      col.poe('escFio', gFioLum, mCaixilho, [xMesa + dx, yTetoEsc - 0.46, zMesa - 0.1], [0, 0, 0], [1, 0.82, 1])
      col.poe('escLuminaria', gLuminaria, mLuminaria, [xMesa + dx, yTetoEsc - 0.9, zMesa - 0.1])
    }

    /**
     * O CAIXILHO: montantes verticais a cada 1,45 m, mais travessa em cima e
     * embaixo. São eles que denunciam que ali existe vidro — o pano em si é
     * quase invisível de frente (está no bloco JSX, com 12% de opacidade), e sem
     * o caixilho o escritório leria como um buraco aberto na fachada.
     *
     * O montante do meio é mais largo: é o batente da PORTA. A cobertura precisa
     * ter por onde se chegar, e agora a chegada é esta folha de vidro em vez de
     * um prisma de concreto cego.
     */
    for (let m = 0; m <= 4; m++) {
      const x = xEsc - LARG_ESC / 2 + (m * LARG_ESC) / 4
      bloco('escCaixilho', mCaixilho, [x, piso + ALT_ESC / 2, zFrenteEsc], [m === 2 ? 0.12 : 0.07, ALT_ESC, 0.09])
    }
    bloco('escCaixilho', mCaixilho, [xEsc, piso + ALT_ESC - 0.05, zFrenteEsc], [LARG_ESC, 0.1, 0.09])
    bloco('escCaixilho', mCaixilho, [xEsc, piso + 0.05, zFrenteEsc], [LARG_ESC, 0.1, 0.09])
    // Puxador da porta: uma barra vertical no montante do meio. É o objeto que
    // transforma "pano de vidro" em "entrada".
    col.poe('escPuxador', gColunaCad, mMetal, [xEsc + 0.16, piso + 1.05, zFrenteEsc + 0.07], [0, 0, 0], [0.55, 3.4, 0.55])
    col.poe('arandela', gArandela, mAco, [xEsc + 2.3, yTetoEsc + 0.28, zFrenteEsc - 0.1])

    /**
     * A BAIA DO ESCRITÓRIO: a faixa de x onde o plantio NÃO entra.
     *
     * O primeiro render do escritório aceso mostrou o defeito inteiro de uma vez:
     * a caixa acendeu e não se via nada dentro dela. Estante, mesa, monitor e
     * cadeira estavam lá, atrás de gramínea de 1,3 m, moita de folha larga e
     * florada — os três estratos do canteiro correm de ponta a ponta da laje e
     * passam na frente do vidro. Eu tinha construído um interior caro e plantado
     * um arbusto em cima dele.
     *
     * Jardim de verdade não faz isso: onde há uma sala envidraçada, há PISO na
     * frente dela, porque é por ali que se entra. O canteiro contorna o volume.
     *
     * Meio metro de folga de cada lado, e não zero: planta encostada no caixilho
     * leria como mato crescido contra a janela em vez de canteiro que respeita o
     * edifício.
     */
    const noVaoDoEscritorio = (x: number) =>
      x > xEsc - LARG_ESC / 2 - 0.5 && x < xEsc + LARG_ESC / 2 + 0.5
    /**
     * A MESMA REGRA PARA O BAR, e por um motivo diferente. O bar está À FRENTE do
     * canteiro (z = −7,6 contra −10,1), então o plantio não o tapa: ele aparece
     * ATRAVÉS dele, pelo vão entre o tampo e a estante de garrafas. Gramínea
     * palha subindo entre as garrafas é ruído bem no lugar onde a leitura depende
     * de contraste — garrafa acesa contra fundo escuro.
     *
     * Por isso só a gramínea e a florada saem. O maciço alto do fundo FICA: ele é
     * a massa escura contra a qual o nicho aceso recorta, e sem ele o bar ficaria
     * brilhando contra o céu claro, que é o inverso do que se quer.
     */
    const atrasDoBar = (x: number) => x > 6.2 && x < 11.9

    /**
     * JUNTA DE DILATACAO na parede do fundo. Parede de concreto de 30 m sem
     * junta nao existe: ela racharia sozinha na primeira variacao de
     * temperatura. O sulco vertical a cada seis metros e a coisa mais simples
     * que transforma um plano liso em parede CONSTRUIDA, e e uma linha escura
     * por peca.
     */
    /**
     * A JUNTA NUNCA APARECEU, e a mesma medição do escritório explicou por quê:
     * ela estava em `zCanteiro − 1,55` = −11,65, e a face da parede está em
     * −11,25. Quarenta centímetros DENTRO do concreto. Este bloco desenhava cinco
     * peças que nenhum pixel do site jamais mostrou.
     *
     * Agora sai da mesma função que posiciona o fundo do escritório, um
     * centímetro à frente da face — que é como um sulco se apresenta.
     */
    for (let i = 0; i < 5; i++)
      col.poe('juntaParede', gJuntaParede, mJunta, [
        -12 + i * 6,
        piso + 1.6,
        zDaParedeDoAndar(zCentro, prof) + 0.01,
      ])
    // Torneira de jardim, rente a parede. Quem rega as jardineiras precisa dela,
    // e e o tipo de objeto que so existe em lugar que funciona.
    col.poe('torneiraJardim', gTorneiraJardim, mAco, [4.2, piso + 0.5, zCanteiro - 1.5], [0, 0, Math.PI / 2])

    /**
     * CHAPIM DO PARAPEITO: a pedra de arremate que corre no topo dele, sempre um
     * pouco mais larga que o muro. Nao e decoracao — e o que faz a agua pingar
     * longe da fachada em vez de escorrer por ela. Visualmente e a linha clara
     * que define a borda do terraco contra o ceu, e a faixa de concreto lisa do
     * pe do quadro precisava exatamente disso.
     */
    col.poe(
      'chapim',
      gChapim,
      mPedra,
      [0, piso + 0.375, 1.48],
      [0, 0, 0],
      [meiaLargura * 2, 1, 1],
    )

    /**
     * ═══ O JARDIM, REFEITO POR MASSA E PROFUNDIDADE ═══
     *
     * O DIAGNÓSTICO, e ele não era de detalhe de planta: era de MASSA. Havia
     * palmeira, gramínea, flor e folha larga — espécie não faltava. Faltava
     * volume, por três razões estruturais:
     *
     * 1. UMA PROFUNDIDADE SÓ. Tudo estava plantado em `zCanteiro`, numa linha.
     *    Jardim de verdade tem CAMADAS: o que está atrás aparece ENTRE o que
     *    está na frente, e é essa oclusão parcial que o olho lê como "tem mais
     *    planta lá dentro". Fileira única, por mais densa, lê como cenário
     *    pintado.
     *
     * 2. VÃOS. Sete jardineiras de 3,4 m espaçadas 3,8 deixavam 40 cm de parede
     *    nua entre cada par. Buraco no meio de canteiro é o que denuncia plantio
     *    decorativo — num projeto, planta cobre a calha inteira.
     *
     * 3. ALTURA DE UM PALMO SÓ. Gramínea de 1,1 m e mais nada entre ela e a
     *    parede de 3,2 m. Faltava o ESTRATO ARBUSTIVO, que preenche o meio e dá
     *    fundo escuro para a gramínea recortar contra.
     *
     * A correção é a estrutura clássica de bordadura, de trás para a frente:
     * FUNDO alto e cerrado, MEIO em textura fina, FRENTE baixa e derramando. É
     * assim que se planta um canteiro de verdade, e é assim que ele ganha
     * profundidade sem truque nenhum.
     */
    const zFundoVerde = zCanteiro - 0.75
    const zMeioVerde = zCanteiro
    const zFrenteVerde = zCanteiro + 0.8

    /**
     * A CALHA CORRE DE PONTA A PONTA — em DOIS trechos, e não num só.
     *
     * Ela era uma peça inteira de 30 m, e isso deixou de funcionar no instante em
     * que o escritório ocupou a baia: a calha tem 1,84 m de profundidade e o
     * volume envidraçado tem 2, então ela atravessava a caixa de lado a lado e
     * saía pelo fundo. Uma jardineira de aço passando por dentro de uma sala é o
     * tipo de erro que não se vê no código e é impossível não ver no render.
     *
     * Dois trechos que encostam nas laterais do escritório é o que uma obra faria
     * de verdade: a calha morre contra o edifício e recomeça do outro lado.
     */
    const calha = (de: number, ate: number) =>
      col.poe(
        'jardineira',
        gJardineira,
        mCorten,
        [(de + ate) / 2, piso + 0.27, zCanteiro + 0.1],
        [0, 0, 0],
        [(ate - de) / 3.4, 1, 2.3],
      )
    calha(-meiaLargura, xEsc - LARG_ESC / 2 - 0.35)
    calha(xEsc + LARG_ESC / 2 + 0.35, meiaLargura)
    sombra(0, zCanteiro, meiaLargura * 2.1, 3.4)

    /**
     * ESTRATO DE FUNDO: o arbusto cerrado que vira PAREDE VERDE.
     *
     * É ele que resolve o problema principal, e o número é grosseiro de
     * propósito — 46 moitas de 26 folhas cobrindo os 30 m. Massa vegetal só lê
     * como massa quando não se vê o fim dela; qualquer economia aqui reabre o
     * buraco que este estrato existe para fechar.
     *
     * Altura entre 1,0 e 1,9 m, IRREGULAR. Sebe aparada teria altura constante —
     * mas isto não é sebe, é maciço informal, e o topo ondulado é a diferença.
     */
    for (let m = 0; m < 46; m++) {
      const xm = -meiaLargura + 0.6 + (m / 45) * (meiaLargura * 2 - 1.2)
      // O maciço do fundo passa POR DENTRO do escritório nesta faixa — ele vive
      // em zFundoVerde, que cai entre o fundo e a frente da caixa de vidro.
      if (noVaoDoEscritorio(xm)) continue
      const alturaMoita = 1.1 + ruido(m, 400) * 1.05
      const zm = zFundoVerde + (ruido(m, 401) - 0.5) * 0.5
      for (let f = 0; f < 44; f++) {
        const a = ruido(f, 410 + m) * Math.PI * 2
        const r = Math.sqrt(ruido(f, 411 + m)) * 0.52
        col.poe(
          'folhaArbusto',
          gFolhaLarga,
          mFolhaLarga,
          [
            xm + Math.sin(a) * r,
            piso + 0.5 + ruido(f, 412 + m) * alturaMoita,
            zm + Math.cos(a) * r * 0.7,
          ],
          [ruido(f, 413 + m) * 3, ruido(f, 414 + m) * 6, ruido(f, 415 + m) * 3],
          (() => {
            const e = 0.8 + ruido(f, 416 + m) * 0.7
            return [e, e, e] as [number, number, number]
          })(),
          TONS_DE_OLIVA[(f + m) % TONS_DE_OLIVA.length]!,
        )
      }
    }

    /**
     * PALMEIRAS, agora acima do estrato arbustivo. Cinco, em espaçamento
     * IRREGULAR — palmeira em passo constante lê como alameda, e alameda é
     * outro projeto.
     */
    /**
     * A COROA, REFEITA — dois defeitos, e o segundo era estrutural.
     *
     * 1. AS FRONDES NASCIAM ABAIXO DO TOPO. O ponto de fixação descia junto com
     *    o caimento (`3,34 − cai × 0,42`), então as mais tombadas brotavam meio
     *    metro abaixo da ponta do estipe e sobrava tronco pelado acima da
     *    folhagem. Em palmeira TODA fronde sai do MESMO ponto: a coroa, no ápice
     *    do estipe. O que varia é o ângulo com que ela cai dali — nunca a altura
     *    de onde sai.
     *
     * 2. O CAIMENTO ESTAVA AMARRADO AO AZIMUTE. Com `cai = 0,12 + (fr/14)·0,95`
     *    e `a = (fr/14)·2π`, a fronde descia progressivamente conforme se dava a
     *    volta na copa: uma escada em espiral, que é exatamente a falta de ordem
     *    que se vê. Numa palmeira o caimento depende da IDADE, não da direção —
     *    as novas ficam eretas no miolo, as velhas se abrem e tombam por fora,
     *    em todas as direções ao mesmo tempo.
     *
     * Então são duas COROAS concêntricas: uma interna de frondes jovens quase
     * verticais e uma externa de velhas tombadas, cada uma com o azimute
     * distribuído por igual e defasada da outra para as duas se entrelaçarem.
     *
     * E a posição virou trigonometria de verdade. A fronde tem 1,7 m e o plano é
     * CENTRADO, então o centro dela precisa ficar a meia-fronde do eixo na
     * direção em que ela aponta: alcance horizontal `R·cos(cai)`, queda
     * `R·sin(cai)`. Com o deslocamento fixo de antes, a metade de dentro
     * atravessava o tronco e saía pelo outro lado.
     */
    /**
     * TRES COROAS, CAIMENTO CONSTANTE EM CADA UMA, E CADA FRONDE EM ARCO.
     *
     * O dono apontou duas vezes que a coroa continuava sem ordem, e nas duas eu
     * tinha consertado a metade errada do problema. O que estava acontecendo:
     *
     * 1. EU AINDA SORTEAVA O CAIMENTO POR FRONDE. Duas frondes vizinhas, da
     *    mesma idade, caiam em angulos diferentes. Palmeira e o oposto disso — e
     *    a planta mais ORDENADA que existe. A coroa sai de um unico meristema no
     *    apice, uma fronde de cada vez, e todas as folhas da mesma idade estao
     *    na mesma fase de abertura. Cada geracao e um CONE limpo.
     *
     * 2. E, mesmo com o cone limpo, a fronde RETA fazia a copa ler como estrela.
     *    O caimento nao e um angulo: e uma curva. Por isso `saida` e `ponta` em
     *    vez de um `cai` so — a fronde deixa o capitel nesse angulo de saida e
     *    chega na ponta naquele outro, e o joelho entre os dois e o arco. Nas
     *    novas, saida e ponta sao ambas negativas: a lanca sobe e fica em pe no
     *    miolo. Nas velhas, a saida e quase horizontal e a ponta despenca.
     *
     * O azimute e distribuido por igual dentro de cada coroa e defasado entre
     * elas, para as tres se entrelacarem em vez de se alinharem em raio. A unica
     * variacao que sobra e ENTRE palmeiras (via `q`), porque duas vizinhas nao
     * estao no mesmo ponto do ciclo. Dentro de uma, a regularidade E o realismo.
     */
    const COROAS = [
      { n: 5, saida: -0.62, ponta: -0.16, fase: 0.0 },
      { n: 7, saida: -0.18, ponta: 0.52, fase: 0.45 },
      { n: 9, saida: 0.16, ponta: 1.04, fase: 0.19 },
    ] as const
    // A inclinacao do estipe e a mesma usada para achar o apice — se as duas
    // divergirem, a copa flutua ao lado do tronco.
    const INCLINA_ESTIPE: [number, number, number] = [0.05, 0, 0.04]
    const eixoDoEstipe = new THREE.Vector3(0, 1, 0).applyEuler(
      new THREE.Euler(...INCLINA_ESTIPE),
    )
    // 2,1 de meia-altura menos um palmo, para a coroa nascer DENTRO da madeira.
    const ATE_O_APICE = 1.98
    // `Vector3.toArray()` devolve `number[]`, e `poe` pede a tripla exata.
    const tri = (v: THREE.Vector3): [number, number, number] => [v.x, v.y, v.z]
    /**
     * QUATRO PALMEIRAS, E NÃO CINCO: a de x = −6,2 saiu porque o escritório passou
     * a ocupar de −10,7 a −4,9. O estipe dela nascia DENTRO da caixa de vidro.
     *
     * Era a saída certa entre as duas possíveis. Empurrar a palmeira para o lado
     * apertaria o vão para a vizinha; encolher o escritório desfaria o pedido do
     * dono, que era justamente ele ser maior. E o vão que ela deixa não fica
     * vazio: quem o preenche é o volume aceso, que é massa mais forte do que ela
     * era. A de −11,8 fica: a copa dela passa ACIMA da laje do escritório, e uma
     * palmeira cruzando por cima de uma caixa de vidro acesa é justamente o tipo
     * de sobreposição que a referência tem.
     */
    for (const [q, xp] of [-11.8, -0.4, 5.6, 11.2].entries()) {
      const base: [number, number, number] = [xp, piso + 2.6, zFundoVerde]
      col.poe('estipe', gEstipe, mEstipe, base, INCLINA_ESTIPE)
      /**
       * O APICE E CALCULADO, NAO CHUTADO. O estipe e inclinado, entao o topo dele
       * nao fica sobre `xp`: anda 8 cm em x e 10 cm em z ao longo do eixo. Fixar
       * a coroa em `xp` era pouco para notar de relance e o bastante para a copa
       * parecer solta do tronco.
       */
      const noEixo = (t: number) =>
        eixoDoEstipe.clone().multiplyScalar(t).add(new THREE.Vector3(...base))
      const apice = noEixo(ATE_O_APICE)
      col.poe('capitel', gCapitel, mCapitel, tri(noEixo(ATE_O_APICE - 0.3)), INCLINA_ESTIPE)
      for (const c of COROAS)
        for (let fr = 0; fr < c.n; fr++) {
          const a = (fr / c.n) * Math.PI * 2 + c.fase + q
          const desvio = (ruido(q, 491) - 0.5) * 0.12
          const sa = Math.sin(a)
          const ca = Math.cos(a)
          /**
           * A rotacao e `[0, a − π/2, −cai]`, e a ordem Euler XYZ do three aplica
           * o Z primeiro: o plano tomba no proprio eixo longo e so depois gira
           * para o azimute. Sao dois passos limpos, e e por isso que o resultado
           * e simetrico — a versao anterior distribuia o caimento entre X e Z
           * conforme o azimute, o que torcia cada fronde de um jeito diferente.
           *
           * Com Z aplicado antes de Y, a normal do plano sai horizontal e
           * perpendicular ao raquis: a lamina fica em pe, que e como a fronde se
           * apresenta a uma camera de lado.
           */
          const anda = (cai: number, t: number, de: THREE.Vector3) =>
            de.clone().add(
              new THREE.Vector3(sa * Math.cos(cai), -Math.sin(cai), ca * Math.cos(cai))
                .multiplyScalar(t),
            )
          const cSaida = c.saida + desvio
          const cPonta = c.ponta + desvio
          const joelho = anda(cSaida, COMP_BASE, apice)
          col.poe(
            'fronde-base',
            gFrondeBase,
            mFronde,
            tri(anda(cSaida, COMP_BASE / 2, apice)),
            [0, a - Math.PI / 2, -cSaida],
          )
          col.poe(
            'fronde-ponta',
            gFrondePonta,
            mFronde,
            // Recuados 6 cm: os dois segmentos se encontram em angulos
            // diferentes, entao encostar ponta com ponta abriria uma cunha de um
            // lado do joelho. A sobreposicao curta fecha o cotovelo.
            tri(anda(cPonta, COMP_PONTA / 2 - 0.06, joelho)),
            [0, a - Math.PI / 2, -cPonta],
          )
        }
    }

    /**
     * ESTRATO DO MEIO: a gramínea, agora em faixa CORRIDA em vez de tufos
     * isolados. Vinte e dois tufos encostados cobrem os 30 m sem vão, e a lâmina
     * fina recorta contra o arbusto escuro que agora existe atrás dela — que era
     * exatamente o fundo que faltava para ela aparecer.
     */
    for (let c = 0; c < 22; c++) {
      const xc = -meiaLargura + 0.8 + (c / 21) * (meiaLargura * 2 - 1.6)
      // A gramínea chega a 1,3 m: era ela a que mais cobria o vidro.
      if (noVaoDoEscritorio(xc) || atrasDoBar(xc)) continue
      for (let b = 0; b < 54; b++) {
        const a = ruido(b, 420 + c) * Math.PI * 2
        const raio = ruido(b, 421 + c) * 0.34
        const alt = 0.5 + ruido(b, 422 + c) * 0.8
        const incl = 0.1 + ruido(b, 423 + c) * 0.78
        col.poe(
          'lamina',
          gLamina,
          mGramineaMat,
          [
            xc + Math.sin(a) * raio,
            piso + 0.52 + alt / 2,
            zMeioVerde + Math.cos(a) * raio * 0.6,
          ],
          [Math.cos(a) * incl, a, -Math.sin(a) * incl],
          [1, alt, 1],
          TONS_DE_GRAMINEA[(b + c) % TONS_DE_GRAMINEA.length]!,
        )
      }
    }

    /**
     * ESTRATO DA FRENTE: flor e planta pendente, derramando sobre a calha.
     *
     * A pendente quebra a LINHA DA CALHA — reta dura entre o piso e a massa
     * verde denuncia o canteiro como caixa —, e a flor é a única cor não-verde do
     * jardim. Jardim só de verde lê como massa por mais espécies que tenha,
     * porque o olho agrupa tudo no mesmo balde.
     */
    for (let c = 0; c < 26; c++) {
      const xc = -meiaLargura + 0.7 + (c / 25) * (meiaLargura * 2 - 1.4)
      if (noVaoDoEscritorio(xc) || atrasDoBar(xc)) continue
      for (let fl = 0; fl < 6; fl++) {
        const a = ruido(fl, 430 + c) * Math.PI * 2
        const r = ruido(fl, 431 + c) * 0.3
        col.poe(
          'flor',
          gFlor,
          mFlor,
          [
            xc + Math.sin(a) * r,
            piso + 0.66 + ruido(fl, 432 + c) * 0.52,
            zFrenteVerde - 0.35 + Math.cos(a) * r * 0.7,
          ],
          [0, ruido(fl, 433 + c) * 3, 0],
          (() => {
            const e = 0.5 + ruido(fl, 434 + c) * 0.6
            return [e, e * 0.7, e] as [number, number, number]
          })(),
          TONS_DE_FLOR[(fl + c) % TONS_DE_FLOR.length]!,
        )
      }
      const comp = 0.34 + ruido(c, 440) * 0.6
      col.poe(
        'pendente',
        gPendente,
        mFolha,
        [xc, piso + 0.5 - comp * 0.42, zFrenteVerde],
        [0.42 + ruido(c, 441) * 0.5, ruido(c, 442) * 3, 0],
        [1, comp / 0.42, 1],
        TONS_DE_OLIVA[c % TONS_DE_OLIVA.length]!,
      )
      for (let fo = 0; fo < 9; fo++)
        col.poe(
          'folhaLarga',
          gFolhaLarga,
          mFolhaLarga,
          [
            xc + (ruido(fo, 443 + c) - 0.5) * 0.24,
            piso + 0.48 - (fo / 6) * comp,
            zFrenteVerde + 0.06,
          ],
          [1.2, ruido(fo, 444 + c) * 3, ruido(fo, 445 + c) * 2],
          [0.8, 0.8, 0.8],
          TONS_DE_OLIVA[(fo + c) % TONS_DE_OLIVA.length]!,
        )
    }
    /**
    /**
     * A VEGETACAO DE PRIMEIRO PLANO SAIU — os dois vasos grandes de x = +-6,0,
     * com os 82 folhados e as pendentes de cada um, a pedido do dono.
     *
     * O argumento que estava escrito aqui era de ESCALA, e era correto: planta no
     * canteiro do fundo esta a 16,75 m da camera e ocupa 68 px; a mesma planta a
     * 6 m ocupa 150. Massa no primeiro plano compra profundidade que nenhuma
     * densidade no fundo compra, e vaso grande nas duas bordas emoldura o quadro.
     *
     * O que mudou foi o que existe para ser visto. Quando esse argumento foi
     * escrito, o terraco tinha deck, piscina e canteiro; hoje ele tem um
     * escritorio envidracado aceso na esquerda, um nicho de bar retroiluminado na
     * direita e uma cascata correndo a parede do fundo. A moldura deixou de
     * enquadrar e passou a TAPAR — e o dono pediu tres vezes seguidas para limpar
     * a frente dessas pecas.
     *
     * A profundidade nao se perde: quem faz o plano proximo agora e a propria
     * piscina, que avancou 2,28 m e ocupa a faixa inteira entre o canteiro e o
     * guarda-corpo.
     */

    /**
     * AS LUMINARIAS, e cada uma resolve uma area chapada especifica.
     *
     * BALIZADOR NO DECK: disco embutido rente a tabua, a cada 2,4 m. E o que
     * quebra a monotonia do piso — deck inteiro num valor so era um terco do
     * quadro sem informacao. Cada balizador acende um circulo de meio metro e
     * deixa o resto na penumbra, e e a alternancia que da textura ao chao.
     *
     * FACHO NA PAREDE DO FUNDO: e ali que a cena mais precisava. Depois que o
     * cenario de parallax saiu, a parede virou a MAIOR area lisa do quadro —
     * trinta metros de concreto num valor so. Sete fachos em leque transformam
     * esse plano numa sequencia de claro e escuro, que e exatamente o que
     * iluminacao de fachada faz na vida real e pela mesma razao.
     *
     * PORTA DA ESCADA ACESA: um retangulo quente no meio do concreto. E a unica
     * coisa da cena que diz que ha ALGUEM la dentro, e custa um plano.
     */
    for (let bz = 0; bz < 13; bz++) {
      const xb = -meiaLargura + 1.2 + bz * 2.4
      col.poe('balizador', gBalizador, mBalizador, [xb, piso + 0.028, zCentro + prof * 0.33])
    }
    /**
     * OS SETE FACHOS DE PAREDE SAÍRAM, E NO LUGAR DELES ENTRA UMA CASCATA.
     *
     * O argumento para os fachos continua verdadeiro: depois que o cenário de
     * parallax saiu, a parede virou a maior área lisa do quadro, e sete leques de
     * claro e escuro eram muito mais barato que qualquer outra coisa. O problema
     * é que eles resolvem o valor e não resolvem a ATENÇÃO — sete manchas iguais
     * espalhadas por trinta metros são um padrão, e padrão o olho descarta.
     *
     * A cascata resolve as duas de uma vez e ainda fecha um círculo com a
     * piscina: o terraço passa a ter água em dois estados (parada no chão,
     * correndo na parede) em vez de um adereço de iluminação.
     *
     * Aqui ficam só as PEÇAS SÓLIDAS — a soleira que derrama em cima e a calha
     * que recebe embaixo. O véu em si é transparente e vive no bloco JSX, pela
     * mesma razão do pano de vidro do escritório: `InstancedMesh` transparente é
     * ordenada como um objeto só, e este precisa ser desenhado depois da parede.
     */
    for (const [de, ate] of TRECHOS_DA_CASCATA(xEsc, LARG_ESC, meiaLargura)) {
      const meio = (de + ate) / 2
      const larg = ate - de
      // Soleira: a pedra de onde a água transborda. Sem ela o véu nasce do nada
      // no meio do concreto — e é a linha de sombra embaixo dela que dá o degrau.
      bloco('soleiraCascata', mPedra, [meio, piso + 3.18, zParedeFundo + 0.09], [larg, 0.12, 0.26])
      // Calha: a bacia que recebe a queda. Ela fica atrás do maciço do fundo e
      // quase não aparece — mas água que desce e não chega a lugar nenhum lê como
      // projeção de vídeo, e o custo de dizer para onde ela vai é uma caixa.
      bloco('calhaCascata', mPedra, [meio, piso + 0.16, zParedeFundo + 0.22], [larg, 0.32, 0.5])
      bloco('aguaCalha', mAguaParada, [meio, piso + 0.29, zParedeFundo + 0.22], [larg - 0.1, 0.02, 0.42])
      /**
       * A FITA NA CALHA É A FONTE VISÍVEL da iluminação da cascata.
       *
       * O véu acende por emissivo no material dele (ver o bloco JSX), e emissivo
       * sozinho não tem de onde vir: a lâmina brilharia sem nenhuma peça na cena
       * justificando o brilho, que é o tipo de coisa que o olho estranha sem
       * saber nomear. A fita resolve isso por uma instância — ela fica no fundo
       * da calha, atrás da lâmina de água parada, e é ela que se lê como o ponto
       * de onde a luz sobe.
       *
       * Fica 4 cm ATRÁS do véu de propósito: à frente, ela apareceria como uma
       * linha acesa sobre a água em vez de por baixo dela.
       */
      col.poe(
        'fitaCascata',
        gFitaLed,
        mFitaAgua,
        [meio, piso + 0.24, zParedeFundo + 0.06],
        [0, 0, 0],
        [larg - 0.2, 1, 1],
      )
    }
    /**
     * O RETÂNGULO QUENTE DA PORTA SAIU, e não foi substituído por outro.
     *
     * Ele existia como o único sinal de que havia alguém do outro lado de um
     * concreto cego. Agora o outro lado é um escritório inteiro, visível, com
     * estante, mesa, tela acesa e três pendentes. Manter o adesivo quente por
     * cima disso seria um segundo sinal para o mesmo fato — e um plano opaco de
     * `MeshBasicMaterial` na frente do pano de vidro apagaria justamente o que
     * ele existia para sugerir.
     */
    // O DERRAME NO DECK: a mancha quente que o escritório joga na madeira. É a
    // mesma peça aditiva dos fachos de parede, deitada. Sem ela o interior fica
    // aceso e o deck na frente dele continua na penumbra — e aí a caixa de vidro
    // lê como fotografia colada, não como fonte.
    col.poe(
      'facho',
      gFacho,
      mFacho,
      [xEsc, piso + 0.028, zFrenteEsc + 1.5],
      [-Math.PI / 2, 0, 0],
      [11.5, 3.4, 1],
    )
    // Fita de LED sob o tampo do bar: desenha a linha do movel no escuro.
    col.poe('fitaLed', gFitaLed, mFitaLed, [9.0, piso + 0.98, zBar + 0.36], [0, 0, 0], [4.4, 1, 1])
    // E atras das garrafas: prateleira retroiluminada, que e o que faz um bar
    // ler como bar de noite.
    for (const y of [0.62, 1.12, 1.6])
      col.poe('fitaLed', gFitaLed, mFitaLed, [9.0, piso + y + 0.04, zBar - 1.58], [0, 0, 0], [4.2, 1, 1])

    /**
     * O BUXO APARADO SAIU — as cinco bolas verdes, a pedido do dono.
     *
     * O argumento a favor delas era bom e continua verdadeiro em tese: era a
     * única fileira da cena onde a regularidade É o efeito, a mão do projetista
     * contra a desordem do resto. O que mudou foi o entorno. Aquela faixa passou
     * a ter cascata na parede e piscina avançando até ela, e cinco esferas de
     * verde chapado em espaçamento de régua na frente de água correndo leem como
     * enfeite de vitrine, não como projeto.
     *
     * Vale registrar o que a remoção não é: não é "esferas são feias". É que
     * `gBuxo` é um icosaedro sólido de UM verde só, sem recorte, sem relevo e
     * sem variação — a única planta da cobertura que nunca recebeu o tratamento
     * que folha, fronde, casca e gramínea receberam. Ela sobreviveu por ser
     * pequena, e ficou devendo desde então.
     */

    /**
     * O AGAVE EM VASO SAIU TAMBEM — a ultima peca solta do piso do terraco.
     *
     * Ele entrou por CONTRASTE DE FORMA: o jardim era feito de duas texturas
     * macias (tufo de oliveira e chafariz de graminea) e faltava uma forma DURA.
     * O argumento valia enquanto o terraco fosse so jardim.
     *
     * Hoje a forma dura vem da arquitetura: caixilho do escritorio, montante do
     * nicho do bar, soleira da cascata, pedra da borda da piscina. Um vaso
     * pontual no meio do deck deixou de contrastar com alguma coisa e passou a
     * ser o que o dono chamou de jarro — objeto no caminho.
     *
     * Com ele saem os dois ultimos vasos do piso. O que sobra plantado na
     * cobertura esta todo NA CALHA de corten, que e onde planta de laje vive de
     * verdade: e ali que passa a impermeabilizacao e a irrigacao.
     */

    /**
     * A ESCADA DA PISCINA, e ela faz mais do que parece.
     *
     * Duas coisas. A primeira e semantica: piscina sem escada e espelho d'agua,
     * e espelho d'agua nao se entra. A escada e o objeto que declara que aquela
     * lamina e para USAR — muda o que a cobertura inteira diz.
     *
     * A segunda e de composicao: dois arcos de metal polido subindo acima da
     * linha d'agua sao a unica VERTICAL fina no meio de uma area que e toda
     * horizontal, e eles pegam o sol rasante num filete brilhante. E o acento
     * que a piscina nao tinha.
     */
    for (const dx of [-0.22, 0.22]) {
      col.poe('hasteEscada', gHasteEscada, mMetal, [4.3 + dx, piso + 0.02, zDaEscada])
      col.poe('corrimaoEscada', gCorrimaoEscada, mMetal, [4.3 + dx, piso + 0.28, zDaEscada], [0, 0, 0])
    }
    // Degrau submerso: a prateleira rasa que toda piscina tem na entrada. Vista
    // atraves da agua ela desenha uma faixa mais clara no fundo escuro, e e essa
    // faixa que da PROFUNDIDADE — fundo de cor uniforme le como chapa pintada.
    col.poe('degrauSubmerso', gDegrauSubmerso, mPedra, [4.3, piso - 0.08, zDaEscada - 0.3])

    // ── guarda-corpo ──────────────────────────────────────────────────────
    const montantes = Math.floor((meiaLargura * 2) / 2.1)
    for (let i = 0; i <= montantes; i++) {
      const x = -meiaLargura + i * 2.1
      col.poe('montante', gMontanteVidro, mAco, [x, piso + 0.74, zGuarda])
      // Chapa de base parafusada no deck: nenhum guarda-corpo BROTA do piso.
      col.poe('chapaBase', gChapaBase, mAco, [x, piso + 0.036, zGuarda])
      // Espaçadores: os dois botões de aço que prendem a chapa de vidro. É a
      // peça que dá escala ao guarda-corpo e prova que o vidro está preso.
      for (const dy of [0.42, 1.02])
        col.poe('espacador', gEspacador, mMetal, [x, piso + dy, zGuarda + 0.04], [Math.PI / 2, 0, 0])
    }

    const saida: THREE.Object3D[] = col.colhe()
    // Os fios do varal sao FUNDIDOS, nao instanciados: tres catenarias entre
    // pontos diferentes nao sao a mesma curva escalada — esticar em X e achatar
    // em Y deforma a secao do tubo e vira fita. E a mesma razao do cabeamento do
    // andar 07, e o mesmo remedio: uma malha para os tres fios.
    const fundida = fiosDoVaral.length ? mergeGeometries(fiosDoVaral, false) : null
    for (const g of fiosDoVaral) g.dispose()
    if (fundida) {
      const fio = new THREE.Mesh(fundida, mFio)
      fio.castShadow = true
      fio.frustumCulled = false
      saida.push(fio)
    }
    return saida
  }, [piso, zCentro, prof, meiaLargura])

  /**
   * `useEffect`, E NÃO `useMemo` — este era o bug que o dono reportou três vezes.
   *
   * O bloco estava escrito como `useMemo(() => { …add…; return () => …remove… })`.
   * `useMemo` MEMORIZA O VALOR DE RETORNO: aquela função de limpeza virava um
   * valor guardado que ninguém jamais chamou. As malhas entravam na cena e nunca
   * saíam.
   *
   * O vazamento ficava invisível enquanto `malhas` não recalculasse. Só que ele
   * depende de `prof`, e `prof` TROCA na descida: o andar nasce em parallax
   * (profundidade 7) e é promovido a perspectiva (13) quando a câmera se
   * aproxima. Nesse instante o coletor monta um terraço inteiro novo, e o antigo
   * continua na cena — dois metros e meio mais raso, com tudo em escala errada.
   *
   * Daí saíram os três defeitos que chegaram como problemas separados:
   *  - "parece ter duas estruturas de proteção de vidro" — dois guarda-corpos.
   *  - "a estrutura de madeira está desalinhada e invadindo o escritório" — dois
   *    pergolados em profundidades diferentes, o mais raso cruzando o vidro.
   *  - "por trás do escritório e do bar parece se repetir" — literalmente um
   *    segundo escritório e um segundo bar.
   *
   * Três sintomas, uma causa, e nenhum deles no objeto que parecia culpado. É a
   * mesma lição que já ficou escrita nesta feature quando os pilares sumiram e o
   * defeito continuou: quando o problema SOBREVIVE à correção do suspeito
   * óbvio, o suspeito era outro.
   *
   * A limpeza também DESCARTA a geometria. Cada montagem cria as suas do zero;
   * sem descartar, cada promoção de andar deixaria os buffers da anterior na
   * GPU. Os materiais ficam de fora de propósito: alguns carregam textura vinda
   * de cache compartilhado entre andares, e liberar isso aqui apagaria o
   * concreto dos vizinhos.
   */
  useEffect(() => {
    for (const m of malhas) scene.add(m)
    return () => {
      for (const m of malhas) {
        scene.remove(m)
        // `malhas` é `Object3D[]` porque o andar mistura instâncias do coletor
        // com as malhas fundidas do varal; só as que têm geometria descartam.
        if (m instanceof THREE.Mesh) m.geometry.dispose()
      }
    }
  }, [malhas, scene])

  const piscina = piscinaZ(zCentro, prof)
  const zEspelho = piscina.centro
  const zGuardaCorpo = zCentro + prof * 0.4
  /**
   * A CASCATA. O véu vive aqui e não no coletor porque é transparente — mesma
   * razão do pano de vidro do escritório: `InstancedMesh` transparente é
   * ordenada como um objeto só, e este precisa ser desenhado depois da parede
   * que ele cobre.
   *
   * A repetição em U é a largura do trecho dividida por 1,4 m, e não um número
   * fixo: dois trechos de larguras diferentes com a mesma repetição teriam
   * cordões de espessuras diferentes, e nada denuncia textura repetida mais
   * rápido que escala inconsistente entre peças vizinhas.
   */
  const aguaDaParede = useMemo(() => veuDagua(), [])
  const trechos = TRECHOS_DA_CASCATA(ESCRITORIO.x, ESCRITORIO.largura, meiaLargura)
  const zParedeFundo = zDaParedeDoAndar(zCentro, prof)
  /**
   * A QUEDA É ANIMADA POR `offset`, e é a coisa mais barata que existe: um
   * número por quadro, nenhuma geometria tocada, nenhum material recompilado.
   *
   * Água parada numa parede vertical não existe — sem movimento o véu lê como
   * vidro canelado, que é o oposto do que ele deve dizer. E o mapa de NORMAL
   * anda mais devagar que o de cor (0,38 contra 0,52) de propósito: o relevo é o
   * cordão, que desce com a massa d'água, e a cor carrega a aeração, que corre
   * mais rápido que o cordão porque é ar arrastado. A diferença entre as duas
   * velocidades é o que dá a impressão de fluxo em vez de fita rolando.
   */
  /**
   * O SINAL É `+=`, E NÃO `-=` — a primeira versão fazia a água SUBIR.
   *
   * O fragmento amostra `uv + offset`. Aumentar `offset.y` faz cada ponto da
   * tela ler um trecho MAIS ALTO da textura, e o conteúdo que estava em cima
   * aparece embaixo: a imagem desce. Subtrair faz o contrário.
   *
   * É contraintuitivo o bastante para errar na primeira, e impossível de não ver
   * no render — foi o dono quem apontou. Fica escrito porque o próximo a mexer
   * aqui vai ter exatamente a mesma dúvida.
   */
  useFrame((_, delta) => {
    // O passo é limitado porque `delta` estoura quando a aba volta do segundo
    // plano, e um salto de meio segundo teleportaria a queda.
    const passo = Math.min(delta, 0.05)
    aguaDaParede.map.offset.y += passo * 0.52
    aguaDaParede.normalMap.offset.y += passo * 0.38
    aguaDaParede.roughnessMap.offset.y += passo * 0.38
  })
  // Repetidos do bloco instanciado de propósito: o vidro e a luz são as duas
  // únicas peças do escritório que NÃO podem ser instanciadas — uma é
  // transparente (precisa ordenar contra o interior) e a outra não é geometria.
  const xEsc = ESCRITORIO.x
  const zFrenteEsc = zDoEscritorio(zCentro, prof) + ESCRITORIO.profundidade / 2

  return (
    <>
      {/* ═══ A CASCATA DA PAREDE DO FUNDO ═══
       *
       * Entrou no lugar dos sete fachos de lavagem. Eles resolviam o VALOR da
       * parede — trinta metros de concreto num tom só — e não resolviam a
       * atenção: sete manchas iguais são um padrão, e padrão o olho descarta.
       *
       * Opacidade 0,74 e não 1: véu d'água é fino, e o concreto tem de aparecer
       * por trás dele. É essa transparência parcial que separa "água correndo
       * numa parede" de "parede pintada de azul" — o mesmo raciocínio do vidro
       * do guarda-corpo, com o número no outro extremo, porque aqui a peça
       * PRECISA ser vista.
       *
       * `envMapIntensity` alto com rugosidade baixa é o que faz o véu pegar o
       * céu do entardecer e acender em faixa vertical. Sem isso ele seria uma
       * superfície texturada e escura, que é o que água sem reflexo é. */}
      {trechos.map(([de, ate]) => (
        <mesh key={de} position={[(de + ate) / 2, piso + 1.72, zParedeFundo + 0.05]}>
          <planeGeometry args={[ate - de, 2.86]} />
          <meshStandardMaterial
            // Escuro e metálico, e não azul-claro. A cor da água é a cor do que
            // ela reflete: com `metalness` alta e rugosidade quase zero, quem
            // pinta o véu é o céu do entardecer, em faixa vertical. Um azul
            // pintado à mão compete com esse reflexo e vence — foi o que
            // aconteceu na primeira tentativa, e o resultado foi vidro jateado.
            color="#7d9aa6"
            roughness={0.05}
            metalness={0.3}
            envMapIntensity={2.2}
            transparent
            opacity={0.82}
            /**
             * O VÉU ACENDE POR EMISSIVO, e não por uma luz nova.
             *
             * Instalação de água iluminada é sempre iluminada POR DENTRO — a
             * fita fica na calha e a luz sobe atravessando a lâmina, que é o que
             * faz a água inteira brilhar em vez de ter uma mancha clara. Imitar
             * isso com uma `pointLight` exigiria pôr a fonte dentro da calha e
             * torcer para o alcance cobrir três metros de altura, e cada luz
             * nova recompila o shader de todos os materiais da cena.
             *
             * O emissivo dá a leitura certa por zero luzes: o véu tem valor
             * próprio, não some quando o céu escurece, e o gradiente vertical de
             * verdade fica por conta da fita na calha, que é sólida e aparece.
             *
             * Verde-azulado e não branco: água iluminada por baixo puxa o
             * turquesa, porque a própria massa d'água filtra o vermelho. Branco
             * aqui leria como painel de LED.
             */
            emissive={new THREE.Color('#1f5c6e')}
            /**
             * 0,38 E NÃO 0,55 — com 0,55 o véu virou uma CHAPA turquesa.
             *
             * Emissivo é um valor somado por igual em cada pixel: quanto mais
             * alto, mais ele achata a diferença entre o cordão aceso e o vão
             * escuro — e é justamente essa diferença que se lê como água
             * correndo. Acender demais uma superfície apaga a textura dela, e o
             * primeiro render com 0,55 mostrou exatamente isso: acesa, sim, e
             * com cara de painel de LED em vez de cascata.
             */
            emissiveIntensity={0.38}
            map={aguaDaParede.map}
            normalMap={aguaDaParede.normalMap}
            normalScale={new THREE.Vector2(1.6, 1.6)}
            roughnessMap={aguaDaParede.roughnessMap}
            onUpdate={(m) => {
              // A repetição sai da LARGURA DO TRECHO: com um número fixo, os dois
              // trechos (um de 4 m, outro de 20) teriam cordões de espessuras
              // diferentes lado a lado.
              for (const t of [m.map, m.normalMap, m.roughnessMap]) {
                if (!t) continue
                t.repeat.set((ate - de) / 1.4, 1)
                t.needsUpdate = true
              }
            }}
          />
        </mesh>
      ))}
      {/* ═══ O PANO DE VIDRO DO ESCRITÓRIO ═══
       *
       * Fica AQUI e não no coletor por uma razão só: transparência. Uma
       * `InstancedMesh` transparente é ordenada como um objeto único, e o que
       * este plano precisa é ser desenhado DEPOIS de tudo que está atrás dele —
       * estante, mesa, cadeira, painel aceso. Fora do coletor, o three resolve
       * isso sozinho pela ordem de profundidade.
       *
       * OPACIDADE 0,12, pelo mesmo motivo medido no guarda-corpo: vidro real
       * visto de frente é quase invisível. Quem denuncia o pano é o CAIXILHO e o
       * reflexo — nunca uma névoa cinza por cima do que ele deveria mostrar. Com
       * 0,3 o interior inteiro, que é a coisa mais cara desta entrega, ficaria
       * atrás de um véu.
       *
       * `roughness` baixíssima com `envMapIntensity` alta é o que faz o pano
       * devolver o céu do entardecer em faixa — é esse filete que diz "vidro" à
       * distância em que o caixilho já tem dois pixels. */}
      <mesh position={[xEsc, piso + 1.46, zFrenteEsc + 0.05]}>
        <planeGeometry args={[5.8, 2.92]} />
        <meshStandardMaterial
          color="#cfe2ee"
          roughness={0.04}
          metalness={0.28}
          envMapIntensity={1.5}
          transparent
          opacity={0.12}
          depthWrite={false}
        />
      </mesh>
      {/* A ÚNICA LUZ ADICIONADA À CENA, e ela é necessária porque o emissivo do
       * three NÃO ILUMINA nada. O painel do fundo APARECE aceso; sem uma fonte
       * de verdade, a estante, a mesa e a cadeira na frente dele ficariam pretas
       * — silhuetas recortadas contra uma chapa laranja.
       *
       * Fica à FRENTE do miolo (z do vidro menos meio metro) e não no centro do
       * volume: assim ela lava o mobiliário pela face que a câmera vê, em vez de
       * lavar a parede do fundo que já está acesa por conta própria.
       *
       * `decay` 2 é o físico, e `distance` 7 é o corte que impede o pouco que
       * sobra de alcançar a jardineira do fundo e acender a folhagem por dentro.
       * Sem sombra de propósito: uma sombra a mais custa um passe de mapa e o
       * que ela resolveria aqui — a luz atravessar a parede de trás — não é
       * visível de nenhum ângulo que a descida use. */}
      <pointLight
        position={[xEsc + 0.9, piso + 1.9, zFrenteEsc - 0.5]}
        color="#ffc98c"
        intensity={9}
        distance={7}
        decay={2}
      />
      {/* A SEGUNDA LUZ, SÓ PARA A ESTANTE. O primeiro render deixou claro que uma
       * fonte não basta: com a luz sobre a mesa, a estante — que está 2,5 m à
       * esquerda e recuada contra o fundo — caía a menos de um sexto da
       * iluminação e ficava PRETA. Trinta e duas lombadas coloridas desenhadas e
       * nenhuma visível.
       *
       * Ela é fraca (4) e curta (4,5 m) de propósito: não é uma segunda fonte
       * ambiente, é o banho rasante que uma estante de verdade tem, com o foco
       * embutido no forro logo à frente dela. Por isso fica ALTA e um palmo à
       * frente das prateleiras — luz vinda de cima e de fora é o que revela a
       * lombada; luz de frente achataria tudo. */}
      <pointLight
        position={[xEsc - 1.55, piso + 2.3, zFrenteEsc - 1.35]}
        color="#ffd2a0"
        intensity={4}
        distance={4.5}
        decay={2}
      />
      {/* A LUZ DO BAR, sob a bandeira. Mesmo problema do escritório: o nicho
       * emissivo APARECE aceso e não ilumina nada, então o tampo de pedra, as
       * banquetas e a frente do balcão ficariam pretos — e um bar cujo balcão é
       * uma silhueta não convida ninguém a encostar nele.
       *
       * Âmbar mais fechado que a do escritório (#ffb066 contra #ffc98c): são dois
       * pontos acesos no mesmo quadro, e a diferença de temperatura é o que
       * impede um de parecer a cópia do outro. Alcance curto (4 m) para o quente
       * morrer antes da piscina. */}
      <pointLight
        position={[9.0, piso + 2.05, zCentro - prof * 0.208 - 0.3]}
        color="#ffb066"
        intensity={5.5}
        distance={4}
        decay={2}
      />
      {/* O FUNDO DA PISCINA, e ele existe por causa de como água se vê.
       * Uma lâmina sem fundo é uma superfície; com fundo, o olho lê VOLUME —
       * a cor escura por baixo através da água translúcida é metade do que faz
       * uma piscina parecer cheia. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1, piso - 0.22, zEspelho]}>
        <planeGeometry args={[9, piscina.profundidade]} />
        <meshStandardMaterial color="#17495a" roughness={0.9} />
      </mesh>
      {/* A LÂMINA D'ÁGUA.
       *
       * RUGOSIDADE 0,3 foi o número que a fez virar água, e não a cor: eu troquei
       * a cor duas vezes e as duas saiu cinza. A câmera olha a lâmina a 7,8° do
       * horizonte, e nesse ângulo rasante o Fresnel manda a refletividade para
       * perto de 1 — superfície lisa vira ESPELHO e devolve um céu pálido.
       * Cinza-claro era a resposta fisicamente certa.
       *
       * O MAPA DE NORMAL é o que faltava depois disso. Água não é plana: o que
       * a torna reconhecível é o reflexo QUEBRANDO em ondulação. Com a
       * superfície lisa, o reflexo do céu fica inteiro e limpo, e lâmina de
       * reflexo limpo lê como vidro ou como chapa — nunca como água. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1, piso + 0.06, zEspelho]}>
        <planeGeometry args={[9, piscina.profundidade]} />
        <meshStandardMaterial
          color="#2d8ba1"
          roughness={0.3}
          metalness={0.05}
          envMapIntensity={0.9}
          transparent
          opacity={0.86}
          normalMap={ondaDagua}
          normalScale={new THREE.Vector2(0.35, 0.35)}
        />
      </mesh>
      {/* BORDA DA LÂMINA, e ela já ENGOLIU a água uma vez: a caixa de pedra
       * tinha o topo 2,5 cm ACIMA do plano d'água e cobria a lâmina inteira, o
       * que se via era uma laje branca. Agora o topo fica 1 cm abaixo e a pedra
       * aparece como moldura em volta. */}
      {/* VIROU QUATRO PEÇAS, e a mudança é de leitura e não de forma. Era uma
       * caixa cheia por baixo da água: servia de moldura vista de cima, mas por
       * trás dela não havia nada — a lâmina simplesmente terminava. Piscina de
       * verdade tem BORDA DE ACABAMENTO, uma peça que envolve o tanque e sobe um
       * pouco ACIMA do nível da água. É esse degrau de um centímetro que diz que
       * a água está CONTIDA; sem ele a lâmina lê como poça sobre o deck.
       *
       * Quatro peças porque a moldura precisa ter espessura visível nos quatro
       * lados, e uma caixa só mostra o lado de fora. */}
      {[piscina.frente + 0.195, piscina.fundo - 0.195].map((cz) => (
        <mesh key={cz} position={[1, piso + 0.045, cz]}>
          <boxGeometry args={[9.9, 0.09, 0.42]} />
          <meshStandardMaterial color="#cfc4ad" roughness={0.82} />
        </mesh>
      ))}
      {[-3.74, 5.74].map((bx) => (
        <mesh key={bx} position={[bx, piso + 0.045, zEspelho]}>
          <boxGeometry args={[0.42, 0.09, piscina.profundidade + 0.39]} />
          <meshStandardMaterial color="#cfc4ad" roughness={0.82} />
        </mesh>
      ))}
      {/* O TANQUE: as paredes que seguram a água. Sem elas o fundo escuro fica
       * flutuando e vê-se o deck por baixo pela lateral.
       *
       * O TOPO DELE FICA ABAIXO DA LÂMINA, e isso não é detalhe: na primeira
       * versão o centro em "piso − 0,10" com 0,34 de altura punha a face de cima
       * em "piso + 0,07", um centímetro ACIMA do plano d'água em "piso + 0,06".
       * O resultado foi a tampa escura do tanque cobrindo a água inteira e a
       * piscina virando uma faixa azul-marinho. É exatamente o mesmo erro da
       * pedra que já engoliu a lâmina uma vez, agora vindo por baixo — e a lição
       * é a mesma: numa pilha de planos separados por centímetros, é a ORDEM em
       * y que decide o que se vê, não a intenção de quem escreveu. */}
      <mesh position={[1, piso - 0.2, zEspelho]}>
        <boxGeometry args={[9.04, 0.34, piscina.profundidade + 0.13]} />
        <meshStandardMaterial color="#1d5b6d" roughness={0.75} />
      </mesh>
      {/* O VIDRO DO GUARDA-CORPO, com 0,07 de opacidade — medido. Um plano de
       * 30 m a 5,6 m da câmera cobre a faixa y 407..495 da tela, que é
       * exatamente onde a piscina e as espreguiçadeiras estão; com 0,18 aquilo
       * virava névoa sobre o miolo do quadro, e foi ELA (não o material da
       * água) que deixou a piscina cinza. Vidro real visto de frente é quase
       * invisível: quem denuncia a balaustrada é o montante e o corrimão. */}
      <mesh position={[0, piso + 0.75, zGuardaCorpo]}>
        <planeGeometry args={[meiaLargura * 2, 0.82]} />
        <meshStandardMaterial
          color="#dbeaf3"
          roughness={0.06}
          metalness={0.2}
          transparent
          opacity={0.07}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* CORRIMAO REDONDO. Perfil quadrado num corrimao e o que nenhuma
       * serralheria entrega, porque ninguem quer apoiar a mao numa quina — e o
       * tubo redondo tem outra vantagem otica: ele devolve um FILETE de sol
       * continuo ao longo de toda a extensao, e e esse filete que desenha a
       * linha do terraco contra o ceu. Uma barra chata so acende quando a
       * normal dela aponta para o sol, e nesta cena ela nao aponta. */}
      <mesh position={[0, piso + 1.17, zGuardaCorpo]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.016, 0.016, meiaLargura * 2, 12]} />
        <meshStandardMaterial color="#d8cdb8" metalness={0.85} roughness={0.28} />
      </mesh>
    </>
  )
}
