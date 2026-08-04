import type { Dictionary, Locale } from '@/content/types'
import type { System } from '@/content/systems'

export type TerminalContext = {
  dict: Dictionary
  locale: Locale
  systems: readonly System[]
}

/**
 * Nomes de todos os comandos reconhecidos, na ordem do spec §6.7. Alimenta
 * o Tab-completion (useTerminal.ts) e a lista de comandos mostrada na `<dl>`
 * estática (components/sections/Terminal.tsx) — as duas pontas leem daqui,
 * nunca duplicam a lista à mão.
 */
export const COMMAND_NAMES = [
  'help',
  'whoami',
  'stats',
  'projects',
  'stack',
  'contact',
  'cv',
  'lang',
  'clear',
  'theme',
  'sudo',
  'matrix',
] as const

const STACK_FLAG = '--stack'

/**
 * `projects` sem `--stack` devolve a resposta fixa do dicionário (a mesma
 * que a `<dl>` estática mostra). Com `--stack <tecnologia>`, filtra
 * `ctx.systems` (content/systems.ts, dado neutro de idioma) por uma
 * substring case-insensitive — "fastify" encontra "Fastify 5". Zero
 * correspondências devolve lista vazia de propósito: é o mesmo
 * comportamento de um `grep` sem match, não o caso do comando desconhecido
 * (que tem `dict.terminal.unknown` reservado para nunca ficar em silêncio).
 * Inventar uma frase de "nada encontrado" aqui violaria a regra de que
 * nenhuma string de interface nasce fora do dicionário.
 */
function runProjects(args: string[], ctx: TerminalContext): string[] {
  const flagIndex = args.findIndex((arg) => arg.toLowerCase() === STACK_FLAG)
  const tech = flagIndex === -1 ? undefined : args[flagIndex + 1]

  if (!tech) return ctx.dict.terminal.responses.projects ?? []

  const needle = tech.toLowerCase()
  return ctx.systems
    .filter((system) => system.stack.some((item) => item.toLowerCase().includes(needle)))
    .map((system) => `${system.name} — ${system.stack.join(', ')}`)
}

/**
 * Função pura: mesma entrada e mesmo `ctx` sempre devolvem a mesma saída,
 * sem tocar em DOM, storage ou relógio. É o que permite testar todo o
 * vocabulário do terminal (components/terminal/*) sem montar um componente.
 *
 * `clear` devolve `[]` de propósito — apagar a tela é uma operação de UI
 * (estado do log), não uma resposta textual, e cabe a `useTerminal` tratar
 * esse comando à parte antes mesmo de guardar a saída.
 */
export function runCommand(input: string, ctx: TerminalContext): string[] {
  const trimmed = input.trim()
  if (!trimmed) return []

  const [rawCommand, ...args] = trimmed.split(/\s+/)
  const command = (rawCommand ?? '').toLowerCase()
  const { responses, unknown } = ctx.dict.terminal

  if (command === 'clear') return []
  if (command === 'projects') return runProjects(args, ctx)

  const known = responses[command]
  if (known) return known

  return [unknown.replace('{command}', rawCommand ?? trimmed)]
}
