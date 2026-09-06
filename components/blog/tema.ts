export const TEMAS = ['claro', 'escuro'] as const
export type Tema = (typeof TEMAS)[number]

/** Uma chave só, e ela é a mesma no script inline e no componente. */
export const CHAVE_TEMA = 'tema'

export function ehTema(valor: unknown): valor is Tema {
  return valor === 'claro' || valor === 'escuro'
}

/**
 * O SCRIPT QUE MATA O PISCA-PISCA.
 *
 * Roda ANTES da primeira pintura, inline, no topo do `<body>` do blog. Sem ele
 * a sequência é: o navegador pinta o documento com o tema padrão, o React
 * hidrata, o efeito lê o `localStorage` e troca — e o leitor que escolheu
 * escuro leva um flash branco na cara a cada navegação. É o defeito mais
 * visível que um alternador de tema pode ter, e ele não aparece em teste de
 * unidade nenhum: só no navegador, e só na primeira pintura.
 *
 * Precedência: escolha explícita salva > preferência do sistema > claro.
 *
 * O `try/catch` não é cerimônia. `localStorage` LANÇA — não devolve `null` — em
 * navegação privativa de alguns navegadores e com cookies de terceiros
 * bloqueados. Uma exceção aqui, num script síncrono no topo do body, aborta o
 * script inteiro e a página fica sem `data-tema`: sem fundo, sem cor de texto e
 * sem anel de foco, porque as três regras dependem do atributo. O `catch` cai
 * no claro, que é o padrão de leitura.
 *
 * String, e não função importada, porque isto precisa ser um literal dentro de
 * `dangerouslySetInnerHTML` — nada aqui pode depender do bundle ter carregado.
 */
export const SCRIPT_TEMA = `(function(){try{var s=localStorage.getItem('${CHAVE_TEMA}');var p=window.matchMedia('(prefers-color-scheme: dark)').matches?'escuro':'claro';document.documentElement.dataset.tema=(s==='claro'||s==='escuro')?s:p}catch(e){document.documentElement.dataset.tema='claro'}})()`
