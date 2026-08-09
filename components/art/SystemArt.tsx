import type { SystemSlug } from '@/content/types'

/**
 * Uma arte de capa por sistema, no cabeçalho do case study — o lugar onde
 * normalmente entraria um print do produto.
 *
 * POR QUE ARTE E NÃO PRINT: dois dos três sistemas são proprietários e não
 * têm captura para mostrar. A alternativa seria desenhar uma interface
 * plausível, e isso seria fabricar prova de produto — uma tela que nunca
 * existiu, apresentada como se existisse. Estas artes são abertamente
 * abstratas: geometria, nunca botão, campo ou menu. Ninguém as confunde com
 * uma captura, que é exatamente o ponto.
 *
 * CADA UMA COM SUA LINGUAGEM, e a linguagem sai do sistema:
 *
 *   OSCapstack   molduras ortogonais aninhadas — as camadas de autorização
 *                que moram no banco, e o "stack" que está no próprio nome.
 *   Saturno      órbitas e anéis — o nome, e a cena de constelação que o
 *                front do sistema de fato tem em three.js.
 *   Moveis.pro   volumes isométricos — showroom, móvel, coisa física.
 *
 * Nenhuma usa `Math.random`: as posições são listas fixas. Arte que muda a
 * cada build não é identidade visual, é ruído, e ainda quebraria qualquer
 * comparação de captura entre dois builds.
 *
 * Uma única forma em ciano por arte, a mesma disciplina dos diagramas: a
 * paleta é monocromática com um dado colorido só.
 */

/** Camadas de autorização, aninhadas. Ortogonal e institucional. */
function OscapstackArt() {
  // Insets crescentes, e o quarto anel é o destacado — é onde a autorização
  // realmente mora, no fundo da pilha e não na superfície.
  const rings = [0, 26, 52, 78, 104]
  return (
    <>
      <g className="stroke-faint" strokeWidth="0.6">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <line key={`v${i}`} x1={20 + i * 45} y1="8" x2={20 + i * 45} y2="292" />
        ))}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <line key={`h${i}`} x1="8" y1={25 + i * 50} x2="392" y2={25 + i * 50} />
        ))}
      </g>

      {/* Opacidade CRESCENTE do exterior para o interior. Na primeira versão
          todas as molduras tinham o mesmo peso e, contra um fundo quase
          preto, as externas simplesmente sumiam: sobrava um retângulo ciano
          solto no meio de nada. A profundidade só aparece se cada camada for
          um degrau mais presente que a de fora. */}
      {rings.map((inset, i) => {
        const accent = i === 3
        return (
          <rect
            key={inset}
            x={30 + inset}
            y={24 + inset * 0.62}
            width={340 - inset * 2}
            height={252 - inset * 1.24}
            className={accent ? 'fill-surface-2 stroke-data' : 'fill-surface stroke-border'}
            strokeWidth={accent ? 1.6 : 1}
            strokeOpacity={accent ? 1 : 0.45 + i * 0.18}
            fillOpacity={accent ? 1 : 0.3 + i * 0.16}
          />
        )
      })}

      {/* Cantoneiras do anel externo — a mesma marcação de estrutura que o
          favicon e o pátio da hero usam. */}
      <g className="fill-border">
        <rect x="30" y="24" width="16" height="4" />
        <rect x="354" y="24" width="16" height="4" />
        <rect x="30" y="272" width="16" height="4" />
        <rect x="354" y="272" width="16" height="4" />
      </g>
    </>
  )
}

/** Órbitas. O nome do sistema é o desenho. */
function SaturnoArt() {
  const cx = 200
  const cy = 150
  // Anéis em perspectiva: mesma inclinação, raios crescentes.
  const rings = [
    { rx: 92, ry: 26 },
    { rx: 120, ry: 34 },
    { rx: 152, ry: 43 },
    { rx: 182, ry: 52 },
  ]
  // Estrelas em posições fixas — nunca sorteadas (ver o comentário do módulo).
  const stars = [
    [42, 46], [96, 28], [148, 62], [214, 34], [268, 58], [330, 40], [366, 82],
    [58, 214], [112, 262], [186, 240], [252, 268], [316, 226], [372, 196], [26, 132],
  ] as const

  return (
    <>
      <g className="fill-faint">
        {stars.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={x % 3 === 0 ? 1.6 : 1} />
        ))}
      </g>

      <g transform={`rotate(-16 ${cx} ${cy})`}>
        {rings.map(({ rx, ry }, i) => (
          <ellipse
            key={rx}
            cx={cx}
            cy={cy}
            rx={rx}
            ry={ry}
            fill="none"
            className={i === 2 ? 'stroke-data' : 'stroke-border'}
            strokeWidth={i === 2 ? 1.4 : 1}
            strokeDasharray={i === 3 ? '4 3' : undefined}
          />
        ))}

        {/* Corpos em órbita, um por anel, em ângulos diferentes para o
            conjunto não ficar alinhado como um alvo. */}
        <circle cx={cx + 92} cy={cy} r="3.4" className="fill-muted" />
        <circle cx={cx - 120} cy={cy} r="2.6" className="fill-muted" />
        <circle cx={cx + 152} cy={cy} r="4" className="fill-data" />
        <circle cx={cx - 182} cy={cy} r="2.2" className="fill-faint" />
      </g>

      <circle cx={cx} cy={cy} r="34" className="fill-surface-2 stroke-border" strokeWidth="1" />
      <circle cx={cx} cy={cy} r="34" fill="none" className="stroke-faint" strokeWidth="0.6" strokeDasharray="2 4" />
    </>
  )
}

/** Volumes isométricos — showroom. */
function MoveisProArt() {
  /** Um bloco em projeção dimétrica 2:1. */
  function Block({
    cx,
    cy,
    hw,
    h,
    accent = false,
  }: {
    cx: number
    cy: number
    hw: number
    h: number
    accent?: boolean
  }) {
    const hh = hw / 2
    const top = `${cx},${cy - hh} ${cx + hw},${cy} ${cx},${cy + hh} ${cx - hw},${cy}`
    const left = `${cx - hw},${cy} ${cx},${cy + hh} ${cx},${cy + hh + h} ${cx - hw},${cy + h}`
    const right = `${cx + hw},${cy} ${cx},${cy + hh} ${cx},${cy + hh + h} ${cx + hw},${cy + h}`
    // O traço vive só no <g> e as faces herdam. Repetir a classe em cada
    // polígono era redundante e ainda fazia um bloco em destaque contar como
    // quatro elementos destacados na trava de paleta.
    return (
      <g strokeWidth={accent ? 1.4 : 1} className={accent ? 'stroke-data' : 'stroke-border'}>
        <polygon points={top} className="fill-surface-2" />
        <polygon points={left} className="fill-surface" />
        <polygon points={right} className="fill-bg" />
      </g>
    )
  }

  return (
    <>
      {/* Piso: linhas de fuga, para os volumes pousarem em algum lugar. */}
      <g className="stroke-faint" strokeWidth="0.6">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <line key={`a${i}`} x1={-40 + i * 80} y1="300" x2={120 + i * 80} y2="140" />
        ))}
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <line key={`b${i}`} x1={40 + i * 80} y1="300" x2={-120 + i * 80} y2="140" />
        ))}
      </g>

      {/* Do fundo para a frente, senão um volume de trás desenha por cima do
          da frente e a profundidade se desfaz. */}
      <Block cx={286} cy={112} hw={46} h={30} />
      <Block cx={124} cy={124} hw={38} h={22} />
      <Block cx={210} cy={168} hw={62} h={46} accent />
      <Block cx={92} cy={210} hw={44} h={34} />
      <Block cx={310} cy={214} hw={52} h={26} />
    </>
  )
}

const BY_SLUG: Record<SystemSlug, () => React.ReactElement> = {
  oscapstack: OscapstackArt,
  'saturno-labs': SaturnoArt,
  'moveis-pro': MoveisProArt,
}

export function SystemArt({ slug }: { slug: SystemSlug }) {
  const Art = BY_SLUG[slug]
  return (
    // `aria-hidden`: é decoração pura. Não carrega informação que a página
    // não diga em texto, e anunciar "gráfico" a um leitor de tela sem ter o
    // que descrever só atrapalha.
    <svg
      aria-hidden="true"
      viewBox="0 0 400 300"
      className="h-auto w-full border border-border bg-bg"
      preserveAspectRatio="xMidYMid meet"
      fill="none"
    >
      <Art />
    </svg>
  )
}
