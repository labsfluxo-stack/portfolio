/**
 * Arte do catálogo, em SVG e não em imagem gerada — pelas mesmas quatro razões
 * documentadas em `components/landing/arte.tsx`: traço de 1px, cor de token
 * exata, nitidez em qualquer densidade, e poucos KB.
 *
 * Cada peça é geometria fechada e abertamente abstrata, com UM destaque em
 * cor. `currentColor` no traço deixa a cor vir da classe do pai, e o destaque
 * usa `--color-data`, o mesmo acento do resto da rota.
 *
 * Tudo aqui leva `aria-hidden`: o argumento vive no texto ao lado, que é o que
 * o crawler lê.
 */

const TRACO = 'stroke-current fill-none [stroke-width:1]'
const DESTAQUE = 'fill-data stroke-none'

export type VarianteArte = 'jogos' | 'captura' | 'operacao' | 'dados'

/** Uma grade de alvos, com um deles aceso — a mecânica da própria dobra. */
function Jogos() {
  return (
    <>
      {[12, 36, 60].map((x) =>
        [12, 36].map((y) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="7" className={TRACO} />
        )),
      )}
      <circle cx="36" cy="36" r="4" className={DESTAQUE} />
    </>
  )
}

/** Moldura de foto com o obturador aceso. */
function Captura() {
  return (
    <>
      <rect x="6" y="10" width="60" height="38" rx="3" className={TRACO} />
      <circle cx="36" cy="29" r="11" className={TRACO} />
      <circle cx="36" cy="29" r="4" className={DESTAQUE} />
      <rect x="50" y="16" width="8" height="4" className={DESTAQUE} />
    </>
  )
}

/** Totem de pé ao lado do telão — os dois itens do bloco, na mesma peça. */
function Operacao() {
  return (
    <>
      <rect x="6" y="8" width="18" height="42" rx="2" className={TRACO} />
      <rect x="10" y="13" width="10" height="14" className={DESTAQUE} />
      <rect x="32" y="12" width="34" height="24" rx="2" className={TRACO} />
      <path d="M49 36v8M41 50h16" className={TRACO} />
    </>
  )
}

/** Registros saindo de uma base para um destino único. */
function Dados() {
  return (
    <>
      {[14, 24, 34].map((y) => (
        <rect key={y} x="6" y={y} width="26" height="6" className={TRACO} />
      ))}
      <path d="M34 27h18" className={TRACO} />
      <circle cx="58" cy="27" r="7" className={TRACO} />
      <circle cx="58" cy="27" r="3" className={DESTAQUE} />
    </>
  )
}

const PECAS: Record<VarianteArte, () => React.JSX.Element> = {
  jogos: Jogos,
  captura: Captura,
  operacao: Operacao,
  dados: Dados,
}

export function ArteAtivacao({ variante }: { variante: VarianteArte }) {
  const Peca = PECAS[variante]
  return (
    <svg viewBox="0 0 72 58" aria-hidden="true" className="w-full text-faint">
      <Peca />
    </svg>
  )
}
