import Link from 'next/link'
import type { Dictionary, Locale } from '@/content/types'
import { ANDARES, type ObjetoDoAndar } from './predio-programa'
import { corDoAndar, corDoRotulo } from './predio-luz'
import { PredioIndicador } from './PredioIndicador'

// Mesma constante que Header.tsx, PhotoFrame.tsx e lib/seo.ts já usam: a
// forma canônica de ler o `basePath` fora do que o Next resolve sozinho.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '/portfolio'

/**
 * O prédio inteiro em HTML semântico — e não um aviso de navegador sem suporte.
 *
 * É o que o GPTBot/ClaudeBot lê, o que aparece antes do JS hidratar, o que roda
 * em aparelho sem WebGL e o que fica no lugar da cena quando o visitante pediu
 * movimento reduzido. Por isso carrega o texto de verdade e os links de verdade:
 * quem cai aqui recebe o site, não uma desculpa.
 *
 * A cor vem de `predio-luz.ts`, a mesma que a cena usa, então o fallback é a
 * versão chapada do mesmo prédio — não um segundo desenho que envelhece sozinho.
 *
 * UM ANDAR POR TELA, SEM BARRA DE ROLAGEM (decisão do dono, 2026-09-07 — ver
 * docs/superpowers/specs/2026-09-06-predio-home-design.md). O `<div>` raiz é
 * o elemento que rola: `.tela-cheia` (100dvh, com reserva em 100vh — ver
 * globals.css) dá a ele a altura exata de uma tela, `overflow-y-auto` é o
 * que MANTÉM a rolagem funcionando (roda, toque, Page Down/Home/End/setas —
 * nunca `overflow-hidden`), e `.sem-barra-de-rolagem` só pinta por cima,
 * escondendo a barra sem tocar no `overflow`. `snap-y snap-mandatory` +
 * `snap-start` em cada andar (rolagem nativa, sem biblioteca) faz a parada
 * cair alinhada ao topo da tela, sem JavaScript.
 *
 * Cada `<section>` usa a MESMA `.tela-cheia`: a spec pede uma tela inteira
 * por andar, não "pelo menos uma" — por isso `flex` + `justify-center` para
 * centralizar o conteúdo dentro da altura fixa, em vez de deixar `py-14`
 * decidir a altura como antes.
 *
 * `PredioIndicador` substitui a barra de rolagem que sumiu: é o que diz que
 * a descida continua e onde se está dentro dela.
 */
export function PredioFallback({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const itensDoIndicador = ANDARES.map((andar) => ({
    id: `predio-${andar.chave}`,
    rotulo: dict.predio[andar.chave].titulo,
  }))

  return (
    <div
      // SEM `scroll-smooth`: este componente é também o que fica no lugar da
      // cena quando `prefers-reduced-motion` está ligado, e `scroll-behavior:
      // smooth` não respeita essa preferência sozinho — animaria o salto de
      // um clique no indicador mesmo para quem pediu para não ver isso.
      className="tela-cheia sem-barra-de-rolagem w-full snap-y snap-mandatory overflow-y-auto"
    >
      {ANDARES.map((andar, i) => {
        const texto = dict.predio[andar.chave]
        return (
          <section
            key={andar.chave}
            id={`predio-${andar.chave}`}
            aria-labelledby={`predio-${andar.chave}-titulo`}
            style={{ backgroundColor: corDoAndar(i), color: corDoRotulo(i) }}
            className="tela-cheia flex snap-start items-center px-6 sm:px-10"
          >
            <div className="mx-auto flex max-w-5xl flex-col gap-3">
              {andar.numero !== null && (
                <span className="font-mono text-xs opacity-70">
                  {String(andar.numero).padStart(2, '0')}
                </span>
              )}
              <h2 id={`predio-${andar.chave}-titulo`} className="text-2xl font-semibold">
                {texto.titulo}
              </h2>
              <p className="max-w-2xl opacity-90">{texto.resumo}</p>
              {andar.objetos.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-4">
                  {andar.objetos.map((objeto) => (
                    <li key={objeto.id}>
                      <LinkDoObjeto locale={locale} objeto={objeto} rotulo={texto.objetos[objeto.id]} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )
      })}
      <PredioIndicador itens={itensDoIndicador} rotuloNav={dict.a11y.predioNav} />
    </div>
  )
}

// 44px de alvo de toque. Abaixo disso o dedo erra, e celular é requisito
// duro desta home.
const CLASSE_LINK = 'inline-flex min-h-11 items-center underline underline-offset-4'

/**
 * Um objeto de andar vira link real de duas formas, e a escolha não é gosto.
 *
 * `destino` em `/#hash` aponta para uma seção da PRÓPRIA home — a mesma
 * situação que `Header.tsx` já resolve com `<a>` cru e `basePath` manual, e
 * pela mesma razão: um `<Link>` do Next dispara transição client-side cuja
 * rolagem até o hash não é síncrona com o clique (corrida que o comentário de
 * `Header.tsx` documenta). Este fallback tanto pode acabar embutido na
 * própria home (quando `PredioSlot` existir) quanto vive sozinho na rota de
 * prévia — nos dois casos o alvo é a mesma seção da home, então a mesma
 * solução vale aqui.
 *
 * `destino` de caminho (`/projetos`, `/blog`) é navegação de verdade entre
 * páginas — aí `<Link>` é o padrão do resto do site (ver `blog/page.tsx`) e
 * resolve o `basePath` sozinho.
 */
function LinkDoObjeto({
  locale,
  objeto,
  rotulo,
}: {
  locale: Locale
  objeto: ObjetoDoAndar
  // `Record<string, string>` sob `noUncheckedIndexedAccess` — o par
  // objeto/rótulo é garantido pela suíte de predio-programa.test.ts, não
  // pelo tipo. Aceitar `undefined` aqui é mais honesto que forçar com `!`.
  rotulo: string | undefined
}) {
  if (objeto.destino.startsWith('/#')) {
    return (
      <a href={`${BASE_PATH}/${locale}${objeto.destino}`} className={CLASSE_LINK}>
        {rotulo}
      </a>
    )
  }
  return (
    <Link href={`/${locale}${objeto.destino}`} className={CLASSE_LINK}>
      {rotulo}
    </Link>
  )
}
