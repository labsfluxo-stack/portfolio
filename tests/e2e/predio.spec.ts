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

/**
 * A CENA TAPA O FALLBACK — provado em PIXEL, não em teste de acerto.
 *
 * A versão anterior deste teste usava `document.elementFromPoint` no centro da
 * tela e exigia que ele resolvesse para dentro de `predio-canvas`. O comentário
 * dela dizia que isso era "a mesma árvore que decide o que é PINTADO". Não é, e
 * a diferença deixou de ser acadêmica no dia em que a camada da cena passou a
 * ser `pointer-events: none` (correção da rolagem travada): `pointer-events`
 * muda o TESTE DE ACERTO sem mexer em UMA LINHA do que é pintado. O teste
 * antigo ficou vermelho com a tela visualmente idêntica — ele media a coisa
 * errada, e a rolagem foi quem revelou isso.
 *
 * A prova nova não decodifica imagem nem precisa de dependência: pinta a camada
 * do fallback de uma cor berrante, tira uma captura, repinta de OUTRA cor
 * berrante, tira outra, e exige que os dois PNGs sejam byte a byte idênticos.
 * Se um único pixel do fallback atravessasse o prédio, a cor daquele pixel
 * mudaria entre as duas capturas e os arquivos divergiriam. É uma afirmação
 * sobre o que a tela mostra, não sobre a árvore do DOM — e cobre de uma vez o
 * `alpha: false` do `<Canvas>`, a cor de limpeza declarada e a ordem de
 * empilhamento das duas camadas.
 */
test('nada do fallback atravessa o prédio, e um link focado pinta por cima da cena', async ({
  page,
}) => {
  await page.goto(ROTA)
  await expect(page.locator('[data-testid="predio-canvas"] canvas')).toBeVisible({
    timeout: 8000,
  })
  // A cena precisa ASSENTAR antes de servir de referência: a câmera amortece
  // até a pose de repouso e o fundo interpola até a cor do andar ativo. Duas
  // capturas tiradas durante isso divergiriam pela própria animação, não por
  // vazamento — falso vermelho.
  await page.waitForTimeout(3500)

  const pintarFallback = (cor: string) =>
    page.evaluate((c) => {
      const camada = document.querySelector<HTMLElement>('[data-testid="predio-fallback-camada"]')
      if (!camada) throw new Error('camada do fallback não encontrada')
      camada.style.background = c
      camada.querySelectorAll<HTMLElement>('*').forEach((el) => {
        el.style.background = c
        el.style.color = c
      })
    }, cor)

  await pintarFallback('#ff00ff')
  const magenta = await page.screenshot()
  await pintarFallback('#00ff00')
  const verde = await page.screenshot()

  expect(
    Buffer.compare(magenta, verde),
    'a tela mudou quando só o FALLBACK mudou de cor — ou seja, ele atravessa o prédio',
  ).toBe(0)

  // E o outro lado da promessa: um link focado TEM de aparecer. Se
  // `focus-within:z-50` parasse de promover a camada, o link ficaria atrás do
  // canvas opaco e o visitante de teclado focaria algo invisível — a regressão
  // de WCAG 2.4.7 que o mecanismo de empilhamento existe para impedir. A prova
  // é a mesma moeda: a mesma região da tela, antes e depois do foco, tem de
  // DIFERIR.
  const link = page.getByRole('link', { name: 'Recepção' })
  await link.focus()
  const caixa = await link.boundingBox()
  expect(caixa, 'o link do indicador não tem caixa ao receber foco').not.toBeNull()
  const regiao = {
    x: Math.max(0, Math.round(caixa!.x)),
    y: Math.max(0, Math.round(caixa!.y)),
    width: Math.max(1, Math.round(caixa!.width)),
    height: Math.max(1, Math.round(caixa!.height)),
  }
  const comFoco = await page.screenshot({ clip: regiao })

  await link.evaluate((el) => el.blur())
  await page.waitForTimeout(300)
  const semFoco = await page.screenshot({ clip: regiao })

  expect(
    Buffer.compare(comFoco, semFoco),
    'a região do link ficou igual com e sem foco — o link focado não pintou por cima da cena',
  ).not.toBe(0)
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

/**
 * A DESCIDA DIRIGIDA POR ENTRADA HUMANA — roda, dedo e teclado.
 *
 * Estes testes existem por causa de um defeito que a suíte inteira deixou
 * passar e que o dono encontrou abrindo a página: "não consigo rolar para
 * baixo e para cima, fica travado na cobertura".
 *
 * POR QUE NENHUM DOS TESTES ACIMA PEGOU. Todos eles avançam a descida
 * atribuindo `scrollTop` no elemento que rola. Isso prova que o elemento PODE
 * ser movido — e nunca prova que um VISITANTE consegue movê-lo. Eram duas
 * afirmações diferentes, e a suíte só tinha a primeira. O defeito morava
 * exatamente na camada que `scrollTop = n` pula: a cena, `fixed inset-0`,
 * cobria a tela inteira com `pointer-events: auto` e engolia todo evento de
 * roda e de toque; o elemento que rola ficava atrás dela, em `-z-10`, e nunca
 * recebia nada. Pelo teclado era outra porta do mesmo defeito: o contêiner que
 * rola não é focável e `document.activeElement` era `<body>`, então as teclas
 * de rolagem iam para o documento, que tem `scrollHeight === innerHeight` e
 * não rola.
 *
 * REGRA DESTE BLOCO, e ela não é estilo: **nenhum teste daqui pode escrever
 * `scrollTop`.** Só `mouse.wheel()` e `keyboard.press()`. No instante em que
 * um deles atribuir posição, ele volta a ser um teste do parágrafo acima e o
 * buraco reabre.
 */
test.describe('a descida se move por entrada humana', () => {
  test('a roda do mouse sobre a cena move a descida', async ({ page }) => {
    await page.goto(ROTA)
    await expect(page.locator('[data-testid="predio-canvas"] canvas')).toBeVisible({
      timeout: 8000,
    })

    const scroller = scrollerLocator(page)
    expect(await scroller.evaluate((el) => el.scrollTop)).toBe(0)

    // No MEIO da tela, que é onde a cena cobre — não numa borda onde algum
    // outro elemento pudesse receber o evento por acaso.
    const viewport = page.viewportSize()!
    await page.mouse.move(viewport.width / 2, viewport.height / 2)
    for (let i = 0; i < 8; i++) {
      await page.mouse.wheel(0, 400)
      await page.waitForTimeout(80)
    }
    await page.waitForTimeout(500)

    const depois = await scroller.evaluate((el) => el.scrollTop)
    expect(depois, 'a roda do mouse sobre a cena não moveu a descida').toBeGreaterThan(0)

    // E a cena ACOMPANHOU: o rótulo do andar ativo mudou. Sem isto o teste
    // provaria só que um `<div>` invisível se mexeu — não que o visitante
    // desceu no prédio.
    const rotulos = await page.locator('[data-testid="predio-canvas"] a').allTextContents()
    expect(rotulos.join('|'), 'a cena não acompanhou a rolagem da roda').not.toContain(
      'Como o backup funciona',
    )
  })

  test('a roda também sobe de volta', async ({ page }) => {
    await page.goto(ROTA)
    await expect(page.locator('[data-testid="predio-canvas"] canvas')).toBeVisible({
      timeout: 8000,
    })
    const viewport = page.viewportSize()!
    await page.mouse.move(viewport.width / 2, viewport.height / 2)
    for (let i = 0; i < 8; i++) {
      await page.mouse.wheel(0, 400)
      await page.waitForTimeout(80)
    }
    await page.waitForTimeout(400)
    const scroller = scrollerLocator(page)
    const desceu = await scroller.evaluate((el) => el.scrollTop)
    expect(desceu).toBeGreaterThan(0)

    for (let i = 0; i < 12; i++) {
      await page.mouse.wheel(0, -400)
      await page.waitForTimeout(80)
    }
    await page.waitForTimeout(500)
    expect(
      await scroller.evaluate((el) => el.scrollTop),
      'a roda não trouxe a descida de volta para cima',
    ).toBeLessThan(desceu)
  })

  test('as teclas de rolagem movem a descida sem nada focado', async ({ page }) => {
    await page.goto(ROTA)
    await expect(page.locator('[data-testid="predio-canvas"] canvas')).toBeVisible({
      timeout: 8000,
    })
    const scroller = scrollerLocator(page)

    // O cenário do dono: a página abriu, ninguém clicou em nada, e ele
    // apertou uma tecla de rolagem.
    await page.keyboard.press('PageDown')
    await page.waitForTimeout(500)
    const pageDown = await scroller.evaluate((el) => el.scrollTop)
    expect(pageDown, 'Page Down não moveu a descida').toBeGreaterThan(0)

    await page.keyboard.press('End')
    await page.waitForTimeout(600)
    const fim = await scroller.evaluate((el) => el.scrollTop)
    expect(fim, 'End não levou a descida até a recepção').toBeGreaterThan(pageDown)

    await page.keyboard.press('Home')
    await page.waitForTimeout(600)
    expect(
      await scroller.evaluate((el) => el.scrollTop),
      'Home não trouxe a descida de volta à cobertura',
    ).toBe(0)
  })

  /**
   * O CURSOR EM CIMA DE UMA ÂNCORA — a variante que quase escapou.
   *
   * As âncoras são as únicas coisas da camada da cena com , e elas são filhas de um  que não rola: o
   * encadeamento de rolagem a partir delas sobe para a janela, que nesta rota
   * não rola. Sem repasse, a descida volta a travar — só que num retângulo de
   * 189 × 44 px, o que é muito mais difícil de perceber e de reproduzir do que
   * a tela inteira travada. Este teste põe o cursor exatamente lá.
   */
  test('a roda funciona também com o cursor sobre uma âncora de objeto', async ({ page }) => {
    await page.goto(ROTA)
    await expect(page.locator('[data-testid="predio-canvas"] canvas')).toBeVisible({
      timeout: 8000,
    })
    await page.waitForTimeout(1200)

    const ancora = page.locator('[data-testid="predio-canvas"] a').first()
    const caixa = await ancora.boundingBox()
    expect(caixa, 'nenhuma âncora de objeto na tela para testar').not.toBeNull()

    // O centro da âncora, e a confirmação de que é MESMO ela sob o cursor —
    // senão o teste passaria por acidente, medindo a rolagem no vazio.
    const x = caixa!.x + caixa!.width / 2
    const y = caixa!.y + caixa!.height / 2
    expect(
      // Objeto e não tupla: sob `noUncheckedIndexedAccess`, desestruturar um
      // `number[]` dá `number | undefined` nos dois nomes.
      await page.evaluate(
        ({ px, py }) => document.elementFromPoint(px, py)?.tagName,
        { px: x, py: y },
      ),
      'o ponto escolhido não é a âncora',
    ).toBe('A')

    const scroller = scrollerLocator(page)
    await page.mouse.move(x, y)
    for (let i = 0; i < 5; i++) {
      await page.mouse.wheel(0, 400)
      await page.waitForTimeout(90)
    }
    await page.waitForTimeout(500)
    expect(
      await scroller.evaluate((el) => el.scrollTop),
      'a roda morreu em cima da âncora — a descida travou de novo',
    ).toBeGreaterThan(0)
  })

  test('as setas movem a descida no celular', async ({ browser }) => {
    const ctx = await browser.newContext(IPHONE_13_CHROMIUM)
    const page = await ctx.newPage()
    await page.goto(ROTA)
    await expect(page.locator('[data-testid="predio-canvas"] canvas')).toBeVisible({
      timeout: 8000,
    })
    const scroller = scrollerLocator(page)

    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(500)
    expect(
      await scroller.evaluate((el) => el.scrollTop),
      'as setas não moveram a descida',
    ).toBeGreaterThan(0)

    await ctx.close()
  })
})

/**
 * A RODA DE VERDADE, EM VÁRIAS ALTURAS DE JANELA.
 *
 * Este bloco existe porque a correção anterior passou na suíte e continuou
 * quebrada para o dono. Os testes de entrada humana que eu tinha escrito usavam
 * eventos de roda de 400 px — e 400 px é grande demais para revelar o defeito.
 * Uma roda de mouse de verdade entrega ~100 px por catraca, e era ali que a
 * página estava morta.
 *
 * O MECANISMO, medido no navegador e não deduzido: com `scroll-snap-type: y
 * mandatory` e um ponto de encaixe a cada altura de tela, o navegador leva a
 * rolagem para o ponto de encaixe MAIS PRÓXIMO do destino. Um gesto que anda
 * menos de METADE de uma tela tem o ponto de partida como mais próximo — e
 * volta para ele. O limiar é exatamente metade, medido ao pixel numa janela de
 * 800: delta 399 → `scrollTop` 0; delta 400 → 0; delta 401 → 800.
 *
 * Duas consequências, e a segunda é a que importa:
 *   1. O defeito parece depender da ALTURA quando se testa com 400 px, porque
 *      400 só passa de metade em janelas abaixo de 800. Daí a tabela
 *      "700/720/740/760/780 funcionam, 800 e 900 não".
 *   2. Mas com uma catraca de verdade (~100 px) NENHUMA altura funciona. A
 *      altura era o sintoma; o tamanho do gesto era a causa.
 *
 * Por isso este bloco varre alturas E usa catracas pequenas. Testar em uma
 * altura só, ou com um gesto grande, é o que deixou o defeito chegar ao dono
 * duas vezes.
 */
/**
 * O TOQUE — a entrada principal do celular, e até agora sem uma linha de
 * cobertura em todo o ramo.
 *
 * O teste que dizia cobri-lo ("as setas movem a descida, e o toque no celular
 * também") só apertava `ArrowDown` duas vezes: o nome fechava um buraco que o
 * corpo não fechava. O repasse de `touchstart`/`touchmove` em `Predio.tsx`
 * existia sem nenhuma prova, num recurso onde celular é requisito duro.
 *
 * `page.touchscreen` do Playwright só dá TAP. Para um ARRASTO é preciso
 * `Input.dispatchTouchEvent` por CDP, com passos intermediários — um
 * `touchStart` seguido de um `touchEnd` distante não é um gesto de rolagem
 * para o navegador, é um toque que pulou.
 */
test.describe('o toque arrasta a descida', () => {
  async function arrastar(
    ctx: import('@playwright/test').BrowserContext,
    page: import('@playwright/test').Page,
    x: number,
    y: number,
    distancia: number,
  ) {
    const cdp = await ctx.newCDPSession(page)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    const passos = 12
    for (let i = 1; i <= passos; i++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x, y: y - (distancia * i) / passos }],
      })
      await page.waitForTimeout(16)
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await cdp.detach()
  }

  test('um arrasto no vazio da cena desce o prédio', async ({ browser }) => {
    const ctx = await browser.newContext(IPHONE_13_CHROMIUM)
    const page = await ctx.newPage()
    await page.goto(ROTA)
    await expect(page.locator('[data-testid="predio-canvas"] canvas')).toBeVisible({ timeout: 8000 })
    await page.waitForTimeout(1200)
    const scroller = scrollerLocator(page)

    const tela = page.viewportSize()!
    await arrastar(ctx, page, Math.round(tela.width / 2), Math.round(tela.height * 0.75), 300)
    await page.waitForTimeout(800)
    expect(
      await scroller.evaluate((el) => el.scrollTop),
      'o arrasto no vazio da cena não moveu a descida',
    ).toBeGreaterThan(0)
    await ctx.close()
  })

  /**
   * E o caso que o repasse existe para cobrir: o dedo começando EM CIMA de uma
   * âncora. As âncoras são o único ponto da camada da cena com
   * `pointer-events: auto`, e são filhas de um `fixed` que não rola — sem
   * repasse, o gesto morre ali, do mesmo jeito que a roda morria.
   */
  test('um arrasto começando sobre uma âncora também desce', async ({ browser }) => {
    const ctx = await browser.newContext(IPHONE_13_CHROMIUM)
    const page = await ctx.newPage()
    await page.goto(ROTA)
    await expect(page.locator('[data-testid="predio-canvas"] canvas')).toBeVisible({ timeout: 8000 })
    await page.waitForTimeout(1500)

    const ancora = page.locator('[data-testid="predio-canvas"] a').first()
    const caixa = await ancora.boundingBox()
    expect(caixa, 'nenhuma âncora na tela para começar o arrasto').not.toBeNull()
    const x = Math.round(caixa!.x + caixa!.width / 2)
    const y = Math.round(caixa!.y + caixa!.height / 2)
    expect(
      await page.evaluate(({ px, py }) => document.elementFromPoint(px, py)?.tagName, { px: x, py: y }),
      'o ponto escolhido não é a âncora',
    ).toBe('A')

    const scroller = scrollerLocator(page)
    await arrastar(ctx, page, x, y, 260)
    await page.waitForTimeout(800)
    expect(
      await scroller.evaluate((el) => el.scrollTop),
      'o arrasto morreu em cima da âncora',
    ).toBeGreaterThan(0)
    await ctx.close()
  })

  /** Sem a cena — a camada acessível — o dedo também precisa funcionar. */
  test('sem a cena, o arrasto move o fallback', async ({ browser }) => {
    const ctx = await browser.newContext({ ...IPHONE_13_CHROMIUM, reducedMotion: 'reduce' })
    const page = await ctx.newPage()
    await page.goto(ROTA)
    await page.waitForTimeout(2500)
    await expect(page.locator('[data-testid="predio-canvas"] canvas')).toHaveCount(0)
    const scroller = scrollerLocator(page)
    const tela = page.viewportSize()!
    await arrastar(ctx, page, Math.round(tela.width / 2), Math.round(tela.height * 0.75), 300)
    await page.waitForTimeout(800)
    expect(
      await scroller.evaluate((el) => el.scrollTop),
      'o arrasto não move o fallback sem a cena',
    ).toBeGreaterThan(0)
    await ctx.close()
  })
})

test.describe('a roda pequena move a descida, em qualquer altura de janela', () => {
  // 720 é a altura padrão do Playwright e a que "funcionava" com 400 px — ela
  // entra justamente para provar que também estava quebrada para gesto de
  // verdade. 800 e 900 são a faixa que o dono reportou.
  // 1080 é a janela ALTA, e não é enfeite: quanto mais alta a tela, mais
  // longe fica a metade que o encaixe obrigatório exigia, então é nela que o
  // defeito era pior — e é justamente a altura que uma sonda de 400 px jamais
  // acusaria, porque 400 perde para 540 com folga.
  for (const height of [720, 800, 900, 1080]) {
    test(`catracas de 120 px descem a página numa janela de ${height} px`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height })
      await page.goto(ROTA)
      await expect(page.locator('[data-testid="predio-canvas"] canvas')).toBeVisible({
        timeout: 8000,
      })
      await page.waitForTimeout(1200)

      const scroller = scrollerLocator(page)
      expect(await scroller.evaluate((el) => el.scrollTop)).toBe(0)

      // Quatro catracas de 120 px = 480 px de intenção, com pausa entre elas
      // para que cada uma seja um gesto próprio — que é como uma roda de mouse
      // de verdade se comporta, e o pior caso para o encaixe obrigatório.
      await page.mouse.move(640, height / 2)
      for (let i = 0; i < 4; i++) {
        await page.mouse.wheel(0, 120)
        await page.waitForTimeout(80)
      }
      await page.waitForTimeout(600)

      // A faixa é apertada de propósito, em torno dos 480 px de intenção, e ela
      // reprova os DOIS jeitos de errar. Zero (ou quase) é o encaixe obrigatório
      // devolvendo o gesto para a origem — o defeito que o dono relatou. Um
      // múltiplo da altura da tela seria o encaixe voltando por outra porta,
      // quantizando a descida em andares inteiros em vez de deixá-la contínua —
      // e contínua é o que a curva `PARADA` de `predio-descida.ts` já modula em
      // software, sem precisar de CSS nenhum.
      const andou = await scroller.evaluate((el) => el.scrollTop)
      expect(
        andou,
        `catracas pequenas não moveram nada numa janela de ${height} px`,
      ).toBeGreaterThanOrEqual(440)
      expect(
        andou,
        `a descida andou em saltos, não 1:1 com o gesto (janela de ${height} px)`,
      ).toBeLessThanOrEqual(520)
    })
  }

  /**
   * E o mecanismo, preso pelo nome: enquanto a cena está no ar, o contêiner que
   * rola NÃO pode ter encaixe obrigatório. `proximity` também foi medido e
   * também não resolve (catracas de 100 px continuam em 0) — só `none` deixa a
   * rolagem acumular. Quem faz o andar "parar na tela" com a cena montada é a
   * curva `PARADA` de `predio-descida.ts`, não o CSS.
   */
  test('com a cena montada, o contêiner que rola não tem encaixe obrigatório', async ({ page }) => {
    await page.goto(ROTA)
    await expect(page.locator('[data-testid="predio-canvas"] canvas')).toBeVisible({
      timeout: 8000,
    })
    const tipo = await scrollerLocator(page).evaluate((el) => getComputedStyle(el).scrollSnapType)
    expect(tipo, 'o encaixe obrigatório voltou e vai matar a roda de novo').toBe('none')
  })

  /**
   * A CAMADA ACESSÍVEL TAMBÉM TEM DE ROLAR — e a versão anterior deste teste
   * fazia o contrário: afirmava `scrollSnapType === 'y mandatory'` sem a cena,
   * ou seja, CERTIFICAVA a configuração que este arquivo inteiro já tinha
   * medido como "qualquer gesto menor que meia tela volta para a origem". A
   * suíte estava protegendo o defeito de ser consertado.
   *
   * O caminho sem cena não é um caso de borda: é o que recebe quem liga
   * movimento reduzido, quem está num aparelho sem WebGL e quem abre o link
   * pelo navegador embutido do Instagram — que a spec nomeia como teste
   * obrigatório. É também a camada em que TODO o argumento de acessibilidade de
   * `PredioSlot.tsx` se apoia.
   */
  test('sem a cena, a roda e o teclado movem o fallback', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' })
    const page = await ctx.newPage()
    await page.goto(ROTA)
    await page.waitForTimeout(2500)
    // Confirma que estamos MESMO no caminho sem cena: sem esta linha o teste
    // poderia passar medindo a cena montada e não provar nada sobre o fallback.
    await expect(page.locator('[data-testid="predio-canvas"] canvas')).toHaveCount(0)

    const scroller = scrollerLocator(page)
    expect(await scroller.evaluate((el) => el.scrollTop)).toBe(0)

    // Catraca de roda de verdade, o pior caso para o encaixe obrigatório.
    await page.mouse.move(640, 360)
    for (let i = 0; i < 4; i++) {
      await page.mouse.wheel(0, 120)
      await page.waitForTimeout(80)
    }
    await page.waitForTimeout(600)
    const comRoda = await scroller.evaluate((el) => el.scrollTop)
    expect(comRoda, 'a roda não move o fallback sem a cena').toBeGreaterThanOrEqual(440)

    // E o teclado, que sem a cena não tinha handler nenhum: as teclas iam para
    // o documento, que tem altura exata de uma tela e não rola.
    await page.keyboard.press('Home')
    await page.waitForTimeout(400)
    await page.keyboard.press('PageDown')
    await page.waitForTimeout(600)
    expect(
      await scroller.evaluate((el) => el.scrollTop),
      'Page Down não move o fallback sem a cena',
    ).toBeGreaterThan(0)

    await page.keyboard.press('End')
    await page.waitForTimeout(700)
    const fim = await scroller.evaluate((el) => el.scrollTop)
    expect(fim, 'End não leva o fallback até a recepção').toBe(
      await scroller.evaluate((el) => el.scrollHeight - el.clientHeight),
    )
    await ctx.close()
  })

  /**
   * O mecanismo preso pelo nome, NOS DOIS CAMINHOS. O encaixe obrigatório é a
   * configuração que devolve todo gesto menor que meia tela — e ele não pode
   * voltar nem com a cena, nem sem ela.
   */
  test('nenhum dos dois caminhos usa encaixe obrigatório', async ({ browser }) => {
    const comCena = await browser.newContext()
    const p1 = await comCena.newPage()
    await p1.goto(ROTA)
    await expect(p1.locator('[data-testid="predio-canvas"] canvas')).toBeVisible({ timeout: 8000 })
    expect(
      await scrollerLocator(p1).evaluate((el) => getComputedStyle(el).scrollSnapType),
      'o encaixe obrigatório voltou no caminho COM cena',
    ).toBe('none')
    await comCena.close()

    const semCena = await browser.newContext({ reducedMotion: 'reduce' })
    const p2 = await semCena.newPage()
    await p2.goto(ROTA)
    await p2.waitForTimeout(2500)
    await expect(p2.locator('[data-testid="predio-canvas"] canvas')).toHaveCount(0)
    expect(
      await scrollerLocator(p2).evaluate((el) => getComputedStyle(el).scrollSnapType),
      'o encaixe obrigatório voltou no caminho SEM cena',
    ).toBe('none')
    await semCena.close()
  })
})
