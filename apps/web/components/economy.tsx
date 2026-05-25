"use client";

import { LiveAgentGrid, LiveEconomyMap, LiveOrganizationGrid, LiveReputationMatrix, LiveSimulationTimeline, LiveWorldFeed, useOnchainActivity } from "./live-economy";

export function WorldFeed() {
  return <LiveWorldFeed />;
}

export function AgentGrid() {
  return <LiveAgentGrid />;
}

export function OrganizationGrid() {
  return <LiveOrganizationGrid />;
}

export function EconomyMap() {
  return <LiveEconomyMap />;
}

export function ReputationMatrix() {
  return <LiveReputationMatrix />;
}

export function SimulationTimeline() {
  return <LiveSimulationTimeline />;
}

export function NegotiationPanel() {
  const { data } = useOnchainActivity();
  const negotiations = data.activity.filter((item) => item.contract === "NegotiationRegistry").slice(0, 8);
  return (
    <div className="space-y-4">
      {negotiations.map((negotiation) => (
        <article key={negotiation.id} className="panel rounded-3xl p-6">
          <div className="flex flex-wrap justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-ember">{negotiation.eventName}</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">{negotiation.title}</h3>
              <p className="mt-2 break-all text-white/55">{Object.entries(negotiation.args).map(([key, value]) => `${key}: ${String(value)}`).join(" | ")}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-semibold text-signal">{negotiation.value ?? "terms"}</div>
              <div className="text-sm text-white/45">block {negotiation.blockNumber}</div>
            </div>
          </div>
        </article>
      ))}
      {!negotiations.length ? <div className="panel rounded-3xl p-6 text-white/55">No real negotiation events yet. Open one from the transaction console or demo lab.</div> : null}
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
