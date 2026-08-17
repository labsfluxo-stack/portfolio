export const locales = ['pt', 'en'] as const
export type Locale = (typeof locales)[number]

export const SYSTEM_SLUGS = ['oscapstack', 'saturno-labs', 'moveis-pro'] as const
export type SystemSlug = (typeof SYSTEM_SLUGS)[number]

/**
 * Um número de telemetria já traduzido, formatado e com procedência declarada.
 * Alimenta diretamente `<Metric value label provenance numeric? suffix?>`
 * (componentes/ui/Metric.tsx, Task 2) — por isso carrega mais do que o valor
 * bruto: nenhum número chega ao componente sem rótulo e procedência vindos
 * do dicionário (regra global "todo número exibido carrega procedência").
 */
export type MetricValue = {
  /** Identificador estável do número (ex.: usado como `key` de lista). */
  key: string
  /** Rótulo já traduzido, ex.: "Linhas de código". */
  label: string
  /** Valor já formatado, ex.: "250.000+". */
  value: string
  /** Como e quando o número foi medido. Nenhum número exibido fica sem isso. */
  provenance: string
  /** Valor numérico, quando o contador deve animar. */
  numeric?: number
  suffix?: string
}

export type StackItem = { name: string; level: 'dominio' | 'producao' | 'contato' }

export type StackLayer = {
  label: string
  /** `repo` = comprovado em código auditado. `experience` = experiência profissional declarada. */
  source: 'repo' | 'experience'
  items: StackItem[]
}

export type CaseStudy = {
  name: string
  tagline: string
  problem: string
  architecture: string
  decisions: { title: string; body: string }[]
  stack: string[]
  /**
   * O que o sistema mudou para a empresa, em três frases curtas. É o que o
   * card da home mostra no lugar onde antes ficavam as métricas técnicas
   * (146 RLS policies, 14 packages, 40 models).
   *
   * A troca é de público: número de tabela e de package responde à pergunta
   * de um recrutador, e a home é onde um dono de negócio decide se continua
   * lendo. Os números não sumiram — vivem no cabeçalho do case study e na
   * Telemetria, a uma rolagem dali. O funil ficou: resultado na home,
   * profundidade técnica para quem clicar atrás dela.
   *
   * SEMPRE TRÊS, e é requisito de layout: os cards ficam lado a lado numa
   * grade e uma lista mais longa que a vizinha desalinha a fileira inteira.
   *
   * Cada frase descreve uma MUDANÇA, não um recurso — "três canais num lugar
   * só" (antes eram três lugares), nunca "integração com três canais". E
   * nenhuma pode carregar número de resultado que ninguém mediu; vale aqui a
   * mesma regra de `outcome`.
   */
  improvements: string[]
  /**
   * Tamanho e composição do time. Aparece no cabeçalho, junto dos selos.
   *
   * Era a informação MAIS ausente dos cases: nada dizia se o sistema foi
   * feito por uma pessoa ou por dez, e essa é a primeira pergunta que um
   * recrutador faz diante de 78.900 linhas. Sem resposta, ele resolve a
   * ambiguidade sozinho — e resolve pelo lado pessimista.
   *
   * Declarar o time de dois FORTALECE os números em vez de diminuí-los: essa
   * escala feita por duas pessoas é crível e rara; por uma só, força a
   * credulidade de quem já entregou software e sabe o que custa.
   *
   * Nunca escrever nada aqui que sugira trabalho solo — não foi.
   */
  team: string
  /**
   * Tempo de construção. Fica colado no `team`, e a ordem importa: o time é
   * o denominador do prazo.
   *
   * O prazo do OSCapstack já esteve no parágrafo de arquitetura ("26 dias") e
   * foi removido de lá por um motivo que valia enquanto o time era
   * desconhecido — velocidade sem denominador se lê tão facilmente como
   * "apressado" quanto como "rápido". Com o time de dois declarado ao lado, a
   * conta fecha na cabeça do leitor e o prazo deixa de ser ambíguo.
   *
   * Precisão variável de propósito: onde o histórico do repositório dá o
   * número exato, vai o exato; onde só existe o limite que o dono afirma, vai
   * o limite. Arredondar para baixo o que não foi medido seria inventar.
   */
  duration: string
  /**
   * O que mudou para o cliente. Fecha a página.
   *
   * Opcional porque depende de fato que só o dono tem: o estado ANTES do
   * sistema e o que passou a ser possível depois. Sem esse fato não se
   * escreve — inventar resultado é a única mentira que um portfólio não
   * sobrevive. O case que não tiver termina no stack, e pronto.
   *
   * Ocupa a posição onde ficava "O que eu faria diferente", e a troca é
   * proposital: mesmo lugar de fecho, valência oposta. A última coisa que o
   * leitor vê passa a ser o ganho do cliente, não o erro do autor.
   *
   * NUNCA colocar aqui número de resultado que não tenha sido medido.
   * "Reduziu 40% do tempo" sem medição é exatamente a afirmação que o resto
   * do site foi construído para não fazer.
   */
  outcome?: string
}

export type Dictionary = {
  meta: { title: string; description: string; ogAlt: string }
  nav: { about: string; systems: string; stack: string; contact: string; cv: string }
  a11y: { skipToContent: string; localeSwitch: string; openMenu: string; mainNav: string }
  boot: { lines: string[] }
  hero: {
    name: string
    role: string
    tagline: string
    availability: string
    scrollHint: string
  }
  telemetry: {
    label: string
    metrics: MetricValue[]
    secondaryLabel: string
    secondary: MetricValue[]
    /**
     * UMA linha de procedência para a seção inteira, no rodapé dela.
     *
     * A procedência de cada métrica continua existindo em `MetricValue`, e
     * continua no HTML — só saiu de baixo de cada número, onde aparecia como
     * um parágrafo. Nove parágrafos de "medido em tal data, contado assim"
     * na mesma tela não leem como rigor, leem como quem precisa provar que
     * sabe. Um profissional afirma o número; quem justifica cada um deles
     * parece estar se defendendo de uma acusação que ninguém fez.
     *
     * O detalhe completo sobrevive no `title` de cada número, para quem de
     * fato quiser conferir — que é a diferença entre ter a prova e exibi-la.
     */
    provenanceNote: string
  }
  about: {
    label: string
    lead: string
    body: string[]
    photoAlt: string
    photoPending: string
    experience: { label: string; years: string; body: string; vendors: string[] }
    education: {
      label: string
      technical: { label: string; items: string[] }
      degree: { label: string; items: string[] }
      certifications: { label: string; institution: string; items: string[] }
    }
  }
  systems: {
    label: string
    /**
     * Era a única seção do site sem parágrafo de abertura — ia do rótulo
     * direto para os três cards.
     *
     * E o buraco não era só estrutural: o site inteiro descrevia COMO o dono
     * constrói (modela o banco, escreve a API, sobe o deploy) e nenhuma
     * linha dizia o que aquilo faz por uma empresa. Um recrutador técnico se
     * satisfaz com o "como"; um dono de negócio saía sabendo que ele é
     * competente e sem saber o que ganharia.
     *
     * Os exemplos citados aqui são EXEMPLOS, não o cardápio — a frase
     * termina em aberto de propósito, porque o problema é o que o cliente
     * traz, e a forma de resolver vem depois dele.
     */
    lead: string
    /**
     * Dois eixos independentes de badge por sistema (ver `System.production` e
     * `System.proprietary` em `content/systems.ts`): um sistema pode exibir
     * os dois badges, um só, ou nenhum. Não é um enum de status único.
     */
    statusLabels: Record<'production' | 'proprietary', string>
    readCase: string
    /** Rótulo do link de repositório (quando `System.repoUrl` existe) — nunca
     * a URL crua como texto de link, que é ruído visual e péssimo para
     * leitor de tela. */
    viewRepo: string
    /** Rótulo traduzido por chave de `System.metrics[].key` (content/systems.ts).
     * Termos que já são jargão em inglês no mercado (endpoints, packages,
     * models, commits, RLS policies) ficam iguais nos dois idiomas de
     * propósito — traduzir soaria pior para o leitor técnico desta seção. */
    metricLabels: Record<string, string>
    detail: Record<SystemSlug, CaseStudy>
    caseLabels: {
      problem: string
      architecture: string
      decisions: string
      stack: string
      outcome: string
      backToHome: string
    }
    /**
     * Rótulos dos diagramas de arquitetura (components/diagrams/). Um bag
     * único e compartilhado, não um por sistema: `api`, `database` e `store`
     * aparecem em mais de um desenho, e duplicar a tradução por slug abriria
     * a porta para os três divergirem entre si.
     *
     * Só entra aqui o que É PROSA. Nome de tecnologia — Fastify, PostgreSQL,
     * pgvector, BullMQ, Redis, React, Astro, Next.js, Prisma, WhatsApp,
     * healthchecks.io — é escrito direto no componente do diagrama: não é
     * conteúdo traduzível, e passar pelo dicionário só criaria a chance de
     * alguém "traduzir" um nome próprio.
     */
    diagram: {
      admin: string
      consultant: string
      landing: string
      api: string
      database: string
      policies: string
      screens: string
      watchdog: string
      alarm: string
      providers: string
      queue: string
      jobs: string
      blocklist: string
      judge: string
      humanApproval: string
      locks: string
      budget: string
      store: string
      tenantScope: string
      salesApp: string
      offline: string
      sync: string
      models: string
      packages: string
    }
  }
  stack: {
    label: string
    lead: string
    /**
     * Rótulos CURTOS — uma palavra. Eles se repetem em toda camada (seis
     * cards), e a versão longa ("Domínio — usado em produção, sei depurar")
     * enchia a seção com a mesma explicação treze vezes. O que cada nível
     * significa é dito uma vez só, em `legend`.
     */
    levels: Record<'dominio' | 'producao' | 'contato', string>
    /** As três definições, juntas, uma única vez abaixo do lead. */
    legend: string
    /**
     * Etiqueta de origem por camada, também curta. Era uma frase
     * ("Comprovado em código auditado.") que aparecia em toda camada e fazia
     * a seção soar como um laudo. A distinção entre código e experiência
     * importa e fica — o que saiu foi o tom de defesa.
     */
    sourceNote: Record<'repo' | 'experience', string>
    layers: StackLayer[]
  }
  contact: {
    label: string
    lead: string
    form: {
      name: string
      email: string
      message: string
      submit: string
      sending: string
      success: string
      error: string
      honeypotLabel: string
    }
    /**
     * Para que serve cada canal. Sem isso os três viram uma lista de
     * endereços sem hierarquia — e "netoguild-rgb" sozinho não diz nem que
     * é GitHub.
     */
    channels: Record<'whatsapp' | 'email' | 'github', string>
    whatsapp: string
    whatsappMessage: string
    email: string
    github: string
    // linkedin ainda não foi fornecido pelo dono do site (2026-08-02). Quando
    // vier, adicionar `linkedin: string` aqui e nos dois dicionários — nunca
    // como string vazia, o teste de paridade recusa valor vazio.
    cvDownload: string
    /**
     * Link para a landing de captação. UM lugar só, e não no menu: "Projetos"
     * ao lado de "Sistemas" confunde, e o menu é justamente onde as duas
     * mensagens se atrapalhariam — o portfólio fala com recrutador, a landing
     * com dono de empresa.
     */
    landingLink: string
  }
  /**
   * Landing de captação (/[locale]/projetos). Separada de `contact` porque
   * fala com outro leitor: `contact` responde a recrutador que já leu o
   * portfólio; isto aborda dono de empresa que caiu aqui por um link.
   */
  landing: {
    meta: { title: string; description: string }
    hero: {
      titulo: string
      /** Duas ou três palavras em serifa itálica, coladas ao fim do título.
       *  Assinatura visual de página cara em 2026 — sans no corpo, serifa só
       *  no que precisa parar o olho. Chave separada, e não marcador dentro da
       *  string: o portão de GEO compara o dicionário com o HTML entregue, e
       *  um asterisco no dicionário que não existe na página quebraria a
       *  comparação — que é exatamente o que ela existe para pegar. */
      tituloDestaque: string
      subtitulo: string
      subtituloDestaque: string
      /** Aparece sob o CTA, na dobra. É onde a dupla entra pela primeira vez. */
      assinatura: string
    }
    cta: {
      /** Texto do botão. Primeira pessoa e específico — ver pesquisa §3.4. */
      rotulo: string
      /**
       * Mensagem que já vai escrita no WhatsApp. Diferente de
       * `contact.whatsappMessage`: quem chega aqui não veio pelo portfólio.
       */
      mensagem: string
      /**
       * Microtexto sob o botão. Existe porque o medo de quem clica não é o
       * preço, é ser perseguido por vendedor.
       */
      tranquilizador: string
    }
    criterio: { titulo: string; abertura: string; testes: { titulo: string; corpo: string }[]; fecho: string[] }
    oferta: { titulo: string; cartoes: { nome: string; corpo: string }[] }
    dupla: { titulo: string; corpo: string[]; numeros: { valor: string; rotulo: string }[] }
    prova: { titulo: string; lead: string; verCase: string }
    /**
     * Piso de preço. OPCIONAL POR DECISÃO, não por descuido: `null` ou string
     * vazia em `valor` fazem a seção não renderizar, o que permite publicar
     * antes de o valor estar decidido. Ver spec §4.6 — é a única decisão da
     * pesquisa com evidência direta de que move resultado, então o vazio é
     * estado temporário.
     */
    piso: { valor: string; nota: string } | null
    fechamento: { titulo: string; corpo: string }
    perguntas: { titulo: string; itens: { pergunta: string; resposta: string }[] }
    /** Uma linha só, na faixa escura depois do FAQ. Quem chegou até ali já leu
     *  tudo — repetir argumento seria insistência; o que falta é a porta. */
    fecho: string
    /**
     * A auditoria ao vivo — o único trecho interativo da página.
     *
     * A seção do critério manda o visitante fazer dois testes; isto faz o
     * segundo por ele, no site dele. A pesquisa apontou auditoria do próprio
     * prospect como a prova mais forte disponível: específica, impossível de
     * pré-fabricar, e serve de motivo para mandar mensagem.
     *
     * TODO VEREDITO MORA AQUI, não no Worker. Um backend que devolvesse
     * "seu site está ruim" enterraria decisão de produto dentro de
     * infraestrutura, longe de qualquer revisão de copy.
     */
    auditoria: {
      titulo: string
      descricao: string
      rotuloCampo: string
      exemplo: string
      botao: string
      carregando: string
      /** Quando o endereço digitado não vira URL nenhuma. */
      erroEndereco: string
      resultado: {
        /** Sufixo do número. O número em si vem do Worker, nunca daqui. */
        palavras: string
        legivel: string
        vazio: string
        /** Seguido da lista de robôs que o Worker devolveu. */
        /**
         * Site que nos barrou NÃO é site vazio. Reportar 403 como "a IA não vê
         * nada" seria afirmação falsa sobre o site de outra pessoa — numa
         * página cujo argumento é que suas afirmações se conferem.
         */
        bloqueado: string
        /**
         * E "não respondeu ok" NÃO É SINÔNIMO DE "recusou" — defeito que só
         * apareceu com o Worker no ar. Domínio inexistente volta 530 da borda
         * da Cloudflare, e a tela dizia ao visitante que o site DELE estava
         * barrando robôs, sobre um endereço que ele digitou errado.
         *
         * `bloqueado` afirma que o site recusou. Isto aqui não afirma de quem
         * é o problema, porque não dá para saber: cobre endereço errado,
         * domínio que não existe, site fora do ar, DNS e TLS quebrados.
         */
        inalcancavel: string
        /** Estourou o tempo de espera. Também não é veredito sobre o site. */
        tempo: string
        naoHtml: string
        construidoEm: string
        amostra: string
        /**
         * Tamanho e idade do site, lidos do sitemap.
         *
         * Esta é a medição que de fato explica a ausência do público desta
         * página nas respostas de IA. O teste de legibilidade quase sempre
         * passa — WordPress, Wix e Shopify entregam HTML pronto. O que falta
         * não é poder ler: é ter o que ler. Um institucional de cinco páginas
         * parado há dois anos é impecável e invisível.
         */
        paginas: string
        atualizadoEm: string
        /** Uma frase, sem alarme. A data já fala sozinha. */
        parado: string
        /**
         * A lista de verificação — o que o dono pediu como "score", feito sem
         * inventar nota.
         *
         * NÃO EXISTE NÚMERO COMPOSTO AQUI, de propósito. Uma nota agregada
         * precisa de peso — por que legibilidade valeria 40 pontos e
         * atualização 30? — e não há resposta defensável. O peso arbitrário é
         * o que faz do Domain Authority a métrica de vaidade que a pesquisa
         * lista entre os sinais de quem foi enganado: um número que sobe fácil
         * e não descreve nada.
         *
         * Uma lista de itens independentes é escaneável como nota e honesta
         * como medição: cada linha se sustenta sozinha.
         */
        /**
         * TRÊS GRUPOS, e eles não são enfeite de layout.
         *
         * Nove linhas soltas viram relatório, e relatório ninguém lê — some
         * exatamente a qualidade de bater o olho que motivou a lista existir.
         * Três blocos curtos se leem de relance.
         */
        grupos: { visivel: string; citavel: string; apresenta: string }
        checagens: {
          permissao: string
          idioma: string
          marcado: string
          vivo: string
          blog: string
          titulo: string
          descricao: string
          assunto: string
          cartao: string
        }
        /** Textos curtos ao lado de cada linha. */
        detalhes: {
          semTitulo: string
          semDescricao: string
          semAssunto: string
          assuntoDemais: string
          semMarcacao: string
          comMarcacao: string
          nenhumBloqueado: string
          semData: string
          semIdioma: string
          semBlog: string
          comBlog: string
          semCartao: string
          comCartao: string
        }
        /**
         * Dados estruturados aparecem na lista, mas com o limite dito na cara:
         * o teste em 1.885 páginas mostrou que citação em IA mal se moveu ao
         * adicioná-los. Eles servem para rich result no Google, que é outra
         * coisa. Vender como fator de citação é a alegação mais comum do
         * mercado e a de evidência mais fraca.
         */
        notaMarcacao: string
        /**
         * A leitura por IA — a peça mais próxima de DEMONSTRAÇÃO da ferramenta.
         * Não é métrica sobre o site: é um modelo lendo o site na frente do
         * dono, e dizendo o que não conseguiu determinar.
         */
        entendeu: string
        /** Rótulo da segunda metade: a lista de perguntas que o site não responde.
         *  É a parte que faz o dono entender o custo — ele reconhece nelas as
         *  mesmas perguntas que responde à mão todo dia. */
        entendeuFalta: string
        /**
         * A ressalva que precisa estar na tela, não só no código.
         *
         * Duas coisas: não é o ChatGPT, e não é medição (a resposta muda entre
         * execuções). Sem isso a leitura passaria por previsão do que o ChatGPT
         * diria — medir uma coisa e vender outra, que é o mecanismo da métrica
         * de vaidade.
         *
         * `{modelo}` É SUBSTITUÍDO PELO NOME QUE O WORKER MANDA, e o marcador
         * existe por causa de um defeito real: esta frase trazia "Llama 3.3"
         * escrito à mão, e continuou trazendo depois que a Groq aposentou o
         * Llama e o Worker passou a chamar outro modelo. A tela declarou por
         * um tempo, com todas as letras, um modelo que não rodava — na única
         * frase cuja função é ser transparência.
         */
        entendeuNota: string
        /**
         * A mesma ressalva sem nomear modelo, para quando o Worker não manda o
         * campo (versão anterior no ar enquanto o deploy não roda). Continua
         * verdadeira, só menos específica — o que nunca pode acontecer é
         * creditar um modelo que não foi quem respondeu.
         */
        entendeuNotaSemModelo: string
      }
      /**
       * O limite do próprio teste, mostrado SEMPRE e IGUAL PARA TODOS —
       * passou, falhou ou foi bloqueado.
       *
       * Condicionar este aviso à plataforma detectada o transformaria de
       * declaração de escopo em insinuação sobre a plataforma, que é o
       * movimento que a pesquisa lista entre os sinais de quem foi enganado:
       * criar dúvida onde a medição não achou problema.
       */
      escopo: string
      /** Só aparece quando a medição achou algo. Sem "mas" quando está tudo certo. */
      cta: string
    }
  }
  footer: { rights: string; builtWith: string; sourceCode: string; sourceCodeUrl: string }
}
