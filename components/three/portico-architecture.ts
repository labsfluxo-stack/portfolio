import { CONTAINER, type Slot, slotCenterY } from './portico-model'
import type { StackItem, StackLayer } from '@/content/types'

/**
 * A arquitetura que a máquina monta: uma pirâmide de patamares, um por camada
 * do stack, um contêiner por tecnologia.
 *
 * Arquitetura de software se desenha com a INFRAESTRUTURA LARGA NA BASE,
 * estreitando para cima — e isso não é convenção gráfica, é estrutural: uma
 * camada não pode ser mais larga do que a que a sustenta. Aqui a metáfora é
 * literal, porque os contêineres se apoiam de verdade: nenhum patamar pode
 * passar da região do patamar de baixo que está inteiramente ocupada.
 *
 * **Nenhuma largura é escrita à mão.** Tudo sai do número de tecnologias de
 * cada camada do dicionário: o retângulo da base é o que segura a camada mais
 * larga na proporção de uma planta, e cada patamar acima é o de baixo menos
 * uma unidade — na dimensão que custa menos lugares, e na profundidade quando
 * empata, porque é o recuo em profundidade que faz a silhueta ler como
 * zigurate em vez de parede. Mude o dicionário e a pirâmide se redesenha.
 *
 * Como `portico-model.ts`, aqui não entra three.js: é aritmética e dados,
 * testável sem GPU. Nenhum `Math.random()`.
 */

/**
 * Folga entre contêineres vizinhos — a de manobra do spreader, que é ~10 cm
 * mais largo que a carga em cada direção e precisa descer entre os vizinhos
 * sem raspar.
 */
const GAP = { x: 0.42, z: 0.36 } as const

export const PITCH = { x: CONTAINER.length + GAP.x, z: CONTAINER.width + GAP.z } as const

/**
 * Proporção alvo da planta da base, em metros.
 *
 * O contêiner é quase três vezes mais comprido que largo, então um grid
 * "quadrado" em número de lugares sai três vezes mais largo que fundo no
 * mundo. A proporção é medida em METROS, não em lugares: ~1,8 é a de uma
 * planta que lê como base e ainda cabe num enquadramento de meia página.
 */
const TARGET_ASPECT = 1.8

type Rect = { cols: number; rows: number; colStart: number; rowStart: number }

/**
 * O retângulo da base: o que segura a camada mais larga com o menor
 * desperdício, desempatando pela proporção.
 */
function baseGrid(count: number): { cols: number; rows: number } {
  let best = { cols: Math.max(1, count), rows: 1, score: Infinity }
  for (let rows = 1; rows <= Math.max(1, count); rows++) {
    const cols = Math.ceil(count / rows)
    const aspect = (cols * PITCH.x) / (rows * PITCH.z)
    const waste = cols * rows - count
    const score = Math.abs(Math.log(aspect / TARGET_ASPECT)) + waste * 0.08
    if (score < best.score) best = { cols, rows, score }
  }
  return { cols: best.cols, rows: best.rows }
}

/** A planta de um patamar, sem onde ele começa: só quantos lugares em cada eixo. */
type Plan = { cols: number; rows: number }

/**
 * O degrau do zigurate: o patamar de cima é O DE BAIXO menos uma unidade.
 *
 * "O de baixo" é o patamar inteiro, não a parte dele que sobrou cheia — e a
 * distinção é o defeito que essa pirâmide teve e que o dono viu na tela. Um
 * patamar que não fecha o retângulo já entrega um apoio mais estreito do que
 * ele próprio; descontar o degrau DESSE apoio cobra o recuo duas vezes, e a
 * pirâmide chega a um contêiner só no quarto patamar. Daí para cima nada mais
 * recua, os últimos patamares saem todos com a mesma planta e a silhueta lê
 * como parede. Aqui o degrau sai da planta do patamar de baixo; o apoio entra
 * depois, como TETO (ver `buildArchitecture`), nunca como ponto de partida.
 *
 * Corta a dimensão que custa menos lugares — tirar uma fileira custa `cols`
 * contêineres, tirar uma coluna custa `rows` — e a profundidade quando
 * empata. Sem o degrau a pirâmide vira parede; cortando a dimensão cara ela
 * vira agulha em três patamares.
 */
function stepDown(plan: Plan): Plan {
  const canRows = plan.rows > 1
  const canCols = plan.cols > 1
  if (!canRows && !canCols) return { cols: plan.cols, rows: plan.rows }
  if (!canRows) return { cols: plan.cols - 1, rows: plan.rows }
  if (!canCols) return { cols: plan.cols, rows: plan.rows - 1 }
  return plan.cols <= plan.rows ? { cols: plan.cols, rows: plan.rows - 1 } : { cols: plan.cols - 1, rows: plan.rows }
}

/**
 * Centra `span` unidades dentro de `[start, start + total)`, alternando o
 * arredondamento.
 *
 * Quando a diferença é ímpar não existe posição centrada: o patamar fica meio
 * contêiner para um lado. Alternar o lado a cada degrau impede que os erros
 * se somem sempre no mesmo sentido — que é o que transformaria a pirâmide numa
 * escada encostada. E `Math.floor` da metade garante que o resultado continue
 * DENTRO do intervalo, que é a condição de apoio.
 */
function centred(start: number, total: number, span: number, flip: boolean): number {
  const slack = total - span
  return start + (flip ? Math.ceil(slack / 2) : Math.floor(slack / 2))
}

/**
 * O que a cena NÃO empilha.
 *
 * A pirâmide é uma arquitetura de SOFTWARE, e switch é equipamento físico:
 * não existe camada de aplicação apoiada sobre um Catalyst. Decisão do dono, e
 * ela é de cena, não de conteúdo — os quatro continuam inteiros no dicionário
 * e na seção Stack em texto, que é onde a experiência de rede pertence.
 *
 * O casamento é por NOME NORMALIZADO, então vale nos dois idiomas sem lista
 * duplicada, e um nome que sumir do dicionário simplesmente deixa de casar em
 * vez de quebrar a cena.
 */
const NOT_ARCHITECTURE = ['Cisco', 'MikroTik', 'Furukawa', 'Switching'] as const

const plain = (name: string): string => name.toLowerCase().replace(/[^a-z\d]/g, '')
const EXCLUDED = new Set(NOT_ARCHITECTURE.map(plain))

/** Se esta tecnologia é peça de arquitetura — ou seja, se a cena a monta. */
export const isArchitecture = (item: StackItem): boolean => !EXCLUDED.has(plain(item.name))

/** Domínio primeiro: a arquitetura é montada com o que o dono declara dominar. */
const LEVEL_RANK: Record<StackItem['level'], number> = { dominio: 0, producao: 1, contato: 2 }

/**
 * Ordena por nível mantendo a ordem do dicionário dentro de cada nível.
 * Estável, então o resultado é idêntico a cada carregamento e nos dois
 * idiomas — e quando um patamar não cabe inteiro, o que fica de fora é sempre
 * o de menor domínio, nunca uma escolha arbitrária.
 */
export function byMastery(items: readonly StackItem[]): StackItem[] {
  return items
    .map((item, order) => ({ item, order }))
    .sort((a, b) => LEVEL_RANK[a.item.level] - LEVEL_RANK[b.item.level] || a.order - b.order)
    .map(({ item }) => item)
}

export type Tier = {
  label: string
  /** As tecnologias que couberam, na ordem em que são montadas. */
  items: StackItem[]
  cols: number
  rows: number
  /** Planta do patamar em metros — a silhueta em números, para o SVG e para os testes. */
  width: number
  depth: number
  /** Y do centro dos contêineres deste patamar. */
  y: number
}

/** Uma tecnologia com a camada de onde ela veio — é o que vai estampado na chapa. */
export type Freight = { item: StackItem; label: string; tier: number }

export type Architecture = {
  tiers: Tier[]
  /** Um lugar por contêiner, na ordem de montagem: base primeiro, fundo antes da frente. */
  slots: Slot[]
  /** A tecnologia estampada em cada contêiner, na mesma ordem de `slots`. */
  cargo: Freight[]
  /** O que não coube na arquitetura — vai para as pilhas de fundo do pátio. */
  spare: Freight[]
  width: number
  depth: number
  height: number
}

/**
 * Monta a pirâmide a partir das camadas do dicionário, de baixo para cima.
 *
 * O que limita cada patamar não é o seu próprio tamanho: é a região do
 * patamar de baixo que ficou INTEIRAMENTE cheia. Uma camada com seis
 * tecnologias estreita tudo que vem acima dela, e é isso que dá o formato
 * — a pirâmide é uma consequência do dicionário, não um desenho.
 */
export function buildArchitecture(input: readonly StackLayer[]): Architecture {
  // O hardware de rede sai aqui, uma vez, antes de qualquer conta: a planta, o
  // pátio, o ciclo e a elevação em SVG saem todos deste mesmo resultado, então
  // filtrar na entrada é o que garante que nenhum dos quatro apareça em
  // NENHUMA parte da cena — nem na pirâmide, nem nas pilhas do fundo.
  const layers = input.map((layer) => ({ ...layer, items: layer.items.filter(isArchitecture) }))
  const counts = layers.map((layer) => layer.items.length)
  const base = baseGrid(counts[0] ?? 0)

  const tiers: Tier[] = []
  const slots: Slot[] = []
  const cargo: Freight[] = []
  const spare: Freight[] = []

  // Região do patamar anterior que está inteiramente cheia — a única sobre a
  // qual se pode empilhar.
  let support: Rect = { cols: base.cols, rows: base.rows, colStart: 0, rowStart: 0 }
  // A planta INTEIRA do patamar de baixo — é dela que sai o degrau.
  let below: Plan = { cols: base.cols, rows: base.rows }
  let colFlip = false
  let rowFlip = false

  layers.forEach((layer, index) => {
    // Duas restrições, e elas são de naturezas diferentes: o DEGRAU é uma
    // decisão de silhueta (cada patamar menor que o de baixo) e o APOIO é
    // física (não se empilha sobre o vazio). Aplicar as duas em série — e não
    // uma sobre a outra — é o que faz o zigurate escalonar uma vez por junta
    // em vez de despencar para um contêiner só.
    const stepped = index === 0 ? below : stepDown(below)
    const roomCols = Math.min(stepped.cols, support.cols)
    const roomRows = Math.min(stepped.rows, support.rows)
    const ranked = byMastery(layer.items)
    const capacity = Math.min(ranked.length, roomCols * roomRows)
    const cols = Math.max(1, Math.min(roomCols, capacity))
    const rows = Math.max(1, Math.min(roomRows, Math.ceil(capacity / cols)))

    const colStart = centred(support.colStart, support.cols, cols, colFlip)
    const rowStart = centred(support.rowStart, support.rows, rows, rowFlip)
    if (cols !== support.cols) colFlip = !colFlip
    if (rows !== support.rows) rowFlip = !rowFlip

    const items = ranked.slice(0, capacity)
    spare.push(...ranked.slice(capacity).map((item) => ({ item, label: layer.label, tier: index })))

    // As fileiras completas ficam na FRENTE e a incompleta no fundo: o buraco
    // de um patamar que não fecha o retângulo some atrás da própria pirâmide,
    // em vez de abrir um vão na fileira que a câmera lê.
    const complete = Math.floor(capacity / cols)
    const remainder = capacity % cols
    const y = slotCenterY(index)

    // Duas ordens diferentes, e as duas importam.
    //
    // Esta é a de VISIBILIDADE — da frente para o fundo —, e é a que casa
    // tecnologia com lugar: numa pilha vista quase de frente, a fileira de
    // trás fica escondida atrás da da frente, então o que o dono mais domina
    // tem de cair na fileira que a câmera lê.
    const cells: { col: number; row: number }[] = []
    for (let r = rows - 1; r >= 0; r--) {
      const width = r < rows - complete ? remainder : cols
      for (let c = 0; c < width; c++) cells.push({ col: colStart + c, row: rowStart + r })
    }

    // E esta é a de MONTAGEM — do fundo para a frente —, que é como uma
    // máquina trabalha: ela chega pelo pátio, que fica atrás, e vai fechando
    // o patamar em direção a quem olha.
    cells
      .map((cell, i) => ({ cell, item: items[i] }))
      .sort((a, b) => a.cell.row - b.cell.row || a.cell.col - b.cell.col)
      .forEach(({ cell, item }) => {
        slots.push({
          x: (cell.col - (base.cols - 1) / 2) * PITCH.x,
          y,
          z: (cell.row - (base.rows - 1) / 2) * PITCH.z,
        })
        if (item) cargo.push({ item, label: layer.label, tier: index })
      })

    tiers.push({
      label: layer.label,
      items,
      cols,
      rows,
      width: (cols - 1) * PITCH.x + CONTAINER.length,
      depth: (rows - 1) * PITCH.z + CONTAINER.width,
      y,
    })

    // Só as fileiras cheias sustentam o patamar seguinte — mas a planta que
    // manda no degrau é a do patamar todo.
    support = {
      cols,
      rows: Math.max(1, complete),
      colStart,
      rowStart: rowStart + (rows - Math.max(1, complete)),
    }
    below = { cols, rows }
  })

  return {
    tiers,
    slots,
    cargo,
    spare,
    width: (base.cols - 1) * PITCH.x + CONTAINER.length,
    depth: (base.rows - 1) * PITCH.z + CONTAINER.width,
    height: layers.length * CONTAINER.height,
  }
}
