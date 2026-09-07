import type { Metadata } from 'next'
import { getDictionary, type Locale } from '@/content'
import { PredioFallback } from '@/components/predio/PredioFallback'

// Rota de PRÉVIA, não publicada — existe só para abrir o prédio inteiro em
// `/pt/predio/` e `/en/predio/` enquanto ele ainda não tem cena 3D nem lugar
// na home de verdade. `noindex`/`nofollow` porque não é conteúdo do site: é
// obra em andamento ficando visível para quem está construindo, do mesmo
// jeito que `cv/page.tsx` e `og/[slug]/page.tsx` já fazem para as próprias
// rotas de artefato — mesmo padrão de `generateMetadata` sem `buildMetadata`
// (que existe para anunciar uma rota indexável, o oposto do que se quer
// aqui). Sem `generateStaticParams` própria: herda a de
// `app/[locale]/layout.tsx`, que já limita `locale` a pt/en — igual
// `cv/page.tsx`.
//
// Vive fora do route group `(site)` de propósito: esta rota não é a home
// nem um case study, então Header/Footer/textura de fundo não fazem sentido
// aqui — o prédio é o documento inteiro.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
  const { locale } = await params
  const dict = getDictionary(locale)
  // `dict.predioMeta.title`, nunca um literal — achado de revisão: o título
  // anterior grudava a palavra portuguesa "prédio" no <title> de /en/predio/
  // também. Mesma composição de cv/page.tsx (rótulo do dicionário — aqui,
  // `predioMeta.title` — travessão — nome).
  return { title: `${dict.predioMeta.title} — ${dict.hero.name}`, robots: { index: false, follow: false } }
}

export default async function PredioPreviewPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  const dict = getDictionary(locale)

  // Renderiza o fallback direto, e não `PredioSlot` — porque `PredioSlot`
  // ainda não existe (é uma task futura deste mesmo plano). Quando existir,
  // esta rota passa a renderizá-lo aqui no lugar do fallback; é uma troca de
  // componente, não uma decisão de manter o fallback nesta rota para sempre.
  return <PredioFallback dict={dict} locale={locale} />
}
