import type { Dictionary } from './types'

export const pt: Dictionary = {
  meta: {
    title: 'Neto Alves — Arquiteto de Software',
    description:
      'Arquiteto de software: sistemas completos do banco ao deploy. 9 construídos, 5 em produção, 265.562 linhas auditadas. IA aplicada, SEO e GEO medidos.',
    ogAlt: 'Neto Alves — Arquiteto de Software',
  },
  nav: { about: 'Sobre', systems: 'Sistemas', stack: 'Stack', contact: 'Contato', cv: 'CV' },
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
    role: 'Arquiteto de software',
    // Escrita pelo dono. Três verbos com ELE como agente — projetando,
    // escalando, mantendo — e é isso que a frase precisa fazer.
    //
    // Duas versões anteriores erraram exatamente aqui, e o registro fica
    // para não se repetir. A primeira, "9 construídos, 5 em produção",
    // gastava a linha mais visível do site repetindo número que a
    // Telemetria mostra uma rolagem abaixo. A segunda, "Software escrito
    // por quem já foi acordado por ele", tinha um defeito que só aparece
    // na leitura: "acordado POR ELE" afirma que o software DELE caiu —
    // pintava o dono como vítima de incidente em vez de quem impede o
    // incidente. Nunca reintroduzir nenhuma variação de
    // "acordado / madrugada / caiu" nesta linha: o papel é ativo e o
    // resultado é uptime.
    //
    // "Uma década" em vez de "10 anos" mantém a linha sem dígito — o
    // número vive na Telemetria, com procedência, que é onde ele pode ser
    // conferido.
    tagline: 'Mais de uma década projetando, escalando e mantendo sistemas críticos em produção contínua',
    availability: 'Disponível para vaga ou projeto',
    scrollHint: 'role para operar',
  },
  telemetry: {
    label: 'Telemetria',
    // Ordem deliberada: os três números de SOFTWARE primeiro, os anos de
    // infraestrutura por último. Não é cosmético — este é o primeiro bloco
    // de números que um recrutador lê, e com "Anos em infraestrutura" na
    // primeira posição a página inteira se apresentava como currículo de
    // rede. O dado é o mesmo e continua honesto; o que mudou é o que ele
    // sustenta: infraestrutura aqui é a base que explica por que o software
    // aguenta, não a oferta.
    metrics: [
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
        label: 'Sistemas construídos',
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
      {
        key: 'years',
        label: 'Anos de infra por baixo',
        value: '10+',
        numeric: 10,
        suffix: '+',
        provenance:
          'Anos de atuação profissional contínua com redes, switches e servidores, do primeiro emprego até hoje. Medido em 2026-08-02.',
      },
    ],
    provenanceNote: 'Contados no código dos repositórios em 2026-08-02.',
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
    // A hero já carrega o argumento do plantão ("acordado por ele"). Esta
    // linha ficava com "atende quando quebra às três da manhã" e repetia a
    // mesma jogada a uma rolagem de distância — repetição gasta as duas.
    // Aqui o argumento é outro: os quatro papéis numa pessoa só.
    lead: 'A mesma pessoa modela o banco, escreve a API, sobe o front e faz o deploy — e responde pelos quatro.',
    body: [
      'Construo sistemas completos, do zero até produção: modelagem de dados, API, interface, fila, deploy e a instrumentação que diz se aquilo continua de pé. Nove sistemas até aqui, cinco rodando hoje — os três maiores estão abertos nesta página, com os números que dá para conferir um por um.',
      'Antes do código veio a infraestrutura: redes, switches e servidores. Não é o serviço que eu vendo hoje, é a razão de o que eu entrego aguentar — quem passou esses anos respondendo pelo uptime de sistema dos outros projeta software pensando em como ele se sustenta, não só em como ele funciona.',
      'A camada mais recente é medir o que quase ninguém mede: KPIs próprias, SEO técnico e GEO — a disciplina de aparecer nas respostas do ChatGPT, do Gemini e do Perplexity, não só na primeira página do Google. Este portfólio é a demonstração: HTML estático de verdade, porque crawler de IA não executa JavaScript.',
    ],
    photoAlt: 'Retrato de Neto Alves',
    photoPending: 'Foto a ser adicionada',
    // Rotulado como BASE, não como "Experiência". O trabalho que este
    // portfólio busca é construir software; a experiência de rede é o que
    // explica a confiabilidade do software, e um bloco chamado
    // "Experiência" com três marcas de switch em destaque fazia a página
    // inteira se ler como currículo de infraestrutura. Os vendors ficam —
    // são credencial real e sustentam o argumento — só deixaram de ser a
    // manchete.
    experience: {
      label: 'Base técnica',
      years: '10+ anos em infraestrutura e redes',
      body: 'Redes, switches e servidores antes do primeiro sistema em produção. VPS, DNS, Nginx, Docker, deploy blue-green com rollback e integração de mensageria — a base que faz o software que eu escrevo sobreviver ao que ninguém testou.',
      vendors: ['Cisco', 'MikroTik', 'Furukawa'],
    },
    education: {
      label: 'Formação',
      // Autodescritivo: "Telecomunicações" sozinho vira uma etiqueta sem
      // sentido quando o rótulo "Técnico" some da tela (ver About.tsx). O
      // `label` continua aqui porque tests/content.test.ts o usa como
      // guarda de que os CS50 nunca sejam rotulados como graduação.
      technical: { label: 'Técnico', items: ['Técnico em Telecomunicações'] },
      // Sem instituição, por decisão do dono. Simplifica a regra em vez de
      // complicá-la: o curso está pausado, e sem instituição declarada não
      // existe vínculo nenhum a afirmar nem status a omitir. Não
      // reintroduzir o nome de uma — há trava em tests/content.test.ts e em
      // tests/static-html.test.ts.
      degree: { label: 'Graduação', items: ['Análise de Dados'] },
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
      // Só categorias que a Telemetria NÃO usa — ver o comentário no topo
      // de content/systems.ts. `lines`, `tables`, `endpoints`, `commits` e
      // `tests` saíram junto com as métricas que os usavam: rótulo órfão
      // aqui é convite para recolocar a métrica e reabrir a repetição.
      policies: 'RLS policies',
      screens: 'telas',
      packages: 'packages',
      jobs: 'jobs cron',
      models: 'models',
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
    // Só prosa aqui — nome de tecnologia é escrito direto no componente do
    // diagrama (ver content/types.ts, systems.diagram).
    diagram: {
      caption: 'Em destaque, a decisão que sustenta o resto.',
      admin: 'Painel admin',
      consultant: 'Painel do consultor',
      landing: 'Landing de captação',
      api: 'API',
      database: 'Banco',
      policies: 'RLS policies',
      screens: 'telas',
      watchdog: 'Sonda 2 min',
      alarm: 'Alarme externo',
      providers: 'Provedores de IA',
      queue: 'Filas',
      jobs: 'jobs cron',
      blocklist: 'Blocklist',
      judge: 'IA juíza',
      humanApproval: 'Aprovação humana',
      locks: '5 travas',
      budget: 'Orçamento de mídia',
      store: 'Loja',
      tenantScope: 'Escopo de tenant',
      salesApp: 'PWA do vendedor',
      offline: 'Offline',
      sync: 'Sincroniza',
      models: 'models',
      packages: 'packages',
    },
    detail: {
      oscapstack: {
        name: 'OSCapstack CRM',
        tagline: 'Sistema operacional comercial para originação de crédito imobiliário, em produção.',
        problem:
          'Uma operação de crédito imobiliário precisa de um sistema comercial que uma corretora consiga operar sozinha: cadastro de clientes, distribuição de leads entre consultores, acompanhamento de propostas e um canal de WhatsApp que não pode cair sem ninguém perceber. O produto tinha que rodar como sistema operacional da operação, não como planilha com verniz.',
        architecture:
          'Monorepo TypeScript com Fastify 5 na API e Supabase/PostgreSQL como banco. Três frontends isolados: painel administrativo em React, painel do consultor externo (acesso restrito, dados só do que é dele) e uma landing em Astro para captação. 78.900 linhas de código, 73 migrations, 56 tabelas com 146 RLS policies, 219 endpoints e 42 telas, construídos em 444 commits ao longo de 26 dias. Em produção em os.capstack.capital.',
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
      dominio: 'Domínio',
      producao: 'Produção',
      contato: 'Contato',
    },
    legend: 'Domínio: uso em produção e sei depurar. Produção: já entreguei com isso. Contato: usei, sem reivindicar profundidade.',
    sourceNote: {
      repo: 'Código',
      experience: 'Experiência',
    },
    // A ordem das camadas É a ordem do posicionamento, e nunca deve ser
    // reordenada por acidente: software primeiro, infraestrutura por
    // último. "Redes & Infraestrutura" abria esta lista, e como é a camada
    // com mais itens em nível de domínio, ela respondia sozinha a pergunta
    // "o que essa pessoa faz?" — pela área errada.
    layers: [
      {
        label: 'Backend',
        source: 'repo',
        items: [
          { name: 'JavaScript', level: 'dominio' },
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
          // Domínio nos três que têm a evidência mais funda no Saturno Labs:
          // barreira fail-closed com IA-juíza e aprovação humana, saída do
          // LLM estruturada pelo mesmo schema Zod que documenta o OpenAPI, e
          // pgvector com embeddings em produção. Os provedores ficam em
          // Produção — usar quatro é amplitude, não profundidade.
          { name: 'Guardrails', level: 'dominio' },
          { name: 'Tool-calling', level: 'dominio' },
          { name: 'Embeddings/RAG', level: 'dominio' },
          { name: 'Anthropic', level: 'producao' },
          { name: 'OpenAI', level: 'producao' },
          { name: 'Google', level: 'producao' },
          { name: 'Groq', level: 'producao' },
          { name: 'Vercel AI SDK', level: 'contato' },
        ],
      },
      {
        label: 'SEO, GEO & Medição',
        source: 'repo',
        items: [
          { name: 'SEO técnico', level: 'dominio' },
          { name: 'GEO (respostas de IA)', level: 'dominio' },
          { name: 'JSON-LD / Schema.org', level: 'dominio' },
          { name: 'KPIs customizadas', level: 'dominio' },
          { name: 'Rastreamento de eventos', level: 'dominio' },
          { name: 'Share of Voice em IA', level: 'dominio' },
          { name: 'Core Web Vitals', level: 'dominio' },
          { name: 'IndexNow', level: 'dominio' },
          { name: 'Blog & feed RSS', level: 'dominio' },
        ],
      },
      {
        label: 'Front-end',
        source: 'repo',
        items: [
          { name: 'React', level: 'dominio' },
          { name: 'Vite', level: 'dominio' },
          { name: 'Tailwind', level: 'dominio' },
          { name: 'PWA', level: 'dominio' },
          { name: 'three.js', level: 'dominio' },
        ],
      },
      {
        // Docker, Nginx, VPS e blue-green vieram da camada de redes. Lá a
        // etiqueta da camada é "Experiência" — declarada, sem repositório —
        // e isso rebaixava quatro itens que têm código auditável: os três
        // sistemas usam Docker, o Moveis.pro roda atrás de Nginx e o
        // blue-green do OSCapstack está implementado, com health-check de 15
        // tentativas e remoção do container novo quando falha. A origem é
        // por camada, então o jeito de a etiqueta ficar honesta é o item
        // morar na camada certa.
        label: 'Entrega & Infraestrutura',
        source: 'repo',
        items: [
          { name: 'Vitest', level: 'dominio' },
          { name: 'Playwright', level: 'dominio' },
          { name: 'GitHub Actions', level: 'dominio' },
          { name: 'Turborepo', level: 'dominio' },
          { name: 'Docker', level: 'dominio' },
          { name: 'Nginx', level: 'dominio' },
          { name: 'VPS', level: 'dominio' },
          { name: 'Deploy blue-green', level: 'dominio' },
          { name: 'pgTAP', level: 'producao' },
          { name: 'pnpm', level: 'producao' },
          { name: 'PM2', level: 'producao' },
          { name: 'Heartbeat/uptime', level: 'producao' },
        ],
      },
      {
        // Só "Redes" agora: o que sobrou aqui é o que de fato não tem
        // repositório para mostrar, e por isso a etiqueta "Experiência"
        // passou a valer para todos os itens da camada em vez de rebaixar
        // metade deles (ver o comentário na camada de Entrega).
        label: 'Redes',
        source: 'experience',
        items: [
          { name: 'Cisco', level: 'dominio' },
          { name: 'MikroTik', level: 'dominio' },
          { name: 'Switching', level: 'dominio' },
          { name: 'DNS', level: 'dominio' },
          { name: 'Furukawa', level: 'producao' },
        ],
      },
    ],
  },
  contact: {
    label: 'Contato',
    lead: 'Vaga, projeto fechado ou uma ideia que ainda não virou escopo — escreva direto, sem intermediário.',
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
    brief: {
      label: 'O que ajuda vir junto',
      body: 'Se for projeto: o que precisa existir e para quando. Se for vaga: o stack, o formato e o tamanho do time. Respondo dizendo o que dá para fazer e o que não dá.',
    },
    channels: {
      whatsapp: 'Para conversa rápida',
      email: 'Para escopo, anexo e proposta',
      github: 'Código público, para conferir por conta própria',
    },
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
