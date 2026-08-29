/**
 * Curvas e temporização do jogo da dobra. Puro: sem DOM, sem canvas, sem
 * relógio — tudo recebe `t` normalizado ou `dt` em SEGUNDOS.
 *
 * `dt` em segundos e não em quadros porque jogo que conta quadro acelera em
 * monitor de 144Hz e derrete no tablet do evento.
 */

export const ease = {
  outQuad: (t: number) => 1 - (1 - t) * (1 - t),
  inCubic: (t: number) => t * t * t,
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  /** Passa do alvo e volta. A entrada padrão de qualquer coisa que aparece. */
  outBack: (t: number, forca = 1.70158) => {
    const c = forca + 1
    return 1 + c * Math.pow(t - 1, 3) + forca * Math.pow(t - 1, 2)
  },
} as const

/** Pico no meio, repouso nas duas pontas. `t` de 0 a 1 ao longo de ~180ms. */
export function squash(t: number): { sx: number; sy: number } {
  const p = Math.sin(t * Math.PI) * (1 - t)
  return { sx: 1 + p * 0.35, sy: 1 - p * 0.25 }
}

/** Persegue um alvo que pode se mover. Ease tem fim; mola persegue. */
export function mola(
  atual: number,
  vel: number,
  alvo: number,
  dt: number,
  rigidez = 180,
  amort = 22,
): { valor: number; vel: number } {
  const forca = (alvo - atual) * rigidez - vel * amort
  const v = vel + forca * dt
  return { valor: atual + v * dt, vel: v }
}

/** Decaimento exponencial do tremor. Independente de fps por construção. */
export function tremorEm(forca: number, dt: number): number {
  const f = forca * Math.pow(0.001, dt)
  return f <= 0.01 ? 0 : f
}
