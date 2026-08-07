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
import { CONTAINER, type Slot, slotCenterY, stencilLines } from './portico-model'
import { plain } from './portico-systems'

/**
 * O pátio: onde MORA cada contêiner de cada sistema.
 *
 * Esta é a peça que faz a rotação de sistemas não ter corte. Cada sistema tem
 * uma baia própria, e cada contêiner uma casa fixa dentro dela: a máquina
 * esvazia a baia do sistema da vez para montá-lo, devolve tudo às mesmas
 * pilhas e segue para a baia seguinte. Nenhum contêiner aparece, some ou troca
 * de estampa no meio do caminho.
 *
 * O ganho é duplo. O corte some, e o fundo deixa de ser cenário: as pilhas
 * paradas do fundo não são mais enchimento — são os outros sistemas
 * esperando a vez, com as tecnologias verdadeiras deles estampadas na chapa.
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

// ── Baias ─────────────────────────────────────────────────────────────────

/**
 * Passo entre pilhas do pátio. Mais folgado que o da montagem, porque no pátio
 * o que passa entre as pilhas é caminhão, não só o spreader — mas bem menos
 * folgado do que era: com sete baias no chão ao mesmo tempo, cada metro de
 * corredor a mais empurra a baia do fundo para dentro da névoa e alonga todo
 * translado.
 */
const YARD_PITCH = { x: CONTAINER.length + 0.95, z: CONTAINER.width + 1.05 } as const

/**
 * Altura máxima de uma pilha do pátio.
 *
 * Três é o número que fecha a conta de todos os lados: baixo o bastante para a
 * máquina passar por cima do pátio sem ir ao topo do quadro (o perfil de
 * altura mede contra o que ela cruza, e o que ela cruza é isto), alto o
 * bastante para as dezenove pilhas caberem em cinco fileiras, e o suficiente
 * para o pátio ter volume em vez de parecer um estacionamento.
 */
const STACK_HEIGHT = 3

/**
 * Colunas de pilha por fileira.
 *
 * Quatro é o compromisso entre largura e profundidade. Mais colunas afastam os
 * trilhos (`rigFor` os dimensiona pelo alcance) e a câmera recua até a
 * montagem virar miniatura; menos colunas empurram as baias para o fundo e
 * alongam cada translado.
 */
const YARD_COLS = 4

/**
 * Corredor entre a área de montagem e a primeira fileira de baias — a pista
 * por onde um caminhão manobra. Sem esse vazio o fundo encosta na frente e a
 * cena inteira lê como uma pilha só.
 */
const LANE = 5.5

export type YardPlan = {
  /** Os lugares de cada sistema, na ordem em que as pilhas são enchidas. */
  homes: Slot[][]
  /**
   * Planta de todas as pilhas, para o piso receber a marcação delas. `code` é
   * o número de posição pintado no chão: letra da baia (um sistema) e número
   * da pilha dentro dela. Sai do índice, como tudo aqui.
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
function stackHeights(count: number): number[] {
  const stacks = Math.max(1, Math.ceil(count / STACK_HEIGHT))
  const base = Math.floor(count / stacks)
  const extra = count % stacks
  return Array.from({ length: stacks }, (_, i) => base + (i < extra ? 1 : 0))
}

/**
 * A planta do pátio inteiro sai do TAMANHO de cada sistema: uma baia por
 * sistema, na ordem da rotação, preenchendo fileiras de `YARD_COLS` colunas e
 * recuando em profundidade.
 *
 * Pôr as baias na ordem da rotação não é arrumação: é o que deixa a baia do
 * sistema seguinte perto da do atual, e portanto o translado da virada curto.
 *
 * `depth` é a profundidade da maior montagem — é dela que sai onde o corredor
 * começa, para que o pátio recue junto se um sistema crescer.
 */
export function buildYard(counts: readonly number[], depth: number): YardPlan {
  const originZ = -(depth / 2 + LANE + CONTAINER.width / 2)
  const homes: Slot[][] = []
  const footprints: { x: number; z: number; code: string }[] = []
  let cursor = 0

  const spotAt = (index: number): { x: number; z: number } => ({
    x: (((index % YARD_COLS) + YARD_COLS) % YARD_COLS - (YARD_COLS - 1) / 2) * YARD_PITCH.x,
    z: originZ - Math.floor(index / YARD_COLS) * YARD_PITCH.z,
  })

  counts.forEach((count, bay) => {
    const heights = stackHeights(count)
    const spots = heights.map((_, i) => spotAt(cursor + i))
    footprints.push(
      ...spots.map((spot, i) => ({ ...spot, code: `${String.fromCharCode(65 + (bay % 26))}${i + 1}` })),
    )
    cursor += heights.length

    // Enche NÍVEL A NÍVEL, não pilha a pilha. A ordem importa duas vezes:
    // porque a máquina pega na ordem inversa (e o inverso de "nível a nível"
    // sempre devolve um contêiner sem nada em cima), e porque se um sistema
    // encolher o que falta é o topo das pilhas — que é como um pátio esvazia.
    const slots: Slot[] = []
    for (let level = 0; level < STACK_HEIGHT; level++) {
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
