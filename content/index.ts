import type { Dictionary, Locale } from './types'
import { pt } from './pt'
import { en } from './en'

const dictionaries: Record<Locale, Dictionary> = { pt, en }

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale]
}

export * from './types'
export { systems } from './systems'
