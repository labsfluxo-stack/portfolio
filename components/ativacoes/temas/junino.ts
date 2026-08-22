import type { Tema } from './tipos'

/**
 * O balão de São João: lanterna de papel em gomos, afunilada nas DUAS pontas.
 *
 * NÃO é o balão de ar quente ocidental (cesta, cordas, cúpula redonda) — o
 * termo em inglês do briefing ("paper hot-air balloon") aponta para esse
 * objeto errado, e confundir a silhueta é a coisa mais rápida que um olho de
 * agência brasileira identifica como errada. Também não é o balão de festa de
 * látex com nó. É uma lanterna feita de gomos de papel de seda colados borda
 * a borda, afunilando a um ponto em cima (o nó onde os gomos se juntam) e
 * embaixo (o bico, onde a vela ficaria).
 *
 * PARADO E DECORATIVO, NUNCA ACESO NO AR. Soltar balão aceso é crime nomeado
 * no Brasil (Lei 9.605/98, Art. 42) e nenhuma campanha real desenha isso —
 * agência usa o balão inteiro como enfeite pendurado ou pousado. Por isso
 * este arquivo NUNCA desenha chama: o "bico" é um apliqué de papel decorativo
 * de duas camadas (nunca uma terceira camada clara imitando labareda), e o
 * calor do balão vem de um brilho interno suave, parado — nunca tremulante —
 * como papel iluminado por dentro. `agora` só entra no balanço do elemento e
 * na deriva das brasas do fundo; nada aqui pulsa por causa de tempo passando
 * dentro do próprio balão.
 *
 * O ESTOURO reaproveita os próprios caminhos de gomo (ver `desenharEstouro`)
 * — a costura se separando, não uma explosão de partícula genérica.
 *
 * O MEIO: cada gomo é autorado como dado de caminho SVG (uma string `d`,
 * mesma disciplina de `components/landing/arte.tsx` e
 * `components/art/SystemArt.tsx`), convertido em `Path2D` e rasterizado UMA
 * VEZ para um canvas fora de tela, na densidade da tela. O laço de desenho só
 * chama `drawImage`. Nenhuma função deste arquivo toca `shadowBlur` ou
 * `filter` — os caminhos lentos documentados do Canvas 2D — e a única
 * exceção às "sem chamada de caminho por quadro" é o estouro, que já é raro e
 * curto (~500ms) e reaproveita os MESMOS `Path2D` dos gomos.
 *
 * `Path2D` não existe em Node/jsdom (sondado: `typeof Path2D === 'undefined'`
 * no ambiente de teste deste repositório, e `getContext('2d')` de um canvas
 * fora de tela devolve `null` — o mesmo palco que `tests/setup.ts` já monta
 * para o canvas principal). Toda rasterização aqui é defensiva: se o
 * ambiente não der `Path2D` ou contexto 2D, cada função de desenho cai para
 * um traçado vetorial mínimo direto no pincel — nunca um alvo mudo. Em
 * qualquer navegador real isso nunca acontece (o jogo inteiro já depende de
 * canvas 2D para existir), então o caminho de verdade é sempre o sprite.
 */

// ── Paleta ──────────────────────────────────────────────────────────────

const PALETA = {
  // O vermelho aparece em dois dos seis gomos — a cor mais presente no balão.
  elemento: '#D93A2B',
  // Dourado: mesmo acento quente da casa (`--color-warn`), reaproveitado no
  // brilho interno e no apliqué do bico — o único ponto "aceso" do desenho.
  destaque: '#FFB020',
  fundo: '#08090C',
  // Laranja da aura da brasa, mais frio que o dourado — dá aos dois pontos
  // de calor da dobra (balão e fogueira) tons próximos sem serem idênticos.
  brasa: '#FF6B35',
} as const

// ── Geometria do corpo, em unidades locais (nunca pixel de tela) ─────────
//
// `LARGURA_CORPO = 100` é a unidade: tudo abaixo é fração dela. A conversão
// para pixel de verdade só acontece na rasterização (`ESCALA_RASTER × dpr`)
// e, no desenho por quadro, num único fator de escala derivado do `raio` que
// o motor manda — nunca geometria recalculada.

const LARGURA_CORPO = 100
/** Só o corpo (gomos), excluindo nó e bico — largura:altura 0,72:1, ajustado
 *  de um molde real (~0,52:1) para legibilidade a 24px. Ver
 *  `docs/superpowers/referencias/2026-08-20-arte-junina.md` §2. */
const PROPORCAO_CORPO = 0.72
const ALTURA_CORPO = LARGURA_CORPO / PROPORCAO_CORPO
/** Onde o gomo incha mais. 42%, não 50% — centro exato lê como balão de
 *  látex; um pouco alto lê como tecido/papel gathered. */
const ALTURA_EQUADOR = 0.42 * ALTURA_CORPO
/** Nó do topo, onde os gomos se juntam — o que distingue "papel colado" de
 *  uma cúpula lisa de borracha. */
const ALTURA_NO = 0.06 * ALTURA_CORPO
const LARGURA_NO = 0.08 * LARGURA_CORPO
/** Bico do balão, o apliqué decorativo — NUNCA labareda (ver cabeçalho). */
const ALTURA_RABICHO = 0.18 * ALTURA_CORPO
const ALTURA_TOTAL = ALTURA_NO + ALTURA_CORPO + ALTURA_RABICHO
/** Centro vertical da caixa inteira (nó + corpo + rabicho), em unidades
 *  locais com origem no ponto onde os gomos se juntam (y=0). Como o canvas
 *  de rasterização mede exatamente `ALTURA_TOTAL` de altura, o pixel central
 *  dele cai exatamente aqui — é essa igualdade que faz `drawImage` centrado
 *  bater com o centro do elemento sem nenhuma conta extra por quadro. */
const CENTRO_Y = (ALTURA_CORPO + ALTURA_RABICHO - ALTURA_NO) / 2

/**
 * Seis gomos não são um revolve 3D — são um leque 2D, e a curvatura que
 * "engana" o olho vem de projetar os meridianos de uma esfera (longitude de
 * -90° a 90°) num plano: `sin(longitude)` dá o deslocamento horizontal de
 * cada costura. A costura central (longitude 0°) desce reta; as duas
 * costuras da silhueta (±90°) SÃO a borda esquerda/direita do balão inteiro.
 * O efeito colateral é o que
 * `docs/superpowers/referencias/2026-08-20-arte-junina.md` pediu à mão
 * (gomos da borda mais estreitos que os do centro) sair de graça da
 * trigonometria, sem tabela chutada por gomo: a diferença entre senos
 * consecutivos já encolhe perto das pontas.
 */
const N_GOMOS = 6
function seloEm(indice: number): number {
  const longitude = (indice / N_GOMOS - 0.5) * Math.PI
  return Math.sin(longitude) * (LARGURA_CORPO / 2)
}
/** As 7 costuras que delimitam os 6 gomos — `SELOS[i]`/`SELOS[i+1]` são as
 *  bordas esquerda/direita do gomo `i`. */
const SELOS = Array.from({ length: N_GOMOS + 1 }, (_, i) => seloEm(i))

/**
 * Caminho SVG de UM gomo: duas curvas quadráticas partindo do mesmo ponto
 * (o nó, topo) e chegando no mesmo ponto (o bico, base) — uma vesica, não um
 * revolve. `Q` (quadrática) e não a cúbica que
 * `docs/superpowers/referencias/2026-08-20-arte-junina.md` sugeriu: o
 * ponto de controle único tem solução fechada para "a curva passa por
 * (bulge, ALTURA_EQUADOR) na metade do trajeto" — `cy = 2·ALTURA_EQUADOR −
 * 0,5·ALTURA_CORPO`, a mesma álgebra de Bézier quadrática de sempre — e sem
 * a folga extra de dois pontos de controle não há como a curva "escorregar"
 * do equador pretendido.
 */
const CY_CONTROLE = 2 * ALTURA_EQUADOR - 0.5 * ALTURA_CORPO
function caminhoGomo(bulgeEsquerda: number, bulgeDireita: number): string {
  return (
    `M 0 0 ` +
    `Q ${2 * bulgeEsquerda} ${CY_CONTROLE} 0 ${ALTURA_CORPO} ` +
    `Q ${2 * bulgeDireita} ${CY_CONTROLE} 0 0 Z`
  )
}
/** Centro horizontal aproximado do gomo `i` — usado como eixo de giro no
 *  estouro e como sinal (esquerda/direita) do espalhamento. */
function centroXGomo(indice: number): number {
  return (SELOS[indice]! + SELOS[indice + 1]!) / 2
}
/** Ordem de preenchimento, de trás para frente: os dois gomos da borda
 *  (mais estreitos, mais em sombra) primeiro, os dois quase-frontais depois,
 *  os dois de frente por último — a mesma ordem que uma pintura de objeto
 *  redondo usa, e o que faz a costura do gomo de frente sobrepor a do
 *  vizinho em vez do contrário. */
const ORDEM_DESENHO = [0, 5, 1, 4, 2, 3] as const

// ── Cor de cada gomo ───────────────────────────────────────────────────
//
// Vermelho, dourado, verde, vermelho, azul-casa, dourado — 2× vermelho, 2×
// dourado, 1× verde, 1× azul, a paleta culturalmente codificada de festa
// junina (nunca roxo, rosa ou neon). O azul é o único ponto frio, a amarração
// de marca deliberada e rara — não mais um primário.

type FamiliaCor = { sombra: string; base: string; destaque: string }
const VERMELHO: FamiliaCor = { sombra: '#5C1A12', base: '#D93A2B', destaque: '#F08A63' }
const DOURADO: FamiliaCor = { sombra: '#7A4A08', base: '#FFB020', destaque: '#FFE08A' }
const VERDE: FamiliaCor = { sombra: '#0E4A30', base: '#1E8F5F', destaque: '#6FD9A6' }
const AZUL: FamiliaCor = { sombra: '#155F80', base: '#38BDF8', destaque: '#A8E4FF' }
const FAMILIA_POR_GOMO: readonly FamiliaCor[] = [VERMELHO, DOURADO, VERDE, VERMELHO, AZUL, DOURADO]
/** 1 = totalmente de frente, mais claro; menos que 1 = gomo da borda, um
 *  pouco puxado para a própria sombra — a superfície curva se afasta da luz
 *  e do olho ao mesmo tempo. Não é o gomo mais escuro do desenho (isso
 *  continua sendo o topo de cada gradiente, ver `gradienteGomo`) — é só o
 *  gomo, como um todo, mais próximo da própria sombra que da própria luz. */
const FRONTALIDADE_POR_GOMO = [0.55, 0.8, 1, 1, 0.8, 0.55] as const

/**
 * Cores REALMENTE desenhadas nos dois gomos centrais — índices 2 (verde) e 3
 * (vermelho) em `FAMILIA_POR_GOMO`, os únicos com `FRONTALIDADE_POR_GOMO`
 * igual a 1 — mais o acento do tema (`PALETA.destaque`, usado no apliqué do
 * bico, na marca do alvo em foco e na rajada de acerto). Frontalidade 1
 * significa escurecimento de borda ZERO (`(1 − 1⁵) × FATOR_ESCURECIMENTO_BORDA
 * = 0`, ver `gradienteGomo`), então `.base` destes dois gomos é o hex puro da
 * família — nenhuma mistura escondida entre este export e o pixel de tela.
 *
 * EXPORTADO só para `tests/unit/contraste.test.ts` medir as cores que o
 * balão de fato desenha, em vez de copiar hex para dentro do teste — uma
 * cópia sai de sincronia se a paleta mudar de novo (foi exatamente esse
 * descompasso, com `#FFB020` e o extinto `#1F232B`, que deixou o gate de
 * contraste da WCAG 1.4.11 descrevendo uma peça que não existe mais).
 */
export const CORES_CONTRASTE = {
  gomoCentralVerde: VERDE.base,
  gomoCentralVermelho: VERMELHO.base,
  acento: PALETA.destaque,
} as const

function paraRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function paraHex([r, g, b]: readonly [number, number, number]): string {
  const canal = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')
  return `#${canal(r)}${canal(g)}${canal(b)}`
}
/** Interpola dois hex — usada só para puxar os gomos da borda em direção à
 *  própria sombra (`FRONTALIDADE_POR_GOMO`). Sem biblioteca de cor: o
 *  repositório não tem uma, e a conta inteira é três linhas. */
function misturar(a: string, b: string, t: number): string {
  const [ar, ag, ab] = paraRgb(a)
  const [br, bg, bb] = paraRgb(b)
  return paraHex([ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t])
}

/**
 * Pra onde a borda escurece — um neutro quase-preto, não a sombra do PRÓPRIO
 * matiz de cada gomo.
 *
 * ACHADO DA REVISÃO (rodada de correção 1): a versão anterior misturava cada
 * stop com `familia.sombra` — a sombra do PRÓPRIO matiz. A sombra do
 * dourado (`#7A4A08`) já é clara comparada com a sombra do verde
 * (`#0E4A30`), então misturar dourado com a sombra dele mesmo mantinha
 * dourado claro não importa a frontalidade — o matiz dominava a leitura de
 * brilho, a posição não. Medido pela revisão: vermelho central ~85 de
 * luminância, verde central ~110, contra dourado da borda ~161–167 — mais
 * claro que os DOIS centrais, o oposto do que a régua pede. Misturar com um
 * neutro escuro em vez da sombra do próprio matiz é o que faz a borda
 * escurecer por IGUAL não importa a cor embaixo.
 */
const NEUTRO_ESCURO_BORDA = '#120D09'
/**
 * Curva de escurecimento por posição — côncava (`frontalidade⁹`), não
 * linear, e calibrada por medição de pixel de verdade, não só a olho.
 *
 * A primeira tentativa (`(1 − frontalidade) × 1,3`, linear) escureceu os
 * dois gomos MAIS extremos (frontalidade 0,55) o bastante, mas deixou os
 * dois quase-frontais (frontalidade 0,8, o dourado "edge-adjacent" que a
 * revisão mediu em ~161–167) praticamente intocados — a fração linear em
 * 0,8 é pequena demais (0,2) pra vencer o quanto o dourado já nasce claro.
 * Medido depois do primeiro ajuste: dourado em frontalidade 0,8 ainda saía
 * a ~144 de luminância, mais claro que os DOIS gomos centrais (verde ~130,
 * vermelho ~103) — o defeito persistia, só um degrau mais fraco.
 *
 * A curva côncava (`frontalidade³` na época) resolveu ISSO: mesmo o gomo
 * quase-frontal (0,8) já levava uma fração substancial do escurecimento
 * máximo. Mas o EXPOENTE 5 + FATOR 0,85 que saiu dali ficou bom demais —
 * escureceu a MISTURA inteira até um ponto em que a maioria dos pixels do
 * balão passou a cair mais perto do stop `sombra` de QUALQUER família do
 * que do `base`, não só do próprio: o diagnóstico de densidade
 * (`docs/superpowers/referencias/2026-08-20-junina-diagnostico.md` §4)
 * mediu ~73% dos pixels do balão mais perto de sombra contra ~26% de base —
 * a pista de volume sobreviveu, mas o objeto inteiro passou a ler como
 * mancha escura, o oposto de "vivid and contrasting"
 * (`docs/superpowers/referencias/2026-08-20-arte-junina.md` §1).
 *
 * ACHADO DA RODADA DE DENSIDADE (2026-08): script de medição descartável
 * (`scripts/_tmp-medir-balao.mts`, rodado num Chromium real — Path2D e
 * gradiente de verdade, não jsdom) isolou a causa: o próprio gradiente
 * vertical, mesmo SEM nenhum escurecimento de borda, já lê ~27,5% "sombra"
 * por POSIÇÃO — o stop `base` só existia num único ponto (55%) da barra em
 * vez de ocupar uma faixa. Duas mudanças resolvem os dois problemas juntas:
 * `EXPOENTE_FRONTALIDADE` subiu de 5 para 9 (curva ainda mais íngreme perto
 * de frontalidade=1 — os quatro gomos não-centrais continuam escurecendo o
 * bastante pra ficar abaixo dos dois centrais, com MAIS folga que antes, não
 * menos) e `FATOR_ESCURECIMENTO_BORDA` desceu de 0,85 para 0,75 (o pico de
 * mistura é mais raso). A segunda mudança — `PONTO_BASE_INICIO`/
 * `PONTO_BASE_FIM` abaixo, um platô em vez de um único ponto — é quem faz a
 * diferença de verdade: o hex `base` (sem mistura nenhuma nos dois gomos
 * centrais) passa a valer por 70% da altura do corpo em vez de um instante
 * só, então mesmo um gomo central sem NENHUM escurecimento de borda lê como
 * "cor vívida" na maior parte da própria extensão, não só numa linha fina no
 * meio de uma rampa contínua sombra→destaque.
 *
 * MEDIDO DEPOIS (mesmo script, 4 famílias × 3 stops, todo pixel do balão
 * classificado pelo stop DECLARADO mais próximo — a mesma metodologia do
 * diagnóstico): sombra 50,3% / base 48,7% / destaque 1,1% — de "3 em 4
 * pixels em sombra" para praticamente meio a meio. A pista de volume não só
 * sobreviveu como GANHOU folga: vermelho central (o mais escuro dos dois
 * centrais) mede ~92 de luminância contra dourado borda-adjacente (o mais
 * claro dos quatro não-centrais) em ~73 — 19 pontos de margem, quase o
 * DOBRO dos ~9 pontos que a configuração antiga tinha entre dourado
 * borda-adjacente (~77) e vermelho central (~86). Ver o relatório da tarefa
 * para a tabela completa de candidatos testados.
 *
 * POR QUE ISSO TUDO DEU 9 E POR QUE 9 ESTAVA ERRADO (2026-08-21). Subir o
 * expoente de 5 para 9 nao "escurece os nao-centrais com mais folga": deixa
 * o penhasco mais ingreme, e `frontalidade ** 9` some para qualquer gomo que
 * nao esteja quase de frente. Na pratica quatro dos seis gomos ficavam ~75%
 * misturados no neutro, e dourado #FFB020 chegava a tela como oliva, azul
 * #38BDF8 como petroleo. O commit que fez isso se chamava "balao le vivido,
 * nao mais mancha de sombra"; ele aprofundou exatamente a mancha que dizia
 * remover.
 *
 * A medicao nao pegou porque media a coisa errada. Classificar cada pixel
 * pelo stop DECLARADO mais proximo descreve o FORMATO do gradiente, nao a
 * cor que chega na tela: o escurecimento e aplicado aos tres stops, entao um
 * pixel pode estar coladinho no stop `base` enquanto o proprio `base` ja foi
 * misturado 75% em marrom. "Meio a meio entre sombra e base" e um numero
 * saudavel num balao lavado e num balao vivido igualmente -- ele nao
 * distingue os dois casos, que e justamente o que se queria saber.
 *
 * Havia um sintoma independente apontando para ca e ele foi lido como
 * problema de teste: `acharAlvoEmZonaProibida` (tests/e2e/ativacoes.spec.ts)
 * parou de conseguir achar alvo nenhum porque o #FFB020 renderizado media
 * rgb(64,44,13). Aquilo nao era um detector mal calibrado. Era a arte sendo
 * esmagada, medida em pixel, por um teste que estava certo.
 *
 * O criterio que vale daqui pra frente e OLHAR: a peca isolada em varios
 * tamanhos E a cena inteira no raio de jogo, sobre o fundo real. Nenhum
 * agregado de pixel classificado por proximidade de stop substitui isso.
 */
const EXPOENTE_FRONTALIDADE = 2.2
/** Fração de mistura no ponto mais escuro (`frontalidade→0`). Não é 1
 *  (misturaria até o neutro puro) — sobra um pouco da cor original mesmo no
 *  limite, pra nenhum gomo virar uma silhueta lisa sem matiz nenhum. Descido
 *  de 0,85 pra 0,75 na rodada de densidade — ver o comentário de
 *  `EXPOENTE_FRONTALIDADE` acima para a medição completa. */
const FATOR_ESCURECIMENTO_BORDA = 0.32
/** Quanto a borda ACENDE — ver `calorBorda` em `gradienteGomo`. */
const CALOR_BORDA = 0.3
/** O ambar do papel aceso por tras. Nunca branco: branco leria plastico. */
const AMBAR_TRANSLUCIDO = '#FFC061'
/** Onde o platô do stop `base` COMEÇA e TERMINA, fração da altura do corpo
 *  (nó=0, bico=1). Era um único ponto (55%) — um gradiente contínuo de
 *  sombra a destaque passando por UM instante de cor pura. Virou uma faixa
 *  plana (10%–80%): a cor declarada da família aparece sem NENHUMA mistura
 *  ao longo de 70% da altura do gomo, e só os dois extremos (perto do nó,
 *  perto do bico) continuam em transição — mais parede lisa de cor vívida,
 *  menos rampa contínua. Ver `EXPOENTE_FRONTALIDADE` acima para a medição
 *  que motivou a troca. */
const PONTO_BASE_INICIO = 0.1
const PONTO_BASE_FIM = 0.8

/**
 * O gradiente de UM gomo — vertical, nó (topo) a bico (base). NÃO é o
 * gradiente esquerda-direita que uma primeira leitura de
 * `docs/superpowers/referencias/2026-08-20-arte-junina.md` sugeriria:
 * aquele documento supõe luz vindo de cima-esquerda, e a decisão
 * que rege ESTA tarefa (a régua do briefing, que é quem manda aqui) é outra
 * — fonte de luz única, de BAIXO, porque o calor do balão é o brilho interno
 * do papel, não um sol. Duas fontes de luz brigando é o segundo erro mais
 * comum que a régua cita, então a escolha é: o topo (mais longe do brilho)
 * fica na própria sombra, a base (mais perto do bico, onde o brilho mora)
 * fica no tom mais claro — nunca o inverso, e nunca as duas ao mesmo tempo.
 *
 * O escurecimento de borda (posição) e o gradiente vertical (luz) são dois
 * eixos independentes, aplicados um por cima do outro nos três stops — ver
 * `NEUTRO_ESCURO_BORDA` acima pra por que o primeiro não pode ser "misturar
 * com a própria sombra".
 */
function gradienteGomo(
  pincel: CanvasRenderingContext2D,
  familia: FamiliaCor,
  frontalidade: number,
): CanvasGradient {
  const gradiente = pincel.createLinearGradient(0, 0, 0, ALTURA_CORPO)
  const escurecimento = (1 - frontalidade ** EXPOENTE_FRONTALIDADE) * FATOR_ESCURECIMENTO_BORDA
  // LUZ de borda, nao SOMBRA de borda.
  //
  // O balao lia como lama, e a causa era aritmetica. Com expoente 9,
  // `frontalidade ** 9` some para qualquer gomo que nao esteja quase de
  // frente: quatro dos seis ficavam ~75% misturados no neutro escuro, e as
  // cores-base (dourado #FFB020, azul #38BDF8) chegavam a tela como oliva e
  // petroleo. Nunca foi paleta ruim -- a paleta nao chegava a tela.
  //
  // O sinal tambem estava invertido. Escurecer a silhueta e sombreamento de
  // fundo CLARO; sobre #08090C ele dissolve o balao no ceu. Papel com fogo
  // dentro faz o contrario: a borda que se afasta fica FINA e acende por
  // transparencia. Dai o gomo de borda ganhar calor em vez de perder luz.
  const calorBorda = (1 - frontalidade) ** 1.6 * CALOR_BORDA
  const q = (cor: string): string =>
    misturar(misturar(cor, NEUTRO_ESCURO_BORDA, escurecimento), AMBAR_TRANSLUCIDO, calorBorda)
  const sombraAjustada = q(familia.sombra)
  const baseAjustada = q(familia.base)
  const destaqueAjustado = q(familia.destaque)
  gradiente.addColorStop(0, sombraAjustada)
  gradiente.addColorStop(PONTO_BASE_INICIO, baseAjustada)
  // Mesmo stop de cor, um segundo ponto mais adiante — é o que abre o platô
  // (ver o comentário de `PONTO_BASE_INICIO`/`PONTO_BASE_FIM` acima). Entre
  // os dois pontos o Canvas 2D não interpola nada: é o mesmo valor dos dois
  // lados, então a cor fica CHAPADA nessa faixa em vez de continuar em rampa
  // até o próximo stop.
  gradiente.addColorStop(PONTO_BASE_FIM, baseAjustada)
  gradiente.addColorStop(1, destaqueAjustado)
  return gradiente
}

// ── Bico (apliqué decorativo — nunca chama, ver cabeçalho) ───────────────

function caminhoPetala(largura: number, altura: number): string {
  const meiaLargura = largura / 2
  return `M 0 0 Q ${meiaLargura} ${altura * 0.4} 0 ${altura} Q ${-meiaLargura} ${altura * 0.4} 0 0 Z`
}

/**
 * ACHADO DA REVISÃO (rodada de correção 1): a camada interna usava
 * `PALETA.destaque` (`#FFB020`) — um salto de ~140 de luminância sobre a
 * camada externa. Duas camadas, a de fora escura e a de dentro num dourado
 * bem mais claro, é exatamente o vocabulário visual de "brasa com núcleo
 * quente" — não importa que a régua peça só duas camadas planas sem
 * labareda: o CONTRASTE entre elas é que lê como fogo, e o dourado cheio
 * tinha esse contraste. Aqui a camada interna é uma variação morna da
 * própria externa — mistura, não salto de matiz —, então o par de camadas
 * para de compor um núcleo quente e volta a ler como o apliqué de papel
 * dessaturado que a régua pede. */
const BICO_EXTERNO = '#B23A1F'
const BICO_INTERNO = misturar(BICO_EXTERNO, '#D9855A', 0.55)

function desenharBico(pincel: CanvasRenderingContext2D): void {
  const largura = LARGURA_CORPO * 0.3
  const altura = ALTURA_RABICHO
  pincel.save()
  pincel.translate(0, ALTURA_CORPO)
  // 15° fora do prumo — twist artesanal, não peça de vetor perfeitamente
  // centrada.
  pincel.rotate((15 * Math.PI) / 180)
  pincel.fillStyle = BICO_EXTERNO // dessaturado de propósito: NÃO é o tom de uma chama acesa
  pincel.fill(new Path2D(caminhoPetala(largura, altura)))
  pincel.save()
  pincel.translate(0, -altura * 0.12)
  pincel.scale(0.55, 0.55)
  pincel.fillStyle = BICO_INTERNO // morno, não brilhante — ver o comentário acima
  pincel.fill(new Path2D(caminhoPetala(largura, altura)))
  pincel.restore()
  pincel.restore()
}

// ── Sprite do balão: rasterizado uma vez, reaproveitado por `drawImage` ──

/** Pixels locais por unidade, em densidade 1 — supersampling generoso para o
 *  sprite ficar nítido mesmo reduzido a ~24px de tela. */
const ESCALA_RASTER = 2
/** Acima de 2 o ganho de nitidez é invisível e o custo de rasterizar dobra —
 *  mesmo teto que `CapaJogo.tsx` já usa para o `devicePixelRatio`. */
const LIMITE_DPR = 2

function dprAtual(): number {
  const bruto = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  return Math.min(bruto, LIMITE_DPR)
}

function rasterizarBalao(dpr: number): HTMLCanvasElement | null {
  // Sem `document` (SSR) ou sem `Path2D` (Node/jsdom de teste — ver
  // cabeçalho do arquivo): não há como rasterizar. Quem chama cai para o
  // traçado vetorial direto.
  if (typeof document === 'undefined' || typeof Path2D === 'undefined') return null

  const escala = ESCALA_RASTER * dpr
  const tela = document.createElement('canvas')
  tela.width = Math.max(1, Math.ceil(LARGURA_CORPO * escala))
  tela.height = Math.max(1, Math.ceil(ALTURA_TOTAL * escala))
  const pincel = tela.getContext('2d')
  if (!pincel) return null

  pincel.scale(escala, escala)
  // Origem em (0,0) = o ponto onde os gomos se juntam em cima. Tudo abaixo
  // desenha em torno disso; nó fica em y negativo, bico em y > ALTURA_CORPO.
  pincel.translate(LARGURA_CORPO / 2, ALTURA_NO)

  // BRILHO INTERNO — luz de baixo, parada, nunca tremulante (ver cabeçalho:
  // isto substitui a chama, não a imita). Um radial simples, sem
  // `shadowBlur`: o gradiente já é o "borrão".
  //
  // RAIO CONTIDO DE PROPÓSITO (ciclo de olhar original): 0,6×ALTURA_CORPO
  // vazava até a borda dura do canvas de rasterização e lia como "esqueceu
  // de limpar o fundo".
  //
  // CENTRO AFASTADO DO BICO (ACHADO DA REVISÃO, rodada de correção 1): a
  // versão anterior centrava em 0,97×ALTURA_CORPO — praticamente em cima do
  // bico — com alpha 0,45. A dupla "halo quente" + "apliqué de duas cores
  // logo atrás dele" lia como brasa ou vela acesa, mesmo cada peça sozinha
  // respeitando a letra da régua (duas camadas planas, sem terceira camada
  // de chama). O par é que compunha o problema, não uma peça isolada. Aqui
  // o centro sobe pro corpo (0,80×ALTURA_CORPO, bem acima da junção com o
  // bico em 1,0×ALTURA_CORPO) e o raio/alpha encolhem — o brilho passa a
  // reforçar o gradiente vertical dos próprios gomos (que já escurece pro
  // topo e clareia pro bico, ver `gradienteGomo`) como uma segunda pincelada
  // suave, em vez de formar um ponto de luz separado bem onde o bico está.
  // Verificado a olho em raio=24 e raio=48 — ver relatório da tarefa.
  const brilho = pincel.createRadialGradient(
    0, ALTURA_CORPO * 0.8, 0,
    0, ALTURA_CORPO * 0.8, ALTURA_CORPO * 0.1,
  )
  brilho.addColorStop(0, 'rgba(255, 200, 145, 0.22)')
  brilho.addColorStop(1, 'rgba(255, 200, 145, 0)')
  pincel.fillStyle = brilho
  pincel.beginPath()
  pincel.arc(0, ALTURA_CORPO * 0.8, ALTURA_CORPO * 0.1, 0, Math.PI * 2)
  pincel.fill()

  for (const indice of ORDEM_DESENHO) {
    const caminho = new Path2D(caminhoGomo(SELOS[indice]!, SELOS[indice + 1]!))
    pincel.fillStyle = gradienteGomo(pincel, FAMILIA_POR_GOMO[indice]!, FRONTALIDADE_POR_GOMO[indice]!)
    pincel.fill(caminho)
  }

  // Costuras: tom quente escuro a 45% — NUNCA preto puro, que é a marca de
  // contorno de clipart sobre papel-e-cola (ver régua do briefing). Era 70%
  // até o segundo ciclo do olhar (relatório da tarefa): ampliado, o balão
  // lia como se tivesse contorno duro demais, quase preto, em toda costura
  // — o mesmo tell que a régua pede pra evitar, só que com uma cor que não
  // é literalmente `#000`. 45% deixa a linha companheira do gradiente, não
  // competindo com ele.
  pincel.strokeStyle = 'rgba(42, 23, 16, 0.45)'
  pincel.lineWidth = 0.9
  for (let i = 0; i <= N_GOMOS; i++) {
    pincel.stroke(new Path2D(`M 0 0 Q ${2 * SELOS[i]!} ${CY_CONTROLE} 0 ${ALTURA_CORPO}`))
  }

  // LUZ DE DENTRO. O brilho de cima e desenhado ANTES dos gomos, entao eles o
  // cobrem por inteiro e ele so aparece FORA do corpo: aquilo e auroela, nunca
  // luz interna. Este aqui e recortado na silhueta e SOMADO por cima -- e o
  // que faz o papel acender, que e a coisa mais caracteristica de um balao
  // junino e, sobre fundo escuro, o que separa o balao do ceu.
  pincel.save()
  pincel.clip(new Path2D(caminhoGomo(SELOS[0]!, SELOS[N_GOMOS]!)))
  pincel.globalCompositeOperation = 'lighter'
  const luz = pincel.createRadialGradient(
    0, ALTURA_CORPO * 0.86, 0,
    0, ALTURA_CORPO * 0.86, ALTURA_CORPO * 0.62,
  )
  luz.addColorStop(0, 'rgba(255, 184, 100, 0.55)')
  luz.addColorStop(0.45, 'rgba(255, 146, 64, 0.22)')
  luz.addColorStop(1, 'rgba(255, 120, 40, 0)')
  pincel.fillStyle = luz
  pincel.fillRect(-LARGURA_CORPO, -ALTURA_CORPO, LARGURA_CORPO * 2, ALTURA_CORPO * 2.4)
  pincel.restore()

  // Nó do topo: o gomo mais longe do brilho, sem gradiente — é o ponto mais
  // em sombra do balão inteiro, e é ele (não uma cúpula lisa) que diz
  // "papel amarrado", não "borracha".
  pincel.fillStyle = '#2A1710'
  pincel.beginPath()
  pincel.ellipse(0, -ALTURA_NO * 0.5, LARGURA_NO / 2, ALTURA_NO * 0.5, 0, 0, Math.PI * 2)
  pincel.fill()

  desenharBico(pincel)

  return tela
}

let spriteBalaoCache: { dpr: number; tela: HTMLCanvasElement } | null = null
function garantirSpriteBalao(dpr: number): HTMLCanvasElement | null {
  if (spriteBalaoCache && spriteBalaoCache.dpr === dpr) return spriteBalaoCache.tela
  const tela = rasterizarBalao(dpr)
  if (tela) spriteBalaoCache = { dpr, tela }
  return tela
}

/** Os 6 `Path2D` dos gomos, sozinhos — memorizados uma vez e reaproveitados
 *  pelo estouro (ver cabeçalho: "reaproveitando os próprios caminhos de
 *  gomo"). `undefined` = ainda não tentou; `null` = tentou e o ambiente não
 *  tem `Path2D` (mesma defesa de `rasterizarBalao`). */
let caminhosGomosCache: readonly Path2D[] | null | undefined
function obterCaminhosGomos(): readonly Path2D[] | null {
  if (caminhosGomosCache !== undefined) return caminhosGomosCache
  if (typeof Path2D === 'undefined') {
    caminhosGomosCache = null
    return null
  }
  caminhosGomosCache = Array.from({ length: N_GOMOS }, (_, i) =>
    new Path2D(caminhoGomo(SELOS[i]!, SELOS[i + 1]!)),
  )
  return caminhosGomosCache
}

// ── Traçado vetorial de reserva (sem `Path2D`/contexto — ver cabeçalho) ──

function desenharBalaoVetorial(pincel: CanvasRenderingContext2D, largura: number, altura: number): void {
  const meiaLargura = largura / 2
  pincel.beginPath()
  pincel.moveTo(0, -altura / 2)
  pincel.quadraticCurveTo(meiaLargura, -altura * 0.1, 0, altura / 2)
  pincel.quadraticCurveTo(-meiaLargura, -altura * 0.1, 0, -altura / 2)
  pincel.closePath()
  pincel.fillStyle = PALETA.elemento
  pincel.fill()
}

// ── Balanço ────────────────────────────────────────────────────────────

/** Fração de `raio` que cada eixo pode oscilar. `0,24² + 0,144² ≈ 0,28² <
 *  0,3²` por construção — a folga de segurança do teste (metade dos 0,6 de
 *  `TOLERANCIA − 1` do motor) nunca é alcançada mesmo no pior caso em que os
 *  dois senos batem no pico ao mesmo tempo, e essa é uma prova analítica,
 *  não uma amostragem que só checou não ter visto passar do limite. */
const AMPLITUDE_X = 0.24
const AMPLITUDE_Y = 0.144

export function deslocamentoBalanco(agora: number, raio: number): { dx: number; dy: number } {
  // Períodos diferentes em x e y (900ms vs 650ms, com uma defasagem de fase)
  // para o balanço não desenhar uma elipse fechada e previsível — um balão
  // pendurado balança em duas frequências que batem, não em círculo.
  const dx = Math.sin(agora / 900) * raio * AMPLITUDE_X
  const dy = Math.sin(agora / 650 + 1.3) * raio * AMPLITUDE_Y
  return { dx, dy }
}

// ── Auxiliares de animação ────────────────────────────────────────────

function limitar01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

/** `easeOutBack` canônica (Penner/easings.net) — mesma fórmula que
 *  `CapaJogo.tsx` já usa para o "pop" de nascimento do alvo circular. */
function easeOutBack(t: number): number {
  const c1 = 1.70158
  const c3 = c1 + 1
  const x = t - 1
  return 1 + c3 * x * x * x + c1 * x * x
}

// ── Elemento ───────────────────────────────────────────────────────────

/**
 * Largura visual do balão como múltiplo do `raio` abstrato do motor.
 *
 * ACHADO DA REVISÃO (rodada de correção 1): 1,7 media só o estado ESTÁVEL
 * (`nascimento=1`, sem estouro). `easeOutBack` ultrapassa 1 em TODO
 * nascimento — não é bug, é a curva —, e o harness da primeira rodada só
 * renderizou `nascimento=1`, já depois da janela de ultrapassagem: nada viu
 * o pior instante de verdade. Composto — ultrapassagem do pop × largura ×
 * balanço, no mesmo instante — o raio=24 chegava a 45,4px contra 38,4px de
 * tolerância (1,6×raio): 18% pra fora. Essa é a mesma classe de defeito que
 * já custou um Crítico nesta rota (alvo visível que engole o clique), então
 * a composição — não um termo isolado — é o que tem que caber.
 *
 * 1,3 foi achado por varredura numérica (script fora do repositório, ver
 * relatório) testando o PIOR CASO composto — não a aparência isolada — em
 * toda a janela de entrada e toda a fase do balanço. Com o amortecimento do
 * balanço abaixo, dá pior caso 33,74px contra 38,40px: 12% de folga real, e
 * o mesmo percentual em qualquer `raio` (a relação é invariante de escala).
 * `tests/unit/ativacoes-tema.test.ts` prende esse número por varredura, não
 * por amostra pontual — ver `extensaoElemento`/`escalaPopDoNascimento`
 * abaixo, as mesmas funções que o teste chama. */
const FATOR_LARGURA = 1.3

/** `easeOutBack` aplicada ao `nascimento`, e travada em 0 por baixo — a
 *  MESMA conta que `desenharElemento` usa pra achar a escala do pop.
 *  Exportada para o teste da tolerância de acerto nunca duplicar esta
 *  fórmula: testar uma cópia da conta não prende o código de verdade. */
export function escalaPopDoNascimento(nascimento: number): number {
  return Math.max(0, easeOutBack(limitar01(nascimento)))
}

/**
 * Largura/altura de destino do sprite pra um `raio` e uma escala combinada
 * (`escalaPop × escalaVida`) — a MESMA conta que `desenharElemento` usa pra
 * posicionar o `drawImage`. Exportada pelo mesmo motivo de
 * `escalaPopDoNascimento`: o teste da tolerância de acerto precisa da
 * extensão RENDERIZADA de verdade, não de uma fórmula reescrita à parte que
 * pode divergir da implementação com o tempo.
 */
export function extensaoElemento(raio: number, escala: number): { largura: number; altura: number } {
  const largura = raio * FATOR_LARGURA * escala
  const altura = (largura / LARGURA_CORPO) * ALTURA_TOTAL
  return { largura, altura }
}

function desenharElemento(
  pincel: CanvasRenderingContext2D,
  raio: number,
  vida: number,
  nascimento: number,
  agora: number,
  parado: boolean,
): void {
  const sprite = garantirSpriteBalao(dprAtual())

  // Sob `parado`: sem pop, sem encolhimento de fim de vida, sem balanço —
  // "constant radius", a mesma leitura que `CapaJogo.tsx` já dá ao alvo
  // circular sob `prefers-reduced-motion`. Nenhum dos três lê `agora`.
  const escalaPop = parado ? 1 : escalaPopDoNascimento(nascimento)
  const escalaVida = parado ? 1 : 0.55 + 0.45 * limitar01(vida)
  // AMORTECIMENTO NA ENTRADA (rodada de correção 1): o balanço nasce em 0 e
  // sobe junto com `nascimento`, em vez de já bater na amplitude cheia desde
  // o primeiro quadro. É o que desacopla os dois picos de risco — a
  // ultrapassagem do pop (perto de `nascimento≈0,85`) e o balanço no auge —
  // de acontecerem no mesmo instante: quando o pop está mais inchado, o
  // balanço ainda não chegou à força total. Sem amortecimento os dois picos
  // são livres pra coincidir (o balanço não sabe que acabou de nascer), e é
  // essa coincidência que fura a tolerância.
  const fatorBalanco = parado ? 0 : limitar01(nascimento)
  const balancoBruto = parado ? { dx: 0, dy: 0 } : deslocamentoBalanco(agora, raio)
  const deslocamento = { dx: balancoBruto.dx * fatorBalanco, dy: balancoBruto.dy * fatorBalanco }
  const alpha = parado ? 1 : 0.4 + 0.6 * limitar01(vida)

  const { largura: larguraDestino, altura: alturaDestino } = extensaoElemento(raio, escalaPop * escalaVida)

  pincel.save()
  pincel.translate(deslocamento.dx, deslocamento.dy)
  pincel.globalAlpha = alpha
  if (sprite) {
    pincel.drawImage(sprite, -larguraDestino / 2, -alturaDestino / 2, larguraDestino, alturaDestino)
  } else {
    desenharBalaoVetorial(pincel, larguraDestino, alturaDestino)
  }
  pincel.restore()
}

// ── Alvo ativo ─────────────────────────────────────────────────────────

function desenharAlvoAtivo(
  pincel: CanvasRenderingContext2D,
  raio: number,
  agora: number,
  parado: boolean,
): void {
  // Respiração leve, nunca tremulação de chama — e nem essa respiração sob
  // `parado`, que é o que a doc do tipo passou a exigir (ver tipos.ts):
  // uma marca de foco existe para ORIENTAR quem navega por teclado, não
  // para chamar atenção sozinha, e "anima sempre" e "respeita a preferência"
  // eram duas leituras igualmente válidas do tipo antigo até esta função
  // fixar qual delas vale.
  const respiro = parado ? 0 : Math.sin(agora / 500) * 0.06
  const raioMarca = raio * (1.7 + respiro)

  pincel.save()
  pincel.beginPath()
  pincel.arc(0, 0, raioMarca, 0, Math.PI * 2)
  pincel.strokeStyle = PALETA.destaque
  pincel.lineWidth = 2
  pincel.setLineDash([5, 4])
  pincel.stroke()
  pincel.setLineDash([])
  pincel.restore()
}

// ── Estouro: a costura se separando ───────────────────────────────────

/** Um giro final distinto por gomo — nunca a mesma velocidade angular em
 *  todos, que é a marca de "um sprite reaproveitado seis vezes" em vez de
 *  seis cacos de verdade (ver
 *  `docs/superpowers/referencias/2026-08-20-arte-junina.md` §4).
 *
 *  Ajustado no segundo ciclo do olhar (relatório da tarefa): a primeira
 *  versão girava cada gomo em torno do PRÓPRIO centro, mas o gomo inteiro
 *  atravessa quase toda a altura do corpo — a ponta mais distante do centro
 *  fica a ~80 unidades dele —, então até um giro modesto varria um arco
 *  enorme na ponta e o estouro já parecia totalmente espalhado em 10% do
 *  progresso. Os ângulos aqui saíram pela metade do que estavam, e passam a
 *  crescer com `progresso²` (ver `desenharEstouro`), não `progresso` — o
 *  giro começa quase parado e acelera, em vez de já nascer girando rápido. */
const ANGULOS_QUEDA = [-2.0, 1.3, -2.6, 2.3, -1.5, 2.0] as const
/** Quão longe cada gomo se espalha, em fração da própria distância ao eixo
 *  central — os gomos da borda, mais longe do eixo, voam mais longe. */
const FATOR_ESPALHAR = 0.9
/** Queda em fração de `ALTURA_CORPO`, crescendo com o quadrado do progresso
 *  — aceleração, não velocidade constante. */
const FATOR_QUEDA = 0.55
/** Cada caco encolhe um pouco ao cair (para 68% no fim) — reforça a leitura
 *  de fragmento se afastando da câmera, e reduz ainda mais o alcance visual
 *  da ponta longe do pivô que motivou o ajuste acima. */
const ENCOLHIMENTO_CACO = 0.32

function desenharEstouroVetorial(pincel: CanvasRenderingContext2D, raio: number, alpha: number, p: number): void {
  for (let i = 0; i < N_GOMOS; i++) {
    const sinal = i < N_GOMOS / 2 ? -1 : 1
    const x = sinal * raio * 0.5 * p
    const y = raio * 0.6 * p * p
    pincel.beginPath()
    pincel.arc(x, y, raio * 0.18, 0, Math.PI * 2)
    pincel.globalAlpha = alpha
    pincel.fillStyle = FAMILIA_POR_GOMO[i]!.base
    pincel.fill()
  }
}

function desenharEstouro(pincel: CanvasRenderingContext2D, raio: number, progresso: number): void {
  const p = limitar01(progresso)
  // Some a partir de 60% do trajeto — os cacos dissolvem no ar; nunca
  // "pousam" (ver `docs/superpowers/referencias/2026-08-20-arte-junina.md`
  // §4: sem plano de chão, sem colisão).
  const alpha = p < 0.6 ? 1 : Math.max(0, 1 - (p - 0.6) / 0.4)
  if (alpha <= 0) return

  const caminhos = obterCaminhosGomos()
  if (!caminhos) {
    desenharEstouroVetorial(pincel, raio, alpha, p)
    return
  }

  const escala = (raio * FATOR_LARGURA) / LARGURA_CORPO

  for (let i = 0; i < N_GOMOS; i++) {
    const centroX = centroXGomo(i)
    const centroY = ALTURA_EQUADOR
    const sinal = centroX === 0 ? (i < N_GOMOS / 2 ? -1 : 1) : Math.sign(centroX)
    // `p ** 1.3`: o espalhamento horizontal também começa um pouco contido
    // (velocidade de saída não é instantânea) em vez de saltar de 0 a pleno
    // vapor entre o primeiro e o segundo quadro.
    const deslocX = sinal * Math.abs(centroX) * FATOR_ESPALHAR * p ** 1.3
    const deslocY = FATOR_QUEDA * ALTURA_CORPO * p * p
    // Progresso ao quadrado — ver o comentário de `ANGULOS_QUEDA`: o giro
    // precisa nascer quase parado, não já em velocidade máxima.
    const angulo = ANGULOS_QUEDA[i]! * p * p
    const escalaCaco = 1 - ENCOLHIMENTO_CACO * p

    pincel.save()
    pincel.scale(escala, escala)
    // Recentra a caixa inteira (nó+corpo+bico) na origem — o mesmo ponto
    // que `drawImage` usa para o balão parado, para o estouro começar
    // exatamente onde o balão estava, não um quadro adiante.
    pincel.translate(0, -CENTRO_Y)
    pincel.translate(deslocX, deslocY)
    // Gira (e encolhe) em torno do próprio centro do gomo, não do nó —
    // senão cada caco balançaria pendurado pela ponta, não voaria como
    // fragmento solto.
    pincel.translate(centroX, centroY)
    pincel.rotate(angulo)
    pincel.scale(escalaCaco, escalaCaco)
    pincel.translate(-centroX, -centroY)
    pincel.globalAlpha = alpha
    pincel.fillStyle = FAMILIA_POR_GOMO[i]!.base
    pincel.fill(caminhos[i]!)
    pincel.restore()
  }
}

// ── Fundo: bandeirinhas em duas fileiras, fogueira, xadrez, chapéu, brasas ──
//
// Reescrito na rodada de densidade (2026-08): o diagnóstico
// (`docs/superpowers/referencias/2026-08-20-junina-diagnostico.md`) mediu
// 3,3% dos pixels do quadro tematizados — uma faixa fina de bandeirinha
// presa ao topo e um punhado de brasas quase invisíveis, o resto preto puro
// — contra um teto que o próprio briefing original já chamava de
// deliberadamente esparso. `docs/superpowers/referencias/2026-08-20-junina-referencias.md`
// é a régua desta reescrita: bandeirinha em duas fileiras com balanço
// independente por bandeira, uma fogueira animada, xadrez e chapéu de palha
// estáticos nas margens, uma vinheta morna sobre o preto quase puro — tudo
// mantendo a COLUNA CENTRAL (`emColunaCentral` abaixo) livre de qualquer
// elemento novo E de qualquer movimento novo, porque é onde vivem o título,
// o CTA e o próprio jogo.

const CORES_BANDEIRINHA = ['#D93A2B', '#FFB020', '#38BDF8', '#1E8F5F', '#F5F3EF'] as const
/** Straw/tan da régua de densidade §2 — chapéu de palha, nunca usado em
 *  nenhum outro elemento (é a única cor nova que não já existia em
 *  `PALETA`/`CORES_BANDEIRINHA`). */
const COR_PALHA = '#C79A56'
const COR_PALHA_SOMBRA = '#8F6C3C'

/**
 * Fração da largura do canvas, medida a partir de cada borda, que fica
 * PROIBIDA para qualquer elemento novo e qualquer movimento novo — a régua
 * (`2026-08-20-junina-referencias.md` §3) fala em "center 40% width", ou
 * seja 30% de cada lado até o centro. Bandeirinha já existia de ponta a
 * ponta antes desta reescrita (mantido: cortar o fio ao meio pra abrir um
 * buraco no centro seria pior que uma bandeirinha parada ali) — o que muda é
 * que NENHUMA bandeira cujo pé cai dentro desta faixa balança, não importa
 * `parado`. Fogueira, xadrez e chapéu nascem fora dela por construção (ver
 * as frações de posição de cada um), então não precisam consultar isto.
 */
const COLUNA_CENTRAL_INICIO_FRAC = 0.3
const COLUNA_CENTRAL_FIM_FRAC = 0.7
function emColunaCentral(xPx: number, largura: number): boolean {
  return xPx >= largura * COLUNA_CENTRAL_INICIO_FRAC && xPx <= largura * COLUNA_CENTRAL_FIM_FRAC
}

/**
 * Pseudo-aleatório determinístico por índice — NUNCA `Math.random` (mesma
 * disciplina do arquivo inteiro, e de `components/landing/arte.tsx`: a arte
 * não pode mudar a cada build/SSR). Não é hash criptográfico, é o truque
 * clássico de ruído procedural "pobre": a parte fracionária de um `sin` com
 * frequência alta já não tem relação visível com o índice de entrada, então
 * dois índices vizinhos (duas bandeirinhas lado a lado, duas línguas de
 * chama) saem de fase sem precisar de uma tabela nem de uma semente extra
 * pra carregar. Determinístico quer dizer: mesmo índice, mesmo resultado,
 * sempre — é o que faz cada bandeirinha ter SEMPRE o mesmo período/fase de
 * balanço em toda visita, sem guardar estado nenhum.
 */
function pseudoAleatorio01(semente: number): number {
  const x = Math.sin(semente * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

// ── Bandeirinhas: duas fileiras, cada bandeira um sprite próprio ─────────
//
// Reescrito (régua de densidade §4): a versão anterior rasterizava a fileira
// INTEIRA — fio e bandeiras juntos — num único bitmap estático, ótimo pra
// uma faixa parada, errado agora que balanço é permitido (a fileira inteira
// balançando junto leria como bandeira de pano tremulando, não como
// bandeirinhas penduradas balançando cada uma no seu próprio ritmo). A
// correção é por-bandeira: rasteriza CADA COR uma vez (5 sprites, não 1 por
// fileira) e o quadro a quadro só transforma esse sprite já pronto —
// `save/translate/rotate/drawImage/restore`, o mesmo custo "barato" que o
// balanço do balão já paga (ver a tabela de custo da régua §3). O fio
// continua um traço quadrático recomputado por quadro (nunca rasterizado) —
// já era assim antes, e é o que permite a fileira de trás ceder mais que a
// de frente sem precisar de dois caminhos de fio guardados.

function caminhoBandeira(largura: number, altura: number): string {
  // Triângulo ápice-para-baixo, um pouco mais alto que largo (1,3:1) — lê
  // como pano cortado na diagonal; um triângulo equilátero lê como ícone de
  // bandeirola genérico
  // (`docs/superpowers/referencias/2026-08-20-arte-junina.md` §3).
  const meiaLargura = largura / 2
  return `M ${-meiaLargura} 0 L ${meiaLargura} 0 L 0 ${altura} Z`
}

/** Proporção altura:largura de UMA bandeira — igual pras duas fileiras, só
 *  o tamanho muda (`ConfigFileiraBandeirinha.escala`). */
const PROPORCAO_BANDEIRA = 1.3

function rasterizarBandeira(larguraPx: number, cor: string, dpr: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined' || typeof Path2D === 'undefined') return null
  if (larguraPx <= 0) return null
  const alturaPx = larguraPx * PROPORCAO_BANDEIRA
  const escala = ESCALA_RASTER * dpr
  const tela = document.createElement('canvas')
  tela.width = Math.max(1, Math.ceil(larguraPx * escala))
  tela.height = Math.max(1, Math.ceil(alturaPx * escala))
  const pincel = tela.getContext('2d')
  if (!pincel) return null
  pincel.scale(escala, escala)
  pincel.translate(larguraPx / 2, 0)
  pincel.fillStyle = cor
  pincel.fill(new Path2D(caminhoBandeira(larguraPx, alturaPx)))
  return tela
}

/** Um sprite por COR (5, não por fileira) — a fileira de trás reaproveita os
 *  mesmos sprites, só pede um tamanho de destino menor no `drawImage` (62%,
 *  ver `LINHA_FUNDO.escala`); reescalar um raster já pronto é de graça
 *  comparado a rasterizar um segundo conjunto. */
let spritesBandeiraCache: { larguraPx: number; dpr: number; porCor: Map<string, HTMLCanvasElement> } | null = null
function garantirSpriteBandeira(larguraPx: number, cor: string, dpr: number): HTMLCanvasElement | null {
  if (
    !spritesBandeiraCache ||
    spritesBandeiraCache.larguraPx !== larguraPx ||
    spritesBandeiraCache.dpr !== dpr
  ) {
    spritesBandeiraCache = { larguraPx, dpr, porCor: new Map() }
  }
  const cache = spritesBandeiraCache
  const existente = cache.porCor.get(cor)
  if (existente) return existente
  const nova = rasterizarBandeira(larguraPx, cor, dpr)
  if (nova) cache.porCor.set(cor, nova)
  return nova
}

/** Amplitude do balanço de CADA bandeira, em grau — a régua pede 4–6°. */
const AMPLITUDE_BALANCO_BANDEIRA_RAD = (5 * Math.PI) / 180
const PERIODO_BALANCO_BANDEIRA_MIN_MS = 1600
const PERIODO_BALANCO_BANDEIRA_VAR_MS = 800
function periodoBalancoBandeira(indice: number): number {
  return PERIODO_BALANCO_BANDEIRA_MIN_MS + pseudoAleatorio01(indice * 7 + 1) * PERIODO_BALANCO_BANDEIRA_VAR_MS
}
function faseBalancoBandeira(indice: number): number {
  return pseudoAleatorio01(indice * 13 + 5) * Math.PI * 2
}

type ConfigFileiraBandeirinha = {
  /**
   * Quanto a fileira RECUA. Não é enfeite de opacidade: é perspectiva
   * atmosférica. A bandeirinha é cenário parado e distante; o balão é o
   * jogo, aceso e perto. Com as duas em saturação cheia a decoração vencia
   * o objeto interativo, que é a hierarquia exatamente invertida — o que
   * grita na tela deve ser aquilo em que se clica.
   */
  opacidade: number
  /** Fração da altura do canvas onde o fio (sem vão) fica. */
  fracaoAlturaFio: number
  /** Quanto o vão do fio cede no meio, fração do passo entre bandeiras. */
  fracaoSag: number
  /** 1 = fileira da frente (tamanho pleno); a de trás usa 0,62 — DERIVADO da
   *  fileira da frente, nunca um clamp próprio, pra nunca inverter numa
   *  tela fora do comum (régua §4). */
  escala: number
  /** Deslocamento no ciclo de 5 cores — a de trás começa 2 posições à
   *  frente, pra nunca cair na mesma cor na mesma posição x que a de frente
   *  (a marca de "uma fileira duplicada", não "duas fileiras de verdade"). */
  deslocamentoCor: number
  /** Deslocamento no índice usado por `periodoBalancoBandeira`/
   *  `faseBalancoBandeira` — evita que a bandeira `i` da fileira de trás
   *  balance EXATAMENTE em fase com a bandeira `i` da fileira da frente. */
  deslocamentoIndice: number
}

const LINHA_FRENTE: ConfigFileiraBandeirinha = {
  fracaoAlturaFio: 0.09,
  fracaoSag: 0.14,
  opacidade: 0.55,
  escala: 1,
  deslocamentoCor: 0,
  deslocamentoIndice: 0,
}
const LINHA_FUNDO: ConfigFileiraBandeirinha = {
  fracaoAlturaFio: 0.02,
  fracaoSag: 0.16,
  opacidade: 0.38,
  escala: 0.62,
  deslocamentoCor: 2,
  deslocamentoIndice: 1000,
}

function desenharFileiraBandeirinhas(
  pincel: CanvasRenderingContext2D,
  largura: number,
  altura: number,
  dpr: number,
  config: ConfigFileiraBandeirinha,
  agora: number,
  parado: boolean,
): void {
  // A fileira inteira num só `save`/`restore`: recuar bandeira por bandeira
  // custaria o mesmo e deixaria as sobreposições do vão com alfa dobrado.
  pincel.save()
  pincel.globalAlpha = config.opacidade
  // MENOR que antes (era min 34 / max 20 / 5% da largura). Duas fileiras de
  // bandeira grande ocupavam o topo inteiro e, somadas, eram o maior objeto
  // do quadro — maior que os balões, que são o jogo. Bandeirinha pendurada
  // longe também é pequena no olho: encolher é ao mesmo tempo a correção de
  // hierarquia e a leitura correta de profundidade.
  const larguraBandeiraFrente = Math.min(23, Math.max(14, largura * 0.033))
  const larguraBandeira = larguraBandeiraFrente * config.escala
  const alturaBandeira = larguraBandeira * PROPORCAO_BANDEIRA
  // O PASSO usa a largura da PRÓPRIA fileira — é o que preserva a razão de
  // 18% de vão entre bandeiras (medida real, régua §4) em qualquer escala,
  // em vez de a fileira de trás ficar mais apertada ou mais espaçada que a
  // de frente por acidente de conta.
  const passo = larguraBandeira * 1.18
  const yFio = altura * config.fracaoAlturaFio
  const nBandeiras = Math.ceil(largura / passo) + 1

  // O FIO NUNCA É RETO — cada vão cede num quadrático. Reto é "gerado", não
  // "pendurado": a gravidade é de graça para desenhar, e a ausência dela é
  // o que mais denuncia
  // (`docs/superpowers/referencias/2026-08-20-arte-junina.md` §3). O fio em
  // si NÃO balança (só as bandeiras penduradas nele) — manter o traço
  // parado é o que garante a coluna central sem NENHUM movimento sem
  // precisar recortar o caminho no meio do vão.
  pincel.strokeStyle = CORES_BANDEIRINHA[4]
  pincel.lineWidth = 1
  pincel.beginPath()
  pincel.moveTo(0, yFio)
  for (let x = passo; x <= largura + passo; x += passo) {
    const meio = x - passo / 2
    pincel.quadraticCurveTo(meio, yFio + passo * config.fracaoSag, x, yFio)
  }
  pincel.stroke()

  for (let i = 0; i < nBandeiras; i++) {
    const x = i * passo
    const cor = CORES_BANDEIRINHA[(i + config.deslocamentoCor) % CORES_BANDEIRINHA.length]!
    const sprite = garantirSpriteBandeira(larguraBandeiraFrente, cor, dpr)

    // A COLUNA CENTRAL NUNCA BALANÇA — nem sob movimento ligado. Uma
    // bandeirinha oscilando atrás do título é uma intrusão MAIOR que a
    // mesma forma parada (a visão periférica pega movimento antes de
    // forma), então isto zera o ângulo por POSIÇÃO, independente de
    // `parado` (que já zera por PREFERÊNCIA). Ver `emColunaCentral` acima.
    const indice = config.deslocamentoIndice + i
    const angulo =
      parado || emColunaCentral(x, largura)
        ? 0
        : AMPLITUDE_BALANCO_BANDEIRA_RAD *
          Math.sin(agora / periodoBalancoBandeira(indice) + faseBalancoBandeira(indice))

    pincel.save()
    pincel.translate(x, yFio)
    pincel.rotate(angulo)
    if (sprite) {
      pincel.drawImage(sprite, -larguraBandeira / 2, 0, larguraBandeira, alturaBandeira)
    } else {
      // Traçado vetorial de reserva — SEM `Path2D` (o sprite só falta
      // quando o ambiente também não tem `Path2D`, ver cabeçalho do
      // arquivo), mesma disciplina de `desenharBalaoVetorial`.
      const meiaLargura = larguraBandeira / 2
      pincel.beginPath()
      pincel.moveTo(-meiaLargura, 0)
      pincel.lineTo(meiaLargura, 0)
      pincel.lineTo(0, alturaBandeira)
      pincel.closePath()
      pincel.fillStyle = cor
      pincel.fill()
    }
    pincel.restore()
  }
  pincel.restore()
}

function desenharBandeirinhas(
  pincel: CanvasRenderingContext2D,
  largura: number,
  altura: number,
  dpr: number,
  agora: number,
  parado: boolean,
): void {
  // Fundo primeiro (menor, mais alto, cede mais) — ordem de pintura é a
  // pista de profundidade que a régua §3 pede em vez de blur.
  desenharFileiraBandeirinhas(pincel, largura, altura, dpr, LINHA_FUNDO, agora, parado)
  desenharFileiraBandeirinhas(pincel, largura, altura, dpr, LINHA_FRENTE, agora, parado)
}

// ── Fogueira: toras paradas + línguas de chama piscando + auréola aditiva ──
//
// Ganha o lugar duas vezes, per a régua §1/§5: tremulação é uma assinatura
// de reconhecimento que nenhum outro elemento deste vocabulário tem, e ela
// ANCORA a luz-de-baixo que o gradiente do próprio balão já assume
// (`gradienteGomo`: "fonte de luz única, de BAIXO") mas que, até esta
// reescrita, nada na cena de fato produzia. Nunca na coluna central (a
// posição é uma fração fixa da borda esquerda, longe da faixa 30–70%), e
// nunca sob o CTA/QR (que vivem na coluna de conteúdo, à direita do canto
// onde a fogueira mora).

const FOGUEIRA_X_FRAC = 0.09
const FOGUEIRA_Y_FRAC = 0.93
/** Raio de referência da fogueira inteira, fração do MENOR lado do canvas —
 *  pequena o bastante pra não competir com o placar/QR, grande o bastante
 *  pra ler como objeto e não como poeira (o defeito que o diagnóstico já
 *  mediu nas brasas isoladas, §3 do diagnóstico). */
const FOGUEIRA_RAIO_FRAC = 0.05

const COR_TRONCO = '#3D2A1C'
const COR_TRONCO_CLARO = '#5A4028'
/** O topo cortado da tora: mais claro que a casca, porque e madeira nova
 *  exposta, e e o contraste entre os dois que le como corte. */
const COR_GRAO_CLARO = '#8A6242'
const COR_GRAO_ESCURO = '#4A2E1E'

/** Duas toras cruzadas — a leitura mais rápida de "fogueira" sem uma pilha
 *  inteira de caminhos por um ganho de reconhecimento que a régua §5 item 2
 *  já não credita a mais que isso. `ellipse` nativo, sem `Path2D` — nunca
 *  precisa de fallback porque não depende de nada que falte em Node/jsdom
 *  além do próprio `getContext`, que quem chama já garantiu. */
/** Uma CAMADA da lenha por chamada, para o fogo poder ser desenhado ENTRE as
 *  duas. Com as toras todas antes das chamas, as linguas nasciam por cima da
 *  pilha e a fogueira lia como "fogo apoiado em cima de um tronco"; sai de
 *  DENTRO quando a tora da frente passa na frente da base da chama. */
function desenharTora(
  pincel: CanvasRenderingContext2D,
  raio: number,
  camada: 'tras' | 'frente',
): void {
  // TRACO COM PONTA REDONDA, nao elipse. Duas elipses achatadas cruzadas
  // liam como um oval marrom unico -- sem espessura, sem separacao entre as
  // pecas. Uma tora so se separa da outra se tiver corpo e se as PONTAS
  // aparecerem para fora do encontro.
  const meia = raio * 0.92
  const espessura = raio * 0.34
  // CRUZAMENTO FRANCO. Na primeira versao as duas quase se sobrepunham e o
  // par lia como uma viga horizontal so; o 'X' precisa de altura diferente
  // nas duas pontas para o olho separar as pecas.
  const traseira = camada === 'tras'
  const y0 = raio * (traseira ? 0.3 : 0.34)
  const y1 = raio * (traseira ? -0.16 : -0.2)
  const sinal = traseira ? -1 : 1
  const xInicio = sinal * meia
  const xFim = -sinal * meia * 0.82

  pincel.save()
  pincel.lineCap = 'round'
  pincel.lineWidth = espessura
  pincel.strokeStyle = traseira ? COR_TRONCO : COR_TRONCO_CLARO
  pincel.beginPath()
  pincel.moveTo(xInicio, y0)
  pincel.lineTo(xFim, y1)
  pincel.stroke()
  pincel.restore()

  // Topo cortado: dois circulos na ponta que fica virada para quem olha. E
  // este detalhe que faz o olho ler MADEIRA em vez de traco marrom.
  const grao = espessura * 0.42
  pincel.fillStyle = traseira ? COR_TRONCO : COR_GRAO_CLARO
  pincel.beginPath()
  pincel.arc(xInicio, y0, grao, 0, Math.PI * 2)
  pincel.fill()
  pincel.fillStyle = COR_GRAO_ESCURO
  pincel.beginPath()
  pincel.arc(xInicio, y0, grao * 0.46, 0, Math.PI * 2)
  pincel.fill()
}


/** Raio da auréola em múltiplos do raio da fogueira. CURTO de propósito —
 *  ver o comentário da auréola em `desenharFogueira`. */
const RAIO_AUREOLA_FRAC = 1.55

/** A auréola assada num sprite: um gradiente radial quente, opaco no centro
 *  e caindo a zero na borda, para nunca ter o corte seco que o `arc` de alfa
 *  uniforme tinha. Assada uma vez por (dpr, raio) e só escalada por quadro. */
let spriteAureolaCache: { chave: string; tela: HTMLCanvasElement } | null = null
function garantirSpriteAureola(dpr: number, raio: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null
  const lado = Math.max(1, Math.ceil(raio * RAIO_AUREOLA_FRAC * 2 * dpr))
  const chave = `${dpr}:${lado}`
  if (spriteAureolaCache && spriteAureolaCache.chave === chave) return spriteAureolaCache.tela
  const tela = document.createElement('canvas')
  tela.width = lado
  tela.height = lado
  const p = tela.getContext('2d')
  if (!p) return null
  const meio = lado / 2
  const g = p.createRadialGradient(meio, meio, 0, meio, meio, meio)
  g.addColorStop(0, 'rgba(255, 138, 43, 0.55)')
  g.addColorStop(0.45, 'rgba(232, 84, 47, 0.18)')
  g.addColorStop(1, 'rgba(232, 84, 47, 0)')
  p.fillStyle = g
  p.fillRect(0, 0, lado, lado)
  spriteAureolaCache = { chave, tela }
  return tela
}

/** Sprite de UMA língua de chama — reaproveita `caminhoPetala`, a MESMA
 *  forma de vesica/pétala que o bico do balão já usa (régua §5 item 2: "the
 *  same family the balão's bico already uses"), com o mesmo par
 *  externo-escuro/interno-claro que `desenharBico` já pinta — só que
 *  rasterizado num sprite PRÓPRIO (não desenhado direto), porque cada
 *  língua precisa da própria transformação por quadro (escala vertical +
 *  leve rotação), e transformar um sprite já pronto é o técnica "barata" da
 *  régua §3 — recomputar o `Path2D` a cada quadro não seria. */
function rasterizarLinguaChama(dpr: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined' || typeof Path2D === 'undefined') return null
  const largura = 22
  const altura = 36
  const escala = ESCALA_RASTER * dpr
  const tela = document.createElement('canvas')
  tela.width = Math.max(1, Math.ceil(largura * escala))
  tela.height = Math.max(1, Math.ceil(altura * escala))
  const pincel = tela.getContext('2d')
  if (!pincel) return null
  pincel.scale(escala, escala)
  // A ORIGEM VAI PARA O TOPO DO SPRITE, não para o rodapé.
  //
  // `caminhoPetala` desenha de `M 0 0` PARA BAIXO, até `0 altura` (é a mesma
  // função que `desenharBico` usa para pendurar o rabicho ABAIXO do corpo do
  // balão). Com a origem no rodapé (`translate(largura/2, altura)`), a pétala
  // caía inteira fora do canvas — de `y=altura` a `y=2·altura` — e era
  // descartada no recorte. O que sobrava visível era só a lasca de baixo do
  // núcleo claro, que é por que a fogueira lia como "três tiquinhos amarelos"
  // por mais que se aumentasse `alturaChama`: o sprite chegava ~86% cortado
  // antes de qualquer escala.
  pincel.translate(largura / 2, 0)
  const caminho = caminhoPetala(largura * 0.85, altura)
  pincel.fillStyle = PALETA.brasa
  pincel.fill(new Path2D(caminho))
  pincel.save()
  // O núcleo quente mora na METADE DE BAIXO da língua: é onde o fogo é mais
  // claro. Deslocado para dentro para não vazar pelo topo do sprite.
  pincel.translate(0, altura * 0.2)
  pincel.scale(0.58, 0.6)
  pincel.fillStyle = PALETA.destaque
  pincel.fill(new Path2D(caminho))
  pincel.restore()
  return tela
}

let spriteLinguaChamaCache: { dpr: number; tela: HTMLCanvasElement } | null = null
function garantirSpriteLinguaChama(dpr: number): HTMLCanvasElement | null {
  if (spriteLinguaChamaCache && spriteLinguaChamaCache.dpr === dpr) return spriteLinguaChamaCache.tela
  const tela = rasterizarLinguaChama(dpr)
  if (tela) spriteLinguaChamaCache = { dpr, tela }
  return tela
}

type LinguaChama = { deslocamentoXFrac: number; escala: number; indice: number }
/** Três línguas — o teto de baixo da régua §5 item 2 ("2–3 flame-tongue
 *  sprites"), cada uma com o próprio período/fase via
 *  `pseudoAleatorio01(indice)`, nunca em fase umas com as outras (a mesma
 *  regra de "vizinhos fora de fase" que as bandeirinhas já seguem, e pela
 *  mesma razão: tremulação em uníssono lê como UM sprite reaproveitado, não
 *  como três línguas de verdade). */
const LINGUAS_CHAMA: readonly LinguaChama[] = [
  { deslocamentoXFrac: -0.32, escala: 0.82, indice: 0 },
  { deslocamentoXFrac: 0.04, escala: 1, indice: 1 },
  { deslocamentoXFrac: 0.34, escala: 0.78, indice: 2 },
]
const PERIODO_TREMULACAO_MIN_MS = 420
const PERIODO_TREMULACAO_VAR_MS = 380
function periodoTremulacao(indice: number): number {
  return PERIODO_TREMULACAO_MIN_MS + pseudoAleatorio01(indice * 17 + 3) * PERIODO_TREMULACAO_VAR_MS
}
function faseTremulacao(indice: number): number {
  return pseudoAleatorio01(indice * 23 + 11) * Math.PI * 2
}

function desenharFogueira(
  pincel: CanvasRenderingContext2D,
  largura: number,
  altura: number,
  dpr: number,
  agora: number,
  parado: boolean,
): void {
  const menorLado = Math.min(largura, altura)
  const raio = menorLado * FOGUEIRA_RAIO_FRAC
  const cx = largura * FOGUEIRA_X_FRAC
  const cy = altura * FOGUEIRA_Y_FRAC

  pincel.save()
  pincel.translate(cx, cy)

  // AURÉOLA. Era um `arc` preenchido com rgba de alfa uniforme, raio 2,5× o
  // fogo. Alfa uniforme somado sobre #08090C dá o MESMO tom em toda a área e
  // termina num corte seco: o resultado não lia como luz, lia como um disco
  // marrom de borda dura — mancha, não brilho. Luz de verdade cai com a
  // distância, então precisa de gradiente; e o raio precisa ser CURTO com o
  // centro forte, senão a energia se espalha fina demais para levantar o
  // preto do fundo (um disco largo de alfa 0,15 soma ~38 no vermelho e
  // resolve para algo como rgb(46,25,16) — mais escuro que a própria brasa
  // que ele deveria estar iluminando).
  //
  // O sprite é assado UMA vez e só escalado por quadro, o que preserva o
  // motivo de o código antigo evitar gradiente: nada de `createRadialGradient`
  // dentro do laço de animação.
  const tAureola = parado ? 0.5 : (Math.sin(agora / 900) + 1) / 2
  const aureola = garantirSpriteAureola(dpr, raio)
  if (aureola) {
    const escala = 1 + tAureola * 0.12
    const lado = raio * RAIO_AUREOLA_FRAC * 2 * escala
    pincel.save()
    pincel.globalCompositeOperation = 'lighter'
    pincel.drawImage(aureola, -lado / 2, -raio * 0.3 - lado / 2, lado, lado)
    pincel.restore()
  }

  desenharTora(pincel, raio, 'tras')

  const sprite = garantirSpriteLinguaChama(dpr)
  for (const lingua of LINGUAS_CHAMA) {
    const oscilacao = parado ? 0.5 : (Math.sin(agora / periodoTremulacao(lingua.indice) + faseTremulacao(lingua.indice)) + 1) / 2
    // `0,85 + 0,3·|...|` é a fórmula da régua §5 item 2 — reescrita aqui com
    // `oscilacao` já em 0..1 (via `(sin+1)/2`) em vez do valor absoluto de
    // `sin`, mesmo efeito, sem precisar de `Math.abs` separado.
    const escalaY = lingua.escala * (0.85 + oscilacao * 0.3)
    const angulo = parado ? 0 : ((3 * Math.PI) / 180) * Math.sin(agora / (periodoTremulacao(lingua.indice) * 0.6) + faseTremulacao(lingua.indice))

    // MAIOR que a lenha, nao menor. Na proporcao anterior as tres linguas
    // somavam uma fracao pequena da area da aureola e a fogueira lia como
    // "disco marrom com tres tiquinhos amarelos em cima". Numa fogueira o
    // fogo e o assunto; a lenha e o que sobra embaixo dele.
    const larguraChama = raio * 0.82 * lingua.escala
    const alturaChama = raio * 1.7 * lingua.escala

    pincel.save()
    // A base desce para DENTRO da pilha (y positivo = abaixo do centro): a
    // tora da frente, desenhada depois, cobre esse pedaço e a chama parece
    // brotar de entre as lenhas. Em -0,1 ela começava acima da lenha inteira;
    // em +0,24 a tora engolia a língua quase toda.
    pincel.translate(raio * lingua.deslocamentoXFrac, raio * 0.06)
    pincel.rotate(angulo)
    pincel.scale(1, escalaY)
    if (sprite) {
      pincel.drawImage(sprite, -larguraChama / 2, -alturaChama, larguraChama, alturaChama)
    } else {
      // Traçado vetorial de reserva — mesma disciplina de
      // `desenharBalaoVetorial`: sem `Path2D`, nunca um espaço mudo.
      pincel.beginPath()
      pincel.moveTo(0, -alturaChama)
      pincel.quadraticCurveTo(larguraChama / 2, -alturaChama * 0.5, 0, 0)
      pincel.quadraticCurveTo(-larguraChama / 2, -alturaChama * 0.5, 0, -alturaChama)
      pincel.fillStyle = PALETA.brasa
      pincel.fill()
    }
    pincel.restore()
  }

  // A tora da FRENTE só agora, por cima da base das chamas — é o que faz o
  // fogo sair de dentro da lenha em vez de repousar sobre ela.
  desenharTora(pincel, raio, 'frente')


  pincel.restore()
}

// ── Xadrez + chapéu de palha: acentos estáticos na margem direita ────────
//
// Régua §1/§5: xadrez é rank 2 de reconhecimento (mais rápido que
// bandeirinha pra quem já viu roupa/toalha junina), chapéu é rank 4 — os
// dois `[no motion]`, os dois ausentes da cena até esta reescrita. Rasteriza
// UMA VEZ por tamanho de tela (como a bandeirinha antiga fazia) porque não
// precisam se mexer — a densidade sozinha já cumpre o que a régua pede
// deles, e animar um xadrez é a própria régua chamando de "moiré" (§5
// item 1).

/** Mais estreita que antes (era 0,045). Ver `OPACIDADE_XADREZ`. */
const XADREZ_LARGURA_FRAC = 0.028
/** O xadrez recua pelo mesmo motivo da bandeirinha: uma coluna de altura
 *  inteira, em contraste máximo e quadros de 9px, era o segundo objeto mais
 *  barulhento do quadro e não se clica nela. Recuada, ela continua dando a
 *  pista de "toalha junina" sem disputar com o alvo. */
const OPACIDADE_XADREZ = 0.45
const XADREZ_QUADRO_PX = 9
const COR_XADREZ_A = PALETA.elemento
const COR_XADREZ_B = CORES_BANDEIRINHA[4]

function desenharChapeu(pincel: CanvasRenderingContext2D, raio: number): void {
  // Aba: elipse achatada, nativa — nenhuma dependência de `Path2D`.
  pincel.beginPath()
  pincel.ellipse(0, 0, raio, raio * 0.32, 0, 0, Math.PI * 2)
  pincel.fillStyle = COR_PALHA_SOMBRA
  pincel.fill()

  // Copa: triângulo simples com o topo levemente arredondado — silhueta de
  // cone, a pista de forma que a régua §1 credita como reconhecível mesmo
  // sem cor nenhuma.
  const larguraCopa = raio * 1.1
  const alturaCopa = raio * 1.15
  pincel.beginPath()
  pincel.moveTo(-larguraCopa / 2, 0)
  pincel.quadraticCurveTo(0, -alturaCopa * 1.08, larguraCopa / 2, 0)
  pincel.closePath()
  pincel.fillStyle = COR_PALHA
  pincel.fill()

  // Faixa na base da copa — o único toque de "feito à mão", dois tons
  // planos, nenhum gradiente.
  pincel.beginPath()
  pincel.ellipse(0, -raio * 0.05, larguraCopa * 0.42, raio * 0.09, 0, 0, Math.PI * 2)
  pincel.fillStyle = COR_PALHA_SOMBRA
  pincel.fill()
}

function rasterizarAcentosDireita(larguraPx: number, alturaPx: number, dpr: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null
  if (larguraPx <= 0 || alturaPx <= 0) return null
  const tela = document.createElement('canvas')
  tela.width = Math.max(1, Math.ceil(larguraPx * dpr))
  tela.height = Math.max(1, Math.ceil(alturaPx * dpr))
  const pincel = tela.getContext('2d')
  if (!pincel) return null
  pincel.scale(dpr, dpr)

  // Xadrez: faixa vertical dobrada na borda direita — tira de tecido, não
  // fundo inteiro (a régua §3 pede "a folded strip", não um preenchimento).
  const larguraXadrez = larguraPx * XADREZ_LARGURA_FRAC
  const xXadrez = larguraPx - larguraXadrez
  const nColunas = Math.max(1, Math.ceil(larguraXadrez / XADREZ_QUADRO_PX))
  const nLinhas = Math.max(1, Math.ceil(alturaPx / XADREZ_QUADRO_PX))
  pincel.save()
  pincel.globalAlpha = OPACIDADE_XADREZ
  for (let linha = 0; linha < nLinhas; linha++) {
    for (let coluna = 0; coluna < nColunas; coluna++) {
      pincel.fillStyle = (linha + coluna) % 2 === 0 ? COR_XADREZ_A : COR_XADREZ_B!
      pincel.fillRect(
        xXadrez + coluna * XADREZ_QUADRO_PX,
        linha * XADREZ_QUADRO_PX,
        XADREZ_QUADRO_PX,
        XADREZ_QUADRO_PX,
      )
    }
  }
  pincel.restore()

  // Chapéu: ancorado embaixo-à-direita, à esquerda da tira de xadrez —
  // nunca sobrepõe o QR (que vive dentro da coluna de conteúdo, terminando
  // bem antes de `xXadrez`).
  const raioChapeu = Math.min(larguraPx, alturaPx) * 0.052
  pincel.save()
  pincel.translate(xXadrez - raioChapeu * 1.6, alturaPx * 0.9)
  desenharChapeu(pincel, raioChapeu)
  pincel.restore()

  return tela
}

let spriteAcentosDireitaCache: { larguraPx: number; alturaPx: number; dpr: number; tela: HTMLCanvasElement } | null = null
function garantirSpriteAcentosDireita(larguraPx: number, alturaPx: number, dpr: number): HTMLCanvasElement | null {
  const cache = spriteAcentosDireitaCache
  if (cache && cache.larguraPx === larguraPx && cache.alturaPx === alturaPx && cache.dpr === dpr) return cache.tela
  const tela = rasterizarAcentosDireita(larguraPx, alturaPx, dpr)
  if (tela) spriteAcentosDireitaCache = { larguraPx, alturaPx, dpr, tela }
  return tela
}

// ── Vinheta morna: undertone sobre o preto quase puro ─────────────────────
//
// Régua §2/§3: o problema do `#08090C` não é ser escuro, é ser
// FOTOGRAFICAMENTE neutro — sem nada por perto estabelecendo calor, ele lê
// "boate/dashboard" antes de "arraiá ao entardecer". A correção NÃO troca o
// hex (decisão de sistema de design inteiro por um problema de uma
// página) — é uma vinheta radial, grande e quase transparente, pintada por
// cima. O `CanvasGradient` é cacheado por tamanho de tela e reaproveitado
// como `fillStyle` em todo quadro — construí-lo dentro do laço de desenho é
// exatamente a classe "cara" que a régua §3 pede pra evitar
// (`createRadialGradient` por quadro); reconstruí-lo só quando o tamanho
// muda é a mesma disciplina que todo sprite deste arquivo já segue.
let vinhetaCache: { largura: number; altura: number; gradiente: CanvasGradient } | null = null
function obterVinheta(pincel: CanvasRenderingContext2D, largura: number, altura: number): CanvasGradient | null {
  const cache = vinhetaCache
  if (cache && cache.largura === largura && cache.altura === altura) return cache.gradiente
  if (largura <= 0 || altura <= 0) return null
  const gradiente = pincel.createRadialGradient(
    largura * 0.5, altura * 0.85, 0,
    largura * 0.5, altura * 0.85, Math.max(largura, altura) * 0.75,
  )
  gradiente.addColorStop(0, 'rgba(255, 107, 53, 0.05)')
  gradiente.addColorStop(1, 'rgba(255, 107, 53, 0)')
  vinhetaCache = { largura, altura, gradiente }
  return gradiente
}

type SementeBrasa = {
  xFrac: number
  yFrac0: number
  faseMs: number
  velocidade: number
  amplitude: number
  periodoMs: number
  raioBase: number
}

/**
 * Lista fixa, nunca `Math.random` — mesma disciplina de
 * `components/landing/arte.tsx` (a arte não pode mudar a cada build). `x`
 * concentrado nos 25% externos de cada lado, `y` no terço de baixo do
 * quadro: o centro fica livre para o texto e o próprio jogo
 * (`docs/superpowers/referencias/2026-08-20-arte-junina.md` §3).
 *
 * EXPANDIDA de 10 pra 26 sementes na rodada de densidade (régua de
 * densidade §5 item 5: "raise the seed count, not the technique" — cada
 * brasa continua um círculo `[cheap]`, só a CONTAGEM sobe). As 10
 * originais permanecem intactas (primeiras 10 entradas); as 16 novas
 * seguem o mesmo viés de `xFrac`/`yFrac0` (margens externas, terço de
 * baixo) com `faseMs` variados.
 *
 * CORRIGIDO DE PASSAGEM (régua de densidade, addendum): a primeira semente
 * (`xFrac: 0.04`) tinha `faseMs: 0` — sob `prefers-reduced-motion`,
 * `desenharFundo` trava `tempo` em 0, e a fórmula de alfa
 * (`t < 0.1 ? t/0.1 : ...`) avalia `t=0` pra `alpha=0`: essa brasa
 * especificamente sumia por completo no quadro congelado, um acidente de
 * `faseMs`, não uma escolha (ver o comentário de `desenharBrasas`/
 * `desenharFundo` abaixo). Trocado pra `1500` — dentro da janela
 * 630–3150ms que a régua pede pra `alpha=1` no quadro parado — sem tocar
 * em mais nada da semente (posição, velocidade, período, raio idênticos).
 * As 16 sementes novas já nasceram com `faseMs` dentro dessa janela, pelo
 * mesmo motivo: nenhuma brasa nova devia repetir o mesmo acidente.
 */
const SEMENTES_BRASA: readonly SementeBrasa[] = [
  { xFrac: 0.04, yFrac0: 0.92, faseMs: 1500, velocidade: 10, amplitude: 4, periodoMs: 2600, raioBase: 1.6 },
  { xFrac: 0.10, yFrac0: 0.86, faseMs: 900, velocidade: 12, amplitude: 5, periodoMs: 3100, raioBase: 1.2 },
  { xFrac: 0.16, yFrac0: 0.95, faseMs: 1800, velocidade: 9, amplitude: 3, periodoMs: 2200, raioBase: 2.0 },
  { xFrac: 0.21, yFrac0: 0.89, faseMs: 2600, velocidade: 13, amplitude: 6, periodoMs: 3600, raioBase: 1.4 },
  { xFrac: 0.90, yFrac0: 0.9, faseMs: 400, velocidade: 11, amplitude: 4, periodoMs: 2900, raioBase: 1.8 },
  { xFrac: 0.84, yFrac0: 0.94, faseMs: 1300, velocidade: 8, amplitude: 5, periodoMs: 2500, raioBase: 1.3 },
  { xFrac: 0.94, yFrac0: 0.87, faseMs: 2100, velocidade: 14, amplitude: 3, periodoMs: 3300, raioBase: 1.6 },
  { xFrac: 0.79, yFrac0: 0.97, faseMs: 3000, velocidade: 10, amplitude: 6, periodoMs: 2000, raioBase: 1.1 },
  { xFrac: 0.07, yFrac0: 0.88, faseMs: 3400, velocidade: 12, amplitude: 4, periodoMs: 2700, raioBase: 1.9 },
  { xFrac: 0.87, yFrac0: 0.93, faseMs: 3800, velocidade: 9, amplitude: 5, periodoMs: 3400, raioBase: 1.5 },
  { xFrac: 0.03, yFrac0: 0.83, faseMs: 700, velocidade: 11, amplitude: 4, periodoMs: 2400, raioBase: 1.5 },
  { xFrac: 0.13, yFrac0: 0.98, faseMs: 1100, velocidade: 9, amplitude: 5, periodoMs: 3300, raioBase: 1.3 },
  { xFrac: 0.18, yFrac0: 0.84, faseMs: 1900, velocidade: 13, amplitude: 3, periodoMs: 2100, raioBase: 1.8 },
  { xFrac: 0.02, yFrac0: 0.96, faseMs: 2300, velocidade: 10, amplitude: 6, periodoMs: 2800, raioBase: 1.2 },
  { xFrac: 0.12, yFrac0: 0.91, faseMs: 2700, velocidade: 12, amplitude: 4, periodoMs: 3500, raioBase: 1.7 },
  { xFrac: 0.20, yFrac0: 0.82, faseMs: 3100, velocidade: 8, amplitude: 5, periodoMs: 2300, raioBase: 1.4 },
  { xFrac: 0.06, yFrac0: 0.99, faseMs: 1600, velocidade: 14, amplitude: 3, periodoMs: 3000, raioBase: 1.1 },
  { xFrac: 0.15, yFrac0: 0.85, faseMs: 2000, velocidade: 9, amplitude: 6, periodoMs: 2600, raioBase: 2.0 },
  { xFrac: 0.98, yFrac0: 0.83, faseMs: 800, velocidade: 11, amplitude: 4, periodoMs: 2700, raioBase: 1.6 },
  { xFrac: 0.82, yFrac0: 0.98, faseMs: 1200, velocidade: 13, amplitude: 5, periodoMs: 3200, raioBase: 1.3 },
  { xFrac: 0.96, yFrac0: 0.9, faseMs: 1700, velocidade: 8, amplitude: 3, periodoMs: 2200, raioBase: 1.9 },
  { xFrac: 0.77, yFrac0: 0.84, faseMs: 2400, velocidade: 12, amplitude: 6, periodoMs: 3400, raioBase: 1.2 },
  { xFrac: 0.92, yFrac0: 0.96, faseMs: 2900, velocidade: 10, amplitude: 4, periodoMs: 2500, raioBase: 1.7 },
  { xFrac: 0.99, yFrac0: 0.87, faseMs: 700, velocidade: 9, amplitude: 5, periodoMs: 3100, raioBase: 1.4 },
  { xFrac: 0.81, yFrac0: 0.91, faseMs: 1400, velocidade: 14, amplitude: 3, periodoMs: 2900, raioBase: 1.1 },
  { xFrac: 0.89, yFrac0: 0.83, faseMs: 3000, velocidade: 11, amplitude: 6, periodoMs: 2000, raioBase: 1.8 },
] as const
/** Duração de um ciclo de vida de uma brasa antes de reaparecer embaixo de
 *  novo — o "respawn" da deriva contínua descrita em
 *  `docs/superpowers/referencias/2026-08-20-arte-junina.md` §3. */
const VIDA_BRASA_MS = 4200

function desenharBrasas(pincel: CanvasRenderingContext2D, largura: number, altura: number, tempo: number): void {
  pincel.save()
  // Aditivo — a mesma técnica (composição, não filtro) que o brilho de
  // acerto do alvo circular já usa em `CapaJogo.tsx`. `lighter` é barato:
  // soma canal de cor, não recalcula borrão por pixel como `shadowBlur`.
  pincel.globalCompositeOperation = 'lighter'
  for (const semente of SEMENTES_BRASA) {
    const cicloBruto = (tempo + semente.faseMs) % VIDA_BRASA_MS
    const ciclo = cicloBruto < 0 ? cicloBruto + VIDA_BRASA_MS : cicloBruto
    const t = ciclo / VIDA_BRASA_MS
    const subidaPx = semente.velocidade * (ciclo / 1000)
    const oscilacao = Math.sin((tempo + semente.faseMs) / semente.periodoMs) * semente.amplitude
    const x = semente.xFrac * largura + oscilacao
    const y = semente.yFrac0 * altura - subidaPx
    const alpha = t < 0.1 ? t / 0.1 : t > 0.8 ? Math.max(0, (1 - t) / 0.2) : 1
    if (alpha <= 0) continue

    // Aura — segundo círculo, maior e mais transparente, sob o núcleo.
    pincel.beginPath()
    pincel.arc(x, y, semente.raioBase * 3.2, 0, Math.PI * 2)
    pincel.fillStyle = `rgba(255, 107, 53, ${0.4 * alpha})`
    pincel.fill()

    // Núcleo sólido.
    pincel.beginPath()
    pincel.arc(x, y, semente.raioBase, 0, Math.PI * 2)
    pincel.fillStyle = `rgba(255, 176, 32, ${alpha})`
    pincel.fill()
  }
  pincel.restore()
}

/**
 * Ordem de pintura — de trás pra frente, a mesma lógica de profundidade por
 * camada que a régua §3 pede em vez de blur:
 *
 * 1. Fundo sólido.
 * 2. Vinheta morna (tom, não forma — fica sob TUDO pra não lavar a cor de
 *    nenhum elemento por cima).
 * 3. Bandeirinhas (fileira de trás, depois a de frente — `desenharBandeirinhas`
 *    já ordena as duas).
 * 4. Acentos estáticos da margem direita (xadrez + chapéu) — textura de
 *    frisa, nunca compete com nada porque não se move e não fica sob texto.
 * 5. Fogueira — o elemento mais "vivo" do fundo, por cima dos acentos
 *    estáticos do lado esquerdo do quadro.
 * 6. Brasas — sempre por último, aditivas, por cima de tudo (era assim
 *    antes desta reescrita, mantido).
 *
 * `agora` só chega em `desenharBandeirinhas`/`desenharFogueira`/
 * `desenharBrasas` — as três coisas desta função que de fato animam. Sob
 * `parado`, as três recebem o sinal (ou, no caso das brasas, `tempo`
 * travado em 0) e nenhuma lê `agora` de verdade nesse caminho — sem isso,
 * "sem movimento" só desligaria o balanço do balão e deixaria o FUNDO
 * pulsando sozinho atrás dele, a mesma classe de descuido que a doc do tipo
 * já cobra da marca de foco.
 */
function desenharFundo(
  pincel: CanvasRenderingContext2D,
  largura: number,
  altura: number,
  agora: number,
  parado: boolean,
): void {
  pincel.fillStyle = PALETA.fundo
  pincel.fillRect(0, 0, largura, altura)

  const vinheta = obterVinheta(pincel, largura, altura)
  if (vinheta) {
    pincel.fillStyle = vinheta
    pincel.fillRect(0, 0, largura, altura)
  }

  const dpr = dprAtual()

  desenharBandeirinhas(pincel, largura, altura, dpr, agora, parado)

  const acentos = garantirSpriteAcentosDireita(largura, altura, dpr)
  if (acentos) {
    pincel.drawImage(acentos, 0, 0, largura, altura)
  }

  desenharFogueira(pincel, largura, altura, dpr, agora, parado)

  // `tempo` travado em 0 sob `parado` — mesma disciplina de sempre.
  desenharBrasas(pincel, largura, altura, parado ? 0 : agora)
}

// ── O tema ─────────────────────────────────────────────────────────────

export const junino: Tema = {
  id: 'junino',
  paleta: PALETA,
  desenharElemento,
  desenharAlvoAtivo,
  desenharEstouro,
  desenharFundo,
  chaveConvite: 'junino',
}
