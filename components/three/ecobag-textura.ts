import * as THREE from 'three'

/**
 * A "etiqueta" da ecobag do brinde: textura gerada em canvas, mesma técnica
 * de `caneca-textura.ts` (zero bitmap baixado, zero requisição externa —
 * regra dura do projeto, ver o cabeçalho de `portico-textures.ts`).
 *
 * POR QUE `ajustarFonteAoEspaco` E `resolveSansFamily` ESTÃO DUPLICADAS AQUI
 * em vez de importadas de `caneca-textura.ts`, palavra por palavra iguais.
 * `caneca-textura.ts` já duplica `resolveSansFamily` em vez de reaproveitar
 * `resolveMonoFamily` de `portico-textures.ts`, e o motivo que aquele
 * arquivo registra é o mesmo aqui: cada brinde é montado por
 * `next/dynamic` só quando escolhido, e um import cruzado juntaria dois
 * chunks que precisam poder carregar sozinhos. Este arquivo é NOVO e,
 * quando for ligado ao seletor de brindes (fora do escopo desta tarefa —
 * ver o brief), precisa continuar carregável sem arrastar a caneca junto.
 */

/** Mesma proporção 2:1 de `TEXTURA` em `caneca-textura.ts` — largura dobrada
 *  da altura serve tanto para uma faixa de cilindro quanto para o painel
 *  frontal quadrado-ish da ecobag, e reaproveitar a razão facilita comparar
 *  as duas peças lado a lado no inspetor. */
export const TEXTURA = { largura: 1024, altura: 1024 } as const

/** Algodão cru, não branco de papel — a mesma lógica de `COR_CERAMICA` em
 *  `caneca-textura.ts` (uma base quente lê como material antes mesmo do
 *  `MeshStandardMaterial` entrar em cena), mas um tom mais amarelado porque
 *  lona de algodão crua tem mais amarelo que louça vidrada. */
export const COR_LONA = '#E7DFC9'

/** Fração da LARGURA do painel frontal reservada ao nome — equivalente a
 *  `FAIXA_LARGURA` da caneca, mas aqui o motivo é outro: a ecobag não tem
 *  costura em volta (o painel é uma face plana só, ver `Ecobag.tsx`), então
 *  não existe risco de o nome "sair de quadro" girando. A margem aqui é
 *  só estética — sobra de lona lisa em volta do nome, como uma serigrafia
 *  real, que nunca encosta a tinta na bainha. */
const FAIXA_LARGURA = 0.66
const FAIXA_Y0 = 0.44
const FAIXA_Y1 = 0.62

/** Bainhas de cor perto do topo (abertura) e da base — o mesmo papel dos
 *  frisos da caneca (`FRISO_Y_BOCA`/`FRISO_Y_BASE`): um traço de cor da
 *  marca que separa "objeto de produto" de "retângulo pintado". Numa
 *  ecobag de brinde real isso é a fita de acabamento costurada na abertura
 *  e, às vezes, num carreador perto da base. */
const BAINHA_ALTURA = 0.014
const BAINHA_Y_TOPO = 0.06
const BAINHA_Y_BASE = 0.93

/** Mesma assinatura de `Medidor` em `caneca-textura.ts` — a injeção é o que
 *  permite testar o encolhimento sem canvas nenhum (ver o comentário lá). */
export type Medidor = (fonte: string, texto: string) => number

export type ParametrosAjuste = {
  texto: string
  larguraDisponivel: number
  tamanhoMax: number
  tamanhoMin: number
  familia: string
  medir: Medidor
}

/**
 * Encolhe o corpo da fonte até o texto caber na largura disponível.
 *
 * Idêntica, propositalmente, a `ajustarFonteAoEspaco` de `caneca-textura.ts`
 * — mesmo algoritmo (passo de 2px), mesma razão para existir separada (ver
 * o cabeçalho deste arquivo). Testada de novo em
 * `tests/unit/ecobag-textura.test.ts`, não porque o comportamento mude, mas
 * porque testar a CÓPIA é o que garante que uma edição futura num arquivo
 * não destrava silenciosamente o outro.
 */
export function ajustarFonteAoEspaco(params: ParametrosAjuste): number {
  const { texto, larguraDisponivel, tamanhoMax, tamanhoMin, familia, medir } = params
  let tamanho = tamanhoMax
  while (tamanho > tamanhoMin && medir(`700 ${tamanho}px ${familia}`, texto) > larguraDisponivel) {
    tamanho -= 2
  }
  return tamanho
}

/** Mesma técnica de `resolveSansFamily` em `caneca-textura.ts` — ver aquele
 *  arquivo para o porquê de o probe existir (o canvas não entende `var()`). */
export function resolveSansFamily(): string {
  const probe = document.createElement('span')
  probe.className = 'font-sans'
  probe.style.position = 'absolute'
  probe.style.visibility = 'hidden'
  document.body.appendChild(probe)
  const family = getComputedStyle(probe).fontFamily
  probe.remove()
  return family || 'system-ui, sans-serif'
}

const NOME_RESERVA = 'MARCA'

/**
 * Nunca desenha vazio: campo em branco cai no valor de reserva. Extraída
 * como função pura (em vez de inline dentro de `criarTexturaEcobag`) pelo
 * mesmo motivo de `ajustarFonteAoEspaco` — é a única outra decisão desta
 * textura simples o bastante para testar sem canvas.
 */
export function resolverNomeMarca(nomeMarca: string): string {
  return nomeMarca.trim() || NOME_RESERVA
}

export type EntradaTexturaEcobag = {
  /** Cor da marca — mesmo contrato de `EntradaTexturaCaneca.corMarca`. */
  corMarca: string
  nomeMarca: string
}

/**
 * Gera a textura completa do painel frontal da ecobag: lona base, bainhas
 * de cor perto da abertura e da base, e o nome serigrafado no centro — tinta
 * chapada, sem contorno, mesma decisão e mesmo motivo do desenho do nome em
 * `criarTexturaCaneca` (serigrafia real deposita UMA tinta; o contorno que
 * se vê num brinde de camelô é falta de registro, não estilo).
 *
 * Só o painel FRONTAL usa esta textura — `Ecobag.tsx` aplica um material
 * liso (sem canvas) nas outras cinco faces do corpo, a mesma divisão de
 * trabalho que a caneca já não precisa fazer (ela só tem uma face, a lateral
 * do cilindro) mas que aqui existe porque o corpo é uma caixa com seis.
 */
export function criarTexturaEcobag({ corMarca, nomeMarca }: EntradaTexturaEcobag): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = TEXTURA.largura
  canvas.height = TEXTURA.altura
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d indisponível')

  const largura = canvas.width
  const altura = canvas.height

  ctx.fillStyle = COR_LONA
  ctx.fillRect(0, 0, largura, altura)

  ctx.fillStyle = corMarca
  const bainha = altura * BAINHA_ALTURA
  ctx.fillRect(0, altura * BAINHA_Y_TOPO, largura, bainha)
  ctx.fillRect(0, altura * BAINHA_Y_BASE, largura, bainha)

  const nome = resolverNomeMarca(nomeMarca)
  const faixaLargura = largura * FAIXA_LARGURA
  const espacoTexto = faixaLargura * 0.84
  const familia = resolveSansFamily()
  const medir: Medidor = (fonte, texto) => {
    ctx.font = fonte
    return ctx.measureText(texto).width
  }
  const tamanho = ajustarFonteAoEspaco({
    texto: nome,
    larguraDisponivel: espacoTexto,
    tamanhoMax: altura * 0.1,
    tamanhoMin: altura * 0.035,
    familia,
    medir,
  })

  ctx.font = `700 ${tamanho}px ${familia}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const cx = largura / 2
  const cy = altura * ((FAIXA_Y0 + FAIXA_Y1) / 2)

  // SEM CONTORNO — mesma razão do comentário equivalente em
  // `criarTexturaCaneca`: serigrafia (e, aqui, transfer têxtil) deposita uma
  // tinta chapada; a base clara de `COR_LONA` já garante contraste com
  // qualquer cor de marca escolhível.
  ctx.fillStyle = corMarca
  ctx.fillText(nome, cx, cy)

  const textura = new THREE.CanvasTexture(canvas)
  textura.colorSpace = THREE.SRGBColorSpace
  return textura
}
