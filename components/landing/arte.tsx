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

/** Lado do quadrado de cada camada e o ar entre elas.
 *
 *  O `AR` subiu de 46 para 66 depois de ver a primeira versão renderizada: com
 *  46 as marcas de uma camada invadiam o plano da outra e a peça virava um
 *  emaranhado. Em projeção isométrica a altura na tela é `(x+y)/2`, então um
 *  plano de 112 ocupa 112px verticais — o ar precisa ser grande o bastante
 *  para o olho separar os andares. */
const LADO = 112
const AR = 66

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
type Camada = {
  z: number
  /** Marcas vazadas: a maior parte do conteúdo. */
  contornos: [number, number, number, number][]
  /** Poucas e pequenas — são o contrapeso que impede a peça de ficar frouxa. */
  solidos: [number, number, number, number][]
  /** Ligações desenhadas DENTRO do plano da camada. */
  linhas?: [number, number, number, number][]
  acento?: [number, number, number, number]
}

const CENTRO = LADO / 2

const CAMADAS: Camada[] = [
  {
    // DADOS, embaixo, porque é onde tudo se apoia. Grade regular de tabelas —
    // regular de propósito: banco modelado é grade, não constelação.
    z: 0,
    contornos: [22, 48, 74].flatMap((x) =>
      [22, 48, 74].map((y) => [x, y, 16, 16] as [number, number, number, number]),
    ),
    solidos: [
      [22, 22, 16, 16],
      [74, 74, 16, 16],
    ],
  },
  {
    // API no meio: quatro pontas e um centro, com as ligações desenhadas. É a
    // camada de trânsito, e trânsito se mostra com linha, não com bloco.
    z: AR,
    contornos: [
      [20, 20, 16, 16],
      [76, 20, 16, 16],
      [20, 76, 16, 16],
      [76, 76, 16, 16],
    ],
    solidos: [],
    linhas: [
      [28, 28, CENTRO, CENTRO],
      [84, 28, CENTRO, CENTRO],
      [28, 84, CENTRO, CENTRO],
      [84, 84, CENTRO, CENTRO],
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
    z: AR * 2,
    contornos: [],
    solidos: [
      [24, 24, 44, 9],
      [24, 41, 26, 26],
      [58, 41, 26, 9],
      [58, 58, 26, 9],
    ],
  },
]

export function ArteAbertura() {
  const camadas = CAMADAS.map((c) => ({ ...c, borda: faceIso(0, 0, LADO, LADO, c.z) }))

  return (
    <svg
      viewBox="0 0 200 268"
      role="img"
      aria-hidden="true"
      // `arte-entra` e não `arte-viva`: esta é a única peça acima da dobra, já
      // na tela quando a página abre. Por rolagem ela não teria o que revelar,
      // então aqui o desenho é por TEMPO — e é o lugar mais forte do efeito,
      // a primeira coisa que o visitante vê acontecer.
      className="arte-entra h-auto w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* A origem da projeção cai em (0,0); o grupo a leva para o meio da
        * caixa. Com `iso()` devolvendo coordenadas negativas, sem isto metade
        * do desenho ficaria fora do viewBox. */}
      <g transform="translate(100, 146)">
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

        {camadas.map((camada, i) => (
          <g key={camada.z}>
            {/* O contorno da camada. A de baixo é meio ponto mais grossa: em
              * desenho técnico o plano de apoio recebe traço mais forte, e é o
              * que dá pé à peça sem precisar de sombra — que esta página não
              * usa em lugar nenhum. */}
            <polygon {...contorno(camada.borda, 'fill-none stroke-ink', i === 0 ? 1.2 : 0.9)} />

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

            {camada.contornos.map(([x, y, w, d]) => (
              <polygon
                key={`v${x}-${y}`}
                {...contorno(faceIso(x, y, w, d, camada.z), 'fill-paper stroke-ink', 0.7)}
              />
            ))}

            {camada.solidos.map(([x, y, w, d]) => (
              <polygon key={`s${x}-${y}`} {...solido(faceIso(x, y, w, d, camada.z), 'fill-ink')} />
            ))}

            {camada.acento && (
              <polygon {...solido(faceIso(...camada.acento, camada.z), 'fill-accent')} />
            )}
          </g>
        ))}
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
          <rect x="10" y="8" width="100" height="56" strokeWidth="1" {...traca(perimetro(100, 56), 'fill-none stroke-ink')} />
          <rect x="20" y="18" width="60" height="8" {...preenche('fill-ink')} />
          {[34, 42, 50].map((y) => (
            <rect key={y} x="20" y={y} width={y === 42 ? 80 : 66} height="3" {...preenche('fill-rule')} />
          ))}
          <rect x="20" y="34" width="44" height="3" {...preenche('fill-accent')} />
        </>
      )}

      {variante === 'blog' && (
        <>
          {/* Blocos empilhados, decrescendo em opacidade de peso para sugerir
              acúmulo no tempo — o mais recente em cima, cheio. */}
          {/* O primeiro bloco é SÓLIDO e por isso entra por opacidade; os três
              vazados abaixo dele são traçados. Um contorno cheio de tinta não
              tem desenho a mostrar — animá-lo como traço acenderia a borda de
              um retângulo que já está preto. */}
          {[10, 24, 38, 52].map((y, i) =>
            i === 0 ? (
              <rect key={y} x="24" y={y} width="72" height="10" strokeWidth="1" {...preenche('fill-ink stroke-ink')} />
            ) : (
              <rect key={y} x="24" y={y} width="72" height="10" strokeWidth="1" {...traca(perimetro(72, 10), 'fill-none stroke-ink')} />
            ),
          )}
          <rect x="24" y="24" width="20" height="10" {...preenche('fill-accent')} />
        </>
      )}

      {variante === 'sistema' && (
        <>
          {/* Malha: cada nó fala com o vizinho. Só linhas retas.
              Virou lista para o comprimento de cada aresta sair da mesma
              coordenada que a desenha — escrito à mão, o primeiro ajuste de
              posição deixaria o `--traco` apontando para a geometria antiga e
              o traço fecharia curto ou passaria do fim. */}
          <g className="stroke-ink" strokeWidth="0.8">
            {(
              [
                [24, 18, 60, 18], [60, 18, 96, 18], [24, 54, 60, 54], [60, 54, 96, 54],
                [24, 18, 24, 54], [60, 18, 60, 54], [96, 18, 96, 54],
                [24, 18, 60, 54], [96, 18, 60, 54],
              ] as [number, number, number, number][]
            ).map(([x1, y1, x2, y2]) => (
              <line
                key={`${x1}-${y1}-${x2}-${y2}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                {...traca(segmento(x1, y1, x2, y2), '')}
              />
            ))}
          </g>
          {([[24, 18], [60, 18], [96, 18], [24, 54], [96, 54]] as [number, number][]).map(([x, y]) => (
            <rect key={`${x}-${y}`} x={x - 3} y={y - 3} width="6" height="6" {...preenche('fill-ink')} />
          ))}
          <rect x="57" y="51" width="6" height="6" {...preenche('fill-accent')} />
        </>
      )}
    </svg>
  )
}

/**
 * A dupla, dentro da faixa escura — a única das quatro que usa `--color-data`
 * (`#38BDF8`). Ali ele dá 9,29:1; sobre o papel claro daria 1,93:1 e reprovaria
 * AA, e por isso não aparece em nenhuma das outras peças.
 *
 * Duas formas IDÊNTICAS e espelhadas, conectadas. Nenhuma é a principal, que é
 * exatamente o argumento: dois sêniores, nenhum insubstituível.
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
  const forma = (
    <>
      <rect x="0" y="0" width="76" height="76" strokeWidth="1.2" {...traca(perimetro(76, 76), 'fill-none stroke-data')} />
      <rect x="16" y="16" width="44" height="44" strokeWidth="1.2" {...traca(perimetro(44, 44), 'fill-none stroke-data')} />
      <rect x="30" y="30" width="16" height="16" {...preenche('fill-data')} />
      <line x1="0" y1="38" x2="16" y2="38" strokeWidth="1.2" {...traca(segmento(0, 38, 16, 38), 'stroke-data')} />
      <line x1="60" y1="38" x2="76" y2="38" strokeWidth="1.2" {...traca(segmento(60, 38, 76, 38), 'stroke-data')} />
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
      <g className="stroke-border" strokeWidth="0.5">
        {[30, 60, 90].map((y) => (
          <line key={y} x1="8" y1={y} x2="292" y2={y} />
        ))}
      </g>

      {/* As duas formas são o MESMO JSX, então traçam em sincronia — que é
          exatamente o argumento da peça: dois sêniores, nenhum principal. */}
      <g transform="translate(34, 22)">{forma}</g>
      <g transform="translate(190, 22)">{forma}</g>

      {/* As conexões cruzadas: cada forma alcança as duas extremidades da outra.
          É a redundância desenhada — qualquer caminho serve. */}
      <g className="stroke-data" strokeWidth="0.8">
        {(
          [
            [110, 60, 190, 60],
            [110, 44, 190, 76],
            [110, 76, 190, 44],
          ] as [number, number, number, number][]
        ).map(([x1, y1, x2, y2]) => (
          <line key={`${y1}-${y2}`} x1={x1} y1={y1} x2={x2} y2={y2} {...traca(segmento(x1, y1, x2, y2), '')} />
        ))}
      </g>
    </svg>
  )
}
