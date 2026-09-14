import * as THREE from 'three'

/**
 * O AMBIENTE DO PREDIO — gerado, nao baixado.
 *
 * O PROBLEMA QUE ISTO RESOLVE, e ele e de fisica do material, nao de luz: em
 * PBR, metal NAO tem cor difusa propria. Ele so reflete o que esta em volta.
 * Rack com `metalness: 0.9` num cena sem mapa de ambiente reflete o nada e
 * renderiza PRETO, por mais lampada que se ponha em cima. Foi exatamente o que
 * aconteceu quando o datacenter entrou na descida: as barras acenderam e os
 * racks continuaram mortos.
 *
 * A saida obvia seria um HDRI fotografico. Nao aqui, por duas razoes:
 *
 * 1. PESO. O HDRI do estudo tem 1,6 MB. Este site e exportacao estatica com
 *    Lighthouse 95/100/100/100 — 1,6 MB de download so para o metal refletir e
 *    caro demais para o que entrega.
 * 2. COERENCIA. HDRI e uma FOTO de um lugar. O do estudo e um interior
 *    industrial; aplicado ao predio inteiro, ele iluminaria tambem a cobertura,
 *    que e ceu aberto de hora dourada. Uma foto errada de ambiente contamina
 *    todos os sete andares com a luz de outro lugar.
 *
 * Entao o ambiente e DESENHADO: um degrade equirretangular que reproduz o que o
 * predio de fato tem em volta — ceu ambar em cima, ar do andar no meio, laje
 * escura embaixo. Custa alguns quilobytes de canvas, nasce coerente com a
 * direcao de arte por construcao, e muda de cor junto com o andar ativo.
 *
 * O `PMREMGenerator` no fim nao e opcional: mapa de ambiente cru so serve para
 * espelho perfeito. E ele que pre-filtra o degrade nos varios niveis de
 * rugosidade, para metal escovado ficar embacado e metal polido ficar nitido.
 */
export function criaAmbiente(
  renderer: THREE.WebGLRenderer,
  ceu: string,
  ar: string,
  chao: string,
): THREE.Texture {
  const largura = 256
  const altura = 128
  const cv = document.createElement('canvas')
  cv.width = largura
  cv.height = altura
  const ctx = cv.getContext('2d')!

  const g = ctx.createLinearGradient(0, 0, 0, altura)
  // O horizonte fica em 0,5 porque em equirretangular a linha do meio da imagem
  // e o horizonte da esfera: acima e o que esta sobre a cena, abaixo e o chao.
  g.addColorStop(0, ceu)
  g.addColorStop(0.42, ceu)
  g.addColorStop(0.52, ar)
  g.addColorStop(1, chao)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, largura, altura)

  const tex = new THREE.CanvasTexture(cv)
  tex.mapping = THREE.EquirectangularReflectionMapping
  tex.colorSpace = THREE.SRGBColorSpace

  const pmrem = new THREE.PMREMGenerator(renderer)
  pmrem.compileEquirectangularShader()
  const alvo = pmrem.fromEquirectangular(tex)
  tex.dispose()
  pmrem.dispose()
  return alvo.texture
}
