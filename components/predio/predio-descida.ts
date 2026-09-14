/**
 * O trecho de rolagem vira pose de câmera. É o coração da sensação, e é por
 * isso que ele mora fora da cena: função pura sobre números se testa em jsdom,
 * e a fluidez passa a ter suíte em vez de opinião.
 */
import { ANDARES } from './predio-programa'
import { ALTURA_ANDAR, PLANOS, centroDoAndar } from './predio-arquitetura'

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
/** Quanto a camera avanca quando a descida assenta num andar. 11,5 → 5,9. */
const AVANCO = 5.6

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

  // Andar ativo e estação: o MESMO `suave` que gera `y`, não um segundo
  // relógio. Uma versão anterior usava uma fatia de progresso à parte (1/7 do
  // scroll por andar) para escolher o rótulo — e a revisão pegou o resultado:
  // o rótulo sempre trocava ANTES de a câmera chegar perto do centro novo.
  // Pior caso, a recepção: o rótulo já dizia "chegou" em progresso ≈ 0,857,
  // com a câmera ainda a quase um andar inteiro de distância. Arredondar
  // `suave` dá o andar cujo CENTRO está mais perto da câmera agora — não pode
  // discordar de `y`, porque vem do mesmo número. (Isso também resolve, de
  // graça, o ponto de largura zero do último andar que a primeira tentativa
  // com `floor()` tinha: o arredondamento dá a cada andar de ponta uma janela
  // de meio andar, nunca um ponto único.)
  const andar = Math.min(ultimo, Math.max(0, Math.round(suave)))

  // Janela do andar ativo, em unidades de `suave`: meio andar para cada lado
  // do centro, cortada nas bordas do prédio — o primeiro e o último andar não
  // têm vizinho de um dos lados, então a janela deles é metade do tamanho.
  const janelaInicio = Math.max(0, andar - 0.5)
  const janelaFim = Math.min(ultimo, andar + 0.5)
  const larguraJanela = janelaFim - janelaInicio
  const estacao = larguraJanela === 0 ? 0 : aparar((suave - janelaInicio) / larguraJanela, 0, 1)

  // AVANÇO DA CÂMERA — a distância deixa de ser fixa.
  //
  // O conflito que isto resolve é de formato, e só apareceu quando o conteúdo
  // do andar 07 virou um datacenter de verdade: o andar tem 3,2 m de pé-direito
  // por 30 de largura, e a distância que mostra o corte inteiro é a mesma que
  // reduz cada rack a oito pixels. As duas leituras — "prédio em corte" e
  // "ambiente com detalhe" — não cabem numa distância só.
  //
  // Então a câmera CHEGA quando a descida assenta num andar e RECUA entre
  // andares. O gancho é a geometria que já existe: quanto mais perto do centro
  // do andar a câmera está em Y, mais perto ela fica em Z. `smoothstep` para a
  // aproximação não ter quina — chegada linear lê como zoom de videochamada,
  // não como movimento de câmera.
  const centro = centroDoAndar(andar)
  const desvio = Math.min(1, Math.abs(y - centro) / (ALTURA_ANDAR / 2))
  const chegada = 1 - desvio
  const z = RECUO - AVANCO * (chegada * chegada * (3 - 2 * chegada))

  return {
    pose: { y, z },
    andar,
    estacao,
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
