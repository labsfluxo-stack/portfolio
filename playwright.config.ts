import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
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
