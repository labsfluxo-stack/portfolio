import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  // WORKERS FIXOS, e não o padrão (metade dos núcleos — 12 nesta máquina).
  //
  // MEDIDO: a 12 workers a suíte reprova 6 casos por tempo esgotado, e 5 deles
  // não têm relação nenhuma com a rota mais nova — `anchor-nav`, `case-study`,
  // `home-luz`, `home-revelacao`, `home-textura`. A 4 workers os 42 passam, em
  // 45s. A contenção é orçamento de máquina, não defeito de página; mas uma
  // suíte que reprova por concorrência deixa de ser um portão em que se confia,
  // porque falha real e ruído passam a ser indistinguíveis.
  // Em CI, 1: runner de 2 vCPUs não ganha nada paralelizando navegador.
  workers: process.env.CI ? 1 : 4,
  use: { baseURL: 'http://localhost:4173/portfolio' },
  webServer: {
    // `npx serve out` (o comando previsto originalmente) não resolve o
    // basePath do GitHub Pages de forma confiável: o rewrite via
    // `serve.json` (`/portfolio/:path*` -> `/:path*`) depende do
    // path-to-regexp interno do pacote, que não interpreta o modificador
    // `*` como esperado e serve sempre a mesma rota errada, não importa o
    // caminho pedido (verificado empiricamente). `scripts/e2e-static-server.mts`
    // é um servidor mínimo que aceita o caminho com ou sem o prefixo
    // `/portfolio` e serve o arquivo de `out/` correspondente.
    command: 'node --experimental-strip-types scripts/e2e-static-server.mts',
    url: 'http://localhost:4173/portfolio/pt/',
    reuseExistingServer: !process.env.CI,
  },
})
