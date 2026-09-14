'use client'
import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { PE_DIREITO } from './predio-arquitetura'
import { Coletor } from './predio-instancias'

/**
 * O conteudo do andar 07 (Servidores) — instanciado, para viver DENTRO da
 * descida em vez de numa rota de estudo.
 *
 * POR QUE INSTANCIADO E NAO DECLARATIVO: a versao em componentes nao carregava.
 * 42U x 3 furos x 2 montantes x 64 racks dao 16.128 malhas so de furacao, e o
 * custo nao e o triangulo — e a CHAMADA DE DESENHO, uma conversa com a GPU por
 * malha. Aqui as ~40 mil pecas saem em ~30 grupos.
 *
 * O QUE ISTO NAO DECIDE: a moldura. O andar da descida tem 3,2 m de pe-direito
 * por 30 de largura e a camera dele fica longe, para mostrar o corte inteiro. O
 * estudo ficou bom com a camera PERTO. Entao o detalhe daqui vai ser lido de
 * longe, e boa parte dele vira textura em vez de objeto reconhecivel. Isso e
 * consequencia do formato "um andar por tela" e nao tem conserto dentro deste
 * arquivo — e decisao de enquadramento.
 */

const U = 0.04445
const LARGURA_UTIL = 0.4826
const FUROS_NO_U = [0.00635, 0.02223, 0.0381]
const US_DO_RACK = 42
const FASES = 6
const VIVO = '#6bff9e'
const ALERTA = '#ffb347'
const FRIO = '#9fd4ff'

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

  const { malhas, vivos } = useMemo(() => {
    const col = new Coletor()

    const gCorpo = new THREE.BoxGeometry(0.6, 2.2, 1.0)
    const gMontante = new THREE.BoxGeometry(0.035, 2.06, 0.05)
    const gFuro = new THREE.BoxGeometry(0.0095, 0.0095, 0.008)
    const gVent = new THREE.BoxGeometry(0.022, 0.03, 0.006)
    const gPorta = new THREE.BoxGeometry(0.03, 0.04, 0.01)
    const gLed = new THREE.BoxGeometry(0.012, 0.012, 0.012)
    const gBaia = new THREE.BoxGeometry(0.05, 0.036, 0.012)
    const gPdu = new THREE.BoxGeometry(0.06, 1.86, 0.06)

    const mCorpo = new THREE.MeshStandardMaterial({ metalness: 0.9, roughness: 0.34 })
    const mMetal = new THREE.MeshStandardMaterial({ color: '#31363d', metalness: 0.82, roughness: 0.4 })
    const mFuro = new THREE.MeshStandardMaterial({ color: '#0a0c0e', roughness: 0.9 })
    const mEquip = new THREE.MeshStandardMaterial({ color: '#15181c', metalness: 0.95, roughness: 0.28 })
    const mCega = new THREE.MeshStandardMaterial({ color: '#1d2025', metalness: 0.5, roughness: 0.7 })
    const mEscuro = new THREE.MeshStandardMaterial({ color: '#080a0c', roughness: 0.95 })
    const mPdu = new THREE.MeshStandardMaterial({ color: '#24282d', metalness: 0.65, roughness: 0.5 })

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

    // Duas fileiras dentro da profundidade REAL do andar da descida, nao da que
    // o estudo usava — por isso os z saem de `zCentro` e `prof`, nunca cravados.
    const zFundo = zCentro - prof * 0.22
    const zFrente = zCentro + prof * 0.16
    const passo = 0.76
    const n = Math.floor((meiaLargura * 2 - 1) / passo)

    const monta = (x: number, z: number, girado: boolean, s: number) => {
      const ry = girado ? Math.PI : 0
      const lado = girado ? -1 : 1
      col.poe('corpo', gCorpo, mCorpo, [x, piso + 1.1, z], [0, ry, 0], [1, 1, 1], tons[s % 4])
      for (const dx of [-0.26, 0.26]) {
        col.poe('montante', gMontante, mMetal, [x + dx * lado, piso + 1.1, z + 0.42 * lado], [0, ry, 0])
        for (let u = 0; u < US_DO_RACK; u++)
          for (const f of FUROS_NO_U)
            col.poe('furo', gFuro, mFuro, [x + dx * lado, piso + 0.14 + u * U + f, z + 0.447 * lado], [0, ry, 0])
      }
      for (const { u, altura, tipo } of ocupacao(s)) {
        const y = piso + 0.14 + u * U + (altura * U) / 2
        const zf = z + 0.5 * lado
        const h = altura * U - 0.003
        col.poe(
          `face-${tipo}-${altura}`,
          new THREE.BoxGeometry(LARGURA_UTIL, h, 0.028),
          tipo === 'cega' ? mCega : mEquip,
          [x, y, zf],
          [0, ry, 0],
        )
        if (tipo === 'cega') continue
        if (altura >= 2)
          for (let v = 0; v < 26; v++)
            col.poe('vent', gVent, mEscuro, [
              x + (-0.21 + (v % 13) * 0.035) * lado,
              y + (v < 13 ? h * 0.22 : -h * 0.22),
              zf + 0.016 * lado,
            ], [0, ry, 0])
        if (tipo === 'patch')
          for (let p = 0; p < 24; p++)
            col.poe('rj45', gPorta, mEscuro, [
              x + (-0.25 + (p % 12) * 0.0455) * lado,
              y + (p < 12 ? 0.012 : -0.012),
              zf + 0.018 * lado,
            ], [0, ry, 0])
        if (tipo === 'switch')
          for (let p = 0; p < 20; p++) {
            const fase = (p + s) % FASES
            const al = (p + s) % 3 === 0
            col.poe(
              `led-${al ? 'a' : 'd'}-${fase}`,
              gLed,
              al ? vivos.alerta[fase]! : vivos.dado[fase]!,
              [x + (-0.24 + p * 0.025) * lado, y - 0.012, zf + 0.02 * lado],
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
              [x + (-0.22 + (d % 6) * 0.088) * lado, y + (d < 6 ? 0.02 : -0.02), zf + 0.02 * lado],
              [0, ry, 0],
            )
          }
        if (tipo === 'servidor') {
          const fase = (u + s) % FASES
          col.poe(`led-d-${fase}`, gLed, vivos.dado[fase]!, [x + 0.22 * lado, y, zf + 0.02 * lado], [0, ry, 0])
        }
      }
      for (const dx of [-0.25, 0.25]) col.poe('pdu', gPdu, mPdu, [x + dx, piso + 1.15, z - 0.42 * lado])
    }

    for (let i = 0; i < n; i++) monta(-meiaLargura + 0.6 + i * passo, zFundo, false, i)
    // Vao de acesso no meio da fileira da frente: sem ele a frente e um muro e
    // esconde tudo. Corredor contido tem acesso de verdade, entao nao e licenca.
    for (let i = 0; i < n; i++) {
      if (i > n / 2 - 3 && i < n / 2 + 2) continue
      monta(-meiaLargura + 0.98 + i * passo, zFrente, true, i + 5)
    }

    return { malhas: col.colhe(), vivos }
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
      const r = Math.sin(t * (7.3 + i * 1.9) + i * 2.1) * Math.sin(t * (2.7 + i * 0.6) + i)
      vivos.dado[i]!.emissiveIntensity = 1.1 + 3.9 * Math.max(0, r)
      const d = Math.sin(t * (1.9 + i * 0.45) + i * 3.3)
      vivos.alerta[i]!.emissiveIntensity = 0.5 + 2.6 * Math.max(0, d * d * d)
    }
  })

  /**
   * A LUZ PROPRIA DO ANDAR — e o que faltou na primeira integracao.
   *
   * Eu portei a geometria do estudo e esqueci a luz, e o resultado foi um
   * datacenter escuro herdando o sol de hora dourada do predio: fraco, quente e
   * vindo do lado errado. Rack e preto fosco; sob luz quente e fraca ele
   * desaparece.
   *
   * Aqui entram as barras do corredor. Cada uma e DUAS coisas — a chapa acesa
   * que se ve e um `pointLight` que ninguem ve fazendo o trabalho —, porque
   * material emissivo no three.js brilha para a camera e nao lanca um lumen.
   *
   * Sem sombra de proposito: sombra por luz pontual custa um passe cada, e o
   * orcamento deste andar ja e o maior do predio. A sombra de contato da cena e
   * a mancha do sol continuam dando o apoio no chao.
   *
   * O CONTRASTE COM O PREDIO E DELIBERADO e o dono precisa julga-lo: o predio e
   * ambar, este andar e frio. Ou le como "cada setor tem a sua temperatura" —
   * que e o arco que a spec ja descreve — ou le como dois projetos colados.
   */
  const barras = useMemo(
    () => Array.from({ length: 7 }, (_, i) => -meiaLargura + 2.2 + i * ((meiaLargura * 2 - 4.4) / 6)),
    [meiaLargura],
  )
  const zCorredor = zCentro - prof * 0.03
  const yBarra = piso + PE_DIREITO - 0.16

  return (
    <>
      {barras.map((x, i) => (
        <group key={x} position={[x, yBarra, zCorredor]}>
          <mesh>
            <boxGeometry args={[2.6, 0.09, 0.15]} />
            <meshStandardMaterial color="#40464d" metalness={0.75} roughness={0.38} />
          </mesh>
          <mesh position={[0, -0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[2.46, 0.11]} />
            <meshStandardMaterial
              color={FRIO}
              emissive={FRIO}
              emissiveIntensity={5.5}
              toneMapped={false}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Uma em cada sete no fim da vida — teto com todas identicas e a
           * assinatura mais confiavel de render. */}
          <pointLight
            color={FRIO}
            intensity={i % 7 === 3 ? 2.6 : 6}
            distance={8.5}
            decay={1.7}
            position={[0, -0.3, 0]}
          />
        </group>
      ))}
    </>
  )
}
