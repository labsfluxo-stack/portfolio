/**
 * A partida de reflexo da dobra, como estado puro.
 *
 * Zero DOM, zero `Math.random`, zero `Date.now`: semente e relógio entram por
 * parâmetro. É o que torna a partida inteira testável sem canvas e sem espera
 * real — mesma disciplina de `components/three/portico-quality.ts`.
 *
 * COORDENADAS SÃO NORMALIZADAS de 0 a 1, e o raio junto. O motor não sabe o
 * tamanho do canvas nem a densidade da tela; quem multiplica por largura e
 * altura é `CapaJogo.tsx`. Sem isso, o teste precisaria inventar um tamanho de
 * tela, e o motor mudaria de comportamento entre celular e desktop.
 */

/** Duração de uma partida de verdade. O modo atrativo ignora este limite. */
export const DURACAO_MS = 15_000
/** Depois disso o alvo some sozinho — é o que cria a pressa. */
const VIDA_ALVO_MS = 1_200
/** Intervalo entre nascimentos. */
const INTERVALO_MS = 620
/** Mais que isso vira ruído visual, e no celular vira alvo pequeno demais. */
const MAX_ALVOS = 3
/** Fração do quadro. 0.055 dá ~24px num canvas de 430px de largura, acima do
 *  mínimo de toque quando somado à tolerância de acerto abaixo. */
const RAIO = 0.055
/** O toque acerta um pouco além da borda desenhada. Dedo não é mouse. */
const TOLERANCIA = 1.6
/** Em modo atrativo o "jogador fantasma" acerta com este atraso, e erra de vez
 *  em quando — acerto perfeito a cada alvo lê como animação em laço, não como
 *  partida. */
const REACAO_FANTASMA_MS = 430

export type Alvo = { id: number; x: number; y: number; raio: number; nascidoEm: number }

export type Fase = 'atrativo' | 'jogando' | 'fim'

export type Partida = {
  fase: Fase
  alvos: Alvo[]
  acertos: number
  /** Soma dos tempos de reação, em ms. `mediaReacao` divide por `acertos`. */
  somaReacao: number
  comecouEm: number
  proximoId: number
  semente: number
  ultimoNascimento: number
}

/**
 * Congruente linear, a mesma dos parâmetros de Numerical Recipes. Devolve o
 * valor E a semente seguinte, porque o motor é puro e não guarda estado
 * escondido em módulo — dois motores rodando na mesma página (não acontece
 * hoje, mas nada impede) não podem compartilhar contador.
 */
function proximo(semente: number): { valor: number; semente: number } {
  const s = (1664525 * semente + 1013904223) >>> 0
  return { valor: s / 4294967296, semente: s }
}

export function criarPartida(semente: number, agora: number): Partida {
  return {
    fase: 'atrativo',
    alvos: [],
    acertos: 0,
    somaReacao: 0,
    comecouEm: agora,
    proximoId: 1,
    // `>>> 0` para semente negativa não envenenar a sequência inteira.
    semente: semente >>> 0,
    ultimoNascimento: agora,
  }
}

function nascer(partida: Partida, agora: number): Partida {
  const px = proximo(partida.semente)
  const py = proximo(px.semente)
  // Mantém o alvo inteiro dentro do quadro: o centro anda só na faixa que
  // sobra depois de descontar o raio nas duas bordas.
  const faixa = 1 - 2 * RAIO
  const alvo: Alvo = {
    id: partida.proximoId,
    x: RAIO + px.valor * faixa,
    y: RAIO + py.valor * faixa,
    raio: RAIO,
    nascidoEm: agora,
  }
  return {
    ...partida,
    alvos: [...partida.alvos, alvo],
    proximoId: partida.proximoId + 1,
    semente: py.semente,
    ultimoNascimento: agora,
  }
}

/**
 * Um quadro. `fantasma = false` desliga o jogador automático sem mexer na
 * fase — é o que `prefers-reduced-motion` usa, e a distinção importa: forçar
 * a fase para `jogando` só para calar o fantasma faria a partida expirar em
 * 15 segundos e deixaria a dobra vazia justamente para quem pediu menos
 * movimento.
 */
export function avancar(partida: Partida, agora: number, fantasma = true): Partida {
  if (partida.fase === 'fim') return partida

  // A partida de verdade tem fim; o modo atrativo não. Sem esta distinção a
  // dobra congelaria depois de 15 segundos para quem só está lendo a página.
  if (partida.fase === 'jogando' && agora - partida.comecouEm >= DURACAO_MS) {
    return { ...partida, fase: 'fim', alvos: [] }
  }

  let estado: Partida = {
    ...partida,
    alvos: partida.alvos.filter((alvo) => agora - alvo.nascidoEm < VIDA_ALVO_MS),
  }

  if (estado.fase === 'atrativo' && fantasma) {
    // O fantasma acerta o alvo mais velho que já passou do tempo de reação, e
    // pula um a cada quatro para a partida não parecer perfeita.
    const maduro = estado.alvos.find(
      (alvo) => agora - alvo.nascidoEm >= REACAO_FANTASMA_MS && alvo.id % 4 !== 0,
    )
    if (maduro) {
      estado = {
        ...estado,
        alvos: estado.alvos.filter((alvo) => alvo.id !== maduro.id),
        acertos: estado.acertos + 1,
        somaReacao: estado.somaReacao + (agora - maduro.nascidoEm),
      }
    }
  }

  if (estado.alvos.length < MAX_ALVOS && agora - estado.ultimoNascimento >= INTERVALO_MS) {
    estado = nascer(estado, agora)
  }

  return estado
}

export function tocar(partida: Partida, x: number, y: number, agora: number): Partida {
  if (partida.fase === 'fim') return partida

  // O primeiro toque encerra o modo atrativo e começa uma partida limpa: o
  // placar do fantasma não pode virar placar de ninguém.
  if (partida.fase === 'atrativo') {
    return {
      ...partida,
      fase: 'jogando',
      acertos: 0,
      somaReacao: 0,
      comecouEm: agora,
      // Os alvos em tela FICAM: apagá-los aqui daria um quadro vazio bem no
      // instante em que a pessoa acabou de decidir participar.
    }
  }

  const atingido = partida.alvos.find((alvo) => {
    const dx = alvo.x - x
    const dy = alvo.y - y
    return Math.hypot(dx, dy) <= alvo.raio * TOLERANCIA
  })
  if (!atingido) return partida

  return {
    ...partida,
    alvos: partida.alvos.filter((alvo) => alvo.id !== atingido.id),
    acertos: partida.acertos + 1,
    somaReacao: partida.somaReacao + (agora - atingido.nascidoEm),
  }
}

/** Média em ms, arredondada. Zero sem acerto — nunca `NaN` na tela. */
export function mediaReacao(partida: Partida): number {
  if (partida.acertos === 0) return 0
  return Math.round(partida.somaReacao / partida.acertos)
}
