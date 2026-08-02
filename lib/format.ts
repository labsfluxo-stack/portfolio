import type { Locale } from '@/content/types'

const FORMATTERS: Record<Locale, Intl.NumberFormat> = {
  pt: new Intl.NumberFormat('pt-BR'),
  en: new Intl.NumberFormat('en-US'),
}

/**
 * Formata um número com o separador de milhar do locale ativo — ponto em
 * pt-BR, vírgula em en-US. Existe porque `Counter` formatava sempre em
 * pt-BR, então um número animado no site em inglês saía com separador
 * errado mesmo com o dicionário EN correto por trás.
 */
export function formatNumber(value: number, locale: Locale): string {
  return FORMATTERS[locale].format(value)
}
