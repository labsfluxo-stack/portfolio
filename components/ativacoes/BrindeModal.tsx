'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { Dictionary } from '@/content/types'
import { BrindeSlot, PECAS, type Peca } from '@/components/three/BrindeSlot'
import { hasWebGL } from '@/components/three/BrindeSlot'

/**
 * O modal que abre no fim de partida: uma caneca em 3D com a marca do
 * VISITANTE aplicada — não um exemplo genérico. É o que faz um diretor de
 * atendimento de agência ver a própria conta ali e encaminhar a página para
 * um colega, em vez de "mais um site de portfólio".
 *
 * A ENTRADA DE MARCA É SÓ COR + NOME, DE PROPÓSITO. Upload de logo foi
 * cogitado e descartado: traz validação de imagem, formato, tamanho e uma
 * pilha de casos de borda sem mudar o que a pessoa sente ao ver a própria
 * marca no objeto — cor e nome já entregam isso, e o escopo desta tarefa é
 * "um brinde, feito por inteiro", não "um sistema de upload".
 *
 * O CHUNK DE THREE.JS SÓ CARREGA AQUI. `CanecaSlot` (e, por trás dele,
 * `Caneca.tsx`, via `next/dynamic`) só entra na árvore quando `aberto` é
 * verdadeiro — não quando o `<dialog>` existe no DOM, mas fechado. Quem
 * nunca clica no botão abaixo nunca busca esse chunk.
 *
 * `<dialog>`, não uma `<div role="dialog">` montada à mão: o elemento nativo
 * já entrega de graça o que o brief pede — `showModal()` deixa o resto do
 * documento inerte (inalcançável por Tab, mesmo sem `inert` escrito em
 * lugar nenhum) e fecha sozinho no Escape (evento `cancel`). O que o
 * elemento NÃO garante sozinho, cross-browser, é o foco voltando ao gatilho
 * ao fechar — por isso o `useEffect` abaixo faz isso explicitamente, para
 * os três caminhos de fechamento (Escape, botão de fechar, clique fora)
 * caírem no mesmo lugar: todos disparam o evento `close`.
 */

/** Cor de marca inicial — nunca um tom da própria paleta do site
 *  (`--color-data`, `--color-warn`, etc.): a caneca existe para mostrar a
 *  marca de QUEM ESTÁ OLHANDO, e um azul que já é a cor do site pareceria
 *  "a cor padrão daqui", não um placeholder óbvio de trocar. */
const COR_PADRAO = '#E1592A'

export function BrindeModal({ dict }: { dict: Dictionary }) {
  const { brinde, capa } = dict.ativacoes
  const dialogRef = useRef<HTMLDialogElement>(null)
  const gatilhoRef = useRef<HTMLButtonElement>(null)
  const fecharRef = useRef<HTMLButtonElement>(null)
  const [aberto, setAberto] = useState(false)
  const [corMarca, setCorMarca] = useState(COR_PADRAO)
  const [nomeMarca, setNomeMarca] = useState(brinde.nomePadrao)
  const [peca, setPeca] = useState<Peca>('caneca')
  // O seletor só existe se houver WebGL: sem ele o slot cai num plano em
  // DOM que é sempre a caneca (ver BrindeSlot.tsx), e oferecer três opções
  // que devolvem a mesma figura seria prometer uma escolha que não existe.
  // `null` até o efeito rodar, mesma disciplina do slot.
  const [temWebgl, setTemWebgl] = useState<boolean | null>(null)
  useEffect(() => {
    if (aberto && temWebgl === null) setTemWebgl(hasWebGL())
  }, [aberto, temWebgl])
  const idTitulo = useId()
  const idDescricao = useId()

  // Abre o `<dialog>` de verdade (o `useState` só decide SE ele deve estar
  // aberto; quem efetivamente exibe é `showModal()`) e move o foco para
  // dentro dele. O foco é explícito, e não confiado ao algoritmo de
  // autofoco nativo do `<dialog>`: o requisito é "foco DENTRO do diálogo",
  // e o botão de fechar é um alvo estável — o primeiro elemento interativo,
  // sempre presente, qualquer que seja o estado dos campos de marca.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || !aberto) return
    if (typeof dialog.showModal === 'function') dialog.showModal()
    else dialog.setAttribute('open', '')
    fecharRef.current?.focus()
  }, [aberto])

  // Um único handler para os três caminhos de fechamento — Escape (o
  // `<dialog>` dispara `cancel` e, em seguida, `close`), o botão de fechar
  // (`fechar()`, abaixo, chama `.close()`) e um clique no backdrop (mesma
  // chamada). Sincroniza o estado do React e devolve o foco ao gatilho —
  // sem isso, fechar pelo Escape devolveria o foco para o topo do
  // documento, não para o botão que abriu o modal.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const aoFechar = () => {
      setAberto(false)
      gatilhoRef.current?.focus()
    }
    dialog.addEventListener('close', aoFechar)
    return () => dialog.removeEventListener('close', aoFechar)
  }, [])

  // A rolagem do documento por trás não é parte do requisito de teclado
  // (o `<dialog>` modal já cobre Tab e Escape sozinho), mas arrastar a
  // barra de rolagem ou girar a roda do mouse sobre o backdrop ainda move a
  // página por baixo em alguns navegadores — trava isso enquanto o modal
  // está aberto.
  useEffect(() => {
    if (!aberto) return
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = anterior
    }
  }, [aberto])

  const fechar = () => dialogRef.current?.close()

  // Nunca vazio: campo em branco (a pessoa apagou tudo) cai no nome padrão,
  // tanto na pré-visualização quanto na legenda — o mesmo cuidado que
  // `criarTexturaCaneca` já toma para quem chamar a função sem passar pelo
  // modal.
  const nomeExibido = nomeMarca.trim() || brinde.nomePadrao

  return (
    <>
      {/* FUNDO SÓLIDO, não contorno (tarefa 6 do redesign do painel de fim,
        * spec §4): o botão de outline lia bem sobre o fundo escuro chapado
        * do site, mas o painel de fim ganhou fundo próprio (`bg-surface`) e
        * um contorno da mesma cor da borda do painel desaparecia contra ele.
        * `bg-data`, a cor de destaque do site: é o botão do PRÊMIO, e só
        * existe na tela depois de ganho — merece ler como o mais importante
        * dos dois, não como um botão secundário igual ao de recomeçar. */}
      <button
        ref={gatilhoRef}
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex min-h-12 items-center justify-center rounded-md bg-data px-6 text-[17px] font-semibold text-bg transition-opacity hover:opacity-80"
      >
        {capa.fim.brinde}
      </button>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions,
          jsx-a11y/click-events-have-key-events -- o onClick aqui só detecta
          clique no BACKDROP para fechar (ver o comentário abaixo), um gesto
          só de ponteiro por natureza; quem usa teclado já tem Escape, que o
          próprio `<dialog>` cobre nativamente sem precisar de handler
          nenhum. O conteúdo interativo de verdade mora nos elementos
          filhos, cada um com seu próprio papel semântico e sua própria
          acessibilidade por teclado. */}
      <dialog
        ref={dialogRef}
        // `role="dialog"` NÃO está escrito aqui: `<dialog>` já carrega esse
        // papel implícito, e o próprio `eslint-plugin-jsx-a11y`
        // (`no-redundant-roles`) reprova declará-lo de novo. O requisito de
        // acessibilidade do brief ("role=dialog") continua satisfeito —
        // só não como atributo literal.
        aria-modal="true"
        aria-labelledby={idTitulo}
        aria-describedby={idDescricao}
        onClick={(evento) => {
          // Clique que chega ao PRÓPRIO `<dialog>` só pode ter caído no
          // backdrop: o conteúdo real mora no `<div>` interno, que cobre a
          // caixa inteira e absorveria o clique antes dele borbulhar até
          // aqui. Fecha do mesmo jeito que o botão de fechar — mesmo
          // caminho, mesmo evento `close`.
          if (evento.target === dialogRef.current) fechar()
        }}
        className="m-auto max-h-[88vh] w-[min(30rem,92vw)] overflow-y-auto rounded-lg border border-border bg-surface p-0 text-text backdrop:bg-bg/80"
      >
        <div className="flex flex-col gap-5 p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <h2 id={idTitulo} className="font-serif text-2xl tracking-tight text-text">
              {brinde.titulo}
            </h2>
            <button
              ref={fecharRef}
              type="button"
              aria-label={brinde.fechar}
              onClick={fechar}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border text-lg leading-none text-muted transition-opacity hover:opacity-80"
            >
              {/* `aria-hidden`: o × é decoração do botão, o nome acessível
                  já vem do `aria-label` acima. */}
              <span aria-hidden="true">×</span>
            </button>
          </div>
          <p id={idDescricao} className="text-[17px] leading-relaxed text-muted">
            {brinde.descricao}
          </p>

          {/* A pré-visualização. `aberto &&`, não CSS escondendo o
              `<dialog>` fechado: é ISTO que garante que ninguém busca o
              chunk de three.js sem clicar — ver o cabeçalho do arquivo. */}
          <div className="aspect-[4/3] w-full overflow-hidden rounded-md border border-border bg-surface-2">
            {aberto && <BrindeSlot peca={peca} corMarca={corMarca} nomeMarca={nomeExibido} />}
          </div>
          {/* A legenda em DOM real — o canvas WebGL acima é decoração
              (`aria-hidden`, ver `Caneca.tsx`), então é esta linha, e não a
              cena, que carrega a informação "qual marca está sendo
              mostrada" para quem usa leitor de tela. */}
          <p className="text-[17px] text-muted">
            {brinde.legenda.replace('{peca}', brinde.pecas[peca]).replace('{marca}', nomeExibido)}
          </p>

          {/* O SELETOR DE PEÇA. `radiogroup` de verdade, com `<input
              type="radio">` reais escondidos visualmente mas não do leitor
              de tela: é o controle nativo que já dá navegação por setas,
              anúncio de "1 de 3" e o estado marcado — coisas que um punhado
              de `<button aria-pressed>` teria que reimplementar pior.

              Escondido sem WebGL: ver o comentário do estado `temWebgl`. */}
          {temWebgl ? (
            <fieldset className="flex flex-col gap-2">
              <legend className="text-[17px] text-text">{brinde.rotuloPeca}</legend>
              <div className="flex flex-wrap gap-2">
                {PECAS.map((chave) => (
                  <label
                    key={chave}
                    className={`inline-flex min-h-12 cursor-pointer items-center rounded-md border px-4 text-[17px] transition-opacity hover:opacity-80 ${
                      peca === chave
                        ? 'border-data text-text'
                        : 'border-border text-muted'
                    }`}
                  >
                    <input
                      type="radio"
                      name="brinde-peca"
                      value={chave}
                      checked={peca === chave}
                      onChange={() => setPeca(chave)}
                      className="sr-only"
                    />
                    {brinde.pecas[chave]}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-[17px] text-text">
              {brinde.rotuloCor}
              <input
                type="color"
                value={corMarca}
                onChange={(evento) => setCorMarca(evento.target.value)}
                className="h-12 w-full cursor-pointer rounded-md border border-border bg-transparent"
              />
            </label>
            <label className="flex flex-col gap-1 text-[17px] text-text">
              {brinde.rotuloNome}
              <input
                type="text"
                value={nomeMarca}
                onChange={(evento) => setNomeMarca(evento.target.value)}
                maxLength={24}
                placeholder={brinde.nomePadrao}
                className="h-12 rounded-md border border-border bg-transparent px-3 text-[17px] text-text"
              />
            </label>
          </div>
        </div>
      </dialog>
    </>
  )
}
