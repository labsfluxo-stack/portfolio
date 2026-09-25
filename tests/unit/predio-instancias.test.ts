import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { Coletor } from '@/components/predio/predio-instancias'

/**
 * O DESCARTE SILENCIOSO DO COLETOR, medido — e este arquivo nasce depois de a
 * mesma armadilha morder DUAS vezes na mesma feature.
 *
 * O contrato está documentado em `predio-instancias.ts`: a geometria e o
 * material são os da PRIMEIRA chamada de cada chave, e toda chamada seguinte
 * usa só a matriz. É o preço de instanciar — uma `InstancedMesh` tem uma
 * geometria só. O problema nunca foi o contrato: foi ele ser SILENCIOSO.
 *
 * Primeira mordida: `predio-cidade.tsx` emitia geometrias de tamanhos
 * diferentes na mesma chave e saíram 23 prédios do tamanho do primeiro. O
 * sintoma não foi "prédios iguais" — a linha do topo continuava irregular
 * porque a POSIÇÃO variava — foi antena solta no céu. Custou três medições.
 *
 * Segunda mordida, achada só numa auditoria: onze chaves compartilhadas entre
 * as três faixas de profundidade recebiam `materiais[f]`, e só o da faixa 0
 * sobrevivia. Platibanda, testeira, pilar, aleta, montante, varanda, recuo,
 * antena, caixa d'água e ar-condicionado das faixas do fundo estavam pintados
 * com a cor da faixa da frente, sem a mistura com o céu que faz a perspectiva
 * atmosférica. A cidade lia como uma decalcomania só, e a causa estava a uma
 * linha de distância do comentário que avisava sobre ela.
 *
 * `conflitos` tira o descarte do silêncio. Não muda o contrato e não lança —
 * lançar em tempo de módulo derrubaria a página, que é a lição que
 * `predio-luz.ts` já aprendeu. Ele só CONTA, para que um teste possa perguntar.
 */
describe('Coletor', () => {
  const g1 = new THREE.BoxGeometry(1, 1, 1)
  const g2 = new THREE.BoxGeometry(2, 1, 1)
  const m1 = new THREE.MeshBasicMaterial({ color: '#ff0000' })
  const m2 = new THREE.MeshBasicMaterial({ color: '#0000ff' })

  it('não acusa nada quando a chave recebe sempre o mesmo par', () => {
    const c = new Coletor()
    c.poe('tijolo', g1, m1, [0, 0, 0])
    c.poe('tijolo', g1, m1, [1, 0, 0])
    c.poe('tijolo', g1, m1, [2, 0, 0], [0, 0, 0], [3, 3, 3])

    expect(c.conflitos).toEqual([])
    expect(c.copias).toBe(3)
    expect(c.chamadas).toBe(1)
  })

  it('acusa a chave que recebeu um MATERIAL diferente — a segunda mordida', () => {
    const c = new Coletor()
    c.poe('antena', g1, m1, [0, 0, 0])
    c.poe('antena', g1, m2, [1, 0, 0])

    expect(c.conflitos).toEqual(['antena (material)'])
    // E o contrato continua: uma malha só, com o material da PRIMEIRA chamada.
    const malhas = c.colhe()
    expect(malhas).toHaveLength(1)
    expect(malhas[0]!.material).toBe(m1)
  })

  it('acusa a chave que recebeu uma GEOMETRIA diferente — a primeira mordida', () => {
    const c = new Coletor()
    c.poe('predio', g1, m1, [0, 0, 0])
    c.poe('predio', g2, m1, [1, 0, 0])

    expect(c.conflitos).toEqual(['predio (geometria)'])
  })

  it('acusa os dois campos quando os dois divergem', () => {
    const c = new Coletor()
    c.poe('caixa', g1, m1, [0, 0, 0])
    c.poe('caixa', g2, m2, [1, 0, 0])

    expect(c.conflitos).toEqual(['caixa (geometria)', 'caixa (material)'])
  })

  it('não confunde chaves diferentes — é por chave que a separação existe', () => {
    const c = new Coletor()
    // Exatamente o remédio aplicado na cidade: uma chave por faixa. Materiais
    // diferentes deixam de colidir porque deixam de dividir a chave.
    c.poe('antena-0', g1, m1, [0, 0, 0])
    c.poe('antena-1', g1, m2, [1, 0, 0])

    expect(c.conflitos).toEqual([])
    expect(c.chamadas).toBe(2)
  })

  it('acusa uma vez só, por mais que a chave se repita', () => {
    const c = new Coletor()
    c.poe('ar', g1, m1, [0, 0, 0])
    for (let i = 0; i < 50; i++) c.poe('ar', g1, m2, [i, 0, 0])

    expect(c.conflitos).toEqual(['ar (material)'])
  })
})
