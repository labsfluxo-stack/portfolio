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
  { z: -13.5, n: 17, passo: 3.5, largura: [1.9, 3.4], topo: [2.0, 7.5], janelas: true, clareia: 0 },
  { z: -17.6, n: 21, passo: 2.9, largura: [1.6, 2.9], topo: [1.4, 6.0], janelas: true, clareia: 0.3 },
  { z: -19.4, n: 25, passo: 2.4, largura: [1.3, 2.4], topo: [0.5, 4.4], janelas: false, clareia: 0.58 },
] as const

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
      return new THREE.MeshStandardMaterial({
        color: base.lerp(corDoCeu, faixa.clareia),
        roughness: 0.34 + faixa.clareia * 0.4,
        metalness: 0.45,
        envMapIntensity: 1.2,
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
    // O valor tambem desceu de #ffeccd para #e3c79c. `MeshBasicMaterial` nao
    // passa por iluminacao nenhuma, entao a cor que se escreve aqui e exatamente
    // o pixel que sai — e branco-creme puro a 20 m e mais claro que qualquer
    // coisa do terraco, inclusive o nicho do bar, que e a peca que DEVE ser a
    // mais quente do quadro.
    const mJanela = new THREE.MeshBasicMaterial({ color: '#e3c79c' })
    // Janela APAGADA nao e um buraco preto: e vidro refletindo o ceu de fim de
    // tarde, entao ela e mais CLARA que a fachada e levemente azulada. Pintar de
    // preto e o erro que faz predio distante parecer queimado.
    const mVidroEscuro = new THREE.MeshStandardMaterial({
      color: '#5c6a7e',
      roughness: 0.12,
      metalness: 0.62,
      envMapIntensity: 1.5,
    })
    // Luz de obstaculo aereo: o ponto vermelho obrigatorio no topo de qualquer
    // estrutura alta. E minusculo, e e um dos sinais mais especificos de
    // skyline moderna — nenhum predio de alvenaria antigo tem um.
    const mLuzAerea = new THREE.MeshBasicMaterial({ color: '#ff3b30' })

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
    const PE_DIREITO_CIDADE = 0.95
    const gFitaVidro = new THREE.BoxGeometry(1, 0.66, 0.05)
    // O TRECHO ACESO acompanha. Ele tinha 0,34 x 0,26 — um retangulinho no meio
    // da fita, que e exatamente o desenho de uma janela. Em planta livre quem
    // acende e um VAO INTEIRO entre dois montantes, de laje a laje.
    const gTrechoAceso = new THREE.BoxGeometry(0.4, 0.58, 0.06)
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
        const peleLisa = ruido(i, f * 3 + 9) > 0.66
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
        col.poe(
          `predio-${f}`,
          gCubo,
          material,
          [x, BASE + alturaCaixa / 2, z],
          [0, 0, 0],
          [larg, alturaCaixa, prof],
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
        const zFachada = z + prof / 2 + 0.02
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
            )
            // Montantes do caixilho: sem a divisão vertical, a fita é uma faixa
            // lisa e o prédio perde escala. Eles têm a altura da fita, e não a do
            // andar — montante é peça de caixilho, não de estrutura.
            for (let m = 0; m <= montantes; m++)
              col.poe(
                'montanteFachada',
                gMontanteFachada,
                material,
                [x - larg * 0.46 + (m * larg * 0.92) / montantes, yFita, zFachada + 0.03],
                [0, 0, 0],
                [1, 0.68, 1],
              )
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
          const trechos = Math.max(2, Math.round(larg / 0.5))
          for (let t = 0; t < trechos; t++)
            if (ruido(i * 31 + t * 7 + l, f + 11) > 0.52)
              col.poe('trechoAceso', gTrechoAceso, mJanela, [
                x - larg * 0.42 + (t * larg * 0.84) / (trechos - 1),
                yFita,
                zFachada + 0.03,
              ])
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
          col.poe(
            'recuo',
            gCubo,
            material,
            [x, topo + alturaRecuo / 2, z],
            [0, 0, 0],
            [larg * 0.62, alturaRecuo, prof * 0.62],
          )
          col.poe('luzAerea', gLuzAerea, mLuzAerea, [x, topo + alturaRecuo + 0.12, z])
        }
      }
    })

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
