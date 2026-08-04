'use client'
import { useCallback, useRef, useState, type KeyboardEvent } from 'react'
import { runCommand, COMMAND_NAMES, type TerminalContext } from './commands'

export type TerminalLine = {
  id: string
  /** `command` ecoa o que o visitante digitou; `response` é a saída de `runCommand`. */
  kind: 'command' | 'response'
  text: string
}

let lineSeq = 0
function nextId(): string {
  lineSeq += 1
  return `terminal-line-${lineSeq}`
}

/**
 * Só completa a primeira palavra (o comando em si). Uma vez que já existe
 * espaço no valor, o visitante está digitando argumentos (ex.: `projects
 * --stack`), e o Tab não tem o que completar ali — devolver `null` deixa o
 * navegador mover o foco normalmente, em vez de prender Tab sem propósito.
 */
function completeCommand(value: string): string | null {
  if (value.includes(' ')) return null
  const prefix = value.trim().toLowerCase()
  if (!prefix) return null
  return COMMAND_NAMES.find((name) => name.startsWith(prefix)) ?? null
}

/**
 * Estado e comportamento do terminal, sem nenhum DOM próprio — quem
 * renderiza é `TerminalIsland.tsx`. Mantém `runCommand` (commands.ts) puro:
 * histórico, navegação por setas e o esvaziamento de `clear` vivem só aqui.
 */
export function useTerminal(ctx: TerminalContext) {
  const [output, setOutput] = useState<TerminalLine[]>(() =>
    ctx.dict.terminal.welcome.map((text) => ({ id: nextId(), kind: 'response' as const, text })),
  )
  const [value, setValue] = useState('')
  const historyRef = useRef<string[]>([])
  const [historyIndex, setHistoryIndex] = useState<number | null>(null)

  const submit = useCallback(() => {
    const trimmed = value.trim()
    // Entrada vazia ou só espaços não produz saída nem entra no histórico —
    // não há o que repetir com a seta para cima.
    if (!trimmed) {
      setValue('')
      return
    }

    historyRef.current = [...historyRef.current, trimmed]
    setHistoryIndex(null)

    if (trimmed.toLowerCase() === 'clear') {
      setOutput([])
      setValue('')
      return
    }

    const result = runCommand(trimmed, ctx)
    setOutput((prev) => [
      ...prev,
      { id: nextId(), kind: 'command' as const, text: trimmed },
      ...result.map((text) => ({ id: nextId(), kind: 'response' as const, text })),
    ])
    setValue('')
  }, [value, ctx])

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      // IME em composição (acentos, japonês/chinês/coreano) usa Enter para
      // confirmar o candidato, não para submeter o comando.
      if (event.nativeEvent.isComposing) return

      if (event.key === 'Enter') {
        event.preventDefault()
        submit()
        return
      }

      if (event.key === 'ArrowUp') {
        const history = historyRef.current
        if (history.length === 0) return
        event.preventDefault()
        const nextIndex = historyIndex === null ? history.length - 1 : Math.max(0, historyIndex - 1)
        setHistoryIndex(nextIndex)
        setValue(history[nextIndex] ?? '')
        return
      }

      if (event.key === 'ArrowDown') {
        if (historyIndex === null) return
        event.preventDefault()
        const history = historyRef.current
        if (historyIndex >= history.length - 1) {
          setHistoryIndex(null)
          setValue('')
          return
        }
        const nextIndex = historyIndex + 1
        setHistoryIndex(nextIndex)
        setValue(history[nextIndex] ?? '')
        return
      }

      if (event.key === 'Tab') {
        const completed = completeCommand(value)
        // Sem correspondência: não bloqueia o Tab, o foco segue seu curso
        // normal pela página — nunca prende teclado fora do que o comando
        // pede (spec §6.7).
        if (completed) {
          event.preventDefault()
          setValue(completed)
        }
      }
    },
    [historyIndex, submit, value],
  )

  return { output, value, setValue, onKeyDown }
}
