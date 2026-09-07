/**
 * O prédio em números, sem three.js.
 *
 * Tudo aqui é metro e grau — nada de unidade de tela. A cena converte na hora
 * de desenhar; o fallback ignora. Assim a mesma medida serve para os dois e
 * não existe um segundo prédio, com outras proporções, escondido no CSS.
 */
import { ANDARES } from './predio-programa'

/** Metros. Pé-direito generoso: o andar precisa caber objeto e sombra longa. */
export const PE_DIREITO = 3.2
/** Espessura da laje. É ela que recebe o facho e ganha volume. */
export const LAJE = 0.35
export const ALTURA_ANDAR = PE_DIREITO + LAJE

/**
 * Os pilares atravessam a descida inteira, e não são estrutura decorativa: sem
 * um elemento contínuo, cada andar entra e sai como um slide e a queda deixa de
 * ser uma queda. São eles que costuram as sete paradas numa coisa só.
 */
export const PILARES = [-6.4, 0, 6.4] as const

/**
 * Os três planos de profundidade, do fundo para a frente.
 *
 * `parallax` é a fração da rolagem que o plano acompanha. O fundo anda pouco, a
 * frente acompanha inteiro, e a diferença entre eles É a profundidade. O da
 * frente é obrigatoriamente 1 e z = 0: ele é o plano de referência, e é onde os
 * objetos clicáveis moram — âncora de DOM sobre plano que se desloca em outra
 * velocidade erraria o alvo.
 */
export const PLANOS = [
  { nome: 'fundo', z: -4.2, parallax: 0.35 },
  { nome: 'meio', z: -2.0, parallax: 0.65 },
  { nome: 'frente', z: 0, parallax: 1 },
] as const

/**
 * Hora dourada: sol rasante entrando pela direita.
 *
 * `elevacao` em graus acima do horizonte. Baixo de propósito — é a inclinação
 * que joga a sombra longa e horizontal que separa os três planos. Subir este
 * número achata a cena inteira, e nenhum outro ajuste compensa.
 */
export const SOL = { azimute: 104, elevacao: 8.5 } as const

export function alturaTotal(): number {
  return ALTURA_ANDAR * ANDARES.length
}

/** Y do topo do andar. Zero é o topo do prédio; desce para negativo. */
export function topoDoAndar(indice: number): number {
  return -ALTURA_ANDAR * indice
}

/** Y do meio do pé-direito — a altura em que a câmera olha o andar. */
export function centroDoAndar(indice: number): number {
  return topoDoAndar(indice) - PE_DIREITO / 2
}
