'use client'
import { useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Coletor } from './predio-instancias'
import { concreto, madeiraDeDeck, normalDeAgua, tecido } from './predio-materiais'

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
    const lona = tecido()

    // ── geometrias ────────────────────────────────────────────────────────
    // Raio de 5 mm na régua: é o chanfro que uma régua de deck de verdade tem,
    // e é ele que produz a linha de luz no topo de cada tábua.
    const gRipa = new RoundedBoxGeometry(0.16, 0.022, prof * 0.92, 1, 0.005)

    // ESPREGUIÇADEIRA. Estrutura tubular + estofado, não duas caixas.
    // GOMOS, nao uma almofada inteira: e a costura que faz o estofado ler como
    // macio. Ver o comentario no ponto de uso.
    const gGomoAssento = new RoundedBoxGeometry(0.68, 0.13, 0.38, 2, 0.055)
    const gGomoEncosto = new RoundedBoxGeometry(0.68, 0.12, 0.4, 2, 0.05)
    // Doze lados e nao oito: com a camera assentando a 5,9 m, um tubo de oito
    // lados mostra a faceta e o reflexo anda em degraus ao longo dele.
    const gTuboLado = new THREE.CylinderGeometry(0.021, 0.021, 1.98, 12)
    const gPernaEspr = new THREE.CylinderGeometry(0.017, 0.017, 0.32, 8)
    const gRoda = new THREE.CylinderGeometry(0.055, 0.055, 0.032, 16)
    const gToalha = new RoundedBoxGeometry(0.52, 0.035, 1.0, 1, 0.017)
    // A almofada nao fica solta em cima do tubo: ela assenta DENTRO de um
    // caixilho. E a longarina do caixilho, aparecendo rente ao estofado, que diz
    // que a peca tem estrutura por baixo em vez de ser um colchao no chao.
    const gLongarina = new RoundedBoxGeometry(0.045, 0.055, 1.94, 1, 0.012)
    const gBraco = new THREE.TorusGeometry(0.17, 0.019, 6, 10, Math.PI)
    const gSapata = new THREE.CylinderGeometry(0.026, 0.032, 0.018, 8)

    // PERGOLADO. Viga com chanfro e chapa de aço no encontro com o poste — é a
    // ferragem que diz "construído" em vez de "empilhado".
    const gPoste = new RoundedBoxGeometry(0.15, 2.6, 0.15, 1, 0.008)
    const gRipaPergola = new RoundedBoxGeometry(0.085, 0.13, 4.6, 1, 0.006)
    const gVigaPergola = new RoundedBoxGeometry(12.2, 0.2, 0.17, 1, 0.008)
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
    const gFolhaChata = new THREE.PlaneGeometry(0.14, 0.072)
    // Folha de oliveira e LANCEOLADA: estreita e comprida, quase uma lamina.
    const gFolhaOliva = new THREE.PlaneGeometry(0.19, 0.048)

    // GUARDA-SOL. Perfil em `Lathe` com CAIMENTO: lona esticada por varetas
    // afunda entre elas, então o corte não é reto — é uma curva côncava. Cone
    // perfeito é o que faz guarda-sol parecer chapéu de festa.
    const perfilLona = [
      new THREE.Vector2(0.0, 0.36),
      new THREE.Vector2(0.28, 0.32),
      new THREE.Vector2(0.62, 0.24),
      new THREE.Vector2(0.98, 0.13),
      new THREE.Vector2(1.28, 0.02),
      new THREE.Vector2(1.48, -0.08),
      new THREE.Vector2(1.5, -0.13),
    ]
    // 8 segmentos de propósito: a borda sai recortada em oito pontas, que é
    // exatamente o número de varetas de um guarda-sol de mercado.
    const gLona = new THREE.LatheGeometry(perfilLona, 8)
    const gMastro = new THREE.CylinderGeometry(0.036, 0.042, 2.3, 14)
    const gVareta = new THREE.BoxGeometry(0.018, 0.016, 1.34)
    const gPonteira = new THREE.ConeGeometry(0.055, 0.16, 8)
    // CUBO DAS VARETAS: o anel onde as oito varetas se encontram no mastro.
    // Sem ele as varetas nascem do nada no meio do ar.
    const gCubo8 = new THREE.CylinderGeometry(0.075, 0.09, 0.11, 8)
    // BABADO do guarda-sol: a saia curta que pende da borda. E o detalhe que
    // separa guarda-sol de mercado de cone de papel.
    const gBabado = new THREE.CylinderGeometry(1.5, 1.44, 0.13, 8, 1, true)
    // BASE do guarda-sol: disco pesado de concreto. Guarda-sol sem base voa, e
    // o olho sabe disso mesmo sem pensar — mastro entrando direto no deck le
    // como adereco espetado.
    const gBaseSol = new THREE.CylinderGeometry(0.3, 0.34, 0.09, 16)

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
    const perfilVasinho = perfilVaso.map((p) => new THREE.Vector2(p.x * 0.62, p.y * 0.55))
    const gVaso = new THREE.LatheGeometry(perfilVasinho, 14)

    // ÁRVORE. Tronco CÔNICO, galhos e copa de muitos tufos facetados. O
    // icosaedro sem subdivisão é melhor que esfera aqui: a faceta lê como massa
    // de folhagem, a esfera lisa lê como bola.
    // OLIVEIRA. Tronco curto e grosso em relacao a copa — oliveira nao e alta,
    // e ampla. Tres deles saem da mesma base.
    const gTroncoOliva = new THREE.CylinderGeometry(0.055, 0.1, 1.2, 7)
    const gGalhoOliva = new THREE.CylinderGeometry(0.018, 0.042, 0.58, 5)
    // Tufo PEQUENO: a copa aberta precisa de muitos pequenos, nao poucos grandes.
    const gTufoOliva = new THREE.IcosahedronGeometry(0.27, 0)
    const gArbusto = new THREE.IcosahedronGeometry(0.2, 0)
    // BUXO: subdividido uma vez. Arbusto APARADO e liso — a faceta grossa que
    // serve para folhagem solta aqui contaria a historia errada.
    const gBuxo = new THREE.IcosahedronGeometry(0.36, 1)
    // GRAMINEA: lamina de 3 cm, escalada em Y por muda. Caixa e nao folha
    // modelada porque a 37 px/m ela ocupa pouco mais de um pixel.
    const gLamina = new THREE.BoxGeometry(0.03, 1, 0.007)
    // AGAVE: cone de 4 lados = folha rigida que afina ate a ponta.
    const gFolhaAgave = new THREE.CylinderGeometry(0.006, 0.055, 0.72, 4)
    // JARDINEIRA LINEAR de corten — calha corrida, nao vaso pontual.
    const gJardineira = new RoundedBoxGeometry(3.4, 0.54, 0.8, 1, 0.018)
    const gTerraLinear = new THREE.PlaneGeometry(3.16, 0.6)

    // BAR. Tampo em BALANÇO sobre o balcão (a sombra fina embaixo do tampo é o
    // que dá espessura ao móvel) e apoio de pé em tubo.
    const gBalcao = new RoundedBoxGeometry(4.6, 1.0, 0.7, 1, 0.02)
    const gTampo = new RoundedBoxGeometry(5.0, 0.09, 0.96, 1, 0.014)
    const gEstante = new RoundedBoxGeometry(4.6, 1.9, 0.32, 1, 0.02)
    const gPrateleira = new THREE.BoxGeometry(4.3, 0.045, 0.26)
    const gGarrafa = new THREE.CylinderGeometry(0.037, 0.043, 0.3, 8)
    const gApoioPe = new THREE.CylinderGeometry(0.026, 0.026, 4.4, 8)
    const gAssentoBanqueta = new THREE.CylinderGeometry(0.21, 0.2, 0.09, 14)
    const gPernaBanqueta = new THREE.CylinderGeometry(0.026, 0.034, 0.72, 8)

    // GUARDA-CORPO. Montante achatado (perfil de chapa, não pau quadrado) e
    // os ESPAÇADORES que prendem o vidro — é a ferragem que dá escala.
    const gMontanteVidro = new THREE.BoxGeometry(0.035, 0.9, 0.06)
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
    // Cru, não branco. Estofado branco puro sob sol de hora dourada estoura e
    // vira mancha sem forma — e lona de exterior não é branca de fábrica.
    const mTecido = new THREE.MeshStandardMaterial({ color: '#ded2be', roughness: 0.93, ...lona })
    const mLonaSol = new THREE.MeshStandardMaterial({
      color: '#e9dfcb',
      roughness: 0.9,
      side: THREE.DoubleSide,
      map: lona.map,
      normalMap: lona.normalMap,
      roughnessMap: lona.roughnessMap,
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
      emissiveIntensity: 1.35,
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
    })
    // Madeira de oliveira e CLARA e acinzentada, nao marrom escura.
    // Nucleo da copa: solido e fosco, so para dar massa escura atras das folhas.
    const mFolhaSolida = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.95,
      flatShading: true,
    })
    const mMadeiraClara = new THREE.MeshStandardMaterial({ color: '#9a8b76', roughness: 0.93 })
    // Buxo: verde profundo e FOSCO, sem faceta. Contraponto da gramineea.
    const mBuxo = new THREE.MeshStandardMaterial({ color: '#3f5a32', roughness: 0.97 })
    // Agave: verde-azulado com cera — a folha tem brilho, ao contrario das outras.
    const mAgave = new THREE.MeshStandardMaterial({ color: '#7d9b86', roughness: 0.55, flatShading: true })
    // Graminea: branca no material, cor na instancia, e DUPLA FACE porque a
    // lamina e fina o bastante para a camera ver o verso dela o tempo todo.
    const mGramineaMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.82,
      side: THREE.DoubleSide,
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
    const mToalha = new THREE.MeshStandardMaterial({
      color: '#9fb6c4',
      roughness: 0.96,
      map: lona.map,
      normalMap: lona.normalMap,
    })
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
     * PALETA BIMODAL, e a bimodalidade E o efeito.
     *
     * Numa copa em contraluz nao existe "verde medio": existe a folha que o sol
     * ATRAVESSA, verde-limao quase amarela, e a folha de costas, que e recorte
     * escuro. A media entre as duas nao aparece em lugar nenhum da copa — e era
     * justamente a media que a paleta anterior tinha, cinco verdes todos no
     * mesmo valor.
     *
     * Duas das seis entradas sao as ACESAS. Uma em tres e proporcao alta para
     * folha iluminada, e e proposital: elas sao o que faz a copa cintilar.
     */
    const TONS_DE_TREPADEIRA = ['#2e4f22', '#40662f', '#9fc56a', '#365a27', '#c3e08a', '#4d7538'].map(
      (c) => new THREE.Color(c),
    )
    const TONS_DE_OLIVA = ['#6e8168', '#8d9c85', '#d8e0c6', '#7d8e74', '#eef0dc', '#9aa892'].map(
      (c) => new THREE.Color(c),
    )
    // GRAMINEA em contraluz: palha dourada, nao verde. A lamina seca da ponta e
    // a que pega o sol de fim de tarde, e e por isso que graminea e a unica
    // vegetacao que ACENDE quando o sol esta atras dela.
    // Metade PALHA, metade VERDE. So palha lia como mato seco; graminea viva tem
    // a base verde e a ponta dourada, e e a mistura das duas que da o efeito de
    // contraluz em vez de campo queimado.
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
    const zEspreguicadeiras = zCentro + prof * 0.1
    const zPergolaFrente = zCentro + prof * 0.108
    const zPergolaFundo = zCentro - prof * 0.17
    const zBar = zCentro - prof * 0.208
    const zArvores = zCentro - prof * 0.277
    const zCanteiro = zCentro - prof * 0.4
    const zGuarda = zCentro + prof * 0.4
    const zEspelhoLocal = zCentro - prof * 0.03

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
      col.poe('ralo', gRalo, mAco, [xr, piso + 0.026, zCentro + prof * 0.3])
      for (let b = 0; b < 5; b++)
        col.poe('barraRalo', gBarraRalo, mAco, [xr - 0.1 + b * 0.05, piso + 0.032, zCentro + prof * 0.3])
    }

    // ── pergolado ─────────────────────────────────────────────────────────
    const xPostes = [-8.0, -4.2, -0.4, 3.4]
    for (const x of xPostes)
      for (const z of [zPergolaFrente, zPergolaFundo]) {
        sombra(x, z, 0.95, 0.95)
        col.poe('poste', gPoste, mMadeiraEscura, [x, piso + 1.3, z])
        // Chapa de aço parafusada no topo do poste, dos dois lados.
        for (const dz of [-0.09, 0.09]) {
          col.poe('chapa', gChapa, mAco, [x, piso + 2.44, z + dz])
          for (const dy of [-0.07, 0.07])
            col.poe('parafuso', gParafuso, mAco, [x, piso + 2.44 + dy, z + dz], [Math.PI / 2, 0, 0])
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
      col.poe('viga', gVigaPergola, mMadeiraEscura, [-2.3, piso + 2.5, z])
    for (let i = 0; i < 27; i++)
      col.poe('ripaPergola', gRipaPergola, mMadeiraEscura, [
        -8.3 + i * 0.46,
        piso + 2.63,
        (zPergolaFrente + zPergolaFundo) / 2,
      ])

    /**
     * A TREPADEIRA — e ela e o que transforma pergolado em pergolado VIVO.
     *
     * Pergolado existe para sustentar planta: e essa a funcao original da peca,
     * antes de virar so sombra decorativa. Uma estrutura de madeira limpa le
     * como recem-entregue; com a trepadeira subindo pelo poste e correndo pela
     * viga, ela passa a ter IDADE — e idade e a coisa mais dificil de fingir
     * numa cena construida do zero.
     *
     * A folhagem se concentra sobre a viga do FUNDO e rala em direcao a frente,
     * porque planta cresce na direcao da luz e o sol esta atras. Distribuicao
     * uniforme seria o tell de sempre.
     */
    /**
     * EM MOITAS, e nao espalhada por igual — a primeira versao distribuiu 150
     * folhas uniformemente pelo pergolado e o resultado foi CONFETE VERDE, nao
     * planta. Trepadeira nasce de um pe, sobe por um poste e se espalha a partir
     * dali: a densidade cai com a distancia da raiz. Tres pes, e a folha se
     * agrupa em volta de cada um.
     */
    const pesDaTrepadeira = [-8.0, -0.4, 3.4]
    for (let f = 0; f < 760; f++) {
      const pe = pesDaTrepadeira[f % pesDaTrepadeira.length]!
      // Distancia ao pe com expoente: concentra perto e rareia longe.
      const alcance = ruido(f, 251) ** 1.7 * 5.2
      const x = pe + (ruido(f, 240) > 0.5 ? alcance : -alcance)
      // Adensa no fundo: a raiz quadrada empurra a maioria para z de tras.
      const dz = Math.sqrt(ruido(f, 241)) * (zPergolaFrente - zPergolaFundo)
      const z = zPergolaFundo + dz
      // Uma parte pendura ABAIXO da viga: e a gavinha solta que denuncia planta
      // em vez de tapete verde colado em cima.
      const pendura = ruido(f, 242) > 0.76 ? ruido(f, 243) * 0.62 : 0
      col.poe(
        'folhaTrepa',
        gFolhaChata,
        mFolha,
        [
          x + (ruido(f, 244) - 0.5) * 0.3,
          piso + 2.68 + ruido(f, 245) * 0.12 - pendura,
          z + (ruido(f, 246) - 0.5) * 0.35,
        ],
        [ruido(f, 247) * 3, ruido(f, 248) * 3, ruido(f, 249) * 3],
        (() => {
          const e = 0.85 + ruido(f, 250) * 0.95
          return [e, e * 0.45, e] as [number, number, number]
        })(),
        TONS_DE_TREPADEIRA[f % TONS_DE_TREPADEIRA.length]!,
      )
    }
    // A GAVINHA SUBINDO PELO POSTE. Sem ela a folhagem flutua sobre a viga sem
    // origem — e o pe da planta e justamente o que prova que ela cresceu ali em
    // vez de ter sido pousada em cima.
    for (const pe of pesDaTrepadeira)
      for (let f = 0; f < 54; f++) {
        const h = ruido(f, 260) * 2.3
        const a = h * 2.4 + ruido(f, 261) * 0.7
        col.poe(
          'folhaTrepa',
          gFolhaChata,
          mFolha,
          [pe + Math.sin(a) * 0.12, piso + 0.3 + h, zPergolaFundo + Math.cos(a) * 0.12],
          [ruido(f, 262) * 3, a, ruido(f, 263) * 3],
          (() => {
            const e = 0.6 + ruido(f, 264) * 0.6
            return [e, e * 0.5, e] as [number, number, number]
          })(),
          TONS_DE_TREPADEIRA[f % TONS_DE_TREPADEIRA.length]!,
        )
      }

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
      const a = new THREE.Vector3(-8.0, piso + 2.56, zv)
      const b = new THREE.Vector3(3.4, piso + 2.56, zv)
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
     * ESPREGUIÇADEIRAS — e aqui entra o tell mais forte que sobrou na cena:
     * NADA NO MUNDO REAL ESTÁ ALINHADO.
     *
     * Seis espreguiçadeiras em x exato, todas no mesmo z, todas no mesmo ângulo,
     * todas com o encosto na mesma reclinação. Isso não existe nem em foto de
     * catálogo — porque alguém sempre arrastou uma para pegar sol, outra para
     * fugir dele, e ninguém recoloca nada no lugar. Enquanto a fila está
     * perfeita, o olho lê "array" antes de ler "móvel", e nenhuma quantidade de
     * textura desfaz isso.
     *
     * Então cada uma ganha: giro próprio de até ±7°, deslocamento próprio em z,
     * e reclinação de encosto própria. São três números por peça, vindos do
     * mesmo ruído determinístico — a cena continua idêntica a cada carregamento,
     * que é regra da casa, mas deixa de ser uma grade.
     *
     * A de índice 4 é a exceção deliberada: girada 24°, puxada para fora da
     * fila. É "a que alguém mexeu", e uma só basta para o conjunto inteiro
     * deixar de parecer arrumado por software.
     */
    const espreguicadeiras = [-8.4, -6.1, -2.3, 2.3, 6.1, 8.4]
    for (const [k, xBase] of espreguicadeiras.entries()) {
      const foraDaFila = k === 4
      const giro = foraDaFila ? 0.42 : (ruido(k, 200) - 0.5) * 0.24
      const x = xBase + (ruido(k, 201) - 0.5) * 0.3
      const z = zEspreguicadeiras + (ruido(k, 202) - 0.5) * 0.55 + (foraDaFila ? 0.5 : 0)
      // Reclinação própria: entre 32° e 46°. Ninguém deixa duas no mesmo ponto.
      const reclina = -(0.56 + ruido(k, 203) * 0.25)
      const cos = Math.cos(giro)
      const sen = Math.sin(giro)
      // Ponto local da peça para o mundo, já girado em torno do próprio centro.
      const p = (lx: number, ly: number, lz: number): [number, number, number] => [
        x + lx * cos + lz * sen,
        piso + ly,
        z - lx * sen + lz * cos,
      ]

      sombra(x, z, 2.4, 3.1)
      // Estrutura tubular: dois tubos correndo o comprimento, quatro pés e duas
      // rodas na cabeceira. É o esqueleto que a espreguiçadeira de verdade tem —
      // e são as rodas que dizem "isto se arrasta pelo deck", o detalhe que faz o
      // objeto parecer usado em vez de colocado.
      for (const dx of [-0.33, 0.33]) {
        col.poe('tuboLado', gTuboLado, mMetal, p(dx, 0.33, 0), [Math.PI / 2, giro, 0])
        for (const dz of [-0.72, 0.62])
          col.poe('pernaEspr', gPernaEspr, mMetal, p(dx, 0.17, dz))
        col.poe('roda', gRoda, mAco, p(dx, 0.055, 0.92), [0, giro, Math.PI / 2])
        // Longarina do caixilho, rente ao estofado: e ela que diz que a almofada
        // assenta DENTRO de uma estrutura em vez de estar largada no chao.
        col.poe('longarina', gLongarina, mMetal, p(dx * 1.06, 0.42, 0), [0, giro, 0])
        // Sapata de borracha no pe. Tubo de metal cortado rente ao deck e o
        // acabamento que nenhum movel de exterior tem — ele apodreceria o deck.
        col.poe('sapata', gSapata, mAco, p(dx, 0.018, -0.72))
        // Braco em U, so na cabeceira. Meia-rosca porque e um tubo dobrado.
        col.poe('braco', gBraco, mMetal, p(dx, 0.52, -0.3), [Math.PI / 2, 0, giro])
      }
      /**
       * A ALMOFADA É SEGMENTADA, e este é o detalhe que separa "estofado" de
       * "bloco de espuma".
       *
       * Almofada de espreguiçadeira não é um paralelepípedo: é costurada em
       * gomos, porque precisa DOBRAR onde o encosto articula e porque a costura
       * impede o enchimento de migrar para uma ponta. Visualmente, esses vincos
       * são o que o olho usa para ler espessura MACIA — volume sem vinco lê como
       * plástico rígido, por mais arredondada que esteja a aresta.
       *
       * A folga de 2 cm entre gomos É o vinco: ela deixa passar a sombra e
       * desenha a linha escura que uma costura desenha.
       */
      for (let g = 0; g < 3; g++)
        col.poe('gomoAssento', gGomoAssento, mTecido, p(0, 0.4, 0.56 - g * 0.4), [0, giro, 0])
      for (let g = 0; g < 2; g++) {
        // Os gomos do encosto sobem ao LONGO da inclinação, não em linha reta —
        // senão o de cima sai flutuando fora da estrutura reclinada.
        const d = 0.21 - g * 0.42
        col.poe(
          'gomoEncosto',
          gGomoEncosto,
          mTecido,
          p(0, 0.62 - Math.sin(reclina) * d, -0.72 + Math.cos(reclina) * d),
          [reclina, giro, 0],
        )
      }
      // Almofada de cabeça em duas das seis.
      if (k % 3 === 1)
        col.poe('travesseiro', gArbusto, mTecido, p(0, 0.86, -0.96), [0, giro + 0.4, 0], [1.5, 0.7, 1.0])
      /**
       * A TOALHA — e ela é o objeto mais barato de todos com o maior retorno.
       *
       * Espreguiçadeira vazia é mobiliário; espreguiçadeira com toalha jogada é
       * LUGAR ONDE ALGUÉM ESTEVE. É a mesma lógica do carrinho de serviço no
       * datacenter: a única coisa da cena que não foi instalada, foi deixada.
       * Duas das seis, em ângulos diferentes, uma caída até o deck.
       */
      if (k === 1 || k === 4) {
        col.poe('toalha', gToalha, mToalha, p(0.02, 0.48, 0.1), [0.06, giro + 0.1, 0])
        if (k === 4)
          col.poe('toalha', gToalha, mToalha, p(0.36, 0.2, 0.72), [1.2, giro - 0.3, 0], [1, 0.7, 1])
      }
    }

    // ── guarda-sóis ───────────────────────────────────────────────────────
    for (const x of [5.0, 7.8]) {
      const z = zEspreguicadeiras - 0.4
      sombra(x, z, 1.2, 1.2)
      col.poe('baseSol', gBaseSol, mPedra, [x, piso + 0.06, z])
      col.poe('mastro', gMastro, mMetal, [x, piso + 1.15, z])
      col.poe('cubo8', gCubo8, mMetal, [x, piso + 2.18, z])
      col.poe('lona', gLona, mLonaSol, [x, piso + 2.28, z])
      col.poe('ponteira', gPonteira, mMetal, [x, piso + 2.72, z])
      // BABADO: a saia curta que pende da borda da lona. E o detalhe que separa
      // guarda-sol de mercado de cone de papel — e ele balanca, entao a borda
      // nunca e uma linha limpa.
      col.poe('babado', gBabado, mLonaSol, [x, piso + 2.13, z])
      // As varetas por baixo: sem elas a lona é uma casca flutuando.
      for (let v = 0; v < 8; v++) {
        const a = (v / 8) * Math.PI * 2
        col.poe(
          'vareta',
          gVareta,
          mMetal,
          [x + Math.sin(a) * 0.68, piso + 2.24, z + Math.cos(a) * 0.68],
          [0.1, a, 0],
        )
      }
    }

    // ── bar ───────────────────────────────────────────────────────────────
    const xBar = 9.0
    sombra(xBar, zBar, 5.6, 2.0)
    col.poe('balcao', gBalcao, mMadeiraEscura, [xBar, piso + 0.5, zBar])
    col.poe('tampo', gTampo, mPedra, [xBar, piso + 1.05, zBar])
    // Apoio de pé: o tubo baixo na frente do balcão. Ninguém sabe nomear, todo
    // mundo reconhece — é o que transforma "caixa" em "balcão de bar".
    col.poe('apoioPe', gApoioPe, mAco, [xBar, piso + 0.19, zBar + 0.42], [0, 0, Math.PI / 2])
    col.poe('estante', gEstante, mMadeiraEscura, [xBar, piso + 0.95, zBar - 1.6])
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
    for (const [k, x] of [-12.4, -3.0, 1.8].entries()) {
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
          mMadeiraClara,
          [x + dx, piso + 1.24 + t * 0.06, zArvores + dz],
          [Math.cos(tr.a) * tr.incl, 0, -Math.sin(tr.a) * tr.incl],
        )
        col.poe(
          'galhoOliva',
          gGalhoOliva,
          mMadeiraClara,
          [x + dx * 2.6, piso + 1.9 + t * 0.12, zArvores + dz * 2.6],
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
      for (let t = 0; t < 14; t++) {
        const a = ruido(t, 55 + k) * Math.PI * 2
        const r = ruido(t, 56 + k) * 0.5
        col.poe(
          'nucleoOliva',
          gTufoOliva,
          mFolhaSolida,
          [x + Math.sin(a) * r, piso + 2.18 + ruido(t, 57 + k) * 0.4, zArvores + Math.cos(a) * r],
          [ruido(t, 58 + k) * 3, ruido(t, 59 + k) * 3, 0],
          [1.3, 0.95, 1.3],
          TONS_DE_OLIVA[0]!,
        )
      }
      // O ENXAME DE FOLHA. 220 laminas lanceoladas em vez de 36 blocos: mesmo
      // orcamento de triangulo (o plano tem 2, o icosaedro tem 20) e dez vezes
      // a densidade. E a densidade que faz a copa cintilar.
      for (let t = 0; t < 330; t++) {
        const a = ruido(t, 50 + k) * Math.PI * 2
        // Raiz quadrada empurra os tufos para FORA: distribuição uniforme em
        // raio amontoa tudo no centro, que é justamente o miolo que deve ser oco.
        const r = 0.16 + Math.sqrt(ruido(t, 60 + k)) * 0.8
        col.poe(
          'folhaOliva',
          gFolhaOliva,
          mFolha,
          [
            x + Math.sin(a) * r,
            piso + 2.02 + ruido(t, 70 + k) * 0.7,
            zArvores + Math.cos(a) * r * 0.78,
          ],
          // Orientacao nos TRES eixos: e o angulo da folha, e nao a cor dela,
          // que produz a variacao de brilho numa copa de verdade.
          [ruido(t, 80 + k) * 6, ruido(t, 90 + k) * 6, ruido(t, 95 + k) * 6],
          (() => {
            const s = 0.75 + ruido(t, 100 + k) * 0.6
            return [s, s, s] as [number, number, number]
          })(),
          TONS_DE_OLIVA[(t * 3 + k) % TONS_DE_OLIVA.length]!,
        )
      }
    }

    // ── jardineiras de corten com gramíneas em massa ──────────────────────
    for (const [j, xj] of [-11.5, -7.7, -3.9, -0.1, 3.7, 7.5, 11.3].entries()) {
      sombra(xj, zCanteiro, 4.0, 1.5)
      col.poe('jardineira', gJardineira, mCorten, [xj, piso + 0.27, zCanteiro])
      col.poe('terraLinear', gTerraLinear, mTerra, [xj, piso + 0.5, zCanteiro], [-Math.PI / 2, 0, 0])
      /**
       * A LÂMINA, e a razão de ela ser uma caixa fina e não uma folha modelada:
       * nesta profundidade a escala é 37 px/m, então uma lâmina de 3 cm ocupa
       * pouco mais de um pixel. O que o olho resolve não é a folha — é a
       * SILHUETA DO TUFO e a luz passando por ela. Modelar nervura aqui seria
       * pagar triângulo por informação que não chega à tela, que é o mesmo erro
       * dos furos de rack que eu já cortei no andar 07.
       *
       * Cada lâmina se inclina para FORA do centro do tufo, em ângulo próprio.
       * É o que produz o formato de chafariz que a gramínea tem — folha reta
       * para cima lê como cebolinha.
       */
      for (let c = 0; c < 3; c++) {
        const xc = xj - 1.1 + c * 1.1
        for (let b = 0; b < 44; b++) {
          const a = ruido(b, 170 + j * 3 + c) * Math.PI * 2
          const raio = ruido(b, 180 + j * 3 + c) * 0.24
          const alt = 0.42 + ruido(b, 190 + j * 3 + c) * 0.74
          const incl = 0.1 + ruido(b, 200 + j * 3 + c) * 0.72
          col.poe(
            'lamina',
            gLamina,
            mGramineaMat,
            [xc + Math.sin(a) * raio, piso + 0.52 + alt / 2, zCanteiro + Math.cos(a) * raio * 0.6],
            [Math.cos(a) * incl, a, -Math.sin(a) * incl],
            [1, alt, 1],
            TONS_DE_GRAMINEA[(b + c + j) % TONS_DE_GRAMINEA.length]!,
          )
        }
      }
    }

    /**
     * BUXO APARADO — a única fileira da cena onde a regularidade é o efeito.
     *
     * Tudo o mais na cobertura ganhou assimetria de propósito, porque nada no
     * mundo real está alinhado. O buxo é a exceção legítima: ele É aparado, ele É
     * plantado em espaçamento de régua, e o que se lê nele é justamente a mão do
     * projetista contra a desordem do resto. Assimetria aqui destruiria o
     * sentido do objeto.
     */
    for (let b = 0; b < 5; b++) {
      const x = 2.6 + b * 1.25
      sombra(x, zCentro - prof * 0.33, 1.0, 1.0)
      col.poe('buxo', gBuxo, mBuxo, [x, piso + 0.34, zCentro - prof * 0.33], [0, b * 0.7, 0])
    }

    /**
     * AGAVE — a planta arquitetônica, e ela entra por CONTRASTE DE FORMA.
     *
     * O jardim ficou feito de duas texturas macias: tufo de oliveira e chafariz
     * de gramínea. Sem uma forma DURA no meio, tudo lê como a mesma massa verde.
     * A roseta de folha rígida e pontuda é a peça que quebra isso — e é, junto
     * com o buxo, o que diz "isto foi projetado" em vez de "isto cresceu".
     */
    for (const [k, x] of [-5.6, 6.4].entries()) {
      const z = zCanteiro + 0.95
      sombra(x, z, 1.3, 1.3)
      col.poe('vaso', gVaso, mVaso, [x, piso, z])
      for (let f = 0; f < 11; f++) {
        const a = (f / 11) * Math.PI * 2 + k
        const abre = 0.55 + ruido(f, 210 + k) * 0.55
        col.poe(
          'folhaAgave',
          gFolhaAgave,
          mAgave,
          [x + Math.sin(a) * 0.14, piso + 0.58, z + Math.cos(a) * 0.14],
          [Math.cos(a) * abre, a, -Math.sin(a) * abre],
          [1, 0.75 + ruido(f, 220 + k) * 0.5, 1],
        )
      }
    }

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
      col.poe('hasteEscada', gHasteEscada, mMetal, [4.3 + dx, piso + 0.02, zEspelhoLocal + 0.5])
      col.poe('corrimaoEscada', gCorrimaoEscada, mMetal, [4.3 + dx, piso + 0.28, zEspelhoLocal + 0.5], [0, 0, 0])
    }
    // Degrau submerso: a prateleira rasa que toda piscina tem na entrada. Vista
    // atraves da agua ela desenha uma faixa mais clara no fundo escuro, e e essa
    // faixa que da PROFUNDIDADE — fundo de cor uniforme le como chapa pintada.
    col.poe('degrauSubmerso', gDegrauSubmerso, mPedra, [4.3, piso - 0.08, zEspelhoLocal + 0.2])

    // ── guarda-corpo ──────────────────────────────────────────────────────
    const montantes = Math.floor((meiaLargura * 2) / 1.5)
    for (let i = 0; i <= montantes; i++) {
      const x = -meiaLargura + i * 1.5
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

  useMemo(() => {
    for (const m of malhas) scene.add(m)
    return () => {
      for (const m of malhas) scene.remove(m)
    }
  }, [malhas, scene])

  const zEspelho = zCentro - prof * 0.03
  const zGuardaCorpo = zCentro + prof * 0.4

  return (
    <>
      {/* O FUNDO DA PISCINA, e ele existe por causa de como água se vê.
       * Uma lâmina sem fundo é uma superfície; com fundo, o olho lê VOLUME —
       * a cor escura por baixo através da água translúcida é metade do que faz
       * uma piscina parecer cheia. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1, piso - 0.22, zEspelho]}>
        <planeGeometry args={[9, prof * 0.26]} />
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
        <planeGeometry args={[9, prof * 0.26]} />
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
      {[prof * 0.145, -prof * 0.145].map((dz) => (
        <mesh key={dz} position={[1, piso + 0.045, zEspelho + dz]}>
          <boxGeometry args={[9.9, 0.09, 0.42]} />
          <meshStandardMaterial color="#cfc4ad" roughness={0.82} />
        </mesh>
      ))}
      {[-3.74, 5.74].map((bx) => (
        <mesh key={bx} position={[bx, piso + 0.045, zEspelho]}>
          <boxGeometry args={[0.42, 0.09, prof * 0.29]} />
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
        <boxGeometry args={[9.04, 0.34, prof * 0.27]} />
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
        <cylinderGeometry args={[0.023, 0.023, meiaLargura * 2, 12]} />
        <meshStandardMaterial color="#d8cdb8" metalness={0.85} roughness={0.28} />
      </mesh>
    </>
  )
}
