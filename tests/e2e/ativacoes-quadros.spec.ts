import { expect, test } from '@playwright/test'

/**
 * PORTÃO DE QUADROS DA DOBRA DE ATIVAÇÕES — o gate que a Task 3 (tema junino)
 * deixou como lacuna registrada.
 *
 * A capa (`CapaJogo.tsx`) já era um jogo de reflexo rodando a 60Hz antes do
 * tema; o que mudou é o fundo (`TEMA_ATIVO.desenharFundo`, `temas/junino.ts`):
 * bandeirinhas (um sprite estático, barato) e brasas em deriva (dez emissores
 * aditivos, com dois arcos cada, redesenhados A CADA QUADRO — nunca
 * cacheados, porque se movem). É a primeira coisa nesta rota que é custo de
 * preenchimento de verdade, e por isso a primeira que pode degradar sem
 * ninguém notar: o balão em si já tinha o próprio portão de tolerância de
 * acerto (`tests/unit/ativacoes-tema.test.ts`), mas nada media quadro por
 * segundo com o fundo novo ligado. Uma medição pontual registrou 59,88fps
 * mediano sob CPU 4× antes do tema — mas medição pontual não é portão: não
 * roda de novo sozinha, e não teria pego uma brasa a mais, um `shadowBlur`
 * esquecido, nada.
 *
 * Segue o MESMO MOLDE de `medir-quadros.spec.ts` (leia esse arquivo primeiro
 * se for mexer aqui): mede com `requestAnimationFrame`, ordena os deltas e
 * tira a mediana — não a média, que um único quadro de compilação/GC no meio
 * da janela distorce para cima do que a experiência real é.
 *
 * SÓ CHROMIUM: o estrangulamento de CPU vem do CDP, protocolo do Chrome — a
 * mesma alavanca do painel Performance do DevTools, e não existe em
 * Firefox/WebKit via Playwright.
 *
 *   npx playwright test tests/e2e/ativacoes-quadros.spec.ts
 *
 * SEM `--project=chromium`: `playwright.config.ts` deste repositório não
 * declara nenhum `projects` nomeado, então essa flag erra com "Project(s)
 * chromium not found" em vez de selecionar o navegador. Sem `projects`, o
 * Playwright já roda com um único projeto padrão em Chromium — é por isso
 * que `test.skip(browserName !== 'chromium', ...)` acima nunca pula nada
 * neste repositório, e por isso a flag não faz falta.
 */

/**
 * Conta quadros por `duracao` ms SEM rolar a página — ao contrário da home,
 * o fundo do junino anima sozinho a cada `requestAnimationFrame`
 * (`desenharBrasas` lê `agora` a cada passada do laço em `CapaJogo.tsx`), e
 * não depende de scroll para custar quadro. Rolar aqui só tiraria a dobra da
 * tela e mudaria o que está sendo medido.
 */
const CONTAR = `
  (duracao) => new Promise((resolve) => {
    const inicio = performance.now()
    const deltas = []
    let anterior = inicio
    const passo = (agora) => {
      deltas.push(agora - anterior)
      anterior = agora
      if (agora - inicio < duracao) requestAnimationFrame(passo)
      else {
        const ordenados = [...deltas].sort((a, b) => a - b)
        const mediana = ordenados[ordenados.length >> 1] ?? 0
        const pior = ordenados[Math.floor(ordenados.length * 0.95)] ?? 0
        resolve({
          quadros: deltas.length,
          fpsMedio: 1000 / (deltas.reduce((s, d) => s + d, 0) / deltas.length),
          fpsMediana: 1000 / mediana,
          piorQuadroMs: pior,
        })
      }
    }
    requestAnimationFrame(passo)
  })
`

/**
 * O PISO É 45, NÃO 59,88 — DE PROPÓSITO. Esta suíte NÃO roda no CI (ver
 * `.github/workflows/deploy.yml`: lint, typecheck, `npm test`, build e
 * `test:html`, nunca `playwright test`); ela roda na máquina de quem estiver
 * mexendo na rota, com o hardware, os drivers de GPU e os programas abertos
 * que essa máquina tiver. 59,88fps foi UMA leitura, numa máquina, num
 * instante — travar o piso perto dela reprovaria em qualquer computador um
 * degrau mais lento (ou só com mais abas abertas), e um portão que reprova
 * por hardware alheio é um portão que a próxima pessoa aprende a desligar em
 * vez de a respeitar. 45fps é bem abaixo dos 59,88 medidos e ainda assim
 * longe de 30 (o piso de "perceptível como travado" para a maioria das
 * pessoas): sobra para variação de máquina, e ainda pega uma regressão de
 * verdade — o fundo custando o dobro, um `shadowBlur` reintroduzido, uma
 * brasa que virou cem.
 */
const PISO_FPS_MEDIANA = 45

/** Pelo menos 3s, como o brief pede — janela curta o bastante para não
 *  pesar a suíte local, longa o bastante para os dez emissores de brasa
 *  passarem por vários ciclos de fase (o mais rápido, 2000ms, e o mais
 *  lento, 3600ms — ver `SEMENTES_BRASA` em `temas/junino.ts`) dentro da
 *  própria medição, não só no aquecimento. */
const JANELA_MS = 4000

// `prefers-reduced-motion` DESLIGADO, de propósito — o brief pede a medição
// no caso caro: sob menos movimento o fundo continua (só o balanço do balão
// e o jogador automático desligam, ver `CapaJogo.tsx` e `desenharFundo` em
// `temas/junino.ts`, que trava `tempo` em 0 SÓ sob `parado`), mas é o
// caminho SEM `parado` que soma o balanço do elemento por cima do fundo
// animado — o pior caso de verdade, e o único que interessa a um portão de
// desempenho. `no-preference` já é o padrão do Playwright sem nenhuma
// configuração, mas fica explícito aqui porque o teste DEPENDE dela ser
// verdadeira, não deve confiar em silêncio que ninguém mudou o padrão em
// outro lugar.
//
// `contextOptions: { reducedMotion }`, não `reducedMotion` solto — a mesma
// armadilha documentada em `ativacoes.spec.ts`: nesta versão do Playwright a
// opção solta em `test.use` é aceita e ignorada EM SILÊNCIO em tempo de
// execução (o `tsc` nem reprova em compilação — só o formato aninhado é
// válido).
test.use({ contextOptions: { reducedMotion: 'no-preference' } })

test('taxa de quadros da dobra de ativações com CPU 4x (tema junino)', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'o estrangulamento de CPU é do CDP')
  test.setTimeout(60_000)

  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })

  await page.goto('/pt/ativacoes/')
  const canvas = page.locator('canvas')
  await expect(canvas).toBeVisible({ timeout: 30_000 })

  // Aquecimento: os primeiros quadros rasterizam o sprite do balão e o das
  // bandeirinhas (`garantirSpriteBalao`/`garantirSpriteBandeirinhas`, ambos
  // com cache — só o PRIMEIRO quadro paga esse custo). Medir a partida
  // ainda no modo atrativo logo após montar mediria a partida, não o
  // regime estável.
  await page.waitForTimeout(1000)

  const medida = await page.evaluate(`(${CONTAR})(${JANELA_MS})`)

  // Imprime SEMPRE, passando ou reprovando — um portão que só fala quando
  // reprova não deixa ninguém perceber a degradação lenta até ela virar
  // penhasco. Ver o mesmo padrão em `medir-quadros.spec.ts`.
  console.log('\n── dobra de ativações, CPU 4×, tema junino ──', JSON.stringify(medida, null, 2))

  expect(
    (medida as { fpsMediana: number }).fpsMediana,
    'a mediana de quadros caiu abaixo do piso — ver o comentário de PISO_FPS_MEDIANA para o porquê de 45',
  ).toBeGreaterThanOrEqual(PISO_FPS_MEDIANA)
})
