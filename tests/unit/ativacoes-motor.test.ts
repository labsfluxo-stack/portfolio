import { describe, expect, it } from 'vitest'
import {
  avancar,
  criarPartida,
  DURACAO_MS,
  mediaReacao,
  tocar,
  type Partida,
} from '@/components/ativacoes/motor-reflexo'

/**
 * O motor é puro de propósito: recebe semente e relógio por parâmetro, nunca
 * chama `Math.random` nem `Date.now`. É o que permite testar a partida inteira
 * sem canvas, sem DOM e sem espera real — e é a mesma disciplina de
 * `portico-quality.ts` e `portico-yard.ts`, que já existem no projeto.
 */

/** Roda `passos` quadros de 16ms a partir de `t0`, como o rAF faria. */
function simular(partida: Partida, t0: number, passos: number): Partida {
  let estado = partida
  for (let i = 1; i <= passos; i++) estado = avancar(estado, t0 + i * 16)
  return estado
}

describe('motor de reflexo', () => {
  it('nasce em modo atrativo, sem alvo e sem placar', () => {
    const p = criarPartida(1, 0)
    expect(p.fase).toBe('atrativo')
    expect(p.alvos).toEqual([])
    expect(p.acertos).toBe(0)
  })

  it('a mesma semente produz exatamente a mesma partida', () => {
    const a = simular(criarPartida(42, 0), 0, 200)
    const b = simular(criarPartida(42, 0), 0, 200)
    expect(a.alvos.map((alvo) => [alvo.x, alvo.y])).toEqual(
      b.alvos.map((alvo) => [alvo.x, alvo.y]),
    )
    expect(a.acertos).toBe(b.acertos)
  })

  it('sementes diferentes produzem partidas diferentes', () => {
    const a = simular(criarPartida(1, 0), 0, 200)
    const b = simular(criarPartida(2, 0), 0, 200)
    expect(a.alvos.map((alvo) => alvo.x)).not.toEqual(b.alvos.map((alvo) => alvo.x))
  })

  it('todo alvo nasce dentro do quadro normalizado', () => {
    const p = simular(criarPartida(7, 0), 0, 400)
    for (const alvo of p.alvos) {
      expect(alvo.x).toBeGreaterThanOrEqual(alvo.raio)
      expect(alvo.x).toBeLessThanOrEqual(1 - alvo.raio)
      expect(alvo.y).toBeGreaterThanOrEqual(alvo.raio)
      expect(alvo.y).toBeLessThanOrEqual(1 - alvo.raio)
    }
  })

  // O modo atrativo é o que faz a dobra ter movimento antes de qualquer
  // interação: ninguém precisa entender nada para ver a partida acontecendo.
  it('em modo atrativo a partida joga sozinha e marca ponto', () => {
    const p = simular(criarPartida(3, 0), 0, 400)
    expect(p.fase).toBe('atrativo')
    expect(p.acertos).toBeGreaterThan(0)
  })

  it('o primeiro toque zera o placar e começa a partida de verdade', () => {
    const atrativo = simular(criarPartida(3, 0), 0, 400)
    expect(atrativo.acertos).toBeGreaterThan(0)

    const jogando = tocar(atrativo, 0.5, 0.5, 7000)
    expect(jogando.fase).toBe('jogando')
    expect(jogando.acertos).toBe(0)
    expect(jogando.somaReacao).toBe(0)
    expect(jogando.comecouEm).toBe(7000)
  })

  it('tocar num alvo marca ponto e o remove; tocar no vazio não', () => {
    const inicial = tocar(criarPartida(5, 0), 0.5, 0.5, 0)
    const comAlvo = simular(inicial, 0, 60)
    expect(comAlvo.alvos.length).toBeGreaterThan(0)

    const alvo = comAlvo.alvos[0]!
    const errou = tocar(comAlvo, alvo.x + alvo.raio * 4, alvo.y, 1000)
    expect(errou.acertos).toBe(comAlvo.acertos)
    expect(errou.alvos).toHaveLength(comAlvo.alvos.length)

    const acertou = tocar(comAlvo, alvo.x, alvo.y, 1000)
    expect(acertou.acertos).toBe(comAlvo.acertos + 1)
    expect(acertou.alvos.some((a) => a.id === alvo.id)).toBe(false)
  })

  it('o tempo de reação é medido do nascimento do alvo até o toque', () => {
    const inicial = tocar(criarPartida(5, 0), 0.5, 0.5, 0)
    const comAlvo = simular(inicial, 0, 60)
    const alvo = comAlvo.alvos[0]!
    const acertou = tocar(comAlvo, alvo.x, alvo.y, alvo.nascidoEm + 250)
    expect(mediaReacao(acertou)).toBe(250)
  })

  it('mediaReacao devolve 0 sem nenhum acerto, em vez de NaN', () => {
    expect(mediaReacao(criarPartida(1, 0))).toBe(0)
  })

  it('a partida termina depois da duração e para de nascer alvo', () => {
    const jogando = tocar(criarPartida(9, 0), 0.5, 0.5, 0)
    const fim = avancar(jogando, DURACAO_MS + 1)
    expect(fim.fase).toBe('fim')
    expect(fim.alvos).toEqual([])
  })

  // O modo atrativo NÃO tem fim: a dobra fica viva enquanto ninguém tocar.
  // Sem esta trava, a capa congelaria depois de 15 segundos para quem só
  // está lendo a página.
  it('o modo atrativo nunca termina sozinho', () => {
    const p = avancar(criarPartida(9, 0), DURACAO_MS * 3)
    expect(p.fase).toBe('atrativo')
  })

  // `prefers-reduced-motion` desliga o jogador automático — mas NÃO desliga o
  // jogo. Alvo continua nascendo e continua clicável, e a fase segue
  // `atrativo`, que é a única que não expira. Sem este parâmetro, a única
  // forma de calar o fantasma seria forçar a fase para `jogando`, e aí a
  // partida terminaria sozinha em 15 segundos e deixaria a dobra vazia para
  // quem pediu menos movimento — exatamente quem menos deve ser punido.
  it('sem fantasma o modo atrativo não marca ponto sozinho e nunca termina', () => {
    let estado = criarPartida(3, 0)
    for (let i = 1; i <= 2000; i++) estado = avancar(estado, i * 16, false)
    expect(estado.fase).toBe('atrativo')
    expect(estado.acertos).toBe(0)
    expect(estado.alvos.length).toBeGreaterThan(0)
  })

  it('tocar depois do fim não marca ponto', () => {
    const jogando = tocar(criarPartida(9, 0), 0.5, 0.5, 0)
    const comAlvo = simular(jogando, 0, 60)
    const fim = avancar(comAlvo, DURACAO_MS + 1)
    const depois = tocar(fim, 0.5, 0.5, DURACAO_MS + 500)
    expect(depois.acertos).toBe(fim.acertos)
  })
})
