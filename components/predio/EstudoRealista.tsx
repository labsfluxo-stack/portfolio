'use client'
import { Suspense, createContext, useContext, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, ContactShadows, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { PE_DIREITO, LAJE, PILARES } from './predio-arquitetura'

/**
 * ESTUDO DESCARTAVEL — o andar 07 (Servidores) em realismo. Sai quando a
 * direcao for decidida.
 *
 * A APOSTA, e o motivo dela: o que faz interior parecer real nao e poligono, e
 * LUZ QUE QUICA. Sem isso todo canto fora do sol vira preto morto — o defeito
 * exato do marrom. Calcular esse quique em tempo real na web e caro demais para
 * celular; um HDRI traz o quique ja embutido, entao o navegador so amostra.
 * 1,6 MB, CC0, e quase nada de quadro.
 *
 * O QUE FAZ LER COMO *MODERNO*, e nao apenas como real, e outra coisa: nao e
 * detalhe, e CONTRASTE. Datacenter moderno e ambiente escuro com luz propria
 * fria — barra de LED, porta perfurada acesa por tras, piso epoxi refletindo.
 * A versao anterior estava cinza-lavada porque so tinha luz de ambiente e
 * nenhuma luz PROPRIA. Aqui o ambiente foi baixado e o emissivo subiu.
 *
 * Geometria continua procedural: rack e caixa com grade, e nenhum acervo
 * gratuito tem rack. Quem carrega o realismo e material e luz, nao malha.
 */

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '/portfolio'
const FRIO = '#9fd4ff'
const VIVO = '#6bff9e'

const AZUL = '#1f5fb0'

/**
 * AS MEDIDAS DO PADRAO 19 POLEGADAS — nao sao arbitrarias, sao norma.
 *
 * 1U = 1,75 pol = 44,45 mm. Largura util = 19 pol = 482,6 mm. E a furacao do
 * montante NAO e uniforme: dentro de cada U os tres furos ficam a 0,25 pol,
 * 0,875 pol e 1,5 pol da base — espacados 15,9 / 15,9 / 12,7 mm, um ritmo
 * IRREGULAR que se repete a cada 44,45 mm.
 *
 * Esse detalhe importa mais do que parece. Furo igualmente espacado — que era o
 * que eu tinha — e o que denuncia rack modelado de cabeca. Quem ja parafusou
 * equipamento reconhece o ritmo quebrado na hora, mesmo sem saber que sabe.
 */
const U = 0.04445
const LARGURA_UTIL = 0.4826
const FUROS_NO_U = [0.00635, 0.02223, 0.0381]
const US_DO_RACK = 42

/**
 * AS MAQUINAS LIGADAS — e a tecnica importa tanto quanto o efeito.
 *
 * Datacenter e definido por PISCAR. LED parado le como fotografia de folheto;
 * o mesmo LED com atividade irregular le como maquina trabalhando. So que sao
 * milhares de luzes na cena, e animar cada uma custaria um `useFrame` por LED.
 *
 * A saida e compartilhar MATERIAL: seis materiais vivos, cada um com sua fase,
 * e cada LED aponta para um deles pelo indice. Seis atualizacoes por quadro em
 * vez de milhares, e o olho nao distingue — porque ninguem acompanha um LED
 * especifico, so a textura geral de atividade.
 *
 * A irregularidade vem de soma de senos com frequencias incomensuraveis, nunca
 * de `Math.random()`: a cena precisa ser identica a cada carregamento (regra da
 * casa em `components/three/`), e ruido aleatorio tambem cintila feio.
 */
const FASES = 6

/**
 * BRILHO — o halo em volta de fonte de luz, e ele nao e enfeite.
 *
 * Olho e camera nao veem luz forte como retangulo de borda dura: veem um nucleo
 * estourado com halo caindo em volta, porque a luz espalha na lente e na cornea.
 * Cena 3D sem isso le como desenho vetorial de uma sala, nunca como foto dela —
 * e era o que faltava aqui: as barras eram retangulos brancos recortados.
 *
 * O jeito moderno seria um passe de bloom em pos-processamento. Nao da: exigiria
 * dependencia nova, e este repo tem uma armadilha conhecida em que `npm install`
 * no Windows poda o lockfile e quebra o deploy. Entao usa-se a tecnica anterior
 * ao bloom, que os jogos usaram por uma decada: um plano sempre virado para a
 * camera, com degrade radial e mistura ADITIVA. Custa um quad e nao precisa de
 * passe nenhum.
 *
 * A textura e desenhada em canvas na hora — nada baixado, nada versionado.
 */
function usaTexturaDeHalo() {
  return useMemo(() => {
    const n = 128
    const cv = document.createElement('canvas')
    cv.width = cv.height = n
    const ctx = cv.getContext('2d')!
    const g = ctx.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2)
    // Queda suave: linear demais vira disco, abrupta demais vira ponto.
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.25, 'rgba(255,255,255,0.42)')
    g.addColorStop(0.55, 'rgba(255,255,255,0.12)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, n, n)
    const tex = new THREE.CanvasTexture(cv)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [])
}

function Halo({
  cor,
  escala,
  opacidade = 0.55,
  ...props
}: { cor: string; escala: [number, number]; opacidade?: number } & Record<string, unknown>) {
  const tex = usaTexturaDeHalo()
  return (
    <sprite scale={[escala[0], escala[1], 1]} {...props}>
      <spriteMaterial
        map={tex}
        color={cor}
        transparent
        opacity={opacidade}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </sprite>
  )
}

type Vivos = { dado: THREE.MeshStandardMaterial[]; alerta: THREE.MeshStandardMaterial[] }
const ContextoVivo = createContext<Vivos | null>(null)

function useMateriaisVivos(): Vivos {
  const mats = useMemo(() => {
    const faz = (cor: string) =>
      Array.from(
        { length: FASES },
        () =>
          new THREE.MeshStandardMaterial({
            color: cor,
            emissive: new THREE.Color(cor),
            toneMapped: false,
          }),
      )
    return { dado: faz(VIVO), alerta: faz('#ffb347') }
  }, [])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    for (let i = 0; i < FASES; i++) {
      // Trafego de rede: rajadas curtas separadas por silencio.
      const r = Math.sin(t * (7.3 + i * 1.9) + i * 2.1) * Math.sin(t * (2.7 + i * 0.6) + i)
      mats.dado[i]!.emissiveIntensity = 1.1 + 3.9 * Math.max(0, r)
      // Atividade de disco: mais lenta, mais esparsa.
      const d = Math.sin(t * (1.9 + i * 0.45) + i * 3.3)
      mats.alerta[i]!.emissiveIntensity = 0.5 + 2.6 * Math.max(0, d * d * d)
    }
  })

  return mats
}

function useVivo(indice: number, alerta = false) {
  const ctx = useContext(ContextoVivo)
  if (!ctx) return undefined
  const lista = alerta ? ctx.alerta : ctx.dado
  return lista[Math.abs(indice) % FASES]
}

/**
 * A curva que um cabo faz — catenaria, nao reta e nao parabola.
 *
 * Cabo suspenso pelo proprio peso assume `y = a·cosh(x/a)`: a tensao tem
 * componente horizontal constante e a vertical cresce ao longo do arco para
 * equilibrar a gravidade. Parece parabola e nao e; a diferenca aparece
 * justamente onde o olho repara, perto dos apoios.
 *
 * Aqui a curva vem parametrizada pela FLECHA (o quanto afunda no meio) em vez
 * de pela densidade linear, porque o que se ajusta a olho e a barriga do cabo,
 * nao a massa por metro. `c` controla o quanto a curva e "catenaria" contra
 * "reta" — 2,2 e a barriga de um patch cord com folga de servico.
 */
function pontosDeCatenaria(a: THREE.Vector3, b: THREE.Vector3, flecha: number, n = 18) {
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

function Cabo({
  de,
  ate,
  flecha,
  raio = 0.009,
  cor = AZUL,
}: {
  de: [number, number, number]
  ate: [number, number, number]
  flecha: number
  raio?: number
  cor?: string
}) {
  const geo = useMemo(() => {
    const curva = new THREE.CatmullRomCurve3(
      pontosDeCatenaria(new THREE.Vector3(...de), new THREE.Vector3(...ate), flecha),
    )
    return new THREE.TubeGeometry(curva, 22, raio, 5, false)
  }, [de, ate, flecha, raio])
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color={cor} roughness={0.66} metalness={0.04} />
    </mesh>
  )
}

/**
 * Gerenciador vertical na lateral do rack, com os cabos dentro.
 *
 * O QUE A PESQUISA CORRIGIU AQUI: patch cord nao sobe reto pela frente do
 * equipamento. Ele sai da porta, faz um ARCO SUAVE ate o canal lateral, desce
 * ou sobe dentro do canal, e so entao vai para a bandeja. Curva fechada e
 * proibida — o minimo e quatro vezes o diametro do cabo em cobre, vinte vezes
 * em fibra —, e a sobra fica como FOLGA DE SERVICO enrolada no canal vertical,
 * nunca no caminho do ar.
 *
 * Tudo azul porque o dono pediu. Na vida real a cor e codigo (uma por funcao,
 * para achar a outra ponta), mas uma cor so le mais limpo e e escolha dele.
 */
function GerenciadorVertical({ semente }: { semente: number }) {
  const saidas = useMemo(
    () => [0, 1, 2, 3, 4, 5].map((k) => 0.42 + ((k * 5 + semente) % 9) * 0.17),
    [semente],
  )
  return (
    <group>
      {/* o canal: calha em C na lateral */}
      <mesh position={[-0.33, 1.1, 0.34]} castShadow>
        <boxGeometry args={[0.1, 2.1, 0.16]} />
        <meshStandardMaterial color="#23272c" metalness={0.6} roughness={0.55} />
      </mesh>
      {/* os dedos que seguram o feixe e impoem o raio de curvatura */}
      {[0.45, 0.95, 1.45, 1.95].map((y) => (
        <mesh key={y} position={[-0.33, y, 0.45]}>
          <boxGeometry args={[0.12, 0.03, 0.07]} />
          <meshStandardMaterial color="#2c3138" metalness={0.5} roughness={0.6} />
        </mesh>
      ))}
      {/* arcos da porta ate o canal — o "sweeping bend" que a norma pede */}
      {saidas.map((y, k) => (
        <Cabo
          key={k}
          de={[-0.3 + k * 0.012, y, 0.53]}
          ate={[-0.33, 1.35 + (k - 3) * 0.04, 0.42]}
          flecha={0.07 + (k % 3) * 0.02}
        />
      ))}
      {/* folga de servico: a volta sobrando dentro do canal, nunca no ar */}
      <Cabo de={[-0.33, 1.5, 0.42]} ate={[-0.33, 1.72, 0.42]} flecha={0.16} raio={0.014} />
      {/* FEIXE ate a bandeja: varios cabos amarrados com velcro, nao um tubo
       * grosso. Feixe real e um punhado de cabos com barrigas ligeiramente
       * diferentes — e essa diferenca que o olho le como "molho de cabo" em vez
       * de "mangueira". Velcro e nao abraçadeira: abraçadeira apertada esmaga o
       * par trancado e derruba o desempenho do enlace. */}
      {[0, 1, 2, 3].map((k) => (
        <Cabo
          key={`fx${k}`}
          de={[-0.34 + k * 0.016, 1.88, 0.4 - k * 0.01]}
          ate={[-0.2 + k * 0.014, 2.28, 0.1]}
          flecha={0.05 + ((k * 3 + semente) % 4) * 0.012}
          raio={0.0085}
        />
      ))}
      {/* as amarracoes de velcro, a cada palmo */}
      {[1.98, 2.12].map((y) => (
        <mesh key={y} position={[-0.27 + (y - 1.98) * 1.1, y, 0.29 - (y - 1.98) * 1.5]}>
          <boxGeometry args={[0.075, 0.016, 0.075]} />
          <meshStandardMaterial color="#15181c" roughness={0.9} />
        </mesh>
      ))}
      {/* CABO DE FORCA: sai do PDU e e visivelmente mais grosso e mais escuro
       * que dado. Confundir os dois e o erro classico de render — energia e
       * dado nunca correm no mesmo feixe, justamente para nao induzir ruido. */}
      {[0.7, 1.25, 1.8].map((y, k) => (
        <mesh key={`pw${y}`} position={[0.3, y, 0.24]} rotation={[0, 0, 0.12 * (k - 1)]}>
          <cylinderGeometry args={[0.016, 0.016, 0.26, 6]} />
          <meshStandardMaterial color="#0b0d10" roughness={0.8} metalness={0.05} />
        </mesh>
      ))}
    </group>
  )
}

/** Rack moderno: porta perfurada, luz vazando de dentro, fileira de LEDs. */
function Rack({
  aceso = true,
  semente = 0,
  ...props
}: { aceso?: boolean; semente?: number } & Record<string, unknown>) {
  /**
   * OCUPACAO DO RACK — empilhada no grid de 1U de verdade, com alturas mistas.
   *
   * Antes eram onze fatias iguais, e rack nenhum e assim: servidor de borda e
   * 1U, storage e 2U, chassi de lamina e 4U ou mais, e sobra U vazia no meio que
   * ganha chapa cega. A ALTURA MISTA e o que faz a coluna ter ritmo — fatia
   * uniforme le como prateleira, nao como equipamento.
   */
  const unidades = useMemo(() => {
    const roteiro = [
      { tipo: 'patch', altura: 1 },
      { tipo: 'switch', altura: 1 },
      { tipo: 'servidor', altura: 1 },
      { tipo: 'servidor', altura: 1 },
      { tipo: 'cega', altura: 1 },
      { tipo: 'discos', altura: 2 },
      { tipo: 'servidor', altura: 2 },
      { tipo: 'cega', altura: 2 },
      { tipo: 'servidor', altura: 1 },
      { tipo: 'discos', altura: 4 },
      { tipo: 'switch', altura: 1 },
      { tipo: 'cega', altura: 3 },
    ] as const
    const itens: { u: number; altura: number; tipo: string; k: number }[] = []
    let u = 1
    let k = 0
    while (u < US_DO_RACK - 1) {
      const d = roteiro[(k + semente) % roteiro.length]!
      if (u + d.altura > US_DO_RACK - 1) break
      itens.push({ u, altura: d.altura, tipo: d.tipo, k })
      u += d.altura
      k++
    }
    return itens
  }, [semente])
  const vivos = useContext(ContextoVivo)
  return (
    <group {...props}>
      {/* VARIACAO ENTRE RACKS — e este e o ultimo "cheiro de CG" que sobrava.
       * Sala real nao tem sessenta e quatro armarios identicos: compra-se em
       * lotes, de fabricantes diferentes, em anos diferentes. Um lote e preto
       * fosco, outro e grafite, outro ja desbotou. A diferenca e pequena de
       * proposito — o que denuncia render nao e a cor errada, e a cor IGUAL
       * repetida sem uma variacao sequer. */}
      <mesh castShadow receiveShadow position={[0, 1.1, 0]}>
        <boxGeometry args={[0.6, 2.2, 1.0]} />
        <meshStandardMaterial
          color={['#0e1013', '#14171b', '#0b0d0f', '#161a1f'][semente % 4]}
          metalness={0.9}
          roughness={0.3 + (semente % 5) * 0.028}
        />
      </mesh>
      {/* MONTANTES DE 19 POLEGADAS — o par de trilhos furados onde tudo parafusa.
       * E a peca que define um rack: a largura util de 19" e o passo de 1U
       * (44,45 mm) sao padrao desde os anos 50, e e por isso que equipamento de
       * fabricantes diferentes cabe no mesmo armario. Sem os montantes a
       * caixa nao le como rack, le como armario de cozinha. */}
      {[-0.26, 0.26].map((dx) => (
        <group key={dx}>
          <mesh position={[dx, 1.1, 0.42]} castShadow>
            <boxGeometry args={[0.035, 2.06, 0.05]} />
            <meshStandardMaterial color="#31363d" metalness={0.82} roughness={0.4} />
          </mesh>
          {/* FURACAO REAL: tres furos por U, em ritmo IRREGULAR (0,25" / 0,875"
           * / 1,5" da base do U), repetido a cada 44,45 mm. Era uniforme antes,
           * e uniforme e o erro classico. */}
          {Array.from({ length: US_DO_RACK }, (_, u) =>
            FUROS_NO_U.map((f, k) => (
              <mesh key={`${u}-${k}`} position={[dx, 0.14 + u * U + f, 0.447]}>
                <boxGeometry args={[0.0095, 0.0095, 0.008]} />
                <meshStandardMaterial color="#0a0c0e" roughness={0.9} />
              </mesh>
            )),
          )}
        </group>
      ))}
      {/* pes niveladores */}
      {[-0.22, 0.22].map((dx) =>
        [-0.38, 0.38].map((dz) => (
          <mesh key={`${dx}${dz}`} position={[dx, 0.025, dz]}>
            <cylinderGeometry args={[0.028, 0.034, 0.05, 6]} />
            <meshStandardMaterial color="#1a1d21" metalness={0.7} roughness={0.5} />
          </mesh>
        )),
      )}
      {/* passagem de cabo no topo, com escova */}
      <mesh position={[0, 2.21, -0.18]}>
        <boxGeometry args={[0.4, 0.02, 0.12]} />
        <meshStandardMaterial color="#0c0e11" roughness={0.95} />
      </mesh>
      {/* maçaneta da porta */}
      <mesh position={[0.24, 1.1, 0.53]} castShadow>
        <boxGeometry args={[0.03, 0.16, 0.04]} />
        <meshStandardMaterial color="#6e767e" metalness={0.9} roughness={0.3} />
      </mesh>
      {/* etiqueta de patrimonio — pequena, e e ela que diz "inventariado" */}
      <mesh position={[-0.16, 2.05, 0.53]}>
        <planeGeometry args={[0.16, 0.045]} />
        <meshStandardMaterial color="#c9ccd1" roughness={0.85} />
      </mesh>
      {/* o vao interno aceso — e o que faz a porta perfurada "vazar" luz */}
      <mesh position={[0, 1.1, 0.46]}>
        <planeGeometry args={[0.5, 1.96]} />
        <meshStandardMaterial
          color={aceso ? FRIO : '#101216'}
          emissive={aceso ? FRIO : '#000'}
          emissiveIntensity={aceso ? 0.5 : 0}
          toneMapped={false}
        />
      </mesh>
      {unidades.map(({ u, altura, tipo, k: i }) => {
        // BLANKING PANEL: posicao de rack vazia recebe chapa cega, sempre. Toda
        // U aberta e risco de ponto quente, porque o ar quente do fundo volta
        // pela frente. Rack real NAO e fileira uniforme de luzinha — e
        // equipamento intercalado com chapa morta.
        //
        // TIPO DA UNIDADE: equipamento de rack nao tem uma luz, tem A SUA luz.
        // Servidor mostra dois pontos; switch mostra fileira de portas; gaveta
        // de disco mostra grade, um LED por baia; painel de patch nao mostra
        // nada. Uma luzinha igual por U le como maquete.
        const viva = aceso && tipo !== 'cega'
        const alturaReal = altura * U - 0.003 // folga entre equipamentos
        const y = 0.14 + u * U + (altura * U) / 2
        return (
          <group key={`${u}`} position={[0, y, 0.5]}>
            <mesh castShadow>
              <boxGeometry args={[LARGURA_UTIL, alturaReal, 0.028]} />
              <meshStandardMaterial
                color={tipo === 'cega' ? '#1d2025' : '#15181c'}
                metalness={tipo === 'cega' ? 0.5 : 0.95}
                roughness={tipo === 'cega' ? 0.7 : 0.28}
              />
            </mesh>
            {/* PERFURACAO de ventilacao: a face de equipamento nao e chapa lisa,
             * e furada para o ar entrar. So nos que respiram — chapa cega e
             * cega justamente por nao ter furo. */}
            {tipo !== 'cega' &&
              altura >= 2 &&
              Array.from({ length: 26 }, (_, v) => (
                <mesh
                  key={`v${v}`}
                  position={[-0.21 + (v % 13) * 0.035, v < 13 ? alturaReal * 0.22 : -alturaReal * 0.22, 0.016]}
                >
                  <boxGeometry args={[0.022, alturaReal * 0.2, 0.006]} />
                  <meshStandardMaterial color="#080a0c" roughness={0.95} />
                </mesh>
              ))}
            {/* switch: fileira de portas, alternando ligado e ocioso */}
            {viva &&
              tipo === 'switch' &&
              Array.from({ length: 20 }, (_, p) => (
                <mesh
                  key={p}
                  position={[-0.24 + p * 0.025, -0.03, 0.02]}
                  material={
                    (p + semente) % 3
                      ? vivos?.dado[(p + semente) % FASES]
                      : vivos?.alerta[(p + semente * 2) % FASES]
                  }
                >
                  <boxGeometry args={[0.012, 0.012, 0.012]} />
                </mesh>
              ))}
            {/* gaveta de disco: grade, um LED por baia */}
            {viva &&
              tipo === 'discos' &&
              Array.from({ length: 12 }, (_, d) => (
                <mesh
                  key={d}
                  position={[-0.22 + (d % 6) * 0.088, d < 6 ? 0.028 : -0.032, 0.02]}
                  // Baia de disco pisca mais devagar e mais esparso que porta de
                  // rede — por isso usa a familia "alerta", nao a de dado.
                  material={vivos?.alerta[(d * 3 + semente) % FASES]}
                >
                  <boxGeometry args={[0.05, 0.036, 0.012]} />
                </mesh>
              ))}
            {/* PAINEL DE PATCH: fileira de tomadas RJ45 e NENHUMA luz. E o
             * equipamento mais comum de um rack e o que menos aparece em render
             * de catalogo, justamente porque nao brilha — so termina cabo. Sem
             * ele, toda U acesa vira parede de discoteca. */}
            {tipo === 'patch' &&
              Array.from({ length: 24 }, (_, p) => (
                <mesh
                  key={p}
                  position={[-0.25 + (p % 12) * 0.0455, p < 12 ? 0.03 : -0.03, 0.018]}
                >
                  <boxGeometry args={[0.03, 0.04, 0.01]} />
                  <meshStandardMaterial color="#0a0c0f" roughness={0.88} metalness={0.15} />
                </mesh>
              ))}
            {/* orelhas de fixacao: a aba parafusada no montante, dos dois lados */}
            {tipo !== 'cega' &&
              [-0.265, 0.265].map((dx) => (
                <mesh key={dx} position={[dx, 0, 0.01]}>
                  <boxGeometry args={[0.03, 0.12, 0.012]} />
                  <meshStandardMaterial color="#2a2e34" metalness={0.7} roughness={0.45} />
                </mesh>
              ))}
            {/* servidor: dois pontos discretos, energia e atividade */}
            {viva && tipo === 'servidor' && (
              <>
                <mesh position={[0.2, 0, 0.02]}>
                  <boxGeometry args={[0.02, 0.02, 0.012]} />
                  <meshStandardMaterial
                    color={VIVO}
                    emissive={VIVO}
                    emissiveIntensity={4}
                    toneMapped={false}
                  />
                </mesh>
                {/* atividade: VIVA. A de energia ao lado fica fixa de proposito —
                 * servidor ligado nao pisca energia, pisca atividade. Piscar as
                 * duas e o que faz a sala virar arvore de natal. */}
                <mesh position={[0.24, 0, 0.02]} material={vivos?.dado[(i + semente) % FASES]}>
                  <boxGeometry args={[0.016, 0.016, 0.012]} />
                </mesh>
              </>
            )}
          </group>
        )
      })}
      <GerenciadorVertical semente={semente} />
      {/* PDU: a regua de tomada vertical na lateral do rack. */}
      <mesh position={[0.28, 1.1, 0.2]} castShadow>
        <boxGeometry args={[0.05, 1.7, 0.07]} />
        <meshStandardMaterial color="#2e3238" metalness={0.6} roughness={0.5} />
      </mesh>
      <Traseira semente={semente} />
    </group>
  )
}

/**
 * A TRASEIRA do rack — e ela nao e uma chapa lisa.
 *
 * Metade das fileiras de um datacenter e vista por tras, porque racks ficam
 * frente com frente. Fundo de rack tem: duas reguas de tomada verticais (uma
 * por alimentacao, A e B, porque equipamento critico tem duas fontes), o molho
 * de cabos de forca descendo delas, o feixe de dados saindo pelo topo, e porta
 * traseira perfurada por onde sai o ar quente.
 *
 * Deixar isso liso foi o que deixou metade do quadro morta.
 */
function Traseira({ semente }: { semente: number }) {
  const tomadas = useMemo(() => Array.from({ length: 14 }, (_, i) => 0.34 + i * 0.125), [])
  return (
    <group>
      {/* PORTA TRASEIRA, com dobradica de verdade: lamina horizontal, mais
       * aberta que a frente porque e por ali que o ar quente sai.
       *
       * Uma em cada quatro fica ABERTA. Nao e enfeite: porta traseira so se
       * abre quando alguem esta trabalhando no rack, e datacenter em operacao
       * sempre tem alguem trabalhando em algum. Fechadas todas, o render vira
       * foto de catalogo no dia da inauguracao — e alem disso a porta esconde
       * exatamente as reguas de tomada e os molhos de forca que existem para
       * serem vistos. */}
      <group
        position={[-0.3, 0, -0.5]}
        rotation={[0, semente % 4 === 1 ? -1.15 : 0, 0]}
      >
        {Array.from({ length: 14 }, (_, i) => (
          <mesh key={i} position={[0.3, 0.34 + i * 0.135, 0]} castShadow>
            <boxGeometry args={[0.56, 0.1, 0.022]} />
            <meshStandardMaterial color="#141619" metalness={0.85} roughness={0.42} />
          </mesh>
        ))}
        {/* moldura e maçaneta da porta */}
        <mesh position={[0.3, 1.2, 0]} castShadow>
          <boxGeometry args={[0.6, 1.96, 0.012]} />
          <meshStandardMaterial color="#1b1e22" metalness={0.8} roughness={0.45} />
        </mesh>
        <mesh position={[0.54, 1.2, 0.03]}>
          <boxGeometry args={[0.025, 0.14, 0.035]} />
          <meshStandardMaterial color="#6e767e" metalness={0.9} roughness={0.3} />
        </mesh>
      </group>
      {/* as duas reguas de tomada, alimentacao A e B */}
      {[-0.25, 0.25].map((dx, lado) => (
        <group key={dx}>
          <mesh position={[dx, 1.15, -0.42]} castShadow>
            <boxGeometry args={[0.06, 1.86, 0.06]} />
            <meshStandardMaterial color="#24282d" metalness={0.65} roughness={0.5} />
          </mesh>
          {/* o LED de alimentacao da propria regua */}
          <mesh position={[dx, 2.05, -0.39]}>
            <boxGeometry args={[0.022, 0.022, 0.012]} />
            <meshStandardMaterial
              color={lado ? '#5fe08a' : '#5fb8e0'}
              emissive={lado ? '#5fe08a' : '#5fb8e0'}
              emissiveIntensity={3}
              toneMapped={false}
            />
          </mesh>
          {tomadas.map((y, t) => (
            <mesh key={y} position={[dx, y, -0.385]}>
              <boxGeometry args={[0.035, 0.035, 0.014]} />
              <meshStandardMaterial color="#0b0d0f" roughness={0.9} />
            </mesh>
          ))}
          {/* cabos de forca descendo da regua ate cada equipamento */}
          {tomadas
            .filter((_, t) => (t + semente + lado) % 3 !== 0)
            .map((y, t) => (
              <Cabo
                key={`f${y}`}
                de={[dx, y, -0.38]}
                ate={[dx * 0.45, y + 0.06, -0.3]}
                flecha={0.055 + ((t + semente) % 3) * 0.015}
                raio={0.011}
                cor="#0d0f12"
              />
            ))}
        </group>
      ))}
      {/* feixe de dados saindo pelo topo, rumo a bandeja */}
      {[0, 1, 2].map((k) => (
        <Cabo
          key={`d${k}`}
          de={[-0.1 + k * 0.09, 2.12, -0.4]}
          ate={[0.02 + k * 0.07, 2.3, -0.9]}
          flecha={0.04}
          raio={0.0095}
        />
      ))}
    </group>
  )
}

/**
 * Contencao de corredor frio — a assinatura de datacenter moderno, e a coisa
 * que mais faltava aqui.
 *
 * Sem ela, ar quente e frio se misturam e a sala inteira precisa ser resfriada.
 * Com ela, o corredor entre duas fileiras vira uma caixa fechada: teto de
 * policarbonato translucido e porta nas pontas. Visualmente e o que separa
 * "sala com computador" de "datacenter": o corredor tem TETO PROPRIO, mais
 * baixo que a laje, e a luz vaza por ele.
 */
function Contencao({ z, largura = 30 }: { z: number; largura?: number }) {
  const paineis = useMemo(() => Array.from({ length: 20 }, (_, i) => -13.5 + i * 1.42), [])
  return (
    <group position={[0, 0.98, z]}>
      {paineis.map((x) => (
        <mesh key={x} position={[x, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.34, 2.5]} />
          <meshPhysicalMaterial
            color="#cfe6f5"
            transmission={0.82}
            thickness={0.2}
            roughness={0.18}
            metalness={0}
            transparent
            opacity={0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      {/* perfil de aluminio entre os paineis: o que da leitura de montagem */}
      {paineis.map((x) => (
        <mesh key={`p${x}`} position={[x - 0.71, 0, 0]}>
          <boxGeometry args={[0.06, 0.06, 2.5]} />
          <meshStandardMaterial color="#8d949c" metalness={0.8} roughness={0.35} />
        </mesh>
      ))}
      <mesh position={[0, 0, 1.25]}>
        <boxGeometry args={[largura, 0.08, 0.08]} />
        <meshStandardMaterial color="#8d949c" metalness={0.8} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0, -1.25]}>
        <boxGeometry args={[largura, 0.08, 0.08]} />
        <meshStandardMaterial color="#8d949c" metalness={0.8} roughness={0.35} />
      </mesh>
    </group>
  )
}

/** Busway: o trilho de energia que corre sobre a fileira, distinto da bandeja. */
function Busway({ z }: { z: number }) {
  const tomadas = useMemo(() => Array.from({ length: 22 }, (_, i) => -13 + i * 1.22), [])
  return (
    <group position={[0, PE_DIREITO / 2 - 0.22, z]}>
      <mesh castShadow>
        <boxGeometry args={[28, 0.17, 0.17]} />
        <meshStandardMaterial color="#3a4046" metalness={0.75} roughness={0.4} />
      </mesh>
      {tomadas.map((x) => (
        <mesh key={x} position={[x, -0.13, 0.02]} castShadow>
          <boxGeometry args={[0.13, 0.11, 0.13]} />
          <meshStandardMaterial color="#1d2024" metalness={0.5} roughness={0.6} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Barra de LED do corredor: a assinatura visual de datacenter moderno.
 *
 * A ARMADILHA QUE ISTO CORRIGE, e ela e silenciosa: material emissivo NAO
 * ilumina nada no three.js. Ele brilha para a camera e nao lanca um lumen sobre
 * o que esta ao lado — nao ha traçado de luz por tras. A versao anterior tinha
 * seis barras acesas num corredor literalmente sem lampada, e por isso a luz
 * morria da esquerda para a direita: o unico iluminante era o HDRI.
 *
 * Entao cada barra e DUAS coisas: a chapa que se ve, e um `pointLight` que
 * ninguem ve fazendo o trabalho. Sem sombra de propósito — sombra por luz
 * pontual custa um passe cada, e sao seis.
 */
function BarraDeLuz({
  x,
  z,
  intensidade = 7,
  serie = 0,
}: {
  x: number
  z: number
  intensidade?: number
  serie?: number
}) {
  // VARIACAO ENTRE LUMINARIAS — e e ela que mata o ultimo cheiro de CG no teto.
  // Lampada real nao sai toda igual da caixa e envelhece diferente: a mesma
  // referencia varia alguns graus de temperatura de fabrica, e depois de alguns
  // anos umas puxam para o azul e outras para o palha. Teto com todas IDENTICAS
  // e a assinatura mais confiavel de render.
  const tons = ['#9fd4ff', '#a8d8ff', '#93cdf7', '#b3ddff', '#8ec7f2']
  const corReal = tons[Math.abs(serie) % tons.length]!
  // Uma em cada sete esta no fim da vida: acende menos.
  const fator = Math.abs(serie) % 7 === 3 ? 0.42 : 0.9 + (Math.abs(serie) % 3) * 0.07
  return (
    <group position={[x, PE_DIREITO / 2 - 0.12, z]}>
      {/* CORPO da luminaria: sem ele o LED e um retangulo branco flutuando, que
       * e como estava. Luminaria real tem calha, difusor recuado, tampa nas
       * pontas e tirante ate a laje — e sao essas quatro pecas, nao o brilho,
       * que fazem o teto parecer construido. */}
      <mesh castShadow>
        <boxGeometry args={[3.4, 0.1, 0.16]} />
        <meshStandardMaterial color="#40464d" metalness={0.75} roughness={0.38} />
      </mesh>
      {/* difusor, recuado 2 cm dentro da calha */}
      <mesh position={[0, -0.055, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.24, 0.12]} />
        <meshStandardMaterial
          color={corReal}
          emissive={FRIO}
          emissiveIntensity={6}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* tampas */}
      {[-1.72, 1.72].map((dx) => (
        <mesh key={dx} position={[dx, 0, 0]}>
          <boxGeometry args={[0.05, 0.12, 0.18]} />
          <meshStandardMaterial color="#2f343a" metalness={0.7} roughness={0.45} />
        </mesh>
      ))}
      {/* tirantes ate a laje */}
      {[-1.3, 1.3].map((dx) => (
        <mesh key={`t${dx}`} position={[dx, 0.1, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 0.2, 5]} />
          <meshStandardMaterial color="#6b7278" metalness={0.85} roughness={0.35} />
        </mesh>
      ))}
      <pointLight
        color={corReal}
        intensity={intensidade * fator}
        distance={9}
        decay={1.7}
        position={[0, -0.3, 0]}
      />
      {/* o halo da propria calha */}
      <Halo cor={corReal} escala={[4.6, 0.9]} opacidade={0.5 * fator} position={[0, -0.06, 0]} />
    </group>
  )
}

/**
 * Rede de sprinkler no teto: tubo continuo e bicos a intervalo regular.
 *
 * Toda sala de equipamento tem combate a incendio, e o tubo vermelho no teto e
 * o sinal mais reconhecivel disso. Em datacenter o sistema costuma ser de acao
 * previa — o tubo fica seco e so enche depois que dois detectores concordam,
 * justamente para uma cabeca rompida nao alagar milhoes em equipamento.
 */
function Sprinkler({ z }: { z: number }) {
  const bicos = useMemo(() => Array.from({ length: 13 }, (_, i) => -12 + i * 2), [])
  return (
    <group position={[0, PE_DIREITO / 2 - 0.05, z]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.045, 0.045, 28, 8]} />
        <meshStandardMaterial color="#8f2f28" metalness={0.45} roughness={0.6} />
      </mesh>
      <group rotation={[0, 0, Math.PI / 2]}>
        <mesh>
          <cylinderGeometry args={[0.045, 0.045, 28, 8]} />
          <meshStandardMaterial color="#8f2f28" metalness={0.45} roughness={0.6} />
        </mesh>
      </group>
      {bicos.map((x) => (
        <group key={x} position={[x, -0.07, 0]}>
          <mesh>
            <cylinderGeometry args={[0.016, 0.016, 0.09, 6]} />
            <meshStandardMaterial color="#b8952f" metalness={0.8} roughness={0.4} />
          </mesh>
          <mesh position={[0, -0.06, 0]}>
            <coneGeometry args={[0.035, 0.05, 8]} />
            <meshStandardMaterial color="#c9a94a" metalness={0.75} roughness={0.45} />
          </mesh>
        </group>
      ))}
      {/* detectores de fumaca, entre os bicos */}
      {bicos
        .filter((_, i) => i % 2 === 1)
        .map((x) => (
          <mesh key={`d${x}`} position={[x + 1, -0.03, 0.5]}>
            <cylinderGeometry args={[0.07, 0.07, 0.035, 10]} />
            <meshStandardMaterial color="#d8dade" roughness={0.8} />
          </mesh>
        ))}
    </group>
  )
}

/**
 * Piso elevado: a malha de placas de 600 mm, com as PERFURADAS no corredor frio.
 *
 * O ar condicionado pressuriza o vao sob o piso e o ar sobe pelas placas
 * furadas — que por isso ficam so no corredor frio, na frente dos equipamentos,
 * nunca no quente. A malha visivel e o que da escala ao chao: sem ela o piso e
 * uma superficie infinita sem medida.
 */
function PlacasDoPiso({ zFrio }: { zFrio: number }) {
  const linhas = useMemo(() => Array.from({ length: 47 }, (_, i) => -13.8 + i * 0.6), [])
  const furadas = useMemo(() => Array.from({ length: 44 }, (_, i) => -13.2 + i * 0.6), [])
  const y = -PE_DIREITO / 2 + 0.004
  return (
    <group>
      {linhas.map((x) => (
        <mesh key={x} position={[x, y, -1.2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.012, 9]} />
          <meshStandardMaterial color="#2a2c30" roughness={0.8} />
        </mesh>
      ))}
      {[-3.6, -2.4, -1.2, 0, 1.2].map((z) => (
        <mesh key={z} position={[0, y, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[28, 0.012]} />
          <meshStandardMaterial color="#2a2c30" roughness={0.8} />
        </mesh>
      ))}
      {/* as placas perfuradas, so na faixa do corredor frio */}
      {furadas.map((x) => (
        <mesh key={`p${x}`} position={[x, y + 0.002, zFrio]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.56, 0.56]} />
          <meshStandardMaterial color="#101215" roughness={0.95} metalness={0.2} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Carrinho de servico, com o notebook em cima.
 *
 * E o objeto que mais faz uma sala de equipamento parecer HABITADA, e por um
 * motivo simples: e a unica coisa ali que nao foi instalada — foi DEIXADA. Todo
 * datacenter tem um, empurrado para perto do rack em que alguem mexeu por
 * ultimo, com a tela ainda acesa.
 *
 * Uma sala impecavel le como maquete de vendas; uma sala com um carrinho fora
 * de lugar le como lugar onde alguem trabalha. E a diferenca custa oito caixas.
 */
function CarrinhoDeServico({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, -PE_DIREITO / 2, z]} rotation={[0, 0.34, 0]}>
      {[0.28, 0.62].map((y) => (
        <mesh key={y} position={[0, y, 0]} castShadow>
          <boxGeometry args={[0.62, 0.03, 0.44]} />
          <meshStandardMaterial color="#2b2f35" metalness={0.5} roughness={0.6} />
        </mesh>
      ))}
      {[-0.26, 0.26].map((dx) =>
        [-0.17, 0.17].map((dz) => (
          <mesh key={`${dx}${dz}`} position={[dx, 0.16, dz]} castShadow>
            <boxGeometry args={[0.025, 0.24, 0.025]} />
            <meshStandardMaterial color="#3a3f46" metalness={0.6} roughness={0.5} />
          </mesh>
        )),
      )}
      {[-0.26, 0.26].map((dx) =>
        [-0.17, 0.17].map((dz) => (
          <mesh key={`r${dx}${dz}`} position={[dx, 0.05, dz]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.045, 0.045, 0.03, 10]} />
            <meshStandardMaterial color="#0d0f11" roughness={0.85} />
          </mesh>
        )),
      )}
      {/* alça */}
      <mesh position={[0, 0.78, -0.2]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.014, 0.014, 0.56, 8]} />
        <meshStandardMaterial color="#4a5058" metalness={0.7} roughness={0.42} />
      </mesh>
      {/* o notebook: base, tampa e a tela acesa */}
      <mesh position={[0, 0.645, 0.02]} castShadow>
        <boxGeometry args={[0.34, 0.016, 0.24]} />
        <meshStandardMaterial color="#1d2126" metalness={0.6} roughness={0.45} />
      </mesh>
      <group position={[0, 0.653, -0.1]} rotation={[-1.15, 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.34, 0.22, 0.012]} />
          <meshStandardMaterial color="#1d2126" metalness={0.6} roughness={0.45} />
        </mesh>
        <mesh position={[0, 0, 0.008]}>
          <planeGeometry args={[0.31, 0.19]} />
          <meshStandardMaterial
            color="#7fd4ff"
            emissive="#7fd4ff"
            emissiveIntensity={1.9}
            toneMapped={false}
          />
        </mesh>
      </group>
      <pointLight color="#7fd4ff" intensity={0.55} distance={2.2} decay={2} position={[0, 0.8, 0.1]} />
    </group>
  )
}

/** Placa de identificacao da fileira, pendurada na contencao. */
function PlacaDeFileira({ x, z, texto }: { x: number; z: number; texto: string }) {
  return (
    <group position={[x, 1.28, z]}>
      <mesh castShadow>
        <boxGeometry args={[0.5, 0.2, 0.02]} />
        <meshStandardMaterial color="#d7dade" roughness={0.8} />
      </mesh>
      {/* os digitos, em relevo escuro — sem fonte, sao barras */}
      {texto.split('').map((_, i) => (
        <mesh key={i} position={[-0.13 + i * 0.13, 0, 0.013]}>
          <boxGeometry args={[0.07, 0.1, 0.006]} />
          <meshStandardMaterial color="#22262b" roughness={0.9} />
        </mesh>
      ))}
      {[-0.2, 0.2].map((dx) => (
        <mesh key={dx} position={[dx, 0.14, 0]}>
          <cylinderGeometry args={[0.005, 0.005, 0.1, 5]} />
          <meshStandardMaterial color="#8a9199" metalness={0.85} roughness={0.35} />
        </mesh>
      ))}
    </group>
  )
}

/** Faixa de segurança no piso — leitura industrial por quase nada. */
function FaixaDeSeguranca({ z }: { z: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -PE_DIREITO / 2 + 0.004, z]}>
      <planeGeometry args={[30, 0.1]} />
      <meshStandardMaterial color="#c8a33a" roughness={0.6} metalness={0.2} />
    </mesh>
  )
}

/** Bandeja de cabos suspensa — le como infraestrutura sem custar quase nada. */
function Bandeja({ z }: { z: number }) {
  const travessas = useMemo(() => Array.from({ length: 40 }, (_, i) => -13 + i * 0.66), [])
  return (
    <group position={[0, PE_DIREITO / 2 - 0.42, z]}>
      <mesh castShadow>
        <boxGeometry args={[27, 0.05, 0.44]} />
        <meshStandardMaterial color="#2a2e33" metalness={0.85} roughness={0.5} />
      </mesh>
      {travessas.map((x) => (
        <mesh key={x} position={[x, -0.06, 0]} castShadow>
          <boxGeometry args={[0.05, 0.1, 0.44]} />
          <meshStandardMaterial color="#22262a" metalness={0.85} roughness={0.55} />
        </mesh>
      ))}
      {/* Feixes de cabo descendo da bandeja para os racks. E o detalhe que
       * separa "prateleira de metal" de "infraestrutura em uso" — e custa tres
       * cilindros. Comprimento variado de proposito: cabo igualzinho le como
       * repeticao de software, nao como coisa instalada por alguem. */}
      {travessas
        .filter((_, i) => i % 3 === 0)
        .map((x, i) => {
          const comp = 0.34 + ((i * 37) % 11) * 0.045
          return (
            <mesh key={`c${x}`} position={[x + 0.2, -0.06 - comp / 2, 0.1]}>
              <cylinderGeometry args={[0.028, 0.028, comp, 6]} />
              <meshStandardMaterial color="#101215" roughness={0.85} metalness={0.1} />
            </mesh>
          )
        })}
    </group>
  )
}

function Piso() {
  const mapas = useTexture([
    `${BASE}/predio/piso_cor.jpg`,
    `${BASE}/predio/piso_normal.jpg`,
    `${BASE}/predio/piso_arm.jpg`,
  ])
  // `!` porque o tsconfig tem `noUncheckedIndexedAccess`.
  const cor = mapas[0]!
  const normal = mapas[1]!
  const arm = mapas[2]!
  for (const t of [cor, normal, arm]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(10, 4)
  }
  cor.colorSpace = THREE.SRGBColorSpace
  return (
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -PE_DIREITO / 2, 0]}>
      <planeGeometry args={[30, 11]} />
      {/* roughness baixo = piso epoxi. E o reflexo dos LEDs no chao que vende
       * "moderno" — sem ele o mesmo concreto le como subsolo. */}
      <meshStandardMaterial
        map={cor}
        normalMap={normal}
        aoMap={arm}
        roughness={0.22}
        metalness={0.1}
        envMapIntensity={1.3}
        color="#6b6b70"
      />
    </mesh>
  )
}

function Estrutura() {
  return (
    <>
      <Piso />
      <mesh receiveShadow position={[0, PE_DIREITO / 2 + LAJE / 2, -1]}>
        <boxGeometry args={[30, LAJE, 9]} />
        <meshStandardMaterial color="#15171a" roughness={0.9} metalness={0.1} />
      </mesh>
      <mesh receiveShadow position={[0, 0, -3.9]}>
        <planeGeometry args={[30, PE_DIREITO]} />
        <meshStandardMaterial color="#1b1e22" roughness={0.75} metalness={0.2} />
      </mesh>
      {PILARES.map((x) => (
        <mesh key={x} castShadow receiveShadow position={[x, 0, -1.4]}>
          <boxGeometry args={[0.66, PE_DIREITO, 0.66]} />
          <meshStandardMaterial color="#2b2f34" roughness={0.55} metalness={0.35} />
        </mesh>
      ))}
    </>
  )
}

function Andar() {
  const chao = -PE_DIREITO / 2
  const vivos = useMateriaisVivos()
  // Densidade de parede a parede: sala realista vazia nao le como minimalista,
  // le como fase de jogo inacabada.
  const fundo = useMemo(() => Array.from({ length: 9 }, (_, i) => -3.4 + i * 0.76), [])
  const frente = useMemo(() => Array.from({ length: 8 }, (_, i) => -3.0 + i * 0.76), [])
  return (
    <ContextoVivo.Provider value={vivos}>
      <Estrutura />
      <Bandeja z={-3.5} />
      <Busway z={-2.85} />
      <Busway z={-0.25} />
      <FaixaDeSeguranca z={0.95} />
      <PlacasDoPiso zFrio={-1.55} />
      <Sprinkler z={-2.2} />
      <CarrinhoDeServico x={2.1} z={0.55} />
      <PlacaDeFileira x={-6.2} z={-1.55} texto="A07" />
      <PlacaDeFileira x={6.2} z={-1.55} texto="A08" />
      {/* A contencao fecha o corredor FRIO entre as duas fileiras — o corredor
       * que as FRENTES dos racks encaram, e por onde sobe o ar das placas
       * perfuradas. Por isso a fileira do fundo esta girada: rack real nao fica
       * todo virado para o mesmo lado, fica frente com frente. */}
      <Contencao z={-1.55} />
      {[-11.4, -7.6, -3.8, 0, 3.8, 7.6, 11.4].map((x, i) => (
        <BarraDeLuz key={x} x={x} z={-1.55} serie={i} />
      ))}
      {/* Luminarias do corredor QUENTE tambem. Salao real e iluminado inteiro —
       * so o corredor frio aceso deixaria metade do quadro no escuro, que era
       * exatamente o defeito anterior. Menos intensas: o corredor de servico
       * nao precisa do mesmo nivel do corredor de trabalho. */}
      {[-9.5, -5.7, -1.9, 1.9, 5.7, 9.5].map((x, i) => (
        <BarraDeLuz key={`q${x}`} x={x} z={1.1} intensidade={4} serie={i + 3} />
      ))}
      {fundo.map((x, i) => (
        <Rack key={x} position={[x, chao, -2.9]} aceso={i % 9 !== 4} semente={i} />
      ))}
      {/* O VAO NA FILEIRA DA FRENTE, e ele nao e licenca artistica: corredor
       * contido tem porta nas pontas e acesso no meio, senao ninguem entra para
       * trocar disco. Aqui ele faz tambem o trabalho de composicao — sem o vao,
       * a fileira da frente e um muro e esconde a contencao, o busway e a
       * segunda fileira, ou seja, tudo o que diz "datacenter" em vez de
       * "armario". Profundidade so existe se houver por onde olhar. */}
      {frente
        .filter((_, i) => i < 2 || i > 4)
        .map((x, i) => (
          <Rack
            key={`f${x}`}
            position={[x, chao, -0.2]}
            // ORIENTACAO CORRIGIDA: para o corredor do meio ser FRIO, as duas
            // fileiras tem de se encarar. Antes as duas estavam viradas para o
            // mesmo lado e o corredor contido era, de fato, um corredor quente —
            // que existe, mas nao era o que os comentarios diziam.
            // O efeito de composicao veio de brinde: a camera passa a ver a
            // TRASEIRA da fileira proxima, que e onde moram as reguas de tomada
            // e os molhos de forca, e enxerga as frentes acesas do fundo pelo
            // vao de acesso.
            rotation={[0, Math.PI, 0]}
            aceso={i % 11 !== 7}
            semente={i + 5}
          />
        ))}
      <ContactShadows position={[0, chao + 0.01, 0]} opacity={0.7} scale={34} blur={2} far={3.2} />
    </ContextoVivo.Provider>
  )
}

export function EstudoRealista() {
  return (
    <div className="fixed inset-0 bg-black">
      <Canvas
        shadows="percentage"
        dpr={[1, 2]}
        // ENQUADRAMENTO, e a conta que o gerou: o andar tem 3,2 m de pe-direito
        // por 26 de largura — um palco em letterbox extremo. Com a camera longe
        // o bastante para mostrar a largura, a altura sobra vazia em cima e em
        // baixo, que foi a faixa preta das versoes anteriores.
        //
        // A 4,6 m e 52 graus, a altura visivel e 2*4,6*tan(26) = 4,49 m — o
        // andar (3,9 m com as lajes) preenche 87% do quadro. O preco, dito
        // claro: ve-se ~8 m dos 26, ou seja isto virou vista de CORREDOR e nao
        // mais corte de ponta a ponta. As duas leituras nao cabem na mesma
        // camera; esta escolhe densidade em vez de abrangencia.
        camera={{ fov: 52, near: 0.4, far: 110, position: [0, -0.3, 3.4] }}
        gl={{ alpha: false, antialias: true }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.AgXToneMapping
          gl.toneMappingExposure = 1.0
        }}
      >
        <Suspense fallback={null}>
          {/* Ambiente BAIXO de proposito: o contraste entre penumbra e luz
           * propria e o que separa "moderno" de "lavado". */}
          <Environment files={`${BASE}/predio/luz.hdr`} environmentIntensity={0.32} />
          <Andar />
        </Suspense>
      </Canvas>
    </div>
  )
}
