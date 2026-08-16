/**
 * Peças compartilhadas dos três diagramas de arquitetura
 * (components/diagrams/SystemDiagram.tsx).
 *
 * Os três desenhos têm FORMAS diferentes de propósito — convergência, esteira
 * e faixas isoladas —, porque os três sistemas têm formas diferentes de
 * verdade. O que eles não podem ter é aparência diferente: caixa, seta e
 * rótulo saem todos daqui, e é isso que faz três desenhos distintos lerem
 * como um conjunto.
 *
 * Cor só por classe utilitária (`fill-border`, `stroke-faint`, ...), nunca
 * hex literal: os tokens vivem em app/globals.css e um hex solto aqui sairia
 * da paleta na primeira vez que ela mudasse. Mesma regra que a elevação em
 * SVG do pórtico já segue.
 */

/** Unidades do viewBox, compartilhadas para os desenhos ficarem coerentes. */
export const UNIT = {
  /** Altura padrão de uma caixa. */
  box: 34,
  /** Respiro entre caixas irmãs. */
  gap: 14,
  /** Tamanho do texto dentro de caixa. */
  label: 8.2,
  /** Tamanho do texto de anotação (números, unidades). */
  note: 6.8,
} as const

/**
 * `defs` únicos por diagrama. Os ids de SVG são GLOBAIS no documento: com os
 * três desenhos numa mesma página (não acontece hoje, mas a home poderia
 * mostrá-los lado a lado amanhã), ids fixos fariam o marcador de um roubar a
 * definição do outro. O prefixo obrigatório evita a colisão antes que ela
 * exista.
 */
export function DiagramDefs({ id }: { id: string }) {
  return (
    <defs>
      {/* AS PONTAS ENTRAM PREENCHENDO. Marcador é desenhado no vértice
          independentemente do tracejado do traço que o carrega — sem isto, as
          setas apareceriam flutuando antes das linhas que elas terminam, que
          lê como defeito de renderização e não como construção.

          Se algum motor não alcançar a animação aqui dentro do `<defs>`, o
          resultado é a ponta visível desde o início: exatamente o que
          aconteceria sem a classe. Acrescentar não piora nada. */}
      <marker id={`${id}-arrow`} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
        <path d="M0,0.9 L6.2,3.5 L0,6.1 Z" className="preenche fill-faint" />
      </marker>
      <marker id={`${id}-arrow-data`} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
        <path d="M0,0.9 L6.2,3.5 L0,6.1 Z" className="preenche fill-data" />
      </marker>
      {/* Hachura de "área", usada para marcar a fronteira de tenant e a laje
          de infraestrutura — mesma linguagem do terreno na elevação do
          pórtico. */}
      <pattern id={`${id}-hatch`} width="5" height="5" patternUnits="userSpaceOnUse">
        <line x1="0" y1="5" x2="5" y2="0" className="stroke-faint" strokeWidth="0.6" />
      </pattern>
    </defs>
  )
}

type BoxProps = {
  x: number
  y: number
  w: number
  h?: number
  /** Linha principal da caixa. */
  label: string
  /** Segunda linha, menor — número, unidade, tecnologia. */
  note?: string
  /**
   * A ÚNICA caixa em destaque de cada diagrama é a decisão que sustenta o
   * sistema. Uma só, nunca duas: a paleta do site é monocromática com um
   * único dado colorido, e dois destaques num desenho de oito caixas não
   * destacam mais nada.
   */
  accent?: boolean
}

export function Box({ x, y, w, h = UNIT.box, label, note, accent = false }: BoxProps) {
  const cx = x + w / 2
  // Com nota, as duas linhas se afastam do centro; sem nota, o rótulo fica
  // exatamente no meio da caixa.
  const labelY = note ? y + h / 2 - 3.4 : y + h / 2
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        pathLength={1}
        className={`traca ${accent ? 'fill-surface-2 stroke-data' : 'fill-surface stroke-border'}`}
        strokeWidth={accent ? 1.4 : 1}
      />
      <text
        x={cx}
        y={labelY}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={UNIT.label}
        letterSpacing="0.06em"
        className={`preenche font-mono ${accent ? 'fill-data' : 'fill-text'}`}
      >
        {label}
      </text>
      {note ? (
        <text
          x={cx}
          y={y + h / 2 + 6.6}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={UNIT.note}
          letterSpacing="0.06em"
          className="preenche font-mono fill-muted"
        >
          {note}
        </text>
      ) : null}
    </g>
  )
}

/** Conector reto com ponta. `accent` para o caminho que a caixa em destaque
 *  governa — nunca para outro. */
export function Arrow({
  id,
  x1,
  y1,
  x2,
  y2,
  accent = false,
  dashed = false,
}: {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  accent?: boolean
  dashed?: boolean
}) {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      // O conector TRACEJADO fica de fora do traçado, e não é descuido: ele já
      // usa `stroke-dasharray` para significar "assíncrono". Sobrescrever isso
      // com o dasharray do desenho apagaria a distinção entre os dois tipos de
      // conector — o efeito comeria o significado. Ele entra preenchendo.
      {...(dashed ? { className: `preenche ${accent ? 'stroke-data' : 'stroke-faint'}` } : { pathLength: 1, className: `traca ${accent ? 'stroke-data' : 'stroke-faint'}` })}
      strokeWidth={accent ? 1.1 : 0.9}
      strokeDasharray={dashed ? '3 2.5' : undefined}
      markerEnd={`url(#${id}-arrow${accent ? '-data' : ''})`}
    />
  )
}

/** Conector em cotovelo: desce, anda na horizontal, e entra na caixa alvo.
 *  É o que evita linha diagonal cruzando caixa nos desenhos de convergência. */
export function Elbow({
  id,
  from,
  to,
  midY,
  accent = false,
}: {
  id: string
  from: { x: number; y: number }
  to: { x: number; y: number }
  midY: number
  accent?: boolean
}) {
  return (
    <path
      d={`M${from.x} ${from.y} V${midY} H${to.x} V${to.y}`}
      fill="none"
      pathLength={1}
      className={`traca ${accent ? 'stroke-data' : 'stroke-faint'}`}
      strokeWidth={accent ? 1.1 : 0.9}
      markerEnd={`url(#${id}-arrow${accent ? '-data' : ''})`}
    />
  )
}

/** Rótulo solto — título de faixa, anotação de fronteira. */
export function Tag({
  x,
  y,
  children,
  anchor = 'start',
  accent = false,
}: {
  x: number
  y: number
  children: string
  anchor?: 'start' | 'middle' | 'end'
  accent?: boolean
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fontSize={UNIT.note}
      letterSpacing="0.14em"
      className={`preenche font-mono uppercase ${accent ? 'fill-data' : 'fill-muted'}`}
    >
      {children}
    </text>
  )
}

/**
 * Invólucro comum. O `overflow-x-auto` com largura mínima é o que salva o
 * desenho no celular: sem ele o SVG encolhe junto com a tela e os rótulos de
 * 8px viram 3px ilegíveis. Assim ele mantém tamanho legível e o dedo arrasta
 * na horizontal — o padrão para conteúdo largo.
 *
 * `aria-hidden` de propósito: o parágrafo da arquitetura, logo abaixo, é a
 * descrição textual completa do que o desenho mostra. Anunciar as duas coisas
 * faria um leitor de tela ouvir a mesma arquitetura duas vezes, a segunda em
 * pedaços soltos e fora de ordem. O texto dentro do SVG continua sendo texto
 * de verdade no HTML, então crawler de IA lê normalmente.
 */
export function DiagramFrame({ viewBox, children }: { viewBox: string; children: React.ReactNode }) {
  // Sem legenda. Havia uma — "Em destaque, a decisão que sustenta o resto" —
  // e ela explicava a própria convenção visual do desenho. Quem repara no
  // ciano repara sozinho; anunciar o recurso é ensinar o leitor a ler uma
  // imagem que ele já sabe ler.
  return (
    <div className="mt-2 mb-10 overflow-x-auto border border-border bg-bg">
      <svg
        aria-hidden="true"
        viewBox={viewBox}
        // `arte-viva` declara a timeline de rolagem, e ela precisa morar AQUI:
        // forma dentro de um SVG não tem caixa CSS, então uma timeline anônima
        // não teria de onde medir. O `<svg>` é elemento substituído, tem caixa,
        // e os filhos consomem o nome. Mesma descoberta de components/landing/
        // arte.tsx, testada antes de virar código.
        className="arte-viva h-auto w-full min-w-[680px]"
        preserveAspectRatio="xMidYMid meet"
        fill="none"
      >
        {children}
      </svg>
    </div>
  )
}
