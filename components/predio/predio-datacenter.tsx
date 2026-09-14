'use client'
import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { PE_DIREITO } from './predio-arquitetura'
import { Coletor } from './predio-instancias'

/**
 * O conteudo do andar 07 (Servidores) — o estudo `/predio-real` trazido para
 * dentro da descida.
 *
 * O QUE A PRIMEIRA INTEGRACAO DEIXOU PARA TRAS, e o dono reparou: quase tudo.
 * Vieram os racks, a furacao de norma, o equipamento de alturas mistas e os
 * LEDs. Ficou de fora TUDO o que faz uma sala parecer construida em vez de
 * povoada de armarios — o cabeamento azul, a bandeja, o busway, a contencao do
 * corredor frio, o piso elevado, os sprinklers, as traseiras com regua de
 * tomada, o halo das luminarias e o carrinho de servico.
 *
 * Nao foi corte deliberado: foi o que coube na primeira passada de instanciacao.
 * Este arquivo fecha a divida.
 *
 * POR QUE INSTANCIADO E NAO DECLARATIVO: a versao em componentes nao carregava.
 * 42U x 3 furos x 2 montantes x ~70 racks dao ~18 mil malhas so de furacao, e o
 * custo nao e o triangulo — e a CHAMADA DE DESENHO, uma conversa com a GPU por
 * malha. Aqui as dezenas de milhares de pecas saem em algumas dezenas de grupos.
 *
 * O CABO E A EXCECAO, e por um motivo geometrico: instancia carrega MATRIZ, e
 * matriz so leva posicao, rotacao e escala. Duas catenarias entre pontos
 * diferentes nao sao a mesma curva escalada — esticar uma em X e achatar em Y
 * deforma a secao do tubo e vira fita, nao cabo. Entao os cabos sao FUNDIDOS:
 * todas as catenarias viram uma geometria so, por cor. Duas malhas para
 * setecentos cabos, e o preco e pago uma vez na montagem.
 *
 * O QUE ISTO NAO DECIDE: a moldura. A camera da descida se aproxima quando
 * assenta no andar (ver `AVANCO` em `predio-descida.ts`), mas nunca chega a
 * distancia do estudo. Detalhe menor que o patch cord vira textura daqui. Por
 * isso o cabeamento portado e o que LE de longe — o feixe subindo para a
 * bandeja, a folga de servico, a forca saindo da regua — e nao os 24 arcos de
 * porta por rack que o estudo desenha de perto.
 */

const U = 0.04445
const LARGURA_UTIL = 0.4826
const US_DO_RACK = 42
const FASES = 6
const VIVO = '#6bff9e'
const ALERTA = '#ffb347'
const FRIO = '#9fd4ff'
/** Azul unico, por pedido do dono. Na vida real a cor e codigo de funcao. */
const AZUL = '#1f5fb0'

const ROTEIRO = [
  { tipo: 'patch', altura: 1 },
  { tipo: 'switch', altura: 1 },
  { tipo: 'servidor', altura: 1 },
  { tipo: 'cega', altura: 1 },
  { tipo: 'discos', altura: 2 },
  { tipo: 'servidor', altura: 2 },
  { tipo: 'cega', altura: 2 },
  { tipo: 'discos', altura: 4 },
  { tipo: 'switch', altura: 1 },
  { tipo: 'cega', altura: 3 },
] as const

function ocupacao(semente: number) {
  const itens: { u: number; altura: number; tipo: string }[] = []
  let u = 1
  let k = 0
  while (u < US_DO_RACK - 1) {
    const d = ROTEIRO[(k + semente) % ROTEIRO.length]!
    if (u + d.altura > US_DO_RACK - 1) break
    itens.push({ u, altura: d.altura, tipo: d.tipo })
    u += d.altura
    k++
  }
  return itens
}

/**
 * A curva que um cabo faz — catenaria, nao reta e nao parabola.
 *
 * Cabo suspenso pelo proprio peso assume `y = a·cosh(x/a)`: a componente
 * horizontal da tensao e constante e a vertical cresce ao longo do arco para
 * equilibrar a gravidade. Parece parabola e nao e; a diferenca aparece
 * justamente perto dos apoios, que e onde o olho repara.
 *
 * Parametrizada pela FLECHA (o quanto afunda no meio) e nao pela densidade
 * linear, porque o que se ajusta a olho e a barriga do cabo. `c = 2,2` e a
 * barriga de um cabo com folga de servico.
 */
function pontosDeCatenaria(a: THREE.Vector3, b: THREE.Vector3, flecha: number, n = 12) {
  const c = 2.2
  const base = Math.cosh(c) - 1
  const pontos: THREE.Vector3[] = []
  for (let i = 0; i <= n; i++) {
    const u = i / n
    const t = u * 2 - 1
    const p = new THREE.Vector3().lerpVectors(a, b, u)
    p.y -= flecha * ((Math.cosh(c) - Math.cosh(c * t)) / base)
    pontos.push(p)
  }
  return pontos
}

function tuboDeCabo(
  de: [number, number, number],
  ate: [number, number, number],
  flecha: number,
  raio: number,
) {
  const curva = new THREE.CatmullRomCurve3(
    pontosDeCatenaria(new THREE.Vector3(...de), new THREE.Vector3(...ate), flecha),
  )
  // 10 x 4 e a secao minima que ainda le como cilindro na distancia da descida:
  // a essa distancia o cabo tem menos de um pixel de largura, e o que o olho
  // pega e a CURVA, nao a secao. O estudo usa 22 x 5 porque a camera dele
  // encosta no rack. Medido: 120 triangulos por cabo caiam para 80, e com 1.700
  // cabos isso e mais de um terco do orcamento do andar.
  return new THREE.TubeGeometry(curva, 10, raio, 4, false)
}

/**
 * HALO — o borrao em volta de fonte de luz, e nao e enfeite.
 *
 * Olho e camera nao veem luz forte como retangulo de borda dura: veem um nucleo
 * estourado com queda suave em volta, porque a luz espalha na lente. Sem isso a
 * luminaria le como retangulo branco recortado, que e exatamente como as barras
 * do andar estavam.
 *
 * O jeito moderno seria bloom em pos-processamento; nao da, porque exigiria
 * dependencia nova e este repo tem a armadilha conhecida do lockfile. Entao usa
 * a tecnica anterior ao bloom: um quad sempre virado para a camera, com degrade
 * radial e mistura ADITIVA. Custa um sprite e nenhum passe.
 */
function texturaDeHalo() {
  const n = 128
  const cv = document.createElement('canvas')
  cv.width = cv.height = n
  const ctx = cv.getContext('2d')!
  const g = ctx.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.25, 'rgba(255,255,255,0.42)')
  g.addColorStop(0.55, 'rgba(255,255,255,0.12)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, n, n)
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export function Datacenter({
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
  const halo = useMemo(() => texturaDeHalo(), [])

  const { malhas, vivos, barras } = useMemo(() => {
    const col = new Coletor()
    const largura = meiaLargura * 2

    // ── geometrias do rack ────────────────────────────────────────────────
    const gCorpo = new THREE.BoxGeometry(0.6, 2.2, 1.0)
    const gMontante = new THREE.BoxGeometry(0.035, 2.06, 0.05)
    const gTiraFuro = new THREE.BoxGeometry(0.011, US_DO_RACK * U, 0.008)
    const gVent = new THREE.BoxGeometry(0.022, 0.03, 0.006)
    const gPorta = new THREE.BoxGeometry(0.03, 0.04, 0.01)
    const gLed = new THREE.BoxGeometry(0.012, 0.012, 0.012)
    const gBaia = new THREE.BoxGeometry(0.05, 0.036, 0.012)
    const gPdu = new THREE.BoxGeometry(0.06, 1.86, 0.06)
    // traseira
    const gLamina = new THREE.BoxGeometry(0.56, 0.1, 0.022)
    const gMoldura = new THREE.BoxGeometry(0.6, 1.96, 0.012)
    const gMacaneta = new THREE.BoxGeometry(0.025, 0.14, 0.035)
    const gTomada = new THREE.BoxGeometry(0.035, 0.035, 0.014)
    const gLedPdu = new THREE.BoxGeometry(0.022, 0.022, 0.012)
    // gerenciador vertical
    const gCanal = new THREE.BoxGeometry(0.1, 2.1, 0.16)
    const gDedo = new THREE.BoxGeometry(0.12, 0.03, 0.07)
    const gVelcro = new THREE.BoxGeometry(0.075, 0.016, 0.075)
    // infraestrutura aerea
    const gBandeja = new THREE.BoxGeometry(largura - 3, 0.05, 0.44)
    const gTravessa = new THREE.BoxGeometry(0.05, 0.1, 0.44)
    const gDrop = new THREE.CylinderGeometry(0.028, 0.028, 1, 6)
    const gBusway = new THREE.BoxGeometry(largura - 2, 0.17, 0.17)
    const gTomadaBusway = new THREE.BoxGeometry(0.13, 0.11, 0.13)
    const gTuboSprinkler = new THREE.CylinderGeometry(0.045, 0.045, largura - 2, 8)
    const gSubidaBico = new THREE.CylinderGeometry(0.016, 0.016, 0.09, 6)
    const gBico = new THREE.ConeGeometry(0.035, 0.05, 8)
    const gDetector = new THREE.CylinderGeometry(0.07, 0.07, 0.035, 10)
    // contencao
    const gPainel = new THREE.PlaneGeometry(1.34, 3.6)
    const gPerfil = new THREE.BoxGeometry(0.06, 0.06, 3.6)
    const gLongarina = new THREE.BoxGeometry(largura, 0.08, 0.08)
    // piso elevado
    const gJunta = new THREE.BoxGeometry(0.012, 0.004, prof * 0.86)
    const gJuntaZ = new THREE.BoxGeometry(largura, 0.004, 0.012)
    const gFurada = new THREE.BoxGeometry(0.56, 0.005, 0.56)
    const gFaixa = new THREE.BoxGeometry(largura, 0.005, 0.1)
    // sinalizacao e carrinho
    const gPlacaFileira = new THREE.BoxGeometry(0.5, 0.2, 0.02)
    const gDigito = new THREE.BoxGeometry(0.07, 0.1, 0.006)
    const gTirante = new THREE.CylinderGeometry(0.008, 0.008, 0.1, 5)
    const gPrateleira = new THREE.BoxGeometry(0.62, 0.03, 0.44)
    const gPernaCarrinho = new THREE.BoxGeometry(0.025, 0.24, 0.025)
    const gRoda = new THREE.CylinderGeometry(0.045, 0.045, 0.03, 10)
    const gTampaNote = new THREE.BoxGeometry(0.34, 0.22, 0.012)
    const gTelaNote = new THREE.PlaneGeometry(0.31, 0.19)
    const gBaseNote = new THREE.BoxGeometry(0.34, 0.016, 0.24)

    // ── materiais ─────────────────────────────────────────────────────────
    const mCorpo = new THREE.MeshStandardMaterial({ metalness: 0.9, roughness: 0.34 })
    const mMetal = new THREE.MeshStandardMaterial({ color: '#31363d', metalness: 0.82, roughness: 0.4 })
    const mFuro = new THREE.MeshStandardMaterial({ color: '#0a0c0e', roughness: 0.9 })
    const mEquip = new THREE.MeshStandardMaterial({ color: '#15181c', metalness: 0.95, roughness: 0.28 })
    const mCega = new THREE.MeshStandardMaterial({ color: '#1d2025', metalness: 0.5, roughness: 0.7 })
    const mEscuro = new THREE.MeshStandardMaterial({ color: '#080a0c', roughness: 0.95 })
    const mPdu = new THREE.MeshStandardMaterial({ color: '#24282d', metalness: 0.65, roughness: 0.5 })
    const mLamina = new THREE.MeshStandardMaterial({ color: '#141619', metalness: 0.85, roughness: 0.42 })
    const mMoldura = new THREE.MeshStandardMaterial({ color: '#1b1e22', metalness: 0.8, roughness: 0.45 })
    const mPolido = new THREE.MeshStandardMaterial({ color: '#6e767e', metalness: 0.9, roughness: 0.3 })
    const mCanal = new THREE.MeshStandardMaterial({ color: '#23272c', metalness: 0.6, roughness: 0.55 })
    const mAluminio = new THREE.MeshStandardMaterial({ color: '#8d949c', metalness: 0.8, roughness: 0.35 })
    const mBandeja = new THREE.MeshStandardMaterial({ color: '#2a2e33', metalness: 0.85, roughness: 0.5 })
    const mBusway = new THREE.MeshStandardMaterial({ color: '#3a4046', metalness: 0.75, roughness: 0.4 })
    const mTuboFogo = new THREE.MeshStandardMaterial({ color: '#8f2f28', metalness: 0.45, roughness: 0.6 })
    const mLatao = new THREE.MeshStandardMaterial({ color: '#c9a94a', metalness: 0.75, roughness: 0.45 })
    const mDetector = new THREE.MeshStandardMaterial({ color: '#d8dade', roughness: 0.8 })
    const mJunta = new THREE.MeshStandardMaterial({ color: '#2a2c30', roughness: 0.8 })
    const mFurada = new THREE.MeshStandardMaterial({ color: '#101215', roughness: 0.95, metalness: 0.2 })
    const mFaixa = new THREE.MeshStandardMaterial({ color: '#c8a33a', roughness: 0.6, metalness: 0.2 })
    const mSinal = new THREE.MeshStandardMaterial({ color: '#d7dade', roughness: 0.8 })
    const mCarrinho = new THREE.MeshStandardMaterial({ color: '#2b2f35', metalness: 0.5, roughness: 0.6 })
    const mRoda = new THREE.MeshStandardMaterial({ color: '#0d0f11', roughness: 0.85 })
    const mTela = new THREE.MeshStandardMaterial({
      color: '#7fd4ff',
      emissive: '#7fd4ff',
      emissiveIntensity: 1.9,
      toneMapped: false,
    })
    /**
     * A CONTENCAO NAO USA `transmission`, e a escolha e de orcamento.
     *
     * O estudo usa `meshPhysicalMaterial` com `transmission`, que e vidro de
     * verdade — e que faz o renderer desenhar a cena INTEIRA num alvo extra para
     * ter o que refratar. Um passe a mais por quadro. O estudo pode: e uma rota
     * de laboratorio numa maquina de mesa.
     *
     * Aqui nao: celular e requisito declarado na spec, este ja e o andar mais
     * caro do predio, e a essa distancia policarbonato translucido e vidro sao o
     * mesmo pixel. Transparencia simples entrega a leitura pelo preco de um
     * `alpha blend`.
     */
    const mPainel = new THREE.MeshStandardMaterial({
      color: '#cfe6f5',
      roughness: 0.18,
      metalness: 0,
      transparent: true,
      opacity: 0.26,
      side: THREE.DoubleSide,
      depthWrite: false,
    })

    const vivos = {
      dado: Array.from(
        { length: FASES },
        () =>
          new THREE.MeshStandardMaterial({
            color: VIVO,
            emissive: new THREE.Color(VIVO),
            toneMapped: false,
          }),
      ),
      alerta: Array.from(
        { length: FASES },
        () =>
          new THREE.MeshStandardMaterial({
            color: ALERTA,
            emissive: new THREE.Color(ALERTA),
            toneMapped: false,
          }),
      ),
    }

    const tons = ['#0e1013', '#14171b', '#0b0d0f', '#161a1f'].map((c) => new THREE.Color(c))

    // ── plantao: onde cada coisa mora, em z ───────────────────────────────
    // Tudo sai de `zCentro` e `prof`, nunca cravado: a laje da descida e mais
    // funda em perspectiva promovida do que em parallax, e numero cravado
    // atravessaria a parede no degrau de baixo.
    const zFundo = zCentro - prof * 0.22
    const zFrente = zCentro + prof * 0.16
    // As duas fileiras se ENCARAM, entao o meio e o corredor FRIO — e por ali
    // que sobe o ar das placas perfuradas.
    const zFrio = (zFundo + zFrente) / 2
    const passo = 0.76
    const n = Math.floor((largura - 1) / passo)

    // Alturas da infraestrutura aerea, do rack (2,2) ate a laje (PE_DIREITO).
    const yBandeja = piso + 2.62
    const yBusway = piso + 2.86
    const yContencao = piso + 2.42
    const yLuminaria = piso + PE_DIREITO - 0.16
    const ySprinkler = piso + PE_DIREITO - 0.15

    // Os cabos se acumulam aqui e sao fundidos no fim, por cor.
    const tubosDado: THREE.BufferGeometry[] = []
    const tubosForca: THREE.BufferGeometry[] = []

    const monta = (x: number, z: number, girado: boolean, s: number) => {
      const ry = girado ? Math.PI : 0
      const lado = girado ? -1 : 1
      // Ponto local do rack (frente em +z, base em y=0) para o mundo. Girar o
      // rack e espelhar x e z — e a mesma conta que a matriz de rotacao faz.
      const p = (lx: number, ly: number, lz: number): [number, number, number] => [
        x + lx * lado,
        piso + ly,
        z + lz * lado,
      ]

      col.poe('corpo', gCorpo, mCorpo, [x, piso + 1.1, z], [0, ry, 0], [1, 1, 1], tons[s % 4])
      for (const dx of [-0.26, 0.26]) {
        col.poe('montante', gMontante, mMetal, p(dx, 1.1, 0.42), [0, ry, 0])
        /**
         * A FURACAO DE NORMA VIROU UMA TIRA, e esta e a unica concessao de
         * fidelidade do porte — entao ela fica escrita.
         *
         * O estudo desenha os tres furos de cada U no ritmo IRREGULAR da norma
         * (0,25 / 0,875 / 1,5 pol da base do U), e esse ritmo quebrado e o que
         * faz quem ja parafusou equipamento reconhecer o rack. Em `/predio-real`
         * ele continua la, porque a camera daquela rota fica a 3,4 m.
         *
         * Aqui a camera para a 9 m do rack. Com 55 pixels por metro, um furo de
         * 9,5 mm ocupa MEIO PIXEL: nao existe ritmo para reconhecer, existe uma
         * coluna escura. E essa coluna escura custava 217.728 triangulos por
         * quadro — 27% do andar inteiro, mais que todo o cabeamento — em 18.144
         * copias que o visitante nunca resolve.
         *
         * Entao a coluna escura passa a ser desenhada como o que ela e vista de
         * longe: uma tira. 142 copias no lugar de 18.144, mesmo pixel.
         */
        col.poe('tiraFuro', gTiraFuro, mFuro, p(dx, 1.07, 0.447), [0, ry, 0])
      }

      for (const { u, altura, tipo } of ocupacao(s)) {
        const y = 0.14 + u * U + (altura * U) / 2
        const h = altura * U - 0.003
        col.poe(
          `face-${tipo}-${altura}`,
          new THREE.BoxGeometry(LARGURA_UTIL, h, 0.028),
          tipo === 'cega' ? mCega : mEquip,
          p(0, y, 0.5),
          [0, ry, 0],
        )
        if (tipo === 'cega') continue
        // Doze furos de ventilacao, nao 26: pela mesma conta de pixel da tira de
        // furacao, o segundo de cada par nao produz pixel proprio — produzia
        // 147.264 triangulos.
        if (altura >= 2)
          for (let v = 0; v < 12; v++)
            col.poe(
              'vent',
              gVent,
              mEscuro,
              p(-0.2 + (v % 6) * 0.08, y + (v < 6 ? h * 0.22 : -h * 0.22), 0.516),
              [0, ry, 0],
            )
        if (tipo === 'patch')
          for (let q = 0; q < 24; q++)
            col.poe(
              'rj45',
              gPorta,
              mEscuro,
              p(-0.25 + (q % 12) * 0.0455, y + (q < 12 ? 0.012 : -0.012), 0.518),
              [0, ry, 0],
            )
        if (tipo === 'switch')
          for (let q = 0; q < 20; q++) {
            const fase = (q + s) % FASES
            const al = (q + s) % 3 === 0
            col.poe(
              `led-${al ? 'a' : 'd'}-${fase}`,
              gLed,
              al ? vivos.alerta[fase]! : vivos.dado[fase]!,
              p(-0.24 + q * 0.025, y - 0.012, 0.52),
              [0, ry, 0],
            )
          }
        if (tipo === 'discos')
          for (let d = 0; d < 12; d++) {
            const fase = (d * 3 + s) % FASES
            col.poe(
              `led-a-${fase}`,
              gBaia,
              vivos.alerta[fase]!,
              p(-0.22 + (d % 6) * 0.088, y + (d < 6 ? 0.02 : -0.02), 0.52),
              [0, ry, 0],
            )
          }
        if (tipo === 'servidor') {
          const fase = (u + s) % FASES
          col.poe(`led-d-${fase}`, gLed, vivos.dado[fase]!, p(0.22, y, 0.52), [0, ry, 0])
        }
      }

      /**
       * GERENCIADOR VERTICAL — a calha lateral e o que o cabo obedece.
       *
       * Patch cord nao sobe reto pela frente do equipamento: sai da porta, faz um
       * arco suave ate o canal lateral, sobe dentro do canal e so entao vai para
       * a bandeja. Curva fechada e proibida — o minimo e quatro vezes o diametro
       * do cabo em cobre, vinte vezes em fibra. A sobra fica como FOLGA DE
       * SERVICO enrolada no canal, nunca no caminho do ar.
       */
      col.poe('canal', gCanal, mCanal, p(-0.33, 1.1, 0.34), [0, ry, 0])
      for (const y of [0.45, 0.95, 1.45, 1.95]) col.poe('dedo', gDedo, mMetal, p(-0.33, y, 0.45), [0, ry, 0])

      // Arcos da porta ate o canal — o "sweeping bend" que a norma pede. Tres em
      // vez dos seis do estudo: a essa distancia o quarto arco nao acrescenta
      // pixel, so triangulo.
      for (let k = 0; k < 3; k++) {
        const y = 0.42 + ((k * 5 + s) % 9) * 0.17
        tubosDado.push(
          tuboDeCabo(p(-0.3 + k * 0.012, y, 0.53), p(-0.33, 1.35 + (k - 1) * 0.06, 0.42), 0.07 + (k % 3) * 0.02, 0.009),
        )
      }
      // Folga de servico dentro do canal.
      tubosDado.push(tuboDeCabo(p(-0.33, 1.5, 0.42), p(-0.33, 1.72, 0.42), 0.16, 0.014))
      /**
       * O FEIXE ATE A BANDEJA — e este e o cabo que o predio realmente mostra.
       *
       * Sobe do topo do rack ate a bandeja suspensa, atravessando o vao que
       * antes era ar. Sao quatro cabos com barrigas ligeiramente diferentes, e e
       * essa diferenca que o olho le como "molho de cabo" em vez de "mangueira".
       * Velcro e nao abraçadeira: abraçadeira apertada esmaga o par trancado e
       * derruba o desempenho do enlace.
       */
      for (let k = 0; k < 4; k++) {
        tubosDado.push(
          tuboDeCabo(
            p(-0.34 + k * 0.016, 1.88, 0.4 - k * 0.01),
            [x + (-0.2 + k * 0.014) * lado, yBandeja - 0.08, z + (girado ? 0.9 : -0.9)],
            0.06 + ((k * 3 + s) % 4) * 0.02,
            0.0085,
          ),
        )
      }
      for (const y of [1.98, 2.12])
        col.poe('velcro', gVelcro, mEscuro, p(-0.27 + (y - 1.98) * 1.1, y, 0.29 - (y - 1.98) * 1.5), [0, ry, 0])

      /**
       * A TRASEIRA — e ela existe porque as duas fileiras se encaram.
       *
       * A camera da descida ve a COSTA da fileira da frente, nao a face. Sem
       * traseira, essa fileira e uma caixa lisa e o andar perde metade do que
       * tem para mostrar. Uma porta em cada quatro fica ABERTA: porta traseira so
       * se abre quando alguem esta trabalhando no rack, e datacenter em operacao
       * sempre tem alguem trabalhando em algum. Todas fechadas le como foto de
       * catalogo no dia da inauguracao.
       */
      const aberta = s % 4 === 1
      const giroPorta = aberta ? -1.15 : 0
      // A porta gira em torno da dobradica, entao a folha e posicionada a partir
      // dela, e nao do centro do rack.
      const dobradicaX = x + -0.3 * lado
      const dobradicaZ = z + -0.5 * lado
      const bracoX = Math.cos(giroPorta) * 0.3
      const bracoZ = Math.sin(giroPorta) * 0.3
      const folhaX = dobradicaX + bracoX * lado
      const folhaZ = dobradicaZ + bracoZ * lado
      const ryPorta = ry + giroPorta * lado
      for (let i = 0; i < 14; i++)
        col.poe('lamina', gLamina, mLamina, [folhaX, piso + 0.34 + i * 0.135, folhaZ], [0, ryPorta, 0])
      col.poe('moldura', gMoldura, mMoldura, [folhaX, piso + 1.2, folhaZ], [0, ryPorta, 0])
      col.poe(
        'macaneta',
        gMacaneta,
        mPolido,
        [folhaX + Math.cos(ryPorta) * 0.24, piso + 1.2, folhaZ - Math.sin(ryPorta) * 0.24],
        [0, ryPorta, 0],
      )

      // As duas reguas de tomada, alimentacao A e B.
      for (const [ladoPdu, dx] of [
        [0, -0.25],
        [1, 0.25],
      ] as const) {
        col.poe('pdu', gPdu, mPdu, p(dx, 1.15, -0.42), [0, ry, 0])
        col.poe(
          `ledPdu-${ladoPdu}`,
          gLedPdu,
          ladoPdu ? vivos.dado[0]! : vivos.dado[3]!,
          p(dx, 2.05, -0.39),
          [0, ry, 0],
        )
        for (let t = 0; t < 12; t++) {
          const y = 0.34 + t * 0.145
          col.poe('tomada', gTomada, mEscuro, p(dx, y, -0.385), [0, ry, 0])
          // Cabo de forca: mais GROSSO e mais ESCURO que dado. Confundir os dois
          // e o erro classico de render — energia e dado nunca correm no mesmo
          // feixe, justamente para nao induzir ruido no par trancado.
          //
          // UM A CADA QUATRO, e nao dois em cada tres: sao cotocos de 10 cm
          // atras do rack, quase todos tapados pelo proprio corpo dele, e
          // custavam 138.240 triangulos — mais que o cabeamento azul inteiro,
          // que e o que de fato se ve. Os que sobram bastam para a regua nao
          // parecer desligada.
          if ((t + s + ladoPdu) % 4 === 0)
            tubosForca.push(
              tuboDeCabo(p(dx, y, -0.38), p(dx * 0.45, y + 0.06, -0.3), 0.055 + ((t + s) % 3) * 0.015, 0.011),
            )
        }
      }
    }

    for (let i = 0; i < n; i++) monta(-meiaLargura + 0.6 + i * passo, zFundo, false, i)
    // Vao de acesso no meio da fileira da frente: sem ele a frente e um muro e
    // esconde a contencao, o busway e a segunda fileira — ou seja, tudo o que
    // diz "datacenter" em vez de "armario". Corredor contido tem porta nas
    // pontas e acesso no meio, entao nao e licenca artistica.
    for (let i = 0; i < n; i++) {
      if (i > n / 2 - 3 && i < n / 2 + 2) continue
      monta(-meiaLargura + 0.98 + i * passo, zFrente, true, i + 5)
    }

    /**
     * O FORRO ESCURO — e ele existe por causa de como o predio empilha laje.
     *
     * A regra da cena e "a laje fica embaixo": a laje de um andar e o teto do
     * andar de baixo. Otima regra, um problema aqui — o teto do andar 07 e a
     * laje da COBERTURA, pintada com a cor da cobertura, que e o ponto mais
     * claro do predio. O datacenter ficava com um teto de concreto creme.
     *
     * Em vez de furar a regra (que renderia z-fighting entre duas lajes
     * coincidentes, exatamente o que ela existe para evitar), o andar pendura o
     * PROPRIO forro logo abaixo. E o que sala de maquina tem de verdade: laje
     * aparente pintada de escuro, para o olho nao subir e para a infraestrutura
     * do teto se destacar contra ela.
     */
    col.poe(
      'forro',
      new THREE.BoxGeometry(largura, 0.05, prof * 0.98),
      new THREE.MeshStandardMaterial({ color: '#15171a', roughness: 0.9, metalness: 0.1 }),
      [0, piso + PE_DIREITO - 0.03, zCentro],
    )

    // ── infraestrutura aerea ──────────────────────────────────────────────
    // Bandeja de cabo sobre o corredor QUENTE de cada fileira: e para la que o
    // feixe sobe, e e ela que transforma o vao acima dos racks em infraestrutura.
    for (const zB of [zFundo - 0.9, zFrente + 0.9]) {
      col.poe('bandeja', gBandeja, mBandeja, [0, yBandeja, zB])
      const travessas = Math.floor((largura - 3) / 0.66)
      for (let i = 0; i < travessas; i++) {
        const xT = -(largura - 3) / 2 + 0.33 + i * 0.66
        col.poe('travessa', gTravessa, mBandeja, [xT, yBandeja - 0.06, zB])
        // Molhos descendo da bandeja: comprimento variado de proposito. Cabo
        // igualzinho le como repeticao de software, nao como coisa instalada.
        if (i % 3 === 0) {
          const comp = 0.34 + ((i * 37) % 11) * 0.045
          col.poe('molho', gDrop, mEscuro, [xT + 0.2, yBandeja - 0.06 - comp / 2, zB + 0.1], [0, 0, 0], [1, comp, 1])
        }
      }
    }

    // Busway: o trilho de energia, distinto da bandeja de dados. Sao dois
    // caminhos separados no teto, e quem conhece a sala le a diferenca.
    for (const zW of [zFundo - 0.55, zFrente + 0.55]) {
      col.poe('busway', gBusway, mBusway, [0, yBusway, zW])
      const tomadas = Math.floor((largura - 4) / 1.22)
      for (let i = 0; i < tomadas; i++)
        col.poe('tomadaBusway', gTomadaBusway, mMoldura, [
          -(largura - 4) / 2 + i * 1.22,
          yBusway - 0.13,
          zW + 0.02,
        ])
    }

    /**
     * CONTENCAO DE CORREDOR FRIO — a assinatura de datacenter moderno.
     *
     * Sem ela, ar quente e frio se misturam e a sala inteira precisa ser
     * resfriada. Com ela, o corredor entre as duas fileiras vira uma caixa
     * fechada: teto proprio, mais baixo que a laje, e a luz das barras vaza por
     * ele. Visualmente e o que separa "sala com computador" de "datacenter".
     */
    const vaoFrio = zFrente - zFundo
    const paineis = Math.floor(largura / 1.42)
    for (let i = 0; i < paineis; i++) {
      const xP = -largura / 2 + 0.71 + i * 1.42
      col.poe('painel', gPainel, mPainel, [xP, yContencao, zFrio], [-Math.PI / 2, 0, 0], [1, vaoFrio / 3.6, 1])
      col.poe('perfil', gPerfil, mAluminio, [xP - 0.71, yContencao, zFrio], [0, 0, 0], [1, 1, vaoFrio / 3.6])
    }
    for (const dz of [vaoFrio / 2, -vaoFrio / 2])
      col.poe('longarina', gLongarina, mAluminio, [0, yContencao, zFrio + dz])

    // Placa de identificacao da fileira, pendurada na contencao.
    for (const [xS, digitos] of [
      [-meiaLargura * 0.42, 3],
      [meiaLargura * 0.42, 3],
    ] as const) {
      col.poe('placaFileira', gPlacaFileira, mSinal, [xS, yContencao - 0.34, zFrio])
      for (let d = 0; d < digitos; d++)
        col.poe('digito', gDigito, mMoldura, [xS - 0.13 + d * 0.13, yContencao - 0.34, zFrio + 0.013])
      for (const dx of [-0.2, 0.2])
        col.poe('tiranteP', gTirante, mPolido, [xS + dx, yContencao - 0.19, zFrio])
    }

    /**
     * SPRINKLER — toda sala de equipamento tem combate a incendio, e o tubo
     * vermelho no teto e o sinal mais reconhecivel disso. Em datacenter o sistema
     * costuma ser de acao previa: o tubo fica seco e so enche depois que dois
     * detectores concordam, para uma cabeca rompida nao alagar milhoes.
     */
    for (const zS of [zCentro + prof * 0.36, zCentro - prof * 0.36]) {
      col.poe('tuboFogo', gTuboSprinkler, mTuboFogo, [0, ySprinkler, zS], [0, 0, Math.PI / 2])
      const bicos = Math.floor((largura - 4) / 2)
      for (let i = 0; i < bicos; i++) {
        const xB = -(largura - 4) / 2 + i * 2
        col.poe('subidaBico', gSubidaBico, mLatao, [xB, ySprinkler - 0.07, zS])
        col.poe('bico', gBico, mLatao, [xB, ySprinkler - 0.13, zS])
        if (i % 2 === 1) col.poe('detector', gDetector, mDetector, [xB + 1, ySprinkler - 0.03, zS + 0.5])
      }
    }

    /**
     * PISO ELEVADO — a malha de placas de 600 mm, com as PERFURADAS so no
     * corredor frio.
     *
     * O ar condicionado pressuriza o vao sob o piso e o ar sobe pelas placas
     * furadas, que por isso ficam na frente dos equipamentos e nunca no corredor
     * quente. A malha visivel e o que da ESCALA ao chao — sem ela o piso e uma
     * superficie infinita sem medida, que era o defeito do andar liso.
     */
    const yPiso = piso + 0.006
    const juntas = Math.floor(largura / 0.6)
    for (let i = 0; i <= juntas; i++)
      col.poe('junta', gJunta, mJunta, [-largura / 2 + i * 0.6, yPiso, zCentro])
    for (let i = 0; i < 8; i++)
      col.poe('juntaZ', gJuntaZ, mJunta, [0, yPiso, zCentro - prof * 0.42 + i * (prof * 0.84) / 7])
    const furadas = Math.floor((largura - 1) / 0.6)
    for (let i = 0; i < furadas; i++)
      for (const dz of [-0.62, 0.62])
        col.poe('furada', gFurada, mFurada, [-largura / 2 + 0.8 + i * 0.6, yPiso + 0.002, zFrio + dz])
    // Faixa de seguranca: leitura industrial por quase nada.
    col.poe('faixa', gFaixa, mFaixa, [0, yPiso + 0.002, zCentro + prof * 0.42])

    /**
     * CARRINHO DE SERVICO — o objeto que mais faz a sala parecer HABITADA.
     *
     * E a unica coisa ali que nao foi instalada: foi DEIXADA. Todo datacenter
     * tem um, empurrado para perto do rack em que alguem mexeu por ultimo, com a
     * tela ainda acesa. Sala impecavel le como maquete de vendas; sala com um
     * carrinho fora de lugar le como lugar onde alguem trabalha.
     */
    const xCar = meiaLargura * 0.24
    const zCar = zFrio + 0.9
    for (const y of [0.28, 0.62]) col.poe('prateleira', gPrateleira, mCarrinho, [xCar, piso + y, zCar], [0, 0.34, 0])
    for (const dx of [-0.26, 0.26])
      for (const dz of [-0.17, 0.17]) {
        col.poe('pernaCar', gPernaCarrinho, mCarrinho, [xCar + dx, piso + 0.16, zCar + dz], [0, 0.34, 0])
        col.poe('roda', gRoda, mRoda, [xCar + dx, piso + 0.05, zCar + dz], [Math.PI / 2, 0.34, 0])
      }
    col.poe('baseNote', gBaseNote, mMoldura, [xCar, piso + 0.645, zCar + 0.02], [0, 0.34, 0])
    col.poe('tampaNote', gTampaNote, mMoldura, [xCar, piso + 0.75, zCar - 0.1], [-1.15, 0.34, 0])
    col.poe('telaNote', gTelaNote, mTela, [xCar, piso + 0.754, zCar - 0.095], [-1.15, 0.34, 0])

    // ── cabos: fundidos, nao instanciados ─────────────────────────────────
    const malhas: THREE.Object3D[] = col.colhe()
    const mCaboDado = new THREE.MeshStandardMaterial({ color: AZUL, roughness: 0.66, metalness: 0.04 })
    const mCaboForca = new THREE.MeshStandardMaterial({ color: '#0d0f12', roughness: 0.8, metalness: 0.05 })
    for (const [tubos, mat] of [
      [tubosDado, mCaboDado],
      [tubosForca, mCaboForca],
    ] as const) {
      if (tubos.length === 0) continue
      const fundida = mergeGeometries(tubos, false)
      for (const t of tubos) t.dispose()
      if (!fundida) continue
      const malha = new THREE.Mesh(fundida, mat)
      malha.castShadow = true
      malha.receiveShadow = true
      malha.frustumCulled = false
      malhas.push(malha)
    }

    // As barras de luz continuam declarativas: sao poucas e cada uma carrega um
    // `pointLight` e um sprite, que nao cabem numa `InstancedMesh`.
    const barras = Array.from(
      { length: 7 },
      (_, i) => -meiaLargura + 2.2 + i * ((largura - 4.4) / 6),
    )

    return { malhas, vivos, barras, yLuminaria, zFrio, zFundo, zFrente }
  }, [piso, zCentro, prof, meiaLargura])

  useMemo(() => {
    for (const m of malhas) scene.add(m)
    return () => {
      for (const m of malhas) scene.remove(m)
    }
  }, [malhas, scene])

  // Seis materiais animados dao conta de milhares de LEDs — instancia nao
  // carrega material proprio, entao o piscar mora no material compartilhado e
  // os LEDs se agrupam por fase.
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    for (let i = 0; i < FASES; i++) {
      // Trafego de rede: rajadas curtas separadas por silencio.
      const r = Math.sin(t * (7.3 + i * 1.9) + i * 2.1) * Math.sin(t * (2.7 + i * 0.6) + i)
      vivos.dado[i]!.emissiveIntensity = 1.1 + 3.9 * Math.max(0, r)
      // Atividade de disco: mais lenta, mais esparsa.
      const d = Math.sin(t * (1.9 + i * 0.45) + i * 3.3)
      vivos.alerta[i]!.emissiveIntensity = 0.5 + 2.6 * Math.max(0, d * d * d)
    }
  })

  /**
   * A LUZ PROPRIA DO ANDAR.
   *
   * Cada barra e DUAS coisas — a chapa acesa que se ve e um `pointLight` que
   * ninguem ve fazendo o trabalho —, porque material emissivo no three.js brilha
   * para a camera e nao lanca um lumen. Agora e TRES: ganhou o halo, que e o que
   * faz a luminaria parecer fotografada em vez de recortada.
   *
   * Sem sombra de proposito: sombra por luz pontual custa um passe cada, e o
   * orcamento deste andar ja e o maior do predio.
   *
   * A VARIACAO ENTRE LUMINARIAS mata o ultimo cheiro de CG no teto. Lampada real
   * nao sai toda igual da caixa e envelhece diferente: a mesma referencia varia
   * alguns graus de temperatura de fabrica, e depois de uns anos umas puxam para
   * o azul e outras para o palha. Teto com todas identicas e a assinatura mais
   * confiavel de render.
   */
  const tons = ['#9fd4ff', '#a8d8ff', '#93cdf7', '#b3ddff', '#8ec7f2']
  const yBarra = piso + PE_DIREITO - 0.16
  const zCorredor = zCentro - prof * 0.03

  return (
    <>
      {barras.map((x, i) => {
        const cor = tons[i % tons.length]!
        // Uma em cada sete no fim da vida — acende menos.
        const fator = i % 7 === 3 ? 0.42 : 0.9 + (i % 3) * 0.07
        return (
          <group key={x} position={[x, yBarra, zCorredor]}>
            {/* corpo da luminaria: calha, difusor recuado e tampas. Sao essas
                pecas, e nao o brilho, que fazem o teto parecer construido. */}
            <mesh>
              <boxGeometry args={[2.6, 0.09, 0.15]} />
              <meshStandardMaterial color="#40464d" metalness={0.75} roughness={0.38} />
            </mesh>
            <mesh position={[0, -0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <planeGeometry args={[2.46, 0.11]} />
              <meshStandardMaterial
                color={cor}
                emissive={FRIO}
                emissiveIntensity={5.5}
                toneMapped={false}
                side={THREE.DoubleSide}
              />
            </mesh>
            {[-1.32, 1.32].map((dx) => (
              <mesh key={dx} position={[dx, 0, 0]}>
                <boxGeometry args={[0.05, 0.11, 0.17]} />
                <meshStandardMaterial color="#2f343a" metalness={0.7} roughness={0.45} />
              </mesh>
            ))}
            {[-1, 1].map((dx) => (
              <mesh key={`t${dx}`} position={[dx, 0.1, 0]}>
                <cylinderGeometry args={[0.008, 0.008, 0.2, 5]} />
                <meshStandardMaterial color="#6b7278" metalness={0.85} roughness={0.35} />
              </mesh>
            ))}
            <pointLight
              color={cor}
              intensity={(i % 7 === 3 ? 2.6 : 6) * fator}
              distance={8.5}
              decay={1.7}
              position={[0, -0.3, 0]}
            />
            <sprite position={[0, -0.06, 0]} scale={[4.2, 0.85, 1]}>
              <spriteMaterial
                map={halo}
                color={cor}
                transparent
                opacity={0.5 * fator}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </sprite>
          </group>
        )
      })}
    </>
  )
}
