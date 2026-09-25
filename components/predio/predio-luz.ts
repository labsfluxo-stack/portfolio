/**
 * A cor de cada andar, derivada da temperatura declarada no programa, e o
 * rótulo que sobrevive a ela.
 *
 * O par cor-de-fundo/cor-de-texto NÃO é escolhido por gosto: é escolhido e
 * depois MEDIDO em `tests/unit/predio-luz.test.ts`. Trocar um hex sem conferir
 * o contraste quebra a suíte, que é como este projeto já protege a landing
 * (`tests/unit/contraste.test.ts`).
 */
/** WCAG 2.1 AA para texto normal. */
export const MINIMO_AA = 4.5

/**
 * Cor do ar de cada andar, do topo para o térreo.
 *
 * Escrita à mão, e não calculada a partir do kelvin, de propósito: a conversão
 * kelvin→sRGB dá cores fisicamente corretas e visualmente sujas nas pontas do
 * arco. O kelvin do programa diz a INTENÇÃO; estes hex são a intenção afinada
 * a olho e depois medida.
 *
 * Exportado — não por precisar em produção (quem renderiza usa `corDoAndar`),
 * mas para que `tests/unit/predio-luz.test.ts` confira `AR.length` contra
 * `ANDARES.length`. Um andar novo sem cor correspondente vira suíte vermelha
 * ali, e não um `throw` em tempo de módulo estourando a página de verdade.
 */
export const AR = [
  '#d9a066', // cobertura — o ponto MAIS CLARO do prédio: sol pleno de hora dourada
  '#6b5544', // servidores
  '#6d6270', // design
  '#5d6a86', // geo — esfriando, ainda não é o ponto mais frio
  '#56709c', // automação — o miolo de verdade: kelvin mais alto, cor mais fria
  '#7a6473', // acolhimento — começa a esquentar de volta
  '#b5834a', // recepção — luz artificial, quente e acolhedora
] as const

/**
 * UM RÓTULO POR ANDAR — e esta troca desfez um nó que travava o prédio inteiro.
 *
 * ERA UM RÓTULO SÓ, claro, para os sete andares. A intenção era boa: menos
 * pares para medir, e o texto não muda de cor no meio da descida. O efeito
 * colateral não estava previsto e custou caro — para um mesmo âmbar claro
 * passar 4,5:1 em TODOS os andares, todos os andares precisavam ser escuros.
 * Nenhum canal de nenhuma cor podia passar de 0x44.
 *
 * Ou seja: um acerto de acessibilidade projetou um prédio noturno por acidente.
 * E a conta só apareceu muito depois, quando o metal do datacenter renderizou
 * PRETO — metal reflete o ambiente, o ambiente é a cor do andar, e a cor do
 * andar era quase preta. Não havia como iluminar um prédio projetado para ser
 * escuro.
 *
 * Com rótulo por andar, é a cor do TEXTO que se adapta: tinta escura sobre
 * andar claro, tinta clara sobre andar escuro. O andar passa a ter a
 * luminosidade que a arte pede, não a que o rótulo permitia. E o contraste
 * continua medido nos sete pares — sete chances de errar viram sete asserções,
 * que é o troco certo.
 */
const ROTULOS = [
  '#2a1806', // sobre a cobertura clara: tinta escura
  '#f5e9da',
  '#f6f1f7',
  '#f0f5fd',
  '#f0f5fd',
  '#f9f0f6',
  '#231505', // sobre a recepção clara: tinta escura
] as const

export function corDoAndar(indice: number): string {
  return AR[Math.min(AR.length - 1, Math.max(0, indice))]!
}

export function corDoRotulo(indice: number): string {
  return ROTULOS[Math.min(ROTULOS.length - 1, Math.max(0, indice))]!
}

/**
 * A cor clara do céu, própria — e não emprestada do rótulo.
 *
 * O `Ceu` de `Predio.tsx` montava o degradê com `corDoRotulo(0)` como a cor
 * acesa do horizonte. Funcionava por coincidência: enquanto havia UM rótulo
 * para o prédio inteiro, ele era um creme claro, e servia de "cor clara" a
 * quem precisasse.
 *
 * Quando o rótulo passou a ser por andar, o da cobertura virou TINTA ESCURA —
 * porque a cobertura ficou clara e texto escuro é o que contrasta com ela. E o
 * céu, que continuava lendo dali, ficou escuro junto: metade do primeiro quadro
 * do site virou uma mancha marrom.
 *
 * A lição: cor de texto e cor de luz são coisas diferentes e não devem
 * compartilhar constante, por mais parecidas que estejam num dado momento.
 */
export const CEU = '#f4d9a8'

/**
 * A cor do CENÁRIO de fundo — própria, e esta é a terceira vez nesta feature.
 *
 * Os planos de parallax eram pintados com `corDoAndar(3)` e `corDoAndar(4)`.
 * Não por pertencerem a esses andares: porque geo e automação eram cinza-
 * ardósia escuro e serviam de "cor neutra" a quem precisasse de uma.
 *
 * Quando a paleta abriu, esses dois viraram os andares AZUIS — são o ponto frio
 * do arco, por definição. Multiplicados pelos fatores do cenário, viraram
 * lavanda claro, e o fundo do prédio inteiro ficou azul. Pior: o cenário anda em
 * parallax diferente do prédio, então a faixa desliza e parece passar na frente.
 *
 * O PADRÃO, já que é a terceira ocorrência: o céu emprestava a cor do rótulo, o
 * albedo compensava a paleta, e o cenário emprestava a cor de dois andares.
 * Nenhum dos três estava errado enquanto a paleta não mudou — e todos quebraram
 * juntos quando ela mudou. Constante emprestada porque "a cor está parecida" é
 * dívida silenciosa: ela não documenta a intenção, só o acaso de um momento.
 */
/**
 * A CIDADE TEM PALETA PROPRIA, e ela e FRIA.
 *
 * `CENARIO` e marrom porque veste os planos de parallax, que sao estrutura de
 * concreto do proprio predio. A cidade ao redor e outra coisa: torre de vidro
 * refletindo o ceu de crepusculo. Vidro nao e marrom em nenhuma hora do dia, e
 * torre marrom foi o que fez o skyline anterior ler como bairro antigo de
 * tijolo em vez de centro contemporaneo.
 *
 * Constante propria e nao emprestada de `CENARIO`: e a quinta vez nesta feature
 * que uma cor emprestada "porque esta parecida" cobra depois.
 */
/**
 * ═══ CLAREARAM, PORQUE ESCURO DEMAIS LÊ COMO "FRACO" ═══
 *
 * Eram `#3c4657` e `#4a5468`, e o dono descreveu a cidade como "fraca, sem cor,
 * sem realismo" depois de cinco rodadas em que eu mexi em reflexo, malha,
 * tinta de vidro e modulação de matiz. Nenhuma pegou, e estas duas constantes
 * são o motivo pelo qual nenhuma podia pegar.
 *
 * A conta: a cidade está a 19–25 m da câmera, dentro de uma névoa que corre de
 * 13 a 52 m. Isso põe 15 a 31 % de âmbar puro sobre cada pixel dela. Uma base
 * escura e dessaturada entra nessa mistura sem nada a oferecer — o que sai do
 * outro lado é a cor da névoa, e a cor da névoa é a mesma para todo mundo. Daí
 * "sem cor": não é que as torres tenham cores parecidas, é que a cor delas não
 * SOBREVIVE ao trajeto até a câmera.
 *
 * Mais claras e mais saturadas, elas chegam com alguma coisa. E a perspectiva
 * atmosférica continua inteira: `clareia` mistura cada faixa com o céu na mesma
 * proporção de antes, então a faixa do fundo permanece tão pálida quanto era. O
 * que muda é a da FRENTE, que é a que o visitante lê.
 */
export const CIDADE = '#5d6d8c'
export const CIDADE_DISTANTE = '#68748f'

export const CENARIO = '#4b4038'
export const CENARIO_DISTANTE = '#3b332d'

/**
 * ═══ A COR DO SOL — PRÓPRIA, E ESTA É A QUARTA VEZ NESTA FEATURE ═══
 *
 * O `directionalLight` de `Predio.tsx` lia `corDoRotulo(0)`. Funcionava pela
 * mesma coincidência que já quebrou o céu (ver `CEU`, acima) e o cenário (ver
 * `CENARIO`): enquanto havia UM rótulo para o prédio inteiro, ele era um âmbar
 * claro, e servia de "cor quente" a quem precisasse.
 *
 * Quando o rótulo passou a ser por andar, o da cobertura virou TINTA ESCURA —
 * `#2a1806`, porque a cobertura ficou clara e texto escuro é o que contrasta
 * com ela. O céu foi consertado naquele dia. O SOL NÃO FOI, e ficou desde então
 * com uma cor de (42, 24, 6) sobre 255. O comentário acima da luz continuou
 * dizendo "âmbar claro", descrevendo um mundo que tinha deixado de existir.
 *
 * O padrão, agora com quatro ocorrências: o céu emprestava a cor do rótulo, o
 * albedo compensava a paleta, o cenário emprestava a cor de dois andares, e o
 * sol emprestava a tinta do texto. Nenhum estava errado enquanto a paleta não
 * mudou. Todos quebraram juntos quando ela mudou — e este ficou três meses
 * quebrado a mais que os outros porque ninguém mede a cor de uma luz.
 * Agora `tests/unit/predio-luz.test.ts` mede.
 *
 * O hex: sol de hora dourada com 14° de contraluz. Quente, mas com azul
 * suficiente para que a face iluminada não vire sépia.
 */
export const COR_DO_SOL = '#ffd2a1'

/**
 * E A INTENSIDADE DESPENCA DE 5,6 PARA 0,47 SEM A CENA ESCURECER.
 *
 * Parece absurdo até multiplicar. `#2a1806` em linear é (0,0231 0,0091 0,0018);
 * vezes 5,6 dá (0,130 0,051 0,010). `#ffd2a1` é (1,000 0,644 0,356); vezes 0,47
 * dá (0,470 0,303 0,167). A intensidade caiu 12 vezes e a luz que chega SUBIU
 * 3,6× no vermelho, 5,9× no verde e 16× no azul. O número era grande para
 * compensar uma cor quase preta.
 *
 * O ALVO, medido em luminância Rec. 709 contra o preenchimento abaixo: o sol
 * entrega 1,9× o preenchimento. Antes entregava 0,15×. É a diferença entre uma
 * cena com luz principal e uma cena só com ambiente — que é o que "iluminação
 * plana" quer dizer quando se mede em vez de olhar.
 */
export const INTENSIDADE_DO_SOL = 0.47

/**
 * ═══ O PREENCHIMENTO, E O TETO DE SATURAÇÃO QUE O APAGAVA ═══
 *
 * Os fatores eram 7 (céu) e 4,5 (chão), aplicados por `tom()` em `Predio.tsx`.
 * E `tom()` faz `new THREE.Color(hex).multiplyScalar(f).getStyle()` — a cor
 * volta a ser uma STRING `rgb(r,g,b)` antes de chegar na luz, e `setStyle`
 * clampa cada canal em 255 na volta.
 *
 * Medido, não deduzido:
 *   `#d9a066` × 7   pedia (4,857 2,461 0,930) e chegava (1,000 1,000 0,930)
 *   `#56709c` × 4,5 pedia (0,419 0,729 1,496) e chegava (0,418 0,731 1,000)
 *
 * O céu do hemisfério perdia 79 % do vermelho e 59 % do verde — e o que sobra
 * não é só mais escuro, é de OUTRO MATIZ, porque os canais saturam em ordens
 * diferentes. O âmbar virava BRANCO. A luz dominante da cena, 76 % do total,
 * era um branco sem direção.
 *
 * O mais amargo: o comentário de `ALBEDO`, no mesmo `Predio.tsx`, já dizia
 * "`#d9a066` × 5 satura em branco" — foi por isso que os fatores de albedo
 * desceram de 5,0/3,4/4,2/4,6/2,2 para perto de 1. A lição foi escrita e ficou
 * 1800 linhas acima da luz que precisava dela.
 *
 * AGORA O FATOR MORA NA COR, NÃO NO MULTIPLICADOR — que é exatamente a frase
 * com que o comentário do `ALBEDO` termina. `fatorDoCeu` é 1: o âmbar entra
 * inteiro. `fatorDoChao` é 0,643 porque 1 / 0,643 = 1,556 = 7 / 4,5, e a
 * RELAÇÃO céu/chão era a intenção real — o hemisfério tem uma intensidade só
 * para as duas cores, então a relação entre elas só pode viver nos fatores.
 *
 * O nível cai de propósito: o preenchimento vira preenchimento de verdade, e
 * quem carrega a cena passa a ser o sol.
 */
export const PREENCHIMENTO = {
  fatorDoCeu: 1,
  fatorDoChao: 0.643,
  intensidade: 0.42,
} as const

/**
 * ═══ A NÉVOA, QUE ERA O PISO DE DOIS TERÇOS DE CADA PIXEL DA CIDADE ═══
 *
 * Era `[13, 52]`, e esses dois números explicam cinco rodadas de trabalho que
 * não pegaram.
 *
 * A névoa do three é `mix(cor, corDaNévoa, f)` com `f = (d − perto) / (longe −
 * perto)`. Para a faixa 0 da cidade, a 19,4 m, `f` dava 16,4 % — que parece
 * pouco até lembrar que `f` é fração da MISTURA, não da energia. A cor da névoa
 * (`#d9a066`, luminância linear 0,409) é muito mais brilhante que a fachada
 * iluminada, e o resultado, calibrado contra captura (p25 = 88 nos corpos):
 *
 *   termo da névoa       0,409 × 0,164            = 0,0671
 *   termo da superfície  0,1517 × 0,240 × 0,836   = 0,0305
 *                                             total 0,0976  → 88 em 8 bits
 *
 * Ou seja: 69 % de cada pixel de prédio JÁ ERA NÉVOA, e a cor própria da torre
 * era os outros 31 %.
 *
 * E é essa fração que explica por que nada na cidade funcionava. Reflexo,
 * densidade de malha, tinta de vidro, modulação de matiz, chave por faixa,
 * extinção das coroas — TODAS são mudanças no termo da superfície, e o termo da
 * superfície é multiplicado por 0,31 antes de chegar ao pixel. Uma mudança de
 * 20 % numa delas vira 6 % na imagem, que é menos que o ruído do JPEG. Não eram
 * ideias ruins: nenhuma delas mexia no piso.
 *
 * COM `[16, 60]`, na faixa 0: névoa cai para 48 % do pixel e a cor própria sobe
 * para 52 %. E a separação entre faixas melhora em RAZÃO — era 16,4 / 26,9 /
 * 31,5 % (a de trás com 1,9× a da frente), passa a 7,7 / 17,0 / 21,1 % (2,7×).
 *
 * POR QUE NÃO ESCURECER `CIDADE` NO LUGAR: escurecer de `#5d6d8c` para
 * `#3c4657` divide a luminância do albedo por 2,52 e entrega 8,5 níveis de
 * escurecimento em 255 (3,3 % da imagem), ao custo de derrubar a cor própria de
 * 31 % para 15 %. Mexer na névoa dá o DOBRO do escurecimento (16 níveis) e ao
 * mesmo tempo SOBE a cor própria. Uma troca compra as duas coisas, a outra
 * troca uma pela outra — e foi a segunda que produziu o "sem cor" da primeira
 * vez. A conta está em `tests/unit/predio-luz.test.ts`.
 *
 * `perto` NÃO PODE DESCER ABAIXO DE 15,7. Os planos de parallax estão em
 * z −4,2 / −2,0 / 0 e a câmera corre de z 5,9 (parada num andar) a 11,5 (em
 * trânsito), então o plano de fundo chega no máximo a 15,7 m. O comentário
 * antigo da névoa dizia que ela "recua os planos de trás"; ela nunca os
 * alcançou. A névoa desta cena é, na prática, um efeito só da cidade — o que é
 * justamente o que torna estes dois números seguros de mexer.
 */
export const NEVOA = { perto: 16, longe: 60 } as const
