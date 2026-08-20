/**
 * A forma de um tema da dobra.
 *
 * TEMA É DADO, NÃO CÓDIGO DE JOGO. O motor puro (`motor-reflexo.ts`) continua
 * emitindo alvo abstrato — posição normalizada, raio, instante de nascimento — e
 * não sabe o que é balão. Quem decide como aquilo aparece, e o que acontece
 * quando estoura, é o tema.
 *
 * A consequência é o critério que fez esta abordagem ser escolhida: os 35 testes
 * do motor seguem válidos sem uma linha alterada. Um redesenho visual que
 * obrigasse a reescrever a máquina de estado seria um redesenho mal desenhado.
 *
 * Todas as funções recebem o pincel JÁ TRANSLADADO para o centro do elemento
 * (menos `desenharFundo`, que trabalha no quadro inteiro). Desenhar em torno da
 * origem, e não em coordenada absoluta, é o que permite trocar de tema sem que
 * `CapaJogo` saiba onde cada tema resolveu pôr as coisas.
 */
export type Tema = {
  /** Identificador estável. Aparece em teste e dá nome ao arquivo. */
  id: string
  /** Cores do tema, todas usadas DENTRO do canvas. Nenhuma delas vira cor de
   *  texto sobre fundo sem passar por `lib/contraste.ts`. */
  paleta: { elemento: string; destaque: string; fundo: string; brasa: string }
  /**
   * Desenha UM elemento. `vida` vai de 1 (recém-nascido) a 0 (prestes a
   * expirar); `nascimento` vai de 0 a 1 durante a entrada e fica em 1 depois.
   * `parado` é `prefers-reduced-motion`: sem balanço, sem tremulação, sem pop.
   */
  desenharElemento(
    pincel: CanvasRenderingContext2D,
    raio: number,
    vida: number,
    nascimento: number,
    agora: number,
    parado: boolean,
  ): void
  /** Marca o elemento que a barra de espaço vai acertar. Vive no tema porque
   *  um anel que serve a um círculo não serve a um balão. `parado` é
   *  `prefers-reduced-motion`, igual às outras duas funções que recebem
   *  `agora` — uma marca de foco que pulsasse mesmo assim seria a mesma
   *  classe de descuido que o resto da dobra evita: a marca existe para
   *  ORIENTAR quem navega por teclado, não para chamar atenção sozinha, e
   *  duas leituras possíveis da mesma assinatura (anima sempre vs. respeita
   *  a preferência) é ambiguidade que o tipo não tem por que deixar em
   *  aberto — outro tema que interpretasse diferente ainda bateria o tipo. */
  desenharAlvoAtivo(
    pincel: CanvasRenderingContext2D,
    raio: number,
    agora: number,
    parado: boolean,
  ): void
  /** UM estouro em andamento, `progresso` de 0 a 1. Puramente visual: não
   *  pontua, não atrasa nada, e a partida segue igual se não for desenhado. */
  desenharEstouro(pincel: CanvasRenderingContext2D, raio: number, progresso: number): void
  /** Camada de fundo, desenhada ANTES dos elementos, no mesmo canvas. */
  desenharFundo(
    pincel: CanvasRenderingContext2D,
    largura: number,
    altura: number,
    agora: number,
    parado: boolean,
  ): void
  /** Chave do convite no dicionário — o texto mora em `content/*.ts`. */
  chaveConvite: string
}
