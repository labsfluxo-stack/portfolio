/**
 * A MARCA ISOMÉTRICA DO BLOG — três placas empilhadas, em miniatura.
 *
 * Existe para resolver um problema medido, não para enfeitar: o blog não
 * herdava nada da identidade do site. A landing tem a arte isométrica de quatro
 * camadas, que é a única coisa visualmente própria que este projeto tem; quem
 * vinha da landing para o blog sentia que tinha mudado de produto.
 *
 * É uma CITAÇÃO da arte grande, não uma cópia reduzida. A arte da landing tem
 * quatro camadas com conteúdo dentro de cada uma; a 56px isso vira mancha (o
 * mesmo motivo que fez as artes dos cartões da oferta subirem de 96 para 176px).
 * Aqui ficam só três placas e as linhas de construção — o gesto, sem o detalhe.
 *
 * `iso` é a mesma projeção do resto do projeto, reescrita aqui em três linhas
 * em vez de importada de `components/landing/arte.tsx`. Aquele arquivo tem ~2500
 * linhas e carrega defs, filtros e as artes inteiras; importar dele por causa de
 * uma função de duas operações arrastaria tudo para dentro do pacote do blog.
 *
 * `aria-hidden` porque é ornamento: não acrescenta informação que o texto ao
 * lado já não dê, e um leitor de tela anunciando "imagem" aqui só atrapalha.
 */
const COS30 = Math.cos(Math.PI / 6)

/** `+x` desce para a direita, `+y` desce para a esquerda, `z` sobe. */
function iso(x: number, y: number, z: number): [number, number] {
  return [(x - y) * COS30, (x + y) * 0.5 - z]
}

/** O losango de uma placa quadrada de lado `L`, na altura `z`. */
function placa(L: number, z: number): string {
  return [iso(0, 0, z), iso(L, 0, z), iso(L, L, z), iso(0, L, z)]
    .map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`)
    .join(' ')
}

const LADO = 26
/** Distância vertical entre placas. Menor que na arte grande: aqui o empilhamento
 *  precisa caber em 56px, e placas muito separadas viram três desenhos soltos. */
const AR = 11

export function MarcaIso({ className = '' }: { className?: string }) {
  const alturas = [0, AR, AR * 2]

  return (
    <svg
      aria-hidden="true"
      viewBox="-24 -26 48 52"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinejoin="round"
    >
      {/* O EIXO VERTICAL, desenhado ANTES das placas para passar por trás
        * delas. É a linha de construção da arte grande — o que faz três
        * losangos soltos lerem como uma coisa só, montada. */}
      <line
        x1="0"
        y1={-AR * 2 - 8}
        x2="0"
        y2={LADO + 6}
        strokeWidth="0.5"
        className="text-ink-2"
        stroke="currentColor"
        opacity="0.45"
      />
      {alturas.map((z, i) => (
        <polygon
          key={z}
          points={placa(LADO, z)}
          // A placa do topo é a única no acento: é ela que carrega o olho, e
          // três placas em ciano viraria um sinal repetido em vez de um foco.
          className={i === alturas.length - 1 ? 'text-accent' : 'text-ink-2'}
          stroke="currentColor"
          strokeWidth={i === alturas.length - 1 ? 1.1 : 0.9}
          opacity={i === alturas.length - 1 ? 1 : 0.55 + i * 0.15}
        />
      ))}
    </svg>
  )
}
