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
  // Blocos do painel cheio: [x, y, largura, altura]. Lista fixa, e a densidade
  // decresce de cima para baixo para ler como página de verdade — título,
  // parágrafo, blocos — sem desenhar nenhum componente de interface.
  const linhas: [number, number, number][] = [
    [40, 78, 118],
    [40, 88, 132],
    [40, 98, 96],
    [40, 118, 124],
    [40, 128, 108],
    [40, 138, 138],
  ]

  return (
    <svg
      viewBox="0 0 400 180"
      role="img"
      aria-hidden="true"
      className="h-auto w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* PAINEL CHEIO — o que a pessoa vê */}
      <rect x="14" y="20" width="168" height="140" className="fill-none stroke-ink" strokeWidth="1.5" />
      {/* Faixa de topo: o único bloco sólido, para dar peso de "conteúdo real" */}
      <rect x="40" y="44" width="90" height="18" className="fill-ink" />
      {linhas.map(([x, y, w]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={w} height="4" className="fill-rule" />
      ))}
      {/* O único destaque em cor da peça, no painel que tem conteúdo */}
      <rect x="40" y="118" width="124" height="4" className="fill-accent" />

      {/* A SETA — transformação, não comparação lado a lado passiva */}
      <line x1="196" y1="90" x2="216" y2="90" className="stroke-ink" strokeWidth="1.5" />
      <path d="M 216 90 L 209 86 L 209 94 Z" className="fill-ink" />

      {/* PAINEL VAZIO — o que o crawler recebe. Moldura idêntica, nada dentro. */}
      <rect x="230" y="20" width="168" height="140" className="fill-none stroke-ink" strokeWidth="1.5" />
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
      className="h-auto w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {molduras.map(([x, y, w, h]) => (
        <rect key={`m${x}-${y}`} x={x} y={y} width={w} height={h} className="fill-none stroke-ink" strokeWidth="0.8" />
      ))}
      {solidos.map(([x, y, w, h]) => (
        <rect key={`s${x}-${y}`} x={x} y={y} width={w} height={h} className="fill-ink" />
      ))}
      {/* Um bloco em cor, e um só — mesma disciplina dos diagramas do portfólio */}
      <rect x="172" y="96" width="40" height="26" className="fill-accent" />
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
      className="h-auto w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {variante === 'site' && (
        <>
          <rect x="10" y="8" width="100" height="56" className="fill-none stroke-ink" strokeWidth="1" />
          <rect x="20" y="18" width="60" height="8" className="fill-ink" />
          {[34, 42, 50].map((y) => (
            <rect key={y} x="20" y={y} width={y === 42 ? 80 : 66} height="3" className="fill-rule" />
          ))}
          <rect x="20" y="34" width="44" height="3" className="fill-accent" />
        </>
      )}

      {variante === 'blog' && (
        <>
          {/* Blocos empilhados, decrescendo em opacidade de peso para sugerir
              acúmulo no tempo — o mais recente em cima, cheio. */}
          {[10, 24, 38, 52].map((y, i) => (
            <rect
              key={y}
              x="24"
              y={y}
              width="72"
              height="10"
              strokeWidth="1"
              className={i === 0 ? 'fill-ink stroke-ink' : 'fill-none stroke-ink'}
            />
          ))}
          <rect x="24" y="24" width="20" height="10" className="fill-accent" />
        </>
      )}

      {variante === 'sistema' && (
        <>
          {/* Malha: cada nó fala com o vizinho. Só linhas retas. */}
          <g className="stroke-ink" strokeWidth="0.8">
            <line x1="24" y1="18" x2="60" y2="18" />
            <line x1="60" y1="18" x2="96" y2="18" />
            <line x1="24" y1="54" x2="60" y2="54" />
            <line x1="60" y1="54" x2="96" y2="54" />
            <line x1="24" y1="18" x2="24" y2="54" />
            <line x1="60" y1="18" x2="60" y2="54" />
            <line x1="96" y1="18" x2="96" y2="54" />
            <line x1="24" y1="18" x2="60" y2="54" />
            <line x1="96" y1="18" x2="60" y2="54" />
          </g>
          {([[24, 18], [60, 18], [96, 18], [24, 54], [96, 54]] as [number, number][]).map(([x, y]) => (
            <rect key={`${x}-${y}`} x={x - 3} y={y - 3} width="6" height="6" className="fill-ink" />
          ))}
          <rect x="57" y="51" width="6" height="6" className="fill-accent" />
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
      <rect x="0" y="0" width="76" height="76" className="fill-none stroke-data" strokeWidth="1.2" />
      <rect x="16" y="16" width="44" height="44" className="fill-none stroke-data" strokeWidth="1.2" />
      <rect x="30" y="30" width="16" height="16" className="fill-data" />
      <line x1="0" y1="38" x2="16" y2="38" className="stroke-data" strokeWidth="1.2" />
      <line x1="60" y1="38" x2="76" y2="38" className="stroke-data" strokeWidth="1.2" />
    </>
  )

  return (
    <svg
      viewBox="0 0 300 120"
      role="img"
      aria-hidden="true"
      className="h-auto w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Grade de fundo, quase invisível — a mesma função do `grid-tecnico` do
          portfólio: dar chão sem competir. */}
      <g className="stroke-border" strokeWidth="0.5">
        {[30, 60, 90].map((y) => (
          <line key={y} x1="8" y1={y} x2="292" y2={y} />
        ))}
      </g>

      <g transform="translate(34, 22)">{forma}</g>
      <g transform="translate(190, 22)">{forma}</g>

      {/* As conexões cruzadas: cada forma alcança as duas extremidades da outra.
          É a redundância desenhada — qualquer caminho serve. */}
      <g className="stroke-data" strokeWidth="0.8">
        <line x1="110" y1="60" x2="190" y2="60" />
        <line x1="110" y1="44" x2="190" y2="76" />
        <line x1="110" y1="76" x2="190" y2="44" />
      </g>
    </svg>
  )
}
