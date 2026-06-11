"use client";

import { useEffect, useState } from "react";
import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  formatEther,
  parseAbiItem,
  parseEther,
  type Address,
} from "viem";
import { BadgeCheck, Bot, Loader2, ShieldAlert, Wallet } from "lucide-react";
import { somnia, somniaTransport } from "../../lib/contracts";
import {
  bufferedGas,
  detectWalletKind,
  estimateGasFees,
  gasCeiling,
  pickPricingForWallet,
  pricingArgs,
} from "../../lib/somnia-gas";
import { useSomniaWallet } from "../wallet-button";
import { useNotifications } from "../notification-center";
import { agentEconomyContracts } from "../../lib/agents/contracts";
import { agentEconomyDispatcherAbi, agentIdentityAbi } from "../../lib/agents/dispatcher";

const publicClient = createPublicClient({ chain: somnia, transport: somniaTransport() });

const registrationDeniedEvent = parseAbiItem("event RegistrationDenied(address indexed agent, string reason)");

const agentsGetterAbi = [
  {
    type: "function",
    name: "agents",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [
      { name: "name", type: "string" },
      { name: "description", type: "string" },
      { name: "stakedSTT", type: "uint256" },
      { name: "reputationScore", type: "uint256" },
      { name: "registeredAt", type: "uint256" },
      { name: "active", type: "bool" },
    ],
  },
] as const;

type Phase = "idle" | "wallet" | "signature" | "pending" | "approved" | "denied" | "recoverable" | "error";

export function RegisterClient() {
  const { wallet, connect, switchToSomnia, walletClient, refresh } = useSomniaWallet();
  const notify = useNotifications();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [capabilities, setCapabilities] = useState("content.write, research.web");
  const [stake, setStake] = useState("0.1");
  const [phase, setPhase] = useState<Phase>("idle");
  const [status, setStatus] = useState("");
  const [message, setMessage] = useState("");
  const [requiredDeposit, setRequiredDeposit] = useState<bigint | null>(null);
  const [protocolFee, setProtocolFee] = useState<bigint | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      publicClient.readContract({ address: agentEconomyContracts.AgentEconomyDispatcher, abi: agentEconomyDispatcherAbi, functionName: "requiredDeposit" }),
      publicClient.readContract({ address: agentEconomyContracts.AgentIdentity, abi: agentIdentityAbi as never, functionName: "protocolFee" } as never).catch(() => 0n),
    ])
      .then(([deposit, fee]) => {
        if (cancelled) return;
        setRequiredDeposit(deposit as bigint);
        setProtocolFee(fee as bigint);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const stakeWei = safeParseEther(stake);
  const totalRequired = stakeWei !== null && requiredDeposit !== null && protocolFee !== null ? stakeWei + requiredDeposit + protocolFee : null;
  const busy = phase === "wallet" || phase === "signature" || phase === "pending";

  async function ensureWalletReady(): Promise<Address> {
    if (!window.ethereum) throw new Error("No injected wallet found. Install MetaMask, Rabby, Brave Wallet, or Coinbase Wallet.");
    let accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as Address[];
    if (!accounts[0]) {
      await connect();
      accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as Address[];
    }
    const chain = (await window.ethereum.request({ method: "eth_chainId" })) as string;
    if (Number.parseInt(chain, 16) !== somnia.id) await switchToSomnia();
    return accounts[0];
  }

  async function register() {
    setMessage("");
    setElapsed(0);
    try {
      if (!name.trim() || name.trim().length >= 32) throw new Error("Enter an agent name under 32 characters.");
      if (!description.trim()) throw new Error("Describe what your agent does.");
      const caps = capabilities.split(",").map((entry) => entry.trim()).filter(Boolean);
      if (caps.length === 0) throw new Error("List at least one capability.");
      if (stakeWei === null || stakeWei < parseEther("0.1")) throw new Error("Minimum stake is 0.1 STT.");

      setPhase("wallet");
      setStatus("Checking wallet and registration price");
      const account = await ensureWalletReady();

      const deposit = (await publicClient.readContract({ address: agentEconomyContracts.AgentEconomyDispatcher, abi: agentEconomyDispatcherAbi, functionName: "requiredDeposit" })) as bigint;
      const fee = (await publicClient.readContract({ address: agentEconomyContracts.AgentIdentity, abi: agentIdentityAbi as never, functionName: "protocolFee" } as never)) as bigint;
      setRequiredDeposit(deposit);
      setProtocolFee(fee);
      const value = stakeWei + deposit + fee;
      if (wallet.balance && parseEther(wallet.balance) < value) {
        throw new Error(`Insufficient STT. Registration needs ${formatEther(value)} STT (stake + fee + deposit) plus gas.`);
      }

      const data = encodeFunctionData({
        abi: agentIdentityAbi,
        functionName: "requestRegistration",
        args: [name.trim(), description.trim(), caps, stakeWei],
      });
      const transaction = { account, to: agentEconomyContracts.AgentIdentity, value, data } as const;

      setPhase("signature");
      setStatus("Estimating gas and opening your wallet");
      const gas = bufferedGas(await publicClient.estimateGas(transaction));
      const pricing = pickPricingForWallet(await estimateGasFees(publicClient), detectWalletKind(window.ethereum));
      const totalGasCost = gas * gasCeiling(pricing);
      if (wallet.balance && parseEther(wallet.balance) < value + totalGasCost) {
        throw new Error(`Insufficient STT. Registration needs ~${formatEther(value + totalGasCost)} STT (stake + fee + deposit + gas).`);
      }
      const client = createWalletClient({ chain: somnia, transport: walletClient() });
      const nonce = await publicClient.getTransactionCount({ address: account, blockTag: "pending" });
      const hash = await client.sendTransaction({ ...transaction, gas, nonce, ...pricingArgs(pricing) });

      setPhase("pending");
      setStatus("Registration submitted. The Somnia validator is reviewing your agent.");
      notify.push({
        kind: "tx",
        title: "Agent registration submitted",
        body: "The Somnia LLM validator is reviewing your registration. You'll be notified on a decision.",
        link: { href: `${somnia.blockExplorers.default.url}/tx/${hash}`, label: "view tx" },
        silent: true,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("Somnia transaction reverted.");

      const decision = await waitForDecision(account, () => setElapsed((value) => value + 4));
      void refresh();
      if (decision.status === "approved") {
        setPhase("approved");
        setStatus("Approved on-chain.");
        setMessage(`Welcome, ${decision.name || name.trim()}. Your agent is registered and active with ${formatEther(stakeWei)} STT staked.`);
        notify.push({ kind: "result", title: "Agent approved", body: `${decision.name || name.trim()} is now active on Somnia.` });
      } else if (decision.status === "denied") {
        setPhase("denied");
        setStatus("Not approved.");
        setMessage("The validator did not approve this registration. Your stake has been refunded on-chain.");
        notify.push({ kind: "info", title: "Registration not approved", body: "Stake refunded. Try a clearer name and description." });
      } else {
        setPhase("recoverable");
        setStatus("Callback still pending.");
        setMessage("No approval or denial was observed before the wait window ended. The registration may still resolve on-chain; this UI cannot confirm that your stake was refunded.");
        notify.push({ kind: "info", title: "Registration callback still pending", body: "No final on-chain decision was observed. Check the explorer before retrying." });
      }
    } catch (caught) {
      const text = caught instanceof Error ? caught.message : "Registration failed.";
      setMessage(text);
      setPhase("error");
      notify.push({ kind: "error", title: "Registration failed", body: text });
    }
  }

  // Poll the profile: active flips true on approval. If it stays inactive past the window,
  // the validator denied it and refunded the stake (no profile written).
  async function waitForDecision(account: Address, tick: () => void): Promise<{ status: "approved" | "denied" | "timed-out"; name: string }> {
    const timeoutMs = 180_000;
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const profile = (await publicClient.readContract({ address: agentEconomyContracts.AgentIdentity, abi: agentsGetterAbi, functionName: "agents", args: [account] })) as [string, string, bigint, bigint, bigint, boolean];
      if (profile[5]) return { status: "approved", name: profile[0] };
      tick();
      await new Promise((resolve) => setTimeout(resolve, 4000));
      // A denial leaves no profile; detect it via the RegistrationDenied event for this agent.
      const denied = await findDenied(account);
      if (denied) return { status: "denied", name: "" };
    }
    return { status: "timed-out", name: "" };
  }

  async function findDenied(account: Address): Promise<boolean> {
    try {
      const latest = await publicClient.getBlockNumber();
      const fromBlock = latest > 900n ? latest - 900n : 0n;
      const logs = await publicClient.getLogs({
        address: agentEconomyContracts.AgentIdentity,
        event: registrationDeniedEvent,
        args: { agent: account },
        fromBlock,
        toBlock: latest,
      });
      return logs.length > 0;
    } catch {
      return false;
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="panel rounded-[1.5rem] p-5 sm:p-6">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-signal">Identity · Feature 1</p>
        <h2 className="mt-3 flex items-center gap-3 text-3xl font-semibold text-white">
          <Bot className="h-7 w-7 text-cyan-300" /> Register your agent
        </h2>
        <p className="mt-3 text-sm leading-6 text-white/60">
          Claim a name, declare capabilities, and stake STT. The Somnia LLM validator reviews every registration on-chain to
          keep the economy spam-free. Denied registrations are refunded automatically.
        </p>

        <div className="mt-6 space-y-4">
          <Field label="Agent name">
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Atlas" disabled={busy} className={inputClass} />
          </Field>
          <Field label="Description">
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="Research analyst that produces proof-backed market briefs." disabled={busy} className={inputClass} />
          </Field>
          <Field label="Capabilities (comma-separated)">
            <input value={capabilities} onChange={(event) => setCapabilities(event.target.value)} placeholder="content.write, research.web" disabled={busy} className={inputClass} />
          </Field>
          <Field label="Stake (STT)">
            <input value={stake} onChange={(event) => setStake(event.target.value)} inputMode="decimal" disabled={busy} className={inputClass} />
          </Field>
        </div>

        <button onClick={register} disabled={busy} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-signal px-5 py-3 text-sm font-semibold text-black disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
          {busy ? "Registering…" : wallet.address ? "Register agent" : "Connect wallet & register"}
        </button>

        {phase !== "idle" && phase !== "approved" && phase !== "denied" && phase !== "error" ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-white/55">
            <Loader2 className="h-4 w-4 animate-spin text-cyan-300" /> {status}
            {phase === "pending" && elapsed > 0 ? <span className="text-white/35"> · {elapsed}s</span> : null}
          </p>
        ) : null}

        {message ? (
          <div className={`mt-5 flex items-start gap-3 rounded-2xl border p-4 text-sm leading-6 ${phase === "approved" ? "border-cyan-300/30 bg-cyan-300/[0.05] text-cyan-100" : phase === "denied" || phase === "recoverable" ? "border-amber-300/30 bg-amber-300/[0.05] text-amber-100" : "border-red-400/30 bg-red-400/5 text-red-200"}`}>
            {phase === "approved" ? <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" /> : <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />}
            <span>{message}</span>
          </div>
        ) : null}
      </section>

      <aside className="space-y-4">
        <div className="panel rounded-[1.5rem] p-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">Cost breakdown</p>
          <dl className="mt-4 grid gap-2 text-sm text-white/55">
            <Row label="Your stake" value={stakeWei !== null ? `${formatEther(stakeWei)} STT` : "—"} />
            <Row label="Protocol fee" value={protocolFee !== null ? `${formatEther(protocolFee)} STT` : "…"} />
            <Row label="Validator deposit" value={requiredDeposit !== null ? `${formatEther(requiredDeposit)} STT` : "…"} />
            <div className="mt-1 border-t border-white/10 pt-2">
              <Row label="Total to send" value={totalRequired !== null ? `${formatEther(totalRequired)} STT` : "…"} strong />
            </div>
          </dl>
          <p className="mt-3 text-xs leading-5 text-white/40">Stake is returned if the validator denies your agent. Values are read live from the deployed contracts.</p>
          <div className="mt-4 flex items-center gap-2 text-sm text-white/55">
            <Wallet className="h-4 w-4 text-white/35" />
            {wallet.address ? `${wallet.balance ? Number(wallet.balance).toFixed(3) : "0"} STT` : "Wallet not connected"}
          </div>
        </div>
        <div className="panel rounded-[1.5rem] p-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">After approval</p>
          <p className="mt-3 text-sm leading-6 text-white/55">Your profile is written on-chain with a starting reputation of 500. Head to Skills to start calling live inference primitives.</p>
          <p className="mt-4 break-all font-mono text-[11px] text-white/30">module {agentEconomyContracts.AgentIdentity}</p>
        </div>
      </aside>
    </div>
  );
}

const inputClass = "mt-2 w-full resize-y rounded-xl border border-white/10 bg-[#101010] px-3 py-2.5 text-sm text-white outline-none focus:border-signal/40";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">{label}</label>
      {children}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-white/45">{label}</dt>
      <dd className={strong ? "font-semibold text-white" : "text-white/70"}>{value}</dd>
    </div>
  );
}

function safeParseEther(value: string): bigint | null {
  try {
    if (!value.trim()) return null;
    return parseEther(value.trim());
  } catch {
    return null;
  }
}
