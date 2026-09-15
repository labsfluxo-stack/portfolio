'use client'
import { Suspense, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, ContactShadows, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { PE_DIREITO, LAJE, PILARES } from './predio-arquitetura'
import { Coletor } from './predio-instancias'

/**
 * O andar 07 INSTANCIADO — mesma riqueza da versao anterior, uma fracao das
 * chamadas de desenho.
 *
 * A versao declarativa nao carregava com 64 racks: 42U x 3 furos x 2 montantes
 * davam 16.128 malhas so de furacao, e a pagina dava tempo esgotado. Aqui a
 * geometria e a MESMA; o que muda e que cada peca repetida vira uma
 * `InstancedMesh` com N matrizes em vez de N objetos na cena.
 *
 * O numero medido aparece no canto da tela de proposito: e a unica forma
 * honesta de discutir custo.
 */

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '/portfolio'
const FRIO = '#9fd4ff'
const VIVO = '#6bff9e'
const AZUL = '#1f5fb0'

// Norma 19": 1U = 44,45 mm, largura util 482,6 mm, tres furos por U em ritmo
// irregular (0,25" / 0,875" / 1,5" da base do U).
const U = 0.04445
const LARGURA_UTIL = 0.4826
const FUROS_NO_U = [0.00635, 0.02223, 0.0381]
const US_DO_RACK = 42
const FASES = 6

const ROTEIRO = [
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

/** Catenaria: `y = a·cosh(x/a)`, a curva que cabo suspenso faz pelo proprio peso. */
function curvaDeCabo(a: THREE.Vector3, b: THREE.Vector3, flecha: number) {
  const c = 2.2
  const base = Math.cosh(c) - 1
  const pontos: THREE.Vector3[] = []
  for (let i = 0; i <= 14; i++) {
    const t = (i / 14) * 2 - 1
    const p = new THREE.Vector3().lerpVectors(a, b, i / 14)
    p.y -= flecha * ((Math.cosh(c) - Math.cosh(c * t)) / base)
    pontos.push(p)
  }
  return new THREE.CatmullRomCurve3(pontos)
}

function useCena() {
  const mapas = useTexture([
    `${BASE}/predio/piso_cor.jpg`,
    `${BASE}/predio/piso_normal.jpg`,
    `${BASE}/predio/piso_arm.jpg`,
  ])

  return useMemo(() => {
    const col = new Coletor()

    // ---- geometrias compartilhadas (uma instancia de cada, reutilizada) ----
    const gCorpo = new THREE.BoxGeometry(0.6, 2.2, 1.0)
    const gMontante = new THREE.BoxGeometry(0.035, 2.06, 0.05)
    const gFuro = new THREE.BoxGeometry(0.0095, 0.0095, 0.008)
    const gPe = new THREE.CylinderGeometry(0.028, 0.034, 0.05, 6)
    const gLamina = new THREE.BoxGeometry(0.56, 0.1, 0.022)
    const gVent = new THREE.BoxGeometry(0.022, 0.03, 0.006)
    const gPorta = new THREE.BoxGeometry(0.03, 0.04, 0.01)
    const gLedPeq = new THREE.BoxGeometry(0.012, 0.012, 0.012)
    const gBaia = new THREE.BoxGeometry(0.05, 0.036, 0.012)
    const gPdu = new THREE.BoxGeometry(0.06, 1.86, 0.06)
    const gTomada = new THREE.BoxGeometry(0.035, 0.035, 0.014)
    const gOrelha = new THREE.BoxGeometry(0.03, 0.12, 0.012)

    // ---- materiais ----
    const mCorpo = new THREE.MeshStandardMaterial({ metalness: 0.9, roughness: 0.34 })
    const mMetal = new THREE.MeshStandardMaterial({ color: '#31363d', metalness: 0.82, roughness: 0.4 })
    const mFuro = new THREE.MeshStandardMaterial({ color: '#0a0c0e', roughness: 0.9 })
    const mEquip = new THREE.MeshStandardMaterial({ color: '#15181c', metalness: 0.95, roughness: 0.28 })
    const mCega = new THREE.MeshStandardMaterial({ color: '#1d2025', metalness: 0.5, roughness: 0.7 })
    const mEscuro = new THREE.MeshStandardMaterial({ color: '#080a0c', roughness: 0.95 })
    const mPdu = new THREE.MeshStandardMaterial({ color: '#24282d', metalness: 0.65, roughness: 0.5 })

    // Os materiais VIVOS: um por fase. O piscar acontece neles, e cada LED da
    // cena aponta para um — entao seis atualizacoes por quadro animam milhares.
    const vivos = {
      dado: Array.from(
        { length: FASES },
        () => new THREE.MeshStandardMaterial({ color: VIVO, emissive: new THREE.Color(VIVO), toneMapped: false }),
      ),
      alerta: Array.from(
        { length: FASES },
        () => new THREE.MeshStandardMaterial({ color: '#ffb347', emissive: new THREE.Color('#ffb347'), toneMapped: false }),
      ),
    }

    const tonsDeRack = ['#0e1013', '#14171b', '#0b0d0f', '#161a1f'].map((c) => new THREE.Color(c))

    // ---- as fileiras ----
    const fundo = Array.from({ length: 34 }, (_, i) => -12.6 + i * 0.76)
    const frente = Array.from({ length: 30 }, (_, i) => -11.2 + i * 0.76).filter(
      (_, i) => i < 9 || i > 14,
    )
    const chao = -PE_DIREITO / 2
    const cabos: THREE.TubeGeometry[] = []

    const montaRack = (x: number, z: number, girado: boolean, semente: number) => {
      const ry = girado ? Math.PI : 0
      const lado = girado ? -1 : 1
      col.poe('corpo', gCorpo, mCorpo, [x, chao + 1.1, z], [0, ry, 0], [1, 1, 1], tonsDeRack[semente % 4])

      for (const dx of [-0.26, 0.26]) {
        col.poe('montante', gMontante, mMetal, [x + dx * lado, chao + 1.1, z + 0.42 * lado], [0, ry, 0])
        for (let u = 0; u < US_DO_RACK; u++) {
          for (const f of FUROS_NO_U) {
            col.poe('furo', gFuro, mFuro, [x + dx * lado, chao + 0.14 + u * U + f, z + 0.447 * lado], [0, ry, 0])
          }
        }
      }
      for (const dx of [-0.22, 0.22]) {
        for (const dz of [-0.38, 0.38]) {
          col.poe('pe', gPe, mMetal, [x + dx, chao + 0.025, z + dz])
        }
      }

      // equipamento
      for (const { u, altura, tipo } of ocupacao(semente)) {
        const y = chao + 0.14 + u * U + (altura * U) / 2
        const zf = z + 0.5 * lado
        const h = altura * U - 0.003
        const gFace = new THREE.BoxGeometry(LARGURA_UTIL, h, 0.028)
        col.poe(`face-${tipo}-${altura}`, gFace, tipo === 'cega' ? mCega : mEquip, [x, y, zf], [0, ry, 0])
        if (tipo === 'cega') continue

        for (const dx of [-0.265, 0.265]) {
          col.poe('orelha', gOrelha, mMetal, [x + dx * lado, y, zf + 0.01 * lado], [0, ry, 0])
        }
        if (altura >= 2) {
          for (let v = 0; v < 26; v++) {
            col.poe('vent', gVent, mEscuro, [
              x + (-0.21 + (v % 13) * 0.035) * lado,
              y + (v < 13 ? h * 0.22 : -h * 0.22),
              zf + 0.016 * lado,
            ], [0, ry, 0])
          }
        }
        if (tipo === 'patch') {
          for (let p = 0; p < 24; p++) {
            col.poe('rj45', gPorta, mEscuro, [
              x + (-0.25 + (p % 12) * 0.0455) * lado,
              y + (p < 12 ? 0.012 : -0.012),
              zf + 0.018 * lado,
            ], [0, ry, 0])
          }
        }
        if (tipo === 'switch') {
          for (let p = 0; p < 20; p++) {
            const fase = (p + semente) % FASES
            const alerta = (p + semente) % 3 === 0
            col.poe(
              `led-${alerta ? 'a' : 'd'}-${fase}`,
              gLedPeq,
              alerta ? vivos.alerta[fase]! : vivos.dado[fase]!,
              [x + (-0.24 + p * 0.025) * lado, y - 0.012, zf + 0.02 * lado],
              [0, ry, 0],
            )
          }
        }
        if (tipo === 'discos') {
          for (let d = 0; d < 12; d++) {
            const fase = (d * 3 + semente) % FASES
            col.poe(
              `led-a-${fase}`,
              gBaia,
              vivos.alerta[fase]!,
              [x + (-0.22 + (d % 6) * 0.088) * lado, y + (d < 6 ? 0.02 : -0.02), zf + 0.02 * lado],
              [0, ry, 0],
            )
          }
        }
        if (tipo === 'servidor') {
          const fase = (u + semente) % FASES
          col.poe(`led-d-${fase}`, gLedPeq, vivos.dado[fase]!, [x + 0.22 * lado, y, zf + 0.02 * lado], [0, ry, 0])
        }
      }

      // traseira: duas reguas e as tomadas
      for (const dx of [-0.25, 0.25]) {
        col.poe('pdu', gPdu, mPdu, [x + dx, chao + 1.15, z - 0.42 * lado])
        for (let t = 0; t < 14; t++) {
          col.poe('tomada', gTomada, mEscuro, [x + dx, chao + 0.34 + t * 0.125, z - 0.385 * lado])
        }
      }

      // cabos: so nos racks visiveis de frente, senao e geometria invisivel
      if (semente % 2 === 0) {
        for (let k = 0; k < 4; k++) {
          const curva = curvaDeCabo(
            new THREE.Vector3(x - 0.34 + k * 0.016, chao + 1.88, z + 0.4 * lado),
            new THREE.Vector3(x - 0.2 + k * 0.014, chao + 2.28, z + 0.1 * lado),
            0.05 + ((k * 3 + semente) % 4) * 0.012,
          )
          cabos.push(new THREE.TubeGeometry(curva, 12, 0.0085, 4, false))
        }
      }
    }

    fundo.forEach((x, i) => montaRack(x, -2.9, false, i))
    frente.forEach((x, i) => montaRack(x, -0.2, true, i + 5))

    const malhas = col.colhe()

    return {
      malhas,
      cabos,
      vivos,
      mapas,
      chamadas: col.chamadas,
      copias: col.copias,
    }
  }, [mapas])
}

function Andar() {
  const { malhas, cabos, vivos, mapas, chamadas, copias } = useCena()
  const { scene } = useThree()
  const [medido, setMedido] = useState(false)

  useMemo(() => {
    for (const m of malhas) scene.add(m)
    return () => {
      for (const m of malhas) scene.remove(m)
    }
  }, [malhas, scene])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    for (let i = 0; i < FASES; i++) {
      const r = Math.sin(t * (7.3 + i * 1.9) + i * 2.1) * Math.sin(t * (2.7 + i * 0.6) + i)
      vivos.dado[i]!.emissiveIntensity = 1.1 + 3.9 * Math.max(0, r)
      const d = Math.sin(t * (1.9 + i * 0.45) + i * 3.3)
      vivos.alerta[i]!.emissiveIntensity = 0.5 + 2.6 * Math.max(0, d * d * d)
    }
    if (!medido) setMedido(true)
  })

  const cor = mapas[0]!
  const normal = mapas[1]!
  const arm = mapas[2]!
  for (const t of [cor, normal, arm]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(10, 4)
  }
  cor.colorSpace = THREE.SRGBColorSpace

  return (
    <>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -PE_DIREITO / 2, 0]}>
        <planeGeometry args={[30, 11]} />
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
      {cabos.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial color={AZUL} roughness={0.66} metalness={0.04} />
        </mesh>
      ))}
      {[-11.4, -7.6, -3.8, 0, 3.8, 7.6, 11.4].map((x, i) => (
        <group key={x} position={[x, PE_DIREITO / 2 - 0.12, -1.55]}>
          <mesh castShadow>
            <boxGeometry args={[3.4, 0.1, 0.16]} />
            <meshStandardMaterial color="#40464d" metalness={0.75} roughness={0.38} />
          </mesh>
          <mesh position={[0, -0.055, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[3.24, 0.12]} />
            <meshStandardMaterial color={FRIO} emissive={FRIO} emissiveIntensity={6} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
          <pointLight color={FRIO} intensity={i % 7 === 3 ? 3 : 7} distance={9} decay={1.7} position={[0, -0.3, 0]} />
        </group>
      ))}
      <ContactShadows position={[0, -PE_DIREITO / 2 + 0.01, 0]} opacity={0.7} scale={34} blur={2} far={3.2} />
      <Medidor chamadas={chamadas} copias={copias} />
    </>
  )
}

/** Mostra o custo na tela: e a unica forma honesta de discutir performance. */
function Medidor({ chamadas, copias }: { chamadas: number; copias: number }) {
  const { gl } = useThree()
  const ref = useRef<HTMLDivElement | null>(null)
  const quadros = useRef({ n: 0, t: 0, fps: 0 })
  useFrame((_, delta) => {
    const q = quadros.current
    q.n++
    q.t += delta
    if (q.t >= 0.5) {
      q.fps = Math.round(q.n / q.t)
      q.n = 0
      q.t = 0
      const el = document.getElementById('medidor')
      if (el) {
        el.textContent = `${q.fps} fps · ${gl.info.render.calls} chamadas · ${copias} copias em ${chamadas} grupos`
      }
    }
  })
  return null
}

export function EstudoInstanciado() {
  return (
    <div className="fixed inset-0 bg-black">
      <Canvas
        shadows="percentage"
        dpr={[1, 2]}
        camera={{ fov: 52, near: 0.4, far: 110, position: [0, -0.3, 4.6] }}
        gl={{ alpha: false, antialias: true }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.AgXToneMapping
          gl.toneMappingExposure = 1.0
        }}
      >
        <Suspense fallback={null}>
          <Environment files={`${BASE}/predio/luz.hdr`} environmentIntensity={0.32} />
          <Andar />
        </Suspense>
      </Canvas>
      <div
        id="medidor"
        className="pointer-events-none fixed bottom-3 left-3 rounded bg-black/70 px-3 py-1.5 font-mono text-xs text-emerald-300"
      >
        medindo…
      </div>
    </div>
  )
}
