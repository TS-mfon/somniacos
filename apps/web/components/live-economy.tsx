"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, Bot, Building2, GitBranch, Shield, WalletCards } from "lucide-react";
import { somnia } from "../lib/contracts";
import { buildEconomyState, labelFromUri, type ActivityResponse } from "../lib/onchain-state";

export function useOnchainActivity(refreshMs = 10000) {
  const [data, setData] = useState<ActivityResponse>({ ok: true, activity: [] });
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const response = await fetch("/api/onchain/activity", { cache: "no-store" });
      const json = await response.json() as ActivityResponse;
      setData(json);
    } catch (error) {
      setData({ ok: false, activity: [], error: error instanceof Error ? error.message : "Failed to load onchain activity" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const interval = setInterval(load, refreshMs);
    return () => clearInterval(interval);
  }, [refreshMs]);

  return { data, loading, reload: load, state: useMemo(() => buildEconomyState(data.activity), [data.activity]) };
}

export function LiveTicker() {
  const { data } = useOnchainActivity(12000);
  const items = data.activity.slice(0, 10);
  const tickerItems = items.length ? items : [];
  return (
    <div className="flex min-w-max animate-[marquee_28s_linear_infinite] gap-8 text-sm text-white/70">
      {tickerItems.concat(tickerItems).map((event, index) => (
        <span key={`${event.id}-${index}`}>
          <span className="text-signal">{event.contract}</span> {event.title}
        </span>
      ))}
      {!tickerItems.length ? <span><span className="text-signal">Somnia</span> Waiting for contract events</span> : null}
    </div>
  );
}

export function LiveMetrics() {
  const { data, state } = useOnchainActivity(12000);
  return (
    <div className="mt-4 grid grid-cols-2 gap-3">
      <Metric icon={<Bot />} label="Agents" value={String(state.agents.length)} />
      <Metric icon={<Building2 />} label="Companies" value={String(state.organizations.length)} />
      <Metric icon={<WalletCards />} label="Events" value={String(data.count ?? data.activity.length)} />
      <Metric icon={<Shield />} label="Block" value={data.blockNumber ? `#${data.blockNumber.slice(-6)}` : "..."} />
    </div>
  );
}

export function LiveWorldFeed({ contract }: { contract?: string }) {
  const { data, loading } = useOnchainActivity();
  const items = (contract ? data.activity.filter((item) => item.contract === contract) : data.activity).slice(0, 12);
  return (
    <div className="space-y-3">
      {items.map((event) => (
        <article key={event.id} className="panel rounded-3xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="rounded-full border border-signal/25 bg-signal/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-signal">{event.contract}</span>
            <span className="text-xs text-white/42">block {event.blockNumber}</span>
          </div>
          <h3 className="mt-4 text-xl font-semibold text-white">{event.title}</h3>
          <p className="mt-2 break-all text-sm leading-6 text-white/58">{Object.entries(event.args).map(([key, value]) => `${key}: ${String(value)}`).join(" | ")}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/48">
            {event.value ? <span>value: {event.value}</span> : null}
            <a href={`${somnia.blockExplorers.default.url}/tx/${event.transactionHash}`} target="_blank" rel="noreferrer" className="break-all text-cobalt">{event.transactionHash}</a>
          </div>
        </article>
      ))}
      {!loading && !items.length ? <EmptyState text="No matching real contract events yet. Use the transaction console or demo lab to create one." /> : null}
    </div>
  );
}

export function LiveAgentGrid() {
  const { state } = useOnchainActivity();
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {state.agents.map((agent) => (
        <article key={agent.id} className="panel rounded-3xl p-5 transition hover:-translate-y-1 hover:border-cobalt/40">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-cobalt">Agent #{agent.id}</p>
              <h3 className="mt-2 font-display text-3xl text-white">{agent.name}</h3>
            </div>
            <span className="rounded-full bg-signal/15 px-3 py-1 text-xs text-signal">onchain</span>
          </div>
          <p className="mt-4 break-all text-sm leading-6 text-white/60">{agent.metadataURI}</p>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            <MiniStat label="Skills" value={String(agent.skills.length)} />
            <MiniStat label="Wallet" value={`${agent.wallet.slice(0, 6)}...${agent.wallet.slice(-4)}`} />
            <MiniStat label="Block" value={agent.blockNumber.slice(-6)} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/app/agents/${agent.id}`} className="rounded-full border border-white/12 px-4 py-2 text-sm text-white">View profile</Link>
            <Link href={`/app/agent-workbench?agent=${agent.id}`} className="rounded-full border border-signal/25 bg-signal/10 px-4 py-2 text-sm font-semibold text-signal">Use this agent</Link>
          </div>
        </article>
      ))}
      {!state.agents.length ? <EmptyState text="No onchain agents found yet." /> : null}
    </div>
  );
}

export function LiveOrganizationGrid() {
  const { state } = useOnchainActivity();
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {state.organizations.map((org) => (
        <Link key={org.id} href={`/app/organizations/${org.id}`} className="panel rounded-3xl p-6 transition hover:-translate-y-1 hover:border-signal/40">
          <p className="text-xs uppercase tracking-[0.28em] text-signal">AI Company #{org.id}</p>
          <h3 className="mt-2 font-display text-4xl text-white">{org.name}</h3>
          <p className="mt-4 break-all text-white/60">{org.metadataURI}</p>
          <div className="mt-6 grid grid-cols-3 gap-3">
            <MiniStat label="Members" value={String(org.members.length)} />
            <MiniStat label="Owner" value={`${org.owner.slice(0, 6)}...${org.owner.slice(-4)}`} />
            <MiniStat label="State" value="live" />
          </div>
        </Link>
      ))}
      {!state.organizations.length ? <EmptyState text="No onchain organizations found yet." /> : null}
    </div>
  );
}

export function LiveEconomyMap() {
  const { state } = useOnchainActivity();
  const nodes = state.agents.slice(0, 8);
  const edges = state.tasks.slice(0, 5);
  return (
    <div className="panel min-h-[620px] overflow-hidden rounded-[2rem] p-6">
      <div className="relative min-h-[560px] rounded-[1.5rem] border border-white/10 bg-[radial-gradient(circle_at_center,rgba(88,246,210,0.1),transparent_36rem)]">
        {nodes.map((agent, index) => (
          <div key={agent.id} className="absolute rounded-full border border-signal/30 bg-black/65 p-4 shadow-glow" style={{ left: `${8 + (index % 4) * 23}%`, top: `${14 + Math.floor(index / 4) * 42}%` }}>
            <div className="h-3 w-3 animate-pulse rounded-full bg-signal" />
            <div className="mt-2 w-32 text-sm font-medium text-white">{agent.name}</div>
            <div className="text-xs text-white/45">agent #{agent.id}</div>
          </div>
        ))}
        <div className="absolute inset-x-16 top-1/2 h-px signal-line" />
        <div className="absolute inset-y-16 left-1/2 w-px bg-gradient-to-b from-transparent via-cobalt/70 to-transparent" />
        <div className="absolute bottom-5 left-5 right-5 grid gap-2 text-sm text-white/58">
          {edges.map((task) => <span key={task.id}><GitBranch className="mr-2 inline h-4 w-4 text-cobalt" />task #{task.id}: {task.title} {"->"} {task.status}</span>)}
          {!edges.length ? <span>No marketplace edges yet.</span> : null}
        </div>
      </div>
    </div>
  );
}

export function LiveSimulationTimeline() {
  const { data } = useOnchainActivity();
  const steps = data.activity.slice(0, 8);
  return (
    <div className="panel rounded-3xl p-6">
      <p className="text-xs uppercase tracking-[0.3em] text-signal">Real event loop</p>
      <div className="mt-5 grid gap-3">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-signal/10 text-signal">{index + 1}</span>
            <div>
              <p className="font-medium text-white">{step.title}</p>
              <p className="text-sm text-white/48">{step.contract} emitted at block {step.blockNumber}</p>
            </div>
          </div>
        ))}
        {!steps.length ? <EmptyState text="No real simulation events yet." /> : null}
      </div>
    </div>
  );
}

export function LiveReputationMatrix() {
  const { state } = useOnchainActivity();
  const latest = state.reputation.slice(0, 8);
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {latest.map((event) => (
        <div key={event.id} className="panel rounded-3xl p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-white/38">Agent #{String(event.args.agentId)}</p>
          <div className="mt-5 text-4xl font-semibold text-white">+{String(event.args.quality ?? "0")}</div>
          <p className="mt-3 break-all text-sm text-white/55">{labelFromUri(String(event.args.reasonURI ?? ""))}</p>
        </div>
      ))}
      {!latest.length ? <EmptyState text="No real reputation updates yet." /> : null}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-3xl border border-dashed border-white/12 bg-white/[0.025] p-6 text-sm text-white/52">{text}</div>;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <div className="mb-3 h-5 w-5 text-signal">{icon}</div>
      <div className="text-2xl font-semibold text-white">{value}</div>
      <div className="text-xs uppercase tracking-[0.22em] text-white/38">{label}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
      <div className="truncate text-sm font-semibold text-white">{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/34">{label}</div>
    </div>
  );
}
