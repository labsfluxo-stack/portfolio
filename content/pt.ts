import type { Dictionary } from './types'

export const pt: Dictionary = {
  meta: {
    title: 'Neto Alves — Desenvolvedor de Software',
    description:
      'Desenvolvedor de software: sistemas completos do banco ao deploy. 9 construídos, 5 em produção, 265.562 linhas auditadas. IA aplicada, SEO e GEO medidos.',
    ogAlt: 'Neto Alves — Desenvolvedor de Software',
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
    role: 'Desenvolvedor de software',
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
    // Era "role para operar", resíduo do conceito de sala de controle que
    // morreu junto com o terminal. Não há mais nada para operar.
    scrollHint: 'role',
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
    // Escrita pelo dono. Nomeia as três etapas pelo nome que o mercado usa
    // — arquitetura, desenvolvimento, entrega — em vez da versão anterior,
    // que listava as camadas técnicas ("modela o banco, escreve a API, sobe
    // o front e faz o deploy"). Diz a mesma coisa e atravessa os dois
    // públicos: "arquitetura" e "entrega" um empresário entende; "modela o
    // banco" ele não.
    lead: 'Full-stack de ponta a ponta: crio a arquitetura, desenvolvo a aplicação e garanto a entrega.',
    body: [
      // Terminava em "com os números que dá para conferir um por um". Saiu:
      // convidar auditoria é o mesmo reflexo que tirou a procedência de baixo
      // de cada número na Telemetria. Os números estão lá; quem quiser
      // conferir, confere.
      'Construo sistemas completos, do zero até produção: modelagem de dados, API, interface, fila, deploy e a instrumentação que diz se aquilo continua de pé. Nove sistemas até aqui, cinco rodando hoje — os três maiores estão abertos nesta página.',
      'Antes do código veio a infraestrutura: redes, switches e servidores. Não é o serviço que eu vendo hoje, é a razão de o que eu entrego aguentar — quem passou esses anos respondendo pelo uptime de sistema dos outros projeta software pensando em como ele se sustenta, não só em como ele funciona.',
      // Abria em "medir o que quase ninguém mede" — afirmar que os outros são
      // piores é comparação, não afirmação. E fechava explicando a própria
      // técnica ("HTML estático de verdade, porque crawler de IA não executa
      // JavaScript"), que é mostrar o dever de casa: o recrutador técnico
      // gosta, o cliente não entende, e o sênior acha que você está se
      // explicando. O fato fica, a explicação sai.
      'A camada mais recente é medição: KPIs próprias, SEO técnico e GEO — a disciplina de aparecer nas respostas do ChatGPT, do Gemini e do Perplexity, não só na primeira página do Google. Este site é feito assim de propósito: as IAs conseguem lê-lo.',
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
      // Terminava repetindo o argumento que o corpo do Sobre já faz cem
      // palavras acima ("é a razão de o que eu entrego aguentar"). Repetir o
      // melhor argumento gasta os dois. Aqui fica só o fato.
      body: 'Redes, switches e servidores antes do primeiro sistema em produção. VPS, DNS, Nginx, Docker, deploy blue-green com rollback e integração de mensageria.',
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
    lead: 'Cada um nasceu de um problema de operação diferente — distribuir lead, atribuir atendimento, avisar quando algo cai. O próximo é o que o cliente trouxer.',
    statusLabels: { production: 'Operacional', proprietary: 'Proprietário' },
    readCase: 'Ver case study',
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
      outcome: 'O que mudou',
      backToHome: 'Voltar',
    },
    // Só prosa aqui — nome de tecnologia é escrito direto no componente do
    // diagrama (ver content/types.ts, systems.diagram).
    diagram: {
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
        team: '2 desenvolvedores full-stack',
        duration: '26 dias de construção',
        improvements: [
          'Três canais de lead num lugar só',
          'Documento de cliente lido por IA',
          'O dono edita o próprio funil e as automações',
        ],
        problem:
          // O ANTES estava faltando, e sem ele o "depois" não tem contra o quê
          // ser medido. A operação inteira rodava em planilha — é esse o ponto
          // de partida que faz o resto da página significar alguma coisa.
          'A operação inteira rodava em planilha. Lead chegava por três canais — Instagram, LinkedIn e WhatsApp — e era copiado à mão; ninguém sabia de cabeça quem já tinha sido atendido, e agenda, proposta e documento viviam cada um num lugar diferente. O produto tinha que virar o sistema operacional da corretora, não uma planilha com verniz.',
        architecture:
          // REGRA DESTES PARÁGRAFOS: fica o que descreve a FORMA do sistema
          // (tabelas, policies, endpoints, telas); sai o que mede ESFORÇO —
          // linhas, migrations, commits, dias.
          //
          // Eram sete números numa frase só, e o parágrafo misturava "o que o
          // sistema é" com "quanto custou para existir": quem tentava
          // entender a arquitetura tinha de atravessar uma contagem. Linhas e
          // commits já vivem na Telemetria, somados. "26 dias" saiu por outro
          // motivo ainda: sem o escopo à mão, lê-se tão facilmente como
          // "apressado" quanto como "rápido".
          'Monorepo TypeScript com Fastify 5 na API e Supabase/PostgreSQL como banco. Três frontends isolados: painel administrativo em React, painel do consultor externo (acesso restrito, dados só do que é dele) e uma landing em Astro para captação. São 56 tabelas com 146 RLS policies, 219 endpoints e 42 telas. Em produção em os.capstack.capital.',
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
        // Fecha a página no ganho do cliente. O último parágrafo é o mais
        // importante dos dois públicos: descreve capacidade que não existia,
        // sem nenhum número de resultado — não houve medição, e inventar uma
        // seria a única mentira que este site não sobrevive.
        //
        // A última frase é o argumento mais forte do case e por isso fica por
        // último: quase todo desenvolvedor entrega dependência, e este
        // entregou o contrário. Vale mais do que qualquer detalhe técnico
        // acima dela.
        outcome:
          'Os três canais passaram a cair num lugar só, e o lead é distribuído na hora — por roleta ponderada ou direcionado a um consultor. A agenda sincroniza com o Google Calendar, documento de cliente é lido por IA em vez de conferido à mão, a mensageria responde sozinha o que é repetitivo, e o relatório de performance chega com o que a IA achou fora do padrão. Admin e vendedor têm cada um o seu app. E o dono monta o próprio funil e as próprias automações: mudar uma regra do processo deixou de depender de mim.',
      },
      'saturno-labs': {
        name: 'Saturno Labs',
        tagline: 'Plataforma de marketing autônomo B2B que mede a autoridade de uma marca dentro das IAs.',
        team: '2 desenvolvedores full-stack',
        duration: 'menos de 45 dias de construção',
        improvements: [
          'A pesquisa vem antes da peça',
          'Artigo, carrossel e post saem da lacuna encontrada',
          'O que publica volta indexado para a memória',
        ],
        problem:
          'Marcas B2B já são citadas — ou ignoradas — por ChatGPT, Gemini, Claude e Perplexity quando alguém pergunta por uma categoria, e isso não tinha métrica, não tinha processo e não tinha quem aprovasse a peça antes de ela sair. Faltava uma plataforma que medisse Share of Voice dentro das IAs e automatizasse a resposta sem soltar orçamento de mídia sem supervisão.',
        architecture:
          // Mesma regra. Os casos de teste ficam: 1.102 não mede esforço, diz
          // que tipo de sistema é este — combina com a barreira fail-closed e
          // com o portão de documentação no CI, que são as decisões da página.
          'Monorepo com 14 packages e 3 apps. API em Fastify 5 com Zod validando entrada, documentando o OpenAPI e estruturando a saída do LLM a partir do mesmo schema. PostgreSQL 16 com pgvector para embeddings, Drizzle como ORM, BullMQ sobre Redis para filas e 13 jobs cron, front em React com three.js para a cena da constelação. São 60 tabelas, 240 endpoints e 1.102 casos de teste.',
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
        // O ciclo fechado é o argumento: pesquisa alimenta peça, peça vira
        // publicação, publicação volta indexada para a memória, e a rodada
        // seguinte já sabe o que a anterior fez. Sem o retorno à memória isso
        // seria só um gerador de texto; com ele, é um sistema que aprende com
        // o próprio histórico.
        outcome:
          'A pesquisa passou a vir antes da peça: o sistema olha o que já rankeia, onde o concorrente chegou e qual pergunta ninguém respondeu — e é dessa lacuna que sai o artigo, o carrossel e o post de Instagram e de LinkedIn. O artigo é publicado no blog e volta indexado para a memória do sistema, então a rodada seguinte começa sabendo o que a anterior fez. O CRM é omnichannel: a conversa que a peça gera não se perde do outro lado.',
      },
      'moveis-pro': {
        name: 'Moveis.pro',
        tagline: 'SaaS multi-tenant para lojas de móveis, com CRM e operação de WhatsApp e Instagram.',
        team: '2 desenvolvedores full-stack',
        duration: 'menos de 45 dias de construção',
        improvements: [
          'Atendimento, pedido e estoque num lugar só',
          'Pedido fechado vai direto para a fábrica',
          'A venda não troca de ferramenta a cada etapa',
        ],
        problem:
          'Lojas de móveis vendem por WhatsApp e Instagram sem CRM: conversa se perde, vendedor não sabe quem já foi atendido, e cada loja é um cliente isolado que não pode ver dado de outra. Faltava um SaaS que desse conta comercial de verdade dentro de cada loja, sem misturar tenant.',
        architecture:
          // Mesma regra, mais uma remoção própria daqui: o fecho era "Código
          // público em github.com/netoguild-rgb/Moveis.pro.", que repete o
          // botão "Ver repositório" logo abaixo, na mesma página.
          //
          // "3 aplicações" com dígito, não "Três": a métrica do card é 3, e
          // tests/content.test.ts exige que a arquitetura corrobore cada
          // número do card. Escrito por extenso, o dígito não aparecia — e o
          // teste só passava porque "231 commits" continha um "3" no meio.
          'São 3 aplicações: API em Fastify, painel de gestão em Next.js e PWA para o vendedor usar no chão de loja. Banco modelado com 40 models Prisma. Deploy em VPS com Nginx, com pipeline de CI que aplica threshold de cobertura de teste antes de liberar merge.',
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
        // O dono descreveu o ganho como "as empresas melhoram seu tempo".
        // Essa frase NÃO foi escrita: é vaga, ninguém mediu, e não dá para
        // conferir — exatamente o tipo de afirmação que o resto do site foi
        // construído para não fazer. E é mais fraca que os fatos que ele
        // deu.
        //
        // O tempo aparece amarrado ao MECANISMO que o produz: a venda parava
        // de trocar de ferramenta a cada etapa. Assim o leitor conclui o
        // ganho sozinho, e conclusão que o leitor tira vale mais do que
        // afirmação que ele lê.
        outcome:
          'O sistema responde o cliente, fecha o pedido, manda o pedido para a fábrica e acompanha o estoque — tudo no mesmo lugar em que a conversa começou. A venda deixou de trocar de ferramenta a cada etapa, que era onde o atendimento se perdia e para onde ia o tempo do vendedor.',
      },
    },
  },
  stack: {
    label: 'Stack',
    // Abria em "Não é nuvem de ícones", que se defende de uma crítica que
    // ninguém fez. A lista se defende sozinha por ter nível e origem em cada
    // item; anunciar isso antes é explicar o próprio critério.
    lead: 'Cada item tem um nível declarado e uma origem — código ou experiência.',
    levels: {
      dominio: 'Domínio',
      producao: 'Produção',
      contato: 'Contato',
    },
    // "sem reivindicar profundidade" saiu: era hedge, pedindo desculpa por
    // saber pouco de algo que o próprio dono escolheu listar. Critério é
    // fato, não ressalva.
    legend: 'Domínio: uso em produção e sei depurar. Produção: já entreguei com isso. Contato: usei em algo pontual.',
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
    // NÃO ACRESCENTAR AQUI UM BLOCO DE "o que mandar junto". Já existiu, e
    // era um portão: instruía o visitante sobre o que ele devia enviar e
    // terminava em "respondo dizendo o que dá para fazer e o que não dá",
    // pré-anunciando recusa antes de a pessoa escrever uma linha. Quem
    // procura vaga não impõe requisito a quem contrata — a relação de poder
    // fica invertida e o texto sai arrogante.
    //
    // O bloco só existia para preencher uma coluna vazia, e encher espaço foi
    // o que produziu o tom. O `lead` já convida, cada canal já diz para que
    // serve, e o layout de três cartões não deixa buraco nenhum.
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
    landingLink: 'Procurando alguém para construir? Veja como eu trabalho com projeto.',
  },
  landing: {
    meta: {
      title: 'Sites, blogs e sistemas sob medida — Neto Alves',
      description:
        'Dois desenvolvedores full-stack. Sites, blogs e sistemas construídos para carregar rápido, aparecer no Google e ser lidos pelo ChatGPT.',
    },
    hero: {
      titulo: 'Sites, blogs e sistemas',
      tituloDestaque: 'sob medida.',
      subtitulo: 'Construídos para carregar rápido, aparecer no Google e',
      subtituloDestaque: 'ser lidos pelo ChatGPT.',
      assinatura:
        'Dois desenvolvedores full-stack. Você fala direto com quem escreve o código.',
    },
    cta: {
      rotulo: 'Quero um orçamento',
      mensagem: 'Olá, Neto! Vi a página de projetos e quero um orçamento.',
      tranquilizador: 'Sem ligação e sem cadastro.',
    },
    criterio: {
      titulo: 'Como saber se o site que te entregarem presta',
      abertura: 'Você vai receber três orçamentos e todos vão parecer iguais. Dois testes separam.',
      testes: [
        {
          titulo: 'Abra num celular, no 4G.',
          corpo: 'Passou de dois segundos, você perde gente antes de ela ver qualquer coisa.',
        },
        {
          titulo: 'Peça para ver o site com o JavaScript desligado.',
          corpo: 'Se a tela ficar em branco, é exatamente isso que o ChatGPT enxerga: nada.',
        },
      ],
      fecho: [
        'O segundo teste quase ninguém faz. Quando perguntam ao ChatGPT qual empresa contratar no seu ramo, ele lê o site direto do servidor — não abre no navegador como você. Site que se monta no navegador chega vazio.',
        'Não é previsão, é como funciona hoje. E também não é a emergência que te vendem: esse tipo de visita ainda é uma fatia pequena do total no Brasil. Só que converte mais que o dobro do que vem do Google.',
      ],
    },
    oferta: {
      // "O que EU construo" convivia na mesma rolagem com "os dois conhecem
      // o código inteiro" (Dupla, ver comentário lá) — primeira pessoa do
      // singular devolvendo a objeção de ponto único de falha que a faixa
      // anterior acabou de desarmar. A dupla é o diferencial da página, e
      // fica plural em todo `dict.landing` (achado I5 da revisão final de
      // branch). O resto do site continua na voz de uma pessoa só, e não é
      // tocado aqui.
      titulo: 'O que construímos',
      cartoes: [
        {
          nome: 'Site',
          corpo:
            'Institucional, de produto ou de captação. Abre instantâneo e o texto já vem pronto do servidor — que é o que o Google e o ChatGPT leem.',
        },
        {
          nome: 'Blog',
          corpo:
            'Onde a autoridade se acumula. Publicou, os buscadores sabem em segundos.',
        },
        {
          nome: 'Sistema sob medida',
          corpo:
            'Quando a operação não cabe em site. CRM, ERP, painel, automação — do banco ao ar.',
        },
      ],
    },
    dupla: {
      titulo: 'Dois desenvolvedores full-stack',
      corpo: [
        'Você fala direto com quem escreve o código. Sem gerente de projeto, sem estagiário, sem terceirização.',
        'E não depende de uma pessoa só: os dois conhecem o código inteiro.',
      ],
      // Os valores NÃO ficam aqui: vêm de `telemetry`, que já carrega o campo
      // `provenance` dizendo como cada um foi medido. Só os rótulos moram
      // neste dicionário. Ver Task 6.
      numeros: [{ valor: '2', rotulo: 'desenvolvedores' }],
    },
    prova: {
      // Era "Três sistemas em operação" — FALSO (saturno-labs tem
      // `production: false` em content/systems.ts, são 2 de 3) e colidia com
      // o "5 em produção" que a faixa da Dupla renderiza ~200px acima, na
      // mesma rolagem. E prometia "o número que ele moveu e como foi medido"
      // numa seção que não renderizava nenhum dígito — Prova.tsx só mostrava
      // nome, resultado e um link (achado C1 CRÍTICO da revisão final de
      // branch). Nenhuma contagem de sistema fica escrita aqui: o título e o
      // lead abaixo não citam quantos sistemas existem nem quantos estão em
      // produção de propósito — esse número só é seguro computado no render
      // (`systems.filter((s) => s.production).length`, ver Prova.tsx), nunca
      // como palavra ou dígito hard-coded neste dicionário.
      titulo: 'O que já foi construído',
      lead: 'O que cada sistema mudou na operação de quem usa — e em quanto tempo ficou de pé.',
      // Link único no fim da seção, não mais um por card (ver Prova.tsx,
      // achado I6 da revisão final de branch: três saídas grandes numa
      // página que apagou o menu para não ter saída nenhuma). O destino
      // passou a ser o portfólio inteiro, não um case específico — por isso
      // o plural.
      verCase: 'Ver os casos completos',
    },
    // Vazio até o dono decidir o valor. A seção some sozinha — ver Task 8.
    piso: null,
    fechamento: {
      titulo: 'Traz o problema.',
      // Era "Me conta" — primeira pessoa do singular, mesma inconsistência
      // de voz da Oferta (ver comentário lá).
      corpo: 'Conta pra gente o que precisa existir e para quando.',
    },
    auditoria: {
      titulo: 'Faça o segundo teste agora',
      descricao:
        'Cole o endereço do seu site. Vamos ler do mesmo jeito que o ChatGPT lê — pedindo a página ao servidor e sem executar nada.',
      rotuloCampo: 'Endereço do seu site',
      exemplo: 'suaempresa.com.br',
      botao: 'Ler meu site',
      carregando: 'Lendo seu site…',
      erroEndereco: 'Não reconheci esse endereço. Tente algo como suaempresa.com.br',
      resultado: {
        palavras: 'palavras encontradas',
        legivel: 'A IA consegue ler seu site.',
        vazio: 'O ChatGPT vê praticamente uma página em branco.',
        // Distinção que a página inteira depende de manter.
        bloqueado:
          'Não conseguimos ler seu site — ele recusou nossa leitura. Isso não diz nada sobre o conteúdo dele, só que há uma proteção no caminho.',
        // NÃO DIZ "seu site recusou", e é esse o ponto. Este caso cobre
        // endereço digitado errado, domínio que não existe e site fora do ar.
        // Em nenhum deles dá para saber de quem é o problema, então a frase
        // não acusa ninguém e sugere primeiro a causa mais provável.
        inalcancavel:
          'Não chegamos nesse endereço. Confira se está escrito certo; se estiver, o site pode estar fora do ar neste momento.',
        tempo:
          'O site demorou demais para responder e paramos de esperar. Tente de novo daqui a alguns minutos.',
        naoHtml: 'Esse endereço não devolveu uma página de site.',
        construidoEm: 'Construído em',
        amostra: 'O começo do que a IA leu:',
        paginas: 'páginas no site.',
        atualizadoEm: 'A mais recente foi atualizada em',
        parado:
          'Conteúdo parado raramente é citado em resposta sobre o que está acontecendo agora — a IA prefere o que foi escrito recentemente.',
        grupos: {
          visivel: 'O que a IA consegue ver',
          citavel: 'O que existe para citar',
          apresenta: 'Como o site se apresenta',
        },
        checagens: {
          permissao: 'Os robôs têm permissão',
          idioma: 'O site declara o idioma',
          marcado: 'O conteúdo está marcado',
          vivo: 'O conteúdo está vivo',
          blog: 'O site publica conteúdo',
          titulo: 'A página se identifica',
          descricao: 'A página se descreve',
          assunto: 'A página declara um assunto',
          cartao: 'O link vira cartão ao compartilhar',
        },
        detalhes: {
          semTitulo: 'sem título',
          semDescricao: 'sem descrição',
          semAssunto: 'sem H1',
          assuntoDemais: 'H1 demais',
          semMarcacao: 'sem dados estruturados',
          comMarcacao: 'dados estruturados',
          nenhumBloqueado: 'nenhum bloqueado',
          semData: 'sem data no sitemap',
          semIdioma: 'não declarado',
          semBlog: 'sem blog',
          comBlog: 'publica',
          semCartao: 'sem og:image',
          comCartao: 'cartão completo',
        },
        notaMarcacao:
          'Dados estruturados ajudam o Google a montar resultado rico. Não movem citação em IA — isso foi medido em 1.885 páginas e mal mudou.',
        entendeu: 'A resposta que uma IA daria sobre você',
        entendeuFalta: 'O que seu cliente ainda precisa perguntar',
        entendeuNota:
          'Lido pelo {modelo} via Groq. Não é o ChatGPT, e a resposta muda de uma execução para outra — isto é leitura, não medição. A lista acima é que é medida.',
        entendeuNotaSemModelo:
          'Lido por um modelo de linguagem via Groq. Não é o ChatGPT, e a resposta muda de uma execução para outra — isto é leitura, não medição. A lista acima é que é medida.',
      },
      // Dizia "mede duas coisas" quando media duas. Passou a medir cinco e a
      // frase ficou para trás — numa página cujo argumento é que suas
      // afirmações se conferem, aviso de escopo desatualizado é exatamente a
      // imprecisão que ela não pode carregar.
      escopo:
        'Este teste lê o seu site como a IA lê e confere os fundamentos da página. Ele não mede quanto tempo o site leva para abrir no 4G, nem se o conteúdo responde o que perguntam sobre o seu setor — e nada aqui diz se o texto que existe é bom.',
      cta: 'Falar sobre isso no WhatsApp',
    },
    fecho: 'Se o seu site não responde o que perguntam, a gente escreve o que ele precisa dizer.',
    perguntas: {
      titulo: 'Perguntas',
      itens: [
        {
          pergunta: 'Meu site é WordPress. Isso é problema?',
          // Veio de um levantamento do dono sobre gargalos por plataforma, e é
          // a pergunta que o público de fato faz. A resposta honesta contraria
          // o que o mercado insinua: nenhuma das três impede ser lida por IA.
          resposta:
            'Por si só, não. WordPress, Wix e Shopify entregam a página pronta pelo servidor, que é o que a IA precisa. O que atrapalha é o que se acumula em cima: plugin demais, hospedagem barata e — o mais comum — configuração de segurança que barra o robô achando que é raspagem. As três coisas têm conserto sem trocar de plataforma.',
        },
        {
          pergunta: 'E se um de vocês ficar indisponível?',
          resposta:
            'Os dois conhecem o código inteiro e o repositório é compartilhado desde o primeiro dia. O projeto não para porque uma pessoa parou.',
        },
        {
          pergunta: 'Isso substitui o trabalho de SEO?',
          resposta:
            'Não. O SEO continua valendo para a busca tradicional, que ainda traz a maior parte das visitas. O que garantimos é a base técnica: sem ela, nenhum trabalho de conteúdo rende o que deveria.',
        },
        {
          pergunta: 'Quanto tempo leva?',
          // Era "de 26 a 45 dias" — as duas fontes (`content/systems.ts`,
          // via `duration` de cada case) são '26 dias' e 'menos de 45 dias'
          // (duas vezes); "45" sozinho afirma um teto que nenhum dos três
          // sistemas bateu de verdade.
          resposta:
            'Depende do escopo. Os três sistemas do portfólio levaram de 26 a menos de 45 dias cada, com duas pessoas. Um site institucional é bem mais rápido que isso — mas só damos prazo depois de entender o que precisa existir.',
        },
      ],
    },
  },
  ativacoes: {
    meta: {
      title: 'Ativações digitais para agências — Neto Alves',
      description:
        'Dois desenvolvedores full-stack constroem o software da sua ativação: advergame, quiz, roleta, totem e telão. Sai com a marca da agência.',
    },
    capa: {
      titulo: 'A ativação é sua.',
      tituloDestaque: 'O código é nosso.',
      subtitulo:
        'Dois desenvolvedores full-stack constroem o software da ativação que a sua agência vendeu.',
      convite: 'Toque nos alvos.',
      placar: { acertos: 'acertos', reacao: 'ms de reação' },
    },
    cta: {
      rotulo: 'Falar sobre um projeto',
      mensagem: 'Olá, Neto! Vi a página de ativações e quero falar sobre um projeto.',
      tranquilizador: 'Sem ligação e sem cadastro.',
    },
    catalogo: {
      titulo: 'O que construímos',
      blocos: [
        {
          nome: 'Jogos e mecânicas',
          corpo:
            'Advergame de marca, quiz, roleta, jogo da memória, caça-palavras, desafio de reflexo. Roda no navegador do público por QR ou no totem touch.',
        },
        {
          nome: 'Captura e conteúdo',
          corpo:
            'GIF e foto com a moldura da marca, entregues por QR, WhatsApp ou e-mail. Realidade aumentada no próprio navegador, sem app.',
        },
        {
          nome: 'Operação',
          corpo:
            'Hotsite com cadastro, regulamento e sorteio. Totem em modo quiosque que funciona sem internet. Telão ao vivo com ranking, chamada do vencedor e mural de fotos.',
        },
        {
          nome: 'Dados',
          corpo:
            'Lead direto no CRM da marca, base exportável em conformidade com a LGPD, e API para a agência consultar quando quiser.',
        },
      ],
      escopo:
        'Não fazemos hardware, locação de totem, montagem de estande nem produção física. Construímos o software que roda no totem que você já aluga.',
    },
    compra: {
      titulo: 'O que você compra da gente',
      itens: [
        {
          titulo: 'Funciona sem internet.',
          corpo:
            'A rede do estande cai, a fila não para. O software roda local e sobe os dados quando a conexão volta.',
        },
        {
          titulo: 'Aguenta fila.',
          corpo:
            'Trinta pessoas em sequência, celular ruim, 4G saturado. É para esse cenário que se otimiza, não para o laboratório.',
        },
        {
          titulo: 'Sem app para baixar.',
          corpo: 'Abre no navegador do público por QR. Ninguém instala nada num estande.',
        },
        {
          titulo: 'A base sai limpa.',
          corpo:
            'Exportável, com o consentimento registrado junto de cada cadastro, no formato que você entrega ao cliente.',
        },
        {
          titulo: 'A data não se move.',
          corpo:
            'O cronograma é feito para o dia do evento, e alguém responde nesse dia.',
        },
      ],
    },
    whiteLabel: {
      titulo: 'Sai com a sua marca',
      corpo: [
        'A ativação é sua e o cliente é seu. Não aparecemos para ele e não falamos com ele.',
        'Entramos onde a agência precisa de código, e saímos quando o evento acaba.',
      ],
    },
    prova: {
      titulo: 'De onde vem a confiança',
      lead: 'A engenharia é a mesma que sustenta sistemas em operação todo dia — {producao} deles em produção agora.',
      verCase: 'Ver os casos completos',
    },
    perguntas: {
      titulo: 'Perguntas',
      itens: [
        {
          pergunta: 'E se cair a internet no estande?',
          resposta:
            'O software roda local, no totem ou no próprio celular do público. A fila continua andando e os dados sobem quando a rede volta.',
        },
        {
          pergunta: 'Vocês assinam o projeto?',
          resposta:
            'Não. A peça sai com a marca da agência, e não aparecemos para o cliente final.',
        },
        {
          pergunta: 'Roda no totem que a gente já aluga?',
          resposta:
            'Roda, desde que ele abra um navegador. Conferimos o modelo antes e travamos a tela em modo quiosque.',
        },
        {
          pergunta: 'Quem responde no dia do evento?',
          resposta:
            'Um de nós dois. Os dois conhecem o código inteiro, e o plantão entra no combinado por escrito.',
        },
        {
          pergunta: 'Como fica a LGPD do cadastro?',
          resposta:
            'O consentimento é registrado junto com o lead, e a base sai com a origem de cada dado — do jeito que você entrega ao cliente.',
        },
      ],
    },
    fechamento: {
      titulo: 'Traz o briefing.',
      corpo: 'Conta o que a ativação precisa fazer, e para quando.',
    },
  },
  footer: {
    rights: '© 2026 Neto Alves. Todos os direitos reservados.',
    builtWith: 'Construído com Next.js, Tailwind CSS e Motion.',
    sourceCode: 'Ver código-fonte no GitHub',
    sourceCodeUrl: 'https://github.com/labsfluxo-stack/portfolio',
  },
}
