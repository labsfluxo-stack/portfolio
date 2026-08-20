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
  // `acertos?` (o "s" opcional): a correção do defeito "1 acertos" fez o
  // rótulo virar singular em 1 exato ("1 acerto") — sem o `?` este locator
  // deixaria de achar o placar bem no instante em que o fantasma passa por
  // essa contagem, e o teste ficaria instável por um motivo que não é dele.
  const placar = page.locator('text=/\\d+ acertos?/')
  await expect(placar).toBeVisible()
  await expect(placar).not.toHaveText('0 acertos', { timeout: 8000 })
})

/**
 * Acha TODOS os alvos VIVOS no canvas neste instante e devolve a coordenada
 * de página de cada um — sem conhecer a cor de nada. É a única forma honesta
 * de "saber onde está o alvo" de fora: o estado da partida vive num `ref` e
 * não atravessa para o DOM, e inventar uma posição faria o teste clicar no
 * vazio e passar por sorte.
 *
 * REESCRITO (ruling do controller, Task 3): a versão anterior varria o canvas
 * atrás de um pixel `#FFB020` — a cor do alvo ANTES do tema. Ela quebrou no
 * instante em que o fundo passou a ter arte de verdade: `PALETA.destaque` do
 * tema junino (`temas/junino.ts`) É `#FFB020`, e a faixa de bandeirinhas do
 * fundo pinta uma delas SÓLIDA nessa cor — a varredura (que devolve o
 * PRIMEIRO pixel que bate, de cima para baixo) sempre achava a bandeirinha,
 * nunca o balão, e o clique caía num enfeite estático. Cor nunca mais vai ser
 * um jeito seguro de identificar alvo: qualquer tema pode reusar qualquer cor
 * da própria paleta em qualquer parte do fundo, de propósito (é exatamente o
 * caso aqui — `--color-warn` reaproveitado, não coincidência).
 *
 * A NOVA ABORDAGEM COMPARA DOIS QUADROS. Bandeirinha é `desenharFundo`
 * PARADA — pixel a pixel, byte a byte, o mesmo entre dois quadros SEMPRE (ver
 * `temas/junino.ts`: "bandeirinhas paradas + brasas em deriva"). Um alvo
 * nasce, balança, encolhe e estoura — muda de quadro a quadro em QUALQUER
 * tema futuro, porque é assim que o motor de reflexo funciona (`avancar` em
 * `motor-reflexo.ts`), não uma escolha de arte. Comparar dois quadros
 * separados por ~200ms e procurar pixels que MUDARAM é uma pergunta sobre
 * COMPORTAMENTO do jogo, não sobre a paleta do tema ativo — sobrevive a
 * qualquer redesenho de fundo.
 *
 * ISSO SOZINHO AINDA PEGARIA BRASA: a brasa do fundo também se move (deriva
 * lenta, alpha em rampa) e por instantes pode mudar o bastante para passar
 * num limiar de diferença de cor. O que distingue as duas é TAMANHO: uma
 * brasa é um punhado de pixels — raio de 1,1 a 2,0px (`raioBase` em
 * `SEMENTES_BRASA`, `temas/junino.ts`); um alvo tem dezenas de pixels de
 * diâmetro (a régua do motor, `RAIO = 0,055` do lado menor da tela, ~24px
 * num canvas de 430px de largura — `motor-reflexo.ts`). Uma ordem de
 * grandeza de folga entre as duas escalas é o que sustenta os limiares
 * abaixo. Por isso um candidato só é aceito se os quatro vizinhos a
 * `RAIO_FOOTPRINT` de distância (acima, abaixo, esquerda, direita) TAMBÉM
 * mudaram — uma brasa não tem essa extensão em nenhuma das quatro direções ao
 * mesmo tempo; um alvo real tem, na maior parte da própria vida — calibrado
 * observando o jogo rodando de verdade em navegador, não só a olho na
 * fórmula.
 *
 * DEVOLVE TODOS OS CANDIDATOS, NÃO SÓ O PRIMEIRO (achado da revisão final de
 * branch): a versão anterior parava no primeiro pixel que passasse nos dois
 * critérios e devolvia só ele. Isso bastava para "existe alvo em algum
 * lugar" (`acharAlvo`/`esperarAlvo` abaixo, que só precisam de UM), mas não
 * serve para "nenhum alvo está numa zona proibida" — essa pergunta precisa
 * checar TODOS os alvos vivos, não só o primeiro que a varredura encontrar,
 * senão um segundo ou terceiro alvo nascido dentro de uma zona passaria
 * batido sempre que o primeiro encontrado estivesse limpo. `acharAlvo` e
 * `acharAlvoEmZonaProibida` (abaixo) COMPARTILHAM este mesmo detector — cor
 * nunca vai ser um jeito seguro de identificar alvo, e reescrever a
 * comparação de quadros duas vezes neste arquivo arriscaria as duas cópias
 * divergirem e uma delas ficar com a calibração velha.
 *
 * FALHA ALTO, NÃO EM SILÊNCIO: sem nenhum candidato que passe nos dois
 * critérios (mudou E tem corpo), a função devolve array vazio — nunca uma
 * coordenada chutada. Quem chama trata array vazio como "não achei ainda" e
 * tenta de novo dentro do próprio orçamento de tempo do teste; se a janela
 * inteira passar sem achar nada, é a asserção do teste que reprova, com a
 * mensagem de sempre — não esta função inventando um clique no vazio.
 */
async function acharTodosAlvos(page: Page): Promise<Array<{ x: number; y: number }>> {
  return page.evaluate(async () => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return []
    const ctx = canvas.getContext('2d')
    if (!ctx) return []
    const caixa = canvas.getBoundingClientRect()

    const ler = () => ctx.getImageData(0, 0, canvas.width, canvas.height).data
    const antes = ler()
    // ~200ms: menor que a vida de um alvo (1050-1400ms) e maior que um
    // quadro de rAF — tempo suficiente para o balanço/encolhimento/estouro
    // do tema (ou o nascimento/expiração de um alvo, mesmo sob
    // `prefers-reduced-motion`, onde o desenho em si não anima) produzirem
    // diferença real entre os dois quadros.
    await new Promise((resolve) => setTimeout(resolve, 200))
    const depois = ler()

    const largura = canvas.width
    const altura = canvas.height
    // Passo de 4px: o alvo tem dezenas de pixels de diâmetro, e varrer de um
    // em um custaria mais do que a própria janela de comparação.
    const PASSO = 4
    // Raio do "corpo" exigido nas quatro direções cardeais — grande o
    // bastante para nenhuma brasa do fundo alcançar (raioBase 1,1-2,0px, ver
    // `SEMENTES_BRASA` em `temas/junino.ts`), pequeno o bastante para caber
    // dentro de um alvo real mesmo no instante em que ele está menor (perto
    // de expirar) — RAIO = 0,055 do lado menor da tela em
    // `motor-reflexo.ts`. Calibrado contra o jogo rodando de verdade em
    // navegador.
    const RAIO_FOOTPRINT = 6
    // Soma das diferenças absolutas de R+G+B entre os dois quadros.
    const LIMIAR_DIFF = 40
    // O pixel no quadro ATUAL precisa estar aceso de verdade — descarta
    // sombra/ruído de antialiasing que mudou um pouco mas não é nada.
    const LIMIAR_BRILHO = 70

    const indice = (px: number, py: number) => (py * largura + px) * 4
    const mudouEAceso = (px: number, py: number): boolean => {
      const i = indice(px, py)
      const diferenca =
        Math.abs(antes[i]! - depois[i]!) +
        Math.abs(antes[i + 1]! - depois[i + 1]!) +
        Math.abs(antes[i + 2]! - depois[i + 2]!)
      if (diferenca <= LIMIAR_DIFF) return false
      const brilhoAtual = Math.max(depois[i]!, depois[i + 1]!, depois[i + 2]!)
      return brilhoAtual > LIMIAR_BRILHO
    }

    const candidatos: { x: number; y: number }[] = []
    for (let py = RAIO_FOOTPRINT; py < altura - RAIO_FOOTPRINT; py += PASSO) {
      for (let px = RAIO_FOOTPRINT; px < largura - RAIO_FOOTPRINT; px += PASSO) {
        if (!mudouEAceso(px, py)) continue
        // O CORPO: os quatro vizinhos cardeais também mudaram e estão
        // acesos. É o que separa um alvo de verdade (dezenas de pixels) de
        // uma brasa (poucos pixels) — ver o comentário da função.
        if (
          mudouEAceso(px, py - RAIO_FOOTPRINT) &&
          mudouEAceso(px, py + RAIO_FOOTPRINT) &&
          mudouEAceso(px - RAIO_FOOTPRINT, py) &&
          mudouEAceso(px + RAIO_FOOTPRINT, py)
        ) {
          candidatos.push({
            x: caixa.left + (px / largura) * caixa.width,
            y: caixa.top + (py / altura) * caixa.height,
          })
        }
      }
    }
    return candidatos
  })
}

/** Atalho sobre `acharTodosAlvos` para quem só precisa de UM alvo vivo,
 *  qualquer um — o caso comum de "clicar em algo que existe" ou "provar que
 *  a dobra tem alvo na tela". */
async function acharAlvo(page: Page): Promise<{ x: number; y: number } | null> {
  const candidatos = await acharTodosAlvos(page)
  return candidatos[0] ?? null
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
 * Entre TODOS os alvos vivos que `acharTodosAlvos` encontra neste instante,
 * devolve o primeiro cuja coordenada cai DENTRO da caixa de um bloco
 * `[data-zona-jogo]` — os blocos de DOM que `CapaJogo.tsx` mede e passa como
 * `zonasProibidas` ao motor (job 2 do redesign). `null` quando nenhum alvo
 * vivo viola zona nenhuma, que é o resultado esperado em toda leitura.
 *
 * REESCRITO (achado da revisão final de branch, headline finding): a versão
 * anterior varria o canvas atrás de um pixel batendo `pixels[i] > 200 &&
 * pixels[i+1] > 140 && pixels[i+2] < 80` — a MESMA heurística de cor que
 * `acharTodosAlvos` já tinha abandonado (ver o comentário dele) pelo mesmo
 * motivo, só que esta função nunca foi atualizada junto. O escurecimento de
 * borda do balão — a correção do achado anterior, que fez posição vencer
 * matiz (ver `NEUTRO_ESCURO_BORDA`/`FRONTALIDADE_POR_GOMO` em
 * `temas/junino.ts`) — empurra `#FFB020` para algo perto de `rgb(64,44,13)`,
 * e o pixel mais claro que um balão vivo chega a mostrar mede perto de
 * `rgb(230,124,89)` — canal verde 124, abaixo do `> 140` que este critério
 * exigia. MEDIDO em 10 alvos vivos, dois viewports: ZERO pixel bateu esse
 * critério perto de qualquer um deles. O teste que chama esta função
 * afirmava `null` e recebia `null` incondicionalmente — guardava a classe de
 * defeito mais cara desta rota (um alvo que o olho vê e o clique não
 * alcança, o C1 original) e tinha parado de guardar qualquer coisa.
 *
 * A CORREÇÃO REUSA `acharTodosAlvos`, não inventa um segundo detector: cor
 * nunca vai ser um jeito seguro de identificar alvo (qualquer tema pode
 * reusar qualquer cor da própria paleta em qualquer parte do fundo, de
 * propósito — é exatamente o que já quebrou esta função uma vez), e a
 * comparação de quadros já é a forma calibrada e funcionando de achar alvo
 * neste arquivo. A única lógica própria que sobra aqui é o filtro por zona
 * proibida — comparar cada candidato às caixas de `[data-zona-jogo]`, que
 * não tem nada a ver com detecção de alvo e por isso não pertence a
 * `acharTodosAlvos`.
 */
async function acharAlvoEmZonaProibida(
  page: Page,
): Promise<{ x: number; y: number } | null> {
  const candidatos = await acharTodosAlvos(page)
  if (candidatos.length === 0) return null

  const blocos = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-zona-jogo]')).map((el) => {
      const r = el.getBoundingClientRect()
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }
    }),
  )
  if (blocos.length === 0) return null

  for (const candidato of candidatos) {
    for (const bloco of blocos) {
      if (
        candidato.x >= bloco.left &&
        candidato.x <= bloco.right &&
        candidato.y >= bloco.top &&
        candidato.y <= bloco.bottom
      ) {
        return candidato
      }
    }
  }
  return null
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

  // `acertos?`: ver o comentário do primeiro teste desta suíte que usa o
  // mesmo locator — "1 acerto" (singular) não contém a palavra "acertos".
  const placar = page.locator('text=/\\d+ acertos?/')
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
    // `acertos?`: 1 é singular ("1 acerto") desde a correção do defeito — a
    // âncora `$` sem o "s" opcional nunca bateria nesse valor específico.
    if (/^[1-9]\d* acertos?$/.test(((await placar.textContent()) ?? '').trim())) break
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

// Job 3 do redesign (2026-08): o canvas ERA `aria-hidden` sem `tabindex` —
// um visitante de teclado tinha o título, o subtítulo, o botão de WhatsApp e
// nenhuma prova interativa, que é exatamente o que a dobra existe para
// mostrar. Este teste prova as duas pontas: o Tab chega ao canvas como o
// primeiro elemento focável da dobra (não há header nem skip link nesta
// rota — ver app/[locale]/ativacoes/layout.tsx), e a barra de espaço acerta
// o alvo em foco de verdade, não só dispara um evento que não faz nada.
test('a dobra é alcançável e jogável pelo teclado', async ({ page }) => {
  test.setTimeout(20_000)
  await page.goto('/pt/ativacoes/')

  await page.keyboard.press('Tab')
  const focoInicial = await page.evaluate(() => document.activeElement?.tagName)
  expect(focoInicial, 'o canvas não é o primeiro elemento focável da dobra').toBe('CANVAS')

  // `acertos?`: ver o comentário do primeiro teste desta suíte que usa o
  // mesmo locator — "1 acerto" (singular) não contém a palavra "acertos".
  const placar = page.locator('text=/\\d+ acertos?/')
  await expect(placar).toBeVisible()

  // ORÇAMENTO DE TEMPO, não de tentativas — mesmo motivo do teste de
  // ponteiro acima: com workers disputando a máquina o laço de rAF fica
  // lento, e uma única tentativa pode cair exatamente entre dois alvos.
  const limite = Date.now() + 7000
  let acertou = false
  while (Date.now() < limite && !acertou) {
    await page.keyboard.press('Space')
    // O placar só atravessa para o React no quadro seguinte ao acerto.
    await page.waitForTimeout(150)
    // `acertos?`: 1 é singular ("1 acerto") desde a correção do defeito.
    if (/^[1-9]\d* acertos?$/.test(((await placar.textContent()) ?? '').trim())) acertou = true
  }
  expect(acertou, 'a barra de espaço nunca acertou o alvo em foco').toBe(true)
})

// Job 2 do redesign: a auditoria mediu 9,4%-15,6% dos alvos nascendo embaixo
// de um bloco de DOM que intercepta o clique — cerca de dois em cinco deles
// visíveis sobre texto transparente, o pior defeito possível numa demo.
// Varre o canvas repetidamente por uma janela de tempo, no viewport mais
// apertado (390px, onde o conteúdo cobre a maior fração da dobra), e falha
// se algum pixel de alvo cair dentro da caixa de um bloco que intercepta o
// ponteiro.
test('nenhum alvo nasce sob um bloco de DOM que intercepta o clique', async ({ page }) => {
  test.setTimeout(20_000)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/pt/ativacoes/')

  const canvas = page.locator('canvas')
  await expect(canvas).toBeVisible()
  // Prova de que o teste testou alguma coisa: sem isto, uma página que nunca
  // marcasse zona nenhuma passaria pela razão errada.
  await expect(page.locator('[data-zona-jogo]').first()).toBeAttached()

  const limite = Date.now() + 8000
  while (Date.now() < limite) {
    const violacao = await acharAlvoEmZonaProibida(page)
    expect(violacao, `alvo desenhado dentro de zona proibida: ${JSON.stringify(violacao)}`).toBeNull()
    await page.waitForTimeout(200)
  }
})
