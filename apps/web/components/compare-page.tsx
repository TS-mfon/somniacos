"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Copy, ExternalLink, GitCompare, Loader2, Play, WalletCards } from "lucide-react";
import { createPublicClient, createWalletClient, decodeEventLog, encodeFunctionData, formatEther, http, keccak256, parseEther, toHex, type Address, type Hash } from "viem";
import { buildAgentHandoffs, buildNextActions, defaultMemory, outputFormats, readableAgentLabel, regularWorkbenchAgents, scoreAgentRun, type AgentMemory, type AgentRunRecord, type CompareSession, type CuratedAgent, type OutputFormat } from "../lib/agent-engine";
import { loadCompareSessions, upsertCompareSession, upsertRunHistory } from "../lib/history-store";
import { bufferedGas, detectWalletKind, estimateGasFees, pickPricingForWallet, pricingArgs } from "../lib/somnia-gas";
import { osContracts, osKernelConfigured, osKernelEnabled, somnia, somniacAgentRouterV2Abi } from "../lib/contracts";
import { summarizeError } from "../lib/onchain-state";
import { useSomniaWallet } from "./wallet-button";

const publicClient = createPublicClient({ chain: somnia, transport: http(somnia.rpcUrls.default.http[0]) });
const routerConfigured = osKernelEnabled && osKernelConfigured;

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

const capabilityByAgent: Record<string, string> = {
  "marketing-strategist": "marketing.strategy",
  "content-writer": "content.write",
  "research-analyst": "research.web",
  "code-auditor": "audit.code",
  "security-auditor": "security.monitor",
  "treasury-planner": "treasury.plan",
  "governance-drafter": "governance.draft",
  "negotiation-agent": "marketing.strategy",
  "token-researcher": "research.web",
  "wallet-risk-scanner": "security.monitor",
  "defi-yield-scout": "treasury.plan",
  "transaction-explainer": "research.web",
  "portfolio-planner": "treasury.plan",
  "airdrop-planner": "research.web",
  "email-writer": "content.write",
  "travel-planner": "research.web",
  "study-tutor": "content.write",
  "career-coach": "content.write",
  "meeting-summarizer": "content.write",
  "productivity-planner": "content.write",
  "token-launcher": "content.write"
};

const allCapabilities = ["content.write", "marketing.strategy", "research.web", "research.api", "audit.code", "treasury.plan", "governance.draft", "security.monitor"].map((item) => keccak256(toHex(item)));

type PaidCompareRequest = {
  agent: CuratedAgent;
  requestId: string;
  hash: Hash;
  account: Address;
};

export function ComparePage() {
  const { wallet, connect, refresh, switchToSomnia, walletClient } = useSomniaWallet();
  const [task, setTask] = useState("Create a launch post for an AI agent dApp on Somnia.");
  const [constraints, setConstraints] = useState("Make it concise, clear, and credible. Avoid hype.");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("brief");
  const [agentIds, setAgentIds] = useState<string[]>(["marketing-strategist", "content-writer"]);
  const [runs, setRuns] = useState<AgentRunRecord[]>([]);
  const [sessions, setSessions] = useState<CompareSession[]>([]);
  const [memory, setMemory] = useState<AgentMemory>(defaultMemory());
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [txStatus, setTxStatus] = useState("");
  const [deposit, setDeposit] = useState<bigint | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [txHashes, setTxHashes] = useState<Hash[]>([]);

  useEffect(() => {
    setSessions(loadCompareSessions());
    const stored = window.localStorage.getItem("somniacos.agentMemory");
    if (stored) {
      try {
        setMemory({ ...defaultMemory(), ...JSON.parse(stored) as AgentMemory });
      } catch {
        setMemory(defaultMemory());
      }
    }
  }, []);

  useEffect(() => {
    if (!routerConfigured) {
      setDeposit(null);
      return;
    }
    let cancelled = false;
    async function quoteCompare() {
      try {
        setQuoteError("");
        const quoted = await publicClient.readContract({
          address: osContracts.SomniacAgentRouterV2 as Address,
          abi: somniacAgentRouterV2Abi,
          functionName: "getTotalDue",
          args: [0]
        });
        if (!cancelled) setDeposit(quoted as bigint);
      } catch (err) {
        if (!cancelled) {
          setDeposit(null);
          setQuoteError(summarizeError(err));
        }
      }
    }
    void quoteCompare();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedAgents = useMemo(() => regularWorkbenchAgents.filter((agent) => agentIds.includes(agent.id)), [agentIds]);
  const totalDue = deposit ? deposit * BigInt(selectedAgents.length) : null;
  const bestRun = useMemo(() => [...runs].filter((run) => run.status === "Success").sort((a, b) => (b.confidence?.score ?? 0) - (a.confidence?.score ?? 0))[0], [runs]);
  const completeRuns = runs.filter((run) => run.status !== "Pending");
  const compareSummary = useMemo(() => {
    const successful = completeRuns.filter((run) => run.status === "Success");
    if (successful.length < 2) return "";
    const ranked = [...successful].sort((a, b) => (b.confidence?.score ?? 0) - (a.confidence?.score ?? 0));
    const best = ranked[0];
    const runnerUp = ranked[1];
    return `${readableAgentLabel(best.appAgentId)} ranks strongest with ${best.confidence?.score ?? 0}% confidence. Compare it against ${readableAgentLabel(runnerUp.appAgentId)} for specificity, constraints, actionability, and proof quality before copying the winning output.`;
  }, [completeRuns]);

  function toggleAgent(id: string) {
    if (running) return;
    setAgentIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id].slice(0, 3));
  }

  async function runCompare() {
    try {
      setError("");
      setTxStatus("");
      setTxHashes([]);
      setRunning(true);
      setRuns([]);
      if (!task.trim()) throw new Error("Enter a task to compare.");
      if (selectedAgents.length < 2) throw new Error("Choose at least two agents.");
      if (!routerConfigured) throw new Error("SomniacOS paid agent router is not deployed on this build.");
      if (!deposit) throw new Error("Unable to quote the Somnia agent fee. Refresh and try again.");

      const account = await ensureWalletReady();
      const balance = await publicClient.getBalance({ address: account });
      if (totalDue && balance < totalDue) {
        throw new Error(`Insufficient STT. This compare needs ${formatEther(totalDue)} STT plus gas for ${selectedAgents.length} transactions.`);
      }

      const startedAt = Date.now();
      const initialRuns = selectedAgents.map((agent) => buildCompareRun({
        agentId: agent.id,
        requestId: `compare-pending-${startedAt}-${agent.id}`,
        status: "Pending",
        result: "Waiting for wallet signature. No result will be generated until the Somnia transaction is confirmed.",
        source: "Somnia",
        account
      }));
      setRuns(initialRuns);

      const paidRequests: PaidCompareRequest[] = [];
      setTxStatus(`Open your wallet ${selectedAgents.length} time${selectedAgents.length === 1 ? "" : "s"}. The current router uses one paid transaction per selected agent.`);
      for (const agent of selectedAgents) {
        setRuns((current) => current.map((run) => run.appAgentId === agent.id ? { ...run, result: `Opening wallet for ${agent.role}.` } : run));
        const paid = await submitPaidCompareRequest(agent, account, startedAt);
        paidRequests.push(paid);
        setTxHashes((current) => [...current, paid.hash]);
        const onchainPending = buildCompareRun({
          agentId: agent.id,
          requestId: paid.requestId,
          status: "Pending",
          result: `Paid Somnia request #${paid.requestId} confirmed. Waiting for live agent output.`,
          source: "Somnia",
          account,
          txHash: paid.hash
        });
        setRuns((current) => current.map((run) => run.appAgentId === agent.id ? onchainPending : run));
      }

      setTxStatus("All compare payments are confirmed. Running selected agents in parallel with strict live-provider mode.");
      const completed = await Promise.all(paidRequests.map((request) => executeStrictCompareAgent(request)));
      setRuns(completed);
      completed.forEach((run) => upsertRunHistory(run));
      const session: CompareSession = {
        id: `compare:${Date.now()}`,
        task,
        constraints,
        outputFormat,
        agentIds,
        results: completed,
        createdAt: new Date().toISOString()
      };
      upsertCompareSession(session);
      setSessions(loadCompareSessions());
      setTxStatus(completed.some((run) => run.status === "Success") ? "Compare completed. Successful results are saved to History and visible below." : "Compare finished, but no live agent returned a usable result. No local mock output was used.");
      await refresh(account);
    } catch (err) {
      setError(summarizeError(err));
    } finally {
      setRunning(false);
    }
  }

  async function ensureWalletReady() {
    if (!window.ethereum) throw new Error("No injected wallet found.");
    let accounts = await window.ethereum.request({ method: "eth_requestAccounts" }) as Address[];
    if (!accounts[0]) {
      await connect();
      accounts = await window.ethereum.request({ method: "eth_requestAccounts" }) as Address[];
    }
    const account = accounts[0];
    const chain = await window.ethereum.request({ method: "eth_chainId" }) as string;
    if (Number.parseInt(chain, 16) !== somnia.id) {
      setTxStatus("Switching wallet to Somnia Shannon, then continuing automatically.");
      await switchToSomnia();
    }
    await refresh(account);
    return account;
  }

  async function submitPaidCompareRequest(agent: CuratedAgent, account: Address, startedAt: number): Promise<PaidCompareRequest> {
    if (!deposit) throw new Error("Missing fee quote.");
    const capability = capabilityByAgent[agent.id] ?? "content.write";
    const data = encodeFunctionData({
      abi: somniacAgentRouterV2Abi,
      functionName: "launchWorkflowAgentRun",
      args: [
        parseEther("5"),
        6n,
        1n,
        true,
        allCapabilities,
        "somniacos://domains/open",
        `Compare ${agent.role}: ${task.trim()}`,
        `somniacos://compare/${startedAt}/${agent.id}`,
        keccak256(toHex(capability)),
        agent.id,
        task.trim(),
        constraints.trim(),
        [],
        0
      ]
    });
    const transaction = {
      account,
      to: osContracts.SomniacAgentRouterV2 as Address,
      value: deposit,
      data
    } as const;
    setTxStatus(`Estimating gas and opening wallet for ${agent.role}.`);
    const gasEstimate = await publicClient.estimateGas(transaction);
    const gas = bufferedGas(gasEstimate);
    const rawPricing = await estimateGasFees(publicClient);
    const pricing = pickPricingForWallet(rawPricing, detectWalletKind(typeof window !== "undefined" ? window.ethereum : undefined));
    const client = createWalletClient({ chain: somnia, transport: walletClient() });
    const nonce = await publicClient.getTransactionCount({ address: account, blockTag: "pending" });
    const hash = await client.sendTransaction({ ...transaction, gas, nonce, ...pricingArgs(pricing) });
    setTxStatus(`${agent.role} transaction submitted. Waiting for Somnia receipt.`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
    if (receipt.status !== "success") throw new Error(`${agent.role} Somnia transaction reverted.`);
    const requestId = extractRequestId(receipt.logs);
    if (!requestId) throw new Error(`${agent.role} transaction confirmed, but OSAgentRunRequested was not found in the receipt.`);
    return { agent, requestId, hash, account };
  }

  async function executeStrictCompareAgent({ agent, requestId, hash, account }: PaidCompareRequest): Promise<AgentRunRecord> {
    try {
      const response = await fetch("/api/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: agent.id,
          task,
          constraints,
          outputFormat,
          memory,
          requestId,
          txHash: hash,
          missionId: "compare-paid",
          executionMode: "strict"
        })
      });
      const payload = await response.json() as { result?: string; source?: AgentRunRecord["source"]; outputFormat?: OutputFormat; providerError?: string; error?: string };
      if (response.ok && payload.result) {
        const base = buildCompareRun({
          agentId: agent.id,
          requestId,
          status: "Success",
          result: payload.result,
          source: payload.source ?? "LLM API",
          account,
          txHash: hash,
          format: payload.outputFormat ?? outputFormat,
          memoryNote: payload.providerError ? `Provider warning: ${payload.providerError}` : ""
        });
        return { ...base, confidence: scoreAgentRun(base) };
      }
      const callbackRun = await waitForRun(requestId, hash, account, agent.id, payload.error ?? "Live agent provider did not return a result.");
      return { ...callbackRun, confidence: scoreAgentRun(callbackRun) };
    } catch (err) {
      const fallbackMessage = err instanceof Error ? err.message : "Live agent comparison failed.";
      const callbackRun = await waitForRun(requestId, hash, account, agent.id, fallbackMessage);
      return { ...callbackRun, confidence: scoreAgentRun(callbackRun) };
    }
  }

  function buildCompareRun({
    agentId,
    requestId,
    status,
    result,
    source,
    account,
    txHash,
    format = outputFormat,
    memoryNote = ""
  }: {
    agentId: string;
    requestId: string;
    status: AgentRunRecord["status"];
    result: string;
    source: AgentRunRecord["source"];
    account?: Address;
    txHash?: Hash;
    format?: OutputFormat;
    memoryNote?: string;
  }): AgentRunRecord {
    return {
      requestId,
      user: account ?? wallet.address ?? "compare-lab",
      appAgentId: agentId,
      task: task.trim(),
      constraints: constraints.trim(),
      url: "",
      somniaAgentId: "",
      mode: "LLM",
      status,
      result,
      source,
      missionId: "compare-paid",
      outputFormat: format,
      nextActions: buildNextActions(agentId, task, format),
      handoffs: buildAgentHandoffs(agentId, task),
      memorySnapshot: [memory.projectName, memory.audience, memory.context, memoryNote].filter(Boolean).join(" | "),
      createdAt: new Date().toISOString(),
      completedAt: status === "Pending" ? "" : new Date().toISOString(),
      txHash
    };
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="panel rounded-[1.5rem] p-5 sm:p-6">
        <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.24em] text-signal"><GitCompare className="h-4 w-4" /> Paid result compare</p>
        <h2 className="mt-3 text-3xl font-semibold text-white">Run the same task through multiple paid agents.</h2>
        <p className="mt-2 text-sm leading-6 text-white/52">Compare now signs real Somnia requests. No local fallback is allowed here: if the live LLM/callback path fails, the card shows a real failure instead of a mock result.</p>
        <div className="mt-5 grid gap-3 rounded-2xl border border-signal/15 bg-signal/[0.05] p-4 text-sm text-white/62 md:grid-cols-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/35">Per agent</p>
            <p className="mt-1 font-mono text-lg text-signal">{deposit ? `${formatEther(deposit)} STT` : "Quote loading"}</p>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/35">Total selected</p>
            <p className="mt-1 font-mono text-lg text-signal">{totalDue ? `${formatEther(totalDue)} STT` : "Select agents"}</p>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/35">Signing model</p>
            <p className="mt-1 text-xs leading-5">Current router: one wallet transaction per selected agent.</p>
          </div>
        </div>
        {quoteError ? <p className="mt-3 rounded-2xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{quoteError}</p> : null}
        <div className="mt-6 grid gap-4">
          <label>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">Task</span>
            <textarea value={task} onChange={(event) => setTask(event.target.value)} className="mt-2 min-h-28 w-full rounded-xl border border-white/10 bg-[#101010] px-4 py-3 text-white outline-none focus:border-signal/60" />
          </label>
          <label>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">Constraints</span>
            <textarea value={constraints} onChange={(event) => setConstraints(event.target.value)} className="mt-2 min-h-20 w-full rounded-xl border border-white/10 bg-[#101010] px-4 py-3 text-white outline-none focus:border-signal/60" />
          </label>
          <label>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">Format</span>
            <select value={outputFormat} onChange={(event) => setOutputFormat(event.target.value as OutputFormat)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101010] px-4 py-3 text-white outline-none focus:border-signal/60">
              {outputFormats.map((format) => <option key={format.id} value={format.id}>{format.label}</option>)}
            </select>
          </label>
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">Agents, choose 2-3</p>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {regularWorkbenchAgents.slice(0, 12).map((agent) => (
                <button key={agent.id} onClick={() => toggleAgent(agent.id)} disabled={running} className={`rounded-xl border p-3 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${agentIds.includes(agent.id) ? "border-signal/50 bg-signal/10 text-white" : "border-white/10 bg-[#101010] text-white/55 hover:border-signal/25"}`}>
                  <span className="block font-semibold">{agent.role}</span>
                  <span className="mt-1 block text-xs opacity-70">{agent.name}</span>
                </button>
              ))}
            </div>
          </div>
          {txStatus ? <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-white/62">{txStatus}</p> : null}
          {error ? <p className="flex gap-2 rounded-2xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}</p> : null}
          <div className="rounded-2xl border border-ember/40 bg-ember/10 p-4 text-xs leading-5 text-ember">
            <span className="font-mono uppercase tracking-[0.2em]">Heads up</span>
            <p className="mt-2 text-white/75">Your wallet will open once per agent. <strong className="text-ember">Keep the suggested gas — do NOT lower it in Advanced.</strong> Lowering gas stalls the Somnia request and you would still pay the protocol fee.</p>
          </div>
          <button onClick={runCompare} disabled={running || !deposit || selectedAgents.length < 2} className="inline-flex items-center justify-center gap-2 rounded-xl bg-signal px-5 py-3 font-semibold text-black disabled:opacity-60">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : wallet.address ? <Play className="h-4 w-4" /> : <WalletCards className="h-4 w-4" />}
            {wallet.address ? "Run paid compare" : "Connect and run paid compare"}
          </button>
        </div>
      </section>

      <aside className="space-y-4">
        <div className="panel rounded-[1.5rem] p-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">Best current result</p>
          {bestRun ? <p className="mt-3 text-sm leading-6 text-white/62">{bestRun.confidence?.label} confidence from {regularWorkbenchAgents.find((agent) => agent.id === bestRun.appAgentId)?.role}.</p> : <p className="mt-3 text-sm leading-6 text-white/45">Run a paid comparison to score live outputs.</p>}
        </div>
        {compareSummary ? <div className="panel rounded-[1.5rem] p-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">Comparison summary</p>
          <p className="mt-3 text-sm leading-6 text-white/62">{compareSummary}</p>
        </div> : null}
        <div className="panel rounded-[1.5rem] p-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">Proofs this run</p>
          <p className="mt-3 text-3xl font-semibold text-white">{txHashes.length}</p>
          <div className="mt-3 space-y-2">
            {txHashes.map((hash) => (
              <a key={hash} href={`${somnia.blockExplorers.default.url}/tx/${hash}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 truncate font-mono text-xs text-signal hover:text-white">
                <ExternalLink className="h-3 w-3 shrink-0" />
                {hash.slice(0, 10)}...{hash.slice(-6)}
              </a>
            ))}
          </div>
        </div>
        <div className="panel rounded-[1.5rem] p-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">Saved sessions</p>
          <p className="mt-3 text-3xl font-semibold text-white">{sessions.length}</p>
        </div>
      </aside>

      <section className="grid gap-4 xl:col-span-2 md:grid-cols-2">
        {!runs.length ? <div className="md:col-span-2 rounded-[1.5rem] border border-dashed border-white/12 p-6 text-sm leading-6 text-white/45">Select two or three agents, sign the paid Somnia requests, and the real outputs will appear side-by-side for comparison.</div> : null}
        {runs.map((run) => (
          <article key={run.requestId} className={`panel rounded-[1.5rem] p-5 ${run.status === "Failed" ? "border-danger/30" : ""}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xl font-semibold text-white">{regularWorkbenchAgents.find((agent) => agent.id === run.appAgentId)?.role}</h3>
              {run.status === "Pending" ? <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 font-mono text-xs text-white/45"><Loader2 className="h-3 w-3 animate-spin" /> running</span> : run.confidence ? <span className={`rounded-full border px-3 py-1 font-mono text-xs ${run.status === "Success" ? "border-signal/25 bg-signal/10 text-signal" : "border-danger/25 bg-danger/10 text-danger"}`}>{run.confidence.label} {run.confidence.score}%</span> : null}
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-white/72">{run.result}</p>
            {run.confidence?.dimensions?.length ? <div className="mt-5 grid gap-2">
              {run.confidence.dimensions.map((dimension) => (
                <div key={dimension.label}>
                  <div className="flex justify-between font-mono text-[11px] uppercase tracking-[0.16em] text-white/35">
                    <span>{dimension.label}</span>
                    <span>{dimension.score}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-signal" style={{ width: `${dimension.score}%` }} />
                  </div>
                </div>
              ))}
            </div> : null}
            {run.status !== "Pending" ? <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="rounded-lg border border-white/10 px-2 py-1 font-mono text-[11px] text-white/40">{run.source}</span>
              {run.txHash ? <a href={`${somnia.blockExplorers.default.url}/tx/${run.txHash}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 font-mono text-[11px] text-signal hover:text-white"><ExternalLink className="h-3 w-3" /> tx</a> : null}
              <button onClick={() => void navigator.clipboard?.writeText(run.result)} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 font-mono text-[11px] text-white/45 hover:text-white"><Copy className="h-3 w-3" /> copy</button>
              {run.status === "Success" ? <span className="inline-flex items-center gap-1 rounded-lg border border-signal/20 px-2 py-1 font-mono text-[11px] text-signal"><CheckCircle2 className="h-3 w-3" /> saved</span> : null}
            </div> : null}
          </article>
        ))}
      </section>
    </div>
  );
}

function extractRequestId(logs: readonly { address: Address; data: `0x${string}`; topics: readonly [`0x${string}`, ...`0x${string}`[]] | readonly [] }[]) {
  for (const log of logs) {
    if (log.address.toLowerCase() !== osContracts.SomniacAgentRouterV2.toLowerCase()) continue;
    try {
      const decoded = decodeEventLog({ abi: somniacAgentRouterV2Abi, data: log.data, topics: [...log.topics] });
      if (decoded.eventName === "OSAgentRunRequested") return String((decoded.args as { requestId?: bigint }).requestId ?? "");
    } catch {
      // Ignore non-router logs.
    }
  }
  return "";
}

async function readRun(requestId: string, txHash: Hash, account: Address, fallbackAgentId: string, fallbackMessage: string): Promise<AgentRunRecord> {
  const run = await publicClient.readContract({
    address: osContracts.SomniacAgentRouterV2 as Address,
    abi: somniacAgentRouterV2Abi,
    functionName: "getRun",
    args: [BigInt(requestId)]
  }) as readonly unknown[];
  const status = statusLabels[Number(run[9])] ?? "Pending";
  const result = String(run[10] || "");
  return {
    requestId,
    user: account,
    appAgentId: String(run[4] || fallbackAgentId),
    task: String(run[5]),
    constraints: "",
    url: String(run[6]),
    somniaAgentId: String(run[7]),
    mode: modeLabels[Number(run[8])] ?? "LLM",
    status,
    result: result || (status === "Pending" ? "Somnia request is still pending. No local fallback was used." : fallbackMessage),
    source: "Somnia",
    missionId: "compare-paid",
    outputFormat: "brief",
    createdAt: "",
    completedAt: status === "Pending" ? "" : new Date().toISOString(),
    txHash
  };
}

async function waitForRun(requestId: string, txHash: Hash, account: Address, fallbackAgentId: string, fallbackMessage: string) {
  const started = Date.now();
  let lastReadError = "";
  while (Date.now() - started < 3 * 60_000) {
    try {
      const run = await readRun(requestId, txHash, account, fallbackAgentId, fallbackMessage);
      if (run.status !== "Pending") return run;
    } catch (error) {
      lastReadError = summarizeError(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  const failed: AgentRunRecord = {
    requestId,
    user: account,
    appAgentId: fallbackAgentId,
    task: "",
    constraints: "",
    url: "",
    somniaAgentId: "",
    mode: "LLM",
    status: "TimedOut",
    result: `${fallbackMessage}${lastReadError ? `\n\nLast Somnia read error: ${lastReadError}` : ""}\n\nThe paid Somnia request is still recoverable from transaction ${txHash}. Refresh History/Anchored Results later; no mock output was generated.`,
    source: "Somnia",
    missionId: "compare-paid",
    outputFormat: "brief",
    createdAt: "",
    completedAt: new Date().toISOString(),
    txHash
  };
  return failed;
}

