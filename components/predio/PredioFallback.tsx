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
 * por andar, não "pelo menos uma" — por isso `flex` (linha) + `items-center`
 * para centralizar o conteúdo NA VERTICAL dentro da altura fixa (eixo
 * cruzado de uma linha flex), com `mx-auto` + `max-w-5xl` no `<div>` de
 * dentro cuidando do centro horizontal — em vez de deixar `py-14` decidir a
 * altura como antes.
 *
 * `PredioIndicador` NÃO é mais um substituto visível da barra de rolagem —
 * decisão do dono, 2026-09-08, revisando a versão de 2026-09-07 desta mesma
 * frase: o indicador fixo foi visto no navegador e a ordem foi "some tudo".
 * Hoje ele é só navegação por teclado entre andares (sete `<a href="#…">`
 * reais, invisíveis até receberem foco — ver o comentário de
 * PredioIndicador.tsx). Sem ele e sem substituto, nada na tela avisa que
 * existem mais seis andares abaixo; esse custo é deliberado e está na spec,
 * não um esquecimento.
 *
 * `PredioIndicador` é o PRIMEIRO FILHO do contêiner, antes de qualquer
 * `<section>` — achado de revisão (2026-09-08): a razão de mantê-lo vivo é
 * deixar quem navega por teclado pular direto entre os sete andares sem
 * rolar, e essa razão não se sustenta se o menu só é alcançável DEPOIS de
 * atravessar por Tab as sete seções que ele serve para deixar pular.
 */
export function PredioFallback({
  dict,
  locale,
  semEncaixe = false,
}: {
  dict: Dictionary
  locale: Locale
  /**
   * Desliga o `scroll-snap` do contêiner que rola. `PredioSlot` liga isto
   * ENQUANTO A CENA 3D ESTÁ MONTADA, e a razão é um defeito medido, não gosto.
   *
   * Com `scroll-snap-type: y mandatory` e um ponto de encaixe a cada altura de
   * tela, o navegador leva a rolagem para o ponto de encaixe MAIS PRÓXIMO do
   * destino. Um gesto que anda menos de METADE de uma tela tem a origem como
   * ponto mais próximo — e volta para ela. O limiar é exatamente metade, medido
   * ao pixel numa janela de 800: delta 399 → `scrollTop` 0; 400 → 0; 401 → 800.
   * Uma catraca de roda de mouse de verdade entrega ~100 px. Ou seja: com o
   * encaixe obrigatório ligado, rolar com a roda não movia NADA, em nenhuma
   * altura de janela — foi o "fica travado na cobertura" que o dono relatou.
   * (`proximity` foi medido também, e não resolve: catracas de 100 px continuam
   * em 0. Só `none` deixa a rolagem acumular.)
   *
   * Por que desligar é legítimo com a cena no ar, e SÓ com ela: o encaixe
   * existe para alinhar cada `<section>` ao topo da tela — trabalho que só faz
   * sentido quando é o HTML que está sendo visto. Com a cena montada o HTML
   * está invisível atrás de um canvas opaco, e quem faz o andar "parar na tela"
   * é a curva `PARADA` de `predio-descida.ts`, que gasta 45 % da rolagem
   * desacelerando no centro de cada andar. Eram dois mecanismos para o mesmo
   * trabalho, e um deles matava a entrada do visitante.
   *
   * Sem a cena (movimento reduzido, sem WebGL, antes de hidratar) este
   * parâmetro fica `false` e a decisão do dono — "um andar por tela, sem barra
   * de rolagem" — continua valendo inteira, que é exatamente onde ela é visível.
   */
  semEncaixe?: boolean
}) {
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
      //
      // `snap-none` com a cena montada — ver `semEncaixe` acima. `overflow-y-auto`
      // NUNCA sai: é ele que permite rolar, e esconder a barra é outra coisa.
      className={`tela-cheia sem-barra-de-rolagem w-full overflow-y-auto ${
        semEncaixe ? 'snap-none' : 'snap-y snap-mandatory'
      }`}
    >
      {/* PRIMEIRO FILHO, não último (achado de revisão, 2026-09-08): a razão
       * de manter este componente vivo era deixar quem navega por teclado
       * pular direto entre os sete andares sem precisar rolar — uma
       * justificativa que a posição de antes contradizia, porque o menu só
       * era alcançável DEPOIS de atravessar por Tab as sete seções inteiras
       * que ele serve para deixar pular. Aqui, na primeira descida, o
       * visitante encontra o menu de atalho antes do conteúdo que ele
       * atalha. */}
      <PredioIndicador itens={itensDoIndicador} rotuloNav={dict.a11y.predioNav} />
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
    // `prefetch={false}`, como TODO OUTRO `<Link>` do site (Header, Footer,
    // LocaleSwitch, CaseStudy, SystemCard, Contact, Prova) — achado da Tarefa
    // 9 ao provar a descida num navegador de verdade: sem isto, assim que um
    // objeto clicável ("prancheta", "painel"...) entra na viewport durante a
    // rolagem, o roteador do Next tenta buscar o payload de pré-carregamento
    // de `/projetos` ou `/blog` num arquivo que o export estático não gera
    // com esse nome (`__next.$d$locale.projetos.__PAGE__.txt?_rsc=...`) — 404
    // real, tanto no servidor de E2E quanto (por ser exatamente o mesmo
    // `output: 'export'`) no GitHub Pages publicado. Medido: quatro erros de
    // console numa descida completa antes desta linha, zero depois.
    <Link prefetch={false} href={`/${locale}${objeto.destino}`} className={CLASSE_LINK}>
      {rotulo}
    </Link>
  )
}
