import type { Dictionary } from '@/content/types'

/**
 * Arte da landing, em SVG e não em imagem gerada.
 *
 * A primeira tentativa foi por gerador de imagem, e falhou de quatro formas ao
 * mesmo tempo: grão de papel onde o resto da página é vetorial limpo, um dos
 * resultados veio fotografado como quadro emoldurado numa parede, as formas
 * saíram orgânicas onde o pedido era geometria fechada, e — o mais previsível
 * — os hex da paleta foram tratados como sugestão. Gerador lê `#0369A1` como
 * "azul escuro" e improvisa.
 *
 * Tudo que esta página pede de arte é exatamente o que SVG faz de graça e
 * gerador faz mal: traço de 1px, cor de marca exata, zero textura, nitidez em
 * qualquer densidade de tela, e poucos KB em vez de centenas. De quebra, a cor
 * vem de token: trocar `--color-accent` reflete aqui sem reexportar nada.
 *
 * Mesmo padrão que `components/art/SystemArt.tsx` já estabeleceu no portfólio:
 * posições em listas fixas (nunca `Math.random`, que faria a arte mudar a cada
 * build e quebrar qualquer comparação de captura), geometria abertamente
 * abstrata, e UM destaque em cor por peça.
 *
 * Tudo aqui é decoração e leva `aria-hidden`. O argumento vive no texto ao
 * lado — que é o que o crawler lê, e o que a página inteira promete entregar
 * sem depender de JavaScript.
 *
 * AS PEÇAS SE DESENHAM. Contorno traçado primeiro, sólidos preenchendo depois
 * — por rolagem nas três de baixo, por tempo na da dobra. A mecânica inteira
 * está em `app/globals.css` (procure por "DESENHO DA ARTE"); aqui embaixo só
 * ficam as duas classes e o comprimento de cada forma.
 */

/**
 * O comprimento EXATO de cada traço, que é o que `stroke-dasharray` precisa
 * para o desenho progressivo funcionar.
 *
 * É este par de funções que torna o anime.js dispensável nesta página: o
 * `svg.createDrawable` dele existe para MEDIR formas em runtime, e estas aqui
 * não precisam ser medidas — são retângulos e segmentos cujas coordenadas
 * estão escritas logo abaixo. `2 × (w + h)` devolve o mesmo número, em tempo
 * de build e sem biblioteca.
 *
 * `rx` dos cantos arredondados é ignorado de propósito: o único retângulo com
 * raio nesta arte é o botão de 48×14, e ele é sólido — entra por opacidade,
 * não por traço. Se um dia um contorno ganhar raio, o perímetro sai alguns
 * décimos maior que o real e o traço fecha um triz antes do fim.
 */
const perimetro = (w: number, h: number) => 2 * (w + h)
const segmento = (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1)

/** Props de uma forma de CONTORNO, que é traçada. `--traco` alimenta o
 *  `stroke-dasharray`; `pinta` são as classes de cor que a forma já tinha. */
const traca = (comprimento: number, pinta: string) => ({
  className: `traca ${pinta}`,
  style: { '--traco': comprimento } as React.CSSProperties,
})

/** Props de uma forma SÓLIDA: não há traço para desenhar, ela entra por
 *  opacidade depois que os contornos fecharam. */
const preenche = (pinta: string) => ({ className: `preenche ${pinta}` })

/**
 * NÃO USE `preenche` EM ELEMENTO QUE TEM ANIMAÇÃO PRÓPRIA.
 *
 * A regra que faz os sólidos entrarem é `.arte-entra .preenche` — seletor
 * descendente, especificidade 0-2-0. Uma classe de animação solta
 * (`.fluxo-dados`, `.acento-onda`, `.acento-respira`) vale 0-1-0 e PERDE, por
 * mais que venha depois no arquivo.
 *
 * O sintoma é traiçoeiro: o elemento aparece, com a cor certa, no lugar certo
 * — e simplesmente não se move. Foi o que aconteceu com os pulsos de dado, com
 * as ondas do núcleo e com a respiração do halo, os três ao mesmo tempo: o
 * `getComputedStyle` devolvia `animation-name: preencher` em vez da animação
 * escrita para eles. Nenhuma captura de tela denuncia isso, porque em quadro
 * parado a peça fica idêntica.
 *
 * Quem tem animação própria dispensa `preenche`: sem a classe, o elemento já
 * nasce opaco, que é exatamente o estado de que ele precisa.
 */

/**
 * A peça que NÃO é enfeite: ela é o argumento da seção do critério.
 *
 * O texto ao lado diz "peça para ver o site com o JavaScript desligado; se a
 * tela ficar em branco, é isso que o ChatGPT enxerga". Isso é abstrato em
 * palavra e instantâneo em desenho — duas telas iguais, uma cheia e uma vazia.
 *
 * O painel da direita está VAZIO de propósito, sem nem uma linha de cortesia.
 * Qualquer coisa ali enfraqueceria a única ideia que o desenho precisa passar.
 *
 * Sem cromo de navegador — nada de barra de endereço ou três bolinhas. Isso
 * viraria mockup, que é justamente o padrão datado que a pesquisa mandou
 * evitar. São dois retângulos, e o contexto vem do texto.
 */
export function ArteSemJavaScript() {
  return (
    <svg
      viewBox="0 0 400 180"
      role="img"
      aria-hidden="true"
      className="arte-viva h-auto w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* PAINEL CHEIO — o que a pessoa vê.
       *
       * A primeira versão era uma barra preta e umas linhas cinza, e o dono
       * apontou o óbvio: não dava para saber o que era. O que faltava não era
       * texto, era ANATOMIA — as partes que fazem qualquer pessoa reconhecer
       * uma página sem ler uma palavra: barra de topo com logo e menu, título
       * em destaque, linhas de parágrafo, um BOTÃO, e cartões embaixo.
       *
       * O botão é o sinal mais forte de todos. Retângulo arredondado em cor de
       * destaque, na altura certa, é lido como "site" antes de qualquer outra
       * coisa da composição. */}
      <rect x="14" y="20" width="168" height="140" strokeWidth="1.5" {...traca(perimetro(168, 140), 'fill-none stroke-ink')} />

      {/* Barra de topo: marca à esquerda, três itens de menu à direita */}
      <rect x="24" y="28" width="12" height="8" {...preenche('fill-ink')} />
      {[130, 144, 158].map((x) => (
        <rect key={x} x={x} y="30" width="10" height="3" {...preenche('fill-rule')} />
      ))}
      {/* Recuada 1px de cada lado: em `x1=14`/`x2=182` ela nasce no eixo exato
       *  da moldura e, como o traço é centrado, meio pixel dela aparece do
       *  lado de fora. */}
      <line x1="15" y1="44" x2="181" y2="44" strokeWidth="1" {...traca(segmento(15, 44, 181, 44), 'stroke-rule')} />

      {/* Título e duas linhas de apoio */}
      <rect x="24" y="58" width="86" height="11" {...preenche('fill-ink')} />
      <rect x="24" y="76" width="120" height="3.5" {...preenche('fill-rule')} />
      <rect x="24" y="84" width="92" height="3.5" {...preenche('fill-rule')} />

      {/* O botão — único elemento em cor, e o que mais diz "isto é um site" */}
      <rect x="24" y="96" width="48" height="14" rx="3" {...preenche('fill-accent')} />

      {/* Três cartões, a fileira que quase toda home tem */}
      <line x1="24" y1="124" x2="172" y2="124" strokeWidth="1" {...traca(segmento(24, 124, 172, 124), 'stroke-rule')} />
      {[24, 76, 128].map((x) => (
        <g key={x}>
          <rect x={x} y="132" width="44" height="22" strokeWidth="1" {...traca(perimetro(44, 22), 'fill-none stroke-rule')} />
          <rect x={x + 8} y="140" width="22" height="3" {...preenche('fill-rule')} />
        </g>
      ))}

      {/* A SETA — transformação, não comparação passiva lado a lado */}
      <line x1="194" y1="90" x2="216" y2="90" strokeWidth="1.5" {...traca(segmento(194, 90, 216, 90), 'stroke-ink')} />
      <path d="M 218 90 L 210 85.5 L 210 94.5 Z" {...preenche('fill-ink')} />

      {/* PAINEL VAZIO — o que o crawler recebe.
       *
       * Moldura idêntica e absolutamente nada dentro, nem uma linha de
       * cortesia. É a mesma página: só o que sobra quando ninguém executou o
       * JavaScript. Qualquer coisa aqui enfraqueceria a única ideia que o
       * desenho precisa passar. */}
      <rect x="230" y="20" width="168" height="140" strokeWidth="1.5" {...traca(perimetro(168, 140), 'fill-none stroke-ink')} />
    </svg>
  )
}

/* ── Projeção axonométrica ────────────────────────────────────────────────
 *
 * A abertura passou de composição abstrata para VISTA EXPLODIDA, e a troca
 * corrigiu um problema que não era de estilo.
 *
 * A versão anterior eram molduras sobrepostas de frente — bonitas, modernas e
 * mudas. Olhando as quatro artes da página lado a lado, a comparação de JS diz
 * "é isto que o ChatGPT enxerga", a dupla diz "dois sêniores, nenhum é o
 * principal", os cartões dizem site/blog/sistema, e a maior de todas, a única
 * que 100% dos visitantes veem, não dizia nada. Retângulos sobrepostos servem
 * para o site de qualquer coisa.
 *
 * Agora ela desenha o que o dono vende: dados, API e interface como camadas
 * de um sistema, separadas no ar como numa prancha de montagem. É a linguagem
 * de desenho de engenharia — e a profundidade vem da PROJEÇÃO, não de WebGL:
 * medido neste repositório, o pórtico three.js da home escura pesa 284 KB
 * comprimidos, contra 807 bytes de toda a camada premium desta landing.
 *
 * As coordenadas são calculadas, não chutadas. Escrever paralelogramo à mão em
 * SVG é onde o desenho isométrico sempre entorta: basta um vértice fora do eixo
 * para a peça inteira perder o prumo, e ninguém acha o número errado depois.
 */

/** 30° é o ângulo do isométrico de manual — dois eixos espelhados na mesma
 *  inclinação, que é o que faz a peça ler como sólida sem sombra nenhuma. */
const COS30 = Math.cos(Math.PI / 6)

/** Um ponto do plano (x, y) de uma camada, na altura z, projetado na tela. */
function iso(x: number, y: number, z: number): [number, number] {
  return [(x - y) * COS30, (x + y) * 0.5 - z]
}

/** Um retângulo DEITADO no plano de uma camada vira paralelogramo na tela. */
function faceIso(x: number, y: number, w: number, d: number, z: number): [number, number][] {
  return [iso(x, y, z), iso(x + w, y, z), iso(x + w, y + d, z), iso(x, y + d, z)]
}

const pontosDe = (p: [number, number][]) => p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')

/** Perímetro de um polígono fechado — o `--traco` do desenho na rolagem.
 *  `perimetro(w, h)` não serve aqui: depois da projeção os lados deixam de ter
 *  o comprimento que tinham no plano, e o traço fecharia antes ou depois. */
const perimetroDe = (p: [number, number][]) =>
  p.reduce((soma, ponto, i) => {
    const proximo = p[(i + 1) % p.length]
    if (!proximo) return soma
    return soma + Math.hypot(proximo[0] - ponto[0], proximo[1] - ponto[1])
  }, 0)

/** Paralelogramo pronto para o `<polygon>`, com o traço já medido. */
const contorno = (pts: [number, number][], pinta: string, largura: number) => ({
  points: pontosDe(pts),
  strokeWidth: largura,
  ...traca(perimetroDe(pts), pinta),
})

const solido = (pts: [number, number][], pinta: string) => ({
  points: pontosDe(pts),
  ...preenche(pinta),
})

/**
 * AS DUAS FACES LATERAIS DE UM SÓLIDO, e é isto que dá profundidade real à peça.
 *
 * Tudo aqui era paralelogramo DEITADO — figura sem espessura, e por isso a peça
 * inteira lia como recorte de papel colado num plano, por mais detalhe que o
 * recorte tivesse. Volume não vem de detalhe, vem de face.
 *
 * Nesta projeção `+x` desce para a direita e `+y` desce para a esquerda, então
 * as faces visíveis de uma caixa são sempre as de MAIOR x e MAIOR y: as duas
 * que apontam para baixo, na direção de quem olha. As de trás ficam ocultas e
 * não são desenhadas — desenhá-las seria arame, não sólido.
 */
const faceLateralX = (x: number, y: number, w: number, d: number, z: number, alt: number) =>
  [iso(x + w, y, z + alt), iso(x + w, y + d, z + alt), iso(x + w, y + d, z), iso(x + w, y, z)] as [number, number][]

const faceLateralY = (x: number, y: number, w: number, d: number, z: number, alt: number) =>
  [iso(x, y + d, z + alt), iso(x + w, y + d, z + alt), iso(x + w, y + d, z), iso(x, y + d, z)] as [number, number][]

/**
 * UM CÍRCULO DEITADO NO PLANO vira uma elipse de eixos conhecidos.
 *
 * Vale a conta porque ela aparece três vezes na peça (cilindro, lente, aro) e
 * chutar valores daria elipses que não pertencem ao mesmo plano das outras
 * formas — o erro mais rápido de se cometer e o mais difícil de enxergar.
 *
 * Um ponto do círculo é `(r·cosθ, r·senθ)`. Projetado por `iso()`, o `x` da
 * tela vale `(cosθ − senθ)·r·cos30`, que satura em `±r·√2·cos30 = ±1,2247r`;
 * o `y` vale `(cosθ + senθ)·r/2`, que satura em `±r·√2/2 = ±0,7071r`. Ou
 * seja: elipse alinhada aos eixos, achatada em 58%, que é a assinatura do
 * isométrico de 30°.
 */
const RAIO_X = Math.SQRT2 * COS30
const RAIO_Y = Math.SQRT2 / 2

/**
 * O CILINDRO — e ele é o símbolo mais reconhecível de toda a peça.
 *
 * Banco de dados é desenhado como tambor desde os anos 70, e continua sendo em
 * todo diagrama de arquitetura que existe: a camada de dados leva cilindro, a
 * de aplicação leva caixa, a de apresentação leva janela. A camada `dados`
 * tinha nove tabelas — corretas, detalhadas e ANÔNIMAS. Nenhuma delas dizia
 * "banco" a quem passa o olho em dois segundos.
 *
 * Duas elipses e dois lados: tampo, corpo e a curva de baixo. As três estrias
 * horizontais são o que separa "cilindro" de "lata" — em ilustração técnica
 * elas representam os pratos empilhados, e é o detalhe que faz o objeto ser
 * lido como armazenamento e não como copo.
 */
function CilindroIso({ x, y, z, raio, altura }: { x: number; y: number; z: number; raio: number; altura: number }) {
  const [cx, base] = iso(x, y, z)
  const topo = base - altura
  const rx = raio * RAIO_X
  const ry = raio * RAIO_Y
  const lado = { strokeWidth: TRACO.conteudo, ...preenche('stroke-ink') }

  return (
    <g>
      {/* O corpo primeiro: o tampo tem que pousar por cima dele. */}
      <path
        d={`M ${cx - rx} ${topo} L ${cx - rx} ${base} A ${rx} ${ry} 0 0 0 ${cx + rx} ${base} L ${cx + rx} ${topo}`}
        fill="url(#face-escura)"
        {...preenche('')}
      />
      <path
        d={`M ${cx - rx} ${topo} L ${cx - rx} ${base} A ${rx} ${ry} 0 0 0 ${cx + rx} ${base} L ${cx + rx} ${topo}`}
        fill="none"
        {...lado}
      />
      {/* As estrias: os pratos empilhados. Só a metade da frente de cada uma —
          a de trás fica escondida dentro do tambor, e desenhá-la entregaria
          que o objeto é oco. */}
      {[0.34, 0.62].map((f) => (
        <path
          key={f}
          d={`M ${cx - rx} ${topo + altura * f} A ${rx} ${ry} 0 0 0 ${cx + rx} ${topo + altura * f}`}
          fill="none"
          strokeWidth={TRACO.construcao}
          {...preenche('stroke-rule')}
        />
      ))}
      <ellipse cx={cx} cy={topo} rx={rx} ry={ry} fill="url(#face-topo)" {...preenche('')} />
      <ellipse cx={cx} cy={topo} rx={rx} ry={ry} fill="none" {...lado} />
    </g>
  )
}

/**
 * A LUPA — o símbolo de busca, e a única coisa que faltava para a camada
 * `descoberta` se explicar sozinha.
 *
 * As quatro fileiras já tinham a forma de uma lista de resultados, mas lista de
 * resultados sem lupa é só uma pilha de barras. O magnifier é, junto do
 * cilindro, o ícone mais universal do vocabulário de arquitetura — aparece em
 * todo conjunto de ícones de SEO e busca que existe.
 *
 * Fica ACIMA do plano, não deitada nele: a lupa é o instrumento que olha a
 * camada, não um item dentro dela. Erguê-la meia dúzia de unidades é o que faz
 * essa diferença ficar óbvia sem uma palavra de legenda.
 */
function LupaIso({ x, y, z, raio }: { x: number; y: number; z: number; raio: number }) {
  /**
   * DEITADA NO PLANO E COM ESPESSURA, que é o que faltava.
   *
   * A versão anterior era uma elipse de contorno fino com um cabo saindo num
   * ângulo de tela: chapada, sem corpo, e por isso lida como ícone colado sobre
   * o desenho em vez de objeto pousado nele. Numa peça em que TUDO tem duas
   * faces laterais e uma sombra, o único elemento sem nenhuma das três salta —
   * e salta pelo motivo errado.
   *
   * Três correções: o cabo agora nasce de um ponto do PLANO e termina em outro
   * (`iso()` nas duas pontas, não diagonal de tela); o aro ganha espessura, com
   * a elipse de baixo aparecendo sob a de cima; e existe sombra no plano, como
   * em toda outra peça da cena.
   */
  const rx = raio * RAIO_X
  const ry = raio * RAIO_Y
  const espessura = 2.2
  const [cx, topo] = iso(x, y, z + espessura)
  const base = topo + espessura
  // O cabo corre pela diagonal do plano — a direção (+u, +v), que na tela desce
  // reto. É a mesma direção da sombra, e as duas coisas se apoiam.
  const [caboX, caboY] = iso(x + raio * 1.5, y + raio * 1.5, z + espessura)

  return (
    <g>
      <ellipse cx={cx} cy={base + 1.5} rx={rx} ry={ry} fill="url(#sombra)" {...preenche('')} />
      <line
        x1={cx}
        y1={base}
        x2={caboX}
        y2={caboY + espessura}
        strokeWidth={TRACO.estrutura * 1.6}
        strokeLinecap="round"
        {...preenche('stroke-ink')}
      />
      {/* A borda do aro, aparecendo por baixo do tampo — é ela que dá o
          milímetro de corpo que separa lente de decalque. */}
      <ellipse cx={cx} cy={base} rx={rx} ry={ry} fill="url(#face-escura)" {...preenche('')} />
      <ellipse
        cx={cx}
        cy={base}
        rx={rx}
        ry={ry}
        fill="none"
        strokeWidth={TRACO.conteudo}
        {...preenche('stroke-ink')}
      />
      {/* O VIDRO USA O MESMO `face-topo` DE TODA OUTRA PEÇA, e essa foi a
        * correção final — depois de a lupa ganhar volume, sombra, cabo no plano
        * e até uma caixa própria, e continuar "não parecendo parte da camada".
        *
        * A causa não era de forma, era de VALOR. A cena inteira vive num
        * registro escuro, e a lente estava preenchida com um azul claro a 30%:
        * o único elemento claro de todo o desenho. Objeto fora da faixa tonal
        * da cena salta dela por definição, não importa quão correta seja a
        * geometria — e foram três tentativas atacando a geometria.
        *
        * Agora ela é vidro escuro como o tampo das outras caixas, e o que a
        * identifica é um aro em cor de acento, fino. Continua sendo a única
        * lupa da peça; deixou de ser a única mancha clara. */}
      <ellipse cx={cx} cy={topo} rx={rx} ry={ry} fill="url(#face-topo)" {...preenche('')} />
      <ellipse
        cx={cx}
        cy={topo}
        rx={rx}
        ry={ry}
        fill="none"
        stroke="var(--color-data)"
        strokeWidth={TRACO.conteudo * 1.6}
        {...preenche('')}
      />
    </g>
  )
}

/**
 * AS TRÊS IAs QUE LEEM O SITE, na camada de descoberta.
 *
 * SÃO MARCAS GEOMÉTRICAS, NÃO OS LOGOTIPOS. A diferença é deliberada e vale
 * registrar, porque parece economia e não é:
 *
 * 1. As diretrizes de marca das três proíbem alterar o símbolo — e extrudar um
 *    logotipo em isométrico, com faces laterais e sombra, é alteração no
 *    sentido mais literal possível.
 * 2. No tamanho em que isto renderiza (~12px na tela), um logotipo fiel vira
 *    mancha. O que a essa escala continua legível é COR e SILHUETA, e é
 *    exatamente o que estas formas carregam.
 *
 * A faísca de quatro pontas, o feixe radial e o anel hexagonal são vocabulário
 * corrente de "IA" na indústria inteira — nenhum deles é propriedade de
 * ninguém. Com a cor certa embaixo, o reconhecimento acontece de qualquer
 * forma, e sem reivindicar chancela que ninguém deu.
 *
 * ISTO QUEBRA A REGRA DE "UM DESTAQUE EM COR POR PEÇA" que o cabeçalho deste
 * arquivo declara, e a quebra é do dono, consciente: são três marcas de
 * terceiros, cada uma só reconhecível na própria cor. Ficam pequenas e numa
 * camada só, para o acento ciano continuar sendo o centro da composição.
 */
const MARCAS_IA = [
  /** Faísca de quatro pontas — o símbolo de IA mais difundido que existe. */
  { forma: 'faisca', cor: '#4E8DF5' },
  /** Feixe radial. */
  { forma: 'feixe', cor: '#D97757' },
  /** Anel de seis lados. */
  { forma: 'anel', cor: '#10A37F' },
] as const

function MarcaIA({
  x,
  y,
  z,
  raio,
  forma,
  cor,
}: {
  x: number
  y: number
  z: number
  raio: number
  forma: (typeof MARCAS_IA)[number]['forma']
  cor: string
}) {
  /**
   * DESENHADAS NO PLANO DA CAMADA, e esta é a correção do defeito que o dono
   * apontou: "a lupa e as IAs parecem nem fazer parte da camada".
   *
   * A primeira versão traçava os três símbolos em coordenada de TELA — uma
   * faísca de quatro pontas ortogonais, um feixe com ângulos de 45°, um
   * hexágono regular. Todos corretos e todos de frente, num desenho em que
   * absolutamente tudo o mais está deitado a 30°. O resultado é o que ele viu:
   * adesivo colado por cima da cena, e não objeto dentro dela.
   *
   * Agora cada ponto nasce no plano `(u, v)` da camada e passa por `iso()`
   * antes de virar coordenada. As formas ficam levemente cisalhadas — que é
   * exatamente o que acontece com qualquer coisa apoiada naquele plano, e o
   * que faz o olho aceitá-las como parte da peça.
   *
   * A pedestal embaixo fecha o argumento: elas não pairam, elas POUSAM.
   */
  const p = (du: number, dv: number) => iso(x + du, y + dv, z)
  const brilho = { filter: 'url(#brilho-fino)' }
  const traco = { stroke: cor, ...brilho, ...preenche('') }

  if (forma === 'faisca') {
    const r = raio
    const i = raio * 0.3
    const pontos = [
      p(0, -r), p(i, -i), p(r, 0), p(i, i),
      p(0, r), p(-i, i), p(-r, 0), p(-i, -i),
    ]
    return <polygon points={pontosDe(pontos)} fill={cor} {...brilho} {...preenche('')} />
  }

  if (forma === 'feixe') {
    return (
      <g strokeWidth={raio * 0.26} strokeLinecap="round" fill="none" {...traco}>
        {[0, 45, 90, 135].map((grau) => {
          const rad = (grau * Math.PI) / 180
          const du = Math.cos(rad) * raio
          const dv = Math.sin(rad) * raio
          const [ax, ay] = p(-du, -dv)
          const [bx, by] = p(du, dv)
          return <line key={grau} x1={ax} y1={ay} x2={bx} y2={by} />
        })}
      </g>
    )
  }

  const hexagono = Array.from({ length: 6 }, (_, k) => {
    const rad = (k * 60) * (Math.PI / 180)
    return p(Math.cos(rad) * raio, Math.sin(rad) * raio)
  })
  return (
    <polygon
      points={pontosDe(hexagono)}
      fill="none"
      strokeWidth={raio * 0.3}
      strokeLinejoin="round"
      {...traco}
    />
  )
}

/** Um segmento deitado no plano de uma camada, já projetado. */
const linhaIso = (x1: number, y1: number, x2: number, y2: number, z: number) => {
  const [ax, ay] = iso(x1, y1, z)
  const [bx, by] = iso(x2, y2, z)
  return { x1: ax, y1: ay, x2: bx, y2: by }
}

/**
 * OS TRÊS PESOS DE TRAÇO, e esta é a decisão que mais mudou a peça.
 *
 * A versão anterior desenhava quase tudo entre 0,7 e 1,2 — e quando nada é mais
 * importante que nada, o olho lê o conjunto como uma trama só. Não era falta de
 * elementos, era falta de hierarquia. Desenho técnico resolve isso há um século
 * com três canetas, e é o que está aqui:
 *
 *   ESTRUTURA  a aresta da camada, o que define o volume
 *   CONTEUDO   as marcas dentro do plano, o que a camada carrega
 *   CONSTRUCAO cota, eixo, guia — informação sobre o desenho, não do objeto
 *
 * A razão entre elas (≈3:2:1) é o que faz a leitura acontecer em três tempos:
 * primeiro a pilha, depois o que tem dentro, e só quem chegar perto vê a cota.
 */
const TRACO = { estrutura: 1.4, conteudo: 0.9, construcao: 0.5 } as const

/**
 * Hachura, que é como esta peça ganhou VALOR sem ganhar mancha.
 *
 * O comentário das camadas registra a tentativa que falhou: encher os planos de
 * blocos sólidos virou borrão preto, oposto de uma página feita de 1px. Mas a
 * peça precisava de algo entre "vazio" e "preto", senão todo elemento pesa igual
 * — e era metade do problema.
 *
 * A saída é a mesma da prancheta: material se representa com hachura, não com
 * tinta. Continua sendo linha, então continua sendo a linguagem da página; e
 * como a distância entre os traços vira o tom, dá dois cinzas de graça.
 *
 * O ÂNGULO SEGUE O ISOMÉTRICO — 30°, o mesmo de `iso()` — em vez dos 45° de
 * praxe. Numa peça inteira construída em dois eixos a 30°, hachura a 45° briga
 * com todas as arestas e lê como adesivo colado por cima; a 30° ela deita no
 * plano, como se a face tivesse sido riscada.
 */
const HACHURA = { densa: 'hachura-densa', esparsa: 'hachura-esparsa' } as const

/**
 * O ACABAMENTO: tom, halo e brilho.
 *
 * Aqui a peça deixa de ser puro desenho de linha, e a decisão é do dono, contra
 * o que o resto da página faz. Vale registrar o raciocínio de execução, porque
 * "cor e brilho" tem uma versão cara e uma barata, e a barata estraga tudo.
 *
 * O que NÃO foi feito: encher a peça de cor. Duas cores no projeto inteiro —
 * `--color-accent` (#0369A1) e `--color-data` (#38BDF8) — e as duas só existem
 * no MESMO elemento, o bloco central. Cor espalhada em vinte caixas não é
 * premium, é festa junina; o que faz o azul valer é ele ser o único.
 *
 * O que foi feito: o tom entra por GRADIENTE nas faces laterais, por baixo da
 * hachura. A hachura sozinha dá dois valores chapados; com o gradiente por
 * baixo, cada face escurece na direção do vinco — que é como metal escovado
 * reage de verdade. E o brilho é bloom gaussiano, não um `box-shadow` colorido:
 * a luz nasce do próprio elemento e vaza para fora dele.
 */
/**
 * SEM FUNDO PRÓPRIO, e essa foi a última coisa a sair.
 *
 * A peça teve, em sequência: um painel escuro com borda e raio (lia como
 * adesivo colado), o mesmo painel sem borda (lia como cartão), e por fim só
 * as poças de luz de ambiente com máscara de dissolução — que ainda assim
 * desenhavam uma mancha ao redor da figura e a separavam da seção.
 *
 * Nenhuma das três versões conseguiu o que o dono queria, porque todas
 * tentavam a mesma coisa: dar à figura um ambiente PRÓPRIO dentro de uma
 * seção que já tem o dela. Duas atmosferas sobrepostas sempre vão ter uma
 * fronteira, por mais suave que ela seja.
 *
 * A resposta era subtrair: a figura fica direto sobre o preto do hero, e a
 * única luz que existe é a que o bloco de acento EMITE — halo, bloom e ondas,
 * que pertencem ao objeto e não ao fundo. Objeto que acende não precisa de
 * palco; precisa de escuro, e o escuro já estava lá.
 *
 * Fica registrado para ninguém reintroduzir um retângulo aqui achando que
 * falta profundidade. Não falta — foram três tentativas.
 */

function DefsAcabamento() {
  return (
    <defs>
      {/* AS FACES VIRARAM VIDRO. No escuro a lógica se inverte: sombreamento
          não é somar preto, é TIRAR luz — e o que dá matéria a um sólido é a
          face pegar um fio de branco no alto e apagar embaixo. Cor literal e
          não token: estas duas precisam ser luz, e `--color-ink` está invertido
          dentro do painel, então usá-lo aqui as amarraria à inversão em vez de
          à intenção. */}
      <linearGradient id="face-clara" x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.16" />
        <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.03" />
      </linearGradient>
      <linearGradient id="face-escura" x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.07" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0.22" />
      </linearGradient>
      {/* O vidro da lupa: aceso na cor do acento, para amarrar a camada de cima
          ao único ponto de cor da peça — sem virar um segundo acento. */}
      <linearGradient id="lente" x1="0" y1="0" x2="0.5" y2="1">
        <stop offset="0%" stopColor="#67E8F9" stopOpacity="0.30" />
        <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.10" />
      </linearGradient>
      {/* O topo das peças: vidro fosco, levemente azulado pela luz de ambiente. */}
      <linearGradient id="face-topo" x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0%" stopColor="#5B6B85" stopOpacity="0.42" />
        <stop offset="100%" stopColor="#1A2130" stopOpacity="0.62" />
      </linearGradient>

      {/* A SOMBRA PROJETADA. Objeto com volume que não projeta nada continua
          flutuando um milímetro acima do plano — é o último detalhe que separa
          "caixa desenhada sobre um fundo" de "caixa apoiada numa prancha".
          Chapada e fraca de propósito: sombra com gradiente pediria uma fonte
          de luz pontual, e esta cena é iluminada por céu difuso. */}
      <linearGradient id="sombra">
        <stop offset="0%" stopColor="var(--color-ink)" stopOpacity="0.09" />
        <stop offset="100%" stopColor="var(--color-ink)" stopOpacity="0.09" />
      </linearGradient>

      {/* O topo do acento: a única passagem de cor da peça, do azul profundo da
          marca para o azul de dado. É o gradiente que faz um bloco chapado
          virar objeto iluminado. */}
      {/* O acento agora é DUOTONA — ciano para violeta. Uma cor só, por mais
          saturada que fosse, continuaria lendo como "quadrado pintado"; é a
          passagem entre dois matizes que faz o bloco parecer emitir luz. */}
      <linearGradient id="acento-topo" x1="0" y1="0" x2="0.6" y2="1">
        <stop offset="0%" stopColor="#67E8F9" />
        <stop offset="55%" stopColor="#38BDF8" />
        <stop offset="100%" stopColor="#7C6CF6" />
      </linearGradient>
      <linearGradient id="acento-lado" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#38BDF8" />
        <stop offset="100%" stopColor="#4C3FB8" />
      </linearGradient>

      {/* O HALO: a poça de luz que o acento derrama no plano. É ela que faz o
          brilho ter origem física em vez de parecer adesivo — objeto que
          acende, ilumina o que está embaixo. */}
      <radialGradient id="halo">
        <stop offset="0%" stopColor="var(--color-data)" stopOpacity="0.40" />
        <stop offset="55%" stopColor="var(--color-data)" stopOpacity="0.10" />
        <stop offset="100%" stopColor="var(--color-data)" stopOpacity="0" />
      </radialGradient>

      {/* Bloom: borra uma cópia do elemento e a soma por baixo do original, que
          continua nítido. É assim que brilho de verdade funciona — a luz vaza
          para fora da forma sem borrar a aresta. */}
      {/* Bloom em duas passadas: um halo apertado que dá a intensidade e um
          largo que dá o alcance. Uma passada só produz aquele brilho de
          "sombra colorida" — o de verdade tem núcleo e derrame. */}
      <filter id="brilho" x="-120%" y="-120%" width="340%" height="340%">
        <feGaussianBlur stdDeviation="1.6" result="perto" />
        <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="longe" />
        <feMerge>
          <feMergeNode in="longe" />
          <feMergeNode in="longe" />
          <feMergeNode in="perto" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      {/* Bloom leve, para o fluxo de dados: o pulso precisa acender, não borrar. */}
      <filter id="brilho-fino" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="1.8" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  )
}

function DefsHachura() {
  return (
    <defs>
      {(
        [
          // O PASSO ENCOLHEU quando as laterais apareceram. Com 3 e 5 a hachura
          // funcionava nas faces grandes do topo, mas a lateral de uma caixa
          // tem 4 unidades de altura — cabiam uma ou duas linhas, e a face
          // saía praticamente em branco. Sem risco na lateral não há diferença
          // entre as duas faces, e sem diferença entre as faces não há luz:
          // o volume que a extrusão criou se perdia na hora de mostrar.
          [HACHURA.densa, 1.8],
          [HACHURA.esparsa, 3.2],
        ] as const
      ).map(([id, passo]) => (
        // `rotate(60)` e não 30, e a conta importa: a linha do padrão nasce
        // VERTICAL, então girá-la 60° a deixa a 30° da horizontal — que é
        // exatamente a direção dos eixos de `iso()`. Com 30 a hachura saía a
        // 60° da horizontal, cruzando as duas direções do plano ao mesmo tempo:
        // lia como rabisco solto por cima da peça em vez de risco deitado na
        // face. Foi o defeito mais visível da primeira renderização.
        <pattern key={id} id={id} patternUnits="userSpaceOnUse" width={passo} height={passo}
          patternTransform="rotate(60)">
          <line
            x1="0"
            y1="0"
            x2="0"
            y2={passo}
            className="stroke-ink"
            strokeWidth={TRACO.construcao}
          />
        </pattern>
      ))}
    </defs>
  )
}

/** Lado do quadrado de cada camada e o ar entre elas.
 *
 *  O `AR` subiu de 46 para 66 depois de ver a primeira versão renderizada: com
 *  46 as marcas de uma camada invadiam o plano da outra e a peça virava um
 *  emaranhado. Em projeção isométrica a altura na tela é `(x+y)/2`, então um
 *  plano de 112 ocupa 112px verticais — o ar precisa ser grande o bastante
 *  para o olho separar os andares. */
const LADO = 112
// VOLTOU PARA PERTO DE 66 DEPOIS DE UMA REGRESSÃO. Ao entrar a quarta camada
// eu baixei o AR para 50 para a peça caber na caixa, e reintroduzi exatamente
// o defeito que o comentário acima registra ter sido corrigido: as marcas de
// uma camada invadindo o plano da outra. A altura tinha que sair de outro
// lugar, e saiu — a anotação deixou de ser escalada junto com o desenho, então
// o desenho pode encolher sem levar a legenda com ele.
const AR = 62

/** A caixa da peça e a escala do desenho dentro dela. Ficam juntas porque
 *  qualquer mexida numa exige conferir a outra: é a margem da anotação, que não
 *  escala, que decide quanto sobra para o isométrico. */
const CAIXA = { w: 344, h: 336, cx: 178, cy: 202 } as const
const ESCALA = 0.94

/**
 * As três camadas, de baixo para cima, e o que cada uma carrega.
 *
 * O conteúdo não é enfeite: é ele que separa "desenho de engenharia" de "três
 * losangos empilhados". Sem as marcas dentro dos planos a peça vira geometria
 * bonita de novo — que é exatamente o defeito que esta versão veio corrigir.
 *
 * QUASE TUDO É CONTORNO, e isso também veio de ver renderizado. A primeira
 * tentativa encheu os planos de blocos sólidos: virou mancha preta, e mancha
 * preta é o oposto da linguagem desta página, que é 1px de borda e nenhuma
 * sombra. Sólido agora é exceção — dá o peso, não a matéria.
 */
type Retangulo = [number, number, number, number]

type Camada = {
  z: number
  /**
   * A CHAVE DA CAMADA no dicionário. O texto não mora mais aqui.
   *
   * As legendas eram termos técnicos escritos neste arquivo — `ssr`, `cache`,
   * `schema` — e tinham de ser, porque a mesma peça serve as rotas PT e EN e
   * essas palavras se leem igual nas duas. O custo era o público: a ilustração
   * mais vista do site falava com desenvolvedor, e quem esta página persegue é
   * dono de empresa.
   *
   * Agora este arquivo guarda só a GEOMETRIA e aponta para `landing.arte` no
   * dicionário, onde cada idioma diz o que a camada entrega na própria língua.
   * Ver `CamadaDaArte`, em content/types.ts.
   */
  chave: 'dados' | 'aplicacao' | 'interface' | 'descoberta'
  /** O símbolo que identifica a camada à primeira olhada, quando ela tem um.
   *  Cilindro é banco de dados desde os anos 70; lupa é busca em todo conjunto
   *  de ícones que existe. As convenções não se inventam — se usam. */
  simbolo?: {
    tipo: 'cilindro' | 'lupa'
    x: number
    y: number
    raio: number
    altura?: number
    /** Índice do contorno em cujo tampo o símbolo pousa. Sem ele a lupa
     *  flutuaria: as caixas têm alturas diferentes, e chutar uma média deixa o
     *  símbolo enterrado numa e pairando na vizinha. */
    sobreCaixa?: number
  }
  /** As marcas das IAs que leem a página. Só a camada de descoberta tem. */
  marcasIA?: { x: number; y: number }[]
  /** Marcas vazadas: a maior parte do conteúdo. */
  contornos: Retangulo[]
  /** Poucas e pequenas — são o contrapeso que impede a peça de ficar frouxa. */
  solidos: Retangulo[]
  /** Faces hachuradas: o meio-termo entre vazio e preto. */
  hachuras?: [number, number, number, number, keyof typeof HACHURA][]
  /** Ligações desenhadas DENTRO do plano da camada. */
  linhas?: Retangulo[]
  /** Chaves entre marcas: linha curta com um losango sólido na ponta. */
  relacoes?: Retangulo[]
  /** A espessura das peças desta camada. Cada andar tem a sua: tabela é laje
   *  baixa, nó de API é bloco, cartão de interface é chapa fina. É a variação
   *  entre elas que impede a peça de virar três bandejas iguais. */
  altura: number
  acento?: Retangulo
  /**
   * O que existe DENTRO de cada marca de `contornos`.
   *
   * É aqui que mora a diferença entre "losango vazio" e objeto: uma tabela tem
   * cabeçalho e registros, um nó de API tem porta de entrada e de saída. Sem
   * isso, ampliar a peça só amplia o vazio.
   *
   * Gerado a partir do próprio retângulo da marca, nunca listado à mão — assim
   * mexer numa posição não deixa o miolo para trás.
   */
  miolo?: 'tabela' | 'no' | 'painel' | 'resultado'
}

const CENTRO = LADO / 2

const CAMADAS: Camada[] = [
  {
    // DADOS, embaixo, porque é onde tudo se apoia. Grade regular de tabelas —
    // regular de propósito: banco modelado é grade, não constelação.
    z: 0,
    chave: 'dados',
    // O tambor no centro do pátio de tabelas: é ele que diz "banco" antes de
    // qualquer legenda ser lida.
    simbolo: { tipo: 'cilindro', x: 56, y: 56, raio: 13, altura: 15 },
    // Laje baixa e larga: tabela é coisa que se apoia, não que se levanta.
    altura: 4,
    // OITO TABELAS, NÃO NOVE: a do centro saiu para o cilindro ocupar o lugar
    // dela. Não é sacrifício — uma grade 3×3 com o miolo vazado lê como moldura
    // em volta do objeto principal, que é exatamente a composição que se quer.
    // A GRADE PERFEITA FOI QUEBRADA. Oito tabelas de 16×16 em três colunas
    // exatas leem como papel quadriculado — o defeito que a variação de altura
    // já tinha atacado pela vertical e que continuava inteiro na planta.
    //
    // Banco modelado não tem tabelas do mesmo tamanho: tem tabela de cadastro
    // larga, tabela de junção estreita e tabela de log comprida. O formato é
    // informação, e aqui ele volta a ser.
    contornos: [
      [21, 20, 17, 15],
      [45, 19, 14, 20],
      [70, 21, 20, 13],
      [19, 44, 13, 19],
      [72, 45, 18, 16],
      [22, 72, 19, 14],
      [46, 74, 15, 17],
      [71, 71, 17, 18],
    ],
    miolo: 'tabela',
    // AS RELAÇÕES. Banco de dados não é um monte de tabelas soltas: é tabela
    // ligada a tabela, e é a ligação que faz dele um modelo em vez de uma pilha
    // de planilhas. Quatro chaves, em L pela grade — nunca na diagonal, que
    // cruzaria os eixos do plano e leria como teia.
    // Recolocadas depois de a grade virar irregular: as chaves saem das arestas
    // REAIS de cada tabela, e uma chave que termina no vazio é pior que chave
    // nenhuma — denuncia que o desenho não sabe onde as coisas estão.
    relacoes: [
      [38, 27, 45, 27],
      [59, 30, 70, 30],
      [26, 39, 26, 44],
      [32, 53, 45, 53],
      [79, 34, 79, 45],
      [41, 79, 46, 79],
      [61, 82, 71, 82],
    ],
    // Dois sólidos, nas diagonais opostas: são o contrapeso da grade e o que
    // impede as nove marcas de lerem como papel quadriculado.
    // Realinhados à grade nova. Continuam sendo dois e em diagonais opostas: é
    // o contrapeso que impede o conjunto de ficar todo do mesmo peso.
    solidos: [
      [21, 20, 17, 15],
      [71, 71, 17, 18],
    ],
    // A hachura é o TERCEIRO valor, e é ela que quebra a monotonia sem
    // acrescentar mais um preto. Três tabelas riscadas agora, em densidades
    // diferentes — com oito peças de tamanhos distintos, duas eram pouco para
    // a variação de tom acompanhar a variação de forma.
    hachuras: [
      [70, 21, 20, 13, 'densa'],
      [22, 72, 19, 14, 'esparsa'],
      [45, 19, 14, 20, 'esparsa'],
    ],
  },
  {
    // API no meio: quatro pontas e um centro, com as ligações desenhadas. É a
    // camada de trânsito, e trânsito se mostra com linha, não com bloco.
    z: AR,
    chave: 'aplicacao',
    // O bloco mais alto da peça. A camada de trânsito é a que tem máquina
    // dentro, e é a altura dela que faz o andar do meio não sumir entre os
    // dois vizinhos.
    altura: 7,
    // ERA A CAMADA MAIS POBRE DAS QUATRO: quatro quadrados iguais e um centro.
    // Quatro formas idênticas leem como diagrama de manual, não como sistema —
    // sistema real tem peças de tamanhos diferentes porque fazem coisas
    // diferentes. Agora são seis serviços de três formatos, mais a fila.
    contornos: [
      // Os quatro serviços de borda, nas quinas. Dois quadrados e dois
      // retangulares: o formato passa a dizer que não fazem a mesma coisa.
      [18, 18, 16, 16],
      [74, 16, 20, 13],
      [18, 74, 20, 13],
      [78, 76, 16, 16],
      // Dois serviços menores, fora do eixo das quinas — é a assimetria que
      // tira a peça do "diagrama de quatro caixas".
      [18, 46, 11, 11],
      [83, 47, 11, 11],
      // A FILA: uma faixa baixa e comprida atravessando embaixo. `d` menor que
      // 8 faz o miolo virar fileira de itens (ver `Miolo`), que é exatamente a
      // anatomia de uma fila de mensagens — blocos enfileirados esperando a vez.
      [30, 92, 52, 7],
    ],
    miolo: 'no',
    solidos: [],
    hachuras: [
      [74, 16, 20, 13, 'esparsa'],
      [18, 74, 20, 13, 'densa'],
      [30, 92, 52, 7, 'esparsa'],
    ],
    // AS VIAS CHEGAM NOS SEIS, não em quatro. E as duas novas entram pelos
    // lados, não pelas diagonais: um barramento em que tudo converge pelo mesmo
    // ângulo lê como estrela de enfeite; ângulos diferentes leem como
    // roteamento.
    linhas: [
      [26, 26, CENTRO, CENTRO],
      [84, 23, CENTRO, CENTRO],
      [28, 81, CENTRO, CENTRO],
      [86, 84, CENTRO, CENTRO],
      [29, 51, CENTRO, CENTRO],
      [83, 52, CENTRO, CENTRO],
    ],
    // O único bloco em cor da peça, no meio da camada do meio: é o que costura
    // as outras duas. Um destaque, nunca dois — mesma disciplina dos diagramas
    // do portfólio.
    acento: [CENTRO - 9, CENTRO - 9, 18, 18],
  },
  {
    // INTERFACE no topo — o que o cliente dele vê. Barra, bloco e duas linhas:
    // a anatomia mínima para alguém reconhecer "página" sem ler uma palavra.
    //
    // SEM MOLDURA EM VOLTA, e isso veio de ver renderizado. Um contorno de
    // 72×72 aqui virava um segundo losango quase concêntrico com a borda da
    // própria camada — lia como moldura dentro de moldura, não como tela. O
    // plano da camada JÁ é a moldura; desenhar outra era repetir a informação
    // e sujar a peça.
    //
    // A ANATOMIA CRESCEU: era barra, bloco e duas linhas. Agora tem coluna
    // hachurada (o corpo do texto, que é superfície e não mancha), barra de
    // rolagem à direita e um rodapé de linha fina. É a mesma leitura — "isto é
    // uma página" — com o detalhe que faz o olho parar mais de meio segundo.
    z: AR * 2,
    chave: 'interface',
    // Chapa fina: tela é superfície, e superfície não tem corpo.
    altura: 2.5,
    // REMONTADA COMO PÁGINA. A primeira versão desta camada era a mais dispersa
    // das três: cinco formas de tamanhos diferentes espalhadas sem eixo comum,
    // que liam como peças soltas em vez de tela. Agora obedece a uma grade —
    // cabeçalho de ponta a ponta, herói e cartão de apoio na mesma altura,
    // fileira de três, rodapé e botão — e é essa repetição que faz o olho
    // reconhecer "página" antes de identificar qualquer forma isolada.
    // TODA ÁREA HACHURADA TAMBÉM É CONTORNO, e isto não é redundância — é a
    // correção do pior defeito da primeira renderização. Sem a aresta em volta,
    // a hachura não tem onde terminar: as linhas simplesmente param no limite do
    // polígono e o resultado lê como rabisco flutuando sobre o plano, não como
    // superfície preenchida. Na camada de dados o problema não aparecia porque
    // as faces hachuradas já pertenciam à grade de contornos.
    contornos: [
      // Herói e cartão de apoio, na mesma altura.
      [22, 34, 42, 22],
      [68, 34, 22, 22],
      // A fileira de três, o padrão mais reconhecível de home que existe.
      [22, 62, 20, 14],
      [46, 62, 20, 14],
      [70, 62, 20, 14],
      // O rodapé, de ponta a ponta como o cabeçalho — é o par dele, e é o par
      // que fecha a página.
      [22, 82, 68, 6],
    ],
    solidos: [
      // O cabeçalho: o único preto cheio do topo, e é ele que ancora a camada.
      [22, 22, 68, 8],
      // O botão, dentro do herói. Onde a página termina em ação, que é o que
      // esta landing inteira faz.
      [26, 46, 16, 6],
    ],
    miolo: 'painel',
    // A HACHURA SAIU DESTA CAMADA. Ela era o recurso para dizer "tem conteúdo
    // aqui" enquanto os painéis eram vazios por dentro; agora eles têm espaço
    // de imagem, linhas de texto e itens de menu desenhados. Manter as duas
    // coisas empilharia textura sobre anatomia e o cartão viraria borrão — o
    // detalhe que explica vale mais que o detalhe que só preenche.
    hachuras: [],
    linhas: [
      // A barra de rolagem, encostada na aresta direita do painel.
      [92, 34, 92, 56],
    ],
  },
  {
    // DESCOBERTA — a camada que faltava, e ela veio da leitura da PÁGINA, não
    // do desenho.
    //
    // Lendo o dicionário inteiro da landing, um argumento aparece no meta, no
    // hero, nos dois testes do critério e no cartão "Site": *o texto já vem
    // pronto do servidor, que é o que o Google e o ChatGPT leem*. É a tese
    // central da oferta — e a arte, que ilustrava banco, aplicação e tela, não
    // mostrava isso em lugar nenhum. Desenhava a construção e omitia o
    // resultado pelo qual o cliente paga.
    //
    // É também a única camada que o cliente RECONHECE sem tradução. Ele não
    // sabe o que é `schema` ou `cache`; sabe exatamente o que é aparecer no
    // Google e ser citado pelo ChatGPT.
    z: AR * 3,
    chave: 'descoberta',
    // REMONTADA COMO PÁGINA DE RESULTADOS, e a versão anterior era o pior
    // ponto da peça: quatro barras longas e idênticas, que não liam como busca
    // — liam como cano. Nenhum buscador do mundo se parece com isso.
    //
    // A anatomia real é outra e é reconhecida por qualquer pessoa: um CAMPO de
    // busca no alto, com a lupa dentro dele, e abaixo os resultados — cada um
    // com título curto e forte e duas linhas de trecho, mais claras e
    // desiguais. É essa hierarquia que faz o olho dizer "busca" em meio
    // segundo, sem ler uma palavra.
    //
    // A LUPA SAIU DO AR E ENTROU NO CAMPO. Erguida e solta ela lia como
    // enfeite pairando; encostada na ponta direita do campo, ela vira o botão
    // de buscar — que é onde toda pessoa já viu uma lupa na vida.
    simbolo: { tipo: 'lupa', x: 84, y: 22, raio: 5, sobreCaixa: 0 },
    // AS TRÊS IAs DESCERAM PARA DENTRO DA CAMADA.
    //
    // Antes elas pairavam acima do plano, sobre pedestais, ligadas por um fio
    // tracejado — e continuavam lendo como coisa colada por cima do desenho. O
    // fio e a pedestal foram tentativas de amarrar de fora o que só resolve por
    // dentro: se a camada é a descoberta, quem descobre É conteúdo dela.
    //
    // Agora são três caixas na fileira de baixo, com a mesma extrusão, a mesma
    // hachura lateral e a mesma sombra de todas as outras peças da cena. O que
    // as distingue é só o símbolo estampado no tampo — do mesmo jeito que uma
    // tabela se distingue pelo cabeçalho e um nó pelas portas.
    //
    // O terceiro resultado saiu para abrir esse espaço. Dois resultados dizem
    // "lista" tão bem quanto três, e a fileira de IAs vale mais que a repetição.
    marcasIA: [
      { x: 27, y: 85 },
      { x: 53, y: 85 },
      { x: 79, y: 85 },
    ],
    // A mais fina de todas: descoberta não é matéria, é consequência.
    altura: 2,
    contornos: [
      // O CAMPO VOLTOU INTEIRO e a caixa do botão saiu. Ela tinha sido a
      // terceira tentativa de fazer a lupa pertencer à cena, e falhou como as
      // duas anteriores porque nenhuma atacava a causa real — ver o comentário
      // de `LupaIso`.
      [18, 18, 76, 9],
      // Dois resultados, altos o bastante para caberem título e trecho.
      [18, 34, 76, 16],
      [18, 56, 76, 16],
      // A fileira das IAs: três caixas iguais, conteúdo da camada como
      // qualquer outra. O símbolo vai estampado no tampo de cada uma.
      [19, 78, 17, 14],
      [45, 78, 17, 14],
      [71, 78, 17, 14],
    ],
    miolo: 'resultado',
    solidos: [],
    // O PRIMEIRO RESULTADO É O ÚNICO HACHURADO: é a posição conquistada, e o
    // tom mais denso o separa do outro sem precisar de seta nem de rótulo. Um
    // só — o que se vende é ser O resultado, não estar na página.
    hachuras: [[18, 34, 76, 16, 'esparsa']],
  },
]

/**
 * A MALHA DO PLANO, e ela é o que mais mudou a densidade da peça.
 *
 * Cada camada era um losango de 112 de lado com o conteúdo apertado no meio e
 * uma área enorme de vazio em volta — e vazio grande é o que fazia a peça
 * parecer rala mesmo depois de o conteúdo ganhar detalhe. Prancheta não deixa
 * plano liso: deixa quadriculado, porque é sobre a grade que se mede.
 *
 * Fica em `--color-rule` na caneta de construção e ladrilha nas DUAS direções
 * do plano, então a malha se inclina junto com a camada em vez de flutuar. É a
 * diferença entre "três losangos com coisas dentro" e "três pranchas".
 */
/**
 * Uma CAIXA: duas laterais e um topo. A peça inteira passou a ser feita disto.
 *
 * O truque que faz ela ler como sólido sem trair a linguagem da página é a
 * diferença entre as duas laterais. Ilustração técnica sugere luz há dois
 * séculos com densidade de risco, não com tinta: a face que "pega" a luz recebe
 * hachura esparsa, a que foge recebe densa. São dois valores, ambos feitos de
 * linha, e o cérebro lê os dois como uma fonte de luz só.
 *
 * Constante para a peça toda: a face de MAIOR X é a clara, a de MAIOR Y é a
 * escura. Se variasse por objeto, cada caixa teria seu próprio sol e o conjunto
 * viraria papel amassado.
 */
function CaixaIso({
  rect,
  z,
  altura,
  topo = 'vazado',
}: {
  rect: Retangulo
  z: number
  altura: number
  /** `vazado` é a maioria; `cheio` é o contrapeso preto; `acento` é o único
   *  elemento em cor da peça inteira. */
  topo?: 'vazado' | 'cheio' | 'acento'
}) {
  const [x, y, w, d] = rect
  const acento = topo === 'acento'
  const lateralX = pontosDe(faceLateralX(x, y, w, d, z, altura))
  const lateralY = pontosDe(faceLateralY(x, y, w, d, z, altura))

  return (
    <g filter={acento ? 'url(#brilho)' : undefined}>
      {/* A SOMBRA, deslocada em (+1,5, +1,5) no plano.
        *
        * O deslocamento não é escolha estética: nesta projeção `iso(+1,+1)`
        * resolve para (0, +1) — ou seja, avançar o MESMO tanto nos dois eixos
        * move a forma para baixo NA VERTICAL DA TELA, sem torcer para lado
        * nenhum. É a única direção que lê como "sombra ao pé do objeto" em vez
        * de "cópia deslocada na diagonal". */}
      {!acento && (
        <polygon
          points={pontosDe(faceIso(x + 1.5, y + 1.5, w, d, z))}
          fill="url(#sombra)"
          {...preenche('')}
        />
      )}

      {/* CADA LATERAL LEVA DUAS CAMADAS: o gradiente por baixo, a hachura por
        * cima. Separadas de propósito — o gradiente dá a queda de luz contínua,
        * a hachura dá a matéria. Juntas, a face lê como superfície; qualquer
        * uma sozinha lê como preenchimento.
        *
        * A ordem clara→escura importa: as duas dividem a aresta vertical da
        * quina da frente, e a última desenhada fica por cima dela. */}
      <polygon points={lateralX} fill={acento ? 'url(#acento-lado)' : 'url(#face-clara)'} {...preenche('')} />
      {!acento && <polygon points={lateralX} fill={`url(#${HACHURA.esparsa})`} {...preenche('')} />}
      <polygon points={lateralY} fill={acento ? 'url(#acento-lado)' : 'url(#face-escura)'} {...preenche('')} />
      {!acento && <polygon points={lateralY} fill={`url(#${HACHURA.densa})`} {...preenche('')} />}
      {/* As arestas do sólido, por cima da hachura. Entram por opacidade e não
        * por traço: uma caixa tem oito arestas visíveis e a peça tem vinte e
        * poucas caixas — traçar todas transformaria a abertura num festival. */}
      <g {...preenche('stroke-ink')} strokeWidth={TRACO.construcao} fill="none">
        <polygon points={lateralX} />
        <polygon points={lateralY} />
      </g>
      {/* O topo por último: é a face que carrega o conteúdo e não pode ter
        * hachura de lateral passando por cima dela. */}
      {acento ? (
        // A ARESTA DO TOPO É O QUE SALVA O ACENTO. Com topo e laterais no mesmo
        // azul e o bloom por cima, as três faces se fundiam num tarugo chapado —
        // o bloco perdia justamente o volume que a extrusão deu a todo o resto.
        // Um fio claro na aresta devolve a quina, e é ele que faz a peça ler
        // como objeto ACESO em vez de mancha de cor.
        <polygon
          points={pontosDe(faceIso(x, y, w, d, z + altura))}
          fill="url(#acento-topo)"
          stroke="var(--color-data)"
          strokeWidth={TRACO.conteudo}
          {...preenche('')}
        />
      ) : (
        // No escuro o topo não pode ser `fill-paper` puro: uma face da cor do
        // fundo lê como buraco, não como superfície. O vidro fosco por cima do
        // preenchimento é o que a mantém sólida e ainda deixa a peça pertencer
        // ao ambiente.
        <g>
          <polygon
            {...contorno(
              faceIso(x, y, w, d, z + altura),
              `${topo === 'cheio' ? 'fill-ink' : 'fill-paper'} stroke-ink`,
              TRACO.conteudo,
            )}
          />
          {topo !== 'cheio' && (
            <polygon
              points={pontosDe(faceIso(x, y, w, d, z + altura))}
              fill="url(#face-topo)"
              {...preenche('')}
            />
          )}
        </g>
      )}
    </g>
  )
}

/** Espessura da prancha de cada camada. Fina de propósito: ela existe para
 *  dizer que o plano é matéria, não para virar mais um bloco na composição. */
const ESPESSURA_PRANCHA = 2.5

const PASSO_MALHA = 16

function MalhaDoPlano({ z }: { z: number }) {
  const marcas = Array.from({ length: LADO / PASSO_MALHA - 1 }, (_, i) => (i + 1) * PASSO_MALHA)
  return (
    <g {...preenche('stroke-rule')} strokeWidth={TRACO.construcao * 0.7} opacity="0.55">
      {marcas.map((u) => (
        <g key={u}>
          <line {...linhaIso(u, 0, u, LADO, z)} />
          <line {...linhaIso(0, u, LADO, u, z)} />
        </g>
      ))}
    </g>
  )
}

/**
 * Os tiques de escala na aresta da frente, e a cota do lado do plano.
 *
 * Só na camada de baixo: repetir nas três encheria o desenho de números sem
 * acrescentar informação — a escala é a mesma nas três, e é isso que a vista
 * explodida já afirma. Em prancheta a escala se declara uma vez.
 */
function EscalaDoPlano({ z }: { z: number }) {
  const marcas = Array.from({ length: LADO / PASSO_MALHA + 1 }, (_, i) => i * PASSO_MALHA)
  return (
    <g {...preenche('stroke-rule')} strokeWidth={TRACO.construcao} fill="none">
      {marcas.map((u) => {
        const [ax, ay] = iso(u, LADO, z)
        return <line key={u} x1={ax} y1={ay} x2={ax - 1.6} y2={ay + 2.8} />
      })}
      <line {...linhaIso(0, LADO, LADO, LADO, z)} strokeWidth={TRACO.construcao} />
    </g>
  )
}

/**
 * O miolo de UMA marca, gerado a partir do retângulo dela.
 *
 * Entra por opacidade (`preenche`) e não por traço (`traca`), e isto é decisão
 * de orçamento, não descuido: cada forma traçada precisa do perímetro medido e
 * entra na animação de abertura. Com nove tabelas de três linhas cada, traçar
 * tudo transformaria a entrada num festival de oitenta riscos se desenhando —
 * exatamente o tipo de excesso que a peça anterior evitava por ser pobre. A
 * estrutura se desenha; o miolo aparece depois que ela fecha.
 */
function Miolo({
  tipo,
  rect,
  z,
  indice,
}: {
  tipo: 'tabela' | 'no' | 'painel' | 'resultado'
  rect: Retangulo
  z: number
  /** Só para variar o conteúdo entre peças iguais. Nove tabelas idênticas leem
   *  como papel quadriculado; nove com contagens de linha diferentes leem como
   *  banco de dados. */
  indice: number
}) {
  const [x, y, w, d] = rect
  const risco = { strokeWidth: TRACO.construcao, ...preenche('stroke-rule') }
  const forte = { strokeWidth: TRACO.construcao, ...preenche('stroke-ink') }
  const bloco = (bx: number, by: number, bw: number, bd: number, pinta = 'fill-ink') => (
    <polygon key={`${bx}-${by}`} points={pontosDe(faceIso(bx, by, bw, bd, z))} {...preenche(pinta)} />
  )

  if (tipo === 'tabela') {
    // ANATOMIA DE TABELA: faixa de cabeçalho com a marca da chave, duas
    // divisórias de coluna e um número variável de registros. São as três
    // coisas que fazem alguém reconhecer "tabela" sem ler uma palavra — e a
    // divisória de coluna é a mais decisiva das três, porque é ela que
    // transforma linhas empilhadas em GRADE.
    const registros = [3, 4, 2][indice % 3] ?? 3
    const passo = (d - 6) / (registros + 1)
    return (
      <>
        <line {...linhaIso(x, y + 4.5, x + w, y + 4.5, z)} {...forte} />
        {/* A chave primária: o único sólido do miolo, na primeira célula. */}
        {bloco(x + 1.5, y + 1.5, 2.4, 2)}
        {[6, 11].map((dx) => (
          <line key={dx} {...linhaIso(x + dx, y + 4.5, x + dx, y + d - 1.2, z)} {...risco} />
        ))}
        {Array.from({ length: registros }, (_, i) => y + 4.5 + (i + 1) * passo).map((ly) => (
          <line key={ly} {...linhaIso(x + 0.8, ly, x + w - 0.8, ly, z)} {...risco} />
        ))}
      </>
    )
  }

  if (tipo === 'no') {
    // ANATOMIA DE NÓ: o corpo do handler recuado, duas rotas empilhadas dentro
    // dele, e as portas viradas para o centro — agora blocos sólidos na aresta,
    // não tiques, porque tique lê como arranhão e bloco lê como conector.
    const paraCentro = x < CENTRO ? 1 : -1
    const borda = x < CENTRO ? x + w : x
    return (
      <>
        {/* O corpo, em quatro riscos: recuado da aresta da caixa, é ele que diz
            que o nó tem MIOLO e não é um bloco maciço. */}
        {[
          [x + 3, y + 3, x + w - 3, y + 3],
          [x + 3, y + d - 3, x + w - 3, y + d - 3],
          [x + 3, y + 3, x + 3, y + d - 3],
          [x + w - 3, y + 3, x + w - 3, y + d - 3],
        ].map(([a, b, c, e]) => (
          <line key={`${a}-${b}-${c}`} {...linhaIso(a!, b!, c!, e!, z)} {...risco} />
        ))}
        {/* Duas rotas dentro do handler. */}
        {[y + 6, y + 9].map((ly) => (
          <line key={ly} {...linhaIso(x + 5, ly, x + w - 5, ly, z)} {...risco} />
        ))}
        {/* As portas. */}
        {bloco(borda - (paraCentro > 0 ? 0 : 2.4), y + 3.2, 2.4, 2)}
        {bloco(borda - (paraCentro > 0 ? 0 : 2.4), y + d - 5.2, 2.4, 2)}
      </>
    )
  }

  if (tipo === 'resultado') {
    // A CAIXA ESTREITA É UMA DAS IAs e não leva miolo nenhum: o tampo dela
    // recebe o símbolo, desenhado à parte. Sem esta saída, uma faísca ficaria
    // por baixo de um título e duas linhas de trecho que não significam nada
    // ali.
    if (w < 30) return null
    // A caixa rasa é o CAMPO de busca: uma barra curta, do tamanho de uma
    // consulta digitada, e nada mais. Título e trecho pertencem ao resultado,
    // não ao campo — desenhá-los aqui faria o campo virar mais um resultado.
    if (d <= 10) {
      return (
        <polygon points={pontosDe(faceIso(x + 4, y + 3.4, (w - 8) * 0.42, 2.4, z))} {...preenche('fill-rule')} />
      )
    }
    // ANATOMIA DE RESULTADO DE BUSCA, e é a única forma que essa camada podia
    // ter. A versão anterior eram quatro barras longas e iguais — que não leem
    // como resultado, leem como cano. Ninguém reconhece "busca" numa pilha de
    // retângulos do mesmo tamanho.
    //
    // O que todo resultado tem, em qualquer buscador do mundo: um TÍTULO forte
    // e curto, e abaixo dele duas linhas de trecho, mais claras e desiguais. É
    // a desigualdade que faz a coisa ler como texto — bloco de linhas do mesmo
    // comprimento lê como tabela.
    const largo = [0.62, 0.5, 0.72][indice % 3] ?? 0.6
    return (
      <>
        <polygon points={pontosDe(faceIso(x + 3, y + 3, (w - 6) * largo, 2.6, z))} {...preenche('fill-ink')} />
        <line {...linhaIso(x + 3, y + 8.5, x + w - 6, y + 8.5, z)} {...risco} />
        <line {...linhaIso(x + 3, y + 11.6, x + (w - 6) * 0.66, y + 11.6, z)} {...risco} />
      </>
    )
  }

  // PAINEL: o miolo da camada de interface, e ele MUDA DE FORMA conforme o
  // retângulo, como um layout de verdade. Faixa baixa vira fileira de itens
  // (menu, rodapé); bloco alto vira cartão com espaço de imagem e duas linhas
  // de texto. Uma regra só, dois resultados — que é o que faz a camada ler como
  // página em vez de sortimento de retângulos.
  if (d <= 8) {
    const itens = Math.max(2, Math.floor(w / 14))
    return (
      <>
        {Array.from({ length: itens }, (_, i) => x + 3 + i * ((w - 6) / itens)).map((ix) =>
          bloco(ix, y + d / 2 - 1, Math.min(7, (w - 6) / itens - 3), 2, 'fill-rule'),
        )}
      </>
    )
  }

  const alturaImagem = Math.min(d * 0.5, 10)
  return (
    <>
      {/* O espaço de imagem, com a cruz que é o símbolo universal de "aqui vai
          uma foto" em wireframe. Duas diagonais e um retângulo. */}
      {[
        [x + 2, y + 2, x + w - 2, y + 2],
        [x + 2, y + 2 + alturaImagem, x + w - 2, y + 2 + alturaImagem],
        [x + 2, y + 2, x + 2, y + 2 + alturaImagem],
        [x + w - 2, y + 2, x + w - 2, y + 2 + alturaImagem],
        [x + 2, y + 2, x + w - 2, y + 2 + alturaImagem],
        [x + w - 2, y + 2, x + 2, y + 2 + alturaImagem],
      ].map(([a, b, c, e]) => (
        <line key={`${a}-${b}-${c}-${e}`} {...linhaIso(a!, b!, c!, e!, z)} {...risco} />
      ))}
      {/* Duas linhas de texto embaixo, a segunda mais curta — nenhum parágrafo
          termina justificado na última linha. */}
      {bloco(x + 2, y + 5 + alturaImagem, w - 4, 1.6, 'fill-rule')}
      {bloco(x + 2, y + 8 + alturaImagem, (w - 4) * 0.6, 1.6, 'fill-rule')}
    </>
  )
}

/**
 * A camada de ANOTAÇÃO: cota, eixo e rótulo.
 *
 * É o que mais faz a peça ler como prancheta, e custa quase nada em bytes. Três
 * coisas, e cada uma diz algo que a geometria sozinha não dizia:
 *
 *   COTA     mede o vão entre as camadas. Afirma que a separação é uma medida,
 *            não um acaso de composição.
 *   EIXO     a linha de centro vertical, com a cruz onde ela cruza o acento.
 *            É o prumo da peça — o que diz que as três camadas são coaxiais.
 *   RÓTULO   o nome de cada andar, preso a uma guia curta que sai da aresta.
 *
 * Tudo em `--color-rule` e na caneta de construção, e tudo entra por opacidade:
 * anotação é informação SOBRE o desenho, então aparece depois que o desenho
 * existe. Traçá-la junto inverteria a ordem de leitura.
 */
function Anotacao({
  camadas,
  escala,
  textos,
}: {
  camadas: Camada[]
  escala: number
  /** As legendas já traduzidas, vindas de `landing.arte`. */
  textos: Dictionary["landing"]["arte"]
}) {
  const topo = camadas[camadas.length - 1]?.z ?? 0
  /**
   * A ANOTAÇÃO NÃO É ESCALADA JUNTO COM O DESENHO, e essa separação é o que
   * destrava a peça.
   *
   * Enquanto os dois viviam sob o mesmo `scale()`, cada camada nova criava um
   * impasse: mais camadas exigem mais altura, mais altura exige encolher o
   * desenho para caber — e encolher o desenho encolhia a legenda junto, que
   * era justamente o problema que acabou de ser consertado. Um ganho anulava o
   * outro.
   *
   * Aqui as coordenadas recebem a escala À MÃO (`p()`), mas os corpos de texto
   * não. O desenho pode diminuir o quanto precisar que o rótulo continua do
   * mesmo tamanho na tela.
   */
  const p = (v: number) => v * escala
  // O canto direito de cada camada, que é onde a coluna de padrões se apoia, e
  // o esquerdo, de onde sai a guia do rótulo.
  const direita = (z: number) => iso(LADO, 0, z).map(p) as [number, number]
  const esquerda = (z: number) => iso(0, LADO, z).map(p) as [number, number]
  // AS MARGENS SÃO APERTADAS DE PROPÓSITO. A anotação mora fora do desenho, e
  // cada pixel que ela toma da caixa encolhe a peça na tela — a primeira versão
  // com cota folgada deixou o isométrico visivelmente menor que o de antes, o
  // oposto do que este trabalho veio fazer. Guia curta, texto pequeno, cota
  // encostada: a anotação tem que caber no ar que já existia.
  const GUIA = 6
  // TIPOGRAFIA DA ANOTAÇÃO, redimensionada depois de ver a peça no tamanho
  // real da coluna: a 5,5 unidades o rótulo saía com ~6px na tela e era
  // ilegível por TAMANHO, não por contraste — nenhum ajuste de cor resolve
  // texto desse tamanho. O nome da camada subiu para 9,5 e os itens para 7,6,
  // que dão ~11px e ~9px na largura em que a arte de fato renderiza.
  const CORPO = 9.5
  const ITEM = 7.6

  return (
    <g className="arte-anota stroke-rule" fill="none">
      {/* EIXO: prumo do centro, de baixo do bloco de dados até acima da
          interface. Tracejado curto, para não competir com as arestas. */}
      <line
        x1={p(iso(CENTRO, CENTRO, 0)[0])}
        y1={p(iso(CENTRO, CENTRO, 0)[1]) + 16}
        x2={p(iso(CENTRO, CENTRO, topo)[0])}
        y2={p(iso(CENTRO, CENTRO, topo)[1]) - 20}
        strokeWidth={TRACO.construcao}
        strokeDasharray="2 3"
      />

      {/* A COLUNA DA DIREITA — o que cada camada CUMPRE.
        *
        * Aqui ficavam as duas cotas do vão: dois "66" que não diziam nada a
        * ninguém. Era o espaço mais nobre da peça — na única ilustração que
        * 100% dos visitantes veem — gasto com um número interno de composição.
        *
        * Agora as duas colunas leem como folha de especificação: a esquerda diz
        * DE QUE a camada é feita, a direita diz A QUE PADRÃO ela responde. Uma
        * sozinha é legenda; as duas juntas são requisito, que é a diferença
        * entre parecer bonito e parecer contratável.
        *
        * A chamada sai da aresta direita e o texto é ancorado no início, para
        * as três listas alinharem pela esquerda e formarem coluna — espelho
        * exato do que a legenda faz do outro lado. */}
      {camadas.map((camada, i) => {
        const [px, py] = direita(camada.z)
        const inicio = px + 2 + GUIA
        return (
          <g key={`cumpre${i}`}>
            <line x1={px + 2} y1={py} x2={inicio} y2={py} strokeWidth={TRACO.construcao} />
            <line x1={inicio} y1={py - 3} x2={inicio} y2={py + 27} strokeWidth={TRACO.construcao} />
            {textos[camada.chave].cumpre.map((padrao, linha) => (
              <text
                key={padrao}
                x={inicio + 3}
                y={py + 2.5 + linha * 8.6}
                className={linha === 0 ? 'fill-ink font-mono' : 'fill-muted font-mono'}
                fontSize={linha === 0 ? ITEM + 0.6 : ITEM}
                stroke="none"
              >
                {padrao}
              </text>
            ))}
          </g>
        )
      })}

      {/* O DADO SOBE PELO PRUMO, e é aqui que a peça finalmente CONTA a história
          em vez de só ilustrá-la. As setas dizem o sentido; o pulso mostra o
          percurso. Dados alimentam a API, a API alimenta a tela — a tese
          inteira da página em dois segundos de movimento.

          Reaproveita a MESMA classe `.fluxo-dados` das vias horizontais, e isso
          é deliberado: uma regra `infinite` a mais no CSS derrubaria de novo o
          teto de `landing-movimento.test.ts`. Um comportamento, um lugar. */}
      {camadas.slice(0, -1).map((_, i) => {
        const zDe = camadas[i]?.z ?? 0
        const zAte = camadas[i + 1]?.z ?? 0
        const [ax, ay] = iso(CENTRO, CENTRO, zDe).map(p)
        const [bx, by] = iso(CENTRO, CENTRO, zAte).map(p)
        return (
          <line
            key={`sobe${i}`}
            x1={ax}
            y1={ay}
            x2={bx}
            y2={by}
            strokeWidth="1.6"
            strokeLinecap="round"
            className="fluxo-dados stroke-data"
            filter="url(#brilho-fino)"
            style={{ animationDelay: `${1.3 - i * 0.65}s` }}
          />
        )
      })}

      {/* AS SETAS DO PRUMO: dados sobem para a API, a API sobe para a tela.
          Duas farpas simples no eixo, apontando para cima. Sem elas a pilha é
          uma ordem visual; com elas, um sentido de leitura — que é a única
          coisa que o desenho ainda não dizia. */}
      {camadas.slice(0, -1).map((_, i) => {
        const zDe = camadas[i]?.z ?? 0
        const zAte = camadas[i + 1]?.z ?? 0
        const [cx, cy] = iso(CENTRO, CENTRO, (zDe + zAte) / 2).map(p) as [number, number]
        return (
          <path
            key={`f${i}`}
            d={`M ${cx - 3} ${cy + 3} L ${cx} ${cy - 1} L ${cx + 3} ${cy + 3}`}
            strokeWidth={TRACO.construcao}
            fill="none"
          />
        )
      })}

      {/* RÓTULOS: guia saindo da aresta, o nome da camada e o que ela contém.
        *
        * O nome fica na cor do traço (mais forte) e os itens na cor apagada,
        * meio ponto menores — a hierarquia é o que permite três linhas por
        * camada sem a peça virar um muro de texto. Alinhados à direita, contra
        * a guia, os três blocos formam uma coluna só e leem como índice.
        *
        * A guia é mais longa que antes porque agora ela precisa alcançar um
        * bloco de três linhas, e uma guia curta demais deixaria o texto
        * boiando sem ligação com a camada que descreve. */}
      {camadas.map((camada) => {
        const [px, py] = esquerda(camada.z)
        const fim = px - 2 - GUIA
        return (
          <g key={`r${camada.z}`}>
            <line x1={px - 2} y1={py} x2={fim} y2={py} strokeWidth={TRACO.construcao} />
            {/* O tique vertical na ponta da guia: fecha a chamada e amarra as
                três linhas ao mesmo ponto, como chave de legenda. */}
            <line x1={fim} y1={py - 3} x2={fim} y2={py + 27} strokeWidth={TRACO.construcao} />
            <text
              x={fim - 3}
              y={py + 2}
              textAnchor="end"
              className="fill-ink font-mono"
              fontSize={CORPO}
              stroke="none"
            >
              {textos[camada.chave].nome}
            </text>
            {textos[camada.chave].itens.map((item, linha) => (
              <text
                key={item}
                x={fim - 3}
                y={py + 2.5 + (linha + 1) * 8.6}
                textAnchor="end"
                className="fill-muted font-mono"
                fontSize={ITEM}
                stroke="none"
              >
                {item}
              </text>
            ))}
          </g>
        )
      })}
    </g>
  )
}

export function ArteAbertura({ textos }: { textos: Dictionary["landing"]["arte"] }) {
  const camadas = CAMADAS.map((c) => ({ ...c, borda: faceIso(0, 0, LADO, LADO, c.z) }))

  return (
    <svg
      // A CAIXA CRESCEU de 200×268 para caber a anotação: a cota ocupa a
      // direita, o rótulo a esquerda, e sem esse ar os dois encostariam na
      // aresta. O desenho em si não mudou de tamanho — o que entrou foi margem
      // com informação dentro.
      viewBox={`0 0 ${CAIXA.w} ${CAIXA.h}`}
      role="img"
      aria-hidden="true"
      // `arte-entra` e não `arte-viva`: esta é a única peça acima da dobra, já
      // na tela quando a página abre. Por rolagem ela não teria o que revelar,
      // então aqui o desenho é por TEMPO — e é o lugar mais forte do efeito,
      // a primeira coisa que o visitante vê acontecer.
      className="arte-entra h-auto w-full"
      preserveAspectRatio="xMidYMid meet"
      // A INVERSÃO INTEIRA DA PEÇA, EM QUATRO LINHAS.
      //
      // Todo token do projeto mora em `@theme`, então cada utilitário do
      // Tailwind resolve para `var(--color-*)`. Redefinindo as variáveis AQUI,
      // no elemento, toda a árvore abaixo herda: os `stroke-ink` viram traço
      // claro, o `fill-paper` vira o escuro do painel, a régua e o texto
      // acompanham. Nenhuma das ~40 classes da peça precisou ser reescrita, e
      // a inversão não vaza um pixel para fora deste `<svg>`.
      style={
        {
          '--color-ink': '#DCE3F0',
          '--color-paper': '#0B0E15',
          '--color-rule': '#2A3345',
          '--color-muted': '#9AA7C0',
        } as React.CSSProperties
      }
    >
      {/* A origem da projeção cai em (0,0); o grupo a leva para o meio da
        * caixa. Com `iso()` devolvendo coordenadas negativas, sem isto metade
        * do desenho ficaria fora do viewBox. */}
      <DefsAcabamento />
      <DefsHachura />

      {/* DUAS ÁRVORES, MESMA ORIGEM, ESCALAS DIFERENTES.
        *
        * A anotação vem primeiro e SEM escala: assim a quarta camada pôde
        * entrar sem que o rótulo encolhesse junto. Ela recebe a escala como
        * número e a aplica só nas coordenadas.
        *
        * O desenho vem depois, escalado. O `--traco` do desenho progressivo
        * vive em unidades locais, então a escala uniforme não dessincroniza
        * nada — foi por isso que ela pôde ser usada desde o começo. */}
      <g transform={`translate(${CAIXA.cx}, ${CAIXA.cy})`}>
        <Anotacao camadas={CAMADAS} escala={ESCALA} textos={textos} />
      </g>
      <g transform={`translate(${CAIXA.cx}, ${CAIXA.cy}) scale(${ESCALA})`}>
        {/* AS LINHAS DE MONTAGEM, tracejadas, ligando canto a canto.
          *
          * São a assinatura da vista explodida: dizem que as três camadas são
          * UM sistema separado no ar, não três objetos soltos. Sem elas o
          * desenho lê como pilha; com elas, como peça desmontada.
          *
          * Entram por opacidade (`preenche`) e não por traço (`traca`), e o
          * motivo é técnico: o desenho na rolagem funciona animando
          * `stroke-dashoffset` sobre um `stroke-dasharray` calculado — o
          * tracejado ocuparia a mesma propriedade e os dois se anulariam. Como
          * elas surgem depois que os contornos fecham, a ordem de leitura sai
          * até melhor: a peça se desenha, e só então as relações aparecem. */}
        {[0, 1, 2, 3].map((canto) =>
          camadas.slice(0, -1).map((camada, i) => {
            const de = camada.borda[canto]
            const ate = camadas[i + 1]?.borda[canto]
            if (!de || !ate) return null
            return (
              <line
                key={`l${canto}-${i}`}
                x1={de[0]}
                y1={de[1]}
                x2={ate[0]}
                y2={ate[1]}
                // 1px e não 0,6: em `--color-rule` (#DDD9D2) sobre o papel
                // (#F5F3EF) o contraste é baixo de propósito — é linha de guia,
                // não conteúdo — e a 0,6px ela simplesmente não aparecia na
                // tela. Guia invisível é guia que não existe, e era ela que
                // dizia que as três camadas são um sistema só.
                strokeWidth="1"
                strokeDasharray="3 4"
                {...preenche('stroke-rule')}
              />
            )
          }),
        )}

        {camadas.map((camada, i) => {
          // FONTE ÚNICA DA ALTURA DE CADA PEÇA. Precisa ser uma só porque o
          // miolo e a hachura são desenhados no TOPO da caixa: se a altura for
          // recalculada em outro lugar e divergir um décimo, o conteúdo flutua
          // acima da face ou afunda dentro dela — e o erro é quase invisível
          // numa captura, o que o torna pior.
          const alturaDe = (indice: number) =>
            camada.altura * ([1, 1.35, 0.72, 1.12, 0.88][indice % 5] ?? 1)

          return (
          // DOIS ENVELOPES, E OS DOIS PRECISAM EXISTIR SEPARADOS.
          //
          // O de fora faz a separação (uma vez, na entrada); o de dentro faz a
          // flutuação (para sempre). Numa `<g>` só, a segunda declaração de
          // `animation` sobrescreveria a primeira e uma das duas simplesmente
          // não aconteceria — o mesmo tipo de conflito silencioso que já matou
          // as animações que perdiam para `.arte-entra .preenche`.
          //
          // `--sobe` é o `z` da camada: a projeção isométrica joga a altura
          // direto no eixo Y da tela, então descer a prancha por `z` a devolve
          // exatamente para cima da camada de baixo. A de baixo recebe 0 e fica
          // parada, servindo de chão.
          // TRÊS ENVELOPES, um por animação, e cada um existe porque
          // `animation` é uma propriedade só: duas declarações no mesmo
          // elemento não somam, a segunda substitui a primeira. Em grupos
          // aninhados os `transform` se COMPÕEM, que é o comportamento
          // desejado — a peça flutua enquanto separa, e re-empilha por cima
          // das duas.
          //
          //   arte-reempilha  fecha a pilha ao sair da tela (por rolagem)
          //     arte-separa   abre a pilha na entrada (por tempo, uma vez)
          //       arte-flutua suspende a prancha (para sempre)
          <g
            key={camada.z}
            className="arte-reempilha"
            style={{ '--sobe': `${camada.z}px` } as React.CSSProperties}
          >
          <g
            className="arte-separa"
            style={{ '--sobe': `${camada.z}px`, '--i': i } as React.CSSProperties}
          >
          <g className="arte-flutua" style={{ "--i": i } as React.CSSProperties}>
            {/* O contorno da camada. A de baixo é meio ponto mais grossa: em
              * desenho técnico o plano de apoio recebe traço mais forte, e é o
              * que dá pé à peça sem precisar de sombra — que esta página não
              * usa em lugar nenhum. */}
            {/* A PRANCHA TEM ESPESSURA. Sem ela as três camadas eram folhas de
              * papel flutuando — e uma peça inteira de sólidos apoiada em nada
              * é a contradição que mais rápido destrói a ilusão de volume. Duas
              * laterais hachuradas, mesma convenção de luz das caixas: a face
              * de maior X clara, a de maior Y escura. */}
            <polygon
              points={pontosDe(faceLateralX(0, 0, LADO, LADO, camada.z - ESPESSURA_PRANCHA, ESPESSURA_PRANCHA))}
              fill={`url(#${HACHURA.esparsa})`}
              {...preenche('')}
            />
            <polygon
              points={pontosDe(faceLateralY(0, 0, LADO, LADO, camada.z - ESPESSURA_PRANCHA, ESPESSURA_PRANCHA))}
              fill={`url(#${HACHURA.densa})`}
              {...preenche('')}
            />
            <g {...preenche('stroke-ink')} fill="none" strokeWidth={TRACO.conteudo}>
              <polygon points={pontosDe(faceLateralX(0, 0, LADO, LADO, camada.z - ESPESSURA_PRANCHA, ESPESSURA_PRANCHA))} />
              <polygon points={pontosDe(faceLateralY(0, 0, LADO, LADO, camada.z - ESPESSURA_PRANCHA, ESPESSURA_PRANCHA))} />
            </g>

            {/* O contorno da camada. A de baixo é meio ponto mais grossa: em
              * desenho técnico o plano de apoio recebe traço mais forte, e é o
              * que dá pé à peça sem precisar de sombra — que esta página não
              * usa em lugar nenhum. */}
            <polygon
              {...contorno(
                camada.borda,
                'fill-paper stroke-ink',
                i === 0 ? TRACO.estrutura : TRACO.estrutura * 0.72,
              )}
            />

            {/* A malha vem PRIMEIRO de todas: é a superfície sobre a qual o
              * resto está desenhado, então tudo passa por cima dela. */}
            <MalhaDoPlano z={camada.z} />
            {i === 0 && <EscalaDoPlano z={camada.z} />}

            {/* O HALO, só na camada que tem o acento: a poça de luz que o bloco
              * central derrama no plano. É ela que dá origem física ao brilho —
              * objeto que acende ilumina o que está embaixo, e sem isso o bloom
              * lê como adesivo brilhante colado sobre um desenho fosco.
              *
              * Elipse e não círculo: no plano isométrico um círculo se achata na
              * vertical, e um redondo perfeito denunciaria que a luz não está
              * deitada junto com a camada. */}
            {camada.acento && (
              <>
                <ellipse
                  cx={iso(CENTRO, CENTRO, camada.z)[0]}
                  cy={iso(CENTRO, CENTRO, camada.z)[1]}
                  rx={46}
                  ry={26}
                  fill="url(#halo)"
                  className="acento-respira"
                />
                {/* AS ONDAS. Elipses e não círculos: deitadas no plano da
                  * camada, a proporção 46:26 é a mesma do halo, então a onda
                  * sai rasteira pela prancha em vez de subir como bolha. */}
                {[0, 1, 2].map((anel) => (
                  <ellipse
                    key={anel}
                    cx={iso(CENTRO, CENTRO, camada.z)[0]}
                    cy={iso(CENTRO, CENTRO, camada.z)[1]}
                    rx={13}
                    ry={7.4}
                    fill="none"
                    stroke="var(--color-data)"
                    strokeWidth="1.1"
                    className="acento-onda"
                    style={{ '--i': anel } as React.CSSProperties}
                  />
                ))}
              </>
            )}

            {/* As ligações vêm ANTES das marcas, para o traço passar por baixo
              * dos nós em vez de cortá-los ao meio. */}
            {camada.linhas?.map(([x1, y1, x2, y2]) => {
              const de = iso(x1, y1, camada.z)
              const ate = iso(x2, y2, camada.z)
              return (
                <line
                  key={`c${x1}-${y1}`}
                  x1={de[0]}
                  y1={de[1]}
                  x2={ate[0]}
                  y2={ate[1]}
                  strokeWidth="0.7"
                  {...traca(Math.hypot(ate[0] - de[0], ate[1] - de[1]), 'stroke-ink')}
                />
              )
            })}

            {/* O FLUXO: pulsos de dado correndo pelas vias, do módulo para o
              * núcleo. É a única coisa desta página que se move para sempre
              * além da borda viva do CTA — e por isso `landing-movimento.test.ts`
              * precisou ser atualizado de propósito, não por acidente.
              *
              * Vive numa linha SEPARADA da via, por cima dela, porque a via usa
              * `stroke-dasharray` para o desenho progressivo e o pulso usa a
              * mesma propriedade para correr: na mesma linha um anularia o
              * outro. Foi exatamente essa colisão que já derrubou o tracejado
              * das linhas de montagem (ver o comentário lá em cima). */}
            {/* SÓ NA CAMADA DO ACENTO. `linhas` também desenha a barra de
              * rolagem da interface, e sem esta guarda um pulso de dado subia
              * por ela — um ponto azul correndo numa scrollbar, que não
              * significa nada. Fluxo pertence à camada de trânsito. */}
            {/* DOIS PULSOS POR VIA, meio ciclo defasados um do outro. Com um
              * só, cada via passava longos instantes vazia e a cena parecia
              * ociosa entre uma gota e outra; com dois, sempre há tráfego em
              * algum lugar e a peça nunca fica parada. Não custa regra de
              * animação nova — é a mesma classe, renderizada duas vezes. */}
            {camada.acento &&
              [0, 1].flatMap((passada) =>
                camada.linhas?.map(([x1, y1, x2, y2], indice) => {
                  const de = iso(x1, y1, camada.z)
                  const ate = iso(x2, y2, camada.z)
                  return (
                    <line
                      key={`f${passada}-${x1}-${y1}`}
                      x1={de[0]}
                      y1={de[1]}
                      x2={ate[0]}
                      y2={ate[1]}
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      className="fluxo-dados stroke-data"
                      filter="url(#brilho-fino)"
                      // Cada via parte num tempo diferente. Todas em fase
                      // leriam como uma engrenagem só; defasadas, leem como
                      // tráfego.
                      style={{ animationDelay: `${indice * 0.55 + passada * 1.3}s` }}
                    />
                  )
                }) ?? [],
              )}

            {/* AS PEÇAS TÊM CORPO, e todas nascem no mesmo lugar do código.
              *
              * Vazadas, cheias e o acento entram numa lista só e são ordenadas
              * de trás para a frente — maior (x+y) desenha por último. Não é
              * arrumação: em isométrico não existe z-buffer, quem resolve
              * oclusão é a ordem do DOM. Enquanto as três listas eram
              * desenhadas em blocos separados, uma caixa cheia do fundo pintava
              * por cima de uma vazada da frente, e o empilhamento lia errado.
              *
              * O acento vai por último dentro do mesmo critério porque é o mais
              * alto: peça alta esconde as vizinhas de trás, nunca o contrário. */}
            {[
              // A ALTURA VARIA PEÇA A PEÇA, e este é o detalhe que mais rende
              // profundidade por linha de código. Com todas as caixas na mesma
              // altura o conjunto tem um horizonte reto e lê como bandeja de
              // gelo; variando ±35% o skyline fica irregular e o olho passa a
              // ver objetos DISTINTOS apoiados num plano.
              //
              // A variação sai do índice, não de `Math.random`: a arte precisa
              // ser idêntica a cada build, senão nenhuma captura pode ser
              // comparada com a anterior.
              ...camada.contornos.map((rect, indice) => ({
                rect,
                topo: 'vazado' as const,
                alt: alturaDe(indice),
              })),
              ...camada.solidos.map((rect) => ({ rect, topo: 'cheio' as const, alt: camada.altura * 1.2 })),
              ...(camada.acento
                ? [{ rect: camada.acento, topo: 'acento' as const, alt: camada.altura * 1.7 }]
                : []),
            ]
              .sort((a, b) => a.rect[0] + a.rect[1] - (b.rect[0] + b.rect[1]))
              .map(({ rect, topo, alt }, ordem) => (
                // CADA PEÇA FLUTUA SOZINHA, dentro da prancha que também
                // flutua. É o que finalmente tira a cena da imobilidade: com o
                // movimento só nas três pranchas, o conjunto subia e descia
                // como um bloco rígido — o olho lê bloco rígido como imagem
                // parada que alguém está sacudindo, não como cena viva.
                //
                // As duas animações se somam, e é justamente a soma que
                // interessa: períodos diferentes nunca reencontram a fase, e o
                // resultado é um movimento que não se repete de forma
                // reconhecível. O `--i` aqui é a ORDEM DE DESENHO, então peças
                // vizinhas na tela recebem defasagens vizinhas e a cena ondula
                // em vez de tremer.
                <g
                  key={`p${topo}${rect[0]}-${rect[1]}`}
                  className="arte-flutua"
                  style={{ '--i': ordem + 1 } as React.CSSProperties}
                >
                  <CaixaIso rect={rect} z={camada.z} altura={alt} topo={topo} />
                </g>
              ))}

            {/* HACHURA E MIOLO VIVEM NO TOPO DA CAIXA, não no plano — `z +
              * altura` e não `z`. Desenhados na altura do chão eles ficariam
              * atravessados na base do sólido, saindo pela lateral: o defeito
              * clássico de misturar as duas alturas na mesma projeção. */}
            {camada.hachuras?.map(([x, y, w, d, densidade]) => {
              // A hachura tem que subir junto com a caixa que ela preenche.
              // Como as alturas passaram a variar, ela pergunta a altura pela
              // POSIÇÃO da peça na lista de contornos — não pode chutar
              // `camada.altura`, ou a textura de uma tabela alta ficaria
              // atravessada no meio dela.
              const dono = camada.contornos.findIndex((r) => r[0] === x && r[1] === y)
              return (
                <polygon
                  key={`h${x}-${y}`}
                  points={pontosDe(faceIso(x, y, w, d, camada.z + alturaDe(dono === -1 ? 0 : dono)))}
                  fill={`url(#${HACHURA[densidade]})`}
                  {...preenche('')}
                />
              )
            })}

            {/* O SÍMBOLO POR ÚLTIMO na camada: ele é o objeto principal e não
              * pode ficar debaixo de tabela nenhuma. O cilindro nasce no plano;
              * a lupa nasce ERGUIDA, porque instrumento que examina não fica
              * deitado junto com o que examina. */}
            {camada.simbolo?.tipo === 'cilindro' && (
              <CilindroIso
                x={camada.simbolo.x}
                y={camada.simbolo.y}
                z={camada.z}
                raio={camada.simbolo.raio}
                altura={camada.simbolo.altura ?? 14}
              />
            )}
            {/* AS MARCAS SÃO ESTAMPA NO TAMPO, como o cabeçalho é de uma tabela.
              * Nada de pedestal e nada de fio: a caixa que as carrega já é uma
              * das peças da camada, desenhada na mesma passada ordenada por
              * profundidade que todas as outras. `z + alturaDe(...)` as põe em
              * cima da tampa da caixa correspondente — a mesma conta do miolo. */}
            {camada.marcasIA?.map((posicao, k) => {
              const marca = MARCAS_IA[k % MARCAS_IA.length]!
              // As três caixas de IA são as últimas da lista de contornos.
              const indiceDaCaixa = camada.contornos.length - camada.marcasIA!.length + k
              return (
                <MarcaIA
                  key={`${posicao.x}-${posicao.y}`}
                  x={posicao.x}
                  y={posicao.y}
                  z={camada.z + alturaDe(indiceDaCaixa)}
                  raio={4.6}
                  forma={marca.forma}
                  cor={marca.cor}
                />
              )
            })}

            {camada.simbolo?.tipo === 'lupa' && (
              // Pousada no tampo da caixa que ela identifica, e a altura vem de
              // `alturaDe` — a mesma fonte que desenhou a caixa. Um número
              // chutado aqui deixaria a lente enterrada ou flutuando, porque as
              // peças da camada não têm todas a mesma espessura.
              <LupaIso
                x={camada.simbolo.x}
                y={camada.simbolo.y}
                z={camada.z + alturaDe(camada.simbolo.sobreCaixa ?? 0)}
                raio={camada.simbolo.raio}
              />
            )}

            {camada.miolo &&
              camada.contornos.map((rect, indice) => (
                <Miolo
                  key={`m${rect[0]}-${rect[1]}`}
                  tipo={camada.miolo!}
                  rect={rect}
                  z={camada.z + alturaDe(indice)}
                  indice={indice}
                />
              ))}

            {/* As relações vêm por último na camada de dados: a chave é a
              * informação mais fina de todas e não pode ficar debaixo de
              * hachura nenhuma. */}
            {camada.relacoes?.map(([x1, y1, x2, y2]) => {
              const [dx, dy] = iso(x2, y2, camada.z)
              return (
                <g key={`k${x1}-${y1}`} {...preenche('stroke-ink')}>
                  <line {...linhaIso(x1, y1, x2, y2, camada.z)} strokeWidth={TRACO.construcao} />
                  <polygon
                    points={pontosDe([
                      [dx - 2, dy],
                      [dx, dy - 1.2],
                      [dx + 2, dy],
                      [dx, dy + 1.2],
                    ])}
                    className="preenche fill-ink"
                    stroke="none"
                  />
                </g>
              )
            })}

          </g>
          </g>
          </g>
          )
        })}
      </g>

    </svg>
  )
}

/**
 * Uma estrutura por cartão da oferta. Cada uma diz o que o cartão vende, sem
 * desenhar interface nenhuma:
 *
 *   site      camadas horizontais empilhadas — uma página, lida de cima a baixo
 *   blog      coluna de blocos repetidos — publicação que se acumula com o tempo
 *   sistema   malha de nós conectados — operação, onde tudo se fala
 */
/** Os quatro módulos ao redor do núcleo, no cartão "sistema". Fonte única: as
 *  vias e os nós saem daqui, então nenhum ajuste de posição pode dessincronizar
 *  os dois. */
const NOS_SISTEMA: [number, number][] = [
  [22, 14],
  [98, 14],
  [22, 58],
  [98, 58],
]

export function ArteOferta({ variante }: { variante: 'site' | 'blog' | 'sistema' }) {
  return (
    <svg
      viewBox="0 0 120 72"
      role="img"
      aria-hidden="true"
      className="arte-viva h-auto w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {variante === 'site' && (
        <>
          {/* UMA PÁGINA, e agora com a anatomia que faz reconhecer uma:
              barra de topo com marca e menu, título, texto, botão. A versão
              anterior era um retângulo com três tarjas dentro — podia ser
              qualquer coisa. Mesma correção que a comparação de JS já tinha
              recebido do dono ("não dá pra entender o que é"), aplicada aqui. */}
          <rect x="10" y="8" width="100" height="56" strokeWidth="1.2" {...traca(perimetro(100, 56), 'fill-none stroke-ink')} />
          <line x1="10" y1="20" x2="110" y2="20" strokeWidth="0.6" {...traca(100, 'stroke-rule')} />
          <rect x="16" y="12" width="10" height="5" {...preenche('fill-ink')} />
          {[86, 94, 102].map((x) => (
            <rect key={x} x={x} y="13" width="6" height="2" {...preenche('fill-rule')} />
          ))}
          <rect x="16" y="27" width="44" height="7" {...preenche('fill-ink')} />
          {[39, 45].map((y) => (
            <rect key={y} x="16" y={y} width={y === 39 ? 72 : 58} height="2.5" {...preenche('fill-rule')} />
          ))}
          {/* O botão é o sinal mais forte de "isto é um site", e é o único
              elemento em cor da peça. */}
          <rect x="16" y="52" width="26" height="8" rx="2" {...preenche('fill-accent')} />
        </>
      )}

      {variante === 'blog' && (
        <>
          {/* PUBLICAÇÃO QUE SE ACUMULA. Cada faixa é um post, e agora cada uma
              tem CONTEÚDO — uma tarja de título e um marcador de data — em vez
              de serem quatro retângulos vazios iguais. Quatro caixas idênticas
              não dizem "blog", dizem "lista".

              O de cima é o mais recente e é o único preenchido: é o que o leitor
              (e o crawler) encontra primeiro. Os de baixo desbotam para o
              contorno, que é o tempo passando sem precisar de mais nenhum
              elemento.

              O bloco sólido entra por opacidade e os vazados por traço: um
              contorno já cheio de tinta não tem desenho a mostrar — animá-lo
              como traço acenderia a borda de um retângulo que já está preto. */}
          {[8, 23, 38, 53].map((y, i) => (
            <g key={y}>
              {i === 0 ? (
                <rect x="16" y={y} width="88" height="11" strokeWidth="1" {...preenche('fill-ink stroke-ink')} />
              ) : (
                <rect x="16" y={y} width="88" height="11" strokeWidth="0.9" {...traca(perimetro(88, 11), 'fill-none stroke-ink')} />
              )}
              {/* Tarja de título dentro de cada post. No primeiro ela é clara,
                  porque o fundo dele é preto. */}
              <rect
                x="22"
                y={y + 4}
                width={[46, 54, 40, 50][i] ?? 46}
                height="3"
                {...preenche(i === 0 ? 'fill-paper' : 'fill-rule')}
              />
            </g>
          ))}
          {/* O marcador do post mais recente — único elemento em cor. */}
          <rect x="94" y="26" width="6" height="5" {...preenche('fill-accent')} />
        </>
      )}

      {variante === 'sistema' && (
        <>
          {/* Malha: cada nó fala com o vizinho. Só linhas retas.
              Virou lista para o comprimento de cada aresta sair da mesma
              coordenada que a desenha — escrito à mão, o primeiro ajuste de
              posição deixaria o `--traco` apontando para a geometria antiga e
              o traço fecharia curto ou passaria do fim. */}
          {/* OPERAÇÃO: um centro que fala com todos, não uma teia.
              A malha anterior tinha nove arestas ligando tudo a tudo, e nessa
              escala virava rabisco — sem contar que "tudo ligado a tudo" é o
              clichê de rede neural que esta página evita em toda parte.

              Agora é hub e satélites: um núcleo em cor e quatro módulos ao
              redor, cada um com uma via só. É o que um sistema de operação
              realmente é — um lugar onde as coisas se encontram — e nessa
              escala continua legível.

              Os nós saem de UMA lista de coordenadas, e as vias saem da mesma
              lista: mover um nó move a via junto. Escritas à mão, a primeira
              correção de posição deixaria o `--traco` apontando para a
              geometria antiga e o traço fecharia curto. */}
          <g className="stroke-ink" strokeWidth="0.9">
            {NOS_SISTEMA.map(([x, y]) => (
              <line key={`v${x}-${y}`} x1={60} y1={36} x2={x} y2={y} {...traca(segmento(60, 36, x, y), '')} />
            ))}
          </g>
          {NOS_SISTEMA.map(([x, y]) => (
            <rect
              key={`n${x}-${y}`}
              x={x - 9}
              y={y - 6}
              width="18"
              height="12"
              strokeWidth="0.9"
              {...traca(perimetro(18, 12), 'fill-paper stroke-ink')}
            />
          ))}
          {/* O núcleo, e o único elemento em cor. */}
          <rect x="50" y="28" width="20" height="16" {...preenche('fill-accent')} />
        </>
      )}
    </svg>
  )
}

/**
 * O SISTEMA E O REPOSITÓRIO DO CLIENTE — e a peça mudou de significado junto
 * com a seção.
 *
 * Ela desenhava DOIS MÓDULOS IDÊNTICOS e espelhados, conectados, e a simetria
 * era o argumento: dois sêniores, nenhum insubstituível. A entrega passou a ser
 * de uma pessoa só, então a simetria virou afirmação falsa — e arte que afirma
 * o que o texto ao lado já não afirma é a pior espécie de detalhe errado, do
 * tipo que ninguém corrige porque ninguém lê desenho como texto.
 *
 * A geometria sobreviveu porque o novo argumento também é de DOIS LADOS: o
 * sistema que eu construo, e o repositório que fica com você. O que mudou é o
 * que os liga — antes era paridade entre iguais, agora é entrega. As quatro
 * vias continuam, e continuam querendo dizer redundância: some qualquer
 * caminho e o código ainda chega do outro lado.
 *
 * A peça segue na faixa que era escura e hoje é clara, então o `--color-data`
 * dela virou `--color-accent`: sobre o papel o ciano daria 1,93:1 e reprovaria
 * AA. Ver `contraste.test.ts`.
 *
 * A primeira tentativa por gerador saiu com esferas em wireframe e dezenas de
 * linhas cruzadas — o clichê visual de "rede neural", que é o oposto do que
 * esta página quer sinalizar. Aqui é tudo reto e contado: menos de trinta
 * traços no total.
 */
export function ArteDupla() {
  // Uma forma só, desenhada uma vez e espelhada — se as duas fossem escritas à
  // mão, a primeira divergência de coordenada quebraria a simetria que é o
  // ponto da peça.
  //
  // TINHA VIRADO ALVO DE TIRO. Eram três quadrados concêntricos no mesmo peso
  // de traço, e quadrado dentro de quadrado dentro de quadrado lê como mira,
  // não como módulo — nada ali dizia "profissional que entrega". Agora cada
  // forma tem ANATOMIA: carcaça, uma barra de topo, e quatro portas nas laterais
  // por onde as ligações entram de verdade, em vez de encostarem no vazio.
  //
  // A hierarquia de traço é a mesma correção do hero: 1,4 na carcaça, 0,8 no
  // interior, 0,6 nas portas. Antes tudo era 1,2 e o desenho lia chapado.
  const PORTAS = [22, 54]
  const forma = (
    <>
      {/* Carcaça — o traço mais forte da peça. */}
      <rect x="0" y="0" width="76" height="76" strokeWidth="1.4" {...traca(perimetro(76, 76), 'fill-none stroke-accent')} />
      {/* Barra de topo: dá orientação à forma. Sem ela o quadrado não tem
          "em cima", e módulo sem orientação vira ornamento. */}
      <line x1="0" y1="16" x2="76" y2="16" strokeWidth="0.8" {...traca(segmento(0, 16, 76, 16), 'stroke-accent')} />
      <rect x="8" y="6" width="14" height="5" {...preenche('fill-accent')} />
      {/* Núcleo, deslocado para baixo da barra e sem ser concêntrico — é o que
          desfaz a leitura de alvo. */}
      <rect x="14" y="28" width="48" height="34" strokeWidth="0.8" {...traca(perimetro(48, 34), 'fill-none stroke-accent')} />
      <rect x="24" y="38" width="28" height="14" {...preenche('fill-accent')} />
      {/* Portas: dois pontos em cada lateral, onde as ligações chegam. */}
      {PORTAS.map((y) => (
        <g key={y}>
          <line x1="-6" y1={y} x2="0" y2={y} strokeWidth="0.6" {...traca(6, 'stroke-accent')} />
          <line x1="76" y1={y} x2="82" y2={y} strokeWidth="0.6" {...traca(6, 'stroke-accent')} />
        </g>
      ))}
    </>
  )

  return (
    <svg
      viewBox="0 0 300 120"
      role="img"
      aria-hidden="true"
      className="arte-viva h-auto w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Grade de fundo, quase invisível — a mesma função do `grid-tecnico` do
          portfólio: dar chão sem competir.
          FICA FORA DO DESENHO de propósito: é o chão sobre o qual a peça se
          constrói, e chão que também está sendo construído não é chão. */}
      <g className="stroke-rule" strokeWidth="0.5">
        {[30, 60, 90].map((y) => (
          <line key={y} x1="8" y1={y} x2="292" y2={y} />
        ))}
      </g>

      {/* As duas formas são o MESMO JSX, então traçam em sincronia — que é
          exatamente o argumento da peça: dois sêniores, nenhum principal. */}
      <g transform="translate(34, 22)">{forma}</g>
      <g transform="translate(190, 22)">{forma}</g>

      {/* AS CONEXÕES AGORA SAEM DAS PORTAS, não do ar.
          Antes as três linhas partiam de pontos arbitrários no meio do vão e
          morriam encostando na borda do quadrado — lia como risco atravessado,
          não como ligação. Agora cada uma nasce numa porta real de uma forma e
          termina numa porta real da outra, e as coordenadas saem das MESMAS
          constantes que desenham as portas: mexer numa move as duas juntas.

          Quatro caminhos entre dois módulos de duas portas cada é a redundância
          desenhada — some qualquer um e ainda sobra caminho. É literalmente o
          argumento da seção: nenhum dos dois é ponto único de falha. */}
      <g className="stroke-accent" strokeWidth="0.7">
        {[22, 54].flatMap((saida) =>
          [22, 54].map((chegada) => {
            const x1 = 34 + 82
            const y1 = 22 + saida
            const x2 = 190 - 6
            const y2 = 22 + chegada
            return (
              <line
                key={`${saida}-${chegada}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                {...traca(segmento(x1, y1, x2, y2), '')}
              />
            )
          }),
        )}
      </g>
    </svg>
  )
}
