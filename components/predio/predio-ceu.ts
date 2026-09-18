import * as THREE from 'three'
import { SOL } from './predio-arquitetura'

/**
 * O CÉU DE HORA DOURADA, PINTADO — e o mapa de ambiente que sai da mesma tinta.
 *
 * O QUE ESTAVA AQUI ANTES: um degradê de três paradas da mesma cor âmbar, num
 * canvas de 4 × 256. Funciona como "fundo claro" e não como céu, por três
 * motivos que só aparecem quando se olha para um céu de verdade:
 *
 * 1. CÉU NÃO É MONOCROMÁTICO. Em hora dourada o horizonte é creme-alaranjado e
 *    o zênite é AZUL-VIOLETA — a luz que sobra lá em cima já é a do lado da
 *    noite. Um degradê de um matiz só lê como papel colorido.
 * 2. O SOL TEM LUGAR. Existe um lado do céu que é mais claro, e é ele que diz de
 *    onde vem a luz rasante que bate na cena. Sem isso a iluminação da cena e o
 *    fundo contam histórias diferentes.
 * 3. NUVEM RETROILUMINADA é a assinatura do horário. Com o sol atrás delas, o
 *    corpo fica escuro e a BORDA acende. É o detalhe que faz uma foto de fim de
 *    tarde parecer fim de tarde.
 *
 * O MESMO ARQUIVO GERA O MAPA DE AMBIENTE, e isso não é economia: é coerência.
 * O `criaAmbiente` antigo desenhava o seu próprio degradê, então a piscina e o
 * metal refletiam um céu que não era o céu que estava na tela. Agora o reflexo e
 * o fundo saem da mesma paleta e do mesmo azimute de sol — muda um, muda o
 * outro.
 *
 * Duas projeções porque são dois usos diferentes: o fundo é um PLANO (o céu
 * mapeado em retângulo) e o ambiente é EQUIRRETANGULAR (a esfera inteira, com o
 * horizonte na linha do meio). A paleta e o sol são compartilhados; só a
 * geometria da projeção muda.
 */

/**
 * A rampa do céu, do horizonte (t = 0) ao zênite (t = 1).
 *
 * Escrita à mão e não derivada de temperatura de cor, pelo mesmo motivo que
 * `predio-luz.ts` escreve a cor de cada andar à mão: a conversão física dá cores
 * corretas e sujas nas pontas, e o que se quer aqui é a leitura, não a medição.
 */
/**
 * ONZE PARADAS E NÃO SETE, e as quatro que entraram não são enfeite.
 *
 * Céu de pôr do sol não é uma transição de quente para frio: é uma SEQUÊNCIA de
 * faixas com nomes próprios, e pular qualquer uma delas faz o degradê parecer
 * um filtro em vez de um céu.
 *
 * De baixo para cima:
 *  0,00  o branco-dourado do próprio horizonte, onde o sol ainda está
 *  0,03  o âmbar da poeira baixa
 *  0,08  o laranja da camada densa
 *  0,15  o CORAL, que é a faixa que faltava — é aqui que o laranja entrega para
 *        o rosa, e sem ela o salto de um para o outro lê como banda
 *  0,23  o rosa-terroso
 *  0,32  o MALVA, a segunda que faltava: o ponto neutro da curva, onde o quente
 *        e o frio se cruzam. Sem ele o céu tem dois blocos de cor em vez de uma
 *        transição
 *  0,42  o violeta-acinzentado
 *  0,55  o azul-ardósia
 *  0,72  o azul do meio da abóbada
 *  1,00  o zênite, o mais escuro e o mais saturado
 *
 * Os degraus são mais APERTADOS embaixo, e isso é físico: perto do horizonte a
 * linha de visão atravessa muito mais atmosfera por grau de elevação, então a
 * cor muda depressa. Degraus uniformes dariam um céu que muda de cor no mesmo
 * ritmo de baixo a cima, que é o que nenhum céu faz.
 */
const RAMPA: readonly (readonly [number, string])[] = [
  [0.0, '#ffe8c4'],
  [0.03, '#ffd6a0'],
  [0.08, '#f7b785'],
  [0.15, '#e79c86'],
  [0.23, '#cf8f92'],
  [0.32, '#b0849c'],
  [0.42, '#9179a2'],
  [0.55, '#75749e'],
  [0.72, '#5d6a97'],
  [1.0, '#41528a'],
]

/** Onde o sol está, em fração da largura de um mapa equirretangular. */
const U_DO_SOL = 0.5 + SOL.azimute / 360

/**
 * ═══ A JANELA DE CÉU QUE A LENTE DE FATO ENQUADRA ═══
 *
 * MEDIDA, não estimada, e as três tentativas que precederam a medição explicam
 * por que ela vira constante em vez de continuar sendo palpite.
 *
 * O plano do céu tem 46 m de altura e 140 m de largura, e a lente pega uma
 * fração pequena dos dois. Pintar nuvem fora dessa fração não é só trabalho
 * perdido: é trabalho que CONSOME a quantidade de nuvem que se achava ter
 * colocado. Foi o que aconteceu — duas rodadas inteiras em que os cúmulos
 * simplesmente não apareciam, porque metade de cada faixa caía abaixo da linha
 * do casario e a outra metade acima da borda de cima da tela.
 *
 * COMO FOI MEDIDO (e como refazer se a câmera mudar): pinta-se na textura uma
 * régua de blocos sólidos magenta/verde de 0,025 de `v`, com o valor escrito
 * dentro de cada bloco, e captura-se o quadro. Dois detalhes que custaram uma
 * rodada cada:
 *
 *  - Os rótulos precisam se repetir ao longo da LARGURA. Escritos só nas bordas
 *    da textura, eles caem nos 43 m de plano que ficam fora do enquadramento.
 *  - A régua precisa ser de BLOCOS, não de linhas finas. A primeira versão usou
 *    linhas de 1 px sobre um céu que agora tem mechas de cirro finas e
 *    horizontais — um instrumento feito da mesma matéria da coisa medida não
 *    mede nada.
 *
 * O RESULTADO: 2120 px de tela por unidade de `v`, com a borda de cima da tela
 * em v = 0,650 e a silhueta da cidade comendo tudo abaixo de ~0,82. A janela
 * inteira tem 0,16 de altura — as faixas que eu vinha usando tinham de 0,13 a
 * 0,25, ou seja, eram do tamanho da janela ou maiores, e centradas fora dela.
 *
 * Note que isto NÃO depende de `fracaoVisivel`. Aquele parâmetro comprime a
 * RAMPA DE COR dentro do plano; esta janela é geometria pura de câmera. Amarrar
 * uma coisa na outra, que foi a minha primeira tentativa, é mais uma constante
 * emprestada de outro sistema de coordenadas — a mesma armadilha que o
 * parâmetro `uDoSol` acabou de consertar logo abaixo.
 */
const CEU_VISIVEL = { topo: 0.655, base: 0.815 } as const

/**
 * Uma faixa de altura dentro da janela visível, em fração dela: 0 é a borda de
 * cima da tela, 1 é a linha do casario. Escrever as camadas assim significa que
 * elas não podem mais cair fora do quadro por construção, e que recalibrar a
 * câmera é mexer em `CEU_VISIVEL` e em mais nada.
 */
function faixa(de: number, ate: number): readonly [number, number] {
  const { topo, base } = CEU_VISIVEL
  return [topo + (base - topo) * de, topo + (base - topo) * ate]
}

function aplicaRampa(g: CanvasGradient, de: number, ate: number) {
  for (const [t, cor] of RAMPA) {
    const p = de + (ate - de) * t
    if (p >= 0 && p <= 1) g.addColorStop(p, cor)
  }
}

/**
 * Ruído determinístico. Zero `Math.random()` — a cena tem de nascer idêntica a
 * cada carregamento, senão nenhuma captura de tela é comparável com a próxima, e
 * foi comparando capturas que quase todos os defeitos desta feature apareceram.
 */
function ruido(i: number, k: number): number {
  const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453
  return s - Math.floor(s)
}

/**
 * NUVEM NÃO TEM BORDA — e era exatamente isso que estava errado.
 *
 * A versão anterior desenhava cada nuvem com `ellipse` + `fill`. Isso produz uma
 * silhueta de borda DURA: a transição de nuvem para céu acontece em um pixel. O
 * resultado foram as lozangos cinzentas achatadas que se viam no render, com
 * cara de adesivo recortado e colado no degradê.
 *
 * Nuvem é uma nuvem de gotículas. A densidade cai gradualmente até zero nas
 * bordas, e é essa dissolução — não a forma — que o olho usa para reconhecê-la.
 * Uma elipse de borda macia lê como nuvem; um contorno perfeito de qualquer
 * forma lê como papel.
 *
 * Então cada bolha passa a ser um degradê radial que vai da cor cheia no miolo a
 * alfa zero na borda, e a nuvem é um AGLOMERADO de seis a dez bolhas de tamanhos
 * diferentes. É mais caro — dez degradês por nuvem contra um preenchimento —,
 * mas isto roda uma vez na montagem da textura e nunca mais.
 *
 * AS TRÊS COISAS QUE FAZEM A NUVEM SER DAQUELE FIM DE TARDE:
 *
 * 1. A DISTÂNCIA AO SOL manda na cor. Nuvem perto do sol é dourada e clara;
 *    longe dele é malva e escura. Antes todas tinham a mesma cor de corpo com um
 *    arco quente colado embaixo, e o arco apontava sempre para o mesmo lado
 *    independentemente de onde a nuvem estivesse.
 *
 * 2. A BASE É MAIS CLARA QUE O TOPO. Ao pôr do sol a luz vem de BAIXO — ela
 *    passa rasante sob a camada e acende a barriga da nuvem enquanto o topo
 *    fica na sombra. É o inverso do meio-dia, e é o sinal mais específico do
 *    horário. As bolhas inferiores recebem a mistura quente; as de cima, não.
 *
 * 3. O ACHATAMENTO CRESCE PERTO DO HORIZONTE. Vê-se a camada de lado e não de
 *    baixo, então ela estica. Nuvem redonda no horizonte é o erro mais comum de
 *    céu desenhado.
 */
/** Uma bolha macia: cor cheia no centro, alfa zero na borda. */
function bolha(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  cor: string,
  alfa: number,
) {
  ctx.save()
  ctx.globalAlpha = alfa
  ctx.translate(x, y)
  ctx.scale(1, ry / rx)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx)
  g.addColorStop(0, cor)
  // A parada em 0,55 mantém o miolo cheio: sem ela o degradê começa a cair do
  // centro e a nuvem inteira vira uma mancha difusa sem corpo.
  g.addColorStop(0.55, cor)
  g.addColorStop(1, cor.replace(/[\d.]+\)$/, '0)'))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(0, 0, rx, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/**
 * A MESMA BOLHA, MAIS AS DUAS CÓPIAS QUE FAZEM A TEXTURA EMENDAR.
 *
 * Uma camada que ROLA precisa ser um ladrilho perfeito no eixo horizontal: no
 * instante em que `offset.x` passa de 0,999 para 0,000 a borda direita encosta
 * na esquerda, e qualquer nuvem cortada pela margem vira uma emenda vertical
 * atravessando o céu inteiro — uma vez a cada volta, que é o pior tipo de
 * defeito, o que só aparece depois que todo mundo parou de olhar.
 *
 * Desenhar cada bolha também em `x − largura` e `x + largura` resolve por
 * construção: o que sai por um lado entra pelo outro, pintado. O canvas descarta
 * sozinho o que cai fora, então as duas cópias extras custam quase nada — e isto
 * roda uma vez na montagem da textura.
 */
function bolhaEmenda(
  ctx: CanvasRenderingContext2D,
  largura: number,
  enrola: boolean,
  x: number,
  y: number,
  rx: number,
  ry: number,
  cor: string,
  alfa: number,
) {
  bolha(ctx, x, y, rx, ry, cor, alfa)
  if (!enrola) return
  bolha(ctx, x - largura, y, rx, ry, cor, alfa)
  bolha(ctx, x + largura, y, rx, ry, cor, alfa)
}

function pintaNuvens(
  ctx: CanvasRenderingContext2D,
  largura: number,
  altura: number,
  vDe: number,
  vAte: number,
  quantidade: number,
  ladoDoSol: number,
  /**
   * ONDE O SOL ESTÁ **NESTA** PROJEÇÃO, e o parâmetro nasceu de um defeito.
   *
   * A função lia o `U_DO_SOL` do módulo, que é a coordenada do sol no mapa
   * EQUIRRETANGULAR. No plano de fundo o sol não está lá: ele está em `solU`,
   * que quem chama projeta da direção da luz na geometria do plano. As duas
   * coordenadas não coincidem, então as nuvens douradas do fundo se agrupavam
   * num ponto do céu e o disco do sol ficava em outro — o quadro dizia que a luz
   * vinha de dois lugares.
   *
   * É a quinta ocorrência da mesma armadilha nesta cena: constante de um sistema
   * de coordenadas usada dentro de outro. Vira parâmetro.
   */
  uDoSol: number,
  /**
   * Se o eixo U dá a volta. No equirretangular e numa camada que rola, sim — e aí
   * a distância ao sol precisa passar pela emenda e cada bolha precisa das
   * cópias. No plano de fundo, não: ele tem duas bordas de verdade.
   */
  enrola: boolean,
  semente = 0,
) {
  for (let n = 0; n < quantidade; n++) {
    const i = n + semente
    const u = ruido(i, 1)
    const t = ruido(i, 2)
    const v = vDe + (vAte - vDe) * t
    const proximidade = 1 - t
    const larg = largura * (0.05 + ruido(i, 3) * 0.1) * (1 + proximidade * 1.2)
    const alt = altura * (0.008 + ruido(i, 4) * 0.02) * (1 - proximidade * 0.4)
    const x = u * largura
    const y = v * altura
    /**
     * A PROXIMIDADE DO SOL, medida no eixo U com a volta pelo outro lado quando
     * ela existe.
     *
     * Num mapa que emenda, `u` = 0 e `u` = 1 são o mesmo meridiano: uma nuvem em
     * 0,02 está perto de um sol em 0,98, e a subtração direta diria que está do
     * outro lado do céu. `min(d, 1 − d)` resolve, e sem isso a faixa de nuvens
     * douradas teria um corte seco na emenda.
     */
    const dU = Math.abs(u - uDoSol)
    const pertoDoSol = 1 - (enrola ? Math.min(dU, 1 - dU) : dU) / 0.5
    const calor = Math.max(0, pertoDoSol) ** 2.2
    const opacidade = (0.2 + ruido(i, 5) * 0.34) * (0.7 + calor * 0.5)

    // Corpo: malva frio longe do sol, malva quente perto. Nunca cinza puro —
    // nuvem de fim de tarde não tem cinza em lugar nenhum.
    const rTopo = Math.round(108 + calor * 96)
    const gTopo = Math.round(98 + calor * 66)
    const bTopo = Math.round(126 + calor * 20)
    const corTopo = `rgba(${rTopo},${gTopo},${bTopo},${opacidade.toFixed(3)})`
    // Barriga: a luz rasante que passa sob a camada. Ela é sempre mais quente e
    // mais clara que o topo, e a diferença cresce perto do sol.
    const corBase = `rgba(${Math.round(210 + calor * 45)},${Math.round(168 + calor * 60)},${Math.round(136 + calor * 40)},${(opacidade * 1.15).toFixed(3)})`

    // O aglomerado. As bolhas de cima levam a cor do topo; as de baixo, a da
    // barriga — e elas ficam mais para o lado do sol, porque é de lá que a luz
    // rasante entra na camada.
    const bolhas = 6 + Math.floor(ruido(i, 8) * 5)
    for (let b = 0; b < bolhas; b++) {
      const f = b / (bolhas - 1)
      const emBaixo = ruido(i * 13 + b, 9) > 0.55
      const bx = x + (f - 0.5) * larg * 1.7 + (ruido(i * 13 + b, 6) - 0.5) * larg * 0.3
      const by = y + (emBaixo ? alt * 0.55 : -alt * 0.35) + (ruido(i * 13 + b, 10) - 0.5) * alt
      // As pontas do aglomerado são menores: é o que dá à nuvem uma silhueta que
      // afina nas bordas em vez de terminar em parede.
      const escala = 0.45 + Math.sin(f * Math.PI) * 0.8
      const rx = larg * 0.42 * escala * (0.7 + ruido(i * 13 + b, 7) * 0.7)
      bolhaEmenda(
        ctx,
        largura,
        enrola,
        bx + (emBaixo ? ladoDoSol * larg * 0.08 : 0),
        by,
        rx,
        rx * (alt / larg) * (emBaixo ? 2.1 : 2.8),
        emBaixo ? corBase : corTopo,
        1,
      )
    }

    /**
     * ═══ A SEGUNDA OITAVA: AS BOSSAS DO TOPO ═══
     *
     * Com uma escala só de bolha, o aglomerado tem contorno de LENTE — sobe, faz
     * uma curva e desce. Nenhuma nuvem tem esse contorno: cúmulo é convecção, e
     * convecção produz torres de vários tamanhos brotando da mesma base. O que se
     * reconhece como nuvem é justamente a irregularidade da linha de cima.
     *
     * É o mesmo princípio do ruído fractal — uma oitava dá uma mancha, duas dão
     * forma — só que aplicado à SILHUETA em vez de à densidade. Bossas pequenas,
     * ~1/3 do raio das bolhas grandes, empurradas para cima da linha média.
     *
     * Elas levam a cor do TOPO mesmo estando mais altas: nesta hora a luz entra
     * rasante por baixo da camada, então tudo que sobe fica na sombra da própria
     * nuvem. Pintar as torres claras inverteria o horário.
     */
    const bossas = 4 + Math.floor(ruido(i, 11) * 5)
    for (let s = 0; s < bossas; s++) {
      const f = (s + 0.5) / bossas
      const bx = x + (f - 0.5) * larg * 1.5 + (ruido(i * 17 + s, 12) - 0.5) * larg * 0.2
      const by = y - alt * (0.25 + ruido(i * 17 + s, 13) * 0.55)
      const rx = larg * 0.14 * (0.55 + ruido(i * 17 + s, 14) * 0.95)
      bolhaEmenda(ctx, largura, enrola, bx, by, rx, rx * (alt / larg) * 2.4, corTopo, 0.85)
    }

    /**
     * ═══ A FRANJA A SOTAVENTO ═══
     *
     * Nuvem não termina: ela se desfia. A borda que o vento leva se estica em
     * véus finos que somem aos poucos, e é essa franja — mais do que a forma do
     * corpo — que diz ao olho que aquilo está dentro de ar em movimento. Sem ela
     * o aglomerado fica com aparência de objeto pousado no céu.
     *
     * Três véus, muito achatados (8× mais largos que altos), alfa baixo,
     * saindo pelo lado do sol porque é para lá que o vento desta cena sopra — o
     * mesmo `ladoDoSol` que já desloca as barrigas.
     */
    for (let w = 0; w < 3; w++) {
      const fx = x + ladoDoSol * larg * (0.75 + w * 0.42)
      const fy = y + (ruido(i * 19 + w, 15) - 0.5) * alt * 0.9
      const rx = larg * (0.3 + ruido(i * 19 + w, 16) * 0.26)
      bolhaEmenda(ctx, largura, enrola, fx, fy, rx, rx * 0.11, corBase, 0.4 - w * 0.1)
    }
  }
}

/**
 * ═══ O CIRRO — a camada que faltava, e ela não é um cúmulo menor ═══
 *
 * Um céu de hora dourada tem DOIS andares de nuvem, e eles não se parecem:
 *
 *  - O cúmulo, a 2 km, é água líquida. Tem volume, tem barriga, tem sombra
 *    própria, e é o que esta cena já desenhava.
 *  - O CIRRO, a 10 km, é gelo. Não tem volume nenhum — é um véu de cristais
 *    arrastado pelo jato, e o que se vê são FIOS paralelos, quase horizontais,
 *    finíssimos.
 *
 * E o cirro é o que acende primeiro e apaga por último: estando três vezes mais
 * alto, ele ainda pega sol cheio quando o chão já está na sombra. Aquelas
 * mechas rosa-douradas atravessando o azul no fim da tarde são sempre cirro.
 * Um céu de pôr do sol sem elas fica com um vazio na parte de cima que nenhuma
 * quantidade de cúmulo preenche — o degradê sobe limpo demais e volta a ler
 * como papel colorido, que é o defeito de origem deste arquivo.
 *
 * DESENHADO COMO FEIXE E NÃO COMO MANCHA. Cada cirro é um punhado de fios
 * paralelos, cada fio uma bolha esticada 12 a 20 vezes mais em X do que em Y,
 * com um cisalhamento leve para o feixe não ser um retângulo. A separação entre
 * os fios é o assunto: uma mancha achatada única leria como borrão de dedo.
 */
function pintaCirros(
  ctx: CanvasRenderingContext2D,
  largura: number,
  altura: number,
  vDe: number,
  vAte: number,
  quantidade: number,
  uDoSol: number,
  enrola: boolean,
) {
  for (let i = 0; i < quantidade; i++) {
    const u = ruido(i, 31)
    const t = ruido(i, 32)
    const v = vDe + (vAte - vDe) * t
    const x = u * largura
    const y = v * altura
    const comp = largura * (0.09 + ruido(i, 33) * 0.15)
    const esp = altura * (0.012 + ruido(i, 34) * 0.022)
    // O cisalhamento: os fios de cima ficam um pouco à frente dos de baixo,
    // porque o vento é mais forte no topo da camada. É pequeno de propósito —
    // cirro muito inclinado lê como risco de lápis.
    const inclina = (ruido(i, 35) - 0.5) * 0.55

    const dU = Math.abs(u - uDoSol)
    const calor = Math.max(0, 1 - (enrola ? Math.min(dU, 1 - dU) : dU) / 0.5) ** 1.6
    /**
     * O CIRRO É PÁLIDO, e a tentação de subir esse alfa é forte e errada.
     *
     * Ele é opticamente fino: vê-se o céu ATRAVÉS dele, sempre. Um cirro opaco
     * vira um rabisco branco colado no degradê — que é exatamente o erro de
     * "nuvem de adesivo" que as bolhas macias vieram consertar lá em cima, só
     * que com outra forma.
     */
    const alfa = (0.05 + ruido(i, 36) * 0.08) * (0.5 + calor * 1.1)
    // Perto do sol o gelo fica dourado; longe, rosa-acinzentado frio. O cirro é
    // o que mais muda de cor no céu porque é o mais alto: o raio que chega nele
    // atravessou muito mais atmosfera do que o que chega no cúmulo.
    const cor = `rgba(${Math.round(198 + calor * 56)},${Math.round(172 + calor * 62)},${Math.round(176 + calor * 26)},${alfa.toFixed(3)})`

    const fios = 4 + Math.floor(ruido(i, 37) * 5)
    for (let f = 0; f < fios; f++) {
      const p = fios === 1 ? 0.5 : f / (fios - 1)
      // Os fios do meio são os mais longos: dá ao feixe uma ponta afilada nas
      // duas extremidades, que é como uma mecha de cirro de fato termina.
      const longo = comp * (0.35 + Math.sin(p * Math.PI) * 0.65) * (0.7 + ruido(i * 23 + f, 38) * 0.6)
      const fy = y + (p - 0.5) * esp
      const fx = x + (p - 0.5) * esp * inclina * 8 + (ruido(i * 23 + f, 39) - 0.5) * comp * 0.22
      bolhaEmenda(
        ctx,
        largura,
        enrola,
        fx,
        fy,
        longo,
        // 1/16 do comprimento, com piso de meio pixel: fio de cirro é fino, mas
        // fino demais desaparece na interpolação da textura e a mecha some.
        Math.max(0.6, longo * (0.04 + ruido(i * 23 + f, 40) * 0.035)),
        cor,
        1,
      )
    }
  }
}

/** O brilho do sol: uma mancha quente larga, no azimute certo. */
function pintaBrilho(
  ctx: CanvasRenderingContext2D,
  largura: number,
  altura: number,
  u: number,
  v: number,
  raio: number,
) {
  /**
   * OITO PARADAS E NÃO QUATRO, e a diferença é onde a curva cai.
   *
   * Com quatro paradas a queda era quase linear, e brilho de sol não é linear —
   * ele despenca perto da fonte e depois se arrasta por dezenas de graus. Uma
   * rampa linear devolve um DISCO de luz com borda perceptível, que é o halo
   * redondo de adesivo que se via; a curva real devolve um brilho que não se
   * sabe onde termina.
   *
   * As paradas apertadas no começo (0,06 / 0,13 / 0,22) fazem a queda íngreme;
   * as espaçadas no fim (0,55 / 0,78 / 1,0) fazem o arrasto. E a cor caminha de
   * creme quase branco para laranja e daí para um rosa que já é a cor do céu —
   * é essa última transição que costura o brilho ao fundo em vez de deixá-lo
   * flutuando por cima.
   */
  const g = ctx.createRadialGradient(u * largura, v * altura, 0, u * largura, v * altura, raio)
  g.addColorStop(0, 'rgba(255,246,222,0.95)')
  g.addColorStop(0.06, 'rgba(255,236,196,0.8)')
  g.addColorStop(0.13, 'rgba(255,221,166,0.58)')
  g.addColorStop(0.22, 'rgba(255,203,142,0.4)')
  g.addColorStop(0.36, 'rgba(252,182,130,0.25)')
  g.addColorStop(0.55, 'rgba(240,160,126,0.13)')
  g.addColorStop(0.78, 'rgba(219,146,133,0.05)')
  g.addColorStop(1, 'rgba(205,140,140,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, largura, altura)
}

/**
 * O DISCO DO SOL.
 *
 * Desenhado maior que o real de propósito, e a licença está declarada: o sol tem
 * meio grau de diâmetro, o que nesta textura daria dois pixels. Dois pixels não
 * leem como sol — leem como poeira no sensor. O que o olho reconhece como sol é
 * o conjunto NÚCLEO ESTOURADO + HALO APERTADO + brilho largo em volta, que é o
 * que uma lente faz com uma fonte muito mais brilhante que o resto da cena.
 *
 * Três camadas, de fora para dentro, porque uma só vira adesivo: o brilho largo
 * (já pintado antes), um halo apertado, e o núcleo branco de borda dura. É a
 * borda dura do núcleo, contra o halo macio, que dá a impressão de intensidade.
 */
function pintaDisco(
  ctx: CanvasRenderingContext2D,
  largura: number,
  altura: number,
  u: number,
  v: number,
  raio: number,
) {
  const x = u * largura
  const y = v * altura
  const halo = ctx.createRadialGradient(x, y, raio * 0.5, x, y, raio * 9)
  halo.addColorStop(0, 'rgba(255,250,232,0.9)')
  halo.addColorStop(0.16, 'rgba(255,240,204,0.55)')
  halo.addColorStop(0.42, 'rgba(255,224,172,0.2)')
  halo.addColorStop(0.72, 'rgba(255,206,150,0.06)')
  halo.addColorStop(1, 'rgba(255,196,142,0)')
  ctx.fillStyle = halo
  ctx.beginPath()
  ctx.arc(x, y, raio * 9, 0, Math.PI * 2)
  ctx.fill()

  /**
   * O NÚCLEO GANHOU UMA ORLA DE MEIO PIXEL, e ela resolve o único artefato que
   * sobrava no sol.
   *
   * O disco era um `arc` preenchido de branco puro: borda serrilhada de
   * circunferência rasterizada, visível porque o contraste contra o halo é
   * altíssimo. Um degradê que fica branco até 88% do raio e cai a zero no último
   * oitavo dá a mesma leitura de borda dura — o olho continua achando o limite —
   * sem a escada de pixel.
   *
   * É o mesmo raciocínio das nuvens invertido: lá a borda macia era o assunto,
   * aqui ela é só o antisserrilhado de um limite que DEVE parecer duro.
   */
  const nucleo = ctx.createRadialGradient(x, y, 0, x, y, raio)
  nucleo.addColorStop(0, 'rgba(255,253,246,1)')
  nucleo.addColorStop(0.88, 'rgba(255,251,238,1)')
  nucleo.addColorStop(1, 'rgba(255,246,222,0)')
  ctx.fillStyle = nucleo
  ctx.beginPath()
  ctx.arc(x, y, raio, 0, Math.PI * 2)
  ctx.fill()
}


/**
 * GRÃO — e ele existe para matar o BANDEAMENTO, não para dar textura.
 *
 * Um degradê suave num canal de 8 bits só tem 256 degraus. Quando ele se espalha
 * por 400 pixels de tela, cada degrau ocupa uma FAIXA de vários pixels, e o olho
 * é muito bom em achar essas faixas — é o listrado que aparece em céu de
 * screenshot e em fundo de apresentação. Céu é o pior caso possível: é grande,
 * é liso e a variação é mínima.
 *
 * A solução é a mesma da indústria de áudio e de impressão: DITHER. Somando um
 * ruído de ±1,5 níveis antes de quantizar, a borda entre dois degraus deixa de
 * ser uma linha reta e vira uma transição irregular. O olho integra a
 * irregularidade e enxerga um degradê contínuo — troca-se banda por grão, e grão
 * a essa amplitude é invisível.
 *
 * De quebra, é o que uma foto tem: sensor de câmera sempre deixa ruído no céu, e
 * a ausência TOTAL de ruído é um dos sinais de imagem sintética.
 */
function granula(ctx: CanvasRenderingContext2D, largura: number, altura: number) {
  const img = ctx.getImageData(0, 0, largura, altura)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    // Hash barato sobre o índice do pixel: determinístico e sem padrão visível.
    const n = ((Math.sin(i * 0.0001) * 43758.5453) % 1) * 3 - 1.5
    d[i] = Math.max(0, Math.min(255, d[i]! + n))
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1]! + n))
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2]! + n))
  }
  ctx.putImageData(img, 0, 0)
}

/**
 * O céu do PLANO DE FUNDO.
 *
 * `fracaoVisivel` é a parte de baixo do plano que a câmera de fato enquadra: o
 * plano tem 46 m de altura e a lente só alcança cerca de um terço dele. Toda a
 * rampa do horizonte ao zênite é comprimida nessa fração — senão o visitante vê
 * só os dois primeiros centímetros do degradê e o céu volta a ser monocromático,
 * que era o defeito de origem.
 */
export function texturaDeCeu(
  solU: number,
  solV: number,
  fracaoVisivel = 0.46,
): THREE.CanvasTexture {
  // 2048 x 1024, e o numero sai de uma conta de amostragem: a faixa visivel do
  // plano tem ~54 m de largura e ocupa 1280 px de tela. Com 1024 de textura
  // espalhados nos 140 m do plano, sobravam 19 texels por metro para 24 pixels
  // por metro — o ceu chegava a tela JA interpolado, e o disco do sol e a borda
  // das nuvens perdiam a definicao justamente onde o olho olha.
  const largura = 2048
  const altura = 1024
  const cv = document.createElement('canvas')
  cv.width = largura
  cv.height = altura
  const ctx = cv.getContext('2d')!

  // v = 0 no TOPO do canvas e a rampa vai do horizonte para cima, então o
  // gradiente é desenhado de baixo para cima.
  const g = ctx.createLinearGradient(0, altura, 0, altura * (1 - fracaoVisivel))
  aplicaRampa(g, 0, 1)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, largura, altura)

  /**
   * A POSIÇÃO DO SOL VEM DE FORA, e isso é o ponto.
   *
   * A versão anterior cravava o brilho em (0,93, 0,995) — o canto direito de
   * baixo — porque com o sol a 8,5° de elevação e 104° de azimute ele caía fora
   * do recorte visível e só a cauda entrava. Número escolhido a olho para
   * combinar com uma direção de luz que morava em outro arquivo: exatamente a
   * armadilha de constante emprestada que `predio-luz.ts` já documenta três
   * vezes.
   *
   * Agora quem chama projeta `SOL` na geometria do plano e passa o resultado.
   * Mudar a elevação ou o azimute move o disco junto, sem ninguém lembrar de
   * vir aqui.
   */
  pintaBrilho(ctx, largura, altura, solU, solV, largura * 0.46)
  /**
   * SÓ A FAIXA DO HORIZONTE FICA AQUI, e as outras duas camadas saíram para
   * texturas próprias que ROLAM (ver `texturaDeNuvens`).
   *
   * A divisão não é arbitrária, é de paralaxe. Nuvem baixa no horizonte está a
   * dezenas de quilômetros: por mais que ande, o ângulo que ela varre por minuto
   * é quase zero, e ela parece parada. Nuvem de meia altura, mais perto e mais
   * acima, atravessa o enquadramento de forma visível. Deixar as do horizonte
   * assadas no degradê é o que ELAS de fato fazem — e de quebra elas continuam
   * ancoradas no sol, com a barriga acesa do lado certo, que é o detalhe que
   * uma camada rolante não consegue manter.
   *
   * `solU` e não `U_DO_SOL`: este é o plano, não a esfera. Ver o parâmetro.
   */
  /**
   * O ANDAR DE BAIXO: as nuvens do horizonte, no terço inferior da janela —
   * logo acima da silhueta da cidade, que é onde uma nuvem distante aparece.
   * Elas ficam AQUI, assadas no degradê, e não numa camada que rola, porque
   * nuvem baixa a dezenas de quilômetros varre um ângulo por minuto perto de
   * zero: ela de fato parece parada. Em troca, continua ancorada no sol, com a
   * barriga acesa do lado certo — o que uma camada rolante não mantém.
   */
  const horizonte = faixa(0.56, 1)
  pintaNuvens(ctx, largura, altura, horizonte[0], horizonte[1], 15, 1, solU, false)
  // O disco vem DEPOIS das nuvens: sol atrás de nuvem fica encoberto, e aqui ele
  // está acima da camada. Antes delas, o halo ficaria lavado por cima.
  pintaDisco(ctx, largura, altura, solU, solV, 18)

  granula(ctx, largura, altura)

  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

/** As duas camadas de nuvem que andam, e a altura em que cada uma vive. */
export type CamadaDeNuvem = 'cirro' | 'cumulo'

/**
 * ═══ A NUVEM QUE ANDA ═══
 *
 * Céu parado é a coisa que mais denuncia cenário pintado, e o motivo é que o
 * olho tem um detector de movimento muito melhor do que de forma. Uma cena com
 * água correndo, folha balançando e luz acesa, tendo por trás um céu que não se
 * mexe um pixel em três minutos, lê como fotografia colada atrás de uma maquete
 * — e o defeito aparece justamente porque o resto ficou bom.
 *
 * COMO SE FAZ ISSO POR UMA CHAMADA DE DESENHO: a nuvem sai do degradê e vira uma
 * textura TRANSPARENTE num plano próprio à frente dele, e o laço de quadro
 * avança `map.offset.x`. Não há shader, não há partícula, não há simulação: é
 * uma textura rolando, que é como todo céu de jogo é feito desde que existem
 * jogos. O custo é um quad por camada.
 *
 * O PREÇO É A EMENDA, e ele é pago em `bolhaEmenda`: a textura tem de ladrilhar
 * perfeitamente no eixo X, senão a volta do ciclo mostra uma costura vertical
 * cortando o céu.
 *
 * DUAS CAMADAS, E ELAS ANDAM EM VELOCIDADES DIFERENTES. Isso é paralaxe, e é o
 * que transforma "uma textura rolando" em "ar com profundidade": o cirro está
 * cinco vezes mais alto que o cúmulo, então varre muito menos ângulo por minuto
 * e precisa andar MAIS DEVAGAR. Duas camadas na mesma velocidade leriam como uma
 * chapa só; invertidas, o céu ficaria de dentro para fora sem ninguém saber
 * dizer por quê.
 */
export function texturaDeNuvens(camada: CamadaDeNuvem, solU: number): THREE.CanvasTexture {
  /**
   * O CIRRO CABE EM METADE DA RESOLUÇÃO, e o cúmulo não.
   *
   * O que custa texel é BORDA: o cúmulo tem silhueta recortada, com bossas de
   * segunda oitava que são o assunto da forma, e a 1024 elas chegam à tela já
   * interpoladas — o mesmo defeito que levou o degradê de fundo de 1024 para
   * 2048. O cirro é o oposto: é um véu sem nenhuma borda dura em lugar nenhum, e
   * metade da resolução é literalmente invisível nele. São 6 MB de memória de
   * vídeo que não se gasta.
   */
  const largura = camada === 'cirro' ? 1024 : 2048
  const altura = largura / 2
  const cv = document.createElement('canvas')
  cv.width = largura
  cv.height = altura
  const ctx = cv.getContext('2d')!

  if (camada === 'cirro') {
    /**
     * VINTE E DOIS E NÃO TRINTA E QUATRO, e a diferença é entre céu e listra.
     *
     * Com 34 mechas — cada uma com até oito fios, cada fio repetido nas duas
     * cópias de emenda — os feixes se encostavam e o céu inteiro virou uma
     * superfície escovada de ponta a ponta, sem um palmo de degradê limpo. O
     * efeito lê como filtro aplicado por cima, que é o oposto do que o cirro
     * deveria fazer.
     *
     * Cirro de verdade vem em BANCOS, com céu aberto entre eles. O que dá a
     * leitura não é a quantidade de fio, é o contraste entre a mecha e o azul
     * vazio ao lado dela.
     */
    // O andar de cima, e é o único que ocupa a parte da janela onde não há
    // casario nenhum: acima de tudo, contra o céu aberto. É por isso que o
    // cirro é a camada que mais trabalha no quadro.
    const alto = faixa(0, 0.38)
    pintaCirros(ctx, largura, altura, alto[0], alto[1], 22, solU, true)
  } else {
    /**
     * A SEMENTE 400 EXISTE PARA ESTA CAMADA NÃO SER A DE BAIXO DESLOCADA.
     *
     * `ruido(i, k)` é determinístico: com os mesmos índices saem as mesmas
     * nuvens, nas mesmas posições relativas. Sem deslocar a semente, a faixa que
     * rola seria uma cópia exata da faixa do horizonte pairando acima dela, e
     * duas fileiras idênticas de nuvem é o tipo de repetição que o olho pega na
     * primeira olhada mesmo sem saber o que está vendo.
     */
    const meio = faixa(0.22, 0.66)
    pintaNuvens(ctx, largura, altura, meio[0], meio[1], 13, 1, solU, true, 400)
  }

  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  // `RepeatWrapping` no X é o que permite `offset.x` correr indefinidamente; no
  // Y ele tem de ser preso, senão a nuvem mais alta reaparece embaixo do
  // horizonte na primeira vez que a amostragem passar de 1.
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  tex.anisotropy = 8
  return tex
}

/**
 * Quanto de textura cada camada anda por segundo.
 *
 * Uma volta inteira é a largura do plano do céu, 140 m. O cúmulo a 0,0023
 * atravessa 0,32 m de cena por segundo — cerca de 19 m por minuto, num
 * enquadramento de uns 54 m de largura. É lento o bastante para nunca chamar
 * atenção e rápido o bastante para, depois de dez segundos parado, o céu estar
 * demonstravelmente em outro lugar. Vento de verdade num terraço faz isso.
 *
 * O cirro anda a 40 % disso pela razão de paralaxe do comentário acima.
 */
export const DERIVA_DAS_NUVENS: Readonly<Record<CamadaDeNuvem, number>> = {
  cumulo: 0.0023,
  cirro: 0.00092,
}

/**
 * O MAPA DE AMBIENTE, equirretangular, com o mesmo céu.
 *
 * O `PMREMGenerator` no fim não é opcional: mapa cru só serve para espelho
 * perfeito. É ele que pré-filtra nos vários níveis de rugosidade, para metal
 * escovado ficar embaçado e metal polido ficar nítido.
 *
 * `ar` e `chao` continuam entrando: abaixo do horizonte o que existe em volta do
 * andar não é céu, é o ar daquele andar e a laje. Um andar interno refletindo
 * céu aberto seria tão errado quanto metal refletindo nada — e é por isso que
 * esta função continua recebendo a cor do andar ativo em vez de ser constante.
 */
export function criaAmbiente(
  renderer: THREE.WebGLRenderer,
  ar: string,
  chao: string,
  ceuAberto: boolean,
): THREE.Texture {
  const largura = 512
  const altura = 256
  const cv = document.createElement('canvas')
  cv.width = largura
  cv.height = altura
  const ctx = cv.getContext('2d')!

  // Metade de cima: céu. O horizonte fica em 0,5 porque em equirretangular a
  // linha do meio da imagem É o horizonte da esfera.
  const g = ctx.createLinearGradient(0, altura * 0.5, 0, 0)
  aplicaRampa(g, 0, 1)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, largura, altura * 0.5)

  // Metade de baixo: o ar do andar dissolvendo na laje.
  const gb = ctx.createLinearGradient(0, altura * 0.5, 0, altura)
  gb.addColorStop(0, ar)
  gb.addColorStop(1, chao)
  ctx.fillStyle = gb
  ctx.fillRect(0, altura * 0.5 - 1, largura, altura * 0.5 + 1)

  // O sol entra no ambiente SÓ onde há céu aberto. Num andar interno o que
  // ilumina é a luminária do andar, e um sol refletido no metal do datacenter
  // seria a mesma incoerência que o HDRI de interior seria na cobertura.
  if (ceuAberto) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, largura, altura * 0.5)
    ctx.clip()
    pintaBrilho(ctx, largura, altura, U_DO_SOL, 0.47, largura * 0.3)
    // `U_DO_SOL` aqui, e não `solU`: este mapa É equirretangular, e é o único
    // lugar do arquivo onde essa coordenada é a certa. Daí `enrola` também ser
    // verdadeiro — a esfera fecha.
    pintaNuvens(ctx, largura, altura, 0.2, 0.49, 22, 1, U_DO_SOL, true)
    // O cirro entra no ambiente pelo mesmo motivo que tudo aqui: o que a lâmina
    // d'água devolve tem de ser o céu que está na tela. Com o cirro só no fundo,
    // a piscina refletiria um céu mais vazio que o de cima dela.
    pintaCirros(ctx, largura, altura, 0.12, 0.42, 26, U_DO_SOL, true)
    ctx.restore()
  }

  const tex = new THREE.CanvasTexture(cv)
  tex.mapping = THREE.EquirectangularReflectionMapping
  tex.colorSpace = THREE.SRGBColorSpace

  const pmrem = new THREE.PMREMGenerator(renderer)
  pmrem.compileEquirectangularShader()
  const alvo = pmrem.fromEquirectangular(tex)
  tex.dispose()
  pmrem.dispose()
  return alvo.texture
}
