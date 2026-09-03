/**
 * Cronômetro da montagem da cena do hero.
 *
 * Abre a home no Chromium, espera a cena WebGL subir e imprime (a) o custo de
 * cada textura procedural, vindo das marcas `portico:*` que `Portico.tsx`
 * emite, e (b) as tarefas longas que o navegador registrou no caminho.
 *
 * Existe para que "a cena é pesada" vire número por etapa. Sem isso, escolher
 * o que otimizar é palpite — e a etapa mais cara não é necessariamente a que
 * parece cara lendo o código.
 *
 *   node --experimental-strip-types scripts/medir-portico.mts
 *
 * Pressupõe `out/` construído e usa o mesmo servidor estático do e2e.
 */
import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import { setTimeout as esperar } from 'node:timers/promises'

const BASE = 'http://localhost:4173/portfolio/pt/'
/** Quanto esperar a cena montar: `PorticoSlot` só a agenda depois de `load` +
 *  ociosidade, com teto de 2s no `requestIdleCallback`. */
const TETO_MONTAGEM = 15_000

type Marca = { name: string; duration: number }
type Tarefa = { start: number; duration: number }

async function subirServidor() {
  const proc = spawn('node', ['--experimental-strip-types', 'scripts/e2e-static-server.mts'], {
    stdio: 'ignore',
  })
  // O servidor é mínimo e sobe em milissegundos; a espera é só para não
  // disparar a primeira navegação antes do listen.
  await esperar(700)
  return proc
}

async function medir() {
  const servidor = await subirServidor()
  // HEADLESS MENTE SOBRE A GPU, e por isso a medição vem em dois sabores.
  //
  // O Chromium headless rasteriza em software (SwiftShader): cada quadro vira
  // uma tarefa longa de centenas de milissegundos que NÃO existe na máquina do
  // visitante. O que ele mede com honestidade é o custo de CPU — os laços por
  // pixel das texturas —, porque esses rodam em JS de qualquer jeito.
  //
  // `MEDIR_COM_GPU=1` abre uma janela de verdade, com a GPU de verdade, e é
  // essa a passagem em que o custo POR QUADRO significa alguma coisa.
  const comGpu = process.env.MEDIR_COM_GPU === '1'
  const navegador = await chromium.launch({ headless: !comGpu })
  console.log(comGpu ? '[janela real, GPU real]' : '[headless — rasterizador de software; quadro inflado]')

  try {
    const pagina = await navegador.newPage({ viewport: { width: 1440, height: 900 } })

    // O observador precisa existir ANTES de qualquer script da página, senão
    // perde exatamente a tarefa longa que estamos caçando.
    await pagina.addInitScript(() => {
      ;(window as unknown as { __tarefas: Tarefa[] }).__tarefas = []
      try {
        new PerformanceObserver((lista) => {
          for (const entrada of lista.getEntries()) {
            ;(window as unknown as { __tarefas: Tarefa[] }).__tarefas.push({
              start: entrada.startTime,
              duration: entrada.duration,
            })
          }
        }).observe({ entryTypes: ['longtask'] })
      } catch {
        // Firefox/Safari não implementam longtask. As marcas `portico:*`
        // continuam valendo — elas é que carregam o detalhe por etapa.
      }
    })

    await pagina.goto(BASE, { waitUntil: 'load' })

    // A cena só existe quando o canvas aparece. Antes dele, o que está no DOM
    // é a elevação em SVG (`PorticoFallback`), e medir ali seria medir nada.
    await pagina.waitForSelector('[data-portico-slot] canvas', { timeout: TETO_MONTAGEM })
    // Uma folga depois do canvas: compilação de shader e primeiro quadro caem
    // fora das marcas de textura e ainda assim são custo de montagem.
    await esperar(2_000)

    // A FOTO DA CENA, e ela não é enfeite do relatório.
    //
    // Otimização de montagem mexe em ordem de compilação, de envmap e de
    // primeiro quadro — e o jeito de estragar a imagem sem nenhum teste cair é
    // exatamente esse: a cena continua subindo, só que sem reflexo, sem sombra
    // ou plana. `MEDIR_FOTO=arquivo.png` guarda o quadro para comparar com o
    // de antes da mudança.
    const foto = process.env.MEDIR_FOTO
    if (foto) {
      const alvo = pagina.locator('[data-portico-slot]')
      await alvo.screenshot({ path: foto })
      console.log(`foto da cena: ${foto}`)
    }

    const { marcas, tarefas } = await pagina.evaluate(() => ({
      marcas: performance
        .getEntriesByType('measure')
        .filter((entrada) => entrada.name.startsWith('portico:'))
        .map((entrada) => ({ name: entrada.name, duration: entrada.duration })),
      tarefas: (window as unknown as { __tarefas: Tarefa[] }).__tarefas,
    }))

    relatar(marcas, tarefas)
  } finally {
    await navegador.close()
    servidor.kill()
  }
}

function relatar(marcas: Marca[], tarefas: Tarefa[]) {
  const total = marcas.find((m) => m.name === 'portico:buildAssets')
  const montagem = marcas.find((m) => m.name === 'portico:ateOPrimeiroQuadro')
  const rota = marcas.find((m) => m.name.startsWith('portico:mapas-'))
  const fixas = ['portico:buildAssets', 'portico:ateOPrimeiroQuadro']
  const etapas = marcas
    .filter((m) => !fixas.includes(m.name) && !m.name.startsWith('portico:mapas-'))
    .sort((a, b) => b.duration - a.duration)

  if (rota) {
    const nome = rota.name.replace('portico:mapas-', '')
    const onde = nome === 'worker' ? 'WORKER (fora da thread principal)' : 'EMERGÊNCIA (na thread principal!)'
    console.log(`\nOnde os cinco mapas nasceram: ${onde} — ${rota.duration.toFixed(0)} ms de relógio`)
  } else {
    console.log('\nOnde os cinco mapas nasceram: marca ausente')
  }

  console.log('\n=== Construção das texturas (thread principal) ===')
  if (etapas.length === 0) {
    console.log('nenhuma marca `portico:*` — a cena não montou (WebGL indisponível?)')
    return
  }
  const soma = total?.duration ?? etapas.reduce((acc, m) => acc + m.duration, 0)
  for (const etapa of etapas) {
    const nome = etapa.name.replace('portico:', '')
    const fatia = ((etapa.duration / soma) * 100).toFixed(0)
    console.log(`${etapa.duration.toFixed(1).padStart(8)} ms  ${fatia.padStart(3)}%  ${nome}`)
  }
  console.log(`${soma.toFixed(1).padStart(8)} ms  100%  TOTAL (buildAssets)`)

  if (montagem) {
    const resto = montagem.duration - soma
    console.log('\n=== Montagem completa (renderer -> primeiro quadro) ===')
    console.log(`${soma.toFixed(1).padStart(8)} ms  ${((soma / montagem.duration) * 100).toFixed(0).padStart(3)}%  texturas + geometria (buildAssets)`)
    console.log(`${resto.toFixed(1).padStart(8)} ms  ${((resto / montagem.duration) * 100).toFixed(0).padStart(3)}%  resto (grafo de cena, envmap, COMPILAÇÃO DE SHADER)`)
    console.log(`${montagem.duration.toFixed(1).padStart(8)} ms  100%  TOTAL`)
  }

  console.log('\n=== Tarefas longas (>50 ms) ===')
  if (tarefas.length === 0) {
    console.log('nenhuma registrada')
  } else {
    const somaTarefas = tarefas.reduce((acc, t) => acc + t.duration, 0)
    for (const tarefa of tarefas.sort((a, b) => b.duration - a.duration).slice(0, 10)) {
      console.log(`${tarefa.duration.toFixed(1).padStart(8)} ms  em t+${(tarefa.start / 1000).toFixed(2)}s`)
    }
    console.log(`${somaTarefas.toFixed(1).padStart(8)} ms  em ${tarefas.length} tarefas`)
  }
  console.log()
}

await medir()
