/** Teto de dt: aba que volta do fundo entrega um salto enorme, e sem teto a
 *  partida teleporta. 1/30 e NAO 0,1: a revisao da Task 2 mediu que a mola (rigidez 180,
 *  amortecimento 22) DIVERGE numericamente acima de ~0,07s por passo — dt=0,1
 *  explode em 11 passos. O teto do relogio e o que protege a mola, entao ele
 *  precisa ficar folgado abaixo do limiar dela. 1/30 ainda permite dois
 *  quadros de recuperacao. */
const DT_MAXIMO = 1 / 30

/**
 * Relógio do laço de quadro. O hit-stop mora aqui e não no desenho: congelar
 * é parar a SIMULAÇÃO, nunca a renderização. Congelar o desenho junto pisca.
 */
export function criarRelogio(agoraInicial: number) {
  let anterior = agoraInicial
  let congeladoAte = 0

  return {
    /** dt em segundos desde o quadro anterior. Zero enquanto congelado. */
    passo(agora: number): number {
      const bruto = (agora - anterior) / 1000
      anterior = agora
      if (agora < congeladoAte) return 0
      return Math.min(bruto, DT_MAXIMO)
    },
    /** Congela a simulação. 40ms no acerto normal, 80ms no premiado. */
    congelar(ms: number) {
      congeladoAte = anterior + ms
    },
  }
}
