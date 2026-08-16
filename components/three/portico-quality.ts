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
/** Segundos ignorados no começo: compilação de shader, cube map e envio de textura. */
export const WARMUP = 3
/** Segundos de espera depois de cada degrau, para o novo regime assentar. */
export const SETTLE = 1.5

export type Meter = {
  age: number
  since: number
  at: number
  span: number
  vsync: number
  gaps: Float64Array
}

export function createMeter(): Meter {
  return { age: 0, since: 0, at: 0, span: 0, vsync: Infinity, gaps: new Float64Array(WINDOW.cap) }
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
 * O orçamento sai do próprio monitor, não de um número redondo: comparar
 * `delta` contra 16,7 ms rebaixaria uma cena perfeita num painel de 30 Hz. O
 * que se mede durante o aquecimento é o quadro MAIS RÁPIDO que o navegador
 * entregou.
 */
export function judge(meter: Meter, delta: number, step: number, steps: number): Verdict {
  meter.age += delta
  if (meter.age < WARMUP) {
    // O piso do aquecimento é o período do vsync. Preso entre 240 e 20 Hz
    // porque dois rAF que se juntam devolvem um delta absurdamente curto.
    if (delta > 1 / 240 && delta < meter.vsync) meter.vsync = Math.min(delta, 1 / 20)
    return 'hold'
  }
  if (meter.age - meter.since < SETTLE) return 'hold'

  meter.gaps[meter.at++] = delta
  meter.span += delta
  if (meter.at < WINDOW.min || (meter.span < WINDOW.span && meter.at < WINDOW.cap)) return 'hold'

  const sorted = [...meter.gaps.subarray(0, meter.at)].sort((a, b) => a - b)
  const median = sorted[meter.at >> 1] ?? 0
  meter.at = 0
  meter.span = 0

  // Metade da taxa do monitor, e nunca mais folgado que 45 quadros por segundo.
  const slow = Math.max(meter.vsync * 2.2, 1 / 45)
  if (median > slow && step < steps - 1) {
    meter.since = meter.age
    return 'down'
  }

  // A subida, com limiar bem mais apertado que o da descida. Subir dobra o
  // custo de fragmento, então só vale quando sobra folga de verdade. Com os
  // dois limiares iguais a cena ficaria pingando entre dois degraus.
  if (median < meter.vsync * 1.25 && step > 0) {
    meter.since = meter.age
    return 'up'
  }
  return 'hold'
}
