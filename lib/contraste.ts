/**
 * Contraste entre duas cores pela fórmula de luminância relativa da WCAG 2.1.
 *
 * Existe como módulo, e não inline no teste, porque a regra de contraste é
 * decisão de projeto (globals.css documenta os mínimos) e merece uma
 * implementação única que o teste verifica — em vez de uma cópia por arquivo
 * que sai de sincronia.
 */

/** Canal de 0–255 para luminância linear. O joelho em 0.03928 é da própria
 *  especificação: abaixo dele a curva é linear, acima é potência. */
function linearizar(canal: number): number {
  const c = canal / 255
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

function luminancia(hex: string): number {
  const limpo = hex.replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(limpo)) {
    throw new Error(`cor inválida: ${hex} — esperado #RRGGBB`)
  }
  const n = parseInt(limpo, 16)
  return (
    0.2126 * linearizar((n >> 16) & 255) +
    0.7152 * linearizar((n >> 8) & 255) +
    0.0722 * linearizar(n & 255)
  )
}

/** Razão de contraste, sempre >= 1. A ordem dos argumentos não importa. */
export function contraste(a: string, b: string): number {
  const luminancias = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  const claro = luminancias[0]!
  const escuro = luminancias[1]!
  return (claro + 0.05) / (escuro + 0.05)
}
