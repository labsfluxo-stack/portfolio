import { describe, expect, it } from 'vitest'
import {
  ALTURA_ANDAR,
  LAJE,
  PE_DIREITO,
  MEIA_LARGURA_UTIL,
  PLANOS,
  SOL,
  alturaTotal,
  centroDoAndar,
  topoDoAndar,
} from '@/components/predio/predio-arquitetura'
import { ANDARES } from '@/components/predio/predio-programa'

describe('arquitetura do prédio', () => {
  it('o andar é o pé-direito mais a laje', () => {
    expect(ALTURA_ANDAR).toBeCloseTo(PE_DIREITO + LAJE, 5)
  })

  it('a altura total cobre os sete andares', () => {
    expect(alturaTotal()).toBeCloseTo(ALTURA_ANDAR * ANDARES.length, 5)
  })

  it('o topo do andar zero é o topo do prédio, e desce dali', () => {
    expect(topoDoAndar(0)).toBeCloseTo(0, 5)
    expect(topoDoAndar(1)).toBeCloseTo(-ALTURA_ANDAR, 5)
    expect(topoDoAndar(6)).toBeCloseTo(-ALTURA_ANDAR * 6, 5)
  })

  it('o centro fica meio pé-direito abaixo do topo do andar', () => {
    expect(centroDoAndar(0)).toBeCloseTo(-PE_DIREITO / 2, 5)
  })

  /**
   * Os três planos são o que faz a profundidade existir sem custo de geometria.
   * O de trás precisa andar MENOS que o da frente — é essa diferença, e só ela,
   * que o cérebro lê como distância. Fatores iguais seriam três cópias do mesmo
   * plano com passos extras de desenho.
   */
  it('os planos vão do fundo para a frente, com parallax crescente', () => {
    expect(PLANOS).toHaveLength(3)
    const fatores = PLANOS.map((p) => p.parallax)
    expect(fatores).toEqual([...fatores].sort((a, b) => a - b))
    expect(PLANOS[2]!.parallax).toBe(1)
    expect(PLANOS[0]!.parallax).toBeGreaterThan(0)
  })

  it('o plano da frente é o z zero — é nele que o objeto clicável mora', () => {
    expect(PLANOS[2]!.z).toBe(0)
    expect(PLANOS[0]!.z).toBeLessThan(PLANOS[1]!.z)
  })

  /**
   * O SOL MUDOU DE 8,5° PARA 24°, E ESTE TESTE MUDOU JUNTO — de propósito, e a
   * razão fica escrita, porque teste afrouxado sem explicação é pior que teste
   * nenhum.
   *
   * A regra antiga era `elevacao < 18`, e o comentário dela dizia que elevação
   * alta anula a sombra lateral e colapsa os três planos de parallax. Era
   * verdade enquanto o prédio era relevo raso: a sombra longa ERA a
   * profundidade. Deixou de ser quando os andares ganharam conteúdo
   * tridimensional, e aí o mesmo número virou o problema oposto. Medido: a 8,5°
   * a sombra sai 6,7 vezes a altura do objeto, então o pergolado de 2,63 m
   * projetava 17,6 m e caía a 20 m à esquerda do deck. A cena tinha sol e
   * nenhuma sombra visível.
   *
   * O que se guarda agora não é o ÂNGULO: é a CONSEQUÊNCIA dele, que é o que
   * importava desde o começo.
   */
  it('a sombra é de fim de tarde: longa, mas cai dentro da laje', () => {
    const comprimentoPorAltura = 1 / Math.tan((SOL.elevacao * Math.PI) / 180)
    // Abaixo de 1,5 é sol alto: sombra curta embaixo do objeto, luz de meio-dia.
    expect(comprimentoPorAltura).toBeGreaterThan(1.5)
    // Acima de 3, a sombra de qualquer coisa com mais de 2 m sai da laje de 13 m
    // de profundidade e não é vista por ninguém.
    expect(comprimentoPorAltura).toBeLessThan(3)
  })

  /**
   * O SOL PRECISA APARECER NO QUADRO, e esta é uma restrição de azimute que não
   * existia antes: a versão anterior tinha o disco fora da tela e só a cauda do
   * brilho entrava.
   *
   * A câmera olha ao longo de −z, então o sol tem de estar do lado de lá do
   * prédio (componente z NEGATIVA) e dentro do cone da lente. A meia-abertura
   * horizontal medida na descida é 46,9°; 40° deixa margem para a lente apertar
   * em tela mais estreita sem o disco escapar pela borda.
   */
  it('o sol fica atrás do prédio e dentro do cone da lente', () => {
    const rad = (SOL.azimute * Math.PI) / 180
    const z = Math.cos(rad)
    expect(z).toBeLessThan(0)
    const anguloDoEixoDaCamera = (Math.atan2(Math.abs(Math.sin(rad)), -z) * 180) / Math.PI
    expect(anguloDoEixoDaCamera).toBeLessThan(40)
  })

  /**
   * ERA UM TESTE SOBRE PILARES, e os pilares saíram da cena a pedido do dono.
   *
   * O teste morreu junto, e é o desfecho certo: guardar a posição de um objeto
   * que não é mais desenhado seria uma asserção que passa para sempre sem
   * proteger nada — pior que nenhum teste, porque parece cobertura.
   *
   * O que sobrevive é a outra metade da constante, que nunca teve a ver com
   * pilar: o VÃO ÚTIL, o limite lateral dentro do qual o objeto clicável pode
   * morar. Quem mede isso é `predio-scene.test.tsx`; aqui fica só a sanidade do
   * número contra a largura do prédio.
   */
  it('o vão útil cabe dentro da largura do prédio', () => {
    expect(MEIA_LARGURA_UTIL).toBeGreaterThan(0)
    // A laje tem meia-largura 15: o vão dos objetos tem de ficar bem dentro dela.
    expect(MEIA_LARGURA_UTIL).toBeLessThan(15)
  })
})
