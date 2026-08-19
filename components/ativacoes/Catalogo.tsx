import type { Dictionary } from '@/content/types'
import { ArteAtivacao, type VarianteArte } from './arte-ativacoes'

/**
 * Uma arte por bloco, na ordem do dicionário. A lista fica FORA do `map` e é
 * `as const` para os nomes de variante ficarem checados contra `VarianteArte`
 * — errar `'jogo'` em vez de `'jogos'` aqui é erro de compilação.
 *
 * O QUE ISTO NÃO FAZ: travar a quantidade. `catalogo.blocos` é array sem
 * tamanho fixo em `content/types.ts`, então `ARTES[i]` é sempre
 * `VarianteArte | undefined` — daí o `?? 'jogos'` logo abaixo, que existe
 * porque indexar um array sem tamanho fixo não é algo que `tsc` consiga
 * recusar em tempo de build. Um quinto bloco no dicionário passa no
 * `typecheck` limpo e renderiza calado com o desenho errado.
 *
 * Quem pega isso são os testes, não o tipo: `tests/content.test.ts` trava
 * exatamente quatro blocos no dicionário, e
 * `tests/unit/ativacoes-catalogo.test.tsx` trava exatamente quatro `<li>` na
 * seção. São eles a proteção de verdade — não apagar como "redundante com o
 * tipo", porque não é.
 */
const ARTES = ['jogos', 'captura', 'operacao', 'dados'] as const satisfies readonly VarianteArte[]

/**
 * O que costura os quatro blocos não é a lista de artefatos, é quem compra:
 * uma agência montando uma ativação precisa dos quatro ao mesmo tempo, e é
 * raro achar quem entregue mais de dois.
 *
 * A LINHA DE ESCOPO NEGATIVO FECHA A SEÇÃO, e não é rodapé. Sem ela um
 * diretor de operações lê "totem" e "telão" e assume locação de equipamento —
 * que é o negócio ao lado, de logística, e que a dupla não tem. Dizer o que
 * não se faz aqui custa uma frase; descobrir na reunião custa a reunião.
 */
export function Catalogo({ dict }: { dict: Dictionary }) {
  const { catalogo } = dict.ativacoes

  return (
    <section className="border-t border-border">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-20 sm:py-28">
        <h2 className="revelar-titulo font-serif text-4xl tracking-tight text-text sm:text-5xl">
          {catalogo.titulo}
        </h2>
        <ul className="revelar grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
          {catalogo.blocos.map((bloco, i) => (
            <li key={bloco.nome} className="flex flex-col gap-3 bg-surface p-6">
              {/* A arte vem antes do rótulo: no celular os blocos empilham, e
                * quatro parágrafos seguidos sem pausa visual são exatamente a
                * parede que a seção precisa quebrar. `w-20` a mantém pequena —
                * é pontuação, não ilustração. */}
              <div className="w-20">
                <ArteAtivacao variante={ARTES[i] ?? 'jogos'} />
              </div>
              <h3 className="font-mono text-xs uppercase tracking-[0.15em] text-data">
                {bloco.nome}
              </h3>
              <p className="text-[17px] leading-relaxed text-muted">{bloco.corpo}</p>
            </li>
          ))}
        </ul>
        <p className="max-w-2xl border-l-2 border-border pl-4 text-[17px] leading-relaxed text-faint">
          {catalogo.escopo}
        </p>
      </div>
    </section>
  )
}
