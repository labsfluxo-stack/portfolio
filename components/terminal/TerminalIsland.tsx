'use client'
import { useState } from 'react'
import type { Dictionary, Locale } from '@/content/types'
import type { System } from '@/content/systems'
import { useTerminal } from './useTerminal'

/**
 * A peça interativa de verdade — carregada por `next/dynamic` com
 * `ssr: false` (components/sections/Terminal.tsx), nunca no HTML inicial.
 * Tudo que ela pode dizer também está na `<dl>` estática logo abaixo dela
 * na seção; um visitante ou crawler que nunca a monta não perde informação
 * nenhuma (spec §6.7).
 *
 * `<input>` real (não `contenteditable`): teclado, IME, colar e leitor de
 * tela funcionam sem nenhum código extra daqui. O `onKeyDown` vive só neste
 * elemento — nunca em `window`/`document` — então o terminal nunca sequestra
 * uma tecla fora do próprio foco nem a rolagem da página.
 */
export function TerminalIsland({
  dict,
  locale,
  systems,
}: {
  dict: Dictionary
  locale: Locale
  systems: readonly System[]
}) {
  const { terminal } = dict
  const { output, value, setValue, onKeyDown } = useTerminal({ dict, locale, systems })
  const [focused, setFocused] = useState(false)

  return (
    <div className="flex min-h-[26rem] flex-col border border-border bg-surface font-mono text-sm">
      <div
        role="log"
        aria-live="polite"
        aria-label={terminal.ariaOutput}
        className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-5"
      >
        {output.map((line) =>
          line.kind === 'command' ? (
            <p key={line.id} className="text-text">
              <span aria-hidden="true">{terminal.prompt} </span>
              {line.text}
            </p>
          ) : (
            <p key={line.id} className="text-muted">
              {line.text}
            </p>
          ),
        )}
      </div>

      {/* `min-w-0` no <input> é obrigatório aqui: um <input> tem
       * `min-width: auto` por padrão, que o navegador calcula a partir do
       * `placeholder` (uma frase longa) — num flex row isso vence o espaço
       * do prompt e o obriga a quebrar caractere por caractere em telas
       * estreitas. `shrink-0 whitespace-nowrap` no prompt fecha o outro
       * lado: ele nunca quebra, quem cede espaço é sempre o input. */}
      <div className="flex items-center gap-2 border-t border-border px-5 py-4">
        <span aria-hidden="true" className="shrink-0 whitespace-nowrap text-text">
          {terminal.prompt}
        </span>
        <input
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={terminal.hint}
          aria-label={terminal.ariaLabel}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent text-text caret-text outline-none placeholder:text-muted"
        />
        {focused ? null : (
          <span aria-hidden="true" className="terminal-cursor inline-block h-4 w-2 shrink-0 bg-text" />
        )}
      </div>
    </div>
  )
}
