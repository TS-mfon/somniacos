"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPublicClient, createWalletClient, decodeEventLog, encodeFunctionData, formatEther, formatUnits, getAbiItem, http, isAddress, keccak256, parseEther, parseUnits, toEventSelector, toHex, type Address, type Hash } from "viem";
import { AlertTriangle, Brain, CheckCircle2, Clock3, Copy, ExternalLink, GitBranch, Loader2, RadioTower, Sparkles, X } from "lucide-react";
import { useOnchainActivity } from "./live-economy";
import { useSomniaWallet } from "./wallet-button";
import { contracts, extensionContracts, osContracts, osKernelConfigured, osKernelEnabled, protocolFeeVaultAbi, somnia, somniacAgentRouterAbi, somniacAgentRouterV2Abi, somniacTokenFactoryAbi } from "../lib/contracts";
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
  regularWorkbenchAgents,
  scoreAgentRun,
  type AgentMemory,
  type AgentMission,
  type AgentNextAction,
  type AgentRunRecord,
  type CuratedAgent,
  type OutputFormat
} from "../lib/agent-engine";
import { clearRunHistory, loadRunHistory, removeRunHistory, upsertMissionReceipt, upsertRunHistory } from "../lib/history-store";
import { bufferedGas, detectWalletKind, estimateGasFees, gasCeiling, PendingTxError, pickPricingForWallet, pricingArgs, type WalletKind } from "../lib/somnia-gas";
import { useNotifications } from "./notification-center";
import { summarizeError } from "../lib/onchain-state";

const publicClient = createPublicClient({ chain: somnia, transport: http(somnia.rpcUrls.default.http[0]) });

const V1_AGENT_RUN_REQUESTED_TOPIC = toEventSelector(getAbiItem({ abi: somniacAgentRouterAbi, name: "AgentRunRequested" })) as `0x${string}`;
const V2_OS_AGENT_RUN_REQUESTED_TOPIC = toEventSelector(getAbiItem({ abi: somniacAgentRouterV2Abi, name: "OSAgentRunRequested" })) as `0x${string}`;

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

type TokenLaunchForm = {
  name: string;
  symbol: string;
  decimals: string;
  initialSupply: string;
  owner: string;
  metadataURI: string;
};

type SentinelIntent = {
  kind: "agent-run" | "token-deploy";
  title: string;
  rows: Array<{ label: string; value: string }>;
  onConfirm: () => void;
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

export function AgentWorkbench({ mode: surface = "workbench" }: { mode?: "workbench" | "missions" }) {
  const missionMode = surface === "missions";
  const { data, state, reload } = useOnchainActivity(8000);
  const { wallet, connect, switchToSomnia, walletClient, refresh } = useSomniaWallet();
  const defaultAgent = missionMode ? curatedAgents.find((agent) => agent.id === agentMissions[0].agentId) ?? curatedAgents[0] : regularWorkbenchAgents[0];
  const [agentId, setAgentId] = useState(defaultAgent.id);
  const [missionId, setMissionId] = useState(missionMode ? agentMissions[0].id : "regular-task");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>(missionMode ? agentMissions[0].outputFormat : inferOutputFormat(defaultAgent, "auto"));
  const [goal, setGoal] = useState(missionMode ? agentMissions[0].task : defaultAgent.defaultTask);
  const [constraints, setConstraints] = useState(missionMode ? agentMissions[0].constraints : defaultAgent.defaultConstraints);
  const [webUrls, setWebUrls] = useState("");
  const [memory, setMemory] = useState<AgentMemory>(defaultMemory());
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [deposit, setDeposit] = useState<bigint | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [activeRun, setActiveRun] = useState<AgentRunRecord | null>(null);
  const [resultModal, setResultModal] = useState<AgentRunRecord | null>(null);
  const shownResultIds = useRef<Set<string>>(new Set());
  const recoveringIds = useRef<Set<string>>(new Set());
  const autoScannedAddrs = useRef<Set<string>>(new Set());
  const [autoScanDone, setAutoScanDone] = useState(false);
  const notify = useNotifications();
  const [waitProgress, setWaitProgress] = useState<{ elapsedMs: number; nextCheckMs: number } | null>(null);
  const [walletKind, setWalletKind] = useState<WalletKind>("unknown");
  const [moreOpen, setMoreOpen] = useState(false);
  const [estGasCost, setEstGasCost] = useState<bigint | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  useEffect(() => {
    if (typeof window !== "undefined") setWalletKind(detectWalletKind(window.ethereum));
  }, [wallet.address]);

  useEffect(() => {
    if (!wallet.address) setAutoScanDone(false);
  }, [wallet.address]);

  useEffect(() => {
    if (!wallet.address) return;
    const key = wallet.address.toLowerCase();
    if (autoScannedAddrs.current.has(key)) {
      setAutoScanDone(true);
      return;
    }
    let cancelled = false;
    let scanCompleted = false;

    async function autoScanRecovery() {
      try {
        const latest = await publicClient.getBlockNumber();
        const userTopic = `0x${"0".repeat(24)}${wallet.address!.toLowerCase().slice(2)}` as `0x${string}`;

        // Somnia RPC caps eth_getLogs at 1000 blocks. Walk backward in 1000-block chunks.
        // Bound the total scan to ~14 days (1.2M blocks) or 200 matching logs.
        type RawLog = { topics?: readonly (`0x${string}` | null)[]; transactionHash?: `0x${string}` | null };
        const CHUNK = 1000n;
        const MAX_BLOCKS = 1_200_000n;
        const MAX_LOGS = 200;
        const minFrom = latest > MAX_BLOCKS ? latest - MAX_BLOCKS : 0n;

        async function chunkedLogs(filter: { address: Address; topics: (`0x${string}` | null)[] }): Promise<RawLog[]> {
          const out: RawLog[] = [];
          let cursor = latest;
          while (cursor > minFrom && out.length < MAX_LOGS) {
            if (cancelled) return out;
            const start = cursor - CHUNK + 1n > minFrom ? cursor - CHUNK + 1n : minFrom;
            const fromHex = `0x${start.toString(16)}` as `0x${string}`;
            const toHex = `0x${cursor.toString(16)}` as `0x${string}`;
            try {
              const chunkLogs = await publicClient.request({
                method: "eth_getLogs",
                params: [{ ...filter, fromBlock: fromHex, toBlock: toHex }]
              }) as RawLog[];
              out.push(...chunkLogs);
            } catch {
              // Skip the chunk on RPC error; continue walking backward.
            }
            if (start === 0n) break;
            cursor = start - 1n;
          }
          return out;
        }

        const [v1Logs, v2Logs] = await Promise.all([
          chunkedLogs({
            address: contracts.SomniacAgentRouter as Address,
            topics: [V1_AGENT_RUN_REQUESTED_TOPIC, null, userTopic]
          }),
          chunkedLogs({
            address: osContracts.SomniacAgentRouterV2 as Address,
            topics: [V2_OS_AGENT_RUN_REQUESTED_TOPIC]
          })
        ]);

        const v1RequestIds: string[] = [];
        for (const log of v1Logs) {
          const topic1 = log.topics?.[1];
          if (topic1) v1RequestIds.push(BigInt(topic1).toString());
        }

        // V2 user is non-indexed; filter by tx.from matching the wallet.
        // Batch getTransaction in groups of 5 to avoid RPC rate-limits.
        const v2RequestIds: string[] = [];
        if (v2Logs.length) {
          const txHashes = Array.from(new Set(v2Logs.map((log) => log.transactionHash).filter(Boolean))) as `0x${string}`[];
          const ownTxHashes = new Set<string>();
          for (let offset = 0; offset < txHashes.length; offset += 5) {
            if (cancelled) return;
            const batch = txHashes.slice(offset, offset + 5);
            const results = await Promise.allSettled(batch.map((hash) => publicClient.getTransaction({ hash })));
            for (let i = 0; i < batch.length; i++) {
              const result = results[i];
              if (result.status === "fulfilled" && result.value.from?.toLowerCase() === wallet.address!.toLowerCase()) {
                ownTxHashes.add(batch[i]);
              }
            }
          }
          for (const log of v2Logs) {
            const topic3 = log.topics?.[3];
            if (log.transactionHash && ownTxHashes.has(log.transactionHash) && topic3) {
              v2RequestIds.push(BigInt(topic3).toString());
            }
          }
        }

        const allRequestIds = Array.from(new Set([...v1RequestIds, ...v2RequestIds])).slice(0, 20);
        const existing = new Set(loadRunHistory().map((item) => item.requestId));

        for (const requestId of allRequestIds) {
          if (cancelled) return;
          if (existing.has(requestId)) continue;
          try {
            const run = await readRun(requestId);
            if (run.user.toLowerCase() !== wallet.address!.toLowerCase()) continue;
            // Lite enrichment preserves on-chain attribution (do NOT use the currently-selected agent).
            const enriched: AgentRunRecord = {
              ...run,
              source: "Somnia",
              missionId: "regular-task",
              nextActions: buildNextActions(run.appAgentId, run.task, run.outputFormat ?? "auto"),
              handoffs: buildAgentHandoffs(run.appAgentId, run.task),
              confidence: scoreAgentRun(run)
            };
            saveRun(enriched);
            // Only pre-block the modal for terminal Success — otherwise the recovery loop's later
            // Pending→Success transition would be silently swallowed.
            if (run.status === "Success") shownResultIds.current.add(enriched.requestId);
            const notifyKind: "info" | "error" =
              run.status === "Success" ? "info" :
              run.status === "Pending" ? "info" :
              "error";
            const title =
              run.status === "Success" ? `Recovered an earlier ${readableAgentLabel(run.appAgentId)} result` :
              run.status === "Pending" ? `Found a pending ${readableAgentLabel(run.appAgentId)} run — still anchoring` :
              `Recovered a ${run.status} ${readableAgentLabel(run.appAgentId)} run`;
            notify.push({
              kind: notifyKind,
              title,
              body: run.result?.slice(0, 200),
              link: run.txHash ? { href: `${somnia.blockExplorers.default.url}/tx/${run.txHash}`, label: "view tx" } : undefined,
              resultRequestId: run.status === "Success" ? enriched.requestId : undefined
            });
          } catch {
            // Skip individual failures silently.
          }
        }
        scanCompleted = true;
      } catch {
        // Auto-scan is best-effort; never bubble errors up.
      } finally {
        if (scanCompleted && !cancelled) autoScannedAddrs.current.add(key);
        if (!cancelled) setAutoScanDone(true);
      }
    }

    void autoScanRecovery();
    return () => { cancelled = true; };
  }, [wallet.address]);

  useEffect(() => {
    let cancelled = false;
    async function quoteGas() {
      try {
        const pricing = pickPricingForWallet(await estimateGasFees(publicClient), detectWalletKind(typeof window !== "undefined" ? window.ethereum : undefined));
        // Use a generous fixed gas-units estimate for the breakdown display (real estimate happens at send time).
        const gasUnits = 1_200_000n;
        if (!cancelled) setEstGasCost(gasUnits * gasCeiling(pricing));
      } catch {
        if (!cancelled) setEstGasCost(null);
      }
    }
    void quoteGas();
    return () => { cancelled = true; };
  }, [wallet.address, walletKind]);

  function presentResultModal(run: AgentRunRecord) {
    if (shownResultIds.current.has(run.requestId)) return;
    shownResultIds.current.add(run.requestId);
    setResultModal(run);
  }

  useEffect(() => {
    return notify.onViewResult((requestId) => {
      const run = loadRunHistory().find((item) => item.requestId === requestId);
      if (run && run.status !== "Pending") {
        // Force-open for any terminal state (Success / Failed / TimedOut / Abandoned)
        // so the user can see what happened, even if previously dismissed.
        setResultModal(run);
      }
    });
  }, [notify]);

  function resetPending() {
    if (typeof window !== "undefined" && !window.confirm("Clear stale pending requests? Completed history is preserved.")) return;
    const stale = loadRunHistory().filter((item) => item.status === "Pending");
    let next = loadRunHistory();
    for (const item of stale) next = removeRunHistory(item.requestId);
    setLocalRuns(next);
    setActiveRun(null);
    setTx({ phase: "idle", status: "Ready" });
    shownResultIds.current.clear();
  }

  function resetEverything() {
    if (typeof window !== "undefined" && !window.confirm("Wipe ALL local agent history? This cannot be undone. On-chain receipts on Somnia are not affected.")) return;
    clearRunHistory();
    shownResultIds.current.clear();
    setLocalRuns([]);
    setActiveRun(null);
    setResultModal(null);
    setTx({ phase: "idle", status: "Ready" });
  }

  function exportHistory() {
    if (typeof window === "undefined") return;
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      runs: loadRunHistory()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `somniacos-history-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function importHistory(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const incoming: AgentRunRecord[] = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.runs) ? parsed.runs : [];
        if (!incoming.length) throw new Error("No runs found in file.");
        let merged = loadRunHistory();
        for (const run of incoming) {
          if (run && typeof run.requestId === "string") {
            merged = upsertRunHistory(run);
          }
        }
        setLocalRuns(merged);
        window.alert(`Imported ${incoming.length} run${incoming.length === 1 ? "" : "s"}.`);
      } catch (error) {
        window.alert(`Import failed: ${error instanceof Error ? error.message : "invalid file"}`);
      }
    };
    reader.readAsText(file);
  }
  const [tx, setTx] = useState<WorkbenchTx>({ phase: "idle", status: "Ready" });
  const [localRuns, setLocalRuns] = useState<AgentRunRecord[]>([]);
  const [sentinel, setSentinel] = useState<SentinelIntent | null>(null);
  const [tokenForm, setTokenForm] = useState<TokenLaunchForm>({
    name: "Somnia Agent Token",
    symbol: "SAT",
    decimals: "18",
    initialSupply: "1000000",
    owner: "",
    metadataURI: "somniacos://token/agent-token"
  });

  const selectableAgents = useMemo(() => missionMode ? curatedAgents : regularWorkbenchAgents, [missionMode]);
  const selected = useMemo(() => selectableAgents.find((agent) => agent.id === agentId) ?? selectableAgents[0], [agentId, selectableAgents]);
  const selectedMission = useMemo(() => agentMissions.find((mission) => mission.id === missionId) ?? agentMissions[0], [missionId]);
  const selectedMissionSteps = selectedMission.steps ?? [{ label: selectedMission.label, agentId: selectedMission.agentId, task: selectedMission.task, constraints: selectedMission.constraints, outputFormat: selectedMission.outputFormat, requiresAgentRun: true }];
  const matchedOnchain = useMemo(() => matchOnchainAgent(selected, state.agents), [selected, state.agents]);
  const allUrls = useMemo(() => webUrls.split(/\s+/).map((url) => url.trim()).filter(Boolean), [webUrls]);
  const urls = useMemo(() => allUrls.slice(0, 3), [allUrls]);
  const mode = urls.length ? 1 : 0;
  const routerConfigured = osKernelEnabled && osKernelConfigured && Boolean(osContracts.SomniacAgentRouterV2);
  const tokenFactoryConfigured = extensionContracts.SomniacTokenFactory !== "0x0000000000000000000000000000000000000000";
  const isTokenMission = missionMode && (missionId === "launch-token" || selected.id === "token-launcher");
  const isRunning = activePhases.has(tx.phase);

  const completedFromEvents = useMemo<AgentRunRecord[]>(() => {
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
  const visibleResults = useMemo(() => anchoredResults.filter((item) => {
    if (missionMode ? !(item.missionId && item.missionId !== "regular-task") : !(!item.missionId || item.missionId === "regular-task")) return false;
    if (wallet.address && item.user && item.user.toLowerCase() !== wallet.address.toLowerCase()) return false;
    return true;
  }), [anchoredResults, missionMode, wallet.address]);
  const latestResult = visibleResults[0];
  const pendingRuns = useMemo(() => localRuns.filter((item) => {
    if (item.status !== "Pending") return false;
    if (missionMode ? !(item.missionId && item.missionId !== "regular-task") : !(!item.missionId || item.missionId === "regular-task")) return false;
    if (wallet.address && item.user && item.user.toLowerCase() !== wallet.address.toLowerCase()) return false;
    return true;
  }), [localRuns, missionMode, wallet.address]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const missionParam = params.get("mission");
    const param = params.get("agent");
    if (missionMode && missionParam) {
      applyMission(missionParam);
    }
    if (param) {
      const agent = selectableAgents.find((item) => item.id === param);
      if (agent) applyAgent(agent);
    }
    setLocalRuns(loadRunHistory());
    const storedMemory = window.localStorage.getItem("somniacos.agentMemory");
    if (storedMemory) {
      try {
        setMemory({ ...defaultMemory(), ...JSON.parse(storedMemory) as AgentMemory });
      } catch {
        setMemory(defaultMemory());
      }
    }
    setTokenForm((current) => ({ ...current, owner: window.ethereum ? current.owner : "" }));
  }, [missionMode, selectableAgents]);

  useEffect(() => {
    if (!routerConfigured) {
      setDeposit(null);
      return;
    }
    let cancelled = false;
    async function loadDeposit() {
      try {
        setQuoteError("");
        try {
          const quoted = await publicClient.readContract({
            address: osContracts.SomniacAgentRouterV2 as Address,
            abi: somniacAgentRouterV2Abi,
            functionName: "getTotalDue",
            args: [mode]
          });
          if (!cancelled) setDeposit(quoted as bigint);
          return;
        } catch {
          // V2 getTotalDue is unavailable on V1 routers; fall back to deposit + protocol fee.
        }
        const [depositOnly, feeAmount] = await Promise.all([
          publicClient.readContract({
            address: contracts.SomniacAgentRouter as Address,
            abi: somniacAgentRouterAbi,
            functionName: "getRequiredDeposit",
            args: [mode]
          }) as Promise<bigint>,
          publicClient.readContract({
            address: osContracts.ProtocolFeeVault as Address,
            abi: protocolFeeVaultAbi,
            functionName: "feeAmount"
          }) as Promise<bigint>
        ]);
        if (!cancelled) setDeposit(depositOnly + feeAmount);
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
    const ABANDONED_MS = 60 * 60 * 1000; // 1 hour
    async function recoverPendingRuns() {
      const orphans: string[] = [];
      const recovered = await Promise.all(pendingRuns.map(async (run) => {
        // Skip if executeAgentWorkflow is currently driving this exact tx.
        if (run.txHash && tx.hash === run.txHash && (tx.phase === "receipt" || tx.phase === "callback" || tx.phase === "signature")) {
          return run;
        }
        // Skip if another recovery iteration is already processing this id.
        if (recoveringIds.current.has(run.requestId)) return run;
        recoveringIds.current.add(run.requestId);
        // Abandonment heuristic — validators sometimes silently drop a request and
        // getRun returns Pending forever. After 1 h, flip locally to "Abandoned" so the
        // recovery loop stops polling and the UI can explain to the user.
        const createdMs = run.createdAt ? Date.parse(run.createdAt) : 0;
        if (createdMs > 0 && Date.now() - createdMs > ABANDONED_MS) {
          try {
            const onchain = await readRun(run.requestId, run.txHash as Hash | undefined).catch(() => null);
            if (!onchain || onchain.status === "Pending") {
              const abandoned: AgentRunRecord = {
                ...run,
                status: "Abandoned",
                completedAt: new Date().toISOString()
              };
              return abandoned;
            }
          } finally {
            recoveringIds.current.delete(run.requestId);
          }
        }
        try {
          let requestId = run.requestId;
          if (requestId.startsWith("pending-") && run.txHash) {
            const receipt = await publicClient.getTransactionReceipt({ hash: run.txHash as Hash }).catch(() => null);
            if (!receipt || receipt.status !== "success") return run;
            const extracted = extractRequestId(receipt.logs);
            if (!extracted) return run;
            orphans.push(run.requestId);
            requestId = extracted;
          }
          const onchain = await readRun(requestId, run.txHash as Hash | undefined);
          const merged: AgentRunRecord = {
            ...run,
            ...onchain,
            requestId,
            constraints: run.constraints,
            missionId: run.missionId,
            outputFormat: run.outputFormat,
            nextActions: run.nextActions,
            handoffs: run.handoffs,
            memorySnapshot: run.memorySnapshot,
            source: "Somnia",
            completedAt: onchain.status === "Pending" ? "" : new Date().toISOString()
          };
          return { ...merged, confidence: scoreAgentRun(merged) };
        } catch {
          return run;
        } finally {
          recoveringIds.current.delete(run.requestId);
        }
      }));
      if (cancelled) return;
      let nextRuns: AgentRunRecord[] | null = null;
      for (const orphanId of orphans) {
        nextRuns = removeRunHistory(orphanId);
      }
      if (nextRuns) setLocalRuns(nextRuns);
      for (const run of recovered) {
        if (run.status !== "Pending") {
          const wasShown = shownResultIds.current.has(run.requestId);
          saveRun(run);
          if (!wasShown) {
            if (run.status === "Success") {
              presentResultModal(run);
              notify.push({
                kind: "result",
                title: `${readableAgentLabel(run.appAgentId)} result is in`,
                body: run.result?.slice(0, 200),
                link: run.txHash ? { href: `${somnia.blockExplorers.default.url}/tx/${run.txHash}`, label: "view tx" } : undefined,
                resultRequestId: run.requestId
              });
            } else if (run.status === "Abandoned") {
              notify.push({
                kind: "info",
                title: `Validator timeout: ${readableAgentLabel(run.appAgentId)}`,
                body: "Somnia validators did not produce a result within the expected window. The deposit cannot be reclaimed on-chain. Run the agent again when you're ready.",
                link: run.txHash ? { href: `${somnia.blockExplorers.default.url}/tx/${run.txHash}`, label: "view tx" } : undefined,
                resultRequestId: run.requestId
              });
              shownResultIds.current.add(run.requestId);
            } else {
              notify.push({
                kind: "error",
                title: `${readableAgentLabel(run.appAgentId)} did not return a result`,
                body: run.result || `Status: ${run.status}`,
                link: run.txHash ? { href: `${somnia.blockExplorers.default.url}/tx/${run.txHash}`, label: "view tx" } : undefined,
                resultRequestId: run.requestId
              });
              shownResultIds.current.add(run.requestId);
            }
          }
        }
      }
      await reload();
    }
    const timeout = window.setTimeout(() => void recoverPendingRuns(), 2500);
    const interval = window.setInterval(() => void recoverPendingRuns(), 12_000);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      window.clearInterval(interval);
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
      if (!deposit) throw new Error("Unable to quote the transaction. Try again in a moment.");
      if (wallet.balance && parseEther(wallet.balance) < deposit) throw new Error(`Insufficient STT. This request needs ${formatEther(deposit)} STT plus gas.`);
      setSentinel({
        kind: "agent-run",
        title: `Run ${selected.role}`,
        rows: [
          { label: "Network", value: somnia.name },
          { label: "Signer", value: account },
          { label: "Contract", value: osContracts.SomniacAgentRouterV2 },
          { label: "Agent", value: `${selected.name} / ${selected.role}` },
          { label: "Capability", value: capabilityByAgent[selected.id] ?? "content.write" },
          { label: "Mode", value: mode === 1 ? "Website parser" : "LLM inference" },
          { label: "Total due", value: `${formatEther(deposit)} STT` },
          { label: "Protocol fee", value: "0.1 STT included" }
        ],
        onConfirm: () => {
          setSentinel(null);
          void executeAgentWorkflow();
        }
      });
      setTx({ phase: "signature", status: "Review the Security Sentinel, then open your wallet." });
    } catch (error) {
      setTx({ phase: "failed", status: "Needs attention", error: summarizeError(error), action: recommendedAction(error) });
    }
  }

  async function importByTxHash() {
    const raw = typeof window !== "undefined" ? window.prompt("Paste the transaction hash from your wallet (0x...):") : "";
    const hash = raw?.trim();
    if (!hash || !/^0x[0-9a-fA-F]{64}$/.test(hash)) {
      if (hash) window.alert("That does not look like a valid 0x... transaction hash.");
      return;
    }
    try {
      setTx({ phase: "receipt", status: "Looking up your transaction on Somnia.", hash: hash as Hash });
      const receipt = await publicClient.getTransactionReceipt({ hash: hash as Hash }).catch(() => null);
      if (!receipt) {
        setTx({ phase: "callback", status: "Transaction not mined yet. Try again in a moment.", hash: hash as Hash });
        return;
      }
      if (receipt.status !== "success") throw new Error("That transaction reverted on Somnia.");
      const requestId = extractRequestId(receipt.logs);
      if (!requestId) throw new Error("That transaction is not a Somnia Agent request (no OSAgentRunRequested event).");
      const run = await readRun(requestId, hash as Hash);
      const account = (wallet.address ?? run.user) as Address;
      const enriched = enrichSomniaRun(run, {
        account,
        selected,
        task: run.task || goal.trim(),
        constraints: run.constraints || constraints.trim(),
        urls,
        missionId,
        outputFormat,
        memory
      });
      saveRun(enriched);
      setActiveRun(enriched);
      if (enriched.status === "Success") {
        setTx({ phase: "success", status: "Recovered. The Somnia Agent result is below and saved to History.", hash: hash as Hash });
        presentResultModal(enriched);
        notify.push({
          kind: "result",
          title: `Recovered: ${selected.name} result`,
          body: enriched.result?.slice(0, 200),
          link: { href: `${somnia.blockExplorers.default.url}/tx/${hash}`, label: "view tx" },
          resultRequestId: enriched.requestId
        });
        setActiveRun(null);
      } else if (enriched.status === "Pending") {
        setTx({ phase: "callback", status: "Recovered. Still anchoring on Somnia — the Re-check button will resolve it.", hash: hash as Hash });
      } else {
        setTx({ phase: "failed", status: enriched.status, hash: hash as Hash, error: enriched.result || "Somnia Agent did not return a usable result.", action: "The signed request is now in History." });
      }
    } catch (error) {
      setTx({ phase: "failed", status: "Needs attention", error: summarizeError(error), action: recommendedAction(error) });
    }
  }

  async function retryCallback() {
    const target = activeRun ?? pendingRuns[0];
    if (!target || !target.txHash) return;
    try {
      setTx({ phase: "callback", status: "Re-reading Somnia callback for the existing request.", hash: target.txHash as Hash });
      let requestId = target.requestId;
      if (requestId.startsWith("pending-")) {
        const receipt = await publicClient.getTransactionReceipt({ hash: target.txHash as Hash }).catch(() => null);
        if (!receipt || receipt.status !== "success") {
          setTx({ phase: "callback", status: "Transaction has not been mined yet. If gas is low, use Speed Up in your wallet.", hash: target.txHash as Hash });
          return;
        }
        const extracted = extractRequestId(receipt.logs);
        if (!extracted) throw new Error("Workflow submitted, but the OSAgentRunRequested event was not found in the receipt.");
        requestId = extracted;
      }
      const fresh = await readRun(requestId, target.txHash as Hash);
      const merged: AgentRunRecord = {
        ...target,
        ...fresh,
        requestId,
        constraints: target.constraints,
        missionId: target.missionId,
        outputFormat: target.outputFormat,
        memorySnapshot: target.memorySnapshot,
        source: "Somnia",
        completedAt: fresh.status === "Pending" ? "" : new Date().toISOString()
      };
      saveRun(merged);
      setActiveRun(merged);
      if (merged.status === "Success") {
        setTx({ phase: "success", status: "Callback recovered. Result is visible below and saved to History.", hash: target.txHash as Hash });
        presentResultModal(merged);
        notify.push({
          kind: "result",
          title: `${selected.name} result is in`,
          body: merged.result?.slice(0, 200),
          link: target.txHash ? { href: `${somnia.blockExplorers.default.url}/tx/${target.txHash}`, label: "view tx" } : undefined,
          resultRequestId: merged.requestId
        });
        setActiveRun(null);
      } else if (merged.status === "Pending") {
        setTx({ phase: "callback", status: "Somnia callback has not arrived yet. Try again in a moment — no re-payment needed.", hash: target.txHash as Hash });
      } else {
        setTx({ phase: "failed", status: merged.status, hash: target.txHash as Hash, error: merged.result || "Somnia Agent did not return a usable result.", action: "The signed request is still in History. Retry only if the callback failed or timed out." });
      }
    } catch (error) {
      setTx({ phase: "failed", status: "Needs attention", error: summarizeError(error), action: recommendedAction(error) });
    }
  }

  async function executeAgentWorkflow() {
    try {
      setActiveRun(null);
      setWaitProgress(null);
      setTx({ phase: "wallet", status: "Checking wallet and task details" });
      if (!routerConfigured) throw new Error("SomniacOS fee router is not deployed yet.");
      validateWorkbenchInput(goal, constraints, allUrls);

      const trimmedConstraints = constraints.trim();
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
          trimmedConstraints,
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
      const gas = bufferedGas(gasEstimate);
      const rawPricing = await estimateGasFees(publicClient);
      const pricing = pickPricingForWallet(rawPricing, detectWalletKind(window.ethereum));
      const totalGasCost = gas * gasCeiling(pricing);
      if (wallet.balance && parseEther(wallet.balance) < deposit + totalGasCost) {
        throw new Error(`Insufficient STT. This request needs ~${formatEther(deposit + totalGasCost)} STT (fee + gas).`);
      }
      const client = createWalletClient({ chain: somnia, transport: walletClient() });
      // Pin an explicit pending nonce so back-to-back runs don't reuse a stale wallet-side nonce.
      const nonce = await publicClient.getTransactionCount({ address: account, blockTag: "pending" });
      const hash = await client.sendTransaction({ ...transaction, gas, nonce, ...pricingArgs(pricing) });

      const runContext = {
        account,
        selected,
        task: goal.trim(),
        constraints: trimmedConstraints,
        urls,
        missionId,
        outputFormat,
        memory
      };
      const pendingShell: AgentRunRecord = {
        requestId: `pending-${hash.slice(2, 10)}`,
        user: account,
        appAgentId: selected.id,
        task: goal.trim(),
        constraints: trimmedConstraints,
        url: urls[0] ?? "",
        somniaAgentId: "",
        mode: mode === 1 ? "Website" : "LLM",
        status: "Pending",
        result: "",
        source: "Somnia",
        createdAt: new Date().toISOString(),
        completedAt: "",
        txHash: hash,
        missionId,
        outputFormat,
        memorySnapshot: memorySnapshot(memory)
      };
      saveRun(pendingShell);

      setTx({ phase: "receipt", status: "Workflow submitted. Waiting for Somnia receipt.", hash });
      notify.push({
        kind: "tx",
        title: `${selected.name} request submitted`,
        body: "Anchoring on Somnia validators. You'll be notified the moment it lands.",
        link: { href: `${somnia.blockExplorers.default.url}/tx/${hash}`, label: "view tx" },
        silent: true
      });
      const receipt = await waitForReceiptWithRetry(publicClient, hash);
      if (receipt.status !== "success") throw new Error("Somnia transaction reverted.");
      if (receipt.effectiveGasPrice && receipt.effectiveGasPrice < 2_000_000_000n) {
        notify.push({
          kind: "info",
          title: "Heads up — gas was lower than recommended",
          body: `Your wallet submitted at ${(Number(receipt.effectiveGasPrice) / 1e9).toFixed(2)} gwei. The tx still mined, but if validators take longer than usual, that's why.`
        });
      }

      const requestId = extractRequestId(receipt.logs);
      if (!requestId) throw new Error("Workflow submitted, but the OSAgentRunRequested event was not found in the receipt.");

      setLocalRuns(removeRunHistory(pendingShell.requestId));

      setTx({ phase: "callback", status: `OS workflow request #${requestId} is running. Reading Somnia validator state.`, hash });
      const initial = enrichSomniaRun(await readRun(requestId, hash), runContext);
      setActiveRun(initial);
      saveRun(initial);

      // Eager terminal-state check — if validators already answered (typical on Somnia),
      // surface the result now instead of waiting for the first poll cycle.
      if (initial.status === "Success" || initial.status === "Failed" || initial.status === "TimedOut") {
        setWaitProgress(null);
        await reload();
        await refresh(account);
        if (initial.status === "Success") {
          setTx({ phase: "success", status: "Confirmed. Somnia Agent result is visible below and saved to History.", hash });
          setResultModal(initial);
          shownResultIds.current.add(initial.requestId);
          notify.push({
            kind: "result",
            title: `${selected.name} returned a result`,
            body: initial.result?.slice(0, 200),
            link: hash ? { href: `${somnia.blockExplorers.default.url}/tx/${hash}`, label: "view tx" } : undefined,
            resultRequestId: initial.requestId
          });
        } else {
          setTx({ phase: "failed", status: initial.status, hash, error: initial.result || "Somnia Agent did not return a usable result.", action: "The signed request remains visible in History." });
          notify.push({
            kind: "error",
            title: `${selected.name} did not return a usable result`,
            body: initial.result || `Status: ${initial.status}`,
            link: hash ? { href: `${somnia.blockExplorers.default.url}/tx/${hash}`, label: "view tx" } : undefined
          });
        }
        setActiveRun(null);
        return;
      }

      setTx({ phase: "callback", status: `Paid request #${requestId} is anchoring on Somnia (${mode === 1 ? "Website Parser" : "LLM"} Agent). Polling every 1 s.`, hash });
      setWaitProgress({ elapsedMs: 0, nextCheckMs: 1000 });
      const outcome = await waitForRun(requestId, hash, (progress) => {
        setWaitProgress({ elapsedMs: progress.elapsedMs, nextCheckMs: progress.nextCheckMs });
        if (progress.interim) {
          const enrichedInterim = enrichSomniaRun(progress.interim, runContext);
          setActiveRun(enrichedInterim);
        }
      });
      setWaitProgress(null);
      if ("timedOut" in outcome) {
        const interim = outcome.lastInterim ? enrichSomniaRun(outcome.lastInterim, runContext) : initial;
        setActiveRun(interim);
        saveRun(interim);
        setTx({
          phase: "callback",
          status: `Still anchoring on Somnia after 8 min. Use Re-check Somnia callback below — no re-payment needed.`,
          hash
        });
      } else {
        const callbackRun = enrichSomniaRun(outcome, runContext);
        setActiveRun(callbackRun);
        saveRun(callbackRun);
        await reload();
        await refresh(account);
        if (callbackRun.status === "Success") {
          setTx({ phase: "success", status: "Confirmed. The real Somnia Agent callback is visible below and saved to History.", hash });
          setResultModal(callbackRun);
          shownResultIds.current.add(callbackRun.requestId);
          notify.push({
            kind: "result",
            title: `${selected.name} returned a result`,
            body: callbackRun.result?.slice(0, 200),
            link: hash ? { href: `${somnia.blockExplorers.default.url}/tx/${hash}`, label: "view tx" } : undefined,
            resultRequestId: callbackRun.requestId
          });
          setActiveRun(null);
        } else {
          setTx({ phase: "failed", status: callbackRun.status, hash, error: callbackRun.result || "Somnia Agent did not return a usable result.", action: "The signed request remains visible in History. Retry only if the callback failed or timed out." });
          notify.push({
            kind: "error",
            title: `${selected.name} did not return a usable result`,
            body: callbackRun.result || `Status: ${callbackRun.status}`,
            link: hash ? { href: `${somnia.blockExplorers.default.url}/tx/${hash}`, label: "view tx" } : undefined
          });
          setActiveRun(null);
        }
      }
    } catch (error) {
      setWaitProgress(null);
      const message = summarizeError(error);
      setTx({ phase: "failed", status: "Needs attention", error: message, action: recommendedAction(error) });
      notify.push({ kind: "error", title: "Agent run failed", body: message });
      setActiveRun(null);
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
    setLocalRuns(upsertRunHistory(item));
    if (item.missionId && item.missionId !== "regular-task" && item.status === "Success") {
      upsertMissionReceipt({
        receiptId: `mission:${item.missionId}:${item.requestId}`,
        missionId: item.missionId,
        missionLabel: agentMissions.find((mission) => mission.id === item.missionId)?.label ?? item.missionId,
        user: item.user,
        chainId: 50312,
        agentChain: selectedMissionSteps.map((step) => ({ label: step.label, agentId: step.agentId, walletAction: step.requiresWalletAction })),
        stepOutputs: [{ label: item.stepLabel ?? readableAgentLabel(item.appAgentId), agentId: item.appAgentId, result: item.result, txHash: item.txHash }],
        txHashes: item.txHash ? [item.txHash] : [],
        tokenAddress: item.artifact?.type === "token" ? item.artifact.tokenAddress : undefined,
        resultHash: item.result ? `${item.result.length}:${item.result.slice(0, 24)}` : undefined,
        feePaid: deposit ? `${formatEther(deposit)} STT` : undefined,
        createdAt: item.completedAt || new Date().toISOString()
      });
    }
  }

  async function prepareTokenDeploy() {
    try {
      setTx({ phase: "wallet", status: "Checking wallet and token details" });
      if (!tokenFactoryConfigured) throw new Error("SomniacOS token factory is not deployed yet.");
      const account = await ensureWalletReady();
      const params = normalizeTokenForm(tokenForm, account);
      setTokenForm((current) => ({ ...current, owner: params.owner }));
      setSentinel({
        kind: "token-deploy",
        title: `Deploy ${params.symbol}`,
        rows: [
          { label: "Network", value: somnia.name },
          { label: "Signer", value: account },
          { label: "Factory", value: extensionContracts.SomniacTokenFactory },
          { label: "Name", value: params.name },
          { label: "Symbol", value: params.symbol },
          { label: "Decimals", value: String(params.decimals) },
          { label: "Initial supply", value: `${params.initialSupply} ${params.symbol}` },
          { label: "Owner", value: params.owner },
          { label: "Private key", value: "Never shared. Your wallet signs the deployment." }
        ],
        onConfirm: () => {
          setSentinel(null);
          void deployToken();
        }
      });
      setTx({ phase: "signature", status: "Review the token deployment, then open your wallet." });
    } catch (error) {
      setTx({ phase: "failed", status: "Needs attention", error: summarizeError(error), action: recommendedAction(error) });
    }
  }

  async function deployToken() {
    try {
      setTx({ phase: "wallet", status: "Preparing token deployment" });
      if (!tokenFactoryConfigured) throw new Error("SomniacOS token factory is not deployed yet.");
      const account = await ensureWalletReady();
      const params = normalizeTokenForm(tokenForm, account);
      const initialSupply = parseUnits(params.initialSupply, params.decimals);
      const data = encodeFunctionData({
        abi: somniacTokenFactoryAbi,
        functionName: "createToken",
        args: [params.name, params.symbol, params.decimals, initialSupply, params.owner as Address, params.metadataURI]
      });
      const transaction = {
        account,
        to: extensionContracts.SomniacTokenFactory as Address,
        data
      } as const;
      setTx({ phase: "signature", status: "Estimating gas and opening your wallet for token deployment" });
      const gasEstimate = await publicClient.estimateGas(transaction);
      const gas = bufferedGas(gasEstimate);
      const rawPricing = await estimateGasFees(publicClient);
      const pricing = pickPricingForWallet(rawPricing, detectWalletKind(window.ethereum));
      const client = createWalletClient({ chain: somnia, transport: walletClient() });
      const nonce = await publicClient.getTransactionCount({ address: account, blockTag: "pending" });
      const hash = await client.sendTransaction({ ...transaction, gas, nonce, ...pricingArgs(pricing) });
      setTx({ phase: "receipt", status: "Token deployment submitted. Waiting for receipt.", hash });
      const receipt = await waitForReceiptWithRetry(publicClient, hash);
      if (receipt.status !== "success") throw new Error("Token deployment reverted.");
      const artifact = extractTokenCreated(receipt.logs);
      if (!artifact) throw new Error("Token deployed, but TokenCreated event was not found.");
      const runBase: AgentRunRecord = {
        requestId: `token-${artifact.tokenAddress.slice(2, 10)}`,
        user: account,
        appAgentId: "token-launcher",
        task: "Deploy a fixed-supply Somnia testnet token.",
        constraints: "Non-custodial wallet-signed token deployment through SomniacOS token factory.",
        url: "",
        somniaAgentId: "",
        mode: "LLM",
        status: "Success",
        result: [
          `${artifact.name} (${artifact.symbol}) deployed successfully on Somnia Shannon.`,
          `Token address: ${artifact.tokenAddress}`,
          `Owner: ${artifact.owner}`,
          `Initial supply: ${formatUnits(BigInt(artifact.initialSupply), artifact.decimals)} ${artifact.symbol}`,
          "The user signed this deployment with their own wallet. No private key was shared."
        ].join("\n"),
        source: "Somnia",
        missionId: "launch-token",
        outputFormat: "checklist",
        createdAt: "",
        completedAt: new Date().toISOString(),
        txHash: hash,
        artifact: {
          type: "token",
          tokenAddress: artifact.tokenAddress,
          name: artifact.name,
          symbol: artifact.symbol,
          decimals: artifact.decimals,
          initialSupply: formatUnits(BigInt(artifact.initialSupply), artifact.decimals),
          owner: artifact.owner,
          deployer: artifact.deployer,
          metadataURI: artifact.metadataURI,
          txHash: hash
        }
      };
      const run = { ...runBase, confidence: scoreAgentRun(runBase) };
      saveRun(run);
      setActiveRun(run);
      setResultModal(run);
      setTx({ phase: "success", status: "Token deployed. Details are visible here and saved to History.", hash });
      await refresh(account);
    } catch (error) {
      setTx({ phase: "failed", status: "Needs attention", error: summarizeError(error), action: recommendedAction(error) });
    }
  }

  const categories = Array.from(new Set(selectableAgents.map((agent) => agent.category)));

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
      <section className="panel rounded-[1.5rem] p-5 sm:p-6">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-signal">{missionMode ? "Missions" : "Workbench"}</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-5xl">{missionMode ? "Run structured agent missions." : "Run useful agents with one signed transaction."}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/58">{missionMode ? "Choose a mission template, preview the agent chain, then run the workflow. Launch Token reveals a dedicated deployment UI only when that mission is selected." : "Pick a specialist, describe the task, and sign once. Use Missions for token launches and multi-agent workflows."}</p>
        {data.ok === false ? (
          <div className="mt-5 rounded-2xl border border-ember/30 bg-ember/10 p-4 text-sm leading-6 text-ember">
            Onchain history is temporarily unavailable, but your local confirmed and pending agent runs are still shown below. {data.error}
          </div>
        ) : null}
        <div className="mt-6 grid gap-4">
          {missionMode ? <label className="block">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">Mission</span>
            <select value={missionId} onChange={(event) => applyMission(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101010] px-4 py-3 text-white outline-none focus:border-signal/60">
              {agentMissions.map((mission) => <option key={mission.id} value={mission.id}>{mission.label}</option>)}
            </select>
            <span className="mt-2 block text-xs leading-5 text-white/38">{selectedMission.description}</span>
          </label> : null}
          <label className="block">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">Specialist</span>
            {!missionMode ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {["All", ...categories].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`rounded-lg border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.16em] transition ${categoryFilter === cat ? "border-signal/50 bg-signal/15 text-signal" : "border-white/10 bg-white/[0.03] text-white/55 hover:border-signal/30 hover:text-white"}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            ) : null}
            <select value={agentId} onChange={(event) => applyAgent(selectableAgents.find((agent) => agent.id === event.target.value) ?? selectableAgents[0])} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101010] px-4 py-3 text-white outline-none focus:border-signal/60">
              {categories.map((category) => {
                if (categoryFilter !== "All" && categoryFilter !== category) return null;
                const agentsInCategory = selectableAgents.filter((agent) => agent.category === category);
                if (!agentsInCategory.length) return null;
                return (
                  <optgroup key={category} label={category}>
                    {agentsInCategory.map((agent) => <option key={agent.id} value={agent.id}>{agent.role} — {agent.name}</option>)}
                  </optgroup>
                );
              })}
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
          {isTokenMission ? (
            <TokenLaunchPanel
              form={tokenForm}
              configured={tokenFactoryConfigured}
              onChange={setTokenForm}
              onDeploy={prepareTokenDeploy}
              disabled={isRunning}
            />
          ) : null}
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">Fee breakdown</span>
              <span className="font-mono text-sm text-signal">
                {deposit ? `${Number(formatEther(deposit + (estGasCost ?? 0n))).toFixed(4)} STT` : <span className="inline-block h-3 w-16 animate-pulse rounded bg-white/10" />}
              </span>
            </div>
            <div className="mt-2 grid gap-1 font-mono text-[11px] leading-5 text-white/55">
              <div className="flex justify-between"><span>Deposit + protocol fee</span><span>{deposit ? `${Number(formatEther(deposit)).toFixed(4)} STT` : "…"}</span></div>
              <div className="flex justify-between"><span>Est. gas (max)</span><span>{estGasCost ? `~${Number(formatEther(estGasCost)).toFixed(5)} STT` : "—"}</span></div>
            </div>
            <p className="mt-2 text-[11px] leading-4 text-white/40">{mode === 1 ? "Website parser" : "LLM inference"} · 0.1 STT protocol fee included in deposit.</p>
            {quoteError ? <p className="mt-2 text-xs leading-5 text-ember">{quoteError}</p> : null}
          </div>
          {wallet.address && wallet.chainId && wallet.chainId !== somnia.id ? (
            <div className="rounded-2xl border border-danger/40 bg-danger/10 p-4 text-xs leading-5 text-danger">
              <span className="font-mono uppercase tracking-[0.2em]">Wrong network</span>
              <p className="mt-2 text-white/75">Your wallet is on chain {wallet.chainId}. Somnia Shannon is chain {somnia.id}.</p>
              <button onClick={() => void switchToSomnia()} className="mt-2 inline-flex items-center gap-2 rounded-xl border border-danger/50 px-3 py-1.5 font-semibold text-danger hover:bg-danger/15">Switch to Somnia Shannon</button>
            </div>
          ) : null}
          {walletKind === "rabby" || walletKind === "unknown" ? (
            <div className="rounded-2xl border border-danger/45 bg-danger/10 p-4 text-xs leading-5 text-danger">
              <span className="font-mono uppercase tracking-[0.2em]">{walletKind === "rabby" ? "Rabby detected" : "Unknown wallet"}</span>
              <p className="mt-2 text-white/80">
                On Somnia Shannon, {walletKind === "rabby" ? "Rabby" : "this wallet"} sometimes overrides our suggested gas with a sub‑gwei "Normal" preset and the tx stalls.
                We&apos;re submitting a <strong className="text-danger">legacy gas price</strong> so the wallet can&apos;t silently downgrade it. <strong className="text-danger">Do NOT lower gas in Advanced.</strong> If you do, you still pay the 0.1 STT fee and have to Speed Up.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-ember/40 bg-ember/10 p-4 text-xs leading-5 text-ember">
              <span className="font-mono uppercase tracking-[0.2em]">Heads up</span>
              <p className="mt-2 text-white/75">Your wallet will open. <strong className="text-ember">Keep the suggested gas as‑is — do NOT lower it in Advanced.</strong> Lowering gas stalls the Somnia request. You would still pay the 0.1 STT protocol fee and have to use your wallet&apos;s Speed Up button to recover the request.</p>
            </div>
          )}
          <button onClick={runAgent} disabled={isRunning} className="inline-flex items-center justify-center gap-2 rounded-xl bg-signal px-5 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60">
            {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RadioTower className="h-4 w-4" />}
            {runButtonCopy(tx.phase, missionMode)}
          </button>
        </div>
      </section>

      <aside className="space-y-4">
        {missionMode ? <MissionChainPreview mission={selectedMission} /> : null}
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
              <MemoryInput label="Industry" value={memory.industry ?? ""} onChange={(value) => updateMemory({ ...memory, industry: value })} />
              <MemoryInput label="Tone" value={memory.tone ?? ""} onChange={(value) => updateMemory({ ...memory, tone: value })} />
              <MemoryInput label="Risk tolerance" value={memory.riskTolerance ?? ""} onChange={(value) => updateMemory({ ...memory, riskTolerance: value })} />
              <MemoryInput label="Wallet level" value={memory.walletExperience ?? ""} onChange={(value) => updateMemory({ ...memory, walletExperience: value })} />
              <MemoryText label="Context" value={memory.context} onChange={(value) => updateMemory({ ...memory, context: value })} />
              <MemoryText label="Preferences" value={memory.preferences} onChange={(value) => updateMemory({ ...memory, preferences: value })} />
              <MemoryText label="Common links" value={memory.commonLinks ?? ""} onChange={(value) => updateMemory({ ...memory, commonLinks: value })} />
              <MemoryText label="Do not do" value={memory.doNotDo ?? ""} onChange={(value) => updateMemory({ ...memory, doNotDo: value })} />
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
          {waitProgress ? <AnchorCountdown elapsedMs={waitProgress.elapsedMs} nextCheckMs={waitProgress.nextCheckMs} totalMs={8 * 60_000} /> : null}
          {tx.hash ? <a href={`${somnia.blockExplorers.default.url}/tx/${tx.hash}`} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-2 break-all font-mono text-xs text-cobalt"><ExternalLink className="h-3 w-3" />{tx.hash}</a> : null}
          {tx.error ? <ErrorCallout message={tx.error} action={tx.action} /> : null}
          {activeRun ? (
            <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 font-mono text-xs text-white/50">
              <div>request #{activeRun.requestId} — {activeRun.status}</div>
              {activeRun.routerVersion ? (
                <div className="mt-1 text-[11px] text-white/35">Router: {activeRun.routerVersion.toUpperCase()} {routerAddressShort(activeRun.routerVersion)}</div>
              ) : null}
            </div>
          ) : null}
          {(pendingRuns.length || (activeRun && activeRun.status === "Pending")) ? (
            <button onClick={retryCallback} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-signal/40 bg-signal/10 px-4 py-2 text-xs font-semibold text-signal hover:bg-signal/20">
              <RadioTower className="h-3 w-3" /> Re-check Somnia callback (no re-payment)
            </button>
          ) : null}
          {pendingRuns.length ? <p className="mt-3 rounded-2xl border border-ember/25 bg-ember/10 p-3 text-xs leading-5 text-ember">{pendingRuns.length} request{pendingRuns.length === 1 ? "" : "s"} still running. Refresh later; pending requests are recovered from local storage and onchain reads.</p> : null}
          <div className="mt-4 flex flex-wrap gap-2 border-t border-white/5 pt-3">
            <button onClick={importByTxHash} className="rounded-xl border border-signal/40 bg-signal/10 px-3 py-1.5 text-xs font-semibold text-signal hover:bg-signal/20" title="Paste a tx hash and recover the agent result from Somnia">Recover by tx hash</button>
            <button onClick={() => setMoreOpen((value) => !value)} className="rounded-xl border border-white/10 px-3 py-1.5 text-xs text-white/55 hover:border-signal/40 hover:text-signal">
              {moreOpen ? "Less" : "More"}
            </button>
          </div>
          {moreOpen ? (
            <div className="mt-2 flex flex-wrap gap-2">
              <button onClick={exportHistory} className="rounded-xl border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:border-signal/40 hover:text-signal" title="Download local agent history as JSON">Export history</button>
              <label className="cursor-pointer rounded-xl border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:border-signal/40 hover:text-signal">
                Import history
                <input type="file" accept="application/json" onChange={importHistory} className="hidden" />
              </label>
              {pendingRuns.length ? (
                <button onClick={resetPending} className="rounded-xl border border-ember/30 px-3 py-1.5 text-xs text-ember hover:bg-ember/10" title="Drop stale pending requests but keep completed history">Clear pending</button>
              ) : null}
              <button onClick={resetEverything} className="rounded-xl border border-white/10 px-3 py-1.5 text-xs text-white/50 hover:border-red-500/50 hover:text-red-300" title="Wipe all local agent runs">Reset all</button>
            </div>
          ) : null}
        </div>
      </aside>

      {latestResult ? <LatestResult run={latestResult} onNextAction={runNextAction} /> : null}
      {!latestResult && autoScanDone && wallet.address ? (
        <section className="panel mt-6 rounded-[1.5rem] p-6 text-sm text-white/60">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-signal">Anchored results</p>
          <h3 className="mt-3 text-2xl font-semibold text-white">No agent results yet</h3>
          <p className="mt-2 text-white/55">Pick a specialist above, click Run agent, and your result will appear here within a couple of seconds.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={importByTxHash} className="rounded-xl border border-signal/40 bg-signal/10 px-3 py-1.5 text-xs font-semibold text-signal hover:bg-signal/20">Recover by tx hash</button>
          </div>
        </section>
      ) : null}
      {missionMode ? <MissionTimeline runs={localRuns} activeMissionId={missionId} /> : null}
      {resultModal ? <ResultModal run={resultModal} onClose={() => setResultModal(null)} /> : null}
      {sentinel ? <SecuritySentinel intent={sentinel} onClose={() => setSentinel(null)} /> : null}
    </div>
  );
}

function TokenLaunchPanel({ form, configured, disabled, onChange, onDeploy }: { form: TokenLaunchForm; configured: boolean; disabled: boolean; onChange: (next: TokenLaunchForm) => void; onDeploy: () => void }) {
  return (
    <div className="rounded-2xl border border-signal/20 bg-signal/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">Token launch</p>
          <p className="mt-2 text-sm leading-6 text-white/58">The agent prepares the launch. Your wallet signs the factory deployment. Private keys are never shared.</p>
        </div>
        <span className={`rounded-full border px-3 py-1 font-mono text-[11px] ${configured ? "border-signal/30 text-signal" : "border-ember/30 text-ember"}`}>{configured ? "Factory ready" : "Factory not deployed"}</span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <MemoryInput label="Token name" value={form.name} onChange={(value) => onChange({ ...form, name: value })} />
        <MemoryInput label="Symbol" value={form.symbol} onChange={(value) => onChange({ ...form, symbol: value })} />
        <MemoryInput label="Decimals" value={form.decimals} onChange={(value) => onChange({ ...form, decimals: value })} />
        <MemoryInput label="Initial supply" value={form.initialSupply} onChange={(value) => onChange({ ...form, initialSupply: value })} />
        <div className="md:col-span-2">
          <MemoryInput label="Owner address optional" value={form.owner} onChange={(value) => onChange({ ...form, owner: value })} />
        </div>
        <div className="md:col-span-2">
          <MemoryInput label="Metadata URI" value={form.metadataURI} onChange={(value) => onChange({ ...form, metadataURI: value })} />
        </div>
      </div>
      <button onClick={onDeploy} disabled={disabled || !configured} className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-signal/30 bg-black/25 px-4 py-3 text-sm font-semibold text-signal disabled:cursor-not-allowed disabled:opacity-50">
        Deploy token with wallet
      </button>
    </div>
  );
}

function MissionChainPreview({ mission }: { mission: AgentMission }) {
  const steps = mission.steps ?? [{ label: mission.label, agentId: mission.agentId, task: mission.task, constraints: mission.constraints, outputFormat: mission.outputFormat, requiresAgentRun: true }];
  return (
    <div className="panel rounded-[1.5rem] p-5">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">Agent chain preview</p>
      <h3 className="mt-3 text-2xl font-semibold text-white">{mission.label}</h3>
      <p className="mt-2 text-sm leading-6 text-white/50">{mission.description}</p>
      <div className="mt-4 grid gap-3">
        {steps.map((step, index) => (
          <div key={`${step.label}-${step.agentId}`} className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-signal">Step {index + 1}</p>
              {step.requiresWalletAction ? <span className="rounded-full border border-ember/30 px-2 py-1 font-mono text-[10px] text-ember">wallet</span> : <span className="rounded-full border border-white/10 px-2 py-1 font-mono text-[10px] text-white/40">agent</span>}
            </div>
            <p className="mt-2 font-semibold text-white">{step.label}</p>
            <p className="mt-1 text-sm text-white/55">{readableAgentLabel(step.agentId)}</p>
            <p className="mt-2 line-clamp-3 text-xs leading-5 text-white/40">{step.usesPreviousOutput ? "Uses previous output. " : ""}{step.task}</p>
          </div>
        ))}
      </div>
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

function AnchoredResults({ results, onNextAction, connected }: { results: AgentRunRecord[]; onNextAction: (action: AgentNextAction) => void; connected: boolean }) {
  return (
    <section className="xl:col-span-2 panel rounded-[1.5rem] p-5 sm:p-6">
      <p className="font-mono text-xs uppercase tracking-[0.24em] text-signal">Anchored results</p>
      <h3 className="mt-3 text-3xl font-semibold text-white">Confirmed Somnia results</h3>
      <div className="mt-4 grid gap-3">
        {results.slice(0, 8).map((item) => (
          <article key={item.requestId} className={`rounded-2xl border border-white/10 bg-[#101010] p-4 border-l-4 ${categoryStripe(item.appAgentId)}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h4 className="flex items-center gap-2 font-semibold text-white">
                {readableAgentLabel(item.appAgentId)}
              </h4>
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
        {!results.length ? (
          <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.02] p-6 text-sm text-white/55">
            {connected
              ? "No completed Somnia Agent results yet. Run an agent above and the result will appear here automatically."
              : "Connect a wallet and run an agent to see results here. Past runs from other wallets are hidden for privacy."}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function categoryStripe(agentId: string) {
  // Lookup category from the agent registry to color the left edge.
  const agent = curatedAgents.find((item) => item.id === agentId);
  switch (agent?.category) {
    case "Crypto": return "border-l-signal/70";
    case "Work": return "border-l-cobalt/60";
    case "Life": return "border-l-ember/60";
    case "Builder": return "border-l-purple-500/60";
    default: return "border-l-white/15";
  }
}

function ResultStudio({ run, compact = false }: { run: AgentRunRecord; compact?: boolean }) {
  const format = run.outputFormat ?? "auto";
  return (
    <div className={`${compact ? "mt-3" : "mt-4"} rounded-2xl border border-white/10 bg-black/25 p-4`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-signal">{format.replace("-", " ")}</span>
        <div className="flex flex-wrap items-center gap-2">
          {run.confidence ? <span className="rounded-lg border border-signal/20 bg-signal/10 px-2 py-1 font-mono text-[11px] text-signal">{run.confidence.label} {run.confidence.score}%</span> : null}
          <button onClick={() => void navigator.clipboard?.writeText(run.result)} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 font-mono text-[11px] text-white/45 hover:text-white"><Copy className="h-3 w-3" /> copy</button>
        </div>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-7 text-white/82">{run.result}</p>
      {run.confidence?.reasons.length ? <p className="mt-3 text-xs leading-5 text-white/42">{run.confidence.reasons.join(" ")}</p> : null}
    </div>
  );
}

function SecuritySentinel({ intent, onClose }: { intent: SentinelIntent; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/72 p-3 backdrop-blur sm:items-center sm:p-4">
      <section className="max-h-[92vh] w-full max-w-xl overflow-hidden rounded-[1.25rem] border border-signal/25 bg-[#131313] p-4 shadow-[0_0_80px_rgba(0,255,194,0.14)] sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-signal">Security Sentinel</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">{intent.title}</h2>
            <p className="mt-2 text-sm leading-6 text-white/52">Review this action before the wallet opens. SomniacOS never asks for private keys or seed phrases.</p>
          </div>
          <button onClick={onClose} className="rounded-full border border-white/10 p-2 text-white/60 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 grid max-h-[52vh] gap-2 overflow-y-auto pr-1">
          {intent.rows.map((row) => (
            <div key={row.label} className="rounded-xl border border-white/10 bg-black/25 p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">{row.label}</p>
              <p className="mt-1 break-all text-sm text-white/75">{row.value}</p>
            </div>
          ))}
        </div>
        <div className="sticky bottom-0 mt-4 flex flex-col gap-2 border-t border-white/10 bg-[#131313]/95 pt-4 sm:flex-row">
          <button onClick={intent.onConfirm} className="rounded-xl bg-signal px-5 py-3 text-sm font-semibold text-black">Open wallet</button>
          <button onClick={onClose} className="rounded-xl border border-white/10 px-5 py-3 text-sm text-white/62 hover:text-white">Cancel</button>
        </div>
      </section>
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

function routerAddressShort(version: "v1" | "v2") {
  const address = version === "v2" ? osContracts.SomniacAgentRouterV2 : contracts.SomniacAgentRouter;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function runButtonCopy(phase: RunPhase, missionMode: boolean) {
  if (phase === "wallet" || phase === "quote") return "Preparing…";
  if (phase === "network") return "Switching network…";
  if (phase === "signature") return "Opening wallet…";
  if (phase === "receipt") return "Waiting for receipt…";
  if (phase === "callback") return "Anchoring on Somnia…";
  if (phase === "success") return "Result ready";
  if (phase === "failed") return missionMode ? "Retry mission agent" : "Retry agent";
  return missionMode ? "Run mission agent" : "Run agent";
}

function AnchorCountdown({ elapsedMs, nextCheckMs, totalMs }: { elapsedMs: number; nextCheckMs: number; totalMs: number }) {
  const [nowOffset, setNowOffset] = useState(0);
  useEffect(() => {
    setNowOffset(0);
    const start = Date.now();
    const id = window.setInterval(() => setNowOffset(Date.now() - start), 1000);
    return () => window.clearInterval(id);
  }, [elapsedMs, nextCheckMs]);
  const liveElapsed = elapsedMs + nowOffset;
  const nextIn = Math.max(0, Math.round((nextCheckMs - nowOffset) / 1000));

  // First-minute view: friendly, no scary countdown — validators usually answer in 1–3 s.
  if (liveElapsed < 60_000) {
    return (
      <div className="mt-3 rounded-2xl border border-signal/25 bg-signal/5 p-3 font-mono text-xs text-signal">
        <div className="flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Validators normally answer in 1–3 s.</span>
        </div>
        <p className="mt-1 text-[11px] leading-4 text-white/45">{liveElapsed < 6000 ? "Reading on-chain…" : `Re-checking in ${nextIn}s.`}</p>
      </div>
    );
  }

  // After 60s: show the longer-wait countdown so the user knows it's not stuck.
  const remaining = Math.max(0, totalMs - liveElapsed);
  const pct = Math.min(100, Math.round((liveElapsed / totalMs) * 100));
  return (
    <div className="mt-3 rounded-2xl border border-ember/30 bg-ember/5 p-3 font-mono text-xs text-ember">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>Taking longer than usual — next check in {nextIn}s</span>
        <span className="text-white/55">elapsed {formatMinSec(liveElapsed)}</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div className="h-full bg-ember/70" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-[11px] leading-4 text-white/45">We keep retrying for {formatMinSec(remaining)} more. The Re-check button below pulls the result the moment it lands; you do not need to re-pay.</p>
    </div>
  );
}

function formatMinSec(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
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

function normalizeTokenForm(form: TokenLaunchForm, fallbackOwner: Address) {
  const name = form.name.trim();
  const symbol = form.symbol.trim().toUpperCase();
  const decimals = Number.parseInt(form.decimals, 10);
  const initialSupply = form.initialSupply.trim();
  const owner = (form.owner.trim() || fallbackOwner) as Address;
  const metadataURI = form.metadataURI.trim() || `somniacos://token/${symbol.toLowerCase()}`;
  if (!name) throw new Error("Token name is required.");
  if (name.length > 64) throw new Error("Token name is too long.");
  if (!symbol) throw new Error("Token symbol is required.");
  if (symbol.length > 12) throw new Error("Token symbol is too long.");
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) throw new Error("Token decimals must be between 0 and 18.");
  if (!initialSupply || Number(initialSupply) <= 0) throw new Error("Initial supply must be greater than zero.");
  if (!isAddress(owner)) throw new Error("Owner address is invalid.");
  return { name, symbol, decimals, initialSupply, owner, metadataURI };
}

function recommendedAction(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (message.includes("no injected wallet") || message.includes("ethereum")) return "Install or unlock MetaMask, Rabby, Brave Wallet, or Coinbase Wallet, then connect again.";
  if (message.includes("rejected") || message.includes("denied") || message.includes("user rejected")) return "Nothing was submitted. Click the button again and approve the wallet prompt.";
  if (message.includes("stuck in mempool")) return "Open your wallet's pending tab, tap Speed Up on the pending tx. The app will recover the request automatically — do NOT resubmit.";
  if (message.includes("underpriced") || message.includes("intrinsic gas") || message.includes("gas required")) return "Accept the suggested gas in your wallet. Lowering gas is what causes this — do not change the prefilled values.";
  if (message.includes("nonce too low")) return "A previous tx is still pending. Speed Up or Cancel it in your wallet, then retry.";
  if (message.includes("insufficient") || message.includes("underfunded") || message.includes("funds")) return "Add STT on Somnia Shannon for the agent fee plus gas, refresh your balance, then retry.";
  if (message.includes("gas") || message.includes("estimate")) return "Switch away from Somnia and back in your wallet, then retry. The app will re-check the network before opening the wallet.";
  if (message.includes("chain") || message.includes("network")) return "Approve the Somnia Shannon network switch in your wallet. If blocked, switch networks manually and retry.";
  if (message.includes("timeout") || message.includes("callback")) return "The transaction may still be valid. Check History or retry after the pending request is recovered.";
  if (message.includes("url")) return "Use a full http(s) URL or remove the URL to run with LLM inference.";
  if (message.includes("token")) return "Review token name, symbol, decimals, supply, and owner address, then retry.";
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
          <span>Source: Somnia validator. Visible in Anchored results with the signed transaction proof.</span>
        </div>
        {run.txHash ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={`${somnia.blockExplorers.default.url}/tx/${run.txHash}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:text-white">
              <ExternalLink className="h-3 w-3" /> View on explorer
            </a>
            <button
              onClick={() => {
                if (typeof navigator !== "undefined") void navigator.clipboard?.writeText(`${somnia.blockExplorers.default.url}/tx/${run.txHash}`);
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:text-white"
            >
              <Copy className="h-3 w-3" /> Copy explorer link
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function extractRequestId(logs: readonly { address: Address; data: `0x${string}`; topics: readonly [`0x${string}`, ...`0x${string}`[]] | readonly [] }[]) {
  for (const log of logs) {
    const addr = log.address.toLowerCase();
    if (addr === osContracts.SomniacAgentRouterV2.toLowerCase()) {
      try {
        const decoded = decodeEventLog({ abi: somniacAgentRouterV2Abi, data: log.data, topics: [...log.topics] });
        if (decoded.eventName === "OSAgentRunRequested") return String((decoded.args as { requestId?: bigint }).requestId ?? "");
      } catch { /* try next */ }
    }
    if (addr === contracts.SomniacAgentRouter.toLowerCase()) {
      try {
        const decoded = decodeEventLog({ abi: somniacAgentRouterAbi, data: log.data, topics: [...log.topics] });
        if (decoded.eventName === "AgentRunRequested") return String((decoded.args as { requestId?: bigint }).requestId ?? "");
      } catch { /* try next */ }
    }
  }
  return "";
}

function extractTokenCreated(logs: readonly { address: Address; data: `0x${string}`; topics: readonly [`0x${string}`, ...`0x${string}`[]] | readonly [] }[]) {
  for (const log of logs) {
    if (log.address.toLowerCase() !== extensionContracts.SomniacTokenFactory.toLowerCase()) continue;
    try {
      const decoded = decodeEventLog({ abi: somniacTokenFactoryAbi, data: log.data, topics: [...log.topics] });
      if (decoded.eventName === "TokenCreated") {
        const args = decoded.args as {
          token: Address;
          owner: Address;
          deployer: Address;
          name: string;
          symbol: string;
          decimals: number;
          initialSupply: bigint;
          metadataURI: string;
        };
        return {
          tokenAddress: args.token,
          owner: args.owner,
          deployer: args.deployer,
          name: args.name,
          symbol: args.symbol,
          decimals: Number(args.decimals),
          initialSupply: args.initialSupply.toString(),
          metadataURI: args.metadataURI
        };
      }
    } catch {
      // Ignore non-token-factory events in the same transaction.
    }
  }
  return null;
}

async function readRun(requestId: string, txHash?: Hash): Promise<AgentRunRecord> {
  // V2 router layout: [processId, stepId, user, capabilityId, appAgentId, task, url, somniaAgentId, mode, status, result]
  const v2 = await publicClient.readContract({
    address: osContracts.SomniacAgentRouterV2 as Address,
    abi: somniacAgentRouterV2Abi,
    functionName: "getRun",
    args: [BigInt(requestId)]
  }).catch(() => null) as readonly unknown[] | null;
  if (v2 && String(v2[2]).toLowerCase() !== "0x0000000000000000000000000000000000000000") {
    return {
      requestId,
      user: String(v2[2]),
      appAgentId: String(v2[4]),
      task: String(v2[5]),
      constraints: "",
      url: String(v2[6]),
      somniaAgentId: String(v2[7]),
      mode: modeLabels[Number(v2[8])] ?? "LLM",
      status: statusLabels[Number(v2[9])] ?? "Pending",
      result: String(v2[10]),
      source: "Somnia",
      createdAt: "",
      completedAt: "",
      txHash,
      routerVersion: "v2"
    };
  }
  // V1 router layout: [user, appAgentId, task, constraints, url, somniaAgentId, mode, status, result, createdAt, completedAt]
  const v1 = await publicClient.readContract({
    address: contracts.SomniacAgentRouter as Address,
    abi: somniacAgentRouterAbi,
    functionName: "getRun",
    args: [BigInt(requestId)]
  }).catch(() => null) as readonly unknown[] | null;
  if (v1) {
    return {
      requestId,
      user: String(v1[0]),
      appAgentId: String(v1[1]),
      task: String(v1[2]),
      constraints: String(v1[3]),
      url: String(v1[4]),
      somniaAgentId: String(v1[5]),
      mode: modeLabels[Number(v1[6])] ?? "LLM",
      status: statusLabels[Number(v1[7])] ?? "Pending",
      result: String(v1[8]),
      source: "Somnia",
      createdAt: "",
      completedAt: "",
      txHash,
      routerVersion: "v1"
    };
  }
  throw new Error(`Could not find request #${requestId} on either router.`);
}

function memorySnapshot(memory: AgentMemory) {
  return [memory.projectName, memory.audience, memory.context, memory.preferences].filter(Boolean).join(" | ");
}

function enrichSomniaRun(run: AgentRunRecord, context: {
  account: Address;
  selected: CuratedAgent;
  task: string;
  constraints: string;
  urls: string[];
  missionId: string;
  outputFormat: OutputFormat;
  memory: AgentMemory;
}) {
  const enriched: AgentRunRecord = {
    ...run,
    user: context.account,
    appAgentId: context.selected.id,
    task: context.task,
    constraints: context.constraints,
    url: context.urls[0] ?? run.url,
    source: "Somnia",
    missionId: context.missionId,
    outputFormat: context.outputFormat,
    nextActions: buildNextActions(context.selected.id, context.task, context.outputFormat),
    handoffs: buildAgentHandoffs(context.selected.id, context.task),
    memorySnapshot: memorySnapshot(context.memory),
    completedAt: run.status === "Pending" ? "" : new Date().toISOString()
  };
  return { ...enriched, confidence: scoreAgentRun(enriched) };
}

type WaitForRunProgress = {
  elapsedMs: number;
  nextCheckMs: number;
  interim?: AgentRunRecord;
};

async function waitForReceiptWithRetry(client: typeof publicClient, hash: Hash) {
  try {
    return await client.waitForTransactionReceipt({ hash, timeout: 120_000 });
  } catch {
    // First timeout: the tx may have mined but viem didn't observe it yet. Probe directly.
    for (let attempt = 0; attempt < 6; attempt++) {
      const tx = await client.getTransaction({ hash }).catch(() => null);
      if (tx && tx.blockNumber !== null) {
        return await client.waitForTransactionReceipt({ hash, timeout: 60_000 });
      }
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    throw new PendingTxError(hash);
  }
}

async function waitForRun(
  requestId: string,
  txHash?: Hash,
  onProgress?: (p: WaitForRunProgress) => void
): Promise<AgentRunRecord | { timedOut: true; lastInterim?: AgentRunRecord }> {
  const started = Date.now();
  const totalMs = 8 * 60_000;
  let lastInterim: AgentRunRecord | undefined;
  while (Date.now() - started < totalMs) {
    try {
      const run = await readRun(requestId, txHash);
      if (run.status !== "Pending") return run;
      lastInterim = run;
    } catch {
      // Swallow read errors; we'll retry.
    }
    const elapsedMs = Date.now() - started;
    // Validator turnaround on Somnia is usually < 1 s. Poll at 1 s for the first 10 s,
    // then back off: 3 s through 30 s, 6 s through 90 s, 12 s after.
    const baseIntervalMs = elapsedMs < 10_000 ? 1000 : elapsedMs < 30_000 ? 3000 : elapsedMs < 90_000 ? 6000 : 12_000;
    // Throttle to 30 s when the tab is hidden — saves RPC + battery while the user is elsewhere.
    const visible = typeof document !== "undefined" ? document.visibilityState === "visible" : true;
    const intervalMs = visible ? baseIntervalMs : Math.max(baseIntervalMs, 30_000);
    onProgress?.({ elapsedMs, nextCheckMs: intervalMs, interim: lastInterim });
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return { timedOut: true, lastInterim };
}

