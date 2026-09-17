import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { ANCORA_DA_NORMAL, ANCORA_DO_VERTICE, comDetalhe } from '@/components/predio/predio-materiais'

/**
 * A INJEÇÃO DE SHADER É A ÚNICA COISA DESTA CENA QUE FALHA EM SILÊNCIO.
 *
 * ═══ E ESTE TESTE JÁ FALHOU UMA VEZ EM SER ESSE GUARDA ═══
 *
 * A primeira versão dele montava o shader de mentira a partir de
 * `ShaderChunk.normal_fragment_maps` — o chunk JÁ EXPANDIDO. Com isso ele
 * passava, e a injeção estava morta no navegador: o three chama
 * `onBeforeCompile` ANTES de resolver os `#include`, então o que chega lá é
 * `#include <normal_fragment_maps>` literal, e o alvo dentro do chunk não
 * existe ainda.
 *
 * Um teste que constrói a entrada errada verifica o código contra a própria
 * suposição de quem o escreveu. Agora ele usa `ShaderLib.physical`, que é
 * exatamente a string que o renderizador entrega.
 *
 * `onBeforeCompile` faz `String.replace` no shader que o three gera. Replace que
 * não encontra o alvo NÃO lança: devolve a string intacta, o material compila
 * normalmente e o detalhe simplesmente não existe. Nada no console, nada no
 * typecheck, nada no teste de cena — só um render que parece igual ao anterior.
 *
 * Todo o resto da feature é verificável por captura de tela. Isto não é: a
 * diferença entre "o microrrelevo está lá" e "o replace falhou" é sutil demais
 * para o olho num JPEG. Então ela vira teste.
 */
describe('detail mapping do microrrelevo', () => {
  /**
   * O PRIMEIRO TESTE É CONTRA O THREE, NÃO CONTRA O MEU CÓDIGO.
   *
   * Se uma atualização do three reescrever `normal_fragment_maps`, o âncora some
   * e a injeção vira silenciosa. Este teste quebra na atualização, que é
   * exatamente quando se quer saber.
   */
  it('os dois âncoras ainda existem no three', () => {
    expect(THREE.ShaderChunk.normal_fragment_maps).toContain(ANCORA_DA_NORMAL)
    // O do vértice é um `#include`, e ele tem de existir no shader do
    // `meshphysical` — é lá que `objectNormal` e `transformed` coexistem.
    expect(THREE.ShaderLib.physical.vertexShader).toContain(ANCORA_DO_VERTICE)
  })

  /**
   * A ORDEM NO VERTEX SHADER É UMA PRÉ-CONDIÇÃO SILENCIOSA.
   *
   * A injeção usa `objectNormal` no ponto de `project_vertex`. Isso só compila
   * porque `beginnormal_vertex` — que declara a variável — vem ANTES no shader
   * do `meshphysical`. Se uma atualização do three trocar a ordem, o shader deixa
   * de compilar em tempo de execução, num erro de WebGL que nenhum teste de DOM
   * pega. Aqui a pré-condição fica escrita e verificada.
   */
  it('beginnormal_vertex vem antes de project_vertex', () => {
    const vs = THREE.ShaderLib.physical.vertexShader
    expect(vs.indexOf('#include <beginnormal_vertex>')).toBeLessThan(vs.indexOf(ANCORA_DO_VERTICE))
  })

  it('a injeção acrescenta a amostragem do detalhe depois do âncora', () => {
    const material = new THREE.MeshStandardMaterial()
    const detalhe = new THREE.Texture()
    comDetalhe(material, detalhe, 18, 0.7)

    const shader = {
      uniforms: {} as Record<string, { value: unknown }>,
      vertexShader: '',
      fragmentShader: THREE.ShaderLib.physical.fragmentShader,
    }
    material.onBeforeCompile(shader as never, null as never)

    expect(shader.fragmentShader).toContain('uniform sampler2D mapaDeDetalhe;')
    // Três amostras: o triplanar. Uma só significaria que a projeção voltou a
    // ser por eixo fixo, e a textura estica em toda face perpendicular a ele.
    expect(shader.fragmentShader).toContain('texture2D( mapaDeDetalhe, pDet.zy )')
    expect(shader.fragmentShader).toContain('texture2D( mapaDeDetalhe, pDet.xz )')
    expect(shader.fragmentShader).toContain('texture2D( mapaDeDetalhe, pDet.xy )')
    // O detalhe entra DEPOIS do âncora: antes dele, `mapN` ainda não levou
    // `normalScale` e a mistura seria feita na escala errada.
    const iAncora = shader.fragmentShader.indexOf(ANCORA_DA_NORMAL)
    const iDetalhe = shader.fragmentShader.indexOf('pesoDetalhe')
    expect(iAncora).toBeGreaterThan(-1)
    expect(iDetalhe).toBeGreaterThan(iAncora)
  })

  /**
   * O VERTEX PRECISA LEVAR A MATRIZ DA INSTÂNCIA, e este é o erro que quase
   * escapou: `modelMatrix` NÃO contém a matriz da cópia numa `InstancedMesh`.
   * Sem `instanceMatrix`, as oitenta garrafas do bar teriam o microrrelevo
   * amostrado no MESMO ponto do mundo.
   */
  it('a posição de mundo leva a matriz da instância', () => {
    const material = comDetalhe(new THREE.MeshStandardMaterial(), new THREE.Texture(), 25, 0.5)
    const shader = {
      uniforms: {} as Record<string, { value: unknown }>,
      vertexShader: THREE.ShaderLib.physical.vertexShader,
      fragmentShader: THREE.ShaderLib.physical.fragmentShader,
    }
    material.onBeforeCompile(shader as never, null as never)
    expect(shader.vertexShader).toContain('varying vec3 vPosMundo;')
    expect(shader.vertexShader).toContain('#ifdef USE_INSTANCING')
    expect(shader.vertexShader).toContain('pDetalhe = instanceMatrix * pDetalhe;')
    expect(shader.vertexShader).toContain('mDetalhe = mDetalhe * mat3( instanceMatrix );')
  })

  it('os três uniformes chegam ao shader com os valores pedidos', () => {
    const material = new THREE.MeshStandardMaterial()
    const detalhe = new THREE.Texture()
    comDetalhe(material, detalhe, 22, 0.45)

    const shader = {
      uniforms: {} as Record<string, { value: unknown }>,
      vertexShader: '',
      fragmentShader: THREE.ShaderLib.physical.fragmentShader,
    }
    material.onBeforeCompile(shader as never, null as never)

    expect(shader.uniforms.mapaDeDetalhe!.value).toBe(detalhe)
    expect(shader.uniforms.escalaDoDetalhe!.value).toBe(22)
    expect(shader.uniforms.forcaDoDetalhe!.value).toBe(0.45)
  })

  /**
   * A CHAVE DE CACHE É O QUE IMPEDE UM MATERIAL DE HERDAR O SHADER DE OUTRO.
   *
   * O three indexa programas compilados por uma chave derivada dos parâmetros do
   * material, e `onBeforeCompile` não entra nela. Dois materiais iguais com
   * injeções diferentes receberiam o MESMO programa — o primeiro a compilar
   * ganharia, e o segundo sairia com a escala de detalhe do primeiro, em
   * silêncio.
   */
  it('materiais com escalas diferentes têm chaves de cache diferentes', () => {
    const a = comDetalhe(new THREE.MeshStandardMaterial(), new THREE.Texture(), 14, 0.5)
    const b = comDetalhe(new THREE.MeshStandardMaterial(), new THREE.Texture(), 26, 0.5)
    expect(a.customProgramCacheKey()).not.toBe(b.customProgramCacheKey())
  })
})
