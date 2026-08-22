import * as THREE from 'three'

/**
 * A "etiqueta" da caneca do brinde: uma textura gerada em canvas, do mesmo
 * jeito que `portico-textures.ts` já gera a chapa dos contêineres — nenhum
 * bitmap baixado, nenhuma requisição externa, regra dura do projeto (ver o
 * cabeçalho daquele arquivo).
 *
 * POR QUE ISTO NÃO VIOLA "nada desenhado como texto em canvas". A regra da
 * rota de ativações (ver `CapaJogo.tsx`) existe para um problema específico:
 * informação que só existe em pixel é invisível para quem não executa
 * JavaScript e para quem usa leitor de tela — o C1 que a spec da dobra
 * corrigiu. O nome da marca aqui NÃO é essa informação: ele já existe em DOM
 * de verdade no próprio modal, primeiro como o VALOR do campo de texto
 * (`<input>`, sempre acessível) e de novo na legenda visível logo abaixo da
 * cena (`brinde.legenda`, com o marcador `{marca}` substituído). O que esta
 * textura desenha é a MESMA marca reimpressa numa superfície 3D — decoração
 * que ilustra um objeto físico, exatamente como `cargoAtlas` (mesmo
 * arquivo-irmão) estampa nome e ícone na lataria dos contêineres do pátio.
 * Nenhuma tela de leitor perde informação se esta textura nunca carregar: o
 * WebGL inteiro é `aria-hidden` (ver `Caneca.tsx`), e a fallback sem WebGL
 * (`CanecaFallback.tsx`) não usa canvas nenhum — mostra a marca em DOM puro.
 */

/** Dimensão da textura, em pixels — 2:1 é a proporção de um cilindro baixo
 *  e largo como uma caneca desenrolada; potência de dois não é exigida pelo
 *  three.js moderno, mas ajuda o mip-map a ficar barato. */
export const TEXTURA = { largura: 1024, altura: 512 } as const

/** Branco quente, não o branco puro de plástico injetado — é o que faz a
 *  base ler como louça e não como PVC antes mesmo do material entrar em
 *  cena (ver `Caneca.tsx`, onde o `clearcoat` termina o trabalho). */
export const COR_CERAMICA = '#F1ECE4'

/** Fração da largura da textura (= fração da circunferência inteira) que a
 *  faixa impressa ocupa, centrada. Não é a textura inteira DE PROPÓSITO: uma
 *  caneca de brinde real tem a marca impressa numa FACE, não dando a volta
 *  inteira — sobra cerâmica lisa na maior parte da peça, que é o que também
 *  faz a marca ENTRAR e SAIR de quadro conforme ela gira, em vez de estar
 *  sempre visível em algum ponto da circunferência (o que leria como adesivo
 *  colado, não como objeto real).
 *
 *  0,32 ainda é generoso perto de uma etiqueta impressa de verdade (mais
 *  perto de 1/4 a 1/3 da volta): valores maiores começam a levar as bordas do
 *  nome para perto da silhueta do cilindro, onde a curvatura estreita o
 *  texto de lado quase até sumir — a mesma distorção que faz a borda de
 *  qualquer rótulo curvo, real ou 3D. */
const FAIXA_LARGURA = 0.32
const FAIXA_Y0 = 0.4
const FAIXA_Y1 = 0.64

/** Friso fino perto da boca e da base, na cor da marca — o detalhe que
 *  separa "objeto de produto" de "cilindro pintado". Mugs de brinde reais
 *  quase sempre levam uma linha de cor no aro. */
const FRISO_ALTURA = 0.018
const FRISO_Y_BOCA = 0.07
const FRISO_Y_BASE = 0.9

/** Assinatura de um medidor de texto: dado um `font` CSS e um texto, devolve
 *  a largura que ele ocupa. Separado de `CanvasRenderingContext2D.measureText`
 *  por injeção — é o que permite testar o encolhimento sem canvas nenhum
 *  (jsdom não implementa `measureText` de verdade, e `tests/setup.ts` trava
 *  `getContext` em `null` para a suíte inteira). */
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
 * Encolhe o corpo da fonte até o texto caber na largura disponível — mesmo
 * laço de `drawStencil` (`portico-textures.ts`), extraído para uma função
 * pura e testável: recebe o medidor em vez de fechar sobre um
 * `CanvasRenderingContext2D`.
 *
 * Passo de 2px, como `drawStencil`: fino o bastante para não pular do
 * "cabe" para o "sobra demais", grosso o bastante para o laço nunca rodar
 * mais que umas trinta voltas mesmo no pior caso (`tamanhoMax` alto e
 * `tamanhoMin` baixo).
 */
export function ajustarFonteAoEspaco(params: ParametrosAjuste): number {
  const { texto, larguraDisponivel, tamanhoMax, tamanhoMin, familia, medir } = params
  let tamanho = tamanhoMax
  while (tamanho > tamanhoMin && medir(`700 ${tamanho}px ${familia}`, texto) > larguraDisponivel) {
    tamanho -= 2
  }
  return tamanho
}

/**
 * Descobre a família sans do design system, do mesmo jeito que
 * `resolveMonoFamily()` faz em `portico-textures.ts` para a mono — um probe
 * com a classe do Tailwind, porque `--font-sans` é declarada como
 * `var(--font-geist-sans), system-ui, sans-serif` e `getPropertyValue`
 * devolveria o `var()` cru, que o canvas não entende.
 *
 * Reescrita aqui, e não importada do arquivo do Pórtico: os dois arquivos já
 * são chunks separados (o Pórtico é da rota inicial, a caneca só carrega no
 * clique do modal de brinde) e importar um do outro juntaria os dois num
 * chunk só — a duplicata de seis linhas é mais barata que essa junção.
 */
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

export type EntradaTexturaCaneca = {
  /** Cor da marca, em qualquer formato que `CanvasRenderingContext2D.fillStyle`
   *  aceite — o `<input type="color">` do modal já entrega hexadecimal. */
  corMarca: string
  /** Nome da marca. Nunca desenhado vazio: uma string em branco (o campo
   *  zerado à força, por exemplo) cai no valor de reserva abaixo — o mesmo
   *  cuidado que `BrindeModal.tsx` já toma ao inicializar o campo com
   *  `brinde.nomePadrao`, reforçado aqui para quem chamar esta função direto
   *  (o teste de unidade, por exemplo) sem passar pelo modal. */
  nomeMarca: string
}

const NOME_RESERVA = 'MARCA'

/**
 * Gera a textura completa da caneca: base cerâmica, friso de cor perto da
 * boca e da base, e o nome da marca impresso na faixa central — uma tinta
 * chapada na cor da marca, sem contorno (ver o comentário no desenho do
 * nome).
 *
 * `document.createElement('canvas')`, nunca `<canvas>` do JSX: o mesmo padrão
 * de toda textura procedural deste projeto (`surface()` em
 * `portico-textures.ts`) — a textura não precisa de um nó na árvore do DOM,
 * só de pixels para o three.js ler.
 */
export function criarTexturaCaneca({ corMarca, nomeMarca }: EntradaTexturaCaneca): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = TEXTURA.largura
  canvas.height = TEXTURA.altura
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d indisponível')

  const largura = canvas.width
  const altura = canvas.height

  ctx.fillStyle = COR_CERAMICA
  ctx.fillRect(0, 0, largura, altura)

  ctx.fillStyle = corMarca
  const friso = altura * FRISO_ALTURA
  ctx.fillRect(0, altura * FRISO_Y_BOCA, largura, friso)
  ctx.fillRect(0, altura * FRISO_Y_BASE, largura, friso)

  const nome = nomeMarca.trim() || NOME_RESERVA
  const faixaLargura = largura * FAIXA_LARGURA
  // 0,84: a mesma folga de `drawStencil` (0,82) — o texto nunca encosta na
  // borda da própria faixa, mesmo no maior tamanho que couber.
  const espacoTexto = faixaLargura * 0.84
  const familia = resolveSansFamily()
  const medir: Medidor = (fonte, texto) => {
    ctx.font = fonte
    return ctx.measureText(texto).width
  }
  const tamanho = ajustarFonteAoEspaco({
    texto: nome,
    larguraDisponivel: espacoTexto,
    tamanhoMax: altura * 0.16,
    tamanhoMin: altura * 0.05,
    familia,
    medir,
  })

  ctx.font = `700 ${tamanho}px ${familia}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const cx = largura / 2
  const cy = altura * ((FAIXA_Y0 + FAIXA_Y1) / 2)

  // SEM CONTORNO. A versão anterior traçava o nome com `strokeText` numa
  // linha de 10% do corpo da fonte antes de preencher — dois tons por letra,
  // que é exatamente o vocabulário de WordArt e a razão de a caneca ler como
  // brinde de camelô em vez de impressão de verdade. Tampografia em cerâmica
  // deposita UMA tinta chapada; a borda que se vê num brinde real é o próprio
  // limite da tinta, não um segundo tom desenhado por fora. Sobre o creme do
  // corpo (`COR_CORPO`) qualquer cor de marca escolhível já tem contraste
  // sobrando, então o contorno também não estava comprando legibilidade.
  ctx.fillStyle = corMarca
  ctx.fillText(nome, cx, cy)

  const textura = new THREE.CanvasTexture(canvas)
  textura.colorSpace = THREE.SRGBColorSpace
  return textura
}
