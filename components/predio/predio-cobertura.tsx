'use client'
import { useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Coletor } from './predio-instancias'

/**
 * A COBERTURA MOBILIADA — o primeiro quadro do site.
 *
 * A spec pede que este andar diga "os negócios vão bem e tranquilos" SEM
 * escrever isso, e que IMPACTE: é a primeira coisa que o visitante vê.
 *
 * DUAS COISAS ESTRUTURAIS FORAM APRENDIDAS MEDINDO, e ambas mudaram o desenho:
 *
 * 1. O PARAPEITO TAPAVA TUDO. Uma sonda pintou de magenta o parapeito de 0,88 m
 *    e ele ocupou a faixa y 455..580 de uma tela de 720 — 30 m de muro opaco a
 *    4,3 m da câmera. Sobravam 17 pixels de deck. Toda a mobília que eu vinha
 *    reposicionando em profundidade estava atrás de uma parede. O parapeito foi
 *    para 0,34 m em `Predio.tsx`; é lá que mora a correção.
 *
 * 2. NADA AQUI ERA MAIS ALTO QUE UMA CADEIRA. A câmera para em
 *    `centroDoAndar(0)`, 1,6 m acima do deck, e olha na horizontal. Um objeto só
 *    aparece ACIMA do meio da tela se passar da altura da câmera. Com
 *    espreguiçadeira (0,5 m), vaso (0,6 m) e lâmina d'água (0,06 m), o andar
 *    inteiro cabia embaixo da linha do horizonte e 40% do quadro era céu vazio.
 *
 *    Não é defeito de enquadramento — é defeito de PROGRAMA. Cobertura de
 *    verdade tem pergolado, árvore em vaso, guarda-sol e bar, e todos passam de
 *    2 m. É essa massa vertical que quebra o horizonte e transforma "laje com
 *    móveis" em "rooftop". Foi ela que entrou.
 *
 * O ESPELHO D'ÁGUA continua sendo o coração: é a única superfície do prédio que
 * DEVOLVE o céu, e com o mapa de ambiente da descida ele reflete o dourado
 * inteiro. Mas encolheu — na largura antiga (20 m) ele lia como um retângulo
 * laranja chapado, porque uma lâmina perfeitamente plana reflete uma direção só
 * e vira uma cor só. Piscina tem que ter borda visível dos dois lados para ler
 * como água.
 *
 * Tudo instanciado: poste, ripa, banqueta e folhagem se repetem, e repetição é
 * exatamente o que a instância existe para baratear.
 */
export function Cobertura({
  piso,
  zCentro,
  prof,
  meiaLargura,
}: {
  piso: number
  zCentro: number
  prof: number
  meiaLargura: number
}) {
  const { scene } = useThree()

  const malhas = useMemo(() => {
    const col = new Coletor()

    const gRipa = new THREE.BoxGeometry(0.16, 0.02, prof * 0.92)
    const gPernaEspr = new THREE.BoxGeometry(0.05, 0.28, 0.05)
    const gAssento = new THREE.BoxGeometry(0.78, 0.09, 2.05)
    const gEncosto = new THREE.BoxGeometry(0.78, 0.09, 0.88)
    const gVaso = new THREE.BoxGeometry(0.7, 0.42, 0.7)
    const gFolhagem = new THREE.SphereGeometry(0.34, 7, 5)

    // Massa vertical — a parte que faltava.
    const gPoste = new THREE.BoxGeometry(0.14, 2.6, 0.14)
    const gRipaPergola = new THREE.BoxGeometry(0.09, 0.12, 4.6)
    const gVigaPergola = new THREE.BoxGeometry(9.4, 0.18, 0.16)
    const gMastro = new THREE.BoxGeometry(0.08, 2.2, 0.08)
    const gLona = new THREE.ConeGeometry(1.5, 0.42, 8)
    const gVasoAlto = new THREE.BoxGeometry(0.95, 0.85, 0.95)
    const gTronco = new THREE.BoxGeometry(0.16, 1.3, 0.16)
    const gCopa = new THREE.SphereGeometry(0.62, 9, 6)
    const gBalcao = new THREE.BoxGeometry(4.6, 1.05, 0.75)
    const gTampo = new THREE.BoxGeometry(4.9, 0.08, 0.92)
    const gEstante = new THREE.BoxGeometry(4.6, 1.9, 0.3)
    const gAssentoBanqueta = new THREE.BoxGeometry(0.42, 0.08, 0.42)
    const gPernaBanqueta = new THREE.BoxGeometry(0.06, 0.74, 0.06)
    const gMontanteVidro = new THREE.BoxGeometry(0.05, 0.86, 0.05)

    const mDeck = new THREE.MeshStandardMaterial({ color: '#a97a4e', roughness: 0.82 })
    const mEspreguicadeira = new THREE.MeshStandardMaterial({ color: '#e8dccb', roughness: 0.7 })
    const mMetal = new THREE.MeshStandardMaterial({ color: '#cfc3ae', metalness: 0.7, roughness: 0.32 })
    const mVaso = new THREE.MeshStandardMaterial({ color: '#8d7256', roughness: 0.9 })
    const mFolha = new THREE.MeshStandardMaterial({ color: '#5f7a47', roughness: 0.88 })
    const mMadeiraEscura = new THREE.MeshStandardMaterial({ color: '#6f4c30', roughness: 0.86 })
    const mLona = new THREE.MeshStandardMaterial({ color: '#f1e4cf', roughness: 0.78 })
    const mPedra = new THREE.MeshStandardMaterial({ color: '#cbbfa8', roughness: 0.84 })

    /**
     * A COBERTURA TEM CAMADAS DE PROFUNDIDADE, e cada uma ocupa uma faixa da
     * tela. Da câmera para o fundo: guarda-corpo na borda, espreguiçadeiras e
     * guarda-sóis na frente, pergolado e lâmina d'água no miolo, bar e árvores
     * atrás, canteiro rente à parede.
     *
     * A REGRA DE ENQUADRAMENTO, e ela é medida e não estimada. A câmera para em
     * (0, −1,6, 5,9) com 62° verticais; disso sai que a escala na tela é
     *
     *     pixels por metro = 599 / (5,9 − z)
     *
     * e portanto a meia-largura VISÍVEL numa dada profundidade é
     *
     *     640 / escala = 1,068 · (5,9 − z)
     *
     * Ou seja: 10,2 m na faixa das espreguiçadeiras, 15,4 m na das árvores. Eu
     * vinha posicionando móvel em x = ±12 "porque o prédio tem 30 m de largura" —
     * e metade da mobília caía fora do quadro. O prédio tem 30 m; a JANELA não.
     * Quanto mais à frente, mais estreita — é o inverso da intuição de planta
     * baixa, e é o erro que este comentário existe para não se repetir.
     */
    const zEspreguicadeiras = zCentro + prof * 0.1
    const zPergolaFrente = zCentro + prof * 0.108
    const zPergolaFundo = zCentro - prof * 0.17
    const zBar = zCentro - prof * 0.208
    const zArvores = zCentro - prof * 0.277
    const zCanteiro = zCentro - prof * 0.4

    // Deck: ripas correndo a largura toda. Dá medida ao chão — sem elas a laje
    // é uma superfície infinita sem escala, que foi o defeito do piso liso.
    const ripas = Math.floor((meiaLargura * 2) / 0.24)
    for (let i = 0; i < ripas; i++)
      col.poe('ripa', gRipa, mDeck, [-meiaLargura + 0.12 + i * 0.24, piso + 0.012, zCentro])

    /**
     * O PERGOLADO — o elemento que mais trabalha no quadro.
     *
     * Com o topo a 2,6 m e a câmera a 1,6 m do deck, ele passa um metro ACIMA da
     * linha da câmera: é a única coisa da cobertura que se projeta na metade de
     * cima da tela e recorta o céu. Sem ele o horizonte fica limpo e o andar lê
     * como maquete. As ripas em fuga ainda dão o raio de sol listrado no deck.
     */
    // Postes dentro de `cabe(zPergolaFrente)` ≈ 9,0 m: o da ponta encosta na
    // borda do quadro, que é onde ele deve encostar — estrutura cortada pela
    // moldura diz "continua", estrutura longe da moldura diz "maquete".
    const xPostes = [-9.0, -6.2, -3.4]
    for (const x of xPostes)
      for (const z of [zPergolaFrente, zPergolaFundo])
        col.poe('poste', gPoste, mMadeiraEscura, [x, piso + 1.3, z])
    for (const z of [zPergolaFrente, zPergolaFundo])
      col.poe('viga', gVigaPergola, mMadeiraEscura, [-6.2, piso + 2.5, z])
    for (let i = 0; i < 15; i++)
      col.poe('ripaPergola', gRipaPergola, mMadeiraEscura, [
        -9.3 + i * 0.44,
        piso + 2.62,
        (zPergolaFrente + zPergolaFundo) / 2,
      ])

    // Espreguiçadeiras: silhueta baixa e horizontal, em fila. É a forma que o
    // olho lê como "descanso" mesmo a quarenta metros. Três sob o pergolado,
    // três sob os guarda-sóis. Todas dentro de `cabe(zEspreguicadeiras)` ≈ 9,1 m.
    for (const x of [-8.6, -6.4, -4.2, 4.2, 6.4, 8.6]) {
      const z = zEspreguicadeiras
      col.poe('assento', gAssento, mEspreguicadeira, [x, piso + 0.33, z])
      col.poe('encosto', gEncosto, mEspreguicadeira, [x, piso + 0.52, z - 0.78], [-0.85, 0, 0])
      for (const dx of [-0.24, 0.24])
        for (const dz of [-0.7, 0.7])
          col.poe('perna', gPernaEspr, mMetal, [x + dx, piso + 0.16, z + dz])
    }

    // Guarda-sóis: o lado direito não tem pergolado, e sem eles aquela metade da
    // tela volta a ser deck raso. O cone a 2,3 m faz o mesmo serviço de recorte.
    for (const x of [5.0, 7.8]) {
      col.poe('mastro', gMastro, mMetal, [x, piso + 1.1, zEspreguicadeiras - 0.4])
      col.poe('lona', gLona, mLona, [x, piso + 2.3, zEspreguicadeiras - 0.4])
    }

    /**
     * O BAR — e ele não é enfeite de cenário.
     *
     * "Negócios vão bem e tranquilos" é o que a spec pede que este andar diga
     * sem escrever. Espreguiçadeira diz descanso; bar diz que há GENTE, e uma
     * cobertura com bar lê como empresa que celebra. Custa quatro caixas.
     *
     * FOI PARA O FUNDO, e a razão é a janela: na profundidade da frente cabem
     * ±9 m, e o lado direito já está ocupado por espreguiçadeira e guarda-sol.
     * Recuado para −7,6 a janela abre para ±13 m, e aí o balcão inteiro entra no
     * quadro em vez de ficar do lado de fora dele — que foi onde ele passou a
     * primeira versão, invisível.
     */
    const xBar = 9.0
    col.poe('balcao', gBalcao, mMadeiraEscura, [xBar, piso + 0.52, zBar])
    col.poe('tampo', gTampo, mPedra, [xBar, piso + 1.08, zBar])
    col.poe('estante', gEstante, mMadeiraEscura, [xBar, piso + 0.95, zBar - 1.6])
    for (const x of [7.4, 8.4, 9.4, 10.4]) {
      col.poe('banqueta', gAssentoBanqueta, mEspreguicadeira, [x, piso + 0.78, zBar + 0.85])
      col.poe('pernaBanqueta', gPernaBanqueta, mMetal, [x, piso + 0.37, zBar + 0.85])
    }

    // Árvores em vaso: o volume orgânico contra tanta linha reta, agora ALTO o
    // bastante para contar. Copa a ~2,3 m, na mesma faixa de tela do pergolado.
    for (const x of [-12.4, -3.0, 1.8]) {
      col.poe('vasoAlto', gVasoAlto, mVaso, [x, piso + 0.42, zArvores])
      col.poe('tronco', gTronco, mMadeiraEscura, [x, piso + 1.5, zArvores])
      col.poe('copa', gCopa, mFolha, [x, piso + 2.18, zArvores], [0, 0.4, 0], [1.15, 0.9, 1.15])
      col.poe('copa', gCopa, mFolha, [x + 0.42, piso + 1.94, zArvores + 0.2], [0, 1.1, 0], [0.8, 0.7, 0.8])
      col.poe('copa', gCopa, mFolha, [x - 0.38, piso + 2.02, zArvores - 0.18], [0, 2.2, 0], [0.85, 0.72, 0.85])
    }

    // MONTANTES DO GUARDA-CORPO: com a chapa de vidro quase invisível, são eles
    // e o corrimão que fazem a balaustrada existir. Ritmo de 1,5 m, que é o vão
    // máximo de um guarda-corpo de vidro estrutural.
    const zGuarda = zCentro + prof * 0.4
    const montantes = Math.floor((meiaLargura * 2) / 1.5)
    for (let i = 0; i <= montantes; i++)
      col.poe('montante', gMontanteVidro, mMetal, [-meiaLargura + i * 1.5, piso + 0.72, zGuarda])

    // Canteiro rente à parede do fundo: uma faixa verde baixa que fecha a
    // composição por trás sem disputar altura com as árvores.
    for (const x of [-13.2, -9.4, -5.6, -1.8, 2.0, 5.8, 9.6, 13.4]) {
      col.poe('vaso', gVaso, mVaso, [x, piso + 0.21, zCanteiro])
      col.poe('folha', gFolhagem, mFolha, [x, piso + 0.62, zCanteiro], [0, 0.4, 0], [1, 0.82, 1])
      col.poe('folha', gFolhagem, mFolha, [x + 0.22, piso + 0.5, zCanteiro + 0.14], [0, 1.1, 0], [0.7, 0.6, 0.7])
    }

    return col.colhe()
  }, [piso, zCentro, prof, meiaLargura])

  useMemo(() => {
    for (const m of malhas) scene.add(m)
    return () => {
      for (const m of malhas) scene.remove(m)
    }
  }, [malhas, scene])

  const zEspelho = zCentro - prof * 0.03
  const zGuardaCorpo = zCentro + prof * 0.4

  return (
    <>
      {/* O ESPELHO D'ÁGUA. `roughness` baixo faz a lâmina devolver o mapa de
       * ambiente — o céu dourado aparece duas vezes no quadro.
       *
       * ENCOLHEU DE 20 m PARA 9 m, e o motivo é ótico, não de gosto: uma lâmina
       * plana reflete praticamente uma direção só, então quanto maior ela for,
       * mais ela lê como um retângulo de cor chapada. Com 9 m as duas bordas de
       * pedra cabem no quadro, e é o par borda-reflexo que o olho lê como água.
       * `metalness` também caiu — água não é metal; reflexo total matava o
       * pouco de cor própria que dá volume à lâmina. */}
      {/* A COR DA ÁGUA NÃO É A COR DO CÉU, e essa confusão deixou a lâmina
       * branca. Pintá-la de `ceu` com metalness alto faz dela um espelho que
       * devolve o degradê dourado e MAIS NADA — e um espelho plano devolve uma
       * direção só, então o resultado foi um retângulo creme no meio do deck,
       * indistinguível da pedra em volta.
       *
       * Água tem cor PRÓPRIA (o azul-verde da profundidade) e o céu entra por
       * cima, como reflexo. São as duas camadas juntas que o olho lê como água:
       * o dourado rasante sobre o verde-azulado. E o azul é, de quebra, a única
       * cor fria do andar — é ele que impede a cobertura inteira de ser um campo
       * âmbar sem contraste. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1, piso + 0.06, zEspelho]}>
        <planeGeometry args={[9, prof * 0.26]} />
        {/* RUGOSIDADE 0,3 — e é este número, não a cor, que fez a água virar água.
         *
         * Eu troquei a COR duas vezes e as duas vezes saiu cinza. A sonda de
         * magenta provou que o material pinta certo: o problema era ótico, não
         * de tinta.
         *
         * A câmera está 1,54 m acima da lâmina e 11 m atrás dela — olha a água a
         * 7,8° do horizonte. Nesse ângulo rasante o Fresnel manda a
         * refletividade para perto de 1: superfície lisa vira ESPELHO, e o que
         * ela devolve é o céu de hora dourada, que é pálido. Cinza-claro era a
         * resposta fisicamente CERTA para "lâmina polida vista de raspão", e
         * nenhuma cor de base ia aparecer por baixo disso.
         *
         * Com 0,3 o especular se espalha, o difuso reaparece e o azul existe.
         * Perde-se o espelho perfeito; ganha-se uma piscina que se lê como
         * piscina. */}
        <meshStandardMaterial color="#1d7f96" roughness={0.3} metalness={0.05} envMapIntensity={0.7} />
      </mesh>
      {/* BORDA DA LÂMINA — e ela estava ENGOLINDO a água.
       *
       * A caixa de pedra tem 9 cm de altura centrada em `piso + 0,04`: o topo
       * dela ficava em `piso + 0,085`, e o plano d'água em `piso + 0,06`. Dois
       * centímetros e meio ACIMA da água. Da altura da câmera isso não lê como
       * "borda alta": lê como piscina inexistente, porque a pedra clara cobre a
       * lâmina inteira e o que se vê é uma laje branca.
       *
       * Agora o topo da pedra fica em `piso + 0,05`, um centímetro abaixo da
       * água, e a caixa é mais larga que o plano — então a pedra aparece como
       * MOLDURA em volta e a água ocupa o miolo. É a leitura que se queria desde
       * o começo, e custou inverter uma desigualdade. */}
      <mesh position={[1, piso + 0.005, zEspelho]}>
        <boxGeometry args={[9.9, 0.09, prof * 0.32]} />
        <meshStandardMaterial color="#cbbfa8" roughness={0.85} />
      </mesh>
      {/* O GUARDA-CORPO DE VIDRO — agora é ele, e não o parapeito, que define
       * "terraço". Sobe a partir do topo do rodapé de 0,34 m, como um
       * guarda-corpo de verdade, e a opacidade caiu para 0,16: ele cobre a
       * faixa de tela onde o deck está, e é exatamente o erro do parapeito em
       * versão translúcida se for opaco demais. Quem lê como balaustrada é o
       * CORRIMÃO de metal no topo, que reflete a hora dourada numa linha. */}
      {/* SEM `transmission`, e a medicao e que mandou.
       *
       * `meshPhysicalMaterial` com `transmission` e vidro de verdade: o renderer
       * desenha a CENA INTEIRA num alvo extra para ter o que refratar. Medido no
       * prédio, `info.render.triangles` marcava exatamente 3x o total da cena —
       * passe principal, passe de sombra e este. Um único plano de vidro estava
       * custando 819 mil triangulos por quadro, e celular e requisito da spec.
       *
       * A essa distancia refracao nao produz um pixel distinguivel de
       * transparencia simples. O que vende o guarda-corpo e o CORRIMAO refletindo
       * a hora dourada, e esse continua. */}
      <mesh position={[0, piso + 0.75, zGuardaCorpo]}>
        <planeGeometry args={[meiaLargura * 2, 0.82]} />
        {/* OPACIDADE 0,07, e o número vem de uma medição. Um plano de 30 m a 5,6 m
         * da câmera cobre a faixa y 407..495 da tela — exatamente onde a lâmina
         * d'água e as espreguiçadeiras estão. Com 0,18 aquilo virava uma névoa
         * clara sobre o miolo do quadro, e foi ela (não o material da água) que
         * deixou a piscina cinza. Vidro real visto de frente é quase invisível:
         * quem denuncia a balaustrada é o montante e o corrimão, não a chapa. */}
        <meshStandardMaterial
          color="#dbeaf3"
          roughness={0.06}
          metalness={0.2}
          transparent
          opacity={0.07}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, piso + 1.17, zGuardaCorpo]}>
        <boxGeometry args={[meiaLargura * 2, 0.06, 0.09]} />
        <meshStandardMaterial color="#d8cdb8" metalness={0.8} roughness={0.24} />
      </mesh>
    </>
  )
}
