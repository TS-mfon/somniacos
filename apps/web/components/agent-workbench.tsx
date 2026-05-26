"use client";

import { useEffect, useMemo, useState } from "react";
import { createWalletClient, encodeFunctionData, hexToBytes, keccak256, stringToHex, type Hash } from "viem";
import { CheckCircle2, Loader2, RadioTower } from "lucide-react";
import { useOnchainActivity } from "./live-economy";
import { useSomniaWallet } from "./wallet-button";
import { contracts, somnia, worldEventRegistryAbi } from "../lib/contracts";
import { curatedAgents, decodeOutputPayload, encodeOutputPayload, matchOnchainAgent, runLocalAgentTask, type AgentTaskOutput } from "../lib/agent-engine";
import { summarizeError } from "../lib/onchain-state";

export function AgentWorkbench() {
  const { data, state } = useOnchainActivity();
  const { wallet, connect, switchToSomnia, walletClient } = useSomniaWallet();
  const [agentId, setAgentId] = useState(curatedAgents[1].id);
  const [goal, setGoal] = useState("Write an X post about dogs.");
  const [constraints, setConstraints] = useState("Keep it warm, concise, and ready to publish.");
  const [output, setOutput] = useState<AgentTaskOutput | null>(null);
  const [tx, setTx] = useState<{ status: string; hash?: Hash; error?: string }>({ status: "idle" });
  const [localOutputs, setLocalOutputs] = useState<AgentTaskOutput[]>([]);
  const selected = useMemo(() => curatedAgents.find((agent) => agent.id === agentId) ?? curatedAgents[0], [agentId]);
  const matchedOnchain = useMemo(() => matchOnchainAgent(selected, state.agents), [selected, state.agents]);
  const anchoredOutputs = useMemo(() => {
    const decoded = data.activity
      .filter((item) => item.contract === "WorldEventRegistry" && String(item.args.kind ?? "").startsWith("agent-output"))
      .map((item) => decodeOutputPayload(item.args.metadataURI))
      .filter((item): item is AgentTaskOutput => !!item);
    const seen = new Set<string>();
    return [...localOutputs, ...decoded].filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [data.activity, localOutputs]);

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("agent");
    if (param) setAgentId(param);
    const stored = window.localStorage.getItem("somniacos.outputs");
    if (stored) {
      try {
        setLocalOutputs(JSON.parse(stored) as AgentTaskOutput[]);
      } catch {
        setLocalOutputs([]);
      }
    }
  }, []);

  function runAgent() {
    const result = runLocalAgentTask({ curatedAgent: selected, onchainAgent: matchedOnchain, goal, constraints });
    setOutput(result);
    saveOutput(result);
    setTx({ status: "Generated. Output is visible below; anchor it if you want public onchain proof." });
  }

  async function anchorOutput() {
    try {
      if (!output) return;
      if (!wallet.address) {
        await connect();
        return;
      }
      if (wallet.chainId !== somnia.id) await switchToSomnia();
      setTx({ status: "Waiting for wallet signature" });
      const client = createWalletClient({ chain: somnia, transport: walletClient() });
      const payload = encodeOutputPayload(output);
      if (payload.length > 9000) throw new Error("Output is too large to anchor directly. Shorten it and try again.");
      const eventId = keccak256(hexToBytes(stringToHex(`${wallet.address}-${output.id}-${Date.now()}`)));
      const hash = await client.sendTransaction({
        account: wallet.address,
        to: contracts.WorldEventRegistry,
        data: encodeFunctionData({ abi: worldEventRegistryAbi, functionName: "record", args: [eventId, `agent-output-${selected.taskType}`, payload] })
      });
      setTx({ status: "Submitted", hash });
      await waitForReceipt(hash);
      setTx({ status: "Confirmed on Somnia. The recoverable output payload is now in the world event.", hash });
    } catch (error) {
      setTx({ status: "Failed", error: summarizeError(error) });
    }
  }

  function saveOutput(item: AgentTaskOutput) {
    const next = [item, ...localOutputs.filter((existing) => existing.id !== item.id)].slice(0, 20);
    setLocalOutputs(next);
    window.localStorage.setItem("somniacos.outputs", JSON.stringify(next));
  }

  async function waitForReceipt(hash: Hash) {
    const started = Date.now();
    while (Date.now() - started < 90_000) {
      const receipt = await fetch(`/api/onchain/receipt?hash=${hash}`).then((res) => res.json());
      if (receipt.ok && receipt.receipt) return;
      await new Promise((resolve) => setTimeout(resolve, 2500));
    }
    throw new Error("Receipt timeout. Check the explorer link; the transaction may still confirm.");
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
      <section className="panel rounded-[1.5rem] p-5 sm:p-6">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-signal">Workbench</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-5xl">Use a specialist agent.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/58">Choose a purpose-built agent, describe the task, get the result immediately, then anchor the full output onchain if needed.</p>
        <div className="mt-6 grid gap-4">
          <label className="block">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">Specialist</span>
            <select value={agentId} onChange={(event) => setAgentId(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101010] px-4 py-3 text-white outline-none focus:border-signal/60">
              {curatedAgents.map((agent) => <option key={agent.id} value={agent.id}>{agent.role} - {agent.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">Task</span>
            <textarea value={goal} onChange={(event) => setGoal(event.target.value)} className="mt-2 min-h-28 w-full rounded-xl border border-white/10 bg-[#101010] px-4 py-3 text-white outline-none focus:border-signal/60" />
          </label>
          <label className="block">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">Constraints</span>
            <textarea value={constraints} onChange={(event) => setConstraints(event.target.value)} className="mt-2 min-h-20 w-full rounded-xl border border-white/10 bg-[#101010] px-4 py-3 text-white outline-none focus:border-signal/60" />
          </label>
          <button onClick={runAgent} className="inline-flex items-center justify-center rounded-xl bg-signal px-5 py-3 font-semibold text-black">Run agent</button>
        </div>
      </section>

      <aside className="space-y-4">
        <div className="panel rounded-[1.5rem] p-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">{selected.role}</p>
          <h3 className="mt-3 text-3xl font-semibold text-white">{selected.name}</h3>
          <p className="mt-3 text-sm leading-6 text-white/55">{selected.promise}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {selected.skills.map((skill) => <span key={skill} className="rounded-full border border-white/10 px-3 py-1 font-mono text-[11px] text-white/50">{skill}</span>)}
          </div>
          <p className="mt-4 font-mono text-xs text-white/40">{matchedOnchain ? `Backed by onchain agent #${matchedOnchain.id}` : "App-level specialist. No fake onchain label."}</p>
        </div>
        <div className="panel rounded-[1.5rem] p-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">Status</p>
          <p className="mt-3 text-white">{tx.status}</p>
          {tx.hash ? <a href={`${somnia.blockExplorers.default.url}/tx/${tx.hash}`} target="_blank" rel="noreferrer" className="mt-2 block break-all font-mono text-xs text-cobalt">{tx.hash}</a> : null}
          {tx.error ? <p className="mt-3 rounded-2xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{tx.error}</p> : null}
        </div>
      </aside>

      {output ? (
        <section className="xl:col-span-2 panel rounded-[1.5rem] p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-signal">Agent output</p>
              <h3 className="mt-3 text-3xl font-semibold text-white sm:text-5xl">{output.title}</h3>
              <p className="mt-4 max-w-4xl text-white/62">{output.summary}</p>
            </div>
            <button onClick={anchorOutput} className="inline-flex items-center gap-2 rounded-xl border border-signal/30 bg-signal/10 px-4 py-2 text-sm font-semibold text-signal">
              {tx.status === "Submitted" ? <Loader2 className="h-4 w-4 animate-spin" /> : tx.status === "Confirmed on Somnia" ? <CheckCircle2 className="h-4 w-4" /> : <RadioTower className="h-4 w-4" />}
              Anchor onchain
            </button>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <h4 className="font-semibold text-white">Deliverables</h4>
              <div className="mt-4 space-y-3 text-sm leading-6 text-white/62">{output.deliverables.map((item) => <p key={item}>{item}</p>)}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <h4 className="font-semibold text-white">Recommended onchain action</h4>
              <p className="mt-4 text-sm leading-6 text-white/62">{output.recommendedOnchainAction}</p>
              <p className="mt-4 break-all text-xs text-cobalt">{output.metadataURI}</p>
              <div className="mt-4 space-y-2 text-sm text-ember">{output.riskNotes.map((item) => <p key={item}>{item}</p>)}</div>
            </div>
          </div>
        </section>
      ) : null}

      {anchoredOutputs.length ? (
        <section className="xl:col-span-2 panel rounded-[1.5rem] p-5 sm:p-6">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-signal">Anchored results</p>
          <div className="mt-4 grid gap-3">
            {anchoredOutputs.slice(0, 6).map((item) => (
              <article key={item.id} className="rounded-2xl border border-white/10 bg-[#101010] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h4 className="font-semibold text-white">{item.title}</h4>
                  <span className="font-mono text-xs text-signal">{item.taskType}</span>
                </div>
                <p className="mt-2 text-sm text-white/55">{item.prompt}</p>
                <div className="mt-3 space-y-2 text-sm leading-6 text-white/70">{item.deliverables.map((line) => <p key={line}>{line}</p>)}</div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
