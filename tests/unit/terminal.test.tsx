import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runCommand, COMMAND_NAMES } from '@/components/terminal/commands'
import { TerminalIsland } from '@/components/terminal/TerminalIsland'
import { Terminal } from '@/components/sections/Terminal'
import { pt } from '@/content/pt'
import { en } from '@/content/en'
import { systems } from '@/content/systems'

// `useTerminal` chama `useRouter`/`usePathname` de verdade (item 3 da
// rodada de revisão: `lang <pt|en>` navega de fato). Fora da árvore do App
// Router do Next, essas duas hooks lançam ("invariant expected app router
// to be mounted") — por isso o mock, hoisted para poder inspecionar as
// chamadas de `push` nos testes de navegação mais abaixo.
const { pushMock, pathnameRef } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  pathnameRef: { current: '/pt' },
}))

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameRef.current,
  useRouter: () => ({ push: pushMock }),
}))

const ctx = { dict: pt, locale: 'pt' as const, systems }

describe('runCommand', () => {
  it('help lista todos os comandos disponíveis', () => {
    const out = runCommand('help', ctx).join('\n')
    for (const cmd of ['whoami', 'stats', 'projects', 'stack', 'contact', 'cv', 'lang', 'clear']) {
      expect(out).toContain(cmd)
    }
  })

  it('projects --stack filtra sem diferenciar caixa', () => {
    const out = runCommand('projects --stack DRIZZLE', ctx).join('\n')
    expect(out).toContain('Saturno Labs')
    expect(out).not.toContain('Moveis.pro')
  })

  it('stats devolve os números canônicos', () => {
    const out = runCommand('stats', ctx).join('\n')
    expect(out).toContain('250.000+')
    expect(out).toContain('10+')
  })

  it('comando desconhecido responde, nunca fica em silêncio', () => {
    const out = runCommand('foobar', ctx)
    expect(out.join('\n')).toContain('foobar')
    expect(out.length).toBeGreaterThan(0)
  })

  it('entrada vazia não produz saída', () => {
    expect(runCommand('   ', ctx)).toEqual([])
  })

  it('clear não produz saída de texto — o esvaziamento é responsabilidade da UI, não do dicionário', () => {
    expect(runCommand('clear', ctx)).toEqual([])
  })

  it('não diferencia caixa no nome do comando', () => {
    expect(runCommand('WHOAMI', ctx)).toEqual(runCommand('whoami', ctx))
  })

  it('projects --stack sem nenhuma correspondência devolve dict.terminal.noMatch, nunca silêncio', () => {
    expect(runCommand('projects --stack nestjs', ctx)).toEqual([pt.terminal.noMatch])
  })

  it('lang <pt|en> imprime a mensagem de troca com o idioma substituído', () => {
    expect(runCommand('lang en', ctx)).toEqual(['Trocando para en...'])
    expect(runCommand('LANG EN', ctx)).toEqual(['Trocando para en...'])
  })

  it('lang sem argumento válido devolve a frase de uso, nunca a de troca', () => {
    expect(runCommand('lang', ctx)).toEqual(pt.terminal.responses.lang)
    expect(runCommand('lang xx', ctx)).toEqual(pt.terminal.responses.lang)
  })

  it('funciona igual em en, com os números no formato certo', () => {
    const enCtx = { dict: en, locale: 'en' as const, systems }
    const out = runCommand('stats', enCtx).join('\n')
    expect(out).toContain('250,000+')
    expect(out).not.toContain('250.000+')
  })

  it('COMMAND_NAMES (exceto clear) têm entrada em responses, nos dois idiomas', () => {
    const expected = COMMAND_NAMES.filter((name) => name !== 'clear')
    for (const dict of [pt, en]) {
      for (const name of expected) {
        expect(Object.keys(dict.terminal.responses)).toContain(name)
      }
    }
  })
})

describe('TerminalIsland', () => {
  function setup() {
    return render(<TerminalIsland dict={pt} locale="pt" systems={systems} />)
  }

  function getInput() {
    return screen.getByRole('textbox', { name: pt.terminal.ariaLabel }) as HTMLInputElement
  }

  beforeEach(() => {
    pushMock.mockClear()
    pathnameRef.current = '/pt'
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('usa um <input> real, não contenteditable', () => {
    setup()
    const input = getInput()
    expect(input.tagName).toBe('INPUT')
    expect(input.getAttribute('contenteditable')).toBeNull()
  })

  it('expõe a saída em região role="log" com aria-live polite', () => {
    setup()
    const log = screen.getByRole('log')
    expect(log).toHaveAttribute('aria-live', 'polite')
  })

  it('executa um comando e mostra a resposta no log', () => {
    setup()
    const input = getInput()
    fireEvent.change(input, { target: { value: 'whoami' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    const log = screen.getByRole('log')
    expect(within(log).getByText(/arquiteto de sistemas/)).toBeInTheDocument()
    expect(input.value).toBe('')
  })

  it('entrada vazia (Enter sem digitar nada) não adiciona nada ao log', () => {
    setup()
    const input = getInput()
    const log = screen.getByRole('log')
    const childCountBefore = log.children.length

    fireEvent.keyDown(input, { key: 'Enter' })

    expect(log.children.length).toBe(childCountBefore)
  })

  it('comando desconhecido nunca fica em silêncio no log', () => {
    setup()
    const input = getInput()
    fireEvent.change(input, { target: { value: 'foobar' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    const log = screen.getByRole('log')
    // Duas linhas citam "foobar": o eco do comando digitado e a resposta de
    // "não reconhecido" — o ponto do teste é que a segunda existe.
    expect(within(log).getAllByText(/foobar/).length).toBeGreaterThan(0)
    expect(within(log).getByText(/Comando não reconhecido/)).toBeInTheDocument()
  })

  it('projects --stack sem correspondência mostra dict.terminal.noMatch, nunca fica em silêncio', () => {
    setup()
    const input = getInput()
    fireEvent.change(input, { target: { value: 'projects --stack nestjs' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(within(screen.getByRole('log')).getByText(pt.terminal.noMatch)).toBeInTheDocument()
  })

  it('clear esvazia o log', () => {
    setup()
    const input = getInput()
    fireEvent.change(input, { target: { value: 'whoami' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByRole('log').children.length).toBeGreaterThan(0)

    fireEvent.change(input, { target: { value: 'clear' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(screen.getByRole('log').children.length).toBe(0)
  })

  it('histórico: seta para cima repõe comandos digitados, do mais recente ao mais antigo', () => {
    setup()
    const input = getInput()

    fireEvent.change(input, { target: { value: 'whoami' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.change(input, { target: { value: 'stats' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    fireEvent.keyDown(input, { key: 'ArrowUp' })
    expect(input.value).toBe('stats')
    fireEvent.keyDown(input, { key: 'ArrowUp' })
    expect(input.value).toBe('whoami')
    // Não existe comando mais antigo — permanece no mesmo.
    fireEvent.keyDown(input, { key: 'ArrowUp' })
    expect(input.value).toBe('whoami')

    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(input.value).toBe('stats')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(input.value).toBe('')
  })

  it('Tab completa o comando pelo prefixo', () => {
    setup()
    const input = getInput()
    fireEvent.change(input, { target: { value: 'wh' } })
    fireEvent.keyDown(input, { key: 'Tab' })
    expect(input.value).toBe('whoami')
  })

  it('Tab sem correspondência não altera o valor nem impede o comportamento padrão', () => {
    setup()
    const input = getInput()
    fireEvent.change(input, { target: { value: 'zzz' } })
    const event = fireEvent.keyDown(input, { key: 'Tab' })
    expect(input.value).toBe('zzz')
    // `fireEvent` devolve `false` quando `preventDefault()` foi chamado.
    expect(event).toBe(true)
  })

  describe('lang <pt|en> troca de idioma de verdade', () => {
    it('lang en imprime a mensagem de troca e, após o atraso, navega para /en', () => {
      vi.useFakeTimers()
      setup()
      const input = getInput()
      fireEvent.change(input, { target: { value: 'lang en' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      // a mensagem aparece no log antes de qualquer navegação —
      // é o que garante que ela é de fato lida, não substituída na hora.
      expect(within(screen.getByRole('log')).getByText('Trocando para en...')).toBeInTheDocument()
      expect(pushMock).not.toHaveBeenCalled()

      vi.advanceTimersByTime(500)
      expect(pushMock).toHaveBeenCalledWith('/en')
    })

    it('lang pt enquanto já em pt não navega (mesmo destino, sem push redundante)', () => {
      vi.useFakeTimers()
      setup()
      const input = getInput()
      fireEvent.change(input, { target: { value: 'lang pt' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      vi.advanceTimersByTime(500)
      expect(pushMock).not.toHaveBeenCalled()
    })

    it('lang com argumento inválido mostra a frase de uso e não navega', () => {
      setup()
      const input = getInput()
      fireEvent.change(input, { target: { value: 'lang xx' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      expect(within(screen.getByRole('log')).getByText(/Uso: lang/)).toBeInTheDocument()
      expect(pushMock).not.toHaveBeenCalled()
    })

    it('troca a partir de uma rota mais profunda preservando o resto do caminho', () => {
      vi.useFakeTimers()
      pathnameRef.current = '/pt/sistemas/oscapstack'
      setup()
      const input = getInput()
      fireEvent.change(input, { target: { value: 'lang en' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      vi.advanceTimersByTime(500)
      expect(pushMock).toHaveBeenCalledWith('/en/sistemas/oscapstack')
    })
  })
})

describe('Terminal (seção)', () => {
  it('publica uma <dl> estática com todos os comandos e suas respostas, fora de qualquer <script>', () => {
    const { container } = render(<Terminal dict={pt} locale="pt" />)
    const dl = container.querySelector('dl')
    expect(dl).toBeTruthy()

    const expectedCommands = COMMAND_NAMES.filter((name) => name !== 'clear')
    for (const command of expectedCommands) {
      expect(within(dl as HTMLElement).getByText(command)).toBeInTheDocument()
      for (const line of pt.terminal.responses[command] ?? []) {
        expect(dl?.textContent ?? '').toContain(line)
      }
    }
  })

  it('a <dl> não inclui "clear", que não tem resposta informativa', () => {
    const { container } = render(<Terminal dict={pt} locale="pt" />)
    const dl = container.querySelector('dl')
    const terms = Array.from(dl?.querySelectorAll('dt') ?? []).map((dt) => dt.textContent)
    expect(terms).not.toContain('clear')
  })
})
