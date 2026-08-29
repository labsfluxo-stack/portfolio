/**
 * A partida de reflexo da dobra, como estado puro.
 *
 * Zero DOM, zero `Math.random`, zero `Date.now`: semente e relógio entram por
 * parâmetro. É o que torna a partida inteira testável sem canvas e sem espera
 * real — mesma disciplina de `components/three/portico-quality.ts`.
 *
 * COORDENADAS SÃO NORMALIZADAS de 0 a 1, e o raio junto. O motor não sabe o
 * tamanho do canvas nem a densidade da tela; quem multiplica por largura e
 * altura é `CapaJogo.tsx`. Sem isso, o teste precisaria inventar um tamanho de
 * tela, e o motor mudaria de comportamento entre celular e desktop.
 */

/** Duração de uma partida de verdade. O modo atrativo ignora este limite. */
export const DURACAO_MS = 15_000

/**
 * "Repique": cadência de nascimento, vida do alvo e teto de alvos vivos por
 * janela de tempo dentro da partida. Substitui os antigos INTERVALO_MS /
 * VIDA_ALVO_MS / MAX_ALVOS fixos.
 *
 * A auditoria rodou o motor achatado quadro a quadro em Node e mediu o
 * defeito: 24 alvos nasciam nos 15s inteiros não importa a habilidade de quem
 * jogava, e a densidade de alvos vivos ficava travada em 1-2 do segundo 1 ao
 * 14 — nenhuma curva, nenhuma sensação de "esquentar".
 *
 * `chegada` é mais devagar de propósito: dá tempo de mirar antes que a
 * pressa comece. `pico` é onde o jogo cobra de verdade — intervalo mais
 * curto, vida mais curta, um terceiro alvo simultâneo. `pouso` ALIVIA em vez
 * de terminar no auge: uma partida que para no pico parece cortada no meio, e
 * esta é uma landing page de venda — a última impressão de quem jogou é a que
 * fica na memória de quem vai (ou não) escrever no WhatsApp.
 */
type FaseRepique = { intervalo: number; vida: number; maximo: number }

const REPIQUE_CHEGADA: FaseRepique = { intervalo: 700, vida: 1_400, maximo: 2 }
const REPIQUE_PICO: FaseRepique = { intervalo: 300, vida: 1_000, maximo: 4 }
const REPIQUE_POUSO: FaseRepique = { intervalo: 620, vida: 1_250, maximo: 3 }

/** Fronteiras das janelas do repique, em ms decorridos desde o início da
 *  partida. Janela seguinte começa exatamente aqui — por isso as comparações
 *  em `faseDoRepique` usam `<`, não `<=`: o milissegundo da fronteira já
 *  pertence à fase nova. */
const FIM_JANELA_CHEGADA_MS = 5_000
const FIM_JANELA_PICO_MS = 11_000

/**
 * Fase do repique que vale num instante decorrido desde o início da partida.
 * Pura e exportada de propósito: o teste bate cada fronteira sem precisar
 * montar partida nenhuma.
 */
export function faseDoRepique(decorridoMs: number): FaseRepique {
  if (decorridoMs < FIM_JANELA_CHEGADA_MS) return REPIQUE_CHEGADA
  if (decorridoMs < FIM_JANELA_PICO_MS) return REPIQUE_PICO
  return REPIQUE_POUSO
}

/** Depois disso o alvo some sozinho — é o que cria a pressa.
 *
 *  MANTIDO EXPORTADO por compatibilidade com quem já importa o valor fixo
 *  (hoje, `CapaJogo.tsx`, para o encolhimento do desenho) — mas a vida
 *  efetiva de um alvo agora varia por fase do repique, e este número é só o
 *  valor da fase `chegada`. Quem precisa da vida certa por alvo usa
 *  `vidaDoAlvo` abaixo; o componente de desenho passa a chamá-la numa
 *  mudança separada, e até lá continua compilando contra este número fixo. */
export const VIDA_ALVO_MS = REPIQUE_CHEGADA.vida
/** Fração do quadro. 0.055 dá ~24px num canvas de 430px de largura, acima do
 *  mínimo de toque quando somado à tolerância de acerto abaixo. */
const RAIO = 0.055
/** O toque acerta um pouco além da borda desenhada. Dedo não é mouse.
 *
 *  EXPORTADA (fix wave final de branch): `tests/unit/ativacoes-tema.test.ts`
 *  media o pior caso do pop+balanço do tema contra uma CÓPIA hardcoded deste
 *  número (`TOLERANCIA_MOTOR = 1.6`). Uma cópia sai de sincronia — se este
 *  valor mudar aqui, a varredura de 600 mil pontos daquele teste continua
 *  comparando contra o número velho e segue passando calada. Importar a
 *  constante de verdade fecha esse buraco. */
export const TOLERANCIA = 1.6
/** Em modo atrativo o "jogador fantasma" acerta com este atraso, e erra de vez
 *  em quando — acerto perfeito a cada alvo lê como animação em laço, não como
 *  partida. */
const REACAO_FANTASMA_MS = 430

export type TipoAlvo = 'normal' | 'premiado' | 'recusa'

/** Acerto de premiado vale isto em `acertos`. Recusa nunca subtrai — placar
 *  negativo faz o jogador se sentir mal com a marca do cliente na tela. */
export const PESO_PREMIADO = 3

/** Fração da vida normal que o premiado dura. É o que transforma prioridade
 *  em DECISÃO: buscá-lo custa os normais que morrem no desvio. */
export const VIDA_PREMIADO = 0.55

export type Alvo = {
  id: number
  x: number
  y: number
  raio: number
  nascidoEm: number
  tipo: TipoAlvo
}

/**
 * Distribuição por fase. `chegada` é 100% normal de propósito: a spec de
 * ativação exige curva de aprendizado zero, e cobrar discriminação antes de o
 * jogador ter visto um alvo sequer é cobrar regra que ninguém ensinou.
 */
function tipoSorteado(decorridoMs: number, semente: number): { tipo: TipoAlvo; semente: number } {
  const { valor, semente: proxima } = proximo(semente)
  const fase = faseDoRepique(decorridoMs)
  if (fase === REPIQUE_CHEGADA) return { tipo: 'normal', semente: proxima }
  if (valor < 1 / 8) return { tipo: 'recusa', semente: proxima }
  if (valor < 1 / 8 + 1 / 6) return { tipo: 'premiado', semente: proxima }
  return { tipo: 'normal', semente: proxima }
}

/** Retângulo no mesmo espaço normalizado 0–1 dos alvos, onde nenhum alvo pode
 *  nascer. Existe porque a auditoria mediu 9,4%-15,6% dos alvos nascendo
 *  embaixo de conteúdo real (texto, botão) que intercepta o clique — o alvo
 *  aparecia, mas ninguém conseguia acertá-lo. */
export type Zona = { x: number; y: number; largura: number; altura: number }

export type Fase = 'atrativo' | 'jogando' | 'fim'

export type Partida = {
  fase: Fase
  alvos: Alvo[]
  acertos: number
  /** Soma dos tempos de reação, em ms. `mediaReacao` divide por `acertos`. */
  somaReacao: number
  /**
   * Acertos consecutivos. Zera num clique no vazio ou num alvo que expira.
   *
   * EXISTE PORQUE O JOGO NÃO PODIA SER PERDIDO. Até esta mudança a partida
   * guardava só acertos e reação, e `tocar` devolvia a partida INALTERADA
   * quando o clique não pegava ninguém — errar não custava nada. Uma
   * simulação da partida inteira contra jogadores de reflexos diferentes
   * (`.superpowers/mecanica/sim.mts`) mediu a consequência: de 180ms a
   * 450ms de reação o resultado era IDÊNTICO — 23 acertos, zero escapes —
   * porque todo mundo limpava a tela mais rápido do que ela enchia. A faixa
   * inteira do desempenho humano dava o mesmo placar; não havia nada em que
   * ser bom. A sequência é o que se tem a perder, e é ela que o fim de
   * partida usa para decidir se o brinde foi ganho.
   */
  sequencia: number
  /** Maior `sequencia` atingida na partida — o número que vale no fim. */
  melhorSequencia: number
  /** Cliques que não pegaram alvo nenhum. */
  errosDeMira: number
  /** Alvos que sumiram sem ninguém acertar. */
  escaparam: number
  comecouEm: number
  proximoId: number
  semente: number
  ultimoNascimento: number
  /** Território onde `nascer` não pode colocar alvo. Vazio por padrão: sem
   *  zona nenhuma, o motor se comporta exatamente como antes desta regra
   *  existir. */
  zonasProibidas: readonly Zona[]
}

/**
 * Congruente linear, a mesma dos parâmetros de Numerical Recipes. Devolve o
 * valor E a semente seguinte, porque o motor é puro e não guarda estado
 * escondido em módulo — dois motores rodando na mesma página (não acontece
 * hoje, mas nada impede) não podem compartilhar contador.
 */
function proximo(semente: number): { valor: number; semente: number } {
  const s = (1664525 * semente + 1013904223) >>> 0
  return { valor: s / 4294967296, semente: s }
}

export function criarPartida(
  semente: number,
  agora: number,
  zonasProibidas: readonly Zona[] = [],
): Partida {
  return {
    fase: 'atrativo',
    alvos: [],
    acertos: 0,
    somaReacao: 0,
    sequencia: 0,
    melhorSequencia: 0,
    errosDeMira: 0,
    escaparam: 0,
    comecouEm: agora,
    proximoId: 1,
    // `>>> 0` para semente negativa não envenenar a sequência inteira.
    semente: semente >>> 0,
    ultimoNascimento: agora,
    zonasProibidas,
  }
}

/**
 * Recomeça depois do fim: devolve uma partida limpa JÁ EM `jogando`, sem passar
 * pelo modo atrativo. Quem aperta "jogar de novo" já decidiu participar, e
 * devolver o fantasma jogando sozinho seria desfazer a decisão dele.
 *
 * A SEMENTE VEM DA PARTIDA QUE ACABOU, não do relógio nem de uma nova sorteada.
 * `partida.semente` não é a semente original: é o estado atual do gerador
 * congruente, que já andou um passo a cada alvo nascido. Repartir dali faz a
 * sequência CONTINUAR de onde parou — a segunda partida cai em posições
 * diferentes da primeira, e uma revanche não é uma repetição. Sortear semente
 * nova daria o mesmo efeito, mas custaria uma fonte de aleatoriedade dentro de
 * um motor que existe justamente para não ter nenhuma: `criarPartida` recebe
 * semente por parâmetro para o teste ser determinístico, e `reiniciar` mantém
 * essa propriedade de graça.
 *
 * `zonasProibidas` vem junto — `criarPartida` já recebe da partida anterior
 * via `partida.zonasProibidas`, e não precisa ser passada de novo aqui: o
 * território proibido não muda de uma partida para a revanche, só a semente
 * avança.
 */
export function reiniciar(partida: Partida, agora: number): Partida {
  return {
    ...criarPartida(partida.semente, agora, partida.zonasProibidas),
    fase: 'jogando',
    comecouEm: agora,
  }
}

/** Sorteia UMA posição candidata e devolve a semente já avançada — separado
 *  de `nascer` porque uma posição em zona proibida ainda precisa consumir o
 *  gerador antes da próxima tentativa; sem isso a repetição de tentativas
 *  sortearia sempre o mesmo ponto. */
function sortearPosicao(semente: number): { x: number; y: number; semente: number } {
  const px = proximo(semente)
  const py = proximo(px.semente)
  // Mantém o alvo inteiro dentro do quadro: o centro anda só na faixa que
  // sobra depois de descontar o raio nas duas bordas.
  const faixa = 1 - 2 * RAIO
  return { x: RAIO + px.valor * faixa, y: RAIO + py.valor * faixa, semente: py.semente }
}

/**
 * Teste círculo-retângulo pelo ponto mais próximo: acha o ponto do retângulo
 * mais perto do centro do círculo (fixando cada eixo à faixa da zona) e
 * compara a distância até ele com o raio. Uma caixa delimitadora do círculo
 * erraria para mais em zona estreita e comprida — acusaria colisão numa
 * posição que o círculo de verdade nem toca.
 */
function circuloTocaZona(x: number, y: number, raio: number, zona: Zona): boolean {
  const maisPertoX = Math.max(zona.x, Math.min(x, zona.x + zona.largura))
  const maisPertoY = Math.max(zona.y, Math.min(y, zona.y + zona.altura))
  const dx = x - maisPertoX
  const dy = y - maisPertoY
  return dx * dx + dy * dy < raio * raio
}

/** Tentativas de achar posição fora de toda zona proibida antes de desistir
 *  do nascimento desta vez. */
const TENTATIVAS_NASCIMENTO = 8

function nascer(partida: Partida, agora: number): Partida {
  let semente = partida.semente
  // Mesmo tratamento de `vidaDoAlvo`/`repiqueParaNascimento`: modo atrativo
  // trava em `chegada` — é ambiente para quem só está lendo a página, e não
  // pode cobrar a decisão (premiado/recusa) de uma partida de verdade.
  const decorridoMs = partida.fase === 'atrativo' ? 0 : agora - partida.comecouEm
  for (let tentativa = 0; tentativa < TENTATIVAS_NASCIMENTO; tentativa++) {
    const pos = sortearPosicao(semente)
    semente = pos.semente
    const emZonaProibida = partida.zonasProibidas.some((zona) =>
      circuloTocaZona(pos.x, pos.y, RAIO, zona),
    )
    if (emZonaProibida) continue

    const sorteio = tipoSorteado(decorridoMs, semente)
    semente = sorteio.semente
    const alvo: Alvo = {
      id: partida.proximoId,
      x: pos.x,
      y: pos.y,
      raio: RAIO,
      nascidoEm: agora,
      tipo: sorteio.tipo,
    }
    return {
      ...partida,
      alvos: [...partida.alvos, alvo],
      proximoId: partida.proximoId + 1,
      semente,
      ultimoNascimento: agora,
    }
  }

  // As 8 tentativas caíram todas em zona proibida: um alvo visível que
  // ninguém consegue tocar é pior do que nenhum alvo, então este nascimento
  // é pulado — a próxima janela tenta de novo. `semente` e `ultimoNascimento`
  // avançam do mesmo jeito: a sequência segue determinística mesmo quando o
  // nascimento não acontece, e a cadência não martela o mesmo instante em
  // laço.
  return { ...partida, semente, ultimoNascimento: agora }
}

/**
 * Vida efetiva de UM alvo — não mais um número fixo do módulo, e sim função
 * da fase do repique vigente NO INSTANTE EM QUE O ALVO NASCEU, não no
 * instante em que é consultada: a vida de um alvo não pode mudar no meio do
 * encolhimento só porque o relógio cruzou para a fase seguinte enquanto ele
 * ainda estava na tela.
 *
 * EXPORTADA para `CapaJogo.tsx` trocar `VIDA_ALVO_MS` por esta função no
 * cálculo do encolhimento — ver o comentário em `VIDA_ALVO_MS` acima.
 */
export function vidaDoAlvo(partida: Partida, alvo: Alvo): number {
  // Modo atrativo trava em `chegada` (ver comentário na tabela de repique).
  // Um alvo herdado do modo atrativo pelo primeiro toque (`tocar` mantém os
  // alvos em tela ao trocar de fase) tem `nascidoEm` anterior ao novo
  // `comecouEm`; o decorrido dá negativo, cai no primeiro `if` de
  // `faseDoRepique` (< 5000) e ainda assim acerta em `chegada` — que é o
  // valor com que esse alvo de fato nasceu.
  const vidaNormal =
    partida.fase === 'atrativo'
      ? REPIQUE_CHEGADA.vida
      : faseDoRepique(alvo.nascidoEm - partida.comecouEm).vida
  // Premiado vive menos que o normal da mesma fase: é o que transforma
  // prioridade em decisão (buscá-lo custa os normais que morrem no desvio).
  return alvo.tipo === 'premiado' ? vidaNormal * VIDA_PREMIADO : vidaNormal
}

/**
 * Repique que vale AGORA para efeito de nascimento — cadência e teto de
 * alvos vivos. Modo atrativo trava sempre em `chegada`: é ambiente para
 * quem só está lendo a página, e não pode construir a mesma tensão
 * crescente de uma partida de verdade.
 */
function repiqueParaNascimento(partida: Partida, agora: number): FaseRepique {
  if (partida.fase !== 'jogando') return REPIQUE_CHEGADA
  return faseDoRepique(agora - partida.comecouEm)
}

/**
 * Um quadro. `fantasma = false` desliga o jogador automático sem mexer na
 * fase — é o que `prefers-reduced-motion` usa, e a distinção importa: forçar
 * a fase para `jogando` só para calar o fantasma faria a partida expirar em
 * 15 segundos e deixaria a dobra vazia justamente para quem pediu menos
 * movimento.
 */
export function avancar(partida: Partida, agora: number, fantasma = true): Partida {
  if (partida.fase === 'fim') return partida

  // A partida de verdade tem fim; o modo atrativo não. Sem esta distinção a
  // dobra congelaria depois de 15 segundos para quem só está lendo a página.
  if (partida.fase === 'jogando' && agora - partida.comecouEm >= DURACAO_MS) {
    return { ...partida, fase: 'fim', alvos: [] }
  }

  const sobreviventes = partida.alvos.filter(
    (alvo) => agora - alvo.nascidoEm < vidaDoAlvo(partida, alvo),
  )
  // ESCAPAR QUEBRA A SEQUÊNCIA, e só durante a partida de verdade: no modo
  // atrativo quem deixa alvo expirar é o fantasma, e o placar dele não pode
  // virar placar de ninguém.
  const perdidos = partida.fase === 'jogando' ? partida.alvos.length - sobreviventes.length : 0
  let estado: Partida = {
    ...partida,
    alvos: sobreviventes,
    escaparam: partida.escaparam + perdidos,
    sequencia: perdidos > 0 ? 0 : partida.sequencia,
  }

  if (estado.fase === 'atrativo' && fantasma) {
    // O fantasma acerta o alvo mais velho que já passou do tempo de reação, e
    // pula um a cada quatro para a partida não parecer perfeita.
    const maduro = estado.alvos.find(
      (alvo) => agora - alvo.nascidoEm >= REACAO_FANTASMA_MS && alvo.id % 4 !== 0,
    )
    if (maduro) {
      estado = {
        ...estado,
        alvos: estado.alvos.filter((alvo) => alvo.id !== maduro.id),
        acertos: estado.acertos + 1,
        somaReacao: estado.somaReacao + (agora - maduro.nascidoEm),
      }
    }
  }

  const repique = repiqueParaNascimento(estado, agora)
  if (estado.alvos.length < repique.maximo && agora - estado.ultimoNascimento >= repique.intervalo) {
    estado = nascer(estado, agora)
  }

  return estado
}

export function tocar(partida: Partida, x: number, y: number, agora: number): Partida {
  if (partida.fase === 'fim') return partida

  // O primeiro toque encerra o modo atrativo e começa uma partida limpa: o
  // placar do fantasma não pode virar placar de ninguém.
  if (partida.fase === 'atrativo') {
    return {
      ...partida,
      fase: 'jogando',
      acertos: 0,
      somaReacao: 0,
      sequencia: 0,
      melhorSequencia: 0,
      errosDeMira: 0,
      escaparam: 0,
      comecouEm: agora,
      // Os alvos em tela FICAM: apagá-los aqui daria um quadro vazio bem no
      // instante em que a pessoa acabou de decidir participar.
    }
  }

  const atingido = partida.alvos.find((alvo) => {
    const dx = alvo.x - x
    const dy = alvo.y - y
    return Math.hypot(dx, dy) <= alvo.raio * TOLERANCIA
  })
  // ERRAR CUSTA. Antes desta linha um clique no vazio devolvia a partida
  // inalterada — mirar não valia nada, e clicar em pânico era gratuito.
  if (!atingido) {
    return { ...partida, sequencia: 0, errosDeMira: partida.errosDeMira + 1 }
  }

  // RECUSA NUNCA TIRA PONTO. Só zera a sequência — a mesma penalidade que o
  // erro de mira já aplica acima. Placar negativo faz o jogador se sentir mal
  // com a marca do cliente na tela; a decisão errada já custa a sequência, e
  // isso basta.
  if (atingido.tipo === 'recusa') {
    return {
      ...partida,
      alvos: partida.alvos.filter((alvo) => alvo.id !== atingido.id),
      sequencia: 0,
    }
  }
  const peso = atingido.tipo === 'premiado' ? PESO_PREMIADO : 1

  const sequencia = partida.sequencia + 1
  return {
    ...partida,
    alvos: partida.alvos.filter((alvo) => alvo.id !== atingido.id),
    acertos: partida.acertos + peso,
    somaReacao: partida.somaReacao + (agora - atingido.nascidoEm),
    sequencia,
    melhorSequencia: Math.max(partida.melhorSequencia, sequencia),
  }
}

/**
 * O alvo que um acerto por teclado vai atingir — o mais velho vivo, o mesmo
 * que `acertarAlvoAtivo` remove. EXPORTADA para o desenho marcar visualmente
 * qual alvo a barra de espaço vai acertar: sem essa marcação, quem joga de
 * teclado tem uma interação, não uma experiência — não dá para mirar no que
 * não se vê.
 */
export function alvoAtivo(partida: Partida): Alvo | null {
  if (partida.alvos.length === 0) return null
  // `nascer` sempre acrescenta no fim e o filtro de expiração preserva
  // ordem, então o mais velho já é o primeiro do array — mas comparar
  // `nascidoEm` direto, em vez de confiar no índice 0, não depende dessa
  // suposição continuar valendo.
  return partida.alvos.reduce((maisVelho, alvo) =>
    alvo.nascidoEm < maisVelho.nascidoEm ? alvo : maisVelho,
  )
}

/**
 * Acerta o alvo mais velho vivo — a versão por teclado de `tocar`, sem
 * coordenada nenhuma porque o teclado não aponta para lugar nenhum na tela.
 * Existe porque, sem ela, a partida inteira era inalcançável por quem não
 * usa ponteiro (mouse, dedo): zero forma de jogar.
 *
 * Mesma contabilidade de tempo de reação de `tocar`, e mesma transição de
 * saída do modo atrativo: o primeiro acionamento por teclado é, para todos
 * os efeitos, um primeiro toque — encerra o modo atrativo, zera o placar do
 * fantasma, e mantém os alvos que já estavam na tela.
 */
export function acertarAlvoAtivo(partida: Partida, agora: number): Partida {
  if (partida.fase === 'fim') return partida

  // O primeiro acionamento encerra o modo atrativo e começa uma partida
  // limpa: o placar do fantasma não pode virar placar de ninguém. Igual a
  // `tocar`, isso acontece mesmo que não haja alvo nenhum na tela agora.
  const estado: Partida =
    partida.fase === 'atrativo'
      ? {
          ...partida,
          fase: 'jogando',
          acertos: 0,
          somaReacao: 0,
          sequencia: 0,
          melhorSequencia: 0,
          errosDeMira: 0,
          escaparam: 0,
          comecouEm: agora,
        }
      : partida

  const alvo = alvoAtivo(estado)
  if (!alvo) return estado

  // Sem par de "errou" aqui de propósito: o teclado sempre mira o alvo
  // ativo, então não existe acionamento que erre. Quem não tem alvo na tela
  // sai no `if (!alvo)` acima sem penalidade nenhuma — perder sequência por
  // apertar espaço num instante sem alvo seria punir o teclado por uma falta
  // que o ponteiro não comete.
  const sequencia = estado.sequencia + 1
  return {
    ...estado,
    alvos: estado.alvos.filter((a) => a.id !== alvo.id),
    acertos: estado.acertos + 1,
    somaReacao: estado.somaReacao + (agora - alvo.nascidoEm),
    sequencia,
    melhorSequencia: Math.max(estado.melhorSequencia, sequencia),
  }
}

/**
 * `tocar` sozinho não reavalia a duração da partida, e quem consome o motor
 * a partir de um laço que pode ser pausado (fora da viewport, aba oculta)
 * leria estado velho — um toque tardio pontuaria contra uma partida já
 * encerrada. Esta composição é a forma segura de despachar um toque, e
 * existe aqui, e não no componente, porque frescor do estado no instante do
 * toque é regra de partida, não detalhe de desenho.
 */
export function tocarEm(
  partida: Partida,
  x: number,
  y: number,
  agora: number,
  fantasma = true,
): Partida {
  return tocar(avancar(partida, agora, fantasma), x, y, agora)
}

/** Média em ms, arredondada. Zero sem acerto — nunca `NaN` na tela. */
export function mediaReacao(partida: Partida): number {
  if (partida.acertos === 0) return 0
  return Math.round(partida.somaReacao / partida.acertos)
}
