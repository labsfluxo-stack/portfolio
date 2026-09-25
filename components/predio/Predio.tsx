'use client'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { AnchorHTMLAttributes, ReactNode, Ref, RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import type { Dictionary, Locale } from '@/content/types'
import { ANDARES, type ChaveAndar, type ObjetoDoAndar } from './predio-programa'
import {
  ALTURA_ANDAR,
  LAJE,
  PE_DIREITO,
  PLANOS,
  SOL,
  alturaTotal,
  topoDoAndar,
} from './predio-arquitetura'
import { amortecer, quadroDe } from './predio-descida'
import {
  CENARIO,
  CENARIO_DISTANTE,
  CEU,
  CIDADE,
  CIDADE_DISTANTE,
  COR_DO_SOL,
  INTENSIDADE_DO_SOL,
  PREENCHIMENTO,
  corDoAndar,
  corDoRotulo,
} from './predio-luz'
import {
  aplicaVeredito,
  capacidadesDo,
  temPerspectiva,
  type Capacidades,
  type Escada,
} from './predio-qualidade'
// A rolagem mora FORA deste arquivo desde a revisão final, e o motivo é de
// arquitetura: o atalho de teclado precisa valer também SEM a cena (movimento
// reduzido, aparelho sem WebGL, navegador embutido do Instagram), e quem está
// sempre montado nesses casos é `PredioSlot` — que não pode importar deste
// arquivo sem arrastar o three.js inteiro para o HTML inicial.
import { progressoDoCurso, useRepasseDeRolagem } from './predio-rolagem'
import { TIERS, type Tier, createMeter, judge, startingStep } from '../three/portico-quality'
import { Datacenter } from './predio-datacenter'
import { criaAmbiente, DERIVA_DAS_NUVENS, texturaDeCeu, texturaDeNuvens } from './predio-ceu'
import { shaderDeGradacao } from './predio-gradacao'
import {
  CAMERA_PARADA,
  DEGRAU_FIXO,
  LIGADO,
  PROFUNDIDADE_FORCADA,
  leitura,
  registra,
  veredito,
} from './predio-medicao'
import { shaderDeProfundidade } from './predio-profundidade'
import { Cobertura } from './predio-cobertura'
import { Cidade } from './predio-cidade'
import { comRepeticao, concretoCompartilhado } from './predio-materiais'

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
// REBAIXADOS QUANDO A PALETA ABRIU, e este é o acoplamento que ninguém vê até
// quebrar: os fatores antigos (5,0 / 3,4 / 4,2 / 4,6 / 2,2) não eram escolha de
// material, eram COMPENSAÇÃO. A paleta de `predio-luz.ts` era quase preta —
// nenhum canal acima de 0x44 — e sem multiplicar por cinco a laje sumia.
//
// Quando a paleta clareou, a compensação virou estouro: `#d9a066` × 5 satura em
// branco, e a cobertura virou uma chapa de creme sem forma. As RELAÇÕES entre as
// cinco superfícies estão preservadas — laje continua a mais clara, objeto a
// mais escura, na mesma proporção. Só o nível desceu, porque agora quem carrega
// o nível é a cor, não o multiplicador.
const ALBEDO = { laje: 1.15, teto: 0.78, parede: 0.97, viga: 1.06, objeto: 0.51 } as const

/**
 * AS SUPERFÍCIES POR ANDAR — e aqui a tabela nasce com dois exemplos, que era a
 * condição que eu tinha escrito para generalizar.
 *
 * O arco de temperatura de `predio-luz.ts` pinta o AR de cada andar, e é uma boa
 * regra: a cor conta o setor antes de qualquer legenda. O erro era deduzir a cor
 * do CONCRETO da cor da luz — multiplicar o ar pelo albedo e chamar o resultado
 * de laje.
 *
 * Os dois andares que já têm conteúdo mostraram o mesmo defeito, por caminhos
 * opostos:
 *
 * - ANDAR 07: o ar é `#6b5544`, marrom quente; vezes o albedo da laje virou piso
 *   de MADEIRA CLARA, e o render mostrou um datacenter montado dentro de um
 *   galpão de tábua corrida. Sala de máquina tem piso epóxi cinza, laje escura e
 *   parede escura — não é gosto, é o que absorve calor e não mancha.
 * - COBERTURA: o ar é `#d9a066`, o ponto mais claro do prédio; vezes o albedo, o
 *   parapeito e a borda da laje viraram uma faixa de tinta LARANJA de 30 m no pé
 *   do primeiro quadro do site. Concreto em hora dourada é bege quente, não
 *   laranja saturado — a luz é dourada, a superfície não.
 *
 * A paleta continua certa nos dois casos; ela descreve LUZ. O que faltava era
 * dizer de que material a superfície é feita, e isso nenhuma cor de ar consegue
 * adivinhar. Andar sem entrada aqui continua derivando do ar, que é o
 * comportamento certo para andar que ainda não tem conteúdo definido.
 */
const SUPERFICIES: Partial<Record<ChaveAndar, Record<string, string>>> = {
  cobertura: {
    laje: '#c7b9a2',
    teto: '#b9ab94',
    parede: '#bcae97',
    viga: '#d4c6ad',
    objeto: '#b3a794',
  },
  servidores: {
    laje: '#63666d',
    teto: '#15171a',
    parede: '#1b1e22',
    viga: '#2b2f34',
    objeto: '#2e333a',
  },
}

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
  degrau: number
} {
  const setDpr = useThree((state) => state.setDpr)
  // Degrau e piso são UM estado só. Separados — um `useState` e um `useRef` —
  // eles podem discordar por um render, e é justamente no render da troca que a
  // catraca precisa estar certa.
  const [escada, setEscada] = useState<Escada>(() => ({
    degrau: DEGRAU_FIXO ?? startingStep(),
    piso: 0,
  }))
  const degrau = escada.degrau
  const meter = useRef(createMeter())

  const tier = TIERS[Math.min(degrau, TIERS.length - 1)] ?? TIERS[0]!
  const capacidades = useMemo(() => capacidadesDo(degrau), [degrau])

  useEffect(() => {
    // O valor do degrau, direto — sem teto no `devicePixelRatio`. Desenhar
    // acima do que a tela exibe é supersampling, e é o que trata aresta,
    // textura e especular ao mesmo tempo. Mesma cicatriz do Pórtico.
    setDpr(tier.dpr)
  }, [tier.dpr, setDpr])

  /**
   * A CATRACA — a decisão inteira, com a aritmética que a justifica, mora em
   * `aplicaVeredito`. Aqui fica só a costura com `judge`.
   *
   * O PISO É PASSADO PARA `judge` PELOS PARÂMETROS QUE ELE JÁ TEM: ele só
   * devolve 'up' quando `step > 0`, então basta contar os degraus a partir do
   * piso em vez de zero. Sem isso `judge` continuaria pedindo promoções que
   * `aplicaVeredito` descarta em silêncio, e cada pedido descartado reiniciaria
   * o `SETTLE` dele — a escada pararia de medir para sempre, trocando uma
   * oscilação visível por uma cegueira invisível. Nenhuma linha muda na escada
   * do Pórtico, que é compartilhada.
   */
  const medir = (delta: number): void => {
    /**
     * COM O DEGRAU FIXADO PELA URL, a escada não mede e não se move.
     *
     * É o que torna o A/B possível: para saber o custo da oclusão é preciso o
     * mesmo hardware, a mesma janela e a mesma cena, com e sem ela. Deixar a
     * escada correr durante a medição faz as duas metades da comparação
     * acontecerem em degraus diferentes, e aí não se compara nada. Ver
     * `predio-medicao.ts`.
     */
    if (DEGRAU_FIXO !== null) return
    const veredito = judge(
      meter.current,
      delta,
      vsync,
      escada.degrau - escada.piso,
      TIERS.length - escada.piso,
    )
    if (veredito !== 'hold') setEscada((atual) => aplicaVeredito(atual, veredito))
  }

  return { tier, capacidades, medir, degrau: escada.degrau }
}

/**
 * A LEITURA NA TELA — só existe com `?medir=1`.
 *
 * Ela lê de um objeto mutável de módulo em vez de estado de React, e isso é
 * deliberado: o laço de quadro escreve nele sessenta vezes por segundo, e
 * transformar cada escrita num `setState` daria sessenta renderizações de React
 * por segundo só para atualizar um painel — o que mudaria justamente o número
 * que se está tentando medir. O painel se redesenha duas vezes por segundo, por
 * um intervalo, e é o bastante para ler.
 *
 * `pointerEvents: none` porque esta cena já perdeu a rolagem uma vez por causa
 * de uma caixa de DOM com ponteiro ligado por cima do canvas.
 */
function LeituraDeDesempenho() {
  const [, redesenha] = useState(0)
  useEffect(() => {
    if (!LIGADO) return
    const t = window.setInterval(() => redesenha((n) => n + 1), 500)
    return () => window.clearInterval(t)
  }, [])
  if (!LIGADO) return null
  const l = leitura
  return (
    <div
      data-testid="predio-medicao"
      style={{
        position: 'fixed',
        left: 12,
        top: 12,
        zIndex: 60,
        pointerEvents: 'none',
        font: '12px/1.5 ui-monospace, monospace',
        color: '#e8e2d6',
        background: 'rgba(12,10,8,0.82)',
        padding: '10px 12px',
        borderRadius: 6,
        whiteSpace: 'pre',
      }}
    >
      {[
        `degrau ${l.degrau}${DEGRAU_FIXO !== null ? ' (fixo)' : ''}   dpr ${l.dpr.toFixed(2)}`,
        `${l.capacidades}`,
        '',
        `mediana  ${l.mediana.toFixed(1)} ms   (${l.razao.toFixed(2)} x vsync)`,
        `p95      ${l.p95.toFixed(1)} ms   (${l.razaoP95.toFixed(2)} x vsync)`,
        '',
        `chamadas ${l.chamadas}   triangulos ${(l.triangulos / 1000).toFixed(0)}k`,
        '',
        veredito(l.razaoP95),
      ].join('\n')}
    </div>
  )
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
/**
 * ═══ `alvo` ERA 8,6 E NÃO MANDAVA EM NADA ═══
 *
 * O QUE ELE SIGNIFICA: a meia-largura, em metros, que se quer enquadrar no plano
 * da frente do prédio. É o parâmetro que traduz "sem margem lateral" em lente.
 *
 * COMO ELE MORREU. 8,6 foi calibrado quando `RECUO` valia 11,5 m. Só que
 * `RECUO`, aqui, é `quadroDe(0).pose.z` — e esse número deixou de ser 11,5 no
 * dia em que a descida ganhou AVANÇO de câmera: a câmera passa a CHEGAR quando
 * assenta num andar, e em repouso na cobertura ela está a 5,9 m, não a 11,5.
 * Ninguém veio revisar `alvo`.
 *
 * A CONSEQUÊNCIA, medida: pedir 8,6 m de meia-largura a 5,9 m de distância exige
 * uma lente de 78,7°, e o teto é 62. Ou seja, a conta estourava o limite em
 * QUALQUER proporção de tela até ultrawide, e o que a cena usava era o teto — um
 * número escolhido para proteger o retrato de celular, virado padrão de todo
 * mundo. `alvo` podia valer 8,6 ou 40 que o resultado seria o mesmo.
 *
 * É a sétima ocorrência da mesma armadilha nesta cena: constante calibrada
 * contra um valor que mudou depois, em outro arquivo, sem que nada quebrasse.
 *
 * ═══ 6,30 E NÃO OUTRO NÚMERO, E A ESCOLHA É DELIBERADA ═══
 *
 * 6,30 é EXATAMENTE a meia-largura que o teto de 62° já entrega em 16:9:
 *   tan(31°) × 5,9 × (16/9) = 0,6009 × 10,489 = 6,30.
 *
 * Ou seja, em tela larga comum o enquadramento não muda um pixel. Isso é o
 * ponto: a correção é de SIGNIFICADO, não de composição — o enquadramento atual
 * é o que o dono aprovou olhando, e reenquadrar a home seria decisão dele, não
 * consequência de eu ter achado um número morto.
 *
 * O QUE MUDA é o comportamento fora de 16:9. Com a lente presa no teto, a
 * cobertura horizontal CRESCIA com a largura da janela: tela ultrawide via mais
 * terraço, tela quadrada via menos. Com `alvo` valendo de novo, a vertical se
 * ajusta para manter os 6,30 m constantes — que é a definição de "sem margem
 * lateral" e a razão de este parâmetro existir. Em retrato de celular a conta
 * continua estourando o teto, e ali o prédio sangra pelas laterais de propósito.
 */
const ABERTURA = { alvo: 6.3, min: 40, max: 62 } as const

/**
 * A lente vertical, em graus, para uma proporção de tela.
 *
 * Exportada e pura porque é ARITMÉTICA, e aritmética sobre constantes é a única
 * parte disto que uma suíte consegue guardar. `alvo` já morreu uma vez em
 * silêncio — calibrado contra um `RECUO` que mudou em outro arquivo — e o que
 * mata esse tipo de defeito é uma afirmação escrita sobre o resultado, não um
 * comentário. Ver `tests/unit/predio-lente.test.ts`.
 */
export function lenteVertical(aspecto: number): number {
  const vertical = (2 * Math.atan(ABERTURA.alvo / RECUO / Math.max(0.01, aspecto)) * 180) / Math.PI
  return Math.min(ABERTURA.max, Math.max(ABERTURA.min, vertical))
}

/** Quantos metros de meia-largura a lente enquadra no plano da frente. */
export function meiaLarguraEnquadrada(aspecto: number): number {
  const meiaVertical = (lenteVertical(aspecto) / 2) * (Math.PI / 180)
  return Math.tan(meiaVertical) * aspecto * RECUO
}

function Enquadramento() {
  const camera = useThree((state) => state.camera)
  const largura = useThree((state) => state.size.width)
  const altura = useThree((state) => state.size.height)

  useLayoutEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return
    camera.fov = lenteVertical(largura / Math.max(1, altura))
    camera.updateProjectionMatrix()
  }, [camera, largura, altura])

  return null
}

// ── Peças do prédio ───────────────────────────────────────────────────────


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
  const ehCobertura = indice === 0
  /**
   * ═══ A COBERTURA É SEMPRE FUNDA, E ISSO NÃO É UM PRIVILÉGIO ═══
   *
   * O DEFEITO: "às vezes fica mais próximo, às vezes mais distante" — com dois
   * prints, um da cobertura em perspectiva e outro em paralaxe. Os dois são
   * enquadramentos completamente diferentes, e a catraca da escada de qualidade
   * só impede que eles alternem DENTRO de uma sessão; entre um carregamento e
   * outro, a aposta é refeita e o visitante vê uma composição ou a outra.
   *
   * E AQUI ESTÁ O QUE EU DEVERIA TER MEDIDO ANTES DE ESCREVER A CATRACA: para a
   * cobertura, `perspectiva` não economiza praticamente nada. Olhe o corpo deste
   * componente — `<Cobertura>` é montada com os MESMOS argumentos e produz as
   * MESMAS 89 chamadas de desenho nos dois casos. A única diferença é `prof`, que
   * muda onde as coisas ficam, não quantas são. O que `perspectiva` foi criada
   * para poupar é o conteúdo de uma SALA que só existe quando ela está ligada; a
   * cobertura constrói o terraço inteiro de qualquer jeito.
   *
   * Ou seja: estávamos pagando a variação de enquadramento do primeiro quadro do
   * site em troca de uma economia que não existe. `prof` alimenta `zCentro`,
   * `piscinaZ`, `zDaParedeDoAndar` e o recuo de tudo que encosta no fundo — com
   * 7 m o terraço inteiro se achata, a piscina perde metade da profundidade e o
   * deck vazio toma a frente do quadro.
   *
   * A escada continua mandando no que ela sabe medir: resolução, sombra e bloom.
   * Ela deixa de mandar na COMPOSIÇÃO.
   *
   * (O térreo, que é o outro andar com perspectiva, segue como estava: ali o
   * conteúdo da sala é de fato condicional, e a economia é real.)
   */
  const prof = ehCobertura || perspectiva ? PROF_PERSPECTIVA : PROF_PARALLAX
  const zCentro = BORDA - prof / 2
  const zParede = BORDA - prof
  const piso = topo - PE_DIREITO
  const ar = corDoAndar(indice)
  const cobertura = ehCobertura
  // O andar 07 (indice 1) deixa de ser mobilia generica e passa a ser um
  // datacenter de verdade: fileiras frente com frente, 42U no grid de norma,
  // equipamento de alturas mistas e LEDs piscando. Entra INSTANCIADO — em
  // componentes nao carregava, porque o custo e a chamada de desenho e nao o
  // triangulo. Os outros seis andares seguem como estavam ate terem o seu.
  const servidores = ANDARES[indice]!.chave === 'servidores'
  // Superficie propria do andar, quando ele tem uma. Sem entrada, deriva do ar.
  const sup = SUPERFICIES[andar.chave]
  const face = (parte: keyof typeof ALBEDO) => sup?.[parte] ?? tom(ar, ALBEDO[parte])
  // Concreto aparente NA COBERTURA. E a maior area chapada do primeiro quadro:
  // parapeito, borda de laje e parede do fundo somam mais pixel que toda a
  // mobilia junta, e sem poro nem mosqueado leem como cartolina. A repeticao
  // muda por peca porque as pecas tem escalas muito diferentes.
  const pele = cobertura ? concretoCompartilhado() : null
  const peleLaje = useMemo(() => (pele ? comRepeticao(pele, 15, 0.18) : null), [pele])
  const peleParede = useMemo(() => (pele ? comRepeticao(pele, 15, 1.6) : null), [pele])
  const peleViga = useMemo(() => (pele ? comRepeticao(pele, 15, 0.17) : null), [pele])

  return (
    <group>
      {servidores && (
        <Datacenter piso={piso} zCentro={zCentro} prof={prof} meiaLargura={MEIA_LARGURA} />
      )}
      {/* A cobertura é o primeiro quadro do site — e estava vazia. Espelho
          d'água devolvendo o céu, guarda-corpo de vidro, espreguiçadeiras e
          vegetação: o mínimo que diz "os negócios vão bem e tranquilos" sem
          escrever isso, que é o que a spec pede deste andar. */}
      {cobertura && (
        <Cobertura piso={piso} zCentro={zCentro} prof={prof} meiaLargura={MEIA_LARGURA} />
      )}
      {/* A laje que o andar pisa. É ela que recebe a sombra longa — o único
          plano da cena em que a mancha de 7 m tem onde cair.

          No andar 07 ela é PISO EPÓXI: cinza, e com rugosidade baixa o bastante
          para devolver as barras de LED do corredor. É esse reflexo no chão que
          vende "moderno" — sem ele o mesmo cinza lê como subsolo. */}
      <mesh receiveShadow castShadow position={[0, piso - LAJE / 2, zCentro]}>
        <boxGeometry args={[MEIA_LARGURA * 2, LAJE, prof]} />
        <meshStandardMaterial
          color={face('laje')}
          roughness={servidores ? 0.26 : 0.92}
          metalness={servidores ? 0.12 : 0}
          envMapIntensity={servidores ? 1.3 : 1}
          {...(peleLaje ?? {})}
        />
      </mesh>

      {/* Teto só para o andar mais alto da janela: o vizinho que o forneceria
          não está na árvore. Nunca acima da cobertura, que não tem teto — é de
          lá que a faixa de céu aparece. */}
      {comTeto && !cobertura && (
        <mesh receiveShadow position={[0, topo + LAJE / 2, zCentro]}>
          <boxGeometry args={[MEIA_LARGURA * 2, LAJE, prof]} />
          <meshStandardMaterial color={face('teto')} roughness={0.95} metalness={0} />
        </mesh>
      )}

      {/* A parede do fundo carrega a COR DO AR do andar — é ela que conta o
          gradiente de temperatura de perto, enquanto o fundo da tela o conta de
          longe. */}
      <mesh receiveShadow position={[0, piso + PE_DIREITO / 2, zParede]}>
        <boxGeometry args={[MEIA_LARGURA * 2, PE_DIREITO, 0.3]} />
        <meshStandardMaterial
          color={face('parede')}
          roughness={servidores ? 0.75 : 0.96}
          metalness={servidores ? 0.2 : 0}
          {...(peleParede ?? {})}
        />
      </mesh>

      {/* Parapeito na cobertura, viga de borda nos andares. É o que dá
          espessura ao corte visto de frente.

          O DA COBERTURA ERA 0,88 m E VIROU UMA VENDA NOS OLHOS. Ele nasceu para
          "esconder o pé da faixa de céu" quando a cobertura era laje vazia — com
          nada atrás, um muro alto só melhorava a silhueta. Quando a cobertura
          ganhou mobília, o mesmo muro virou o problema: 30 m de largura, opaco,
          a 4,3 m da câmera, tapando o deck inteiro. A sonda mediu — pintado de
          magenta, ele ocupa a faixa y 455..580 de uma tela de 720, e sobravam 17
          pixels de deck acima dele. Espelho d'água e espreguiçadeiras estavam
          atrás de uma parede.

          É a MESMA armadilha de constante emprestada já documentada em
          `predio-luz.ts`: um número calibrado para um estado do andar que
          ninguém revisou quando o andar mudou. Agora é um rodapé de laje como
          nos outros andares, e quem define "terraço" é o guarda-corpo de vidro,
          que se vê através. */}
      <mesh castShadow receiveShadow position={[0, piso + (cobertura ? 0.17 : 0.16), BORDA - 0.12]}>
        <boxGeometry args={[MEIA_LARGURA * 2, cobertura ? 0.34 : 0.32, 0.24]} />
        <meshStandardMaterial
          color={face('viga')}
          roughness={servidores ? 0.55 : 0.9}
          metalness={servidores ? 0.35 : 0}
          {...(peleViga ?? {})}
        />
      </mesh>

      {andar.objetos.map((objeto) => (
        <ObjetoNaCena
          key={objeto.id}
          objeto={objeto}
          base={piso}
          cor={face('objeto')}
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
  andarAtivo,
}: {
  parallax: number
  largura: number
  cor: string
  espessura: number
  andarAtivo: number
}) {
  const ladrilhos = useMemo(() => ladrilhosDoPlano(parallax), [parallax])
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: cor,
        roughness: 0.98,
        metalness: 0,
        transparent: true,
      }),
    [cor],
  )
  useEffect(() => () => material.dispose(), [material])

  /**
   * O CENÁRIO RECUA ONDE O ANDAR TEM O SEU — e isto não é ajuste de gosto.
   *
   * Estas barras horizontais, uma a cada altura de andar, existem para dar
   * profundidade por parallax: andam mais devagar que o prédio, e o cérebro lê a
   * diferença como distância. Foram desenhadas para uma cena VAZIA — quando cada
   * andar tinha quatro caixas e muito vão, elas eram o que preenchia o fundo.
   *
   * O andar 07 agora tem sessenta e quatro racks, parede e fileira de trás. O
   * fundo deixou de estar vazio, e a barra deixou de ser profundidade: virou uma
   * faixa atravessando a sala, cortando os racks na horizontal. Foi o que o dono
   * viu e chamou de "faixa" — primeiro azul, depois marrom, porque na primeira
   * vez eu troquei a cor dela e não a causa.
   *
   * Então o andar diz o que precisa, do mesmo jeito que a janela de três andares
   * já faz: quem tem cenário próprio dispensa o ritmo genérico; quem não tem
   * continua recebendo. Por opacidade AMORTECIDA e não por `visible`, senão a
   * barra sumiria de um quadro para o outro no meio da descida.
   */
  /**
   * A COBERTURA ENTROU NA LISTA, e ela fecha a caça que consumiu quatro
   * tentativas.
   *
   * O dono reclamou de barras cortando a vista. Eu afinei os pilares, recuei os
   * pilares, removi os pilares e tirei o montante central deste plano — e a
   * captura seguinte ainda tinha barra vertical E horizontal. Porque o que
   * sobrou é o PLANO INTEIRO: os ladrilhos daqui são faixas horizontais de
   * `largura * 2` a cada pé-direito, e os montantes laterais são verticais
   * contínuas. Eu vinha caçando peças; o problema era a camada.
   *
   * E a razão de ela poder sair é a mesma que já valia para o andar 07: este
   * cenário existe para dar ritmo de fundo a andar que NÃO TEM fundo próprio.
   * A cobertura tem — ela ganhou uma cidade inteira atrás dela, em três faixas
   * com perspectiva atmosférica. O ritmo genérico deixou de ser o fundo e virou
   * uma grade ENTRE o terraço e a vista que ele existe para mostrar.
   *
   * Por opacidade amortecida e não por `visible`: senão a camada sumiria de um
   * quadro para o outro no meio da descida.
   */
  const semCenarioGenerico = new Set(['cobertura', 'servidores'])
  useFrame((_, delta) => {
    const chave = ANDARES[andarAtivo]?.chave
    const alvo = chave && semCenarioGenerico.has(chave) ? 0 : 1
    material.opacity = amortecer(material.opacity, alvo, delta)
    material.visible = material.opacity > 0.02
  })

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
          precisar de registro com andar nenhum.

          O DO EIXO SAIU, e ele era o último obstáculo da vista. Depois de eu
          afinar, recuar e por fim REMOVER os pilares do plano da frente, o dono
          mandou mais uma captura com uma barra escura ainda cortando o quadro ao
          meio — e era esta. Vertical contínua em x = 0, atravessando a cena de
          cima a baixo, num plano de fundo que ninguém suspeita.

          A lição, e ela vale para a próxima caça: quando o defeito SOBREVIVE à
          correção do suspeito óbvio, o suspeito era outro. Eu mexi nos pilares
          três vezes sem conferir se a barra que aparecia na tela era mesmo
          pilar.

          As duas laterais ficam. Elas caem nas bordas do quadro, onde emolduram
          em vez de obstruir, e continuam entregando a verticalidade contínua que
          costura a descida — que era a função original dos pilares. */}
      {[-largura * 0.56, largura * 0.56].map((x) => (
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
const CEU_ALTURA = 46
const CEU_LARGURA = 140
const CEU_Z_LOCAL = -16

function Ceu() {
  /**
   * ONDE O SOL CAI NESTE PLANO — projetado, não escolhido a olho.
   *
   * Traça-se o raio que sai da câmera parada na cobertura, na direção de `SOL`,
   * e vê-se onde ele fura o plano do céu. É a mesma conta que a luz direcional
   * já faz, resolvida em coordenada de textura em vez de em sombra.
   *
   * Existe porque a versão anterior CRAVAVA o brilho no canto do canvas,
   * combinando a olho com uma direção de luz que morava em outro arquivo.
   * Funcionava enquanto ninguém mexesse no sol — e o sol acabou de mudar de 8,5°
   * para 24°. É a quarta ocorrência da mesma armadilha nesta feature (céu ←
   * rótulo, albedo ← paleta, cenário ← andares, agora brilho ← azimute), e por
   * isso ela vira conta em vez de constante.
   */
  const { u, v } = useMemo(() => {
    const pose = quadroDe(0).pose
    // O plano vive no grupo do fundo, deslocado em `pose.y · (1 − parallax)`.
    const grupoY = pose.y * (1 - PLANOS[0]!.parallax)
    const zMundo = CEU_Z_LOCAL + PLANOS[0]!.z
    const t = (zMundo - pose.z) / DIRECAO_DO_SOL.z
    const x = DIRECAO_DO_SOL.x * t
    const y = pose.y + DIRECAO_DO_SOL.y * t
    // A textura tem v = 0 no TOPO do canvas; o plano tem a base em `grupoY`.
    return { u: x / CEU_LARGURA + 0.5, v: 1 - (y - grupoY) / CEU_ALTURA }
  }, [])

  // PINTADO EM `predio-ceu.ts`, e de lá sai também o mapa de ambiente: o céu que
  // se vê e o céu que a piscina reflete passam a ser o MESMO. Enquanto eram dois
  // degradês escritos em arquivos diferentes, a lâmina d'água devolvia um céu que
  // não estava na tela — ninguém nota conscientemente, e é justamente esse tipo
  // de desacordo que faz uma cena parecer desenhada em vez de fotografada.
  const textura = useMemo(() => texturaDeCeu(u, v), [u, v])
  useEffect(() => () => textura.dispose(), [textura])

  /**
   * AS DUAS CAMADAS QUE ANDAM. O porquê está em `texturaDeNuvens`; aqui fica só
   * o que é de cena.
   *
   * `useEffect` e não `useMemo` para o descarte: `useMemo` NUNCA executa a função
   * de limpeza que se devolve dele. Esta cena já pagou esse erro uma vez, com
   * andares fantasmas se acumulando a cada promoção de paralaxe para
   * perspectiva, e o defeito apareceu como três sintomas diferentes antes de
   * alguém achar a causa. Textura de 2048 vazando por remontagem seria a mesma
   * história com outro nome.
   */
  const nuvens = useMemo(
    () => ({ cumulo: texturaDeNuvens('cumulo', u), cirro: texturaDeNuvens('cirro', u) }),
    [u],
  )
  useEffect(
    () => () => {
      nuvens.cumulo.dispose()
      nuvens.cirro.dispose()
    },
    [nuvens],
  )

  /**
   * O RELÓGIO DAS NUVENS USA `elapsedTime` E NÃO UM ACUMULADOR DE `delta`.
   *
   * Os dois dariam quase a mesma coisa, mas só um é imune a pausa: quando a aba
   * vai para segundo plano o navegador para de chamar o quadro, e um acumulador
   * simplesmente congela — o céu volta exatamente de onde parou. Com o tempo
   * decorrido, ele volta de onde ESTARIA se ninguém tivesse saído, que é o que o
   * céu faz. É a diferença entre uma cena que continua existindo sem plateia e
   * uma que espera por ela.
   */
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    nuvens.cumulo.offset.x = (t * DERIVA_DAS_NUVENS.cumulo) % 1
    nuvens.cirro.offset.x = (t * DERIVA_DAS_NUVENS.cirro) % 1
  })

  return (
    <group position={[0, CEU_ALTURA / 2, CEU_Z_LOCAL]}>
      <mesh>
        <planeGeometry args={[CEU_LARGURA, CEU_ALTURA]} />
        <meshBasicMaterial map={textura} toneMapped={false} fog={false} />
      </mesh>
      {/*
        AS CAMADAS VÊM NA ORDEM DA ALTURA REAL: o cirro está mais longe, então
        fica atrás do cúmulo. Dez centímetros de separação bastam — é longe o
        bastante para o teste de profundidade decidir sem cintilar e perto o
        bastante para não gerar paralaxe própria entre as duas.

        `depthWrite` desligado nas duas porque elas são transparentes: uma
        superfície translúcida que escreve profundidade recorta o que vier depois
        dela pelo seu retângulo inteiro, e não pelo que ela de fato cobre.
      */}
      <mesh position={[0, 0, 0.06]}>
        <planeGeometry args={[CEU_LARGURA, CEU_ALTURA]} />
        <meshBasicMaterial
          map={nuvens.cirro}
          transparent
          depthWrite={false}
          toneMapped={false}
          fog={false}
        />
      </mesh>
      <mesh position={[0, 0, 0.12]}>
        <planeGeometry args={[CEU_LARGURA, CEU_ALTURA]} />
        <meshBasicMaterial
          map={nuvens.cumulo}
          transparent
          depthWrite={false}
          toneMapped={false}
          fog={false}
        />
      </mesh>
    </group>
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

/**
 * ═══ O BRILHO DAS FONTES PRÁTICAS ═══
 *
 * Esta cena é um entardecer cheio de coisa acesa — varal, nicho do bar, painel
 * do escritório, cascata, fitas de LED, oitenta janelas da cidade, o disco do
 * sol — e nenhuma delas GLOWA. Cada uma é um retângulo de cor viva com borda
 * dura, porque é isso que um pixel emissivo é sem um passe que o espalhe.
 *
 * O olho nunca viu uma fonte de luz com borda dura. A lente do olho, a da câmera
 * e a atmosfera entre as duas espalham a luz forte para os pixels vizinhos, e a
 * quantidade desse espalhamento é COMO se percebe intensidade — uma fonte que
 * não sangra lê como um adesivo colorido, por mais saturada que seja. É por isso
 * que bloom é o passe que mais muda "renderizado" para "fotografado" numa cena
 * noturna, e é por isso que ele vem antes de qualquer outro pós.
 *
 * ═══ POR QUE O TONE MAPPING CONTINUA CERTO ═══
 *
 * Bloom só funciona em HDR LINEAR: ele precisa distinguir um branco de valor 1
 * de uma lâmpada de valor 6, e depois do ACES os dois já viraram o mesmo branco.
 * Espalhar DEPOIS do tone mapping devolve um halo leitoso e uniforme.
 *
 * Aqui isso sai de graça, e por uma decisão do próprio three: em
 * `WebGLPrograms.getParameters` o tone mapping do material vira `NoToneMapping`
 * sempre que o destino é um render target em vez da tela. Como o composer
 * desenha para um alvo, a cena chega ao bloom em linear; o `OutputPass` no fim
 * aplica ACES e a conversão de espaço de cor uma única vez, ao escrever no
 * canvas. Nada a desligar, nada a compensar.
 *
 * ═══ O QUE ISTO NÃO É ═══
 *
 * Não é um efeito ligado no máximo, e os números vieram de render.
 *
 * A primeira tentativa — força 0,62, limiar 0,82 — transformou a cena e
 * ESTRAGOU: o sol comeu o canto superior, o interior do escritório virou clarão
 * sem estante nem mesa dentro, e a imagem inteira perdeu contraste. O motivo é
 * que o céu desta cena tem luminância perto de 0,9 em quase toda a área, então
 * um limiar de 0,82 não seleciona fonte nenhuma: seleciona o quadro.
 *
 * Com 0,88 de limiar e 0,34 de força o passe volta a ser o que deve ser — um
 * halo em volta do que estoura, e não uma névoa por cima de tudo.
 *
 * ═══ E O ALCANCE DINÂMICO CHEGOU — os números acima são história ═══
 *
 * O parágrafo que estava aqui registrava o limite: quase nada na cena passava de
 * 1,0 em linear, porque as fontes práticas eram `MeshBasicMaterial` com cor em
 * hexadecimal, e hexadecimal não passa de 1. "O que estoura" era uma faixa
 * estreitíssima, e qualquer limiar ou pegava o céu junto ou não pegava nada. Daí
 * o limiar alto e a força tímida.
 *
 * Agora as práticas têm HEADROOM: `fonte()` multiplica a cor delas em espaço
 * linear até bem acima de 1 (ver o comentário lá). O alvo do composer é
 * `HalfFloatType`, então esses valores sobrevivem inteiros até o passe de brilho.
 *
 * Com isso o limiar deixa de ser um compromisso e vira uma AFIRMAÇÃO: 1,15 está
 * acima de qualquer superfície iluminada desta cena — o céu mais claro fica por
 * volta de 0,8 em linear — e abaixo de todas as fontes. O passe seleciona
 * exatamente o que emite, e a força pode dobrar sem lavar nada, porque agora ela
 * multiplica cem pixels de lâmpada em vez de meio milhão de pixels de céu.
 */
const BRILHO = { forca: 0.62, raio: 0.5, limiar: 1.15 } as const

/**
 * Um passe de tela cheia não participa do teste de profundidade, e o three não
 * assume isso por conta própria.
 *
 * `ShaderPass` monta um `ShaderMaterial` com os padrões da classe —
 * `depthTest` e `depthWrite` LIGADOS — e não limpa o alvo antes de desenhar. O
 * resultado é um quadrilátero em z = 0 sendo testado contra a profundidade que
 * sobrou do passe anterior, e escrevendo por cima dela. Nos alvos do pingue-
 * pongue isso vai de inofensivo a destrutivo dependendo do que ficou no buffer,
 * e o modo de falha é o pior que há: intermitente e sem erro.
 *
 * Passe de pós-processamento é uma operação sobre uma IMAGEM. Ele não tem
 * posição no mundo, e portanto não tem o que testar nem o que registrar.
 */
/**
 * Faz o passe ler a profundidade DO BUFFER QUE ELE ESTÁ LENDO, a cada quadro.
 *
 * É a única forma de acertar isto sem depender da paridade da cadeia. O
 * `EffectComposer` alterna os dois alvos e NÃO os reinicia no começo do quadro,
 * então com um número ímpar de passes que alternam a cena cai ora num, ora no
 * outro. Amarrar a textura de profundidade num alvo fixo acerta em metade dos
 * quadros e produz laço de realimentação na outra metade — que é o que fazia a
 * tela piscar preto.
 *
 * Lendo `readBuffer.depthTexture` no momento do desenho, a pergunta deixa de ser
 * "em qual alvo a cena está?" e passa a ser "de onde eu estou lendo?", que o
 * próprio composer responde. E como o passe escreve no OUTRO alvo, que tem
 * textura de profundidade própria, não há como reler o que se escreve.
 *
 * A resolução vem junto e pelo mesmo motivo: ela precisa ser a do buffer de
 * desenho, não a da janela em pixels de CSS. Com `dpr` 2 as duas diferem por
 * um fator de dois, e `1/resolucao` é o passo de vizinho que a normal usa.
 */
function comProfundidadeDoAlvo(passe: ShaderPass) {
  const original = passe.render.bind(passe)
  passe.render = (renderer, writeBuffer, readBuffer, deltaTime, maskActive) => {
    passe.uniforms.tDepth!.value = readBuffer.depthTexture
    passe.uniforms.resolucao!.value.set(readBuffer.width, readBuffer.height)
    original(renderer, writeBuffer, readBuffer, deltaTime, maskActive)
  }
}

function semProfundidade(passe: ShaderPass) {
  const m = passe.material as THREE.Material
  m.depthTest = false
  m.depthWrite = false
}

function useBrilho(ligado: boolean, comOclusao: boolean) {
  const gl = useThree((s) => s.gl)
  const cena = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const tamanho = useThree((s) => s.size)

  const composer = useMemo(() => {
    if (!ligado) return null
    /**
     * O ALVO DO COMPOSER É NOSSO, e ele carrega um `DepthTexture`.
     *
     * A lente e a oclusao (predio-profundidade.ts) precisam saber a que distância está cada pixel.
     * A alternativa seria desenhar a cena outra vez num material de
     * profundidade — uma passagem de geometria inteira, e a oclusão já cobra
     * uma. Mas o desenho normal JÁ escreve profundidade no z-buffer e a joga
     * fora no fim do quadro; pedir que ela seja guardada numa textura custa
     * memória e nenhum desenho.
     *
     * `HalfFloatType` porque é o que o `EffectComposer` usaria sozinho, e a cena
     * tem fontes acima de 1: um alvo de 8 bits as cortaria antes do brilho.
     */
    const alvo = new THREE.WebGLRenderTarget(
      Math.max(1, tamanho.width),
      Math.max(1, tamanho.height),
      { type: THREE.HalfFloatType },
    )
    alvo.depthTexture = new THREE.DepthTexture(
      Math.max(1, tamanho.width),
      Math.max(1, tamanho.height),
    )
    const c = new EffectComposer(gl, alvo)
    /**
     * ═══ CADA ALVO COM A SUA PRÓPRIA TEXTURA DE PROFUNDIDADE ═══
     *
     * Esta linha é a correção de um defeito que me custou duas tentativas
     * erradas, e o erro foi de SUPOSIÇÃO — eu não tinha lido a fonte.
     *
     * TRÊS FATOS DO `EffectComposer`, todos contraintuitivos:
     *
     *  1. Ele inicializa `writeBuffer = renderTarget1` e `readBuffer =
     *     renderTarget2`. O alvo que a gente entrega no construtor NÃO é o
     *     primeiro a receber o desenho.
     *  2. `RenderPass` tem `needsSwap = false` e desenha no READBUFFER, não no
     *     write. Ou seja, a cena vai para o `renderTarget2`.
     *  3. `renderTarget2 = renderTarget1.clone()`, e `copy()` copia
     *     `depthTexture` POR REFERÊNCIA — os dois passam a apontar para a mesma.
     *
     * E O QUE FECHA A ARMADILHA É A PARIDADE. Esta cadeia tem TRÊS passes que
     * alternam (profundidade, gradação, saída). Três é ímpar, então os buffers
     * terminam o quadro TROCADOS e o quadro seguinte começa invertido. A cena é
     * desenhada ora num alvo, ora no outro.
     *
     * Com uma textura de profundidade só, isso dá exatamente o defeito que o
     * dono reportou: num quadro a profundidade é escrita e lida certo; no
     * seguinte a cena foi para o outro alvo, a textura está velha, e o passe a
     * amostra ENQUANTO escreve no alvo dela — laço de realimentação, que o WebGL
     * acusa como `GL_INVALID_OPERATION`. Alternando. Isso é piscar.
     *
     * A minha primeira "correção" foi anular a profundidade do `renderTarget2`,
     * que é justamente o alvo onde o `RenderPass` desenha primeiro. Piorou.
     *
     * A CORREÇÃO CERTA não tenta adivinhar a paridade: cada alvo ganha a SUA
     * textura, e o passe lê a do buffer que está lendo (ver `comProfundidadeDoAlvo`).
     * Assim funciona em qualquer paridade, e continua funcionando se alguém
     * acrescentar ou remover um passe amanhã.
     */
    c.renderTarget2.depthTexture = new THREE.DepthTexture(
      Math.max(1, tamanho.width),
      Math.max(1, tamanho.height),
    )
    c.addPass(new RenderPass(cena, camera))
    /**
     * ═══ O PASSE DE PROFUNDIDADE — OCLUSÃO E LENTE JUNTAS, ANTES DO BRILHO ═══
     *
     * O QUE A OCLUSÃO RESOLVE. Toda superfície desta cena era iluminada como se
     * nada estivesse ao lado dela: o vaso encosta no deck e o contato não
     * escurece, a quina interna da jardineira tem o mesmo valor da face externa.
     * As manchas pintadas no chão resolvem o apoio e mais nada.
     *
     * A ORDEM É OBRIGATÓRIA e vale para as duas: depois do desenho e ANTES do
     * brilho. Escurecer uma fresta depois de o bloom já ter florescido nela
     * deixaria o halo sem a fonte; e num sistema óptico de verdade a luz
     * atravessa a lente e SÓ DEPOIS espalha no vidro, então o que floresce é a
     * imagem já desfocada.
     *
     * POR QUE UM PASSE SÓ: cada passe que lê profundidade precisa estar lendo do
     * buffer onde a cena acabou de ser desenhada, e escrevendo no outro. Com dois
     * passes em sequência, o segundo lê a saída do primeiro — que não tem
     * profundidade de cena nenhuma. Fundir resolve isso e ainda lê a
     * profundidade uma vez em vez de duas. O traçado completo, e o que se perde
     * ao derivar a normal da profundidade em vez de desenhá-la, estão em
     * predio-profundidade.ts.
     */
    if (comOclusao && camera instanceof THREE.PerspectiveCamera) {
      const profundidade = new ShaderPass(shaderDeProfundidade(camera))
      profundidade.uniforms.proporcao!.value = tamanho.width / Math.max(1, tamanho.height)
      // `tDepth` e `resolucao` são ligados A CADA QUADRO, ao buffer de leitura —
      // ver `comProfundidadeDoAlvo` para por que um alvo fixo pisca.
      comProfundidadeDoAlvo(profundidade)
      semProfundidade(profundidade)
      c.addPass(profundidade)
    }
    /**
     * A RESOLUÇÃO DO PASSE É METADE DA TELA, e isso não é economia: é o desenho.
     *
     * Bloom é um borrão largo. Calculá-lo em resolução cheia gasta quatro vezes
     * mais banda para produzir um resultado que, depois de espalhado por dezenas
     * de pixels, ninguém distingue do de metade. A pirâmide de `UnrealBloomPass`
     * já reduz cinco vezes internamente — começar de metade só apara o degrau
     * mais caro e mais inútil dela.
     */
    const meia = new THREE.Vector2(
      Math.max(1, Math.round(tamanho.width / 2)),
      Math.max(1, Math.round(tamanho.height / 2)),
    )
    c.addPass(new UnrealBloomPass(meia, BRILHO.forca, BRILHO.raio, BRILHO.limiar))
    // A GRADAÇÃO entra DEPOIS do brilho e ANTES da curva de exibição. As duas
    // posições são obrigatórias e o porquê de cada uma está em
    // `predio-gradacao.ts` — em resumo: o bloom precisa ver os valores HDR crus
    // para escolher as fontes, e a gradação opera sobre LUZ, não sobre pixel.
    const gradacao = new ShaderPass(shaderDeGradacao)
    semProfundidade(gradacao)
    c.addPass(gradacao)
    // O `OutputPass` é quem aplica ACES e o espaço de cor no fim da cadeia. Sem
    // ele a imagem sai linear na tela: clara demais, lavada e sem a rolagem de
    // alta luz que o resto da cena foi ajustado em cima.
    c.addPass(new OutputPass())
    return c
  }, [ligado, comOclusao, gl, cena, camera, tamanho.width, tamanho.height])

  useEffect(() => {
    if (!composer) return
    composer.setSize(tamanho.width, tamanho.height)
    composer.setPixelRatio(gl.getPixelRatio())
  }, [composer, tamanho.width, tamanho.height, gl])

  // Descarta os alvos de render quando o composer troca — de degrau de
  // qualidade, de tamanho de janela ou de desmontagem. São quatro texturas de
  // tela; deixá-las para o coletor é vazar memória de GPU.
  useEffect(() => () => composer?.dispose(), [composer])

  return composer
}

function Cena({
  vsync,
  vivos,
  andarAtivo,
  brilhos,
  alvos,
  aoTrocarDeAndar,
}: {
  vsync: number
  vivos: number[]
  andarAtivo: number
  brilhos: RefObject<Map<string, boolean>>
  alvos: RefObject<Map<string, Alvo>>
  aoTrocarDeAndar: (andar: number) => void
}) {
  const progresso = useProgressoDeRolagem()
  const { tier, capacidades, medir, degrau: escadaAtual } = useQualidade(vsync)
  const semInercia = useSemInercia()
  const sol = useRef<THREE.DirectionalLight>(null)
  const planos = useRef<(THREE.Group | null)[]>([])
  const primeiroQuadro = useRef(true)
  const ultimoAndar = useRef(-1)
  /**
   * A altura que a DESCIDA quer, sem o sopro da câmera somado. Ver a respiração
   * no laço de quadro: manter as duas separadas é o que impede o sopro de
   * realimentar o amortecimento da rolagem.
   */
  const alturaDaDescida = useRef(quadroDe(0).pose.y)
  const relogioDaCamera = useRef(0)
  /**
   * Quanto a cobertura está ABERTA como seção inteira: 1 parada no topo, 0 assim
   * que a descida começa. Vem do mesmo `smoothstep` que levanta a câmera, e é
   * lido pelo laço das âncoras — ver o piso de tela lá embaixo.
   */
  const coberturaAberta = useRef(1)


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

  const brilho = useBrilho(capacidades.brilho, capacidades.oclusao || PROFUNDIDADE_FORCADA)
  /**
   * QUEM DESENHA A CENA PASSA A SER ESTE LAÇO, e ele é registrado SEMPRE.
   *
   * O r3f desenha sozinho enquanto todo `useFrame` estiver na prioridade 0.
   * Basta UM callback com prioridade maior para ele desligar o desenho
   * automático e passar a responsabilidade adiante — e isso vale para a árvore
   * inteira, não só para quem registrou.
   *
   * Daí o `if` estar DENTRO do callback e não em volta do `useFrame`. Registrar
   * condicionalmente quebraria a regra dos hooks, e — pior — nos degraus sem
   * bloom o r3f já teria desligado o desenho dele em algum quadro anterior e a
   * tela ficaria preta. Aqui a prioridade é constante e o que muda é só quem
   * escreve o pixel final.
   *
   * Prioridade 1 também garante a ORDEM: todos os callbacks de prioridade 0 —
   * inclusive o que posiciona a câmera e atualiza a matriz — já rodaram quando
   * este começa.
   */
  useFrame(({ gl, scene, camera }) => {
    /**
     * `autoReset` DESLIGADO enquanto se mede, e sem isto a contagem mente.
     *
     * O three zera `info.render` no INÍCIO de cada chamada de `render()`. Com o
     * composer, um quadro são vários `render()` — um por passe —, então o que
     * sobra no fim é a conta do ÚLTIMO deles, que é um quadrilátero de tela
     * cheia. Foi o que a primeira medição mostrou: "chamadas 1, triangulos 0k"
     * numa cena de mais de cem instâncias.
     *
     * Zerando à mão aqui, antes do desenho, e deixando o acumulador correr por
     * todos os passes, a leitura passa a ser o custo do QUADRO — que é o que se
     * quer saber. Só acontece com `?medir=1`.
     */
    if (LIGADO) {
      gl.info.autoReset = false
      gl.info.reset()
    }
    if (brilho) brilho.render()
    else gl.render(scene, camera)
  }, 1)
  /**
   * O MEDIDOR, em prioridade 2 — depois do desenho, e por isso.
   *
   * `gl.info.render` é zerado pelo renderizador a cada quadro e só está cheio
   * DEPOIS que o desenho aconteceu. Lido antes, devolveria as contas do quadro
   * anterior; lido aqui, devolve as deste — inclusive as chamadas de todos os
   * passes do composer, que é justamente o custo que se quer enxergar.
   *
   * Sem `?medir=1` a função sai na primeira linha e nada disto acontece.
   */
  useFrame(({ gl }, delta) => {
    if (!LIGADO) return
    registra(
      delta,
      vsync,
      escadaAtual,
      gl.getPixelRatio(),
      gl.info.render.calls,
      gl.info.render.triangles,
      [
        capacidades.perspectiva ? 'perspectiva' : '',
        capacidades.brilho ? 'brilho' : '',
        capacidades.oclusao ? 'oclusao+lente' : '',
      ]
        .filter(Boolean)
        .join(' · ') || 'nenhuma',
    )
  }, 2)
  const arAlvo = useMemo(() => new THREE.Color(), [])
  // Largura de janela da última medição das âncoras — ver o aparo no laço.
  const medidasVelhas = useRef(0)
  const ndc = useMemo(() => new THREE.Vector3(), [])
  /** Andar cujo mapa de ambiente esta montado. -1 forca a primeira geracao. */
  const andarDoAmbiente = useRef(-1)

  useFrame(({ camera, scene, size, gl }, delta) => {
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

    /**
     * A COBERTURA GANHA UM ENQUADRAMENTO PRÓPRIO, e ele se dissolve na descida.
     *
     * O pedido foi que a cobertura ocupasse uma seção inteira, com o céu
     * sobrando em cima para receber copy. O que impedia isso era uma faixa de
     * 63 cm do andar de baixo aparecendo no rodapé do quadro — medida assim: em
     * 16:9 a lente bate no teto de 62°, então a meia-altura no plano da frente
     * (z = 1,6, a 4,3 m da câmera) é 4,3 · tan 31° = 2,585 m. Com a câmera em
     * −1,60, o quadro vai de −4,185 a +0,985, e o topo do andar 07 está em
     * −3,55. Sobram 0,635 m dele dentro da tela.
     *
     * A CORREÇÃO É SUBIR A CÂMERA, E NÃO INCLINÁ-LA. Inclinar resolveria com
     * menos deslocamento, mas introduz verticais convergentes — e a cena inteira
     * é um CORTE de prédio, uma leitura que depende de as verticais serem
     * paralelas. Subir mantém a projeção ortogonal e empurra o rodapé para fora.
     *
     * E a elevação é CALCULADA, não escolhida: ela sai da lente. Um número fixo
     * funcionaria em 16:9 e cortaria o deck numa tela ultralarga, onde a lente
     * fecha para 52° e o quadro encolhe meio metro. Aqui ela é sempre exatamente
     * o que falta para o topo do andar de baixo encostar na borda inferior.
     *
     * A dissolução usa `estacao`, que já existe: no andar 0 ela vai de 0 (parado
     * na cobertura) a 1 (meio caminho para o 07). Com `smoothstep`, a câmera
     * desce de volta ao eixo normal sem quina, e a partir do andar 1 a descida é
     * exatamente a de antes.
     */
    let alvoY = quadro.pose.y
    if (quadro.andar === 0 && camera instanceof THREE.PerspectiveCamera) {
      const meiaAltura =
        (quadro.pose.z - BORDA) * Math.tan(((camera.fov / 2) * Math.PI) / 180)
      // O topo do andar de baixo é o que precisa sair pela borda inferior. Os
      // 6 cm de folga cobrem o arredondamento do amortecimento durante a inércia.
      const yQueExclui = topoDoAndar(1) + meiaAltura + 0.06
      const fatia = Math.min(1, Math.max(0, quadro.estacao))
      const aberto = 1 - fatia * fatia * (3 - 2 * fatia)
      alvoY += Math.max(0, yQueExclui - quadro.pose.y) * aberto
      coberturaAberta.current = aberto
    } else coberturaAberta.current = 0

    /**
     * ═══ A RESPIRAÇÃO DA CÂMERA ═══
     *
     * Plano de cinema nunca está perfeitamente parado. Mesmo numa cabeça
     * fluida, mesmo num travelling, sobra uma deriva de milímetros — e o olho
     * conhece essa deriva sem saber que conhece. Imagem de imobilidade
     * ARITMÉTICA só existe em render, e é um dos tells mais fortes que há.
     *
     * Três centímetros em X, dois em Y, com dois períodos incomensuráveis (11 e
     * 17 segundos) para o ciclo não fechar e o movimento não virar um vaivém
     * reconhecível. A três metros da cena isso é meio grau de arco: ninguém
     * consegue apontar, todo mundo sente.
     *
     * DUAS PRECAUÇÕES, e as duas são de correção e não de gosto:
     *
     *  · `semInercia` desliga a respiração inteira. Quem pede movimento reduzido
     *    está pedindo isto também — talvez sobretudo isto, porque é movimento
     *    que não responde a nenhuma ação de quem assiste.
     *
     *  · `CAMERA_PARADA` (`?parado=1`) faz o mesmo, e existe por outra razão:
     *    as sondas de movimento. Elas provam que o vento ou a água animam
     *    comparando dois quadros do mesmo recorte, e a respiração move TODA
     *    aresta do quadro entre as duas capturas — com ela viva, a sonda
     *    responde "em movimento" com o efeito morto. Ver `predio-medicao.ts`,
     *    inclusive por que `prefers-reduced-motion` não serve de alavanca.
     *
     *  · O AMORTECIMENTO LÊ DE UM `ref`, NÃO DA CÂMERA. Se ele continuasse
     *    lendo `camera.position.y`, estaria lendo a altura JÁ RESPIRADA e
     *    tentando amortecê-la em direção ao alvo — a respiração entraria na
     *    malha de realimentação da rolagem e viraria oscilação, com período e
     *    amplitude que ninguém pediu. A altura da descida e o sopro da câmera
     *    somam-se no fim; nunca se misturam antes.
     */
    const imovel = semInercia || CAMERA_PARADA
    alturaDaDescida.current = imovel
      ? alvoY
      : amortecer(alturaDaDescida.current, alvoY, delta)
    const t = relogioDaCamera.current + delta
    relogioDaCamera.current = t
    const sopro = imovel ? 0 : 1
    camera.position.set(
      Math.sin(t / 11) * 0.03 * sopro,
      alturaDaDescida.current + Math.sin(t / 17 + 1.3) * 0.02 * sopro,
      quadro.pose.z,
    )
    // `lookAt` continua mirando a MESMA altura da câmera: o passeio em X gera um
    // giro minúsculo, que é o que uma cabeça de tripé faz, e o passeio em Y não
    // gera inclinação nenhuma — a cena continua sem pitch, como sempre foi.
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
      // `imovel` e não `semInercia`: os planos de paralaxe também têm de chegar
      // ao alvo de uma vez com a câmera parada, ou uma sonda que fotografa antes
      // do amortecimento assentar mediria o assentamento em vez do efeito.
      grupo.position.y = imovel ? alvo : amortecer(grupo.position.y, alvo, delta)
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

    // O AMBIENTE ACOMPANHA O ANDAR — e sem ele metal fica PRETO.
    //
    // Em PBR, metal não tem cor difusa própria: ele só reflete o que está em
    // volta. Sem mapa de ambiente, o rack do andar 07 (`metalness: 0.9`)
    // refletia o nada e renderizava preto por mais lâmpada que se pusesse em
    // cima. Não era falta de luz — era falta de o que refletir.
    //
    // O mapa é DESENHADO, não baixado: um degradê equirretangular com o céu
    // âmbar em cima, o ar do andar no meio e a laje escura embaixo. HDRI
    // fotográfico custaria 1,6 MB num site que vive de Lighthouse — e, pior,
    // seria a foto de OUTRO lugar iluminando os sete andares.
    //
    // Refeito só quando o andar ativo troca: `PMREMGenerator` é caro demais
    // para rodar por quadro, e o degradê só muda de cor quando o andar muda.
    if (andarDoAmbiente.current !== quadro.andar) {
      andarDoAmbiente.current = quadro.andar
      // O AMBIENTE PRECISA CEDER PARA A SOMBRA EXISTIR. Ele ilumina por igual e
      // nao e sombreado: com intensidade cheia ele preenchia a sombra do sol por
      // completo, e a cena tinha sol sem ter UMA sombra visivel. 0,5 mantem o
      // metal com o que refletir e devolve o contraste ao facho.
      // 0,28: luz pratica so EXISTE se o ambiente ceder. Um balizador de 5 W nao
      // aparece ao lado de um ceu inteiro iluminando por igual — e com ambiente
      // alto, apagar a cena nao adianta, porque o que apaga e o CONTRASTE.
      scene.environmentIntensity = 0.28
      scene.environment?.dispose()
      scene.environment = criaAmbiente(
        gl,
        corDoAndar(quadro.andar),
        tom(corDoAndar(quadro.andar), 0.35),
        // So a cobertura tem ceu aberto em volta. Num andar interno, refletir
        // sol e nuvem seria a mesma incoerencia que refletir nada.
        quadro.andar === 0,
      )
    }

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
      /**
       * ═══ O PISO DE TELA, E ELE EXISTE PORQUE O APARO CONTRADIZIA A CÂMERA ═══
       *
       * O DEFEITO, visível em todo render da cobertura: "07 / Servidores" e "Ver
       * os sistemas em produção" pousados no canto inferior esquerdo do PRIMEIRO
       * QUADRO DO SITE — rótulos de um andar que a câmera acabou de empurrar
       * deliberadamente para fora do enquadramento.
       *
       * As duas metades do sistema discordavam. A câmera sobe, na cobertura, o
       * quanto for preciso para o topo do andar 07 sair pela borda de baixo; é
       * isso que faz o terraço ocupar uma seção inteira. Mas o aparo das âncoras
       * GRAMPEIA qualquer alvo com |ndc.y| até 1,25 dentro da tela — então o
       * rótulo do andar excluído era arrastado de volta para a borda e desenhado
       * com 68 % de opacidade. A geometria saía; a legenda voltava.
       *
       * O aparo está certo no resto da descida: ele é o que mantém o objeto do
       * andar vizinho clicável enquanto legível, que é o ponto de manter três
       * andares vivos. Errado é aplicá-lo justamente onde a cena declarou que o
       * vizinho não deve aparecer.
       *
       * `coberturaAberta` vem do MESMO `smoothstep` que levanta a câmera, então
       * as duas metades passam a concordar por construção: enquanto a cobertura
       * está aberta o piso sobe para −0,95 e nada de baixo é grampeado; quando a
       * descida começa e a câmera volta ao eixo, o piso relaxa junto e o aparo
       * volta a valer inteiro. Não há um segundo limiar para ficar fora de sincronia.
       */
      const pisoDaTela = -1.25 + coberturaAberta.current * 0.3
      if (ndc.z > 1 || ndc.y > 1.25 || ndc.y < pisoDaTela) {
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

        A COR VINHA DE `corDoRotulo(0)`, E ISSO ERA UM BUG DE TRÊS MESES. Este
        comentário dizia "âmbar claro, a mesma tinta que `predio-luz.ts` já
        mediu" — verdade enquanto havia um rótulo só para o prédio inteiro.
        Quando o rótulo virou por andar, o da cobertura virou TINTA ESCURA
        (#2a1806), porque a cobertura ficou clara e texto escuro é o que
        contrasta com ela. O céu foi consertado naquele dia; o sol não, e o
        comentário aqui continuou descrevendo um mundo extinto. `COR_DO_SOL` e
        `INTENSIDADE_DO_SOL` têm a conta inteira, e agora existe teste.
      */}
      <directionalLight
        ref={sol}
        castShadow
        color={COR_DO_SOL}
        intensity={INTENSIDADE_DO_SOL}
        shadow-mapSize={[tier.shadow, tier.shadow]}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-camera-near={6}
        shadow-camera-far={64}
        shadow-bias={-0.0004}
        shadow-normalBias={0.012}
      />
      {/*
        O preenchimento. NÃO projeta — é o que levanta a face virada para a
        câmera, que com o sol 14° atrás fica em contraluz. Céu na cor da
        cobertura, chão na cor do andar mais frio: o arco de temperatura entra
        até no ambiente.

        OS FATORES ERAM 7 E 4,5 E NÃO CHEGAVAM. `tom()` volta para string, e
        `setStyle` clampa em 255: `#d9a066 × 7` pedia (4,857 2,461 0,930) e
        entregava (1,000 1,000 0,930). O âmbar virava BRANCO — 79 % do vermelho
        e 59 % do verde descartados em silêncio, e com eles o matiz, porque os
        canais saturam em ordens diferentes. A luz dominante da cena não tinha
        cor nem direção, que é o que "iluminação plana" quer dizer medido.

        O comentário de `ALBEDO`, 1800 linhas acima, já tinha descoberto isso
        ("`#d9a066` × 5 satura em branco") e por isso baixou os fatores de
        albedo para perto de 1. A luz ficou de fora da correção. `PREENCHIMENTO`
        aplica aqui a mesma conclusão: o fator mora na cor, não no
        multiplicador, e 1 / 0,643 preserva a relação 7 / 4,5 que era a
        intenção real.
      */}
      <hemisphereLight
        args={[
          tom(corDoAndar(0), PREENCHIMENTO.fatorDoCeu),
          tom(corDoAndar(4), PREENCHIMENTO.fatorDoChao),
          PREENCHIMENTO.intensidade,
        ]}
      />

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
              {/* A cidade mora no plano da FRENTE porque este é o plano de
                  coordenada de mundo: a 20 m de distância ela já produz o
                  parallax certo sozinha, e parallax fabricado desalinharia a
                  linha do horizonte durante a descida. Ver o cabeçalho de
                  `predio-cidade.tsx` para o intervalo de z em que ela cabe. */}
              <Cidade cor={CIDADE} corDistante={CIDADE_DISTANTE} ceu={CEU} />
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
              cor={CENARIO}
              espessura={0.34}
              andarAtivo={andarAtivo}
            />
          ) : (
            <>
              <Ceu />
              <PlanoDeFundo
                parallax={plano.parallax}
                largura={MEIA_LARGURA * 1.3}
                cor={CENARIO_DISTANTE}
                espessura={0.5}
                andarAtivo={andarAtivo}
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
            {/* ═══ O RÓTULO DE ANDAR SAIU, a pedido do dono ═══
              *
              * Era uma etiqueta com o número e o título do andar, ancorada em
              * `xDoObjeto(0.04)` — a ponta esquerda da cena. Funcionava enquanto
              * aquela ponta era deck vazio; com o núcleo do elevador construído
              * ali, o chip passou a pousar em cima do volume.
              *
              * Reposicionar teria sido o reparo óbvio e é o que eu tinha
              * proposto. O dono escolheu remover, e o argumento a favor é bom:
              * ele era a única peça de INTERFACE sobre uma imagem que existe
              * para ser olhada, e o que ele dizia já está dito em dois outros
              * lugares — a âncora de cada objeto carrega o próprio texto logo
              * abaixo, e `PredioFallback` tem a lista de andares inteira.
              *
              * O QUE ISTO NÃO REMOVE, para quem vier procurar: as âncoras de
              * objeto continuam, com `href` real e alvo de toque de 44 px. O
              * `<nav>` de pular-para-o-andar de `PredioIndicador` continua. E a
              * maquinaria de `clicavel` continua de pé — ela agora só recebe
              * `true`, mas é ela que impede um elemento não clicável de comer o
              * ponteiro, e a próxima etiqueta que alguém acrescentar vai
              * precisar dela outra vez.
              *
              * Volta em um bloco se ele mudar de ideia: era um `<div>` com
              * `registrar('rotulo:' + chave, …, false)`.
              */}
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
          // ACES E NAO AgX, E ISTO FOI TESTADO. AgX tem rolagem de alta luz
          // mais longa e nao torce o matiz, e com o disco do sol no quadro isso
          // parecia a escolha obvia. Renderizado em 1,62 e em 1,30 de exposicao,
          // ele lavou a cena inteira: o deck perdeu o ambar, o ceu perdeu o
          // violeta e a imagem ficou leitosa. Ganhou no halo do sol e perdeu em
          // tudo o mais. Um pouco de exposicao sobre ACES devolve a leitura do
          // material sem clarear tinta nenhuma.
          gl.toneMappingExposure = 1.18
        }}
      >
        <Cena
          vsync={vsync}
          vivos={vivos}
          andarAtivo={andar}
          brilhos={brilhos}
          alvos={alvos}
          aoTrocarDeAndar={setAndar}
        />
      </Canvas>
      <Sobreposicao dict={dict} locale={locale} vivos={vivos} brilhos={brilhos} alvos={alvos} />
      <LeituraDeDesempenho />
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
