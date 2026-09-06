import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import mdx from '@mdx-js/rollup'

export default defineConfig({
  plugins: [
    // MDX ANTES DO REACT, e a ordem é obrigatória: o plugin de MDX transforma
    // `.mdx` em JSX, e o de React precisa receber JSX já formado. Sem o plugin
    // de MDX aqui, importar `content/posts.ts` num teste faz o Vite tentar
    // analisar o artigo como JavaScript — e ele falha na primeira aspa dentro
    // do texto, que foi exatamente como isto quebrou da primeira vez.
    //
    // O build do Next usa `@next/mdx` e não este plugin; são dois caminhos para
    // a mesma transformação, cada um no seu empacotador. O que mantém os dois
    // honestos é `tests/blog-conteudo.test.ts` rodar sobre os artigos de
    // verdade e `npm run build` gerar as rotas de verdade.
    mdx(),
    react(),
  ],
  // Resolução nativa dos paths do tsconfig (o alias @/*). Substitui o plugin
  // vite-tsconfig-paths, que passou a emitir aviso de depreciação a cada run —
  // saída de teste precisa ser limpa para que um aviso real seja notado.
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    include: ['tests/**/*.test.{ts,tsx}'],
    exclude: ['tests/e2e/**', 'tests/static-html.test.ts'],
  },
})
