'use client'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { rasterizarBandeiraPublica } from '@/components/ativacoes/temas/junino'
import {
  texturaChita,
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
/**
 * O céu do FIM DE TARDE, não da noite fechada.
 *
 * Esta é a correção que vinha sendo adiada a cada rodada. A foto de
 * referência é clara: azul ainda alto no zênite descendo para pêssego e
 * dourado no horizonte, com tudo na praça bem iluminado. As versões
 * anteriores desta cena eram noite fechada, e eu as mantinha escuras para
 * proteger o texto branco da dobra — nudando a luz um pouco a cada vez, sem
 * nunca chegar perto da referência.
 *
 * A proteção do texto não pode sair da CENA. Ela sai de um véu escuro atrás
 * da coluna de texto (ver `VeuDeTexto` em `CapaJogo`), que é o que qualquer
 * capa de revista faz: a foto fica clara, e a tipografia ganha o próprio
 * fundo. Escurecer a fotografia inteira para caber uma legenda é o erro que
 * eu estava repetindo.
 */
const COR_CEU_ALTO = '#05070E'
const COR_CEU_MEIO = '#0C1018'
const COR_CEU_HORIZONTE = '#2A1A12'
const COR_NEVOA = '#150F12'

/** As fachadas do casario, já no tom de noite. Nunca preto: silhueta preta diz
 *  "prédio", cor de fachada diz "cidade do interior". */
const FACHADAS = [
/** As fachadas em tom de DIA. A foto tem casario pastel bem claro — creme,
 *  rosa, azul, verde-água — com telha vermelha. As versões anteriores eram
 *  esses mesmos matizes escurecidos para a noite, e escurecer pastel dá
 *  marrom: era por isso que o casario nunca tinha a cor da referência. */
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
    g.addColorStop(0.62, COR_CEU_MEIO)
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

/** As estrelas, só na metade de cima da abóbada — perto do horizonte a luz
 *  do arraial as apagaria, e desenhá-las ali contradiria o gradiente. */
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
      <meshStandardMaterial color="#5A4A44" map={textura} roughness={0.94} metalness={0} />
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
 * Um telhado de duas águas.
 *
 * Dois planos inclinados encontrando numa cumeeira, mais a cumeeira em si e
 * os dois oitões (as paredes triangulares das pontas). Cada peça é uma caixa
 * ou um plano — nada de geometria custom — e o conjunto fica ONDE SE MANDA,
 * que é o que o prisma girado da versão anterior não fazia.
 */
function Telhado({
  largura,
  profundidade,
  alturaBase,
  cor,
  textura,
}: {
  largura: number
  profundidade: number
  alturaBase: number
  cor: string
  textura: THREE.CanvasTexture | null
}) {
  // Inclinação baixa, como manda telhado colonial. O prisma anterior subia
  // um terço da altura da casa e lia como cabana alpina.
  const alturaTelhado = profundidade * 0.3
  const beiralX = largura * 0.08
  const beiralZ = profundidade * 0.12
  const larguraAgua = largura + beiralX * 2
  const meiaProf = profundidade / 2 + beiralZ
  // O comprimento da água pelo caimento (hipotenusa), não pela projeção —
  // usar a projeção deixaria uma fresta na cumeeira.
  const comprimentoAgua = Math.hypot(meiaProf, alturaTelhado)
  const inclinacao = Math.atan2(alturaTelhado, meiaProf)

  return (
    <group position={[0, alturaBase, 0]}>
      {[1, -1].map((lado) => (
        <mesh
          key={lado}
          position={[0, alturaTelhado / 2, (lado * meiaProf) / 2]}
          rotation={[lado * inclinacao, 0, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[larguraAgua, 0.12, comprimentoAgua]} />
          <meshStandardMaterial color={cor} map={textura} roughness={0.92} metalness={0} />
        </mesh>
      ))}
      {/* A CUMEEIRA: a fileira de telhas que fecha o encontro das duas águas.
          Sem ela sobra uma linha escura no topo que lê como fresta. */}
      <mesh position={[0, alturaTelhado + 0.05, 0]} castShadow>
        <boxGeometry args={[larguraAgua, 0.16, 0.3]} />
        <meshStandardMaterial color={cor} roughness={0.9} />
      </mesh>
      {/* Os OITÕES: as paredes triangulares das duas pontas, que fecham o
          vão sob o telhado. Sem eles a casa fica com um buraco por onde se vê
          o céu do outro lado. */}
      {[1, -1].map((lado) => (
        <mesh key={lado} position={[(lado * largura) / 2, alturaTelhado / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[profundidade, alturaTelhado]} />
          <meshStandardMaterial color="#2A2018" roughness={1} side={THREE.DoubleSide} />
        </mesh>
      ))}
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

      {/* O TELHADO: DUAS ÁGUAS de verdade, dois planos inclinados que se
          encontram numa cumeeira.

          A versão anterior era um prisma de `cylinderGeometry` com 3 lados,
          girado — e girado ERRADO: o eixo do prisma acabava atravessado, e o
          que aparecia era um triângulo vermelho apontando para o LADO da
          casa em vez de um telhado cobrindo ela. Prisma girado é economia
          falsa: dois planos custam a mesma coisa, ficam onde se manda, e
          aceitam a textura de telha na orientação certa (a telha corre no
          sentido do caimento, nunca atravessada).

          `beiralX`/`beiralZ` fazem o telhado passar da parede nos quatro
          lados — beiral saliente é o que faz o olho ler telhado, e não
          tampa. */}
      <Telhado
        largura={largura}
        profundidade={profundidade}
        alturaBase={altura}
        cor={fachada.telha}
        textura={texturaTelhado}
      />
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

  // NOVE toras, de comprimentos e inclinações diferentes, mais um leito de
  // achas caídas na base. Cinco toras iguais em círculo perfeito liam como
  // uma tenda de índio; uma fogueira de verdade é lenha EMPILHADA, com peça
  // grande embaixo e graveto por cima, e nenhuma peça igual à vizinha.
  const toras = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => {
        const ang = (i / 9) * Math.PI * 2 + aleatorio(i * 7 + 1) * 0.5
        const raio = 0.42 + aleatorio(i * 11 + 3) * 0.22
        const comprimento = 1.5 + aleatorio(i * 13 + 5) * 0.7
        return {
          pos: [Math.cos(ang) * raio, comprimento * 0.36, Math.sin(ang) * raio] as [
            number,
            number,
            number,
          ],
          rot: [Math.cos(ang) * 0.46, ang, -Math.sin(ang) * 0.46] as [number, number, number],
          comprimento,
          espessura: 0.1 + aleatorio(i * 17 + 7) * 0.06,
        }
      }),
    [],
  )

  /** As achas caídas em volta, e as brasas no leito. É o que faz a fogueira
   *  ter PÉ no chão em vez de brotar dele. */
  const leito = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => ({
        pos: [
          (aleatorio(i * 19 + 2) - 0.5) * 2.4,
          0.07,
          (aleatorio(i * 23 + 4) - 0.5) * 2.4,
        ] as [number, number, number],
        giro: aleatorio(i * 29 + 6) * Math.PI,
        comprimento: 0.5 + aleatorio(i * 31 + 8) * 0.6,
      })),
    [],
  )

  return (
    <group position={posicao}>
      {/* O LEITO: achas caídas e brasas, antes das toras em pé. */}
      {leito.map((a, i) => (
        <mesh key={`a${i}`} position={a.pos} rotation={[0, a.giro, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.075, 0.09, a.comprimento, 6]} />
          <meshStandardMaterial color="#2A1A0A" roughness={0.98} />
        </mesh>
      ))}
      {/* As BRASAS: um disco quente no chão sob a pilha. É ele que faz o fogo
          ter base — chama saindo direto da pedra lê como efeito colado. */}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.78, 16]} />
        <meshBasicMaterial color="#C4441A" transparent opacity={0.85} />
      </mesh>
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.42, 14]} />
        <meshBasicMaterial color="#FF8A2E" transparent opacity={0.9} />
      </mesh>

      {toras.map((t, i) => (
        <mesh key={i} position={t.pos} rotation={t.rot} castShadow>
          <cylinderGeometry args={[t.espessura * 0.82, t.espessura, t.comprimento, 7]} />
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

/**
 * A BARRACA do arraial.
 *
 * A primeira montagem era três caixas: dois esteios, um bloco de frente e um
 * prisma de palha em cima. Lia como caixote com chapéu. Uma barraca de
 * verdade tem MERCADORIA — é ela que diz que a barraca está funcionando, e
 * barraca vazia num arraial cheio lê como feira depois que fechou.
 *
 * O que entrou: pano de chita ESTAMPADO no lugar do vermelho liso, milho e
 * potes sobre o balcão, placa pendurada, travessas de madeira sob o telhado,
 * e a lâmpada que já existia agora com o próprio bulbo à vista.
 */
function Barraca({ posicao, giro }: { posicao: [number, number, number]; giro: number }) {
  const texturaTelhadoPalha = useMemo(() => texturaPalha(), [])
  const panoChita = useMemo(() => texturaChita(), [])
  useEffect(
    () => () => {
      texturaTelhadoPalha?.dispose()
      panoChita?.dispose()
    },
    [texturaTelhadoPalha, panoChita],
  )

  /** A mercadoria sobre o balcão. Posições fixas: a cena é montada uma vez e
   *  não pode mudar entre visitas. */
  const mercadoria = useMemo(
    () => [
      { x: -1.25, tipo: 'milho' as const },
      { x: -0.72, tipo: 'milho' as const },
      { x: -0.18, tipo: 'pote' as const },
      { x: 0.42, tipo: 'bolo' as const },
      { x: 1.05, tipo: 'pote' as const },
      { x: 1.5, tipo: 'milho' as const },
    ],
    [],
  )

  return (
    <group position={posicao} rotation={[0, giro, 0]}>
      {/* Os esteios, agora quatro: dois na frente e dois atrás. Com dois só,
          o telhado pairava sem apoio visível do lado de trás. */}
      {[
        [-1.6, 1.7],
        [1.6, 1.7],
        [-1.6, -0.5],
        [1.6, -0.5],
      ].map(([x, z]) => (
        <mesh key={`${x},${z}`} position={[x!, 1.1, z!]} castShadow>
          <boxGeometry args={[0.15, 2.2, 0.15]} />
          <meshStandardMaterial color="#3A2A1C" roughness={0.96} />
        </mesh>
      ))}

      {/* A FRENTE DE CHITA. Estampada, não vermelha lisa — chita não é uma
          cor, é um padrão, e é ele que o olho reconhece antes de qualquer
          outro detalhe da barraca. */}
      <mesh position={[0, 0.62, 0.92]} castShadow receiveShadow>
        <boxGeometry args={[3.4, 1.24, 1.9]} />
        <meshStandardMaterial color="#FFFFFF" map={panoChita} roughness={0.94} />
      </mesh>

      {/* O BALCÃO, com o tampo saliente e um friso na borda. */}
      <mesh position={[0, 1.3, 0.96]} castShadow receiveShadow>
        <boxGeometry args={[3.7, 0.14, 2.1]} />
        <meshStandardMaterial color="#5A3E28" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.24, 2]}>
        <boxGeometry args={[3.7, 0.08, 0.1]} />
        <meshStandardMaterial color="#3A2618" roughness={0.9} />
      </mesh>

      {/* A MERCADORIA. Milho em pé, potes e bolo — as três coisas que toda
          barraca de São João tem em cima do balcão. */}
      {mercadoria.map((m) => (
        <group key={m.x} position={[m.x, 1.44, 1.24]}>
          {m.tipo === 'milho' ? (
            <mesh rotation={[0.18, 0, 0.12]} castShadow>
              <cylinderGeometry args={[0.1, 0.07, 0.42, 8]} />
              <meshStandardMaterial color="#E0B23C" roughness={0.85} />
            </mesh>
          ) : m.tipo === 'pote' ? (
            <mesh castShadow>
              <cylinderGeometry args={[0.13, 0.11, 0.26, 10]} />
              <meshStandardMaterial color="#8A5A32" roughness={0.7} />
            </mesh>
          ) : (
            <mesh castShadow>
              <boxGeometry args={[0.34, 0.18, 0.26]} />
              <meshStandardMaterial color="#C88A4A" roughness={0.9} />
            </mesh>
          )}
        </group>
      ))}

      {/* As TRAVESSAS sob o telhado: as ripas em que a palha se apoia. Sem
          elas o telhado encosta no ar. */}
      {[-1, 0, 1].map((k) => (
        <mesh key={k} position={[k * 1.2, 2.24, 0.6]} castShadow>
          <boxGeometry args={[0.1, 0.1, 2.6]} />
          <meshStandardMaterial color="#3A2A1C" roughness={0.96} />
        </mesh>
      ))}

      {/* O TELHADO DE PALHA, em duas águas como o das casas. O prisma girado
          da versão anterior tinha o mesmo defeito do telhado das casas: eixo
          atravessado, e o que aparecia era uma cunha e não um telhado. */}
      <Telhado
        largura={4.2}
        profundidade={3.2}
        alturaBase={2.34}
        cor="#B89A62"
        textura={texturaTelhadoPalha}
      />

      {/* A PLACA pendurada na frente do balcão. Sem texto: texto em canvas
          3D não é lido por ninguém e a regra desta página é que informação
          mora em DOM. Aqui ela é só a tábua, que é o que se vê de longe. */}
      <mesh position={[0, 1.92, 1.96]} rotation={[0.12, 0, 0]} castShadow>
        <boxGeometry args={[1.7, 0.44, 0.06]} />
        <meshStandardMaterial color="#E8D9B8" roughness={0.9} />
      </mesh>

      {/* A LÂMPADA da barraca. Toda barraca de arraial tem uma pendurada sob
          o telhado, e sem ela a barraca fica no escuro por estar longe da
          fogueira. O alcance é curto: é lâmpada de barraca, não holofote. */}
      <pointLight position={[0, 2.05, 1.1]} color="#FFC878" intensity={11} distance={10} decay={1.8} />
      <mesh position={[0, 2.05, 1.1]}>
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
/**
 * Uma LANTERNA pendurada no varal.
 *
 * A foto do arraial tem lanternas penduradas entre as bandeirinhas, e elas
 * são o mesmo objeto que o jogador estoura no canvas por cima — ter as duas
 * coisas na tela é o que amarra o jogo ao cenário em vez de deixar os alvos
 * parecendo colados por fora.
 *
 * Aqui ela é o corpo facetado com a armação escura e uma luz fraca por
 * dentro; a franja e a estampa dos painéis ficam para o desenho 2D, que é
 * quem o visitante vê de perto.
 */
function LanternaPendurada({
  posicao,
  cor,
  escala = 1,
}: {
  posicao: [number, number, number]
  cor: string
  escala?: number
}) {
  return (
    <group position={posicao} scale={escala}>
      {/* O fio que a prende no varal. */}
      <mesh position={[0, 0.34, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.68, 4]} />
        <meshBasicMaterial color="#A9855A" />
      </mesh>
      {/* O corpo: dois troncos de cone encostados pela base larga — é a
          silhueta facetada da lanterna, com o equador em ponta. */}
      <mesh position={[0, -0.16, 0]}>
        <cylinderGeometry args={[0.1, 0.34, 0.42, 6]} />
        <meshBasicMaterial color={cor} />
      </mesh>
      <mesh position={[0, -0.62, 0]}>
        <cylinderGeometry args={[0.34, 0.12, 0.5, 6]} />
        <meshBasicMaterial color={cor} />
      </mesh>
      {/* A luz de dentro, fraca e de alcance curto: lanterna de papel
          ilumina a si mesma, não a praça. */}
      <pointLight position={[0, -0.4, 0]} color="#FFCE86" intensity={2.2} distance={3.4} decay={2} />
    </group>
  )
}

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
      {/* Uma lanterna a cada sete bandeiras. Mais que isso e o varal deixa de
          ser varal de bandeirinha para virar cordão de lanternas. */}
      {bandeiras
        .filter((_, i) => i % 7 === 3)
        .map((b, i) => (
          <LanternaPendurada
            key={`l${i}`}
            posicao={[b.pos[0], b.pos[1] - 0.2, b.pos[2]]}
            cor={['#E23B2E', '#2E86C1', '#1E8F5F', '#FFC93C'][i % 4]!}
            escala={0.9}
          />
        ))}
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

/**
 * Um par dançando quadrilha.
 *
 * A praça estava VAZIA, e praça vazia num arraial lê como festa que acabou.
 * As figuras são simples de propósito — a esta distância ninguém vê rosto, e
 * o que se reconhece é a SILHUETA: o vestido rodado da dama e o chapéu de
 * palha do cavalheiro. Detalhar mais custaria polígono sem mudar a leitura.
 */
function Par({ posicao, giro, corVestido, corCamisa }: {
  posicao: [number, number, number]
  giro: number
  corVestido: string
  corCamisa: string
}) {
  return (
    <group position={posicao} rotation={[0, giro, 0]}>
      {/* A dama: saia rodada (cone largo), tronco e cabeça. */}
      <group position={[-0.34, 0, 0]}>
        <mesh position={[0, 0.36, 0]} castShadow>
          <coneGeometry args={[0.34, 0.72, 10]} />
          <meshStandardMaterial color={corVestido} roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.88, 0]} castShadow>
          <cylinderGeometry args={[0.11, 0.14, 0.34, 8]} />
          <meshStandardMaterial color={corVestido} roughness={0.9} />
        </mesh>
        <mesh position={[0, 1.14, 0]} castShadow>
          <sphereGeometry args={[0.11, 10, 8]} />
          <meshStandardMaterial color="#6A4632" roughness={0.95} />
        </mesh>
      </group>
      {/* O cavalheiro: calça, camisa e o chapéu de palha, que é o que o
          identifica de longe. */}
      <group position={[0.34, 0, 0]}>
        <mesh position={[0, 0.34, 0]} castShadow>
          <cylinderGeometry args={[0.14, 0.17, 0.68, 8]} />
          <meshStandardMaterial color="#2E3A52" roughness={0.92} />
        </mesh>
        <mesh position={[0, 0.86, 0]} castShadow>
          <cylinderGeometry args={[0.13, 0.16, 0.4, 8]} />
          <meshStandardMaterial color={corCamisa} roughness={0.9} />
        </mesh>
        <mesh position={[0, 1.14, 0]} castShadow>
          <sphereGeometry args={[0.11, 10, 8]} />
          <meshStandardMaterial color="#7A5238" roughness={0.95} />
        </mesh>
        <mesh position={[0, 1.22, 0]} castShadow>
          <cylinderGeometry args={[0.28, 0.28, 0.03, 12]} />
          <meshStandardMaterial color="#C4A05C" roughness={0.95} />
        </mesh>
        <mesh position={[0, 1.28, 0]} castShadow>
          <cylinderGeometry args={[0.13, 0.15, 0.12, 10]} />
          <meshStandardMaterial color="#C4A05C" roughness={0.95} />
        </mesh>
      </group>
    </group>
  )
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
      {/* Barracas em DOIS planos: as de trás emoldurando a praça, as da
          frente cortadas pela borda do quadro. É o corte que faz a cena
          continuar para fora da tela em vez de terminar nela — a foto de
          referência tem barraca encostada nas duas bordas. */}
      {/* A QUADRILHA em volta da fogueira. Praça vazia lê como festa que
          acabou; são as pessoas que dizem que ela está acontecendo agora. */}
      <Par posicao={[-3.4, 0, -7.5]} giro={0.7} corVestido='#D8434A' corCamisa='#F2E2C4' />
      <Par posicao={[4.2, 0, -8.2]} giro={-0.5} corVestido='#2E86C1' corCamisa='#E8C05A' />
      <Par posicao={[-1.2, 0, -13]} giro={2.4} corVestido='#E8A030' corCamisa='#F2E2C4' />
      <Par posicao={[5.8, 0, -13.5]} giro={-2.1} corVestido='#1E8F5F' corCamisa='#F2E2C4' />
      <Barraca posicao={[-8.4, 0, -9]} giro={0.55} />
      <Barraca posicao={[9, 0, -9.5]} giro={-0.6} />
      <Barraca posicao={[-15.5, 0, 1]} giro={0.85} />
      <Barraca posicao={[16, 0, 0]} giro={-0.9} />
      {/* Os varais cruzam o céu em alturas e profundidades diferentes — é o
          cruzamento, e não a quantidade, que dá profundidade ao alto do
          quadro. */}
      {/* SETE VARAIS, não três. A foto tem o céu inteiro riscado de cordas —
          é a DENSIDADE que faz a praça parecer enfeitada para a festa, e três
          varais num céu grande leem como decoração de orçamento apertado. */}
      <Varal de={[-40, 15.4, -26]} ate={[40, 12.2, -26]} barriga={2.6} texturas={texturas} />
      <Varal de={[-38, 12.4, -22]} ate={[38, 15.6, -22]} barriga={2.5} texturas={texturas} />
      <Varal de={[-36, 14.2, -18]} ate={[36, 11, -18]} barriga={2.4} texturas={texturas} />
      <Varal de={[-34, 11.2, -14]} ate={[34, 14.4, -14]} barriga={2.3} texturas={texturas} />
      <Varal de={[-32, 13.4, -10]} ate={[32, 10.2, -10]} barriga={2.1} texturas={texturas} />
      <Varal de={[-30, 10.4, -6]} ate={[30, 13.2, -6]} barriga={2} texturas={texturas} />
      <Varal de={[-28, 12.6, -2]} ate={[28, 9.8, -2]} barriga={1.9} texturas={texturas} />
      {/* A LUZ. Noite, mas não um buraco preto — a primeira montagem deixou
          a fogueira como única fonte e tudo o que ela não alcançava sumia.
          Uma praça de arraial tem luz de sobra: as próprias barracas, as
          janelas, as lâmpadas dos varais. O ambiente aqui representa esse
          somatório.

          O `hemisphereLight` faz o trabalho que um `ambientLight` sozinho não
          faz: céu frio por cima, chão quente por baixo. É essa diferença que
          impede tudo de ficar da mesma cor e é o jeito mais barato de a cena
          parecer iluminada por um AMBIENTE e não por uma lâmpada só. */}
      {/* LUZ DE FIM DE TARDE, não de noite. Céu azul por cima, chão quente
          por baixo, os dois FORTES — é essa diferença que dá cor à cena sem
          precisar de uma fonte por objeto. */}
      <hemisphereLight args={['#5E76A6', '#7A5230', 2.4]} />
      <ambientLight intensity={0.55} color="#6E80A8" />
      {/* Uma direcional fria e fraca, vinda de cima e do lado, só para as
          quinas dos telhados existirem. Nunca forte: duas fontes fortes
          brigando é o erro mais comum numa cena noturna. */}
      {/* O SOL BAIXO, vindo do horizonte atrás do casario — é ele que dá o
          contra-luz quente nos telhados e a sombra longa no chão, e é o que
          mais rápido diz "fim de tarde" numa cena 3D. */}
      <directionalLight position={[-16, 22, 10]} intensity={0.9} color="#A8BCE0" />
      {/* Um enchimento QUENTE e fraco vindo de baixo e da frente, na direcao
          da praca. Representa o somatorio das barracas, das janelas e dos
          varais acesos — luz que existe na foto e que nenhuma fonte pontual
          da cena cobre. Sem ele o casario fica com a base no breu, o que le
          como cidade abandonada em vez de arraial cheio. */}
      <directionalLight position={[2, 4, 16]} intensity={0.5} color="#FFB870" />
      {/* Um POSTE de luz na esquerda. A metade esquerda do quadro ficava no
          breu porque toda fonte da cena morava do centro para a direita — a
          fogueira, as duas barracas. Praça de verdade tem iluminação pública,
          e é ela que resolve isto sem inventar uma fonte sem origem. */}
      <group position={[-12, 0, -4]}>
        <mesh position={[0, 2.6, 0]} castShadow>
          <cylinderGeometry args={[0.09, 0.13, 5.2, 8]} />
          <meshStandardMaterial color="#2A2622" roughness={0.95} />
        </mesh>
        <mesh position={[0, 5.3, 0]}>
          <sphereGeometry args={[0.26, 10, 8]} />
          <meshBasicMaterial color="#FFE0A8" />
        </mesh>
        <pointLight position={[0, 5.3, 0]} color="#FFD9A0" intensity={38} distance={26} decay={1.8} />
      </group>
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
