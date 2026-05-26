"use client";

import { useEffect, useMemo, useState } from "react";
import { createWalletClient, encodeFunctionData, hexToBytes, keccak256, stringToHex, type Hash } from "viem";
import { Bot, CheckCircle2, Loader2, RadioTower } from "lucide-react";
import { useOnchainActivity } from "./live-economy";
import { useSomniaWallet } from "./wallet-button";
import { contracts, somnia, worldEventRegistryAbi } from "../lib/contracts";
import { runLocalAgentTask, type AgentTaskOutput, type AgentTaskType } from "../lib/agent-engine";
import { summarizeError } from "../lib/onchain-state";

const taskTypes: AgentTaskType[] = ["marketing", "research", "content", "code", "security", "treasury", "governance", "negotiation"];

export function AgentWorkbench() {
  const { state } = useOnchainActivity();
  const { wallet, connect, switchToSomnia, walletClient } = useSomniaWallet();
  const [agentId, setAgentId] = useState("");
  const [taskType, setTaskType] = useState<AgentTaskType>("marketing");
  const [goal, setGoal] = useState("Launch a campaign that explains agent-to-agent commerce to hackathon judges.");
  const [constraints, setConstraints] = useState("Keep the action low-cost, clear, and easy to verify onchain.");
  const [output, setOutput] = useState<AgentTaskOutput | null>(null);
  const [tx, setTx] = useState<{ status: string; hash?: Hash; error?: string }>({ status: "idle" });
  const selected = useMemo(() => state.agents.find((agent) => agent.id === agentId) ?? state.agents[0], [agentId, state.agents]);

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("agent");
    if (param) setAgentId(param);
  }, []);

  function runAgent() {
    const result = runLocalAgentTask({ agent: selected, taskType, goal, constraints });
    setOutput(result);
    setTx({ status: "Generated locally. Anchor it onchain when ready." });
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
      const eventId = keccak256(hexToBytes(stringToHex(`${wallet.address}-${output.metadataURI}-${Date.now()}`)));
      const hash = await client.sendTransaction({
        account: wallet.address,
        to: contracts.WorldEventRegistry,
        data: encodeFunctionData({ abi: worldEventRegistryAbi, functionName: "record", args: [eventId, `agent-${taskType}`, output.metadataURI] })
      });
      setTx({ status: "Submitted", hash });
      await waitForReceipt(hash);
      setTx({ status: "Confirmed on Somnia", hash });
    } catch (error) {
      setTx({ status: "Failed", error: summarizeError(error) });
    }
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
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section className="hero-panel rounded-[2rem] p-6">
        <p className="text-xs uppercase tracking-[0.34em] text-signal">Agent task engine</p>
        <h2 className="mt-3 font-display text-5xl text-white">Make an agent perform work.</h2>
        <p className="mt-4 text-sm leading-6 text-white/58">This runs a deterministic local agent playbook, so it works without API keys. The generated work is offchain until you anchor the proof event with your wallet.</p>
        <div className="mt-6 grid gap-4">
          <label className="block">
            <span className="text-xs uppercase tracking-[0.24em] text-white/38">Choose agent</span>
            <select value={agentId || selected?.id || ""} onChange={(event) => setAgentId(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none">
              {!state.agents.length ? <option value="">No onchain agents loaded yet</option> : null}
              {state.agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name} #{agent.id}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-[0.24em] text-white/38">Task type</span>
            <select value={taskType} onChange={(event) => setTaskType(event.target.value as AgentTaskType)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none">
              {taskTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-[0.24em] text-white/38">What should the agent do?</span>
            <textarea value={goal} onChange={(event) => setGoal(event.target.value)} className="mt-2 min-h-28 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none" />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-[0.24em] text-white/38">Constraints</span>
            <textarea value={constraints} onChange={(event) => setConstraints(event.target.value)} className="mt-2 min-h-24 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none" />
          </label>
          <button onClick={runAgent} className="inline-flex items-center justify-center gap-2 rounded-full bg-signal px-5 py-3 font-semibold text-black"><Bot className="h-4 w-4" />Run agent</button>
        </div>
      </section>

      <aside className="space-y-4">
        <div className="panel rounded-3xl p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-cobalt">Selected agent</p>
          <h3 className="mt-3 font-display text-4xl text-white">{selected?.name ?? "No agent yet"}</h3>
          <p className="mt-3 break-all text-sm text-white/55">{selected?.metadataURI ?? "Create or seed an agent first."}</p>
        </div>
        <div className="panel rounded-3xl p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-cobalt">Status</p>
          <p className="mt-3 text-white">{tx.status}</p>
          {tx.hash ? <a href={`${somnia.blockExplorers.default.url}/tx/${tx.hash}`} target="_blank" rel="noreferrer" className="mt-2 block break-all font-mono text-xs text-cobalt">{tx.hash}</a> : null}
          {tx.error ? <p className="mt-3 rounded-2xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{tx.error}</p> : null}
        </div>
      </aside>

      {output ? (
        <section className="xl:col-span-2 lux-card rounded-[2rem] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.34em] text-signal">Agent output</p>
              <h3 className="mt-3 font-display text-5xl text-white">{output.title}</h3>
              <p className="mt-4 max-w-4xl text-white/62">{output.summary}</p>
            </div>
            <button onClick={anchorOutput} className="inline-flex items-center gap-2 rounded-full border border-signal/30 bg-signal/10 px-4 py-2 text-sm font-semibold text-signal">
              {tx.status === "Submitted" ? <Loader2 className="h-4 w-4 animate-spin" /> : tx.status === "Confirmed on Somnia" ? <CheckCircle2 className="h-4 w-4" /> : <RadioTower className="h-4 w-4" />}
              Anchor onchain
            </button>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <h4 className="font-semibold text-white">Deliverables</h4>
              <div className="mt-4 space-y-3 text-sm leading-6 text-white/62">{output.deliverables.map((item) => <p key={item}>{item}</p>)}</div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <h4 className="font-semibold text-white">Recommended onchain action</h4>
              <p className="mt-4 text-sm leading-6 text-white/62">{output.recommendedOnchainAction}</p>
              <p className="mt-4 break-all text-xs text-cobalt">{output.metadataURI}</p>
              <div className="mt-4 space-y-2 text-sm text-ember">{output.riskNotes.map((item) => <p key={item}>{item}</p>)}</div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
