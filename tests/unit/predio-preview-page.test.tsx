import { describe, expect, it } from 'vitest'
import { generateMetadata } from '@/app/[locale]/predio/page'

/**
 * A rota de prévia (`/predio`) é `noindex` de propósito — não é conteúdo do
 * site —, mas o `<title>` que ela emite ainda precisa ser bilíngue: vem do
 * dicionário, nunca de um literal escrito na página (achado de revisão:
 * `${dict.hero.name} — prédio` grudava a palavra portuguesa "prédio" no
 * `<title>` de `/en/predio/` também).
 */
describe('metadata da rota de prévia do prédio', () => {
  it('pt: título vem do dicionário e a rota continua noindex', async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale: 'pt' }) })
    expect(metadata.title).toBe('Prédio — Neto Alves')
    expect(metadata.robots).toEqual({ index: false, follow: false })
  })

  it('en: título vem do dicionário em inglês, sem palavra em português', async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale: 'en' }) })
    expect(metadata.title).toBe('Building — Neto Alves')
    expect(metadata.title).not.toMatch(/prédio/i)
    expect(metadata.robots).toEqual({ index: false, follow: false })
  })
})
