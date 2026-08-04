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
 * correspondências devolve `dict.terminal.noMatch` — nunca `[]` — pelo
 * mesmo princípio de `unknown`: um comando com sintaxe válida não pode
 * ficar mudo só porque a busca não achou nada.
 */
function runProjects(args: string[], ctx: TerminalContext): string[] {
  const flagIndex = args.findIndex((arg) => arg.toLowerCase() === STACK_FLAG)
  const tech = flagIndex === -1 ? undefined : args[flagIndex + 1]

  if (!tech) return ctx.dict.terminal.responses.projects ?? []

  const needle = tech.toLowerCase()
  const matches = ctx.systems
    .filter((system) => system.stack.some((item) => item.toLowerCase().includes(needle)))
    .map((system) => `${system.name} — ${system.stack.join(', ')}`)

  return matches.length > 0 ? matches : [ctx.dict.terminal.noMatch]
}

const VALID_LANG_TARGETS = ['pt', 'en'] as const

/**
 * Único lugar que decide o que conta como "trocar de idioma pelo terminal" —
 * `runCommand` (abaixo) usa para escolher a resposta, e `useTerminal.ts`
 * usa a mesma regra para decidir se navega de verdade. Extraído à parte
 * para as duas pontas nunca divergirem sobre o que é um alvo válido.
 */
export function parseLangTarget(input: string): Locale | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  const [rawCommand, ...args] = trimmed.split(/\s+/)
  if ((rawCommand ?? '').toLowerCase() !== 'lang') return null
  const target = (args[0] ?? '').toLowerCase()
  return (VALID_LANG_TARGETS as readonly string[]).includes(target) ? (target as Locale) : null
}

/**
 * Com alvo válido (`pt`/`en`), devolve `responses.langSwitching` com
 * `{lang}` substituído — a navegação de verdade é responsabilidade de
 * `useTerminal.ts` (não-pura), acionada por `parseLangTarget` de novo ali.
 * Sem alvo válido (falta ou idioma desconhecido), devolve a frase de uso.
 */
function runLang(args: string[], ctx: TerminalContext): string[] {
  const target = (args[0] ?? '').toLowerCase()
  if ((VALID_LANG_TARGETS as readonly string[]).includes(target)) {
    return (ctx.dict.terminal.responses.langSwitching ?? []).map((line) =>
      line.replace('{lang}', target),
    )
  }
  return ctx.dict.terminal.responses.lang ?? []
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
  if (command === 'lang') return runLang(args, ctx)

  const known = responses[command]
  if (known) return known

  return [unknown.replace('{command}', rawCommand ?? trimmed)]
}
