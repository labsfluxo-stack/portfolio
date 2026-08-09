import type { System } from '@/content/systems'
import type { Dictionary, SystemSlug } from '@/content/types'
import { Arrow, Box, DiagramDefs, DiagramFrame, Elbow, Tag } from './parts'

/**
 * Um diagrama de arquitetura por sistema, cada um com a FORMA do sistema que
 * descreve — não três variações do mesmo desenho:
 *
 *   OSCapstack   convergência: três frontends distintos caem numa API só, e
 *                a autorização mora no banco, embaixo de tudo.
 *   Saturno      esteira: coleta vira fila, fila vira dado, e o dado só
 *                chega no dinheiro depois de atravessar portões.
 *   Moveis.pro   faixas: cada loja é uma raia que nunca cruza a vizinha.
 *
 * REGRA DE HONESTIDADE: nenhum número aqui pode ser literal solto no
 * componente. Quantidade sai de `system.metrics` (content/systems.ts) — a
 * mesma fonte do card da home, então o desenho não consegue afirmar um número
 * que a página anterior contradiz. O resto vem do dicionário ("Sonda 2 min",
 * "5 travas") ou é versão de produto que o próprio case cita ("Fastify 5",
 * "PostgreSQL 16"). Um diagrama é a superfície mais fácil de arredondar um
 * número para o desenho ficar bonito, e ninguém notaria — a prosa fica logo
 * abaixo dizendo outra coisa. tests/unit/diagrams.test.tsx quebra se aparecer
 * número que não esteja em nenhuma dessas fontes.
 *
 * REGRA DE DESTAQUE: exatamente UMA caixa em ciano por diagrama, a decisão
 * que sustenta o resto. A paleta do site é monocromática com um único dado
 * colorido; dois destaques num desenho de oito caixas não destacam nada.
 */

/** Busca uma métrica pela chave. Lança em vez de renderizar `undefined` na
 *  tela: um número faltando no diagrama é defeito, não caso de borda. */
function metric(system: System, key: string): number {
  const found = system.metrics.find((m) => m.key === key)
  if (!found) throw new Error(`métrica "${key}" ausente em ${system.slug} — o diagrama depende dela`)
  return found.value
}

type Props = { system: System; dict: Dictionary }

/** Convergência: três clientes, uma API, e a autorização no banco. */
function Oscapstack({ system, dict }: Props) {
  const d = dict.systems.diagram
  const id = 'dg-osc'
  const client = { w: 190, y: 30, h: 34 }
  const xs = [20, 225, 430]
  const centre = 320

  return (
    <DiagramFrame viewBox="0 0 680 268" caption={d.caption}>
      <DiagramDefs id={id} />

      <Tag x={20} y={18}>{`${metric(system, 'screens')} ${d.screens}`}</Tag>

      <Box x={xs[0] as number} y={client.y} w={client.w} label={d.admin} note="React" />
      <Box x={xs[1] as number} y={client.y} w={client.w} label={d.consultant} note="React" />
      <Box x={xs[2] as number} y={client.y} w={client.w} label={d.landing} note="Astro" />

      {/* Cotovelo, não diagonal: três linhas retas convergindo cruzariam as
          caixas vizinhas no caminho até o centro. */}
      {xs.map((x) => (
        <Elbow
          key={x}
          id={id}
          from={{ x: x + client.w / 2, y: client.y + client.h }}
          to={{ x: centre, y: 108 }}
          midY={86}
        />
      ))}

      <Box x={220} y={110} w={200} label={d.api} note="Fastify 5" />
      <Arrow id={id} x1={centre} y1={144} x2={centre} y2={172} />
      <Box x={220} y={174} w={200} label={d.database} note="Supabase · PostgreSQL" />

      {/* A caixa em destaque fica PRESA embaixo do banco, e a posição é o
          argumento: a autorização não está na aplicação, está no banco. */}
      <Arrow id={id} x1={centre} y1={208} x2={centre} y2={224} accent />
      <Box
        x={220}
        y={226}
        w={200}
        h={30}
        label={`${metric(system, 'policies')} ${d.policies}`}
        accent
      />

      {/* Sonda do WhatsApp. A seta para o alarme é tracejada porque o sinal é
          a AUSÊNCIA de ping: se a instância cai, a sonda para de avisar e o
          serviço externo dispara pelo silêncio. */}
      <Arrow id={id} x1={420} y1={127} x2={468} y2={127} />
      <Box x={470} y={110} w={190} label="WhatsApp" />
      <Arrow id={id} x1={565} y1={144} x2={565} y2={172} />
      <Box x={470} y={174} w={190} label={d.watchdog} note="cron" />
      <Arrow id={id} x1={565} y1={208} x2={565} y2={224} dashed />
      <Box x={470} y={226} w={190} h={30} label={d.alarm} note="healthchecks.io" />
    </DiagramFrame>
  )
}

/** Esteira: a coleta vira fila, e nada chega ao orçamento sem atravessar
 *  portões. */
function SaturnoLabs({ system, dict }: Props) {
  const d = dict.systems.diagram
  const id = 'dg-sat'
  const top = { y: 30, h: 34, w: 200 }
  const gate = { y: 122, h: 34, w: 118 }
  const gateXs = [21, 151, 281, 411, 541]

  return (
    <DiagramFrame viewBox="0 0 680 180" caption={d.caption}>
      <DiagramDefs id={id} />

      <Tag x={20} y={18}>{`${metric(system, 'packages')} ${d.packages}`}</Tag>

      <Box x={20} y={top.y} w={top.w} label={d.providers} note="Anthropic · OpenAI · Google · Groq" />
      <Arrow id={id} x1={222} y1={47} x2={238} y2={47} />
      <Box
        x={240}
        y={top.y}
        w={top.w}
        label={d.queue}
        note={`BullMQ · Redis · ${metric(system, 'jobs')} ${d.jobs}`}
      />
      <Arrow id={id} x1={442} y1={47} x2={458} y2={47} />
      <Box x={460} y={top.y} w={top.w} label={d.database} note="PostgreSQL 16 · pgvector" />

      {/* Desce do banco para a fila de portões. */}
      <Elbow id={id} from={{ x: 560, y: 64 }} to={{ x: 80, y: 120 }} midY={94} />

      {gateXs.map((x, i) => (
        <g key={x}>
          {i > 0 ? <Arrow id={id} x1={x - 10} y1={139} x2={x - 2} y2={139} accent={i === 4} /> : null}
          <Box
            x={x}
            y={gate.y}
            w={gate.w}
            h={gate.h}
            label={[d.blocklist, d.judge, d.humanApproval, d.locks, d.budget][i] as string}
            note={i === 1 ? 'LLM' : undefined}
            accent={i === 3}
          />
        </g>
      ))}
    </DiagramFrame>
  )
}

/** Faixas: cada loja é uma raia isolada, e a fronteira é explícita. */
function MoveisPro({ system, dict }: Props) {
  const d = dict.systems.diagram
  const id = 'dg-mov'
  const lane = { w: 190, y: 30, h: 34 }
  const laneXs = [40, 245, 450]
  const centre = 340

  return (
    <DiagramFrame viewBox="0 0 680 232" caption={d.caption}>
      <DiagramDefs id={id} />

      <Tag x={20} y={18}>{`${metric(system, 'apps')} apps`}</Tag>

      {laneXs.map((x, i) => (
        <g key={x}>
          <Box
            x={x}
            y={lane.y}
            w={lane.w}
            label={`${d.store} ${String.fromCharCode(65 + i)}`}
            note="WhatsApp · Instagram"
          />
          <Arrow id={id} x1={x + lane.w / 2} y1={lane.y + lane.h} x2={x + lane.w / 2} y2={82} accent />
        </g>
      ))}

      {/* A fronteira é a decisão, e por isso é ela que leva o destaque: toda
          consulta carrega o escopo do tenant, e o modelo de dados foi
          desenhado para um bug de aplicação não conseguir cruzar duas lojas. */}
      <rect x={30} y={84} width={620} height={18} fill={`url(#${id}-hatch)`} className="stroke-data" strokeWidth="1.2" />
      <Tag x={centre} y={96} anchor="middle" accent>
        {d.tenantScope}
      </Tag>

      <Arrow id={id} x1={centre} y1={102} x2={centre} y2={126} accent />
      <Box x={240} y={128} w={200} label={d.api} note="Fastify" />

      <Box x={30} y={128} w={180} label={d.admin} note="Next.js" />
      <Arrow id={id} x1={212} y1={145} x2={238} y2={145} />

      {/* A PWA sincroniza quando a conexão volta — o laço tracejado é o
          offline-first, não um segundo caminho de dados.
          O laço passa POR BAIXO da caixa, não por dentro: a primeira versão
          curvava para a direita a partir do meio do topo e o arco cortava a
          própria caixa que ele descreve. */}
      <Box x={470} y={128} w={180} label={d.salesApp} note="PWA" />
      <Arrow id={id} x1={468} y1={145} x2={442} y2={145} />
      <path
        d="M520 163 C 505 198, 615 198, 601 166"
        fill="none"
        className="stroke-faint"
        strokeWidth="0.9"
        strokeDasharray="3 2.5"
        markerEnd={`url(#${id}-arrow)`}
      />
      <Tag x={560} y={212} anchor="middle">
        {`${d.offline} · ${d.sync}`}
      </Tag>

      <Arrow id={id} x1={centre} y1={162} x2={centre} y2={186} />
      <Box
        x={240}
        y={188}
        w={200}
        label={d.database}
        note={`Prisma · ${metric(system, 'models')} ${d.models}`}
      />
    </DiagramFrame>
  )
}

const BY_SLUG: Record<SystemSlug, (props: Props) => React.ReactElement> = {
  oscapstack: Oscapstack,
  'saturno-labs': SaturnoLabs,
  'moveis-pro': MoveisPro,
}

export function SystemDiagram({ system, dict }: Props) {
  // `Record<SystemSlug, ...>` já garante em tipo que os três existem; o
  // acesso direto é seguro e um slug novo quebra a compilação, que é
  // exatamente o aviso que se quer ao acrescentar um sistema.
  const Diagram = BY_SLUG[system.slug]
  return <Diagram system={system} dict={dict} />
}
