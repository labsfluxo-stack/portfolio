import type { Tema } from './tipos'
import {
  ALTURA_TOTAL,
  CORES_PAINEL_PUBLICAS,
  LARGURA_CORPO,
  desenharBalaoDeReserva,
  desenharCacosDeFaixa,
  desenharCorpoBalao,
} from './junino-balao'

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

/**
 * Cores REALMENTE desenhadas no balão — hoje as faixas de `junino-balao.ts`,
 * lidas de lá em vez de copiadas para cá.
 *
 * EXPORTADO só para `tests/unit/contraste.test.ts` medir as cores que o
 * balão de fato pinta. Ler do desenho em vez de copiar hex é o que impede o
 * gate de contraste de continuar descrevendo uma versão velha da peça — foi
 * exatamente esse descompasso que já deixou este gate falando de um balão
 * que não existia mais, e o redesenho para a forma real (faixas e boca
 * acesa, no lugar de gomos verticais) teria repetido o erro se estes hexes
 * estivessem escritos à mão aqui.
 */
export const CORES_CONTRASTE = {
  painelVermelho: CORES_PAINEL_PUBLICAS[0]!,
  painelAmarelo: CORES_PAINEL_PUBLICAS[1]!,
  painelAzul: CORES_PAINEL_PUBLICAS[2]!,
  painelCreme: CORES_PAINEL_PUBLICAS[3]!,
  painelVerde: CORES_PAINEL_PUBLICAS[4]!,
  painelLaranja: CORES_PAINEL_PUBLICAS[5]!,
  acento: PALETA.destaque,
} as const


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
  // traçado de reserva.
  if (typeof document === 'undefined' || typeof Path2D === 'undefined') return null

  const escala = ESCALA_RASTER * dpr
  const tela = document.createElement('canvas')
  tela.width = Math.max(1, Math.ceil(LARGURA_CORPO * escala))
  tela.height = Math.max(1, Math.ceil(ALTURA_TOTAL * escala))
  const pincel = tela.getContext('2d')
  if (!pincel) return null

  pincel.scale(escala, escala)
  // A origem vai para o ÁPICE do corpo, no meio da largura — é o sistema
  // em que `junino-balao.ts` desenha (ver o comentário de `caminhoCorpo`).
  pincel.translate(LARGURA_CORPO / 2, 0)
  desenharCorpoBalao(pincel)
  return tela
}

let spriteBalaoCache: { dpr: number; tela: HTMLCanvasElement } | null = null
function garantirSpriteBalao(dpr: number): HTMLCanvasElement | null {
  if (spriteBalaoCache && spriteBalaoCache.dpr === dpr) return spriteBalaoCache.tela
  const tela = rasterizarBalao(dpr)
  if (tela) spriteBalaoCache = { dpr, tela }
  return tela
}


// ── Traçado vetorial de reserva (sem `Path2D`/contexto — ver cabeçalho) ──

function desenharBalaoVetorial(
  pincel: CanvasRenderingContext2D,
  largura: number,
  altura: number,
): void {
  desenharBalaoDeReserva(pincel, largura, altura)
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
// Baixou de 1,3 quando o balao virou LANTERNA: a lanterna e bem mais alta
// que larga (1,8 contra 1,3 do desenho anterior), e a extensao desenhada
// tem de caber na tolerancia de acerto com folga — ver o teste de
// tolerancia em tests/unit/ativacoes-tema.test.ts, que mede a extensao
// RENDERIZADA e nao uma formula reescrita a parte.
const FATOR_LARGURA = 1.2

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
  // COLADO NO ALVO, não orbitando longe dele. Em 1,7 o anel media quase o
  // triplo do balão e, em traço cheio na cor de destaque, virava o objeto
  // mais barulhento do quadro — numa captura da partida ele dominava a tela
  // e fazia o balão parecer pequeno. Uma marca de foco existe para DIZER
  // onde o foco está, não para disputar atenção com aquilo que ela aponta.
  const raioMarca = raio * (1.22 + respiro)

  pincel.save()
  pincel.beginPath()
  pincel.arc(0, 0, raioMarca, 0, Math.PI * 2)
  pincel.strokeStyle = PALETA.destaque
  // Traço mais fino e translúcido pelo mesmo motivo do raio. O tracejado
  // fica: é ele que separa "marca de interface" de "parte do desenho".
  pincel.globalAlpha = 0.75
  pincel.lineWidth = 1.5
  pincel.setLineDash([4, 3])
  pincel.stroke()
  pincel.setLineDash([])
  pincel.restore()
}

// ── Estouro: a costura se separando ───────────────────────────────────

/**
 * O ESTOURO: as próprias FAIXAS do balão se separando.
 *
 * O estouro anterior despedaçava o balão em gomos verticais, porque era
 * essa a forma que o balão tinha. Um balão de faixas se rasga em faixas —
 * e é isso que amarra o efeito ao objeto, em vez de ser uma explosão
 * genérica desenhada por cima de qualquer coisa.
 *
 * A geometria dos cacos mora em `junino-balao.ts`, junto do desenho de onde
 * eles saem: se as faixas mudarem, o estouro muda junto sem ninguém
 * precisar lembrar de sincronizar dois arquivos.
 */
function desenharEstouro(
  pincel: CanvasRenderingContext2D,
  raio: number,
  progresso: number,
): void {
  const p = limitar01(progresso)
  // Some a partir de 60% do trajeto — os cacos dissolvem no ar; nunca
  // "pousam" (sem plano de chão, não há em que pousar).
  const alpha = p < 0.6 ? 1 : Math.max(0, 1 - (p - 0.6) / 0.4)
  if (alpha <= 0) return
  desenharCacosDeFaixa(pincel, raio, p, alpha)
}

/**
 * Vesica (pétala) — a forma das línguas de chama da fogueira.
 *
 * Vivia no apliqué do bico do balão, que deixou de existir quando o balão
 * ganhou a BOCA aberta que um balão junino de verdade tem. A função ficou:
 * a chama sempre foi o outro consumidor dela, e é dela que a fogueira
 * depende (ver `rasterizarLinguaChama`).
 */
function caminhoPetala(largura: number, altura: number): string {
  const meiaLargura = largura / 2
  return `M 0 0 Q ${meiaLargura} ${altura * 0.4} 0 ${altura} Q ${-meiaLargura} ${altura * 0.4} 0 0 Z`
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

/**
 * A bandeirinha: RETÂNGULO com um "V" invertido recortado na base.
 *
 * Era um triângulo de ápice para baixo — que é a forma de bandeirola
 * genérica de festa, não de bandeirinha de São João. A brasileira clássica
 * é um retângulo de papel de seda (molde tradicional: 10×15cm) com um "V"
 * recortado embaixo, e é esse recorte, com as duas pontas laterais
 * sobrando, que o olho reconhece de longe. Um triângulo não tem pontas
 * laterais: ele tem UMA ponta.
 *
 * Fonte da forma: molde tradicional descrito em
 * dicaspraticas.com.br/moldes-de-bandeirinhas-para-festa-junina e
 * terra.com.br (como fazer bandeirinha de festa junina).
 */
/**
 * As estampas de chita das bandeirinhas.
 *
 * A referência fotográfica em `public/` não tem UMA bandeira lisa: são todas
 * de pano estampado — estrela grande, sol, bolinhas, listras, retalhos
 * geométricos — e várias com recorte VAZADO, onde o desenho é o buraco e não
 * a tinta. Cor chapada, que era o que este arquivo desenhava, é bandeirola
 * de plástico de posto, não bandeirinha de São João.
 */
type EstampaBandeira = 'estrela' | 'sol' | 'bolinhas' | 'listras' | 'retalhos' | 'vazado'
/** Sete estampas contra cinco cores: comprimento primo em relação ao da
 *  paleta, então a combinação cor+estampa só se repete a cada 35 bandeiras —
 *  mais que cabe em qualquer fileira, e é o que impede a fileira de ler como
 *  padrão que se repete. */
const ESTAMPAS_BANDEIRA: readonly EstampaBandeira[] = [
  'estrela',
  'bolinhas',
  'sol',
  'retalhos',
  'listras',
  'vazado',
  'bolinhas',
]

function caminhoBandeira(largura: number, altura: number): string {
  const m = largura / 2
  // O corte sobe até 62% da altura: fundo demais come a bandeira inteira,
  // raso demais lê como retângulo com um arranhão.
  return `M ${-m} 0 L ${m} 0 L ${m} ${altura} L 0 ${altura * 0.68} L ${-m} ${altura} Z`
}

/**
 * Proporção altura:largura de uma bandeira.
 *
 * QUASE QUADRADA. Passou por 1,3 (triângulo) e 1,5 (molde de papel 10×15) —
 * mas a bandeirinha de pano que uma festa de verdade pendura é larga: na
 * referência fotográfica em `public/` elas são tão largas quanto altas, e é
 * essa largura que dá lugar para a estampa aparecer. Bandeira estreita não
 * tem onde estampar, e foi por isso que a versão anterior acabou lisa.
 */
const PROPORCAO_BANDEIRA = 1.08

function desenharEstampaBandeira(
  pincel: CanvasRenderingContext2D,
  estampa: EstampaBandeira,
  largura: number,
  altura: number,
  tinta: string,
): void {
  const m = largura / 2
  pincel.save()
  pincel.fillStyle = tinta

  if (estampa === 'estrela' || estampa === 'vazado') {
    // Estrela de cinco pontas, grande, no meio do pano. Em `vazado` ela é
    // RECORTE: o desenho vira buraco e o que aparece é o que está atrás —
    // é o que a referência faz nas bandeiras vermelha e verde, e o que mais
    // diz "pano cortado à mão" em vez de "impresso".
    if (estampa === 'vazado') pincel.globalCompositeOperation = 'destination-out'
    const r = Math.min(largura, altura) * 0.3
    const cy = altura * 0.42
    pincel.beginPath()
    for (let k = 0; k < 10; k++) {
      const ang = (k * Math.PI) / 5 - Math.PI / 2
      const rr = k % 2 === 0 ? r : r * 0.42
      const px = Math.cos(ang) * rr
      const py = cy + Math.sin(ang) * rr
      if (k === 0) pincel.moveTo(px, py)
      else pincel.lineTo(px, py)
    }
    pincel.closePath()
    pincel.fill()
    pincel.restore()
    return
  }

  if (estampa === 'sol') {
    const cy = altura * 0.42
    const r = Math.min(largura, altura) * 0.16
    pincel.beginPath()
    pincel.arc(0, cy, r, 0, Math.PI * 2)
    pincel.fill()
    pincel.strokeStyle = tinta
    pincel.lineWidth = Math.max(0.8, r * 0.34)
    pincel.lineCap = 'round'
    for (let k = 0; k < 8; k++) {
      const ang = (k * Math.PI) / 4
      pincel.beginPath()
      pincel.moveTo(Math.cos(ang) * r * 1.55, cy + Math.sin(ang) * r * 1.55)
      pincel.lineTo(Math.cos(ang) * r * 2.15, cy + Math.sin(ang) * r * 2.15)
      pincel.stroke()
    }
    pincel.restore()
    return
  }

  if (estampa === 'bolinhas') {
    const passoX = largura / 4
    const passoY = altura / 4
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        pincel.beginPath()
        pincel.arc(-m + passoX * (i + 0.5), passoY * (j + 0.5), passoX * 0.18, 0, Math.PI * 2)
        pincel.fill()
      }
    }
    pincel.restore()
    return
  }

  if (estampa === 'listras') {
    const passo = altura / 7
    for (let j = 1; j < 7; j += 2) pincel.fillRect(-m, passo * j, largura, passo)
    pincel.restore()
    return
  }

  // retalhos: triângulos alternados, o padrão de bandeira feita de sobras
  const passoX = largura / 3
  const passoY = altura / 3
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if ((i + j) % 2) continue
      const x0 = -m + passoX * i
      const y0 = passoY * j
      pincel.beginPath()
      pincel.moveTo(x0, y0)
      pincel.lineTo(x0 + passoX, y0)
      pincel.lineTo(x0, y0 + passoY)
      pincel.closePath()
      pincel.fill()
    }
  }
  pincel.restore()
}

function rasterizarBandeira(
  larguraPx: number,
  cor: string,
  estampa: EstampaBandeira,
  tinta: string,
  dpr: number,
): HTMLCanvasElement | null {
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
  const caminho = new Path2D(caminhoBandeira(larguraPx, alturaPx))
  pincel.fillStyle = cor
  pincel.fill(caminho)

  // A estampa, recortada no pano.
  pincel.save()
  pincel.clip(caminho)
  desenharEstampaBandeira(pincel, estampa, larguraPx, alturaPx, tinta)
  pincel.restore()

  // A ABA DOBRADA sobre o barbante. Uma bandeirinha de papel de seda é
  // pendurada dobrando a borda de cima por cima do fio e colando — então
  // aquela faixa tem papel DUPLO e fica mais fechada que o resto. É esse
  // detalhe, e não a cor, que separa "papel pendurado" de "triângulo
  // impresso": sem ele a bandeira flutua sem estar presa a nada.
  pincel.save()
  pincel.clip(caminho)
  pincel.fillStyle = 'rgba(0,0,0,0.26)'
  pincel.fillRect(-larguraPx, 0, larguraPx * 2, alturaPx * 0.15)
  // O vinco da dobra: uma linha clara logo abaixo da aba, onde o papel
  // volta a ser simples e pega luz.
  pincel.fillStyle = 'rgba(255,255,255,0.16)'
  pincel.fillRect(-larguraPx, alturaPx * 0.15, larguraPx * 2, alturaPx * 0.02)
  pincel.restore()
  return tela
}

/**
 * Um sprite por ESTILO — a combinação de cor e estampa —, não mais um por
 * cor. São 5 cores × 7 estampas possíveis, mas só as combinações que a
 * fileira de fato usa entram no mapa, então na prática são tantas quanto
 * bandeiras distintas houver na tela.
 *
 * A fileira de trás reaproveita os mesmos sprites, só pede um tamanho de
 * destino menor no `drawImage` (62%, ver `LINHA_FUNDO.escala`); reescalar um
 * raster já pronto é de graça comparado a rasterizar um segundo conjunto.
 */
let spritesBandeiraCache: {
  larguraPx: number
  dpr: number
  porEstilo: Map<string, HTMLCanvasElement>
} | null = null
function garantirSpriteBandeira(
  larguraPx: number,
  cor: string,
  estampa: EstampaBandeira,
  tinta: string,
  dpr: number,
): HTMLCanvasElement | null {
  if (
    !spritesBandeiraCache ||
    spritesBandeiraCache.larguraPx !== larguraPx ||
    spritesBandeiraCache.dpr !== dpr
  ) {
    spritesBandeiraCache = { larguraPx, dpr, porEstilo: new Map() }
  }
  const cache = spritesBandeiraCache
  const chave = `${cor}|${estampa}|${tinta}`
  const existente = cache.porEstilo.get(chave)
  if (existente) return existente
  const nova = rasterizarBandeira(larguraPx, cor, estampa, tinta, dpr)
  if (nova) cache.porEstilo.set(chave, nova)
  return nova
}

/** Sisal. Ver o comentário no traçado do barbante. */
const COR_BARBANTE = '#A9855A'
const LARGURA_BARBANTE = 2.2

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
  /**
   * Fração da altura onde o varal ENCOSTA na borda direita.
   *
   * Varal junino não é horizontal. Na foto do arraial as cordas saem de
   * postes de alturas diferentes e CRUZAM o céu em diagonais — é esse
   * cruzamento que dá profundidade à praça. Duas fileiras paralelas, que era
   * o que este arquivo desenhava, leem como cenário de teatro: dois varões
   * pendurados no mesmo plano.
   */
  fracaoAlturaFim: number
  /** Fração da altura onde o varal encosta na borda ESQUERDA. */
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

/**
 * OS VARAIS. Quatro, cruzando, no lugar de duas fileiras paralelas.
 *
 * Os dois primeiros são o fundo (menores, cedendo mais, mais apagados pela
 * distância) e os dois últimos a frente. Dentro de cada par, um sobe da
 * esquerda para a direita e o outro desce — é o cruzamento que a foto tem, e
 * é ele que faz o céu do arraial parecer um espaço em vez de um pano de
 * fundo.
 *
 * Todos ficam no quinto de cima do quadro: mais abaixo e a bandeirinha
 * começa a competir com o título da dobra, que é o que o visitante precisa
 * ler primeiro.
 */
const VARAIS: readonly ConfigFileiraBandeirinha[] = [
  {
    fracaoAlturaFio: 0.02,
    fracaoAlturaFim: 0.095,
    fracaoSag: 0.26,
    opacidade: 0.3,
    escala: 0.55,
    deslocamentoCor: 2,
    deslocamentoIndice: 1000,
  },
  {
    fracaoAlturaFio: 0.1,
    fracaoAlturaFim: 0.025,
    fracaoSag: 0.24,
    opacidade: 0.34,
    escala: 0.62,
    deslocamentoCor: 4,
    deslocamentoIndice: 2000,
  },
  {
    fracaoAlturaFio: 0.045,
    fracaoAlturaFim: 0.125,
    fracaoSag: 0.22,
    opacidade: 0.62,
    escala: 1,
    deslocamentoCor: 0,
    deslocamentoIndice: 0,
  },
  {
    fracaoAlturaFio: 0.13,
    fracaoAlturaFim: 0.055,
    fracaoSag: 0.2,
    opacidade: 0.55,
    escala: 0.88,
    deslocamentoCor: 1,
    deslocamentoIndice: 3000,
  },
]

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
  // MAIORES. Com a bandeira quase quadrada (PROPORCAO_BANDEIRA) o pano
// encolheu em altura, e estampa em pano pequeno vira sujeira. Na referencia
// fotografica a bandeira e um objeto de bom tamanho na cena, nao um confete.
const larguraBandeiraFrente = Math.min(30, Math.max(18, largura * 0.042))
  const larguraBandeira = larguraBandeiraFrente * config.escala
  const alturaBandeira = larguraBandeira * PROPORCAO_BANDEIRA
  // O PASSO usa a largura da PRÓPRIA fileira — é o que preserva a razão de
  // 18% de vão entre bandeiras (medida real, régua §4) em qualquer escala,
  // em vez de a fileira de trás ficar mais apertada ou mais espaçada que a
  // de frente por acidente de conta.
  // VAO DE 40%, nao de 18%. Bandeirinha pendurada tem espaco entre uma e
// outra, e e nesse vao que o BARBANTE aparece cedendo — sem ele a fileira
// vira uma faixa continua de cor, que e o que a versao anterior parecia.
const passo = larguraBandeira * 1.4
  const yInicio = altura * config.fracaoAlturaFio
  const yFim = altura * config.fracaoAlturaFim
  /** A altura do varal num `x`, ANTES da barriga — a reta entre as duas
   *  pontas. A barriga entra por cima disto, em cada vão. */
  const yFioEm = (x: number) => yInicio + ((yFim - yInicio) * x) / Math.max(1, largura)
  const nBandeiras = Math.ceil(largura / passo) + 1

  // O FIO NUNCA É RETO — cada vão cede num quadrático. Reto é "gerado", não
  // "pendurado": a gravidade é de graça para desenhar, e a ausência dela é
  // o que mais denuncia
  // (`docs/superpowers/referencias/2026-08-20-arte-junina.md` §3). O fio em
  // si NÃO balança (só as bandeiras penduradas nele) — manter o traço
  // parado é o que garante a coluna central sem NENHUM movimento sem
  // precisar recortar o caminho no meio do vão.
  // BARBANTE, não um fio de um pixel. Na referência fotográfica em `public/`
  // a corda é grossa, cor de sisal, e é ela que segura visualmente a fileira
  // — um traço branco fino lê como arame, e bandeirinha não se pendura em
  // arame. A cor não sai de `CORES_BANDEIRINHA` de propósito: sisal não é
  // uma cor de bandeira, é a cor de uma corda.
  pincel.strokeStyle = COR_BARBANTE
  pincel.lineWidth = LARGURA_BARBANTE * config.escala
  pincel.lineCap = 'round'
  pincel.beginPath()
  pincel.moveTo(0, yFioEm(0))
  for (let x = passo; x <= largura + passo; x += passo) {
    const meio = x - passo / 2
    pincel.quadraticCurveTo(meio, yFioEm(meio) + passo * config.fracaoSag, x, yFioEm(x))
  }
  pincel.stroke()

  // AS LUZINHAS penduradas no mesmo fio das bandeirinhas. Na foto do
  // arraial elas estão em todos os varais e são o que dá a sensação de
  // "praça iluminada" — sem elas o fio é só um suporte, com elas ele
  // participa da festa. Ficam ENTRE as bandeiras, na barriga do vão, que é
  // onde uma lâmpada pendurada de fato para.
  //
  // Uma a cada duas bandeiras: em todos os vãos vira pisca-pisca de vitrine.
  for (let i = 0; i < nBandeiras; i += 2) {
    const meioVao = (i + 0.5) * passo
    if (meioVao > largura) break
    // A barriga do fio no meio do vão — a mesma conta da quadrática acima,
    // avaliada em t=0,5: o ponto médio de uma Bézier quadrática fica a
    // METADE da altura do ponto de controle.
    const yLuz = yFioEm(meioVao) + (passo * config.fracaoSag) / 2
    const r = LARGURA_BARBANTE * 0.9 * config.escala
    // O halo primeiro, aditivo: é ele que faz a lâmpada ACENDER em vez de
    // ser um ponto amarelo pousado no fio.
    pincel.save()
    pincel.globalCompositeOperation = 'lighter'
    const halo = pincel.createRadialGradient(meioVao, yLuz, 0, meioVao, yLuz, r * 4)
    halo.addColorStop(0, 'rgba(255,206,132,0.5)')
    halo.addColorStop(1, 'rgba(255,176,80,0)')
    pincel.fillStyle = halo
    pincel.beginPath()
    pincel.arc(meioVao, yLuz, r * 4, 0, Math.PI * 2)
    pincel.fill()
    pincel.restore()
    pincel.fillStyle = '#FFE6B4'
    pincel.beginPath()
    pincel.arc(meioVao, yLuz, r, 0, Math.PI * 2)
    pincel.fill()
  }

  for (let i = 0; i < nBandeiras; i++) {
    const x = i * passo
    const cor = CORES_BANDEIRINHA[(i + config.deslocamentoCor) % CORES_BANDEIRINHA.length]!
    // A estampa avança num passo DIFERENTE do da cor (7 estampas contra 5
    // cores), então cor e estampa não andam juntas e a fileira não vira um
    // padrão que se repete a cada cinco bandeiras.
    const estampa = ESTAMPAS_BANDEIRA[(i + config.deslocamentoCor) % ESTAMPAS_BANDEIRA.length]!
    // A tinta da estampa sai da própria paleta, três posições adiante: é
    // como pano estampado se comporta (as cores do padrão são as mesmas do
    // resto da barraca), e impede inventar matiz fora da paleta junina.
    const tinta = CORES_BANDEIRINHA[(i + config.deslocamentoCor + 3) % CORES_BANDEIRINHA.length]!
    const sprite = garantirSpriteBandeira(larguraBandeiraFrente, cor, estampa, tinta, dpr)

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
    pincel.translate(x, yFioEm(x))
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
      pincel.lineTo(meiaLargura, alturaBandeira)
      pincel.lineTo(0, alturaBandeira * 0.62)
      pincel.lineTo(-meiaLargura, alturaBandeira)
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
  // Na ordem do array: os de fundo primeiro, os da frente por cima. Ordem de
  // pintura é a pista de profundidade que este tema usa em vez de desfoque.
  for (const varal of VARAIS) {
    desenharFileiraBandeirinhas(pincel, largura, altura, dpr, varal, agora, parado)
  }
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

// Escuras e QUENTES. Antes eram #3D2A1C/#5A4028, marrons pouco saturados —
// cercados pela auréola laranja da própria fogueira, o olho lia aquele
// marrom como cinza por contraste simultâneo, e a pilha parecia de pedra.
// Lenha retroiluminada é escura e puxa para o vermelho, nunca para o neutro.
const COR_TRONCO = '#33200E'
const COR_TRONCO_CLARO = '#4E2F14'
/** O topo cortado da tora: mais claro que a casca, porque e madeira nova
 *  exposta, e e o contraste entre os dois que le como corte. */
/** O topo cortado. MENOR e menos claro que antes: em raio de tela pequeno
 *  dois círculos claros num traço escuro liam como parafuso, não como
 *  corte de madeira. */
const COR_GRAO_CLARO = '#6E4826'
const COR_GRAO_ESCURO = '#2A1808'

/** Duas toras cruzadas — a leitura mais rápida de "fogueira" sem uma pilha
 *  inteira de caminhos por um ganho de reconhecimento que a régua §5 item 2
 *  já não credita a mais que isso. `ellipse` nativo, sem `Path2D` — nunca
 *  precisa de fallback porque não depende de nada que falte em Node/jsdom
 *  além do próprio `getContext`, que quem chama já garantiu. */
/**
 * A FOGUEIRA É UMA PIRÂMIDE DE TORAS EM PÉ.
 *
 * O que havia aqui eram duas toras DEITADAS cruzadas — fogueira de
 * acampamento, não fogueira de São João. A junina se monta empilhando lenha
 * em pirâmide, toras maiores na base, encostadas umas nas outras com espaço
 * para o ar circular; o fogo sobe por DENTRO da pilha. É a silhueta
 * triangular que faz o objeto ser reconhecido de longe, e era exatamente
 * ela que faltava.
 *
 * Fontes da montagem: decorfacil.com/fogueira-festa-junina e
 * ruraltectv.com.br (como fazer uma fogueira com segurança).
 *
 * `camada` divide a pilha em duas para o fogo poder ser desenhado ENTRE
 * elas — com a lenha toda antes das chamas, o fogo nascia por cima da pilha
 * em vez de de dentro dela.
 */
function desenharTora(
  pincel: CanvasRenderingContext2D,
  raio: number,
  camada: 'tras' | 'frente',
): void {
  const base = raio * 0.1
  const altura = raio * 1.35
  const espessura = raio * 0.3
  // Cinco toras: as três de trás abrem mais e são mais escuras, as duas da
  // frente fecham o V e pegam a luz do fogo. Ímpar de propósito — pilha par
  // fica simétrica e lê como estrutura montada, não como lenha jogada.
  const traseira = camada === 'tras'
  const pes = traseira ? [-1, 0.35, 1] : [-0.55, 0.62]
  const topos = traseira ? [0.22, -0.1, -0.3] : [-0.18, 0.14]

  pincel.save()
  pincel.lineCap = 'round'
  pincel.lineWidth = espessura
  pincel.strokeStyle = traseira ? COR_TRONCO : COR_TRONCO_CLARO
  pes.forEach((pe, k) => {
    pincel.beginPath()
    pincel.moveTo(pe * raio * 0.95, base)
    pincel.lineTo(topos[k]! * raio * 0.55, base - altura)
    pincel.stroke()
  })
  pincel.restore()

  // Topo cortado em cada tora que encosta no chão. É este detalhe que faz o
  // olho ler MADEIRA em vez de traço marrom, e ele custa dois `arc`.
  const grao = espessura * 0.3
  pes.forEach((pe) => {
    const gx = pe * raio * 0.95
    pincel.fillStyle = traseira ? COR_TRONCO : COR_GRAO_CLARO
    pincel.beginPath()
    pincel.arc(gx, base, grao, 0, Math.PI * 2)
    pincel.fill()
    pincel.fillStyle = COR_GRAO_ESCURO
    pincel.beginPath()
    pincel.arc(gx, base, grao * 0.46, 0, Math.PI * 2)
    pincel.fill()
  })
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

/**
 * A BARRACA, na margem direita.
 *
 * O que havia aqui eram duas invenções minhas que a foto do arraial não
 * tem: uma tira de xadrez vertical de altura inteira e um chapéu de palha
 * flutuando no ar. Nenhum arraial tem um chapéu pairando, e a toalha xadrez
 * é toalha de MESA — em pé, encostada na borda da tela, ela lia como padrão
 * de teste.
 *
 * O que a foto tem nas laterais é BARRACA: telhado de palha em duas águas,
 * balcão de madeira e frente forrada de chita. É o objeto que emoldura a
 * praça, e ele traz junto a palha e o pano estampado que eu estava tentando
 * enfiar na cena por outros meios.
 */
const COR_PALHA_TELHADO = '#4A3A20'
const COR_PALHA_LUZ = '#6B5430'
const COR_MADEIRA_BARRACA = '#33241A'
const COR_CHITA_BARRACA = '#5A2320'

function rasterizarAcentosDireita(larguraPx: number, alturaPx: number, dpr: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null
  if (larguraPx <= 0 || alturaPx <= 0) return null
  const tela = document.createElement('canvas')
  tela.width = Math.max(1, Math.ceil(larguraPx * dpr))
  tela.height = Math.max(1, Math.ceil(alturaPx * dpr))
  const pincel = tela.getContext('2d')
  if (!pincel) return null
  pincel.scale(dpr, dpr)

  // A barraca fica ENCOSTADA na borda e cortada por ela — é assim que uma
  // barraca aparece numa foto de praça: você vê a que está no seu caminho,
  // não a barraca inteira centralizada. Cortar no quadro é o que faz a cena
  // continuar para fora da tela.
  const larguraBarraca = Math.min(larguraPx * 0.16, alturaPx * 0.3)
  const xDir = larguraPx + larguraBarraca * 0.18
  const xEsq = xDir - larguraBarraca
  const yChao = alturaPx * PISO_FRAC
  const alturaBalcao = (alturaPx - yChao) + alturaPx * 0.1
  const yBalcao = yChao - alturaPx * 0.1
  const yTelhado = yBalcao - alturaPx * 0.16

  // A frente de chita: pano estampado cobrindo o corpo da barraca.
  pincel.fillStyle = COR_CHITA_BARRACA
  pincel.fillRect(xEsq, yBalcao, larguraBarraca, alturaBalcao)
  pincel.fillStyle = 'rgba(226,200,150,0.16)'
  for (let k = 0; k < 5; k++) {
    for (let m = 0; m < 3; m++) {
      const px = xEsq + (larguraBarraca / 5) * (k + 0.5)
      const py = yBalcao + (alturaBalcao / 3) * (m + 0.5)
      pincel.beginPath()
      pincel.arc(px, py, larguraBarraca * 0.035, 0, Math.PI * 2)
      pincel.fill()
    }
  }

  // O balcão de madeira, saliente.
  pincel.fillStyle = COR_MADEIRA_BARRACA
  pincel.fillRect(xEsq - larguraBarraca * 0.05, yBalcao, larguraBarraca * 1.1, alturaPx * 0.022)

  // O TELHADO DE PALHA, em duas águas, com o beiral bem saliente. A palha é
  // desenhada em traços curtos e desiguais: é o que a diferencia de um
  // triângulo marrom.
  pincel.save()
  pincel.beginPath()
  pincel.moveTo(xEsq - larguraBarraca * 0.14, yBalcao)
  pincel.lineTo(xEsq + larguraBarraca * 0.5, yTelhado)
  pincel.lineTo(xDir + larguraBarraca * 0.14, yBalcao)
  pincel.closePath()
  pincel.fillStyle = COR_PALHA_TELHADO
  pincel.fill()
  pincel.clip()
  pincel.strokeStyle = COR_PALHA_LUZ
  pincel.lineWidth = 1
  for (let k = 0; k < 46; k++) {
    const t = pseudoAleatorio01(k * 19 + 3)
    const px = xEsq - larguraBarraca * 0.14 + larguraBarraca * 1.28 * t
    const py = yBalcao - (yBalcao - yTelhado) * pseudoAleatorio01(k * 23 + 5) * 0.9
    pincel.beginPath()
    pincel.moveTo(px, py)
    pincel.lineTo(px + 1.5, py + 4 + pseudoAleatorio01(k * 29 + 7) * 5)
    pincel.stroke()
  }
  pincel.restore()

  // Os esteios de madeira, aparecendo sob o beiral.
  pincel.fillStyle = COR_MADEIRA_BARRACA
  pincel.fillRect(xEsq - larguraBarraca * 0.1, yBalcao, alturaPx * 0.008, alturaPx - yBalcao)

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
/**
 * O CÉU E O HORIZONTE.
 *
 * A dobra era `PALETA.fundo` chapado — preto quase puro de ponta a ponta —
 * com uma vinheta morna por cima. Na foto do arraial nordestino que serve
 * de referência (`public/`) o céu é o oposto de chapado: ele tem hora do
 * dia. Escurece no alto e ESQUENTA em direção ao horizonte, onde o sol
 * acabou de se pôr, e é essa transição que diz "isto é um lugar, de noite"
 * em vez de "isto é um retângulo preto".
 *
 * A VERSÃO AQUI É NOTURNA, não o fim de tarde claro da referência, e por um
 * motivo duro: esta dobra tem texto branco por cima. O céu claro da foto
 * levaria o contraste do título abaixo do mínimo. O gradiente sobe de um
 * azul-noite quase preto (mais escuro que o `PALETA.fundo` de antes, no
 * alto, onde o título vive) e só esquenta no terço de baixo, onde não há
 * texto nenhum — então o contraste do título MELHOROU com a mudança, não
 * piorou.
 *
 * O horizonte é uma silhueta de telhados coloniais, quase preta, com
 * algumas janelas acesas. Não é decoração: é ela que transforma a metade de
 * baixo de "vazio escuro" em "a praça continua depois da fogueira".
 */
const COR_CEU_ALTO = '#05070E'
const COR_CEU_MEIO = '#0D1018'
const COR_CEU_HORIZONTE = '#241812'
/** Fração da altura onde a silhueta dos telhados começa. */
const HORIZONTE_FRAC = 0.9
/** Onde o chão de paralelepípedo começa. Logo abaixo da base do casario:
 *  as casas ficam PLANTADAS no piso, não pairando sobre ele. */
const PISO_FRAC = 0.955

let ceuCache: { largura: number; altura: number; tela: HTMLCanvasElement } | null = null
function garantirCeu(largura: number, altura: number, dpr: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null
  if (largura <= 0 || altura <= 0) return null
  if (ceuCache && ceuCache.largura === largura && ceuCache.altura === altura) return ceuCache.tela
  const tela = document.createElement('canvas')
  tela.width = Math.max(1, Math.ceil(largura * dpr))
  tela.height = Math.max(1, Math.ceil(altura * dpr))
  const p = tela.getContext('2d')
  if (!p) return null
  p.scale(dpr, dpr)

  const ceu = p.createLinearGradient(0, 0, 0, altura)
  ceu.addColorStop(0, COR_CEU_ALTO)
  ceu.addColorStop(0.55, COR_CEU_MEIO)
  ceu.addColorStop(1, COR_CEU_HORIZONTE)
  p.fillStyle = ceu
  p.fillRect(0, 0, largura, altura)

  // ESTRELAS, só no terço de cima — perto do horizonte o brilho do arraial
  // as apagaria, e desenhá-las ali seria contradizer o próprio gradiente.
  // Posições pseudoaleatórias determinísticas: o céu é assado uma vez, e
  // duas rasterizações têm de dar o mesmo desenho.
  for (let i = 0; i < 90; i++) {
    const x = pseudoAleatorio01(i * 3 + 1) * largura
    const y = pseudoAleatorio01(i * 5 + 2) * altura * 0.42
    const brilho = 0.12 + pseudoAleatorio01(i * 7 + 3) * 0.4
    // Somem de baixo para cima: quanto mais perto do horizonte, mais
    // apagada — é o que a luz da festa faz com o céu de verdade.
    const desbotar = 1 - y / (altura * 0.42)
    p.fillStyle = `rgba(226,232,244,${(brilho * desbotar).toFixed(3)})`
    p.beginPath()
    p.arc(x, y, 0.6 + pseudoAleatorio01(i * 11 + 5) * 0.7, 0, Math.PI * 2)
    p.fill()
  }

  // O CASARIO. Fachadas coloniais, não silhuetas pretas.
  //
  // A versão anterior desenhava caixotes quase pretos, e a foto do arraial
  // mostra o contrário: casario de dois pavimentos em tons pastéis — creme,
  // rosa, azul, verde-água — com TELHA vermelha, portas e janelas altas de
  // verruma. À noite esses tons ficam abafados, mas não somem: é a cor da
  // fachada que diz "cidade do interior", e uma silhueta preta diz só
  // "prédio".
  //
  // Os tons aqui já saem escurecidos para a hora da noite; não há camada de
  // sombra por cima, senão o casario voltaria a virar silhueta.
  const FACHADAS = [
    { parede: '#3A3026', telha: '#4A2318' },
    { parede: '#3A2A2C', telha: '#4A2318' },
    { parede: '#26313A', telha: '#432017' },
    { parede: '#2B3A33', telha: '#4A2318' },
    { parede: '#3D3428', telha: '#432017' },
  ] as const
  const yBase = altura
  const yTopoMax = altura * HORIZONTE_FRAC
  let x = -largura * 0.05
  let n = 0
  while (x < largura * 1.05) {
    const fachada = FACHADAS[n % FACHADAS.length]!
    const w = largura * (0.055 + pseudoAleatorio01(n * 13 + 7) * 0.055)
    const h = (yBase - yTopoMax) * (0.62 + pseudoAleatorio01(n * 17 + 11) * 0.62)
    const yTopo = yBase - h

    p.fillStyle = fachada.parede
    p.fillRect(x, yTopo, w, h)

    // O TELHADO de telha: uma faixa inclinada com beiral passando dos dois
    // lados. Casa colonial tem duas águas e beiral saliente — é a linha do
    // beiral que separa "casario" de "caixotes".
    p.fillStyle = fachada.telha
    p.beginPath()
    p.moveTo(x - w * 0.09, yTopo)
    p.lineTo(x + w * 0.5, yTopo - h * 0.17)
    p.lineTo(x + w * 1.09, yTopo)
    p.closePath()
    p.fill()

    // JANELAS altas, em duas fileiras. Parte acesa, parte não: casario com
    // todas as janelas acesas vira painel de LED.
    const colunas = w > largura * 0.075 ? 3 : 2
    const wJanela = w / (colunas * 2 + 1)
    for (let andar = 0; andar < 2; andar++) {
      const yJanela = yTopo + h * (0.2 + andar * 0.38)
      const hJanela = h * 0.22
      if (yJanela + hJanela > yBase) continue
      for (let c = 0; c < colunas; c++) {
        const xJanela = x + wJanela * (c * 2 + 1)
        const acesa = pseudoAleatorio01(n * 31 + andar * 7 + c * 3) > 0.45
        p.fillStyle = acesa ? 'rgba(255,198,116,0.62)' : 'rgba(10,12,18,0.85)'
        p.fillRect(xJanela, yJanela, wJanela, hJanela)
      }
    }
    x += w * 1.03
    n++
  }

  // O CHÃO. Paralelepípedo com palha por cima — na foto o piso é a única
  // superfície grande da cena, e sem ele o casario parece flutuar sobre o
  // gradiente do céu. Fica escuro: é chão de noite, e ainda tem de deixar o
  // texto da dobra respirar.
  const yChao = altura * PISO_FRAC
  p.fillStyle = '#14100E'
  p.fillRect(0, yChao, largura, altura - yChao)
  // As pedras: fiadas alternadas, cada uma um pouco diferente da vizinha.
  const alturaPedra = Math.max(3, (altura - yChao) * 0.14)
  let fiada = 0
  for (let y = yChao; y < altura; y += alturaPedra) {
    const larguraPedra = alturaPedra * 1.9
    const desloca = fiada % 2 === 0 ? 0 : larguraPedra / 2
    for (let px = -larguraPedra + desloca; px < largura; px += larguraPedra) {
      const tom = 0.04 + pseudoAleatorio01(fiada * 29 + Math.round(px)) * 0.06
      p.fillStyle = `rgba(214,198,178,${tom.toFixed(3)})`
      p.fillRect(px + 0.5, y + 0.5, larguraPedra - 1, alturaPedra - 1)
    }
    fiada++
  }
  // A PALHA espalhada, que é o que uma festa junina joga no chão.
  for (let i = 0; i < 120; i++) {
    const px = pseudoAleatorio01(i * 37 + 3) * largura
    const py = yChao + pseudoAleatorio01(i * 41 + 5) * (altura - yChao)
    const comprimento = 3 + pseudoAleatorio01(i * 43 + 7) * 5
    const ang = pseudoAleatorio01(i * 47 + 11) * Math.PI
    p.strokeStyle = `rgba(198,164,104,${(0.1 + pseudoAleatorio01(i * 53 + 13) * 0.18).toFixed(3)})`
    p.lineWidth = 1
    p.beginPath()
    p.moveTo(px, py)
    p.lineTo(px + Math.cos(ang) * comprimento, py + Math.sin(ang) * comprimento)
    p.stroke()
  }

  ceuCache = { largura, altura, tela }
  return tela
}

function desenharFundo(
  pincel: CanvasRenderingContext2D,
  largura: number,
  altura: number,
  agora: number,
  parado: boolean,
): void {
  const dpr = dprAtual()

  // O céu assado entra no lugar do preenchimento chapado. `PALETA.fundo`
  // continua sendo pintado antes dele como rede de segurança: se o sprite
  // do céu falhar (sem `document`), a dobra fica escura, nunca transparente.
  pincel.fillStyle = PALETA.fundo
  pincel.fillRect(0, 0, largura, altura)
  const ceu = garantirCeu(largura, altura, dpr)
  if (ceu) pincel.drawImage(ceu, 0, 0, largura, altura)

  const vinheta = obterVinheta(pincel, largura, altura)
  if (vinheta) {
    pincel.fillStyle = vinheta
    pincel.fillRect(0, 0, largura, altura)
  }

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
