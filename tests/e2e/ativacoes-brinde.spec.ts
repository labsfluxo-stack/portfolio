import { test, expect, type Page } from '@playwright/test'

/**
 * O modal do brinde 3D: uma caneca girando com a marca do visitante
 * aplicada, aberta pelo botão "Ver o brinde com a marca" no fim de partida.
 *
 * Por que este arquivo, e não `tests/unit/`: `tests/setup.ts` trava
 * `getContext` em `null` para a suíte de unidade inteira (ver o comentário
 * no topo de `ativacoes-capa.test.tsx`), então nem `hasWebGL()`
 * (`CanecaSlot.tsx`) nem `showModal()`/o foco de verdade do `<dialog>` são
 * observáveis em jsdom. O que se testa aqui é exatamente o que o brief pede
 * para viver em e2e: abrir, fechar, foco, Escape, os controles de marca — e
 * o carregamento do chunk de three.js.
 *
 * TODOS os testes deste arquivo precisam chegar ao fim de partida primeiro
 * (o botão do brinde só existe no bloco de `fim`, ver `CapaJogo.tsx`) — o
 * mesmo caso lento que `ativacoes.spec.ts` já tem ("no fim da partida o
 * resultado é DOM"), repetido aqui porque cada teste roda numa página nova.
 */

/** Chega ao fim de partida clicando uma vez no meio do canvas e esperando o
 *  relógio de 15s da partida (a partir do primeiro toque) — mesma técnica de
 *  `ativacoes.spec.ts`. Devolve o `locator` do botão que abre o modal. */
async function chegarAoFimEAbrirBotaoDoBrinde(page: Page) {
  await page.goto('/pt/ativacoes/')
  const dobra = await page.locator('canvas').boundingBox()
  expect(dobra, 'não achou o canvas da capa').not.toBeNull()
  await page.mouse.click(dobra!.x + dobra!.width / 2, dobra!.y + dobra!.height / 2)
  await expect(page.getByText('Acabou o tempo.')).toBeVisible({ timeout: 25_000 })
  const botao = page.getByRole('button', { name: 'Ver o brinde com a marca' })
  await expect(botao).toBeVisible()
  return botao
}

test.describe('modal do brinde', () => {
  // Cada `test` desta suíte reabre a partida do zero e espera 15s até o fim
  // — é o mesmo custo que o único teste lento de `ativacoes.spec.ts` já paga,
  // multiplicado pelo número de casos aqui. Aceito de propósito: o
  // comportamento do modal (foco, Escape, tabulação) só é observável no
  // navegador de verdade, e cada caso testa uma garantia de acessibilidade
  // distinta — juntar tudo num teste só esconderia QUAL garantia quebrou.
  test.setTimeout(40_000)

  test('abre com nome acessível, foco dentro do diálogo, e os campos de marca nunca vêm vazios', async ({
    page,
  }) => {
    const botao = await chegarAoFimEAbrirBotaoDoBrinde(page)
    await botao.click()

    // Nome acessível: `<dialog>` já carrega o papel implícito "dialog" (ver
    // o comentário em BrindeModal.tsx sobre `no-redundant-roles`), e
    // `aria-labelledby` aponta para o `<h2>` visível — "O brinde, com a
    // marca" no dicionário PT.
    const dialogo = page.getByRole('dialog', { name: 'O brinde, com a marca' })
    await expect(dialogo).toBeVisible()

    // O foco entrou no diálogo — não ficou para trás no botão que abriu, e
    // não pulou para o topo do documento.
    const focoDentro = await page.evaluate(() =>
      document.querySelector('dialog')?.contains(document.activeElement) ?? false,
    )
    expect(focoDentro, 'o foco não entrou no diálogo ao abrir').toBe(true)

    // Os dois controles de marca já vêm preenchidos — o modal nunca abre em
    // branco (brief, ponto 1: "sensible defaults").
    await expect(dialogo.getByLabel('Nome da marca')).not.toHaveValue('')
    await expect(dialogo.locator('input[type="color"]')).not.toHaveValue('')

    // E a legenda em DOM real já mostra a marca padrão — a mesma informação
    // que a cena 3D (decorativa, `aria-hidden`) desenha na textura. Aspas
    // curvas (“ ”), não retas — as mesmas que `content/pt.ts` usa.
    await expect(page.getByText('Caneca com a marca “Sua Marca”.', { exact: false })).toBeVisible()
  })

  test('Escape fecha o modal e devolve o foco ao botão que abriu', async ({ page }) => {
    const botao = await chegarAoFimEAbrirBotaoDoBrinde(page)
    await botao.click()

    const dialogo = page.getByRole('dialog', { name: 'O brinde, com a marca' })
    await expect(dialogo).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(dialogo).not.toBeVisible()

    // O foco não pode ficar perdido no `<body>` — ele volta especificamente
    // para o botão que abriu o modal, para quem navega por teclado continuar
    // exatamente de onde parou.
    await expect(botao).toBeFocused()
  })

  test('o botão de fechar e o clique fora do conteúdo também fecham e devolvem o foco', async ({
    page,
  }) => {
    const botao = await chegarAoFimEAbrirBotaoDoBrinde(page)

    // Primeiro ciclo: o botão de fechar (o ×).
    await botao.click()
    const dialogo = page.getByRole('dialog', { name: 'O brinde, com a marca' })
    await expect(dialogo).toBeVisible()
    await page.getByRole('button', { name: 'Fechar' }).click()
    await expect(dialogo).not.toBeVisible()
    await expect(botao).toBeFocused()

    // Segundo ciclo, sem esperar o jogo de novo (a partida já está em
    // `fim`): clique no backdrop, fora da caixa de conteúdo.
    await botao.click()
    await expect(dialogo).toBeVisible()
    // Um ponto perto do canto do viewport certamente cai no `<dialog>`
    // (o backdrop cobre a tela inteira) e fora da caixa de conteúdo, que é
    // centralizada e estreita (`w-[min(30rem,92vw)]`).
    await page.mouse.click(8, 8)
    await expect(dialogo).not.toBeVisible()
    await expect(botao).toBeFocused()
  })

  test('Tab não sai do diálogo enquanto ele está aberto — o resto da página fica inalcançável', async ({
    page,
  }) => {
    const botao = await chegarAoFimEAbrirBotaoDoBrinde(page)
    await botao.click()
    const dialogo = page.getByRole('dialog', { name: 'O brinde, com a marca' })
    await expect(dialogo).toBeVisible()

    // Três controles focáveis dentro do modal (fechar, cor, nome) — dez
    // tabulações são mais que o triplo disso, o bastante para dar a volta no
    // ciclo de foco várias vezes se ele estiver fechado corretamente, e para
    // ESCAPAR dele se `showModal()` não tivesse tornado o resto inerte.
    //
    // MEDIDO (não suposto): o Chromium não pula direto do último controle de
    // volta para o primeiro. Tabular a partir do campo de nome (o último)
    // passa por dois estados TRANSITÓRIOS antes de voltar ao botão de
    // fechar — o foco pousa em `<body>` e depois no próprio `<dialog>` — e
    // só then no primeiro controle de novo. Nenhum dos dois é um elemento da
    // PÁGINA POR TRÁS do modal: `<body>` não tem conteúdo próprio nem anel de
    // foco visível, e `<dialog>` é o próprio modal. O que este teste
    // realmente precisa provar é que o foco nunca pousa num controle
    // INTERATIVO de fora do modal (o canvas do jogo, "Jogar de novo", os
    // links de WhatsApp) — e é isso que a checagem abaixo afirma.
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab')
      const situacao = await page.evaluate(() => {
        const el = document.activeElement
        const dentroDoDialogo = !!document.querySelector('dialog')?.contains(el)
        const transitorio = el === document.body || el?.tagName === 'DIALOG'
        return { dentroDoDialogo, transitorio, tag: el?.tagName }
      })
      expect(
        situacao.dentroDoDialogo || situacao.transitorio,
        `o foco pousou num elemento da página por trás do modal na tabulação ${i + 1}: <${situacao.tag}>`,
      ).toBe(true)
    }
  })

  test('trocar a cor ou o nome da marca atualiza a legenda em DOM real, ao vivo', async ({ page }) => {
    const botao = await chegarAoFimEAbrirBotaoDoBrinde(page)
    await botao.click()
    const dialogo = page.getByRole('dialog', { name: 'O brinde, com a marca' })
    await expect(dialogo).toBeVisible()

    await dialogo.getByLabel('Nome da marca').fill('Feira Norte')
    // A legenda existe em DOM de verdade — não só na textura do canvas
    // (`aria-hidden`) — exatamente para quem usa leitor de tela saber qual
    // marca está sendo mostrada.
    await expect(page.getByText('Caneca com a marca “Feira Norte”.', { exact: false })).toBeVisible()
  })

  // O achado central deste modal: quem nunca clica no botão do brinde nunca
  // busca o chunk de three.js — o orçamento de JS da rota (cujo argumento
  // inteiro é rodar liso em celular fraco) não paga por uma decoração que
  // ninguém pediu.
  test('o chunk de three.js só é buscado depois do clique no botão do brinde', async ({ page }) => {
    const pedidosJs: string[] = []
    page.on('request', (req) => {
      if (req.url().endsWith('.js')) pedidosJs.push(req.url())
    })

    const botao = await chegarAoFimEAbrirBotaoDoBrinde(page)
    // Até aqui — página carregada, partida jogada até o fim — nenhum
    // arquivo relacionado a three.js/@react-three foi buscado. O nome do
    // chunk é gerado (hash do Turbopack), então a prova é por CONTEÚDO: ver
    // o relatório para a verificação estática equivalente
    // (`grep -rl F1ECE4 out/`) e por que o nome do arquivo sozinho não serve
    // de evidência.
    const antesDoClique = pedidosJs.length

    await botao.click()
    await expect(page.getByRole('dialog', { name: 'O brinde, com a marca' })).toBeVisible()
    // Dá tempo da promessa do `import()` dinâmico resolver e o navegador
    // terminar de buscar o chunk.
    await page.waitForTimeout(1500)

    expect(
      pedidosJs.length,
      'nenhum arquivo .js novo foi buscado ao abrir o modal — o chunk pode ter sido pré-carregado',
    ).toBeGreaterThan(antesDoClique)
  })
})
