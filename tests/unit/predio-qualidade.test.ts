import { describe, expect, it } from 'vitest'
import {
  aplicaVeredito,
  CAPACIDADES_INICIAIS,
  DEGRAU_DA_PERSPECTIVA,
  DEGRAU_DO_BRILHO,
  capacidadesDo,
  temPerspectiva,
  type Escada,
} from '@/components/predio/predio-qualidade'
import { TIERS } from '@/components/three/portico-quality'
import { ANDARES } from '@/components/predio/predio-programa'

/**
 * "Celular é requisito, não desejo" (spec). A tradução disso em código é uma
 * só: a perspectiva real NUNCA é o estado inicial. Ela sobe quando o quadro
 * prova folga, e num aparelho que não sustenta ninguém vê tela quebrada — vê
 * parallax, que já é bonito sozinho.
 */
describe('qualidade do prédio', () => {
  it('a perspectiva não existe no estado inicial', () => {
    expect(CAPACIDADES_INICIAIS.perspectiva).toBe(false)
  })

  it('a perspectiva só aparece no degrau mais alto', () => {
    expect(DEGRAU_DA_PERSPECTIVA).toBe(0)
    expect(capacidadesDo(0).perspectiva).toBe(true)
    for (let d = 1; d < TIERS.length; d++) {
      expect(capacidadesDo(d).perspectiva).toBe(false)
    }
  })

  it('degrau fora da escada não liga nada', () => {
    expect(capacidadesDo(-1).perspectiva).toBe(false)
    expect(capacidadesDo(TIERS.length + 5).perspectiva).toBe(false)
  })

  it('só as duas pontas ganham perspectiva, e só com folga', () => {
    const cheio = { perspectiva: true, brilho: true }
    expect(temPerspectiva(0, cheio)).toBe(true)
    expect(temPerspectiva(ANDARES.length - 1, cheio)).toBe(true)
    for (let i = 1; i < ANDARES.length - 1; i++) {
      expect(temPerspectiva(i, cheio)).toBe(false)
    }
  })

  it('sem folga, nem as pontas ganham', () => {
    expect(temPerspectiva(0, CAPACIDADES_INICIAIS)).toBe(false)
  })
})

/**
 * ═══ A CATRACA, E O DEFEITO QUE ELA FECHA ═══
 *
 * "Uma hora carrega perto, outra distante, e fica oscilando" — relatado pelo
 * dono. A causa está escrita por extenso em `aplicaVeredito`; o resumo é que a
 * subida do degrau 1 para o 0 multiplica o custo por 2,56 só no `dpr`, e a
 * histerese de `judge` tolera 1,76. A oscilação não é um caso extremo, é uma
 * consequência aritmética das duas constantes.
 *
 * ISTO É TESTÁVEL E O RESTO NÃO É. A escada inteira depende de medir quadro num
 * navegador de verdade, e nenhuma suíte faz isso. Mas a REGRA — subiu, caiu,
 * não sobe de novo — é uma função pura sobre dois inteiros, e é exatamente a
 * parte que um refator futuro pode desfazer sem que nada mais quebre. Ela vem
 * para cá.
 */
describe('catraca do degrau da perspectiva', () => {
  it('descer do degrau da perspectiva fecha a catraca para sempre', () => {
    let e: Escada = { degrau: DEGRAU_DA_PERSPECTIVA, piso: 0 }
    e = aplicaVeredito(e, 'down')
    expect(e.degrau).toBe(DEGRAU_DA_PERSPECTIVA + 1)
    expect(e.piso).toBe(DEGRAU_DA_PERSPECTIVA + 1)

    // E agora nenhuma promoção a traz de volta — nem dez seguidas.
    for (let i = 0; i < 10; i++) e = aplicaVeredito(e, 'up')
    expect(e.degrau).toBe(DEGRAU_DA_PERSPECTIVA + 1)
    expect(capacidadesDo(e.degrau).perspectiva).toBe(false)
  })

  it('a aposta é permitida UMA vez: sem queda prévia, a perspectiva sobe', () => {
    // A catraca não pode virar "perspectiva nunca". Quem tem folga de verdade
    // sobe ao degrau 0 e fica — e é para esses que a perspectiva existe.
    let e: Escada = { degrau: 1, piso: 0 }
    e = aplicaVeredito(e, 'up')
    expect(e.degrau).toBe(DEGRAU_DA_PERSPECTIVA)
    expect(capacidadesDo(e.degrau).perspectiva).toBe(true)
  })

  it('descer do degrau do brilho também fecha — e é o defeito das luzes', () => {
    /**
     * "As luzes estão apagando e voltando", relatado pelo dono DEPOIS de a
     * catraca já existir para a perspectiva. Era a mesma doença na fronteira
     * seguinte: bloom é o que põe halo nas fontes, e sem ele o varal vira um
     * cordão de pontinhos chapados.
     *
     * E esta fronteira a primeira sonda não via, porque ela media `dpr` pelo
     * tamanho do buffer — e de 1,25 para 1,0 o tamanho quase não muda, enquanto
     * o que o olho percebe some por inteiro.
     */
    let e: Escada = { degrau: DEGRAU_DO_BRILHO, piso: 0 }
    expect(capacidadesDo(e.degrau).brilho).toBe(true)
    e = aplicaVeredito(e, 'down')
    expect(capacidadesDo(e.degrau).brilho).toBe(false)
    expect(e.piso).toBe(DEGRAU_DO_BRILHO + 1)

    for (let i = 0; i < 10; i++) e = aplicaVeredito(e, 'up')
    expect(capacidadesDo(e.degrau).brilho).toBe(false)
  })

  it('a catraca fecha em TODA fronteira onde a cara da cena muda', () => {
    /**
     * A regra não enumera fronteiras: compara o que se vê nos dois lados. Este
     * teste varre a escada inteira e exige a equivalência — assim, uma
     * capacidade nova em `Capacidades` entra protegida sem ninguém lembrar de
     * vir aqui, e uma que deixe de ser protegida quebra na hora.
     */
    for (let d = 0; d < TIERS.length - 1; d++) {
      const mudou =
        JSON.stringify(capacidadesDo(d)) !== JSON.stringify(capacidadesDo(d + 1))
      const depois = aplicaVeredito({ degrau: d, piso: 0 }, 'down')
      expect(depois.piso, `degrau ${d} → ${d + 1}`).toBe(mudou ? d + 1 : 0)
    }
  })

  it('a catraca NÃO fecha nos degraus de baixo', () => {
    /**
     * Ali o que muda é resolução: a troca é suave, reversível, e travá-la
     * impediria a cena de se recuperar de uma lentidão passageira — outra aba
     * comendo a GPU, uma carga de textura. É justamente o caso para o qual a
     * escada sobe.
     */
    let e: Escada = { degrau: 2, piso: 0 }
    e = aplicaVeredito(e, 'down')
    expect(e.piso).toBe(0)
    e = aplicaVeredito(e, 'up')
    expect(e.degrau).toBe(2)
  })

  it('a escada nunca sai da faixa de degraus que existem', () => {
    // Descer do último degrau não pode inventar um degrau que `TIERS` não tem:
    // `capacidadesDo` devolveria tudo desligado e a cena apagaria sem motivo.
    let e: Escada = { degrau: TIERS.length - 1, piso: 0 }
    for (let i = 0; i < 5; i++) e = aplicaVeredito(e, 'down')
    expect(e.degrau).toBe(TIERS.length - 1)
  })

  it("'hold' não mexe em nada", () => {
    const e: Escada = { degrau: 2, piso: 1 }
    expect(aplicaVeredito(e, 'hold')).toEqual(e)
  })
})
