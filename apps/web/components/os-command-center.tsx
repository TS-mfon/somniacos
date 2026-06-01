"use client";

import { useState } from "react";
import { createWalletClient, decodeEventLog, encodeFunctionData, http, createPublicClient, parseEther, type Address, type Hash } from "viem";
import { keccak256, toHex } from "viem";
import { Loader2, TerminalSquare } from "lucide-react";
import { autonomyPolicyRegistryAbi, osContracts, osKernelConfigured, osKernelEnabled, processManagerAbi, protocolFeeVaultAbi, somnia } from "../lib/contracts";
import { useSomniaWallet } from "./wallet-button";
import { summarizeError } from "../lib/onchain-state";

const publicClient = createPublicClient({ chain: somnia, transport: http(somnia.rpcUrls.default.http[0]) });
const protocolFee = parseEther("0.1");

export function OSCommandCenter() {
  const { wallet, connect, switchToSomnia, walletClient, refresh } = useSomniaWallet();
  const [goal, setGoal] = useState("Launch a campaign explaining why Somnia Agents enable autonomous onchain businesses.");
  const [maxSpend, setMaxSpend] = useState("2.5");
  const [status, setStatus] = useState("Ready to launch an OS process.");
  const [error, setError] = useState("");
  const [policyTx, setPolicyTx] = useState<Hash | null>(null);
  const [processTx, setProcessTx] = useState<Hash | null>(null);
  const [processId, setProcessId] = useState("");
  const [running, setRunning] = useState(false);

  async function launchProcess() {
    try {
      setRunning(true);
      setError("");
      setStatus("Checking wallet and Somnia network.");
      if (!osKernelEnabled || !osKernelConfigured) throw new Error("OS kernel contracts are not configured yet. Deploy the branch contracts and set NEXT_PUBLIC_* addresses.");
      if (!goal.trim()) throw new Error("Enter an OS process goal.");
      if (!wallet.address) {
        await connect();
        setStatus("Wallet connected. Click Launch OS process again to sign.");
        return;
      }
      if (wallet.chainId !== somnia.id) {
        await switchToSomnia();
        await refresh(wallet.address);
        setStatus("Network switched. Click Launch OS process again to sign.");
        return;
      }

      const client = createWalletClient({ chain: somnia, transport: walletClient() });
      const capabilities = ["content.write", "marketing.strategy", "research.web", "audit.code", "treasury.plan", "governance.draft"].map((item) => keccak256(toHex(item)));

      setStatus("Creating autonomy policy and paying 0.1 STT protocol fee.");
      const policyHash = await client.sendTransaction({
        account: wallet.address,
        to: osContracts.AutonomyPolicyRegistry as Address,
        value: protocolFee,
        data: encodeFunctionData({
          abi: autonomyPolicyRegistryAbi,
          functionName: "createPolicy",
          args: [parseEther(maxSpend), 6n, 1n, true, capabilities, "somniacos://domains/somnia-docs"]
        })
      });
      setPolicyTx(policyHash);
      const policyReceipt = await publicClient.waitForTransactionReceipt({ hash: policyHash, timeout: 120_000 });
      const policyId = extractEventId(policyReceipt.logs, osContracts.AutonomyPolicyRegistry, "PolicyCreated", "policyId");
      if (!policyId) throw new Error("Policy transaction confirmed, but PolicyCreated event was not found.");

      setStatus("Creating OS process and paying 0.1 STT protocol fee.");
      const processHash = await client.sendTransaction({
        account: wallet.address,
        to: osContracts.ProcessManager as Address,
        value: protocolFee,
        data: encodeFunctionData({
          abi: processManagerAbi,
          functionName: "createProcess",
          args: [goal.trim(), BigInt(policyId), "somniacos://process/autonomous-somnia-growth-company"]
        })
      });
      setProcessTx(processHash);
      const processReceipt = await publicClient.waitForTransactionReceipt({ hash: processHash, timeout: 120_000 });
      const createdProcessId = extractEventId(processReceipt.logs, osContracts.ProcessManager, "ProcessCreated", "processId");
      if (!createdProcessId) throw new Error("Process transaction confirmed, but ProcessCreated event was not found.");
      setProcessId(createdProcessId);
      setStatus(`OS process #${createdProcessId} is live. Open the process console after starting agent steps.`);
      await refresh(wallet.address);
    } catch (caught) {
      setStatus("Needs attention");
      setError(summarizeError(caught));
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="panel rounded-[1.5rem] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-signal">Kernel command</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Launch an autonomous OS process</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">Creates a policy and process onchain. Each write pays a transparent 0.1 STT SomniacOS protocol fee.</p>
        </div>
        <TerminalSquare className="h-8 w-8 text-signal" />
      </div>
      <div className="mt-5 grid gap-4">
        <label>
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">Goal</span>
          <textarea value={goal} onChange={(event) => setGoal(event.target.value)} className="mt-2 min-h-24 w-full rounded-xl border border-white/10 bg-[#101010] px-4 py-3 text-white outline-none focus:border-signal/60" />
        </label>
        <label>
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">Max spend policy</span>
          <input value={maxSpend} onChange={(event) => setMaxSpend(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101010] px-4 py-3 text-white outline-none focus:border-signal/60" />
        </label>
        <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/58 sm:grid-cols-3">
          <span>Policy fee: <b className="text-signal">0.1 STT</b></span>
          <span>Process fee: <b className="text-signal">0.1 STT</b></span>
          <span>Total launch fees: <b className="text-signal">0.2 STT</b></span>
        </div>
        <button onClick={launchProcess} disabled={running || !osKernelEnabled || !osKernelConfigured} className="inline-flex items-center justify-center gap-2 rounded-xl bg-signal px-5 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60">
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Launch OS process
        </button>
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white/62">{status}</p>
        {error ? <p className="rounded-2xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{error}</p> : null}
        <div className="flex flex-wrap gap-3 font-mono text-xs text-white/40">
          {policyTx ? <a className="text-cobalt" href={`${somnia.blockExplorers.default.url}/tx/${policyTx}`} target="_blank" rel="noreferrer">policy tx</a> : null}
          {processTx ? <a className="text-cobalt" href={`${somnia.blockExplorers.default.url}/tx/${processTx}`} target="_blank" rel="noreferrer">process tx</a> : null}
          {processId ? <a className="text-signal" href={`/app/os/processes/${processId}`}>open process #{processId}</a> : null}
        </div>
      </div>
    </section>
  );
}

function extractEventId(logs: readonly { address: Address; data: `0x${string}`; topics: readonly [`0x${string}`, ...`0x${string}`[]] | readonly [] }[], address: string, eventName: string, key: string) {
  for (const log of logs) {
    if (log.address.toLowerCase() !== address.toLowerCase()) continue;
    try {
      const abi = eventName === "PolicyCreated" ? autonomyPolicyRegistryAbi : processManagerAbi;
      const decoded = decodeEventLog({ abi, data: log.data, topics: [...log.topics] });
      if (decoded.eventName === eventName) return String((decoded.args as Record<string, bigint | string>)[key] ?? "");
    } catch {
      // Ignore unrelated logs in the same receipt.
    }
  }
  return "";
}
