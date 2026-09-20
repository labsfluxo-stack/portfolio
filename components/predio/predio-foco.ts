/**
 * ═══ PROFUNDIDADE DE CAMPO ═══
 *
 * Cinema tem lente, e lente tem UM plano de foco. Tudo que está antes ou depois
 * dele desenha um círculo em vez de um ponto, e é o tamanho desse círculo que o
 * olho lê como distância. Render sem lente devolve a cena inteira nítida — o que
 * nenhuma câmera do mundo faz, e é um dos tells mais fortes que existem.
 *
 * ═══ A VERSÃO BARATA FOI DESCARTADA, E VALE DIZER POR QUÊ ═══
 *
 * A primeira ideia era "tilt-shift": borrar por ALTURA DE TELA em vez de por
 * profundidade. A cena é um corte visto de frente, então para o plano do chão a
 * altura na tela e a distância andam juntas — deck embaixo perto, cidade em cima
 * longe. Custaria dois passes de tela e nenhuma leitura de profundidade.
 *
 * Só que a correlação QUEBRA em tudo que é alto. As oliveiras ficam no terço
 * superior da tela e estão a oito metros, no meio da cena; a cidade também fica
 * no terço superior e está a quarenta. Pela altura, as duas seriam borradas
 * igual — copa desfocada com a jardineira nítida logo abaixo dela, no mesmo
 * objeto. Aproximação que falha justamente no assunto do quadro não é
 * aproximação, é defeito.
 *
 * ═══ A PROFUNDIDADE DE VERDADE, SEM UM SEGUNDO DESENHO DA CENA ═══
 *
 * O caminho óbvio seria o `BokehPass`, que renderiza a cena de novo num material
 * de profundidade. Isso é uma passagem de geometria inteira — e a oclusão de
 * ambiente já cobra uma. Duas seria caro demais para o que a lente devolve.
 *
 * Em vez disso, o alvo de render do composer ganha um `DepthTexture` próprio: o
 * desenho normal da cena JÁ escreve profundidade no z-buffer, e pedir que ela
 * seja guardada numa textura não custa desenho nenhum, só memória. A lente lê
 * dali. É informação que a cena sempre produziu e sempre jogou fora.
 *
 * O CÍRCULO DE CONFUSÃO É ÓPTICA, não um degradê inventado: ele cresce com
 * |1/foco − 1/distância|, que é a fórmula da lente fina. A consequência que
 * importa para o enquadramento é a assimetria — o desfoque cresce DEPRESSA para
 * quem está mais perto que o foco e satura devagar para quem está mais longe. É
 * por isso que numa foto o fundo distante fica todo igualmente macio enquanto o
 * primeiro plano se desmancha em poucos centímetros.
 */
import * as THREE from 'three'

/**
 * ═══ OS NÚMEROS DA LENTE, E O PRIMEIRO CONJUNTO ESTAVA MUITO ERRADO ═══
 *
 * A primeira tentativa (foco 11 m, abertura 0,85) produziu uma lente MACRO: no
 * render, a única coisa nítida era a lâmina da piscina. Escritório, bar, jardim,
 * guarda-corpo e cidade — tudo borrado. A profundidade de campo tinha uns três
 * metros, num quadro cujo assunto se espalha de 5 a 17.
 *
 * A mecânica estava certa (a profundidade era lida corretamente, o bokeh das
 * janelas saiu redondo e bonito); o erro foi de ENQUADRAMENTO. Isto é um plano
 * geral de apresentação, não um retrato: quem fotografa um terraço ao
 * entardecer FECHA o diafragma, porque o assunto é a profundidade inteira da
 * cena. Abertura larga seria dizer que só a água importa.
 *
 * O ajuste, conferido peça por peça contra a distância real de cada uma:
 *
 *   deck da frente     4,8 m   ~4 px   macio, e é de propósito — primeiro plano
 *                                       levemente fora de foco é o que dá
 *                                       camada à imagem
 *   guarda-corpo       5,6 m   ~4 px
 *   lâmina d'água     10,4 m   nítida
 *   bar               13,5 m   nítida
 *   escritório/jardim 16   m   nítida
 *   cidade            40 m +   ~3 px   macia, com as janelas virando discos
 *
 * E o primeiro plano sair MAIS macio que a cidade não é engano: com foco a
 * 12 m, o deck a 4,8 está oticamente mais longe do plano de foco do que a
 * cidade a 40 — o termo 1/z dispara perto e satura longe. É o que uma lente de
 * verdade faz, e é por isso que a fórmula ficou sendo a da lente fina em vez de
 * um degradê ajustado a olho.
 */
export const FOCO = {
  /**
   * Distância do plano de foco, em metros a partir da câmera. 12 m põe o plano
   * entre a lâmina (10,4) e o bar (13,5) — o miolo do assunto.
   */
  distancia: 12,
  /** Quanto a lente abre. Maior = menos profundidade de campo. */
  abertura: 0.28,
  /** Teto do raio de borrão, em fração da altura da tela. */
  tetoDeBorrao: 0.011,
}

/**
 * Doze amostras num disco em espiral de Fibonacci.
 *
 * Disco em espiral e não anéis concêntricos: anel produz padrão visível quando o
 * borrão fica grande, e o padrão lê como artefato. A espiral distribui as
 * amostras sem repetir ângulo, e doze é onde o custo para de pagar — abaixo
 * disso aparece banda, acima ninguém distingue.
 *
 * Gerado em tempo de módulo e escrito no shader como constante: doze senos e
 * cossenos por pixel seria calcular, a cada quadro e para cada ponto da tela, um
 * número que nunca muda.
 */
const DISCO = Array.from({ length: 12 }, (_, i) => {
  const t = (i + 0.5) / 12
  const raio = Math.sqrt(t)
  const ang = i * 2.39996323 // ângulo áureo
  return `vec2( ${(Math.cos(ang) * raio).toFixed(4)}, ${(Math.sin(ang) * raio).toFixed(4)} )`
}).join(',\n    ')

export function shaderDeFoco(camera: THREE.PerspectiveCamera) {
  return {
    name: 'FocoDoPredio',
    uniforms: {
      tDiffuse: { value: null as unknown },
      tDepth: { value: null as unknown },
      perto: { value: camera.near },
      longe: { value: camera.far },
      distanciaDeFoco: { value: FOCO.distancia },
      abertura: { value: FOCO.abertura },
      tetoDeBorrao: { value: FOCO.tetoDeBorrao },
      proporcao: { value: 1 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }`,
    // NENHUMA CRASE DAQUI PARA BAIXO: isto e um template literal, e uma crase
    // fecha a string no meio do shader. Ja derrubou o servidor de dev duas vezes
    // nesta feature. Escreva nomes de variavel sem aspas de nenhum tipo.
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform sampler2D tDepth;
      uniform float perto;
      uniform float longe;
      uniform float distanciaDeFoco;
      uniform float abertura;
      uniform float tetoDeBorrao;
      uniform float proporcao;
      varying vec2 vUv;

      const vec2 disco[12] = vec2[12](
    ${DISCO}
      );

      // Profundidade do buffer para distancia em metros. O z-buffer de uma
      // projecao em perspectiva NAO e linear: ele gasta metade da precisao no
      // primeiro decimo do alcance. Sem esta conversao, tudo alem de uns poucos
      // metros cairia no mesmo valor e a lente nao teria o que distinguir.
      float metros( vec2 uv ) {
        float d = texture2D( tDepth, uv ).x;
        float ndc = d * 2.0 - 1.0;
        return ( 2.0 * perto * longe ) / ( longe + perto - ndc * ( longe - perto ) );
      }

      void main() {
        float z = metros( vUv );
        // A formula da lente fina. O modulo da diferenca de inversos e o que
        // produz a assimetria: perto do observador o termo 1/z cresce rapido,
        // longe dele ele satura — e e por isso que o fundo distante fica todo
        // igualmente macio e o primeiro plano se desmancha em poucos passos.
        float circulo = abs( 1.0 / distanciaDeFoco - 1.0 / max( z, 0.05 ) ) * distanciaDeFoco;
        float raio = min( circulo * abertura, 1.0 ) * tetoDeBorrao;

        // Abaixo de meio pixel nao ha o que borrar, e as doze amostras seriam
        // doze leituras do mesmo texel. O desvio economiza a banda inteira na
        // faixa em foco, que costuma ser a maior parte da tela.
        if ( raio < 0.0006 ) {
          gl_FragColor = texture2D( tDiffuse, vUv );
          return;
        }

        vec4 soma = vec4( 0.0 );
        for ( int i = 0; i < 12; i++ ) {
          vec2 salto = disco[ i ] * raio * vec2( 1.0 / proporcao, 1.0 );
          vec2 uv = vUv + salto;
          // SO ENTRA QUEM ESTA A FRENTE OU NO MESMO PLANO. Sem esta guarda, um
          // fundo desfocado puxa cor de um objeto NITIDO na frente dele e
          // desenha um halo do objeto ao redor da silhueta — o artefato classico
          // de vazamento de profundidade. Amostra mais proxima que o centro so
          // participa se ela mesma estiver desfocada.
          float zAmostra = metros( uv );
          float peso = zAmostra >= z - 0.15 ? 1.0 : 0.15;
          soma += vec4( texture2D( tDiffuse, uv ).rgb, 1.0 ) * peso;
        }
        gl_FragColor = vec4( soma.rgb / max( soma.a, 0.0001 ), 1.0 );
      }`,
  }
}
