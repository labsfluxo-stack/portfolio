import type { Tema } from './tipos'
import { junino } from './junino'

/**
 * O tema que a dobra está rodando.
 *
 * "Trocável" nesta rota significa ARQUITETURA, não interface: não há seletor na
 * página, não há troca por calendário, não há painel. Trocar de tema é trocar
 * esta linha, e acrescentar um tema é acrescentar um arquivo. Qualquer coisa
 * além disso é função que ninguém pediu.
 */
export const TEMA_ATIVO: Tema = junino

export type { Tema } from './tipos'
