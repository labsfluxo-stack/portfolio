/**
 * A PALETA ESCURA DA LANDING, EM UM LUGAR SÓ.
 *
 * Estes cinco valores viviam copiados literalmente dentro do `style` de
 * `Criterio`, `Oferta`, `Prova` e `Perguntas`. Quatro cópias de uma paleta é o
 * arranjo que garante que a quinta seção nasça com um valor defasado e que
 * qualquer ajuste de contraste seja aplicado em três lugares e esquecido no
 * quarto — foi exatamente o que a auditoria de 2026-09-04 encontrou ao subir
 * `--color-ink-2`.
 *
 * COMO ISTO FUNCIONA: todo token do projeto mora em `@theme` (Tailwind v4),
 * então cada utilitário — `text-ink`, `bg-paper`, `border-rule` — resolve para
 * `var(--color-*)`. Redefinir as variáveis no elemento da seção inverte a
 * árvore inteira abaixo dela sem tocar em uma classe sequer, e é o que impede
 * que a primeira classe de polaridade clara esquecida num componente filho
 * vire texto escuro sobre fundo escuro. A `Auditoria`, com suas dezenas de
 * classes claras, escureceu de graça por causa disso.
 *
 * `--color-accent` NÃO é o azul do resto do site: `#0369A1` sobre preto some.
 * O ciano é o mesmo acento em versão que sobrevive ao fundo escuro — 9,29:1.
 *
 * `--color-ink-2` É `#949CA4`, E NÃO O `#878C96` ORIGINAL. O valor antigo dá
 * 5,90:1 sobre `#08090C`: passa WCAG AA (4,5:1) com folga e mesmo assim está
 * abaixo do alvo. Em interface escura a pupila dilata, o halation aumenta e a
 * borda da letra perde definição — a recomendação para corpo de texto sobre
 * fundo escuro é 7:1, não 4,5:1. `#949CA4` dá ~7:1 mantendo a mesma família
 * fria. Isto não é cor de detalhe: `--color-ink-2` pinta TODO parágrafo
 * secundário da página (corpo dos cartões da oferta, corpo dos dois testes,
 * respostas do FAQ, lead da prova).
 */
export const TOKENS_ESCUROS = {
  '--color-paper': '#08090C',
  '--color-ink': '#F5F3EF',
  '--color-ink-2': '#949CA4',
  '--color-rule': '#1F232B',
  '--color-accent': '#38BDF8',
} as React.CSSProperties

/**
 * `--color-muted` É UM TOKEN SEPARADO DE `--color-ink-2`, e essa distinção
 * custou uma correção pela metade.
 *
 * A primeira passada da auditoria subiu `--color-ink-2` de `#878C96` para
 * `#949CA4` nas quatro seções que invertem por token — e a medição na página
 * publicada continuou acusando 5,90:1. A causa: `LandingHero`, `Dupla` e
 * `LandingCta` não invertem por token, invertem por `bg-ink text-paper`, e o
 * texto secundário delas usa `text-muted`, que resolve para `--color-muted` do
 * `@theme` global — nunca tocado.
 *
 * Não era canto de página: `text-muted` pinta o SUBTÍTULO DO HERO (o primeiro
 * parágrafo que qualquer visitante lê), os dois parágrafos da Dupla e a linha
 * tranquilizadora logo abaixo do CTA principal.
 *
 * ESCOPO DELIBERADO: a correção fica nestas seções, e não no `@theme`.
 * `--color-muted` é o secundário do site inteiro, que é escuro por padrão —
 * mudá-lo na raiz alcançaria todas as telas de uma vez, e isso é decisão de
 * outra auditoria, não efeito colateral desta.
 */
export const MUTED_ESCURO = { '--color-muted': '#949CA4' } as React.CSSProperties

/**
 * A CONTRAPARTE CLARA, e ela existe por uma razão de leitura, não de simetria.
 *
 * A rota da landing força o documento inteiro para claro (ver
 * `app/[locale]/projetos/layout.tsx`) e cada seção escurece a si mesma. Um
 * bloco sem `style` nenhum herda o claro do documento e funciona — mas herdar
 * é frágil pelo mesmo motivo que a paleta escura é explícita: no dia em que a
 * inversão subir um nível, o bloco que dependia de herança escurece calado.
 *
 * Declarar os dois lados torna a polaridade de cada seção legível no próprio
 * arquivo, sem precisar reconstruir a cascata de cabeça.
 */
export const TOKENS_CLAROS = {
  '--color-paper': '#F5F3EF',
  '--color-ink': '#08090C',
  '--color-ink-2': '#4A4F58',
  '--color-rule': '#DCD8D0',
  '--color-accent': '#0369A1',
} as React.CSSProperties
