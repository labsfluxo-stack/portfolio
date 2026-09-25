import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import {
  AR,
  COR_DO_SOL,
  INTENSIDADE_DO_SOL,
  MINIMO_AA,
  PREENCHIMENTO,
  corDoAndar,
  corDoRotulo,
} from '@/components/predio/predio-luz'
import { ANDARES } from '@/components/predio/predio-programa'
import { contraste } from '@/lib/contraste'

/**
 * O QUE A LUZ REALMENTE RECEBE, e não o que a chamada parece dizer.
 *
 * `tom()` em `Predio.tsx` faz `new THREE.Color(hex).multiplyScalar(f).getStyle()`
 * — ou seja, a cor volta para uma STRING `rgb(r,g,b)` antes de chegar na luz. E
 * `Color.setStyle` clampa cada canal em 255 na volta. Qualquer fator que empurre
 * um canal acima de 1,0 em linear é descartado em silêncio, e o que sobra não é
 * só mais escuro: é de OUTRO MATIZ, porque os canais saturam em ordens
 * diferentes.
 *
 * Este helper mede o estrago. Vive no teste, não no módulo, pela mesma razão que
 * `frieza` abaixo: é instrumento de medição, não contrato público.
 */
function oQueChega(hex: string, fator: number): THREE.Color {
  return new THREE.Color(new THREE.Color(hex).multiplyScalar(fator).getStyle())
}

/** Luminância relativa Rec. 709 sobre valores JÁ lineares. */
function luminancia(c: THREE.Color): number {
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b
}

/**
 * Quanto o canal azul supera o vermelho no hex — a mesma leitura que a revisão
 * usou para confirmar a olho que `automacao` (kelvin mais alto) é a cor mais
 * fria do arco. Vive no teste, não no módulo: é instrumento de medição, não
 * parte do contrato público de `predio-luz.ts`.
 */
function frieza(hex: string): number {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = (n >> 16) & 255
  const b = n & 255
  return b - r
}

/**
 * A direção de arte é hora dourada, e ela existe em parte PARA ser legível ao
 * ar livre — tela âmbar de luminância média se lê sob sol, tela quase preta
 * não. Esse argumento só vale se alguém medir. Este arquivo mede.
 */
describe('luz do prédio', () => {
  it.each(ANDARES.map((a, i) => [a.chave, i] as const))(
    'o rótulo do andar %s passa AA sobre a cor dele',
    (_chave, i) => {
      expect(contraste(corDoRotulo(i), corDoAndar(i))).toBeGreaterThanOrEqual(MINIMO_AA)
    },
  )

  it('toda cor é hex de seis dígitos', () => {
    for (let i = 0; i < ANDARES.length; i++) {
      expect(corDoAndar(i)).toMatch(/^#[0-9a-f]{6}$/i)
      expect(corDoRotulo(i)).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  // A guarda vivia como `throw` em tempo de módulo dentro de predio-luz.ts —
  // mas isso derruba a página em produção no dia em que um oitavo andar entrar
  // em ANDARES sem cor correspondente, em vez de derrubar só a suíte. Aqui o
  // mesmo descompasso custa um teste vermelho, não uma tela branca.
  it('há uma cor de ar para cada andar do programa', () => {
    expect(AR.length).toBe(ANDARES.length)
  })

  /**
   * O teste de kelvin acima guarda o DADO de entrada (`predio-programa.ts`);
   * este guarda a SAÍDA deste módulo — as cores que `corDoAndar` de fato
   * produz. Sem ele, `AR` poderia ser embaralhado, invertido ou monocromático
   * que a suíte inteira continuaria verde, porque nada mais chama `corDoAndar`
   * e olha para a cor. Provado: com `AR` invertido este teste falha (pico de
   * frieza cai em `design`, índice 2, não em `automacao`, índice 4); com `AR`
   * como está, passa.
   */
  it('a cor mais fria do arco cai no mesmo andar que o kelvin mais frio', () => {
    const kelvins = ANDARES.map((a) => a.kelvin)
    const picoKelvin = kelvins.indexOf(Math.max(...kelvins))
    const friezas = ANDARES.map((_, i) => frieza(corDoAndar(i)))
    const picoFrieza = friezas.indexOf(Math.max(...friezas))

    expect(picoFrieza).toBe(picoKelvin)
    expect(friezas[0]).toBeLessThan(friezas[picoFrieza]!)
    expect(friezas[friezas.length - 1]).toBeLessThan(friezas[picoFrieza]!)
  })

  /**
   * O arco de temperatura é o que faz a luz contar a mesma história que a ordem
   * dos andares: máquina em cima, gente embaixo. Quente na cobertura, frio no
   * miolo, quente de novo na recepção — onde a luz já é artificial.
   */
  it('a temperatura desce e volta a subir na recepção', () => {
    const k = ANDARES.map((a) => a.kelvin)
    const meio = k.indexOf(Math.max(...k))
    expect(meio).toBeGreaterThan(0)
    expect(meio).toBeLessThan(k.length - 1)
    expect(k[k.length - 1]).toBeLessThan(k[meio]!)
    expect(k[0]).toBeLessThan(k[meio]!)
  })
})

/**
 * AS DUAS LUZES DA CENA, medidas — e elas nasceram deste teste porque as duas
 * estavam erradas, cada uma do seu jeito, e nenhum teste existente podia ver.
 *
 * O `directionalLight` lia `corDoRotulo(0)`, que é TINTA DE TEXTO (#2a1806).
 * Funcionava enquanto havia um rótulo só para o prédio inteiro e ele era âmbar
 * claro; quando o rótulo passou a ser por andar, o da cobertura virou escuro
 * porque a cobertura ficou clara. O céu foi consertado naquele dia (a constante
 * `CEU` existe por isso, e `CIDADE` e `CENARIO` pelo mesmo motivo). O sol não.
 *
 * O `hemisphereLight` multiplicava por 7 e por 4,5 dentro de `tom()`, e o
 * comentário de `ALBEDO`, no MESMO arquivo, já dizia que "#d9a066 × 5 satura em
 * branco" — foi por isso que os fatores de albedo desceram para perto de 1. A
 * linha da luz ficou 1800 linhas abaixo e não recebeu a lição: o céu do
 * hemisfério chegava em (1,000 1,000 0,930), branco, perdendo 79 % do vermelho
 * e 59 % do verde do âmbar que a chamada pedia.
 *
 * Somados, os dois bugs diziam a mesma coisa: a cena era iluminada por um
 * preenchimento quase branco e sem direção, com um sol residual. "Iluminação
 * plana" não era impressão, era a configuração.
 */
describe('as luzes da cena', () => {
  it('a cor do sol não é emprestada de nenhum rótulo', () => {
    // A regra que `predio-luz.ts` já aplica ao céu, à cidade e ao cenário,
    // agora medida: cor de LUZ e cor de TEXTO não compartilham constante.
    for (let i = 0; i < AR.length; i++) {
      expect(COR_DO_SOL).not.toBe(corDoRotulo(i))
    }
  })

  it.each([
    ['céu do preenchimento', () => corDoAndar(0), PREENCHIMENTO.fatorDoCeu],
    ['chão do preenchimento', () => corDoAndar(4), PREENCHIMENTO.fatorDoChao],
    ['sol', () => COR_DO_SOL, 1],
  ])('a cor da luz %s chega inteira, sem saturar no getStyle', (_nome, hex, fator) => {
    const pretendido = new THREE.Color(hex()).multiplyScalar(fator)
    const chegou = oQueChega(hex(), fator)

    // A folga cobre a quantização do `rgb()` inteiro — meio nível em 255, que
    // perto do meio da curva vale ~0,0017 em linear. NÃO cobre clamp: o céu do
    // hemisfério, com o fator 7, errava 79 % no vermelho. Três ordens de
    // grandeza separam os dois casos, então a folga pode ser generosa.
    for (const canal of ['r', 'g', 'b'] as const) {
      expect(Math.abs(chegou[canal] - pretendido[canal])).toBeLessThan(
        Math.max(pretendido[canal] * 0.03, 0.004),
      )
    }
  })

  it('o sol é luz principal, não figurante', () => {
    // O bug que esta asserção protege: o sol entregando uma fração do
    // preenchimento, que é o mesmo que não ter sol — e sem luz com direção não
    // há face clara contra face escura, não há modelagem e não há contato.
    // A janela é larga de propósito: a proporção exata é direção de arte, o que
    // NÃO é arte é o sol virar figurante de novo sem ninguém perceber.
    const sol = luminancia(new THREE.Color(COR_DO_SOL)) * INTENSIDADE_DO_SOL
    const preenchimento =
      luminancia(new THREE.Color(corDoAndar(0))) *
      PREENCHIMENTO.fatorDoCeu *
      PREENCHIMENTO.intensidade

    expect(sol / preenchimento).toBeGreaterThan(0.5)
    expect(sol / preenchimento).toBeLessThan(4)
  })

  it('o preenchimento preserva a relação céu/chão do arco de temperatura', () => {
    // O hemisfério tem UMA intensidade para as duas cores, então a relação
    // entre elas só pode viver nos fatores. Era 7 : 4,5 = 1,556 quando os dois
    // saturavam; tem que continuar 1,556 agora que nenhum satura.
    expect(PREENCHIMENTO.fatorDoCeu / PREENCHIMENTO.fatorDoChao).toBeCloseTo(7 / 4.5, 2)
  })
})
