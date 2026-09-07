/**
 * A cor de cada andar, derivada da temperatura declarada no programa, e o
 * rótulo que sobrevive a ela.
 *
 * O par cor-de-fundo/cor-de-texto NÃO é escolhido por gosto: é escolhido e
 * depois MEDIDO em `tests/unit/predio-luz.test.ts`. Trocar um hex sem conferir
 * o contraste quebra a suíte, que é como este projeto já protege a landing
 * (`tests/unit/contraste.test.ts`).
 */
/** WCAG 2.1 AA para texto normal. */
export const MINIMO_AA = 4.5

/**
 * Cor do ar de cada andar, do topo para o térreo.
 *
 * Escrita à mão, e não calculada a partir do kelvin, de propósito: a conversão
 * kelvin→sRGB dá cores fisicamente corretas e visualmente sujas nas pontas do
 * arco. O kelvin do programa diz a INTENÇÃO; estes hex são a intenção afinada
 * a olho e depois medida.
 *
 * Exportado — não por precisar em produção (quem renderiza usa `corDoAndar`),
 * mas para que `tests/unit/predio-luz.test.ts` confira `AR.length` contra
 * `ANDARES.length`. Um andar novo sem cor correspondente vira suíte vermelha
 * ali, e não um `throw` em tempo de módulo estourando a página de verdade.
 */
export const AR = [
  '#3a2b22', // cobertura — âmbar profundo, o sol batendo raso
  '#3d2f26', // servidores
  '#3b3130', // design
  '#33313d', // geo — esfriando, ainda não é o ponto mais frio
  '#2f3242', // automação — o miolo de verdade: kelvin mais alto, cor mais fria
  '#382f36', // acolhimento — começa a esquentar de volta
  '#43301f', // recepção — luz artificial, quente
] as const

/** Âmbar claro o bastante para passar AA sobre todos os ares acima. */
const ROTULO = '#f6e2c4'

export function corDoAndar(indice: number): string {
  return AR[Math.min(AR.length - 1, Math.max(0, indice))]!
}

export function corDoRotulo(_indice: number): string {
  // Um rótulo só para o prédio inteiro. Variar por andar traria sete pares para
  // medir e sete chances de um passar despercebido — e a descida ficaria com o
  // texto mudando de cor no meio, que lê como erro, não como intenção.
  return ROTULO
}
