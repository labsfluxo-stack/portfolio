'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Dictionary, Locale } from '@/content'
import { LocaleSwitch } from './LocaleSwitch'

export function Header({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const pathname = usePathname()

  // Mesmo `NEXT_PUBLIC_BASE_PATH` (default `/portfolio`) que PhotoFrame.tsx
  // já usa para prefixar `src` fora do `<Link>` do Next. Necessário aqui
  // porque estes são links de âncora para a MESMA página (rolagem nativa do
  // navegador, sem transição de rota) — de propósito `<a>` cru, não
  // `<Link>`: um `<Link>` do Next dispara transição client-side, cuja
  // rolagem até o hash não é síncrona com o clique (corrida observada nos
  // testes), enquanto a rolagem nativa do navegador para uma âncora na
  // mesma página é instantânea e respeita `scroll-margin-top` sem JS. A
  // barra final antes do `#` é obrigatória com `trailingSlash: true`
  // (next.config.ts): sem ela, o caminho resolvido é `/${locale}` (sem
  // barra), que o export estático nunca gera — 404 real, tanto no servidor
  // de E2E quanto no GitHub Pages publicado.
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '/portfolio'
  const links: { href: string; label: string }[] = [
    { href: `${basePath}/${locale}/#sobre`, label: dict.nav.about },
    { href: `${basePath}/${locale}/#sistemas`, label: dict.nav.systems },
    { href: `${basePath}/${locale}/#stack`, label: dict.nav.stack },
    { href: `${basePath}/${locale}/#terminal`, label: dict.nav.terminal },
    { href: `${basePath}/${locale}/#contato`, label: dict.nav.contact },
  ]

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <Link prefetch={false} href={`/${locale}`} className="font-mono text-sm uppercase tracking-widest text-text">
          {dict.hero.name}
        </Link>
        <nav
          aria-label={dict.a11y.mainNav}
          className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-widest text-muted"
        >
          {links.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-text">
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <LocaleSwitch locale={locale} pathname={pathname} label={dict.a11y.localeSwitch} />
          {/* Nunca `/${locale}/cv` (spec §5.2): essa rota é artefato de build
           * — vive fora do route group `(site)`, sem Header/Footer/seletor de
           * idioma nem link de volta — e não recebe link de navegação. O
           * download vai direto no PDF, a mesma expressão que
           * components/sections/Contact.tsx já usa para o mesmo link. */}
          <a
            href={`${basePath}/cv/neto-alves-${locale}.pdf`}
            download
            className="border border-border px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-text hover:bg-surface"
          >
            {dict.nav.cv}
          </a>
        </div>
      </div>
    </header>
  )
}
