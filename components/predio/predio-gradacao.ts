/**
 * ═══ A GRADAÇÃO — o passe que separa "render" de "plano" ═══
 *
 * O QUE ESTE PASSE FAZ QUE O ACES NÃO FAZ. `OutputPass` aplica uma curva de
 * exibição: ele resolve o problema de caber luz de dez mil nits num monitor de
 * trezentos. Isso é REVELAÇÃO, não interpretação — sai uma imagem correta, e
 * imagem correta é justamente o que nenhum filme entrega. Fotografia de cinema é
 * uma imagem DECIDIDA: alguém escolheu para onde vão as sombras, quanto a lente
 * escurece nos cantos, e quanta textura o negativo deixa no meio-tom.
 *
 * São quatro operações, todas de tela cheia e todas baratas, e cada uma existe
 * por uma razão física:
 *
 * 1. TOM DIVIDIDO (sombras frias, altas quentes). Não é moda de colorista: é o
 *    que uma cena de hora dourada de fato faz. Há DUAS fontes de cor no céu — o
 *    sol, âmbar e direto, e a abóbada, azul-violeta e difusa. O que o sol atinge
 *    fica quente; o que só recebe a abóbada fica frio. A cena já tem isso na
 *    iluminação; o passe REFORÇA a separação, que é o que uma película de
 *    verdade faz por construção química.
 *
 * 2. CONTRASTE EM TORNO DO CINZA MÉDIO. Expoente aplicado a `c / 0,18` e depois
 *    remultiplicado por 0,18: assim o ponto de 18 % — o cinza médio fotográfico,
 *    o que um fotômetro mede — NÃO se move. Contraste ingênuo (multiplicar e
 *    somar) escurece ou clareia a imagem inteira junto, e aí se perde a
 *    exposição que a cena levou meses para acertar.
 *
 * 3. VINHETA. Toda lente escurece nos cantos, e nenhuma imagem sintética faz
 *    isso sozinha. É o sinal mais barato de "isto passou por um vidro". A queda
 *    é elíptica acompanhando o quadro — `length(vUv − 0,5)` já dá isso de graça,
 *    porque UV é normalizado por eixo.
 *
 * 4. GRÃO. Sensor e negativo deixam ruído, e ausência TOTAL de ruído é um dos
 *    tells mais fortes de imagem gerada. Ele entra mais forte nas sombras e some
 *    nas altas, que é o comportamento real: o grão é proporcional à raiz do
 *    sinal, então pesa relativamente mais onde há pouca luz.
 *
 * ONDE ELE ENTRA NA CADEIA, e isto não é detalhe: DEPOIS do bloom e ANTES do
 * `OutputPass`. Depois do bloom porque o passe de brilho precisa enxergar os
 * valores HDR crus para escolher as fontes — graduar antes mexeria no que ele
 * usa para decidir. Antes do `OutputPass` porque tudo aqui é operação sobre
 * LUZ, não sobre pixel de tela: escurecer o canto é fechar o diafragma na
 * borda, e somar grão é somar fótons. Fazer isso depois da curva de exibição
 * daria os mesmos gestos aplicados na escala errada, e o resultado seria a
 * aparência de filtro sobreposto — que é exatamente o que este passe existe
 * para não parecer.
 */

/**
 * Os números da película. Separados do shader porque é aqui que se mexe, e
 * porque um teste consegue afirmar sobre eles.
 */
export const GRADACAO = {
  /** Expoente em torno do cinza médio. 1 = neutro. */
  contraste: 1.1,
  /** Quanto a lente fecha no canto do quadro, em fração. */
  vinheta: 0.3,
  /** Amplitude do grão, em unidades de luz linear, nas sombras. */
  grao: 0.006,
  /** Multiplicador de cor nas SOMBRAS — levemente azul. */
  tomBaixo: [0.95, 0.98, 1.09] as const,
  /** Multiplicador de cor nas ALTAS — levemente âmbar. */
  tomAlto: [1.05, 1.0, 0.93] as const,
}

/**
 * O shader, no formato que `ShaderPass` consome.
 *
 * `tDiffuse` é o nome que `ShaderPass` procura para ligar a imagem de entrada —
 * mudá-lo quebra o passe em silêncio, com a tela ficando preta.
 */
export const shaderDeGradacao = {
  name: 'GradacaoDoPredio',
  uniforms: {
    tDiffuse: { value: null as unknown },
    contraste: { value: GRADACAO.contraste },
    vinheta: { value: GRADACAO.vinheta },
    grao: { value: GRADACAO.grao },
    tomBaixo: { value: GRADACAO.tomBaixo },
    tomAlto: { value: GRADACAO.tomAlto },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float contraste;
    uniform float vinheta;
    uniform float grao;
    uniform vec3 tomBaixo;
    uniform vec3 tomAlto;
    varying vec2 vUv;

    void main() {
      vec3 c = texture2D( tDiffuse, vUv ).rgb;

      // Luminancia pelos pesos Rec.709 — o verde carrega quase tres quartos do
      // brilho percebido, e usar a media dos tres canais poria a divisao entre
      // sombra e alta no lugar errado em tudo que for vegetacao.
      float luma = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
      // 0 no preto, 0,5 exatamente no cinza medio, tendendo a 1 nas altas.
      float alto = luma / ( luma + 0.18 );
      c *= mix( tomBaixo, tomAlto, alto );

      // O cinza medio e o PIVO: 0,18 entra e 0,18 sai, qualquer que seja o
      // expoente. E o que permite mexer no contraste sem reabrir a exposicao.
      c = 0.18 * pow( max( c, vec3( 0.0 ) ) / 0.18, vec3( contraste ) );

      // A queda elipsoidal do canto: length( vUv - 0.5 ) vale 0,707 na quina.
      // NENHUMA CRASE DAQUI PARA BAIXO — isto e um template literal, e uma crase
      // fecha a string no meio do shader. Ja derrubou o servidor de dev duas
      // vezes nesta feature, a segunda poucos minutos depois de eu escrever o
      // aviso equivalente em predio-materiais.ts. Nao ha memoria, so o aviso.
      float r = length( vUv - 0.5 );
      c *= 1.0 - vinheta * smoothstep( 0.30, 0.72, r );

      // GRAO ESTATICO, e a escolha e deliberada. Grao de cinema anda; a esta
      // amplitude ninguem distingue se ele anda, e um padrao fixo mantem a cena
      // reproduzivel quadro a quadro — o que as sondas de movimento desta
      // feature dependem para saber que o que se mexeu foi a agua ou a planta.
      float n = fract( sin( dot( vUv, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 ) - 0.5;
      c += n * grao * ( 1.0 - alto );

      gl_FragColor = vec4( c, 1.0 );
    }`,
}
