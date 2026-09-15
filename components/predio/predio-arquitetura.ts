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
 * Hora dourada, com o sol DENTRO do quadro.
 *
 * ERA 104° / 8,5°, e os dois números mudaram pela mesma razão. O comentário
 * antigo dizia que 8,5° era "a inclinação que joga a sombra longa e horizontal
 * que separa os três planos", e isso era verdade quando o prédio era relevo raso
 * — mas deixou de ser quando os andares ganharam conteúdo de verdade. Medido: a
 * 8,5° a sombra de um objeto sai 6,7 vezes a altura dele, então o pergolado de
 * 2,63 m projetava 17,6 m e aterrissava a 20 m à esquerda do deck. A cena tinha
 * sol e não tinha UMA sombra visível.
 *
 * A 24° a mesma sombra sai 5,9 m e cai no deck, entre o pergolado e a câmera.
 * É ela que devolve o desenho de luz que uma foto de fim de tarde tem.
 *
 * O AZIMUTE É A OUTRA METADE, e as duas são inseparáveis: para o sol APARECER,
 * ele precisa estar do lado de lá do prédio, porque a câmera olha para −z. Com
 * 152° o ângulo horizontal em relação ao eixo da câmera é 28°, dentro dos 46,9°
 * de meia-abertura — o sol cai no terço direito da tela, entre os pilares.
 *
 * O PREÇO, dito claro: a cena passa a ser CONTRALUZ. As faces viradas para a
 * câmera recebem sol rasante em vez de sol de frente, e quem as levanta é a luz
 * de preenchimento. É o que uma cobertura fotografada contra o poente é de
 * verdade — mas é uma troca, não um ajuste: mais contraste, menos cor local.
 */
export const SOL = { azimute: 152, elevacao: 24 } as const

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
