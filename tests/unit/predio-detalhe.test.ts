import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  ANCORA_DA_NORMAL,
  ANCORA_DO_VERTICE,
  comDetalhe,
  comOndulacao,
} from '@/components/predio/predio-materiais'

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

/**
 * A ONDULAÇÃO DA LÂMINA usa o MESMO âncora e corre exatamente o mesmo risco.
 *
 * Vale repetir por que isto não é teste redundante com o de cima: as duas
 * injeções são independentes, e a de água tem um modo de falha a mais. Ela
 * SOBRESCREVE `mapN` em vez de somar a ele — se o replace não achar o alvo, a
 * lâmina não fica sem ondulação, ela fica com o mapa de normal PARADO, que é
 * visualmente muito parecido com ondulação lenta num JPEG. Um defeito que se
 * disfarça de funcionamento é justamente o que precisa de teste.
 */
describe('ondulacao da lamina', () => {
  it('a injeção troca mapN pelos dois trens de onda', () => {
    const material = comOndulacao(new THREE.MeshStandardMaterial(), { value: 0 }, 3.2, 1.35)
    const shader = {
      uniforms: {} as Record<string, { value: unknown }>,
      vertexShader: THREE.ShaderLib.physical.vertexShader,
      fragmentShader: THREE.ShaderLib.physical.fragmentShader,
    }
    material.onBeforeCompile(shader as never, null as never)

    expect(shader.fragmentShader).toContain('uniform float relogioDaAgua;')
    // DUAS amostras. Uma só significaria que a ondulação voltou a ser uma
    // textura transladando, que é o artefato que esta função existe para não
    // ter: a piscina inteira deslizando para o lado.
    expect(shader.fragmentShader).toContain('texture2D( normalMap, uvA )')
    expect(shader.fragmentShader).toContain('texture2D( normalMap, uvB )')
    // As duas escalas têm de ser incomensuráveis, senão o padrão combinado
    // fecha um período e a repetição aparece.
    expect(shader.fragmentShader).toContain('baseOnda * 1.7')
    // E o resultado SUBSTITUI `mapN` — somar deixaria um relevo fixo por baixo
    // da ondulação, uma marca d'água parada dentro de água que se mexe.
    const i = shader.fragmentShader.indexOf(ANCORA_DA_NORMAL)
    expect(i).toBeGreaterThan(-1)
    expect(shader.fragmentShader.indexOf('mapN = vec3( ondaN.xy')).toBeGreaterThan(i)
  })

  it('o relógio chega ao shader POR REFERÊNCIA', () => {
    /**
     * É o contrato inteiro da animação: o laço de quadro escreve num objeto e o
     * uniforme tem de ser esse MESMO objeto. Copiar o valor na montagem faria a
     * água compilar, aparecer e nunca se mexer — e ninguém olha o console por
     * causa disso.
     */
    const relogio = { value: 0 }
    const material = comOndulacao(new THREE.MeshStandardMaterial(), relogio, 3.2, 1.35)
    const shader = {
      uniforms: {} as Record<string, { value: unknown }>,
      vertexShader: '',
      fragmentShader: THREE.ShaderLib.physical.fragmentShader,
    }
    material.onBeforeCompile(shader as never, null as never)
    relogio.value = 7.5
    expect(shader.uniforms.relogioDaAgua!.value).toBe(7.5)
    expect(shader.uniforms.escalaDaOnda!.value).toBe(3.2)
    expect(shader.uniforms.forcaDaOnda!.value).toBe(1.35)
  })
})
