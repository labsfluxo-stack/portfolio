import * as THREE from 'three'

/**
 * Coletor de instancias — a fundacao que faltava para o andar carregar.
 *
 * O PROBLEMA MEDIDO: a versao declarativa criava uma malha por peca. Com 64
 * racks, 42U e tres furos por U em dois montantes, so a furacao dava 16.128
 * malhas — e a pagina parou de carregar, nao desacelerou: deu tempo esgotado.
 *
 * O CUSTO REAL nao e o triangulo, e a CHAMADA DE DESENHO. Cada malha e uma
 * conversa separada com a GPU: troca de estado, envio de matriz, desenha. Mil
 * caixas em mil malhas e mil conversas; mil caixas numa malha instanciada e
 * UMA conversa com mil matrizes. O triangulo e o mesmo — o que muda e quantas
 * vezes a CPU interrompe a GPU para falar.
 *
 * Este coletor inverte a construcao: em vez de componentes que renderizam a si
 * mesmos, o andar ACUMULA (geometria, material, matriz) e no fim emite uma
 * `InstancedMesh` por par geometria+material.
 *
 * O QUE NAO SE PERDE: nada de detalhe. A instancia carrega matriz completa —
 * posicao, rotacao e escala por copia — entao rack torto, porta aberta em
 * angulo diferente e equipamento em altura variada continuam possiveis. O que
 * a instancia NAO carrega e material por copia; por isso a variacao de cor
 * entre racks passa a ser feita por `instanceColor`, e o piscar dos LEDs por
 * UMA INSTANCIA POR FASE em vez de uma por LED.
 */

export type Grupo = {
  geometria: THREE.BufferGeometry
  material: THREE.Material
  matrizes: THREE.Matrix4[]
  cores?: THREE.Color[]
}

export class Coletor {
  private grupos = new Map<string, Grupo>()
  private aux = new THREE.Matrix4()
  private q = new THREE.Quaternion()
  private e = new THREE.Euler()
  private v = new THREE.Vector3()
  private s = new THREE.Vector3(1, 1, 1)

  /**
   * Acrescenta uma copia. `chave` identifica o par geometria+material — duas
   * chamadas com a mesma chave viram a mesma `InstancedMesh`.
   */
  poe(
    chave: string,
    geometria: THREE.BufferGeometry,
    material: THREE.Material,
    posicao: [number, number, number],
    rotacao: [number, number, number] = [0, 0, 0],
    escala: [number, number, number] = [1, 1, 1],
    cor?: THREE.Color,
  ) {
    let g = this.grupos.get(chave)
    if (!g) {
      g = { geometria, material, matrizes: [], cores: cor ? [] : undefined }
      this.grupos.set(chave, g)
    }
    this.v.set(posicao[0], posicao[1], posicao[2])
    this.e.set(rotacao[0], rotacao[1], rotacao[2])
    this.q.setFromEuler(this.e)
    this.s.set(escala[0], escala[1], escala[2])
    this.aux.compose(this.v, this.q, this.s)
    g.matrizes.push(this.aux.clone())
    if (cor && g.cores) g.cores.push(cor.clone())
  }

  /**
   * Fecha a coleta e devolve as malhas prontas.
   *
   * `setMatrixAt` por instancia e uma escrita em buffer, nao um objeto da cena —
   * e por isso que dezesseis mil copias custam o que antes custavam algumas
   * dezenas de malhas.
   */
  colhe(): THREE.InstancedMesh[] {
    const saida: THREE.InstancedMesh[] = []
    for (const [chave, g] of this.grupos) {
      const malha = new THREE.InstancedMesh(g.geometria, g.material, g.matrizes.length)
      malha.name = chave
      for (let i = 0; i < g.matrizes.length; i++) malha.setMatrixAt(i, g.matrizes[i]!)
      if (g.cores) {
        for (let i = 0; i < g.cores.length; i++) malha.setColorAt(i, g.cores[i]!)
        if (malha.instanceColor) malha.instanceColor.needsUpdate = true
      }
      malha.instanceMatrix.needsUpdate = true
      // A cena e estatica em geometria: so a cor dos LEDs muda, e ela muda no
      // material compartilhado, nunca na matriz. Marcar como estatica evita
      // reenvio de buffer a cada quadro.
      malha.instanceMatrix.setUsage(THREE.StaticDrawUsage)
      malha.castShadow = true
      malha.receiveShadow = true
      malha.frustumCulled = false
      saida.push(malha)
    }
    return saida
  }

  get chamadas() {
    return this.grupos.size
  }

  get copias() {
    let n = 0
    for (const g of this.grupos.values()) n += g.matrizes.length
    return n
  }
}
