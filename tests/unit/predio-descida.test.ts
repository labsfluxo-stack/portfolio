import { describe, expect, it } from 'vitest'
import { TAXA_DE_AMORTECIMENTO, amortecer, quadroDe } from '@/components/predio/predio-descida'
import { ANDARES } from '@/components/predio/predio-programa'
import { PLANOS, centroDoAndar } from '@/components/predio/predio-arquitetura'

describe('descida', () => {
  it('progresso 0 põe a câmera na cobertura', () => {
    const q = quadroDe(0)
    expect(q.andar).toBe(0)
    expect(q.pose.y).toBeCloseTo(centroDoAndar(0), 3)
  })

  it('progresso 1 põe a câmera na recepção', () => {
    const q = quadroDe(1)
    expect(q.andar).toBe(ANDARES.length - 1)
    expect(q.pose.y).toBeCloseTo(centroDoAndar(ANDARES.length - 1), 3)
  })

  it('a câmera só desce, nunca sobe', () => {
    let anterior = Infinity
    for (let p = 0; p <= 1; p += 0.01) {
      const y = quadroDe(p).pose.y
      expect(y).toBeLessThanOrEqual(anterior + 1e-9)
      anterior = y
    }
  })

  /**
   * O andar ativo não pode piscar. Enquanto a estação era escolhida por
   * arredondamento simples, o índice oscilava entre dois valores na fronteira e
   * o rótulo tremia — defeito visível justamente na parada, que é onde o
   * visitante está lendo.
   */
  it('o andar ativo nunca anda para trás', () => {
    let anterior = -1
    for (let p = 0; p <= 1; p += 0.005) {
      const atual = quadroDe(p).andar
      expect(atual).toBeGreaterThanOrEqual(anterior)
      anterior = atual
    }
  })

  it('todos os sete andares são visitados ao longo da descida', () => {
    const vistos = new Set<number>()
    for (let p = 0; p <= 1; p += 0.002) vistos.add(quadroDe(p).andar)
    expect(vistos.size).toBe(ANDARES.length)
  })

  it('a estação vai de 0 a 1 dentro do andar', () => {
    for (let p = 0; p <= 1; p += 0.01) {
      const { estacao } = quadroDe(p)
      expect(estacao).toBeGreaterThanOrEqual(0)
      expect(estacao).toBeLessThanOrEqual(1)
    }
  })

  it('há um plano por camada de profundidade', () => {
    expect(quadroDe(0.5).planos).toHaveLength(PLANOS.length)
  })

  /**
   * O fundo tem que ficar PARA TRÁS da frente conforme se desce. Se os
   * deslocamentos empatam, os três planos viraram um só e o parallax não existe.
   */
  it('o plano do fundo desloca menos que o da frente', () => {
    const { planos } = quadroDe(0.5)
    expect(Math.abs(planos[0]!)).toBeLessThan(Math.abs(planos[2]!))
  })

  it('fora da faixa, o progresso é aparado em vez de estourar', () => {
    expect(quadroDe(-3).andar).toBe(0)
    expect(quadroDe(9).andar).toBe(ANDARES.length - 1)
  })

  /**
   * O rótulo do andar e a altura da câmera têm que contar a MESMA história.
   * Uma versão anterior derivava `andar` de uma fatia de progresso paralela
   * (1/7 do scroll por andar) à conta que gera `pose.y` (que interpola entre
   * 6 centros) — dois relógios em vez de um. O rótulo sempre chegava ANTES da
   * câmera: pior caso, a recepção, cujo rótulo já dizia "chegou" em
   * progresso ≈ 0,857, com a câmera ainda a quase um andar inteiro de
   * distância do centro real. Nenhum dos outros 13 testes olha a relação
   * entre `andar` e `pose.y` — só este.
   *
   * `toBeLessThanOrEqual`, não `toBeLessThan`: nos pontos exatos onde a
   * câmera está EXATAMENTE no meio do caminho entre dois centros, os dois
   * andares estão igualmente perto — não existe "mais perto" nesse instante
   * único, é o próprio limite entre as duas fatias. Isso é diferente do
   * teste de parallax (dois fatores sempre distintos por construção): aqui é
   * geometria de vizinho-mais-próximo, que empata exatamente na fronteira.
   */
  it('a câmera está sempre mais perto (ou empatada) do centro do seu andar do que do centro de qualquer outro', () => {
    for (let p = 0; p <= 1; p += 0.001) {
      const { andar, pose } = quadroDe(p)
      const distanciaDoProprio = Math.abs(pose.y - centroDoAndar(andar))
      for (let outro = 0; outro < ANDARES.length; outro++) {
        if (outro === andar) continue
        const distanciaDoOutro = Math.abs(pose.y - centroDoAndar(outro))
        expect(distanciaDoProprio).toBeLessThanOrEqual(distanciaDoOutro)
      }
    }
  })
})

describe('amortecimento', () => {
  it('aproxima do alvo sem ultrapassar', () => {
    const y = amortecer(0, 10, 1 / 60)
    expect(y).toBeGreaterThan(0)
    expect(y).toBeLessThan(10)
  })

  it('já no alvo, fica no alvo', () => {
    expect(amortecer(5, 5, 1 / 60)).toBeCloseTo(5, 9)
  })

  /**
   * INDEPENDENTE DA TAXA DE QUADROS, e isto não é preciosismo: com o clássico
   * `atual += (alvo - atual) * 0.1`, a mesma rolagem chega mais devagar num
   * monitor de 60 Hz do que num de 144 Hz. O site fica com "peso" diferente por
   * máquina — que é a definição de movimento não confiável.
   */
  it('o mesmo tempo total dá o mesmo resultado, em qualquer taxa de quadros', () => {
    let a60 = 0
    for (let i = 0; i < 60; i++) a60 = amortecer(a60, 10, 1 / 60)
    let a144 = 0
    for (let i = 0; i < 144; i++) a144 = amortecer(a144, 10, 1 / 144)
    expect(a60).toBeCloseTo(a144, 4)
  })

  it('a taxa é positiva', () => {
    expect(TAXA_DE_AMORTECIMENTO).toBeGreaterThan(0)
  })
})

/**
 * A CÂMERA AVANÇA NA PARADA — decisão do dono em 2026-09-14, depois de ver o
 * datacenter integrado e cada rack sair com oito pixels de largura.
 *
 * O conflito é de formato: o andar tem 3,2 m de pé-direito por 30 de largura, e
 * para mostrar o corte inteiro a câmera precisa ficar longe — distância em que
 * todo detalhe vira textura. As duas leituras não cabem numa distância fixa.
 *
 * A saída é a distância deixar de ser fixa: longe entre andares, para o prédio
 * ler como corte; perto quando a descida assenta num andar, para o conteúdo ler
 * como ambiente. A curva `PARADA` que já desacelera a descida é o gancho —
 * onde ela segura, a câmera chega.
 */
describe('avanço da câmera na parada', () => {
  it('a câmera fica mais perto no centro do andar do que entre andares', () => {
    const ultimo = ANDARES.length - 1
    // Centro do andar 3: progresso que põe `suave` exatamente em 3.
    const noCentro = quadroDe(3 / ultimo)
    // Fronteira entre 3 e 4.
    const naFronteira = quadroDe(3.5 / ultimo)
    expect(noCentro.pose.z).toBeLessThan(naFronteira.pose.z)
  })

  it('o avanço é simétrico: entrar e sair do andar afastam igual', () => {
    const ultimo = ANDARES.length - 1
    const antes = quadroDe(2.75 / ultimo)
    const depois = quadroDe(3.25 / ultimo)
    expect(antes.pose.z).toBeCloseTo(depois.pose.z, 3)
  })

  it('a distância nunca sai da faixa útil', () => {
    for (let p = 0; p <= 1; p += 0.005) {
      const { pose } = quadroDe(p)
      expect(pose.z).toBeGreaterThan(3)
      expect(pose.z).toBeLessThanOrEqual(11.5)
    }
  })

  it('todos os andares recebem o avanço, não só os do meio', () => {
    const ultimo = ANDARES.length - 1
    for (let a = 0; a <= ultimo; a++) {
      const centro = quadroDe(a / ultimo)
      expect(centro.pose.z).toBeLessThan(11.5)
    }
  })
})
