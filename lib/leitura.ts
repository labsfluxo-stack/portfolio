import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * 200 palavras por minuto, leitura silenciosa de prosa em português. É a faixa
 * central da literatura (180–240); o extremo de cima mede leitura técnica
 * treinada e o de baixo, leitura em voz alta.
 *
 * O número exato importa menos do que parece: o leitor usa isto para decidir
 * "leio agora ou depois", e essa decisão não muda entre 6 e 7 minutos. O que
 * quebraria a confiança é o valor ser inventado ou ficar defasado do texto —
 * daí ele ser CONTADO do arquivo a cada build, nunca escrito no `meta`.
 */
const PALAVRAS_POR_MINUTO = 200

const PASTA = join(process.cwd(), 'content', 'posts')

/**
 * O texto cru do artigo, sem o bloco de metadados e sem a sintaxe de marcação.
 *
 * Aproximação deliberada, e ela basta: uma contagem de palavras não precisa de
 * um parser de MDX. O que precisa é não contar `export const meta = {...}` como
 * prosa — são umas trinta palavras que apareceriam em todo artigo — e não
 * contar URL de link como texto lido, porque o leitor não lê a URL.
 */
export function textoCru(bruto: string): string {
  return bruto
    // O bloco `export const meta = { ... }` do topo, incluindo as quebras.
    .replace(/^export const meta = \{[\s\S]*?\n\}\n/m, '')
    // `[texto](url)` → `texto`. A URL não é lida.
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    // Marcadores de ênfase, título e lista, que não são palavras.
    .replace(/[#*_`>|-]/g, ' ')
}

/** O arquivo do artigo, cru. Único ponto deste módulo que toca o disco. */
function arquivoDoPost(slug: string): string {
  return readFileSync(join(PASTA, `${slug}.mdx`), 'utf8')
}

export function palavrasDe(bruto: string): number {
  return textoCru(bruto).split(/\s+/).filter(Boolean).length
}

export function palavrasDoPost(slug: string): number {
  return palavrasDe(arquivoDoPost(slug))
}

/**
 * Minutos de leitura, arredondados para cima e nunca menores que 1.
 *
 * Para cima porque estimativa de leitura que subestima frustra e a que
 * superestima agrada — o leitor que terminou antes do previsto não reclama.
 */
export function minutosDeLeitura(slug: string): number {
  return Math.max(1, Math.ceil(palavrasDoPost(slug) / PALAVRAS_POR_MINUTO))
}

/**
 * Os `##` e `###` do artigo, na ordem, com o mesmo id que
 * `mdx-components.tsx` carimba nos títulos renderizados.
 *
 * As duas listas PRECISAM concordar, senão o índice aponta para âncoras que não
 * existem — falha silenciosa, que nenhum teste de render pega porque as duas
 * metades funcionam sozinhas. É por isso que ambas chamam `idDoTitulo`, e por
 * isso existe um teste que compara o índice extraído daqui com os ids do HTML
 * gerado.
 *
 * A varredura ignora o que estiver dentro de bloco de código cercado: `# ` no
 * começo de uma linha de shell é comentário, não título.
 */
export function titulosDoPost(slug: string): { nivel: 2 | 3; texto: string; id: string }[] {
  return titulosDe(arquivoDoPost(slug))
}

/**
 * A varredura de verdade, sobre o texto — SEPARADA da leitura do disco de
 * propósito.
 *
 * A primeira versão só existia acoplada ao arquivo, e o teste da cerca de
 * código que eu escrevi para ela era falso: montava uma string local, contava
 * linhas dela e não chamava a implementação nenhuma vez. Teste assim passa para
 * sempre e não protege nada. Com a função pura exposta, o caso da cerca é
 * exercitado de fato.
 */
export function titulosDe(bruto: string): { nivel: 2 | 3; texto: string; id: string }[] {
  const titulos: { nivel: 2 | 3; texto: string; id: string }[] = []
  let dentroDeCodigo = false

  // O texto BRUTO, não o `textoCru`: a varredura precisa enxergar as cercas
  // de código, e `textoCru` justamente apaga os marcadores que as formam.
  for (const linha of bruto.split('\n')) {
    if (linha.trimStart().startsWith('```')) {
      dentroDeCodigo = !dentroDeCodigo
      continue
    }
    if (dentroDeCodigo) continue
    const achado = /^(#{2,3})\s+(.+?)\s*$/.exec(linha)
    if (!achado) continue
    const texto = achado[2]!.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_`]/g, '')
    titulos.push({ nivel: achado[1]!.length as 2 | 3, texto, id: idDoTitulo(texto) })
  }

  return titulos
}

/**
 * O id de âncora de um título, a partir do texto dele.
 *
 * FONTE ÚNICA: `mdx-components.tsx` carimba com esta função e `titulosDoPost`
 * monta o índice com esta função. Duas implementações "equivalentes" divergem
 * no primeiro título com acento, que em português é quase todo título.
 *
 * `NFD` + remoção de diacrítico porque `#instalação` e `#instalacao` não são a
 * mesma âncora, e a segunda é a que sobrevive a ser colada num WhatsApp.
 */
export function idDoTitulo(texto: string): string {
  return texto
    .normalize('NFD')
    // `\p{Diacritic}` e NÃO um intervalo de marcas combinantes. As duas formas
    // fazem o mesmo aqui, mas a versão por intervalo só existe escrita com
    // caracteres invisíveis no editor: ninguém enxerga a diferença numa
    // revisão, e ela some no primeiro arquivo que trocar de codificação. Esta
    // é ASCII puro e diz o que faz.
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
