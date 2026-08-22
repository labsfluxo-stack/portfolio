import { describe, expect, it } from 'vitest'
import {
  acertarAlvoAtivo,
  alvoAtivo,
  avancar,
  criarPartida,
  DURACAO_MS,
  faseDoRepique,
  mediaReacao,
  reiniciar,
  tocar,
  tocarEm,
  vidaDoAlvo,
  VIDA_ALVO_MS,
  type Partida,
  type Zona,
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

/**
 * Contagem de nascimentos da versão ACHATADA que a auditoria mediu: cadência,
 * vida e teto fixos, sem fase nenhuma — a mesma lógica que `nascer`/`avancar`
 * tinham antes da Mudança 1. Existe só neste arquivo, e não importa nada do
 * motor, porque é o "antes" contra o qual a curva de repique precisa provar
 * ser diferente. A auditoria mediu 24 nascimentos em 15s rodando esta mesma
 * conta.
 */
function contarNascimentosFlat(): number {
  const INTERVALO = 620
  const VIDA = 1200
  const MAX = 3
  let vivos: number[] = []
  let ultimoNascimento = 0
  let total = 0
  for (let t = 16; t <= DURACAO_MS; t += 16) {
    vivos = vivos.filter((nascidoEm) => t - nascidoEm < VIDA)
    if (vivos.length < MAX && t - ultimoNascimento >= INTERVALO) {
      vivos.push(t)
      ultimoNascimento = t
      total++
    }
  }
  return total
}

/**
 * Roda uma partida de verdade (fantasma desligado, para a contagem não
 * misturar acerto automático com nascimento) do começo ao fim e mede: quantos
 * alvos nasceram ao todo, e a densidade média de alvos vivos em cada uma das
 * três janelas da tabela de repique. É a prova de que a curva sobe e alivia
 * — um formato, não um número solto.
 */
function medirPartida(semente: number) {
  let estado = tocar(criarPartida(semente, 0), 0.5, 0.5, 0)
  const soma = { chegada: 0, pico: 0, pouso: 0 }
  const amostras = { chegada: 0, pico: 0, pouso: 0 }
  for (let t = 16; t <= DURACAO_MS; t += 16) {
    estado = avancar(estado, t, false)
    const fase = t < 5_000 ? 'chegada' : t < 11_000 ? 'pico' : 'pouso'
    soma[fase] += estado.alvos.length
    amostras[fase] += 1
  }
  return {
    totalNascidos: estado.proximoId - 1,
    densidadeChegada: soma.chegada / amostras.chegada,
    densidadePico: soma.pico / amostras.pico,
    densidadePouso: soma.pouso / amostras.pouso,
  }
}

/**
 * Mesmo teste círculo-retângulo pelo ponto mais próximo que `nascer` usa por
 * dentro — reimplementado aqui, e não importado, de propósito: o teste
 * precisa verificar o COMPORTAMENTO observável (nenhum alvo sobrepõe a zona),
 * não reusar a função do motor e correr o risco de validar um bug contra ele
 * mesmo.
 */
function circuloTocaZonaTeste(x: number, y: number, raio: number, zona: Zona): boolean {
  const maisPertoX = Math.max(zona.x, Math.min(x, zona.x + zona.largura))
  const maisPertoY = Math.max(zona.y, Math.min(y, zona.y + zona.altura))
  const dx = x - maisPertoX
  const dy = y - maisPertoY
  return dx * dx + dy * dy < raio * raio
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
    // O `for` abaixo não afirma NADA se `p.alvos` estiver vazio — e vazio
    // acontece de verdade: 104 dos 400 tiques simulados param num instante sem
    // alvo vivo (o alvo dura 1200ms, nasce a cada 620ms, e o fantasma remove os
    // que acerta). Sem esta linha o teste passava na sorte do tique em que a
    // simulação parou, e um alvo nascendo fora do quadro passaria batido.
    expect(p.alvos.length).toBeGreaterThan(0)
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

  // `fim` era estado terminal sem saída: `tocar` devolvia a partida inalterada
  // e nada no motor sabia recomeçar. `reiniciar` é a saída, e ela entrega uma
  // partida JÁ EM `jogando` — quem apertou "jogar de novo" não quer assistir ao
  // fantasma jogar por ele.
  it('reiniciar devolve uma partida limpa já jogando, e ela volta a nascer alvo', () => {
    const jogando = tocar(criarPartida(9, 0), 0.5, 0.5, 0)
    const comAlvo = simular(jogando, 0, 60)
    const fim = avancar(comAlvo, DURACAO_MS + 1)
    expect(fim.fase).toBe('fim')
    expect(fim.acertos).toBeGreaterThanOrEqual(0)

    const t = DURACAO_MS + 2000
    const nova = reiniciar(fim, t)
    expect(nova.fase).toBe('jogando')
    expect(nova.acertos).toBe(0)
    expect(nova.somaReacao).toBe(0)
    expect(nova.alvos).toEqual([])
    expect(nova.comecouEm).toBe(t)

    // E o mais importante: a partida nova ANDA. Um `fim` renomeado para
    // `jogando` que nunca mais fizesse nascer alvo seria a mesma tela morta com
    // outro nome.
    const rodando = simular(nova, t, 60)
    expect(rodando.alvos.length).toBeGreaterThan(0)
  })

  // A revanche não pode ser a repetição exata da partida anterior: a semente
  // que `reiniciar` reaproveita é o ESTADO ATUAL do gerador, não a semente
  // original, e por isso a sequência continua de onde parou.
  it('reiniciar continua a sequência em vez de repetir a partida anterior', () => {
    const primeira = simular(tocar(criarPartida(9, 0), 0.5, 0.5, 0), 0, 200)
    const fim = avancar(primeira, DURACAO_MS + 1)
    const segunda = simular(reiniciar(fim, DURACAO_MS + 2000), DURACAO_MS + 2000, 200)
    expect(segunda.alvos.map((alvo) => alvo.x)).not.toEqual(primeira.alvos.map((alvo) => alvo.x))
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

  // Achado do fix round 1 do review da Task 4: `aoTocar`, no componente, lê
  // `partidaRef.current` e despacha direto para `tocar`. `tocar` sozinho só
  // olha `fase === 'fim'` — quem reavalia a duração de 15s é `avancar`, que
  // só roda enquanto o laço de rAF está girando, e o laço é pausado de
  // propósito fora da viewport e em aba oculta. Um toque que chegue nesse
  // intervalo — depois que a partida devia ter acabado, mas antes do próximo
  // quadro rodar `avancar` de novo — julga contra o estado de antes da
  // pausa. `tocar` puro, sem nenhum `avancar` no meio, cai exatamente nessa
  // armadilha: pontua contra uma partida cujos 15 segundos já passaram.
  it('um toque tardio sem avancar no meio não pontua contra a partida já encerrada', () => {
    const jogando = tocar(criarPartida(9, 0), 0.5, 0.5, 0)
    const comAlvo = simular(jogando, 0, 60)
    const alvo = comAlvo.alvos[0]!

    // Tempo real passou muito além da duração da partida, mas nada chamou
    // `avancar` nesse intervalo — é exatamente o buraco do laço pausado.
    const agoraTarde = comAlvo.comecouEm + DURACAO_MS + 5000

    // A prova de que a falha é real: `tocar` puro pontua contra estado
    // velho e nunca marca a partida como `fim`.
    const comTocarPuro = tocar(comAlvo, alvo.x, alvo.y, agoraTarde)
    expect(comTocarPuro.fase).toBe('jogando')
    expect(comTocarPuro.acertos).toBe(comAlvo.acertos + 1)

    // `tocarEm` reavalia a duração antes de julgar o toque: a partida já
    // devia estar em `fim`, e o toque tardio não pontua contra ela.
    const comTocarEm = tocarEm(comAlvo, alvo.x, alvo.y, agoraTarde)
    expect(comTocarEm.fase).toBe('fim')
    expect(comTocarEm.acertos).toBe(comAlvo.acertos)
  })

  // A correção não pode virar "nunca pontua": um toque bem dentro da janela
  // ainda tem que marcar ponto através de `tocarEm`.
  it('tocarEm ainda marca ponto quando o toque chega bem dentro da janela', () => {
    const jogando = tocar(criarPartida(9, 0), 0.5, 0.5, 0)
    const comAlvo = simular(jogando, 0, 60)
    const alvo = comAlvo.alvos[0]!

    const acertou = tocarEm(comAlvo, alvo.x, alvo.y, alvo.nascidoEm + 100)
    expect(acertou.fase).toBe('jogando')
    expect(acertou.acertos).toBe(comAlvo.acertos + 1)
  })

  /**
   * POR QUE ESTE TESTE EXISTE AO LADO DOS DE `tocarEm` ACIMA (achado da
   * revisão final de branch): `tocarEm` prova que a COMPOSIÇÃO "avancar,
   * depois julgar o toque contra o estado fresco" é a correta — mas
   * `CapaJogo.tsx` não chama `tocarEm`. `aoTocar`/`aoTeclar`, no componente,
   * chamam `avancar` e `tocar` SEPARADOS (`const antesDoToque = avancar(...)`
   * seguido de `const depois = tocar(antesDoToque, ...)`), de propósito: o
   * componente precisa do estado INTERMEDIÁRIO — entre o avanço do relógio e
   * o julgamento do toque — para saber, por comparação, se foi ESTE toque
   * que removeu um alvo (a rajada visual de acerto). A composição é
   * EQUIVALENTE a `tocarEm` por fora (mesmo resultado final), então o
   * comportamento do jogo está certo — mas nenhum teste antes deste chamava
   * `avancar` e `tocar` como duas chamadas separadas, na mesma ordem que o
   * componente roda. Apagar o `avancar` de `CapaJogo.tsx` (voltando a um
   * toque cru contra estado velho, a MESMA regressão que motivou `tocarEm`)
   * deixaria os testes de `tocarEm` inteiramente verdes — eles testam a
   * função exportada, não quem a chama ou deixa de chamar. Este teste prende
   * a composição que o COMPONENTE de fato executa.
   */
  it('avancar seguido de tocar — a composição que o componente roda — não pontua um toque tardio', () => {
    const jogando = tocar(criarPartida(9, 0), 0.5, 0.5, 0)
    const comAlvo = simular(jogando, 0, 60)
    const alvo = comAlvo.alvos[0]!
    const agoraTarde = comAlvo.comecouEm + DURACAO_MS + 5000

    // Exatamente a sequência de `aoTocar`/`aoTeclar` em `CapaJogo.tsx`:
    // `avancar` primeiro, sobre o estado ORIGINAL — reavalia a duração de 15s
    // e leva a partida a `fim` — só depois `tocar`, contra esse estado fresco.
    const antesDoToque = avancar(comAlvo, agoraTarde)
    expect(antesDoToque.fase).toBe('fim')

    const depois = tocar(antesDoToque, alvo.x, alvo.y, agoraTarde)
    expect(depois.fase).toBe('fim')
    expect(depois.acertos).toBe(comAlvo.acertos)
  })
})

// Mudança 1: "repique" — cadência, vida e teto de alvos vivos deixam de ser
// constantes do módulo e passam a variar em três janelas ao longo dos 15s.
// A auditoria mediu a versão achatada: 24 alvos no total, densidade parada
// em 1-2 do segundo 1 ao 14, sem curva nenhuma.
describe('faseDoRepique', () => {
  it('fase chegada vale do início até (sem incluir) 5s', () => {
    expect(faseDoRepique(0)).toEqual({ intervalo: 700, vida: 1400, maximo: 2 })
    expect(faseDoRepique(4_999)).toEqual({ intervalo: 700, vida: 1400, maximo: 2 })
  })

  it('fase pico vale de 5s até (sem incluir) 11s', () => {
    expect(faseDoRepique(5_000)).toEqual({ intervalo: 300, vida: 1000, maximo: 4 })
    expect(faseDoRepique(10_999)).toEqual({ intervalo: 300, vida: 1000, maximo: 4 })
  })

  it('fase pouso vale de 11s em diante, inclusive além do fim de uma partida', () => {
    expect(faseDoRepique(11_000)).toEqual({ intervalo: 620, vida: 1250, maximo: 3 })
    expect(faseDoRepique(14_999)).toEqual({ intervalo: 620, vida: 1250, maximo: 3 })
    // `avancar` já teria devolvido `fim` antes de chegar aqui, mas a função
    // pura não sabe disso e não deve nem explodir nem voltar para `chegada`
    // — fica em `pouso`, a última fase que existiu.
    expect(faseDoRepique(20_000)).toEqual({ intervalo: 620, vida: 1250, maximo: 3 })
  })
})

describe('curva de repique (Mudança 1)', () => {
  it('a partida inteira nasce um número de alvos mensuravelmente diferente da versão achatada', () => {
    const achatada = contarNascimentosFlat()
    const comRepique = medirPartida(11).totalNascidos
    expect(comRepique).not.toBe(achatada)
  })

  it('a densidade de alvos vivos sobe na janela de pico e alivia na janela de pouso', () => {
    const m = medirPartida(11)
    expect(m.densidadePico).toBeGreaterThan(m.densidadeChegada)
    expect(m.densidadePico).toBeGreaterThan(m.densidadePouso)
  })

  // Ambiente, não partida: quem só está lendo a página não pode levar a
  // mesma tensão crescente de quem está de fato jogando.
  it('o modo atrativo trava nos valores de chegada, mesmo muito além da duração de uma partida', () => {
    let estado = criarPartida(3, 0)
    const nascimentos: number[] = []
    let proximoIdAnterior = estado.proximoId
    for (let t = 16; t <= DURACAO_MS * 3; t += 16) {
      // Fantasma desligado: ele remove alvo por acerto, e isso embaralharia a
      // contagem de vivos que este teste mede.
      estado = avancar(estado, t, false)
      expect(estado.alvos.length).toBeLessThanOrEqual(2)
      if (estado.proximoId !== proximoIdAnterior) {
        nascimentos.push(estado.alvos[estado.alvos.length - 1]!.nascidoEm)
        proximoIdAnterior = estado.proximoId
      }
    }
    expect(nascimentos.length).toBeGreaterThan(0)
    for (let i = 1; i < nascimentos.length; i++) {
      expect(nascimentos[i]! - nascimentos[i - 1]!).toBeGreaterThanOrEqual(700)
    }
  })
})

describe('vidaDoAlvo', () => {
  it('VIDA_ALVO_MS continua exportado e igual ao valor de chegada', () => {
    expect(VIDA_ALVO_MS).toBe(1_400)
  })

  it('devolve a vida da fase em que o alvo nasceu, não a fase corrente', () => {
    const jogando = tocar(criarPartida(9, 0), 0.5, 0.5, 0)
    const noPico = simular(jogando, 0, 375) // 375 * 16ms = 6000ms, dentro do pico
    const alvoDoPico = noPico.alvos.find((a) => a.nascidoEm >= 5_000 && a.nascidoEm < 11_000)
    expect(alvoDoPico).toBeDefined()
    expect(vidaDoAlvo(noPico, alvoDoPico!)).toBe(1_000)
  })

  it('em modo atrativo todo alvo tem a vida de chegada', () => {
    const atrativo = simular(criarPartida(3, 0), 0, 400)
    expect(atrativo.alvos.length).toBeGreaterThan(0)
    for (const alvo of atrativo.alvos) {
      expect(vidaDoAlvo(atrativo, alvo)).toBe(VIDA_ALVO_MS)
    }
  })

  // Caso de borda documentado no comentário de `vidaDoAlvo`: o primeiro toque
  // herda os alvos do modo atrativo (ver `tocar`) e adianta `comecouEm` para
  // o instante do toque — um alvo herdado passa a ter `nascidoEm` ANTERIOR a
  // `comecouEm`, e `alvo.nascidoEm - partida.comecouEm` dá negativo.
  it('alvo herdado do atrativo pelo primeiro toque continua com a vida de chegada mesmo com decorrido negativo', () => {
    const atrativo = simular(criarPartida(3, 0), 0, 400)
    expect(atrativo.alvos.length).toBeGreaterThan(0)
    const herdado = atrativo.alvos[0]!

    const jogando = tocar(atrativo, 0.5, 0.5, 7_000)
    expect(herdado.nascidoEm).toBeLessThan(jogando.comecouEm)
    expect(vidaDoAlvo(jogando, herdado)).toBe(VIDA_ALVO_MS)
  })
})

// Mudança 2: zonas proibidas — a auditoria mediu 9,4%-15,6% dos alvos
// nascendo embaixo de conteúdo real que intercepta o clique.
describe('zonasProibidas (Mudança 2)', () => {
  it('nenhum alvo nasce sobrepondo uma zona proibida, numa corrida longa com reinícios', () => {
    const zonas: Zona[] = [
      { x: 0.1, y: 0.1, largura: 0.3, altura: 0.2 },
      { x: 0.55, y: 0.5, largura: 0.35, altura: 0.35 },
    ]
    let estado = tocar(criarPartida(23, 0, zonas), 0.5, 0.5, 0)
    const idsVistos = new Set<number>()
    let total = 0
    for (let t = 16; t <= DURACAO_MS * 4; t += 16) {
      estado = avancar(estado, t, false)
      for (const alvo of estado.alvos) {
        if (idsVistos.has(alvo.id)) continue
        idsVistos.add(alvo.id)
        total++
        for (const zona of zonas) {
          expect(circuloTocaZonaTeste(alvo.x, alvo.y, alvo.raio, zona)).toBe(false)
        }
      }
      if (estado.fase === 'fim') estado = reiniciar(estado, t)
    }
    // Prova de que o teste testou alguma coisa: sem isto, um motor que nunca
    // nascesse alvo nenhum passaria pela razão errada.
    expect(total).toBeGreaterThan(20)
  })

  it('quando as zonas cobrem quase tudo, o nascimento é pulado em vez de malposicionado', () => {
    // Sobra só uma faixa de 0.05 na borda direita — mais estreita que o
    // diâmetro do alvo (2 * 0.055 = 0.11) e fora do alcance do centro, que já
    // é travado em [raio, 1-raio] = [0.055, 0.945]. Nenhuma posição sorteável
    // escapa das oito tentativas.
    const zonas: Zona[] = [{ x: 0, y: 0, largura: 0.95, altura: 1 }]
    let estado = tocar(criarPartida(23, 0, zonas), 0.5, 0.5, 0)
    for (let t = 16; t <= DURACAO_MS; t += 16) {
      estado = avancar(estado, t, false)
      expect(estado.alvos).toHaveLength(0)
    }
  })
})

// Mudança 3: teclado. A barra de espaço acerta o alvo mais velho — sem ela o
// jogo era inalcançável para quem não usa ponteiro.
describe('acertarAlvoAtivo e alvoAtivo (Mudança 3)', () => {
  it('acerta o alvo mais velho entre vários vivos, não um mais novo', () => {
    const jogando = tocar(criarPartida(5, 0), 0.5, 0.5, 0)
    const comAlvos = simular(jogando, 0, 400)
    expect(comAlvos.alvos.length).toBeGreaterThan(1)

    const maisVelho = comAlvos.alvos.reduce((a, b) => (a.nascidoEm <= b.nascidoEm ? a : b))
    expect(alvoAtivo(comAlvos)).toEqual(maisVelho)

    const depois = acertarAlvoAtivo(comAlvos, maisVelho.nascidoEm + 200)
    expect(depois.alvos.some((a) => a.id === maisVelho.id)).toBe(false)
    expect(depois.alvos).toHaveLength(comAlvos.alvos.length - 1)
  })

  it('pontua exatamente como um toque de ponteiro no mesmo instante e no mesmo alvo', () => {
    const jogando = tocar(criarPartida(5, 0), 0.5, 0.5, 0)
    const comAlvos = simular(jogando, 0, 400)
    const alvo = alvoAtivo(comAlvos)!
    const agora = alvo.nascidoEm + 300

    const viaTeclado = acertarAlvoAtivo(comAlvos, agora)
    const viaPonteiro = tocar(comAlvos, alvo.x, alvo.y, agora)
    expect(viaTeclado.acertos).toBe(viaPonteiro.acertos)
    expect(viaTeclado.somaReacao).toBe(viaPonteiro.somaReacao)
    expect(viaTeclado.alvos).toEqual(viaPonteiro.alvos)
  })

  it('é um no-op quando não há alvo vivo', () => {
    const semAlvo = tocar(criarPartida(5, 0), 0.5, 0.5, 0)
    expect(semAlvo.alvos).toEqual([])
    expect(acertarAlvoAtivo(semAlvo, 0)).toEqual(semAlvo)
  })

  it('é um no-op depois do fim da partida', () => {
    const jogando = tocar(criarPartida(9, 0), 0.5, 0.5, 0)
    const comAlvo = simular(jogando, 0, 60)
    const fim = avancar(comAlvo, DURACAO_MS + 1)
    expect(fim.fase).toBe('fim')
    expect(acertarAlvoAtivo(fim, DURACAO_MS + 500)).toBe(fim)
  })

  it('sai do modo atrativo como um primeiro toque: zera o placar do fantasma e mantém os alvos', () => {
    const atrativo = simular(criarPartida(3, 0), 0, 400)
    expect(atrativo.fase).toBe('atrativo')
    expect(atrativo.alvos.length).toBeGreaterThan(0)

    const depois = acertarAlvoAtivo(atrativo, 7_000)
    expect(depois.fase).toBe('jogando')
    expect(depois.comecouEm).toBe(7_000)
    // Zerou o placar do fantasma e marcou exatamente o ponto do próprio
    // acionamento — não herdou nada de antes, e não deixou de contar o seu.
    expect(depois.acertos).toBe(1)
    expect(depois.alvos).toHaveLength(atrativo.alvos.length - 1)
  })

  it('alvoAtivo concorda com o alvo que acertarAlvoAtivo de fato remove', () => {
    const jogando = tocar(criarPartida(5, 0), 0.5, 0.5, 0)
    const comAlvos = simular(jogando, 0, 400)
    const antes = alvoAtivo(comAlvos)
    expect(antes).not.toBeNull()

    const depois = acertarAlvoAtivo(comAlvos, antes!.nascidoEm + 100)
    expect(depois.alvos.some((a) => a.id === antes!.id)).toBe(false)
    expect(alvoAtivo(depois)?.id).not.toBe(antes!.id)
  })
})


// ── Sequência: o que o jogador tem a PERDER ───────────────────────────
//
// Antes desta mudança a partida guardava três coisas — acertos, soma das
// reações e quando começou — e um clique no vazio devolvia a partida
// INALTERADA. Não havia erro, não havia nada em risco, e uma simulação da
// partida inteira (`.superpowers/mecanica/sim.mts`) mediu o efeito disso:
// de 180ms a 450ms de tempo de reação o resultado era idêntico — 23
// acertos, zero escapes — porque todo jogador limpava a tela mais rápido
// do que ela enchia. A faixa inteira do desempenho humano dava o mesmo
// placar. O jogo não podia ser perdido.
describe('sequência de acertos', () => {
  /** Partida já em jogo, com um alvo plantado em posição conhecida. */
  function comAlvo(agora = 0): Partida {
    const base = criarPartida(1, agora)
    return {
      ...base,
      fase: 'jogando',
      comecouEm: agora,
      alvos: [{ id: 1, x: 0.5, y: 0.5, raio: 0.05, nascidoEm: agora }],
    }
  }

  it('começa zerada e sobe a cada acerto', () => {
    const p = comAlvo()
    expect(p.sequencia).toBe(0)
    const depois = tocarEm(p, 0.5, 0.5, 200)
    expect(depois.sequencia).toBe(1)
    expect(depois.melhorSequencia).toBe(1)
  })

  it('um clique no vazio zera a sequência e conta erro de mira', () => {
    const acertou = tocarEm(comAlvo(), 0.5, 0.5, 200)
    expect(acertou.sequencia).toBe(1)
    // Longe de qualquer alvo — e não há mais alvo nenhum em tela.
    const errou = tocarEm(acertou, 0.02, 0.02, 300)
    expect(errou.sequencia).toBe(0)
    expect(errou.errosDeMira).toBe(1)
    expect(errou.acertos).toBe(1)
  })

  it('um alvo que expira zera a sequência e conta escape', () => {
    const p = comAlvo()
    const acertou = tocarEm(
      { ...p, alvos: [...p.alvos, { id: 2, x: 0.9, y: 0.9, raio: 0.05, nascidoEm: 0 }] },
      0.5, 0.5, 200,
    )
    expect(acertou.sequencia).toBe(1)
    // Passa da vida do alvo 2 sem ninguém tocar nele.
    const depois = avancar(acertou, VIDA_ALVO_MS + 50, false)
    expect(depois.escaparam).toBe(1)
    expect(depois.sequencia).toBe(0)
  })

  it('a melhor sequência guarda o pico mesmo depois de zerar', () => {
    let p = comAlvo()
    p = tocarEm(p, 0.5, 0.5, 100)
    p = { ...p, alvos: [{ id: 9, x: 0.5, y: 0.5, raio: 0.05, nascidoEm: 100 }] }
    p = tocarEm(p, 0.5, 0.5, 200)
    expect(p.sequencia).toBe(2)
    const errou = tocarEm(p, 0.02, 0.02, 300)
    expect(errou.sequencia).toBe(0)
    expect(errou.melhorSequencia).toBe(2)
  })

  it('o primeiro toque zera a sequência junto com o placar do fantasma', () => {
    const atrativo: Partida = {
      ...criarPartida(1, 0),
      acertos: 7, sequencia: 7, melhorSequencia: 7, errosDeMira: 2, escaparam: 3,
    }
    const primeiro = tocarEm(atrativo, 0.5, 0.5, 500)
    expect(primeiro.fase).toBe('jogando')
    expect(primeiro.sequencia).toBe(0)
    expect(primeiro.melhorSequencia).toBe(0)
    expect(primeiro.errosDeMira).toBe(0)
    expect(primeiro.escaparam).toBe(0)
  })

  it('reiniciar zera tudo', () => {
    const suja: Partida = {
      ...criarPartida(1, 0),
      acertos: 9, sequencia: 4, melhorSequencia: 9, errosDeMira: 5, escaparam: 6,
    }
    const nova = reiniciar(suja, 1_000)
    expect(nova.sequencia).toBe(0)
    expect(nova.melhorSequencia).toBe(0)
    expect(nova.errosDeMira).toBe(0)
    expect(nova.escaparam).toBe(0)
  })

  it('em modo atrativo nada do que o fantasma faz vira sequência', () => {
    // O fantasma acerta ao longo do modo atrativo; a sequência mostrada a
    // quem ainda não jogou tem de ficar em zero, senão o placar do
    // demo vira o placar de ninguém.
    const depois = simular(criarPartida(3, 0), 0, 400)
    expect(depois.fase).toBe('atrativo')
    expect(depois.sequencia).toBe(0)
    expect(depois.melhorSequencia).toBe(0)
  })
})
