/**
 * Assa no build as texturas procedurais que não dependem de nada do runtime.
 *
 * POR QUE ISTO EXISTE. `medir-portico.mts` mostrou que subir a cena custa
 * ~1,3 s de thread principal, e que 721 ms disso são `buildAssets` — quase
 * tudo em laços por pixel gerando texturas. Só que essas funções são
 * DETERMINÍSTICAS: sementes fixas, nenhuma entrada de runtime, nenhuma cor da
 * paleta. Elas recomputam, a cada visita de cada visitante, uma constante.
 *
 * POR QUE É SEGURO. As sete funções assadas aqui usam exclusivamente
 * `createImageData` + laço + `putImageData` — nenhuma primitiva de rasterização
 * (path, gradiente, texto). O pixel é aritmética pura, então o resultado assado
 * é IDÊNTICO ao gerado no navegador, byte a byte. Não é aproximação.
 *
 * O QUE NÃO É ASSADO, e por quê: `cargoAtlas` e `floorTextures` dependem da
 * paleta, da fonte mono resolvida e do conteúdo de `content/systems.ts`, e o
 * atlas ainda é redesenhado quando a rotação vira. Assar qualquer um dos dois
 * congelaria conteúdo — o preço errado.
 *
 *   node --experimental-strip-types scripts/assar-texturas.mts
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

// ---------------------------------------------------------------------------
// O canvas mínimo.
//
// As funções assadas tocam três coisas: `canvas.width/height`, `createImageData`
// e `putImageData`. Nada mais. Este shim entrega exatamente isso — e o fato de
// caber em vinte linhas é a prova de que não há rasterização envolvida, que é a
// razão pela qual o pixel assado é idêntico ao do navegador.
// ---------------------------------------------------------------------------
type ImagemCrua = { width: number; height: number; data: Uint8ClampedArray }

// Importa o módulo PURO, não `portico-textures.ts`: aquele arrasta three, e
// three não é necessário para produzir um pixel. É a mesma fronteira que
// permite o worker existir.
const { corrugationNormalPixels, skinWearPixels, grimePixels, steelWearPixels, rustStreakPixels, CORRUGACAO, SIDE_RIBS } =
  await import('../components/three/portico-pixels.ts')

// ---------------------------------------------------------------------------
// PNG, sem dependência.
//
// PNG e não WebP/JPEG porque normal map e mapa de rugosidade não toleram perda:
// um texel errado no normal vira um brilho errado na chapa. `zlib` já vem no
// Node, e o encoder abaixo é o formato mínimo (IHDR/IDAT/IEND) — nada de
// metadado, nada de perfil de cor.
// ---------------------------------------------------------------------------
const CRC = (() => {
  const tabela = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    tabela[n] = c >>> 0
  }
  return tabela
})()

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (const byte of bytes) c = (CRC[(c ^ byte) & 0xff] ?? 0) ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function pedaco(tipo: string, dados: Uint8Array): Buffer {
  const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), Buffer.from(dados)])
  const tamanho = Buffer.alloc(4)
  tamanho.writeUInt32BE(dados.length)
  const checagem = Buffer.alloc(4)
  checagem.writeUInt32BE(crc32(corpo))
  return Buffer.concat([tamanho, corpo, checagem])
}

/**
 * Canais mantidos por textura, e é aqui que mora a economia de bytes.
 *
 * Ruído comprime mal, então PNG RGBA de 512² sai caro. Mas mapa de desgaste é
 * cinza (um canal), ORM são três, e normal map guarda X e Y — o Z é
 * reconstruído no shader porque o vetor é unitário. Gravar quatro canais onde
 * bastam um ou dois é pagar o dobro ou o quádruplo por nada.
 *
 * Por ora só medimos com RGBA; a redução de canal entra depois de o número
 * bruto justificar o trabalho de mexer no material.
 */
function png(imagem: ImagemCrua): Buffer {
  const { width, height, data } = imagem
  // Cada linha do PNG começa com um byte de filtro. 0 = None: o dado é ruído,
  // e os filtros preditivos (Sub/Up/Paeth) não têm o que prever nele.
  const cru = Buffer.alloc(height * (1 + width * 4))
  for (let y = 0; y < height; y++) {
    const destino = y * (1 + width * 4)
    cru[destino] = 0
    Buffer.from(data.buffer, y * width * 4, width * 4).copy(cru, destino + 1)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bits por canal
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pedaco('IHDR', ihdr),
    pedaco('IDAT', deflateSync(cru, { level: 9 })),
    pedaco('IEND', new Uint8Array()),
  ])
}

function assar(nome: string, gerar: () => ImagemCrua): { nome: string; bytes: number; lado: string } {
  const imagem = gerar()
  const conteudo = png(imagem)
  writeFileSync(join(DESTINO, `${nome}.png`), conteudo)
  return { nome, bytes: conteudo.length, lado: `${imagem.width}x${imagem.height}` }
}

// FORA DE `public/`, e isso é deliberado. O resultado desta medição foi que
// assar NÃO compensa (ver o cabeçalho): 1 MB de transferência para poupar
// ~500 ms de CPU é troca ruim justamente no aparelho que a otimização deveria
// socorrer. Os arquivos existem para se poder repetir a conta, não para servir
// — em `public/` eles iriam ao ar no próximo deploy.
const DESTINO = join(tmpdir(), 'portico-texturas')
mkdirSync(DESTINO, { recursive: true })

const relatorio = [
  assar('corrugation-normal', () => corrugationNormalPixels(CORRUGACAO)),
  assar('skin-wear', () => skinWearPixels(SIDE_RIBS)),
  assar('grime', grimePixels),
  assar('steel-wear', steelWearPixels),
  assar('rust-streak', rustStreakPixels),
]

let total = 0
console.log('\n=== Texturas assadas (PNG RGBA, sem perda) ===')
for (const item of relatorio.sort((a, b) => b.bytes - a.bytes)) {
  total += item.bytes
  console.log(`${(item.bytes / 1024).toFixed(0).padStart(7)} KB  ${item.lado.padStart(9)}  ${item.nome}`)
}
console.log(`${(total / 1024).toFixed(0).padStart(7)} KB  TOTAL\n`)
