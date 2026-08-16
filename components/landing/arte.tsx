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

/**
 * Abertura. Molduras retangulares aninhadas e sobrepostas, vistas de frente,
 * derivando para a direita — a coluna de texto ocupa a esquerda.
 *
 * A composição saiu da terceira imagem da rodada de gerador, que tinha a melhor
 * composição das três e veio inutilizável por estar fotografada dentro de uma
 * moldura de metal numa parede branca.
 */
export function ArteAbertura() {
  // [x, y, largura, altura] — molduras vazadas, só contorno fino.
  const molduras: [number, number, number, number][] = [
    [96, 40, 150, 150],
    [130, 16, 132, 132],
    [64, 76, 168, 100],
    [150, 60, 120, 160],
    [110, 100, 156, 96],
    [180, 30, 96, 180],
  ]
  // Blocos sólidos, que dão o peso.
  const solidos: [number, number, number, number][] = [
    [120, 52, 82, 44],
    [86, 112, 84, 62],
    [206, 66, 34, 92],
    [156, 148, 62, 38],
  ]

  return (
    <svg
      viewBox="0 0 300 230"
      role="img"
      aria-hidden="true"
      // `arte-entra` e não `arte-viva`: esta é a única peça acima da dobra, já
      // na tela quando a página abre. Por rolagem ela não teria o que revelar,
      // então aqui o desenho é por TEMPO — e é o lugar mais forte do efeito,
      // a primeira coisa que o visitante vê acontecer.
      className="arte-entra h-auto w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {molduras.map(([x, y, w, h]) => (
        <rect key={`m${x}-${y}`} x={x} y={y} width={w} height={h} strokeWidth="0.8" {...traca(perimetro(w, h), 'fill-none stroke-ink')} />
      ))}
      {solidos.map(([x, y, w, h]) => (
        <rect key={`s${x}-${y}`} x={x} y={y} width={w} height={h} {...preenche('fill-ink')} />
      ))}
      {/* Um bloco em cor, e um só — mesma disciplina dos diagramas do portfólio */}
      <rect x="172" y="96" width="40" height="26" {...preenche('fill-accent')} />
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
