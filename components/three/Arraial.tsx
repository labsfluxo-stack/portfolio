'use client'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { rasterizarBandeiraPublica } from '@/components/ativacoes/temas/junino'
import {
  texturaPalha,
  texturaParalelepipedo,
  texturaReboco,
  texturaTelha,
} from './arraial-texturas'

/**
 * O ARRAIAL EM 3D — o cenário da dobra de ativações.
 *
 * É CENÁRIO, NUNCA O JOGO. Os alvos, o estouro, o placar e o relógio seguem no
 * canvas 2D por cima desta cena. A separação não é organizacional, é o que
 * protege o motor: `motor-reflexo.ts` trabalha em coordenadas normalizadas e
 * tem 35 testes puros mais um teste de tolerância que mede a extensão
 * renderizada do alvo. Projetar alvos de um espaço 3D para a tela quebraria
 * esse contrato inteiro por um ganho que o cenário sozinho já entrega.
 *
 * O 2D CONTINUA SENDO O CHÃO DE SEGURANÇA. Quem não tem WebGL não vê um
 * retângulo preto: vê o arraial desenhado em canvas que já existe
 * (`temas/junino.ts`), que segue completo e testado. Esta cena é uma camada
 * por cima daquilo, não a substituição dela.
 *
 * A referência de composição é a foto do arraial nordestino em `public/`,
 * escolhida pelo dono: horizonte alto, casario colonial ao fundo, barracas
 * emoldurando as laterais, fogueira no meio da praça, varais cruzando o céu.
 */

/** Cores da noite. Saem escurecidas de propósito — é noite, e há texto branco
 *  por cima desta cena. */
const COR_CEU_ALTO = '#05070E'
const COR_CEU_HORIZONTE = '#2A1A12'
const COR_NEVOA = '#150F12'

/** As fachadas do casario, já no tom de noite. Nunca preto: silhueta preta diz
 *  "prédio", cor de fachada diz "cidade do interior". */
const FACHADAS = [
  { parede: '#8A7358', telha: '#8E4430' },
  { parede: '#8A6266', telha: '#8E4430' },
  { parede: '#556E84', telha: '#83402C' },
  { parede: '#5E8272', telha: '#8E4430' },
  { parede: '#8E7A5C', telha: '#83402C' },
] as const

/** Pseudoaleatório determinístico. A cena é montada uma vez e não pode mudar
 *  entre montagens — `Math.random` daria um arraial diferente a cada visita, e
 *  a captura de tela de ontem deixaria de descrever a de hoje. */
function aleatorio(semente: number): number {
  const x = Math.sin(semente * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

/** O céu: um gradiente vertical pintado numa textura e aplicado por dentro de
 *  uma esfera gigante. Não é `scene.background` com cor chapada porque o que
 *  dá hora do dia é justamente a TRANSIÇÃO — escuro no alto, quente no
 *  horizonte, como na foto. */
function Ceu() {
  const textura = useMemo(() => {
    const tela = document.createElement('canvas')
    tela.width = 4
    tela.height = 256
    const p = tela.getContext('2d')
    if (!p) return null
    const g = p.createLinearGradient(0, 0, 0, 256)
    g.addColorStop(0, COR_CEU_ALTO)
    g.addColorStop(0.62, '#0C1018')
    g.addColorStop(1, COR_CEU_HORIZONTE)
    p.fillStyle = g
    p.fillRect(0, 0, 4, 256)
    const t = new THREE.CanvasTexture(tela)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  useEffect(() => () => textura?.dispose(), [textura])
  if (!textura) return null
  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[90, 24, 16]} />
      <meshBasicMaterial map={textura} side={THREE.BackSide} depthWrite={false} />
    </mesh>
  )
}

/** As estrelas, só na metade de cima da abóbada — perto do horizonte a luz do
 *  arraial as apagaria, e desenhá-las ali contradiria o próprio gradiente. */
function Estrelas() {
  const geometria = useMemo(() => {
    const pontos: number[] = []
    for (let i = 0; i < 220; i++) {
      const theta = aleatorio(i * 3 + 1) * Math.PI * 2
      const phi = aleatorio(i * 5 + 2) * 0.62
      const r = 84
      pontos.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta),
      )
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pontos, 3))
    return g
  }, [])
  useEffect(() => () => geometria.dispose(), [geometria])
  return (
    <points geometry={geometria}>
      <pointsMaterial color="#E2E8F4" size={0.22} sizeAttenuation transparent opacity={0.75} />
    </points>
  )
}

/** O chão da praça. Um plano grande, escuro, levemente reflexivo — é ele que
 *  recebe a luz da fogueira, e é essa poça de luz no chão que mais diz "há uma
 *  fogueira acesa aqui" numa cena noturna. */
function Chao() {
  const textura = useMemo(() => texturaParalelepipedo(), [])
  useEffect(() => () => textura?.dispose(), [textura])
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[200, 200]} />
      {/* A pedra é o que dá ESCALA à praça: é por ela que o olho mede o
          tamanho da fogueira e da barraca. Um plano de cor única fazia a cena
          parecer estúdio com fundo infinito. */}
      <meshStandardMaterial color="#5A4A44" map={textura} roughness={0.92} metalness={0} />
    </mesh>
  )
}

/** Um vidro aceso, com moldura e veneziana. */
function Janela({
  posicao,
  largura,
  altura,
  acesa,
}: {
  posicao: [number, number, number]
  largura: number
  altura: number
  acesa: boolean
}) {
  return (
    <group position={posicao}>
      {/* A MOLDURA, em cal branca e SALIENTE. Numa casa colonial a verruma
          da janela é sempre pintada de branco e sobressai do reboco — é ela,
          e não o vidro, que faz a janela existir de longe. A versão anterior
          era um retângulo aceso colado na parede, que lê como buraco. */}
      <mesh position={[0, 0, 0.06]}>
        <boxGeometry args={[largura * 1.28, altura * 1.2, 0.12]} />
        <meshStandardMaterial color="#D8CDBA" roughness={0.9} />
      </mesh>
      {/* O vão: aceso ou escuro. `meshBasicMaterial` no aceso porque luz de
          janela não obedece à iluminação da cena — ela É a iluminação. */}
      <mesh position={[0, 0, 0.14]}>
        <planeGeometry args={[largura, altura]} />
        <meshBasicMaterial color={acesa ? '#FFC46E' : '#0B0D14'} />
      </mesh>
      {/* A VENEZIANA, encostada de um lado. Meia folha só: as duas fechadas
          tapariam o vão, e casa com todas as janelas fechadas não lê como
          casa habitada. */}
      <mesh position={[-largura * 0.42, 0, 0.16]}>
        <boxGeometry args={[largura * 0.4, altura * 0.94, 0.05]} />
        <meshStandardMaterial color="#2E4A44" roughness={0.86} />
      </mesh>
    </group>
  )
}

/**
 * Uma casa colonial.
 *
 * A primeira montagem era uma CAIXA com um prisma em cima e retângulos
 * acesos colados na frente. A foto de referência tem outra coisa: fachada
 * com embasamento e cornija, janelas altas de moldura branca e veneziana,
 * porta no térreo, sacada no andar de cima, e telhado de TELHA — raso, não
 * pontudo. Cada um desses elementos é barato sozinho, e é a soma deles que
 * separa "casario" de "blocos".
 */
function Casa({
  posicao,
  largura,
  altura,
  profundidade,
  fachada,
  semente,
  texturaParede,
  texturaTelhado,
}: {
  posicao: [number, number, number]
  largura: number
  altura: number
  profundidade: number
  fachada: (typeof FACHADAS)[number]
  semente: number
  texturaParede: THREE.CanvasTexture | null
  texturaTelhado: THREE.CanvasTexture | null
}) {
  const janelas = useMemo(() => {
    const lista: { x: number; y: number; acesa: boolean }[] = []
    const colunas = largura > 5.4 ? 3 : 2
    for (let c = 0; c < colunas; c++) {
      lista.push({
        x: (largura / (colunas + 1)) * (c + 1) - largura / 2,
        y: altura * 0.72,
        acesa: aleatorio(semente * 31 + c * 3) > 0.42,
      })
    }
    return lista
  }, [largura, altura, semente])

  const larguraJanela = largura * 0.13
  const alturaJanela = altura * 0.17

  return (
    <group position={posicao}>
      {/* O CORPO. A textura de reboco entra no lugar da cor plana: parede
          lisa demais faz a casa parecer papelão. */}
      <mesh position={[0, altura / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[largura, altura, profundidade]} />
        <meshStandardMaterial
          color={fachada.parede}
          map={texturaParede}
          roughness={0.96}
          metalness={0}
        />
      </mesh>

      {/* EMBASAMENTO: a faixa escura na base, que toda casa de rua tem
          porque é a parte que a chuva suja. Sem ela a parede parece brotar
          do chão. */}
      <mesh position={[0, altura * 0.055, profundidade / 2 + 0.02]}>
        <boxGeometry args={[largura * 1.01, altura * 0.11, 0.06]} />
        <meshStandardMaterial color="#3A2E26" roughness={0.95} />
      </mesh>

      {/* CORNIJA: a moldura saliente logo abaixo do telhado. É o detalhe
          que mais rápido diz "colonial" e custa uma caixa. */}
      <mesh position={[0, altura * 0.955, profundidade / 2 + 0.03]}>
        <boxGeometry args={[largura * 1.06, altura * 0.07, 0.14]} />
        <meshStandardMaterial color="#D8CDBA" roughness={0.9} />
      </mesh>

      {/* A PORTA, no térreo e no meio. */}
      <mesh position={[0, altura * 0.2, profundidade / 2 + 0.04]}>
        <boxGeometry args={[largura * 0.16, altura * 0.34, 0.08]} />
        <meshStandardMaterial color="#4A2E1C" roughness={0.9} />
      </mesh>

      {janelas.map((j, i) => (
        <Janela
          key={i}
          posicao={[j.x, j.y, profundidade / 2]}
          largura={larguraJanela}
          altura={alturaJanela}
          acesa={j.acesa}
        />
      ))}

      {/* A SACADA do andar de cima: um piso saliente e o gradil. Aparece só
          nas casas maiores, como na foto — sacada em toda casa vira padrão
          repetido em vez de rua. */}
      {largura > 5.4 ? (
        <group position={[0, altura * 0.6, profundidade / 2 + 0.2]}>
          <mesh>
            <boxGeometry args={[largura * 0.66, 0.1, 0.4]} />
            <meshStandardMaterial color="#D8CDBA" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.24, 0.18]}>
            <boxGeometry args={[largura * 0.66, 0.38, 0.05]} />
            <meshStandardMaterial color="#2E2A26" roughness={0.8} />
          </mesh>
        </group>
      ) : null}

      {/* O TELHADO. RASO, não pontudo: o prisma anterior subia um terço da
          altura da casa e lia como cabana alpina. Telhado colonial é de
          pouca inclinação e beiral bem saliente. A textura de telha é o que
          o transforma de tampa em telhado. */}
      <mesh
        position={[0, altura + altura * 0.055, 0]}
        rotation={[0, Math.PI / 2, Math.PI / 2]}
        castShadow
      >
        <cylinderGeometry args={[altura * 0.15, altura * 0.15, largura * 1.16, 3, 1]} />
        <meshStandardMaterial
          color={fachada.telha}
          map={texturaTelhado}
          roughness={0.92}
          metalness={0}
        />
      </mesh>
    </group>
  )
}
/** A fileira de casario ao fundo, com a rua se afastando para os dois lados. */
function Casario() {
  const casas = useMemo(() => {
    const lista: {
      posicao: [number, number, number]
      largura: number
      altura: number
      profundidade: number
      fachada: (typeof FACHADAS)[number]
      semente: number
    }[] = []
    let x = -52
    let n = 0
    while (x < 52) {
      // Uma casa GRANDE perto do centro, como o sobrado que domina a praça
      // na foto. Fileira toda do mesmo porte lê como conjunto habitacional,
      // não como centro histórico.
      const central = Math.abs(x) < 7
      const largura = central ? 9.5 : 3.6 + aleatorio(n * 13 + 7) * 3
      const altura = central ? 8.6 : 4 + aleatorio(n * 17 + 11) * 3
      lista.push({
        posicao: [x + largura / 2, 0, -26 - aleatorio(n * 19 + 3) * 3],
        largura,
        altura,
        profundidade: 5,
        fachada: FACHADAS[n % FACHADAS.length]!,
        semente: n,
      })
      x += largura + 0.35
      n++
    }
    return lista
  }, [])
  // As texturas nascem UMA vez e são compartilhadas por todas as casas. Uma
  // por casa seria dezenas de canvases idênticos na memória, e o casario
  // inteiro usa o mesmo reboco e a mesma telha de qualquer forma — o que
  // muda entre as casas é a COR do material, não o desenho da textura.
  const texturaParede = useMemo(() => texturaReboco('#FFFFFF'), [])
  const texturaTelhado = useMemo(() => texturaTelha('#FFFFFF', 6, 3), [])
  useEffect(
    () => () => {
      texturaParede?.dispose()
      texturaTelhado?.dispose()
    },
    [texturaParede, texturaTelhado],
  )

  return (
    <group>
      {casas.map((c, i) => (
        <Casa key={i} {...c} texturaParede={texturaParede} texturaTelhado={texturaTelhado} />
      ))}
    </group>
  )
}

/**
 * A FOGUEIRA. Pirâmide de toras, chamas em planos emissivos sempre virados
 * para a câmera, e — o mais importante — uma LUZ PONTUAL de verdade.
 *
 * É a luz que faz a cena ser 3D e não uma colagem: ela acende o chão à volta,
 * ilumina as barracas de um lado só e deixa o outro na sombra. Nenhuma pintura
 * 2D consegue isso sem desenhar cada sombra à mão.
 */
function Fogueira({ posicao }: { posicao: [number, number, number] }) {
  const luzRef = useRef<THREE.PointLight>(null)
  const chamasRef = useRef<THREE.Group>(null)

  useFrame((estado) => {
    const t = estado.clock.elapsedTime
    // A tremulação é do FOGO, não da cena: intensidade e escala oscilam em
    // frequências diferentes e primas entre si, senão o conjunto pulsa junto e
    // lê como um dimmer, não como chama.
    if (luzRef.current) luzRef.current.intensity = 26 + Math.sin(t * 7.3) * 5 + Math.sin(t * 3.1) * 3
    if (chamasRef.current) {
      chamasRef.current.scale.y = 1 + Math.sin(t * 5.7) * 0.12
      chamasRef.current.scale.x = 1 + Math.sin(t * 4.1) * 0.06
    }
  })

  const toras = useMemo(
    () =>
      [0, 1, 2, 3, 4].map((i) => {
        const ang = (i / 5) * Math.PI * 2
        return {
          pos: [Math.cos(ang) * 0.5, 0.58, Math.sin(ang) * 0.5] as [number, number, number],
          rot: [Math.cos(ang) * 0.42, 0, -Math.sin(ang) * 0.42] as [number, number, number],
        }
      }),
    [],
  )

  return (
    <group position={posicao}>
      {toras.map((t, i) => (
        <mesh key={i} position={t.pos} rotation={t.rot} castShadow>
          <cylinderGeometry args={[0.13, 0.16, 1.5, 7]} />
          <meshStandardMaterial color="#33200E" roughness={0.95} metalness={0} />
        </mesh>
      ))}
      <group ref={chamasRef} position={[0, 0.9, 0]}>
        {[
          { s: 1, c: '#FF7A1E', o: 0.95 },
          { s: 0.66, c: '#FFC24A', o: 1 },
          { s: 0.34, c: '#FFF0C4', o: 1 },
        ].map((f, i) => (
          <mesh key={i} position={[0, 0.75 * f.s, 0.002 * i]}>
            <coneGeometry args={[0.52 * f.s, 1.9 * f.s, 10]} />
            <meshBasicMaterial color={f.c} transparent opacity={f.o} depthWrite={false} />
          </mesh>
        ))}
      </group>
      <pointLight ref={luzRef} position={[0, 1.4, 0]} color="#FF9A44" distance={34} decay={1.7} castShadow />
    </group>
  )
}

/** Uma barraca: telhado de palha em duas águas sobre esteios, frente de chita.
 *  São elas que emolduram a praça na foto de referência. */
function Barraca({ posicao, giro }: { posicao: [number, number, number]; giro: number }) {
  const texturaTelhadoPalha = useMemo(() => texturaPalha(), [])
  useEffect(() => () => texturaTelhadoPalha?.dispose(), [texturaTelhadoPalha])
  return (
    <group position={posicao} rotation={[0, giro, 0]}>
      {[-1.5, 1.5].map((x) => (
        <mesh key={x} position={[x, 1.1, 0]} castShadow>
          <boxGeometry args={[0.16, 2.2, 0.16]} />
          <meshStandardMaterial color="#33241A" roughness={0.95} />
        </mesh>
      ))}
      {/* A frente de chita — pano estampado cobrindo o corpo da barraca. */}
      <mesh position={[0, 0.62, 0.9]} castShadow>
        <boxGeometry args={[3.4, 1.24, 1.9]} />
        <meshStandardMaterial color="#6A2A24" roughness={0.92} />
      </mesh>
      {/* O balcão. */}
      <mesh position={[0, 1.3, 0.95]} castShadow>
        <boxGeometry args={[3.7, 0.14, 2.1]} />
        <meshStandardMaterial color="#3B2A1C" roughness={0.9} />
      </mesh>
      {/* O TELHADO DE PALHA. Prisma triangular, mesma técnica do telhado das
          casas, com beiral bem saliente — telhado de palha de barraca sempre
          passa muito da estrutura. */}
      <mesh position={[0, 2.5, 0.4]} rotation={[0, Math.PI / 2, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[1.15, 1.15, 4.4, 3, 1]} />
        <meshStandardMaterial color="#B89A62" map={texturaTelhadoPalha} roughness={1} />
      </mesh>
      {/* A LÂMPADA da barraca. Toda barraca de arraial tem uma pendurada sob
          o telhado, e sem ela a barraca fica no escuro por estar longe da
          fogueira — que foi exatamente o que aconteceu na primeira montagem.
          O alcance é curto de propósito: é lâmpada de barraca, não
          holofote de praça. */}
      <pointLight position={[0, 2, 1.1]} color="#FFC878" intensity={9} distance={9} decay={1.8} />
      <mesh position={[0, 2, 1.1]}>
        <sphereGeometry args={[0.09, 8, 6]} />
        <meshBasicMaterial color="#FFE6B4" />
      </mesh>
    </group>
  )
}

/**
 * UM VARAL de bandeirinhas: uma catenária de ponta a ponta, com bandeiras
 * penduradas e lâmpadas entre elas.
 *
 * As bandeiras ficam SEMPRE na vertical, independentemente da inclinação da
 * corda — é a gravidade, e inclinar a bandeira junto com o varal é o erro que
 * mais denuncia uma bandeirinha desenhada.
 */
function Varal({
  de,
  ate,
  barriga,
  texturas,
}: {
  de: [number, number, number]
  ate: [number, number, number]
  barriga: number
  texturas: THREE.CanvasTexture[]
}) {
  const { curva, pontos } = useMemo(() => {
    const a = new THREE.Vector3(...de)
    const b = new THREE.Vector3(...ate)
    const meio = a.clone().lerp(b, 0.5)
    meio.y -= barriga
    const c = new THREE.QuadraticBezierCurve3(a, meio, b)
    return { curva: c, pontos: c.getPoints(28) }
  }, [de, ate, barriga])

  const geometriaFio = useMemo(() => new THREE.BufferGeometry().setFromPoints(pontos), [pontos])
  useEffect(() => () => geometriaFio.dispose(), [geometriaFio])

  const bandeiras = useMemo(() => {
    const lista: { pos: [number, number, number]; indice: number }[] = []
    const n = 26
    for (let i = 1; i < n; i++) {
      const p = curva.getPoint(i / n)
      lista.push({ pos: [p.x, p.y, p.z], indice: i })
    }
    return lista
  }, [curva])

  return (
    <group>
      <line>
        <primitive object={geometriaFio} attach="geometry" />
        <lineBasicMaterial color="#A9855A" />
      </line>
      {bandeiras.map((b, i) => (
        <group key={i} position={b.pos}>
          {/* A bandeira fica SEMPRE na vertical, qualquer que seja a
              inclinação da corda — é a gravidade, e inclinar a bandeira
              junto com o varal é o erro que mais denuncia bandeirinha
              desenhada. `transparent` porque o sprite tem o recorte em V e
              a aba: sem alfa a bandeira volta a ser um retângulo. */}
          <mesh position={[0, -0.46, 0]}>
            <planeGeometry args={[0.66, 0.72]} />
            <meshBasicMaterial
              map={texturas[b.indice % Math.max(1, texturas.length)]}
              transparent
              side={THREE.DoubleSide}
            />
          </mesh>
          {i % 2 === 0 ? (
            <mesh position={[0.34, -0.04, 0]}>
              <sphereGeometry args={[0.07, 8, 6]} />
              <meshBasicMaterial color="#FFE6B4" />
            </mesh>
          ) : null}
        </group>
      ))}
    </group>
  )
}

/**
 * As texturas das bandeiras, geradas UMA vez pelo mesmo código que desenha
 * a bandeirinha do canvas 2D (`rasterizarBandeiraPublica`). Assim a bandeira
 * da cena tem a mesma silhueta de rabo de andorinha, a mesma aba dobrada e
 * a mesma estampa de chita — e continua tendo quando aquele desenho mudar.
 */
function useTexturasBandeira(quantas: number) {
  const texturas = useMemo(() => {
    const lista: THREE.CanvasTexture[] = []
    for (let i = 0; i < quantas; i++) {
      const tela = rasterizarBandeiraPublica(64, i, 2)
      if (!tela) continue
      const t = new THREE.CanvasTexture(tela)
      t.colorSpace = THREE.SRGBColorSpace
      lista.push(t)
    }
    return lista
  }, [quantas])
  useEffect(() => () => texturas.forEach((t) => t.dispose()), [texturas])
  return texturas
}


/**
 * A CÂMERA. Alta, recuada, olhando um pouco para baixo.
 *
 * A primeira montagem deixou a câmera na altura do olho e perto do casario:
 * as casas ficavam gigantes, o observador dentro da rua em vez de na praça,
 * e os varais caíam fora do quadro. A foto de referência é o oposto —
 * ponto de vista de quem chegou na praça e vê a cena INTEIRA: céu com os
 * varais no alto, casario ao longe, a praça com fogueira e barracas embaixo.
 *
 * `lookAt` num ponto ACIMA do chão e ADIANTE da câmera é o que põe o
 * horizonte na altura certa: mirar a origem jogaria o horizonte para o meio
 * exato do quadro, e a metade de cima ficaria só céu vazio.
 */
function Camera() {
  const camera = useThree((estado) => estado.camera)
  useEffect(() => {
    camera.position.set(0, 6.2, 23)
    camera.lookAt(0, 4.6, -14)
    camera.updateProjectionMatrix()
  }, [camera])
  return null
}

function Cena() {
  const texturas = useTexturasBandeira(12)
  return (
    <>
      <Camera />
      <Ceu />
      <Estrelas />
      {/* A NÉVOA começa longe e fecha rápido: é ela que apaga o casario ao
          fundo e dá a sensação de ar entre a praça e as casas. Sem névoa uma
          cena noturna fica com tudo no mesmo plano, por mais que a
          perspectiva esteja certa. */}
      <fog attach="fog" args={[COR_NEVOA, 30, 96]} />
      <Chao />
      <Casario />
      <Fogueira posicao={[0.5, 0, -11]} />
      <Barraca posicao={[-7.6, 0, -8.5]} giro={0.55} />
      <Barraca posicao={[8.2, 0, -9]} giro={-0.6} />
      {/* Os varais cruzam o céu em alturas e profundidades diferentes — é o
          cruzamento, e não a quantidade, que dá profundidade ao alto do
          quadro. */}
      <Varal de={[-34, 13.6, -20]} ate={[34, 10.4, -20]} barriga={2.4} texturas={texturas} />
      <Varal de={[-32, 10.6, -15]} ate={[32, 13.8, -15]} barriga={2.2} texturas={texturas} />
      <Varal de={[-30, 12.4, -9]} ate={[30, 9.4, -9]} barriga={2} texturas={texturas} />
      {/* A LUZ. Noite, mas não um buraco preto — a primeira montagem deixou
          a fogueira como única fonte e tudo o que ela não alcançava sumia.
          Uma praça de arraial tem luz de sobra: as próprias barracas, as
          janelas, as lâmpadas dos varais. O ambiente aqui representa esse
          somatório.

          O `hemisphereLight` faz o trabalho que um `ambientLight` sozinho não
          faz: céu frio por cima, chão quente por baixo. É essa diferença que
          impede tudo de ficar da mesma cor e é o jeito mais barato de a cena
          parecer iluminada por um AMBIENTE e não por uma lâmpada só. */}
      <hemisphereLight args={['#5E76A6', '#7A5230', 2.4]} />
      <ambientLight intensity={0.55} color="#6E80A8" />
      {/* Uma direcional fria e fraca, vinda de cima e do lado, só para as
          quinas dos telhados existirem. Nunca forte: duas fontes fortes
          brigando é o erro mais comum numa cena noturna. */}
      <directionalLight position={[-16, 22, 10]} intensity={0.9} color="#A8BCE0" />
      {/* Um enchimento QUENTE e fraco vindo de baixo e da frente, na direcao
          da praca. Representa o somatorio das barracas, das janelas e dos
          varais acesos — luz que existe na foto e que nenhuma fonte pontual
          da cena cobre. Sem ele o casario fica com a base no breu, o que le
          como cidade abandonada em vez de arraial cheio. */}
      <directionalLight position={[2, 4, 16]} intensity={0.5} color="#FFB870" />
    </>
  )
}

export function Arraial() {
  const [reduzido, setReduzido] = useState(false)
  useEffect(() => {
    const consulta = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduzido(consulta.matches)
    const aoTrocar = (e: MediaQueryListEvent) => setReduzido(e.matches)
    consulta.addEventListener('change', aoTrocar)
    return () => consulta.removeEventListener('change', aoTrocar)
  }, [])

  return (
    <Canvas
      aria-hidden="true"
      // DPR BAIXO DE PROPÓSITO. Esta cena é cenário atrás de um jogo que tem
      // portão de taxa de quadros; nitidez de fundo não vale quadro perdido no
      // alvo, que é onde o visitante de fato olha.
      dpr={[1, 1.5]}
      shadows="basic"
      // `demand` sob movimento reduzido: sem a tremulação da fogueira não há o
      // que animar, e continuar pedindo quadro seria queimar bateria para não
      // mudar um pixel.
      frameloop={reduzido ? 'demand' : 'always'}
      gl={{ antialias: false, powerPreference: 'low-power' }}
      camera={{ position: [0, 3.1, 12], fov: 42, near: 0.5, far: 120 }}
    >
      <Cena />
    </Canvas>
  )
}
