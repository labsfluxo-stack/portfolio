'use client'
import { useMemo } from 'react'
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

/** Onde as duas fileiras moram, em z de mundo. */
const FAIXAS = [
  { z: -13.5, n: 23, passo: 2.55, largura: [2.0, 4.4], topo: [1.1, 7.6], janelas: true },
  { z: -17.6, n: 27, passo: 2.2, largura: [1.7, 3.6], topo: [0.6, 5.4], janelas: false },
] as const

export function Cidade({ cor, corDistante }: { cor: string; corDistante: string }) {
  const { scene } = useThree()

  const malhas = useMemo(() => {
    const col = new Coletor()

    // Cada prédio desce até −7: bem abaixo de y = 0, onde a parede do andar o
    // corta. Assim nenhuma silhueta tem "pé" visível flutuando no ar.
    const BASE = -7

    const mPerto = new THREE.MeshStandardMaterial({ color: cor, roughness: 0.95, metalness: 0 })
    const mLonge = new THREE.MeshStandardMaterial({ color: corDistante, roughness: 0.97, metalness: 0 })
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
    const mJanela = new THREE.MeshBasicMaterial({ color: '#ffeccd' })

    const gCubo = new THREE.BoxGeometry(1, 1, 1)
    const gJanela = new THREE.BoxGeometry(0.34, 0.5, 0.04)
    const gAntena = new THREE.BoxGeometry(0.17, 2.0, 0.17)
    const gCaixa = new THREE.BoxGeometry(1.2, 0.6, 1.2)

    FAIXAS.forEach((faixa, f) => {
      const material = f === 0 ? mPerto : mLonge
      const inicio = -(faixa.n - 1) * faixa.passo * 0.5
      for (let i = 0; i < faixa.n; i++) {
        // Deslocamento lateral próprio: fileira em passo exato lê como pente.
        const x = inicio + i * faixa.passo + (ruido(i, f * 3 + 1) - 0.5) * faixa.passo * 0.5
        const larg = faixa.largura[0] + ruido(i, f * 3 + 2) * (faixa.largura[1] - faixa.largura[0])
        const topo = faixa.topo[0] + ruido(i, f * 3 + 3) * (faixa.topo[1] - faixa.topo[0])
        const prof = 1.6 + ruido(i, f * 3 + 4) * 1.4
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
        // Janelas acesas, esparsas: só a faixa da frente, e nem em todo andar.
        const colunas = Math.max(1, Math.floor(larg / 0.85))
        const linhas = Math.max(1, Math.floor((topo - 0.2) / 0.95))
        for (let c = 0; c < colunas; c++)
          for (let l = 0; l < linhas; l++) {
            if (ruido(i * 31 + c * 7 + l, f + 11) < 0.62) continue
            col.poe('janela', gJanela, mJanela, [
              x - (colunas - 1) * 0.42 + c * 0.85,
              topo - 0.55 - l * 0.95,
              z + prof / 2 + 0.03,
            ])
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
  }, [cor, corDistante])

  useMemo(() => {
    for (const m of malhas) scene.add(m)
    return () => {
      for (const m of malhas) scene.remove(m)
    }
  }, [malhas, scene])

  return null
}
