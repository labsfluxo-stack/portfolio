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
  '#d9a066', // cobertura — o ponto MAIS CLARO do prédio: sol pleno de hora dourada
  '#6b5544', // servidores
  '#6d6270', // design
  '#5d6a86', // geo — esfriando, ainda não é o ponto mais frio
  '#56709c', // automação — o miolo de verdade: kelvin mais alto, cor mais fria
  '#7a6473', // acolhimento — começa a esquentar de volta
  '#b5834a', // recepção — luz artificial, quente e acolhedora
] as const

/**
 * UM RÓTULO POR ANDAR — e esta troca desfez um nó que travava o prédio inteiro.
 *
 * ERA UM RÓTULO SÓ, claro, para os sete andares. A intenção era boa: menos
 * pares para medir, e o texto não muda de cor no meio da descida. O efeito
 * colateral não estava previsto e custou caro — para um mesmo âmbar claro
 * passar 4,5:1 em TODOS os andares, todos os andares precisavam ser escuros.
 * Nenhum canal de nenhuma cor podia passar de 0x44.
 *
 * Ou seja: um acerto de acessibilidade projetou um prédio noturno por acidente.
 * E a conta só apareceu muito depois, quando o metal do datacenter renderizou
 * PRETO — metal reflete o ambiente, o ambiente é a cor do andar, e a cor do
 * andar era quase preta. Não havia como iluminar um prédio projetado para ser
 * escuro.
 *
 * Com rótulo por andar, é a cor do TEXTO que se adapta: tinta escura sobre
 * andar claro, tinta clara sobre andar escuro. O andar passa a ter a
 * luminosidade que a arte pede, não a que o rótulo permitia. E o contraste
 * continua medido nos sete pares — sete chances de errar viram sete asserções,
 * que é o troco certo.
 */
const ROTULOS = [
  '#2a1806', // sobre a cobertura clara: tinta escura
  '#f5e9da',
  '#f6f1f7',
  '#f0f5fd',
  '#f0f5fd',
  '#f9f0f6',
  '#231505', // sobre a recepção clara: tinta escura
] as const

export function corDoAndar(indice: number): string {
  return AR[Math.min(AR.length - 1, Math.max(0, indice))]!
}

export function corDoRotulo(indice: number): string {
  return ROTULOS[Math.min(ROTULOS.length - 1, Math.max(0, indice))]!
}

/**
 * A cor clara do céu, própria — e não emprestada do rótulo.
 *
 * O `Ceu` de `Predio.tsx` montava o degradê com `corDoRotulo(0)` como a cor
 * acesa do horizonte. Funcionava por coincidência: enquanto havia UM rótulo
 * para o prédio inteiro, ele era um creme claro, e servia de "cor clara" a
 * quem precisasse.
 *
 * Quando o rótulo passou a ser por andar, o da cobertura virou TINTA ESCURA —
 * porque a cobertura ficou clara e texto escuro é o que contrasta com ela. E o
 * céu, que continuava lendo dali, ficou escuro junto: metade do primeiro quadro
 * do site virou uma mancha marrom.
 *
 * A lição: cor de texto e cor de luz são coisas diferentes e não devem
 * compartilhar constante, por mais parecidas que estejam num dado momento.
 */
export const CEU = '#f4d9a8'

/**
 * A cor do CENÁRIO de fundo — própria, e esta é a terceira vez nesta feature.
 *
 * Os planos de parallax eram pintados com `corDoAndar(3)` e `corDoAndar(4)`.
 * Não por pertencerem a esses andares: porque geo e automação eram cinza-
 * ardósia escuro e serviam de "cor neutra" a quem precisasse de uma.
 *
 * Quando a paleta abriu, esses dois viraram os andares AZUIS — são o ponto frio
 * do arco, por definição. Multiplicados pelos fatores do cenário, viraram
 * lavanda claro, e o fundo do prédio inteiro ficou azul. Pior: o cenário anda em
 * parallax diferente do prédio, então a faixa desliza e parece passar na frente.
 *
 * O PADRÃO, já que é a terceira ocorrência: o céu emprestava a cor do rótulo, o
 * albedo compensava a paleta, e o cenário emprestava a cor de dois andares.
 * Nenhum dos três estava errado enquanto a paleta não mudou — e todos quebraram
 * juntos quando ela mudou. Constante emprestada porque "a cor está parecida" é
 * dívida silenciosa: ela não documenta a intenção, só o acaso de um momento.
 */
/**
 * A CIDADE TEM PALETA PROPRIA, e ela e FRIA.
 *
 * `CENARIO` e marrom porque veste os planos de parallax, que sao estrutura de
 * concreto do proprio predio. A cidade ao redor e outra coisa: torre de vidro
 * refletindo o ceu de crepusculo. Vidro nao e marrom em nenhuma hora do dia, e
 * torre marrom foi o que fez o skyline anterior ler como bairro antigo de
 * tijolo em vez de centro contemporaneo.
 *
 * Constante propria e nao emprestada de `CENARIO`: e a quinta vez nesta feature
 * que uma cor emprestada "porque esta parecida" cobra depois.
 */
export const CIDADE = '#3c4657'
export const CIDADE_DISTANTE = '#4a5468'

export const CENARIO = '#4b4038'
export const CENARIO_DISTANTE = '#3b332d'
