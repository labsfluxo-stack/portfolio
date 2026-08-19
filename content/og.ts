// Extensão .ts explícita: este módulo também é carregado direto pelo Node
// (scripts/generate-og.mts, `node --experimental-strip-types`), que exige
// especificador de import resolvido, ao contrário do bundler do Next.
import { SYSTEM_SLUGS } from './types.ts'

// Fonte única dos alvos de Open Graph: `home`, os 3 sistemas e as duas
// landings (captação e ativações). Vive em `content/` (e não dentro da
// própria rota) porque tem
// DOIS consumidores que não podem compartilhar o mesmo caminho de import —
// `app/[locale]/og/[slug]/page.tsx` (componente Next, JSX) e
// `scripts/generate-og.mts` (roda com `node --experimental-strip-types`,
// que não sabe carregar `.tsx`: falha com ERR_UNKNOWN_FILE_EXTENSION antes
// mesmo de tropeçar nos colchetes do caminho). Sem este módulo neutro, a
// rota derivava de SYSTEM_SLUGS e o script mantinha cópia escrita à mão —
// coincidiam por sorte. Ver tests/unit/og-slugs.test.ts.
export const OG_SLUGS = ['home', 'projetos', 'ativacoes', ...SYSTEM_SLUGS] as const
export type OgSlug = (typeof OG_SLUGS)[number]
