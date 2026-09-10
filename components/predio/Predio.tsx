'use client'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { AnchorHTMLAttributes, ReactNode, Ref, RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { Dictionary, Locale } from '@/content/types'
import { ANDARES, type ObjetoDoAndar } from './predio-programa'
import {
  ALTURA_ANDAR,
  LAJE,
  PE_DIREITO,
  PILARES,
  PLANOS,
  SOL,
  alturaTotal,
  topoDoAndar,
} from './predio-arquitetura'
import { amortecer, quadroDe } from './predio-descida'
import { corDoAndar, corDoRotulo } from './predio-luz'
import { capacidadesDo, temPerspectiva, type Capacidades } from './predio-qualidade'
import { TIERS, type Tier, createMeter, judge, startingStep } from '../three/portico-quality'

/**
 * O prédio em corte, em hora dourada — o ÚNICO arquivo do recurso que importa
 * three.js.
 *
 * Nunca é montado direto: `PredioSlot.tsx` o carrega por `next/dynamic` com
 * `ssr: false`, depois de `load` + ociosidade, e só quando WebGL existe e
 * `prefers-reduced-motion` está desligado. Tudo aqui vive dentro de um
 * invólucro `aria-hidden="true"` — a camada acessível é o `PredioFallback`,
 * atrás desta. Ver o comentário grande de `PredioSlot.tsx`.
 *
 * As quatro decisões que governam o arquivo:
 *
 * 1. **A rolagem entra por um REF.** `setState` a cada evento de rolagem
 *    re-renderiza a árvore a cada pixel e transforma a descida numa
 *    apresentação de slides. O React monta a cena; `useFrame` a anima. O único
 *    `setState` ligado à rolagem é o do ANDAR ATIVO — sete vezes na descida
 *    inteira, não uma por pixel —, porque a janela de três andares vivos é
 *    estrutura de árvore e não dá para escrevê-la por ref.
 * 2. **Um sol só, rasante, e é ele que projeta.** Elevação 8,5° (ver `SOL`): a
 *    sombra de um objeto de 1 m mede quase 7 m. É a sombra longa e horizontal
 *    que faz três planos parecerem três profundidades — ao meio-dia eles
 *    colapsam num só. Nenhuma outra luz da cena projeta.
 * 3. **A cena nasce em parallax.** A perspectiva real é PROMOVIDA por
 *    `predio-qualidade.ts` quando o quadro prova folga, nunca é o estado
 *    inicial: `startingStep()` devolve 1 ou 3, e a perspectiva só existe no
 *    degrau 0. Celular é requisito desta home, não versão reduzida.
 * 4. **O clique é âncora de DOM, nunca raycast.** Cada objeto ganha um
 *    `<AncoraDeObjeto>` de verdade, projetado sobre o canvas quadro a quadro.
 *    O raycast só acende o brilho do hover. Assim o alvo de toque tem 44 px, o
 *    clique-do-meio abre em nova aba e o menu de contexto funciona — de graça.
 *
 * Zero `Math.random()`: a geometria é aritmética pura sobre o dado dos andares,
 * então a cena é idêntica a cada carregamento — a regra da casa de
 * `components/three/`.
 */

// ── Contrato de opacidade ─────────────────────────────────────────────────

/**
 * ESTA CENA PINTA PIXEL OPACO. Não é gosto: é contrato com `PredioSlot`.
 *
 * O slot esconde o fallback EMPILHANDO-O ATRÁS desta cena (`-z-10`), e não
 * recortando-o (ver a seção "mecanismo de oclusão visual" lá) — o recorte foi
 * um defeito Crítico já corrigido uma vez. Empilhar só funciona se o que está
 * na frente for opaco. E o padrão NÃO é opaco: o `<Canvas>` do r3f injeta
 * `alpha: true` quando o chamador não diz nada (ver `configure()` em
 * `@react-three/fiber`), e sem esta linha os sete andares de texto do fallback
 * apareceriam através do prédio.
 *
 * O QUE `alpha: false` FAZ, DE VERDADE, no three r185 — e a primeira versão
 * deste comentário errava: ele NÃO tira o canal alfa do buffer. Desde que o
 * `WebGLRenderer` passou a criar o contexto com `alpha: true` fixo
 * (`WebGLRenderer.js`, `contextAttributes`), o parâmetro virou outra coisa:
 * ele decide o CLEAR ALPHA. `alpha: false` ⇒ limpa com alfa 1 (opaco);
 * `alpha: true` ⇒ limpa com alfa 0 (transparente). Foi medido no navegador —
 * `getContextAttributes().alpha` devolve `true` mesmo com esta configuração, e
 * é esperado. O que importa é que todo pixel sai com alfa 1: os limpos pelo
 * clear, e os desenhados por material opaco (nenhum material desta cena é
 * `transparent`).
 *
 * A liquidação é dupla e deliberada:
 *   - `gl={{ alpha: false }}` — o clear alpha vale 1, então nenhuma região não
 *     desenhada da cena é transparente. É a garantia estrutural.
 *   - `<color attach="background">` — a cor de limpeza é explícita e declarada,
 *     em vez de herdada. É ela que o `useFrame` interpola para a cor do andar
 *     ativo (o gradiente de temperatura da spec), então a mesma linha que
 *     resolve o contrato entrega a direção de arte.
 *
 * `tests/unit/predio-scene.test.tsx` lê o TEXTO deste arquivo e falha se
 * `alpha: false` sumir ou se um `alpha: true` aparecer. Tem que ser assim: a
 * regressão é invisível em jsdom, que roda sem WebGL nenhum, e invisível a olho
 * nu enquanto ninguém abrir a página exatamente no andar onde o texto de trás
 * bate com o fundo. A prova empírica é outra e está no relatório da tarefa:
 * pintar a camada do fallback de magenta e conferir que nenhum pixel magenta
 * sobrevive na área do canvas.
 */
const OPACO = { alpha: false, antialias: true, powerPreference: 'high-performance' } as const

// ── Medidas da cena ───────────────────────────────────────────────────────

/** Distância da câmera ao plano da frente. Sai de `predio-descida.ts`, não de
 *  um segundo número escrito aqui — o recuo é dela. */
const RECUO = quadroDe(0).pose.z

/**
 * Meia-largura do corte, em metros. Muito além dos pilares (±6,4) de propósito:
 * "sem margem lateral, o prédio ocupa a largura inteira" (spec). A laje precisa
 * sangrar pelas duas bordas em qualquer formato de tela, inclusive ultrawide —
 * e uma caixa mais larga não custa um triângulo a mais.
 */
const MEIA_LARGURA = 15

/** Meia-largura do VÃO ÚTIL: onde os objetos moram, dentro dos pilares. */
const MEIA_VAO = 6

/** Profundidade da laje em parallax, e em perspectiva promovida. */
const PROF_PARALLAX = 7
const PROF_PERSPECTIVA = 13

/** Borda da frente do corte: onde a laje termina, do lado do visitante. */
const BORDA = 1.6

/** Onde os objetos clicáveis e os pilares moram, em z. */
const Z_OBJETO = 0.2
const Z_PILAR = -1.15

/** Meia-altura visível folgada, usada para dimensionar os planos de fundo. */
const MARGEM_VISIVEL = 9

/** Distância do sol. Só posiciona a câmera de sombra — luz direcional não
 *  decai, então isto não mexe em intensidade. */
const DISTANCIA_DO_SOL = 34

/**
 * A direção do sol, a partir de `SOL` — e a convenção de azimute fica escrita
 * aqui porque `predio-arquitetura.ts` declara o ângulo sem fixar o eixo zero.
 *
 * Azimute 0° é +z, o eixo da câmera, e cresce na direção de +x. Com 104° o sol
 * fica à DIREITA e 14° ATRÁS do plano do corte, e isso é escolha, não sobra:
 * com o sol à frente, a sombra de cada objeto cairia para o FUNDO do andar,
 * atrás da parede, onde ninguém a vê. Atrás, ela varre a laje na direção do
 * visitante — que é justamente onde a spec precisa dela. O custo é que a face
 * virada para a câmera fica em contraluz; é o que o preenchimento hemisférico
 * existe para levantar, e é o que hora dourada de verdade faz.
 */
const DIRECAO_DO_SOL = ((): THREE.Vector3 => {
  const az = (SOL.azimute * Math.PI) / 180
  const el = (SOL.elevacao * Math.PI) / 180
  return new THREE.Vector3(
    Math.cos(el) * Math.sin(az),
    Math.sin(el),
    Math.cos(el) * Math.cos(az),
  ).normalize()
})()

/** Mesma tinta, outro valor — nunca um hex novo. Mesmo helper do Pórtico. */
const tom = (hex: string, fator: number): string =>
  new THREE.Color(hex).multiplyScalar(fator).getStyle()

/**
 * Quanto cada superfície multiplica a cor do ar do andar — e os fatores são
 * ALTOS de propósito, o que só parece estranho até saber de onde `corDoAndar`
 * veio.
 *
 * Aquelas cores foram escritas em `predio-luz.ts` para serem FUNDO DE TEXTO em
 * HTML, medidas contra AA com o rótulo por cima: são escuras por dever de
 * contraste. Albedo é outra coisa — é quanto da luz a superfície devolve —, e
 * usar a cor de fundo como albedo foi exatamente o defeito que a primeira
 * versão desta cena teve no navegador: com o sol 14° atrás do corte, tudo que
 * olha para a câmera vive só do preenchimento, e um albedo de fundo escuro
 * multiplicado por um preenchimento fraco dá preto. A tela ficou quase preta —
 * o oposto da hora dourada, e o oposto do que a spec exige para o "celular sob
 * sol forte" (tela âmbar de luminância média é legível ao ar livre; tela quase
 * preta não é).
 *
 * Os fatores multiplicam em espaço LINEAR (é o que `THREE.Color` faz com um hex
 * sRGB), então ×5 não é "cinco vezes mais claro na tela": é pouco mais que o
 * dobro em valor percebido. A INTENÇÃO do arco de temperatura sobrevive
 * inteira, porque todo andar é multiplicado pelo mesmo fator — o que muda é o
 * nível, nunca a relação entre os sete.
 */
const ALBEDO = { laje: 5.0, teto: 3.4, parede: 4.2, viga: 4.6, objeto: 2.2 } as const

// Mesma constante que `PredioFallback.tsx`, `Header.tsx` e `lib/seo.ts` usam:
// a forma canônica de ler o `basePath` fora do que o Next resolve sozinho.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '/portfolio'

// ── Aritmética pura da cena (testável sem GPU) ────────────────────────────

/**
 * A janela de andares vivos: `andar - 1`, `andar`, `andar + 1`, aparada nas
 * pontas. Os demais NÃO entram na árvore — não é `visible={false}`, é ausência.
 */
export function janelaDeAndares(andar: number): number[] {
  const vivos: number[] = []
  for (let i = andar - 1; i <= andar + 1; i++) {
    if (i >= 0 && i < ANDARES.length) vivos.push(i)
  }
  return vivos
}

/**
 * Onde um plano de parallax precisa ter conteúdo, em coordenada LOCAL do grupo.
 *
 * A conta está escrita porque ela é a metade não óbvia do parallax: o grupo do
 * plano fica em `pose.y - planos[i]`, então um elemento em `yl` aparece na tela
 * a `yl - y·parallax` da câmera. Ou seja, o que o plano precisa cobrir não é a
 * altura do prédio — é a altura do prédio MULTIPLICADA pelo parallax dele. O
 * fundo (0,35) precisa de um terço do que a frente precisaria, e é por isso que
 * ele é barato.
 *
 * O teto é a linha da cobertura (y = 0 é o topo do prédio): acima dela não
 * existe estrutura em plano nenhum, só céu. Sem esse corte, o ladrilho de cima
 * viraria uma faixa de concreto pairando no meio do céu da cobertura.
 */
export function ladrilhosDoPlano(parallax: number): number[] {
  const base = quadroDe(1).pose.y * parallax - MARGEM_VISIVEL
  const ladrilhos: number[] = []
  for (let y = 0; y >= base; y -= ALTURA_ANDAR) ladrilhos.push(y)
  return ladrilhos
}

/**
 * O endereço final de um objeto clicável.
 *
 * `AncoraDeObjeto` é um `<a>` CRU de propósito (é assim que ela consegue forçar
 * `tabIndex={-1}`, ver o comentário dela), então ela não tem o `basePath` que o
 * `next/link` resolveria sozinho — a composição é manual, com a mesma constante
 * que `PredioFallback.tsx` já usa. `trailingSlash: true` no `next.config.ts` é
 * o motivo da barra final em destino de caminho; destino de âncora
 * (`/#sistemas`) aponta para uma seção da própria home e não leva barra.
 *
 * O que se perde: navegação de caminho vira recarga completa em vez de
 * transição client-side. É troca consciente — a camada de teclado e de leitor
 * de tela é o fallback, que usa `next/link` para esses mesmos destinos; aqui, a
 * garantia de que nenhuma âncora sobre o canvas entra na ordem de tabulação
 * vale mais que a transição.
 */
export function enderecoDoObjeto(locale: Locale, destino: string): string {
  if (destino.startsWith('/#')) return `${BASE_PATH}/${locale}${destino}`
  return `${BASE_PATH}/${locale}${destino}/`
}

/** Uma caixa do móvel, em coordenada local com a base apoiada na laje. */
export type Peca = {
  pos: readonly [number, number, number]
  tam: readonly [number, number, number]
  /** Inclinação em torno de x, em radianos. Tampo, prancheta, tela. */
  giro?: number
}

/**
 * A geometria de cada objeto, em caixas — procedural, sem asset baixado.
 *
 * Três peças no máximo por objeto, e o limite é por causa da SOMBRA, não do
 * polígono: com o sol a 8,5° cada caixa joga quase 7 m de mancha na laje, e é a
 * silhueta que precisa ser reconhecível, não o detalhe. Um rack de dezoito
 * peças e um rack de três projetam a mesma sombra.
 *
 * O `default` não é defensivo por hábito: um objeto novo em
 * `predio-programa.ts` passa a existir na cena como um volume genérico em vez
 * de sumir sem aviso, e quem o adicionou vê que falta desenhá-lo.
 */
export function pecasDoObjeto(id: string): readonly Peca[] {
  switch (id) {
    case 'rack':
      return [
        { pos: [0, 0.85, 0], tam: [1.0, 1.7, 0.72] },
        { pos: [0, 1.42, 0.38], tam: [0.86, 0.1, 0.06] },
        { pos: [0, 1.02, 0.38], tam: [0.86, 0.1, 0.06] },
      ]
    case 'backup':
      return [
        { pos: [0, 0.34, 0], tam: [1.3, 0.68, 0.82] },
        { pos: [0, 0.88, 0], tam: [1.02, 0.4, 0.62] },
      ]
    case 'computador':
      return [
        { pos: [0, 0.36, 0], tam: [1.6, 0.72, 0.82] },
        { pos: [0, 1.0, -0.12], tam: [1.12, 0.64, 0.06], giro: -0.16 },
        { pos: [0, 0.75, 0.26], tam: [0.7, 0.04, 0.28] },
      ]
    case 'prancheta':
      return [
        { pos: [0, 0.4, 0], tam: [0.09, 0.8, 0.09] },
        { pos: [0, 0.98, 0], tam: [1.2, 0.86, 0.05], giro: -0.3 },
      ]
    case 'painel':
      return [
        { pos: [0, 0.5, 0], tam: [0.11, 1.0, 0.11] },
        { pos: [0, 1.36, 0], tam: [1.8, 0.9, 0.08] },
      ]
    case 'artigos':
      return [
        { pos: [0, 0.12, 0], tam: [1.2, 0.24, 0.9] },
        { pos: [0.06, 0.36, 0], tam: [1.1, 0.22, 0.86], giro: 0.05 },
        { pos: [-0.05, 0.58, 0], tam: [1.16, 0.2, 0.88], giro: -0.04 },
      ]
    case 'esteira':
      return [
        { pos: [0, 0.52, 0], tam: [2.6, 0.16, 0.9] },
        { pos: [-1.1, 0.26, 0], tam: [0.2, 0.52, 0.8] },
        { pos: [1.1, 0.26, 0], tam: [0.2, 0.52, 0.8] },
      ]
    case 'prateleira':
      return [
        { pos: [-0.82, 0.9, 0], tam: [0.1, 1.8, 0.72] },
        { pos: [0.82, 0.9, 0], tam: [0.1, 1.8, 0.72] },
        { pos: [0, 1.2, 0], tam: [1.72, 0.08, 0.66] },
      ]
    case 'balcao':
      return [
        { pos: [0, 0.5, 0], tam: [2.4, 1.0, 0.72] },
        { pos: [0, 1.06, 0.06], tam: [2.6, 0.12, 0.92] },
      ]
    case 'formulario':
      return [
        { pos: [0, 0.38, 0], tam: [2.2, 0.76, 0.9] },
        { pos: [0, 0.96, -0.2], tam: [0.9, 0.6, 0.05], giro: -0.12 },
        { pos: [0, 0.82, 0.22], tam: [1.4, 0.06, 0.5] },
      ]
    default:
      return [{ pos: [0, 0.5, 0], tam: [1, 1, 0.72] }]
  }
}

/** Altura do topo do objeto — é logo acima dela que a âncora de DOM pousa. */
export function alturaDoObjeto(id: string): number {
  return pecasDoObjeto(id).reduce((alto, peca) => Math.max(alto, peca.pos[1] + peca.tam[1] / 2), 0)
}

/** Fração de largura do andar (0 = esquerda, ver `ObjetoDoAndar.x`) → x em
 *  metros, dentro do vão útil. */
export function xDoObjeto(fracao: number): number {
  return (fracao - 0.5) * MEIA_VAO * 2
}

/**
 * Progresso 0..1 dentro de uma caixa que rola — ou `null` quando a caixa não é
 * a descida.
 *
 * O guarda-corpo é o CURSO MÍNIMO: só vale como fonte da descida um elemento
 * com pelo menos uma altura de janela de curso. Uma lista pequena com
 * `overflow` em algum canto da página não sequestra a câmera; a descida do
 * prédio tem seis alturas de janela e passa com folga. Rolagem horizontal
 * (bloco de código, tabela) nem chega a ser considerada: nela `scrollHeight ===
 * clientHeight` e o curso é zero.
 */
export function progressoDoCurso(
  caixa: { scrollTop: number; scrollHeight: number; clientHeight: number },
  cursoMinimo: number,
): number | null {
  const curso = caixa.scrollHeight - caixa.clientHeight
  if (curso < Math.max(1, cursoMinimo)) return null
  return Math.min(1, Math.max(0, caixa.scrollTop / curso))
}

// ── A rolagem ─────────────────────────────────────────────────────────────

/**
 * A rolagem entra por um REF, nunca por estado.
 *
 * `setState` a cada evento de rolagem re-renderiza a árvore inteira a cada
 * pixel e transforma uma descida suave numa apresentação de slides. O React não
 * participa do movimento: ele monta a cena, e o `useFrame` a anima.
 *
 * `{ passive: true }` promete ao navegador que não haverá `preventDefault`, o
 * que mantém a rolagem na thread de composição. É também por isso que não entra
 * biblioteca de scroll suave aqui: interceptar wheel/touch para interpolar é
 * exatamente o que piora o INP — o Core Web Vital que sustenta o
 * 95/100/100/100 deste site. O amortecimento acontece no `useFrame` que já
 * existe: sem dependência nova, sem custo de INP.
 *
 * ---
 *
 * QUEM ROLA NÃO É A JANELA, e isto foi MEDIDO antes de ser escrito.
 *
 * O núcleo dado no brief lia `window.scrollY / (document.body.scrollHeight -
 * innerHeight)`. Em `/pt/predio/` esses três números são, hoje, `0`, `800` e
 * `800`: o denominador é ZERO e o progresso nunca sai de zero — a câmera
 * ficaria parada na cobertura para sempre. A razão está no `PredioFallback`: a
 * decisão "um andar por tela, sem barra de rolagem" fez do PRÓPRIO fallback o
 * elemento que rola (`overflow-y-auto` num `<div>` de `100dvh`), com 5600 px de
 * curso medidos. A janela não rola coisa nenhuma.
 *
 * A saída NÃO é procurar o `<div>` do fallback por classe ou por `data-testid`
 * — seria acoplar a cena ao formato do DOM de outro componente, que muda sem
 * aviso, e quebraria de novo no dia em que o prédio virar a home de verdade e a
 * janela voltar a ser quem rola. A saída é ouvir `scroll` na FASE DE CAPTURA do
 * `document`: evento de rolagem não borbulha, mas captura, então um listener só
 * alcança qualquer elemento que role — a janela ou um `<div>` interno. Quem
 * rolou vem em `event.target`, e o progresso sai dele, filtrado por
 * `progressoDoCurso`.
 */
/**
 * O elemento que de fato rola nesta página, procurado pelo que ele FAZ e não
 * pelo que ele é: curso vertical de pelo menos uma altura de janela. Mesmo
 * critério de `progressoDoCurso`, e pela mesma razão — não amarrar a cena à
 * classe nem ao `data-testid` de um componente que ela não edita.
 */
let roladorLembrado: HTMLElement | null = null

function serveComoDescida(el: HTMLElement): boolean {
  return el.isConnected && el.scrollHeight - el.clientHeight >= window.innerHeight
}

function acharRolador(): HTMLElement | null {
  // Lembrado entre chamadas porque `useRepasseDeRolagem` chama isto a CADA
  // evento de roda: varrer todos os `<div>` da página sessenta vezes por
  // segundo seria pagar em varredura de DOM justamente durante a rolagem, que
  // é o momento que este arquivo inteiro existe para manter barato. A memória
  // é revalidada a cada uso, então um `<div>` que saiu do documento ou deixou
  // de ter curso é descartado em vez de virar um alvo morto.
  if (roladorLembrado && serveComoDescida(roladorLembrado)) return roladorLembrado
  roladorLembrado = null
  for (const el of Array.from(document.querySelectorAll<HTMLElement>('div'))) {
    if (serveComoDescida(el)) {
      roladorLembrado = el
      return el
    }
  }
  return null
}

/**
 * As teclas de rolagem movem a descida — e a razão de isto existir é um defeito
 * que o dono encontrou: "não consigo rolar para baixo e para cima".
 *
 * Metade era ponteiro (ver o contêiner da cena). A outra metade é esta: o
 * elemento que rola não é focável, `document.activeElement` é `<body>`, e as
 * teclas de rolagem vão para o DOCUMENTO — que nesta rota tem `scrollHeight ===
 * innerHeight` e não rola. O visitante apertava Page Down e nada acontecia.
 *
 * POR QUE NÃO A FORMA PADRÃO (contêiner de rolagem focável, com nome
 * acessível). Ela foi testada no navegador antes de ser descartada, e o
 * resultado está medido: com `tabindex="0"` no contêiner que rola, UM CLIQUE
 * DE MOUSE em qualquer lugar da cena passa a focá-lo; `focus-within:z-50` em
 * `PredioSlot.tsx` dispara; e a camada do fallback sobe para `z-index: 50`, na
 * FRENTE da cena. Um clique no prédio trocaria o prédio por sete telas de HTML
 * — defeito pior que o que se estava consertando. Desfazer isso exigiria
 * reescrever o `focus-within` (achado de revisão endurecido) para
 * `:has(:focus-visible)`, e num navegador sem `:has()` a revelação por foco
 * simplesmente não aconteceria: voltaria o WCAG 2.4.7 que aquele mecanismo
 * existe para resolver. Troca ruim.
 *
 * O QUE ISTO FAZ, e o que deliberadamente NÃO faz. Só age quando NINGUÉM está
 * focado — ou seja, exatamente na janela em que o navegador mandaria as teclas
 * para um documento que não rola. No instante em que o visitante tabula para
 * dentro do fallback (a camada de teclado desta página, por decisão
 * arquitetural de `PredioSlot.tsx`), `activeElement` deixa de ser `<body>`,
 * este atalho se cala e o tratamento NATIVO assume. Não há captura de foco,
 * não há tecla roubada de campo de texto, e o movimento continua sendo
 * `scrollTo`/`scrollBy` do navegador — com o `scroll-snap` do fallback fazendo
 * a parada cair no andar, como já fazia. Nada aqui interpola posição: essa é a
 * linha que separa isto de uma biblioteca de scroll suave, que a spec proíbe
 * por custo de INP.
 *
 * Um degrau de tecla é UMA TELA, não os ~40 px nativos da seta: o fallback é
 * `snap-mandatory`, e qualquer passo menor que meia tela volta para o mesmo
 * ponto de encaixe. Uma tecla, um andar — que é a própria unidade da página.
 */
function useTeclasDeDescida(): void {
  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.defaultPrevented || evento.altKey || evento.ctrlKey || evento.metaKey) return
      // Só quando o foco não está em lugar nenhum. Com qualquer coisa focada, o
      // navegador já sabe o que fazer e faz melhor.
      const ativo = document.activeElement
      if (ativo && ativo !== document.body && ativo !== document.documentElement) return

      const rolador = acharRolador()
      if (!rolador) return
      const tela = rolador.clientHeight
      const fim = rolador.scrollHeight - tela

      let destino: number | null = null
      switch (evento.key) {
        case 'PageDown':
        case 'ArrowDown':
          destino = Math.min(fim, rolador.scrollTop + tela)
          break
        case 'PageUp':
        case 'ArrowUp':
          destino = Math.max(0, rolador.scrollTop - tela)
          break
        case ' ':
          destino = evento.shiftKey
            ? Math.max(0, rolador.scrollTop - tela)
            : Math.min(fim, rolador.scrollTop + tela)
          break
        case 'Home':
          destino = 0
          break
        case 'End':
          destino = fim
          break
        default:
          return
      }

      evento.preventDefault()
      rolador.scrollTo({ top: destino })
    }

    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [])
}

/**
 * A rolagem SOBRE UMA ÂNCORA — o último buraco da correção da rolagem travada,
 * e o mais traiçoeiro dos três porque só aparece com o cursor num lugar certo.
 *
 * As âncoras precisam de `pointer-events: auto` (é o clique inteiro do
 * recurso), e com isso voltam a ser alvo de evento. Só que elas são filhas da
 * camada da cena, que é `position: fixed` e não rola: o encadeamento de rolagem
 * a partir delas sobe para `body`/`html`, que nesta rota não rolam. Medido: com
 * o cursor parado sobre "Ver os sistemas em produção", cinco eventos de roda
 * deixam `scrollTop` em 0. A descida trava de novo — só que agora num retângulo
 * de 189 × 44 px em vez da tela inteira.
 *
 * DUAS SAÍDAS FORAM MEDIDAS E DESCARTADAS ANTES DESTA:
 *   - Mover a sobreposição para DENTRO do elemento que rola (portal de React).
 *     Não funciona: um elemento `position: fixed` é retirado do conteúdo
 *     rolável do ancestral, então o encadeamento continua indo para a janela.
 *     Testado no navegador movendo o nó à mão — `scrollTop` seguiu em 0.
 *   - Deixar a sobreposição rolar junto com o conteúdo (`absolute` de verdade,
 *     compensando `scrollTop` a cada quadro). Funciona, mas a compensação só
 *     acontece no quadro seguinte: em rolagem rápida a âncora treme um quadro
 *     inteiro atrás do objeto.
 *
 * O que sobrou é REPASSAR. Repasse não é biblioteca de scroll suave, e a
 * diferença é exatamente a que a spec proíbe: aqui não há interpolação, curva
 * nem relógio próprio — o delta bruto vai direto para `scrollBy`, e quem faz
 * encaixe, inércia e limite continua sendo o navegador. O custo de INP fica
 * onde não importa: este listener só é alcançado por eventos que começam EM
 * CIMA de uma âncora, porque todo o resto da camada é `pointer-events: none`.
 * A rolagem comum da página nunca passa por aqui.
 */
function useRepasseDeRolagem(alvo: RefObject<HTMLDivElement | null>): void {
  useEffect(() => {
    const no = alvo.current
    if (!no) return

    // Passivo de propósito: sem `preventDefault`. O navegador ainda tenta rolar
    // a cadeia da âncora, que não rola nada, então não há rolagem dupla — e a
    // promessa de passividade mantém o evento fora do caminho crítico.
    const aoGirar = (evento: WheelEvent) => {
      acharRolador()?.scrollBy({ top: evento.deltaY })
    }

    // O toque é o oposto: aqui `preventDefault` é obrigatório, senão o gesto
    // não vira rolagem nenhuma. Por isso `{ passive: false }` — e por isso ele
    // fica preso a ESTE nó, nunca ao documento.
    let ultimoY: number | null = null
    const aoTocar = (evento: TouchEvent) => {
      ultimoY = evento.touches[0]?.clientY ?? null
    }
    const aoArrastar = (evento: TouchEvent) => {
      const y = evento.touches[0]?.clientY
      if (y === undefined || ultimoY === null) return
      const rolador = acharRolador()
      if (!rolador) return
      evento.preventDefault()
      rolador.scrollBy({ top: ultimoY - y })
      ultimoY = y
    }
    const aoSoltar = () => {
      ultimoY = null
    }

    no.addEventListener('wheel', aoGirar, { passive: true })
    no.addEventListener('touchstart', aoTocar, { passive: true })
    no.addEventListener('touchmove', aoArrastar, { passive: false })
    no.addEventListener('touchend', aoSoltar, { passive: true })
    no.addEventListener('touchcancel', aoSoltar, { passive: true })
    return () => {
      no.removeEventListener('wheel', aoGirar)
      no.removeEventListener('touchstart', aoTocar)
      no.removeEventListener('touchmove', aoArrastar)
      no.removeEventListener('touchend', aoSoltar)
      no.removeEventListener('touchcancel', aoSoltar)
    }
  }, [alvo])
}

function useProgressoDeRolagem(): RefObject<number> {
  const progresso = useRef(0)

  useEffect(() => {
    const daJanela = () => ({
      scrollTop: window.scrollY,
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: window.innerHeight,
    })

    // O último elemento que se PROVOU ser a descida. Sem ele, um `resize` (que
    // não tem `target` de rolagem) cairia no caminho da janela, que devolve
    // `null` quando quem rola é o `<div>` do fallback — e o progresso ficaria
    // congelado no valor antigo até o visitante rolar de novo. Girar o celular
    // no meio da descida é exatamente esse caso.
    let ultimoRolador: HTMLElement | null = null

    const ler = (evento?: Event) => {
      const alvo = evento?.target instanceof HTMLElement ? evento.target : ultimoRolador
      const caixa = alvo
        ? { scrollTop: alvo.scrollTop, scrollHeight: alvo.scrollHeight, clientHeight: alvo.clientHeight }
        : daJanela()
      const lido = progressoDoCurso(caixa, window.innerHeight)
      if (lido === null) return
      if (alvo) ultimoRolador = alvo
      progresso.current = lido
    }

    ler()
    document.addEventListener('scroll', ler, { passive: true, capture: true })
    window.addEventListener('resize', ler, { passive: true })
    return () => {
      document.removeEventListener('scroll', ler, { capture: true })
      window.removeEventListener('resize', ler)
    }
  }, [])

  return progresso
}

/**
 * `prefers-reduced-motion`, medido aqui dentro.
 *
 * `PredioSlot` já não monta a cena com a preferência ligada, então isto é
 * redundante do ponto de vista da página e deliberado do ponto de vista do
 * componente: quem garante que a câmera não tem inércia própria é a câmera, não
 * quem a montou. Mesmo padrão de `Portico.tsx` (`useStill`).
 *
 * O que muda é o AMORTECIMENTO. A descida em si é rolagem do visitante, e
 * rolagem não é animação — o que a preferência pede para tirar é a inércia que
 * continua depois que o dedo parou.
 */
function useSemInercia(): boolean {
  const [sem, setSem] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const ler = () => setSem(query.matches)
    ler()
    query.addEventListener('change', ler)
    return () => query.removeEventListener('change', ler)
  }, [])
  return sem
}

// ── Qualidade adaptativa ──────────────────────────────────────────────────

/**
 * A escada do Pórtico, reusada inteira — `TIERS`, `judge` e `startingStep` vêm
 * de `portico-quality.ts` e não são reimplementados aqui. `predio-qualidade.ts`
 * só traduz "em que degrau estou" para "o que eu ligo".
 *
 * `startingStep()` devolve 1 (ponteiro fino) ou 3 (dedo / poucos núcleos), e
 * `DEGRAU_DA_PERSPECTIVA` é 0 — então a perspectiva NUNCA é o estado inicial,
 * por construção e não por cuidado. Ela sobe quando `judge` promove o degrau,
 * ou seja, quando a mediana de quadro já provou folga.
 */
function useQualidade(vsync: number): {
  tier: Tier
  capacidades: Capacidades
  medir: (delta: number) => void
} {
  const setDpr = useThree((state) => state.setDpr)
  const [degrau, setDegrau] = useState(startingStep)
  const meter = useRef(createMeter())

  const tier = TIERS[Math.min(degrau, TIERS.length - 1)] ?? TIERS[0]!
  const capacidades = useMemo(() => capacidadesDo(degrau), [degrau])

  useEffect(() => {
    // O valor do degrau, direto — sem teto no `devicePixelRatio`. Desenhar
    // acima do que a tela exibe é supersampling, e é o que trata aresta,
    // textura e especular ao mesmo tempo. Mesma cicatriz do Pórtico.
    setDpr(tier.dpr)
  }, [tier.dpr, setDpr])

  const medir = (delta: number): void => {
    const veredito = judge(meter.current, delta, vsync, degrau, TIERS.length)
    if (veredito === 'down') setDegrau((atual) => atual + 1)
    else if (veredito === 'up') setDegrau((atual) => atual - 1)
  }

  return { tier, capacidades, medir }
}

// ── Enquadramento ─────────────────────────────────────────────────────────

/**
 * "Sem margem lateral: o prédio ocupa a largura inteira e o visitante está
 * encostado nele" (spec). Quem resolve isso é a LENTE, não a distância:
 * `pose.z` vem de `predio-descida.ts` e não se mexe.
 *
 * A conta é a de sempre — `tan(fovH/2) = meiaLargura / recuo` —, invertida para
 * achar a vertical num formato qualquer. O aperto e o teto existem porque em
 * retrato de celular a largura pedida só caberia numa lente de 116°, que
 * distorce tudo; ali o prédio sangra pelas laterais, que é exatamente o efeito
 * "encostado nele" e não um defeito.
 *
 * `useLayoutEffect` e não `useEffect`: com o segundo, o primeiro quadro sai na
 * lente de partida e o enquadramento "pula" uma vez ao abrir a página.
 */
const ABERTURA = { alvo: 8.6, min: 40, max: 62 } as const

function Enquadramento() {
  const camera = useThree((state) => state.camera)
  const largura = useThree((state) => state.size.width)
  const altura = useThree((state) => state.size.height)

  useLayoutEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return
    const aspecto = largura / Math.max(1, altura)
    const vertical = (2 * Math.atan(ABERTURA.alvo / RECUO / aspecto) * 180) / Math.PI
    camera.fov = Math.min(ABERTURA.max, Math.max(ABERTURA.min, vertical))
    camera.updateProjectionMatrix()
  }, [camera, largura, altura])

  return null
}

// ── Peças do prédio ───────────────────────────────────────────────────────

/**
 * Os pilares. Uma peça só de ponta a ponta, e é o elemento mais importante da
 * cena depois do sol: "sem eles as faixas viram slides soltos e a descida deixa
 * de ser uma descida" (spec).
 *
 * Vivem no grupo da FRENTE, que é o de deslocamento zero — ou seja, em
 * coordenada de mundo — e por isso atravessam a queda inteira sem depender de
 * nenhum andar estar vivo. Ficam ATRÁS dos objetos em z: o `formulario` mora em
 * x = 0,5 (o meio exato do vão), que é onde está o pilar central, e um balcão
 * na frente de uma coluna é o que um térreo de verdade tem.
 */
function Pilares({ material }: { material: THREE.Material }) {
  const altura = alturaTotal() + ALTURA_ANDAR * 2
  const centro = ALTURA_ANDAR - altura / 2
  return (
    <>
      {PILARES.map((x) => (
        <mesh key={x} castShadow receiveShadow position={[x, centro, Z_PILAR]} material={material}>
          <boxGeometry args={[0.52, altura, 0.74]} />
        </mesh>
      ))}
    </>
  )
}

/**
 * O CHÃO — a coisa em que a queda aterrissa.
 *
 * Não estava na primeira versão, e a falta apareceu no navegador: na última
 * parada, abaixo da laje da recepção, os planos de parallax continuavam com o
 * seu ritmo periódico e desenhavam o que parecia MAIS UM ANDAR embaixo do
 * térreo. A descida não terminava; ela era cortada. Uma massa opaca daqui para
 * baixo é o que diz "acabou" — e ela é funda o bastante em z (30 m) para tapar
 * os dois planos de trás, que é o defeito que ela existe para resolver.
 *
 * Vive no plano da FRENTE, o de deslocamento zero: chão que fizesse parallax
 * seria chão que se mexe.
 */
function Chao({ material }: { material: THREE.Material }) {
  const teto = topoDoAndar(ANDARES.length - 1) - PE_DIREITO - LAJE
  const altura = 26
  return (
    <mesh receiveShadow position={[0, teto - altura / 2, -12]} material={material}>
      <boxGeometry args={[MEIA_LARGURA * 2.4, altura, 30]} />
    </mesh>
  )
}

/**
 * Um objeto clicável, em caixas. O raycast entra AQUI e em nenhum outro lugar:
 * `onPointerOver`/`onPointerOut` acendem o brilho, e só. O clique é a âncora de
 * DOM que `Sobreposicao` desenha por cima.
 *
 * O brilho é lido de um `Map` compartilhado em vez de estado: a âncora de DOM
 * também escreve nele (passar o mouse sobre a âncora acende o objeto lá
 * dentro), e nem o hover do raycast nem o do DOM podem custar um render do
 * React — os dois acontecem justamente enquanto a descida está em curso.
 */
function ObjetoNaCena({
  objeto,
  base,
  cor,
  aceso,
  brilhos,
}: {
  objeto: ObjetoDoAndar
  /** Y da face de cima da laje em que o objeto se apoia. */
  base: number
  cor: string
  aceso: string
  brilhos: RefObject<Map<string, boolean>>
}) {
  const nivel = useRef(0)
  const pecas = useMemo(() => pecasDoObjeto(objeto.id), [objeto.id])
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: cor,
        emissive: new THREE.Color(aceso),
        emissiveIntensity: 0,
        roughness: 0.72,
        metalness: 0.08,
      }),
    [cor, aceso],
  )
  useEffect(() => () => material.dispose(), [material])

  useFrame((_, delta) => {
    const alvo = brilhos.current.get(objeto.id) ? 1 : 0
    nivel.current = amortecer(nivel.current, alvo, delta)
    material.emissiveIntensity = nivel.current * 0.55
  })

  // SEM `onPointerOver`/`onPointerOut` aqui, e a ausência é deliberada: o
  // canvas inteiro passou a ser `pointer-events: none` na correção da rolagem
  // (ver o comentário do contêiner em `Predio`), então o raycast do r3f não
  // recebe mais evento nenhum e um handler escrito aqui NUNCA dispararia.
  // Deixá-lo no arquivo seria código que mente sobre o que acontece.
  //
  // O brilho não morreu: quem o acende agora é o `onPointerEnter` da própria
  // âncora de DOM, em `Sobreposicao` — que é justamente o elemento que o
  // visitante aponta antes de clicar. O que se perdeu é acender o objeto
  // passando o mouse na MALHA, fora da caixa da âncora.
  return (
    <group position={[xDoObjeto(objeto.x), base, Z_OBJETO]}>
      {pecas.map((peca, i) => (
        <mesh
          key={i}
          castShadow
          receiveShadow
          material={material}
          position={[peca.pos[0], peca.pos[1], peca.pos[2]]}
          rotation={[peca.giro ?? 0, 0, 0]}
        >
          <boxGeometry args={[peca.tam[0], peca.tam[1], peca.tam[2]]} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Um andar vivo, no plano da frente.
 *
 * A LAJE FICA EMBAIXO, e essa escolha é o que faz a janela de três andares
 * fechar: a laje de um andar é o teto do andar de baixo, então cada andar vivo
 * chega com piso próprio E teto vindo do vizinho de cima. O único que sobra é o
 * mais ALTO da janela, cujo vizinho não está na árvore — ele paga um teto extra
 * (`comTeto`). A alternativa, cada andar desenhar piso e teto, punha duas lajes
 * coincidentes entre andares vizinhos: z-fighting garantido.
 *
 * `perspectiva` não é enfeite ligado/desligado: é a laje ficando quase o dobro
 * de funda e a parede do fundo recuando junto — o andar deixando de ser relevo
 * raso e virando sala. É a promoção que a escada de qualidade concede, e no
 * aparelho que não sustenta ninguém vê tela quebrada: vê parallax, que é bonito
 * por si.
 */
function AndarVivo({
  indice,
  comTeto,
  perspectiva,
  brilhos,
}: {
  indice: number
  comTeto: boolean
  perspectiva: boolean
  brilhos: RefObject<Map<string, boolean>>
}) {
  const andar = ANDARES[indice]!
  const topo = topoDoAndar(indice)
  const prof = perspectiva ? PROF_PERSPECTIVA : PROF_PARALLAX
  const zCentro = BORDA - prof / 2
  const zParede = BORDA - prof
  const piso = topo - PE_DIREITO
  const ar = corDoAndar(indice)
  const cobertura = indice === 0

  return (
    <group>
      {/* A laje que o andar pisa. É ela que recebe a sombra longa — o único
          plano da cena em que a mancha de 7 m tem onde cair. */}
      <mesh receiveShadow castShadow position={[0, piso - LAJE / 2, zCentro]}>
        <boxGeometry args={[MEIA_LARGURA * 2, LAJE, prof]} />
        <meshStandardMaterial color={tom(ar, ALBEDO.laje)} roughness={0.92} metalness={0} />
      </mesh>

      {/* Teto só para o andar mais alto da janela: o vizinho que o forneceria
          não está na árvore. Nunca acima da cobertura, que não tem teto — é de
          lá que a faixa de céu aparece. */}
      {comTeto && !cobertura && (
        <mesh receiveShadow position={[0, topo + LAJE / 2, zCentro]}>
          <boxGeometry args={[MEIA_LARGURA * 2, LAJE, prof]} />
          <meshStandardMaterial color={tom(ar, ALBEDO.teto)} roughness={0.95} metalness={0} />
        </mesh>
      )}

      {/* A parede do fundo carrega a COR DO AR do andar — é ela que conta o
          gradiente de temperatura de perto, enquanto o fundo da tela o conta de
          longe. */}
      <mesh receiveShadow position={[0, piso + PE_DIREITO / 2, zParede]}>
        <boxGeometry args={[MEIA_LARGURA * 2, PE_DIREITO, 0.3]} />
        <meshStandardMaterial color={tom(ar, ALBEDO.parede)} roughness={0.96} metalness={0} />
      </mesh>

      {/* Parapeito na cobertura, viga de borda nos andares. É o que dá
          espessura ao corte visto de frente, e é o que esconde o pé da faixa de
          céu na cobertura. */}
      <mesh castShadow receiveShadow position={[0, piso + (cobertura ? 0.44 : 0.16), BORDA - 0.12]}>
        <boxGeometry args={[MEIA_LARGURA * 2, cobertura ? 0.88 : 0.32, 0.24]} />
        <meshStandardMaterial color={tom(ar, ALBEDO.viga)} roughness={0.9} metalness={0} />
      </mesh>

      {andar.objetos.map((objeto) => (
        <ObjetoNaCena
          key={objeto.id}
          objeto={objeto}
          base={piso}
          cor={tom(ar, ALBEDO.objeto)}
          aceso={corDoRotulo(indice)}
          brilhos={brilhos}
        />
      ))}
    </group>
  )
}

/**
 * O ritmo periódico dos planos de trás — e o motivo de ele ser PERIÓDICO está
 * na aritmética, não no gosto.
 *
 * Um plano de parallax sai de registro com a frente ao longo da descida: o
 * fundo (0,35) termina quase 14 m deslocado. Qualquer conteúdo que precise
 * ficar ALINHADO a um andar — a parede daquele andar, o móvel daquele andar —
 * só pode morar no plano da frente, que é o de deslocamento zero. É exatamente
 * o que `predio-arquitetura.ts` já diz sobre a frente ser o plano de
 * referência, e é por isso que a âncora de DOM também mora lá.
 *
 * O que sobra para os outros dois é estrutura SEM registro: uma faixa
 * horizontal a cada pé-direito e montantes contínuos. Fora de registro, um
 * padrão periódico não tem como estar errado — ele só tem como estar mais
 * longe, que é o que se quer dele.
 */
function PlanoDeFundo({
  parallax,
  largura,
  cor,
  espessura,
}: {
  parallax: number
  largura: number
  cor: string
  espessura: number
}) {
  const ladrilhos = useMemo(() => ladrilhosDoPlano(parallax), [parallax])
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color: cor, roughness: 0.98, metalness: 0 }),
    [cor],
  )
  useEffect(() => () => material.dispose(), [material])

  const alto = ladrilhos[0] ?? 0
  const baixo = ladrilhos[ladrilhos.length - 1] ?? 0
  const vao = Math.max(ALTURA_ANDAR, alto - baixo)

  return (
    <group>
      {ladrilhos.map((y) => (
        <mesh key={y} position={[0, y, 0]} material={material}>
          <boxGeometry args={[largura * 2, espessura, 0.3]} />
        </mesh>
      ))}
      {/* Montantes CONTÍNUOS: são eles que dão verticalidade ao plano sem
          precisar de registro com andar nenhum. */}
      {[-largura * 0.56, 0, largura * 0.56].map((x) => (
        <mesh key={x} position={[x, (alto + baixo) / 2, -0.2]} material={material}>
          <boxGeometry args={[espessura * 0.9, vao + ALTURA_ANDAR, 0.24]} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * A faixa de céu. "O céu aparece só numa faixa fina no topo e some" (spec).
 *
 * Mora no plano do FUNDO, e é o parallax que a faz sumir sozinha: como o fundo
 * acompanha só 35 % da descida, a borda de baixo do céu se afasta para cima a
 * 0,65 da velocidade da câmera. Na cobertura ela encosta no parapeito; quatro
 * andares abaixo já saiu do quadro — sem uma linha de lógica de
 * aparecer/desaparecer escrita em lugar nenhum. Ela começa em y = 0 local, a
 * mesma linha em que `ladrilhosDoPlano` corta a estrutura, então não há costura
 * entre o topo do prédio e o pé do céu.
 *
 * O degradê é uma textura de canvas 2D gerada em código — nenhum asset baixado,
 * nenhuma licença, que é a técnica da casa. `fog={false}` porque a 30 m da
 * câmera a névoa dissolveria o céu inteiro na cor do fundo; `toneMapped={false}`
 * porque o céu é a referência de exposição da cena, não um material dentro dela.
 */
function Ceu() {
  const textura = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 4
    canvas.height = 256
    const ctx = canvas.getContext('2d')
    if (ctx) {
      // De cima para baixo: zênite fechado, meio quente, horizonte aceso — que
      // é a ordem de uma hora dourada de verdade. As três cores saem de
      // `predio-luz.ts`; nenhum hex novo entra aqui.
      const grad = ctx.createLinearGradient(0, 0, 0, 256)
      grad.addColorStop(0, tom(corDoAndar(0), 3.0))
      grad.addColorStop(0.62, tom(corDoRotulo(0), 0.5))
      grad.addColorStop(1, corDoRotulo(0))
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, 4, 256)
    }
    const t = new THREE.CanvasTexture(canvas)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  useEffect(() => () => textura.dispose(), [textura])

  const altura = 46
  return (
    <mesh position={[0, altura / 2, -16]}>
      <planeGeometry args={[140, altura]} />
      <meshBasicMaterial map={textura} toneMapped={false} fog={false} />
    </mesh>
  )
}

// ── A cena ────────────────────────────────────────────────────────────────

/**
 * Um destino de projeção: um nó de DOM e o ponto de mundo que ele segue.
 *
 * `w`/`h` são o tamanho medido do próprio nó, guardado porque o laço de quadro
 * precisa dele para APARAR a âncora dentro da tela (ver o comentário do aparo
 * lá embaixo) e medir layout a 60 Hz, para cada âncora, forçaria um reflow por
 * quadro. Medido preguiçosamente e invalidado só quando a janela muda de
 * tamanho — que é a única hora em que o texto pode reembrulhar.
 *
 * `clicavel` separa a ÂNCORA do RÓTULO, e a distinção é o defeito de rolagem em
 * miniatura: só a âncora pode voltar a `pointer-events: auto`. Um rótulo de
 * andar que recebesse ponteiro seria mais uma caixa engolindo a roda do mouse
 * no meio da tela — o mesmo defeito que travou a descida inteira, só que menor
 * e mais difícil de achar.
 */
type Alvo = {
  mundo: THREE.Vector3
  el: HTMLElement
  w: number
  h: number
  clicavel: boolean
}

function Cena({
  vsync,
  vivos,
  brilhos,
  alvos,
  aoTrocarDeAndar,
}: {
  vsync: number
  vivos: number[]
  brilhos: RefObject<Map<string, boolean>>
  alvos: RefObject<Map<string, Alvo>>
  aoTrocarDeAndar: (andar: number) => void
}) {
  const progresso = useProgressoDeRolagem()
  const { tier, capacidades, medir } = useQualidade(vsync)
  const semInercia = useSemInercia()
  const sol = useRef<THREE.DirectionalLight>(null)
  const planos = useRef<(THREE.Group | null)[]>([])
  const primeiroQuadro = useRef(true)
  const ultimoAndar = useRef(-1)

  const pilar = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: tom(corDoRotulo(0), 0.3),
        roughness: 0.88,
        metalness: 0.05,
      }),
    [],
  )
  useEffect(() => () => pilar.dispose(), [pilar])

  // A terra sob o térreo: a cor da recepção puxada bem para baixo. Escura
  // porque é massa, não superfície iluminada — mas ainda dentro do arco de
  // temperatura, e não um cinza novo.
  const terra = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: tom(corDoAndar(ANDARES.length - 1), 0.55),
        roughness: 1,
        metalness: 0,
      }),
    [],
  )
  useEffect(() => () => terra.dispose(), [terra])

  // Trocar `shadow.mapSize` sozinho não faz nada: o alvo de render já existe no
  // tamanho antigo e o three só o recria quando encontra `map` nulo. Descartar
  // e zerar é o que devolve a memória e refaz o mapa — sem isto o degrau de
  // sombra da escada não cortaria custo nenhum e ainda pareceria ter
  // funcionado. Cicatriz herdada de `Portico.tsx`.
  useEffect(() => {
    const luz = sol.current
    if (!luz) return
    luz.shadow.mapSize.set(tier.shadow, tier.shadow)
    luz.shadow.map?.dispose()
    luz.shadow.map = null
  }, [tier.shadow])

  const arAlvo = useMemo(() => new THREE.Color(), [])
  // Largura de janela da última medição das âncoras — ver o aparo no laço.
  const medidasVelhas = useRef(0)
  const ndc = useMemo(() => new THREE.Vector3(), [])

  useFrame(({ camera, scene, size }, delta) => {
    // O primeiro quadro fecha a janela que `PredioSlot` abriu com
    // `performance.mark('predio:montagemPedida')`. Sem isto a marca de lá não
    // mede nada; com isto, o custo de subir a cena é lido no aparelho do
    // visitante e não no meu.
    if (primeiroQuadro.current) {
      primeiroQuadro.current = false
      try {
        performance.measure('predio:ateOPrimeiroQuadro', 'predio:montagemPedida')
      } catch {
        // Sem a marca de partida (API parcial), a medição some e a cena segue.
      }
    }

    // Antes de qualquer coisa: quem mede os quadros não pode perder justamente
    // os quadros ruins.
    medir(delta)

    const quadro = quadroDe(progresso.current)

    // TODO O MOVIMENTO ACONTECE AQUI. Em nenhum `useEffect`.
    camera.position.set(
      0,
      semInercia ? quadro.pose.y : amortecer(camera.position.y, quadro.pose.y, delta),
      quadro.pose.z,
    )
    camera.lookAt(0, camera.position.y, 0)
    // A matriz precisa estar fresca ANTES da projeção das âncoras lá embaixo:
    // o r3f só atualiza o grafo depois deste callback, então sem esta linha as
    // âncoras seguiriam a câmera com um quadro de atraso — visível justamente
    // durante a rolagem rápida, que é quando elas mais se mexem.
    camera.updateMatrixWorld()

    /**
     * O DESLOCAMENTO DE CADA PLANO — e o sinal aqui é a decisão mais delicada
     * do arquivo, então ela fica escrita.
     *
     * `quadro.planos[i]` é `y · parallax`: o quanto o plano ACOMPANHA a
     * descida. Aplicado direto como posição do grupo, o plano da frente
     * (parallax 1) acompanharia a câmera INTEIRA — ficaria colado na tela, e o
     * prédio nunca desceria. O que o grupo precisa é do que SOBRA:
     * `pose.y - planos[i]`, isto é, `y·(1 − parallax)`.
     *
     * Com isso a frente fica em zero (o prédio parado no mundo, a câmera
     * descendo por ele — que é o que `predio-arquitetura.ts` chama de "plano de
     * referência" e o que faz a âncora de DOM pousar no lugar certo), e o fundo
     * desce só 65 % do caminho, aparecendo na tela como o terço de velocidade
     * que o olho lê como distância. A aritmética do parallax continua inteira
     * em `predio-descida.ts`; o que muda aqui é de que lado da subtração ela
     * entra.
     */
    planos.current.forEach((grupo, i) => {
      if (!grupo) return
      const alvo = quadro.pose.y - (quadro.planos[i] ?? 0)
      grupo.position.y = semInercia ? alvo : amortecer(grupo.position.y, alvo, delta)
    })

    // O sol acompanha a altura da câmera. Sem isso, a câmera de sombra teria
    // que cobrir os 25 m do prédio inteiro e 2048 px viram mingau; seguindo, os
    // mesmos 2048 px cobrem dois andares.
    const luz = sol.current
    if (luz) {
      const y = camera.position.y
      luz.position.set(
        DIRECAO_DO_SOL.x * DISTANCIA_DO_SOL,
        y + DIRECAO_DO_SOL.y * DISTANCIA_DO_SOL,
        DIRECAO_DO_SOL.z * DISTANCIA_DO_SOL,
      )
      luz.target.position.set(0, y, 0)
      luz.target.updateMatrixWorld()
    }

    // O gradiente de temperatura, de longe: o fundo (e a névoa junto) caminham
    // para a cor do ar do andar ativo. Quente na cobertura, frio no miolo,
    // quente de novo na recepção — o mesmo arco que a ordem dos andares já
    // conta. É também a linha que mantém o contrato de opacidade vivo em
    // movimento: a cor de limpeza nunca deixa de existir, só muda de valor.
    arAlvo.set(corDoAndar(quadro.andar))
    const passo = 1 - Math.exp(-2.5 * delta)
    if (scene.background instanceof THREE.Color) {
      scene.background.lerp(arAlvo, passo)
      if (scene.fog instanceof THREE.Fog) scene.fog.color.copy(scene.background)
    }

    // A janela de três andares é estrutura de árvore, não número: ela só pode
    // mudar por `setState`. Sete vezes na descida inteira — não uma por pixel,
    // que é a regra que este arquivo existe para respeitar.
    if (quadro.andar !== ultimoAndar.current) {
      ultimoAndar.current = quadro.andar
      aoTrocarDeAndar(quadro.andar)
    }

    // As âncoras de DOM, projetadas. Escrita direta no `style`, dentro do laço
    // de quadro: uma âncora que precisasse de `setState` para acompanhar o
    // objeto reintroduziria o render por pixel pela porta dos fundos.
    //
    // O APARO nas bordas foi acrescentado depois de ver a página num viewport
    // de celular em retrato, e ele conserta um defeito de verdade: o vão útil
    // tem 12 m de largura, mas em retrato a lente só mostra pouco mais de 6 m,
    // então metade dos objetos cai FORA do quadro e as âncoras deles saíam
    // cortadas pela metade nas duas bordas — texto ilegível e alvo de toque
    // mutilado. Aparada, a âncora encosta na borda e continua inteira e
    // tocável; ela perde o alinhamento horizontal exato com o objeto (que nem
    // está na tela), e mantém o vertical, que é o que a amarra ao ANDAR certo.
    // A troca é deliberada: a camada acessível é o fallback, então o que esta
    // camada precisa garantir é legibilidade e alvo de 44 px, não precisão de
    // pixel sobre um móvel invisível.
    if (medidasVelhas.current !== size.width) {
      medidasVelhas.current = size.width
      for (const alvo of alvos.current.values()) alvo.w = 0
    }
    for (const alvo of alvos.current.values()) {
      const el = alvo.el
      ndc.copy(alvo.mundo).project(camera)
      if (ndc.z > 1 || Math.abs(ndc.y) > 1.25) {
        el.style.opacity = '0'
        el.style.pointerEvents = 'none'
        continue
      }
      if (!alvo.w) {
        alvo.w = el.offsetWidth
        alvo.h = el.offsetHeight
      }
      const folgaX = alvo.w / 2 + 8
      const folgaY = alvo.h / 2 + 8
      const px = Math.min(
        size.width - folgaX,
        Math.max(folgaX, (ndc.x * 0.5 + 0.5) * size.width),
      )
      const py = Math.min(
        size.height - folgaY,
        Math.max(folgaY, (-ndc.y * 0.5 + 0.5) * size.height),
      )
      el.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) translate(-50%, -50%)`
      // Some só na borda de cima e de baixo, e não com a distância do centro: o
      // objeto do andar vizinho continua clicável enquanto estiver legível na
      // tela, que é o ponto inteiro de manter três andares vivos.
      const visivel = Math.min(1, Math.max(0, (1.15 - Math.abs(ndc.y)) / 0.22))
      el.style.opacity = visivel.toFixed(3)
      // SO a ancora volta a receber ponteiro. O rotulo nunca — ver `clicavel`
      // no tipo `Alvo`: uma caixa de texto no meio da tela com
      // `pointer-events: auto` engoliria a roda do mouse ali, que e o defeito
      // que esta correcao inteira existe para tirar.
      el.style.pointerEvents = alvo.clicavel && visivel > 0.25 ? 'auto' : 'none'
    }
  })

  return (
    <>
      <Enquadramento />

      {/* Fundo EXPLÍCITO — ver "Contrato de opacidade" no topo do arquivo. Não
          é decoração: é o que impede sete andares de texto do fallback de
          aparecerem através do prédio. */}
      <color attach="background" args={[corDoAndar(0)]} />
      {/* A névoa recua os planos de trás na MESMA tinta do fundo: o que se
          afasta dissolve em vez de desbotar. */}
      <fog attach="fog" args={[corDoAndar(0), 13, 52]} />

      {/*
        UM sol, e só ele projeta.
        Rasante por decreto de `SOL` (8,5°): a sombra de um objeto de 1 m mede
        6,7 m e varre a laje na horizontal. É essa mancha que faz os três planos
        lerem como três profundidades — ao meio-dia não haveria sombra lateral e
        eles colapsariam num só, que é o argumento da spec para a hora dourada.
        A cor sai de `corDoRotulo` (âmbar claro), a mesma tinta que
        `predio-luz.ts` já mediu: nenhum hex novo entra na cena.
      */}
      <directionalLight
        ref={sol}
        castShadow
        color={corDoRotulo(0)}
        intensity={5.4}
        shadow-mapSize={[tier.shadow, tier.shadow]}
        shadow-camera-left={-17}
        shadow-camera-right={17}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
        shadow-camera-near={6}
        shadow-camera-far={64}
        shadow-bias={-0.0008}
        shadow-normalBias={0.04}
      />
      {/*
        O preenchimento. NÃO projeta — é o que levanta a face virada para a
        câmera, que com o sol 14° atrás fica em contraluz. Céu na cor da
        cobertura, chão na cor do andar mais frio: o arco de temperatura entra
        até no ambiente.
      */}
      <hemisphereLight args={[tom(corDoAndar(0), 7), tom(corDoAndar(4), 4.5), 1.9]} />

      {/* Um grupo por plano de `PLANOS`, deslocado no laço de quadro acima. */}
      {PLANOS.map((plano, i) => (
        <group
          key={plano.nome}
          position-z={plano.z}
          ref={(node) => {
            planos.current[i] = node
          }}
        >
          {plano.nome === 'frente' ? (
            <>
              <Pilares material={pilar} />
              <Chao material={terra} />
              {vivos.map((indice) => (
                <AndarVivo
                  key={ANDARES[indice]!.chave}
                  indice={indice}
                  comTeto={indice === vivos[0]}
                  perspectiva={temPerspectiva(indice, capacidades)}
                  brilhos={brilhos}
                />
              ))}
            </>
          ) : plano.nome === 'meio' ? (
            <PlanoDeFundo
              parallax={plano.parallax}
              largura={MEIA_LARGURA}
              cor={tom(corDoAndar(3), 2.6)}
              espessura={0.34}
            />
          ) : (
            <>
              <Ceu />
              <PlanoDeFundo
                parallax={plano.parallax}
                largura={MEIA_LARGURA * 1.3}
                cor={tom(corDoAndar(4), 1.9)}
                espessura={0.5}
              />
            </>
          )}
        </group>
      ))}
    </>
  )
}

// ── A sobreposição de DOM ─────────────────────────────────────────────────

/**
 * Os objetos clicáveis e o rótulo de cada andar vivo, em DOM de verdade sobre o
 * canvas.
 *
 * Aqui não há raycast: o `<a>` é um `<a>`, com `href` real, alvo de toque de
 * 44 px, clique-do-meio abrindo em nova aba e menu de contexto funcionando. O
 * raycast lá dentro só acende o brilho — e passar o mouse na âncora acende o
 * mesmo brilho, pelo `Map` compartilhado, para que os dois caminhos contem a
 * mesma história.
 *
 * Cada elemento REGISTRA seu nó no mapa de alvos por callback de ref; quem os
 * posiciona é o `useFrame` da cena, escrevendo `transform` direto. Nada aqui
 * re-renderiza durante a descida — só quando a janela de andares muda, e o
 * próprio callback de ref limpa os alvos do andar que saiu.
 *
 * A cor de fundo é `corDoAndar(i)` e a do texto é `corDoRotulo(i)` — o par
 * exato que `tests/unit/predio-luz.test.ts` mede contra AA. Pôr o rótulo direto
 * sobre a cena renderizada seria contraste não medido sobre um pixel que muda a
 * cada quadro, e o "celular sob sol forte" da spec é justamente onde isso
 * falharia.
 */
function Sobreposicao({
  dict,
  locale,
  vivos,
  brilhos,
  alvos,
}: {
  dict: Dictionary
  locale: Locale
  vivos: number[]
  brilhos: RefObject<Map<string, boolean>>
  alvos: RefObject<Map<string, Alvo>>
}) {
  const registrar =
    (chave: string, mundo: THREE.Vector3, clicavel: boolean) =>
    (el: HTMLElement | null): void => {
      if (el) alvos.current.set(chave, { mundo, el, w: 0, h: 0, clicavel })
      else alvos.current.delete(chave)
    }

  // A camada que recebe os eventos que caem EM CIMA de uma âncora — os únicos
  // que chegam aqui, já que todo o resto é `pointer-events: none`.
  const camada = useRef<HTMLDivElement>(null)
  useRepasseDeRolagem(camada)

  // Nasce invisível e inerte: até o primeiro quadro projetar o elemento, ele
  // estaria em (0, 0) — o canto superior esquerdo —, e um alvo de toque de
  // 44 px parado ali é um clique que ninguém pediu.
  const repouso = { opacity: 0, pointerEvents: 'none' as const }

  return (
    <div ref={camada} className="pointer-events-none absolute inset-0 overflow-hidden">
      {vivos.map((indice) => {
        const andar = ANDARES[indice]!
        const texto = dict.predio[andar.chave]
        const piso = topoDoAndar(indice) - PE_DIREITO
        const ar = corDoAndar(indice)
        const tinta = corDoRotulo(indice)
        return (
          <div key={andar.chave}>
            <div
              ref={registrar(
                `rotulo:${andar.chave}`,
                new THREE.Vector3(xDoObjeto(0.04), piso + PE_DIREITO * 0.8, Z_OBJETO),
                false,
              )}
              className="absolute left-0 top-0 max-w-[18rem] rounded px-3 py-2 will-change-transform"
              style={{ backgroundColor: ar, color: tinta, ...repouso }}
            >
              {andar.numero !== null && (
                <span className="block font-mono text-[0.68rem] opacity-70">
                  {String(andar.numero).padStart(2, '0')}
                </span>
              )}
              <span className="block text-base font-semibold leading-tight">{texto.titulo}</span>
            </div>

            {andar.objetos.map((objeto) => (
              <AncoraDeObjeto
                key={objeto.id}
                ref={registrar(
                  `objeto:${objeto.id}`,
                  new THREE.Vector3(
                    xDoObjeto(objeto.x),
                    piso + alturaDoObjeto(objeto.id) + 0.45,
                    Z_OBJETO,
                  ),
                  true,
                )}
                href={enderecoDoObjeto(locale, objeto.destino)}
                className="absolute left-0 top-0 flex min-h-11 min-w-11 max-w-[15rem] items-center justify-center rounded px-3 text-center text-xs font-medium underline underline-offset-4 will-change-transform"
                style={{ backgroundColor: ar, color: tinta, ...repouso }}
                onPointerEnter={() => brilhos.current.set(objeto.id, true)}
                onPointerLeave={() => brilhos.current.set(objeto.id, false)}
              >
                {texto.objetos[objeto.id]}
              </AncoraDeObjeto>
            ))}
          </div>
        )
      })}
    </div>
  )
}

// ── O componente ──────────────────────────────────────────────────────────

export function Predio({ dict, locale, vsync }: { dict: Dictionary; locale: Locale; vsync: number }) {
  // FORA do `<Canvas>`, de proposito. As teclas nao dependem de three.js
  // nenhum, e um efeito registrado dentro da cena so roda quando o
  // reconciliador do r3f confirma — depois de o `<canvas>` ja existir no DOM.
  // Medido: nessa janela o visitante ve o predio e Page Down nao faz nada.
  // Aqui o atalho esta vivo no mesmo instante em que o componente monta.
  useTeclasDeDescida()
  const [andar, setAndar] = useState(0)
  const vivos = useMemo(() => janelaDeAndares(andar), [andar])
  const brilhos = useRef(new Map<string, boolean>())
  const alvos = useRef(new Map<string, Alvo>())

  return (
    // SEM `z-index` próprio: a pilha entre a CAMADA DA CENA e a CAMADA DO
    // FALLBACK é resolvida inteira em `PredioSlot.tsx` (o invólucro que envolve
    // este componente leva `z-0`). Aqui só se decide a ordem DENTRO da cena, e
    // ela é a ordem do DOM: canvas primeiro, âncoras por cima.
    //
    // `pointer-events-none` — E ESTA CLASSE É O CONSERTO DE UM DEFEITO QUE O
    // DONO ENCONTROU ABRINDO A PÁGINA: "não consigo rolar para baixo e para
    // cima, fica travado na cobertura".
    //
    // A causa, medida: este `<div>` é `fixed inset-0`, cobre a tela inteira e,
    // com `pointer-events: auto` (o padrão), era ele que `elementFromPoint` no
    // centro da tela devolvia. Todo evento de roda e de toque morria aqui. E
    // como quem rola de verdade é um `<div>` do fallback que é IRMÃO desta
    // camada — não ancestral —, o encadeamento de rolagem do navegador subia
    // por `body`/`html`, que não rolam nesta rota, e nunca chegava nele. A cena
    // não estava "por cima" do scroller; estava no caminho dele.
    //
    // `pointer-events` é herdado, então isto apaga o ponteiro do canvas e de
    // tudo que está dentro de uma vez; as âncoras de objeto voltam a ligá-lo,
    // uma a uma, no laço de quadro. É exatamente a distinção que o comentário
    // de `PredioSlot.tsx` já usava para escolher `aria-hidden` em vez de
    // `inert`: `inert` desliga o ponteiro de forma que um filho NÃO consegue
    // reverter; `pointer-events: none` deixa.
    //
    // O PREÇO, dito com todas as letras: sem ponteiro no canvas, o raycast do
    // r3f não recebe mais nada e o brilho de hover pela MALHA acabou. Ele
    // sobrevive pela âncora (ver `ObjetoNaCena`). Rolar vale mais que brilhar.
    <div data-testid="predio-canvas" className="pointer-events-none fixed inset-0">
      <Canvas
        // `percentage` = PCFShadowMap. O padrão (`true`) escolhe PCFSoft, que o
        // three 0.185 depreciou e resolve para PCF de qualquer forma — só que
        // gritando no console de quem abre o site.
        shadows="percentage"
        // O teto abre até 2 e quem manda nele é `useQualidade`, que começa no
        // degrau seguro (1 ou 3, nunca 0) e sobe só sob medição.
        dpr={[1, 2]}
        gl={OPACO}
        // `pointer-events: none` PRECISA vir por aqui, e não só do contêiner:
        // o `<Canvas>` do r3f escreve `pointerEvents: 'auto'` INLINE no
        // `<div>` dele (ver `CanvasImpl` em react-three-fiber.esm.js — "when
        // the event source is not this div, we need to set pointer-events to
        // none"), e estilo inline vence a herança do pai. Medido: com só a
        // classe no contêiner, `elementFromPoint` no centro da tela ainda
        // devolvia o `<canvas>`, e a roda do mouse continuava morrendo nele.
        // O `...style` do r3f é espalhado DEPOIS do padrão dele, então esta
        // linha é o ponto de extensão previsto pela própria biblioteca. Os dois
        // nós abaixo (o `<div>` interno e o `<canvas>`) não declaram nada e
        // herdam daqui.
        style={{ pointerEvents: 'none' }}
        camera={{ fov: 50, near: 0.5, far: 96, position: [0, quadroDe(0).pose.y, RECUO] }}
        // Hora dourada com ACES fecha a sombra; um pouco de exposição devolve a
        // leitura do material sem clarear tinta nenhuma.
        onCreated={({ gl }) => {
          gl.toneMappingExposure = 1.18
        }}
      >
        <Cena
          vsync={vsync}
          vivos={vivos}
          brilhos={brilhos}
          alvos={alvos}
          aoTrocarDeAndar={setAndar}
        />
      </Canvas>
      <Sobreposicao dict={dict} locale={locale} vivos={vivos} brilhos={brilhos} alvos={alvos} />
    </div>
  )
}

/**
 * Âncora de objeto clicável sobre o canvas — a cena usa ESTE componente para
 * cada objeto (rack, backup, prancheta...), em vez de um `<a>` cru.
 *
 * `tabIndex={-1}` NÃO É OPCIONAL, e por isso vem embutido aqui em vez de
 * documentado só em prosa: o invólucro que `PredioSlot.tsx` põe ao redor de
 * `<Predio>` leva `aria-hidden="true"` enquanto a cena está montada (ver a
 * questão arquitetural documentada lá) — e a regra WAI-ARIA é que NENHUM
 * elemento focável pode viver dentro de um `aria-hidden`. `aria-hidden` sozinho
 * tira a árvore de acessibilidade, mas NÃO tira o foco de teclado; só
 * `tabIndex={-1}` faz isso (sem desligar o clique do mouse, que é o que essas
 * âncoras existem para receber — diferente de `inert`, que desligaria os dois).
 *
 * A invariante morava só num comentário em `PredioSlot.tsx` (arquivo que a cena
 * CONSOME, não edita) e nada quebrava se ela fosse ignorada. Vive aqui agora —
 * no arquivo da cena — como um componente pronto, não só um lembrete: usar
 * `<a>` cru em vez deste componente é a única forma de violar a invariante, e
 * passa a ser a exceção visível, não a norma silenciosa.
 * `tests/unit/predio-scene.test.tsx` prova que o próprio componente não pode
 * ser usado para produzir um `tabIndex` diferente de −1, E varre o TEXTO deste
 * arquivo atrás de `<a>` cru e de `next/link` — porque nada no compilador
 * impede o próximo a mexer aqui de escrever um, e o defeito seria invisível:
 * um usuário de teclado tabulando duas vezes por cada destino do prédio.
 */
export function AncoraDeObjeto({
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode
  /** React 19 entrega `ref` como prop normal; a cena a usa para registrar o nó
   *  no mapa de alvos que o `useFrame` projeta. */
  ref?: Ref<HTMLAnchorElement>
}) {
  // `children` desestruturado e escrito explícito no JSX (em vez de deixar
  // dentro do `...props` espalhado) só para o `jsx-a11y/anchor-has-content`
  // conseguir ver, estaticamente, que a âncora nunca fica sem conteúdo
  // acessível — o lint não sabe olhar dentro de um spread.
  return (
    <a {...props} tabIndex={-1}>
      {children}
    </a>
  )
}
