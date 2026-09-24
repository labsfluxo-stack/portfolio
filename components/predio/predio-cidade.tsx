'use client'
import { useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Coletor } from './predio-instancias'

/**
 * A CIDADE AO REDOR — a silhueta que enche o céu da cobertura.
 *
 * O PROBLEMA QUE ELA RESOLVE, e ele foi medido antes de virar código: no
 * primeiro quadro do site cerca de 40% da tela era céu vazio, e em retrato de
 * celular a proporção é a mesma. Eu tentei consertar com câmera e a conta não
 * fecha — a fração de céu é
 *
 *     (1 − tan θ / tan(fov/2)) / 2,      θ = atan(Δy / distância à parede)
 *
 * e com a câmera 1,6 m abaixo da laje e a parede do fundo a 17 m, θ vale 5,3°
 * contra 31° de meia-abertura. Fechar a lente de 62° para 40° move o céu de 42%
 * para 37%; baixar a câmera até o nível do deck move para 36%. Nenhum dos dois
 * resolve, e os dois estragam outra coisa (fechar a lente estreita a largura
 * visível, que em celular já é só ±2,8 m; aproximar a câmera foi testado e
 * deixou a tela com um pilar preto no meio e mais nada).
 *
 * Ou seja: o céu é ESTRUTURAL. Não se tira — enche-se.
 *
 * ONDE ELA CABE, e o intervalo é apertado: o plano do céu de `Ceu()` está em
 * z = −20,2 no mundo (local −16 dentro do grupo do fundo, que fica em −4,2), e a
 * parede do fundo do andar está em z = −11,4. A cidade tem de viver entre os
 * dois. Duas faixas, em −13,5 e −17,5.
 *
 * E ela só é visível ACIMA DE y = 0, que é o topo do prédio: abaixo disso a
 * parede da cobertura a esconde, e nos andares de baixo a parede daquele andar
 * faz o mesmo. Isso é oclusão de graça — nenhuma lógica por andar, nenhum
 * `andarAtivo` para threading. A cidade aparece na cobertura e some sozinha
 * quando a descida entra no prédio, que é exatamente o comportamento certo.
 *
 * MORA NO PLANO DA FRENTE, e isso é deliberado apesar de "cenário" soar como
 * coisa de plano de fundo. O plano da frente é o de parallax 1 — ou seja,
 * coordenada de MUNDO, grupo parado em y. Uma cidade a 20 m de distância já
 * produz o parallax certo sozinha, porque parallax é o que a perspectiva faz com
 * distância. Pôr a cidade num plano de parallax fabricado seria falsificar um
 * efeito que a geometria entrega de verdade, e ainda desalinhar a silhueta da
 * linha do horizonte durante a descida.
 */

/**
 * Ruído determinístico — e a determinação não é preciosismo.
 *
 * A regra da casa é zero `Math.random()`: a cena precisa ser IDÊNTICA a cada
 * carregamento, senão dois visitantes veem prédios diferentes e nenhuma captura
 * de tela é comparável com a próxima (foi assim que a maior parte dos defeitos
 * desta feature foi encontrada). Este é o hash de seno clássico de shader:
 * espalhado o bastante para não ter padrão visível, e igual em toda execução.
 */
function ruido(i: number, k: number): number {
  const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453
  return s - Math.floor(s)
}

/**
 * As fileiras, e a terceira entrou por PERSPECTIVA ATMOSFÉRICA.
 *
 * Com duas faixas da mesma cor, a cidade lia como um recorte de papel: dois
 * planos e um vazio atrás. O que dá distância a uma paisagem não é só o
 * tamanho — é o CONTRASTE CAINDO. Ar tem partícula, e a cada quilômetro ele
 * rouba um pouco de escuro e devolve um pouco da cor do céu. Um prédio a 3 km
 * não é um prédio pequeno: é um prédio PÁLIDO.
 *
 * `clareia` é a fração de cor do céu misturada à silhueta daquela faixa. A
 * névoa da cena já faz parte disso, mas ela satura rápido e é a mesma para
 * tudo; este número é o que separa as três camadas entre si.
 */
/**
 * TORRES CONTEMPORANEAS, e a proporcao e o primeiro sinal.
 *
 * A versao anterior tinha blocos de quarteirao: largos, baixos e com janela
 * recortada. E a silhueta de cidade do inicio do seculo XX. Torre moderna e o
 * contrario — ESBELTA e ALTA, porque estrutura de aco e elevador rapido
 * deixaram de exigir base larga. A razao altura/largura passou de cerca de 2
 * para perto de 4, e so isso ja muda a epoca que a linha do horizonte conta.
 */
/**
 * O TETO DE 7,5 m NAO E ESTETICA, E ENQUADRAMENTO — e ele foi medido.
 *
 * A primeira versao das torres subiu ate 10,5 m. Na profundidade da faixa da
 * frente (19,4 m da camera), um topo em 10,5 fica 12,1 m acima da linha da
 * camera, o que da tan = 0,624 contra 0,601 de meia-abertura: a torre SAI PELO
 * TOPO da tela. O render confirmou — o skyline comeu o ceu inteiro e o sol
 * sumiu atras dele.
 *
 * Com 7,5 o topo cai em y = 79 de uma tela de 720, e sobra ceu com o sol dentro.
 * A cidade existe para ENCHER o ceu, nao para substitui-lo.
 */
const FAIXAS = [
  { z: -13.5, n: 17, passo: 3.5, largura: [1.25, 2.35], topo: [2.0, 7.5], janelas: true, clareia: 0 },
  { z: -17.6, n: 21, passo: 2.9, largura: [1.05, 1.95], topo: [1.4, 6.0], janelas: true, clareia: 0.3 },
  { z: -19.4, n: 25, passo: 2.4, largura: [0.9, 1.7], topo: [0.5, 4.4], janelas: false, clareia: 0.58 },
] as const

/**
 * ═══ A FACHADA COMO TEXTURA, E ERA O QUE FALTAVA DESDE SEMPRE ═══
 *
 * Sete rodadas de ajuste — reflexo, malha, tinta de vidro, modulação de matiz,
 * base mais clara, coroamento, varanda — e o dono continuou dizendo "fraco".
 * Estava certo, e o motivo é simples de enunciar depois de encontrado: os
 * prédios eram CAIXAS DE COR CHAPADA. Nenhum mapa. Nenhum.
 *
 * A cobertura, a dez metros de distância, tem mapa de cor, de normal e de
 * rugosidade em concreto, pedra, madeira, corten e metal — e ainda microrrelevo
 * triplanar por cima. A cidade tinha `color:` e mais nada. Não havia como as
 * duas parecerem da mesma obra, e nenhum número que eu mexesse ia mudar isso,
 * porque o que faltava não era valor de parâmetro: era SUPERFÍCIE.
 *
 * ═══ O QUE ENTRA NESTE MAPA, E POR QUE CADA COISA ═══
 *
 * A escala manda. A 15 m de distância um poro de 6 mm não sobrevive à
 * reamostragem — foi por isso que eu recusei microrrelevo triplanar aqui, e
 * continua valendo. O que sobrevive são feições de DEZENAS DE CENTÍMETROS:
 *
 *  · JUNTA DE PAINEL — a linha entre duas placas de fachada, a cada ~90 cm na
 *    vertical e ~45 na horizontal. É a menor feição que ainda lê, e é ela que
 *    dá escala: sem junta não há como saber se a caixa tem 4 ou 40 andares.
 *  · FAIXA DE PEITORIL — a banda opaca à frente da laje, mais escura que o
 *    pano. Todo edifício envidraçado tem uma, e é o que impede a fachada de
 *    ler como espelho liso.
 *  · ESCORRIMENTO — o rastro vertical de sujeira que a chuva deixa abaixo de
 *    cada peitoril. É o detalhe mais desprezado e o que mais devolve
 *    realismo: fachada limpa demais é a assinatura de render.
 *  · MANCHA LARGA — variação lenta de tom ao longo da fachada, de envelhecimento
 *    desigual. Quebra a repetição da grade sem introduzir feição nova.
 *
 * ═══ E ELE É TAMBÉM O MAPA DE RUGOSIDADE ═══
 *
 * O mesmo desenho serve aos dois canais, e isso não é economia: é física. Onde
 * há junta, há sombra E aspereza; onde há escorrimento, o vidro deixa de
 * espelhar. Um mapa de cor sem o de rugosidade correspondente produz uma
 * superfície que muda de cor sem mudar de brilho, que o olho lê como decalque.
 */
function fachadaDeTorre(): { map: THREE.Texture; roughnessMap: THREE.Texture } {
  const n = 512
  const cv = document.createElement('canvas')
  cv.width = cv.height = n
  const a = cv.getContext('2d')!

  // Base clara: a cor real vem do material e da instância, e as duas
  // multiplicam. Um mapa escuro aqui escureceria todas as torres de uma vez —
  // é a mesma armadilha que fez a borda da piscina sumir no terraço.
  a.fillStyle = '#c9c9c9'
  a.fillRect(0, 0, n, n)

  // MANCHA LARGA. Elipses enormes e quase transparentes: variação de tom que o
  // olho não localiza, só percebe como "não é uniforme".
  for (let i = 0; i < 14; i++) {
    const s = Math.sin(i * 12.9898) * 43758.5453
    const r = s - Math.floor(s)
    const s2 = Math.sin(i * 78.233) * 43758.5453
    const r2 = s2 - Math.floor(s2)
    a.fillStyle = `rgba(${r > 0.5 ? 150 : 205},${r > 0.5 ? 150 : 205},${r > 0.5 ? 155 : 200},0.10)`
    a.beginPath()
    a.ellipse(r * n, r2 * n, 60 + r * 140, 50 + r2 * 120, r * 3, 0, Math.PI * 2)
    a.fill()
  }

  // A GRADE DE PAINEL. 12 colunas e 8 linhas no ladrilho — com o ladrilho
  // cobrindo cerca de 5 m de fachada, dá placa de ~42 cm na largura e ~62 na
  // altura, que é a modulação real de pele de vidro.
  a.strokeStyle = 'rgba(78,82,92,0.85)'
  a.lineWidth = 9
  for (let c = 0; c <= 6; c++) {
    a.beginPath()
    a.moveTo((c * n) / 6, 0)
    a.lineTo((c * n) / 6, n)
    a.stroke()
  }

  for (let l = 0; l < 4; l++) {
    const y = (l * n) / 4
    // FAIXA DE PEITORIL: a banda opaca na frente da laje. Um quarto da altura
    // do pavimento, que é a proporção corrente.
    a.fillStyle = 'rgba(74,78,88,0.62)'
    a.fillRect(0, y, n, n / 4 / 3.2)
    // A junta horizontal, mais marcada que a vertical porque a laje é a
    // descontinuidade estrutural da fachada.
    a.strokeStyle = 'rgba(58,62,70,0.92)'
    a.lineWidth = 12
    a.beginPath()
    a.moveTo(0, y)
    a.lineTo(n, y)
    a.stroke()

    /**
     * O ESCORRIMENTO, e ele nasce SOB o peitoril e desce.
     *
     * Chuva bate na fachada, corre até a saliência, acumula sujeira na aresta
     * inferior e escorre dali para baixo em rastros irregulares. É por isso que
     * o rastro sempre começa numa linha horizontal e afina conforme desce —
     * desenhar a mancha centrada no pano seria o mesmo erro de forma que os
     * fachos elípticos do terraço tiveram.
     */
    for (let e = 0; e < 9; e++) {
      const s = Math.sin((l * 9 + e) * 12.9898 + 4.1) * 43758.5453
      const r = s - Math.floor(s)
      if (r < 0.45) continue
      const x = r * n
      const comp = (n / 4) * (0.3 + r * 0.6)
      const g = a.createLinearGradient(0, y + 3, 0, y + 3 + comp)
      g.addColorStop(0, 'rgba(72,76,84,0.34)')
      g.addColorStop(1, 'rgba(72,76,84,0)')
      a.fillStyle = g
      a.fillRect(x, y + 10, 6 + r * 16, comp)
    }
  }

  const map = new THREE.CanvasTexture(cv)
  map.wrapS = map.wrapT = THREE.RepeatWrapping
  map.colorSpace = THREE.SRGBColorSpace
  map.anisotropy = 8

  // O MESMO DESENHO NO CANAL DE RUGOSIDADE, e sem espaço de cor: canal de
  // dado, não de cor. Marcar `SRGBColorSpace` num mapa de rugosidade aplica
  // uma curva de gama a um número que não é cor, e o resultado é uma
  // superfície brilhante demais nas partes médias.
  const rug = new THREE.CanvasTexture(cv)
  rug.wrapS = rug.wrapT = THREE.RepeatWrapping
  rug.anisotropy = 8

  return { map, roughnessMap: rug }
}

export function Cidade({ cor, corDistante, ceu }: { cor: string; corDistante: string; ceu: string }) {
  const { scene } = useThree()

  const malhas = useMemo(() => {
    const col = new Coletor()

    // Cada prédio desce até −7: bem abaixo de y = 0, onde a parede do andar o
    // corta. Assim nenhuma silhueta tem "pé" visível flutuando no ar.
    const BASE = -7

    // Um material por faixa, cada um com a silhueta ja misturada com a cor do
    // ceu na fracao de `clareia`. E a mesma conta que o ar faz: distancia rouba
    // contraste e devolve a cor do horizonte.
    const corDoCeu = new THREE.Color(ceu)
    const materiais = FAIXAS.map((faixa, f) => {
      const base = new THREE.Color(f === 0 ? cor : corDistante)
      /**
       * VIDRO, NAO ALVENARIA. A fachada deixa de ser fosca e opaca e passa a
       * ter reflexo: rugosidade baixa e metalidade media fazem a torre devolver
       * o ceu, e torre que devolve o ceu e a definicao visual de predio
       * contemporaneo. Alvenaria absorve; cortina de vidro ESPELHA.
       *
       * A cor tambem esfria: a paleta velha era marrom de tijolo. Vidro de
       * fachada e azul-acinzentado, e ao crepusculo ele puxa para o azul do
       * zenite que esta refletindo.
       */
      /**
       * MESMA CORREÇÃO DO VIDRO, pela mesma razão: metalidade 0,45 com ambiente
       * 1,2 fazia a estrutura da torre devolver o âmbar do céu e ler como
       * tijolo. Ela é a peça OPACA do conjunto — montante, aleta, platibanda,
       * empena — e opaco sob céu quente tem de ficar mais escuro que o vidro ao
       * lado, não mais claro. É o contraste entre os dois que desenha a fachada.
       */
      /**
       * ═══ E AGORA COM MAPA ═══
       *
       * A repetição é FIXA e não derivada do tamanho de cada prédio, e isso é
       * uma limitação assumida do instanciamento: todos os corpos compartilham
       * uma geometria unitária escalada por matriz, então compartilham as UVs.
       * Uma torre estreita recebe a mesma contagem de painéis que uma larga, e
       * os painéis dela saem proporcionalmente maiores.
       *
       * A 15 m isso não se percebe — variação de 30 % no tamanho de uma placa
       * de 40 cm é invisível —, e a alternativa seria uma geometria por prédio,
       * que troca uma chamada de desenho por dezessete. O ganho de textura não
       * vale esse preço, e a limitação fica escrita para quem for mexer.
       *
       * 2 × 4: a fachada típica tem uns 2,6 m de largura visível e 6 m de
       * altura, então o ladrilho cobre cerca de 1,3 m na horizontal e 1,5 na
       * vertical — e dentro dele há 12 colunas e 8 linhas de painel.
       */
      const pele = fachadaDeTorre()
      pele.map.repeat.set(1, 2)
      pele.roughnessMap.repeat.set(1, 2)
      return new THREE.MeshStandardMaterial({
        color: base.lerp(corDoCeu, faixa.clareia),
        roughness: 0.42 + faixa.clareia * 0.4,
        metalness: 0.3,
        envMapIntensity: 0.8,
        map: pele.map,
        roughnessMap: pele.roughnessMap,
      })
    })
    /**
     * As janelas acesas são `MeshBasicMaterial`, e não emissivas.
     *
     * Emissivo no three.js não ilumina nada — brilha para a câmera e só. Como
     * aqui o efeito desejado É só brilhar para a câmera (vidro devolvendo o sol
     * rasante a 20 m de distância), o material básico faz o mesmo trabalho sem
     * passar pelo cálculo de iluminação. `fog` fica LIGADO de propósito: janela
     * que não embaça junto com o prédio dela salta para a frente e desfaz a
     * profundidade que a névoa acabou de construir.
     */
    /**
     * ═══ A JANELA GANHA FAIXA DINÂMICA, E NÃO UM GANHO UNIFORME ═══
     *
     * O DIAGNÓSTICO QUE EU MESMO DEI ESTAVA MEIO ERRADO. Eu disse "as janelas
     * ficaram sem headroom, um ganho de ~1,25 resolve". A conta desmente a
     * segunda metade: `#e3c79c` em linear tem luminância 0,596, e o limiar do
     * brilho é 1,15. Seria preciso ganho 1,93 só para a janela ENCOSTAR no
     * limiar; 1,25 não chegaria nem perto, e a mudança seria invisível.
     *
     * E SUBIR TODAS ELAS ATÉ LÁ SERIA PIOR. Estas janelas estão a 20 m, não a
     * quilômetros — são vidro devolvendo o sol rasante, não lâmpada distante.
     * Ninguém vê halo em volta de uma janela a 20 m. Centenas delas acima do
     * limiar produziriam exatamente a névoa sobre o skyline que fez o limiar
     * subir para 0,88 e depois 1,15.
     *
     * O QUE DE FATO FALTAVA É VARIAÇÃO. Toda janela acesa tinha o mesmo valor —
     * e valor único é o tell. Num skyline de verdade algumas poucas estouram
     * (uma luminária encostada no vidro, uma sala com o teto todo aceso) e a
     * grande maioria fica bem abaixo. É um HISTOGRAMA, não um nível.
     *
     * Então o headroom entra como FAIXA: cerca de uma em seis cruza o limiar e
     * ganha halo; o resto vive entre 0,82 e 1,34 de ganho, abaixo dele. O
     * resultado é um casario que cintila em pontos em vez de acender em bloco.
     *
     * E ISSO SÓ FICOU SEGURO AGORA. O comentário antigo aqui registrava que o
     * valor tinha descido de `#ffeccd` para `#e3c79c` porque branco-creme puro a
     * 20 m ficava mais claro que qualquer coisa do terraço, inclusive o nicho do
     * bar — que deve ser a peça mais quente do quadro. Isso era verdade quando
     * nada na cena passava de 1,0. Hoje o balizador está em 2,2 de luminância e
     * o pendente em 2,5: o terraço subiu, e a janela mais estourada do casario
     * (2,65 de ganho, 1,58 de luminância) continua abaixo dos dois.
     */
    const brilhoDeJanela = (ganho: number) => new THREE.Color('#e3c79c').multiplyScalar(ganho)
    // Branco no material porque a cor vem da INSTÂNCIA e as duas se multiplicam.
    const mJanela = new THREE.MeshBasicMaterial({ color: '#ffffff' })
    // Janela APAGADA nao e um buraco preto: e vidro refletindo o ceu de fim de
    // tarde, entao ela e mais CLARA que a fachada e levemente azulada. Pintar de
    // preto e o erro que faz predio distante parecer queimado.
    /**
     * ═══ O VIDRO ESTAVA LENDO COMO ALVENARIA, E A CULPA É DO REFLEXO ═══
     *
     * Os números anteriores — metalidade 0,62 com `envMapIntensity` 1,5 — dizem
     * que quase dois terços do que se vê nessa superfície é o AMBIENTE
     * refletido, amplificado meia vez. E o ambiente desta cena é um céu de hora
     * dourada: âmbar.
     *
     * Resultado: a base azul-acinzentada `#5c6a7e` nunca chegava à tela. Todas
     * as torres saíam marrons, e o dono descreveu a cidade inteira pedindo
     * "prédios de vidro" — sem saber que o material JÁ era vidro, só que
     * afogado no próprio reflexo.
     *
     * É fisicamente defensável: vidro de fachada ao entardecer reflete mesmo o
     * quente. Só que num ambiente de mapa ÚNICO o reflexo é a média da abóbada
     * inteira, e não há a parte fria — a fachada vertical de uma torre real
     * devolve sobretudo o zênite, que continua azul enquanto o horizonte já
     * queimou. O mapa único não sabe fazer essa distinção, então quem tem de
     * fazê-la é a cor de base.
     *
     * Metalidade 0,40 e ambiente 0,85: o reflexo continua existindo, e é ele que
     * separa vidro de concreto, mas para de ser a cor DOMINANTE. E a base
     * escureceu e esfriou para `#3e4c64`, porque vidro de torre visto de fora é
     * escuro — o que se vê é o céu refletido sobre um interior apagado.
     */
    /**
     * ═══ CADA TORRE GANHA O SEU VIDRO, E ISSO É O QUE FALTAVA DE VERDADE ═══
     *
     * O dono disse que a cidade "não parece da mesma arte da cobertura". Eu
     * tentei microrrelevo triplanar primeiro — e teria sido um erro que o
     * próprio comentário de `comDetalhe` já documenta: a 4 ladrilhos por metro
     * o poro vale 6 mm, e a 15 metros de distância 6 mm não sobrevivem à
     * reamostragem para pixel. Mapa de textura não chega lá.
     *
     * O que a cobertura tem e a cidade não é VARIEDADE DE MATERIAL. Em cinco
     * metros de terraço há madeira, pedra, corten, aço escovado, inox, vidro,
     * folhagem e concreto — oito superfícies que se distinguem à primeira
     * olhada. A cidade inteira eram três materiais, um por faixa de
     * profundidade, e por isso lia como uma coisa só repetida dezessete vezes.
     *
     * Skyline de verdade é o contrário: cada torre foi projetada por alguém
     * diferente, num ano diferente, com o vidro que estava na moda. Bronze dos
     * anos oitenta ao lado de azul-aço dos dois mil ao lado de fumê recente.
     * Essa colcha de retalhos É a arte da coisa.
     *
     * Seis tintas, sorteadas por prédio. A cor vai por INSTÂNCIA e o material
     * fica branco, porque as duas se multiplicam — então continua sendo uma
     * malha instanciada só, e a variedade não custa chamada de desenho nenhuma.
     */
    const mVidroEscuro = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.16,
      metalness: 0.4,
      envMapIntensity: 0.85,
    })
    // Luz de obstaculo aereo: o ponto vermelho obrigatorio no topo de qualquer
    // estrutura alta. E minusculo, e e um dos sinais mais especificos de
    // skyline moderna — nenhum predio de alvenaria antigo tem um.
    const mLuzAerea = new THREE.MeshBasicMaterial({ color: '#ff3b30' })
    /**
     * ═══ A COROA, E ELA É A RESPOSTA A "NÃO PARECE DA MESMA ARTE" ═══
     *
     * O dono comparou a cidade com a cobertura e a cobertura ganhou. Está certo,
     * e o motivo não é vidro nem cor: é ACABAMENTO. O terraço é feito de peças
     * que existem só para terminar outra peça — o rufo sobre a platibanda, o
     * rodapé na topeira do deck, a testeira do balcão, o batente da porta, a
     * junta entre as pedras. É isso que faz uma superfície parecer construída em
     * vez de extrudada.
     *
     * A cidade não tinha nenhuma. Toda torre terminava no ar: a caixa subia e
     * acabava, com uma antena espetada em cima. Prédio nenhum acaba assim —
     * todos têm coroamento, porque a laje de cobertura precisa de platibanda e
     * a platibanda precisa de arremate.
     *
     * Três peças, e as três são o mesmo gesto do terraço em outra escala:
     *
     *  · NEGATIVO — a faixa escura recuada logo abaixo do topo. É a sombra de
     *    um recuo de 20 cm, e é ela que separa o corpo do coroamento. Sem
     *    negativo, qualquer arremate lê como listra pintada.
     *  · COROA — a faixa acesa. Toda torre contemporânea tem iluminação de
     *    coroamento, e à noite ela é a assinatura do prédio no skyline. É
     *    também o que dá VERTICAL ao conjunto sem acender fachada.
     *  · TESTEIRA — a moldura que avança 6 % além do corpo e fecha o topo. É o
     *    mesmo rufo da platibanda da cobertura: aba que sobra para a água cair
     *    fora, e que de longe vira a linha que define a silhueta.
     *
     * BRANCO-FRIO CONTRA O ÂMBAR DE TUDO. As janelas são creme quente porque são
     * interiores; coroamento é luz ARQUITETURAL, de projetor, e sempre mais fria.
     * É a mesma distinção que separa o display do elevador da luminária da
     * recepção lá no terraço — e é ela que impede a coroa de virar mais uma
     * janela grande.
     *
     * Ganho 1,5 pela regra de área: a faixa é fina e a torre é longe, então ela
     * aguenta cruzar o limiar do brilho e ganhar halo. É exatamente o que uma
     * luz de coroamento faz na neblina de uma cidade.
     */
    /**
     * As seis tintas de vidro — ver `mVidroEscuro`. Escuras todas, porque vidro
     * de fachada visto de fora é escuro: o que se enxerga é o céu refletido
     * sobre um interior apagado. O que varia entre elas é o MATIZ, que é o que
     * diz a década em que a torre foi construída.
     */
    /**
     * Moduladores de matiz do CORPO — ver o bloco no corpo do predio. Giram em
     * torno de 1 para deslocar a cor sem mexer no brilho: assim a perspectiva
     * atmosferica de  continua valendo em cima deles.
     */
    const MODULACAO = [
      new THREE.Color(1.18, 1.06, 0.86), // bronze quente
      new THREE.Color(0.8, 0.94, 1.3), // azul-aco frio
      new THREE.Color(0.86, 1.14, 1.06), // verde-agua
      new THREE.Color(1.24, 0.98, 0.88), // terracota
      new THREE.Color(0.94, 0.88, 1.22), // violeta-aco
      new THREE.Color(1.06, 1.06, 1.08), // neutro claro
    ]
    const TINTAS_DE_VIDRO = [
      '#2b3647', // azul-aço, o mais comum
      '#3a3529', // bronze, anos oitenta
      '#2a3a36', // verde-esmeralda, anos noventa
      '#32323a', // fumê neutro
      '#243347', // azul profundo
      '#3b3730', // champanhe escuro
    ].map((c) => new THREE.Color(c))
    const mCoroa = new THREE.MeshBasicMaterial({
      // Branco no material: a COR vem da instancia, e as duas se multiplicam.
      // Ver TINTAS_DE_COROA.
      // 1,6 e nao 2,6. Em 2,6 o bloom transformava cada linha num halo gordo, e
      // o que a referencia mostra e LINHA NITIDA — luz de projetor rasante numa
      // fachada, nao tubo fluorescente. Acender demais uma peca apaga o desenho
      // dela: e a mesma licao do nicho do bar, cometida de novo.
      color: new THREE.Color('#ffffff').multiplyScalar(1.12),
      toneMapped: false,
      // ═══ SEM NEVOA, E E ISSO QUE FAZ A COR EXISTIR ═══
      //
      // A janela acesa mantem  LIGADO de proposito — o comentario dela
      // explica: janela que nao embaca junto com o predio salta para a frente e
      // desfaz a profundidade. Iluminacao ARQUITETURAL e o caso oposto.
      //
      // A nevoa desta cena corre de 13 a 52 m com cor ambar, e a cidade esta a
      // 19-25: isso poe ate 31 por cento de laranja puro sobre cada pixel dela.
      // Magenta com 31 por cento de laranja por cima nao e magenta — e o que
      // vinha acontecendo, e a razao de as coroas coloridas das entregas
      // anteriores terem saido todas do mesmo bege.
      //
      // Projetor de fachada nao e superficie iluminada: e FONTE. Fonte atravessa
      // a nevoa em vez de ser tingida por ela, que e por que um letreiro de neon
      // continua vermelho na garoa. Desligar a nevoa aqui e o modelo certo, nao
      // um truque para salvar a cor.
      fog: false,
    })
    /**
     * ═══ AS COROAS COLORIDAS, DAS REFERENCIAS QUE O DONO MANDOU ═══
     *
     * Cinco imagens de skyline, e a assinatura mais forte das tres noturnas e a
     * mesma: ILUMINACAO ARQUITETURAL COLORIDA. Nao e a janela que da cor aquelas
     * cidades — janela e sempre creme —, e o projetor no coroamento, e ele e
     * ciano, magenta, ambar, verde. E o que diz "esta torre foi projetada para
     * ser vista de noite", que e exatamente a diferenca entre as referencias e o
     * que a nossa cidade vinha sendo.
     *
     * SATURACAO CONTIDA, e essa e a concessao a cena: as referencias sao NOITE
     * FECHADA e o nosso quadro e hora dourada. Magenta puro sobre ceu ambar
     * brigaria com a paleta inteira do terraco. Estas tintas ficam a meio
     * caminho do branco — leem como cor, nao como neon.
     */
    const TINTAS_DE_COROA = [
      // ═══ TEMPERATURA DE COR, E NAO COR ═══
      //
      // Eu tinha amostrado rosa-magenta, vermelho e violeta da foto de Pudong.
      // O dono chamou de fantasioso, e esta certo: aquela orla e uma vitrine
      // turistica, um dos poucos lugares do mundo onde predio inteiro e pintado
      // de neon. Nao e o que uma cidade normal faz, nem o que este terraco
      // deveria estar vendo pela janela.
      //
      // Iluminacao de fachada de verdade se mede em KELVIN, nao em matiz. O
      // projetor e branco; o que varia e a temperatura dele, e a variedade de um
      // skyline real vem de predios vizinhos terem escolhido temperaturas
      // diferentes — um com halogena velha de 2700 K, o vizinho com LED de 5000.
      // E essa diferenca que se ve, e ela e sutil de proposito.
      //
      // Os dois unicos acentos que sobrevivem sao os que predio real usa mesmo:
      // ambar de sodio, que ainda existe em coroamento antigo, e um azul
      // dessaturado, que e o tique da torre corporativa dos anos dois mil.
      new THREE.Color('#ffd9ae'), // 2700 K — halogena quente
      new THREE.Color('#ffe9d2'), // 3000 K — o mais comum em coroamento
      new THREE.Color('#fff4e8'), // 4000 K — LED neutro
      new THREE.Color('#eef4ff'), // 5500 K — LED frio, torre nova
      new THREE.Color('#ffc98a'), // ambar de sodio
      new THREE.Color('#b9d0ee'), // azul dessaturado, tique corporativo
    ]

    const gCubo = new THREE.BoxGeometry(1, 1, 1)
    /**
     * A FRAÇÃO DE VIDRO ERA A COISA ERRADA, e não o vocabulário.
     *
     * O módulo já falava a língua certa — fita corrida, montante, peitoril,
     * platibanda, recuo no topo, luz de obstáculo. E o render continuava lendo
     * como prédio de janela furada dos anos 70. A causa estava num número: a
     * fita tinha 0,30 m num pé-direito de 0,95, ou seja 32% de vidro e 68% de
     * peitoril.
     *
     * Trinta e dois por cento É a proporção de fachada de alvenaria. Cortina de
     * vidro contemporânea fica entre 65% e 75% — o peitoril vira uma faixa
     * estreita que mal esconde a laje, e o que o olho vê de longe é uma pele de
     * vidro contínua com linhas horizontais finas.
     *
     * Escrever "fita corrida" no código e deixar 32% é o tipo de erro que
     * sobrevive a qualquer leitura: o nome da variável concorda com a intenção e
     * o valor concorda com o oposto dela.
     */
    const PE_DIREITO_CIDADE = 0.74
    const gFitaVidro = new THREE.BoxGeometry(1, 0.66, 0.05)
    // O TRECHO ACESO acompanha. Ele tinha 0,34 x 0,26 — um retangulinho no meio
    // da fita, que e exatamente o desenho de uma janela. Em planta livre quem
    // acende e um VAO INTEIRO entre dois montantes, de laje a laje.
    /**
     * ═══ O PANO ENCOLHEU, E É A ESCALA DA MALHA QUE DIZ A IDADE DO PRÉDIO ═══
     *
     * Era 0,40 × 0,58 num vão de 0,50 m. Quarenta centímetros de vidro aceso
     * num vão de cinquenta é uma JANELA — buraco recortado numa parede, com
     * peitoril e verga, que é o desenho de prédio residencial.
     *
     * Cortina de vidro é outra coisa: o pano é modulado em peças estreitas e
     * repetidas, e a malha inteira cobre a fachada. O olho não conta os
     * módulos — ele lê a FREQUÊNCIA deles, e frequência alta é o que separa
     * torre contemporânea de bloco dos anos setenta. Foi o que o dono viu ao
     * pedir "prédios modernos com vidro" para uma cidade que já era de vidro.
     *
     * 0,26 num vão de 0,34: metade da largura de antes, e a mesma proporção de
     * cheio para vazio. São umas 50 % mais peças por fachada, todas na mesma
     * chave de instância — a conta de chamadas de desenho não muda.
     */
    const gTrechoAceso = new THREE.BoxGeometry(0.26, 0.5, 0.06)
    const gMontanteFachada = new THREE.BoxGeometry(0.05, 1, 0.06)
    // ALETA VERTICAL: o brise que corre a fachada inteira de baixo a cima, sem
    // interrupcao por andar. E o segundo vocabulario contemporaneo, e o que
    // diferencia uma torre de escritorio de uma de apartamento — a primeira nao
    // tem laje aparente na fachada, tem pele lisa com aleta.
    const gAleta = new THREE.BoxGeometry(0.07, 1, 0.14)
    const gLuzAerea = new THREE.BoxGeometry(0.1, 0.1, 0.1)
    const gAntena = new THREE.BoxGeometry(0.17, 2.0, 0.17)
    const gCaixa = new THREE.BoxGeometry(1.2, 0.6, 1.2)
    const gPlatibanda = new THREE.BoxGeometry(1, 0.26, 1)
    const gFaixaLaje = new THREE.BoxGeometry(1, 0.09, 1)
    const gArCondicionado = new THREE.BoxGeometry(0.62, 0.36, 0.5)

    FAIXAS.forEach((faixa, f) => {
      const material = materiais[f]!
      const inicio = -(faixa.n - 1) * faixa.passo * 0.5
      for (let i = 0; i < faixa.n; i++) {
        // Deslocamento lateral próprio: fileira em passo exato lê como pente.
        const x = inicio + i * faixa.passo + (ruido(i, f * 3 + 1) - 0.5) * faixa.passo * 0.5
        /**
         * DOIS TIPOS DE TORRE, e é a variedade que faltava.
         *
         * Toda a cidade era a mesma fachada: fita horizontal com peitoril, em
         * prédios de proporção parecida. Skyline real tem pelo menos duas
         * famílias convivendo, e elas são distinguíveis a 20 m:
         *
         *  - LAMINADA (tipo 0): laje aparente na fachada, faixa horizontal a cada
         *    pé-direito. É o desenho de torre residencial e de escritório dos
         *    anos 90 para cá, e o que dá ESCALA — sem essa repetição não há como
         *    saber se a caixa tem quatro andares ou quarenta.
         *
         *  - PELE LISA (tipo 1): sem laje aparente, vidro de baixo a cima cortado
         *    só por aletas verticais que correm a fachada inteira. É a torre de
         *    escritório contemporânea, e ela é mais ALTA e mais ESTREITA — 25% a
         *    mais de altura e 20% a menos de largura, que é a proporção que o
         *    olho associa a "torre nova".
         *
         * Um terço delas é do tipo 1: o suficiente para a linha do horizonte ter
         * duas vozes, pouco o bastante para nenhuma virar padrão.
         */
        /**
         * A PRIMEIRA FAIXA VIRA MAJORITARIAMENTE TORRE NOVA, e é o que o dono
         * pediu ao falar em "prédios principais".
         *
         * Um terço de pele lisa em TODAS as faixas era a regra antiga, e ela
         * tratava as três como se fossem a mesma cidade. Não são: a faixa 0 está
         * a 13,5 m e é a única em que se distingue montante de aleta; as outras
         * duas já estão no regime de silhueta, onde a diferença entre as duas
         * famílias não chega à tela de qualquer jeito.
         *
         * Então o investimento vai onde é visto: 55 % de pele lisa na primeira
         * faixa, o terço de antes nas de trás. As torres esbeltas e envidraçadas
         * passam a dominar a linha que o visitante realmente lê, e o casario
         * laminado continua atrás dando profundidade — sem ele a cidade viraria
         * um pente de lâminas iguais, que é o defeito oposto.
         */
        const peleLisa = ruido(i, f * 3 + 9) > (f === 0 ? 0.45 : 0.66)
        const larg =
          (faixa.largura[0] + ruido(i, f * 3 + 2) * (faixa.largura[1] - faixa.largura[0])) *
          (peleLisa ? 0.78 : 1)
        // O teto de 7,5 continua valendo, e ele foi MEDIDO: acima disso a silhueta
        // sai pelo topo do quadro. A torre esbelta ganha altura dentro do teto,
        // nunca além dele.
        const topo = Math.min(
          7.5,
          (faixa.topo[0] + ruido(i, f * 3 + 3) * (faixa.topo[1] - faixa.topo[0])) *
            (peleLisa ? 1.28 : 1),
        )
        const prof = (1.6 + ruido(i, f * 3 + 4) * 1.4) * (peleLisa ? 0.82 : 1)
        // A tinta de vidro desta torre. Semente PROPRIA, sem relacao com a que
        // decide tipo, largura ou altura: se viessem do mesmo numero, cor e
        // forma andariam juntas e a cidade ganharia padrao no lugar de variedade.
        const tintaDoVidro =
          TINTAS_DE_VIDRO[
            Math.floor(ruido(i, f * 3 + 17) * TINTAS_DE_VIDRO.length) % TINTAS_DE_VIDRO.length
          ]!
        const alturaCaixa = topo - BASE
        const z = faixa.z + (ruido(i, f * 3 + 5) - 0.5) * 1.2

        /**
         * UM CUBO UNITÁRIO ESCALADO, e não uma `BoxGeometry` por prédio.
         *
         * Escrevi a primeira versão passando `new THREE.BoxGeometry(larg,
         * alturaCaixa, prof)` a cada volta, sob a mesma chave `predio-0`. O
         * `Coletor` guarda a geometria da PRIMEIRA chamada de cada chave e
         * ignora as seguintes — é o que permite instanciar —, então os 23
         * prédios saíam todos do tamanho do primeiro. A matriz só levava a
         * posição.
         *
         * O defeito não apareceu como "prédios iguais", porque o centro em y
         * variava e a linha do topo continuava irregular. Apareceu como ANTENA
         * SOLTA NO CÉU: o mastro era posicionado pelo `topo` de verdade e o
         * prédio terminava na altura do prédio zero, abrindo um vão entre os
         * dois. Eu cacei esse vão por três medições antes de olhar para a causa.
         *
         * Escala na matriz é exatamente o que a instância existe para carregar:
         * um cubo, 50 prédios de tamanhos diferentes, uma chamada de desenho.
         */
        /**
         * ═══ O CORPO É A SUPERFÍCIE QUE SE VÊ, E ERA A ÚNICA SEM VARIAÇÃO ═══
         *
         * Eu tinha acabado de dar seis tintas de vidro às torres e o render não
         * mudou NADA. A razão, olhando: as fitas de vidro são estreitas e ficam
         * atrás dos trechos acesos — o que ocupa quase toda a área aparente de
         * cada prédio é este cubo. Tingir o vidro era tingir o que não se vê.
         *
         * É o terceiro erro do mesmo tipo nesta rodada: mexi no reflexo, depois
         * na malha, depois no vidro, e nenhum deles era a superfície dominante.
         * Quando uma mudança "não muda quase nada", a pergunta certa não é
         * quanto aumentar — é se ela está caindo onde o olho olha.
         *
         * `MODULACAO` é multiplicativa e gira em torno de 1, então ela DESLOCA O
         * MATIZ sem mexer no brilho nem na perspectiva atmosférica: a mistura
         * com a cor do céu que `clareia` faz continua valendo, e uma torre de
         * fundo continua tão pálida quanto era. O que muda é que as dezessete
         * deixam de ser cópias da mesma tinta.
         */
        const mod =
          MODULACAO[Math.floor(ruido(i, f * 3 + 23) * MODULACAO.length) % MODULACAO.length]!
        col.poe(
          `predio-${f}`,
          gCubo,
          material,
          [x, BASE + alturaCaixa / 2, z],
          [0, 0, 0],
          [larg, alturaCaixa, prof],
          mod,
        )

        // Coroamento: caixa d'água nos médios, antena nos altos. É o que a
        // silhueta de uma cidade tem de irregular no topo — fileira de caixas
        // lisas lê como gráfico de barras.
        //
        // A ANTENA AFUNDA 0,65 m DENTRO do prédio (2,0 m de altura centrada em
        // `topo + 0,35`) em vez de encostar nele. Encostando, o mastro de um
        // prédio parcialmente tapado por outro da fileira da frente aparece com
        // um vão entre a base dele e a silhueta visível, e lê como risco solto
        // no céu — foi o que o render mostrou. Afundada, a sobreposição cobre
        // qualquer oclusão parcial, e o trecho enterrado não custa pixel.
        if (topo > 5.2) col.poe('antena', gAntena, material, [x, topo + 0.35, z])
        else if (topo > 3.0 && ruido(i, f * 3 + 6) > 0.45)
          col.poe('caixa', gCaixa, material, [x, topo + 0.3, z])

        if (!faixa.janelas) continue

        /**
         * O QUE FAZ UMA CAIXA VIRAR UM PRÉDIO, e nenhum dos três é a janela.
         *
         * A PLATIBANDA. Toda laje de cobertura termina numa mureta que sobe
         * acima do telhado, para esconder a impermeabilização e as máquinas. Ela
         * é sempre um pouco MAIS LARGA que a fachada, e é essa saliência de dez
         * centímetros que corta a silhueta com uma linha horizontal no topo.
         * Sem ela, a caixa termina no ar e lê como bloco.
         *
         * A LINHA DE LAJE. Prédio tem andar, e o andar aparece na fachada como
         * uma faixa horizontal a cada pé-direito — viga aparente, testeira de
         * varanda, mudança de material. É o que dá ESCALA: sem essa repetição
         * horizontal não há como saber se a caixa tem quatro andares ou quarenta.
         *
         * O AR-CONDICIONADO NA COBERTURA. Nenhuma laje de cidade está limpa. São
         * duas caixas cinza fora de alinhamento, e é justamente o desalinho que
         * diz "isto foi instalado por alguém depois que o prédio ficou pronto".
         */
        col.poe(
          'platibanda',
          gPlatibanda,
          material,
          [x, topo + 0.13, z],
          [0, 0, 0],
          [larg + 0.16, 1, prof + 0.16],
        )
        const andares = Math.max(1, Math.floor((topo - BASE - 0.6) / PE_DIREITO_CIDADE))
        // A laje aparente só existe na torre LAMINADA. Na de pele lisa ela é
        // justamente o que não há: o vidro corre de baixo a cima e quem corta a
        // fachada é a aleta vertical.
        if (!peleLisa)
          for (let l = 0; l < andares; l++)
            col.poe(
              'faixaLaje',
              gFaixaLaje,
              material,
              [x, topo - PE_DIREITO_CIDADE * (l + 1), z],
              [0, 0, 0],
              [larg + 0.07, 1, prof + 0.07],
            )
        if (topo > 2.4)
          for (let m = 0; m < 2; m++)
            col.poe('ar', gArCondicionado, material, [
              x + (ruido(i * 5 + m, 71) - 0.5) * larg * 0.6,
              topo + 0.44,
              z + (ruido(i * 5 + m, 72) - 0.5) * prof * 0.5,
            ])

        /**
         * A FITA CORRIDA SUBSTITUI A JANELA, e esta é A diferença entre fachada
         * antiga e contemporânea — não é proporção, é LÓGICA.
         *
         * Prédio de alvenaria tem JANELA: um buraco recortado num muro que
         * sustenta o próprio peso. O buraco é pequeno e cercado de parede por
         * todos os lados, porque a parede está trabalhando.
         *
         * Prédio moderno não tem muro estrutural: a estrutura é o esqueleto
         * interno e a pele é PENDURADA nele. Liberada de sustentar, essa pele
         * vira vidro corrido de laje a laje, interrompido só pelos montantes do
         * caixilho. O que separa um andar do outro deixa de ser parede e vira
         * uma faixa estreita de peitoril.
         *
         * Ou seja, o desenho inverte: em vez de pontuar vidro sobre massa,
         * corre-se vidro e pontua-se massa. Só mudar o tamanho da janela não
         * teria chegado aqui.
         *
         * E a luz acesa passa a ser um TRECHO da fita, não uma janela inteira:
         * em planta livre quem acende é uma área, não um cômodo.
         */
        /**
         * O COROAMENTO — ver `mCoroa` para o porquê das três peças.
         *
         * SÓ ACIMA DE 4,2 m, e o corte não é arbitrário: coroamento iluminado é
         * coisa de torre, não de prédio de quatro andares. Pôr em todos daria a
         * uma cidade inteira a mesma assinatura, que é o contrário do que uma
         * assinatura faz. Cerca de um terço das silhuetas passa do corte, e são
         * justamente as que o olho usa para ler a linha do horizonte.
         *
         * Tudo derivado de `larg` e `prof`: a testeira avança 6 %, o negativo
         * recua 2 %. Nenhum literal em metro — torre estreita ganha coroamento
         * estreito.
         */
        if (topo > 4.2) {
          col.poe(
            'coroa',
            gFaixaLaje,
            mCoroa,
            [x, topo - 0.31, z],
            [0, 0, 0],
            [larg * 1.03, 0.7, prof * 1.03],
            TINTAS_DE_COROA[
              Math.floor(ruido(i, f * 3 + 37) * TINTAS_DE_COROA.length) % TINTAS_DE_COROA.length
            ]!,
          )
          col.poe(
            'testeira',
            gPlatibanda,
            material,
            [x, topo - 0.14, z],
            [0, 0, 0],
            [larg * 1.06, 0.5, prof * 1.06],
          )
        }
        /**
         * ═══ A NERVURA VERTICAL ACESA ═══
         *
         * E o elemento mais caracteristico da referencia de Pudong que o dono
         * mandou tres vezes: torres com uma LINHA DE LUZ subindo a fachada
         * inteira, sem interrupcao, em magenta, ciano ou azul. Nao e a janela
         * que da cor aquele skyline — janela e sempre creme. E isto.
         *
         * E funciona porque e VERTICAL num quadro cheio de horizontais. As
         * lajes, as varandas, os peitoris, a propria linha do horizonte: tudo
         * na cidade corre deitado. A nervura e a unica coisa que sobe, e por
         * isso ela le antes de qualquer outra.
         *
         * UMA EM CADA TRES TORRES ALTAS, e o limite e o assunto: em todas,
         * viraria parque de diversoes e a cidade perderia a hora dourada que o
         * terraco depende. Espalhadas, leem como o que sao — alguns predios
         * com projeto de iluminacao, no meio de muitos sem.
         *
         * Ela sai na chave da coroa, com o mesmo material sem nevoa: e a mesma
         * instalacao, no mesmo predio, e custa zero chamada nova.
         */
        if (topo > 4.0 && ruido(i, f * 3 + 41) > 0.8) {
          const corNervura =
            TINTAS_DE_COROA[
              Math.floor(ruido(i, f * 3 + 43) * TINTAS_DE_COROA.length) % TINTAS_DE_COROA.length
            ]!
          const altoNervura = topo - BASE - 0.9
          for (const s of [-1, 1])
            col.poe(
              'coroa',
              gFaixaLaje,
              mCoroa,
              [x + s * larg * 0.47, topo - 0.5 - altoNervura / 2, z + prof / 2 + 0.06],
              [0, 0, Math.PI / 2],
              [altoNervura, 0.32, 0.32],
              corNervura,
            )
        }
        const zFachada = z + prof / 2 + 0.02
        // A tinta desta torre — semente propria, sem relacao com a que decide
        // tipo, largura ou altura: se viessem do mesmo numero, cor e forma
        // andariam juntas e a cidade ganharia um padrao no lugar de variedade.
        const montantes = Math.max(2, Math.round(larg / 0.42))
        if (peleLisa) {
          /**
           * PELE LISA: UM pano de vidro do térreo à platibanda, e aletas
           * verticais correndo a altura inteira.
           *
           * O ponto é a CONTINUIDADE. Empilhar fitas de andar em andar, por mais
           * altas que sejam, sempre devolve uma sequência de faixas — e faixa é o
           * que o olho lê como laje aparente. Aqui o vidro é uma peça só, e por
           * isso a torre não tem andar visível nenhum: ela é uma lâmina.
           *
           * A aleta é o que impede essa lâmina de virar um espelho chapado. Ela
           * vai de baixo a cima sem interrupção, que é exatamente o contrário do
           * montante da outra família — lá ele tem a altura de um andar e
           * reinicia a cada laje.
           */
          const alturaPele = topo - BASE - 0.5
          col.poe(
            'fitaVidro',
            gFitaVidro,
            mVidroEscuro,
            [x, topo - 0.28 - alturaPele / 2, zFachada],
            [0, 0, 0],
            [larg * 0.94, alturaPele / 0.66, 1],
            tintaDoVidro,
          )
          for (let m = 0; m <= montantes; m++)
            col.poe(
              'aleta',
              gAleta,
              material,
              [x - larg * 0.47 + (m * larg * 0.94) / montantes, topo - 0.28 - alturaPele / 2, zFachada + 0.05],
              [0, 0, 0],
              [1, alturaPele, 1],
            )
        }
        for (let l = 0; l < andares; l++) {
          const yFita = topo - 0.5 - l * PE_DIREITO_CIDADE
          if (!peleLisa) {
            col.poe(
              'fitaVidro',
              gFitaVidro,
              mVidroEscuro,
              [x, yFita, zFachada],
              [0, 0, 0],
              [larg * 0.92, 1, 1],
              tintaDoVidro,
            )
            // Montantes do caixilho: sem a divisão vertical, a fita é uma faixa
            // lisa e o prédio perde escala. Eles têm a altura da fita, e não a do
            // andar — montante é peça de caixilho, não de estrutura.
            /**
             * ═══ O MONTANTE AVANÇOU, E ISSO É O CONSERTO DO PISCA-PISCA ═══
             *
             * O dono reportou "janelas piscando". Era Z-FIGHTING, e a causa é
             * exata: o montante ficava em `zFachada + 0,03` com 6 cm de
             * espessura, e o trecho aceso ficava em `zFachada + 0,03` com 6 cm
             * de espessura. As duas faces frontais no MESMO plano.
             *
             * E elas se encontram porque as duas grades têm passos diferentes —
             * o montante a cada `larg/0,42`, o trecho aceso a cada `larg/0,34`.
             * Onde coincidem, dois polígonos coplanares disputam o mesmo pixel,
             * e quem ganha depende do erro de arredondamento do z naquele
             * quadro. Com a câmera respirando, o vencedor troca quadro a quadro:
             * pisca. Foi o adensamento da malha, duas entregas atrás, que criou
             * as coincidências — antes os passos batiam menos.
             *
             * 0,075 e não 0,03, e o número não é folga arbitrária: é o que a
             * peça É. Montante de caixilho fica PROUD do vidro — ele é o perfil
             * que segura o pano e sobressai dele. A ordem em profundidade passa
             * a ser a real (vidro ao fundo, interior aceso à frente, caixilho à
             * frente de tudo), e faces em planos diferentes não têm como
             * disputar pixel nenhum.
             */
            for (let m = 0; m <= montantes; m++)
              col.poe(
                'montanteFachada',
                gMontanteFachada,
                material,
                [x - larg * 0.46 + (m * larg * 0.92) / montantes, yFita, zFachada + 0.075],
                [0, 0, 0],
                [1, 0.68, 1],
              )
            /**
             * ═══ A VARANDA, QUE É O QUE FALTAVA PARA LER COMO PRÉDIO DAQUI ═══
             *
             * Torre residencial brasileira tem SACADA em quase todo andar, e é o
             * elemento que mais a distingue de uma torre de escritório. Sem ela
             * a fachada é um plano liso com vidro — que é exatamente o que o
             * dono vinha chamando de fraco: nada projetava, então nada fazia
             * sombra, e sem sombra não há profundidade nem realismo.
             *
             * A laje avança 34 cm e ocupa pouco menos de metade da largura,
             * deslocada para um lado. Sacada centrada e simétrica em todos os
             * andares leria como desenho; prédio real tem a sacada onde a planta
             * pediu. O lado é sorteado por PRÉDIO e não por andar — numa mesma
             * torre elas ficam empilhadas, que é como prumada funciona.
             *
             * O PEITORIL é a segunda peça e é ele que fecha a leitura: laje
             * sozinha lê como brise. A guarda em vidro escuro é o que diz "aqui
             * alguém se debruça".
             */
            if (l > 0) {
              const xSacada = x + (ruido(i, f * 3 + 31) > 0.5 ? 1 : -1) * larg * 0.22
              const largSacada = larg * 0.46
              col.poe(
                'varanda',
                gFaixaLaje,
                material,
                [xSacada, yFita - 0.3, zFachada + 0.15],
                [0, 0, 0],
                [largSacada, 1.1, 0.34],
              )
              col.poe(
                'guardaSacada',
                gFitaVidro,
                mVidroEscuro,
                [xSacada, yFita - 0.17, zFachada + 0.29],
                [0, 0, 0],
                [largSacada, 0.38, 0.6],
                tintaDoVidro,
              )
            }
          }
          /**
           * O TRECHO ACESO é o vão inteiro entre dois montantes, e não um
           * retângulo no meio da fita. Em planta livre quem acende é uma ÁREA.
           *
           * METADE ACESA, e o número foi medido no render.
           *
           * Com o limiar em 0,7 (30% acesos) a torre ficava salpicada e lia como
           * prédio antigo com meia dúzia de luzes. Corrigi para 0,34 — 66% — e o
           * render devolveu o problema oposto: com o trecho ocupando quase a fita
           * inteira, dois terços acesos viram uma PAREDE de luz, e o skyline
           * passou a puxar o olho para longe do terraço, que é o assunto.
           *
           * Em 0,52 a torre continua trabalhando às seis da tarde e para de
           * competir. É a mesma lição do emissivo da cascata: acender demais uma
           * superfície apaga o desenho dela.
           */
          const trechos = Math.max(3, Math.round(larg / 0.34))
          for (let t = 0; t < trechos; t++)
            if (ruido(i * 31 + t * 7 + l, f + 11) > 0.18) {
              /**
               * O SORTEIO DO BRILHO usa uma semente DIFERENTE da que decidiu se
               * o trecho está aceso (`f + 11` contra `f + 29`).
               *
               * Com a mesma semente, "aceso" e "muito aceso" ficariam
               * correlacionados: os trechos que passaram por pouco no primeiro
               * teste seriam sistematicamente os mais fracos no segundo, e a
               * fachada ganharia um degradê que ninguém pediu. Duas perguntas
               * independentes precisam de dois ruídos independentes.
               */
              const q = ruido(i * 31 + t * 7 + l, f + 29)
              /**
               * UMA EM DEZ ESTOURA, E A PRIMEIRA TENTATIVA ERA UMA EM SEIS.
               *
               * EU VIOLEI A MINHA PRÓPRIA REGRA DE ÁREA, que escrevi horas antes
               * ao domar a fita do bar: o ganho tem de cair com o tamanho
               * aparente do conjunto, porque o olho SOMA ÁREA. Uma janela isolada
               * a 2,65 de ganho é um ponto bonito; duzentas delas espalhadas por
               * metade do quadro viram uma segunda fonte de luz — e o render
               * devolveu exatamente isso, com o casario roubando a atenção do
               * terraço.
               *
               * É a mesma lição que o próprio comentário da fração de vidro, logo
               * acima, já registrava: "acender demais uma superfície apaga o
               * desenho dela". Só que ali o erro foi de fração de janelas acesas,
               * e aqui de intensidade — e eu o cometi de novo por outra porta.
               *
               * Agora 10 % cruzam o limiar, e cruzam por pouco: o pico vai a 2,16
               * de ganho (1,29 de luminância, contra 1,15 do limiar), o que dá um
               * halo discreto em vez de estouro. E a maioria desceu de 0,82-1,34
               * para 0,72-1,22, de modo que a média do casario voltou a ficar
               * ABAIXO do que era antes desta mudança — o ganho da variação não
               * pode vir como ganho de brilho geral.
               */
              const ganho = q > 0.88 ? 2.0 + (q - 0.88) * 2.8 : 0.95 + q * 0.62
              col.poe(
                'trechoAceso',
                gTrechoAceso,
                mJanela,
                [x - larg * 0.42 + (t * larg * 0.84) / (trechos - 1), yFita, zFachada + 0.03],
                [0, 0, 0],
                [1, 1, 1],
                brilhoDeJanela(ganho),
              )
            }
          /**
           * ═══ A FACHADA LATERAL, E SEM ELA O PRÉDIO É UM RECORTE ═══
           *
           * O dono perguntou por que só o vidro da frente acende. A resposta é
           * que só a frente TINHA vidro: todo o gerador punha fita, montante,
           * varanda e trecho aceso num único plano, o da face voltada para a
           * câmera. As outras cinco faces do cubo eram material liso.
           *
           * Isso não se nota enquanto o prédio está bem no eixo da câmera, e é
           * por isso que passou tanto tempo. Mas a cidade tem 56 m de largura e
           * a câmera está no meio: quase toda torre é vista EM DIAGONAL, e numa
           * diagonal o que se vê são duas faces. Uma acesa e outra cega lê como
           * recorte de papelão de pé.
           *
           * ═══ SÓ A FACE QUE OLHA PARA A CÂMERA ═══
           *
           * A oposta nunca aparece, e envidraçá-la seria pagar geometria que
           * nenhum pixel usa. A câmera está em x ≈ 0, então a face visível de
           * uma torre à esquerda é a do lado +x, e a de uma torre à direita é a
           * do lado −x: `sinal` é o inverso do sinal de `x`.
           *
           * E só acima de 2 m do eixo. Mais perto que isso a face lateral está
           * quase de perfil, ocupa menos de um pixel de largura, e as peças
           * dela seriam instância paga sem imagem em troca — a mesma conta que
           * já decide não desenhar a fila de trás das garrafas do bar.
           */
          if (Math.abs(x) > 2) {
            const sinal = x < 0 ? 1 : -1
            const xLado = x + sinal * larg * 0.5
            // Girada meia volta em Y: a fita nasce deitada no eixo x, e a face
            // lateral corre no eixo z. `prof * 0,9` porque ela não vai até as
            // quinas — a aresta do prédio fica limpa, como fica na obra.
            col.poe(
              'fitaVidro',
              gFitaVidro,
              mVidroEscuro,
              [xLado + sinal * 0.02, yFita, z],
              [0, Math.PI / 2, 0],
              [prof * 0.9, 1, 1],
              tintaDoVidro,
            )
            const trechosLado = Math.max(2, Math.round(prof / 0.34))
            for (let t = 0; t < trechosLado; t++)
              if (ruido(i * 37 + t * 11 + l, f + 13) > 0.18) {
                const q = ruido(i * 37 + t * 11 + l, f + 31)
                col.poe(
                  'trechoAceso',
                  gTrechoAceso,
                  mJanela,
                  [
                    xLado + sinal * 0.05,
                    yFita,
                    z - prof * 0.41 + (t * prof * 0.82) / Math.max(1, trechosLado - 1),
                  ],
                  [0, Math.PI / 2, 0],
                  [1, 1, 1],
                  brilhoDeJanela(q > 0.88 ? 2.0 + (q - 0.88) * 2.8 : 0.95 + q * 0.62),
                )
              }
            }
        }

        /**
         * RECUO NO TOPO e LUZ DE OBSTÁCULO — os dois arremates que DATAM a torre.
         *
         * Torre alta moderna quase nunca sobe reta até o fim: ela escalona,
         * porque o zoneamento pede recuo em altura e porque o núcleo de
         * elevadores termina antes da fachada. É o degrau no topo que diz "isto
         * foi construído sob código moderno".
         *
         * E toda estrutura alta carrega luz vermelha de obstáculo aéreo. É um
         * ponto de dez centímetros, e é um dos sinais mais específicos de
         * skyline contemporânea — nenhum prédio de alvenaria antigo tem um.
         */
        if (topo > 5.4) {
          const alturaRecuo = 0.9 + ruido(i, f * 3 + 8) * 1.6
          /**
           * ═══ CINCO SILHUETAS DE TOPO, E ANTES HAVIA UMA ═══
           *
           * Toda torre alta terminava no MESMO gesto: uma caixa menor, centrada
           * sobre o corpo. Repetido cinquenta vezes isso não é variedade — é a
           * mesma torre desenhada cinquenta vezes com alturas diferentes, e era
           * parte do que o dono vinha chamando de fraco.
           *
           * O TOPO É ONDE A SILHUETA ACONTECE. O corpo de uma torre a quinze
           * metros é um retângulo, qualquer que seja o projeto; o que distingue
           * uma da outra contra o céu são os últimos dois metros. Nas fotos de
           * Pudong é exatamente assim — os corpos são intercambiáveis, e o que
           * se reconhece e se lembra é o coroamento.
           *
           * Cinco famílias, com semente PRÓPRIA — sem relação com a que decide
           * tipo, largura, altura ou cor, para que forma de topo e forma de
           * corpo não andem juntas e a cidade não ganhe um padrão novo:
           *
           *  · RECUO — a caixa centrada de antes. Continua, porque é a mais
           *    comum de verdade; só deixou de ser a única.
           *  · FENDA — duas torrinhas com um vão entre elas. O olho lê céu
           *    através do topo, e furo em silhueta é a coisa mais memorável
           *    que uma torre pode ter.
           *  · BALANÇO — o volume superior deslocado para um lado. Assimetria
           *    no topo é o que mais rápido diz "isto foi projetado", porque
           *    simetria é o que sai de graça.
           *  · CUNHA — o topo cortado num plano oblíquo. É a única diagonal de
           *    um skyline inteiro feito de verticais e horizontais, e por isso
           *    a que mais salta.
           *  · ESCADA — dois degraus recuando um sobre o outro. Dá altura sem
           *    dar massa, e é o coroamento dos anos trinta que voltou.
           *
           * Todas na chave `recuo`, que já existia: cinco silhuetas, zero
           * chamada de desenho nova.
           */
          const silhueta = Math.floor(ruido(i, f * 3 + 53) * 5) % 5
          if (silhueta === 1) {
            for (const s of [-1, 1])
              col.poe('recuo', gCubo, material, [x + s * larg * 0.2, topo + alturaRecuo / 2, z], [0, 0, 0], [
                larg * 0.26,
                alturaRecuo,
                prof * 0.62,
              ])
          } else if (silhueta === 2) {
            col.poe(
              'recuo',
              gCubo,
              material,
              [x + (ruido(i, f * 3 + 59) > 0.5 ? 1 : -1) * larg * 0.16, topo + alturaRecuo / 2, z],
              [0, 0, 0],
              [larg * 0.56, alturaRecuo, prof * 0.62],
            )
          } else if (silhueta === 3) {
            // A inclinação em Z é o que corta o topo em diagonal. Note que ela
            // vai na ordem padrão do Euler e não precisa de 'YXZ': esta peça
            // não é girada em Y, então não há as duas rotações para brigarem —
            // ver a armadilha documentada em `poe`.
            col.poe('recuo', gCubo, material, [x, topo + alturaRecuo * 0.32, z], [0, 0, 0.26], [
              larg * 0.62,
              alturaRecuo * 0.7,
              prof * 0.62,
            ])
          } else if (silhueta === 4) {
            col.poe('recuo', gCubo, material, [x, topo + alturaRecuo * 0.3, z], [0, 0, 0], [
              larg * 0.68,
              alturaRecuo * 0.6,
              prof * 0.68,
            ])
            col.poe('recuo', gCubo, material, [x, topo + alturaRecuo * 0.78, z], [0, 0, 0], [
              larg * 0.4,
              alturaRecuo * 0.5,
              prof * 0.4,
            ])
          } else {
            col.poe('recuo', gCubo, material, [x, topo + alturaRecuo / 2, z], [0, 0, 0], [
              larg * 0.62,
              alturaRecuo,
              prof * 0.62,
            ])
          }
          col.poe('luzAerea', gLuzAerea, mLuzAerea, [x, topo + alturaRecuo + 0.12, z])
        }
      }
    })

    /**
     * ═══════════════════════════════════════════════════════════════════════
     * AS TORRES-HERÓI
     * ═══════════════════════════════════════════════════════════════════════
     *
     * POR QUE ELAS EXISTEM. Oito rodadas de ajuste no gerador procedural, e o
     * dono continuou dizendo que a cidade não parecia da mesma arte da
     * cobertura. Estava certo, e a razão é estrutural: dezessete caixas
     * sorteadas por ruído não viram arquitetura por acumulação de parâmetro.
     * O terraço foi desenhado peça por peça — o núcleo do elevador, o bar, o
     * mural — e é por isso que ele lê como projeto.
     *
     * Então três torres saem do sorteio e passam a ser DESENHADAS, com a mesma
     * régua do terraço. As outras continuam procedurais, dando fundo: skyline
     * inteiro de peça única viraria o oposto do problema, uma fileira de
     * monumentos sem cidade em volta.
     *
     * O QUE A REFERÊNCIA ENSINA. Nas fotos de Pudong que o dono mandou, o que
     * faz a linha do horizonte é um punhado de torres RECONHECÍVEIS — cada uma
     * com uma silhueta que se distingue de longe e se lembra depois. Não é
     * detalhe de fachada: é FORMA. A agulha, a torre que afina, a que tem um
     * vazio no topo. O resto do casario é massa.
     *
     * Daí três famílias, e nenhuma repetida:
     *
     *  · ESCALONADA — recuos sucessivos, cada um mais estreito, terminando em
     *    agulha. É a torre mais alta do conjunto e a âncora da composição.
     *  · NERVURADA — afunila de baixo a cima e leva uma linha acesa contínua na
     *    aresta, de ponta a ponta. É a que mais lê à noite, e a que mais se
     *    parece com o que a referência tem de mais moderno.
     *  · PORTAL — corpo reto com um VAZIO emoldurado no topo. Furo em silhueta
     *    é a coisa mais memorável que uma torre pode ter, porque o olho lê céu
     *    onde esperava massa.
     *
     * TODAS TÊM PÓDIO, e isso é o que faltava em todo o gerador: nas fotos, a
     * base da cidade é uma faixa contínua de construção baixa e acesa, e é ela
     * que apoia as torres no chão. Sem pódio, torre lê como espetada.
     *
     * ELAS FICAM EM z = −12,6, à frente da primeira faixa: são o plano mais
     * próximo da cidade, logo atrás da parede do terraço (−11,4). É onde o
     * detalhe desenhado ainda chega à tela.
     */
    const gAgulha = new THREE.ConeGeometry(1, 1, 6)
    // Cilindro unitario com 20 lados: a 12,6 m de distancia uma torre de 1,3 m
    // de diametro ocupa umas 90 colunas de pixel, e 20 lados ja dao a ela
    // silhueta curva sem poligono visivel na borda.
    const gCilindroCidade = new THREE.CylinderGeometry(1, 1, 1, 20)
    const zHeroi = -12.6
    const matHeroi = materiais[0]!

    /** Empilha uma fachada envidraçada num trecho de torre — o vocabulário comum. */
    const fachadaHeroi = (
      cx: number,
      base: number,
      alto: number,
      larg: number,
      prof: number,
      tinta: THREE.Color,
      semente: number,
    ) => {
      const zF = zHeroi + prof / 2 + 0.02
      const andares = Math.max(1, Math.floor(alto / PE_DIREITO_CIDADE))
      for (let l = 0; l < andares; l++) {
        const y = base + alto - 0.3 - l * PE_DIREITO_CIDADE
        col.poe('fitaVidro', gFitaVidro, mVidroEscuro, [cx, y, zF], [0, 0, 0], [larg * 0.94, 1, 1], tinta)
        const vaos = Math.max(3, Math.round(larg / 0.3))
        for (let t = 0; t < vaos; t++) {
          if (ruido(semente * 31 + t * 7 + l, 11) < 0.12) continue
          const q = ruido(semente * 31 + t * 7 + l, 29)
          col.poe(
            'trechoAceso',
            gTrechoAceso,
            mJanela,
            [cx - larg * 0.44 + (t * larg * 0.88) / (vaos - 1), y, zF + 0.03],
            [0, 0, 0],
            [1, 1, 1],
            brilhoDeJanela(q > 0.88 ? 2.0 + (q - 0.88) * 2.8 : 0.95 + q * 0.62),
          )
        }
        // A laje aparente entre um andar e outro. Nas torres procedurais ela é
        // uma fita fina; aqui ela AVANÇA, porque a doze metros e meio o relevo
        // dela ainda rende sombra — e sombra é o que o dono chamou de
        // profundidade quando disse que faltava realismo.
        col.poe('lajeHeroi', gFaixaLaje, matHeroi, [cx, y - 0.34, zF + 0.05], [0, 0, 0], [larg, 1.1, prof * 0.12 + 0.12])
      }
    }

    /**
     * ═══ O PÓDIO ATRAVESSOU A PAREDE DO TERRAÇO, E ERA DEFEITO MEU ═══
     *
     * O dono reportou "prédios saindo dentro do escritório, na cascata". Era
     * literal, e a conta é simples: o pódio tinha 2,4 m de profundidade
     * centrado em z −12,1, ou seja avançava até −10,9. A parede do fundo do
     * terraço está em −11,4. Ele entrava meio metro dentro da cobertura, e a
     * marquise, com 2,6 de profundidade, entrava ainda mais.
     *
     * E O CABEÇALHO DESTE ARQUIVO DOCUMENTA ESSE INTERVALO, com as duas cotas
     * escritas: "a cidade tem de viver entre os dois". Eu acrescentei uma peça
     * nova sem conferir contra a restrição que estava escrita a mil linhas
     * dali — a segunda vez nesta mesma entrega em que ignoro uma cota medida
     * do próprio arquivo, depois do teto de 7,5 m.
     *
     * `Z_LIMITE` passa a ser explícito: a face mais avançada que qualquer peça
     * da cidade pode ter. A parede está em −11,4 e os 25 cm de folga cobrem
     * arredondamento e qualquer ajuste futuro da profundidade do andar. A conta
     * fica VISÍVEL na chamada, em vez de escondida num literal somado ao z.
     */
    const Z_LIMITE = -11.65
    const podio = (cx: number, larg: number, semente: number) => {
      const PROF_PODIO = 2.0
      const zPodio = Math.min(zHeroi - 0.1, Z_LIMITE - (PROF_PODIO + 0.2) / 2)
      col.poe(
        `predio-0`,
        gCubo,
        matHeroi,
        [cx, BASE + (BASE + 8.2) / 2 - BASE / 2, zPodio],
        [0, 0, 0],
        [larg * 1.55, 8.2, PROF_PODIO],
        MODULACAO[semente % MODULACAO.length]!,
      )
      // A marquise: a laje fina que corre o pódio inteiro e o separa da torre.
      // Ela avança 10 cm de cada lado, e por isso entra na mesma conta acima.
      col.poe('testeira', gPlatibanda, matHeroi, [cx, BASE + 8.3, zPodio], [0, 0, 0], [
        larg * 1.62,
        0.7,
        PROF_PODIO + 0.2,
      ])
    }

    const HEROIS = [
      { x: -8.6, tipo: 'escalonada' as const, tinta: 1, coroa: 1 },
      { x: 1.9, tipo: 'nervurada' as const, tinta: 4, coroa: 3 },
      { x: 10.4, tipo: 'portal' as const, tinta: 0, coroa: 2 },
      { x: -3.4, tipo: 'redonda' as const, tinta: 1, coroa: 5 },
    ]

    for (const [h, heroi] of HEROIS.entries()) {
      const tinta = TINTAS_DE_VIDRO[heroi.tinta]!
      const corCoroa = TINTAS_DE_COROA[heroi.coroa]!
      podio(heroi.x, heroi.tipo === 'escalonada' ? 1.5 : 1.2, h + 2)

      if (heroi.tipo === 'escalonada') {
        /**
         * TRÊS TRONCOS, cada um mais estreito e mais alto que o anterior, com a
         * proporção crescendo — é o que faz a torre parecer SUBIR em vez de
         * apenas ser alta. Recuo constante leria como escada.
         */
        const trechos = [
          { base: 1.2, alto: 2.2, larg: 1.5 },
          { base: 3.4, alto: 1.7, larg: 1.14 },
          { base: 5.1, alto: 1.25, larg: 0.8 },
        ]
        for (const [t, tr] of trechos.entries()) {
          col.poe(`predio-0`, gCubo, matHeroi, [heroi.x, BASE + (tr.base + tr.alto / 2) - BASE / 2 + BASE / 2, zHeroi], [0, 0, 0], [tr.larg, tr.alto, 1.5 - t * 0.28], MODULACAO[(h + 1) % MODULACAO.length]!)
          fachadaHeroi(heroi.x, tr.base, tr.alto, tr.larg, 1.5 - t * 0.28, tinta, h * 17 + t)
          // Cada recuo ganha a sua coroa: é a repetição dela que conta a
          // subida, e é o desenho que a referência mostra em Pudong.
          col.poe('coroa', gFaixaLaje, mCoroa, [heroi.x, tr.base + tr.alto - 0.08, zHeroi], [0, 0, 0], [tr.larg * 1.06, 0.7, (1.5 - t * 0.26) * 1.06], corCoroa)
          col.poe('testeira', gPlatibanda, matHeroi, [heroi.x, tr.base + tr.alto + 0.06, zHeroi], [0, 0, 0], [tr.larg * 1.1, 0.5, (1.5 - t * 0.28) * 1.1])
        }
        // A AGULHA. Sem ela a torre termina numa caixa, e caixa no topo e
        // caixa na base leem como o mesmo volume repetido.
        col.poe('agulha', gAgulha, matHeroi, [heroi.x, 6.35 + 0.45, zHeroi], [0, 0, 0], [0.2, 0.95, 0.2])
        col.poe('luzAerea', gLuzAerea, mLuzAerea, [heroi.x, 7.3, zHeroi])
      }

      if (heroi.tipo === 'nervurada') {
        /**
         * AFUNILA EM SEIS ANÉIS, cada um 6 % mais estreito. Torre que afina é
         * o desenho contemporâneo por excelência, e o afunilamento contínuo —
         * em vez de recuos — é o que a distingue da escalonada ao lado.
         */
        const aneis = 5
        const altoAnel = 0.95
        for (let a = 0; a < aneis; a++) {
          const yb = 1.2 + a * altoAnel
          const w = 1.28 * Math.pow(0.94, a)
          const p = 1.3 * Math.pow(0.94, a)
          col.poe(`predio-0`, gCubo, matHeroi, [heroi.x, yb + altoAnel / 2, zHeroi], [0, 0, 0], [w, altoAnel, p], MODULACAO[(h + 3) % MODULACAO.length]!)
          fachadaHeroi(heroi.x, yb, altoAnel, w, p, tinta, h * 23 + a)
          /**
           * A NERVURA ACESA na aresta, e ela é a razão de ser desta torre.
           *
           * Na referência de Xangai há uma linha de luz que sobe a fachada
           * inteira sem interrupção, e é a coisa que mais lê à noite naquele
           * skyline. Aqui ela é uma peça por anel, alinhadas, de modo que a
           * linha atravessa a torre de ponta a ponta.
           */
          for (const s of [-1, 1])
            col.poe('coroa', gFaixaLaje, mCoroa, [heroi.x + s * w * 0.5, yb + altoAnel / 2, zHeroi + p / 2 + 0.03], [0, 0, Math.PI / 2], [altoAnel, 0.5, 0.5], corCoroa)
        }
        col.poe('coroa', gFaixaLaje, mCoroa, [heroi.x, 1.2 + aneis * altoAnel, zHeroi], [0, 0, 0], [1.1, 0.9, 1.1], corCoroa)
        col.poe('luzAerea', gLuzAerea, mLuzAerea, [heroi.x, 1.2 + aneis * altoAnel + 0.2, zHeroi])
      }

      if (heroi.tipo === 'portal') {
        /**
         * O VAZIO EMOLDURADO. O corpo sobe reto até 7,4; daí para cima, em vez
         * de um bloco, duas pernas e uma travessa. O olho vê CÉU onde esperava
         * massa, e é isso que torna a silhueta memorável — é o mesmo recurso
         * do prédio de topo trapezoidal na foto de Pudong.
         */
        const w = 1.42
        col.poe(`predio-0`, gCubo, matHeroi, [heroi.x, (1.2 + 5.4) / 2, zHeroi], [0, 0, 0], [w, 4.2, 1.36], MODULACAO[(h + 5) % MODULACAO.length]!)
        fachadaHeroi(heroi.x, 1.2, 4.2, w, 1.36, tinta, h * 29)
        for (const s of [-1, 1]) {
          col.poe(`predio-0`, gCubo, matHeroi, [heroi.x + s * w * 0.33, 6.0, zHeroi], [0, 0, 0], [w * 0.34, 1.2, 1.36], MODULACAO[(h + 5) % MODULACAO.length]!)
          fachadaHeroi(heroi.x + s * w * 0.33, 5.4, 1.2, w * 0.34, 1.36, tinta, h * 29 + s + 3)
        }
        // A travessa que fecha o portal por cima.
        col.poe(`predio-0`, gCubo, matHeroi, [heroi.x, 6.85, zHeroi], [0, 0, 0], [w, 0.5, 1.36], MODULACAO[(h + 5) % MODULACAO.length]!)
        col.poe('coroa', gFaixaLaje, mCoroa, [heroi.x, 7.1, zHeroi], [0, 0, 0], [w * 1.05, 0.8, 1.44], corCoroa)
        col.poe('testeira', gPlatibanda, matHeroi, [heroi.x, 7.24, zHeroi], [0, 0, 0], [w * 1.1, 0.5, 1.5])
        col.poe('luzAerea', gLuzAerea, mLuzAerea, [heroi.x, 7.4, zHeroi])
      }

      if (heroi.tipo === 'redonda') {
        /**
         * ═══ A TORRE REDONDA — a peça que quebra o skyline de caixas ═══
         *
         * O dono pediu "um prédio redondo, com estética futurista, arquitetura
         * moderna de cidade super desenvolvida". A forma é o pedido inteiro:
         * num horizonte feito só de prismas retos, UM cilindro é a coisa que o
         * olho acha primeiro e lembra depois. É o mesmo raciocínio da garrafa
         * quadrada na prateleira do bar — a forma que destoa é a que organiza
         * a leitura das outras.
         *
         * O PERFIL NÃO É UM TUBO. Torre cilíndrica reta lê como caixa d'água.
         * O que a torna contemporânea é a CINTURA: ela sai larga na base,
         * afina no terço inferior, volta a abrir de leve no meio e afunila até
         * o topo. Esse duplo movimento é o que a estrutura em núcleo central
         * permite e a alvenaria não permitia — é a silhueta que só existe
         * depois dos anos noventa, e por isso lê como "moderna" sem precisar
         * de nenhum detalhe.
         *
         * Dez anéis empilhados desenham essa curva. Cada um é uma instância do
         * mesmo cilindro unitário, escalada — nenhuma geometria nova por anel,
         * pela mesma regra que o coletor documenta.
         *
         * ═══ OS ANÉIS ACESOS ═══
         *
         * Entre um segmento e outro corre uma linha de luz horizontal. É o
         * recurso de iluminação mais característico da torre redonda de
         * verdade: como ela não tem aresta vertical para receber projetor, o
         * projeto de luz vira ANEL. E anéis empilhados leem como altura, que é
         * o que uma torre quer dizer.
         *
         * Eles usam a mesma chave e o mesmo material sem névoa das coroas, e
         * na temperatura mais fria da paleta — torre nova, LED novo.
         */
        const aneis = 10
        const altoAnel = 0.62
        const yBase = 1.1
        for (let a = 0; a < aneis; a++) {
          const t = a / (aneis - 1)
          /**
           * A CURVA DA CINTURA, em três termos: um estreitamento forte no
           * primeiro terço, uma barriga suave no meio e o afunilamento final.
           * Escrita como soma de senos porque é o jeito mais curto de obter uma
           * curva com duas inflexões sem tabela de valores.
           */
          const r = 0.72 * (1 - 0.34 * Math.sin(t * Math.PI * 0.9) - 0.34 * t * t)
          col.poe(
            'redonda',
            gCilindroCidade,
            matHeroi,
            [heroi.x, yBase + a * altoAnel + altoAnel / 2, zHeroi],
            [0, 0, 0],
            [r, altoAnel, r],
            MODULACAO[(h + 2) % MODULACAO.length]!,
          )
          /**
           * ═══ VIDRO EM ANEL, E NÃO EM PAINEL PLANO ═══
           *
           * Eu tinha chamado `fachadaHeroi` aqui, que é o que monta a fachada
           * das outras três heróis. Ela emite RETÂNGULOS PLANOS — fita de vidro
           * e trechos acesos, todos em caixas. Sobre um corpo cilíndrico isso
           * não encosta: a corda de um painel reto fica por dentro da curva no
           * meio e por fora nas pontas, então as janelas espetam para fora da
           * torre. O dono viu na hora e chamou de "janela quadrada".
           *
           * A correção não é diminuir o painel — é usar a forma certa. Num
           * corpo de revolução a envidraçaria é uma FAIXA CORRIDA, e ela se
           * desenha com outro cilindro: mesmo eixo, raio um fio menor, altura
           * de pavimento. Ele acompanha a curva por construção, porque é a
           * mesma curva.
           *
           * Dois por segmento, com o vão de estrutura entre eles: é o desenho
           * de fita horizontal que toda torre redonda de verdade tem, e é o
           * mesmo vocabulário de faixa corrida que o resto da cidade usa — só
           * que enrolado.
           */
          for (const sub of [0.3, 0.7]) {
            col.poe(
              'anelVidro',
              gCilindroCidade,
              mVidroEscuro,
              [heroi.x, yBase + a * altoAnel + altoAnel * sub, zHeroi],
              [0, 0, 0],
              [r * 0.995, altoAnel * 0.26, r * 0.995],
              tinta,
            )
            /**
             * O ANDAR ACESO, e ele é um anel de brilho baixo e não uma janela.
             *
             * Janela recortada exigiria caixinha, e caixinha volta ao problema
             * da corda reta. Num corpo curvo o que se vê de longe não são as
             * janelas de um andar — é a LINHA acesa que elas formam juntas. Um
             * anel fraco diz isso com uma instância em vez de trinta, e sem
             * nenhum canto espetando.
             */
            if (ruido(h * 41 + a, sub > 0.5 ? 7 : 3) > 0.35)
              col.poe(
                'anelAceso',
                gCilindroCidade,
                mCoroa,
                [heroi.x, yBase + a * altoAnel + altoAnel * sub, zHeroi],
                [0, 0, 0],
                [r * 1.002, altoAnel * 0.16, r * 1.002],
                // Creme quente e baixo: é interior aceso, não projetor de
                // fachada. Os anéis de coroamento ficam brancos e mais fortes,
                // e é essa diferença que separa as duas instalações.
                new THREE.Color('#ffdcb0').multiplyScalar(0.62),
              )
          }
          // O anel aceso entre um segmento e o seguinte.
          if (a < aneis - 1)
            col.poe(
              'anelAceso',
              gCilindroCidade,
              mCoroa,
              [heroi.x, yBase + (a + 1) * altoAnel, zHeroi],
              [0, 0, 0],
              [r * 1.04, 0.05, r * 1.04],
              corCoroa,
            )
        }
        /**
         * O CORO AMENTO: um disco em balanço — mais largo que o último anel — e
         * a agulha. O disco é o que diz "aqui em cima há alguma coisa", e é o
         * gesto que toda torre redonda de observação tem.
         */
        const yTopo = yBase + aneis * altoAnel
        col.poe('redonda', gCilindroCidade, matHeroi, [heroi.x, yTopo + 0.1, zHeroi], [0, 0, 0], [0.52, 0.2, 0.52], MODULACAO[(h + 2) % MODULACAO.length]!)
        col.poe('anelAceso', gCilindroCidade, mCoroa, [heroi.x, yTopo + 0.22, zHeroi], [0, 0, 0], [0.54, 0.05, 0.54], corCoroa)
        /**
         * ═══ O MASTRO, E O CONE ERA FEIO MESMO ═══
         *
         * Estava usando `gAgulha`, um cone de SEIS lados. Num corpo de vinte
         * lados isso é uma pirâmide grosseira plantada em cima de uma curva:
         * as facetas aparecem, a silhueta fica serrilhada e o encontro das duas
         * geometrias denuncia as duas. O dono chamou de "pico muito feio" e
         * está certo.
         *
         * Mastro de torre redonda não é um cone: é um TUBO que afina em
         * degraus, com uma antena fina no fim. Três cilindros de raio
         * decrescente dão exatamente isso, usam a mesma geometria de vinte
         * lados do corpo — então a curvatura é contínua do térreo ao topo — e
         * custam zero chamada nova, porque entram na chave `redonda`.
         */
        const mastro = [
          { y: 0.34, r: 0.2, h: 0.5 },
          { y: 0.82, r: 0.11, h: 0.52 },
          { y: 1.35, r: 0.045, h: 0.62 },
        ]
        for (const m of mastro)
          col.poe(
            'redonda',
            gCilindroCidade,
            matHeroi,
            [heroi.x, yTopo + m.y, zHeroi],
            [0, 0, 0],
            [m.r, m.h, m.r],
            MODULACAO[(h + 2) % MODULACAO.length]!,
          )
        col.poe('luzAerea', gLuzAerea, mLuzAerea, [heroi.x, yTopo + 1.7, zHeroi])
      }
    }

    const saida = col.colhe()
    // Nem projeta nem recebe sombra: a câmera de sombra do sol cobre ±17 m em x
    // e 64 m em profundidade, e a cidade está fora dela em x. Deixar `castShadow`
    // ligado só acrescentaria geometria ao passe de sombra sem produzir sombra.
    for (const m of saida) {
      m.castShadow = false
      m.receiveShadow = false
    }
    return saida
  }, [cor, corDistante, ceu])

  /**
   * `useEffect`, E NÃO `useMemo` — o terceiro e último lugar com este vazamento.
   *
   * `useMemo` memoriza o valor de retorno: a função de limpeza virava um valor
   * guardado que ninguém chamava, e as malhas nunca saíam da cena. Na cobertura
   * isso produziu um escritório e um bar fantasmas; aqui as dependências são as
   * três cores, que a descida muda ao trocar de andar — e uma cidade duplicada
   * sobre a outra é justamente o tipo de defeito que ninguém reporta porque lê
   * como "skyline mais densa".
   *
   * Consertado junto com os outros dois em vez de esperar alguém ver.
   */
  useEffect(() => {
    for (const m of malhas) scene.add(m)
    return () => {
      for (const m of malhas) {
        scene.remove(m)
        if (m instanceof THREE.Mesh) m.geometry.dispose()
      }
    }
  }, [malhas, scene])

  return null
}
