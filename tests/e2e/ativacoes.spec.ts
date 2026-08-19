import { test, expect, type Page } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { locales } from '../../content/types'

const OUT = join(process.cwd(), 'out')

test('a landing de ativações existe em out/ nos dois idiomas', () => {
  for (const locale of locales) {
    const arquivo = join(OUT, locale, 'ativacoes', 'index.html')
    expect(existsSync(arquivo), `rota não gerada: /${locale}/ativacoes`).toBe(true)
  }
})

// Esta rota NÃO inverte polaridade, ao contrário da /projetos: o escuro é o
// padrão do site. O teste existe para que uma cópia distraída do layout da
// /projetos (que carrega o bloco de inversão) seja pega — inverter aqui
// deixaria a página clara com tokens escuros e ninguém veria em teste unitário.
test('a landing de ativações segue escura, como o resto do site', async ({ page }) => {
  await page.goto('/pt/ativacoes/')
  const corDeFundo = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  expect(corDeFundo).toBe('rgb(8, 9, 12)')

  const esquema = await page.evaluate(
    () => getComputedStyle(document.documentElement).colorScheme,
  )
  expect(esquema).toBe('dark')
})

test('a landing de ativações não leva o cromo de navegação do portfólio', () => {
  const bruto = readFileSync(join(OUT, 'pt', 'ativacoes', 'index.html'), 'utf8')
  expect(bruto).not.toContain('<header')
  expect(bruto).not.toContain('<footer')
})

test('a landing de ativações está no sitemap, nos dois idiomas', () => {
  const sitemap = readFileSync(join(OUT, 'sitemap.xml'), 'utf8')
  for (const locale of locales) {
    expect(sitemap).toContain(`/${locale}/ativacoes/`)
  }
})

// Mesma medição que a /projetos precisou: `BarraCta` é `position: fixed` e não
// ocupa espaço no fluxo, então sem o `pb-20` no PRÓPRIO `<main>` ela cobre o
// último bloco depois de rolar até o fundo. É defeito de celular, e só aparece
// no navegador de verdade.
test('a barra fixa não cobre o último bloco no celular', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/pt/ativacoes/')
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))

  const sobreposto = await page.evaluate(() => {
    // O SELETOR É ESCOPADO A `div.fixed` DE PROPÓSITO, e é a mesma armadilha
    // que a /projetos já pagou: existem TRÊS links de wa.me na página (capa,
    // chamada final e a barra fixa, os três reusando `urlWhatsapp`). Sem o
    // escopo, `querySelector` devolve o primeiro em ordem de documento — o da
    // capa, que não está dentro de nenhum `div.fixed` — e `?.closest(...)`
    // resulta em `undefined`, fazendo o teste "passar" por não achar nada em
    // vez de medir a sobreposição de verdade.
    const barra = document.querySelector('div.fixed a[href*="wa.me"]')?.closest('div.fixed')
    const ultimo = document.querySelector('main > :last-child')
    if (!barra || !ultimo) return null
    const b = barra.getBoundingClientRect()
    const u = ultimo.getBoundingClientRect()
    return u.bottom > b.top
  })
  expect(sobreposto, 'não achou a barra ou o último bloco — o seletor mudou').not.toBeNull()
  expect(sobreposto, 'a barra cobre o fim do conteúdo').toBe(false)
})

// A partida precisa estar rodando antes de qualquer toque: é o modo atrativo,
// e é o que dá movimento à dobra para quem só está lendo.
test('a dobra joga sozinha e o placar sobe sem ninguém tocar', async ({ page }) => {
  await page.goto('/pt/ativacoes/')
  const placar = page.locator('text=/\\d+ acertos/')
  await expect(placar).toBeVisible()
  await expect(placar).not.toHaveText('0 acertos', { timeout: 8000 })
})

/**
 * Varre o canvas atrás de um pixel da cor do alvo (`#FFB020`) e devolve a
 * coordenada de página correspondente. É a única forma honesta de "saber onde
 * está o alvo" de fora: o estado da partida vive num `ref` e não atravessa
 * para o DOM, e inventar uma posição faria o teste clicar no vazio e passar
 * por sorte.
 */
async function acharAlvo(page: Page): Promise<{ x: number; y: number } | null> {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return null
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    const caixa = canvas.getBoundingClientRect()
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    // Passo de 4px: o alvo tem dezenas de pixels de diâmetro, e varrer de um
    // em um custaria mais do que a vida do próprio alvo (1200ms).
    for (let py = 0; py < canvas.height; py += 4) {
      for (let px = 0; px < canvas.width; px += 4) {
        const i = (py * canvas.width + px) * 4
        // `#FFB020` contra `#08090C` (fundo) e `#1F232B` (anel): só o alvo
        // tem vermelho alto com azul baixo.
        if (pixels[i]! > 200 && pixels[i + 1]! > 140 && pixels[i + 2]! < 80) {
          // O primeiro pixel em ordem de varredura é o TOPO do círculo, e
          // clicar na borda encolhe a margem que a tolerância de acerto dá.
          // Descer pela mesma coluna até sair do alvo devolve o outro extremo,
          // e o meio dos dois é o centro com folga de sobra.
          let fundo = py
          while (fundo + 1 < canvas.height) {
            const j = ((fundo + 1) * canvas.width + px) * 4
            if (!(pixels[j]! > 200 && pixels[j + 1]! > 140 && pixels[j + 2]! < 80)) break
            fundo += 1
          }
          const meio = (py + fundo) / 2
          return {
            x: caixa.left + (px / canvas.width) * caixa.width,
            y: caixa.top + (meio / canvas.height) * caixa.height,
          }
        }
      }
    }
    return null
  })
}

/**
 * `acharAlvo` é a foto de um instante, e o alvo é uma coisa que pisca: dura
 * 1200ms, nasce a cada 620ms, e existe instante legítimo sem nenhum na tela —
 * com quatro workers disputando a máquina o laço de rAF fica lento e esse
 * instante estica. Afirmar "há alvo na dobra" com uma leitura única é afirmar
 * sobre o relógio, não sobre a página; esta versão insiste durante uma janela,
 * que é o que a afirmação de fato quer dizer.
 */
async function esperarAlvo(page: Page, janelaMs = 4000): Promise<{ x: number; y: number } | null> {
  const limite = Date.now() + janelaMs
  for (;;) {
    const alvo = await acharAlvo(page)
    if (alvo) return alvo
    if (Date.now() >= limite) return null
    await page.waitForTimeout(120)
  }
}

/**
 * O teste que existe por causa do C1: o `<div>` de conteúdo cobria o canvas
 * inteiro sem `pointer-events-none`, e como o hit test segue a ordem de
 * pintura, NENHUM ponteiro chegava ao canvas. A 390px o conteúdo cobre 100%
 * da dobra — não havia superfície jogável no celular, justamente onde a
 * página escreve "Toque nos alvos.".
 *
 * Nenhum teste unitário alcança isso: `tests/setup.ts` devolve `null` em
 * `getContext` globalmente, então o laço de rAF nunca roda no jsdom. Só o
 * navegador de verdade enxerga este defeito.
 */
test('um clique marca ponto no celular — a dobra é jogável de verdade', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/pt/ativacoes/')

  const placar = page.locator('text=/\\d+ acertos/')
  await expect(placar).toBeVisible()

  // PRIMEIRO deixa o fantasma pontuar. Sem isto o passo seguinte seria vazio:
  // o placar já nasce em "0 acertos", e afirmar que ele está em zero logo
  // depois do clique passaria mesmo com o clique caindo no vazio.
  await expect(placar, 'o modo atrativo não pontuou: o laço de rAF não rodou').not.toHaveText(
    '0 acertos',
    { timeout: 8000 },
  )

  // O clique cai no MEIO da dobra, onde moram o `<h1>` e o subtítulo — não
  // numa calha lateral. É onde um visitante de celular toca de verdade, e a
  // 390px é o único lugar que existe: o conteúdo cobre a dobra inteira.
  const dobra = await page.locator('canvas').boundingBox()
  expect(dobra, 'não achou o canvas da capa').not.toBeNull()
  await page.mouse.click(dobra!.x + dobra!.width / 2, dobra!.y + dobra!.height / 2)

  // O primeiro ponteiro encerra o modo atrativo e zera o placar do fantasma.
  // Se o clique não chegou ao canvas, o placar segue subindo sozinho: é esta
  // linha que acusa o C1.
  await expect(placar, 'o clique não chegou ao canvas: o placar do fantasma não zerou').toHaveText(
    '0 acertos',
    { timeout: 4000 },
  )

  // Agora o clique de verdade, em cima de um alvo.
  //
  // O ORÇAMENTO É DE TEMPO, não de tentativas. A partida dura 15s a partir do
  // clique acima, e quando ela acaba o placar ao vivo dá lugar ao bloco de fim
  // — ler o placar depois disso falharia por um motivo que não é o do teste.
  // Sete segundos deixam margem larga: o alvo dura 1200ms e nasce a cada 620ms,
  // então a maioria das passadas encontra um. Contar tentativas, e não tempo,
  // era o que fazia este teste passar sozinho (2,3s) e falhar dentro da suíte
  // completa — com quatro workers disputando a máquina o laço de rAF fica lento,
  // cada passada custa mais, e um teto de 25 tentativas se esgotava antes de
  // qualquer alvo aparecer.
  const limite = Date.now() + 7000
  while (Date.now() < limite) {
    const alvo = await acharAlvo(page)
    if (!alvo) {
      await page.waitForTimeout(120)
      continue
    }
    await page.mouse.click(alvo.x, alvo.y)
    // O placar só atravessa para o React no quadro seguinte ao acerto: ler no
    // mesmo instante do clique é ler o valor de antes dele.
    await page.waitForTimeout(150)
    if (/^[1-9]\d* acertos$/.test(((await placar.textContent()) ?? '').trim())) break
  }

  await expect(
    placar,
    'cliques em cima do alvo e o placar não subiu: o ponteiro não chega ao canvas',
  ).not.toHaveText('0 acertos', { timeout: 2000 })
})

// Spec §4.4: menos movimento desliga o jogador automático e a pulsação — e só
// isso. A dobra continua com alvo na tela e continua jogável. Sem este caso, o
// I1 (alvo encolhendo sob `prefers-reduced-motion`) volta em silêncio, porque
// nenhum teste unitário vê o desenho.
test.describe('capa com menos movimento', () => {
  // `contextOptions: { reducedMotion }`, NÃO `reducedMotion` solto. No
  // Playwright 1.62 desta árvore o segundo não existe mais como opção de teste:
  // o `tsc` reprova (`TS2353`) e, pior, EM TEMPO DE EXECUÇÃO ele é aceito e
  // ignorado em silêncio — sonda medida aqui devolveu `{viewport: ok,
  // colorScheme: ok, reducedMotion: no-preference}` com as três no mesmo
  // `test.use`. Um teste escrito daquele jeito rodaria com movimento normal e
  // afirmaria coisas sobre menos movimento sem nunca ter ligado a emulação.
  test.use({ contextOptions: { reducedMotion: 'reduce' } })

  test('o fantasma não joga sozinho, e mesmo assim há alvo na tela', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/pt/ativacoes/')

    const placar = page.locator('text=/\\d+ acertos/')
    await expect(placar).toBeVisible()

    // O ALVO PRIMEIRO, e a ordem importa. "O placar ficou em zero" sozinho
    // também é o que se veria se o laço de rAF nunca tivesse rodado — o teste
    // passaria sem nada ter acontecido na página. Ver alvo nascer é o que prova
    // que o jogo está de pé; só depois disso "zero" quer dizer alguma coisa.
    expect(await esperarAlvo(page), 'menos movimento esvaziou a dobra').not.toBeNull()
    await expect(placar).toHaveText('0 acertos')

    // Tempo de sobra para o fantasma ter marcado vários pontos, se estivesse
    // ligado: ele acerta cerca de um alvo por nascimento, a cada ~620ms.
    await page.waitForTimeout(4000)
    await expect(placar, 'o fantasma marcou ponto com menos movimento ligado').toHaveText(
      '0 acertos',
    )

    // E a dobra continua com alvo depois disso: menos movimento não é um
    // interruptor que apaga o jogo, e o alvo segue lá para ser tocado.
    expect(await esperarAlvo(page), 'a dobra ficou sem alvo com menos movimento').not.toBeNull()
  })
})

/**
 * O teste que existe por causa do C2: o fim de partida era um canvas morto.
 * Medido antes da correção — 2740 pixels de alvo no começo, ZERO depois de 16
 * segundos, e zero depois de clicar; `tocar` devolvia a partida inalterada a
 * partir de `fim`, nada sabia recomeçar, e o laço de rAF seguia agendando
 * quadros para sempre só para repintar um retângulo preto a 60Hz. A spec §4.3
 * pede resultado e chamada no fim da partida, e o plano não tinha ramo `fim`
 * nenhum no JSX.
 *
 * A partida dura 15s: este é o único caso lento do arquivo, e é lento porque a
 * coisa que ele mede é o relógio.
 */
test('no fim da partida o resultado é DOM, e dá para jogar de novo', async ({ page }) => {
  test.setTimeout(60_000)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/pt/ativacoes/')

  const dobra = await page.locator('canvas').boundingBox()
  expect(dobra, 'não achou o canvas da capa').not.toBeNull()
  await page.mouse.click(dobra!.x + dobra!.width / 2, dobra!.y + dobra!.height / 2)

  // O fim é TEXTO, não pixel: mesma regra que rege o resto desta página.
  const titulo = page.getByText('Acabou o tempo.')
  await expect(titulo).toBeVisible({ timeout: 25_000 })

  // O resultado carrega os números do motor, e o dicionário não carrega
  // dígito nenhum: os marcadores têm que ter sido substituídos.
  const resultado = page.locator('text=/\\d+ acertos, \\d+ms de reação média\\./')
  await expect(resultado).toBeVisible()
  await expect(page.getByText('{acertos}')).toHaveCount(0)

  // A saída é um `<button>` de verdade — focável e acionável pelo teclado.
  const jogarDeNovo = page.getByRole('button', { name: 'Jogar de novo' })
  await expect(jogarDeNovo).toBeVisible()
  await jogarDeNovo.focus()
  await page.keyboard.press('Enter')

  // Voltou a jogar: o bloco de fim sai e o placar ao vivo volta, zerado.
  await expect(titulo).toHaveCount(0)
  await expect(page.locator('text=/\\d+ acertos/')).toHaveText('0 acertos')

  // E a partida nova ANDA de verdade: alvo de volta na tela, não um `fim`
  // renomeado para `jogando`.
  expect(await esperarAlvo(page), 'recomeçou sem voltar a nascer alvo').not.toBeNull()
})
