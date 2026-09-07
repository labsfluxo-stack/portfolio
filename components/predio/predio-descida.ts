/**
 * O trecho de rolagem vira pose de câmera. É o coração da sensação, e é por
 * isso que ele mora fora da cena: função pura sobre números se testa em jsdom,
 * e a fluidez passa a ter suíte em vez de opinião.
 */
import { ANDARES } from './predio-programa'
import { PLANOS, centroDoAndar } from './predio-arquitetura'

export type Pose = { y: number; z: number }

export type Quadro = {
  pose: Pose
  /** Índice do andar ativo em `ANDARES`. */
  andar: number
  /** 0..1 dentro do andar ativo. 0 = acabou de entrar; 1 = saindo. */
  estacao: number
  /** Deslocamento vertical de cada plano, na ordem de `PLANOS`. */
  planos: readonly number[]
}

/**
 * Quanto da rolagem de um andar é gasto PARANDO nele.
 *
 * Sem parada, a câmera atravessa os sete andares em velocidade constante e
 * ninguém lê nada: é um elevador em queda, não uma visita. Com parada, cada
 * andar tem um trecho em que a câmera quase não anda — e é nele que o rótulo,
 * o resumo e os objetos ficam legíveis.
 */
const PARADA = 0.45

/** Distância da câmera ao plano da frente, em metros. */
const RECUO = 11.5

export const TAXA_DE_AMORTECIMENTO = 9

const aparar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/**
 * Curva de estação: acelera entre andares, quase para dentro do andar.
 *
 * É um `smoothstep` invertido no miolo. A alternativa óbvia — velocidade
 * constante com um `scroll-snap` por cima — foi descartada porque o snap
 * SEQUESTRA a rolagem do visitante: no celular ele briga com o dedo e produz
 * exatamente o engasgo que este projeto existe para não ter.
 */
function comParada(t: number): number {
  const s = t * t * (3 - 2 * t)
  return t + (s - t) * PARADA
}

export function quadroDe(progresso: number): Quadro {
  const p = aparar(progresso, 0, 1)
  const ultimo = ANDARES.length - 1

  // Altura da câmera: posição contínua entre os CENTROS dos andares (só 6
  // intervalos para 7 andares). É este número que garante os dois extremos
  // exatos exigidos pelo teste — centroDoAndar(0) em p=0, centroDoAndar(último)
  // em p=1 — e a descida suave com pausa em cada centro.
  const bruto = ultimo === 0 ? 0 : p * ultimo
  const indiceDeAltura = Math.min(ultimo, Math.floor(bruto))
  const fracaoDeAltura = ultimo === 0 ? 0 : bruto - indiceDeAltura
  const suave = indiceDeAltura + comParada(fracaoDeAltura)

  const alvo = centroDoAndar(0)
  const chao = centroDoAndar(ultimo)
  const y = ultimo === 0 ? alvo : alvo + ((chao - alvo) * suave) / ultimo

  // Andar ativo (o rótulo mostrado): FATIA de progresso, não a mesma conta da
  // altura. Reaproveitar `indiceDeAltura` foi a primeira tentativa e é o
  // defeito que a suíte "todos os sete andares são visitados" existe para
  // pegar — com 7 andares e só 6 intervalos entre centros, o último andar
  // vira um ponto de largura zero (só em p===1 exato) e nunca é "visitado" de
  // verdade, pisca e some. Dividir o progresso em `ANDARES.length` fatias
  // iguais dá aos sete andares, inclusive o último, uma faixa de verdade.
  const fatia = 1 / ANDARES.length
  const posicaoNaFatia = ultimo === 0 ? 0 : p / fatia
  const andar = Math.min(ultimo, Math.floor(posicaoNaFatia))
  const dentroDoAndar = aparar(posicaoNaFatia - andar, 0, 1)

  return {
    pose: { y, z: RECUO },
    andar,
    estacao: comParada(dentroDoAndar),
    // O plano acompanha a descida na fração do seu parallax. O da frente
    // (fator 1) acompanha inteiro e serve de referência para os outros dois.
    planos: PLANOS.map((plano) => y * plano.parallax),
  }
}

/**
 * Amortecimento exponencial, independente da taxa de quadros.
 *
 * `1 - e^(-k·dt)` em vez de um fator fixo por quadro. Ver o teste: com fator
 * fixo, o mesmo movimento tem peso diferente em 60 Hz e em 144 Hz.
 */
export function amortecer(atual: number, alvo: number, delta: number): number {
  return atual + (alvo - atual) * (1 - Math.exp(-TAXA_DE_AMORTECIMENTO * delta))
}
