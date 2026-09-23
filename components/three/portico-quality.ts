/**
 * Degraus de qualidade da cena e o medidor que decide entre eles.
 *
 * Vive fora de `Portico.tsx` porque é lógica pura e precisa ser testável: o
 * componente importa three.js e não sobe em jsdom, então enquanto a decisão
 * morava lá dentro nenhum teste alcançava a regra que protege a máquina fraca.
 */

/**
 * Os degraus de qualidade, do cheio ao mínimo.
 *
 * A ordem não é de gosto: é de ganho por unidade de estrago.
 *
 * 1. `dpr` primeiro, porque o custo de pixel é QUADRÁTICO e nenhum outro corte
 *    chega perto. De 1,25 para 1,0 são 36 % menos fragmentos.
 * 2. Sombra depois: o mapa do sol cai pela metade e as luminárias do pórtico
 *    param de projetar, o que apaga um passe de sombra inteiro. O sol continua
 *    projetando, porque é ele que separa os degraus da montagem.
 * 3. `dpr` de novo, por último — o mesmo corte que já é o mais eficaz.
 *
 * Cada degrau mexe em UM eixo. Descer dois de uma vez esconde qual deles pagou.
 */
export const TIERS = [
  // O degrau de estúdio, e a cena começa nele em máquina de ponteiro fino.
  // Esta cena é o pior caso possível para resolução baixa, porque é feita de
  // geometria FINA: cabo de 9 cm, montante de guarda-corpo, degrau de escada,
  // trama da grade. Nenhuma cobre um pixel inteiro a 1,25, e aresta que não
  // cobre um pixel serrilha por definição — MSAA ajuda, não salva.
  { dpr: 2, shadow: 4096, practicals: true },
  { dpr: 1.25, shadow: 2048, practicals: true },
  { dpr: 1.0, shadow: 2048, practicals: true },
  { dpr: 1.0, shadow: 1024, practicals: false },
  { dpr: 0.8, shadow: 1024, practicals: false },
] as const

export type Tier = (typeof TIERS)[number]

/**
 * A janela de avaliação, medida nos DOIS eixos.
 *
 * Só em quadros, falha onde não pode: numa máquina a dois quadros por segundo,
 * quarenta e oito quadros são vinte e quatro segundos, e quem a proteção existe
 * para socorrer já foi embora. Só em tempo, o problema se inverte: meio segundo
 * a 144 Hz são setenta quadros de mediana desnecessária, e a 2 Hz é UM quadro.
 */
export const WINDOW = { min: 10, span: 0.5, cap: 90 } as const
/**
 * Segundos ignorados no começo: compilação de shader e envio de textura.
 *
 * Eram 3, e a maior parte disso existia para aprender o período do monitor. Com
 * o vsync chegando pronto de `measureVsync`, sobra só o custo de partida do
 * renderer — e três segundos a custo cheio numa máquina fraca são exatamente os
 * segundos em que o visitante está chegando e rolando.
 */
export const WARMUP = 1.2
/** Segundos de espera depois de cada degrau, para o novo regime assentar. */
export const SETTLE = 1.5

export type Meter = {
  age: number
  since: number
  at: number
  span: number
  gaps: Float64Array
}

export function createMeter(): Meter {
  return { age: 0, since: 0, at: 0, span: 0, gaps: new Float64Array(WINDOW.cap) }
}

/** Quadro mais curto que isto é rAF coalescido, não taxa de monitor. */
export const VSYNC_FLOOR = 1 / 240
/** Quadro mais longo que isto não é taxa de monitor: nenhum painel é mais lento que 30 Hz. */
export const VSYNC_CEILING = 1 / 30
/** Quando a medição não devolve nada plausível. Nunca `Infinity`: valor ausente
 *  precisa aterrissar num número defensável, não desligar a proteção. */
export const VSYNC_DEFAULT = 1 / 60

/**
 * O período do monitor, a partir de deltas medidos com a página parada.
 *
 * Descarta o implausível dos dois lados — abaixo de `VSYNC_FLOOR` é rAF
 * coalescido, acima de 1/20 é aba que voltou do segundo plano — e trava o
 * resultado em `VSYNC_CEILING`. Esse teto é a rede de segurança que faltava:
 * mesmo com a amostra suja, o pior orçamento possível passa a ser 73 ms em vez
 * dos 110 ms que deixavam a cena degradar só abaixo de 9 fps.
 */
export function plausibleVsync(deltas: readonly number[]): number {
  let melhor = Infinity
  for (const delta of deltas) {
    if (delta > VSYNC_FLOOR && delta < 1 / 20 && delta < melhor) melhor = delta
  }
  return Number.isFinite(melhor) ? Math.min(melhor, VSYNC_CEILING) : VSYNC_DEFAULT
}

/**
 * O período do monitor, medido com a página PARADA.
 *
 * É a metade que faltava: `plausibleVsync` sabe limpar a amostra, mas a amostra
 * precisa vir de um momento em que a cena ainda não existe. `PorticoSlot` já
 * espera `load` e depois ociosidade antes de montar — essa janela é o único
 * lugar da vida da página em que a taxa medida é a do monitor e não a do
 * trabalho que está rolando.
 *
 * Doze quadros a 60 Hz são ~200 ms de callbacks fazendo uma subtração. O custo
 * é irrelevante e a medição, ao contrário da anterior, é honesta.
 */
export function measureVsync(amostras = 12): Promise<number> {
  if (typeof requestAnimationFrame !== 'function') return Promise.resolve(VSYNC_DEFAULT)
  return new Promise((resolve) => {
    const deltas: number[] = []
    let anterior = 0
    const passo = (agora: number): void => {
      if (anterior !== 0) deltas.push((agora - anterior) / 1000)
      anterior = agora
      if (deltas.length >= amostras) resolve(plausibleVsync(deltas))
      else requestAnimationFrame(passo)
    }
    requestAnimationFrame(passo)
  })
}

/**
 * Em que degrau a escada COMEÇA, decidido antes do primeiro quadro.
 *
 * O sinal é `pointer: coarse` — dedo, não mouse. Não é user-agent (mentira
 * fácil) nem largura de janela (uma janela estreita num desktop não é um
 * telefone). `hardwareConcurrency` baixo entra pelo mesmo motivo: dois núcleos
 * não sustentam a geração de textura competindo com a rolagem.
 */
export function startingStep(): number {
  if (typeof window === 'undefined') return 1
  const toque = window.matchMedia?.('(pointer: coarse)').matches ?? false
  const poucosNucleos = (navigator.hardwareConcurrency ?? 8) <= 4
  return toque || poucosNucleos ? 3 : 1
}

export type Verdict = 'hold' | 'down' | 'up'

/**
 * Consome um quadro e diz o que fazer com o degrau atual.
 *
 * `vsync` CHEGA DE FORA, e é a correção que este módulo existe para carregar.
 * Antes ele era aprendido durante o aquecimento, como o quadro mais rápido
 * entregue — só que durante o aquecimento a cena já está renderizando. Em
 * máquina com folga o piso é o vsync e a medição acerta; em máquina sem folga
 * o piso é o custo da própria cena, e o orçamento vira 2,2 × aquilo que ela já
 * custa. A proteção se desligava exatamente nas máquinas para as quais existe.
 *
 * Quem mede agora é `plausibleVsync`, com a página parada, antes da cena subir.
 *
 * DESCE E SOBE. A assimetria dos limiares é de propósito: subir dobra o custo
 * de fragmento, então só vale com folga de verdade. Com os dois iguais a cena
 * ficaria pingando entre dois degraus, e trocar de resolução a cada dois
 * segundos incomoda mais que a resolução menor. `SETTLE` impede a oscilação
 * rápida; a margem impede a lenta.
 */
export function judge(
  meter: Meter,
  delta: number,
  vsync: number,
  step: number,
  steps: number,
): Verdict {
  meter.age += delta
  if (meter.age < WARMUP) return 'hold'
  if (meter.age - meter.since < SETTLE) return 'hold'

  meter.gaps[meter.at++] = delta
  meter.span += delta
  if (meter.at < WINDOW.min || (meter.span < WINDOW.span && meter.at < WINDOW.cap)) return 'hold'

  const sorted = [...meter.gaps.subarray(0, meter.at)].sort((a, b) => a - b)
  const median = sorted[meter.at >> 1] ?? 0
  /**
   * ═══ A TAXA DE QUADROS PERDIDOS, PORQUE A MEDIANA É CEGA COM FOLGA ═══
   *
   * A mediana não mede o custo da cena quando há folga: ela mede a TAXA DO
   * MONITOR. O navegador entrega quadros no ritmo do vsync e não mais rápido,
   * então toda máquina que dá conta marca o mesmo número, com 1 % de margem ou
   * perdendo um quadro em dez. Instrumento saturado responde igual a situações
   * opostas.
   *
   * O modo de falha que isso criava não era "deixar de rebaixar" — era PROMOVER.
   * O teste que trouxe esta correção alimentou `judge` com nove quadros no vsync
   * e um dobrado, repetidamente, e ela devolveu `up`: via a mediana impecável,
   * concluía folga de sobra e subia o degrau de uma máquina que já estava
   * perdendo 10 % dos quadros. Quem mora nesse caso fica no degrau mais caro
   * para sempre, engasgando, e a escada nunca fica sabendo.
   *
   * ═══ TAXA, E NÃO PERCENTIL ═══
   *
   * O medidor da cena (`predio-medicao.ts`) usa p95 e está certo para o que ele
   * faz: relatar. Aqui não serve. A janela fecha com pelo menos 10 quadros e
   * meio segundo, o que na prática dá umas três dezenas de amostras — e o p95 de
   * trinta amostras é a SEGUNDA PIOR, ou seja uma estatística de ordem que uma
   * pausa de coleta de lixo move sozinha.
   *
   * Contar a FRAÇÃO de quadros atrasados é robusto onde o percentil é frágil:
   * um soluço isolado muda a fração em 1/30, e não desloca o veredito.
   *
   * ATRASADO É ACIMA DE 1,5 × vsync — o quadro não chegou a tempo e esperou a
   * próxima varredura. Abaixo disso é jitter de agendamento, não quadro perdido.
   *
   * ═══ OS DOIS GUARDAS, E O QUE CADA UM IMPEDE ═══
   *
   * `at >= 24` restringe a regra a máquinas RÁPIDAS, que são as únicas onde ela
   * é necessária. Numa máquina lenta a janela fecha com os 10 quadros mínimos e
   * todos eles passam de 1,5 × vsync — a taxa daria 100 % e a regra dispararia
   * junto com a da mediana, sem acrescentar nada além de ruído. Lá quem decide
   * continua sendo a mediana, que enxerga bem.
   *
   * 8 % e não os 5 % que o medidor chama de visível, e a diferença é o preço do
   * erro. Na fronteira 0↔1 a catraca FECHA: um rebaixamento equivocado ali tira
   * o degrau do jogo pelo resto da sessão. Com trinta amostras, 8 % exige três
   * quadros perdidos — três em meio segundo é um regime, não um soluço.
   */
  const atrasados = sorted.filter((d) => d > vsync * 1.5).length
  const taxaDePerda = meter.at > 0 ? atrasados / meter.at : 0
  const amostras = meter.at
  meter.at = 0
  meter.span = 0

  // Metade da taxa do monitor, e nunca mais folgado que 45 quadros por segundo.
  const slow = Math.max(vsync * 2.2, 1 / 45)
  if (median > slow && step < steps - 1) {
    meter.since = meter.age
    return 'down'
  }
  if (amostras >= 24 && taxaDePerda > 0.08 && step < steps - 1) {
    meter.since = meter.age
    return 'down'
  }
  if (median < vsync * 1.25 && step > 0) {
    meter.since = meter.age
    return 'up'
  }
  return 'hold'
}
