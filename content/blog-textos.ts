/**
 * OS TEXTOS DO BLOG, SÓ EM PORTUGUÊS — e é por isso que eles não moram no
 * `Dictionary`.
 *
 * O `Dictionary` é o contrato bilíngue do site: todo campo existe nos dois
 * idiomas, e `tests/content.test.ts` varre a estrutura inteira exigindo
 * paridade. O blog sai só em português por decisão do dono (ver
 * `content/posts.ts`), então declarar estes rótulos lá obrigaria a escrever uma
 * tradução inglesa que nenhuma página jamais renderiza — texto morto que o
 * teste de paridade passa a proteger, o que é pior do que não tê-lo.
 *
 * O dia em que o blog ganhar inglês, estes campos migram para o `Dictionary` e
 * este arquivo desaparece. Enquanto isso ele é o lugar honesto: um dicionário
 * de um idioma só, dito em voz alta.
 */
export const blogTextos = {
  meta: {
    titulo: 'Blog — Neto Alves',
    descricao:
      'Textos sobre construir software que carrega rápido, aparece no Google e é lido pelas IAs. Números medidos, fontes declaradas.',
  },
  indice: {
    titulo: 'Blog',
    lead: 'O que a gente mede construindo software para aparecer nas buscas e nas IAs. Números com fonte, sem promessa de atalho.',
    vazio: 'Ainda não há nada publicado.',
  },
  chrome: {
    /** O `<nav>` precisa de nome acessível: há dois no documento (topo e rodapé). */
    navTopo: 'Navegação do blog',
    navRodape: 'Links do rodapé',
    paraHome: 'Neto Alves',
    paraBlog: 'Blog',
    paraProjetos: 'Serviços',
  },
  post: {
    publicadoEm: 'Publicado em',
    atualizadoEm: 'Atualizado em',
    /** Sufixo do tempo estimado. O número vem contado do arquivo, nunca escrito. */
    minutos: 'min de leitura',
    indiceTitulo: 'Neste artigo',
    voltar: 'Todos os artigos',
    anterior: 'Anterior',
    proximo: 'Próximo',
  },
  cta: {
    titulo: 'Precisa de um site que a IA consiga ler?',
    corpo: 'Conte o que precisa existir e a gente diz o que dá para fazer.',
    botao: 'Quero um orçamento',
    mensagem: 'Olá, Neto! Vi um artigo no blog e quero conversar sobre um projeto.',
  },
} as const
