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
    scrollHint: 'scroll to operate',
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
    // Ver content/pt.ts: a hero já carrega o argumento do plantão, então
    // esta linha fica só com os quatro papéis numa pessoa só.
    lead: 'The same person models the database, writes the API, ships the front end and runs the deploy — and answers for all four.',
    body: [
      'I build complete systems, from zero to production: data modelling, API, interface, queues, deploy, and the instrumentation that tells you whether it is still standing. Nine systems so far, five running today — the three largest are open on this page, with numbers you can check one by one.',
      "Infrastructure came before the code: networks, switches and servers. It is not the service I sell today, it is the reason what I ship holds up — someone who spent those years accountable for other people's uptime designs software around how it stays standing, not only around how it works.",
      "The newest layer is measuring what almost nobody measures: custom KPIs, technical SEO and GEO — the discipline of showing up in answers from ChatGPT, Gemini and Perplexity, not just on Google's first page. This portfolio is the demonstration: real static HTML, because AI crawlers don't execute JavaScript.",
    ],
    photoAlt: 'Portrait of Neto Alves',
    photoPending: 'Photo to be added',
    // Ver o comentário equivalente em content/pt.ts: rotulado como BASE, não
    // como "Experience". Os vendors continuam — credencial real — mas
    // deixaram de ser a manchete do currículo.
    experience: {
      label: 'Technical foundation',
      years: '10+ years in infrastructure and networking',
      body: 'Networks, switches and servers before the first system in production. VPS, DNS, Nginx, Docker, blue-green deploys with rollback and messaging integration — the foundation that makes the software I write survive what nobody tested.',
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
    statusLabels: { production: 'Operational', proprietary: 'Proprietary' },
    readCase: 'Read case study',
    proprietaryNote: 'Proprietary code — no public repository.',
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
      retro: 'What I would do differently',
      backToHome: 'Back',
    },
    // Ver content/pt.ts: só prosa aqui, nome de tecnologia vive no componente.
    diagram: {
      caption: 'Highlighted, the decision that holds up the rest.',
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
        problem:
          "A real-estate credit operation needs a commercial system a brokerage can run on its own: customer records, lead distribution across consultants, proposal tracking, and a WhatsApp channel that cannot go down without anyone noticing. The product had to work as the operation's own operating system, not a spreadsheet with a coat of paint.",
        architecture:
          'TypeScript monorepo with Fastify 5 on the API and Supabase/PostgreSQL as the database. Three isolated frontends: an admin panel in React, an external consultant panel (restricted access, scoped to their own data), and an Astro landing page for lead capture. 78,900 lines of code, 73 migrations, 56 tables with 146 RLS policies, 219 endpoints and 42 screens, built in 444 commits over 26 days. In production at os.capstack.capital.',
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
        retro:
          'Today I would introduce the InitPlan optimization on policies from the very first migration, not after feeling the cost in production — going back to rewrite the RLS helper across 56 already-populated tables is work you can skip just by knowing the pattern before writing the first policy.',
      },
      'saturno-labs': {
        name: 'Saturno Labs',
        tagline: "Autonomous B2B marketing platform that measures a brand's authority inside AI answers.",
        problem:
          'B2B brands are already being cited — or ignored — by ChatGPT, Gemini, Claude and Perplexity whenever someone asks about a category, and there was no metric for it, no process, and no one approving a piece of content before it went out. What was missing was a platform that measured Share of Voice inside AI answers and automated the response without releasing media budget unsupervised.',
        architecture:
          "A monorepo with 14 packages and 3 apps. Fastify 5 API with Zod validating input, documenting the OpenAPI spec, and structuring the LLM output from the same schema. PostgreSQL 16 with pgvector for embeddings, Drizzle as the ORM, BullMQ over Redis for queues and 13 cron jobs, React front-end with three.js for the constellation scene. 37,672 lines of code (23,580 production, 14,092 test), 57 migrations, 60 tables, 240 endpoints, 1,102 test cases and 798 commits.",
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
        retro:
          'I would write the documentation gate much earlier: I built it only after the prose had already drifted from the production code, and fixing that took a full audit instead of a verifier running since commit zero.',
      },
      'moveis-pro': {
        name: 'Moveis.pro',
        tagline: 'Multi-tenant SaaS for furniture stores, with CRM and WhatsApp/Instagram operations.',
        problem:
          "Furniture stores sell over WhatsApp and Instagram with no CRM: conversations get lost, salespeople don't know who has already been helped, and each store is a separate customer that should never see another store's data. What was missing was a SaaS that handled the commercial side for real inside each store, without mixing tenants.",
        architecture:
          'Three applications: a Fastify API, a Next.js management panel, and a PWA for salespeople to use on the shop floor. The data model has 40 Prisma models, 56,500 lines of code and 231 commits. Deployed on a VPS with Nginx, with a CI pipeline that enforces a test coverage threshold before allowing a merge. Public code at github.com/netoguild-rgb/Moveis.pro.',
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
        retro:
          'I would design the per-instance conversation assignment with a concurrency test from day one — today it depends on discipline in the assignment code, and a test simulating two messages arriving at the same time would have caught early any race I did not see while writing it.',
      },
    },
  },
  stack: {
    label: 'Stack',
    lead: 'Not an icon cloud: every item carries a declared level and a source — audited code or professional experience.',
    levels: {
      dominio: "Mastery — used in production, I can debug it",
      producao: "Production — I've shipped with it",
      contato: 'Exposure — used it, no claim of depth',
    },
    sourceNote: {
      repo: 'Verified in audited code.',
      experience: 'Declared professional experience, not repository.',
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
        label: 'SEO, GEO & Measurement',
        source: 'repo',
        items: [
          { name: 'Technical SEO', level: 'dominio' },
          { name: 'GEO (AI answers)', level: 'dominio' },
          { name: 'JSON-LD / Schema.org', level: 'dominio' },
          { name: 'Custom KPIs', level: 'dominio' },
          { name: 'Share of Voice in AI', level: 'producao' },
          { name: 'Core Web Vitals', level: 'producao' },
          { name: 'IndexNow', level: 'producao' },
          { name: 'Blog & RSS feed', level: 'producao' },
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
        label: 'Quality & Delivery',
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
      {
        label: 'Networking & Infrastructure',
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
          { name: 'Blue-green deploy', level: 'dominio' },
          { name: 'PM2', level: 'producao' },
          { name: 'Heartbeat/uptime', level: 'producao' },
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
    disabledNote: 'Form unavailable right now — reach out directly via WhatsApp or email.',
    whatsapp: 'https://wa.me/5583986226441',
    whatsappMessage: 'Hi, Neto! I saw your portfolio and would like to talk about a project.',
    email: 'netoguild@gmail.com',
    github: 'https://github.com/netoguild-rgb',
    cvDownload: 'Download CV (PDF)',
  },
  footer: {
    rights: '© 2026 Neto Alves. All rights reserved.',
    builtWith: 'Built with Next.js, Tailwind CSS and Motion.',
    sourceCode: 'View source on GitHub',
    sourceCodeUrl: 'https://github.com/labsfluxo-stack/portfolio',
  },
}
