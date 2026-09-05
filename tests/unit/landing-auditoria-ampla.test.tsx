import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Fecho } from '@/components/landing/Fecho'
import { Piso } from '@/components/landing/Piso'
import { MUTED_ESCURO, TOKENS_CLAROS, TOKENS_ESCUROS } from '@/components/landing/polaridade'
import { landingJsonLd } from '@/lib/jsonld'
import { pt } from '@/content/pt'
import { en } from '@/content/en'
import type { Dictionary } from '@/content/types'

/**
 * Os achados da auditoria ampla de 2026-09-04 sobre a página no ar, cada um
 * travado no ponto em que ele voltaria a acontecer.
 *
 * O que NÃO está aqui e continua nos arquivos originais: as regras de card da
 * prova (landing-prova), o piso fora da dobra (landing-topo) e a contagem de
 * animações infinitas (landing-movimento).
 */

/** Luminância relativa WCAG de um `#rrggbb`. */
function luminancia(hex: string) {
  const canais = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * canais[0]! + 0.7152 * canais[1]! + 0.0722 * canais[2]!
}

function contraste(a: string, b: string) {
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (claro! + 0.05) / (escuro! + 0.05)
}

describe('contraste da paleta escura', () => {
  /**
   * O ALVO É 7:1 E NÃO 4,5:1, e é isto que o teste existe para não deixar
   * regredir para "passa no AA".
   *
   * `#878C96` — o valor original, que estava no ar — dá 5,90:1 sobre
   * `#08090C`: aprova em WCAG AA com folga. Em interface escura isso não
   * basta. A pupila dilata, o halation aumenta e a borda da letra perde
   * definição; a recomendação para corpo de texto sobre fundo escuro é 7:1.
   *
   * Não é cor de detalhe: `--color-ink-2` pinta todo parágrafo secundário da
   * página — corpo dos cartões da oferta, corpo dos dois testes do critério,
   * respostas do FAQ, lead da prova.
   */
  const fundo = TOKENS_ESCUROS['--color-paper' as keyof typeof TOKENS_ESCUROS] as string
  const secundario = TOKENS_ESCUROS['--color-ink-2' as keyof typeof TOKENS_ESCUROS] as string
  const principal = TOKENS_ESCUROS['--color-ink' as keyof typeof TOKENS_ESCUROS] as string
  const acento = TOKENS_ESCUROS['--color-accent' as keyof typeof TOKENS_ESCUROS] as string

  it('o texto secundário alcança 7:1, o alvo de fundo escuro', () => {
    expect(contraste(secundario, fundo)).toBeGreaterThanOrEqual(7)
  })

  it('o texto principal e o acento seguem folgados', () => {
    expect(contraste(principal, fundo)).toBeGreaterThanOrEqual(7)
    // O acento pinta número, barra e link — texto, não só ornamento.
    expect(contraste(acento, fundo)).toBeGreaterThanOrEqual(4.5)
  })

  /**
   * A CORREÇÃO PELA METADE QUE ESTE TESTE EXISTE PARA IMPEDIR.
   *
   * `--color-muted` é um token SEPARADO de `--color-ink-2`. A primeira passada
   * subiu o segundo nas quatro seções que invertem por token e a página
   * publicada continuou medindo 5,90:1 — porque `LandingHero`, `Dupla` e
   * `LandingCta` invertem por `bg-ink text-paper` e o texto secundário delas é
   * `text-muted`, que nunca foi tocado. Não era canto de página: é o subtítulo
   * do hero, o primeiro parágrafo que qualquer visitante lê.
   */
  it('o muted das faixas escuras alcança 7:1 sobre o mesmo preto', () => {
    const muted = MUTED_ESCURO['--color-muted' as keyof typeof MUTED_ESCURO] as string
    expect(contraste(muted, fundo)).toBeGreaterThanOrEqual(7)
  })

  it('a paleta clara também alcança 7:1 no secundário', () => {
    const claroFundo = TOKENS_CLAROS['--color-paper' as keyof typeof TOKENS_CLAROS] as string
    const claroSecundario = TOKENS_CLAROS['--color-ink-2' as keyof typeof TOKENS_CLAROS] as string
    expect(contraste(claroSecundario, claroFundo)).toBeGreaterThanOrEqual(7)
  })
})

describe('Piso', () => {
  /**
   * Ficou `null` do lançamento até 2026-09-04, e o custo foi medido: a página
   * não tinha nenhuma âncora de valor. A consequência não é menos contato, é
   * contato pior — pedido de orçamento de site para trabalho de sistema.
   */
  it('publica o piso nos dois idiomas', () => {
    for (const dict of [pt, en] as Dictionary[]) {
      expect(dict.landing.piso, 'o piso voltou a ser nulo').not.toBeNull()
      expect(dict.landing.piso!.valor.trim()).not.toBe('')
    }
  })

  /**
   * A MENSALIDADE NÃO PODE SUMIR DA MESMA RESPIRAÇÃO QUE A ENTRADA.
   *
   * Custo recorrente descoberto depois da proposta queima a confiança que a
   * página passou 4.600px construindo — e confiança é literalmente o produto
   * ("você fala direto com quem escreve o código"). Publicar a entrada e calar
   * o recorrente é não ter publicado piso nenhum.
   */
  it('a nota do piso declara o custo recorrente junto do valor de entrada', () => {
    for (const dict of [pt, en] as Dictionary[]) {
      expect(dict.landing.piso!.valor).toMatch(/999/)
      expect(dict.landing.piso!.nota, 'a mensalidade sumiu da nota').toMatch(/99/)
      expect(dict.landing.piso!.nota).toMatch(/m[êe]s|month/i)
    }
  })

  /** "A partir de" — a página inteira se sustenta em afirmação que se confere. */
  it('o valor se apresenta como ponto de partida, não como preço fechado', () => {
    expect(pt.landing.piso!.valor).toMatch(/a partir de/i)
    expect(en.landing.piso!.valor).toMatch(/from/i)
  })

  /**
   * É a única faixa clara de uma rolagem de ~5.800px, e essa quebra é o que
   * devolve ritmo a uma página que ficou inteira escura. Se o bloco voltar a
   * herdar a polaridade do vizinho, o respiro some sem quebrar nada visível
   * em teste — daí a asserção no token declarado.
   */
  it('declara a polaridade clara em vez de herdar', () => {
    const { container } = render(<Piso dict={pt} />)
    const faixa = container.firstElementChild as HTMLElement
    expect(faixa.style.getPropertyValue('--color-paper')).toBe('#F5F3EF')
    expect(faixa.style.getPropertyValue('--color-ink')).toBe('#08090C')
  })
})

describe('landmarks', () => {
  /**
   * A página tinha UM landmark, `MAIN`. Para leitor de tela isso significa que
   * a navegação por região não oferece nada.
   *
   * Só o `footer` entrou: a landing não tem topo nem menu de propósito (ver
   * app/[locale]/projetos/layout.tsx), e landmark vazio é pior que ausente —
   * promete uma região e entrega nada.
   */
  it('o fecho é um footer, não uma section anônima', () => {
    const { container } = render(<Fecho dict={pt} />)
    expect(container.querySelector('footer')).not.toBeNull()
    expect(container.querySelector('section')).toBeNull()
  })
})

describe('JSON-LD da landing', () => {
  const grafo = landingJsonLd('pt', pt)
  const tipos = grafo['@graph'].map((n) => (n as { '@type': string })['@type'])

  it('declara serviço e FAQ, não só a Person herdada do layout', () => {
    expect(tipos).toContain('ProfessionalService')
    expect(tipos).toContain('FAQPage')
  })

  /**
   * MAPEAMENTO, NÃO INVENÇÃO: marcar pergunta que a página não mostra é o
   * caminho curto para penalidade. Toda `Question` do grafo tem de existir em
   * `dict.landing.perguntas.itens`, com a mesma resposta.
   */
  it('o FAQ marcado é exatamente o FAQ visível', () => {
    const faq = grafo['@graph'].find((n) => (n as { '@type': string })['@type'] === 'FAQPage') as {
      mainEntity: { name: string; acceptedAnswer: { text: string } }[]
    }
    expect(faq.mainEntity).toHaveLength(pt.landing.perguntas.itens.length)
    for (const [i, item] of pt.landing.perguntas.itens.entries()) {
      expect(faq.mainEntity[i]!.name).toBe(item.pergunta)
      expect(faq.mainEntity[i]!.acceptedAnswer.text).toBe(item.resposta)
    }
  })

  /**
   * O `Offer` acompanha o piso: enquanto o valor não estava decidido o campo
   * era `null`, e preço inventado em JSON-LD é pior que em prosa — o leitor
   * pondera, o buscador toma como declaração.
   */
  it('a oferta some junto com o piso', () => {
    const semPiso = { ...pt, landing: { ...pt.landing, piso: null } } as Dictionary
    const servico = (n: ReturnType<typeof landingJsonLd>) =>
      n['@graph'].find((x) => (x as { '@type': string })['@type'] === 'ProfessionalService') as Record<string, unknown>

    expect(servico(grafo).offers).toBeDefined()
    expect(servico(landingJsonLd('pt', semPiso)).offers).toBeUndefined()
  })

  it('a mensalidade entra como preço unitário mensal', () => {
    const servico = grafo['@graph'].find(
      (n) => (n as { '@type': string })['@type'] === 'ProfessionalService',
    ) as { offers: { price: string; priceSpecification: { price: string; unitCode: string } } }
    expect(servico.offers.price).toBe('999')
    expect(servico.offers.priceSpecification.price).toBe('99')
    expect(servico.offers.priceSpecification.unitCode).toBe('MON')
  })
})

describe('voz', () => {
  /**
   * A página alternava entre "nós" e "eu" DENTRO do FAQ — uma resposta no
   * plural, a seguinte no singular. Plural corporativo por profissional solo é
   * padrão de mercado e não afirma número nenhum; a alternância é que lê como
   * alguém decidindo frase a frase o quanto revelar, e isso corrói exatamente
   * a peça central desta página.
   *
   * A varredura cobre só `dict.landing`. O resto do site é primeira pessoa do
   * singular por decisão, e não é tocado.
   */
  function textos(dict: Dictionary): string[] {
    const saida: string[] = []
    const ande = (valor: unknown) => {
      if (typeof valor === 'string') saida.push(valor)
      else if (Array.isArray(valor)) valor.forEach(ande)
      else if (valor && typeof valor === 'object') Object.values(valor).forEach(ande)
    }
    ande(dict.landing)
    return saida
  }

  /**
   * `meu` E `meus` FICAM DE FORA DA VARREDURA, e não por descuido: nesta
   * página os possessivos de primeira pessoa são do VISITANTE, não do
   * vendedor. O botão da auditoria é "Ler meu site" — é o visitante falando do
   * site dele, e é exatamente a voz certa ali. A primeira versão deste teste
   * reprovou esse botão.
   *
   * O que a regra persegue é a voz de QUEM VENDE: `eu`/`comigo`, os
   * possessivos que só o vendedor usaria ("na minha máquina", "na minha
   * cabeça" — as duas frases reais que estavam no ar) e os verbos conjugados
   * na primeira pessoa do singular.
   */
  it('nenhum texto da landing volta para a primeira pessoa do singular', () => {
    const singular =
      /\b(eu|comigo|minha|minhas)\b|\b(dou|darei|construo|garanto|escrevo|respondo|entrego)\b/i
    for (const texto of textos(pt)) {
      expect(texto, `voltou à voz singular: "${texto.slice(0, 70)}"`).not.toMatch(singular)
    }
  })

  /**
   * A CORREÇÃO DE FATO QUE FICOU PELA METADE: o português parou de afirmar
   * dois desenvolvedores, o inglês não. "Both of us know the whole codebase" e
   * "with two people" continuaram no ar em /en/projetos/ até 2026-09-04.
   */
  it('nenhum idioma volta a contar pessoas na landing', () => {
    const contagem = /\bboth of us\b|\bwith two people\b|\bos dois\b|\bn[óo]s dois\b|\bdupla\b/i
    for (const dict of [pt, en] as Dictionary[]) {
      for (const texto of textos(dict)) {
        expect(texto, `voltou a contar pessoas: "${texto.slice(0, 70)}"`).not.toMatch(contagem)
      }
    }
  })
})
