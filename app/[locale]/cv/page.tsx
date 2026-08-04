import type { Metadata } from 'next'
import { getDictionary, type Locale } from '@/content'

// Esqueleto mínimo: o layout de impressão completo (fundo branco, tipografia
// preta, geração do PDF via Playwright) é a Task 15. Esta rota existe agora
// só porque `/pt/cv` e `/en/cv` precisam existir e levar `noindex` para o
// portão de GEO (Task 14) verificar — ver "Estado real" do brief da Task 14.
// Vive fora do route group `(site)`, sem Header/Footer, pelo mesmo motivo de
// `app/[locale]/og/[slug]/page.tsx`: a Task 15 vai estilizar isto para
// impressão, sem cromo de navegação.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
  const { locale } = await params
  const dict = getDictionary(locale)
  return { title: `${dict.nav.cv} — ${dict.hero.name}`, robots: { index: false, follow: false } }
}

export default async function CvPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  const dict = getDictionary(locale)
  const { hero } = dict

  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-text">
      <h1 className="font-sans text-3xl font-bold">{hero.name}</h1>
      <p className="mt-2 font-mono text-sm uppercase tracking-widest text-muted">{hero.role}</p>
      <p className="mt-6 max-w-2xl text-muted">{hero.tagline}</p>
    </main>
  )
}
