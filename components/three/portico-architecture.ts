import { CONTAINER, type Slot, slotCenterY } from './portico-model'
import { ROLE_COUNT, type SceneSystem, roleOf } from './portico-systems'

/**
 * A disposição de um sistema: onde cada contêiner da stack vai parar.
 *
 * A cena antiga montava um zigurate de seis patamares derivado do inventário
 * de tecnologias, e ele ficava estranho por um motivo simples: uma stack de 4
 * a 10 tecnologias não tem seis camadas para escalonar. O escalonamento
 * forçado terminava num contêiner único no topo — uma agulha, que é a
 * silhueta que o dono viu e não gostou.
 *
 * Aqui a forma é ESCOLHIDA, não imposta. Para cada tamanho de stack o
 * `choosePile` enumera todas as pilhas possíveis (plantas não-crescentes de
 * baixo para cima, no máximo três colunas e duas fileiras) e pontua cada uma
 * contra o que se quer ver: nada de contêiner solto no topo, nada de nível
 * único, um degrau em algum lugar, e uma silhueta que CRESCE com o número de
 * contêineres — porque a diferença entre um sistema de 4 e um de 10 precisa
 * ler na primeira olhada, sem legenda.
 *
 * O que sai disso, hoje:
 *
 * ```
 *  4 → 2×1 + 2×1     bloco baixo, uma fileira      12,5 × 2,4 × 5,2 m
 *  5 → 3×1 + 2×1     base larga e rasa             19,0 × 2,4 × 5,2 m
 *  6 → 2×2 + 2×1     bloco compacto, duas fileiras 12,5 × 5,2 × 5,2 m
 *  7 → 2×2 + 2×2     o mesmo bloco, quase cheio    12,5 × 5,2 × 5,2 m
 *  8 → 3×2 + 2×1     base larga com coroa          19,0 × 5,2 × 5,2 m
 *  9 → 3×2 + 3×1     base larga com fileira inteira 19,0 × 5,2 × 5,2 m
 * 10 → 3×2 + 2×1 + 2×1  base larga e torre          19,0 × 5,2 × 7,8 m
 * ```
 *
 * E a ordem de baixo para cima não é decorativa: sai de `roleOf`, então a
 * INFRAESTRUTURA fica no chão e a APLICAÇÃO em cima, que é como a stack real
 * se sustenta. É a lógica visível que separa "montagem" de "pilha aleatória".
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
 * Limites da planta, e eles são de enquadramento, não de gosto.
 *
 * Quatro colunas passariam de 25 m de largura e obrigariam a câmera a recuar
 * até a máquina virar miniatura; a terceira fileira em profundidade fica
 * inteiramente escondida atrás da segunda no ângulo desta cena, então é peso
 * que não aparece.
 */
const MAX_COLS = 3
const MAX_ROWS = 2
const MAX_LEVELS = 4

/** A planta de um nível e quantos contêineres ele de fato recebe. */
type Course = { cols: number; rows: number; count: number }

/**
 * Todas as pilhas possíveis para `n` contêineres a partir de uma base.
 *
 * "Possível" é o que a física permite: cada nível é uma planta que não passa
 * da de baixo em nenhuma dimensão. Como todos os níveis abaixo do último ficam
 * CHEIOS, qualquer célula do nível de cima cai sobre célula ocupada — o apoio
 * é consequência da construção, não de uma verificação depois.
 */
function* piles(n: number, cols: number, rows: number, placed: number, below: Course[]): Generator<Course[]> {
  const capacity = cols * rows
  const course: Course[] = [...below, { cols, rows, count: Math.min(capacity, n - placed) }]
  if (placed + capacity >= n) {
    yield course
    return
  }
  if (course.length === MAX_LEVELS) return
  for (let c = cols; c >= 1; c--) {
    for (let r = rows; r >= 1; r--) yield* piles(n, c, r, placed + capacity, course)
  }
}

/** Largura e altura da silhueta de uma pilha, em metros. */
const spanOf = (levels: Course[]): { width: number; depth: number; height: number } => {
  const base = levels[0] ?? { cols: 1, rows: 1, count: 0 }
  return {
    width: (base.cols - 1) * PITCH.x + CONTAINER.length,
    depth: (base.rows - 1) * PITCH.z + CONTAINER.width,
    height: levels.length * CONTAINER.height,
  }
}

/**
 * Área alvo da silhueta por contêiner, em m². É o termo que garante o
 * contraste de porte: sem ele, um sistema de 8 tecnologias podia sair num
 * bloco mais estreito que um de 5 — as duas pilhas cabiam, e a maior lia como
 * menor.
 */
const SILHOUETTE_PER_UNIT = 13

/**
 * O quanto cada defeito custa. Os pesos foram calibrados OLHANDO o resultado
 * dos sete tamanhos, que é o único jeito honesto de calibrar composição.
 */
function penalty(levels: Course[], n: number): number {
  const base = levels[0]
  const top = levels[levels.length - 1]
  if (!base || !top) return Infinity
  const { width, height } = spanOf(levels)
  let cost = 0

  // O defeito que o dono viu na versão anterior: a agulha.
  if (top.count === 1 && n > 2) cost += 6
  // Um nível só é um pátio, não uma montagem.
  if (levels.length < 2) cost += 8
  // Nível de cima vazando: um topo com metade das vagas abertas lê como
  // montagem interrompida.
  cost += 1.6 * (1 - top.count / (top.cols * top.rows))
  // Dois níveis para stack curta, três para stack longa.
  cost += 1.5 * Math.abs(levels.length - Math.min(3, Math.max(2, Math.round(n / 3.4))))
  // Proporção da silhueta: nem parede, nem tapete.
  cost += 0.9 * Math.abs(Math.log(height / width / 0.36))
  // Porte: a silhueta cresce com o número de contêineres.
  cost += 2 * Math.abs(Math.log((width * height) / (n * SILHOUETTE_PER_UNIT)))
  // Profundidade dupla só quando há carga para preencher as duas fileiras.
  if (base.rows !== (n >= 6 ? 2 : 1)) cost += 1
  // Sem nenhum recuo a pilha é uma parede.
  const stepped = levels.some((level, i) => {
    const under = levels[i - 1]
    return !!under && (level.cols < under.cols || level.rows < under.rows)
  })
  if (!stepped && levels.length > 1) cost += 2.5
  // Desempate: entre dois recuos equivalentes, o que preserva a largura —
  // é a largura que carrega a leitura de porte.
  cost -= 0.01 * levels.reduce((sum, level) => sum + level.cols, 0)
  return cost
}

/** A pilha escolhida para `n` contêineres. Determinística e sem tabela fixa. */
export function choosePile(n: number): Course[] {
  let best: Course[] = [{ cols: Math.max(1, n), rows: 1, count: Math.max(0, n) }]
  let bestCost = Infinity
  if (n <= 0) return []
  for (let cols = 1; cols <= MAX_COLS; cols++) {
    for (let rows = 1; rows <= MAX_ROWS; rows++) {
      for (const levels of piles(n, cols, rows, 0, [])) {
        const cost = penalty(levels, n)
        if (cost < bestCost) {
          bestCost = cost
          best = levels
        }
      }
    }
  }
  return best
}

/**
 * Centra `span` unidades dentro de `[start, start + total)`, alternando o
 * arredondamento.
 *
 * Quando a diferença é ímpar não existe posição centrada: o nível fica meio
 * contêiner para um lado. Alternar o lado a cada degrau impede que os erros se
 * somem sempre no mesmo sentido — que é o que transformaria a pilha numa
 * escada encostada.
 *
 * Medido contra o NÍVEL DE BAIXO, nunca contra a base. A diferença é a que
 * separa apoio de contêiner flutuando: centrar dois níveis seguidos na base
 * com o arredondamento alternado pode jogar o de cima para a fileira oposta à
 * do de baixo, e aí ele paira sobre o vazio — defeito real, pego por
 * `nenhum contêiner flutua` no primeiro sistema da rotação. Centrado no de
 * baixo, o nível de cima está SEMPRE dentro dele, porque nunca é mais largo.
 */
const centred = (total: number, span: number, flip: boolean): number =>
  flip ? Math.ceil((total - span) / 2) : Math.floor((total - span) / 2)

/** Uma tecnologia com a camada de sustentação dela e o sistema a que pertence. */
export type Freight = { name: string; system: string; role: number }

export type Level = {
  cols: number
  rows: number
  /** As tecnologias deste nível, na ordem em que são montadas. */
  items: Freight[]
  /** Planta do nível em metros — a silhueta em números, para o SVG e os testes. */
  width: number
  depth: number
  /** Y do centro dos contêineres deste nível. */
  y: number
}

export type Assembly = {
  system: SceneSystem
  levels: Level[]
  /** Um lugar por contêiner, na ordem de montagem: base primeiro, fundo antes da frente. */
  slots: Slot[]
  /** A tecnologia estampada em cada contêiner, na mesma ordem de `slots`. */
  cargo: Freight[]
  width: number
  depth: number
  height: number
}

/**
 * Ordena a stack pela camada de sustentação, mantendo a ordem declarada
 * dentro de cada camada.
 *
 * Estável de propósito: o resultado é idêntico a cada carregamento, e quando
 * duas tecnologias dividem camada quem vem primeiro é quem o dono escreveu
 * primeiro em `content/systems.ts`.
 */
export function byFoundation(stack: readonly string[], system: string): Freight[] {
  return stack
    .map((name, order) => ({ freight: { name, system, role: roleOf(name) }, order }))
    .sort((a, b) => a.freight.role - b.freight.role || a.order - b.order)
    .map(({ freight }) => freight)
}

/**
 * Monta a disposição de um sistema.
 *
 * A pilha vem de `choosePile` (a forma) e a ordem vem de `byFoundation` (a
 * lógica). O resto é aritmética de grade: cada nível é centrado sobre o de
 * baixo, e dentro do nível as tecnologias mais fundamentais caem na fileira
 * que a câmera lê.
 */
export function buildAssembly(system: SceneSystem): Assembly {
  const cargo = byFoundation(system.stack, system.name)
  const courses = choosePile(cargo.length)
  const base = courses[0] ?? { cols: 1, rows: 1, count: 0 }

  const levels: Level[] = []
  const slots: Slot[] = []
  const ordered: Freight[] = []
  let taken = 0
  let colFlip = false
  let rowFlip = false
  let below = { cols: base.cols, rows: base.rows, colStart: 0, rowStart: 0 }

  courses.forEach((course, index) => {
    const colStart = below.colStart + centred(below.cols, course.cols, colFlip)
    const rowStart = below.rowStart + centred(below.rows, course.rows, rowFlip)
    if (course.cols !== below.cols) colFlip = !colFlip
    if (course.rows !== below.rows) rowFlip = !rowFlip
    below = { cols: course.cols, rows: course.rows, colStart, rowStart }

    const items = cargo.slice(taken, taken + course.count)
    taken += course.count
    const y = slotCenterY(index)

    // As fileiras completas ficam na FRENTE e a incompleta no fundo: o buraco
    // de um nível que não fecha o retângulo some atrás da própria pilha, em
    // vez de abrir um vão na fileira que a câmera lê.
    const complete = Math.floor(course.count / course.cols)
    const remainder = course.count % course.cols

    // Duas ordens diferentes, e as duas importam.
    //
    // Esta é a de VISIBILIDADE — da frente para o fundo —, e é a que casa
    // tecnologia com lugar: numa pilha vista quase de frente, a fileira de
    // trás fica escondida atrás da da frente, então o que sustenta o sistema
    // cai na fileira que a câmera lê.
    const cells: { col: number; row: number }[] = []
    for (let r = course.rows - 1; r >= 0; r--) {
      const width = r < course.rows - complete ? remainder : course.cols
      for (let c = 0; c < width; c++) cells.push({ col: colStart + c, row: rowStart + r })
    }

    // E esta é a de MONTAGEM — do fundo para a frente —, que é como uma
    // máquina trabalha: ela chega pelo pátio, que fica atrás, e vai fechando o
    // nível em direção a quem olha.
    const placed = cells
      .map((cell, i) => ({ cell, item: items[i] }))
      .sort((a, b) => a.cell.row - b.cell.row || a.cell.col - b.cell.col)

    for (const { cell, item } of placed) {
      if (!item) continue
      slots.push({
        x: (cell.col - (base.cols - 1) / 2) * PITCH.x,
        y,
        z: (cell.row - (base.rows - 1) / 2) * PITCH.z,
      })
      ordered.push(item)
    }

    levels.push({
      cols: course.cols,
      rows: course.rows,
      items,
      width: (course.cols - 1) * PITCH.x + CONTAINER.length,
      depth: (course.rows - 1) * PITCH.z + CONTAINER.width,
      y,
    })
  })

  const span = spanOf(courses)
  return { system, levels, slots, cargo: ordered, ...span }
}

/**
 * Variação de valor da chapa, sobre a MESMA tinta (`--color-surface-2`).
 *
 * Não é cor nova: é o mesmo token multiplicado, como chapa que pegou sol
 * diferente. Dois eixos, e os dois carregam informação:
 *
 * - o **sistema** dá o valor de base, então uma baia inteira do pátio lê como
 *   um conjunto — é o que faz o terminal parecer organizado por armador;
 * - a **camada de sustentação** clareia dentro do sistema, então na montagem a
 *   infraestrutura fica mais escura embaixo e a aplicação mais clara em cima.
 *
 * O valor acompanha o contêiner o ciclo inteiro, no pátio e na montagem — a
 * chapa dele está no atlas e não muda, que é o que a instanciação exige.
 */
export const plateShade = (system: number, role: number): number =>
  0.6 + (system % 3) * 0.09 + (role / Math.max(1, ROLE_COUNT - 1)) * 0.34
