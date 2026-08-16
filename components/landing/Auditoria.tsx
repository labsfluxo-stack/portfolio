'use client'

import { useState } from 'react'
import type { Dictionary } from '@/content/types'
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

type Sitemap = { paginas: number | null; maisRecente: string | null }

type Resposta =
  | {
      estado: 'ok'
      palavras: number
      amostra: string
      barrados: string[]
      plataforma: string | null
      sitemap: Sitemap | null
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

export function Auditoria({ dict }: { dict: Dictionary }) {
  const endpoint = process.env.NEXT_PUBLIC_AUDITORIA_URL
  const { auditoria, cta } = dict.landing
  const [endereco, setEndereco] = useState('')
  const [situacao, setSituacao] = useState<Situacao>({ fase: 'parado' })

  if (!endpoint) return null

  async function ler(evento: React.FormEvent) {
    evento.preventDefault()
    const alvo = endereco.trim()
    if (!alvo) return
    setSituacao({ fase: 'lendo' })
    try {
      const r = await fetch(`${endpoint}?url=${encodeURIComponent(alvo)}`)
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

  // O site parado é o caso que de fato explica a ausência do público desta
  // página. Os outros dois quase nunca disparam — WordPress, Wix e Shopify
  // entregam HTML pronto e raramente barram robô.
  const meses = mesesDesde(dados.sitemap?.maisRecente ?? null)
  return meses !== null && meses > MESES_PARA_PARADO
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

function Resultado({ dados, dict }: { dados: Resposta; dict: Dictionary }) {
  const t = dict.landing.auditoria.resultado

  if (dados.estado === 'bloqueado') {
    return <p className="text-[17px] leading-relaxed text-ink">{t.bloqueado}</p>
  }
  if (dados.estado === 'nao-html') {
    return <p className="text-[17px] leading-relaxed text-ink">{t.naoHtml}</p>
  }

  const legivel = dados.palavras >= MINIMO_LEGIVEL

  return (
    <>
      <p className="text-[19px] leading-relaxed text-ink">
        <strong className="font-semibold">
          {dados.palavras.toLocaleString('pt-BR')} {t.palavras}.
        </strong>{' '}
        {legivel ? t.legivel : t.vazio}
      </p>

      <p className="text-[17px] leading-relaxed text-ink">
        {dados.barrados.length > 0 ? (
          <>
            {t.barrado} <strong className="font-semibold">{dados.barrados.join(', ')}</strong>
          </>
        ) : (
          t.permitido
        )}
      </p>

      {/* A plataforma é PROVA DE QUE LEMOS, nunca veredito. Nenhuma delas
       *  impede ser lida por IA — todas entregam HTML pronto por padrão — e
       *  apresentá-la como causa seria a mentira que as agências vendem. Por
       *  isso vem em texto secundário, separada das duas medições. */}
      {/* Tamanho e idade — a medição que de fato explica a ausência deste
       *  público nas respostas de IA. Os dois testes acima quase sempre
       *  passam; é aqui que costuma estar o motivo real. */}
      {dados.sitemap && <Sitemap dados={dados.sitemap} dict={dict} />}

      {dados.plataforma && (
        <p className="text-[17px] text-ink-2">
          {t.construidoEm} {dados.plataforma}.
        </p>
      )}

      {/* Ver o que sobrou vale mais que ler o número: a ferramenta existe para
       *  tornar concreta uma coisa que era abstrata. */}
      {dados.amostra && (
        <div className="border-l-2 border-rule pl-4">
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-ink-2">{t.amostra}</p>
          <p className="mt-1 text-[17px] leading-relaxed text-ink-2">{dados.amostra}…</p>
        </div>
      )}
    </>
  )
}
