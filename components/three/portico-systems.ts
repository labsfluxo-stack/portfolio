/**
 * O que a máquina monta: sistemas REAIS, um por vez, em rotação sem fim.
 *
 * A cena não empilha mais uma pirâmide genérica derivada do inventário de
 * tecnologias. Ela monta os sistemas que o dono construiu, com as stacks
 * verdadeiras deles — e isso é melhor por três motivos: cada montagem é
 * verdade verificável, o nome do sistema dá contexto ao que está sendo
 * montado, e as stacks têm tamanhos diferentes, que é o contraste entre
 * "simples" e "complexo".
 *
 * **Os três da vitrine são DERIVADOS de `content/systems.ts`, nunca
 * copiados.** `sceneRotation` recebe a lista de sistemas do conteúdo e lê
 * `stack` deles; mude a stack lá e a cena monta outra coisa aqui, sozinha.
 *
 * Os menores vivem neste arquivo porque são dados de CENA: não são conteúdo
 * traduzível, não aparecem como texto de interface, e não têm case study.
 * Mesmo assim o nome deles é estampado nos contêineres, então precisa sair de
 * um lugar só — daqui.
 *
 * Como o resto dos módulos `portico-*`, aqui não entra three.js: é dado e
 * aritmética, testável sem GPU. Nenhum `Math.random()`.
 */

/** Um sistema como a cena precisa dele: um nome e as tecnologias que o formam. */
export type SceneSystem = { name: string; stack: readonly string[] }

/**
 * Os sistemas menores, que não estão na vitrine.
 *
 * Existem por uma razão de composição: três sistemas de 8 a 10 contêineres
 * dariam pouca variação de porte, e o contraste entre simples e complexo é
 * justamente o que o dono pediu. Com estes, a rotação vai de 4 a 10
 * contêineres — a diferença lê na silhueta sem precisar de legenda.
 */
const SIDE_SYSTEMS: readonly SceneSystem[] = [
  { name: 'Fluxo Eventos', stack: ['TypeScript', 'NestJS', 'Prisma', 'PostgreSQL', 'Redis', 'React', 'S3'] },
  { name: 'Academia SaaS', stack: ['TypeScript', 'Fastify', 'Prisma', 'PostgreSQL', 'PWA', 'Nginx'] },
  { name: 'PRISM 3D', stack: ['TypeScript', 'React', 'Vite', 'GSAP', 'Groq'] },
  { name: 'Otoni Robô', stack: ['TypeScript', 'Express', 'Groq', 'Docker'] },
] as const

/** Nome de tecnologia reduzido ao que casa: minúsculas, só letras e dígitos. */
export const plain = (name: string): string => name.toLowerCase().replace(/[^a-z\d]/g, '')

/**
 * A camada de sustentação de cada tecnologia — o que decide o que fica
 * embaixo e o que fica em cima.
 *
 * A montagem precisa de lógica visível, senão vira pilha aleatória. A lógica
 * é a da própria stack: **infraestrutura embaixo, aplicação em cima**, porque
 * é assim que um sistema real se sustenta — o banco não roda sobre o React.
 *
 * São cinco degraus, do que segura para o que é servido:
 *
 * 0. **Infraestrutura** — o que precisa estar de pé antes de qualquer código:
 *    máquina, proxy, banco, cache, objeto.
 * 1. **Dados** — o que dá forma ao que o banco guarda: ORM, schema, fila.
 * 2. **Serviço** — a linguagem e o framework que atendem a requisição.
 * 3. **Aplicação** — o que o usuário vê.
 * 4. **Qualidade** — o que prova que o resto funciona, e por isso vem por
 *    cima de tudo: é a última camada a ser montada e a primeira a cair.
 *
 * Quem não estiver na tabela cai em `DEFAULT_ROLE` em vez de quebrar a cena —
 * mesma política do ícone que não existe (ver `markFor`). Uma tecnologia nova
 * no dicionário aparece na camada de serviço até alguém classificá-la, o que
 * é errado de um jeito discreto, não de um jeito que derruba a montagem.
 */
const ROLES: readonly (readonly string[])[] = [
  ['docker', 'nginx', 'postgresql', 'supabase', 'redis', 's3', 'pm2', 'vercel', 'pgvector'],
  ['prisma', 'drizzle', 'bullmq', 'zod'],
  ['typescript', 'javascript', 'fastify', 'fastify5', 'nestjs', 'express', 'node', 'nodejs', 'groq', 'anthropic'],
  ['react', 'nextjs', 'astro', 'vite', 'pwa', 'threejs', 'gsap', 'tailwind', 'tailwindcss'],
  ['playwright', 'pgtap', 'vitest'],
] as const

const DEFAULT_ROLE = 2

const ROLE_BY_NAME = new Map<string, number>(
  ROLES.flatMap((names, role) => names.map((name): [string, number] => [name, role])),
)

/**
 * Camada de uma tecnologia. Casa pelo nome inteiro e, falhando, pelo primeiro
 * segmento — é o que faz "Fastify 5" cair junto com "Fastify" sem uma segunda
 * entrada na tabela para cada versão que o dono subir.
 */
export function roleOf(name: string): number {
  const whole = ROLE_BY_NAME.get(plain(name))
  if (whole !== undefined) return whole
  const head = ROLE_BY_NAME.get(plain(name.split(/[/\s]/)[0] ?? ''))
  return head ?? DEFAULT_ROLE
}

/** Quantas camadas de sustentação existem — o alcance de `roleOf`. */
export const ROLE_COUNT = ROLES.length

/**
 * A ordem da rotação: **complexo, simples, complexo, simples**.
 *
 * Intercalar os dois blocos (os maiores em ordem decrescente, os menores em
 * ordem crescente) é o que faz o ritmo mudar para quem fica olhando: uma
 * montagem longa e cheia, uma curta e enxuta, e de novo. Ordenar por tamanho
 * direto daria uma rampa — o porte só se percebe na comparação imediata.
 *
 * A ordem é função pura da lista de entrada: mesmo conteúdo, mesma rotação,
 * a cada carregamento.
 */
export function sceneRotation(showcase: readonly SceneSystem[]): SceneSystem[] {
  const all = [...showcase.map((system) => ({ name: system.name, stack: [...system.stack] })), ...SIDE_SYSTEMS.map(
    (system) => ({ name: system.name, stack: [...system.stack] }),
  )]
  // Desempate pelo nome: dois sistemas do mesmo tamanho não podem trocar de
  // lugar entre dois carregamentos.
  const bySize = [...all].sort((a, b) => b.stack.length - a.stack.length || a.name.localeCompare(b.name))
  const half = Math.ceil(bySize.length / 2)
  const heavy = bySize.slice(0, half)
  const light = bySize.slice(half).reverse()

  const order: SceneSystem[] = []
  for (let i = 0; i < half; i++) {
    const big = heavy[i]
    const small = light[i]
    if (big) order.push(big)
    if (small) order.push(small)
  }
  return order
}
