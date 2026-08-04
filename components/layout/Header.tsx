'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Dictionary, Locale } from '@/content'
import { LocaleSwitch } from './LocaleSwitch'

export function Header({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const pathname = usePathname()

  const links: { href: string; label: string }[] = [
    { href: `/${locale}#sobre`, label: dict.nav.about },
    { href: `/${locale}#sistemas`, label: dict.nav.systems },
    { href: `/${locale}#stack`, label: dict.nav.stack },
    { href: `/${locale}#terminal`, label: dict.nav.terminal },
    { href: `/${locale}#contato`, label: dict.nav.contact },
  ]

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <Link href={`/${locale}`} className="font-mono text-sm uppercase tracking-widest text-text">
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
          <Link
            href={`/${locale}/cv`}
            className="border border-border px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-text hover:bg-surface"
          >
            {dict.nav.cv}
          </Link>
        </div>
      </div>
    </header>
  )
}
