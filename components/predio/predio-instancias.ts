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
  /**
   * As chaves que receberam geometria ou material diferentes do da primeira
   * chamada — ou seja, os descartes que o `poe` faz em silencio.
   *
   * `Set` e nao contador: a chave que erra uma vez erra em todas as copias
   * seguintes, e 300 avisos iguais nao dizem mais que um. Ver `conflitos`.
   */
  private descartes = new Set<string>()
  private aux = new THREE.Matrix4()
  private q = new THREE.Quaternion()
  private e = new THREE.Euler()
  private v = new THREE.Vector3()
  private s = new THREE.Vector3(1, 1, 1)

  /**
   * Acrescenta uma copia. `chave` identifica o par geometria+material — duas
   * chamadas com a mesma chave viram a mesma `InstancedMesh`.
   *
   * ARMADILHA, e ela ja mordeu uma vez: a geometria e o material sao os da
   * PRIMEIRA chamada de cada chave. Toda chamada seguinte com a mesma chave usa
   * so a matriz e DESCARTA em silencio a geometria que voce passou. E o preco de
   * instanciar — uma `InstancedMesh` tem uma geometria so.
   *
   * Em `predio-cidade.tsx` isso produziu 23 predios do tamanho do primeiro, e o
   * sintoma nao foi "predios iguais" (a linha do topo continuava irregular
   * porque a POSICAO variava): foi antena solta no ceu, porque o mastro era
   * colocado pela altura pretendida e o predio terminava na altura herdada.
   * Custou tres medicoes.
   *
   * Entao: geometria que VARIA vira escala na matriz sobre uma forma unitaria
   * (`BoxGeometry(1,1,1)` escalada), nunca uma geometria nova por copia. Se a
   * forma for mesmo diferente — e nao so de outro tamanho —, ela merece chave
   * propria, como `face-${tipo}-${altura}` em `predio-datacenter.tsx`.
   *
   * ═══ SEGUNDA ARMADILHA: A ORDEM DO EULER ═══
   *
   * `rotacao` e lido na ordem padrao do three, 'XYZ', que compoe a matriz como
   * Rx · Ry · Rz. Lendo da direita para a esquerda, isso quer dizer que o giro
   * em Y acontece PRIMEIRO e a inclinacao em X e aplicada depois, EM TORNO DO
   * EIXO X DO MUNDO — nao do eixo da peca ja girada.
   *
   * Para qualquer peca que so gire em Y (a esmagadora maioria) isso e
   * indiferente. Para uma peca GIRADA E INCLINADA ao mesmo tempo, nao e: ela
   * inclina numa direcao que nao e a dela. O encosto da espreguicadeira
   * reclinava ao longo do eixo Z do mundo enquanto o assento apontava 0,2 rad
   * para o lado — e o dono descreveu exatamente isso, "desalinhada", depois de
   * eu ja ter consertado o vao e a estrutura sem achar este.
   *
   * `ordem` resolve: com 'YXZ' a matriz vira Ry · Rx · Rz, o giro entra por
   * ultimo no mundo e a inclinacao passa a ser no eixo local. Quem inclinar
   * uma peca girada deve passar 'YXZ'.
   */
  poe(
    chave: string,
    geometria: THREE.BufferGeometry,
    material: THREE.Material,
    posicao: [number, number, number],
    rotacao: [number, number, number] = [0, 0, 0],
    escala: [number, number, number] = [1, 1, 1],
    cor?: THREE.Color,
    ordem: THREE.EulerOrder = 'XYZ',
  ) {
    let g = this.grupos.get(chave)
    if (!g) {
      g = { geometria, material, matrizes: [], cores: cor ? [] : undefined }
      this.grupos.set(chave, g)
    } else {
      // O DESCARTE DEIXA DE SER SILENCIOSO. Duas comparacoes de identidade por
      // copia — nao ha custo mensuravel nisso, e e o unico jeito de a segunda
      // ocorrencia da armadilha nao esperar por uma auditoria. Ver `conflitos`.
      if (g.geometria !== geometria) this.descartes.add(`${chave} (geometria)`)
      if (g.material !== material) this.descartes.add(`${chave} (material)`)
    }
    this.v.set(posicao[0], posicao[1], posicao[2])
    this.e.set(rotacao[0], rotacao[1], rotacao[2], ordem)
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

  /**
   * O QUE O `poe` DESCARTOU, em ordem, para um teste poder perguntar.
   *
   * Nao lanca e nao avisa no console. Lancar em tempo de modulo derruba a
   * pagina no dia em que alguem reusar uma chave por engano — a licao que
   * `predio-luz.ts` ja pagou e escreveu. Aqui o mesmo descompasso custa um
   * teste vermelho, que e o troco certo.
   *
   * Uma lista vazia NAO quer dizer que a cena esta correta: quer dizer que
   * nenhuma chave recebeu duas geometrias ou dois materiais. E exatamente a
   * pergunta que ninguem fez durante os dois bugs que este getter existe para
   * pegar.
   */
  get conflitos(): string[] {
    return [...this.descartes].sort()
  }
}
