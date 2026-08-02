import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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
