import type { SystemSlug } from './types'
import { SYSTEM_SLUGS } from './types'

export { SYSTEM_SLUGS }

export type System = {
  slug: SystemSlug
  name: string
  status: 'ok' | 'warn' | 'off'
  proprietary: boolean
  /** Rótulos curtos de telemetria; a unidade é traduzida via dicionário. */
  metrics: { key: string; value: string }[]
  stack: string[]
  repoUrl?: string
  liveUrl?: string
}

export const systems: readonly System[] = [
  {
    slug: 'oscapstack',
    name: 'OSCapstack CRM',
    status: 'ok',
    proprietary: true,
    metrics: [
      { key: 'lines', value: '78.900' },
      { key: 'tables', value: '56' },
      { key: 'policies', value: '146' },
      { key: 'endpoints', value: '219' },
    ],
    stack: ['TypeScript', 'Fastify 5', 'Supabase', 'PostgreSQL', 'React', 'Astro', 'Playwright', 'pgTAP', 'Docker'],
    liveUrl: 'https://os.capstack.capital',
  },
  {
    slug: 'saturno-labs',
    name: 'Saturno Labs',
    status: 'warn',
    proprietary: true,
    metrics: [
      { key: 'lines', value: '37.672' },
      { key: 'packages', value: '14' },
      { key: 'tables', value: '60' },
      { key: 'tests', value: '1.102' },
    ],
    stack: ['TypeScript', 'Fastify 5', 'Zod', 'PostgreSQL', 'pgvector', 'Drizzle', 'BullMQ', 'Redis', 'React', 'three.js'],
  },
  {
    slug: 'moveis-pro',
    name: 'Moveis.pro',
    status: 'ok',
    proprietary: false,
    metrics: [
      { key: 'lines', value: '56.500' },
      { key: 'models', value: '40' },
      { key: 'commits', value: '231' },
      { key: 'apps', value: '3' },
    ],
    stack: ['TypeScript', 'Next.js', 'Fastify', 'Prisma', 'PostgreSQL', 'PWA', 'Docker', 'Nginx'],
    repoUrl: 'https://github.com/netoguild-rgb/Moveis.pro',
  },
] as const
