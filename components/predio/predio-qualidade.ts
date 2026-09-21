/**
 * O que a cena pode se dar ao luxo de fazer, dado o degrau em que a escada de
 * qualidade parou.
 *
 * A escada em si NÃO é reimplementada: `TIERS`, `judge` e `measureVsync` vivem
 * em `components/three/portico-quality.ts` e já são medidos e testados. Este
 * módulo só traduz "em que degrau estou" para "o que eu ligo".
 */
import { TIERS } from '../three/portico-quality'
import { ANDARES } from './predio-programa'

export type Capacidades = {
  /** Andar como sala de verdade, com fundo e parede oposta visíveis. */
  perspectiva: boolean
  /** Passe de bloom sobre as fontes práticas. Ver `DEGRAU_DO_BRILHO`. */
  brilho: boolean
  /** Oclusão de ambiente por tela. Ver `DEGRAU_DA_OCLUSAO`. */
  oclusao: boolean
}

/**
 * O repouso é sempre o mais barato.
 *
 * Nascer com a perspectiva ligada e desligá-la ao detectar lentidão inverte o
 * ônus: quem tem aparelho fraco pagaria os primeiros segundos — justamente os
 * segundos em que está chegando e rolando — para só depois ser socorrido. O
 * Pórtico já aprendeu isso; ver o comentário de `TIERS`.
 */
export const CAPACIDADES_INICIAIS: Capacidades = { perspectiva: false, brilho: false, oclusao: false }

/** Só o degrau de estúdio paga perspectiva. */
export const DEGRAU_DA_PERSPECTIVA = 0

/**
 * O BRILHO DESCE UM DEGRAU A MAIS QUE A PERSPECTIVA, e a razão é o que cada um
 * custa e o que cada um devolve.
 *
 * Perspectiva multiplica GEOMETRIA: o andar promovido passa a ter fundo, parede
 * oposta e todo o conteúdo dela. É custo que cresce com a cena.
 *
 * Bloom custa um número FIXO de passes sobre a tela, e não depende de nada que a
 * cena tenha dentro. Num aparelho mediano ele cabe onde a perspectiva não cabe —
 * e num entardecer cheio de fonte acesa ele é o que mais muda a leitura por
 * milissegundo gasto. Então ele sobrevive um degrau abaixo.
 *
 * Nos degraus de baixo ele sai, e sai INTEIRO: o composer nem é montado, e a
 * cena volta a desenhar direto na tela. Bloom degradado é pior que bloom nenhum,
 * porque a fonte continua acesa e o halo fica em blocos.
 */
export const DEGRAU_DO_BRILHO = 1

/**
 * ═══ A OCLUSÃO FICA NO DEGRAU MAIS ALTO, COM A PERSPECTIVA ═══
 *
 * E o motivo é que ela é a única capacidade desta cena que custa GEOMETRIA em
 * vez de tela. Bloom e gradação são passes de fragmento: eles leem a imagem
 * pronta e devolvem outra, e o custo não depende de quantas peças a cena tem.
 * GTAO precisa de um mapa de profundidade e normais, e isso é a cena inteira
 * desenhada de novo — 89 chamadas na cobertura, mais o datacenter, mais a
 * cidade. Some-se o passe de oclusão e o de remoção de ruído por cima.
 *
 * Por isso ela acompanha `DEGRAU_DA_PERSPECTIVA` e não `DEGRAU_DO_BRILHO`: as
 * duas coisas que multiplicam custo ficam no mesmo degrau, e juntá-las evita
 * criar uma TERCEIRA fronteira visível para a catraca administrar.
 *
 * ═══ ELA JÁ ESTEVE DESLIGADA AQUI, POR ALGUMAS HORAS ═══
 *
 * O dono reportou a tela PISCANDO PRETO, e eu não conseguia reproduzir: o
 * defeito só existia no degrau 0, a máquina dele chega lá porque a mediana está
 * saturada no vsync, o headless nunca promove, e ao forçar o degrau o navegador
 * não terminava um quadro. O único lugar onde o defeito existia era o único onde
 * eu não conseguia medir. Pus `-1` aqui como CONTENÇÃO — cena quebrada no ar é
 * pior que efeito perdido — e a capacidade seguiu alcançável por
 * `?profundidade=1`, que foi o que permitiu confirmar a causa por eliminação.
 *
 * A causa acabou sendo a paridade dos alvos do composer, e está documentada em
 * `Predio.tsx`, em `comProfundidadeDoAlvo`. Isto voltou ao normal.
 */
export const DEGRAU_DA_OCLUSAO = DEGRAU_DA_PERSPECTIVA

/**
 * O estado da escada: em que degrau se está, e qual é o degrau mais alto ainda
 * permitido. `piso` só sobe.
 */
export type Escada = { degrau: number; piso: number }

/**
 * A cara da cena naquele degrau, como uma string comparável.
 *
 * `Object.values` e não os campos escritos à mão, de propósito: uma capacidade
 * nova entra em `Capacidades` e passa a ser protegida pela catraca sem ninguém
 * lembrar de vir aqui. Escrever `a.perspectiva !== b.perspectiva || …` seria uma
 * lista que envelhece em silêncio — e envelhecer em silêncio é exatamente o modo
 * de falha que este arquivo inteiro existe para evitar.
 */
const aparenciaDo = (degrau: number) => Object.values(capacidadesDo(degrau)).join('|')

/**
 * ═══ A CATRACA DAS FRONTEIRAS VISÍVEIS ═══
 *
 * DOIS DEFEITOS RELATADOS, UMA CAUSA SÓ. Primeiro "uma hora carrega perto, outra
 * distante, e fica oscilando"; depois "as luzes estão apagando e voltando". Não
 * são coisas diferentes: é a escada de qualidade pingando entre dois degraus, em
 * duas fronteiras diferentes.
 *
 * A ARITMÉTICA, que é o que prova não ser questão de afinar número:
 *
 *   `judge` desce quando a mediana passa de 2,2 × vsync e sobe quando ela cai
 *   abaixo de 1,25 × vsync. A histerese entre as duas é um fator de 1,76 — ela
 *   tolera um degrau que custe até 76 % a mais que o anterior. Qualquer degrau
 *   que custe MAIS que isso oscila para sempre, por construção: sobe, fica
 *   lento, desce, fica rápido, sobe de novo, a cada `SETTLE`.
 *
 *   FRONTEIRA 0 ↔ 1 — a perspectiva. `dpr` vai de 1,25 para 2,0, o que sozinho
 *   dá (2 / 1,25)² = 2,56 de custo de fragmento, e ainda liga `perspectiva`,
 *   levando `prof` de 7 para 13 m na cobertura e no térreo: os dois deixam de
 *   ser plano de paralaxe e viram sala inteira. 2,56 já estoura 1,76 sozinho.
 *   Visível porque `prof` alimenta `piscinaZ` e `zDaParedeDoAndar` — a piscina
 *   muda de tamanho e a cascata muda de lugar. "Ora perto, ora distante".
 *
 *   FRONTEIRA 1 ↔ 2 — o brilho. `dpr` de 1,0 para 1,25 dá 1,5625, e o passe de
 *   bloom acrescenta o seu custo fixo de tela cheia por cima. O produto passa de
 *   1,76 com folga. Visível porque bloom é o que põe halo nas fontes: sem ele o
 *   varal de lâmpadas vira um cordão de pontinhos chapados e o nicho do bar
 *   perde o facho. É literalmente "as luzes apagando e voltando".
 *
 * E A SEGUNDA FRONTEIRA A MINHA PRIMEIRA SONDA NÃO VIA. Ela media `dpr` pelo
 * tamanho do buffer do canvas, e entre os degraus 1 e 2 o `dpr` muda pouco —
 * 1,25 para 1,0 — enquanto o que o olho percebe (o bloom) não aparece em medida
 * de tamanho nenhuma. Medir o sintoma errado faz uma oscilação real parecer
 * escada assentada.
 *
 * POR QUE CATRACA E NÃO UM LIMIAR NOVO. Um limiar honesto para subir ao degrau 0
 * teria de ser "a mediana no degrau 1 é menor que 1,25 × vsync ÷ 2,56", isto é,
 * menor que 0,49 × vsync — abaixo do próprio vsync, que é o piso físico.
 * Impossível de satisfazer. Subir de degrau, nessas fronteiras, é por construção
 * uma APOSTA que nenhuma medição feita no degrau de baixo pode justificar.
 *
 * Então cada fronteira é apostada UMA vez. Se der errado, o piso sobe e aquele
 * degrau sai do jogo pelo resto da sessão. Quem aguenta fica com o efeito; quem
 * não aguenta vê uma troca, em vez de um pisca-pisca.
 *
 * A CATRACA FECHA SÓ ONDE A CARA DA CENA MUDA, e é isso que `aparenciaDo`
 * decide. Entre degraus que só mexem em resolução e tamanho de sombra, a troca é
 * suave e reversível, e travar ali impediria a cena de se recuperar de uma
 * lentidão passageira — outra aba comendo a GPU, uma carga de textura — que é
 * justamente o caso para o qual a escada sobe. A regra não enumera fronteiras:
 * ela compara o que se vê nos dois lados. Fronteira nova nasce protegida.
 */
export function aplicaVeredito(estado: Escada, veredito: 'hold' | 'down' | 'up'): Escada {
  if (veredito === 'down') {
    const destino = Math.min(TIERS.length - 1, estado.degrau + 1)
    const mudouACara = aparenciaDo(estado.degrau) !== aparenciaDo(destino)
    return { degrau: destino, piso: mudouACara ? Math.max(estado.piso, destino) : estado.piso }
  }
  if (veredito === 'up') return { ...estado, degrau: Math.max(estado.piso, estado.degrau - 1) }
  return estado
}

export function capacidadesDo(degrau: number): Capacidades {
  const dentroDaEscada = degrau >= 0 && degrau < TIERS.length
  return {
    perspectiva: dentroDaEscada && degrau <= DEGRAU_DA_PERSPECTIVA,
    brilho: dentroDaEscada && degrau <= DEGRAU_DO_BRILHO,
    oclusao: dentroDaEscada && degrau <= DEGRAU_DA_OCLUSAO,
  }
}

/**
 * Perspectiva só na primeira e na última impressão — compra-se o impacto onde
 * ele decide e paga-se parallax nos cinco do meio.
 */
export function temPerspectiva(indice: number, cap: Capacidades): boolean {
  if (!cap.perspectiva) return false
  return indice === 0 || indice === ANDARES.length - 1
}
