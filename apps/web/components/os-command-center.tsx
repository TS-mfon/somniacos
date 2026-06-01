"use client";

import { useState } from "react";
import { createPublicClient, createWalletClient, decodeEventLog, encodeFunctionData, formatEther, http, keccak256, parseEther, toHex, type Address, type Hash } from "viem";
import { Loader2, TerminalSquare } from "lucide-react";
import { osContracts, osKernelConfigured, osKernelEnabled, somnia, somniacAgentRouterV2Abi } from "../lib/contracts";
import { useSomniaWallet } from "./wallet-button";
import { summarizeError } from "../lib/onchain-state";

const publicClient = createPublicClient({ chain: somnia, transport: http(somnia.rpcUrls.default.http[0]) });
const allCapabilities = ["content.write", "marketing.strategy", "research.web", "research.api", "audit.code", "treasury.plan", "governance.draft", "security.monitor"].map((item) => keccak256(toHex(item)));

export function OSCommandCenter() {
  const { wallet, connect, switchToSomnia, walletClient, refresh } = useSomniaWallet();
  const [goal, setGoal] = useState("Launch a campaign explaining why Somnia Agents enable autonomous onchain businesses.");
  const [task, setTask] = useState("Create the first campaign plan and write a launch-ready X post for SomniacOS.");
  const [constraints, setConstraints] = useState("Return a practical plan, one X post, risks, and the next autonomous step.");
  const [maxSpend, setMaxSpend] = useState("5");
  const [status, setStatus] = useState("Ready to run an OS workflow.");
  const [error, setError] = useState("");
  const [workflowTx, setWorkflowTx] = useState<Hash | null>(null);
  const [processId, setProcessId] = useState("");
  const [requestId, setRequestId] = useState("");
  const [quoted, setQuoted] = useState<bigint | null>(null);
  const [running, setRunning] = useState(false);

  async function runWorkflow() {
    try {
      setRunning(true);
      setError("");
      setStatus("Checking wallet and Somnia network.");
      if (!osKernelEnabled || !osKernelConfigured) throw new Error("OS kernel contracts are not configured yet.");
      if (!goal.trim()) throw new Error("Enter an OS process goal.");
      if (!task.trim()) throw new Error("Enter the first agent task.");

      const account = await ensureWalletReady();
      const totalDue = await publicClient.readContract({
        address: osContracts.SomniacAgentRouterV2 as Address,
        abi: somniacAgentRouterV2Abi,
        functionName: "getTotalDue",
        args: [0]
      });
      setQuoted(totalDue);

      const data = encodeFunctionData({
        abi: somniacAgentRouterV2Abi,
        functionName: "launchWorkflowAgentRun",
        args: [
          parseEther(maxSpend),
          6n,
          1n,
          true,
          allCapabilities,
          "somniacos://domains/open",
          goal.trim(),
          "somniacos://process/autonomous-workflow",
          keccak256(toHex("marketing.strategy")),
          "marketing-strategist",
          task.trim(),
          constraints.trim(),
          [],
          0
        ]
      });
      const transaction = {
        account,
        to: osContracts.SomniacAgentRouterV2 as Address,
        value: totalDue,
        data
      } as const;

      setStatus(`One transaction will pay ${Number(formatEther(totalDue)).toFixed(4)} STT: Somnia agent fee + 0.1 STT protocol fee.`);
      const gasEstimate = await publicClient.estimateGas(transaction);
      const client = createWalletClient({ chain: somnia, transport: walletClient() });
      const hash = await client.sendTransaction({ ...transaction, gas: bufferedGas(gasEstimate) });
      setWorkflowTx(hash);

      setStatus("Workflow submitted. Waiting for receipt and process ID.");
      const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
      if (receipt.status !== "success") throw new Error("Somnia transaction reverted.");
      const ids = extractWorkflowIds(receipt.logs);
      if (!ids.processId || !ids.requestId) throw new Error("Workflow confirmed, but process/request events were not found.");
      setProcessId(ids.processId);
      setRequestId(ids.requestId);
      setStatus(`OS process #${ids.processId} is live and agent request #${ids.requestId} is running. Open the process console or refresh later for the callback.`);
      await refresh(account);
    } catch (caught) {
      setStatus("Needs attention");
      setError(summarizeError(caught));
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
      setStatus("Switching to Somnia Shannon, then continuing automatically.");
      await switchToSomnia();
    }
    await refresh(account);
    return account;
  }

  return (
    <section className="panel rounded-[1.5rem] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-signal">Kernel command</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Run an OS workflow</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">One signature creates the policy, creates the process, pays the protocol fee, starts the first Somnia Agent task, and stores the callback onchain.</p>
        </div>
        <TerminalSquare className="h-8 w-8 text-signal" />
      </div>
      <div className="mt-5 grid gap-4">
        <label>
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">Process goal</span>
          <textarea value={goal} onChange={(event) => setGoal(event.target.value)} className="mt-2 min-h-24 w-full rounded-xl border border-white/10 bg-[#101010] px-4 py-3 text-white outline-none focus:border-signal/60" />
        </label>
        <label>
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">First agent task</span>
          <textarea value={task} onChange={(event) => setTask(event.target.value)} className="mt-2 min-h-20 w-full rounded-xl border border-white/10 bg-[#101010] px-4 py-3 text-white outline-none focus:border-signal/60" />
        </label>
        <label>
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">Constraints</span>
          <textarea value={constraints} onChange={(event) => setConstraints(event.target.value)} className="mt-2 min-h-16 w-full rounded-xl border border-white/10 bg-[#101010] px-4 py-3 text-white outline-none focus:border-signal/60" />
        </label>
        <label>
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">Max spend policy</span>
          <input value={maxSpend} onChange={(event) => setMaxSpend(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101010] px-4 py-3 text-white outline-none focus:border-signal/60" />
        </label>
        <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/58 sm:grid-cols-2">
          <span>Protocol fee: <b className="text-signal">0.1 STT</b></span>
          <span>Total one-signature charge: <b className="text-signal">{quoted ? `${Number(formatEther(quoted)).toFixed(4)} STT` : "quoted on click"}</b></span>
        </div>
        <button onClick={runWorkflow} disabled={running || !osKernelEnabled || !osKernelConfigured} className="inline-flex items-center justify-center gap-2 rounded-xl bg-signal px-5 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60">
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Run OS workflow
        </button>
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white/62">{status}</p>
        {error ? <p className="rounded-2xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{error}</p> : null}
        <div className="flex flex-wrap gap-3 font-mono text-xs text-white/40">
          {workflowTx ? <a className="text-cobalt" href={`${somnia.blockExplorers.default.url}/tx/${workflowTx}`} target="_blank" rel="noreferrer">workflow tx</a> : null}
          {processId ? <a className="text-signal" href={`/app/os/processes/${processId}`}>open process #{processId}</a> : null}
          {requestId ? <span>request #{requestId}</span> : null}
        </div>
      </div>
    </section>
  );
}

function extractWorkflowIds(logs: readonly { address: Address; data: `0x${string}`; topics: readonly [`0x${string}`, ...`0x${string}`[]] | readonly [] }[]) {
  const ids = { processId: "", requestId: "" };
  for (const log of logs) {
    if (log.address.toLowerCase() !== osContracts.SomniacAgentRouterV2.toLowerCase()) continue;
    try {
      const decoded = decodeEventLog({ abi: somniacAgentRouterV2Abi, data: log.data, topics: [...log.topics] });
      if (decoded.eventName === "OSAgentRunRequested") {
        ids.processId = String((decoded.args as { processId?: bigint }).processId ?? "");
        ids.requestId = String((decoded.args as { requestId?: bigint }).requestId ?? "");
      }
    } catch {
      // Ignore unrelated logs in the same receipt.
    }
  }
  return ids;
}

function bufferedGas(gas: bigint) {
  return gas + gas / 5n + 25_000n;
}
