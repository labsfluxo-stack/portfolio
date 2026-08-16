import { expect, test } from '@playwright/test'

/**
 * VERIFICAÇÃO DESCARTÁVEL, e ela decide um caminho de implementação.
 *
 * `pathLength="1"` normaliza o comprimento declarado de uma forma para 1, então
 * `stroke-dasharray: 1` a cobre inteira sem ninguém medir geometria — que é
 * exatamente o que `svg.createDrawable` do anime.js faz em runtime, aqui feito
 * em tempo de escrita e sem biblioteca.
 *
 * Em `<path>` o atributo é universal. Em `<rect>` e `<line>` ele é adição do
 * SVG 2 e o suporte não é idêntico entre motores. Se algum discordar,
 * `pathLength` fica só nos paths e as outras formas voltam ao perímetro
 * calculado — `2 × (largura + altura)` — que é o que `components/landing/
 * arte.tsx` já faz.
 *
 * A SONDA ÓBVIA NÃO SERVE: `getTotalLength()` devolve o comprimento GEOMÉTRICO
 * mesmo onde `pathLength` é honrado (medido: 280 para um retângulo 80×60 nos
 * três motores). O atributo reescala as unidades de `stroke-dasharray`, não o
 * que aquela API reporta.
 *
 * O que decide é a tinta. Com `pathLength="1"`:
 *   - `stroke-dashoffset: 1` → o traço inteiro sai de cena, nada é desenhado
 *   - `stroke-dashoffset: 0` → a forma aparece cheia
 * Se o motor IGNORA o atributo, `stroke-dasharray: 1` numa forma de 280
 * unidades vira um tracejado finíssimo e os dois estados ficam parecidos.
 * Comparar os dois no MESMO motor elimina a diferença de codificador de PNG.
 */
function pagina(offset: number): string {
  return `
<!doctype html><meta charset="utf-8">
<style>
  body { margin: 0; background: #fff; }
  svg { display: block; }
  .prova {
    stroke: #000; stroke-width: 4; fill: none;
    stroke-dasharray: 1; stroke-dashoffset: ${offset};
  }
</style>
<svg id="alvo" width="200" height="200" viewBox="0 0 200 200">
  <rect class="prova" pathLength="1" x="10" y="10" width="80" height="60"/>
  <line class="prova" pathLength="1" x1="10" y1="100" x2="150" y2="100"/>
  <path class="prova" pathLength="1" d="M10 130 C 60 190, 120 110, 180 170"/>
</svg>`
}

test('pathLength=1 esconde e revela rect, line e path neste motor', async ({
  page,
  browserName,
}) => {
  await page.setContent(pagina(1))
  const escondido = (await page.locator('#alvo').screenshot()).length

  await page.setContent(pagina(0))
  const visivel = (await page.locator('#alvo').screenshot()).length

  const razao = visivel / escondido
  console.log(
    `\n── ${browserName} ──`,
    JSON.stringify({ bytesEscondido: escondido, bytesVisivel: visivel, razao }, null, 2),
  )

  // Se o atributo é honrado, o estado escondido é uma área branca lisa e o
  // visível carrega três traços — a diferença de tamanho do PNG é grande. Se é
  // ignorado, os dois são tracejados quase idênticos e a razão fica perto de 1.
  expect(
    razao,
    `neste motor \`pathLength\` parece IGNORADO: escondido e visível têm ` +
      `tamanho parecido (${escondido} vs ${visivel} bytes). ` +
      `Usar o perímetro calculado em rect/line, como arte.tsx faz.`,
  ).toBeGreaterThan(1.5)
})
