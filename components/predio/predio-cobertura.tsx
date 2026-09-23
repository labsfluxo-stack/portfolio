'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { Coletor } from './predio-instancias'
import {
  casca,
  comDetalhe,
  comRepeticao,
  concreto,
  folha,
  brilhoDeNicho,
  causticas,
  comOndulacao,
  comVento,
  derrameDeVidro,
  fachoDeEspeto,
  fronde,
  graminea,
  madeiraDeDeck,
  massaDeFolhagem,
  microrrelevo,
  normalDeAgua,
  OPACIDADE_LIMPA,
  paredeLavada,
  veuDagua,
  vidroPlano,
} from './predio-materiais'

/**
 * A COBERTURA — o primeiro quadro do site.
 *
 * A spec pede que este andar diga "os negócios vão bem e tranquilos" SEM
 * escrever isso, e que IMPACTE.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * O QUE ESTAVA FALTANDO PARA SER REALISTA, e o diagnóstico vale para a cena
 * inteira. Havia geometria certa e material errado, mas o problema maior era
 * mais básico: TUDO ERA PRIMITIVA DE ARESTA VIVA.
 *
 * 1. ARESTA VIVA NÃO EXISTE. Nenhum objeto fabricado tem aresta de raio zero —
 *    madeira é lixada, metal é dobrado, estofado é costurado. E o que o olho usa
 *    para julgar isso não é a forma: é o FIO DE LUZ que corre pela quina. Uma
 *    aresta com 2 mm de raio pega o sol e desenha uma linha clara; uma aresta
 *    matemática não pega nada e a peça lê como bloco de renderização. É o tell
 *    mais forte de todos e o mais barato de resolver — `RoundedBoxGeometry`.
 *
 * 2. SUPERFÍCIE SEM RELEVO É PLÁSTICO, porque plástico é justamente o material
 *    que não tem relevo. Grão de madeira, poro de concreto e trama de lona são
 *    micro-geometria, e sem mapa de normal a luz varre a superfície sem
 *    encontrar nada. Ver `predio-materiais.ts`.
 *
 * 3. SILHUETA ERRADA. Espreguiçadeira não é duas caixas: é estrutura tubular com
 *    encosto RECLINADO e estofado por cima, e o que se reconhece a quarenta
 *    metros é esse perfil em L quebrado. Árvore não é três esferas num palito:
 *    é tronco CÔNICO com galhos e uma copa feita de muitos tufos de tamanhos
 *    diferentes — esfera lisa lê como pirulito. Vaso não é um cubo: é um tronco
 *    de cone com BORDA, e é a borda que diz "vaso".
 * ────────────────────────────────────────────────────────────────────────────
 *
 * DUAS LIÇÕES DE ENQUADRAMENTO que continuam valendo e estão medidas:
 *
 * - O PARAPEITO ERA UMA VENDA. Com 0,88 m ele ocupava a faixa y 455..580 de uma
 *   tela de 720 e sobravam 17 pixels de deck. Está em 0,34 m, em `Predio.tsx`.
 * - A JANELA É MAIS ESTREITA QUE O PRÉDIO. A escala na tela é 599/(5,9 − z)
 *   px/m, e a meia-largura visível é 1,068·(5,9 − z) — 10,2 m na faixa das
 *   espreguiçadeiras, não 15. Em retrato o aspecto cai para 0,462 e sobra uma
 *   COLUNA DE ±2,8 m. Daí a regra: todo andar precisa de composição completa
 *   dentro de |x| < 3; o resto é bônus de tela grande.
 */

/**
 * A mancha de sombra de contato, desenhada em canvas.
 *
 * Degradê radial usado como MAPA DE ALFA. Não é a sombra do sol — essa existe e
 * é projetada, mas com o sol a 8,5° de elevação ela sai 6,7 vezes a altura do
 * objeto e cai fora do quadro. A de contato é a outra, a que fica embaixo da
 * peça, e é ela que ancora. Sem ela o móvel flutua.
 */
function manchaDeSombra(): THREE.CanvasTexture {
  const n = 128
  const cv = document.createElement('canvas')
  cv.width = cv.height = n
  const ctx = cv.getContext('2d')!
  const g = ctx.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.42, 'rgba(255,255,255,0.62)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, n, n)
  return new THREE.CanvasTexture(cv)
}

/** Ruído determinístico — zero `Math.random()`, a cena nasce igual sempre. */
function ruido(i: number, k: number): number {
  const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453
  return s - Math.floor(s)
}

/**
 * AS MEDIDAS DO ESCRITÓRIO VIVEM NO MÓDULO, e não dentro do `useMemo`.
 *
 * Duas coisas dele não podem ser instanciadas — o pano de vidro (é transparente,
 * precisa ser ordenado contra o interior) e a luz (não é geometria). Elas moram
 * no bloco JSX, que está fora do `useMemo` e não enxerga nada do que é declarado
 * lá dentro. A primeira versão resolveu isso repetindo os números nos dois
 * lugares, e repetir coordenada é combinar um erro para depois: bastava mover o
 * volume 35 cm e o vidro ficaria para trás, flutuando sozinho.
 *
 * E O FUNDO DO ESCRITÓRIO É A PAREDE DO TERRAÇO — ele não tem uma própria.
 *
 * Eu desenhei uma, e ela não aparecia: o render mostrava poro de concreto dentro
 * do escritório, onde deveria haver reboco liso. A sonda que resolveu isso foi
 * pintar o material de magenta e renderizar uma vez — só as DUAS LATERAIS
 * ficaram magenta. Com isso o diagnóstico virou aritmética em vez de palpite: a
 * parede do andar está em `zCentro − prof/2` com 30 cm de espessura, ou seja
 * face em −11,25, e eu tinha posto o fundo da caixa em −11,29. Quatro
 * centímetros ATRÁS. A caixa inteira estava ali; faltava ela terminar do lado
 * certo de um plano que eu nunca tinha medido.
 *
 * Empurrar tudo para a frente resolveria, e seria a solução errada. Pavilhão de
 * cobertura se encosta no núcleo do prédio — é por ali que sobem prumada e
 * escada. Então o `z` passa a ser DERIVADO da parede em vez de escolhido a olho,
 * e a chance de os dois se cruzarem de novo quando um deles mudar desaparece.
 */
/**
 * A PISCINA, DEFINIDA POR BORDAS — e não por centro mais fator, como era.
 *
 * Ela vive nos dois lados do arquivo: o tanque, a lâmina, o fundo e as pedras
 * estão no bloco JSX (a lâmina é transparente e precisa ser ordenada), e a
 * escada e o degrau submerso estão no coletor. As duas metades derivavam a
 * posição de `zCentro − prof × 0,03` cada uma por conta própria, e as dimensões
 * eram cinco fatores independentes (0,26 para a lâmina, 0,145 para a distância
 * das pedras, 0,29 para as pedras laterais, 0,27 para o tanque). Mexer na
 * profundidade da água exigia acertar os cinco à mão e torcer.
 *
 * Agora há uma fonte só, e ela diz o que a piscina É: onde começa e onde acaba.
 * Tudo o mais — centro, profundidade, borda — sai daí por conta.
 *
 * A LÂMINA AVANÇOU 2,28 m PARA A FRENTE — a borda foi de −3,60 para −1,33, e o
 * tanque passou de 3,38 m para 5,66 m de profundidade, 67% a mais. Pedido do
 * dono, e ela só pôde ir tão longe porque as espreguiçadeiras saíram na mesma
 * leva e liberaram a faixa de deck inteira.
 *
 * A razão de crescer para a FRENTE e não para trás é de ângulo, e é o que faz o
 * ganho ser maior do que os números sugerem. A câmera olha a lâmina quase de
 * raspão: água acrescentada no fundo chega comprimida em quase nada na tela,
 * enquanto a mesma água acrescentada perto abre.
 *
 * O limite não é estético, é de colisão. A pedra da borda ocupa −1,34 a −0,92, e
 * depois dela ainda precisam caber o ralo do deck e o vidro do guarda-corpo
 * (zCentro + prof × 0,40 = 0,30). O ralo estava em × 0,30 = −1,00, ou seja
 * DENTRO da pedra — andou para × 0,345, e agora sobram 50 cm de deck entre os
 * dois. É essa folga que impede a próxima mudança de empurrar a piscina contra
 * o parapeito.
 */
/**
 * A LARGURA ENTRA NA MESMA FONTE QUE O COMPRIMENTO, e ela precisava entrar.
 *
 * O z já saía daqui desde que a lâmina avançou; o x continuou espalhado por
 * cinco números literais no bloco JSX — 9 para a água e para o fundo, 9,9 para a
 * pedra transversal, 9,04 para o tanque e o par −3,74 / 5,74 para as pedras
 * laterais. Encolher a piscina exigia acertar os cinco à mão, que é exatamente a
 * armadilha que já produziu a escada no meio da água e os postes do pergolado
 * dentro dela.
 *
 * Agora só existem três números: onde começa, onde acaba e quão larga é. Borda,
 * tanque e pedra saem deles.
 *
 * O TAMANHO DIMINUIU a pedido do dono: a frente recuou de × 0,275 para × 0,225
 * e a largura de 9 para 8 m. São 11% em cada direção — o bastante para a lâmina
 * deixar de encostar nas duas pontas do vão e devolver uma faixa de deck ao
 * redor, e pouco o bastante para ela continuar sendo a peça que ocupa o primeiro
 * plano.
 */
const PISCINA = { fundo: 0.16, frente: 0.225, centroX: 1, largura: 8 }
const piscinaZ = (zCentro: number, prof: number) => {
  const fundo = zCentro - prof * PISCINA.fundo
  const frente = zCentro + prof * PISCINA.frente
  return {
    fundo,
    frente,
    centro: (fundo + frente) / 2,
    profundidade: frente - fundo,
    x: PISCINA.centroX,
    largura: PISCINA.largura,
    // Centro das duas pedras laterais: meia-largura mais o meio da pedra de 42 cm
    // menos os 3 cm de lábio que ela avança sobre a água.
    bordaX: PISCINA.largura / 2 + 0.24,
  }
}

const ESCRITORIO = { x: -7.8, largura: 5.8, altura: 2.92, profundidade: 2.0 }
/**
 * O BAR, subido para o escopo do módulo pela mesma razão que o escritório já
 * estava aqui: ele é uma das duas PONTAS do terraço, e três coisas fora do
 * `useMemo` das malhas precisam saber onde ele termina — o limite da cascata, o
 * eixo do pergolado e a própria montagem do bar.
 *
 * `beiral` é o quanto a laje e os pilares avançam além da largura do balcão. É
 * essa face, e não a do balcão, que define o "fim do bar" quando se olha a
 * cobertura de frente.
 */
const BAR = { x: 9.0, largura: 4.9, beiral: 0.4 }
/** Face externa de cada construção — as duas pontas do terraço, em x. */
/**
 * ═══ O FECHAMENTO LATERAL ═══
 *
 * O terraço acabava no ar: as réguas do deck iam até a borda e a cidade descia
 * até encostar no piso. Nenhum prédio é assim. A laje de cobertura termina na
 * PLATIBANDA — a mureta que contorna o perímetro, esconde a drenagem e dá
 * coroamento ao volume. 1,10 m porque é o que a norma pede de guarda-corpo
 * (1,05 m) com a folga que terraço de uso costuma levar.
 *
 * ELA É OPACA E O DA FRENTE É DE VIDRO, e a diferença não é de gosto: vidro se
 * põe onde há vista, alvenaria onde há vizinho colado. A frente olha a cidade; as
 * laterais olham a empena do prédio ao lado.
 *
 * O RUFO é a capa metálica no topo. Geometria de nada — uma caixa de 7 cm — e é
 * o detalhe que mais diz "isto foi construído": platibanda sem rufo é maquete,
 * porque é por cima dela que a água entraria na alvenaria.
 */
const PLATIBANDA = { altura: 1.1, espessura: 0.25, rufo: 0.07 }

/**
 * ═══ O NÚCLEO QUE EMERGE ═══
 *
 * O poço do elevador TEM de sobrepassar o último piso — não é licença poética,
 * é o percurso da cabine mais o espaço de segurança no topo. A escada sobe junto.
 * Num terraço isso vira um volume construído, e é ele que faz uma cobertura ler
 * como cobertura em vez de deque flutuante: é a única peça que prova que se
 * chega ali por dentro do prédio.
 *
 * 3,5 m de altura contra os 3,2 m de pé-direito do bar — o núcleo é o ponto mais
 * alto do terraço, como sempre é.
 *
 * ASSIMÉTRICO DE PROPÓSITO, e a decisão é do dono: o núcleo fecha a ponta
 * esquerda até 3,5 m, enquanto a direita para em 2,2 m para o skyline continuar
 * passando por cima. Prédio real é assimétrico — o núcleo fica onde a prumada
 * sobe, não onde a composição gostaria.
 */
/**
 * AS MEDIDAS CRESCERAM DEPOIS DO PRIMEIRO RENDER, e o motivo é de perspectiva,
 * não de programa. Com 3,0 x 2,6 recuado atrás do escritório, o volume aparecia
 * pequeno e afastado da borda: sobrava uma faixa de deck com a cidade descendo
 * até o piso à esquerda dele, que é exatamente o buraco que ele existe para
 * tapar. Coisa longe encolhe, e a ponta do quadro é onde a perspectiva mais
 * puxa para dentro.
 *
 * 3,4 x 4,4 com a face AVANÇANDO 1,4 m além do vidro do escritório resolve as
 * duas coisas: o volume ganha presença e o corpo dele chega à borda. E é um
 * tamanho honesto — aqui dentro cabem o poço do elevador E a caixa de escada,
 * que é o que sobe junto num prédio deste porte.
 */
const NUCLEO = { largura: 3.4, profundidade: 4.4, altura: 3.5, avanco: 1.4 }

/**
 * ═══ O MURAL VERDE — a empena que vira jardim ═══
 *
 * Jardim vertical não se pendura em qualquer lugar: ele existe porque há uma
 * PAREDE CEGA, e parede cega num terraço urbano é a empena do vizinho colado.
 * É o uso canônico, e é por isso que ele fecha a ponta direita em vez de ser um
 * objeto posto sobre o deck.
 *
 * 2,20 m e não os 3,2 m de pé-direito do bar: é a altura que o dono escolheu
 * para o skyline continuar passando por cima da ponta direita. Fica mais baixo
 * que uma empena real, e essa é a concessão consciente do desenho — o núcleo da
 * esquerda carrega a lógica estrita, este lado carrega a vista.
 *
 * MÓDULOS DE 0,55 m, que é como se constrói: bandeja de cultivo, substrato,
 * gotejamento por linha. Uma textura de folhas pintada na parede seria mais
 * barata e leria como papel de parede — o que denuncia um jardim vertical falso
 * é a ausência de MÓDULO, porque o olho conhece a grade mesmo sem saber.
 */
const MURAL = { altura: 2.2, espessura: 0.3, modulo: 0.55 }

const X_FIM_DO_ESCRITORIO = ESCRITORIO.x - ESCRITORIO.largura / 2
const X_FIM_DO_BAR = BAR.x + BAR.largura / 2 + BAR.beiral

/**
 * A CASCATA CORRE ENTRE AS DUAS CONSTRUÇÕES — e só entre elas.
 *
 * ELA IA DE PONTA A PONTA DA LAJE, os 30 m inteiros. O problema não é de
 * verossimilhança, é de COMPOSIÇÃO: um véu d'água de trinta metros não tem
 * começo nem fim dentro do quadro, e uma superfície que entra e sai de cena
 * pelos dois lados deixa de ser um objeto e vira um fundo. Limitada às pontas do
 * escritório e do bar, ela ganha as duas bordas — e passa a ser lida como a
 * parede de água DAQUELE pátio, contida pelas duas construções que o formam.
 *
 * O ESCRITÓRIO AINDA RECORTA O SEU TRECHO. O fundo dele É a parede do andar (ver
 * `zDaParedeDoAndar`), então véu colado nela apareceria DENTRO da sala, atrás da
 * estante. Com o limite novo o trecho da esquerda fica degenerado — vai de
 * −10,70 a −10,75 — e o filtro o descarta sozinho, sem ninguém precisar saber
 * disso aqui. É por isso que o filtro existe em vez de dois `if`.
 *
 * Devolve pares [de, até] em x. Se um dia o escritório crescer até a ponta, o
 * trecho daquele lado simplesmente não existe em vez de virar uma peça de
 * largura negativa.
 */
/**
 * QUANTOS METROS DE PAREDE CABEM NUM LADRILHO DO VÉU — e este número é a
 * ESCALA de tudo que está desenhado na textura da água.
 *
 * ERA 1,4 M, E ISSO FAZIA A CASCATA PARECER CHUVA. A textura tem três oitavas
 * de largura relativa: filamento, cordão e lençol. Mas "relativa" é relativa ao
 * LADRILHO — com 1,4 m, o cordão de 0,004 a 0,018 do ladrilho media de 5 mm a
 * 2,5 cm, e o "lençol", que o comentário do gerador chama de escala de metros,
 * não passava de 20 cm. O render devolveu exatamente o que esses números dizem:
 * riscos verticais finos e uniformes num painel azul, com cara de vidro riscado.
 *
 * Nenhuma quantidade de oitava conserta isso, porque o problema não é a falta
 * de escalas — é que as três estavam comprimidas na mesma década de tamanho.
 *
 * A 3,2 m o cordão passa a medir de 1,3 a 5,8 cm, que é a espessura de um filete
 * de água de verdade numa parede de três metros, e o lençol chega a 45 cm. De
 * quebra, a aeração — manchas de 1 a 5 cm, invisíveis antes — vira mancha de
 * 3 a 11 cm, que é o tamanho em que ela finalmente aparece.
 *
 * O limite superior é o próprio ladrilho: nada desenhado aqui pode ser maior que
 * ele sem se repetir. É por isso que a variação de escala de METROS de verdade
 * fica por conta da geometria — a soleira, a calha, o recorte do escritório — e
 * não da textura.
 */
/**
 * ═══ UMA FONTE DE LUZ, EM VALOR HDR ═══
 *
 * O PROBLEMA QUE ISTO RESOLVE. Cor em hexadecimal nunca passa de 1,0. Enquanto
 * as luminárias desta cena eram `#ffd9a0` puro, elas tinham EXATAMENTE o mesmo
 * valor que uma parede branca ao sol — e para o passe de brilho as duas eram a
 * mesma coisa. Daí o limiar do bloom ter subido para 0,88 e mesmo assim pegar o
 * céu: não havia limiar possível, porque não havia diferença a separar.
 *
 * Fonte de luz não é uma superfície clara. Ela é uma superfície que EMITE, e num
 * quadro de hora dourada ela emite dez, vinte vezes mais que o entorno. Essa
 * razão é o alcance dinâmico, e é ela que faz uma lâmpada parecer acesa numa
 * foto em vez de parecer pintada de branco.
 *
 * `THREE.Color` guarda float, não byte: multiplicar depois de converter para
 * linear dá valores acima de 1 sem truque nenhum. O alvo do composer é
 * `HalfFloatType`, então eles chegam inteiros ao passe de brilho; o `OutputPass`
 * comprime tudo de volta no fim, com o ACES rolando as altas em vez de cortá-las.
 *
 * E POR ISSO `toneMapped` VOLTA A SER VERDADEIRO nestas peças. O `false` existia
 * como remédio para a falta de headroom — sem ele, ACES amassava a luminária no
 * mesmo bege de tudo. Com valor de verdade acima de 1 o remédio virou veneno:
 * `false` faz a peça pular a curva e ser cortada em 1,0 pelo quadro de 8 bits,
 * perdendo justamente a rolagem que a faz parecer quente no miolo e branca no
 * centro. E tinha um efeito colateral que ninguém tinha ligado: nos degraus sem
 * composer a cena desenha direto na tela COM tone mapping, e nos degraus com
 * composer o ACES vem do `OutputPass` — então `toneMapped: false` fazia as
 * luminárias mudarem de aparência entre degraus de qualidade. Uma causa a menos
 * para "as luzes apagando e voltando".
 */
const fonte = (hex: string, ganho: number) => new THREE.Color(hex).multiplyScalar(ganho)

const LADRILHO_DO_VEU = 3.2

/**
 * Quantos metros de vidro cabem num ladrilho de `vidroPlano`.
 *
 * A onda de rolo tem período de METROS — é o que faz o reflexo serpentear ao
 * correr pela fachada. Com um ladrilho pequeno ela viraria textura de superfície
 * e o vidro leria como vidro fosco; com um grande demais, a fachada inteira cabe
 * numa crista só e não acontece nada. Dois metros e meio é o passo em que a onda
 * atravessa um pano de escritório uma vez e meia.
 *
 * O mesmo número serve o guarda-corpo, e é esse o ponto: duas peças de vidro
 * vizinhas com ondas de escalas diferentes denunciam textura na hora.
 */
const LADRILHO_DO_VIDRO = 2.5
/**
 * A inclinação da onda na normal. Baixíssima de propósito — ver `vidroPlano`:
 * qualquer valor que faça a onda APARECER como relevo transformou vidro em água.
 */
const VIDRO_RELEVO = new THREE.Vector2(0.35, 0.35)

/**
 * O envelope do facho do espeto: quanto ele sobe e quanto ele abre lá em cima.
 *
 * 1,9 m põe o topo do feixe em `piso + 2,77`, dentro da copa da oliveira, que é
 * o que um espeto de jardim faz — ele ilumina a MASSA, não passa por ela. E 90
 * cm de boca é a abertura de uma lente com difusor a essa distância: mais que
 * isso vira holofote, menos vira laser.
 */
const FACHO_ESPETO = { altura: 1.9, boca: 0.9 }

const TRECHOS_DA_CASCATA = (xEsc: number, largura: number): [number, number][] =>
  (
    [
      [X_FIM_DO_ESCRITORIO, xEsc - largura / 2 - 0.05],
      [xEsc + largura / 2 + 0.05, X_FIM_DO_BAR],
    ] as [number, number][]
  ).filter(([de, ate]) => ate - de > 0.5)
/** Face interna da parede do andar — é ela que fecha o escritório por trás. */
const zDaParedeDoAndar = (zCentro: number, prof: number) => zCentro - prof / 2 + 0.15
const zDoEscritorio = (zCentro: number, prof: number) =>
  zDaParedeDoAndar(zCentro, prof) + ESCRITORIO.profundidade / 2

export function Cobertura({
  piso,
  zCentro,
  prof,
  meiaLargura,
}: {
  piso: number
  zCentro: number
  prof: number
  meiaLargura: number
}) {
  const { scene } = useThree()
  const ondaDagua = useMemo(() => normalDeAgua(), [])
  /**
   * O RELOGIO DO VENTO, e ele vive FORA do `useMemo` das malhas.
   *
   * E um objeto `{ value }` compartilhado por REFERENCIA com o uniforme de todos
   * os materiais de vegetacao. Escrever nele por quadro e a unica coisa que o
   * JavaScript faz pelo vento inteiro — nenhuma matriz recalculada, nenhum buffer
   * de instancia reenviado, nenhuma malha tocada.
   *
   * Fora do `useMemo` porque ele e o unico estado que atravessa quadros: se o
   * andar remontar — na promocao de parallax para perspectiva, por exemplo —, o
   * balanco tem de continuar de onde estava em vez de saltar para zero.
   */
  const relogioDoVento = useRef({ value: 0 }).current

  const malhas = useMemo(() => {
    const col = new Coletor()
    const madeira = madeiraDeDeck()
    const pedra = concreto()
    // `tecido()` saiu com o guarda-sol e as espreguiçadeiras: era a trama de lona
    // do estofado e da cúpula, e não sobrou nenhuma peça de pano na cobertura.
    const recorteDeFolha = folha()
    const recorteDeFolhaLarga = folha('ovalada')
    const recorteDeFronde = fronde()
    /**
     * AS PRATELEIRAS DO BAR, num lugar só, e é aqui que elas têm de estar.
     *
     * Elas governam QUATRO coisas que não podem sair de registro: a madeira da
     * prateleira, a fita que a ilumina por trás, a faixa clara desenhada no
     * painel do fundo e as garrafas em cima. Quando esses números moravam em
     * blocos diferentes eu já os deixei divergir uma vez — subi as prateleiras de
     * três para quatro e as fitas ficaram nas alturas antigas, acendendo o vão
     * entre elas em vez da prateleira.
     */
    const PRATELEIRAS_BAR = [0.74, 1.3, 1.86, 2.4]
    const NICHO_BASE = 0.345
    const NICHO_ALTURA = 2.27
    // As faixas do painel saem das MESMAS alturas, convertidas para a coordenada
    // V do nicho — 0 na base da caixa, 1 no topo dela.
    const brilhoDoNicho = brilhoDeNicho(
      PRATELEIRAS_BAR.map((y) => (y - NICHO_BASE) / NICHO_ALTURA),
    )
    const lavagemDaParede = paredeLavada()
    const mosqueadoDaCopa = massaDeFolhagem()
    /**
     * O MICRORRELEVO E COMPARTILHADO POR TODAS AS SUPERFICIES GRANDES.
     *
     * Um mapa de 512 para a cena inteira. Ele nao repete visivelmente porque a
     * frequencia dele esta abaixo do que o olho segue como padrao — e e por ser
     * um so que ele cabe: doze mapas base a 4096 para ter a mesma densidade
     * custariam duzentos megabytes de textura.
     *
     * A ESCALA E EM LADRILHOS POR METRO, e o intervalo util e 3 a 6 — nao 20.
     * Com 512 texels por ladrilho, 4 ladrilhos por metro poem cada texel em meio
     * milimetro, e e nessa faixa que o poro e o risco sobrevivem ao mipmap. Ver
     * a conta inteira em `comDetalhe`.
     *
     *  - deck (4,5 / 0,70): a regua e vista de raspao, onde o relevo mais
     *    aparece; grao um pouco mais fino e forca alta.
     *  - madeira escura (4,2 / 0,60): pergolado, marcenaria do bar, estante.
     *  - concreto (3,6 / 0,85): poro e o relevo que mais some em superficie
     *    grande, e a parede do fundo tem trinta metros. Grao grosso, forca alta.
     *  - pedra (4,0 / 0,60): chapim e tampo sao vistos de perto pelo visitante.
     *  - corten (3,2 / 0,75): ferrugem tem grao mais grosso que concreto.
     */
    const detalhe = microrrelevo()
    // O PISO DO ESCRITORIO E MADEIRA, e nao um marrom liso. Era a segunda maior
    // area do interior depois da parede, e a unica sem nenhuma informacao — um
    // retangulo de cor chapada no lugar de onde a cena mais mostra chao. Repete
    // 7 x 3 sobre 5,8 x 2,0 m, que poe a tabua perto de 80 cm: largura de piso
    // de engenharia, e nao de regua de deck.
    const tabuaDoEscritorio = comRepeticao(madeira, 7, 3)

    /**
     * ═══ O VENTO NA VEGETACAO ═══
     *
     * Cada planta tem BASE e ALCANCE proprios, e nenhum dos dois e arbitrario: a
     * base e o `y` onde aquela planta e engastada, e o alcance e a altura em que
     * o balanco satura. Com os dois errados o efeito le como gelatina em vez de
     * vento.
     *
     *  - folha de oliveira (0,055 / piso+1,75 / 3,0): engastada no TRONCO, nao no
     *    chao. A copa comeca a 2,85 e vai a 4,4, entao a ponta dela pega o peso
     *    cheio — que e o que uma oliveira faz: o tronco nao se mexe e a copa toda
     *    ondula.
     *  - folha larga (0,045 / piso+0,50 / 1,7): arbusto engastado na calha.
     *  - fronde (0,075 / piso+2,60 / 2,2): a MAIOR amplitude da cena, e por
     *    fisica — fronde de palmeira tem mais de dois metros de braco de alavanca
     *    e e a coisa que mais se mexe num terraco com vento.
     *  - graminea (0,038 / piso+0,50 / 1,3): amplitude menor em metros porque a
     *    lamina e curta, e ainda assim a mais visivel de todas, porque sao mais
     *    de mil laminas ondulando em fase deslocada.
     *  - massa da copa (0,045): acompanha a folha de oliveira. Nucleo parado com
     *    folha balancando faz ele reaparecer como o poliedro que acabou de sumir.
     *  - galho e raminho (0,030 / piso+0,50 / 3,0): menos que a folha, e nunca
     *    zero. Haste parada com folha balancando separa visualmente as duas.
     *
     * O QUE NAO ACOMPANHA: a sombra. O passe de profundidade usa outro shader, e
     * ele nao leva a injecao — entao a sombra da folha fica parada enquanto a
     * folha balanca. Com amplitude de quatro centimetros e sombra de folhagem ja
     * difusa, isso nao se ve; fica escrito porque a 20 cm se veria.
     */

    // ── geometrias ────────────────────────────────────────────────────────
    // Raio de 5 mm na régua: é o chanfro que uma régua de deck de verdade tem,
    // e é ele que produz a linha de luz no topo de cada tábua.
    const gRipa = new RoundedBoxGeometry(0.16, 0.022, prof * 0.92, 1, 0.005)

    // ESPREGUIÇADEIRA. Estrutura tubular + estofado, não duas caixas.
    // GOMOS, nao uma almofada inteira: e a costura que faz o estofado ler como
    // macio. Ver o comentario no ponto de uso.
    // Doze lados e nao oito: com a camera assentando a 5,9 m, um tubo de oito
    // lados mostra a faceta e o reflexo anda em degraus ao longo dele.
    // A almofada nao fica solta em cima do tubo: ela assenta DENTRO de um
    // caixilho. E a longarina do caixilho, aparecendo rente ao estofado, que diz
    // que a peca tem estrutura por baixo em vez de ser um colchao no chao.

    // PERGOLADO. Viga com chanfro e chapa de aço no encontro com o poste — é a
    // ferragem que diz "construído" em vez de "empilhado".
    // PERGOLADO MAIS ALTO (2,6 -> 2,9). Em janela baixa e larga a faixa vertical
    // visivel encolhe, e pergolado, topo de plantio e palmeira caiam todos na
    // mesma altura de tela, um cortando o outro. Subir 30 cm abre o vao entre o
    // forro do pergolado e a copa do jardim, e os dois voltam a se ler separados.
    // POSTE FINO E EM MENOR NUMERO. Pergolado vence 5 m de vao com folga em
    // madeira lamelada, entao quatro postes num pano de 11 m era estrutura
    // sobrando — e cada poste e uma barra vertical atravessando a vista de cima a
    // baixo. Tres postes com dois vaos de 5,2 m fazem o mesmo trabalho e devolvem
    // uma barra inteira de ceu.
    const gPoste = new RoundedBoxGeometry(0.095, 2.9, 0.095, 1, 0.008)
    const gRipaPergola = new RoundedBoxGeometry(0.07, 0.09, 4.6, 1, 0.006)
    const gVigaPergola = new RoundedBoxGeometry(12.2, 0.14, 0.13, 1, 0.008)
    const gChapa = new THREE.BoxGeometry(0.19, 0.22, 0.012)
    const gParafuso = new THREE.CylinderGeometry(0.012, 0.012, 0.03, 6)
    // MAO-FRANCESA: a diagonal entre poste e viga. Portico so com pecas
    // ortogonais e instavel de verdade, e o olho conhece isso — pergolado sem
    // contraventamento le como montagem provisoria.
    const gMaoFrancesa = new RoundedBoxGeometry(0.075, 0.075, 0.62, 1, 0.006)
    // Folha de trepadeira: a planta que sobe pelo pergolado. Achatada e miuda.
    /**
     * A FOLHA E UM PLANO, e esta troca e a mais importante da vegetacao inteira.
     *
     * Era um icosaedro — solido fechado, vinte triangulos. Solido e o OPOSTO de
     * folha por tres razoes, e todas as tres pesam mais nesta cena do que
     * pesariam em outra:
     *
     * 1. FOLHA E FINA. O que o olho reconhece como folhagem e um enxame de
     *    superficies PLANAS em angulos diferentes: umas de frente para o sol,
     *    brancas de estouro, outras de perfil, quase invisiveis. Um solido tem
     *    todas as normais ao mesmo tempo e o sombreamento MEDIA tudo — sai um
     *    tom uniforme, que e exatamente o que folhagem nao tem.
     *
     * 2. ESTA CENA E CONTRALUZ. Com o sol atras, folha de verdade fica entre a
     *    brasa e a silhueta: a que o sol atravessa ACENDE em verde-limao, a que
     *    esta de costas vira recorte preto. E a maior amplitude de valor da cena
     *    inteira, e o icosaedro nao conseguia entregar nada disso.
     *
     * 3. E MAIS BARATO. O plano tem DOIS triangulos contra vinte. Pelo mesmo
     *    orcamento cabem dez vezes mais folhas — e densidade e justamente o que
     *    faltava para a copa ler como massa em vez de punhado.
     *
     * O material tem de ser DE DUAS FACES: folha orientada ao acaso mostra o
     * verso metade do tempo, e face unica faria metade da copa sumir.
     */
    // O raminho que carrega o ramalhete de folhas. Escalado em Y por ramo.
    const gRaminho = new THREE.CylinderGeometry(0.0035, 0.008, 0.3, 4)

    // PALMEIRA. O estipe e aneladissimo — cada anel e a cicatriz de uma fronde
    // que caiu — mas a essa distancia o anel nao resolve; o que resolve e o
    // estipe ser FINO e a copa ser larga, que e a proporcao que nenhuma outra
    // planta tem.
    // ESTIPE ALTO de proposito: palmeira so le como palmeira se a copa SUBIR acima
    // do resto do plantio. Na altura da graminea ela vira mais um tufo, e o gesto
    // — estipe fino, copa em arco la em cima — e justamente o que a identifica.
    const gEstipe = new THREE.CylinderGeometry(0.052, 0.1, 4.2, 8)
    /**
     * A FRONDE VIRA UM ARCO DE DOIS SEGMENTOS, E NAO MAIS UMA LANCA RETA.
     *
     * Era isto o que sobrava de desordem, e a causa nao era mais o sorteio: era
     * a FORMA. Uma fronde reta saindo do apice num angulo fixo desenha um RAIO,
     * e cinco, sete, nove raios saindo do mesmo ponto formam uma estrela — ou um
     * guarda-sol. Palmeira nao tem raio. A fronde sai ERGUIDA, vira no meio e
     * desce pela ponta, e e esse arco, repetido igual pela coroa inteira, que
     * faz o chafariz que se reconhece de longe.
     *
     * Dois planos por fronde compram o arco por uma instancia a mais, e o preco
     * e baixo porque fronde e recorte por alfa: sem ordenacao por profundidade,
     * sem passe extra de cena.
     *
     * O QUE NAO PODE ACONTECER e cada segmento carregar a fronde inteira na
     * textura — dois desenhos completos em fila leem como duas frondes coladas
     * pela ponta. Entao cada segmento leva METADE do U: a base fica com 0–0,52
     * (foliolo curto, crescendo) e a ponta com 0,48–1 (foliolo longo, afinando
     * ate o apice). Os 4% de sobreposicao escondem a emenda.
     *
     * A proporcao 5:1 do raquis se mantem somando os dois: 2,40 de comprimento
     * por 0,46 de largura. Fronde pinada e LONGA E ESTREITA — com 2:1 ela le
     * como folha de bananeira, que e outra planta.
     */
    const metadeDoU = (g: THREE.PlaneGeometry, de: number, ate: number) => {
      const uv = g.getAttribute('uv') as THREE.BufferAttribute
      for (let i = 0; i < uv.count; i++) uv.setX(i, de + uv.getX(i) * (ate - de))
      uv.needsUpdate = true
      return g
    }
    const COMP_BASE = 1.24
    const COMP_PONTA = 1.16
    const gFrondeBase = metadeDoU(new THREE.PlaneGeometry(COMP_BASE, 0.46), 0, 0.52)
    // Mesma largura da base, e nao menor: o afinamento da fronde ja esta na
    // textura (o foliolo encurta ate sumir no ultimo quinto). Estreitar tambem a
    // geometria colocava um degrau de 13% bem na emenda dos dois segmentos.
    const gFrondePonta = metadeDoU(new THREE.PlaneGeometry(COMP_PONTA, 0.45), 0.48, 1)
    // CAPITEL: a bainha lisa e verde no topo do estipe, de onde as frondes saem.
    // E ela que fecha o ponto de convergencia — sem ela os planos se cruzam no ar
    // e o olho ve a costura em vez da coroa.
    const gCapitel = new THREE.CylinderGeometry(0.062, 0.115, 0.66, 8)
    // FLOR. Um tufo minusculo: a essa distancia flor nao tem petala, tem MANCHA.
    // FLOR PEQUENA. A 0,08 com escala 1,3 ela virava uma bola de 10 cm — a essa
    // distancia isso e uma BOLHA, nao uma flor. Florada de verdade se le como
    // pontilhado fino de cor, nunca como esfera identificavel.
    const gFlor = new THREE.IcosahedronGeometry(0.042, 0)
    // Folha larga tropical: a mesma lanceolada, mas esticada na largura. E o
    // contraste de forma contra a graminea fina.
    const gFolhaLarga = new THREE.PlaneGeometry(0.26, 0.2)
    // Haste pendente, para a planta derramar sobre a borda da jardineira.
    const gPendente = new THREE.CylinderGeometry(0.008, 0.013, 0.42, 4)

    /**
     * O ESCRITÓRIO ENVIDRAÇADO — e ele SUBSTITUI a caixa de escada.
     *
     * A caixa era um prisma de concreto fechado, e o argumento para ela existir
     * era bom: sem uma porta, a cobertura vira cenário de teatro, porque a parte
     * que a câmera não vê não existe. Só que ela resolvia a lógica e custava a
     * composição — 3,2 × 2,5 m de concreto cego, sem uma única informação, bem
     * no terço esquerdo, que é onde a referência põe a coisa mais rica do quadro.
     *
     * O escritório faz as duas coisas ao mesmo tempo: continua sendo o volume por
     * onde se chega (a porta agora é de vidro, na própria fachada) e passa a ser
     * uma JANELA ACESA. Interior iluminado visto através de vidro é o gesto mais
     * forte que uma fachada tem ao entardecer, e a razão é de contraste: o quadro
     * inteiro está em meia-luz, e uma caixa quente e detalhada dentro dele vira o
     * ponto para onde o olho vai primeiro.
     *
     * TUDO POR ESCALA sobre uma caixa unitária. O coletor guarda a geometria da
     * PRIMEIRA chamada de cada chave e descarta as seguintes em silêncio — foi o
     * que produziu 23 prédios do tamanho do primeiro em `predio-cidade.tsx`. Um
     * volume que varia de tamanho é escala na matriz, nunca uma geometria nova.
     */
    const gCaixa = new THREE.BoxGeometry(1, 1, 1)
    const gPlanoEsc = new THREE.PlaneGeometry(1, 1)
    // MOBILIÁRIO. Peças pequenas e reconhecíveis: é o inventário que diz
    // "escritório" e não "sala iluminada".
    const gLivro = new THREE.BoxGeometry(0.036, 1, 0.15)
    const gMonitor = new THREE.BoxGeometry(0.58, 0.35, 0.018)
    const gPeMonitor = new THREE.BoxGeometry(0.06, 0.13, 0.05)
    const gBaseMonitor = new THREE.BoxGeometry(0.24, 0.014, 0.16)
    const gAssentoCad = new THREE.BoxGeometry(0.46, 0.08, 0.44)
    const gEncostoCad = new THREE.BoxGeometry(0.44, 0.54, 0.055)
    const gColunaCad = new THREE.CylinderGeometry(0.028, 0.028, 0.26, 8)
    const gEstrelaCad = new THREE.CylinderGeometry(0.25, 0.25, 0.026, 5)
    const gLuminaria = new THREE.CylinderGeometry(0.055, 0.085, 0.1, 10)
    const gFioLum = new THREE.CylinderGeometry(0.0025, 0.0025, 1, 4)
    const gArandela = new THREE.BoxGeometry(0.26, 0.09, 0.11)
    // Junta de dilatacao: o sulco vertical que corta toda parede longa de
    // concreto. Parede de 30 m sem junta nao existe — ela racharia sozinha.
    const gJuntaParede = new THREE.BoxGeometry(0.035, 3.2, 0.04)
    // Chapim do parapeito: a pedra de arremate que corre no topo dele, sempre um
    // pouco mais larga, para a agua pingar longe da fachada.
    const gChapim = new THREE.BoxGeometry(1, 0.045, 0.33)
    const gTorneiraJardim = new THREE.CylinderGeometry(0.016, 0.016, 0.16, 6)

    // LUZ PRATICA: as pecas que ACENDEM. Ver o bloco de uso.
    const gBalizador = new THREE.CylinderGeometry(0.045, 0.045, 0.012, 10)
    const gFacho = new THREE.PlaneGeometry(0.5, 1.5)
    const gFitaLed = new THREE.BoxGeometry(1, 0.03, 0.03)
    // ESPETO DE JARDIM: corpo enterrado na terra e lente virada para cima. E a
    // luminaria que ilumina arvore em qualquer terraco, e a unica que se pode
    // enfiar num canteiro sem obra.
    const gEspeto = new THREE.CylinderGeometry(0.019, 0.024, 0.17, 6)
    const gLente = new THREE.CylinderGeometry(0.036, 0.03, 0.012, 10)
    // Folha de oliveira e LANCEOLADA: estreita e comprida, quase uma lamina.
    // O quad e mais LARGO que a folha: o recorte por alfa come as pontas, entao a
    // folha util fica com cerca de 55% da area. A geometria compensa a diferenca.
    // FOLHA MAIOR QUE O RAMINHO QUE A SUSTENTA. A 0,21 x 0,075 ela era um ponto
    // ao longo de um galho de meio metro, e o que se via de perto era GALHO com
    // uns pontinhos verdes — copa de arvore seca. Numa oliveira de verdade a
    // folhagem esconde o ramo quase inteiro; o ramo so aparece nos vaos.
    const gFolhaOliva = new THREE.PlaneGeometry(0.3, 0.115)

    // O GUARDA-SOL SAIU INTEIRO — lona em `Lathe` com caimento, mastro, varetas,
    // cubo, ponteira, babado e base de concreto. Ver o bloco de uso para o
    // porquê. As sete geometrias e o material dele saem junto: geometria que
    // ninguém instancia não economiza nada e cobra atenção de quem vier depois.

    // VASO. Tronco de cone com BORDA — é a borda que o olho lê como vaso.
    const perfilVaso = [
      new THREE.Vector2(0.3, 0.0),
      new THREE.Vector2(0.31, 0.03),
      new THREE.Vector2(0.37, 0.34),
      new THREE.Vector2(0.42, 0.62),
      new THREE.Vector2(0.46, 0.66),
      new THREE.Vector2(0.46, 0.72),
      new THREE.Vector2(0.42, 0.72),
      new THREE.Vector2(0.4, 0.68),
      new THREE.Vector2(0.38, 0.66),
    ]
    const gVasoAlto = new THREE.LatheGeometry(perfilVaso, 18)
    const gTerra = new THREE.CircleGeometry(0.38, 16)

    // ÁRVORE. Tronco CÔNICO, galhos e copa de muitos tufos facetados. O
    // icosaedro sem subdivisão é melhor que esfera aqui: a faceta lê como massa
    // de folhagem, a esfera lisa lê como bola.
    // OLIVEIRA. Tronco curto e grosso em relacao a copa — oliveira nao e alta,
    // e ampla. Tres deles saem da mesma base.
    // TRONCO DE ARVORE ADULTA. Oliveira de terraco chega facil a 4 m, e a
    // cobertura e CEU ABERTO — nada impede a copa de passar da linha do predio.
    // Arvore que termina abaixo do parapeito le como arbusto em vaso grande.
    const gTroncoOliva = new THREE.CylinderGeometry(0.07, 0.13, 2.4, 7)
    const gGalhoOliva = new THREE.CylinderGeometry(0.022, 0.05, 0.8, 5)
    // Tufo PEQUENO: a copa aberta precisa de muitos pequenos, nao poucos grandes.
    const gTufoOliva = new THREE.IcosahedronGeometry(0.27, 0)
    // BUXO: subdividido uma vez. Arbusto APARADO e liso — a faceta grossa que
    // serve para folhagem solta aqui contaria a historia errada.
    // GRAMINEA: lamina de 3 cm, escalada em Y por muda. Caixa e nao folha
    // modelada porque a 37 px/m ela ocupa pouco mais de um pixel.
    const gLamina = new THREE.BoxGeometry(0.03, 1, 0.007)
    // AGAVE: cone de 4 lados = folha rigida que afina ate a ponta.
    // JARDINEIRA LINEAR de corten — calha corrida, nao vaso pontual.
    const gJardineira = new RoundedBoxGeometry(3.4, 0.54, 0.8, 1, 0.018)

    // BAR. Tampo em BALANÇO sobre o balcão (a sombra fina embaixo do tampo é o
    // que dá espessura ao móvel) e apoio de pé em tubo.
    const gBalcao = new RoundedBoxGeometry(4.6, 1.0, 0.7, 1, 0.02)
    const gTampo = new RoundedBoxGeometry(5.0, 0.09, 0.96, 1, 0.014)
    const gPrateleira = new THREE.BoxGeometry(4.3, 0.045, 0.26)
    /**
     * ═══ QUATRO SILHUETAS DE GARRAFA, E ANTES HAVIA UMA ═══
     *
     * O dono olhou a parede do bar e disse duas coisas: "não dá para ver as
     * garrafas direito" e "todas são da mesma forma". As duas são o mesmo
     * defeito visto de dois lados.
     *
     * Havia UM cilindro levemente cônico, escalado em altura, largura e cor. Cor
     * e escala variam a MANCHA; não variam a SILHUETA. E silhueta é o que o olho
     * usa para contar objetos — oitenta cilindros iguais atrás de um vidro
     * retroiluminado não leem como oitenta garrafas, leem como uma textura
     * listrada. Foi exatamente o que o render mostrou.
     *
     * Quatro perfis, todos primitivas baratas, escolhidos porque são as quatro
     * silhuetas que qualquer pessoa reconhece numa prateleira de bar:
     *
     *  · RETA — lado paralelo, ombro alto. Uísque, rum.
     *  · OMBRO — base larga afinando forte para o gargalo. Conhaque, borgonha.
     *  · ALTA — estreita e comprida. Gim, vodca, licor.
     *  · QUADRADA — prisma de quatro lados, que é um cilindro com 4 segmentos.
     *    É a que mais destoa das outras três, e é por isso que ela está aqui:
     *    uma forma claramente não-redonda no meio quebra a leitura de pente.
     *
     * Custa três chaves novas no coletor. Barato pelo que devolve — e o gargalo
     * e o rótulo continuam compartilhados, porque gargalo é redondo em todas as
     * quatro na vida real também.
     */
    const gGarrafa = new THREE.CylinderGeometry(0.037, 0.043, 0.3, 8)
    const PERFIS_DE_GARRAFA = [
      { chave: 'garrafa', geo: gGarrafa },
      { chave: 'garrafaReta', geo: new THREE.CylinderGeometry(0.042, 0.042, 0.3, 8) },
      { chave: 'garrafaOmbro', geo: new THREE.CylinderGeometry(0.022, 0.052, 0.3, 8) },
      { chave: 'garrafaQuadrada', geo: new THREE.CylinderGeometry(0.04, 0.043, 0.3, 4) },
    ] as const
    // O GARGALO. Silhueta em dois tempos — corpo largo, ombro, pescoço fino — é
    // o que identifica uma garrafa de longe. Sem ele, trinta cilindros de topo
    // reto em fila leem como peças de dominó, que foi o que o render mostrou.
    const gGargalo = new THREE.CylinderGeometry(0.013, 0.019, 0.11, 6)
    const gShaker = new THREE.CylinderGeometry(0.036, 0.047, 0.22, 10)
    const gTigela = new THREE.CylinderGeometry(0.105, 0.068, 0.085, 12)
    // Embutida do forro do bar: disco raso, visto sempre de baixo.
    const gSpot = new THREE.CylinderGeometry(0.045, 0.045, 0.018, 10)
    // Aro de apoio de pe da banqueta alta.
    const gAroBanqueta = new THREE.TorusGeometry(0.17, 0.011, 5, 12)
    // Rotulo da garrafa: anel raso um pouco mais largo que o corpo, para ele
    // sobressair em vez de sumir dentro do vidro.
    const gRotulo = new THREE.CylinderGeometry(0.044, 0.044, 0.1, 8)
    // Ripa da frente do balcao. Escalada em Y; o que se le e a sombra entre elas.
    const gRipaBalcao = new THREE.BoxGeometry(0.05, 1, 0.022)
    const gApoioPe = new THREE.CylinderGeometry(0.026, 0.026, 4.4, 8)
    /**
     * CILINDRO UNITÁRIO, escalado por matriz — a mesma regra de `gCaixa`.
     *
     * Tampo de mesa, coluna e base têm raios e alturas diferentes, e uma
     * geometria por medida daria três malhas instanciadas onde cabe uma. O
     * coletor pega geometria E material da PRIMEIRA chamada de cada chave, então
     * variação de tamanho tem de vir na escala.
     *
     * 18 lados: a mesa é vista a doze metros e com 18 ela já é redonda; 12
     * mostraria o polígono na silhueta do tampo, que é a única borda dela que o
     * olho segue.
     */
    const gCilindro = new THREE.CylinderGeometry(1, 1, 1, 18)
    // Cone unitário — a lona enrolada do guarda-sol. Base 1, altura 1, escalado
    // por matriz como todo o resto. 12 lados bastam: ele tem 20 cm de diâmetro
    // na base e a silhueta já é curva nessa contagem.
    const gCone = new THREE.ConeGeometry(1, 1, 12)
    const gAssentoBanqueta = new THREE.CylinderGeometry(0.21, 0.2, 0.09, 14)
    const gPernaBanqueta = new THREE.CylinderGeometry(0.026, 0.034, 0.72, 8)

    // GUARDA-CORPO. Montante achatado (perfil de chapa, não pau quadrado) e
    // os ESPAÇADORES que prendem o vidro — é a ferragem que dá escala.
    const gMontanteVidro = new THREE.BoxGeometry(0.026, 0.9, 0.045)
    const gEspacador = new THREE.CylinderGeometry(0.019, 0.019, 0.05, 10)
    // Chapa de base do montante, parafusada no deck. Nenhum guarda-corpo brota
    // do piso: ele e aparafusado, e a chapa e a prova disso.
    const gChapaBase = new THREE.BoxGeometry(0.12, 0.014, 0.12)
    // Rodape de borda do deck: a tabua de acabamento que fecha a topeira das
    // reguas. Sem ela o deck termina mostrando o corte da madeira.
    const gRodapeDeck = new THREE.BoxGeometry(0.03, 0.055, 1)
    // Ralo do deck, em grelha.
    /**
     * ═══ O RALO VIROU LINEAR, E O MOTIVO É A GRADE DE PIXELS ═══
     *
     * O QUE ERA: um ralo quadrado de 26 cm com cinco barras de 1,8 cm espaçadas
     * de 5 cm, em aço com `metalness` 0,9. O dono apontou dois borrões brancos
     * pontilhados no deck e perguntou se era normal. Não é — são os dois ralos.
     *
     * E ISSO NÃO É DEFEITO DE MATERIAL, É DE ESCALA. Àquela distância a peça
     * ocupa uns 50 px e cada barra fica com 2 px, com 7 px de passo. Uma feição
     * de 2 px em metal quase espelhado contra um céu de poente só pode ser uma
     * de duas coisas por pixel — estouro ou vão escuro — e qual delas sai
     * depende de onde o centro do pixel calha de cair. É a definição de
     * serrilhamento: a geometria é mais fina que a grade de amostragem. Nenhum
     * ajuste de cor, rugosidade ou sombra conserta isso; ou a feição cresce, ou
     * ela sai.
     *
     * RALO LINEAR É A RESPOSTA CERTA POR DOIS MOTIVOS ao mesmo tempo. É o que um
     * deck contemporâneo de verdade usa — canaleta rente à borda, não grelha
     * quadrada de quintal — e é a única forma que SOBREVIVE a esta escala: 1,1 m
     * de comprimento dá mais de duzentos pixels, e 6 cm de largura dá uns doze.
     * Uma linha escura o olho lê como fresta; um pontilhado de 2 px ele lê como
     * sujeira no render.
     */
    const gRaloLinear = new THREE.BoxGeometry(1.1, 0.01, 0.055)
    const gMolduraRalo = new THREE.BoxGeometry(1.18, 0.014, 0.095)
    // PISCINA: corrimao de escada em U invertido, e a faixa de pastilha da linha
    // d'agua — as duas coisas que nenhuma piscina deixa de ter.
    const gCorrimaoEscada = new THREE.TorusGeometry(0.18, 0.019, 6, 12, Math.PI)
    const gHasteEscada = new THREE.CylinderGeometry(0.019, 0.019, 0.52, 8)
    const gDegrauSubmerso = new THREE.BoxGeometry(1.5, 0.06, 0.34)
    // Copo de bar, e um copo virado de boca para baixo no balcao e o sinal
    // universal de bar aberto e limpo.
    const gCopo = new THREE.CylinderGeometry(0.031, 0.026, 0.11, 8)
    const gTorneira = new THREE.CylinderGeometry(0.022, 0.022, 0.26, 8)
    const gSombra = new THREE.PlaneGeometry(1, 1)

    // ── materiais ─────────────────────────────────────────────────────────
    // Cor BRANCA no material sempre que houver `instanceColor`: a cor da cópia
    // multiplica a do material, então branco faz da cópia a cor final.
    const mDeck = comDetalhe(
      new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.86, ...madeira }),
      detalhe,
      4.5,
      0.7,
    )
    const mMadeiraEscura = comDetalhe(
      new THREE.MeshStandardMaterial({
        color: '#6b4a2e',
        roughness: 0.82,
        map: madeira.map,
        normalMap: madeira.normalMap,
        roughnessMap: madeira.roughnessMap,
      }),
      detalhe,
      4.2,
      0.6,
    )
    // Alumínio ESCOVADO, não polido: rugosidade 0,34 quebra o reflexo em vez de
    // devolver o céu inteiro. Metal polido numa cena com uma luz só vira mancha.
    /**
     * ═══ OS METAIS GANHAM MICRORRELEVO, E ERAM OS ÚLTIMOS SEM MAPA NENHUM ═══
     *
     * Deck, concreto, corten e pedra passaram pelo tratamento triplanar há
     * tempos. Os dois metais ficaram para trás: cor, `metalness`, `roughness` e
     * nada mais. Uma superfície metálica com rugosidade EXATAMENTE uniforme não
     * existe — e o olho sabe disso sem saber que sabe, porque o que ele lê num
     * metal não é a cor, é o comportamento do reflexo ao longo da peça.
     *
     * Rugosidade constante devolve um reflexo que muda só com a curvatura. Isso
     * lê como PLÁSTICO PINTADO DE CINZA, e é o mesmo defeito que a lâmina da
     * piscina tinha antes da ondulação: reflexo limpo demais.
     *
     * O microrrelevo é sutil de propósito — 0,35 e 0,3 de força, contra 0,85 do
     * concreto. Metal de serralheria é escovado ou anodizado, não martelado: o
     * que se quer é a especular tremer ao correr pelo montante, não o tubo
     * parecer batido.
     *
     * A ESCALA É ALTA (14 e 11 lajotas por metro) porque a peça é PEQUENA. Um
     * montante tem 2,6 cm de diâmetro; na escala de 3,6 do concreto, o tubo
     * inteiro caberia dentro de um décimo de lajota e não haveria variação
     * nenhuma ao longo dele. Detalhe tem de ser medido contra o objeto, não
     * contra a cena.
     */
    const mMetal = comDetalhe(
      new THREE.MeshStandardMaterial({
        color: '#c9c6bf',
        metalness: 0.88,
        roughness: 0.34,
      }),
      detalhe,
      14,
      0.35,
    )
    const mAco = comDetalhe(
      new THREE.MeshStandardMaterial({ color: '#8f8b84', metalness: 0.9, roughness: 0.42 }),
      detalhe,
      11,
      0.3,
    )
    /**
     * ═══ A PORTA DO ELEVADOR SAIU BEGE, E O CULPADO É A COR DE BASE ═══
     *
     * Primeiro render com `mMetal`: a porta leu como madeira pintada de creme,
     * não como inox. A causa é que em metal a COR DE BASE tinge o reflexo — e
     * `mMetal` tem base `#c9c6bf`, levemente quente, ajustada para o alumínio do
     * guarda-corpo. Sob um céu de hora dourada, quente vezes quente dá bege.
     *
     * Inox escovado de porta de elevador é FRIO e mais escuro. Base `#9aa0a2`
     * esfria o reflexo do céu em vez de somar a ele, e é isso que separa
     * "equipamento predial" de "marcenaria".
     *
     * Rugosidade 0,38, acima da do guarda-corpo: folha de elevador é escovada em
     * escovação grossa, e escovação grossa espalha. Espelho ali devolveria a
     * piscina inteira na porta.
     */
    const mPortaElevador = comDetalhe(
      new THREE.MeshStandardMaterial({ color: '#9aa0a2', metalness: 0.86, roughness: 0.38 }),
      detalhe,
      16,
      0.4,
    )
    // A GRELHA DA CANALETA. Escura e fosca de propósito: o que o olho lê numa
    // canaleta é o VÃO, não a grade. `metalness` baixa porque grelha de ralo é
    // alumínio anodizado ou ferro pintado, e nenhum dos dois espelha nada.
    const mRaloFundo = new THREE.MeshStandardMaterial({
      color: '#33302c',
      metalness: 0.25,
      roughness: 0.85,
    })
    const mVaso = new THREE.MeshStandardMaterial({
      color: '#a89c86',
      roughness: 0.94,
      side: THREE.DoubleSide,
      map: pedra.map,
      normalMap: pedra.normalMap,
      roughnessMap: pedra.roughnessMap,
    })
    const mTerra = new THREE.MeshStandardMaterial({ color: '#3f3227', roughness: 0.99 })
    /**
     * FOLHAGEM DE DUAS FACES. Folha orientada ao acaso mostra o verso metade do
     * tempo; com face unica, metade da copa sumiria.
     *
     * Sem `flatShading`, ao contrario do resto: um plano tem uma normal so, e
     * achatar o sombreamento dele nao muda nada. Quem faz a variacao aqui e a
     * ORIENTACAO de cada folha, nao a faceta da malha.
     */
    const mFolha = comVento(
      new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.84,
      side: THREE.DoubleSide,
      map: recorteDeFolha.mapa,
      alphaMap: recorteDeFolha.alfa,
      /**
       * A QUILHA E A CUTÍCULA. Até aqui a folha era papel recortado: sem relevo,
       * toda folha virada para o mesmo lado recebia a mesma luz, e a copa inteira
       * vinha num verde só. O mapa de normal dobra a folha ao longo da nervura e
       * o de rugosidade faz o brilho correr em faixas entre as nervuras — é o
       * reflexo que diz ao olho que a folha está viva e úmida.
       *
       * `normalScale` baixo porque a peça é PEQUENA na tela: relevo forte numa
       * folha de doze pixels vira ruído cintilante, não volume.
       */
      normalMap: recorteDeFolha.normal,
      normalScale: new THREE.Vector2(0.6, 0.6),
      roughnessMap: recorteDeFolha.rugosidade,
      // 0,45 e nao 0,5: com anisotropia e mipmap, a borda da folha desbota nos
      // niveis distantes e um limiar alto COME a folha inteira ao longe — a copa
      // rareia sozinha conforme a camera se afasta, que e um defeito sutil e
      // dificil de diagnosticar depois.
      alphaTest: 0.45,
      /**
       * EMISSIVO BAIXO = TRANSLUCIDEZ FINGIDA.
       *
       * Folha e fina e deixa luz PASSAR: em contraluz, a que esta entre o sol e
       * o olho acende por tras, e esse verde iluminado por transmissao e a
       * assinatura de folhagem ao fim da tarde. O three nao faz transmissao em
       * material padrao, e ligar transmissao de verdade custaria um passe de
       * cena inteiro — o mesmo que ja cortei duas vezes nesta feature.
       *
       * Um emissivo fraco na cor da folha faz o suficiente: as faces em sombra
       * param de cair para o preto e ficam num verde luminoso. Nao e fisica, e
       * a leitura certa pelo preco de zero passes.
       */
      emissive: new THREE.Color('#4a6b32'),
      emissiveIntensity: 0.22,
      }),
      relogioDoVento,
      0.1,
      piso + 1.75,
      3,
    )
    /**
     * A FOLHA LARGA GANHA MATERIAL PRÓPRIO, com o recorte ovalado e a nervação
     * palmada. Antes ela era a lanceolada esmagada num plano 1,3:1 — o que dava
     * uma pá, não uma folha.
     *
     * Emissivo um pouco mais alto que o da lanceolada de propósito: folha larga
     * de planta tropical é mais FINA e translúcida que folha de oliveira, que é
     * dura e cerosa. Em contraluz ela acende mais.
     */
    const mFolhaLarga = comVento(
      new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.78,
      side: THREE.DoubleSide,
      map: recorteDeFolhaLarga.mapa,
      alphaMap: recorteDeFolhaLarga.alfa,
      normalMap: recorteDeFolhaLarga.normal,
      normalScale: new THREE.Vector2(0.6, 0.6),
      roughnessMap: recorteDeFolhaLarga.rugosidade,
      alphaTest: 0.45,
      emissive: new THREE.Color('#4a6b32'),
      /**
       * 0,10 e nao 0,28, e o motivo e um efeito colateral que so apareceu quando
       * a paleta do arbusto escureceu.
       *
       * O emissivo e SOMADO, independente da cor da instancia. Com a paleta
       * antiga — que herdava os cinza-claros da oliveira — ele era uma fracao
       * pequena do difuso e fazia o que devia: fingir a translucidez da folha em
       * contraluz. Com a paleta verde-escura o difuso caiu para perto de 0,03 em
       * linear e o emissivo, parado em 0,04, passou a ser MAIOR que ele. A folha
       * deixou de ser iluminada e passou a brilhar sozinha: no render virou uma
       * chapa verde-clara uniforme, mais clara do que antes de escurecer a cor.
       *
       * E o mesmo tipo de armadilha da graminea: um numero que estava certo
       * contra um contexto e continuou parado quando o contexto mudou.
       */
      emissiveIntensity: 0.1,
      }),
      relogioDoVento,
      0.085,
      piso + 0.5,
      1.7,
    )
    /**
     * ═══ A MESMA FOLHA, SEM VENTO — e ela existe para a planta de DENTRO ═══
     *
     * O DEFEITO: a planta do escritório dividia `mFolhaLarga` com os arbustos do
     * canteiro, e junto com o recorte da folha ela herdava o balanço. Ou seja, um
     * vaso atrás de um pano de vidro selado, num volume com forro e ar
     * condicionado, tinha as folhas oscilando ao vento do terraço.
     *
     * NÃO É INVISÍVEL: a amplitude chega a uns 5 cm, e a essa distância a planta
     * inteira ocupa ~40 px — o movimento dá uns 4 px. É pouco para alguém
     * apontar e suficiente para a sala não parecer fechada, que é justamente o
     * que o pano de vidro existe para dizer.
     *
     * É a mesma classe de erro de `mGalhoOliva` servindo raminho de copa e haste
     * de arbusto ao mesmo tempo: um material compartilhado por peças que vivem em
     * CONDIÇÕES diferentes. Ali o problema era a altura de engaste; aqui é estar
     * dentro ou fora do edifício.
     *
     * CUSTO ZERO EM CHAMADAS DE DESENHO. A folha da planta interna já tem chave
     * própria no coletor (`escFolhaPlanta`), então ela já era uma `InstancedMesh`
     * separada — o que se separa aqui é só o objeto de material. E o shader sai
     * mais simples, sem a injeção do vértice.
     */
    const mFolhaInterna = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.78,
      side: THREE.DoubleSide,
      map: recorteDeFolhaLarga.mapa,
      alphaMap: recorteDeFolhaLarga.alfa,
      normalMap: recorteDeFolhaLarga.normal,
      normalScale: new THREE.Vector2(0.6, 0.6),
      roughnessMap: recorteDeFolhaLarga.rugosidade,
      alphaTest: 0.45,
      emissive: new THREE.Color('#4a6b32'),
      emissiveIntensity: 0.1,
    })
    // Madeira de oliveira e CLARA e acinzentada, nao marrom escura.
    // Nucleo da copa: solido e fosco, so para dar massa escura atras das folhas.
    // FRONDE: mesmo recorte por alfa da folha, com a silhueta pinada propria.
    const mFronde = comVento(
      new THREE.MeshStandardMaterial({
      // Verde de verdade e nao branco: o mapa ja e claro, e multiplicado por
      // branco a fronde saia lavada — palmeira ao contraluz e ESCURA com a borda
      // acesa, nunca uma pena palida.
      color: '#7d9163',
      roughness: 0.86,
      side: THREE.DoubleSide,
      map: recorteDeFronde.mapa,
      alphaMap: recorteDeFronde.alfa,
      // O ráquis é roliço e os folíolos são lâminas penduradas nele: o relevo
      // existe quase só na haste central, e é ela que passa a pegar o sol de
      // raspão e separar a fronde da que está atrás.
      normalMap: recorteDeFronde.normal,
      normalScale: new THREE.Vector2(0.7, 0.7),
      roughnessMap: recorteDeFronde.rugosidade,
      alphaTest: 0.4,
      emissive: new THREE.Color('#42632c'),
      emissiveIntensity: 0.16,
      }),
      relogioDoVento,
      0.14,
      piso + 2.6,
      2.2,
    )
    // A água PARADA da calha da cascata: quase lisa e com reflexo do ambiente
    // alto, porque a única coisa que a faz ler como água a essa distância é
    // devolver o céu. Escura porque a calha é funda e está na sombra da parede.
    const mAguaParada = new THREE.MeshStandardMaterial({
      color: '#2b6b7a',
      roughness: 0.1,
      metalness: 0.1,
      envMapIntensity: 1.4,
    })
    // Capitel: solido, sem recorte. Verde mais frio que a fronde porque e bainha
    // lisa e cerosa, nao lamina — ela reflete o ceu em vez de acender por tras.
    const mCapitel = new THREE.MeshStandardMaterial({ color: '#6d8152', roughness: 0.72 })
    // FLOR. Quase sem rugosidade e com emissivo proprio: petala e fina e
    // translucida, e numa cena em contraluz ela e a coisa que mais acende.
    const mFlor = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.68,
      flatShading: true,
      emissiveIntensity: 0.3,
      emissive: new THREE.Color('#5a2038'),
    })
    /**
     * O NUCLEO DA COPA PERDE O `flatShading` E GANHA MOSQUEADO.
     *
     * Ele e um `IcosahedronGeometry(0.27, 0)` — vinte faces — escalado para 46 cm
     * de raio. Com `flatShading` cada face vira um plano de valor unico, e o que
     * o zoom mostrou foi um poliedro cinza-esverdeado dentro da copa, com cara de
     * pedra lapidada.
     *
     * Suavizar sozinho nao resolveria: esfera lisa le como bola de bilhar, o
     * mesmo erro com outra cara. O que faltava era superficie na escala da FOLHA,
     * e e isso que `massaDeFolhagem` desenha — folhas sobrepostas em tres verdes,
     * com os vaos escuros entre grupos que uma copa tem.
     *
     * A cor volta a ser branca porque a tinta continua vindo da instancia: o
     * nucleo usa `TONS_DE_OLIVA[0]`, o mais escuro da paleta, que e o que o poe
     * ATRAS das folhas em vez de competir com elas.
     */
    const mFolhaSolida = comVento(
      new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.95,
      map: mosqueadoDaCopa.map,
      normalMap: mosqueadoDaCopa.normalMap,
      roughnessMap: mosqueadoDaCopa.roughnessMap,
      /**
       * O PISO DE LUZ DA MASSA, e e ele que mata as manchas PRETAS que restavam
       * dentro das copas.
       *
       * O que fazia preto nao era a cor do nucleo: era a face dele virada para o
       * lado contrario ao sol. O sol esta em azimute 152; a metade norte de cada
       * tufo recebe so o ambiente, e ambiente baixo vezes `TONS_DE_OLIVA[0]`
       * vezes os vaos escuros da textura chega a zero. Tres fatores escuros
       * multiplicados nao dao penumbra, dao buraco.
       *
       * Copa de verdade nunca tem buraco preto porque o miolo e iluminado por
       * REBOTE — folha clara refletindo em folha clara, e agora tambem pelos
       * espetos que acabaram de entrar no canteiro. O emissivo e somado e
       * independente da cor da instancia, entao ele funciona exatamente como
       * esse piso: a sombra propria para de cair abaixo de um verde escuro em
       * vez de ir ao preto, e o lado iluminado nao muda nada.
       *
       * 0,35 e nao mais: emissivo alto aqui apaga o volume da copa inteira — foi
       * o erro que a folha larga ja cometeu uma vez, quando 0,28 calibrado para
       * paleta clara passou a superar o difuso depois que a paleta escureceu.
       */
      emissive: new THREE.Color('#33452f'),
      emissiveIntensity: 0.35,
      }),
      relogioDoVento,
      0.09,
      piso + 1.75,
      3,
    )
    /**
     * Era o material da caixa de escada. Sobreviveu a ela porque a LAJE do
     * escritório pede exatamente isto: concreto aparente com poro e mancha. Uma
     * laje em balanço é a peça mais bruta do conjunto — ela contrasta com o vidro
     * e com o caixilho pintado, e é desse contraste que a caixa de vidro tira a
     * aparência de construção em vez de maquete.
     */
    const mParedeConcreto = comDetalhe(
      new THREE.MeshStandardMaterial({
        color: '#bcae97',
        roughness: 0.95,
        map: pedra.map,
        normalMap: pedra.normalMap,
        roughnessMap: pedra.roughnessMap,
      }),
      detalhe,
      3.6,
      0.85,
    )
    /**
     * ═══ O CONCRETO DE FORA, QUE NÃO É O DE DENTRO ═══
     *
     * `mParedeConcreto` é concreto aparente NOVO, de peça arquitetônica: claro,
     * quente, feito para contrastar com o vidro do escritório. A platibanda e o
     * núcleo do elevador são outra coisa — são a casca do prédio, a mesma
     * superfície que aparece na faixa escura embaixo do deck, curtida por chuva
     * e fuligem.
     *
     * Se as duas usassem o mesmo material, as laterais virariam uma faixa CLARA
     * correndo as duas bordas do quadro, e borda clara puxa o olho para fora da
     * cena — exatamente ao contrário do que um fechamento lateral existe para
     * fazer. Escuro, ele emoldura sem competir, e o skyline que passa por cima
     * ganha contraste em vez de perder.
     *
     * Mesmos mapas de pedra, mesmo microrrelevo: é a mesma matéria, com outra
     * idade.
     */
    const mPlatibanda = comDetalhe(
      new THREE.MeshStandardMaterial({
        color: '#8c8071',
        roughness: 0.96,
        map: pedra.map,
        normalMap: pedra.normalMap,
        roughnessMap: pedra.roughnessMap,
      }),
      detalhe,
      3.6,
      0.85,
    )
    const mJunta = new THREE.MeshStandardMaterial({ color: '#7d715f', roughness: 0.98 })
    /**
     * CASCA DE VERDADE, E NÃO MAIS O GRÃO DA RÉGUA DE DECK.
     *
     * O comentário que estava aqui defendia o reaproveitamento assim: "grão
     * correndo no comprimento e nós esparsos é exatamente o que casca tem". É
     * falso, e é o tipo de justificativa que se escreve quando já se decidiu
     * economizar. Régua de deck é madeira SERRADA — a serra atravessou os anéis
     * e deixou veio liso, paralelo e contínuo. Casca é o lado de fora da árvore
     * e faz o oposto: RACHA, porque o tronco engrossa por dentro e a camada
     * externa já é tecido morto. Veio contínuo contra fissura interrompida é a
     * diferença entre um poste torneado e uma árvore.
     *
     * Agora são duas cascas, porque as duas árvores não têm nada em comum — a
     * oliveira racha em espiral, e a palmeira não racha: ela guarda as cicatrizes
     * anelares das frondes que caíram. Ver `casca()` em `predio-materiais.ts`.
     *
     * A repetição é apertada em V (o tronco é alto e fino) e quase solta em U (a
     * circunferência é meio metro), que é o que mantém a fissura na escala de um
     * tronco em vez de na de uma tábua.
     */
    const cascaOliva = casca('oliveira')
    const troncoOliva = comRepeticao(cascaOliva, 1.2, 4)
    const galhoOliva = comRepeticao(cascaOliva, 0.55, 1.6)
    const mCascaOliva = new THREE.MeshStandardMaterial({
      color: '#8d8578',
      roughness: 0.97,
      map: troncoOliva.map,
      normalMap: troncoOliva.normalMap,
      roughnessMap: troncoOliva.roughnessMap,
    })
    const mGalhoOliva = comVento(
      new THREE.MeshStandardMaterial({
      color: '#83796c',
      roughness: 0.97,
      map: galhoOliva.map,
      normalMap: galhoOliva.normalMap,
      roughnessMap: galhoOliva.roughnessMap,
      }),
      relogioDoVento,
      0.085,
      piso + 1.75,
      3,
    )
    /**
     * A HASTE DO ARBUSTO GANHA MATERIAL PROPRIO, e o motivo e de ANCORAGEM.
     *
     * `mGalhoOliva` servia duas coisas em alturas e engastes completamente
     * diferentes: o raminho da copa da oliveira (y 2,85 a 4,4, engastado no
     * tronco) e a haste do macico do canteiro (y 0,5 a 2,2, engastada na calha).
     * Um vento so nao serve aos dois — o peso e calculado pela altura acima da
     * BASE, e as bases sao outras.
     *
     * Com amplitude de tres centimetros isso passava despercebido. Ao dobrar a
     * forca a pedido do dono, folha e haste no mesmo ponto do espaco passariam a
     * receber pesos diferentes, e a folha sairia deslizando por cima da haste que
     * deveria a sustentar. Um material a mais e uma chamada de desenho a mais; a
     * alternativa e vegetacao que se desmonta quando o vento aperta.
     *
     * A haste anda um pouco MENOS que a folha (0,07 contra 0,085) de proposito:
     * folha na ponta de um peciolo se mexe mais que o ramo que a segura.
     */
    const mHasteArbusto = comVento(
      new THREE.MeshStandardMaterial({
        color: '#83796c',
        roughness: 0.97,
        map: galhoOliva.map,
        normalMap: galhoOliva.normalMap,
        roughnessMap: galhoOliva.roughnessMap,
      }),
      relogioDoVento,
      0.07,
      piso + 0.5,
      1.7,
    )
    // ESTIPE: repetição 6 em V sobre 4,2 m de altura, com 10 anéis por ladrilho —
    // dá um anel a cada 7 cm, que é o passo real de uma palmeira adulta. Anel
    // espaçado demais lê como bambu; junto demais, como rosca de parafuso.
    const cascaPalmeira = comRepeticao(casca('palmeira'), 1, 6)
    const mEstipe = new THREE.MeshStandardMaterial({
      color: '#978d78',
      roughness: 0.93,
      map: cascaPalmeira.map,
      normalMap: cascaPalmeira.normalMap,
      roughnessMap: cascaPalmeira.roughnessMap,
    })
    // Buxo: verde profundo e FOSCO, sem faceta. Contraponto da gramineea.
    // Agave: verde-azulado com cera — a folha tem brilho, ao contrario das outras.
    // Graminea: branca no material, cor na instancia, e DUPLA FACE porque a
    // lamina e fina o bastante para a camera ver o verso dela o tempo todo.
    // A DOBRA EM V vem do mapa de normal, e é ela que separa gramínea de palha:
    // sem relevo, a lâmina recebe um valor único do topo à base e a touceira lê
    // como feixe de varetas. Ver `graminea()` em `predio-materiais.ts`.
    const laminaViva = graminea()
    const mGramineaMat = comVento(
      new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.82,
      side: THREE.DoubleSide,
      map: laminaViva.map,
      normalMap: laminaViva.normalMap,
      roughnessMap: laminaViva.roughnessMap,
      // O recorte que afina a lamina ate a ponta. `alphaTest` e nao
      // `transparent`: sem ordenacao por profundidade e sem passe extra, e com
      // sombra do formato certo — a mesma escolha da folha e da fronde.
      alphaMap: laminaViva.alfa,
      alphaTest: 0.45,
      }),
      relogioDoVento,
      0.072,
      piso + 0.5,
      1.3,
    )
    // CORTEN: aco que enferruja de proposito e para. Ferrugem tem textura, entao
    // reaproveita o relevo do concreto — poro e mancha servem aos dois.
    const mCorten = comDetalhe(
      new THREE.MeshStandardMaterial({
        color: '#7d4a30',
        roughness: 0.88,
        metalness: 0.22,
        map: pedra.map,
        normalMap: pedra.normalMap,
        roughnessMap: pedra.roughnessMap,
      }),
      detalhe,
      3.2,
      0.75,
    )
    const mPedra = comDetalhe(
      new THREE.MeshStandardMaterial({
        color: '#cfc4ad',
        roughness: 0.8,
        map: pedra.map,
        normalMap: pedra.normalMap,
        roughnessMap: pedra.roughnessMap,
      }),
      detalhe,
      4.0,
      0.6,
    )
    /**
     * ═══ A PEDRA DA BORDA DA PISCINA, MAIS CLARA — E O PORQUÊ GENERALIZA ═══
     *
     * A borda vivia no JSX com `color="#cfc4ad"` e NENHUM mapa. Ao mudá-la para
     * o coletor eu lhe dei `mPedra`, que tem exatamente a mesma cor base — e ela
     * SUMIU do quadro, encostando no tom do deck.
     *
     * Não era posição nem escala: pintada de magenta, a moldura apareceu inteira
     * e perfeita. Era cor. E a causa é uma propriedade do modelo que é fácil
     * esquecer:
     *
     *   MAPA DE COR MULTIPLICA. Ele não substitui a cor base, ele a modula.
     *
     * A textura de `concreto()` tem fundo `#c7b9a2`, que em linear vale cerca de
     * (0,57 0,48 0,36). Multiplicando a base `#cfc4ad` — linear (0,62 0,55 0,42)
     * — o resultado cai para (0,36 0,27 0,15): pouco mais da METADE do brilho, e
     * puxado para o marrom. O material "igual" ao antigo era, na verdade, quase
     * duas vezes mais escuro.
     *
     * ═══ E A CORREÇÃO NÃO É CLAREAR A BASE. É TIRAR O MAPA DE COR ═══
     *
     * Primeiro eu tentei compensar: dividir a base pela média do mapa e usar
     * `#ddd1b8`. Errou para baixo — a borda continuou encostando no deck. O mapa
     * de `concreto()` não é só o fundo `#c7b9a2`: ele leva manchas escuras por
     * cima, e a média real é bem menor que a do fundo. Calibrar contra uma média
     * que eu não meço é adivinhar com mais casas decimais.
     *
     * Então a variável sai. A borda fica com `normalMap` e `roughnessMap` e SEM
     * `map`:
     *
     *   · o relevo e a variação de brilho — que era o que faltava — continuam;
     *   · o ALBEDO volta a ser exatamente `#cfc4ad`, o valor em que a peça foi
     *     ajustada quando alguém olhou para a tela e decidiu que a moldura tinha
     *     de ler mais clara que o deck.
     *
     * Textura não é obrigada a vir em três mapas. Aqui o que a pedra precisava
     * era de PORO e de variação de especular, não de variação de cor: pedra
     * polida de borda de piscina é, de fato, quase uniforme em tom.
     *
     * MATERIAL PRÓPRIO E NÃO `mPedra` RETOCADA: a mesma pedra serve o tampo do
     * bar, as prateleiras, a soleira da cascata e o degrau submerso, e todas
     * estão ajustadas contra o valor atual. Mexer em `mPedra` consertaria a borda
     * e desajustaria quatro peças — e não custa nada, porque a borda já tem
     * chave própria no coletor e portanto já é uma malha separada.
     */
    /**
     * ═══ O ESTOFADO DA ÁREA DE PISCINA ═══
     *
     * Creme e não escuro, e a decisão é de composição antes de ser de gosto. O
     * primeiro plano do quadro é deck escuro sobre deck escuro; qualquer móvel
     * em tom próximo desapareceria ali, que foi exatamente o que aconteceu com
     * as mesas quando o tampo era madeira. Colchonete claro é o que separa o
     * objeto do piso — e é também o que a peça é na vida real: lona clara, que
     * esquenta menos ao sol.
     *
     * Com microrrelevo em escala alta: 9 ladrilhos por metro dá a trama da lona.
     * Sem ele o colchonete vira plástico, que é o mesmo defeito que os metais
     * tinham antes de ganharem mapa.
     */
    const mAlmofada = comDetalhe(
      new THREE.MeshStandardMaterial({ color: '#cfc3ac', roughness: 0.95 }),
      detalhe,
      9,
      0.5,
    )
    // A toalha é mais clara e mais lisa que a lona: algodão novo contra tecido
    // de exterior. É a peça mais clara do terraço inteiro, e é de propósito —
    // toalha dobrada numa espreguiçadeira é o sinal mais barato de OCUPAÇÃO que
    // existe, e ocupação é o que separa render de fotografia.
    const mToalha = comDetalhe(
      new THREE.MeshStandardMaterial({ color: '#e4dccd', roughness: 0.98 }),
      detalhe,
      14,
      0.6,
    )
    const mPedraBorda = comDetalhe(
      new THREE.MeshStandardMaterial({
        color: '#cfc4ad',
        roughness: 0.82,
        normalMap: pedra.normalMap,
        roughnessMap: pedra.roughnessMap,
      }),
      detalhe,
      4.0,
      0.6,
    )
    const mVidroGarrafa = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.16,
      metalness: 0.1,
      transparent: true,
      opacity: 0.82,
    })
    /**
     * ═══ GARRAFA CHEIA NÃO É VIDRO VAZIO ═══
     *
     * As garrafas usavam `mVidroGarrafa`, o mesmo material dos copos, a 0,82 de
     * opacidade. Num copo isso está certo: copo é vidro fino e vazio, e tem de
     * deixar passar. Numa garrafa está errado por duas razões.
     *
     * A física: garrafa de bar tem LÍQUIDO dentro, e é o líquido que dá a cor.
     * Uísque, vinho, licor — a coluna que se vê é um corpo colorido de vários
     * centímetros de espessura, não uma casca transparente.
     *
     * E a consequência na tela, que é o que o dono viu: com a fita de LED logo
     * atrás de cada prateleira, 18 % de transparência bastam para a luz lavar a
     * cor por dentro. A garrafa perde o próprio tom, todas convergem para o
     * âmbar da fita, e oitenta objetos viram uma mancha só. As cores já eram
     * nove e bem separadas — verde, borgonha, azul, oliva, ameixa; elas não
     * estavam aparecendo.
     *
     * 0,93 mantém o brilho de vidro na borda e devolve o corpo. E a rugosidade
     * sobe de 0,16 para 0,3 pelo mesmo motivo físico: líquido espalha, vidro
     * vazio espelha.
     */
    const mGarrafa = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.3,
      metalness: 0.1,
      transparent: true,
      opacity: 0.93,
    })
    // Toalha: listrada nao da para desenhar sem outra textura, mas a COR fria
    // no meio de um deck ambar ja faz o trabalho — e pano de praia raramente e
    // da cor da mobilia.
    /**
     * ═══ A LUZ PRATICA ═══
     *
     * E o que separa esta cena da referencia, e nao e detalhe: e TOM.
     *
     * A cobertura estava toda no mesmo valor — parede, deck, parapeito, vaso e
     * pergolado todos no mesmo bege-marrom, todos iluminados pela mesma luz
     * difusa. Superficie sem diferenca de valor nao tem profundidade, e nenhuma
     * quantidade de geometria conserta isso: o olho separa planos por CONTRASTE
     * antes de separar por forma.
     *
     * Luz pratica resolve porque ela cria valor LOCAL. Um balizador acende meio
     * metro de deck e deixa o resto na penumbra; uma fita sob o balcao desenha a
     * linha do movel; um facho na parede faz um leque claro num plano que era
     * chapado. Cada ponto desses e uma ancora de brilho, e e entre as ancoras que
     * a escuridao vira profundidade em vez de falta de informacao.
     *
     * Fora da curva de tom em tudo que acende: a exposicao ACES existe
     * para domar o alto da cena, e fonte de luz e justamente o que nao deve ser
     * domado — senao o balizador vira um cinza claro e perde a razao de existir.
     */
    // Ganho 3,0: é a lente do espeto e o disco do balizador, vistos de frente.
    // São as fontes mais próximas da câmera e as que mais precisam estourar.
    const mBalizador = new THREE.MeshBasicMaterial({ color: fonte('#ffd9a0', 3.0) })
    /**
     * O FACHO QUE SOBE PARA A COPA, e ele nao e o mesmo da parede.
     *
     * Duas diferencas, e as duas sao de fisica. A primeira e OPACIDADE: o facho
     * de parede bate num plano solido a um metro e devolve quase tudo; este
     * atravessa folhagem, que espalha e absorve.
     *
     * 0,10 E NAO 0,34, e o numero veio do render. Com 0,34 os planos pararam de
     * ler como luz e passaram a ler como CHAPA: laminas verde-palidas de borda
     * definida subindo do canteiro, com cara de acrilico. Facho no AR nao e o
     * mesmo caso do facho na parede — la o plano representa luz POUSADA numa
     * superficie, e pode ser forte; aqui ele representa luz ATRAVESSANDO ar, e ar
     * quase nao espalha. O que se ve de um feixe de jardim de verdade e um veu,
     * nao um painel.
     *
     * A segunda e COR. Luz de jardim e mais fria que luz de sala — nao por gosto,
     * mas porque folha iluminada por luz quente fica marrom. Um branco levemente
     * esverdeado mantem o verde da copa vivo, e e o que toda instalacao de
     * paisagismo usa.
     */
    const mFachoDeCopa = new THREE.MeshBasicMaterial({
      color: '#bfe0c0',
      transparent: true,
      // 0,16 e não 0,10: o desenho novo já concentra o brilho no pé do feixe e
      // o apaga na subida, então a mesma presença cabe numa área muito menor. A
      // opacidade baixa de antes compensava uma forma errada — corrigida a
      // forma, ela passou a apagar um feixe que já estava certo.
      opacity: 0.16,
      alphaMap: fachoDeEspeto(),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
    /**
     * A POCA DO BALIZADOR e outro material, e a diferenca com o facho de copa e
     * a mesma que existe entre ar e chao.
     *
     * O facho de copa e luz ATRAVESSANDO ar: ve-se um veu, e ele e frio porque
     * folha sob luz quente fica marrom. A poca e luz POUSADA na madeira do
     * canteiro — superficie solida devolvendo quase tudo, como o facho da parede
     * do fundo. Pode ser mais forte, e tem de ser QUENTE: a lampada e a mesma
     * `#ffd9a0` do balizador, e uma poca fria sobre madeira escura nao le como
     * luz, le como poeira. Foi exatamente isso que apareceu no primeiro render,
     * quando as duas familias dividiam um material so.
     */
    const mPocaDeBalizador = new THREE.MeshBasicMaterial({
      color: '#ffcf96',
      transparent: true,
      opacity: 0.3,
      alphaMap: manchaDeSombra(),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
    // O FACHO e um plano com degrade de alfa, nao um cone de volume: volumetrico
    // de verdade custa um passe, e a essa distancia o leque de luz na parede le
    // igual por um quad com mapa de alfa.
    /**
     * O DERRAME DO ESCRITÓRIO NO DECK — e ele deixou de ser uma elipse.
     *
     * Este material nasceu para os sete fachos que lavavam a parede do fundo. A
     * cascata os substituiu e sobrou UM uso: a mancha que a caixa de vidro joga
     * na madeira. Só que ele continuou com a textura de facho de parede — um
     * degradê radial — esticada para 5,75 × 5,1 m, e o dono apontou: "essa luz
     * de reflexo dessa forma aí não faz sentido".
     *
     * Não faz. Elipse é o rastro de uma fonte PONTUAL; uma parede de vidro de
     * 5,8 m produz um trapézio listrado pelos montantes, mais forte colado no
     * pé do vidro. `derrameDeVidro` desenha isso. Ver o comentário de lá.
     *
     * A opacidade caiu de 0,75 para 0,5 junto: a textura antiga tinha o máximo
     * no centro da elipse, a três metros da fachada, e precisava de força para
     * chegar ao vidro. A nova já nasce no máximo exatamente onde a luz sai.
     *
     * FAIXAS = 4 porque o caixilho tem montante a cada 1,45 m em 5,8 m de pano.
     * Número repetido é número que diverge: sai da mesma conta que desenha o
     * caixilho, e não de um literal escolhido a olho.
     */
    const mFacho = new THREE.MeshBasicMaterial({
      color: '#ffc98a',
      transparent: true,
      opacity: 0.5,
      alphaMap: derrameDeVidro(Math.round(ESCRITORIO.largura / 1.45)),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
    /**
     * A FITA DO BAR FICOU EM 1,35, e o número veio do render — ela foi a única
     * peça que o headroom estragou.
     *
     * Com 2,4 ela virou a coisa mais clara do quadro: uma barra branca de quatro
     * metros e meio dominando o terço direito. E o erro é de ÁREA, não de
     * intensidade. As outras fontes são pontuais — lente de espeto, disco de
     * balizador, bulbo de pendente — e brilho pontual estoura sem pesar. Uma
     * fita corrida tem centenas de vezes mais pixels, então o mesmo valor por
     * pixel vira uma massa de luz. O olho soma área.
     *
     * A regra que sai disso, e ela vale para a próxima fonte que entrar na cena:
     * o ganho tem de cair com o tamanho aparente da peça. Fonte grande brilha
     * MENOS por pixel para brilhar IGUAL no quadro.
     */
    const mFitaLed = new THREE.MeshBasicMaterial({ color: fonte('#ffdca8', 1.35) })
    // A fita da cascata é FRIA, e a do bar é quente. São as duas únicas linhas
    // acesas do terraço, e se tivessem a mesma cor o olho leria as duas como a
    // mesma instalação. Luz de água puxa o turquesa; luz de balcão, o âmbar.
    // A fita da água fica DENTRO da calha, submersa e atrás do véu: parte do que
    // ela emite é absorvida antes de chegar ao olho, então ela pede ganho maior
    // para render o mesmo brilho aparente que a do bar, que está exposta.
    const mFitaAgua = new THREE.MeshBasicMaterial({ color: fonte('#7fe3f2', 2.8) })
    /**
     * OS MATERIAIS DO ESCRITÓRIO, e o que decide todos eles é uma restrição:
     * o sol está ATRÁS do prédio (azimute 152°), então nenhuma luz direta entra
     * ali. O interior seria preto se dependesse da cena.
     *
     * Quem acende é `mEscLuz` — emissivo, não uma luz. O three não emite luz de
     * material emissivo, e é bom que não emita: uma parede inteira virando fonte
     * custaria caro e daria uma lavagem chapada. O que o emissivo faz é APARECER
     * aceso, e é disso que a leitura precisa. A iluminação de verdade das peças
     * vem de uma `pointLight` só, no bloco JSX, que é o que dá volume ao móvel e
     * derrama na madeira do deck lá fora.
     *
     * `toneMapped: false` nas peças que ACENDEM (tela, luminária, fita): elas
     * têm de furar o ACES e chegar ao branco. Passadas pelo tone mapping, o
     * ponto mais quente da cena vira o mesmo bege de tudo.
     */
    const mEscParede = new THREE.MeshStandardMaterial({ color: '#cbbda6', roughness: 0.94 })
    // O nicho do bar é ÂMBAR BAIXO, e não a luz de trabalho do escritório. São
    // dois lugares acesos no mesmo quadro, e se tivessem a mesma temperatura eles
    // leriam como a mesma coisa repetida — a diferença de cor é o que diz que um
    // é uma sala e o outro é um balcão.
    // O rótulo é PAPEL: opaco e fosco, e é justamente por ser opaco que ele corta
    // a mancha de vidro aceso. Cru e não branco — rótulo branco puro num nicho
    // âmbar vira um ponto azulado que nada mais na cena tem.
    const mRotulo = new THREE.MeshStandardMaterial({ color: '#d8cbb0', roughness: 0.92 })
    const mBarNicho = new THREE.MeshStandardMaterial({
      color: '#a8712f',
      roughness: 1,
      emissive: new THREE.Color('#ff9a3c'),
      // 1,05 e não 1,5: pela mesma regra de área da fita, algumas linhas acima.
      // O nicho tem quase cinco metros por dois e meio — é a maior superfície
      // emissora da cena inteira. Com 1,5 ele cruzava o limiar do brilho em toda
      // a sua área e a prateleira de garrafas virava um bloco de luz sem
      // garrafa dentro, apagando as trinta silhuetas que ela existe para
      // mostrar. Logo abaixo do limiar, ele ACENDE sem FLORESCER — que é o que
      // uma fita atrás de vidro colorido faz.
      emissiveIntensity: 1.05,
      // O mesmo desenho pinta e modula a emissão: a faixa clara é também a que
      // mais acende, que é o que uma fita sob prateleira faz.
      map: brilhoDoNicho,
      emissiveMap: brilhoDoNicho,
    })
    const mEscLuz = new THREE.MeshStandardMaterial({
      color: '#e8c79a',
      roughness: 1,
      // O degradê de cornija: claro no forro, escurecendo até o rodapé. Pinta e
      // modula a emissão ao mesmo tempo, então o alto da parede é também a parte
      // que mais acende — que é onde estão as luminárias.
      map: lavagemDaParede,
      emissiveMap: lavagemDaParede,
      emissive: new THREE.Color('#ffb968'),
      // 1,1 e não 3: este painel tem 5 m² e fica atrás de tudo. Alto demais ele
      // estoura e o mobiliário na frente vira silhueta preta recortada — que é o
      // erro clássico de quem ilumina interior por trás.
      emissiveIntensity: 1.1,
    })
    const mEscPiso = new THREE.MeshStandardMaterial({
      color: '#8a6a45',
      // 0,45 e nao 0,6: piso interno e ENVERNIZADO, e o pouco de reflexo que ele
      // devolve da parede acesa e metade do que faz um interior parecer interior.
      // Deck cru nao brilha; taco de escritorio brilha.
      roughness: 0.45,
      map: tabuaDoEscritorio.map,
      normalMap: tabuaDoEscritorio.normalMap,
      roughnessMap: tabuaDoEscritorio.roughnessMap,
    })
    const mEscTapete = new THREE.MeshStandardMaterial({ color: '#6d6152', roughness: 0.98 })
    const mCaixilho = new THREE.MeshStandardMaterial({
      color: '#2a2724',
      roughness: 0.42,
      metalness: 0.55,
    })
    const mEstofado = new THREE.MeshStandardMaterial({ color: '#3b3a38', roughness: 0.9 })
    // TELA e LUMINÁRIA pedem ganhos bem diferentes, e a diferença é o assunto.
    // Monitor é uma superfície acesa de poucas centenas de nits — ele vence a
    // sala e perde do céu, e por isso mal deve florescer. Pendente é uma FONTE:
    // ordens de grandeza acima, e é dele que se espera o halo. Dar o mesmo ganho
    // aos dois faria o monitor brilhar como uma lâmpada, que é o tipo de erro
    // que ninguém sabe nomear mas todo mundo sente.
    const mTela = new THREE.MeshBasicMaterial({ color: fonte('#cfe0ee', 1.25) })
    const mLuminaria = new THREE.MeshBasicMaterial({ color: fonte('#ffd9a4', 3.4) })
    // O display do elevador é FRIO, e é a única coisa fria acesa no terraço
    // fora da fita da cascata. Sinalização predial é sempre branca ou verde —
    // âmbar ali leria como mais uma luminária decorativa, e o que ela tem de
    // dizer é "isto é equipamento", não "isto é ambiente".
    const mIndicador = new THREE.MeshBasicMaterial({ color: fonte('#d6e6f2', 1.9) })
    /**
     * ═══ A LAVAGEM DA ARANDELA, E POR QUE ELA NÃO É UMA MANCHA REDONDA ═══
     *
     * A tentação é reusar `manchaDeSombra()` — um borrão macio, já pronto, já
     * usado na poça do balizador. Seria a terceira vez nesta feature que uma
     * fonte direcional ganha forma de elipse: o derrame do deck e os fachos dos
     * espetos nasceram assim e os dois tiveram de ser refeitos, porque luz que
     * SAI DE UM PONTO E BATE NUMA SUPERFÍCIE não desenha uma mancha centrada —
     * desenha um cone, estreito na boca e aberto na chegada.
     *
     * Então ela reusa `fachoDeEspeto()`, que é exatamente esse cone, virado de
     * cabeça para baixo no lugar de uso: o espeto joga luz para CIMA na copa,
     * a arandela joga para BAIXO na parede. Mesma física, mesmo desenho, sentido
     * oposto — e o giro de meia volta no eixo Z é tudo o que separa os dois.
     *
     * Quente e fraca: 0,22 contra os 0,30 da poça do balizador. A poça pousa em
     * madeira escura e pode insistir; esta cai sobre concreto claro, que devolve
     * muito mais, e no mesmo valor estouraria em branco.
     */
    const mLavagemNucleo = new THREE.MeshBasicMaterial({
      color: '#ffd2a0',
      transparent: true,
      opacity: 0.22,
      alphaMap: fachoDeEspeto(),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
    // A lombada do livro é o único lugar da cena onde cor saturada em quantidade
    // é bem-vinda: estante monocromática lê como cenografia de loja.
    const TONS_DE_LIVRO = [
      '#8a3b2e', '#2f4a63', '#6b6a3a', '#7d4f2a', '#3f5a48',
      '#a8794a', '#4a3b5c', '#93392f', '#5c6b7a', '#7a6340',
    ].map((c) => new THREE.Color(c))
    const mSombra = new THREE.MeshBasicMaterial({
      color: '#4a3524',
      transparent: true,
      opacity: 0.36,
      alphaMap: manchaDeSombra(),
      depthWrite: false,
    })

    const TONS_DE_DECK = ['#b0804f', '#a2753f', '#b98a5b', '#9a6d3c', '#ab7c4a', '#c0915f'].map(
      (c) => new THREE.Color(c),
    )
    // Folhagem com cinco verdes. Copa de UM verde só é o segundo tell mais forte
    // de árvore renderizada — folha real varia com idade, sol e sombra própria.
    // OLIVEIRA: cinza-esverdeado PRATEADO, nao verde folha. E a cor que a
    // identifica a distancia — a face de baixo da folha e quase branca, e e ela
    // que o vento vira para cima. Verde-escuro aqui seria outra arvore.
    // Trepadeira: verde ESCURO e saturado. A oliveira e prateada; se as duas
    // tivessem o mesmo verde, o pergolado e a copa virariam uma mancha so.
    /**
     * A FAIXA CLARA E SALVIA ILUMINADA, NAO NEVE. A primeira paleta bimodal poe
     * duas entradas quase brancas e a copa saiu parecendo florada — o contraste
     * estava certo, o VALOR nao. Folha de oliveira em contraluz chega a um verde
     * palido acinzentado, nunca ao branco: o que e branco numa foto de arvore e
     * o ceu aparecendo pelos vaos, e disso a copa aberta ja cuida sozinha.
     *
     * Quatro escuras contra duas claras, e nao tres a tres — a copa tem de ter
     * PESO, e peso vem do lado escuro.
     */
    /**
     * A DIFERENCA DE TOM ENTRE AS DUAS COPAS E DO SOL, E FICA.
     *
     * Eu tinha subido esta paleta um terco para igualar as duas, e o dono olhou
     * e disse para deixar como estava. Esta certo, e vale registrar por que:
     * as duas arvores sempre usaram a MESMA paleta. O sol esta em azimute 152,
     * atras e a direita — a copa de x = 3,48 recebe o rasante e a de x = -2,11
     * fica na sombra propria da cena.
     *
     * Duas arvores identicas recebendo luz diferente e o que acontece num
     * terraco de verdade. Igualar as duas seria apagar a unica informacao de
     * direcao de luz que a vegetacao carrega.
     */
    const TONS_DE_OLIVA = ['#5f7361', '#6e8168', '#aab89b', '#7d8e74', '#c0cbae', '#8d9c85'].map(
      (c) => new THREE.Color(c),
    )

    /**
     * AS FLORES SAO A UNICA COR NAO-VERDE DO JARDIM, e por isso elas pesam muito
     * mais do que o numero delas sugere.
     *
     * Um jardim so de verde le como massa, por mais especies que tenha — o olho
     * agrupa tudo no mesmo balde. Basta um punhado de magenta e branco para cada
     * moita virar uma moita DISTINTA, porque a cor e o que separa. E magenta e
     * branco nao sao escolha arbitraria: sao as duas cores de florada que mais
     * aparecem em cobertura (buganvile e jasmim), justamente por aguentarem sol
     * direto e vento.
     */
    const TONS_DE_FLOR = ['#c4477e', '#d9639b', '#f2e6ea', '#a8386a', '#ffffff', '#e08ab4'].map(
      (c) => new THREE.Color(c),
    )
    /**
     * A GRAMINEA DEIXA DE SER METADE FENO, e este e um caso de argumento que
     * ERA verdadeiro e parou de ser.
     *
     * A paleta tinha tres tons de palha em seis (#c2ab72, #d4c088, #b9a86a), e o
     * comentario que estava aqui defendia isso: graminea em contraluz acende, a
     * lamina seca da ponta pega o sol de fim de tarde. Estava certo — enquanto o
     * FUNDO dela fosse a parede de concreto clara lavada pelos sete fachos.
     *
     * O fundo mudou. Hoje atras da graminea corre a cascata, que e azul escura.
     * Palha contra escuro nao acende: ela le como feno morto, e foi isso que o
     * zoom mostrou — um canteiro de varetas secas.
     *
     * Agora sao cinco verdes de valores diferentes e UM caqui. Touceira real tem
     * laminas secas no meio das vivas; o que ela nao tem e metade do volume
     * morto. A ponta dourada continua existindo, e agora vem de onde deveria ter
     * vindo desde o comeco: do degrade da propria textura, que vai de verde na
     * base a palha clara na ponta. Cor de instancia pinta a lamina INTEIRA — ela
     * nunca foi o lugar de representar so a ponta.
     */
    /**
     * O ARBUSTO GANHA PALETA PROPRIA, e ele estava usando a errada.
     *
     * As folhas do macico saiam de `TONS_DE_OLIVA`, que tem dois cinza-claros
     * (#aab89b e #c0cbae). Aqueles tons existem por um motivo especifico e bom: a
     * face de baixo da folha de oliveira e quase branca, e e ela que o vento vira
     * para cima — e o prateado que identifica a especie a distancia.
     *
     * Folha larga tropical nao tem nada disso. Ela e VERDE ESCURA e cerosa, e
     * herdar o prateado da oliveira deixava o macico do fundo palido justamente
     * onde ele deveria ser a massa mais escura do jardim — e a massa contra a
     * qual tudo o mais recorta.
     */
    const TONS_DE_ARBUSTO = ['#40603a', '#4d7342', '#375434', '#588447', '#456a3a', '#628e4f'].map(
      (c) => new THREE.Color(c),
    )
    const TONS_DE_GRAMINEA = ['#6d7c46', '#7f8b52', '#8c9558', '#5e6d3e', '#93a05c', '#a2945c'].map(
      (c) => new THREE.Color(c),
    )
    // NOVE TONS, e nao cinco. Com cinco, as doze garrafas de uma prateleira
    // repetiam a sequencia duas vezes e meia — e repeticao de cor em fila e o que
    // faz uma estante de bar ler como padrao de papel de parede. Entram o ambar
    // de uisque, o transparente de gin e o rubi de licor, que sao os tres que
    // faltavam para a parede parecer um estoque em vez de uma paleta.
    const TONS_DE_GARRAFA = [
      '#3f5f3a', '#6b4326', '#2f4a5e', '#7a6a3a', '#53304a',
      '#a8702a', '#cfd6cc', '#7d2733', '#46603f',
    ].map(
      (c) => new THREE.Color(c),
    )


    const sombra = (x: number, z: number, larg: number, profund: number) =>
      col.poe(
        'sombra',
        gSombra,
        mSombra,
        [x, piso + 0.024, z],
        [-Math.PI / 2, 0, 0],
        [larg, profund, 1],
      )

    // ── profundidades ─────────────────────────────────────────────────────
    /**
     * AS ESPREGUIÇADEIRAS ESTAVAM DENTRO DA PISCINA — literalmente, e ninguém viu
     * enquanto a fila era larga.
     *
     * Com `prof × 0,1` elas ficavam em z = −3,60 e, tendo 1,98 m de comprimento,
     * ocupavam de −4,59 a −2,61. A borda da piscina começa em −3,20. Ou seja: o
     * terço de trás de cada peça ficava submerso. Enquanto a fila ia de −8,4 a
     * 8,4, só as duas do meio caíam sobre a lâmina e o defeito passava por
     * sobreposição de perspectiva; quando a fila encolheu para o vão da piscina,
     * as QUATRO passaram a pisar na água e a lâmina sumiu atrás delas.
     *
     * `prof × 0,235` põe o eixo em −1,84, e o pior caso do sorteio de z (−0,275)
     * deixa a borda de trás em −3,11: nove centímetros à frente da pedra. Elas
     * passam a ocupar a faixa de deck ENTRE a piscina e o guarda-corpo, que é o
     * lugar onde espreguiçadeira fica numa cobertura de verdade — e a lâmina
     * volta a aparecer inteira por cima delas, que é o que o dono pediu.
     */
    const zBar = zCentro - prof * 0.208
    const zArvores = zCentro - prof * 0.277
    const zCanteiro = zCentro - prof * 0.4
    const zGuarda = zCentro + prof * 0.4
    const piscina = piscinaZ(zCentro, prof)
    /**
     * ═══ O PERGOLADO, REALINHADO ÀS DUAS CONSTRUÇÕES ═══
     *
     * O dono disse que a estrutura de madeira não estava harmônica, e ela não
     * estava por TRÊS razões que se somavam — todas de coordenada, nenhuma de
     * desenho.
     *
     * 1. ELE ATRAVESSAVA O ESCRITÓRIO. As vigas iam de x −9,30 a 2,90 e havia um
     *    poste em −8,40. O escritório ocupa de −10,70 a −4,90: o poste caía na
     *    frente da estante e as vigas nasciam dentro do volume envidraçado.
     *
     * 2. OS POSTES DA FRENTE ESTAVAM DENTRO DA PISCINA. `zCentro − prof × 0,02` =
     *    −5,16, e a lâmina vai de −6,98 a −1,33. Quatro postes de madeira em pé
     *    dentro d'água. O defeito nasceu quando a piscina cresceu 2,28 m para a
     *    frente e ninguém reconferiu quem já morava naquele intervalo — é o
     *    terceiro objeto desta feature a ser atropelado pela mesma mudança,
     *    depois da escada e das espreguiçadeiras.
     *
     * 3. TRÊS LINHAS HORIZONTAIS EM ALTURAS DIFERENTES. O escritório e o bar
     *    fecham em 2,92 (face de baixo da laje) e o pergolado fechava em 2,975.
     *    Cinco centímetros e meio de desalinho entre três elementos que ocupam a
     *    largura inteira do quadro: perto demais para ler como intenção, longe
     *    demais para ler como uma linha só. Era essa a desarmonia.
     *
     * A CORREÇÃO É UMA SÓ IDEIA: o pergolado deixa de ser um objeto solto no meio
     * do terraço e passa a ser o TRECHO LEVE de uma cobertura contínua. Ele vence
     * exatamente o vão entre as duas lajes, apoia nelas, e a face de baixo dos
     * três coincide. O que se lê de ponta a ponta é uma linha de beiral só —
     * pesada nas pontas, vazada no meio.
     *
     * E ele recua para a faixa de deck entre a piscina e a jardineira, que é o
     * lugar por onde se ANDA. Pergolado cobre circulação; pergolado sobre a água
     * era o que punha os postes dentro dela.
     */
    const SOFFIT = piso + ESCRITORIO.altura
    const X_PERGOLA_DE = ESCRITORIO.x + ESCRITORIO.largura / 2
    // A face interna do bar, DERIVADA e não mais cravada em 6,27: o pergolado
    // encosta exatamente onde a laje do bar começa. Um literal aqui se
    // descolaria em silêncio no dia em que o bar mudasse de largura — que é a
    // mesma armadilha de constante emprestada já documentada em outros quatro
    // pontos desta cena.
    const X_PERGOLA_ATE = BAR.x - BAR.largura / 2 - BAR.beiral
    /**
     * ═══ O JARDIM RECEBE A MESMA ORDEM QUE O TELHADO ═══
     *
     * O dono disse que as árvores e o jardim também estavam sem harmonia, e o
     * diagnóstico é o mesmo da estrutura de madeira levado um passo adiante: a
     * cobertura ganhou uma ordem — volume, vão, volume — e o plantio continuou
     * distribuído como estava antes dela existir.
     *
     * Duas coisas erradas, e as duas de LUGAR:
     *
     * 1. O CANTEIRO VAZAVA PARA ALÉM DAS CONSTRUÇÕES. Ele corria de −15 a 15 com
     *    dois recortes (a baia do escritório e a faixa atrás do bar), e o que
     *    sobrava nas pontas eram dois retalhos de jardim que não pertenciam a
     *    nada: 3,8 m de gramínea à esquerda do escritório e outro tanto além do
     *    bar. Fragmento órfão é exatamente o que o olho lê como desordem.
     *
     * 2. AS ÁRVORES ESTAVAM EM COORDENADAS HERDADAS. Palmeiras em −11,8 / −0,4 /
     *    5,6 / 11,2 e oliveiras em −12,9 / 3,6 — números que foram bons quando o
     *    terraço era uma faixa contínua, e que agora não têm relação nenhuma com
     *    o escritório, com o bar nem com o pórtico do pergolado.
     *
     * A REGRA NOVA É CURTA: o jardim é exatamente o VÃO entre as duas
     * construções, e toda árvore senta num EIXO ESTRUTURAL. O pergolado apoia em
     * três pontos — a laje do escritório, o poste do meio e a laje do bar —, e é
     * nesses três que ficam as palmeiras. As oliveiras ficam no meio de cada
     * metade, espelhadas em relação ao poste.
     *
     * O resultado é que nenhuma posição de planta é mais um número escolhido: é a
     * mesma conta que já posiciona a estrutura.
     */
    const X_POSTE_PERGOLA = (X_PERGOLA_DE + X_PERGOLA_ATE) / 2
    /**
     * DUAS PALMEIRAS, E NÃO TRÊS — e o motivo aparece só no render.
     *
     * A primeira versão punha uma palmeira em cada um dos três apoios, incluindo
     * o poste do meio. A regra era boa e o resultado, não: cinco copas (três
     * palmeiras mais duas oliveiras) espaçadas de 2,3 m fecharam a faixa de céu
     * no topo do quadro num tapete verde contínuo, e a palmeira central subia
     * exatamente em cima do poste — duas verticais empilhadas no eixo de simetria,
     * que é o pior lugar possível para uma sobreposição acidental.
     *
     * Com as palmeiras só nas duas pontas, o centro do vão fica sendo o POSTE,
     * sozinho. A sequência vira palmeira / oliveira / poste / oliveira / palmeira,
     * com vãos de 2,29 — 2,80 — 2,80 — 2,29: simétrica, e com céu entre as copas.
     *
     * A lição é a de sempre nesta feature: a regra estava certa e o número de
     * elementos que ela produzia, errado. Ordem não é repetir até preencher.
     */
    const EIXOS_DA_ESTRUTURA = [X_PERGOLA_DE + 0.5, X_PERGOLA_ATE - 0.5]
    const EIXOS_DOS_VaOS = [
      (X_PERGOLA_DE + X_POSTE_PERGOLA) / 2,
      (X_POSTE_PERGOLA + X_PERGOLA_ATE) / 2,
    ]
    /** Fora do vão entre as duas construções não há jardim: há edifício. */
    const foraDoJardim = (x: number) => x < X_PERGOLA_DE - 0.1 || x > X_PERGOLA_ATE + 0.1
    const zPergolaFrente = piscina.fundo - 0.35
    const zPergolaFundo = zCanteiro + 1.05
    // Face interna da parede do andar: é nela que a cascata corre, e é ela que
    // fecha o escritório por trás. Um número só para as duas coisas.
    const zParedeFundo = zDaParedeDoAndar(zCentro, prof)
    /**
     * A ESCADA FOI PARAR NO MEIO DA ÁGUA, e fui eu que a levei para lá.
     *
     * Ela estava em `zEspelhoLocal + 0,5`, e `zEspelhoLocal` era um número fixo
     * (`zCentro − prof × 0,03`) que por acaso caía perto da borda. Quando a
     * piscina passou a ser derivada de `piscinaZ()` e cresceu 2,28 m para a
     * frente, o CENTRO dela andou junto — e a escada, amarrada ao centro, foi
     * junto para o miolo do tanque. Dois corrimãos em U brotando do meio da
     * lâmina, sem borda por perto.
     *
     * Escada de piscina não tem relação nenhuma com o centro: ela é um objeto de
     * BORDA. Amarrada a `piscina.frente`, ela fica onde estiver a borda, hoje e
     * quando a piscina mudar de novo.
     */
    /**
     * E O Z TAMBÉM MUDA, pela mesma correção: o arco agora ATRAVESSA a borda em
     * vez de ficar todo dentro d'água, então o eixo dele é a própria borda e não
     * um recuo de 35 cm para dentro do tanque. Com o recuo antigo a perna
     * "de fora" pousaria a 15 cm da pedra, no ar sobre a lâmina.
     *
     * Dois centímetros à frente da lâmina põem a perna externa em −1,775, dentro
     * dos 42 cm da pedra de acabamento, e a interna 16 cm submersa. As duas
     * cotas saem de `piscina`, como tudo que encosta nela desde que esta escada
     * foi parar no meio da água pela primeira vez.
     */
    const zDaEscada = piscina.frente + 0.02
    /**
     * O X DA ESCADA TAMBEM SAI DA PISCINA, e ele acabou de precisar disso.
     *
     * Estava fixo em 4,3. Quando a lamina encolheu de 9 para 8 m a pedido do
     * dono, a borda direita veio de 5,50 para 5,00 — e o corrimao, que vai ate
     * 4,74, ficou a 26 cm dela. Mais um pouco e a escada sairia pela pedra.
     *
     * E a terceira vez que uma peca amarrada a um literal e atropelada por uma
     * mudanca na piscina, depois do proprio z desta escada e dos postes do
     * pergolado. Agora ela fica a um metro da borda direita, e continua la
     * qualquer que seja a largura.
     */
    const xDaEscada = piscina.x + piscina.largura / 2 - 1.0

    // ── deck ──────────────────────────────────────────────────────────────
    const ripas = Math.floor((meiaLargura * 2) / 0.24)
    for (let i = 0; i < ripas; i++)
      col.poe(
        'ripa',
        gRipa,
        mDeck,
        [-meiaLargura + 0.12 + i * 0.24, piso + 0.014, zCentro],
        [0, 0, 0],
        [1, 1, 1],
        // Sequência irregular: `i % 6` daria um padrão que o olho pega em dois
        // segundos e lê como ladrilho, não como madeira.
        TONS_DE_DECK[(i * 5 + ((i * i) % 7)) % TONS_DE_DECK.length]!,
      )

    // ACABAMENTO DO DECK: rodape na topeira e ralo. A regua termina mostrando o
    // corte da madeira, e madeira de topo nao se deixa exposta ao tempo — e por
    // onde a agua entra. A tabua de acabamento e obrigatoria na obra e e ela que
    // fecha a linha do deck contra o parapeito.
    col.poe(
      'rodapeDeck',
      gRodapeDeck,
      mDeck,
      [0, piso + 0.03, zCentro + prof * 0.46],
      [0, Math.PI / 2, 0],
      [1, 1, meiaLargura * 2],
      TONS_DE_DECK[2]!,
    )
    // RALO. Laje de cobertura escoa agua, e o ralo e o unico objeto do piso que
    // prova isso. Fica no ponto baixo, perto da borda. Ver `gRaloLinear` para
    // por que ele deixou de ser uma grelha quadrada.
    for (const xr of [-6.2, 4.8]) {
      const zRalo = zCentro + prof * 0.345
      // A moldura e de aco e fica EMBAIXO: o que se ve dela sao os dois filetes
      // claros de cada lado da fresta, e e esse par de linhas que diz que a
      // canaleta esta embutida no deck em vez de apoiada nele.
      col.poe('molduraRalo', gMolduraRalo, mAco, [xr, piso + 0.02, zRalo])
      // A grelha e ESCURA e fosca, nao aco polido. Canaleta e um vao com uma
      // grade por cima: o que chega ao olho e a sombra do vao, nao o brilho da
      // grade. Aco polido aqui devolvia o poente inteiro e a fresta virava a
      // coisa mais clara do deck, que e o contrario do que ela e.
      col.poe('raloLinear', gRaloLinear, mRaloFundo, [xr, piso + 0.027, zRalo])
    }

    /**
     * ── pergolado ──────────────────────────────────────────────────────────
     *
     * A PILHA EM Y, DE CIMA PARA BAIXO, e ela é a peça toda:
     *   caibro    topo em SOFFIT (2,92)  → centro 2,875, altura 0,09
     *   viga      topo em 2,830          → centro 2,760, altura 0,14
     *   poste     topo em 2,690          → centro 1,345, altura 2,69
     *
     * Escrita assim, cada cota sai da anterior. Antes eram três números soltos
     * (2,93 / 2,80 / 1,45) e bastou o escritório mudar de altura uma vez para os
     * três ficarem fora de registro com ele.
     *
     * DOIS POSTES, e não seis. O pergolado agora apoia nas duas lajes, então só
     * precisa de um pórtico intermediário — 5,6 m de vão de cada lado, que
     * madeira lamelada vence com folga. Cada poste a menos é uma barra vertical a
     * menos atravessando a vista de cima a baixo, e essa conta não mudou desde
     * que os quatro postes originais viraram três.
     */
    const yCaibro = SOFFIT - 0.045
    const yViga = yCaibro - 0.045 - 0.07
    const yPosteTopo = yViga - 0.07
    const xMeioPergola = (X_PERGOLA_DE + X_PERGOLA_ATE) / 2
    for (const z of [zPergolaFrente, zPergolaFundo]) {
      sombra(xMeioPergola, z, 0.95, 0.95)
      col.poe(
        'poste',
        gPoste,
        mMadeiraEscura,
        [xMeioPergola, piso + (yPosteTopo - piso) / 2, z],
        [0, 0, 0],
        [1, (yPosteTopo - piso) / 2.9, 1],
      )
      // Chapa de aço parafusada no topo do poste, dos dois lados.
      for (const dz of [-0.09, 0.09]) {
        col.poe('chapa', gChapa, mAco, [xMeioPergola, yPosteTopo - 0.11, z + dz])
        for (const dy of [-0.07, 0.07])
          col.poe('parafuso', gParafuso, mAco, [xMeioPergola, yPosteTopo - 0.11 + dy, z + dz], [Math.PI / 2, 0, 0])
      }
      // MAO-FRANCESA: as duas diagonais que travam o no. Portico so com pecas
      // ortogonais e instavel de verdade, e o olho conhece isso sem saber que
      // conhece — pergolado sem contraventamento le como montagem provisoria.
      for (const lado of [-1, 1])
        col.poe(
          'maoFrancesa',
          gMaoFrancesa,
          mMadeiraEscura,
          [xMeioPergola + lado * 0.22, yPosteTopo - 0.63, z],
          [0, (lado * Math.PI) / 2, lado * 0.785],
        )
      // A viga vence o vão inteiro entre as duas lajes. `gVigaPergola` tem 12,2 m
      // e é escalada para o vão real: o chanfro de 8 mm encolhe 8% com isso, o
      // que é invisível, e em troca o comprimento passa a acompanhar sozinho
      // qualquer mudança na largura do escritório ou na posição do bar.
      col.poe(
        'viga',
        gVigaPergola,
        mMadeiraEscura,
        [xMeioPergola, yViga, z],
        [0, 0, 0],
        [(X_PERGOLA_ATE - X_PERGOLA_DE) / 12.2, 1, 1],
      )
    }
    /**
     * OS CAIBROS, com um VÃO para a oliveira passar.
     *
     * Ela fica em x = 3,6 e tem 3 m de altura — sob o pergolado, a copa
     * atravessaria os caibros. Pergolado de verdade tem exatamente essa abertura
     * quando há árvore plantada embaixo, e desenhá-la custa um `continue`.
     *
     * O caibro é encurtado de 4,6 para 2,4 m: ele vence a distância entre as duas
     * vigas (1,6 m) mais 40 cm de balanço de cada lado, que é a proporção de
     * beiral que uma peça dessas tem. Com 4,6 ele sobrava 1,5 m para cada lado e
     * o pergolado lia como uma grade solta apoiada em duas linhas.
     */
    const passoCaibro = 0.44
    const nCaibros = Math.floor((X_PERGOLA_ATE - X_PERGOLA_DE - 0.3) / passoCaibro)
    for (let i = 0; i <= nCaibros; i++) {
      const x = X_PERGOLA_DE + 0.15 + i * passoCaibro
      if (EIXOS_DOS_VaOS.some((xo) => Math.abs(x - xo) < 0.75)) continue
      col.poe(
        'ripaPergola',
        gRipaPergola,
        mMadeiraEscura,
        [x, yCaibro, (zPergolaFrente + zPergolaFundo) / 2],
        [0, 0, 0],
        [1, 1, 2.4 / 4.6],
      )
    }

    /**
     * -- varal de luzes: REMOVIDO, a pedido do dono ---------------------------
     *
     * Eram três catenárias sob o pergolado com vinte lâmpadas cada. O que elas
     * resolviam está escrito aqui porque some junto com elas, e quem vier depois
     * precisa saber o que a cena perdeu: a curva contra a reta, que impedia o
     * pergolado de ler como grade, e o vocabulário de "terraço que recebe
     * gente", que a spec pede sem escrever.
     *
     * As duas coisas continuam supridas por outras peças — as copas e a
     * catenária do jardim quebram a ortogonalidade, e o bar aceso com banquetas
     * carrega o "alguém usa isto". Se um dia a cena voltar a parecer uma grade
     * de madeira, é aqui que estava o remédio antigo.
     *
     * Saíram com ele: `catenaria`, `mFio`, `gSoquete`, `gLampada`, `mLampada` e
     * a fusão de geometrias no fim do `useMemo` — eram usados só por este bloco,
     * e código morto que parece vivo é pior que código faltando.
     */

    /**
     * -- espreguicadeiras: NENHUMA ------------------------------------------
     *
     * Eram seis, viraram quatro e agora saem inteiras, a pedido do dono, junto
     * com a estrutura tubular, os gomos de assento e encosto, o travesseiro e as
     * toalhas. Registro por que, porque a peca acabara de ser consertada e
     * alguem pode querer traze-la de volta.
     *
     * O terraco tem pouco mais de tres metros de deck entre a piscina e o
     * guarda-corpo, e uma espreguicadeira tem 1,98 m mais o sorteio de posicao.
     * Ela CABE, e nunca coube confortavelmente: foi o que empurrou a fila para
     * dentro da agua na primeira arrumacao, e o que obrigou a encolher o
     * deslocamento da "fora da fila" de 0,5 para 0,28 na segunda. Com a lamina
     * avancando a pedido do dono, a faixa apertou de vez.
     *
     * A troca e boa. A piscina passa a ocupar a faixa inteira e o que se ve no
     * primeiro plano e agua, que e o que foi pedido. E as pecas que dizem
     * "alguem usa isto" continuam na cena: o varal aceso, o escritorio com a
     * cadeira torta e as tacas penduradas no bar.
     */

    /**
     * ── guarda-sóis: NENHUM ────────────────────────────────────────────────
     *
     * Eram dois, em 5,0 e 7,8. O de 7,8 saiu porque tapava o bar; o de 5,0 foi
     * para 2,0 e agora sai também, a pedido do dono.
     *
     * A peça em si estava certa — mastro, cubo, oito varetas, babado, base de
     * concreto. O problema é o que ela É: um disco OPACO de 3 m de diâmetro a
     * 2,3 m de altura, pendurado exatamente na faixa vertical onde vivem a
     * piscina, o pergolado e o miolo do jardim. Não existe posição boa para ele
     * neste quadro; existe só a posição que esconde menos.
     *
     * E o que se ganha não é só o vão: guarda-sol ABERTO ao entardecer é errado
     * de qualquer forma. Ninguém deixa a lona aberta depois do pôr do sol — e a
     * cena inteira está construída em cima dessa hora.
     *
     * Ficam sem uso `gMastro`, `gVareta`, `gPonteira`, `gCubo8`, `gBabado`,
     * `gBaseSol`, `gLona` e `mLonaSol`. Removidos junto: geometria que ninguém
     * instancia é peso de leitura para quem vier depois, não economia.
     */

    /**
     * ═══ O BAR, REFEITO COMO NICHO RETROILUMINADO ═══
     *
     * Ele existia inteiro — balcão, tampo, estante, 33 garrafas, copos, torneira,
     * banquetas, fita de LED — e no render lia como CERCA: uma sequência de
     * verticais coloridas finas sobre madeira escura, com gramínea aparecendo
     * entre elas. Nada errado no inventário; errado no que estava ATRÁS.
     *
     * Bar de verdade ao entardecer se lê por uma coisa só: a parede de garrafas
     * ACESA POR TRÁS. É a retroiluminação que transforma trinta cilindros em
     * trinta joias — o vidro colorido para de ser silhueta escura e vira filtro,
     * e cada garrafa passa a ter a cor dela em vez de marrom. Sem isso, garrafa
     * escura contra madeira escura é exatamente a cerca que apareceu.
     *
     * Então entram quatro peças, e as quatro servem à mesma leitura:
     *
     * 1. O FUNDO DO NICHO, emissivo, atrás de tudo.
     * 2. OS MONTANTES que dividem o nicho em baias — sem eles a chapa acesa é um
     *    retângulo laranja, e com eles vira marcenaria.
     * 3. A BANDEIRA sobre o balcão, com a face de baixo acesa: é ela que fecha o
     *    nicho por cima e dá ao bar um TETO próprio, que é o que o separa do
     *    terraço em vez de ele ser um móvel solto no meio dele.
     * 4. AS TAÇAS PENDURADAS de boca para baixo no trilho sob a bandeira.
     */
    const xBar = BAR.x
    const LARG_BAR = BAR.largura
    sombra(xBar, zBar, 5.6, 2.0)
    // O nicho aceso, 6 cm atrás das prateleiras. A cor é mais quente e mais
    // escura que a do escritório de propósito: luz de bar é âmbar baixa, não a
    // luz de trabalho de uma sala.
    /**
     * A ESTANTE MACIÇA SAIU, e é isso que faz a retroiluminação existir.
     *
     * Havia uma `gEstante` de 4,6 × 1,9 × 0,32 em madeira escura logo atrás das
     * prateleiras. Eu pus o painel aceso ATRÁS dela, e o primeiro render mostrou
     * o resultado óbvio em retrospecto: um filete de luz escapando por cima e
     * trinta garrafas escuras contra madeira escura — a mesma cerca de antes,
     * agora com uma tarja laranja no topo.
     *
     * Nicho retroiluminado não tem marcenaria atrás das garrafas: o fundo É a
     * fonte. A estante era a peça que definia o volume, e quem assume esse papel
     * agora são os montantes e a bandeira, que ficam à FRENTE da luz e por isso
     * recortam contra ela em vez de tapá-la.
     *
     * A ordem em z passa a ser a regra inteira, e ela é curta: painel (−1,63),
     * montantes (−1,50), prateleiras e garrafas (−1,46). Errar essa pilha por
     * dois centímetros apaga o bar — é o mesmo tipo de erro que já engoliu a
     * lâmina da piscina duas vezes por y.
     */
    /**
     * O BAR SOBE PARA A ALTURA DO ESCRITÓRIO — 2,92 m de pé-direito, laje de
     * concreto em balanço, e não mais uma viga chata a 2,30.
     *
     * A bandeira antiga fazia o trabalho mínimo: dava ao móvel um limite superior
     * para ele não flutuar no terraço. Só que o quadro ganhou um segundo volume
     * construído na outra ponta — o escritório — e dois volumes de alturas
     * diferentes nas duas bordas leem como duas coisas sem relação. Iguais, eles
     * viram um PAR, e o jardim entre os dois passa a ser o vão entre duas
     * construções em vez de um fundo com dois objetos colados.
     *
     * O que a altura compra além do enquadramento: o nicho de garrafas cresce de
     * 1,98 para 2,27 e ganha uma quarta prateleira, e sobra pé-direito para um
     * FORRO com lâmpadas embutidas — que é o que ilumina o tampo de pedra e o
     * ombro de quem estaria sentado ali.
     */
    const ALT_BAR = ESCRITORIO.altura
    const PROF_BAR = 2.2
    const zForroBar = zBar - 0.6
    const yNicho = piso + NICHO_BASE + NICHO_ALTURA / 2
    const H_NICHO = NICHO_ALTURA
    col.poe(
      'barNicho',
      gCaixa,
      mBarNicho,
      [xBar, yNicho, zBar - 1.63],
      [0, 0, 0],
      [LARG_BAR, H_NICHO, 0.05],
    )
    // Montantes: cinco divisórias verticais recortando o nicho em quatro baias.
    // Sem eles a chapa acesa é um retângulo laranja; com eles, é marcenaria.
    for (let d = 0; d <= 4; d++)
      col.poe(
        'barMontante',
        gCaixa,
        mMadeiraEscura,
        [xBar - LARG_BAR / 2 + (d * LARG_BAR) / 4, yNicho, zBar - 1.5],
        [0, 0, 0],
        [0.07, H_NICHO, 0.24],
      )
    col.poe('balcao', gBalcao, mMadeiraEscura, [xBar, piso + 0.5, zBar])
    col.poe('tampo', gTampo, mPedra, [xBar, piso + 1.05, zBar])
    /**
     * O BACK BAR: a bancada baixa entre o balcão e o nicho, onde o barman
     * trabalha. Era o que faltava para o bar ter PROFUNDIDADE — sem ela, tampo e
     * garrafas ficam em dois planos e o meio é vazio, o que faz a peça inteira
     * ler como fachada de cenário.
     */
    col.poe('backBar', gCaixa, mMadeiraEscura, [xBar, piso + 0.46, zBar - 1.12], [0, 0, 0], [LARG_BAR - 0.2, 0.92, 0.42])
    col.poe('backBarTampo', gCaixa, mPedra, [xBar, piso + 0.95, zBar - 1.12], [0, 0, 0], [LARG_BAR - 0.1, 0.05, 0.5])
    /**
     * A CUBA DE GELO E O PANO — as duas peças que dizem que ALGUÉM TRABALHA ali.
     *
     * Bancada de trabalho limpa e vazia é bancada de showroom. A cuba é um
     * rebaixo escuro com aro de inox (dois blocos), e o pano é uma faixa clara
     * jogada por cima do tampo. São três instâncias, e elas fazem pelo bar o que
     * a toalha caída fazia pela espreguiçadeira antes de ela sair da cena.
     *
     * A cuba fica FORA do centro de propósito: centrada, ela viraria composição.
     */
    col.poe('cubaBar', gCaixa, mBarNicho, [xBar - 1.5, piso + 0.93, zBar - 1.1], [0, 0, 0], [0.62, 0.02, 0.34])
    col.poe('aroCuba', gCaixa, mMetal, [xBar - 1.5, piso + 0.965, zBar - 1.1], [0, 0, 0], [0.7, 0.03, 0.42])
    col.poe('panoBar', gCaixa, mRotulo, [xBar + 1.2, piso + 0.985, zBar - 1.14], [0, 0.22, 0], [0.34, 0.02, 0.24])
    // Laje e forro, na mesma cota da laje do escritório.
    col.poe('barLaje', gCaixa, mParedeConcreto, [xBar, piso + ALT_BAR + 0.09, zForroBar], [0, 0, 0], [LARG_BAR + 0.8, 0.18, PROF_BAR + 0.5])
    col.poe('barForro', gCaixa, mMadeiraEscura, [xBar, piso + ALT_BAR - 0.06, zForroBar], [0, 0, 0], [LARG_BAR + 0.4, 0.1, PROF_BAR + 0.2])
    for (const s of [-1, 1])
      col.poe('barPilar', gCaixa, mMadeiraEscura, [xBar + s * (LARG_BAR / 2 + 0.28), piso + ALT_BAR / 2, zForroBar], [0, 0, 0], [0.14, ALT_BAR, 0.14])
    /**
     * QUATRO EMBUTIDAS NO FORRO. Elas resolvem o que o nicho sozinho não resolve:
     * o nicho acende o FUNDO, e tudo que está à frente dele — tampo, coqueteleira,
     * taças, quem estiver no balcão — ficava em silhueta. Luz vindo de cima é o
     * que separa os dois planos.
     *
     * `mFitaLed` é básico e fura o tone mapping, então o disco aparece como um
     * ponto branco-âmbar de verdade em vez do mesmo bege de tudo.
     */
    for (let s = 0; s < 4; s++)
      col.poe('barSpot', gSpot, mFitaLed, [xBar - 1.65 + s * 1.1, piso + ALT_BAR - 0.12, zBar - 0.35])
    // Trilho de taças sob o forro, e as taças de boca para baixo nele. É o objeto
    // que ninguém sabe nomear e todo mundo reconhece como bar.
    col.poe('barTrilho', gCaixa, mMetal, [xBar, piso + 2.52, zBar - 0.28], [0, 0, 0], [LARG_BAR - 0.6, 0.03, 0.26])
    for (let t = 0; t < 12; t++)
      col.poe(
        'copo',
        gCopo,
        mVidroGarrafa,
        [xBar - LARG_BAR / 2 + 0.5 + t * 0.35, piso + 2.4, zBar - 0.28],
        [Math.PI, 0, 0],
        [1.15, 1.4, 1.15],
      )
    // Apoio de pé: o tubo baixo na frente do balcão. Ninguém sabe nomear, todo
    // mundo reconhece — é o que transforma "caixa" em "balcão de bar".
    col.poe('apoioPe', gApoioPe, mAco, [xBar, piso + 0.19, zBar + 0.42], [0, 0, Math.PI / 2])
    /**
     * QUATRO PRATELEIRAS, E A GARRAFA GANHOU GARGALO.
     *
     * No render anterior as garrafas liam como PEÇAS DE DOMINÓ: cilindros de
     * altura variável e topo reto, enfileirados. Faltava a única coisa que
     * identifica uma garrafa de longe, que é a silhueta em dois tempos — corpo
     * largo, ombro, gargalo fino. É um cilindro a mais por garrafa, e ele custa
     * uma matriz.
     *
     * A cor vai no gargalo TAMBÉM, e a mesma: vidro é tingido na massa, então
     * corpo âmbar com gargalo transparente seria garrafa de duas peças.
     */
    /**
     * VINTE GARRAFAS POR PRATELEIRA, e não doze — oitenta no total.
     *
     * Doze em 4,9 m davam 41 cm de vão entre uma e outra: uma FILEIRA, com o
     * painel aceso aparecendo inteiro por trás. Parede de bar não é fileira, é
     * ESTOQUE — as garrafas se encostam, se escondem uma atrás da outra e só
     * deixam passar frestas de luz. É essa densidade que faz o nicho parecer um
     * lugar que funciona em vez de uma vitrine montada.
     *
     * Oitenta garrafas com gargalo e rótulo são 240 matrizes, e o coletor as
     * emite em três `InstancedMesh`. O custo real de instância é a chamada de
     * desenho, não a cópia — é o mesmo argumento que sustenta os 64 racks do
     * andar 07.
     *
     * DUAS FILAS EM PROFUNDIDADE: as de trás ficam 9 cm atrás e mais altas, e é
     * a sobreposição entre as duas que dá volume à parede. Uma fila só, por mais
     * densa, continua sendo um friso.
     */
    for (const [p, y] of PRATELEIRAS_BAR.entries()) {
      col.poe('prateleira', gPrateleira, mPedra, [xBar, piso + y, zBar - 1.46])
      for (let g = 0; g < 20; g++) {
        for (const fila of [0, 1]) {
          const passo = LARG_BAR / 20
          const x =
            xBar - LARG_BAR / 2 + passo * (g + 0.5) + (fila ? passo * 0.5 : 0) +
            (ruido(g, 41 + p * 7 + fila * 3) - 0.5) * 0.05
          if (x > xBar + LARG_BAR / 2 - 0.1) continue
          /**
           * ═══ O VÃO, E ELE É O QUE MAIS DEVOLVE AQUI ═══
           *
           * As prateleiras estavam CHEIAS: vinte posições, vinte garrafas, duas
           * filas, sem falha. Garrafa encostada em garrafa não tem silhueta —
           * ela só existe contra alguma coisa, e o que há atrás é outra garrafa
           * da mesma cor e da mesma altura.
           *
           * Deixando cerca de um quinto das posições vazias, a luz de trás passa
           * entre elas e cada garrafa ganha borda. É o mesmo raciocínio das 52
           * ripas do balcão, algumas linhas abaixo: o que se lê não é a ripa, é a
           * SOMBRA entre elas. Aqui o que se lê não é a garrafa, é o vão.
           *
           * E é gratuito no orçamento: um quinto de instâncias a MENOS.
           */
          if (ruido(g, 61 + p * 11 + fila * 5) < 0.2) continue
          // A fila de trás é mais alta: garrafa baixa atrás de garrafa alta
          // simplesmente não existe para a câmera, e seria instância paga sem
          // nenhum pixel em troca.
          //
          // A FAIXA DE ALTURA DOBROU (era 0,5 de amplitude, agora 1,0). Com as
          // silhuetas iguais, variar mais a altura só esticava o mesmo cilindro;
          // com quatro perfis diferentes, a altura passa a compor com a forma e
          // a diferença entre uma garrafa e a vizinha fica óbvia.
          const alto = (fila ? 1.05 : 0.72) + ruido(g, 42 + p * 5 + fila) * 1.0
          // O DIÂMETRO também varia. Sem isso, oitenta cilindros de mesma
          // largura leem como um pente — era o defeito que o gargalo sozinho não
          // consertou.
          const larg = 0.82 + ruido(g, 43 + p * 3 + fila) * 0.36
          const z = zBar - 1.46 - fila * 0.09
          const cor = TONS_DE_GARRAFA[(g * 5 + p * 3 + fila * 7) % TONS_DE_GARRAFA.length]!
          const yBase = piso + y + 0.17
          // O perfil sai de uma semente PRÓPRIA, sem relação com a da cor nem
          // com a da altura: se as três viessem do mesmo número, forma, tamanho
          // e cor andariam juntas e a parede voltaria a ter padrão — outro
          // padrão, mas padrão.
          const perfil =
            PERFIS_DE_GARRAFA[
              Math.floor(ruido(g, 71 + p * 13 + fila * 3) * PERFIS_DE_GARRAFA.length) %
                PERFIS_DE_GARRAFA.length
            ]!
          col.poe(perfil.chave, perfil.geo, mGarrafa, [x, yBase, z], [0, 0, 0], [larg, alto, larg], cor)
          col.poe(
            'gargalo',
            gGargalo,
            mGarrafa,
            [x, yBase + 0.15 * alto + 0.055, z],
            [0, 0, 0],
            [larg, 1, larg],
            cor,
          )
          /**
           * O RÓTULO é o detalhe que mais devolve por instância nesta cena.
           *
           * Garrafa retroiluminada sem rótulo é uma mancha de cor CONTÍNUA de
           * baixo a cima — e era isso que se via. O rótulo corta essa mancha ao
           * meio com uma faixa clara e OPACA, e são as oitenta faixas na mesma
           * altura relativa que organizam a parede: o olho acha a linha delas
           * antes de achar qualquer garrafa.
           *
           * Fica a 40% da altura do corpo, que é onde rótulo de garrafa fica.
           * Centrado, pareceria uma fita decorativa.
           */
          col.poe(
            'rotulo',
            gRotulo,
            mRotulo,
            [x, yBase - 0.15 * alto + 0.3 * alto * 0.3 + 0.02, z],
            [0, 0, 0],
            [larg * 1.06, alto * 0.62, larg * 1.06],
          )
        }
      }
    }
    /**
     * O BALCÃO GANHA RIPADO. Era um painel liso de 4,6 × 1,0 m — a maior
     * superfície de madeira do bar, e a mais morta: um retângulo escuro com a
     * trama do mapa e nada mais.
     *
     * Ripado vertical é O desenho de frente de balcão contemporâneo, e por uma
     * razão que não é de gosto: ele é o único jeito de dar escala a um painel
     * grande sem pôr nele nenhuma informação. São 52 ripas de 5 cm, e o que se
     * lê não são as ripas — é a SOMBRA entre elas, uma linha vertical a cada 9
     * cm, que diz de perto e de longe o tamanho do móvel.
     */
    for (let r = 0; r < 52; r++)
      col.poe(
        'ripaBalcao',
        gRipaBalcao,
        mMadeiraEscura,
        [xBar - 2.25 + r * 0.088, piso + 0.56, zBar + 0.355],
        [0, 0, 0],
        [1, 0.86, 1],
      )
    // RODAPÉ RECUADO sob o ripado. Nenhuma marcenaria encosta no chão: a sombra
    // do recuo é o que faz o balcão parecer apoiado em vez de brotado do deck.
    col.poe('rodapeBalcao', gCaixa, mMadeiraEscura, [xBar, piso + 0.06, zBar + 0.28], [0, 0, 0], [4.6, 0.12, 0.6])
    /**
     * O QUE SE DEIXA EM CIMA DO BALCÃO, e é a parte mais barata do bar com o
     * maior retorno — mesma lógica da toalha na espreguiçadeira e do carrinho de
     * serviço no datacenter: a única coisa da cena que não foi instalada, foi
     * DEIXADA. Bar sem nada em cima do tampo é um móvel de catálogo.
     */
    for (let c = 0; c < 7; c++)
      col.poe('copo', gCopo, mVidroGarrafa, [xBar - 1.7 + c * 0.3, piso + 1.15, zBar - 0.18])
    col.poe('torneira', gTorneira, mMetal, [xBar + 1.8, piso + 1.22, zBar - 0.2])
    // Coqueteleira, tigela de guarnição e a carta em pé. Três peças, três
    // silhuetas diferentes — é a variedade de forma que diz "aqui se trabalha".
    col.poe('shaker', gShaker, mMetal, [xBar - 0.4, piso + 1.19, zBar - 0.3])
    col.poe('tigela', gTigela, mPedra, [xBar + 0.45, piso + 1.12, zBar - 0.26])
    col.poe('carta', gCaixa, mEscParede, [xBar + 1.1, piso + 1.19, zBar + 0.1], [0.24, 0.3, 0], [0.15, 0.21, 0.008])
    for (const x of [7.4, 8.4, 9.4, 10.4]) {
      col.poe('banqueta', gAssentoBanqueta, mMadeiraEscura, [x, piso + 0.76, zBar + 0.85])
      col.poe('pernaBanqueta', gPernaBanqueta, mMetal, [x, piso + 0.38, zBar + 0.85])
      // Anel de apoio de pé na banqueta. Banqueta alta sem ele não existe — e é
      // o aro que a separa de um cogumelo em cima de um palito.
      col.poe('aroBanqueta', gAroBanqueta, mMetal, [x, piso + 0.22, zBar + 0.85], [Math.PI / 2, 0, 0])
    }

    /**
     * ═══ AS LUZES DE JARDIM ═══
     *
     * Duas familias, e elas fazem trabalhos opostos.
     *
     * O ESPETO SOB A ARVORE ilumina de baixo para cima. E o gesto mais
     * reconhecivel de paisagismo noturno, e ele existe por uma razao que nao e
     * decorativa: a copa e a unica parte da arvore que o sol ja nao alcanca ao
     * entardecer, e sem luz vinda do chao ela vira uma silhueta preta. Dois por
     * arvore, afastados do tronco, porque um so achata a copa num leque.
     *
     * O BALIZADOR NO CANTEIRO ilumina o proprio canteiro e marca o limite dele.
     * Nao aponta para nada: ele E o ponto de luz, e o que ele faz pelo quadro e
     * pontilhar a faixa mais escura da cena com uma linha de brilhos.
     *
     * NENHUMA DAS DUAS E UMA LUZ DE VERDADE, e isso e deliberado. Cada
     * `pointLight` nova entra no laco de iluminacao de TODOS os materiais da
     * cena — e ja sao tres. O facho aditivo e o mesmo recurso que a cena usa na
     * parede do fundo desde o comeco: um plano com degrade de alfa somando luz
     * onde ela deveria estar. A 18 m de distancia ele le igual, e custa zero no
     * shader de todo o resto.
     *
     * O facho e CRUZADO — dois planos a 90 graus. Um plano so desaparece quando
     * visto de perfil, e a camera desce ao longo da cena: o cruzamento garante
     * que sempre haja um deles de frente.
     */
    for (const xArv of EIXOS_DOS_VaOS) {
      for (const lado of [-1, 1]) {
        const xe = xArv + lado * 0.44
        const ze = zArvores + 0.34
        col.poe('espeto', gEspeto, mMetal, [xe, piso + 0.78, ze])
        col.poe('lenteEspeto', gLente, mBalizador, [xe, piso + 0.87, ze])
        /**
         * O FACHO SAI DA LENTE, e essa frase é a correção inteira.
         *
         * Ele era um plano CENTRADO em `piso + 2,0` com um degradê radial: uma
         * lente pálida de 40 cm × 2,25 m pairando ao lado do tronco, mais clara
         * no meio da altura e fechada em cima E embaixo. O feixe não encostava
         * na luminária. Agora a base do plano fica exatamente na lente e o
         * desenho do cone vem de `fachoDeEspeto` — ver lá por que ele abre e por
         * que ele escurece com a altura.
         *
         * `gFacho` é um `PlaneGeometry(0,5 × 1,5)` com origem no centro, então o
         * plano sobe meia altura acima da lente. Escrito como conta e não como
         * número: mexer em `ALTURA` move a peça inteira junto.
         */
        for (const giro of [0, Math.PI / 2])
          col.poe(
            'fachoCopa',
            gFacho,
            mFachoDeCopa,
            [xe, piso + 0.87 + FACHO_ESPETO.altura / 2, ze],
            [0, giro, 0],
            [FACHO_ESPETO.boca / 0.5, FACHO_ESPETO.altura / 1.5, 1],
          )
      }
    }
    /**
     * Os balizadores correm a calha inteira, a cada 1,4 m. O passo vem da
     * LARGURA DO JARDIM e nao de um numero fixo: se o vao entre as duas
     * construcoes mudar, eles se redistribuem em vez de sobrar ou faltar na
     * ponta.
     */
    {
      const largura = X_PERGOLA_ATE - X_PERGOLA_DE
      const quantos = Math.max(2, Math.round(largura / 1.4))
      for (let b = 0; b <= quantos; b++) {
        const xb = X_PERGOLA_DE + 0.35 + (b * (largura - 0.7)) / quantos
        col.poe('balizadorJardim', gBalizador, mBalizador, [xb, piso + 0.56, zCanteiro + 0.86])
        // Um facho curto e deitado em volta de cada um: e o circulo de luz no
        // chao que diz que aquilo ilumina alguma coisa, e nao so acende.
        col.poe(
          'fachoJardim',
          gFacho,
          mPocaDeBalizador,
          [xb, piso + 0.57, zCanteiro + 0.86],
          [-Math.PI / 2, 0, 0],
          // Meio metro de poca, e nao um metro e meio: balizador de canteiro
          // ilumina o proprio pe. Na escala anterior as pocas se tocavam e a
          // calha inteira virava uma faixa clara continua.
          [0.5, 0.42, 1],
        )
      }
    }

    /**
     * ═══ A VEGETAÇÃO, REFEITA COM O VOCABULÁRIO DE COBERTURA CONTEMPORÂNEA ═══
     *
     * O que estava aqui era "planta genérica": tronco reto, copa de esferas verde
     * floresta, vasinhos redondos em fila. Isso não é paisagismo de cobertura —
     * é o verde que se desenha quando não se olhou nenhuma. Cobertura moderna
     * tem uma gramática bem definida, e ela é feita de quatro coisas:
     *
     * 1. OLIVEIRA MULTITRONCO. É A árvore de terraço contemporâneo, e por razões
     *    práticas antes de estéticas: aguenta vento, sol direto, raiz rasa e
     *    pouca água — exatamente as condições de uma laje. Visualmente ela é o
     *    oposto da árvore genérica: troncos MÚLTIPLOS saindo tortos da mesma
     *    base, copa ABERTA (vê-se céu através dela) e folha PRATEADA, cinza-esverdeada.
     *    Copa fechada verde-escura é árvore de parque, não de cobertura.
     *
     * 2. GRAMÍNEA ORNAMENTAL EM MASSA. É a assinatura do paisagismo moderno, e o
     *    ponto não é a planta, é a REPETIÇÃO: uma espécie só, muitas mudas,
     *    plantadas em faixa contínua. Mistura de espécies lê como jardim de
     *    casa; massa de uma só lê como projeto. E em contraluz de fim de tarde a
     *    lâmina fina ACENDE — é a única vegetação que fica dourada em vez de
     *    escura quando o sol está atrás, e esta cena é toda em contraluz.
     *
     * 3. JARDINEIRA LINEAR, não vaso redondo. Vaso pontual é decoração; calha
     *    corrida é ARQUITETURA — ela desenha uma linha reta no piso e é essa
     *    linha que amarra o terraço. Corten (aço que enferruja de propósito e
     *    para de enferrujar) é o material canônico desde os anos 2000.
     *
     * 4. BUXO APARADO EM FILEIRA. Geometria repetida — esferas idênticas,
     *    espaçamento igual. É o contraponto formal da gramínea solta, e é a
     *    única coisa do jardim onde a REGULARIDADE é o efeito desejado.
     */

    // ── oliveiras multitronco ─────────────────────────────────────────────
    /**
     * UMA OLIVEIRA, E FORA DO VAO DO PERGOLADO.
     *
     * Eram tres, e duas caiam dentro do pergolado. Eu baixei a copa para ela
     * passar sob a viga e troquei um encontrao por outro: na altura nova ela foi
     * parar no mesmo nivel do arbusto do canteiro e SUMIU dentro dele. A faixa
     * livre entre o topo do arbusto (2,4) e a face da viga (2,73) tem 33 cm — nao
     * cabe arvore nenhuma ali, por mais que eu ajustasse.
     *
     * A conclusao nao e de altura, e de LUGAR: arvore-exemplar precisa de vazio
     * em volta para ser lida como exemplar. Espremida entre pergolado, plantio e
     * guarda-sol ela vira mais uma mancha verde, e tres delas espremidas viram
     * tres manchas.
     *
     * Entao fica UMA, plantada a esquerda do pergolado (que comeca em -8,4), com
     * ceu atras e altura cheia de volta. As palmeiras do canteiro continuam
     * fazendo o trabalho de verticalidade no resto da largura — e elas ja estao
     * acima da viga, entao nunca disputaram.
     */
    // x = -10,6 e 3,6, e o segundo numero e o que importa: 3,6 e o unico VAO
    // LIVRE da metade direita. A viga do pergolado termina em 2,9, os guarda-sois
    // estao em 5,0 e 7,8 mas numa profundidade a frente, e o bar comeca em 6,7.
    // Sobra a faixa de 2,9 a 6,7, e a arvore fica no meio dela — visivel de
    // corpo inteiro, sem nada na frente e sem nada atras para se fundir.
    //
    // As posicoes anteriores (-11,4 / 12,6 e depois -10,6 / 12,2) Em zArvores (14,4 m da camera) a
    // escala e 41,6 px/m, entao -11,4 e 12,6 caiam em 166 e 1164 de uma tela de
    // 1280 — ou seja, colados nas bordas e metade fora. A esquerda desloca para
    // dentro; a direita passa do bar (que termina em 11,3) para o tronco nao
    // nascer atras dele e a copa nao ficar boiando.
    /**
     * A OLIVEIRA DA ESQUERDA FOI DE −10,6 PARA −12,9, e foi o escritório que a
     * empurrou. Em −10,6 a copa dela (raio ~1,5 m) cobria o terço esquerdo do
     * pano de vidro — que é exatamente onde mora a estante, a peça mais detalhada
     * do interior. Pôr uma copa opaca na frente do que se acabou de construir é
     * desperdício dos dois lados.
     *
     * A restrição antiga continua valendo: em −11,4 a árvore caía colada na borda
     * do quadro numa tela de 1280. Mas o enquadramento largo do dono abre bem mais
     * que isso, e a −12,9 ela ainda entra inteira — e agora ENQUADRA o escritório
     * pela esquerda em vez de tapá-lo.
     */
    /**
     * AS DUAS OLIVEIRAS ESPELHADAS NO POSTE DO PERGOLADO.
     *
     * Estavam em −12,9 e 3,6: a primeira quase fora do quadro, atrás do
     * escritório, e a segunda num ponto sem relação com nada. Agora cada uma
     * ocupa o centro de uma das duas metades do vão, então elas são simétricas em
     * relação ao poste — e as palmeiras, que ficam nos apoios, caem exatamente
     * nos intervalos entre elas.
     *
     * O que se lê é uma alternância regular: apoio, copa, apoio, copa, apoio. É
     * essa alternância, e não a quantidade de folha, que faz um plantio parecer
     * desenhado.
     *
     * As duas atravessam o pergolado, e os caibros abrem vão para as duas.
     */
    for (const [k, x] of EIXOS_DOS_VaOS.entries()) {
      sombra(x, zArvores, 2.4, 2.4)
      col.poe('vasoAlto', gVasoAlto, mVaso, [x, piso, zArvores])
      col.poe('terra', gTerra, mTerra, [x, piso + 0.66, zArvores], [-Math.PI / 2, 0, 0])
      // Três troncos saindo tortos da mesma base. É a base MÚLTIPLA que
      // identifica a oliveira à distância — um tronco só já seria outra árvore.
      const troncos = [
        { a: 0.3 + k, incl: 0.16 },
        { a: 2.4 + k, incl: 0.23 },
        { a: 4.3 + k, incl: 0.11 },
      ]
      for (const [t, tr] of troncos.entries()) {
        const dx = Math.sin(tr.a) * 0.13
        const dz = Math.cos(tr.a) * 0.13
        col.poe(
          'troncoOliva',
          gTroncoOliva,
          mCascaOliva,
          [x + dx, piso + 1.75 + t * 0.08, zArvores + dz],
          [Math.cos(tr.a) * tr.incl, 0, -Math.sin(tr.a) * tr.incl],
        )
        col.poe(
          'galhoOliva',
          gGalhoOliva,
          mGalhoOliva,
          [x + dx * 2.6, piso + 3.0 + t * 0.16, zArvores + dz * 2.6],
          [Math.cos(tr.a) * 0.65, 0, -Math.sin(tr.a) * 0.65],
        )
      }
      /**
       * COPA ABERTA, e a abertura é o ponto. Trinta tufos PEQUENOS espalhados
       * num volume largo, em vez de poucos tufos grandes — assim sobra céu entre
       * eles e a árvore respira. Copa maciça é o erro que faz qualquer árvore
       * modelada parecer brócolis: na natureza a folha se organiza em camadas
       * finas na periferia, porque é lá que está a luz, e o miolo é vazio.
       */
      // NUCLEO: oito tufos solidos no miolo, so para a copa ter massa escura por
      // tras das folhas. Sem eles ve-se o ceu atraves da arvore inteira e ela
      // perde peso; com eles, as folhas chatas ficam recortadas contra algo.
      /**
       * O NUCLEO ENCOLHEU PARA DENTRO DA NUVEM DE FOLHAS, e era esta a causa da
       * "parte escura" que o dono apontou.
       *
       * Nao era falta de folha: era o nucleo TRANSBORDANDO. Os tufos iam ate
       * 0,78 de raio e cada um tem 0,27 escalado por 1,7 — ou seja 0,46 —, entao
       * a massa chegava a 1,24 m do eixo. As folhas param em 0,94. A casca
       * escura ficava do lado de FORA da folhagem, e nenhuma quantidade de folha
       * cobre o que esta por cima delas.
       *
       * Com alcance 0,52 e escala 1,4, o nucleo chega a 0,90 — logo abaixo da
       * envoltoria das folhas. Ele volta a ser o que deveria ser desde o comeco:
       * massa POR TRAS, nunca por cima.
       */
      for (let t = 0; t < 40; t++) {
        const a = ruido(t, 55 + k) * Math.PI * 2
        const r = ruido(t, 56 + k) * 0.40
        col.poe(
          'nucleoOliva',
          gTufoOliva,
          mFolhaSolida,
          [x + Math.sin(a) * r, piso + 3.1 + ruido(t, 57 + k) * 1.1, zArvores + Math.cos(a) * r],
          [ruido(t, 58 + k) * 3, ruido(t, 59 + k) * 3, 0],
          [1.22, 0.95, 1.22],
          // O tom mais escuro da paleta: e ele que poe a massa ATRAS das folhas
          // em vez de competir com elas. Quem cobre essa massa e a quantidade de
          // folha, nao a cor dela.
          TONS_DE_OLIVA[0]!,
        )
      }
      /**
       * A FOLHA NASCE EM RAMALHETE, e este era o erro que ainda restava.
       *
       * A versão anterior espalhou 330 folhas soltas dentro do volume da copa,
       * cada uma girada ao acaso nos três eixos. Aquilo resolveu o problema do
       * sólido — passou a cintilar —, mas trouxe outro: CONFETE. Folha não
       * flutua distribuída num volume. Ela nasce em sequência ao longo de um
       * raminho, o raminho nasce num galho, e por isso a copa de qualquer árvore
       * é feita de GRUMOS e não de uma nuvem uniforme.
       *
       * O grumo produz as três coisas que faltavam:
       *
       * - AUTO-SOMBRA. Um grumo denso tem lado claro e lado escuro. Folha
       *   dispersa recebe luz de todos os lados e achata.
       * - SILHUETA RECORTADA. O contorno de uma copa real é serrilhado pelos
       *   ramalhetes da periferia; não é um círculo difuso.
       * - DIREÇÃO. As folhas de um mesmo raminho apontam quase todas para o
       *   mesmo lado, e é essa concordância LOCAL que o olho lê como crescimento
       *   em vez de espalhamento.
       *
       * E a orientação deixa de ser aleatória: ela segue o eixo do raminho, com
       * dispersão em volta. O giro livre nos três eixos foi exatamente o que fez
       * a versão anterior parecer papel picado suspenso.
       */
      // Mais ramalhetes e mais folha por ramalhete: o recorte por alfa tirou
      // quase metade da area de cada quad, e sem repor a copa RAREIA.
      const ramalhetes = 320
      for (let b = 0; b < ramalhetes; b++) {
        // O pé do raminho fica na casca da copa. A raiz quadrada empurra para
        // FORA, porque o miolo é oco — é na periferia que está a luz.
        const az = ruido(b, 50 + k) * Math.PI * 2
        // Copa REDONDA, nao disco. Com raio ate 1,04 e altura de 1,15 ela era duas
        // vezes mais larga que alta, e de perto isso le como tapete de folha
        // pousado no galho. Oliveira adulta tem copa quase tao alta quanto larga.
        const rBase = 0.18 + Math.sqrt(ruido(b, 60 + k)) * 0.76
        // ALTURA CHEIA DE VOLTA: fora do vao do pergolado ela nao disputa com
        // nada, e pode ter a copa alta que uma oliveira adulta tem. A copa comeca
        // acima do topo do arbusto do canteiro (2,4), entao ela se destaca contra
        // o ceu em vez de se fundir com o verde de tras.
        const yBase = piso + 2.85 + ruido(b, 70 + k) * 1.55
        const bx = x + Math.sin(az) * rBase
        const bz = zArvores + Math.cos(az) * rBase * 0.78
        // A maioria PENDE: galho carregado de folha não fica na horizontal, e o
        // −0,62 no deslocamento é o que inclina a distribuição para baixo.
        const inclina = (ruido(b, 75 + k) - 0.62) * 1.1
        const comp = 0.2 + ruido(b, 76 + k) * 0.22

        // O raminho em si. Sem ele o grumo flutua desligado da árvore.
        col.poe(
          'raminho',
          gRaminho,
          mGalhoOliva,
          [
            bx + Math.sin(az) * comp * 0.4,
            yBase + inclina * comp * 0.4,
            bz + Math.cos(az) * comp * 0.4,
          ],
          [Math.cos(az) * -inclina, az, Math.sin(az) * inclina],
          [1, comp / 0.3, 1],
        )

        for (let f = 0; f < 24; f++) {
          // Ao LONGO do raminho, e não em volta dele.
          const u = 0.12 + (f / 24) * 0.98
          const g = b * 17 + f
          col.poe(
            'folhaOliva',
            gFolhaOliva,
            mFolha,
            [
              bx + Math.sin(az) * comp * u + (ruido(g, 80 + k) - 0.5) * 0.075,
              yBase + inclina * comp * u + (ruido(g, 85 + k) - 0.5) * 0.07,
              bz + Math.cos(az) * comp * u + (ruido(g, 90 + k) - 0.5) * 0.075,
            ],
            // Segue o eixo do raminho, com dispersão. O terceiro ângulo é o
            // ROLAMENTO da folha em torno do próprio pecíolo, e é ele que faz
            // uma pegar sol enquanto a vizinha fica de perfil.
            [
              Math.cos(az) * -inclina + (ruido(g, 95 + k) - 0.5) * 0.9,
              az + (ruido(g, 100 + k) - 0.5) * 1.1,
              ruido(g, 105 + k) * 6.3,
            ],
            (() => {
              const e = 0.78 + ruido(g, 110 + k) * 0.5
              return [e, e, e] as [number, number, number]
            })(),
            TONS_DE_OLIVA[(g * 3 + k) % TONS_DE_OLIVA.length]!,
          )
        }
      }
    }

    /**
     * A CAIXA DE ESCADA — e ela fecha um BURACO DE LOGICA, nao um vazio visual.
     *
     * Esta cobertura nao tinha por onde se chegar. Ninguem formula isso
     * conscientemente ao olhar, mas o cerebro cobra: um terraco mobiliado, com
     * bar e piscina, e sem uma porta e um cenario de teatro — a parte que a
     * camera nao ve simplesmente nao existe. O volume da escada e a peca que
     * torna o lugar ALCANCAVEL, e isso muda o que a cena afirma.
     *
     * Alem disso ela resolve dois problemas de composicao que sobraram: a parede
     * do fundo era a maior area chapada do quadro, e a metade esquerda nao tinha
     * nenhuma massa construida entre o pergolado e o ceu.
     *
     * A MARQUISE sobre a porta nao e enfeite: porta de saida para laje SEMPRE
     * tem cobertura, senao chove dentro da escada. E a arandela acima dela e o
     * que diz que este lugar tambem funciona de noite.
     */
    const { x: xEsc, largura: LARG_ESC, altura: ALT_ESC, profundidade: PROF_ESC } = ESCRITORIO
    const zEsc = zDoEscritorio(zCentro, prof)
    const zFrenteEsc = zEsc + PROF_ESC / 2
    const zFundoEsc = zEsc - PROF_ESC / 2
    const yTetoEsc = piso + ALT_ESC
    /** Volume do escritório: uma caixa unitária colocada por centro e tamanho. */
    const bloco = (
      chave: string,
      material: THREE.Material,
      centro: [number, number, number],
      tamanho: [number, number, number],
    ) => col.poe(chave, gCaixa, material, centro, [0, 0, 0], tamanho)

    sombra(xEsc, zEsc, LARG_ESC + 0.8, PROF_ESC + 1.2)
    // A casca: duas laterais, piso e laje. A face da FRENTE fica vazia — ela é o
    // pano de vidro. E o FUNDO também: quem fecha ali é a parede do andar, que já
    // está no lugar exato (ver `zDaParedeDoAndar`).
    for (const s of [-1, 1])
      bloco('escCasca', mEscParede, [xEsc + s * (LARG_ESC / 2 - 0.06), piso + ALT_ESC / 2, zEsc], [0.12, ALT_ESC, PROF_ESC])
    // CHAVES SEPARADAS PARA PISO E LAJE, e isto é a armadilha do coletor de novo:
    // ele guarda geometria E MATERIAL da primeira chamada de cada chave. Com as
    // três peças sob `escCasca`, o piso de madeira e a laje de concreto saíam
    // ambos com o reboco da parede, em silêncio.
    bloco('escPiso', mEscPiso, [xEsc, piso + 0.03, zEsc], [LARG_ESC, 0.06, PROF_ESC])
    /**
     * A LAJE AVANÇA 22 cm ALÉM DO VIDRO nos quatro lados, e essa sobra é o gesto
     * contemporâneo inteiro. Laje rente ao caixilho lê como caixa de vidro de
     * maquete; laje em balanço lê como arquitetura, porque é ela que protege o
     * vidro do sol e da chuva — e a sombra fina que ela projeta sobre o pano é o
     * que separa os dois planos.
     */
    bloco('escLaje', mParedeConcreto, [xEsc, yTetoEsc + 0.09, zEsc + 0.11], [LARG_ESC + 0.44, 0.18, PROF_ESC + 0.44])
    // O forro por dentro, um palmo abaixo da laje: é onde os trilhos de luz se
    // prendem, e é ele que devolve o quente para o teto.
    bloco('escForro', mEscLuz, [xEsc, yTetoEsc - 0.05, zEsc], [LARG_ESC - 0.2, 0.05, PROF_ESC - 0.2])

    /**
     * O PAINEL ACESO DO FUNDO. É a maior superfície do escritório e a única cuja
     * função é luz, não objeto: ele é o que se vê primeiro do outro lado do
     * quadro, e é contra ele que a estante e a cadeira viram silhueta legível.
     *
     * Fica 8 cm à frente da parede para o móvel não brigar com ele no z-fighting,
     * e não chega ao teto nem ao piso — uma faixa escura em cima e outra embaixo
     * são o que impedem o painel de ler como adesivo colado na parede.
     */
    // Ele cobre só a METADE DIREITA, atrás da mesa. Na esquerda quem está contra
    // a parede é a estante, e um painel aceso por trás dela só acenderia madeira
    // maciça — o mesmo erro que o nicho do bar teve na primeira tentativa.
    bloco('escPainel', mEscLuz, [xEsc + 1.35, piso + 1.62, zFundoEsc + 0.06], [3.0, 2.2, 0.04])

    /**
     * A ESTANTE, e ela ocupa a METADE ESQUERDA porque é o que a referência faz:
     * massa densa e colorida de um lado, mesa e vazio do outro. Estante centrada
     * dividiria o escritório em dois iguais, e dois iguais não têm hierarquia.
     */
    const xEstante = xEsc - 1.55
    const LARG_ESTANTE = 2.4
    /**
     * A CARCAÇA É FUNDO E LATERAIS, e não uma caixa cheia — e este é o mesmo erro
     * que o nicho do bar acabou de me custar um render, nesta mesma entrega.
     *
     * A primeira versão era um bloco de 2,40 × 2,06 × 0,34 em madeira escura, com
     * as prateleiras 2 cm ATRÁS da face dele. Resultado: a caixa maciça cobriu as
     * quatro prateleiras e as 52 lombadas, e o que apareceu no render foi um
     * painel de madeira liso onde deveria estar a coisa mais rica do interior.
     *
     * A regra que sai daqui vale para os três móveis desta cena: peça que CONTÉM
     * outra nunca é um sólido. Ela é a casca — fundo e laterais — e tudo que ela
     * mostra vive À FRENTE dessa casca, nunca dentro do volume dela.
     */
    bloco('escEstanteFundo', mMadeiraEscura, [xEstante, piso + 1.05, zFundoEsc + 0.04], [LARG_ESTANTE, 2.06, 0.05])
    for (const s of [-1, 1])
      bloco('escEstanteFundo', mMadeiraEscura, [xEstante + s * (LARG_ESTANTE / 2 - 0.03), piso + 1.05, zFundoEsc + 0.21], [0.06, 2.06, 0.38])
    for (const [p, y] of [0.52, 0.94, 1.36, 1.78].entries()) {
      bloco('escPrateleira', mMadeiraEscura, [xEstante, piso + y, zFundoEsc + 0.22], [LARG_ESTANTE - 0.08, 0.035, 0.34])
      /**
       * OS LIVROS SÃO A RIQUEZA, e são baratos: uma caixa por lombada, todas com
       * a mesma geometria, variando só em escala e cor pela matriz e pelo
       * `instanceColor`. Trinta e duas lombadas custam trinta e duas matrizes.
       *
       * A altura varia, e um em cada sete fica DEITADO sobre a pilha. É o detalhe
       * que separa estante de gente de estante de vitrine: ninguém mantém uma
       * prateleira perfeitamente alinhada, e o olho reconhece a diferença sem
       * conseguir nomeá-la.
       */
      for (let l = 0; l < 13; l++) {
        const x = xEstante - LARG_ESTANTE / 2 + 0.12 + l * 0.175
        const alto = 0.2 + ruido(l, 610 + p) * 0.1
        const deitado = ruido(l, 620 + p) > 0.86
        col.poe(
          'escLivro',
          gLivro,
          mEscParede,
          [x, piso + y + (deitado ? 0.045 : alto / 2 + 0.018), zFundoEsc + 0.24],
          deitado ? [0, 0, Math.PI / 2] : [0, 0, 0],
          deitado ? [1, 2.6, 1] : [0.8 + ruido(l, 630 + p) * 0.9, alto, 1],
          TONS_DE_LIVRO[(l * 3 + p * 5) % TONS_DE_LIVRO.length]!,
        )
      }
    }

    /**
     * A MESA fica à FRENTE, quase encostada no vidro, e não contra a parede.
     * Mesa no fundo desapareceria atrás do painel aceso; na frente ela recorta
     * contra o painel, e é esse recorte que faz o interior ter PROFUNDIDADE em
     * vez de ser uma parede iluminada com coisas pintadas.
     */
    const xMesa = xEsc + 1.35
    const zMesa = zEsc + 0.34
    bloco('escMesa', mMadeiraEscura, [xMesa, piso + 0.73, zMesa], [1.96, 0.055, 0.78])
    // Duas laterais cheias em vez de quatro pernas finas: é o desenho de mesa de
    // arquiteto, e quatro cilindros de 3 cm a 18 m não sobrevivem a um pixel.
    for (const s of [-1, 1])
      bloco('escMesa', mMadeiraEscura, [xMesa + s * 0.88, piso + 0.36, zMesa], [0.08, 0.72, 0.7])
    col.poe('escMonitorBase', gBaseMonitor, mCaixilho, [xMesa - 0.15, piso + 0.765, zMesa - 0.18])
    col.poe('escMonitorPe', gPeMonitor, mCaixilho, [xMesa - 0.15, piso + 0.83, zMesa - 0.18])
    col.poe('escMonitor', gMonitor, mCaixilho, [xMesa - 0.15, piso + 1.07, zMesa - 0.18])
    // A TELA acesa, 1 cm à frente da carcaça e virada para a câmera. É o objeto
    // mais quente do interior e o que diz que alguém trabalha ali agora.
    col.poe('escTela', gPlanoEsc, mTela, [xMesa - 0.15, piso + 1.07, zMesa - 0.169], [0, 0, 0], [0.54, 0.31, 1])
    // Papel e caneca sobre o tampo: duas caixas minúsculas que custam nada e são
    // a diferença entre mesa MOBILIADA e mesa de catálogo.
    bloco('escPapel', mEscParede, [xMesa + 0.52, piso + 0.762, zMesa + 0.1], [0.26, 0.008, 0.2])
    bloco('escPapel', mEscParede, [xMesa + 0.66, piso + 0.8, zMesa - 0.06], [0.08, 0.1, 0.08])
    /**
     * O TECLADO era o que faltava para a mesa fazer sentido.
     *
     * Monitor soziho sobre um tampo vazio não lê como posto de trabalho — lê como
     * monitor exposto. O teclado é a peça que declara que alguém SENTA ali, e é
     * também o que amarra a cadeira à mesa: sem ele, a cadeira afastada e torta
     * podia estar de frente para qualquer coisa.
     */
    bloco('escTeclado', mCaixilho, [xMesa - 0.15, piso + 0.765, zMesa + 0.18], [0.44, 0.016, 0.15])
    /**
     * LUMINÁRIA DE MESA, e ela é a terceira temperatura de luz do interior.
     *
     * Já há a cornija na parede (difusa e ampla) e os três pendentes (pontuais e
     * altos). Falta a luz de TAREFA — a que fica na altura do tampo e é a única
     * que uma pessoa acende porque precisa, não porque o ambiente pede. É o
     * detalhe que separa "sala iluminada" de "alguém trabalhando".
     */
    col.poe('escHasteAbajur', gFioLum, mCaixilho, [xMesa + 0.72, piso + 0.92, zMesa - 0.22], [0, 0, 0], [3, 0.3, 3])
    col.poe('escAbajur', gLuminaria, mLuminaria, [xMesa + 0.72, piso + 1.08, zMesa - 0.22], [Math.PI, 0, 0], [0.7, 0.7, 0.7])

    /**
     * A CADEIRA fica À FRENTE da mesa e girada, não empurrada para dentro dela.
     * Cadeira encostada lê como ninguém estar ali; cadeira afastada e torta lê
     * como alguém que acabou de se levantar — a mesma regra da toalha caída na
     * espreguiçadeira e do carrinho de serviço no datacenter.
     */
    const xCad = xEsc + 0.62
    const zCad = zEsc + 0.72
    const giroCad = 0.55
    col.poe('escEstrela', gEstrelaCad, mCaixilho, [xCad, piso + 0.08, zCad], [0, giroCad, 0])
    col.poe('escColuna', gColunaCad, mCaixilho, [xCad, piso + 0.26, zCad])
    col.poe('escAssento', gAssentoCad, mEstofado, [xCad, piso + 0.43, zCad], [0, giroCad, 0])
    col.poe(
      'escEncosto',
      gEncostoCad,
      mEstofado,
      [xCad - Math.cos(giroCad) * 0.2, piso + 0.73, zCad + Math.sin(giroCad) * 0.2],
      [0.1, giroCad, 0],
    )
    /**
     * OS BRAÇOS, e eles são o que a cadeira precisava para deixar de ser um
     * BLOCO ESCURO.
     *
     * No zoom ela lia como duas chapas pretas: assento e encosto, ambos maciços,
     * ambos do mesmo material, nenhum vazio entre eles. O braço é a peça que
     * introduz um VÃO na silhueta — o retângulo de parede acesa que passa a
     * aparecer entre o braço e o assento é o que faz o olho ler três volumes em
     * vez de uma mancha.
     *
     * Ficam no metal do caixilho e não no estofado: cadeira de escritório tem
     * braço de estrutura, e a diferença de material é a segunda coisa que separa
     * as partes.
     */
    for (const lado of [-1, 1]) {
      const dx = Math.cos(giroCad) * lado * 0.25
      const dz = -Math.sin(giroCad) * lado * 0.25
      bloco('escBracoCad', mCaixilho, [xCad + dx, piso + 0.61, zCad + dz + 0.04], [0.05, 0.03, 0.38])
      bloco('escApoioCad', mCaixilho, [xCad + dx, piso + 0.53, zCad + dz + 0.2], [0.04, 0.16, 0.04])
    }

    // Tapete: a mancha escura no chão que ancora o móvel. Sem ele a mesa e a
    // cadeira flutuam sobre uma tábua corrida uniforme.
    col.poe('escTapete', gPlanoEsc, mEscTapete, [xEsc + 0.9, piso + 0.065, zEsc + 0.2], [-Math.PI / 2, 0, 0], [3.0, 1.5, 1])
    /**
     * A PLANTA DE CANTO, e ela entra pela razão oposta à dos vasos que saíram do
     * deck.
     *
     * Lá fora, vaso no piso virou obstáculo entre a câmera e o que ela precisa
     * ver. Aqui dentro é o contrário: o canto direito do escritório é o único
     * pedaço do interior sem nada, e vazio atrás de vidro lê como sala
     * desocupada. Planta grande em vaso quadrado é o que todo escritório tem
     * naquele canto exato, e ela também quebra a horizontal contínua de estante,
     * mesa e tampo com uma massa VERTICAL.
     *
     * Vaso em CAIXA e não em torneado: é o vocabulário do resto do volume, que é
     * todo feito de planos retos.
     */
    const xPlanta = xEsc + 2.3
    const zPlanta = zEsc + 0.3
    bloco('escVaso', mCaixilho, [xPlanta, piso + 0.25, zPlanta], [0.38, 0.44, 0.38])
    bloco('escTerraVaso', mEscTapete, [xPlanta, piso + 0.47, zPlanta], [0.34, 0.02, 0.34])
    /**
     * Ela é ALTA e fica À FRENTE do painel, não no canto do fundo. No canto ela
     * recortava contra a parede acesa como uma mancha escura de meio metro e
     * sumia; à frente, ela cruza a luz e vira silhueta legível — que é o trabalho
     * que uma planta de interior faz num contraluz.
     *
     * Cinquenta folhas e não trinta: a 18 m da câmera, o vaso inteiro ocupa uns
     * quarenta pixels, e massa rala nessa escala vira poeira verde.
     */
    for (let f = 0; f < 50; f++) {
      const a = ruido(f, 720) * Math.PI * 2
      const r = Math.sqrt(ruido(f, 721)) * 0.34
      col.poe(
        'escFolhaPlanta',
        gFolhaLarga,
        // Sem vento: ela está DENTRO da caixa de vidro. Ver `mFolhaInterna`.
        mFolhaInterna,
        [xPlanta + Math.sin(a) * r, piso + 0.55 + ruido(f, 722) * 1.25, zPlanta + Math.cos(a) * r * 0.8],
        [ruido(f, 723) * 3, ruido(f, 724) * 6, ruido(f, 725) * 3],
        [1.5, 1.5, 1],
        TONS_DE_OLIVA[f % TONS_DE_OLIVA.length]!,
      )
    }
    /**
     * O QUADRO na faixa de parede à esquerda da estante. É a única superfície do
     * interior que pode carregar cor saturada em área — e é o objeto que diz que
     * a sala foi HABITADA por alguém com gosto, em vez de entregue pela
     * construtora.
     *
     * Moldura escura com tela clara dentro: dois blocos, e a moldura é o que faz
     * o conjunto ler como quadro em vez de mancha de tinta na parede.
     */
    /**
     * O QUADRO FICA SOBRE O PAINEL ACESO, e a primeira posição que eu escolhi
     * para ele era uma colisão.
     *
     * Eu o pus em `xEsc − 2,72` = −10,52, encostado na parede lateral. A estante
     * ocupa de −10,55 a −8,15: o quadro nascia DENTRO dela. Foi o mesmo descuido
     * da escada no meio da piscina — escolher a coordenada olhando para a parede
     * e não para o que já está encostado nela.
     *
     * A parede do fundo tem três faixas ocupadas: estante à esquerda, painel
     * aceso no meio-direita, planta no canto. O único lugar livre é ACIMA da
     * mesa, sobre o painel — e quadro pendurado numa parede iluminada é o que
     * todo escritório com cornija tem, porque é ali que a luz bate.
     *
     * Fica 4 cm à frente do painel: encostado, o z-buffer escolheria um por
     * pixel e a moldura piscaria.
     */
    const xQuadro = xEsc + 0.55
    bloco('escMoldura', mCaixilho, [xQuadro, piso + 1.95, zFundoEsc + 0.1], [0.72, 0.52, 0.035])
    bloco('escTela2', mEscTapete, [xQuadro, piso + 1.95, zFundoEsc + 0.12], [0.62, 0.42, 0.01])

    /**
     * TRÊS PENDENTES sobre a mesa, e eles são o motivo de o teto existir aqui.
     * Interior aceso só pelo fundo lê como caixa de luz; interior com PONTOS de
     * luz identificáveis lê como um lugar projetado. Cada um é um cone minúsculo
     * de material básico (fura o tone mapping) pendurado por um fio de 4 lados.
     */
    for (const dx of [-0.7, 0, 0.7]) {
      col.poe('escFio', gFioLum, mCaixilho, [xMesa + dx, yTetoEsc - 0.46, zMesa - 0.1], [0, 0, 0], [1, 0.82, 1])
      col.poe('escLuminaria', gLuminaria, mLuminaria, [xMesa + dx, yTetoEsc - 0.9, zMesa - 0.1])
    }

    /**
     * O CAIXILHO: montantes verticais a cada 1,45 m, mais travessa em cima e
     * embaixo. São eles que denunciam que ali existe vidro — o pano em si é
     * quase invisível de frente (está no bloco JSX, com 12% de opacidade), e sem
     * o caixilho o escritório leria como um buraco aberto na fachada.
     *
     * O montante do meio é mais largo: é o batente da PORTA. A cobertura precisa
     * ter por onde se chegar, e agora a chegada é esta folha de vidro em vez de
     * um prisma de concreto cego.
     */
    for (let m = 0; m <= 4; m++) {
      const x = xEsc - LARG_ESC / 2 + (m * LARG_ESC) / 4
      bloco('escCaixilho', mCaixilho, [x, piso + ALT_ESC / 2, zFrenteEsc], [m === 2 ? 0.12 : 0.07, ALT_ESC, 0.09])
    }
    bloco('escCaixilho', mCaixilho, [xEsc, piso + ALT_ESC - 0.05, zFrenteEsc], [LARG_ESC, 0.1, 0.09])
    bloco('escCaixilho', mCaixilho, [xEsc, piso + 0.05, zFrenteEsc], [LARG_ESC, 0.1, 0.09])
    // Puxador da porta: uma barra vertical no montante do meio. É o objeto que
    // transforma "pano de vidro" em "entrada".
    col.poe('escPuxador', gColunaCad, mMetal, [xEsc + 0.16, piso + 1.05, zFrenteEsc + 0.07], [0, 0, 0], [0.55, 3.4, 0.55])
    col.poe('arandela', gArandela, mAco, [xEsc + 2.3, yTetoEsc + 0.28, zFrenteEsc - 0.1])

    /**
     * A BAIA DO ESCRITÓRIO: a faixa de x onde o plantio NÃO entra.
     *
     * O primeiro render do escritório aceso mostrou o defeito inteiro de uma vez:
     * a caixa acendeu e não se via nada dentro dela. Estante, mesa, monitor e
     * cadeira estavam lá, atrás de gramínea de 1,3 m, moita de folha larga e
     * florada — os três estratos do canteiro correm de ponta a ponta da laje e
     * passam na frente do vidro. Eu tinha construído um interior caro e plantado
     * um arbusto em cima dele.
     *
     * Jardim de verdade não faz isso: onde há uma sala envidraçada, há PISO na
     * frente dela, porque é por ali que se entra. O canteiro contorna o volume.
     *
     * Meio metro de folga de cada lado, e não zero: planta encostada no caixilho
     * leria como mato crescido contra a janela em vez de canteiro que respeita o
     * edifício.
     */
    /**
     * AS DUAS REGRAS ANTIGAS — "nao planta na baia do escritorio" e "nao planta
     * atras do bar" — viraram uma so, e ela mora junto com as medidas do
     * pergolado: `foraDoJardim`.
     *
     * Elas eram RECORTES: o canteiro corria de ponta a ponta e dois trechos eram
     * apagados. Isso resolvia a oclusao e deixava o efeito colateral que o dono
     * viu — os pedacos que sobravam ALEM das construcoes continuavam la, sem
     * pertencer a nada.
     *
     * A regra nova e afirmativa em vez de subtrativa: o jardim E o vao entre as
     * duas construcoes. Fora dele nao ha planta porque ha edificio, e nao porque
     * alguem apagou.
     */

    /**
     * JUNTA DE DILATACAO na parede do fundo. Parede de concreto de 30 m sem
     * junta nao existe: ela racharia sozinha na primeira variacao de
     * temperatura. O sulco vertical a cada seis metros e a coisa mais simples
     * que transforma um plano liso em parede CONSTRUIDA, e e uma linha escura
     * por peca.
     */
    /**
     * A JUNTA NUNCA APARECEU, e a mesma medição do escritório explicou por quê:
     * ela estava em `zCanteiro − 1,55` = −11,65, e a face da parede está em
     * −11,25. Quarenta centímetros DENTRO do concreto. Este bloco desenhava cinco
     * peças que nenhum pixel do site jamais mostrou.
     *
     * Agora sai da mesma função que posiciona o fundo do escritório, um
     * centímetro à frente da face — que é como um sulco se apresenta.
     */
    for (let i = 0; i < 5; i++)
      col.poe('juntaParede', gJuntaParede, mJunta, [
        -12 + i * 6,
        piso + 1.6,
        zDaParedeDoAndar(zCentro, prof) + 0.01,
      ])
    // Torneira de jardim, rente a parede. Quem rega as jardineiras precisa dela,
    // e e o tipo de objeto que so existe em lugar que funciona.
    col.poe('torneiraJardim', gTorneiraJardim, mAco, [4.2, piso + 0.5, zCanteiro - 1.5], [0, 0, Math.PI / 2])

    /**
     * CHAPIM DO PARAPEITO: a pedra de arremate que corre no topo dele, sempre um
     * pouco mais larga que o muro. Nao e decoracao — e o que faz a agua pingar
     * longe da fachada em vez de escorrer por ela. Visualmente e a linha clara
     * que define a borda do terraco contra o ceu, e a faixa de concreto lisa do
     * pe do quadro precisava exatamente disso.
     */
    col.poe(
      'chapim',
      gChapim,
      mPedra,
      [0, piso + 0.375, 1.48],
      [0, 0, 0],
      [meiaLargura * 2, 1, 1],
    )

    /**
     * ═══ O JARDIM, REFEITO POR MASSA E PROFUNDIDADE ═══
     *
     * O DIAGNÓSTICO, e ele não era de detalhe de planta: era de MASSA. Havia
     * palmeira, gramínea, flor e folha larga — espécie não faltava. Faltava
     * volume, por três razões estruturais:
     *
     * 1. UMA PROFUNDIDADE SÓ. Tudo estava plantado em `zCanteiro`, numa linha.
     *    Jardim de verdade tem CAMADAS: o que está atrás aparece ENTRE o que
     *    está na frente, e é essa oclusão parcial que o olho lê como "tem mais
     *    planta lá dentro". Fileira única, por mais densa, lê como cenário
     *    pintado.
     *
     * 2. VÃOS. Sete jardineiras de 3,4 m espaçadas 3,8 deixavam 40 cm de parede
     *    nua entre cada par. Buraco no meio de canteiro é o que denuncia plantio
     *    decorativo — num projeto, planta cobre a calha inteira.
     *
     * 3. ALTURA DE UM PALMO SÓ. Gramínea de 1,1 m e mais nada entre ela e a
     *    parede de 3,2 m. Faltava o ESTRATO ARBUSTIVO, que preenche o meio e dá
     *    fundo escuro para a gramínea recortar contra.
     *
     * A correção é a estrutura clássica de bordadura, de trás para a frente:
     * FUNDO alto e cerrado, MEIO em textura fina, FRENTE baixa e derramando. É
     * assim que se planta um canteiro de verdade, e é assim que ele ganha
     * profundidade sem truque nenhum.
     */
    const zFundoVerde = zCanteiro - 0.75
    const zMeioVerde = zCanteiro
    const zFrenteVerde = zCanteiro + 0.8

    /**
     * A CALHA CORRE DE PONTA A PONTA — em DOIS trechos, e não num só.
     *
     * Ela era uma peça inteira de 30 m, e isso deixou de funcionar no instante em
     * que o escritório ocupou a baia: a calha tem 1,84 m de profundidade e o
     * volume envidraçado tem 2, então ela atravessava a caixa de lado a lado e
     * saía pelo fundo. Uma jardineira de aço passando por dentro de uma sala é o
     * tipo de erro que não se vê no código e é impossível não ver no render.
     *
     * Dois trechos que encostam nas laterais do escritório é o que uma obra faria
     * de verdade: a calha morre contra o edifício e recomeça do outro lado.
     */
    /**
     * A CALHA VOLTOU A SER UMA PECA SO — mas agora com o comprimento do VAO, e
     * nao da laje inteira.
     *
     * Ela ja foi uma peca de 30 m (atravessava o escritorio), depois dois trechos
     * que morriam nas laterais dele e seguiam ate as bordas. As duas versoes
     * partiam da mesma premissa errada: a de que o canteiro e do tamanho do
     * terraco. Ele e do tamanho do JARDIM, e o jardim mora entre as duas
     * construcoes.
     */
    col.poe(
      'jardineira',
      gJardineira,
      mCorten,
      [(X_PERGOLA_DE + X_PERGOLA_ATE) / 2, piso + 0.27, zCanteiro + 0.1],
      [0, 0, 0],
      [(X_PERGOLA_ATE - X_PERGOLA_DE) / 3.4, 1, 2.3],
    )
    sombra((X_PERGOLA_DE + X_PERGOLA_ATE) / 2, zCanteiro, X_PERGOLA_ATE - X_PERGOLA_DE + 1, 3.4)

    /**
     * ESTRATO DE FUNDO: o arbusto cerrado que vira PAREDE VERDE.
     *
     * É ele que resolve o problema principal, e o número é grosseiro de
     * propósito — 46 moitas de 26 folhas cobrindo os 30 m. Massa vegetal só lê
     * como massa quando não se vê o fim dela; qualquer economia aqui reabre o
     * buraco que este estrato existe para fechar.
     *
     * Altura entre 1,0 e 1,9 m, IRREGULAR. Sebe aparada teria altura constante —
     * mas isto não é sebe, é maciço informal, e o topo ondulado é a diferença.
     */
    for (let m = 0; m < 46; m++) {
      const xm = -meiaLargura + 0.6 + (m / 45) * (meiaLargura * 2 - 1.2)
      // O maciço do fundo passa POR DENTRO do escritório nesta faixa — ele vive
      // em zFundoVerde, que cai entre o fundo e a frente da caixa de vidro.
      if (foraDoJardim(xm)) continue
      const alturaMoita = 1.1 + ruido(m, 400) * 1.05
      const zm = zFundoVerde + (ruido(m, 401) - 0.5) * 0.5
      /**
       * A FOLHA DO MACICO PASSA A NASCER NUMA HASTE — e este era o ultimo
       * confete do jardim.
       *
       * As 44 folhas de cada moita estavam espalhadas num VOLUME esferico, cada
       * uma girada ao acaso nos tres eixos e sem nada que a ligasse a coisa
       * alguma. No zoom isso aparece exatamente como e: folhas largas boiando no
       * ar na frente da cascata.
       *
       * E o mesmo defeito que a copa da oliveira ja teve e ja resolveu — o
       * comentario do ramalhete esta a poucas linhas daqui. Folha nao flutua
       * distribuida num volume: ela nasce em sequencia ao longo de uma haste, e e
       * por isso que qualquer massa vegetal e feita de GRUMOS e nao de nuvem.
       *
       * Aqui a estrutura e de arbusto e nao de arvore, entao as hastes saem do
       * PE da moita e abrem para fora e para cima, em leque. Sete hastes de seis
       * folhas dao as mesmas 42 folhas de antes, agora organizadas.
       *
       * E a haste e DESENHADA. Sem ela o grumo continua desligado — foi ela que
       * resolveu a copa da oliveira, e e ela que resolve aqui.
       */
      const HASTES = 11
      for (let hs = 0; hs < HASTES; hs++) {
        const az = (hs / HASTES) * Math.PI * 2 + ruido(hs, 410 + m) * 0.9
        // Quanto mais deitada a haste, mais curta: e o desenho de um arbusto,
        // onde a haste central e a mais alta e as de fora se abrem e caem.
        const abre = 0.25 + ruido(hs, 411 + m) * 0.85
        const comp = alturaMoita * (0.95 - abre * 0.35)
        const pe: [number, number, number] = [
          xm + Math.sin(az) * 0.1,
          piso + 0.5,
          zm + Math.cos(az) * 0.08,
        ]
        // Direcao da haste: sobe e abre. O 0,7 em z achata o leque, porque a
        // moita e mais larga em x do que funda.
        const dir: [number, number, number] = [
          Math.sin(az) * Math.sin(abre),
          Math.cos(abre),
          Math.cos(az) * Math.sin(abre) * 0.7,
        ]
        col.poe(
          'hasteArbusto',
          gRaminho,
          mHasteArbusto,
          [pe[0] + dir[0] * comp * 0.5, pe[1] + dir[1] * comp * 0.5, pe[2] + dir[2] * comp * 0.5],
          [Math.cos(az) * abre, az, -Math.sin(az) * abre],
          [1.6, comp / 0.3, 1.6],
        )
        for (let f = 0; f < 9; f++) {
          // Ao LONGO da haste, e nao em volta dela. A primeira folha nasce a 22%
          // do pe: arbusto tem colo limpo, a folha nao comeca no chao.
          const u = 0.22 + (f / 9) * 0.86
          const g = m * 31 + hs * 7 + f
          col.poe(
            'folhaArbusto',
            gFolhaLarga,
            mFolhaLarga,
            [
              pe[0] + dir[0] * comp * u + (ruido(g, 412) - 0.5) * 0.11,
              pe[1] + dir[1] * comp * u + (ruido(g, 413) - 0.5) * 0.09,
              pe[2] + dir[2] * comp * u + (ruido(g, 414) - 0.5) * 0.11,
            ],
            // Segue o eixo da haste com dispersao, e o terceiro angulo e o
            // ROLAMENTO em torno do proprio peciolo — e ele que faz duas folhas
            // vizinhas pegarem luz diferente.
            [
              Math.cos(az) * abre + (ruido(g, 415) - 0.5) * 0.9,
              az + (ruido(g, 416) - 0.5) * 1.5,
              -Math.sin(az) * abre + (ruido(g, 417) - 0.5) * 1.2,
            ],
            (() => {
              const e = 0.85 + ruido(g, 418) * 0.6
              return [e, e, e] as [number, number, number]
            })(),
            TONS_DE_ARBUSTO[(f + hs + m) % TONS_DE_ARBUSTO.length]!,
          )
        }
      }
    }

    /**
     * PALMEIRAS, agora acima do estrato arbustivo. Cinco, em espaçamento
     * IRREGULAR — palmeira em passo constante lê como alameda, e alameda é
     * outro projeto.
     */
    /**
     * A COROA, REFEITA — dois defeitos, e o segundo era estrutural.
     *
     * 1. AS FRONDES NASCIAM ABAIXO DO TOPO. O ponto de fixação descia junto com
     *    o caimento (`3,34 − cai × 0,42`), então as mais tombadas brotavam meio
     *    metro abaixo da ponta do estipe e sobrava tronco pelado acima da
     *    folhagem. Em palmeira TODA fronde sai do MESMO ponto: a coroa, no ápice
     *    do estipe. O que varia é o ângulo com que ela cai dali — nunca a altura
     *    de onde sai.
     *
     * 2. O CAIMENTO ESTAVA AMARRADO AO AZIMUTE. Com `cai = 0,12 + (fr/14)·0,95`
     *    e `a = (fr/14)·2π`, a fronde descia progressivamente conforme se dava a
     *    volta na copa: uma escada em espiral, que é exatamente a falta de ordem
     *    que se vê. Numa palmeira o caimento depende da IDADE, não da direção —
     *    as novas ficam eretas no miolo, as velhas se abrem e tombam por fora,
     *    em todas as direções ao mesmo tempo.
     *
     * Então são duas COROAS concêntricas: uma interna de frondes jovens quase
     * verticais e uma externa de velhas tombadas, cada uma com o azimute
     * distribuído por igual e defasada da outra para as duas se entrelaçarem.
     *
     * E a posição virou trigonometria de verdade. A fronde tem 1,7 m e o plano é
     * CENTRADO, então o centro dela precisa ficar a meia-fronde do eixo na
     * direção em que ela aponta: alcance horizontal `R·cos(cai)`, queda
     * `R·sin(cai)`. Com o deslocamento fixo de antes, a metade de dentro
     * atravessava o tronco e saía pelo outro lado.
     */
    /**
     * TRES COROAS, CAIMENTO CONSTANTE EM CADA UMA, E CADA FRONDE EM ARCO.
     *
     * O dono apontou duas vezes que a coroa continuava sem ordem, e nas duas eu
     * tinha consertado a metade errada do problema. O que estava acontecendo:
     *
     * 1. EU AINDA SORTEAVA O CAIMENTO POR FRONDE. Duas frondes vizinhas, da
     *    mesma idade, caiam em angulos diferentes. Palmeira e o oposto disso — e
     *    a planta mais ORDENADA que existe. A coroa sai de um unico meristema no
     *    apice, uma fronde de cada vez, e todas as folhas da mesma idade estao
     *    na mesma fase de abertura. Cada geracao e um CONE limpo.
     *
     * 2. E, mesmo com o cone limpo, a fronde RETA fazia a copa ler como estrela.
     *    O caimento nao e um angulo: e uma curva. Por isso `saida` e `ponta` em
     *    vez de um `cai` so — a fronde deixa o capitel nesse angulo de saida e
     *    chega na ponta naquele outro, e o joelho entre os dois e o arco. Nas
     *    novas, saida e ponta sao ambas negativas: a lanca sobe e fica em pe no
     *    miolo. Nas velhas, a saida e quase horizontal e a ponta despenca.
     *
     * O azimute e distribuido por igual dentro de cada coroa e defasado entre
     * elas, para as tres se entrelacarem em vez de se alinharem em raio. A unica
     * variacao que sobra e ENTRE palmeiras (via `q`), porque duas vizinhas nao
     * estao no mesmo ponto do ciclo. Dentro de uma, a regularidade E o realismo.
     */
    const COROAS = [
      { n: 5, saida: -0.62, ponta: -0.16, fase: 0.0 },
      { n: 7, saida: -0.18, ponta: 0.52, fase: 0.45 },
      { n: 9, saida: 0.16, ponta: 1.04, fase: 0.19 },
    ] as const
    // A inclinacao do estipe e a mesma usada para achar o apice — se as duas
    // divergirem, a copa flutua ao lado do tronco.
    const INCLINA_ESTIPE: [number, number, number] = [0.05, 0, 0.04]
    const eixoDoEstipe = new THREE.Vector3(0, 1, 0).applyEuler(
      new THREE.Euler(...INCLINA_ESTIPE),
    )
    // 2,1 de meia-altura menos um palmo, para a coroa nascer DENTRO da madeira.
    const ATE_O_APICE = 1.98
    // `Vector3.toArray()` devolve `number[]`, e `poe` pede a tripla exata.
    const tri = (v: THREE.Vector3): [number, number, number] => [v.x, v.y, v.z]
    /**
     * TRÊS PALMEIRAS, NOS TRÊS APOIOS DO PERGOLADO.
     *
     * Eram quatro, em −11,8 / −0,4 / 5,6 / 11,2 — coordenadas herdadas de quando
     * o terraço era uma faixa contínua. Duas delas ficavam ATRÁS das construções
     * novas (o estipe some e só a copa aparece, boiando), e as duas do meio não
     * tinham relação com nada.
     *
     * Agora elas ficam sobre os três pontos em que o pergolado descarrega: a laje
     * do escritório, o poste do meio e a laje do bar. É a mesma sequência de
     * coordenadas que desenha a estrutura, e por isso o estipe sobe SEMPRE
     * alinhado com um elemento construído — que é o que faz uma alameda de
     * palmeiras ler como projeto e não como mata.
     *
     * O espaçamento vira 5,1 m, regular pela primeira vez. Antes ia de 5,6 a 11,4
     * entre vizinhas.
     */
    for (const [q, xp] of EIXOS_DA_ESTRUTURA.entries()) {
      const base: [number, number, number] = [xp, piso + 2.6, zFundoVerde]
      col.poe('estipe', gEstipe, mEstipe, base, INCLINA_ESTIPE)
      /**
       * O APICE E CALCULADO, NAO CHUTADO. O estipe e inclinado, entao o topo dele
       * nao fica sobre `xp`: anda 8 cm em x e 10 cm em z ao longo do eixo. Fixar
       * a coroa em `xp` era pouco para notar de relance e o bastante para a copa
       * parecer solta do tronco.
       */
      const noEixo = (t: number) =>
        eixoDoEstipe.clone().multiplyScalar(t).add(new THREE.Vector3(...base))
      const apice = noEixo(ATE_O_APICE)
      col.poe('capitel', gCapitel, mCapitel, tri(noEixo(ATE_O_APICE - 0.3)), INCLINA_ESTIPE)
      for (const c of COROAS)
        for (let fr = 0; fr < c.n; fr++) {
          const a = (fr / c.n) * Math.PI * 2 + c.fase + q
          const desvio = (ruido(q, 491) - 0.5) * 0.12
          const sa = Math.sin(a)
          const ca = Math.cos(a)
          /**
           * A rotacao e `[0, a − π/2, −cai]`, e a ordem Euler XYZ do three aplica
           * o Z primeiro: o plano tomba no proprio eixo longo e so depois gira
           * para o azimute. Sao dois passos limpos, e e por isso que o resultado
           * e simetrico — a versao anterior distribuia o caimento entre X e Z
           * conforme o azimute, o que torcia cada fronde de um jeito diferente.
           *
           * Com Z aplicado antes de Y, a normal do plano sai horizontal e
           * perpendicular ao raquis: a lamina fica em pe, que e como a fronde se
           * apresenta a uma camera de lado.
           */
          const anda = (cai: number, t: number, de: THREE.Vector3) =>
            de.clone().add(
              new THREE.Vector3(sa * Math.cos(cai), -Math.sin(cai), ca * Math.cos(cai))
                .multiplyScalar(t),
            )
          const cSaida = c.saida + desvio
          const cPonta = c.ponta + desvio
          const joelho = anda(cSaida, COMP_BASE, apice)
          col.poe(
            'fronde-base',
            gFrondeBase,
            mFronde,
            tri(anda(cSaida, COMP_BASE / 2, apice)),
            [0, a - Math.PI / 2, -cSaida],
          )
          col.poe(
            'fronde-ponta',
            gFrondePonta,
            mFronde,
            // Recuados 6 cm: os dois segmentos se encontram em angulos
            // diferentes, entao encostar ponta com ponta abriria uma cunha de um
            // lado do joelho. A sobreposicao curta fecha o cotovelo.
            tri(anda(cPonta, COMP_PONTA / 2 - 0.06, joelho)),
            [0, a - Math.PI / 2, -cPonta],
          )
        }
    }

    /**
     * ESTRATO DO MEIO: a gramínea, agora em faixa CORRIDA em vez de tufos
     * isolados. Vinte e dois tufos encostados cobrem os 30 m sem vão, e a lâmina
     * fina recorta contra o arbusto escuro que agora existe atrás dela — que era
     * exatamente o fundo que faltava para ela aparecer.
     */
    for (let c = 0; c < 22; c++) {
      const xc = -meiaLargura + 0.8 + (c / 21) * (meiaLargura * 2 - 1.6)
      // A gramínea chega a 1,3 m: era ela a que mais cobria o vidro.
      if (foraDoJardim(xc)) continue
      for (let b = 0; b < 76; b++) {
        const a = ruido(b, 420 + c) * Math.PI * 2
        const raio = ruido(b, 421 + c) * 0.34
        const alt = 0.5 + ruido(b, 422 + c) * 0.8
        const incl = 0.1 + ruido(b, 423 + c) * 0.78
        col.poe(
          'lamina',
          gLamina,
          mGramineaMat,
          [
            xc + Math.sin(a) * raio,
            piso + 0.52 + alt / 2,
            zMeioVerde + Math.cos(a) * raio * 0.6,
          ],
          [Math.cos(a) * incl, a, -Math.sin(a) * incl],
          [1, alt, 1],
          TONS_DE_GRAMINEA[(b + c) % TONS_DE_GRAMINEA.length]!,
        )
      }
    }

    /**
     * ESTRATO DA FRENTE: flor e planta pendente, derramando sobre a calha.
     *
     * A pendente quebra a LINHA DA CALHA — reta dura entre o piso e a massa
     * verde denuncia o canteiro como caixa —, e a flor é a única cor não-verde do
     * jardim. Jardim só de verde lê como massa por mais espécies que tenha,
     * porque o olho agrupa tudo no mesmo balde.
     */
    for (let c = 0; c < 26; c++) {
      const xc = -meiaLargura + 0.7 + (c / 25) * (meiaLargura * 2 - 1.4)
      if (foraDoJardim(xc)) continue
      for (let fl = 0; fl < 6; fl++) {
        const a = ruido(fl, 430 + c) * Math.PI * 2
        const r = ruido(fl, 431 + c) * 0.3
        col.poe(
          'flor',
          gFlor,
          mFlor,
          [
            xc + Math.sin(a) * r,
            piso + 0.66 + ruido(fl, 432 + c) * 0.52,
            zFrenteVerde - 0.35 + Math.cos(a) * r * 0.7,
          ],
          [0, ruido(fl, 433 + c) * 3, 0],
          (() => {
            const e = 0.5 + ruido(fl, 434 + c) * 0.6
            return [e, e * 0.7, e] as [number, number, number]
          })(),
          TONS_DE_FLOR[(fl + c) % TONS_DE_FLOR.length]!,
        )
      }
      const comp = 0.34 + ruido(c, 440) * 0.6
      col.poe(
        'pendente',
        gPendente,
        mFolha,
        [xc, piso + 0.5 - comp * 0.42, zFrenteVerde],
        [0.42 + ruido(c, 441) * 0.5, ruido(c, 442) * 3, 0],
        [1, comp / 0.42, 1],
        TONS_DE_OLIVA[c % TONS_DE_OLIVA.length]!,
      )
      for (let fo = 0; fo < 9; fo++)
        col.poe(
          'folhaLarga',
          gFolhaLarga,
          mFolhaLarga,
          [
            xc + (ruido(fo, 443 + c) - 0.5) * 0.24,
            piso + 0.48 - (fo / 6) * comp,
            zFrenteVerde + 0.06,
          ],
          [1.2, ruido(fo, 444 + c) * 3, ruido(fo, 445 + c) * 2],
          [0.8, 0.8, 0.8],
          TONS_DE_OLIVA[(fo + c) % TONS_DE_OLIVA.length]!,
        )
    }
    /**
    /**
     * A VEGETACAO DE PRIMEIRO PLANO SAIU — os dois vasos grandes de x = +-6,0,
     * com os 82 folhados e as pendentes de cada um, a pedido do dono.
     *
     * O argumento que estava escrito aqui era de ESCALA, e era correto: planta no
     * canteiro do fundo esta a 16,75 m da camera e ocupa 68 px; a mesma planta a
     * 6 m ocupa 150. Massa no primeiro plano compra profundidade que nenhuma
     * densidade no fundo compra, e vaso grande nas duas bordas emoldura o quadro.
     *
     * O que mudou foi o que existe para ser visto. Quando esse argumento foi
     * escrito, o terraco tinha deck, piscina e canteiro; hoje ele tem um
     * escritorio envidracado aceso na esquerda, um nicho de bar retroiluminado na
     * direita e uma cascata correndo a parede do fundo. A moldura deixou de
     * enquadrar e passou a TAPAR — e o dono pediu tres vezes seguidas para limpar
     * a frente dessas pecas.
     *
     * A profundidade nao se perde: quem faz o plano proximo agora e a propria
     * piscina, que avancou 2,28 m e ocupa a faixa inteira entre o canteiro e o
     * guarda-corpo.
     */

    /**
     * AS LUMINARIAS, e cada uma resolve uma area chapada especifica.
     *
     * BALIZADOR NO DECK: disco embutido rente a tabua, a cada 2,4 m. E o que
     * quebra a monotonia do piso — deck inteiro num valor so era um terco do
     * quadro sem informacao. Cada balizador acende um circulo de meio metro e
     * deixa o resto na penumbra, e e a alternancia que da textura ao chao.
     *
     * FACHO NA PAREDE DO FUNDO: e ali que a cena mais precisava. Depois que o
     * cenario de parallax saiu, a parede virou a MAIOR area lisa do quadro —
     * trinta metros de concreto num valor so. Sete fachos em leque transformam
     * esse plano numa sequencia de claro e escuro, que e exatamente o que
     * iluminacao de fachada faz na vida real e pela mesma razao.
     *
     * PORTA DA ESCADA ACESA: um retangulo quente no meio do concreto. E a unica
     * coisa da cena que diz que ha ALGUEM la dentro, e custa um plano.
     */
    for (let bz = 0; bz < 13; bz++) {
      const xb = -meiaLargura + 1.2 + bz * 2.4
      col.poe('balizador', gBalizador, mBalizador, [xb, piso + 0.028, zCentro + prof * 0.33])
    }
    /**
     * OS SETE FACHOS DE PAREDE SAÍRAM, E NO LUGAR DELES ENTRA UMA CASCATA.
     *
     * O argumento para os fachos continua verdadeiro: depois que o cenário de
     * parallax saiu, a parede virou a maior área lisa do quadro, e sete leques de
     * claro e escuro eram muito mais barato que qualquer outra coisa. O problema
     * é que eles resolvem o valor e não resolvem a ATENÇÃO — sete manchas iguais
     * espalhadas por trinta metros são um padrão, e padrão o olho descarta.
     *
     * A cascata resolve as duas de uma vez e ainda fecha um círculo com a
     * piscina: o terraço passa a ter água em dois estados (parada no chão,
     * correndo na parede) em vez de um adereço de iluminação.
     *
     * Aqui ficam só as PEÇAS SÓLIDAS — a soleira que derrama em cima e a calha
     * que recebe embaixo. O véu em si é transparente e vive no bloco JSX, pela
     * mesma razão do pano de vidro do escritório: `InstancedMesh` transparente é
     * ordenada como um objeto só, e este precisa ser desenhado depois da parede.
     */
    for (const [de, ate] of TRECHOS_DA_CASCATA(xEsc, LARG_ESC)) {
      const meio = (de + ate) / 2
      const larg = ate - de
      // Soleira: a pedra de onde a água transborda. Sem ela o véu nasce do nada
      // no meio do concreto — e é a linha de sombra embaixo dela que dá o degrau.
      bloco('soleiraCascata', mPedra, [meio, piso + 3.18, zParedeFundo + 0.09], [larg, 0.12, 0.26])
      // Calha: a bacia que recebe a queda. Ela fica atrás do maciço do fundo e
      // quase não aparece — mas água que desce e não chega a lugar nenhum lê como
      // projeção de vídeo, e o custo de dizer para onde ela vai é uma caixa.
      bloco('calhaCascata', mPedra, [meio, piso + 0.16, zParedeFundo + 0.22], [larg, 0.32, 0.5])
      bloco('aguaCalha', mAguaParada, [meio, piso + 0.29, zParedeFundo + 0.22], [larg - 0.1, 0.02, 0.42])
      /**
       * A FITA NA CALHA É A FONTE VISÍVEL da iluminação da cascata.
       *
       * O véu acende por emissivo no material dele (ver o bloco JSX), e emissivo
       * sozinho não tem de onde vir: a lâmina brilharia sem nenhuma peça na cena
       * justificando o brilho, que é o tipo de coisa que o olho estranha sem
       * saber nomear. A fita resolve isso por uma instância — ela fica no fundo
       * da calha, atrás da lâmina de água parada, e é ela que se lê como o ponto
       * de onde a luz sobe.
       *
       * Fica 4 cm ATRÁS do véu de propósito: à frente, ela apareceria como uma
       * linha acesa sobre a água em vez de por baixo dela.
       */
      col.poe(
        'fitaCascata',
        gFitaLed,
        mFitaAgua,
        [meio, piso + 0.24, zParedeFundo + 0.06],
        [0, 0, 0],
        [larg - 0.2, 1, 1],
      )
    }
    /**
     * O RETÂNGULO QUENTE DA PORTA SAIU, e não foi substituído por outro.
     *
     * Ele existia como o único sinal de que havia alguém do outro lado de um
     * concreto cego. Agora o outro lado é um escritório inteiro, visível, com
     * estante, mesa, tela acesa e três pendentes. Manter o adesivo quente por
     * cima disso seria um segundo sinal para o mesmo fato — e um plano opaco de
     * `MeshBasicMaterial` na frente do pano de vidro apagaria justamente o que
     * ele existia para sugerir.
     */
    /**
     * O DERRAME NO DECK: a mancha quente que o escritório joga na madeira. Sem
     * ela o interior fica aceso e o deck na frente continua na penumbra — e aí a
     * caixa de vidro lê como fotografia colada, não como fonte.
     *
     * A GEOMETRIA MUDOU JUNTO COM A TEXTURA, e ela é metade da correção.
     *
     * A peça antiga era um quadrado de 5,75 × 5,1 m CENTRADO a três metros à
     * frente do vidro — ou seja, ela começava 50 cm DENTRO do escritório e
     * terminava 4,5 m deck adentro, passando por baixo do guarda-corpo. A nova
     * encosta no pé do vidro (`zFrenteEsc`) e avança `ALCANCE` para a frente,
     * porque luz não começa antes da abertura de onde sai.
     *
     * A largura é a do pano MAIS a abertura do leque: um feixe que sai de uma
     * fenda se alarga, e `derrameDeVidro` já desenha as faixas abrindo — a
     * largura da peça precisa acompanhar, senão o leque bate numa borda reta.
     *
     * `gFacho` é um `PlaneGeometry(0,5 × 1,5)`, daí a divisão: tamanho variável
     * é escala de matriz sobre uma forma unitária, que é a regra do coletor.
     */
    {
      const ALCANCE = 3.1
      const largura = ESCRITORIO.largura * 1.35
      col.poe(
        'facho',
        gFacho,
        mFacho,
        [xEsc, piso + 0.028, zFrenteEsc + ALCANCE / 2],
        [-Math.PI / 2, 0, 0],
        [largura / 0.5, ALCANCE / 1.5, 1],
      )
    }
    // Fita de LED sob o tampo do bar: desenha a linha do movel no escuro.
    //
    // `xBar` E NAO O 9.0 QUE ESTAVA AQUI. O valor cravado era igual a `BAR.x`,
    // entao a fita estava no lugar certo — por coincidencia. Este arquivo ja
    // documenta quatro pecas atropeladas por literal desatualizado (o z da
    // escada da piscina duas vezes, os postes do pergolado, a largura da
    // lamina), e esta seria a quinta no dia em que o bar andasse um metro: a
    // fita ficaria acesa no vazio ao lado dele, e ninguem ligaria uma coisa a
    // outra.
    col.poe('fitaLed', gFitaLed, mFitaLed, [xBar, piso + 0.98, zBar + 0.36], [0, 0, 0], [4.4, 1, 1])
    /**
     * E ATRÁS DAS GARRAFAS: uma fita por prateleira. É o que faz um bar ler como
     * bar de noite.
     *
     * As alturas saem de `PRATELEIRAS_BAR` e não de uma lista própria. Elas JÁ
     * divergiram: quando o bar subiu para a altura do escritório as prateleiras
     * foram de três para quatro, e estas fitas ficaram em 0,62 / 1,12 / 1,60 —
     * as cotas antigas —, acendendo o vão entre uma prateleira e outra em vez da
     * prateleira. Número repetido é número que diverge.
     */
    for (const y of PRATELEIRAS_BAR)
      col.poe('fitaLed', gFitaLed, mFitaLed, [xBar, piso + y + 0.04, zBar - 1.56], [0, 0, 0], [4.2, 1, 1])

    /**
     * O BUXO APARADO SAIU — as cinco bolas verdes, a pedido do dono.
     *
     * O argumento a favor delas era bom e continua verdadeiro em tese: era a
     * única fileira da cena onde a regularidade É o efeito, a mão do projetista
     * contra a desordem do resto. O que mudou foi o entorno. Aquela faixa passou
     * a ter cascata na parede e piscina avançando até ela, e cinco esferas de
     * verde chapado em espaçamento de régua na frente de água correndo leem como
     * enfeite de vitrine, não como projeto.
     *
     * Vale registrar o que a remoção não é: não é "esferas são feias". É que
     * `gBuxo` é um icosaedro sólido de UM verde só, sem recorte, sem relevo e
     * sem variação — a única planta da cobertura que nunca recebeu o tratamento
     * que folha, fronde, casca e gramínea receberam. Ela sobreviveu por ser
     * pequena, e ficou devendo desde então.
     */

    /**
     * O AGAVE EM VASO SAIU TAMBEM — a ultima peca solta do piso do terraco.
     *
     * Ele entrou por CONTRASTE DE FORMA: o jardim era feito de duas texturas
     * macias (tufo de oliveira e chafariz de graminea) e faltava uma forma DURA.
     * O argumento valia enquanto o terraco fosse so jardim.
     *
     * Hoje a forma dura vem da arquitetura: caixilho do escritorio, montante do
     * nicho do bar, soleira da cascata, pedra da borda da piscina. Um vaso
     * pontual no meio do deck deixou de contrastar com alguma coisa e passou a
     * ser o que o dono chamou de jarro — objeto no caminho.
     *
     * Com ele saem os dois ultimos vasos do piso. O que sobra plantado na
     * cobertura esta todo NA CALHA de corten, que e onde planta de laje vive de
     * verdade: e ali que passa a impermeabilizacao e a irrigacao.
     */

    /**
     * A ESCADA DA PISCINA, e ela faz mais do que parece.
     *
     * Duas coisas. A primeira e semantica: piscina sem escada e espelho d'agua,
     * e espelho d'agua nao se entra. A escada e o objeto que declara que aquela
     * lamina e para USAR — muda o que a cobertura inteira diz.
     *
     * A segunda e de composicao: dois arcos de metal polido subindo acima da
     * linha d'agua sao a unica VERTICAL fina no meio de uma area que e toda
     * horizontal, e eles pegam o sol rasante num filete brilhante. E o acento
     * que a piscina nao tinha.
     */
    /**
     * O U INVERTIDO ESTAVA MONTADO ERRADO, e o zoom mostrou o que o quadro
     * inteiro escondia: dois arcos com um poste no MEIO de cada um e as quatro
     * pernas no ar.
     *
     * A causa é de leitura de geometria, a mesma da toalha que ficou em pé.
     * `gCorrimaoEscada` é um `TorusGeometry(0,18, …, π)` — meia rosca, ou seja um
     * arco de 36 cm de VÃO cujas duas pontas ficam em x ± 0,18 do centro dele. O
     * laço tratava `dx` como "qual dos dois corrimãos", e punha o poste no mesmo
     * x do centro do arco. Poste no centro de um arco não sustenta arco nenhum:
     * ele nasce no ponto mais alto e desce pelo vazio.
     *
     * Corrimão de piscina é UM tubo dobrado: sobe de dentro d'água, vira em meia
     * rosca e desce do outro lado. As pernas são as PONTAS do arco, não o centro
     * dele — então o poste vem de `RAIO_CORRIMAO`, e não de um número escolhido
     * à parte. Amarrado assim, ele não tem como desalinhar de novo se o raio
     * mudar.
     *
     * São dois corrimãos lado a lado, afastados 0,52 m: é por entre eles que se
     * desce. Um só seria um puxador; dois é uma escada.
     */
    /**
     * ═══ O ARCO ESTAVA NO PLANO ERRADO — a terceira vez que esta escada quebra ═══
     *
     * O comentário acima descreve a peça certa: "a perna de dentro do tanque
     * desce até o degrau submerso; a de fora morre na pedra da borda". O código
     * não fazia isso, e a razão é uma linha que não existia.
     *
     * `TorusGeometry` nasce no plano XY. Sem rotação, o arco de meia rosca abre
     * ao longo de X — ou seja, as duas pernas de um mesmo corrimão ficam LADO A
     * LADO no mesmo z, as duas dentro d'água. Com dois corrimãos, o que se
     * construía eram quatro postes enfileirados em x segurando dois arquinhos,
     * sem nenhuma relação com a borda da piscina. Não é uma escada: é uma
     * grade de 36 cm plantada na água.
     *
     * Corrimão de piscina atravessa a borda. O arco tem de abrir em Z, com uma
     * perna na pedra e outra submersa — é a TRAVESSIA que o torna uma entrada. O
     * giro de π/2 em Y é a peça que faltava, e com ele as pernas passam a ser
     * deslocadas em z, não em x.
     *
     * E POR ISSO AS DUAS PERNAS TÊM COMPRIMENTOS DIFERENTES. Com as duas dentro
     * d'água dava para usar um cilindro só; atravessando a borda, a de fora
     * precisa parar no topo da pedra (21 cm) e a de dentro precisa chegar ao
     * fundo (52 cm). Mesma geometria, escala de matriz diferente — que é a regra
     * do coletor: tamanho variável é escala, nunca geometria nova.
     */
    const RAIO_CORRIMAO = 0.18
    for (const dxCorrimao of [-0.26, 0.26]) {
      const xc = xDaEscada + dxCorrimao
      col.poe(
        'corrimaoEscada',
        gCorrimaoEscada,
        mMetal,
        [xc, piso + 0.3, zDaEscada],
        [0, Math.PI / 2, 0],
      )
      for (const [lado, comprimento, centro] of [
        // Dentro do tanque (−z): desce os 52 cm inteiros até o piso do tanque.
        [-1, 1, piso + 0.04],
        // Sobre a pedra (+z): 21 cm, do fim do arco ao topo da borda. Ela é
        // curta porque a pedra está 30 cm acima do fundo — perna igual à outra
        // atravessaria a borda e sairia por baixo dela.
        [1, 0.404, piso + 0.195],
      ] as const)
        col.poe(
          'hasteEscada',
          gHasteEscada,
          mMetal,
          [xc, centro, zDaEscada + lado * RAIO_CORRIMAO],
          [0, 0, 0],
          [1, comprimento, 1],
        )
    }
    // Degrau submerso: a prateleira rasa que toda piscina tem na entrada. Vista
    // atraves da agua ela desenha uma faixa mais clara no fundo escuro, e e essa
    // faixa que da PROFUNDIDADE — fundo de cor uniforme le como chapa pintada.
    col.poe('degrauSubmerso', gDegrauSubmerso, mPedra, [xDaEscada, piso - 0.08, zDaEscada - 0.3])

    /**
     * ═══ A BORDA DE ACABAMENTO DA PISCINA ═══
     *
     * Quatro peças, e não uma caixa: a moldura precisa ter espessura visível nos
     * quatro lados, e uma caixa só mostra o lado de fora. Ela sobe 1 cm ACIMA da
     * lâmina, e é esse degrau que diz que a água está CONTIDA — sem ele a lâmina
     * lê como poça sobre o deck. (Já engoliu a água uma vez, quando o topo ficou
     * 2,5 cm acima do plano d'água e o que se via era uma laje branca.)
     *
     * Vieram do JSX, onde eram quatro `<mesh>` com material declarado na linha e
     * sem mapa nenhum. Aqui ganham `mPedra` — a mesma cor que já tinham, agora
     * com pedra, normal, rugosidade e microrrelevo triplanar — e viram UMA
     * chamada de desenho em vez de quatro.
     *
     * Tamanho por escala de matriz sobre `gCaixa`, que é a regra do coletor:
     * geometria unitária, variação na matriz.
     */
    for (const cz of [piscina.frente + 0.195, piscina.fundo - 0.195])
      col.poe('bordaPiscina', gCaixa, mPedraBorda, [piscina.x, piso + 0.045, cz], [0, 0, 0], [
        piscina.largura + 0.9,
        0.09,
        0.42,
      ])
    for (const bx of [piscina.x - piscina.bordaX, piscina.x + piscina.bordaX])
      col.poe('bordaPiscina', gCaixa, mPedraBorda, [bx, piso + 0.045, piscina.centro], [0, 0, 0], [
        0.42,
        0.09,
        piscina.profundidade + 0.39,
      ])

    // ── fechamento lateral ────────────────────────────────────────────────
    /**
     * TUDO DERIVADO, NENHUM LITERAL EM z. Esta é a quarta peça do arquivo que se
     * amarra à geometria da cobertura, e as três anteriores — o z da escada da
     * piscina, os postes do pergolado e a própria escada de novo — já foram
     * atropeladas por uma mudança de dimensão que ninguém lembrou de propagar.
     * A platibanda vai do fundo do deck até onde o guarda-corpo de vidro começa,
     * quaisquer que sejam `prof` e `zCentro`.
     */
    const zFundoDoDeck = zCentro - prof * 0.46
    const compDaPlatibanda = zGuarda - zFundoDoDeck
    const zDaPlatibanda = (zGuarda + zFundoDoDeck) / 2
    for (const lado of [-1, 1]) {
      // ASSIMETRIA, E ELA É A DECISÃO DO DONO: a direita sobe a 2,20 m como
      // empena de jardim vertical; a esquerda fica na mureta de 1,10 m porque
      // quem fecha aquele lado é o volume do núcleo, e duas massas altas
      // encostadas leriam como uma coisa só.
      const alto = lado > 0
      const altura = alto ? MURAL.altura : PLATIBANDA.altura
      const espessura = alto ? MURAL.espessura : PLATIBANDA.espessura
      // A face EXTERNA encosta na borda da laje, então o centro recua meia
      // espessura para dentro. Centrar em `meiaLargura` deixaria metade da
      // mureta flutuando fora do prédio.
      const xm = lado * (meiaLargura - espessura / 2)
      col.poe(
        'platibanda',
        gCaixa,
        mPlatibanda,
        [xm, piso + altura / 2, zDaPlatibanda],
        [0, 0, 0],
        [espessura, altura, compDaPlatibanda],
      )
      // O rufo AVANÇA 5 cm de cada lado da mureta: é o pingadeiro, a aba que
      // joga a água para fora em vez de deixá-la escorrer pela face. Sem a
      // sobra ele viraria uma tampa, que não é o que um rufo faz.
      col.poe(
        'rufo',
        gCaixa,
        mMetal,
        [xm, piso + altura + PLATIBANDA.rufo / 2, zDaPlatibanda],
        [0, 0, 0],
        [espessura + 0.1, PLATIBANDA.rufo, compDaPlatibanda],
      )
    }

    // ── mural verde ───────────────────────────────────────────────────────
    /**
     * A face INTERNA da empena direita, plantada. Tudo aqui vive a partir de
     * `xMural`, que é derivado da largura e da espessura — nenhum literal, pela
     * mesma razão da platibanda.
     */
    const xMural = meiaLargura - MURAL.espessura
    const colunas = Math.floor(compDaPlatibanda / MURAL.modulo)
    const linhas = Math.floor((MURAL.altura - 0.2) / MURAL.modulo)
    for (let c = 0; c < colunas; c++) {
      const zm = zFundoDoDeck + (c + 0.5) * MURAL.modulo
      for (let l = 0; l < linhas; l++) {
        const ym = piso + 0.12 + (l + 0.5) * MURAL.modulo
        // A BANDEJA DE CULTIVO, em corten. Ela avança 6 cm da parede porque é
        // uma caixa aparafusada nela, não um desenho: a sombra dessa saliência
        // é o que desenha a grade quando a luz rasante bate.
        col.poe(
          'bandejaMural',
          gCaixa,
          mCorten,
          [xMural - 0.03, ym, zm],
          [0, 0, 0],
          [0.06, MURAL.modulo - 0.03, MURAL.modulo - 0.03],
        )
        /**
         * SEIS FOLHAS POR MÓDULO, NA MESMA CHAVE DA FOLHAGEM DO JARDIM.
         *
         * `folhaLarga` já existe como instância; reusar a chave põe estas
         * folhas na MESMA malha instanciada e custa ZERO chamada de desenho
         * nova. É exatamente para isto que o coletor existe, e é o que torna
         * um mural de várias centenas de folhas gratuito num orçamento que é
         * contado em chamadas.
         *
         * Giradas para fora da parede (eixo Y) e caídas para baixo (eixo Z):
         * folha de jardim vertical PENDE, porque cresce contra a gravidade a
         * partir de uma bandeja vertical. Sem a queda elas leriam como
         * espetadas na parede.
         */
        for (let f = 0; f < 6; f++) {
          const s = 300 + c * 7 + l
          col.poe(
            'folhaLarga',
            gFolhaLarga,
            mFolhaLarga,
            [
              xMural - 0.1 - ruido(f, s) * 0.12,
              ym + (ruido(f, s + 1) - 0.5) * MURAL.modulo * 0.8,
              zm + (ruido(f, s + 2) - 0.5) * MURAL.modulo * 0.8,
            ],
            [ruido(f, s + 3) * 1.2 - 0.6, Math.PI / 2 + (ruido(f, s + 4) - 0.5) * 1.4, -0.7 - ruido(f, s + 5) * 0.8],
            [0.95, 0.95, 0.95],
            TONS_DE_OLIVA[(f + c + l) % TONS_DE_OLIVA.length]!,
          )
        }
      }
    }
    /**
     * A LINHA DE GOTEJAMENTO no topo, e ela é o detalhe que ninguém nota e todo
     * mundo sente. Jardim vertical sem irrigação não existe — a planta morre em
     * três dias. Um tubo de 2 cm correndo a empena inteira custa uma chamada e
     * transforma "parede com folhas" em "instalação".
     */
    col.poe(
      'gotejamento',
      gCaixa,
      mAco,
      [xMural - 0.06, piso + MURAL.altura - 0.12, zDaPlatibanda],
      [0, 0, 0],
      [0.022, 0.022, compDaPlatibanda],
    )
    /**
     * LUZ RASANTE PELA BASE, e é ela que decide se isto lê como jardim ou como
     * tapete verde. Luz frontal achata a folhagem numa mancha; rasante pega o
     * relevo folha a folha e devolve a profundidade da massa.
     *
     * Reusa `mFitaLed`, a mesma fita âmbar do balcão do bar — e a repetição é
     * deliberada: as duas instalações são do mesmo lado do terraço e do mesmo
     * projeto de iluminação. Fita de cor diferente aqui leria como dois
     * projetos brigando.
     */
    col.poe(
      'fitaMural',
      gCaixa,
      mFitaLed,
      [xMural - 0.1, piso + 0.06, zDaPlatibanda],
      [0, 0, 0],
      [0.03, 0.03, compDaPlatibanda - 0.3],
    )

    // ── núcleo de circulação ──────────────────────────────────────────────
    // Encostado na platibanda esquerda e alinhado pela FRENTE com o escritório:
    // os dois volumes construídos da ponta esquerda dividem o mesmo plano, que
    // é o que os faz ler como um conjunto em vez de duas caixas soltas.
    const xNucleo = -meiaLargura + PLATIBANDA.espessura + NUCLEO.largura / 2
    const zFrenteNucleo = zFrenteEsc + NUCLEO.avanco
    const zNucleo = zFrenteNucleo - NUCLEO.profundidade / 2
    col.poe(
      'nucleo',
      gCaixa,
      mPlatibanda,
      [xNucleo, piso + NUCLEO.altura / 2, zNucleo],
      [0, 0, 0],
      [NUCLEO.largura, NUCLEO.altura, NUCLEO.profundidade],
    )
    // Rufo também no topo do núcleo — mesma peça, mesma razão.
    col.poe(
      'rufo',
      gCaixa,
      mMetal,
      [xNucleo, piso + NUCLEO.altura + PLATIBANDA.rufo / 2, zNucleo],
      [0, 0, 0],
      [NUCLEO.largura + 0.1, PLATIBANDA.rufo, NUCLEO.profundidade + 0.1],
    )

    // ── porta do elevador ─────────────────────────────────────────────────
    const zPortaElevador = zFrenteNucleo + 0.01
    const ALTURA_PORTA = 2.1
    const MEIA_FOLHA = 0.42
    /**
     * ═══ A FRESTA PRECISA SER UM VÃO, NÃO UM ESPAÇO ═══
     *
     * No primeiro render as duas folhas leram como uma porta só. Eu tinha
     * deixado 2 cm entre elas, e 2 cm a doze metros de distância é menos de um
     * pixel: o espaço existia na geometria e não existia na imagem.
     *
     * A correção não é afastar as folhas — porta de elevador fecha mesmo. É pôr
     * uma peça ESCURA no fundo da fresta. O que o olho reconhece à distância não
     * é o vão, é a linha vertical preta no meio de uma superfície clara, e essa
     * linha só aparece se houver algo escuro atrás para ela mostrar.
     */
    col.poe(
      'frestaElevador',
      gCaixa,
      mRaloFundo,
      [xNucleo, piso + ALTURA_PORTA / 2, zPortaElevador + 0.005],
      [0, 0, 0],
      [0.05, ALTURA_PORTA - 0.04, 0.02],
    )
    // Batente em três peças e não um quadro só: ombreira esquerda, direita e
    // verga. É assim que um batente existe, e as duas verticais são o que dá
    // prumo à porta contra a massa do núcleo.
    for (const s of [-1, 1])
      col.poe(
        'batenteElevador',
        gCaixa,
        mAco,
        [xNucleo + s * (MEIA_FOLHA + 0.06), piso + ALTURA_PORTA / 2, zPortaElevador],
        [0, 0, 0],
        [0.12, ALTURA_PORTA + 0.12, 0.06],
      )
    col.poe(
      'batenteElevador',
      gCaixa,
      mAco,
      [xNucleo, piso + ALTURA_PORTA + 0.06, zPortaElevador],
      [0, 0, 0],
      [MEIA_FOLHA * 2 + 0.24, 0.12, 0.06],
    )
    // DUAS FOLHAS COM FRESTA NO MEIO. Porta de elevador de folha única não
    // existe neste tipo de prédio, e é a fresta central que a identifica à
    // distância — antes de qualquer detalhe, o olho lê a linha vertical.
    for (const s of [-1, 1])
      col.poe(
        'folhaElevador',
        gCaixa,
        mPortaElevador,
        [xNucleo + s * (MEIA_FOLHA / 2 + 0.01), piso + ALTURA_PORTA / 2, zPortaElevador + 0.02],
        [0, 0, 0],
        [MEIA_FOLHA, ALTURA_PORTA, 0.04],
      )
    /**
     * O INDICADOR DE ANDAR, e ele é mais importante do que o tamanho sugere.
     *
     * É a única fonte acesa da ponta esquerda do quadro — hoje aquele canto não
     * tem nenhuma, enquanto o bar tem nicho, fita e prateleira. Uma fonte
     * pequena ali equilibra a noite sem acrescentar iluminação de cena nenhuma.
     *
     * Ganho 1,9 e não o 3,0 do balizador: pela regra de área, fonte pequena
     * aguenta ganho alto — mas isto é um display, não uma lâmpada, e display que
     * floresce como lâmpada é o erro que ninguém sabe nomear e todo mundo sente.
     * Mesmo raciocínio do monitor do escritório.
     */
    /**
     * A MOLDURA ESCURA VEM ANTES DO DISPLAY, e sem ela ele não é um display.
     *
     * No primeiro render o indicador era um ponto azul solto na parede — lia
     * como uma luz perdida, não como equipamento. O que faz um display parecer
     * display é a BORDA PRETA em volta: todo painel tem caixa, e é o contraste
     * entre a caixa escura e a tela acesa que o olho reconhece. Aceso sobre
     * concreto, sem caixa, vira mancha.
     */
    const yIndicador = piso + ALTURA_PORTA + 0.32
    col.poe(
      'caixaIndicador',
      gCaixa,
      mRaloFundo,
      [xNucleo, yIndicador, zPortaElevador + 0.02],
      [0, 0, 0],
      [0.46, 0.2, 0.03],
    )
    col.poe(
      'indicadorElevador',
      gCaixa,
      mIndicador,
      [xNucleo, yIndicador, zPortaElevador + 0.04],
      [0, 0, 0],
      [0.38, 0.12, 0.02],
    )

    // ── arandela e botoeira do núcleo ─────────────────────────────────────
    /**
     * A FACE DO NÚCLEO ESTAVA CHAPADA: uma massa escura de 3,4 por 3,5 m com uma
     * porta pequena no meio e nada mais. Lobby de elevador é sempre iluminado —
     * é onde se espera parado, de noite, e nenhum prédio deixa isso no escuro.
     *
     * A arandela resolve duas coisas com uma peça. Ela quebra a parede, e ilumina
     * de quebra o balcão da recepção logo abaixo, que até agora dependia só da
     * própria luminária de tampo.
     *
     * A BOTOEIRA é o outro lado da mesma ideia: elevador sem botão de chamada é
     * cenário. Ela é minúscula — 10 por 16 cm — e é justamente por isso que
     * funciona, porque o que o olho reconhece não é o objeto, é a PLACA ESCURA
     * com um ponto aceso na altura da mão.
     */
    const xArandela = xNucleo + 1.15
    const yArandela = piso + 2.55
    col.poe('arandela', gArandela, mAco, [xArandela, yArandela, zPortaElevador + 0.05])
    col.poe(
      'lampadaArandela',
      gCaixa,
      mLuminaria,
      [xArandela, yArandela - 0.05, zPortaElevador + 0.06],
      [0, 0, 0],
      [0.2, 0.02, 0.085],
    )
    // Meia volta no eixo Z: o facho do espeto abre para CIMA, este abre para
    // BAIXO. Ver `mLavagemNucleo`.
    col.poe(
      'lavagemNucleo',
      gFacho,
      mLavagemNucleo,
      [xArandela, yArandela - 0.95, zPortaElevador + 0.02],
      [0, 0, Math.PI],
      [1.9, 1.25, 1],
    )
    // Altura da mão, ao lado do batente. Placa escura primeiro, ponto aceso
    // depois — a mesma ordem do indicador de andar, e pela mesma razão.
    col.poe(
      'botoeira',
      gCaixa,
      mRaloFundo,
      [xNucleo + 0.66, piso + 1.05, zPortaElevador + 0.02],
      [0, 0, 0],
      [0.1, 0.16, 0.02],
    )
    col.poe(
      'luzBotoeira',
      gCaixa,
      mIndicador,
      [xNucleo + 0.66, piso + 1.08, zPortaElevador + 0.035],
      [0, 0, 0],
      [0.04, 0.04, 0.01],
    )

    // ── mesas do bar ──────────────────────────────────────────────────────
    /**
     * ═══ DUAS ALTURAS, E É ISSO QUE SEPARA ESTAR DE COMER ═══
     *
     * Mesa alta encostada no bar é EXTENSÃO DO BALCÃO: quem senta ali está a
     * meio caminho de estar em pé, e é a postura de quem toma uma coisa rápida.
     * Mesa baixa mais à frente é ESTAR: quem senta ali fica.
     *
     * Uma fileira de mesas todas iguais leria como refeitório — e refeitório é
     * exatamente o que um terraço não é. A diferença de altura, mais o
     * afastamento, é o que desenha duas zonas num deck vazio sem precisar de
     * divisória nenhuma.
     *
     * ANCORADAS EM `zBar` E EM `X_FIM_DO_BAR`, nunca em literal: é a quinta peça
     * do arquivo a se amarrar à geometria do terraço, e as quatro anteriores
     * foram todas atropeladas por uma mudança de dimensão.
     */
    /**
     * AVANÇARAM 1,3 m DEPOIS DO PRIMEIRO RENDER. Encostadas no bar elas caíam na
     * faixa mais escura e mais comprimida do deck — apareciam como dois riscos
     * verticais e nada mais. Trazidas para a frente, ganham tamanho em tela e
     * caem perto dos balizadores, que é a única luz que aquele trecho tem.
     */
    /**
     * ANCORADAS EM `BAR.x` E NÃO EM `X_FIM_DO_BAR`, e a troca veio de olhar o
     * render. Amarradas ao FIM do bar elas caíam na ponta direita do quadro,
     * metade fora dele e encostadas no mural — leram como móvel encostado na
     * parede, não como área de estar. "Em frente ao bar" é em frente ao MEIO
     * dele, que é onde o balcão serve e para onde as banquetas olham.
     */
    const MESAS = [
      { x: BAR.x - 1.6, z: zBar + 3.2, alta: true },
      { x: BAR.x + 1.4, z: zBar + 3.6, alta: true },
      { x: BAR.x - 0.8, z: zBar + 5.6, alta: false },
      { x: BAR.x + 2.8, z: zBar + 6.0, alta: false },
    ]
    for (const [m, mesa] of MESAS.entries()) {
      const h = mesa.alta ? 1.0 : 0.74
      const r = mesa.alta ? 0.36 : 0.44
      // Tampo, coluna e base — as três peças de uma mesa de pedestal. Sem a
      // base larga ela cairia, e o olho sabe disso: mesa de pedestal sem pé
      // largo lê como objeto flutuando.
      /**
       * TAMPO EM PEDRA CLARA, e a escolha é de leitura antes de ser de material.
       *
       * Primeiro render com tampo de madeira escura: as quatro mesas sumiram.
       * Madeira escura sobre deck escuro, à noite, é a mesma coisa duas vezes —
       * e o tampo é justamente a única superfície da mesa que a câmera vê de
       * cima, ou seja, o único lugar onde ela poderia aparecer.
       *
       * Clara, cada mesa vira um disco que se destaca do piso. E é a MESMA
       * pedra do balcão do bar e do tampo da recepção: as três superfícies de
       * apoio do terraço passam a falar a mesma língua, o que é o que amarra o
       * mobiliário como um projeto em vez de três compras.
       */
      col.poe('tampoMesa', gCilindro, mPedra, [mesa.x, piso + h, mesa.z], [0, 0, 0], [
        r,
        0.045,
        r,
      ])
      col.poe('colunaMesa', gCilindro, mMetal, [mesa.x, piso + h / 2, mesa.z], [0, 0, 0], [
        0.045,
        h,
        0.045,
      ])
      col.poe('baseMesa', gCilindro, mMetal, [mesa.x, piso + 0.018, mesa.z], [0, 0, 0], [
        r * 0.82,
        0.036,
        r * 0.82,
      ])
      /**
       * ═══ O QUE ESTÁ EM CIMA DA MESA ═══
       *
       * Mesa vazia é mesa de catálogo. O que separa um render de uma fotografia
       * não é resolução nem iluminação — é o VESTÍGIO: o copo que alguém deixou,
       * a vela acesa, a toalha dobrada na espreguiçadeira. São as coisas que
       * ninguém desenha de propósito e que toda foto de lugar de verdade tem.
       *
       * A LANTERNA É A PEÇA QUE MAIS PAGA, e não por ser objeto: é uma fonte
       * ACESA na altura do tampo, numa faixa do quadro que hoje só tem
       * balizadores rasos no chão. Quatro pontos quentes ali desenham a área de
       * mesas no escuro, que é o que uma área de mesas ao ar livre faz de noite.
       *
       * O COPO SÓ EM DUAS DAS QUATRO. Em todas viraria padrão de novo; em
       * nenhuma, o terraço fica estéril. Duas lê como "estas estavam ocupadas,
       * aquelas não" — que é o que uma foto pega por acaso e um render tem de
       * decidir.
       */
      col.poe('lanterna', gCilindro, mVidroGarrafa, [mesa.x, piso + h + 0.09, mesa.z], [0, 0, 0], [
        0.05,
        0.13,
        0.05,
      ])
      // A chama entra na chave da luz da recepção — mesma geometria, mesmo
      // material — então as quatro custam zero chamada nova.
      col.poe(
        'luzRecepcao',
        gCaixa,
        mLuminaria,
        [mesa.x, piso + h + 0.07, mesa.z],
        [0, 0, 0],
        [0.035, 0.05, 0.035],
      )
      if (m % 2 === 0)
        for (const c of [0, 1])
          col.poe('copo', gCopo, mVidroGarrafa, [
            mesa.x + (c ? 0.17 : -0.14),
            piso + h + 0.08,
            mesa.z + (c ? -0.11 : 0.13),
          ])
      /**
       * DUAS SENTADAS POR MESA, EM DIAGONAL e não frente a frente.
       *
       * Cadeira alinhada no eixo da câmera some — vira uma linha. Em diagonal
       * cada uma mostra assento e encosto, e o conjunto lê como mesa ocupável
       * em vez de mesa de catálogo. O ângulo varia por mesa: quatro pares
       * idênticos denunciariam a cópia.
       */
      for (const s of [-1, 1]) {
        const a = 0.6 + m * 0.35 + (s < 0 ? Math.PI : 0)
        const d = r + 0.42
        const cx = mesa.x + Math.cos(a) * d
        const cz = mesa.z + Math.sin(a) * d
        if (mesa.alta) {
          // Banqueta alta: as MESMAS chaves do bar, então as banquetas novas
          // entram na malha instanciada que já existe — zero chamada nova.
          col.poe('banqueta', gAssentoBanqueta, mMadeiraEscura, [cx, piso + 0.76, cz])
          col.poe('pernaBanqueta', gPernaBanqueta, mMetal, [cx, piso + 0.38, cz])
          col.poe('aroBanqueta', gAroBanqueta, mMetal, [cx, piso + 0.22, cz], [Math.PI / 2, 0, 0])
        } else {
          // Cadeira de encosto, virada PARA a mesa.
          const giro = -a + Math.PI / 2
          col.poe('assentoCadeira', gCaixa, mMadeiraEscura, [cx, piso + 0.44, cz], [0, giro, 0], [
            0.44,
            0.05,
            0.44,
          ])
          /**
           * ═══ O ENCOSTO É O QUE FAZ UMA CADEIRA SER UMA CADEIRA ═══
           *
           * No render anterior elas liam como CAIXOTES. Duas causas, e as duas
           * são de proporção, não de detalhe:
           *
           * · O encosto era tão largo quanto fundo o assento (0,44 x 0,44) e
           *   colado nele. A doze metros o par fundia num cubo. Encosto de
           *   cadeira é mais ALTO que largo e nasce ACIMA do assento, com vão
           *   entre os dois — é esse vão que o olho usa para separar as duas
           *   peças mesmo quando não consegue mais resolvê-las.
           *
           * · Madeira escura sobre deck escuro à noite: a silhueta não existia.
           *   O encosto passa a `mMetal`, que é a peça que sobe e portanto a
           *   única que pega a luz do céu — estrutura metálica com assento de
           *   madeira, que é como cadeira de área externa é feita de verdade.
           */
          col.poe(
            'encostoCadeira',
            gCaixa,
            mMetal,
            [cx + Math.cos(a) * 0.19, piso + 0.76, cz + Math.sin(a) * 0.19],
            [0, giro, 0],
            [0.38, 0.42, 0.04],
          )
          for (const px of [-1, 1])
            for (const pz of [-1, 1]) {
              const ox = px * 0.18
              const oz = pz * 0.18
              col.poe(
                'pernaCadeira',
                gCaixa,
                mMetal,
                [
                  cx + ox * Math.cos(giro) - oz * Math.sin(giro),
                  piso + 0.21,
                  cz + ox * Math.sin(giro) + oz * Math.cos(giro),
                ],
                [0, giro, 0],
                [0.03, 0.42, 0.03],
              )
            }
        }
      }
    }

    // ── espreguiçadeiras e guarda-sol ─────────────────────────────────────
    /**
     * ═══ O TERÇO DE BAIXO DO QUADRO ERA DECK NU ═══
     *
     * Quarenta por cento da imagem — a faixa da frente inteira — eram réguas e
     * uma fileira de balizadores. E o problema não é "falta objeto": é que a
     * composição salta de vazio direto para o meio-campo, e toda fotografia de
     * arquitetura que impressiona tem TRÊS planos. Sem o da frente não há
     * escalonamento de profundidade, e sem escalonamento a imagem achata por
     * mais bem iluminada que esteja.
     *
     * E há o argumento mais simples: PISCINA SEM ESPREGUIÇADEIRA NÃO É PISCINA.
     * É espelho d'água. O que diz que aquela lâmina é para entrar não é a
     * escada nem a borda — é a cadeira virada para ela.
     *
     * POR QUE À ESQUERDA. A ponta direita já ganhou mesas, bar e mural; pôr a
     * área de piscina lá amontoaria tudo de um lado e deixaria o outro terço
     * vazio. À esquerda o deck está livre da piscina para fora, e o conjunto
     * fica ENTRE a câmera e a água — que é o que o torna primeiro plano de
     * verdade em vez de mais um objeto no meio-campo.
     *
     * TUDO DERIVADO DE `piscina.frente`: se a lâmina mudar de tamanho outra vez
     * — e ela já mudou duas —, o conjunto acompanha em vez de ficar plantado
     * dentro da água.
     */
    /**
     * ═══ ANCORADAS NA BORDA ESQUERDA DA LÂMINA, E NÃO EM x ABSOLUTO ═══
     *
     * A primeira tentativa usou −8,6 e −6,4, que na planta parecem o meio do
     * deck livre. No render as duas saíram coladas na margem esquerda e o
     * guarda-sol ficou INTEIRAMENTE fora do quadro.
     *
     * A causa é a própria razão de o conjunto existir: primeiro plano está mais
     * PERTO da câmera, e perto a escala em tela é maior. A lâmina, a dez metros,
     * rende uns 75 pixels por metro; este conjunto, a sete, rende uns 113. Cada
     * metro lateral empurra metade a mais para fora. Intuição de planta baixa
     * não vale no plano da frente — é preciso contar em pixels.
     *
     * Presas à borda da piscina, elas ficam onde ficariam de verdade (ao lado da
     * água, não a cinco metros dela) e sobrevivem a qualquer mudança futura da
     * lâmina, que já mudou duas vezes.
     */
    const xBordaEsquerda = piscina.x - piscina.largura / 2
    const zEspreg = piscina.frente + 1.15
    for (const [e, esp] of [
      { x: xBordaEsquerda - 2.4, giro: 0.2 },
      { x: xBordaEsquerda - 0.2, giro: -0.13 },
    ].entries()) {
      const g = esp.giro
      const cos = Math.cos(g)
      const sen = Math.sin(g)
      // Gira o deslocamento local junto com a peça: sem isto o encosto ficaria
      // no eixo do mundo e a espreguiçadeira sairia torta em vez de girada.
      const p = (dx: number, dy: number, dz: number): [number, number, number] => [
        esp.x + dx * cos - dz * sen,
        piso + dy,
        zEspreg + dx * sen + dz * cos,
      ]
      col.poe('estofadoEspreg', gCaixa, mAlmofada, p(0, 0.42, 0.1), [0, g, 0], [0.66, 0.09, 1.3])
      /**
       * O ENCOSTO RECLINADO, e a inclinação é o que identifica a peça.
       *
       * Espreguiçadeira com encosto vertical é cadeira; deitado, é cama. Os 52°
       * do meio são o que o olho lê como "para ficar ao sol" — e é a única
       * diagonal forte do primeiro plano, num quadro que é todo faixa
       * horizontal empilhada.
       */
      col.poe(
        'estofadoEspreg',
        gCaixa,
        mAlmofada,
        p(0, 0.72, -0.78),
        [-0.9, g, 0],
        [0.66, 0.78, 0.09],
      )
      // Pés: mesma chave das pernas de cadeira — gCaixa com mMetal já existe
      // como malha instanciada, então os oito pés custam zero chamada.
      for (const px of [-1, 1])
        for (const pz of [-1, 1])
          col.poe('pernaCadeira', gCaixa, mMetal, p(px * 0.26, 0.19, pz * 0.5), [0, g, 0], [
            0.035,
            0.38,
            0.035,
          ])
      // A toalha, só numa das duas. Nas duas viraria padrão; numa só, lê como
      // alguém que esteve ali — que é a diferença entre cenário e lugar usado.
      if (e === 0)
        col.poe('toalha', gCaixa, mToalha, p(0, 0.5, 0.22), [0, g, 0], [0.52, 0.07, 0.42])
    }
    /**
     * O GUARDA-SOL FECHADO, e ele é a peça mais importante deste bloco.
     *
     * O quadro é faixa horizontal empilhada — deck, lâmina, jardim, cidade, céu
     * — e no primeiro plano não há UMA vertical. O mastro atravessa três dessas
     * faixas de uma vez e é o que quebra o empilhamento.
     *
     * FECHADO porque é entardecer. Aberto, além de anacrônico, seria um disco
     * de dois metros tapando justamente o jardim e a cascata que a cena levou
     * semanas para acertar — a peça existe para dar vertical, não para comprar
     * área.
     */
    // ENTRE AS DUAS E MEIO METRO ATRÁS: é onde um guarda-sol fica, e é o que o
    // mantém dentro do quadro. `zEspreg - 0.45` o deixa livre da pedra da borda,
    // que termina 40 cm à frente da lâmina.
    const xGuardaSol = xBordaEsquerda - 1.3
    col.poe('colunaMesa', gCilindro, mMetal, [xGuardaSol, piso + 1.15, zEspreg - 0.45], [0, 0, 0], [
      0.035,
      2.3,
      0.035,
    ])
    col.poe('baseMesa', gCilindro, mMetal, [xGuardaSol, piso + 0.04, zEspreg - 0.45], [0, 0, 0], [
      0.34,
      0.08,
      0.34,
    ])
    // A lona enrolada: cone e não cilindro. Guarda-sol fechado afina para cima
    // porque as varetas convergem no topo, e um tubo reto ali leria como poste.
    col.poe(
      'lonaGuardaSol',
      gCone,
      mAlmofada,
      [xGuardaSol, piso + 2.62, zEspreg - 0.45],
      [0, 0, 0],
      [0.1, 1.15, 0.1],
    )

    // ── recepção ──────────────────────────────────────────────────────────
    /**
     * ═══ CHEGADA PRECISA DE SOLEIRA ═══
     *
     * Quem sai do elevador tem de encontrar alguma coisa, ou o terraço lê como
     * um lugar onde se aparece por acaso. O balcão é o objeto que diz "você
     * chegou e alguém esperava por você" — e é o contraponto programático do
     * bar do outro lado: um é onde se é recebido, o outro é onde se fica.
     *
     * Ele NÃO enfrenta o elevador, fica de lado. Balcão de frente para a porta
     * bloquearia a saída e, pior, esconderia a própria porta da câmera — que é
     * o elemento que acabou de ser construído para fechar aquela ponta.
     */
    const xRecepcao = xNucleo + NUCLEO.largura / 2 + 1.25
    const zRecepcao = zFrenteNucleo - 0.9
    // Corpo em madeira escura e tampo em PEDRA — o mesmo par do balcão do bar.
    // Repetir o material é o que amarra as duas pontas como um projeto só.
    col.poe('corpoRecepcao', gCaixa, mMadeiraEscura, [xRecepcao, piso + 0.5, zRecepcao], [0, 0, 0], [
      2.0,
      1.0,
      0.6,
    ])
    col.poe('tampoRecepcao', gCaixa, mPedra, [xRecepcao, piso + 1.03, zRecepcao], [0, 0, 0], [
      2.16,
      0.06,
      0.72,
    ])
    // Banqueta do outro lado do balcão: quem atende fica de costas para o
    // núcleo. Chaves reaproveitadas do bar — zero chamada nova.
    col.poe('banqueta', gAssentoBanqueta, mMadeiraEscura, [xRecepcao, piso + 0.76, zRecepcao - 0.75])
    col.poe('pernaBanqueta', gPernaBanqueta, mMetal, [xRecepcao, piso + 0.38, zRecepcao - 0.75])
    /**
     * A LUMINÁRIA DE BALCÃO, e ela é o que faz a recepção existir à noite.
     *
     * Sem uma fonte própria o balcão fica no escuro — a ponta esquerda do
     * terraço não tem iluminação nenhuma além do display do elevador. Reusa
     * `mLuminaria`, a mesma dos pendentes do escritório: mesma temperatura,
     * mesmo projeto.
     */
    col.poe(
      'luzRecepcao',
      gCaixa,
      mLuminaria,
      [xRecepcao + 0.72, piso + 1.12, zRecepcao + 0.1],
      [0, 0, 0],
      [0.16, 0.05, 0.16],
    )
    /**
     * ═══ A FITA SOB O TAMPO, E POR QUE NÃO FOI UMA SEGUNDA ARANDELA ═══
     *
     * Eu tinha proposto resolver o escuro do balcão com outra arandela na quina
     * do núcleo. Não resolveria, e a razão é geométrica: o balcão está a 2,95 m
     * do eixo do núcleo, ou seja FORA do plano da face dele. Arandela lava a
     * parede em que está montada; não há parede atrás do balcão para lavar.
     *
     * O que ilumina um balcão de recepção de noite é a fita embutida sob a aba
     * do tampo — luz que nasce escondida e desce pelo corpo do móvel. É por isso
     * que o tampo avança 6 cm além do corpo dos dois lados: essa aba não era
     * decorativa, ela existe para esconder uma fita, e agora esconde.
     *
     * `mFitaLed`, a MESMA fita âmbar do balcão do bar. As duas são balcões, do
     * mesmo projeto, nas duas pontas do terraço — e é a repetição do material
     * que faz as pontas lerem como um par em vez de duas invenções.
     *
     * SEM POÇA DE LUZ NO DECK, de propósito. A tentação é somar uma mancha
     * embaixo, e a mancha pronta desta cena é redonda: seria a quarta elipse
     * onde cabe outra forma. O derrame de uma fita linear é uma FAIXA, e antes
     * de desenhar a faixa certa prefiro deixar só a fita, que já acende sozinha
     * porque o bloom a alcança — é o que acontece com a do bar.
     *
     * ═══ A PRIMEIRA POSIÇÃO ESCONDEU A FITA, E O ERRO É DE PONTO DE VISTA ═══
     *
     * Eu a pus DEBAixo da aba do tampo, encaixada sob os 6 cm de avanço, que é
     * onde uma fita de verdade fica. No render ela sumiu — e é consequência de
     * geometria, não de tamanho: a câmera está ACIMA do balcão, então a aba que
     * esconde a fita de quem passa esconde também de quem olha de cima. A do bar
     * escapa disso porque avança mais.
     *
     * Ela desce 4,5 cm e avança para a face do corpo: fita aparente sob o lábio
     * do tampo, que é igualmente comum em balcão e é a única que esta câmera vê.
     *
     * E usa `gFitaLed` com a MESMA CHAVE da do bar — zero chamada de desenho
     * nova, e a espessura passa a ser literalmente a mesma peça que já foi
     * provada legível naquela distância, em vez de um número meu.
     */
    col.poe(
      'fitaLed',
      gFitaLed,
      mFitaLed,
      [xRecepcao, piso + 0.955, zRecepcao + 0.315],
      [0, 0, 0],
      [1.9, 1, 1],
    )

    // ── guarda-corpo ──────────────────────────────────────────────────────
    const montantes = Math.floor((meiaLargura * 2) / 2.1)
    for (let i = 0; i <= montantes; i++) {
      const x = -meiaLargura + i * 2.1
      col.poe('montante', gMontanteVidro, mAco, [x, piso + 0.74, zGuarda])
      // Chapa de base parafusada no deck: nenhum guarda-corpo BROTA do piso.
      col.poe('chapaBase', gChapaBase, mAco, [x, piso + 0.036, zGuarda])
      // Espaçadores: os dois botões de aço que prendem a chapa de vidro. É a
      // peça que dá escala ao guarda-corpo e prova que o vidro está preso.
      for (const dy of [0.42, 1.02])
        col.poe('espacador', gEspacador, mMetal, [x, piso + dy, zGuarda + 0.04], [Math.PI / 2, 0, 0])
    }

    /**
     * O tipo continua `Object3D[]` e não `InstancedMesh[]`, mesmo agora que só
     * saem instâncias daqui. Com o varal, a fusão dos três fios entrava como
     * `Mesh` comum; o `useEffect` que adiciona e remove já trata o caso geral, e
     * apertar o tipo agora só criaria atrito na próxima peça que não couber no
     * coletor — e sempre há uma.
     */
    return col.colhe() as THREE.Object3D[]
  }, [piso, zCentro, prof, meiaLargura])

  /**
   * `useEffect`, E NÃO `useMemo` — este era o bug que o dono reportou três vezes.
   *
   * O bloco estava escrito como `useMemo(() => { …add…; return () => …remove… })`.
   * `useMemo` MEMORIZA O VALOR DE RETORNO: aquela função de limpeza virava um
   * valor guardado que ninguém jamais chamou. As malhas entravam na cena e nunca
   * saíam.
   *
   * O vazamento ficava invisível enquanto `malhas` não recalculasse. Só que ele
   * depende de `prof`, e `prof` TROCA na descida: o andar nasce em parallax
   * (profundidade 7) e é promovido a perspectiva (13) quando a câmera se
   * aproxima. Nesse instante o coletor monta um terraço inteiro novo, e o antigo
   * continua na cena — dois metros e meio mais raso, com tudo em escala errada.
   *
   * Daí saíram os três defeitos que chegaram como problemas separados:
   *  - "parece ter duas estruturas de proteção de vidro" — dois guarda-corpos.
   *  - "a estrutura de madeira está desalinhada e invadindo o escritório" — dois
   *    pergolados em profundidades diferentes, o mais raso cruzando o vidro.
   *  - "por trás do escritório e do bar parece se repetir" — literalmente um
   *    segundo escritório e um segundo bar.
   *
   * Três sintomas, uma causa, e nenhum deles no objeto que parecia culpado. É a
   * mesma lição que já ficou escrita nesta feature quando os pilares sumiram e o
   * defeito continuou: quando o problema SOBREVIVE à correção do suspeito
   * óbvio, o suspeito era outro.
   *
   * A limpeza também DESCARTA a geometria. Cada montagem cria as suas do zero;
   * sem descartar, cada promoção de andar deixaria os buffers da anterior na
   * GPU. Os materiais ficam de fora de propósito: alguns carregam textura vinda
   * de cache compartilhado entre andares, e liberar isso aqui apagaria o
   * concreto dos vizinhos.
   */
  useEffect(() => {
    for (const m of malhas) scene.add(m)
    return () => {
      for (const m of malhas) {
        scene.remove(m)
        // `malhas` é `Object3D[]` porque o andar mistura instâncias do coletor
        // com as malhas fundidas do varal; só as que têm geometria descartam.
        if (m instanceof THREE.Mesh) m.geometry.dispose()
      }
    }
  }, [malhas, scene])

  const piscina = piscinaZ(zCentro, prof)
  const zEspelho = piscina.centro
  const zGuardaCorpo = zCentro + prof * 0.4
  /**
   * A CASCATA. O véu vive aqui e não no coletor porque é transparente — mesma
   * razão do pano de vidro do escritório: `InstancedMesh` transparente é
   * ordenada como um objeto só, e este precisa ser desenhado depois da parede
   * que ele cobre.
   *
   * A repetição em U é a largura do trecho dividida por `LADRILHO_DO_VEU`, e não
   * um número fixo: dois trechos de larguras diferentes com a mesma repetição
   * teriam cordões de espessuras diferentes, e nada denuncia textura repetida
   * mais rápido que escala inconsistente entre peças vizinhas.
   */
  const aguaDaParede = useMemo(() => veuDagua(), [])
  /**
   * O relógio da lâmina e as duas cópias da teia de cáusticas.
   *
   * São DUAS texturas e não uma usada duas vezes: `offset` mora na textura, não
   * no material, então dois planos apontando para o mesmo objeto andariam
   * juntos — e duas camadas em fase são uma camada só, com o dobro do custo.
   */
  /**
   * DOIS CONJUNTOS DE TEXTURA DE VIDRO, e não um usado duas vezes.
   *
   * `repeat` mora na TEXTURA, não no material. O pano do escritório tem 5,8 m e
   * o guarda-corpo tem 30 — eles precisam de repetições diferentes para a onda
   * de rolo ter a mesma escala em metros nos dois. Compartilhando o objeto, o
   * segundo `onUpdate` a rodar sobrescreveria o primeiro e um dos dois sairia
   * com a onda na escala errada.
   *
   * É exatamente a mesma armadilha das duas camadas de cáustica, algumas linhas
   * acima. Duas ocorrências já são um padrão: em três.js, textura é estado
   * compartilhado, e "o mesmo mapa em dois lugares" quase nunca é o que se quer.
   */
  const [vidroEsc, vidroGuarda] = useMemo(() => [vidroPlano(), vidroPlano()], [])
  useEffect(
    () => () => {
      for (const v of [vidroEsc, vidroGuarda])
        for (const t of [v.normalMap, v.roughnessMap, v.alfa]) t.dispose()
    },
    [vidroEsc, vidroGuarda],
  )
  /**
   * ═══ O REFLEXO DA PISCINA — assado UMA vez, num mapa de cubo ═══
   *
   * O DEFEITO. A lâmina devolve o céu PINTADO de `criaAmbiente` — um degradê
   * equirretangular com nuvem e sol, e mais nada. Só que uma piscina de cobertura
   * ao anoitecer não reflete o céu: ela reflete o BAR ACESO. O ângulo de visão é
   * rasante (7,8° do horizonte), e em rasante o Fresnel manda a refletividade
   * para perto de 1 — quase tudo que se vê da água é reflexo, e o que está no
   * caminho do reflexo é a cena, não a abóbada.
   *
   * POR QUE MAPA DE CUBO E NÃO REFLEXO PLANAR, que era a minha primeira ideia:
   * reflexo planar renderiza a cena de uma câmera espelhada, e essa câmera
   * depende de ONDE O OBSERVADOR ESTÁ. Assar um planar uma vez só valeria para
   * uma posição de câmera — e a câmera desce durante a rolagem, então o reflexo
   * ficaria errado no instante seguinte. Mapa de cubo é gravado de um PONTO e é
   * independente do observador: vale para qualquer posição de câmera, para
   * sempre. A mesma economia que eu queria, sem a premissa falsa.
   *
   * ASSADO NO QUADRO 8 E NÃO NA MONTAGEM. Ele precisa que a cena JÁ ESTEJA na
   * árvore — o bar, o escritório, as árvores, a cidade e o céu entram por
   * `useEffect`, depois do primeiro render. Gravar cedo demais devolveria um
   * cubo com metade do terraço faltando, e isso não dá erro nenhum: dá um
   * reflexo pobre que ninguém sabe explicar.
   *
   * O CUSTO É UM SOLAVANCO ÚNICO de seis faces, no começo, e zero por quadro
   * depois. Contra o planar, que seria uma renderização inteira da cena a cada
   * quadro — era isso ou não ter reflexo.
   */
  const [espelhoDaAgua, setEspelhoDaAgua] = useState<THREE.Texture | null>(null)
  const lamina = useRef<THREE.Mesh>(null)
  const quadrosAteAssar = useRef(0)
  useEffect(
    () => () => {
      espelhoDaAgua?.dispose()
    },
    [espelhoDaAgua],
  )

  const relogioDaAgua = useRef({ value: 0 }).current
  const [caustica, caustica2] = useMemo(() => [causticas(), causticas()], [])
  useEffect(
    () => () => {
      caustica.dispose()
      caustica2.dispose()
    },
    [caustica, caustica2],
  )
  const trechos = TRECHOS_DA_CASCATA(ESCRITORIO.x, ESCRITORIO.largura)
  const zParedeFundo = zDaParedeDoAndar(zCentro, prof)
  /**
   * A QUEDA É ANIMADA POR `offset`, e é a coisa mais barata que existe: um
   * número por quadro, nenhuma geometria tocada, nenhum material recompilado.
   *
   * Água parada numa parede vertical não existe — sem movimento o véu lê como
   * vidro canelado, que é o oposto do que ele deve dizer. E o mapa de NORMAL
   * anda mais devagar que o de cor (0,38 contra 0,52) de propósito: o relevo é o
   * cordão, que desce com a massa d'água, e a cor carrega a aeração, que corre
   * mais rápido que o cordão porque é ar arrastado. A diferença entre as duas
   * velocidades é o que dá a impressão de fluxo em vez de fita rolando.
   */
  /**
   * O SINAL É `+=`, E NÃO `-=` — a primeira versão fazia a água SUBIR.
   *
   * O fragmento amostra `uv + offset`. Aumentar `offset.y` faz cada ponto da
   * tela ler um trecho MAIS ALTO da textura, e o conteúdo que estava em cima
   * aparece embaixo: a imagem desce. Subtrair faz o contrário.
   *
   * É contraintuitivo o bastante para errar na primeira, e impossível de não ver
   * no render — foi o dono quem apontou. Fica escrito porque o próximo a mexer
   * aqui vai ter exatamente a mesma dúvida.
   */
  useFrame(({ gl }, delta) => {
    /**
     * A GRAVAÇÃO DO CUBO, e ela acontece exatamente uma vez.
     *
     * A LÂMINA SAI DA CENA DURANTE A GRAVAÇÃO, e sem isso o efeito se come: uma
     * superfície refletora gravando um mapa que ela mesma vai usar enxerga a si
     * própria, e o que entra no cubo é o buraco preto dela em vez do que está
     * atrás. É o equivalente de apontar a câmera para o monitor que a exibe.
     *
     * A CÂMERA FICA MEIO METRO ACIMA DA LÂMINA, não sobre ela. Colada na água,
     * a metade de baixo do cubo seria o fundo do tanque a dois centímetros — um
     * borrão azul ocupando três faces. Meio metro põe o horizonte do cubo na
     * altura de quem olha a água de pé, que é de onde vêm os raios que importam.
     */
    if (quadrosAteAssar.current >= 0) {
      quadrosAteAssar.current += 1
      if (quadrosAteAssar.current === 8) {
        quadrosAteAssar.current = -1
        const visivel = lamina.current?.visible
        if (lamina.current) lamina.current.visible = false
        // 256 por face basta: o reflexo é visto através de uma normal que o
        // quebra em ondulação, e resolução de reflexo que ninguém consegue
        // seguir com o olho é memória de vídeo jogada fora. Meio-float porque a
        // cena tem fontes acima de 1 e um cubo de 8 bits as cortaria em branco,
        // matando justamente o brilho do bar que este mapa existe para trazer.
        const alvo = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType })
        const cubo = new THREE.CubeCamera(0.3, 80, alvo)
        cubo.position.set(piscina.x, piso + 0.5, zEspelho)
        cubo.update(gl, scene)
        // O PMREM não é opcional: mapa cru só serve para espelho perfeito, e a
        // lâmina tem rugosidade 0,3. É ele que pré-filtra por nível de aspereza
        // para o reflexo embaçar na medida certa em vez de ficar de vidro.
        const pmrem = new THREE.PMREMGenerator(gl)
        const filtrado = pmrem.fromCubemap(alvo.texture)
        pmrem.dispose()
        alvo.dispose()
        if (lamina.current) lamina.current.visible = visivel ?? true
        setEspelhoDaAgua(filtrado.texture)
      }
    }
    // O passo é limitado porque `delta` estoura quando a aba volta do segundo
    // plano, e um salto de meio segundo teleportaria a queda.
    const passo = Math.min(delta, 0.05)
    aguaDaParede.map.offset.y += passo * 0.52
    aguaDaParede.normalMap.offset.y += passo * 0.38
    aguaDaParede.roughnessMap.offset.y += passo * 0.38
    /**
     * E O VENTO INTEIRO É ESTA LINHA.
     *
     * Um float por quadro, compartilhado por referência com o uniforme de todos
     * os materiais de vegetação. A alternativa seria recompor a matriz de cada
     * uma das mais de sete mil folhas, lâminas e frondes e reenviar o buffer de
     * instâncias a cada quadro — o que não é uma otimização perdida, é o que
     * inviabilizaria o efeito.
     *
     * O mesmo `passo` aparado da cascata, e pelo mesmo motivo: `delta` estoura
     * quando a aba volta do segundo plano, e meio segundo de salto teleportaria
     * o balanço em vez de continuá-lo.
     */
    relogioDoVento.value += passo
    /**
     * O RELÓGIO DA LÂMINA, e ele é de outra natureza que os dois de cima.
     *
     * A cascata desloca `offset` porque a água dela DESCE de fato — há uma
     * direção real e o deslocamento é ela. A lâmina não tem direção nenhuma: o
     * relógio aqui alimenta os dois trens de onda cruzados do shader, que se
     * interferem sem ir a lugar nenhum. Ver `comOndulacao`.
     */
    relogioDaAgua.value += passo
    // As cáusticas do fundo andam MENOS que a superfície, e em direções
    // diferentes entre si. A teia no fundo é a sombra invertida da ondulação lá
    // em cima, projetada através de 1,2 m de água: ela se refaz no lugar em vez
    // de correr, e duas camadas cruzadas são o que produz esse cintilar.
    caustica.offset.x += passo * 0.012
    caustica.offset.y += passo * 0.019
    caustica2.offset.x -= passo * 0.017
    caustica2.offset.y += passo * 0.009
  })
  // Repetidos do bloco instanciado de propósito: o vidro e a luz são as duas
  // únicas peças do escritório que NÃO podem ser instanciadas — uma é
  // transparente (precisa ordenar contra o interior) e a outra não é geometria.
  const xEsc = ESCRITORIO.x
  const zFrenteEsc = zDoEscritorio(zCentro, prof) + ESCRITORIO.profundidade / 2

  return (
    <>
      {/* ═══ A CASCATA DA PAREDE DO FUNDO ═══
       *
       * Entrou no lugar dos sete fachos de lavagem. Eles resolviam o VALOR da
       * parede — trinta metros de concreto num tom só — e não resolviam a
       * atenção: sete manchas iguais são um padrão, e padrão o olho descarta.
       *
       * Opacidade 0,74 e não 1: véu d'água é fino, e o concreto tem de aparecer
       * por trás dele. É essa transparência parcial que separa "água correndo
       * numa parede" de "parede pintada de azul" — o mesmo raciocínio do vidro
       * do guarda-corpo, com o número no outro extremo, porque aqui a peça
       * PRECISA ser vista.
       *
       * `envMapIntensity` alto com rugosidade baixa é o que faz o véu pegar o
       * céu do entardecer e acender em faixa vertical. Sem isso ele seria uma
       * superfície texturada e escura, que é o que água sem reflexo é. */}
      {trechos.map(([de, ate]) => (
        <mesh key={de} position={[(de + ate) / 2, piso + 1.72, zParedeFundo + 0.05]}>
          <planeGeometry args={[ate - de, 2.86]} />
          <meshStandardMaterial
            // Escuro e metálico, e não azul-claro. A cor da água é a cor do que
            // ela reflete: com `metalness` alta e rugosidade quase zero, quem
            // pinta o véu é o céu do entardecer, em faixa vertical. Um azul
            // pintado à mão compete com esse reflexo e vence — foi o que
            // aconteceu na primeira tentativa, e o resultado foi vidro jateado.
            color="#7d9aa6"
            roughness={0.05}
            metalness={0.3}
            envMapIntensity={2.2}
            transparent
            opacity={0.82}
            /**
             * O VÉU ACENDE POR EMISSIVO, e não por uma luz nova.
             *
             * Instalação de água iluminada é sempre iluminada POR DENTRO — a
             * fita fica na calha e a luz sobe atravessando a lâmina, que é o que
             * faz a água inteira brilhar em vez de ter uma mancha clara. Imitar
             * isso com uma `pointLight` exigiria pôr a fonte dentro da calha e
             * torcer para o alcance cobrir três metros de altura, e cada luz
             * nova recompila o shader de todos os materiais da cena.
             *
             * O emissivo dá a leitura certa por zero luzes: o véu tem valor
             * próprio, não some quando o céu escurece, e o gradiente vertical de
             * verdade fica por conta da fita na calha, que é sólida e aparece.
             *
             * Verde-azulado e não branco: água iluminada por baixo puxa o
             * turquesa, porque a própria massa d'água filtra o vermelho. Branco
             * aqui leria como painel de LED.
             */
            emissive={new THREE.Color('#1f5c6e')}
            /**
             * 0,38 E NÃO 0,55 — com 0,55 o véu virou uma CHAPA turquesa.
             *
             * Emissivo é um valor somado por igual em cada pixel: quanto mais
             * alto, mais ele achata a diferença entre o cordão aceso e o vão
             * escuro — e é justamente essa diferença que se lê como água
             * correndo. Acender demais uma superfície apaga a textura dela, e o
             * primeiro render com 0,55 mostrou exatamente isso: acesa, sim, e
             * com cara de painel de LED em vez de cascata.
             */
            emissiveIntensity={0.38}
            map={aguaDaParede.map}
            normalMap={aguaDaParede.normalMap}
            normalScale={new THREE.Vector2(1.6, 1.6)}
            roughnessMap={aguaDaParede.roughnessMap}
            onUpdate={(m) => {
              // A repetição sai da LARGURA DO TRECHO: com um número fixo, dois
              // trechos de larguras diferentes teriam cordões de espessuras
              // diferentes lado a lado.
              for (const t of [m.map, m.normalMap, m.roughnessMap]) {
                if (!t) continue
                t.repeat.set((ate - de) / LADRILHO_DO_VEU, 1)
                t.needsUpdate = true
              }
            }}
          />
        </mesh>
      ))}
      {/* ═══ O PANO DE VIDRO DO ESCRITÓRIO ═══
       *
       * Fica AQUI e não no coletor por uma razão só: transparência. Uma
       * `InstancedMesh` transparente é ordenada como um objeto único, e o que
       * este plano precisa é ser desenhado DEPOIS de tudo que está atrás dele —
       * estante, mesa, cadeira, painel aceso. Fora do coletor, o three resolve
       * isso sozinho pela ordem de profundidade.
       *
       * OPACIDADE 0,12, pelo mesmo motivo medido no guarda-corpo: vidro real
       * visto de frente é quase invisível. Quem denuncia o pano é o CAIXILHO e o
       * reflexo — nunca uma névoa cinza por cima do que ele deveria mostrar. Com
       * 0,3 o interior inteiro, que é a coisa mais cara desta entrega, ficaria
       * atrás de um véu.
       *
       * `roughness` baixíssima com `envMapIntensity` alta é o que faz o pano
       * devolver o céu do entardecer em faixa — é esse filete que diz "vidro" à
       * distância em que o caixilho já tem dois pixels. */}
      <mesh position={[xEsc, piso + ESCRITORIO.altura / 2, zFrenteEsc + 0.05]}>
        {/* As medidas saem de `ESCRITORIO` e não de 5,8 × 2,92 cravados: o pano
         * de vidro É a fachada, e um literal aqui se descola em silêncio no dia
         * em que o escritório mudar. Já aconteceu quatro vezes nesta cena. */}
        <planeGeometry args={[ESCRITORIO.largura, ESCRITORIO.altura]} />
        {/* A TEXTURA DO VIDRO. Ver `vidroPlano`: onda de rolo no relevo e
         * película de sujeira na rugosidade e no alfa. O pano era uma lâmina de
         * valor único — espelho ideal, que devolve o céu inteiro e limpo e por
         * isso lê como chapa.
         *
         * `repeat` em U é a largura do pano dividida pelo ladrilho de 2,5 m: a
         * onda de rolo tem período de metros, e amarrar a repetição a um número
         * fixo faria a onda mudar de escala se o escritório mudasse de largura.
         * Em V a mesma conta, e por isso a fração — a peça tem 2,92 m de altura,
         * então se vê pouco mais de um ladrilho. */}
        <meshStandardMaterial
          color="#cfe2ee"
          roughness={0.04}
          metalness={0.28}
          envMapIntensity={1.5}
          transparent
          // 0,12 / `OPACIDADE_LIMPA`: o `alphaMap` multiplica, então dividir
          // aqui devolve exatamente os 0,12 medidos no vidro limpo e deixa a
          // sujeira ACRESCENTAR por cima, em vez de o pano inteiro clarear.
          opacity={0.12 / OPACIDADE_LIMPA}
          depthWrite={false}
          normalMap={vidroEsc.normalMap}
          normalScale={VIDRO_RELEVO}
          roughnessMap={vidroEsc.roughnessMap}
          alphaMap={vidroEsc.alfa}
          onUpdate={(m) => {
            for (const t of [m.normalMap, m.roughnessMap, m.alphaMap]) {
              if (!t) continue
              t.repeat.set(ESCRITORIO.largura / LADRILHO_DO_VIDRO, ESCRITORIO.altura / LADRILHO_DO_VIDRO)
              t.needsUpdate = true
            }
          }}
        />
      </mesh>
      {/* A ÚNICA LUZ ADICIONADA À CENA, e ela é necessária porque o emissivo do
       * three NÃO ILUMINA nada. O painel do fundo APARECE aceso; sem uma fonte
       * de verdade, a estante, a mesa e a cadeira na frente dele ficariam pretas
       * — silhuetas recortadas contra uma chapa laranja.
       *
       * Fica à FRENTE do miolo (z do vidro menos meio metro) e não no centro do
       * volume: assim ela lava o mobiliário pela face que a câmera vê, em vez de
       * lavar a parede do fundo que já está acesa por conta própria.
       *
       * `decay` 2 é o físico, e `distance` 7 é o corte que impede o pouco que
       * sobra de alcançar a jardineira do fundo e acender a folhagem por dentro.
       * Sem sombra de propósito: uma sombra a mais custa um passe de mapa e o
       * que ela resolveria aqui — a luz atravessar a parede de trás — não é
       * visível de nenhum ângulo que a descida use. */}
      <pointLight
        position={[xEsc + 0.9, piso + 1.9, zFrenteEsc - 0.5]}
        color="#ffc98c"
        intensity={9}
        distance={7}
        decay={2}
      />
      {/* A SEGUNDA LUZ, SÓ PARA A ESTANTE. O primeiro render deixou claro que uma
       * fonte não basta: com a luz sobre a mesa, a estante — que está 2,5 m à
       * esquerda e recuada contra o fundo — caía a menos de um sexto da
       * iluminação e ficava PRETA. Trinta e duas lombadas coloridas desenhadas e
       * nenhuma visível.
       *
       * Ela é fraca (4) e curta (4,5 m) de propósito: não é uma segunda fonte
       * ambiente, é o banho rasante que uma estante de verdade tem, com o foco
       * embutido no forro logo à frente dela. Por isso fica ALTA e um palmo à
       * frente das prateleiras — luz vinda de cima e de fora é o que revela a
       * lombada; luz de frente achataria tudo. */}
      <pointLight
        position={[xEsc - 1.55, piso + 2.3, zFrenteEsc - 1.35]}
        color="#ffd2a0"
        intensity={4}
        distance={4.5}
        decay={2}
      />
      {/* A LUZ DO BAR, sob a bandeira. Mesmo problema do escritório: o nicho
       * emissivo APARECE aceso e não ilumina nada, então o tampo de pedra, as
       * banquetas e a frente do balcão ficariam pretos — e um bar cujo balcão é
       * uma silhueta não convida ninguém a encostar nele.
       *
       * Âmbar mais fechado que a do escritório (#ffb066 contra #ffc98c): são dois
       * pontos acesos no mesmo quadro, e a diferença de temperatura é o que
       * impede um de parecer a cópia do outro. Alcance curto (4 m) para o quente
       * morrer antes da piscina. */}
      <pointLight
        position={[9.0, piso + 2.05, zCentro - prof * 0.208 - 0.3]}
        color="#ffb066"
        intensity={5.5}
        distance={4}
        decay={2}
      />
      {/* O FUNDO DA PISCINA, e ele existe por causa de como água se vê.
       * Uma lâmina sem fundo é uma superfície; com fundo, o olho lê VOLUME —
       * a cor escura por baixo através da água translúcida é metade do que faz
       * uma piscina parecer cheia. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[piscina.x, piso - 0.22, zEspelho]}>
        <planeGeometry args={[piscina.largura, piscina.profundidade]} />
        <meshStandardMaterial color="#17495a" roughness={0.9} />
      </mesh>
      {/* ═══ AS CÁUSTICAS, EM DUAS CAMADAS CRUZADAS ═══
       *
       * Uma camada só desliza; duas em escalas e direções diferentes
       * INTERFEREM, e é a interferência que cintila no lugar em vez de correr.
       * É o mesmo princípio dos dois trens de onda da superfície, resolvido
       * aqui com geometria em vez de shader — porque a teia é aditiva, e
       * `AdditiveBlending` faz a soma de graça no misturador.
       *
       * `toneMapped` desligado: a cáustica é uma CONCENTRAÇÃO de luz, e o
       * mapeamento de tom existe justamente para comprimir os altos. Deixá-lo
       * agir tiraria dela a única coisa que ela tem — o estouro.
       *
       * Sem `depthWrite`, e a 1 e 2 cm do fundo para o teste de profundidade
       * não brigar com a laje do tanque. */}
      {[
        { t: caustica, y: 0.01, r: 2.1, o: 0.5 },
        { t: caustica2, y: 0.02, r: 3.4, o: 0.34 },
      ].map(({ t, y, r, o }) => (
        <mesh
          key={y}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[piscina.x, piso - 0.22 + y, zEspelho]}
        >
          <planeGeometry args={[piscina.largura, piscina.profundidade]} />
          <meshBasicMaterial
            map={t}
            transparent
            opacity={o}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
            onUpdate={(m) => {
              if (!m.map) return
              // A repetição sai das MEDIDAS DO TANQUE, não de um número fixo:
              // a piscina já encolheu uma vez, e a teia tem de manter a escala
              // em metros quando isso acontecer de novo.
              m.map.repeat.set(piscina.largura / r, piscina.profundidade / r)
              m.map.needsUpdate = true
            }}
          />
        </mesh>
      ))}
      {/* A LÂMINA D'ÁGUA.
       *
       * RUGOSIDADE 0,3 foi o número que a fez virar água, e não a cor: eu troquei
       * a cor duas vezes e as duas saiu cinza. A câmera olha a lâmina a 7,8° do
       * horizonte, e nesse ângulo rasante o Fresnel manda a refletividade para
       * perto de 1 — superfície lisa vira ESPELHO e devolve um céu pálido.
       * Cinza-claro era a resposta fisicamente certa.
       *
       * O MAPA DE NORMAL é o que faltava depois disso. Água não é plana: o que
       * a torna reconhecível é o reflexo QUEBRANDO em ondulação. Com a
       * superfície lisa, o reflexo do céu fica inteiro e limpo, e lâmina de
       * reflexo limpo lê como vidro ou como chapa — nunca como água. */}
      <mesh
        ref={lamina}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[piscina.x, piso + 0.06, zEspelho]}
      >
        <planeGeometry args={[piscina.largura, piscina.profundidade]} />
        {/* A ONDULAÇÃO VIVA. O mapa de normal parado saía como vidro martelado:
         * o que o olho usa para reconhecer água é o reflexo QUEBRANDO e se
         * refazendo, e relevo congelado não quebra nada. O porquê de não bastar
         * rolar o `offset` — e por que isso funciona na cascata e não aqui —
         * está escrito em `comOndulacao`.
         *
         * `ref` com `comOndulacao` e não uma prop: a injeção é feita UMA vez no
         * material, e refazê-la a cada render encadearia um `onBeforeCompile`
         * novo por cima do anterior a cada quadro. */}
        <meshStandardMaterial
          color="#2d8ba1"
          /**
           * RUGOSIDADE 0,18 E NÃO 0,3, e a mudança é consequência direta do
           * reflexo novo.
           *
           * O 0,3 foi ajustado contra um ambiente CHAPADO — o céu pintado, que
           * é quase uniforme. Contra um fundo sem contraste, rugosidade alta era
           * o único jeito de a lâmina não virar espelho de chapa. Com o mapa de
           * cubo, o ambiente passou a ter bar aceso, escritório, árvore e
           * parapeito: há contraste de sobra, e agora é a rugosidade que
           * atrapalha — ela BORRA o reflexo e apaga justamente a variação que a
           * ondulação deveria produzir. O primeiro render com o cubo mostrou
           * isso: metade esquerda da piscina virou um turquesa liso.
           *
           * Água é lisa. Com 0,18 o reflexo fica nítido o bastante para os dois
           * trens de onda o quebrarem em cintilação — e é a cintilação, não a
           * cor, que se lê como superfície líquida.
           */
          roughness={0.18}
          /**
           * `metalness` 0,25 e não 0,05, e a subida é consequência do reflexo
           * novo. Em `MeshStandardMaterial` é ela que diz quanto do `envMap`
           * entra: com 0,05 o mapa de cubo recém-gravado chegaria à água como um
           * sussurro, e o bar aceso — que é a razão inteira de gravá-lo — não
           * apareceria. Água não é metal, mas vista em rasante ela se comporta
           * como um, e é esse comportamento que o número está imitando.
           *
           * `envMap` só existe depois do quadro 8. Até lá a lâmina cai no
           * ambiente da cena, que é o céu pintado — ou seja, exatamente como ela
           * era antes. A transição acontece uma vez, nos primeiros instantes,
           * antes de qualquer rolagem.
           */
          metalness={0.25}
          envMap={espelhoDaAgua}
          envMapIntensity={1.15}
          transparent
          opacity={0.86}
          normalMap={ondaDagua}
          normalScale={new THREE.Vector2(0.35, 0.35)}
          ref={(m) => {
            if (m && !m.userData.ondulado) {
              m.userData.ondulado = true
              /**
               * ═══ ESCALA 1,2 E NÃO 3,2, E A MEDIÇÃO QUE DECIDIU ISSO ═══
               *
               * A sonda de movimento deu 0,91 de média na lâmina contra 4,6 das
               * cáusticas logo abaixo e 5,2 da cascata ao lado. Ela mesma avisa
               * que não confia nesse número — mede |gradiente| × deslocamento, e
               * água é superfície lisa. Quem decidiu foi o mapa de diferença
               * amplificado: a lâmina INTEIRA muda, uniformemente, mas a mudança
               * é GRANULADO fino, sem nenhuma frente de onda.
               *
               * A ARITMÉTICA DO PORQUÊ. A escala é em ladrilhos sobre a lâmina
               * de 8 m; a 3,2 o ladrilho tinha 2,5 m, e a textura de onda carrega
               * de 3,6 a 17 ondas por ladrilho — comprimentos de 15 a 70 cm. Na
               * horizontal isso são 11 a 52 px, o que se veria. Só que a lâmina
               * é vista a 7,8° do horizonte, e o rasante comprime o eixo
               * profundo cerca de dez vezes: cada onda ficava com 1 a 5 px de
               * ALTURA. Abaixo do pixel não existe onda, existe cintilação.
               *
               * A 1,2 o ladrilho passa a ter 6,7 m e as ondas, de 40 cm a 1,9 m:
               * 3 a 13 px na vertical, 30 a 140 px na horizontal. Aí há frente
               * de onda para o olho seguir.
               *
               * E O COMENTÁRIO QUE ESTAVA AQUI CULPAVA O RASANTE PELA COISA
               * CERTA E PUXAVA A ALAVANCA ERRADA. Ele dizia, corretamente, que o
               * ângulo exige mais inclinação — e subia a FORÇA de 1,35 para 1,8,
               * terminando com "acima disso o reflexo vira granulado". Força
               * aumenta a amplitude do que já é pequeno demais: granulado mais
               * forte continua granulado. Quem muda o TAMANHO da onda é a escala.
               *
               * A força volta a 1,35 junto: com onda grande a inclinação de 1,8
               * exagera, e 1,35 era o valor de antes da compensação que agora
               * não é mais necessária.
               *
               * A velocidade não precisa de retoque: desde esta entrega ela é
               * fração da superfície e não do ladrilho — ver `comOndulacao`.
               */
              comOndulacao(m, relogioDaAgua, 1.2, 1.35)
              m.needsUpdate = true
            }
          }}
        />
      </mesh>
      {/* BORDA DA LÂMINA, e ela já ENGOLIU a água uma vez: a caixa de pedra
       * tinha o topo 2,5 cm ACIMA do plano d'água e cobria a lâmina inteira, o
       * que se via era uma laje branca. Agora o topo fica 1 cm abaixo e a pedra
       * aparece como moldura em volta. */}
      {/* VIROU QUATRO PEÇAS, e a mudança é de leitura e não de forma. Era uma
       * caixa cheia por baixo da água: servia de moldura vista de cima, mas por
       * trás dela não havia nada — a lâmina simplesmente terminava. Piscina de
       * verdade tem BORDA DE ACABAMENTO, uma peça que envolve o tanque e sobe um
       * pouco ACIMA do nível da água. É esse degrau de um centímetro que diz que
       * a água está CONTIDA; sem ele a lâmina lê como poça sobre o deck.
       *
       * Quatro peças porque a moldura precisa ter espessura visível nos quatro
       * lados, e uma caixa só mostra o lado de fora. */}
      {/* ═══ AS QUATRO PEDRAS MUDARAM-SE PARA O COLETOR ═══
       *
       * Elas estavam aqui como quatro `<mesh>` soltos, com um material declarado
       * na linha: `color="#cfc4ad" roughness={0.82}` e mais nada. Exatamente a
       * mesma cor de `mPedra` — que existe a quinhentas linhas daqui, com mapa de
       * pedra, mapa de normal, mapa de rugosidade e microrrelevo triplanar.
       *
       * Ou seja: a peça mais clara e mais contínua do primeiro plano, a moldura
       * que emoldura o assunto do quadro, era a única superfície grande da cena
       * sem textura nenhuma. Não por decisão — por ter nascido no arquivo errado.
       *
       * E MUDAR DE LUGAR PAGA DUAS VEZES. Quatro `<mesh>` são quatro chamadas de
       * desenho; no coletor viram uma. A medição de hoje mostrou que esta cena é
       * limitada por CHAMADA e não por fragmento, então três chamadas a menos
       * valem mais aqui do que qualquer economia de pixel.
       *
       * Ficam no JSX só as peças que não podem ser instanciadas: as
       * transparentes, que precisam ser ordenadas contra o que está atrás. Pedra
       * opaca não é uma delas. */}
      {/* O TANQUE: as paredes que seguram a água. Sem elas o fundo escuro fica
       * flutuando e vê-se o deck por baixo pela lateral.
       *
       * O TOPO DELE FICA ABAIXO DA LÂMINA, e isso não é detalhe: na primeira
       * versão o centro em "piso − 0,10" com 0,34 de altura punha a face de cima
       * em "piso + 0,07", um centímetro ACIMA do plano d'água em "piso + 0,06".
       * O resultado foi a tampa escura do tanque cobrindo a água inteira e a
       * piscina virando uma faixa azul-marinho. É exatamente o mesmo erro da
       * pedra que já engoliu a lâmina uma vez, agora vindo por baixo — e a lição
       * é a mesma: numa pilha de planos separados por centímetros, é a ORDEM em
       * y que decide o que se vê, não a intenção de quem escreveu. */}
      <mesh position={[piscina.x, piso - 0.2, zEspelho]}>
        <boxGeometry args={[piscina.largura + 0.04, 0.34, piscina.profundidade + 0.13]} />
        <meshStandardMaterial color="#1d5b6d" roughness={0.75} />
      </mesh>
      {/* O VIDRO DO GUARDA-CORPO, com 0,07 de opacidade — medido. Um plano de
       * 30 m a 5,6 m da câmera cobre a faixa y 407..495 da tela, que é
       * exatamente onde a piscina e as espreguiçadeiras estão; com 0,18 aquilo
       * virava névoa sobre o miolo do quadro, e foi ELA (não o material da
       * água) que deixou a piscina cinza. Vidro real visto de frente é quase
       * invisível: quem denuncia a balaustrada é o montante e o corrimão. */}
      <mesh position={[0, piso + 0.75, zGuardaCorpo]}>
        <planeGeometry args={[meiaLargura * 2, 0.82]} />
        {/* A MESMA TEXTURA DO PANO DO ESCRITÓRIO, e no mesmo ladrilho de 2,5 m.
         * Duas peças de vidro vizinhas com ondas de escalas diferentes
         * denunciam textura na hora — e estas duas aparecem no mesmo quadro.
         *
         * `envMapIntensity` entrou: sem ela o guarda-corpo ficava com o valor
         * padrão 1 enquanto o pano do escritório usava 1,5, e o de baixo não
         * pegava o céu do entardecer. Guarda-corpo de vidro numa cobertura é,
         * visto de frente, quase só reflexo de céu. */}
        <meshStandardMaterial
          color="#dbeaf3"
          roughness={0.06}
          metalness={0.2}
          envMapIntensity={1.5}
          transparent
          // 0,07 / `OPACIDADE_LIMPA`: o `alphaMap` multiplica, então dividir
          // aqui devolve exatamente os 0,07 medidos no vidro limpo e deixa a
          // sujeira ACRESCENTAR por cima. Sem a divisão o guarda-corpo ficaria
          // um terço mais transparente do que foi ajustado.
          opacity={0.07 / OPACIDADE_LIMPA}
          normalMap={vidroGuarda.normalMap}
          normalScale={VIDRO_RELEVO}
          roughnessMap={vidroGuarda.roughnessMap}
          alphaMap={vidroGuarda.alfa}
          onUpdate={(m) => {
            for (const t of [m.normalMap, m.roughnessMap, m.alphaMap]) {
              if (!t) continue
              t.repeat.set((meiaLargura * 2) / LADRILHO_DO_VIDRO, 0.82 / LADRILHO_DO_VIDRO)
              t.needsUpdate = true
            }
          }}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* CORRIMAO REDONDO. Perfil quadrado num corrimao e o que nenhuma
       * serralheria entrega, porque ninguem quer apoiar a mao numa quina — e o
       * tubo redondo tem outra vantagem otica: ele devolve um FILETE de sol
       * continuo ao longo de toda a extensao, e e esse filete que desenha a
       * linha do terraco contra o ceu. Uma barra chata so acende quando a
       * normal dela aponta para o sol, e nesta cena ela nao aponta. */}
      <mesh position={[0, piso + 1.17, zGuardaCorpo]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.016, 0.016, meiaLargura * 2, 12]} />
        <meshStandardMaterial color="#d8cdb8" metalness={0.85} roughness={0.28} />
      </mesh>
    </>
  )
}
