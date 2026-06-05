"use client";

import { useEffect, useState } from "react";
import { Copy, ExternalLink, ReceiptText } from "lucide-react";
import { loadMissionReceipts, loadReceipts } from "../lib/history-store";
import { readableAgentLabel, type AgentProofReceipt, type MissionReceipt } from "../lib/agent-engine";
import { somnia } from "../lib/contracts";

export function ReceiptsPage() {
  const [proofs, setProofs] = useState<AgentProofReceipt[]>([]);
  const [missions, setMissions] = useState<MissionReceipt[]>([]);
  const [selected, setSelected] = useState<MissionReceipt | AgentProofReceipt | null>(null);

  useEffect(() => {
    const missionReceipts = loadMissionReceipts();
    const proofReceipts = loadReceipts();
    setMissions(missionReceipts);
    setProofs(proofReceipts);
    setSelected(missionReceipts[0] ?? proofReceipts[0] ?? null);
  }, []);

  const selectedJson = selected ? JSON.stringify(selected, null, 2) : "";

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="panel rounded-[1.5rem] p-5 sm:p-6">
        <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.24em] text-signal"><ReceiptText className="h-4 w-4" /> Mission receipts</p>
        <h2 className="mt-3 text-3xl font-semibold text-white">{missions.length} mission receipt{missions.length === 1 ? "" : "s"}</h2>
        <div className="mt-5 grid gap-3">
          {missions.map((receipt) => (
            <button key={receipt.receiptId} onClick={() => setSelected(receipt)} className="rounded-2xl border border-white/10 bg-[#101010] p-4 text-left transition hover:border-signal/35">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-semibold text-white">{receipt.missionLabel}</span>
                <span className="font-mono text-xs text-signal">{receipt.chainId}</span>
              </div>
              <p className="mt-2 text-sm text-white/48">{receipt.agentChain.map((step) => readableAgentLabel(step.agentId)).join(" -> ")}</p>
              {receipt.tokenAddress ? <p className="mt-2 break-all font-mono text-xs text-white/38">token {receipt.tokenAddress}</p> : null}
            </button>
          ))}
          {!missions.length ? <div className="rounded-2xl border border-dashed border-white/12 p-6 text-sm leading-6 text-white/45">Mission receipts appear after mission runs and token launches. Use the Missions page to create one.</div> : null}
        </div>
        <h3 className="mt-8 text-2xl font-semibold text-white">Proof receipts</h3>
        <div className="mt-4 grid gap-3">
          {proofs.slice(0, 12).map((receipt) => (
            <button key={receipt.receiptId} onClick={() => setSelected(receipt)} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-left transition hover:border-signal/35">
              <span className="block font-mono text-xs text-signal">{receipt.actionType}</span>
              <span className="mt-2 block break-all text-sm text-white/58">{receipt.receiptId}</span>
            </button>
          ))}
        </div>
      </section>
      <aside className="panel rounded-[1.5rem] p-5">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">Receipt detail</p>
        {selected ? (
          <>
            <pre className="mt-4 max-h-[58vh] overflow-auto rounded-2xl border border-white/10 bg-black/25 p-4 text-xs leading-6 text-white/62">{selectedJson}</pre>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => void navigator.clipboard?.writeText(selectedJson)} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/62 hover:text-white"><Copy className="h-3 w-3" /> copy JSON</button>
              {"txHashes" in selected && selected.txHashes[0] ? <a href={`${somnia.blockExplorers.default.url}/tx/${selected.txHashes[0]}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-cobalt"><ExternalLink className="h-3 w-3" /> explorer</a> : null}
              {"txHash" in selected && selected.txHash ? <a href={`${somnia.blockExplorers.default.url}/tx/${selected.txHash}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-cobalt"><ExternalLink className="h-3 w-3" /> explorer</a> : null}
            </div>
          </>
        ) : <p className="mt-4 text-sm leading-6 text-white/45">No receipts saved yet.</p>}
      </aside>
    </div>
  );
}
