/**
 * Datas de artigo, formatadas em português.
 *
 * `Intl` COM UTC EXPLÍCITO, e o `T00:00:00Z` não é enfeite. Uma string
 * `'2026-09-05'` passada ao `Date` é interpretada como meia-noite UTC; formatá-la
 * no fuso de quem roda o build (UTC−3, aqui) devolve o DIA ANTERIOR. O artigo
 * publicado no dia 5 apareceria como 4 na página e como 5 no `<time datetime>` —
 * duas datas para o mesmo fato, e a errada é a que o leitor vê.
 *
 * Por isso o `timeZone: 'UTC'` no formatador também: sem ele, a conversão de
 * volta desfaz o cuidado do parse.
 */
const LONGA = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

/** `2026-09-05` → `5 de setembro de 2026`. */
export function dataLonga(iso: string): string {
  return LONGA.format(new Date(`${iso}T00:00:00Z`))
}

/** `2026-09-05` → `Fri, 05 Sep 2026 00:00:00 GMT`, o formato que o RSS exige. */
export function dataRfc822(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toUTCString()
}
