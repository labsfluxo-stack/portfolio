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
 *  de um molde real (~0,52:1) para legibilidade a 24px. Ver arte-junina.md §2. */
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
 * O efeito colateral é o que arte-junina.md pediu à mão (gomos da borda mais
 * estreitos que os do centro) sair de graça da trigonometria, sem tabela
 * chutada por gomo: a diferença entre senos consecutivos já encolhe perto
 * das pontas.
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
 * revolve. `Q` (quadrática) e não a cúbica que arte-junina.md sugeriu: o
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
 * Curva de escurecimento por posição — côncava (`frontalidade³`), não
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
 * A curva côncava resolve isso: `1 − frontalidade³` cai rápido assim que
 * `frontalidade` sai de 1, então mesmo o gomo quase-frontal (0,8) já leva
 * uma fração substancial do escurecimento máximo, em vez de escalar
 * linearmente com a distância ao centro. Medido depois: dourado em 0,8 caiu
 * pra ~76, azul em 0,8 pra ~68 — os dois abaixo do vermelho central (~103) e
 * do verde central (~130), pela primeira vez com posição vencendo matiz nos
 * quatro gomos não-centrais, não só nos dois mais extremos.
 */
const EXPOENTE_FRONTALIDADE = 5
/** Fração de mistura no ponto mais escuro (`frontalidade→0`). Não é 1
 *  (misturaria até o neutro puro) — sobra um pouco da cor original mesmo no
 *  limite, pra nenhum gomo virar uma silhueta lisa sem matiz nenhum. */
const FATOR_ESCURECIMENTO_BORDA = 0.85

/**
 * O gradiente de UM gomo — vertical, nó (topo) a bico (base). NÃO é o
 * gradiente esquerda-direita que uma primeira leitura de arte-junina.md
 * sugeriria: aquele documento supõe luz vindo de cima-esquerda, e a decisão
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
  const sombraAjustada = misturar(familia.sombra, NEUTRO_ESCURO_BORDA, escurecimento)
  const baseAjustada = misturar(familia.base, NEUTRO_ESCURO_BORDA, escurecimento)
  const destaqueAjustado = misturar(familia.destaque, NEUTRO_ESCURO_BORDA, escurecimento)
  gradiente.addColorStop(0, sombraAjustada)
  gradiente.addColorStop(0.55, baseAjustada)
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
 *  seis cacos de verdade (ver arte-junina.md §4).
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
  // "pousam" (ver arte-junina.md §4: sem plano de chão, sem colisão).
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

// ── Fundo: bandeirinhas paradas + brasas em deriva ────────────────────

const CORES_BANDEIRINHA = ['#D93A2B', '#FFB020', '#38BDF8', '#1E8F5F', '#F5F3EF'] as const
/** Fração da altura do canvas que a faixa de bandeirinhas ocupa — string na
 *  parte de cima, pano pendurado logo abaixo. */
const FRACAO_FAIXA_BANDEIRINHAS = 0.12

function caminhoBandeira(largura: number, altura: number): string {
  // Triângulo ápice-para-baixo, um pouco mais alto que largo (1,3:1) — lê
  // como pano cortado na diagonal; um triângulo equilátero lê como ícone de
  // bandeirola genérico (arte-junina.md §3).
  const meiaLargura = largura / 2
  return `M ${-meiaLargura} 0 L ${meiaLargura} 0 L 0 ${altura} Z`
}

function rasterizarBandeirinhas(largura: number, altura: number, dpr: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined' || typeof Path2D === 'undefined') return null
  if (largura <= 0 || altura <= 0) return null

  const alturaFaixaCss = altura * FRACAO_FAIXA_BANDEIRINHAS * 1.5
  const tela = document.createElement('canvas')
  tela.width = Math.max(1, Math.ceil(largura * dpr))
  tela.height = Math.max(1, Math.ceil(alturaFaixaCss * dpr))
  const pincel = tela.getContext('2d')
  if (!pincel) return null
  pincel.scale(dpr, dpr)

  const larguraBandeira = Math.min(34, Math.max(20, largura * 0.05))
  const alturaBandeira = larguraBandeira * 1.3
  const passo = larguraBandeira * 1.18
  const yFio = altura * FRACAO_FAIXA_BANDEIRINHAS * 0.3
  const nBandeiras = Math.ceil(largura / passo) + 1

  // O FIO NUNCA É RETO — cada vão cede num quadrático. Reto é "gerado", não
  // "pendurado": a gravidade é de graça para desenhar, e a ausência dela é
  // o que mais denuncia (arte-junina.md §3).
  pincel.strokeStyle = CORES_BANDEIRINHA[4]
  pincel.lineWidth = 1
  pincel.beginPath()
  pincel.moveTo(0, yFio)
  for (let x = passo; x <= largura + passo; x += passo) {
    const meio = x - passo / 2
    pincel.quadraticCurveTo(meio, yFio + passo * 0.14, x, yFio)
  }
  pincel.stroke()

  for (let i = 0; i < nBandeiras; i++) {
    const x = i * passo
    pincel.save()
    pincel.translate(x, yFio)
    pincel.fillStyle = CORES_BANDEIRINHA[i % CORES_BANDEIRINHA.length]!
    pincel.fill(new Path2D(caminhoBandeira(larguraBandeira, alturaBandeira)))
    pincel.restore()
  }

  return tela
}

let spriteBandeirinhasCache: { largura: number; altura: number; dpr: number; tela: HTMLCanvasElement } | null = null
function garantirSpriteBandeirinhas(largura: number, altura: number, dpr: number): HTMLCanvasElement | null {
  const cache = spriteBandeirinhasCache
  if (cache && cache.largura === largura && cache.altura === altura && cache.dpr === dpr) return cache.tela
  const tela = rasterizarBandeirinhas(largura, altura, dpr)
  if (tela) spriteBandeirinhasCache = { largura, altura, dpr, tela }
  return tela
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
 * (arte-junina.md §3).
 */
const SEMENTES_BRASA: readonly SementeBrasa[] = [
  { xFrac: 0.04, yFrac0: 0.92, faseMs: 0, velocidade: 10, amplitude: 4, periodoMs: 2600, raioBase: 1.6 },
  { xFrac: 0.10, yFrac0: 0.86, faseMs: 900, velocidade: 12, amplitude: 5, periodoMs: 3100, raioBase: 1.2 },
  { xFrac: 0.16, yFrac0: 0.95, faseMs: 1800, velocidade: 9, amplitude: 3, periodoMs: 2200, raioBase: 2.0 },
  { xFrac: 0.21, yFrac0: 0.89, faseMs: 2600, velocidade: 13, amplitude: 6, periodoMs: 3600, raioBase: 1.4 },
  { xFrac: 0.90, yFrac0: 0.9, faseMs: 400, velocidade: 11, amplitude: 4, periodoMs: 2900, raioBase: 1.8 },
  { xFrac: 0.84, yFrac0: 0.94, faseMs: 1300, velocidade: 8, amplitude: 5, periodoMs: 2500, raioBase: 1.3 },
  { xFrac: 0.94, yFrac0: 0.87, faseMs: 2100, velocidade: 14, amplitude: 3, periodoMs: 3300, raioBase: 1.6 },
  { xFrac: 0.79, yFrac0: 0.97, faseMs: 3000, velocidade: 10, amplitude: 6, periodoMs: 2000, raioBase: 1.1 },
  { xFrac: 0.07, yFrac0: 0.88, faseMs: 3400, velocidade: 12, amplitude: 4, periodoMs: 2700, raioBase: 1.9 },
  { xFrac: 0.87, yFrac0: 0.93, faseMs: 3800, velocidade: 9, amplitude: 5, periodoMs: 3400, raioBase: 1.5 },
] as const
/** Duração de um ciclo de vida de uma brasa antes de reaparecer embaixo de
 *  novo — o "respawn" da deriva contínua descrita em arte-junina.md §3. */
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

function desenharFundo(
  pincel: CanvasRenderingContext2D,
  largura: number,
  altura: number,
  agora: number,
  parado: boolean,
): void {
  pincel.fillStyle = PALETA.fundo
  pincel.fillRect(0, 0, largura, altura)

  const dpr = dprAtual()
  const bandeirinhas = garantirSpriteBandeirinhas(largura, altura, dpr)
  if (bandeirinhas) {
    pincel.drawImage(bandeirinhas, 0, 0, largura, bandeirinhas.height / dpr)
  }

  // `tempo` travado em 0 sob `parado`: a brasa é a única coisa desta função
  // que lê `agora`. Sem travar aqui, "sem movimento" desligaria só o
  // balanço do balão e deixaria o fundo pulsando sozinho atrás dele — a
  // mesma classe de descuido que a doc do tipo já cobra da marca de foco.
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
