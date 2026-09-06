import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * O LOCKFILE JÁ DERRUBOU ESTE DEPLOY TRÊS VEZES, sempre do mesmo jeito e
 * sempre depois de todos os outros portões passarem localmente.
 *
 * `npm install` rodado no Windows PODA entradas de pacotes que não se instalam
 * ali — `@emnapi/runtime` e `@emnapi/core`, dependências transitivas de
 * `@tailwindcss/oxide-wasm32-wasi` e de `@img/sharp-wasm32`. O arquivo fica
 * válido para quem gerou e incompleto para o runner Linux, onde `npm ci` para
 * com "Missing: @emnapi/runtime@… from lock file" ANTES do lint.
 *
 * O que NÃO detecta isso, e foi tentado: `npm ci --dry-run`, inclusive com
 * `--os=linux --cpu=x64`. Os dois passam no Windows sobre um lockfile que o CI
 * recusa. O comentário do `.github/workflows/deploy.yml` já avisava disso.
 *
 * Este teste faz a resolução no papel — o que o `npm ci` faz de fato — e roda
 * em qualquer plataforma porque não instala nada. Custa milissegundos e é o
 * único portão local que enxerga o defeito.
 *
 * QUANDO ELE FALHAR, o conserto está no workflow: regerar o lockfile no mesmo
 * Linux do runner.
 *
 *   docker run --rm -v "$PWD:/w" -w /w node:24 \
 *     sh -c "rm -f package-lock.json && npm install --package-lock-only"
 */

type Pacote = { dependencies?: Record<string, string> }

const lock = JSON.parse(readFileSync(join(process.cwd(), 'package-lock.json'), 'utf8')) as {
  packages: Record<string, Pacote>
}

/**
 * Resolve `nome` a partir de `origem` como o Node resolve: procura em
 * `<origem>/node_modules/<nome>` e sobe um nível de `node_modules` por vez até
 * a raiz.
 *
 * O pacote de topo é `node_modules/foo`, SEM barra inicial — então
 * `lastIndexOf('/node_modules/')` não acha nada nele. Sem o degrau explícito
 * para a raiz, a busca pararia no primeiro nível e acusaria mil dependências
 * inexistentes como ausentes. Foi o primeiro bug desta função.
 */
function resolve(origem: string, nome: string): string | null {
  let base = origem
  for (;;) {
    const tentativa = base === '' ? `node_modules/${nome}` : `${base}/node_modules/${nome}`
    if (tentativa in lock.packages) return tentativa
    if (base === '') return null
    const corte = base.lastIndexOf('/node_modules/')
    base = corte === -1 ? '' : base.slice(0, corte)
  }
}

describe('package-lock.json', () => {
  it('não tem dependência órfã — é o que o npm ci recusa no runner Linux', () => {
    const faltando: string[] = []

    for (const [caminho, meta] of Object.entries(lock.packages)) {
      // Só `dependencies`. `optionalDependencies` e `peerDependencies` podem
      // faltar legitimamente quando a plataforma não as usa — é assim que
      // binário nativo de outra arquitetura fica de fora sem quebrar nada.
      // `@emnapi/runtime` é dependência NORMAL do pacote wasm32-wasi, e por
      // isso a ausência dela é erro.
      for (const nome of Object.keys(meta.dependencies ?? {})) {
        if (resolve(caminho, nome) === null) {
          faltando.push(`Missing: ${nome} (exigido por ${caminho || 'raiz'})`)
        }
      }
    }

    expect(
      [...new Set(faltando)].sort(),
      'lockfile incompleto — regere no Linux, ver o comentário no topo deste arquivo',
    ).toEqual([])
  })

  /**
   * A trava específica do caso conhecido. O teste acima já cobre, mas este
   * nomeia o pacote: quando alguém rodar `npm install` no Windows e este
   * quebrar, a mensagem diz na hora o que aconteceu, sem precisar decifrar uma
   * lista de caminhos.
   */
  it('mantém as entradas de @emnapi que o npm do Windows poda', () => {
    const emnapi = Object.keys(lock.packages).filter((k) => k.endsWith('node_modules/@emnapi/runtime'))
    expect(emnapi.length, '@emnapi/runtime sumiu do lockfile — foi gerado no Windows?').toBeGreaterThan(0)
  })
})
