import type { Dictionary } from '@/content/types'
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
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 py-24 sm:py-36 md:flex-row md:items-center md:gap-16">
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
          <h1 className="text-balance font-sans text-5xl font-bold leading-[1.05] tracking-tight text-ink sm:text-6xl lg:text-7xl">
            {hero.titulo}{' '}
            <span className="font-serif font-normal italic tracking-normal">{hero.tituloDestaque}</span>
          </h1>
          <p className="max-w-2xl text-balance text-[19px] leading-relaxed text-ink-2 sm:text-xl">
            {hero.subtitulo}{' '}
            <span className="font-serif text-[21px] italic text-ink sm:text-[23px]">{hero.subtituloDestaque}</span>
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {/* `target="_blank" rel="noreferrer"`, igual a Contact.tsx para a
           * MESMA URL de wa.me — sem isso, no desktop o clique navega a aba
           * inteira para fora e a landing desaparece; no navegador embutido do
           * Instagram (fonte de tráfego que o spec cita), sem stack de "voltar"
           * confiável, a troca de aba pode encerrar a sessão de vez (achado I3
           * Important da revisão final de branch). */}
          <BotaoWhatsapp numero={dict.contact.whatsapp} mensagem={cta.mensagem}>
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
          <p className="text-[17px] leading-relaxed text-ink-2">{hero.assinatura}</p>
        </div>
      </div>

      <div className="hidden md:block md:w-[44%]">
        <ArteAbertura />
      </div>
    </section>
  )
}
