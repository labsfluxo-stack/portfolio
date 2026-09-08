import type { Metadata } from 'next'
import { getDictionary, type Locale } from '@/content'
import { PredioSlot } from '@/components/predio/PredioSlot'

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

  // `PredioSlot`, não `PredioFallback` direto (Task 7): é o slot quem decide
  // entre a cena 3D e o fallback em HTML — o fallback continua sendo o que
  // esta rota mostra em qualquer navegador sem WebGL, com movimento reduzido
  // ligado, ou antes do JS hidratar; a troca só acontece depois que um efeito
  // no cliente confirma as duas condições. Ver o comentário de
  // components/predio/PredioSlot.tsx para a decisão completa.
  return <PredioSlot dict={dict} locale={locale} />
}
