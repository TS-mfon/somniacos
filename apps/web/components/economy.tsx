import { agents, economyEdges, negotiations, organizations, reputationDimensions, worldEvents } from "@somniacos/shared";

export function WorldFeed() {
  return (
    <div className="space-y-3">
      {worldEvents.map((event) => (
        <article key={event.id} className="panel rounded-3xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="rounded-full border border-signal/25 bg-signal/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-signal">{event.kind}</span>
            <span className="text-xs text-white/42">{event.time}</span>
          </div>
          <h3 className="mt-4 text-xl font-semibold text-white">{event.title}</h3>
          <p className="mt-2 text-sm leading-6 text-white/58">{event.detail}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/48">
            <span>actor: {event.actor}</span>
            {event.counterparty ? <span>counterparty: {event.counterparty}</span> : null}
            {event.value ? <span>value: {event.value}</span> : null}
            {event.tx ? <span>tx: {event.tx}</span> : null}
          </div>
        </article>
      ))}
    </div>
  );
}

export function AgentGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {agents.map((agent) => (
        <a key={agent.id} href={`/app/agents/${agent.id}`} className="panel rounded-3xl p-5 transition hover:-translate-y-1 hover:border-cobalt/40">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-cobalt">{agent.type} Agent</p>
              <h3 className="mt-2 font-display text-3xl text-white">{agent.name}</h3>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs ${agent.risk === "high" ? "bg-danger/15 text-danger" : agent.risk === "medium" ? "bg-ember/15 text-ember" : "bg-signal/15 text-signal"}`}>{agent.risk}</span>
          </div>
          <p className="mt-4 text-sm leading-6 text-white/60">{agent.goal}</p>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            <MiniStat label="Trust" value={`${agent.trust}%`} />
            <MiniStat label="Earned" value={`${agent.earnings.toLocaleString()}`} />
            <MiniStat label="State" value={agent.status} />
          </div>
        </a>
      ))}
    </div>
  );
}

export function OrganizationGrid() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {organizations.map((org) => (
        <a key={org.id} href={`/app/organizations/${org.id}`} className="panel rounded-3xl p-6 transition hover:-translate-y-1 hover:border-signal/40">
          <p className="text-xs uppercase tracking-[0.28em] text-signal">AI Company</p>
          <h3 className="mt-2 font-display text-4xl text-white">{org.name}</h3>
          <p className="mt-4 text-white/60">{org.mission}</p>
          <div className="mt-6 grid grid-cols-3 gap-3">
            <MiniStat label="Treasury" value={`${org.treasury.toLocaleString()} SOM`} />
            <MiniStat label="Revenue" value={`${org.revenue.toLocaleString()} SOM`} />
            <MiniStat label="Agents" value={`${org.agents.length}`} />
          </div>
        </a>
      ))}
    </div>
  );
}

export function NegotiationPanel() {
  return (
    <div className="space-y-4">
      {negotiations.map((negotiation) => (
        <article key={negotiation.id} className="panel rounded-3xl p-6">
          <div className="flex flex-wrap justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-ember">{negotiation.status}</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">{negotiation.task}</h3>
              <p className="mt-2 text-white/55">{negotiation.buyer} buying from {negotiation.seller}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-semibold text-signal">{negotiation.price} SOM</div>
              <div className="text-sm text-white/45">{negotiation.deadline}</div>
            </div>
          </div>
          <div className="mt-6 space-y-2">
            {negotiation.transcript.map((line) => <div key={line} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/66">{line}</div>)}
          </div>
        </article>
      ))}
    </div>
  );
}

export function EconomyMap() {
  return (
    <div className="panel min-h-[620px] overflow-hidden rounded-[2rem] p-6">
      <div className="relative min-h-[560px] rounded-[1.5rem] border border-white/10 bg-[radial-gradient(circle_at_center,rgba(88,246,210,0.08),transparent_36rem)]">
        {agents.slice(0, 6).map((agent, index) => (
          <div key={agent.id} className="absolute rounded-full border border-signal/30 bg-black/60 p-4 shadow-glow" style={{ left: `${12 + (index % 3) * 31}%`, top: `${18 + Math.floor(index / 3) * 36}%` }}>
            <div className="h-3 w-3 animate-pulse rounded-full bg-signal" />
            <div className="mt-2 w-32 text-sm font-medium text-white">{agent.name}</div>
            <div className="text-xs text-white/45">{agent.type}</div>
          </div>
        ))}
        <div className="absolute inset-x-20 top-1/2 h-px signal-line" />
        <div className="absolute inset-y-20 left-1/2 w-px bg-gradient-to-b from-transparent via-cobalt/70 to-transparent" />
        <div className="absolute bottom-5 left-5 grid gap-2 text-sm text-white/58">
          {economyEdges.map((edge) => <span key={`${edge.from}-${edge.to}`}>{edge.kind}: {edge.from} {"->"} {edge.to}</span>)}
        </div>
      </div>
    </div>
  );
}

export function ReputationMatrix() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {reputationDimensions.map((dimension, index) => (
        <div key={dimension} className="panel rounded-3xl p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-white/38">{dimension}</p>
          <div className="mt-5 text-4xl font-semibold text-white">{92 - index * 3}%</div>
          <div className="mt-4 h-2 rounded-full bg-white/10">
            <div className="h-2 rounded-full bg-gradient-to-r from-signal to-cobalt" style={{ width: `${92 - index * 3}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SimulationTimeline() {
  const steps = ["Observe market events", "Think about ROI", "Plan subcontract", "Negotiate terms", "Execute escrow", "Reflect on outcome", "Learn counterparty trust", "Broadcast world event"];
  return (
    <div className="panel rounded-3xl p-6">
      <div className="grid gap-3">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-signal/10 text-signal">{index + 1}</span>
            <div>
              <p className="font-medium text-white">{step}</p>
              <p className="text-sm text-white/48">Agent loop tick #{12048 + index} emitted to realtime stream.</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
      <div className="truncate text-sm font-semibold text-white">{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/34">{label}</div>
    </div>
  );
}
