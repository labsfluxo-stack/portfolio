import { test, expect, devices } from '@playwright/test'

/**
 * O prédio provado no navegador de verdade — o que `css: false` e a ausência
 * de WebGL em jsdom nunca poderiam enxergar.
 *
 * QUATRO CORREÇÕES SOBRE O BRIEF ORIGINAL (medidas aqui, não supostas):
 *
 * 1. O `baseURL` de `playwright.config.ts` já inclui `/portfolio` — os testes
 *    daqui chamam `page.goto('/pt/predio/')`, nunca `/pt/predio/` com o
 *    prefixo escrito à mão, do mesmo jeito que `navigation.spec.ts` e
 *    `home-luz.spec.ts` já fazem.
 * 2. A rota é a PRÉVIA (`/predio`), não a home (`/pt/`): o dono adiou onde o
 *    prédio mora de verdade (ver o comentário de `app/[locale]/predio/
 *    page.tsx`), e a home publicada em `/pt/` ainda é a página antiga.
 * 3. `window.scrollTo` NÃO MEXE NADA nesta rota. Quem rola é o `<div>` que
 *    `PredioFallback.tsx` desenha — `100dvh`, `overflow-y-auto`, uns 5000 px
 *    de curso — e a janela mede sempre `scrollHeight === innerHeight`, medido
 *    abaixo. Todo teste que precisa avançar a descida mexe nesse elemento
 *    direto, nunca em `window.scrollTo`.
 * 4. Nenhum teste aqui afirma `toBeVisible()` no fallback para provar a
 *    descida: com a cena montada ele continua "visível" no sentido do
 *    Playwright (`sr-only` não existe nele — ver o mecanismo de empilhamento
 *    em `PredioSlot.tsx` — ele é uma caixa do tamanho normal, só numa camada
 *    de pilha mais baixa). `toBeVisible()` passaria mesmo com a cena quebrada.
 *    Onde a prova precisa ser "a cena está por cima", o teste usa
 *    `document.elementFromPoint`, que segue a pilha de empilhamento de
 *    verdade — a mesma regra que decide o que é PINTADO.
 */

const ROTA = '/pt/predio/'

/** O `<div>` que rola de verdade nesta página — ver a correção 3 acima. */
function scrollerLocator(page: import('@playwright/test').Page) {
  return page.locator('[data-testid="predio-fallback-camada"] > div')
}

/** `devices['iPhone 13']` inclui `defaultBrowserType: 'webkit'`, que força um
 *  novo worker/projeto se usado dentro de um `test.describe` — Playwright
 *  recusa a troca de motor no meio do arquivo (erro medido ao tentar). Este
 *  projeto não declara um projeto `webkit` em `playwright.config.ts`, e o
 *  WebGL headless já está confirmado funcionando em Chromium (ver o restante
 *  deste arquivo) — então a emulação aqui reaproveita viewport, user agent e
 *  toque do dispositivo, mas fica no Chromium. */
const { defaultBrowserType: _semUso, ...IPHONE_13_CHROMIUM } = devices['iPhone 13']
void _semUso

test('a descida percorre os sete andares sem erro de console', async ({ page }) => {
  const erros: string[] = []
  page.on('pageerror', (e) => erros.push(e.message))
  page.on('console', (m) => m.type() === 'error' && erros.push(m.text()))

  await page.goto(ROTA)

  // Passo a passo, não um salto direto ao fim: um salto pularia a transição
  // de janela de andares vivos (andar-1/andar/andar+1) em cada um dos seis
  // limiares — exatamente onde a árvore da cena muda e um erro de render
  // apareceria. Mesmo espírito de `home-revelacao.spec.ts`, adaptado ao
  // elemento que aqui é quem rola.
  await scrollerLocator(page).evaluate(async (el) => {
    for (let y = 0; y <= el.scrollHeight; y += 400) {
      el.scrollTop = y
      await new Promise((r) => setTimeout(r, 60))
    }
    el.scrollTop = el.scrollHeight
  })
  await page.waitForTimeout(500)

  expect(erros).toEqual([])
})

test('a recepção é alcançável pelo teclado, sem precisar rolar', async ({ page }) => {
  await page.goto(ROTA)

  // Nome EXATO "Recepção", não a regex /recep|contato/i do brief original: a
  // seção de recepção também tem um link de conteúdo de verdade ("Ir para o
  // formulário de contato", que casaria com a mesma regex), e testar contra
  // um nome que pode resolver para QUALQUER UM dos dois esconderia a falha
  // se o indicador especificamente sumisse do teclado — `getByRole` cairia
  // de volta no outro link, o `focus()` ainda passaria, e o teste mentiria.
  // Só o link do PRÓPRIO `PredioIndicador` se chama, literalmente, "Recepção".
  const link = page.getByRole('link', { name: 'Recepção' })
  await link.focus()
  await expect(link).toBeFocused()

  // A prova forte não é só o foco: é que ATIVAR o link pelo teclado entrega
  // a recepção sem UMA linha de rolagem escrita por este teste — nenhum
  // `scrollTo`, nenhum `scrollTop` setado aqui. Se o `href="#predio-
  // recepcao"` do indicador ou o `id` da seção saírem de sincronia, isto
  // falha; se o link sumir da árvore de tabulação, `toBeFocused()` já teria
  // falhado antes.
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Recepção' })).toBeInViewport()
})

test('com movimento reduzido, a cena nunca sobe — só os sete <section> do fallback', async ({
  browser,
}) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await page.goto(ROTA)

  // As sete `<section>` do fallback SEMPRE existem no DOM, com cena montada
  // ou não — é a camada acessível permanente que o comentário de
  // `PredioSlot.tsx` documenta. Por isso contar `getByRole('region')` sozinho
  // NÃO PROVA que o movimento reduzido impediu a cena — provaria isso mesmo
  // que `PredioSlot` ignorasse `prefers-reduced-motion` por completo. A prova
  // real é a ausência do canvas: sem ele, o que está na tela É o HTML.
  await page.waitForTimeout(3000)
  await expect(page.getByRole('region')).toHaveCount(7)
  await expect(page.locator('[data-testid="predio-canvas"] canvas')).toHaveCount(0)

  await ctx.close()
})

test('em navegador capaz, a cena WebGL sobe sobre o fallback', async ({ page }) => {
  await page.goto(ROTA)
  // `toBeVisible` com timeout generoso em vez de `waitForTimeout` fixo: a
  // montagem espera `load` + ociosidade (até 2000ms de `requestIdleCallback`,
  // ver PredioSlot.tsx) — poll até acontecer é menos frágil que um sono fixo.
  await expect(page.locator('[data-testid="predio-canvas"] canvas')).toBeVisible({
    timeout: 8000,
  })
})

test.describe('foco no indicador de andares (PredioIndicador)', () => {
  test('o link fica invisível até receber foco, e some de novo ao perder', async ({ page }) => {
    await page.goto(ROTA)
    const link = page.getByRole('link', { name: 'Recepção' })

    // Antes do foco: a caixa existe (não é `display:none`) mas é o retângulo
    // de 1×1 do `sr-only` — não um alvo alcançável por mouse ou toque.
    const antes = await link.boundingBox()
    expect(antes?.width, 'link do indicador visível ANTES do foco').toBeLessThanOrEqual(1)

    await link.focus()
    const focado = await link.boundingBox()
    expect(focado?.width, 'link do indicador não cresceu ao ganhar foco').toBeGreaterThan(50)
    expect(focado?.height, 'link do indicador não cresceu ao ganhar foco').toBeGreaterThan(20)

    // `.blur()` de verdade — não mover foco para `<body>`, que não é focável
    // e deixaria o link com foco (achado ao medir: `body.focus()` não tira
    // o foco do link nesta página).
    await link.evaluate((el) => el.blur())
    const depois = await link.boundingBox()
    expect(depois?.width, 'link do indicador continuou visível DEPOIS de perder o foco').toBeLessThanOrEqual(1)
  })

  test('revela no mesmo canto que o SkipLink do site, sem inventar um segundo lugar', async ({
    page,
  }) => {
    // As duas camadas nunca coexistem hoje: `/predio` é uma rota de prévia
    // fora do route group `(site)`, e é só ele que renderiza `<SkipLink>`
    // (confirmado lendo app/[locale]/(site)/layout.tsx e app/[locale]/
    // predio/page.tsx — não suposto). Então uma colisão simultânea de
    // verdade só existe no dia em que `PredioSlot` entrar na home de
    // verdade, e nesse dia o próprio comentário de PredioIndicador.tsx
    // argumenta que ela continua impossível: só um elemento tem foco de
    // teclado por vez, então só um `:focus` pinta o canto por vez. O que
    // ESTE teste prova, medido nos dois lugares onde cada um vive hoje, é a
    // afirmação geométrica por trás desse argumento — "revelam no mesmo
    // canto" — não a coexistência, que a topologia de rotas de hoje não
    // permite exercitar.
    await page.goto(ROTA)
    const indicador = page.getByRole('link', { name: 'Recepção' })
    await indicador.focus()
    const caixaIndicador = await indicador.boundingBox()
    const estiloIndicador = await indicador.evaluate((el) => {
      const s = getComputedStyle(el)
      return { zIndex: s.zIndex, position: s.position }
    })

    await page.goto('/pt/')
    const skip = page.getByRole('link', { name: 'Pular para o conteúdo' })
    await skip.focus()
    const caixaSkip = await skip.boundingBox()
    const estiloSkip = await skip.evaluate((el) => {
      const s = getComputedStyle(el)
      return { zIndex: s.zIndex, position: s.position }
    })

    expect(caixaIndicador?.x, 'canto X divergente entre indicador e SkipLink').toBe(caixaSkip?.x)
    expect(caixaIndicador?.y, 'canto Y divergente entre indicador e SkipLink').toBe(caixaSkip?.y)
    expect(estiloIndicador).toEqual(estiloSkip)
  })
})

test('a cena pinta por cima do fallback; um link focado pinta por cima da cena', async ({
  page,
}) => {
  await page.goto(ROTA)
  await expect(page.locator('[data-testid="predio-canvas"] canvas')).toBeVisible({
    timeout: 8000,
  })

  // `elementFromPoint` segue a pilha de empilhamento real do navegador — é a
  // mesma árvore que decide o que é PINTADO, não uma leitura de classe CSS.
  // Sem foco em nada: o centro da tela tem de resolver para dentro do
  // `data-testid="predio-canvas"`, nunca para dentro do fallback — senão o
  // texto de trás vazaria por cima do prédio.
  const centro = await page.evaluate(() => {
    const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2)
    return {
      dentroDaCena: !!el?.closest('[data-testid="predio-canvas"]'),
      dentroDoFallback: !!el?.closest('[data-testid="predio-fallback-camada"]'),
    }
  })
  expect(centro.dentroDaCena, 'o centro da tela não resolveu para dentro da cena').toBe(true)
  expect(centro.dentroDoFallback, 'o fallback vazou por cima da cena sem foco nenhum').toBe(false)

  // Agora foca um link do fallback e repete a leitura NO PONTO EXATO do
  // link: o `focus-within:z-50` promete que o fallback sobe de camada; a
  // prova é que o próprio elemento de toque passa a responder ao
  // hit-test ali, não mais o canvas.
  const link = page.getByRole('link', { name: 'Recepção' })
  await link.focus()
  const caixa = await link.boundingBox()
  const noLink = await page.evaluate(
    ({ x, y }) => {
      const el = document.elementFromPoint(x, y)
      return {
        ehOLink: el?.tagName === 'A',
        dentroDaCena: !!el?.closest('[data-testid="predio-canvas"]'),
      }
    },
    { x: caixa!.x + caixa!.width / 2, y: caixa!.y + caixa!.height / 2 },
  )
  expect(noLink.ehOLink, 'o link focado não é o elemento pintado no seu próprio lugar').toBe(true)
  expect(noLink.dentroDaCena, 'a cena continuou por cima mesmo com o link focado').toBe(false)

  // E ao perder o foco, o canvas volta a responder no MESMO ponto — a prova
  // de que a promoção de camada é reversível, não um vazamento permanente.
  await link.evaluate((el) => el.blur())
  const depoisDoBlur = await page.evaluate(
    ({ x, y }) => !!document.elementFromPoint(x, y)?.closest('[data-testid="predio-canvas"]'),
    { x: caixa!.x + caixa!.width / 2, y: caixa!.y + caixa!.height / 2 },
  )
  expect(depoisDoBlur, 'a cena não voltou a pintar por cima depois do blur').toBe(true)
})

test('o invólucro flex não estica nem colapsa o scroller do fallback', async ({ page }) => {
  await page.goto(ROTA)

  // A hipótese que a spec do flexbox descarta (e que este teste confirma
  // contra o navegador de verdade, não contra a leitura da regra): um filho
  // flex que embrulha um `overflow-y-auto` de `100dvh` poderia, pelo bug de
  // tamanho-mínimo-automático, ser esticado para caber o conteúdo inteiro
  // (perdendo a rolagem) ou colapsado a zero (cortando os sete andares).
  // Nenhum dos dois acontece aqui: a altura visível do scroller bate exata
  // com a janela, e a altura de rolagem é sete vezes essa — nem um pixel a
  // mais, nem a menos, porque cada andar é exatamente `.tela-cheia`.
  const medida = await scrollerLocator(page).evaluate((el) => ({
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
  }))
  const alturaDaJanela = await page.evaluate(() => window.innerHeight)

  expect(medida.clientHeight, 'o scroller não tem a altura da janela — o invólucro flex mexeu nela').toBe(
    alturaDaJanela,
  )
  expect(
    medida.scrollHeight,
    'o curso de rolagem não é sete telas inteiras — colapso ou estouro do invólucro flex',
  ).toBe(alturaDaJanela * 7)
})

test.describe('celular', () => {
  test.use({ ...IPHONE_13_CHROMIUM })

  test('cada andar preenche a viewport inteira, sem sobrar nem faltar', async ({ page }) => {
    await page.goto(ROTA)
    const alturaDaJanela = await page.evaluate(() => window.innerHeight)
    // `.tela-cheia` é `100vh` com um `@supports (height: 100dvh)` por cima —
    // ver o comentário grande em app/globals.css sobre o minificador que já
    // colapsou as duas declarações uma vez. Chromium headless não simula a
    // barra de endereço recolhendo (não há diferença NUMÉRICA entre vh e dvh
    // aqui para medir), então o que este teste prova é o que uma regressão
    // de verdade quebraria: se `.tela-cheia` perder a regra de altura, a
    // seção encolhe para o tamanho do conteúdo e este número diverge da
    // janela. Os três testes físicos da spec (Safari real, navegador do
    // Instagram, sol forte) são o que resta para a diferença vh/dvh em si.
    const primeiroAndar = await page.locator('section').first().boundingBox()
    expect(primeiroAndar?.height, 'o andar não preencheu a altura inteira da viewport').toBe(
      alturaDaJanela,
    )
    expect(primeiroAndar?.width).toBe(390)
  })

  test('a descida chega ao fim em viewport de celular', async ({ page }) => {
    await page.goto(ROTA)
    await scrollerLocator(page).evaluate((el) => {
      el.scrollTop = el.scrollHeight
    })
    // A prova não é a aritmética da rolagem sozinha (correção 4 do brief): é
    // que o conteúdo da recepção — a seção de verdade, não um resto de
    // rolagem — é o que está apresentado na tela.
    await expect(page.getByRole('heading', { name: 'Recepção' })).toBeInViewport()
  })

  test('nenhum alvo de toque tocável fica abaixo de 44px', async ({ page }) => {
    await page.goto(ROTA)
    // Só os links de CONTEÚDO (dentro de cada `<section>`), não os sete links
    // do indicador de andares: aqueles são `sr-only` por design — invisíveis
    // e sem caixa tocável até receberem foco de TECLADO, nunca um destino de
    // toque (ver o comentário de PredioIndicador.tsx, "decisão do dono...
    // nada visível"). Medi-los aqui reprovaria o teste pelo motivo errado: o
    // defeito que ele existe para pegar é um `min-h-11` esquecido num objeto
    // clicável, não a existência deliberada de um link invisível ao toque.
    const links = await page.locator('section a').all()
    expect(links.length, 'nenhum link de objeto encontrado — o seletor mudou?').toBeGreaterThan(0)
    for (const link of links) {
      const caixa = await link.boundingBox()
      if (caixa) expect(caixa.height).toBeGreaterThanOrEqual(44)
    }
  })
})
