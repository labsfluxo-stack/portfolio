import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import jsxA11y from 'eslint-plugin-jsx-a11y'

export default tseslint.config(
  // `.wrangler/**` é o bundle temporário que `wrangler dev` gera ao rodar o
  // Worker localmente. É código gerado, já ignorado pelo git — mas o ESLint
  // de config plana não lê o .gitignore, então precisa constar aqui também.
  //
  // `.superpowers/**` e a area de rascunho do repositorio (harness de render
  // de arte, scripts de captura, relatorios), tambem ja ignorada pelo git.
  // Sao scripts de Node soltos, sem tsconfig nem globais declarados, entao o
  // `no-undef` acusava `console` e `process` neles e enchia `npm run lint` de
  // erros que nao sao do produto — a ponto de o portao deixar de servir como
  // portao. Mesmo motivo do `.wrangler/**`: o git ignora, o ESLint nao sabe.
  { ignores: ['.next/**', 'out/**', 'node_modules/**', 'workers/**/.wrangler/**', '.superpowers/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'jsx-a11y': jsxA11y },
    rules: { ...jsxA11y.configs.recommended.rules },
  },
  {
    // O Worker da auditoria (workers/**) roda na Cloudflare, não no Node nem
    // no bundle do Next. Os globais dele são os da plataforma web — `fetch`,
    // `Response`, `URL`, `TextDecoder`, `AbortController` — e sem declará-los
    // o `no-undef` acusa código correto.
    files: ['workers/**/*.js'],
    languageOptions: {
      globals: {
        fetch: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        Headers: 'readonly',
        URL: 'readonly',
        TextDecoder: 'readonly',
        AbortController: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        console: 'readonly',
      },
    },
  },
)
