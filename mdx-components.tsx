import Link from 'next/link'
import type { MDXComponents } from 'mdx/types'
import { Figura } from '@/components/blog/Figura'
import { idDoTitulo } from '@/lib/leitura'

/**
 * A TIPOGRAFIA DO ARTIGO, e ela é o produto — não decoração dele.
 *
 * Nada aqui usa plugin de prosa pronto. O projeto não tem Tailwind Typography e
 * não vai ter: o `prose` genérico traz uma escala inteira de decisões que não
 * são as deste site (cor de link própria, `max-width` própria, tratamento de
 * código próprio) e a maior parte do trabalho vira desativar o que ele fez.
 *
 * A MEDIDA NÃO ESTÁ AQUI. Os 66 caracteres por linha — o ponto ótimo da
 * pesquisa de legibilidade, dentro da faixa de 50 a 75 — são do contêiner do
 * artigo, em `app/[locale]/blog/[slug]/page.tsx`. Colocá-la em cada elemento
 * faria bloco de código e tabela herdarem uma largura que não serve a eles.
 *
 * Todo token é da paleta CLARA (`ink`, `ink-2`, `rule`, `accent`, `paper`), que
 * é o que permite o tema escuro inverter a árvore inteira redefinindo cinco
 * variáveis — ver o bloco de tema em `app/globals.css`. Nenhum hex literal.
 */

/** O texto de um nó de título, para virar âncora. */
function textoDe(no: React.ReactNode): string {
  if (typeof no === 'string' || typeof no === 'number') return String(no)
  if (Array.isArray(no)) return no.map(textoDe).join('')
  if (no && typeof no === 'object' && 'props' in no) {
    return textoDe((no as { props: { children?: React.ReactNode } }).props.children)
  }
  return ''
}

/**
 * Título com âncora clicável.
 *
 * O id vem de `idDoTitulo`, a MESMA função que `titulosDoPost` usa para montar
 * o índice lateral. Duas implementações "equivalentes" divergiriam no primeiro
 * título com acento — que em português é quase todo título — e o índice
 * apontaria para âncoras inexistentes sem quebrar nada visível.
 *
 * `scroll-mt-24` existe porque o fio de progresso é fixo no topo: sem a margem
 * de rolagem, clicar numa âncora deixa o título encostado na borda superior, e
 * a primeira linha lida fica sendo a segunda.
 */
function titulo(nivel: 2 | 3) {
  const Tag = nivel === 2 ? 'h2' : 'h3'
  const classe =
    nivel === 2
      ? 'mt-14 scroll-mt-24 font-sans text-[26px] font-bold leading-tight tracking-tight text-ink sm:text-3xl'
      : 'mt-10 scroll-mt-24 font-sans text-xl font-semibold leading-snug text-ink'

  return function Titulo({ children }: { children?: React.ReactNode }) {
    const id = idDoTitulo(textoDe(children))
    return (
      <Tag id={id} className={classe}>
        {/* O link envolve o título inteiro em vez de pendurar um `#` ao lado.
          * O alvo fica do tamanho da linha, o texto acessível descreve o
          * destino, e não sobra um caractere solto na margem — que é sempre a
          * primeira coisa a parecer errada numa captura de tela. */}
        <a href={`#${id}`} className="no-underline hover:underline decoration-rule underline-offset-8">
          {children}
        </a>
      </Tag>
    )
  }
}

export function useMDXComponents(componentes: MDXComponents): MDXComponents {
  return {
    // ENTREGUE AQUI, e não importado em cada artigo. Um `import` no topo de um
    // `.mdx` funciona, mas transforma o arquivo de texto em arquivo de código
    // logo na primeira linha — e quem escreve artigo não deveria precisar
    // lembrar de importar nada para pôr uma imagem.
    Figura,
    h2: titulo(2),
    h3: titulo(3),
    p: ({ children }) => (
      // `leading-[1.65]` — a pesquisa põe a entrelinha confortável entre 1,2 e
      // 1,5 para texto de interface; prosa longa pede o topo dessa faixa e um
      // pouco mais. 19px é o corpo do site inteiro.
      <p className="mt-5 text-[19px] leading-[1.65] text-ink-2">{children}</p>
    ),
    /**
     * LINK INTERNO PASSA PELO `<Link>` DO NEXT, e isso é correção de um defeito
     * que só aparece em produção.
     *
     * Um `[texto](/pt/blog/outro-artigo)` no MDX virava `<a href="/pt/blog/...">`
     * cru. O site é publicado sob `basePath: '/portfolio'` (GitHub Pages), e um
     * `<a>` cru NÃO recebe esse prefixo — nem o barra final que
     * `trailingSlash: true` exige. Resultado: link entre artigos apontando para
     * 404, sem nenhum aviso em build, nos testes ou no `npm run dev`, onde o
     * basePath se comporta diferente.
     *
     * O `<Link>` resolve as duas coisas sozinho. `prefetch={false}` pelo mesmo
     * motivo do resto do projeto: sem isso o Next baixa o payload da outra rota
     * assim que o link entra em viewport, e ninguém pediu.
     */
    a: ({ href, children }) => {
      const classe =
        'text-accent underline decoration-accent/40 underline-offset-4 transition-colors hover:decoration-accent'

      if (typeof href === 'string' && href.startsWith('/')) {
        return (
          <Link prefetch={false} href={href} className={classe}>
            {children}
          </Link>
        )
      }

      return (
        <a
          href={href}
          // Âncora dentro da própria página (`#secao`) não abre em aba nova:
          // só o que sai do site é que abre.
          {...(typeof href === 'string' && href.startsWith('http')
            ? { target: '_blank', rel: 'noreferrer' }
            : {})}
          className={classe}
        >
          {children}
        </a>
      )
    },
    // O negrito é do TEXTO, não do parágrafo: sobe para `text-ink`, que é o
    // nível de tinta acima do corpo. É assim que ele destaca sem gritar.
    strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
    ul: ({ children }) => <ul className="mt-5 flex flex-col gap-2.5">{children}</ul>,
    ol: ({ children }) => (
      <ol className="mt-5 flex list-decimal flex-col gap-2.5 pl-5 marker:text-ink-2">{children}</ol>
    ),
    li: ({ children }) => (
      <li className="text-[19px] leading-[1.65] text-ink-2 marker:text-accent">{children}</li>
    ),
    code: ({ children }) => (
      <code className="rounded bg-ink/[0.06] px-1.5 py-0.5 font-mono text-[0.87em] text-ink">
        {children}
      </code>
    ),
    pre: ({ children }) => (
      // `overflow-x-auto` no PRÓPRIO bloco, e não no artigo: linha de código
      // longa precisa rolar dentro da própria caixa. Rolagem horizontal no
      // documento é o defeito que o e2e da landing proíbe, e um bloco de
      // código é a forma mais comum de causá-lo.
      <pre className="mt-6 overflow-x-auto rounded-lg border border-rule bg-ink/[0.04] p-4 font-mono text-[14px] leading-relaxed text-ink">
        {children}
      </pre>
    ),
    blockquote: ({ children }) => (
      <blockquote className="mt-6 border-l-2 border-accent pl-5 text-[19px] leading-[1.65] text-ink">
        {children}
      </blockquote>
    ),
    hr: () => <hr className="mt-12 border-rule" />,
    ...componentes,
  }
}
