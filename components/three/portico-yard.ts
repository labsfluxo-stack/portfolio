import {
  siCisco,
  siDocker,
  siFastify,
  siGithubactions,
  siMikrotik,
  siNginx,
  siPostgresql,
  siReact,
  siTypescript,
  siVitest,
} from 'simple-icons'
import type { StackItem } from '@/content/types'
import { slotCenterY, stencilLines } from './portico-model'

/**
 * O pátio atrás da fileira operacional.
 *
 * O princípio da cena é que **o significado fica na frente e a escala vem de
 * trás**: as seis camadas rotuladas não mudam, e tudo que entra recua na
 * névoa. Este módulo é só o "de trás" — onde ficam as baias, quantos
 * contêineres cada pilha tem e qual tecnologia está estampada em cada um.
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
 * nomeadamente é o que deixa o empacotador descartar o resto (medido: as dez
 * marcas abaixo custam ~18 KB no chunk da cena, não 5 MB). Importar o pacote
 * inteiro — ou indexá-lo por string em tempo de execução — impediria o
 * tree-shaking e sozinho multiplicaria o peso da cena por seis.
 *
 * Monocromático por escolha: a regra da paleta vale para ícone igual vale
 * para texto, e uma variante colorida traria cor de marca para dentro dos 11
 * tokens do design system. É também CC0-1.0, então nada precisa ser atribuído
 * na página.
 */
const ICONS = [
  siCisco,
  siDocker,
  siFastify,
  siGithubactions,
  siMikrotik,
  siNginx,
  siPostgresql,
  siReact,
  siTypescript,
  siVitest,
] as const

/** Indexado pelo slug que o próprio pacote declara — nenhum nome escrito à mão. */
const PATH_BY_SLUG = new Map(ICONS.map((icon) => [icon.slug, icon.path]))

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
 * mesmo: o simple-icons TEM MikroTik, ao contrário do que se supunha.
 */
export function iconSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(SLUG_CHARS, (char) => SLUG_REPLACEMENTS[char] ?? '')
    .normalize('NFD')
    .replace(/[^a-z\d]/g, '')
}

/**
 * O que vai estampado na face longa do contêiner.
 *
 * Ícone quando a marca existe, nome em estêncil quando não — na mesma
 * tipografia dos rótulos de camada (`stencilLines`). A alternância não é
 * remendo: é o que faz o pátio parecer marcação de carga de verdade em vez de
 * vitrine de logos, e é o que garante que nenhuma tecnologia seja descartada
 * em silêncio por não ter logotipo.
 */
export type YardMark = { name: string; kind: 'icon'; path: string } | { name: string; kind: 'text'; lines: string[] }

export function markFor(name: string): YardMark {
  const path = PATH_BY_SLUG.get(iconSlug(name))
  return path ? { name, kind: 'icon', path } : { name, kind: 'text', lines: stencilLines(name) }
}

// ── Baias ─────────────────────────────────────────────────────────────────

/**
 * As três baias de fundo, em profundidade crescente.
 *
 * O corredor é o que impede a leitura de "parede de caixas": o truque das
 * pernas do pórtico termina em z ≈ −5,1 e a primeira baia começa em −15,5 —
 * dez metros de pista, a faixa por onde um caminhão manobra.
 *
 * A primeira baia é uma FILEIRA CONTÍNUA, não pilhas soltas. Isso não é
 * detalhe: pilhas isoladas e espaçadas leem como entulho atrás da máquina.
 * O que faz um pátio parecer pátio é a corrida de contêineres encostados uns
 * nos outros com o topo em degraus — 6,5 m de passo, a folga de manobra de
 * um terminal de verdade. O que aparece dela é o que a fileira da frente não
 * cobre, e é justamente essa oclusão parcial que dá a leitura de "tem mais
 * pátio do que dá para ver".
 *
 * A silhueta vem da baia do meio: a torre de cinco sobe acima da corrida de
 * dois da baia da frente, e a névoa já a entregou como vulto. Alturas
 * desiguais não são enfeite — um pátio nivelado parece prateleira.
 *
 * As posições em X não foram escolhidas no olho: cada uma foi projetada na
 * tela com a matemática de `Framing`, nas DUAS larguras que mostram a cena.
 * Duas restrições saíram daí, e as duas custaram uma volta:
 *
 * - Uma pilha atrás da fileira da frente simplesmente não existe. A câmera
 *   está a ~49 m e desviada em azimute; a pilha da frente cobre uma faixa
 *   larga do quadro, e o que cai atrás dela some inteiro. Só valem os vazios:
 *   o triângulo à esquerda, a folga entre as duas baias, e a extensão à
 *   direita quando a baia de origem esvazia.
 * - Nada pode encostar na borda da tela. O `<canvas>` ocupa a metade direita
 *   da página, e um contêiner cortado pela aresta dele não lê como "o pátio
 *   continua": lê como falha de render. Em 1024 a máquina já ocupa quase toda
 *   a largura, e é essa a janela que manda — por isso as baias fundas não se
 *   afastam mais em X do que se afastam em Z.
 */
const ROWS: readonly { z: number; stacks: readonly { x: number; height: number }[] }[] = [
  {
    z: -15.5,
    stacks: [
      { x: -18.5, height: 3 },
      { x: -12, height: 2 },
      { x: -5.5, height: 2 },
      { x: 1, height: 2 },
    ],
  },
  {
    z: -24.5,
    stacks: [
      { x: -8, height: 5 },
      { x: -1.5, height: 2 },
    ],
  },
  { z: -28, stacks: [{ x: -23, height: 2 }] },
]

export type YardSlot = { x: number; y: number; z: number }

/**
 * Uma posição por contêiner, na ordem em que as baias são carregadas.
 *
 * A ordem é por NÍVEL, não por pilha: primeiro o piso de todas as pilhas,
 * depois o segundo de todas, e assim por diante. Duas consequências, as duas
 * intencionais — tecnologias vizinhas no dicionário caem em pilhas
 * diferentes, então ícone e texto se espalham em vez de se agrupar; e se o
 * dicionário encolher, o que falta é o topo das pilhas mais altas, que é
 * exatamente como um pátio esvazia.
 */
function buildSlots(): YardSlot[] {
  const tallest = Math.max(...ROWS.flatMap((row) => row.stacks.map((stack) => stack.height)))
  const slots: YardSlot[] = []
  for (let level = 0; level < tallest; level++) {
    for (const row of ROWS) {
      for (const stack of row.stacks) {
        if (stack.height > level) slots.push({ x: stack.x, y: slotCenterY(level), z: row.z })
      }
    }
  }
  return slots
}

export const YARD_SLOTS: readonly YardSlot[] = buildSlots()
export const YARD_CAPACITY = YARD_SLOTS.length

/** Planta das pilhas de fundo, para o piso do pátio receber a marcação delas. */
export const YARD_FOOTPRINTS: readonly { x: number; z: number }[] = ROWS.flatMap((row) =>
  row.stacks.map((stack) => ({ x: stack.x, z: row.z })),
)

/**
 * Variação de valor da chapa entre os contêineres de fundo.
 *
 * Faixa estreita e toda abaixo da fileira da frente (que vai de 0,72 a 1,37):
 * chapa gasta de pátio, e um degrau a menos de contraste para o fundo não
 * disputar leitura com o que precisa ser lido.
 */
export const yardShade = (index: number): number => 0.58 + (index % 4) * 0.04

// ── Carga ─────────────────────────────────────────────────────────────────

/** Domínio primeiro: o pátio guarda o que o dono declara dominar. */
const LEVEL_RANK: Record<StackItem['level'], number> = { dominio: 0, producao: 1, contato: 2 }

/**
 * Escolhe as tecnologias que entram no pátio, na ordem em que as baias são
 * preenchidas.
 *
 * Ordena por nível (domínio > produção > contato) mantendo a ordem do
 * dicionário dentro de cada nível — estável, então o resultado é idêntico a
 * cada carregamento e nos dois idiomas. Corta na capacidade das baias: hoje
 * são exatamente os 18 itens de nível `dominio`, o que dá ao pátio um
 * significado além do enfeite.
 */
export function yardCargo(items: readonly StackItem[], capacity: number = YARD_CAPACITY): YardMark[] {
  return items
    .map((item, order) => ({ item, order }))
    .sort((a, b) => LEVEL_RANK[a.item.level] - LEVEL_RANK[b.item.level] || a.order - b.order)
    .slice(0, Math.max(0, capacity))
    .map(({ item }) => markFor(item.name))
}
