/**
 * ═══ O MEDIDOR — porque "parece fluido" não é um número ═══
 *
 * O PROBLEMA QUE ISTO RESOLVE. A oclusão de ambiente e a lente de profundidade
 * vivem no degrau 0 da escada de qualidade. O ambiente headless em que esta cena
 * é verificada roda sobre SwiftShader, que é software puro: ele nunca promove
 * até lá, e as duas só puderam ser vistas com o passe FORÇADO. Ou seja, o custo
 * delas nunca foi medido — em lugar nenhum, por ninguém.
 *
 * E ele não pode ser medido por aproximação. "Parece fluido" varia com o que
 * mais está aberto na máquina, com a temperatura do aparelho e com a vontade de
 * quem olha. O que decide é a MEDIANA DO INTERVALO ENTRE QUADROS comparada à
 * taxa do monitor — que é exatamente o que `judge` usa para mover a escada.
 * Medir na mesma moeda que a escada é o que torna a resposta acionável: se a
 * mediana no degrau 0 fica acima de 2,2 × vsync, a escada VAI derrubar a cena, e
 * saber disso antes evita construir mais coisa em cima de uma premissa falsa.
 *
 * ═══ POR QUE ELE PRECISA FIXAR O DEGRAU ═══
 *
 * Medir só o degrau em que a máquina calhou de parar não responde nada: para
 * saber quanto a oclusão custa é preciso o MESMO hardware, a MESMA janela e a
 * MESMA cena, com e sem ela. Sem fixar, a escada muda o degrau no meio da
 * medição e as duas metades do A/B ficam incomparáveis — foi exatamente isso que
 * invalidou três tentativas de sonda nesta sessão.
 *
 * ═══ CUSTO EM PRODUÇÃO: ZERO ═══
 *
 * Nada disto liga sem o parâmetro na URL. Sem ele, `LIGADO` é falso, o
 * componente de leitura não monta, o laço de quadro não registra nada e o degrau
 * fixo é nulo. É uma verificação de string, uma vez, na montagem.
 */

/** Ler `location` no servidor quebra o build estático — daí a guarda. */
const busca = typeof window === 'undefined' ? '' : window.location.search

const parametros = new URLSearchParams(busca)

/** `?medir=1` acende a leitura. */
export const LIGADO = parametros.get('medir') === '1'

/**
 * `?degrau=0` prende a escada naquele degrau.
 *
 * É o que permite o A/B: abrir com `?medir=1&degrau=0` (estúdio: oclusão,
 * lente, perspectiva, dpr 2) e depois com `?medir=1&degrau=1` (sem oclusão e
 * sem lente, dpr 1,25). A diferença entre as duas medianas É o custo das duas
 * capacidades, na máquina de quem vai receber o site.
 */
export const DEGRAU_FIXO: number | null = (() => {
  const bruto = parametros.get('degrau')
  if (bruto === null) return null
  const n = Number.parseInt(bruto, 10)
  return Number.isFinite(n) && n >= 0 ? n : null
})()

/**
 * `?profundidade=1` liga o passe de oclusão e lente, que está DESLIGADO por
 * padrão desde que o dono reportou a tela piscando preto.
 *
 * Existe porque o defeito só aparece em GPU de verdade, no degrau que o ambiente
 * headless não alcança — sem uma porta como esta, a única forma de exercitar o
 * passe seria editar o código, e foi assim que eu quase deixei um forçamento
 * temporário escapar para um commit hoje.
 */
export const PROFUNDIDADE_FORCADA = parametros.get('profundidade') === '1'

export type Leitura = {
  /** Mediana do intervalo entre quadros, em milissegundos. */
  mediana: number
  /** O pior 5 % — é ele que se sente como engasgo, não a mediana. */
  p95: number
  /** Mediana dividida pela taxa do monitor. A moeda em que a escada pensa. */
  razao: number
  /** p95 dividido pela taxa do monitor. É esta que diz se perde quadro. */
  razaoP95: number
  degrau: number
  dpr: number
  chamadas: number
  triangulos: number
  capacidades: string
  /** Quantos quadros entraram na janela atual. */
  amostras: number
}

export const leitura: Leitura = {
  mediana: 0,
  p95: 0,
  razao: 0,
  razaoP95: 0,
  degrau: -1,
  dpr: 0,
  chamadas: 0,
  triangulos: 0,
  capacidades: '',
  amostras: 0,
}

/**
 * A JANELA É DE DOIS SEGUNDOS, e o número não é arbitrário.
 *
 * Curta demais e a mediana pula a cada coleta de lixo; longa demais e ela
 * esconde justamente o engasgo que se quer achar. Dois segundos é o que dá umas
 * 120 amostras a 60 Hz — suficiente para a mediana ser estável e para o p95
 * significar alguma coisa, e curto o bastante para a leitura acompanhar quem
 * está rolando a página e vendo o número mudar.
 */
const JANELA = 2
const CAPACIDADE = 512

const intervalos = new Float64Array(CAPACIDADE)
let quantos = 0
let acumulado = 0

/**
 * Consome um quadro. Chamado do laço, DEPOIS do desenho.
 *
 * O primeiro quadro é descartado: ele carrega a compilação de shader e o envio
 * de buffers da montagem inteira, e entraria na amostra como um pico de centenas
 * de milissegundos que nada tem a ver com o custo de regime.
 */
export function registra(
  delta: number,
  vsync: number,
  degrau: number,
  dpr: number,
  chamadas: number,
  triangulos: number,
  capacidades: string,
): void {
  if (!LIGADO) return
  if (quantos < CAPACIDADE) intervalos[quantos++] = delta
  acumulado += delta
  if (acumulado < JANELA) return

  const ordenados = Array.from(intervalos.subarray(0, quantos)).sort((a, b) => a - b)
  const meio = ordenados[quantos >> 1] ?? 0
  const alto = ordenados[Math.min(quantos - 1, Math.floor(quantos * 0.95))] ?? 0
  leitura.mediana = meio * 1000
  leitura.p95 = alto * 1000
  leitura.razao = vsync > 0 ? meio / vsync : 0
  leitura.razaoP95 = vsync > 0 ? alto / vsync : 0
  leitura.degrau = degrau
  leitura.dpr = dpr
  leitura.chamadas = chamadas
  leitura.triangulos = triangulos
  leitura.capacidades = capacidades
  leitura.amostras = quantos
  quantos = 0
  acumulado = 0
}

/**
 * ═══ O VEREDITO OLHA A CAUDA, NÃO A MEDIANA ═══
 *
 * E a primeira versão desta função olhava a mediana, o que a tornou inútil na
 * primeira medição de verdade. Os dois degraus deram 16,7 ms — exatamente 1/60 s
 * — e ela declarou "CABE COM FOLGA" para ambos.
 *
 * O MOTIVO: quando a GPU tem folga, a mediana não mede o custo dela. Ela mede a
 * TAXA DO MONITOR. O navegador entrega quadros no ritmo do vsync e não mais
 * rápido, então toda máquina que dá conta marca 16,7 ms, seja com margem de 1 %
 * ou de 400 %. A mediana satura, e um instrumento saturado responde a mesma
 * coisa para situações opostas.
 *
 * O QUE DISTINGUE AS DUAS É A CAUDA. Na mesma medição, o p95 foi 33,5 ms no
 * degrau 0 e 16,9 ms no degrau 1. E 33,5 é exatamente DOIS intervalos de quadro:
 * significa que pelo menos 5 % dos quadros perderam o vsync e esperaram o
 * próximo. Isso é engasgo — e é o que se sente, porque ninguém percebe uma
 * mediana, todo mundo percebe uma travada.
 *
 * Daí o veredito passar a ser sobre `p95 / vsync`:
 *   até 1,3   nenhum quadro perdido de forma sistemática
 *   até 1,9   perde de vez em quando
 *   acima     perde um quadro inteiro em 5 % ou mais — visível
 *
 * ═══ E A ESCADA TEM A MESMA CEGUEIRA ═══
 *
 * Fica registrado porque é uma limitação de verdade, não deste medidor: `judge`
 * decide pela MEDIANA. Numa máquina travada no vsync ele vê 16,7 ms e conclui
 * que há folga de sobra — inclusive quando um em cada vinte quadros está sendo
 * perdido. A escada não derruba o degrau 0 nessa situação; ela não tem como
 * saber. Quem descobre é quem olha a tela.
 */
export function veredito(razaoP95: number): string {
  if (razaoP95 === 0) return 'medindo…'
  if (razaoP95 <= 1.3) return 'LIMPO — nenhum quadro perdido'
  if (razaoP95 <= 1.9) return 'ENGASGA AS VEZES'
  return 'PERDE QUADRO — engasgo visivel'
}
