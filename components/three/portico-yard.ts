import {
  siAnthropic,
  siAstro,
  siDocker,
  siDrizzle,
  siFastify,
  siGithubactions,
  siGoogle,
  siJavascript,
  siNestjs,
  siNextdotjs,
  siNginx,
  siNodedotjs,
  siPm2,
  siPnpm,
  siPostgresql,
  siPrisma,
  siPwa,
  siReact,
  siRedis,
  siSupabase,
  siTailwindcss,
  siThreedotjs,
  siTurborepo,
  siTypescript,
  siVercel,
  siVite,
  siVitest,
  siZod,
} from 'simple-icons'
import { CONTAINER, type Slot, slotCenterY, stencilLines } from './portico-model'

/**
 * O pátio: de onde a máquina tira o material e onde fica o que ela ainda não
 * usou.
 *
 * A cena começa com a FRENTE VAZIA — todo o material está aqui atrás, e a
 * ponte vai buscando de trás e trazendo. São dois conjuntos de pilhas com
 * papéis diferentes:
 *
 * - **origem**: exatamente um lugar por contêiner da arquitetura. Esvazia ao
 *   longo da montagem e enche de volta na desmontagem, nível a nível.
 * - **fundo**: o que não coube na pirâmide, parado. Dá porte de terminal em
 *   operação e é o que a névoa dissolve; a máquina nunca passa por cima dele.
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
 * CC0-1.0, então nada precisa ser atribuído na página.
 */
const ICONS = [
  siAnthropic,
  siAstro,
  siDocker,
  siDrizzle,
  siFastify,
  siGithubactions,
  siGoogle,
  siJavascript,
  siNestjs,
  siNextdotjs,
  siNginx,
  siNodedotjs,
  siPm2,
  siPnpm,
  siPostgresql,
  siPrisma,
  siPwa,
  siReact,
  siRedis,
  siSupabase,
  siTailwindcss,
  siThreedotjs,
  siTurborepo,
  siTypescript,
  siVercel,
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
 * exceções sairia de sincronia na primeira mudança do dicionário — e sairia
 * mesmo: o simple-icons TEM MikroTik, ao contrário do que se supunha, e
 * DEIXOU DE TER OpenAI e Playwright entre duas versões.
 */
export function iconSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(SLUG_CHARS, (char) => SLUG_REPLACEMENTS[char] ?? '')
    .normalize('NFD')
    .replace(/[^a-z\d]/g, '')
}

/**
 * A escada de resolução: como o nome CURTO do dicionário chega à marca.
 *
 * O slug exato sozinho não bastava, e a conta é esta: o dicionário escreve
 * "Node", "Tailwind", "Supabase/RLS" e "Vercel AI SDK", enquanto o pacote
 * registra `nodedotjs`, `tailwindcss`, `supabase` e `vercel`. Quatro marcas
 * existiam, estavam pagas no bundle e caíam em estêncil por diferença de
 * grafia — não por ausência.
 *
 * A saída NÃO é uma tabela de sinônimos escrita à mão (essa sai de sincronia
 * na primeira mudança do dicionário). São três tentativas, nesta ordem:
 *
 * 1. **Slug exato.** `React` → `react`. Vem primeiro para que `Vite` nunca
 *    caia em `vitest` e `GitHub Actions` nunca caia em `github`.
 * 2. **Primeiro segmento.** Corta em `/` e em espaço: `Supabase/RLS` →
 *    `supabase`, `Vercel AI SDK` → `vercel`. É como se escreve uma marca
 *    qualificada.
 * 3. **Prefixo ÚNICO dentro do que a cena importa.** `node` → `nodedotjs`,
 *    `tailwind` → `tailwindcss`. Único é a palavra que segura a regra: no
 *    pacote inteiro `node` casaria com cinco marcas (nodered, nodebb,
 *    nodegui, nodemon…), e é justamente por a busca correr só sobre `ICONS`
 *    que ela é segura — a lista de importação é a curadoria. Empate resolve
 *    para nada, e o nome cai em estêncil, que é o comportamento certo quando
 *    a intenção é ambígua.
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
 * tipografia dos rótulos de camada (`stencilLines`). A alternância não é
 * remendo: é o que faz o pátio parecer marcação de carga de verdade em vez de
 * vitrine de logos, e é o que garante que nenhuma tecnologia seja descartada
 * em silêncio por não ter logotipo.
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

// ── Pilhas ────────────────────────────────────────────────────────────────

/**
 * Passo entre pilhas do pátio. Mais folgado que o da arquitetura: no pátio o
 * que passa entre as pilhas é caminhão, não spreader.
 */
const YARD_PITCH = { x: CONTAINER.length + 1.35, z: CONTAINER.width + 1.4 } as const

/**
 * Onde começa o pátio de origem.
 *
 * A pirâmide termina em z ≈ −5,4 e a primeira baia começa em −11,6: seis
 * metros de corredor, a pista por onde um caminhão manobra. Sem esse vazio o
 * fundo encosta na frente e a cena inteira lê como uma pilha só.
 */
const SOURCE_ORIGIN = { x: 0, z: -11.6 } as const
/** Pilhas de três: alto o bastante para o pátio ter volume, baixo o bastante
 *  para a máquina não ter de içar até o topo do quadro a cada movimento. */
const SOURCE_HEIGHT = 3
const SOURCE_COLS = 3

/**
 * As pilhas paradas, mais fundas ainda.
 *
 * Ficam FORA do caminho da máquina de propósito (atrás da última baia de
 * origem): assim a altura delas nunca entra na conta da folga de içamento, e
 * a ponte pode passar rasteiro sobre o pátio de trabalho. `SPARE_LANE` é o
 * vazio que garante isso — e é medido a partir da última baia de origem, não
 * de um Z escrito à mão, porque a baia de origem se afasta quando a
 * arquitetura cresce.
 */
const SPARE_LANE = 13
/**
 * Uma coluna a mais que o pátio de trabalho, e não três.
 *
 * O bloco parado não pode passar da largura da pirâmide: quando passava, as
 * pilhas do fundo apareciam pelos DOIS lados dela, cortadas na borda do
 * quadro, e o olho lia três montes de peso igual em vez de uma arquitetura com
 * um terminal atrás. Fundo é o que dá escala ao assunto, não o que disputa com
 * ele.
 */
const SPARE_COLS = 4

/**
 * Altura de cada pilha parada — 3, 2, 4, repetindo.
 *
 * Um pátio parado nunca é nivelado, e é o dente de serra do topo das pilhas
 * que dá a leitura de "terminal em operação" em vez de "fileira de caixas".
 * Sai do índice, como tudo nesta cena: nenhum `Math.random()`, e o pátio é o
 * mesmo a cada carregamento.
 */
const spareHeight = (index: number): number => 2 + ((index * 2 + 1) % 3)

export type YardPlan = {
  /** Lugares da baia de origem, na ordem em que são enchidos (nível crescente). */
  source: Slot[]
  /** Lugares das pilhas paradas do fundo. */
  spare: Slot[]
  /** Planta de todas as pilhas, para o piso receber a marcação delas. */
  footprints: { x: number; z: number }[]
}

/**
 * Enche pilhas NÍVEL A NÍVEL, não pilha a pilha.
 *
 * A ordem importa duas vezes. Primeiro porque a máquina pega na ordem
 * inversa: enchendo por nível, o inverso sempre devolve um contêiner com nada
 * em cima, seja qual for o número de pilhas. Segundo porque, se o dicionário
 * encolher, o que falta é o topo das pilhas — que é exatamente como um pátio
 * esvazia.
 */
function fillStacks(count: number, spots: readonly { x: number; z: number }[], height: number): Slot[] {
  const slots: Slot[] = []
  for (let level = 0; level < height && slots.length < count; level++) {
    for (const spot of spots) {
      if (slots.length >= count) break
      slots.push({ x: spot.x, y: slotCenterY(level), z: spot.z })
    }
  }
  return slots
}

/**
 * Um bloco de pilhas: `count` plantas em fileiras de até `cols` colunas,
 * centradas em `origin` e recuando em profundidade.
 *
 * `stagger` desloca as fileiras ímpares meio passo para o lado. Não é
 * capricho: um bloco em grade perfeita lê como parede de tijolo, e o pátio de
 * fundo existe justamente para dar profundidade. Vale zero no pátio de
 * trabalho, onde a máquina desce entre as pilhas e o alinhamento é operacional.
 */
function block(
  count: number,
  colsMax: number,
  origin: { x: number; z: number },
  stagger: number,
): { x: number; z: number }[] {
  const cols = Math.max(1, Math.min(colsMax, count))
  const spots: { x: number; z: number }[] = []
  for (let row = 0; spots.length < count; row++) {
    for (let col = 0; col < cols && spots.length < count; col++) {
      spots.push({
        x: origin.x + (col - (cols - 1) / 2) * YARD_PITCH.x + (row % 2) * stagger,
        z: origin.z - row * YARD_PITCH.z,
      })
    }
  }
  return spots
}

/**
 * A planta do pátio inteiro sai do NÚMERO de contêineres da arquitetura:
 * pilhas de três num bloco de três colunas na frente, e atrás do corredor
 * tantas pilhas paradas quantas o excedente exigir. Mude o dicionário e o
 * pátio cresce ou encolhe junto — nenhuma posição escrita à mão.
 *
 * A conta das pilhas paradas é CUMULATIVA porque as alturas variam: dividir o
 * excedente pela altura média deixaria contêiner sem lugar de onde sair, e a
 * cena o materializaria no ar — que é exatamente o defeito que uma lista fixa
 * de seis pilhas produziu quando a arquitetura passou a sobrar mais carga.
 */
export function buildYard(sourceCount: number, spareCount: number): YardPlan {
  const spots = block(Math.max(1, Math.ceil(sourceCount / SOURCE_HEIGHT)), SOURCE_COLS, SOURCE_ORIGIN, 0)
  const source = fillStacks(sourceCount, spots, SOURCE_HEIGHT)

  let stacks = 0
  for (let room = 0; room < spareCount; stacks++) room += spareHeight(stacks)

  // O corredor é medido da última baia de origem, que se afasta quando a
  // arquitetura cresce. Um Z fixo aqui encostaria as pilhas paradas no pátio
  // de trabalho no dia em que o dicionário ganhasse uma tecnologia.
  const back = spots.reduce<number>((far, spot) => Math.min(far, spot.z), SOURCE_ORIGIN.z)
  const rest = block(stacks, SPARE_COLS, { x: SOURCE_ORIGIN.x, z: back - SPARE_LANE }, YARD_PITCH.x / 2)

  const spare: Slot[] = []
  rest.forEach((spot, index) => {
    for (let level = 0; level < spareHeight(index) && spare.length < spareCount; level++) {
      spare.push({ x: spot.x, y: slotCenterY(level), z: spot.z })
    }
  })

  return { source, spare, footprints: [...spots, ...rest] }
}

/**
 * Variação de valor da chapa entre os contêineres parados do fundo.
 *
 * Faixa estreita e toda abaixo da pirâmide (que vai de 0,72 a 1,37): chapa
 * gasta de pátio, e um degrau a menos de contraste para o fundo não disputar
 * leitura com o que precisa ser lido.
 */
export const yardShade = (index: number): number => 0.58 + (index % 4) * 0.04
