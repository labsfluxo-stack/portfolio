import type { Dictionary } from './types'

export const pt: Dictionary = {
  meta: {
    title: 'Neto Alves — Arquiteto de Sistemas',
    description:
      'Arquiteto de sistemas com 10+ anos em infraestrutura e redes. Da camada 2 ao LLM: 265 mil linhas em 9 sistemas, 5 em produção.',
    ogAlt: 'Neto Alves — Arquiteto de Sistemas',
  },
  nav: { about: 'Sobre', systems: 'Sistemas', stack: 'Stack', terminal: 'Terminal', contact: 'Contato', cv: 'CV' },
  a11y: {
    skipToContent: 'Pular para o conteúdo',
    localeSwitch: 'Trocar idioma',
    openMenu: 'Abrir menu',
    mainNav: 'Navegação principal',
  },
  boot: {
    lines: [
      'iniciando sala de controle...',
      'carregando telemetria de 9 sistemas',
      '5 sistemas operacionais',
      'pronto',
    ],
  },
  hero: {
    name: 'Neto Alves',
    role: 'Arquiteto de sistemas',
    tagline: 'Da camada 2 ao LLM — 10+ anos entre a rede e o código',
    availability: 'Disponível para novos projetos',
    scrollHint: 'role para operar',
  },
  telemetry: {
    label: 'Telemetria',
    metrics: [
      {
        key: 'years',
        label: 'Anos em infraestrutura',
        value: '10+',
        numeric: 10,
        suffix: '+',
        provenance:
          'Anos de atuação profissional contínua com redes, switches e servidores, do primeiro emprego até hoje. Medido em 2026-08-02.',
      },
      {
        key: 'lines',
        label: 'Linhas de código',
        value: '250.000+',
        numeric: 250000,
        suffix: '+',
        provenance:
          'Soma de linhas de código (.ts .tsx .js .jsx .astro .sql .prisma .css) em 9 repositórios, excluindo dependências e artefatos de build. Total medido: 265.562; exibido arredondado para baixo. Medido em 2026-08-02.',
      },
      {
        key: 'systems',
        label: 'Sistemas',
        value: '9',
        numeric: 9,
        provenance: 'Projetos de software distintos com repositório próprio, contados nesta máquina. Medido em 2026-08-02.',
      },
      {
        key: 'production',
        label: 'Em produção',
        value: '5',
        numeric: 5,
        provenance:
          'Sistemas com evidência de deploy ativo no próprio repositório — script, pipeline ou runbook de produção. Medido em 2026-08-02.',
      },
    ],
    secondaryLabel: 'Detalhamento',
    secondary: [
      {
        key: 'commits',
        label: 'Commits',
        value: '1.675',
        provenance: 'Commits somados nos repositórios com histórico git local disponível nesta máquina. Medido em 2026-08-02.',
      },
      {
        key: 'tables',
        label: 'Tabelas modeladas',
        value: '214',
        provenance:
          'Tabelas de banco modeladas, somadas em todos os sistemas com schema versionado (60 + 56 + 40 + 27 + 23 + 8). Medido em 2026-08-02.',
      },
      {
        key: 'endpoints',
        label: 'Endpoints HTTP',
        value: '459',
        provenance:
          'Endpoints HTTP somados nos dois sistemas com contagem verificada por varredura de rotas (240 + 219). Medido em 2026-08-02.',
      },
      {
        key: 'migrations',
        label: 'Migrations SQL',
        value: '130',
        provenance: 'Migrations SQL versionadas, somadas em dois sistemas (57 + 73). Medido em 2026-08-02.',
      },
      {
        key: 'tests',
        label: 'Casos de teste',
        value: '1.270',
        provenance:
          'Casos de teste automatizados, somados em dois sistemas com suíte medida (1.102 + 168). Medido em 2026-08-02.',
      },
    ],
  },
  about: {
    label: 'Sobre',
    lead: 'A mesma pessoa que configurou o switch depois escreveu o sistema que roda nele, e hoje mede quanto ele custa em token de IA.',
    body: [
      'Comecei pela infraestrutura. Dez anos configurando redes, switches e servidores me ensinaram uma coisa que não se aprende escrevendo aplicação: o que quebra em produção quase nunca é o que você testou.',
      'Hoje projeto e entrego sistemas inteiros — banco, API, filas, front, deploy e a rede embaixo de tudo. A especialidade mais recente é IA aplicada com rigor: LLM em produção com guardrails, custo medido e trilha de auditoria, não demonstração de brinquedo.',
    ],
    photoAlt: 'Retrato de Neto Alves',
    photoPending: 'Foto a ser adicionada',
    experience: {
      label: 'Experiência',
      years: '10+ anos em infraestrutura e redes',
      body: 'Configuração e operação de redes, switches e servidores. VPS, DNS, Nginx, Docker, deploy blue-green com rollback e integração de mensageria.',
      vendors: ['Cisco', 'MikroTik', 'Furukawa'],
    },
    education: {
      label: 'Formação',
      technical: { label: 'Técnico', items: ['Telecomunicações'] },
      degree: { label: 'Graduação', items: ['Análise de Dados — Estácio'] },
      certifications: {
        label: 'Certificações',
        institution: 'HarvardX · Harvard University',
        items: [
          'CS50x — Introduction to Computer Science',
          'CS50 AI — Introduction to Artificial Intelligence with Python',
          'CS50B — Computer Science for Business Professionals',
          'CS50L — CS50 for Lawyers',
        ],
      },
    },
  },
  systems: {
    label: 'Sistemas',
    statusLabels: { production: 'Operacional', proprietary: 'Proprietário' },
    readCase: 'Ver case study',
    proprietaryNote: 'Código proprietário — sem repositório público.',
    viewRepo: 'Ver repositório',
    metricLabels: {
      lines: 'linhas',
      tables: 'tabelas',
      policies: 'RLS policies',
      endpoints: 'endpoints',
      packages: 'packages',
      tests: 'testes',
      models: 'models',
      commits: 'commits',
      apps: 'aplicações',
    },
    caseLabels: {
      problem: 'Problema',
      architecture: 'Arquitetura',
      decisions: 'Decisões difíceis',
      stack: 'Stack',
      retro: 'O que eu faria diferente',
      backToHome: 'Voltar',
    },
    detail: {
      oscapstack: {
        name: 'OSCapstack CRM',
        tagline: 'Sistema operacional comercial para originação de crédito imobiliário, em produção.',
        problem:
          'Uma operação de crédito imobiliário precisa de um sistema comercial que uma corretora consiga operar sozinha: cadastro de clientes, distribuição de leads entre consultores, acompanhamento de propostas e um canal de WhatsApp que não pode cair sem ninguém perceber. O produto tinha que rodar como sistema operacional da operação, não como planilha com verniz.',
        architecture:
          'Monorepo TypeScript com Fastify 5 na API e Supabase/PostgreSQL como banco. Três frontends isolados: painel administrativo em React, painel do consultor externo (acesso restrito, dados só do que é dele) e uma landing em Astro para captação. 78.900 linhas de código, 73 migrations, 56 tabelas, 219 endpoints e 42 telas, construídos em 444 commits ao longo de 26 dias. Em produção em os.capstack.capital.',
        decisions: [
          {
            title: '146 RLS policies em 56 tabelas',
            body: 'A autorização mora no banco, não na aplicação: cada tabela tem suas próprias políticas de row-level security, então um bug na API não vaza dado de outro consultor. O custo é performance — toda policy roda uma função de contexto por linha — resolvido reescrevendo os helpers como subquery escalar, para o planner do PostgreSQL avaliar uma vez por consulta em vez de uma vez por linha (otimização de InitPlan).',
          },
          {
            title: 'Deploy blue-green em VPS',
            body: 'A cada deploy, a nova versão sobe numa porta separada da que está servindo. Um health-check de 15 tentativas decide se ela está saudável antes de qualquer usuário ser roteado para lá. Se falha, o container novo é removido e o antigo continua servindo — o pior caso de um deploy ruim é o deploy não acontecer, nunca um ar fora do ar.',
          },
          {
            title: 'Dead man’s switch do WhatsApp',
            body: 'Um container pode responder 200 no health-check HTTP e ainda assim estar com a instância do WhatsApp desconectada — é uma falha que nenhum probe HTTP convencional enxerga. Um cron de 2 em 2 minutos consulta o estado real da conexão; se caiu, ele para de pingar o healthchecks.io de propósito, para que o serviço externo dispare o alarme pela ausência de sinal.',
          },
          {
            title: 'Roleta ponderada segura sob concorrência',
            body: 'A distribuição de leads usa peso por consultor (clientes_ativos / peso), mas dois leads chegando ao mesmo tempo não podem cair no mesmo consultor por uma leitura desatualizada. A escolha do cliente e do consultor usa SELECT … FOR UPDATE dentro de uma única transação, serializando a leitura-e-escrita sem lock de tabela inteira.',
          },
        ],
        stack: ['TypeScript', 'Fastify 5', 'Supabase', 'PostgreSQL', 'React', 'Astro', 'Playwright', 'pgTAP', 'Docker'],
        retro:
          'Hoje eu introduziria a otimização de InitPlan nas policies desde a primeira migration, não depois de sentir o custo em produção — voltar em 56 tabelas já povoadas para reescrever o helper de RLS é um trabalho que dá para evitar simplesmente sabendo do padrão antes de escrever a primeira policy.',
      },
      'saturno-labs': {
        name: 'Saturno Labs',
        tagline: 'Plataforma de marketing autônomo B2B que mede a autoridade de uma marca dentro das IAs.',
        problem:
          'Marcas B2B já são citadas — ou ignoradas — por ChatGPT, Gemini, Claude e Perplexity quando alguém pergunta por uma categoria, e isso não tinha métrica, não tinha processo e não tinha quem aprovasse a peça antes de ela sair. Faltava uma plataforma que medisse Share of Voice dentro das IAs e automatizasse a resposta sem soltar orçamento de mídia sem supervisão.',
        architecture:
          'Monorepo com 14 packages e 3 apps. API em Fastify 5 com Zod validando entrada, documentando o OpenAPI e estruturando a saída do LLM a partir do mesmo schema. PostgreSQL 16 com pgvector para embeddings, Drizzle como ORM, BullMQ sobre Redis para filas e 13 jobs cron, front em React com three.js para a cena da constelação. 37.672 linhas de código (23.580 de produção, 14.092 de teste), 57 migrations, 60 tabelas, 240 endpoints, 1.102 casos de teste e 798 commits.',
        decisions: [
          {
            title: 'Portão de documentação executável no CI',
            body: 'Um extrator deriva do código um inventário canônico de rotas, tabelas e jobs; um verificador roda 9 checks que quebram o build, incluindo um que confere se todo número afirmado na prosa da documentação bate com esse inventário. A documentação não pode mentir porque o build não deixa.',
          },
          {
            title: 'Barreira de compliance fail-closed',
            body: 'Toda peça passa por blocklist determinística, depois por uma IA-juíza que devolve um veredito estruturado, depois por aprovação humana. Se a vetagem falha — LLM fora do ar, timeout — a peça fica em rascunho. Indisponibilidade nunca vira aprovação por omissão.',
          },
          {
            title: 'Cinco travas entre a IA e o orçamento de mídia',
            body: 'Uma ação proposta pela IA só se auto-aplica se passar em cinco checagens em sequência: validação de schema, campanha em modo autopilot, kill switch desligado, elegibilidade aprovada e criativo aprovado. Falhar qualquer uma trava a ação, e o sistema nunca reativa nada sozinho.',
          },
          {
            title: 'KPIs que preferem dizer "não sei"',
            body: 'Quando a cobertura de bateria de provedores de IA cai abaixo de 50%, o run é marcado como degradado em vez de concluído. Um provedor fora do ar não pode aparecer no gráfico como se a marca tivesse perdido autoridade — errar por excesso de cautela é a escolha certa.',
          },
        ],
        stack: ['TypeScript', 'Fastify 5', 'Zod', 'PostgreSQL', 'pgvector', 'Drizzle', 'BullMQ', 'Redis', 'React', 'three.js'],
        retro:
          'O portão de documentação eu escreveria bem antes: implementei depois de já ter prosa desalinhada do código em produção, e destravar isso exigiu uma auditoria inteira em vez de um verificador rodando desde o commit zero.',
      },
      'moveis-pro': {
        name: 'Moveis.pro',
        tagline: 'SaaS multi-tenant para lojas de móveis, com CRM e operação de WhatsApp e Instagram.',
        problem:
          'Lojas de móveis vendem por WhatsApp e Instagram sem CRM: conversa se perde, vendedor não sabe quem já foi atendido, e cada loja é um cliente isolado que não pode ver dado de outra. Faltava um SaaS que desse conta comercial de verdade dentro de cada loja, sem misturar tenant.',
        architecture:
          'Três aplicações: API em Fastify, painel de gestão em Next.js e PWA para o vendedor usar no chão de loja. Banco modelado com 40 models Prisma, 56.500 linhas de código e 231 commits. Deploy em VPS com Nginx, com pipeline de CI que aplica threshold de cobertura de teste antes de liberar merge. Código público em github.com/netoguild-rgb/Moveis.pro.',
        decisions: [
          {
            title: 'Isolamento multi-tenant',
            body: 'Cada loja é um tenant isolado: toda query carrega o escopo do tenant, e o modelo de dados foi desenhado para que um bug de aplicação não consiga cruzar dado de duas lojas — a mesma preocupação de autorização do OSCapstack, resolvida no nível do schema em vez de RLS porque o banco aqui é Prisma sobre um Postgres compartilhado, não Supabase.',
          },
          {
            title: 'Atribuição de conversas a vendedores por instância',
            body: 'Cada loja pode ter mais de uma instância de WhatsApp/Instagram, e uma conversa entrando numa instância precisa ser atribuída ao vendedor certo sem dois vendedores respondendo o mesmo cliente. A atribuição acontece por instância, não globalmente, porque é assim que a loja de verdade organiza o time.',
          },
          {
            title: 'PWA offline-first para uso em loja',
            body: 'O vendedor usa a PWA no chão de loja, onde o Wi-Fi cai. A interface funciona offline e sincroniza quando a conexão volta, em vez de travar numa tela de erro no meio de um atendimento.',
          },
          {
            title: 'Pipeline de deploy com política prod/dev separada',
            body: 'CI aplica um threshold de cobertura de teste antes de liberar o merge, e o deploy em VPS com Nginx segue uma política que separa o que vai para produção do que fica em desenvolvimento — nenhum merge chega a produção só porque passou no build.',
          },
        ],
        stack: ['TypeScript', 'Next.js', 'Fastify', 'Prisma', 'PostgreSQL', 'PWA', 'Docker', 'Nginx'],
        retro:
          'A atribuição de conversas por instância eu desenharia com um teste de concorrência desde o início — hoje ela depende de disciplina no código de atribuição, e um teste que simule duas mensagens chegando ao mesmo tempo teria pego cedo qualquer corrida que eu não vi na hora de escrever.',
      },
    },
  },
  stack: {
    label: 'Stack',
    lead: 'Não é nuvem de ícones: cada item tem um nível declarado e uma origem — código auditado ou experiência profissional.',
    levels: {
      dominio: 'Domínio — usado em produção, sei depurar',
      producao: 'Produção — já entreguei com isso',
      contato: 'Contato — usei, não reivindico profundidade',
    },
    sourceNote: {
      repo: 'Comprovado em código auditado.',
      experience: 'Experiência profissional declarada, não repositório.',
    },
    layers: [
      {
        label: 'Redes & Infraestrutura',
        source: 'experience',
        items: [
          { name: 'Cisco', level: 'dominio' },
          { name: 'MikroTik', level: 'dominio' },
          { name: 'Furukawa', level: 'producao' },
          { name: 'Switching', level: 'dominio' },
          { name: 'VPS', level: 'dominio' },
          { name: 'DNS', level: 'dominio' },
          { name: 'Nginx', level: 'dominio' },
          { name: 'Docker', level: 'dominio' },
          { name: 'Deploy blue-green', level: 'dominio' },
          { name: 'PM2', level: 'producao' },
          { name: 'Heartbeat/uptime', level: 'producao' },
        ],
      },
      {
        label: 'Backend',
        source: 'repo',
        items: [
          { name: 'TypeScript', level: 'dominio' },
          { name: 'Node', level: 'dominio' },
          { name: 'Fastify', level: 'dominio' },
          { name: 'NestJS', level: 'contato' },
          { name: 'Next.js', level: 'producao' },
          { name: 'Astro', level: 'producao' },
        ],
      },
      {
        label: 'Dados',
        source: 'repo',
        items: [
          { name: 'PostgreSQL', level: 'dominio' },
          { name: 'pgvector', level: 'producao' },
          { name: 'Supabase/RLS', level: 'dominio' },
          { name: 'Drizzle', level: 'producao' },
          { name: 'Prisma', level: 'producao' },
          { name: 'Redis', level: 'producao' },
          { name: 'SQL puro', level: 'dominio' },
        ],
      },
      {
        label: 'IA aplicada',
        source: 'repo',
        items: [
          { name: 'Anthropic', level: 'producao' },
          { name: 'OpenAI', level: 'producao' },
          { name: 'Google', level: 'producao' },
          { name: 'Groq', level: 'producao' },
          { name: 'Vercel AI SDK', level: 'contato' },
          { name: 'Embeddings/RAG', level: 'producao' },
          { name: 'Tool-calling', level: 'producao' },
          { name: 'Guardrails', level: 'producao' },
        ],
      },
      {
        label: 'Front-end',
        source: 'repo',
        items: [
          { name: 'React', level: 'dominio' },
          { name: 'Vite', level: 'producao' },
          { name: 'Tailwind', level: 'dominio' },
          { name: 'PWA', level: 'producao' },
          { name: 'three.js', level: 'producao' },
        ],
      },
      {
        label: 'Qualidade & Entrega',
        source: 'repo',
        items: [
          { name: 'Vitest', level: 'dominio' },
          { name: 'Playwright', level: 'producao' },
          { name: 'pgTAP', level: 'producao' },
          { name: 'GitHub Actions', level: 'dominio' },
          { name: 'Turborepo', level: 'producao' },
          { name: 'pnpm', level: 'producao' },
        ],
      },
    ],
  },
  terminal: {
    label: 'Terminal',
    lead: 'Um terminal de verdade. Tudo que ele responde também está em HTML nesta página — ignorar o terminal não custa nada.',
    prompt: 'neto@sala-de-controle:~$',
    welcome: [
      'Sala de Controle v1.0 — digite "help" para ver os comandos.',
      'Teclado, histórico com as setas e Tab para completar funcionam normalmente.',
    ],
    hint: 'Digite "help" para ver os comandos disponíveis.',
    unknown: 'Comando não reconhecido: {command}. Digite "help" para ver os comandos disponíveis.',
    noMatch: 'Nenhum sistema usa essa tecnologia. Tente: stack',
    ariaLabel: 'Terminal interativo',
    ariaOutput: 'Saída do terminal',
    responses: {
      whoami: [
        'Neto Alves — arquiteto de sistemas.',
        '10+ anos configurando redes, switches e servidores antes de passar a construir o que roda neles.',
      ],
      stats: [
        '10+ anos em infraestrutura',
        '250.000+ linhas de código em 9 sistemas',
        '5 sistemas em produção',
        '1.675 commits · 214 tabelas · 459 endpoints · 130 migrations · 1.270 testes',
      ],
      projects: [
        '3 sistemas em destaque: OSCapstack CRM, Saturno Labs, Moveis.pro.',
        'Use "projects --stack <tecnologia>" para filtrar por stack.',
      ],
      stack: [
        'Redes & Infraestrutura, Backend, Dados, IA aplicada, Front-end, Qualidade & Entrega.',
        'Veja a seção Stack para o detalhe por camada, com nível e origem declarados.',
      ],
      contact: ['E-mail: netoguild@gmail.com', 'WhatsApp e GitHub na seção Contato.'],
      cv: ['Currículo em PDF disponível para download na seção Contato.'],
      lang: ['Uso: lang pt | lang en'],
      langSwitching: ['Trocando para {lang}...'],
      theme: ['Só existe o escuro. A sala de controle não opera com as luzes acesas.'],
      sudo: ['Permissão negada: você já tem acesso a tudo que este terminal expõe.'],
      matrix: ['Só rede, servidor e código. Sem colher, sem Matrix.'],
      help: [
        'Comandos disponíveis: whoami, stats, projects [--stack <tecnologia>], stack, contact, cv, lang <pt|en>, clear, theme, sudo, matrix.',
      ],
    },
  },
  contact: {
    label: 'Contato',
    lead: 'Escreva direto, sem intermediário: formulário, WhatsApp ou e-mail.',
    form: {
      name: 'Nome',
      email: 'E-mail',
      message: 'Mensagem',
      submit: 'Enviar',
      sending: 'Enviando…',
      success: 'Mensagem enviada. Respondo em breve.',
      error: 'Não deu para enviar agora. Tente pelo WhatsApp ou e-mail.',
      honeypotLabel: 'Deixe este campo em branco',
    },
    disabledNote: 'Formulário indisponível no momento — fale direto por WhatsApp ou e-mail.',
    whatsapp: 'https://wa.me/5583986226441',
    whatsappMessage: 'Olá, Neto! Vi seu portfólio e quero conversar sobre um projeto.',
    email: 'netoguild@gmail.com',
    github: 'https://github.com/netoguild-rgb',
    cvDownload: 'Baixar CV (PDF)',
  },
  footer: {
    rights: '© 2026 Neto Alves. Todos os direitos reservados.',
    builtWith: 'Construído com Next.js, Tailwind CSS e Motion.',
    sourceCode: 'Ver código-fonte no GitHub',
    sourceCodeUrl: 'https://github.com/labsfluxo-stack/portfolio',
  },
}
