import Link from 'next/link'
import { locales, type Locale } from '@/content'

export function LocaleSwitch({
  locale,
  pathname,
  label,
}: {
  locale: Locale
  pathname: string
  label: string
}) {
  return (
    <nav aria-label={label} className="flex items-center gap-1 font-mono text-[11px] uppercase">
      {locales.map((l) => {
        const isCurrent = l === locale
        const href = pathname.replace(new RegExp(`^/${locale}`), `/${l}`)
        return isCurrent ? (
          <span key={l} aria-current="true" className="px-2 py-1 text-text">
            {l.toUpperCase()}
          </span>
        ) : (
          <Link prefetch={false} key={l} href={href} className="px-2 py-1 text-muted hover:text-text">
            {l.toUpperCase()}
          </Link>
        )
      })}
    </nav>
  )
}
