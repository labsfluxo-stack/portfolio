import { arquivoPublico } from '@/lib/seo'

/**
 * A figura de um artigo — e, enquanto a imagem não existe, o LUGAR reservado
 * para ela.
 *
 * O `src` é OPCIONAL de propósito. Um artigo pode nascer com os pontos de
 * imagem já decididos (que é onde eles ficam melhores: escolhidos junto com o
 * texto, não encaixados depois) e a imagem entrar semanas mais tarde. Sem o
 * `src`, o componente rende a marcação do lugar; com ele, rende a figura.
 *
 * O LUGAR RESERVADO NÃO VAI AO AR. Em produção, uma figura sem `src` rende
 * `null` — nada, nem caixa tracejada, nem "imagem aqui". A razão é comercial,
 * não estética: este blog é peça de venda, e artigo publicado com moldura vazia
 * lê como obra inacabada para exatamente a pessoa que se quer convencer.
 *
 * Em desenvolvimento (`npm run dev`) ele aparece como uma moldura tracejada com
 * a descrição do que deve entrar ali. É onde o autor precisa vê-lo.
 *
 * Se um dia a preferência mudar — mostrar a moldura no ar para forçar a mão —,
 * é uma linha: apagar a checagem de `NODE_ENV` abaixo.
 */
export function Figura({
  src,
  alt,
  legenda,
  sugestao,
  largura,
  altura,
}: {
  /** Caminho a partir da raiz pública, ex.: `/blog/robots-txt.png`. */
  src?: string
  /**
   * OBRIGATÓRIO mesmo quando a imagem ainda não existe. Escrever o alt junto
   * com o texto é o que garante que ele descreva o PAPEL da imagem no
   * argumento; escrito depois, na pressa de publicar, vira "captura de tela".
   */
  alt: string
  /** Texto sob a imagem, visível. Opcional: nem toda figura precisa explicar-se. */
  legenda?: string
  /** O que a imagem deve mostrar. Aparece só na moldura de desenvolvimento. */
  sugestao?: string
  largura?: number
  altura?: number
}) {
  if (!src) {
    if (process.env.NODE_ENV === 'production') return null
    return (
      <div
        aria-hidden="true"
        className="mt-8 flex flex-col gap-2 rounded-lg border border-dashed border-rule p-6 text-[14px] leading-relaxed text-ink-2"
      >
        <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-accent">
          lugar de imagem
        </span>
        <span>{sugestao ?? alt}</span>
      </div>
    )
  }

  return (
    <figure className="mt-8">
      {/* `<img>` cru, e não `next/image`: o projeto exporta estático com
        * `images: { unoptimized: true }`, então o componente do Next não
        * otimizaria nada aqui — só acrescentaria JavaScript a uma página cujo
        * argumento é chegar pronta do servidor.
        *
        * `loading="lazy"` e as dimensões declaradas evitam o salto de layout
        * quando a imagem carrega: sem `width`/`height` o navegador não sabe
        * quanto espaço reservar, e o texto que o leitor está lendo pula. */}
      <img
        src={arquivoPublico(src)}
        alt={alt}
        width={largura}
        height={altura}
        loading="lazy"
        decoding="async"
        className="w-full rounded-lg border border-rule"
      />
      {legenda && (
        <figcaption className="mt-3 text-[15px] leading-relaxed text-ink-2">{legenda}</figcaption>
      )}
    </figure>
  )
}
