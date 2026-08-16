import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import jsxA11y from 'eslint-plugin-jsx-a11y'

export default tseslint.config(
  // `.wrangler/**` é o bundle temporário que `wrangler dev` gera ao rodar o
  // Worker localmente. É código gerado, já ignorado pelo git — mas o ESLint
  // de config plana não lê o .gitignore, então precisa constar aqui também.
  { ignores: ['.next/**', 'out/**', 'node_modules/**', 'workers/**/.wrangler/**'] },
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
