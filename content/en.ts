import type { Dictionary } from './types'

export const en: Dictionary = {
  meta: {
    title: 'Neto Alves — Software Architect',
    description:
      'Software architect: complete systems from database to deploy. 9 built, 5 in production, 265,562 audited lines. Applied AI, SEO and GEO with measured numbers.',
    ogAlt: 'Neto Alves — Software Architect',
  },
  nav: { about: 'About', systems: 'Systems', stack: 'Stack', contact: 'Contact', cv: 'CV' },
  a11y: {
    skipToContent: 'Skip to content',
    localeSwitch: 'Switch language',
    openMenu: 'Open menu',
    mainNav: 'Main navigation',
  },
  boot: {
    lines: [
      'booting control room...',
      'loading telemetry for 9 systems',
      '5 systems operational',
      'ready',
    ],
  },
  hero: {
    name: 'Neto Alves',
    role: 'Software architect',
    // Ver o comentário equivalente em content/pt.ts, inclusive o registro
    // das duas versões que erraram antes desta. "running in production" em
    // vez de um decalque de "em produção contínua": a frase do dono é em
    // português, e traduzir ao pé da letra devolveria inglês torto.
    tagline: 'Over a decade designing, scaling and keeping critical systems running in production',
    availability: 'Available for a role or a project',
    // Ver content/pt.ts: resíduo do conceito de sala de controle, que morreu
    // junto com o terminal.
    scrollHint: 'scroll',
  },
  telemetry: {
    label: 'Telemetry',
    // Mesma ordem deliberada de content/pt.ts: os três números de SOFTWARE
    // primeiro, os anos de infraestrutura por último. Ver o comentário lá
    // para o porquê — as duas listas têm de contar a mesma história, ou o
    // visitante em inglês lê um posicionamento diferente do visitante em
    // português.
    metrics: [
      {
        key: 'lines',
        label: 'Lines of code',
        value: '250,000+',
        numeric: 250000,
        suffix: '+',
        provenance:
          'Sum of code lines (.ts .tsx .js .jsx .astro .sql .prisma .css) across 9 repositories, excluding dependencies and build artifacts. Measured total: 265,562; shown rounded down. Measured on 2026-08-02.',
      },
      {
        key: 'systems',
        label: 'Systems built',
        value: '9',
        numeric: 9,
        provenance: 'Distinct software projects with their own repository, counted on this machine. Measured on 2026-08-02.',
      },
      {
        key: 'production',
        label: 'In production',
        value: '5',
        numeric: 5,
        provenance:
          'Systems with evidence of active deployment in the repository itself — script, pipeline or production runbook. Measured on 2026-08-02.',
      },
      {
        key: 'years',
        label: 'Years of infra underneath',
        value: '10+',
        numeric: 10,
        suffix: '+',
        provenance:
          'Years of continuous professional work with networks, switches and servers, from the first job to today. Measured on 2026-08-02.',
      },
    ],
    provenanceNote: 'Counted in the repository code on 2026-08-02.',
    secondaryLabel: 'Breakdown',
    secondary: [
      {
        key: 'commits',
        label: 'Commits',
        value: '1,675',
        provenance: 'Commits summed across repositories with local git history available on this machine. Measured on 2026-08-02.',
      },
      {
        key: 'tables',
        label: 'Tables modeled',
        value: '214',
        provenance:
          'Database tables modeled, summed across every system with a versioned schema (60 + 56 + 40 + 27 + 23 + 8). Measured on 2026-08-02.',
      },
      {
        key: 'endpoints',
        label: 'HTTP endpoints',
        value: '459',
        provenance:
          'HTTP endpoints summed across the two systems with route counts verified by code scan (240 + 219). Measured on 2026-08-02.',
      },
      {
        key: 'migrations',
        label: 'SQL migrations',
        value: '130',
        provenance: 'Versioned SQL migrations, summed across two systems (57 + 73). Measured on 2026-08-02.',
      },
      {
        key: 'tests',
        label: 'Test cases',
        value: '1,270',
        provenance:
          'Automated test cases, summed across two systems with a measured suite (1,102 + 168). Measured on 2026-08-02.',
      },
    ],
  },
  about: {
    label: 'About',
    // Ver content/pt.ts: nomeia as três etapas pelo nome que o mercado usa,
    // em vez de listar as camadas técnicas.
    lead: 'Full-stack end to end: I design the architecture, build the application and own the delivery.',
    body: [
      'I build complete systems, from zero to production: data modelling, API, interface, queues, deploy, and the instrumentation that tells you whether it is still standing. Nine systems so far, five running today — the three largest are open on this page.',
      "Infrastructure came before the code: networks, switches and servers. It is not the service I sell today, it is the reason what I ship holds up — someone who spent those years accountable for other people's uptime designs software around how it stays standing, not only around how it works.",
      // Ver content/pt.ts: abria em comparação e fechava explicando a própria
      // técnica.
      "The newest layer is measurement: custom KPIs, technical SEO and GEO — the discipline of showing up in answers from ChatGPT, Gemini and Perplexity, not just on Google's first page. This site is built that way on purpose: the AIs can read it.",
    ],
    photoAlt: 'Portrait of Neto Alves',
    photoPending: 'Photo to be added',
    // Ver o comentário equivalente em content/pt.ts: rotulado como BASE, não
    // como "Experience". Os vendors continuam — credencial real — mas
    // deixaram de ser a manchete do currículo.
    experience: {
      label: 'Technical foundation',
      years: '10+ years in infrastructure and networking',
      // Ver content/pt.ts: repetia o argumento que o corpo do Sobre já faz.
      body: 'Networks, switches and servers before the first system in production. VPS, DNS, Nginx, Docker, blue-green deploys with rollback and messaging integration.',
      vendors: ['Cisco', 'MikroTik', 'Furukawa'],
    },
    education: {
      label: 'Education',
      // Ver content/pt.ts: autodescritivo, porque o rótulo do grupo não
      // aparece mais na tela.
      technical: { label: 'Technical', items: ['Telecommunications Technician'] },
      // Sem instituição — ver content/pt.ts.
      degree: { label: 'Degree', items: ['Data Analysis'] },
      certifications: {
        label: 'Certifications',
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
    label: 'Systems',
    lead: 'Each one came from a different operations problem — routing leads, assigning conversations, raising the alarm when something goes down. The next one is whatever the client brings.',
    statusLabels: { production: 'Operational', proprietary: 'Proprietary' },
    readCase: 'Read case study',
    viewRepo: 'View repository',
    metricLabels: {
      // Ver content/pt.ts: só categorias que a Telemetria não usa.
      policies: 'RLS policies',
      screens: 'screens',
      packages: 'packages',
      jobs: 'cron jobs',
      models: 'models',
      apps: 'apps',
    },
    caseLabels: {
      problem: 'Problem',
      architecture: 'Architecture',
      decisions: 'Hard decisions',
      stack: 'Stack',
      outcome: 'What changed',
      backToHome: 'Back',
    },
    // Ver content/pt.ts: só prosa aqui, nome de tecnologia vive no componente.
    diagram: {
      admin: 'Admin panel',
      consultant: 'Consultant panel',
      landing: 'Lead capture landing',
      api: 'API',
      database: 'Database',
      policies: 'RLS policies',
      screens: 'screens',
      watchdog: 'Probe every 2 min',
      alarm: 'External alarm',
      providers: 'AI providers',
      queue: 'Queues',
      jobs: 'cron jobs',
      blocklist: 'Blocklist',
      judge: 'AI judge',
      humanApproval: 'Human approval',
      locks: '5 locks',
      budget: 'Media budget',
      store: 'Store',
      tenantScope: 'Tenant scope',
      salesApp: 'Salesperson PWA',
      offline: 'Offline',
      sync: 'Syncs',
      models: 'models',
      packages: 'packages',
    },
    detail: {
      oscapstack: {
        name: 'OSCapstack CRM',
        tagline: "Commercial operating system for real-estate credit origination, in production.",
        team: '2 full-stack developers',
        duration: 'built in 26 days',
        improvements: [
          'Three lead channels in one place',
          'Client documents read by AI',
          'The owner edits his own funnel and automations',
        ],
        problem:
          // Ver content/pt.ts: o ANTES faltava, e sem ele o depois não tem
          // contra o quê ser medido.
          "The whole operation ran on spreadsheets. Leads arrived through three channels — Instagram, LinkedIn and WhatsApp — and were copied over by hand; nobody knew off the top of their head who had already been contacted, and the calendar, the proposal and the documents each lived somewhere else. The product had to become the brokerage's operating system, not a spreadsheet with a coat of paint.",
        architecture:
          // Ver content/pt.ts: fica o que descreve a forma do sistema, sai o
          // que mede esforço (linhas, migrations, commits, dias).
          'TypeScript monorepo with Fastify 5 on the API and Supabase/PostgreSQL as the database. Three isolated frontends: an admin panel in React, an external consultant panel (restricted access, scoped to their own data), and an Astro landing page for lead capture. It runs on 56 tables with 146 RLS policies, 219 endpoints and 42 screens. In production at os.capstack.capital.',
        decisions: [
          {
            title: '146 RLS policies across 56 tables',
            body: "Authorization lives in the database, not the application: every table carries its own row-level security policies, so a bug in the API cannot leak another consultant's data. The cost is performance — every policy runs a context function per row — solved by rewriting the helpers as a scalar subquery so PostgreSQL's planner evaluates it once per query instead of once per row (InitPlan optimization).",
          },
          {
            title: 'Blue-green deploy on a VPS',
            body: 'Every deploy brings the new version up on a separate port from the one currently serving traffic. A 15-attempt health check decides whether it is healthy before any user is routed there. If it fails, the new container is removed and the old one keeps serving — the worst case of a bad deploy is the deploy not happening, never downtime.',
          },
          {
            title: 'WhatsApp dead man’s switch',
            body: 'A container can answer 200 on its HTTP health check while the WhatsApp instance behind it is disconnected — a failure no conventional HTTP probe sees. A cron job every 2 minutes checks the real connection state; if it dropped, it deliberately stops pinging healthchecks.io so the external service raises the alarm from the absence of a signal.',
          },
          {
            title: 'Safe weighted lottery under concurrency',
            body: 'Lead distribution weighs each consultant by clientes_ativos / peso, but two leads arriving at the same time cannot land on the same consultant because of a stale read. Selecting the customer and the consultant uses SELECT … FOR UPDATE inside a single transaction, serializing the read-and-write without locking the whole table.',
          },
        ],
        stack: ['TypeScript', 'Fastify 5', 'Supabase', 'PostgreSQL', 'React', 'Astro', 'Playwright', 'pgTAP', 'Docker'],
        // Ver content/pt.ts: fecha no ganho do cliente, sem número de
        // resultado, e a última frase é o argumento mais forte do case.
        outcome:
          'The three channels now land in one place, and the lead is routed the moment it arrives — weighted round-robin or assigned to a specific consultant. The calendar syncs with Google Calendar, client documents are read by AI instead of checked by hand, the messaging layer answers the repetitive part on its own, and the performance report arrives with whatever the AI found out of pattern. Admin and salesperson each have their own app. And the owner builds his own funnel and his own automations: changing a rule of the process stopped depending on me.',
      },
      'saturno-labs': {
        name: 'Saturno Labs',
        tagline: "Autonomous B2B marketing platform that measures a brand's authority inside AI answers.",
        team: '2 full-stack developers',
        duration: 'built in under 45 days',
        improvements: [
          'Research comes before the piece',
          'Article, carousel and posts come out of the gap found',
          'What gets published returns indexed to memory',
        ],
        problem:
          'B2B brands are already being cited — or ignored — by ChatGPT, Gemini, Claude and Perplexity whenever someone asks about a category, and there was no metric for it, no process, and no one approving a piece of content before it went out. What was missing was a platform that measured Share of Voice inside AI answers and automated the response without releasing media budget unsupervised.',
        architecture:
          "A monorepo with 14 packages and 3 apps. Fastify 5 API with Zod validating input, documenting the OpenAPI spec, and structuring the LLM output from the same schema. PostgreSQL 16 with pgvector for embeddings, Drizzle as the ORM, BullMQ over Redis for queues and 13 cron jobs, React front-end with three.js for the constellation scene. It runs on 60 tables, 240 endpoints and 1,102 test cases.",
        decisions: [
          {
            title: 'Executable documentation gate in CI',
            body: 'An extractor derives a canonical inventory of routes, tables and jobs from the code; a verifier runs 9 checks that break the build, including one that confirms every number stated in the documentation prose matches that inventory. The documentation cannot lie because the build will not let it.',
          },
          {
            title: 'Fail-closed compliance barrier',
            body: 'Every piece passes a deterministic blocklist, then an AI judge that returns a structured verdict, then human approval. If the vetting step fails — LLM down, timeout — the piece stays in draft. Unavailability never turns into approval by default.',
          },
          {
            title: 'Five gates between the AI and the media budget',
            body: "An action proposed by the AI only auto-applies if it passes five checks in sequence: schema validation, campaign in autopilot mode, kill switch off, eligibility approved, and creative approved. Failing any one of them blocks the action, and the system never re-enables anything on its own.",
          },
          {
            title: 'KPIs that prefer saying "I don\'t know"',
            body: 'When AI-provider battery coverage drops below 50%, the run is marked degraded instead of complete. A provider being down cannot show up on the chart as if the brand had lost authority — erring on the side of caution is the correct choice.',
          },
        ],
        stack: ['TypeScript', 'Fastify 5', 'Zod', 'PostgreSQL', 'pgvector', 'Drizzle', 'BullMQ', 'Redis', 'React', 'three.js'],
        // Ver content/pt.ts: o ciclo fechado é o argumento.
        outcome:
          'Research now comes before the piece: the system looks at what already ranks, where the competitor got to, and which question nobody has answered — and it is out of that gap that the article, the carousel and the Instagram and LinkedIn posts come. The article is published to the blog and returns to the system memory, indexed, so the next round starts knowing what the previous one did. The CRM is omnichannel: the conversation a piece starts does not get lost on the other side.',
      },
      'moveis-pro': {
        name: 'Moveis.pro',
        tagline: 'Multi-tenant SaaS for furniture stores, with CRM and WhatsApp/Instagram operations.',
        team: '2 full-stack developers',
        duration: 'built in under 45 days',
        improvements: [
          'Service, order and stock in one place',
          'A closed order goes straight to the factory',
          'The sale stops changing tools at every step',
        ],
        problem:
          "Furniture stores sell over WhatsApp and Instagram with no CRM: conversations get lost, salespeople don't know who has already been helped, and each store is a separate customer that should never see another store's data. What was missing was a SaaS that handled the commercial side for real inside each store, without mixing tenants.",
        architecture:
          // "3 applications" com dígito — ver content/pt.ts. E o fecho com a
          // URL saiu: repetia o botão "View repository" logo abaixo.
          'There are 3 applications: a Fastify API, a Next.js management panel, and a PWA for salespeople to use on the shop floor. The data model has 40 Prisma models. Deployed on a VPS with Nginx, with a CI pipeline that enforces a test coverage threshold before allowing a merge.',
        decisions: [
          {
            title: 'Multi-tenant isolation',
            body: 'Each store is an isolated tenant: every query carries the tenant scope, and the data model was designed so an application bug cannot cross data between two stores — the same authorization concern as OSCapstack, solved at the schema level instead of RLS because the database here is Prisma over a shared Postgres, not Supabase.',
          },
          {
            title: 'Per-instance conversation assignment to salespeople',
            body: 'Each store can run more than one WhatsApp/Instagram instance, and a conversation landing on an instance needs to be assigned to the right salesperson without two people answering the same customer. Assignment happens per instance, not globally, because that is how the actual store organizes its team.',
          },
          {
            title: 'Offline-first PWA for in-store use',
            body: 'Salespeople use the PWA on the shop floor, where Wi-Fi drops. The interface works offline and syncs once the connection returns, instead of freezing on an error screen in the middle of serving a customer.',
          },
          {
            title: 'Deploy pipeline with a separate prod/dev policy',
            body: 'CI enforces a test coverage threshold before allowing a merge, and the VPS deploy with Nginx follows a policy that separates what goes to production from what stays in development — no merge reaches production just because it passed the build.',
          },
        ],
        stack: ['TypeScript', 'Next.js', 'Fastify', 'Prisma', 'PostgreSQL', 'PWA', 'Docker', 'Nginx'],
        // Ver content/pt.ts: o ganho de tempo aparece amarrado ao mecanismo
        // que o produz, nunca como afirmação solta e não medida.
        outcome:
          "The system answers the customer, closes the order, sends it to the factory and tracks stock — all in the same place where the conversation started. The sale stopped changing tools at every step, which is where the handover used to get lost, and where the salesperson's time went.",
      },
    },
  },
  stack: {
    label: 'Stack',
    // Ver content/pt.ts: a frase se defendia de uma crítica que ninguém fez.
    lead: 'Every item carries a declared level and a source — code or experience.',
    levels: {
      dominio: 'Mastery',
      producao: 'Production',
      contato: 'Exposure',
    },
    // Ver content/pt.ts: "with no claim of depth" era hedge.
    legend: "Mastery: used in production and I can debug it. Production: I've shipped with it. Exposure: used it on something specific.",
    sourceNote: {
      repo: 'Code',
      experience: 'Experience',
    },
    // Mesma ordem deliberada de content/pt.ts: software primeiro,
    // infraestrutura por último. Nunca reordenar sem reordenar o outro
    // idioma junto.
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
        label: 'Data',
        source: 'repo',
        items: [
          { name: 'PostgreSQL', level: 'dominio' },
          { name: 'pgvector', level: 'producao' },
          { name: 'Supabase/RLS', level: 'dominio' },
          { name: 'Drizzle', level: 'producao' },
          { name: 'Prisma', level: 'producao' },
          { name: 'Redis', level: 'producao' },
          { name: 'Raw SQL', level: 'dominio' },
        ],
      },
      {
        label: 'Applied AI',
        source: 'repo',
        items: [
          // Ver content/pt.ts para o porquê dos três em Domínio.
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
        label: 'SEO, GEO & Measurement',
        source: 'repo',
        items: [
          { name: 'Technical SEO', level: 'dominio' },
          { name: 'GEO (AI answers)', level: 'dominio' },
          { name: 'JSON-LD / Schema.org', level: 'dominio' },
          { name: 'Custom KPIs', level: 'dominio' },
          { name: 'Event tracking', level: 'dominio' },
          { name: 'Share of Voice in AI', level: 'dominio' },
          { name: 'Core Web Vitals', level: 'dominio' },
          { name: 'IndexNow', level: 'dominio' },
          { name: 'Blog & RSS feed', level: 'dominio' },
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
        // Ver content/pt.ts: Docker, Nginx, VPS e blue-green vieram da camada
        // de redes, onde a etiqueta "Experiência" rebaixava itens que têm
        // código auditável.
        label: 'Delivery & Infrastructure',
        source: 'repo',
        items: [
          { name: 'Vitest', level: 'dominio' },
          { name: 'Playwright', level: 'dominio' },
          { name: 'GitHub Actions', level: 'dominio' },
          { name: 'Turborepo', level: 'dominio' },
          { name: 'Docker', level: 'dominio' },
          { name: 'Nginx', level: 'dominio' },
          { name: 'VPS', level: 'dominio' },
          { name: 'Blue-green deploy', level: 'dominio' },
          { name: 'pgTAP', level: 'producao' },
          { name: 'pnpm', level: 'producao' },
          { name: 'PM2', level: 'producao' },
          { name: 'Heartbeat/uptime', level: 'producao' },
        ],
      },
      {
        // Ver content/pt.ts: só o que de fato não tem repositório para
        // mostrar fica sob a etiqueta "Experiência".
        label: 'Networking',
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
    label: 'Contact',
    lead: 'A role, a defined project, or an idea that has not become a scope yet — reach out directly, no middleman.',
    form: {
      name: 'Name',
      email: 'Email',
      message: 'Message',
      submit: 'Send',
      sending: 'Sending…',
      success: 'Message sent. I will reply soon.',
      error: 'Could not send right now. Try WhatsApp or email instead.',
      honeypotLabel: 'Leave this field blank',
    },
    // Ver content/pt.ts: não reintroduzir um bloco de "o que mandar junto".
    channels: {
      whatsapp: 'For a quick conversation',
      email: 'For scope, attachments and proposals',
      github: 'Public code, to check for yourself',
    },
    whatsapp: 'https://wa.me/5583986226441',
    whatsappMessage: 'Hi, Neto! I saw your portfolio and would like to talk about a project.',
    email: 'netoguild@gmail.com',
    github: 'https://github.com/netoguild-rgb',
    cvDownload: 'Download CV (PDF)',
    landingLink: 'Looking for someone to build it? See how I work on projects.',
  },
  landing: {
    meta: {
      title: 'Websites, blogs and custom systems — Neto Alves',
      // "rank on Google" era mais forte do que "aparecer no Google" do PT:
      // posição no ranking não é mais controlável do que menção em resposta
      // de IA, e a página inteira existe para não prometer o que não
      // controla. Ver content/pt.ts.
      description:
        'Two full-stack developers. Websites, blogs and systems built to load fast, show up on Google and be readable by ChatGPT.',
    },
    hero: {
      titulo: 'Websites, blogs and custom systems.',
      // Ver content/pt.ts (meta.description): "rank on Google" claims more
      // than the PT "aparecer no Google" — ranking position is no more
      // controllable than an AI mention.
      subtitulo: 'Built to load fast, show up on Google and be readable by ChatGPT.',
      assinatura: 'Two full-stack developers. You talk straight to whoever writes the code.',
    },
    cta: {
      rotulo: 'Get a quote',
      mensagem: 'Hi, Neto! I saw your projects page and I would like a quote.',
      tranquilizador: 'No calls, no sign-up.',
    },
    criterio: {
      titulo: 'How to tell whether the site they deliver is any good',
      abertura: 'You will get three quotes and they will all look the same. Two tests tell them apart.',
      testes: [
        {
          titulo: 'Open it on a phone, on mobile data.',
          corpo: 'Over two seconds and you lose people before they see anything at all.',
        },
        {
          titulo: 'Ask to see the site with JavaScript turned off.',
          corpo: 'If the screen goes blank, that is exactly what ChatGPT sees: nothing.',
        },
      ],
      fecho: [
        'Almost nobody runs the second test. When someone asks ChatGPT which company to hire in your field, it reads the site straight from the server — it does not open it in a browser the way you do. A site that assembles itself in the browser arrives empty.',
        'This is not a forecast, it is how it works today. It is also not the emergency you are being sold: that kind of visit is still a small slice of the total in Brazil. It just converts at more than twice the rate of Google traffic.',
      ],
    },
    oferta: {
      // Ver content/pt.ts: "What I build" sat in the same scroll as "both of
      // us know the whole codebase" (Dupla) — singular voice handing back
      // the single-point-of-failure objection the section above just
      // disarmed. Kept plural across dict.landing (final branch review,
      // finding I5); the rest of the site keeps its one-person voice.
      titulo: 'What we build',
      cartoes: [
        {
          nome: 'Website',
          corpo:
            'Corporate, product or lead capture. Loads instantly, and the text arrives ready from the server — which is what Google and ChatGPT read.',
        },
        {
          nome: 'Blog',
          corpo: 'Where authority accumulates. Publish it and search engines know within seconds.',
        },
        {
          nome: 'Custom system',
          corpo:
            'When the operation does not fit in a website. CRM, ERP, dashboards, automation — from the database to production.',
        },
      ],
    },
    dupla: {
      titulo: 'Two full-stack developers',
      corpo: [
        'You talk straight to whoever writes the code. No project manager, no intern, no outsourcing.',
        'And it does not hang on one person: both of us know the whole codebase.',
      ],
      numeros: [{ valor: '2', rotulo: 'developers' }],
    },
    prova: {
      // Ver content/pt.ts: "Three systems in production" was FALSE
      // (saturno-labs has `production: false`, it is 2 of 3), collided with
      // the "5 in production" the Dupla band renders one scroll above, and
      // promised a number this section rendered zero of. No system count is
      // hard-coded here on purpose — the safe number only exists computed at
      // render time (`systems.filter((s) => s.production).length`, see
      // Prova.tsx), never as a word or digit in this dictionary.
      titulo: 'What has been built',
      lead: 'Each system with the numbers that show its scale — and what changed for the client who hired it.',
      // Single link at the end of the section now, not one per card (see
      // Prova.tsx, final branch review finding I6: three large exits on a
      // page that deleted its own menu to avoid exits). Points at the whole
      // portfolio, not one specific case — hence the plural.
      verCase: 'Read the full case studies',
    },
    piso: null,
    fechamento: {
      // Ver content/pt.ts: "Bring me / Tell me" era primeira pessoa do
      // singular, mesma inconsistência de voz da Oferta.
      titulo: 'Bring us the problem.',
      corpo: 'Tell us what needs to exist and by when.',
    },
    auditoria: {
      titulo: 'Run the second test right now',
      descricao:
        'Paste your website address. We will read it the same way ChatGPT does — asking the server for the page, running nothing.',
      rotuloCampo: 'Your website address',
      exemplo: 'yourcompany.com',
      botao: 'Read my site',
      carregando: 'Reading your site…',
      erroEndereco: 'I could not make sense of that address. Try something like yourcompany.com',
      resultado: {
        palavras: 'words found',
        legivel: 'AI can read your site.',
        vazio: 'ChatGPT sees what is essentially a blank page.',
        bloqueado:
          'We could not read your site — it refused our request. That says nothing about its content, only that something is guarding the door.',
        naoHtml: 'That address did not return a web page.',
        construidoEm: 'Built on',
        amostra: 'The start of what AI read:',
        paginas: 'pages on the site.',
        atualizadoEm: 'The most recent was updated in',
        parado:
          'Content that has not moved is rarely cited in answers about what is happening now — AI leans on what was written recently.',
        grupos: {
          visivel: 'What AI can see',
          citavel: 'What there is to cite',
          apresenta: 'How the site presents itself',
        },
        checagens: {
          permissao: 'Crawlers are allowed',
          idioma: 'The site declares its language',
          marcado: 'The content is marked up',
          vivo: 'The content is alive',
          blog: 'The site publishes content',
          titulo: 'The page identifies itself',
          descricao: 'The page describes itself',
          assunto: 'The page states a subject',
          cartao: 'The link becomes a card when shared',
        },
        detalhes: {
          semTitulo: 'no title',
          semDescricao: 'no description',
          semAssunto: 'no H1',
          assuntoDemais: 'too many H1s',
          semMarcacao: 'no structured data',
          comMarcacao: 'structured data',
          nenhumBloqueado: 'none blocked',
          semData: 'no date in the sitemap',
          semIdioma: 'not declared',
          semBlog: 'no blog',
          comBlog: 'publishes',
          semCartao: 'no og:image',
          comCartao: 'full card',
        },
        notaMarcacao:
          'Structured data helps Google build rich results. It does not move AI citations — that was measured across 1,885 pages and barely changed.',
        entendeu: 'The answer an AI would give about you',
        entendeuNota:
          'Read by Llama 3.3 via Groq. This is not ChatGPT, and the answer changes from one run to the next — it is a reading, not a measurement. The list above is the measurement.',
      },
      escopo:
        'This test reads your site the way AI reads it and checks the page fundamentals. It does not measure how long the site takes to open on mobile data, nor whether the content answers what people ask about your field — and nothing here tells you whether the text that exists is any good.',
      cta: 'Talk about this on WhatsApp',
    },
    perguntas: {
      titulo: 'Questions',
      itens: [
        {
          pergunta: 'My site is on WordPress. Is that a problem?',
          resposta:
            'Not in itself. WordPress, Wix and Shopify all deliver the page ready from the server, which is what AI needs. What hurts is what piles up on top: too many plugins, cheap hosting and — most common of all — a security setting that blocks the crawler thinking it is a scraper. All three are fixable without changing platform.',
        },
        {
          pergunta: 'What if one of you is unavailable?',
          resposta:
            'Both of us know the whole codebase and the repository is shared from day one. The project does not stop because one person did.',
        },
        {
          pergunta: 'Does this replace SEO work?',
          resposta:
            'No. SEO still matters for traditional search, which brings most of the visits. What we guarantee is the technical foundation: without it, no amount of content work pays off.',
        },
        {
          pergunta: 'How long does it take?',
          // Ver content/pt.ts: era "26 to 45 days" — as fontes reais são
          // '26 dias' e 'menos de 45 dias' (duas vezes); "45" sozinho afirma
          // um teto que nenhum dos três sistemas bateu de verdade.
          resposta:
            'It depends on scope. The three systems in the portfolio took 26 to under 45 days each, with two people. A corporate site is much faster — but we only quote a deadline after understanding what needs to exist.',
        },
      ],
    },
  },
  footer: {
    rights: '© 2026 Neto Alves. All rights reserved.',
    builtWith: 'Built with Next.js, Tailwind CSS and Motion.',
    sourceCode: 'View source on GitHub',
    sourceCodeUrl: 'https://github.com/labsfluxo-stack/portfolio',
  },
}
