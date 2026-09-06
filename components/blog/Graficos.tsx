/**
 * OS GRÁFICOS DOS ARTIGOS, EM SVG NO CÓDIGO — e não imagem gerada.
 *
 * A decisão tem três razões, e a primeira é a que pesa:
 *
 * 1. NÚMERO ERRADO. Modelo de imagem escreve texto por aproximação. Um gráfico
 *    dizendo 47,3% onde o parágrafo diz 47,9% é exatamente a falha contra a
 *    qual este site vende — e ninguém revisa um PNG com régua. Aqui o número é
 *    literal do mesmo lugar que a prosa, e um teste confere os dois.
 * 2. TEMA. O blog inverte claro/escuro no clique do leitor. PNG não inverte:
 *    imagem de fundo escuro vira buraco na página clara. Estes usam
 *    `currentColor` e os tokens, então acompanham a troca.
 * 3. PESO. ~2KB contra ~150KB de uma captura em retina, numa página que
 *    argumenta por velocidade.
 *
 * ACESSIBILIDADE: `role="img"` com `aria-label` que diz os VALORES, não a
 * aparência. Quem usa leitor de tela precisa do dado, não de "gráfico de
 * barras". Os rótulos visíveis ficam `aria-hidden` para não serem lidos duas
 * vezes.
 */

const LARGURA = 640
const TRILHO = 420
const ROTULO = 150

type Barra = { rotulo: string; nota: string; valor: number; destaque?: boolean }

/**
 * Barras horizontais com o valor escrito na ponta. Horizontal e não vertical
 * porque os rótulos são frases curtas ("Wikipédia no ChatGPT") — em barra
 * vertical elas viriam deitadas ou abreviadas, e legenda ilegível é pior que
 * gráfico nenhum.
 */
function Barras({
  dados,
  maximo,
  descricao,
  altura = 22,
  espaco = 16,
}: {
  dados: Barra[]
  maximo: number
  descricao: string
  altura?: number
  espaco?: number
}) {
  // O `- espaco` óbvio no fim está ERRADO aqui, e o erro só aparece na última
  // linha: a nota de cada barra é desenhada ABAIXO dela (em `y + altura + 1`),
  // então cortar o espaçamento final corta justamente essa nota. Medido no
  // navegador — "dez maiores somados" saía pela metade.
  const total = dados.length * (altura + espaco)

  return (
    <svg
      role="img"
      aria-label={descricao}
      viewBox={`0 0 ${LARGURA} ${total}`}
      className="mt-8 w-full"
    >
      {dados.map((d, i) => {
        const y = i * (altura + espaco)
        const w = Math.max(2, (d.valor / maximo) * TRILHO)
        return (
          <g key={d.rotulo} aria-hidden="true">
            <text
              x="0"
              y={y + altura * 0.62}
              className="fill-ink font-mono text-[11px] uppercase tracking-[0.1em]"
            >
              {d.rotulo}
            </text>
            <text x="0" y={y + altura + 1} className="fill-ink-2 font-sans text-[11px]">
              {d.nota}
            </text>
            {/* O trilho: mostra o espaço TOTAL disponível, o que faz a barra
              * curta do Claude ler como "sobra", e não só como "número menor". */}
            <rect
              x={ROTULO}
              y={y}
              width={TRILHO}
              height={altura}
              rx="2"
              className="fill-ink/[0.05] stroke-rule"
              strokeWidth="1"
            />
            <rect
              x={ROTULO}
              y={y}
              width={w}
              height={altura}
              rx="2"
              className={d.destaque ? 'fill-accent' : 'fill-ink/25'}
            />
            <text
              x={ROTULO + w + 8}
              y={y + altura * 0.72}
              className={`font-mono text-[12px] ${d.destaque ? 'fill-accent' : 'fill-ink'}`}
            >
              {d.valor.toLocaleString('pt-BR')}%
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/**
 * Quanto do espaço de citação já pertence à fonte dominante de cada motor.
 *
 * A barra do Claude é o argumento inteiro: ela é curta, e curto aqui significa
 * espaço livre para quem não é marca grande. Por isso é a única no acento.
 */
export function GraficoConcentracao() {
  return (
    <figure className="mt-8">
      <Barras
        maximo={50}
        descricao="Concentração da fonte dominante em cada mecanismo: Wikipédia responde por 47,9% das citações do ChatGPT, Reddit por 46,7% do Perplexity, YouTube por 29,5% do Google AI Overviews, e os dez maiores domínios somados por apenas 9,5% do Claude."
        dados={[
          { rotulo: 'ChatGPT', nota: 'Wikipédia', valor: 47.9 },
          { rotulo: 'Perplexity', nota: 'Reddit', valor: 46.7 },
          { rotulo: 'Google', nota: 'YouTube', valor: 29.5 },
          { rotulo: 'Claude', nota: 'dez maiores somados', valor: 9.5, destaque: true },
        ]}
      />
      <figcaption className="mt-4 text-[15px] leading-relaxed text-ink-2">
        Quanto do espaço já tem dono em cada motor. Quanto menor a barra, mais espaço sobra
        para quem não é marca grande.
      </figcaption>
    </figure>
  )
}

/**
 * As cinco vagas de citação de uma resposta do Google.
 *
 * Literal de propósito: o parágrafo acima dela acabou de fazer a conta (5,2
 * links, 43% da casa), e a imagem existe para o leitor VER o resultado, não
 * para reformular o argumento. Dois blocos com dono, três abertos.
 */
export function GraficoVagas() {
  const vagas = [
    { dono: 'YouTube', ocupada: true },
    { dono: 'Google', ocupada: true },
    { dono: null, ocupada: false },
    { dono: null, ocupada: false },
    { dono: null, ocupada: false },
  ]

  return (
    <figure className="mt-8">
      <svg
        role="img"
        aria-label="As cerca de cinco citações de uma resposta do Google: duas pertencem a propriedades do próprio Google (YouTube e outras), e três ficam disponíveis para o resto da web."
        viewBox="0 0 640 96"
        className="w-full"
      >
        {vagas.map((v, i) => {
          const x = i * 128
          return (
            <g key={i} aria-hidden="true">
              <rect
                x={x}
                y="0"
                width="112"
                height="60"
                rx="4"
                className={v.ocupada ? 'fill-ink/25 stroke-none' : 'fill-none stroke-rule'}
                strokeWidth="1.5"
                strokeDasharray={v.ocupada ? undefined : '5 4'}
              />
              <text
                x={x + 56}
                y="36"
                textAnchor="middle"
                className={`font-mono text-[11px] ${v.ocupada ? 'fill-ink' : 'fill-ink-2'}`}
              >
                {v.dono ?? '—'}
              </text>
              <text
                x={x + 56}
                y="82"
                textAnchor="middle"
                className={`font-mono text-[10px] uppercase tracking-[0.12em] ${
                  v.ocupada ? 'fill-ink-2' : 'fill-accent'
                }`}
              >
                {v.ocupada ? 'com dono' : 'aberta'}
              </text>
            </g>
          )
        })}
      </svg>
      <figcaption className="mt-4 text-[15px] leading-relaxed text-ink-2">
        Média de 5,2 citações por resposta, 43% delas do próprio Google.
      </figcaption>
    </figure>
  )
}

/**
 * O tamanho do canal contra o que ele entrega.
 *
 * As duas barras dividem a MESMA escala de propósito. Normalizar cada uma pelo
 * próprio máximo — que é o que um gerador de gráfico faz por padrão — daria
 * duas barras de tamanho parecido e apagaria a desproporção, que é o dado.
 */
export function GraficoTrafegoCadastro() {
  return (
    <figure className="mt-8">
      <Barras
        maximo={13}
        altura={30}
        espaco={22}
        descricao="As plataformas de IA responderam por 0,5% do tráfego do site da Ahrefs e geraram 12,1% de todos os cadastros."
        dados={[
          { rotulo: 'Tráfego', nota: 'do total de visitas', valor: 0.5 },
          { rotulo: 'Cadastros', nota: 'do total gerado', valor: 12.1, destaque: true },
        ]}
      />
      <figcaption className="mt-4 text-[15px] leading-relaxed text-ink-2">
        Dados da Ahrefs, na mesma escala. A barra de cima é o tamanho do canal; a de baixo, o
        que ele entrega.
      </figcaption>
    </figure>
  )
}
