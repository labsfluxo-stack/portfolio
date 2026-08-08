import {
  siAstro,
  siDocker,
  siDrizzle,
  siExpress,
  siFastify,
  siGsap,
  siNestjs,
  siNextdotjs,
  siNginx,
  siNodedotjs,
  siPostgresql,
  siPrisma,
  siPwa,
  siReact,
  siRedis,
  siSupabase,
  siTailwindcss,
  siThreedotjs,
  siTypescript,
  siVite,
  siVitest,
  siZod,
} from 'simple-icons'
import type { Freight } from './portico-architecture'
import { CONTAINER, type Slot, slotCenterY, stencilLines } from './portico-model'
import { plain } from './portico-systems'

/**
 * O pátio: onde MORA cada contêiner de cada sistema.
 *
 * Esta é a peça que faz a rotação de sistemas não ter corte. Cada contêiner
 * tem uma casa fixa: a máquina tira do pátio o que o sistema da vez precisa,
 * monta, devolve tudo aos mesmos lugares e segue para o sistema seguinte.
 * Nenhum contêiner aparece, some ou troca de estampa no meio do caminho.
 *
 * O ganho é duplo. O corte some, e o fundo deixa de ser cenário: as pilhas
 * paradas do fundo não são mais enchimento — são os outros sistemas
 * esperando a vez, com as tecnologias verdadeiras deles estampadas na chapa.
 *
 * O pátio tem DOIS tipos de baia, e decidir quem vai para qual é o que
 * `manifestFor` calcula:
 *
 * - **baia de sistema**, uma por sistema, com as tecnologias que são
 *   ASSINATURA dele — as que nenhum outro, ou quase nenhum outro, usa;
 * - **estoque comum**, uma fileira rasa na frente, com UM contêiner por
 *   tecnologia que quase todos usam, emprestado a cada montagem por vez.
 *
 * Como `portico-model.ts`, aqui não entra three.js: é aritmética e dados,
 * testável sem GPU. Nenhum `Math.random()` — posição, altura e carga saem
 * todas de índice.
 */

// ── Ícones ────────────────────────────────────────────────────────────────

/**
 * Os ícones que o pátio carrega, importados um a um.
 *
 * `simple-icons` publica 3.400 marcas num módulo único de 5 MB; importar
 * nomeadamente é o que deixa o empacotador descartar o resto (medido: cada
 * marca custa o tamanho do seu `path`, ~1 KB, e não 5 MB). Importar o pacote
 * inteiro — ou indexá-lo por string em tempo de execução — impediria o
 * tree-shaking e sozinho multiplicaria o peso da cena por seis.
 *
 * A lista é a das tecnologias que os sistemas de fato usam, mais um punhado de
 * vizinhas prováveis. Quem não estiver aqui não quebra nada: cai em estêncil,
 * que é o comportamento certo (ver `markFor`).
 *
 * CC0-1.0, então nada precisa ser atribuído na página.
 */
const ICONS = [
  siAstro,
  siDocker,
  siDrizzle,
  siExpress,
  siFastify,
  siGsap,
  siNestjs,
  siNextdotjs,
  siNginx,
  siNodedotjs,
  siPostgresql,
  siPrisma,
  siPwa,
  siReact,
  siRedis,
  siSupabase,
  siTailwindcss,
  siThreedotjs,
  siTypescript,
  siVite,
  siVitest,
  siZod,
] as const

/** Indexado pelo slug que o próprio pacote declara — nenhum nome escrito à mão. */
const ICON_BY_SLUG = new Map(ICONS.map((icon) => [icon.slug, icon]))

/**
 * A tabela de substituição do `titleToSlug` do simple-icons, copiada porque o
 * `simple-icons/sdk` importa `node:fs` no topo e não sobrevive no navegador.
 */
const SLUG_REPLACEMENTS: Record<string, string> = {
  '+': 'plus',
  '.': 'dot',
  '&': 'and',
  đ: 'd',
  ħ: 'h',
  ı: 'i',
  ĸ: 'k',
  ŀ: 'l',
  ł: 'l',
  ß: 'ss',
  ŧ: 't',
  ø: 'o',
}
const SLUG_CHARS = new RegExp(`[${Object.keys(SLUG_REPLACEMENTS).join('')}]`, 'g')

/**
 * Nome de tecnologia → slug do simple-icons, pela mesma regra do pacote.
 *
 * É esta função que faz a ausência de ícone cair no texto **sozinha**: quem
 * não estiver em `ICONS` simplesmente não é encontrado. Uma lista manual de
 * exceções sairia de sincronia na primeira mudança do conteúdo — e sairia
 * mesmo: o simple-icons DEIXOU DE TER OpenAI e Playwright entre duas versões,
 * e nunca teve Groq, pgTAP, pgvector nem BullMQ.
 */
export function iconSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(SLUG_CHARS, (char) => SLUG_REPLACEMENTS[char] ?? '')
    .normalize('NFD')
    .replace(/[^a-z\d]/g, '')
}

/**
 * A escada de resolução: como o nome CURTO do conteúdo chega à marca.
 *
 * O slug exato sozinho não basta, e a conta é esta: o conteúdo escreve
 * "Fastify 5", "Next.js" e "three.js", enquanto o pacote registra `fastify`,
 * `nextdotjs` e `threedotjs`. São três tentativas, nesta ordem:
 *
 * 1. **Slug exato.** `React` → `react`. Vem primeiro para que `Vite` nunca
 *    caia em `vitest`.
 * 2. **Primeiro segmento.** Corta em `/` e em espaço: `Fastify 5` → `fastify`.
 *    É como se escreve uma marca qualificada.
 * 3. **Prefixo ÚNICO dentro do que a cena importa.** `node` → `nodedotjs`.
 *    Único é a palavra que segura a regra: no pacote inteiro `node` casaria
 *    com cinco marcas, e é justamente por a busca correr só sobre `ICONS` que
 *    ela é segura — a lista de importação é a curadoria. Empate resolve para
 *    nada, e o nome cai em estêncil, que é o comportamento certo quando a
 *    intenção é ambígua.
 */
function resolveIcon(name: string): (typeof ICONS)[number] | undefined {
  const slug = iconSlug(name)
  const exact = ICON_BY_SLUG.get(slug)
  if (exact) return exact

  const head = iconSlug(name.split(/[/\s]/)[0] ?? '')
  const segment = head && head !== slug ? ICON_BY_SLUG.get(head) : undefined
  if (segment) return segment

  if (!slug) return undefined
  const prefixed = ICONS.filter((icon) => icon.slug.startsWith(slug))
  return prefixed.length === 1 ? prefixed[0] : undefined
}

/**
 * O que vai estampado na face longa do contêiner.
 *
 * Ícone quando a marca existe, nome em estêncil quando não — na mesma
 * tipografia dos rótulos (`stencilLines`). A alternância não é remendo: é o
 * que faz o pátio parecer marcação de carga de verdade em vez de vitrine de
 * logos, e é o que garante que nenhuma tecnologia seja descartada em silêncio
 * por não ter logotipo.
 *
 * `hex` é a cor OFICIAL da marca, declarada pelo próprio pacote. Ver
 * `portico-textures.ts`: é a única exceção autorizada à paleta do projeto.
 */
export type YardMark =
  | { name: string; kind: 'icon'; path: string; hex: string }
  | { name: string; kind: 'text'; lines: string[] }

export function markFor(name: string): YardMark {
  const icon = resolveIcon(name)
  return icon
    ? { name, kind: 'icon', path: icon.path, hex: `#${icon.hex}` }
    : { name, kind: 'text', lines: stencilLines(name) }
}

/** Se uma tecnologia tem marca — usado pelos testes e pela contagem do atlas. */
export const hasBrand = (name: string): boolean => !!resolveIcon(name) && !!plain(name)

// ── Assinatura e estoque ──────────────────────────────────────────────────

/**
 * A identidade VISUAL de uma tecnologia — o que o olho conta como repetição.
 *
 * Não é o nome. O conteúdo escreve "Fastify 5" num sistema e "Fastify" noutro,
 * e a chapa dos dois recebe o MESMO logotipo: contar por nome diria que são
 * duas marcas diferentes e deixaria as duas paradas no pátio. Contar pela
 * marca resolvida conta o que a cena de fato mostra.
 */
export function brandOf(name: string): string {
  const icon = resolveIcon(name)
  return icon ? `icon:${icon.slug}` : `text:${plain(name)}`
}

/**
 * Em quantos sistemas uma marca ainda conta como ASSINATURA, e é este número
 * que decide quem espera na baia e quem vai para o estoque comum.
 *
 * O defeito que ele existe para corrigir foi visto e reportado: com cada baia
 * mostrando a stack completa do seu sistema, o TypeScript aparecia sete vezes
 * no pátio e o Docker três. É verdade factual — TypeScript está mesmo nos sete
 * sistemas — e mesmo assim lê como preguiça, porque uma marca que se repete no
 * fundo inteiro não distingue nada. `pgvector`, `BullMQ`, `three.js`, `NestJS`
 * e `GSAP` distinguem: cada uma aponta para um sistema só.
 *
 * O corte é CALCULADO sobre a rotação, nunca escrito à mão — uma lista de
 * "tecnologias comuns" sairia de sincronia na primeira mudança de
 * `content/systems.ts`, que é justamente a mudança que a cena existe para
 * acompanhar sozinha.
 *
 * E o valor 2 não é gosto: ele é o único que fecha os dois lados.
 *
 * - Uma marca de assinatura aparece uma vez por sistema que a usa, então o
 *   limiar É o teto de repetição no pátio. Com 3, Docker e Prisma voltariam a
 *   aparecer três vezes — o defeito de novo, mais fraco.
 * - Com 1, a baia da Academia SaaS ficaria VAZIA: as duas tecnologias que
 *   sobram nela (PWA e Nginx) são compartilhadas com a Moveis.pro, e uma baia
 *   vazia é um sistema que sumiu do pátio.
 *
 * Dois é o que resta. A conta se refaz sozinha quando o conteúdo mudar; o que
 * não se refaz é o critério, e ele está escrito aqui.
 */
export const SIGNATURE_MAX = 2

/** Um contêiner da cena: o que ele leva estampado e de quem ele é. */
export type Unit = {
  name: string
  /** O sistema dono, ou -1 quando a peça é do estoque comum. */
  system: number
  role: number
}

export type Manifest = {
  /** Uma entrada por contêiner da cena, na ordem das instâncias. */
  units: Unit[]
  /** O contêiner de cada posição da montagem, sistema a sistema. */
  crews: number[][]
  /** As baias do pátio: o estoque comum na frente, depois uma por sistema. */
  bays: Bay[]
}

/**
 * Quem existe no pátio, e de quem é cada peça.
 *
 * Recebe a carga de cada montagem (`Assembly.cargo`, na ordem em que ela é
 * montada) e devolve o inventário da cena inteira. Duas regras, e as duas
 * saem da frequência calculada acima:
 *
 * 1. Tecnologia de ASSINATURA ganha um contêiner por sistema, e ele espera na
 *    baia do dono, com o nome do sistema estampado.
 * 2. Tecnologia COMUM ganha UM contêiner, e um só, no estoque. Ele é montado
 *    por todo sistema que a usa — o que é possível porque só um sistema é
 *    montado por vez, e é o que garante que a marca nunca apareça duas vezes
 *    no quadro.
 *
 * O estoque é montado na ordem da rotação, então a grafia que fica é a do
 * primeiro sistema que usa a marca: determinístico, e sem ninguém escolher.
 *
 * **A montagem não muda.** `crews[i]` tem um contêiner para CADA posição de
 * `cargos[i]`, na mesma ordem: o sistema da vez continua sendo montado com a
 * stack completa e real dele, TypeScript incluído. O que mudou é de onde vem
 * cada peça, e portanto o que o pátio mostra enquanto ela espera.
 */
export function manifestFor(cargos: readonly (readonly Freight[])[]): Manifest {
  const tally = new Map<string, number>()
  for (const cargo of cargos) {
    for (const brand of new Set(cargo.map((freight) => brandOf(freight.name)))) {
      tally.set(brand, (tally.get(brand) ?? 0) + 1)
    }
  }

  const units: Unit[] = []
  const stock = new Map<string, number>()
  for (const cargo of cargos) {
    for (const freight of cargo) {
      const brand = brandOf(freight.name)
      if ((tally.get(brand) ?? 0) <= SIGNATURE_MAX || stock.has(brand)) continue
      stock.set(brand, units.length)
      units.push({ name: freight.name, system: -1, role: freight.role })
    }
  }

  const crews = cargos.map((cargo, system) => {
    // Uma peça do estoque só pode ser emprestada UMA vez por montagem: dois
    // nomes da mesma marca na mesma stack (um "Node" e um "Node.js") mandariam
    // a máquina buscar o mesmo contêiner duas vezes. O segundo vira peça
    // própria, que é o que ele é.
    const borrowed = new Set<number>()
    return cargo.map((freight) => {
      const shared = stock.get(brandOf(freight.name))
      if (shared !== undefined && !borrowed.has(shared)) {
        borrowed.add(shared)
        return shared
      }
      units.push({ name: freight.name, system, role: freight.role })
      return units.length - 1
    })
  })

  return {
    units,
    crews,
    // O estoque é RASO — um andar só — e essa é a única forma que funciona:
    // cada sistema leva um subconjunto diferente dele, e numa pilha de três a
    // peça que um sistema não quer acaba em cima da que ele quer. No chão,
    // qualquer peça está sempre livre.
    bays: [
      { count: stock.size, levels: 1 },
      ...crews.map((crew, system) => ({ count: crew.filter((id) => units[id]?.system === system).length })),
    ],
  }
}

// ── Baias ─────────────────────────────────────────────────────────────────

/**
 * Passo entre pilhas do pátio. Mais folgado que o da montagem, porque no pátio
 * o que passa entre as pilhas é caminhão, não só o spreader — mas bem menos
 * folgado do que era: com sete baias no chão ao mesmo tempo, cada metro de
 * corredor a mais empurra a baia do fundo para dentro da névoa e alonga todo
 * translado.
 */
const YARD_PITCH = { x: CONTAINER.length + 0.95, z: CONTAINER.width + 0.71 } as const

/**
 * Altura máxima de uma pilha do pátio.
 *
 * Três é o número que fecha a conta de todos os lados: baixo o bastante para a
 * máquina passar por cima do pátio sem ir ao topo do quadro (o perfil de
 * altura mede contra o que ela cruza, e o que ela cruza é isto), alto o
 * bastante para as pilhas caberem em poucas fileiras, e o suficiente para o
 * pátio ter volume em vez de parecer um estacionamento.
 *
 * É o padrão, não a lei: o estoque comum pede um andar só (ver `manifestFor`),
 * e por isso a altura é uma propriedade da baia.
 */
export const STACK_HEIGHT = 3

/** Uma baia do pátio: quantos contêineres ela guarda, e em quantos andares. */
export type Bay = { count: number; levels?: number }

/**
 * Colunas de pilha por fileira.
 *
 * Três, e a decisão é de COMPOSIÇÃO antes de ser de espaço.
 *
 * O pátio tem de ser mais estreito que a montagem, senão vira o objeto mais
 * largo do quadro e passa a disputar a leitura com o que ele existe para
 * emoldurar. Com quatro colunas ele era: as baias sangravam pela borda direita
 * enquanto sobrava laje vazia na esquerda, porque a câmera é girada e o fundo
 * balança para o lado ao recuar. Com três, a montagem volta a ser o elemento
 * mais largo, e o pátio cresce para onde a perspectiva o comprime — a
 * profundidade — em vez de para os lados.
 *
 * O custo é translado: as baias do fundo ficam mais longe. Isso é honesto (uma
 * baia funda é uma viagem longa) e ainda varia o ritmo entre um sistema e
 * outro.
 */
const YARD_COLS = 3

/**
 * Corredor entre a área de montagem e a primeira fileira de baias.
 *
 * Doze metros, e o número dobrou por uma razão de composição que só apareceu
 * quando o pátio passou de vinte para quarenta e nove contêineres: com cinco
 * metros e meio, a montagem e a fila de espera encostavam uma na outra e o
 * quadro inteiro virava caixa de ponta a ponta — "pilha em close" em vez de
 * "máquina montando num pátio".
 *
 * O que separa os dois não é a câmera: é o VAZIO. Doze metros de concreto
 * pintado entre a última baia e a montagem dão à frente o que ela precisa para
 * ser assunto — chão em volta, sombra com onde pousar — e empurram as baias
 * para dentro da névoa, que é onde cenário deve estar. Custa uns dois
 * segundos de translado por movimento, e vale.
 */
const LANE = 12

export type YardPlan = {
  /** Os lugares de cada baia, na ordem em que as pilhas são enchidas. */
  homes: Slot[][]
  /**
   * Planta de todas as pilhas, para o piso receber a marcação delas. `code` é
   * o número de posição pintado no chão: letra da baia e número da pilha
   * dentro dela. Sai do índice, como tudo aqui.
   */
  footprints: { x: number; z: number; code: string }[]
}

/**
 * Quantos contêineres em cada pilha de uma baia.
 *
 * Distribuídos por igual, e não "enche uma, começa a outra": uma baia com duas
 * pilhas cheias e uma com um contêiner só lê como sobra, não como carga
 * organizada. O resto é distribuído nas primeiras pilhas, que é o que um
 * operador faz.
 */
function stackHeights(count: number, levels: number): number[] {
  if (count <= 0) return []
  const stacks = Math.max(1, Math.ceil(count / levels))
  const base = Math.floor(count / stacks)
  const extra = count % stacks
  return Array.from({ length: stacks }, (_, i) => base + (i < extra ? 1 : 0))
}

/**
 * A planta do pátio inteiro sai do TAMANHO de cada baia, preenchendo fileiras
 * de `YARD_COLS` colunas e recuando em profundidade.
 *
 * A ordem das baias é a da rotação, com o estoque comum na frente. Não é
 * arrumação: o estoque é a baia que TODA montagem visita, então ela é a que
 * tem de ficar mais perto do corredor; e as baias de sistema em ordem de
 * rotação deixam a do sistema seguinte perto da do atual, o que encurta o
 * translado da virada.
 *
 * `depth` é a profundidade da maior montagem — é dela que sai onde o corredor
 * começa, para que o pátio recue junto se um sistema crescer.
 */
export function buildYard(bays: readonly Bay[], depth: number): YardPlan {
  const originZ = -(depth / 2 + LANE + CONTAINER.width / 2)
  const homes: Slot[][] = []
  const footprints: { x: number; z: number; code: string }[] = []
  let cursor = 0

  const spotAt = (index: number): { x: number; z: number } => ({
    x: (((index % YARD_COLS) + YARD_COLS) % YARD_COLS - (YARD_COLS - 1) / 2) * YARD_PITCH.x,
    z: originZ - Math.floor(index / YARD_COLS) * YARD_PITCH.z,
  })

  bays.forEach((bay, index) => {
    const levels = bay.levels ?? STACK_HEIGHT
    const heights = stackHeights(bay.count, levels)
    const spots = heights.map((_, i) => spotAt(cursor + i))
    footprints.push(
      ...spots.map((spot, i) => ({ ...spot, code: `${String.fromCharCode(65 + (index % 26))}${i + 1}` })),
    )
    cursor += heights.length

    // Enche NÍVEL A NÍVEL, não pilha a pilha. A ordem importa duas vezes:
    // porque a máquina pega na ordem inversa (e o inverso de "nível a nível"
    // sempre devolve um contêiner sem nada em cima), e porque se um sistema
    // encolher o que falta é o topo das pilhas — que é como um pátio esvazia.
    const slots: Slot[] = []
    for (let level = 0; level < levels; level++) {
      heights.forEach((height, i) => {
        const spot = spots[i]
        if (!spot || level >= height) return
        slots.push({ x: spot.x, y: slotCenterY(level), z: spot.z })
      })
    }
    homes.push(slots)
  })

  return { homes, footprints }
}

/**
 * A casa de cada contêiner, indexada pelo id da instância.
 *
 * É aqui que o inventário encontra a planta. A regra que não pode ser
 * afrouxada é a de EMPILHAMENTO: a máquina esvazia a baia na ordem da
 * montagem, então a peça montada primeiro — a base, a infraestrutura — tem de
 * ser a que está no ALTO da pilha, senão a máquina escava.
 *
 * Como a baia é enchida de baixo para cima (`buildYard`), a conta é direta:
 * a n-ésima peça da montagem mora no n-ésimo lugar contado do fim. As peças de
 * estoque não entram nessa conta porque o estoque é raso: no chão, toda peça
 * está sempre livre, e a máquina pode buscá-la a qualquer altura do ciclo.
 */
export function stow(manifest: Manifest, homes: readonly (readonly Slot[])[]): Slot[] {
  const ground: Slot = { x: 0, y: slotCenterY(0), z: 0 }
  const home: Slot[] = manifest.units.map(() => ground)

  const stock = homes[0] ?? []
  let next = 0
  manifest.units.forEach((unit, id) => {
    if (unit.system < 0) home[id] = stock[next++] ?? ground
  })

  manifest.crews.forEach((crew, system) => {
    const slots = homes[system + 1] ?? []
    crew
      .filter((id) => manifest.units[id]?.system === system)
      .forEach((id, order) => {
        home[id] = slots[slots.length - 1 - order] ?? ground
      })
  })

  return home
}
