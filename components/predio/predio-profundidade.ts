/**
 * ═══ O PASSE DE PROFUNDIDADE: OCLUSÃO E LENTE, JUNTAS ═══
 *
 * Este módulo nasceu de duas medições e de um erro nomeado pelo próprio WebGL.
 * Ele substitui `predio-foco.ts` e `predio-oclusao.ts`, que existiram como dois
 * passes separados por algumas horas.
 *
 * ═══ 1. POR QUE A OCLUSÃO DEIXOU DE SER O `GTAOPass` ═══
 *
 * Medido em GPU de verdade, com o MESMO `dpr` nos dois lados para isolar a
 * variável:
 *
 *   degrau 1 (sem oclusão)   450 chamadas   1.033k tri   p95 1,04 x vsync
 *   degrau 0 (com oclusão)   888 chamadas   2.066k tri   p95 2,02 x vsync
 *
 * Exatamente o dobro de chamadas, e um quadro perdido a cada vinte na mesma
 * resolução. O `GTAOPass` desenha a CENA INTEIRA outra vez para montar o mapa de
 * profundidade e normais: o custo dele é GEOMETRIA.
 *
 * E antes disso eu tentei o levante errado — calcular a oclusão em meia
 * resolução. Não mudou nada (33,5 ms viraram 33,6), porque meia resolução corta
 * FRAGMENTO e as 438 chamadas a mais continuavam lá. Atacar a metade errada da
 * conta é o tipo de erro que só a medição desfaz.
 *
 * ═══ 1b. O RESULTADO, MEDIDO NA MESMA MÁQUINA ═══
 *
 *   degrau 0, antes    888 chamadas   2.066k tri   p95 2,02 x vsync   PERDE
 *   degrau 0, depois   451 chamadas   1.033k tri   p95 1,02 x vsync   LIMPO
 *
 * As chamadas caíram para 451, e o "1" a mais sobre as 450 do degrau sem
 * oclusão é exatamente o quadrilátero de tela cheia deste passe: a conta fecha
 * na unidade. Os triângulos caíram pela metade — a segunda passagem de
 * geometria sumiu.
 *
 * E o número que surpreende: o degrau 0 roda em `dpr` 2,0 contra 1,25 do degrau
 * 1, ou seja 2,56 vezes mais fragmento, MAIS a oclusão e a lente — e mesmo
 * assim o p95 dele (1,02) ficou melhor que o do degrau 1 (1,03). Isso diz que a
 * cena nunca esteve limitada por fragmento; estava limitada por CHAMADA DE
 * DESENHO. Vale guardar para a próxima vez que algo parecer caro aqui.
 *
 * ═══ 2. POR QUE AS DUAS NUM PASSE SÓ, E NÃO EM DOIS ═══
 *
 * Com a oclusão e a lente como passes separados, o navegador acusou:
 *
 *   GL_INVALID_OPERATION: glDrawArrays: Feedback loop formed between
 *   Framebuffer and active Texture.
 *
 * A causa está na alternância do `EffectComposer`. `RenderPass` tem
 * `needsSwap = false` e desenha no readBuffer — que é o alvo que carrega o
 * `DepthTexture`. Cada `ShaderPass` seguinte alterna:
 *
 *   1º passe   lê rt1, escreve rt2   seguro
 *   2º passe   lê rt2, escreve rt1   amostra a profundidade DE rt1 enquanto
 *                                    escreve NELE — laço de realimentação
 *
 * Ou seja: só pode existir UM passe que leia profundidade, e ele tem de ser o
 * primeiro depois do desenho. A lente sozinha funcionava; a oclusão entrou na
 * frente e empurrou a lente para a fase ruim.
 *
 * Fundir as duas resolve isso por construção — e ainda paga duas vezes: lê a
 * profundidade uma vez em vez de duas, e economiza uma ida e volta inteira de
 * tela cheia.
 *
 * ═══ 3. A PROFUNDIDADE JÁ ESTAVA PAGA ═══
 *
 * O alvo do composer carrega um `DepthTexture`: o desenho normal já escreve
 * profundidade no z-buffer e a jogava fora no fim do quadro. Guardá-la numa
 * textura custa memória e nenhum desenho. As duas efeitos leem dali.
 *
 * ═══ 4. O QUE SE PERDE, DITO ANTES DE ALGUÉM VER ═══
 *
 * Sem mapa de normais desenhado, a normal vem da DERIVADA da posição
 * reconstruída — exata no meio de uma face e mentira na SILHUETA, onde dois
 * objetos a distâncias diferentes caem em pixels vizinhos. O remédio é o truque
 * da MENOR DIFERENÇA, abaixo. A qualidade fica abaixo de um GTAO de verdade:
 * oito amostras, sem varredura de horizonte, sem remoção de ruído dedicada. Para
 * escurecer CONTATO numa cena vista a 18 m, resolve — e o que se compra é a cena
 * não ser desenhada duas vezes.
 *
 * E a ordem interna tem uma aproximação assumida: a lente desfoca PRIMEIRO e a
 * oclusão multiplica DEPOIS, sobre a cor já borrada. O correto seria ocluir cada
 * uma das doze amostras antes de somá-las, o que custaria doze vezes a oclusão.
 * Como ela é de baixa frequência, aplicá-la depois erra pouco — e erra só onde o
 * borrão é grande, que é justamente onde ninguém procura penumbra de fresta.
 */
import * as THREE from 'three'

export const FOCO = {
  /**
   * Distância do plano de foco, em metros a partir da câmera.
   *
   * ═══ O PRIMEIRO CONJUNTO ESTAVA MUITO ERRADO ═══
   *
   * Foco 11 m com abertura 0,85 produziu uma lente MACRO: no render, a única
   * coisa nítida era a lâmina da piscina. Escritório, bar, jardim, guarda-corpo
   * e cidade — tudo borrado, com profundidade de campo de uns três metros num
   * quadro cujo assunto se espalha de 5 a 17.
   *
   * A mecânica estava certa; o erro foi de ENQUADRAMENTO. Isto é um plano geral
   * de apresentação, não um retrato: quem fotografa um terraço ao entardecer
   * FECHA o diafragma, porque o assunto é a profundidade inteira da cena.
   *
   * 12 m põe o plano entre a lâmina (10,4) e o bar (13,5) — o miolo do assunto.
   * Conferido peça por peça: deck da frente 4,8 m e guarda-corpo 5,6 m saem
   * macios (~4 px); lâmina, bar e escritório ficam nítidos; a cidade a 40 m+ sai
   * macia com as janelas virando discos.
   *
   * E o primeiro plano sair MAIS macio que a cidade não é engano: a 12 m de
   * foco, o deck a 4,8 está oticamente mais longe do plano do que a cidade a 40
   * — o termo 1/z dispara perto e satura longe. É o que uma lente faz.
   */
  distancia: 12,
  /** Quanto a lente abre. Maior = menos profundidade de campo. */
  abertura: 0.28,
  /** Teto do raio de borrão, em fração da altura da tela. */
  tetoDeBorrao: 0.011,
}

export const OCLUSAO = {
  /**
   * Raio em METROS, e é isto que amarra o número à cena: 0,45 m é a escala das
   * juntas que importam aqui — tábua contra tábua, pé de vaso, rodapé, quina de
   * calha. Raio grande vira sujeira nos cantos; raio pequeno não alcança junta
   * nenhuma e só serrilha a borda dos objetos.
   */
  raio: 0.45,
  /**
   * Quanto ela fecha. 0,8 e não 1: oclusão cheia fecha demais um terraço a céu
   * aberto, que é o caso com MENOS oclusão possível — não há teto em lugar
   * nenhum. Aqui ela existe para dar contato, não para dar interior.
   */
  intensidade: 0.8,
  /**
   * Viés contra auto-oclusão. Sem ele, a imprecisão do z-buffer faz cada
   * superfície se sombrear sozinha e a cena inteira escurece por igual — que é
   * oclusão nenhuma, só exposição a menos.
   */
  vies: 0.025,
}

/**
 * Discos em espiral de Fibonacci, gerados em tempo de módulo.
 *
 * Espiral e não anéis concêntricos: anel produz padrão visível quando o borrão
 * cresce, e padrão lê como artefato. E escritos como constante no shader porque
 * calcular seno e cosseno por pixel, a cada quadro, para um número que nunca
 * muda, é trabalho puro.
 */
const disco = (n: number) =>
  Array.from({ length: n }, (_, i) => {
    const t = (i + 0.5) / n
    const r = Math.sqrt(t)
    const a = i * 2.39996323
    return `vec2( ${(Math.cos(a) * r).toFixed(4)}, ${(Math.sin(a) * r).toFixed(4)} )`
  }).join(',\n    ')

export function shaderDeProfundidade(camera: THREE.PerspectiveCamera) {
  return {
    name: 'ProfundidadeDoPredio',
    uniforms: {
      tDiffuse: { value: null as unknown },
      tDepth: { value: null as unknown },
      projecaoInversa: { value: camera.projectionMatrixInverse.clone() },
      /** `projectionMatrix[1][1]` = 1/tan(fov/2). Converte metros em tela. */
      escalaDeProjecao: { value: camera.projectionMatrix.elements[5] ?? 1 },
      perto: { value: camera.near },
      longe: { value: camera.far },
      resolucao: { value: new THREE.Vector2(1, 1) },
      proporcao: { value: 1 },
      distanciaDeFoco: { value: FOCO.distancia },
      abertura: { value: FOCO.abertura },
      tetoDeBorrao: { value: FOCO.tetoDeBorrao },
      raio: { value: OCLUSAO.raio },
      intensidade: { value: OCLUSAO.intensidade },
      vies: { value: OCLUSAO.vies },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }`,
    // NENHUMA CRASE DAQUI PARA BAIXO: isto e um template literal, e uma crase
    // fecha a string no meio do shader. Ja derrubou o servidor de dev duas vezes
    // nesta feature. Escreva nome de variavel sem aspas de nenhum tipo.
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform sampler2D tDepth;
      uniform mat4 projecaoInversa;
      uniform float escalaDeProjecao;
      uniform float perto;
      uniform float longe;
      uniform vec2 resolucao;
      uniform float proporcao;
      uniform float distanciaDeFoco;
      uniform float abertura;
      uniform float tetoDeBorrao;
      uniform float raio;
      uniform float intensidade;
      uniform float vies;
      varying vec2 vUv;

      const vec2 discoLente[12] = vec2[12](
    ${disco(12)}
      );
      const vec2 discoOclusao[8] = vec2[8](
    ${disco(8)}
      );

      // Profundidade do buffer para distancia em METROS. O z-buffer de uma
      // projecao em perspectiva NAO e linear: gasta metade da precisao no
      // primeiro decimo do alcance. Sem esta conversao, tudo alem de uns poucos
      // metros cairia no mesmo valor e a lente nao teria o que distinguir.
      float metros( vec2 uv ) {
        float d = texture2D( tDepth, uv ).x;
        float ndc = d * 2.0 - 1.0;
        return ( 2.0 * perto * longe ) / ( longe + perto - ndc * ( longe - perto ) );
      }

      // Do buffer de profundidade de volta para a POSICAO no espaco da camera.
      // Sem isto so se tem um numero por pixel; com isto se tem um ponto, e
      // oclusao e uma pergunta sobre pontos: quanto do hemisferio acima deste
      // aqui esta bloqueado por aqueles outros.
      vec3 posicaoDeVista( vec2 uv ) {
        float d = texture2D( tDepth, uv ).x;
        vec4 ndc = vec4( uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0 );
        vec4 p = projecaoInversa * ndc;
        return p.xyz / p.w;
      }

      // A NORMAL PELA MENOR DIFERENCA, e o "menor" e a parte que importa.
      //
      // A derivada da posicao reconstruida da a normal da superficie — exata no
      // meio de uma face e mentira na SILHUETA, onde dois objetos a distancias
      // diferentes caem em pixels vizinhos e a diferenca entre eles nao descreve
      // superficie nenhuma. Comparando os dois lados e ficando com o que estiver
      // mais perto em profundidade, escolhe-se sempre o vizinho que pertence a
      // MESMA superficie. Sem isso toda borda de objeto ganha contorno escuro.
      vec3 normalDe( vec2 uv, vec3 p ) {
        vec2 t = 1.0 / resolucao;
        vec3 dxMais = posicaoDeVista( uv + vec2( t.x, 0.0 ) ) - p;
        vec3 dxMenos = p - posicaoDeVista( uv - vec2( t.x, 0.0 ) );
        vec3 dyMais = posicaoDeVista( uv + vec2( 0.0, t.y ) ) - p;
        vec3 dyMenos = p - posicaoDeVista( uv - vec2( 0.0, t.y ) );
        vec3 dx = abs( dxMais.z ) < abs( dxMenos.z ) ? dxMais : dxMenos;
        vec3 dy = abs( dyMais.z ) < abs( dyMenos.z ) ? dyMais : dyMenos;
        return normalize( cross( dx, dy ) );
      }

      void main() {
        float z = metros( vUv );
        vec4 cor = texture2D( tDiffuse, vUv );

        // ── 1. A LENTE ──────────────────────────────────────────────────────
        //
        // A formula da lente fina. O modulo da diferenca de inversos e o que
        // produz a assimetria: perto do observador o termo 1/z cresce rapido,
        // longe dele ele satura — e e por isso que o fundo distante fica todo
        // igualmente macio e o primeiro plano se desmancha em poucos passos.
        float circulo = abs( 1.0 / distanciaDeFoco - 1.0 / max( z, 0.05 ) ) * distanciaDeFoco;
        float raioBorrao = min( circulo * abertura, 1.0 ) * tetoDeBorrao;

        vec3 saida = cor.rgb;
        // Abaixo de meio pixel nao ha o que borrar, e as doze amostras seriam
        // doze leituras do mesmo texel. O desvio economiza a banda inteira na
        // faixa em foco, que costuma ser a maior parte da tela.
        if ( raioBorrao >= 0.0006 ) {
          vec4 soma = vec4( 0.0 );
          for ( int i = 0; i < 12; i++ ) {
            vec2 uv = vUv + discoLente[ i ] * raioBorrao * vec2( 1.0 / proporcao, 1.0 );
            // SO ENTRA QUEM ESTA A FRENTE OU NO MESMO PLANO. Sem esta guarda, um
            // fundo desfocado puxa cor de um objeto NITIDO na frente dele e
            // desenha um halo do objeto ao redor da silhueta — o artefato
            // classico de vazamento de profundidade.
            float peso = metros( uv ) >= z - 0.15 ? 1.0 : 0.15;
            soma += vec4( texture2D( tDiffuse, uv ).rgb, 1.0 ) * peso;
          }
          saida = soma.rgb / max( soma.a, 0.0001 );
        }

        // ── 2. A OCLUSAO ────────────────────────────────────────────────────
        //
        // O ceu nao ocluide nada e nao e ocluido: profundidade no limite e o
        // fundo, e reconstruir posicao a partir dele da um ponto no infinito que
        // so produziria ruido.
        if ( z >= longe * 0.99 ) {
          gl_FragColor = vec4( saida, cor.a );
          return;
        }

        vec3 p = posicaoDeVista( vUv );
        vec3 n = normalDe( vUv, p );

        // O RAIO E EM METROS E A TELA E EM PIXELS, e a conversao depende da
        // DISTANCIA: meio metro perto da camera cobre muita tela, meio metro
        // longe cobre quase nada. Sem dividir por -p.z, a oclusao teria alcance
        // constante em pixels — o que na pratica e raio enorme no fundo da cena.
        float emTela = raio * escalaDeProjecao / ( -p.z * 2.0 );

        // Giro por pixel com ruido de gradiente intercalado. Sem ele as oito
        // direcoes sao as mesmas em todo pixel e a oclusao sai em oito raios
        // retos, que o olho le como artefato. Deterministico: a mesma tela
        // produz o mesmo padrao a cada carregamento.
        float giro = fract( 52.9829189 * fract( dot( gl_FragCoord.xy, vec2( 0.06711056, 0.00583715 ) ) ) ) * 6.2831853;
        float cg = cos( giro );
        float sg = sin( giro );

        float somaOclusao = 0.0;
        for ( int i = 0; i < 8; i++ ) {
          vec2 d = discoOclusao[ i ];
          vec2 girada = vec2( d.x * cg - d.y * sg, d.x * sg + d.y * cg );
          vec3 q = posicaoDeVista( vUv + girada * emTela );
          vec3 v = q - p;
          float dist = length( v );
          if ( dist < 0.0001 ) continue;
          // Quanto a amostra sobe ACIMA do plano da superficie. Vies descontado
          // para a propria superficie nao se sombrear pela imprecisao do z.
          float acima = dot( v / dist, n ) - vies;
          // CORTE POR DISTANCIA, e ele e o que impede o efeito de halo: sem
          // isto, um objeto muito atras do pixel conta como se encostasse nele e
          // desenha uma aureola escura em volta de toda silhueta.
          float dentro = 1.0 - smoothstep( raio * 0.6, raio, dist );
          somaOclusao += max( 0.0, acima ) * dentro;
        }

        float oclusao = clamp( somaOclusao / 8.0, 0.0, 1.0 );
        gl_FragColor = vec4( saida * ( 1.0 - oclusao * intensidade ), cor.a );
      }`,
  }
}
