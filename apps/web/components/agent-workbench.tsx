"use client";

import { useEffect, useMemo, useState } from "react";
import { createPublicClient, createWalletClient, decodeEventLog, encodeFunctionData, formatEther, http, parseEther, type Address, type Hash } from "viem";
import { AlertTriangle, CheckCircle2, Clock3, ExternalLink, Loader2, RadioTower, X } from "lucide-react";
import { useOnchainActivity } from "./live-economy";
import { useSomniaWallet } from "./wallet-button";
import { contracts, osKernelConfigured, osKernelEnabled, somnia, somniacAgentRouterAbi } from "../lib/contracts";
import { curatedAgents, matchOnchainAgent, readableAgentLabel, type AgentRunRecord } from "../lib/agent-engine";
import { summarizeError } from "../lib/onchain-state";

const publicClient = createPublicClient({ chain: somnia, transport: http(somnia.rpcUrls.default.http[0]) });

const statusLabels: Record<number, AgentRunRecord["status"]> = {
  1: "Pending",
  2: "Success",
  3: "Failed",
  4: "TimedOut"
};

const modeLabels: Record<number, AgentRunRecord["mode"]> = {
  0: "LLM",
  1: "Website"
};

type RunPhase = "idle" | "wallet" | "network" | "quote" | "signature" | "receipt" | "callback" | "success" | "failed";

type WorkbenchTx = {
  phase: RunPhase;
  status: string;
  hash?: Hash;
  error?: string;
  action?: string;
};

const activePhases = new Set<RunPhase>(["wallet", "network", "quote", "signature", "receipt", "callback"]);
const statusSteps: Array<{ phase: RunPhase; label: string }> = [
  { phase: "wallet", label: "Wallet" },
  { phase: "network", label: "Network" },
  { phase: "quote", label: "Deposit" },
  { phase: "signature", label: "Signature" },
  { phase: "receipt", label: "Receipt" },
  { phase: "callback", label: "Agent callback" },
  { phase: "success", label: "Result visible" }
];

export function AgentWorkbench() {
  const { data, state, reload } = useOnchainActivity(8000);
  const { wallet, connect, switchToSomnia, walletClient, refresh } = useSomniaWallet();
  const [agentId, setAgentId] = useState(curatedAgents[1].id);
  const [goal, setGoal] = useState("Write an X post about dogs.");
  const [constraints, setConstraints] = useState("Keep it warm, concise, and ready to publish.");
  const [webUrls, setWebUrls] = useState("");
  const [deposit, setDeposit] = useState<bigint | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [activeRun, setActiveRun] = useState<AgentRunRecord | null>(null);
  const [resultModal, setResultModal] = useState<AgentRunRecord | null>(null);
  const [tx, setTx] = useState<WorkbenchTx>({ phase: "idle", status: "Ready" });
  const [localRuns, setLocalRuns] = useState<AgentRunRecord[]>([]);

  const selected = useMemo(() => curatedAgents.find((agent) => agent.id === agentId) ?? curatedAgents[0], [agentId]);
  const matchedOnchain = useMemo(() => matchOnchainAgent(selected, state.agents), [selected, state.agents]);
  const allUrls = useMemo(() => webUrls.split(/\s+/).map((url) => url.trim()).filter(Boolean), [webUrls]);
  const urls = useMemo(() => allUrls.slice(0, 3), [allUrls]);
  const mode = urls.length ? 1 : 0;
  const routerConfigured = Boolean(contracts.SomniacAgentRouter);
  const isRunning = activePhases.has(tx.phase);

  const completedFromEvents = useMemo(() => data.activity
    .filter((item) => item.contract === "SomniacAgentRouter" && item.eventName === "AgentRunCompleted")
    .map((item) => {
      const args = item.args;
      return {
        requestId: String(args.requestId ?? ""),
        user: String(args.user ?? ""),
        appAgentId: String(args.appAgentId ?? ""),
        task: "",
        constraints: "",
        url: "",
        somniaAgentId: "",
        mode: "LLM",
        status: statusLabels[Number(args.status ?? 0)] ?? "Failed",
        result: String(args.result ?? ""),
        createdAt: "",
        completedAt: item.blockNumber,
        txHash: item.transactionHash
      } satisfies AgentRunRecord;
    })
    .filter((item) => item.requestId && item.result), [data.activity]);

  const anchoredResults = useMemo(() => {
    const seen = new Set<string>();
    return [...localRuns, ...completedFromEvents].filter((item) => {
      if (item.status !== "Success" || !item.result || seen.has(item.requestId)) return false;
      seen.add(item.requestId);
      return true;
    });
  }, [completedFromEvents, localRuns]);
  const latestResult = anchoredResults[0];
  const pendingRuns = useMemo(() => localRuns.filter((item) => item.status === "Pending"), [localRuns]);

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("agent");
    if (param) setAgentId(param);
    const stored = window.localStorage.getItem("somniacos.agentRuns");
    if (stored) {
      try {
        setLocalRuns(JSON.parse(stored) as AgentRunRecord[]);
      } catch {
        setLocalRuns([]);
      }
    }
  }, []);

  useEffect(() => {
    if (!routerConfigured) {
      setDeposit(null);
      return;
    }
    let cancelled = false;
    async function loadDeposit() {
      try {
        setQuoteError("");
        const quoted = await publicClient.readContract({
          address: contracts.SomniacAgentRouter as Address,
          abi: somniacAgentRouterAbi,
          functionName: "getRequiredDeposit",
          args: [mode]
        });
        if (!cancelled) setDeposit(quoted as bigint);
      } catch (error) {
        if (!cancelled) {
          setDeposit(null);
          setQuoteError(summarizeError(error));
        }
      }
    }
    void loadDeposit();
    return () => {
      cancelled = true;
    };
  }, [mode, routerConfigured]);

  useEffect(() => {
    if (!pendingRuns.length) return;
    let cancelled = false;
    async function recoverPendingRuns() {
      const recovered = await Promise.all(pendingRuns.map(async (run) => {
        try {
          return await readRun(run.requestId, run.txHash as Hash | undefined);
        } catch {
          return run;
        }
      }));
      if (cancelled) return;
      for (const run of recovered) {
        if (run.status !== "Pending") {
          saveRun(run);
          if (run.status === "Success") setResultModal(run);
        }
      }
      await reload();
    }
    const timeout = window.setTimeout(() => void recoverPendingRuns(), 2500);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [pendingRuns, reload]);

  async function runAgent() {
    try {
      setTx({ phase: "wallet", status: "Checking wallet and task details" });
      if (!routerConfigured) throw new Error("Somnia Agent router is not deployed yet.");
      validateWorkbenchInput(goal, constraints, allUrls);
      if (!wallet.address) {
        await connect();
        setTx({ phase: "idle", status: "Wallet connected. Click Run agent again to sign the Somnia request." });
        return;
      }
      if (wallet.chainId !== somnia.id) {
        setTx({ phase: "network", status: "Switching wallet to Somnia Shannon" });
        await switchToSomnia();
        await refresh(wallet.address);
        setTx({ phase: "idle", status: "Network switched. Click Run agent again to sign the Somnia request." });
        return;
      }
      setTx({ phase: "quote", status: "Checking Somnia Agent deposit" });
      if (!deposit) throw new Error("Unable to quote the Somnia Agent deposit. Try again in a moment.");
      if (wallet.balance && parseEther(wallet.balance) < deposit) throw new Error(`Insufficient STT. This request needs ${formatEther(deposit)} STT plus gas.`);

      setTx({ phase: "signature", status: "Open your wallet and sign the Somnia Agent request" });
      const client = createWalletClient({ chain: somnia, transport: walletClient() });
      const hash = await client.sendTransaction({
        account: wallet.address,
        to: contracts.SomniacAgentRouter as Address,
        value: deposit,
        data: encodeFunctionData({
          abi: somniacAgentRouterAbi,
          functionName: "requestAgentRun",
          args: [selected.id, goal.trim(), constraints.trim(), urls]
        })
      });

      setTx({ phase: "receipt", status: "Request submitted. Waiting for Somnia receipt.", hash });
      const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
      if (receipt.status !== "success") throw new Error("Somnia transaction reverted.");

      const requestId = extractRequestId(receipt.logs);
      if (!requestId) throw new Error("Request submitted, but the router event was not found in the receipt.");

      setTx({ phase: "callback", status: `Somnia Agent request #${requestId} is running. Waiting for validator callback.`, hash });
      const initial = await readRun(requestId, hash);
      setActiveRun(initial);
      saveRun(initial);

      const finalRun = await waitForRun(requestId, hash);
      setActiveRun(finalRun);
      saveRun(finalRun);
      await reload();
      await refresh(wallet.address);

      if (finalRun.status === "Success") {
        setTx({ phase: "success", status: "Confirmed. The agent result is visible below.", hash });
        setResultModal(finalRun);
      } else {
        setTx({ phase: "failed", status: finalRun.status, hash, error: finalRun.result || "Somnia Agent did not return a usable result.", action: "Refresh later or run the task again." });
      }
    } catch (error) {
      setTx({ phase: "failed", status: "Needs attention", error: summarizeError(error), action: recommendedAction(error) });
    }
  }

  function saveRun(item: AgentRunRecord) {
    setLocalRuns((current) => {
      const next = [item, ...current.filter((existing) => existing.requestId !== item.requestId)].slice(0, 20);
      window.localStorage.setItem("somniacos.agentRuns", JSON.stringify(next));
      return next;
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
      <section className="panel rounded-[1.5rem] p-5 sm:p-6">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-signal">Workbench</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-5xl">Run a real Somnia Agent.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/58">Choose a specialist, describe the task, sign one Somnia transaction, and wait for the agent callback. The result appears here only after the chain records it.</p>
        {data.ok === false ? (
          <div className="mt-5 rounded-2xl border border-ember/30 bg-ember/10 p-4 text-sm leading-6 text-ember">
            Onchain history is temporarily unavailable, but your local confirmed and pending agent runs are still shown below. {data.error}
          </div>
        ) : null}
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
          <label className="block">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">Website URLs optional</span>
            <textarea value={webUrls} onChange={(event) => setWebUrls(event.target.value)} placeholder="https://example.com" className="mt-2 min-h-16 w-full rounded-xl border border-white/10 bg-[#101010] px-4 py-3 text-white outline-none focus:border-signal/60" />
            <span className="mt-2 block text-xs text-white/38">Add a full http:// or https:// URL when the agent should use Somnia&apos;s website parser. Leave blank for LLM inference.</span>
          </label>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">Required STT</span>
              <span className="font-mono text-sm text-signal">{deposit ? `${Number(formatEther(deposit)).toFixed(4)} STT` : "Quoting..."}</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-white/45">{mode === 1 ? "Mode: LLM Parse Website" : "Mode: LLM Inference"} through the Somnia Agents platform.</p>
            {quoteError ? <p className="mt-2 text-xs leading-5 text-ember">{quoteError}</p> : null}
          </div>
          <div className="rounded-2xl border border-signal/15 bg-signal/[0.04] p-4 text-xs leading-5 text-white/55">
            You sign once. Somnia validators run the agent. The result appears here after the router receives the callback.
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-xs leading-5 text-white/55">
            <p className="font-mono uppercase tracking-[0.2em] text-white/35">OS mode</p>
            <p className="mt-2">{osKernelEnabled && osKernelConfigured ? "For multi-step autonomous workflows, launch an OS process from Command Center and run agent steps with protocol-fee accounting." : "OS process mode is branch-gated until the new kernel contracts are deployed and configured."}</p>
            <a href="/app/os" className="mt-3 inline-flex rounded-lg border border-signal/25 bg-signal/10 px-3 py-2 font-semibold text-signal">Open OS Command Center</a>
          </div>
          <button onClick={runAgent} disabled={isRunning} className="inline-flex items-center justify-center gap-2 rounded-xl bg-signal px-5 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60">
            {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RadioTower className="h-4 w-4" />}
            Run agent
          </button>
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
          <p className="mt-4 font-mono text-xs text-white/40">{matchedOnchain ? `Backed by SomniacOS agent #${matchedOnchain.id}` : "Specialist profile mapped to Somnia Agents runtime."}</p>
        </div>
        <div className="panel rounded-[1.5rem] p-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">Status</p>
          <p className="mt-3 text-white">{tx.status}</p>
          <StatusTimeline phase={tx.phase} />
          {tx.hash ? <a href={`${somnia.blockExplorers.default.url}/tx/${tx.hash}`} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-2 break-all font-mono text-xs text-cobalt"><ExternalLink className="h-3 w-3" />{tx.hash}</a> : null}
          {tx.error ? <ErrorCallout message={tx.error} action={tx.action} /> : null}
          {activeRun ? <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 font-mono text-xs text-white/50">request #{activeRun.requestId} - {activeRun.status}</p> : null}
          {pendingRuns.length ? <p className="mt-3 rounded-2xl border border-ember/25 bg-ember/10 p-3 text-xs leading-5 text-ember">{pendingRuns.length} request{pendingRuns.length === 1 ? "" : "s"} still running. Keep this page open or refresh later; SomniacOS will keep checking.</p> : null}
        </div>
      </aside>

      {latestResult ? (
        <section className="xl:col-span-2 rounded-[1.5rem] border border-signal/25 bg-[linear-gradient(135deg,rgba(0,255,194,0.12),rgba(19,19,19,0.88))] p-5 shadow-[0_0_70px_rgba(0,255,194,0.10)] sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-signal">Latest result</p>
              <h3 className="mt-2 text-3xl font-semibold text-white">{readableAgentLabel(latestResult.appAgentId)}</h3>
            </div>
            <span className="rounded-full border border-signal/30 bg-black/25 px-3 py-1 font-mono text-xs text-signal">request #{latestResult.requestId}</span>
          </div>
          {latestResult.task ? <p className="mt-3 text-sm text-white/48">{latestResult.task}</p> : null}
          <p className="mt-4 whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/25 p-4 text-sm leading-7 text-white/82">{latestResult.result}</p>
          {latestResult.txHash ? <a className="mt-4 inline-flex items-center gap-2 font-mono text-xs text-cobalt" href={`${somnia.blockExplorers.default.url}/tx/${latestResult.txHash}`} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3" />View result transaction</a> : null}
        </section>
      ) : null}

      <section className="xl:col-span-2 panel rounded-[1.5rem] p-5 sm:p-6">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-signal">Anchored results</p>
        <h3 className="mt-3 text-3xl font-semibold text-white">Confirmed Somnia results</h3>
        <div className="mt-4 grid gap-3">
          {anchoredResults.slice(0, 8).map((item) => (
            <article key={item.requestId} className="rounded-2xl border border-white/10 bg-[#101010] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h4 className="font-semibold text-white">{readableAgentLabel(item.appAgentId)}</h4>
                <span className="font-mono text-xs text-signal">request #{item.requestId}</span>
              </div>
              {item.task ? <p className="mt-2 text-sm text-white/45">{item.task}</p> : null}
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/76">{item.result}</p>
              <div className="mt-4 flex flex-wrap gap-3 font-mono text-xs text-white/38">
                <span>{item.mode}</span>
                {item.txHash ? <a className="text-cobalt" href={`${somnia.blockExplorers.default.url}/tx/${item.txHash}`} target="_blank" rel="noreferrer">tx</a> : null}
              </div>
            </article>
          ))}
          {!anchoredResults.length ? <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.02] p-6 text-sm text-white/48">No completed Somnia Agent results yet. Run an agent and wait for the callback. If the callback takes longer than expected, the request will stay visible as pending.</div> : null}
        </div>
      </section>

      {resultModal ? <ResultModal run={resultModal} onClose={() => setResultModal(null)} /> : null}
    </div>
  );
}

function StatusTimeline({ phase }: { phase: RunPhase }) {
  const currentIndex = statusSteps.findIndex((step) => step.phase === phase);
  return (
    <div className="mt-4 grid gap-2">
      {statusSteps.map((step, index) => {
        const done = phase === "success" || (currentIndex >= 0 && index < currentIndex);
        const active = step.phase === phase;
        return (
          <div key={step.phase} className="flex items-center gap-3 text-xs">
            <span className={`grid h-5 w-5 place-items-center rounded-full border ${done ? "border-signal bg-signal text-black" : active ? "border-signal text-signal" : "border-white/12 text-white/22"}`}>
              {done ? <CheckCircle2 className="h-3 w-3" /> : active ? <Loader2 className="h-3 w-3 animate-spin" /> : <Clock3 className="h-3 w-3" />}
            </span>
            <span className={done || active ? "text-white" : "text-white/35"}>{step.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function ErrorCallout({ message, action }: { message: string; action?: string }) {
  return (
    <div className="mt-3 rounded-2xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p>{message}</p>
          {action ? <p className="mt-2 text-xs text-white/62">{action}</p> : null}
        </div>
      </div>
    </div>
  );
}

function validateWorkbenchInput(goal: string, constraints: string, urls: string[]) {
  if (!goal.trim()) throw new Error("Enter a task for the agent.");
  if (goal.length > 2800) throw new Error("task too large");
  if (constraints.length > 1600) throw new Error("constraints too large");
  if (urls.length > 3) throw new Error("too many urls");
  for (const url of urls) {
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("invalid url");
    } catch {
      throw new Error("invalid url");
    }
  }
}

function recommendedAction(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (message.includes("rejected") || message.includes("denied")) return "Nothing was submitted. Click Run agent again and approve the wallet prompt.";
  if (message.includes("insufficient") || message.includes("underfunded")) return "Add STT on Somnia Shannon, refresh the page, then retry.";
  if (message.includes("chain") || message.includes("network")) return "Use the wallet button to switch to Somnia Shannon.";
  if (message.includes("timeout") || message.includes("callback")) return "Keep the Workbench open or refresh later. Pending requests are recovered from local storage.";
  if (message.includes("url")) return "Fix the URL or remove it to use LLM mode.";
  return "Review the message above, then retry when corrected.";
}

function ResultModal({ run, onClose }: { run: AgentRunRecord; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/72 p-4 backdrop-blur">
      <section className="max-h-[88vh] w-full max-w-3xl overflow-auto rounded-[1.5rem] border border-signal/25 bg-[#131313] p-5 shadow-[0_0_80px_rgba(0,255,194,0.14)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-signal">Somnia result</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Request #{run.requestId} completed</h2>
          </div>
          <button onClick={onClose} className="rounded-full border border-white/10 p-2 text-white/60 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
        <p className="mt-5 whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/78">{run.result}</p>
        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-white/45">
          <CheckCircle2 className="h-4 w-4 text-signal" />
          <span>Stored by SomniacAgentRouter and visible in Anchored results.</span>
        </div>
      </section>
    </div>
  );
}

function extractRequestId(logs: readonly { address: Address; data: `0x${string}`; topics: readonly [`0x${string}`, ...`0x${string}`[]] | readonly [] }[]) {
  for (const log of logs) {
    if (log.address.toLowerCase() !== contracts.SomniacAgentRouter.toLowerCase()) continue;
    try {
      const decoded = decodeEventLog({ abi: somniacAgentRouterAbi, data: log.data, topics: [...log.topics] });
      if (decoded.eventName === "AgentRunRequested") return String((decoded.args as { requestId?: bigint }).requestId ?? "");
    } catch {
      // Ignore non-router events in the same transaction.
    }
  }
  return "";
}

async function readRun(requestId: string, txHash?: Hash): Promise<AgentRunRecord> {
  const run = await publicClient.readContract({
    address: contracts.SomniacAgentRouter as Address,
    abi: somniacAgentRouterAbi,
    functionName: "getRun",
    args: [BigInt(requestId)]
  }) as readonly unknown[];
  return {
    requestId,
    user: String(run[0]),
    appAgentId: String(run[1]),
    task: String(run[2]),
    constraints: String(run[3]),
    url: String(run[4]),
    somniaAgentId: String(run[5]),
    mode: modeLabels[Number(run[6])] ?? "LLM",
    status: statusLabels[Number(run[7])] ?? "Pending",
    result: String(run[8]),
    createdAt: String(run[9]),
    completedAt: String(run[10]),
    txHash
  };
}

async function waitForRun(requestId: string, txHash?: Hash) {
  const started = Date.now();
  while (Date.now() - started < 8 * 60_000) {
    const run = await readRun(requestId, txHash);
    if (run.status !== "Pending") return run;
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error("Somnia Agent callback has not arrived yet. The request is still onchain; refresh the Workbench later.");
}
