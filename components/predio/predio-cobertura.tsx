'use client'
import { useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
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
    const gAssento = new RoundedBoxGeometry(0.68, 0.12, 1.2, 2, 0.05)
    const gEncosto = new RoundedBoxGeometry(0.68, 0.11, 0.82, 2, 0.048)
    const gTuboLado = new THREE.CylinderGeometry(0.021, 0.021, 1.98, 8)
    const gPernaEspr = new THREE.CylinderGeometry(0.017, 0.017, 0.32, 6)
    const gRoda = new THREE.CylinderGeometry(0.055, 0.055, 0.032, 12)

    // PERGOLADO. Viga com chanfro e chapa de aço no encontro com o poste — é a
    // ferragem que diz "construído" em vez de "empilhado".
    const gPoste = new RoundedBoxGeometry(0.15, 2.6, 0.15, 1, 0.008)
    const gRipaPergola = new RoundedBoxGeometry(0.085, 0.13, 4.6, 1, 0.006)
    const gVigaPergola = new RoundedBoxGeometry(12.2, 0.2, 0.17, 1, 0.008)
    const gChapa = new THREE.BoxGeometry(0.19, 0.22, 0.012)
    const gParafuso = new THREE.CylinderGeometry(0.012, 0.012, 0.03, 6)

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
    const gMastro = new THREE.CylinderGeometry(0.036, 0.042, 2.3, 10)
    const gVareta = new THREE.BoxGeometry(0.018, 0.016, 1.34)
    const gPonteira = new THREE.ConeGeometry(0.055, 0.16, 8)

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
    const gTerrinha = new THREE.CircleGeometry(0.24, 12)

    // ÁRVORE. Tronco CÔNICO, galhos e copa de muitos tufos facetados. O
    // icosaedro sem subdivisão é melhor que esfera aqui: a faceta lê como massa
    // de folhagem, a esfera lisa lê como bola.
    const gTronco = new THREE.CylinderGeometry(0.062, 0.105, 1.4, 8)
    const gGalho = new THREE.CylinderGeometry(0.022, 0.045, 0.62, 6)
    const gTufo = new THREE.IcosahedronGeometry(0.33, 0)
    const gArbusto = new THREE.IcosahedronGeometry(0.2, 0)

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
    const mFolha = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, flatShading: true })
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
    const TONS_DE_FOLHA = ['#5f7a47', '#6d8a4f', '#546d3f', '#7a9659', '#496035'].map(
      (c) => new THREE.Color(c),
    )
    const TONS_DE_GARRAFA = ['#3f5f3a', '#6b4326', '#2f4a5e', '#7a6a3a', '#53304a'].map(
      (c) => new THREE.Color(c),
    )

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
      }
    for (const z of [zPergolaFrente, zPergolaFundo])
      col.poe('viga', gVigaPergola, mMadeiraEscura, [-2.3, piso + 2.5, z])
    for (let i = 0; i < 27; i++)
      col.poe('ripaPergola', gRipaPergola, mMadeiraEscura, [
        -8.3 + i * 0.46,
        piso + 2.63,
        (zPergolaFrente + zPergolaFundo) / 2,
      ])

    // ── espreguiçadeiras ──────────────────────────────────────────────────
    // O par do meio (±2,3) é o que o celular enxerga; as das pontas são para
    // quem abre em tela larga.
    for (const [k, x] of [-8.4, -6.1, -2.3, 2.3, 6.1, 8.4].entries()) {
      const z = zEspreguicadeiras
      sombra(x, z, 2.4, 3.1)
      // Estrutura tubular: dois tubos correndo o comprimento, quatro pés e duas
      // rodas na cabeceira. É o esqueleto que a espreguiçadeira de verdade tem —
      // e são as rodas que dizem "isto se arrasta pelo deck", que é o detalhe
      // que faz o objeto parecer usado em vez de colocado.
      for (const dx of [-0.33, 0.33]) {
        col.poe('tuboLado', gTuboLado, mMetal, [x + dx, piso + 0.33, z], [Math.PI / 2, 0, 0])
        for (const dz of [-0.72, 0.62])
          col.poe('pernaEspr', gPernaEspr, mMetal, [x + dx, piso + 0.17, z + dz])
        col.poe('roda', gRoda, mAco, [x + dx, piso + 0.055, z + 0.92], [0, 0, Math.PI / 2])
      }
      col.poe('assento', gAssento, mTecido, [x, piso + 0.4, z + 0.16])
      // Encosto reclinado a 38°, e o ângulo importa: mais reto lê como cadeira,
      // mais deitado lê como cama. 38° é a inclinação de descanso.
      col.poe('encosto', gEncosto, mTecido, [x, piso + 0.62, z - 0.72], [-0.66, 0, 0])
      // Almofada de cabeça numa em cada três: fila idêntica denuncia cópia.
      if (k % 3 === 1)
        col.poe('travesseiro', gArbusto, mTecido, [x, piso + 0.86, z - 0.96], [0, 0.4, 0], [1.5, 0.7, 1.0])
    }

    // ── guarda-sóis ───────────────────────────────────────────────────────
    for (const x of [5.0, 7.8]) {
      const z = zEspreguicadeiras - 0.4
      sombra(x, z, 1.2, 1.2)
      col.poe('mastro', gMastro, mMetal, [x, piso + 1.15, z])
      col.poe('lona', gLona, mLonaSol, [x, piso + 2.28, z])
      col.poe('ponteira', gPonteira, mMetal, [x, piso + 2.72, z])
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
    for (const x of [7.4, 8.4, 9.4, 10.4]) {
      col.poe('banqueta', gAssentoBanqueta, mMadeiraEscura, [x, piso + 0.76, zBar + 0.85])
      col.poe('pernaBanqueta', gPernaBanqueta, mMetal, [x, piso + 0.38, zBar + 0.85])
    }

    // ── árvores ───────────────────────────────────────────────────────────
    for (const [k, x] of [-12.4, -3.0, 1.8].entries()) {
      sombra(x, zArvores, 2.2, 2.2)
      col.poe('vasoAlto', gVasoAlto, mVaso, [x, piso, zArvores])
      col.poe('terra', gTerra, mTerra, [x, piso + 0.66, zArvores], [-Math.PI / 2, 0, 0])
      col.poe('tronco', gTronco, mMadeiraEscura, [x, piso + 1.34, zArvores])
      // Três galhos saindo em ângulos diferentes: é a ramificação, mais que a
      // copa, que faz a silhueta ler como árvore e não como arbusto em pedestal.
      for (let g = 0; g < 3; g++) {
        const a = (g / 3) * Math.PI * 2 + k
        col.poe(
          'galho',
          gGalho,
          mMadeiraEscura,
          [x + Math.sin(a) * 0.2, piso + 1.82 + g * 0.1, zArvores + Math.cos(a) * 0.2],
          [Math.cos(a) * 0.6, 0, -Math.sin(a) * 0.6],
        )
      }
      // Copa: 15 tufos de tamanhos e verdes diferentes, distribuídos numa
      // elipse achatada. Copa é volume irregular — a esfera única era o tell.
      for (let t = 0; t < 22; t++) {
        const a = ruido(t, 50 + k) * Math.PI * 2
        const r = 0.3 + ruido(t, 60 + k) * 0.78
        const h = ruido(t, 70 + k)
        col.poe(
          'tufo',
          gTufo,
          mFolha,
          [
            x + Math.sin(a) * r,
            piso + 1.98 + h * 0.66,
            zArvores + Math.cos(a) * r * 0.8,
          ],
          [ruido(t, 80 + k) * 3, ruido(t, 90 + k) * 3, 0],
          (() => {
            const s = 0.7 + ruido(t, 100 + k) * 0.75
            return [s, s * 0.82, s] as [number, number, number]
          })(),
          TONS_DE_FOLHA[(t * 3 + k) % TONS_DE_FOLHA.length]!,
        )
      }
    }

    // ── canteiro do fundo ─────────────────────────────────────────────────
    for (const [k, x] of [-13.2, -9.4, -5.6, -1.8, 2.0, 5.8, 9.6, 13.4].entries()) {
      sombra(x, zCanteiro, 1.4, 1.4)
      col.poe('vaso', gVaso, mVaso, [x, piso, zCanteiro])
      col.poe('terrinha', gTerrinha, mTerra, [x, piso + 0.37, zCanteiro], [-Math.PI / 2, 0, 0])
      for (let t = 0; t < 6; t++) {
        const a = ruido(t, 110 + k) * Math.PI * 2
        const r = ruido(t, 120 + k) * 0.22
        col.poe(
          'arbusto',
          gArbusto,
          mFolha,
          [x + Math.sin(a) * r, piso + 0.46 + ruido(t, 130 + k) * 0.26, zCanteiro + Math.cos(a) * r],
          [ruido(t, 140 + k) * 3, ruido(t, 150 + k) * 3, 0],
          (() => {
            const s = 0.6 + ruido(t, 160 + k) * 0.7
            return [s, s * 0.8, s] as [number, number, number]
          })(),
          TONS_DE_FOLHA[(t * 2 + k) % TONS_DE_FOLHA.length]!,
        )
      }
    }

    // ── guarda-corpo ──────────────────────────────────────────────────────
    const montantes = Math.floor((meiaLargura * 2) / 1.5)
    for (let i = 0; i <= montantes; i++) {
      const x = -meiaLargura + i * 1.5
      col.poe('montante', gMontanteVidro, mAco, [x, piso + 0.74, zGuarda])
      // Espaçadores: os dois botões de aço que prendem a chapa de vidro. É a
      // peça que dá escala ao guarda-corpo e prova que o vidro está preso.
      for (const dy of [0.42, 1.02])
        col.poe('espacador', gEspacador, mMetal, [x, piso + dy, zGuarda + 0.04], [Math.PI / 2, 0, 0])
    }

    return col.colhe()
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
      <mesh position={[1, piso + 0.005, zEspelho]}>
        <boxGeometry args={[9.9, 0.09, prof * 0.32]} />
        <meshStandardMaterial color="#cfc4ad" roughness={0.82} />
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
      <mesh position={[0, piso + 1.17, zGuardaCorpo]}>
        <boxGeometry args={[meiaLargura * 2, 0.055, 0.085]} />
        <meshStandardMaterial color="#d8cdb8" metalness={0.85} roughness={0.28} />
      </mesh>
    </>
  )
}
