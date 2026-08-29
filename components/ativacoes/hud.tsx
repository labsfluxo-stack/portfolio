'use client'

import { useEffect, useState, type ReactNode } from 'react'
import type { Dictionary } from '@/content/types'
import { BrindeModal } from './BrindeModal'
import { ease, mola } from './movimento'

/**
 * O PAINEL DE FIM DE PARTIDA — spec §4, tarefa 6.
 *
 * MEDIDO numa captura real de 2026-08-29: com o resultado desenhado por cima
 * da ilustração do arraial, sem separação nenhuma, as duas frases que vendem
 * a página inteira — "Sequência fechada — o brinde é seu." e "Essa mecânica,
 * com a marca da sua agência, no seu evento." — ficavam ILEGÍVEIS sobre o
 * casario aceso. Um jogo de amostra que esconde a própria oferta é a maior
 * perda de dinheiro desta rota.
 *
 * A correção tem DUAS metades, e cada uma mora num lugar diferente:
 *
 * 1. O VÉU — um `fillRect` translúcido, em `CapaJogo.tsx`, que recua a cena
 *    ilustrada e a CONGELA (o tema passa a receber um `agora` travado no
 *    instante do fim, então brasa e bandeirinha param de se mover). Nada de
 *    `filter: blur()` nem `shadowBlur`: os dois estão fora do orçamento de
 *    quadro desta rota, e o véu sai mais barato que a cena viva que ele
 *    substitui — congelar é deixar de pintar, não pintar mais caro.
 *
 * 2. ESTE PAINEL — texto em DOM real, nunca em canvas. Três razões, as
 *    mesmas que já regem todo o resto da dobra (spec §4.2): acessível a
 *    quem usa leitor de tela, selecionável por quem quer copiar o resultado,
 *    e testável por contraste de verdade — `getComputedStyle(...).color`
 *    contra `getComputedStyle(...).backgroundColor`, não um pixel adivinhado
 *    de captura de tela. O painel tem FUNDO SÓLIDO próprio (não depende do
 *    véu, que é só 72% opaco): mesmo que a animação do véu ainda esteja
 *    entrando, o texto já está legível contra o próprio cartão.
 *
 * `tests/e2e/ativacoes-fim-legivel.spec.ts` é o portão: lê `[data-linha-fim]`
 * dentro de `[data-testid="painel-fim"]` e falha se qualquer linha ficar
 * abaixo de 4,5:1. Os botões NÃO levam `data-linha-fim` de propósito — o
 * teste compara a cor do texto contra o fundo do PAINEL, e um botão tem o
 * PRÓPRIO fundo sólido (item 5 abaixo); medir o texto do botão contra o
 * fundo do painel testaria a cor errada.
 */

/**
 * Acertos seguidos que liberam o brinde.
 *
 * A simulação da partida (`.superpowers/mecanica/sim.mts`) mede a melhor
 * sequência por perfil de jogador: rápido ~32, mediano (reação 340ms) ~15,
 * lento (450ms) ~9. Cinco fica abaixo até do lento — é uma escolha do dono
 * do site, e a direção é deliberada.
 *
 * O portão não existe para separar bons de ruins; existe para o brinde ser
 * GANHO em vez de dado, que é o modelo que esta página vende. Cinco ainda
 * exige jogar de verdade (quem toca uma vez e assiste termina em zero, e o
 * teste e2e do portão prova isso), mas não transforma a demonstração numa
 * prova de reflexo — numa landing de venda, um visitante frustrado é pior
 * negócio do que um visitante que ganhou fácil.
 */
export const SEQUENCIA_PARA_BRINDE = 5

/** Escolhe a forma gramatical certa para uma contagem exibida na tela —
 *  singular só quando a contagem é EXATAMENTE 1, plural para todo o resto,
 *  INCLUINDO ZERO. "0 acertos" e "2 acertos" são os dois plural; é só o 1
 *  exato que muda de forma. Regra fácil de "consertar" errado depois — quem
 *  for mexer aqui, ver o defeito que motivou esta função: o placar e o
 *  resultado de fim de partida liam "1 acertos" (e "1 hits" em inglês) com
 *  um rótulo fixo, sempre plural.
 *
 *  Função pura e exportada — não por engenharia antecipada, mas porque é a
 *  única forma de testar a fronteira 0/1/2+ sem o laço de rAF: `getContext`
 *  devolve `null` no jsdom (ver tests/setup.ts), então `placar` nunca sai de
 *  zero num teste de componente. `motor-reflexo.ts` é puro pelo mesmo motivo.
 *
 *  Mora aqui, e `CapaJogo.tsx` reexporta: o placar AO VIVO (que fica em
 *  `CapaJogo.tsx`) também precisa dela, e um reexport evita um import
 *  circular entre os dois arquivos — `CapaJogo.tsx` importa `PainelDeFim`
 *  daqui, então este módulo não pode importar nada de volta de lá. */
export function formaContagem(contagem: number, formas: { um: string; varios: string }): string {
  return contagem === 1 ? formas.um : formas.varios
}

/** Duração da entrada do painel (deslocamento de 12px + `ease.outBack`) — um
 *  "pop" curto, do mesmo tipo do que já existe para o nascimento de um alvo
 *  (`POP_MS` em `CapaJogo.tsx`), só que mais longo porque o painel é bem
 *  maior que um alvo e precisa de mais tempo pra ler como intencional, não
 *  como um tranco. */
const ENTRADA_MS = 260
/** Orçamento da contagem do número grande — não é um relógio rígido, é
 *  quanto tempo a `mola` (rigidez/amortecimento de `movimento.ts`) tem pra
 *  convergir antes deste componente travar o valor final na tela. Uma mola
 *  que ainda estivesse a meio caminho aos 400ms deixaria o número "preso"
 *  entre dois valores — travar é o que garante que ele sempre pousa exato. */
const CONTAGEM_MS = 400
/** Teto de `dt` por passo — mesma razão de `DT_MAXIMO` em `laco.ts`: sem
 *  teto, uma aba que passou tempo em segundo plano entrega um `dt` gigante
 *  no primeiro quadro de volta e a mola diverge. */
const DT_MAXIMO_S = 1 / 30

/**
 * O bloco de fim de partida inteiro (spec §4.3), MOVIDO de `CapaJogo.tsx` —
 * não duplicado: o arquivo de origem só importa este componente agora.
 *
 * `qr` chega PRONTO de fora, em vez de este componente montar o próprio: o
 * mesmo QR aparece ao lado do placar ao vivo enquanto a partida roda, e
 * `CapaJogo.tsx` monta o bloco uma única vez e passa a MESMA árvore pros
 * dois estados — a alternativa (cada lado com sua cópia do JSX) era
 * exatamente o tipo de duplicação que este arquivo existe para não ter.
 */
export function PainelDeFim({
  dict,
  placar,
  aoReiniciar,
  qr,
}: {
  dict: Dictionary
  placar: { acertos: number; reacao: number; sequencia: number; melhorSequencia: number }
  aoReiniciar: () => void
  qr: ReactNode
}) {
  const { capa } = dict.ativacoes
  const fim = capa.fim
  const ganhouBrinde = placar.melhorSequencia >= SEQUENCIA_PARA_BRINDE

  // A ANIMAÇÃO DE ENTRADA E A CONTAGEM, no MESMO laço de rAF: as duas
  // precisam do relógio real (não há relógio puro pra reusar aqui — `mola` e
  // `ease` são as curvas, não o cronômetro), e um laço só custa metade do
  // que dois custariam. Dura no máximo `max(ENTRADA_MS, CONTAGEM_MS)` e
  // então PARA — este painel não é o jogo, não tem orçamento de 60Hz
  // permanente, mas também não precisa de um `requestAnimationFrame` correndo
  // pra sempre por trás de um número que já parou de mudar.
  const [entrada, setEntrada] = useState(0)
  const [contagem, setContagem] = useState(0)

  useEffect(() => {
    const semSuporte = typeof window.matchMedia !== 'function'
    const menosMovimento = !semSuporte && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Restrição global: sem overshoot sob menos movimento. `ease.outBack`
    // ULTRAPASSA o alvo de propósito (é a curva de "pop" padrão de toda
    // entrada nesta rota) — exatamente o que a preferência pede pra tirar.
    // O painel aparece direto no estado final, e o número já nasce certo.
    if (menosMovimento) {
      setEntrada(1)
      setContagem(placar.acertos)
      return
    }

    let quadro = 0
    let anterior = performance.now()
    const inicio = anterior
    let valor = 0
    let vel = 0

    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / ENTRADA_MS)
      setEntrada(ease.outBack(t))

      const dt = Math.min((agora - anterior) / 1000, DT_MAXIMO_S)
      anterior = agora
      const resultado = mola(valor, vel, placar.acertos, dt)
      valor = resultado.valor
      vel = resultado.vel

      const contagemAcabou = agora - inicio >= CONTAGEM_MS
      if (contagemAcabou) {
        setContagem(placar.acertos)
      } else {
        setContagem(Math.min(placar.acertos, Math.max(0, Math.round(valor))))
      }

      if (t < 1 || !contagemAcabou) {
        quadro = requestAnimationFrame(passo)
      } else {
        setEntrada(1)
      }
    }
    quadro = requestAnimationFrame(passo)
    return () => {
      if (quadro) cancelAnimationFrame(quadro)
    }
    // Roda uma vez por montagem, de propósito: `PainelDeFim` nasce de novo a
    // cada partida (some do DOM ao "Jogar de novo"), então `placar.acertos`
    // já chega como o valor final da partida QUE ACABOU — não há um valor
    // "novo" pra reagir depois da montagem. Este projeto não roda o plugin
    // `react-hooks`, então não há regra de dependência exaustiva pra
    // silenciar aqui.
  }, [])

  // O NÚMERO GRANDE mora DENTRO da mesma frase que já existia
  // (`capa.fim.resultado`), não ao lado dela: partir a sentença em duas
  // strings desalinhadas por idioma seria reinventar o dicionário. Em vez
  // disso, a sentença INTEIRA é montada como sempre (`formaContagem` decide
  // `um`/`varios` pelo valor FINAL, não pelo valor animado — senão a
  // gramática mudaria de forma a meio da contagem), e só o dígito inicial
  // sai num `<span>` maior e em `--mono`. `pt.ts`/`en.ts` sempre começam a
  // frase por `{acertos}` — ver o comentário de `formaContagem` acima —
  // então o dígito inicial da string final é sempre o número, nunca texto.
  const sentencaResultado = formaContagem(placar.acertos, fim.resultado)
    .replace('{acertos}', String(contagem))
    .replace('{reacao}', String(placar.reacao))
  const partido = sentencaResultado.match(/^(\d+)(.*)$/s)
  const numeroGrande = partido?.[1] ?? String(contagem)
  const restoDaFrase = partido?.[2] ?? sentencaResultado

  return (
    <div
      data-testid="painel-fim"
      data-zona-jogo="fim"
      // `pointer-events-auto`: o contêiner de conteúdo é transparente ao
      // ponteiro (ver o comentário no topo de `CapaJogo.tsx`); sem isto os
      // botões e o QR não seriam clicáveis.
      className="pointer-events-auto flex max-w-xl flex-col items-start gap-3 rounded-lg border border-border bg-surface p-5"
      style={{
        opacity: Math.min(1, entrada),
        transform: `translateY(${(1 - entrada) * 12}px)`,
      }}
    >
      {/* 1. "Acabou o tempo." */}
      <p data-linha-fim className="text-[17px] font-semibold leading-relaxed text-text">
        {fim.titulo}
      </p>

      {/* 2. O número grande, contando de 0 até o valor final em ~400ms com
        * `mola` — e o resto da mesma frase de sempre, sem repetir o dígito.
        *
        * `data-linha-fim` vai nos DOIS `<span>`, não no `<p>` que os
        * envolve — achado da revisão (fix round 1): o `<p>` em si não leva
        * classe de cor nenhuma, só os `<span>` filhos (`text-data` e
        * `text-muted`); marcá-lo faria o teste ler `getComputedStyle(p).color`
        * HERDADO do painel/body, não a cor que de fato pinta o pixel. Um
        * portão que mede cor herdada aprovaria qualquer troca de
        * `text-muted` por `text-faint` sem nunca notar. */}
      <p className="flex flex-wrap items-baseline gap-x-2 leading-relaxed">
        <span
          data-linha-fim
          className="font-mono text-4xl font-semibold tabular-nums text-data"
        >
          {numeroGrande}
        </span>
        <span data-linha-fim className="text-[17px] text-muted">
          {restoDaFrase}
        </span>
      </p>

      {/* 3. A sequência e o brinde — o que faltou lê como bug sem
        * explicação, então quem não ganhou também recebe uma linha. */}
      <p data-linha-fim className="text-[17px] leading-relaxed text-text">
        {ganhouBrinde
          ? fim.brindeGanho
          : fim.brindeFaltou
              .replace('{melhor}', String(placar.melhorSequencia))
              .replace('{alvo}', String(SEQUENCIA_PARA_BRINDE))}
      </p>

      {/* 4. A frase que vende — a outra metade do gancho comercial que
        * motivou esta tarefa inteira. */}
      <p data-linha-fim className="text-[17px] leading-relaxed text-text">
        {fim.cta}
      </p>

      {/* 5. Os dois botões, fundo SÓLIDO — não contorno. Sem `data-linha-fim`
        * de propósito: cada botão tem o próprio fundo, e medir o texto dele
        * contra o fundo do painel testaria uma cor que ninguém vê. */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={aoReiniciar}
          className="inline-flex min-h-12 items-center justify-center rounded-md bg-surface-2 px-6 text-[17px] font-semibold text-text transition-opacity hover:opacity-80"
        >
          {fim.reiniciar}
        </button>
        {/* O BRINDE É GANHO, NÃO DADO — ver o comentário de
          * `SEQUENCIA_PARA_BRINDE` acima. `BrindeModal.tsx` carrega o próprio
          * fundo sólido (`bg-data`), pela mesma exigência deste item. */}
        {ganhouBrinde ? <BrindeModal dict={dict} /> : null}
      </div>

      {/* 6. O QR, agora ANCORADO DENTRO do painel — antes ficava solto ao
        * lado, sobre a mesma ilustração que este painel existe pra cobrir. */}
      {qr}
    </div>
  )
}
