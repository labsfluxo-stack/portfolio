import { describe, expect, it } from 'vitest'
import {
  TIERS,
  VSYNC_CEILING,
  VSYNC_DEFAULT,
  WARMUP,
  createMeter,
  judge,
  plausibleVsync,
} from '@/components/three/portico-quality'

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

  /**
   * ═══ A CEGUEIRA DA MEDIANA SATURADA ═══
   *
   * `judge` decide pela MEDIANA, e mediana não mede custo quando há folga: ela
   * mede a TAXA DO MONITOR. O navegador entrega quadros no ritmo do vsync e não
   * mais rápido, então toda máquina que dá conta marca 16,7 ms — com margem de
   * 1 % ou perdendo um quadro em dez, o número é o mesmo.
   *
   * O modo de falha que isso cria é específico e invisível para a escada: uma
   * máquina que QUASE aguenta o degrau mais caro fica nele para sempre,
   * engasgando, porque a mediana nunca acusa. Ninguém percebe uma mediana; todo
   * mundo percebe uma travada.
   *
   * O CASO AQUI É EXATAMENTE ESSE: nove quadros no vsync e um quadro dobrado,
   * repetidamente. A mediana sai 16,7 ms — impecável. Um em cada dez quadros é
   * perdido, que é o dobro dos 5 % que o medidor da cena já chama de "engasgo
   * visível".
   *
   * Este teste falha contra a versão da `judge` que só olha a mediana, e é por
   * isso que ele existe antes da correção.
   */
  it('rebaixa quando a mediana está travada no vsync mas um quadro em dez é perdido', () => {
    const meter = createMeter()
    const vsync = 1 / 60
    let ultimo = 'hold'
    // Seis segundos de quadros: nove no vsync, o décimo custando o dobro.
    for (let i = 0; i < 360; i++) {
      const delta = i % 10 === 9 ? vsync * 2 : vsync
      const verdict = judge(meter, delta, vsync, 1, TIERS.length)
      if (verdict !== 'hold') ultimo = verdict
    }
    expect(
      ultimo,
      'a escada não viu a cauda: mediana no vsync, mas 10 % dos quadros perdidos',
    ).toBe('down')
  })

  /**
   * E A REGRA DA CAUDA NÃO PODE DISPARAR NUM SOLUÇO ISOLADO.
   *
   * Um quadro perdido de vez em quando é coleta de lixo, é uma textura
   * chegando, é outra aba acordando — não é a cena ser cara demais. Rebaixar
   * por causa disso trocaria um engasgo de um quadro por uma degradação
   * permanente, porque na fronteira 0↔1 a catraca fecha e o degrau sai do jogo
   * pelo resto da sessão.
   *
   * Um em cinquenta (2 %) fica abaixo do limiar e tem de passar.
   */
  it('não rebaixa por um soluço isolado com a mediana saudável', () => {
    const meter = createMeter()
    const vsync = 1 / 60
    let ultimo = 'hold'
    for (let i = 0; i < 360; i++) {
      const delta = i % 50 === 49 ? vsync * 2 : vsync
      const verdict = judge(meter, delta, vsync, 1, TIERS.length)
      if (verdict !== 'hold') ultimo = verdict
    }
    expect(ultimo, 'rebaixou por um soluço isolado').not.toBe('down')
  })
})

describe('medição do período do monitor', () => {
  it('devolve o menor delta plausível da amostra', () => {
    expect(plausibleVsync([0.02, 1 / 60, 0.03])).toBeCloseTo(1 / 60, 5)
  })

  /** rAF coalescido devolve delta absurdamente curto; ele não é taxa de monitor. */
  it('descarta quadro curto demais para ser vsync', () => {
    expect(plausibleVsync([0.001, 1 / 60])).toBeCloseTo(1 / 60, 5)
  })

  /** Aba que voltou do segundo plano entrega um salto; também não é vsync. */
  it('descarta quadro longo demais para ser vsync', () => {
    expect(plausibleVsync([2.5, 1 / 60])).toBeCloseTo(1 / 60, 5)
  })

  /**
   * O TETO É A REDE DE SEGURANÇA. Mesmo que toda a amostra saia suja, o
   * orçamento não pode degenerar de novo para os 9 fps de antes.
   */
  it('trava no teto de 30 Hz mesmo com amostra inteira ruim', () => {
    expect(plausibleVsync([0.048, 0.049, 0.047])).toBeCloseTo(VSYNC_CEILING, 5)
  })

  /** Sem nada plausível, um número defensável — nunca `Infinity`, que era o
   *  valor que desligava a proteção. */
  it('cai num padrão de 60 Hz quando nada é plausível', () => {
    expect(plausibleVsync([])).toBeCloseTo(VSYNC_DEFAULT, 5)
    expect(plausibleVsync([0.0001, 5])).toBeCloseTo(VSYNC_DEFAULT, 5)
  })
})
