'use client'
import { useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { PE_DIREITO } from './predio-arquitetura'
import { Coletor } from './predio-instancias'

/**
 * A COBERTURA MOBILIADA — o primeiro quadro do site.
 *
 * A spec pede que este andar diga "os negócios vão bem e tranquilos" SEM
 * escrever isso. Então o trabalho aqui não é encher de objeto: é escolher os
 * quatro ou cinco que, em silhueta e a distância de descida, significam calma e
 * prosperidade sem legenda.
 *
 * O ESPELHO D'ÁGUA É O PRINCIPAL, e não por ser bonito: ele é a única
 * superfície do prédio que DEVOLVE o céu. Com o mapa de ambiente que a descida
 * agora gera, a lâmina reflete o dourado inteiro — o mesmo céu aparece duas
 * vezes no quadro, em cima e embaixo, e é isso que lê como "vista" em vez de
 * "terraço". Custa um plano com rugosidade baixa.
 *
 * O GUARDA-CORPO DE VIDRO define "terraço" instantaneamente: sem ele a laje
 * aberta lê como andar inacabado. Com ele, lê como lugar onde se fica.
 *
 * Instanciado como o resto: espreguiçadeira, ripa de deck e vaso se repetem, e
 * repetição é exatamente o que a instância existe para baratear.
 */
export function Cobertura({
  piso,
  zCentro,
  prof,
  meiaLargura,
  ceu,
}: {
  piso: number
  zCentro: number
  prof: number
  meiaLargura: number
  ceu: string
}) {
  const { scene } = useThree()

  const malhas = useMemo(() => {
    const col = new Coletor()

    const gRipa = new THREE.BoxGeometry(0.16, 0.02, prof * 0.92)
    const gPernaEspr = new THREE.BoxGeometry(0.05, 0.28, 0.05)
    const gAssento = new THREE.BoxGeometry(0.62, 0.07, 1.75)
    const gEncosto = new THREE.BoxGeometry(0.62, 0.07, 0.72)
    const gMontanteVidro = new THREE.BoxGeometry(0.05, 1.05, 0.05)
    const gVaso = new THREE.BoxGeometry(0.7, 0.42, 0.7)
    const gFolhagem = new THREE.SphereGeometry(0.34, 7, 5)

    const mDeck = new THREE.MeshStandardMaterial({ color: '#a97a4e', roughness: 0.82 })
    const mEspreguicadeira = new THREE.MeshStandardMaterial({ color: '#e8dccb', roughness: 0.7 })
    const mMetal = new THREE.MeshStandardMaterial({ color: '#cfc3ae', metalness: 0.7, roughness: 0.32 })
    const mVaso = new THREE.MeshStandardMaterial({ color: '#8d7256', roughness: 0.9 })
    const mFolha = new THREE.MeshStandardMaterial({ color: '#5f7a47', roughness: 0.88 })

    const zFrente = zCentro + prof * 0.34

    // Deck: ripas correndo a largura toda. Dá medida ao chão — sem elas a laje
    // é uma superfície infinita sem escala, que foi o defeito do piso liso.
    const ripas = Math.floor((meiaLargura * 2) / 0.24)
    for (let i = 0; i < ripas; i++)
      col.poe('ripa', gRipa, mDeck, [-meiaLargura + 0.12 + i * 0.24, piso + 0.012, zCentro])

    // Guarda-corpo: montantes finos na borda da frente.
    const montantes = Math.floor((meiaLargura * 2) / 1.5)
    for (let i = 0; i <= montantes; i++)
      col.poe('mont', gMontanteVidro, mMetal, [-meiaLargura + i * 1.5, piso + 0.55, zFrente])

    // Espreguiçadeiras: silhueta baixa e horizontal, em fila. É a forma que o
    // olho lê como "descanso" mesmo a quarenta metros.
    for (const x of [-9.4, -7.9, -6.4, 5.6, 7.1, 8.6]) {
      const z = zCentro + prof * 0.12
      col.poe('assento', gAssento, mEspreguicadeira, [x, piso + 0.33, z])
      col.poe('encosto', gEncosto, mEspreguicadeira, [x, piso + 0.52, z - 0.78], [-0.85, 0, 0])
      for (const dx of [-0.24, 0.24])
        for (const dz of [-0.7, 0.7])
          col.poe('perna', gPernaEspr, mMetal, [x + dx, piso + 0.16, z + dz])
    }

    // Vegetação: volume orgânico contra tanta linha reta.
    for (const x of [-12.2, -3.6, 2.4, 11.4]) {
      const z = zCentro - prof * 0.1
      col.poe('vaso', gVaso, mVaso, [x, piso + 0.21, z])
      col.poe('folha', gFolhagem, mFolha, [x, piso + 0.62, z], [0, 0.4, 0], [1, 0.82, 1])
      col.poe('folha', gFolhagem, mFolha, [x + 0.22, piso + 0.5, z + 0.14], [0, 1.1, 0], [0.7, 0.6, 0.7])
    }

    return col.colhe()
  }, [piso, zCentro, prof, meiaLargura])

  useMemo(() => {
    for (const m of malhas) scene.add(m)
    return () => {
      for (const m of malhas) scene.remove(m)
    }
  }, [malhas, scene])

  const zEspelho = zCentro - prof * 0.26

  return (
    <>
      {/* O ESPELHO D'ÁGUA. `roughness` baixo e `metalness` alto fazem a lâmina
       * devolver o mapa de ambiente — o céu dourado aparece duas vezes no
       * quadro. É o elemento que transforma "laje" em "vista". */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, piso + 0.06, zEspelho]}>
        <planeGeometry args={[meiaLargura * 1.35, prof * 0.3]} />
        <meshStandardMaterial
          color={ceu}
          roughness={0.06}
          metalness={0.85}
          envMapIntensity={2.1}
        />
      </mesh>
      {/* borda da lâmina, em pedra clara */}
      <mesh position={[0, piso + 0.04, zEspelho]}>
        <boxGeometry args={[meiaLargura * 1.42, 0.09, prof * 0.36]} />
        <meshStandardMaterial color="#cbbfa8" roughness={0.85} />
      </mesh>
      {/* O vidro do guarda-corpo: uma lâmina só, transparente, na borda. */}
      <mesh position={[0, piso + 0.55, zCentro + prof * 0.34]}>
        <planeGeometry args={[meiaLargura * 2, 1.0]} />
        <meshPhysicalMaterial
          color="#dbeaf3"
          transmission={0.86}
          thickness={0.06}
          roughness={0.08}
          metalness={0}
          transparent
          opacity={0.32}
          side={THREE.DoubleSide}
        />
      </mesh>
    </>
  )
}
