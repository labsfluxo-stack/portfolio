/**
 * O que a cena pode se dar ao luxo de fazer, dado o degrau em que a escada de
 * qualidade parou.
 *
 * A escada em si NÃO é reimplementada: `TIERS`, `judge` e `measureVsync` vivem
 * em `components/three/portico-quality.ts` e já são medidos e testados. Este
 * módulo só traduz "em que degrau estou" para "o que eu ligo".
 */
import { TIERS } from '../three/portico-quality'
import { ANDARES } from './predio-programa'

export type Capacidades = {
  /** Andar como sala de verdade, com fundo e parede oposta visíveis. */
  perspectiva: boolean
  /** Passe de bloom sobre as fontes práticas. Ver `DEGRAU_DO_BRILHO`. */
  brilho: boolean
}

/**
 * O repouso é sempre o mais barato.
 *
 * Nascer com a perspectiva ligada e desligá-la ao detectar lentidão inverte o
 * ônus: quem tem aparelho fraco pagaria os primeiros segundos — justamente os
 * segundos em que está chegando e rolando — para só depois ser socorrido. O
 * Pórtico já aprendeu isso; ver o comentário de `TIERS`.
 */
export const CAPACIDADES_INICIAIS: Capacidades = { perspectiva: false, brilho: false }

/** Só o degrau de estúdio paga perspectiva. */
export const DEGRAU_DA_PERSPECTIVA = 0

/**
 * O BRILHO DESCE UM DEGRAU A MAIS QUE A PERSPECTIVA, e a razão é o que cada um
 * custa e o que cada um devolve.
 *
 * Perspectiva multiplica GEOMETRIA: o andar promovido passa a ter fundo, parede
 * oposta e todo o conteúdo dela. É custo que cresce com a cena.
 *
 * Bloom custa um número FIXO de passes sobre a tela, e não depende de nada que a
 * cena tenha dentro. Num aparelho mediano ele cabe onde a perspectiva não cabe —
 * e num entardecer cheio de fonte acesa ele é o que mais muda a leitura por
 * milissegundo gasto. Então ele sobrevive um degrau abaixo.
 *
 * Nos degraus de baixo ele sai, e sai INTEIRO: o composer nem é montado, e a
 * cena volta a desenhar direto na tela. Bloom degradado é pior que bloom nenhum,
 * porque a fonte continua acesa e o halo fica em blocos.
 */
export const DEGRAU_DO_BRILHO = 1

export function capacidadesDo(degrau: number): Capacidades {
  const dentroDaEscada = degrau >= 0 && degrau < TIERS.length
  return {
    perspectiva: dentroDaEscada && degrau <= DEGRAU_DA_PERSPECTIVA,
    brilho: dentroDaEscada && degrau <= DEGRAU_DO_BRILHO,
  }
}

/**
 * Perspectiva só na primeira e na última impressão — compra-se o impacto onde
 * ele decide e paga-se parallax nos cinco do meio.
 */
export function temPerspectiva(indice: number, cap: Capacidades): boolean {
  if (!cap.perspectiva) return false
  return indice === 0 || indice === ANDARES.length - 1
}
