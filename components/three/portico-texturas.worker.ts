/**
 * Os cinco mapas procedurais, gerados FORA da thread principal.
 *
 * Medido (`scripts/medir-portico.mts`, GPU real): a montagem da cena custava
 * 1 283 ms de thread principal, dos quais 721 ms em `buildAssets` — e ~545 ms
 * só nestes cinco laços por pixel. Enquanto eles rodavam, a página não pintava
 * e não rolava. Era esse o engasgo.
 *
 * Aqui eles continuam custando o mesmo, e isso é de propósito: a conta de
 * assar as texturas no build foi feita e reprovada (ver
 * `scripts/assar-texturas.mts` — 1 MB de PNG para poupar meio segundo de CPU,
 * troca ruim justamente no celular). O que muda é ONDE o custo é pago. Numa
 * thread à parte, meio segundo de aritmética não trava rolagem nenhuma.
 *
 * O worker importa `portico-pixels.ts` e mais nada. Um `import` de three aqui
 * traria a biblioteca inteira para um segundo bundle, que ninguém compartilha
 * com a página — o dobro do download para não ganhar nada.
 */
import { MAPAS, gerarMapas, type Mapas } from './portico-pixels'

/**
 * O que atravessa a fronteira é o próprio `Mapas` — os mesmos `{width, height,
 * data}` que `portico-pixels.ts` produz, sem conversão de lado nenhum.
 *
 * E vai TRANSFERIDO, não clonado. Cinco mapas dão ~1,2 MB; copiá-los devolveria
 * à thread principal parte exata do custo que este arquivo existe para tirar
 * dela. Transferido, o buffer muda de dono e não custa nada.
 */
export type CargaDeMapas = Mapas

// O `lib` deste projeto é o do DOM, então `self` chega tipado como janela e a
// sobrecarga de `postMessage` com lista de transferência não existe nela. O
// escopo real aqui é o do worker; a asserção diz só isso.
const escopo = self as unknown as {
  onmessage: (() => void) | null
  postMessage: (mensagem: CargaDeMapas, transferir: Transferable[]) => void
}

escopo.onmessage = (): void => {
  const mapas = gerarMapas()
  escopo.postMessage(
    mapas,
    MAPAS.map((nome) => mapas[nome].data.buffer),
  )
}
