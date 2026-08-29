import { describe, expect, it, vi } from 'vitest'
import {
  junino,
  deslocamentoBalanco,
  escalaPopDoNascimento,
  extensaoElemento,
} from '@/components/ativacoes/temas/junino'
import { TEMA_ATIVO } from '@/components/ativacoes/temas'
import { TOLERANCIA, type TipoAlvo } from '@/components/ativacoes/motor-reflexo'
import { pt } from '@/content/pt'
import { en } from '@/content/en'

/**
 * O pincel de mentira grava o que foi pedido a ele. Não é mock de
 * comportamento: as funções de desenho não têm retorno para afirmar, e o que
 * importa é justamente O QUE elas mandam o canvas fazer — em particular o que
 * elas NUNCA podem mandar.
 *
 * GRAVA ARGUMENTO, NÃO SÓ NOME (achado da revisão, rodada de correção 1). A
 * versão anterior só empilhava o NOME do método em `chamadas`, e
 * `desenharElemento` nunca muda QUAIS métodos chama por causa do balanço —
 * só os números que passa pra `translate`. Um teste que compara só nomes
 * passaria mesmo se o balanço tivesse sido apagado do código inteiro: two
 * arrays de nomes idênticos, zero e zero. `chamadasComArgumentos` grava os
 * dois — nome e argumentos —, então uma regressão que muda O QUE é
 * desenhado (não só que algo foi desenhado) tem como ser pega.
 */
function pincelDeMentira() {
  const chamadas: string[] = []
  const chamadasComArgumentos: { metodo: string; args: unknown[] }[] = []
  const alvo = {
    chamadas,
    chamadasComArgumentos,
    // Propriedades que o código escreve; guardadas para inspeção.
    shadowBlur: 0,
    filter: 'none',
    globalCompositeOperation: 'source-over',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D & {
    chamadas: string[]
    chamadasComArgumentos: { metodo: string; args: unknown[] }[]
  }

  for (const metodo of [
    'save', 'restore', 'beginPath', 'closePath', 'moveTo', 'lineTo', 'arc',
    'ellipse', 'quadraticCurveTo', 'bezierCurveTo', 'fill', 'stroke', 'fillRect',
    'translate', 'rotate', 'scale', 'setLineDash', 'drawImage', 'createLinearGradient',
    'createRadialGradient', 'clip', 'rect',
  ] as const) {
    // `createLinearGradient`/`createRadialGradient` precisam devolver algo com
    // `addColorStop`, senão o tema quebra ao montar um gradiente.
    const devolve = metodo.startsWith('create') ? { addColorStop: vi.fn() } : undefined
    ;(alvo as unknown as Record<string, unknown>)[metodo] = (...args: unknown[]) => {
      chamadas.push(metodo)
      chamadasComArgumentos.push({ metodo, args })
      return devolve
    }
  }
  return alvo
}

describe('tema junino', () => {
  it('tem a forma completa de um tema', () => {
    expect(junino.id).toBe('junino')
    expect(typeof junino.desenharElemento).toBe('function')
    expect(typeof junino.desenharAlvoAtivo).toBe('function')
    expect(typeof junino.desenharEstouro).toBe('function')
    expect(typeof junino.desenharFundo).toBe('function')
    for (const cor of Object.values(junino.paleta)) {
      expect(cor, `cor inválida: ${cor}`).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })

  it('a chave de convite existe no dicionário, nos dois idiomas', () => {
    expect(pt.ativacoes.capa.convitesTema[junino.chaveConvite]).toBeTruthy()
    expect(en.ativacoes.capa.convitesTema[junino.chaveConvite]).toBeTruthy()
  })

  it('o tema ativo é o junino', () => {
    expect(TEMA_ATIVO.id).toBe(junino.id)
  })

  // A medição anterior desta rota registrou 59,88fps com CPU 4x estrangulada, e
  // esse número é o orçamento que o tema gasta. `shadowBlur` e `filter` são os
  // caminhos lentos documentados do Canvas 2D — usá-los faria a página
  // contradizer, na primeira tela, a promessa que ela vende.
  //
  // Fábricas, não um `var` içado no laço: cada rodada cria o próprio pincel de
  // mentira com `const`, então o fechamento de cada função nunca aponta para
  // o pincel de uma rodada diferente. `var` funcionava aqui por içamento — a
  // reatribuição acontecia antes de cada `desenhar()` rodar — mas é frágil e
  // depende de um comportamento que o lint deste repositório rejeita.
  it('nenhuma função de desenho usa caminho lento de canvas', () => {
    const fabricas = [
      (p: ReturnType<typeof pincelDeMentira>) => junino.desenharElemento(p, 24, 0.6, 1, 1000, false, 'normal'),
      // Task 5: premiado é o tipo que ganha brilho (composição aditiva) — é
      // exatamente ele que corre o risco de tentar atalho por `shadowBlur`
      // se alguém "otimizar" o brilho sem ler este teste primeiro.
      (p: ReturnType<typeof pincelDeMentira>) => junino.desenharElemento(p, 24, 0.6, 1, 1000, false, 'premiado'),
      (p: ReturnType<typeof pincelDeMentira>) => junino.desenharElemento(p, 24, 0.6, 1, 1000, false, 'recusa'),
      (p: ReturnType<typeof pincelDeMentira>) => junino.desenharAlvoAtivo(p, 24, 1000, false),
      (p: ReturnType<typeof pincelDeMentira>) => junino.desenharEstouro(p, 24, 0.5),
      (p: ReturnType<typeof pincelDeMentira>) => junino.desenharFundo(p, 800, 600, 1000, false),
    ]
    for (const desenhar of fabricas) {
      const p = pincelDeMentira()
      desenhar(p)
      expect(p.shadowBlur, 'shadowBlur foi usado').toBe(0)
      expect(p.filter, 'filter foi usado').toBe('none')
    }
  })

  it('desenha alguma coisa em cada função', () => {
    const casos = [
      ['elemento', (p: ReturnType<typeof pincelDeMentira>) => junino.desenharElemento(p, 24, 0.6, 1, 1000, false, 'normal')],
      ['alvo ativo', (p: ReturnType<typeof pincelDeMentira>) => junino.desenharAlvoAtivo(p, 24, 1000, false)],
      ['estouro', (p: ReturnType<typeof pincelDeMentira>) => junino.desenharEstouro(p, 24, 0.5)],
      ['fundo', (p: ReturnType<typeof pincelDeMentira>) => junino.desenharFundo(p, 800, 600, 1000, false)],
    ] as const
    for (const [nome, desenhar] of casos) {
      const p = pincelDeMentira()
      desenhar(p)
      expect(p.chamadas.length, `${nome} não desenhou nada`).toBeGreaterThan(0)
    }
  })

  /**
   * A TRAVA MAIS IMPORTANTE DESTE ARQUIVO.
   *
   * REESCRITA na rodada de correção 1: a versão anterior testava só
   * `deslocamentoBalanco` ISOLADO — e isso deixou passar um defeito de
   * verdade. `easeOutBack` ultrapassa 1 em TODO nascimento (não é bug, é a
   * curva), e a revisão mediu que, composto com a largura renderizada e o
   * balanço no mesmo instante, o raio=24 chegava a 45,4px contra 38,4px de
   * tolerância — 18% pra fora. O termo isolado nunca acusaria isso: o
   * balanço sozinho respeitava o próprio limite, e a ultrapassagem do pop
   * era um fator de escala separado que o teste antigo nem olhava.
   *
   * Este teste varre a janela de entrada INTEIRA (`nascimento` de 0 a 1, onde
   * a ultrapassagem acontece) cruzada com a fase INTEIRA do balanço
   * (`agora`) — os dois são livres pra coincidir em qualquer combinação,
   * porque `agora` é o relógio do jogo, não o tempo desde que o alvo
   * nasceu: um balão pode nascer em QUALQUER fase do balanço. E usa
   * `extensaoElemento`/`escalaPopDoNascimento`, as MESMAS funções que
   * `desenharElemento` chama pra desenhar — testar uma cópia da fórmula não
   * prende o código de verdade, só uma reimplementação dela que pode
   * divergir com o tempo.
   *
   * TOLERÂNCIA IMPORTADA, NÃO COPIADA (fix wave final de branch): a versão
   * anterior hardcodava `TOLERANCIA_MOTOR = 1.6` porque `TOLERANCIA` não era
   * exportada de `motor-reflexo.ts`. Esse número é a única régua contra a
   * qual esta varredura de 600 mil pontos mede o invariante mais importante
   * do branch — se `TOLERANCIA` mudasse no motor, a cópia hardcoded aqui
   * continuaria em 1,6 e a varredura seguiria passando contra um número que
   * já não é o que o jogo usa. `motor-reflexo.ts` agora exporta a constante
   * de verdade, e este teste importa em vez de copiar.
   */
  it('a composição de pop + balanço nunca tira o elemento de dentro da tolerância de acerto', () => {
    const raio = 24
    const limite = raio * TOLERANCIA

    let pior = 0
    for (let n = 0; n <= 1; n += 0.002) {
      // `escalaVida = 1`: pior caso é um alvo recém-nascido (`vida` perto
      // de 1 é exatamente quando `nascimento` também está varrendo a
      // ultrapassagem) — `extensaoElemento` já recebe a escala combinada
      // pronta, igual `desenharElemento` monta.
      const { largura, altura } = extensaoElemento(raio, escalaPopDoNascimento(n))
      const metadeMaior = Math.max(largura, altura) / 2
      // Mesmo amortecimento de entrada que `desenharElemento` aplica ao
      // balanço (`limitar01(nascimento)`) — sem ele o teste defenderia uma
      // fórmula que o desenho não usa.
      const fatorBalanco = Math.max(0, Math.min(1, n))
      for (let agora = 0; agora <= 6_000; agora += 5) {
        const { dx, dy } = deslocamentoBalanco(agora, raio)
        const extensao = metadeMaior + Math.hypot(dx, dy) * fatorBalanco
        pior = Math.max(pior, extensao)
      }
    }

    // Não só "dentro" — dentro com folga real: até 90% do limite. Uma
    // composição que passa raspando no limite exato reprovaria no próximo
    // ajuste de meio pixel.
    const limiteComFolga = limite * 0.9
    expect(
      pior,
      `pior caso composto chegou a ${pior.toFixed(2)}px, limite é ${limite.toFixed(2)}px (folga exigida: ${limiteComFolga.toFixed(2)}px)`,
    ).toBeLessThanOrEqual(limiteComFolga)
  })

  /**
   * ACHADO DA REVISÃO (rodada de correção 1): a versão anterior comparava só
   * `chamadas` (nomes de método) e `desenharElemento` nunca muda QUAIS
   * métodos chama por causa do balanço — só os argumentos de `translate`.
   * Duas listas de nomes idênticas passariam mesmo que o balanço tivesse
   * sido apagado do código: o teste não conseguia falhar de verdade.
   *
   * Agora compara `chamadasComArgumentos` — e cobra as DUAS metades da
   * garantia: igual sob `parado`, DIFERENTE sem `parado`. A segunda metade
   * importa tanto quanto a primeira — sem ela, um `desenharElemento` que não
   * desenhasse nada também passaria (duas listas vazias são "iguais" IGUAL
   * às duas listas vazias de antes).
   */
  it('em modo parado o elemento não balança, e em modo ativo o balanço muda com o tempo', () => {
    const p = pincelDeMentira()
    junino.desenharElemento(p, 24, 0.6, 1, 1000, true, 'normal')
    const q = pincelDeMentira()
    junino.desenharElemento(q, 24, 0.6, 1, 9999, true, 'normal')
    expect(
      p.chamadasComArgumentos,
      'parado deveria desenhar exatamente igual pra `agora` diferentes',
    ).toEqual(q.chamadasComArgumentos)

    const r = pincelDeMentira()
    junino.desenharElemento(r, 24, 0.6, 1, 1000, false, 'normal')
    const s = pincelDeMentira()
    junino.desenharElemento(s, 24, 0.6, 1, 9999, false, 'normal')
    expect(
      r.chamadasComArgumentos,
      'sem parado, `agora` diferentes deveriam desenhar diferente — senão o teste não pega regressão nenhuma',
    ).not.toEqual(s.chamadasComArgumentos)
  })

  /**
   * ACHADO DA REVISÃO FINAL DE BRANCH: esta comparação usava `p.chamadas`
   * (só NOMES de método) — o mesmo defeito que a revisão anterior já tinha
   * corrigido no teste irmão acima ("em modo parado o elemento não
   * balança..."), e pelo mesmo motivo: `desenharFundo` nunca muda QUAIS
   * métodos chama por causa da brasa, só os NÚMEROS que passa pra `arc`
   * (posição `x`, `y`, que derivam de `oscilacao`/`subidaPx` — ambos função
   * de `tempo`). Comparar só nomes não detecta a brasa se mexendo.
   *
   * Sob o travamento CORRETO (`desenharBrasas(pincel, largura, altura,
   * parado ? 0 : agora)` em `desenharFundo`), os dois lados deste teste
   * recebem `tempo = 0` não importa o `agora` de fora — por isso `p` e `q`
   * sempre batem, com `1000`/`50_000` ou com qualquer outro par.
   *
   * A FRAGILIDADE está em quão bem o `chamadas` (só nomes) pegaria uma
   * REGRESSÃO nesse travamento — alguém apagando o `parado ? 0 :` e deixando
   * `agora` vazar cru para `desenharBrasas`. Medido (script fora do
   * repositório): com o travamento removido, `agora=1000` deixa as 10
   * `SEMENTES_BRASA` (`temas/junino.ts`) vivas, mas `agora=50_000` apaga
   * exatamente uma — `(50_000 + 400) mod VIDA_BRASA_MS(4200) = 0` zera o
   * alpha da semente de `faseMs: 400`, e ela é pulada (`if (alpha <= 0)
   * continue`) — 9 vivas em vez de 10. A contagem diferente (9 vs 10) já
   * faz um array de só NOMES ter tamanho diferente, e `toEqual` reprovaria
   * — mas por ACIDENTE de contagem, não porque o teste verificou a posição
   * de nenhuma brasa. Trocar `50_000` por `9_999` (mesma contagem de vivas
   * que `1000`, verificado) faria essa mesma regressão passar batida: nomes
   * e contagem idênticos nos dois lados, apesar de cada brasa estar em `x`,
   * `y` bem diferentes — nomes de método não carregam posição.
   *
   * `chamadasComArgumentos` fecha isso: grava os números que `arc` recebeu,
   * então uma regressão no travamento diverge os dois lados pela posição em
   * si, não pela sorte de uma contagem batendo ou não — a mesma correção do
   * teste irmão, e pelo mesmo motivo.
   */
  it('em modo parado o fundo não se move', () => {
    const p = pincelDeMentira()
    junino.desenharFundo(p, 800, 600, 1000, true)
    const q = pincelDeMentira()
    junino.desenharFundo(q, 800, 600, 50_000, true)
    expect(p.chamadasComArgumentos).toEqual(q.chamadasComArgumentos)
  })

  /**
   * TASK 5 — o tema desenha os três tipos de alvo (`TipoAlvo` da Task 4:
   * `normal | premiado | recusa`) por FORMA, não por cor.
   *
   * Motivo comercial, não estético: 8% dos homens são daltônicos, um
   * projetor de evento desloca matiz, e o tema roda em cima de paletas de
   * cliente que a agência não escolhe. Se os três tipos só diferissem em
   * matiz, a decisão que o motor acabou de criar (Task 4: prioridade do
   * premiado, custo do erro na recusa) ficaria invisível pra quem joga sob
   * qualquer uma dessas condições — a tarefa falharia mesmo com o teste
   * verde, então o teste teve de medir FORMA (a sequência de método+
   * argumentos do pincel), não a paleta.
   *
   * `pincelDeMentira` é o mesmo espião do resto do arquivo — Node/jsdom não
   * tem `Path2D` (ver o cabeçalho de `temas/junino.ts`), então esta suíte
   * sempre exercita o traçado vetorial de cada tipo, nunca o sprite
   * assado; é exatamente esse traçado vetorial que precisa ramificar por
   * tipo, e é o que este bloco prende.
   */
  describe('alvo por tipo — leitura por forma, não por cor', () => {
    function assinatura(tipo: TipoAlvo): { chamadas: string[]; chave: string } {
      const p = pincelDeMentira()
      junino.desenharElemento(p, 24, 0.6, 1, 1000, false, tipo)
      return { chamadas: p.chamadas, chave: JSON.stringify(p.chamadasComArgumentos) }
    }

    it('cada tipo desenha um caminho diferente — normal, premiado e recusa nunca coincidem', () => {
      const normal = assinatura('normal')
      const premiado = assinatura('premiado')
      const recusa = assinatura('recusa')
      expect(premiado.chave, 'premiado precisa diferir de normal por forma').not.toBe(normal.chave)
      expect(recusa.chave, 'recusa precisa diferir de normal por forma').not.toBe(normal.chave)
      expect(recusa.chave, 'recusa precisa diferir de premiado por forma').not.toBe(premiado.chave)
    })

    it('não usa shadowBlur nem filter em tipo nenhum — proibidos pelo orçamento de quadro', () => {
      for (const tipo of ['normal', 'premiado', 'recusa'] as const) {
        const p = pincelDeMentira()
        junino.desenharElemento(p, 24, 0.6, 1, 1000, false, tipo)
        expect(p.shadowBlur, `shadowBlur foi usado em ${tipo}`).toBe(0)
        expect(p.filter, `filter foi usado em ${tipo}`).toBe('none')
      }
    })

    /**
     * A REGRA MAIS IMPORTANTE DA TAREFA: recusa precisa ler como ANGULAR —
     * a silhueta oposta ao balão redondo — não só "diferente" por acaso.
     * Nenhum `arc`/`ellipse` (as primitivas de curva do canvas) e pelo
     * menos os quatro lados retos de um losango.
     */
    it('a recusa é puramente angular — nenhum arco, nenhuma curva', () => {
      const p = pincelDeMentira()
      junino.desenharElemento(p, 24, 0.6, 1, 1000, false, 'recusa')
      expect(p.chamadas, 'recusa desenhou arco — devia ser só reta').not.toContain('arc')
      expect(p.chamadas, 'recusa desenhou elipse — devia ser só reta').not.toContain('ellipse')
      // Um losango fechado com `moveTo` + `closePath` grava só 3 `lineTo`
      // (o quarto lado é o próprio fechamento) — 3 é o mínimo correto de um
      // quadrilátero, não um número frouxo.
      expect(
        p.chamadas.filter((c) => c === 'lineTo').length,
        'losango precisa de pelo menos 3 lados retos',
      ).toBeGreaterThanOrEqual(3)
    })

    /**
     * O premiado precisa da composição ADITIVA que dá o brilho (Step 3 do
     * brief) — sem ela, o "prêmio" não se distingue de um balão qualquer
     * quando as duas formas acontecerem de coincidir em algum ambiente sem
     * `Path2D`. `globalCompositeOperation` é uma PROPRIEDADE escrita, não
     * uma chamada — por isso o teste lê `p.globalCompositeOperation`
     * diretamente, não `p.chamadas`.
     */
    it('o premiado usa composição aditiva (globalCompositeOperation = "lighter") em algum ponto do desenho', () => {
      const visto: string[] = []
      const p = pincelDeMentira()
      const alvoComEspiaoDeAtributo = new Proxy(p, {
        set(obj, prop, valor) {
          if (prop === 'globalCompositeOperation') visto.push(String(valor))
          return Reflect.set(obj, prop, valor)
        },
      })
      junino.desenharElemento(alvoComEspiaoDeAtributo, 24, 0.6, 1, 1000, false, 'premiado')
      expect(visto, 'premiado nunca setou globalCompositeOperation="lighter"').toContain('lighter')
    })
  })
})
