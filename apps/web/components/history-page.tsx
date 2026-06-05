"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, ExternalLink, Filter, History, ReceiptText } from "lucide-react";
import { createReceipt, loadReceipts, loadRunHistory } from "../lib/history-store";
import { readableAgentLabel, type AgentProofReceipt, type AgentRunRecord } from "../lib/agent-engine";
import { somnia } from "../lib/contracts";

type HistoryFilter = "all" | "agent" | "token" | "pending" | "failed" | "somnia" | "llm" | "local";

export function HistoryPage() {
  const [runs, setRuns] = useState<AgentRunRecord[]>([]);
  const [receipts, setReceipts] = useState<AgentProofReceipt[]>([]);
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const [selected, setSelected] = useState<AgentRunRecord | null>(null);

  useEffect(() => {
    const loaded = loadRunHistory();
    setRuns(loaded);
    setReceipts(loadReceipts());
    const params = new URLSearchParams(window.location.search);
    const receiptId = params.get("receipt");
    if (receiptId) {
      const receipt = loadReceipts().find((item) => item.receiptId === receiptId);
      const run = loaded.find((item) => item.requestId === receipt?.requestId || item.artifact?.type === "token" && item.artifact.tokenAddress === receipt?.tokenAddress);
      if (run) setSelected(run);
    }
  }, []);

  const filteredRuns = useMemo(() => runs.filter((run) => {
    if (filter === "all") return true;
    if (filter === "agent") return run.artifact?.type !== "token";
    if (filter === "token") return run.artifact?.type === "token";
    if (filter === "pending") return run.status === "Pending";
    if (filter === "failed") return run.status === "Failed" || run.status === "TimedOut";
    if (filter === "somnia") return run.source === "Somnia";
    if (filter === "llm") return run.source === "LLM API";
    if (filter === "local") return run.source === "SomniacOS Local";
    return true;
  }), [filter, runs]);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="panel rounded-[1.5rem] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.24em] text-signal"><History className="h-4 w-4" /> Output history</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">{filteredRuns.length} record{filteredRuns.length === 1 ? "" : "s"}</h2>
          </div>
          <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#101010] px-3 py-2 text-sm text-white/60">
            <Filter className="h-4 w-4 text-signal" />
            <select value={filter} onChange={(event) => setFilter(event.target.value as HistoryFilter)} className="bg-transparent outline-none">
              <option value="all">All</option>
              <option value="agent">Agent runs</option>
              <option value="token">Token launches</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="somnia">Somnia source</option>
              <option value="llm">LLM source</option>
              <option value="local">Local fallback</option>
            </select>
          </label>
        </div>
        <div className="mt-5 grid gap-3">
          {filteredRuns.map((run) => (
            <button key={`${run.requestId}-${run.txHash}`} onClick={() => setSelected(run)} className="rounded-2xl border border-white/10 bg-[#101010] p-4 text-left transition hover:border-signal/35">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-semibold text-white">{run.artifact?.type === "token" ? `${run.artifact.name} (${run.artifact.symbol})` : readableAgentLabel(run.appAgentId)}</span>
                <span className="rounded-full border border-white/10 px-2 py-1 font-mono text-[11px] text-white/45">{run.confidence ? `${run.confidence.label} ${run.confidence.score}%` : run.status}</span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/50">{run.artifact?.type === "token" ? `Token deployed at ${run.artifact.tokenAddress}` : run.result || run.task}</p>
              <div className="mt-3 flex flex-wrap gap-3 font-mono text-xs text-white/35">
                {run.source ? <span>{run.source}</span> : null}
                {run.outputFormat ? <span>{run.outputFormat}</span> : null}
                {run.txHash ? <span>tx available</span> : null}
              </div>
            </button>
          ))}
          {!filteredRuns.length ? <div className="rounded-2xl border border-dashed border-white/12 p-6 text-sm text-white/45">No records match this filter yet. Run an agent from the Workbench and completed outputs will appear here.</div> : null}
        </div>
      </section>

      <aside className="space-y-4">
        <div className="panel rounded-[1.5rem] p-5">
          <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-signal"><ReceiptText className="h-4 w-4" /> Receipts</p>
          <p className="mt-3 text-3xl font-semibold text-white">{receipts.length}</p>
          <p className="mt-2 text-sm leading-6 text-white/50">Proof receipts are generated locally from completed runs and token launches. Onchain source labels remain separate from local history.</p>
        </div>
        {selected ? <HistoryDetail run={selected} /> : <div className="panel rounded-[1.5rem] p-5 text-sm leading-6 text-white/50">Select a record to inspect output, receipt JSON, and explorer links.</div>}
      </aside>
    </div>
  );
}

function HistoryDetail({ run }: { run: AgentRunRecord }) {
  const receipt = createReceipt(run);
  const receiptJson = JSON.stringify(receipt, null, 2);
  return (
    <div className="panel rounded-[1.5rem] p-5">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">Selected record</p>
      <h3 className="mt-3 text-2xl font-semibold text-white">{run.artifact?.type === "token" ? run.artifact.name : readableAgentLabel(run.appAgentId)}</h3>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/62">{run.result}</p>
      {run.confidence ? <p className="mt-3 rounded-2xl border border-signal/20 bg-signal/10 p-3 text-xs leading-5 text-signal">Confidence: {run.confidence.label} ({run.confidence.score}%). {run.confidence.reasons.join(" ")}</p> : null}
      {run.artifact?.type === "token" ? (
        <div className="mt-4 rounded-2xl border border-signal/20 bg-signal/10 p-3 text-sm text-white/70">
          <p className="break-all">Token: {run.artifact.tokenAddress}</p>
          <p>Supply: {run.artifact.initialSupply}</p>
          <p className="break-all">Owner: {run.artifact.owner}</p>
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => void navigator.clipboard?.writeText(run.result)} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/62 hover:text-white"><Copy className="h-3 w-3" /> copy output</button>
        <button onClick={() => void navigator.clipboard?.writeText(receiptJson)} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/62 hover:text-white"><Copy className="h-3 w-3" /> copy receipt</button>
        {run.txHash ? <a href={`${somnia.blockExplorers.default.url}/tx/${run.txHash}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-cobalt"><ExternalLink className="h-3 w-3" /> explorer</a> : null}
      </div>
    </div>
  );
}
