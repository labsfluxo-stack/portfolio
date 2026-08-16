import { describe, expect, it } from 'vitest'
import { TIERS, WARMUP, createMeter, judge } from '@/components/three/portico-quality'

/**
 * A cena 3D da home roda a poucos quadros em máquina fraca e a escada de
 * qualidade adaptativa não rebaixa. Este arquivo existe para provar por quê,
 * antes de consertar.
 *
 * O orçamento de quadro sai do quadro MAIS RÁPIDO do aquecimento, para
 * descobrir o período do vsync do monitor. A intenção é certa — comparar
 * contra 16,7 ms fixos rebaixaria uma cena perfeita num painel de 30 Hz.
 *
 * O defeito é que durante o aquecimento A CENA JÁ ESTÁ RENDERIZANDO. Em
 * máquina com folga o quadro mais rápido é limitado pelo vsync e a medição
 * acerta. Em máquina sem folga ele é limitado pelo custo da própria cena, e o
 * orçamento vira 2,2 × aquilo que ela já custa — que ela nunca estoura.
 */

/** Roda `segundos` de quadros a uma taxa fixa e devolve o último veredito. */
function rodar(
  meter: ReturnType<typeof createMeter>,
  fps: number,
  segundos: number,
  vsync: number,
  step = 1,
): string {
  const delta = 1 / fps
  let ultimo = 'hold'
  for (let t = 0; t < segundos; t += delta) {
    const verdict = judge(meter, delta, vsync, step, TIERS.length)
    if (verdict !== 'hold') ultimo = verdict
  }
  return ultimo
}

describe('escada de qualidade da cena', () => {
  /**
   * O CASO QUE ESTAVA QUEBRADO. Um monitor de 60 Hz e uma máquina entregando
   * 15 quadros por segundo: 66 ms por quadro contra um vsync de 16,7 ms. É
   * quatro vezes o período do monitor — exatamente o que a escada existe para
   * socorrer.
   */
  it('rebaixa a cena a 15 fps num monitor de 60 Hz', () => {
    const veredito = rodar(createMeter(), 15, WARMUP + 6, 1 / 60)
    expect(veredito, 'a escada não rebaixou uma cena rodando a 15 fps').toBe('down')
  })

  /**
   * O PIOR CASO DO DEFEITO ANTIGO, e o que o clamp de `1/30` fecha. Uma
   * máquina a 12 fps: com o teto antigo de `1/20`, o vsync aprendido virava
   * 50 ms e o limiar de rebaixamento ia para 110 ms — a cena só degradaria
   * abaixo de 9 quadros por segundo.
   */
  it('rebaixa mesmo quando a medição do monitor sai suja', () => {
    const veredito = rodar(createMeter(), 12, WARMUP + 6, 1 / 30)
    expect(veredito, 'com vsync no teto do clamp a escada ainda precisa rebaixar').toBe('down')
  })

  /** E a proteção não pode disparar em quem está bem: 58 fps num painel de 60 Hz. */
  it('não rebaixa uma cena que está sustentando o monitor', () => {
    const veredito = rodar(createMeter(), 58, WARMUP + 6, 1 / 60)
    expect(veredito, 'rebaixou uma cena saudável').not.toBe('down')
  })

  /** Num painel de 30 Hz, 29 fps é o teto do que o navegador pode entregar. */
  it('não rebaixa num painel de 30 Hz que está no teto', () => {
    const veredito = rodar(createMeter(), 29, WARMUP + 6, 1 / 30)
    expect(veredito, 'painel de 30 Hz não é máquina lenta').not.toBe('down')
  })
})
