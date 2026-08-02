import type { SystemSlug } from './types'
import { SYSTEM_SLUGS } from './types'

export { SYSTEM_SLUGS }

export type System = {
  slug: SystemSlug
  name: string
  /** Em produção, com evidência de deploy ativo no repositório. */
  production: boolean
  /** Código fechado, sem repositório público. Eixo independente de `production`. */
  proprietary: boolean
  /** Rótulos curtos de telemetria; a unidade é traduzida via dicionário. Valor
   * numérico puro — o separador de milhar é formatado no render, por locale. */
  metrics: { key: string; value: number }[]
  stack: string[]
  repoUrl?: string
  liveUrl?: string
}

export const systems: readonly System[] = [
  {
    slug: 'oscapstack',
    name: 'OSCapstack CRM',
    production: true,
    proprietary: true,
    metrics: [
      { key: 'lines', value: 78900 },
      { key: 'tables', value: 56 },
      { key: 'policies', value: 146 },
      { key: 'endpoints', value: 219 },
    ],
    stack: ['TypeScript', 'Fastify 5', 'Supabase', 'PostgreSQL', 'React', 'Astro', 'Playwright', 'pgTAP', 'Docker'],
    liveUrl: 'https://os.capstack.capital',
  },
  {
    slug: 'saturno-labs',
    name: 'Saturno Labs',
    production: false,
    proprietary: true,
    metrics: [
      { key: 'lines', value: 37672 },
      { key: 'packages', value: 14 },
      { key: 'tables', value: 60 },
      { key: 'tests', value: 1102 },
    ],
    stack: ['TypeScript', 'Fastify 5', 'Zod', 'PostgreSQL', 'pgvector', 'Drizzle', 'BullMQ', 'Redis', 'React', 'three.js'],
  },
  {
    slug: 'moveis-pro',
    name: 'Moveis.pro',
    production: true,
    proprietary: false,
    metrics: [
      { key: 'lines', value: 56500 },
      { key: 'models', value: 40 },
      { key: 'commits', value: 231 },
      { key: 'apps', value: 3 },
    ],
    stack: ['TypeScript', 'Next.js', 'Fastify', 'Prisma', 'PostgreSQL', 'PWA', 'Docker', 'Nginx'],
    repoUrl: 'https://github.com/netoguild-rgb/Moveis.pro',
  },
] as const
