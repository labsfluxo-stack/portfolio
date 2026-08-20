import { describe, expect, it, vi } from 'vitest'
import { junino, deslocamentoBalanco } from '@/components/ativacoes/temas/junino'
import { TEMA_ATIVO } from '@/components/ativacoes/temas'
import { pt } from '@/content/pt'
import { en } from '@/content/en'

/**
 * O pincel de mentira grava o que foi pedido a ele. Não é mock de
 * comportamento: as funções de desenho não têm retorno para afirmar, e o que
 * importa é justamente O QUE elas mandam o canvas fazer — em particular o que
 * elas NUNCA podem mandar.
 */
function pincelDeMentira() {
  const chamadas: string[] = []
  const alvo = {
    chamadas,
    // Propriedades que o código escreve; guardadas para inspeção.
    shadowBlur: 0,
    filter: 'none',
    globalCompositeOperation: 'source-over',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D & { chamadas: string[] }

  for (const metodo of [
    'save', 'restore', 'beginPath', 'closePath', 'moveTo', 'lineTo', 'arc',
    'ellipse', 'quadraticCurveTo', 'bezierCurveTo', 'fill', 'stroke', 'fillRect',
    'translate', 'rotate', 'scale', 'setLineDash', 'drawImage', 'createLinearGradient',
    'createRadialGradient', 'clip', 'rect',
  ] as const) {
    // `createLinearGradient`/`createRadialGradient` precisam devolver algo com
    // `addColorStop`, senão o tema quebra ao montar um gradiente.
    const devolve = metodo.startsWith('create') ? { addColorStop: vi.fn() } : undefined
    ;(alvo as unknown as Record<string, unknown>)[metodo] = (...args: unknown[]) => {
      chamadas.push(metodo)
      void args
      return devolve
    }
  }
  return alvo
}

describe('tema junino', () => {
  it('tem a forma completa de um tema', () => {
    expect(junino.id).toBe('junino')
    expect(typeof junino.desenharElemento).toBe('function')
    expect(typeof junino.desenharAlvoAtivo).toBe('function')
    expect(typeof junino.desenharEstouro).toBe('function')
    expect(typeof junino.desenharFundo).toBe('function')
    for (const cor of Object.values(junino.paleta)) {
      expect(cor, `cor inválida: ${cor}`).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })

  it('a chave de convite existe no dicionário, nos dois idiomas', () => {
    expect(pt.ativacoes.capa.convitesTema[junino.chaveConvite]).toBeTruthy()
    expect(en.ativacoes.capa.convitesTema[junino.chaveConvite]).toBeTruthy()
  })

  it('o tema ativo é o junino', () => {
    expect(TEMA_ATIVO.id).toBe(junino.id)
  })

  // A medição anterior desta rota registrou 59,88fps com CPU 4x estrangulada, e
  // esse número é o orçamento que o tema gasta. `shadowBlur` e `filter` são os
  // caminhos lentos documentados do Canvas 2D — usá-los faria a página
  // contradizer, na primeira tela, a promessa que ela vende.
  //
  // Fábricas, não um `var` içado no laço: cada rodada cria o próprio pincel de
  // mentira com `const`, então o fechamento de cada função nunca aponta para
  // o pincel de uma rodada diferente. `var` funcionava aqui por içamento — a
  // reatribuição acontecia antes de cada `desenhar()` rodar — mas é frágil e
  // depende de um comportamento que o lint deste repositório rejeita.
  it('nenhuma função de desenho usa caminho lento de canvas', () => {
    const fabricas = [
      (p: ReturnType<typeof pincelDeMentira>) => junino.desenharElemento(p, 24, 0.6, 1, 1000, false),
      (p: ReturnType<typeof pincelDeMentira>) => junino.desenharAlvoAtivo(p, 24, 1000, false),
      (p: ReturnType<typeof pincelDeMentira>) => junino.desenharEstouro(p, 24, 0.5),
      (p: ReturnType<typeof pincelDeMentira>) => junino.desenharFundo(p, 800, 600, 1000, false),
    ]
    for (const desenhar of fabricas) {
      const p = pincelDeMentira()
      desenhar(p)
      expect(p.shadowBlur, 'shadowBlur foi usado').toBe(0)
      expect(p.filter, 'filter foi usado').toBe('none')
    }
  })

  it('desenha alguma coisa em cada função', () => {
    const casos = [
      ['elemento', (p: ReturnType<typeof pincelDeMentira>) => junino.desenharElemento(p, 24, 0.6, 1, 1000, false)],
      ['alvo ativo', (p: ReturnType<typeof pincelDeMentira>) => junino.desenharAlvoAtivo(p, 24, 1000, false)],
      ['estouro', (p: ReturnType<typeof pincelDeMentira>) => junino.desenharEstouro(p, 24, 0.5)],
      ['fundo', (p: ReturnType<typeof pincelDeMentira>) => junino.desenharFundo(p, 800, 600, 1000, false)],
    ] as const
    for (const [nome, desenhar] of casos) {
      const p = pincelDeMentira()
      desenhar(p)
      expect(p.chamadas.length, `${nome} não desenhou nada`).toBeGreaterThan(0)
    }
  })

  /**
   * A TRAVA MAIS IMPORTANTE DESTE ARQUIVO.
   *
   * O teste de acerto vive no motor puro e usa a posição FIXA do alvo, com
   * tolerância de 1,6 vez o raio. Se o balanço do desenho tirar o balão de
   * dentro desse círculo, o clique erra um balão que o olho vê ali — a mesma
   * classe do defeito mais caro que esta rota já teve, um alvo visível que
   * engole o clique. Margem de segurança: metade da folga.
   */
  it('o balanço nunca tira o elemento de dentro da tolerância de acerto', () => {
    const raio = 24
    const folgaMaxima = raio * (1.6 - 1) * 0.5
    let maior = 0
    for (let t = 0; t < 20_000; t += 17) {
      const { dx, dy } = deslocamentoBalanco(t, raio)
      maior = Math.max(maior, Math.hypot(dx, dy))
    }
    expect(maior, `balanço chegou a ${maior.toFixed(2)}px, folga é ${folgaMaxima.toFixed(2)}px`)
      .toBeLessThanOrEqual(folgaMaxima)
  })

  it('em modo parado o elemento não balança', () => {
    const p = pincelDeMentira()
    junino.desenharElemento(p, 24, 0.6, 1, 1000, true)
    const q = pincelDeMentira()
    junino.desenharElemento(q, 24, 0.6, 1, 9999, true)
    expect(p.chamadas).toEqual(q.chamadas)
  })

  it('em modo parado o fundo não se move', () => {
    const p = pincelDeMentira()
    junino.desenharFundo(p, 800, 600, 1000, true)
    const q = pincelDeMentira()
    junino.desenharFundo(q, 800, 600, 50_000, true)
    expect(p.chamadas).toEqual(q.chamadas)
  })
})
