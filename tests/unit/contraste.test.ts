import { describe, expect, it } from 'vitest'
import { contraste } from '@/lib/contraste'
import { CORES_CONTRASTE } from '@/components/ativacoes/temas/junino'

/**
 * A landing inverte a polaridade do portfólio, e os tokens do fundo escuro NÃO
 * sobrevivem à inversão: `--color-data` dá 1,93:1 sobre `#F5F3EF`. Este teste
 * existe para que trocar um hex sem conferir o contraste quebre a suíte, em vez
 * de quebrar a leitura de quem abre a página no celular sob sol.
 *
 * Mínimos da WCAG 2.1: 4.5:1 para texto normal (AA), 3:1 para texto grande e
 * para componente de interface não textual.
 */

const PAPEL = '#F5F3EF'
const ESCURO = '#08090C'

describe('contraste', () => {
  // Âncoras conhecidas: preto no branco dá 21:1, e uma cor contra ela mesma dá 1:1.
  // Sem elas, um erro de sinal na fórmula passaria despercebido.
  it('calcula os extremos corretamente', () => {
    expect(contraste('#000000', '#FFFFFF')).toBeCloseTo(21, 1)
    expect(contraste('#123456', '#123456')).toBeCloseTo(1, 5)
  })

  it('a ordem dos argumentos não muda o resultado', () => {
    expect(contraste(PAPEL, ESCURO)).toBeCloseTo(contraste(ESCURO, PAPEL), 5)
  })

  describe('tokens da polaridade clara', () => {
    it.each([
      ['tinta', '#08090C', 4.5],
      ['texto secundário', '#4A505A', 4.5],
      ['acento', '#0369A1', 4.5],
      // O ✕ da lista de verificação da auditoria. A cor é REFORÇO, nunca o
      // portador — o símbolo já separa reprovado de aprovado para quem não
      // distingue vermelho de verde. Mas se ela existe, precisa ser legível.
      ['alerta', '#B91C1C', 4.5],
    ])('%s passa AA sobre o papel', (_nome, hex, minimo) => {
      expect(contraste(hex, PAPEL)).toBeGreaterThanOrEqual(minimo)
    })
  })

  describe('tokens da faixa escura', () => {
    it.each([
      ['texto', '#F5F3EF', 4.5],
      ['data (ciano)', '#38BDF8', 4.5],
    ])('%s passa AA sobre a faixa', (_nome, hex, minimo) => {
      expect(contraste(hex, ESCURO)).toBeGreaterThanOrEqual(minimo)
    })
  })

  // Estes três são a razão de o conjunto claro existir. Se algum dia passarem,
  // alguém mexeu num hex e o teste acima deixou de proteger o que protegia.
  describe('o que NÃO pode ser usado em texto sobre o papel', () => {
    it.each([
      ['data (ciano)', '#38BDF8'],
      ['muted do tema escuro', '#878C96'],
      ['verde do WhatsApp', '#25D366'],
    ])('%s reprova AA e por isso não vira token claro', (_nome, hex) => {
      expect(contraste(hex, PAPEL)).toBeLessThan(4.5)
    })
  })

  /**
   * O alvo do jogo não é texto, então o mínimo não é o 4.5:1 de AA — é o 3:1
   * da WCAG 1.4.11 para componente de interface não textual.
   *
   * REESCRITO (revisão final de branch): a versão anterior testava `#FFB020`
   * como "o alvo" e `#1F232B` como "o anel do alvo" — as DUAS afirmações
   * pararam de ser verdade quando o balão junino substituiu o círculo liso.
   * `#FFB020` continua existindo (é `PALETA.destaque`: bandeirinha da faixa
   * do fundo, apliqué do bico, rajada de acerto e a marca do alvo em foco —
   * nunca mais "o alvo" sozinho), e `#1F232B` foi apagado de `CapaJogo.tsx`
   * pelo redesign: `desenharAlvoAtivo` risca com a cor do PRÓPRIO tema
   * (`PALETA.destaque`), não com um token de borda genérico que nem existe
   * mais nesta rota.
   *
   * O elemento de verdade é um balão de seis gomos com GRADIENTE — não uma
   * cor única —, e o escurecimento de borda que corrigiu um achado anterior
   * (posição vencendo matiz, ver `NEUTRO_ESCURO_BORDA` em `temas/junino.ts`)
   * significa que nem todo pixel do balão passa 3:1: a borda mais escura de
   * um gomo lateral fica bem abaixo disso de propósito — é sombra, não o que
   * carrega a leitura do elemento. A pergunta que a WCAG 1.4.11 faz ("dá pra
   * distinguir o componente do fundo") tem que mirar as cores que de fato
   * carregam essa leitura: o núcleo dos dois gomos centrais (sem nenhuma
   * mistura de escurecimento de borda) e o acento do tema, que é a cor mais
   * clara usada em qualquer parte do balão.
   *
   * `CORES_CONTRASTE`, exportado por `junino.ts`, é essa paleta real — ler do
   * export em vez de copiar hex para o teste é o que impede este arquivo de
   * continuar testando uma versão velha do balão se a paleta mudar de novo,
   * o mesmo descompasso que deixou este gate descrevendo uma peça que já não
   * existia.
   */
  describe('a partida da dobra', () => {
    it.each(Object.entries(CORES_CONTRASTE))(
      '%s (%s) se distingue do fundo do canvas com folga sobre o mínimo de 3:1',
      (_nome, hex) => {
        expect(contraste(hex, ESCURO)).toBeGreaterThanOrEqual(3)
      },
    )
  })
})
