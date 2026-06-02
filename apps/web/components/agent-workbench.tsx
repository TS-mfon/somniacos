"use client";

import { useEffect, useMemo, useState } from "react";
import { createPublicClient, createWalletClient, decodeEventLog, encodeFunctionData, formatEther, http, keccak256, parseEther, toHex, type Address, type Hash } from "viem";
import { AlertTriangle, Brain, CheckCircle2, Clock3, Copy, ExternalLink, GitBranch, Loader2, RadioTower, Sparkles, X } from "lucide-react";
import { useOnchainActivity } from "./live-economy";
import { useSomniaWallet } from "./wallet-button";
import { osContracts, osKernelConfigured, osKernelEnabled, somnia, somniacAgentRouterV2Abi } from "../lib/contracts";
import {
  agentMissions,
  buildAgentHandoffs,
  buildNextActions,
  curatedAgents,
  defaultMemory,
  inferOutputFormat,
  matchOnchainAgent,
  outputFormats,
  readableAgentLabel,
  type AgentMemory,
  type AgentNextAction,
  type AgentRunRecord,
  type CuratedAgent,
  type OutputFormat
} from "../lib/agent-engine";
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
  "productivity-planner": "content.write"
};

const allCapabilities = ["content.write", "marketing.strategy", "research.web", "research.api", "audit.code", "treasury.plan", "governance.draft", "security.monitor"].map((item) => keccak256(toHex(item)));

type RunPhase = "idle" | "wallet" | "network" | "quote" | "signature" | "receipt" | "agent" | "callback" | "success" | "failed";

type WorkbenchTx = {
  phase: RunPhase;
  status: string;
  hash?: Hash;
  error?: string;
  action?: string;
};

const activePhases = new Set<RunPhase>(["wallet", "network", "quote", "signature", "receipt", "agent", "callback"]);
const statusSteps: Array<{ phase: RunPhase; label: string }> = [
  { phase: "wallet", label: "Wallet" },
  { phase: "network", label: "Network" },
  { phase: "quote", label: "Fee quote" },
  { phase: "signature", label: "Signature" },
  { phase: "receipt", label: "Receipt" },
  { phase: "agent", label: "Agent output" },
  { phase: "callback", label: "Somnia callback" },
  { phase: "success", label: "Result visible" }
];

export function AgentWorkbench() {
  const { data, state, reload } = useOnchainActivity(8000);
  const { wallet, connect, switchToSomnia, walletClient, refresh } = useSomniaWallet();
  const [agentId, setAgentId] = useState(agentMissions[0].agentId);
  const [missionId, setMissionId] = useState(agentMissions[0].id);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>(agentMissions[0].outputFormat);
  const [goal, setGoal] = useState(agentMissions[0].task);
  const [constraints, setConstraints] = useState(agentMissions[0].constraints);
  const [webUrls, setWebUrls] = useState("");
  const [memory, setMemory] = useState<AgentMemory>(defaultMemory());
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [deposit, setDeposit] = useState<bigint | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [activeRun, setActiveRun] = useState<AgentRunRecord | null>(null);
  const [resultModal, setResultModal] = useState<AgentRunRecord | null>(null);
  const [tx, setTx] = useState<WorkbenchTx>({ phase: "idle", status: "Ready" });
  const [localRuns, setLocalRuns] = useState<AgentRunRecord[]>([]);

  const selected = useMemo(() => curatedAgents.find((agent) => agent.id === agentId) ?? curatedAgents[0], [agentId]);
  const selectedMission = useMemo(() => agentMissions.find((mission) => mission.id === missionId) ?? agentMissions[0], [missionId]);
  const matchedOnchain = useMemo(() => matchOnchainAgent(selected, state.agents), [selected, state.agents]);
  const allUrls = useMemo(() => webUrls.split(/\s+/).map((url) => url.trim()).filter(Boolean), [webUrls]);
  const urls = useMemo(() => allUrls.slice(0, 3), [allUrls]);
  const mode = urls.length ? 1 : 0;
  const routerConfigured = osKernelEnabled && osKernelConfigured && Boolean(osContracts.SomniacAgentRouterV2);
  const isRunning = activePhases.has(tx.phase);

  const completedFromEvents = useMemo(() => {
    const requested = new Map<string, Record<string, unknown>>();
    for (const item of data.activity) {
      if (item.contract === "SomniacAgentRouterV2" && item.eventName === "OSAgentRunRequested") {
        requested.set(String(item.args.requestId ?? ""), item.args);
      }
    }
    return data.activity
      .filter((item) => item.contract === "SomniacAgentRouterV2" && item.eventName === "OSAgentRunCompleted")
      .map((item) => {
        const args = item.args;
        const requestId = String(args.requestId ?? "");
        const request = requested.get(requestId) ?? {};
        return {
          requestId,
          user: String(request.user ?? ""),
          appAgentId: String(request.appAgentId ?? ""),
          task: String(request.task ?? ""),
          constraints: "",
          url: String(request.url ?? ""),
          somniaAgentId: String(request.somniaAgentId ?? ""),
          mode: modeLabels[Number(request.mode ?? 0)] ?? "LLM",
          status: statusLabels[Number(args.status ?? 0)] ?? "Failed",
          result: String(args.result ?? ""),
          source: "Somnia",
          createdAt: "",
          completedAt: item.blockNumber,
          txHash: item.transactionHash
        } satisfies AgentRunRecord;
      })
      .filter((item) => item.requestId && item.result);
  }, [data.activity]);

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
    if (param) {
      const agent = curatedAgents.find((item) => item.id === param);
      if (agent) applyAgent(agent);
    }
    const stored = window.localStorage.getItem("somniacos.agentRuns");
    if (stored) {
      try {
        setLocalRuns(JSON.parse(stored) as AgentRunRecord[]);
      } catch {
        setLocalRuns([]);
      }
    }
    const storedMemory = window.localStorage.getItem("somniacos.agentMemory");
    if (storedMemory) {
      try {
        setMemory({ ...defaultMemory(), ...JSON.parse(storedMemory) as AgentMemory });
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
    async function loadDeposit() {
      try {
        setQuoteError("");
        const quoted = await publicClient.readContract({
          address: osContracts.SomniacAgentRouterV2 as Address,
          abi: somniacAgentRouterV2Abi,
          functionName: "getTotalDue",
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

  function applyAgent(agent: CuratedAgent) {
    setAgentId(agent.id);
    setGoal(agent.defaultTask);
    setConstraints(agent.defaultConstraints);
    setOutputFormat(inferOutputFormat(agent, "auto"));
    setWebUrls("");
  }

  function applyMission(id: string) {
    const mission = agentMissions.find((item) => item.id === id) ?? agentMissions[0];
    const agent = curatedAgents.find((item) => item.id === mission.agentId) ?? curatedAgents[0];
    setMissionId(mission.id);
    setAgentId(agent.id);
    setGoal(mission.task);
    setConstraints(mission.constraints);
    setOutputFormat(mission.outputFormat);
  }

  function updateMemory(next: AgentMemory) {
    const saved = { ...next, lastUpdated: new Date().toISOString() };
    setMemory(saved);
    window.localStorage.setItem("somniacos.agentMemory", JSON.stringify(saved));
  }

  function runNextAction(action: AgentNextAction) {
    const agent = curatedAgents.find((item) => item.id === action.agentId) ?? selected;
    setAgentId(agent.id);
    setGoal(action.task);
    setConstraints(action.constraints);
    setOutputFormat(action.outputFormat);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function runAgent() {
    try {
      setTx({ phase: "wallet", status: "Checking wallet and task details" });
      if (!routerConfigured) throw new Error("SomniacOS fee router is not deployed yet.");
      validateWorkbenchInput(goal, constraints, allUrls);

      const account = await ensureWalletReady();
      setTx({ phase: "quote", status: "Checking Somnia agent fee plus 0.1 STT protocol fee" });
      if (!deposit) throw new Error("Unable to quote the transaction. Try again in a moment.");
      if (wallet.balance && parseEther(wallet.balance) < deposit) throw new Error(`Insufficient STT. This request needs ${formatEther(deposit)} STT plus gas.`);

      const capability = capabilityByAgent[selected.id] ?? "content.write";
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
          `${selected.role}: ${goal.trim()}`,
          `somniacos://workflow/${selected.id}`,
          keccak256(toHex(capability)),
          selected.id,
          goal.trim(),
          constraints.trim(),
          urls,
          mode
        ]
      });
      const transaction = {
        account,
        to: osContracts.SomniacAgentRouterV2 as Address,
        value: deposit,
        data
      } as const;

      setTx({ phase: "signature", status: "Estimating gas and opening your wallet for one transaction" });
      const gasEstimate = await publicClient.estimateGas(transaction);
      const client = createWalletClient({ chain: somnia, transport: walletClient() });
      const hash = await client.sendTransaction({ ...transaction, gas: bufferedGas(gasEstimate) });

      setTx({ phase: "receipt", status: "Workflow submitted. Waiting for Somnia receipt.", hash });
      const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
      if (receipt.status !== "success") throw new Error("Somnia transaction reverted.");

      const requestId = extractRequestId(receipt.logs);
      if (!requestId) throw new Error("Workflow submitted, but the OSAgentRunRequested event was not found in the receipt.");

      setTx({ phase: "callback", status: `OS workflow request #${requestId} is running. Waiting for Somnia validator callback.`, hash });
      const initial = await readRun(requestId, hash);
      setActiveRun(initial);
      saveRun(initial);

      setTx({ phase: "agent", status: "Transaction signed. Running the specialist agent and preparing the result.", hash });
      const finalRun = await executeAgent({
        requestId,
        hash,
        account,
        selected,
        task: goal.trim(),
        constraints: constraints.trim(),
        urls,
        modeLabel: modeLabels[mode] ?? "LLM",
        missionId,
        outputFormat,
        memory
      });
      setActiveRun(finalRun);
      saveRun(finalRun);
      await reload();
      await refresh(account);

      if (finalRun.status === "Success") {
        setTx({ phase: "success", status: "Confirmed. The agent result is visible below and the protocol fee is recorded.", hash });
        setResultModal(finalRun);
      } else {
        setTx({ phase: "callback", status: "LLM API did not return a result yet. Checking for Somnia callback.", hash });
        const callbackRun = await waitForRun(requestId, hash);
        setActiveRun(callbackRun);
        saveRun(callbackRun);
        if (callbackRun.status === "Success") {
          setTx({ phase: "success", status: "Confirmed. The Somnia callback result is visible below.", hash });
          setResultModal(callbackRun);
        } else {
          setTx({ phase: "failed", status: callbackRun.status, hash, error: callbackRun.result || "Somnia Agent did not return a usable result.", action: "Refresh later or run the task again." });
        }
      }
    } catch (error) {
      setTx({ phase: "failed", status: "Needs attention", error: summarizeError(error), action: recommendedAction(error) });
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
      setTx({ phase: "network", status: "Switching wallet to Somnia Shannon, then continuing automatically" });
      await switchToSomnia();
    }
    await refresh(account);
    return account;
  }

  function saveRun(item: AgentRunRecord) {
    setLocalRuns((current) => {
      const next = [item, ...current.filter((existing) => existing.requestId !== item.requestId)].slice(0, 20);
      window.localStorage.setItem("somniacos.agentRuns", JSON.stringify(next));
      return next;
    });
  }

  const categories = Array.from(new Set(curatedAgents.map((agent) => agent.category)));

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
      <section className="panel rounded-[1.5rem] p-5 sm:p-6">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-signal">Workbench</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-5xl">Run useful agents with one signed transaction.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/58">Pick a specialist, describe the task, and sign once. The transaction includes Somnia agent fees plus the 0.1 STT protocol fee, then the result appears after the onchain callback.</p>
        {data.ok === false ? (
          <div className="mt-5 rounded-2xl border border-ember/30 bg-ember/10 p-4 text-sm leading-6 text-ember">
            Onchain history is temporarily unavailable, but your local confirmed and pending agent runs are still shown below. {data.error}
          </div>
        ) : null}
        <div className="mt-6 grid gap-4">
          <label className="block">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">Mission</span>
            <select value={missionId} onChange={(event) => applyMission(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101010] px-4 py-3 text-white outline-none focus:border-signal/60">
              {agentMissions.map((mission) => <option key={mission.id} value={mission.id}>{mission.label}</option>)}
            </select>
            <span className="mt-2 block text-xs leading-5 text-white/38">{selectedMission.description}</span>
          </label>
          <label className="block">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">Specialist</span>
            <select value={agentId} onChange={(event) => applyAgent(curatedAgents.find((agent) => agent.id === event.target.value) ?? curatedAgents[0])} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101010] px-4 py-3 text-white outline-none focus:border-signal/60">
              {categories.map((category) => (
                <optgroup key={category} label={category}>
                  {curatedAgents.filter((agent) => agent.category === category).map((agent) => <option key={agent.id} value={agent.id}>{agent.role} - {agent.name}</option>)}
                </optgroup>
              ))}
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
            <span className="mt-2 block text-xs text-white/38">Add a full URL when the agent should use Somnia&apos;s website parser. Leave blank for LLM inference.</span>
          </label>
          <label className="block">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">Result format</span>
            <select value={outputFormat} onChange={(event) => setOutputFormat(event.target.value as OutputFormat)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101010] px-4 py-3 text-white outline-none focus:border-signal/60">
              {outputFormats.map((format) => <option key={format.id} value={format.id}>{format.label} - {format.description}</option>)}
            </select>
          </label>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">One transaction total</span>
              <span className="font-mono text-sm text-signal">{deposit ? `${Number(formatEther(deposit)).toFixed(4)} STT` : "Quoting..."}</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-white/45">{mode === 1 ? "Mode: Website parser" : "Mode: LLM inference"} plus 0.1 STT protocol fee.</p>
            {quoteError ? <p className="mt-2 text-xs leading-5 text-ember">{quoteError}</p> : null}
          </div>
          <button onClick={runAgent} disabled={isRunning} className="inline-flex items-center justify-center gap-2 rounded-xl bg-signal px-5 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60">
            {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RadioTower className="h-4 w-4" />}
            Run agent
          </button>
        </div>
      </section>

      <aside className="space-y-4">
        <div className="panel rounded-[1.5rem] p-5">
          <button onClick={() => setMemoryOpen((value) => !value)} className="flex w-full items-center justify-between gap-3 text-left">
            <span>
              <span className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-signal"><Brain className="h-4 w-4" /> Agent memory</span>
              <span className="mt-2 block text-sm text-white/52">{memory.projectName || memory.context ? "Personalized context is active." : "Add context once; agents reuse it."}</span>
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/45">{memoryOpen ? "Close" : "Edit"}</span>
          </button>
          {memoryOpen ? (
            <div className="mt-4 grid gap-3">
              <MemoryInput label="Project" value={memory.projectName} onChange={(value) => updateMemory({ ...memory, projectName: value })} />
              <MemoryInput label="Audience" value={memory.audience} onChange={(value) => updateMemory({ ...memory, audience: value })} />
              <MemoryText label="Context" value={memory.context} onChange={(value) => updateMemory({ ...memory, context: value })} />
              <MemoryText label="Preferences" value={memory.preferences} onChange={(value) => updateMemory({ ...memory, preferences: value })} />
            </div>
          ) : null}
        </div>
        <div className="panel rounded-[1.5rem] p-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">{selected.category} / {selected.role}</p>
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
          {pendingRuns.length ? <p className="mt-3 rounded-2xl border border-ember/25 bg-ember/10 p-3 text-xs leading-5 text-ember">{pendingRuns.length} request{pendingRuns.length === 1 ? "" : "s"} still running. Refresh later; pending requests are recovered from local storage and onchain reads.</p> : null}
        </div>
      </aside>

      {latestResult ? <LatestResult run={latestResult} onNextAction={runNextAction} /> : null}
      <MissionTimeline runs={localRuns} activeMissionId={missionId} />
      <AnchoredResults results={anchoredResults} onNextAction={runNextAction} />
      {resultModal ? <ResultModal run={resultModal} onClose={() => setResultModal(null)} /> : null}
    </div>
  );
}

function LatestResult({ run, onNextAction }: { run: AgentRunRecord; onNextAction: (action: AgentNextAction) => void }) {
  const actions = run.nextActions?.length ? run.nextActions : buildNextActions(run.appAgentId, run.task, run.outputFormat ?? "auto");
  const handoffs = run.handoffs?.length ? run.handoffs : buildAgentHandoffs(run.appAgentId, run.task);
  return (
    <section className="xl:col-span-2 rounded-[1.5rem] border border-signal/25 bg-[linear-gradient(135deg,rgba(0,255,194,0.12),rgba(19,19,19,0.88))] p-5 shadow-[0_0_70px_rgba(0,255,194,0.10)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-signal">Latest result</p>
          <h3 className="mt-2 text-3xl font-semibold text-white">{readableAgentLabel(run.appAgentId)}</h3>
        </div>
        <span className="rounded-full border border-signal/30 bg-black/25 px-3 py-1 font-mono text-xs text-signal">request #{run.requestId}</span>
      </div>
      {run.task ? <p className="mt-3 text-sm text-white/48">{run.task}</p> : null}
      <ResultStudio run={run} />
      <AgentProof run={run} />
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-signal"><GitBranch className="h-4 w-4" /> Agent handoffs</p>
          <div className="mt-3 grid gap-2">
            {handoffs.map((handoff) => (
              <button key={`${handoff.agentId}-${handoff.task}`} onClick={() => onNextAction({ label: `Hand off to ${readableAgentLabel(handoff.agentId)}`, agentId: handoff.agentId, task: handoff.task, constraints: handoff.reason, outputFormat: "auto" })} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left transition hover:border-signal/35">
                <span className="block text-sm font-semibold text-white">{readableAgentLabel(handoff.agentId)}</span>
                <span className="mt-1 block text-xs leading-5 text-white/45">{handoff.reason}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-signal"><Sparkles className="h-4 w-4" /> Autonomous next actions</p>
          <div className="mt-3 grid gap-2">
            {actions.map((action) => (
              <button key={`${action.agentId}-${action.label}`} onClick={() => onNextAction(action)} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left text-sm text-white transition hover:border-signal/35">
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function AnchoredResults({ results, onNextAction }: { results: AgentRunRecord[]; onNextAction: (action: AgentNextAction) => void }) {
  return (
    <section className="xl:col-span-2 panel rounded-[1.5rem] p-5 sm:p-6">
      <p className="font-mono text-xs uppercase tracking-[0.24em] text-signal">Anchored results</p>
      <h3 className="mt-3 text-3xl font-semibold text-white">Confirmed Somnia results</h3>
      <div className="mt-4 grid gap-3">
        {results.slice(0, 8).map((item) => (
          <article key={item.requestId} className="rounded-2xl border border-white/10 bg-[#101010] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h4 className="font-semibold text-white">{readableAgentLabel(item.appAgentId)}</h4>
              <span className="font-mono text-xs text-signal">request #{item.requestId}</span>
            </div>
            {item.task ? <p className="mt-2 text-sm text-white/45">{item.task}</p> : null}
            <ResultStudio run={item} compact />
            <div className="mt-4 flex flex-wrap gap-3 font-mono text-xs text-white/38">
          <span>{item.mode}</span>
          {item.source ? <span>{item.source}</span> : null}
          {item.txHash ? <a className="text-cobalt" href={`${somnia.blockExplorers.default.url}/tx/${item.txHash}`} target="_blank" rel="noreferrer">tx</a> : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(item.nextActions ?? buildNextActions(item.appAgentId, item.task, item.outputFormat ?? "auto")).slice(0, 2).map((action) => (
                <button key={`${item.requestId}-${action.label}`} onClick={() => onNextAction(action)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/62 transition hover:border-signal/35 hover:text-white">{action.label}</button>
              ))}
            </div>
          </article>
        ))}
        {!results.length ? <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.02] p-6 text-sm text-white/48">No completed Somnia Agent results yet. Run an agent and wait for the callback.</div> : null}
      </div>
    </section>
  );
}

function ResultStudio({ run, compact = false }: { run: AgentRunRecord; compact?: boolean }) {
  const format = run.outputFormat ?? "auto";
  return (
    <div className={`${compact ? "mt-3" : "mt-4"} rounded-2xl border border-white/10 bg-black/25 p-4`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-signal">{format.replace("-", " ")}</span>
        <button onClick={() => void navigator.clipboard?.writeText(run.result)} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 font-mono text-[11px] text-white/45 hover:text-white"><Copy className="h-3 w-3" /> copy</button>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-7 text-white/82">{run.result}</p>
    </div>
  );
}

function AgentProof({ run }: { run: AgentRunRecord }) {
  return (
    <div className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 font-mono text-xs text-white/45 md:grid-cols-4">
      <span>agent: {readableAgentLabel(run.appAgentId)}</span>
      <span>source: {run.source ?? "Somnia"}</span>
      <span>request: #{run.requestId}</span>
      {run.txHash ? <a className="text-cobalt" href={`${somnia.blockExplorers.default.url}/tx/${run.txHash}`} target="_blank" rel="noreferrer">signed tx</a> : <span>signed tx: local</span>}
    </div>
  );
}

function MissionTimeline({ runs, activeMissionId }: { runs: AgentRunRecord[]; activeMissionId: string }) {
  const missionRuns = runs.filter((run) => run.missionId === activeMissionId).slice(0, 4);
  if (!missionRuns.length) return null;
  return (
    <section className="xl:col-span-2 panel rounded-[1.5rem] p-5 sm:p-6">
      <p className="font-mono text-xs uppercase tracking-[0.24em] text-signal">Mission timeline</p>
      <h3 className="mt-3 text-3xl font-semibold text-white">Recent autonomous steps</h3>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        {missionRuns.map((run, index) => (
          <div key={`${run.requestId}-${index}`} className="rounded-2xl border border-white/10 bg-[#101010] p-4">
            <p className="font-mono text-xs text-signal">step {missionRuns.length - index}</p>
            <p className="mt-2 text-sm font-semibold text-white">{readableAgentLabel(run.appAgentId)}</p>
            <p className="mt-2 line-clamp-3 text-xs leading-5 text-white/45">{run.task}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function MemoryInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-[#101010] px-3 py-2 text-sm text-white outline-none focus:border-signal/60" />
    </label>
  );
}

function MemoryText({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-20 w-full rounded-xl border border-white/10 bg-[#101010] px-3 py-2 text-sm text-white outline-none focus:border-signal/60" />
    </label>
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
  if (message.includes("gas")) return "The app estimated gas explicitly. If your wallet still refuses, reload the page and try once more.";
  if (message.includes("chain") || message.includes("network")) return "The app will switch to Somnia automatically. If your wallet blocks it, use the wallet network selector once.";
  if (message.includes("timeout") || message.includes("callback")) return "Keep the Workbench open or refresh later. Pending requests are recovered from local storage and chain reads.";
  if (message.includes("url")) return "Fix the URL or remove it to use LLM mode.";
  return "Review the message above, then retry when corrected.";
}

function ResultModal({ run, onClose }: { run: AgentRunRecord; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/72 p-4 backdrop-blur">
      <section className="max-h-[88vh] w-full max-w-3xl overflow-auto rounded-[1.5rem] border border-signal/25 bg-[#131313] p-5 shadow-[0_0_80px_rgba(0,255,194,0.14)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-signal">Agent result</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Request #{run.requestId} completed</h2>
          </div>
          <button onClick={onClose} className="rounded-full border border-white/10 p-2 text-white/60 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
        <ResultStudio run={run} />
        <AgentProof run={run} />
        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-white/45">
          <CheckCircle2 className="h-4 w-4 text-signal" />
          <span>Visible in Anchored results with the signed transaction proof.</span>
        </div>
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
      // Ignore non-router events in the same transaction.
    }
  }
  return "";
}

async function readRun(requestId: string, txHash?: Hash): Promise<AgentRunRecord> {
  const run = await publicClient.readContract({
    address: osContracts.SomniacAgentRouterV2 as Address,
    abi: somniacAgentRouterV2Abi,
    functionName: "getRun",
    args: [BigInt(requestId)]
  }) as readonly unknown[];
  return {
    requestId,
    user: String(run[2]),
    appAgentId: String(run[4]),
    task: String(run[5]),
    constraints: "",
    url: String(run[6]),
    somniaAgentId: String(run[7]),
    mode: modeLabels[Number(run[8])] ?? "LLM",
    status: statusLabels[Number(run[9])] ?? "Pending",
    result: String(run[10]),
    source: "Somnia",
    createdAt: "",
    completedAt: "",
    txHash
  };
}

async function executeAgent({
  requestId,
  hash,
  account,
  selected,
  task,
  constraints,
  urls,
  modeLabel,
  missionId,
  outputFormat,
  memory
}: {
  requestId: string;
  hash: Hash;
  account: Address;
  selected: CuratedAgent;
  task: string;
  constraints: string;
  urls: string[];
  modeLabel: AgentRunRecord["mode"];
  missionId: string;
  outputFormat: OutputFormat;
  memory: AgentMemory;
}): Promise<AgentRunRecord> {
  const response = await fetch("/api/agents/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agentId: selected.id,
      task,
      constraints,
      urls,
      requestId,
      txHash: hash,
      missionId,
      outputFormat,
      memory
    })
  });
  const payload = await response.json() as {
    result?: string;
    source?: AgentRunRecord["source"];
    provider?: string;
    providerError?: string;
    error?: string;
    outputFormat?: OutputFormat;
    nextActions?: AgentNextAction[];
    handoffs?: AgentRunRecord["handoffs"];
    memoryUpdates?: string[];
  };
  if (!response.ok || !payload.result) {
    return {
      requestId,
      user: account,
      appAgentId: selected.id,
      task,
      constraints,
      url: urls[0] ?? "",
      somniaAgentId: "",
      mode: modeLabel,
      status: "Failed",
      result: payload.error ?? "Agent execution failed.",
      source: payload.source ?? "LLM API",
      missionId,
      outputFormat,
      nextActions: buildNextActions(selected.id, task, outputFormat),
      handoffs: buildAgentHandoffs(selected.id, task),
      memorySnapshot: memorySnapshot(memory),
      createdAt: "",
      completedAt: new Date().toISOString(),
      txHash: hash
    };
  }
  return {
    requestId,
    user: account,
    appAgentId: selected.id,
    task,
    constraints,
    url: urls[0] ?? "",
    somniaAgentId: "",
    mode: modeLabel,
    status: "Success",
    result: payload.result,
    source: payload.source ?? "LLM API",
    missionId,
    outputFormat: payload.outputFormat ?? outputFormat,
    nextActions: payload.nextActions ?? buildNextActions(selected.id, task, outputFormat),
    handoffs: payload.handoffs ?? buildAgentHandoffs(selected.id, task),
    memorySnapshot: [
      payload.provider ? `Provider: ${payload.provider}` : "",
      payload.providerError ? `Provider fallback: ${payload.providerError}` : "",
      payload.memoryUpdates?.join("\n") || memorySnapshot(memory)
    ].filter(Boolean).join("\n"),
    createdAt: "",
    completedAt: new Date().toISOString(),
    txHash: hash
  };
}

function memorySnapshot(memory: AgentMemory) {
  return [memory.projectName, memory.audience, memory.context, memory.preferences].filter(Boolean).join(" | ");
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

function bufferedGas(gas: bigint) {
  return gas + gas / 5n + 25_000n;
}
