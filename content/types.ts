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
  retro: string
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
     * Dois eixos independentes de badge por sistema (ver `System.production` e
     * `System.proprietary` em `content/systems.ts`): um sistema pode exibir
     * os dois badges, um só, ou nenhum. Não é um enum de status único.
     */
    statusLabels: Record<'production' | 'proprietary', string>
    readCase: string
    proprietaryNote: string
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
      retro: string
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
      /** Legenda visível sob cada desenho, curta o bastante para não competir
       * com a prosa da arquitetura, que é a descrição completa. */
      caption: string
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
    disabledNote: string
    whatsapp: string
    whatsappMessage: string
    email: string
    github: string
    // linkedin ainda não foi fornecido pelo dono do site (2026-08-02). Quando
    // vier, adicionar `linkedin: string` aqui e nos dois dicionários — nunca
    // como string vazia, o teste de paridade recusa valor vazio.
    cvDownload: string
  }
  footer: { rights: string; builtWith: string; sourceCode: string; sourceCodeUrl: string }
}
