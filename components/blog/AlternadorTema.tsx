'use client'

import { useEffect, useState } from 'react'
import { CHAVE_TEMA, ehTema, type Tema } from './tema'

const ROTULO: Record<Tema, string> = {
  claro: 'Mudar para o tema escuro',
  escuro: 'Mudar para o tema claro',
}

/**
 * O botão de tema. O trabalho de verdade — carimbar `data-tema` antes da
 * primeira pintura — é do script inline em `./tema.ts`; este componente só
 * troca o valor e lembra da escolha.
 *
 * DOIS ÍCONES SEMPRE NO DOM, um escondido por CSS conforme `data-tema` (ver
 * app/globals.css). A alternativa óbvia — renderizar só o ícone certo — exige
 * saber o tema no servidor, e o servidor não sabe: o tema mora no
 * `localStorage` do leitor. Renderizar um e trocar depois da hidratação é
 * justamente o pisca-pisca que o script inline existe para evitar, movido do
 * fundo da página para dentro do botão.
 *
 * O `aria-label` COMEÇA GENÉRICO e fica específico depois da montagem, e isso
 * é deliberado. Ele é a única parte que não dá para resolver em CSS, então o
 * primeiro render (servidor e cliente) diz "Alternar tema" — igual nos dois,
 * sem divergência de hidratação — e o efeito o especializa para "Mudar para o
 * tema escuro" assim que o tema real é conhecido.
 */
export function AlternadorTema() {
  const [tema, setTema] = useState<Tema | null>(null)

  useEffect(() => {
    const atual = document.documentElement.dataset.tema
    setTema(ehTema(atual) ? atual : 'claro')
  }, [])

  /**
   * SEGUE O SISTEMA ENQUANTO NINGUÉM ESCOLHEU.
   *
   * Quem nunca tocou no botão espera que o site acompanhe o computador — e o
   * sistema troca de tema sozinho ao anoitecer em toda plataforma moderna. A
   * escuta para no instante em que existe escolha salva: a partir daí a
   * vontade do leitor vence a do sistema operacional, que é o contrato de
   * qualquer alternador que se comporte bem.
   */
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const aoTrocar = (evento: MediaQueryListEvent) => {
      let salvo: string | null = null
      try {
        salvo = localStorage.getItem(CHAVE_TEMA)
      } catch {
        // `localStorage` lança em navegação privativa — ver ./tema.ts.
        // Sem escolha legível, o sistema manda.
      }
      if (ehTema(salvo)) return
      aplique(evento.matches ? 'escuro' : 'claro')
    }
    mq.addEventListener('change', aoTrocar)
    return () => mq.removeEventListener('change', aoTrocar)
  }, [])

  function aplique(proximo: Tema) {
    document.documentElement.dataset.tema = proximo
    setTema(proximo)
  }

  function alterne() {
    const proximo: Tema = tema === 'escuro' ? 'claro' : 'escuro'
    aplique(proximo)
    try {
      localStorage.setItem(CHAVE_TEMA, proximo)
    } catch {
      // Sem persistência a troca vale só para esta aba, e isso é melhor do que
      // o botão não responder. Ver ./tema.ts.
    }
  }

  const rotulo = tema ? ROTULO[tema] : 'Alternar tema'

  return (
    <button
      type="button"
      onClick={alterne}
      // `min-h-11 min-w-11` são os 44px de alvo mínimo de toque. Um ícone de
      // 20px sem área em volta é elegante na captura e difícil de acertar com
      // o polegar, que é como a maioria vai ler isto.
      className="alternador-tema inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-ink-2 transition-colors hover:text-ink"
      aria-label={rotulo}
      title={rotulo}
    >
      {/* Sol: aparece no tema ESCURO, porque é para onde o clique leva. */}
      <svg viewBox="0 0 24 24" className="icone-claro size-5" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.6" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((grau) => (
          <line
            key={grau}
            x1="12"
            y1="2.6"
            x2="12"
            y2="5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            transform={`rotate(${grau} 12 12)`}
          />
        ))}
      </svg>
      {/* Lua: aparece no tema CLARO. */}
      <svg viewBox="0 0 24 24" className="icone-escuro size-5" fill="none" aria-hidden="true">
        <path
          d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}
