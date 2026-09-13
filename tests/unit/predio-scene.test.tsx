import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  AncoraDeObjeto,
  alturaDoObjeto,
  enderecoDoObjeto,
  janelaDeAndares,
  ladrilhosDoPlano,
  pecasDoObjeto,
  xDoObjeto,
} from '@/components/predio/Predio'
import { progressoDoCurso } from '@/components/predio/predio-rolagem'
import { ANDARES } from '@/components/predio/predio-programa'
import { ALTURA_ANDAR, PILARES, PLANOS } from '@/components/predio/predio-arquitetura'
import { quadroDe } from '@/components/predio/predio-descida'
import { DEGRAU_DA_PERSPECTIVA, capacidadesDo } from '@/components/predio/predio-qualidade'
import { startingStep } from '@/components/three/portico-quality'

/**
 * `Predio.tsx` é o único arquivo do prédio com three.js, e jsdom não sobe
 * WebGL: NENHUM teste aqui vê a cena. O que ele consegue provar são duas
 * classes de coisa, e as duas foram escolhidas porque a regressão delas é
 * SILENCIOSA — passa em tudo e quebra o site.
 *
 *  1. **Aritmética pura da cena** — janela de andares, ladrilhos de parallax,
 *     endereços, geometria dos objetos, leitura da rolagem. São números; não
 *     precisam de GPU e por isso não podem ficar sem suíte.
 *  2. **Duas invariantes de TEXTO do próprio arquivo** — o contrato de opacidade
 *     e a proibição de `<a>` cru. As duas foram achadas por revisores da Task 7,
 *     nenhuma quebra compilação, e nenhuma é visível num teste de comportamento:
 *     por isso o teste lê o código-fonte.
 *
 * O resto (que a descida percorre os sete andares, que a sombra é longa, que os
 * pilares atravessam a queda) só se prova no navegador — está no relatório da
 * tarefa, não aqui, e fingir o contrário seria pior que não testar.
 */

// `process.cwd()` e não `import.meta.url`: o vitest transforma o módulo e a URL
// que chega aqui não é mais de esquema `file:`. A raiz do vitest é a raiz do
// repositório (ver vite.config.ts), então o caminho é estável.
const FONTE = readFileSync(resolve(process.cwd(), 'components/predio/Predio.tsx'), 'utf8')

/**
 * O arquivo é comentado em prosa densa, e a prosa CITA o que os testes abaixo
 * procuram — "usar `<a>` cru", "`alpha: true`". Varrer o texto bruto acusaria os
 * próprios comentários que explicam a regra. Tirar comentário antes de varrer é
 * o que faz o teste falar sobre o código.
 */
function semComentarios(fonte: string): string {
  return fonte
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

const CODIGO = semComentarios(FONTE)

describe('AncoraDeObjeto', () => {
  it('sempre sai da ordem de tabulação (tabIndex -1), mesmo sem o chamador pedir', () => {
    render(<AncoraDeObjeto href="/x">objeto</AncoraDeObjeto>)
    expect(screen.getByRole('link', { name: 'objeto' })).toHaveAttribute('tabindex', '-1')
  })

  /**
   * A garantia não pode depender de o chamador "lembrar" de não passar
   * `tabIndex` — porque é exatamente esse tipo de lembrete que a Task 1
   * (`PredioSlot.tsx`) documentou e ninguém tinha como fazer cumprir. Um
   * chamador que tentasse `tabIndex={0}` continua saindo da ordem de
   * tabulação: o componente é quem decide por último.
   */
  it('não pode ser sobrescrita por um tabIndex explícito do chamador', () => {
    render(
      <AncoraDeObjeto href="/x" tabIndex={0}>
        objeto
      </AncoraDeObjeto>,
    )
    expect(screen.getByRole('link', { name: 'objeto' })).toHaveAttribute('tabindex', '-1')
  })

  it('continua clicável e com href real — só o foco de teclado sai, não o mouse', () => {
    render(<AncoraDeObjeto href="/#sistemas">rack</AncoraDeObjeto>)
    expect(screen.getByRole('link', { name: 'rack' })).toHaveAttribute('href', '/#sistemas')
  })
})

/**
 * A cena inteira vive dentro de um invólucro `aria-hidden="true"` posto por
 * `PredioSlot`, e a camada de teclado é o fallback ATRÁS dela. Uma âncora
 * focável aqui faria o usuário de teclado tabular DUAS VEZES por cada destino
 * do prédio — e nada no compilador impede que a próxima pessoa a mexer neste
 * arquivo escreva `<a href=...>` em vez de `<AncoraDeObjeto>`. Este teste é o
 * que impede.
 */
describe('nenhuma âncora crua sobre o canvas', () => {
  const antesDaAncora = CODIGO.split('export function AncoraDeObjeto')[0] ?? ''

  it('o arquivo tem exatamente um `<a>` no fonte, e ele é o de dentro de AncoraDeObjeto', () => {
    expect(CODIGO.match(/<a[\s/>]/g) ?? []).toHaveLength(1)
    expect(antesDaAncora).not.toMatch(/<a[\s/>]/)
  })

  it('não importa `next/link` — o `<Link>` renderiza uma âncora focável', () => {
    expect(CODIGO).not.toMatch(/from\s+'next\/link'/)
    expect(antesDaAncora).not.toMatch(/<Link[\s/>]/)
  })
})

/**
 * CONTRATO DE OPACIDADE. `PredioSlot` esconde o fallback empilhando-o ATRÁS da
 * cena, não recortando-o. Se a cena pintar um único pixel transparente, sete
 * andares de texto aparecem através do prédio — e nenhum teste de jsdom, que
 * roda sem WebGL, tem como ver isso acontecer. Sobra ler o fonte.
 */
describe('contrato de opacidade', () => {
  it('o buffer de desenho não tem canal alfa', () => {
    expect(CODIGO).toMatch(/alpha:\s*false/)
    expect(CODIGO).not.toMatch(/alpha:\s*true/)
  })

  it('a configuração opaca é a que chega ao `<Canvas>`', () => {
    expect(CODIGO).toMatch(/const OPACO = \{[^}]*alpha:\s*false/)
    expect(CODIGO).toMatch(/gl=\{OPACO\}/)
  })

  it('a cor de limpeza é declarada, não herdada', () => {
    expect(CODIGO).toMatch(/<color\s+attach="background"/)
  })
})

describe('janela de andares vivos', () => {
  it('são três no miolo — anterior, atual e próximo', () => {
    expect(janelaDeAndares(3)).toEqual([2, 3, 4])
  })

  it('nas pontas a janela encolhe em vez de estourar o índice', () => {
    expect(janelaDeAndares(0)).toEqual([0, 1])
    expect(janelaDeAndares(ANDARES.length - 1)).toEqual([ANDARES.length - 2, ANDARES.length - 1])
  })

  /**
   * "Só três andares vivos. Os demais não entram na árvore." Se esta conta
   * crescer, o custo de quadro cresce junto e em silêncio — no aparelho do
   * visitante, não no meu.
   */
  it('nunca passa de três, e nunca sai da faixa, em qualquer ponto da descida', () => {
    for (let p = 0; p <= 1; p += 0.002) {
      const vivos = janelaDeAndares(quadroDe(p).andar)
      expect(vivos.length).toBeLessThanOrEqual(3)
      expect(vivos.length).toBeGreaterThanOrEqual(2)
      for (const i of vivos) {
        expect(i).toBeGreaterThanOrEqual(0)
        expect(i).toBeLessThan(ANDARES.length)
      }
    }
  })

  it('o andar ativo está sempre dentro da própria janela', () => {
    for (let i = 0; i < ANDARES.length; i++) expect(janelaDeAndares(i)).toContain(i)
  })
})

/**
 * O ladrilho é o que impede o plano de parallax de ACABAR no meio da descida —
 * defeito que só apareceria no fim do prédio, no aparelho de quem rolou até o
 * fim, e que ninguém percebe olhando a cobertura.
 */
describe('ladrilhos dos planos de parallax', () => {
  const parallaxes = PLANOS.map((p) => p.parallax)

  it('nada acima da cobertura: y = 0 é o topo do prédio, e acima dele só há céu', () => {
    for (const parallax of parallaxes) {
      for (const y of ladrilhosDoPlano(parallax)) expect(y).toBeLessThanOrEqual(0)
    }
  })

  it('o passo é exatamente um pé-direito com laje', () => {
    for (const parallax of parallaxes) {
      const ladrilhos = ladrilhosDoPlano(parallax)
      expect(ladrilhos.length).toBeGreaterThan(1)
      for (let i = 1; i < ladrilhos.length; i++) {
        expect(ladrilhos[i - 1]! - ladrilhos[i]!).toBeCloseTo(ALTURA_ANDAR, 9)
      }
    }
  })

  /**
   * A conta que o comentário de `ladrilhosDoPlano` explica: o que um plano
   * precisa cobrir é a altura do prédio MULTIPLICADA pelo parallax dele. Se
   * alguém "simplificar" isso para a altura crua, o fundo passa a ter três
   * vezes mais ladrilho do que precisa — e se inverter o fator, ele acaba
   * cedo demais e a tela fica com um buraco no fim da descida.
   */
  it('há ladrilho sob a câmera em todo ponto da descida, e o plano não acaba antes do prédio', () => {
    for (const parallax of parallaxes) {
      const ladrilhos = ladrilhosDoPlano(parallax)
      const fundo = ladrilhos[ladrilhos.length - 1]!
      for (let p = 0; p <= 1; p += 0.01) {
        const alvo = quadroDe(p).pose.y * parallax
        const abaixo = ladrilhos.filter((y) => y <= alvo)
        // Ou existe ladrilho logo abaixo da câmera, ou a câmera ainda está
        // acima do primeiro (só na cobertura, onde o que se vê é céu).
        if (abaixo.length > 0) expect(alvo - abaixo[0]!).toBeLessThanOrEqual(ALTURA_ANDAR)
        else expect(alvo).toBeGreaterThan(-ALTURA_ANDAR)
      }
      expect(fundo).toBeLessThanOrEqual(quadroDe(1).pose.y * parallax - 5.5)
    }
  })
})

/**
 * `AncoraDeObjeto` é um `<a>` cru — não tem o `basePath` que o `next/link`
 * resolveria sozinho. Errar aqui produz `/portfolio/portfolio/...` ou um link
 * que só funciona em `npm run dev`, os dois invisíveis até o deploy.
 */
describe('endereço de um objeto clicável', () => {
  it('destino de âncora aponta para a home no idioma, sem barra final', () => {
    expect(enderecoDoObjeto('pt', '/#sistemas')).toBe('/portfolio/pt/#sistemas')
    expect(enderecoDoObjeto('en', '/#contato')).toBe('/portfolio/en/#contato')
  })

  it('destino de caminho leva barra final — `trailingSlash: true` no next.config', () => {
    expect(enderecoDoObjeto('pt', '/projetos')).toBe('/portfolio/pt/projetos/')
    expect(enderecoDoObjeto('en', '/blog')).toBe('/portfolio/en/blog/')
  })

  it('nenhum destino real do programa produz basePath duplicado', () => {
    for (const andar of ANDARES) {
      for (const objeto of andar.objetos) {
        for (const locale of ['pt', 'en'] as const) {
          const url = enderecoDoObjeto(locale, objeto.destino)
          expect(url.startsWith(`/portfolio/${locale}/`)).toBe(true)
          expect(url).not.toMatch(/\/portfolio\/portfolio/)
        }
      }
    }
  })
})

describe('geometria procedural dos objetos', () => {
  it('todo objeto do programa tem desenho próprio, não o volume genérico', () => {
    const generico = pecasDoObjeto('__nao-existe__')
    for (const andar of ANDARES) {
      for (const objeto of andar.objetos) {
        expect(pecasDoObjeto(objeto.id)).not.toEqual(generico)
      }
    }
  })

  /** Três peças é o teto declarado: é a silhueta que precisa ser reconhecível
   *  na sombra longa, não o detalhe. */
  it('nenhum objeto passa de três peças, e nenhuma peça afunda na laje', () => {
    for (const andar of ANDARES) {
      for (const objeto of andar.objetos) {
        const pecas = pecasDoObjeto(objeto.id)
        expect(pecas.length).toBeGreaterThan(0)
        expect(pecas.length).toBeLessThanOrEqual(3)
        for (const peca of pecas) expect(peca.pos[1] - peca.tam[1] / 2).toBeGreaterThanOrEqual(-0.01)
      }
    }
  })

  it('a âncora pousa acima do objeto que ela representa', () => {
    for (const andar of ANDARES) {
      for (const objeto of andar.objetos) {
        expect(alturaDoObjeto(objeto.id)).toBeGreaterThan(0.3)
      }
    }
  })

  /** O vão útil fica DENTRO dos pilares: um móvel nascendo em cima de uma
   *  coluna é o defeito que essa conta existe para não ter. */
  it('todo objeto do programa cai dentro do vão dos pilares', () => {
    const limite = Math.max(...PILARES.map(Math.abs))
    expect(xDoObjeto(0.5)).toBeCloseTo(0, 9)
    for (const andar of ANDARES) {
      for (const objeto of andar.objetos) {
        expect(Math.abs(xDoObjeto(objeto.x))).toBeLessThanOrEqual(limite)
      }
    }
  })
})

/**
 * O NÚMERO QUE MOVE A CÂMERA. Medido em `/pt/predio/` antes de escrito: a
 * janela NÃO rola (`scrollY` 0, `body.scrollHeight` 800, `innerHeight` 800) —
 * quem rola é o `<div>` do fallback, com 5600 px de curso, porque "um andar por
 * tela, sem barra de rolagem" fez dele o elemento rolável. Ler `window.scrollY`
 * deixaria a câmera parada na cobertura para sempre.
 */
describe('progresso da rolagem', () => {
  it('a janela da rota de prévia não é fonte de descida — curso zero', () => {
    expect(progressoDoCurso({ scrollTop: 0, scrollHeight: 800, clientHeight: 800 }, 800)).toBeNull()
  })

  it('o contêiner de sete telas é, e devolve 0..1 de ponta a ponta', () => {
    const caixa = { scrollHeight: 5600, clientHeight: 800 }
    expect(progressoDoCurso({ ...caixa, scrollTop: 0 }, 800)).toBe(0)
    expect(progressoDoCurso({ ...caixa, scrollTop: 2400 }, 800)).toBeCloseTo(0.5, 9)
    expect(progressoDoCurso({ ...caixa, scrollTop: 4800 }, 800)).toBe(1)
  })

  it('uma lista pequena com overflow não sequestra a câmera', () => {
    expect(progressoDoCurso({ scrollTop: 40, scrollHeight: 900, clientHeight: 600 }, 800)).toBeNull()
  })

  it('rolagem horizontal nem chega a ser considerada — curso vertical zero', () => {
    expect(progressoDoCurso({ scrollTop: 0, scrollHeight: 400, clientHeight: 400 }, 800)).toBeNull()
  })

  it('rolagem além do fim (bounce de iOS) continua aparada em 1', () => {
    expect(progressoDoCurso({ scrollTop: 9000, scrollHeight: 5600, clientHeight: 800 }, 800)).toBe(1)
  })
})

/**
 * A PONTE entre os dois módulos de qualidade, que nenhum dos dois testa
 * sozinho: `predio-qualidade.test.ts` prova que a perspectiva só existe no
 * degrau 0, e `portico-quality` decide em que degrau a cena NASCE. A promessa
 * da spec ("a perspectiva nunca é o estado inicial") só é verdade se o degrau
 * de partida nunca for o degrau 0 — e é aqui que isso fica preso.
 */
describe('a perspectiva nunca nasce ligada', () => {
  it('o degrau de partida não é o da perspectiva', () => {
    expect(startingStep()).not.toBe(DEGRAU_DA_PERSPECTIVA)
    expect(capacidadesDo(startingStep()).perspectiva).toBe(false)
  })

  it('nem no aparelho de dedo, nem no de ponteiro fino', () => {
    // Os dois únicos degraus que `startingStep` sabe devolver.
    for (const degrau of [1, 3]) expect(capacidadesDo(degrau).perspectiva).toBe(false)
  })
})
