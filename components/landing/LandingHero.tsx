import type { Dictionary } from '@/content/types'
import { MUTED_ESCURO } from './polaridade'
import { BotaoWhatsapp } from './Botao'
import { ArteAbertura } from './arte'

/**
 * Primeira dobra. Precisa passar o teste que o NN/g mostrou que a maioria dos
 * sites B2B reprova: *o que essa empresa faz, e isso é para mim?*
 *
 * Sem preço aqui, de propósito (spec §4.1). Das páginas brasileiras que
 * publicam piso, nenhuma o coloca na dobra — o piso qualifica DEPOIS de
 * convencer. Antes disso ele só filtra.
 */
export function LandingHero({ dict }: { dict: Dictionary }) {
  const { hero, cta } = dict.landing

  return (
    // Mais alto e com a arte maior do que na primeira versão. Medida a página
    // inteira, o hero era a seção MAIS CURTA dela (~450px contra 900+ das
    // outras) — e é a única que 100% dos visitantes veem por inteiro. Seção
    // curta demais no topo faz a página começar sem peso e empurra tudo o que
    // importa para baixo do orçamento de atenção.
    // `relative` só para ancorar a malha de pontos, que é `absolute`.
    // O HERO FICOU ESCURO, e é a maior mudança de polaridade que esta página
    // já teve. Decisão do dono, com o custo conhecido e aceito: o `globals.css`
    // registra que a landing nasceu clara porque fala com dono de empresa no
    // celular sob luz variável, e a vantagem da polaridade positiva CRESCE
    // conforme a fonte diminui. O `<h1>`, gigante, quase não sente; quem paga
    // é o texto de apoio de 17–19px.
    //
    // O que a mudança compra: a arte da abertura é uma peça com brilho, e
    // brilho não existe sobre papel — sobre claro, bloom vira borrão cinza.
    // Num painel escuro recortado ela lia como adesivo colado; na faixa
    // escura inteira ela pertence à página.
    //
    // E A `Dupla` LOGO ABAIXO VIROU CLARA no mesmo movimento, obrigatoriamente:
    // a página alterna bandas, e duas escuras coladas virariam um bloco só de
    // ~1400px com a fronteira dissolvida logo na abertura.
    // `MUTED_ESCURO`: o SUBTÍTULO desta seção usa `text-muted` — é o primeiro
    // parágrafo que qualquer visitante lê, e estava a 5,90:1. Ver ./polaridade.
    <section className="relative bg-ink text-paper" style={MUTED_ESCURO}>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 py-24 sm:py-36 md:flex-row md:items-center md:gap-16">
      {/* MALHA DE PONTOS atrás da dobra (ver app/globals.css). Dos fundos do
        * catálogo do Magic UI é um dos poucos que sobrevive em papel, porque
        * não emite luz — é subtração, não brilho. Aurora, Meteors e Light Rays
        * precisam de preto para existir.
        *
        * `inset-0` e NÃO uma sangria além da coluna: um `absolute` mais largo
        * que a viewport entra no cálculo de overflow do documento e cria barra
        * de rolagem horizontal — que é exatamente o que o e2e da landing
        * proíbe. E seria trabalho perdido: a máscara já chega transparente na
        * borda da coluna (raio de 70% da largura, dissolvido a 70% dele), então
        * a versão sangrada e esta desenham praticamente o mesmo pixel.
        *
        * `-z-10` a mantém atrás do conteúdo; `pointer-events-none` impede que
        * ela roube o clique do botão. */}
      <div
        aria-hidden="true"
        className="malha-pontos pointer-events-none absolute inset-0 -z-10"
      />
      {/* A partir de `md` o hero vira duas colunas e a arte ocupa a direita —
       *  mesmo gesto que o pórtico faz no hero do portfólio, sem o custo de
       *  WebGL, que esta rota não pode pagar (spec §5.6).
       *
       *  No celular ela some inteira (`hidden md:block` abaixo). Não é
       *  desistência: o eyetracking do NN/g mede 65% da atenção nos primeiros
       *  40% da página, e no celular isso são as duas primeiras rolagens. Uma
       *  arte ali empurraria o CTA e o argumento para fora desse orçamento
       *  para ganhar o quê — enfeite. */}
      <div className="flex flex-col gap-8 md:flex-1">
        <div className="flex flex-col gap-5">
          {/* A SERIFA ITÁLICA SÓ NAS ÚLTIMAS PALAVRAS.
           *
           * Assinatura de página cara em 2026 — aparece em três dos seis
           * exemplos premium levantados na pesquisa, sempre igual: sans no
           * corpo, serifa itálica no que precisa parar o olho. Três ou quatro
           * palavras no site inteiro; mais que isso e ela deixa de ser destaque
           * e vira o tom da página.
           *
           * Vem de chave própria no dicionário, não de marcador dentro da
           * string. O portão de GEO compara o dicionário com o HTML entregue, e
           * um asterisco que existisse num e não no outro quebraria justamente
           * a comparação que ele existe para fazer.
           *
           * `font-normal` porque o resto do título é `font-bold`: em serifa
           * itálica o peso alto fecha os contraformas e a palavra borra no
           * tamanho grande. */}
          {/* ESCALONAMENTO DA ENTRADA (`.entrar` + `--i`, ver globals.css).
            * Título, subtítulo e botão montam em sequência de 90ms. É a única
            * animação por TEMPO da página — todo o resto responde à rolagem —
            * e existe porque o hero já nasce na tela: a timeline de rolagem
            * não tem o que revelar aqui.
            *
            * A ordem é a da leitura. Escalonar na ordem inversa, ou tudo de
            * uma vez, desperdiça o único gesto que a página faz enquanto o
            * visitante ainda está decidindo se fica. */}
          <h1
            style={{ '--i': 0 } as React.CSSProperties}
            className="entrar text-balance font-sans text-5xl font-bold leading-[1.05] tracking-tight text-paper sm:text-6xl lg:text-7xl"
          >
            {hero.titulo}{' '}
            <span className="font-serif font-normal italic tracking-normal">{hero.tituloDestaque}</span>
          </h1>
          <p
            style={{ '--i': 1 } as React.CSSProperties}
            className="entrar max-w-2xl text-balance text-[19px] leading-relaxed text-muted sm:text-xl"
          >
            {hero.subtitulo}{' '}
            <span className="font-serif text-[21px] italic text-paper sm:text-[23px]">{hero.subtituloDestaque}</span>
          </p>
        </div>

        <div style={{ '--i': 2 } as React.CSSProperties} className="entrar flex flex-col gap-3">
          {/* `target="_blank" rel="noreferrer"`, igual a Contact.tsx para a
           * MESMA URL de wa.me — sem isso, no desktop o clique navega a aba
           * inteira para fora e a landing desaparece; no navegador embutido do
           * Instagram (fonte de tráfego que o spec cita), sem stack de "voltar"
           * confiável, a troca de aba pode encerrar a sessão de vez (achado I3
           * Important da revisão final de branch). */}
          {/* `variante="claro"` porque o hero virou faixa escura. O padrão é
            * `escuro` (`bg-ink text-paper`), que sobre o novo fundo desapareceu
            * por completo: o botão ficou preto sobre preto e sobrou só o rótulo
            * solto, sem alvo visível. O componente já tinha a variante certa —
            * ela existe exatamente para as faixas escuras da página. */}
          <BotaoWhatsapp numero={dict.contact.whatsapp} mensagem={cta.mensagem} variante="claro">
            {cta.rotulo}
          </BotaoWhatsapp>
          {/* Corpo, não rótulo: onze palavras em duas frases, não 1–3 palavras
           * de etiqueta — a regra global de 17px mínimo vale aqui (o brief
           * original botou isto em mono/caixa-alta/12px e passou por cima da
           * própria regra; decisão do dono: 17px vence).
           *
           * A frase carrega o diferencial mais forte que a pesquisa achou: a
           * dupla é a única configuração que neutraliza as duas objeções do
           * mercado — agência cobra estrutura que não escreve seu código,
           * freelancer sozinho é ponto único de falha. A pesquisa mandou pôr
           * isso na dobra; formatado pequeno e em caixa alta, ficava
           * enterrado. Caixa alta com tracking é o pior caso de legibilidade,
           * e 12px no celular sob sol é exatamente o que inverter a polaridade
           * do tema queria consertar. */}
          <p className="text-[17px] leading-relaxed text-muted">{hero.assinatura}</p>
        </div>
      </div>

      <div style={{ '--i': 3 } as React.CSSProperties} className="entrar hidden md:block md:w-[46%]">
        <ArteAbertura textos={dict.landing.arte} />
      </div>
      </div>
    </section>
  )
}
