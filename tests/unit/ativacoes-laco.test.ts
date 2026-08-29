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
})
