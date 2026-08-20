import type { Dictionary } from '@/content/types'
import { ArteOferta } from './arte'

/**
 * Uma arte por cartão, na ordem do dicionário. Fica FORA do `map`, mas isto
 * NÃO trava a quantidade (correção da revisão final de branch: a versão
 * anterior deste comentário afirmava que o `tsc` reclamaria de um quarto
 * cartão — a mesma afirmação falsa que existia em `Catalogo.tsx` até a
 * revisão final corrigir o mesmo engano lá). `dict.landing.oferta.cartoes` é
 * array sem tamanho fixo em `content/types.ts`, então `ARTES[i]` é sempre
 * `'site' | 'blog' | 'sistema' | undefined` — daí o `?? 'site'` abaixo.
 * Indexar um array sem tamanho fixo não é algo que `tsc` recuse em tempo de
 * build: um quarto cartão no dicionário passa no `typecheck` limpo e
 * renderiza calado com a arte errada.
 *
 * Quem pega isso é o teste, não o tipo: `tests/content.test.ts` ("a oferta
 * tem exatamente três cartões") trava `dict.landing.oferta.cartoes` em
 * exatamente 3, nos dois idiomas — essa é a proteção de verdade.
 */
const ARTES = ['site', 'blog', 'sistema'] as const

/**
 * Três cartões, e o que os costura é o padrão de construção, não o artefato —
 * sem essa costura a página vira "faço de tudo", que é o posicionamento mais
 * fraco possível.
 *
 * Cada cartão traduz a prova técnica em consequência de negócio. O dono lê a
 * consequência; o termo técnico, quando aparece, vem depois e explica. Um dono
 * de empresa não processa "Core Web Vitals" pela rota que avalia argumento —
 * ele degrada a sinal periférico, e desperdiça o único ativo de prova que a
 * página tem.
 *
 * Borda de 1px em vez de sombra: é o que lê como premium técnico em 2026.
 */
export function Oferta({ dict }: { dict: Dictionary }) {
  const { oferta } = dict.landing

  return (
    <section className="border-t border-rule">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-20 sm:py-28">
        <h2 className="revelar-titulo font-sans text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          {oferta.titulo}
        </h2>
        <ul className="revelar grid gap-px overflow-hidden rounded-lg border border-rule bg-rule sm:grid-cols-3">
          {oferta.cartoes.map((cartao, i) => (
            <li key={cartao.nome} className="flex flex-col gap-3 bg-paper p-6">
              {/* A arte vem antes do rótulo: no celular os cartões empilham, e
               *  três blocos de texto seguidos sem nenhuma pausa visual são
               *  exatamente a parede que a página precisa quebrar. `w-24` a
               *  mantém pequena — é pontuação, não ilustração. */}
              <div className="w-24">
                <ArteOferta variante={ARTES[i] ?? 'site'} />
              </div>
              <h3 className="font-mono text-xs uppercase tracking-[0.15em] text-accent">
                {cartao.nome}
              </h3>
              <p className="text-[17px] leading-relaxed text-ink-2">{cartao.corpo}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
