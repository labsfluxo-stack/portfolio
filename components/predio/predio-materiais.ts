import * as THREE from 'three'

/**
 * AS SUPERFÍCIES DA COBERTURA — desenhadas, com relevo.
 *
 * O QUE FALTAVA, e é o mesmo diagnóstico para todos os objetos: cor chapada. Uma
 * caixa marrom é uma caixa marrom, não uma tábua; um bloco cinza é um bloco
 * cinza, não concreto. O olho reconhece material por três coisas, e a cena não
 * tinha nenhuma das três:
 *
 * 1. VARIAÇÃO DE COR em escala pequena. Nenhuma superfície real é de um tom só.
 * 2. RELEVO. Grão de madeira, poro de concreto e trama de tecido são
 *    micro-geometria. Sem mapa de normal a luz varre a superfície sem encontrar
 *    nada, e o resultado é a leitura de plástico — plástico é justamente o
 *    material que não tem relevo.
 * 3. RUGOSIDADE DESIGUAL. O reflexo especular quebrando em manchas é o que
 *    separa "superfície" de "cor". Rugosidade constante dá brilho uniforme, que
 *    só existe em coisa moldada.
 *
 * Tudo aqui é CANVAS, nada baixado. O motivo é o mesmo de `predio-ceu.ts`: este
 * site é exportação estática com orçamento de Lighthouse, e um conjunto de mapas
 * PBR fotográficos custa megabytes. Textura desenhada custa alguns
 * quilobytes de código e nasce coerente com a direção de arte.
 *
 * O MAPA DE NORMAL SAI DA ALTURA, por Sobel. Desenha-se um campo de altura em
 * cinza, mede-se a inclinação em x e y a cada pixel e escreve-se a inclinação
 * como cor. É a forma clássica, e a vantagem sobre desenhar a normal à mão é que
 * o relevo fica automaticamente coerente com o que se vê no mapa de cor: os dois
 * saem do mesmo desenho.
 */

function tela(n: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const cv = document.createElement('canvas')
  cv.width = cv.height = n
  return [cv, cv.getContext('2d')!]
}

/** Ruído determinístico — a cena tem de nascer igual a cada carregamento. */
function ruido(i: number, k: number): number {
  const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453
  return s - Math.floor(s)
}

/**
 * FILTRAGEM ANISOTRÓPICA — e esta é a maior perda de qualidade da cena.
 *
 * O deck é visto quase de raspão: a câmera está 1,6 m acima dele e olha na
 * horizontal, então o ângulo de incidência na régua é de poucos graus. Nessa
 * situação, um texel cobre MUITOS pixels na direção da fuga e quase nenhum na
 * transversal — e o mipmap, que é isotrópico, só sabe escolher um nível para as
 * duas direções. Ele escolhe o borrado, porque é o que evita cintilação. O
 * resultado é grão de madeira virando papa cinzenta a três metros de distância.
 *
 * A filtragem anisotrópica amostra ao longo da direção esticada em vez de
 * escolher um nível só. É a única técnica que recupera detalhe em superfície
 * rasante, e é praticamente de graça em hardware moderno.
 *
 * 8 e não 16: o ganho de 8 para 16 é quase imperceptível e o custo de banda
 * dobra. O three limita ao máximo do aparelho sozinho, então este número é um
 * TETO pedido, nunca uma exigência — em celular que só faz 2, ele faz 2.
 */
const ANISOTROPIA = 8

function acaba(cv: HTMLCanvasElement, repeteU: number, repeteV: number, srgb: boolean) {
  const t = new THREE.CanvasTexture(cv)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(repeteU, repeteV)
  t.anisotropy = ANISOTROPIA
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  return t
}

/**
 * Campo de altura → mapa de normal, por Sobel.
 *
 * `forca` multiplica a inclinação. Valor alto exagera o relevo e a superfície
 * fica com cara de plástico injetado — o erro oposto ao de não ter relevo
 * nenhum. Grão de madeira vive perto de 1,5; poro de concreto, de 2,5.
 */
function normalDaAltura(fonte: HTMLCanvasElement, forca: number, repeteU: number, repeteV: number) {
  const n = fonte.width
  const src = fonte.getContext('2d')!.getImageData(0, 0, n, n).data
  const [cv, ctx] = tela(n)
  const saida = ctx.createImageData(n, n)
  const h = (x: number, y: number) => src[(((y + n) % n) * n + ((x + n) % n)) * 4]! / 255
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      // Sobel: a diferença entre os vizinhos dá a inclinação local.
      const dx =
        h(x - 1, y - 1) + 2 * h(x - 1, y) + h(x - 1, y + 1) -
        (h(x + 1, y - 1) + 2 * h(x + 1, y) + h(x + 1, y + 1))
      const dy =
        h(x - 1, y - 1) + 2 * h(x, y - 1) + h(x + 1, y - 1) -
        (h(x - 1, y + 1) + 2 * h(x, y + 1) + h(x + 1, y + 1))
      const vx = dx * forca
      const vy = dy * forca
      const inv = 1 / Math.sqrt(vx * vx + vy * vy + 1)
      const i = (y * n + x) * 4
      saida.data[i] = (vx * inv * 0.5 + 0.5) * 255
      saida.data[i + 1] = (vy * inv * 0.5 + 0.5) * 255
      saida.data[i + 2] = (inv * 0.5 + 0.5) * 255
      saida.data[i + 3] = 255
    }
  }
  ctx.putImageData(saida, 0, 0)
  // Mapa de normal NUNCA em sRGB: os canais são um vetor, não uma cor. Marcar
  // como sRGB aplica a curva de gama a uma direção e torce o relevo inteiro.
  return acaba(cv, repeteU, repeteV, false)
}

/**
 * ═══ MICRORRELEVO — a segunda escala de detalhe ═══
 *
 * O DIAGNÓSTICO. Todas as superfícies desta cena têm UMA escala de detalhe. A
 * régua de deck tem grão, o concreto tem poro, a pedra tem mancha — e cada uma
 * dessas coisas tem um tamanho só. Isso funciona na distância em que o texel
 * corresponde ao pixel e desmancha nas duas pontas: de longe vira papa (o mipmap
 * resolve), e de PERTO vira superfície lisa entre um traço e outro, porque não
 * há nada acontecendo na escala do milímetro.
 *
 * Material de verdade tem no mínimo duas escalas. O deck tem o veio (centímetros)
 * E a fibra levantada (décimos de milímetro). O concreto tem a mancha (decímetros)
 * E o poro fino (milímetros). O olho usa a escala GRANDE para identificar o
 * material e a PEQUENA para acreditar nele.
 *
 * A saída não é aumentar a resolução do mapa base: para o deck ter microrrelevo
 * na régua inteira, o canvas precisaria de uns 4096², e são doze mapas destes na
 * cena. O que a indústria faz há vinte anos é DETAIL MAPPING — um segundo mapa,
 * pequeno e compartilhado por todos os materiais, ladrilhado dezenas de vezes
 * mais denso e SOMADO ao relevo base dentro do shader.
 *
 * Um mapa de 512² para a cena inteira, e ele nunca repete visivelmente porque a
 * frequência dele está abaixo do que o olho consegue seguir como padrão.
 *
 * O QUE ELE TEM, e os três são necessários:
 *  - GRÃO: milhares de pontos minúsculos. É o que tira o "plástico" de qualquer
 *    superfície fosca.
 *  - RISCO: traços finos em ângulos variados. Toda superfície que alguém tocou
 *    tem risco, e é o detalhe que separa material USADO de material renderizado.
 *  - PORO: poucas depressões maiores. São o que quebra a uniformidade do grão,
 *    que sozinho lê como ruído de TV.
 */
export function microrrelevo(): THREE.Texture {
  const n = 512
  const [alt, h] = tela(n)
  h.fillStyle = '#808080'
  h.fillRect(0, 0, n, n)

  // GRÃO. Cada ponto é claro ou escuro em torno do cinza médio: o campo de
  // altura oscila para os dois lados, e é a oscilação — não o valor — que o
  // Sobel transforma em relevo.
  for (let i = 0; i < 2600; i++) {
    const x = ruido(i, 301) * n
    const y = ruido(i, 302) * n
    const r = 1.4 + ruido(i, 303) * 3.2
    const v = ruido(i, 304)
    h.fillStyle = v > 0.5 ? `rgba(255,255,255,${(v - 0.5) * 0.5})` : `rgba(0,0,0,${(0.5 - v) * 0.5})`
    h.beginPath()
    h.arc(x, y, r, 0, Math.PI * 2)
    h.fill()
  }

  // RISCO. Curtos, finos e em qualquer ângulo — risco todo na mesma direção lê
  // como escovado, que é outro material.
  h.lineCap = 'round'
  for (let i = 0; i < 260; i++) {
    const x = ruido(i, 305) * n
    const y = ruido(i, 306) * n
    const a = ruido(i, 307) * Math.PI * 2
    const comp = 14 + ruido(i, 308) * 62
    const claro = ruido(i, 309) > 0.45
    h.strokeStyle = claro ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.26)'
    h.lineWidth = 1.4 + ruido(i, 310) * 2.2
    h.beginPath()
    h.moveTo(x, y)
    h.lineTo(x + Math.cos(a) * comp, y + Math.sin(a) * comp)
    h.stroke()
  }

  // PORO. Depressões macias, para o grão não virar chuvisco uniforme.
  for (let i = 0; i < 90; i++) {
    const x = ruido(i, 311) * n
    const y = ruido(i, 312) * n
    const r = 7 + ruido(i, 313) * 18
    const g = h.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, 'rgba(0,0,0,0.36)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    h.fillStyle = g
    h.fillRect(x - r, y - r, r * 2, r * 2)
  }

  // Força 1,0: o microrrelevo entra SOMADO ao relevo base, e a soma de dois
  // mapas fortes estoura a normal. Quem regula a presença dele é `forca` em
  // `comDetalhe`, por material — aqui o mapa fica neutro.
  return normalDaAltura(alt, 1.0, 1, 1)
}

/**
 * O ÂNCORA DA INJEÇÃO, isolado numa constante porque ele é frágil por natureza.
 *
 * `onBeforeCompile` faz `String.replace` no shader gerado pelo three, e replace
 * que não casa **não dá erro**: devolve a string intacta e o material compila
 * perfeitamente, sem o detalhe. É a pior classe de falha que existe — silenciosa
 * e invisível até alguém comparar dois renders.
 *
 * Por isso o texto fica aqui e `predio-materiais.test.ts` verifica que ele ainda
 * existe em `THREE.ShaderChunk.normal_fragment_maps`. Se o three mudar o chunk
 * numa atualização, o teste quebra antes do render.
 */
export const ANCORA_DA_NORMAL = 'mapN.xy *= normalScale;'
export const ANCORA_DO_VERTICE = '#include <project_vertex>'

/**
 * ═══ VENTO ═══
 *
 * Toda a vegetação desta cena está PARADA, e parada é a única coisa que planta
 * nunca está. Num terraço aberto, a dez andares de altura, ao entardecer, a
 * imobilidade absoluta é o que mais denuncia que aquilo é geometria — mais que
 * qualquer textura, porque o olho detecta ausência de movimento antes de
 * detectar qualquer detalhe de superfície.
 *
 * ═══ NO VERTEX SHADER, E NÃO NO JAVASCRIPT ═══
 *
 * A alternativa seria mexer nas matrizes das instâncias a cada quadro. São mais
 * de sete mil folhas, lâminas e frondes na cobertura: sete mil `compose()` por
 * quadro na thread principal, mais o envio do buffer inteiro para a GPU. Isso
 * não é uma otimização perdida, é uma decisão que inviabilizaria o efeito.
 *
 * No shader o custo é um `sin` por vértice e UM uniforme por quadro. A malha
 * não é tocada, o buffer de instâncias não é reenviado, e o JavaScript escreve
 * um float.
 *
 * ═══ O DESLOCAMENTO É EM ESPAÇO DE VISTA ═══
 *
 * O balanço precisa ser em MUNDO — todas as plantas cedem para o mesmo lado,
 * senão cada peça balança no seu próprio eixo e o resultado lê como gelatina em
 * vez de vento. Mas `transformed` está em espaço de OBJETO, e voltar de mundo
 * para objeto exigiria inverter a matriz por vértice.
 *
 * A saída é deslocar depois de `project_vertex`, onde `mvPosition` já existe:
 * basta girar o vetor de mundo pela `viewMatrix` (sem translação, por isso o
 * `w = 0`) e somar. Uma multiplicação de matriz por vértice, nenhuma inversão.
 *
 * ═══ O PESO PELA ALTURA É O QUE FAZ SER VENTO ═══
 *
 * Planta é engastada no chão: a base não se move e a ponta descreve um arco. Um
 * deslocamento uniforme faria a moita inteira deslizar de lado, que é o efeito
 * de um tapete sendo puxado, não de vento.
 *
 * `peso` é a altura acima da base elevada a 1,7. O expoente é o que concentra o
 * movimento no terço superior — com expoente 1 a moita inteira se inclina como
 * um bloco rígido.
 *
 * ═══ DUAS ONDAS, NÃO UMA ═══
 *
 * Um seno só é um metrônomo, e o olho acha o período em dois segundos. Duas
 * frequências incomensuráveis (1,1 e 2,3) nunca repetem o mesmo desenho, e a
 * segunda, mais rápida e mais fraca, é a rajada por cima da brisa.
 *
 * A FASE vem da posição de mundo, então a onda ATRAVESSA o jardim em vez de
 * todas as plantas pulsarem juntas — é isso que se lê como uma rajada passando.
 *
 * ═══ E O MESMO `#include` NÃO EXPANDIDO, DE NOVO ═══
 *
 * `gl_Position` mora dentro do chunk `project_vertex`, exatamente como
 * `mapN.xy *= normalScale;` mora dentro de `normal_fragment_maps`. Procurar por
 * ele no shader que chega a `onBeforeCompile` não encontra nada, e o replace
 * falha em silêncio — foi o erro que custou dois renders no detail mapping.
 *
 * Então aqui já se nasce fazendo o certo: expandir o chunk à mão e trocar o
 * `#include` inteiro. A constante guarda o nome do include, não o texto de
 * dentro dele, e o teste verifica os dois.
 */
export const ANCORA_DO_VENTO = '#include <project_vertex>'

export function comVento(
  material: THREE.Material,
  relogio: { value: number },
  /** Amplitude em metros no topo da planta. "Leve" vive entre 0,02 e 0,06. */
  forca: number,
  /** Y de mundo onde a planta é engastada: abaixo disso não há movimento. */
  base: number,
  /** Altura em que o peso satura. Acima dela o balanço não cresce mais. */
  alcance: number,
): THREE.Material {
  const anterior = material.onBeforeCompile
  material.onBeforeCompile = (shader, renderer) => {
    anterior?.call(material, shader, renderer)
    shader.uniforms.relogioDoVento = relogio
    shader.uniforms.forcaDoVento = { value: forca }
    shader.uniforms.baseDoVento = { value: base }
    shader.uniforms.alcanceDoVento = { value: alcance }
    const chunkComVento =
      THREE.ShaderChunk.project_vertex +
      `
        {
          vec4 pVento = vec4( transformed, 1.0 );
          #ifdef USE_INSTANCING
            pVento = instanceMatrix * pVento;
          #endif
          vec3 pmVento = ( modelMatrix * pVento ).xyz;
          float peso = pow( clamp( ( pmVento.y - baseDoVento ) / alcanceDoVento, 0.0, 1.0 ), 1.7 );
          float fase = pmVento.x * 0.55 + pmVento.z * 0.4;
          float onda =
            sin( relogioDoVento * 1.1 + fase ) * 0.68 +
            sin( relogioDoVento * 2.3 + fase * 1.7 ) * 0.32;
          vec3 empurra = vec3( onda, 0.0, onda * 0.42 ) * forcaDoVento * peso;
          mvPosition.xyz += ( viewMatrix * vec4( empurra, 0.0 ) ).xyz;
        }
        gl_Position = projectionMatrix * mvPosition;`
    shader.vertexShader =
      [
        'uniform float relogioDoVento;',
        'uniform float forcaDoVento;',
        'uniform float baseDoVento;',
        'uniform float alcanceDoVento;',
        '',
      ].join('\n') + shader.vertexShader.replace(ANCORA_DO_VENTO, chunkComVento)
  }
  /**
   * A chave de cache tem de carregar os quatro números, pela mesma razão do
   * detalhe: `onBeforeCompile` não entra na chave que o three monta, e dois
   * materiais de parâmetros iguais com ventos diferentes receberiam o programa
   * do primeiro a compilar. A gramínea sairia balançando como a palmeira.
   */
  const antes = material.customProgramCacheKey?.bind(material)
  material.customProgramCacheKey = () =>
    `${antes ? antes() : ''}|vento-${forca}-${base}-${alcance}`
  return material
}

/**
 * Mistura o microrrelevo na normal de um material, dentro do shader.
 *
 * ═══ POR QUE A PROJEÇÃO É EM MUNDO, E NÃO EM UV ═══
 *
 * A primeira versão amostrava o detalhe em `vNormalMapUv * escala`, que é o jeito
 * clássico. Ele não serve AQUI, e o motivo é uma decisão que já está no coração
 * desta cena: o `Coletor` desenha quase tudo a partir de geometrias UNITÁRIAS
 * escaladas pela matriz da instância — e escala de matriz não mexe na UV.
 *
 * O chapim do parapeito é uma `BoxGeometry(1, …)` esticada 30 vezes em x. A UV
 * dele continua indo de 0 a 1 ao longo de trinta metros. O tampo do bar é outra
 * caixa, de cinco metros, com a mesma UV de 0 a 1. Amarrado à UV, o mesmo
 * `escala` daria um grão de 4 cm num e de 24 cm no outro — e no chapim ele sairia
 * ESTICADO trinta vezes num eixo e não no outro, que é o defeito mais visível
 * que uma textura pode ter.
 *
 * Projetando em MUNDO o problema desaparece por construção: `escala` passa a ser
 * "ladrilhos por metro", um número só, igual em cada peça da cena
 * independentemente de como ela foi escalada. Um grão de 4 cm é um grão de 4 cm.
 *
 * ═══ TRIPLANAR, E O PREÇO DELE ═══
 *
 * Projeção em mundo precisa escolher DOIS eixos, e a escolha certa depende da
 * face: o topo do deck quer XZ, a lateral do parapeito quer XY. Escolher um só
 * esticaria a textura em todas as faces perpendiculares a ele.
 *
 * Então são três amostras — uma por plano — misturadas pelo peso do quadrado da
 * normal de mundo. `pow(…, 4)` aperta a mistura: com peso linear a faixa de
 * transição fica larga e as três projeções se sobrepõem numa papa; com expoente
 * alto cada face usa quase só a sua.
 *
 * Três `texture2D` por fragmento em vez de uma, em seis materiais opacos. É o
 * custo, e ele é consciente: a alternativa não é "mais barato", é "errado".
 *
 * ═══ A MISTURA É UDN ═══
 *
 * Somar as três componentes e normalizar achata o relevo base quando o detalhe é
 * forte. UDN soma só XY e MULTIPLICA Z: preserva a direção dominante do mapa
 * grande e deixa o pequeno modular a inclinação. Duas somas e uma multiplicação.
 */
export function comDetalhe(
  material: THREE.MeshStandardMaterial,
  detalhe: THREE.Texture,
  /**
   * Ladrilhos por METRO — e o intervalo útil é 3 a 6, não 20.
   *
   * Eu escrevi 28 na primeira versão pensando "grão de 3,6 cm" e o render não
   * mudou nada. A conta que faltava: o mapa tem 512 texels por ladrilho, então
   * com 28 ladrilhos por metro cada texel cobre 0,07 mm — e um traço de 2 texels
   * vira 0,14 mm. Nada disso sobrevive à reamostragem para pixel.
   *
   * Com 4 ladrilhos por metro o ladrilho tem 25 cm e cada texel vale 0,5 mm: o
   * poro de 12 texels vira 6 mm e o risco de 40 vira 2 cm. São essas as
   * dimensões que ainda existem depois do mipmap.
   */
  escala: number,
  forca: number,
): THREE.MeshStandardMaterial {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.mapaDeDetalhe = { value: detalhe }
    shader.uniforms.escalaDoDetalhe = { value: escala }
    shader.uniforms.forcaDoDetalhe = { value: forca }

    /**
     * A POSIÇÃO E A NORMAL DE MUNDO SAEM DAQUI, e a instância é o detalhe que
     * quase escapa: `modelMatrix` NÃO contém a matriz da cópia. Numa
     * `InstancedMesh` ela vem separada em `instanceMatrix`, e é o three que as
     * combina dentro de `project_vertex`. Fazer a conta sem ela poria o
     * microrrelevo de todas as oitenta garrafas no mesmo ponto do mundo.
     *
     * `objectNormal` ainda está em escopo aqui porque `beginnormal_vertex` vem
     * antes de `project_vertex` no vertex shader do `meshphysical`.
     */
    shader.vertexShader =
      'varying vec3 vPosMundo;\nvarying vec3 vNormalMundo;\n' +
      shader.vertexShader.replace(
        ANCORA_DO_VERTICE,
        `${ANCORA_DO_VERTICE}
        {
          vec4 pDetalhe = vec4( transformed, 1.0 );
          mat3 mDetalhe = mat3( modelMatrix );
          #ifdef USE_INSTANCING
            pDetalhe = instanceMatrix * pDetalhe;
            mDetalhe = mDetalhe * mat3( instanceMatrix );
          #endif
          vPosMundo = ( modelMatrix * pDetalhe ).xyz;
          vNormalMundo = normalize( mDetalhe * objectNormal );
        }`,
      )

    /**
     * ═══ O `#include` AINDA NÃO FOI EXPANDIDO AQUI ═══
     *
     * Este foi o erro que me custou dois renders, e ele é exatamente a falha
     * silenciosa que o teste existia para pegar — só que o teste estava errado
     * junto.
     *
     * A primeira versão fazia `shader.fragmentShader.replace('mapN.xy *=
     * normalScale;', …)`. Aquela linha mora dentro do chunk
     * `normal_fragment_maps`, e o three chama `onBeforeCompile` ANTES de resolver
     * os `#include`: o que chega aqui é o shader do `meshphysical` com
     * `#include <normal_fragment_maps>` ainda literal. O alvo não existia, o
     * replace devolveu a string intacta, tudo compilou e o deck ficou liso.
     *
     * A prova foi por exagero: subi a força de 0,55 para 3,0 e o render não
     * mudou um pixel. Efeito que não responde ao controle dele não está ligado.
     *
     * A correção é expandir o chunk À MÃO — pegar o texto de `ShaderChunk`,
     * injetar nele e trocar o `#include` inteiro pelo resultado. Tem de ser
     * dentro do chunk porque `mapN` só existe lá dentro: depois do `#include` a
     * variável saiu de escopo e `normal` já foi calculada.
     *
     * (O âncora do VÉRTICE é um `#include` e por isso sempre funcionou — o
     * contraste entre os dois é o que torna o erro tão fácil de cometer.)
     */
    const chunkComDetalhe = THREE.ShaderChunk.normal_fragment_maps.replace(
      ANCORA_DA_NORMAL,
      `${ANCORA_DA_NORMAL}
        {
          vec3 pesoDetalhe = abs( normalize( vNormalMundo ) );
          pesoDetalhe = pow( pesoDetalhe, vec3( 4.0 ) );
          pesoDetalhe /= max( 0.0001, pesoDetalhe.x + pesoDetalhe.y + pesoDetalhe.z );
          vec3 pDet = vPosMundo * escalaDoDetalhe;
          vec3 detX = texture2D( mapaDeDetalhe, pDet.zy ).xyz * 2.0 - 1.0;
          vec3 detY = texture2D( mapaDeDetalhe, pDet.xz ).xyz * 2.0 - 1.0;
          vec3 detZ = texture2D( mapaDeDetalhe, pDet.xy ).xyz * 2.0 - 1.0;
          vec3 detN = detX * pesoDetalhe.x + detY * pesoDetalhe.y + detZ * pesoDetalhe.z;
          mapN = vec3( mapN.xy + detN.xy * forcaDoDetalhe, mapN.z * detN.z );
        }`,
    )
    shader.fragmentShader =
      'uniform sampler2D mapaDeDetalhe;\nuniform float escalaDoDetalhe;\nuniform float forcaDoDetalhe;\nvarying vec3 vPosMundo;\nvarying vec3 vNormalMundo;\n' +
      shader.fragmentShader.replace('#include <normal_fragment_maps>', chunkComDetalhe)
  }
  /**
   * SEM ISTO, O DETALHE NÃO APARECE EM METADE DOS MATERIAIS.
   *
   * O three guarda programas compilados num cache com chave derivada dos
   * parâmetros do material — e `onBeforeCompile` NÃO entra nessa chave. Dois
   * materiais com os mesmos parâmetros e injeções diferentes recebem o MESMO
   * programa: o primeiro a compilar ganha, o segundo herda o shader dele em
   * silêncio. Com três escalas de detalhe diferentes na cena, dois dos três
   * sairiam errados.
   */
  material.customProgramCacheKey = () => `detalhe-${escala}-${forca}`
  return material
}

/**
 * ═══ A ONDULAÇÃO DA LÂMINA — dois trens de onda cruzados ═══
 *
 * O DIAGNÓSTICO. A piscina tinha um mapa de normal parado. Água parada de
 * verdade não existe ao ar livre: sempre há vento, sempre há a chegada da
 * cascata, e o que o olho usa para reconhecer água é o reflexo QUEBRANDO e se
 * refazendo. Uma lâmina com relevo congelado lê como vidro martelado.
 *
 * E A CORREÇÃO ÓBVIA ESTÁ ERRADA. Rolar o `offset` do mapa de normal — que é o
 * que a cascata faz e funciona lá — aqui produz o artefato pior de todos: o
 * padrão inteiro TRANSLADA rigidamente, e o que se vê é a piscina deslizando
 * para o lado. Funciona na cascata porque lá a água de fato desce em bloco, na
 * direção do deslocamento. Numa lâmina horizontal não há direção nenhuma, e
 * qualquer deslocamento único vira uma direção inventada.
 *
 * O QUE ONDULAÇÃO É, DE FATO: a soma de vários trens de onda com direções,
 * comprimentos e velocidades diferentes. Nenhum deles sozinho é visível; o que
 * se vê é a INTERFERÊNCIA entre eles, que aparece e some sem ir a lugar nenhum.
 * Duas amostras já bastam para o olho — a terceira não paga o texel.
 *
 * Os dois trens são incomensuráveis de propósito: escalas 1 e 1,7, direções que
 * não são múltiplas uma da outra, velocidades diferentes. Se o período deles
 * fechasse, o padrão combinado se repetiria e a repetição é justamente o que
 * denuncia o truque.
 *
 * O CUSTO É UMA AMOSTRA DE TEXTURA POR PIXEL, contra as três do triplanar. Não
 * há geometria nova, não há malha tocada por quadro, não há `pointLight`: o
 * JavaScript só escreve um float no relógio, exatamente como o vento da
 * vegetação.
 *
 * A amostra ESTÁTICA que o chunk já fez é descartada de propósito. Somá-la aos
 * dois trens deixaria um relevo fixo por baixo da ondulação — uma marca d'água
 * parada dentro de água que se mexe, que é o defeito que esta função existe para
 * não ter. Um texel lido à toa é barato; um padrão congelado não.
 */
export function comOndulacao<T extends THREE.Material>(
  material: T,
  relogio: { value: number },
  escala: number,
  forca: number,
): T {
  const anterior = material.onBeforeCompile
  material.onBeforeCompile = (shader, renderer) => {
    anterior?.call(material, shader, renderer)
    shader.uniforms.relogioDaAgua = relogio
    shader.uniforms.escalaDaOnda = { value: escala }
    shader.uniforms.forcaDaOnda = { value: forca }

    // Expandido à mão pelo mesmo motivo documentado em `comDetalhe`: o three
    // chama isto ANTES de resolver os `#include`, e `mapN` só existe dentro do
    // chunk. Replace que não acha o alvo não lança — devolve a string intacta e
    // o efeito some sem uma linha de erro em lugar nenhum.
    const chunk = THREE.ShaderChunk.normal_fragment_maps.replace(
      ANCORA_DA_NORMAL,
      `${ANCORA_DA_NORMAL}
        {
          vec2 baseOnda = vNormalMapUv * escalaDaOnda;
          // AS VELOCIDADES SUBIRAM 2,4×, e o motivo é de escala física. O
          // deslocamento está em LADRILHOS por segundo, e um ladrilho aqui tem
          // 2,5 m: 0,021 davam 5 cm/s. A sonda de dois quadros acusava
          // movimento — havia mesmo —, mas 5 cm/s numa lâmina de 8 m é lento
          // demais para o olho ler como água, e o dono viu o que a sonda não
          // sabia medir. A 12 cm/s a interferência se refaz num ritmo que se
          // percebe sem virar correnteza.
          vec2 uvA = baseOnda + vec2( 0.050, 0.031 ) * relogioDaAgua;
          vec2 uvB = baseOnda * 1.7 + vec2( -0.034, 0.046 ) * relogioDaAgua;
          vec3 tremA = texture2D( normalMap, uvA ).xyz * 2.0 - 1.0;
          vec3 tremB = texture2D( normalMap, uvB ).xyz * 2.0 - 1.0;
          // Mistura UDN: somam-se as INCLINAÇÕES e preserva-se o eixo Z. Somar
          // os vetores inteiros e normalizar achataria os dois relevos na
          // média, que é o contrário de sobrepor duas ondulações.
          vec3 ondaN = vec3( tremA.xy + tremB.xy, tremA.z );
          mapN = vec3( ondaN.xy * normalScale * forcaDaOnda, ondaN.z );
        }`,
    )
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <normal_fragment_maps>', chunk)
      .replace(
        'void main() {',
        `uniform float relogioDaAgua;
         uniform float escalaDaOnda;
         uniform float forcaDaOnda;
         void main() {`,
      )
  }
  // Mesma razão de `comDetalhe`: `onBeforeCompile` não entra na chave do cache
  // de programas do three, e sem isto um material herdaria em silêncio o shader
  // compilado de outro com os mesmos parâmetros.
  material.customProgramCacheKey = () => `ondulacao-${escala}-${forca}`
  return material
}

export type Superficie = {
  map: THREE.Texture
  normalMap: THREE.Texture
  roughnessMap: THREE.Texture
}

/**
 * UM RECORTE É UMA SUPERFÍCIE COM SILHUETA — é o que folha e fronde precisam.
 *
 * A diferença para `Superficie` é o canal alfa: a peça não ocupa o retângulo
 * inteiro do plano, e o que sobra tem de sumir. E a diferença para o que havia
 * aqui antes são os dois últimos campos.
 *
 * FOLHA SEM RELEVO E SEM BRILHO É PAPEL RECORTADO. Era literalmente o que a cena
 * tinha: o `map` sozinho: uma cor chapada com duas riscas de nervura. Com isso,
 * toda folha virada para o mesmo lado recebe exatamente a mesma luz, e uma copa
 * de mil folhas vira uma mancha de um verde só — foi o que o dono viu no zoom e
 * chamou de "cor chapada".
 *
 * As duas coisas que faltavam:
 *
 * 1. NORMAL. A folha não é plana: ela tem quilha — sobe da margem até a nervura
 *    central e desce de novo. É essa curvatura que faz uma metade da folha pegar
 *    sol enquanto a outra fica na sombra, e é ela que quebra a mancha uniforme
 *    em mil valores diferentes sem custar um triângulo a mais.
 *
 * 2. RUGOSIDADE. Folha tem CUTÍCULA — a camada cerosa que faz a folha nova
 *    brilhar e a velha não. O reflexo especular correndo pelo limbo é metade do
 *    que diz ao olho que aquilo está vivo e úmido; sem ele a folhagem lê como
 *    feltro. E a rugosidade não é uniforme: a nervura é fosca e o limbo é
 *    lustroso, então o brilho anda em FAIXAS ao longo da folha.
 */
export type Recorte = {
  mapa: THREE.Texture
  alfa: THREE.Texture
  normal: THREE.Texture
  rugosidade: THREE.Texture
}

/**
 * Uma superfície com OUTRA repetição, sem redesenhar o canvas.
 *
 * Existe porque o mesmo concreto veste peças de tamanhos muito diferentes — a
 * borda da laje tem 35 cm de altura e a parede do fundo tem 3,2 m. Com a mesma
 * repetição, o poro fica do tamanho de um punho numa e de um grão de areia na
 * outra, e nada denuncia textura repetida mais rápido que escala errada.
 *
 * `clone()` compartilha a IMAGEM e só duplica os parâmetros de amostragem, então
 * cinco variações custam cinco descritores e um canvas.
 */
export function comRepeticao(s: Superficie, u: number, v: number): Superficie {
  const ajusta = (t: THREE.Texture) => {
    const c = t.clone()
    c.repeat.set(u, v)
    c.needsUpdate = true
    return c
  }
  return { map: ajusta(s.map), normalMap: ajusta(s.normalMap), roughnessMap: ajusta(s.roughnessMap) }
}

/**
 * O concreto é COMPARTILHADO no módulo, e não gerado por componente.
 *
 * Desenhar a textura custa um canvas de 256² mais uma passada de Sobel por
 * pixel. Barato uma vez, caro a cada montagem de andar — e a janela de três
 * andares remonta componentes a cada troca de andar, sete vezes na descida. O
 * cache aqui é o que impede a descida de pagar isso de novo a cada parada.
 */
let concretoEmCache: Superficie | null = null
export function concretoCompartilhado(): Superficie {
  if (!concretoEmCache) concretoEmCache = concreto()
  return concretoEmCache
}

/**
 * MADEIRA DE DECK — e o que a pesquisa de deck de verdade corrigiu aqui.
 *
 * Régua de deck não é uma tábua lisa: é madeira serrada, exposta ao tempo, com
 * o grão CORRENDO NO COMPRIMENTO e com o topo levemente lixado pelo uso. O que
 * a distingue de "marrom" são as linhas longas e paralelas de tonalidade
 * ligeiramente diferente, os raros nós, e o fato de a rugosidade variar ao longo
 * do grão — a fibra do verão é mais densa e reflete diferente da fibra do
 * inverno. É por isso que madeira brilha em FAIXAS e não por igual.
 *
 * O grão corre em V para acompanhar o comprimento da régua, que é o eixo z da
 * geometria.
 */
export function madeiraDeDeck(): Superficie {
  const n = 256
  const [cor, c] = tela(n)
  /**
   * BASE QUASE NEUTRA, e isto é a correção de um erro que o render mostrou.
   *
   * A primeira versão pintou a base de `#a97a4e`, a cor da madeira. Só que em
   * three.js `map`, `color` e `instanceColor` MULTIPLICAM os três — e a cor da
   * instância já era marrom. Marrom vezes marrom deu um deck quase preto, com o
   * grão virando listra vermelha dura.
   *
   * A regra que sai daí: TEXTURA É PADRÃO, COR É TINTA. O mapa carrega só a
   * variação em torno de 1,0 — grão, nó, mancha — e quem decide o tom é a
   * instância. Assim a mesma textura serve para ipê, cumaru ou deck lavado,
   * trocando só a cor da cópia.
   */
  c.fillStyle = '#e6ddd0'
  c.fillRect(0, 0, n, n)
  const [alt, a] = tela(n)
  a.fillStyle = '#808080'
  a.fillRect(0, 0, n, n)

  // Linhas de grão, longas e quase paralelas, com leve ondulação.
  for (let i = 0; i < 74; i++) {
    const x = ruido(i, 1) * n
    const larg = 0.6 + ruido(i, 2) * 2.6
    const escuro = ruido(i, 3)
    c.strokeStyle = `rgba(${escuro > 0.5 ? '150,132,110' : '252,246,236'},${0.16 + ruido(i, 4) * 0.34})`
    a.strokeStyle = `rgba(${escuro > 0.5 ? '40,40,40' : '190,190,190'},${0.25 + ruido(i, 5) * 0.4})`
    c.lineWidth = larg
    a.lineWidth = larg
    for (const ctx of [c, a]) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      // Ondulação suave: grão perfeitamente reto lê como listra impressa.
      for (let y = 0; y <= n; y += 16)
        ctx.lineTo(x + Math.sin(y * 0.02 + i) * (1.5 + ruido(i, 6) * 3), y)
      ctx.stroke()
    }
  }
  // Nós: dois por textura, e não mais — deck de qualidade é selecionado.
  for (let k = 0; k < 2; k++) {
    const nx = 40 + ruido(k, 7) * (n - 80)
    const ny = ruido(k, 8) * n
    for (let r = 9; r > 0; r--) {
      c.strokeStyle = `rgba(158,138,112,${0.05 + (9 - r) * 0.03})`
      a.strokeStyle = `rgba(60,60,60,${0.05 + (9 - r) * 0.03})`
      for (const ctx of [c, a]) {
        ctx.lineWidth = 1.4
        ctx.beginPath()
        ctx.ellipse(nx, ny, r * 1.7, r * 4.5, 0, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
  }

  // Rugosidade ALTA e pouco variada: deck de exterior é fosco. A primeira versão
  // deixou o mapa claro demais e as réguas ficaram envernizadas — madeira
  // brilhante ao ar livre lê como piso de salão, não como terraço.
  const [rug, r] = tela(n)
  r.fillStyle = '#d8d8d8'
  r.fillRect(0, 0, n, n)
  r.globalAlpha = 0.28
  r.drawImage(alt, 0, 0)

  return {
    map: acaba(cor, 1, 12, true),
    normalMap: normalDaAltura(alt, 1.6, 1, 12),
    roughnessMap: acaba(rug, 1, 12, false),
  }
}

/**
 * CONCRETO APARENTE — parapeito, laje e parede da cobertura.
 *
 * Concreto de obra tem quatro marcas que ninguém desenha e todo mundo
 * reconhece: o MOSQUEADO de tonalidade (a cura nunca é uniforme), o POROS da
 * superfície (bolhas de ar presas contra a fôrma), as MANCHAS DE ESCORRIMENTO
 * (água correndo na vertical, mais escuras embaixo) e as JUNTAS entre placas de
 * fôrma. Sem elas, concreto lê como cartolina cinza.
 *
 * As manchas correm todas no mesmo sentido de propósito: água escorre para
 * baixo, e mancha em direções aleatórias é o erro que denuncia textura gerada.
 */
export function concreto(): Superficie {
  const n = 256
  const [cor, c] = tela(n)
  c.fillStyle = '#c7b9a2'
  c.fillRect(0, 0, n, n)
  const [alt, a] = tela(n)
  a.fillStyle = '#8c8c8c'
  a.fillRect(0, 0, n, n)

  // Mosqueado: manchas largas e suaves de cura desigual.
  for (let i = 0; i < 46; i++) {
    const x = ruido(i, 11) * n
    const y = ruido(i, 12) * n
    const raio = 26 + ruido(i, 13) * 84
    const claro = ruido(i, 14) > 0.5
    const g = c.createRadialGradient(x, y, 0, x, y, raio)
    g.addColorStop(0, claro ? 'rgba(232,224,210,0.15)' : 'rgba(132,122,106,0.13)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    c.fillStyle = g
    c.fillRect(x - raio, y - raio, raio * 2, raio * 2)
  }
  // Escorrimento vertical.
  for (let i = 0; i < 9; i++) {
    const x = ruido(i, 15) * n
    const larg = 2 + ruido(i, 16) * 9
    const g = c.createLinearGradient(0, ruido(i, 17) * n * 0.5, 0, n)
    g.addColorStop(0, 'rgba(96,86,70,0)')
    g.addColorStop(0.5, 'rgba(96,86,70,0.09)')
    g.addColorStop(1, 'rgba(96,86,70,0.03)')
    c.fillStyle = g
    c.fillRect(x, 0, larg, n)
  }
  // Poros: pontos escuros minúsculos, no mapa de cor E no de altura.
  for (let i = 0; i < 900; i++) {
    const x = ruido(i, 21) * n
    const y = ruido(i, 22) * n
    const raio = 0.35 + ruido(i, 23) * 1.1
    c.fillStyle = `rgba(104,95,82,${0.08 + ruido(i, 24) * 0.18})`
    a.fillStyle = `rgba(40,40,40,${0.16 + ruido(i, 25) * 0.3})`
    for (const ctx of [c, a]) {
      ctx.beginPath()
      ctx.arc(x, y, raio, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  // Junta de fôrma: uma linha reta horizontal, com sombra embaixo.
  for (const y of [n * 0.5]) {
    c.fillStyle = 'rgba(88,79,65,0.5)'
    c.fillRect(0, y, n, 1.6)
    a.fillStyle = 'rgba(20,20,20,0.85)'
    a.fillRect(0, y, n, 1.6)
  }

  const [rug, r] = tela(n)
  r.fillStyle = '#b4b4b4'
  r.fillRect(0, 0, n, n)
  r.globalAlpha = 0.5
  r.drawImage(alt, 0, 0)

  return {
    map: acaba(cor, 4, 2, true),
    normalMap: normalDaAltura(alt, 1.0, 4, 2),
    roughnessMap: acaba(rug, 4, 2, false),
  }
}

/**
 * TECIDO DE ESTOFADO E LONA — espreguiçadeira e guarda-sol.
 *
 * Lona de exterior é trama grossa: dá para ver o fio. O que ela faz com a luz é
 * o oposto do plástico branco que estava ali — a trama espalha o reflexo em
 * micro-sombras, então a superfície tem uma textura visível mesmo quando a cor é
 * uniforme. Sem isso, almofada branca vira sabonete.
 */
export function tecido(): Superficie {
  const n = 128
  const [cor, c] = tela(n)
  c.fillStyle = '#efe6d8'
  c.fillRect(0, 0, n, n)
  const [alt, a] = tela(n)
  a.fillStyle = '#808080'
  a.fillRect(0, 0, n, n)

  // Trama: fios cruzados, um passo a cada 4 px.
  for (let i = 0; i < n; i += 4) {
    for (const [ctx, claro, escuro] of [
      [c, 'rgba(255,252,246,0.5)', 'rgba(196,184,166,0.42)'],
      [a, 'rgba(225,225,225,0.6)', 'rgba(58,58,58,0.6)'],
    ] as const) {
      ctx.fillStyle = claro
      ctx.fillRect(i, 0, 2, n)
      ctx.fillStyle = escuro
      ctx.fillRect(i + 2, 0, 2, n)
      ctx.fillStyle = claro
      ctx.fillRect(0, i, n, 2)
      ctx.fillStyle = escuro
      ctx.fillRect(0, i + 2, n, 2)
    }
  }
  // Sujeira leve: tecido de exterior não é alvo de fábrica.
  for (let i = 0; i < 20; i++) {
    const x = ruido(i, 31) * n
    const y = ruido(i, 32) * n
    const raio = 8 + ruido(i, 33) * 26
    const g = c.createRadialGradient(x, y, 0, x, y, raio)
    g.addColorStop(0, 'rgba(198,186,168,0.2)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    c.fillStyle = g
    c.fillRect(x - raio, y - raio, raio * 2, raio * 2)
  }

  const [rug, r] = tela(n)
  r.fillStyle = '#d2d2d2'
  r.fillRect(0, 0, n, n)
  r.globalAlpha = 0.35
  r.drawImage(alt, 0, 0)

  return {
    map: acaba(cor, 3, 3, true),
    normalMap: normalDaAltura(alt, 1.1, 3, 3),
    roughnessMap: acaba(rug, 3, 3, false),
  }
}

/**
 * A FOLHA, RECORTADA POR ALFA — e esta é a técnica que separa folhagem de
 * tempo real de folhagem de papel picado.
 *
 * O problema: a folha é um retângulo. Dois triângulos, e o contorno de um
 * retângulo é um retângulo. Contra o céu, na periferia da copa — que é
 * justamente onde o olho examina a silhueta de uma árvore — o que aparece é um
 * enxame de quadradinhos.
 *
 * A saída NÃO é modelar a forma da folha em geometria. Uma folha lanceolada em
 * malha custaria de cinco a dez triângulos, e são milhares de folhas. A saída é
 * a que a indústria usa desde sempre: manter os dois triângulos e RECORTAR o
 * contorno com um mapa de alfa. O contorno sai de graça, no estágio de
 * fragmento, e a silhueta fica tão boa quanto a de uma malha.
 *
 * `alphaTest` e não `transparent`, e a distinção importa muito aqui:
 *
 * - `transparent` obriga a ordenar os objetos por profundidade a cada quadro e
 *   desliga a escrita de profundidade. Com milhares de folhas entrelaçadas, a
 *   ordenação é impossível de acertar e o resultado pisca conforme a câmera
 *   anda.
 * - `alphaTest` simplesmente DESCARTA o fragmento abaixo do limiar. A folha
 *   continua opaca, entra no buffer de profundidade normalmente, não precisa de
 *   ordem nenhuma — e, de brinde, projeta sombra com o CONTORNO CERTO em vez de
 *   sombra retangular.
 *
 * O mapa de cor leva a nervura central: uma linha mais clara no meio da folha.
 * É o único detalhe interno que sobrevive à distância, e é ele que diz "folha"
 * em vez de "mancha verde".
 */
export function folha(tipo: 'lanceolada' | 'ovalada' = 'lanceolada'): Recorte {
  // 128 e nao 64: a folha tem 12 px na tela a 16 m, mas o dono inspeciona a copa
  // de perto e a 64 a nervura ja era um degrau. Uma textura so, compartilhada por
  // alguns milhares de instancias — dobrar a resolucao custa um canvas.
  const n = 128
  const [cor, c] = tela(n)
  const [alf, a] = tela(n)
  const [alt, h] = tela(n)
  const [rug, r] = tela(n)

  a.fillStyle = '#000000'
  a.fillRect(0, 0, n, n)
  /**
   * O FUNDO DA ALTURA É CINZA, NÃO PRETO — e isto é a armadilha do par
   * alfa + normal.
   *
   * Fora da silhueta o pixel não é desenhado (alfa zero), então a cor dele
   * parece não importar. Mas o Sobel não conhece o alfa: ele lê o campo de
   * altura inteiro, e um fundo preto encostado num limbo claro é um PENHASCO.
   * A normal resultante aponta para o lado exatamente na borda — bem onde a
   * folha é recortada — e a orla de cada folha acenderia como um fio de arame.
   *
   * Cinza no nível médio do limbo faz a borda virar uma descida suave, que é o
   * que a margem de uma folha é de verdade.
   */
  h.fillStyle = '#808080'
  h.fillRect(0, 0, n, n)
  r.fillStyle = '#b4b4b4'
  r.fillRect(0, 0, n, n)

  // A lanceolada: duas curvas espelhadas que se encontram em ponta nas duas
  // extremidades. É o contorno da folha de oliveira, de louro, de salgueiro —
  // a forma mais comum que existe, e a que menos parece um retângulo.
  /**
   * A CURVA VIROU CUBICA, e o motivo aparece no zoom. Com uma quadratica de um
   * ponto de controle so, o contorno sai PONTUDO nas duas extremidades e a folha
   * le como estrela de quatro pontas — vista de perto, uma copa inteira dessas
   * vira um amontoado de espinhos.
   *
   * Folha lanceolada e cheia no meio e afina SO na ponta: a base e arredondada,
   * onde ela se prende ao peciolo. Dois pontos de controle dao exatamente isso —
   * o primeiro abre a barriga logo depois da base, o segundo a fecha devagar ate
   * a ponta.
   */
  /**
   * DUAS FOLHAS, E NÃO UMA ESTICADA — este era o defeito que sobrou no zoom.
   *
   * A cena tem dois formatos de plano de folha: a lanceolada da oliveira (0,30 ×
   * 0,115, quase 3:1) e a folha larga tropical das jardineiras (0,26 × 0,20,
   * 1,3:1). As duas usavam o MESMO recorte. Uma silhueta 3:1 esmagada num plano
   * 1,3:1 não vira uma folha larga: vira uma PÁ — a ponta afilada engorda e o
   * contorno perde a curva, que é exatamente o que se via nas jardineiras.
   *
   * E a nervura errada é metade do problema. Folha estreita tem nervação PINADA
   * (uma central com laterais saindo em espinha); folha larga tem PALMADA
   * (várias nervuras de mesmo calibre abrindo em leque da base). São dois
   * desenhos diferentes, e é por eles que se reconhece cada uma a distância.
   *
   * Tudo o mais — degradê, mancha, quilha, cutícula — é compartilhado, porque
   * isso é física de folha e não anatomia de espécie.
   *
   * Escrito em fração de `n` para a forma não mudar quando a resolução muda: os
   * números fixos de antes eram do canvas de 64 e afinariam a folha em 128.
   */
  const larga = tipo === 'ovalada'
  const contorno = (ctx: CanvasRenderingContext2D) => {
    ctx.beginPath()
    if (larga) {
      // Ovalada: base ROLIÇA (é por ela que a folha se prende ao pecíolo, e é
      // larga), barriga máxima no primeiro terço, ponta curta e voltada.
      ctx.moveTo(n * 0.04, n / 2)
      ctx.bezierCurveTo(n * 0.06, n * 0.1, n * 0.52, n * 0.02, n * 0.94, n * 0.42)
      ctx.bezierCurveTo(n * 0.99, n * 0.47, n * 0.99, n * 0.53, n * 0.94, n * 0.58)
      ctx.bezierCurveTo(n * 0.52, n * 0.98, n * 0.06, n * 0.9, n * 0.04, n / 2)
    } else {
      ctx.moveTo(n * 0.031, n / 2)
      ctx.bezierCurveTo(n * 0.12, n * 0.062, n * 0.62, n * 0.094, n * 0.969, n / 2)
      ctx.bezierCurveTo(n * 0.62, n * 0.906, n * 0.12, n * 0.938, n * 0.031, n / 2)
    }
    ctx.closePath()
  }
  // As nervuras são as mesmas nos três mapas: cor, relevo e brilho têm de
  // concordar, senão o olho vê uma nervura pintada onde não há relevo e o
  // material denuncia que é desenho.
  const nervuras = (ctx: CanvasRenderingContext2D, larguraCentral: number, larguraLateral: number) => {
    ctx.lineCap = 'round'
    ctx.lineWidth = larguraCentral
    ctx.beginPath()
    ctx.moveTo(n * 0.05, n / 2)
    ctx.lineTo(larga ? n * 0.9 : n * 0.95, n / 2)
    ctx.stroke()
    ctx.lineWidth = larguraLateral
    if (larga) {
      // PALMADA: quatro nervuras de cada lado saindo da MESMA base, abrindo em
      // leque e curvando para acompanhar a margem. Calibre igual ao da central —
      // é isso que diferencia palmada de pinada, não o número de nervuras.
      for (let i = 1; i <= 4; i++) {
        const abre = (i / 5) * 0.72
        for (const s of [-1, 1]) {
          ctx.beginPath()
          ctx.moveTo(n * 0.06, n / 2)
          ctx.quadraticCurveTo(
            n * 0.4,
            n / 2 + s * n * abre * 0.44,
            n * (0.5 + (1 - abre) * 0.4),
            n / 2 + s * n * abre * 0.5,
          )
          ctx.stroke()
        }
      }
      return
    }
    for (let i = 1; i < 7; i++) {
      const x = n * 0.09 + (i * n * 0.78) / 7
      // A lateral sai em diagonal para a PONTA e encurta conforme se aproxima
      // dela, porque o limbo afina — lateral de comprimento fixo desenha um
      // retângulo de espinhas dentro de uma folha lanceolada.
      const alcance = n * 0.13 * (1 - (x / n) * 0.55)
      for (const s of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(x, n / 2)
        ctx.quadraticCurveTo(x + alcance * 0.5, n / 2 + s * alcance * 0.5, x + alcance, n / 2 + s * alcance * 1.1)
        ctx.stroke()
      }
    }
  }

  a.fillStyle = '#ffffff'
  contorno(a)
  a.fill()

  /**
   * A COR DO LIMBO É UM DEGRADÊ, e não um preenchimento — em duas direções.
   *
   * Ao longo (base → ponta): a folha nova na ponta do ramo é mais clara e mais
   * amarelada que a velha junto ao lenho. Numa copa inteira isso é o que impede
   * as mil folhas de terem o mesmo valor.
   *
   * Através (margem → nervura): a quilha. A parte junto à nervura está virada
   * para cima e pega mais céu; a margem tomba e escurece. O mesmo degradê aparece
   * no campo de altura logo abaixo, e é a concordância dos dois que convence.
   *
   * A base continua sendo verde NEUTRO: a cor vem da instância. Mesma regra da
   * madeira — textura é padrão, cor é tinta.
   */
  const aoLongo = c.createLinearGradient(0, 0, n, 0)
  aoLongo.addColorStop(0, '#93a189')
  aoLongo.addColorStop(0.45, '#b9c2ae')
  aoLongo.addColorStop(1, '#ced4be')
  c.fillStyle = aoLongo
  contorno(c)
  c.fill()

  c.save()
  contorno(c)
  c.clip()
  const quilha = c.createLinearGradient(0, 0, 0, n)
  quilha.addColorStop(0, 'rgba(52,68,40,0.40)')
  quilha.addColorStop(0.4, 'rgba(52,68,40,0)')
  quilha.addColorStop(0.5, 'rgba(255,255,255,0.20)')
  quilha.addColorStop(0.6, 'rgba(52,68,40,0)')
  quilha.addColorStop(1, 'rgba(52,68,40,0.40)')
  c.fillStyle = quilha
  c.fillRect(0, 0, n, n)
  // Manchas: folha de verdade tem o tom irregular, por idade e por poeira. São
  // largas e de contraste baixíssimo de propósito — mancha visível vira doença.
  for (let i = 0; i < 40; i++) {
    const x = ruido(i, 71) * n
    const y = n * 0.2 + ruido(i, 72) * n * 0.6
    const raio = n * (0.05 + ruido(i, 73) * 0.1)
    const claro = ruido(i, 74) > 0.5
    const m = c.createRadialGradient(x, y, 0, x, y, raio)
    m.addColorStop(0, claro ? 'rgba(236,240,222,0.22)' : 'rgba(72,90,56,0.20)')
    m.addColorStop(1, 'rgba(0,0,0,0)')
    c.fillStyle = m
    c.fillRect(x - raio, y - raio, raio * 2, raio * 2)
  }
  c.strokeStyle = 'rgba(234,240,224,0.7)'
  const branda = 'rgba(226,234,214,0.34)'
  c.lineWidth = n * 0.014
  c.beginPath()
  c.moveTo(n * 0.05, n / 2)
  c.lineTo(n * 0.95, n / 2)
  c.stroke()
  c.strokeStyle = branda
  nervuras(c, n * 0.014, n * 0.008)
  c.restore()

  /**
   * O CAMPO DE ALTURA. A quilha vira relevo de verdade aqui: claro no eixo,
   * escuro nas duas margens. O Sobel transforma essa rampa numa normal que
   * inclina a metade de cima da folha para um lado e a de baixo para o outro —
   * que é exatamente o que uma folha dobrada faz com a luz.
   */
  h.save()
  contorno(h)
  h.clip()
  const relevo = h.createLinearGradient(0, 0, 0, n)
  relevo.addColorStop(0, '#4c4c4c')
  relevo.addColorStop(0.5, '#d2d2d2')
  relevo.addColorStop(1, '#4c4c4c')
  h.fillStyle = relevo
  h.fillRect(0, 0, n, n)
  h.strokeStyle = '#ffffff'
  h.shadowBlur = n * 0.02
  h.shadowColor = '#ffffff'
  nervuras(h, n * 0.022, n * 0.012)
  h.restore()

  /**
   * A RUGOSIDADE. Escuro = liso. O limbo é lustroso (cutícula cerosa) e a
   * nervura é fosca, então o brilho corre em faixas entre as nervuras em vez de
   * cobrir a folha inteira. A margem também é fosca: é onde a folha resseca.
   */
  r.save()
  contorno(r)
  r.clip()
  r.fillStyle = '#5e5e5e'
  r.fillRect(0, 0, n, n)
  const foscoNaMargem = r.createLinearGradient(0, 0, 0, n)
  foscoNaMargem.addColorStop(0, 'rgba(214,214,214,0.9)')
  foscoNaMargem.addColorStop(0.5, 'rgba(214,214,214,0)')
  foscoNaMargem.addColorStop(1, 'rgba(214,214,214,0.9)')
  r.fillStyle = foscoNaMargem
  r.fillRect(0, 0, n, n)
  r.strokeStyle = 'rgba(206,206,206,0.85)'
  nervuras(r, n * 0.02, n * 0.011)
  r.restore()

  const mapa = new THREE.CanvasTexture(cor)
  mapa.colorSpace = THREE.SRGBColorSpace
  mapa.anisotropy = ANISOTROPIA
  const alfa = new THREE.CanvasTexture(alf)
  alfa.anisotropy = ANISOTROPIA
  // Força 1,2: a folha é fina e a quilha é rasa. Acima disso ela estufa e passa
  // a ler como pétala de plástico soprado.
  return { mapa, alfa, normal: normalDaAltura(alt, 1.2, 1, 1), rugosidade: acaba(rug, 1, 1, false) }
}

/**
 * A FRONDE DE PALMEIRA — e ela precisa de recorte próprio, não de uma folha
 * esticada.
 *
 * Fronde pinada não é uma folha grande: é um RÁQUIS (a haste central) com
 * dezenas de folíolos presos ao longo dele, como um pente de dois lados. O
 * espaço ENTRE os folíolos é metade do que se vê — é por ele que o céu aparece,
 * e é isso que dá à palmeira a silhueta leve e serrilhada que nenhuma outra
 * planta tem.
 *
 * Uma folha lanceolada esticada daria uma lâmina maciça. O recorte por alfa
 * resolve: os vãos entre folíolos são simplesmente alfa zero, e a fronde inteira
 * continua custando dois triângulos.
 *
 * Os folíolos são mais curtos nas pontas e mais longos no meio, que é a
 * proporção real — fronde de folíolo uniforme lê como escova de garrafa.
 */
export function fronde(): Recorte {
  // 256: a fronde agora é partida em dois planos e cada metade estica 64 texels
  // sobre ~100 px de tela. A 128 o folíolo tinha 4 texels e o afilamento dele
  // sumia na amostragem — voltava a ser o fio de espessura fixa de antes.
  const n = 256
  const [cor, c] = tela(n)
  const [alf, a] = tela(n)
  const [alt, h] = tela(n)
  const [rug, r] = tela(n)
  a.fillStyle = '#000000'
  a.fillRect(0, 0, n, n)
  c.fillStyle = '#000000'
  c.fillRect(0, 0, n, n)
  // Cinza neutro no relevo e no brilho, pela mesma razão da folha: preto contra
  // folíolo claro seria um penhasco para o Sobel na borda recortada.
  h.fillStyle = '#808080'
  h.fillRect(0, 0, n, n)
  r.fillStyle = '#9b9b9b'
  r.fillRect(0, 0, n, n)

  const meio = n / 2
  /**
   * VINTE E DOIS FOLIOLOS, E NAO QUARENTA E SEIS — e a conta e de pixel, nao de
   * botanica.
   *
   * Uma fronde de verdade tem mais de cem foliolos. Mas na tela ela ocupa cerca
   * de cem pixels de comprimento, e 46 foliolos ali dao dois pixels cada: o vao
   * entre eles fecha na amostragem e a fronde volta a ser uma LAMINA MACICA —
   * exatamente o que o recorte por alfa existia para evitar.
   *
   * Com 22, cada foliolo tem quatro ou cinco pixels e o vao sobrevive. E o vao E
   * a leitura: e por ele que o ceu aparece, e e isso que da a palmeira a
   * silhueta serrilhada que nenhuma outra planta tem. Fidelidade que nao chega
   * ao pixel nao e fidelidade, e desperdicio.
   */
  /**
   * TRINTA E DOIS, E NÃO VINTE E DOIS — porque o folíolo deixou de ser um traço.
   *
   * A conta de 22 estava certa para o que existia: um `stroke` de espessura
   * CONSTANTE. Traço de espessura constante ou fecha o vão (muitos) ou vira fio
   * de arame (poucos), e 22 era o meio-termo menos ruim entre dois defeitos.
   *
   * Folíolo de verdade é uma LÂMINA: larga onde se prende ao ráquis, afinando
   * até a ponta. Desenhado assim, ele resolve os dois de uma vez — as bases se
   * encostam e formam a linha contínua que corre junto ao ráquis, e as pontas se
   * afastam sozinhas e abrem o vão em leque. É por isso que a silhueta de uma
   * palmeira é um pente que se abre, e não uma fileira de cerdas paralelas.
   *
   * Com a lâmina no lugar do traço, mais folíolos deixam de fechar a fronde: 32
   * dão base encostada e ponta separada, que é a fronde real.
   */
  const folioloS = 32

  /**
   * O PERFIL DO FOLÍOLO NÃO PODE CHEGAR A ZERO — e chegava.
   *
   * A curva antiga era `sin(min(1, t·1,25)·π)`, e o `min` fazia o argumento
   * bater em π já em t = 0,8. Dali para a frente o seno é zero: o último QUINTO
   * de cada fronde não tinha folíolo nenhum, só o ráquis pelado seguindo sozinho
   * até a ponta. Foi o que o dono viu — a folhagem parava antes do fim.
   *
   * O erro estava em modelar o afinamento com uma curva que TERMINA. Fronde
   * pinada não termina: os folíolos encurtam até o ápice e o último par se
   * encontra ali, fechando a ponta. Não existe trecho de haste nua — se
   * existisse, seria uma fronde velha que já perdeu as folhas da ponta.
   *
   * O QUE ESTA FUNÇÃO PASSOU A SER: não mais o comprimento do folíolo, e sim o
   * CONTORNO da fronde — a meia-largura da lâmina em cada ponto do ráquis. A
   * diferença importa, porque é ela que resolve os dois defeitos de uma vez.
   *
   * - `min(1, 0,3 + 3u)` é a subida curta junto ao estipe. Os folíolos basais são
   *   mesmo curtos (em muitas espécies viram espinho), então ela começa em 30% e
   *   chega ao máximo já no primeiro quarto.
   * - `(1 − u)^0,42` é o afinamento longo. O expoente baixo é o ponto: com 0,42 a
   *   fronde ainda tem 38% da largura em u = 0,9 e só fecha no último instante.
   *   Com expoente 1 ela afinaria desde o meio e voltaria a parecer pelada.
   *
   * Ela VALE ZERO em u = 1, e isso agora é desejado em vez de ser o defeito: quem
   * pousa ali é a PONTA do último folíolo, não a base dele. A folhagem alcança o
   * ápice; o que some no ápice é a largura, que é o que uma ponta é.
   */
  const perfil = (u: number) => Math.min(1, 0.3 + u * 3) * (1 - u) ** 0.42
  const MEIA_LARGURA = n * 0.3
  const xDe = (u: number) => n * 0.03 + u * n * 0.94
  /**
   * O AVANÇO É O QUE FECHA A PONTA, e a falta dele era o V que o dono viu.
   *
   * Antes, a ponta de cada folíolo saía de um ângulo (`inclina`) aplicado ao
   * comprimento dele. Funciona no meio da fronde e QUEBRA no fim: os dois
   * últimos folíolos, um para cada lado, terminavam afastados do eixo, e entre
   * eles sobrava um entalhe. A fronde acabava num V — numa forquilha, como rabo
   * de peixe. Fronde pinada faz o contrário: o último par CONVERGE e se encontra
   * no ápice, fechando a ponta num Λ.
   *
   * A correção é trocar a referência. A ponta do folíolo deixa de ser calculada
   * por ângulo e passa a ser um ponto SOBRE O CONTORNO da fronde, 22% adiante da
   * base dele ao longo do ráquis. Como `perfil` vale zero em u = 1, o folíolo
   * cuja ponta cai ali pousa exatamente no eixo: o par se encontra, e a ponta
   * fecha sozinha. Não é uma exceção para o último folíolo, é a mesma regra
   * levada até o fim — que é o jeito de a ponta nunca mais abrir.
   *
   * De quebra, o avanço dá a inclinação certa ao longo de toda a fronde: os
   * folíolos saem a ~56° no meio e vão fechando para ~36° perto do ápice, que é
   * o que uma fronde faz. Antes isso era um segundo número, regulado à mão e sem
   * relação nenhuma com o contorno.
   *
   * 0,15 E NÃO 0,22, e o teste mostrou por quê. Com 0,22 a ponta fechou — e a
   * fronde virou uma LÂMINA MACIÇA. Folíolo muito deitado se sobrepõe ao vizinho
   * no comprimento inteiro, não só na base, e o vão entre eles desaparece. Aí
   * some o serrilhado, que é a metade da silhueta de uma palmeira: é pelo vão que
   * o céu atravessa a copa.
   *
   * O avanço governa o ÂNGULO do folíolo, e o ângulo governa o vão. Menor avanço
   * = folíolo mais erguido = pontas que se afastam mais depressa da vizinha. E a
   * ponta continua fechada, porque quem a fecha é o contorno valer zero em u = 1,
   * não o ângulo — foi para isso que a referência mudou.
   */
  const AVANCO = 0.15

  /**
   * O folíolo, ponto a ponto: percorre a curva central e desloca para os dois
   * lados por uma largura que decai — ida por uma margem, volta pela outra.
   *
   * `quadraticCurveTo` não serviria: ele desenha UMA curva, e o que se quer aqui
   * é a região ENTRE duas curvas que convergem. Caminhar a curva à mão é o preço
   * de trocar cerda por lâmina.
   */
  const lamina = (
    ctx: CanvasRenderingContext2D,
    p0: readonly [number, number],
    p1: readonly [number, number],
    p2: readonly [number, number],
    larguraBase: number,
  ) => {
    const PASSOS = 7
    const eixo = (t: number) => {
      const u = 1 - t
      return [
        u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
        u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
      ] as const
    }
    // Expoente 0,75 e não 0,55: o folíolo tem de AFINAR DEPRESSA. Com 0,55 ele
    // guarda largura demais no meio do comprimento, encosta no vizinho e fecha o
    // vão. A lâmina é larga onde se prende e vira quase um fio na ponta.
    const largura = (t: number) => larguraBase * (1 - t) ** 0.75
    const margem = (t: number, lado: number) => {
      const [px, py] = eixo(t)
      const u = 1 - t
      // Derivada da quadrática: dá a tangente, e a perpendicular dela é a
      // direção em que a lâmina tem largura.
      const dx = 2 * u * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0])
      const dy = 2 * u * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1])
      const m = Math.hypot(dx, dy) || 1
      const w = largura(t) * 0.5 * lado
      return [px - (dy / m) * w, py + (dx / m) * w] as const
    }
    ctx.beginPath()
    for (let i = 0; i <= PASSOS; i++) {
      const [mx, my] = margem(i / PASSOS, 1)
      if (i === 0) ctx.moveTo(mx, my)
      else ctx.lineTo(mx, my)
    }
    for (let i = PASSOS; i >= 0; i--) {
      const [mx, my] = margem(i / PASSOS, -1)
      ctx.lineTo(mx, my)
    }
    ctx.closePath()
    ctx.fill()
  }

  const desenha = (
    ctx: CanvasRenderingContext2D,
    corpo: (t: number, s: number) => string,
    raquis: string,
    larguraBase: number,
    grossuraRaquis: number,
  ) => {
    for (let i = 0; i < folioloS; i++) {
      const t = i / (folioloS - 1)
      // A base percorre o ráquis só até `1 − AVANCO`, porque é a PONTA que tem de
      // alcançar u = 1. O último folíolo nasce em 0,78 e morre no ápice.
      const uBase = t * (1 - AVANCO)
      const uPonta = uBase + AVANCO
      const x0 = xDe(uBase)
      const x1 = xDe(uPonta)
      // A variação de 7% por folíolo é o que impede a orla de virar um arco
      // desenhado a compasso. É a ÚNICA desordem que uma palmeira tem, e ela
      // mora aqui, na orla — nunca no arranjo, que é o que o dono corrigiu.
      // Ela MULTIPLICA o contorno, então no ápice, onde o contorno é zero, ela
      // continua sendo zero: o sorteio não reabre a ponta que acabou de fechar.
      const meiaLargura = perfil(uPonta) * MEIA_LARGURA * (0.93 + ruido(i, 88) * 0.14)
      for (const s of [-1, 1]) {
        ctx.fillStyle = corpo(t, s)
        lamina(
          ctx,
          [x0, meio],
          // O controle puxado para fora arqueia o folíolo: ele deixa o ráquis
          // mais aberto e vai deitando. Folíolo reto lê como espinho.
          // A fração baixa em x (0,35) é deliberada: ela torna a SAÍDA mais
          // perpendicular, e é na saída que os folíolos vizinhos precisam se
          // separar. Se eles saem juntos, nenhum afinamento adiante abre o vão.
          [x0 + (x1 - x0) * 0.35, meio + s * meiaLargura * 0.6],
          [x1, meio + s * meiaLargura],
          // O folíolo do ápice é curto, então também tem de ser estreito — largura
          // fixa ali daria uma clava na ponta da fronde.
          larguraBase * (0.5 + perfil(uPonta) * 0.62),
        )
      }
    }
    /**
     * O RÁQUIS É PREENCHIDO E AFILA, em vez de ser um traço de espessura
     * constante. Ele para em u = 0,78, que é onde nasce o último folíolo, e o
     * trecho dali até o ápice é feito só pelos folíolos que convergem. Um traço
     * de ponta reta terminando no meio da folhagem deixaria um toco visível —
     * era a versão anterior deste mesmo defeito.
     */
    ctx.fillStyle = raquis
    ctx.beginPath()
    ctx.moveTo(n * 0.02, meio - grossuraRaquis / 2)
    ctx.lineTo(xDe(1 - AVANCO), meio)
    ctx.lineTo(n * 0.02, meio + grossuraRaquis / 2)
    ctx.closePath()
    ctx.fill()
  }

  // A base do folíolo é pouco mais larga que o passo entre dois vizinhos
  // (0,0258·n): elas se encostam ao longo do ráquis e formam a linha contínua que
  // uma fronde tem ali, sem sobrar largura que feche o vão adiante.
  const LARG = n * 0.028
  desenha(a, () => '#ffffff', '#ffffff', LARG, n * 0.017)
  /**
   * A COR DA FRONDE VARIA POR FOLÍOLO, e é o que faltava para ela deixar de ser
   * uma chapa verde.
   *
   * Duas coisas acontecem numa fronde real ao mesmo tempo: ela AMARELA da base
   * para a ponta (o tecido novo é mais claro), e cada folíolo pega a luz num
   * ângulo próprio — eles não são coplanares, torcem ao longo do ráquis. O
   * segundo efeito é o mais forte visualmente, e é ele que faz a fronde
   * cintilar em vez de ficar parada.
   *
   * Aqui isso vira um valor por folíolo, e não um degradê liso: o degradê
   * sozinho continuaria sendo uma chapa, só que em dois tons.
   */
  desenha(
    c,
    (t, s) => {
      const base = 158 + t * 26
      const torce = (ruido(Math.round(t * (folioloS - 1)), s > 0 ? 91 : 92) - 0.5) * 34
      const v = Math.max(96, Math.min(238, base + torce))
      return `rgb(${Math.round(v * 0.84)},${Math.round(v)},${Math.round(v * 0.68)})`
    },
    '#d6ddc4',
    LARG,
    n * 0.017,
  )
  // No relevo o ráquis é a única coisa que sobressai de verdade: ele é uma haste
  // roliça e os folíolos são lâminas de papel penduradas nele. Exagerar o
  // folíolo aqui daria um acolchoado, que é o defeito de quem confunde mapa de
  // normal com mapa de altura de verdade.
  desenha(h, (t) => `rgb(${Math.round(150 + t * 30)},${Math.round(150 + t * 30)},${Math.round(150 + t * 30)})`, '#ffffff', LARG, n * 0.022)
  // Brilho: o ráquis é liso e lustroso, o folíolo é fosco. Escuro = liso.
  desenha(r, () => '#a6a6a6', '#4e4e4e', LARG, n * 0.02)

  const mapa = new THREE.CanvasTexture(cor)
  mapa.colorSpace = THREE.SRGBColorSpace
  mapa.anisotropy = ANISOTROPIA
  const alfa = new THREE.CanvasTexture(alf)
  alfa.anisotropy = ANISOTROPIA
  return { mapa, alfa, normal: normalDaAltura(alt, 0.9, 1, 1), rugosidade: acaba(rug, 1, 1, false) }
}

/**
 * CASCA — e ela existe porque tronco e galho estavam vestidos com o mapa da
 * RÉGUA DE DECK.
 *
 * Era reaproveitamento com uma desculpa plausível ("grão correndo no
 * comprimento é o que casca tem"), e é falso onde importa. Régua de deck é
 * madeira SERRADA: o grão é liso, paralelo e contínuo, porque a serra atravessou
 * os anéis. Casca é o lado de fora da árvore e faz o oposto — ela RACHA, porque
 * o tronco engrossa por dentro e a camada externa, que já é tecido morto, não
 * acompanha. O que se vê é fissura, não veio.
 *
 * Duas cascas, porque as duas árvores da cobertura não têm nada em comum:
 *
 * - `oliveira`: fissura funda e TORCIDA. Oliveira velha é retorcida de verdade,
 *   e o sulco acompanha a torção do lenho em espiral. Cinza-prateada, quase sem
 *   marrom.
 *
 * - `palmeira`: palmeira não tem casca — não tem câmbio, não engrossa, não
 *   racha. O que ela tem são as CICATRIZES DAS FRONDES CAÍDAS: anéis
 *   horizontais regulares, um por folha que morreu, subindo o estipe inteiro
 *   como uma escada. É a marca mais reconhecível do tronco dela, e a cena não
 *   tinha nenhuma.
 */
export function casca(tipo: 'oliveira' | 'palmeira'): Superficie {
  const n = 256
  const [cor, c] = tela(n)
  const [altura, h] = tela(n)
  const [rugo, r] = tela(n)

  c.fillStyle = tipo === 'oliveira' ? '#9a958a' : '#a09884'
  c.fillRect(0, 0, n, n)
  h.fillStyle = '#9a9a9a'
  h.fillRect(0, 0, n, n)
  r.fillStyle = '#e6e6e6'
  r.fillRect(0, 0, n, n)

  if (tipo === 'oliveira') {
    // A fissura desce em espiral: a mesma senoide desloca o x ao longo do y, e é
    // por isso que ela nunca fecha um retângulo com a vizinha.
    for (let i = 0; i < 34; i++) {
      const x0 = ruido(i, 12) * n
      const torce = (ruido(i, 13) - 0.5) * n * 0.22
      const larg = n * (0.006 + ruido(i, 14) * 0.016)
      const fundo = 0.35 + ruido(i, 15) * 0.5
      const traca = (ctx: CanvasRenderingContext2D, estilo: string, l: number) => {
        ctx.strokeStyle = estilo
        ctx.lineWidth = l
        ctx.lineCap = 'round'
        ctx.beginPath()
        for (let y = 0; y <= n; y += n / 16) {
          const x = x0 + Math.sin((y / n) * Math.PI * 2 + i) * torce
          if (y === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
      traca(c, `rgba(58,54,47,${fundo * 0.75})`, larg)
      traca(h, `rgba(0,0,0,${fundo})`, larg)
      // Fissura é fundo de sulco: cheia de pó e sem cera nenhuma, então mais
      // fosca que a crista. A crista é o que o tempo lustra.
      traca(r, 'rgba(255,255,255,0.7)', larg * 1.5)
    }
    // Placas: entre as fissuras a casca se solta em escamas largas e claras.
    for (let i = 0; i < 60; i++) {
      const x = ruido(i, 16) * n
      const y = ruido(i, 17) * n
      const raio = n * (0.02 + ruido(i, 18) * 0.05)
      const g = c.createRadialGradient(x, y, 0, x, y, raio)
      g.addColorStop(0, ruido(i, 19) > 0.5 ? 'rgba(206,201,188,0.30)' : 'rgba(96,90,79,0.24)')
      g.addColorStop(1, 'rgba(0,0,0,0)')
      c.fillStyle = g
      c.fillRect(x - raio, y - raio, raio * 2, raio * 2)
    }
  } else {
    // ANÉIS. Dez por repetição vertical: com o estipe repetindo 6 vezes ao longo
    // de 4,2 m, isso dá um anel a cada 7 cm, que é o passo real de uma palmeira
    // adulta. Anel espaçado demais vira bambu; junto demais vira rosca.
    const ANEIS = 10
    for (let i = 0; i < ANEIS; i++) {
      const y = (i / ANEIS) * n
      const alturaDoAnel = n * 0.026
      // A cicatriz é um degrau: sombra embaixo, aresta acesa em cima. Desenhar as
      // duas metades é o que a faz ler como relevo e não como listra pintada.
      c.fillStyle = 'rgba(74,68,56,0.42)'
      c.fillRect(0, y, n, alturaDoAnel)
      c.fillStyle = 'rgba(214,206,186,0.34)'
      c.fillRect(0, y + alturaDoAnel, n, alturaDoAnel * 0.6)
      h.fillStyle = 'rgba(0,0,0,0.55)'
      h.fillRect(0, y, n, alturaDoAnel)
      h.fillStyle = 'rgba(255,255,255,0.5)'
      h.fillRect(0, y + alturaDoAnel, n, alturaDoAnel * 0.6)
      r.fillStyle = 'rgba(255,255,255,0.5)'
      r.fillRect(0, y, n, alturaDoAnel)
    }
    // Fibra vertical fina por cima: o estipe é um feixe de fibras, e é isso que
    // ele mostra entre um anel e outro.
    for (let i = 0; i < 90; i++) {
      const x = ruido(i, 22) * n
      const op = 0.06 + ruido(i, 23) * 0.12
      c.strokeStyle = `rgba(66,60,49,${op})`
      h.strokeStyle = `rgba(0,0,0,${op * 0.8})`
      for (const ctx of [c, h]) {
        ctx.lineWidth = n * 0.004
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x + (ruido(i, 24) - 0.5) * n * 0.03, n)
        ctx.stroke()
      }
    }
  }

  return {
    map: acaba(cor, 1, 1, true),
    // Força alta: sulco de casca é FUNDO, e é o único lugar desta cena onde o
    // relevo exagerado ajuda — tronco liso é o que denuncia árvore de videogame.
    normalMap: normalDaAltura(altura, tipo === 'oliveira' ? 3.2 : 2.2, 1, 1),
    roughnessMap: acaba(rugo, 1, 1, false),
  }
}

/**
 * A PAREDE LAVADA DO ESCRITÓRIO — o mesmo problema do nicho do bar, e a mesma
 * família de solução.
 *
 * O fundo do escritório é um painel emissivo de 3 × 2,2 m, e uniforme ele lê como
 * uma chapa de papel creme. Interior iluminado não faz isso: a luz de um
 * escritório vem do TETO, então a parede é clara em cima e escurece descendo, e
 * é esse degradê que diz onde estão as luminárias sem precisar desenhá-las.
 *
 * A diferença para `brilhoDeNicho` é a forma da fonte. Lá são quatro fitas
 * lineares sob prateleiras, e o desenho é uma sequência de faixas; aqui é uma
 * cornija corrida no forro, e o desenho é uma rampa só. Duas funções em vez de
 * uma parametrizada porque os dois desenhos não têm nada em comum além de serem
 * degradês verticais — juntá-las produziria uma assinatura cheia de opções
 * mutuamente exclusivas.
 */
export function paredeLavada(): THREE.Texture {
  const n = 256
  const [cv, c] = tela(n)
  // Canvas cresce para baixo: y = 0 é o TOPO da parede, que é onde está a
  // cornija. Inverter isto poria a luz no rodapé.
  const rampa = c.createLinearGradient(0, 0, 0, n)
  rampa.addColorStop(0, '#fff3dd')
  rampa.addColorStop(0.12, '#f4e2c4')
  rampa.addColorStop(0.55, '#c9ab84')
  rampa.addColorStop(1, '#8d7355')
  c.fillStyle = rampa
  c.fillRect(0, 0, n, n)

  // A cornija em si: uma linha muito clara colada no forro. É ela que ancora o
  // degradê — sem um ponto onde a luz é máxima, a rampa lê como parede pintada
  // em duas cores.
  const cornija = c.createLinearGradient(0, 0, 0, n * 0.07)
  cornija.addColorStop(0, 'rgba(255,255,248,0.95)')
  cornija.addColorStop(1, 'rgba(255,255,248,0)')
  c.fillStyle = cornija
  c.fillRect(0, 0, n, n * 0.07)

  // Vinheta lateral, pelo mesmo motivo do nicho: parede dentro de uma caixa
  // recebe menos luz nos cantos, e sem isso ela encosta nas laterais com o mesmo
  // valor e o volume some.
  const lados = c.createLinearGradient(0, 0, n, 0)
  lados.addColorStop(0, 'rgba(58,42,26,0.4)')
  lados.addColorStop(0.16, 'rgba(58,42,26,0)')
  lados.addColorStop(0.84, 'rgba(58,42,26,0)')
  lados.addColorStop(1, 'rgba(58,42,26,0.4)')
  c.fillStyle = lados
  c.fillRect(0, 0, n, n)

  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = ANISOTROPIA
  return t
}

/**
 * O BRILHO DO NICHO DO BAR — e ele existe porque um painel aceso CHAPADO é a
 * coisa mais morta que se pode pôr numa cena.
 *
 * O fundo do nicho tem 4,9 × 2,27 m e é a maior superfície do bar. Emissivo
 * uniforme transforma isso num retângulo amarelo de valor único, e nenhuma
 * quantidade de garrafa na frente conserta — o olho lê a chapa primeiro.
 *
 * O que uma parede de garrafas retroiluminada de verdade tem é o DESENHO DA
 * FONTE. A luz não vem do painel inteiro: vem de uma fita escondida sob cada
 * prateleira. Então o que se vê é uma sequência de faixas quentes, uma por
 * prateleira, com o valor caindo no meio do caminho entre duas — e é essa
 * alternância que dá altura e profundidade ao nicho.
 *
 * `faixas` são as posições V de cada fita, de 0 (base) a 1 (topo). Quem chama
 * passa as alturas reais das prateleiras convertidas, para o desenho e a
 * marcenaria nunca saírem de registro.
 *
 * Serve de `map` e de `emissiveMap` ao mesmo tempo: o primeiro pinta e o segundo
 * modula a emissão, então a faixa clara é também a que mais acende.
 */
export function brilhoDeNicho(faixas: number[]): THREE.Texture {
  const n = 256
  const [cv, c] = tela(n)
  // Base escura: é o valor do fundo do nicho ENTRE as fitas, e é contra ele que
  // as faixas aparecem. Preto demais mataria o meio-tom; claro demais apaga a
  // faixa. Um terço do branco é onde os dois sobrevivem.
  c.fillStyle = '#4d3a22'
  c.fillRect(0, 0, n, n)

  for (const v of faixas) {
    // Canvas cresce para BAIXO e V para cima: a inversão é obrigatória, e errá-la
    // põe a luz mais forte no topo, que é o oposto do que uma fita sob prateleira
    // faz.
    const y = (1 - v) * n
    // A fita ilumina MAIS PARA CIMA que para baixo: ela fica sob a prateleira,
    // apontando para o vão de cima. Por isso o degradê é assimétrico — e é essa
    // assimetria que denuncia de que lado está a fonte.
    const g = c.createLinearGradient(0, y - n * 0.16, 0, y + n * 0.07)
    g.addColorStop(0, 'rgba(255,214,150,0)')
    g.addColorStop(0.72, 'rgba(255,226,172,0.92)')
    g.addColorStop(0.86, 'rgba(255,240,205,1)')
    g.addColorStop(1, 'rgba(255,214,150,0)')
    c.fillStyle = g
    c.fillRect(0, y - n * 0.17, n, n * 0.25)
  }

  // VINHETA NAS BORDAS. Nicho é uma caixa: as laterais recebem menos luz que o
  // meio, e sem esse escurecimento o painel encosta nos montantes com o mesmo
  // valor e a marcenaria some.
  const lados = c.createLinearGradient(0, 0, n, 0)
  lados.addColorStop(0, 'rgba(26,14,4,0.55)')
  lados.addColorStop(0.13, 'rgba(26,14,4,0)')
  lados.addColorStop(0.87, 'rgba(26,14,4,0)')
  lados.addColorStop(1, 'rgba(26,14,4,0.55)')
  c.fillStyle = lados
  c.fillRect(0, 0, n, n)

  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = ANISOTROPIA
  return t
}

/**
 * VÉU D'ÁGUA — a cascata que corre pela parede do fundo.
 *
 * Não dava para reaproveitar `normalDeAgua()`, e a razão é o que separa os dois
 * fenômenos. A lâmina da piscina é água PARADA: a ondulação nela é isotrópica,
 * vem de todo lado e não tem direção. Água que DESCE é o oposto — ela se
 * organiza em filetes verticais, porque a gravidade é a única força em jogo e a
 * tensão superficial junta o fluxo em cordões paralelos. Aplicar ondulação de
 * piscina numa parede daria a leitura de vidro texturado, não de cascata.
 *
 * Três coisas fazem o véu ler como água correndo:
 *
 * 1. OS CORDÕES. Filetes verticais de larguras diferentes, com uma ondulação
 *    lenta em x ao longo da descida — reta perfeita lê como listra pintada.
 * 2. A AERAÇÃO. Onde o fluxo é mais rápido ele arrasta ar e fica BRANCO. São as
 *    manchas claras alongadas no sentido da queda, e é isso que diz "movimento"
 *    numa imagem parada.
 * 3. O LADRILHAMENTO VERTICAL. A textura repete em V, e é essa repetição que
 *    permite animar a queda deslocando o `offset` — sem costura visível, porque
 *    os cordões nascem e morrem nas duas bordas.
 *
 * A repetição em U fica por conta de quem usa: a parede tem 30 m e o desenho
 * tem 1, então o cordão precisa de umas dezenas de repetições para ficar na
 * escala de um filete e não de uma calha.
 */
export function veuDagua(): Superficie {
  /**
   * 512 E NÃO 256, e o motivo é o que a textura passou a ter dentro dela.
   *
   * Com uma escala só de cordão, 256 bastava: o filete mais fino tinha 1 px e
   * era o menor detalhe existente. A versão em três oitavas põe filamentos de
   * um terço dessa largura, e a 256 eles caem abaixo do texel — viram ruído
   * cinza em vez de fio. Dobrar a resolução é o que torna a terceira oitava
   * visível; sem isso ela seria só custo.
   */
  const n = 512
  const [cor, c] = tela(n)
  const [altura, h] = tela(n)
  const [rugo, r] = tela(n)

  /**
   * O FUNDO É ESCURO, e este foi o erro da primeira versão.
   *
   * Eu pintei o véu de azul-claro, e o render devolveu um painel de vidro
   * jateado: uma superfície de valor uniforme, sem nada acontecendo nela. Água
   * não é clara — ela é quase PRETA, e o que se vê dela é o que ela REFLETE.
   * Numa parede ao entardecer isso quer dizer fundo escuro com filetes acesos,
   * e é o contraste entre os dois que o olho lê como movimento.
   *
   * Pintar de claro mata esse contraste duas vezes: some o escuro, e o brilho
   * especular deixa de ter contra o que aparecer.
   */
  c.fillStyle = '#5c757f'
  c.fillRect(0, 0, n, n)
  h.fillStyle = '#808080'
  h.fillRect(0, 0, n, n)
  // Água corrente é a superfície MAIS LISA desta cena: escuro no mapa de
  // rugosidade é liso, e é o reflexo especular que faz o véu acender contra o
  // céu do entardecer em vez de ler como parede pintada de azul.
  r.fillStyle = '#2e2e2e'
  r.fillRect(0, 0, n, n)

  /**
   * O cordão desce ondulando. `Math.sin` do y dá o serpenteio, e a fase por
   * cordão impede os 46 de ondularem juntos — o que seria uma cortina, não água.
   *
   * O traço é desenhado em SEGMENTOS e não com `quadraticCurveTo` porque ele
   * precisa atravessar a textura inteira de topo a base sem sobra: é a
   * continuidade nas duas bordas que faz o ladrilhamento vertical não costurar.
   */
  const cordao = (ctx: CanvasRenderingContext2D, i: number, estilo: string, largura: number) => {
    const x0 = ruido(i, 55) * n
    const amplitude = 1.5 + ruido(i, 56) * 5
    const freq = 1 + Math.floor(ruido(i, 57) * 3)
    ctx.strokeStyle = estilo
    ctx.lineWidth = largura
    ctx.lineCap = 'round'
    ctx.beginPath()
    for (let y = 0; y <= n; y += 6) {
      const x = x0 + Math.sin((y / n) * Math.PI * 2 * freq + i) * amplitude
      if (y === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }

  /**
   * ═══ TRÊS OITAVAS, E NÃO UMA ═══
   *
   * A versão anterior tinha 46 cordões de uma faixa de largura só. Isso dá uma
   * superfície ESTATISTICAMENTE UNIFORME: qualquer recorte dela se parece com
   * qualquer outro, e superfície uniforme não lê como água — lê como tecido.
   *
   * Água caindo numa parede se organiza em três escalas ao mesmo tempo, e as
   * três estão sempre visíveis juntas:
   *
   *  1. O LENÇOL. Metros de largura. É onde a vazão se concentra por causa da
   *     soleira — nenhuma soleira é perfeitamente nivelada, então sempre há
   *     trechos com mais e com menos água. É a oitava que faltava, e é a que
   *     dá ao véu uma composição em vez de uma trama.
   *  2. O CORDÃO. Centímetros. A tensão superficial junta o fluxo em filetes
   *     paralelos, e é o cordão que pega o sol de raspão.
   *  3. O FILAMENTO. Milímetros. O fio que se desprende do cordão. É ele que
   *     impede o véu de ficar liso entre um cordão e outro quando a câmera
   *     chega perto.
   *
   * Sem a escala grande, o olho não tem em que pousar; sem a pequena, a
   * superfície desmancha de perto. Uma oitava só falha nas duas pontas.
   */

  // ── 1. LENÇÓIS: as faixas largas onde a vazão se concentra ──
  // Quase nada na cor e bastante no RELEVO: o lençol não é mais claro que o
  // resto, ele é mais GROSSO — e o que se vê da espessura é a sombra na borda.
  for (let i = 0; i < 7; i++) {
    const largura = n * (0.05 + ruido(i, 70) * 0.09)
    cordao(h, i * 7 + 3, `rgba(255,255,255,${0.14 + ruido(i, 71) * 0.12})`, largura)
    cordao(c, i * 7 + 3, `rgba(200,224,234,${0.07 + ruido(i, 72) * 0.07})`, largura)
    // Água mais grossa é água mais LISA: onde o lençol é cheio, o fluxo é
    // laminar e o reflexo fica inteiro. Escuro no mapa de rugosidade.
    cordao(r, i * 7 + 3, 'rgba(0,0,0,0.5)', largura)
  }

  // ── 2. CORDÕES ──
  for (let i = 0; i < 46; i++) {
    const largura = n * (0.004 + ruido(i, 58) * 0.014)
    // O cordão é uma CRISTA no relevo (claro) com um vale de cada lado — é esse
    // par que produz o filete de luz correndo na vertical.
    cordao(h, i, `rgba(255,255,255,${0.3 + ruido(i, 59) * 0.5})`, largura)
    cordao(h, i, 'rgba(0,0,0,0.28)', largura * 2.6)
    // Dois traços por cordão na cor: a crista acesa e uma sombra do lado. É o
    // par claro-escuro que dá volume ao filete — só o claro daria um risco.
    cordao(c, i, `rgba(233,246,252,${0.34 + ruido(i, 60) * 0.5})`, largura)
    cordao(c, i, 'rgba(16,30,38,0.32)', largura * 3)
    cordao(r, i, `rgba(120,120,120,${0.2 + ruido(i, 61) * 0.3})`, largura * 1.8)
  }

  // ── 3. FILAMENTOS: o fio que se desprende do cordão ──
  // Só na cor e de leve no relevo. Um filamento de meio milímetro não tem
  // espessura que projete sombra; o que ele tem é brilho.
  for (let i = 0; i < 110; i++) {
    const largura = n * (0.0015 + ruido(i, 73) * 0.0028)
    cordao(c, i * 3 + 101, `rgba(240,250,255,${0.2 + ruido(i, 74) * 0.36})`, largura)
    cordao(h, i * 3 + 101, `rgba(255,255,255,${0.12 + ruido(i, 75) * 0.2})`, largura)
  }

  /**
   * ═══ AERAÇÃO — e ela agora entra TAMBÉM no mapa de rugosidade ═══
   *
   * Manchas brancas esticadas na vertical: redondas leriam como bolha, e o
   * alongamento no sentido da queda é o que diz velocidade.
   *
   * O QUE FALTAVA ERA A RUGOSIDADE. Água aerada é branca porque deixou de ser
   * água e virou espuma — milhões de superfícies pequenas em ângulos aleatórios.
   * Isso é a definição de superfície RUGOSA, e o mapa de rugosidade estava liso
   * por igual em toda a textura. O resultado é que o brilho especular corria
   * inteiro por cima da espuma, como se ela fosse vidro.
   *
   * Pintando a mesma mancha clara no mapa de rugosidade, o reflexo MORRE
   * exatamente onde a água embranquece — e é esse contraste entre trecho
   * espelhado e trecho fosco, dentro da mesma lâmina, que separa cascata de
   * plástico texturado. É de graça: a mancha já estava sendo calculada.
   */
  // 48 e não 34: com o ladrilho passando de 1,4 m para 3,2 m, cada mancha ficou
  // 2,3 vezes maior mas também ficou 2,3 vezes mais rara por metro de parede.
  // Mantendo a contagem, a aeração teria sumido justamente na rodada em que ela
  // finalmente ganhou tamanho para aparecer.
  for (let i = 0; i < 48; i++) {
    const x = ruido(i, 62) * n
    const y = ruido(i, 63) * n
    const w = n * (0.01 + ruido(i, 64) * 0.025)
    const alt = n * (0.06 + ruido(i, 65) * 0.18)
    for (const [ctx, forte] of [
      [c, 0.8],
      [r, 0.66],
    ] as const) {
      ctx.save()
      ctx.translate(x, y)
      ctx.scale(1, alt / w)
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, w)
      g.addColorStop(0, `rgba(255,255,255,${forte})`)
      g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g
      ctx.fillRect(-w, -w, w * 2, w * 2)
      ctx.restore()
    }
  }

  return {
    map: acaba(cor, 1, 1, true),
    // Força 2,2: o cordão precisa de relevo forte para pegar o sol de raspão. É
    // ele que desenha o filete brilhante que se lê como água descendo.
    normalMap: normalDaAltura(altura, 2.2, 1, 1),
    roughnessMap: acaba(rugo, 1, 1, false),
  }
}

/**
 * MASSA DE FOLHAGEM — o miolo da copa, que era um poliedro cinza.
 *
 * O NÚCLEO DA OLIVEIRA são quarenta icosaedros sólidos, e a intenção deles está
 * certa: sem massa escura por trás, vê-se o céu através da árvore inteira e ela
 * perde peso; com ela, as folhas chatas ficam recortadas contra algo.
 *
 * O que estava errado era a SUPERFÍCIE. `IcosahedronGeometry(…, 0)` tem vinte
 * faces, e com `flatShading` cada uma vira um plano de valor único. Escalado
 * para 46 cm de raio isso não lê como folhagem: lê como pedra lapidada. No zoom
 * aparecia um poliedro cinza-esverdeado dentro da copa.
 *
 * A saída não é suavizar — esfera lisa lê como bola de bilhar, o mesmo erro com
 * outra cara. É dar à massa a única coisa que identifica folhagem vista de
 * longe: um mosqueado de muitas folhas sobrepostas, com claro e escuro na escala
 * da FOLHA e não na da esfera.
 *
 * O desenho é feito de folhas de verdade — dezenas de lanceoladas em ângulos e
 * verdes diferentes — e não de ruído. Ruído dá granulado uniforme; folha sobre
 * folha dá AGLOMERADO, com vãos escuros entre grupos, que é o que a copa tem.
 */
export function massaDeFolhagem(): Superficie {
  const n = 256
  const [cor, c] = tela(n)
  const [altura, h] = tela(n)
  const [rugo, r] = tela(n)

  // O fundo é o VÃO entre folhas: quase preto, e é dele que vem a profundidade.
  // Começar de um verde médio daria uma massa chapada com folhas por cima.
  c.fillStyle = '#26311f'
  c.fillRect(0, 0, n, n)
  h.fillStyle = '#3c3c3c'
  h.fillRect(0, 0, n, n)
  r.fillStyle = '#d2d2d2'
  r.fillRect(0, 0, n, n)

  /** Uma folha do mosqueado: lanceolada, num ângulo qualquer. */
  const folhinha = (ctx: CanvasRenderingContext2D, i: number, estilo: string, escala: number) => {
    const x = ruido(i, 801) * n
    const y = ruido(i, 802) * n
    const a = ruido(i, 803) * Math.PI * 2
    const comp = n * (0.045 + ruido(i, 804) * 0.075) * escala
    const larg = comp * (0.3 + ruido(i, 805) * 0.22)
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(a)
    ctx.fillStyle = estilo
    ctx.beginPath()
    ctx.moveTo(-comp / 2, 0)
    ctx.quadraticCurveTo(0, -larg, comp / 2, 0)
    ctx.quadraticCurveTo(0, larg, -comp / 2, 0)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  /**
   * TRÊS CAMADAS, DA MAIS ESCURA PARA A MAIS CLARA, e a ordem é o efeito.
   *
   * Folha que está por baixo recebe menos luz. Desenhando as escuras primeiro e
   * as claras por cima, as claras cobrem parcialmente as escuras e o que sobra
   * das escuras são os VÃOS — exatamente a relação que existe numa copa. Na
   * ordem inversa sai uma massa clara salpicada de manchas escuras, que lê como
   * folha doente.
   *
   * O ladrilhamento é garantido desenhando cada camada quatro vezes, deslocada
   * meia textura em cada direção: folha cortada na borda direita reaparece na
   * esquerda. Sem isso a emenda vira uma linha de vãos escuros.
   */
  const camadas = [
    { quantas: 150, tinta: '#33452a', relevo: 'rgba(0,0,0,0.5)', escala: 1.15 },
    { quantas: 130, tinta: '#4a6138', relevo: 'rgba(128,128,128,0.6)', escala: 1.0 },
    { quantas: 95, tinta: '#6a8351', relevo: 'rgba(255,255,255,0.55)', escala: 0.85 },
  ]
  for (const [ci, camada] of camadas.entries()) {
    for (const [dx, dy] of [
      [0, 0],
      [n, 0],
      [0, n],
      [n, n],
    ] as const) {
      c.save()
      h.save()
      c.translate(dx - n / 2, dy - n / 2)
      h.translate(dx - n / 2, dy - n / 2)
      for (let i = 0; i < camada.quantas; i++) {
        folhinha(c, i + ci * 1000, camada.tinta, camada.escala)
        folhinha(h, i + ci * 1000, camada.relevo, camada.escala)
      }
      c.restore()
      h.restore()
    }
  }

  return {
    map: acaba(cor, 1, 1, true),
    // Força 1,8: o relevo aqui é a folha inteira, não um poro. Ele precisa ser
    // forte o bastante para a esfera deixar de parecer uma esfera.
    normalMap: normalDaAltura(altura, 1.8, 1, 1),
    roughnessMap: acaba(rugo, 1, 1, false),
  }
}

/**
 * LÂMINA DE GRAMÍNEA — a última planta da cobertura sem textura nenhuma.
 *
 * A gramínea era um material branco liso com a cor na instância: sem mapa, sem
 * relevo, sem brilho. O resultado é o que se vê no recorte da jardineira — as
 * touceiras leem como PALHA, feixes de varetas de um bege só, porque a lâmina
 * inteira recebe um valor único e nada acontece ao longo dela.
 *
 * Três coisas fazem uma folha de gramínea ser reconhecível, e nenhuma delas
 * estava aqui:
 *
 * 1. A DOBRA. A lâmina é dobrada em V ao longo do comprimento — é assim que uma
 *    fita de 3 mm de espessura fica de pé sem tombar. A dobra corre um lado ao
 *    sol e o outro na sombra, e é a coisa que mais denuncia gramínea.
 *
 * 2. O DEGRADÊ DA BASE PARA A PONTA. A base fica na sombra da touceira e é
 *    escura; a ponta é a que seca primeiro e é clara. Valor constante é o que
 *    faz o feixe parecer uma vassoura.
 *
 * 3. AS ESTRIAS. A folha é fibrosa no comprimento, com nervuras paralelas finas.
 *
 * Tudo em VALOR, quase sem matiz: a cor continua vindo da instância. Mesma regra
 * de sempre — textura é padrão, cor é tinta.
 */
export function graminea(): Superficie & { alfa: THREE.Texture } {
  const n = 64
  const [cor, c] = tela(n)
  const [altura, h] = tela(n)
  const [rugo, r] = tela(n)

  // v corre ao longo da lâmina (base embaixo no canvas, ponta em cima), porque é
  // assim que a face grande de uma `BoxGeometry` mapeia.
  const aoLongo = c.createLinearGradient(0, n, 0, 0)
  aoLongo.addColorStop(0, '#78806c')
  aoLongo.addColorStop(0.55, '#b9bfa8')
  aoLongo.addColorStop(1, '#d8dbc2')
  c.fillStyle = aoLongo
  c.fillRect(0, 0, n, n)

  // A dobra: clara na crista, escura nas duas abas. No mapa de cor ela é sutil —
  // o trabalho pesado é do relevo, logo abaixo.
  const dobra = (ctx: CanvasRenderingContext2D, aba: string, crista: string) => {
    const g = ctx.createLinearGradient(0, 0, n, 0)
    g.addColorStop(0, aba)
    g.addColorStop(0.5, crista)
    g.addColorStop(1, aba)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, n, n)
  }
  dobra(c, 'rgba(40,48,32,0.32)', 'rgba(255,255,255,0.18)')

  h.fillStyle = '#808080'
  h.fillRect(0, 0, n, n)
  dobra(h, 'rgba(0,0,0,0.75)', 'rgba(255,255,255,0.85)')

  // Estrias: finas, paralelas e de contraste baixo. Aparecem nos três mapas
  // porque fibra é relevo, cor e brilho ao mesmo tempo.
  r.fillStyle = '#8a8a8a'
  r.fillRect(0, 0, n, n)
  dobra(r, 'rgba(224,224,224,0.6)', 'rgba(56,56,56,0.7)')
  for (let i = 0; i < 9; i++) {
    const x = n * 0.1 + (i / 8) * n * 0.8
    const op = 0.1 + ruido(i, 33) * 0.14
    c.strokeStyle = `rgba(52,60,42,${op})`
    h.strokeStyle = `rgba(0,0,0,${op * 1.4})`
    r.strokeStyle = `rgba(230,230,230,${op})`
    for (const ctx of [c, h, r]) {
      ctx.lineWidth = n * 0.012
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, n)
      ctx.stroke()
    }
  }

  /**
   * O RECORTE QUE AFINA A LÂMINA ATÉ A PONTA.
   *
   * A gramínea é uma `BoxGeometry` escalada em Y: uma fita de largura constante
   * que termina em CORTE RETO. Isso é o que fazia a touceira ler como feixe de
   * varetas mesmo depois de a cor ficar verde — nenhuma folha do mundo termina
   * numa aresta perpendicular.
   *
   * Lâmina de gramínea tem a largura máxima no primeiro terço e afina daí até
   * uma ponta fina. Recortar isso por alfa muda a SILHUETA sem tocar na
   * geometria, que continua sendo dois triângulos por face.
   *
   * O expoente 1,6 no afinamento é o que separa lâmina de triângulo: com
   * decaimento linear a folha vira uma cunha reta; com expoente ela guarda
   * largura no meio e fecha depressa perto do ápice, que é a curva real.
   */
  const [alf, a] = tela(n)
  a.fillStyle = '#000000'
  a.fillRect(0, 0, n, n)
  a.fillStyle = '#ffffff'
  a.beginPath()
  const PASSOS = 24
  for (let i = 0; i <= PASSOS; i++) {
    const v = i / PASSOS
    // A base também estreita um pouco: a lâmina sai de uma bainha, não de uma
    // fita cortada.
    const abre = Math.min(1, v / 0.14)
    const fecha = (1 - Math.max(0, (v - 0.3) / 0.7)) ** 1.6
    const meia = 0.5 * n * Math.min(abre, 0.18 + fecha * 0.82)
    const y = (1 - v) * n
    if (i === 0) a.moveTo(n / 2 - meia, y)
    else a.lineTo(n / 2 - meia, y)
  }
  for (let i = PASSOS; i >= 0; i--) {
    const v = i / PASSOS
    const abre = Math.min(1, v / 0.14)
    const fecha = (1 - Math.max(0, (v - 0.3) / 0.7)) ** 1.6
    const meia = 0.5 * n * Math.min(abre, 0.18 + fecha * 0.82)
    a.lineTo(n / 2 + meia, (1 - v) * n)
  }
  a.closePath()
  a.fill()

  return {
    map: acaba(cor, 1, 1, true),
    // Força alta porque a dobra é o gesto inteiro da peça: a lâmina tem 3 cm de
    // largura e 1 px na tela, e o que precisa sobreviver a essa redução é a
    // diferença de luz entre as duas abas, não a estria.
    normalMap: normalDaAltura(altura, 2.6, 1, 1),
    roughnessMap: acaba(rugo, 1, 1, false),
    alfa: acaba(alf, 1, 1, false),
  }
}

/**
 * ONDULAÇÃO DA ÁGUA — só o mapa de normal.
 *
 * A água não precisa de mapa de cor (a cor é uniforme e mora no material) nem de
 * rugosidade: precisa de RELEVO. O que torna uma lâmina reconhecível como água é
 * o reflexo QUEBRANDO — a mesma imagem do céu, picotada pela ondulação. Com a
 * superfície perfeitamente lisa, o reflexo é um espelho limpo e a lâmina lê como
 * vidro ou como chapa.
 *
 * A soma de seis ondas de frequências incomensuráveis evita o padrão de grade
 * que duas ondas perpendiculares produzem — grade lê como toalha de plástico.
 */
/**
 * ═══ CÁUSTICAS — a teia de luz no fundo da piscina ═══
 *
 * É O DETALHE QUE FALTAVA PARA A PISCINA TER FUNDO. O piso do tanque era um
 * plano de cor chapada, e cor chapada debaixo d'água não existe: a superfície
 * ondulada funciona como uma lente irregular, concentrando a luz do sol em
 * filamentos que se cruzam e se refazem. Sem eles, a lâmina pode estar
 * perfeita e a piscina continua parecendo um tampo de acrílico azul.
 *
 * E É A ÚNICA COISA NA CENA QUE PROVA QUE A ÁGUA TEM ESPESSURA. Reflexo na
 * superfície diz que existe uma superfície; cáustica no fundo diz que existe um
 * VOLUME entre a superfície e ele. São informações diferentes, e a segunda é a
 * que estava ausente.
 *
 * COMO SE DESENHA UMA SEM SIMULAR REFRAÇÃO: o que caracteriza a cáustica é ser
 * uma CRISTA — uma linha fina e muito clara com queda abrupta dos dois lados,
 * não uma mancha. Some-se um punhado de ondas, tome-se a distância do resultado
 * a zero e eleve-se `1 − d` a uma potência alta: o expoente esmaga tudo que não
 * está quase exatamente sobre a linha de nível, e sobra a teia.
 *
 * As frequências são INTEIRAS em número de ciclos por ladrilho, e isso não é
 * detalhe: qualquer frequência fracionária quebra a emenda da textura, e o
 * fundo da piscina é uma superfície grande com repetição visível.
 *
 * A terceira onda é DEFORMADA pela primeira (`+ w1 * 1.3` dentro do seno). Sem
 * isso as três somas dão um padrão de losangos regulares, que lê como tela de
 * arame. A deformação é o que curva as linhas e faz a teia parecer orgânica —
 * e ela preserva o ladrilhamento, porque a deformação também é periódica.
 */
export function causticas(): THREE.Texture {
  const n = 256
  const [cv, ctx] = tela(n)
  const img = ctx.createImageData(n, n)
  const T = (Math.PI * 2) / n
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      /**
       * AS QUATRO FREQUÊNCIAS NÃO PODEM TER FATOR COMUM, e a primeira versão
       * tinha: (3,2), (2,−4), (5,3) e (4,−1) caem numa rede de losangos porque
       * as componentes se alinham periodicamente. O render devolveu uma tela de
       * arame, que é o defeito que a deformação existia para evitar — e a
       * deformação sozinha não resolve, porque ela curva as linhas sem mudar a
       * grade que as organiza.
       *
       * Com (3,2), (2,−5), (7,3) e (5,−4) as direções são mutuamente primas e a
       * teia só se fecha no ladrilho inteiro. A deformação, agora mais forte,
       * faz o resto.
       */
      const w1 = Math.sin((3 * x + 2 * y) * T)
      const w2 = Math.sin((2 * x - 5 * y) * T + 1.7)
      const w3 = Math.sin((7 * x + 3 * y) * T + w1 * 2.1)
      const w4 = Math.sin((5 * x - 4 * y) * T + w2 * 1.6)
      const d = Math.abs(w1 + w2 + w3 + w4) / 4
      // Potência 9: é ela que transforma a soma de ondas num FILAMENTO. Com
      // expoente baixo o resultado é uma mancha suave — bonita e inútil, porque
      // cáustica sem borda dura não se distingue de reflexo difuso.
      const v = Math.pow(Math.max(0, 1 - d), 9)
      const i = (y * n + x) * 4
      // Levemente esverdeada: a luz que chega ao fundo atravessou a massa
      // d'água, que come o vermelho primeiro. Cáustica branca lê como projeção.
      img.data[i] = v * 205
      img.data[i + 1] = v * 255
      img.data[i + 2] = v * 236
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return acaba(cv, 1, 1, true)
}

export function normalDeAgua(): THREE.Texture {
  const n = 256
  const [alt, a] = tela(n)
  const img = a.createImageData(n, n)
  const ondas = [
    [0.09, 0.03, 1.0],
    [0.04, 0.11, 0.8],
    [0.15, -0.07, 0.5],
    [-0.06, 0.17, 0.4],
    [0.23, 0.19, 0.22],
    [0.31, -0.27, 0.14],
  ] as const
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      let h = 0
      let soma = 0
      for (const [fx, fy, amp] of ondas) {
        h += Math.sin(x * fx + y * fy) * amp
        soma += amp
      }
      const v = (h / soma) * 0.5 + 0.5
      const i = (y * n + x) * 4
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v * 255
      img.data[i + 3] = 255
    }
  }
  a.putImageData(img, 0, 0)
  return normalDaAltura(alt, 0.9, 3, 1)
}
