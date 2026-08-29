import { describe, expect, it } from 'vitest'
import { criarRelogio } from '@/components/ativacoes/laco'

describe('relogio do laco', () => {
  it('devolve dt em segundos entre quadros', () => {
    const r = criarRelogio(1000)
    expect(r.passo(1016)).toBeCloseTo(0.016, 4)
  })

  it('limita dt para aba que voltou do fundo nao teleportar a partida', () => {
    const r = criarRelogio(1000)
    expect(r.passo(9000), 'acima de ~0,07 a mola diverge — ver revisao da Task 2').toBeLessThanOrEqual(1 / 30)
  })

  it('congelar zera o dt pela duracao pedida, e so por ela', () => {
    const r = criarRelogio(1000)
    r.passo(1016)
    r.congelar(40)
    expect(r.passo(1032), 'dentro do congelamento').toBe(0)
    expect(r.passo(1080), 'depois dele').toBeGreaterThan(0)
  })

  it('descongelamento recalcula dt desde o quadro real anterior, nao acumulado', () => {
    // INVARIANTE DE ORDEM: `anterior = agora` deve vir ANTES do teste
    // de congelamento. Se viesse depois, durante o descongelamento
    // `anterior` estaria preso no quadro que entrou congelado, e o
    // `bruto` acumularia o tempo de congelamento. Com a ordem certa,
    // `anterior` avanca mesmo quando congelado, e descongelamentos
    // recalculam dt limpo.
    // Esse teste falha silenciosamente se a ordem for trocada — o dt seria
    // limitado ao teto e passaria.
    const r = criarRelogio(1000)
    r.passo(1016) // anterior = 1016
    r.congelar(100) // congeladoAte = 1116
    r.passo(1050) // retorna 0, congelado; anterior = 1050
    r.passo(1100) // retorna 0, congelado; anterior = 1100
    expect(r.passo(1120), 'descongelado, dt limpo').toBeCloseTo(0.02, 4)
  })
})
