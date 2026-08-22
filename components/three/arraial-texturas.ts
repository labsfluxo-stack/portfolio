import * as THREE from 'three'

/**
 * As texturas do arraial, geradas em canvas.
 *
 * Nada é baixado: o projeto não carrega arquivo de imagem para cena 3D (mesma
 * regra que rege `portico-textures.ts` e as texturas dos brindes). Textura
 * gerada também tem uma vantagem que a baixada não tem — ela responde a
 * parâmetro, então a mesma função serve telhado de casa e telhado de barraca
 * mudando dois números.
 *
 * Todas repetem por `RepeatWrapping`: uma telha desenhada uma vez e repetida
 * cem vezes custa um canvas pequeno, enquanto desenhar o telhado inteiro
 * custaria um canvas do tamanho do telhado.
 */

function telaDe(largura: number, altura: number): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null
  const tela = document.createElement('canvas')
  tela.width = largura
  tela.height = altura
  return tela.getContext('2d')
}

function finalizar(
  p: CanvasRenderingContext2D,
  repeteX: number,
  repeteY: number,
): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(p.canvas)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = THREE.RepeatWrapping
  t.wrapT = THREE.RepeatWrapping
  t.repeat.set(repeteX, repeteY)
  return t
}

/**
 * TELHA COLONIAL. Fileiras de canaletas arredondadas, cada fileira deslocada
 * meia telha em relação à de cima.
 *
 * É a textura que mais muda a leitura do casario: telhado em cor chapada lê
 * como tampa, e telhado com a canaleta visível lê como TELHA — e telha é o que
 * diz "casa colonial" antes de qualquer outro detalhe da fachada.
 */
export function texturaTelha(base: string, repeteX = 8, repeteY = 6): THREE.CanvasTexture | null {
  const p = telaDe(64, 64)
  if (!p) return null
  p.fillStyle = base
  p.fillRect(0, 0, 64, 64)
  for (let fila = 0; fila < 4; fila++) {
    const y = fila * 16
    const desloca = fila % 2 === 0 ? 0 : 8
    for (let i = -1; i < 5; i++) {
      const x = i * 16 + desloca
      // A canaleta: um claro no topo da curva e um escuro na junta, que é
      // onde a sombra de uma telha cai sobre a vizinha.
      const g = p.createLinearGradient(x, 0, x + 16, 0)
      g.addColorStop(0, 'rgba(0,0,0,0.34)')
      g.addColorStop(0.42, 'rgba(255,255,255,0.16)')
      g.addColorStop(1, 'rgba(0,0,0,0.34)')
      p.fillStyle = g
      p.fillRect(x, y, 16, 15)
      p.fillStyle = 'rgba(0,0,0,0.42)'
      p.fillRect(x, y + 15, 16, 1)
    }
  }
  return finalizar(p, repeteX, repeteY)
}

/**
 * REBOCO. Parede caiada com variação de mancha — nunca uma cor plana.
 *
 * Parede lisa demais é o que faz uma casa 3D parecer um bloco de papelão: até
 * uma fachada recém-pintada tem sujeira de chuva e emenda de massa, e é essa
 * irregularidade em baixíssimo contraste que o olho lê como superfície real.
 */
export function texturaReboco(base: string, repeteX = 2, repeteY = 2): THREE.CanvasTexture | null {
  const p = telaDe(64, 64)
  if (!p) return null
  p.fillStyle = base
  p.fillRect(0, 0, 64, 64)
  for (let i = 0; i < 260; i++) {
    const x = Math.sin(i * 12.9898) * 43758.5453
    const y = Math.sin(i * 78.233) * 43758.5453
    const px = (x - Math.floor(x)) * 64
    const py = (y - Math.floor(y)) * 64
    const claro = (i % 3) === 0
    p.fillStyle = claro ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)'
    p.beginPath()
    p.arc(px, py, 1.5 + ((i % 5) * 0.9), 0, Math.PI * 2)
    p.fill()
  }
  return finalizar(p, repeteX, repeteY)
}

/**
 * PARALELEPÍPEDO. Fiadas alternadas de pedra, com junta escura entre elas.
 *
 * O chão é a maior superfície da cena e era um plano de cor única — o que
 * fazia a praça parecer um estúdio com fundo infinito. Pedra com junta dá
 * escala: é pela pedra que o olho mede o tamanho da fogueira e da barraca.
 */
export function texturaParalelepipedo(): THREE.CanvasTexture | null {
  const p = telaDe(128, 128)
  if (!p) return null
  p.fillStyle = '#171112'
  p.fillRect(0, 0, 128, 128)
  const alturaPedra = 16
  const larguraPedra = 26
  for (let fila = 0; fila < 8; fila++) {
    const y = fila * alturaPedra
    const desloca = fila % 2 === 0 ? 0 : larguraPedra / 2
    for (let i = -1; i < 6; i++) {
      const x = i * larguraPedra + desloca
      const s = Math.sin((fila * 7 + i) * 12.9898) * 43758.5453
      const tom = 0.1 + (s - Math.floor(s)) * 0.14
      p.fillStyle = `rgba(206,190,172,${tom.toFixed(3)})`
      p.fillRect(x + 1, y + 1, larguraPedra - 2, alturaPedra - 2)
    }
  }
  const t = finalizar(p, 26, 26)
  return t
}

/**
 * PALHA. Fios curtos e desiguais em duas direções.
 *
 * Telhado de barraca em marrom liso lê como lona. É a irregularidade dos fios
 * que diz palha, e ela precisa ser desigual: fio parelho vira listra.
 */
export function texturaPalha(): THREE.CanvasTexture | null {
  const p = telaDe(64, 64)
  if (!p) return null
  p.fillStyle = '#6E5730'
  p.fillRect(0, 0, 64, 64)
  for (let i = 0; i < 200; i++) {
    const s1 = Math.sin(i * 12.9898) * 43758.5453
    const s2 = Math.sin(i * 78.233) * 43758.5453
    const s3 = Math.sin(i * 39.425) * 43758.5453
    const x = (s1 - Math.floor(s1)) * 64
    const y = (s2 - Math.floor(s2)) * 64
    const claro = (s3 - Math.floor(s3)) > 0.55
    p.strokeStyle = claro ? 'rgba(226,196,132,0.4)' : 'rgba(40,28,12,0.44)'
    p.lineWidth = 1
    p.beginPath()
    p.moveTo(x, y)
    p.lineTo(x + 1.5, y + 5 + ((i % 4) * 1.6))
    p.stroke()
  }
  return finalizar(p, 5, 3)
}
