import { systems } from '@/content/systems'

/**
 * A forma mínima que a constelação precisa de um sistema. Deliberadamente
 * menor que `System`: a cena não mostra nome, badge, métrica nem link —
 * só tamanho (linhas) e parentesco tecnológico (stack, que vira aresta).
 */
export type ConstellationSystem = {
  slug: string
  lines: number
  stack: readonly string[]
}

function linesOf(slug: string): number {
  const system = systems.find((candidate) => candidate.slug === slug)
  return system?.metrics.find((metric) => metric.key === 'lines')?.value ?? 0
}

/**
 * Os seis sistemas que NÃO estão na vitrine da home.
 *
 * A seção de Sistemas mostra três — os mais fortes, com case study próprio.
 * Mas a Telemetria logo abaixo do hero anuncia **9 sistemas**, e uma
 * constelação de três pontos contradiz esse número na cara do visitante,
 * além de parecer wireframe inacabado. Com os nove, a cena passa a
 * ilustrar a telemetria em vez de brigar com ela.
 *
 * São dados de visualização, não conteúdo: nada aqui é traduzível, nada
 * aqui aparece como texto na tela. Por isso vivem fora do dicionário.
 */
const NAO_VITRINE: readonly ConstellationSystem[] = [
  {
    slug: 'academia-saas',
    lines: 35400,
    stack: ['TypeScript', 'Fastify', 'Prisma', 'PostgreSQL', 'Redis', 'PWA', 'Nginx'],
  },
  {
    slug: 'fluxo-eventos',
    lines: 25900,
    stack: ['TypeScript', 'NestJS', 'Prisma', 'PostgreSQL', 'Redis', 'React', 'S3'],
  },
  {
    slug: 'prism-3d',
    lines: 12900,
    stack: ['TypeScript', 'React', 'Vite', 'GSAP', 'Groq'],
  },
  {
    slug: 'moveis-pro-site',
    lines: 11700,
    stack: ['TypeScript', 'Astro', 'Tailwind', 'Playwright'],
  },
  {
    slug: 'fluxopost',
    lines: 5970,
    stack: ['TypeScript', 'Next.js', 'Prisma', 'PostgreSQL', 'Groq'],
  },
  {
    slug: 'otoni-robo',
    lines: 620,
    stack: ['TypeScript', 'Express', 'Groq', 'Docker'],
  },
] as const

/**
 * Os nove. Os três da vitrine são **derivados** de `content/systems.ts` em
 * vez de repetidos aqui — se as linhas de código mudarem lá, mudam aqui
 * junto, e nunca existem dois lugares afirmando números diferentes para o
 * mesmo sistema.
 */
export const constellationSystems: readonly ConstellationSystem[] = [
  ...systems.map((system) => ({
    slug: system.slug,
    lines: linesOf(system.slug),
    stack: system.stack,
  })),
  ...NAO_VITRINE,
]
