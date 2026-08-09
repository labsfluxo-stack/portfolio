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

// NENHUMA MÉTRICA AQUI PODE SER DE UMA CATEGORIA QUE A TELEMETRIA JÁ USA.
// Os cards mostravam linhas, tabelas, endpoints, commits e testes — as
// mesmas cinco categorias que `telemetry.metrics` e `telemetry.secondary`
// exibem uma rolagem abaixo, e que o case study repete uma terceira vez na
// prosa da arquitetura. "Linhas de código" aparecia três vezes no mesmo
// caminho de leitura.
//
// A divisão agora é de responsabilidade: a Telemetria conta o VOLUME
// somado da carreira, e o card conta o que é ESPECÍFICO daquele sistema —
// o número que só faz sentido falando dele. Há uma trava em
// tests/content.test.ts que quebra se as duas listas voltarem a se cruzar.
//
// Duas métricas por card, não quatro: fora das categorias da Telemetria, o
// Moveis.pro só tem dois números próprios, e três cards com contagens
// diferentes de célula ficariam desalinhados na fileira. O que carrega o
// card hoje é o `tagline` (ver SystemCard.tsx), não a quantidade de número.
export const systems: readonly System[] = [
  {
    slug: 'oscapstack',
    name: 'OSCapstack CRM',
    production: true,
    proprietary: true,
    metrics: [
      { key: 'policies', value: 146 },
      { key: 'screens', value: 42 },
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
      { key: 'packages', value: 14 },
      { key: 'jobs', value: 13 },
    ],
    stack: ['TypeScript', 'Fastify 5', 'Zod', 'PostgreSQL', 'pgvector', 'Drizzle', 'BullMQ', 'Redis', 'React', 'three.js'],
  },
  {
    slug: 'moveis-pro',
    name: 'Moveis.pro',
    production: true,
    proprietary: false,
    metrics: [
      { key: 'models', value: 40 },
      { key: 'apps', value: 3 },
    ],
    stack: ['TypeScript', 'Next.js', 'Fastify', 'Prisma', 'PostgreSQL', 'PWA', 'Docker', 'Nginx'],
    repoUrl: 'https://github.com/netoguild-rgb/Moveis.pro',
  },
] as const
