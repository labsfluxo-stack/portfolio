'use client'

import { useState } from 'react'
import type { Dictionary, Locale } from '@/content/types'
import { urlWhatsapp } from './whatsapp'

/**
 * O único trecho interativo da landing: o visitante cola o endereço do próprio
 * site e vê, na hora, o que a IA enxerga nele.
 *
 * POR QUE ISTO EXISTE: a pesquisa apontou a auditoria do site do próprio
 * prospect como a prova mais forte disponível — específica dele, impossível de
 * pré-fabricar, e serve de motivo para mandar mensagem. Até aqui a seção do
 * critério MANDAVA a pessoa fazer o teste; agora ela faz.
 *
 * MELHORIA PROGRESSIVA, e num lugar onde errar isso seria constrangedor: sem
 * JavaScript o argumento da página continua inteiro — os dois testes, a arte da
 * comparação e o fecho são todos estáticos. A ferramenta é o extra. Uma página
 * que argumenta contra depender de JavaScript não pode depender de JavaScript
 * para argumentar.
 *
 * NÃO RENDERIZA SEM `NEXT_PUBLIC_AUDITORIA_URL`. Mesmo padrão do piso de preço:
 * sem a variável a seção some inteira e a página fica como estava, sem buraco.
 */

/** Abaixo disto, o que sobrou não sustenta uma página — é título e menu.
 *  Uma casca de SPA costuma ficar bem abaixo; uma página real, muito acima.
 *  O número exato aparece na tela de qualquer forma, para a pessoa julgar. */
const MINIMO_LEGIVEL = 80

/**
 * A partir de quando um site conta como parado.
 *
 * Dezoito meses, e não doze, de propósito: um ano é discutível — muita coisa
 * legítima não muda em um ano. Um ano e meio sem uma linha nova não é
 * discutível, e a ferramenta não deve acender alerta em caso de fronteira.
 */
const MESES_PARA_PARADO = 18

type Sitemap = { paginas: number | null; maisRecente: string | null; temBlog: boolean | null }

/** `h1` é contagem, não booleano: zero e cinco são problemas diferentes. */
type Cabecalho = {
  titulo: string | null
  descricao: string | null
  h1: number
  dadosEstruturados: boolean
  idioma: string | null
  cartao: boolean
}

type Resposta =
  | {
      estado: 'ok'
      palavras: number
      amostra: string
      barrados: string[]
      plataforma: string | null
      sitemap: Sitemap | null
      cabecalho: Cabecalho | null
      /** Leitura por IA. `null` sem chave do Groq — a seção some, não vira buraco. */
      entendimento: string | null
    }
  | { estado: 'bloqueado' }
  | { estado: 'nao-html' }

/** `<lastmod>` é declarado pelo próprio site e nem sempre é honesto — existe
 *  CMS que carimba a data de hoje em página que ninguém tocou. Por isso a data
 *  vai para a tela como fato declarado, e só dispara o alerta quando é MUITO
 *  antiga: nesse sentido o viés do campo joga a favor de não alarmar. */
function mesesDesde(iso: string | null): number | null {
  if (!iso) return null
  const quando = new Date(iso)
  if (Number.isNaN(quando.getTime())) return null
  return (Date.now() - quando.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
}

type Situacao = { fase: 'parado' } | { fase: 'lendo' } | { fase: 'erro' } | { fase: 'pronto'; dados: Resposta }

export function Auditoria({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const endpoint = process.env.NEXT_PUBLIC_AUDITORIA_URL
  const { auditoria, cta } = dict.landing
  const idioma = locale
  const [endereco, setEndereco] = useState('')
  const [situacao, setSituacao] = useState<Situacao>({ fase: 'parado' })

  if (!endpoint) return null

  async function ler(evento: React.FormEvent) {
    evento.preventDefault()
    const alvo = endereco.trim()
    if (!alvo) return
    setSituacao({ fase: 'lendo' })
    try {
      // `lang` decide o idioma da leitura por IA. Sem ele o modelo responderia
      // em português para um visitante lendo a página em inglês.
      const r = await fetch(`${endpoint}?url=${encodeURIComponent(alvo)}&lang=${idioma}`)
      if (!r.ok) {
        setSituacao({ fase: 'erro' })
        return
      }
      setSituacao({ fase: 'pronto', dados: (await r.json()) as Resposta })
    } catch {
      setSituacao({ fase: 'erro' })
    }
  }

  return (
    <div className="rounded-lg border border-rule bg-paper p-6">
      <h3 className="text-[19px] font-semibold text-ink">{auditoria.titulo}</h3>
      <p className="mt-2 max-w-xl text-[17px] leading-relaxed text-ink-2">{auditoria.descricao}</p>

      <form onSubmit={ler} className="mt-5 flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="auditoria-url">
          {auditoria.rotuloCampo}
        </label>
        <input
          id="auditoria-url"
          type="text"
          inputMode="url"
          autoComplete="url"
          value={endereco}
          onChange={(e) => setEndereco(e.target.value)}
          placeholder={auditoria.exemplo}
          className="min-h-12 flex-1 rounded-md border border-rule bg-paper px-4 text-[17px] text-ink placeholder:text-ink-2/60"
        />
        <button
          type="submit"
          disabled={situacao.fase === 'lendo'}
          className="min-h-12 rounded-md bg-ink px-6 text-[17px] font-semibold text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {situacao.fase === 'lendo' ? auditoria.carregando : auditoria.botao}
        </button>
      </form>

      {/* `aria-live` porque o resultado chega depois e sem mudar de página: sem
       *  isso, quem usa leitor de tela preenche o campo, aperta e não é avisado
       *  de nada. */}
      <div aria-live="polite" className="mt-5 flex flex-col gap-3">
        {situacao.fase === 'erro' && (
          <p className="text-[17px] leading-relaxed text-ink">{auditoria.erroEndereco}</p>
        )}
        {situacao.fase === 'pronto' && <Resultado dados={situacao.dados} dict={dict} />}
      </div>

      {/* O ESCOPO APARECE SEMPRE E IGUAL PARA TODOS — inclusive antes de
       *  qualquer leitura. Condicioná-lo ao resultado, ou pior, à plataforma
       *  detectada, o transformaria de declaração de limite em insinuação: o
       *  movimento que a pesquisa lista entre os sinais de quem foi enganado,
       *  criar dúvida onde a medição não achou problema. */}
      <p className="mt-6 border-t border-rule pt-4 text-[17px] leading-relaxed text-ink-2">
        {auditoria.escopo}
      </p>

      {situacao.fase === 'pronto' && precisaDeAjuda(situacao.dados) && (
        <a
          href={urlWhatsapp(dict.contact.whatsapp, cta.mensagem)}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex w-fit items-center rounded-md bg-ink px-6 py-3 text-[17px] font-semibold text-paper transition-opacity hover:opacity-90"
        >
          {auditoria.cta}
        </a>
      )}
    </div>
  )
}

/**
 * O CTA só aparece quando a medição achou alguma coisa.
 *
 * Quando o site passa nos dois testes, a resposta é "está certo" e ponto —
 * sem "mas", sem pivô para outro problema. Uma ferramenta capaz de dizer que
 * você NÃO precisa do serviço é incomparavelmente mais crível que uma que
 * sempre acha algo, e sinal crível é o que custa caro para forjar.
 *
 * Leitura bloqueada também não puxa CTA: não sabemos se há problema, e vender
 * a partir de uma medição que não aconteceu seria inventar.
 */
function precisaDeAjuda(dados: Resposta): boolean {
  if (dados.estado !== 'ok') return false
  if (dados.palavras < MINIMO_LEGIVEL) return true
  if (dados.barrados.length > 0) return true

  // Estes dois são o que de fato explica a ausência deste público. Os de cima
  // quase nunca disparam — WordPress, Wix e Shopify entregam HTML pronto e
  // raramente barram robô.
  const meses = mesesDesde(dados.sitemap?.maisRecente ?? null)
  if (meses !== null && meses > MESES_PARA_PARADO) return true

  // Site sem nenhuma página de artigo não tem de onde a IA tirar resposta
  // sobre o setor dele — e é exatamente o que a página vende. `false`
  // explícito, nunca `null`: não achar blog não é o mesmo que não ter.
  return dados.sitemap?.temBlog === false
}

/**
 * O TAMANHO DO SITE NÃO VIRA VEREDITO, e isso é deliberado.
 *
 * Cinco páginas bem escritas valem mais que cinquenta vazias, e não existe
 * número defensável a partir do qual um site é "pequeno demais". Escolher um
 * seria inventar o critério para poder reprovar — que é justamente o
 * mecanismo por trás da métrica de vaidade que a pesquisa lista entre os
 * sinais de quem foi enganado: medir o que sobe fácil, não o que importa.
 *
 * A contagem aparece como informação. Quem lê tira a própria conclusão.
 */
function Sitemap({ dados, dict }: { dados: Sitemap; dict: Dictionary }) {
  const t = dict.landing.auditoria.resultado
  const meses = mesesDesde(dados.maisRecente)
  const parado = meses !== null && meses > MESES_PARA_PARADO

  const quando =
    dados.maisRecente && !Number.isNaN(new Date(dados.maisRecente).getTime())
      ? new Date(dados.maisRecente).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
      : null

  if (dados.paginas === null && !quando) return null

  return (
    <>
      <p className="text-[17px] leading-relaxed text-ink">
        {dados.paginas !== null && (
          <>
            <strong className="font-semibold">
              {dados.paginas.toLocaleString('pt-BR')} {t.paginas}
            </strong>{' '}
          </>
        )}
        {quando && `${t.atualizadoEm} ${quando}.`}
      </p>
      {parado && <p className="text-[17px] leading-relaxed text-ink-2">{t.parado}</p>}
    </>
  )
}

type Checagem = { grupo: string; rotulo: string; detalhe: string; passou: boolean | null }

/**
 * As seis medições viram linhas independentes.
 *
 * NÃO EXISTE NOTA COMPOSTA AQUI, e a ausência é o ponto. Uma nota agregada
 * precisa de peso — por que legibilidade valeria 40 pontos e atualização 30? —
 * e não há resposta defensável. Peso arbitrário é o que faz do Domain
 * Authority a métrica de vaidade que a pesquisa lista entre os sinais de quem
 * foi enganado: um número que sobe fácil e não descreve nada.
 *
 * Uma lista de itens independentes é escaneável como nota e honesta como
 * medição — cada linha se sustenta sozinha.
 *
 * `passou: null` é o terceiro estado, e ele existe para não transformar
 * ausência de dado em reprovação: site sem `<lastmod>` no sitemap não está
 * parado, está sem data.
 */
function montarChecagens(dados: Extract<Resposta, { estado: 'ok' }>, dict: Dictionary): Checagem[] {
  const t = dict.landing.auditoria.resultado
  const c = t.checagens
  const d = t.detalhes
  const g = t.grupos
  const cab = dados.cabecalho
  const meses = mesesDesde(dados.sitemap?.maisRecente ?? null)

  // A legibilidade NÃO entra na lista: ela é a frase-manchete acima, com o
  // número por extenso. Repetir "3.400 palavras" na linha de baixo é
  // redundância que aparece ao olhar, não só no teste.
  return [
    {
      grupo: g.visivel,
      rotulo: c.permissao,
      detalhe: dados.barrados.length > 0 ? dados.barrados.join(', ') : d.nenhumBloqueado,
      passou: dados.barrados.length === 0,
    },
    {
      grupo: g.visivel,
      rotulo: c.idioma,
      detalhe: cab?.idioma ?? d.semIdioma,
      passou: cab ? Boolean(cab.idioma) : null,
    },
    {
      grupo: g.visivel,
      rotulo: c.marcado,
      detalhe: cab?.dadosEstruturados ? d.comMarcacao : d.semMarcacao,
      // `null`, nunca `false`: a evidência não sustenta tratar ausência de
      // dados estruturados como defeito — ver `notaMarcacao`.
      passou: cab?.dadosEstruturados ? true : null,
    },
    {
      grupo: g.citavel,
      rotulo: c.vivo,
      detalhe: formatarData(dados.sitemap?.maisRecente ?? null) ?? d.semData,
      passou: meses === null ? null : meses <= MESES_PARA_PARADO,
    },
    {
      grupo: g.citavel,
      rotulo: c.blog,
      detalhe: dados.sitemap?.temBlog == null ? d.semData : dados.sitemap.temBlog ? d.comBlog : d.semBlog,
      // `null` quando não houve sitemap legível: não achar não é o mesmo que
      // não ter, e um site pode publicar numa estrutura que a inferência por
      // caminho não reconhece.
      passou: dados.sitemap?.temBlog ?? null,
    },
    {
      grupo: g.apresenta,
      rotulo: c.titulo,
      detalhe: cab?.titulo ? recortar(cab.titulo, 40) : d.semTitulo,
      passou: cab ? Boolean(cab.titulo) : null,
    },
    {
      grupo: g.apresenta,
      rotulo: c.descricao,
      detalhe: cab?.descricao ? recortar(cab.descricao, 40) : d.semDescricao,
      passou: cab ? Boolean(cab.descricao) : null,
    },
    {
      // Zero e cinco são problemas DIFERENTES: zero é a página não declarar do
      // que trata; cinco é declarar cinco assuntos, o que dá no mesmo.
      grupo: g.apresenta,
      rotulo: c.assunto,
      detalhe: !cab ? d.semAssunto : cab.h1 === 0 ? d.semAssunto : cab.h1 > 3 ? d.assuntoDemais : `H1 × ${cab.h1}`,
      passou: cab ? cab.h1 >= 1 && cab.h1 <= 3 : null,
    },
    {
      // A linha mais próxima do dia a dia de quem lê: ele manda o próprio site
      // no WhatsApp e já viu chegar pelado, sem saber o nome disso.
      grupo: g.apresenta,
      rotulo: c.cartao,
      detalhe: cab?.cartao ? d.comCartao : d.semCartao,
      passou: cab ? cab.cartao : null,
    },
  ]
}

/** Preserva a ordem em que as checagens foram declaradas — `Map` mantém ordem
 *  de inserção, e a ordem dos grupos é decisão de leitura, não alfabética. */
function agrupar(checagens: Checagem[]): [string, Checagem[]][] {
  const mapa = new Map<string, Checagem[]>()
  for (const ch of checagens) mapa.set(ch.grupo, [...(mapa.get(ch.grupo) ?? []), ch])
  return [...mapa]
}

/** Quantas linhas vieram antes deste grupo, para o escalonamento não reiniciar
 *  a cada bloco e a revelação ler como uma sequência só. */
function deslocamento(todos: [string, Checagem[]][], ate: number): number {
  return todos.slice(0, ate).reduce((soma, [, itens]) => soma + itens.length, 0)
}

function recortar(texto: string, limite: number): string {
  return texto.length > limite ? `${texto.slice(0, limite)}…` : texto
}

function formatarData(iso: string | null): string | null {
  if (!iso) return null
  const quando = new Date(iso)
  if (Number.isNaN(quando.getTime())) return null
  return quando.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

function Resultado({ dados, dict }: { dados: Resposta; dict: Dictionary }) {
  const t = dict.landing.auditoria.resultado

  if (dados.estado === 'bloqueado') {
    return <p className="text-[17px] leading-relaxed text-ink">{t.bloqueado}</p>
  }
  if (dados.estado === 'nao-html') {
    return <p className="text-[17px] leading-relaxed text-ink">{t.naoHtml}</p>
  }

  const checagens = montarChecagens(dados, dict)
  const meses = mesesDesde(dados.sitemap?.maisRecente ?? null)

  return (
    <>
      {/* A frase antes da lista, e não só a lista. A checagem é escaneável mas
       *  seca; uma pessoa precisa de uma sentença que diga o que aconteceu
       *  antes de encarar seis linhas de estado. */}
      <p className="text-[19px] leading-relaxed text-ink">
        <strong className="font-semibold">
          {dados.palavras.toLocaleString('pt-BR')} {t.palavras}.
        </strong>{' '}
        {dados.palavras >= MINIMO_LEGIVEL ? t.legivel : t.vazio}
      </p>

      {/* Agrupado, e não em lista corrida. Nove linhas soltas viram relatório,
       *  e relatório ninguém lê — some a qualidade de bater o olho que era o
       *  motivo de a lista existir. O índice contínuo mantém o escalonamento
       *  atravessando os grupos, para a revelação ler como uma sequência só. */}
      {agrupar(checagens).map(([grupo, itens], gi, todos) => (
        <div key={grupo} className="flex flex-col">
          <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.15em] text-ink-2">{grupo}</p>
          <ul className="flex flex-col">
            {itens.map((ch, i) => (
              <li
                key={ch.rotulo}
                // Ritmo de apresentação, não etapa: o Worker mede tudo em
                // paralelo. Ver o comentário de `.surgir` em globals.css.
                style={{ animationDelay: `${(deslocamento(todos, gi) + i) * 90}ms` }}
                className="surgir flex items-baseline gap-3 border-b border-rule py-2.5 last:border-b-0"
              >
                <Marca passou={ch.passou} />
                <span className="flex-1 text-[17px] text-ink">{ch.rotulo}</span>
                <span className="text-right font-mono text-xs text-ink-2">{ch.detalhe}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {/* Dados estruturados entram na lista, mas com o limite dito na cara.
       *  Vendê-los como fator de citação em IA é a alegação mais comum do
       *  mercado e a de evidência mais fraca. */}
      {!dados.cabecalho?.dadosEstruturados && (
        <p className="text-[17px] leading-relaxed text-ink-2">{t.notaMarcacao}</p>
      )}

      {meses !== null && meses > MESES_PARA_PARADO && (
        <p className="text-[17px] leading-relaxed text-ink-2">{t.parado}</p>
      )}

      {/* Tamanho do site: informação, nunca reprovação. Cinco páginas bem
       *  escritas valem mais que cinquenta vazias, e não existe número
       *  defensável a partir do qual um site é "pequeno demais" — escolher um
       *  seria inventar o critério para poder reprovar. */}
      {dados.sitemap?.paginas != null && (
        <p className="text-[17px] text-ink-2">
          {dados.sitemap.paginas.toLocaleString('pt-BR')} {t.paginas}
        </p>
      )}

      {/* A plataforma é PROVA DE QUE LEMOS, nunca veredito. Nenhuma delas
       *  impede ser lida por IA — todas entregam HTML pronto por padrão. */}
      {dados.plataforma && (
        <p className="text-[17px] text-ink-2">
          {t.construidoEm} {dados.plataforma}.
        </p>
      )}

      {/* A LEITURA POR IA SUBSTITUI A AMOSTRA CRUA quando existe.
       *
       *  A amostra só existia porque não havia nada melhor: um recorte de
       *  "Fechar / Qual o endereço do seu site? / Seguir / Imagem" é ruído, e
       *  quem lê não sabe o que fazer com aquilo. A leitura diz o mesmo em
       *  português — inclusive o que NÃO deu para determinar, que é a parte
       *  que importa.
       *
       *  Sem chave do Groq a amostra volta a aparecer: é o que sobra, e é
       *  melhor que nada. */}
      {dados.entendimento ? (
        <div className="border-l-2 border-accent pl-4">
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-accent">{t.entendeu}</p>
          {/* O modelo devolve dois blocos separados por linha em branco: a
           *  resposta simulada, entre aspas, e o que faltou para ela ser útil.
           *  Sem quebrar em parágrafos os dois colariam num bloco só, e a
           *  citação — que é a parte que impacta — se perderia no meio. */}
          {dados.entendimento
            .split(/\n{2,}/)
            .map((p) => p.trim())
            .filter(Boolean)
            .map((paragrafo) => (
              <p key={paragrafo} className="mt-2 text-[17px] leading-relaxed text-ink">
                {paragrafo}
              </p>
            ))}
          {/* A ressalva fica colada na leitura, não num rodapé distante: quem
           *  lê a resposta precisa ler, na mesma respiração, que não foi o
           *  ChatGPT que respondeu e que isto não é medição. */}
          <p className="mt-2 text-[17px] leading-relaxed text-ink-2">{t.entendeuNota}</p>
        </div>
      ) : (
        dados.amostra && (
          <div className="border-l-2 border-rule pl-4">
            <p className="font-mono text-xs uppercase tracking-[0.15em] text-ink-2">{t.amostra}</p>
            <p className="mt-1 text-[17px] leading-relaxed text-ink-2">{dados.amostra}…</p>
          </div>
        )
      )}
    </>
  )
}

/** Forma, e não só cor: quem não distingue vermelho de verde precisa do
 *  símbolo. Critério 1.4.1 da WCAG — cor nunca é o único portador. */
function Marca({ passou }: { passou: boolean | null }) {
  if (passou === null) return <span className="w-4 text-center text-ink-2">·</span>
  return (
    <span aria-hidden="true" className={`w-4 text-center ${passou ? 'text-accent' : 'text-alerta'}`}>
      {passou ? '✓' : '✕'}
    </span>
  )
}
